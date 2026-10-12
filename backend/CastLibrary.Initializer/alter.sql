-- Add token_version column to users table for JWT token invalidation on role changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

-- Add email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

-- Add last_logged_in_on column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logged_in_on TIMESTAMP;

-- Create index on last_logged_in_on for inactive user queries
CREATE INDEX IF NOT EXISTS idx_users_last_logged_in_on ON users(last_logged_in_on);

-- Add pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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
-- Allow both GM-created (gm_user_id has value) and player-created (gm_user_id is null)
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
-- Rename dm_user_id to gm_user_id on campaign_faction_instance_relationships
-- ============================================================
-- The column holds the id of the GM who wove the relationship, and is left NULL for one the
-- players wove. Renamed so the column says whose id it holds: the GM's own row and the
-- players' own row are told apart on it (see CampaignReadRepository's faction reads).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_faction_instance_relationships'
          AND column_name = 'dm_user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_faction_instance_relationships'
          AND column_name = 'gm_user_id'
    ) THEN
        ALTER TABLE campaign_faction_instance_relationships
        RENAME COLUMN dm_user_id TO gm_user_id;
    END IF;
END $$;

-- ============================================================
-- Soundtrack Feature Implementation
-- ============================================================

-- Add soundtrack_id column to campaign_storyline table (for existing databases)
ALTER TABLE campaign_storyline ADD COLUMN IF NOT EXISTS soundtrack_id UUID;

-- ============================================================
-- Soundtracks & Ambiances become GM-global libraries
-- ============================================================
-- Soundtracks and ambiances used to hang off a single campaign. They are now the
-- GM's own library, shared across every campaign the GM runs, and each campaign
-- keeps links to the rows it has adopted. This block creates the library tables,
-- carries every existing per-campaign row across, repoints the foreign keys and
-- then retires the old tables. It is written to run safely on a fresh database as
-- well as one that predates the change.

-- Library tables (also created by init.sql on fresh installs)
CREATE TABLE IF NOT EXISTS soundtracks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gm_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    file_url     TEXT         NOT NULL,
    volume       INTEGER      NOT NULL DEFAULT 80,
    is_loop      BOOLEAN      NOT NULL DEFAULT false,
    loop_delay_seconds INTEGER,
    kind         VARCHAR(20)  NOT NULL DEFAULT 'music',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soundtracks_gm_user_id ON soundtracks(gm_user_id);

CREATE TABLE IF NOT EXISTS ambiances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gm_user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    randomize_music BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambiances_gm_user_id ON ambiances(gm_user_id);

-- Link tables: which library rows each campaign has adopted.
CREATE TABLE IF NOT EXISTS campaign_soundtracks_links (
    campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    soundtrack_id UUID NOT NULL REFERENCES soundtracks(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, soundtrack_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_soundtracks_links_soundtrack ON campaign_soundtracks_links(soundtrack_id);

CREATE TABLE IF NOT EXISTS campaign_ambiance_links (
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    ambiance_id UUID NOT NULL REFERENCES ambiances(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, ambiance_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_ambiance_links_ambiance ON campaign_ambiance_links(ambiance_id);

-- Carry the old per-campaign rows into the libraries and record the campaign links.
DO $$
BEGIN
    IF to_regclass('campaign_soundtracks') IS NOT NULL THEN
        INSERT INTO soundtracks (id, gm_user_id, title, file_name, file_url, volume, is_loop, loop_delay_seconds, kind, created_at)
        SELECT s.id, c.dm_user_id, s.title, s.file_name, s.file_url, s.volume, s.is_loop, s.loop_delay_seconds, s.kind, s.created_at
        FROM campaign_soundtracks s
        JOIN campaigns c ON c.id = s.campaign_id
        WHERE NOT EXISTS (SELECT 1 FROM soundtracks x WHERE x.id = s.id);

        INSERT INTO campaign_soundtracks_links (campaign_id, soundtrack_id)
        SELECT campaign_id, id FROM campaign_soundtracks
        ON CONFLICT DO NOTHING;
    END IF;

    IF to_regclass('campaign_ambiances') IS NOT NULL THEN
        INSERT INTO ambiances (id, gm_user_id, title, randomize_music, created_at)
        SELECT a.id, c.dm_user_id, a.title, a.randomize_music, a.created_at
        FROM campaign_ambiances a
        JOIN campaigns c ON c.id = a.campaign_id
        WHERE NOT EXISTS (SELECT 1 FROM ambiances x WHERE x.id = a.id);

        INSERT INTO campaign_ambiance_links (campaign_id, ambiance_id)
        SELECT campaign_id, id FROM campaign_ambiances
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Ordered playlist entries (kept in place; its foreign keys are repointed below).
CREATE TABLE IF NOT EXISTS campaign_ambiance_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiance_id         UUID NOT NULL REFERENCES ambiances(id) ON DELETE CASCADE,
    soundtrack_id       UUID NOT NULL REFERENCES soundtracks(id) ON DELETE CASCADE,
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

-- Point every foreign key at the library tables.
ALTER TABLE campaign_ambiance_items DROP CONSTRAINT IF EXISTS campaign_ambiance_items_ambiance_id_fkey;
ALTER TABLE campaign_ambiance_items ADD CONSTRAINT campaign_ambiance_items_ambiance_id_fkey
    FOREIGN KEY (ambiance_id) REFERENCES ambiances(id) ON DELETE CASCADE;

ALTER TABLE campaign_ambiance_items DROP CONSTRAINT IF EXISTS campaign_ambiance_items_soundtrack_id_fkey;
ALTER TABLE campaign_ambiance_items ADD CONSTRAINT campaign_ambiance_items_soundtrack_id_fkey
    FOREIGN KEY (soundtrack_id) REFERENCES soundtracks(id) ON DELETE CASCADE;

ALTER TABLE campaign_storyline DROP CONSTRAINT IF EXISTS fk_campaign_storyline_soundtrack;
ALTER TABLE campaign_storyline ADD CONSTRAINT fk_campaign_storyline_soundtrack
    FOREIGN KEY (soundtrack_id) REFERENCES soundtracks(id) ON DELETE SET NULL;

-- Retire the old campaign-scoped tables now that nothing points at them.
DROP TABLE IF EXISTS campaign_soundtracks;
DROP TABLE IF EXISTS campaign_ambiances;

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
ALTER TABLE locations   ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE sublocations ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE factions     ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';

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

-- V2 - the cast card's importance to the party, 0 (unrated) to 3, set by the players from the
-- card's details (see CampaignCastsController.UpdateCastInstanceStars).
ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS stars_count INT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cast_instance_stars_count') THEN
        ALTER TABLE campaign_cast_instances
            ADD CONSTRAINT chk_cast_instance_stars_count CHECK (stars_count BETWEEN 0 AND 3);
    END IF;
END $$;

-- The transient hit points a fight burns through belong to the encounter's own row per combatant
-- (encounter_combatants.lost_hit_points / temp_hit_points); the campaign's copy of the card keeps
-- only max_hit_points.
ALTER TABLE campaign_cast_instances DROP COLUMN IF EXISTS lost_hit_points;
ALTER TABLE campaign_cast_instances DROP COLUMN IF EXISTS temp_hit_points;

-- ============================================================
-- Drop tables removed from the schema (see init.sql)
-- ============================================================
DROP TABLE IF EXISTS campaign_cast_player_notes;
DROP TABLE IF EXISTS campaign_cast_relationships;
DROP TABLE IF EXISTS campaign_faction_player_notes;
DROP TABLE IF EXISTS campaign_faction_sublocations;
DROP TABLE IF EXISTS campaign_location_player_notes;
DROP TABLE IF EXISTS campaign_sublocation_player_notes;

-- ============================================================
-- Retired tables
-- Definitions removed from init.sql / v2Alter.sql; dropped here so
-- existing databases shed them too. No code reads or writes them.
-- ============================================================
DROP TABLE IF EXISTS player_cast_notes CASCADE;
DROP TABLE IF EXISTS campaign_player_notes CASCADE;
DROP TABLE IF EXISTS player_card_memories CASCADE;
DROP TABLE IF EXISTS campaign_sessions CASCADE;
DROP TABLE IF EXISTS admin_invite_codes CASCADE;
DROP TABLE IF EXISTS faction_participants CASCADE;
DROP TABLE IF EXISTS campaign_player_faction_relationships CASCADE;
DROP TABLE IF EXISTS faction_relationships CASCADE;
DROP TABLE IF EXISTS campaign_session_chronicles CASCADE;
DROP TABLE IF EXISTS campaign_session_archived CASCADE;
