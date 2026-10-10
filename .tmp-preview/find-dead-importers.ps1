$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# import-path fragments of things already deleted
$deleted = New-Object System.Collections.Generic.HashSet[string]
@(
 'cast-card/cast-card.component',
 'location-card/location-card.component',
 'sublocation-card/sublocation-card.component',
 'faction-card/faction-card.component',
 'time-of-day-bar/time-of-day-bar.component',
 'card-reveal-overlay/card-reveal-overlay.component',
 'portal-import-card/portal-import-card.component',
 'faction-relationships-section/faction-relationships-section.component'
) | ForEach-Object { [void]$deleted.Add($_) }

$files = Get-ChildItem -Path $root -Recurse -File -Include '*.ts' | Where-Object { $_.FullName -notmatch 'node_modules' }
$content = @{}
foreach ($f in $files) { $content[$f.FullName.Replace($root + '\','')] = Get-Content -Raw -LiteralPath $f.FullName }

$culprits = New-Object System.Collections.Generic.HashSet[string]
$changed = $true
while ($changed) {
  $changed = $false
  foreach ($rel in $content.Keys) {
    $text = $content[$rel]
    foreach ($d in $deleted) {
      if ($text -match [regex]::Escape($d)) {
        # this file imports a deleted thing
        $folder = ($rel -replace '\\[^\\]+$','')   # its folder
        $frag = ($folder -replace '.*\\','')       # last segment, e.g. card-grid-layout
        $cand = $frag + '/' + $frag + '.component'
        if (-not $deleted.Contains($cand)) { [void]$deleted.Add($cand); $culprits.Add($folder); $changed = $true }
        break
      }
    }
  }
}
$culprits | Sort-Object | ForEach-Object { $_ }
Write-Host "--- $(($culprits | Measure-Object).Count) folders to delete"
