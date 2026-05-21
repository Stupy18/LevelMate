# LevelMate — Claude Code Context

## What is LevelMate?
LevelMate is a multi-sport social platform where athletes find people to play
with at their skill level, track their progress, and optionally offer or find coaching.

## Architecture
- **Modular monolith** — one Spring Boot application, internally split by module
- NOT microservices — modules communicate via direct Java calls, not HTTP
- Split into microservices only when scale demands it

## Module Structure
```
com.levelmate.backend
├── auth/          ← JWT login, registration, token refresh
├── users/         ← user profiles, sport levels, coach profiles
├── games/         ← game sessions, joining, location (future)
├── elo/           ← ELO calculation engine (future)
├── coaching/      ← coach booking, sessions (future)
└── common/        ← shared DTOs, exceptions, base classes
```

## Tech Stack
- Java 21, Spring Boot 4.0.6
- Spring Security with JWT (jjwt library)
- Spring Data JPA + Hibernate
- PostgreSQL with Flyway migrations
- Lombok for boilerplate reduction
- Maven build

## CRITICAL: Spring Boot 4 Breaking Changes

This project uses Spring Boot **4.0.6** — NOT 3.x. The following changes from Boot 3 were all discovered through runtime failures. Apply them proactively to every new feature.

### 1. Flyway is NOT auto-configured
Boot 4 removed Flyway from the auto-configuration discovery list entirely. Zero Flyway log output at startup means this is the cause. **Fix**: always define an explicit `@Bean` in `FlywayConfig.java`:
```java
@Bean
public Flyway flyway(DataSource dataSource) {
    Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration")
            .load();
    flyway.migrate();
    return flyway;
}
```

### 2. Jackson ObjectMapper is NOT auto-registered
`spring-boot-starter-webmvc` in Boot 4 does not auto-configure a Jackson `ObjectMapper` bean. Any component that injects `ObjectMapper` will fail with `No qualifying bean of type 'ObjectMapper' available`. **Fix**: define it in `AppConfig.java`:
```java
@Bean
public ObjectMapper objectMapper() {
    return new ObjectMapper();
}
```

### 3. DaoAuthenticationProvider constructor changed
In Spring Security 7 (shipped with Boot 4), `DaoAuthenticationProvider` no longer has a no-arg constructor + `setUserDetailsService()`. It requires `UserDetailsService` passed in the constructor. **Fix**:
```java
// WRONG (Boot 3):
DaoAuthenticationProvider p = new DaoAuthenticationProvider();
p.setUserDetailsService(uds);

// CORRECT (Boot 4):
DaoAuthenticationProvider p = new DaoAuthenticationProvider(userDetailsService);
```

### 4. ddl-auto must be 'none' when Flyway owns the schema
Setting `ddl-auto: validate` causes Hibernate to try validating the schema before Flyway runs, producing `jpaSharedEM_entityManagerFactory not found`. **Fix**: always set `spring.jpa.hibernate.ddl-auto: none`.

### 5. Circular dependency pattern to avoid
`SecurityConfig` → `JwtAuthenticationFilter` → `ObjectMapper` → `SecurityConfig` is a circular dependency if `ObjectMapper` is defined inside `SecurityConfig`. **Fix**: move all `@Bean` definitions that are injected transitively into a separate `AppConfig.java` class.

### 6. General rule
When in doubt, define beans explicitly rather than relying on auto-configuration. Boot 4 is more conservative about what it registers automatically.

## Key Domain Concepts

### Sport Rating Types
Sports use different rating mechanisms:
- **ELO_COMPETITIVE** — win/loss sports (basketball, tennis, football, padel, volleyball)
  Initial ELO: 1000. ELO updates after verified game results.
- **GRADE_BASED** — progression scale sports (bouldering uses V-scale or French font)
  No ELO. User sets current grade and project grade.
- **PERFORMANCE_BASED** — metric-tracked sports (running, cycling, swimming)
  No ELO. User logs personal bests per distance.

### User Sport Roles
A user has ONE account but MANY sport entries. Per sport they can be:
- A **player** with a self-reported skill level (1-10) and ELO (if applicable)
- A **coach** (independent coach_profiles table) with hourly rate and bio

Example: User can be a level 6 basketball player AND a bouldering coach.

### Coach Profiles
Coach profiles are stored separately from sport skill levels.
A coach is NOT a "level 11" — it is a separate business role in coach_profiles.
is_verified = false by default. Verification is a future manual review process.

## API Conventions
- Base path: /api/v1/
- Auth endpoints: /api/v1/auth/
- User endpoints: /api/v1/users/
- All protected endpoints require: Authorization: Bearer {accessToken}
- Error responses always include: { "errorCode": "SNAKE_CASE_CODE", "message": "..." }
- Timestamps in ISO 8601 UTC

## Database Conventions
- Primary keys: UUID (not auto-increment)
- All tables have created_at and updated_at timestamps
- Flyway migrations in: src/main/resources/db/migration/
- Migration naming: V{number}__{description}.sql

## Security Rules
- Passwords hashed with BCrypt (strength 12)
- JWT access token expiry: 15 minutes
- Refresh token expiry: 30 days, stored as SHA-256 hash in DB
- Refresh token rotation on every use
- No sensitive data in JWT claims beyond user ID and email

## What NOT to build yet
- Game session creation (future epic)
- ELO update on match result (future epic)
- Coach booking/payment (future epic)
- Push notifications (future epic)
- Social feed (future epic)

Focus only on auth and user sport profiles for now.
