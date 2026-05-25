package com.Levelmate.backend.games.dto;

import com.Levelmate.backend.games.entity.GameSession;
import com.Levelmate.backend.games.entity.SessionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GameSessionResponse(
        UUID id,
        UUID sportId,
        String sportName,
        UUID hostUserId,
        String hostDisplayName,
        String title,
        String description,
        SessionStatus status,
        Instant scheduledAt,
        Integer durationMinutes,
        int minPlayers,
        int maxPlayers,
        Integer minLevel,
        Integer maxLevel,
        String locationAddress,
        BigDecimal locationLat,
        BigDecimal locationLng,
        String locationName,
        String googlePlaceId,
        String googlePhotoReference,
        int participantCount,
        int spotsRemaining,
        List<GameParticipantResponse> participants,
        Instant createdAt
) {
    public static GameSessionResponse from(GameSession s, List<GameParticipantResponse> participants) {
        int count = participants.size();
        return new GameSessionResponse(
                s.getId(),
                s.getSport().getId(),
                s.getSport().getName(),
                s.getHost().getId(),
                s.getHost().getFirstName() + " " + s.getHost().getLastName(),
                s.getTitle(),
                s.getDescription(),
                s.getStatus(),
                s.getScheduledAt(),
                s.getDurationMinutes(),
                s.getMinPlayers(),
                s.getMaxPlayers(),
                s.getMinLevel(),
                s.getMaxLevel(),
                s.getLocationAddress(),
                s.getLocationLat(),
                s.getLocationLng(),
                s.getLocationName(),
                s.getGooglePlaceId(),
                s.getGooglePhotoReference(),
                count,
                Math.max(0, s.getMaxPlayers() - count),
                participants,
                s.getCreatedAt()
        );
    }
}
