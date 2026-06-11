package com.Levelmate.backend.games.dto;

public record DisputeResultRequest(
        String winnerTeam,
        Integer scoreTeamA,
        Integer scoreTeamB
) {}
