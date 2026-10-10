$app = 'c:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

$seeds = @()
$seeds += Get-ChildItem -Path (Join-Path $app 'layout\v2-campaign-shell') -Recurse -File -Filter *.ts | Select-Object -ExpandProperty FullName
$seeds += Get-ChildItem -Path (Join-Path $app 'shared\components\v2') -Recurse -File -Filter *.ts | Select-Object -ExpandProperty FullName
$seeds += Get-ChildItem -Path (Join-Path $app 'core') -File -Filter 'v2-*.ts' | Select-Object -ExpandProperty FullName

$visited = New-Object 'System.Collections.Generic.HashSet[string]'
$queue = New-Object 'System.Collections.Generic.Queue[string]'
foreach ($s in $seeds) { if ($visited.Add($s)) { $queue.Enqueue($s) } }

$rx = [regex]"(?:from|import)\s+['""]([^'""]+)['""]"

while ($queue.Count -gt 0) {
  $cur = $queue.Dequeue()
  $c = [System.IO.File]::ReadAllText($cur)
  foreach ($m in $rx.Matches($c)) {
    $spec = $m.Groups[1].Value
    if (-not $spec.StartsWith('.')) { continue }
    $dir = Split-Path $cur -Parent
    $cand = Join-Path $dir $spec
    $found = $null
    foreach ($t in @("$cand.ts", "$cand.d.ts", (Join-Path $cand 'index.ts'))) {
      if (Test-Path -LiteralPath $t) { $found = (Resolve-Path -LiteralPath $t).Path; break }
    }
    if ($found -and $visited.Add($found)) { $queue.Enqueue($found) }
  }
}

# Group closure by top-level area
$areas = @{}
foreach ($k in $visited) {
  $rel = $k.Replace($app + '\', '')
  $area = ($rel -split '\\')[0] + '/' + ($rel -split '\\')[1]
  if (-not $areas.ContainsKey($area)) { $areas[$area] = 0 }
  $areas[$area]++
}
Write-Output '=== closure by area ==='
$areas.GetEnumerator() | Sort-Object Name | ForEach-Object { '{0,5}  {1}' -f $_.Value, $_.Key }

Write-Output ''
Write-Output '=== v2-closure files OUTSIDE the v2 folders, that still have comments (block line path) ==='
$ext = @()
foreach ($k in $visited) {
  if ($k -notmatch '\\layout\\v2-campaign-shell\\' -and $k -notmatch '\\shared\\components\\v2\\') {
    $c = [System.IO.File]::ReadAllText($k)
    $mb = [regex]::Matches($c, '/\*').Count
    $ml = [regex]::Matches($c, '(?m)^\s*//').Count
    if ($mb -gt 0 -or $ml -gt 0) {
      $ext += ('{0,4} {1,4}  {2}' -f $mb, $ml, $k.Replace($app + '\', ''))
    }
  }
}
$ext | Sort-Object
Write-Output ('external-with-comments count: ' + $ext.Count)
