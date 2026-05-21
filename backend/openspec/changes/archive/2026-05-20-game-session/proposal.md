## Why

Users have sport profiles but no way to find or organise actual games. The game session feature is the first social layer of LevelMate: it lets users create matchmaking sessions, fill spots, and record results — unlocking ELO progression for competitive sports.

## What Changes

- New `game_sessions` table: scheduled sessions per sport with player count limits and optional skill-level filter
- New `game_participants` table: tracks who has joined each session, their role (HOST/PLAYER), and optional team assignment
- New `game_results` table: stores reported scores/winner and tracks the confirm/dispute flow
- REST API under `/api/v1/game-sessions` for full session lifecycle
- Session status machine: `OPEN → FULL → CANCELLED / COMPLETED`
- Result reporting flow: `PENDING_CONFIRMATION → CONFIRMED / DISPUTED`
- Location stored as free-text address + optional lat/lng (bounding-box search for MVP)
- ELO recalculation is explicitly **out of scope** here — a `CONFIRMED` result fires a stub call; the `elo` module will implement it in a future change

## Capabilities

### New Capabilities

- `game-session-lifecycle`: create, view, search, and manage status of game sessions (CRUD + status transitions)
- `game-session-participation`: join, leave, and retrieve participants for a session
- `game-session-results`: report, confirm, and dispute game results for ELO_COMPETITIVE sessions

### Modified Capabilities

## Impact

- **New Flyway migrations**: V7 (game_sessions), V8 (game_participants), V9 (game_results)
- **New JPA entities**: GameSession, GameParticipant, GameResult
- **New Spring MVC controllers**: GameSessionController (lifecycle + search), GameParticipationController (join/leave), GameResultController (report/confirm/dispute)
- **New service layer**: GameSessionService, GameParticipationService, GameResultService
- **Cross-module read**: GameParticipationService reads `user_sports` from the users module to verify sport is on the user's profile and check skill level range
- **Security**: all write endpoints require authentication; HOST-only actions (cancel, complete) enforce role check in service
- **Dependencies**: no new Maven dependencies; location radius search uses plain SQL bounding-box arithmetic (no PostGIS)
