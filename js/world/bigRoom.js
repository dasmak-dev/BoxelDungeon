// Base de los mapas grandes del modo Horda (ciudad, coliseo…).
// - Mapa transitable incremental (romper una pared sólo recalcula sus columnas).
// - Suelo en losas de 1 m según un mapa de tipos (gmap) y una paleta propia.
// - Decorado estático troceado en grupos de 20 m que se descartan si no se ven.
// - Ayudantes de construcción en metros locales (VX.BigBuild).
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const C = 4;   // celdas por metro

  class BigRoom extends VX.Room {
    // sx, sz: tamaño en metros; h: alto en unidades de 0,5 m
    constructor(name, sx, sz, h, zone) {
      super(1, 'horde', { name, w: [sx * 2, sx * 2], d: [sz * 2, sz * 2], h, build() {} }, { entrance: null, exits: [], zone });
      this.big = true;
      this.sxM = sx; this.szM = sz;
      this.topSupports = true;
      this.hasGlass = true;
      this.drawDist = 84;
      this.gmap = new Uint8Array(sx * sz).fill(255);
      this.spawns = []; this.chestSpots = []; this.merchantSpots = []; this.beacons = []; this.perkSpots = [];
      this.walkDirty = [];
      this.place(-sx * C / 2, -sz * C / 2);
    }

    generate() {}

    build() {
      this.generate();
      this.occ = new Uint8Array(this.W * this.D);
      for (const q of this.pending) VX.Props.place(this, q.type, q.x, q.z, q.opts || {});
      this.pending = [];
      const W = this.W, D = this.D;
      this.staticCol = new Uint8Array(W * D);
      for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (this.grid[z * W + x] === B.BARRIER && this.grid[((this.H - 1) * D + z) * W + x] === B.BARRIER) this.staticCol[z * W + x] = 1;
      // decorado por grupos (se crean los lotes al dibujar por primera vez)
      this.decorBatch = { draw: () => this.drawDecor(VX.Renderer), dispose: () => this.disposeDecor() };
    }

    buildCeiling() { this.ceiling = { draw() {}, dispose() {} }; }

    // ---------- decorado por grupos ----------
    drawDecor(R) {
      if (!this.decorGroups) {
        const G = new Map(), cell = 20;
        for (const d of this.decorBoxes) {
          const k = Math.floor(d[0] / cell) + ',' + Math.floor(d[2] / cell);
          let g = G.get(k);
          if (!g) G.set(k, (g = { list: [], x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 }));
          g.list.push(d);
          const hx = d[3] / 2, hy = d[4] / 2, hz = d[5] / 2, ext = d[10] ? Math.max(hx, hz) : 0;
          g.x0 = Math.min(g.x0, d[0] - hx - ext); g.x1 = Math.max(g.x1, d[0] + hx + ext);
          g.y0 = Math.min(g.y0, d[1] - hy); g.y1 = Math.max(g.y1, d[1] + hy);
          g.z0 = Math.min(g.z0, d[2] - hz - ext); g.z1 = Math.max(g.z1, d[2] + hz + ext);
        }
        this.decorGroups = [];
        for (const g of G.values()) {
          const b = R.createBatch(Math.max(64, g.list.length), false);
          for (const d of g.list) {
            if (d[10]) b.rbox(d[0], d[1], d[2], d[3], d[4], d[5], M.qY(d[10]), d[6], d[7], d[8], d[9]);
            else b.box(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9]);
          }
          b.upload();
          const cx = (g.x0 + g.x1) / 2, cy = (g.y0 + g.y1) / 2, cz = (g.z0 + g.z1) / 2;
          const rad = Math.hypot(g.x1 - g.x0, g.y1 - g.y0, g.z1 - g.z0) / 2;
          this.decorGroups.push({ b, cx, cy, cz, rad });
        }
      }
      if (R.shadowPass) return;   // el decorado no hace falta en la sombra de la linterna
      for (const g of this.decorGroups) if (R.visible(g.cx, g.cy, g.cz, g.rad)) g.b.draw();
    }

    disposeDecor() {
      if (this.decorGroups) for (const g of this.decorGroups) g.b.dispose();
      this.decorGroups = null;
    }

    // ---------- mapa transitable incremental ----------
    set(x, y, z, t) {
      if (!this.inBounds(x, y, z)) return;
      const i = this.idx(x, y, z);
      this.grid[i] = t;
      this.hp[i] = t ? B.info[t].hp : 0;
      this.markDirty(x, z);
      this.mapVersion++;
      if (this.walk) this.walkDirty.push(z * this.W + x);
    }

    getWalk() {
      if (!this.walk) { this.fullWalk(); this.walkDirty.length = 0; return this.walk; }
      if (this.walkDirty.length) {
        const W = this.W, D = this.D, seen = new Set();
        for (const c of this.walkDirty) { if (!seen.has(c)) { seen.add(c); this.colBase(c); } }
        for (const c of seen) {
          const cx = c % W, cz = (c - cx) / W;
          for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const x = cx + dx, z = cz + dz;
            if (x > 0 && z > 0 && x < W - 1 && z < D - 1) this.colWalk(z * W + x);
          }
        }
        this.walkDirty.length = 0;
      }
      return this.walk;
    }

    colBase(i) {
      const { W, D, H, grid } = this, x = i % W, z = (i - x) / W;
      let h = 0;
      while (h < H && grid[(h * D + z) * W + x]) h++;
      this.hmap[i] = h;
      let ok = h <= H - 7 ? 1 : 0;
      if (ok) for (let y = h; y < h + 6; y++) if (grid[(y * D + z) * W + x]) { ok = 0; break; }
      this.wbase[i] = ok;
    }

    colWalk(i) {
      const W = this.W, base = this.wbase, hm = this.hmap;
      if (!base[i]) { this.walk[i] = 0; return; }
      const h = hm[i];
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const n = i + dz * W + dx;
          if (!base[n] || Math.abs(hm[n] - h) > 2) { this.walk[i] = 0; return; }
        }
      this.walk[i] = 1;
    }

    fullWalk() {
      const { W, D, H } = this;
      if (!this.hmap || this.hmap.length !== W * D) { this.hmap = new Uint8Array(W * D); this.wbase = new Uint8Array(W * D); }
      const st = this.staticCol;
      for (let i = 0; i < W * D; i++) {
        if (st && st[i]) { this.hmap[i] = H; this.wbase[i] = 0; continue; }
        this.colBase(i);
      }
      const w = this._walkArr || (this._walkArr = new Uint8Array(W * D));
      w.fill(0);
      this.walk = w;
      for (let z = 1; z < D - 1; z++)
        for (let x = 1; x < W - 1; x++) { const i = z * W + x; if (this.wbase[i]) this.colWalk(i); }
    }

    // ---------- suelo ----------
    // devuelve [r, g, b, mat, mojado] para un tipo de suelo; lo define cada mapa
    floorColor(gt, mx, mz, gx, gz, h, h2, out) { out[0] = out[1] = out[2] = 0.15; out[3] = 0; out[4] = 0; }

    emitFloor(batch, x0, z0, x1, z1) {
      const ao = [1, 1, 1, 1, 1, 1, 1, 1], c = [0, 0, 0, 0, 0], SX = this.sxM;
      for (let cz = z0; cz < z1; cz += C)
        for (let cx = x0; cx < x1; cx += C) {
          const mx = cx >> 2, mz = cz >> 2, gt = this.gmap[mz * SX + mx];
          if (gt === 255) continue;
          if (this.solidL(cx, 0, cz) && this.solidL(cx + 3, 0, cz + 3) && this.solidL(cx + 3, 0, cz) && this.solidL(cx, 0, cz + 3)) continue;
          const gx = this.ox + cx, gz = this.oz + cz;
          this.floorColor(gt, mx, mz, gx, gz, M.hash3(gx, 3, gz), M.hash3(gx >> 3, 5, gz >> 3), c);
          let [r, g, b, mat] = c;
          const pud = c[4] && this.isPuddle(gx, gz, this.damp || 0.5);
          if (pud) { r *= 0.8; g *= 0.8; b *= 0.85; mat = -0.35; this.emitPuddleFilm(batch, gx, gz, C, (x, z) => this.isPuddle(x, z, this.damp || 0.5), r, g, b); }   // charco: suelo mojado y lámina de agua encima
          const a00 = this.floorAO(cx, cz), a10 = this.floorAO(cx + C, cz), a01 = this.floorAO(cx, cz + C), a11 = this.floorAO(cx + C, cz + C);
          ao[0] = a00; ao[1] = a10; ao[2] = a00; ao[3] = a10; ao[4] = a01; ao[5] = a11; ao[6] = a01; ao[7] = a11;
          batch.aobox((gx + 2) * S, -0.12, (gz + 2) * S, C * S, 0.24, C * S, r, g, b, mat, ao);
        }
    }

    floorTint(c) { return [c, c, c]; }

    // Celda libre cerca de (px, pz): los saltos y las crías de los jefes caen cerca
    randomFreeCell(minDist, px, pz, marginU = 3) {
      const walk = this.getWalk(), W = this.W;
      for (let tries = 0; tries < 300; tries++) {
        const a = Math.random() * Math.PI * 2, d = minDist + Math.random() * 14;
        const x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d;
        const cx = Math.floor(x / S) - this.ox, cz = Math.floor(z / S) - this.oz;
        if (cx < 4 || cz < 4 || cx >= W - 4 || cz >= this.D - 4) continue;
        const i = cz * W + cx;
        if (!walk[i] || !walk[i + 2] || !walk[i - 2] || !walk[i + 2 * W] || !walk[i - 2 * W]) continue;
        if (this.hmap[i] > 2) continue;
        return { x: this.worldX(cx), z: this.worldZ(cz) };
      }
      return super.randomFreeCell(minDist, px, pz, marginU);
    }

    dispose() { super.dispose(); this.disposeDecor(); }
  }

  // Ayudantes de construcción en metros locales (origen en la esquina del mapa)
  VX.BigBuild = function (r) {
    const W = r.W, D = r.D, H = r.H, grid = r.grid, hp = r.hp, info = B.info;
    const OX = r.sxM / 2, OZ = r.szM / 2;
    const wx = (m) => m - OX, wz = (m) => m - OZ;
    const setc = (x, y, z, t) => {
      if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) return;
      const i = (y * D + z) * W + x;
      grid[i] = t; hp[i] = t ? info[t].hp : 0;
    };
    const getc = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D) ? 0 : grid[(y * D + z) * W + x];
    const fc = (x0, y0, z0, x1, y1, z1, t) => {
      for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
        for (let z = Math.max(0, z0); z < Math.min(D, z1); z++)
          for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { const i = (y * D + z) * W + x; grid[i] = t; hp[i] = t ? info[t].hp : 0; }
    };
    const cm = (m) => Math.round(m * C);
    const fm = (x0, y0, z0, x1, y1, z1, t) => fc(cm(x0), cm(y0), cm(z0), cm(x1), cm(y1), cm(z1), t);
    const SX = r.sxM, SZ = r.szM;
    const gm = (x0, z0, x1, z1, t) => {
      for (let z = Math.max(0, Math.floor(z0)); z < Math.min(SZ, Math.ceil(z1)); z++)
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(SX, Math.ceil(x1)); x++) r.gmap[z * SX + x] = typeof t === 'function' ? t(x, z) : t;
    };
    const dec = (x, y, z, sx, sy, sz, cr, cg, cb, e = 0, yaw = 0) => r.decorBoxes.push(yaw ? [wx(x), y, wz(z), sx, sy, sz, cr, cg, cb, e, yaw] : [wx(x), y, wz(z), sx, sy, sz, cr, cg, cb, e]);
    const light = (x, y, z, rad, c, extra = {}) => { const f = { kind: 'light', x: wx(x), y, z: wz(z), r: rad, c, ...extra }; r.features.push(f); return f; };
    const prop = (type, x, z, opts) => r.queue(type, wx(x), wz(z), opts || {});
    const chestSpot = (x, z) => r.chestSpots.push({ x: wx(x), z: wz(z) });
    const hash = (a, b, c) => M.hash3(Math.floor(a * 7.13), Math.floor(b * 3.71), Math.floor(c * 5.37));
    // Máquina de ventajas (modo Horda): armario de 1,25 × 2,25 m con panel luminoso.
    // face: hacia dónde mira el frontal ('xn','xp','zn','zp'); perk: id de la ventaja
    const machine = (x, z, face, perk) => {
      const P = VX.HordeMode && VX.HordeMode.PERKS[perk];
      const body = P ? B[P.block] : B.MACH_R, neon = P ? B[P.neon] : B.NEON_R;
      const X = cm(x), Z = cm(z), Wm = 5, Dm = 3, Hm = 9;
      const n = { xn: [-1, 0], xp: [1, 0], zn: [0, -1], zp: [0, 1] }[face];
      const along = n[0] === 0;   // el frontal se extiende en x
      const put = (a, d, y, t) => {   // a: a lo ancho (-2..2), d: fondo (0 = frontal)
        const px = along ? X + a : X - n[0] * d, pz = along ? Z - n[1] * d : Z + a;
        setc(px, y, pz, t);
      };
      for (let a = -2; a <= 2; a++) for (let d = 0; d < Dm; d++) for (let y = 0; y < Hm; y++) {
        let t = body;
        if (d === 0) {
          if (y >= 3 && y <= 7 && Math.abs(a) <= 1) t = B.PANEL;                      // panel con la imagen
          if ((y === 2 || y === 8) && Math.abs(a) <= 1) t = neon;                     // marco de neón
          if (y === 1 && a === 0) t = B.TIRE;                                          // dispensador
          if (y === 4 && a === 2) t = B.STEEL;                                         // ranura de monedas
        }
        if (y === Hm - 1 && d > 0) t = neon;                                           // rótulo superior
        put(a, d, y, t);
      }
      const fx = (X + 0.5 + (along ? 0 : n[0] * 1.2)) / C, fz = (Z + 0.5 + (along ? n[1] * 1.2 : 0)) / C;
      const nc = P ? P.color : [1, 0.2, 0.2];
      light(fx + n[0] * 0.2, 1.4, fz + n[1] * 0.2, 4.5, [nc[0] * 0.38, nc[1] * 0.38, nc[2] * 0.38]);
      r.perkSpots.push({ x: wx(fx + n[0] * 0.55), z: wz(fz + n[1] * 0.55), perk });
    };
    return { C, W, D, H, wx, wz, setc, getc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash, machine };
  };

  VX.BigRoom = BigRoom;
})();
