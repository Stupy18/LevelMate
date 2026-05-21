package com.Levelmate.backend.common.exception;

public class AlreadyJoinedException extends RuntimeException {
    public AlreadyJoinedException() { super("You are already a participant in this session"); }
}
