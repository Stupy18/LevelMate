# LevelMate Backend — Claude Code Guide

> **INSTRUCTION FOR CLAUDE**: Read this file at the start of every session.
> After any implementation work is complete (tasks finished, features working),
> update the "Implementation Status" and "File Map" sections before closing out.
> Keep entries concise — this file is a quick-load context, not documentation.

---

## Project Overview

LevelMate is a multi-sport social platform where athletes find people to play with at their skill level, track progress, and find/offer coaching.

**Architecture**: Modular monolith — one Spring Boot app, internally split by module. Modules communicate via direct Java calls, NOT HTTP. Split into microservices only when scale demands it.

**Stack**
- Java 21, Spring Boot 4.0.6
- Spring Security 6.x (Jakarta namespace) with JWT — jjwt 0.12.x
- Spring Data JPA + Hibernate, PostgreSQL
- Flyway migrations
- Lombok
- Maven

**Root source package**: `com.Levelmate.backend` (capital L — must be consistent)
**Code lives at**: `backend/src/main/java/com/Levelmate/backend/`
**Resources**: `backend/src/main/resources/`
**Migrations**: `backend/src/main/resources/db/migration/` — naming: `V{n}__{description}.sql`
**OpenSpec changes**: `openspec/changes/` — specs: `openspec/specs/`

---

## Module Structure

```
com.Levelmate.backend
├── auth/          ← JWT login, registration, token refresh
├── users/         ← user profiles, sport levels, coach profiles  [DONE]
├── games/         ← game sessions, joining, location             [FUTURE]
├── elo/           ← ELO calculation engine                       [FUTURE]
├── coaching/      ← coach booking, sessions                      [FUTURE]
└── common/        ← shared DTOs, exceptions, base classes
```

---

## API Conventions

- Base path: `/api/v1/`
- All protected endpoints require: `Authorization: Bearer {accessToken}`
- Error response shape: `{ "errorCode": "SNAKE_CASE_CODE", "message": "..." }`
- Timestamps: ISO 8601 UTC
- Primary keys: UUID (never auto-increment)
- All tables have `created_at` and `updated_at`

---

## Security Rules

- BCrypt strength 12
- JWT access token: 15 min, HS256, claims: `sub` = user UUID, `email`
- Refresh token: 30 days, stored as SHA-256 hash in DB, rotated on every use
- JWT secret: sourced from `app.jwt.secret` (env var override in prod), min 256 bits
- No sensitive data beyond user ID and email in JWT claims

---

## Domain Concepts

### Sport Rating Types
- `ELO_COMPETITIVE` — win/loss sports (basketball, tennis, football, padel, volleyball). Initial ELO 1000.
- `GRADE_BASED` — progression scale (bouldering: V-scale or French font). User sets current + project grade.
- `PERFORMANCE_BASED` — metric sports (running, cycling, swimming). User logs personal bests per distance.

### User Sport Roles
One user account → many sport entries. Per sport: player (skill level 1–10, ELO if applicable) and/or coach (separate `coach_profiles` table, hourly rate, bio, `is_verified = false` by default).

---

## Implementation Status

### auth — DONE (openspec change: `auth-registration-login`)

**Endpoints:**
- `POST /api/v1/auth/register` — create account, returns `{ accessToken, refreshToken, tokenType, expiresIn }`
- `POST /api/v1/auth/login` — authenticate, returns token pair
- `POST /api/v1/auth/refresh` — rotates refresh token, returns new pair

**Files created:**
```
auth/
  controller/AuthController.java
  service/AuthService.java
  repository/UserRepository.java
  repository/RefreshTokenRepository.java
  entity/User.java              (implements UserDetails)
  entity/RefreshToken.java
  dto/RegisterRequest.java
  dto/LoginRequest.java
  dto/RefreshRequest.java
  dto/AuthResponse.java
  security/JwtService.java           (jjwt 0.12.x, HS256, SHA-256 refresh hash)
  security/UserDetailsServiceImpl.java
  security/JwtAuthenticationFilter.java
  security/SecurityConfig.java       (BCrypt-12, STATELESS, JWT filter)
common/
  exception/EmailAlreadyInUseException.java
  exception/InvalidRefreshTokenException.java
  GlobalExceptionHandler.java
resources/db/migration/
  V1__create_users_table.sql
  V2__create_refresh_tokens_table.sql
```

**Key notes:**
- `UserDetailsServiceImpl` is a separate `@Component` to avoid circular dep with `SecurityConfig`
- Refresh tokens stored as SHA-256 hex hash (64-char `CHAR(64)` column), rotated on every use
- JWT secret validated ≥ 32 bytes at startup via `@PostConstruct`
- Dev default secret in `application.yaml`; override via `JWT_SECRET` env var in prod

---

### users — DONE (openspec change: `user-sport-profiles`)

**Endpoints:**
- `GET /api/v1/sports` — public sports catalog (10 seeded sports)
- `POST /api/v1/users/{userId}/sports` — add sport to profile (201)
- `GET /api/v1/users/{userId}/sports` — list user's sports
- `PUT /api/v1/users/{userId}/sports/{sportId}` — update sport rating
- `DELETE /api/v1/users/{userId}/sports/{sportId}` — remove sport (204)
- `POST /api/v1/users/{userId}/sports/{sportId}/coach-profile` — create coach profile (201)
- `GET /api/v1/users/{userId}/sports/{sportId}/coach-profile` — get coach profile
- `PUT /api/v1/users/{userId}/sports/{sportId}/coach-profile` — update coach profile
- `POST /api/v1/users/{userId}/sports/{sportId}/pbs` — record PB (201 new, 200 upsert)
- `GET /api/v1/users/{userId}/sports/{sportId}/pbs` — list PBs ordered by distance

**Files created:**
```
users/
  entity/RatingType.java          (ELO_COMPETITIVE, GRADE_BASED, PERFORMANCE_BASED)
  entity/Sport.java
  entity/UserSport.java           (nullable eloRating, grade)
  entity/CoachProfile.java        (is_verified=false by default)
  entity/PerformancePb.java       (unique on user+sport+distance)
  repository/SportRepository.java
  repository/UserSportRepository.java
  repository/CoachProfileRepository.java
  repository/PerformancePbRepository.java
  dto/SportCatalogItemResponse.java
  dto/AddSportRequest.java
  dto/UpdateSportRequest.java
  dto/SportEntryResponse.java
  dto/CreateCoachProfileRequest.java
  dto/UpdateCoachProfileRequest.java
  dto/CoachProfileResponse.java
  dto/RecordPbRequest.java
  dto/PbResponse.java
  dto/PbResult.java               (internal: wraps PbResponse + boolean created)
  service/SportsCatalogService.java
  service/UserSportProfileService.java
  service/CoachProfileService.java
  service/PerformancePbService.java
  controller/SportsCatalogController.java
  controller/UserSportProfileController.java
  controller/CoachProfileController.java
  controller/PerformancePbController.java
common/exception/
  SportNotFoundException.java
  SportAlreadyAddedException.java
  UserSportNotFoundException.java
  CoachProfileAlreadyExistsException.java
  CoachProfileNotFoundException.java
  SportNotInProfileException.java
  InvalidSportRatingTypeException.java
  ForbiddenException.java
resources/db/migration/
  V3__create_sports_table.sql     (+ 10 seeded sports)
  V4__create_user_sports_table.sql
  V5__create_coach_profiles_table.sql
  V6__create_performance_pbs_table.sql
```

**Key notes:**
- Ownership check (userId == JWT subject) done in service layer via `SecurityContextHolder`
- PB upsert: same user+sport+distance combination overwrites existing record
- `GET /api/v1/sports` is publicly accessible (no auth required)
- `coach_profiles.is_verified` defaults to false; no admin flow yet

---

### games — DONE (openspec change: `game-session`)

**Endpoints:**
- `POST /api/v1/game-sessions` — create session (201); sport must be on profile
- `GET /api/v1/game-sessions` — search open sessions with bounding-box + level filter (200 paginated)
- `GET /api/v1/game-sessions/{sessionId}` — get session with participants (200)
- `PATCH /api/v1/game-sessions/{sessionId}/status` — HOST-only; CANCELLED or COMPLETED (200)
- `POST /api/v1/game-sessions/{sessionId}/join` — join OPEN session, level-range checked (200)
- `POST /api/v1/game-sessions/{sessionId}/leave` — leave OPEN/FULL session, non-HOST only (204)
- `POST /api/v1/game-sessions/{sessionId}/result` — report result (201); COMPLETED + ELO_COMPETITIVE only
- `GET /api/v1/game-sessions/{sessionId}/result` — get result (200)
- `POST /api/v1/game-sessions/{sessionId}/result/confirm` — confirm result, triggers ELO stub (200)
- `POST /api/v1/game-sessions/{sessionId}/result/dispute` — dispute result (200)

**Files created:**
```
games/
  entity/SessionStatus.java      (OPEN, FULL, CANCELLED, COMPLETED)
  entity/ParticipantRole.java    (HOST, PLAYER)
  entity/TeamSide.java           (TEAM_A, TEAM_B)
  entity/WinnerTeam.java         (TEAM_A, TEAM_B, DRAW)
  entity/ResultStatus.java       (PENDING_CONFIRMATION, CONFIRMED, DISPUTED)
  entity/GameSession.java        (BigDecimal lat/lng, @Enumerated(STRING) status)
  entity/GameParticipant.java    (ManyToOne session+user, @Enumerated role/team)
  entity/GameResult.java         (OneToOne session, two ManyToOne user reporter/confirmer)
  repository/GameSessionRepository.java     (searchOpen @Query with bounding-box)
  repository/GameParticipantRepository.java (findAllBySessionId, existsBy, countBy, deleteBy)
  repository/GameResultRepository.java      (findBySessionId)
  dto/CreateGameSessionRequest.java
  dto/UpdateSessionStatusRequest.java       (@Pattern CANCELLED|COMPLETED)
  dto/ReportResultRequest.java
  dto/GameSessionResponse.java              (participantCount, spotsRemaining, participants list)
  dto/GameParticipantResponse.java
  dto/GameResultResponse.java
  dto/GameSessionSearchParams.java
  service/EloService.java                   (stub: logs "ELO update pending for session {}")
  service/GameSessionService.java           (createSession, getSession, searchSessions)
  service/GameSessionStatusService.java     (updateStatus: HOST-only, valid transitions)
  service/GameParticipationService.java     (joinSession, leaveSession)
  service/GameResultService.java            (reportResult, confirmResult, disputeResult, getResult)
  controller/GameSessionController.java
  controller/GameSessionStatusController.java
  controller/GameParticipationController.java
  controller/GameResultController.java
common/exception/
  SessionNotFoundException.java
  SportNotOnProfileException.java
  InvalidScheduledDateException.java
  SessionFullException.java
  AlreadyJoinedException.java
  LevelOutOfRangeException.java
  HostCannotLeaveException.java
  NotAParticipantException.java
  InvalidStatusTransitionException.java
  SessionNotYetPlayedException.java
  SessionNotOpenException.java
  ResultAlreadyReportedException.java
  SessionNotCompletedException.java
  SportNotEloCompetitiveException.java
  ResultNotFoundException.java
  InvalidResultStatusException.java
  CannotConfirmOwnReportException.java
resources/db/migration/
  V7__create_game_sessions_table.sql
  V8__create_game_participants_table.sql
  V9__create_game_results_table.sql
  V10__add_level_to_user_sports.sql   (adds nullable level INT to user_sports for join level-range check)
```

**Key notes:**
- Session status machine: OPEN → FULL (auto on max join) / CANCELLED / COMPLETED (HOST sets, scheduledAt must be past)
- Result flow: PENDING_CONFIRMATION → CONFIRMED (non-reporter confirms) / DISPUTED (non-reporter disputes)
- Bounding-box search: latDelta = radiusKm / 111.0; lngDelta adjusted for longitude compression
- ELO updates now real — `EloService.onResultConfirmed(sessionId, winner)` in `elo/service/` dispatches to `EloCalculationService` async
- UserSport.level (1-10) added via V10 migration; used only for join level-range enforcement
- Cross-module: GameParticipationService injects UserSportRepository directly (modular monolith pattern)

---

### elo — DONE (openspec change: `elo-engine`)

**Endpoints:**
- `GET /api/v1/users/{userId}/sports/{sportId}/elo-history` — paginated ELO history for user+sport; ownership-checked (200)
- `GET /api/v1/sports/{sportId}/leaderboard` — top 50 players by ELO for a sport (200)

**Files created:**
```
elo/
  entity/EloHistory.java          (ManyToOne to User, Sport, GameSession)
  repository/EloHistoryRepository.java
  service/EloService.java         (delegates to EloCalculationService)
  service/EloCalculationService.java  (@Async("eloTaskExecutor") @Transactional, two-layer formula)
  service/EloQueryService.java    (history + leaderboard queries, ownership check)
  controller/EloHistoryController.java
  controller/EloLeaderboardController.java
  dto/EloHistoryResponse.java
  dto/EloHistoryPageResponse.java
  dto/LeaderboardEntryResponse.java
common/
  AsyncConfig.java                (@EnableAsync, eloTaskExecutor ThreadPoolTaskExecutor core=2 max=4)
resources/db/migration/
  V11__add_games_played_to_user_sports.sql
  V12__create_elo_history_table.sql
```

**Key notes:**
- Two-layer formula: avgEloA/B drive team context; each player's E_i uses opposing team average
- K-factor: 32 (< 30 games), 24 (≥ 30 games, ELO < 2000), 16 (≥ 30 games, ELO ≥ 2000)
- ELO floor: max(100, newElo). Null elo_rating treated as 1000 (initial)
- Async: `@EnableAsync` in `AsyncConfig` + named executor required — Boot 4 does not auto-configure one
- All-or-nothing: entire session's ELO updates committed in one `@Transactional` on the async method
- Skip conditions: any participant missing team assignment, or either team empty — logs WARN, no partial update
- `games/service/EloService.java` deleted; replaced by `elo/service/EloService.java`
- `GameResultService` updated: imports `elo.service.EloService`, passes `WinnerTeam` to `onResultConfirmed`

### coaching — FUTURE (do not build yet)

---

## File Map (update as files are created)

| File | Status | Notes |
|------|--------|-------|
| `backend/pom.xml` | Done | jjwt 0.12.6, flyway-core, flyway-database-postgresql, spring-boot-starter-test |
| `backend/src/main/resources/application.yaml` | Done | datasource, flyway, JWT secret/expiry config |
| `BackendApplication.java` | Done | Entry point only |
| `auth/entity/User.java` | Done | JPA entity + UserDetails, UUID PK, BCrypt hash |
| `auth/entity/RefreshToken.java` | Done | JPA entity, lazy User FK, SHA-256 token_hash |
| `auth/repository/UserRepository.java` | Done | findByEmail, existsByEmail |
| `auth/repository/RefreshTokenRepository.java` | Done | findByTokenHash, deleteByUser |
| `auth/security/JwtService.java` | Done | generateAccessToken, extractEmail, isTokenValid, generateRefreshToken, hashToken |
| `auth/security/UserDetailsServiceImpl.java` | Done | loads by email, @Transactional(readOnly) |
| `auth/security/JwtAuthenticationFilter.java` | Done | OncePerRequestFilter, ExpiredJwtException→TOKEN_EXPIRED |
| `auth/security/SecurityConfig.java` | Done | BCrypt-12, STATELESS, JWT filter, /api/v1/auth/** public |
| `auth/service/AuthService.java` | Done | register, login, refresh with token rotation |
| `auth/controller/AuthController.java` | Done | POST /register(201), /login(200), /refresh(200) |
| `auth/dto/{Register,Login,Refresh}Request.java` | Done | Bean validation records |
| `auth/dto/AuthResponse.java` | Done | tokenType="Bearer", expiresIn=900 |
| `common/GlobalExceptionHandler.java` | Done | VALIDATION_ERROR, EMAIL_IN_USE, INVALID_CREDENTIALS, INVALID_REFRESH_TOKEN |
| `common/exception/EmailAlreadyInUseException.java` | Done | |
| `common/exception/InvalidRefreshTokenException.java` | Done | carries errorCode field |
| `db/migration/V1__create_users_table.sql` | Done | UUID PK, gen_random_uuid() |
| `db/migration/V2__create_refresh_tokens_table.sql` | Done | FK → users ON DELETE CASCADE, index on user_id |
| `db/migration/V3__create_sports_table.sql` | Done | 10 seeded sports, CHECK on rating_type |
| `db/migration/V4__create_user_sports_table.sql` | Done | nullable eloRating/grade, UNIQUE(user_id,sport_id) |
| `db/migration/V5__create_coach_profiles_table.sql` | Done | UNIQUE(user_id,sport_id), is_verified default false |
| `db/migration/V6__create_performance_pbs_table.sql` | Done | UNIQUE(user_id,sport_id,distance_meters) |
| `users/entity/RatingType.java` | Done | Enum: ELO_COMPETITIVE, GRADE_BASED, PERFORMANCE_BASED |
| `users/entity/Sport.java` | Done | JPA entity, @Enumerated(STRING) ratingType |
| `users/entity/UserSport.java` | Done | ManyToOne User+Sport, nullable eloRating/grade |
| `users/entity/CoachProfile.java` | Done | ManyToOne User+Sport, isVerified=false |
| `users/entity/PerformancePb.java` | Done | ManyToOne User+Sport, distanceMeters+timeSeconds |
| `users/repository/*Repository.java` | Done | 4 repositories with domain-specific query methods |
| `users/dto/*.java` | Done | 9 DTOs + PbResult internal wrapper |
| `users/service/SportsCatalogService.java` | Done | findAll() → SportCatalogItemResponse |
| `users/service/UserSportProfileService.java` | Done | addSport, getSports, updateSport, removeSport; ownership check |
| `users/service/CoachProfileService.java` | Done | createProfile, getProfile, updateProfile; validates sport in profile |
| `users/service/PerformancePbService.java` | Done | recordPb (upsert), getPbs; validates PERFORMANCE_BASED + in profile |
| `users/controller/*Controller.java` | Done | 4 controllers, all 10 endpoints |
| `common/exception/Sport*.java` + others | Done | 8 new exception classes for users module |
| `auth/security/SecurityConfig.java` | Done | Added GET /api/v1/sports as public endpoint |
| `db/migration/V7__create_game_sessions_table.sql` | Done | status CHECK, idx on (sport_id,status,scheduled_at) |
| `db/migration/V8__create_game_participants_table.sql` | Done | UNIQUE(session_id,user_id), role/team CHECK |
| `db/migration/V9__create_game_results_table.sql` | Done | UNIQUE session_id, status/winner_team CHECK |
| `db/migration/V10__add_level_to_user_sports.sql` | Done | nullable INT level (1-10) on user_sports |
| `users/entity/UserSport.java` | Done | Added nullable level INT field |
| `users/dto/AddSportRequest.java` | Done | Added optional level field |
| `users/dto/UpdateSportRequest.java` | Done | Added optional level field |
| `users/dto/SportEntryResponse.java` | Done | Added level field |
| `games/entity/*.java` | Done | SessionStatus, ParticipantRole, TeamSide, WinnerTeam, ResultStatus, GameSession, GameParticipant, GameResult |
| `games/repository/*.java` | Done | GameSessionRepository (searchOpen @Query), GameParticipantRepository, GameResultRepository |
| `games/dto/*.java` | Done | 7 DTOs covering create/update/search/response for sessions, participants, results |
| `games/service/GameSessionService.java` | Done | createSession, getSession, searchSessions (bounding-box) |
| `games/service/GameSessionStatusService.java` | Done | HOST-only, valid transitions, past-date check for COMPLETED |
| `games/service/GameParticipationService.java` | Done | joinSession (level-range via UserSportRepository), leaveSession |
| `games/service/GameResultService.java` | Done | reportResult, confirmResult (calls EloService), disputeResult, getResult |
| `games/controller/GameSessionController.java` | Done | POST (201), GET paginated, GET by ID |
| `games/controller/GameSessionStatusController.java` | Done | PATCH /{id}/status |
| `games/controller/GameParticipationController.java` | Done | POST /{id}/join (200), POST /{id}/leave (204) |
| `games/controller/GameResultController.java` | Done | POST result (201), GET result, POST confirm, POST dispute |
| `common/exception/Session*.java` + 17 others | Done | All handled in GlobalExceptionHandler |
| `common/AsyncConfig.java` | Done | @EnableAsync + eloTaskExecutor (ThreadPoolTaskExecutor core=2, max=4) |
| `db/migration/V11__add_games_played_to_user_sports.sql` | Done | INT NOT NULL DEFAULT 0 |
| `db/migration/V12__create_elo_history_table.sql` | Done | FK→users/sports/game_sessions, idx on (user_id,sport_id,recorded_at DESC) |
| `users/entity/UserSport.java` | Done | Added gamesPlayed INT field |
| `users/repository/UserSportRepository.java` | Done | Added findLeaderboard @Query (JOIN FETCH user, top 50 by elo DESC) |
| `elo/entity/EloHistory.java` | Done | ManyToOne User+Sport+GameSession, eloBefore/Delta/After, recordedAt |
| `elo/repository/EloHistoryRepository.java` | Done | findAllByUserIdAndSportIdOrderByRecordedAtDesc (Page), countByUserIdAndSportId |
| `elo/service/EloService.java` | Done | Replaces games stub; delegates to EloCalculationService |
| `elo/service/EloCalculationService.java` | Done | @Async @Transactional; two-layer formula; K-factor; ELO floor 100; batch save |
| `elo/service/EloQueryService.java` | Done | getHistory (ownership + ELO_COMPETITIVE check), getLeaderboard |
| `elo/controller/EloHistoryController.java` | Done | GET /api/v1/users/{userId}/sports/{sportId}/elo-history |
| `elo/controller/EloLeaderboardController.java` | Done | GET /api/v1/sports/{sportId}/leaderboard |
| `elo/dto/EloHistoryResponse.java` | Done | sessionId, eloBefore, eloDelta, eloAfter, recordedAt |
| `elo/dto/EloHistoryPageResponse.java` | Done | currentElo, gamesPlayed, history list, pagination metadata |
| `elo/dto/LeaderboardEntryResponse.java` | Done | userId, displayName (firstName+lastName), elo, gamesPlayed |
| `games/service/GameResultService.java` | Done | Updated: imports elo.EloService, passes WinnerTeam to onResultConfirmed |

---

## What NOT to Build Yet

Coach booking/payment, push notifications, social feed. Auth, users, game sessions, and ELO engine are done — next feature TBD.

---

## Running Locally with Docker

```bash
# From project root (C:\Users\stupa\Downloads\LevelMate\)
docker compose up --build      # first run or after code changes
docker compose up              # subsequent runs (uses cached image)
docker compose down            # stop everything
docker compose down -v         # stop + wipe postgres volume

# Physical device (Expo Go) — pass your machine's LAN IP:
HOST_IP=192.168.x.x docker compose up
```

**Services started:**
- `postgres`  — PostgreSQL 16 at `localhost:5433`
- `backend`   — Spring Boot API at `http://localhost:8080`
- `expo`      — Expo Metro bundler at `http://localhost:8081`

**Compose layout:**
```
docker-compose.yaml               ← root orchestrator (include-based)
backend/backend/compose.yaml      ← postgres + spring boot
LevelMate/compose.yaml            ← expo metro dev server
```

Each sub-project owns its compose file; the root ties them together with `include:`.
Add new services to the relevant sub-compose or create a new one and add an `include:` entry at the root.

## Mobile App

The React Native / Expo client lives at `C:\Users\stupa\Downloads\LevelMate\LevelMate\`.
See `LevelMate/CLAUDE.md` for the full mobile guide.

**Completed mobile OpenSpec changes:**
- `mobile-foundation` (archived) — Expo Router v4, NativeWind v4, axios JWT interceptors, SecureStore helpers, Zustand auth store, login/register/onboarding screens
- `mobile-screens` (archived) — Discover, My Games, Create Game, Profile, Session Detail, Public User Profile screens + shared components

**API contract notes (things the mobile client depends on):**
- `GameSessionResponse` has flat `sportId`/`sportName` — NOT a nested sport object; don't change this without updating the mobile client
- `UserProfileResponse` shape: `{ userId, displayName, avatarUrl, sports[], coachProfiles[] }` — mobile auth store depends on this
- `AuthResponse` does NOT include userId — mobile decodes the JWT `sub` claim client-side
- `GET /api/v1/game-sessions/{id}/result` must return 404 (not 200 with null) when no result exists — mobile catches this as "no result"

---

## OpenSpec Workflow

Changes are tracked in `openspec/changes/<name>/`. Each change has:
- `proposal.md` — why and what
- `design.md` — how (architecture decisions)
- `specs/<capability>/spec.md` — requirements + scenarios
- `tasks.md` — checkbox implementation tasks

To implement a change: `/opsx:apply`
To propose a new change: `/opsx:propose <description>`
To archive a completed change: `/opsx:archive`

**Each project has its own OpenSpec root:**
- Backend: `C:\Users\stupa\Downloads\LevelMate\backend\`
- Mobile: `C:\Users\stupa\Downloads\LevelMate\LevelMate\`
