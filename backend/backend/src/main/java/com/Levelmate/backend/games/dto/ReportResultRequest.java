package com.Levelmate.backend.games.dto;

import jakarta.validation.constraints.NotNull;

public record ReportResultRequest(
        @NotNull(message = "winnerTeam is required")
        String winnerTeam,
        Integer scoreTeamA,
        Integer scoreTeamB
) {}
