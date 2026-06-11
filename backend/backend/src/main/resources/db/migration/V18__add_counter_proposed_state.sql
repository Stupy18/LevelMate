-- Expand result status enum to include COUNTER_PROPOSED
ALTER TABLE game_results DROP CONSTRAINT IF EXISTS game_results_status_check;
ALTER TABLE game_results ADD CONSTRAINT game_results_status_check
    CHECK (status IN ('PENDING_CONFIRMATION','CONFIRMED','DISPUTED','COUNTER_PROPOSED'));

-- Counter-score fields (filled when Player B disputes with a different score)
ALTER TABLE game_results
    ADD COLUMN counter_winner_team          VARCHAR(10)
        CHECK (counter_winner_team IN ('TEAM_A','TEAM_B','DRAW')),
    ADD COLUMN counter_score_team_a         INT,
    ADD COLUMN counter_score_team_b         INT,
    ADD COLUMN counter_reported_by_user_id  UUID REFERENCES users(id);
