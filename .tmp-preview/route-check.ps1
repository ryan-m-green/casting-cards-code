$ErrorActionPreference='Stop'
function Canon($s){ return ([regex]::Replace($s,'\{[^}]*\}','*')) }

$dir='c:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\Controllers'
$backend=@()
Get-ChildItem $dir -Filter *.cs | ForEach-Object {
  $t=[System.IO.File]::ReadAllText($_.FullName)
  $rm=[regex]::Match($t,'\[Route\("([^"]+)"\)\]'); if(-not $rm.Success){return}
  $base=$rm.Groups[1].Value.Trim('/')
  foreach($m in [regex]::Matches($t,'\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]')){
    $sub=$m.Groups[2].Value.Trim('/')
    $p=$base; if($sub){$p="$base/$sub"}
    $backend += (Canon ('/'+$p))
  }
}
$bset = @($backend | Select-Object -Unique)
"backend routes: $($backend.Count) (unique $($bset.Count))"

$fe='c:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'
$paths = New-Object 'System.Collections.Generic.HashSet[string]'
Get-ChildItem $fe -Recurse -File -Include *.ts | ForEach-Object {
  $t=[System.IO.File]::ReadAllText($_.FullName)
  foreach($m in [regex]::Matches($t,'/api/[^`\r\n"'' ]+')){
    $v=$m.Value
    $v=[regex]::Replace($v,'\$\{[^}]*\}','{}')
    $v=($v -split '\?')[0]
    $v=$v.TrimEnd('/')
    [void]$paths.Add((Canon $v))
  }
}
"frontend paths: $($paths.Count)"

function Seg($p){ return @($p -split '/' | Where-Object { $_ -ne '' }) }
function Matches($a,$b){
  if($a -eq $b){return $true}
  $sa=Seg $a; $sb=Seg $b
  if($sa.Count -ne $sb.Count){ return $false }
  for($i=0;$i -lt $sa.Count;$i++){
    $x=$sa[$i]; $y=$sb[$i]
    if($x -eq $y){continue}
    if($x -eq '*' -or $y -eq '*'){continue}
    if($x.EndsWith('*') -and $y.StartsWith($x.TrimEnd('*'))){continue}
    if($y.EndsWith('*') -and $x.StartsWith($y.TrimEnd('*'))){continue}
    return $false
  }
  return $true
}

''
'===== frontend paths with NO matching backend route ====='
$miss=0
foreach($p in ($paths | Sort-Object)){
  $ok=$false
  foreach($b in $bset){ if(Matches $p $b){$ok=$true;break} }
  if(-not $ok){ $miss++; "  $p" }
}
"(missing: $miss)"
