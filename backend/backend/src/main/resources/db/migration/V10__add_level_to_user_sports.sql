ALTER TABLE user_sports
    ADD COLUMN level INT CHECK (level BETWEEN 1 AND 10);
