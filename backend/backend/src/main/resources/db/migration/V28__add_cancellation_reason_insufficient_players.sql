ALTER TABLE game_sessions
    ADD COLUMN cancellation_reason_insufficient_players BOOLEAN NOT NULL DEFAULT FALSE;
