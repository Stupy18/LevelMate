package com.Levelmate.backend.games.service;

import com.Levelmate.backend.auth.entity.User;
import com.Levelmate.backend.common.exception.SessionNotFoundException;
import com.Levelmate.backend.common.exception.SportNotOnProfileException;
import com.Levelmate.backend.common.exception.TimeConflictException;
import com.Levelmate.backend.games.dto.*;
import com.Levelmate.backend.games.entity.*;
import com.Levelmate.backend.games.repository.GameParticipantRepository;
import com.Levelmate.backend.games.repository.GameResultRepository;
import com.Levelmate.backend.games.repository.GameSessionRepository;
import com.Levelmate.backend.games.repository.ResultVoteRepository;
import com.Levelmate.backend.users.entity.RatingType;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameSessionRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final GameResultRepository gameResultRepository;
    private final ResultVoteRepository resultVoteRepository;
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

        checkTimeConflict(userId, request.scheduledAt(), request.durationMinutes(), null);

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
                .googlePlaceId(request.googlePlaceId())
                .googlePhotoReference(request.googlePhotoReference())
                .build();

        // TODO: PRODUCTION — remove these two lines and use request values:
        session.setGooglePlaceId("ChIJ6XB0M2gMSUcRJ6dzgG4_fjU");
        session.setGooglePhotoReference("Ab43m-uCRaBr3_IETjoLzRnjzVaRtgdO6XnBanf0k4di09-sWw-aPXUViWzXRA4-7sTZZHZ7y-CLayW4jLVbOsXByrxKW2hs2NkJCE_dzh9FYKL3g1sIaPnpVr7-XB3eTz9BRCnD3mXOIv_ix3Ieypk6s8OnSdeHYPj5oOT9SKMareUnEO2QszHXD9cP7wojL5NAY4S9TDA2-FtriN6daR6X9I8gbo3TayEWJkkOqcRkeTjyz_qW2F6BECttiKvX44FyHLOfbSDw1ANp5XI8xYIYmhRyma-wXsH47RWCFDLJKw2mdt7KZDhSkv0Kvk_-6awmsPj9DLhevlCaj4a6QpjgyEPwrfrecCqm74qbPQXh7kmfwtsSSpfWiK-I2Pm5NZBej8omAEsyswALqLlnNTrFpcetopiqXeDI0BbUPh3kuMD-Hks");

        session = gameSessionRepository.save(session);

        GameParticipant hostParticipant = GameParticipant.builder()
                .session(session)
                .user(user)
                .role(ParticipantRole.HOST)
                .team(TeamSide.TEAM_A)
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

        List<UUID> sportIds = params.sportIds();
        if (sportIds != null && !sportIds.isEmpty()) {
            if (sportIds.size() == 1) {
                return gameSessionRepository.searchOpen(
                        sportIds.get(0), minLat, maxLat, minLng, maxLng,
                        params.minLevel(), params.maxLevel(), pageable)
                        .map(this::buildResponse);
            }
            return gameSessionRepository.searchOpenBySports(
                    sportIds, minLat, maxLat, minLng, maxLng,
                    params.minLevel(), params.maxLevel(), pageable)
                    .map(this::buildResponse);
        }

        return gameSessionRepository.searchOpen(
                null, minLat, maxLat, minLng, maxLng,
                params.minLevel(), params.maxLevel(), pageable)
                .map(this::buildResponse);
    }

    @Transactional(readOnly = true)
    public Page<GameSessionResponse> getSessionsByParticipant(UUID userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        return gameSessionRepository.findAllByParticipantUserId(userId, pageable)
                .map(this::buildResponse);
    }

    @Transactional(readOnly = true)
    public List<GameSessionResponse> getActiveSessionsForUser(UUID userId) {
        return gameSessionRepository
                .findActiveSessionsForUser(userId, List.of(SessionStatus.OPEN, SessionStatus.FULL, SessionStatus.IN_PROGRESS))
                .stream()
                .map(this::buildResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PendingResultResponse> getPendingResults(UUID userId) {
        List<GameSession> sessions = gameSessionRepository.findCompletedEloSessionsForUser(
                userId, SessionStatus.COMPLETED, RatingType.ELO_COMPETITIVE);

        List<PendingResultResponse> results = new ArrayList<>();
        for (GameSession session : sessions) {
            List<GameParticipant> ps = gameParticipantRepository.findAllBySessionId(session.getId());
            Optional<GameResult> resultOpt = gameResultRepository.findBySessionId(session.getId());
            String pendingType;
            if (resultOpt.isEmpty()) {
                boolean hasTeamA = ps.stream().anyMatch(p -> p.getTeam() == TeamSide.TEAM_A);
                boolean hasTeamB = ps.stream().anyMatch(p -> p.getTeam() == TeamSide.TEAM_B);
                if (!hasTeamA || !hasTeamB) continue;
                pendingType = "NOT_REPORTED";
            } else {
                GameResult result = resultOpt.get();
                if (result.getStatus() == ResultStatus.PENDING_CONFIRMATION
                        && !result.getReportedBy().getId().equals(userId)
                        && !resultVoteRepository.existsByResultIdAndUserId(result.getId(), userId)) {
                    pendingType = "REPORTED_BY_OTHER";
                } else if (result.getStatus() == ResultStatus.DISPUTED) {
                    pendingType = "DISPUTED";
                } else {
                    continue;
                }
            }
            String title = session.getTitle() != null
                    ? session.getTitle()
                    : session.getSport().getName() + " game";
            String sportSlug = session.getSport().getName().toLowerCase().replace(" ", "_");
            results.add(new PendingResultResponse(
                    session.getId(), title, session.getSport().getName(),
                    sportSlug, session.getScheduledAt(), pendingType,
                    session.getLocationName(), ps.size()));
        }
        return results;
    }

    public void checkTimeConflict(UUID userId, Instant scheduledAt, Integer durationMinutes, UUID excludeSessionId) {
        Instant start = scheduledAt;
        long durationSecs = (durationMinutes != null ? durationMinutes : 60) * 60L;
        Instant end = start.plusSeconds(durationSecs);

        List<GameSession> active = gameSessionRepository.findActiveSessionsForUser(
                userId, List.of(SessionStatus.OPEN, SessionStatus.FULL, SessionStatus.IN_PROGRESS));

        for (GameSession existing : active) {
            if (excludeSessionId != null && existing.getId().equals(excludeSessionId)) continue;
            Instant existingStart = existing.getScheduledAt();
            long existingDurationSecs = (existing.getDurationMinutes() != null ? existing.getDurationMinutes() : 60) * 60L;
            Instant existingEnd = existingStart.plusSeconds(existingDurationSecs);

            if (start.isBefore(existingEnd) && end.isAfter(existingStart)) {
                String title = existing.getTitle() != null
                        ? existing.getTitle()
                        : existing.getSport().getName() + " game";
                throw new TimeConflictException(
                        existing.getId().toString(), title, existing.getScheduledAt(),
                        existing.getDurationMinutes(), existing.getSport().getName(),
                        existing.getLocationName());
            }
        }
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
