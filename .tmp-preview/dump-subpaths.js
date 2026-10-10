// Prints chosen subpaths of an SVG path, one drawing command per line, for reading the artwork.
const fs = require('fs');

const svg = fs.readFileSync(process.argv[2], 'utf8');
const parts = svg.match(/ d="([^"]+)"/)[1].split(/(?=[Mm])/);

for (const idx of process.argv.slice(3)) {
  const p = parts[Number(idx)].trim();
  console.log(`===== subpath [${idx}] =====`);
  // break before each command letter so the numbers stay grouped
  const cmds = p.replace(/([MLCZmlcz])/g, '\n$1 ').trim().split('\n');
  for (const line of cmds) {
    const t = line.trim();
    console.log(t.length > 200 ? t.slice(0, 200) + ` … (${t.length} chars)` : t);
  }
  console.log('');
}
