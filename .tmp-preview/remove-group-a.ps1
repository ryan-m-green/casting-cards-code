# Remove Group A registrations + the now-empty Commands.Library namespace using.
$ioc = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCLogic.cs'
$names = @(
  'IImportLibraryCommandHandler','IExportCastLibraryQueryHandler','IExportLocationLibraryQueryHandler',
  'IExportSublocationLibraryQueryHandler','IExportFactionLibraryQueryHandler','ITemplateZipService',
  'ILibraryImageExtractionService','ILibraryBundleTemplateFactory','ITemplateReadMeFactory'
)
$lines = [System.IO.File]::ReadAllLines($ioc)
$keep = New-Object System.Collections.Generic.List[string]
$removed = 0
foreach ($l in $lines) {
  $t = $l.Trim()
  if ($t -eq 'using CastLibrary.Logic.Commands.Library;') { $removed++; continue }
  $isReg = $false
  foreach ($n in $names) { if ($l -match ('AddScoped<\s*' + [regex]::Escape($n) + '\s*,')) { $isReg = $true; break } }
  if ($isReg) { $removed++; continue }
  $keep.Add($l)
}
if ($removed -ne 10) { throw "Expected to remove 10 lines from IOCLogic.cs, removed $removed" }
[System.IO.File]::WriteAllLines($ioc, $keep, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "IOCLogic.cs: removed $removed lines"

# DashboardController also had the Commands.Library using
$dc = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\Controllers\DashboardController.cs'
$dl = [System.IO.File]::ReadAllLines($dc)
$dk = New-Object System.Collections.Generic.List[string]
$dremoved = 0
foreach ($l in $dl) { if ($l.Trim() -eq 'using CastLibrary.Logic.Commands.Library;') { $dremoved++; continue }; $dk.Add($l) }
if ($dremoved -ne 1) { throw "Expected to remove 1 using from DashboardController.cs, removed $dremoved" }
[System.IO.File]::WriteAllLines($dc, $dk, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "DashboardController.cs: removed $dremoved using"
