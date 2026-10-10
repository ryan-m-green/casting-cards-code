// Pulls the solid-black artwork out of goblin_model.svg and writes a comparison page, so the black
// design can be seen against the full colour model.
const fs = require('fs');

const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

const svg = fs.readFileSync(PUBLIC + 'goblin_model.svg', 'utf8');
const viewBox = svg.match(/viewBox="([^"]+)"/)[1];

const paths = [...svg.matchAll(/<path\b[^>]*?\/>/gs)].map(m => m[0]);
console.log(`paths found: ${paths.length}`);

const fillOf = p => (p.match(/fill:\s*(#[0-9A-Fa-f]{3,6})/) || [, null])[1];

const byFill = new Map();
paths.forEach(p => {
  const f = (fillOf(p) || '').toUpperCase();
  byFill.set(f, (byFill.get(f) || 0) + 1);
});
console.log([...byFill.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f}:${n}`).join('  '));

const BLACKS = ['#040403', '#000000', '#333333'];

const strip = (p, fill) => p
  .replace(/style="fill:[^";]*;?"/i, `fill="${fill}"`)
  .replace(/\s+/g, ' ')
  .trim();

const pick = list => paths.filter(p => list.includes((fillOf(p) || '').toUpperCase()));

const setAll = paths.map(p => strip(p, fillOf(p) || '#000'));
const setBlack = pick(['#040403']).map(p => strip(p, '#000'));
const setBlackPlus = pick(['#040403', '#333333']).map(p => strip(p, '#000'));

const panel = (label, list, colour) => `<div class="cell">
  <div class="art"><svg viewBox="${viewBox}" style="background:${colour}">
    <g>${list.join('')}</g>
  </svg></div>
  <div>${label} (${list.length} paths)</div>
</div>`;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 10px; background: #fff; font: 11px sans-serif; color: #333; }
  .row { display: flex; gap: 14px; align-items: flex-start; }
  .cell { text-align: center; width: 660px; }
  .art svg { width: 660px; height: auto; display: block; border: 1px solid #ddd; }
</style></head><body>
  <div class="row">
    ${panel('full colour', setAll, '#fff')}
  </div>
  <div class="row" style="margin-top:12px">
    ${panel('black only #040403', setBlack, '#fff')}
    ${panel('#040403 + #333333', setBlackPlus, '#fff')}
  </div>
</body></html>
`;

fs.writeFileSync(SCRATCH + 'goblin-model-compare.html', html);
console.log('wrote goblin-model-compare.html');

// Also keep the black-only path data for the next step.
fs.writeFileSync(SCRATCH + 'goblin-model-black.txt', setBlack.join('\n'));
console.log(`black paths: ${setBlack.length}, ${setBlack.join('').length} chars`);
