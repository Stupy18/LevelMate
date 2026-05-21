package com.Levelmate.backend.games.dto;

import com.Levelmate.backend.games.entity.GameResult;
import com.Levelmate.backend.games.entity.ResultStatus;
import com.Levelmate.backend.games.entity.WinnerTeam;

import java.time.Instant;
import java.util.UUID;

public record GameResultResponse(
        UUID id,
        UUID sessionId,
        UUID reportedByUserId,
        UUID confirmedByUserId,
        WinnerTeam winnerTeam,
        Integer scoreTeamA,
        Integer scoreTeamB,
        ResultStatus status,
        Instant reportedAt,
        Instant confirmedAt
) {
    public static GameResultResponse from(GameResult r) {
        return new GameResultResponse(
                r.getId(),
                r.getSession().getId(),
                r.getReportedBy().getId(),
                r.getConfirmedBy() != null ? r.getConfirmedBy().getId() : null,
                r.getWinnerTeam(),
                r.getScoreTeamA(),
                r.getScoreTeamB(),
                r.getStatus(),
                r.getReportedAt(),
                r.getConfirmedAt()
        );
    }
}
