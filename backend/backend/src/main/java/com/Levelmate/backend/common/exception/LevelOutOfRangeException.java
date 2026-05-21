package com.Levelmate.backend.common.exception;

public class LevelOutOfRangeException extends RuntimeException {
    public LevelOutOfRangeException() { super("Your sport level does not meet the session's requirements"); }
}
