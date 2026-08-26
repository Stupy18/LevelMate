package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.*;
import com.Levelmate.backend.games.dto.DisputeResultRequest;
import com.Levelmate.backend.games.dto.GameResultResponse;
import com.Levelmate.backend.games.dto.ReportResultRequest;
import com.Levelmate.backend.elo.service.EloService;
import com.Levelmate.backend.games.entity.*;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.games.repository.ResultVoteRepository;
import com.Levelmate.backend.notifications.service.PushNotificationService;
import com.Levelmate.backend.users.entity.RatingType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameResultService {

    private final GameResultRepository gameResultRepository;
    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final ResultVoteRepository resultVoteRepository;
    private final EloService eloService;
    private final PushNotificationService pushNotificationService;
    private final GameSessionService gameSessionService;

    @Transactional
    public GameResultResponse reportResult(UUID sessionId, UUID userId, ReportResultRequest request) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        if (session.getStatus() != SessionStatus.COMPLETED) {
            throw new SessionNotCompletedException();
        }

        if (session.getSport().getRatingType() != RatingType.ELO_COMPETITIVE) {
            throw new SportNotEloCompetitiveException();
        }

        if (gameResultRepository.findBySessionId(sessionId).isPresent()) {
            throw new ResultAlreadyReportedException();
        }

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(sessionId);
        long teamACount = participants.stream().filter(p -> p.getTeam() == TeamSide.TEAM_A).count();
        long teamBCount = participants.stream().filter(p -> p.getTeam() == TeamSide.TEAM_B).count();
        if (teamACount == 0 || teamBCount == 0) {
            throw new TeamsNotBalancedException();
        }

        User reporter = currentUser();
        WinnerTeam winnerTeam = WinnerTeam.valueOf(request.winnerTeam());
        GameResult result = GameResult.builder()
                .session(session)
                .reportedBy(reporter)
                .winnerTeam(winnerTeam)
                .scoreTeamA(request.scoreTeamA())
                .scoreTeamB(request.scoreTeamB())
                .status(ResultStatus.PENDING_CONFIRMATION)
                .build();

        GameResult saved = gameResultRepository.save(result);

        // Notify opposing team participants that a result needs confirmation
        String sportName = session.getSport().getName();
        String reporterName = reporter.getFirstName() + " " + reporter.getLastName();
        TeamSide reporterTeam = participants.stream()
                .filter(p -> p.getUser().getId().equals(userId))
                .map(GameParticipant::getTeam)
                .findFirst().orElse(null);
        List<UUID> opposingIds = participants.stream()
                .filter(p -> reporterTeam != null && p.getTeam() != null
                        && p.getTeam() != reporterTeam)
                .map(p -> p.getUser().getId())
                .collect(Collectors.toList());
        final String sessionIdStr = sessionId.toString();

        if (!opposingIds.isEmpty()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (UUID uid : opposingIds) {
                        pushNotificationService.sendToUser(uid,
                                "Result needs your confirmation",
                                reporterName + " reported the result for your " + sportName + " game",
                                Map.of("type", "RESULT_ACTION", "sessionId", sessionIdStr));
                    }
                }
            });
        }

        return GameResultResponse.from(saved);
    }

    @Transactional
    public GameResultResponse confirmResult(UUID sessionId, UUID userId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (result.getStatus() != ResultStatus.PENDING_CONFIRMATION) {
            throw new InvalidResultStatusException(
                    "Result is in " + result.getStatus() + " state. Only PENDING_CONFIRMATION results can be confirmed.");
        }

        if (result.getReportedBy().getId().equals(userId)) {
            throw new CannotConfirmOwnReportException();
        }

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        if (resultVoteRepository.existsByResultIdAndUserId(result.getId(), userId)) {
            return GameResultResponse.from(result);
        }

        User voter = currentUser();
        resultVoteRepository.save(ResultVote.builder()
                .result(result)
                .user(voter)
                .vote(VoteType.CONFIRM)
                .build());

        long totalParticipants = gameParticipantRepository.countBySessionId(sessionId);
        long totalVoters = Math.max(1, totalParticipants - 1);
        long confirmVotes = resultVoteRepository.countByResultIdAndVote(result.getId(), VoteType.CONFIRM);

        if (confirmVotes * 2 > totalVoters) {
            result.setConfirmedBy(voter);
            result.setStatus(ResultStatus.CONFIRMED);
            result.setConfirmedAt(Instant.now());
            GameResult saved = gameResultRepository.save(result);

            final WinnerTeam winnerTeam = saved.getWinnerTeam();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    eloService.onResultConfirmed(sessionId, winnerTeam);
                }
            });

            return GameResultResponse.from(saved);
        }

        return GameResultResponse.from(result);
    }

    /**
     * Two distinct transitions share this endpoint:
     *
     *   1. PENDING_CONFIRMATION + opposing player + body with scores
     *      → stores counter-score, moves to COUNTER_PROPOSED
     *
     *   2. COUNTER_PROPOSED + original reporter (any body / no body — body is ignored entirely)
     *      → escalates to DISPUTED for admin review
     *
     * Discrimination is by STATE first, then USER ROLE. Body presence is never the
     * deciding factor — it is only validated as a secondary step within case 1.
     */
    @Transactional
    public GameResultResponse disputeResult(UUID sessionId, UUID userId, DisputeResultRequest request) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        // ── Case 1: COUNTER_PROPOSED — only the original reporter may call this ──────────
        // Body is completely ignored here; role check is the sole gate.
        if (result.getStatus() == ResultStatus.COUNTER_PROPOSED) {
            if (!result.getReportedBy().getId().equals(userId)) {
                throw new InvalidResultStatusException(
                        "Result is in COUNTER_PROPOSED state. " +
                        "Only the original reporter (Player A) can reject the counter-proposal. " +
                        "If you are the counter reporter, no further action is available to you.");
            }
            result.setStatus(ResultStatus.DISPUTED);
            result.setDisputedAt(Instant.now());
            GameResult savedDisputed = gameResultRepository.save(result);

            // Notify all participants that the match is under review
            List<GameParticipant> allPs = gameParticipantRepository.findAllBySessionId(sessionId);
            List<UUID> allIds = allPs.stream().map(p -> p.getUser().getId()).collect(Collectors.toList());
            final String sportDisputed = result.getSession().getSport().getName();
            final String sessionIdDisp = sessionId.toString();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (UUID uid : allIds) {
                        pushNotificationService.sendToUser(uid,
                                "Match under review",
                                "Your " + sportDisputed + " result is being reviewed by our team",
                                Map.of("type", "RESULT_ACTION", "sessionId", sessionIdDisp));
                    }
                }
            });

            return GameResultResponse.from(savedDisputed);
        }

        // ── Case 2: PENDING_CONFIRMATION — only the Team B captain may counter-propose ─────
        if (result.getStatus() == ResultStatus.PENDING_CONFIRMATION) {
            if (result.getReportedBy().getId().equals(userId)) {
                throw new CannotConfirmOwnReportException();
            }
            if (request == null || request.winnerTeam() == null) {
                throw new InvalidResultStatusException(
                        "A counter-score (winnerTeam, and optionally scoreTeamA/B) is required " +
                        "when disputing a PENDING_CONFIRMATION result.");
            }

            // Derive opposing team from whoever made the initial report
            UUID reporterId = result.getReportedBy().getId();
            TeamSide reporterTeam = gameParticipantRepository
                    .findBySessionIdAndUserId(sessionId, reporterId)
                    .map(GameParticipant::getTeam)
                    .orElse(TeamSide.TEAM_A);
            TeamSide opposingTeam = (reporterTeam == TeamSide.TEAM_A) ? TeamSide.TEAM_B : TeamSide.TEAM_A;

            // Only the opposing team's captain may submit a counter-score — computed via the
            // same earliest-joiner rule as buildResponse, using current team assignments, so
            // display (isCapt) and enforcement here can never disagree.
            UUID opposingCaptainId = gameSessionService.getTeamCaptainId(sessionId, opposingTeam);
            boolean isOpposingCaptain = opposingCaptainId != null && opposingCaptainId.equals(userId);
            if (!isOpposingCaptain) {
                String captainName = (opposingCaptainId != null)
                        ? gameParticipantRepository.findBySessionIdAndUserId(sessionId, opposingCaptainId)
                                .map(p -> p.getUser().getFirstName() + " " + p.getUser().getLastName())
                                .orElse("your team captain")
                        : "your team captain";
                throw new com.Levelmate.backend.common.exception.ForbiddenException(
                        "Only the team captain can submit a counter-score. Your team's captain is " + captainName + ".");
            }

            // Capture original reporter's ID before modifying result
            final UUID originalReporterId = result.getReportedBy().getId();
            final String sportCounter = result.getSession().getSport().getName();
            final String sessionIdCtr = sessionId.toString();
            User counterReporter = currentUser();
            final String disputerName = counterReporter.getFirstName() + " " + counterReporter.getLastName();

            result.setCounterReportedBy(counterReporter);
            result.setCounterWinnerTeam(WinnerTeam.valueOf(request.winnerTeam()));
            result.setCounterScoreTeamA(request.scoreTeamA());
            result.setCounterScoreTeamB(request.scoreTeamB());
            result.setStatus(ResultStatus.COUNTER_PROPOSED);
            GameResult savedCounter = gameResultRepository.save(result);

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    pushNotificationService.sendToUser(originalReporterId,
                            "Counter-score proposed",
                            disputerName + " proposed a different score for your " + sportCounter + " game",
                            Map.of("type", "RESULT_ACTION", "sessionId", sessionIdCtr));
                }
            });

            return GameResultResponse.from(savedCounter);
        }

        // ── Any other state → descriptive error ──────────────────────────────────────────
        throw new InvalidResultStatusException(
                "Result is in " + result.getStatus() + " state. " +
                "Dispute is only valid from PENDING_CONFIRMATION (opposing player submits counter-score) " +
                "or COUNTER_PROPOSED (original reporter rejects counter).");
    }

    /**
     * Player A accepts Player B's counter-proposal → finalises result using counter scores.
     * Only valid from COUNTER_PROPOSED state, only by the original reporter.
     */
    @Transactional
    public GameResultResponse acceptCounter(UUID sessionId, UUID userId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (result.getStatus() != ResultStatus.COUNTER_PROPOSED) {
            throw new InvalidResultStatusException(
                    "Result is in " + result.getStatus() + " state. " +
                    "accept-counter is only valid from COUNTER_PROPOSED.");
        }

        if (!result.getReportedBy().getId().equals(userId)) {
            throw new InvalidResultStatusException(
                    "Only the original reporter can accept a counter-proposal.");
        }

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        // Capture counter reporter ID and sport before modifying result
        final UUID counterReporterId = result.getCounterReportedBy().getId();
        final String sportName = result.getSession().getSport().getName();
        final String sessionIdStr = sessionId.toString();

        // Promote counter scores to become the official result
        User confirmer = currentUser();
        result.setWinnerTeam(result.getCounterWinnerTeam());
        result.setScoreTeamA(result.getCounterScoreTeamA());
        result.setScoreTeamB(result.getCounterScoreTeamB());
        result.setConfirmedBy(confirmer);
        result.setStatus(ResultStatus.CONFIRMED);
        result.setConfirmedAt(Instant.now());
        GameResult saved = gameResultRepository.save(result);

        final WinnerTeam winnerTeam = saved.getWinnerTeam();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                eloService.onResultConfirmed(sessionId, winnerTeam);
                pushNotificationService.sendToUser(counterReporterId,
                        "Counter-score accepted",
                        "Your counter-score for the " + sportName + " game was accepted",
                        Map.of("type", "RESULT_ACTION", "sessionId", sessionIdStr));
            }
        });

        return GameResultResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public GameResultResponse getResult(UUID sessionId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);
        return GameResultResponse.from(result);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
