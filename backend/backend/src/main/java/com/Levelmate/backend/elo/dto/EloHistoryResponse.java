package com.Levelmate.backend.elo.dto;

import com.Levelmate.backend.elo.entity.EloHistory;

import java.time.Instant;
import java.util.UUID;

public record EloHistoryResponse(
        UUID sessionId,
        double eloBefore,
        double eloDelta,
        double eloAfter,
        Instant recordedAt
) {
    public static EloHistoryResponse from(EloHistory h) {
        return new EloHistoryResponse(
                h.getSession().getId(),
                h.getEloBefore(),
                h.getEloDelta(),
                h.getEloAfter(),
                h.getRecordedAt()
        );
    }
}
