package com.Levelmate.backend.common.exception;

public class CoachProfileNotFoundException extends RuntimeException {
    public CoachProfileNotFoundException() {
        super("Coach profile not found");
    }
}
