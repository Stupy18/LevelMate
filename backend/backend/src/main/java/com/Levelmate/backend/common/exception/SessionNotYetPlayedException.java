package com.Levelmate.backend.common.exception;

public class SessionNotYetPlayedException extends RuntimeException {
    public SessionNotYetPlayedException() { super("Cannot mark session as completed before its scheduled time"); }
}
