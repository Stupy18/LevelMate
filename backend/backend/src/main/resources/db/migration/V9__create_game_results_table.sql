CREATE TABLE game_results (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id            UUID        NOT NULL UNIQUE REFERENCES game_sessions(id) ON DELETE CASCADE,
    reported_by_user_id   UUID        NOT NULL REFERENCES users(id),
    confirmed_by_user_id  UUID        REFERENCES users(id),
    winner_team           VARCHAR(10) CHECK (winner_team IN ('TEAM_A','TEAM_B','DRAW')),
    score_team_a          INT,
    score_team_b          INT,
    status                VARCHAR(30) NOT NULL
                              CHECK (status IN ('PENDING_CONFIRMATION','CONFIRMED','DISPUTED')),
    reported_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at          TIMESTAMPTZ
);
