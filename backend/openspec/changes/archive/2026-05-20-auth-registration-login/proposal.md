## Why

LevelMate has no user identity layer yet — every endpoint is wide open and no user context exists. Registration and login are the foundational prerequisite for all future protected features (game sessions, ELO tracking, coach profiles). Build it now before any other domain code takes a dependency on an assumed user model.

## What Changes

- Add `auth` module at `com.levelmate.backend.auth` with registration, login, and token-refresh endpoints
- Add Flyway migrations creating `users` and `refresh_tokens` tables (UUID PKs, `created_at`/`updated_at`, BCrypt password hash, hashed refresh token)
- Add `jjwt` library and `flyway-core` to `pom.xml`
- Configure Spring Security: stateless session, JWT filter on protected routes, `/api/v1/auth/**` public
- Passwords hashed with BCrypt strength 12; refresh tokens stored as SHA-256 hash with rotation on every use
- Access token TTL: 15 min; refresh token TTL: 30 days

## Capabilities

### New Capabilities

- `auth-registration`: Register a new user account with email + password; returns access token + refresh token pair
- `auth-login`: Authenticate with email + password; returns access token + refresh token pair with refresh-token rotation

### Modified Capabilities

<!-- none — openspec/specs/ is empty -->

## Impact

- **pom.xml**: add `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson` (0.12.x) and `org.flywaydb:flyway-core`
- **DB**: two new tables (`users`, `refresh_tokens`) via Flyway `V1__` and `V2__` migrations
- **Security**: replaces default Spring Security auto-config with a custom `SecurityFilterChain` + `JwtAuthenticationFilter`
- **New packages**: `auth.controller`, `auth.service`, `auth.repository`, `auth.entity`, `auth.dto`, `auth.security`
- **application.yaml**: JWT secret and expiry properties, datasource config
