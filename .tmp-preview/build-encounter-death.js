/*
 * Builds public/encounter_death.svg:
 *   - the gravestone, with the RIP glyph subpaths dropped;
 *   - the goblin's own subpaths merged into the same path, so `fill-rule="evenodd"` knocks the
 *     figure clean out of the black stone exactly where the letters used to be;
 *   - the goblin centred on the stone's own x axis, standing on the foot line its first placement
 *     put it on (never lowered), and grown upward from there — it may climb into the top crack, so
 *     the fit is measured against the figure's real silhouette rather than its bounding box, and
 *     against the stone's outline (the crack is a hole inside it, so crossing it is harmless).
 * Prints the geometry it settled on.
 */
const fs = require('fs');

const dir = 'frontend/cast-library-ui/public/';
const stoneSvg = fs.readFileSync(dir + 'rip_gravestone_tombstone_halloween_graphic.svg', 'utf8');
const goblinSvg = fs.readFileSync(dir + 'goblin_creature_holding_jagged_sword.svg', 'utf8');

const dOf = svg => svg.match(/ d="([^"]+)"/)[1];
const stoneParts = dOf(stoneSvg).split(/(?=[Mm])/);
const goblinParts = dOf(goblinSvg).split(/(?=[Mm])/);

// [0] base mound, [1] stone body, [2] R, [3] I, [4] P, [5] top crack, [6] R counter, [7] P counter.
const RIP = new Set([2, 3, 4, 6, 7]);
const kept = stoneParts.filter((_, i) => !RIP.has(i));

/** The foot line the goblin stands on: its feet come down to just above the lower-right crack,
 *  whose top edge runs from y 195 (x 180) up to y 174 (x 200+). It grows upward from here. */
const FOOT_Y = 185;

/** The figure's width. Left null it takes the widest that fits at the current FOOT_Y; pinned to a
 *  number it holds that size across a positional nudge, so only the position moves. */
const WIDTH_PIN = 131.79;

// ── path helpers ─────────────────────────────────────────────────────────────
function flatten(d, steps = 20) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const pts = [];
  let i = 0, cmd = null, cur = [0, 0], start = [0, 0];
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    const t = toks[i];
    if (/^[A-Za-z]$/.test(t)) { cmd = t; i++; continue; }
    if (cmd === 'M') { cur = [num(), num()]; start = cur.slice(); pts.push(cur.slice()); }
    else if (cmd === 'L') { cur = [num(), num()]; pts.push(cur.slice()); }
    else if (cmd === 'C') {
      const p1 = [num(), num()], p2 = [num(), num()], p3 = [num(), num()];
      for (let s = 1; s <= steps; s++) {
        const u = s / steps, v = 1 - u;
        pts.push([
          v * v * v * cur[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
          v * v * v * cur[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
        ]);
      }
      cur = p3;
    } else { i++; }
  }
  return pts;
}

function bbox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** The stone's outer silhouette as a 1px grid — holes, cracks and all, filled back in. */
const GW = 283, GH = 285;
let stoneGrid;
/** The stone's raw even-odd fill, before the closing: what actually renders black. */
let stoneFill;

/**
 * Morphological closing, so a narrow slit in the stone is filled back in while the silhouette's
 * outer edge stays exactly where it is. The crack under the arch is an open channel to the outside;
 * without this the figure could not be allowed anywhere near it.
 */
const CLOSE_R = 5;

function diskOverlap(dx, dy, r) { return dx * dx + dy * dy <= r * r; }

function dilate(src, r) {
  const out = new Uint8Array(src.length);
  for (let iy = 0; iy < GH; iy++) {
    for (let ix = 0; ix < GW; ix++) {
      if (!src[iy * GW + ix]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = iy + dy;
        if (ny < 0 || ny >= GH) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (!diskOverlap(dx, dy, r)) continue;
          const nx = ix + dx;
          if (nx < 0 || nx >= GW) continue;
          out[ny * GW + nx] = 1;
        }
      }
    }
  }
  return out;
}

function erode(src, r) {
  const out = new Uint8Array(src.length).fill(1);
  for (let iy = 0; iy < GH; iy++) {
    for (let ix = 0; ix < GW; ix++) {
      if (src[iy * GW + ix]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = iy + dy;
        if (ny < 0 || ny >= GH) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (!diskOverlap(dx, dy, r)) continue;
          const nx = ix + dx;
          if (nx < 0 || nx >= GW) continue;
          out[ny * GW + nx] = 0;
        }
      }
    }
  }
  return out;
}

/** Fills the stone's narrow slit and any island it encloses, then floods the outside of that. */
function buildSilhouette(poly) {
  const inStone = new Uint8Array(GW * GH);
  for (let iy = 0; iy < GH; iy++) {
    for (let ix = 0; ix < GW; ix++) {
      if (evenOdd(ix, iy, poly)) inStone[iy * GW + ix] = 1;
    }
  }

  const shape = erode(dilate(inStone, CLOSE_R), CLOSE_R);
  stoneFill = inStone;

  const outside = new Uint8Array(GW * GH);
  const stack = [];
  for (let ix = 0; ix < GW; ix++) stack.push(ix, 0, ix, GH - 1);
  for (let iy = 0; iy < GH; iy++) stack.push(0, iy, GW - 1, iy);
  while (stack.length) {
    const iy = stack.pop(), ix = stack.pop();
    if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) continue;
    const k = iy * GW + ix;
    if (outside[k] || shape[k]) continue;
    outside[k] = 1;
    stack.push(ix + 1, iy, ix - 1, iy, ix, iy + 1, ix, iy - 1);
  }

  const flat = new Uint8Array(GW * GH);
  for (let k = 0; k < flat.length; k++) flat[k] = shape[k] || !outside[k] ? 1 : 0;
  return flat;
}

/** Even-odd point test against a polygon. */
function evenOdd(x, y, poly) {
  let hit = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xi, yi] = poly[a], [xj, yj] = poly[b];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Is the point inside the stone's outer silhouette? (the grid above; `_poly` is unused) */
function inside(x, y, _poly) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) return false;
  return stoneGrid[iy * GW + ix] === 1;
}

// ── geometry ─────────────────────────────────────────────────────────────────
const stonePoly = flatten(kept[1], 6);
stoneGrid = buildSilhouette(stonePoly);
const stoneBox = bbox(stonePoly);
const cx = (stoneBox.minX + stoneBox.maxX) / 2;

const gobAll = goblinParts.flatMap(p => flatten(p, 6));
const gobBox = bbox(gobAll);
const gobW = gobBox.maxX - gobBox.minX;
const gobH = gobBox.maxY - gobBox.minY;
const gobMidX = (gobBox.minX + gobBox.maxX) / 2;

// A thin skin kept inside the stone's edge, sampled as offsets so it works on any outline.
const MARGIN = 2;
const gobSkin = gobAll.filter((_, i) => i % 2 === 0);

/** The hair line the crack's own edges are drawn with where it crosses the figure. */
const CRACK_LINE = 0.8;

/** The figure's own tone. White glared against the stone; this mid grey reads as carved stone. */
const FIGURE_FILL = '#b0b0b0';

/*
 * The stone's own crack runs out at (144, 68) under the arch — above the figure's crown at this foot
 * line, so on its own it would only nick the head. These carry it on from that tip, along the same
 * ~45° it was already falling, so it still runs clean through the head. Drawn as the crack's own
 * outline: a sliver pointed at both ends, bowing to CRACK_OPEN wide across its middle.
 */
const CRACK_TIP = [144, 68];
const CRACK_RUN = [19, 16];
const CRACK_OPEN = 3;

function crackExtension() {
  const [tx, ty] = CRACK_TIP;
  const [dx, dy] = CRACK_RUN;
  const len = Math.hypot(dx, dy);
  const px = -dy / len, py = dx / len;      // perpendicular to the run
  const ex = tx + dx, ey = ty + dy;
  const mx = (tx + ex) / 2, my = (ty + ey) / 2;
  // A quadratic only reaches half way to its control point, so the bow is the width we want.
  const bow = CRACK_OPEN;
  return `M ${tx},${ty} `
    + `Q ${(mx + px * bow).toFixed(2)},${(my + py * bow).toFixed(2)} ${ex},${ey} `
    + `Q ${(mx - px * bow).toFixed(2)},${(my - py * bow).toFixed(2)} ${tx},${ty} Z`;
}

/** Does the figure, drawn `w` wide and standing on FOOT_Y, sit wholly inside the stone silhouette? */
function fits(w) {
  const s = w / gobW;
  const left = cx - w / 2;
  const top = FOOT_Y - gobH * s;
  for (const [gx, gy] of gobSkin) {
    const x = left + (gx - gobBox.minX) * s;
    const y = top + (gy - gobBox.minY) * s;
    if (!inside(x, y, stonePoly)) return false;
    if (!inside(x - MARGIN, y, stonePoly) || !inside(x + MARGIN, y, stonePoly)) return false;
    if (!inside(x, y - MARGIN, stonePoly) || !inside(x, y + MARGIN, stonePoly)) return false;
  }
  return true;
}

// Optional probe: `node build-encounter-death.js crack[:y0:y1:x0:x1]` profiles a crack region.
if (process.argv[2]?.startsWith('crack')) {
  const a = process.argv[2].split(':').slice(1).map(Number);
  const [y0, y1, x0, x1] = a.length === 4 ? a : [150, 225, 168, 232];
  for (let x = x0; x <= x1; x += 2) {
    const runs = [];
    let start = null;
    for (let y = y0; y <= y1; y++) {
      const k = y * GW + x;
      const isCrack = stoneGrid[k] && !stoneFill[k];
      if (isCrack && start === null) start = y;
      if (!isCrack && start !== null) { runs.push(`${start}..${y - 1}`); start = null; }
    }
    if (start !== null) runs.push(`${start}..${y1}`);
    console.log(`x=${String(x).padStart(3)}  crack y: ${runs.join('  ') || '-'}`);
  }
  process.exit(0);
}

if (process.argv[2] === 'holes') {
  const seen = new Uint8Array(GW * GH);
  const comps = [];
  for (let start = 0; start < stoneGrid.length; start++) {
    if (seen[start] || !stoneGrid[start] || stoneFill[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let n = 0, minX = GW, minY = GH, maxX = -1, maxY = -1;
    while (stack.length) {
      const k = stack.pop();
      const ix = k % GW, iy = (k - ix) / GW;
      n++;
      if (ix < minX) minX = ix;
      if (ix > maxX) maxX = ix;
      if (iy < minY) minY = iy;
      if (iy > maxY) maxY = iy;
      for (const [nx, ny] of [[ix + 1, iy], [ix - 1, iy], [ix, iy + 1], [ix, iy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const nk = ny * GW + nx;
        if (seen[nk] || !stoneGrid[nk] || stoneFill[nk]) continue;
        seen[nk] = 1;
        stack.push(nk);
      }
    }
    comps.push({ n, minX, minY, maxX, maxY });
  }
  comps.sort((a, b) => b.n - a.n);
  console.log(`crack / hole regions inside the silhouette: ${comps.length}`);
  for (const c of comps) {
    console.log(`  area ${String(c.n).padStart(5)}   x ${c.minX}..${c.maxX}   y ${c.minY}..${c.maxY}`);
  }
  process.exit(0);
}

if (process.argv[2]?.startsWith('col:')) {
  const x = Number(process.argv[2].slice(4));
  const runs = [];
  let start = null;
  for (let y = 0; y <= 284; y += 0.5) {
    const inS = inside(x, y, stonePoly);
    if (inS && start === null) start = y;
    if (!inS && start !== null) { runs.push([start, y - 0.5]); start = null; }
  }
  if (start !== null) runs.push([start, 284]);
  console.log(`x=${x}  inside runs: ${runs.map(r => `${r[0]}..${r[1]}`).join('  ') || '(none)'}`);
  process.exit(0);
}

if (process.argv[2]) {
  const w = Number(process.argv[2]);
  const s = w / gobW;
  const left = cx - w / 2;
  const top = FOOT_Y - gobH * s;
  let firstFail = null, fails = 0;
  for (const [gx, gy] of gobSkin) {
    const x = left + (gx - gobBox.minX) * s;
    const y = top + (gy - gobBox.minY) * s;
    const ok = inside(x, y, stonePoly)
      && inside(x - MARGIN, y, stonePoly) && inside(x + MARGIN, y, stonePoly)
      && inside(x, y - MARGIN, stonePoly) && inside(x, y + MARGIN, stonePoly);
    if (!ok) { fails++; if (!firstFail) firstFail = { x, y, gx, gy }; }
  }
  console.log(`probe w=${w}  s=${s.toFixed(5)}  span x ${left.toFixed(1)}..${(left + w).toFixed(1)}  y ${top.toFixed(1)}..${FOOT_Y.toFixed(1)}`);
  console.log(fails
    ? `  ${fails}/${gobSkin.length} points outside; first at (${firstFail.x.toFixed(1)}, ${firstFail.y.toFixed(1)}) <- artwork (${firstFail.gx.toFixed(1)}, ${firstFail.gy.toFixed(1)})`
    : '  all inside');
  process.exit(0);
}

// Widest it can stand at that foot line — binary search, then trim a hair so it never kisses the edge.
let lo = 20, hi = 400;
for (let i = 0; i < 40; i++) {
  const mid = (lo + hi) / 2;
  if (fits(mid)) lo = mid; else hi = mid;
}
const widest = lo - 0.5;
const width = WIDTH_PIN ?? widest;
console.log(`widest at foot y ${FOOT_Y}: ${widest.toFixed(2)}` + (WIDTH_PIN ? `  (held at ${width.toFixed(2)})` : ''));
if (!fits(width)) console.log(`WARNING: ${width.toFixed(2)} wide does not fit at foot y ${FOOT_Y}`);

const scale = width / gobW;
const height = gobH * scale;
const tx = cx - scale * gobMidX;
const ty = FOOT_Y - scale * gobBox.maxY;

console.log(`stone box      x ${stoneBox.minX.toFixed(1)}..${stoneBox.maxX.toFixed(1)}  y ${stoneBox.minY.toFixed(1)}..${stoneBox.maxY.toFixed(1)}  (x axis ${cx.toFixed(2)})`);
console.log(`foot line      y ${FOOT_Y}`);
console.log(`goblin         ${width.toFixed(2)} x ${height.toFixed(2)}`);
console.log(`goblin spans   x ${(cx - width / 2).toFixed(1)}..${(cx + width / 2).toFixed(1)}  y ${(FOOT_Y - height).toFixed(1)}..${FOOT_Y.toFixed(1)}`);
console.log(`transform      translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(6)})`);

// ── rewrite a path's absolute coordinates through scale + translate ──────────
function transformPath(d, tx, ty, s) {
  const toks = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const bad = toks.filter(t => /^[A-Za-z]$/.test(t) && !'MLCZ'.includes(t));
  if (bad.length) throw new Error('unsupported path command(s): ' + [...new Set(bad)].join(' '));

  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/^[A-Za-z]$/.test(t)) { out.push(t); continue; }
    const x = parseFloat(toks[i]);
    const y = parseFloat(toks[++i]);
    out.push(`${(tx + s * x).toFixed(3)},${(ty + s * y).toFixed(3)}`);
  }
  return out.join(' ');
}

const goblinPlaced = goblinParts.map(p => transformPath(p, tx, ty, scale)).join(' ');
const stoneBody = kept[1].trim();
console.log(`stone body ends with: ${JSON.stringify(stoneBody.slice(-12))}`);

/*
 * Three layers, rather than the single merged path this began as.
 *
 * Merging the figure into the stone's own path knocked it out of the black cleanly — but even-odd
 * parity then turned the crack solid black wherever it crossed the figure. Laying the figure over the
 * stone in its own tone keeps its fill out of the parity sum, and stroking the stone's own outline
 * through a clip of the figure leaves just a hair line where the crack runs across it.
 */
const out =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 282 284" width="282" height="284" fill="none">\n` +
  `  <title>Encounter death</title>\n` +
  `  <defs>\n` +
  `    <clipPath id="encounter-death-figure"><path d="${goblinPlaced}" clip-rule="evenodd" /></clipPath>\n` +
  `  </defs>\n` +
  `\n` +
  `  <!-- The gravestone, its cracks cut clean through it. -->\n` +
  `  <path d="${kept.join(' ').trim()}" fill="#000000" fill-rule="evenodd" />\n` +
  `\n` +
  `  <!-- The figure laid on the stone: its own tone, its cut-outs letting the stone show through. -->\n` +
  `  <path d="${goblinPlaced}" fill="${FIGURE_FILL}" fill-rule="evenodd" />\n` +
  `\n` +
  `  <!-- The crack's own edges, a hair line, kept to where it crosses the figure. -->\n` +
  `  <path d="${stoneBody} ${crackExtension()}" fill="none" stroke="#000000" stroke-width="${CRACK_LINE}" ` +
  `clip-path="url(#encounter-death-figure)" />\n` +
  `</svg>\n`;

fs.writeFileSync(dir + 'encounter_death.svg', out);
console.log('\nwrote ' + dir + 'encounter_death.svg  (' + out.length + ' bytes)');
