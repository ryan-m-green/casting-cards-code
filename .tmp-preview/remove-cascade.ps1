$enc = New-Object System.Text.UTF8Encoding($false)
$ioc = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCRepository.cs'
$lines = [System.IO.File]::ReadAllLines($ioc)
$keep = New-Object System.Collections.Generic.List[string]
$removed = 0
foreach ($l in $lines) {
  $t = $l.Trim()
  if ($t -eq 'services.AddScoped<IAdminInviteCodeReadRepository, AdminInviteCodeReadRepository>();') { $removed++; continue }
  if ($t -eq 'services.AddScoped<IAdminInviteCodeUpdateRepository, AdminInviteCodeUpdateRepository>();') { $removed++; continue }
  $keep.Add($l)
}
if ($removed -ne 2) { throw "IOCRepository expected 2 removals, got $removed" }
[System.IO.File]::WriteAllLines($ioc, $keep, $enc)
Write-Host "IOCRepository.cs: removed $removed lines"
