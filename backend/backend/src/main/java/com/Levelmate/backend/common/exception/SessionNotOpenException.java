package com.Levelmate.backend.common.exception;

public class SessionNotOpenException extends RuntimeException {
    public SessionNotOpenException() { super("Session is not open for this action"); }
}
