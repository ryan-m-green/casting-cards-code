$root = 'C:\Repository\CastingCards\Code'
$repoTables = @{}
$cur = $null
foreach ($line in Get-Content "$root\.tmp-preview\table-refs.txt") {
  if ($line -match '^###\s+(.+?)\s*$') { $cur = $Matches[1] }
  elseif ($line -match '\[class\s+([^\]]+)\]') {
    $cls = $Matches[1].Trim()
    if (-not $repoTables.ContainsKey($cls)) { $repoTables[$cls] = New-Object 'System.Collections.Generic.HashSet[string]' }
    [void]$repoTables[$cls].Add($cur)
  }
}
$rows = foreach ($k in $repoTables.Keys) {
  [pscustomobject]@{ Repo = $k; Count = $repoTables[$k].Count; Tables = ($repoTables[$k] | Sort-Object) -join ', ' }
}
$rows | Sort-Object -Property @{Expression='Count';Descending=$true}, Repo |
  ForEach-Object { "{0,3}  {1}`n      {2}" -f $_.Count, $_.Repo, $_.Tables } |
  Set-Content "$root\.tmp-preview\repo-tables-sorted.txt" -Encoding UTF8
Write-Output "ok"
