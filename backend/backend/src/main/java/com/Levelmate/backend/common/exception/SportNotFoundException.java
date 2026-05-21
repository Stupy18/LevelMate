package com.Levelmate.backend.common.exception;

public class SportNotFoundException extends RuntimeException {
    public SportNotFoundException() {
        super("Sport not found");
    }
}
