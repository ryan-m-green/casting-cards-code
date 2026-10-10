$ErrorActionPreference = 'SilentlyContinue'
$root = 'c:\Repository\CastingCards\Code\backend'
$cs = Get-ChildItem -Path $root -Recurse -Filter *.cs -File | Where-Object { $_.FullName -notmatch '\\bin\\' -and $_.FullName -notmatch '\\obj\\' }

$iocFiles = @{}
foreach ($f in $cs) {
  if ($f.FullName -match '\\IoC\\' -or $f.Name -like 'IOC*.cs' -or $f.Name -eq 'Program.cs') { $iocFiles[$f.FullName] = $true }
}

$declRegex = [regex]'(?m)^[ \t]*(?:(?:public|internal|protected|private|static|sealed|abstract|partial|readonly|unsafe|file|new)\s+)*(?:(?:record\s+(?:class|struct))\s+|class\s+|interface\s+|record\s+|struct\s+|enum\s+)([A-Za-z_]\w*)'
$identRegex = [regex]'\b[A-Za-z_]\w*\b'

$declared = @{}
foreach ($f in $cs) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  foreach ($m in $declRegex.Matches($text)) {
    $name = $m.Groups[1].Value
    if (-not $declared.ContainsKey($name)) {
      $declared[$name] = @{ DeclFiles = New-Object System.Collections.Generic.List[string]; DeclCount = 0; Bases = New-Object System.Collections.Generic.HashSet[string] }
    }
    if (-not $declared[$name].DeclFiles.Contains($f.FullName)) { $declared[$name].DeclFiles.Add($f.FullName) }
    $declared[$name].DeclCount++
    # base / interface list: text from declaration up to first '{'
    $win = $text.Substring($m.Index, [Math]::Min(600, $text.Length - $m.Index))
    $brace = $win.IndexOf('{')
    if ($brace -ge 0) { $head = $win.Substring(0, $brace) } else { $head = $win }
    $ci = $head.IndexOf(':')
    if ($ci -ge 0) {
      $basePart = $head.Substring($ci + 1)
      $wi = $basePart.IndexOf(' where')
      if ($wi -ge 0) { $basePart = $basePart.Substring(0, $wi) }
      foreach ($bm in [regex]::Matches($basePart, '\b([A-Za-z_]\w*)\b')) {
        [void]$declared[$name].Bases.Add($bm.Groups[1].Value)
      }
    }
  }
}
Write-Output "DECLARED_TYPES=$($declared.Count)"

$refs = @{}
foreach ($f in $cs) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  foreach ($m in $identRegex.Matches($text)) {
    $name = $m.Value
    if ($declared.ContainsKey($name)) {
      if (-not $refs.ContainsKey($name)) { $refs[$name] = @{} }
      $t = $refs[$name]
      if ($t.ContainsKey($f.FullName)) { $t[$f.FullName]++ } else { $t[$f.FullName] = 1 }
    }
  }
}

$results = New-Object System.Collections.Generic.List[object]
foreach ($name in $declared.Keys) {
  $info = $declared[$name]
  $declFiles = $info.DeclFiles
  $declCount = $info.DeclCount
  $t = $refs[$name]
  if ($null -eq $t) { $t = @{} }
  $occ = 0; foreach ($v in $t.Values) { $occ += $v }
  $ownOcc = 0
  foreach ($df in $declFiles) { if ($t.ContainsKey($df)) { $ownOcc += $t[$df] } }
  $ownInternal = $ownOcc - $declCount
  $externalOcc = $occ - $ownOcc
  $extFiles = @($t.Keys | Where-Object { $declFiles -notcontains $_ })
  $iocExtOcc = 0; $nonIocExtOcc = 0
  foreach ($ef in $extFiles) {
    if ($iocFiles.ContainsKey($ef)) { $iocExtOcc += $t[$ef] } else { $nonIocExtOcc += $t[$ef] }
  }
  $category = 'REFERENCED'
  if ($externalOcc -eq 0 -and $ownInternal -le 0) { $category = 'ZERO_REFERENCES' }
  elseif ($nonIocExtOcc -eq 0 -and $ownInternal -le 0 -and $externalOcc -gt 0) { $category = 'ONLY_IOC' }
  elseif ($nonIocExtOcc -eq 0 -and $ownInternal -gt 0 -and $externalOcc -gt 0) { $category = 'IOC_PLUS_SELF' }
  elseif ($externalOcc -eq 0 -and $ownInternal -gt 0) { $category = 'SELF_ONLY' }
  $nonIocFiles = @($extFiles | Where-Object { -not $iocFiles.ContainsKey($_) })
  $results.Add([pscustomobject]@{
    Name          = $name
    Category      = $category
    DeclFiles     = (($declFiles | ForEach-Object { $_.Substring($root.Length + 1) }) -join ' | ')
    Occ           = $occ
    OwnInternal   = $ownInternal
    ExternalOcc   = $externalOcc
    IoCExtOcc     = $iocExtOcc
    NonIocExtOcc  = $nonIocExtOcc
    NonIocExtFiles= (($nonIocFiles | ForEach-Object { $_.Substring($root.Length + 1) }) -join ' | ')
  })
}

$catByName = @{}
foreach ($r in $results) { $catByName[$r.Name] = $r.Category }

foreach ($r in $results) {
  Add-Member -InputObject $r -NotePropertyName LiveBase -NotePropertyValue '' -Force
  if ($r.Category -eq 'ONLY_IOC') {
    $liveBases = @()
    foreach ($b in $declared[$r.Name].Bases) {
      if ($catByName.ContainsKey($b) -and ($catByName[$b] -eq 'REFERENCED' -or $catByName[$b] -eq 'IOC_PLUS_SELF')) { $liveBases += $b }
    }
    if ($liveBases.Count -gt 0) { $r.Category = 'ONLY_IOC_DI_LIVE'; $r.LiveBase = (($liveBases | Sort-Object -Unique) -join ',') }
    else { $r.Category = 'ONLY_IOC_SUSPECT' }
  }
}

$catByName = @{}
foreach ($r in $results) { $catByName[$r.Name] = $r.Category }

$fileTypes = @{}
foreach ($name in $declared.Keys) {
  foreach ($df in $declared[$name].DeclFiles) {
    if (-not $fileTypes.ContainsKey($df)) { $fileTypes[$df] = New-Object System.Collections.Generic.List[string] }
    $fileTypes[$df].Add($name)
  }
}
$deadFiles = New-Object System.Collections.Generic.List[string]
foreach ($f in $fileTypes.Keys) {
  $allZero = $true
  foreach ($t in $fileTypes[$f]) { if ($catByName[$t] -ne 'ZERO_REFERENCES') { $allZero = $false; break } }
  if ($allZero) { $deadFiles.Add($f.Substring($root.Length + 1)) }
}

$out = 'c:\Repository\CastingCards\Code\.tmp-preview\deadcode-report.csv'
$results | Sort-Object Category, Name | Export-Csv -Path $out -NoTypeInformation -Encoding UTF8

Write-Output '=== CATEGORY COUNTS ==='
$results | Group-Object Category | Sort-Object Count -Descending | ForEach-Object { "$($_.Count)|$($_.Name)" }
Write-Output ''
Write-Output "=== DEAD FILES (all declared types ZERO_REFERENCES): $($deadFiles.Count) ==="
$deadFiles | Sort-Object
Write-Output ''
Write-Output '=== ZERO_REFERENCES ==='
$results | Where-Object { $_.Category -eq 'ZERO_REFERENCES' } | Sort-Object Name | ForEach-Object { "$($_.Name)|$($_.DeclFiles)" }
Write-Output ''
Write-Output '=== SELF_ONLY (used only inside its own file) ==='
$results | Where-Object { $_.Category -eq 'SELF_ONLY' } | Sort-Object Name | ForEach-Object { "$($_.Name)|$($_.DeclFiles)" }
Write-Output ''
Write-Output '=== ONLY_IOC_SUSPECT (registered in IoC, no live interface/base anywhere) ==='
$results | Where-Object { $_.Category -eq 'ONLY_IOC_SUSPECT' } | Sort-Object Name | ForEach-Object { "$($_.Name)|$($_.DeclFiles)" }
Write-Output ''
Write-Output '=== ONLY_IOC_DI_LIVE count ==='
($results | Where-Object { $_.Category -eq 'ONLY_IOC_DI_LIVE' }).Count
Write-Output ''
Write-Output '=== IOC_PLUS_SELF ==='
$results | Where-Object { $_.Category -eq 'IOC_PLUS_SELF' } | Sort-Object Name | ForEach-Object { "$($_.Name)|$($_.DeclFiles)" }
