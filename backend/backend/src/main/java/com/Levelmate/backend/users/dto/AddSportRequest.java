package com.Levelmate.backend.users.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record AddSportRequest(
        @NotNull(message = "sportId is required")
        UUID sportId,
        List<MetricValueRequest> metrics
) {}
