### Requirement: Authenticated user can create a coach profile for a sport
The system SHALL allow an authenticated user to create a coach profile for a sport, indicating they offer coaching for that sport. The sport MUST already be in the user's sport profile.

#### Scenario: Successful coach profile creation
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` with a `description` and optional `hourlyRateCents`
- **THEN** the system returns HTTP 201 with `coachProfileId`, `sportId`, `sportName`, `description`, and `hourlyRateCents`

#### Scenario: Sport not in user profile rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` for a sport not in their user_sports entries
- **THEN** the system returns HTTP 422 with body `{ "errorCode": "SPORT_NOT_IN_PROFILE", "message": "..." }`

#### Scenario: Duplicate coach profile rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` when a coach profile already exists for that user+sport
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "COACH_PROFILE_ALREADY_EXISTS", "message": "..." }`

#### Scenario: Missing description rejected
- **WHEN** an authenticated user sends a POST to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` without a `description` field or with a blank value
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Authenticated user can retrieve their coach profile for a sport
The system SHALL allow an authenticated user to retrieve their existing coach profile for a specific sport.

#### Scenario: Successful coach profile retrieval
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports/{sportId}/coach-profile`
- **THEN** the system returns HTTP 200 with `coachProfileId`, `sportId`, `sportName`, `description`, and `hourlyRateCents`

#### Scenario: Non-existent coach profile rejected
- **WHEN** an authenticated user sends a GET to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` and no coach profile exists for that user+sport
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "COACH_PROFILE_NOT_FOUND", "message": "..." }`

### Requirement: Authenticated user can update their coach profile
The system SHALL allow an authenticated user to update the description and hourly rate of an existing coach profile.

#### Scenario: Successful update
- **WHEN** an authenticated user sends a PUT to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` with updated `description` and/or `hourlyRateCents`
- **THEN** the system returns HTTP 200 with the updated coach profile

#### Scenario: Non-existent profile update rejected
- **WHEN** an authenticated user sends a PUT to `/api/v1/users/{userId}/sports/{sportId}/coach-profile` and no coach profile exists
- **THEN** the system returns HTTP 404 with body `{ "errorCode": "COACH_PROFILE_NOT_FOUND", "message": "..." }`

### Requirement: Coach profile endpoints enforce ownership
The system SHALL reject write requests where the `userId` path parameter does not match the authenticated user's UUID.

#### Scenario: Other user's coach profile write rejected
- **WHEN** an authenticated user sends a POST or PUT to `/api/v1/users/{otherUserId}/sports/{sportId}/coach-profile` where `otherUserId` is not their own UUID
- **THEN** the system returns HTTP 403 with body `{ "errorCode": "FORBIDDEN", "message": "..." }`
