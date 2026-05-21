package com.Levelmate.backend.common.exception;

public class SportNotOnProfileException extends RuntimeException {
    public SportNotOnProfileException() { super("You must add this sport to your profile before creating a session"); }
}
