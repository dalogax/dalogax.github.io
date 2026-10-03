// The room, built from primitives. Units are metres, Y up.
// Back wall at z = -1.75, left wall at x = -2.5; the room is open towards +x/+z.
import { m4, Geo, MAT } from './engine.js';

const { T, RX, RY, RZ, S, C } = m4;
const PI = Math.PI;
const I = () => m4.I();

export const ROOM = { x0: -2.5, x1: 4.0, z0: -1.75, z1: 2.5, h: 2.6 };

const COL = {
  wall: '#e4e5ea', base: '#a9adb6', skirt: '#f5f6f8', wood: '#d8bf9c', white: '#f2f3f5', offwhite: '#dfe2e7',
  black: '#1a1b1f', dark: '#2a2c32', carbon: '#202227', alu: '#b9bec6', aluDark: '#8d939c', groove: '#5d636c',
  bezel: '#0c0c0f', red: '#d62839', purple: '#8b5cf6', magenta: '#ec4899', cyan: '#22d3ee',
  green: '#22c55e', amber: '#f59e0b', blue: '#3b82f6', lime: '#a3e635', orange: '#f97316', yellow: '#facc15',
};

const SX = 1.05;   // sim rig centre x
const RKX = 3.55;  // rack centre x
const BX = 0.3, BZ = 1.7, BY = 1.05; // standing bench centre + top height

// Point lights: position, linear colour * intensity
export const LIGHTS = [
  [[-1.6, 1.1, -1.15], [.35, .5, 1.0]],     // ultrawide + light bar
  [[SX, 1.05, -0.9], [.9, .6, .5]],         // sim screens
  [[RKX, .75, -0.7], [.45, .7, .9]],        // rack LEDs
  [[BX, BY + 0.45, BZ + 0.1], [1.3, 1.2, 1.05]], // bench LED bar
  [[SX, 1.95, -1.45], [1.0, .3, .85]],      // neon sign
  [[-1.8, 2.3, 0.4], [.9, .85, .95]],       // sport wall wash
  [[2.5, 1.4, -1.1], [1.7, 1.7, 1.8]],      // window
  [[0.8, 2.4, 0.8], [.8, .78, .74]],        // room fill
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
  room.quad(C(T(cx, 0.001, cz), RX(-PI / 2)), W, D, COL.wood, MAT.FLOOR);
  room.box(T(cx - 0.05, h / 2, z0 - 0.05), W + 0.1, h, 0.1, COL.wall);
  room.box(T(x0 - 0.05, h / 2, cz - 0.05), 0.1, h, D + 0.1, COL.wall);
  room.box(T(cx, 0.04, z0 + 0.01), W, 0.08, 0.02, COL.skirt);
  room.box(T(x0 + 0.01, 0.04, cz), 0.02, 0.08, D, COL.skirt);
  // warm light lines along the top of both walls
  room.box(T(cx, 2.57, z0 + 0.015), W, 0.025, 0.02, '#fff1dc', MAT.EMIT);
  room.box(T(x0 + 0.015, 2.57, cz), 0.02, 0.025, D, '#fff1dc', MAT.EMIT);

  // big window with a sea view
  {
    const wx = 2.5, ww = 1.0, wy = 1.35, wh = 2.0, wz = z0 + 0.002;
    room.quad(T(wx, wy, wz), ww, wh, '#ffffff', MAT.WINDOW);
    for (const s of [-1, 1]) room.rbox(T(wx + s * (ww / 2 + 0.02), wy, wz + 0.02), 0.045, wh + 0.08, 0.04, COL.alu, 0.008);
    for (const s of [-1, 1]) room.rbox(T(wx, wy + s * (wh / 2 + 0.02), wz + 0.02), ww + 0.08, 0.045, 0.04, COL.alu, 0.008);
    room.rbox(T(wx, wy, wz + 0.015), 0.025, wh, 0.03, COL.alu, 0.006);
    room.rbox(T(wx, wy - 0.25, wz + 0.015), ww, 0.025, 0.03, COL.alu, 0.006);
    room.rbox(T(wx, wy - wh / 2 - 0.05, wz + 0.09), ww + 0.16, 0.03, 0.18, COL.white, 0.008);
    // monstera by the window
    room.cyl(T(2.95, 0.2, -1.3), 0.16, 0.4, COL.white, 14, 0, 0.19);
    room.cyl(T(2.95, 0.39, -1.3), 0.17, 0.02, '#4a3527', 14);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.39, tilt = 0.25 + (i % 4) * 0.18, len = 0.45 + (i % 3) * 0.18;
      const st = C(T(2.95, 0.4, -1.3), RY(a), RX(tilt));
      room.tube(st, [0, 0, 0], [0, len, 0], 0.006, '#3c7a46', 4);
      const lf = C(st, T(0, len, 0), RX(1.25));
      room.rbox(C(lf, T(0, 0.08, 0)), 0.15, 0.17, 0.006, i % 2 ? '#2a6e45' : '#367f50', 0.003);
      room.rbox(C(lf, T(0, 0.08, 0.004)), 0.008, 0.16, 0.004, '#4d9a63', 0.001);
    }
  }
  // posters above the desk
  for (const [x, c1, c2] of [[-2.0, '#3b1f5c', '#f472b6'], [-1.25, '#0f2f44', '#22d3ee']]) {
    room.rbox(T(x, 1.8, z0 + 0.012), 0.5, 0.66, 0.02, COL.white, 0.005);
    room.quad(T(x, 1.8, z0 + 0.023), 0.44, 0.6, c1);
    room.quad(T(x, 1.67, z0 + 0.024), 0.3, 0.3, c2);
    room.quad(T(x, 1.67, z0 + 0.025), 0.18, 0.18, c1);
  }

  /* ================= desk: gaming PC + ultrawide ================= */
  const desk = node('desk');
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
    // desk mat, keyboard with keycaps, mouse, mug
    desk.rbox(T(dx, top + 0.019, dz + 0.22), 0.95, 0.004, 0.38, '#3a3d46', 0.002);
    desk.box(T(dx, top + 0.022, dz + 0.411), 0.95, 0.004, 0.006, [.2, .2, .2], MAT.RGB);
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
      desk.cyl(T(dx + 0.52, top + 0.065, dz + 0.12), 0.042, 0.095, COL.white, 14);
      desk.cyl(T(dx + 0.52, top + 0.108, dz + 0.12), 0.036, 0.004, '#3b2416', 12);
      desk.torus(C(T(dx + 0.565, top + 0.065, dz + 0.12), RY(PI / 2)), 0.025, 0.006, COL.white, 10, 4);
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
    // small plant
    desk.cyl(T(dx - 0.45, top + 0.05, -1.62), 0.045, 0.1, COL.offwhite, 10, 0, 0.055);
    for (let i = 0; i < 6; i++) desk.rbox(C(T(dx - 0.45, top + 0.1, -1.62), RY(i * 1.1), RX(0.5), T(0, 0.06, 0)), 0.025, 0.12, 0.004, '#3f9a5c', 0.002);
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
      desk.torus(T(x, y + fy, z + d / 2 + 0.004), 0.066, 0.006, [.3, .3, .3], 20, 4, MAT.RGB);
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
    const ch = C(T(-2.05, 0, -0.55), RY(1.0));
    for (let k = 0; k < 5; k++) {
      desk.rbox(C(ch, RY(k * 2 * PI / 5), T(0, 0.07, 0.16)), 0.045, 0.035, 0.32, COL.alu, 0.01);
      desk.cyl(C(ch, RY(k * 2 * PI / 5), T(0, 0.028, 0.31), RZ(PI / 2)), 0.027, 0.03, COL.dark, 10);
    }
    desk.cyl(C(ch, T(0, 0.22, 0)), 0.03, 0.3, COL.dark, 10);
    desk.cyl(C(ch, T(0, 0.4, 0)), 0.022, 0.12, COL.alu, 10);
    desk.rbox(C(ch, T(0, 0.48, 0)), 0.5, 0.075, 0.48, COL.offwhite, 0.03);
    desk.rbox(C(ch, T(0, 0.43, 0)), 0.3, 0.03, 0.3, COL.dark, 0.01);
    const back = C(ch, T(0, 0.92, 0.27), RX(-0.14));
    desk.rbox(back, 0.46, 0.66, 0.025, '#3a3d46', 0.008);
    for (const s of [-1, 1]) desk.rbox(C(back, T(s * 0.235, 0, 0.01)), 0.03, 0.68, 0.035, COL.white, 0.01);
    desk.rbox(C(back, T(0, 0.34, 0.01)), 0.48, 0.03, 0.035, COL.white, 0.01);
    desk.rbox(C(back, T(0, -0.12, -0.02)), 0.3, 0.08, 0.03, COL.white, 0.012);       // lumbar
    desk.rbox(C(back, T(0, 0.47, -0.01)), 0.26, 0.12, 0.04, COL.white, 0.02);         // headrest
    desk.rbox(C(ch, T(0, 0.6, 0.27)), 0.06, 0.25, 0.03, COL.alu, 0.008);
    for (const s of [-1, 1]) {
      desk.rbox(C(ch, T(s * 0.27, 0.6, 0.0)), 0.025, 0.2, 0.03, COL.dark, 0.006);
      desk.rbox(C(ch, T(s * 0.27, 0.7, -0.02)), 0.07, 0.025, 0.24, COL.dark, 0.01);
    }
  }
  desk.cyl(T(-1.7, 0.004, -0.6), 0.75, 0.008, '#c7c2d6', 32);

  /* ================= sim rig ================= */
  const sim = node('sim');
  {
    const s = 0.04;                                   // 80x80 profile
    sim.rbox(T(SX, 0.006, -0.55), 1.2, 0.012, 2.2, '#3a3d45', 0.004);
    // base frame
    for (const x of [SX - 0.28, SX + 0.28]) prof(sim, [x, s + 0.03, -1.3], [x, s + 0.03, 0.55], s);
    for (const z of [-1.26, -0.65, 0.5]) prof(sim, [SX - 0.24, s + 0.03, z], [SX + 0.24, s + 0.03, z], s);
    for (const x of [SX - 0.28, SX + 0.28]) for (const z of [-1.3, 0.55]) sim.cyl(T(x, 0.015, z), 0.03, 0.03, COL.dark, 10);
    // wheel deck uprights + crossbar
    for (const x of [SX - 0.28, SX + 0.28]) {
      prof(sim, [x, 0.11, -0.65], [x, 0.66, -0.65], s);
      sim.rbox(T(x, 0.14, -0.58), 0.085, 0.07, 0.07, COL.dark, 0.006);         // corner brackets
      sim.rbox(T(x, 0.14, -0.72), 0.085, 0.07, 0.07, COL.dark, 0.006);
    }
    prof(sim, [SX - 0.32, 0.7, -0.65], [SX + 0.32, 0.7, -0.65], s);
    sim.rbox(T(SX, 0.746, -0.62), 0.3, 0.012, 0.22, COL.black, 0.004);           // deck plate
    // direct drive motor
    sim.cyl(C(T(SX, 0.835, -0.62), RX(PI / 2)), 0.075, 0.26, COL.black, 18);
    sim.cyl(C(T(SX, 0.835, -0.48), RX(PI / 2)), 0.08, 0.025, COL.alu, 18);
    sim.cyl(C(T(SX, 0.835, -0.466), RX(PI / 2)), 0.05, 0.005, '#38bdf8', 18, MAT.EMIT);
    sim.rbox(T(SX, 0.775, -0.62), 0.12, 0.03, 0.22, COL.dark, 0.006);
    for (const z of [-0.72, -0.56]) sim.rbox(T(SX, 0.835, z), 0.17, 0.17, 0.008, COL.aluDark, 0.004);
    // pedal deck + load-cell pedals
    prof(sim, [SX - 0.24, 0.16, -1.05], [SX + 0.24, 0.16, -1.05], 0.03);
    sim.rbox(C(T(SX, 0.18, -1.08), RX(-0.35)), 0.5, 0.012, 0.32, COL.black, 0.004);
    for (const [px, face] of [[SX - 0.13, 0.07], [SX, 0.08], [SX + 0.13, 0.08]]) {
      const base = C(T(px, 0.2, -1.12), RX(-0.35));
      sim.rbox(C(base, T(0, 0.01, 0.07)), 0.05, 0.02, 0.1, COL.dark, 0.005);
      const arm = C(base, T(0, 0.02, 0.12), RX(0.55));
      sim.rbox(C(arm, T(0, 0.11, 0)), 0.02, 0.22, 0.02, COL.aluDark, 0.004);
      sim.rbox(C(arm, T(0, 0.2, 0.015)), face, 0.1, 0.008, COL.alu, 0.003);
      sim.tube(base, [0, 0.02, -0.02], [0, 0.11, 0.1], 0.014, px === SX + 0.13 ? COL.red : COL.dark, 8);
    }
    // seat rails + bucket seat
    for (const x of [SX - 0.16, SX + 0.16]) sim.rbox(T(x, 0.13, 0.12), 0.04, 0.03, 0.5, COL.alu, 0.006);
    sim.rbox(T(SX, 0.17, 0.12), 0.38, 0.05, 0.36, COL.dark, 0.008);
    const seat = T(SX, 0.22, 0.12);
    sim.rbox(C(seat, T(0, 0.08, -0.02)), 0.42, 0.09, 0.42, COL.black, 0.03);
    sim.rbox(C(seat, T(0, 0.125, -0.04)), 0.24, 0.02, 0.3, COL.carbon, 0.008);
    for (const sg of [-1, 1]) {
      sim.rbox(C(seat, T(sg * 0.2, 0.14, -0.02), RZ(sg * 0.35)), 0.07, 0.14, 0.42, COL.black, 0.025);
      sim.box(C(seat, T(sg * 0.165, 0.2, -0.02), RZ(sg * 0.35)), 0.006, 0.006, 0.4, COL.red);
    }
    const back = C(seat, T(0, 0.48, 0.22), RX(-0.22));
    sim.rbox(back, 0.44, 0.74, 0.08, COL.black, 0.03);
    sim.rbox(C(back, T(0, -0.04, -0.045)), 0.24, 0.5, 0.012, COL.carbon, 0.006);
    for (const sg of [-1, 1]) {
      sim.rbox(C(back, T(sg * 0.21, -0.1, -0.05), RY(sg * 0.5)), 0.07, 0.4, 0.13, COL.black, 0.025);
      sim.rbox(C(back, T(sg * 0.2, 0.18, -0.04), RY(sg * 0.4)), 0.07, 0.2, 0.1, COL.black, 0.025);
      sim.box(C(back, T(sg * 0.08, 0.28, -0.045)), 0.06, 0.025, 0.01, '#050506');        // harness slots
      sim.box(C(back, T(sg * 0.122, -0.04, -0.052)), 0.006, 0.5, 0.006, COL.red);
    }
    sim.rbox(C(back, T(0, 0.38, 0)), 0.3, 0.05, 0.07, COL.black, 0.02);
    for (const sg of [-1, 1]) sim.rbox(C(seat, T(sg * 0.23, 0.03, 0.02)), 0.012, 0.12, 0.3, COL.alu, 0.004);
    // shifter + handbrake on the right
    prof(sim, [SX + 0.4, 0.08, 0.0], [SX + 0.4, 0.5, 0.0], 0.025);
    prof(sim, [SX + 0.28, 0.07, 0.0], [SX + 0.4, 0.07, 0.0], 0.025);
    sim.rbox(T(SX + 0.4, 0.55, -0.06), 0.09, 0.06, 0.1, COL.black, 0.008);
    sim.tube(I(), [SX + 0.4, 0.58, -0.06], [SX + 0.39, 0.72, -0.05], 0.007, COL.alu, 6);
    sim.cyl(T(SX + 0.39, 0.735, -0.05), 0.022, 0.035, COL.black, 10);
    sim.rbox(T(SX + 0.4, 0.55, 0.07), 0.05, 0.06, 0.1, COL.black, 0.008);
    sim.tube(I(), [SX + 0.4, 0.57, 0.07], [SX + 0.4, 0.78, -0.02], 0.01, COL.alu, 6);
    sim.cyl(C(T(SX + 0.4, 0.8, -0.03), RX(-0.4)), 0.016, 0.08, COL.red, 10);
    // front monitor stand: two posts from the base, crossbar, VESA arms
    for (const x of [SX - 0.5, SX + 0.5]) {
      prof(sim, [x, 0.03, -1.42], [x, 0.98, -1.42], 0.03);
      sim.rbox(T(x, 0.015, -1.42), 0.08, 0.03, 0.3, COL.alu, 0.006);
    }
    prof(sim, [SX - 0.55, 1.0, -1.42], [SX + 0.55, 1.0, -1.42], 0.03);
    const Wd = 0.68, H = 0.39, y = 1.06, z = -1.37, a = 0.78;
    const scr = (t, i) => {
      sim.rbox(C(t, T(0, 0, -0.016)), Wd + 0.012, H + 0.012, 0.03, COL.bezel, 0.006);
      sim.rbox(C(t, T(0, 0, -0.04)), Wd - 0.06, H - 0.06, 0.03, COL.dark, 0.01);
      sim.quad(t, Wd, H, '#ffffff', MAT.RACE, [i / 3, (i + 1) / 3, 0, 1]);
    };
    scr(C(T(SX - Wd / 2 - Wd / 2 * Math.cos(a) - 0.004, y, z + Wd / 2 * Math.sin(a)), RY(a)), 0);
    scr(T(SX, y, z), 1);
    scr(C(T(SX + Wd / 2 + Wd / 2 * Math.cos(a) + 0.004, y, z + Wd / 2 * Math.sin(a)), RY(-a)), 2);
    for (const sg of [-1, 1]) sim.tube(I(), [SX + sg * 0.5, 1.0, -1.42], [SX + sg * 0.72, 1.04, -1.1], 0.012, COL.aluDark, 6);
    sim.rbox(T(SX, 1.0, -1.4), 0.1, 0.1, 0.03, COL.aluDark, 0.006);
    // headphones on a hook
    sim.rbox(T(SX + 0.62, 0.95, -1.42), 0.04, 0.012, 0.012, COL.alu, 0.003);
    sim.torus(C(T(SX + 0.66, 0.86, -1.42), RY(PI / 2)), 0.08, 0.01, COL.dark, 16, 4);
    for (const sg of [-1, 1]) sim.cyl(C(T(SX + 0.66, 0.79, -1.42 + sg * 0.075), RX(PI / 2)), 0.04, 0.03, COL.dark, 14);
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
  const sign = node('me');
  sign.rbox(T(SX, 1.97, z0 + 0.008), 1.34, 0.42, 0.012, '#0d0d12', 0.004);
  for (const sg of [-1, 1]) sign.cyl(C(T(SX + sg * 0.6, 1.97, z0 + 0.02), RX(PI / 2)), 0.008, 0.02, COL.alu, 8);
  const neon = node('me', { blend: true, noShadow: true });
  neon.quad(T(SX, 1.97, z0 + 0.016), 1.34, 0.42, '#ffffff', MAT.NEON, [0, 1, 0.5, 1]);

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
    // Zigbee coordinator, mini switch, small plant on top
    rack.rbox(T(x - 0.15, 1.315, z + 0.1), 0.09, 0.03, 0.07, COL.white, 0.006);
    rack.cyl(C(T(x - 0.17, 1.4, z + 0.08), RZ(0.15)), 0.006, 0.13, COL.dark, 6);
    rack.box(T(x - 0.125, 1.32, z + 0.136), 0.006, 0.006, 0.004, COL.green, MAT.LED);
    rack.rbox(T(x + 0.12, 1.315, z + 0.12), 0.16, 0.03, 0.12, '#2a2c33', 0.006);
    for (let c = 0; c < 5; c++) rack.box(T(x + 0.06 + c * 0.025, 1.32, z + 0.181), 0.006, 0.006, 0.004, COL.green, MAT.LED);
    rack.cyl(T(x + 0.15, 1.36, z - 0.15), 0.06, 0.12, COL.white, 10, 0, 0.075);
    for (let i = 0; i < 9; i++) rack.rbox(C(T(x + 0.15, 1.42, z - 0.15), RY(i * 2.4), RX(0.5 + (i % 3) * 0.25), T(0, 0.09, 0)), 0.035, 0.18, 0.006, i % 2 ? '#2f7d4a' : '#3f9a5c', 0.002);
  }

  /* ================= standing electronics bench (island) ================= */
  const bench = node('bench');
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
    [[-0.55, COL.red], [-0.15, COL.blue], [0.25, COL.yellow]].forEach(([o, c]) => {
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
      bench.rbox(T(tx, BY + 0.45, back + 0.04), 0.03, 0.07, 0.02, [COL.red, COL.amber, COL.blue][i % 3], 0.006);
    }
    // filament spools + parts drawers on the top shelf
    [COL.magenta, COL.cyan, COL.lime, COL.white, COL.purple].forEach((c, i) => {
      bench.cyl(C(T(x0b + 0.15 + i * 0.13, BY + 0.735, back + 0.1), RX(PI / 2)), 0.1, 0.07, c, 16);
      bench.cyl(C(T(x0b + 0.15 + i * 0.13, BY + 0.735, back + 0.1), RX(PI / 2)), 0.035, 0.075, COL.dark, 10);
    });
    bench.rbox(T(BX + 0.72, BY + 0.71, back + 0.1), 0.3, 0.16, 0.18, COL.offwhite, 0.008);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
      bench.rbox(T(BX + 0.615 + c * 0.07, BY + 0.66 + r * 0.05, back + 0.192), 0.06, 0.04, 0.006, [COL.blue, COL.red, COL.yellow, COL.green][(r + c) % 4], 0.003);

    // 3D printer, enclosed core-xy style
    {
      const px = BX - 0.6, pz = BZ + 0.05, w = 0.4;
      bench.rbox(T(px, BY + 0.05, pz), w, 0.1, w, COL.offwhite, 0.012);
      bench.quad(T(px - 0.1, BY + 0.05, pz + w / 2 + 0.001), 0.1, 0.05, '#3b82f6', MAT.EMIT);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bench.rbox(T(px + sx * (w / 2 - 0.012), BY + 0.29, pz + sz * (w / 2 - 0.012)), 0.024, 0.4, 0.024, COL.offwhite, 0.006);
      bench.rbox(T(px, BY + 0.5, pz), w, 0.025, w, COL.offwhite, 0.008);
      bench.rbox(T(px, BY + 0.11, pz), 0.3, 0.012, 0.3, '#3f3f46', 0.003);
      bench.box(T(px, BY + 0.29, pz - w / 2 + 0.005), w - 0.05, 0.38, 0.004, '#2a2d34');            // back panel
      bench.box(T(px, BY + 0.48, pz + 0.08), w - 0.06, 0.006, 0.006, '#fff7e6', MAT.EMIT);         // chamber light
    }
    // bench power supply
    bench.rbox(T(BX - 0.2, BY + 0.06, back + 0.15), 0.2, 0.12, 0.2, '#30333b', 0.01);
    bench.quad(T(BX - 0.24, BY + 0.08, back + 0.251), 0.07, 0.03, '#ff3b2f', MAT.EMIT);
    bench.quad(T(BX - 0.16, BY + 0.08, back + 0.251), 0.07, 0.03, '#22c55e', MAT.EMIT);
    for (const [kx, c] of [[-0.25, COL.red], [-0.2, COL.black], [-0.15, COL.red]]) bench.cyl(C(T(BX + kx, BY + 0.035, back + 0.255), RX(PI / 2)), 0.009, 0.012, c, 8);
    // oscilloscope
    bench.rbox(T(BX + 0.12, BY + 0.09, back + 0.15), 0.3, 0.17, 0.16, COL.offwhite, 0.012);
    bench.rbox(T(BX + 0.08, BY + 0.095, back + 0.231), 0.19, 0.12, 0.004, COL.bezel, 0.003);
    bench.quad(T(BX + 0.08, BY + 0.095, back + 0.234), 0.18, 0.11, '#ffffff', MAT.SCOPE);
    for (let i = 0; i < 4; i++) bench.cyl(C(T(BX + 0.22, BY + 0.05 + i * 0.03, back + 0.235), RX(PI / 2)), 0.008, 0.01, COL.dark, 8);
    // soldering station + iron + helping hands + PCB + multimeter
    bench.rbox(T(BX + 0.45, BY + 0.045, BZ), 0.14, 0.09, 0.14, '#1d4ed8', 0.01);
    bench.quad(T(BX + 0.45, BY + 0.06, BZ + 0.071), 0.07, 0.03, '#ff3b2f', MAT.EMIT);
    bench.cyl(C(T(BX + 0.62, BY + 0.06, BZ - 0.05), RX(0.7)), 0.022, 0.1, COL.alu, 10);
    bench.tube(I(), [BX + 0.62, BY + 0.03, BZ - 0.08], [BX + 0.62, BY + 0.15, BZ + 0.04], 0.008, COL.dark, 6);
    bench.rbox(T(BX + 0.2, BY + 0.005, BZ + 0.15), 0.14, 0.01, 0.14, COL.dark, 0.004);
    bench.tube(I(), [BX + 0.2, BY, BZ + 0.15], [BX + 0.2, BY + 0.16, BZ + 0.15], 0.004, COL.alu, 5);
    for (const s of [-1, 1]) bench.tube(I(), [BX + 0.2, BY + 0.16, BZ + 0.15], [BX + 0.2 + s * 0.08, BY + 0.1, BZ + 0.15], 0.003, COL.alu, 5);
    bench.box(T(BX + 0.2, BY + 0.1, BZ + 0.15), 0.12, 0.004, 0.07, '#15803d');
    for (let i = 0; i < 3; i++) bench.box(T(BX + 0.17 + i * 0.03, BY + 0.105, BZ + 0.14), 0.016, 0.006, 0.016, COL.black);
    bench.box(T(BX + 0.23, BY + 0.104, BZ + 0.17), 0.005, 0.005, 0.005, COL.red, MAT.LED);
    bench.rbox(C(T(BX - 0.05, BY + 0.015, BZ + 0.2), RY(0.3)), 0.09, 0.03, 0.16, COL.yellow, 0.01);
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
      for (const s of [-1, 1]) bench.box(C(bp, T(s * 0.017, 0.212, 0.031)), 0.012, 0.012, 0.004, COL.cyan, MAT.EMIT);
      const qp = T(BX - 0.1, sy, sz);
      bench.rbox(C(qp, T(0, 0.1, 0)), 0.2, 0.05, 0.08, COL.yellow, 0.015);
      bench.rbox(C(qp, T(0.12, 0.11, 0)), 0.05, 0.04, 0.06, COL.dark, 0.01);
      for (const [lx, lz] of [[-0.07, -1], [0.07, -1], [-0.07, 1], [0.07, 1]]) {
        bench.tube(qp, [lx, 0.09, lz * 0.04], [lx + 0.03, 0.05, lz * 0.045], 0.008, COL.dark, 5);
        bench.tube(qp, [lx + 0.03, 0.05, lz * 0.045], [lx, 0.003, lz * 0.045], 0.007, COL.yellow, 5);
      }
      const rb = T(BX + 0.42, sy, sz);
      bench.cyl(C(rb, T(0, 0.05, 0)), 0.05, 0.08, COL.white, 14, 0, 0.04);
      bench.cyl(C(rb, T(0, 0.095, 0)), 0.04, 0.012, COL.dark, 14);
      bench.box(C(rb, T(0, 0.06, 0.047)), 0.04, 0.012, 0.004, COL.magenta, MAT.EMIT);
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
      bench.rbox(C(bc, T(0, 0.98, 0.17), RX(-0.15)), 0.32, 0.16, 0.025, COL.white, 0.012);
      bench.tube(bc, [0, 0.8, 0.15], [0, 0.95, 0.17], 0.01, COL.alu, 6);
    }
  }
  // printer moving parts
  const PX = BX - 0.6, PZ = BZ + 0.05, BED = BY + 0.118, CYCLE = 30;
  const grow = t => (t % CYCLE) / CYCLE;
  const head = t => [0.08 * Math.sin(t * 3.1), BED + grow(t) * 0.14 + 0.035, 0.08 * Math.sin(t * 2.3 + 1)];
  node('bench', { update(t) { this.model = C(T(PX, BED, PZ), S(1, grow(t) * 0.14 + 0.001, 1)); } })
    .cyl(T(0, 0.5, 0), 0.045, 1, COL.magenta, 16, 0, 0.065);
  node('bench', { update(t) { const h = head(t); this.model = T(PX, h[1] + 0.035, PZ + h[2]); } })
    .rbox(I(), 0.37, 0.018, 0.025, COL.alu, 0.004);
  node('bench', { update(t) { const h = head(t); this.model = T(PX + h[0], h[1], PZ + h[2]); } })
    .rbox(T(0, 0.02, 0), 0.06, 0.065, 0.06, COL.white, 0.01)
    .cyl(C(T(0, 0.025, 0.031), RX(PI / 2)), 0.018, 0.004, COL.dark, 10)
    .cyl(T(0, -0.02, 0), 0.008, 0.02, COL.orange, 6, MAT.EMIT, 0.002);

  // robot arm
  const AB = [BX + 0.62, BY, BZ + 0.2];
  const armA = t => C(T(...AB), RY(Math.sin(t * 0.6) * 1.2));
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
  const rv = node('bench', {
    update(t) {
      const s = t * 0.22, cx = 2.4, cz = 1.5, rx = 0.8, rz = 0.5;
      rover.x = cx + rx * Math.cos(s); rover.z = cz + rz * Math.sin(s);
      this.model = C(T(rover.x, 0, rover.z), RY(Math.atan2(-rx * Math.sin(s), rz * Math.cos(s))));
    },
  });
  rv.rbox(T(0, 0.085, 0), 0.17, 0.07, 0.22, COL.white, 0.02);
  rv.box(T(0, 0.085, 0), 0.176, 0.016, 0.226, COL.purple);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    rv.cyl(C(T(sx * 0.095, 0.04, sz * 0.07), RZ(PI / 2)), 0.04, 0.03, COL.dark, 12);
    rv.cyl(C(T(sx * 0.111, 0.04, sz * 0.07), RZ(PI / 2)), 0.018, 0.004, COL.alu, 8);
  }
  rv.rbox(T(0, 0.158, 0.04), 0.11, 0.075, 0.08, COL.white, 0.02);
  rv.box(T(0, 0.158, 0.081), 0.09, 0.048, 0.004, '#0b0b0e');
  for (const s of [-1, 1]) rv.box(T(s * 0.022, 0.161, 0.084), 0.018, 0.018, 0.004, COL.cyan, MAT.EMIT);
  rv.tube(I(), [0.03, 0.19, 0.02], [0.05, 0.27, 0.0], 0.003, COL.dark, 4);
  rv.box(T(0.05, 0.275, 0), 0.012, 0.012, 0.012, COL.magenta, MAT.LED);

  /* ================= sport corner: bike on the wall + kit wardrobe ================= */
  const sport = node('bike');
  const X = -2.37;
  const P = (z, y, dx = 0) => [X + dx, y, z];
  const RA = [-0.95, 1.55], FA = [0.03, 1.55], BB = [-0.54, 1.48];
  const ST = [-0.64, 1.95], HT = [-0.09, 1.9], HB = [-0.04, 1.76];
  const frame = '#1d1f25', accent = COL.red;
  {
    const tub = (a, b, r = 0.016, c = frame) => sport.tube(I(), P(...a), P(...b), r, c, 8);
    tub(BB, ST, 0.022); tub(ST, HT, 0.018); tub(BB, HB, 0.025); tub(HT, HB, 0.022);
    for (const dx of [-0.03, 0.03]) {
      sport.tube(I(), P(...RA, dx), P(...BB, dx * 0.5), 0.01, frame, 6);
      sport.tube(I(), P(...RA, dx), P(-0.6, 1.72, dx * 0.5), 0.01, frame, 6);
      sport.tube(I(), P(...HB, dx * 0.5), P(...FA, dx), 0.013, frame, 6);
    }
    sport.tube(I(), P(-0.38, 1.62), P(-0.2, 1.71), 0.027, accent, 8);
    sport.tube(I(), P(-0.6, 1.85), P(-0.32, 1.92), 0.02, accent, 8);
    tub(ST, [-0.69, 2.12], 0.015, COL.carbon);
    sport.rbox(T(X, 2.14, -0.7), 0.06, 0.03, 0.26, '#0e0e10', 0.01);
    sport.rbox(T(X, 1.94, -0.07), 0.06, 0.03, 0.1, COL.carbon, 0.008);
    sport.tube(I(), P(-0.07, 1.98, -0.2), P(-0.07, 1.98, 0.2), 0.012, COL.carbon, 6);
    for (const dx of [-0.05, 0.05]) {
      sport.tube(I(), P(-0.1, 2.0, dx), P(0.27, 2.03, dx), 0.008, COL.carbon, 6);
      sport.rbox(T(X + dx, 2.035, -0.05), 0.05, 0.015, 0.09, '#0e0e10', 0.006);
    }
    sport.torus(C(T(...P(...BB, 0.04)), RY(PI / 2)), 0.1, 0.008, COL.alu, 24, 4);
    sport.torus(C(T(...P(...BB, 0.04)), RY(PI / 2)), 0.06, 0.006, COL.aluDark, 16, 4);
    sport.tube(I(), P(...BB, 0.05), P(BB[0] + 0.12, BB[1] - 0.12, 0.05), 0.008, COL.carbon, 5);
    sport.tube(I(), P(...BB, -0.05), P(BB[0] - 0.12, BB[1] + 0.12, -0.05), 0.008, COL.carbon, 5);
    sport.tube(I(), P(BB[0], BB[1] + 0.1, 0.04), P(RA[0], RA[1] + 0.04, 0.04), 0.003, COL.aluDark, 4);   // chain
    sport.tube(I(), P(BB[0], BB[1] - 0.1, 0.04), P(RA[0], RA[1] - 0.04, 0.04), 0.003, COL.aluDark, 4);
    sport.cyl(C(T(...P(-0.36, 1.66, 0.0)), RX(-1.08)), 0.034, 0.2, COL.white, 12);                         // bottle
    for (const z of [RA[0], FA[0]]) sport.rbox(T(-2.44, 1.9, z), 0.12, 0.025, 0.025, COL.alu, 0.005);
  }
  const spin = { a: 0 };
  const wheelNode = (ax, build) => {
    const g = node('bike', { update() { this.model = C(T(...P(...ax)), RX(spin.a)); } });
    g.torus(RY(PI / 2), 0.335, 0.013, '#0b0b0d', 40, 6);
    build(g);
  };
  wheelNode(RA, g => {
    g.cyl(RZ(PI / 2), 0.32, 0.03, '#1c1c21', 32);
    g.torus(RY(PI / 2), 0.24, 0.005, accent, 32, 3);
    g.cyl(RZ(PI / 2), 0.05, 0.05, COL.alu, 12);
  });
  wheelNode(FA, g => {
    g.torus(RY(PI / 2), 0.3, 0.025, '#1c1c21', 36, 5);
    for (let k = 0; k < 3; k++) g.rbox(C(RX(k * 2 * PI / 3), T(0, 0.15, 0)), 0.016, 0.3, 0.04, '#1c1c21', 0.006);
    g.cyl(RZ(PI / 2), 0.03, 0.06, COL.alu, 12);
  });
  // wardrobe: open front, clothes on a rail, helmets on top, shoes at the bottom
  {
    const wz = 1.35, wd = 0.55, wx = x0 + wd / 2, ww = 1.0, wh = 2.0;
    const fx = x0 + wd;
    for (const s of [-1, 1]) sport.rbox(T(wx, wh / 2, wz + s * (ww / 2 - 0.012)), wd, wh, 0.024, COL.white, 0.006);
    sport.rbox(T(wx, wh - 0.012, wz), wd, 0.024, ww, COL.white, 0.006);
    sport.rbox(T(wx, 0.06, wz), wd, 0.024, ww, COL.white, 0.006);
    sport.rbox(T(wx, 0.38, wz), wd - 0.03, 0.02, ww - 0.04, COL.white, 0.005);
    sport.rbox(T(wx, 1.7, wz), wd - 0.03, 0.02, ww - 0.04, COL.white, 0.005);
    sport.box(T(wx, 1.688, wz), 0.02, 0.006, ww - 0.1, '#fff4e0', MAT.EMIT);
    sport.tube(I(), [wx, 1.58, wz - ww / 2 + 0.03], [wx, 1.58, wz + ww / 2 - 0.03], 0.01, COL.alu, 8);
    // hanging kit: tri suit, cycling jersey, running tops, a rain jacket
    const kit = [['#111827', COL.red], [COL.blue, COL.white], [COL.lime, COL.lime], ['#f8fafc', COL.cyan],
      [COL.orange, COL.orange], ['#111827', COL.magenta], [COL.purple, COL.white]];
    kit.forEach(([c, a], i) => {
      const kz = wz - 0.38 + i * 0.125, len = i === 0 ? 0.85 : i === 4 ? 0.7 : 0.55;
      sport.tube(I(), [wx, 1.58, kz], [wx, 1.53, kz], 0.004, COL.alu, 4);
      sport.rbox(T(wx, 1.53, kz), 0.38, 0.012, 0.02, COL.alu, 0.004);
      sport.rbox(T(wx, 1.53 - len / 2, kz), 0.4, len, 0.035, c, 0.012);
      sport.rbox(T(wx + 0.06, 1.53 - len * 0.35, kz), 0.08, len * 0.4, 0.038, a, 0.008);
    });
    // helmets on the top shelf: aero + road
    const ah = T(wx, 1.8, wz - 0.22);
    sport.cyl(C(ah, RZ(PI / 2), T(0, 0.05, 0)), 0.11, 0.32, COL.white, 16, 0, 0.03);
    sport.rbox(C(ah, T(0.13, -0.02, 0)), 0.12, 0.08, 0.2, COL.bezel, 0.03);
    sport.box(C(ah, T(-0.02, 0.07, 0)), 0.2, 0.01, 0.03, COL.red);
    const rh = T(wx, 1.77, wz + 0.2);
    sport.cyl(rh, 0.14, 0.12, COL.red, 16, 0, 0.06);
    for (let i = 0; i < 5; i++) sport.box(C(rh, RY(i * 0.6 - 1.2), T(0.11, 0.0, 0)), 0.03, 0.08, 0.015, COL.dark);
    // swim goggles
    for (const dz of [0.4, 0.45]) sport.torus(C(T(fx - 0.06, 1.74, wz + dz - 0.04), RX(PI / 2)), 0.022, 0.006, COL.cyan, 12, 3);
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
    // race bib + medals above the wardrobe
    sport.rbox(T(x0 + 0.01, 2.27, wz - 0.15), 0.02, 0.3, 0.36, COL.white, 0.004);
    sport.quad(C(T(x0 + 0.022, 2.27, wz - 0.15), RY(PI / 2)), 0.32, 0.26, '#ffffff', MAT.TEX, [0, 0.25, 0.0625, 0.5]);
    for (let i = 0; i < 3; i++) {
      const mz = wz + 0.18 + i * 0.1;
      sport.box(T(x0 + 0.015, 2.24, mz), 0.004, 0.2, 0.025, [COL.blue, COL.red, COL.lime][i]);
      sport.cyl(C(T(x0 + 0.02, 2.12, mz), RZ(PI / 2)), 0.035, 0.008, '#e5b33b', 16);
    }
    sport.rbox(T(x0 + 0.02, 2.36, wz + 0.28), 0.03, 0.02, 0.3, COL.alu, 0.004);
    // floor: rolled yoga mat, foam roller, kettlebell
    sport.cyl(C(T(fx + 0.15, 0.06, wz + 0.75), RX(PI / 2)), 0.06, 0.6, COL.purple, 14);
    sport.cyl(C(T(fx + 0.35, 0.075, wz + 0.7), RY(0.3), RX(PI / 2)), 0.075, 0.35, COL.cyan, 14);
    sport.cyl(T(fx + 0.12, 0.065, wz - 0.75), 0.08, 0.13, COL.dark, 14, 0, 0.065);
    sport.torus(T(fx + 0.12, 0.165, wz - 0.75), 0.05, 0.012, COL.dark, 14, 4);
  }

  /* ================= hotspots ================= */
  const box = (a, b) => () => [a, b];
  const hotspots = [
    { id: 'me', boxes: [box([SX - 0.7, 1.72, -1.8], [SX + 0.7, 2.2, -1.6]), box([1.95, 0.3, -1.8], [3.05, 2.4, -1.65])],
      anchor: [SX, 2.25, -1.7], view: { target: [SX + 0.6, 1.6, -1.4], yaw: 0.2, pitch: 0.1, r: 1.25 } },
    { id: 'desk', boxes: [box([-2.45, 0, -1.8], [-0.75, 1.35, -0.1])], anchor: [-1.6, 1.42, -1.45],
      view: { target: [-1.55, 0.95, -1.3], yaw: 0.06, pitch: 0.45, r: 0.95 } },
    { id: 'sim', boxes: [box([SX - 0.85, 0, -1.65], [SX + 0.85, 1.3, 0.6])], anchor: [SX, 1.38, -1.35],
      view: { target: [SX, 0.7, -0.55], yaw: 0.72, pitch: 0.42, r: 1.1 } },
    { id: 'rack', boxes: [box([RKX - 0.35, 0, -1.8], [RKX + 0.35, 1.5, -1.1])], anchor: [RKX, 1.58, -1.4],
      view: { target: [RKX, 0.7, -1.3], yaw: 0.3, pitch: 0.18, r: 0.8 } },
    { id: 'bench', boxes: [box([BX - 0.95, 0, BZ - 0.4], [BX + 0.95, BY + 0.85, BZ + 0.85]),
      () => [[rover.x - 0.16, 0, rover.z - 0.16], [rover.x + 0.16, 0.3, rover.z + 0.16]]],
      anchor: [BX, BY + 0.95, BZ - 0.25], view: { target: [BX, BY + 0.15, BZ], yaw: 0.35, pitch: 0.42, r: 1.0 } },
    { id: 'bike', boxes: [box([x0, 0, -1.4], [x0 + 0.6, 2.45, 2.45])], anchor: [-2.3, 2.35, 0.4],
      view: { target: [-2.2, 1.25, 0.3], yaw: 0.95, pitch: 0.2, r: 1.3 } },
  ];

  return { nodes, hotspots, spin };
}

// Neon sign + race bib, drawn once into a 1024x512 canvas (y flipped on upload)
export function atlas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '600 150px ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif';
  for (const [blur, col] of [[60, '#d946ef'], [30, '#ec4899'], [12, '#f9a8d4']]) {
    g.shadowColor = col; g.shadowBlur = blur; g.fillStyle = col;
    g.fillText('dalogax', 512, 128);
  }
  g.shadowBlur = 6; g.shadowColor = '#fff'; g.fillStyle = '#ffe4f6';
  g.fillText('dalogax', 512, 128);
  g.lineWidth = 7; g.strokeStyle = '#fdf4ff'; g.shadowColor = '#22d3ee'; g.shadowBlur = 24;
  g.beginPath(); g.moveTo(170, 222); g.lineTo(854, 222); g.stroke();
  // bib: x 0..256, y 256..480
  g.shadowBlur = 0;
  g.fillStyle = '#f4f4f5'; g.fillRect(0, 256, 256, 224);
  g.fillStyle = '#e11d48'; g.fillRect(0, 256, 256, 46);
  g.fillStyle = '#fff'; g.font = '700 28px system-ui, sans-serif'; g.fillText('TRIATHLON', 128, 280);
  g.fillStyle = '#111'; g.font = '800 110px system-ui, sans-serif'; g.fillText('89', 128, 392);
  for (const x of [14, 242]) for (const y of [316, 466]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  return c;
}
