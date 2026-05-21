## 1. Flyway Migrations

- [x] 1.1 Write V11__add_games_played_to_user_sports.sql — `ALTER TABLE user_sports ADD COLUMN games_played INT NOT NULL DEFAULT 0`
- [x] 1.2 Write V12__create_elo_history_table.sql — `id UUID PK`, `user_id UUID FK→users`, `sport_id UUID FK→sports`, `session_id UUID FK→game_sessions`, `elo_before INT NOT NULL`, `elo_delta INT NOT NULL`, `elo_after INT NOT NULL`, `recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()`; index on `(user_id, sport_id, recorded_at DESC)`

## 2. Entity and Repository Updates

- [x] 2.1 Add `gamesPlayed` field to `UserSport` entity — `@Column(name = "games_played") private int gamesPlayed = 0;`
- [x] 2.2 Create `EloHistory` entity in `elo/entity/` — maps to `elo_history`; ManyToOne to User, Sport, GameSession; fields: `eloBefore`, `eloDelta`, `eloAfter`, `recordedAt`; `@PrePersist` sets `recordedAt`
- [x] 2.3 Create `EloHistoryRepository extends JpaRepository<EloHistory, UUID>` — add `findAllByUserIdAndSportIdOrderByRecordedAtDesc(UUID, UUID, Pageable)` and `countByUserIdAndSportId(UUID, UUID)`
- [x] 2.4 Add leaderboard query to `UserSportRepository` — `@Query` returning top 50 by `elo_rating DESC` for a given sportId where `elo_rating IS NOT NULL`; return type `List<UserSport>`

## 3. Async Configuration

- [x] 3.1 Create `AsyncConfig.java` in `common/` (or `elo/config/`) — `@Configuration @EnableAsync`; define `@Bean(name = "eloTaskExecutor") Executor eloTaskExecutor()` with `ThreadPoolTaskExecutor` (corePoolSize=2, maxPoolSize=4, queueCapacity=50, threadNamePrefix="elo-")

## 4. ELO Calculation Service

- [x] 4.1 Create `EloCalculationService` in `elo/service/` — `@Service`; inject `GameParticipantRepository`, `UserSportRepository`, `EloHistoryRepository`, `GameSessionRepository`
- [x] 4.2 Implement `@Async("eloTaskExecutor") @Transactional public void calculateAndApply(UUID sessionId, WinnerTeam winner)` — entry point called from `EloService`
- [x] 4.3 Implement precondition checks inside `calculateAndApply`: load session participants; validate all have team assignment; validate both teams non-empty; if sport not ELO_COMPETITIVE log and return
- [x] 4.4 Implement Layer 1: compute `avgEloA` and `avgEloB` from participants' current `elo_rating` (treat null elo as 1000 — initial rating)
- [x] 4.5 Implement Layer 2 + K-factor: for each participant compute `E_i`, `actual_i`, K-factor (32/24/16 based on `gamesPlayed` and current ELO), `delta_i = K * (actual - E_i)`, new ELO = `max(100, currentElo + delta_i)` (round delta to nearest int)
- [x] 4.6 Persist all updates in batch: save all updated `UserSport` rows (new ELO + increment gamesPlayed); save all `EloHistory` rows; everything within the single `@Transactional` method

## 5. EloService Replacement

- [x] 5.1 Delete (or replace) `games/service/EloService.java` — move the class to `elo/service/EloService.java`; inject `EloCalculationService`; implement `onResultConfirmed(UUID sessionId, WinnerTeam winner)` which calls `eloCalculationService.calculateAndApply(sessionId, winner)` (async dispatch)
- [x] 5.2 Update `GameResultService` to pass `WinnerTeam` to `EloService.onResultConfirmed` — change the call site from `eloService.onResultConfirmed(sessionId)` to `eloService.onResultConfirmed(sessionId, result.getWinnerTeam())`

## 6. ELO History Endpoint

- [x] 6.1 Create `EloHistoryResponse` record in `elo/dto/` — fields: `UUID sessionId`, `int eloBefore`, `int eloDelta`, `int eloAfter`, `Instant recordedAt`; static `from(EloHistory)` factory
- [x] 6.2 Create `EloHistoryPageResponse` record — fields: `Integer currentElo`, `int gamesPlayed`, `Page<EloHistoryResponse> history`
- [x] 6.3 Create `EloHistoryController` in `elo/controller/` — `GET /api/v1/users/{userId}/sports/{sportId}/elo-history`; ownership check (JWT subject == userId); validate sport is ELO_COMPETITIVE; return paginated history with currentElo and gamesPlayed

## 7. ELO Leaderboard Endpoint

- [x] 7.1 Create `LeaderboardEntryResponse` record in `elo/dto/` — fields: `UUID userId`, `String displayName`, `int elo`, `int gamesPlayed`; built from `UserSport` (access `user.getName()` or equivalent display name)
- [x] 7.2 Create `EloLeaderboardController` in `elo/controller/` — `GET /api/v1/sports/{sportId}/leaderboard`; validate sport exists and is ELO_COMPETITIVE; return top 50 from `UserSportRepository` leaderboard query

## 8. Exception Handling

- [x] 8.1 Ensure `SportNotEloCompetitiveException` is used (already exists) for both history and leaderboard endpoints when sport is not ELO_COMPETITIVE — no new exception needed

## 9. Update CLAUDE.md

- [x] 9.1 Update CLAUDE.md to mark `elo` module as DONE — add endpoints, file list, and key notes (async config, formula, K-factor tiers, ELO floor)
