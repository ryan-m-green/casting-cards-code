// Splits hands_shackles_captivity.svg's path into subpaths and reports each one's shape.
const fs = require('fs');

const file = process.argv[2];
const svg = fs.readFileSync(file, 'utf8');

console.log('ROOT:', svg.match(/<svg[^>]*>/)[0]);
const counts = {};
for (const m of svg.matchAll(/<([a-zA-Z][\w:-]*)/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
console.log('ELEMENTS:', JSON.stringify(counts));

const attrs = svg.match(/<path([^>]*)>/)[1].replace(/ d="[^"]*"/, ' d="<<d>>"').trim();
console.log('PATH ATTRS:', attrs);

const d = svg.match(/ d="([^"]+)"/)[1];
const parts = d.split(/(?=[Mm])/);
console.log(`\nd length ${d.length}, subpaths ${parts.length}\n`);

parts.forEach((p, i) => {
  const nums = (p.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []).map(Number);
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  for (let k = 0; k + 1 < nums.length; k += 2) {
    mnx = Math.min(mnx, nums[k]); mxx = Math.max(mxx, nums[k]);
    mny = Math.min(mny, nums[k + 1]); mxy = Math.max(mxy, nums[k + 1]);
  }
  const cmds = (p.match(/[A-Za-z]/g) || []).join('');
  console.log(
    `[${String(i).padStart(2)}] pts=${String(nums.length / 2).padStart(4)} closed=${/Z/i.test(p)} ` +
    `x ${mnx.toFixed(1)}..${mxx.toFixed(1)} (w ${(mxx - mnx).toFixed(1)})  ` +
    `y ${mny.toFixed(1)}..${mxy.toFixed(1)} (h ${(mxy - mny).toFixed(1)})  cmds=${cmds.slice(0, 12)}`
  );
});

fs.writeFileSync(process.argv[3] || '.tmp-preview/hands-subpaths.txt',
  parts.map((p, i) => `----- [${i}] -----\n${p}\n`).join('\n'));
console.log('\nwrote subpaths to ' + (process.argv[3] || '.tmp-preview/hands-subpaths.txt'));
