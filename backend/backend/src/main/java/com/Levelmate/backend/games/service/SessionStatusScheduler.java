package com.Levelmate.backend.games.service;

import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.notifications.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SessionStatusScheduler {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final PushNotificationService pushNotificationService;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void tick() {
        Instant now = Instant.now();
        Instant since = now.minusSeconds(70);

        // OPEN/FULL → IN_PROGRESS if enough players joined, CANCELLED otherwise
        gameSessionRepository.bulkTransitionStarted(now);
        // Mark newly-cancelled sessions as auto-cancelled due to insufficient players
        gameSessionRepository.bulkMarkInsufficientPlayersCancellations(now);
        // IN_PROGRESS → COMPLETED when scheduledAt + durationMinutes has passed
        gameSessionRepository.bulkTransitionToCompleted(now);

        // Send push notifications for sessions just auto-cancelled in this tick
        List<GameSession> autoCancelled = gameSessionRepository.findRecentlyAutoCancelled(since, now);
        if (!autoCancelled.isEmpty()) {
            List<Runnable> notifications = new ArrayList<>();
            for (GameSession session : autoCancelled) {
                List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(session.getId());
                final String sportName = session.getSport().getName();
                final String title = session.getTitle() != null ? session.getTitle() : sportName + " session";
                final String sessionIdStr = session.getId().toString();
                for (GameParticipant participant : participants) {
                    final UUID uid = participant.getUser().getId();
                    notifications.add(() -> pushNotificationService.sendToUser(
                            uid,
                            "Session cancelled — not enough players",
                            "Your " + sportName + " session '" + title + "' was cancelled because the minimum number of players wasn't reached in time",
                            Map.of("type", "SESSION_CANCELLED", "sessionId", sessionIdStr)));
                }
            }
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notifications.forEach(Runnable::run);
                }
            });
        }
    }
}
