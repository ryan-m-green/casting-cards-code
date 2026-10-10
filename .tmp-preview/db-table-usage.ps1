# Which DB tables are no longer referenced anywhere in the solution's code (.cs)?
$root = 'C:\Repository\CastingCards\Code'

$tables = @(
 'admin_invite_codes','audit_logs','bug_reports','campaign_ambiance_items','campaign_ambiances',
 'campaign_cast_instances','campaign_cast_player_notes','campaign_cast_relationships','campaign_chronicles',
 'campaign_condition_links','campaign_encounters','campaign_faction_cast_members',
 'campaign_faction_instance_relationships','campaign_faction_instances','campaign_faction_player_notes',
 'campaign_faction_sublocations','campaign_invite_codes','campaign_keywords','campaign_location_instances',
 'campaign_location_player_notes','campaign_player_faction_relationships','campaign_player_notes',
 'campaign_players','campaign_rule_links','campaign_rules','campaign_secrets','campaign_session_archived',
 'campaign_session_chronicles','campaign_sessions','campaign_soundtracks','campaign_storyline',
 'campaign_sublocation_instances','campaign_sublocation_player_notes','campaign_sublocation_shop_items',
 'campaign_time_of_day','campaign_tod_slices','campaign_trophies','campaigns','castcards_configuration',
 'casts','conditions','currency_transactions','encounter_combatant_conditions','encounter_combatants',
 'encounter_spots','faction_participants','faction_relationships','factions','locations',
 'password_reset_tokens','player_campaign_inventory','player_card_conditions','player_card_memories',
 'player_card_secrets','player_card_traits','player_cards','player_cast_notes','player_cast_perceptions',
 'player_field_journal_entries','player_quicknote_queue','pricing_model','sublocation_shop_items',
 'sublocations','subscriptions','users'
)
Write-Host ("tables given: " + $tables.Count)

$files = Get-ChildItem -Path (Join-Path $root 'backend') -Recurse -File -Filter *.cs |
  Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
$text = @{}
foreach ($f in $files) { $text[$f.FullName] = [System.IO.File]::ReadAllText($f.FullName) }

$rows = @()
foreach ($t in $tables) {
  $rx = [regex]::new('(?<![A-Za-z0-9_])' + [regex]::Escape($t) + '(?![A-Za-z0-9_])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $hits = @($text.Keys | Where-Object { $rx.IsMatch($text[$_]) })
  $rows += [pscustomobject]@{
    Table = $t
    Refs = $hits.Count
    Files = (($hits | ForEach-Object { $_.Replace($root + '\', '') }) -join ' ; ')
  }
}

$zero = $rows | Where-Object { $_.Refs -eq 0 } | Sort-Object Table
Write-Host ("tables with ZERO references in the solution: " + $zero.Count)
$zero | Format-Table Table -AutoSize
$rows | Sort-Object Table | ForEach-Object { "$($_.Table)|refs=$($_.Refs)|$($_.Files)" } | Out-File (Join-Path $root '.tmp-preview\db-table-usage.txt') -Encoding utf8
Write-Host "written db-table-usage.txt"
