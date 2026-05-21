# game-session Specification

## Purpose
Allow users to create, discover, and join sport game sessions.
After a session completes, any participant can report the result,
and the opposing side confirms. Confirmed results trigger ELO updates
for ELO_COMPETITIVE sports.

## Requirements

### Requirement: Create game session
The system SHALL allow an authenticated user to create a game session for a sport on their profile.

#### Scenario: Successful creation
- GIVEN an authenticated user
- AND a sport that exists in the system
- AND a future date and time
- AND a valid location (free-text address OR lat/lng coordinates, or both)
- AND a player range (min 2, max depends on sport)
- AND an optional skill level range (min_level, max_level between 1-10)
- WHEN the user creates the session
- THEN create the game session with status OPEN
- AND automatically add the creator as a participant with role HOST
- AND return the full session object

#### Scenario: Sport not on creator's profile
- GIVEN a sport that is NOT on the authenticated user's profile
- WHEN the user tries to create a session for that sport
- THEN return HTTP 400 Bad Request
- AND return error code SPORT_NOT_ON_PROFILE

#### Scenario: Date in the past
- GIVEN a scheduled_at datetime that is in the past
- WHEN the user creates the session
- THEN return HTTP 400 Bad Request
- AND return error code INVALID_SCHEDULED_DATE

### Requirement: Join game session
The system SHALL allow an authenticated user to join an OPEN game session.

#### Scenario: Successful join
- GIVEN an authenticated user
- AND an OPEN game session
- AND the user is NOT already a participant
- AND the user's sport level falls within the session's level range (if set)
- AND the session has not reached max_players
- WHEN the user joins the session
- THEN add the user as a participant with role PLAYER
- AND if max_players is now reached, set session status to FULL
- AND return the updated session object

#### Scenario: Level out of range
- GIVEN a session with a min_level and max_level set
- AND the joining user's self_reported_level for that sport is outside the range
- WHEN the user tries to join
- THEN return HTTP 403 Forbidden
- AND return error code LEVEL_OUT_OF_RANGE

#### Scenario: Session full
- GIVEN a session with status FULL
- WHEN a user tries to join
- THEN return HTTP 409 Conflict
- AND return error code SESSION_FULL

#### Scenario: User already a participant
- GIVEN a user who is already in the session
- WHEN the user tries to join again
- THEN return HTTP 409 Conflict
- AND return error code ALREADY_JOINED

### Requirement: Leave game session
The system SHALL allow a participant to leave a session they have joined,
provided the session has not yet started.

#### Scenario: Participant leaves
- GIVEN an authenticated user who is a PLAYER participant (not HOST)
- AND the session status is OPEN or FULL
- WHEN the user leaves
- THEN remove the participant record
- AND if session was FULL, set status back to OPEN
- AND return HTTP 204

#### Scenario: Host cannot leave
- GIVEN the HOST of a session
- WHEN the host tries to leave
- THEN return HTTP 403 Forbidden
- AND return error code HOST_CANNOT_LEAVE
- AND suggest cancelling the session instead

### Requirement: Cancel game session
The system SHALL allow the HOST to cancel a session.

#### Scenario: Successful cancellation
- GIVEN the HOST of an OPEN or FULL session
- WHEN the host cancels the session
- THEN set session status to CANCELLED
- AND return HTTP 200

### Requirement: Mark session as completed
The system SHALL allow the HOST to mark a session as completed after it has taken place.

#### Scenario: Mark as completed
- GIVEN the HOST of an OPEN or FULL session
- AND the scheduled_at datetime is in the past
- WHEN the host marks it completed
- THEN set session status to COMPLETED
- AND return HTTP 200

### Requirement: Report game result
The system SHALL allow any participant to report the result of a COMPLETED session.
Only applies to ELO_COMPETITIVE sports. Non-competitive sports skip this step.

#### Scenario: First participant reports result
- GIVEN a COMPLETED session for an ELO_COMPETITIVE sport
- AND no result has been reported yet
- AND the reporting user is a participant
- WHEN the user submits a result (score or winner side)
- THEN create a game_results record with status PENDING_CONFIRMATION
- AND store the reported_by user id
- AND return HTTP 201

#### Scenario: Opposing participant confirms result
- GIVEN a PENDING_CONFIRMATION result
- AND the confirming user is a participant on the opposing side
- AND the confirming user is NOT the one who reported
- WHEN the user confirms the result
- THEN set result status to CONFIRMED
- AND trigger ELO recalculation for all participants (async)
- AND return HTTP 200

#### Scenario: Opposing participant disputes result
- GIVEN a PENDING_CONFIRMATION result
- AND the disputing user is a participant on the opposing side
- WHEN the user disputes the result
- THEN set result status to DISPUTED
- AND flag the session for manual review (future admin feature)
- AND return HTTP 200

#### Scenario: Duplicate report attempt
- GIVEN a result already reported (PENDING_CONFIRMATION or CONFIRMED)
- WHEN another participant tries to report a result
- THEN return HTTP 409 Conflict
- AND return error code RESULT_ALREADY_REPORTED

### Requirement: Search and discover sessions
The system SHALL allow authenticated users to search for OPEN game sessions.

#### Scenario: Search by sport and location
- GIVEN an authenticated user
- AND a sport_id filter
- AND optional lat/lng + radius in km
- AND optional level range filter
- WHEN the user searches
- THEN return paginated OPEN sessions ordered by scheduled_at ascending
- AND include participant count and remaining spots

## Session Status Flow
```
OPEN → FULL (when max_players reached)
FULL → OPEN (when a player leaves)
OPEN/FULL → CANCELLED (host cancels)
OPEN/FULL → COMPLETED (host marks complete, scheduled_at in past)
COMPLETED → (result reported → PENDING_CONFIRMATION → CONFIRMED/DISPUTED)
```

## Data Model

### game_sessions table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sport_id | UUID | FK → sports.id |
| host_user_id | UUID | FK → users.id |
| title | VARCHAR(200) | Optional, e.g. "Sunday 3v3 basketball" |
| description | TEXT | Nullable |
| status | ENUM | OPEN / FULL / CANCELLED / COMPLETED |
| scheduled_at | TIMESTAMP | Future datetime, not null |
| duration_minutes | INT | Nullable, estimated duration |
| min_players | INT | Not null, minimum 2 |
| max_players | INT | Not null |
| min_level | INT | Nullable, 1-10 |
| max_level | INT | Nullable, 1-10 |
| location_address | VARCHAR(500) | Free text, nullable |
| location_lat | DECIMAL(9,6) | Nullable |
| location_lng | DECIMAL(9,6) | Nullable |
| location_name | VARCHAR(200) | Display name e.g. "Sala Polivalentă" |
| created_at | TIMESTAMP | Not null |
| updated_at | TIMESTAMP | Not null |

### game_participants table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → game_sessions.id |
| user_id | UUID | FK → users.id |
| role | ENUM | HOST / PLAYER |
| team | ENUM | Nullable — TEAM_A / TEAM_B (for team sports) |
| joined_at | TIMESTAMP | Not null |
| UNIQUE | (session_id, user_id) | One entry per user per session |

### game_results table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → game_sessions.id, UNIQUE |
| reported_by_user_id | UUID | FK → users.id |
| confirmed_by_user_id | UUID | FK → users.id, nullable |
| winner_team | ENUM | Nullable — TEAM_A / TEAM_B / DRAW |
| score_team_a | INT | Nullable |
| score_team_b | INT | Nullable |
| status | ENUM | PENDING_CONFIRMATION / CONFIRMED / DISPUTED |
| reported_at | TIMESTAMP | Not null |
| confirmed_at | TIMESTAMP | Nullable |

## API Contract

### POST /api/v1/game-sessions
Create a new game session.
**Request:**
```json
{
  "sportId": "uuid",
  "title": "Sunday 3v3 Basketball",
  "scheduledAt": "2026-06-01T10:00:00Z",
  "durationMinutes": 90,
  "minPlayers": 4,
  "maxPlayers": 6,
  "minLevel": 4,
  "maxLevel": 8,
  "locationAddress": "Str. Primăverii 10, Cluj-Napoca",
  "locationLat": 46.7712,
  "locationLng": 23.5899,
  "locationName": "Teren Gheorgheni"
}
```
**Response 201:** Full session object with participants array.

### GET /api/v1/game-sessions
Search/list open sessions.
**Query params:** sportId, lat, lng, radiusKm, minLevel, maxLevel, page, size

### GET /api/v1/game-sessions/{sessionId}
Get full session detail including participants.

### POST /api/v1/game-sessions/{sessionId}/join
Join a session. No request body needed.
**Response 200:** Updated session object.

### POST /api/v1/game-sessions/{sessionId}/leave
Leave a session.
**Response 204**

### PATCH /api/v1/game-sessions/{sessionId}/status
Update session status (HOST only).
**Request:**
```json
{ "status": "CANCELLED" }
```
or
```json
{ "status": "COMPLETED" }
```

### POST /api/v1/game-sessions/{sessionId}/result
Report a game result.
**Request:**
```json
{
  "winnerTeam": "TEAM_A",
  "scoreTeamA": 21,
  "scoreTeamB": 15
}
```
**Response 201:** game_results object.

### POST /api/v1/game-sessions/{sessionId}/result/confirm
Confirm the reported result.
**Response 200:** Updated game_results object.

### POST /api/v1/game-sessions/{sessionId}/result/dispute
Dispute the reported result.
**Response 200:** Updated game_results object.

## Notes
- ELO recalculation after CONFIRMED result is handled by the elo module (future spec)
- Team assignment (TEAM_A / TEAM_B) is optional at join time, can be set by host
- Location search radius queries use simple lat/lng bounding box for MVP,
  PostGIS ST_DWithin for accuracy in a future iteration
- Google Maps / Apple Maps deep-link integration is OUT OF SCOPE for MVP —
  store lat/lng now so integration is trivial later
