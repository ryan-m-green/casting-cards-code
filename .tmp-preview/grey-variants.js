// Writes grey variants of encounter_death.svg for comparison, replacing only the figure layer's fill.
const fs = require('fs');

const src = fs.readFileSync('frontend/cast-library-ui/public/encounter_death.svg', 'utf8');
const FIGURE_FILL = 'fill="#ffffff"';
if ((src.match(/#ffffff/g) || []).length !== 1) {
  throw new Error('expected exactly one #ffffff (the figure layer)');
}

const GREYS = ['ffffff', 'd9d9d9', 'c9c9c9', 'b0b0b0', '8f8f8f'];
for (const hex of GREYS) {
  const out = src.replace(FIGURE_FILL, `fill="#${hex}"`);
  fs.writeFileSync(`.tmp-preview/grey-${hex}.svg`, out);
  console.log(`grey-${hex}.svg`);
}
