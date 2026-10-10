# Remove the card-factory + image-file-name handler registrations, and the now-empty Queries.Library using.
$ioc = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCLogic.cs'
$names = @('IImageFileNameQueryHandler','ICastCardFactory','ILocationCardFactory','IFactionCardFactory','ISublocationCardFactory')
$lines = [System.IO.File]::ReadAllLines($ioc)
$keep = New-Object System.Collections.Generic.List[string]
$removed = 0
foreach ($l in $lines) {
  $t = $l.Trim()
  if ($t -eq 'using CastLibrary.Logic.Queries.Library;') { $removed++; continue }
  $isReg = $false
  foreach ($n in $names) { if ($l -match ('AddScoped<\s*' + [regex]::Escape($n) + '\s*,')) { $isReg = $true; break } }
  if ($isReg) { $removed++; continue }
  $keep.Add($l)
}
if ($removed -ne 6) { throw "Expected to remove 6 lines from IOCLogic.cs, removed $removed" }
[System.IO.File]::WriteAllLines($ioc, $keep, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "IOCLogic.cs: removed $removed lines"

$dc = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\Controllers\DashboardController.cs'
$dl = [System.IO.File]::ReadAllLines($dc)
$dk = New-Object System.Collections.Generic.List[string]
$dremoved = 0
foreach ($l in $dl) { if ($l.Trim() -eq 'using CastLibrary.Logic.Queries.Library;') { $dremoved++; continue }; $dk.Add($l) }
if ($dremoved -ne 1) { throw "Expected to remove 1 using from DashboardController.cs, removed $dremoved" }
[System.IO.File]::WriteAllLines($dc, $dk, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "DashboardController.cs: removed $dremoved using"
