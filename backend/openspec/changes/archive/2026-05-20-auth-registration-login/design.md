## Context

The application has Spring Security on the classpath but no configuration — it falls back to a generated password and blocks all requests. The goal is to replace that with a stateless JWT-based security chain, two auth endpoints (register, login), a token-refresh endpoint, and the underlying Flyway-managed schema. Stack: Spring Boot 4.0.6, Spring Security 6.x (Jakarta namespace), Java 21, PostgreSQL, jjwt 0.12.x, Flyway.

## Goals / Non-Goals

**Goals:**
- `POST /api/v1/auth/register` — create account, return token pair
- `POST /api/v1/auth/login` — authenticate, return token pair
- `POST /api/v1/auth/refresh` — rotate refresh token, return new token pair
- Stateless JWT access tokens (15 min); refresh tokens stored as SHA-256 hash (30 days, rotated)
- BCrypt strength 12 for password hashing
- Flyway migrations for `users` and `refresh_tokens` tables

**Non-Goals:**
- OAuth2 / social login
- Email verification or password-reset flow
- Role-based access control beyond a baseline `USER` role placeholder
- Rate limiting or brute-force protection (future)

## Decisions

### 1 — jjwt 0.12.x over spring-security-oauth2-resource-server
`spring-security-oauth2-resource-server` adds significant surface area (opaque token introspection, JWKS rotation, issuer validation) that is unnecessary for a single-service monolith with symmetric HS256 keys. jjwt gives explicit control over token construction and parsing with minimal footprint. The 0.12.x API (`Jwts.builder()` / `Jwts.parser()`) is significantly cleaner than 0.11.x — use it directly, not the deprecated old API.

### 2 — SHA-256 hash for stored refresh tokens
Raw refresh tokens must never be readable from a database dump. The token is generated as a secure random UUID (or `SecureRandom` 256-bit hex), returned once to the client, and stored only as `SHA-256(token)`. On each refresh request the incoming token is hashed and compared. This means a stolen DB snapshot cannot be used to forge refresh tokens.

### 3 — Flyway over Hibernate `ddl-auto`
`ddl-auto: create` or `update` is non-deterministic in production. Flyway provides versioned, auditable, reversible migrations. Naming: `V1__create_users_table.sql`, `V2__create_refresh_tokens_table.sql`.

### 4 — One `SecurityFilterChain` bean, no `WebSecurityConfigurerAdapter`
Spring Security 6 dropped `WebSecurityConfigurerAdapter`. The configuration is a single `@Bean SecurityFilterChain` that:
- Sets session management to `STATELESS`
- Permits `/api/v1/auth/**` without authentication
- Requires authentication on all other routes
- Adds `JwtAuthenticationFilter extends OncePerRequestFilter` before `UsernamePasswordAuthenticationFilter`

### 5 — JWT secret sourced from `application.yaml` (not hardcoded)
`app.jwt.secret` must be Base64-encoded and ≥ 32 bytes (256 bits) to satisfy HS256 minimum. Validated at startup via `@PostConstruct` in `JwtService`. The secret is injected via `@Value` — never committed in plaintext; in production it is provided via environment variable override.

### 6 — `UserDetailsService` backed by `UserRepository`
Spring Security's `AuthenticationManager` is wired to a `UserDetailsService` that loads by email. This keeps the auth flow standard and allows future integration with method-level security (`@PreAuthorize`) without changes to the token layer.

## Risks / Trade-offs

- **jjwt 0.12.x breaking API** → Use `Jwts.SIG.HS256` and `Jwts.parser().verifyWith(key)` — do not use deprecated 0.11.x style. Pin the version explicitly in pom.xml.
- **JWT secret length** → A secret shorter than 256 bits throws `WeakKeyException` at runtime. Enforce minimum entropy in `JwtService` initialization.
- **Refresh token clock skew** → Expiry is stored as a DB timestamp; comparison is `now() > expires_at`. No clock-skew tolerance needed for server-side comparison.
- **Single-use refresh token window** → There is a small window where a client retries a refresh request after a network failure, presenting an already-rotated token. Mitigation: the old token is immediately deleted on first use; client should handle `401` by redirecting to login.
- **Spring Boot 4.0.6 test starters** → The pom.xml test dependencies are non-standard (`spring-boot-starter-*-test` don't exist). These will need to be replaced with `spring-boot-starter-test` + `spring-security-test` before integration tests can be written.

## Migration Plan

1. Add jjwt (api + impl + jackson, 0.12.6) and `flyway-core` + `flyway-database-postgresql` to pom.xml
2. Run `V1__create_users_table.sql` and `V2__create_refresh_tokens_table.sql` via Flyway on startup
3. No existing data to migrate — greenfield schema
4. Rollback: `V1` and `V2` are additive; rollback requires manual `DROP TABLE` (Flyway Community doesn't support undo migrations)

## Open Questions

- **JWT secret rotation**: No key-rotation strategy defined. For now, a single symmetric key is acceptable. Document that rotating the secret invalidates all active access tokens immediately.
- **Logout / token revocation**: Access tokens are not revocable (stateless). A blocklist (Redis) can be added later. For now, refresh token deletion on the server side is the only revocation mechanism.
