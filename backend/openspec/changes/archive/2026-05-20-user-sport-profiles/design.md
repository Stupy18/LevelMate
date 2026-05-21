## Context

Auth is complete. The backend has users and JWT, but no domain data. The next layer is sport profiles: what sports a user plays, at what level, whether they coach, and their personal bests. This data drives matchmaking and profile display. All new code lives in a `users` module alongside auth.

Existing constraints:
- Spring Boot 4.0.6, Spring Security 7, Hibernate ORM 7.2.12, Flyway manual config
- UUID PKs with `gen_random_uuid()`, `TIMESTAMPTZ` with `now()`, `ddl-auto: none`
- JWT auth: access token carries `sub` (UUID) and `email`; all mutating endpoints validate that `userId` path param equals the token's subject
- Flyway migrations run from V3 onward (V1=users, V2=refresh_tokens already done)

## Goals / Non-Goals

**Goals:**
- Seed 10+ sports covering all three rating types so the front end has real data immediately
- Expose CRUD for user sport entries, coach profiles, and personal bests via REST
- Enforce ownership: a user can only write to their own profile data
- Keep domain logic in service layer; controllers are thin

**Non-Goals:**
- Matchmaking or session scheduling (later change)
- Sport image upload or media attachments
- Admin CRUD for the sports catalog (seed-only for now)
- Rating calculation or ELO algorithms (data storage only)

## Decisions

### D1: Rating type as a PostgreSQL ENUM vs VARCHAR
**Decision**: `VARCHAR(30)` with a CHECK constraint rather than a PG ENUM.

**Rationale**: Adding a value to a PG ENUM requires `ALTER TYPE`, which is DDL-level and can lock the table. A CHECK constraint is updated via a Flyway migration on the column and is simpler. The Java side uses a `@Enumerated(EnumType.STRING)` JPA enum.

### D2: sport-type-specific columns on user_sports vs separate tables
**Decision**: All three rating-type fields co-exist as nullable columns on `user_sports` (`elo_rating INT`, `grade VARCHAR(20)`, `performance_seconds BIGINT`). A CHECK constraint ensures only the column matching the sport's `rating_type` is non-null.

**Rationale**: Three separate tables (EloEntry, GradeEntry, PerformanceEntry) would require a polymorphic join and add complexity. With only three types and all nullable, the table stays readable and queries stay simple. Enforced at DB level.

**Alternative considered**: Separate rating tables with FK to user_sports — rejected due to extra joins with no benefit at this data scale.

### D3: performance_pbs as a separate table
**Decision**: Personal bests live in `performance_pbs` (sport, user, distance_meters, time_seconds, recorded_at) rather than a single "best" column on user_sports.

**Rationale**: Users accumulate multiple PBs over time (different distances: 5K, 10K, marathon). A separate table with `(user_id, sport_id, distance_meters)` unique key lets the app store one PB per user/sport/distance combination.

### D4: coach_profiles ownership model
**Decision**: `coach_profiles` is `(user_id, sport_id)` composite unique — one coaching profile per user per sport.

**Rationale**: A coach might offer tennis AND padel lessons; they are separate profiles with separate descriptions and prices.

### D5: Authorization check placement
**Decision**: Ownership validation (path `userId` == JWT subject) is done in the service layer, not a Spring Security filter.

**Rationale**: Only a handful of endpoints need this, and the check is a simple UUID equality. A filter would need to parse path variables for every request. Service-layer check is explicit and testable.

## Risks / Trade-offs

- [nullable columns on user_sports] → CHECK constraint prevents invalid combinations; application layer must also set the right field when creating/updating
- [Flyway seeding sports data] → if seed data needs to change post-deploy, a new migration (V3b or later) is required; seed is immutable once deployed
- [no soft-delete on user_sports] → removing a sport is a hard delete; data is gone. Acceptable for MVP since no analytics yet.

## Migration Plan

1. V3: Create `sports` table + seed 10+ rows — no app downtime, additive only
2. V4: Create `user_sports` table — additive, FK on `users`
3. V5: Create `coach_profiles` table — additive, FK on `users` and `sports`
4. V6: Create `performance_pbs` table — additive, FK on `users` and `sports`

All migrations are additive (no column drops, no table renames). Rollback: drop the new tables in reverse order; no data loss in existing tables.
