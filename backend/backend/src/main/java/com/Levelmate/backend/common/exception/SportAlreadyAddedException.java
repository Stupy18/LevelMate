package com.Levelmate.backend.common.exception;

public class SportAlreadyAddedException extends RuntimeException {
    public SportAlreadyAddedException() {
        super("Sport is already in your profile");
    }
}
