// Builds a page that flips the black goblin, renders it to a canvas and reports its bounding box,
// plus the silhouette's left edge at a series of heights — the measurements the wind trails need.
const fs = require('fs');

const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';
const paths = fs.readFileSync(SCRATCH + 'goblin-model-black.txt', 'utf8').split('\n').filter(Boolean);

const ds = paths.map(p => (p.match(/\sd="([^"]+)"/) || [, ''])[1]);

const html = `<!doctype html>
<html><head><meta charset="utf-8"></head><body><pre id="out">measuring…</pre>
<script>
const DS = ${JSON.stringify(ds)};
const PAD = 8;

function buildSvg() {
  const body = DS.map(d => '<path d="' + d + '" fill="#000"/>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500" viewBox="0 0 662.9 334.161">' +
    '<g id="g">' + body + '</g></svg>';
}

const host = document.createElement('div');
host.style.cssText = 'position:absolute;left:-9999px;top:0';
host.innerHTML = buildSvg();
document.body.appendChild(host);

const svg = host.querySelector('svg');
const g = host.querySelector('#g');
const bb = g.getBBox();

// Flip about the bbox so the goblin faces right, and re-fit the canvas to the flipped art.
const flip = 'translate(' + (bb.x + bb.x + bb.width) + ',0) scale(-1,1)';
g.setAttribute('transform', flip);
svg.setAttribute('viewBox', (bb.x - PAD) + ' ' + (bb.y - PAD) + ' ' + (bb.width + 2 * PAD) + ' ' + (bb.height + 2 * PAD));
const W = Math.ceil(bb.width + 2 * PAD), H = Math.ceil(bb.height + 2 * PAD);
svg.setAttribute('width', W);
svg.setAttribute('height', H);

const svgText = new XMLSerializer().serializeToString(svg);
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);

  const rows = [];
  const steps = 40;
  for (let i = 1; i < steps; i++) {
    const yPix = Math.round((H - 1) * i / steps);
    const row = ctx.getImageData(0, yPix, W, 1).data;
    let first = -1;
    for (let x = 0; x < W; x++) {
      if (row[x * 4 + 3] > 40) { first = x; break; }
    }
    rows.push({
      y: +(bb.y - PAD + yPix).toFixed(2),
      left: first < 0 ? null : +(bb.x - PAD + first).toFixed(2),
    });
  }

  document.getElementById('out').textContent = JSON.stringify({
    bbox: { x: +bb.x.toFixed(2), y: +bb.y.toFixed(2), w: +bb.width.toFixed(2), h: +bb.height.toFixed(2) },
    viewBox: svg.getAttribute('viewBox'),
    rows,
  }, null, 1);
};
img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
</script></body></html>
`;

fs.writeFileSync(SCRATCH + 'measure.html', html);
console.log(`paths inlined: ${ds.length}`);
