package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.*;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.ParticipantRole;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameParticipationService {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final UserSportRepository userSportRepository;
    private final GameSessionService gameSessionService;

    @Transactional
    public GameSessionResponse joinSession(UUID sessionId, UUID userId) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        if (session.getStatus() == SessionStatus.FULL) {
            throw new SessionFullException();
        }
        if (session.getStatus() != SessionStatus.OPEN) {
            throw new SessionNotOpenException();
        }

        if (gameParticipantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            throw new AlreadyJoinedException();
        }

        userSportRepository.findByUserIdAndSportId(userId, session.getSport().getId())
                .ifPresent(us -> {
                    Integer userLevel = us.getLevel();
                    Integer minLevel = session.getMinLevel();
                    Integer maxLevel = session.getMaxLevel();
                    if (userLevel != null) {
                        if ((minLevel != null && userLevel < minLevel) || (maxLevel != null && userLevel > maxLevel)) {
                            throw new LevelOutOfRangeException();
                        }
                    }
                });

        User user = currentUser();
        GameParticipant participant = GameParticipant.builder()
                .session(session)
                .user(user)
                .role(ParticipantRole.PLAYER)
                .build();
        gameParticipantRepository.save(participant);

        long count = gameParticipantRepository.countBySessionId(sessionId);
        if (count >= session.getMaxPlayers()) {
            session.setStatus(SessionStatus.FULL);
            gameSessionRepository.save(session);
        }

        return gameSessionService.buildResponse(session);
    }

    @Transactional
    public void leaveSession(UUID sessionId, UUID userId) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        GameParticipant participant = gameParticipantRepository
                .findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(NotAParticipantException::new);

        if (participant.getRole() == ParticipantRole.HOST) {
            throw new HostCannotLeaveException();
        }

        if (session.getStatus() != SessionStatus.OPEN && session.getStatus() != SessionStatus.FULL) {
            throw new InvalidStatusTransitionException("Cannot leave a session with status " + session.getStatus());
        }

        boolean wasFull = session.getStatus() == SessionStatus.FULL;
        gameParticipantRepository.deleteBySessionIdAndUserId(sessionId, userId);

        if (wasFull) {
            session.setStatus(SessionStatus.OPEN);
            gameSessionRepository.save(session);
        }
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
