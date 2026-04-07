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
