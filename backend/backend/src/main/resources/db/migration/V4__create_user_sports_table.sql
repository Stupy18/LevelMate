CREATE TABLE user_sports (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    sport_id    UUID        NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    elo_rating  INT,
    grade       VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sport_id),
    CONSTRAINT chk_user_sports_rating_type CHECK (
        (elo_rating IS NOT NULL AND grade IS NULL)
        OR (elo_rating IS NULL AND grade IS NOT NULL)
        OR (elo_rating IS NULL AND grade IS NULL)
    )
);

CREATE INDEX idx_user_sports_user_id ON user_sports(user_id);
