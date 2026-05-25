package com.Levelmate.backend.users.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddSportRequest(
        @NotNull(message = "sportId is required")
        UUID sportId,
        Double eloRating,
        String grade,
        Integer level
) {}
