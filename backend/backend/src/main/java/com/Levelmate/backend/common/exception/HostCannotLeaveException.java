package com.Levelmate.backend.common.exception;

public class HostCannotLeaveException extends RuntimeException {
    public HostCannotLeaveException() { super("The host cannot leave a session; cancel it instead"); }
}
