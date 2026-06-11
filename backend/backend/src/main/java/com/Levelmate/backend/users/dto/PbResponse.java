package com.Levelmate.backend.users.dto;

import com.Levelmate.backend.users.entity.PerformancePb;

import java.time.Instant;
import java.util.UUID;

public record PbResponse(
        UUID pbId,
        Integer distanceMeters,
        Integer timeSeconds,
        Instant recordedAt
) {
    public static PbResponse from(PerformancePb pb) {
        return new PbResponse(pb.getId(), pb.getDistanceMeters(), pb.getTimeSeconds(), pb.getRecordedAt());
    }
}
