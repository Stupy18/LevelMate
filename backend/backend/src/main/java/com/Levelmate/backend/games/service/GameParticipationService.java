package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.*;
import com.Levelmate.backend.games.dto.GameSessionResponse;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.ParticipantRole;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.entity.TeamSide;
import com.Levelmate.backend.games.dto.CanRebalanceResponse;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.notifications.service.PushNotificationService;
import com.Levelmate.backend.users.entity.RatingType;
import com.Levelmate.backend.users.repository.UserSportRepository;
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

@Service
@RequiredArgsConstructor
public class GameParticipationService {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameResultRepository gameResultRepository;
    private final UserSportRepository userSportRepository;
    private final GameSessionService gameSessionService;
    private final PushNotificationService pushNotificationService;

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

        if (session.getSport().getRatingType() == RatingType.ELO_COMPETITIVE) {
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
        }

        gameSessionService.checkTimeConflict(userId, session.getScheduledAt(), session.getDurationMinutes(), session.getId());

        List<GameParticipant> existing = gameParticipantRepository.findAllBySessionId(sessionId);
        long teamACount = existing.stream().filter(p -> p.getTeam() == TeamSide.TEAM_A).count();
        long teamBCount = existing.stream().filter(p -> p.getTeam() == TeamSide.TEAM_B).count();
        TeamSide autoTeam = (teamACount <= teamBCount) ? TeamSide.TEAM_A : TeamSide.TEAM_B;

        User user = currentUser();
        GameParticipant participant = GameParticipant.builder()
                .session(session)
                .user(user)
                .role(ParticipantRole.PLAYER)
                .team(autoTeam)
                .build();
        gameParticipantRepository.save(participant);

        long count = gameParticipantRepository.countBySessionId(sessionId);
        boolean isFull = count >= session.getMaxPlayers();
        if (isFull) {
            session.setStatus(SessionStatus.FULL);
            gameSessionRepository.save(session);
        }

        // Capture values within transaction before afterCommit fires
        final UUID hostId = session.getHost().getId();
        final String sportName = session.getSport().getName();
        final String sessionIdStr = sessionId.toString();
        final String joinerName = user.getFirstName() + " " + user.getLastName();
        final boolean sessionNowFull = isFull;

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                pushNotificationService.sendToUser(hostId,
                        "New player joined",
                        joinerName + " joined your " + sportName + " game",
                        Map.of("type", "SESSION_UPDATE", "sessionId", sessionIdStr));

                if (sessionNowFull) {
                    pushNotificationService.sendToUser(hostId,
                            "Game is full",
                            "Your " + sportName + " game is full and ready to play",
                            Map.of("type", "SESSION_UPDATE", "sessionId", sessionIdStr));
                }
            }
        });

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

        // Capture before delete so lazy fields are still accessible
        final UUID hostId = session.getHost().getId();
        final String sportName = session.getSport().getName();
        final String sessionIdStr = sessionId.toString();
        final String leaverName = participant.getUser().getFirstName() + " " + participant.getUser().getLastName();

        boolean wasFull = session.getStatus() == SessionStatus.FULL;
        gameParticipantRepository.deleteBySessionIdAndUserId(sessionId, userId);

        if (wasFull) {
            session.setStatus(SessionStatus.OPEN);
            gameSessionRepository.save(session);
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                pushNotificationService.sendToUser(hostId,
                        "Player left",
                        leaverName + " left your " + sportName + " game",
                        Map.of("type", "SESSION_UPDATE", "sessionId", sessionIdStr));
            }
        });
    }

    @Transactional
    public void assignTeam(UUID sessionId, UUID requestorId, UUID targetUserId, String teamStr) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        // Hard freeze: once a result row exists (any status), team composition — and
        // therefore captaincy — can never change again, regardless of caller or session
        // status. This must be checked before any other permission logic below.
        if (gameResultRepository.existsBySessionId(sessionId)) {
            throw new TeamsLockedResultExistsException();
        }

        boolean isCompletedNoResult = session.getStatus() == SessionStatus.COMPLETED;

        if (isCompletedNoResult) {
            // Rebalancing window: host (Team A captain) OR Team B captain allowed
            boolean isHost = session.getHost().getId().equals(requestorId);
            boolean isTeamBCaptain = gameParticipantRepository
                    .findFirstBySessionIdAndTeamOrderByJoinedAtAsc(sessionId, TeamSide.TEAM_B)
                    .map(p -> p.getUser().getId().equals(requestorId))
                    .orElse(false);
            if (!isHost && !isTeamBCaptain) {
                throw new ForbiddenException("Only team captains can adjust teams after a session is completed.");
            }
        } else {
            // Pre-game window: host only, before game starts
            if (!session.getHost().getId().equals(requestorId)) {
                throw new ForbiddenException();
            }
            if (session.getScheduledAt().isBefore(Instant.now())
                    || session.getStatus() == SessionStatus.IN_PROGRESS
                    || session.getStatus() == SessionStatus.COMPLETED
                    || session.getStatus() == SessionStatus.CANCELLED) {
                throw new ForbiddenException("Team assignments are locked once the game has started.");
            }
        }

        GameParticipant participant = gameParticipantRepository
                .findBySessionIdAndUserId(sessionId, targetUserId)
                .orElseThrow(NotAParticipantException::new);

        TeamSide team = (teamStr == null || teamStr.isBlank()) ? null : TeamSide.valueOf(teamStr);
        participant.setTeam(team);
        gameParticipantRepository.save(participant);
    }

    @Transactional
    public void markPbSubmitted(UUID sessionId, UUID userId) {
        GameParticipant participant = gameParticipantRepository
                .findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(NotAParticipantException::new);
        participant.setPbUpdateSubmitted(true);
        gameParticipantRepository.save(participant);
    }

    @Transactional
    public void markSessionAcknowledged(UUID sessionId, UUID userId) {
        GameParticipant participant = gameParticipantRepository
                .findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(NotAParticipantException::new);
        participant.setSessionAcknowledged(true);
        gameParticipantRepository.save(participant);
    }

    public CanRebalanceResponse canRebalance(UUID sessionId, UUID userId) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);

        if (session.getStatus() != SessionStatus.COMPLETED) {
            return new CanRebalanceResponse(false, "Session is not completed.");
        }
        if (gameResultRepository.existsBySessionId(sessionId)) {
            return new CanRebalanceResponse(false, "Teams are locked once a result has been reported.");
        }
        boolean isHost = session.getHost().getId().equals(userId);
        boolean isTeamBCaptain = gameParticipantRepository
                .findFirstBySessionIdAndTeamOrderByJoinedAtAsc(sessionId, TeamSide.TEAM_B)
                .map(p -> p.getUser().getId().equals(userId))
                .orElse(false);
        if (!isHost && !isTeamBCaptain) {
            return new CanRebalanceResponse(false, "Only team captains can rebalance teams.");
        }
        return new CanRebalanceResponse(true, "Team rebalancing is available.");
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
