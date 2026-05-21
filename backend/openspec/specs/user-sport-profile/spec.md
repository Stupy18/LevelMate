### Requirement: Authenticated user can add a sport to their profile
The system SHALL allow an authenticated user to associate a sport with their profile by providing the sport ID and the appropriate rating value for that sport's rating type.

#### Scenario: Successful sport addition — ELO_COMPETITIVE
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` with `sportId` of an ELO_COMPETITIVE sport and an `eloRating` integer
- **THEN** the system returns HTTP 201 with the created `userSportId`, `sportId`, `sportName`, `ratingType`, and `eloRating`

#### Scenario: Successful sport addition — GRADE_BASED
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` with `sportId` of a GRADE_BASED sport and a `grade` string
- **THEN** the system returns HTTP 201 with `userSportId`, `sportId`, `sportName`, `ratingType`, and `grade`

#### Scenario: Successful sport addition — PERFORMANCE_BASED
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` with `sportId` of a PERFORMANCE_BASED sport
- **THEN** the system returns HTTP 201 with `userSportId`, `sportId`, `sportName`, `ratingType` (no rating value required at creation)

#### Scenario: Unknown sport rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` with a `sportId` that does not exist in the `sports` table
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "SPORT_NOT_FOUND", "message": "..." }`

#### Scenario: Duplicate sport rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` with a `sportId` they already have in their profile
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "SPORT_ALREADY_ADDED", "message": "..." }`

#### Scenario: Missing sportId rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports` without a `sportId` field
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Authenticated user can view their sport profile
The system SHALL allow an authenticated user to retrieve all sports associated with their profile.

#### Scenario: Successful sport list retrieval
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports`
- **THEN** the system returns HTTP 200 with a JSON array of the user's sport entries

#### Scenario: Empty list returned for user with no sports
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports` and has no sports added
- **THEN** the system returns HTTP 200 with an empty array

### Requirement: Authenticated user can update their sport rating
The system SHALL allow an authenticated user to update the rating value for a sport already in their profile.

#### Scenario: Successful ELO rating update
- **WHEN** an authenticated user sends a PUT to `/api/v1/users/{userId}/sports/{sportId}` with a new `eloRating`
- **THEN** the system returns HTTP 200 with the updated sport entry

#### Scenario: Sport not in profile rejected
- **WHEN** an authenticated user sends a PUT to `/api/v1/users/{userId}/sports/{sportId}` for a sport not in their profile
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "USER_SPORT_NOT_FOUND", "message": "..." }`

### Requirement: Authenticated user can remove a sport from their profile
The system SHALL allow an authenticated user to permanently remove a sport from their profile.

#### Scenario: Successful sport removal
- **WHEN** an authenticated user sends a DELETE to `/api/v1/users/{userId}/sports/{sportId}`
- **THEN** the system returns HTTP 204 and the sport entry no longer appears in the user's profile

#### Scenario: Non-existent entry removal rejected
- **WHEN** an authenticated user sends a DELETE to `/api/v1/users/{userId}/sports/{sportId}` for a sport not in their profile
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "USER_SPORT_NOT_FOUND", "message": "..." }`

### Requirement: User sport endpoints enforce ownership
The system SHALL reject requests where the `userId` path parameter does not match the authenticated user's UUID.

#### Scenario: Other user's profile write rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{otherUserId}/sports` where `otherUserId` is not their own UUID
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`

#### Scenario: Other user's profile read rejected
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{otherUserId}/sports` where `otherUserId` is not their own UUID
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`
