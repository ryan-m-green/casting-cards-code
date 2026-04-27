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

-- [005] Time-of-Day: campaign day/night cycle config
CREATE TABLE IF NOT EXISTS campaign_time_of_day (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id              UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    day_length_hours         NUMERIC(6,2) NOT NULL DEFAULT 24,
    cursor_position_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id)
);

-- [006] Add voice_notes to casts
ALTER TABLE casts
    ADD COLUMN IF NOT EXISTS voice_notes TEXT;

CREATE TABLE IF NOT EXISTS campaign_tod_slices (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    label           TEXT         NOT NULL,
    color           TEXT         NOT NULL,
    duration_hours  NUMERIC(6,2) NOT NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    dm_notes        TEXT,
    player_notes    TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- [007] Player Cards — The Company feature
-- One player card per player per campaign. Created by the player on first entry.
CREATE TABLE IF NOT EXISTS player_cards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player_user_id   UUID         NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    race             VARCHAR(100) NOT NULL,
    class            VARCHAR(100) NOT NULL,
    description      TEXT,
    image_path       TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_card UNIQUE (campaign_id, player_user_id)
);

CREATE INDEX IF NOT EXISTS idx_player_cards_campaign    ON player_cards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_cards_player_user ON player_cards(player_user_id);

-- Active D&D conditions assigned to a player card by the DM.
CREATE TABLE IF NOT EXISTS player_card_conditions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_card_id UUID         NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    condition_name VARCHAR(100) NOT NULL,
    assigned_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_card_conditions_card ON player_card_conditions(player_card_id);

-- Chronicle entries (memories) authored by the player.
CREATE TABLE IF NOT EXISTS player_card_memories (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_card_id UUID         NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    memory_type    VARCHAR(20)  NOT NULL CHECK (memory_type IN ('KEY_EVENT','ENCOUNTER','DISCOVERY','DECISION','LOSS','BOND')),
    session_number INT,
    title          VARCHAR(255) NOT NULL,
    detail         TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_card_memories_card ON player_card_memories(player_card_id);

-- Goals, fears, and flaws authored by the player.
CREATE TABLE IF NOT EXISTS player_card_traits (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_card_id UUID        NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    trait_type     VARCHAR(10) NOT NULL CHECK (trait_type IN ('GOAL','FEAR','FLAW')),
    content        TEXT        NOT NULL,
    is_completed   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_card_traits_card ON player_card_traits(player_card_id);

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

-- [009] Bug reports — global across the application
CREATE TABLE IF NOT EXISTS bug_reports (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT         NOT NULL,
    steps_to_reproduce TEXT,
    severity         VARCHAR(10)  NOT NULL DEFAULT 'Medium'
                                  CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    page_url         VARCHAR(500),
    device           VARCHAR(255),
    browser          VARCHAR(255),
    os               VARCHAR(255),
    screen_resolution VARCHAR(50),
    is_fixed         BOOLEAN      NOT NULL DEFAULT FALSE,
    fixed_at         TIMESTAMPTZ,
    reported_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user    ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_is_fixed ON bug_reports(is_fixed);

-- Private secrets delivered by the DM; shareable to the party.
CREATE TABLE IF NOT EXISTS player_card_secrets (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    player_card_id UUID        NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    content        TEXT        NOT NULL,
    is_shared      BOOLEAN     NOT NULL DEFAULT FALSE,
    shared_at      TIMESTAMPTZ,
    shared_by      VARCHAR(10) CHECK (shared_by IN ('DM','PLAYER')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_card_secrets_card ON player_card_secrets(player_card_id);

-- Player impression notes per cast/location/sublocation instance.
-- Exactly one FK column must be non-null (same pattern as campaign_secrets).
CREATE TABLE IF NOT EXISTS player_cast_perceptions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_card_id          UUID NOT NULL REFERENCES player_cards(id) ON DELETE CASCADE,
    cast_instance_id        UUID REFERENCES campaign_cast_instances(instance_id)        ON DELETE CASCADE,
    location_instance_id    UUID REFERENCES campaign_location_instances(instance_id)    ON DELETE CASCADE,
    sublocation_instance_id UUID REFERENCES campaign_sublocation_instances(instance_id) ON DELETE CASCADE,
    impression              TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_perception_exactly_one_entity CHECK (
        (cast_instance_id        IS NOT NULL)::int +
        (location_instance_id    IS NOT NULL)::int +
        (sublocation_instance_id IS NOT NULL)::int = 1
    ),
    CONSTRAINT uq_player_perception UNIQUE (player_card_id, cast_instance_id, location_instance_id, sublocation_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_player_perception_card         ON player_cast_perceptions(player_card_id);
CREATE INDEX IF NOT EXISTS idx_player_perception_cast         ON player_cast_perceptions(cast_instance_id);
CREATE INDEX IF NOT EXISTS idx_player_perception_location     ON player_cast_perceptions(location_instance_id);
CREATE INDEX IF NOT EXISTS idx_player_perception_sublocation  ON player_cast_perceptions(sublocation_instance_id);

-- [009] Drop current_gold from campaign_players — currency balances are derived from currency_transactions
ALTER TABLE campaign_players DROP COLUMN IF EXISTS current_gold;

-- [010] Add player-local date to memories (sent from browser, avoids UTC midnight mismatch)
ALTER TABLE player_card_memories
    ADD COLUMN IF NOT EXISTS memory_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- [011] Campaign Day Counter — track how many in-game days have passed
ALTER TABLE campaign_time_of_day
    ADD COLUMN IF NOT EXISTS days_passed INT NOT NULL DEFAULT 0;

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
