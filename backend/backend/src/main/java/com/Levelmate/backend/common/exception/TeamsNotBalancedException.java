package com.Levelmate.backend.common.exception;

public class TeamsNotBalancedException extends RuntimeException {
    public TeamsNotBalancedException() {
        super("Both teams must have at least one player before a result can be submitted.");
    }
}
