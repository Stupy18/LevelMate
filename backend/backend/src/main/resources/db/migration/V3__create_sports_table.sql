CREATE TABLE sports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    rating_type VARCHAR(30)  NOT NULL CHECK (rating_type IN ('ELO_COMPETITIVE', 'GRADE_BASED', 'PERFORMANCE_BASED')),
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO sports (name, rating_type, description) VALUES
    ('Basketball',  'ELO_COMPETITIVE',   'Team sport played on a court; win/loss ELO tracking'),
    ('Tennis',      'ELO_COMPETITIVE',   'Racket sport played 1v1 or 2v2; win/loss ELO tracking'),
    ('Football',    'ELO_COMPETITIVE',   '11-a-side team sport; win/loss ELO tracking'),
    ('Padel',       'ELO_COMPETITIVE',   'Racket sport played in pairs on an enclosed court'),
    ('Volleyball',  'ELO_COMPETITIVE',   'Team net sport played 6v6; win/loss ELO tracking'),
    ('Bouldering',  'GRADE_BASED',       'Rope-free climbing graded by problem difficulty (V-scale / French font)'),
    ('Running',     'PERFORMANCE_BASED', 'Track personal-best times across distances (5K, 10K, marathon, etc.)'),
    ('Cycling',     'PERFORMANCE_BASED', 'Track personal-best times across distances and routes'),
    ('Swimming',    'PERFORMANCE_BASED', 'Track personal-best times across stroke disciplines and distances'),
    ('Triathlon',   'PERFORMANCE_BASED', 'Multi-discipline endurance sport; track overall and split times');
