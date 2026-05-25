package com.Levelmate.backend.elo.dto;

import java.util.List;

public record EloHistoryPageResponse(
        Double currentElo,
        int gamesPlayed,
        List<EloHistoryResponse> history,
        long totalElements,
        int totalPages,
        int page
) {}
