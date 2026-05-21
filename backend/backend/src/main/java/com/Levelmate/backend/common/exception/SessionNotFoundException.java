package com.Levelmate.backend.common.exception;

public class SessionNotFoundException extends RuntimeException {
    public SessionNotFoundException() { super("Game session not found"); }
}
