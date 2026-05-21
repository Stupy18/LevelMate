# elo-history Specification

## Purpose
Record every ELO change for auditability and profile display. Expose a paginated
endpoint for users to review their own rating history per sport.

## Requirements

### Requirement: ELO change recorded per participant per session
The system SHALL create one elo_history record for each participant whose ELO is updated after a confirmed game result.

#### Scenario: History record created on successful recalculation
- **WHEN** ELO recalculation completes successfully for a session
- **THEN** one elo_history record exists per participant containing: user_id, sport_id, session_id, elo_before, elo_delta, elo_after, recorded_at
- **AND** elo_before + elo_delta = elo_after (accounting for the floor, elo_after = max(100, elo_before + elo_delta))

#### Scenario: No history records on skipped session
- **WHEN** ELO recalculation is skipped (missing team, non-ELO sport, empty team)
- **THEN** no elo_history records are created for that session

### Requirement: User can retrieve their ELO history for a sport
The system SHALL allow an authenticated user to retrieve their paginated ELO history for a specific sport.

#### Scenario: Successful retrieval with history
- **WHEN** an authenticated user sends GET /api/v1/users/{userId}/sports/{sportId}/elo-history
- **THEN** the system returns HTTP 200 with currentElo, gamesPlayed, and a paginated history array ordered by recorded_at descending
- **AND** each history entry contains sessionId, eloBefore, eloDelta, eloAfter, recordedAt

#### Scenario: Empty history
- **WHEN** an authenticated user sends GET /api/v1/users/{userId}/sports/{sportId}/elo-history
- **AND** no ELO history exists for that user+sport combination
- **THEN** the system returns HTTP 200 with an empty history array and currentElo equal to the user's current elo_rating

#### Scenario: Sport not ELO_COMPETITIVE
- **WHEN** an authenticated user sends GET /api/v1/users/{userId}/sports/{sportId}/elo-history
- **AND** the sport's ratingType is not ELO_COMPETITIVE
- **THEN** the system returns HTTP 422 with errorCode SPORT_NOT_ELO_COMPETITIVE

#### Scenario: Forbidden for other user
- **WHEN** an authenticated user sends GET /api/v1/users/{otherUserId}/sports/{sportId}/elo-history
- **AND** the JWT subject does not match otherUserId
- **THEN** the system returns HTTP 403 with errorCode FORBIDDEN
