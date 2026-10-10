// Prints each command's endpoint for the given subpaths, in order, so cut points can be chosen.
const fs = require('fs');

const svg = fs.readFileSync(process.argv[2], 'utf8');
const parts = svg.match(/ d="([^"]+)"/)[1].split(/(?=[Mm])/);

for (const idx of process.argv.slice(3)) {
  const p = parts[Number(idx)].trim();
  console.log(`===== [${idx}] =====`);
  const cmds = p.match(/[MLCZmlcz][^MLCZmlcz]*/g) || [];
  cmds.forEach((c, i) => {
    const nums = (c.match(/-?\d*\.?\d+/g) || []).map(Number);
    const lx = nums[nums.length - 2], ly = nums[nums.length - 1];
    const letter = c[0];
    if (letter === 'Z') { console.log(`  ${String(i).padStart(2)} Z`); return; }
    console.log(`  ${String(i).padStart(2)} ${letter}  -> (${lx.toFixed(2)}, ${ly.toFixed(2)})`);
  });
  console.log('');
}
