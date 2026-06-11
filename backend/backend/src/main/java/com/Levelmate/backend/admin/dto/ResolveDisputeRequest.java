package com.Levelmate.backend.admin.dto;

public record ResolveDisputeRequest(
        String winnerTeam,
        Integer scoreTeamA,
        Integer scoreTeamB
) {}
