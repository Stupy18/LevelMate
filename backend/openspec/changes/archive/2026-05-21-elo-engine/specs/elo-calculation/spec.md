## ADDED Requirements

### Requirement: ELO recalculation triggered on confirmed result
The system SHALL asynchronously recalculate ELO ratings for all participants when a game result transitions to CONFIRMED status and the sport is ELO_COMPETITIVE.

#### Scenario: Successful recalculation for ELO_COMPETITIVE sport
- **WHEN** a game result is confirmed for an ELO_COMPETITIVE sport
- **AND** all participants have a team assignment (TEAM_A or TEAM_B)
- **THEN** the system asynchronously computes each participant's ELO delta using the two-layer formula
- **AND** updates each participant's `elo_rating` and increments `games_played` in `user_sports`
- **AND** creates one `elo_history` record per participant
- **AND** all updates are committed in a single transaction (all-or-nothing)

#### Scenario: Non-ELO sport — no recalculation
- **WHEN** a game result is confirmed for a GRADE_BASED or PERFORMANCE_BASED sport
- **THEN** the system does NOT trigger ELO recalculation
- **AND** returns without error

#### Scenario: Missing team assignment — skip and warn
- **WHEN** ELO recalculation is triggered
- **AND** one or more participants have no team assignment (team = null)
- **THEN** the system logs a warning with the session ID and affected participant IDs
- **AND** does NOT update any ELO ratings for that session
- **AND** does NOT create any elo_history records for that session

#### Scenario: Either team has zero players — skip and warn
- **WHEN** ELO recalculation is triggered
- **AND** one of the two teams has no participants
- **THEN** the system logs a warning and skips the entire session without partial updates

#### Scenario: HTTP response not blocked
- **WHEN** the confirm endpoint processes a valid confirmation
- **THEN** the HTTP 200 response is returned before ELO recalculation begins
- **AND** ELO recalculation runs in a separate thread pool

### Requirement: Two-layer ELO formula applied per player
The system SHALL apply the two-layer formula: team averages determine expected outcome magnitude; individual ELO vs opposing team average determines personal delta.

#### Scenario: Team averages calculated correctly
- **WHEN** ELO recalculation runs for a session
- **THEN** avg_elo_A = mean of all TEAM_A participants' current elo_rating
- **AND** avg_elo_B = mean of all TEAM_B participants' current elo_rating

#### Scenario: Individual expected score uses opposing team average
- **WHEN** computing delta for player i on TEAM_A
- **THEN** E_i = 1 / (1 + 10^((avg_elo_B - elo_i) / 400))
- **AND** delta_i = K_i * (actual_i - E_i), where actual_i is 1 (TEAM_A wins), 0 (TEAM_A loses), or 0.5 (DRAW)
- **AND** for player j on TEAM_B, E_j uses avg_elo_A as the opposing average

#### Scenario: K-factor tier applied per player
- **WHEN** computing K_i for a player
- **AND** the player has fewer than 30 games_played
- **THEN** K_i = 32

#### Scenario: K-factor 24 for established player below 2000 ELO
- **WHEN** the player has 30 or more games_played
- **AND** the player's current ELO is below 2000
- **THEN** K_i = 24

#### Scenario: K-factor 16 for established high-rated player
- **WHEN** the player has 30 or more games_played
- **AND** the player's current ELO is 2000 or above
- **THEN** K_i = 16

#### Scenario: ELO floor enforced
- **WHEN** the computed new ELO for any player is below 100
- **THEN** the system stores 100 as the new ELO (floor applied)
- **AND** the elo_history record stores the actual delta and the floored elo_after

#### Scenario: Draw result — both sides use actual = 0.5
- **WHEN** the game result winner_team is DRAW
- **THEN** actual_i = 0.5 for every participant regardless of team
- **AND** players with ELO above opposing average lose a small amount; players below gain a small amount
