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
├── games/         ← game sessions, joining, location, results    [DONE]
├── elo/           ← ELO calculation engine                       [DONE]
├── admin/         ← admin-only endpoints (disputes, all sessions)[DONE]
├── notifications/ ← Expo push notification service               [DONE]
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

### users — profile endpoints — DONE

**Additional endpoints added to users module:**
- `GET /api/v1/users/{userId}/profile` — full profile: displayName, avatarData, sports[], coachProfiles[]
- `PATCH /api/v1/users/me/profile` — update displayName and/or avatarData (null avatarData clears it)
- `GET /api/v1/users/me/active-sessions` — sessions with status OPEN/FULL/IN_PROGRESS for the calling user
- `GET /api/v1/users/me/pending-results` — completed ELO sessions awaiting result report/confirm/dispute

**Files added/updated:**
```
users/
  controller/UserProfileController.java   (GET /{userId}/profile, PATCH /me/profile, GET /me/active-sessions, GET /me/pending-results)
  service/UserProfileService.java         (getProfile, updateProfile)
  dto/UserProfileResponse.java            (userId, displayName, avatarUrl, avatarData, sports[], coachProfiles[])
  dto/UpdateProfileRequest.java           (displayName?, avatarData?)
auth/
  entity/User.java                        (added avatarData TEXT field)
  dto/RegisterRequest.java                (added optional avatarData field)
  service/AuthService.java                (passes avatarData to User builder)
games/
  dto/PendingResultResponse.java          (sessionId, title, sportName, sportSlug, scheduledAt, pendingType, locationName, participantCount)
resources/db/migration/
  V17__add_avatar_data_to_users.sql       (ALTER TABLE users ADD COLUMN avatar_data TEXT)
```

**Key notes:**
- `updateProfile` splits `displayName` on last space → firstName/lastName; null `avatarData` explicitly clears the field
- `getPendingResults` always loads participants first (to get `participantCount`), then checks result status
- `PendingResultResponse` includes `locationName` (from GameSession) and `participantCount` (from participant list size)

---

### games — DONE (openspec change: `game-session`)

**Endpoints:**
- `POST /api/v1/game-sessions` — create session (201); sport must be on profile
- `GET /api/v1/game-sessions` — search open sessions with bounding-box + level filter (200 paginated)
- `GET /api/v1/game-sessions/{sessionId}` — get session with participants (200)
- `PATCH /api/v1/game-sessions/{sessionId}/status` — HOST-only; CANCELLED or COMPLETED (200)
- `POST /api/v1/game-sessions/{sessionId}/join` — join OPEN session, level-range checked (200)
- `POST /api/v1/game-sessions/{sessionId}/leave` — leave OPEN/FULL session, non-HOST only (204)
- `PATCH /api/v1/game-sessions/{sessionId}/participants/{participantUserId}/team` — assign participant to TEAM_A/TEAM_B (200); pre-game: host only; post-game rebalancing window: host or Team B captain
- `GET /api/v1/game-sessions/{sessionId}/can-rebalance` — returns `{ canRebalance, reason }` for current user (200)
- `POST /api/v1/game-sessions/{sessionId}/result` — report result (201); COMPLETED + ELO_COMPETITIVE only
- `GET /api/v1/game-sessions/{sessionId}/result` — get result (200)
- `POST /api/v1/game-sessions/{sessionId}/result/confirm` — confirm result, triggers ELO (200)
- `POST /api/v1/game-sessions/{sessionId}/result/dispute` — dispute with counter-score (Team B captain only); (200)
- `POST /api/v1/game-sessions/{sessionId}/result/accept-counter` — original reporter accepts the counter-score (200)

**Files created:**
```
games/
  entity/SessionStatus.java      (OPEN, FULL, IN_PROGRESS, CANCELLED, COMPLETED)
  entity/ParticipantRole.java    (HOST, PLAYER)
  entity/TeamSide.java           (TEAM_A, TEAM_B)
  entity/WinnerTeam.java         (TEAM_A, TEAM_B, DRAW)
  entity/ResultStatus.java       (PENDING_CONFIRMATION, COUNTER_PROPOSED, CONFIRMED, DISPUTED)
  entity/GameSession.java        (BigDecimal lat/lng, locationName, locationAddress, googlePlaceId)
  entity/GameParticipant.java    (ManyToOne session+user, @Enumerated role/team)
  entity/GameResult.java         (OneToOne session, two ManyToOne user reporter/confirmer; counter fields: counterWinnerTeam, counterScoreTeamA/B, counterReportedBy; disputedAt, autoResolved)
  entity/ResultVote.java         (ManyToOne result+user, @Enumerated VoteType)
  entity/VoteType.java           (CONFIRM, DISPUTE)
  repository/GameSessionRepository.java     (searchOpen @Query with bounding-box, findCompletedEloSessionsForUser)
  repository/GameParticipantRepository.java (findAllBySessionId, existsBy, countBy, deleteBy)
  repository/GameResultRepository.java      (findBySessionId)
  repository/ResultVoteRepository.java      (existsByResultIdAndUserId)
  dto/CreateGameSessionRequest.java
  dto/UpdateSessionStatusRequest.java       (@Pattern CANCELLED|COMPLETED)
  dto/AssignTeamRequest.java                (userId, team)
  dto/ReportResultRequest.java
  dto/PendingResultResponse.java            (sessionId, title, sportName, sportSlug, scheduledAt, pendingType, locationName, participantCount)
  dto/GameSessionResponse.java              (participantCount, spotsRemaining, participants list)
  dto/GameParticipantResponse.java
  dto/GameResultResponse.java
  dto/GameSessionSearchParams.java
  service/GameSessionService.java           (createSession, getSession, searchSessions, getPendingResults, getActiveSessionsForUser)
  service/GameSessionStatusService.java     (updateStatus: HOST-only, valid transitions)
  service/GameParticipationService.java     (joinSession, leaveSession, assignTeam)
  service/GameResultService.java            (reportResult, confirmResult, disputeResult, acceptCounter, getResult)
  service/SessionStatusScheduler.java       (@Scheduled auto-transitions sessions to IN_PROGRESS)
  controller/GameSessionController.java
  controller/GameSessionStatusController.java
  controller/GameParticipationController.java  (PATCH /{id}/participants/{userId}/team)
  controller/GameResultController.java         (POST result, GET result, confirm, dispute, accept-counter)
common/exception/
  SessionNotFoundException.java + 17 others
  TeamsNotBalancedException.java
  TimeConflictException.java
resources/db/migration/
  V7__create_game_sessions_table.sql
  V8__create_game_participants_table.sql
  V9__create_game_results_table.sql
  V10__add_level_to_user_sports.sql
  V13__add_google_place_fields_to_game_sessions.sql  (locationName, locationAddress, googlePlaceId, googlePhotoReference)
  V14__add_in_progress_session_status.sql            (adds IN_PROGRESS to status CHECK constraint)
  V15__convert_elo_to_decimal.sql                    (elo_rating column → DECIMAL)
  V16__create_result_votes_table.sql                 (result_votes: result_id FK, user_id FK, vote_type)
  V18__add_counter_proposed_state.sql                (COUNTER_PROPOSED to status CHECK; counter_winner_team, counter_score_team_a/b, counter_reported_by_user_id columns on game_results)
```

**Key notes:**
- Session status machine: OPEN → FULL (auto on max join) / IN_PROGRESS (auto via scheduler) / CANCELLED / COMPLETED (HOST sets)
- `SessionStatusScheduler` auto-transitions OPEN/FULL sessions to IN_PROGRESS when `scheduledAt` is reached
- Result flow: PENDING_CONFIRMATION → CONFIRMED (majority vote) / COUNTER_PROPOSED (Team B captain disputes with different score); COUNTER_PROPOSED → DISPUTED (original reporter rejects) / CONFIRMED (original reporter accepts counter)
- Majority vote confirmation: `confirmVotes * 2 > totalVoters` where totalVoters = totalParticipants − 1
- Bounding-box search: latDelta = radiusKm / 111.0; lngDelta adjusted for longitude compression
- ELO updates real — `EloService.onResultConfirmed(sessionId, winner)` dispatches to `EloCalculationService` async
- `getPendingResults` always loads participants first (for count + team check), then checks result status
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
  service/EloCalculationService.java      (@Async("eloTaskExecutor"), two-layer formula)
  service/EloTransactionalService.java    (@Transactional inner bean — avoids self-invocation proxy issue)
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

### notifications — DONE

**Endpoint:**
- `POST /api/v1/users/me/push-token` — register Expo push token for the calling user (200)

**Files created:**
```
notifications/
  service/PushNotificationService.java   (@Async("eloTaskExecutor"), sends via Expo push API)
  dto/SavePushTokenRequest.java          (token: String)
auth/
  entity/User.java                       (added pushToken VARCHAR(500) field)
resources/db/migration/
  V19__add_push_token_to_users.sql       (ALTER TABLE users ADD COLUMN push_token VARCHAR(500))
```

**Key notes:**
- `sendToUser()` is `@Async("eloTaskExecutor")` — never blocks a request thread
- Silently skips users with no push token (null/blank)
- On `DeviceNotRegistered` error from Expo, clears the stale token from the DB automatically
- `RestTemplate` bean must be declared (added in `AsyncConfig` or similar)

---

### admin-role — DONE

**Endpoints (all require ADMIN role — 403 otherwise):**
- `GET /api/v1/admin/disputes` — list all DISPUTED results with full context
- `POST /api/v1/admin/disputes/{sessionId}/resolve` — resolve a dispute, confirms result and triggers ELO
- `GET /api/v1/admin/sessions` — paginated list of all game sessions (any status)

**Files created:**
```
admin/
  controller/AdminController.java        (3 endpoints, all call requireAdmin() via service)
  service/AdminService.java              (requireAdmin(), resolveDispute, resolveDisputeCore, getDisputes, getAllSessions)
  dto/AdminDisputeResponse.java          (sessionId, sportName, scheduledAt, locationName, reporter/counter details, participants)
  dto/ResolveDisputeRequest.java         (winnerTeam, scoreTeamA, scoreTeamB)
auth/
  entity/User.java                       (added role VARCHAR(20), default "USER", getAuthorities() returns ROLE_USER or ROLE_ADMIN)
resources/db/migration/
  V20__add_role_to_users.sql             (ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')))
```

**Key notes:**
- `requireAdmin()` reads `user.getRole()` from `SecurityContextHolder` — throws `ForbiddenException` if not ADMIN
- `getAuthorities()` on User entity returns `List.of(new SimpleGrantedAuthority("ROLE_" + role))` — used by Spring Security
- `resolveDisputeCore()` is public, has no admin check — safe to call from the scheduler (different Spring bean = proxy works)
- Admin role must be set manually in the DB: `UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com'`
- `getAllSessions` uses `findAllByOrderByScheduledAtDesc` — add to `GameSessionRepository` if missing

---

### team-rebalancing — DONE

**What was built:**
- `GET /api/v1/game-sessions/{id}/can-rebalance` — returns `{ canRebalance: boolean, reason: String }`. True only when: COMPLETED + no result exists + caller is host or Team B captain
- `assignTeam` guard updated: if session is COMPLETED and no result exists (rebalancing window), host OR Team B captain are allowed. Pre-game (OPEN/FULL): host-only as before. Post-result: still locked
- `GameResultRepository.existsBySessionId` added (derived Spring Data query)
- `CanRebalanceResponse` record DTO added

**Key notes:**
- ELO reads `game_participants` fresh at calculation time — no ELO service changes needed
- "Last write wins" if both captains rebalance simultaneously — acceptable for MVP

**Files added/updated:**
```
games/dto/CanRebalanceResponse.java           (new record: canRebalance, reason)
games/repository/GameResultRepository.java    (existsBySessionId)
games/service/GameParticipationService.java   (rewritten assignTeam guard, new canRebalance method)
games/controller/GameParticipationController.java  (GET can-rebalance endpoint)
```

---

### dispute-reform — DONE

**What was built:**
- Team captain system: Team A captain = host, Team B captain = earliest TEAM_B participant by `joinedAt`
- `isCapt` on `GameParticipantResponse` — computed in `buildResponse()` from in-memory list (no extra DB query)
- Counter-score restricted to Team B captain in `GameResultService.disputeResult()` — 403 with captain name for non-captains
- `disputedAt TIMESTAMP` + `auto_resolved BOOLEAN DEFAULT FALSE` on `game_results` via V21
- `disputedAt` set on both DISPUTED transition paths in `GameResultService`
- `AdminService.resolveDisputeCore()` extracted — no admin check, no notification, triggers ELO afterCommit. Called by `resolveDispute()` (+ admin push notification) and scheduler (+ auto-resolve notification)
- `DisputeResolutionScheduler` — `@Component` games/service, hourly, per-game `@Transactional resolveOne()`, calls `resolveDisputeCore`, sets `autoResolved=true`, sends push afterCommit
- Scheduler config: `levelmate.scheduler.dispute-resolution-cron` + `dispute-resolution-hours` (defaults: `0 0 * * * *`, `24`)

**Files added/updated:**
```
games/service/DisputeResolutionScheduler.java  (new)
games/service/GameResultService.java           (captain check, disputedAt)
games/service/GameSessionService.java          (buildResponse with isCapt)
games/dto/GameParticipantResponse.java         (isCapt, overloaded from())
games/dto/GameResultResponse.java              (disputedAt)
games/repository/GameParticipantRepository.java (findFirstBySessionIdAndTeamOrderByJoinedAtAsc)
games/repository/GameResultRepository.java     (findUnresolvedDisputesOlderThan)
games/entity/GameResult.java                   (disputedAt, autoResolved)
admin/service/AdminService.java                (resolveDisputeCore extracted)
db/migration/V21__add_disputed_at_auto_resolved_to_game_results.sql
resources/application.yaml                    (levelmate.scheduler.* properties)
```

**Key notes:**
- `resolveDisputeCore` self-invocation from `resolveDispute` bypasses the `@Transactional` proxy but shares the outer transaction — correct behaviour
- Captain check applies only to counter-score (dispute). Confirmation voting is unrestricted.
- Scheduler sends "Match auto-resolved"; admin endpoint sends "Match dispute resolved" — separate notifications, no duplication

---

### sport-type-aware-sessions — DONE

**What was built:**
- `target_pace VARCHAR(200)`, `grade_min VARCHAR(20)`, `grade_max VARCHAR(20)` on `game_sessions` (V25)
- `pb_update_submitted BOOLEAN NOT NULL DEFAULT FALSE` on `game_participants` (V26)
- `GameSessionResponse` now includes `sportSlug`, `ratingType`, `targetPace`, `gradeMin`, `gradeMax`
- `GameParticipantResponse` now includes `pbUpdateSubmitted`
- `CreateGameSessionRequest` now accepts `targetPace`, `gradeMin`, `gradeMax`
- `GameSessionService.createSession`: `minLevel`/`maxLevel` only set for `ELO_COMPETITIVE`; new fields stored
- `GameParticipationService.joinSession`: level range check wrapped in ELO_COMPETITIVE guard; `markPbSubmitted()` added
- `GameSessionStatusService.updateStatus`: sends `PB_UPDATE_REQUEST` push to all participants afterCommit when PERFORMANCE_BASED session completes
- `GameParticipationController`: `POST /{sessionId}/pb-submitted` endpoint added

**Files added/updated:**
```
db/migration/V25__add_session_type_fields.sql
db/migration/V26__add_pb_update_submitted.sql
games/entity/GameSession.java            (targetPace, gradeMin, gradeMax fields)
games/entity/GameParticipant.java        (pbUpdateSubmitted @Builder.Default false)
games/dto/CreateGameSessionRequest.java  (targetPace, gradeMin, gradeMax)
games/dto/GameSessionResponse.java       (sportSlug, ratingType, targetPace, gradeMin, gradeMax)
games/dto/GameParticipantResponse.java   (pbUpdateSubmitted)
games/service/GameSessionService.java    (ELO-only level fields, new fields in builder)
games/service/GameParticipationService.java (ELO guard on level check, markPbSubmitted)
games/service/GameSessionStatusService.java (PERFORMANCE_BASED push on complete)
games/controller/GameParticipationController.java (pb-submitted endpoint)
```

**Key notes:**
- PB push notification is sent via `TransactionSynchronization.afterCommit()` — fires after DB commit, never blocks
- `pb_update_submitted` is per-participant; mobile reads `participants[].pbUpdateSubmitted` to know whether to show the PB prompt
- Level range check guard: only ELO_COMPETITIVE sports enforce join level range; GRADE/PERFORMANCE sports skip entirely
- `sportSlug` in `GameSessionResponse` is sourced from `Sport.slug`; `ratingType` is `RatingType.name()`

---

### post-session-reminders — DONE

**What was built:**
- V27 migration: `session_acknowledged BOOLEAN NOT NULL DEFAULT FALSE` on `game_participants`
- V28 migration: `cancellation_reason_insufficient_players BOOLEAN NOT NULL DEFAULT FALSE` on `game_sessions`
- `GameParticipant.sessionAcknowledged` field + `GameParticipationService.markSessionAcknowledged()`
- `PATCH /api/v1/game-sessions/{sessionId}/acknowledge` endpoint — marks participant as acknowledged
- `GameSession.cancellationReasonInsufficientPlayers` field + `GameSessionResponse` updated
- `bulkMarkInsufficientPlayersCancellations` native query — sets flag on under-filled CANCELLED sessions after scheduled_at
- `getPendingResults()` extended: now returns `ELO` + `PB_UPDATE` (PERFORMANCE_BASED, pb not submitted) + `SESSION_LOG` (GRADE_BASED, not acknowledged) + `CANCELLED_SESSION` (auto-cancelled, not acknowledged)
- `GameSessionStatusService`: GRADE_BASED sessions send push notification afterCommit on COMPLETED (type `SESSION_LOG`)
- `SessionStatusScheduler` rewritten: calls `bulkMarkInsufficientPlayersCancellations`, finds recently auto-cancelled sessions, sends push notifications afterCommit to all participants (type `SESSION_CANCELLED`)
- `GameParticipantResponse` updated: includes `pbUpdateSubmitted` and `sessionAcknowledged` fields
- `GameSessionResponse` updated: includes `cancellationReasonInsufficientPlayers` field

**Files added/updated:**
```
db/migration/V27__add_session_acknowledged.sql
db/migration/V28__add_cancellation_reason_insufficient_players.sql
games/entity/GameParticipant.java           (sessionAcknowledged @Builder.Default false)
games/entity/GameSession.java               (cancellationReasonInsufficientPlayers @Builder.Default false)
games/dto/GameParticipantResponse.java      (sessionAcknowledged field)
games/dto/GameSessionResponse.java          (cancellationReasonInsufficientPlayers field)
games/repository/GameSessionRepository.java (5 new queries: findCompletedPerfSessions/GradeSessions PendingForUser, bulkMarkInsufficientPlayersCancellations, findRecentlyAutoCancelled, findCancelledAutoSessionsPendingForUser)
games/service/GameSessionService.java       (getPendingResults extended for 4 types)
games/service/GameParticipationService.java (markSessionAcknowledged added)
games/service/GameSessionStatusService.java (GRADE_BASED push on COMPLETED)
games/service/SessionStatusScheduler.java   (full rewrite: bulkMarkInsufficient + push notifications afterCommit)
games/controller/GameParticipationController.java (PATCH /{sessionId}/acknowledge endpoint)
```

**Key notes:**
- Auto-cancel push uses `afterCommit()` pattern — fires after DB commit, never blocks scheduler tick
- `findRecentlyAutoCancelled` uses `since = now.minusSeconds(70)` (70s > 60s tick) to avoid missing sessions
- `findCancelledAutoSessionsPendingForUser` checks `sessionAcknowledged = false` — same flag as grade sessions
- `SESSION_LOG` and `CANCELLED_SESSION` both use `session_acknowledged` to track dismissal (different pendingTypes, same DB flag)

---

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
| `games/controller/GameParticipationController.java` | Done | POST /{id}/join (200), POST /{id}/leave (204), PATCH /{id}/participants/{userId}/team (200) |
| `games/controller/GameResultController.java` | Done | POST result (201), GET result, POST confirm, POST dispute, POST accept-counter |
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
| `games/entity/ResultVote.java` | Done | ManyToOne result+user, VoteType enum |
| `games/entity/VoteType.java` | Done | CONFIRM, DISPUTE |
| `games/entity/SessionStatus.java` | Done | Added IN_PROGRESS value |
| `games/repository/ResultVoteRepository.java` | Done | existsByResultIdAndUserId |
| `games/dto/AssignTeamRequest.java` | Done | userId + team (TEAM_A/TEAM_B) |
| `games/dto/PendingResultResponse.java` | Done | Includes locationName + participantCount |
| `games/service/SessionStatusScheduler.java` | Done | @Scheduled: IN_PROGRESS/CANCELLED transitions + auto-cancel push notifications afterCommit |
| `games/service/GameSessionService.java` | Done | Added getPendingResults (loads participants first), getActiveSessionsForUser |
| `common/exception/TeamsNotBalancedException.java` | Done | |
| `common/exception/TimeConflictException.java` | Done | |
| `db/migration/V13__add_google_place_fields_to_game_sessions.sql` | Done | locationName, locationAddress, googlePlaceId, googlePhotoReference |
| `db/migration/V14__add_in_progress_session_status.sql` | Done | Adds IN_PROGRESS to status CHECK |
| `db/migration/V15__convert_elo_to_decimal.sql` | Done | elo_rating → DECIMAL |
| `db/migration/V16__create_result_votes_table.sql` | Done | result_votes table |
| `db/migration/V17__add_avatar_data_to_users.sql` | Done | avatar_data TEXT column on users |
| `db/migration/V18__add_counter_proposed_state.sql` | Done | COUNTER_PROPOSED to status CHECK; counter_winner_team, counter_score_team_a/b, counter_reported_by_user_id |
| `db/migration/V19__add_push_token_to_users.sql` | Done | push_token VARCHAR(500) on users |
| `db/migration/V20__add_role_to_users.sql` | Done | role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')) |
| `db/migration/V21__add_disputed_at_auto_resolved_to_game_results.sql` | Done | disputed_at TIMESTAMP, auto_resolved BOOLEAN DEFAULT FALSE on game_results |
| `db/migration/V25__add_session_type_fields.sql` | Done | target_pace VARCHAR(200), grade_min/grade_max VARCHAR(20) on game_sessions |
| `db/migration/V26__add_pb_update_submitted.sql` | Done | pb_update_submitted BOOLEAN NOT NULL DEFAULT FALSE on game_participants |
| `db/migration/V27__add_session_acknowledged.sql` | Done | session_acknowledged BOOLEAN NOT NULL DEFAULT FALSE on game_participants |
| `db/migration/V28__add_cancellation_reason_insufficient_players.sql` | Done | cancellation_reason_insufficient_players BOOLEAN NOT NULL DEFAULT FALSE on game_sessions |
| `games/entity/GameSession.java` | Done | targetPace, gradeMin, gradeMax, cancellationReasonInsufficientPlayers fields |
| `games/entity/GameParticipant.java` | Done | pbUpdateSubmitted + sessionAcknowledged fields, @Builder.Default false |
| `games/dto/CreateGameSessionRequest.java` | Done | targetPace, gradeMin, gradeMax fields added |
| `games/dto/GameSessionResponse.java` | Done | sportSlug, ratingType, targetPace, gradeMin, gradeMax added; from() updated |
| `games/dto/GameParticipantResponse.java` | Done | pbUpdateSubmitted + sessionAcknowledged fields |
| `games/service/GameSessionService.java` | Done | ELO-only minLevel/maxLevel; new fields in builder; getPendingResults with 4 types |
| `games/service/GameParticipationService.java` | Done | ELO guard on level check; markPbSubmitted() added |
| `games/service/GameSessionStatusService.java` | Done | PERFORMANCE_BASED push to participants afterCommit on COMPLETED |
| `games/controller/GameParticipationController.java` | Done | POST /{sessionId}/pb-submitted + PATCH /{sessionId}/acknowledge endpoints |
| `auth/entity/User.java` | Done | Added avatarData TEXT, pushToken VARCHAR(500), role VARCHAR(20) fields |
| `auth/dto/RegisterRequest.java` | Done | Added optional avatarData field |
| `auth/service/AuthService.java` | Done | Passes avatarData to User builder |
| `users/controller/UserProfileController.java` | Done | GET /{userId}/profile, PATCH /me/profile, GET /me/active-sessions, GET /me/pending-results |
| `users/service/UserProfileService.java` | Done | getProfile (includes role), updateProfile (splits displayName → firstName/lastName) |
| `users/dto/UserProfileResponse.java` | Done | userId, displayName, avatarData, sports[], coachProfiles[], role |
| `users/dto/UpdateProfileRequest.java` | Done | displayName?, avatarData? |
| `elo/service/EloTransactionalService.java` | Done | Inner @Transactional bean to avoid @Async self-invocation proxy issue |
| `notifications/service/PushNotificationService.java` | Done | @Async sendToUser, DeviceNotRegistered token clearing |
| `notifications/dto/SavePushTokenRequest.java` | Done | token field |
| `admin/controller/AdminController.java` | Done | GET /disputes, POST /disputes/{id}/resolve, GET /sessions |
| `admin/service/AdminService.java` | Done | requireAdmin(), resolveDispute, resolveDisputeCore, getDisputes, getAllSessions |
| `admin/dto/AdminDisputeResponse.java` | Done | Full dispute context including both score proposals and participant list |
| `admin/dto/ResolveDisputeRequest.java` | Done | winnerTeam, scoreTeamA, scoreTeamB |
| `games/entity/ResultStatus.java` | Done | PENDING_CONFIRMATION, COUNTER_PROPOSED, CONFIRMED, DISPUTED |
| `games/entity/GameResult.java` | Done | Counter fields + disputedAt + autoResolved added |
| `games/repository/GameResultRepository.java` | Done | findUnresolvedDisputesOlderThan, findAllByStatusOrderByReportedAtDesc |
| `games/repository/GameParticipantRepository.java` | Done | findFirstBySessionIdAndTeamOrderByJoinedAtAsc |
| `games/dto/GameParticipantResponse.java` | Done | isCapt boolean field, overloaded from(p) and from(p, isCapt) |
| `games/dto/GameResultResponse.java` | Done | Added disputedAt field |
| `games/service/GameSessionService.java` | Done | buildResponse computes isCapt in-memory (host=A capt, earliest TEAM_B joinedAt=B capt) |
| `games/service/DisputeResolutionScheduler.java` | Done | Hourly cron, per-game @Transactional resolveOne(), auto-resolve push afterCommit |

---

## What NOT to Build Yet

Coach booking/payment, social feed. Auth, users, game sessions, ELO engine, admin role, push notifications, and dispute-reform are all done — next feature TBD.

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
- `UserProfileResponse` shape: `{ userId, displayName, avatarUrl, avatarData, sports[], coachProfiles[] }` — mobile auth store depends on this
- `AuthResponse` does NOT include userId — mobile decodes the JWT `sub` claim client-side
- `GET /api/v1/game-sessions/{id}/result` must return 404 (not 200 with null) when no result exists — mobile catches this as "no result"
- `PendingResultResponse` must include `locationName` and `participantCount` — mobile sheet card displays both
- `PATCH /api/v1/users/me/profile` — null `avatarData` in body clears the avatar; omitting the field does NOT clear it (record semantics)

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
