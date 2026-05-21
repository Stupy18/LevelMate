package com.Levelmate.backend.common.exception;

public class CoachProfileAlreadyExistsException extends RuntimeException {
    public CoachProfileAlreadyExistsException() {
        super("Coach profile already exists for this sport");
    }
}
