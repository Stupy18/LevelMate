package com.Levelmate.backend.users.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCoachProfileRequest(
        @NotBlank(message = "description is required")
        String description,
        Integer hourlyRateCents
) {}
