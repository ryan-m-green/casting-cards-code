$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'
# Load non-v2 shared component selectors
$selectors = Get-Content 'C:\Repository\CastingCards\Code\.tmp-preview\selectors.txt' |
  Where-Object { $_ -match '^([^|]+)\|shared\\components\\' -and $_ -notmatch 'shared\\components\\v2\\' } |
  ForEach-Object { $p = $_.Split('|'); [pscustomobject]@{ Selector = $p[0]; File = $p[1] } }

# Gather all template-bearing files (html + ts, exclude spec and node_modules)
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { $_.Extension -in '.html','.ts' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }

# Pre-read content
$contents = @{}
foreach ($f in $files) {
  $rel = $f.FullName.Replace($root + '\','')
  $contents[$rel] = Get-Content -Raw -LiteralPath $f.FullName
}

$out = New-Object System.Collections.Generic.List[string]
foreach ($s in $selectors) {
  $sel = $s.Selector
  $pattern = [regex]::Escape($sel)
  $hits = @()
  foreach ($rel in $contents.Keys) {
    if ($contents[$rel] -match $pattern) { $hits += $rel }
  }
  $hits = $hits | Sort-Object
  $out.Add("### $($s.File)")
  $out.Add("SELECTOR: $sel")
  if ($hits.Count -eq 0) { $out.Add("  (no template references found)") }
  foreach ($h in $hits) { $out.Add("  USED_IN: $h") }
  $out.Add("")
}
$out | Out-File 'C:\Repository\CastingCards\Code\.tmp-preview\usage-map.txt' -Encoding utf8
Write-Host "done: $($out.Count) lines"
