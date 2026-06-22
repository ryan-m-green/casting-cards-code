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