package com.Levelmate.backend.common.exception;

public class SportNotInProfileException extends RuntimeException {
    public SportNotInProfileException() {
        super("You must add this sport to your profile first");
    }
}
