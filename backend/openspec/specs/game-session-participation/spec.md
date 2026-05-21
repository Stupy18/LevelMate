# game-session-participation Specification

## Purpose
Allow authenticated users to join and leave game sessions, with enforcement of level-range, capacity, and role constraints.

## Requirements

### Requirement: Authenticated user can join an OPEN game session
The system SHALL allow an authenticated user to join a game session with status OPEN, provided they are not already a participant, their sport level falls within the session's range (if set), and the session has not reached `max_players`.

#### Scenario: Successful join
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions/{sessionId}/join`
- **AND** the session is OPEN, the user is not a participant, and player count < `max_players`
- **THEN** the system returns HTTP 200 with the updated session object, and if the new count equals `max_players` the session status is set to FULL

#### Scenario: Session full rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions/{sessionId}/join` and the session status is FULL
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SESSION_FULL", "message": "..." }`

#### Scenario: Session not open rejected
- **WHEN** an authenticated user sends a POST to join a session whose status is CANCELLED or COMPLETED
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SESSION_NOT_OPEN", "message": "..." }`

#### Scenario: Already a participant rejected
- **WHEN** an authenticated user sends a POST to join a session they are already in
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "ALREADY_JOINED", "message": "..." }`

#### Scenario: Level out of range rejected
- **WHEN** an authenticated user sends a POST to join a session with `min_level`/`max_level` set, and the user's `self_reported_level` for that sport is outside the range
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "LEVEL_OUT_OF_RANGE", "message": "..." }`

#### Scenario: Non-existent session rejected
- **WHEN** an authenticated user sends a POST to join a session that does not exist
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "SESSION_NOT_FOUND", "message": "..." }`

### Requirement: Participant can leave a game session
The system SHALL allow a PLAYER participant (not HOST) to leave a session with status OPEN or FULL. If the session was FULL, leaving SHALL set it back to OPEN.

#### Scenario: Successful leave
- **WHEN** a PLAYER participant sends a POST to `/api/v1/game-sessions/{sessionId}/leave`
- **THEN** the system returns HTTP 204, removes the participant record, and if the session was FULL sets it back to OPEN

#### Scenario: Host cannot leave
- **WHEN** the HOST of a session sends a POST to `/api/v1/game-sessions/{sessionId}/leave`
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "HOST_CANNOT_LEAVE", "message": "..." }`

#### Scenario: Non-participant leave rejected
- **WHEN** a user who is not a participant sends a POST to leave a session
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "NOT_A_PARTICIPANT", "message": "..." }`

#### Scenario: Leave a completed or cancelled session rejected
- **WHEN** a participant sends a POST to leave a session with status COMPLETED or CANCELLED
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SESSION_NOT_OPEN", "message": "..." }`

### Requirement: Participant count is accurately reflected in session responses
The system SHALL include `participantCount` and `spotsRemaining` (= `max_players` - `participantCount`) in every session response object so clients can display availability without a separate request.

#### Scenario: Spot count in session response
- **WHEN** an authenticated user retrieves any session via GET or receives a session object after join/leave
- **THEN** the response includes `participantCount` and `spotsRemaining` computed from the current participant records
