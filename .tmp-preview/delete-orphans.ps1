$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

$folders = @(
  # ---- non-v2 shared (0 live users) ----
  'shared\components\badge',
  'shared\components\campaign-chronicle-drawer',
  'shared\components\card-flip',
  'shared\components\card-reveal-badge',
  'shared\components\casting-card-player',
  'shared\components\character-editor',
  'shared\components\character-info-editor',
  'shared\components\confirm-dialog',
  'shared\components\crb-spark-host',
  'shared\components\currency-card',
  'shared\components\detail-panel-actions',
  'shared\components\event-card',
  'shared\components\faction-symbol-picker',
  'shared\components\feather-icon',
  'shared\components\icon-picker',
  'shared\components\lock-icon',
  'shared\components\note-destination-picker',
  'shared\components\party-gold-drawer',
  'shared\components\player-event-card-item',
  'shared\components\player-secrets-drawer',
  'shared\components\quicknotes',
  'shared\components\section-label',
  'shared\components\shop-purchase-drawer',
  'shared\components\soundtrack-control-panel',
  'shared\components\soundtrack-selector',
  'shared\components\travel-anchor',
  'shared\components\void-nav-drawer',
  'shared\components\void-title-segments',
  'shared\components\whisper-card',
  # ---- orphaned root Chronicle drawer chain ----
  'shared\components\chronicles-timeline',
  'shared\components\campaign-dropdown',
  'shared\components\entity-badge',
  'shared\components\storyline-filter-bar',
  # ---- dead v2 components ----
  'shared\components\v2\Encounters\cc-encounter-note-content',
  'shared\components\v2\Shared\cc-campaign-icon',
  'shared\components\v2\Shared\cc-color-picker',
  'shared\components\v2\Shared\cc-handout-icon',
  'shared\components\v2\Shared\cc-journal-dropdown'
)

$files = @(
  # chronicle-content (lives inside the shared right-drawer folder)
  'shared\components\right-drawer\chronicle-content.component.ts',
  'shared\components\right-drawer\chronicle-content.component.html',
  'shared\components\right-drawer\chronicle-content.component.scss',
  # dead admin editor
  'features\admin\configuration-settings\doodle-art-editor.component.ts',
  'features\admin\configuration-settings\doodle-art-editor.component.html',
  'features\admin\configuration-settings\doodle-art-editor.component.scss'
)

foreach ($rel in $folders) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force; Write-Host "dir  $rel" } else { Write-Host "MISS $rel" }
}
foreach ($rel in $files) {
  $p = Join-Path $root $rel
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host "file $rel" } else { Write-Host "MISS $rel" }
}
