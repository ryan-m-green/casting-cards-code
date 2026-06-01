-- Migration script to set scene_type based on filepath existence
-- If file_path exists and is not null, set to 'campaign-handout'
-- Otherwise, set to 'campaign-event'

UPDATE campaign_storyline
SET scene_type = CASE 
    WHEN file_path IS NOT NULL AND file_path != '' THEN 'campaign-handout'
    ELSE 'campaign-event'
END
WHERE scene_type IS NULL OR scene_type = 'campaign-event'; -- Only update if needed

-- Verify the migration
SELECT 
    scene_type,
    COUNT(*) as count,
    COUNT(CASE WHEN file_path IS NOT NULL AND file_path != '' THEN 1 END) as has_file
FROM campaign_storyline
GROUP BY scene_type;
