# For each table: list the file + class that reference it.
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
# longest first so longer names win the alternation
$sorted = $tables | Sort-Object { $_.Length } -Descending
$combined = '(?<![A-Za-z0-9_])(?:' + (($sorted | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')(?![A-Za-z0-9_])'
$rxTable = [regex]::new($combined, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
$rxSql   = [regex]::new('\b(FROM|JOIN|INTO|UPDATE|DELETE|INSERT|TABLE|TRUNCATE)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
$rxDecl  = [regex]::new('^\s*(?:(?:public|internal|private|protected|sealed|abstract|static|partial|readonly|ref)\s+)*(?:class|interface|struct|record|enum)\s+([A-Za-z_]\w*)')

$files = Get-ChildItem -Path (Join-Path $root 'backend') -Recurse -File -Filter *.cs |
  Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }

$map = @{}   # table -> HashSet of "file :: class :: line"
foreach ($t in $tables) { $map[$t] = New-Object 'System.Collections.Generic.HashSet[string]' }

foreach ($f in $files) {
  $lines = [System.IO.File]::ReadAllLines($f.FullName)
  $rel = $f.FullName.Replace($root + '\', '')
  # build class-start list for this file
  $decls = @()
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $m = $rxDecl.Match($lines[$i])
    if ($m.Success) { $decls += [pscustomobject]@{ Line = $i + 1; Name = $m.Groups[1].Value } }
  }
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if (-not $rxSql.IsMatch($lines[$i])) { continue }   # only SQL statements
    foreach ($tm in $rxTable.Matches($lines[$i])) {
      $tbl = $tm.Value.ToLower()
      if (-not $map.ContainsKey($tbl)) { continue }
      $cls = '(none)'
      foreach ($d in $decls) { if ($d.Line -le ($i + 1)) { $cls = $d.Name } else { break } }
      [void]$map[$tbl].Add("$rel :: $cls")
    }
  }
}

$out = New-Object System.Collections.Generic.List[string]
foreach ($t in ($tables | Sort-Object)) {
  $items = @($map[$t] | Sort-Object)
  if ($items.Count -eq 0) { $out.Add("$t : (no references)"); continue }
  $parts = @()
  foreach ($it in $items) {
    $p = $it -split ' :: '
    $f = $p[0]
    $f = $f -replace '^backend\\CastLibrary\.Repository\\Repositories\\','Repo\'
    $f = $f -replace '^backend\\CastLibrary\.Repository\\','Repo\'
    $f = $f -replace '^backend\\CastLibrary\.Logic\\','Logic\'
    $f = $f -replace '^backend\\CastLibrary\.WebHost\\','WebHost\'
    $f = $f -replace '^backend\\CastLibrary\.Shared\\','Shared\'
    $f = $f -replace '^backend\\CastLibrary\.Adapter\\','Adapter\'
    $f = $f -replace '^backend\\CastLibrary\.Initializer\\','Init\'
    $parts += "$f [$($p[1])]"
  }
  $out.Add("$t : " + ($parts -join '  |  '))
}
$out | Out-File (Join-Path $root '.tmp-preview\table-refs-compact.txt') -Encoding utf8
Write-Host ("written table-refs-compact.txt (" + $out.Count + " lines)")
