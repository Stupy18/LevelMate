package com.Levelmate.backend.common;

import com.Levelmate.backend.common.exception.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("errorCode", "VALIDATION_ERROR", "message", message));
    }

    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ResponseEntity<Map<String, String>> handleEmailAlreadyInUse(EmailAlreadyInUseException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "EMAIL_ALREADY_IN_USE", "message", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("errorCode", "INVALID_CREDENTIALS", "message", "Invalid email or password"));
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("errorCode", ex.getErrorCode(), "message", ex.getMessage()));
    }

    @ExceptionHandler(SportNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleSportNotFound(SportNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "SPORT_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(SportAlreadyAddedException.class)
    public ResponseEntity<Map<String, String>> handleSportAlreadyAdded(SportAlreadyAddedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "SPORT_ALREADY_ADDED", "message", ex.getMessage()));
    }

    @ExceptionHandler(UserSportNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserSportNotFound(UserSportNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "USER_SPORT_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(CoachProfileAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleCoachProfileAlreadyExists(CoachProfileAlreadyExistsException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "COACH_PROFILE_ALREADY_EXISTS", "message", ex.getMessage()));
    }

    @ExceptionHandler(CoachProfileNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleCoachProfileNotFound(CoachProfileNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "COACH_PROFILE_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(SportNotInProfileException.class)
    public ResponseEntity<Map<String, String>> handleSportNotInProfile(SportNotInProfileException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("errorCode", "SPORT_NOT_IN_PROFILE", "message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidSportRatingTypeException.class)
    public ResponseEntity<Map<String, String>> handleInvalidSportRatingType(InvalidSportRatingTypeException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("errorCode", "INVALID_SPORT_RATING_TYPE", "message", ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("errorCode", "FORBIDDEN", "message", ex.getMessage()));
    }

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleSessionNotFound(SessionNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "SESSION_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(SportNotOnProfileException.class)
    public ResponseEntity<Map<String, String>> handleSportNotOnProfile(SportNotOnProfileException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("errorCode", "SPORT_NOT_ON_PROFILE", "message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidScheduledDateException.class)
    public ResponseEntity<Map<String, String>> handleInvalidScheduledDate(InvalidScheduledDateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("errorCode", "INVALID_SCHEDULED_DATE", "message", ex.getMessage()));
    }

    @ExceptionHandler(SessionFullException.class)
    public ResponseEntity<Map<String, String>> handleSessionFull(SessionFullException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "SESSION_FULL", "message", ex.getMessage()));
    }

    @ExceptionHandler(AlreadyJoinedException.class)
    public ResponseEntity<Map<String, String>> handleAlreadyJoined(AlreadyJoinedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "ALREADY_JOINED", "message", ex.getMessage()));
    }

    @ExceptionHandler(LevelOutOfRangeException.class)
    public ResponseEntity<Map<String, String>> handleLevelOutOfRange(LevelOutOfRangeException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("errorCode", "LEVEL_OUT_OF_RANGE", "message", ex.getMessage()));
    }

    @ExceptionHandler(HostCannotLeaveException.class)
    public ResponseEntity<Map<String, String>> handleHostCannotLeave(HostCannotLeaveException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("errorCode", "HOST_CANNOT_LEAVE", "message", ex.getMessage()));
    }

    @ExceptionHandler(NotAParticipantException.class)
    public ResponseEntity<Map<String, String>> handleNotAParticipant(NotAParticipantException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "NOT_A_PARTICIPANT", "message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidStatusTransitionException.class)
    public ResponseEntity<Map<String, String>> handleInvalidStatusTransition(InvalidStatusTransitionException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "INVALID_STATUS_TRANSITION", "message", ex.getMessage()));
    }

    @ExceptionHandler(SessionNotYetPlayedException.class)
    public ResponseEntity<Map<String, String>> handleSessionNotYetPlayed(SessionNotYetPlayedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "SESSION_NOT_YET_PLAYED", "message", ex.getMessage()));
    }

    @ExceptionHandler(SessionNotOpenException.class)
    public ResponseEntity<Map<String, String>> handleSessionNotOpen(SessionNotOpenException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "SESSION_NOT_OPEN", "message", ex.getMessage()));
    }

    @ExceptionHandler(ResultAlreadyReportedException.class)
    public ResponseEntity<Map<String, String>> handleResultAlreadyReported(ResultAlreadyReportedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "RESULT_ALREADY_REPORTED", "message", ex.getMessage()));
    }

    @ExceptionHandler(SessionNotCompletedException.class)
    public ResponseEntity<Map<String, String>> handleSessionNotCompleted(SessionNotCompletedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "SESSION_NOT_COMPLETED", "message", ex.getMessage()));
    }

    @ExceptionHandler(SportNotEloCompetitiveException.class)
    public ResponseEntity<Map<String, String>> handleSportNotEloCompetitive(SportNotEloCompetitiveException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("errorCode", "SPORT_NOT_ELO_COMPETITIVE", "message", ex.getMessage()));
    }

    @ExceptionHandler(ResultNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleResultNotFound(ResultNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "RESULT_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(InvalidResultStatusException.class)
    public ResponseEntity<Map<String, String>> handleInvalidResultStatus(InvalidResultStatusException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "INVALID_RESULT_STATUS", "message", ex.getMessage()));
    }

    @ExceptionHandler(CannotConfirmOwnReportException.class)
    public ResponseEntity<Map<String, String>> handleCannotConfirmOwnReport(CannotConfirmOwnReportException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("errorCode", "CANNOT_CONFIRM_OWN_REPORT", "message", ex.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("errorCode", "USER_NOT_FOUND", "message", ex.getMessage()));
    }

    @ExceptionHandler(LevelCapExceededException.class)
    public ResponseEntity<Map<String, String>> handleLevelCapExceeded(LevelCapExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("errorCode", "LEVEL_CAP_EXCEEDED", "message", ex.getMessage()));
    }

    @ExceptionHandler(LevelLockedException.class)
    public ResponseEntity<Map<String, String>> handleLevelLocked(LevelLockedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("errorCode", "LEVEL_LOCKED_ACTIVE_SESSION", "message", ex.getMessage()));
    }

    @ExceptionHandler(TeamsNotBalancedException.class)
    public ResponseEntity<Map<String, String>> handleTeamsNotBalanced(TeamsNotBalancedException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("errorCode", "TEAMS_NOT_BALANCED", "message", ex.getMessage()));
    }

    @ExceptionHandler(TimeConflictException.class)
    public ResponseEntity<Map<String, Object>> handleTimeConflict(TimeConflictException ex) {
        Map<String, Object> conflictingSession = new LinkedHashMap<>();
        conflictingSession.put("id", ex.getConflictingSessionId());
        conflictingSession.put("title", ex.getConflictingSessionTitle());
        conflictingSession.put("scheduledAt", ex.getConflictingScheduledAt().toString());
        conflictingSession.put("durationMinutes", ex.getConflictingDurationMinutes());
        conflictingSession.put("sportName", ex.getConflictingSportName());
        conflictingSession.put("locationName", ex.getConflictingLocationName());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("errorCode", "TIME_CONFLICT");
        body.put("message", ex.getMessage());
        body.put("conflictingSession", conflictingSession);

        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}
