// Renderizador WebGL2: todo el juego son cubos instanciados.
// Pasadas: sombra de la linterna -> escena -> arma en primera persona.
(function () {
  const FLOATS = 22; // pos3 scale3 quat4 color4 ao4 ao4
  const ONE8 = [1, 1, 1, 1, 1, 1, 1, 1];

  class Batch {
    constructor(gl, capacity, dynamic) {
      this.gl = gl;
      this.capacity = capacity;
      this.data = new Float32Array(capacity * FLOATS);
      this.count = 0;
      this.dynamic = dynamic;
      this.vao = gl.createVertexArray();
      this.buf = gl.createBuffer();
      this.gpuCapacity = 0;
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, VX.Renderer.cubeBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      const stride = FLOATS * 4;
      const attrs = [[2, 3, 0], [3, 3, 12], [4, 4, 24], [5, 4, 40], [6, 4, 56], [7, 4, 72]];
      for (const [loc, size, off] of attrs) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
        gl.vertexAttribDivisor(loc, 1);
      }
      gl.bindVertexArray(null);
    }

    clear() { this.count = 0; }

    grow() {
      const nd = new Float32Array(this.data.length * 2);
      nd.set(this.data);
      this.data = nd;
      this.capacity *= 2;
    }

    _put(x, y, z, sx, sy, sz, qx, qy, qz, qw, r, g, b, e, ao) {
      if (this.count >= this.capacity) this.grow();
      const d = this.data, o = this.count * FLOATS;
      d[o] = x; d[o + 1] = y; d[o + 2] = z;
      d[o + 3] = sx; d[o + 4] = sy; d[o + 5] = sz;
      d[o + 6] = qx; d[o + 7] = qy; d[o + 8] = qz; d[o + 9] = qw;
      d[o + 10] = r; d[o + 11] = g; d[o + 12] = b; d[o + 13] = e;
      for (let i = 0; i < 8; i++) d[o + 14 + i] = ao[i];
      this.count++;
    }

    box(x, y, z, sx, sy, sz, r, g, b, e = 0) { this._put(x, y, z, sx, sy, sz, 0, 0, 0, 1, r, g, b, e, ONE8); }
    rbox(x, y, z, sx, sy, sz, q, r, g, b, e = 0) { this._put(x, y, z, sx, sy, sz, q[0], q[1], q[2], q[3], r, g, b, e, ONE8); }
    aobox(x, y, z, sx, sy, sz, r, g, b, e, ao) { this._put(x, y, z, sx, sy, sz, 0, 0, 0, 1, r, g, b, e, ao); }

    upload() {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      if (this.capacity > this.gpuCapacity) {
        gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, this.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        this.gpuCapacity = this.capacity;
      }
      if (this.count > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * FLOATS);
    }

    draw() {
      if (this.count === 0) return;
      const gl = this.gl;
      gl.bindVertexArray(this.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, this.count);
    }

    dispose() {
      this.gl.deleteBuffer(this.buf);
      this.gl.deleteVertexArray(this.vao);
    }
  }

  function buildCube() {
    const faces = [
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
      [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
    ];
    const out = [];
    for (const [n, u, v] of faces) {
      const c = n.map((x) => x * 0.5);
      const p = (su, sv) => [0, 1, 2].map((i) => c[i] + u[i] * su * 0.5 + v[i] * sv * 0.5);
      const p0 = p(-1, -1), p1 = p(1, -1), p2 = p(1, 1), p3 = p(-1, 1);
      for (const pt of [p0, p1, p2, p0, p2, p3]) out.push(...pt, ...n);
    }
    return new Float32Array(out);
  }

  const R = {
    gl: null, canvas: null, prog: null, dprog: null, U: {}, DU: {}, cubeBuffer: null,
    Batch,
    width: 1, height: 1,
    fov: 75 * Math.PI / 180,
    fogColor: [0.012, 0.01, 0.016],
    renderScale: 1, shadowSize: 2048, shadowsOn: true,
    view: null, proj: null, camFwd: [0, 0, 1], camPos: [0, 0, 0],
  };

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  R.init = function (canvas) {
    R.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!gl) return false;
    R.gl = gl;

    R.prog = program(gl, VX.Shaders.vertex, VX.Shaders.fragment);
    const names = ['u_proj', 'u_view', 'u_lights', 'u_lightCols', 'u_numLights', 'u_spotPos', 'u_spotDir', 'u_spotCol',
      'u_spotCone', 'u_shadowMat', 'u_shadowMap', 'u_shadowOn', 'u_shadowTexel', 'u_ambient', 'u_camPos',
      'u_fogColor', 'u_fogNear', 'u_fogFar', 'u_edge', 'u_shadowMat2', 'u_shadowMap2', 'u_shadowOn2', 'u_glass'];
    for (const n of names) R.U[n] = gl.getUniformLocation(R.prog, n);
    R.dprog = program(gl, VX.Shaders.depthVertex, VX.Shaders.depthFragment);
    R.DU.u_lightVP = gl.getUniformLocation(R.dprog, 'u_lightVP');

    R.cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, R.cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buildCube(), gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);

    R.createShadowMap(R.shadowSize);
    R.shadow2 = makeDepthTarget(gl, 1024);
    R.initPost();
    R.resize();
    window.addEventListener('resize', R.resize);
    return true;
  };

  function makeDepthTarget(gl, size) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE], [gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex: t, fbo: fb, size, mat: null, on: false };
  }

  // Sombra de la antorcha más cercana (spot muy abierto mirando hacia la sala)
  R.torchShadowsOn = true;
  R.beginShadow2 = function (spot) {
    const gl = R.gl, M = VX.M, T = R.shadow2;
    const view = M.lookAt(spot.x, spot.y, spot.z, spot.x + spot.dx, spot.y + spot.dy, spot.z + spot.dz, 0, 1, 0);
    const proj = M.perspective(spot.fov, 1, 0.1, 14);
    T.mat = M.multiply(proj, view);
    R.setFrustum(T.mat);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
    gl.viewport(0, 0, T.size, T.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(R.dprog);
    gl.uniformMatrix4fv(R.DU.u_lightVP, false, T.mat);
    gl.cullFace(gl.FRONT);
  };

  R.createShadowMap = function (size) {
    const gl = R.gl;
    if (R.shadowTex) { gl.deleteTexture(R.shadowTex); gl.deleteFramebuffer(R.shadowFbo); }
    R.shadowSize = size;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    R.shadowTex = t; R.shadowFbo = fb;
  };

  R.setQuality = function (q, shadows) {
    const dpr = window.devicePixelRatio || 1;
    R.renderScale = q === 'alta' ? Math.min(dpr, 1.5) : q === 'media' ? Math.min(dpr, 1) * 0.85 : 0.6;
    const size = q === 'alta' ? 2048 : q === 'media' ? 1024 : 512;
    R.shadowsOn = !!shadows;
    R.quality = q;
    if (size !== R.shadowSize) R.createShadowMap(size);
    R.resize();
  };

  R.resize = function () {
    const s = R.renderScale || 1;
    const w = Math.max(1, Math.floor(window.innerWidth * s)), h = Math.max(1, Math.floor(window.innerHeight * s));
    R.canvas.width = w; R.canvas.height = h;
    R.width = w; R.height = h;
    if (R.postSupported) R.resizePost();
  };

  R.createBatch = (cap = 1024, dynamic = false) => new Batch(R.gl, cap, dynamic);

  // ---------------- Sombras ----------------
  // spot: {x,y,z, dx,dy,dz, fov}
  R.beginShadow = function (spot) {
    const gl = R.gl;
    const M = VX.M;
    const view = M.lookAt(spot.x, spot.y, spot.z, spot.x + spot.dx, spot.y + spot.dy, spot.z + spot.dz,
      Math.abs(spot.dy) > 0.95 ? 1 : 0, Math.abs(spot.dy) > 0.95 ? 0 : 1, 0);
    const proj = M.perspective(spot.fov, 1, 0.15, 45);
    R.shadowMat = M.multiply(proj, view);
    if (!R.shadowsOn) return false;
    R.shadowPass = true;
    R.setFrustum(R.shadowMat);
    gl.bindFramebuffer(gl.FRAMEBUFFER, R.shadowFbo);
    gl.viewport(0, 0, R.shadowSize, R.shadowSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(R.dprog);
    gl.uniformMatrix4fv(R.DU.u_lightVP, false, R.shadowMat);
    gl.cullFace(gl.FRONT);
    return true;
  };

  R.endShadow = function () {
    const gl = R.gl;
    R.shadowPass = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.cullFace(gl.BACK);
  };

  // ---------------- Escena ----------------
  // cam: {x,y,z,yaw,pitch}; env: {lights:[{x,y,z,r,cr,cg,cb}], spot:{...,cr,cg,cb,on}, ambient:[r,g,b]}
  R.beginScene = function (cam, env) {
    const gl = R.gl, U = R.U, M = VX.M;
    gl.bindFramebuffer(gl.FRAMEBUFFER, R.postOn ? R.post.msFbo : null);
    gl.viewport(0, 0, R.width, R.height);
    const f = R.fogColor;
    gl.clearColor(f[0], f[1], f[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(R.prog);
    gl.cullFace(gl.BACK);

    const cp = Math.cos(cam.pitch);
    const fx = Math.sin(cam.yaw) * cp, fy = Math.sin(cam.pitch), fz = Math.cos(cam.yaw) * cp;
    R.camFwd = [fx, fy, fz]; R.camPos = [cam.x, cam.y, cam.z];
    // balanceo lateral (roll) al recibir golpes
    const roll = cam.roll || 0, rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
    R.view = M.lookAt(cam.x, cam.y, cam.z, cam.x + fx, cam.y + fy, cam.z + fz, Math.sin(roll) * rx, Math.cos(roll), Math.sin(roll) * rz);
    R.proj = M.perspective(R.fov, R.width / R.height, 0.04, R.farPlane || 90);
    gl.uniformMatrix4fv(U.u_proj, false, R.proj);
    gl.uniformMatrix4fv(U.u_view, false, R.view);
    R.setFrustum(M.multiply(R.proj, R.view));
    gl.uniform3f(U.u_camPos, cam.x, cam.y, cam.z);
    gl.uniform3f(U.u_fogColor, f[0], f[1], f[2]);
    gl.uniform1f(U.u_fogNear, R.fogNear || 8);
    gl.uniform1f(U.u_fogFar, R.fogFar || 36);
    gl.uniform1f(U.u_edge, 0.02);
    const a = env.ambient;
    gl.uniform3f(U.u_ambient, a[0], a[1], a[2]);
    R.setLights(env.lights);
    const s = env.spot;
    gl.uniform3f(U.u_spotPos, s.x, s.y, s.z);
    gl.uniform3f(U.u_spotDir, s.dx, s.dy, s.dz);
    gl.uniform3f(U.u_spotCol, s.on ? s.cr : 0, s.on ? s.cg : 0, s.on ? s.cb : 0);
    gl.uniform2f(U.u_spotCone, Math.cos(s.inner), Math.cos(s.outer));
    gl.uniformMatrix4fv(U.u_shadowMat, false, R.shadowMat || M.identity());
    gl.uniform1f(U.u_shadowOn, R.shadowsOn && s.on ? 1 : 0);
    gl.uniform1f(U.u_shadowTexel, 1 / R.shadowSize);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, R.shadowTex);
    gl.uniform1i(U.u_shadowMap, 0);
    const T2 = R.shadow2;
    gl.uniform1f(U.u_shadowOn2, T2 && T2.on ? 1 : 0);
    gl.uniformMatrix4fv(U.u_shadowMat2, false, (T2 && T2.mat) || M.identity());
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, T2.tex);
    gl.uniform1i(U.u_shadowMap2, 1);
    gl.activeTexture(gl.TEXTURE0);
  };

  const lp = new Float32Array(16 * 4), lc = new Float32Array(16 * 3);
  R.setLights = function (lights) {
    const gl = R.gl, U = R.U;
    const n = Math.min(16, lights.length);
    for (let i = 0; i < n; i++) {
      const L = lights[i];
      lp[i * 4] = L.x; lp[i * 4 + 1] = L.y; lp[i * 4 + 2] = L.z; lp[i * 4 + 3] = L.r;
      lc[i * 3] = L.cr; lc[i * 3 + 1] = L.cg; lc[i * 3 + 2] = L.cb;
    }
    gl.uniform4fv(U.u_lights, lp);
    gl.uniform3fv(U.u_lightCols, lc);
    gl.uniform1i(U.u_numLights, n);
  };

  // Frustum: 6 planos extraídos de la matriz proyección·vista (column-major)
  R.frustum = null;
  R.setFrustum = function (m) {
    const P = R.frustum || (R.frustum = [new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4)]);
    const row = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]];
    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
    const set = (k, sgn, r) => {
      const p = P[k];
      for (let j = 0; j < 4; j++) p[j] = r3[j] + sgn * r[j];
      const l = Math.hypot(p[0], p[1], p[2]) || 1;
      for (let j = 0; j < 4; j++) p[j] /= l;
    };
    set(0, 1, r0); set(1, -1, r0); set(2, 1, r1); set(3, -1, r1); set(4, 1, r2); set(5, -1, r2);
  };

  // ¿Puede verse una esfera (centro, radio)? Descarte por frustum + distancia de niebla
  R.visible = function (cx, cy, cz, rad) {
    const c = R.camPos;
    const dx = cx - c[0], dz = cz - c[2];
    const cd = (R.cullDist || 62) + rad;
    if (dx * dx + dz * dz > cd * cd) return false;   // más allá de la niebla
    const P = R.frustum;
    if (!P) return true;
    for (let k = 0; k < 6; k++) {
      const p = P[k];
      if (p[0] * cx + p[1] * cy + p[2] * cz + p[3] < -rad) return false;
    }
    return true;
  };

  // Pasada del arma en espacio de cámara
  R.beginViewmodel = function (flash, ambient) {
    const gl = R.gl, U = R.U, M = VX.M;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(U.u_proj, false, M.perspective(58 * Math.PI / 180, R.width / R.height, 0.01, 10));
    gl.uniformMatrix4fv(U.u_view, false, M.identity());
    gl.uniform3f(U.u_camPos, 0, 0, 0);
    gl.uniform1f(U.u_fogNear, 50);
    gl.uniform1f(U.u_fogFar, 60);
    gl.uniform1f(U.u_edge, 0.003);
    gl.uniform3f(U.u_ambient, ambient[0], ambient[1], ambient[2]);
    R.setLights([
      { x: 0.4, y: 0.45, z: 0.1, r: 2.5, cr: 2.2, cg: 1.8, cb: 1.4 },
      { x: 0.05, y: 0.02, z: -0.75, r: 1.5, cr: 6 * flash, cg: 4 * flash, cb: 1.5 * flash },
      { x: -0.6, y: 0.1, z: -0.3, r: 3, cr: 0.35, cg: 0.4, cb: 0.6 },
    ]);
    gl.uniform3f(U.u_spotCol, 0, 0, 0);
    gl.uniform1f(U.u_shadowOn, 0);
    gl.uniform1f(U.u_shadowOn2, 0);
  };

  // ================= Posprocesado =================
  // Escena → FBO multimuestreo → (SSAO sobre la profundidad) → arma → resolución
  // → resplandor (bloom) en dos niveles → pantalla.
  const QUAD_VS = `#version 300 es
layout(location=0) in vec2 a_p;
out vec2 v_uv;
void main() { v_uv = a_p * 0.5 + 0.5; gl_Position = vec4(a_p, 0.0, 1.0); }`;

  const AO_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_depth;
uniform vec2 u_px;          // tamaño de un píxel (de la textura de profundidad)
uniform vec2 u_proj;        // P[0], P[5]
uniform float u_near, u_far;
out vec4 o;
float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * u_near * u_far / (u_far + u_near - z * (u_far - u_near)); }
vec3 pos(vec2 uv) {
  float z = lin(texture(u_depth, uv).r);
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc.x * z / u_proj.x, ndc.y * z / u_proj.y, -z);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float d = texture(u_depth, v_uv).r;
  if (d >= 1.0) { o = vec4(1.0); return; }
  vec3 P = pos(v_uv);
  vec3 N = normalize(cross(pos(v_uv + vec2(u_px.x, 0.0)) - P, pos(v_uv + vec2(0.0, u_px.y)) - P));
  float far = -P.z;
  if (far > 26.0) { o = vec4(1.0); return; }
  // radio de muestreo: ~0.6 m en el mundo, proyectado a pantalla
  float rad = 0.6 * u_proj.x / far * 0.5;
  float occ = 0.0;
  float a0 = hash(gl_FragCoord.xy) * 6.2832;
  for (int i = 0; i < 10; i++) {
    float t = (float(i) + 0.5) / 10.0;
    float a = a0 + t * 6.2832 * 3.0;
    vec2 off = vec2(cos(a), sin(a)) * rad * t * vec2(u_px.y / u_px.x, 1.0);
    vec3 S = pos(v_uv + off) - P;
    float vv = dot(S, S);
    occ += max(0.0, dot(S, N) - 0.02 * far) / (vv + 0.01) * smoothstep(1.2, 0.2, sqrt(vv));
  }
  occ = clamp(occ / 10.0 * 0.8, 0.0, 1.0);
  float fade = 1.0 - smoothstep(14.0, 26.0, far);
  o = vec4(vec3(1.0 - occ * 0.85 * fade), 1.0);
}`;

  // Aplica la oclusión (difuminada respetando bordes) multiplicando el color
  const AOMUL_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_ao;
uniform vec2 u_px;
out vec4 o;
void main() {
  float s = 0.0, w = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
    float k = (x == 0 && y == 0) ? 2.0 : 1.0;
    s += texture(u_ao, v_uv + vec2(float(x), float(y)) * u_px * 1.5).r * k; w += k;
  }
  o = vec4(vec3(s / w), 1.0);
}`;

  const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_px;
uniform float u_thr;
out vec4 o;
void main() {
  vec3 c = vec3(0.0);
  c += texture(u_tex, v_uv + u_px * vec2(-0.5, -0.5)).rgb;
  c += texture(u_tex, v_uv + u_px * vec2( 0.5, -0.5)).rgb;
  c += texture(u_tex, v_uv + u_px * vec2(-0.5,  0.5)).rgb;
  c += texture(u_tex, v_uv + u_px * vec2( 0.5,  0.5)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(u_thr, u_thr + 0.25, l);
  o = vec4(c * k, 1.0);
}`;

  const BLUR_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;
out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb * 0.227;
  c += texture(u_tex, v_uv + u_dir * 1.385).rgb * 0.316;
  c += texture(u_tex, v_uv - u_dir * 1.385).rgb * 0.316;
  c += texture(u_tex, v_uv + u_dir * 3.231).rgb * 0.070;
  c += texture(u_tex, v_uv - u_dir * 3.231).rgb * 0.070;
  o = vec4(c, 1.0);
}`;

  const FINAL_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex, u_b1, u_b2;
uniform float u_bloom;
out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  vec3 b = texture(u_b1, v_uv).rgb * 0.6 + texture(u_b2, v_uv).rgb * 0.9;
  c += b * u_bloom;
  // viñeta suave
  vec2 q = v_uv - 0.5;
  c *= 1.0 - dot(q, q) * 0.55;
  o = vec4(c, 1.0);
}`;

  function colorTarget(gl, w, h, withDepthTex) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let depth = null;
    if (withDepthTex) {
      depth = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, depth);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, depth, w, h };
  }
  function freeTarget(gl, t) { if (!t) return; gl.deleteTexture(t.tex); if (t.depth) gl.deleteTexture(t.depth); gl.deleteFramebuffer(t.fbo); }

  R.post = null;
  R.postOn = false;
  R.bloomOn = true; R.aoOn = true;

  R.initPost = function () {
    const gl = R.gl;
    try {
      const mk = (fs, us) => { const p = program(gl, QUAD_VS, fs); const U = {}; for (const u of us) U[u] = gl.getUniformLocation(p, u); return { p, U }; };
      R.pp = {
        ao: mk(AO_FS, ['u_depth', 'u_px', 'u_proj', 'u_near', 'u_far']),
        aomul: mk(AOMUL_FS, ['u_ao', 'u_px']),
        bright: mk(BRIGHT_FS, ['u_tex', 'u_px', 'u_thr']),
        blur: mk(BLUR_FS, ['u_tex', 'u_dir']),
        final: mk(FINAL_FS, ['u_tex', 'u_b1', 'u_b2', 'u_bloom']),
      };
      R.quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, R.quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      R.quadVao = gl.createVertexArray();
      gl.bindVertexArray(R.quadVao);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
      gl.bindVertexArray(null);
      R.postSupported = true;
    } catch (e) { console.warn('Posprocesado desactivado', e); R.postSupported = false; }
  };

  R.resizePost = function () {
    const gl = R.gl, w = R.width, h = R.height;
    if (!R.postSupported) return;
    const P = R.post || (R.post = {});
    if (P.w === w && P.h === h) return;
    for (const k of ['resolve', 'aoT', 'b1', 'b1b', 'b2', 'b2b']) freeTarget(gl, P[k]);
    if (P.msFbo) { gl.deleteFramebuffer(P.msFbo); gl.deleteRenderbuffer(P.msColor); gl.deleteRenderbuffer(P.msDepth); }
    P.w = w; P.h = h;
    const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
    P.msFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.msFbo);
    P.msColor = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, P.msColor);
    if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, P.msColor);
    P.msDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, P.msDepth);
    if (samples > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h); else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, P.msDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    P.resolve = colorTarget(gl, w, h, true);
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
    P.aoT = colorTarget(gl, hw, hh, false);
    P.b1 = colorTarget(gl, hw, hh, false); P.b1b = colorTarget(gl, hw, hh, false);
    P.b2 = colorTarget(gl, qw, qh, false); P.b2b = colorTarget(gl, qw, qh, false);
  };

  R.setPost = function (bloom, ao) {
    R.bloomOn = !!bloom; R.aoOn = !!ao;
    R.postOn = R.postSupported && (R.bloomOn || R.aoOn);
  };

  function quad(prog) { const gl = R.gl; gl.useProgram(prog.p); gl.bindVertexArray(R.quadVao); return prog.U; }
  function drawQuad() { const gl = R.gl; gl.drawArrays(gl.TRIANGLES, 0, 6); gl.bindVertexArray(null); }
  function bindTex(unit, tex, loc) { const gl = R.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); }
  function target(t) { const gl = R.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null); gl.viewport(0, 0, t ? t.w : R.width, t ? t.h : R.height); }

  // Tras dibujar el mundo (antes del arma): oclusión ambiental sobre la profundidad
  R.endWorld = function () {
    if (!R.postOn || !R.aoOn) return;
    const gl = R.gl, P = R.post;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, P.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.resolve.fbo);
    gl.blitFramebuffer(0, 0, P.w, P.h, 0, 0, P.w, P.h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    target(P.aoT);
    let U = quad(R.pp.ao);
    bindTex(0, P.resolve.depth, U.u_depth);
    gl.uniform2f(U.u_px, 1 / P.w, 1 / P.h);
    gl.uniform2f(U.u_proj, R.proj[0], R.proj[5]);
    gl.uniform1f(U.u_near, 0.04); gl.uniform1f(U.u_far, 90);
    drawQuad();
    // multiplicar sobre la escena
    gl.bindFramebuffer(gl.FRAMEBUFFER, P.msFbo); gl.viewport(0, 0, P.w, P.h);
    gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    U = quad(R.pp.aomul);
    bindTex(0, P.aoT.tex, U.u_ao);
    gl.uniform2f(U.u_px, 1 / P.aoT.w, 1 / P.aoT.h);
    drawQuad();
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.useProgram(R.prog);
    // devolver las texturas de sombra a sus unidades
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.shadow2.tex);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.shadowTex);
  };

  // Pasada de cristales: transparentes, sin escribir profundidad
  R.beginGlass = function () {
    const gl = R.gl;
    gl.useProgram(R.prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.uniform1f(R.U.u_glass, 1);
  };
  R.endGlass = function () {
    const gl = R.gl;
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.uniform1f(R.U.u_glass, 0);
  };

  // Al final del fotograma: resuelve el multimuestreo, resplandor y a pantalla
  R.present = function () {
    if (!R.postOn) return;
    const gl = R.gl, P = R.post;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, P.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.resolve.fbo);
    gl.blitFramebuffer(0, 0, P.w, P.h, 0, 0, P.w, P.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    let U;
    if (R.bloomOn) {
      // extraer lo brillante a media resolución y difuminar en dos escalas
      target(P.b1); U = quad(R.pp.bright);
      bindTex(0, P.resolve.tex, U.u_tex); gl.uniform2f(U.u_px, 1 / P.w, 1 / P.h); gl.uniform1f(U.u_thr, 0.8); drawQuad();
      const blur = (src, dst, dx, dy) => { target(dst); const u = quad(R.pp.blur); bindTex(0, src.tex, u.u_tex); gl.uniform2f(u.u_dir, dx / src.w, dy / src.h); drawQuad(); };
      blur(P.b1, P.b1b, 1, 0); blur(P.b1b, P.b1, 0, 1);
      blur(P.b1, P.b2, 1, 0); blur(P.b2, P.b2b, 0, 1); blur(P.b2b, P.b2, 1.5, 0); blur(P.b2, P.b2b, 0, 1.5);
    }
    target(null);
    U = quad(R.pp.final);
    bindTex(0, P.resolve.tex, U.u_tex);
    bindTex(1, P.b1.tex, U.u_b1);
    bindTex(2, P.b2b.tex, U.u_b2);
    gl.uniform1f(U.u_bloom, R.bloomOn ? 0.75 : 0);
    drawQuad();
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(R.prog);
  };

  VX.Renderer = R;
})();
