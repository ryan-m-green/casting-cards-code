# Handoff — single-stroke "cracked compass" Motivation mark (scratch round 4)

Everything below is scratch/design work. **No production file has been touched.** The design lives in
`.tmp-preview/v4/` (generator `v4-gen.mjs`, preview board `board4.html`) and the only older draft is
`.tmp-preview/compass-cracked-motivation.svg` (never shipped either).

## 1. What the mark is for

A new fourth motive mark, "Motivation", to sit beside the three that already ship:

| trait | file | wired at |
| --- | --- | --- |
| GOAL | `dart_hitting_target_bullseye.svg` | `MOTIVE_MARKS` in `cc-motive-card.component.ts` (line 5) + `<img src="/dart_hitting_target_bullseye.svg">` in `cc-motivations-content.component.html` (line 17) |
| FLAW | `broken_shield_sword.svg` | line 6 / line 64 |
| FEAR | `person_falling_from_cliff.svg` | line 7 / line 108 |
| MOTIVATION | *does not exist yet* | would be a 4th entry |

Ship target when (and only when) the user asks:

```
frontend/cast-library-ui/public/compass_cracked_motivation.svg
```

Sibling files in `public/` use snake_case names and are loaded from `/` at runtime; the mark is drawn
black and recoloured in CSS, so the SVG must be black ink on transparent, no `currentColor` styling.
`cc-motive-card` / `motive-add-btn-icon` render the mark with `object-fit: contain`, so a 340-box
viewBox is fine next to the 128-box `dart_hitting_target_bullseye.svg`.

## 2. House style of the four marks (what to match)

* `viewBox` **340 340**, `width`/`height` 340, geometry fills the box with a small margin.
* `fill="none" stroke="#000000" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"`.
* `role="img"` + `aria-labelledby="motiveTitle motiveDesc"`, a `<title>` and a `<desc>`.
* Hand-commented: every path is followed by a box-drawing comment block explaining *why* the numbers
  are what they are (see the older draft for the tone: "chord 67.3 is what keeps the rim reading as
  broken when the mark is 24px").
* Must read at **24px** (the button and card size) — that is the acceptance test, not 340px.

## 3. Geometry model in `v4-gen.mjs`

Angles use the file's own convention: `0` = east, `90` = south, `180` = west, `270` = north.
Centre 170,170. One stroke width 14, so ink is ±7 around the centreline.

| element | numbers | note |
| --- | --- | --- |
| rim | `r = 130` (ink 123–137) | drawn as a `path` of arcs, split at 38° so every arc stays a **minor** arc |
| direction ticks | at 270/0/90/180, from `r = 123` in to `r = 100` | outer ink lands exactly on the rim's inner ink edge, so they read as ties/spokes of the rim, not as floating dashes |
| needle | `r = 62`, half-width 20, north half `fill="#000000"` | solid north half is the cue that separates a compass from a clock at 24px |
| ink box | 274 × 274 → 19.34px at 24 | rim ink 123–137 drives this; keeps the mark optically the same size as the siblings |

`arcChain(from, to)` emits `A r r 0 0 1` segments each ≤170°, interpolating intermediate points with
`pol()` so every arc endpoint is *computed on the r=130 circle*.


## 4. The variants on the board (row order in `board4.html`)

| row | file | rim breaks | read at 24px |
| --- | --- | --- | --- |
| `final` | `v4-final.svg` | **slip** — break 30° between sheared faces 203°→233° (faces lean 5°, `FACE_IN = 125`), plus hairline crack 294°/310° | fracture character, but the sheared ends still show tick-like stubs on the upper-left |
| `final2` | `v4-final2.svg` | both cuts **square/radial**: wide break 233°→212° (21°), hairline 294°→308° (14°) | added last: wide gap no longer looks like a missing slice, hairline still reads |
| `clean` | `v4-clean.svg` | both square: 233°→206° (27°), 294°→310° (16°) | cleanest, no stubs at all, but the wide gap starts to read as a pac-man "C" opening |
| `break only` | `v4-final-nocrack.svg` | slip break only, no hairline | control: shows how much of the damage story the hairline carries |
| `intact` | `v4-final-intact.svg` | full `<circle>` | control: verifies the dial alone still reads as a compass |

Earlier exploratory rasters still on disk (superseded): `v4a…v4g`, `v4j1…v4j4`, `v4m1…v4m6`,
`v4n1…v4n7` and the matching `zoom-n*.png` (tick/needle/break permutations from rounds 2–3).

## 5. How to rebuild and look (copy-paste)

```powershell
cd 'c:\Repository\CastingCards\Code\.tmp-preview\v4'
node .\v4-gen.mjs                      # rewrites all five variant SVGs, prints the ink measurements
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu `
  --hide-scrollbars --force-device-scale-factor=1 --window-size=1160,1900 `
  --virtual-time-budget=4000 `
  --screenshot='C:\Repository\CastingCards\Code\.tmp-preview\v4\board4.png' `
  'file:///C:/Repository/CastingCards/Code/.tmp-preview/v4/board4.html'
# nearest-neighbour crops for a true 24px read (row tops are ~63, ~343, ~623, ~903, ~1183):
.\..\ink-scan.ps1 -Path .\board4.png -Zoom1 '160,343,430,613' -ZoomOut1 zoom-f2-24.png -ZoomFactor 3
.\..\ink-scan.ps1 -Path .\board4.png -Zoom1 '900,343,1160,613' -ZoomOut1 zoom-f2-quad.png -ZoomFactor 1
```

`board4.html` shows, per variant: the 24px raster at 11×, then 48/72/96/192px, then the upper-left
quadrant at 2×; and at the bottom a button-dress row (`+ Goal`, `+ Flaw`, `+ Fear`, `+ Motivation`,
`+ Motivation (old)`) plus an 11× 24px row of the three shipped marks beside the candidate.

Caveat when comparing crops: `.zw` boxes are 264px tall and rows are 280px apart starting at ~63px,
so `zoom-clean24.png` (crop y 60–330) is **row 1 = `final`** and `zoom-shear24.png` (x 900+ of the
same row) is the 2× quadrant zoom of `final`; `zoom-f2-24.png` / `zoom-f2-quad.png` (y 360–630) are
row 2 = `final2`. Those two filenames were chosen before the rows were reordered — trust the crop
coordinates, not the names.

## 6. Where the decision stands

`final2` (21°/14° square cuts) was added as the middle ground between `final` (character, stubs) and
`clean` (no stubs, pac-man gap). **No winner has been chosen and nothing has been shipped.** The open
question is:

> at 24px, does the shear/stub of `v4-final`, the tighter square cuts of `v4-final2`, or the wide
> clean cuts of `v4-clean` read best as "a compass with a cracked rim"?

## 7. Ship checklist (only after the user says to land it)

1. Pick the winning rim function; fold it in as the single rim path (drop the other variant calls).
2. Re-derive every number quoted in the comments (chord, degrees of each cut, ink-to-ink whites, px at
   24) from the generator — never carry stale numbers into the shipped comments.
3. Validate: XML parses; ink box centred (274 × 274 for r=130, i.e. 33 units margin per side in the
   340 box); every arc endpoint on r=130; tick ink still meets the rim's inner edge; white between the
   break and the needle stays ≥ ~70 units.
4. Copy to `frontend/cast-library-ui/public/compass_cracked_motivation.svg`.
5. Wire it only if asked: add a `MOTIVATION` entry to `MOTIVE_MARKS` (`cc-motive-card.component.ts`)
   and a `motive-add-btn` row using `<img src="/compass_cracked_motivation.svg">` in
   `cc-motivations-content.component.html`.
6. Delete the `.tmp-preview/v4` scratch when done (the whole `.tmp-preview` tree is scratch).

### The bug that was fixed (do not regress it)

In rounds 2–3 the break's cut faces were built as straight lines whose far end was not on `r = 130`.
SVG then re-scales that arc (endpoint-radius correction) and the "arcs" bulged off the circle, which
is what made the whole rim look wrong. Fix: all arc endpoints come from `pol(RIM_R, angle)`; cut faces
are separate `L` segments that start/end on radii (`FACE_IN` → `RIM_R`).

### The 24px lesson (the main design lever)

A straight cut face whose outer end is *outside* the rim band leaves a small white notch with ink on
both sides — at 24px that reads as an extra tick/stub, not as damage. So:

* Cut faces must stay **inside the band**: `FACE_IN = 125` (band is 123–137), or
* the cut is **radial (square across the band)**, which 24px sees as nothing but a gap.

Measured gaps (helpers `white(a,b) = ink-to-ink distance − strokeWidth`, `px(u) = u*24/340`):

* sheared `v4-final`: break white **28.4 units = 2.0 px**, hairline crack **20.8 units = 1.47 px**
* `dial to rim:` every tick is **−7** (touching the rim by design); `break to needle: 74.7` — the
  break's upper outer end to the needle's left edge, so the gap never closes at 24px.
