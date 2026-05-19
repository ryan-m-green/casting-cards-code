-- ─── Migrations ───────────────────────────────────────────────────────────────
-- All ALTER statements must be idempotent (IF NOT EXISTS / IF EXISTS).
-- Add new migrations at the bottom of this file.
-- All ALTER statements must be idempotent (IF NOT EXISTS / IF EXISTS).
-- Add new migrations at the bottom of this file.

-- [001] Add dm_notes to campaign_location_instances
ALTER TABLE campaign_location_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [002] Add dm_notes to campaign_sublocation_instances
ALTER TABLE campaign_sublocation_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [003] Add is_scratched_off to campaign_sublocation_shop_items
ALTER TABLE campaign_sublocation_shop_items
    ADD COLUMN IF NOT EXISTS is_scratched_off BOOLEAN NOT NULL DEFAULT FALSE;

-- [004] Add dm_notes to campaign_cast_instances
ALTER TABLE campaign_cast_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [006] Add voice_notes to casts
ALTER TABLE casts
    ADD COLUMN IF NOT EXISTS voice_notes TEXT;

-- [008] Rename gold_transactions → currency_transactions; add currency_type column

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gold_transactions')
       AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'currency_transactions') THEN
        ALTER TABLE gold_transactions RENAME TO currency_transactions;
    END IF;
END $$;

ALTER TABLE currency_transactions
    ADD COLUMN IF NOT EXISTS currency_type VARCHAR(5) NOT NULL DEFAULT 'gp'
        CHECK (currency_type IN ('cp','sp','ep','gp','pp'));

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'currency_transactions' AND indexname = 'idx_currency_campaign'
    ) THEN
        CREATE INDEX idx_currency_campaign ON currency_transactions(campaign_id);
    END IF;
END $$;

-- [009] Drop current_gold from campaign_players — currency balances are derived from currency_transactions
ALTER TABLE campaign_players DROP COLUMN IF EXISTS current_gold;

-- [010] Add player-local date to memories (sent from browser, avoids UTC midnight mismatch)
-- This column was added to player_card_memories in init.sql with DEFAULT CURRENT_DATE

-- [011] Campaign Day Counter — track how many in-game days have passed
-- This column was added to campaign_time_of_day in init.sql

-- [013] The Party: add campaign_id to locations so party anchor rows are scoped to a campaign
--       and excluded from the DM's location library (WHERE campaign_id IS NULL).
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations(campaign_id);

-- [012] Add missing unique constraint on location_political_notes required for ON CONFLICT upsert
--       First deduplicate any rows sharing the same (campaign_id, location_instance_id), keeping the latest.
DO $$ BEGIN
    DELETE FROM location_political_notes a
    USING location_political_notes b
    WHERE a.campaign_id = b.campaign_id
      AND a.location_instance_id = b.location_instance_id
      AND a.updated_at < b.updated_at;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'location_political_notes'
          AND constraint_name = 'uq_location_political_notes'
    ) THEN
        ALTER TABLE location_political_notes
            ADD CONSTRAINT uq_location_political_notes UNIQUE (campaign_id, location_instance_id);
    END IF;
END $$;

-- [014] faction_relationships and player faction relationships (now in init.sql)
-- [014] Drop faction_participants table if it exists (recreated in init.sql)
DROP TABLE IF EXISTS faction_participants CASCADE;

-- [015] Add symbol_path to factions (now included in init.sql)

-- [016b] Add description and dm_notes to factions (now included in init.sql)

-- [016c] Add description and dm_notes to campaign_faction_instances (now included in init.sql)

-- [017] Campaign Faction Player Notes (now in init.sql)

-- [017] Add primary flag to faction sublocation and cast junction tables (now included in init.sql)

-- [017] Add dm_user_id to junction tables (now included in init.sql)

-- [018] Add dm_notes to sublocations
ALTER TABLE sublocations
    ADD COLUMN IF NOT EXISTS dm_notes TEXT NOT NULL DEFAULT '';

-- [019] Add dm_notes to locations
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS dm_notes TEXT NOT NULL DEFAULT '';


-- [020] Add voice_notes to campaign_cast_instances
ALTER TABLE campaign_cast_instances
    ADD COLUMN IF NOT EXISTS voice_notes TEXT;

-- [021] Campaign sublocation player notes (now in init.sql)

-- [021] Add dm_user_id to campaign_faction_instance_relationships to distinguish DM-owned vs player-owned rows
-- This column was added to campaign_faction_instance_relationships in init.sql

-- [022] Add faction symbol association to campaign_sublocation_instances
-- These columns were added to campaign_sublocation_instances in init.sql

-- [023] Add faction symbols (JSONB array) to campaign_cast_instances
-- This column was added to campaign_cast_instances in init.sql

-- [024] Allow DM and player records to coexist in faction junction tables
--       Drop the broad unique constraints that cover (faction_instance_id, cast/sublocation_instance_id)
--       and replace them with separate partial indexes: one scoped to DM rows (dm_user_id IS NOT NULL)
--       and one scoped to player rows (dm_user_id IS NULL).
--       These unique indexes are now defined in init.sql
ALTER TABLE campaign_faction_cast_members
    DROP CONSTRAINT IF EXISTS uq_faction_cast;

ALTER TABLE campaign_faction_sublocations
    DROP CONSTRAINT IF EXISTS uq_faction_sublocation;

-- [025] Add player_faction_symbols column to campaign_cast_instances
--       Stores the player's personal faction symbol assignments separately from the DM's.
ALTER TABLE campaign_cast_instances
    ADD COLUMN IF NOT EXISTS player_faction_symbols JSONB NOT NULL DEFAULT '[]';

-- [026] Add player faction symbol columns to campaign_sublocation_instances
--       Stores the player's personal faction association separately from the DM's.
ALTER TABLE campaign_sublocation_instances
    ADD COLUMN IF NOT EXISTS player_faction_instance_id UUID REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS player_symbol_path TEXT;

-- [027] Split price string into structured amount + currency_type on shop item tables
ALTER TABLE sublocation_shop_items
    ADD COLUMN IF NOT EXISTS price_amount        INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_currency_type VARCHAR(5)   NOT NULL DEFAULT 'gp'
        CHECK (price_currency_type IN ('cp','sp','ep','gp','pp'));
ALTER TABLE sublocation_shop_items
    DROP COLUMN IF EXISTS price;

ALTER TABLE campaign_sublocation_shop_items
    ADD COLUMN IF NOT EXISTS price_amount        INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_currency_type VARCHAR(5)   NOT NULL DEFAULT 'gp'
        CHECK (price_currency_type IN ('cp','sp','ep','gp','pp'));
ALTER TABLE campaign_sublocation_shop_items
    DROP COLUMN IF EXISTS price;

-- [028] Remove starting_gold from campaign_players (superseded by currency_transactions)
ALTER TABLE campaign_players
    DROP COLUMN IF EXISTS starting_gold;

-- [027] Create player_quicknote_queue table (now in init.sql)

-- [028] Create campaign_player_notes table (now in init.sql)

-- [029] Rename want → notes in campaign_cast_player_notes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_cast_player_notes' AND column_name = 'want'
    ) THEN
        ALTER TABLE campaign_cast_player_notes RENAME COLUMN want TO notes;
    END IF;
END $$;

-- [030] Add is_party_anchor to campaign_location_instances
--       Marks the auto-generated party anchor location as a system record so the
--       frontend can filter it out of the campaign locations grid.
ALTER TABLE campaign_location_instances
    ADD COLUMN IF NOT EXISTS is_party_anchor BOOLEAN NOT NULL DEFAULT FALSE;

-- [031] Back-fill is_party_anchor for existing party anchor location instances.
--       Party anchor locations are identifiable because their source location record
--       has a non-null campaign_id (set by migration [013]).
UPDATE campaign_location_instances cli
SET    is_party_anchor = TRUE
FROM   locations l
WHERE  cli.source_location_id = l.id
  AND  l.campaign_id IS NOT NULL
  AND  cli.is_party_anchor = FALSE;

-- [032] Campaign Storyline — rename campaign_events → campaign_storyline
-- campaign_storyline table is now defined in init.sql
-- If campaign_events still exists from an old migration, rename it
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_events') THEN
        DROP TABLE IF EXISTS campaign_storyline;
        ALTER TABLE campaign_events RENAME TO campaign_storyline;
    END IF;
END $$;

-- [032] Ensure visible_to_players exists (for databases that already had campaign_events)
-- visible_to_players column is now included in the campaign_storyline table in init.sql

-- [033] Drop event_completed and date_added columns (created_at serves the same purpose)
-- These columns are not included in the init.sql definition
ALTER TABLE IF EXISTS campaign_storyline
    DROP COLUMN IF EXISTS event_completed;
ALTER TABLE IF EXISTS campaign_storyline
    DROP COLUMN IF EXISTS date_added;

-- [034] Add is_demo flag to campaigns — admin-only flag to mark showcase/demo campaigns
ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NULL;

-- [035] Add sort_order to campaign_storyline — enables drag-and-drop reordering of storyline events
-- sort_order column is now included in the campaign_storyline table in init.sql

-- [036] Add tod_position_percent to campaign_storyline — stores time-of-day cursor position to fire on storyline unlock
-- tod_position_percent column is now included in the campaign_storyline table in init.sql
