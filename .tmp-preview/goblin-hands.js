/*
 * Rebuilds the hands in hands_shackles_captivity.svg as goblin hands: long, bony fingers that
 * taper to a claw point, instead of the rounded-tip human fingers that were there.
 *
 * Only each hand's finger region is regenerated — the wrist, the palm's lower edges, the cuffs and
 * the chain are kept verbatim, so the joins with subpath [2] (forearms + chain) are untouched.
 * The right hand is the left's design mirrored; its own outline runs the other way round, so that
 * design is emitted reversed for it.
 */
const fs = require('fs');

const SRC = 'frontend/cast-library-ui/public/hands_shackles_captivity.svg';
const ORIGINAL = '.tmp-preview/hands-original.svg';   // always rebuild from this, never from SRC
const MIRROR_X = 357;

const svg = fs.readFileSync(ORIGINAL, 'utf8');
const parts = svg.match(/ d="([^"]+)"/)[1].split(/(?=[Mm])/);

// ── the design, in the left hand's own drawing order ─────────────────────────
// run   : a plain stretch of outline (a palm edge, or the web between two fingers)
// finger: two base points A and B (its webs) and the claw tip T
const LEFT = [
  { kind: 'run',    A: [25.779, 127.750], B: [22.996, 99.500], bow: 5 },
  { kind: 'finger', A: [22.996, 99.500],   B: [45.500, 107.000],  T: [23.0, 46.0],   taper: 0.55 },
  { kind: 'finger', A: [45.500, 107.000],  B: [70.000, 98.000],   T: [49.0, 19.0],   taper: 0.55 },
  { kind: 'finger', A: [70.000, 98.000],   B: [94.700, 97.000],   T: [85.5, 11.0],   taper: 0.55 },
  { kind: 'finger', A: [94.700, 97.000],   B: [115.447, 119.000], T: [117.5, 25.0],  taper: 0.55 },
  { kind: 'run',    A: [115.447, 119.000], B: [120.436, 132.000], bow: 6 },
  { kind: 'finger', A: [120.436, 132.000], B: [141.356, 146.250], T: [158.0, 92.0], taper: 0.55 },
];

const pt = ([x, y]) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`non-finite point ${x},${y}`);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

/**
 * A finger: the side from base corner `P` runs up abreast of the finger's spine and then converges
 * on the claw point T; the side from `Q` is the same shape walked back down. Because each side
 * arrives on its own tangent, the two meet at T in a point — a claw, not a rounded fingertip.
 * `taper` is how much of the finger's base width it still carries three quarters of the way up.
 */
function fingerSeg(P, Q, T, taper) {
  const c0 = lerp(P, Q, 0.5);
  const [ux, uy] = unit([T[0] - c0[0], T[1] - c0[1]]);
  const L = Math.hypot(T[0] - c0[0], T[1] - c0[1]);
  const nx = -uy, ny = ux;
  const hP = (P[0] - c0[0]) * nx + (P[1] - c0[1]) * ny;
  const hQ = (Q[0] - c0[0]) * nx + (Q[1] - c0[1]) * ny;

  const side = (base, h, back) => {
    const M = [c0[0] + ux * L * 0.78 + nx * h * taper, c0[1] + uy * L * 0.78 + ny * h * taper];
    const c1 = [base[0] + ux * L * 0.30 + nx * h * 0.10, base[1] + uy * L * 0.30 + ny * h * 0.10];
    const c2 = [M[0] - ux * L * 0.22, M[1] - uy * L * 0.22];
    const c3 = [M[0] + ux * L * 0.14, M[1] + uy * L * 0.14];
    const c4 = lerp(M, T, 0.68);
    return back
      ? `C ${pt(c4)} ${pt(c3)} ${pt(M)} C ${pt(c2)} ${pt(c1)} ${pt(base)}`
      : `C ${pt(c1)} ${pt(c2)} ${pt(M)} C ${pt(c3)} ${pt(c4)} ${pt(T)}`;
  };

  return side(P, hP, false) + ' ' + side(Q, hQ, true);
}

/** A plain run of outline from A to B, bowed off the straight line. */
function runSeg(A, B, bow) {
  const [ux, uy] = unit([B[0] - A[0], B[1] - A[1]]);
  const c = lerp(A, B, 0.5);
  c[0] += -uy * bow; c[1] += ux * bow;
  return `Q ${pt(c)} ${pt(B)}`;
}

const mirror = ([x, y]) => [MIRROR_X - x, y];

/**
 * Emits the design, optionally mirrored about the stamp's centre line and/or walked backwards.
 * `startAt`/`endAt` pin the first and last points onto the vertices the splice actually kept, so the
 * new region meets the untouched outline exactly.
 */
function emit(segments, { mirrorX = false, reverse = false, startAt = null, endAt = null } = {}) {
  const map = p => (mirrorX ? mirror(p) : p);
  const design = reverse ? [...segments].reverse() : segments;

  const ops = design.map(seg => reverse
    ? {
        kind: seg.kind, T: seg.T ? map(seg.T) : null,
        P: map(seg.B), Q: map(seg.A), bow: -seg.bow, taper: seg.taper,
      }
    : {
        kind: seg.kind, T: seg.T ? map(seg.T) : null,
        P: map(seg.A), Q: map(seg.B), bow: seg.bow, taper: seg.taper,
      });

  if (startAt) ops[0].P = startAt;
  if (endAt) ops[ops.length - 1].Q = endAt;

  return ops.map(o => (o.kind === 'run'
    ? runSeg(o.P, o.Q, o.bow)
    : fingerSeg(o.P, o.Q, o.T, o.taper))).join(' ');
}

// ── splice the new finger regions into each hand ─────────────────────────────
/** Splits a subpath at the commands ending at `at` and `to`, keeping both ends verbatim. */
function splice(subpath, at, to, middle) {
  const cmds = subpath.trim().match(/[MLCZmlcz][^MLCZmlcz]*/g) || [];
  const nearest = target => {
    let best = -1, bestD = Infinity;
    cmds.forEach((c, i) => {
      const nums = (c.match(/-?\d*\.?\d+/g) || []).map(Number);
      if (nums.length < 2) return;
      const d = Math.hypot(nums[nums.length - 2] - target[0], nums[nums.length - 1] - target[1]);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  const i = nearest(at), j = nearest(to);
  if (i < 0 || j < 0 || j <= i) throw new Error('bad splice points');
  const head = cmds.slice(0, i + 1).join(' ');
  const tail = cmds.slice(j + 1).join(' ');
  console.log(`  splice: kept ${i + 1} cmds, replaced ${j - i}, kept ${cmds.length - j - 1}`);
  return `${head} ${middle} ${tail}`;
}

// Left hand: cut on the palm's edges at (25.779, 127.75) and (141.356, 146.25).
const leftHand = splice(parts[9], [25.779, 127.750], [141.356, 146.250], emit(LEFT));

// Right hand: cut at its own palm edges, and its outline runs little -> thumb, so the design is
// walked backwards; the two cut vertices pin the new region's ends.
const rightAt = [218.098, 149.750];
const rightTo = [332.000, 124.780];
const rightHand = splice(parts[10], rightAt, rightTo,
  emit(LEFT, { mirrorX: true, reverse: true, startAt: rightAt, endAt: rightTo }));

parts[9] = leftHand;
parts[10] = rightHand;

const out = svg.replace(/ d="[^"]+"/, ` d="${parts.join(' ').trim()}"`);
fs.writeFileSync(SRC, out);
console.log(`\nwrote ${SRC} (${out.length} bytes)`);
