$root = 'C:\Repository\CastingCards\Code'
$out  = "$root\.tmp-preview\controller-tables.txt"

# 1. repo class -> tables, from table-refs.txt
$repoTables = @{}   # class -> HashSet[string] tables
$cur = $null
foreach ($line in Get-Content "$root\.tmp-preview\table-refs.txt") {
  if ($line -match '^###\s+(.+?)\s*$') { $cur = $Matches[1] }
  elseif ($line -match '\[class\s+([^\]]+)\]') {
    $cls = $Matches[1].Trim()
    if (-not $repoTables.ContainsKey($cls)) { $repoTables[$cls] = New-Object 'System.Collections.Generic.HashSet[string]' }
    [void]$repoTables[$cls].Add($cur)
  }
}

# 2. backend source files (exclude bin/obj)
$files = Get-ChildItem -Path "$root\backend" -Recurse -File -Filter '*.cs' |
  Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }

# class name -> file content map (for handler resolution)
$classFile = @{}
foreach ($f in $files) {
  $txt = Get-Content $f.FullName -Raw
  foreach ($m in [regex]::Matches($txt, '\bclass\s+([A-Za-z0-9_]+)')) {
    $classFile[$m.Groups[1].Value] = $f.FullName
  }
}

function Get-ReposInText([string]$txt) {
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($m in [regex]::Matches($txt, '\b(?:I)?([A-Z][A-Za-z0-9_]*Repository)\b')) {
    $name = $m.Groups[1].Value
    if ($repoTables.ContainsKey($name)) { [void]$set.Add($name) }
  }
  return $set
}

$report = New-Object System.Collections.Generic.List[string]
$ctrlDir = "$root\backend\CastLibrary.WebHost\Controllers"
foreach ($c in Get-ChildItem $ctrlDir -File -Filter '*.cs') {
  $txt = Get-Content $c.FullName -Raw
  $repos = New-Object 'System.Collections.Generic.HashSet[string]'
  # direct repo refs in controller
  foreach ($r in (Get-ReposInText $txt)) { [void]$repos.Add($r) }
  # handler interfaces -> handler class file -> repos
  foreach ($m in [regex]::Matches($txt, '\bI([A-Z][A-Za-z0-9_]*Handler)\b')) {
    $cls = $m.Groups[1].Value
    if ($classFile.ContainsKey($cls)) {
      $hTxt = Get-Content $classFile[$cls] -Raw
      foreach ($r in (Get-ReposInText $hTxt)) { [void]$repos.Add($r) }
    }
  }
  $tables = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($r in $repos) { foreach ($t in $repoTables[$r]) { [void]$tables.Add($t) } }
  $report.Add("### $($c.Name)")
  $report.Add("  handlers: " + (([regex]::Matches($txt, '\bI([A-Z][A-Za-z0-9_]*Handler)\b') | ForEach-Object { $_.Groups[1].Value }) -join ', '))
  $report.Add("  repos:    " + (($repos | Sort-Object) -join ', '))
  $report.Add("  TABLES:   " + (($tables | Sort-Object) -join ', '))
  $report.Add("")
}
Set-Content -Path $out -Value $report -Encoding UTF8
Write-Output "written $out"
