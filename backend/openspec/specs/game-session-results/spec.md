# game-session-results Specification

## Purpose
Allow participants of a completed ELO_COMPETITIVE session to report, confirm, or dispute the result. Confirmed results trigger ELO rating updates.

## Requirements

### Requirement: Participant can report the result of a completed ELO_COMPETITIVE session
The system SHALL allow any participant of a COMPLETED session, whose sport has `ratingType = ELO_COMPETITIVE`, to report the game result. Only one result report per session is permitted.

#### Scenario: Successful first result report
- **WHEN** a participant sends a POST to `/api/v1/game-sessions/{sessionId}/result` with `winnerTeam` and optional scores
- **AND** the session is COMPLETED, the sport is ELO_COMPETITIVE, and no result has been reported yet
- **THEN** the system returns HTTP 201 with a `game_results` object having `status: "PENDING_CONFIRMATION"` and `reportedByUserId` set to the caller

#### Scenario: Result already reported rejected
- **WHEN** a participant sends a POST to report a result and a result already exists for the session (in any status)
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "RESULT_ALREADY_REPORTED", "message": "..." }`

#### Scenario: Session not completed rejected
- **WHEN** a participant sends a POST to report a result for a session that is not in COMPLETED status
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SESSION_NOT_COMPLETED", "message": "..." }`

#### Scenario: Non-ELO sport result report rejected
- **WHEN** a participant sends a POST to report a result for a session whose sport is not ELO_COMPETITIVE
- **THEN** the system returns HTTP 422 with body `{ "errorCode": "SPORT_NOT_ELO_COMPETITIVE", "message": "..." }`

#### Scenario: Non-participant report rejected
- **WHEN** a user who is not a participant of the session sends a POST to report a result
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`

### Requirement: Opposing participant can confirm a reported result
The system SHALL allow a participant who did NOT report the result (i.e., is on the opposing side) to confirm it, transitioning the result to CONFIRMED. Upon confirmation the system SHALL call the ELO stub.

#### Scenario: Successful confirmation
- **WHEN** a participant (not the reporter) sends a POST to `/api/v1/game-sessions/{sessionId}/result/confirm`
- **AND** the result has status PENDING_CONFIRMATION
- **THEN** the system returns HTTP 200 with the updated result showing `status: "CONFIRMED"` and `confirmedByUserId` and `confirmedAt` set; ELO stub is called

#### Scenario: Reporter cannot confirm own report
- **WHEN** the same user who reported the result sends a POST to confirm it
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "CANNOT_CONFIRM_OWN_REPORT", "message": "..." }`

#### Scenario: Non-PENDING_CONFIRMATION result confirm rejected
- **WHEN** a participant sends a POST to confirm a result that is already CONFIRMED or DISPUTED
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "INVALID_RESULT_STATUS", "message": "..." }`

#### Scenario: No result to confirm
- **WHEN** a participant sends a POST to confirm a result but no result has been reported yet
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "RESULT_NOT_FOUND", "message": "..." }`

### Requirement: Opposing participant can dispute a reported result
The system SHALL allow a participant who did NOT report the result to dispute it, transitioning the result to DISPUTED for future manual review.

#### Scenario: Successful dispute
- **WHEN** a participant (not the reporter) sends a POST to `/api/v1/game-sessions/{sessionId}/result/dispute`
- **AND** the result has status PENDING_CONFIRMATION
- **THEN** the system returns HTTP 200 with the updated result showing `status: "DISPUTED"`

#### Scenario: Reporter cannot dispute own report
- **WHEN** the same user who reported the result sends a POST to dispute it
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "CANNOT_DISPUTE_OWN_REPORT", "message": "..." }`

#### Scenario: Non-PENDING_CONFIRMATION result dispute rejected
- **WHEN** a participant sends a POST to dispute a result that is already CONFIRMED or DISPUTED
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "INVALID_RESULT_STATUS", "message": "..." }`

### Requirement: Participant can view the result of a session
The system SHALL allow any participant to retrieve the current result record for a session.

#### Scenario: Successful result retrieval
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions/{sessionId}/result`
- **THEN** the system returns HTTP 200 with the `game_results` object

#### Scenario: No result yet
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions/{sessionId}/result` and no result has been reported yet
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "RESULT_NOT_FOUND", "message": "..." }`
