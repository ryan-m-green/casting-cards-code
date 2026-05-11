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

-- [007] Campaign location player notes
CREATE TABLE IF NOT EXISTS campaign_location_player_notes (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    location_instance_id UUID        NOT NULL REFERENCES campaign_location_instances(instance_id) ON DELETE CASCADE,
    notes                TEXT        NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, location_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_camp_loc_player_notes_campaign  ON campaign_location_player_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_loc_player_notes_location  ON campaign_location_player_notes(location_instance_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_camp_loc_player_notes_campaign_location'
    ) THEN
        ALTER TABLE campaign_location_player_notes
            ADD CONSTRAINT uq_camp_loc_player_notes_campaign_location UNIQUE (campaign_id, location_instance_id);
    END IF;
END$$;

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

-- [014] Faction library tables (must exist before campaign_faction_instances references them)
CREATE TABLE IF NOT EXISTS factions (
    faction_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(50)  NOT NULL
                 CHECK (type IN ('Criminal Syndicate','Guild','Military Order','Political Body','Religious Cult','Secret Society')),
    influence    SMALLINT     NOT NULL DEFAULT 5
                 CHECK (influence BETWEEN 0 AND 10),
    perception   SMALLINT     NOT NULL DEFAULT 0
                 CHECK (perception BETWEEN -5 AND 5),
    hidden       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_factions_dm ON factions(dm_user_id);

-- [014] Drop faction_participants table if it exists
DROP TABLE IF EXISTS faction_participants CASCADE;

-- [014] Campaign Faction Instances
CREATE TABLE IF NOT EXISTS campaign_faction_instances (
    faction_instance_id   UUID      PRIMARY KEY,
    source_faction_id     UUID      NOT NULL REFERENCES factions(faction_id) ON DELETE RESTRICT,
    campaign_id           UUID      NOT NULL REFERENCES campaigns(id)        ON DELETE CASCADE,
    dm_user_id            UUID      NOT NULL,
    name                  TEXT      NOT NULL,
    type                  TEXT      NOT NULL DEFAULT '',
    influence             SMALLINT  NOT NULL DEFAULT 5,
    perception            SMALLINT  NOT NULL DEFAULT 0,
    hidden                BOOLEAN   NOT NULL DEFAULT FALSE,
    is_visible_to_players BOOLEAN   NOT NULL DEFAULT FALSE,
    symbol_path           TEXT,
    created_at            TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cfi_campaign ON campaign_faction_instances(campaign_id);

-- [015] Campaign Faction ↔ Sublocation junction
CREATE TABLE IF NOT EXISTS campaign_faction_sublocations (
    id                      UUID PRIMARY KEY,
    faction_instance_id     UUID NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    sublocation_instance_id UUID NOT NULL REFERENCES campaign_sublocation_instances(instance_id)    ON DELETE CASCADE,
    CONSTRAINT uq_faction_sublocation UNIQUE (faction_instance_id, sublocation_instance_id)
);

-- [016] Campaign Faction ↔ Cast junction
CREATE TABLE IF NOT EXISTS campaign_faction_cast_members (
    id                  UUID PRIMARY KEY,
    faction_instance_id UUID NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    cast_instance_id    UUID NOT NULL REFERENCES campaign_cast_instances(instance_id)            ON DELETE CASCADE,
    CONSTRAINT uq_faction_cast UNIQUE (faction_instance_id, cast_instance_id)
);

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

-- [014] faction_relationships and player faction relationships
CREATE TABLE IF NOT EXISTS faction_relationships (
    faction_relationship_id UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id             UUID    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_a_id            UUID    NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
    faction_b_id            UUID    NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
    relationship_type       VARCHAR(100),
    relationship_strength   INTEGER,
    notes                   TEXT,
    CONSTRAINT chk_faction_relationship_no_self CHECK (faction_a_id <> faction_b_id)
);

CREATE TABLE IF NOT EXISTS campaign_player_faction_relationships (
    campaign_player_faction_relationship_id UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id                             UUID    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_a_id                            UUID    NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
    faction_b_id                            UUID    NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
    relationship_type                       VARCHAR(100),
    relationship_strength                   INTEGER,
    notes                                   TEXT,
    CONSTRAINT chk_player_faction_relationship_no_self CHECK (faction_a_id <> faction_b_id)
);
CREATE INDEX IF NOT EXISTS idx_player_faction_relationships_campaign ON campaign_player_faction_relationships(campaign_id);

-- [016] Campaign faction instance relationships
CREATE TABLE IF NOT EXISTS campaign_faction_instance_relationships (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_instance_id_a UUID         NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    faction_instance_id_b UUID         NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    relationship_type     VARCHAR(50)  NOT NULL CHECK (relationship_type IN ('allied','rival','enemy','neutral')),
    strength              SMALLINT     NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 5),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_campaign_faction_instance_relationship_no_self CHECK (faction_instance_id_a <> faction_instance_id_b),
    CONSTRAINT uq_campaign_faction_instance_relationship UNIQUE (campaign_id, faction_instance_id_a, faction_instance_id_b)
);
CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_campaign ON campaign_faction_instance_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_a ON campaign_faction_instance_relationships(faction_instance_id_a);
CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_b ON campaign_faction_instance_relationships(faction_instance_id_b);
CREATE INDEX IF NOT EXISTS idx_player_faction_relationships_a        ON campaign_player_faction_relationships(faction_a_id);
CREATE INDEX IF NOT EXISTS idx_player_faction_relationships_b        ON campaign_player_faction_relationships(faction_b_id);

CREATE INDEX IF NOT EXISTS idx_faction_relationships_a        ON faction_relationships(faction_a_id);
CREATE INDEX IF NOT EXISTS idx_faction_relationships_b        ON faction_relationships(faction_b_id);

CREATE TABLE IF NOT EXISTS faction_participants (
    faction_participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id            UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    cast_instance_id       UUID NOT NULL
                           REFERENCES campaign_cast_instances(instance_id) ON DELETE CASCADE,
    faction_id             UUID NOT NULL REFERENCES factions(faction_id) ON DELETE CASCADE,
    role                   VARCHAR(100),
    motivation             TEXT
);
CREATE INDEX IF NOT EXISTS idx_faction_participants_campaign ON faction_participants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_faction_participants_faction  ON faction_participants(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_participants_cast     ON faction_participants(cast_instance_id);

-- [015] Add symbol_path to factions
ALTER TABLE factions
    ADD COLUMN IF NOT EXISTS symbol_path TEXT;

-- [016b] Add description and dm_notes to factions
ALTER TABLE factions
    ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE factions
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [016c] Add description and dm_notes to campaign_faction_instances
ALTER TABLE campaign_faction_instances
    ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campaign_faction_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [017] Campaign Faction Player Notes
CREATE TABLE IF NOT EXISTS campaign_faction_player_notes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_instance_id UUID        NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    perception          SMALLINT,
    influence           SMALLINT,
    player_notes        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaign_faction_player_notes
    ADD COLUMN IF NOT EXISTS type TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_camp_faction_player_notes_campaign_faction'
    ) THEN
        ALTER TABLE campaign_faction_player_notes
            ADD CONSTRAINT uq_camp_faction_player_notes_campaign_faction UNIQUE (campaign_id, faction_instance_id);
    END IF;
END $$;

-- [017] Add primary flag to faction sublocation and cast junction tables
ALTER TABLE campaign_faction_sublocations
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE campaign_faction_cast_members
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE campaign_faction_sublocations
    ADD COLUMN IF NOT EXISTS dm_user_id UUID;

ALTER TABLE campaign_faction_cast_members
    ADD COLUMN IF NOT EXISTS dm_user_id UUID;

-- [018] Add dm_notes to sublocations
ALTER TABLE sublocations
    ADD COLUMN IF NOT EXISTS dm_notes TEXT NOT NULL DEFAULT '';

-- [019] Add dm_notes to locations
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS dm_notes TEXT NOT NULL DEFAULT '';


-- [020] Add voice_notes to campaign_cast_instances
ALTER TABLE campaign_cast_instances
    ADD COLUMN IF NOT EXISTS voice_notes TEXT;

-- [021] Campaign sublocation player notes
CREATE TABLE IF NOT EXISTS campaign_sublocation_player_notes (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id             UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    sublocation_instance_id UUID        NOT NULL REFERENCES campaign_sublocation_instances(instance_id) ON DELETE CASCADE,
    notes                   TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, sublocation_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_camp_subloc_player_notes_campaign  ON campaign_sublocation_player_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_subloc_player_notes_subloc    ON campaign_sublocation_player_notes(sublocation_instance_id);

-- [021] Add dm_user_id to campaign_faction_instance_relationships to distinguish DM-owned vs player-owned rows
ALTER TABLE campaign_faction_instance_relationships
    ADD COLUMN IF NOT EXISTS dm_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- [022] Add faction symbol association to campaign_sublocation_instances
ALTER TABLE campaign_sublocation_instances
    ADD COLUMN IF NOT EXISTS faction_instance_id UUID REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE SET NULL;

ALTER TABLE campaign_sublocation_instances
    ADD COLUMN IF NOT EXISTS symbol_path TEXT;

-- [023] Add faction symbols (JSONB array) to campaign_cast_instances
ALTER TABLE campaign_cast_instances
    ADD COLUMN IF NOT EXISTS faction_symbols JSONB NOT NULL DEFAULT '[]';

-- [024] Allow DM and player records to coexist in faction junction tables
--       Drop the broad unique constraints that cover (faction_instance_id, cast/sublocation_instance_id)
--       and replace them with separate partial indexes: one scoped to DM rows (dm_user_id IS NOT NULL)
--       and one scoped to player rows (dm_user_id IS NULL).
ALTER TABLE campaign_faction_cast_members
    DROP CONSTRAINT IF EXISTS uq_faction_cast;

ALTER TABLE campaign_faction_sublocations
    DROP CONSTRAINT IF EXISTS uq_faction_sublocation;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_cast_dm
    ON campaign_faction_cast_members (faction_instance_id, cast_instance_id, dm_user_id)
    WHERE dm_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_cast_player
    ON campaign_faction_cast_members (faction_instance_id, cast_instance_id)
    WHERE dm_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_sublocation_dm
    ON campaign_faction_sublocations (faction_instance_id, sublocation_instance_id, dm_user_id)
    WHERE dm_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_sublocation_player
    ON campaign_faction_sublocations (faction_instance_id, sublocation_instance_id)
    WHERE dm_user_id IS NULL;

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

-- [027] Create player_quicknote_queue table
--       Stores per-player unsorted notes that can be routed later.
CREATE TABLE IF NOT EXISTS player_quicknote_queue (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player_user_id  UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    content         TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_quicknote_queue_campaign ON player_quicknote_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_quicknote_queue_player   ON player_quicknote_queue(player_user_id);

-- [028] Create campaign_player_notes table
--       Stores shared freeform campaign-level notes for all players.
CREATE TABLE IF NOT EXISTS campaign_player_notes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
    notes       TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_player_notes_campaign ON campaign_player_notes(campaign_id);

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
-- If campaign_events still exists, drop the empty shell init.sql may have created and rename.
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaign_events') THEN
        DROP TABLE IF EXISTS campaign_storyline;
        ALTER TABLE campaign_events RENAME TO campaign_storyline;
    END IF;
END $$;

-- [032] Ensure visible_to_players exists (for databases that already had campaign_events)
ALTER TABLE IF EXISTS campaign_storyline
    ADD COLUMN IF NOT EXISTS visible_to_players BOOLEAN NOT NULL DEFAULT FALSE;

-- [033] Drop event_completed and date_added columns (created_at serves the same purpose)
ALTER TABLE IF EXISTS campaign_storyline
    DROP COLUMN IF EXISTS event_completed;
ALTER TABLE IF EXISTS campaign_storyline
    DROP COLUMN IF EXISTS date_added;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'campaign_storyline' AND indexname = 'idx_campaign_storyline_campaign'
    ) THEN
        CREATE INDEX idx_campaign_storyline_campaign ON campaign_storyline(campaign_id);
    END IF;
END $$;

-- [034] Add is_demo flag to campaigns — admin-only flag to mark showcase/demo campaigns
ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NULL;

-- [035] Add sort_order to campaign_storyline — enables drag-and-drop reordering of storyline events
ALTER TABLE campaign_storyline
    ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- [036] Add tod_position_percent to campaign_storyline — stores time-of-day cursor position to fire on storyline unlock
ALTER TABLE campaign_storyline
    ADD COLUMN IF NOT EXISTS tod_position_percent DECIMAL(5,2) NULL;
