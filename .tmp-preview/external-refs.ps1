$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# Candidate v1-only feature folders to remove with the shells
$delete = @(
 'features/campaign/campaign-shell',
 'features/campaign/campaign-detail',
 'features/campaign/gm-the-party',
 'features/campaign/campaign-location-detail',
 'features/campaign/campaign-sublocation-detail',
 'features/campaign/campaign-cast-detail',
 'features/campaign/campaign-factions',
 'features/campaign/campaign-faction-detail',
 'features/campaign/gm-events',
 'features/campaign/cast-relationships-tab',
 'features/campaign/faction-web',
 'features/campaign/relationship-web-modal',
 'features/campaign/time-of-day-editor',
 'features/player/player-campaign-shell',
 'features/player/player-campaign-detail',
 'features/player/player-location-detail',
 'features/player/player-sublocation-detail',
 'features/player/player-cast-detail',
 'features/player/player-faction-detail',
 'features/player/player-the-party',
 'features/player/player-character',
 'features/player/player-card-form',
 'features/player/player-campaign-insight',
 'features/player/player-quicknote-queue',
 'features/player/player-plot',
 'features/player/player-events',
 'features/player/player-cast-notes',
 'features/player/player-faction-notes',
 'features/player/player-location-notes',
 'features/player/player-sublocation-notes',
 'features/player/player-campaign-notes',
 'features/player/player-city-detail'
)

# Build set of folder-name fragments to search for in import paths
$frags = $delete | ForEach-Object { ($_ -split '/')[ -1 ] }

$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.ts','.html' -and $_.FullName -notmatch '\\node_modules\\' }
$out = New-Object System.Collections.Generic.List[string]
foreach ($f in $files) {
  $rel = $f.FullName.Replace($root + '\','') -replace '\\','/'
  $inDelete = $false
  foreach ($d in $delete) { if ($rel.StartsWith($d + '/')) { $inDelete = $true; break } }
  if ($inDelete) { continue }
  $text = Get-Content -Raw -LiteralPath $f.FullName
  foreach ($fr in $frags) {
    if ($text -match ('/' + [regex]::Escape($fr) + '/')) {
      $out.Add("$rel  ==>  references folder '$fr'")
    }
  }
}
$out | Sort-Object -Unique | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\external-refs.txt' -Encoding utf8
Write-Host "done $($out.Count)"
