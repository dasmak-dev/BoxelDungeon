// Jugador en primera persona: movimiento, colisiones y vida.
(function () {
  const M = VX.M;
  const S = VX.S;

  class Player {
    constructor() { this.reset(); }

    reset() {
      this.x = 0; this.y = 0; this.z = 1.5;
      this.vx = 0; this.vy = 0; this.vz = 0;
      this.yaw = 0; this.pitch = 0;
      this.maxHp = 100; this.hp = 100;
      this.speed = 5.0;
      this.radius = 0.3; this.height = 1.75; this.eye = 1.6;
      this.onGround = false;
      this.invuln = 0;
      this.walkT = 0;
      this.stepAcc = 0;
      this.eyeOffset = 0;
      this.recoilPitch = 0;
      this.hurtT = 0;
      this.magnet = 0;
      this.flashlight = true;
      this.dead = false;
      this.knockX = 0; this.knockZ = 0;
      this.dashT = 0; this.dashCd = 0; this.dashCdBase = this.dashCdBase || 0.85;
      this.dashX = 0; this.dashZ = 0;
    }

    collides(x, y, z, world) {
      const r = this.radius;
      return world.boxCollides(x - r, y, z - r, x + r, y + this.height, z + r);
    }

    update(dt, game) {
      const I = VX.Input, world = game.world;
      // --- Mirar ---
      this.yaw -= I.dx * I.sensitivity;
      this.pitch -= I.dy * I.sensitivity * (I.invertY ? -1 : 1);
      this.pitch = M.clamp(this.pitch, -1.5, 1.5);

      if (I.wasPressed('KeyF')) { this.flashlight = !this.flashlight; VX.Audio.click(); }

      // --- Moverse ---
      let fx = 0, fz = 0;
      if (I.isDown('KeyW') || I.isDown('ArrowUp')) fz += 1;
      if (I.isDown('KeyS') || I.isDown('ArrowDown')) fz -= 1;
      if (I.isDown('KeyA') || I.isDown('ArrowLeft')) fx -= 1;
      if (I.isDown('KeyD') || I.isDown('ArrowRight')) fx += 1;
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      // adelante = (sy, cy); derecha = (-cy, sy)
      let wx = sy * fz - cy * fx, wz = cy * fz + sy * fx;
      const l = Math.hypot(wx, wz);
      if (l > 0) { wx /= l; wz /= l; }
      const sprint = I.isDown('ShiftLeft') || I.isDown('ShiftRight');
      const spd = this.speed * (sprint && fz > 0 ? 1.45 : 1);
      const accel = this.onGround ? 14 : 4;
      if (!(this.dashT > 0)) {
        this.vx = M.lerp(this.vx, wx * spd, Math.min(1, accel * dt));
        this.vz = M.lerp(this.vz, wz * spd, Math.min(1, accel * dt));
      }

      // esquiva / deslizamiento: [C] o clic derecho
      this.dashCd -= dt;
      if ((I.wasPressed('KeyC') || I.rightClicked) && this.dashCd <= 0 && this.dashT <= 0) {
        let dx = wx, dz = wz;
        if (!l) { dx = sy; dz = cy; }
        this.dashX = dx; this.dashZ = dz;
        this.dashT = 0.2; this.dashCd = this.dashCdBase;
        this.invuln = Math.max(this.invuln, 0.3);
        this.eyeOffset -= 0.25;
        VX.Audio.dash();
        for (let i = 0; i < 6; i++) game.particles.spawn(this.x + M.rand(-0.2, 0.2), this.y + 0.05, this.z + M.rand(-0.2, 0.2), -dx * 2 + M.rand(-1, 1), M.rand(0.3, 1.2), -dz * 2 + M.rand(-1, 1), 0.3, 0.27, 0.25, 0.05, 0.4);
      }
      if (this.dashT > 0) {
        this.dashT -= dt;
        const k = 16 * (0.45 + 0.55 * Math.max(0, this.dashT / 0.2));
        this.vx = this.dashX * k; this.vz = this.dashZ * k;
        this.eyeOffset = Math.min(this.eyeOffset, -0.2);
        if (this.dashT <= 0) this.dashT = 0;
      }

      if (this.onGround && I.isDown('Space')) { this.vy = 6.4; this.onGround = false; }
      this.vy -= 19 * dt;
      if (this.vy < -30) this.vy = -30;

      // empuje recibido
      const kx = this.knockX * dt, kz = this.knockZ * dt;
      this.knockX *= Math.pow(0.01, dt); this.knockZ *= Math.pow(0.01, dt);

      this.moveAxis(0, this.vx * dt + kx, world);
      this.moveAxis(2, this.vz * dt + kz, world);
      this.moveAxis(1, this.vy * dt, world);

      // pasos y balanceo
      const hs = Math.hypot(this.vx, this.vz);
      if (this.onGround && hs > 0.5) {
        this.walkT += dt * hs * 1.9;
        this.stepAcc += dt * hs;
        if (this.stepAcc > 2.0) { this.stepAcc = 0; VX.Audio.step(); }
      }
      if (!(this.dashT > 0)) this.eyeOffset = M.lerp(this.eyeOffset, 0, Math.min(1, dt * 12));
      this.recoilPitch = M.lerp(this.recoilPitch, 0, Math.min(1, dt * 10));
      this.invuln -= dt;
      this.hurtT = Math.max(0, this.hurtT - dt);
    }

    moveAxis(axis, amount, world) {
      if (amount === 0) return;
      const steps = Math.ceil(Math.abs(amount) / 0.1);
      const d = amount / steps;
      for (let s = 0; s < steps; s++) {
        if (axis === 1) {
          const ny = this.y + d;
          if (!this.collides(this.x, ny, this.z, world)) { this.y = ny; this.onGround = false; continue; }
          if (d < 0) {
            // apoyar sobre el bloque
            const top = (Math.floor(ny / S) + 1) * S;
            this.y = this.collides(this.x, top, this.z, world) ? this.y : top;
            this.onGround = true;
          }
          this.vy = 0;
          return;
        }
        const nx = axis === 0 ? this.x + d : this.x;
        const nz = axis === 2 ? this.z + d : this.z;
        if (!this.collides(nx, this.y, nz, world)) { this.x = nx; this.z = nz; continue; }
        // subir escalón de un vóxel
        if (this.onGround) {
          let stepped = false;
          for (let k = 1; k <= 2; k++) {
            if (!this.collides(nx, this.y + S * k + 0.01, nz, world) && !this.collides(this.x, this.y + S * k + 0.01, this.z, world)) {
              this.y += S * k + 0.01; this.eyeOffset -= S * k;
              this.x = nx; this.z = nz; stepped = true; break;
            }
          }
          if (stepped) continue;
        }
        if (axis === 0) this.vx = 0; else this.vz = 0;
        return;
      }
    }

    knock(kx, kz, up = 0) {
      this.knockX += kx; this.knockZ += kz;
      if (up) { this.vy = Math.max(this.vy, up); this.onGround = false; }
    }

    damage(amount, fromX, fromZ, game) {
      if (this.dead || this.invuln > 0) return;
      this.hp -= amount;
      if (game.onPlayerHurt) game.onPlayerHurt();
      this.invuln = 0.25;
      this.hurtT = 0.5;
      game.shake(0.25 + amount / 60);
      VX.Audio.hurt();
      game.hud.flashDamage(Math.min(1, 0.4 + amount / 40));
      if (fromX !== undefined) {
        const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
        this.knock((dx / d) * 4, (dz / d) * 4);
      }
      if (this.hp <= 0) {
        // «Segunda oportunidad» del Santuario
        if (game.revives > 0) {
          game.revives--;
          this.hp = Math.round(this.maxHp * 0.5); this.invuln = 2.5;
          game.hud.banner('¡SEGUNDA OPORTUNIDAD!', 'Tu alma se niega a caer', 2.5);
          VX.Audio.phase(); game.shake(0.6);
          return;
        }
        this.hp = 0; this.dead = true; game.gameOver();
      }
    }

    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

    eyeX() { return this.x; }
    eyeY() { return this.y + this.eye + this.eyeOffset; }
    eyeZ() { return this.z; }
  }

  VX.Player = Player;
})();
