import { m4, program, upload, xp } from './engine.js';
import { buildScene, atlas, LIGHTS } from './scene.js';

const html = document.documentElement;
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
if (!gl) throw new Error('WebGL2 unavailable'); // html stays without .gl → plain page

const VS = `#version 300 es
layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nrm; layout(location=2) in vec3 a_col;
layout(location=3) in float a_mat; layout(location=4) in vec2 a_uv;
uniform mat4 u_vp, u_model, u_lvp;
out vec3 v_w, v_n, v_c; out vec2 v_uv; out vec4 v_l; flat out float v_m;
void main() {
  vec4 w = u_model * vec4(a_pos, 1.);
  v_w = w.xyz; v_n = mat3(u_model) * a_nrm; v_c = a_col; v_m = a_mat; v_uv = a_uv;
  v_l = u_lvp * vec4(w.xyz + normalize(v_n) * .012, 1.);
  gl_Position = u_vp * w;
}`;

const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 v_w, v_n, v_c; in vec2 v_uv; in vec4 v_l; flat in float v_m;
uniform sampler2DShadow u_sh; uniform sampler2D u_tex;
uniform float u_t, u_steer, u_dim, u_hi, u_texel, u_flick;
uniform vec3 u_eye, u_sun, u_lp[6], u_lc[6];
out vec4 o;
float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 hue(float h) { return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

// editor on the left, agent log on the right
vec3 code(vec2 uv) {
  float split = .6; bool agent = uv.x > split;
  vec2 p = agent ? vec2((uv.x - split) / (1. - split), uv.y) : vec2(uv.x / split, uv.y);
  vec3 bg = agent ? vec3(.01, .02, .016) : vec3(.016, .016, .032);
  if (p.y > .93) return agent ? vec3(.05, .12, .08) : vec3(.07, .06, .13);
  if (!agent && p.x < .045) return bg + .015;
  if (abs(uv.x - split) < .003) return vec3(.1);
  float y = (1. - p.y) * 20. + u_t * (agent ? 1.6 : .45);
  float row = floor(y), fy = fract(y);
  if (fy < .3 || fy > .78 || h11(row + 7.7) < .12) return bg;
  float x = agent ? p.x - .03 : p.x - .06;
  float ind = agent ? 0. : floor(h11(row) * 4.) * .06;
  float len = ind + .12 + h11(row + 3.1) * (agent ? .8 : .55);
  if (x < ind || x > len) return bg;
  float word = floor((x - ind) * 16. + h11(row) * 3.);
  if (fract((x - ind) * 16. + h11(row) * 3.) > .82) return bg;
  float k = h11(word * 3.1 + row * .7);
  if (agent) return (word < 1. ? vec3(.3, 1., .6) : k < .2 ? vec3(.95, .75, .35) : vec3(.62, .66, .7)) * .9;
  return k < .3 ? vec3(.78, .47, .98) : k < .55 ? vec3(.4, .8, 1.) : k < .75 ? vec3(.98, .75, .4) : vec3(.8, .8, .86);
}

vec3 race(vec2 uv) {
  float hz = .55;
  if (uv.y > hz) {
    vec3 sky = mix(vec3(.95, .42, .3), vec3(.12, .14, .42), smoothstep(hz, .95, uv.y));
    float d = length((uv - vec2(.5 - u_steer * .2, hz + .1)) * vec2(3., 1.));
    sky += vec3(1., .75, .45) * smoothstep(.08, .05, d);
    float m = hz + .05 * (.5 + .5 * sin(uv.x * 9. + u_steer * 1.5)) + .02 * sin(uv.x * 27. + 1.);
    return uv.y < m ? vec3(.16, .11, .26) : sky;
  }
  float p = (hz - uv.y) / hz, z = .4 / max(p, .001), f = 1. - p;
  float cx = .5 + u_steer * .35 * f * f;
  float w = mix(.004, .32, p), dx = abs(uv.x - cx);
  float s = step(.5, fract(z * .5 + u_t * 4.));
  vec3 c = mix(vec3(.1, .3, .12), vec3(.14, .38, .15), s);
  if (dx < w) {
    c = vec3(.2, .2, .23) * (.9 + .1 * s);
    if (dx > w * .87) c = mix(vec3(.85, .08, .1), vec3(.95), s);
    else if (dx < w * .015 + .0015 && s > .5) c = vec3(.85);
  }
  return mix(c, vec3(.5, .35, .45), smoothstep(.7, 1., f) * .8);
}

vec3 scope(vec2 uv) {
  vec3 c = vec3(.01, .035, .03);
  vec2 g = abs(fract(uv * vec2(8., 6.)) - .5);
  if (g.x > .46 || g.y > .44) c += .04;
  float y = .5 + .3 * sin(uv.x * 18. - u_t * 6.) * sin(u_t * .7 + uv.x * 2.);
  return c + vec3(.3, 1., .6) * smoothstep(.045, 0., abs(uv.y - y));
}

void main() {
  int m = int(v_m + .5);
  if (m == 9) { o = vec4(texture(u_tex, v_uv).rgb * u_flick * mix(.4, 1., u_dim), 1.); return; }
  vec3 alb = v_c, col = vec3(0.); bool lit = true;
  if (m == 1) { col = v_c * 2.4; lit = false; }
  else if (m == 2) {
    float s = h21(floor(v_w.xz * 211.) + floor(v_w.y * 173.));
    float on = step(.3, h11(floor(u_t * (1.5 + s * 8.)) + s * 91.));
    col = v_c * (.15 + 2.6 * on); lit = false;
  }
  else if (m == 3) { col = hue(fract(u_t * .08 + v_w.y * .8 + v_w.x * .5 + v_w.z * .3)) * v_c * 4.; lit = false; }
  else if (m == 4) {
    vec2 q = v_w.xz * vec2(.7, 5.5);
    float row = floor(q.y), off = h11(row) * 3.;
    float k = h21(vec2(row, floor(q.x + off)));
    alb *= .78 + .4 * k;
    if (fract(q.y) < .05 || fract(q.x + off) < .008) alb *= .5;
  }
  else if (m == 5) alb *= texture(u_tex, v_uv).rgb;
  else if (m == 6) { col = code(v_uv) * 1.6; lit = false; }
  else if (m == 7) { col = race(v_uv) * .95; lit = false; }
  else if (m == 8) { col = scope(v_uv) * 1.6; lit = false; }

  vec3 N = normalize(v_n), V = normalize(u_eye - v_w);
  if (lit) {
    vec3 lp = v_l.xyz / v_l.w * .5 + .5;
    float sh = 1.;
    if (all(greaterThan(lp, vec3(0.))) && all(lessThan(lp, vec3(1.)))) {
      sh = 0.;
      for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)
        sh += texture(u_sh, vec3(lp.xy + vec2(i, j) * u_texel, lp.z - .0006));
      sh /= 9.;
    }
    float ao = 1.;
    if (N.z < .5) ao *= mix(.45, 1., smoothstep(0., .8, v_w.z + 1.75));
    if (N.x < .5) ao *= mix(.45, 1., smoothstep(0., .8, v_w.x + 2.5));
    if (N.y < .5) ao *= mix(.5, 1., smoothstep(0., .35, v_w.y));
    vec3 L = mix(vec3(.05, .045, .06), vec3(.13, .13, .2), N.y * .5 + .5) * ao;
    float nd = max(dot(N, u_sun), 0.);
    L += vec3(1., .86, .72) * nd * sh * .9;
    for (int i = 0; i < 6; i++) {
      vec3 d = u_lp[i] - v_w; float d2 = dot(d, d);
      L += u_lc[i] * max(dot(N, d * inversesqrt(d2)), 0.) / (1. + d2 * 4.) * mix(.6, 1., ao);
    }
    col = alb * L + pow(max(dot(N, normalize(u_sun + V)), 0.), 48.) * sh * nd * .12;
    col *= u_dim;
  } else col *= mix(.45, 1., u_dim);
  col += u_hi * (vec3(.6, .4, 1.) * pow(1. - max(dot(N, V), 0.), 2.) * .7 + .05);
  o = vec4(pow(aces(col), vec3(1. / 2.2)), 1.);
}`;

const SVS = `#version 300 es
layout(location=0) in vec3 a_pos; uniform mat4 u_lvp, u_model;
void main() { gl_Position = u_lvp * u_model * vec4(a_pos, 1.); }`;
const SFS = `#version 300 es
precision mediump float; void main() {}`;

const prog = program(gl, VS, FS);
const sprog = program(gl, SVS, SFS);
const { nodes, hotspots, spin } = buildScene();
for (const n of nodes) { Object.assign(n, upload(gl, n.geo)); delete n.geo; }

// textures: shadow map (unit 0) and atlas (unit 1)
const small = Math.min(innerWidth, innerHeight) < 600;
const SH = small ? 1024 : 2048;
const shTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, shTex);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SH, SH);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
const shFb = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas());
gl.generateMipmap(gl.TEXTURE_2D);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

const SUN = (() => { const v = [0.9, 2.0, 1.3], l = Math.hypot(...v); return v.map(x => x / l); })();
const LVP = m4.mul(m4.ortho(-4.2, 4.2, -3.4, 3.4, 1, 24), m4.lookAt(SUN.map((x, i) => [-0.2, 0.9, -0.2][i] + x * 10), [-0.2, 0.9, -0.2], [0, 1, 0]));

gl.useProgram(prog.p);
gl.uniform1i(prog.u.u_sh, 0);
gl.uniform1i(prog.u.u_tex, 1);
gl.uniform3fv(prog.u.u_sun, SUN);
gl.uniform1f(prog.u.u_texel, 1 / SH);
gl.uniformMatrix4fv(prog.u.u_lvp, false, LVP);
gl.uniform3fv(prog.u.u_lp, LIGHTS.flatMap(l => l[0]));
gl.uniform3fv(prog.u.u_lc, LIGHTS.flatMap(l => l[1]));
gl.clearColor(0, 0, 0, 0);

/* ---------- camera ---------- */
const FOV = 30 * Math.PI / 180;
const YAW = [0.05, 1.5], PITCH = [0.08, 1.15];
const clamp = (v, [a, b]) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = matchMedia('(min-width: 820px) and (min-aspect-ratio: 1/1)');
let W = 1, H = 1, aspect = 1;
let overview;
const cam = { yaw: 0.72, pitch: 0.95, dist: 30, tx: -0.1, ty: 0.9, tz: -0.1, ox: 0, oy: 0 };
const goal = { ...cam };
const vel = { yaw: 0, pitch: 0 };
let VP = m4.I(), invVP = m4.I(), eye = [0, 0, 0];

function fitDist(r, ox = 0, oy = 0) {
  const tv = Math.tan(FOV / 2) * (1 - Math.abs(oy)), th = Math.tan(FOV / 2) * aspect * (1 - Math.abs(ox));
  return r / Math.min(tv, th);
}
// Frame the room's bounding box for a given yaw/pitch: centre it and pick the distance that fits
function computeOverview() {
  const portrait = aspect < 0.8;
  const yaw = 0.72, pitch = portrait ? 0.62 : 0.5, margin = portrait ? 0.86 : 1.06;
  const cp = Math.cos(pitch), f = [-Math.sin(yaw) * cp, -Math.sin(pitch), -Math.cos(yaw) * cp];
  const r = [Math.cos(yaw), 0, -Math.sin(yaw)], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const ext = [[1e9, -1e9], [1e9, -1e9]];
  for (const x of [-2.6, 2.5]) for (const y of [-0.18, 2.6]) for (const z of [-1.85, 1.75]) {
    const pr = x * r[0] + y * r[1] + z * r[2], pu = x * u[0] + y * u[1] + z * u[2];
    ext[0] = [Math.min(ext[0][0], pr), Math.max(ext[0][1], pr)];
    ext[1] = [Math.min(ext[1][0], pu), Math.max(ext[1][1], pu)];
  }
  const cr = (ext[0][0] + ext[0][1]) / 2, cu = (ext[1][0] + ext[1][1]) / 2;
  const hw = (ext[0][1] - ext[0][0]) / 2, hh = (ext[1][1] - ext[1][0]) / 2;
  const tv = Math.tan(FOV / 2), th = tv * aspect;
  const c = [r[0] * cr + u[0] * cu, r[1] * cr + u[1] * cu, r[2] * cr + u[2] * cu];
  overview = { yaw, pitch, tx: c[0], ty: c[1], tz: c[2], ox: 0, oy: 0,
    dist: Math.max(hw / th, hh / tv) * margin + 1.5 };
}
let dprCap = small ? 2 : 1.75;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, dprCap);
  W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
  canvas.width = W; canvas.height = H; aspect = W / H;
  computeOverview();
  if (!focus) Object.assign(goal, overview);
  else refit();
}

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * (reduced ? 30 : 4.5));
  if (!dragging) {
    goal.yaw = clamp(goal.yaw + vel.yaw, YAW); goal.pitch = clamp(goal.pitch + vel.pitch, PITCH);
    vel.yaw *= Math.exp(-dt * 5); vel.pitch *= Math.exp(-dt * 5);
  }
  for (const key in cam) cam[key] += (goal[key] - cam[key]) * k;
  const cp = Math.cos(cam.pitch);
  const tgt = [cam.tx, cam.ty, cam.tz];
  eye = [tgt[0] + cam.dist * Math.sin(cam.yaw) * cp, tgt[1] + cam.dist * Math.sin(cam.pitch), tgt[2] + cam.dist * Math.cos(cam.yaw) * cp];
  const P = m4.persp(FOV, aspect, 0.1, 100);
  P[8] -= cam.ox; P[9] -= cam.oy;
  VP = m4.mul(P, m4.lookAt(eye, tgt, [0, 1, 0]));
  invVP = m4.inv(VP);
}

/* ---------- picking ---------- */
function ray(cx, cy) {
  const x = cx / innerWidth * 2 - 1, y = 1 - cy / innerHeight * 2;
  const a = xp(invVP, [x, y, -1]), b = xp(invVP, [x, y, 1]);
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d);
  return [a, d.map(v => v / l)];
}
function pick(cx, cy) {
  const [o, d] = ray(cx, cy);
  let best = null, bt = Infinity;
  for (const h of hotspots) for (const fn of h.boxes) {
    const [mn, mx] = fn();
    let t0 = 0, t1 = Infinity;
    for (let i = 0; i < 3; i++) {
      const inv = 1 / d[i];
      let a = (mn[i] - o[i]) * inv, b = (mx[i] - o[i]) * inv;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    if (t0 <= t1 && t0 < bt) { bt = t0; best = h.id; }
  }
  return best;
}

/* ---------- sheet + focus ---------- */
const sheet = document.getElementById('sheet');
const sections = [...sheet.querySelectorAll('section')];
const order = sections.map(s => s.dataset.id);
const hint = document.getElementById('hint');
let focus = null, hover = null;

function refit() {
  const h = hotspots.find(h => h.id === focus);
  if (wide.matches) { goal.ox = -(sheet.offsetWidth + 32) / innerWidth; goal.oy = 0; }
  else { goal.ox = 0; goal.oy = Math.min(0.7, sheet.offsetHeight / innerHeight); }
  goal.dist = fitDist(h.view.r, goal.ox, goal.oy);
}
function open(id, user = true) {
  const h = hotspots.find(h => h.id === id);
  if (!h) return;
  focus = id;
  for (const s of sections) s.hidden = s.dataset.id !== id;
  sheet.scrollTop = 0;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  html.classList.add('focused');
  hint.classList.add('gone');
  const v = h.view;
  Object.assign(goal, { yaw: v.yaw, pitch: v.pitch, tx: v.target[0], ty: v.target[1], tz: v.target[2] });
  vel.yaw = vel.pitch = 0;
  refit();
  if (user && navigator.vibrate) navigator.vibrate(8);
  history.replaceState(null, '', '#' + id);
}
function close() {
  if (!focus) return;
  focus = null;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  html.classList.remove('focused');
  Object.assign(goal, overview);
  history.replaceState(null, '', location.pathname);
}
const step = d => open(order[(order.indexOf(focus) + d + order.length) % order.length]);
sheet.querySelector('.x').onclick = close;
sheet.querySelector('.prev').onclick = () => step(-1);
sheet.querySelector('.next').onclick = () => step(1);
addEventListener('keydown', e => {
  if (e.key === 'Escape') close();
  else if (focus && e.key === 'ArrowRight') step(1);
  else if (focus && e.key === 'ArrowLeft') step(-1);
});

// swipe the grab bar down to dismiss
{
  const grab = sheet.querySelector('.grab');
  let y0 = null;
  grab.addEventListener('pointerdown', e => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
  grab.addEventListener('pointermove', e => { if (y0 !== null) sheet.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  const end = e => {
    if (y0 === null) return;
    const dy = e.clientY - y0; y0 = null;
    sheet.style.transition = sheet.style.transform = '';
    if (dy > 60) close();
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
}

// beacons
const beacons = hotspots.map(h => {
  const b = document.createElement('button');
  const title = sections.find(s => s.dataset.id === h.id).querySelector('h2').textContent;
  b.className = 'beacon';
  b.innerHTML = `<span>${title}</span>`;
  b.setAttribute('aria-label', title);
  b.onclick = () => open(h.id);
  document.body.appendChild(b);
  return { b, h };
});
function placeBeacons() {
  for (const { b, h } of beacons) {
    const p = xp(VP, h.anchor);
    const x = (p[0] * .5 + .5) * innerWidth, y = (.5 - p[1] * .5) * innerHeight;
    b.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  }
}

/* ---------- pointer input ---------- */
const pointers = new Map();
let dragging = false, tap = null, pinch0 = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 1) tap = { x: e.clientX, y: e.clientY, t: performance.now() };
  else { tap = null; const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); }
  dragging = true; vel.yaw = vel.pitch = 0;
  hint.classList.add('gone');
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) {
    if (e.pointerType === 'mouse') hoverAt = [e.clientX, e.clientY];
    return;
  }
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 1) {
    const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) tap = null;
    if (tap) return;
    const s = 3.2 / Math.min(innerWidth, innerHeight);
    vel.yaw = -dx * s; vel.pitch = dy * s * 0.7;
    goal.yaw = clamp(goal.yaw + vel.yaw, YAW); goal.pitch = clamp(goal.pitch + vel.pitch, PITCH);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    zoom(pinch0 / d); pinch0 = d;
  }
});
const up = e => {
  pointers.delete(e.pointerId);
  if (tap && pointers.size === 0 && performance.now() - tap.t < 500) {
    const id = pick(e.clientX, e.clientY);
    if (id) open(id); else close();
  }
  tap = null;
  if (pointers.size === 0) dragging = false;
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
function zoom(f) { goal.dist = Math.min(overview.dist * 1.5, Math.max(1.2, goal.dist * f)); }
let hoverAt = null;

/* ---------- render loop ---------- */
const hi = {}, dim = {};
let last = performance.now(), t0 = last, running = true;
const steerAt = t => 0.75 * Math.sin(t * 0.42) + 0.25 * Math.sin(t * 1.27);

function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = (now - t0) / 1000;
  const state = { steer: steerAt(t), dt };
  spin.a -= dt * (focus === 'bike' ? 7 : 0);
  for (const n of nodes) if (n.update) n.update(t, state);
  updateCamera(dt);

  if (hoverAt) {
    hover = pick(...hoverAt);
    canvas.style.cursor = hover ? 'pointer' : '';
    hoverAt = null;
  }
  const kk = 1 - Math.exp(-dt * 8);
  for (const id of [...order, '_']) {
    hi[id] = (hi[id] || 0) + (((hover === id && focus !== id) ? 0.6 : 0) - (hi[id] || 0)) * kk;
    dim[id] = (dim[id] ?? 1) + (((focus && focus !== id) ? 0.42 : 1) - (dim[id] ?? 1)) * kk;
  }

  // shadow pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
  gl.viewport(0, 0, SH, SH);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(sprog.p);
  gl.uniformMatrix4fv(sprog.u.u_lvp, false, LVP);
  for (const n of nodes) {
    if (n.noShadow) continue;
    gl.uniformMatrix4fv(sprog.u.u_model, false, n.model);
    gl.bindVertexArray(n.vao);
    gl.drawArrays(gl.TRIANGLES, 0, n.count);
  }

  // main pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(prog.p);
  gl.uniformMatrix4fv(prog.u.u_vp, false, VP);
  gl.uniform3fv(prog.u.u_eye, eye);
  gl.uniform1f(prog.u.u_t, t);
  gl.uniform1f(prog.u.u_steer, state.steer);
  const fl = Math.sin(t * 1.3) > 0.985 ? 0.35 + 0.65 * (Math.sin(t * 90) > 0) : 1;
  gl.uniform1f(prog.u.u_flick, fl);
  for (const pass of [false, true]) {
    if (pass) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); }
    for (const n of nodes) {
      if (!!n.blend !== pass) continue;
      const key = n.hot || '_';
      gl.uniformMatrix4fv(prog.u.u_model, false, n.model);
      gl.uniform1f(prog.u.u_dim, dim[key]);
      gl.uniform1f(prog.u.u_hi, hi[key]);
      gl.bindVertexArray(n.vao);
      gl.drawArrays(gl.TRIANGLES, 0, n.count);
    }
  }
  gl.disable(gl.BLEND); gl.depthMask(true);

  placeBeacons();
  adapt(dt);
  requestAnimationFrame(frame);
}

// drop resolution once if the device struggles (sampled after the intro settles)
let slow = 0, samples = 0;
function adapt(dt) {
  if (dprCap <= 1 || samples > 240) return;
  if (++samples > 60) { slow += dt > 1 / 40; if (slow > 60) { dprCap = 1; resize(); samples = 999; } }
}

addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) { last = performance.now(); requestAnimationFrame(frame); }
});

resize();
sheet.setAttribute('aria-hidden', 'true');
html.classList.add('gl');
if (reduced) Object.assign(cam, overview);
const initial = location.hash.slice(1);
requestAnimationFrame(() => {
  html.classList.add('ready');
  if (order.includes(initial)) open(initial, false);
  requestAnimationFrame(frame);
});
