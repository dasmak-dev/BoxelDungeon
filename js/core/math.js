// Utilidades matemáticas: aleatoriedad, matrices y cuaterniones.
(function () {
  const M = {};

  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.rand = (a, b) => a + Math.random() * (b - a);
  M.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  M.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  M.chance = (p) => Math.random() < p;
  M.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Hash determinista 0..1 para variar colores de vóxeles.
  // quita de una lista (en el sitio, sin crear otra) lo que no cumple f: para las listas que se limpian cada fotograma
  M.compact = (a, f) => { let j = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (f(v)) a[j++] = v; } a.length = j; return a; };
  M.hash3 = (x, y, z) => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  };

  // Ruido de valor 2D suave (0..1)
  M.vnoise = (x, z, seed = 0) => {
    const xi = Math.floor(x), zi = Math.floor(z);
    const xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = M.hash3(xi, seed, zi), b = M.hash3(xi + 1, seed, zi);
    const c = M.hash3(xi, seed, zi + 1), d = M.hash3(xi + 1, seed, zi + 1);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
  M.smoothstep = (a, b, x) => { const t = M.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };


  // ---------- Matrices (column-major, estilo WebGL) ----------
  M.perspective = (fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2);
    const o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f;
    o[10] = (far + near) / (near - far); o[11] = -1;
    o[14] = (2 * far * near) / (near - far);
    return o;
  };

  M.lookAt = (ex, ey, ez, cx, cy, cz, ux = 0, uy = 1, uz = 0) => {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz;
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    const o = new Float32Array(16);
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez);
    o[13] = -(yx * ex + yy * ey + yz * ez);
    o[14] = -(zx * ex + zy * ey + zz * ez);
    o[15] = 1;
    return o;
  };

  M.multiply = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  };

  M.identity = () => {
    const o = new Float32Array(16);
    o[0] = o[5] = o[10] = o[15] = 1;
    return o;
  };

  // ---------- Cuaterniones [x, y, z, w] ----------
  // Ruido de valor 3D suave (0..1), para el fuego
  const vh = (x, y, z) => { const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); };
  const sm = (t) => t * t * (3 - 2 * t);
  VX.vnoise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(vh(xi, yi, zi), vh(xi + 1, yi, zi), xf), l(vh(xi, yi + 1, zi), vh(xi + 1, yi + 1, zi), xf), yf),
      l(l(vh(xi, yi, zi + 1), vh(xi + 1, yi, zi + 1), xf), l(vh(xi, yi + 1, zi + 1), vh(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  };

  M.qAxis = (ax, ay, az, ang) => {
    const s = Math.sin(ang / 2);
    return [ax * s, ay * s, az * s, Math.cos(ang / 2)];
  };
  M.qY = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
  M.qX = (a) => [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
  M.qZ = (a) => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
  M.qMul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
  M.qNorm = (q) => {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  };
  // Rota el vector (x,y,z) por q y escribe en out.
  M.qRot = (q, x, y, z, out) => {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    // t = 2 * cross(q.xyz, v)
    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);
    out[0] = x + qw * tx + (qy * tz - qz * ty);
    out[1] = y + qw * ty + (qz * tx - qx * tz);
    out[2] = z + qw * tz + (qx * ty - qy * tx);
    return out;
  };
  // Cuaternión que lleva +Z a la dirección (dx,dy,dz) normalizada.
  M.qFromDir = (dx, dy, dz) => {
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.asin(M.clamp(dy, -1, 1));
    return M.qMul(M.qY(yaw), M.qX(pitch));
  };

  VX.M = M;
})();
