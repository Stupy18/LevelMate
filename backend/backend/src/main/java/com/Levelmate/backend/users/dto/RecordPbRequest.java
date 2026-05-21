package com.Levelmate.backend.users.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordPbRequest(
        @NotNull(message = "distanceMeters is required")
        @Min(value = 1, message = "distanceMeters must be greater than 0")
        Integer distanceMeters,

        @NotNull(message = "timeSeconds is required")
        @Min(value = 1, message = "timeSeconds must be greater than 0")
        Integer timeSeconds
) {}
