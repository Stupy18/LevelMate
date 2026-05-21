CREATE TABLE coach_profiles (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    sport_id         UUID        NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    description      TEXT        NOT NULL,
    hourly_rate_cents INT,
    is_verified      BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, sport_id)
);

CREATE INDEX idx_coach_profiles_user_id  ON coach_profiles(user_id);
CREATE INDEX idx_coach_profiles_sport_id ON coach_profiles(sport_id);
