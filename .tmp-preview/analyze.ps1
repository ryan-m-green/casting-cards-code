$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# --- selectors: componentRel -> selector ---
$selByFile = @{}
foreach ($line in Get-Content 'C:\Repository\CastingCards\Code\.tmp-preview\selectors.txt') {
  if ($line -match '^(.+?)\|(.+)$') {
    $selByFile[$Matches[2]] = $Matches[1]
  }
}

# --- read all files ---
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.html','.ts' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }
$content = @{}
foreach ($f in $files) {
  $rel = $f.FullName.Replace($root + '\','')
  $content[$rel] = Get-Content -Raw -LiteralPath $f.FullName
}

function Get-OwnerComp([string]$file) {
  if ($file -match '\.component\.html$') { return ($file -replace '\.html$', '.ts') }
  return $file
}
function Get-OwnFiles([string]$comp) {
  $list = @($comp)
  $html = $comp -replace '\.component\.ts$', '.component.html'
  if ($content.ContainsKey($html)) { $list += $html }
  return $list
}

# --- build usedBy graph: childComp -> set of parent comps ---
$usedBy = @{}
foreach ($comp in $selByFile.Keys) {
  $sel = $selByFile[$comp]
  if (-not $sel) { continue }
  $own = Get-OwnFiles $comp
  $rx = "(?<![A-Za-z0-9-])" + [regex]::Escape($sel) + "(?![A-Za-z0-9-])"
  foreach ($u in $content.Keys) {
    if ($own -contains $u) { continue }
    if ($content[$u] -match $rx) {
      $parent = Get-OwnerComp $u
      if ($parent -ne $comp) {
        if (-not $usedBy.ContainsKey($comp)) { $usedBy[$comp] = New-Object System.Collections.Generic.HashSet[string] }
        [void]$usedBy[$comp].Add($parent)
      }
    }
  }
}

# --- route / shell classification ---
$pageMap = @{}
$v1dm = @(
 'features/campaign/campaign-shell/campaign-shell.component.ts',
 'features/campaign/campaign-detail/campaign-detail.component.ts',
 'features/campaign/gm-the-party/gm-the-party.component.ts',
 'features/campaign/campaign-location-detail/campaign-location-detail.component.ts',
 'features/campaign/campaign-sublocation-detail/campaign-sublocation-detail.component.ts',
 'features/campaign/campaign-cast-detail/campaign-cast-detail.component.ts',
 'features/campaign/campaign-factions/campaign-factions.component.ts',
 'features/campaign/campaign-faction-detail/campaign-faction-detail.component.ts',
 'features/campaign/gm-events/gm-events.component.ts',
 'features/campaign/cast-relationships-tab/cast-relationships-tab.component.ts',
 'features/campaign/faction-web/faction-web.component.ts',
 'features/campaign/relationship-web-modal/relationship-web-modal.component.ts',
 'features/campaign/time-of-day-editor/time-of-day-editor.component.ts',
 'features/campaign/campaign-faction-detail/faction-detail-panel/faction-detail-panel.component.ts',
 'features/campaign/campaign-location-detail/location-detail-panel/location-detail-panel.component.ts',
 'features/campaign/campaign-location-detail/location-player-card/location-player-card.component.ts'
)
foreach ($p in $v1dm) { $pageMap[$p] = 'V1-DM-CampaignShell' }

$v1player = @(
 'features/player/player-campaign-shell/player-campaign-shell.component.ts',
 'features/player/player-campaign-detail/player-campaign-detail.component.ts',
 'features/player/player-location-detail/player-location-detail.component.ts',
 'features/player/player-sublocation-detail/player-sublocation-detail.component.ts',
 'features/player/player-cast-detail/player-cast-detail.component.ts',
 'features/player/player-faction-detail/player-faction-detail.component.ts',
 'features/player/player-the-party/player-the-party.component.ts',
 'features/player/player-character/player-character.component.ts',
 'features/player/player-card-form/player-card-form.component.ts',
 'features/player/player-campaign-insight/player-campaign-insight.component.ts',
 'features/player/player-quicknote-queue/player-quicknote-queue.component.ts',
 'features/player/player-plot/player-plot.component.ts',
 'features/player/player-cast-notes/player-cast-notes.component.ts',
 'features/player/player-faction-notes/player-faction-notes.component.ts',
 'features/player/player-location-notes/player-location-notes.component.ts',
 'features/player/player-sublocation-notes/player-sublocation-notes.component.ts',
 'features/player/player-campaign-notes/player-campaign-notes.component.ts',
 'features/player/player-city-detail/player-city-detail.component.ts',
 'features/player/player-events/player-events.component.ts'
)
foreach ($p in $v1player) { $pageMap[$p] = 'V1-Player-CampaignShell' }
Get-ChildItem -Path "$root\features\player\player-character" -Recurse -File -Filter '*.component.ts' | ForEach-Object { $rel = ($_.FullName.Replace($root + '\','')) -replace '\\','/'; if ($rel -ne 'features/player/player-character/player-character.component.ts') { $pageMap[$rel] = 'V1-Player-CampaignShell' } }

$journal = @(
 'layout/journal-shell/journal-shell.component.ts',
 'features/cover/cover.component.ts',
 'features/role-selection/role-selection.component.ts',
 'features/legal/legal.component.ts',
 'features/forgot-password/forgot-password.component.ts',
 'features/reset-password/reset-password.component.ts',
 'features/verify-email/verify-email.component.ts',
 'features/subscription-choice/subscription-choice.component.ts',
 'features/player/player-campaigns/player-campaigns.component.ts',
 'features/change-password/change-password.component.ts',
 'features/bug-report/bug-report.component.ts',
 'features/dashboard/dashboard.component.ts',
 'features/cast/cast-library/cast-library.component.ts',
 'features/cast/cast-form/cast-form.component.ts',
 'features/location/location-library/location-library.component.ts',
 'features/location/location-form/location-form.component.ts',
 'features/campaign/campaign-library/campaign-library.component.ts',
 'features/campaign/campaign-creator/campaign-creator.component.ts',
 'features/sublocations/sublocation-library/sublocation-library.component.ts',
 'features/sublocations/sublocation-form/sublocation-form.component.ts',
 'features/faction/faction-library/faction-library.component.ts',
 'features/faction/faction-form/faction-form.component.ts'
)
foreach ($p in $journal) { $pageMap[$p] = 'Journal-Shell' }
Get-ChildItem -Path "$root\features\admin" -Recurse -File -Filter '*.component.ts' | ForEach-Object { $rel = ($_.FullName.Replace($root + '\','')) -replace '\\','/'; if (-not $pageMap.ContainsKey($rel)) { $pageMap[$rel] = 'Journal-Shell' } }

$pageMap['features/about/about.component.ts'] = 'Product-Shell'
$pageMap['layout/product-shell/product-shell.component.ts'] = 'Product-Shell'
$pageMap['layout/v2-campaign-shell/v2-campaign-shell.component.ts'] = 'V2-CampaignShell'
$pageMap['features/gm-testarea/gm-testarea.component.ts'] = 'Testarea-Page'
$pageMap['app.ts'] = 'GLOBAL-app-root'

# --- BFS upward from each non-v2 shared component ---
$nonV2 = $selByFile.Keys | Where-Object { $_ -match '^shared\\components\\' -and $_ -notmatch 'shared\\components\\v2\\' }

$out = New-Object System.Collections.Generic.List[string]
foreach ($comp in ($nonV2 | Sort-Object)) {
  $sel = $selByFile[$comp]
  $visited = New-Object System.Collections.Generic.HashSet[string]
  $queue = New-Object System.Collections.Generic.Queue[string]
  $queue.Enqueue($comp)
  $pages = New-Object System.Collections.Generic.HashSet[string]
  $direct = New-Object System.Collections.Generic.List[string]
  $allParents = New-Object System.Collections.Generic.List[string]
  while ($queue.Count -gt 0) {
    $cur = $queue.Dequeue()
    if (-not $usedBy.ContainsKey($cur)) { continue }
    foreach ($par in $usedBy[$cur]) {
      if ($cur -eq $comp) { $direct.Add($par) }
      $allParents.Add($par)
      if ($visited.Contains($par)) { continue }
      [void]$visited.Add($par)
      $parKey = $par -replace '\\','/'
      if ($pageMap.ContainsKey($parKey)) {
        [void]$pages.Add($pageMap[$parKey])
      } else {
        $queue.Enqueue($par)
      }
    }
  }
  $out.Add("=== $comp")
  $out.Add("SELECTOR: $sel")
  $out.Add("DIRECT_USERS: " + (($direct | Sort-Object -Unique) -join '; '))
  if ($pages.Count -gt 0) { $out.Add("PAGES: " + (($pages | Sort-Object) -join '; ')) } else { $out.Add("PAGES: (none resolved)") }
  $out.Add("PARENTS(all levels): " + (($allParents | Sort-Object -Unique) -join '; '))
  $out.Add("")
}
$out | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\component-analysis.txt' -Encoding utf8
Write-Host "done $($out.Count)"
