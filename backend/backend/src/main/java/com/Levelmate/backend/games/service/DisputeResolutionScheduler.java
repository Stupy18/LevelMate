package com.Levelmate.backend.games.service;

import com.Levelmate.backend.admin.dto.ResolveDisputeRequest;
import com.Levelmate.backend.admin.service.AdminService;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameResult;
import com.Levelmate.backend.games.entity.ResultStatus;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.notifications.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class DisputeResolutionScheduler {

    private final GameResultRepository gameResultRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final AdminService adminService;
    private final PushNotificationService pushNotificationService;

    @Value("${levelmate.scheduler.dispute-resolution-hours:24}")
    private int resolutionHours;

    @Scheduled(cron = "${levelmate.scheduler.dispute-resolution-cron:0 0 * * * *}")
    public void resolveOverdueDisputes() {
        Instant threshold = Instant.now().minus(resolutionHours, ChronoUnit.HOURS);
        List<GameResult> overdue = gameResultRepository.findUnresolvedDisputesOlderThan(threshold);

        if (overdue.isEmpty()) return;

        log.info("DisputeResolutionScheduler: {} overdue dispute(s) to auto-resolve", overdue.size());

        for (GameResult result : overdue) {
            UUID sessionId = result.getSession().getId();
            try {
                resolveOne(sessionId);
            } catch (Exception e) {
                log.error("DisputeResolutionScheduler: failed to auto-resolve session {}: {}",
                        sessionId, e.getMessage(), e);
            }
        }
    }

    @Transactional
    public void resolveOne(UUID sessionId) {
        GameResult result = gameResultRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new IllegalStateException("Result not found for session " + sessionId));

        // Guard: skip if already handled since the outer query ran
        if (result.isAutoResolved() || result.getStatus() != ResultStatus.DISPUTED) {
            return;
        }

        String winnerTeam = result.getWinnerTeam() != null ? result.getWinnerTeam().name() : null;
        ResolveDisputeRequest req = new ResolveDisputeRequest(
                winnerTeam, result.getScoreTeamA(), result.getScoreTeamB());

        final String sportName = result.getSession().getSport().getName();
        final String sessionIdStr = sessionId.toString();

        // Reuse AdminService core logic (ELO trigger included) — no admin check, no its notification
        adminService.resolveDisputeCore(sessionId, req);

        // Mark auto-resolved (same Hibernate session — entity already modified by resolveDisputeCore)
        result.setAutoResolved(true);
        gameResultRepository.save(result);

        List<UUID> participantIds = gameParticipantRepository.findAllBySessionId(sessionId).stream()
                .map(p -> p.getUser().getId())
                .collect(Collectors.toList());

        log.info("DisputeResolutionScheduler: auto-resolved session {} — winner={} score={}–{}",
                sessionId, winnerTeam, result.getScoreTeamA(), result.getScoreTeamB());

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (UUID uid : participantIds) {
                    pushNotificationService.sendToUser(uid,
                            "Match auto-resolved",
                            "Your disputed " + sportName + " match has been resolved using the original reported score. ELO has been updated.",
                            Map.of("type", "ELO_UPDATE", "sessionId", sessionIdStr));
                }
            }
        });
    }
}
