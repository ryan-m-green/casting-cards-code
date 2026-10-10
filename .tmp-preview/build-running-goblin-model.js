// Builds running_goblin.svg: the solid-black goblin from goblin_model.svg, flipped to face right,
// with four very thin wind trails whose bases sit on its back.
const fs = require('fs');

const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

const INK = '#000000';

// Measured from the browser: the black artwork's box, and its back (left) edge once flipped.
const BB = { x: 332.73, y: 9.88, w: 310.59, h: 314.42 };
const FLIP = BB.x + (BB.x + BB.w);          // mirrors the art about its own box

// Wind trails: y, the silhouette's back edge there, half-height, and length.
const TRAILS = [
  { y: 46, back: 435.7, half: 3.5, len: 75 },
  { y: 122, back: 357.0, half: 4.5, len: 95 },
  { y: 168, back: 340.0, half: 4.0, len: 60 },
  { y: 268, back: 353.0, half: 3.5, len: 85 },
];

const SOAK = 6;   // how far the base runs into the body, so the trail joins without a seam

const paths = fs.readFileSync(SCRATCH + 'goblin-model-black.txt', 'utf8').split('\n').filter(Boolean);

const trailPaths = TRAILS.map(t => {
  const baseX = t.back + SOAK;
  const tipX = baseX - t.len;
  return `<path d="M${tipX.toFixed(1)},${(t.y).toFixed(1)} L${baseX.toFixed(1)},${(t.y - t.half).toFixed(1)} L${baseX.toFixed(1)},${(t.y + t.half).toFixed(1)} Z" fill="${INK}" />`;
});

const leftMost = Math.min(...TRAILS.map(t => t.back + SOAK - t.len));
const x0 = leftMost - 8;
const y0 = BB.y - 8;
const x1 = BB.x + BB.w + 8;
const y1 = BB.y + BB.h + 8;
const vb = `${x0.toFixed(1)} ${y0.toFixed(1)} ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${(x1 - x0).toFixed(0)}" height="${(y1 - y0).toFixed(0)}" fill="none" role="img" aria-labelledby="running-goblin-title">
  <title id="running-goblin-title">Running goblin</title>
  <!-- The solid-black goblin from goblin_model.svg, mirrored so it runs to the right. -->
  <g transform="translate(${FLIP.toFixed(2)} 0) scale(-1 1)">
${paths.map(p => '    ' + p).join('\n')}
  </g>
  <!-- Wind trails: bases on its back, tapering away behind it. -->
${trailPaths.map(p => '  ' + p).join('\n')}
</svg>
`;

fs.writeFileSync(SCRATCH + 'running_goblin.svg', svg);
console.log(`viewBox="${vb}"  ${(x1 - x0).toFixed(0)} x ${(y1 - y0).toFixed(0)}`);
console.log(`trails base x: ${TRAILS.map(t => (t.back + SOAK).toFixed(0)).join(', ')}   tips: ${TRAILS.map(t => (t.back + SOAK - t.len).toFixed(0)).join(', ')}`);
console.log(`wrote running_goblin.svg (${svg.length} chars)`);

const preview = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 14px; background: #e8d4a7; font: 11px sans-serif; color: #5a451f; }
  .row { display: flex; gap: 26px; align-items: flex-end; }
  .cell { text-align: center; }
  .cell .art svg { height: 300px; width: auto; display: block; }
  .small svg { height: 52px; width: auto; display: block; }
</style></head><body>
  <div class="row">
    <div class="cell"><div class="art"><svg viewBox="${vb}">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></div><div>running_goblin</div></div>
    <div class="cell"><div class="art"><svg viewBox="${vb}">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></div><div>same</div></div>
    <div class="cell"><div class="small"><svg viewBox="${vb}">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></div><div>stamp size</div></div>
  </div>
</body></html>
`;
fs.writeFileSync(SCRATCH + 'running-goblin-preview.html', preview);
