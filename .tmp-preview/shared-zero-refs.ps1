# Find declared types in CastLibrary.Shared that are not referenced in any other file.
$root    = 'C:\Repository\CastingCards\Code'
$sharedDir = Join-Path $root 'backend\CastLibrary.Shared'
$backend = Join-Path $root 'backend'

# all backend .cs files (reference universe), comments stripped, token sets built
$files = Get-ChildItem -Path $backend -Recurse -File -Filter *.cs -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
$contents = @{}
$tokens = @{}
foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  $c = [regex]::Replace($c, '/\*[\s\S]*?\*/', ' ')
  $c = [regex]::Replace($c, '//[^\r\n]*', ' ')
  $contents[$f.FullName] = $c
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($t in [regex]::Matches($c, '[A-Za-z_][A-Za-z0-9_]*')) { [void]$set.Add($t.Value) }
  $tokens[$f.FullName] = $set
}

# declared types in Shared
$declRx = [regex]'(?m)(?:^|\s)(?:public|internal|private|protected)?\s*(?:sealed\s+|abstract\s+|static\s+|partial\s+|readonly\s+|ref\s+)*\b(class|interface|struct|record|enum)\s+([A-Za-z_]\w*)'
$types = @()
foreach ($f in (Get-ChildItem -Path $sharedDir -Recurse -File -Filter *.cs | Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' })) {
  $c = $contents[$f.FullName]
  foreach ($m in $declRx.Matches($c)) {
    $types += [pscustomobject]@{ Kind = $m.Groups[1].Value; Name = $m.Groups[2].Value; File = $f.FullName }
  }
}
# keep one row per (name, file)
$types = $types | Sort-Object File, Name -Unique
Write-Host ("declared types in Shared: " + $types.Count)

$rows = @()
foreach ($t in $types) {
  $otherFiles = 0
  $ownRefs = 0
  foreach ($k in $tokens.Keys) {
    if (-not $tokens[$k].Contains($t.Name)) { continue }
    if ($k -eq $t.File) {
      $ownRefs += ([regex]::Matches($contents[$k], ('(?<![A-Za-z0-9_])' + [regex]::Escape($t.Name) + '(?![A-Za-z0-9_])'))).Count
    } else { $otherFiles++ }
  }
  if ($otherFiles -eq 0) {
    $rows += [pscustomobject]@{
      Kind = $t.Kind
      Name = $t.Name
      OwnFileRefs = $ownRefs   # 1 == declaration only
      File = $t.File.Replace($root + '\', '')
    }
  }
}
$rows = $rows | Sort-Object File, Name
Write-Host ("Shared types with zero external references: " + $rows.Count)
$rows | Format-Table -AutoSize
$rows | ForEach-Object { "$($_.Kind)|$($_.Name)|$($_.OwnFileRefs)|$($_.File)" } |
  Out-File (Join-Path $root '.tmp-preview\shared-zero-refs.txt') -Encoding utf8
