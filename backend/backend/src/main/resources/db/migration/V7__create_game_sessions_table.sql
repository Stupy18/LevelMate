CREATE TABLE game_sessions (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id         UUID          NOT NULL REFERENCES sports(id),
    host_user_id     UUID          NOT NULL REFERENCES users(id),
    title            VARCHAR(200),
    description      TEXT,
    status           VARCHAR(20)   NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN','FULL','CANCELLED','COMPLETED')),
    scheduled_at     TIMESTAMPTZ   NOT NULL,
    duration_minutes INT,
    min_players      INT           NOT NULL CHECK (min_players >= 2),
    max_players      INT           NOT NULL CHECK (max_players >= min_players),
    min_level        INT           CHECK (min_level BETWEEN 1 AND 10),
    max_level        INT           CHECK (max_level BETWEEN 1 AND 10),
    location_address VARCHAR(500),
    location_lat     DECIMAL(9,6),
    location_lng     DECIMAL(9,6),
    location_name    VARCHAR(200),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_sessions_sport_status_scheduled
    ON game_sessions(sport_id, status, scheduled_at);
