// Re-proportions the original running_man outline into a goblin build:
//   head circle 1/4 bigger, each leg section shortened 1/4, torso shortened 1/4, arm sections shortened 1/4.
// Shortening is an axial squash (scale along the limb's own axis only), so limbs get shorter without
// getting thinner, and the chains run in order so joints stay attached.
// Usage: node deform-running-man.js [headGrow] [torsoK] [legK] [armK] [outName]
const fs = require('fs');

const PUBLIC = 'C:/Repository/CastingCards/Code/frontend/cast-library-ui/public/';
const SCRATCH = 'C:/Repository/CastingCards/Code/.tmp-preview/';

const HEAD_GROW = parseFloat(process.argv[2] || '1.25');
const TORSO_K = parseFloat(process.argv[3] || '0.75');
const LEG_K = parseFloat(process.argv[4] || '0.75');
const ARM_K = parseFloat(process.argv[5] || '0.75');
const OUT_NAME = process.argv[6] || 'running-goblin-body.svg';

const INK = '#000000';

/* ── path parsing ─────────────────────────────────────────────────────────── */

function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const cmds = [];
  let i = 0;
  let letter = null;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) { letter = t; i++; }
    if (letter === 'Z' || letter === 'z') { cmds.push({ cmd: 'Z', pts: [] }); letter = null; continue; }
    const n = () => parseFloat(tokens[i++]);
    if (letter === 'M') cmds.push({ cmd: 'M', pts: [[n(), n()]] });
    else if (letter === 'L') cmds.push({ cmd: 'L', pts: [[n(), n()]] });
    else if (letter === 'C') cmds.push({ cmd: 'C', pts: [[n(), n()], [n(), n()], [n(), n()]] });
    else throw new Error('unhandled path command: ' + letter);
  }
  return cmds;
}

function emitPath(cmds) {
  return cmds.map(c => c.cmd === 'Z'
    ? 'Z'
    : c.cmd + ' ' + c.pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ')
  ).join(' ');
}

/* ── transforms ───────────────────────────────────────────────────────────── */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const norm = a => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };

/** Scale about a point, evenly. */
const scaleAbout = (p, c, k) => add(c, mul(sub(p, c), k));

/** Scale only the component along `u` — shortens a limb without thinning it. */
function axialSquash(p, c, u, k) {
  const d = sub(p, c);
  const along = d[0] * u[0] + d[1] * u[1];
  const ax = mul(u, along);
  const perp = sub(d, ax);
  return add(add(c, mul(ax, k)), perp);
}

/** The linear part of axialSquash, for pushing a direction through it. */
function squashDir(u, axis, k) {
  const along = u[0] * axis[0] + u[1] * axis[1];
  const ax = mul(axis, along);
  return norm(add(mul(ax, k), sub(u, ax)));
}

/* ── the running man's joints (read off the outline) ──────────────────────── */

const HIP = [80.000, 63.265];
const HEAD_C = [88.5, 22.3];
const SH_F = [88.5, 34.5], ELB_F = [94.514, 43.762], HAND_F = [110.0, 42.4];
const SH_B = [61.0, 35.0], ELB_B = [58.316, 46.25], HAND_B = [50.28, 52.04];
const KNEE_F = [92.7, 73.6], FOOT_F = [100.3, 107.2];
const HIP_B = [70.000, 75.002], FOOT_B = [33.32, 93.21];

/* ── which part every outline point belongs to ────────────────────────────── */
// Sub-shape 0 is the whole figure traced as one loop; indices are command order.
const PARTS_MAIN = [
  'LEG_F',                                                  // 0   foot
  'LEG_F', 'LEG_F', 'LEG_F', 'LEG_F',                       // 1-4 front leg, back edge
  'TORSO',                                                  // 5   lower back
  'TORSO', 'TORSO', 'ARM_B_UP',                             // 6-8 spine, and the back arm's root
  'ARM_B_UP', 'ARM_B_LO', 'ARM_B_LO', 'ARM_B_LO',           // 9-12 back arm: upper arm, elbow, forearm, hand
  'TORSO', 'TORSO',                                         // 13-14 shoulder line
  'HEAD', 'HEAD', 'HEAD', 'HEAD', 'HEAD', 'HEAD', 'HEAD',   // 15-21 skull
  'HEAD', 'HEAD',                                           // 22-23 jaw and neck
  'ARM_F_UP',                                               // 24  elbow, upper side
  'ARM_F_LO', 'ARM_F_LO', 'ARM_F_LO',                       // 25-27 forearm and hand
  'ARM_F_LO', 'ARM_F_LO',                                   // 28-29 forearm underside
  'ARM_F_UP',                                               // 30  elbow, underside
  'ARM_F_UP', 'ARM_F_UP',                                   // 31-32 armpit
  'TORSO', 'TORSO',                                         // 33-34 torso front edge and crotch
  'LEG_F', 'LEG_F', 'LEG_F',                                // 35-37 thigh front edge, and the knee
  'LEG_F', 'LEG_F', 'LEG_F', 'LEG_F', 'LEG_F',              // 38-42 shin and foot
];

// Leg points past the knee take the second squash as well.
const SHIN_POINTS = new Set([0, 1, 2, 3, 38, 39, 40, 41, 42]);

/* ── the transforms, built once ───────────────────────────────────────────── */

const T_torso = p => [p[0], HIP[1] + (p[1] - HIP[1]) * TORSO_K];

const headC = T_torso(HEAD_C);

const shF = T_torso(SH_F);
const uUpperF = norm(sub(ELB_F, SH_F));
const uLowerF0 = norm(sub(HAND_F, ELB_F));

const shB = T_torso(SH_B);
const uArmBUp = norm(sub(ELB_B, SH_B));
const uArmBLo0 = norm(sub(HAND_B, ELB_B));

const uThighF = norm(sub(KNEE_F, HIP));
const uShinF0 = norm(sub(FOOT_F, KNEE_F));

const uLegB = norm(sub(FOOT_B, HIP_B));

function moveMain(p, part) {
  switch (part) {
    case 'TORSO':
      return T_torso(p);
    case 'HEAD':
      return scaleAbout(T_torso(p), headC, HEAD_GROW);
    case 'ARM_F_UP':
      return axialSquash(T_torso(p), shF, uUpperF, ARM_K);
    case 'ARM_F_LO': {
      const q1 = axialSquash(T_torso(p), shF, uUpperF, ARM_K);
      const elbow = axialSquash(T_torso(ELB_F), shF, uUpperF, ARM_K);
      return axialSquash(q1, elbow, squashDir(uLowerF0, uUpperF, ARM_K), ARM_K);
    }
    case 'ARM_B_UP':
      return axialSquash(T_torso(p), shB, uArmBUp, ARM_K);
    case 'ARM_B_LO': {
      const q1 = axialSquash(T_torso(p), shB, uArmBUp, ARM_K);
      const elbow = axialSquash(T_torso(ELB_B), shB, uArmBUp, ARM_K);
      return axialSquash(q1, elbow, squashDir(uArmBLo0, uArmBUp, ARM_K), ARM_K);
    }
    case 'LEG_F':
      return axialSquash(p, HIP, uThighF, LEG_K);
    case 'LEG_SHIN': {
      const q1 = axialSquash(p, HIP, uThighF, LEG_K);
      const knee = axialSquash(KNEE_F, HIP, uThighF, LEG_K);
      return axialSquash(q1, knee, squashDir(uShinF0, uThighF, LEG_K), LEG_K);
    }
    default:
      return p;
  }
}

const partAt = i => {
  const part = PARTS_MAIN[Math.min(Math.max(i, 0), PARTS_MAIN.length - 1)];
  return part === 'LEG_F' && SHIN_POINTS.has(i) ? 'LEG_SHIN' : part;
};

/* ── run it ───────────────────────────────────────────────────────────────── */

const src = fs.readFileSync(PUBLIC + 'running_man.svg', 'utf8');
const srcD = src.match(/\sd="([^"]+)"/)[1];
const allCmds = parsePath(srcD);

const groups = [];
allCmds.forEach(c => {
  if (c.cmd === 'M') groups.push([]);
  groups[groups.length - 1].push(c);
});
console.log(`sub-shapes: ${groups.length}, main outline commands: ${groups[0].length}`);

// The closing Z is carried as a command too, so it does not take a part.
const mainCommands = groups[0].filter(c => c.cmd !== 'Z').length;
if (mainCommands !== PARTS_MAIN.length) {
  throw new Error(`part map expects ${PARTS_MAIN.length} commands, outline has ${mainCommands}`);
}

// Joint tidy-ups applied after the transform, read off the rendered result: they close the folds the
// head's growth opened at the neck, square up the knee, and lift the trailing leg's hip to the backside.
const CORRECTIONS = {
  0: {
    3: [82.6, 79.5],   // knee, inner side
    4: [82.4, 77.2],   // top of the shin's inner edge, squared up to the knee
    15: [81.6, 37.6],  // head's lower-left: stops the outline folding back at the shoulder
    23: [89.6, 43.2],  // neck: keeps the outline running onward into the arm instead of doubling back
  },
  1: {
    4: [62.3, 64.1],   // trailing leg's top corner, raised to the backside line
    5: [64.3, 65.2],   // top edge set just inside the torso, so the join reads solid
    6: [67.4, 67.8],
    7: [70.0, 69.9],
  },
};

const correctionDelta = (gi, i, computed) => {
  const target = CORRECTIONS[gi]?.[i];
  return target ? [target[0] - computed[0], target[1] - computed[1]] : [0, 0];
};

const outGroups = groups.map((cmds, gi) => {
  if (gi === 0) {
    let startPart = null;
    let pi = -1;
    return cmds.map(c => {
      if (c.cmd === 'Z') return c;
      const endIndex = ++pi;
      const endPart = partAt(endIndex);
      const fromPart = startPart ?? endPart;
      startPart = endPart;

      const n = c.pts.length;
      const endMoved = moveMain(c.pts[n - 1], endPart);
      const d = correctionDelta(0, endIndex, endMoved);

      const pts = c.pts.map((p, k) => {
        if (k === n - 1) return [endMoved[0] + d[0], endMoved[1] + d[1]];
        // Control points ride a blend of the segment's two ends, so a curve crossing a joint bends
        // through it instead of kinking. The segment's correction rides along with them, keeping the
        // curve's own shape instead of leaving it sagging behind.
        const t = (k + 1) / n;
        const a = moveMain(p, fromPart);
        const b = moveMain(p, endPart);
        return [a[0] + (b[0] - a[0]) * t + d[0], a[1] + (b[1] - a[1]) * t + d[1]];
      });
      return { cmd: c.cmd, pts };
    });
  }
  if (gi === 1) {
    let pi = -1;
    return cmds.map(c => {
      if (c.cmd === 'Z') return c;
      const i = ++pi;
      const n = c.pts.length;
      const d = correctionDelta(1, i, axialSquash(c.pts[n - 1], HIP_B, uLegB, LEG_K));
      const pts = c.pts.map(p => {
        const q = axialSquash(p, HIP_B, uLegB, LEG_K);
        return [q[0] + d[0], q[1] + d[1]];
      });
      return { cmd: c.cmd, pts };
    });
  }
  // The motion trails come down with the torso.
  return cmds.map(c => ({ cmd: c.cmd, pts: c.pts.map(p => T_torso(p)) }));
});

const outD = outGroups.map(emitPath).join(' ');

const xs = [], ys = [];
outGroups.forEach(g => g.forEach(c => c.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); })));
const pad = 2;
const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
const vb = `${minX.toFixed(1)} ${minY.toFixed(1)} ${(maxX - minX).toFixed(1)} ${(maxY - minY).toFixed(1)}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${(maxX - minX).toFixed(0)}" height="${(maxY - minY).toFixed(0)}" fill="none" role="img" aria-labelledby="fleeing-goblin-title">
  <title id="fleeing-goblin-title">Fled</title>
  <path d="${outD}" fill="${INK}" fill-rule="nonzero" />
</svg>
`;

fs.writeFileSync(SCRATCH + OUT_NAME, svg);
console.log(`viewBox="${vb}"   (the original was "0 0 124 120")`);
console.log(`figure is now ${(maxX - minX).toFixed(0)} x ${(maxY - minY).toFixed(0)} in the original's units`);
console.log(`wrote ${OUT_NAME} (${svg.length} chars)`);

const preview = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 14px; background: #e8d4a7; font: 11px sans-serif; color: #5a451f; }
  .row { display: flex; gap: 26px; align-items: flex-end; }
  .cell { text-align: center; }
  .cell .art svg { height: 200px; width: auto; display: block; }
  .small svg { height: 60px; width: auto; display: block; }
</style></head><body>
  <div class="row">
    <div class="cell"><div class="art"><svg viewBox="0 0 124 120"><path d="${srcD}" fill="${INK}" fill-rule="evenodd"/></svg></div><div>original</div></div>
    <div class="cell"><div class="art"><svg viewBox="${vb}"><path d="${outD}" fill="${INK}" fill-rule="nonzero"/></svg></div><div>deformed (nonzero)</div></div>
    <div class="cell"><div class="art"><svg viewBox="${vb}"><path d="${outD}" fill="${INK}" fill-rule="evenodd"/></svg></div><div>deformed (evenodd)</div></div>
    <div class="cell"><div class="small"><svg viewBox="${vb}"><path d="${outD}" fill="${INK}" fill-rule="nonzero"/></svg></div><div>stamp size</div></div>
  </div>
</body></html>
`;

fs.writeFileSync(SCRATCH + 'deformed-preview.html', preview);


