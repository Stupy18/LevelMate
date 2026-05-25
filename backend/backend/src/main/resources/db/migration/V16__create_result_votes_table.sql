CREATE TABLE result_votes (
    id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id   UUID        NOT NULL REFERENCES game_results (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id),
    vote        VARCHAR(10) NOT NULL CHECK (vote IN ('CONFIRM', 'DISPUTE')),
    voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (result_id, user_id)
);
