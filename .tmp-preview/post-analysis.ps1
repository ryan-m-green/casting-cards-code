$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# selector -> component file (current, post-removal)
$selByFile = @{}
foreach ($line in Get-Content 'C:\Repository\CastingCards\Code\.tmp-preview\selectors-after.txt') {
  if ($line -match '^(.+?)\|(.+)$') { $selByFile[$Matches[2]] = $Matches[1] }
}

$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.html','.ts' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }
$content = @{}
foreach ($f in $files) { $rel = $f.FullName.Replace($root + '\',''); $content[$rel] = Get-Content -Raw -LiteralPath $f.FullName }

function Get-OwnFiles([string]$comp) {
  $list = @($comp)
  $html = $comp -replace '\.component\.ts$', '.component.html'
  if ($content.ContainsKey($html)) { $list += $html }
  return $list
}

$out = New-Object System.Collections.Generic.List[string]
$orphans = New-Object System.Collections.Generic.List[string]

# Only look at non-v2 shared components
$nonV2 = $selByFile.Keys | Where-Object { $_ -match '^shared\\components\\' -and $_ -notmatch 'shared\\components\\v2\\' } | Sort-Object

foreach ($comp in $nonV2) {
  $sel = $selByFile[$comp]
  $own = Get-OwnFiles $comp
  $rx = "(?<![A-Za-z0-9-])" + [regex]::Escape($sel) + "(?![A-Za-z0-9-])"
  $users = @()
  foreach ($u in $content.Keys) {
    if ($own -contains $u) { continue }
    if ($content[$u] -match $rx) { $users += $u }
  }
  $users = $users | Sort-Object -Unique
  if ($users.Count -eq 0) {
    $orphans.Add("$sel   ($comp)")
  } else {
    $out.Add("=== $sel   ($comp)")
    foreach ($u in $users) { $out.Add("     used by: $u") }
    $out.Add("")
  }
}

$report = New-Object System.Collections.Generic.List[string]
$report.Add("##### ORPHANED non-v2 shared components (0 remaining references) #####")
$orphans | ForEach-Object { $report.Add($_) }
$report.Add("")
$report.Add("##### STILL REFERENCED non-v2 shared components #####")
$out | ForEach-Object { $report.Add($_) }

$report | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\post-analysis.txt' -Encoding utf8
Write-Host "orphans: $($orphans.Count) ; still-referenced: $($out.Count) lines"
