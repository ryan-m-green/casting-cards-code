$ErrorActionPreference = 'Stop'
$root = 'c:\Repository\CastingCards\Code\backend'
$out  = 'c:\Repository\CastingCards\Code\.tmp-preview\orphans.txt'

$files = Get-ChildItem $root -Recurse -File -Include *.cs | Where-Object { $_.FullName -notmatch '\\(obj|bin)\\' }
$texts = @{}
$tok   = @{}
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

# declaring file per type name
$declFile = @{}
foreach ($f in $files) {
    foreach ($m in [regex]::Matches($texts[$f.FullName], '\b(?:class|interface|record|struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)')) {
        $tn = $m.Groups[1].Value
        if (-not $declFile.ContainsKey($tn)) { $declFile[$tn] = $f.FullName }
    }
}

# parse registrations
$regs = @()
foreach ($f in ($files | Where-Object { $_.Name -like 'IOC*.cs' })) {
    foreach ($m in [regex]::Matches($texts[$f.FullName], 'Add(?:Scoped|Transient|Singleton)\s*<([A-Za-z0-9_\.<>,\s]+?)>\s*\(')) {
        $inner = $m.Groups[1].Value.Trim()
        $parts = @($inner -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
        $impl = $parts[-1]
        $iface = if ($parts.Count -gt 1) { $parts[0] } else { $null }
        $regs += [pscustomobject]@{ File = $f.Name; Iface = $iface; Impl = $impl }
    }
}

function Other-Refs($type) {
    if (-not $tok.ContainsKey($type)) { return @() }
    $decl = $declFile[$type]
    $r = @($tok[$type] | Where-Object { $_ -ne $decl })
    return ,$r
}
function NonIoc-Refs($type) {
    $decl = $declFile[$type]
    $r = @($tok[$type] | Where-Object { $_ -ne $decl -and ($ioc -notcontains $_) })
    return ,$r
}
function ShortName($p) { if ($p) { return $p.Replace('c:\Repository\CastingCards\Code\backend\','') } else { return '(none)' } }

$lines = New-Object 'System.Collections.Generic.List[string]'
$lines.Add("SCOPE: $root  ($($files.Count) .cs files, obj/bin excluded)")
$lines.Add("IoC files: " + (($ioc | ForEach-Object { Split-Path $_ -Leaf }) -join ', '))
$lines.Add("registrations parsed: $($regs.Count)")
$lines.Add('')

# ---- A: implementations only referenced by the IoC container ----
$lines.Add('===== A. Registered types whose ONLY reference (besides their own file) is the IoC container =====')
$seenA = @{}
foreach ($r in $regs) {
    foreach ($t in @($r.Iface, $r.Impl)) {
        if (-not $t) { continue }
        if ($seenA.ContainsKey($t)) { continue }
        $seenA[$t] = $true
        $other = Other-Refs $t
        $nonIoc = NonIoc-Refs $t
        if ($other.Count -gt 0 -and $nonIoc.Count -eq 0) {
            $lines.Add(("{0}  (decl: {1})  [reg: {2}]" -f $t, (ShortName $declFile[$t]), $r.File))
        }
    }
}
$lines.Add('')

# ---- B: registered types with ZERO references outside their own file ----
$lines.Add('===== B. Registered types referenced by NOTHING outside their own file =====')
$seenB = @{}
foreach ($r in $regs) {
    foreach ($t in @($r.Iface, $r.Impl)) {
        if (-not $t) { continue }
        if ($seenB.ContainsKey($t)) { continue }
        $seenB[$t] = $true
        $other = Other-Refs $t
        if ($other.Count -eq 0) {
            $lines.Add(("{0}  (decl: {1})  [reg: {2}]" -f $t, (ShortName $declFile[$t]), $r.File))
        }
    }
}
$lines.Add('')

# ---- C: every declared type with zero references outside its own file (whole repo) ----
$lines.Add('===== C. ALL declared types referenced by nothing outside their own file (whole backend) =====')
$declTok = $declFile.Keys | Sort-Object
foreach ($t in $declTok) {
    $other = Other-Refs $t
    if ($other.Count -eq 0) {
        $lines.Add(("{0}  (decl: {1})" -f $t, (ShortName $declFile[$t])))
    }
}
$lines.Add('')

# ---- D: declared types whose only references are within their own file OR only the IoC container ----
$lines.Add('===== D. Declared types referenced ONLY by the IoC container (not self) =====')
foreach ($t in $declTok) {
    $nonIoc = NonIoc-Refs $t
    $other = Other-Refs $t
    if ($other.Count -gt 0 -and $nonIoc.Count -eq 0) {
        $lines.Add(("{0}  (decl: {1})" -f $t, (ShortName $declFile[$t])))
    }
}

[System.IO.File]::WriteAllLines($out, $lines)
Write-Output ("wrote {0} lines to {1}" -f $lines.Count, $out)
