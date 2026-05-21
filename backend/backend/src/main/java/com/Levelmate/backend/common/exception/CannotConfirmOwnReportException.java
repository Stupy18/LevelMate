package com.Levelmate.backend.common.exception;

public class CannotConfirmOwnReportException extends RuntimeException {
    public CannotConfirmOwnReportException() { super("You cannot confirm or dispute your own report"); }
}
