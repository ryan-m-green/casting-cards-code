$p = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app\app.routes.ts'
$t = [System.IO.File]::ReadAllText($p)

# 1) Remove the v1 DM campaign shell route tree (stop before the v2/campaign-library route)
$t = [regex]::Replace($t, "  \{\r?\n    path: 'campaign/:id',[\s\S]*?  \},\r?\n(?=  \{\r?\n    path: 'v2/campaign-library',)", "")

# 2) Remove the v1 player campaign shell route tree (stop before the journal shell route)
$t = [regex]::Replace($t, "  \{\r?\n    path: 'player/campaign/:id',[\s\S]*?  \},\r?\n(?=  \{\r?\n    path: '',\r?\n    component: JournalShellComponent,)", "")

$enc = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($p, $t, $enc)
Write-Host "written"
