-- Add generic metric columns
ALTER TABLE performance_pbs
    ADD COLUMN metric_key          VARCHAR(50),
    ADD COLUMN metric_value_text   VARCHAR(200),
    ADD COLUMN metric_value_number NUMERIC;

-- Make the distance/time columns nullable (they only apply to old-style distance PBs)
ALTER TABLE performance_pbs
    ALTER COLUMN distance_meters DROP NOT NULL,
    ALTER COLUMN time_seconds    DROP NOT NULL;

-- Drop the old positive-value check constraints (nullable columns can't satisfy them)
ALTER TABLE performance_pbs
    DROP CONSTRAINT IF EXISTS performance_pbs_distance_meters_check,
    DROP CONSTRAINT IF EXISTS performance_pbs_time_seconds_check;

-- Partial unique index for metric rows so a user can only have one value per metric per sport
CREATE UNIQUE INDEX idx_performance_pbs_user_sport_metric
    ON performance_pbs (user_id, sport_id, metric_key)
    WHERE metric_key IS NOT NULL;

-- Migrate existing Bouldering grades from user_sports into performance_pbs
INSERT INTO performance_pbs (user_id, sport_id, metric_key, metric_value_text, recorded_at)
SELECT us.user_id, us.sport_id, 'current_grade', us.grade, NOW()
FROM user_sports us
JOIN sports s ON s.id = us.sport_id
WHERE s.name = 'Bouldering'
  AND us.grade IS NOT NULL
  AND us.grade <> ''
  AND NOT EXISTS (
      SELECT 1 FROM performance_pbs p
      WHERE p.user_id = us.user_id
        AND p.sport_id = us.sport_id
        AND p.metric_key = 'current_grade'
  );
