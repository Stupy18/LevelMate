package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.*;
import com.Levelmate.backend.games.dto.GameResultResponse;
import com.Levelmate.backend.games.dto.ReportResultRequest;
import com.Levelmate.backend.elo.service.EloService;
import com.Levelmate.backend.games.entity.*;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.users.entity.RatingType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameResultService {

    private final GameResultRepository gameResultRepository;
    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final EloService eloService;

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

        return GameResultResponse.from(gameResultRepository.save(result));
    }

    @Transactional
    public GameResultResponse confirmResult(UUID sessionId, UUID userId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (result.getStatus() != ResultStatus.PENDING_CONFIRMATION) {
            throw new InvalidResultStatusException("Result is not pending confirmation");
        }

        if (result.getReportedBy().getId().equals(userId)) {
            throw new CannotConfirmOwnReportException();
        }

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        User confirmer = currentUser();
        result.setConfirmedBy(confirmer);
        result.setStatus(ResultStatus.CONFIRMED);
        result.setConfirmedAt(Instant.now());
        GameResult saved = gameResultRepository.save(result);

        eloService.onResultConfirmed(sessionId, saved.getWinnerTeam());

        return GameResultResponse.from(saved);
    }

    @Transactional
    public GameResultResponse disputeResult(UUID sessionId, UUID userId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (result.getStatus() != ResultStatus.PENDING_CONFIRMATION) {
            throw new InvalidResultStatusException("Result is not pending confirmation");
        }

        if (result.getReportedBy().getId().equals(userId)) {
            throw new CannotConfirmOwnReportException();
        }

        if (!gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new NotAParticipantException();
        }

        result.setStatus(ResultStatus.DISPUTED);
        return GameResultResponse.from(gameResultRepository.save(result));
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
