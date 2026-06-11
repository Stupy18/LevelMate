CREATE TABLE sport_metrics (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id      UUID         NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    metric_key    VARCHAR(50)  NOT NULL,
    label         VARCHAR(100) NOT NULL,
    input_type    VARCHAR(30)  NOT NULL,
    unit          VARCHAR(30),
    is_required   BOOLEAN      NOT NULL DEFAULT FALSE,
    display_order INT          NOT NULL DEFAULT 0,
    UNIQUE (sport_id, metric_key)
);

CREATE INDEX idx_sport_metrics_sport_id ON sport_metrics (sport_id);

-- ── ELO_COMPETITIVE: all get a skill-level metric ────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT id, 'self_reported_level', 'Skill Level', 'number', '1-10', true, 1
FROM sports WHERE rating_type = 'ELO_COMPETITIVE';

-- ── Martial Arts: additional context metrics ─────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('belt_or_level', 'Belt / Level',       'text', null::varchar, false, 2),
    ('discipline',    'Primary Discipline', 'text', null::varchar, false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Martial Arts';

-- ── Bouldering: V-scale grade metrics ────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('current_grade', 'Current Grade', 'grade_v', null::varchar, false, 1),
    ('project_grade', 'Project Grade', 'grade_v', null::varchar, false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Bouldering';

-- ── Rock Climbing: French sport grade metrics ─────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('current_grade', 'Current Grade', 'grade_french_sport', null::varchar, false, 1),
    ('project_grade', 'Project Grade', 'grade_french_sport', null::varchar, false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Rock Climbing';

-- ── Running: PB metrics ───────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('pb_5k_seconds',            '5K PB',            'duration', 'mm:ss',   false, 1),
    ('pb_10k_seconds',           '10K PB',           'duration', 'mm:ss',   false, 2),
    ('pb_half_marathon_seconds', 'Half Marathon PB', 'duration', 'h:mm:ss', false, 3),
    ('pb_marathon_seconds',      'Marathon PB',      'duration', 'h:mm:ss', false, 4),
    ('weekly_km',                'Weekly Distance',  'number',   'km',      false, 5)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Running';

-- ── Cycling: metrics ──────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('ftp_watts',       'FTP',             'number',   'W',       false, 1),
    ('pb_100k_seconds', '100K PB',         'duration', 'h:mm:ss', false, 2),
    ('weekly_km',       'Weekly Distance', 'number',   'km',      false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Cycling';

-- ── Swimming: metrics ─────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('pb_100m_seconds',  '100m PB',  'duration', 'mm:ss',   false, 1),
    ('pb_1500m_seconds', '1500m PB', 'duration', 'h:mm:ss', false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Swimming';

-- ── Triathlon: PB metrics ─────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('pb_sprint_seconds',    'Sprint PB',    'duration', 'h:mm:ss', false, 1),
    ('pb_olympic_seconds',   'Olympic PB',   'duration', 'h:mm:ss', false, 2),
    ('pb_half_iron_seconds', 'Half Iron PB', 'duration', 'h:mm:ss', false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Triathlon';

-- ── Weightlifting: 1RM metrics ────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('deadlift_1rm_kg', 'Deadlift 1RM',    'number', 'kg', false, 1),
    ('squat_1rm_kg',    'Squat 1RM',       'number', 'kg', false, 2),
    ('bench_1rm_kg',    'Bench Press 1RM', 'number', 'kg', false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Weightlifting';

-- ── Rowing: PB metrics ────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('pb_2000m_seconds', '2000m PB', 'duration', 'mm:ss', false, 1),
    ('pb_5000m_seconds', '5000m PB', 'duration', 'mm:ss', false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.name = 'Rowing';
