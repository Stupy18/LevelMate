### Requirement: Authenticated user can record a personal best for a PERFORMANCE_BASED sport
The system SHALL allow an authenticated user to record a personal-best time for a specific distance in a PERFORMANCE_BASED sport. One PB per user/sport/distance is stored; submitting a new time for the same distance overwrites the existing PB.

#### Scenario: Successful PB creation
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/pbs` with `distanceMeters` (integer, > 0) and `timeSeconds` (integer, > 0)
- **THEN** the system returns HTTP 201 with `pbId`, `sportId`, `distanceMeters`, `timeSeconds`, and `recordedAt`

#### Scenario: PB upsert — existing PB for same distance updated
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/pbs` with a `distanceMeters` for which a PB already exists
- **THEN** the system returns HTTP 200 with the updated record (new `timeSeconds` and `recordedAt`)

#### Scenario: Non-PERFORMANCE_BASED sport rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/pbs` where the sport's `ratingType` is not PERFORMANCE_BASED
- **THEN** the system returns HTTP 422 with body `{ "errorCode": "INVALID_SPORT_RATING_TYPE", "message": "..." }`

#### Scenario: Sport not in user profile rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/pbs` for a sport not in their user_sports entries
- **THEN** the system returns HTTP 422 with body `{ "errorCode": "SPORT_NOT_IN_PROFILE", "message": "..." }`

#### Scenario: Invalid distance or time rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/pbs` with `distanceMeters` <= 0 or `timeSeconds` <= 0, or either field absent
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Authenticated user can retrieve their personal bests for a sport
The system SHALL allow an authenticated user to retrieve all recorded personal bests for a specific PERFORMANCE_BASED sport.

#### Scenario: Successful PB list retrieval
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports/{sportId}/pbs`
- **THEN** the system returns HTTP 200 with a JSON array ordered by `distanceMeters` ascending, each element containing `pbId`, `distanceMeters`, `timeSeconds`, and `recordedAt`

#### Scenario: Empty list for sport with no PBs
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports/{sportId}/pbs` and no PBs are recorded
- **THEN** the system returns HTTP 200 with an empty array

### Requirement: Performance PB endpoints enforce ownership
The system SHALL reject write requests where the `userId` path parameter does not match the authenticated user's UUID.

#### Scenario: Other user's PBs write rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{otherUserId}/sports/{sportId}/pbs` where `otherUserId` is not their own UUID
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`

#### Scenario: Other user's PBs read rejected
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{otherUserId}/sports/{sportId}/pbs` where `otherUserId` is not their own UUID
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`
