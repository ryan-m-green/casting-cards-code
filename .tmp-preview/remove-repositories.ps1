# Remove the 9 orphan Repository registrations from IOCRepository.cs
$p = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCRepository.cs'
$names = @(
  'ICastPlayerNotesReadRepository','ILocationPlayerNotesReadRepository','IAdminInviteCodeDeleteRepository',
  'IGoldTransactionInsertRepository','ISublocationPlayerNotesReadRepository','ICampaignPlayerNotesReadRepository',
  'ICampaignFactionInstanceEntityMapper','IPlayerCampaignInventoryEntityMapper','IAuditReadRepository'
)
$lines = [System.IO.File]::ReadAllLines($p)
$keep = New-Object System.Collections.Generic.List[string]
$removed = 0
foreach ($l in $lines) {
  $isReg = $false
  foreach ($n in $names) { if ($l -match ('AddScoped<\s*' + [regex]::Escape($n) + '\s*,')) { $isReg = $true; break } }
  if ($isReg) { $removed++; continue }
  $keep.Add($l)
}
if ($removed -ne 9) { throw "Expected to remove 9 lines from IOCRepository.cs, removed $removed" }
[System.IO.File]::WriteAllLines($p, $keep, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "IOCRepository.cs: removed $removed lines"
