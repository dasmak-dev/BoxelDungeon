// Cuerpo vóxel articulado y destructible, trozos sueltos (gibs) y cadáveres.
// - Jerarquía simple: brazos y cabeza cuelgan del torso.
// - Solo se dibujan los vóxeles de superficie (los interiores aparecen al abrir agujeros).
// - Las balas abren túneles; si un corte separa parte de una pieza, esa parte cae.
// - Si se corta el torso, la mitad superior (con brazos y cabeza) cae entera.
(function () {
  const M = VX.M;
  const tmp = [0, 0, 0];
  const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  function partIndex(p, i, j, k) {
    const [w, h, d] = p.dims;
    if (i < 0 || j < 0 || k < 0 || i >= w || j >= h || k >= d) return -1;
    return (i * h + j) * d + k;
  }

  function updateExposure(p) {
    p.ver = (p.ver || 0) + 1;   // la malla de la pieza en la GPU se rehace
    const vox = p.vox;
    for (const v of vox) {
      if (!v.alive) continue;
      let ex = false;
      for (const n of NB) {
        const ni = partIndex(p, v.i + n[0], v.j + n[1], v.k + n[2]);
        if (ni < 0 || !vox[ni].alive) { ex = true; break; }
      }
      v.exposed = ex;
    }
  }

  function localQ(p) {
    let q = [0, 0, 0, 1];
    if (p.ax) q = M.qMul(q, M.qX(p.ax));
    if (p.az) q = M.qMul(q, M.qZ(p.az));
    if (p.ay) q = M.qMul(q, M.qY(p.ay));
    return q;
  }

  class VoxelBody {
    constructor(model, scale = 1) {
      this.parts = model.parts;
      this.height = model.height * scale;
      this.depth = (model.depth || 0.2) * scale;
      this.v = model.v * scale;
      this.scale = scale;
      this.byName = {};
      for (const p of this.parts) this.byName[p.name] = p;
      this.x = 0; this.y = 0; this.z = 0;
      this.yaw = 0;
      this.pitch = 0;     // inclinación del cuerpo entero alrededor de los pies
      this.roll = 0;
      this.yOff = 0;
      this.fwdOff = 0;
      this.flash = 0;
      this.cx = 0; this.cy = 0; this.cz = 0; this.radius = this.height * 0.75;
    }

    computeWorld() {
      const s = this.scale;
      const rootQ = M.qMul(M.qMul(M.qY(this.yaw), M.qX(this.pitch)), M.qZ(this.roll));
      const fx = Math.sin(this.yaw) * this.fwdOff, fz = Math.cos(this.yaw) * this.fwdOff;
      const bx = this.x + fx, by = this.y + this.yOff, bz = this.z + fz;
      for (const p of this.parts) {
        if (p.detached) continue;
        const par = p.parent ? this.byName[p.parent] : null;
        if (par && !par.detached) {
          // pivote relativo al del padre, girado con el padre
          M.qRot(par.q, (p.pivot[0] - par.pivot[0]) * s, (p.pivot[1] - par.pivot[1]) * s, (p.pivot[2] - par.pivot[2]) * s, tmp);
          p.wp[0] = par.wp[0] + tmp[0]; p.wp[1] = par.wp[1] + tmp[1]; p.wp[2] = par.wp[2] + tmp[2];
          p.q = M.qMul(par.q, localQ(p));
        } else {
          M.qRot(rootQ, p.pivot[0] * s, p.pivot[1] * s, p.pivot[2] * s, tmp);
          p.wp[0] = bx + tmp[0]; p.wp[1] = by + tmp[1]; p.wp[2] = bz + tmp[2];
          p.q = M.qMul(rootQ, localQ(p));
        }
      }
      // la posición de cada vóxel ya no se calcula en cada fotograma: sólo cuando hace falta
      // (un disparo, una explosión, un corte…), con ensureSurf / ensureAll. El dibujo va en la GPU.
      this._surf = false;
      this._all = false;
      const tp = this.byName.torso;
      if (!tp.detached) {
        M.qRot(tp.q, 0, this.height * 0.15, 0, tmp);
        this.cx = tp.wp[0] + tmp[0]; this.cy = tp.wp[1] + tmp[1]; this.cz = tp.wp[2] + tmp[2];
      } else { this.cx = bx; this.cy = by + 0.5; this.cz = bz; }
    }

    // Posición en el mundo de los vóxeles de la superficie (bajo demanda)
    ensureSurf() {
      if (this._surf) return;
      this._surf = true;
      const s = this.scale;
      for (const p of this.parts) {
        if (p.detached) continue;
        const q = p.q;
        for (const vx of p.vox) {
          if (!vx.alive || !vx.exposed) continue;
          M.qRot(q, vx.x * s, vx.y * s, vx.z * s, tmp);
          vx.wx = p.wp[0] + tmp[0]; vx.wy = p.wp[1] + tmp[1]; vx.wz = p.wp[2] + tmp[2];
        }
      }
    }

    // Posición de todos los vóxeles vivos (también los interiores)
    ensureAll() {
      this.ensureSurf();
      if (this._all) return;
      this._all = true;
      const s = this.scale;
      for (const p of this.parts) {
        if (p.detached || p.hidden) continue;
        const q = p.q;
        for (const vx of p.vox) {
          if (!vx.alive || vx.exposed) continue;
          M.qRot(q, vx.x * s, vx.y * s, vx.z * s, tmp);
          vx.wx = p.wp[0] + tmp[0]; vx.wy = p.wp[1] + tmp[1]; vx.wz = p.wp[2] + tmp[2];
        }
      }
    }

    // Si una parte se suelta, lo que cuelga de ella (mandíbula, casco, pelo…) cae también
    cascade(gibs, res) {
      let again = true;
      while (again) {
        again = false;
        for (const c of this.parts) {
          if (c.detached || !c.parent) continue;
          const par = this.byName[c.parent];
          if (par && par.detached) {
            this.detach(c.name, gibs, M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1));
            if (res) res[c.name] = 'detached';
            again = true;
          }
        }
      }
    }

    render(batch) {
      // lote principal de la escena: el cuerpo se dibuja en la GPU pieza a pieza (R.drawBodies)
      if (batch.bodies && VX.Renderer.bodyOn) { VX.Renderer.bodies.push(this); return; }
      this.ensureSurf();
      const sz = this.v * 1.002;
      const f = this.flash;
      for (const p of this.parts) {
        if (p.detached) continue;
        const q = p.q;
        for (const vx of p.vox) {
          if (!vx.alive || !vx.exposed) continue;
          if (f > 0) batch.rbox(vx.wx, vx.wy, vx.wz, sz, sz, sz, q, M.lerp(vx.r, 1, f), M.lerp(vx.g, 0.85, f), M.lerp(vx.b, 0.85, f), vx.e);
          else batch.rbox(vx.wx, vx.wy, vx.wz, sz, sz, sz, q, vx.r, vx.g, vx.b, vx.e);
        }
      }
    }

    // Modelo simplificado para lejos: cada grupo de 2×2×2 vóxeles de la superficie se dibuja como
    // uno solo, el doble de grande (se recalcula sólo cuando la pieza pierde vóxeles)
    renderCoarse(batch) {
      const sz = this.v * this.scale * 2.0, f = this.flash, s = this.scale;
      for (const p of this.parts) {
        if (p.detached || p.hidden) continue;
        if (!p.coarse || p._coarseAlive !== p.alive) {
          const G = new Map();
          for (const vx of p.vox) {
            if (!vx.alive || !vx.exposed) continue;
            const key = ((vx.i >> 1) * 4096 + (vx.j >> 1)) * 4096 + (vx.k >> 1);
            let g = G.get(key);
            if (!g) { g = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, e: 0, n: 0 }; G.set(key, g); }
            g.x += vx.x; g.y += vx.y; g.z += vx.z; g.r += vx.r; g.g += vx.g; g.b += vx.b; g.e = Math.max(g.e, vx.e); g.n++;
          }
          p.coarse = [];
          for (const g of G.values()) p.coarse.push({ x: g.x / g.n, y: g.y / g.n, z: g.z / g.n, r: g.r / g.n, g: g.g / g.n, b: g.b / g.n, e: g.e });
          p._coarseAlive = p.alive;
        }
        const q = p.q;
        for (const c of p.coarse) {
          M.qRot(q, c.x * s, c.y * s, c.z * s, tmp);
          const x = p.wp[0] + tmp[0], y = p.wp[1] + tmp[1], z = p.wp[2] + tmp[2];
          if (f > 0) batch.rbox(x, y, z, sz, sz, sz, q, M.lerp(c.r, 1, f), M.lerp(c.g, 0.85, f), M.lerp(c.b, 0.85, f), c.e);
          else batch.rbox(x, y, z, sz, sz, sz, q, c.r, c.g, c.b, c.e);
        }
      }
    }

    rayHit(ox, oy, oz, dx, dy, dz, maxT) {
      this.ensureSurf();
      const Lx = this.cx - ox, Ly = this.cy - oy, Lz = this.cz - oz;
      const tca = Lx * dx + Ly * dy + Lz * dz;
      const pad = this.hitPad || 0, R = this.radius + pad;   // hitPad: margen extra para dianas pequeñas (cuervo)
      if (tca < -R) return null;
      const d2 = Lx * Lx + Ly * Ly + Lz * Lz - tca * tca;
      if (d2 > R * R) return null;
      const r = this.v * 0.6 + pad, r2 = r * r;
      let best = null, bestT = maxT;
      for (const p of this.parts) {
        if (p.detached || p.hidden) continue;
        for (const vx of p.vox) {
          if (!vx.alive || !vx.exposed) continue;
          const lx = vx.wx - ox, ly = vx.wy - oy, lz = vx.wz - oz;
          const tc = lx * dx + ly * dy + lz * dz;
          if (tc < 0 || tc - r > bestT) continue;
          const dd = lx * lx + ly * ly + lz * lz - tc * tc;
          if (dd > r2) continue;
          const t = tc - Math.sqrt(r2 - dd);
          if (t < bestT) { bestT = t; best = { t, part: p, vox: vx }; }
        }
      }
      return best;
    }

    carveTunnel(ox, oy, oz, dx, dy, dz, entryT, radius, particles, maxDebris = 26) {
      this.ensureSurf();
      this.ensureAll();
      const removed = {};
      let debris = 0;
      const tStart = entryT - radius * 1.5;
      for (const p of this.parts) {
        if (p.detached) continue;
        let n = 0;
        for (const vx of p.vox) {
          if (!vx.alive) continue;
          const lx = vx.wx - ox, ly = vx.wy - oy, lz = vx.wz - oz;
          const t = lx * dx + ly * dy + lz * dz;
          if (t < tStart) continue;
          const perp2 = lx * lx + ly * ly + lz * lz - t * t;
          const depth = t - entryT;
          const rr = radius * (depth < radius ? 1.2 : 1 + Math.min(0.5, depth * 1.2));
          if (perp2 > rr * rr) continue;
          vx.alive = false; n++;
          if (particles && debris < maxDebris && Math.random() < 0.6) {
            debris++;
            const sp = M.rand(2, 7);
            particles.spawn(vx.wx, vx.wy, vx.wz,
              dx * sp + M.rand(-1.5, 1.5), dy * sp + M.rand(0, 2.5), dz * sp + M.rand(-1.5, 1.5),
              vx.r, vx.g, vx.b, this.v * M.rand(0.7, 1.1), M.rand(3, 6), 0);
          }
        }
        if (n) { p.alive -= n; removed[p.name] = n; }
      }
      return removed;
    }

    // Tajo de cuchillo: corte a lo largo de un segmento (eje a) y poco profundo (dirección d)
    carveSlash(px, py, pz, ax, ay, az, dx, dy, dz, halfLen, radius, depth, particles) {
      this.ensureSurf();
      this.ensureAll();
      const removed = {};
      let debris = 0;
      for (const p of this.parts) {
        if (p.detached) continue;
        let n = 0;
        for (const vx of p.vox) {
          if (!vx.alive) continue;
          const rx = vx.wx - px, ry = vx.wy - py, rz = vx.wz - pz;
          const t = rx * dx + ry * dy + rz * dz;
          if (t < -radius || t > depth) continue;
          let sAx = rx * ax + ry * ay + rz * az;
          sAx = Math.max(-halfLen, Math.min(halfLen, sAx));
          const qx = rx - ax * sAx, qy = ry - ay * sAx, qz = rz - az * sAx;
          // distancia al segmento, sin contar la componente de profundidad
          const pd = qx * dx + qy * dy + qz * dz;
          const ex = qx - dx * pd, ey = qy - dy * pd, ez = qz - dz * pd;
          if (ex * ex + ey * ey + ez * ez > radius * radius) continue;
          vx.alive = false; n++;
          if (particles && debris < 18 && Math.random() < 0.7) {
            debris++;
            particles.spawn(vx.wx, vx.wy, vx.wz, ax * M.rand(-3, 3) + dx * 1.5, M.rand(0.5, 3), az * M.rand(-3, 3) + dz * 1.5,
              vx.r, vx.g, vx.b, this.v * M.rand(0.7, 1.1), M.rand(3, 6), 0);
          }
        }
        if (n) { p.alive -= n; removed[p.name] = n; }
      }
      return removed;
    }

    // Vóxel vivo más cercano a un punto (para explosiones)
    nearestVoxel(x, y, z) {
      this.ensureSurf();
      this.ensureAll();
      let best = null, bd = Infinity;
      for (const p of this.parts) {
        if (p.detached) continue;
        for (const v of p.vox) {
          if (!v.alive || !v.exposed) continue;
          const d = (v.wx - x) ** 2 + (v.wy - y) ** 2 + (v.wz - z) ** 2;
          if (d < bd) { bd = d; best = v; }
        }
      }
      return best;
    }

    // Corte genérico según el tipo de golpe
    cutFor(hit, dmg, ray, opts, destruction, particles, radiusK = 1.1) {
      this.ensureSurf();
      if (opts && opts.blunt) return this.carveSphere(hit.vox.wx, hit.vox.wy, hit.vox.wz, this.v * 3.4, particles, ray.dx, ray.dy, ray.dz);
      if (opts && opts.slash) {
        const a = opts.slash;
        return this.carveSlash(hit.vox.wx, hit.vox.wy, hit.vox.wz, a[0], a[1], a[2], ray.dx, ray.dy, ray.dz, 0.22, this.v * 1.4, 0.16, particles);
      }
      const radius = this.v * (radiusK + dmg / 30) * destruction;
      return this.carveTunnel(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, hit.t, radius, particles);
    }

    carveSphere(px, py, pz, radius, particles, dirx, diry, dirz, maxDebris = 14) {
      this.ensureSurf();
      this.ensureAll();
      const r2 = radius * radius;
      const removed = {};
      let debris = 0;
      for (const p of this.parts) {
        if (p.detached) continue;
        let n = 0;
        for (const vx of p.vox) {
          if (!vx.alive) continue;
          const dx = vx.wx - px, dy = vx.wy - py, dz = vx.wz - pz;
          if (dx * dx + dy * dy + dz * dz > r2) continue;
          vx.alive = false; n++;
          if (particles && debris < maxDebris) {
            debris++;
            particles.spawn(vx.wx, vx.wy, vx.wz, dirx * M.rand(1, 4) + M.rand(-2, 2), diry * 2 + M.rand(0.5, 4), dirz * M.rand(1, 4) + M.rand(-2, 2),
              vx.r, vx.g, vx.b, this.v * M.rand(0.7, 1), M.rand(3, 6), 0);
          }
        }
        if (n) { p.alive -= n; removed[p.name] = n; }
      }
      return removed;
    }

    // Tras un corte: recalcula superficie y separa lo que haya quedado suelto.
    // Devuelve { nombre: 'severed' | 'detached' | 'halved' }.
    afterCarve(removed, gibs, vx, vy, vz) {
      this.ensureAll();
      const res = {};
      // el torso primero: si se parte, arrastra brazos y cabeza
      const names = Object.keys(removed).sort((a, b) => (a === 'torso' ? -1 : b === 'torso' ? 1 : 0));
      for (const name of names) {
        const p = this.byName[name];
        if (!p || p.detached) continue;
        if (p.alive <= 0) { p.detached = true; res[name] = 'detached'; continue; }
        updateExposure(p);
        if (!p.attach || p.noBreak) continue;
        const [w, h, d] = p.dims;
        const jRoot = p.attach === 'top' ? h - 1 : 0;
        const seen = new Uint8Array(p.vox.length);
        const stack = [];
        for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) {
          const idx = partIndex(p, i, jRoot, k);
          if (p.vox[idx].alive) { seen[idx] = 1; stack.push(idx); }
        }
        while (stack.length) {
          const c = stack.pop();
          const v = p.vox[c];
          for (const nb of NB) {
            const ni = partIndex(p, v.i + nb[0], v.j + nb[1], v.k + nb[2]);
            if (ni >= 0 && !seen[ni] && p.vox[ni].alive) { seen[ni] = 1; stack.push(ni); }
          }
        }
        const loose = [];
        let topLoose = false;
        for (let i = 0; i < p.vox.length; i++) if (p.vox[i].alive && !seen[i]) {
          loose.push(p.vox[i]);
          if (p.vox[i].j >= h - 2) topLoose = true;
        }
        if (!loose.length) continue;
        const items = loose.map((v) => ({ v, pid: 0 }));
        let halved = false;
        if (name === 'torso' && topLoose) {
          // mitad superior: se lleva brazos y cabeza
          halved = true;
          let pid = 1;
          for (const c of this.parts) {
            if (c.parent !== 'torso' || c.detached) continue;
            for (const v of c.vox) if (v.alive) items.push({ v, pid });
            c.detached = true; c.alive = 0;
            res[c.name] = 'detached';
            pid++;
          }
        }
        const g = Gib.fromItems(items, p.q, this.v, vx + M.rand(-0.5, 0.5), vy, vz + M.rand(-0.5, 0.5), halved);
        if (g && gibs) gibs.push(g);
        for (const v of loose) v.alive = false;
        p.alive -= loose.length;
        if (p.alive <= 0) { p.detached = true; res[name] = 'detached'; }
        else { res[name] = halved ? 'halved' : 'severed'; updateExposure(p); }
        p.severed = true;
      }
      this.cascade(gibs, res);
      return res;
    }

    ratio(name) {
      const p = this.byName[name];
      if (!p || p.detached) return 0;
      return p.alive / p.total;
    }

    broken(name, lim = 0.5) {
      const p = this.byName[name];
      return !p || p.detached || p.severed || p.alive / p.total < lim;
    }

    detach(name, gibs, vx, vy, vz) {
      if (VX.onLimb && /^(arm|leg|head)/.test(name) && this.byName[name] && !this.byName[name].detached) VX.onLimb(this, name);
      const p = this.byName[name];
      if (!p || p.detached) return null;
      this.ensureAll();
      p.detached = true;
      const items = p.vox.filter((x) => x.alive).map((v) => ({ v, pid: 0 }));
      const g = Gib.fromItems(items, p.q, this.v, vx, vy, vz);
      if (g && gibs) gibs.push(g);
      this.cascade(gibs);
      return g;
    }

    // Todas las partes pasan a ser trozos físicos (se desvanecen con el tiempo)
    collapse(gibs, dirx, dirz, force = 2) {
      this.ensureSurf();
      for (const p of this.parts) {
        if (p.detached) continue;
        const ox = p.wp[0] - this.x, oz = p.wp[2] - this.z;
        const l = Math.hypot(ox, oz) || 1;
        this.detach(p.name, gibs,
          dirx * force + (ox / l) * force * 0.4 + M.rand(-0.6, 0.6),
          M.rand(0.5, 2.5),
          dirz * force + (oz / l) * force * 0.4 + M.rand(-0.6, 0.6));
      }
    }

    // Vida total de vóxeles (para saber si queda algo que dibujar)
    aliveCount() { let n = 0; for (const p of this.parts) if (!p.detached) n += p.alive; return n; }
  }

  // Trozo físico suelto
  class Gib {
    static fromItems(items, q, v, vx, vy, vz, big = false) {
      if (!items.length) return null;
      let cx = 0, cy = 0, cz = 0;
      for (const { v: a } of items) { cx += a.wx; cy += a.wy; cz += a.wz; }
      cx /= items.length; cy /= items.length; cz /= items.length;
      const key = (pid, i, j, k) => ((pid * 64 + i + 1) * 64 + j + 1) * 64 + k + 1;
      const keys = new Set(items.map(({ v: a, pid }) => key(pid, a.i, a.j, a.k)));
      const g = new Gib();
      g.x = cx; g.y = cy; g.z = cz;
      g.vx = vx; g.vy = vy; g.vz = vz;
      g.baseQ = q.slice();
      g.q = [0, 0, 0, 1];
      g.axis = M.qNorm([M.rand(-1, 1), M.rand(-0.3, 0.3), M.rand(-1, 1), 0]);
      g.spin = (big ? M.rand(1.5, 3) : M.rand(3, 8)) / Math.max(1, Math.sqrt(items.length / 80));
      g.v = v;
      g.vox = [];
      let rad = 0;
      for (const { v: a, pid } of items) {
        let ex = false;
        for (const n of NB) if (!keys.has(key(pid, a.i + n[0], a.j + n[1], a.k + n[2]))) { ex = true; break; }
        if (!ex) continue;
        const o = { x: a.wx - cx, y: a.wy - cy, z: a.wz - cz, r: a.r, g: a.g, b: a.b, e: a.e };
        rad = Math.max(rad, Math.hypot(o.x, o.y, o.z));
        g.vox.push(o);
      }
      g.rad = rad;
      g.life = M.rand(10, 15);
      g.resting = false;
      return g;
    }

    lowest() {
      let m = 0;
      const step = this.vox.length > 200 ? 3 : 1;
      for (let i = 0; i < this.vox.length; i += step) {
        const a = this.vox[i];
        M.qRot(this.q, a.x, a.y, a.z, tmp);
        if (tmp[1] < m) m = tmp[1];
      }
      return -m + this.v * 0.5;
    }

    update(dt, world) {
      this.life -= dt;
      if (this.resting) return;
      this.vy -= 18 * dt;
      const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
      if (!world.isSolidAt(nx, this.y, this.z)) this.x = nx; else this.vx *= -0.35;
      if (!world.isSolidAt(this.x, this.y, nz)) this.z = nz; else this.vz *= -0.35;
      this.y += this.vy * dt;
      if (this.spin > 0.05) {
        const dq = M.qAxis(this.axis[0], this.axis[1], this.axis[2], this.spin * dt);
        this.q = M.qNorm(M.qMul(dq, this.q));
      }
      const ground = world.groundAt(this.x, this.z);
      if (this.y < ground + this.rad + 0.05) {
        const low = ground + this.lowest();
        if (this.y < low) {
          this.y = low;
          if (this.vy < -2.5) { this.vy *= -0.25; this.spin *= 0.5; }
          else { this.vy = 0; this.spin *= 0.75; }
          this.vx *= 0.7; this.vz *= 0.7;
          if (Math.abs(this.vx) + Math.abs(this.vz) < 0.05 && this.spin < 0.1 && this.vy === 0) this.resting = true;
        }
      }
    }

    render(batch) {
      const fade = Math.min(1, this.life / 1.5);
      const s = this.v * (0.4 + 0.6 * fade);
      const q = M.qMul(this.q, this.baseQ);
      const sink = (1 - fade) * 0.15;
      for (const a of this.vox) {
        M.qRot(this.q, a.x, a.y, a.z, tmp);
        batch.rbox(this.x + tmp[0], this.y + tmp[1] - sink, this.z + tmp[2], s, s, s, q, a.r, a.g, a.b, a.e);
      }
    }
  }

  // Cadáver: el cuerpo cae al suelo con una animación y se puede seguir destrozando
  class Corpse {
    constructor(body, dir, opts = {}) {
      this.body = body;
      this.t = 0;
      this.life = opts.life || 16;
      this.heavy = !!opts.heavy;
      const b = body;
      this.p0 = b.pitch; this.y0 = b.yOff; this.r0 = b.roll;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      // cae hacia donde le empuja la bala (adelante si le disparan por la espalda)
      const s = (dir[0] * fx + dir[2] * fz) >= 0 ? 1 : -1;
      this.target = b.pitch > 1 ? b.pitch : 1.52 * s;
      this.rollT = M.rand(-0.35, 0.35);
      this.yT = Math.max(this.y0, b.depth * 0.5);
      this.dur = (this.heavy ? 0.95 : 0.6) + M.rand(0, 0.2);
      this.landed = false;
      this.bounce = 0;
      this.arms = [M.rand(-3, -0.5), M.rand(-3, -0.5)];
      this.isCorpse = true;
    }

    update(dt, game) {
      this.t += dt;
      this.life -= dt;
      const b = this.body;
      if (!this.landed || this.bounce > 0.001 || this.life < 2) {
        const k = Math.min(1, this.t / this.dur);
        const e = k * k * (1.6 - 0.6 * k);            // acelera como una caída
        if (k >= 1 && !this.landed) {
          this.landed = true;
          this.bounce = 0.12;
          game.shake(this.heavy ? 0.8 : 0.08);
          const n = this.heavy ? 40 : 10;
          for (let i = 0; i < n; i++)
            game.particles.spawn(b.x + M.rand(-0.6, 0.6), b.y + 0.05, b.z + M.rand(-0.6, 0.6), M.rand(-1.5, 1.5), M.rand(0.5, 2), M.rand(-1.5, 1.5), 0.25, 0.22, 0.22, 0.05, 0.8);
          if (this.heavy) VX.Audio.slam(); else VX.Audio.punch();
        }
        if (this.landed) this.bounce *= Math.pow(0.002, dt);
        const bounce = this.landed ? Math.sin(this.t * 18) * this.bounce : 0;
        b.pitch = this.p0 + (this.target - this.p0) * e - bounce * Math.sign(this.target);
        b.roll = this.r0 + (this.rollT - this.r0) * e;
        b.yOff = this.y0 + (this.yT - this.y0) * e;
        const P_ = b.byName;
        // brazos y cabeza se descuelgan
        if (P_.armL && !P_.armL.detached) P_.armL.ax = M.lerp(P_.armL.ax, this.arms[0], Math.min(1, dt * 4));
        if (P_.armR && !P_.armR.detached) P_.armR.ax = M.lerp(P_.armR.ax, this.arms[1], Math.min(1, dt * 4));
        if (P_.head && !P_.head.detached) P_.head.ax = M.lerp(P_.head.ax, -0.4 * Math.sign(this.target), Math.min(1, dt * 5));
        if (P_.legL && !P_.legL.detached) P_.legL.ax = M.lerp(P_.legL.ax, 0.15, Math.min(1, dt * 4));
        if (P_.legR && !P_.legR.detached) P_.legR.ax = M.lerp(P_.legR.ax, -0.1, Math.min(1, dt * 4));
        if (this.life < 2) b.yOff -= (2 - this.life) * 0.004; // se hunde antes de desaparecer
        b.computeWorld();
      }
    }

    hit(hit, dmg, ray, game, opts) {
      const b = this.body;
      const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles);
      game.particles.blood(hit.vox.wx, hit.vox.wy, hit.vox.wz, ray.dx, 0.5, ray.dz, 6);
      b.afterCarve(removed, game.gibs, ray.dx * 2, 1.5, ray.dz * 2);
      VX.Audio.flesh();
      if (b.aliveCount() < 20) this.life = Math.min(this.life, 0.5);
      return false;
    }

    blast(x, y, z, R, dmg, game) {
      const b = this.body;
      const v = b.nearestVoxel(x, y, z);
      if (!v) return;
      const dx = v.wx - x, dz = v.wz - z, l = Math.hypot(dx, dz) || 1;
      const removed = b.carveSphere(v.wx, v.wy, v.wz, 0.2 + dmg / 300, game.particles, dx / l, 0.5, dz / l);
      b.afterCarve(removed, game.gibs, (dx / l) * 4, 3, (dz / l) * 4);
      if (b.aliveCount() < 20) this.life = Math.min(this.life, 0.5);
    }

    render(batch) { this.body.render(batch); }
  }

  VX.VoxelBody = VoxelBody;
  VX.Gib = Gib;
  VX.Corpse = Corpse;
  VX.updateExposure = updateExposure;
})();
