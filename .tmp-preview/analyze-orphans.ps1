$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# 1) selector map (all components, current tree)
$selByFile = @{}
foreach ($f in Get-ChildItem -Path $root -Recurse -File -Filter '*.component.ts') {
  $rel = $f.FullName.Replace($root + '\','')
  $m = Select-String -Path $f.FullName -Pattern "selector:\s*'([^']+)'" | Select-Object -First 1
  if ($m) { $selByFile[$rel] = $m.Matches[0].Groups[1].Value }
}

# 2) file contents
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.html','.ts' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }
$content = @{}
foreach ($f in $files) { $rel = $f.FullName.Replace($root + '\',''); $content[$rel] = Get-Content -Raw -LiteralPath $f.FullName }

function Get-OwnerComp([string]$file) { if ($file -match '\.component\.html$') { return ($file -replace '\.html$', '.ts') } return $file }
function Get-OwnFiles([string]$comp) { $l = @($comp); $h = $comp -replace '\.component\.ts$', '.component.html'; if ($content.ContainsKey($h)) { $l += $h }; return $l }

# 3) direct users per component
$direct = @{}
foreach ($comp in $selByFile.Keys) {
  $sel = $selByFile[$comp]; if (-not $sel) { continue }
  $own = Get-OwnFiles $comp
  $rx = "<" + [regex]::Escape($sel) + "(?![A-Za-z0-9-])"
  $u = @()
  foreach ($f in $content.Keys) { if ($own -contains $f) { continue }; if ($content[$f] -match $rx) { $u += (Get-OwnerComp $f) } }
  $direct[$comp] = ($u | Sort-Object -Unique)
}

# 4) fixpoint: component is DEAD if no users, or all its users are DEAD components
#    route/shell components are lazy-loaded (never referenced by selector) -> seed them as ALIVE roots
$aliveRoots = New-Object System.Collections.Generic.HashSet[string]
$aliveRoots.Add('layout\journal-shell\journal-shell.component.ts') | Out-Null
$aliveRoots.Add('layout\product-shell\product-shell.component.ts') | Out-Null
$routesText = Get-Content -Raw -LiteralPath (Join-Path $root 'app.routes.ts')
foreach ($m in [regex]::Matches($routesText, "import\('\./([^']+)'\)")) {
  $p = ($m.Groups[1].Value -replace '/', '\') + '.ts'
  [void]$aliveRoots.Add($p)
}

$dead = @{}
foreach ($comp in $selByFile.Keys) {
  if ($aliveRoots.Contains($comp)) { continue }
  if ($direct[$comp].Count -eq 0) { $dead[$comp] = $true }
}
$changed = $true
while ($changed) {
  $changed = $false
  foreach ($comp in $selByFile.Keys) {
    if ($dead.ContainsKey($comp)) { continue }
    if ($aliveRoots.Contains($comp)) { continue }
    $users = $direct[$comp]
    $aliveUser = $false
    foreach ($u in $users) {
      if ($u -eq 'app.ts') { $aliveUser = $true; break }
      if (-not $dead.ContainsKey($u)) { $aliveUser = $true; break }
    }
    if (-not $aliveUser) { $dead[$comp] = $true; $changed = $true }
  }
}

$report = New-Object System.Collections.Generic.List[string]
$report.Add("### DEAD components (no live user) : $($dead.Count)")
foreach ($c in ($dead.Keys | Sort-Object)) { $report.Add("  $c   [$($selByFile[$c])]") }
$report.Add("")
$report.Add("### code (non-v2) / v2 split of DEAD")
$nv2 = $dead.Keys | Where-Object { $_ -match '^shared\\components\\' -and $_ -notmatch 'shared\\components\\v2\\' }
$v2  = $dead.Keys | Where-Object { $_ -match 'shared\\components\\v2\\' }
$rep2 = $dead.Keys | Where-Object { $_ -notmatch '^shared\\components\\' }
$report.Add("  non-v2 shared: $($nv2.Count)")
$report.Add("  v2 components: $($v2.Count)")
$report.Add("  other (feature/layout): $($rep2.Count)")
$report.Add("")
$report.Add("### v2 DEAD components")
foreach ($c in ($v2 | Sort-Object)) { $report.Add("  $c") }
$report | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\orphans-after-testarea.txt' -Encoding utf8
Write-Host "dead total: $($dead.Count) (non-v2 $($nv2.Count), v2 $($v2.Count), other $($rep2.Count))"
