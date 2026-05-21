### Requirement: User can log in with email and password
The system SHALL authenticate a registered user by verifying the provided password against the BCrypt hash stored in the `users` table. On success it SHALL return HTTP 200 with a new access token and refresh token pair.

#### Scenario: Successful login
- **WHEN** a POST request is sent to `/api/v1/auth/login` with a valid `email` and matching `password`
- **THEN** the system returns HTTP 200 with body containing `accessToken`, `refreshToken`, `tokenType: "Bearer"`, and `expiresIn: 900`

#### Scenario: Unknown email rejected
- **WHEN** a POST request is sent to `/api/v1/auth/login` with an email that does not exist in the `users` table
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "INVALID_CREDENTIALS", "message": "..." }` and does NOT reveal whether the email exists

#### Scenario: Wrong password rejected
- **WHEN** a POST request is sent to `/api/v1/auth/login` with a valid email but an incorrect password
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "INVALID_CREDENTIALS", "message": "..." }`

#### Scenario: Missing fields rejected
- **WHEN** a POST request is sent to `/api/v1/auth/login` with `email` or `password` absent or blank
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: User can refresh an access token
The system SHALL allow a client holding a valid refresh token to obtain a new access token and a new refresh token without re-entering credentials. The old refresh token SHALL be invalidated immediately upon first use (rotation).

#### Scenario: Successful token refresh
- **WHEN** a POST request is sent to `/api/v1/auth/refresh` with a valid, non-expired `refreshToken`
- **THEN** the system returns HTTP 200 with a new `accessToken`, a new `refreshToken`, `tokenType: "Bearer"`, and `expiresIn: 900`, and the previously used refresh token is deleted from the `refresh_tokens` table

#### Scenario: Expired refresh token rejected
- **WHEN** a POST request is sent to `/api/v1/auth/refresh` with a refresh token whose `expires_at` is in the past
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "REFRESH_TOKEN_EXPIRED", "message": "..." }` and deletes the expired token from the table

#### Scenario: Unknown or already-rotated refresh token rejected
- **WHEN** a POST request is sent to `/api/v1/auth/refresh` with a token that does not match any SHA-256 hash in the `refresh_tokens` table
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "INVALID_REFRESH_TOKEN", "message": "..." }`

#### Scenario: Missing refresh token rejected
- **WHEN** a POST request is sent to `/api/v1/auth/refresh` with the `refreshToken` field absent or blank
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Login and refresh endpoints are publicly accessible
The system SHALL NOT require an `Authorization` header to call `POST /api/v1/auth/login` or `POST /api/v1/auth/refresh`. Spring Security SHALL permit these paths without authentication.

#### Scenario: Unauthenticated login request is processed
- **WHEN** a POST request is sent to `/api/v1/auth/login` without any `Authorization` header
- **THEN** the system processes the request normally based on payload validity

#### Scenario: Unauthenticated refresh request is processed
- **WHEN** a POST request is sent to `/api/v1/auth/refresh` without any `Authorization` header
- **THEN** the system processes the request normally based on payload validity

### Requirement: JWT access token carries user identity
The access token returned by login and registration SHALL be a signed HS256 JWT. Its claims SHALL include the user's UUID as the `sub` (subject) claim and the user's email as an additional `email` claim. No other sensitive data SHALL appear in the token payload.

#### Scenario: Valid token accepted on protected endpoint
- **WHEN** a request is sent to any protected endpoint with `Authorization: Bearer <accessToken>`
- **THEN** the system extracts the user identity from the token and processes the request without hitting the database for authentication

#### Scenario: Expired access token rejected
- **WHEN** a request is sent to any protected endpoint with an access token whose `exp` claim is in the past
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "TOKEN_EXPIRED", "message": "..." }`

#### Scenario: Tampered or invalid token rejected
- **WHEN** a request is sent to any protected endpoint with a JWT whose signature does not verify against the server's HS256 secret
- **THEN** the system returns HTTP 401 with body `{ "errorCode": "INVALID_TOKEN", "message": "..." }`
