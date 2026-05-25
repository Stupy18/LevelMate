package com.Levelmate.backend.games.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateGameSessionRequest(
        @NotNull(message = "sportId is required")
        UUID sportId,
        String title,
        String description,
        @NotNull(message = "scheduledAt is required")
        @Future(message = "scheduledAt must be in the future")
        Instant scheduledAt,
        Integer durationMinutes,
        @NotNull(message = "minPlayers is required")
        @Min(value = 2, message = "minPlayers must be at least 2")
        Integer minPlayers,
        @NotNull(message = "maxPlayers is required")
        Integer maxPlayers,
        Integer minLevel,
        Integer maxLevel,
        String locationAddress,
        BigDecimal locationLat,
        BigDecimal locationLng,
        String locationName,
        String googlePlaceId,
        String googlePhotoReference
) {}
