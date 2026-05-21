package com.Levelmate.backend.common.exception;

public class ResultNotFoundException extends RuntimeException {
    public ResultNotFoundException() { super("No result found for this session"); }
}
