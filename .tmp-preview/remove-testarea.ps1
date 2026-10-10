$routes = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app\app.routes.ts'
$t = [System.IO.File]::ReadAllText($routes)
$t = [regex]::Replace($t, "          \{\r?\n            path: 'testarea',[\s\S]*?          \},\r?\n", "")
$enc = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($routes, $t, $enc)

$folder = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app\features\gm-testarea'
if (Test-Path -LiteralPath $folder) { Remove-Item -LiteralPath $folder -Recurse -Force; Write-Host "removed features/gm-testarea" }
Write-Host "routes updated"
