### Requirement: Client can retrieve the full sports catalog
The system SHALL expose a read-only list of all sports via a public endpoint. No authentication SHALL be required to call this endpoint.

#### Scenario: Successful catalog retrieval
- **WHEN** a GET request is sent to `/api/v1/sports`
- **THEN** the system returns HTTP 200 with a JSON array where each element contains `id`, `name`, `ratingType`, and `description`

#### Scenario: Catalog is never empty after migration
- **WHEN** a GET request is sent to `/api/v1/sports` after the database has been migrated
- **THEN** the response array contains at least 10 sports

### Requirement: Sports catalog covers all three rating types
The system SHALL seed sports that cover ELO_COMPETITIVE, GRADE_BASED, and PERFORMANCE_BASED rating types so every feature of the platform can be exercised.

#### Scenario: ELO_COMPETITIVE sports present
- **WHEN** a GET request is sent to `/api/v1/sports`
- **THEN** the response includes at least one sport with `ratingType: "ELO_COMPETITIVE"` (e.g. Basketball, Tennis, Football, Padel, Volleyball)

#### Scenario: GRADE_BASED sports present
- **WHEN** a GET request is sent to `/api/v1/sports`
- **THEN** the response includes at least one sport with `ratingType: "GRADE_BASED"` (e.g. Bouldering)

#### Scenario: PERFORMANCE_BASED sports present
- **WHEN** a GET request is sent to `/api/v1/sports`
- **THEN** the response includes at least one sport with `ratingType: "PERFORMANCE_BASED"` (e.g. Running, Cycling, Swimming)

### Requirement: Sports catalog endpoint is publicly accessible
The system SHALL NOT require an `Authorization` header to call `GET /api/v1/sports`. Spring Security SHALL permit this path without authentication.

#### Scenario: Unauthenticated catalog request is processed
- **WHEN** a GET request is sent to `/api/v1/sports` without any `Authorization` header
- **THEN** the system returns HTTP 200 with the sports list
