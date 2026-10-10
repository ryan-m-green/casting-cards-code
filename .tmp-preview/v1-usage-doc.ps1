# Generates the v1 (non-v2) endpoint -> frontend usage document (verb aware)
$ctrlDir = 'C:\Repository\CastingCards\Code\backend\CastLibrary.WebHost\Controllers'
$appDir  = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

function Normalize-Path([string]$s) {
  $s = [regex]::Replace($s, '\{[^}]*\}', '{}')
  $s = [regex]::Replace($s, '\$\{[^}]*\}', '{}')
  $i = $s.IndexOf('?'); if ($i -ge 0) { $s = $s.Substring(0, $i) }
  $i = $s.IndexOf('#'); if ($i -ge 0) { $s = $s.Substring(0, $i) }
  return $s.TrimEnd('/')
}

$feFiles = Get-ChildItem -Path $appDir -Recurse -File |
  Where-Object { $_.Extension -in '.ts','.html' -and $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notmatch '\.spec\.ts$' }

# ---- Dynamic (URL-builder) call sites, verified by hand: 'VERB /normalized/path' ----
$dynamic = @{
  'core\encounter.service.ts' = @(
    'GET /api/campaign/{}/encounters','POST /api/campaign/{}/encounters',
    'GET /api/campaign/{}/encounters/{}','PATCH /api/campaign/{}/encounters/{}',
    'POST /api/campaign/{}/encounters/{}/start','POST /api/campaign/{}/encounters/{}/end',
    'POST /api/campaign/{}/encounters/{}/turn','POST /api/campaign/{}/encounters/{}/combatants',
    'PATCH /api/campaign/{}/encounters/{}/combatants/{}','DELETE /api/campaign/{}/encounters/{}/combatants/{}',
    'GET /api/campaign/{}/encounters/{}/combatants/{}/conditions',
    'POST /api/campaign/{}/encounters/{}/spots','PATCH /api/campaign/{}/encounters/{}/spots/{}',
    'DELETE /api/campaign/{}/encounters/{}/spots/{}','PATCH /api/campaign/{}/encounters/{}/order',
    'PATCH /api/campaign/{}/encounters/{}/initiative'
  )
  'core\condition-library.service.ts' = @(
    'GET /api/campaigns/{}/conditions','GET /api/campaigns/{}/conditions/available',
    'POST /api/campaigns/{}/conditions','POST /api/campaigns/{}/conditions/link',
    'DELETE /api/campaigns/{}/conditions/{}'
  )
  'core\rule-library.service.ts' = @(
    'GET /api/campaigns/{}/rules','GET /api/campaigns/{}/rules/available',
    'POST /api/campaigns/{}/rules','POST /api/campaigns/{}/rules/link',
    'PUT /api/campaigns/{}/rules/{}','DELETE /api/campaigns/{}/rules/{}'
  )
  'core\player-cast-note.service.ts' = @(
    'GET /api/campaigns/{}/player-cast-notes/mine','PUT /api/campaigns/{}/player-cast-notes/mine'
  )
  'core\card-condition.service.ts' = @(
    'GET /api/campaign/{}/players/{}/conditions','POST /api/campaign/{}/players/{}/conditions',
    'DELETE /api/campaign/{}/players/{}/conditions/{}',
    'GET /api/campaign/{}/encounters/{}/combatants/{}/conditions',
    'POST /api/campaign/{}/encounters/{}/combatants/{}/conditions',
    'DELETE /api/campaign/{}/encounters/{}/combatants/{}/conditions/{}'
  )
  'core\sublocation.service.ts' = @(
    'GET /api/campaign/{}/sublocationinstances/{}',
    'PATCH /api/campaign/{}/sublocationinstances/{}/shop-items/{}/scratch',
    'POST /api/campaigns/{}/sublocations/{}/shop-items',
    'PATCH /api/campaigns/{}/sublocations/{}/shop-items/{}',
    'DELETE /api/campaigns/{}/sublocations/{}/shop-items/{}',
    'PATCH /api/campaigns/{}/sublocations/{}'
  )
  'shared\components\v2\Quicknotes\cc-quicknotes\cc-quicknotes.component.ts' = @(
    'PUT /api/campaigns/{}/quicknote-queue/{}'
  )
  'shared\components\v2\TheParty\cc-secret-detail-content\cc-secret-detail-content.component.ts' = @(
    'POST /api/campaigns/{}/player-cards/{}/secrets/{}/share',
    'DELETE /api/campaigns/{}/player-cards/{}/secrets/{}'
  )
  'shared\components\v2\TheParty\cc-secrets-whisper-row\cc-secrets-whisper-row.component.ts' = @(
    'POST /api/campaigns/{}/player-cards/{}/secrets',
    'PUT /api/campaigns/{}/player-cards/{}/secrets/{}'
  )
  'shared\components\v2\TheParty\cc-player-secrets-content\cc-player-secrets-content.component.ts' = @(
    'GET /api/campaigns/{}/player-cards/{}/secrets',
    'GET /api/campaigns/{}/player-cards/{}/secrets/shared'
  )
  'shared\components\v2\Shared\cc-secrets-manager\cc-secrets-manager.component.ts' = @(
    'GET /api/campaign/{}/secrets',
    'POST /api/campaign/{}/secrets',
    'PATCH /api/campaign/{}/secrets/{}/reseal',
    'POST /api/campaigns/{}/player-cards/{}/secrets',
    'POST /api/campaigns/{}/player-cards/{}/secrets/{}/reveal',
    'PATCH /api/campaigns/{}/player-cards/{}/secrets/{}/reseal'
  )
  'shared\components\v2\Soundtracks\cc-soundtrack-content\cc-soundtrack-content.component.ts' = @(
    'POST /api/campaigns/{}/ambiances','PATCH /api/campaigns/{}/ambiances/{}'
  )
  'shared\components\right-drawer\cast-detail-content.component.ts' = @(
    'POST /api/campaign/{}/locationinstances/{}/image','POST /api/campaign/{}/sublocationinstances/{}/image',
    'POST /api/campaign/{}/castinstances/{}/image','POST /api/campaign/{}/factioninstances/{}/image'
  )
  'shared\components\right-drawer\location-detail-content.component.ts' = @(
    'PATCH /api/campaigns/{}/locations/{}',
    'POST /api/campaign/{}/locationinstances/{}/image','POST /api/campaign/{}/sublocationinstances/{}/image',
    'POST /api/campaign/{}/castinstances/{}/image','POST /api/campaign/{}/factioninstances/{}/image'
  )
}

# ---- Collect per-file call paths with the verb used (ANY = a base string, verb unknown) ----
function Add-Path($map, $path, $verb) {
  if (-not $map.ContainsKey($path)) { $map[$path] = New-Object 'System.Collections.Generic.HashSet[string]' }
  [void]$map[$path].Add($verb)
}

$feApi   = @{}   # file -> hashtable(path -> set of verbs)  (static literals)
$feDyn   = @{}   # file -> hashtable(path -> set of verbs)  (dynamic builders)
$verbRx  = [regex]'\.(get|post|put|patch|delete)\s*(?:<[^;()]*?>)?\s*\(\s*$'

foreach ($f in $feFiles) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  $map = @{}
  $literals = @()
  foreach ($m in [regex]::Matches($text, '`([^`]*)`')) { $literals += ,@($m.Groups[1].Value, $m.Index) }
  foreach ($m in [regex]::Matches($text, "'((?:[^'\\]|\\.)*)'")) { $literals += ,@($m.Groups[1].Value, $m.Index) }
  foreach ($m in [regex]::Matches($text, '"((?:[^"\\]|\\.)*)"')) { $literals += ,@($m.Groups[1].Value, $m.Index) }

  foreach ($lit in $literals) {
    $content = $lit[0]; $idx = $lit[1]
    if ($content -notmatch '/api/') { continue }
    if ($content -match '\$\{suffix\}') { continue }   # builder base, resolved via $dynamic
    $verb = 'ANY'
    $preStart = [Math]::Max(0, $idx - 300)
    $pre = $text.Substring($preStart, $idx - $preStart)
    $vm = $verbRx.Match($pre)
    if ($vm.Success) { $verb = $vm.Groups[1].Value.ToUpper() }
    foreach ($api in [regex]::Matches($content, '/api/[^\s`''"]*')) { Add-Path $map (Normalize-Path $api.Value) $verb }
  }
  if ($map.Count -gt 0) { $feApi[$f.FullName] = $map }

  $rel = $f.FullName.Replace($appDir + '\', '')
  if ($dynamic.ContainsKey($rel)) {
    $dmap = @{}
    foreach ($entry in $dynamic[$rel]) {
      $sp = $entry.IndexOf(' ')
      Add-Path $dmap $entry.Substring($sp + 1) $entry.Substring(0, $sp).ToUpper()
    }
    $feDyn[$f.FullName] = $dmap
  }
}

# Merge static + dynamic per file. For files with a hand-verified dynamic table the loose
# 'ANY' entries (URL-builder base strings) are dropped so a verb is only claimed when known.
$merged = @{}
foreach ($file in $feApi.Keys) {
  $m = @{}
  foreach ($p in $feApi[$file].Keys) {
    $set = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($v in $feApi[$file][$p]) { if ($feDyn.ContainsKey($file) -and $v -eq 'ANY') { continue }; [void]$set.Add($v) }
    if ($set.Count -gt 0) { $m[$p] = $set }
  }
  $merged[$file] = $m
}
foreach ($file in $feDyn.Keys) {
  if (-not $merged.ContainsKey($file)) { $merged[$file] = @{} }
  foreach ($p in $feDyn[$file].Keys) {
    if (-not $merged[$file].ContainsKey($p)) { $merged[$file][$p] = New-Object 'System.Collections.Generic.HashSet[string]' }
    foreach ($v in $feDyn[$file][$p]) { [void]$merged[$file][$p].Add($v) }
  }
}

# ---- Import graph (to resolve service consumers) ----
$imports = @{}
foreach ($f in $feFiles) {
  if ($f.Extension -ne '.ts') { continue }
  $text = [System.IO.File]::ReadAllText($f.FullName)
  $list = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($m in [regex]::Matches($text, "from\s+'(\.[^']+)'")) {
    $spec = $m.Groups[1].Value
    $dir = Split-Path $f.FullName -Parent
    $cand = [System.IO.Path]::GetFullPath((Join-Path $dir $spec))
    foreach ($ext in @('.ts','.html')) { if (Test-Path -LiteralPath ($cand + $ext)) { [void]$list.Add($cand + $ext); break } }
    if (Test-Path -LiteralPath (Join-Path $cand 'index.ts')) { [void]$list.Add((Join-Path $cand 'index.ts')) }
  }
  $imports[$f.FullName] = $list
}
$rev = @{}
foreach ($k in $imports.Keys) {
  foreach ($imp in $imports[$k]) {
    if (-not $rev.ContainsKey($imp)) { $rev[$imp] = New-Object 'System.Collections.Generic.HashSet[string]' }
    [void]$rev[$imp].Add($k)
  }
}
function Describe-File($full) {
  $t = [System.IO.File]::ReadAllText($full)
  $sel = [regex]::Match($t, 'selector:\s*''([^'']+)''')
  $cls = [regex]::Match($t, 'export\s+class\s+(\w+)')
  $s = ''
  if ($sel.Success) { $s += '<' + $sel.Groups[1].Value + '>' }
  if ($cls.Success) { if ($s) { $s += ' ' }; $s += 'class ' + $cls.Groups[1].Value }
  if (-not $s) { $s = '(no selector)' }
  return $s
}
function Get-Consumers($full) {
  if (-not $rev.ContainsKey($full)) { return @() }
  $res = @()
  foreach ($c in ($rev[$full] | Sort-Object)) { $res += "'$($c.Replace($appDir + '\', ''))' ($(Describe-File $c))" }
  return $res
}


# ---- Parse non-v2 controllers ----
$endpointRows = New-Object System.Collections.Generic.List[object]
$files = Get-ChildItem -Path $ctrlDir -File -Filter *.cs | Where-Object { $_.Name -notlike 'v2*' } | Sort-Object Name
foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  $base = ''
  $mb = [regex]::Match($text, '\[Route\("([^"]*)"\)\]')
  if ($mb.Success) {
    $base = $mb.Groups[1].Value
    if ($base -match '^api/\[controller\]$') { $base = 'api/' + (($f.BaseName -replace 'Controller$','').ToLower()) }
  }
  $rx = [regex]'\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?\]'
  foreach ($mm in $rx.Matches($text)) {
    $verb = $mm.Groups[1].Value.ToUpper()
    $sub  = $mm.Groups[2].Value
    $tail = $text.Substring($mm.Index + $mm.Length, [Math]::Min(600, $text.Length - ($mm.Index + $mm.Length)))
    $nm = [regex]::Match($tail, 'public\s+(?:async\s+)?[^\n(]*?([A-Za-z_]\w*)\s*\(')
    $mname = if ($nm.Success) { $nm.Groups[1].Value } else { '??' }
    $full = $base.TrimEnd('/')
    if ($sub) {
      if ($sub.StartsWith('/')) { $full = $sub }                 # absolute action route
      else { $full = ($full + '/' + $sub.TrimStart('/')) }
    }
    $full = $full.TrimEnd('/')
    if (-not $full.StartsWith('/')) { $full = '/' + $full }
    $endpointRows.Add([pscustomobject]@{ File=$f.Name; Verb=$verb; Route=$full; Method=$mname; Norm=(Normalize-Path $full) })
  }
}

# ---- Area label from a frontend file path ----
function Get-Area($rel) {
  if ($rel -like 'features\admin\*')       { return 'Admin' }
  if ($rel -like 'features\campaign\*')    { return 'Journal - campaign library / creator' }
  if ($rel -like 'features\player\*')      { return 'Journal - player campaigns' }
  if ($rel -like 'features\cast\*')        { return 'Journal - cast library / form' }
  if ($rel -like 'features\location\*')    { return 'Journal - location library / form' }
  if ($rel -like 'features\faction\*')     { return 'Journal - faction library / form' }
  if ($rel -like 'features\sublocations\*'){ return 'Journal - sublocation library / form' }
  if ($rel -like 'features\dashboard\*')   { return 'Journal - dashboard' }
  if ($rel -like 'features\bug-report\*')  { return 'Journal - bug report' }
  if ($rel -like 'features\*')             { return ('Journal - ' + ($rel -split '\\')[1]) }
  if ($rel -like 'layout\v2-campaign-shell\*')              { return 'v2 campaign shell' }
  if ($rel -like 'shared\components\v2\CardNavigation\*')   { return 'v2 - card navigation' }
  if ($rel -like 'shared\components\v2\FactionNavigation\*'){ return 'v2 - faction navigation' }
  if ($rel -like 'shared\components\v2\TheParty\*')         { return 'v2 - the party' }
  if ($rel -like 'shared\components\v2\Encounters\*')       { return 'v2 - encounters' }
  if ($rel -like 'shared\components\v2\Storyline\*')        { return 'v2 - storyline' }
  if ($rel -like 'shared\components\v2\Soundtracks\*')      { return 'v2 - soundtracks' }
  if ($rel -like 'shared\components\v2\Quicknotes\*')       { return 'v2 - quicknotes' }
  if ($rel -like 'shared\components\v2\Rules\*')            { return 'v2 - rules' }
  if ($rel -like 'shared\components\v2\Conditions\*')       { return 'v2 - conditions' }
  if ($rel -like 'shared\components\v2\Inventory\*')        { return 'v2 - inventory' }
  if ($rel -like 'shared\components\v2\WorldView\*')        { return 'v2 - world view' }
  if ($rel -like 'shared\components\v2\Shell\*')            { return 'v2 - shell' }
  if ($rel -like 'shared\components\v2\Diagnostics\*')      { return 'v2 - diagnostics' }
  if ($rel -like 'shared\components\v2\Shared\*')           { return 'v2 - shared' }
  if ($rel -like 'shared\components\v2\*')                  { return 'v2 components' }
  if ($rel -like 'shared\components\right-drawer\*')        { return 'Root drawer' }
  if ($rel -like 'shared\components\*')                     { return 'Shared components' }
  if ($rel -like 'shared\services\*')                       { return 'Shared services' }
  if ($rel -like 'core\*')                                  { return 'Core services' }
  return 'Other'
}

$removed = @(
  'AuditController.cs','CampaignPlayerNotesController.cs','CampaignTrophiesController.cs',
  'CastPlayerNotesController.cs','CastRelationshipsController.cs','LocationPlayerNotesController.cs',
  'ScheduledWorkflowsController.cs','SignalRTestController.cs','SublocationPlayerNotesController.cs'
)

# ---- Match + build markdown ----
$md = New-Object System.Collections.Generic.List[string]
$md.Add('# v1 (non-v2) API endpoints remaining, and the frontend areas that call them')
$md.Add('')
$md.Add('A call is matched by HTTP verb + path; `_(none)_` means no frontend reference was found in `src/app`.')
$md.Add('Callers are tagged with the frontend **area** they belong to.')
$md.Add('')
$md.Add('## Controllers removed (had no frontend reference at all)')
$md.Add('')
foreach ($r in $removed) { $md.Add("- ``backend/CastLibrary.WebHost/Controllers/$r``") }
$md.Add('')
$md.Add('---')
$md.Add('')

$areaIndex = @{}
$current = ''
$noRef = 0
foreach ($row in ($endpointRows | Sort-Object File, Route)) {
  if ($row.File -ne $current) {
    if ($current -ne '') { $md.Add('') }
    $current = $row.File
    $md.Add("## $current")
    $md.Add('')
    $md.Add('| Verb | Route | Frontend caller (area) |')
    $md.Add('| --- | --- | --- |')
  }
  $hits = @()
  foreach ($k in $merged.Keys) {
    if ($merged[$k].ContainsKey($row.Norm)) {
      $v = $merged[$k][$row.Norm]
      if ($v.Contains($row.Verb) -or $v.Contains('ANY')) { $hits += $k }
    }
  }
  $hits = $hits | Sort-Object
  if ($hits.Count -eq 0) {
    $noRef++
    $md.Add("| $($row.Verb) | ``$($row.Route)`` | _(none)_ |")
  } else {
    $cells = @()
    foreach ($h in $hits) {
      $rel = $h.Replace($appDir + '\', '')
      $area = Get-Area $rel
      $isDyn = $feDyn.ContainsKey($h) -and $feDyn[$h].ContainsKey($row.Norm)
      $cell = "[$area] '$rel' - $(Describe-File $h)"
      if ($rel -like '*service.ts') {
        $cons = Get-Consumers $h
        if ($cons.Count -gt 0) {
          if ($cons.Count -gt 6) { $cons = $cons[0..4] + ("... (+" + ($cons.Count - 5) + " more)") }
          $cell += '<br>used by: ' + ($cons -join '; ')
        }
      }
      if ($isDyn) { $cell += ' *(URL built dynamically)*' }
      $cells += $cell
      if (-not $areaIndex.ContainsKey($area)) { $areaIndex[$area] = New-Object System.Collections.Generic.List[string] }
      $areaIndex[$area].Add("$($row.Verb) ``$($row.Route)``")
    }
    $md.Add("| $($row.Verb) | ``$($row.Route)`` | $($cells -join '<br>') |")
  }
}

$md.Add('')
$md.Add('---')
$md.Add('')
$md.Add('## By frontend area')
$md.Add('')
foreach ($area in ($areaIndex.Keys | Sort-Object)) {
  $md.Add("### $area")
  $md.Add('')
  foreach ($ep in ($areaIndex[$area] | Sort-Object -Unique)) { $md.Add("- $ep") }
  $md.Add('')
}

$md.Add('---')
$md.Add('')
$md.Add("**Totals:** $($endpointRows.Count) endpoints across $($files.Count) non-v2 controller files; **$noRef** with no frontend reference.")

$md | Out-File 'C:\Repository\CastingCards\Code\V1-API-Endpoints-and-Frontend-Usage.md' -Encoding utf8
Write-Host ("endpoints: " + $endpointRows.Count + " ; no-ref: " + $noRef)
Write-Host "written V1-API-Endpoints-and-Frontend-Usage.md"

