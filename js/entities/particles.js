// Sistema de partículas vóxel (escombros, sangre, chispas).
(function () {
  const CAP = 3500;

  class Particles {
    constructor() {
      this.n = 0;
      this.next = 0;
      this.p = new Float32Array(CAP * 3);
      this.v = new Float32Array(CAP * 3);
      this.c = new Float32Array(CAP * 4);
      this.size = new Float32Array(CAP);
      this.life = new Float32Array(CAP);
      this.maxLife = new Float32Array(CAP);
      this.rot = new Float32Array(CAP);
      this.flags = new Uint8Array(CAP); // 1 = sin gravedad
      this.alive = new Uint8Array(CAP);
    }

    clear() { this.alive.fill(0); }

    spawn(x, y, z, vx, vy, vz, r, g, b, size, life, emissive = 0, noGravity = 0) {
      const i = this.next;
      this.next = (this.next + 1) % CAP;
      this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
      this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
      this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = b; this.c[i * 4 + 3] = emissive;
      this.size[i] = size; this.life[i] = life; this.maxLife[i] = life;
      this.rot[i] = Math.random() * 6;
      this.flags[i] = noGravity;
      this.alive[i] = 1;
    }

    // Chispas al impactar en pared
    sparks(x, y, z, nx, ny, nz, n = 6) {
      for (let k = 0; k < n; k++) {
        this.spawn(x, y, z,
          nx * 3 + VX.M.rand(-2.5, 2.5), ny * 3 + VX.M.rand(-1, 3), nz * 3 + VX.M.rand(-2.5, 2.5),
          1, 0.8, 0.35, VX.M.rand(0.03, 0.06), VX.M.rand(0.15, 0.35), 1);
      }
    }

    blood(x, y, z, dx, dy, dz, n = 8) {
      for (let k = 0; k < n; k++) {
        const s = VX.M.rand(0.5, 1);
        this.spawn(x, y, z,
          dx * 3 + VX.M.rand(-2, 2), dy * 2 + VX.M.rand(0, 3), dz * 3 + VX.M.rand(-2, 2),
          0.5 * s, 0.03, 0.04, VX.M.rand(0.04, 0.09), VX.M.rand(2, 5), 0, 2);
      }
    }

    update(dt, world) {
      const p = this.p, v = this.v;
      for (let i = 0; i < CAP; i++) {
        if (!this.alive[i]) continue;
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.alive[i] = 0; continue; }
        const o = i * 3;
        if (!(this.flags[i] & 1)) v[o + 1] -= 18 * dt;
        p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt;
        const half = this.size[i] * 0.5;
        if (p[o + 1] < half) {
          if ((this.flags[i] & 2) && this.onLand) { this.flags[i] &= ~2; this.onLand(p[o], 0, p[o + 2], this.size[i]); }
          p[o + 1] = half;
          if (v[o + 1] < -2) v[o + 1] *= -0.3; else v[o + 1] = 0;
          v[o] *= 0.7; v[o + 2] *= 0.7;
        } else if (!(this.flags[i] & 1) && (v[o] || v[o + 1] || v[o + 2]) && world.isSolidVisibleAt(p[o], p[o + 1] - half, p[o + 2])) {
          // choca con un bloque (relieve, cajas, paredes)
          const S = VX.S;
          const top = (Math.floor((p[o + 1] - half) / S) + 1) * S;
          if (v[o + 1] <= 0 && top - (p[o + 1] - half) < 0.12) {
            if ((this.flags[i] & 2) && this.onLand) { this.flags[i] &= ~2; this.onLand(p[o], top, p[o + 2], this.size[i]); }
            p[o + 1] = top + half;
            if (v[o + 1] < -2) v[o + 1] *= -0.3; else v[o + 1] = 0;
            v[o] *= 0.7; v[o + 2] *= 0.7;
            if (Math.abs(v[o]) + Math.abs(v[o + 2]) < 0.05) { v[o] = 0; v[o + 2] = 0; }
          } else {
            p[o] -= v[o] * dt; p[o + 2] -= v[o + 2] * dt;
            v[o] *= -0.3; v[o + 2] *= -0.3;
          }
        }
        // sólo gira mientras vuela; al posarse se queda plano y se desvanece pronto
        const moving = Math.abs(v[o]) + Math.abs(v[o + 1]) + Math.abs(v[o + 2]) > 0.15;
        if (moving) this.rot[i] += dt * 8;
        else if (!(this.flags[i] & 1)) {
          const r = this.rot[i], t = Math.round(r / 6.2832) * 6.2832;
          this.rot[i] = r + (t - r) * Math.min(1, dt * 12);
          if (this.life[i] > 1.2) this.life[i] = 1.2;
        }
      }
    }

    render(batch) {
      const q = [0, 0, 0, 1];
      for (let i = 0; i < CAP; i++) {
        if (!this.alive[i]) continue;
        const o = i * 3;
        const fade = Math.min(1, this.life[i] / Math.min(0.6, this.maxLife[i] * 0.5));
        const s = this.size[i] * fade;
        const a = this.rot[i];
        const sa = Math.sin(a * 0.5), ca = Math.cos(a * 0.5);
        q[0] = sa * 0.577; q[1] = sa * 0.577; q[2] = sa * 0.577; q[3] = ca;
        batch.rbox(this.p[o], this.p[o + 1], this.p[o + 2], s, s, s, q,
          this.c[i * 4], this.c[i * 4 + 1], this.c[i * 4 + 2], this.c[i * 4 + 3]);
      }
    }
  }

  VX.Particles = Particles;
})();
