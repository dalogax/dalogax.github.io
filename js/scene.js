// The room, built from primitives. Units are metres, Y up.
// Back wall at z = -1.75, left wall at x = -2.5, the open sides face +x/+z.
import { m4, Geo, MAT } from './engine.js';

const { T, RX, RY, RZ, S, C } = m4;
const PI = Math.PI;

const COL = {
  wall: '#2b2e3d', base: '#14151c', skirt: '#1c1e28', wood: '#6a4a36',
  black: '#17171b', dark: '#222228', alu: '#8c939d', bezel: '#0b0b0e',
  red: '#b4232c', purple: '#8b5cf6', magenta: '#ec4899', cyan: '#22d3ee',
  green: '#22c55e', amber: '#f59e0b', blue: '#3b82f6', ply: '#a77f59',
  peg: '#c7a47a', orange: '#f97316', white: '#e7e9ee', lime: '#a3e635',
};

// Point lights (position, linear colour * intensity)
export const LIGHTS = [
  [[-1.65, 1.05, -1.2], [.25, .45, 1.1]],    // ultrawide glow
  [[0.15, 1.05, -0.95], [1.0, .55, .4]],     // sim screens
  [[1.9, .75, -0.7], [.7, .85, 1.0]],         // rack LEDs
  [[-2.05, 1.35, 0.75], [1.4, .95, .55]],    // bench lamp
  [[0.15, 1.95, -1.5], [1.1, .25, .9]],      // neon sign
  [[-1.95, 2.3, -0.5], [.75, .6, 1.1]],      // wash over the bike
];

export function buildScene() {
  const nodes = [];
  const node = (hot = null, opts = {}) => {
    const geo = new Geo();
    nodes.push({ geo, hot, model: m4.I(), ...opts });
    return geo;
  };

  /* ---------- room shell ---------- */
  const room = node(null, { noShadow: true });
  room.box(T(-0.05, -0.09, -0.05), 5.1, 0.18, 3.6, COL.base);
  room.quad(C(T(0, 0.001, 0), RX(-PI / 2)), 5.0, 3.5, COL.wood, MAT.FLOOR);
  room.box(T(-0.05, 1.3, -1.8), 5.1, 2.6, 0.1, COL.wall);
  room.box(T(-2.55, 1.3, -0.05), 0.1, 2.6, 3.6, COL.wall);
  room.box(T(0, 0.04, -1.74), 5.0, 0.08, 0.02, COL.skirt);
  room.box(T(-2.49, 0.04, 0), 0.02, 0.08, 3.5, COL.skirt);
  // LED strip along the ceiling line
  room.box(T(0, 2.57, -1.735), 5.0, 0.025, 0.02, COL.purple, MAT.EMIT);
  room.box(T(-2.485, 2.57, 0), 0.02, 0.025, 3.5, COL.purple, MAT.EMIT);
  // posters above the desk
  for (const [x, c1, c2] of [[-2.05, '#3b1f5c', '#f472b6'], [-1.3, '#0f2f44', '#22d3ee']]) {
    room.box(T(x, 1.75, -1.74), 0.5, 0.66, 0.02, COL.bezel);
    room.quad(T(x, 1.75, -1.729), 0.44, 0.6, c1);
    room.quad(T(x, 1.62, -1.728), 0.3, 0.3, c2, MAT.LIT);
    room.quad(T(x, 1.62, -1.727), 0.18, 0.18, c1);
  }
  // plant next to the rack
  room.cyl(T(2.06, 1.36, -1.6), 0.06, 0.12, '#d6cfc4', 10, 0, 0.075);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, tilt = 0.5 + (i % 3) * 0.25;
    room.box(C(T(2.06, 1.42, -1.6), RY(a), RX(tilt), T(0, 0.09 + (i % 2) * 0.03, 0)), 0.035, 0.18, 0.006, i % 2 ? '#2f7d4a' : '#3f9a5c');
  }

  /* ---------- desk: gaming PC + ultrawide ---------- */
  const desk = node('desk');
  desk.box(T(-1.65, 0.72, -1.375), 1.5, 0.04, 0.75, '#2a2624');
  for (const x of [-2.32, -0.98]) {
    desk.box(T(x, 0.36, -1.375), 0.06, 0.68, 0.06, COL.black);
    desk.box(T(x, 0.02, -1.375), 0.07, 0.04, 0.66, COL.black);
  }
  desk.box(T(-1.65, 0.62, -1.62), 1.3, 0.05, 0.04, COL.black);
  desk.box(T(-1.65, 0.742, -1.15), 0.9, 0.004, 0.36, '#121217');
  desk.box(T(-1.65, 0.744, -0.97), 0.9, 0.004, 0.006, [.2, .2, .2], MAT.RGB);
  desk.box(T(-1.78, 0.755, -1.17), 0.44, 0.022, 0.14, '#1b1b20');
  desk.quad(C(T(-1.78, 0.767, -1.17), RX(-PI / 2)), 0.42, 0.12, [.12, .12, .12], MAT.RGB);
  desk.box(T(-1.38, 0.756, -1.15), 0.06, 0.03, 0.11, '#1b1b20');
  // ultrawide, curved: 8 segments on a 1 m radius arc
  {
    const cx = -1.65, cy = 1.04, zs = -1.5, R = 1.0, W = 0.82, H = 0.35, N = 8, span = W / R;
    const chord = 2 * R * Math.sin(span / N / 2) + 0.002;
    for (let i = 0; i < N; i++) {
      const a = -span / 2 + (i + .5) * span / N;
      const px = cx + R * Math.sin(a), pz = zs + R - R * Math.cos(a);
      const nx = -Math.sin(a), nz = Math.cos(a);
      desk.box(C(T(px - nx * 0.016, cy, pz - nz * 0.016), RY(-a)), chord + 0.01, H + 0.03, 0.03, COL.bezel);
      desk.quad(C(T(px, cy, pz), RY(-a)), chord, H, '#ffffff', MAT.CODE, [i / N, (i + 1) / N, 0, 1]);
    }
    desk.box(T(cx, 0.91, -1.55), 0.05, 0.3, 0.03, COL.dark);
    desk.box(T(cx, 0.75, -1.5), 0.26, 0.015, 0.18, COL.dark);
  }
  // speakers
  desk.box(T(-2.22, 0.85, -1.55), 0.11, 0.2, 0.13, '#111114');
  // tower on the desk, glass side facing the room
  {
    const x = -1.06, y = 0.98, z = -1.48;
    desk.box(T(x, y, z), 0.22, 0.48, 0.46, '#111115');
    for (const fy of [-0.14, 0, 0.14]) {
      desk.cyl(C(T(x, y + fy, z + 0.231), RX(PI / 2)), 0.06, 0.004, '#09090b', 16);
      desk.torus(T(x, y + fy, z + 0.234), 0.066, 0.007, [.35, .35, .35], 18, 4, MAT.RGB);
    }
    desk.quad(C(T(x + 0.111, y, z), RY(PI / 2)), 0.42, 0.42, '#2a1d52', MAT.EMIT);
    desk.box(T(x + 0.09, y - 0.02, z + 0.02), 0.03, 0.06, 0.3, '#2b2b31');        // GPU
    desk.box(T(x + 0.112, y + 0.2, z), 0.004, 0.01, 0.4, [.6, .6, .6], MAT.RGB);
  }
  // chair
  {
    const ch = C(T(-2.0, 0, -0.5), RY(0.75));
    for (let k = 0; k < 5; k++) {
      desk.box(C(ch, RY(k * 2 * PI / 5), T(0, 0.06, 0.17)), 0.05, 0.04, 0.34, COL.black);
      desk.cyl(C(ch, RY(k * 2 * PI / 5), T(0, 0.025, 0.33)), 0.025, 0.05, COL.black, 8);
    }
    desk.cyl(C(ch, T(0, 0.27, 0)), 0.028, 0.4, COL.alu, 8);
    desk.box(C(ch, T(0, 0.49, 0)), 0.52, 0.09, 0.5, COL.dark);
    desk.box(C(ch, T(0, 0.98, 0.25), RX(-0.12)), 0.5, 0.82, 0.09, COL.dark);
    desk.box(C(ch, T(0, 0.98, 0.2), RX(-0.12)), 0.16, 0.72, 0.012, COL.purple);
    for (const s of [-1, 1]) {
      desk.box(C(ch, T(s * 0.28, 0.62, 0.05)), 0.05, 0.03, 0.26, COL.black);
      desk.box(C(ch, T(s * 0.28, 0.56, 0.12)), 0.03, 0.12, 0.03, COL.black);
    }
  }
  desk.cyl(T(-1.75, 0.004, -0.75), 0.7, 0.008, '#2c2250', 24);

  /* ---------- sim rig: triple screens ---------- */
  const sim = node('sim');
  sim.box(T(0.15, 0.006, -0.6), 1.1, 0.012, 2.1, '#101013');
  for (const x of [-0.1, 0.4]) {
    sim.box(T(x, 0.05, -0.45), 0.08, 0.08, 1.6, COL.alu);
    sim.box(T(x, 0.4, -0.65), 0.08, 0.62, 0.08, COL.alu);
  }
  for (const z of [-1.21, 0.31]) sim.box(T(0.15, 0.05, z), 0.58, 0.08, 0.08, COL.alu);
  sim.box(T(0.15, 0.69, -0.65), 0.58, 0.08, 0.08, COL.alu);
  sim.box(T(0.15, 0.77, -0.62), 0.13, 0.13, 0.22, '#1a1a1f');                      // wheelbase
  sim.box(C(T(0.15, 0.17, -0.98), RX(-0.5)), 0.42, 0.02, 0.28, '#2a2a30');           // pedal plate
  for (const [x, h] of [[0.03, .16], [0.15, .2], [0.27, .2]]) sim.box(C(T(x, 0.24, -0.95), RX(0.4)), 0.05, h, 0.015, COL.alu);
  sim.box(T(0.15, 0.2, 0.08), 0.3, 0.12, 0.35, '#2a2a30');                           // seat mount
  sim.box(T(0.15, 0.32, 0.06), 0.46, 0.1, 0.44, COL.black);
  sim.box(C(T(0.15, 0.72, 0.3), RX(-0.28)), 0.46, 0.72, 0.1, COL.black);
  for (const s of [-1, 1]) {
    sim.box(C(T(0.15 + s * 0.21, 0.42, 0.06), RZ(s * 0.25)), 0.06, 0.16, 0.42, COL.red);
    sim.box(C(T(0.15 + s * 0.2, 0.75, 0.29), RX(-0.28), RZ(s * 0.2)), 0.07, 0.58, 0.12, COL.red);
  }
  // triple monitor stand + screens
  sim.box(T(0.15, 0.55, -1.47), 0.06, 1.0, 0.06, COL.dark);
  sim.box(T(0.15, 0.02, -1.47), 0.9, 0.04, 0.12, COL.dark);
  sim.box(T(0.15, 1.02, -1.49), 1.1, 0.04, 0.04, COL.dark);
  {
    const W = 0.66, H = 0.38, y = 1.04, z = -1.4, a = 0.8;
    const scr = (t, i) => {
      sim.box(C(t, T(0, 0, -0.017)), W + 0.03, H + 0.03, 0.03, COL.bezel);
      sim.quad(t, W, H, '#ffffff', MAT.RACE, [i / 3, (i + 1) / 3, 0, 1]);
    };
    scr(C(T(0.15 - W / 2 - W / 2 * Math.cos(a), y, z + W / 2 * Math.sin(a)), RY(a)), 0);
    scr(T(0.15, y, z), 1);
    scr(C(T(0.15 + W / 2 + W / 2 * Math.cos(a), y, z + W / 2 * Math.sin(a)), RY(-a)), 2);
  }
  // steering wheel, rotates with the road
  const wheel = node('sim', {
    update(t, s) { this.model = C(T(0.15, 0.78, -0.49), RZ(-s.steer * 1.1)); },
  });
  wheel.torus(m4.I(), 0.15, 0.018, '#1c1c20', 24, 5);
  wheel.box(m4.I(), 0.1, 0.07, 0.04, '#2a2a30');
  wheel.box(T(0, -0.08, 0), 0.03, 0.14, 0.02, '#2a2a30');
  for (const s of [-1, 1]) wheel.box(T(s * 0.09, 0, 0), 0.12, 0.025, 0.02, '#2a2a30');
  for (let i = 0; i < 5; i++) wheel.box(T(-0.04 + i * 0.02, 0.04, 0.022), 0.012, 0.008, 0.004, i < 2 ? COL.green : i < 4 ? COL.amber : COL.red, MAT.EMIT);

  /* ---------- neon sign ---------- */
  const sign = node('me');
  sign.box(T(0.15, 1.95, -1.743), 1.34, 0.42, 0.012, '#0d0d12');
  const neon = node('me', { blend: true, noShadow: true });
  neon.quad(T(0.15, 1.95, -1.735), 1.34, 0.42, '#ffffff', MAT.NEON, [0, 1, 0.5, 1]);

  /* ---------- server rack ---------- */
  const rack = node('rack');
  {
    const x = 1.9, z = -1.45, F = -1.175;
    for (const sx of [-0.285, 0.285]) rack.box(T(x + sx, 0.67, z), 0.03, 1.26, 0.6, '#16171c');
    rack.box(T(x, 1.285, z), 0.6, 0.03, 0.6, '#16171c');
    rack.box(T(x, 0.055, z), 0.6, 0.03, 0.6, '#16171c');
    rack.box(T(x, 0.67, -1.735), 0.54, 1.22, 0.01, '#0e0f12');
    for (const sx of [-0.255, 0.255]) rack.box(T(x + sx, 0.67, F + 0.005), 0.03, 1.22, 0.02, '#3a3d45');
    for (const [sx, sz] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) rack.cyl(T(x + sx, 0.02, z + sz), 0.02, 0.04, COL.black, 8);

    const U = 0.0445;
    let y = 0.075;
    const unit = (u, col) => { const cy = y + u * U / 2; rack.box(T(x, cy, z + 0.03), 0.48, u * U - 0.003, 0.5, col); y += u * U; return cy; };
    const led = (lx, ly, c, size = 0.008) => rack.box(T(x + lx, ly, F + 0.007), size, size, 0.006, c, MAT.LED);

    let cy = unit(2, '#2a2b31');                                                     // UPS
    rack.quad(T(x - 0.12, cy, F + 0.006), 0.08, 0.035, '#1e6bd6', MAT.EMIT);
    led(0.18, cy, COL.green);
    unit(1, '#1a1b20');
    cy = unit(4, '#3a3d45');                                                         // NAS
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
      const bx = -0.18 + c * 0.072, by = cy - 0.04 + r * 0.08;
      rack.box(T(x + bx, by, F + 0.004), 0.064, 0.07, 0.008, '#555a64');
      led(bx + 0.022, by + 0.026, c % 3 ? COL.blue : COL.green, 0.006);
    }
    for (let s = 0; s < 2; s++) {                                                     // 2U servers
      cy = unit(2, '#43464f');
      rack.box(T(x, cy, F + 0.004), 0.34, 0.075, 0.008, '#1c1d22');
      rack.box(T(x, cy - 0.03, F + 0.009), 0.3, 0.004, 0.004, COL.blue, MAT.EMIT);
      for (let c = 0; c < 4; c++) led(-0.215 + c * 0.012, cy + 0.02, c === 3 ? COL.amber : COL.green, 0.006);
    }
    unit(1, '#1a1b20');
    cy = unit(1, '#cfd3da');                                                         // switch
    for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) {
      const bx = -0.17 + c * 0.026 + (c > 5 ? 0.02 : 0);
      rack.box(T(x + bx, cy - 0.009 + r * 0.018, F + 0.003), 0.018, 0.013, 0.006, '#2a2c31');
      led(bx + 0.006, cy - 0.003 + r * 0.018, (c + r) % 4 ? COL.green : COL.amber, 0.004);
    }
    unit(1, '#121317');                                                               // cable manager
    cy = unit(1, '#1b1c21');                                                          // patch panel
    const cables = [COL.blue, COL.amber, COL.red, COL.green, COL.white, COL.blue];
    for (let c = 0; c < 12; c++) {
      const bx = -0.17 + c * 0.03;
      rack.box(T(x + bx, cy, F + 0.004), 0.016, 0.014, 0.008, '#3a3c43');
      if (c % 2 === 0) {
        const cc = cables[c / 2];
        rack.box(T(x + bx, cy, F + 0.03), 0.012, 0.012, 0.05, cc);
        rack.box(T(x + bx, cy - 0.06, F + 0.055), 0.008, 0.12, 0.008, cc);
      }
    }
    unit(1, '#1a1b20');
    cy = unit(3, '#16171b');                                                          // shelf of mini PCs
    for (let c = 0; c < 3; c++) {
      rack.box(T(x - 0.14 + c * 0.14, cy - 0.03, z + 0.1), 0.11, 0.045, 0.11, c === 1 ? '#c9ccd3' : '#2c2f36');
      led(-0.14 + c * 0.14 + 0.04, cy - 0.04, COL.blue, 0.005);
    }
    cy = unit(1, '#26282f');                                                          // router
    for (let c = 0; c < 4; c++) led(0.1 + c * 0.02, cy, COL.green, 0.005);
    // Zigbee coordinator and a mini switch on top
    rack.box(T(x - 0.15, 1.32, z + 0.1), 0.09, 0.03, 0.07, COL.white);
    rack.cyl(C(T(x - 0.17, 1.4, z + 0.08), RZ(0.15)), 0.006, 0.13, COL.black, 6);
    rack.box(T(x - 0.125, 1.33, z + 0.136), 0.006, 0.006, 0.004, COL.green, MAT.LED);
    rack.box(T(x + 0.12, 1.32, z), 0.16, 0.03, 0.12, '#2a2c33');
    for (let c = 0; c < 5; c++) rack.box(T(x + 0.06 + c * 0.025, 1.325, z + 0.061), 0.006, 0.006, 0.004, COL.green, MAT.LED);
  }

  /* ---------- electronics bench ---------- */
  const bench = node('bench');
  const BY = 0.9;
  {
    const bx = -2.175, bz = 1.025;
    bench.box(T(bx, BY - 0.02, bz), 0.65, 0.04, 1.35, COL.ply);
    for (const [lx, lz] of [[-2.46, 0.4], [-1.89, 0.4], [-2.46, 1.65], [-1.89, 1.65]]) bench.box(T(lx, (BY - 0.04) / 2, lz), 0.045, BY - 0.04, 0.045, COL.black);
    bench.box(T(bx, 0.2, bz), 0.6, 0.025, 1.3, COL.ply);
    [[0.6, '#ef4444'], [0.95, '#3b82f6'], [1.3, '#eab308']].forEach(([z, c]) => bench.box(T(bx + 0.02, 0.3, z), 0.4, 0.18, 0.28, c));
    // pegboard + tools
    bench.box(T(-2.494, 1.28, bz), 0.012, 0.55, 1.3, COL.peg);
    for (let i = 0; i < 9; i++) {
      const tz = 0.45 + i * 0.13, len = 0.12 + (i % 3) * 0.05;
      bench.box(T(-2.483, 1.36 - len / 2, tz), 0.012, len, 0.018, '#9ca3af');
      bench.box(T(-2.481, 1.4, tz), 0.016, 0.07, 0.03, ['#ef4444', '#f59e0b', '#3b82f6'][i % 3]);
    }
    // filament shelf
    bench.box(T(-2.4, 1.63, bz), 0.2, 0.02, 1.3, COL.ply);
    ['#f472b6', '#22d3ee', '#a3e635', '#f8fafc', '#8b5cf6', '#f97316'].forEach((c, i) =>
      bench.cyl(C(T(-2.4, 1.735, 0.5 + i * 0.2), RZ(PI / 2)), 0.095, 0.07, c, 14));
    // oscilloscope
    bench.box(T(-2.33, BY + 0.08, 0.55), 0.28, 0.16, 0.14, '#d4d7dd');
    bench.box(C(T(-2.33, BY + 0.08, 0.55), RY(PI / 2), T(-0.06, 0.005, 0.071)), 0.14, 0.11, 0.004, '#0a0a0c');
    bench.quad(C(T(-2.33, BY + 0.085, 0.55), RY(PI / 2), T(-0.03, 0, 0.074)), 0.14, 0.1, '#ffffff', MAT.SCOPE);
    // soldering station + iron + helping hands + PCB
    bench.box(T(-2.3, BY + 0.045, 0.86), 0.14, 0.09, 0.13, '#1d4ed8');
    bench.quad(C(T(-2.229, BY + 0.06, 0.86), RY(PI / 2)), 0.07, 0.03, '#ff3b2f', MAT.EMIT);
    bench.cyl(C(T(-2.12, BY + 0.06, 0.82), RZ(0.7)), 0.02, 0.1, '#9ca3af', 8);
    bench.tube(m4.I(), [-2.16, BY + 0.03, 0.82], [-2.02, BY + 0.16, 0.82], 0.008, COL.dark, 6);
    bench.box(T(-2.0, BY + 0.005, 1.0), 0.12, 0.01, 0.12, '#374151');
    bench.tube(m4.I(), [-2.0, BY, 1.0], [-2.0, BY + 0.14, 1.0], 0.004, COL.alu, 5);
    for (const s of [-1, 1]) bench.tube(m4.I(), [-2.0, BY + 0.14, 1.0], [-1.99, BY + 0.09, 1.0 + s * 0.08], 0.003, COL.alu, 5);
    bench.box(T(-2.0, BY + 0.09, 1.0), 0.06, 0.004, 0.1, '#15803d');
    bench.box(T(-2.0, BY + 0.094, 0.99), 0.02, 0.006, 0.02, COL.black);
    bench.box(T(-1.99, BY + 0.094, 1.03), 0.005, 0.005, 0.005, COL.red, MAT.LED);
    // desk lamp
    bench.cyl(T(-2.42, BY + 0.01, 0.42), 0.06, 0.02, COL.black, 10);
    bench.tube(m4.I(), [-2.42, BY + 0.02, 0.42], [-2.36, BY + 0.5, 0.5], 0.008, COL.black, 6);
    bench.tube(m4.I(), [-2.36, BY + 0.5, 0.5], [-2.12, BY + 0.47, 0.7], 0.008, COL.black, 6);
    bench.cyl(C(T(-2.1, BY + 0.44, 0.72), RZ(0.3)), 0.06, 0.06, COL.black, 10, 0, 0.03);
    bench.cyl(C(T(-2.1, BY + 0.41, 0.72), RZ(0.3)), 0.055, 0.004, '#ffd9a0', 10, MAT.EMIT);
    // 3D printer frame
    {
      const px = -2.2, pz = 1.42, w = 0.38;
      bench.box(T(px, BY + 0.04, pz), w, 0.08, w, '#26262c');
      bench.quad(T(px, BY + 0.04, pz + w / 2 + 0.001), 0.08, 0.04, '#3b82f6', MAT.EMIT);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bench.box(T(px + sx * (w / 2 - 0.01), BY + 0.25, pz + sz * (w / 2 - 0.01)), 0.02, 0.42, 0.02, '#26262c');
      bench.box(T(px, BY + 0.46, pz), w, 0.02, w, '#26262c');
      bench.box(T(px, BY + 0.09, pz), 0.28, 0.01, 0.28, '#3f3f46');
    }
    // stool
    bench.cyl(T(-1.55, 0.6, 1.0), 0.17, 0.05, COL.red, 14);
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2 + PI / 4;
      bench.tube(m4.I(), [-1.55 + Math.cos(a) * 0.08, 0.58, 1.0 + Math.sin(a) * 0.08], [-1.55 + Math.cos(a) * 0.2, 0, 1.0 + Math.sin(a) * 0.2], 0.012, COL.black, 6);
    }
  }
  // printer moving parts
  const PX = -2.2, PZ = 1.42, BED = BY + 0.095, CYCLE = 30;
  const grow = t => (t % CYCLE) / CYCLE;
  const head = t => [0.07 * Math.sin(t * 3.1), BED + grow(t) * 0.12 + 0.035, 0.07 * Math.sin(t * 2.3 + 1)];
  const print = node('bench', { update(t) { this.model = C(T(PX, BED, PZ), S(1, grow(t) * 0.12 + 0.001, 1)); } });
  print.cyl(T(0, 0.5, 0), 0.045, 1, COL.magenta, 14, 0, 0.065);
  const gantry = node('bench', { update(t) { const h = head(t); this.model = T(PX, h[1] + 0.035, PZ + h[2]); } });
  gantry.box(m4.I(), 0.36, 0.02, 0.025, COL.alu);
  const ph = node('bench', { update(t) { const h = head(t); this.model = T(PX + h[0], h[1], PZ + h[2]); } });
  ph.box(T(0, 0.02, 0), 0.06, 0.06, 0.06, '#1f1f24');
  ph.cyl(T(0, -0.02, 0), 0.008, 0.02, COL.orange, 6, MAT.EMIT, 0.002);

  // robot arm
  const AB = [-2.3, BY, 1.12];
  const armA = (t) => C(T(...AB), RY(Math.sin(t * 0.6) * 1.2));
  const armB = (t) => C(armA(t), T(0, 0.07, 0), RX(-0.4 + 0.35 * Math.sin(t * 0.9)));
  const armC = (t) => C(armB(t), T(0, 0.14, 0), RX(0.9 + 0.4 * Math.sin(t * 1.1 + 1)));
  bench.cyl(T(AB[0], BY + 0.015, AB[2]), 0.05, 0.03, COL.black, 12);
  node('bench', { update(t) { this.model = armA(t); } })
    .cyl(T(0, 0.045, 0), 0.035, 0.03, COL.orange, 12)
    .box(T(0, 0.065, 0), 0.05, 0.02, 0.04, COL.black);
  node('bench', { update(t) { this.model = armB(t); } })
    .box(T(0, 0.07, 0), 0.03, 0.14, 0.03, COL.orange)
    .cyl(C(T(0, 0.14, 0), RZ(PI / 2)), 0.02, 0.045, COL.black, 10);
  node('bench', { update(t) { this.model = armC(t); } })
    .box(T(0, 0.06, 0), 0.025, 0.12, 0.025, COL.orange)
    .box(T(-0.012, 0.135, 0), 0.006, 0.035, 0.015, COL.black)
    .box(T(0.012, 0.135, 0), 0.006, 0.035, 0.015, COL.black);

  // rover bot patrolling the floor
  const rover = { x: 0, z: 0 };
  const rv = node('bench', {
    update(t) {
      const s = t * 0.22, cx = 0.4, cz = 1.05, rx = 1.15, rz = 0.4;
      rover.x = cx + rx * Math.cos(s); rover.z = cz + rz * Math.sin(s);
      this.model = C(T(rover.x, 0, rover.z), RY(Math.atan2(-rx * Math.sin(s), rz * Math.cos(s))));
    },
  });
  rv.box(T(0, 0.085, 0), 0.17, 0.07, 0.22, COL.white);
  rv.box(T(0, 0.085, 0), 0.175, 0.02, 0.225, COL.purple);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rv.cyl(C(T(sx * 0.095, 0.04, sz * 0.07), RZ(PI / 2)), 0.04, 0.03, COL.black, 10);
  rv.box(T(0, 0.155, 0.04), 0.11, 0.07, 0.08, COL.white);
  rv.box(T(0, 0.155, 0.081), 0.09, 0.045, 0.004, '#0b0b0e');
  for (const s of [-1, 1]) rv.box(T(s * 0.022, 0.158, 0.084), 0.018, 0.018, 0.004, COL.cyan, MAT.EMIT);
  rv.tube(m4.I(), [0.03, 0.19, 0.02], [0.05, 0.27, 0.0], 0.003, COL.dark, 4);
  rv.box(T(0.05, 0.275, 0), 0.012, 0.012, 0.012, COL.magenta, MAT.LED);

  /* ---------- triathlon bike on the wall ---------- */
  const bike = node('bike');
  const X = -2.37;
  const P = (z, y, dx = 0) => [X + dx, y, z];
  const RA = [-1.05, 1.55], FA = [-0.07, 1.55], BB = [-0.64, 1.48];
  const ST = [-0.74, 1.95], HT = [-0.19, 1.9], HB = [-0.14, 1.76];
  const frame = '#262a33', accent = '#e11d48';
  const tub = (a, b, r = 0.016, c = frame) => bike.tube(m4.I(), P(...a), P(...b), r, c, 6);
  tub(BB, ST, 0.02); tub(ST, HT, 0.017); tub(BB, HB, 0.022); tub(HT, HB, 0.02);
  for (const dx of [-0.03, 0.03]) {
    bike.tube(m4.I(), P(...RA, dx), P(...BB, dx * 0.5), 0.01, frame, 5);
    bike.tube(m4.I(), P(...RA, dx), P(-0.7, 1.72, dx * 0.5), 0.01, frame, 5);
    bike.tube(m4.I(), P(...HB, dx * 0.5), P(...FA, dx), 0.012, frame, 5);
  }
  bike.tube(m4.I(), P(-0.48, 1.62), P(-0.3, 1.71), 0.024, accent, 6);          // down tube decal
  tub(ST, [-0.79, 2.12], 0.014, '#2a2a30');
  bike.box(T(X, 2.14, -0.8), 0.06, 0.03, 0.26, '#0e0e10');
  bike.box(T(X, 1.94, -0.17), 0.06, 0.03, 0.1, '#2a2a30');
  bike.tube(m4.I(), P(-0.17, 1.98, -0.2), P(-0.17, 1.98, 0.2), 0.012, '#2a2a30', 6);
  for (const dx of [-0.05, 0.05]) {
    bike.tube(m4.I(), P(-0.2, 2.0, dx), P(0.17, 2.03, dx), 0.008, '#2a2a30', 6);
    bike.box(T(X + dx, 2.035, -0.15), 0.05, 0.015, 0.09, '#0e0e10');
  }
  bike.torus(C(T(...P(...BB, 0.04)), RY(PI / 2)), 0.1, 0.008, COL.alu, 20, 4);
  bike.tube(m4.I(), P(...BB, 0.05), P(BB[0] + 0.12, BB[1] - 0.12, 0.05), 0.008, '#2a2a30', 5);
  bike.tube(m4.I(), P(...BB, -0.05), P(BB[0] - 0.12, BB[1] + 0.12, -0.05), 0.008, '#2a2a30', 5);
  // wall hooks
  for (const z of [RA[0], FA[0]]) bike.box(T(-2.44, 1.9, z), 0.12, 0.02, 0.02, COL.dark);
  const spin = { a: 0 };
  const wheelNode = (ax, build) => {
    const g = node('bike', { update(t, s) { this.model = C(T(...P(...ax)), RX(spin.a)); } });
    g.torus(RY(PI / 2), 0.335, 0.013, '#0b0b0d', 32, 5);
    build(g);
  };
  wheelNode(RA, g => {                                                               // disc wheel
    g.cyl(RZ(PI / 2), 0.32, 0.03, '#1c1c21', 24);
    g.torus(RY(PI / 2), 0.22, 0.006, accent, 28, 3);
  });
  wheelNode(FA, g => {                                                               // tri-spoke
    g.torus(RY(PI / 2), 0.3, 0.025, '#1c1c21', 28, 4);
    for (let k = 0; k < 3; k++) g.box(C(RX(k * 2 * PI / 3), T(0, 0.15, 0)), 0.016, 0.3, 0.04, '#1c1c21');
    g.cyl(RZ(PI / 2), 0.03, 0.06, COL.alu, 10);
  });
  // running shoes + race bib with a medal
  for (const [z, a] of [[-0.62, 0.2], [-0.45, -0.1]]) {
    const sh = C(T(-2.25, 0, z), RY(a + PI / 2));
    bike.box(C(sh, T(0, 0.015, 0)), 0.1, 0.03, 0.28, COL.white);
    bike.box(C(sh, T(0, 0.06, -0.03)), 0.09, 0.07, 0.2, COL.lime);
    bike.box(C(sh, T(0, 0.04, 0.1)), 0.085, 0.04, 0.08, COL.lime);
  }
  bike.box(T(-2.495, 1.0, -0.4), 0.01, 0.3, 0.36, COL.bezel);
  bike.quad(C(T(-2.488, 1.0, -0.4), RY(PI / 2)), 0.32, 0.26, '#ffffff', MAT.TEX, [0, 0.25, 0.0625, 0.5]);
  bike.box(T(-2.48, 0.97, -0.08), 0.004, 0.18, 0.025, COL.blue);
  bike.cyl(C(T(-2.478, 0.86, -0.08), RZ(PI / 2)), 0.035, 0.006, '#e5b33b', 14);

  /* ---------- hotspots ---------- */
  const box = (a, b) => () => [a, b];
  const hotspots = [
    { id: 'me', boxes: [box([-0.55, 1.72, -1.8], [0.85, 2.2, -1.6])], anchor: [0.15, 2.24, -1.7],
      view: { target: [0.15, 1.75, -1.4], yaw: 0.25, pitch: 0.12, r: 0.95 } },
    { id: 'desk', boxes: [box([-2.45, 0, -1.8], [-0.9, 1.3, -0.25])], anchor: [-1.65, 1.32, -1.45],
      view: { target: [-1.55, 0.95, -1.3], yaw: 0.3, pitch: 0.42, r: 0.9 } },
    { id: 'sim', boxes: [box([-0.55, 0, -1.6], [0.85, 1.3, 0.5])], anchor: [0.15, 1.34, -1.35],
      view: { target: [0.15, 0.75, -0.6], yaw: 0.65, pitch: 0.42, r: 1.05 } },
    { id: 'rack', boxes: [box([1.55, 0, -1.8], [2.25, 1.45, -1.1])], anchor: [1.9, 1.52, -1.4],
      view: { target: [1.9, 0.7, -1.3], yaw: 0.35, pitch: 0.18, r: 0.8 } },
    { id: 'bench', boxes: [box([-2.5, 0, 0.3], [-1.35, 1.85, 1.75]),
      () => [[rover.x - 0.16, 0, rover.z - 0.16], [rover.x + 0.16, 0.3, rover.z + 0.16]]],
      anchor: [-2.15, 1.9, 1.0], view: { target: [-2.15, 1.1, 1.0], yaw: 1.32, pitch: 0.3, r: 0.85 } },
    { id: 'bike', boxes: [box([-2.5, 0, -1.45], [-2.0, 2.3, 0.35])], anchor: [-2.3, 2.3, -0.55],
      view: { target: [-2.35, 1.6, -0.55], yaw: 1.35, pitch: 0.12, r: 0.85 } },
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

