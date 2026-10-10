// Renders the deformed fleeing goblin with every on-curve point marked and numbered, so the
// problem joints can be mapped back to path indices.
const fs = require('fs');
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const cmds = [];
  let i = 0, letter = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) { letter = t; i++; }
    if (letter === 'Z' || letter === 'z') { cmds.push({ cmd: 'Z', pts: [] }); letter = null; continue; }
    const n = () => parseFloat(tokens[i++]);
    if (letter === 'M') cmds.push({ cmd: 'M', pts: [[n(), n()]] });
    else if (letter === 'L') cmds.push({ cmd: 'L', pts: [[n(), n()]] });
    else if (letter === 'C') cmds.push({ cmd: 'C', pts: [[n(), n()], [n(), n()], [n(), n()]] });
    else throw new Error('unhandled ' + letter);
  }
  return cmds;
}

const svg = fs.readFileSync(SCRATCH + 'fleeing_goblin.svg', 'utf8');
const d = svg.match(/\sd="([^"]+)"/)[1];
const vb = svg.match(/viewBox="([^"]+)"/)[1];
const cmds = parsePath(d);

const groups = [];
cmds.forEach(c => { if (c.cmd === 'M') groups.push([]); groups[groups.length - 1].push(c); });

let dots = '';
groups.forEach((g, gi) => {
  let pi = -1;
  g.forEach(c => {
    if (c.cmd === 'Z') return;
    const idx = ++pi;
    const p = c.pts[c.pts.length - 1];
    dots += `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="1.1" fill="#c0392b"/>`
      + `<text x="${(p[0] + 1.6).toFixed(2)}" y="${(p[1] - 1.2).toFixed(2)}" font-size="3.1" fill="#c0392b">${gi}.${idx}</text>`;
  });
});

const PANELS = [
  { label: 'head + right arm + torso join', vb: '58 30 50 26' },
  { label: 'left arm (two segments)', vb: '42 34 42 26' },
  { label: 'right leg knee', vb: '74 58 34 42' },
  { label: 'left leg meets torso', vb: '54 52 34 40' },
];

const zoom = 22;

const panelsHtml = PANELS.map(p => `<div class="cell">
  <div class="art" style="width:${(Number(p.vb.split(' ')[2]) * zoom).toFixed(0)}px;height:${(Number(p.vb.split(' ')[3]) * zoom).toFixed(0)}px">
    <svg viewBox="${p.vb}" fill="none">
      <path d="${d}" fill="#111" fill-rule="nonzero"/>
      ${dots}
    </svg>
  </div>
  <div>${p.label}</div>
</div>`).join('');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 10px; background: #fff; font: 11px sans-serif; color: #333; }
  .row { display: flex; gap: 16px; align-items: flex-start; }
  .cell { text-align: center; }
  .art svg { width: 100%; height: 100%; display: block; }
</style></head><body>
  <div class="row">${panelsHtml}</div>
</body></html>
`;

fs.writeFileSync(SCRATCH + 'marked-points.html', html);

console.log('sub-shapes: ' + groups.length);
groups.forEach((g, gi) => {
  const pts = [];
  let pi = -1;
  g.forEach(c => { if (c.cmd !== 'Z') { ++pi; pts.push(`${gi}.${pi} = ${c.pts[c.pts.length - 1].map(v => v.toFixed(1)).join(',')}`); } });
  console.log('  ' + pts.join('   '));
});
