package com.Levelmate.backend.games.service;

import com.Levelmate.backend.games.repository.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class SessionStatusScheduler {

    private final GameSessionRepository gameSessionRepository;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void tick() {
        Instant now = Instant.now();
        // OPEN/FULL → IN_PROGRESS if enough players joined, CANCELLED otherwise
        gameSessionRepository.bulkTransitionStarted(now);
        // IN_PROGRESS → COMPLETED when scheduledAt + durationMinutes has passed
        gameSessionRepository.bulkTransitionToCompleted(now);
    }
}
