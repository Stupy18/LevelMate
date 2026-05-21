## Why

LevelMate needs to track what sports users play, their skill levels, and personal bests so the app can match players, suggest sessions, and display meaningful profiles. Without sport profiles, the platform has no domain data to act on.

## What Changes

- New `sports` reference table seeded with 10+ sports covering all three rating types (ELO_COMPETITIVE, GRADE_BASED, PERFORMANCE_BASED)
- New `user_sports` join table linking users to sports they play, with rating type-specific fields
- New `coach_profiles` table for users who offer coaching in a sport
- New `performance_pbs` table storing personal-best records for PERFORMANCE_BASED sports
- REST API under `/api/v1/users/{userId}/sports` for managing a user's sport entries
- REST API under `/api/v1/sports` for reading the sports catalog
- REST API under `/api/v1/users/{userId}/coach-profile` for coach profile management
- REST API under `/api/v1/users/{userId}/sports/{sportId}/pbs` for personal bests
- All endpoints require JWT authentication except `GET /api/v1/sports` (public catalog)

## Capabilities

### New Capabilities

- `sports-catalog`: Read-only reference data API for the sports catalog; seeded via Flyway migration
- `user-sport-profile`: CRUD operations for a user's sport entries (add sport, update rating, remove sport)
- `coach-profile`: Create and update a coaching profile tied to a sport for a user
- `performance-pbs`: Record and retrieve personal-best times/distances for PERFORMANCE_BASED sports

### Modified Capabilities

## Impact

- **New Flyway migrations**: V3 (sports table + seed data), V4 (user_sports), V5 (coach_profiles), V6 (performance_pbs)
- **New JPA entities**: Sport, UserSport, CoachProfile, PerformancePb
- **New Spring MVC controllers**: SportsCatalogController, UserSportProfileController, CoachProfileController, PerformancePbController
- **New service layer**: SportsCatalogService, UserSportProfileService, CoachProfileService, PerformancePbService
- **New repositories**: SportRepository, UserSportRepository, CoachProfileRepository, PerformancePbRepository
- **Security**: all mutating endpoints enforce `userId` path param matches authenticated principal's UUID
- **Dependencies**: no new Maven dependencies required
