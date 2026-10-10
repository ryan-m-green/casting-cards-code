# List DB tables that are no longer referenced in any Repository file.
$root    = 'C:\Repository\CastingCards\Code'
$sqlDir  = Join-Path $root 'backend\CastLibrary.Initializer'
$repoDir = Join-Path $root 'backend\CastLibrary.Repository'

# 1. table names from the schema SQL
$tables = @{}
foreach ($f in (Get-ChildItem $sqlDir -File -Filter *.sql)) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  foreach ($m in [regex]::Matches($text, '(?im)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"|`|\[)?([A-Za-z_][A-Za-z0-9_]*)(?:"|`|\])?')) {
    $tables[$m.Groups[1].Value.ToLower()] = $true
  }
}
$tableList = @($tables.Keys | Sort-Object)
Write-Host ("tables in schema: " + $tableList.Count)

# 2. repository text
$repoFiles = Get-ChildItem -Path $repoDir -Recurse -File -Filter *.cs | Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
$repoText = @{}
foreach ($f in $repoFiles) { $repoText[$f.FullName] = [System.IO.File]::ReadAllText($f.FullName) }

# 3. other backend text (outside Repository) for cross-check
$backendText = @{}
foreach ($f in (Get-ChildItem -Path (Join-Path $root 'backend') -Recurse -File -Filter *.cs | Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' })) {
  if (-not $repoText.ContainsKey($f.FullName)) { $backendText[$f.FullName] = [System.IO.File]::ReadAllText($f.FullName) }
}

$rows = @()
foreach ($t in $tableList) {
  $rx = [regex]::new('(?<![A-Za-z0-9_])' + [regex]::Escape($t) + '(?![A-Za-z0-9_])', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $repoHits = @($repoText.Keys | Where-Object { $rx.IsMatch($repoText[$_]) })
  $otherHits = @($backendText.Keys | Where-Object { $rx.IsMatch($backendText[$_]) })
  $rows += [pscustomobject]@{
    Table = $t; RepoRefs = $repoHits.Count; OtherBackendRefs = $otherHits.Count
    OtherBackendFiles = (($otherHits | ForEach-Object { $_.Replace($root + '\', '') }) -join ',')
  }
}

$unused = $rows | Where-Object { $_.RepoRefs -eq 0 } | Sort-Object Table
Write-Host ("tables with 0 repository references: " + $unused.Count)
$unused | Format-Table Table, RepoRefs, OtherBackendRefs -AutoSize
$unused | ForEach-Object { "$($_.Table)|otherBackend=$($_.OtherBackendRefs)|$($_.OtherBackendFiles)" } | Out-File (Join-Path $root '.tmp-preview\unused-tables.txt') -Encoding utf8
$rows | Sort-Object Table | ForEach-Object { "$($_.Table)|repo=$($_.RepoRefs)|other=$($_.OtherBackendRefs)" } | Out-File (Join-Path $root '.tmp-preview\all-table-usage.txt') -Encoding utf8
Write-Host "written unused-tables.txt / all-table-usage.txt"
