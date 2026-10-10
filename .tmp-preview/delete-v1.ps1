$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

$targets = @(
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

foreach ($t in $targets) {
  $full = Join-Path $root ($t -replace '/', '\')
  if (Test-Path -LiteralPath $full) {
    Remove-Item -LiteralPath $full -Recurse -Force
    Write-Host "removed  $t"
  } else {
    Write-Host "MISSING  $t"
  }
}
