$ErrorActionPreference = 'Stop'
$root = 'C:\Repository\CastingCards\Code\backend\CastLibrary.Initializer'

function Remove-LineRanges {
    param([string]$Path, [object[]]$Ranges)
    # NOTE: $Ranges MUST be supplied in descending Start order (highest first),
    # so that each removal does not shift the indices of later ranges.
    $bytes  = [System.IO.File]::ReadAllBytes($Path)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $text   = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $nl     = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines  = [System.Collections.Generic.List[string]]::new()
    foreach ($l in ($text -split "`r`n|`n")) { [void]$lines.Add($l) }
    foreach ($r in $Ranges) {
        $lines.RemoveRange($r.Start - 1, $r.End - $r.Start + 1)
    }
    $out = [string]::Join($nl, $lines)
    [System.IO.File]::WriteAllText($Path, $out, [System.Text.UTF8Encoding]::new($hasBom))
}

# init.sql: 6 blocks, supplied highest-first
Remove-LineRanges -Path "$root\init.sql" -Ranges @(
    @{ Start = 670; End = 680 },   # campaign_player_notes
    @{ Start = 588; End = 601 },   # player_card_memories
    @{ Start = 493; End = 509 },   # campaign_sessions
    @{ Start = 372; End = 380 },   # admin_invite_codes
    @{ Start = 334; End = 348 },   # faction_participants
    @{ Start = 285; End = 315 }    # faction_relationships + campaign_player_faction_relationships
)

# v2Alter.sql: player_cast_notes section
Remove-LineRanges -Path "$root\v2Alter.sql" -Ranges @(
    @{ Start = 262; End = 292 }
)

# alter.sql: campaign_sessions column-drop block
Remove-LineRanges -Path "$root\alter.sql" -Ranges @(
    @{ Start = 14; End = 22 }
)

# Append the DROP statements to alter.sql
$alterPath = "$root\alter.sql"
$bytes  = [System.IO.File]::ReadAllBytes($alterPath)
$hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$text   = [System.IO.File]::ReadAllText($alterPath, [System.Text.Encoding]::UTF8)
$nl     = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

$dropBlock = @(
    '',
    '-- ============================================================',
    '-- Retired tables',
    '-- Definitions removed from init.sql / v2Alter.sql; dropped here so',
    '-- existing databases shed them too. No code reads or writes them.',
    '-- ============================================================',
    'DROP TABLE IF EXISTS player_cast_notes CASCADE;',
    'DROP TABLE IF EXISTS campaign_player_notes CASCADE;',
    'DROP TABLE IF EXISTS player_card_memories CASCADE;',
    'DROP TABLE IF EXISTS campaign_sessions CASCADE;',
    'DROP TABLE IF EXISTS admin_invite_codes CASCADE;',
    'DROP TABLE IF EXISTS faction_participants CASCADE;',
    'DROP TABLE IF EXISTS campaign_player_faction_relationships CASCADE;',
    'DROP TABLE IF EXISTS faction_relationships CASCADE;',
    ''
) -join $nl

$newText = $text.TrimEnd() + $nl + $dropBlock
[System.IO.File]::WriteAllText($alterPath, $newText, [System.Text.UTF8Encoding]::new($hasBom))

Write-Output 'done'

