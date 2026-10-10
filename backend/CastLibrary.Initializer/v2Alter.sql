-- V2 Campaign Mode Database Alterations
-- This script contains all database changes specific to V2 campaign mode
-- Runs after alter.sql to ensure base schema is in place

-- ============================================================
-- V2 Column Comments for Documentation
-- ============================================================

-- Comments for casts table - marking V1 vs V2 usage
COMMENT ON COLUMN casts.id IS 'V1 & V2';
COMMENT ON COLUMN casts.dm_user_id IS 'V1 & V2';
COMMENT ON COLUMN casts.name IS 'V1 & V2';
COMMENT ON COLUMN casts.pronouns IS 'V1 & V2';
COMMENT ON COLUMN casts.race IS 'V1 & V2';
COMMENT ON COLUMN casts.role IS 'V1 & V2';
COMMENT ON COLUMN casts.age IS 'V1 & V2';
COMMENT ON COLUMN casts.max_hit_points IS 'V1 & V2';
COMMENT ON COLUMN casts.posture IS 'V1';
COMMENT ON COLUMN casts.speed IS 'V1';
COMMENT ON COLUMN casts.keywords IS 'V2';
COMMENT ON COLUMN casts.description IS 'V1 & V2';
COMMENT ON COLUMN casts.public_description IS 'V1 & V2';
COMMENT ON COLUMN casts.created_at IS 'V1 & V2';
 
-- Comments for locations table
COMMENT ON COLUMN locations.id IS 'V1 & V2';
COMMENT ON COLUMN locations.dm_user_id IS 'V1 & V2';
COMMENT ON COLUMN locations.name IS 'V1 & V2';
COMMENT ON COLUMN locations.classification IS 'V1';
COMMENT ON COLUMN locations.size IS 'V1';
COMMENT ON COLUMN locations.condition IS 'V1 & V2';
COMMENT ON COLUMN locations.geography IS 'V1 & V2';
COMMENT ON COLUMN locations.architecture IS 'V1 & V2';
COMMENT ON COLUMN locations.climate IS 'V1';
COMMENT ON COLUMN locations.religion IS 'V1';
COMMENT ON COLUMN locations.vibe IS 'V1 & V2';
COMMENT ON COLUMN locations.languages IS 'V1';
COMMENT ON COLUMN locations.description IS 'V1 & V2';
COMMENT ON COLUMN locations.created_at IS 'V1 & V2';
 
-- Comments for sublocations table
COMMENT ON COLUMN sublocations.id IS 'V1 & V2';
COMMENT ON COLUMN sublocations.location_id IS 'V1 & V2';
COMMENT ON COLUMN sublocations.dm_user_id IS 'V1 & V2';
COMMENT ON COLUMN sublocations.name IS 'V1 & V2';
COMMENT ON COLUMN sublocations.description IS 'V1 & V2';
COMMENT ON COLUMN sublocations.created_at IS 'V1 & V2';

-- ============================================================
-- V2-Specific Column Additions
-- ============================================================
-- Add V2-specific columns here as needed for V2 campaign mode features
-- Example:
-- ALTER TABLE casts ADD COLUMN IF NOT EXISTS v2_attribute VARCHAR(100);
-- COMMENT ON COLUMN casts.v2_attribute IS 'V2 - V2 campaign mode specific attribute';

-- ============================================================
-- V2 Campaign Chronicles (standalone, no session grouping)
-- ============================================================

-- V2 chronicle entries are a pure date-ordered feed. Session numbers are
-- optional labels only (never a grouping FK).
CREATE TABLE IF NOT EXISTS campaign_chronicles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    content_type    VARCHAR(50)  NOT NULL,
    source_id       UUID,
    title           VARCHAR(200) NOT NULL,
    body            TEXT         NOT NULL DEFAULT '',
    sort_order      INT          NOT NULL DEFAULT 0,
    linked_entities JSONB        NOT NULL DEFAULT '[]'::jsonb,
    file_path       VARCHAR(500),
    tod_slice_name  VARCHAR(100),
    is_gm_only      BOOLEAN      NOT NULL DEFAULT FALSE,
    played_on       DATE         NOT NULL DEFAULT CURRENT_DATE,
    session_number  INT,
    archived_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    keywords        TEXT         NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_campaign_chronicles_campaign_played
    ON campaign_chronicles(campaign_id, played_on DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_chronicles_campaign_type
    ON campaign_chronicles(campaign_id, content_type);

CREATE INDEX IF NOT EXISTS idx_campaign_chronicles_keywords_trgm
    ON campaign_chronicles USING gin (keywords gin_trgm_ops);

COMMENT ON TABLE campaign_chronicles IS 'V2 - standalone chronicle feed entries (no session grouping)';
COMMENT ON COLUMN campaign_chronicles.content_type IS 'V2 - scene | handout | player-note | secret | coin-reward | shop-purchase';
COMMENT ON COLUMN campaign_chronicles.source_id IS 'V2 - optional id of the originating content (e.g. storyline item)';
COMMENT ON COLUMN campaign_chronicles.played_on IS 'V2 - date the content belongs to (primary sort key)';
COMMENT ON COLUMN campaign_chronicles.session_number IS 'V2 - optional display label only, never a grouping key';
COMMENT ON COLUMN campaign_chronicles.is_gm_only IS 'V2 - true hides the entry from non-GM players';
