package com.Levelmate.backend.common.exception;

public class InvalidRefreshTokenException extends RuntimeException {

    private final String errorCode;

    public InvalidRefreshTokenException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
