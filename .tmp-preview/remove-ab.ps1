$enc = New-Object System.Text.UTF8Encoding($false)

# --- IOCLogic.cs: 4 registrations + the now-empty ScheduledWorkflows using ---
$iocLogic = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCLogic.cs'
$lines = [System.IO.File]::ReadAllLines($iocLogic)
$keep = New-Object System.Collections.Generic.List[string]
$removed = 0
foreach ($l in $lines) {
  $t = $l.Trim()
  $hit = $false
  if ($t -eq 'using CastLibrary.Logic.Commands.ScheduledWorkflows;') { $hit = $true }
  elseif ($t -eq 'services.AddScoped<IGetCampaignTrophiesQueryHandler, GetCampaignTrophiesQueryHandler>();') { $hit = $true }
  elseif ($t -eq 'services.AddScoped<IProcessInactiveFreeTrialUsersCommandHandler, ProcessInactiveFreeTrialUsersCommandHandler>();') { $hit = $true }
  elseif ($t -eq 'services.AddScoped<SubscriptionEventStrategyFactory>();') { $hit = $true }
  elseif ($t -eq 'services.AddScoped<InvoiceEventStrategyFactory>();') { $hit = $true }
  if ($hit) { $removed++; continue }
  $keep.Add($l)
}
if ($removed -ne 5) { throw "IOCLogic expected 5 removals, got $removed" }
[System.IO.File]::WriteAllLines($iocLogic, $keep, $enc)
Write-Host "IOCLogic.cs: removed $removed lines"

# --- IOCWebhost.cs: 6 mapper registrations ---
$iocWeb = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\IoC\IOCWebhost.cs'
$names = @('ILocationNpcRolesMapper','ICampaignCastPlayerNotesMapper','ICampaignLocationPlayerNotesMapper','ICampaignSublocationPlayerNotesMapper','ICampaignPlayerNotesMapper','IZipArchiveMapper')
$lines2 = [System.IO.File]::ReadAllLines($iocWeb)
$keep2 = New-Object System.Collections.Generic.List[string]
$removed2 = 0
foreach ($l in $lines2) {
  $hit = $false
  foreach ($n in $names) { if ($l -match ('AddScoped<\s*' + [regex]::Escape($n) + '\s*,')) { $hit = $true; break } }
  if ($hit) { $removed2++; continue }
  $keep2.Add($l)
}
if ($removed2 -ne 6) { throw "IOCWebhost expected 6 removals, got $removed2" }
[System.IO.File]::WriteAllLines($iocWeb, $keep2, $enc)
Write-Host "IOCWebhost.cs: removed $removed2 lines"
