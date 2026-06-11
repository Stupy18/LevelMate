package com.Levelmate.backend.admin.service;

import com.Levelmate.backend.admin.dto.AdminDisputeResponse;
import com.Levelmate.backend.admin.dto.ResolveDisputeRequest;
import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.InvalidResultStatusException;
import com.Levelmate.backend.common.exception.ResultNotFoundException;
import com.Levelmate.backend.elo.service.EloService;
import com.Levelmate.backend.games.dto.GameResultResponse;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.entity.*;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.games.service.GameSessionService;
import com.Levelmate.backend.notifications.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
public class AdminService {

    private final GameResultRepository gameResultRepository;
    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameSessionService gameSessionService;
    private final EloService eloService;
    private final PushNotificationService pushNotificationService;

    @Transactional(readOnly = true)
    public List<AdminDisputeResponse> getDisputes() {
        requireAdmin();
        return gameResultRepository.findAllByStatusOrderByReportedAtDesc(ResultStatus.DISPUTED)
                .stream()
                .map(this::toDisputeResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public GameResultResponse resolveDispute(UUID sessionId, ResolveDisputeRequest request) {
        requireAdmin();

        // Capture notification data before core logic modifies the result entity
        List<GameParticipant> allPs = gameParticipantRepository.findAllBySessionId(sessionId);
        List<UUID> allIds = allPs.stream().map(p -> p.getUser().getId()).collect(Collectors.toList());
        GameResult pre = gameResultRepository.findBySessionId(sessionId).orElseThrow(ResultNotFoundException::new);
        final String sportName = pre.getSession().getSport().getName();
        final String sessionIdStr = sessionId.toString();

        GameResultResponse response = resolveDisputeCore(sessionId, request);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (UUID uid : allIds) {
                    pushNotificationService.sendToUser(uid,
                            "Match dispute resolved",
                            "An admin has resolved the result for your " + sportName + " game",
                            Map.of("type", "ELO_UPDATE", "sessionId", sessionIdStr));
                }
            }
        });

        return response;
    }

    /**
     * Core resolution logic: validates DISPUTED status, confirms the result, triggers ELO.
     * Does NOT enforce admin role. Does NOT send push notifications — caller handles that.
     * Used by both the admin endpoint and the auto-resolution scheduler.
     */
    @Transactional
    public GameResultResponse resolveDisputeCore(UUID sessionId, ResolveDisputeRequest request) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(ResultNotFoundException::new);

        if (result.getStatus() != ResultStatus.DISPUTED) {
            throw new InvalidResultStatusException(
                    "Result is in " + result.getStatus() + " state. Only DISPUTED results can be resolved.");
        }

        if (request.winnerTeam() == null) {
            throw new InvalidResultStatusException("winnerTeam is required to resolve a dispute.");
        }

        result.setWinnerTeam(WinnerTeam.valueOf(request.winnerTeam()));
        result.setScoreTeamA(request.scoreTeamA());
        result.setScoreTeamB(request.scoreTeamB());
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

    @Transactional(readOnly = true)
    public Page<GameSessionResponse> getAllSessions(int page, int size) {
        requireAdmin();
        return gameSessionRepository
                .findAllByOrderByScheduledAtDesc(PageRequest.of(page, size))
                .map(gameSessionService::buildResponse);
    }

    private AdminDisputeResponse toDisputeResponse(GameResult result) {
        GameSession session = result.getSession();
        List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(session.getId());

        List<AdminDisputeResponse.ParticipantInfo> participantInfos = participants.stream()
                .map(p -> new AdminDisputeResponse.ParticipantInfo(
                        p.getUser().getId(),
                        p.getUser().getFirstName() + " " + p.getUser().getLastName(),
                        p.getTeam() != null ? p.getTeam().name() : null))
                .collect(Collectors.toList());

        String counterDisplayName = result.getCounterReportedBy() != null
                ? result.getCounterReportedBy().getFirstName() + " " + result.getCounterReportedBy().getLastName()
                : null;

        return new AdminDisputeResponse(
                session.getId(),
                session.getSport().getName(),
                session.getScheduledAt().toString(),
                session.getLocationName(),
                result.getReportedBy().getFirstName() + " " + result.getReportedBy().getLastName(),
                result.getWinnerTeam() != null ? result.getWinnerTeam().name() : null,
                result.getScoreTeamA(),
                result.getScoreTeamB(),
                counterDisplayName,
                result.getCounterWinnerTeam() != null ? result.getCounterWinnerTeam().name() : null,
                result.getCounterScoreTeamA(),
                result.getCounterScoreTeamB(),
                participantInfos
        );
    }

    private void requireAdmin() {
        User user = currentUser();
        if (!"ADMIN".equals(user.getRole())) {
            throw new ForbiddenException("Admin access required.");
        }
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
