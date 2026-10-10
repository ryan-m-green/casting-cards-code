# Scratch tool: measure the ink in a preview screenshot.
#
#   .\ink-scan.ps1 -Path <png> [-BrightnessCutoff 400] [-GapCols 20]
#                  [-Zoom1 "x0,y0,x1,y1"] [-Zoom2 "x0,y0,x1,y1"] [-ZoomFactor 10]
#
# Prints, per band of occupied rows, the column groups of bright (inked) pixels, so the optical
# size of a mark can be read off exactly instead of by eye. -Zoom crops a region of the source
# and blows it up with nearest-neighbour, i.e. the pixels as they were actually rasterised.
#
# The pixel work is C# compiled in-process (ink-scan.cs): a PowerShell loop over a megapixel
# screenshot takes minutes, this takes milliseconds.

param(
  [Parameter(Mandatory = $true)][string]$Path,
  [int]$BrightnessCutoff = 400,
  [int]$GapCols = 20,
  [string]$Zoom1,
  [string]$Zoom2,
  [string]$ZoomOut1 = 'ink-zoom-1.png',
  [string]$ZoomOut2 = 'ink-zoom-2.png',
  [int]$ZoomFactor = 10
)

Add-Type -AssemblyName System.Drawing
Add-Type -Path (Join-Path $PSScriptRoot 'ink-scan.cs') -ReferencedAssemblies System.Drawing

$full = (Resolve-Path $Path).Path
$dir = Split-Path -Parent $full
Write-Output ([InkScan]::Report($full, $BrightnessCutoff, $GapCols))

function Save-Zoom([string]$spec, [string]$out) {
  $p = $spec.Split(',') | ForEach-Object { [int]$_ }
  Write-Output ([InkScan]::Zoom($full, $p[0], $p[1], $p[2], $p[3], $ZoomFactor, (Join-Path $dir $out)))
}

if ($Zoom1) { Save-Zoom $Zoom1 $ZoomOut1 }
if ($Zoom2) { Save-Zoom $Zoom2 $ZoomOut2 }

