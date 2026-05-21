## 1. Dependencies & Configuration

- [x] 1.1 Add `jjwt-api`, `jjwt-impl`, `jjwt-jackson` (0.12.6) to pom.xml
- [x] 1.2 Add `flyway-core` and `flyway-database-postgresql` to pom.xml
- [x] 1.3 Fix test dependencies: replace non-existent `*-test` starters with `spring-boot-starter-test` and `spring-security-test`
- [x] 1.4 Add datasource, Flyway, and JWT config properties to `application.yaml` (`spring.datasource`, `spring.flyway`, `app.jwt.secret`, `app.jwt.access-token-expiry`, `app.jwt.refresh-token-expiry`)

## 2. Flyway Migrations

- [x] 2.1 Create `V1__create_users_table.sql` with columns: `id UUID PK`, `email VARCHAR(255) UNIQUE NOT NULL`, `password_hash VARCHAR(255) NOT NULL`, `first_name VARCHAR(100) NOT NULL`, `last_name VARCHAR(100) NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- [x] 2.2 Create `V2__create_refresh_tokens_table.sql` with columns: `id UUID PK`, `user_id UUID NOT NULL FK → users(id) ON DELETE CASCADE`, `token_hash VARCHAR(64) NOT NULL UNIQUE`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

## 3. Auth Module Structure

- [x] 3.1 Create package `com.levelmate.backend.auth` and sub-packages: `controller`, `service`, `repository`, `entity`, `dto`, `security`

## 4. Entities & Repositories

- [x] 4.1 Create `User` entity (`@Entity`, `@Table("users")`) mapping all `users` columns; implement `UserDetails` with granted authority `ROLE_USER`
- [x] 4.2 Create `RefreshToken` entity (`@Entity`, `@Table("refresh_tokens")`) mapping all `refresh_tokens` columns with `@ManyToOne` to `User`
- [x] 4.3 Create `UserRepository extends JpaRepository<User, UUID>` with `findByEmail(String email): Optional<User>`
- [x] 4.4 Create `RefreshTokenRepository extends JpaRepository<RefreshToken, UUID>` with `findByTokenHash(String hash): Optional<RefreshToken>` and `deleteByUser(User user)`

## 5. JWT Service

- [x] 5.1 Create `JwtService` bean: inject `app.jwt.secret` (Base64-decoded to `SecretKey`), validate key length ≥ 256 bits in `@PostConstruct`
- [x] 5.2 Implement `generateAccessToken(User user): String` — HS256 JWT with `sub = user.getId()`, `email = user.getEmail()`, `iat`, `exp = now + 15 min`
- [x] 5.3 Implement `extractUserId(String token): UUID` and `isTokenValid(String token, UserDetails userDetails): boolean` using jjwt 0.12.x parser API
- [x] 5.4 Implement `generateRefreshToken(): String` — `SecureRandom` 256-bit hex string (raw token returned to client)
- [x] 5.5 Implement `hashToken(String rawToken): String` — SHA-256 hex digest for DB storage

## 6. Auth Service

- [x] 6.1 Create `AuthService` with `UserRepository`, `RefreshTokenRepository`, `JwtService`, `BCryptPasswordEncoder`, `AuthenticationManager` injected
- [x] 6.2 Implement `register(RegisterRequest req): AuthResponse` — validate unique email, hash password, save `User`, generate and persist `RefreshToken`, return token pair
- [x] 6.3 Implement `login(LoginRequest req): AuthResponse` — authenticate via `AuthenticationManager`, load user, generate and persist `RefreshToken`, return token pair
- [x] 6.4 Implement `refresh(RefreshRequest req): AuthResponse` — hash incoming token, find by hash, check expiry, delete old token, generate and persist new `RefreshToken`, return new token pair

## 7. DTOs

- [x] 7.1 Create `RegisterRequest` record with `@NotBlank` / `@Email` / `@Size(min=8)` validation annotations on all fields
- [x] 7.2 Create `LoginRequest` record with `@NotBlank` on `email` and `password`
- [x] 7.3 Create `RefreshRequest` record with `@NotBlank` on `refreshToken`
- [x] 7.4 Create `AuthResponse` record with `accessToken`, `refreshToken`, `tokenType` (default `"Bearer"`), `expiresIn` (default `900`)

## 8. Auth Controller

- [x] 8.1 Create `AuthController` at `@RequestMapping("/api/v1/auth")` with `AuthService` injected
- [x] 8.2 Implement `POST /register` → `AuthService.register`, return `ResponseEntity<AuthResponse>` with HTTP 201
- [x] 8.3 Implement `POST /login` → `AuthService.login`, return `ResponseEntity<AuthResponse>` with HTTP 200
- [x] 8.4 Implement `POST /refresh` → `AuthService.refresh`, return `ResponseEntity<AuthResponse>` with HTTP 200

## 9. Spring Security Configuration

- [x] 9.1 Create `JwtAuthenticationFilter extends OncePerRequestFilter`: extract `Authorization: Bearer` header, validate JWT via `JwtService`, set `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`
- [x] 9.2 Create `SecurityConfig` `@Configuration` bean: define `BCryptPasswordEncoder` bean (strength 12), `UserDetailsService` bean backed by `UserRepository`, `AuthenticationManager` bean
- [x] 9.3 Configure `SecurityFilterChain`: `STATELESS` session, permit `/api/v1/auth/**`, require auth on all others, add `JwtAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`

## 10. Exception Handling

- [x] 10.1 Create `GlobalExceptionHandler extends ResponseEntityExceptionHandler` in `com.levelmate.backend.common` with `@RestControllerAdvice`
- [x] 10.2 Handle `MethodArgumentNotValidException` → HTTP 400 `{ "errorCode": "VALIDATION_ERROR", "message": "..." }`
- [x] 10.3 Handle `EmailAlreadyInUseException` (custom) → HTTP 409 `{ "errorCode": "EMAIL_ALREADY_IN_USE", "message": "..." }`
- [x] 10.4 Handle `BadCredentialsException` → HTTP 401 `{ "errorCode": "INVALID_CREDENTIALS", "message": "..." }`
- [x] 10.5 Handle `InvalidRefreshTokenException` (custom) → HTTP 401 with `errorCode` from exception
- [x] 10.6 Handle JWT parse/expiry exceptions in `JwtAuthenticationFilter` → write HTTP 401 JSON directly to response (filter runs outside MVC exception handling)
