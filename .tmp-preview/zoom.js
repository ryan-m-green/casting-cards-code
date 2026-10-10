// Renders clean zoomed views of chosen regions of the deformed figure.
// Usage: node zoom.js "x y w h" "x y w h" ...
const fs = require('fs');
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

const boxes = process.argv.slice(2);
const svg = fs.readFileSync(SCRATCH + 'fleeing_goblin.svg', 'utf8');
const d = svg.match(/\sd="([^"]+)"/)[1];

const WIDTH = 520;
const panels = boxes.map(box => {
  const [x, y, w, h] = box.split(' ').map(Number);
  const px = WIDTH / w;
  return `<div class="cell">
    <div class="art" style="width:${WIDTH}px;height:${(h * px).toFixed(0)}px">
      <svg viewBox="${box}" fill="none"><path d="${d}" fill="#111" fill-rule="nonzero"/></svg>
    </div>
    <div>${box}</div>
  </div>`;
}).join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 10px; background: #fff; font: 11px sans-serif; color: #333; }
  .row { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .cell { text-align: center; }
  .art svg { width: 100%; height: 100%; display: block; }
</style></head><body><div class="row">${panels}</div></body></html>
`;

fs.writeFileSync(SCRATCH + 'zoom.html', html);
console.log(`panels: ${boxes.length}`);
