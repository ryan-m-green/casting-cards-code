-- Add token_version column to users table for JWT token invalidation on role changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

-- Add email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- Add last_logged_in_on column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logged_in_on TIMESTAMP;

-- Create index on last_logged_in_on for inactive user queries
CREATE INDEX IF NOT EXISTS idx_users_last_logged_in_on ON users(last_logged_in_on);

-- Drop title and alternate_title columns from campaign_sessions table (derived from session_number)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_sessions') THEN
        ALTER TABLE campaign_sessions DROP COLUMN IF EXISTS title;
        ALTER TABLE campaign_sessions DROP COLUMN IF EXISTS alternate_title;
    END IF;
END $$;

-- Add pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Migrate keywords from TEXT[] to TEXT for trigram search compatibility
-- Drop old TEXT[] columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_session_archived' AND column_name = 'keywords' AND data_type = 'ARRAY') THEN
        ALTER TABLE campaign_session_archived DROP COLUMN keywords;
    END IF;
END $$;

-- Add TEXT keywords column to campaign_session_archived
ALTER TABLE campaign_session_archived ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT '';

-- Drop old TEXT[] column from campaign_session_chronicles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_session_chronicles' AND column_name = 'keywords' AND data_type = 'ARRAY') THEN
        ALTER TABLE campaign_session_chronicles DROP COLUMN keywords;
    END IF;
END $$;

-- Add TEXT keywords column to campaign_session_chronicles
ALTER TABLE campaign_session_chronicles ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT '';

-- Create indexes for campaign_session_chronicles if they don't exist
CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_campaign ON campaign_session_chronicles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_archived_session ON campaign_session_chronicles(archived_session_id);

-- Drop old GIN indexes if they exist (safe to run)
DROP INDEX IF EXISTS idx_campaign_session_archived_keywords;
DROP INDEX IF EXISTS idx_campaign_session_chronicles_keywords;

-- Create trigram indexes for chronicles substring search
CREATE INDEX IF NOT EXISTS idx_campaign_session_archived_keywords_trgm
    ON campaign_session_archived USING gin (keywords gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_keywords_trgm
    ON campaign_session_chronicles USING gin (keywords gin_trgm_ops);

-- Allow null values for dm_notes in sublocations table
ALTER TABLE sublocations ALTER COLUMN dm_notes DROP NOT NULL;


-- ============================================================
-- Stripe Subscription Integration - Slice 1
-- ============================================================

-- ============================================================
-- Stripe Webhook Handling - Slice 4
-- ============================================================

-- Add past_due_since column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMP;

-- Add lock_level column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lock_level VARCHAR(50) NOT NULL DEFAULT 'full_access';

-- Add index on subscriptions status and bypass_payment for inactive free trial user queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_bypass ON subscriptions(status, bypass_payment);

-- Alter castcards_configuration table to Key/Value JSONB pattern (for existing databases)
ALTER TABLE castcards_configuration DROP COLUMN IF EXISTS doodle_art;
ALTER TABLE castcards_configuration DROP COLUMN IF EXISTS stop_words;
ALTER TABLE castcards_configuration ADD COLUMN IF NOT EXISTS key TEXT NOT NULL DEFAULT '';
ALTER TABLE castcards_configuration ADD COLUMN IF NOT EXISTS value JSONB;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_castcards_configuration_key'
    ) THEN
        ALTER TABLE castcards_configuration ADD CONSTRAINT uq_castcards_configuration_key UNIQUE (key);
    END IF;
END $$;

-- ============================================================
-- Add AccountType column to pricing_model table
-- ============================================================

-- Add the new column with a default value
ALTER TABLE pricing_model 
ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) NOT NULL DEFAULT 'test';

-- Add a check constraint to ensure only valid values are stored
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_pricing_model_account_type'
    ) THEN
        ALTER TABLE pricing_model 
        ADD CONSTRAINT chk_pricing_model_account_type 
        CHECK (account_type IN ('live', 'test'));
    END IF;
END $$;


-- Create an index for better query performance if this column will be used for filtering
CREATE INDEX IF NOT EXISTS idx_pricing_model_account_type ON pricing_model(account_type);

-- ============================================================
-- Comprehensive Audit Logging - Slice 3
-- ============================================================

-- Create audit_logs table for security event tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    user_email        VARCHAR(255) NOT NULL,
    event_type        VARCHAR(50) NOT NULL,
    event_description TEXT NOT NULL,
    endpoint          VARCHAR(500),
    http_method       VARCHAR(10),
    status_code       INTEGER,
    ip_address        VARCHAR(45),
    user_agent        TEXT,
    request_details   TEXT,
    response_details  TEXT,
    is_success        BOOLEAN NOT NULL DEFAULT true,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    additional_data   TEXT
);

-- Create indexes for audit logs table for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type_created ON audit_logs(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(is_success);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_range ON audit_logs(created_at DESC);

-- ============================================================
-- Campaign LastAccessedAt Tracking
-- ============================================================

-- Add last_accessed_at column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- ============================================================
-- Add perception column to factions table
-- ============================================================

ALTER TABLE factions ADD COLUMN IF NOT EXISTS perception SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_factions_perception'
    ) THEN
        ALTER TABLE factions ADD CONSTRAINT chk_factions_perception CHECK (perception BETWEEN -5 AND 5);
    END IF;
END $$;

-- ============================================================
-- Add font_color column to campaign_tod_slices table
-- ============================================================

ALTER TABLE campaign_tod_slices ADD COLUMN IF NOT EXISTS font_color TEXT NOT NULL DEFAULT '';

-- ============================================================
-- Add colors column to factions table
-- ============================================================

ALTER TABLE factions ADD COLUMN IF NOT EXISTS colors JSONB;

-- ============================================================
-- Add colors column to campaign_faction_instances table
-- ============================================================

ALTER TABLE campaign_faction_instances ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- Add perception column to campaign_faction_instances table
-- ============================================================

ALTER TABLE campaign_faction_instances ADD COLUMN IF NOT EXISTS perception SMALLINT NOT NULL DEFAULT 0;

-- ============================================================
-- Drop unique constraint on campaign_faction_instance_relationships
-- ============================================================
-- Allow both GM-created (dm_user_id has value) and player-created (dm_user_id is null)
-- relationships for the same faction pair within a campaign
-- Validation is now handled in code via AddFactionRelationshipCommandHandler
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_campaign_faction_instance_relationship'
    ) THEN
        ALTER TABLE campaign_faction_instance_relationships
        DROP CONSTRAINT uq_campaign_faction_instance_relationship;
    END IF;
END $$;

-- ============================================================
-- Soundtrack Feature Implementation
-- ============================================================

-- Add soundtrack_id column to campaign_storyline table (for existing databases)
ALTER TABLE campaign_storyline ADD COLUMN IF NOT EXISTS soundtrack_id UUID;

-- Create foreign key constraint for soundtrack_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_campaign_storyline_soundtrack'
    ) THEN
        ALTER TABLE campaign_storyline
        ADD CONSTRAINT fk_campaign_storyline_soundtrack
        FOREIGN KEY (soundtrack_id) REFERENCES campaign_soundtracks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- Ambiance Feature Implementation
-- ============================================================

-- Add kind column to campaign_soundtracks (music | sound_effect)
ALTER TABLE campaign_soundtracks ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'music';

-- Create campaign_ambiances table (persisted "ambiance button" playlists)
CREATE TABLE IF NOT EXISTS campaign_ambiances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    randomize_music BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE campaign_ambiances ADD COLUMN IF NOT EXISTS randomize_music BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_campaign_ambiances_campaign_id ON campaign_ambiances(campaign_id);

-- Create campaign_ambiance_items table (ordered playlist entries)
CREATE TABLE IF NOT EXISTS campaign_ambiance_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiance_id         UUID NOT NULL REFERENCES campaign_ambiances(id) ON DELETE CASCADE,
    soundtrack_id       UUID NOT NULL REFERENCES campaign_soundtracks(id) ON DELETE CASCADE,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    volume              INTEGER NOT NULL DEFAULT 80,
    pause_mode          VARCHAR(20) NOT NULL DEFAULT 'none',
    pause_delay_seconds INTEGER,
    pause_min_seconds   INTEGER,
    pause_max_seconds   INTEGER
);

ALTER TABLE campaign_ambiance_items ADD COLUMN IF NOT EXISTS volume INTEGER NOT NULL DEFAULT 80;

CREATE INDEX IF NOT EXISTS idx_campaign_ambiance_items_ambiance_id ON campaign_ambiance_items(ambiance_id);
CREATE INDEX IF NOT EXISTS idx_campaign_ambiance_items_soundtrack_id ON campaign_ambiance_items(soundtrack_id);

-- ============================================================
-- Cast Keywords: rename casts.voice_placement -> casts.keywords
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casts' AND column_name = 'voice_placement') THEN
        ALTER TABLE casts RENAME COLUMN voice_placement TO keywords;
    END IF;
END $$;

-- ============================================================
-- Campaign Keywords table + trigram index
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_keywords (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_type  VARCHAR(20) NOT NULL CHECK (card_type IN ('location','sublocation','cast','faction')),
    keyword    VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dm_user_id, card_type, keyword)
);

CREATE INDEX IF NOT EXISTS idx_campaign_keywords_keyword_trgm
    ON campaign_keywords USING gin (keyword gin_trgm_ops);

-- ============================================================
-- Library card keywords columns
-- ============================================================
-- ============================================================
-- Cast Hit Points: replace casts.alignment with casts.max_hit_points
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'casts' AND column_name = 'alignment') THEN
        ALTER TABLE casts DROP COLUMN alignment;
    END IF;
END $$;

ALTER TABLE casts ADD COLUMN IF NOT EXISTS max_hit_points INT NOT NULL DEFAULT 0;

-- ============================================================
-- Campaign cast instance Hit Points:
-- replace campaign_cast_instances.alignment with max/lost/temp hit points
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_cast_instances' AND column_name = 'alignment') THEN
        ALTER TABLE campaign_cast_instances DROP COLUMN alignment;
    END IF;
END $$;

ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS max_hit_points  INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS lost_hit_points INT NOT NULL DEFAULT 0;
ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS temp_hit_points INT NOT NULL DEFAULT 0;