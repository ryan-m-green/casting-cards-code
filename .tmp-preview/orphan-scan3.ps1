$ErrorActionPreference = 'Stop'
$root = 'c:\Repository\CastingCards\Code\backend'
$out  = 'c:\Repository\CastingCards\Code\.tmp-preview\orphans3.txt'

$files = Get-ChildItem $root -Recurse -File -Include *.cs | Where-Object { $_.FullName -notmatch '\\(obj|bin)\\' }
$texts = @{}; $tok = @{}
foreach ($f in $files) {
    $t = [System.IO.File]::ReadAllText($f.FullName)
    $texts[$f.FullName] = $t
    $set = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($m in [regex]::Matches($t, '[A-Za-z_][A-Za-z0-9_]*')) { [void]$set.Add($m.Value) }
    foreach ($x in $set) {
        if (-not $tok.ContainsKey($x)) { $tok[$x] = New-Object 'System.Collections.Generic.List[string]' }
        $tok[$x].Add($f.FullName)
    }
}
$ioc = @($files | Where-Object { $_.DirectoryName -like '*\IoC' } | ForEach-Object { $_.FullName })

# map type name -> declaring file, and file -> declared type names
$declFile = @{}
$fileTypes = @{}
foreach ($f in $files) {
    $names = @()
    foreach ($m in [regex]::Matches($texts[$f.FullName], '\b(?:class|interface|record|struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)')) {
        $tn = $m.Groups[1].Value
        $names += $tn
        if (-not $declFile.ContainsKey($tn)) { $declFile[$tn] = $f.FullName }
    }
    $fileTypes[$f.FullName] = @($names | Select-Object -Unique)
}

function LastSeg($t) { if (-not $t) { return $null }; return ($t -split '\.')[-1] }

# registrations (normalised to last segment)
$regs = @()
foreach ($f in ($files | Where-Object { $_.Name -like 'IOC*.cs' })) {
    foreach ($m in [regex]::Matches($texts[$f.FullName], 'Add(?:Scoped|Transient|Singleton)\s*<([A-Za-z0-9_\.<>,\s]+?)>\s*\(')) {
        $inner = $m.Groups[1].Value.Trim()
        $parts = @($inner -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
        $impl  = LastSeg $parts[-1]
        $iface = if ($parts.Count -gt 1) { LastSeg $parts[0] } else { $null }
        $regs += [pscustomobject]@{ File = $f.Name; Iface = $iface; Impl = $impl }
    }
}

function Consumers($iface, $impl) {
    $res = @()
    if ($iface -and $tok.ContainsKey($iface)) {
        $res += $tok[$iface] | Where-Object { $_ -ne $declFile[$iface] -and $_ -ne $declFile[$impl] -and ($ioc -notcontains $_) }
    }
    if ($tok.ContainsKey($impl)) {
        $res += $tok[$impl] | Where-Object { $_ -ne $declFile[$impl] -and ($ioc -notcontains $_) }
    }
    return @($res | Select-Object -Unique)
}
function ShortName($p) { if ($p) { $p.Replace('c:\Repository\CastingCards\Code\backend\', '') } else { '(none)' } }

$L = New-Object 'System.Collections.Generic.List[string]'
$L.Add("backend .cs files: $($files.Count); IoC files: " + (($ioc | ForEach-Object { Split-Path $_ -Leaf }) -join ', '))
$L.Add('')

# SECTION 1: registered but unused
$L.Add('===== SECTION 1 (category: "only reference is the IoC container"): registered but no consumer =====')
$n1 = 0
$seen = @{}
foreach ($r in $regs) {
    $key = "$($r.Iface)|$($r.Impl)"
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    if ((Consumers $r.Iface $r.Impl).Count -eq 0) {
        $n1++
        $L.Add(('{0}  ->  {1}   [reg {2}; decl {3}]' -f $r.Iface, $r.Impl, $r.File, (ShortName $declFile[$r.Impl])))
    }
}
$L.Add("(count: $n1)")
$L.Add('')

# SECTION 2: orphan FILES (no other file mentions any type they declare), excluding conventional entry points
$skipPattern = '\\(Controllers|Hubs|Filters|Middleware|Authentication|IoC)\\|\\Program\.cs$|\\Startup\.cs$|\\appsettings'
$L.Add('===== SECTION 2 (categories: "only references itself" / "zero references"): orphan files =====')
$n2 = 0
foreach ($f in ($files | Sort-Object FullName)) {
    if ($f.FullName -match $skipPattern) { continue }
    $types = $fileTypes[$f.FullName]
    if ($types.Count -eq 0) { continue }
    $external = @()
    foreach ($t in $types) {
        if ($tok.ContainsKey($t)) { $external += $tok[$t] | Where-Object { $_ -ne $f.FullName } }
    }
    $external = @($external | Select-Object -Unique)
    if ($external.Count -eq 0) {
        $n2++
        $L.Add(('{0}   [types: {1}]' -f (ShortName $f.FullName), ($types -join ', ')))
    }
}
$L.Add("(count: $n2)")

[System.IO.File]::WriteAllLines($out, $L)
Write-Output ("wrote $($L.Count) lines; section1=$n1 section2=$n2")
