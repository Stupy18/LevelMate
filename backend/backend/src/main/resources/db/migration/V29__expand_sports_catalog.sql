-- ── New ELO_COMPETITIVE sports ────────────────────────────────────────────────
INSERT INTO sports (name, rating_type, slug, description) VALUES
    ('Chess',            'ELO_COMPETITIVE', 'chess',            'The original ELO sport; 1v1 strategic board game'),
    ('Darts',            'ELO_COMPETITIVE', 'darts',            'Precision sport played 1v1; win/loss tracking'),
    ('Pool',             'ELO_COMPETITIVE', 'pool',             'Cue sport played 1v1 or in pairs'),
    ('Foosball',         'ELO_COMPETITIVE', 'foosball',         'Table football, 1v1 or 2v2'),
    ('Beach Volleyball', 'ELO_COMPETITIVE', 'beach_volleyball', '2v2 volleyball played on sand'),
    ('Beach Tennis',     'ELO_COMPETITIVE', 'beach_tennis',     'Racket sport played on sand, singles or doubles'),
    ('Racquetball',      'ELO_COMPETITIVE', 'racquetball',      'Enclosed court racket sport'),
    ('Ultimate Frisbee', 'ELO_COMPETITIVE', 'ultimate_frisbee', 'Team disc sport; win/loss tracking'),
    ('Water Polo',       'ELO_COMPETITIVE', 'water_polo',       'Team water sport; win/loss tracking'),
    ('Field Hockey',     'ELO_COMPETITIVE', 'field_hockey',     '11-a-side team stick sport'),
    ('Cricket',          'ELO_COMPETITIVE', 'cricket',          'Bat and ball team sport')
ON CONFLICT (slug) DO NOTHING;

-- ── New PERFORMANCE_BASED sports ──────────────────────────────────────────────
INSERT INTO sports (name, rating_type, slug, description) VALUES
    ('Golf',          'PERFORMANCE_BASED', 'golf',          'Track your handicap and best rounds'),
    ('Bowling',       'PERFORMANCE_BASED', 'bowling',       'Track your average and high game'),
    ('Skiing',        'PERFORMANCE_BASED', 'skiing',        'Track your ability and favourite terrain'),
    ('Snowboarding',  'PERFORMANCE_BASED', 'snowboarding',  'Track your ability and style'),
    ('Skateboarding', 'PERFORMANCE_BASED', 'skateboarding', 'Track your style and best tricks'),
    ('Surfing',       'PERFORMANCE_BASED', 'surfing',       'Track your ability and preferred break'),
    ('Yoga',          'PERFORMANCE_BASED', 'yoga',          'Track your practice style and experience'),
    ('Hiking',        'PERFORMANCE_BASED', 'hiking',        'Track your longest hikes and elevation'),
    ('CrossFit',      'PERFORMANCE_BASED', 'crossfit',      'Track benchmark workout times and lifts')
ON CONFLICT (slug) DO NOTHING;

-- ── New ELO sports: skill-level metric (same as every other ELO sport) ────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT id, 'self_reported_level', 'Skill Level', 'number', '1-10', true, 1
FROM sports
WHERE slug IN (
    'chess', 'darts', 'pool', 'foosball', 'beach_volleyball', 'beach_tennis',
    'racquetball', 'ultimate_frisbee', 'water_polo', 'field_hockey', 'cricket'
)
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Golf metrics ───────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('handicap',      'Handicap',              'number', 'index',   false, 1),
    ('best_18_holes', 'Best 18-Hole Score',    'number', 'strokes', false, 2),
    ('best_9_holes',  'Best 9-Hole Score',     'number', 'strokes', false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'golf'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Bowling metrics ────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('average_score', 'Average Score', 'number', 'pins', false, 1),
    ('high_game',     'High Game',     'number', 'pins', false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'bowling'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Skiing metrics ─────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('ability_level',     'Ability Level',     'text', null::varchar, false, 1),
    ('preferred_terrain', 'Preferred Terrain', 'text', null::varchar, false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'skiing'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Snowboarding metrics ───────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('ability_level',    'Ability Level',    'text', null::varchar, false, 1),
    ('preferred_style',  'Preferred Style',  'text', null::varchar, false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'snowboarding'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Skateboarding metrics ──────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('discipline',     'Discipline',     'text',   null::varchar, false, 1),
    ('years_skating',  'Years Skating',  'number', 'years',       false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'skateboarding'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Surfing metrics ────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('ability_level',     'Ability Level',     'text', null::varchar, false, 1),
    ('preferred_break',   'Preferred Break',   'text', null::varchar, false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'surfing'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Yoga metrics ───────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('style',             'Style',             'text',   null::varchar, false, 1),
    ('years_practicing',  'Years Practicing',  'number', 'years',       false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'yoga'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Hiking metrics ─────────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('longest_hike_km',  'Longest Hike',          'number', 'km', false, 1),
    ('max_elevation_m',  'Max Elevation Gained',  'number', 'm',  false, 2)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'hiking'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── CrossFit metrics ───────────────────────────────────────────────────────────
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('fran_seconds',      'Fran Time',          'duration', 'mm:ss', false, 1),
    ('max_deadlift_kg',   'Max Deadlift',       'number',   'kg',    false, 2),
    ('max_clean_jerk_kg', 'Max Clean & Jerk',   'number',   'kg',    false, 3)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'crossfit'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- ── Weightlifting: reconcile to squat/bench/deadlift/snatch/clean&jerk 1RMs ────
-- Rename the three existing lifts to the standard key/order and add the two
-- missing Olympic lifts. UPDATEs are no-ops if already renamed (idempotent).
UPDATE sport_metrics sm SET metric_key = 'squat_1rm', label = 'Squat 1RM', display_order = 1
FROM sports s
WHERE sm.sport_id = s.id AND s.slug = 'weightlifting' AND sm.metric_key = 'squat_1rm_kg';

UPDATE sport_metrics sm SET metric_key = 'bench_1rm', label = 'Bench Press 1RM', display_order = 2
FROM sports s
WHERE sm.sport_id = s.id AND s.slug = 'weightlifting' AND sm.metric_key = 'bench_1rm_kg';

UPDATE sport_metrics sm SET metric_key = 'deadlift_1rm', label = 'Deadlift 1RM', display_order = 3
FROM sports s
WHERE sm.sport_id = s.id AND s.slug = 'weightlifting' AND sm.metric_key = 'deadlift_1rm_kg';

INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, v.metric_key, v.label, v.input_type, v.unit, v.is_required, v.display_order
FROM sports s
CROSS JOIN (VALUES
    ('snatch_1rm',     'Snatch 1RM',        'number', 'kg', false, 4),
    ('clean_jerk_1rm', 'Clean & Jerk 1RM',  'number', 'kg', false, 5)
) AS v(metric_key, label, input_type, unit, is_required, display_order)
WHERE s.slug = 'weightlifting'
ON CONFLICT (sport_id, metric_key) DO NOTHING;

-- Keep any already-recorded PBs pointing at the renamed keys (idempotent no-ops
-- if nothing was ever recorded under the old keys).
UPDATE performance_pbs p SET metric_key = 'squat_1rm'
FROM sports s WHERE p.sport_id = s.id AND s.slug = 'weightlifting' AND p.metric_key = 'squat_1rm_kg';
UPDATE performance_pbs p SET metric_key = 'bench_1rm'
FROM sports s WHERE p.sport_id = s.id AND s.slug = 'weightlifting' AND p.metric_key = 'bench_1rm_kg';
UPDATE performance_pbs p SET metric_key = 'deadlift_1rm'
FROM sports s WHERE p.sport_id = s.id AND s.slug = 'weightlifting' AND p.metric_key = 'deadlift_1rm_kg';

-- ── Martial Arts: add years_training alongside belt_or_level and discipline ───
INSERT INTO sport_metrics (sport_id, metric_key, label, input_type, unit, is_required, display_order)
SELECT s.id, 'years_training', 'Years Training', 'number', 'years', false, 4
FROM sports s
WHERE s.slug = 'martial_arts'
ON CONFLICT (sport_id, metric_key) DO NOTHING;
