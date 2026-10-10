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

-- ============================================================
-- V2 Encounters (Initiative Tracker)
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_encounters (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID         NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    sequence_number INT          NOT NULL DEFAULT 1,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'planned',
    current_spot_id UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaign_encounters_campaign
    ON campaign_encounters(campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS encounter_spots (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id     UUID        NOT NULL REFERENCES campaign_encounters(id) ON DELETE CASCADE,
    initiative_order INT         NOT NULL DEFAULT 0,
    group_name       VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_spots_encounter
    ON encounter_spots(encounter_id, initiative_order);

CREATE TABLE IF NOT EXISTS encounter_combatants (
    id                               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id                          UUID         NOT NULL REFERENCES encounter_spots(id) ON DELETE CASCADE,
    encounter_id                     UUID         NOT NULL REFERENCES campaign_encounters(id) ON DELETE CASCADE,
    combatant_type                   VARCHAR(10)  NOT NULL,
    source_cast_id                   UUID         REFERENCES casts(id) ON DELETE RESTRICT,
    player_card_id                   UUID         REFERENCES player_cards(id) ON DELETE CASCADE,
    origin_campaign_cast_instance_id UUID,
    display_name                     VARCHAR(255) NOT NULL DEFAULT '',
    image_url                        VARCHAR(500) NOT NULL DEFAULT '',
    max_hit_points                   INT          NOT NULL DEFAULT 0,
    lost_hit_points                  INT          NOT NULL DEFAULT 0,
    temp_hit_points                  INT          NOT NULL DEFAULT 0,
    is_defeated                      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at                       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_combatants_spot
    ON encounter_combatants(spot_id);
CREATE INDEX IF NOT EXISTS idx_encounter_combatants_encounter
    ON encounter_combatants(encounter_id);

-- Per-spot initiative: the rolled number is duplicated onto every combatant row
-- of a spot, so any row of the group carries the same value. Null = not rolled yet.
ALTER TABLE encounter_combatants ADD COLUMN IF NOT EXISTS initiative_number INT;

-- Conditions the DM has given to an encounter's card. A cast card is the encounter's
-- own row rather than a player card, so its conditions hang off that row the way a
-- party member's hang off their player card — the same shape as
-- player_card_conditions, naming the row it points at instead. The rows go with the
-- card: removing the combatant (or the encounter) takes its conditions with it.
CREATE TABLE IF NOT EXISTS encounter_combatant_conditions (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_combatant_id UUID        NOT NULL REFERENCES encounter_combatants(id) ON DELETE CASCADE,
    condition_name        VARCHAR(100) NOT NULL,
    assigned_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_combatant_conditions_combatant
    ON encounter_combatant_conditions(encounter_combatant_id);

CREATE TABLE IF NOT EXISTS campaign_trophies (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id       UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_cast_id    UUID        NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
    defeated_count    INT         NOT NULL DEFAULT 1,
    first_defeated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, source_cast_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_trophies_campaign
    ON campaign_trophies(campaign_id);

COMMENT ON TABLE campaign_encounters IS 'V2 - named initiative encounters; status runs planned -> ordering -> active -> ended';
COMMENT ON COLUMN campaign_encounters.status IS 'V2 - planned before Start, ordering while the rolled numbers are being turned in, active while it is the campaign''s running encounter, then ended';

-- Existing databases: an encounter is never born active now that Start opens the ordering step.
ALTER TABLE campaign_encounters ALTER COLUMN status SET DEFAULT 'planned';
COMMENT ON TABLE encounter_spots IS 'V2 - a ring position; one combatant or a persisted group';
COMMENT ON TABLE encounter_combatants IS 'V2 - encounter-scoped cast/player instances (independent of campaign_cast_instances)';
COMMENT ON TABLE encounter_combatant_conditions IS 'V2 - conditions the DM has given to an encounter''s card; they cascade with the combatant row';
COMMENT ON TABLE campaign_trophies IS 'V2 - party trophy collection of distinct defeated casts per campaign';

-- The DM's own words on a trophy. The feature that writes them does not exist yet, so the column is
-- left exactly as the database's own NULL.
ALTER TABLE campaign_trophies ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN campaign_trophies.notes IS 'V2 - the DM''s note on this trophy; nothing writes it yet';

-- A cast card's fall is counted into the campaign's trophies once, and this is the stamp that says it
-- has been: the tally is written as a fight runs and swept up when the fight ends (see
-- IEncounterInsertRepository.CaptureEncounterTrophiesAsync), and neither of those may count the same
-- fall twice. It comes off again when a card is put back on its feet, so a later fall is a new defeat.
ALTER TABLE encounter_combatants ADD COLUMN IF NOT EXISTS trophy_captured_at TIMESTAMPTZ;

COMMENT ON COLUMN encounter_combatants.trophy_captured_at IS 'V2 - when this row''s fall was counted into campaign_trophies; NULL while it has not been';

-- ============================================================
-- Campaign cast instance keywords
-- ============================================================
-- A cast card taken into a campaign is meant to start with the library cast's own hashtags (see
-- CastInstanceFactory), which the DM may then change per instance. The insert did not carry the
-- column, so every instance added before this fix — and every one the campaign creator wrote —
-- was left with the column's empty default, and the campaign's own cast keyword filters had
-- nothing to offer. Instances still empty are filled from the cast they were made from; a card
-- whose keywords the DM has since set is left as it is.
ALTER TABLE campaign_cast_instances ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';

UPDATE campaign_cast_instances ci
SET keywords = c.keywords
FROM casts c
WHERE c.id = ci.source_cast_id
  AND (ci.keywords IS NULL OR ci.keywords = '{}')
  AND c.keywords IS NOT NULL
  AND c.keywords <> '{}';

COMMENT ON COLUMN campaign_cast_instances.keywords IS 'V2 - the card''s hashtags: the library cast''s on the way in, then the DM''s own per instance';

