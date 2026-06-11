ALTER TABLE game_sessions
    ADD COLUMN target_pace VARCHAR(200),
    ADD COLUMN grade_min   VARCHAR(20),
    ADD COLUMN grade_max   VARCHAR(20);
