## Context

`EloService.onResultConfirmed(UUID sessionId)` is a one-line stub that logs a message and returns. Every confirmed game result leaves all ELO ratings unchanged. The `user_sports` table has no `games_played` column, so K-factor tiers cannot be computed. No `elo_history` table exists. This design introduces the real ELO calculation engine inside a new `elo` module.

Current state:
- `games/service/EloService.java` — stub in the `games` package, injected by `GameResultService`
- `users/entity/UserSport.java` — has `eloRating` (nullable INT) but no `gamesPlayed`
- `game_participants` — has `team` column (TEAM_A / TEAM_B, nullable)

## Goals / Non-Goals

**Goals:**
- Implement the two-layer ELO formula exactly as specced (team expected outcome → individual delta)
- Apply per-player K-factor tiers based on `games_played` and current ELO
- Execute recalculation asynchronously so the confirm HTTP response is never blocked
- Persist all updates (user_sports ELO + games_played, elo_history) in one transaction — all or nothing
- Expose paginated ELO history and a top-50 leaderboard endpoint

**Non-Goals:**
- Real-time leaderboard with caching / Redis
- ELO for GRADE_BASED or PERFORMANCE_BASED sports
- Retroactive recalculation of past sessions
- Admin manual ELO correction

## Decisions

### D1 — New `elo` module, not extending `games`
Move `EloService` into `com.Levelmate.backend.elo.service`. The `games` module keeps a thin `EloService` interface (or the old stub is replaced by a proper bean in the `elo` package). `GameResultService` depends on the ELO service via injection — no circular dependency because `elo` → `games` (read-only data) and `games` → `elo` (trigger call).

**Alternatives considered:**
- Keep everything in `games` — rejected: mixing result management and rating maths violates single responsibility
- Pure interface in `common` — over-engineering for a monolith; direct injection is fine

### D2 — Spring @Async with explicit ThreadPoolTaskExecutor
Spring Boot 4 does not auto-configure an `AsyncTaskExecutor` bean named `taskExecutor`. Without explicit configuration, `@Async` falls back to `SimpleAsyncTaskExecutor` (one thread per call, no pool). Use `@EnableAsync` on a dedicated `AsyncConfig` class and define a `ThreadPoolTaskExecutor` bean with a sensible pool size (core=2, max=4, queue=50).

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean(name = "eloTaskExecutor")
    public Executor eloTaskExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(4);
        ex.setQueueCapacity(50);
        ex.setThreadNamePrefix("elo-");
        ex.initialize();
        return ex;
    }
}
```

`@Async("eloTaskExecutor")` is placed on the public method in `EloCalculationService`.

**Alternatives considered:**
- `SimpleAsyncTaskExecutor` — rejected: unbounded threads under load
- Spring Events (`@EventListener`) — cleaner decoupling but adds indirection with no benefit in a monolith

### D3 — @Transactional on async method, separate from confirm transaction
The confirm transaction commits first (HTTP 200 returns). The async ELO method runs in a **new** transaction (default `REQUIRED` creates a new one since there is no active transaction in the async thread). This is the correct pattern: if ELO calculation fails, the result stays CONFIRMED and ELO retries can be added later without undoing the confirmation.

**Alternatives considered:**
- Same transaction — impossible; async method runs in a different thread
- `REQUIRES_NEW` — redundant in an async context; `REQUIRED` achieves the same result

### D4 — Two-layer formula implementation
Layer 1: compute `avgEloA` and `avgEloB` from current `user_sports.elo_rating`. Use these to compute team-level expected scores `E_A`, `E_B` (not used for individual deltas — only for reference).

Layer 2: for each player `i` on `TEAM_A`, compute `E_i` using `avgEloB` as the opposing average. For each player `j` on `TEAM_B`, compute `E_j` using `avgEloA`. K-factor is determined before delta calculation:

| Condition | K |
|---|---|
| `games_played < 30` | 32 |
| `games_played >= 30`, `elo < 2000` | 24 |
| `games_played >= 30`, `elo >= 2000` | 16 |

ELO floor: `max(100, currentElo + delta)`.

### D5 — All-or-nothing via single @Transactional save
Collect all updated `UserSport` rows and all `EloHistory` rows in memory, then save them all in one batch inside the `@Transactional` method. Any persistence exception rolls back everything. No partial update is possible.

### D6 — Missing team assignment: warn and skip entirely
If any participant has `team = null`, log a warning with the session ID and participant IDs, then return without touching any ELO. This is the "all or nothing" principle applied to the precondition check.

## Risks / Trade-offs

- **[Risk] ELO calculation fails silently in async thread** → Mitigation: catch and log all exceptions at the top of the async method; add a `WARN` log with session ID so operators can investigate. Future work: store error state on the session or a dead-letter table.
- **[Risk] Participants join a session late and have `team = null`** → Mitigation: current join flow does not assign teams; team assignment is a future feature. The skip-on-null rule handles this cleanly.
- **[Risk] `avgEloA` or `avgEloB` is NaN if a team has 0 players** → Mitigation: validate that both teams are non-empty before calculation; if either is empty, skip with a warning.
- **[Trade-off] Async means ELO lags the confirmation by milliseconds to seconds** → Acceptable: the spec explicitly requires async to avoid blocking the HTTP response.

## Migration Plan

1. Deploy V11 migration (`games_played INT DEFAULT 0` on `user_sports`) — backward compatible, existing rows get 0.
2. Deploy V12 migration (create `elo_history` table) — new table, no data migration needed.
3. New `elo` module is additive; `EloService` stub in `games` is replaced by the real bean.
4. No rollback complexity — V11/V12 can be reverted by dropping the column/table if needed before any data is written.
