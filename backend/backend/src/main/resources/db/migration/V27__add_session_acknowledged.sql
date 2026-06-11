ALTER TABLE game_participants
    ADD COLUMN session_acknowledged BOOLEAN NOT NULL DEFAULT FALSE;
