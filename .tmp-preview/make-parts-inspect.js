// Writes an inspection page showing each sub-shape of the original and the deformed figure,
// each in its own fitted viewBox, so single parts can be read on their own.
const fs = require('fs');

const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';
const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';

const readD = f => fs.readFileSync(f, 'utf8').match(/\sd="([^"]+)"/)[1];
const srcD = readD(PUBLIC + 'running_man.svg');
const outD = readD(SCRATCH + 'running-goblin-body.svg');

const split = d => d.split(/(?=[Mm])/).filter(s => s.trim().length > 1);

function bboxOf(d) {
  const nums = [...d.matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/g)].map(m => parseFloat(m[0]));
  // crude, but both files use absolute commands with commas between pairs
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const pairs = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?,-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  pairs.forEach(p => {
    const [x, y] = p.split(',').map(Number);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

const cell = (label, d, scale) => {
  const b = bboxOf(d);
  const pad = 2;
  const vb = `${(b.minX - pad).toFixed(1)} ${(b.minY - pad).toFixed(1)} ${(b.w + 2 * pad).toFixed(1)} ${(b.h + 2 * pad).toFixed(1)}`;
  return `<div class="cell"><div class="art" style="height:${scale}px"><svg viewBox="${vb}" fill="none"><path d="${d}" fill="#000" fill-rule="nonzero"/></svg></div><div>${label}</div></div>`;
};

const srcParts = split(srcD);
const outParts = split(outD);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 12px; background: #e8d4a7; font: 11px sans-serif; color: #5a451f; }
  .row { display: flex; gap: 22px; align-items: flex-end; }
  .cell { text-align: center; }
  .art svg { height: 100%; width: auto; display: block; }
</style></head><body>
  <div class="row">
    ${cell('original whole', srcParts[0], 200)}
    ${cell('deformed whole', outParts[0], 200)}
    ${cell('original trailing leg', srcParts[1], 200)}
    ${cell('deformed trailing leg', outParts[1], 200)}
  </div>
</body></html>
`;

fs.writeFileSync(SCRATCH + 'parts-inspect.html', html);
console.log(`original sub-shapes: ${srcParts.length}, deformed: ${outParts.length}`);
