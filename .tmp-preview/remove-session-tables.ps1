$ErrorActionPreference = 'Stop'
$root = 'C:\Repository\CastingCards\Code\backend\CastLibrary.Initializer'

function Remove-LineRanges {
    param([string]$Path, [object[]]$Ranges)   # ranges descending (highest Start first)
    $bytes  = [System.IO.File]::ReadAllBytes($Path)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $text   = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $nl     = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines  = [System.Collections.Generic.List[string]]::new()
    foreach ($l in ($text -split "`r`n|`n")) { [void]$lines.Add($l) }
    foreach ($r in $Ranges) {
        $lines.RemoveRange($r.Start - 1, $r.End - $r.Start + 1)
    }
    [System.IO.File]::WriteAllText($Path, [string]::Join($nl, $lines), [System.Text.UTF8Encoding]::new($hasBom))
}

# init.sql (descending): trgm indexes, both table defs, keywords ALTERs
Remove-LineRanges -Path "$root\init.sql" -Ranges @(
    @{ Start = 681; End = 688 },   # chronicle trgm indexes (+ header/blank)
    @{ Start = 584; End = 621 },   # campaign_session_archived + campaign_session_chronicles
    @{ Start = 332; End = 333 }    # keywords ALTERs for the two tables
)

# alter.sql: the keywords migration blocks for both tables + their indexes/trgm
Remove-LineRanges -Path "$root\alter.sql" -Ranges @(
    @{ Start = 17; End = 54 }
)

Write-Output 'done'
