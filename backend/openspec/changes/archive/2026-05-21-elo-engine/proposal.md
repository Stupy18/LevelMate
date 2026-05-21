## Why

Game results can be confirmed but ELO ratings are never updated — `EloService.onResultConfirmed()` is a stub that only logs. The platform cannot deliver on its core promise of skill-matched sessions without accurate, live ELO ratings per sport.

## What Changes

- Replace the `EloService` stub with a real async implementation that applies the two-layer ELO formula
- Add `games_played INT DEFAULT 0` column to `user_sports` (drives K-factor selection)
- Create `elo_history` table to record every ELO change for auditability and profile display
- Expose a paginated ELO history endpoint per user+sport
- Expose a top-50 leaderboard endpoint per sport

## Capabilities

### New Capabilities
- `elo-calculation`: Two-layer ELO formula — team expected outcome drives magnitude, individual ELO vs opposing team average drives personal delta. K-factor tiers by games_played and current ELO. ELO floor at 100. Fully transactional, async via Spring @Async.
- `elo-history`: Per-user-sport history of ELO changes (before/delta/after per session). Paginated endpoint at GET /api/v1/users/{userId}/sports/{sportId}/elo-history.
- `elo-leaderboard`: Top-50 players by ELO for a sport. GET /api/v1/sports/{sportId}/leaderboard.

### Modified Capabilities
- `game-session-results`: Confirmed result now triggers real ELO recalculation (implementation change to the existing stub call — no requirement change).

## Impact

- `games/service/EloService.java` — replaced entirely
- `users/entity/UserSport.java` — new `gamesPlayed` field
- New `elo/` module: entity `EloHistory`, repository `EloHistoryRepository`, service `EloCalculationService`, controller `EloHistoryController`, controller `EloLeaderboardController`
- New migrations: V11 (add games_played to user_sports), V12 (create elo_history table)
- `AsyncConfig.java` — explicit `@EnableAsync` + `ThreadPoolTaskExecutor` bean (required for Spring Boot 4 — not auto-configured)
- No API breaking changes; new endpoints only
