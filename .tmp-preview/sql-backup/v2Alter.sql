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
    day_number      INT          NOT NULL DEFAULT 0,
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

-- Existing installs predate day_number, and the CREATE TABLE IF NOT EXISTS above is skipped for them,
-- so the column has to be added before the comments below (which require it to exist).
ALTER TABLE campaign_chronicles ADD COLUMN IF NOT EXISTS day_number INT NOT NULL DEFAULT 0;

COMMENT ON TABLE campaign_chronicles IS 'V2 - standalone chronicle feed entries (no session grouping)';
COMMENT ON COLUMN campaign_chronicles.content_type IS 'V2 - scene | handout | player-note | secret | coin-reward | shop-purchase';
COMMENT ON COLUMN campaign_chronicles.source_id IS 'V2 - optional id of the originating content (e.g. storyline item)';
COMMENT ON COLUMN campaign_chronicles.played_on IS 'V2 - date the content belongs to (primary sort key)';
COMMENT ON COLUMN campaign_chronicles.session_number IS 'V2 - optional display label only, never a grouping key';
COMMENT ON COLUMN campaign_chronicles.is_gm_only IS 'V2 - true hides the entry from non-GM players';
COMMENT ON COLUMN campaign_chronicles.tod_slice_name IS 'V2 - time-of-day slice captured from the campaign clock when the entry was recorded';
COMMENT ON COLUMN campaign_chronicles.day_number IS 'V2 - in-game day captured from the campaign clock (campaign_time_of_day.days_passed) when the entry was recorded';

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

ALTER TABLE encounter_combatants ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

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

-- ============================================================
-- V2 Quicknotes (queued notes on their way to the campaign chronicle)
-- ============================================================
-- A quicknote is written before anything is known about where it belongs: it lands in the player's
-- own queue, and from the quicknotes area it is linked to campaign cards and then sent on to the
-- campaign chronicle (see AddChronicleCommand, content type player-note). These two columns are
-- what the note carries while it waits: the cards it is linked to, worn as hashtags in the area and
-- carried to the chronicle as its participants, and whether the note is to arrive as a GM-only
-- entry (false) or in the open (true). Both have to be stored, not merely worked out on the way in,
-- or a queue line would lose them the moment its screen was reloaded.
ALTER TABLE player_quicknote_queue ADD COLUMN IF NOT EXISTS linked_entities JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE player_quicknote_queue ADD COLUMN IF NOT EXISTS visible_to_players BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN player_quicknote_queue.linked_entities IS 'V2 - the campaign cards this queued note is linked to, as LinkedEntityTrigger json';
COMMENT ON COLUMN player_quicknote_queue.visible_to_players IS 'V2 - false sends the note to the chronicle as a GM-only entry';

-- ============================================================
-- V2 Player card trait sharing
-- ============================================================
-- A trait (goal, fear, flaw) is the player's own, shown on their card to themselves and the GM.
-- The player may choose to share one with the rest of the party, which is what this flag carries;
-- when set, other players see the trait on this player's card in the details drawer.
ALTER TABLE player_card_traits ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN player_card_traits.is_shared IS 'V2 - true lets other players see this trait on the owner''s card';

-- ============================================================
-- V2 Player-private notes on the cards a party has fought
-- ============================================================
-- A player's own words about a cast card they have met in a finished encounter. The note is the
-- player's alone: it is keyed by the card rather than by the fight, so it follows that card
-- through every later encounter, and it is read and written only for the player who made it
-- (nothing in the campaign room is told about it — see PlayerCastNotesController).
--
-- card_key is the card's identity as the encounter builder already names it: 'instance:<campaign
-- cast instance id>' for a card taken from the campaign's own cast, and 'cast:<library cast id>'
-- for one picked straight from the library. It is what the uniqueness of a player's note hangs
-- off, so the two nullable id columns beside it are for the caller's own mapping, not for it.
CREATE TABLE IF NOT EXISTS player_cast_notes (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    player_user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_key         TEXT        NOT NULL,
    cast_instance_id UUID,
    source_cast_id   UUID,
    notes            TEXT        NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_cast_notes_campaign_player_card UNIQUE (campaign_id, player_user_id, card_key)
);

CREATE INDEX IF NOT EXISTS idx_player_cast_notes_campaign_player
    ON player_cast_notes(campaign_id, player_user_id);

COMMENT ON TABLE player_cast_notes IS 'V2 - one player''s private note on one cast card; never read for anyone else';
COMMENT ON COLUMN player_cast_notes.card_key IS 'V2 - the card''s identity: instance:<campaign cast instance id> or cast:<library cast id>';

ALTER TABLE campaign_encounters ADD COLUMN IF NOT EXISTS round_number INT NOT NULL DEFAULT 0;

ALTER TABLE encounter_spots ADD COLUMN IF NOT EXISTS turns_taken INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS player_field_journal_entries (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    encounter_id     UUID        NOT NULL REFERENCES campaign_encounters(id) ON DELETE CASCADE,
    card_key         TEXT        NOT NULL,
    cast_instance_id UUID,
    source_cast_id   UUID,
    notes            TEXT        NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_player_field_journal_entries UNIQUE (campaign_id, encounter_id, card_key)
);

DELETE FROM player_field_journal_entries a
USING player_field_journal_entries b
WHERE a.id <> b.id
  AND a.campaign_id = b.campaign_id
  AND a.encounter_id = b.encounter_id
  AND a.card_key = b.card_key
  AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));

ALTER TABLE player_field_journal_entries DROP COLUMN IF EXISTS player_user_id;
ALTER TABLE player_field_journal_entries DROP CONSTRAINT IF EXISTS uq_player_field_journal_entries;
ALTER TABLE player_field_journal_entries ADD CONSTRAINT uq_player_field_journal_entries UNIQUE (campaign_id, encounter_id, card_key);

CREATE INDEX IF NOT EXISTS idx_player_field_journal_encounter
    ON player_field_journal_entries(encounter_id);

ALTER TABLE encounter_combatants ADD COLUMN IF NOT EXISTS is_captured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE encounter_combatants ADD COLUMN IF NOT EXISTS is_escaped BOOLEAN NOT NULL DEFAULT FALSE;

-- V2 rules: a rule is a name and a definition; a rule group carries the rules it holds in
-- `children` (jsonb, one level deep by design, so a rule inside a group cannot hold rules of
-- its own). Keywords tag the rule types, which is the organising key.
--
-- A rule belongs to its DM, not to one campaign: the same rule is worn by any number of
-- campaigns through campaign_rule_links, so the order a rule sits in is the link's business.
CREATE TABLE IF NOT EXISTS campaign_rules (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    dm_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    definition  TEXT         NOT NULL DEFAULT '',
    children    JSONB        NOT NULL DEFAULT '[]'::jsonb,
    keywords    TEXT[]       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Installs that predate the library shape keep their rules: the owner is taken from the
-- campaign the rule was written in, the campaign becomes a link, and only then are the
-- campaign columns dropped.
ALTER TABLE campaign_rules ADD COLUMN IF NOT EXISTS dm_user_id UUID;

CREATE TABLE IF NOT EXISTS campaign_rule_links (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID        NOT NULL REFERENCES campaigns(id)     ON DELETE CASCADE,
    rule_id     UUID        NOT NULL REFERENCES campaign_rules(id) ON DELETE CASCADE,
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_rule_links UNIQUE (campaign_id, rule_id)
);

DO $$
BEGIN
    IF EXISTS (SELECT 1
               FROM information_schema.columns
               WHERE table_name = 'campaign_rules' AND column_name = 'campaign_id') THEN
        UPDATE campaign_rules r
        SET    dm_user_id = c.dm_user_id
        FROM   campaigns c
        WHERE  c.id = r.campaign_id
          AND  r.dm_user_id IS NULL;

        DELETE FROM campaign_rules WHERE dm_user_id IS NULL;

        INSERT INTO campaign_rule_links (campaign_id, rule_id, sort_order, created_at)
        SELECT r.campaign_id, r.id, r.sort_order, r.created_at
        FROM   campaign_rules r
        WHERE  r.campaign_id IS NOT NULL
        ON CONFLICT (campaign_id, rule_id) DO NOTHING;

        ALTER TABLE campaign_rules DROP COLUMN campaign_id;
        ALTER TABLE campaign_rules DROP COLUMN sort_order;
    END IF;
END $$;

ALTER TABLE campaign_rules ALTER COLUMN dm_user_id SET NOT NULL;

ALTER TABLE campaign_rules DROP CONSTRAINT IF EXISTS campaign_rules_dm_user_id_fkey;
ALTER TABLE campaign_rules ADD  CONSTRAINT campaign_rules_dm_user_id_fkey
    FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campaign_rules_dm_user
    ON campaign_rules(dm_user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_rules_keywords
    ON campaign_rules USING gin (keywords);

CREATE INDEX IF NOT EXISTS idx_campaign_rule_links_campaign
    ON campaign_rule_links(campaign_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_campaign_rule_links_rule
    ON campaign_rule_links(rule_id);

COMMENT ON TABLE campaign_rules IS 'V2 - a rule or a rule group, owned by the DM who wrote it';
COMMENT ON COLUMN campaign_rules.children IS 'V2 - the rules nested under a rule group (one level deep)';
COMMENT ON COLUMN campaign_rules.keywords IS 'V2 - rule type tags, the organising key of the rules library';
COMMENT ON TABLE campaign_rule_links IS 'V2 - the campaigns a rule is worn by, and the order it sits in';

CREATE TABLE IF NOT EXISTS conditions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    gm_user_id  UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    consequence TEXT         NOT NULL DEFAULT '',
    keywords    TEXT[]       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditions_gm_user
    ON conditions(gm_user_id);

CREATE INDEX IF NOT EXISTS idx_conditions_keywords
    ON conditions USING gin (keywords);

CREATE TABLE IF NOT EXISTS campaign_condition_links (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID        NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
    condition_id UUID        NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
    sort_order   INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_condition_links UNIQUE (campaign_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_condition_links_campaign
    ON campaign_condition_links(campaign_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_campaign_condition_links_condition
    ON campaign_condition_links(condition_id);


