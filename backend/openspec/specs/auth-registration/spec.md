### Requirement: User can register a new account
The system SHALL allow a new user to create an account by providing a unique email address, a password, a first name, and a last name. On success the system SHALL return an HTTP 201 response containing an access token and a refresh token so the user is immediately authenticated without a separate login step.

#### Scenario: Successful registration
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a valid, previously unused email and a password of at least 8 characters
- **THEN** the system creates a new user record with the password stored as a BCrypt hash (strength 12), returns HTTP 201, and the response body contains `accessToken`, `refreshToken`, `tokenType: "Bearer"`, and `expiresIn: 900`

#### Scenario: Duplicate email rejected
- **WHEN** a POST request is sent to `/api/v1/auth/register` with an email address that already exists in the `users` table
- **THEN** the system returns HTTP 409 with body `{ "errorCode": "EMAIL_ALREADY_IN_USE", "message": "..." }` and does NOT create a new user record

#### Scenario: Invalid email format rejected
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a malformed email address (e.g. missing `@`, missing domain)
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }` and does NOT create a new user record

#### Scenario: Weak password rejected
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a password shorter than 8 characters
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }` and does NOT create a new user record

#### Scenario: Missing required field rejected
- **WHEN** a POST request is sent to `/api/v1/auth/register` with one or more of `email`, `password`, `firstName`, or `lastName` absent or blank
- **THEN** the system returns HTTP 400 with body `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`

### Requirement: Registration endpoint is publicly accessible
The system SHALL NOT require an `Authorization` header to call `POST /api/v1/auth/register`. Spring Security SHALL permit this path without authentication.

#### Scenario: Unauthenticated request succeeds
- **WHEN** a POST request is sent to `/api/v1/auth/register` without any `Authorization` header
- **THEN** the system processes the request normally (succeeding or failing based on payload validity, not auth status)
