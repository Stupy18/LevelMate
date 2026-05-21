package com.Levelmate.backend.games.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateSessionStatusRequest(
        @NotBlank(message = "status is required")
        @Pattern(regexp = "CANCELLED|COMPLETED", message = "status must be CANCELLED or COMPLETED")
        String status
) {}
