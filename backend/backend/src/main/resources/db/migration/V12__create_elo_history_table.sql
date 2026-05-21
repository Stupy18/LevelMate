CREATE TABLE elo_history (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    sport_id     UUID        NOT NULL REFERENCES sports(id)         ON DELETE CASCADE,
    session_id   UUID        NOT NULL REFERENCES game_sessions(id)  ON DELETE CASCADE,
    elo_before   INT         NOT NULL,
    elo_delta    INT         NOT NULL,
    elo_after    INT         NOT NULL,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_elo_history_user_sport_recorded
    ON elo_history(user_id, sport_id, recorded_at DESC);
