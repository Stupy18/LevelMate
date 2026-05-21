package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.InvalidStatusTransitionException;
import com.Levelmate.backend.common.exception.SessionNotFoundException;
import com.Levelmate.backend.common.exception.SessionNotYetPlayedException;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionStatusService {

    private final GameSessionRepository gameSessionRepository;
    private final GameSessionService gameSessionService;

    @Transactional
    public GameSessionResponse updateStatus(UUID sessionId, UUID userId, String newStatusStr) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        if (!session.getHost().getId().equals(userId)) {
            throw new ForbiddenException();
        }

        SessionStatus current = session.getStatus();
        SessionStatus target = SessionStatus.valueOf(newStatusStr);

        if (target == SessionStatus.COMPLETED) {
            if (session.getScheduledAt().isAfter(Instant.now())) {
                throw new SessionNotYetPlayedException();
            }
            if (current != SessionStatus.OPEN && current != SessionStatus.FULL) {
                throw new InvalidStatusTransitionException(current + " → COMPLETED is not allowed");
            }
        } else if (target == SessionStatus.CANCELLED) {
            if (current != SessionStatus.OPEN && current != SessionStatus.FULL) {
                throw new InvalidStatusTransitionException(current + " → CANCELLED is not allowed");
            }
        } else {
            throw new InvalidStatusTransitionException("Manual transition to " + target + " is not allowed");
        }

        session.setStatus(target);
        gameSessionRepository.save(session);
        return gameSessionService.buildResponse(session);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
