// Accurate per-subpath bounding boxes for an SVG path (handles M/L/H/V/C/S/Q/T/A/Z, absolute and
// relative), so the cage's bars and interior can be measured before placing the goblin inside.
const fs = require('fs');

const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';

function parse(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const subs = [];
  let cur = null;         // current subpath: { pts: [] }
  let x = 0, y = 0, startX = 0, startY = 0;
  let cmd = null;
  let i = 0;

  const num = () => parseFloat(tokens[i++]);
  const add = (px, py) => { if (cur) cur.pts.push([px, py]); };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(t)) { cmd = t; i++; }
    if (cmd === 'Z' || cmd === 'z') { x = startX; y = startY; cmd = null; continue; }

    const rel = cmd === cmd.toLowerCase();
    const bx = rel ? x : 0, by = rel ? y : 0;

    switch (cmd.toUpperCase()) {
      case 'M': {
        x = num() + bx; y = num() + by; startX = x; startY = y;
        cur = { pts: [] }; subs.push(cur); add(x, y); cmd = rel ? 'l' : 'L'; break;
      }
      case 'L': { x = num() + bx; y = num() + by; add(x, y); break; }
      case 'H': { x = num() + bx; add(x, y); break; }
      case 'V': { y = num() + by; add(x, y); break; }
      case 'C': {
        const x1 = num() + bx, y1 = num() + by, x2 = num() + bx, y2 = num() + by;
        x = num() + bx; y = num() + by; add(x1, y1); add(x2, y2); add(x, y); break;
      }
      case 'S':
      case 'Q': {
        const x1 = num() + bx, y1 = num() + by;
        x = num() + bx; y = num() + by; add(x1, y1); add(x, y); break;
      }
      case 'T': { x = num() + bx; y = num() + by; add(x, y); break; }
      case 'A': {
        num(); num(); num(); num(); num();
        x = num() + bx; y = num() + by; add(x, y); break;
      }
      default: i++;
    }
  }
  return subs;
}

function bbox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of pts) {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

const file = process.argv[2];
const full = fs.existsSync(file) ? file : PUBLIC + file;
const svg = fs.readFileSync(full, 'utf8');
const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map(m => m[1]);
console.log(`=== ${file}  (${ds.length} path element(s))`);

ds.forEach((d, pi) => {
  const subs = parse(d);
  const all = bbox(subs.flatMap(s => s.pts));
  console.log(` path[${pi}] overall  x ${all.minX.toFixed(1)}..${all.maxX.toFixed(1)}  y ${all.minY.toFixed(1)}..${all.maxY.toFixed(1)}   (${all.w.toFixed(1)} x ${all.h.toFixed(1)})   sub-shapes: ${subs.length}`);
  subs.forEach((s, j) => {
    const b = bbox(s.pts);
    console.log(`   [${j}] x ${b.minX.toFixed(1)}..${b.maxX.toFixed(1)}  y ${b.minY.toFixed(1)}..${b.maxY.toFixed(1)}   (${b.w.toFixed(1)} x ${b.h.toFixed(1)})  pts ${s.pts.length}`);
  });
});
