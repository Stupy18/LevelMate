# elo-engine Specification

## Purpose
Calculate and update individual ELO ratings for all participants after a
game result is CONFIRMED. Uses a two-layer formula: team-level expected
outcome drives the magnitude of gain/loss, and individual ELO vs opposing
team average drives each player's personal delta.

Only applies to ELO_COMPETITIVE sports. GRADE_BASED and PERFORMANCE_BASED
sports are ignored by this module.

## ELO Formula

### Layer 1 — Team expected outcome
Calculate the average ELO of each team from current participant ratings.
Use standard ELO expected score formula with team averages:

```
avg_elo_A = mean(elo of all TEAM_A participants)
avg_elo_B = mean(elo of all TEAM_B participants)

E_A = 1 / (1 + 10^((avg_elo_B - avg_elo_A) / 400))
E_B = 1 - E_A
```

This determines whether the outcome was expected or an upset.
If the stronger team loses, the magnitude of loss is larger.

### Layer 2 — Individual delta
For each player, calculate their personal expected score against the
OPPOSING team's average ELO (not their own team's average):

```
For player i on TEAM_A:
  E_i = 1 / (1 + 10^((avg_elo_B - elo_i) / 400))
  actual_i = 1 (win), 0 (loss), 0.5 (draw)
  delta_i = K_i * (actual_i - E_i)
```

### K Factor (sensitivity)
K factor controls how much each game affects rating.
Higher K = faster movement, used for new players.
Lower K = more stable, used for established high-rated players.

| Condition | K Factor |
|---|---|
| Fewer than 30 games played | 32 |
| 30+ games, ELO below 2000 | 24 |
| 30+ games, ELO 2000 or above | 16 |

### Example
Team A average ELO: 1200 (favoured)
Team B average ELO: 1000 (underdog)
Result: Team B wins (upset)

Player X on Team A, ELO 1400, K=24:
- E_X = 1 / (1 + 10^((1000-1400)/400)) = 0.91
- delta_X = 24 * (0 - 0.91) = **-22 points** (high ELO, big loss)

Player Y on Team A, ELO 900, K=32:
- E_Y = 1 / (1 + 10^((1000-900)/400)) = 0.36
- delta_Y = 32 * (0 - 0.36) = **-12 points** (low ELO, smaller loss)

Player Z on Team B, ELO 800, K=32:
- E_Z = 1 / (1 + 10^((1200-800)/400)) = 0.09
- delta_Z = 32 * (1 - 0.09) = **+29 points** (big upset win, large gain)

### Draw handling
For draws, actual_i = 0.5 for all players on both teams.
Players with ELO above the opposing team average lose a small amount.
Players with ELO below the opposing team average gain a small amount.

### ELO floor
ELO cannot drop below 100. Apply max(100, new_elo) after calculation.

## Requirements

### Requirement: Trigger ELO recalculation on confirmed result
The system SHALL recalculate ELO for all participants when a game result
is confirmed.

#### Scenario: ELO recalculation triggered
- GIVEN a game result transitions to CONFIRMED status
- AND the sport is ELO_COMPETITIVE
- AND all participants have a team assignment (TEAM_A or TEAM_B)
- WHEN the confirmation is saved
- THEN asynchronously trigger ELO recalculation for all participants
- AND update each participant's elo in user_sports
- AND create an elo_history record for each participant
- AND increment games_played on user_sports for each participant

#### Scenario: Non-competitive sport — skip
- GIVEN a game result transitions to CONFIRMED status
- AND the sport is GRADE_BASED or PERFORMANCE_BASED
- WHEN the confirmation is saved
- THEN do NOT trigger ELO recalculation
- AND return without error

#### Scenario: Missing team assignment
- GIVEN one or more participants have no team assignment (team = null)
- WHEN ELO recalculation is triggered
- THEN log a warning and skip ELO update for that session
- AND do NOT partially update some players and not others (all or nothing)

### Requirement: ELO history
The system SHALL record every ELO change for auditability and profile display.

#### Scenario: History record created
- GIVEN a successful ELO recalculation
- WHEN each player's ELO is updated
- THEN create an elo_history record storing old ELO, delta, new ELO,
  and a reference to the game session

### Requirement: Games played counter
The system SHALL track how many ELO-eligible games each user has played
per sport, to determine the correct K factor.

## Data Model

### user_sports table additions
Add the following columns to the existing user_sports table:
| Column | Type | Notes |
|---|---|---|
| games_played | INT | Default 0, incremented after each confirmed result |

### elo_history table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id |
| sport_id | UUID | FK → sports.id |
| session_id | UUID | FK → game_sessions.id |
| elo_before | INT | ELO before this game |
| elo_delta | INT | Change (positive or negative) |
| elo_after | INT | ELO after this game |
| recorded_at | TIMESTAMP | Not null |

## Implementation Notes

### Async execution
ELO recalculation MUST be async — do not block the HTTP response that
confirms the result. Use Spring @Async with a dedicated thread pool.
The confirmation endpoint returns 200 immediately; ELO updates happen
in the background.

### Transactional integrity
All ELO updates for a session MUST be committed in a single transaction.
If any player's update fails, roll back all updates for that session.
Use @Transactional on the ELO calculation service method.

### Calculation order
1. Load all participants and their current ELO from user_sports
2. Separate into TEAM_A and TEAM_B lists
3. Calculate avg_elo_A and avg_elo_B
4. For each player, calculate E_i and delta_i
5. Apply ELO floor (minimum 100)
6. Determine K factor per player based on games_played and current ELO
7. Save all updated user_sports rows
8. Save all elo_history rows
9. Increment games_played for all participants
10. Commit transaction

## API Contract

### GET /api/v1/users/{userId}/sports/{sportId}/elo-history
Returns paginated ELO history for a user in a specific sport.
**Query params:** page, size (default 20)
**Response 200:**
```json
{
  "currentElo": 1247,
  "gamesPlayed": 34,
  "history": [
    {
      "sessionId": "uuid",
      "eloBefore": 1230,
      "eloDelta": 17,
      "eloAfter": 1247,
      "recordedAt": "2026-05-20T19:00:00Z"
    }
  ]
}
```

### GET /api/v1/sports/{sportId}/leaderboard
Returns top 50 players by ELO for a sport in the system.
**Response 200:** Array of { userId, displayName, elo, gamesPlayed }
