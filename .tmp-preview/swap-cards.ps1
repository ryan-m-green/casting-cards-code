$root = 'C:\Repository\CastingCards\Code\frontend\cast-library-ui\src\app'

# each: ts file, old class, new class, old import path, new import path, old selector, new selector
$map = @(
  @{ ts='features\cast\cast-library\cast-library.component.ts';       html='features\cast\cast-library\cast-library.component.html';       cls='CastCardComponent';        ncls='CcCastCardComponent';        oimp='../../../shared/components/cast-card/cast-card.component';                 nimp='../../../shared/components/v2/carddeck/cc-cast-card/cc-cast-card.component';                 osel='app-cast-card';        nsel='cc-cast-card' },
  @{ ts='features\cast\cast-form\cast-form.component.ts';             html='features\cast\cast-form\cast-form.component.html';             cls='CastCardComponent';        ncls='CcCastCardComponent';        oimp='../../../shared/components/cast-card/cast-card.component';                 nimp='../../../shared/components/v2/carddeck/cc-cast-card/cc-cast-card.component';                 osel='app-cast-card';        nsel='cc-cast-card' },
  @{ ts='features\location\location-library\location-library.component.ts'; html='features\location\location-library\location-library.component.html'; cls='LocationCardComponent'; ncls='CcLocationCardComponent'; oimp='../../../shared/components/location-card/location-card.component';     nimp='../../../shared/components/v2/carddeck/cc-location-card/cc-location-card.component';     osel='app-location-card';    nsel='cc-location-card' },
  @{ ts='features\location\location-form\location-form.component.ts'; html='features\location\location-form\location-form.component.html'; cls='LocationCardComponent';    ncls='CcLocationCardComponent';    oimp='../../../shared/components/location-card/location-card.component';     nimp='../../../shared/components/v2/carddeck/cc-location-card/cc-location-card.component';     osel='app-location-card';    nsel='cc-location-card' },
  @{ ts='features\sublocations\sublocation-library\sublocation-library.component.ts'; html='features\sublocations\sublocation-library\sublocation-library.component.html'; cls='SublocationCardComponent'; ncls='CcSublocationCardComponent'; oimp='../../../shared/components/sublocation-card/sublocation-card.component'; nimp='../../../shared/components/v2/carddeck/cc-sublocation-card/cc-sublocation-card.component'; osel='app-sublocation-card'; nsel='cc-sublocation-card' },
  @{ ts='features\sublocations\sublocation-form\sublocation-form.component.ts'; html='features\sublocations\sublocation-form\sublocation-form.component.html'; cls='SublocationCardComponent'; ncls='CcSublocationCardComponent'; oimp='../../../shared/components/sublocation-card/sublocation-card.component'; nimp='../../../shared/components/v2/carddeck/cc-sublocation-card/cc-sublocation-card.component'; osel='app-sublocation-card'; nsel='cc-sublocation-card' },
  @{ ts='features\faction\faction-library\faction-library.component.ts'; html='features\faction\faction-library\faction-library.component.html'; cls='FactionCardComponent';  ncls='CcFactionCardComponent';  oimp='../../../shared/components/faction-card/faction-card.component';       nimp='../../../shared/components/v2/carddeck/cc-faction-card/cc-faction-card.component';       osel='app-faction-card';     nsel='cc-faction-card' },
  @{ ts='features\faction\faction-form\faction-form.component.ts';   html='features\faction\faction-form\faction-form.component.html';     cls='FactionCardComponent';    ncls='CcFactionCardComponent';    oimp='../../../shared/components/faction-card/faction-card.component';       nimp='../../../shared/components/v2/carddeck/cc-faction-card/cc-faction-card.component';       osel='app-faction-card';     nsel='cc-faction-card' },
  @{ ts='features\campaign\time-of-day-editor\time-of-day-editor.component.ts'; html='features\campaign\time-of-day-editor\time-of-day-editor.component.html'; cls='TimeOfDayBarComponent'; ncls='CcDayCounterComponent'; oimp='../../../shared/components/time-of-day-bar/time-of-day-bar.component'; nimp='../../../shared/components/v2/WorldView/cc-day-counter/cc-day-counter.component'; osel='app-time-of-day-bar'; nsel='app-cc-day-counter' }
)

$enc = New-Object System.Text.UTF8Encoding($true)
foreach ($m in $map) {
  # --- .ts ---
  $tsPath = Join-Path $root ($m.ts -replace '/', '\')
  $t = [System.IO.File]::ReadAllText($tsPath)
  $t = [regex]::Replace($t, ",\s*" + [regex]::Escape($m.cls) + "(?=\s*(,|\]))", ", " + $m.ncls)
  $t = $t.Replace("import { $($m.cls) } from '$($m.oimp)';", "import { $($m.ncls) } from '$($m.nimp)';")
  [System.IO.File]::WriteAllText($tsPath, $t, $enc)
  Write-Host "ts   $($m.ts)"

  # --- .html ---
  $htmlPath = Join-Path $root ($m.html -replace '/', '\')
  $h = [System.IO.File]::ReadAllText($htmlPath)
  $h = $h.Replace($m.osel, $m.nsel)
  [System.IO.File]::WriteAllText($htmlPath, $h, $enc)
  Write-Host "html $($m.html)"
}
