-- Add slug column (nullable initially so we can back-fill existing rows)
ALTER TABLE sports ADD COLUMN slug VARCHAR(50);

-- Insert 12 new sports (slug will be populated by the bulk UPDATE below)
INSERT INTO sports (name, rating_type, description) VALUES
    ('Badminton',     'ELO_COMPETITIVE',    'Competitive racket sport with a shuttlecock and net'),
    ('Table Tennis',  'ELO_COMPETITIVE',    'Fast-paced indoor racket sport on a small table'),
    ('Squash',        'ELO_COMPETITIVE',    'High-intensity racket sport played in an enclosed court'),
    ('Futsal',        'ELO_COMPETITIVE',    '5-a-side indoor football with a smaller, weighted ball'),
    ('Handball',      'ELO_COMPETITIVE',    'Fast-paced team sport combining basketball and football'),
    ('Rugby',         'ELO_COMPETITIVE',    'Full-contact team sport played with an oval ball'),
    ('Pickleball',    'ELO_COMPETITIVE',    'Paddle sport combining elements of tennis, badminton and ping-pong'),
    ('Boxing',        'ELO_COMPETITIVE',    'Striking combat sport using gloves in a ring'),
    ('Martial Arts',  'ELO_COMPETITIVE',    'Codified systems and traditions of combat practices'),
    ('Rock Climbing', 'GRADE_BASED',        'Ascending natural or artificial rock faces using technique and strength'),
    ('Weightlifting', 'PERFORMANCE_BASED',  'Tracking personal bests on compound barbell lifts'),
    ('Rowing',        'PERFORMANCE_BASED',  'Ergometer and water rowing performance tracking');

-- Derive slug from name for all rows
UPDATE sports SET slug = LOWER(REPLACE(name, ' ', '_'));

-- Now enforce NOT NULL and uniqueness
ALTER TABLE sports ALTER COLUMN slug SET NOT NULL;
ALTER TABLE sports ADD CONSTRAINT sports_slug_unique UNIQUE (slug);
