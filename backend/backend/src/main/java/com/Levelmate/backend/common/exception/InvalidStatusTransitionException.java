package com.Levelmate.backend.common.exception;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(String message) { super(message); }
}
