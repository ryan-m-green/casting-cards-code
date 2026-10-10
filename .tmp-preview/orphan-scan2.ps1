$ErrorActionPreference = 'Stop'
$root = 'c:\Repository\CastingCards\Code\backend'
$out  = 'c:\Repository\CastingCards\Code\.tmp-preview\orphans2.txt'

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

$declFile = @{}
foreach ($f in $files) {
    foreach ($m in [regex]::Matches($texts[$f.FullName], '\b(?:class|interface|record|struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)')) {
        $tn = $m.Groups[1].Value
        if (-not $declFile.ContainsKey($tn)) { $declFile[$tn] = $f.FullName }
    }
}

$regs = @()
foreach ($f in ($files | Where-Object { $_.Name -like 'IOC*.cs' })) {
    foreach ($m in [regex]::Matches($texts[$f.FullName], 'Add(?:Scoped|Transient|Singleton)\s*<([A-Za-z0-9_\.<>,\s]+?)>\s*\(')) {
        $inner = $m.Groups[1].Value.Trim()
        $parts = @($inner -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
        $impl  = $parts[-1]
        $iface = if ($parts.Count -gt 1) { $parts[0] } else { $null }
        $regs += [pscustomobject]@{ File = $f.Name; Iface = $iface; Impl = $impl }
    }
}

function OtherRefs($type) {
    if (-not $tok.ContainsKey($type)) { return @() }
    $decl = $declFile[$type]
    @($tok[$type] | Where-Object { $_ -ne $decl })
}
function NonIocRefs($type) {
    $decl = $declFile[$type]
    @($tok[$type] | Where-Object { $_ -ne $decl -and ($ioc -notcontains $_) })
}
function ShortName($p) { if ($p) { $p.Replace('c:\Repository\CastingCards\Code\backend\', '') } else { '(none)' } }

$L = New-Object 'System.Collections.Generic.List[string]'

# ------------------------------------------------------------------
# SECTION 1: registrations whose interface AND implementation are never
#            consumed outside the IoC file  => registered but unused.
# ------------------------------------------------------------------
$L.Add('===== SECTION 1. REGISTERED BUT UNUSED (interface has no consumer and impl used nowhere else) =====')
$dead = @()
foreach ($r in $regs) {
    $ifaceUsed = $false; $implUsed = $false
    if ($r.Iface -and $tok.ContainsKey($r.Iface)) {
        $consumers = @($tok[$r.Iface] | Where-Object { $_ -ne $declFile[$r.Iface] -and $_ -ne $declFile[$r.Impl] -and ($ioc -notcontains $_) })
        $ifaceUsed = ($consumers.Count -gt 0)
    }
    if ($tok.ContainsKey($r.Impl)) {
        $implConsumers = @($tok[$r.Impl] | Where-Object { $_ -ne $declFile[$r.Impl] -and ($ioc -notcontains $_) })
        $implUsed = ($implConsumers.Count -gt 0)
    }
    if (-not $ifaceUsed -and -not $implUsed) {
        $dead += $r
        $L.Add(('{0}  ->  {1}   [reg {2}]' -f $r.Iface, $r.Impl, $r.File))
    }
}
$L.Add("(count: $($dead.Count))")
$L.Add('')

# ------------------------------------------------------------------
# SECTION 2: declared types referenced by nothing outside their own file (orphans/self-only)
# ------------------------------------------------------------------
$L.Add('===== SECTION 2. DECLARED TYPES WITH ZERO REFERENCES OUTSIDE THEIR OWN FILE (orphan / self-only) =====')
$orphans = @()
foreach ($t in ($declFile.Keys | Sort-Object)) {
    if ((OtherRefs $t).Count -eq 0) { $orphans += $t; $L.Add(('{0}   (decl: {1})' -f $t, (ShortName $declFile[$t]))) }
}
$L.Add("(count: $($orphans.Count))")
$L.Add('')

# ------------------------------------------------------------------
# SECTION 3: registered impls whose interface IS consumed (normal DI) - count only
# ------------------------------------------------------------------
$normal = @()
foreach ($r in $regs) {
    if ($r.Iface) { if ((NonIocRefs $r.Iface).Count -gt 0) { $normal += $r } }
    elseif ((NonIocRefs $r.Impl).Count -gt 0) { $normal += $r }
}
$L.Add("===== SECTION 3 (info): registrations that ARE consumed: $($normal.Count) =====")

[System.IO.File]::WriteAllLines($out, $L)
Write-Output ("wrote {0} lines; dead={1} orphans={2} normal={3}" -f $L.Count, $dead.Count, $orphans.Count, $normal.Count)
