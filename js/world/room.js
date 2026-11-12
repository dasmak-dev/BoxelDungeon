// Una habitación: rejilla de vóxeles (0,25 m) dividida en chunks para el render.
// Puede tener puertas en sus 4 lados: una de entrada y hasta 3 salidas.
// Las plantillas trabajan en "unidades" de 0,5 m (K = 2 vóxeles por unidad).
// Lados: 'zp' (+Z), 'zn' (-Z), 'xp' (+X), 'xn' (-X).
(function () {
  const S = VX.S, K = VX.K, CH = 16;
  const tmpCol = [0, 0, 0, 0];
  const ao8 = [1, 1, 1, 1, 1, 1, 1, 1];
  const OPP = { zp: 'zn', zn: 'zp', xp: 'xn', xn: 'xp' };
  const INWARD = { zn: [0, 1], zp: [0, -1], xn: [1, 0], xp: [-1, 0] };

  class Room {
    // opts: { entrance: lado | null, exits: [lados], maxD: unidades }
    constructor(index, type, template, opts = {}) {
      const M = VX.M;
      this.index = index;
      this.type = type;            // start | normal | shop | reward | boss | save
      this.template = template;
      this.name = template.name;
      this.w = M.randInt(template.w[0], template.w[1]) & ~1;
      let d = M.randInt(template.d[0], template.d[1]);
      if (opts.maxD) d = Math.min(d, opts.maxD);
      this.d = Math.max(22, d) & ~1;
      this.h = template.h || 10;
      this.W = this.w * K; this.D = this.d * K; this.H = this.h * K;
      this.cu = this.w / 2; this.cuz = this.d / 2;
      this.cx = this.W / 2; this.cz = this.D / 2;
      this.ox = 0; this.oz = 0;
      this.entrance = opts.entrance || null;
      this.zone = opts.zone || 0;
      this.exits = opts.exits || [];
      this.doors = {};
      if (this.entrance) this.doors[this.entrance] = { role: 'entrance', closed: false, neighbor: null };
      for (const s of this.exits) this.doors[s] = { role: 'exit', closed: true, neighbor: null, type: null };
      const n = this.W * this.H * this.D;
      this.grid = new Uint8Array(n);
      this.hp = new Float32Array(n);
      this.CW = Math.ceil(this.W / CH); this.CD = Math.ceil(this.D / CH);
      this.chunkDirty = new Uint8Array(this.CW * this.CD).fill(1);
      this.chunks = [];
      this.anyDirty = true;
      this.ceiling = null;
      this.cleared = false;
      this.entered = false;
      this.features = [];
      this.torches = [];
      this.walk = null;
      this.hmap = null;
      this.mapVersion = 0;
      this.pendingWaves = 0;
      this.spikes = [];
    }

    // Trampa de púas en un rectángulo de unidades (sale y se esconde periódicamente)
    // kind: 'spikes' (salen y se esconden), 'lava' o 'acid' (siempre activos)
    addSpikes(ux0, uz0, ux1, uz1, kind = 'spikes') {
      const a = Math.max(2, Math.min(ux0, ux1)), b = Math.min(this.w - 3, Math.max(ux0, ux1));
      const c = Math.max(2, Math.min(uz0, uz1)), d = Math.min(this.d - 3, Math.max(uz0, uz1));
      for (let ux = a; ux <= b; ux++) for (let uz = c; uz <= d; uz++) if (this.isReservedU(ux, uz)) return false;
      this.spikes.push({ kind, ux0: a, uz0: c, ux1: b, uz1: d, phase: this.spikes.length * 0.9 + Math.random() * 0.4 });
      this.walk = null;
      return true;
    }

    // Charcos/trampas al azar en zonas llanas y libres
    addRandomHazards(kind, n) {
      for (let i = 0, tries = 0; i < n && tries < 60; tries++) {
        const sw = VX.M.randInt(2, 4), sd = VX.M.randInt(2, 4);
        const ux = VX.M.randInt(4, this.w - 5 - sw), uz = VX.M.randInt(6, this.d - 7 - sd);
        let free = true;
        for (let x = ux * 2; x < (ux + sw) * 2 && free; x++)
          for (let z = uz * 2; z < (uz + sd) * 2; z++) if (this.grid[this.idx(x, 0, z)]) { free = false; break; }
        if (free && this.addSpikes(ux, uz, ux + sw - 1, uz + sd - 1, kind)) i++;
      }
    }

    place(ox, oz) { this.ox = ox; this.oz = oz; }

    build() {
      this.buildShell();
      this.template.build(this);
      if (this.template.relief) this.template.relief(this);
      const Z = VX.ZONES[this.zone || 0];
      if (this.type === 'normal' && Z) {
        if (Z.hazard === 'spikes') { if (Math.random() < 0.3) this.addRandomHazards('spikes', VX.M.randInt(1, 2)); }
        else this.addRandomHazards(Z.hazard, VX.M.randInt(2, 4));
      }
      this.placeTorches();
      for (const s in this.doors) this.setDoor(s, this.doors[s].closed);
    }

    idx(x, y, z) { return (y * this.D + z) * this.W + x; }
    inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D; }
    get(x, y, z) { return this.inBounds(x, y, z) ? this.grid[this.idx(x, y, z)] : 0; }

    markDirty(x, z) {
      const cx = x >> 4, cz = z >> 4, lx = x & 15, lz = z & 15;
      for (let dz = (lz === 0 ? -1 : 0); dz <= (lz === 15 ? 1 : 0); dz++)
        for (let dx = (lx === 0 ? -1 : 0); dx <= (lx === 15 ? 1 : 0); dx++) {
          const a = cx + dx, b = cz + dz;
          if (a >= 0 && b >= 0 && a < this.CW && b < this.CD) this.chunkDirty[b * this.CW + a] = 1;
        }
      this.anyDirty = true;
    }

    set(x, y, z, t) {
      if (!this.inBounds(x, y, z)) return;
      const i = this.idx(x, y, z);
      this.grid[i] = t;
      this.hp[i] = t ? VX.Blocks.info[t].hp : 0;
      this.markDirty(x, z);
      this.walk = null;
      this.mapVersion++;
    }

    // ---- Ayudantes de diseño (unidades de 0,5 m) ----
    isReservedU(ux, uz) {
      for (const s in this.doors) {
        if (s === 'zn' && Math.abs(ux + 0.5 - this.cu) <= 3.5 && uz < 6) return true;
        if (s === 'zp' && Math.abs(ux + 0.5 - this.cu) <= 3.5 && uz > this.d - 7) return true;
        if (s === 'xn' && Math.abs(uz + 0.5 - this.cuz) <= 3.5 && ux < 6) return true;
        if (s === 'xp' && Math.abs(uz + 0.5 - this.cuz) <= 3.5 && ux > this.w - 7) return true;
      }
      return false;
    }
    hasDoor(side) { return !!this.doors[side]; }

    box(x0, y0, z0, x1, y1, z1, t, ignoreReserve = false) {
      const xa = Math.max(2, Math.min(x0, x1)), xb = Math.min(this.w - 3, Math.max(x0, x1));
      const za = Math.max(2, Math.min(z0, z1)), zb = Math.min(this.d - 3, Math.max(z0, z1));
      const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(this.h - 1, Math.max(y0, y1));
      for (let ux = xa; ux <= xb; ux++)
        for (let uz = za; uz <= zb; uz++) {
          if (!ignoreReserve && this.isReservedU(ux, uz)) continue;
          for (let y = ya * K; y < (yb + 1) * K; y++)
            for (let x = ux * K; x < ux * K + K; x++)
              for (let z = uz * K; z < uz * K + K; z++) this.set(x, y, z, t);
        }
    }

    column(ux, uz, hv, t) {
      if (ux < 2 || uz < 2 || ux > this.w - 3 || uz > this.d - 3 || this.isReservedU(ux, uz)) return;
      for (let x = ux * K; x < ux * K + K; x++)
        for (let z = uz * K; z < uz * K + K; z++) {
          const h = Math.max(1, hv - (Math.random() < 0.35 ? 1 : 0));
          for (let y = 0; y < Math.min(h, this.H - 2); y++) this.set(x, y, z, t);
        }
    }

    // Columna de terreno (en vóxeles), solo rellena aire
    terrainColumn(x, z, hv) {
      const T = VX.Blocks.TERRAIN;
      for (let y = 0; y < hv; y++) if (!this.grid[this.idx(x, y, z)]) this.set(x, y, z, T);
    }

    // 0 junto a las puertas, 1 lejos de ellas (para que el relieve no bloquee el paso)
    doorMask(x, z) {
      let m = 1;
      for (const s in this.doors) {
        const p = this.doorCellCenter(s);
        const d = Math.hypot(x - p[0], z - p[1]);
        m = Math.min(m, VX.M.smoothstep(10, 26, d));
      }
      return m;
    }

    doorCellCenter(side) {
      if (side === 'zn') return [this.cx, 0];
      if (side === 'zp') return [this.cx, this.D - 1];
      if (side === 'xn') return [0, this.cz];
      return [this.W - 1, this.cz];
    }

    // Centro de la puerta en metros (en el borde interior) y normal hacia dentro
    doorWorld(side) {
      const n = INWARD[side];
      let x, z;
      if (side === 'zn' || side === 'zp') { x = (this.ox + this.cx) * S; z = (this.oz + (side === 'zn' ? 4 : this.D - 4)) * S; }
      else { z = (this.oz + this.cz) * S; x = (this.ox + (side === 'xn' ? 4 : this.W - 4)) * S; }
      return { x, z, nx: n[0], nz: n[1] };
    }

    buildShell() {
      const { W, H, D } = this;
      const BL = VX.Blocks;
      for (let y = 0; y < H; y++)
        for (let z = 0; z < D; z++)
          for (let x = 0; x < W; x++) {
            const m = Math.min(x, z, W - 1 - x, D - 1 - z);
            if (m >= K * 2) continue;
            const i = this.idx(x, y, z);
            let t;
            if (m === 0 || y >= H - 4) t = BL.BEDROCK;
            else {
              const patch = VX.M.hash3(x >> 3, y >> 2, (z >> 3) + this.index * 17);
              t = patch < 0.2 ? BL.MOSS : BL.BRICK;
            }
            this.grid[i] = t; this.hp[i] = BL.info[t].hp;
          }
    }

    doorRange(side) {
      if (side === 'zn' || side === 'zp') {
        const z0 = side === 'zn' ? 0 : this.D - 4;
        return { axis: 'z', a0: this.cx - 4, t0: z0, y1: 12 };
      }
      const x0 = side === 'xn' ? 0 : this.W - 4;
      return { axis: 'x', a0: this.cz - 4, t0: x0, y1: 12 };
    }

    // a: coordenada a lo ancho de la puerta, t: a lo grueso del muro
    doorCell(r, a, t, y, v) {
      if (r.axis === 'z') this.set(r.a0 + a, y, r.t0 + t, v);
      else this.set(r.t0 + t, y, r.a0 + a, v);
    }

    setDoor(side, closed) {
      const BL = VX.Blocks;
      const r = this.doorRange(side);
      for (let a = 0; a < 8; a++)
        for (let y = 0; y < r.y1; y++)
          for (let t = 0; t < 4; t++) {
            const mid = t === 1 || t === 2;
            const bar = mid && (a % 2 === 0 || y % 4 === 3);
            this.doorCell(r, a, t, y, closed && bar ? BL.DOOR : BL.AIR);
          }
      for (let t = 0; t < 4; t++)
        for (let y = 0; y <= r.y1; y++) {
          this.doorCell(r, -1, t, y, BL.BEDROCK);
          this.doorCell(r, 8, t, y, BL.BEDROCK);
          if (y === r.y1) for (let a = 0; a < 8; a++) this.doorCell(r, a, t, y, BL.BEDROCK);
        }
      if (this.doors[side]) this.doors[side].closed = closed;
    }

    placeTorches() {
      const BL = VX.Blocks;
      const y = 8, step = 24;
      const wall = K * 2 - 1;
      const tryAdd = (ax, az, nx, nz) => {
        const tx = ax + nx, tz = az + nz;
        if (!this.inBounds(tx, y, tz) || this.get(tx, y, tz) !== 0 || !BL.isSolid(this.get(ax, y, az))) return;
        if (this.get(tx, y - 1, tz) !== 0) return; // enterrada por el relieve
        this.torches.push({
          x: (this.ox + ax + 0.5 + nx * 1.4) * S, y: (y + 0.5) * S + 0.2, z: (this.oz + az + 0.5 + nz * 1.4) * S,
          nx, nz, anchor: [ax, y, az], alive: true, phase: Math.random() * 10,
        });
      };
      for (let z = 12; z < this.D - 12; z += step) {
        if (!(this.doors.xn && Math.abs(z - this.cz) < 12)) tryAdd(wall, z, 1, 0);
        if (!(this.doors.xp && Math.abs(z - this.cz) < 12)) tryAdd(this.W - 1 - wall, z, -1, 0);
      }
      for (let x = 12; x < this.W - 12; x += step) {
        if (!(this.doors.zn && Math.abs(x - this.cx) < 12)) tryAdd(x, wall, 0, 1);
        if (!(this.doors.zp && Math.abs(x - this.cx) < 12)) tryAdd(x, this.D - 1 - wall, 0, -1);
      }
    }

    // ---- Coordenadas ----
    containsG(gx, gz) {
      return gz >= this.oz && gz < this.oz + this.D && gx >= this.ox && gx < this.ox + this.W;
    }
    contains(x, z) { return this.containsG(Math.floor(x / S), Math.floor(z / S)); }
    worldX(x) { return (this.ox + x + 0.5) * S; }
    worldZ(z) { return (this.oz + z + 0.5) * S; }
    uX(ux) { return (this.ox + ux * K) * S; }
    uZ(uz) { return (this.oz + uz * K) * S; }
    centerX() { return (this.ox + this.cx) * S; }
    centerZ() { return (this.oz + this.cz) * S; }

    // ¿El punto está ya bien dentro (pasada la puerta de entrada)?
    insideDeep(x, z) {
      if (!this.contains(x, z)) return false;
      const lx = x / S - this.ox, lz = z / S - this.oz;
      switch (this.entrance) {
        case 'zn': return lz > 6;
        case 'zp': return lz < this.D - 6;
        case 'xn': return lx > 6;
        case 'xp': return lx < this.W - 6;
        default: return true;
      }
    }

    // Mapa de alturas (vóxeles sólidos contiguos desde el suelo) y mapa transitable
    getWalk() {
      if (this.walk) return this.walk;
      const { W, D, H, grid } = this;
      const hm = new Uint8Array(W * D);
      const base = new Uint8Array(W * D);
      for (let z = 0; z < D; z++)
        for (let x = 0; x < W; x++) {
          let h = 0;
          while (h < H && grid[(h * D + z) * W + x]) h++;
          hm[z * W + x] = h;
          let ok = h <= H - 7 ? 1 : 0;
          if (ok) for (let y = h; y < h + 6; y++) if (grid[(y * D + z) * W + x]) { ok = 0; break; }
          base[z * W + x] = ok;
        }
      // los zombis evitan púas, ácido y lava al buscar camino
      for (const sp of this.spikes)
        for (let z = sp.uz0 * 2; z < (sp.uz1 + 1) * 2; z++)
          for (let x = sp.ux0 * 2; x < (sp.ux1 + 1) * 2; x++) base[z * W + x] = 0;
      const w = new Uint8Array(W * D);
      for (let z = 1; z < D - 1; z++)
        for (let x = 1; x < W - 1; x++) {
          const i = z * W + x;
          if (!base[i]) continue;
          const h = hm[i];
          let ok = 1;
          for (let dz = -1; dz <= 1 && ok; dz++)
            for (let dx = -1; dx <= 1; dx++) {
              const n = i + dz * W + dx;
              if (!base[n] || Math.abs(hm[n] - h) > 2) { ok = 0; break; }
            }
          w[i] = ok;
        }
      this.hmap = hm;
      this.walk = w;
      return w;
    }

    // Altura del suelo (m) en una posición local de vóxel
    groundL(x, z) {
      if (x < 0 || z < 0 || x >= this.W || z >= this.D) return 0;
      this.getWalk();
      return this.hmap[z * this.W + x] * S;
    }

    randomFreeCell(minDistFromPlayer, px, pz, marginU = 3) {
      const walk = this.getWalk();
      const m = marginU * K;
      for (let tries = 0; tries < 400; tries++) {
        const x = VX.M.randInt(m, this.W - 1 - m);
        const z = VX.M.randInt(m, this.D - 1 - m);
        if (!walk[z * this.W + x] || !walk[z * this.W + x + 2] || !walk[z * this.W + x - 2] ||
            !walk[(z + 2) * this.W + x] || !walk[(z - 2) * this.W + x]) continue;
        const wx = this.worldX(x), wz = this.worldZ(z);
        if (Math.hypot(wx - px, wz - pz) < minDistFromPlayer) continue;
        return { x: wx, z: wz };
      }
      return { x: this.centerX(), z: this.centerZ() };
    }

    // ---------------- Malla ----------------
    solidL(x, y, z) {
      if (x < 0 || z < 0 || x >= this.W || z >= this.D || y < 0 || y >= this.H) return 1;
      return this.grid[(y * this.D + z) * this.W + x] ? 1 : 0;
    }

    computeAO(x, y, z, out) {
      for (let sz = 0; sz < 2; sz++)
        for (let sy = 0; sy < 2; sy++)
          for (let sx = 0; sx < 2; sx++) {
            let c = -1;
            for (let a = sx - 1; a <= sx; a++)
              for (let b = sy - 1; b <= sy; b++)
                for (let d = sz - 1; d <= sz; d++) c += this.solidL(x + a, y + b, z + d);
            out[sz * 4 + sy * 2 + sx] = Math.max(0.32, Math.min(1.05, 1 - (c - 3) * 0.17));
          }
      return out;
    }

    floorAO(px, pz) {
      let c = 0;
      for (let z = pz - 2; z < pz + 2; z++)
        for (let x = px - 2; x < px + 2; x++) c += this.solidL(x, 0, z);
      return 1 - (c / 16) * 0.85;
    }

    floorTint(c) {
      const Z = VX.ZONES[this.zone || 0].floor;
      let r = c * Z[0], g = c * 0.95 * Z[1], b = c * 1.05 * Z[2];
      if (this.type === 'boss') { r *= 1.25; g *= 0.82; b *= 0.8; }
      else if (this.type === 'shop') { r *= 1.12; g *= 1.04; b *= 0.82; }
      else if (this.type === 'reward' || this.type === 'save') { r *= 0.9; b *= 1.15; }
      return [r, g, b];
    }

    rebuildChunk(ci, R) {
      let batch = this.chunks[ci];
      if (!batch) batch = this.chunks[ci] = R.createBatch(512, false);
      batch.clear();
      const BL = VX.Blocks;
      const cxi = ci % this.CW, czi = (ci - cxi) / this.CW;
      const x0 = cxi * CH, z0 = czi * CH;
      const x1 = Math.min(this.W, x0 + CH), z1 = Math.min(this.D, z0 + CH);
      const { W, D, H, grid } = this;

      for (let z = z0; z < z1; z += K)
        for (let x = x0; x < x1; x += K) {
          if (this.solidL(x, 0, z) && this.solidL(x + 1, 0, z + 1) && this.solidL(x + 1, 0, z) && this.solidL(x, 0, z + 1)) continue;
          const gx = this.ox + x, gz = this.oz + z;
          const h = VX.M.hash3(gx, 3, gz), h2 = VX.M.hash3(gx >> 2, 5, gz >> 2);
          const [r, g, b] = this.floorTint(0.24 + h * 0.06 + h2 * 0.04);
          const a00 = this.floorAO(x, z), a10 = this.floorAO(x + K, z), a01 = this.floorAO(x, z + K), a11 = this.floorAO(x + K, z + K);
          ao8[0] = a00; ao8[1] = a10; ao8[2] = a00; ao8[3] = a10;
          ao8[4] = a01; ao8[5] = a11; ao8[6] = a01; ao8[7] = a11;
          batch.aobox((gx + K / 2) * S, -0.12, (gz + K / 2) * S, K * S, 0.24, K * S, r, g, b, 0, ao8);
        }

      for (let y = 0; y < H; y++)
        for (let z = z0; z < z1; z++)
          for (let x = x0; x < x1; x++) {
            const t = grid[(y * D + z) * W + x];
            if (!t) continue;
            const up = this.solidL(x, y + 1, z);
            if (this.solidL(x + 1, y, z) && this.solidL(x - 1, y, z) && up &&
                this.solidL(x, y - 1, z) && this.solidL(x, y, z + 1) && this.solidL(x, y, z - 1)) continue;
            const gx = this.ox + x, gz = this.oz + z;
            BL.color(t, gx, y, gz, tmpCol);
            const inf = BL.info[t];
            if (inf.terrain && !up) {
              // superficie del relieve: losas como el suelo
              const hh = VX.M.hash3(gx >> 1, 3, gz >> 1);
              const c = this.floorTint(0.2 + hh * 0.05 + (y * 0.004));
              tmpCol[0] = c[0]; tmpCol[1] = c[1]; tmpCol[2] = c[2];
            }
            if (t === BL.BRICK || t === BL.MOSS || t === BL.BEDROCK || t === BL.STONE || (inf.terrain && up)) {
              const Z = VX.ZONES[this.zone || 0].tint;
              tmpCol[0] *= Z[0]; tmpCol[1] *= Z[1]; tmpCol[2] *= Z[2];
            }
            if (inf.hp !== Infinity) {
              const k = 0.6 + 0.4 * (this.hp[(y * D + z) * W + x] / inf.hp);
              tmpCol[0] *= k; tmpCol[1] *= k; tmpCol[2] *= k;
            }
            this.computeAO(x, y, z, ao8);
            batch.aobox((gx + 0.5) * S, (y + 0.5) * S, (gz + 0.5) * S, S, S, S, tmpCol[0], tmpCol[1], tmpCol[2], tmpCol[3], ao8);
          }
      batch.upload();
      this.chunkDirty[ci] = 0;
    }

    buildCeiling(R) {
      const b = this.ceiling = R.createBatch(256, false);
      const top = this.H * S;
      const T = 8;
      for (let z = 0; z < this.D; z += T)
        for (let x = 0; x < this.W; x += T) {
          const sx = Math.min(T, this.W - x), sz = Math.min(T, this.D - z);
          const h = VX.M.hash3(x + this.ox, 99, z + this.oz);
          const c = 0.14 + h * 0.04;
          b.box((this.ox + x + sx / 2) * S, top + 0.25, (this.oz + z + sz / 2) * S, sx * S, 0.5, sz * S, c, c * 0.95, c * 1.05);
        }
      for (let z = 16; z < this.D - 8; z += 32)
        b.box((this.ox + this.cx) * S, top - 0.15, (this.oz + z) * S, (this.W - 4) * S, 0.3, 0.35, 0.3, 0.2, 0.11);
      b.upload();
    }

    updateMeshes(R, budget) {
      if (!this.ceiling) this.buildCeiling(R);
      if (!this.anyDirty) return 0;
      let n = 0;
      for (let i = 0; i < this.chunkDirty.length; i++) {
        if (!this.chunkDirty[i]) continue;
        if (n >= budget) return n;
        this.rebuildChunk(i, R);
        n++;
      }
      this.anyDirty = false;
      return n;
    }

    draw(R) {
      for (let i = 0; i < this.chunks.length; i++) {
        const b = this.chunks[i];
        if (!b) continue;
        const cxi = i % this.CW, czi = (i - cxi) / this.CW;
        const cx = (this.ox + cxi * CH + CH / 2) * S, cz = (this.oz + czi * CH + CH / 2) * S;
        if (!R.visible(cx, this.H * S * 0.5, cz, Math.hypot(2.1, 2.1, this.H * S * 0.5))) continue;
        b.draw();
      }
      if (this.ceiling) this.ceiling.draw();
    }

    dispose() {
      for (const b of this.chunks) if (b) b.dispose();
      if (this.ceiling) this.ceiling.dispose();
      this.chunks = []; this.ceiling = null;
    }
  }

  Room.OPP = OPP;
  Room.INWARD = INWARD;
  Room.SIDES = ['zp', 'xn', 'xp', 'zn'];
  VX.Room = Room;
})();
