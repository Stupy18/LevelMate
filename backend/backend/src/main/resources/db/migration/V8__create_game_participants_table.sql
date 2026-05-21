CREATE TABLE game_participants (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(10) NOT NULL CHECK (role IN ('HOST','PLAYER')),
    team       VARCHAR(10) CHECK (team IN ('TEAM_A','TEAM_B')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_game_participants_session_id ON game_participants(session_id);
