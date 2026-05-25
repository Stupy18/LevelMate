package com.Levelmate.backend.games.dto;

import java.time.Instant;
import java.util.UUID;

public record PendingResultResponse(
        UUID sessionId,
        String title,
        String sportName,
        String sportSlug,
        Instant scheduledAt,
        String pendingType,
        String locationName,
        int participantCount
) {}
