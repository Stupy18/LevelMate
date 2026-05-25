package com.Levelmate.backend.common.exception;

import lombok.Getter;

import java.time.Instant;

@Getter
public class TimeConflictException extends RuntimeException {

    private final String conflictingSessionId;
    private final String conflictingSessionTitle;
    private final Instant conflictingScheduledAt;
    private final Integer conflictingDurationMinutes;
    private final String conflictingSportName;
    private final String conflictingLocationName;

    public TimeConflictException(
            String id, String title, Instant scheduledAt,
            Integer durationMinutes, String sportName, String locationName) {
        super("You already have a game during this time");
        this.conflictingSessionId = id;
        this.conflictingSessionTitle = title;
        this.conflictingScheduledAt = scheduledAt;
        this.conflictingDurationMinutes = durationMinutes;
        this.conflictingSportName = sportName;
        this.conflictingLocationName = locationName;
    }
}
