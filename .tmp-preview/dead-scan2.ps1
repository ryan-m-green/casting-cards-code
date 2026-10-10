# Solution-wide dead-type scan: (A) registered in IoC but unused, (B) zero references at all,
# (C) referenced only inside their own file.
$root    = 'C:\Repository\CastingCards\Code'
$backend = Join-Path $root 'backend'
$iocDir  = Join-Path $backend 'CastLibrary.WebHost\IoC'

$files = Get-ChildItem -Path $backend -Recurse -File -Filter *.cs -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
$contents = @{}; $tokens = @{}
foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  $c = [regex]::Replace($c, '/\*[\s\S]*?\*/', ' ')
  $c = [regex]::Replace($c, '//[^\r\n]*', ' ')
  $contents[$f.FullName] = $c
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($t in [regex]::Matches($c, '[A-Za-z_][A-Za-z0-9_]*')) { [void]$set.Add($t.Value) }
  $tokens[$f.FullName] = $set
}
$iocFiles = New-Object 'System.Collections.Generic.HashSet[string]'
Get-ChildItem -Path $iocDir -File -Filter *.cs | ForEach-Object { [void]$iocFiles.Add($_.FullName) }

$declRx = [regex]'(?m)^\s*(?:public|internal|private|protected)?\s*(?:sealed\s+|abstract\s+|static\s+|partial\s+|readonly\s+|ref\s+)*\b(class|interface|struct|record|enum)\s+([A-Za-z_]\w*)'
$types = @()
foreach ($f in $files) {
  foreach ($m in $declRx.Matches($contents[$f.FullName])) {
    $types += [pscustomobject]@{ Kind = $m.Groups[1].Value; Name = $m.Groups[2].Value; File = $f.FullName }
  }
}
$types = $types | Sort-Object File, Name -Unique

# name -> declared-in files, name -> files containing it
$declFiles = @{}; $containFiles = @{}
foreach ($t in $types) {
  if (-not $declFiles.ContainsKey($t.Name)) { $declFiles[$t.Name] = New-Object 'System.Collections.Generic.HashSet[string]' }
  [void]$declFiles[$t.Name].Add($t.File)
}
foreach ($t in $types) {
  if ($containFiles.ContainsKey($t.Name)) { continue }
  $hits = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($k in $files) { if ($tokens[$k.FullName].Contains($t.Name)) { [void]$hits.Add($k.FullName) } }
  $containFiles[$t.Name] = $hits
}
function Get-ExternalFiles($name) {
  if (-not $containFiles.ContainsKey($name)) { return @() }
  $d = $declFiles[$name]
  return @($containFiles[$name] | Where-Object { -not $d.Contains($_) })
}
function Get-OwnRefs($name, $file) {
  return ([regex]::Matches($contents[$file], ('(?<![A-Za-z0-9_])' + [regex]::Escape($name) + '(?![A-Za-z0-9_])'))).Count
}
function Get-Project($p) { if ($p -match '\\backend\\([^\\]+)\\') { return $Matches[1] }; return 'other' }
Write-Host ("declared types: " + $types.Count)

# --- registrations (impl, iface) across all IoC files ---
$rx = [regex]'Add(Scoped|Transient|Singleton|HostedService)\s*<\s*([A-Za-z_][A-Za-z0-9_.]*)\s*(?:,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*)?\s*>\s*\(\s*\)'
function Simplify($t) { if ($t -match '\.') { return (($t -split '\.')[-1]) } return $t }
$regImpl = @{}; $regIface = @{}
foreach ($iocf in (Get-ChildItem -Path $iocDir -File -Filter *.cs)) {
  $text = [System.IO.File]::ReadAllText($iocf.FullName)
  $text = [regex]::Replace($text, '/\*[\s\S]*?\*/', ' ')
  $text = [regex]::Replace($text, '//[^\r\n]*', ' ')
  foreach ($m in $rx.Matches($text)) {
    $a = Simplify $m.Groups[2].Value
    $b = Simplify $m.Groups[3].Value
    if ($b) {
      if (-not $regImpl.ContainsKey($b)) { $regImpl[$b] = New-Object 'System.Collections.Generic.HashSet[string]' }
      [void]$regImpl[$b].Add($a)
      if (-not $regIface.ContainsKey($a)) { $regIface[$a] = New-Object 'System.Collections.Generic.HashSet[string]' }
      [void]$regIface[$a].Add($b)
    } elseif (-not $regImpl.ContainsKey($a)) {
      $regImpl[$a] = New-Object 'System.Collections.Generic.HashSet[string]'
    }
  }
}
function NonIocCount($name) {
  return @(Get-ExternalFiles $name | Where-Object { -not $iocFiles.Contains($_) }).Count
}

# --- Bucket A: registered in IoC, but neither the impl nor its interface is referenced outside its own file + IoC ---
$bucketA = @()
foreach ($impl in $regImpl.Keys) {
  if ((NonIocCount $impl) -ne 0) { continue }
  $ifaces = @($regImpl[$impl])
  $ok = $true
  foreach ($i in $ifaces) { if ((NonIocCount $i) -ne 0) { $ok = $false; break } }
  if (-not $ok) { continue }
  $tf = $types | Where-Object { $_.Name -eq $impl } | Select-Object -First 1
  if ($tf) { $kind = $tf.Kind; $file = $tf.File } else { $kind = '?'; $file = @($declFiles[$impl])[0] }
  if (-not $file) { continue }
  $bucketA += [pscustomobject]@{ Kind = $kind; Name = $impl; Iface = ($ifaces -join ','); Project = (Get-Project $file); File = $file.Replace($root + '\', '') }
}

# --- Buckets B/C: non-IoC-registered types with no references outside their own file ---
$bucketB = @(); $bucketC = @()
foreach ($t in $types) {
  if ($regImpl.ContainsKey($t.Name)) { continue }
  if ((Get-ExternalFiles $t.Name).Count -ne 0) { continue }
  $own = Get-OwnRefs $t.Name $t.File
  $row = [pscustomobject]@{ Kind = $t.Kind; Name = $t.Name; OwnRefs = $own; Project = (Get-Project $t.File); File = $t.File.Replace($root + '\', '') }
  if ($own -le 1) { $bucketB += $row } else { $bucketC += $row }
}

Write-Host ("A) registered in IoC but unused: " + $bucketA.Count)
Write-Host ("B) zero references at all (declaration only): " + $bucketB.Count)
Write-Host ("C) referenced only inside own file: " + $bucketC.Count)
$bucketA | Sort-Object Project, File | Format-Table Kind, Name, Iface, Project -AutoSize
$bucketB | Sort-Object Project, File | Format-Table Kind, Name, Project -AutoSize
$bucketA | ForEach-Object { "A|$($_.Project)|$($_.Kind)|$($_.Name)|$($_.Iface)|$($_.File)" } | Out-File (Join-Path $root '.tmp-preview\dead-A.txt') -Encoding utf8
$bucketB | ForEach-Object { "B|$($_.Project)|$($_.Kind)|$($_.Name)|$($_.File)" } | Out-File (Join-Path $root '.tmp-preview\dead-B.txt') -Encoding utf8
$bucketC | ForEach-Object { "C|$($_.Project)|$($_.Kind)|$($_.Name)|$($_.OwnRefs)|$($_.File)" } | Out-File (Join-Path $root '.tmp-preview\dead-C.txt') -Encoding utf8
Write-Host "written dead-A/B/C.txt"

