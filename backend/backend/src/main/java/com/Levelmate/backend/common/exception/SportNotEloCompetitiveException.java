package com.Levelmate.backend.common.exception;

public class SportNotEloCompetitiveException extends RuntimeException {
    public SportNotEloCompetitiveException() { super("Results can only be reported for ELO_COMPETITIVE sports"); }
}
