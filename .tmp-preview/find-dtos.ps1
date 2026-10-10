$ErrorActionPreference = 'SilentlyContinue'
$root = 'c:\Repository\CastingCards\Code\backend'
$cs = Get-ChildItem -Path $root -Recurse -Filter *.cs -File | Where-Object { $_.FullName -notmatch '\\bin\\' -and $_.FullName -notmatch '\\obj\\' }

$declRegex = [regex]'(?m)^[ \t]*(?:(?:public|internal|protected|private|static|sealed|abstract|partial|readonly|unsafe|file|new)\s+)*(?:(?:record\s+(?:class|struct))\s+|class\s+|interface\s+|record\s+|struct\s+|enum\s+)([A-Za-z_]\w*)'

$rows = New-Object System.Collections.Generic.List[object]
foreach ($f in $cs) {
  $rel = $f.FullName.Substring($root.Length + 1)
  $parts = $rel -split '\\'
  $proj = $parts[0]
  $dirs = $parts[1..($parts.Count - 2)]
  $inReqRes = ($dirs -contains 'Requests') -or ($dirs -contains 'Responses')
  $text = [System.IO.File]::ReadAllText($f.FullName)
  foreach ($m in $declRegex.Matches($text)) {
    $name = $m.Groups[1].Value
    $isDtoName = $name -match '(Request|Response|Dto|DTO|Payload|Contract)$'
    if ($isDtoName -or $inReqRes) {
      $rows.Add([pscustomobject]@{
        Dto    = $name
        Project= $proj
        Kind   = if ($isDtoName) { 'name' } else { 'folder' }
        Home   = if ($inReqRes) { 'Requests/Responses' } else { 'co-located' }
        Dir    = ($dirs -join '/')
        File   = $rel
      })
    }
  }
}

$rows | Sort-Object Project, Dto | Export-Csv -Path 'c:\Repository\CastingCards\Code\.tmp-preview\dtos.csv' -NoTypeInformation -Encoding UTF8

Write-Output "TOTAL_DTOS=$($rows.Count)"
Write-Output ''
Write-Output '=== BY PROJECT ==='
$rows | Group-Object Project | Sort-Object Count -Descending | ForEach-Object { "$($_.Count)`t$($_.Name)" }
Write-Output ''
Write-Output '=== BY HOME ==='
$rows | Group-Object Home | Sort-Object Count -Descending | ForEach-Object { "$($_.Count)`t$($_.Name)" }
Write-Output ''
Write-Output '=== CO-LOCATED (not in a Requests/Responses folder) ==='
$rows | Where-Object { $_.Home -eq 'co-located' } | Sort-Object Project, Dto | ForEach-Object { "$($_.Dto)|$($_.Project)|$($_.File)" }
