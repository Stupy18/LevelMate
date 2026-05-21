## 1. Flyway Migrations

- [x] 1.1 Write V7__create_game_sessions_table.sql — `id UUID PK`, `sport_id UUID FK→sports`, `host_user_id UUID FK→users`, `title VARCHAR(200)`, `description TEXT`, `status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN','FULL','CANCELLED','COMPLETED')) DEFAULT 'OPEN'`, `scheduled_at TIMESTAMPTZ NOT NULL`, `duration_minutes INT`, `min_players INT NOT NULL CHECK(>=2)`, `max_players INT NOT NULL CHECK(>=min_players)`, `min_level INT CHECK(1-10)`, `max_level INT CHECK(1-10)`, `location_address VARCHAR(500)`, `location_lat DECIMAL(9,6)`, `location_lng DECIMAL(9,6)`, `location_name VARCHAR(200)`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`; index on `(sport_id, status, scheduled_at)`
- [x] 1.2 Write V8__create_game_participants_table.sql — `id UUID PK`, `session_id UUID FK→game_sessions ON DELETE CASCADE`, `user_id UUID FK→users ON DELETE CASCADE`, `role VARCHAR(10) NOT NULL CHECK (role IN ('HOST','PLAYER'))`, `team VARCHAR(10) CHECK (team IN ('TEAM_A','TEAM_B'))`, `joined_at TIMESTAMPTZ NOT NULL DEFAULT now()`; UNIQUE(session_id, user_id); index on `(session_id)`
- [x] 1.3 Write V9__create_game_results_table.sql — `id UUID PK`, `session_id UUID FK→game_sessions ON DELETE CASCADE UNIQUE`, `reported_by_user_id UUID FK→users`, `confirmed_by_user_id UUID FK→users`, `winner_team VARCHAR(10) CHECK (winner_team IN ('TEAM_A','TEAM_B','DRAW'))`, `score_team_a INT`, `score_team_b INT`, `status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING_CONFIRMATION','CONFIRMED','DISPUTED'))`, `reported_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `confirmed_at TIMESTAMPTZ`

## 2. Enums

- [x] 2.1 Create `SessionStatus` enum — `OPEN, FULL, CANCELLED, COMPLETED`
- [x] 2.2 Create `ParticipantRole` enum — `HOST, PLAYER`
- [x] 2.3 Create `TeamSide` enum — `TEAM_A, TEAM_B`
- [x] 2.4 Create `WinnerTeam` enum — `TEAM_A, TEAM_B, DRAW`
- [x] 2.5 Create `ResultStatus` enum — `PENDING_CONFIRMATION, CONFIRMED, DISPUTED`

## 3. JPA Entities

- [x] 3.1 Create `GameSession` entity — maps to `game_sessions`; `@Enumerated(EnumType.STRING)` on `status`; ManyToOne to `Sport` and `User` (host)
- [x] 3.2 Create `GameParticipant` entity — maps to `game_participants`; ManyToOne to `GameSession` and `User`; `@Enumerated` on `role` and `team`
- [x] 3.3 Create `GameResult` entity — maps to `game_results`; ManyToOne to `GameSession`, `User` (reporter), `User` (confirmer); `@Enumerated` on `winnerTeam`, `status`

## 4. Repositories

- [x] 4.1 Create `GameSessionRepository extends JpaRepository<GameSession, UUID>` — add `findAllByStatusAndSportId(SessionStatus, UUID, Pageable)`, bounding-box query method (or `@Query`), `existsById`
- [x] 4.2 Create `GameParticipantRepository extends JpaRepository<GameParticipant, UUID>` — add `findAllBySessionId(UUID)`, `findBySessionIdAndUserId(UUID, UUID)`, `existsBySessionIdAndUserId(UUID, UUID)`, `countBySessionId(UUID)`, `deleteBySessionIdAndUserId(UUID, UUID)`
- [x] 4.3 Create `GameResultRepository extends JpaRepository<GameResult, UUID>` — add `findBySessionId(UUID)`

## 5. DTOs and Exceptions

- [x] 5.1 Create request DTOs: `CreateGameSessionRequest` (Bean Validation: `@NotNull sportId`, `@Future scheduledAt`, `@Min(2) minPlayers`, `@NotNull maxPlayers`)
- [x] 5.2 Create `UpdateSessionStatusRequest` — single `status` field (String, validated against CANCELLED/COMPLETED only)
- [x] 5.3 Create `ReportResultRequest` — `winnerTeam`, `scoreTeamA`, `scoreTeamB`
- [x] 5.4 Create response DTOs: `GameSessionResponse` (includes `participantCount`, `spotsRemaining`, `participants` list), `GameParticipantResponse`, `GameResultResponse`
- [x] 5.5 Create `GameSessionSearchParams` — `sportId`, `lat`, `lng`, `radiusKm`, `minLevel`, `maxLevel`, `page`, `size`
- [x] 5.6 Add exception classes: `SessionNotFoundException`, `SportNotOnProfileException`, `InvalidScheduledDateException`, `SessionFullException`, `AlreadyJoinedException`, `LevelOutOfRangeException`, `HostCannotLeaveException`, `NotAParticipantException`, `InvalidStatusTransitionException`, `SessionNotYetPlayedException`, `SessionNotOpenException`, `ResultAlreadyReportedException`, `SessionNotCompletedException`, `SportNotEloCompetitiveException`, `ResultNotFoundException`, `InvalidResultStatusException`, `CannotConfirmOwnReportException`
- [x] 5.7 Register all new exceptions in `GlobalExceptionHandler` with appropriate HTTP status codes

## 6. ELO Stub

- [x] 6.1 Create `EloService` stub in `games` package (or a `common` interface) — single method `onResultConfirmed(UUID sessionId)` that logs `"ELO update pending for session {}"` and returns; `@Service`

## 7. Services

- [x] 7.1 Create `GameSessionService` — `createSession(userId, request)`: validate sport on profile + future date, persist session, add HOST participant, return response; `getSession(sessionId)`: fetch with participants; `searchSessions(params, pageable)`: bounding-box filter
- [x] 7.2 Create `GameSessionStatusService` — `updateStatus(sessionId, userId, newStatus)`: enforce HOST-only, enforce valid transitions, enforce `scheduled_at` in past for COMPLETED, persist
- [x] 7.3 Create `GameParticipationService` — `joinSession(sessionId, userId)`: check OPEN, not already joined, level range, max_players; add PLAYER participant; flip to FULL if needed; `leaveSession(sessionId, userId)`: check not HOST, session OPEN/FULL, remove participant, flip back to OPEN if was FULL
- [x] 7.4 Create `GameResultService` — `reportResult(sessionId, userId, request)`: check COMPLETED, ELO_COMPETITIVE, no existing result, participant check; `confirmResult(sessionId, userId)`: check PENDING, not reporter; set CONFIRMED, call EloService stub; `disputeResult(sessionId, userId)`: check PENDING, not reporter; set DISPUTED; `getResult(sessionId)`: find or 404

## 8. Controllers

- [x] 8.1 Create `GameSessionController` — `POST /api/v1/game-sessions` (201), `GET /api/v1/game-sessions` (200 paginated), `GET /api/v1/game-sessions/{sessionId}` (200)
- [x] 8.2 Create `GameSessionStatusController` (or add to GameSessionController) — `PATCH /api/v1/game-sessions/{sessionId}/status` (200)
- [x] 8.3 Create `GameParticipationController` — `POST /api/v1/game-sessions/{sessionId}/join` (200), `POST /api/v1/game-sessions/{sessionId}/leave` (204)
- [x] 8.4 Create `GameResultController` — `POST /api/v1/game-sessions/{sessionId}/result` (201), `GET /api/v1/game-sessions/{sessionId}/result` (200), `POST /api/v1/game-sessions/{sessionId}/result/confirm` (200), `POST /api/v1/game-sessions/{sessionId}/result/dispute` (200)

## 9. Update CLAUDE.md

- [x] 9.1 Update CLAUDE.md to mark `games` module as DONE and list all new files
