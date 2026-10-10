// Scratch generator for the cracked-compass variants (round 5).
//
// One geometry, one ink model. Angles are in the file convention: 0 = east, 90 = south, 180 = west,
// 270 = north. Radii are in the 340 box. The mark is a single 14-wide stroke with round caps.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('.', import.meta.url).pathname.replace(/^\//, '');
const CX = 170, CY = 170, SW = 14, HALF = SW / 2;
const d2r = d => (d * Math.PI) / 180;
const pol = (r, a) => [CX + r * Math.cos(d2r(a)), CY + r * Math.sin(d2r(a))];
const n2 = n => String(Math.round(n * 100) / 100);
const P = p => `${n2(p[0])} ${n2(p[1])}`;

// the dial: rim at 130 with the break between 203 and 233, four direction lines, needle inside them
const RIM_R = 130, BREAK_A = 203, BREAK_B = 233, SPLIT = 38;
const TICK_OUT = 123, TICK_IN = 100;
const NEEDLE_R = 62, NEEDLE_HW = 20;
const IN_R = 120, OUT_R = 139;   // the break's faces cross the whole rim band (ink 123 to 137)

const tickPath = [270, 0, 90, 180].map(a => `M ${P(pol(TICK_OUT, a))} L ${P(pol(TICK_IN, a))}`).join(' ');
const northPath = `M ${CX} ${CY - NEEDLE_R} L ${CX + NEEDLE_HW} ${CY} L ${CX - NEEDLE_HW} ${CY} Z`;
const southPath = `M ${CX} ${CY + NEEDLE_R} L ${CX + NEEDLE_HW} ${CY} L ${CX - NEEDLE_HW} ${CY} Z`;

// ── the final rim ────────────────────────────────────────────────────────────────────────────────
// Emits arcs from one angle to another, clockwise, each short enough to stay a minor arc.
const arcChain = (from, to) => {
  const n = Math.ceil((to - from) / 170), step = (to - from) / n;
  let out = '';
  for (let i = 1; i <= n; i++) out += `A ${RIM_R} ${RIM_R} 0 0 1 ${P(pol(RIM_R, from + step * i))} `;
  return out.trim();
};
// The break's two ends are cut by short faces that run from the rim's centreline in to radius 120,
// each leaning 5 degrees the same way, so the white between them is a slip and the ends are torn.
// A hairline crack, cut square across the band, splits the rim again on the other side of the mark.
// the candidate: both cuts square across the rim, the wider one 21 degrees, the hairline 14
const rimTwice = (wide, hair) => [
  `M ${P(pol(RIM_R, wide))}`,
  arcChain(wide, SPLIT + 360),
  arcChain(SPLIT + 360, hair[0] + 360),
  `M ${P(pol(RIM_R, hair[1]))}`,
  arcChain(hair[1] + 360, wide - 21 + 720),
].join(' ');

// the alternative: both breaks cut square across the rim, so 24px sees nothing but gaps and the dial
const rimClean = [
  `M ${P(pol(RIM_R, 233))}`,
  arcChain(233, SPLIT + 360),
  arcChain(SPLIT + 360, 294 + 360),
  `M ${P(pol(RIM_R, 310))}`,
  arcChain(310 + 360, 206 + 720),
].join(' ');

const FACE_IN = 125;   // the cut faces stay inside the rim band (ink 123 to 137) so 24px sees only gaps
const F = { upIn: 227, upOut: 233, downOut: 208, downIn: 202 };
const C = { arr: 294, dep: 310 };
const rimFinal = [
  `M ${P(pol(FACE_IN, F.upIn))} L ${P(pol(RIM_R, F.upOut))}`,
  arcChain(F.upOut, SPLIT + 360),
  `${arcChain(SPLIT + 360, C.arr + 360)} L ${P(pol(FACE_IN, C.arr))}`,
  `M ${P(pol(FACE_IN, C.dep))} L ${P(pol(RIM_R, C.dep))}`,
  arcChain(C.dep + 360, F.downOut + 720),
  `L ${P(pol(FACE_IN, F.downIn))}`,
].join(' ');
const rimNoCrack = [
  `M ${P(pol(FACE_IN, F.upIn))} L ${P(pol(RIM_R, F.upOut))}`,
  arcChain(F.upOut, SPLIT + 360),
  arcChain(SPLIT + 360, F.downOut + 360),
  `L ${P(pol(FACE_IN, F.downIn))}`,
].join(' ');

// the whites that decide whether the damage reads at 24px
const faceUp = [pol(FACE_IN, F.upIn), pol(RIM_R, F.upOut)];
const faceDown = [pol(RIM_R, F.downOut), pol(FACE_IN, F.downIn)];
const crackArr = [pol(RIM_R, C.arr), pol(FACE_IN, C.arr)];
const crackDep = [pol(FACE_IN, C.dep), pol(RIM_R, C.dep)];
const white = (a, b) => Math.round((segDist(a[0], a[1], b[0], b[1]) - SW) * 10) / 10;
const px = u => Math.round((u * 24) / 340 * 100) / 100;



// ── ink model: measures the white between strokes instead of guessing it ──────────────────────────
const flattenArc = (a0, a1, r) => {
  const pts = [];
  for (let i = 0; i <= 120; i++) pts.push(pol(r, a0 + ((a1 - a0) * i) / 120));
  return pts;
};
const toSeg = (pt, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  let t = L2 ? ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(a[0] + t * dx - pt[0], a[1] + t * dy - pt[1]);
};
const segDist = (p, q, u, v) => Math.min(toSeg(p, u, v), toSeg(q, u, v), toSeg(u, p, q), toSeg(v, p, q));
const arcPoly = (a0, a1) => flattenArc(a0, a1, RIM_R);
const dialInk = [
  ...[270, 0, 90, 180].map(a => [pol(TICK_OUT, a), pol(TICK_IN, a)]),
  [[CX, CY - NEEDLE_R], [CX - NEEDLE_HW, CY]], [[CX, CY - NEEDLE_R], [CX + NEEDLE_HW, CY]],
  [[CX, CY + NEEDLE_R], [CX - NEEDLE_HW, CY]], [[CX, CY + NEEDLE_R], [CX + NEEDLE_HW, CY]],
  [[CX - NEEDLE_HW, CY], [CX + NEEDLE_HW, CY]],
];
const dialNames = ['tick N', 'tick E', 'tick S', 'tick W', 'needle NW', 'needle NE', 'needle SW', 'needle SE', 'pivot bar'];

// The smallest white gap between the dial's ink and the rim's ink: the number that decides whether
// the needle and the direction lines still read as separate marks at 24px.
function dialGaps(rimPolys) {
  const rows = dialInk.map((o, i) => {
    let best = Infinity;
    for (const rp of rimPolys)
      for (let j = 0; j < rp.length - 1; j++)
        for (let k = 0; k < o.length - 1; k++) best = Math.min(best, segDist(o[k], o[k + 1], rp[j], rp[j + 1]));
    return { gap: Math.round((best - SW) * 10) / 10, label: dialNames[i] };
  });
  rows.sort((a, b) => a.gap - b.gap);
  console.log('   dial to rim:', rows.slice(0, 3).map(r => `${r.label} ${r.gap}`).join(' | '));
}
// The same for the needle, from the four corners of the break.
function breakGaps() {
  const ends = [pol(RIM_R, BREAK_B), pol(RIM_R, BREAK_A), pol(IN_R, 225), pol(IN_R, BREAK_A)];
  const names = ['outer end 233', 'outer end 203', 'inner face 225', 'inner face 203'];
  const rows = ends.map((e, i) => {
    let best = Infinity;
    for (const o of dialInk.slice(4))
      for (let k = 0; k < o.length - 1; k++) best = Math.min(best, toSeg(e, o[k], o[k + 1]));
    return { gap: Math.round((best - SW) * 10) / 10, label: names[i] };
  });
  console.log('   break to needle:', rows.map(r => `${r.label} ${r.gap}`).join(' | '));
}

// ── files ─────────────────────────────────────────────────────────────────────────────────────────
const svg = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 340" width="340" height="340"
     fill="none" stroke="#000000" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"
     role="img" aria-labelledby="t d">
  <title id="t">${label}</title>
  <desc id="d">Variant board scratch file.</desc>
${body}
</svg>
`;
const parts = (o = {}) => [
  o.rim === 'full' ? `  <circle cx="${CX}" cy="${CY}" r="${RIM_R}" />` : `  <path d="${o.rimPath || rimFinal}" />`,
  `  <path d="${tickPath}" />`,
  `  <path d="${northPath}" fill="#000000" />`,
  `  <path d="${southPath}" />`,
].join('\n');

mkdirSync(OUT, { recursive: true });
const files = {
  'v4-final.svg': parts({ rimPath: rimFinal }),
  'v4-final2.svg': parts({ rimPath: rimTwice(233, [294, 308]) }),
  'v4-clean.svg': parts({ rimPath: rimClean }),
  'v4-final-nocrack.svg': parts({ rimPath: rimNoCrack }),
  'v4-final-intact.svg': parts({ rim: 'full' }),
};
for (const [name, body] of Object.entries(files)) writeFileSync(OUT + '/' + name, svg(body, name));

console.log('final rim\n  ' + rimFinal);
console.log('no-crack rim\n  ' + rimNoCrack);
console.log('break white  ', white(faceUp, faceDown), 'units =', px(white(faceUp, faceDown)), 'px at 24');
console.log('crack white  ', white(crackArr, crackDep), 'units =', px(white(crackArr, crackDep)), 'px at 24');
dialGaps([arcPoly(F.upOut, SPLIT + 360), arcPoly(SPLIT, C.arr), arcPoly(C.dep, F.downOut + 360)]);
breakGaps();
console.log('faces:');
[[faceUp, white(faceUp, crackArr)], [faceDown, white(faceDown, crackDep)]].forEach(([f, g]) =>
  console.log('  face', f[0].map(n => Math.round(n)).join(','), 'to crack', g));
console.log('face to needle:', Math.min(white(faceUp, [[CX, CY - NEEDLE_R], [CX - NEEDLE_HW, CY]]),
  white(faceDown, [[CX - NEEDLE_HW, CY], [CX + NEEDLE_HW, CY]])));

