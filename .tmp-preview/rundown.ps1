$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# selector map (all components)
$selByFile = @{}
foreach ($f in Get-ChildItem -Path $root -Recurse -File -Filter '*.component.ts') {
  $rel = $f.FullName.Replace($root + '\','')
  $m = Select-String -Path $f.FullName -Pattern "selector:\s*'([^']+)'" | Select-Object -First 1
  if ($m) { $selByFile[$rel] = $m.Matches[0].Groups[1].Value }
}

$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.html','.ts' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }
$content = @{}
foreach ($f in $files) { $rel = $f.FullName.Replace($root + '\',''); $content[$rel] = Get-Content -Raw -LiteralPath $f.FullName }
function Get-OwnerComp([string]$file) { if ($file -match '\.component\.html$') { return ($file -replace '\.html$', '.ts') } return $file }
function Get-OwnFiles([string]$comp) { $l = @($comp); $h = $comp -replace '\.component\.ts$', '.component.html'; if ($content.ContainsKey($h)) { $l += $h }; return $l }

# tag-based direct users
$direct = @{}
foreach ($comp in $selByFile.Keys) {
  $sel = $selByFile[$comp]; if (-not $sel) { continue }
  $own = Get-OwnFiles $comp
  $rx = "<" + [regex]::Escape($sel) + "(?![A-Za-z0-9-])"
  $u = @()
  foreach ($f in $content.Keys) { if ($own -contains $f) { continue }; if ($content[$f] -match $rx) { $u += (Get-OwnerComp $f) } }
  $direct[$comp] = ($u | Sort-Object -Unique)
}

# alive roots = route components + shells + app.ts, with page/shell labels
$rootMap = @{}
$rootMap['app.ts'] = 'GLOBAL app-root drawer'
$rootMap['layout\journal-shell\journal-shell.component.ts'] = 'Journal shell (chrome)'
$rootMap['layout\product-shell\product-shell.component.ts'] = 'Product shell (/about)'
$rootMap['layout\v2-campaign-shell\v2-campaign-shell.component.ts'] = 'V2 campaign shell'
$routesText = Get-Content -Raw -LiteralPath (Join-Path $root 'app.routes.ts')
foreach ($m in [regex]::Matches($routesText, "import\('\./([^']+)'\)")) {
  $p = ($m.Groups[1].Value -replace '/', '\') + '.ts'
  if (-not $rootMap.ContainsKey($p)) { $rootMap[$p] = "ROUTE " + ($p -replace '\\','/') }
}

# dead fixpoint
$alive = New-Object System.Collections.Generic.HashSet[string]
$dead = @{}
foreach ($comp in $selByFile.Keys) {
  if ($rootMap.ContainsKey($comp)) { continue }
  if ($direct[$comp].Count -eq 0) { $dead[$comp] = $true }
}
$changed = $true
while ($changed) {
  $changed = $false
  foreach ($comp in $selByFile.Keys) {
    if ($dead.ContainsKey($comp) -or $rootMap.ContainsKey($comp)) { continue }
    $aliveUser = $false
    foreach ($u in $direct[$comp]) { if (-not $dead.ContainsKey($u)) { $aliveUser = $true; break } }
    if (-not $aliveUser) { $dead[$comp] = $true; $changed = $true }
  }
}

# transitive root reach for alive non-v2 shared components
$nonV2 = $selByFile.Keys | Where-Object { $_ -match '^shared\\components\\' -and $_ -notmatch 'shared\\components\\v2\\' } | Sort-Object
$out = New-Object System.Collections.Generic.List[string]
foreach ($comp in $nonV2) {
  if ($dead.ContainsKey($comp)) { continue }
  $seen = New-Object System.Collections.Generic.HashSet[string]
  $q = New-Object System.Collections.Generic.Queue[string]
  $q.Enqueue($comp)
  $roots = New-Object System.Collections.Generic.List[string]
  while ($q.Count -gt 0) {
    $c = $q.Dequeue()
    if (-not $direct.ContainsKey($c)) { continue }
    foreach ($u in $direct[$c]) {
      if ($seen.Contains($u)) { continue }
      [void]$seen.Add($u)
      if ($rootMap.ContainsKey($u)) { $roots.Add($rootMap[$u]) }
      elseif ($selByFile.ContainsKey($u)) { $q.Enqueue($u) }
    }
  }
  $out.Add("$($selByFile[$comp])   ($comp)")
  foreach ($r in ($roots | Sort-Object -Unique)) { $out.Add("      -> $r") }
  $out.Add("")
}
$out | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\rundown.txt' -Encoding utf8
Write-Host "alive non-v2 shared components: $((($out | Where-Object { $_ -match '^app-' }).Count))"
