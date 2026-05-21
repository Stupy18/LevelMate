CREATE TABLE performance_pbs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    sport_id         UUID        NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    distance_meters  INT         NOT NULL CHECK (distance_meters > 0),
    time_seconds     INT         NOT NULL CHECK (time_seconds > 0),
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sport_id, distance_meters)
);

CREATE INDEX idx_performance_pbs_user_sport ON performance_pbs(user_id, sport_id);
