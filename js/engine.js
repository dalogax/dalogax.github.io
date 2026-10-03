// Tiny WebGL2 toolkit: column-major mat4 helpers, a flat-shaded geometry builder and GL upload helpers.

export const m4 = {
  I: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  C: (...ms) => ms.reduce((a, b) => m4.mul(a, b)),
  T(x, y, z) { const m = m4.I(); m[12] = x; m[13] = y; m[14] = z; return m; },
  S(x, y, z) { const m = m4.I(); m[0] = x; m[5] = y; m[10] = z; return m; },
  RX(a) { const c = Math.cos(a), s = Math.sin(a), m = m4.I(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  RY(a) { const c = Math.cos(a), s = Math.sin(a), m = m4.I(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  RZ(a) { const c = Math.cos(a), s = Math.sin(a), m = m4.I(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f);
    return m;
  },
  ortho(l, r, b, t, n, f) {
    const m = m4.I();
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n);
    return m;
  },
  lookAt(e, c, u) {
    const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  },
  inv(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    return new Float32Array([
      (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d,
      (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
      (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d,
      (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
      (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d,
      (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
      (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d,
      (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d]);
  },
};

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const xf = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
export const xn = (m, n) => norm([
  m[0] * n[0] + m[4] * n[1] + m[8] * n[2],
  m[1] * n[0] + m[5] * n[1] + m[9] * n[2],
  m[2] * n[0] + m[6] * n[1] + m[10] * n[2]]);
export const xp = (m, p) => { // project with perspective divide
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  const q = xf(m, p);
  return [q[0] / w, q[1] / w, q[2] / w, w];
};

// Material ids, mirrored in the fragment shader
export const MAT = { LIT: 0, EMIT: 1, LED: 2, RGB: 3, FLOOR: 4, TEX: 5, CODE: 6, RACE: 7, SCOPE: 8, NEON: 9 };

const cache = new Map();
export const rgb = c => {
  if (typeof c !== 'string') return c;
  let v = cache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(x => (x / 255) ** 2.2);
    cache.set(c, v);
  }
  return v;
};

const FACES = [ // normal, u, v
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

// Non-indexed, flat-shaded triangles: pos3 nrm3 col3 mat1 uv2
export class Geo {
  constructor() { this.d = []; }
  tri(a, b, c, col, mat, hint, ua = UV[0], ub = UV[1], uc = UV[2]) {
    const cr = cross(sub(b, a), sub(c, a));
    let n = Math.hypot(...cr) < 1e-12 ? hint : norm(cr);
    if (hint && dot(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
    const k = rgb(col);
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]])
      this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], k[0], k[1], k[2], mat, u[0], u[1]);
  }
  quad4(a, b, c, d, col, mat, hint, uv = UV) {
    this.tri(a, b, c, col, mat, hint, uv[0], uv[1], uv[2]);
    this.tri(a, c, d, col, mat, hint, uv[0], uv[2], uv[3]);
  }
  // Box centred on t's origin. `front` overrides the +Z face: {col, mat}
  box(t, sx, sy, sz, col, mat = 0, front = null) {
    const h = [sx / 2, sy / 2, sz / 2];
    for (const [n, u, v] of FACES) {
      const P = (su, sv) => xf(t, [0, 1, 2].map(i => (n[i] + su * u[i] + sv * v[i]) * h[i]));
      const f = front && n[2] === 1;
      this.quad4(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), f ? front.col ?? col : col, f ? front.mat : mat, xn(t, n));
    }
    return this;
  }
  // Quad in local XY plane facing +Z
  quad(t, w, h, col, mat = 0, [u0, u1, v0, v1] = [0, 1, 0, 1]) {
    const P = (x, y) => xf(t, [x * w / 2, y * h / 2, 0]);
    this.quad4(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), col, mat, xn(t, [0, 0, 1]),
      [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
    return this;
  }
  // Cylinder (or cone with rTop) along local Y, centred
  cyl(t, r, h, col, n = 12, mat = 0, rTop = r) {
    const top = xf(t, [0, h / 2, 0]), bot = xf(t, [0, -h / 2, 0]);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
      const b0 = xf(t, [r * Math.cos(a0), -h / 2, r * Math.sin(a0)]), b1 = xf(t, [r * Math.cos(a1), -h / 2, r * Math.sin(a1)]);
      const t0 = xf(t, [rTop * Math.cos(a0), h / 2, rTop * Math.sin(a0)]), t1 = xf(t, [rTop * Math.cos(a1), h / 2, rTop * Math.sin(a1)]);
      this.quad4(b0, b1, t1, t0, col, mat, xn(t, [Math.cos(am), (r - rTop) / h, Math.sin(am)]));
      this.tri(top, t0, t1, col, mat, xn(t, [0, 1, 0]));
      this.tri(bot, b1, b0, col, mat, xn(t, [0, -1, 0]));
    }
    return this;
  }
  // Torus around local Z (ring in XY plane)
  torus(t, R, r, col, nR = 24, nr = 6, mat = 0) {
    const P = (i, j) => {
      const u = i / nR * Math.PI * 2, v = j / nr * Math.PI * 2;
      return [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)];
    };
    for (let i = 0; i < nR; i++) for (let j = 0; j < nr; j++) {
      const um = (i + .5) / nR * Math.PI * 2, vm = (j + .5) / nr * Math.PI * 2;
      const hint = [Math.cos(vm) * Math.cos(um), Math.cos(vm) * Math.sin(um), Math.sin(vm)];
      this.quad4(xf(t, P(i, j)), xf(t, P(i + 1, j)), xf(t, P(i + 1, j + 1)), xf(t, P(i, j + 1)), col, mat, xn(t, hint));
    }
    return this;
  }
  // Cylinder between two points (in t's space)
  tube(t, a, b, r, col, n = 6, mat = 0) {
    a = xf(t, a); b = xf(t, b);
    const d = sub(b, a), len = Math.hypot(...d), y = norm(d);
    const x = norm(cross(y, Math.abs(y[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), z = cross(x, y);
    const M = new Float32Array([...x, 0, ...y, 0, ...z, 0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1]);
    return this.cyl(M, r, len, col, n, mat);
  }
}

export function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name.replace('[0]', '');
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

export function upload(gl, geo) {
  const data = new Float32Array(geo.d);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  [[3, 0], [3, 12], [3, 24], [1, 36], [2, 40]].forEach(([size, off], i) => {
    gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, 48, off);
  });
  gl.bindVertexArray(null);
  return { vao, count: data.length / 12 };
}
