# Solution-wide: declared types with no references, or referenced only in the IoC container.
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

$declRx = [regex]'(?m)^\s*(?:public|internal|private|protected)?\s*(?:sealed\s+|abstract\s+|static\s+|partial\s+|readonly\s+|ref\s+)*\b(class|interface|struct|record|enum)\s+([A-Za-z_]\w*)'
$types = @()
foreach ($f in $files) {
  foreach ($m in $declRx.Matches($contents[$f.FullName])) {
    $types += [pscustomobject]@{ Kind = $m.Groups[1].Value; Name = $m.Groups[2].Value; File = $f.FullName }
  }
}
$types = $types | Sort-Object File, Name -Unique
Write-Host ("declared types (whole solution): " + $types.Count)

function Get-Project($p) {
  if ($p -match '\\backend\\([^\\]+)\\') { return $Matches[1] }
  return 'other'
}

$results = @()
foreach ($t in $types) {
  $extFiles = New-Object 'System.Collections.Generic.List[string]'
  $ownRefs = 0
  foreach ($k in $tokens.Keys) {
    if (-not $tokens[$k].Contains($t.Name)) { continue }
    if ($k -eq $t.File) {
      $ownRefs += ([regex]::Matches($contents[$k], ('(?<![A-Za-z0-9_])' + [regex]::Escape($t.Name) + '(?![A-Za-z0-9_])'))).Count
    } else { $extFiles.Add($k) }
  }
  $nonIoc = @($extFiles | Where-Object { -not $_.StartsWith($iocDir + '\') })
  $results += [pscustomobject]@{
    Kind       = $t.Kind
    Name       = $t.Name
    Project    = Get-Project $t.File
    File       = $t.File.Replace($root + '\', '')
    OwnRefs    = $ownRefs
    ExtFiles   = $extFiles.Count
    NonIocExt  = $nonIoc.Count
    IocOnly    = ($extFiles.Count -gt 0 -and $nonIoc.Count -eq 0)
  }
}

$noRefs  = $results | Where-Object { $_.ExtFiles -eq 0 } | Sort-Object Project, File, Name
$iocOnly = $results | Where-Object { $_.IocOnly -eq $true } | Sort-Object Project, File, Name

Write-Host ("=== NO references at all: " + $noRefs.Count + " ===")
$noRefs | Select-Object Kind, Name, OwnRefs, File | Format-Table -AutoSize
Write-Host ("=== Only referenced in IoC container: " + $iocOnly.Count + " ===")
$iocOnly | Select-Object Kind, Name, File | Format-Table -AutoSize

$noRefs  | ForEach-Object { "NOREF|$($_.Kind)|$($_.Name)|$($_.OwnRefs)|$($_.File)" } | Out-File (Join-Path $root '.tmp-preview\dead-norefs.txt') -Encoding utf8
$iocOnly | ForEach-Object { "IOCONLY|$($_.Kind)|$($_.Name)|$($_.File)" } | Out-File (Join-Path $root '.tmp-preview\dead-ioconly.txt') -Encoding utf8
Write-Host "written dead-norefs.txt / dead-ioconly.txt"
