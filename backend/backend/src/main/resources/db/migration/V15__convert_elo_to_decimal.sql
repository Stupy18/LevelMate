ALTER TABLE user_sports
    ALTER COLUMN elo_rating TYPE NUMERIC(8,2);

ALTER TABLE elo_history
    ALTER COLUMN elo_before TYPE NUMERIC(8,2),
    ALTER COLUMN elo_delta  TYPE NUMERIC(8,2),
    ALTER COLUMN elo_after  TYPE NUMERIC(8,2);
