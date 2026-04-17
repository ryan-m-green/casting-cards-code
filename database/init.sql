-- Cast Library Database Schema
-- Fresh install — drop all tables externally before running, or run against a blank database.
-- Run: psql -U postgres -d cast_library -f init.sql

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- ─── Campaign Notes ───────────────────────────────────────────────────────────
-- Replaces the former polymorphic design (entity_type + instance_id) with typed FK columns.
-- Exactly one FK column must be non-null — enforced by chk_notes_exactly_one_entity.
-- ON DELETE CASCADE on each FK: deleting any instance type automatically removes its notes.
CREATE TABLE IF NOT EXISTS campaign_notes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id             UUID         NOT NULL REFERENCES campaigns(id)                              ON DELETE CASCADE,
    cast_instance_id        UUID         REFERENCES campaign_cast_instances(instance_id)               ON DELETE CASCADE,
    location_instance_id    UUID         REFERENCES campaign_location_instances(instance_id)           ON DELETE CASCADE,
    sublocation_instance_id UUID         REFERENCES campaign_sublocation_instances(instance_id)        ON DELETE CASCADE,
    content                 TEXT         NOT NULL,
    created_by_user_id      UUID         NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notes_exactly_one_entity CHECK (
        (cast_instance_id        IS NOT NULL)::int +
        (location_instance_id    IS NOT NULL)::int +
        (sublocation_instance_id IS NOT NULL)::int = 1
    )
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

-- Campaign notes (typed FKs replace former instance_id index)
CREATE INDEX IF NOT EXISTS idx_camp_notes_campaign        ON campaign_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_notes_cast            ON campaign_notes(cast_instance_id);
CREATE INDEX IF NOT EXISTS idx_camp_notes_location        ON campaign_notes(location_instance_id);
CREATE INDEX IF NOT EXISTS idx_camp_notes_sublocation     ON campaign_notes(sublocation_instance_id);

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
-- Stores structured player observations: want, connections, alignment, perception.
-- connections: text[] of cast instance UUID strings the player links to this cast.
-- perception: -5 (hateful) .. +5 (devoted). 0 = indifferent baseline.
CREATE TABLE IF NOT EXISTS campaign_cast_player_notes (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID         NOT NULL REFERENCES campaigns(id)                        ON DELETE CASCADE,
    cast_instance_id UUID         NOT NULL REFERENCES campaign_cast_instances(instance_id) ON DELETE CASCADE,
    want             TEXT         NOT NULL DEFAULT '',
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

-- ─── Location Political Notes ─────────────────────────────────────────────────────
-- One shared record per location instance per campaign, writable by any campaign player.
-- Stores structured political observations as JSON text:
--   factions      — player-observed factions (name, type, influence, isHidden)
--   relationships — faction-to-faction edges (type, strength, notes)
--   npc_roles     — cast instances linked to factions (role, motivation)
CREATE TABLE IF NOT EXISTS location_political_notes (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id          UUID         NOT NULL REFERENCES campaigns(id)                              ON DELETE CASCADE,
    location_instance_id UUID         NOT NULL REFERENCES campaign_location_instances(instance_id)   ON DELETE CASCADE,
    general_notes        TEXT         NOT NULL DEFAULT '',
    factions             TEXT         NOT NULL DEFAULT '[]',
    relationships        TEXT         NOT NULL DEFAULT '[]',
    npc_roles            TEXT         NOT NULL DEFAULT '[]',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_location_political_notes UNIQUE (campaign_id, location_instance_id)
);

CREATE INDEX IF NOT EXISTS idx_location_pol_notes_campaign ON location_political_notes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_location_pol_notes_location ON location_political_notes(location_instance_id);
