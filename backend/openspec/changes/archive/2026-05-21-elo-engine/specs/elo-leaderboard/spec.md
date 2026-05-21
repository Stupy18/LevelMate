## ADDED Requirements

### Requirement: Sport leaderboard returns top 50 players by ELO
The system SHALL expose a public leaderboard returning the top 50 users by ELO rating for a given sport, ordered descending.

#### Scenario: Successful leaderboard retrieval
- **WHEN** an authenticated user sends GET /api/v1/sports/{sportId}/leaderboard
- **AND** the sport is ELO_COMPETITIVE
- **THEN** the system returns HTTP 200 with an array of up to 50 entries ordered by elo_rating descending
- **AND** each entry contains userId, displayName (user's name field), elo, gamesPlayed

#### Scenario: Fewer than 50 players
- **WHEN** fewer than 50 users have the sport on their profile
- **THEN** the system returns all available users ordered by elo_rating descending

#### Scenario: Sport not ELO_COMPETITIVE
- **WHEN** an authenticated user sends GET /api/v1/sports/{sportId}/leaderboard
- **AND** the sport's ratingType is not ELO_COMPETITIVE
- **THEN** the system returns HTTP 422 with errorCode SPORT_NOT_ELO_COMPETITIVE

#### Scenario: Sport not found
- **WHEN** the sportId does not correspond to any sport in the system
- **THEN** the system returns HTTP 404 with errorCode SPORT_NOT_FOUND
