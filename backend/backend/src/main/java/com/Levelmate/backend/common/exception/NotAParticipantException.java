package com.Levelmate.backend.common.exception;

public class NotAParticipantException extends RuntimeException {
    public NotAParticipantException() { super("You are not a participant in this session"); }
}
