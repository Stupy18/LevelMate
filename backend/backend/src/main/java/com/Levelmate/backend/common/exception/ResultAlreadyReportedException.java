package com.Levelmate.backend.common.exception;

public class ResultAlreadyReportedException extends RuntimeException {
    public ResultAlreadyReportedException() { super("A result has already been reported for this session"); }
}
