package com.Levelmate.backend.common.exception;

public class InvalidScheduledDateException extends RuntimeException {
    public InvalidScheduledDateException() { super("scheduledAt must be in the future"); }
}
