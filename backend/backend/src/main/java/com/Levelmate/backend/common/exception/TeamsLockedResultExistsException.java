package com.Levelmate.backend.common.exception;

public class TeamsLockedResultExistsException extends RuntimeException {
    public TeamsLockedResultExistsException() {
        super("Teams cannot change after a result has been reported.");
    }
}
