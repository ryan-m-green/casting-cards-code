# Find Logic-layer classes registered in IoC that are not referenced anywhere else.
$root = 'C:\Repository\CastingCards\Code'
$iocDir = Join-Path $root 'backend\CastLibrary.WebHost\IoC'
$logicDir = Join-Path $root 'backend\CastLibrary.Logic'

# 1. registrations from every file in the IoC folder
$rx = [regex]'Add(Scoped|Transient|Singleton|HostedService)\s*<\s*([A-Za-z_][A-Za-z0-9_.]*)\s*(?:,\s*([A-Za-z_][A-Za-z0-9_.]*)\s*)?\s*>\s*\(\s*\)'
function Simplify($t) { if ($t -match '\.') { return (($t -split '\.')[-1]) } return $t }
$regs = @()
foreach ($iocf in (Get-ChildItem -Path $iocDir -File -Filter *.cs)) {
  $text = [System.IO.File]::ReadAllText($iocf.FullName)
  $text = [regex]::Replace($text, '/\*[\s\S]*?\*/', ' ')
  $text = [regex]::Replace($text, '//[^\r\n]*', ' ')
  foreach ($m in $rx.Matches($text)) {
    $kind = $m.Groups[1].Value
    $a = Simplify $m.Groups[2].Value
    $b = Simplify $m.Groups[3].Value
    if ($b) { $regs += [pscustomobject]@{ Kind=$kind; Iface=$a; Impl=$b } }
    else    { $regs += [pscustomobject]@{ Kind=$kind; Iface='';  Impl=$a } }
  }
}
Write-Host ("registrations parsed: " + $regs.Count)

# 2. all backend/root cs files (content + token sets)
$files = Get-ChildItem -Path $root -Recurse -File -Filter *.cs -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(bin|obj|node_modules)\\' -and $_.FullName -notmatch '\\\.angular\\' -and $_.FullName -notmatch '\\\.tmp-preview\\' }
$contents = @{}
$tokens = @{}
foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  # strip block + line comments so references inside comments do not count
  $c = [regex]::Replace($c, '/\*[\s\S]*?\*/', ' ')
  $c = [regex]::Replace($c, '//[^\r\n]*', ' ')
  $contents[$f.FullName] = $c
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($t in [regex]::Matches($c, '[A-Za-z_][A-Za-z0-9_]*')) { [void]$set.Add($t.Value) }
  $tokens[$f.FullName] = $set
}
$iocFiles = @(Get-ChildItem -Path $iocDir -File -Filter *.cs | ForEach-Object { $_.FullName })

# candidate names
$cand = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($r in $regs) { [void]$cand.Add($r.Impl); if ($r.Iface) { [void]$cand.Add($r.Iface) } }

# name -> files containing it as a whole word (case sensitive)
$fileHas = @{}
foreach ($r in $regs) {
  foreach ($n in @($r.Impl, $r.Iface)) {
    if (-not $n -or $fileHas.ContainsKey($n)) { continue }
    $hits = New-Object 'System.Collections.Generic.List[string]'
    foreach ($f in $files) {
      if ($tokens[$f.FullName].Contains($n) -and ($contents[$f.FullName] -cmatch ('(?<![A-Za-z0-9_])' + [regex]::Escape($n) + '(?![A-Za-z0-9_])'))) {
        $hits.Add($f.FullName)
      }
    }
    $fileHas[$n] = $hits
  }
}
# declaring file of each type
function Get-DeclFile($n) {
  foreach ($f in $files) {
    if ($tokens[$f.FullName].Contains($n) -and ($contents[$f.FullName] -cmatch ('(?:class|record|struct|interface)\s+' + [regex]::Escape($n) + '\b'))) { return $f.FullName }
  }
  return $null
}

function Get-ExternalRefs($n) {
  if (-not $fileHas.ContainsKey($n)) { return @() }
  $decl = Get-DeclFile $n
  $res = @()
  foreach ($f in $fileHas[$n]) {
    if ($f -eq $decl) { continue }
    if ($iocFiles -contains $f) { continue }
    $res += $f
  }
  return $res
}

$layerRoots = [ordered]@{
  'Logic'      = (Join-Path $root 'backend\CastLibrary.Logic')
  'Repository' = (Join-Path $root 'backend\CastLibrary.Repository')
  'Adapter'    = (Join-Path $root 'backend\CastLibrary.Adapter')
}
$orphans = @()
foreach ($r in $regs) {
  $implFile = Get-DeclFile $r.Impl
  if (-not $implFile) { continue }
  $layer = $null
  foreach ($k in $layerRoots.Keys) { if ($implFile -like ($layerRoots[$k] + '\*')) { $layer = $k; break } }
  if (-not $layer) { continue }
  if ($r.Kind -eq 'HostedService') { continue }                    # framework-run
  $implRefs = Get-ExternalRefs $r.Impl
  $ifaceRefs = if ($r.Iface) { Get-ExternalRefs $r.Iface } else { @() }
  if ($implRefs.Count -eq 0 -and ($r.Iface -eq '' -or $ifaceRefs.Count -eq 0)) {
    $orphans += [pscustomobject]@{
      Layer = $layer
      Impl = $r.Impl
      Iface = $r.Iface
      Kind = $r.Kind
      File = $implFile.Replace($root + '\', '')
    }
  }
}
Write-Host ("IoC-only registrations (Logic/Repository/Adapter): " + $orphans.Count)
$orphans = $orphans | Sort-Object Layer, File, Impl -Unique
$orphans | Format-Table -AutoSize
$orphans | ForEach-Object { "$($_.Layer)|$($_.File)|$($_.Kind)|$($_.Iface)|$($_.Impl)" } |
  Out-File (Join-Path $root '.tmp-preview\layer-ioc-orphans.txt') -Encoding utf8
Write-Host ("unique: " + $orphans.Count)
