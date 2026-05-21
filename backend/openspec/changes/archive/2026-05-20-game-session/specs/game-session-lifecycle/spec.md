## ADDED Requirements

### Requirement: Authenticated user can create a game session
The system SHALL allow an authenticated user to create a game session for a sport. The sport MUST exist in the system. The creator is automatically added as a participant with role HOST. The session SHALL be created with status OPEN.

#### Scenario: Successful creation
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions` with a valid `sportId`, a future `scheduledAt`, `minPlayers` >= 2, `maxPlayers` >= `minPlayers`, and at least one location field
- **THEN** the system returns HTTP 201 with the full session object including a `participants` array containing the creator as HOST

#### Scenario: Sport not on creator's profile rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions` with a `sportId` that does not exist in their `user_sports` entries
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "SPORT_NOT_ON_PROFILE", "message": "..." }`

#### Scenario: Past scheduled date rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions` with a `scheduledAt` that is not in the future
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "INVALID_SCHEDULED_DATE", "message": "..." }`

#### Scenario: Missing required fields rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/game-sessions` with `sportId`, `scheduledAt`, `minPlayers`, or `maxPlayers` absent or invalid
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Any authenticated user can retrieve a specific game session
The system SHALL allow any authenticated user to fetch the full detail of a game session by its ID, including all participants.

#### Scenario: Successful retrieval
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions/{sessionId}`
- **THEN** the system returns HTTP 200 with the session object including `participants`

#### Scenario: Non-existent session rejected
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions/{sessionId}` for a session that does not exist
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "SESSION_NOT_FOUND", "message": "..." }`

### Requirement: Any authenticated user can search for open game sessions
The system SHALL allow authenticated users to discover OPEN sessions filtered by sport, location radius, and skill level range. Results SHALL be paginated and ordered by `scheduled_at` ascending.

#### Scenario: Search by sport
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions?sportId={id}`
- **THEN** the system returns HTTP 200 with a paginated list of OPEN sessions for that sport, each including participant count and remaining spots

#### Scenario: Search with location radius
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions?sportId={id}&lat={lat}&lng={lng}&radiusKm={r}`
- **THEN** the system returns only OPEN sessions whose `location_lat`/`location_lng` fall within the bounding box defined by the radius

#### Scenario: Search with level filter
- **WHEN** an authenticated user sends a GET to `/api/v1/game-sessions?sportId={id}&minLevel={min}&maxLevel={max}`
- **THEN** the system returns only OPEN sessions whose level range overlaps with the requested range

#### Scenario: Empty result set
- **WHEN** no OPEN sessions match the filters
- **THEN** the system returns HTTP 200 with an empty `content` array

### Requirement: Host can cancel a game session
The system SHALL allow the HOST of an OPEN or FULL session to cancel it, setting its status to CANCELLED.

#### Scenario: Successful cancellation
- **WHEN** the HOST sends a PATCH to `/api/v1/game-sessions/{sessionId}/status` with body `{ "status": "CANCELLED" }`
- **THEN** the system returns HTTP 200 with the updated session showing `status: "CANCELLED"`

#### Scenario: Non-host cancel rejected
- **WHEN** a non-HOST participant sends a PATCH to cancel a session
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`

#### Scenario: Cancelling already-cancelled or completed session rejected
- **WHEN** the HOST sends a PATCH to cancel a session with status CANCELLED or COMPLETED
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "INVALID_STATUS_TRANSITION", "message": "..." }`

### Requirement: Host can mark a session as completed
The system SHALL allow the HOST to mark an OPEN or FULL session as COMPLETED. The session's `scheduled_at` MUST be in the past.

#### Scenario: Successful completion
- **WHEN** the HOST sends a PATCH to `/api/v1/game-sessions/{sessionId}/status` with body `{ "status": "COMPLETED" }` and the session's `scheduled_at` is in the past
- **THEN** the system returns HTTP 200 with the updated session showing `status: "COMPLETED"`

#### Scenario: Completing a future session rejected
- **WHEN** the HOST sends a PATCH to mark a session COMPLETED but `scheduled_at` is still in the future
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SESSION_NOT_YET_PLAYED", "message": "..." }`

#### Scenario: Non-host complete rejected
- **WHEN** a non-HOST participant sends a PATCH to complete a session
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`
