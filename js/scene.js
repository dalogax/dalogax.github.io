// The room, built from primitives. Units are metres, Y up.
// Back wall at z = -1.75, left wall at x = -2.5; the room is open towards +x/+z.
import { m4, Geo, MAT, xf } from './engine.js';

const { T, RX, RY, RZ, S, C } = m4;
const PI = Math.PI;
const I = () => m4.I();

export const ROOM = { x0: -2.5, x1: 3.9, z0: -1.75, z1: 4.25, h: 2.6 };

const COL = {
  wall: '#e4e5ea', base: '#a9adb6', skirt: '#f5f6f8', wood: '#d8bf9c', white: '#f2f3f5', offwhite: '#dfe2e7',
  black: '#1a1b1f', dark: '#2a2c32', carbon: '#202227', alu: '#b9bec6', aluDark: '#8d939c', groove: '#5d636c',
  bezel: '#0c0c0f', red: '#d62839', purple: '#8b5cf6', magenta: '#ec4899', cyan: '#22d3ee',
  green: '#22c55e', amber: '#f59e0b', blue: '#3b82f6', lime: '#a3e635', orange: '#f97316', yellow: '#facc15',
};

const SX = 1.0;    // sim rig centre x
const RKX = 3.1;
const DDX = 0.5;   // desk shift along x   // rack centre x
const BX = 0, BZ = 0, BY = 1.05; // standing bench centre + top height, in the bench's local frame
const BENCH_X = -2.14, BENCH_Z = 0.55; // bench world position: back against the left wall, front faces +x
const BM = C(T(BENCH_X, 0, BENCH_Z), RY(PI / 2));

// Point lights: position, linear colour * intensity
export const LIGHTS = [
  [[-1.6 + DDX, 1.1, -1.15], [.35, .5, 1.0]],     // ultrawide + light bar
  [[SX, 1.05, -0.9], [.9, .6, .5]],         // sim screens
  [[RKX, .75, -0.7], [.45, .7, .9]],        // rack LEDs
  [[BENCH_X + 0.1, BY + 0.45, BENCH_Z], [1.3, 1.2, 1.05]], // bench LED bar
  [[SX, 1.95, -1.45], [.35, .55, .9]],      // sign backlight
  [[-1.8, 2.3, 0.4], [.9, .85, .95]],       // sport wall wash
  [[4.5, 2.2, -0.6], [.9, .9, .95]],        // back wall wash
  [[0.4, 2.4, 1.0], [.8, .78, .74]],        // room fill
  [[3.6, 2.4, 2.6], [.8, .78, .74]],        // room fill (front)
];

export function buildScene() {
  const nodes = [];
  const node = (hot = null, opts = {}) => {
    const geo = new Geo();
    nodes.push({ geo, hot, model: m4.I(), ...opts });
    return geo;
  };

  // aluminium extrusion between two axis-aligned points, with T-slot grooves
  const prof = (g, a, b, s = 0.04, col = COL.alu) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const k = d.map(Math.abs).indexOf(Math.max(...d.map(Math.abs)));
    const len = Math.abs(d[k]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const size = [2 * s, 2 * s, 2 * s]; size[k] = len;
    g.rbox(T(...m), ...size, col, s * 0.2);
    for (let j = 0; j < 3; j++) if (j !== k) for (const sg of [-1, 1]) {
      const o = [...m]; o[j] += sg * (s + 0.0006);
      const gs = [0, 0, 0]; gs[k] = len * 0.985; gs[j] = 0.001; gs[3 - j - k] = s * 0.32;
      g.box(T(...o), ...gs, COL.groove);
    }
  };

  /* ================= room shell ================= */
  const room = node(null, { noShadow: true });
  const { x0, x1, z0, z1, h } = ROOM, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, W = x1 - x0, D = z1 - z0;
  room.box(T(cx - 0.05, -0.09, cz - 0.05), W + 0.1, 0.18, D + 0.1, COL.base);
  room.quad(C(T(cx, 0.001, cz), RX(-PI / 2)), W, D, '#f4f5f8', MAT.FLOOR);
  room.box(T(cx - 0.05, h / 2, z0 - 0.05), W + 0.1, h, 0.1, COL.wall);
  room.box(T(x0 - 0.05, h / 2, cz - 0.05), 0.1, h, D + 0.1, COL.wall);
  room.box(T(cx, 0.04, z0 + 0.01), W, 0.08, 0.02, COL.skirt);
  room.box(T(x0 + 0.01, 0.04, cz), 0.02, 0.08, D, COL.skirt);
  // warm light lines along the top of both walls
  room.box(T(cx, 2.57, z0 + 0.015), W, 0.025, 0.02, '#fff1dc', MAT.EMIT);
  room.box(T(x0 + 0.015, 2.57, cz), 0.02, 0.025, D, '#fff1dc', MAT.EMIT);

  // Portal-game portals on the wall above the desk: orange and blue
  const portals = [], pview = node(null, { noShadow: true });
  for (const [pi, [pos, rot, ring, g1, g2, hole, mid]] of [
    [[2.3, 1.45, z0 + 0.004], I(), '#ffc15a', '#e8731a', '#7a3208', '#2a1204', '#a8470c'],
    [[x0 + 0.004, 1.4, -0.85], RY(PI / 2), '#8fdcff', '#2a9be8', '#0d4272', '#04182b', '#0e5a9c']].entries()) {
    const E = C(T(...pos), rot, S(0.58, 1, 1)), R = 0.4;
    portals.push({ pos, n: pi ? [1, 0, 0] : [0, 0, 1] });
    const disc = (z, r, col) => room.cyl(C(E, T(0, 0, z), RX(PI / 2)), r, 0.002, col, 40, MAT.EMIT);
    disc(0.000, R * 1.28, g2);
    disc(0.001, R * 1.14, g1);
    disc(0.002, R * 1.0, ring);
    disc(0.003, R * 0.9, mid);
    pview.cyl(C(E, T(0, 0, 0.004), RX(PI / 2)), R * 0.8, 0.002, hole, 40, MAT.PORTAL0 + pi);
  }

  /* ================= desk: gaming PC + ultrawide ================= */
  const desk = node('desk', { model: T(DDX, 0, 0) });
  {
    const dx = -1.6, dz = -1.375, top = 0.74;
    desk.rbox(T(dx, top, dz), 1.6, 0.035, 0.75, COL.white, 0.012);
    for (const lx of [dx - 0.68, dx + 0.68]) {                         // motorised standing-desk legs
      desk.rbox(T(lx, 0.015, dz), 0.075, 0.03, 0.68, COL.alu, 0.01);
      desk.rbox(T(lx, 0.24, dz), 0.085, 0.42, 0.06, COL.alu, 0.008);
      desk.rbox(T(lx, 0.56, dz), 0.07, 0.3, 0.05, COL.alu, 0.008);
      desk.rbox(T(lx, top - 0.035, dz), 0.06, 0.03, 0.6, COL.aluDark, 0.006);
    }
    desk.rbox(T(dx, top - 0.05, dz - 0.1), 1.3, 0.04, 0.06, COL.aluDark, 0.008);
    desk.rbox(T(dx + 0.55, top - 0.03, dz + 0.37), 0.12, 0.025, 0.04, COL.dark, 0.006);
    desk.quad(T(dx + 0.55, top - 0.03, dz + 0.391), 0.04, 0.012, '#7dd3fc', MAT.EMIT);
    // desk mat, keyboard with keycaps, mouse
    desk.rbox(T(dx, top + 0.019, dz + 0.22), 0.95, 0.004, 0.38, '#3a3d46', 0.002);
    {
      const kx = dx - 0.12, kz = dz + 0.2, ky = top + 0.032;
      desk.rbox(T(kx, ky, kz), 0.44, 0.022, 0.15, COL.dark, 0.006);
      desk.quad(C(T(kx, ky + 0.0115, kz), RX(-PI / 2)), 0.42, 0.13, [.15, .15, .15], MAT.RGB);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) {
        const kxp = kx - 0.1925 + c * 0.0275, kzp = kz - 0.056 + r * 0.028;
        if (r === 4 && c > 3 && c < 11) { if (c === 4) desk.rbox(T(kx, ky + 0.016, kzp), 0.17, 0.012, 0.022, COL.white, 0.003); continue; }
        const accent = (r === 0 && c === 0) || (r === 2 && c === 14);
        desk.rbox(T(kxp, ky + 0.016, kzp), 0.023, 0.012, 0.022, accent ? COL.magenta : COL.white, 0.003);
      }
      desk.rbox(T(dx + 0.24, top + 0.035, dz + 0.22), 0.06, 0.03, 0.11, COL.white, 0.015);
    }
    // curved ultrawide on a monitor arm, light bar on top
    {
      const cx = dx, cy = 1.06, zs = -1.48, R = 1.0, Wd = 0.82, H = 0.35, N = 10, span = Wd / R;
      const chord = 2 * R * Math.sin(span / N / 2) + 0.002;
      for (let i = 0; i < N; i++) {
        const a = -span / 2 + (i + .5) * span / N;
        const px = cx + R * Math.sin(a), pz = zs + R - R * Math.cos(a);
        const nx = -Math.sin(a), nz = Math.cos(a);
        desk.box(C(T(px - nx * 0.02, cy, pz - nz * 0.02), RY(-a)), chord + 0.003, H + 0.016, 0.035, COL.bezel);
        desk.box(C(T(px - nx * 0.045, cy, pz - nz * 0.045), RY(-a)), chord, H - 0.04, 0.02, COL.white);
        desk.quad(C(T(px, cy, pz), RY(-a)), chord, H, '#ffffff', MAT.CODE, [i / N, (i + 1) / N, 0, 1]);
      }
      desk.cyl(T(cx, top + 0.2, -1.7), 0.018, 0.4, COL.alu, 10);
      desk.rbox(T(cx, top + 0.03, -1.7), 0.07, 0.05, 0.08, COL.alu, 0.008);
      desk.rbox(T(cx, 1.02, -1.6), 0.04, 0.03, 0.2, COL.alu, 0.008);
      desk.rbox(T(cx, cy + H / 2 + 0.025, zs - 0.02), 0.45, 0.025, 0.035, COL.dark, 0.008);
      desk.quad(C(T(cx, cy + H / 2 + 0.012, zs), RX(PI / 2)), 0.42, 0.02, '#fff7e6', MAT.EMIT);
      desk.rbox(T(cx + 0.3, cy + H / 2 + 0.02, zs + 0.01), 0.07, 0.03, 0.03, COL.dark, 0.008);  // webcam
      desk.cyl(C(T(cx + 0.3, cy + H / 2 + 0.02, zs + 0.026), RX(PI / 2)), 0.008, 0.004, '#38bdf8', 8, MAT.EMIT);
    }
    // speaker
    desk.rbox(T(dx - 0.68, top + 0.12, -1.58), 0.12, 0.22, 0.15, COL.white, 0.012);
    for (const [y, r] of [[0.08, 0.035], [0.17, 0.018]]) desk.cyl(C(T(dx - 0.68, top + 0.02 + y, -1.505), RX(PI / 2)), r, 0.006, COL.dark, 14);
  }
  // white tower with an open glass side showing the build
  {
    const x = -1.02, y = 0.74 + 0.27, z = -1.48, w = 0.23, hh = 0.5, d = 0.47;
    desk.rbox(T(x - w / 2 + 0.01, y, z), 0.02, hh, d, COL.white, 0.006);
    desk.rbox(T(x, y + hh / 2 - 0.01, z), w, 0.02, d, COL.white, 0.006);
    desk.rbox(T(x, y - hh / 2 + 0.01, z), w, 0.02, d, COL.white, 0.006);
    desk.rbox(T(x, y, z - d / 2 + 0.01), w, hh, 0.02, COL.white, 0.006);
    desk.rbox(T(x, y, z + d / 2 - 0.012), w, hh, 0.024, COL.white, 0.006);
    for (const fy of [-0.15, 0, 0.15]) {
      desk.cyl(C(T(x, y + fy, z + d / 2 + 0.001), RX(PI / 2)), 0.062, 0.004, '#121216', 16);
      desk.torus(T(x, y + fy, z + d / 2 + 0.004), 0.066, 0.006, '#ffffff', 20, 4, MAT.EMIT);
    }
    for (const [sy, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) // glass frame
      desk.box(T(x + w / 2 - 0.004, y + sy * (hh / 2 - 0.006), z + sz * (d / 2 - 0.006)), 0.008, sz ? hh : 0.012, sz ? 0.012 : d, COL.alu);
    desk.box(T(x - w / 2 + 0.022, y, z), 0.004, hh - 0.04, d - 0.04, '#25262c');                // motherboard
    desk.rbox(T(x, y - hh / 2 + 0.07, z), w - 0.04, 0.1, d - 0.04, COL.offwhite, 0.006);        // PSU shroud
    desk.rbox(T(x - 0.01, y - 0.05, z + 0.02), w - 0.07, 0.06, 0.32, COL.dark, 0.008);          // GPU
    desk.box(T(x + 0.045, y - 0.025, z + 0.02), 0.003, 0.008, 0.3, [.4, .4, .4], MAT.RGB);
    desk.cyl(C(T(x - 0.07, y + 0.08, z - 0.02), RZ(PI / 2)), 0.035, 0.03, COL.dark, 14);       // AIO pump
    desk.torus(C(T(x - 0.053, y + 0.08, z - 0.02), RY(PI / 2)), 0.03, 0.005, [.5, .5, .5], 16, 3, MAT.RGB);
    for (let i = 0; i < 4; i++) desk.box(T(x - 0.075, y + 0.1, z + 0.06 + i * 0.018), 0.05, 0.035, 0.006, COL.dark);
    desk.box(T(x - 0.05, y + 0.12, z + 0.087), 0.004, 0.004, 0.06, [.5, .5, .5], MAT.RGB);
    desk.rbox(T(x, y + hh / 2 - 0.045, z), w - 0.05, 0.03, d - 0.08, COL.dark, 0.006);          // radiator
  }
  // ergonomic chair
  {
    const ch = C(T(-1.65, 0, -0.7), RY(0));
    const WH = '#f3f4f6', MESH = '#c9ced8', PAD = '#3a3d46';
    // five-star base: tapered white arms, double-wheel casters
    desk.cyl(C(ch, T(0, 0.075, 0)), 0.06, 0.05, WH, 24, 0, 0.04);
    for (let k = 0; k < 5; k++) {
      const r = C(ch, RY(k * 2 * PI / 5));
      desk.tube(r, [0, 0.085, 0.02], [0, 0.06, 0.3], 0.026, WH, 16);
      desk.tube(r, [0, 0.07, 0.15], [0, 0.055, 0.31], 0.032, WH, 16);
      desk.cyl(C(r, T(0, 0.055, 0.31)), 0.026, 0.03, WH, 16);
      desk.cyl(C(r, T(0, 0.04, 0.31)), 0.01, 0.04, COL.alu, 10);
      for (const dx of [-0.013, 0.013]) desk.cyl(C(r, T(dx, 0.028, 0.31), RZ(PI / 2)), 0.027, 0.014, COL.dark, 20);
      desk.cyl(C(r, T(0, 0.028, 0.31), RZ(PI / 2)), 0.012, 0.036, WH, 14);
    }
    // gas lift with telescopic cover
    desk.cyl(C(ch, T(0, 0.22, 0)), 0.034, 0.3, WH, 24, 0, 0.03);
    desk.cyl(C(ch, T(0, 0.38, 0)), 0.026, 0.12, COL.alu, 20);
    desk.cyl(C(ch, T(0, 0.43, 0)), 0.04, 0.04, COL.dark, 20);
    // mechanism + seat: rounded padded cushion with waterfall front
    desk.rbox(C(ch, T(0, 0.445, 0.03)), 0.3, 0.04, 0.3, WH, 0.015);
    desk.rbox(C(ch, T(0, 0.485, 0)), 0.5, 0.07, 0.5, '#dfe2e8', 0.035);
    desk.rbox(C(ch, T(0, 0.52, 0)), 0.46, 0.02, 0.46, '#e9ebef', 0.01);
    desk.rbox(C(ch, T(0, 0.5, -0.255)), 0.46, 0.05, 0.03, '#dfe2e8', 0.02);
    for (let i = 0; i < 7; i++) desk.box(C(ch, T(0, 0.531, -0.18 + i * 0.06)), 0.4, 0.002, 0.004, '#c9ced8');
    desk.rbox(C(ch, T(0.1, 0.43, 0.03)), 0.04, 0.03, 0.12, COL.dark, 0.008);   // tilt lever
    // back: tall white frame with mesh, lumbar, headrest
    const back = C(ch, T(0, 0.92, 0.27), RX(0.3));
    desk.tube(C(ch, T(0, 0.4, 0.0)), [0, 0.1, 0.1], [0, 0.45, 0.25], 0.022, WH, 14);     // spine
    desk.rbox(C(back, T(0, 0, 0.012)), 0.44, 0.62, 0.008, MESH, 0.002);
    for (let i = 0; i < 20; i++) desk.box(C(back, T(0, -0.29 + i * 0.03, 0.006)), 0.43, 0.003, 0.004, '#aeb4c0');
    for (const s of [-1, 1]) {
      desk.rbox(C(back, T(s * 0.235, 0, 0)), 0.03, 0.7, 0.04, WH, 0.014);
      desk.tube(back, [s * 0.235, 0.345, 0], [s * 0.2, 0.37, 0], 0.018, WH, 12);
    }
    desk.rbox(C(back, T(0, 0.35, 0)), 0.5, 0.035, 0.04, WH, 0.014);
    desk.rbox(C(back, T(0, -0.34, 0)), 0.5, 0.035, 0.04, WH, 0.014);
    desk.rbox(C(back, T(0, -0.12, -0.03)), 0.3, 0.09, 0.03, WH, 0.014);                  // lumbar support
    desk.rbox(C(back, T(0, 0.47, -0.02)), 0.3, 0.13, 0.06, '#dfe2e8', 0.03);             // headrest
    desk.rbox(C(back, T(0, 0.47, 0.02)), 0.12, 0.03, 0.02, WH, 0.008);
    desk.tube(back, [0, 0.35, 0.02], [0, 0.46, 0.02], 0.015, WH, 12);
    desk.rbox(C(ch, T(0, 0.6, 0.27)), 0.06, 0.25, 0.03, WH, 0.012);
    // armrests: white post and arm, soft dark pad
    for (const s of [-1, 1]) {
      desk.rbox(C(ch, T(s * 0.26, 0.5, 0.03)), 0.04, 0.05, 0.1, WH, 0.012);
      desk.tube(ch, [s * 0.27, 0.5, 0.03], [s * 0.27, 0.69, -0.02], 0.016, WH, 14);
      desk.rbox(C(ch, T(s * 0.27, 0.7, -0.02)), 0.05, 0.028, 0.18, WH, 0.012);
      desk.rbox(C(ch, T(s * 0.27, 0.722, -0.04)), 0.075, 0.025, 0.26, PAD, 0.012);
    }
  }

  /* ================= sim rig ================= */
  const sim = node('sim');
  {
    const BLK = '#25272d', GRV = '#0e0f12', RED = COL.red, YEL = '#f5c400';
    // black-anodised extrusion between two axis-aligned points; w,h = cross-section on the two other axes (low index first)
    const ext = (a, b, w = 0.04, h = 0.04, col = BLK) => {
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const k = d.map(Math.abs).indexOf(Math.max(...d.map(Math.abs)));
      const len = Math.abs(d[k]), m = [0, 1, 2].map(i => (a[i] + b[i]) / 2);
      const o = [0, 1, 2].filter(i => i !== k), size = [0, 0, 0];
      size[k] = len; size[o[0]] = w; size[o[1]] = h;
      sim.rbox(T(...m), ...size, col, 0.006);
      for (const j of o) for (const sg of [-1, 1]) {
        const p = [...m]; p[j] += sg * (size[j] / 2 + 0.0005);
        const gs = [0, 0, 0]; gs[k] = len * 0.97; gs[j] = 0.0012;
        gs[o[0] === j ? o[1] : o[0]] = size[o[0] === j ? o[1] : o[0]] * 0.34;
        sim.box(T(...p), ...gs, GRV);
      }
    };
    const bolt = (x, y, z, ax = 2) => sim.cyl(C(T(x, y, z), ax === 2 ? RX(PI / 2) : ax === 0 ? RZ(PI / 2) : I()), 0.007, 0.006, COL.alu, 10);

    // ---- base: two 40x120 side rails, three crossmembers, rubber feet
    const RX_ = 0.27, RY_ = 0.072;
    for (const x of [SX - RX_, SX + RX_]) {
      ext([x, RY_, -1.25], [x, RY_, 0.6], 0.04, 0.12);
      for (const z of [-1.25, 0.6]) sim.rbox(T(x, RY_, z + (z < 0 ? -0.004 : 0.004)), 0.044, 0.124, 0.008, COL.dark, 0.003);
      for (const z of [-1.18, 0.53]) sim.cyl(T(x, 0.008, z), 0.026, 0.016, '#0a0a0c', 20);
      sim.rbox(T(x + (x < SX ? -0.0215 : 0.0215), RY_ + 0.03, -0.3), 0.003, 0.012, 0.9, RED, 0.001);   // Scuderia stripe
    }
    for (const z of [-1.15, -0.65, 0.45]) ext([SX - RX_ + 0.02, 0.05, z], [SX + RX_ - 0.02, 0.05, z], 0.08, 0.04);
    for (const x of [SX - RX_, SX + RX_]) for (const z of [-1.15, -0.65, 0.45]) {
      sim.rbox(T(x, 0.1, z), 0.06, 0.012, 0.06, COL.dark, 0.003);
      bolt(x - 0.015, 0.108, z - 0.015, 1); bolt(x + 0.015, 0.108, z + 0.015, 1);
    }

    // ---- shared pillars: wheel deck + monitor stand
    for (const x of [SX - RX_, SX + RX_]) {
      ext([x, 0.13, -0.65], [x, 0.82, -0.65], 0.04, 0.09);
      sim.rbox(T(x, 0.13, -0.65), 0.06, 0.012, 0.11, COL.dark, 0.003);
      for (let i = 0; i < 4; i++) bolt(x + (x < SX ? -0.0215 : 0.0215), 0.2 + i * 0.18, -0.65, 0);
    }
    // wheel deck
    ext([SX - RX_, 0.7, -0.65], [SX + RX_, 0.7, -0.65], 0.04, 0.09);
    sim.rbox(T(SX, 0.752, -0.62), 0.34, 0.014, 0.24, COL.black, 0.005);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt(SX + sx * 0.15, 0.762, -0.62 + sz * 0.1, 1);
    sim.rbox(T(SX, 0.775, -0.62), 0.12, 0.03, 0.22, COL.dark, 0.006);
    // direct-drive motor
    sim.cyl(C(T(SX, 0.835, -0.62), RX(PI / 2)), 0.075, 0.26, COL.black, 32);
    for (let i = 0; i < 12; i++) sim.rbox(C(T(SX, 0.835, -0.62), RX(PI / 2), RY(i * PI / 6), T(0.077, 0, 0)), 0.006, 0.22, 0.012, COL.dark, 0.002);
    sim.cyl(C(T(SX, 0.835, -0.48), RX(PI / 2)), 0.082, 0.025, COL.alu, 32);
    sim.cyl(C(T(SX, 0.835, -0.466), RX(PI / 2)), 0.05, 0.005, '#38bdf8', 32, MAT.EMIT);
    for (const z of [-0.72, -0.56]) sim.rbox(T(SX, 0.835, z), 0.17, 0.17, 0.008, COL.aluDark, 0.004);
    sim.rbox(T(SX, 0.84, -0.752), 0.05, 0.062, 0.004, YEL, 0.001);                     // Ferrari shield
    sim.rbox(T(SX, 0.845, -0.755), 0.034, 0.046, 0.002, COL.black, 0.001);

    // ---- pedal tray: slides on its own rails, flat plate, load-cell pedals
    for (const x of [SX - 0.2, SX + 0.2]) ext([x, 0.12, -1.18], [x, 0.12, -0.78], 0.04, 0.04);
    ext([SX - 0.2, 0.12, -0.95], [SX + 0.2, 0.12, -0.95], 0.05, 0.03);
    const tray = T(SX, 0.2, -1.0);
    sim.rbox(tray, 0.52, 0.014, 0.34, COL.black, 0.005);
    sim.rbox(C(tray, T(0, 0.009, 0.0)), 0.5, 0.004, 0.32, '#303239', 0.002);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt(SX + sx * 0.22, 0.2, -1.0 + sz * 0.14, 1);
    for (const [px, face, col] of [[-0.14, 0.07, COL.aluDark], [0, 0.08, COL.aluDark], [0.14, 0.08, COL.aluDark]]) {
      const base = C(tray, T(px, 0.01, -0.04));
      sim.rbox(C(base, T(0, 0.012, 0.08)), 0.06, 0.024, 0.11, COL.dark, 0.006);
      const arm = C(base, T(0, 0.03, 0.14), RX(-0.4));
      sim.rbox(C(arm, T(0, 0.12, 0)), 0.022, 0.24, 0.022, col, 0.004);
      sim.rbox(C(arm, T(0, 0.22, 0.015)), face, 0.11, 0.01, COL.alu, 0.004);
      for (let i = 0; i < 5; i++) sim.box(C(arm, T(0, 0.19 + i * 0.016, 0.022)), face * 0.85, 0.004, 0.002, COL.groove);
      sim.tube(base, [0, 0.04, 0.2], [0, 0.14, 0.1], 0.014, px > 0 ? RED : COL.dark, 14);
    }

    // ---- seat slider + Sparco-style bucket seat
    for (const x of [SX - 0.17, SX + 0.17]) {
      ext([x, 0.1, -0.05], [x, 0.1, 0.52], 0.04, 0.03);
      sim.rbox(T(x, 0.125, 0.12), 0.05, 0.02, 0.26, COL.aluDark, 0.005);
    }
    sim.rbox(T(SX, 0.157, 0.12), 0.4, 0.02, 0.34, COL.black, 0.008);
    const seat = T(SX, 0.19, 0.12);
    const fab = '#171a22', rib = '#242a38', stitch = RED;
    // one-piece bucket: seat pan, side bolsters, high back with graduated wings, headrest, harness slots
    const SH = '#101114';
    sim.rbox(C(seat, T(0, 0.04, -0.02)), 0.46, 0.08, 0.46, SH, 0.04);
    sim.rbox(C(seat, T(0, 0.088, -0.04)), 0.3, 0.03, 0.38, fab, 0.012);
    sim.rbox(C(seat, T(0, 0.098, -0.21)), 0.28, 0.03, 0.09, fab, 0.012);
    for (const sg of [-1, 1]) {
      sim.rbox(C(seat, T(sg * 0.195, 0.105, -0.02), RZ(-sg * 0.08)), 0.07, 0.09, 0.4, SH, 0.03);
      sim.rbox(C(seat, T(sg * 0.185, 0.085, -0.25)), 0.08, 0.06, 0.08, SH, 0.025);
      sim.tube(seat, [sg * 0.15, 0.106, -0.24], [sg * 0.15, 0.106, 0.12], 0.0025, stitch, 6);
      sim.rbox(C(seat, T(sg * 0.235, 0.04, -0.02)), 0.014, 0.08, 0.3, COL.alu, 0.004);
    }
    const back = C(seat, T(0, 0.08, 0.2), RX(0.2));
    sim.rbox(C(back, T(0, 0.46, 0.0)), 0.47, 0.94, 0.03, SH, 0.02);
    sim.rbox(C(back, T(0, 0.43, -0.02)), 0.3, 0.7, 0.014, fab, 0.006);
    for (let i = 0; i < 13; i++) sim.rbox(C(back, T(0, 0.12 + i * 0.05, -0.029)), 0.29, 0.006, 0.003, rib, 0.001);
    const prof = [[0.04, 0.2, 0.12], [0.1, 0.205, 0.13], [0.17, 0.21, 0.13], [0.24, 0.215, 0.11], [0.3, 0.225, 0.08], [0.36, 0.235, 0.05],
      [0.42, 0.235, 0.045], [0.48, 0.23, 0.05], [0.54, 0.22, 0.07], [0.6, 0.2, 0.11], [0.66, 0.185, 0.14], [0.72, 0.175, 0.15],
      [0.78, 0.17, 0.14], [0.84, 0.17, 0.1], [0.9, 0.17, 0.05]];
    for (const [y, xw, d] of prof) for (const sg of [-1, 1]) {
      sim.rbox(C(back, T(sg * xw, y, -d / 2 + 0.01)), 0.05, 0.07, d, SH, 0.02);
      sim.rbox(C(back, T(sg * (xw - 0.028), y, -d / 2 + 0.005)), 0.006, 0.066, d - 0.012, fab, 0.002);
    }
    for (const sg of [-1, 1]) {
      sim.box(C(back, T(sg * 0.1, 0.56, -0.034)), 0.07, 0.035, 0.006, '#050506');
      sim.box(C(back, T(sg * 0.1, 0.12, -0.034)), 0.07, 0.035, 0.006, '#050506');
      sim.tube(back, [sg * 0.15, 0.1, -0.034], [sg * 0.15, 0.58, -0.034], 0.003, stitch, 6);
    }
    sim.rbox(C(back, T(0, 0.72, -0.045)), 0.26, 0.19, 0.04, fab, 0.016);
    sim.rbox(C(back, T(0, 0.745, -0.068)), 0.13, 0.022, 0.004, stitch, 0.001);
    sim.rbox(C(back, T(0, 0.715, -0.068)), 0.13, 0.008, 0.004, '#f2f2f2', 0.001);
    sim.rbox(C(back, T(0, 0.96, 0.0)), 0.36, 0.045, 0.034, SH, 0.018);

    // ---- triple-monitor stand: beams run back from the shared pillars, posts and crossbar hold the screens from behind
    const SZ = -1.13;
    for (const x of [SX - RX_, SX + RX_]) {
      ext([x, 0.8, -0.65], [x, 0.8, SZ], 0.04, 0.05);
      ext([x, 0.8, SZ], [x, 1.32, SZ], 0.04, 0.05);
      for (const z of [-0.65, SZ]) sim.rbox(T(x, 0.8, z), 0.06, 0.07, 0.06, COL.dark, 0.006);
    }
    ext([SX - 0.7, 1.06, SZ - 0.01], [SX + 0.7, 1.06, SZ - 0.01], 0.05, 0.04);
    for (const sx of [-1, 1]) sim.rbox(T(SX + sx * 0.7, 1.06, SZ - 0.01), 0.012, 0.055, 0.045, COL.dark, 0.004);
    const Wd = 0.68, H = 0.39, y = 1.06, z = -1.0, a = 0.78;
    const scr = t => {
      sim.rbox(C(t, T(0, 0, -0.016)), Wd + 0.012, H + 0.012, 0.03, COL.bezel, 0.006);
      sim.rbox(C(t, T(0, 0, -0.04)), Wd - 0.06, H - 0.06, 0.03, COL.dark, 0.01);
      sim.rbox(C(t, T(0, 0, -0.058)), 0.2, 0.2, 0.012, COL.black, 0.01);                // back hump
      for (let i = 0; i < 5; i++) sim.box(C(t, T(0, -0.06 + i * 0.03, -0.065)), 0.16, 0.003, 0.002, GRV);
      sim.rbox(C(t, T(0, 0, -0.07)), 0.1, 0.1, 0.012, COL.aluDark, 0.004);               // VESA plate
    };
    const scrs = [
      [C(T(SX - Wd / 2 - Wd / 2 * Math.cos(a) - 0.004, y, z + Wd / 2 * Math.sin(a)), RY(a)), 0],
      [T(SX, y, z), 1],
      [C(T(SX + Wd / 2 + Wd / 2 * Math.cos(a) + 0.004, y, z + Wd / 2 * Math.sin(a)), RY(-a)), 2]];
    for (const [t, i] of scrs) {
      scr(t);
      sim.quad(t, Wd, H, '#ffffff', MAT.RACE, [i / 3, (i + 1) / 3, 0, 1]);
      const p = xf(t, [0, 0, -0.076]);                                                    // arm: VESA plate -> crossbar
      sim.tube(I(), p, [p[0], 1.06, SZ - 0.01], 0.014, COL.aluDark, 14);
    }
    sim.rbox(T(SX, 1.06, SZ + 0.01), 0.1, 0.1, 0.025, COL.aluDark, 0.006);
  }
  // formula-style wheel, turns with the road on the screens
  const wheel = node('sim', { update(t, s) { this.model = C(T(SX, 0.835, -0.43), RZ(-s.steer * 1.1)); } });
  wheel.cyl(C(T(0, 0, -0.025), RX(PI / 2)), 0.03, 0.04, COL.alu, 12);
  wheel.rbox(T(0, 0, 0), 0.24, 0.12, 0.03, COL.carbon, 0.012);
  for (const sg of [-1, 1]) {
    wheel.rbox(C(T(sg * 0.135, -0.01, 0.005), RZ(-sg * 0.12)), 0.055, 0.17, 0.05, COL.black, 0.02);
    wheel.rbox(C(T(sg * 0.07, 0.02, -0.03), RZ(sg * 0.2)), 0.07, 0.11, 0.006, COL.alu, 0.003);    // paddles
  }
  wheel.rbox(T(0, 0.01, 0.017), 0.075, 0.045, 0.006, COL.bezel, 0.003);
  wheel.quad(T(0, 0.01, 0.0205), 0.068, 0.038, '#ffffff', MAT.RACE, [0.42, 0.58, 0.25, 0.75]);
  for (let i = 0; i < 9; i++) wheel.box(T(-0.048 + i * 0.012, 0.05, 0.017), 0.008, 0.006, 0.004, i < 3 ? COL.green : i < 6 ? COL.red : COL.blue, MAT.LED);
  [[-0.07, 0.025, COL.red], [-0.07, -0.015, COL.yellow], [0.07, 0.025, COL.blue], [0.07, -0.015, COL.green], [-0.04, -0.04, COL.white], [0.04, -0.04, COL.white]]
    .forEach(([bx, by, c]) => wheel.cyl(C(T(bx, by, 0.018), RX(PI / 2)), 0.008, 0.008, c, 8));

  /* ================= neon sign ================= */
  const glow = node('me', { blend: true, noShadow: true });
  glow.quad(T(SX, 1.97, z0 + 0.012), 1.5, 0.375, '#ffffff', MAT.NEON, [0.004, 0.996, 0.504, 0.996]);
  const sign = node('me', { noShadow: true });
  sign.quad(T(SX, 1.97, z0 + 0.024), 1.125, 0.375, '#0a0a0c', MAT.MASK, [0.254, 0.996, 0.004, 0.496]);

  /* ================= server rack ================= */
  const rack = node('rack');
  {
    const x = RKX, z = -1.45, F = -1.175;
    for (const sx of [-0.285, 0.285]) rack.rbox(T(x + sx, 0.67, z), 0.03, 1.26, 0.6, '#16171c', 0.006);
    rack.rbox(T(x, 1.285, z), 0.6, 0.03, 0.6, '#16171c', 0.006);
    rack.rbox(T(x, 0.055, z), 0.6, 0.03, 0.6, '#16171c', 0.006);
    rack.box(T(x, 0.67, -1.735), 0.54, 1.22, 0.01, '#0e0f12');
    for (const sx of [-0.255, 0.255]) rack.rbox(T(x + sx, 0.67, F + 0.005), 0.03, 1.22, 0.02, COL.alu, 0.004);
    for (const [sx, sz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) rack.cyl(T(x + sx, 0.02, z + sz), 0.02, 0.04, COL.dark, 8);
    for (let i = 0; i < 6; i++) rack.box(T(x + 0.15, 1.301, z - 0.2 + i * 0.07), 0.2, 0.002, 0.015, '#050506');  // top vents

    const U = 0.0445;
    let y = 0.075;
    const unit = (u, col) => {
      const cy = y + u * U / 2;
      rack.rbox(T(x, cy, z + 0.03), 0.46, u * U - 0.004, 0.5, col, 0.003);
      for (const sg of [-1, 1]) rack.box(T(x + sg * 0.24, cy, F + 0.002), 0.03, u * U - 0.006, 0.004, COL.alu);  // rack ears
      y += u * U; return cy;
    };
    const led = (lx, ly, c, size = 0.008) => rack.box(T(x + lx, ly, F + 0.007), size, size, 0.006, c, MAT.LED);
    const blank = () => { const cy = unit(1, '#1f2026'); for (let i = 0; i < 10; i++) rack.box(T(x - 0.15 + i * 0.033, cy, F + 0.004), 0.02, 0.012, 0.002, '#0a0a0c'); };

    let cy = unit(2, '#2a2b31');                                                     // UPS
    rack.quad(T(x - 0.12, cy, F + 0.006), 0.08, 0.035, '#1e6bd6', MAT.EMIT);
    led(0.18, cy, COL.green); led(0.16, cy, COL.green);
    blank();
    cy = unit(4, '#3a3d45');                                                         // NAS
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
      const bx = -0.18 + c * 0.072, by = cy - 0.04 + r * 0.08;
      rack.rbox(T(x + bx, by, F + 0.004), 0.064, 0.07, 0.008, '#555a64', 0.002);
      rack.box(T(x + bx, by - 0.022, F + 0.009), 0.04, 0.008, 0.004, COL.alu);
      led(bx + 0.022, by + 0.026, c % 3 ? COL.blue : COL.green, 0.006);
    }
    for (let s = 0; s < 2; s++) {                                                     // 2U servers
      cy = unit(2, '#43464f');
      rack.rbox(T(x, cy, F + 0.004), 0.34, 0.075, 0.008, '#1c1d22', 0.003);
      rack.box(T(x, cy - 0.03, F + 0.009), 0.3, 0.004, 0.004, COL.blue, MAT.EMIT);
      for (let c = 0; c < 8; c++) rack.box(T(x - 0.14 + c * 0.04, cy + 0.008, F + 0.009), 0.03, 0.04, 0.002, '#2c2e35');
      for (let c = 0; c < 4; c++) led(-0.215 + c * 0.012, cy + 0.02, c === 3 ? COL.amber : COL.green, 0.006);
    }
    blank();
    cy = unit(1, '#d5d9df');                                                         // switch
    for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) {
      const bx = -0.17 + c * 0.026 + (c > 5 ? 0.02 : 0);
      rack.box(T(x + bx, cy - 0.009 + r * 0.018, F + 0.003), 0.018, 0.013, 0.006, '#2a2c31');
      led(bx + 0.006, cy - 0.003 + r * 0.018, (c + r) % 4 ? COL.green : COL.amber, 0.004);
    }
    cy = unit(1, '#121317');                                                         // cable manager
    for (let i = 0; i < 5; i++) rack.rbox(T(x - 0.16 + i * 0.08, cy, F + 0.02), 0.02, 0.035, 0.04, COL.dark, 0.004);
    cy = unit(1, '#1b1c21');                                                         // patch panel
    const cables = [COL.blue, COL.amber, COL.red, COL.green, COL.white, COL.blue];
    for (let c = 0; c < 12; c++) {
      const bx = -0.17 + c * 0.03;
      rack.box(T(x + bx, cy, F + 0.004), 0.016, 0.014, 0.008, '#3a3c43');
      if (c % 2 === 0) {
        const cc = cables[c / 2];
        rack.tube(I(), [x + bx, cy, F + 0.01], [x + bx, cy - 0.02, F + 0.05], 0.004, cc, 4);
        rack.tube(I(), [x + bx, cy - 0.02, F + 0.05], [x + bx + 0.01, cy - 0.11, F + 0.04], 0.004, cc, 4);
      }
    }
    blank();
    cy = unit(3, '#16171b');                                                          // shelf of mini PCs
    for (let c = 0; c < 3; c++) {
      rack.rbox(T(x - 0.14 + c * 0.14, cy - 0.03, z + 0.1), 0.11, 0.045, 0.11, c === 1 ? '#c9ccd3' : '#2c2f36', 0.008);
      led(-0.14 + c * 0.14 + 0.04, cy - 0.04, COL.blue, 0.005);
    }
    cy = unit(1, '#26282f');                                                          // router
    for (let c = 0; c < 4; c++) led(0.1 + c * 0.02, cy, COL.green, 0.005);
    blank(); blank();
    // monitor + keyboard on top: admin console
    const tz = z - 0.08, top = 1.3;
    rack.rbox(T(x, top + 0.006, tz), 0.2, 0.012, 0.14, COL.dark, 0.004);
    rack.rbox(T(x, top + 0.09, tz - 0.02), 0.04, 0.17, 0.03, COL.dark, 0.006);
    rack.rbox(T(x, top + 0.29, tz - 0.04), 0.56, 0.32, 0.025, COL.bezel, 0.006);
    rack.quad(T(x, top + 0.29, tz - 0.0265), 0.53, 0.29, '#ffffff', MAT.CODE, [0, 0.4, 0, 0.45]);
    rack.rbox(T(x, top + 0.012, tz + 0.2), 0.36, 0.02, 0.12, COL.dark, 0.006);
    rack.quad(C(T(x, top + 0.0225, tz + 0.2), RX(-PI / 2)), 0.34, 0.1, [.15, .15, .15], MAT.RGB);
    rack.rbox(T(x + 0.26, top + 0.01, tz + 0.2), 0.05, 0.016, 0.08, COL.white, 0.008);
  }

  /* ================= standing electronics bench (island) ================= */
  const bench = node('bench', { model: BM });
  {
    const L = 1.8, Dp = 0.7, x0b = BX - L / 2, back = BZ - Dp / 2;
    bench.rbox(T(BX, BY - 0.02, BZ), L, 0.04, Dp, COL.white, 0.012);
    for (const lx of [BX - L / 2 + 0.1, BX + L / 2 - 0.1]) {
      bench.rbox(T(lx, 0.015, BZ), 0.08, 0.03, Dp - 0.06, COL.alu, 0.01);
      bench.rbox(T(lx, 0.3, BZ), 0.09, 0.56, 0.065, COL.alu, 0.008);
      bench.rbox(T(lx, 0.78, BZ), 0.075, 0.5, 0.055, COL.alu, 0.008);
      bench.rbox(T(lx, BY - 0.055, BZ), 0.06, 0.03, Dp - 0.1, COL.aluDark, 0.006);
    }
    bench.rbox(T(BX, BY - 0.07, BZ - 0.15), L - 0.3, 0.04, 0.06, COL.aluDark, 0.008);
    bench.rbox(T(BX, 0.3, BZ), L - 0.25, 0.025, Dp - 0.1, COL.white, 0.008);                 // lower shelf
    [[-0.55, '#2b2e35'], [-0.15, '#5f86ad'], [0.25, '#e6e7ea']].forEach(([o, c]) => {
      bench.rbox(T(BX + o, 0.4, BZ), 0.34, 0.17, 0.42, c, 0.02);
      bench.rbox(T(BX + o, 0.42, BZ + 0.212), 0.1, 0.03, 0.01, COL.white, 0.004);
    });
    // riser: posts, pegboard, top shelf, LED bar
    for (const lx of [x0b + 0.03, x0b + L - 0.03]) prof(bench, [lx, BY, back + 0.03], [lx, BY + 0.62, back + 0.03], 0.02);
    bench.rbox(T(BX, BY + 0.27, back + 0.02), L - 0.08, 0.42, 0.012, COL.offwhite, 0.003);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 26; c++) bench.box(T(x0b + 0.1 + c * 0.062, BY + 0.1 + r * 0.06, back + 0.027), 0.006, 0.006, 0.002, '#9aa0a8');
    bench.rbox(T(BX, BY + 0.62, back + 0.1), L, 0.025, 0.22, COL.white, 0.006);
    bench.box(T(BX, BY + 0.604, back + 0.16), L - 0.1, 0.008, 0.03, '#fff4e0', MAT.EMIT);
    // tools on the pegboard
    for (let i = 0; i < 12; i++) {
      const tx = x0b + 0.15 + i * 0.13, len = 0.12 + (i % 3) * 0.05;
      bench.box(T(tx, BY + 0.43 - len / 2, back + 0.035), 0.016, len, 0.01, '#9ca3af');
      bench.rbox(T(tx, BY + 0.45, back + 0.04), 0.03, 0.07, 0.02, ['#ff7a1a', '#2b2e35', '#5f86ad'][i % 3], 0.006);
    }
    // filament spools stacked on the lower shelf, under the table
    for (const [zo, n] of [[-0.14, 3], [0.14, 3]]) for (let i = 0; i < n; i++) {
      const c = ['#ff7a1a', '#f4f5f7', '#5f86ad'][(i + (zo > 0 ? 1 : 0)) % 3], sp = T(BX + 0.6, 0.3125 + 0.037 + i * 0.075, BZ + zo);
      bench.cyl(sp, 0.1, 0.07, c, 16);
      bench.cyl(sp, 0.035, 0.075, COL.dark, 10);
    }
    bench.rbox(T(BX + 0.72, BY + 0.71, back + 0.1), 0.3, 0.16, 0.18, COL.offwhite, 0.008);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
      bench.rbox(T(BX + 0.615 + c * 0.07, BY + 0.66 + r * 0.05, back + 0.192), 0.06, 0.04, 0.006, ['#5f86ad', '#d8dadf', '#d8dadf', '#ff7a1a'][(r + c) % 4], 0.003);

    // 3D printer, enclosed core-xy style
    {
      const px = BX - 0.6, pz = BZ + 0.05, w = 0.4;
      bench.rbox(T(px, BY + 0.05, pz), w, 0.1, w, COL.offwhite, 0.012);
      bench.quad(T(px - 0.1, BY + 0.05, pz + w / 2 + 0.001), 0.1, 0.05, '#7fb2e5', MAT.EMIT);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bench.rbox(T(px + sx * (w / 2 - 0.012), BY + 0.29, pz + sz * (w / 2 - 0.012)), 0.024, 0.4, 0.024, COL.offwhite, 0.006);
      bench.rbox(T(px, BY + 0.5, pz), w, 0.025, w, COL.offwhite, 0.008);
      bench.rbox(T(px, BY + 0.11, pz), 0.3, 0.012, 0.3, '#3f3f46', 0.003);
      bench.box(T(px, BY + 0.29, pz - w / 2 + 0.005), w - 0.05, 0.38, 0.004, '#2a2d34');            // back panel
      bench.box(T(px, BY + 0.48, pz + 0.08), w - 0.06, 0.006, 0.006, '#fff7e6', MAT.EMIT);         // chamber light
    }
    // small plant
    bench.cyl(T(BX + 0.78, BY + 0.05, BZ + 0.22), 0.045, 0.1, COL.offwhite, 10, 0, 0.055);
    for (let i = 0; i < 6; i++) bench.rbox(C(T(BX + 0.78, BY + 0.1, BZ + 0.22), RY(i * 1.1), RX(0.5), T(0, 0.06, 0)), 0.025, 0.12, 0.004, '#3f9a5c', 0.002);
    // bench power supply
    bench.rbox(T(BX - 0.2, BY + 0.06, back + 0.15), 0.2, 0.12, 0.2, '#30333b', 0.01);
    bench.quad(T(BX - 0.24, BY + 0.08, back + 0.251), 0.07, 0.03, '#ff7a1a', MAT.EMIT);
    bench.quad(T(BX - 0.16, BY + 0.08, back + 0.251), 0.07, 0.03, '#ffffff', MAT.EMIT);
    for (const [kx, c] of [[-0.25, '#9aa0a8'], [-0.2, COL.black], [-0.15, '#9aa0a8']]) bench.cyl(C(T(BX + kx, BY + 0.035, back + 0.255), RX(PI / 2)), 0.009, 0.012, c, 8);
    // oscilloscope
    bench.rbox(T(BX + 0.12, BY + 0.09, back + 0.15), 0.3, 0.17, 0.16, COL.offwhite, 0.012);
    bench.rbox(T(BX + 0.08, BY + 0.095, back + 0.231), 0.19, 0.12, 0.004, COL.bezel, 0.003);
    bench.quad(T(BX + 0.08, BY + 0.095, back + 0.234), 0.18, 0.11, '#ffffff', MAT.SCOPE);
    for (let i = 0; i < 4; i++) bench.cyl(C(T(BX + 0.22, BY + 0.05 + i * 0.03, back + 0.235), RX(PI / 2)), 0.008, 0.01, COL.dark, 8);
    // soldering station + iron + helping hands + PCB + multimeter
    bench.rbox(T(BX + 0.45, BY + 0.045, BZ), 0.14, 0.09, 0.14, '#5f86ad', 0.01);
    bench.quad(T(BX + 0.45, BY + 0.06, BZ + 0.071), 0.07, 0.03, '#ff7a1a', MAT.EMIT);
    bench.cyl(C(T(BX + 0.62, BY + 0.06, BZ - 0.05), RX(0.7)), 0.022, 0.1, COL.alu, 10);
    bench.tube(I(), [BX + 0.62, BY + 0.03, BZ - 0.08], [BX + 0.62, BY + 0.15, BZ + 0.04], 0.008, COL.dark, 6);
    bench.rbox(T(BX + 0.2, BY + 0.005, BZ + 0.15), 0.14, 0.01, 0.14, COL.dark, 0.004);
    bench.tube(I(), [BX + 0.2, BY, BZ + 0.15], [BX + 0.2, BY + 0.16, BZ + 0.15], 0.004, COL.alu, 5);
    for (const s of [-1, 1]) bench.tube(I(), [BX + 0.2, BY + 0.16, BZ + 0.15], [BX + 0.2 + s * 0.08, BY + 0.1, BZ + 0.15], 0.003, COL.alu, 5);
    bench.box(T(BX + 0.2, BY + 0.1, BZ + 0.15), 0.12, 0.004, 0.07, '#27302b');
    for (let i = 0; i < 3; i++) bench.box(T(BX + 0.17 + i * 0.03, BY + 0.105, BZ + 0.14), 0.016, 0.006, 0.016, COL.black);
    bench.box(T(BX + 0.23, BY + 0.104, BZ + 0.17), 0.005, 0.005, 0.005, '#ffffff', MAT.LED);
    bench.rbox(C(T(BX - 0.05, BY + 0.015, BZ + 0.2), RY(0.3)), 0.09, 0.03, 0.16, '#f2b84b', 0.01);
    bench.quad(C(T(BX - 0.05, BY + 0.031, BZ + 0.2), RY(0.3), RX(-PI / 2), T(0, 0.03, 0)), 0.06, 0.04, '#9ca3af', MAT.EMIT);
    // robots on the top shelf: a little biped, a quadruped, a round bot
    {
      const sy = BY + 0.632, sz = back + 0.1;
      const bp = T(BX + 0.2, sy, sz);
      for (const s of [-1, 1]) {
        bench.rbox(C(bp, T(s * 0.025, 0.045, 0)), 0.025, 0.09, 0.03, COL.dark, 0.006);
        bench.rbox(C(bp, T(s * 0.025, 0.006, 0.01)), 0.035, 0.012, 0.055, COL.white, 0.004);
        bench.rbox(C(bp, T(s * 0.065, 0.14, 0)), 0.02, 0.08, 0.022, COL.dark, 0.006);
      }
      bench.rbox(C(bp, T(0, 0.13, 0)), 0.1, 0.09, 0.06, COL.white, 0.015);
      bench.rbox(C(bp, T(0, 0.21, 0)), 0.075, 0.06, 0.06, COL.white, 0.018);
      for (const s of [-1, 1]) bench.box(C(bp, T(s * 0.017, 0.212, 0.031)), 0.012, 0.012, 0.004, '#7fe0ff', MAT.EMIT);
      const qp = T(BX - 0.1, sy, sz);
      bench.rbox(C(qp, T(0, 0.1, 0)), 0.2, 0.05, 0.08, '#f4f5f7', 0.015);
      bench.rbox(C(qp, T(0.12, 0.11, 0)), 0.05, 0.04, 0.06, COL.dark, 0.01);
      for (const [lx, lz] of [[-0.07, -1], [0.07, -1], [-0.07, 1], [0.07, 1]]) {
        bench.tube(qp, [lx, 0.09, lz * 0.04], [lx + 0.03, 0.05, lz * 0.045], 0.008, COL.dark, 5);
        bench.tube(qp, [lx + 0.03, 0.05, lz * 0.045], [lx, 0.003, lz * 0.045], 0.007, '#5f86ad', 5);
      }
      const rb = T(BX + 0.42, sy, sz);
      bench.cyl(C(rb, T(0, 0.05, 0)), 0.05, 0.08, COL.white, 14, 0, 0.04);
      bench.cyl(C(rb, T(0, 0.095, 0)), 0.04, 0.012, COL.dark, 14);
      bench.box(C(rb, T(0, 0.06, 0.047)), 0.04, 0.012, 0.004, '#ff7a1a', MAT.EMIT);
    }
    // battle robot (wedge + horizontal spinner) and a quadcopter on the top shelf
    {
      const sy = BY + 0.632, sz = back + 0.1;
      const br = T(BX - 0.64, sy, sz);
      bench.rbox(C(br, T(0, 0.045, 0)), 0.2, 0.04, 0.14, '#2b2e35', 0.008);
      bench.rbox(C(br, T(0.115, 0.03, 0), RZ(-0.35)), 0.09, 0.012, 0.14, '#d8dadf', 0.004);
      bench.rbox(C(br, T(-0.02, 0.075, 0)), 0.12, 0.02, 0.1, '#9aa0a8', 0.006);
      bench.cyl(C(br, T(-0.02, 0.095, 0)), 0.008, 0.02, COL.dark, 8);
      bench.rbox(C(br, T(-0.02, 0.108, 0)), 0.2, 0.012, 0.028, '#ff7a1a', 0.004);
      for (const [wx, wz] of [[-0.07, -1], [0.07, -1], [-0.07, 1], [0.07, 1]])
        bench.cyl(C(br, T(wx, 0.03, wz * 0.08), RX(PI / 2)), 0.03, 0.02, COL.dark, 12);
      const qd = T(BX - 0.38, sy, sz);
      bench.rbox(C(qd, T(0, 0.05, 0)), 0.07, 0.025, 0.07, '#f4f5f7', 0.01);
      bench.box(C(qd, T(0, 0.066, 0.036)), 0.02, 0.006, 0.004, '#ff7a1a', MAT.EMIT);
      bench.cyl(C(qd, T(0, 0.03, 0.03), RX(PI / 2)), 0.012, 0.02, COL.dark, 8);
      for (const [mx, mz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const p = [mx * 0.075, 0.055, mz * 0.075];
        bench.tube(qd, [0, 0.055, 0], p, 0.006, '#2b2e35', 5);
        bench.cyl(C(qd, T(...p)), 0.012, 0.022, COL.dark, 8);
        bench.box(C(qd, T(p[0], 0.072, p[2]), RY(mx * mz * 0.8)), 0.1, 0.002, 0.012, '#c9ccd2');
        bench.box(C(qd, T(p[0], 0.072, p[2]), RY(mx * mz * 0.8 + PI / 2)), 0.1, 0.002, 0.012, '#c9ccd2');
        bench.tube(qd, [mx * 0.03, 0.04, mz * 0.03], [mx * 0.04, 0.008, mz * 0.04], 0.004, '#2b2e35', 4);
      }
    }
    // tall bar chair
    {
      const bc = C(T(BX - 0.15, 0, BZ + 0.62), RY(-0.3));
      bench.cyl(C(bc, T(0, 0.01, 0)), 0.22, 0.02, COL.alu, 18);
      bench.cyl(C(bc, T(0, 0.38, 0)), 0.03, 0.74, COL.alu, 10);
      bench.torus(C(bc, T(0, 0.3, 0), RX(PI / 2)), 0.18, 0.01, COL.alu, 20, 4);
      for (let k = 0; k < 4; k++) bench.tube(bc, [0, 0.3, 0], [Math.cos(k * PI / 2) * 0.18, 0.3, Math.sin(k * PI / 2) * 0.18], 0.007, COL.alu, 4);
      bench.cyl(C(bc, T(0, 0.78, 0)), 0.2, 0.05, COL.white, 20);
      bench.cyl(C(bc, T(0, 0.808, 0)), 0.19, 0.008, COL.offwhite, 20);
    }
  }
  // printer moving parts
  const PX = BX - 0.6, PZ = BZ + 0.05, BED = BY + 0.118, CYCLE = 30;
  const grow = t => (t % CYCLE) / CYCLE;
  const head = t => [0.08 * Math.sin(t * 3.1), BED + grow(t) * 0.14 + 0.035, 0.08 * Math.sin(t * 2.3 + 1)];
  node('bench', { update(t) { this.model = C(BM, T(PX, BED, PZ), S(1, grow(t) * 0.14 + 0.001, 1)); } })
    .cyl(T(0, 0.5, 0), 0.045, 1, '#f4f5f7', 16, 0, 0.065);
  node('bench', { update(t) { const h = head(t); this.model = C(BM, T(PX, h[1] + 0.035, PZ + h[2])); } })
    .rbox(I(), 0.37, 0.018, 0.025, COL.alu, 0.004);
  node('bench', { update(t) { const h = head(t); this.model = C(BM, T(PX + h[0], h[1], PZ + h[2])); } })
    .rbox(T(0, 0.02, 0), 0.06, 0.065, 0.06, COL.white, 0.01)
    .cyl(C(T(0, 0.025, 0.031), RX(PI / 2)), 0.018, 0.004, COL.dark, 10)
    .cyl(T(0, -0.02, 0), 0.008, 0.02, COL.orange, 6, MAT.EMIT, 0.002);

  // robot arm
  const AB = [BX + 0.62, BY, BZ + 0.2];
  const armA = t => C(BM, T(...AB), RY(Math.sin(t * 0.6) * 1.2));
  const armB = t => C(armA(t), T(0, 0.075, 0), RX(-0.4 + 0.35 * Math.sin(t * 0.9)));
  const armC = t => C(armB(t), T(0, 0.15, 0), RX(0.9 + 0.4 * Math.sin(t * 1.1 + 1)));
  const armD = t => C(armC(t), T(0, 0.12, 0), RX(0.5 * Math.sin(t * 1.7)));
  bench.cyl(T(AB[0], BY + 0.015, AB[2]), 0.055, 0.03, COL.dark, 14);
  node('bench', { update(t) { this.model = armA(t); } })
    .cyl(T(0, 0.045, 0), 0.04, 0.03, COL.orange, 14)
    .rbox(T(0, 0.07, 0), 0.06, 0.025, 0.045, COL.dark, 0.006);
  node('bench', { update(t) { this.model = armB(t); } })
    .rbox(T(0, 0.075, 0), 0.032, 0.15, 0.032, COL.orange, 0.008)
    .cyl(RZ(PI / 2), 0.022, 0.05, COL.dark, 12)
    .cyl(C(T(0, 0.15, 0), RZ(PI / 2)), 0.02, 0.046, COL.dark, 12);
  node('bench', { update(t) { this.model = armC(t); } })
    .rbox(T(0, 0.06, 0), 0.026, 0.12, 0.026, COL.orange, 0.006)
    .cyl(C(T(0, 0.12, 0), RZ(PI / 2)), 0.015, 0.036, COL.dark, 10);
  node('bench', { update(t) { this.model = armD(t); } })
    .rbox(T(0, 0.015, 0), 0.04, 0.02, 0.025, COL.dark, 0.005)
    .rbox(T(-0.014, 0.045, 0), 0.007, 0.04, 0.016, COL.alu, 0.002)
    .rbox(T(0.014, 0.045, 0), 0.007, 0.04, 0.016, COL.alu, 0.002);

  // rover bot patrolling the floor
  const rover = { x: 0, z: 0 };
  const rv = node('robot', {
    update(t) {
      const s = t * 0.22, cx = 1.6, cz = 2.3, rx = 1.5, rz = 0.9;
      rover.x = cx + rx * Math.cos(s); rover.z = cz + rz * Math.sin(s);
      this.model = C(T(rover.x, 0, rover.z), RY(Math.atan2(-rx * Math.sin(s), rz * Math.cos(s))));
    },
  });
  const YEL = '#facc15';
  rv.cyl(T(0, 0.045, 0), 0.105, 0.075, YEL, 28);
  rv.cyl(T(0, 0.1, 0), 0.105, 0.012, '#eab308', 28, 0, 0.095);
  rv.cyl(T(0, 0.118, 0), 0.07, 0.025, YEL, 24, 0, 0.05);
  rv.cyl(T(0, 0.138, 0), 0.04, 0.012, YEL, 20, 0, 0.02);
  for (const s of [-1, 1]) {
    rv.cyl(C(T(s * 0.118, 0.05, 0), RZ(PI / 2)), 0.05, 0.026, COL.dark, 20);
    rv.cyl(C(T(s * 0.133, 0.05, 0), RZ(PI / 2)), 0.026, 0.004, COL.alu, 12);
    rv.box(T(s * 0.04, 0.075, 0.098), 0.034, 0.03, 0.012, COL.dark);
    rv.cyl(C(T(s * 0.04, 0.075, 0.106), RX(PI / 2)), 0.011, 0.006, '#7fe0ff', 10, MAT.EMIT);
  }
  rv.cyl(T(0, 0.012, -0.085), 0.012, 0.024, COL.dark, 8);
  rv.cyl(T(0, 0.012, 0.085), 0.012, 0.024, COL.dark, 8);

  /* ================= sport corner: bike on the wall + kit wardrobe ================= */
  const sport = node('bike');
  const spin = { a: 0 };
  // bikes stand nose-up against the wall; local frame: x lateral, y up, z forward, rear tyre bottom at origin height
  const PERM = new Float32Array([0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
  // mtb = Orbea Alma-style 29" XC hardtail; otherwise Felt AR-style aero road bike (bay blue, deep Reynolds rims)
  const bike = (zpos, mtb) => {
    const yA = 1.55, Rt = 0.3345, DS = 0.04;
    const RA = [-0.95, yA], FA = [0.05, yA];
    const BB = mtb ? [-0.53, yA - 0.05] : [-0.54, yA - 0.07];
    const ST = mtb ? [-0.66, yA + 0.4] : [-0.70, yA + 0.45];
    const HT = mtb ? [-0.125, yA + 0.53] : [-0.155, yA + 0.505];
    const HB = mtb ? [-0.09, yA + 0.43] : [-0.113, yA + 0.371];
    const base = C(T(x0 + 0.04 - (yA - Rt), Rt - RA[0] + 0.3, zpos), PERM);
    const g = node('bike', { model: base });
    const P = (z, y, dx = 0) => [dx, y, z];
    const frame = mtb ? '#14282b' : '#1b1c21', acc = mtb ? '#b8f02a' : '#8a8f99', blk = '#0e0e10', rub = '#15161a';
    const tb = (a, b, r, c = frame, n = 16, d0 = 0, d1 = d0) => g.tube(I(), P(...a, d0), P(...b, d1), r, c, n);
    const ring = (at, r, h, c, n = 32, dx = 0, rt = r) => g.cyl(C(T(...P(...at, dx)), RZ(PI / 2)), r, h, c, n, 0, rt);

    // frame
    tb(ST, HT, mtb ? 0.016 : 0.018); tb(BB, HB, mtb ? 0.027 : 0.03); tb(BB, ST, mtb ? 0.02 : 0.02);
    tb(HT, HB, 0.027, frame, 22);
    ring(HT, 0.03, 0.012, blk, 20); ring(HB, 0.03, 0.012, blk, 20);
    tb(BB, [BB[0] - 0.01, BB[1] - 0.005], 0.026, frame, 18, -0.04, 0.04);                       // BB shell
    for (const d of [-1, 1]) {
      tb(RA, BB, 0.012, frame, 12, d * 0.032, d * 0.022);
      tb(RA, mtb ? [ST[0] + 0.01, ST[1] - 0.04] : [ST[0] + 0.012, ST[1] - 0.07], 0.01, frame, 12, d * 0.034, d * 0.008);
    }
    tb([ST[0] + 0.02, ST[1] - 0.09], [ST[0] + 0.02, ST[1] - 0.09], 0.01, frame, 10, -0.03, 0.03);
    tb([ST[0] - 0.02, ST[1] - 0.15], [ST[0] - 0.02, ST[1] - 0.15], 0.01, frame, 10, -0.025, 0.025);

    // fork
    const FT = mtb ? [FA[0] - 0.05, FA[1] + 0.3] : null;
    if (mtb) {
      ring(HB, 0.04, 0.03, blk, 20); g.rbox(T(...P(HB[0] + 0.012, HB[1] - 0.03)), 0.1, 0.03, 0.045, blk, 0.012);
      for (const d of [-1, 1]) {
        tb([HB[0] + 0.01, HB[1] - 0.03], FT, 0.017, '#2a2c32', 18, d * 0.058, d * 0.058);
        tb(FT, FA, 0.021, frame, 18, d * 0.058, d * 0.06);
        tb([FT[0] + 0.02, FT[1] + 0.003], [FT[0] + 0.02, FT[1] + 0.003], 0.024, acc, 16, d * 0.058, d * 0.058);
      }
      tb([FT[0] + 0.03, FT[1] - 0.04], [FT[0] + 0.03, FT[1] - 0.04], 0.012, frame, 12, -0.06, 0.06);
    } else {
      ring(HB, 0.032, 0.05, frame, 20);
      for (const d of [-1, 1]) tb(HB, FA, 0.014, frame, 14, d * 0.014, d * 0.045);
      g.rbox(T(...P(HB[0] + 0.005, HB[1] - 0.012)), 0.06, 0.03, 0.04, frame, 0.012);
    }

    // cockpit
    if (mtb) {
      const sb = [HT[0] + 0.045, HT[1] + 0.03];
      tb([HT[0], HT[1] + 0.01], sb, 0.02, blk, 14); g.rbox(T(...P(...sb)), 0.05, 0.04, 0.045, blk, 0.012);
      tb([sb[0], sb[1]], [sb[0], sb[1]], 0.011, blk, 14, -0.15, 0.15);
      for (const d of [-1, 1]) {
        tb([sb[0], sb[1]], [sb[0] - 0.02, sb[1]], 0.011, blk, 14, d * 0.15, d * 0.34);
        ring([sb[0] - 0.02, sb[1]], 0.016, 0.11, rub, 18, d * 0.285);
        ring([sb[0] - 0.02, sb[1]], 0.019, 0.012, acc, 18, d * 0.225);
        tb([sb[0] - 0.005, sb[1] - 0.01], [sb[0] + 0.1, sb[1] - 0.04], 0.004, '#c9ccd2', 8, d * 0.2, d * 0.2);
        g.rbox(T(...P(sb[0] + 0.01, sb[1] - 0.025, d * 0.17)), 0.03, 0.025, 0.05, blk, 0.008);
      }
    } else {
      const st = [HT[0] + 0.06, HT[1] + 0.02];
      tb([HT[0], HT[1] + 0.005], st, 0.017, blk, 14);
      g.rbox(T(...P(...st)), 0.08, 0.026, 0.06, blk, 0.01);
      for (const d of [-1, 1]) {
        tb(st, [st[0] + 0.0, st[1]], 0.011, blk, 12, d * 0.04, d * 0.2);
        tb([st[0], st[1]], [st[0] + 0.07, st[1] - 0.005], 0.011, rub, 12, d * 0.2, d * 0.2);
        const hd = [[st[0] + 0.07, st[1] - 0.005], [st[0] + 0.12, st[1] - 0.025], [st[0] + 0.125, st[1] - 0.085], [st[0] + 0.085, st[1] - 0.12], [st[0] + 0.02, st[1] - 0.11]];
        for (let i = 0; i < hd.length - 1; i++) tb(hd[i], hd[i + 1], 0.011, rub, 12, d * 0.2, d * 0.2);
        g.rbox(T(...P(st[0] + 0.1, st[1] + 0.015, d * 0.2)), 0.042, 0.05, 0.13, '#1d1f25', 0.016);   // hood
        g.rbox(T(...P(st[0] + 0.12, st[1] - 0.005, d * 0.2)), 0.012, 0.012, 0.03, acc, 0.004);
      }
      g.rbox(T(...P(st[0] + 0.06, st[1] + 0.03)), 0.06, 0.012, 0.09, blk, 0.004);                    // computer mount
    }

    // saddle + post
    const sp = mtb ? [ST[0] - 0.035, ST[1] + 0.1] : [ST[0] - 0.035, ST[1] + 0.12];
    tb(ST, sp, mtb ? 0.0155 : 0.013, mtb ? blk : COL.carbon, 14);
    g.rbox(T(...P(sp[0], sp[1] + 0.012)), 0.06, 0.02, 0.05, blk, 0.008);
    g.rbox(T(...P(sp[0] - 0.045, sp[1] + 0.032)), 0.135, 0.032, 0.13, mtb ? '#1a1b1f' : '#17181c', 0.014);
    g.rbox(T(...P(sp[0] + 0.065, sp[1] + 0.03)), 0.05, 0.026, 0.17, mtb ? '#1a1b1f' : '#17181c', 0.011);
    for (const d of [-1, 1]) tb([sp[0] - 0.09, sp[1] + 0.018], [sp[0] + 0.13, sp[1] + 0.022], 0.003, COL.alu, 6, d * 0.032, d * 0.016);
    g.rbox(T(...P(sp[0] + 0.0, sp[1] + 0.048)), 0.03, 0.002, 0.2, mtb ? acc : '#8a8f99', 0.001);

    // drivetrain: crank, rings, cassette, chain, derailleur
    const rc = mtb ? 0.062 : 0.1, rk = mtb ? 0.098 : 0.055;
    ring(BB, rc, 0.004, COL.aluDark, 44, DS + 0.012);
    if (!mtb) ring(BB, 0.072, 0.004, COL.alu, 36, DS + 0.012);
    ring(BB, 0.025, 0.012, COL.black, 18, DS + 0.018);
    ring(RA, rk, 0.034, COL.aluDark, 36, DS - 0.005, 0.03);
    ring(RA, 0.032, 0.05, COL.alu, 16, DS);
    tb([BB[0], BB[1] + rc], [RA[0], RA[1] + rk * 0.9], 0.004, '#3a3d44', 6, DS + 0.012, DS);
    tb([BB[0], BB[1] - rc], [RA[0] + 0.035, RA[1] - rk * 0.9 - 0.045], 0.004, '#3a3d44', 6, DS + 0.012, DS);
    g.rbox(T(...P(RA[0] + 0.012, RA[1] - 0.065, DS + 0.005)), 0.026, 0.07, 0.04, blk, 0.01);
    for (const sg of [-1, 1]) g.cyl(C(T(...P(RA[0] + 0.012 + sg * 0.01, RA[1] - 0.095, DS + 0.005)), RZ(PI / 2)), 0.014, 0.008, COL.alu, 14);
    const cl = 0.17, ca = -0.9;
    for (const [d, s] of [[DS + 0.02, 1], [-0.07, -1]]) {
      const e = [BB[0] + s * cl * Math.cos(ca), BB[1] + s * cl * Math.sin(ca)];
      tb(BB, e, 0.011, COL.carbon, 12, d, d);
    }

    // wheels (spin with the bike hotspot)
    for (const ax of [RA, FA]) {
      const w = node('bike', { update() { this.model = C(base, T(...P(...ax)), RX(spin.a)); } });
      const hubW = mtb ? 0.11 : 0.1;
      if (mtb) {
        w.torus(RY(PI / 2), 0.3, 0.035, rub, 48, 12);
        for (let k = 0; k < 48; k++) w.rbox(C(RX(k * PI / 24), T(k % 2 ? 0.017 : -0.017, 0.333, 0)), 0.02, 0.012, 0.018, blk, 0.003);
        w.torus(RY(PI / 2), 0.286, 0.011, COL.aluDark, 48, 6);
        for (let k = 0; k < 24; k++) w.rbox(C(RX(k * PI / 12), T(k % 2 ? 0.012 : -0.012, 0.148, 0)), 0.003, 0.26, 0.004, COL.alu, 0.001);
      } else {
        w.torus(RY(PI / 2), 0.322, 0.0125, rub, 48, 8);
        for (let k = 0; k < 40; k++) w.rbox(C(RX(k * PI / 20), T(0, 0.292, 0)), 0.024, 0.058, 0.052, '#15161a', 0.006);
        w.torus(RY(PI / 2), 0.3, 0.006, '#8a8f99', 48, 4);
        for (let k = 0; k < 16; k++) w.rbox(C(RX(k * PI / 8), T(k % 2 ? 0.015 : -0.015, 0.145, 0)), 0.003, 0.25, 0.004, COL.alu, 0.001);
      }
      w.cyl(C(RZ(PI / 2)), 0.024, hubW, COL.alu, 20);
      w.cyl(C(RZ(PI / 2)), 0.01, hubW + 0.03, COL.aluDark, 12);
      const rr = mtb ? 0.09 : 0.08;
      w.cyl(C(T(-0.034, 0, 0), RZ(PI / 2)), rr, 0.002, COL.aluDark, 36);
      w.cyl(C(T(-0.034, 0, 0), RZ(PI / 2)), rr * 0.45, 0.0025, COL.dark, 20);
      w.rbox(T(-0.034, rr - 0.005, 0.0), 0.018, 0.03, 0.04, blk, 0.006);
    }
  };
  bike(3.4, true);
  bike(3.95, false);
  // wardrobe: open front, clothes on a rail, helmets on top, shoes at the bottom
  {
    const wz = 2.6, wd = 0.55, wx = x0 + wd / 2, ww = 1.0, wh = 2.1, rail = 1.85;
    const fx = x0 + wd;
    for (const s of [-1, 1]) sport.rbox(T(wx, wh / 2, wz + s * (ww / 2 - 0.012)), wd, wh, 0.024, COL.white, 0.006);
    sport.rbox(T(wx, wh - 0.012, wz), wd, 0.024, ww, COL.white, 0.006);
    sport.rbox(T(wx, 0.06, wz), wd, 0.024, ww, COL.white, 0.006);
    sport.rbox(T(wx, 0.38, wz), wd - 0.03, 0.02, ww - 0.04, COL.white, 0.005);
    sport.tube(I(), [wx, rail, wz - ww / 2 + 0.03], [wx, rail, wz + 0.09], 0.01, COL.alu, 8);
    // hanging kit: tri suit, cycling jersey, running tops, a rain jacket
    const kit = [['#111827', COL.red], [COL.blue, COL.white], [COL.lime, COL.lime], ['#0b0b0f', COL.orange], [COL.purple, COL.white]];
    kit.forEach(([c, a], i) => {
      const kz = wz - 0.38 + i * 0.1, len = i === 0 ? 0.8 : i === 3 ? 1.3 : 0.3;
      sport.tube(I(), [wx, rail, kz], [wx, rail - 0.05, kz], 0.004, COL.alu, 4);
      sport.rbox(T(wx, rail - 0.05, kz), 0.38, 0.012, 0.02, COL.alu, 0.004);
      sport.rbox(T(wx, rail - 0.05 - len / 2, kz), 0.4, len, 0.035, c, 0.012);
      sport.rbox(T(wx + 0.06, rail - 0.05 - len * 0.35, kz), 0.08, len * 0.4, 0.038, a, 0.008);
    });
    // accessory section: divider + shelves on the right of the hanging rail
    const az = wz + 0.283, aw = 0.37, ax = fx - 0.2;
    sport.rbox(T(wx, (0.39 + wh - 0.024) / 2, wz + 0.09), wd - 0.03, wh - 0.024 - 0.39, 0.016, COL.white, 0.004);
    for (const y of [0.78, 1.18, 1.58]) sport.rbox(T(wx, y, az), wd - 0.03, 0.02, aw, COL.white, 0.005);
    const dome = (base, r, hg, col, n = 24, layers = 9) => {
      for (let i = 0; i < layers; i++) {
        const a0 = i / layers * PI / 2, a1 = (i + 1) / layers * PI / 2, hh = hg * (Math.sin(a1) - Math.sin(a0));
        sport.cyl(C(base, T(0, hg * Math.sin(a0) + hh / 2, 0)), r * Math.cos(a0), hh, col, n, 0, r * Math.cos(a1));
      }
    };
    // road helmet (shelf 0.39): shell, vents, brow, retention dial, strap
    {
      const h = C(T(ax, 0.4, az + 0.03), RY(-PI / 2), S(1, 1, 1.25));
      dome(h, 0.1, 0.1, COL.white);
      for (let i = 0; i < 5; i++) for (const sg of [-1, 1]) {
        sport.rbox(C(h, T(sg * 0.035, 0.07, -0.04 + i * 0.0), RY(sg * (0.25 + i * 0.3 - 0.6)), T(0, 0, 0.085 - i * 0.0)), 0.014, 0.012, 0.03, '#15161a', 0.004);
      }
      sport.rbox(C(h, T(0, 0.098, 0), RX(0.0)), 0.016, 0.01, 0.17, COL.red, 0.004);
      sport.torus(C(h, T(0, 0.01, 0), RX(PI / 2)), 0.1, 0.006, '#15161a', 28, 4);
      sport.rbox(C(h, T(0, 0.04, 0.095)), 0.04, 0.03, 0.012, COL.red, 0.004);
      sport.torus(C(h, T(0.0, 0.0, 0.0), RY(PI / 2)), 0.075, 0.004, COL.dark, 24, 3);
    }
    // swim cap + goggles (shelf 0.39, towards the wardrobe's front-left)
    dome(T(ax + 0.02, 0.4, az - 0.11), 0.06, 0.055, COL.orange, 20, 6);
    sport.torus(C(T(ax - 0.04, 0.403, az - 0.11), RX(-PI / 2)), 0.035, 0.004, COL.white, 16, 3);
    // GPS bike computer on a dock (shelf 0.78)
    sport.rbox(T(ax, 0.8, az - 0.1), 0.1, 0.02, 0.1, COL.dark, 0.006);
    {
      const g = C(T(ax, 0.86, az - 0.1), RX(-0.0), RY(-PI / 2), RX(-0.15));
      sport.rbox(C(g, T(0, 0, 0)), 0.05, 0.085, 0.018, COL.black, 0.006);
      sport.box(C(g, T(0, 0.006, 0.0095)), 0.04, 0.052, 0.002, '#38bdf8', MAT.EMIT);
      sport.box(C(g, T(0, 0.006, 0.0105)), 0.04, 0.007, 0.001, '#0b2a3a');
      for (const bx of [-0.012, 0, 0.012]) sport.cyl(C(g, T(bx, -0.032, 0.01), RX(PI / 2)), 0.004, 0.003, COL.aluDark, 8);
    }
    // night-trail headlamp with elastic band (shelf 0.78)
    sport.torus(C(T(ax, 0.795, az + 0.05), RX(PI / 2), S(1.1, 0.9, 1)), 0.07, 0.006, '#15161a', 28, 4);
    sport.rbox(T(ax + 0.02, 0.83, az + 0.05), 0.045, 0.045, 0.06, COL.black, 0.012);
    sport.cyl(C(T(ax + 0.046, 0.83, az + 0.05), RZ(PI / 2)), 0.022, 0.008, '#fff6c8', 20, MAT.EMIT);
    sport.cyl(C(T(ax + 0.044, 0.83, az + 0.05), RZ(PI / 2)), 0.026, 0.006, COL.aluDark, 20);
    sport.rbox(T(ax + 0.02, 0.857, az + 0.05), 0.03, 0.008, 0.03, COL.orange, 0.003);
    // sunglasses (shelf 0.78, front)
    for (const sg of [-1, 1]) {
      sport.rbox(C(T(ax + 0.12, 0.806, az + 0.1 + sg * 0.028), RY(0.1)), 0.006, 0.026, 0.048, '#1a1d28', 0.003);
      sport.rbox(C(T(ax + 0.075, 0.805, az + 0.1 + sg * 0.065)), 0.1, 0.006, 0.006, '#1a1d28', 0.002);
    }
    sport.rbox(T(ax + 0.12, 0.812, az + 0.1), 0.008, 0.006, 0.012, '#1a1d28', 0.002);
    // trail backpack with hydration tube (shelf 1.18)
    {
      const b = T(ax - 0.12, 1.19, az + 0.02);
      sport.rbox(C(b, T(0, 0.19, 0)), 0.17, 0.36, 0.26, '#1f3b57', 0.04);
      sport.rbox(C(b, T(0.1, 0.12, 0)), 0.05, 0.2, 0.2, '#2b557f', 0.02);
      sport.rbox(C(b, T(0.128, 0.12, 0)), 0.004, 0.19, 0.003, COL.orange, 0.001);
      sport.rbox(C(b, T(0.1, 0.27, 0)), 0.04, 0.09, 0.2, '#1a3149', 0.015);
      for (const sg of [-1, 1]) {
        sport.rbox(C(b, T(0.092, 0.17, sg * 0.1)), 0.02, 0.28, 0.035, '#15161a', 0.01);
        sport.rbox(C(b, T(0.1, 0.25, sg * 0.1)), 0.026, 0.07, 0.04, COL.orange, 0.008);
      }
      sport.tube(b, [0.1, 0.3, 0.1], [0.12, 0.34, 0.1], 0.005, '#15161a', 8);
      sport.rbox(C(b, T(0, 0.37, 0)), 0.07, 0.025, 0.1, '#15161a', 0.01);
      sport.rbox(C(b, T(0.08, 0.15, 0)), 0.003, 0.32, 0.05, COL.orange, 0.001);
    }
    // folded towel + water bottle + gels (shelf 1.18 / 1.58)
    sport.rbox(T(ax + 0.1, 1.24, az - 0.1), 0.16, 0.08, 0.18, COL.blue, 0.02);
    sport.cyl(T(ax, 1.69, az - 0.1), 0.032, 0.2, COL.white, 20);
    sport.cyl(T(ax, 1.8, az - 0.1), 0.014, 0.025, COL.red, 14);
    for (let i = 0; i < 3; i++) sport.rbox(T(ax + 0.1 + i * 0.0, 1.6 + 0.012 + i * 0.022, az + 0.08), 0.1, 0.02, 0.05, [COL.lime, COL.orange, COL.cyan][i], 0.006);
    // swim goggles hanging on the top shelf (1.58)
    for (const sg of [-1, 1]) sport.torus(C(T(ax - 0.05, 1.64, az + 0.1 + sg * 0.03), RY(PI / 2)), 0.02, 0.006, COL.cyan, 16, 4);
    sport.torus(C(T(ax - 0.05, 1.64, az + 0.1), RX(PI / 2)), 0.07, 0.004, '#15161a', 28, 3);
    sport.rbox(T(ax - 0.05, 1.64, az + 0.1), 0.006, 0.01, 0.025, COL.black, 0.002);
    // shoes: running (lime, pink) and cycling (white)
    const shoe = (x, y, z, c, cleat = false) => {
      const sh = C(T(x, y, z), RY(PI / 2 + 0.1));
      sport.rbox(C(sh, T(0, 0.015, 0)), 0.1, 0.03, 0.28, cleat ? COL.carbon : COL.white, 0.012);
      sport.rbox(C(sh, T(0, 0.06, -0.03)), 0.09, 0.07, 0.2, c, 0.025);
      sport.rbox(C(sh, T(0, 0.04, 0.1)), 0.085, 0.045, 0.08, c, 0.025);
      sport.box(C(sh, T(0, 0.096, -0.02)), 0.05, 0.004, 0.1, cleat ? COL.dark : COL.white);
    };
    for (const [i, c, cl] of [[0, COL.lime, false], [1, COL.magenta, false], [2, COL.white, true]]) {
      const sz = wz - 0.33 + i * 0.33;
      shoe(fx - 0.25, 0.072, sz - 0.055, c, cl);
      shoe(fx - 0.25, 0.072, sz + 0.055, c, cl);
    }
    for (let i = 0; i < 3; i++) sport.rbox(T(fx - 0.25, 0.25, wz - 0.3 + i * 0.3), 0.3, 0.2, 0.26, [COL.dark, COL.blue, COL.offwhite][i], 0.03);  // bags / towels
  }

  /* ================= hotspots ================= */
  const box = (a, b) => () => [a, b];
  const hotspots = [
    { id: 'me', boxes: [box([SX - 0.7, 1.72, -1.8], [SX + 0.7, 2.2, -1.6])],
      anchor: [SX, 2.25, -1.7], view: { target: [SX + 0.6, 1.6, -1.4], yaw: 0.2, pitch: 0.1, r: 1.25 } },
    { id: 'portal', boxes: [box([2.0, 1.0, -1.8], [2.6, 1.9, -1.6]),
      box([-2.55, 0.95, -1.3], [-2.3, 1.85, -0.4])], anchor: [2.3, 1.95, -1.7],
      view: { target: [2.3, 1.45, -1.7], yaw: 0.15, pitch: 0.1, r: 1.4 } },
    { id: 'desk', boxes: [box([-2.45 + DDX, 0, -1.8], [-0.75 + DDX, 1.35, -0.45])], anchor: [-1.6 + DDX, 1.42, -1.45],
      view: { target: [-1.55 + DDX, 0.95, -1.3], yaw: 0.06, pitch: 0.45, r: 0.95 } },
    { id: 'sim', boxes: [box([SX - 0.85, 0, -1.65], [SX + 0.85, 1.3, 0.6])], anchor: [SX, 1.38, -1.35],
      view: { target: [SX, 0.7, -0.55], yaw: 0.72, pitch: 0.42, r: 1.1 } },
    { id: 'rack', boxes: [box([RKX - 0.35, 0, -1.8], [RKX + 0.35, 1.75, -1.1])], anchor: [RKX, 1.82, -1.4],
      view: { target: [RKX, 0.7, -1.3], yaw: 0.3, pitch: 0.18, r: 0.8 } },
    { id: 'bench', boxes: [box([-2.5, 0, BENCH_Z - 0.9], [-1.25, BY + 0.85, BENCH_Z + 0.9])],
      anchor: [BENCH_X - 0.25, BY + 0.95, BENCH_Z], view: { target: [BENCH_X, BY + 0.15, BENCH_Z], yaw: 1.0, pitch: 0.42, r: 1.0 } },
    { id: 'robot', boxes: [() => [[rover.x - 0.2, 0, rover.z - 0.2], [rover.x + 0.2, 0.32, rover.z + 0.2]]],
      get anchor() { return [rover.x, 0.5, rover.z]; },
      view: { get target() { return [rover.x, 0.15, rover.z]; }, yaw: 0.8, pitch: 0.35, r: 0.7 } },
    { id: 'bike', boxes: [box([x0, 0, 2.1], [x0 + 0.9, 2.2, 4.25])], anchor: [-2.15, 2.3, 3.2],
      view: { target: [-2.0, 1.0, 3.2], yaw: 0.95, pitch: 0.25, r: 1.9 } },
  ];

  return { nodes, hotspots, spin, portals };
}

// Neon sign + race bib, drawn once into a 1024x512 canvas (y flipped on upload)
export function atlas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // geometric monoline wordmark, drawn as strokes so it looks the same on every machine
  const word = (cx, cy, style, blur) => {
    const xh = 92, w = 22, r = xh / 2, asc = 150, gap = 24, rc = r - w / 2;
    const base = cy + (xh - asc) * 0.0 + xh * 0.28;
    const circ = x => g.arc(x + r, base - r, rc, 0, Math.PI * 2);
    const letters = [
      { w: 2 * r, d: x => { circ(x); g.moveTo(x + 2 * r - w / 2, base); g.lineTo(x + 2 * r - w / 2, base - asc); } },
      { w: 2 * r, d: x => { circ(x); g.moveTo(x + 2 * r - w / 2, base); g.lineTo(x + 2 * r - w / 2, base - xh); } },
      { w, d: x => { g.moveTo(x + w / 2, base); g.lineTo(x + w / 2, base - asc); } },
      { w: 2 * r, d: x => circ(x) },
      { w: 2 * r, d: x => {
        circ(x); const xs = x + 2 * r - w / 2, rr = r * 0.78;
        g.moveTo(xs, base - xh); g.lineTo(xs, base + xh * 0.18);
        g.arc(xs - rr, base + xh * 0.18, rr, 0, Math.PI * 0.82);
      } },
      { w: 2 * r, d: x => { circ(x); g.moveTo(x + 2 * r - w / 2, base); g.lineTo(x + 2 * r - w / 2, base - xh); } },
      { w: 2 * r, d: x => { g.moveTo(x + w * 0.3, base - xh); g.lineTo(x + 2 * r - w * 0.3, base); g.moveTo(x + 2 * r - w * 0.3, base - xh); g.lineTo(x + w * 0.3, base); } },
    ];
    const total = letters.reduce((t, l) => t + l.w, 0) + gap * (letters.length - 1);
    let x = cx - total / 2;
    g.lineWidth = w; g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.strokeStyle = style; g.shadowColor = style; g.shadowBlur = blur;
    for (const l of letters) { g.beginPath(); l.d(x); g.stroke(); x += l.w + gap; }
    g.shadowBlur = 0;
  };
  // backlight halo (top half): glow around the letters, letters themselves stay black
  for (const [blur, col] of [[70, '#4a90e2'], [34, '#7cb7ff'], [14, '#cfe6ff']]) word(512, 128, col, blur);
  word(512, 128, '#000', 0);
  // letter mask (bottom right, x 256..1024, y 256..512)
  word(640, 384, '#fff', 0);
  // bib: x 0..256, y 256..480
  g.shadowBlur = 0;
  g.fillStyle = '#f4f4f5'; g.fillRect(0, 256, 256, 224);
  g.fillStyle = '#e11d48'; g.fillRect(0, 256, 256, 46);
  g.fillStyle = '#fff'; g.font = '700 28px system-ui, sans-serif'; g.fillText('TRIATHLON', 128, 280);
  g.fillStyle = '#111'; g.font = '800 110px system-ui, sans-serif'; g.fillText('89', 128, 392);
  for (const x of [14, 242]) for (const y of [316, 466]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  return c;
}
