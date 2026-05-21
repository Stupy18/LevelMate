package com.Levelmate.backend.common.exception;

public class SessionNotCompletedException extends RuntimeException {
    public SessionNotCompletedException() { super("Results can only be reported for completed sessions"); }
}
