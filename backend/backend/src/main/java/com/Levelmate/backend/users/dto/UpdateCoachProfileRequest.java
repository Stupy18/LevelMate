package com.Levelmate.backend.users.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateCoachProfileRequest(
        @NotBlank(message = "description is required")
        String description,
        Integer hourlyRateCents
) {}
