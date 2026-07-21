-- Cast Library Database Schema
-- Fresh install — drop all tables externally before running, or run against a blank database.
-- Run: psql -U postgres -d cast_library -f init.sql

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    role          VARCHAR(10)  NOT NULL CHECK (role IN ('DM', 'Player', 'Admin')),
    keywords      TEXT[]       NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Campaigns ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    fantasy_type VARCHAR(100),
    status       VARCHAR(20)  NOT NULL DEFAULT 'Active'
                              CHECK (status IN ('Active','Paused','Completed')),
    spine_color  VARCHAR(20),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_players (
    campaign_id    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player_user_id UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    starting_gold  INT  NOT NULL DEFAULT 50,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, player_user_id)
);

CREATE TABLE IF NOT EXISTS campaign_invite_codes (
    campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    code        VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (campaign_id)
);

-- ─── Library: Locations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    classification VARCHAR(100),
    size           VARCHAR(50),
    condition      VARCHAR(50),
    geography      TEXT,
    architecture   TEXT,
    climate        TEXT,
    religion       TEXT,
    vibe           TEXT,
    languages      TEXT,
    description    TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Library: Sublocations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sublocations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id  UUID         REFERENCES locations(id) ON DELETE SET NULL,
    dm_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sublocation_shop_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sublocation_id UUID         NOT NULL REFERENCES sublocations(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    price          VARCHAR(50),
    description    TEXT,
    sort_order     INT          NOT NULL DEFAULT 0
);

-- ─── Library: Casts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name               VARCHAR(255) NOT NULL,
    pronouns           VARCHAR(50),
    race               VARCHAR(100),
    role               VARCHAR(100),
    age                VARCHAR(20),
    alignment          VARCHAR(100),
    posture            VARCHAR(100),
    speed              VARCHAR(100),
    voice_placement    TEXT[],
    description        TEXT,
    public_description TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Campaign Instances: Locations ──────────────────────────────────────────────
-- source_location_id NOT NULL: a location instance must always reference its library location.
-- ON DELETE RESTRICT: prevents deleting a library location while campaign instances reference it.
CREATE TABLE IF NOT EXISTS campaign_location_instances (
    instance_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_location_id    UUID         NOT NULL REFERENCES locations(id)    ON DELETE RESTRICT,
    name                  VARCHAR(255) NOT NULL,
    classification        VARCHAR(100),
    size                  VARCHAR(50),
    condition             VARCHAR(50),
    geography             TEXT,
    architecture          TEXT,
    climate               TEXT,
    religion              TEXT,
    vibe                  TEXT,
    languages             TEXT,
    description           TEXT,
    is_visible_to_players BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order            INT         NOT NULL DEFAULT 0,
    keywords              TEXT[]      NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Factions ─────────────────────────────────────────────────────────────────
-- DM's faction library.
CREATE TABLE IF NOT EXISTS factions (
    faction_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(50)  NOT NULL,
    influence    SMALLINT     NOT NULL DEFAULT 5
                 CHECK (influence BETWEEN 0 AND 10),
    perception   SMALLINT     NOT NULL DEFAULT 0
                 CHECK (perception BETWEEN -5 AND 5),
    hidden       BOOLEAN      NOT NULL DEFAULT FALSE,
    symbol_path  TEXT,
    description  TEXT,
    dm_notes     TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factions_dm ON factions(dm_user_id);

-- Campaign Faction Instances
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
    description           TEXT,
    dm_notes              TEXT,
    created_at            TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cfi_campaign ON campaign_faction_instances(campaign_id);

-- ─── Campaign Instances: Sublocations ────────────────────────────────────────
-- source_sublocation_id NOT NULL: a sublocation instance must always reference its library sublocation.
--   ON DELETE RESTRICT: prevents deleting a library sublocation while campaign instances exist.
-- location_instance_id NOT NULL: a sublocation must belong to a location.
--   ON DELETE CASCADE: deleting a location instance cascades to delete its sublocation instances.
-- A sublocation can hold many cast instances (one-to-many). Cast instances reference this table.
CREATE TABLE IF NOT EXISTS campaign_sublocation_instances (
    instance_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           UUID         NOT NULL REFERENCES campaigns(id)                              ON DELETE CASCADE,
    source_sublocation_id UUID         NOT NULL REFERENCES sublocations(id)                           ON DELETE RESTRICT,
    location_instance_id  UUID         NOT NULL REFERENCES campaign_location_instances(instance_id)   ON DELETE CASCADE,
    name                  VARCHAR(255) NOT NULL,
    description           TEXT,
    image_path            TEXT,
    is_visible_to_players BOOLEAN      NOT NULL DEFAULT FALSE,
    custom_items          JSONB        NOT NULL DEFAULT '[]',
    keywords              TEXT[]       NOT NULL DEFAULT '{}',
    faction_instance_id   UUID         REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE SET NULL,
    symbol_path           TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Campaign Instances: Casts ─────────────────────────────────────────────────
-- source_cast_id NOT NULL: a Cast instance must always reference its library Cast.
--   ON DELETE RESTRICT: prevents deleting a library Cast while campaign instances exist.
-- location_instance_id NOT NULL: a Cast must belong to a location.
--   ON DELETE CASCADE: deleting a location instance cascades to delete its Cast instances.
-- sublocation_instance_id NOT NULL: a Cast must be settled at a sublocation.
--   ON DELETE CASCADE: deleting a sublocation instance cascades to delete its Cast instances.
CREATE TABLE IF NOT EXISTS campaign_cast_instances (
    instance_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id              UUID         NOT NULL REFERENCES campaigns(id)                              ON DELETE CASCADE,
    source_cast_id           UUID         NOT NULL REFERENCES casts(id)                                  ON DELETE RESTRICT,
    location_instance_id     UUID         NOT NULL REFERENCES campaign_location_instances(instance_id)   ON DELETE CASCADE,
    sublocation_instance_id  UUID         NOT NULL REFERENCES campaign_sublocation_instances(instance_id) ON DELETE CASCADE,
    name                     VARCHAR(255) NOT NULL,
    pronouns                 VARCHAR(50),
    race                     VARCHAR(100),
    role                     VARCHAR(100),
    age                      VARCHAR(20),
    alignment                VARCHAR(100),
    posture                  VARCHAR(100),
    speed                    VARCHAR(100),
    voice_placement          TEXT[],
    description              TEXT,
    public_description       TEXT,
    is_visible_to_players    BOOLEAN      NOT NULL DEFAULT FALSE,
    custom_items             JSONB        NOT NULL DEFAULT '[]',
    keywords                 TEXT[]       NOT NULL DEFAULT '{}',
    faction_symbols          JSONB        NOT NULL DEFAULT '[]',
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_sublocation_shop_items (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sublocation_instance_id   UUID         NOT NULL REFERENCES campaign_sublocation_instances(instance_id) ON DELETE CASCADE,
    source_sublocation_shop_id UUID        REFERENCES sublocation_shop_items(id) ON DELETE SET NULL,
    name                      VARCHAR(255) NOT NULL,
    price                     VARCHAR(50),
    description               TEXT,
    sort_order                INT          NOT NULL DEFAULT 0
);

-- ─── Campaign Secrets ─────────────────────────────────────────────────────────
-- Replaces the former polymorphic design (entity_type + instance_id) with typed FK columns.
-- Exactly one FK column must be non-null — enforced by chk_secrets_exactly_one_entity.
-- ON DELETE CASCADE on each FK: deleting any instance type automatically removes its secrets.
CREATE TABLE IF NOT EXISTS campaign_secrets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id             UUID         NOT NULL REFERENCES campaigns(id)                              ON DELETE CASCADE,
    cast_instance_id        UUID         REFERENCES campaign_cast_instances(instance_id)               ON DELETE CASCADE,
    location_instance_id    UUID         REFERENCES campaign_location_instances(instance_id)           ON DELETE CASCADE,
    sublocation_instance_id UUID         REFERENCES campaign_sublocation_instances(instance_id)        ON DELETE CASCADE,
    content                 TEXT         NOT NULL,
    sort_order              INT          NOT NULL DEFAULT 0,
    is_revealed             BOOLEAN      NOT NULL DEFAULT FALSE,
    revealed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_secrets_exactly_one_entity CHECK (
        (cast_instance_id        IS NOT NULL)::int +
        (location_instance_id    IS NOT NULL)::int +
        (sublocation_instance_id IS NOT NULL)::int = 1
    )
);

-- ─── Faction Relationships & Junctions ───────────────────────────────────────
-- Campaign Faction ↔ Sublocation junction
CREATE TABLE IF NOT EXISTS campaign_faction_sublocations (
    id                      UUID PRIMARY KEY,
    faction_instance_id     UUID NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    sublocation_instance_id UUID NOT NULL REFERENCES campaign_sublocation_instances(instance_id)    ON DELETE CASCADE,
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,
    dm_user_id              UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_sublocation_dm
    ON campaign_faction_sublocations (faction_instance_id, sublocation_instance_id, dm_user_id)
    WHERE dm_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_sublocation_player
    ON campaign_faction_sublocations (faction_instance_id, sublocation_instance_id)
    WHERE dm_user_id IS NULL;

-- Campaign Faction ↔ Cast junction
CREATE TABLE IF NOT EXISTS campaign_faction_cast_members (
    id                  UUID PRIMARY KEY,
    faction_instance_id UUID NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    cast_instance_id    UUID NOT NULL REFERENCES campaign_cast_instances(instance_id)            ON DELETE CASCADE,
    is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
    dm_user_id          UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_cast_dm
    ON campaign_faction_cast_members (faction_instance_id, cast_instance_id, dm_user_id)
    WHERE dm_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_faction_cast_player
    ON campaign_faction_cast_members (faction_instance_id, cast_instance_id)
    WHERE dm_user_id IS NULL;

-- Faction relationships (library-level)
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

CREATE INDEX IF NOT EXISTS idx_faction_relationships_a        ON faction_relationships(faction_a_id);
CREATE INDEX IF NOT EXISTS idx_faction_relationships_b        ON faction_relationships(faction_b_id);

-- Campaign player faction relationships
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
CREATE INDEX IF NOT EXISTS idx_player_faction_relationships_a        ON campaign_player_faction_relationships(faction_a_id);
CREATE INDEX IF NOT EXISTS idx_player_faction_relationships_b        ON campaign_player_faction_relationships(faction_b_id);

-- Campaign faction instance relationships
CREATE TABLE IF NOT EXISTS campaign_faction_instance_relationships (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id           UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_instance_id_a UUID         NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    faction_instance_id_b UUID         NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    relationship_type     VARCHAR(50)  NOT NULL CHECK (relationship_type IN ('allied','rival','enemy','neutral')),
    strength              SMALLINT     NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 5),
    dm_user_id            UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_campaign_faction_instance_relationship_no_self CHECK (faction_instance_id_a <> faction_instance_id_b),
    CONSTRAINT uq_campaign_faction_instance_relationship UNIQUE (campaign_id, faction_instance_id_a, faction_instance_id_b)
);

CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_campaign ON campaign_faction_instance_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_a ON campaign_faction_instance_relationships(faction_instance_id_a);
CREATE INDEX IF NOT EXISTS idx_campaign_faction_instance_relationships_b ON campaign_faction_instance_relationships(faction_instance_id_b);

-- Faction participants (cast members in factions)
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

-- Campaign Faction Player Notes
CREATE TABLE IF NOT EXISTS campaign_faction_player_notes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    faction_instance_id UUID        NOT NULL REFERENCES campaign_faction_instances(faction_instance_id) ON DELETE CASCADE,
    perception          SMALLINT,
    influence           SMALLINT,
    player_notes        TEXT,
    type                TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_camp_faction_player_notes_campaign_faction UNIQUE (campaign_id, faction_instance_id)
);

-- ─── Currency Transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS currency_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player_user_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
    amount           INT         NOT NULL,
    currency_type    VARCHAR(5)  NOT NULL DEFAULT 'gp' CHECK (currency_type IN ('cp','sp','ep','gp','pp')),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DM_GRANT','PURCHASE','ADJUSTMENT')),
    description      TEXT,
    created_by       UUID        REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Password Reset Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);


-- ─── Admin Invite Codes ──────────────────────────────────────────────────────
-- Global app-level invite code; at most one row at a time (single-row upsert pattern).
CREATE TABLE IF NOT EXISTS admin_invite_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(64) UNIQUE NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Migrations for existing databases ─────────────────────────────────────────
-- Add keywords columns to existing tables before creating indexes
ALTER TABLE users ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE campaign_location_instances ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE campaign_sublocation_instances ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE campaign_session_archived ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_session_chronicles ADD COLUMN IF NOT EXISTS keywords TEXT NOT NULL DEFAULT '';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Library
CREATE INDEX IF NOT EXISTS idx_casts_dm_user              ON casts(dm_user_id);
CREATE INDEX IF NOT EXISTS idx_locations_dm_user          ON locations(dm_user_id);
CREATE INDEX IF NOT EXISTS idx_sublocations_location      ON sublocations(location_id);
CREATE INDEX IF NOT EXISTS idx_subloc_shop_sublocation    ON sublocation_shop_items(sublocation_id);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_dm_user          ON campaigns(dm_user_id);

-- Campaign location instances
CREATE INDEX IF NOT EXISTS idx_camp_location_campaign     ON campaign_location_instances(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_location_source       ON campaign_location_instances(source_location_id);

-- Campaign Cast instances
CREATE INDEX IF NOT EXISTS idx_camp_cast_campaign         ON campaign_cast_instances(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_cast_location         ON campaign_cast_instances(location_instance_id);
CREATE INDEX IF NOT EXISTS idx_camp_cast_sublocation      ON campaign_cast_instances(sublocation_instance_id);

-- Campaign sublocation instances
CREATE INDEX IF NOT EXISTS idx_camp_subloc_campaign       ON campaign_sublocation_instances(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_subloc_location       ON campaign_sublocation_instances(location_instance_id);

-- Campaign sublocation shop items
CREATE INDEX IF NOT EXISTS idx_camp_subloc_shop_instance  ON campaign_sublocation_shop_items(sublocation_instance_id);

-- Campaign secrets (typed FKs replace former instance_id index)
CREATE INDEX IF NOT EXISTS idx_camp_secrets_campaign      ON campaign_secrets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_secrets_cast          ON campaign_secrets(cast_instance_id);
CREATE INDEX IF NOT EXISTS idx_camp_secrets_location      ON campaign_secrets(location_instance_id);
CREATE INDEX IF NOT EXISTS idx_camp_secrets_sublocation   ON campaign_secrets(sublocation_instance_id);

-- Currency transactions
CREATE INDEX IF NOT EXISTS idx_currency_campaign          ON currency_transactions(campaign_id);

-- Password reset tokens
CREATE INDEX IF NOT EXISTS idx_prt_token_hash             ON password_reset_tokens(token_hash);

-- ─── Cast Relationships ────────────────────────────────────────────────────────
-- Directional sentiment between Cast instances within a campaign.
-- value: -5 (hostile) .. +5 (friendly). 0 = neutral baseline (row omitted).
-- source ≠ target enforced by check constraint.
-- Re-run safe: CREATE IF NOT EXISTS + IF NOT EXISTS on constraint names.
CREATE TABLE IF NOT EXISTS campaign_cast_relationships (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id             UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_cast_instance_id  UUID        NOT NULL REFERENCES campaign_cast_instances(instance_id) ON DELETE CASCADE,
    target_cast_instance_id  UUID        NOT NULL REFERENCES campaign_cast_instances(instance_id) ON DELETE CASCADE,
    value                   INT         NOT NULL DEFAULT 0 CHECK (value >= -5 AND value <= 5),
    explanation             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cast_relationship       UNIQUE  (source_cast_instance_id, target_cast_instance_id),
    CONSTRAINT chk_no_self_relationship  CHECK   (source_cast_instance_id <> target_cast_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_cast_rel_campaign  ON campaign_cast_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cast_rel_source    ON campaign_cast_relationships(source_cast_instance_id);
CREATE INDEX IF NOT EXISTS idx_cast_rel_target    ON campaign_cast_relationships(target_cast_instance_id);

-- ─── Campaign Cast Player Notes ───────────────────────────────────────────────
-- One shared record per cast instance per campaign, writable by any campaign player.
-- Stores structured player observations: notes, connections, alignment, perception.
-- connections: text[] of cast instance UUID strings the player links to this cast.
-- perception: -5 (hateful) .. +5 (devoted). 0 = indifferent baseline.
CREATE TABLE IF NOT EXISTS campaign_cast_player_notes (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID         NOT NULL REFERENCES campaigns(id)                        ON DELETE CASCADE,
    cast_instance_id UUID         NOT NULL REFERENCES campaign_cast_instances(instance_id) ON DELETE CASCADE,
    notes             TEXT         NOT NULL DEFAULT '',
    connections      TEXT[]       NOT NULL DEFAULT '{}',
    alignment        VARCHAR(30)  NOT NULL DEFAULT '',
    perception       SMALLINT     NOT NULL DEFAULT 0 CHECK (perception >= -5 AND perception <= 5),
    rating           SMALLINT     NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 3),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cast_player_notes UNIQUE (campaign_id, cast_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_cast_player_notes_campaign ON campaign_cast_player_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cast_player_notes_cast     ON campaign_cast_player_notes(cast_instance_id);

-- ─── Campaign Storyline ───────────────────────────────────────────────────────
-- DM story scene entries per campaign (active only).
CREATE TABLE IF NOT EXISTS campaign_storyline (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    body                TEXT         NOT NULL CHECK (char_length(body) <= 50000),
    sort_order          INT          NOT NULL DEFAULT 0,
    linked_entities     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    file_path           VARCHAR(500),
    visible_to_players  BOOLEAN      NOT NULL DEFAULT FALSE,
    scene_type          VARCHAR(50)  NOT NULL DEFAULT 'campaign-event',
    marked_for_archive  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_storyline_campaign ON campaign_storyline(campaign_id);

-- ─── Campaign Sessions ─────────────────────────────────────────────────────────
-- Session tracking for campaign play sessions
CREATE TABLE IF NOT EXISTS campaign_sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    session_number      INT         NOT NULL,
    start_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time            TIMESTAMPTZ,
    start_in_game_day   INT         NOT NULL DEFAULT 1,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sessions_campaign ON campaign_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sessions_active ON campaign_sessions(campaign_id, is_active);

-- ─── Campaign Time of Day ─────────────────────────────────────────────────────
-- Tracks day/night cycle configuration per campaign.
CREATE TABLE IF NOT EXISTS campaign_time_of_day (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id              UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    day_length_hours         NUMERIC(6,2) NOT NULL DEFAULT 24,
    cursor_position_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
    days_passed              INT         NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id)
);

-- Time-of-day slices (dawn, day, dusk, night, etc.)
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

-- ─── Bug Reports ──────────────────────────────────────────────────────────────
-- Global application bug reports submitted by users.
CREATE TABLE IF NOT EXISTS bug_reports (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT         NOT NULL,
    steps_to_reproduce TEXT,
    severity         VARCHAR(10),
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

-- ─── Player Cards (The Company) ───────────────────────────────────────────────
-- Player character cards - one per player per campaign.
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
    memory_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
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

-- ─── Player Notes ─────────────────────────────────────────────────────────────
-- Campaign location player notes (shared per location per campaign)
CREATE TABLE IF NOT EXISTS campaign_location_player_notes (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    location_instance_id UUID        NOT NULL REFERENCES campaign_location_instances(instance_id) ON DELETE CASCADE,
    notes                TEXT        NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_camp_loc_player_notes_campaign_location UNIQUE (campaign_id, location_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_camp_loc_player_notes_campaign  ON campaign_location_player_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_loc_player_notes_location  ON campaign_location_player_notes(location_instance_id);

-- Campaign sublocation player notes
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

-- Player quicknote queue (unsorted notes awaiting routing)
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

-- Campaign player notes (shared freeform campaign-level notes)
CREATE TABLE IF NOT EXISTS campaign_player_notes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
    notes       TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_player_notes_campaign ON campaign_player_notes(campaign_id);

-- ─── Campaign Session Archived ───────────────────────────────────────────────────
-- Archived sessions with calculated in-game day ranges.
CREATE TABLE IF NOT EXISTS campaign_session_archived (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    session_number      INT          NOT NULL CHECK (session_number > 0),
    title               VARCHAR(200) NOT NULL,
    alternate_title     VARCHAR(200),
    start_time          TIMESTAMPTZ  NOT NULL,
    end_time            TIMESTAMPTZ  NOT NULL,
    in_game_days        INT[]        NOT NULL DEFAULT '{}',
    keywords            TEXT         NOT NULL DEFAULT '',
    archived_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_session_archived_campaign ON campaign_session_archived(campaign_id);

-- ─── Campaign Session Chronicles ─────────────────────────────────────────────────
-- Chronicle entries for archived sessions.
CREATE TABLE IF NOT EXISTS campaign_session_chronicles (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id         UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    archived_session_id UUID         NOT NULL REFERENCES campaign_session_archived(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    body                TEXT         NOT NULL CHECK (char_length(body) <= 50000),
    sort_order          INT          NOT NULL DEFAULT 0,
    linked_entities     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    file_path           VARCHAR(500),
    tod_slice_name      VARCHAR(100),
    is_gm_only          BOOLEAN      NOT NULL DEFAULT FALSE,
    archived_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    keywords            TEXT         NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_campaign ON campaign_session_chronicles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_archived_session ON campaign_session_chronicles(archived_session_id);

-- Create castcards_configuration table with key/value pattern
CREATE TABLE IF NOT EXISTS castcards_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL DEFAULT '',
    value JSONB,
    CONSTRAINT uq_castcards_configuration_key UNIQUE (key)
);

-- Add key column if it doesn't exist (without default to avoid duplicate keys)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'castcards_configuration' AND column_name = 'key'
    ) THEN
        ALTER TABLE castcards_configuration ADD COLUMN key TEXT;
        UPDATE castcards_configuration SET key = 'migration_' || id::text WHERE key IS NULL;
        ALTER TABLE castcards_configuration ALTER COLUMN key SET NOT NULL;
    END IF;
END $$;

-- Add value column if it doesn't exist
ALTER TABLE castcards_configuration ADD COLUMN IF NOT EXISTS value JSONB;

-- Add unique constraint if it doesn't exist (may fail if duplicates exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_castcards_configuration_key'
    ) THEN
        ALTER TABLE castcards_configuration ADD CONSTRAINT uq_castcards_configuration_key UNIQUE (key);
    END IF;
END $$;

-- Seed castcards_configuration with default stop words
INSERT INTO castcards_configuration (id, key, value)
VALUES (
    gen_random_uuid(),
    'StopWords',
    '{"words":["a","about","above","after","again","against","all","am","an","and","any","are","aren''t","as","at","be","because","been","before","being","below","between","both","but","by","can''t","cannot","could","couldn''t","did","didn''t","do","does","doesn''t","doing","don''t","down","during","each","few","for","from","further","had","hadn''t","has","hasn''t","have","haven''t","having","he","he''d","he''ll","he''s","her","here","here''s","hers","herself","him","himself","his","how","how''s","i","i''d","i''ll","i''m","i''ve","if","in","into","is","isn''t","it","it''s","its","itself","let''s","me","more","most","mustn''t","my","myself","no","nor","not","of","off","on","once","only","or","other","ought","our","ours","ourselves","out","over","own","same","shan''t","she","she''d","she''ll","she''s","should","shouldn''t","so","some","such","than","that","that''s","the","their","theirs","them","themselves","then","there","there''s","these","they","they''d","they''ll","they''re","they''ve","this","those","through","to","too","under","until","up","very","was","wasn''t","we","we''d","we''ll","we''re","we''ve","were","weren''t","what","what''s","when","when''s","where","where''s","which","while","who","who''s","whom","why","why''s","with","won''t","would","wouldn''t","you","you''d","you''ll","you''re","you''ve","your","yours","yourself","yourselves"]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ─── Trigram Indexes ─────────────────────────────────────────────────────────────
-- Trigram indexes for chronicles substring search
CREATE INDEX IF NOT EXISTS idx_campaign_session_archived_keywords_trgm
    ON campaign_session_archived USING gin (keywords gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_campaign_session_chronicles_keywords_trgm
    ON campaign_session_chronicles USING gin (keywords gin_trgm_ops);

-- ============================================================
-- Stripe Subscription Integration - Slice 1
-- ============================================================

-- Create pricing_model table
CREATE TABLE IF NOT EXISTS pricing_model (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL UNIQUE,
    price_in_cents INTEGER NOT NULL,
    stripe_price_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'FreeTrial',
    pricing_model_id UUID REFERENCES pricing_model(id),
    bypass_payment BOOLEAN NOT NULL DEFAULT false,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Seed subscription limits configuration
INSERT INTO castcards_configuration (key, value)
VALUES
    ('subscription_limits', '{
        "FreeTrial": {
            "Campaigns": 1,
            "Locations": 1,
            "Sublocations": 2,
            "Factions": 1,
            "Cast": 3
        },
        "Paid": {
            "Campaigns": -1,
            "Locations": -1,
            "Sublocations": -1,
            "Factions": -1,
            "Cast": -1
        }
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed Stripe configuration
INSERT INTO castcards_configuration (key, value)
VALUES ('stripe_configuration', '{
    "testAccount": {
	    "secretKey": "",
	    "publishableKey": "",
	    "webhookSecret": "",
        "successUrl": "https://castingcards.app/subscription-choice?checkout=success",
        "cancelUrl": "https://castingcards.app/subscription-choice",
        "returnUrl": "https://castingcards.app/dm/dashboard"
    },
    "liveAccount": {
        "secretKey": "",
        "publishableKey": "",
        "webhookSecret": "",
        "successUrl": "https://castingcards.app/subscription-choice?checkout=success",
        "cancelUrl": "https://castingcards.app/subscription-choice",
        "returnUrl": "https://castingcards.app/dm/dashboard"
    },
    "activeAccount": "test"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;