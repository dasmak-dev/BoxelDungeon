// Proyectiles enemigos estilo "bullet hell": orbes, espirales, calaveras teledirigidas
// y meteoros con aviso en el suelo.
(function () {
  const M = VX.M;
  const CAP = 500;

  class Bullets {
    constructor() { this.list = []; }
    clear() { this.list = []; }

    // b: {x,y,z,vx,vy,vz, r, dmg, life, col, turn?, homing?, accel?, delay?, fall?, shootable?, hp?}
    add(b) {
      if (this.list.length >= CAP) return null;
      b.r = b.r || 0.16; b.life = b.life ?? 6; b.t = 0;
      b.col = b.col || [1, 0.3, 0.6];
      this.list.push(b);
      return b;
    }

    // Disparo de anillo/abanico desde un punto
    ring(x, y, z, n, speed, opts = {}) {
      const a0 = opts.angle || 0, gapAt = opts.gapAt, gapW = opts.gapW || 0;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        if (gapAt !== undefined) {
          let d = Math.abs(((a - gapAt) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (d < gapW) continue;
        }
        this.add({ x, y, z, vx: Math.sin(a) * speed, vy: 0, vz: Math.cos(a) * speed, ...opts.b });
      }
    }

    fan(x, y, z, aim, n, spread, speed, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = aim + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
        this.add({ x, y, z, vx: Math.sin(a) * speed, vy: opts.vy || 0, vz: Math.cos(a) * speed, ...opts.b });
      }
    }

    update(dt, game) {
      const P = game.player, W = game.world;
      const px = P.x, py = P.y + 0.9, pz = P.z;
      for (const b of this.list) {
        b.t += dt;
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.life -= dt;
        if (b.turn) {
          const c = Math.cos(b.turn * dt), s = Math.sin(b.turn * dt);
          const vx = b.vx * c + b.vz * s, vz = -b.vx * s + b.vz * c;
          b.vx = vx; b.vz = vz;
        }
        if (b.accel) { const k = 1 + b.accel * dt; b.vx *= k; b.vz *= k; }
        if (b.homing && b.t > 0.4) {
          const sp = Math.hypot(b.vx, b.vz) || 1;
          const want = Math.atan2(px - b.x, pz - b.z);
          let cur = Math.atan2(b.vx, b.vz);
          let d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          cur += M.clamp(d, -b.homing * dt, b.homing * dt);
          b.vx = Math.sin(cur) * sp; b.vz = Math.cos(cur) * sp;
          b.vy += M.clamp(py - b.y, -1, 1) * dt * 2;
          b.vy *= 0.96;
        }
        if (b.fall) b.vy -= 25 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        // contra el jugador
        const dx = b.x - px, dy = b.y - py, dz = b.z - pz;
        const hitR = b.r + 0.32;
        if (dx * dx + dz * dz < hitR * hitR && Math.abs(dy) < 0.9 + b.r && game.state === 'playing') {
          game.dmgSrc = game.boss ? 'Jefe: ' + game.boss.name : 'Un proyectil'; P.damage(b.dmg, b.x - b.vx, b.z - b.vz, game); game.dmgSrc = null;
          this.pop(b, game, false);
          continue;
        }
        if (b.life <= 0 || b.y < -0.5 || W.isSolidAt(b.x, b.y, b.z)) {
          if (b.fall) {
            // meteoro: impacto con onda
            const d = Math.hypot(px - b.x, pz - b.z);
            if (d < 1.3 && P.y < b.y + 1.5 && game.state === 'playing') { game.dmgSrc = game.boss ? 'Jefe: ' + game.boss.name : 'Un meteoro'; P.damage(b.dmg, b.x, b.z, game); game.dmgSrc = null; }
            W.damageSphere(b.x, b.y, b.z, 0.7, 60, game);
            game.shake(0.12);
            VX.Audio.crumble();
          }
          this.pop(b, game, true);
        }
      }
      this.list = VX.M.compact(this.list, (b) => !b.dead);
    }

    pop(b, game, wall) {
      b.dead = true;
      const n = wall ? 5 : 10;
      for (let i = 0; i < n; i++)
        game.particles.spawn(b.x, b.y, b.z, M.rand(-2.5, 2.5), M.rand(-1, 3), M.rand(-2.5, 2.5), b.col[0], b.col[1], b.col[2], b.r * 0.4, M.rand(0.2, 0.5), 1, 1);
    }

    // impacto de un disparo del jugador sobre proyectiles destruibles
    rayHit(ox, oy, oz, dx, dy, dz, maxT) {
      let best = null;
      for (const b of this.list) {
        if (!b.shootable || b.dead || b.delay > 0) continue;
        const lx = b.x - ox, ly = b.y - oy, lz = b.z - oz;
        const t = lx * dx + ly * dy + lz * dz;
        if (t < 0 || t > maxT) continue;
        const d2 = lx * lx + ly * ly + lz * lz - t * t;
        const r = b.r + 0.08;
        if (d2 < r * r && (!best || t < best.t)) best = { t, b };
      }
      return best;
    }

    destroy(b, game) {
      b.hp = (b.hp || 1) - 1;
      if (b.hp <= 0) { this.pop(b, game, false); VX.Audio.orb(); }
    }

    render(batch, time) {
      for (const b of this.list) {
        const c = b.col;
        if (b.delay > 0) {
          // aviso en el suelo del meteoro
          const k = 1 - b.delay / (b.delay0 || 1);
          const n = 14, R = 0.8 + (1 - k) * 0.5;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + time * 2;
            batch.box(b.x + Math.cos(a) * R, b.gy + 0.04, b.z + Math.sin(a) * R, 0.1, 0.05, 0.1, 1, 0.2, 0.1, 0.6 + k * 0.4);
          }
          continue;
        }
        const s = b.r * 1.15;
        const q = M.qAxis(0.577, 0.577, 0.577, b.t * 6);
        batch.rbox(b.x, b.y, b.z, s, s, s, q, 1, 1, 1, 1);
        const s2 = b.r * 1.55;
        batch.rbox(b.x, b.y, b.z, s2, s2, s2, M.qAxis(0, 1, 0, -b.t * 4), c[0], c[1], c[2], 0.85);
        if (b.skull) {
          batch.box(b.x, b.y + b.r * 0.2, b.z, b.r * 2.1, b.r * 0.4, b.r * 2.1, 0.1, 0, 0.15, 0);
        }
      }
    }

    // luces de los proyectiles más cercanos
    lights(out, cam) {
      const arr = this.list.filter((b) => !(b.delay > 0));
      if (!arr.length) return;
      arr.sort((a, b) => ((a.x - cam.x) ** 2 + (a.z - cam.z) ** 2) - ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2));
      for (let i = 0; i < Math.min(3, arr.length); i++) {
        const b = arr[i];
        out.push({ x: b.x, y: b.y, z: b.z, r: 4, cr: b.col[0] * 1.6, cg: b.col[1] * 1.6, cb: b.col[2] * 1.6 });
      }
    }
  }

  VX.Bullets = Bullets;
})();
