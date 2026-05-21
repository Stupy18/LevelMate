package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.SessionNotFoundException;
import com.Levelmate.backend.common.exception.SportNotOnProfileException;
import com.Levelmate.backend.games.dto.*;
import com.Levelmate.backend.games.entity.GameParticipant;
import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.ParticipantRole;
import com.Levelmate.backend.games.entity.SessionStatus;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.users.entity.Sport;
import com.Levelmate.backend.users.repository.SportRepository;
import com.Levelmate.backend.users.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final SportRepository sportRepository;
    private final UserSportRepository userSportRepository;

    @Transactional
    public GameSessionResponse createSession(UUID userId, CreateGameSessionRequest request) {
        User user = currentUser();

        if (!userSportRepository.existsByUserIdAndSportId(userId, request.sportId())) {
            throw new SportNotOnProfileException();
        }

        Sport sport = sportRepository.findById(request.sportId())
                .orElseThrow(() -> new com.Levelmate.backend.common.exception.SportNotFoundException());

        GameSession session = GameSession.builder()
                .sport(sport)
                .host(user)
                .title(request.title())
                .description(request.description())
                .status(SessionStatus.OPEN)
                .scheduledAt(request.scheduledAt())
                .durationMinutes(request.durationMinutes())
                .minPlayers(request.minPlayers())
                .maxPlayers(request.maxPlayers())
                .minLevel(request.minLevel())
                .maxLevel(request.maxLevel())
                .locationAddress(request.locationAddress())
                .locationLat(request.locationLat())
                .locationLng(request.locationLng())
                .locationName(request.locationName())
                .build();

        session = gameSessionRepository.save(session);

        GameParticipant hostParticipant = GameParticipant.builder()
                .session(session)
                .user(user)
                .role(ParticipantRole.HOST)
                .build();
        gameParticipantRepository.save(hostParticipant);

        return buildResponse(session);
    }

    @Transactional(readOnly = true)
    public GameSessionResponse getSession(UUID sessionId) {
        GameSession session = gameSessionRepository.findById(sessionId)
                .orElseThrow(SessionNotFoundException::new);
        return buildResponse(session);
    }

    @Transactional(readOnly = true)
    public Page<GameSessionResponse> searchSessions(GameSessionSearchParams params) {
        PageRequest pageable = PageRequest.of(params.page(), params.size(), Sort.by("scheduledAt").ascending());

        BigDecimal minLat = null, maxLat = null, minLng = null, maxLng = null;
        if (params.lat() != null && params.lng() != null && params.radiusKm() != null) {
            double latDelta = params.radiusKm() / 111.0;
            double lngDelta = params.radiusKm() / (111.0 * Math.cos(Math.toRadians(params.lat().doubleValue())));
            minLat = params.lat().subtract(BigDecimal.valueOf(latDelta));
            maxLat = params.lat().add(BigDecimal.valueOf(latDelta));
            minLng = params.lng().subtract(BigDecimal.valueOf(lngDelta));
            maxLng = params.lng().add(BigDecimal.valueOf(lngDelta));
        }

        return gameSessionRepository.searchOpen(
                params.sportId(), minLat, maxLat, minLng, maxLng,
                params.minLevel(), params.maxLevel(), pageable)
                .map(this::buildResponse);
    }

    public GameSessionResponse buildResponse(GameSession session) {
        List<GameParticipantResponse> participants = gameParticipantRepository
                .findAllBySessionId(session.getId()).stream()
                .map(GameParticipantResponse::from)
                .toList();
        return GameSessionResponse.from(session, participants);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
}
