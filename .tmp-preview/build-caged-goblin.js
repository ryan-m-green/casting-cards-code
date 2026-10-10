// Composes the cage and the goblin into one image: the goblin is drawn first and the cage over it,
// so the goblin reads as being inside the cage (only what shows through the openings is seen).
// Usage: node build-caged-goblin.js [cageInk] [goblinInk] [scale] [centerX] [bottomY] [outName]
const fs = require('fs');

const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

const CAGE_INK = process.argv[2] || '#555555';
const GOBLIN_INK = process.argv[3] || '#000000';
const SCALE = parseFloat(process.argv[4] || '0.56');
const CENTER_X = parseFloat(process.argv[5] || '134');
const BOTTOM_Y = parseFloat(process.argv[6] || '452');
const OUT_NAME = process.argv[7] || 'caged-goblin.svg';

function pathOf(file) {
  const svg = fs.readFileSync(PUBLIC + file, 'utf8');
  const d = svg.match(/\sd="([^"]+)"/)[1];
  return d;
}

// Bounding boxes measured with svg-bbox.js.
const GOBLIN = { x: 10.3, y: 11.8, w: 420.3, h: 375.0 };

const cageD = pathOf('cage_01.svg');
const goblinD = pathOf('goblin_creature.svg');

const scale = SCALE;
const gobW = GOBLIN.w * scale;
const gobH = GOBLIN.h * scale;
const tx = CENTER_X - gobW / 2 - GOBLIN.x * scale;
const ty = BOTTOM_Y - gobH - GOBLIN.y * scale;

const svg = `<svg width="269" height="487" viewBox="0 0 269 487" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- The goblin sits behind the cage, so it is seen through the bars. -->
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})">
    <path d="${goblinD}" fill="${GOBLIN_INK}" fill-rule="evenodd" />
  </g>
  <path d="${cageD}" fill="${CAGE_INK}" fill-rule="evenodd" />
</svg>
`;

fs.writeFileSync(SCRATCH + OUT_NAME, svg);

// The preview shows the same composition at several goblin scales so the fit can be judged.
const VARIANTS = (process.env.CCG_VARIANTS || '0.50,0.56,0.62,0.68')
  .split(',').map(v => parseFloat(v.trim())).filter(v => Number.isFinite(v));

const variantSvg = (sc) => {
  const w = GOBLIN.w * sc, h = GOBLIN.h * sc;
  const vtx = CENTER_X - w / 2 - GOBLIN.x * sc;
  const vty = BOTTOM_Y - h - GOBLIN.y * sc;
  return `<svg viewBox="0 0 269 487" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${vtx.toFixed(2)} ${vty.toFixed(2)}) scale(${sc})">
      <path d="${goblinD}" fill="${GOBLIN_INK}" fill-rule="evenodd" />
    </g>
    <path d="${cageD}" fill="${CAGE_INK}" fill-rule="evenodd" />
  </svg>`;
};

const preview = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 10px; background: #e8d4a7; font: 11px sans-serif; color: #5a451f; }
  .row { display: flex; gap: 18px; align-items: flex-start; }
  .cell { text-align: center; width: 190px; }
  .main svg { width: 190px; height: auto; display: block; }
  .stamp { margin-bottom: 8px; }
  .stamp svg { width: 30px; height: 54px; display: inline-block; }
</style></head><body>
  <div class="row">
    ${VARIANTS.map(sc => `<div class="cell">
      <div class="stamp"><svg width="30" height="54" viewBox="0 0 269 487" fill="none" xmlns="http://www.w3.org/2000/svg">${variantSvg(sc).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></div>
      <div class="main">${variantSvg(sc)}</div>
      <div>scale ${sc}</div>
    </div>`).join('')}
  </div>
</body></html>
`;

fs.writeFileSync(SCRATCH + 'caged-goblin-preview.html', preview);

console.log(`goblin ${gobW.toFixed(1)} x ${gobH.toFixed(1)} at x ${(CENTER_X - gobW / 2).toFixed(1)}..${(CENTER_X + gobW / 2).toFixed(1)}  y ${(BOTTOM_Y - gobH).toFixed(1)}..${BOTTOM_Y.toFixed(1)}`);
console.log(`transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})"`);
