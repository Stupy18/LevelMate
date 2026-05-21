## 1. Flyway Migrations

- [x] 1.1 Write V3__create_sports_table.sql — create `sports` table with columns `id UUID PK`, `name VARCHAR(100) UNIQUE NOT NULL`, `rating_type VARCHAR(30) NOT NULL CHECK (rating_type IN ('ELO_COMPETITIVE','GRADE_BASED','PERFORMANCE_BASED'))`, `description TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- [x] 1.2 Write V3 seed data — INSERT 10+ sports: Basketball, Tennis, Football, Padel, Volleyball (ELO_COMPETITIVE); Bouldering (GRADE_BASED); Running, Cycling, Swimming, Triathlon (PERFORMANCE_BASED)
- [x] 1.3 Write V4__create_user_sports_table.sql — `id UUID PK`, `user_id UUID FK→users`, `sport_id UUID FK→sports`, `elo_rating INT`, `grade VARCHAR(20)`, `performance_note TEXT`, `created_at`, `updated_at`; UNIQUE(user_id, sport_id); CHECK that only the matching rating-type column is populated
- [x] 1.4 Write V5__create_coach_profiles_table.sql — `id UUID PK`, `user_id UUID FK→users`, `sport_id UUID FK→sports`, `description TEXT NOT NULL`, `hourly_rate_cents INT`, `created_at`, `updated_at`; UNIQUE(user_id, sport_id)
- [x] 1.5 Write V6__create_performance_pbs_table.sql — `id UUID PK`, `user_id UUID FK→users`, `sport_id UUID FK→sports`, `distance_meters INT NOT NULL CHECK(>0)`, `time_seconds INT NOT NULL CHECK(>0)`, `recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()`; UNIQUE(user_id, sport_id, distance_meters)

## 2. JPA Entities

- [x] 2.1 Create `Sport` entity — maps to `sports` table; `RatingType` enum with `ELO_COMPETITIVE`, `GRADE_BASED`, `PERFORMANCE_BASED` (inner or package-level)
- [x] 2.2 Create `UserSport` entity — maps to `user_sports`; ManyToOne to `User` and `Sport`; nullable `eloRating`, `grade` fields
- [x] 2.3 Create `CoachProfile` entity — maps to `coach_profiles`; ManyToOne to `User` and `Sport`
- [x] 2.4 Create `PerformancePb` entity — maps to `performance_pbs`; ManyToOne to `User` and `Sport`

## 3. Repositories

- [x] 3.1 Create `SportRepository extends JpaRepository<Sport, UUID>` — add `findAll()` (inherited) and `existsById(UUID)`
- [x] 3.2 Create `UserSportRepository extends JpaRepository<UserSport, UUID>` — add `findAllByUserId(UUID)`, `findByUserIdAndSportId(UUID, UUID)`, `existsByUserIdAndSportId(UUID, UUID)`
- [x] 3.3 Create `CoachProfileRepository extends JpaRepository<CoachProfile, UUID>` — add `findByUserIdAndSportId(UUID, UUID)`, `existsByUserIdAndSportId(UUID, UUID)`
- [x] 3.4 Create `PerformancePbRepository extends JpaRepository<PerformancePb, UUID>` — add `findAllByUserIdAndSportIdOrderByDistanceMetersAsc(UUID, UUID)`, `findByUserIdAndSportIdAndDistanceMeters(UUID, UUID, int)`

## 4. DTOs and Error Codes

- [x] 4.1 Create request/response DTOs: `AddSportRequest`, `UpdateSportRequest`, `SportEntryResponse`, `SportCatalogItemResponse`
- [x] 4.2 Create request/response DTOs: `CreateCoachProfileRequest`, `UpdateCoachProfileRequest`, `CoachProfileResponse`
- [x] 4.3 Create request/response DTOs: `RecordPbRequest`, `PbResponse`
- [x] 4.4 Add error codes to the global error handler: `SPORT_NOT_FOUND`, `SPORT_ALREADY_ADDED`, `USER_SPORT_NOT_FOUND`, `COACH_PROFILE_ALREADY_EXISTS`, `COACH_PROFILE_NOT_FOUND`, `SPORT_NOT_IN_PROFILE`, `INVALID_SPORT_RATING_TYPE`, `FORBIDDEN`

## 5. Services

- [x] 5.1 Create `SportsCatalogService` — `findAll()` returns list of all sports mapped to `SportCatalogItemResponse`
- [x] 5.2 Create `UserSportProfileService` — `addSport(userId, request)`, `getSports(userId)`, `updateSport(userId, sportId, request)`, `removeSport(userId, sportId)`; ownership check in each method
- [x] 5.3 Create `CoachProfileService` — `createProfile(userId, sportId, request)`, `getProfile(userId, sportId)`, `updateProfile(userId, sportId, request)`; validates sport is in user's profile before create
- [x] 5.4 Create `PerformancePbService` — `recordPb(userId, sportId, request)` (upsert logic), `getPbs(userId, sportId)`; validates sport is PERFORMANCE_BASED and in user's profile

## 6. Controllers

- [x] 6.1 Create `SportsCatalogController` — `GET /api/v1/sports` → `SportsCatalogService.findAll()`
- [x] 6.2 Create `UserSportProfileController` — `POST /api/v1/users/{userId}/sports`, `GET /api/v1/users/{userId}/sports`, `PUT /api/v1/users/{userId}/sports/{sportId}`, `DELETE /api/v1/users/{userId}/sports/{sportId}`
- [x] 6.3 Create `CoachProfileController` — `POST /api/v1/users/{userId}/sports/{sportId}/coach-profile`, `GET /api/v1/users/{userId}/sports/{sportId}/coach-profile`, `PUT /api/v1/users/{userId}/sports/{sportId}/coach-profile`
- [x] 6.4 Create `PerformancePbController` — `POST /api/v1/users/{userId}/sports/{sportId}/pbs`, `GET /api/v1/users/{userId}/sports/{sportId}/pbs`

## 7. Security Configuration

- [x] 7.1 Update `SecurityConfig` to permit `GET /api/v1/sports` without authentication while requiring authentication for all `/api/v1/users/**` endpoints

## 8. Update CLAUDE.md

- [x] 8.1 Update CLAUDE.md implementation status section to mark user-sport-profiles as done and list all new files
