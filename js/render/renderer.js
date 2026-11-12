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
      'u_fogColor', 'u_fogNear', 'u_fogFar', 'u_edge'];
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
    R.resize();
    window.addEventListener('resize', R.resize);
    return true;
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
    if (size !== R.shadowSize) R.createShadowMap(size);
    R.resize();
  };

  R.resize = function () {
    const s = R.renderScale || 1;
    const w = Math.max(1, Math.floor(window.innerWidth * s)), h = Math.max(1, Math.floor(window.innerHeight * s));
    R.canvas.width = w; R.canvas.height = h;
    R.width = w; R.height = h;
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.cullFace(gl.BACK);
  };

  // ---------------- Escena ----------------
  // cam: {x,y,z,yaw,pitch}; env: {lights:[{x,y,z,r,cr,cg,cb}], spot:{...,cr,cg,cb,on}, ambient:[r,g,b]}
  R.beginScene = function (cam, env) {
    const gl = R.gl, U = R.U, M = VX.M;
    gl.viewport(0, 0, R.width, R.height);
    const f = R.fogColor;
    gl.clearColor(f[0], f[1], f[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(R.prog);
    gl.cullFace(gl.BACK);

    const cp = Math.cos(cam.pitch);
    const fx = Math.sin(cam.yaw) * cp, fy = Math.sin(cam.pitch), fz = Math.cos(cam.yaw) * cp;
    R.camFwd = [fx, fy, fz]; R.camPos = [cam.x, cam.y, cam.z];
    R.view = M.lookAt(cam.x, cam.y, cam.z, cam.x + fx, cam.y + fy, cam.z + fz);
    R.proj = M.perspective(R.fov, R.width / R.height, 0.04, 90);
    gl.uniformMatrix4fv(U.u_proj, false, R.proj);
    gl.uniformMatrix4fv(U.u_view, false, R.view);
    R.setFrustum(M.multiply(R.proj, R.view));
    gl.uniform3f(U.u_camPos, cam.x, cam.y, cam.z);
    gl.uniform3f(U.u_fogColor, f[0], f[1], f[2]);
    gl.uniform1f(U.u_fogNear, 10);
    gl.uniform1f(U.u_fogFar, 42);
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
    if (dx * dx + dz * dz > 62 * 62) return false;   // más allá de la niebla
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
  };

  VX.Renderer = R;
})();
