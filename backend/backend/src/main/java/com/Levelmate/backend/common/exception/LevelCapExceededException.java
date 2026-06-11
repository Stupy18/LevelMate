package com.Levelmate.backend.common.exception;

public class LevelCapExceededException extends RuntimeException {
    public LevelCapExceededException(int hostLevel) {
        super("Session max level cannot exceed " + (hostLevel + 3) + " (host level " + hostLevel + " + 3)");
    }
}
