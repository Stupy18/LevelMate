## Context

Auth and user sport profiles are complete. The games module is the first feature that makes the platform social: users can find opponents at their skill level and record results. This design covers the `games` package, three new Flyway migrations, and the cross-module read from `users.user_sports`.

Existing constraints (all confirmed from Boot 4 experience):
- Flyway: explicit `@Bean Flyway flyway(DataSource)` — never rely on auto-configuration
- ObjectMapper: already in `AppConfig` — reuse that bean
- `ddl-auto: none` — Flyway owns schema; Hibernate must not touch it
- UUID PKs with `gen_random_uuid()`, `TIMESTAMPTZ` with `now()`
- Spring Security 7, JWT subject = user UUID string
- Migrations continue from V6 (V7, V8, V9)

## Goals / Non-Goals

**Goals:**
- Full session lifecycle: create → join → leave → cancel/complete
- Result reporting with confirm/dispute flow
- Location stored as lat/lng + free-text (bounding-box search in MVP)
- Enforce business rules in service layer (HOST-only actions, level gating, max players)
- No ELO calculation — emit a stub placeholder that the future `elo` module will fill

**Non-Goals:**
- ELO recalculation (future `elo` module change)
- PostGIS / spatial indexing (plain bounding-box SQL for MVP)
- Push notifications when a session fills
- Team assignment by players (host assigns teams in a future iteration)
- Admin dispute resolution UI

## Decisions

### D1: Session status as VARCHAR(20) CHECK vs PG ENUM
**Decision**: `VARCHAR(20)` with a CHECK constraint.

**Rationale**: Same reasoning as `user_sports.rating_type` — altering a PG ENUM requires DDL locking. A CHECK constraint is updated via a normal Flyway migration. Java side uses `@Enumerated(EnumType.STRING)`.

### D2: game_participants role stored redundantly vs looking up host_user_id
**Decision**: `game_participants` has a `role` column (`HOST`/`PLAYER`) even though `game_sessions.host_user_id` already identifies the host.

**Rationale**: Queries for "who is in this session and what role do they have?" are simpler against a single table. Keeping the FK `host_user_id` on `game_sessions` allows fast host-only guards without a join to `game_participants`.

**Invariant**: `host_user_id` on `game_sessions` and the `HOST` row in `game_participants` must always agree. Enforced at the service layer on create.

### D3: One game_results row per session (UNIQUE constraint on session_id)
**Decision**: `game_results.session_id` is UNIQUE — only one result record per session.

**Rationale**: The spec allows only one active result report at a time; a second attempt is rejected with `RESULT_ALREADY_REPORTED`. Unique constraint enforces this at DB level.

### D4: Cross-module access pattern (users → games)
**Decision**: `GameParticipationService` directly injects `UserSportRepository` from the users module.

**Rationale**: This is a modular monolith. Cross-module access via direct Java injection is the documented pattern. No HTTP calls, no anti-corruption layer needed at this scale. The dependency flows one way: `games` reads from `users`, never the reverse.

### D5: Location radius search — bounding box
**Decision**: MVP uses a plain SQL bounding-box filter (`lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`). No PostGIS.

**Rationale**: PostGIS requires a PostgreSQL extension and makes the schema harder to run locally. A bounding-box is accurate enough for MVP (small over-fetch at corners). The `location_lat`/`location_lng` columns are stored as `DECIMAL(9,6)` now, so upgrading to `ST_DWithin` later is a non-breaking schema change.

### D6: ELO stub
**Decision**: After a result transitions to CONFIRMED, `GameResultService` calls a no-op `EloService.onResultConfirmed(sessionId)` stub. The stub logs a message and returns immediately.

**Rationale**: Avoids a hard dependency from `games` on an unimplemented `elo` module. The call site is already wired so the future implementation is a drop-in.

## Risks / Trade-offs

- [Bounding-box over-fetch] → Acceptable for MVP; corners ~30 % over-fetch at 50 km radius. Flag for PostGIS upgrade when user counts grow.
- [host_user_id / HOST participant redundancy] → Must be kept in sync by service; if direct DB writes bypass the service, they can diverge. Not a concern while all writes go through the API.
- [No optimistic locking on max_players check] → Two concurrent joins could both read "1 spot left" and both succeed, exceeding `max_players` by 1. Mitigation: a DB-level `CHECK` constraint on participant count is complex; for MVP accept the small race window; add `SELECT FOR UPDATE` on the session row in a future iteration.
- [DISPUTED results never auto-resolve] → Flagged for future admin review; no automated path out of DISPUTED status in this change.

## Migration Plan

1. V7 — create `game_sessions` table (additive)
2. V8 — create `game_participants` table (additive, FK to game_sessions + users)
3. V9 — create `game_results` table (additive, FK to game_sessions + users)

All additive. Rollback: drop tables in reverse order; no data loss in existing tables.
