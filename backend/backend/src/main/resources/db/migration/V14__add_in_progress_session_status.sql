ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;
ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_status_check
    CHECK (status IN ('OPEN', 'FULL', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'));
