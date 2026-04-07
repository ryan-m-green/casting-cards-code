-- ─── Migrations ───────────────────────────────────────────────────────────────
-- All ALTER statements must be idempotent (IF NOT EXISTS / IF EXISTS).
-- Add new migrations at the bottom of this file.

-- [001] Add dm_notes to campaign_city_instances
ALTER TABLE campaign_city_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [002] Add dm_notes to campaign_location_instances
ALTER TABLE campaign_location_instances
    ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- [003] Add is_scratched_off to campaign_location_shop_items
ALTER TABLE campaign_location_shop_items
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
