package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.ForbiddenException;
import com.Levelmate.backend.common.exception.InvalidStatusTransitionException;
import com.Levelmate.backend.common.exception.SessionNotFoundException;
import com.Levelmate.backend.common.exception.SessionNotYetPlayedException;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
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
public class GameSessionStatusService {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameSessionService gameSessionService;
    private final PushNotificationService pushNotificationService;

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

        if (target == SessionStatus.COMPLETED
                && session.getSport().getRatingType() == RatingType.PERFORMANCE_BASED) {
            List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(sessionId);
            final String sportName = session.getSport().getName();
            final String sessionIdStr = sessionId.toString();
            final List<UUID> participantIds = participants.stream()
                    .map(p -> p.getUser().getId())
                    .collect(Collectors.toList());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (UUID uid : participantIds) {
                        pushNotificationService.sendToUser(uid,
                                "Did you set a new PB?",
                                "Update your personal bests from your " + sportName + " session",
                                Map.of("type", "PB_UPDATE_REQUEST", "sessionId", sessionIdStr));
                    }
                }
            });
        }

        if (target == SessionStatus.COMPLETED
                && session.getSport().getRatingType() == RatingType.GRADE_BASED) {
            List<GameParticipant> participants = gameParticipantRepository.findAllBySessionId(sessionId);
            final String sportName = session.getSport().getName();
            final String sessionIdStr = sessionId.toString();
            final List<UUID> participantIds = participants.stream()
                    .map(p -> p.getUser().getId())
                    .collect(Collectors.toList());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (UUID uid : participantIds) {
                        pushNotificationService.sendToUser(uid,
                                "How was your " + sportName + " session?",
                                "Tap to log your session with the group",
                                Map.of("type", "SESSION_LOG", "sessionId", sessionIdStr));
                    }
                }
            });
        }

        return gameSessionService.buildResponse(session);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
