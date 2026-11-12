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
      this.dashMax = 1; this.dashStock = 1; this.dashMul = 1; this.dashGap = 0;
      this.dashX = 0; this.dashZ = 0;
    }

    collides(x, y, z, world) {
      // mapas grandes: techo invisible a la altura de la rejilla (no se puede subir por encima de los muros)
      const cr = world.rooms.length === 1 && world.rooms[0].big ? world.rooms[0] : null;
      if (cr && y + this.height > cr.H * VX.S - 0.05) return true;
      const r = this.radius;
      return world.boxCollides(x - r, y, z - r, x + r, y + this.height, z + r);
    }

    update(dt, game) {
      const I = VX.Input, world = game.world;
      // --- Mirar ---
      this.yaw -= I.dx * I.sensitivity;
      this.pitch -= I.dy * I.sensitivity * (I.invertY ? -1 : 1);
      this.pitch = M.clamp(this.pitch, -1.5, 1.5);

      if (I.wasPressed(VX.Settings.key('flashlight'))) { this.flashlight = !this.flashlight; VX.Audio.click(); }

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
      const shift = I.isDown('ShiftLeft') || I.isDown('ShiftRight');
      const sprint = VX.Settings && VX.Settings.data.autoRun ? !shift : shift;
      const wet = game.waterAt && game.waterAt(this.x, this.z) && this.y < 0.4;
      const spd = this.speed * (sprint && fz > 0 ? 1.45 : 1) * (wet ? 0.62 : 1);
      if (wet && Math.hypot(this.vx, this.vz) > 1 && Math.random() < 0.3) game.particles.spawn(this.x + M.rand(-0.3, 0.3), 0.12, this.z + M.rand(-0.3, 0.3), M.rand(-0.6, 0.6), M.rand(0.8, 1.6), M.rand(-0.6, 0.6), 0.45, 0.55, 0.6, 0.03, 0.6);
      const accel = this.onGround ? 14 : 4;
      if (!(this.dashT > 0)) {
        this.vx = M.lerp(this.vx, wx * spd, Math.min(1, accel * dt));
        this.vz = M.lerp(this.vz, wz * spd, Math.min(1, accel * dt));
      }

      // esquiva / deslizamiento: [C] o clic derecho
      // cargas de esquiva: se recargan de una en una
      const cdFull = this.dashCdBase * this.dashMul;
      if (this.dashStock < this.dashMax) {
        this.dashCd -= dt;
        if (this.dashCd <= 0) { this.dashStock++; this.dashCd = this.dashStock < this.dashMax ? cdFull : 0; }
      }
      this.dashGap -= dt;
      if ((I.wasPressed('KeyC') || I.rightClicked) && this.dashStock > 0 && this.dashGap <= 0 && this.dashT <= 0) {
        if (this.dashStock === this.dashMax) this.dashCd = cdFull;
        this.dashStock--; this.dashGap = 0.22;
        let dx = wx, dz = wz;
        if (!l) { dx = sy; dz = cy; }
        this.dashX = dx; this.dashZ = dz;
        this.dashT = 0.2;
        if (game.weapon.mods.dashPush) for (const e of game.enemies) {
          const dx = e.x - this.x, dz = e.z - this.z, d = Math.hypot(dx, dz);
          if (!e.dead && !e.isBoss && d < 2.2) { e.kx = (e.kx || 0) + dx / (d || 1) * 9; e.kz = (e.kz || 0) + dz / (d || 1) * 9; }
        }
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
        if (this.stepAcc > 2.0) { this.stepAcc = 0; VX.Audio.step(game.surfaceAt ? game.surfaceAt(this.x, this.y, this.z) : 'stone'); }
      }
      if (!(this.dashT > 0)) this.eyeOffset = M.lerp(this.eyeOffset, 0, Math.min(1, dt * 12));
      this.recoilPitch = M.lerp(this.recoilPitch, 0, Math.min(1, dt * 10));
      this.hurtRoll = M.lerp(this.hurtRoll || 0, 0, Math.min(1, dt * 7));
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
      const k = Math.min(1, amount / 30);
      game.shake(0.3 + amount / 45);
      VX.Audio.hurt(k);
      game.hud.flashDamage(Math.min(1, 0.45 + amount / 35));
      // sacudida de cámara: la cabeza se va hacia atrás y se ladea
      this.recoilPitch += 0.05 + k * 0.08;
      this.hurtRoll = (Math.random() < 0.5 ? -1 : 1) * (0.05 + k * 0.08);
      this.eyeOffset -= 0.04 + k * 0.06;
      game.hitStop = Math.max(game.hitStop || 0, 0.035 + k * 0.05);
      let ang = null;
      if (fromX !== undefined) {
        const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
        this.knock((dx / d) * 4, (dz / d) * 4);
        // dirección del golpe respecto a donde miras (0 = delante, + = derecha)
        const sx = -dx / d, sz = -dz / d;
        const fwd = sx * Math.sin(this.yaw) + sz * Math.cos(this.yaw);
        const rgt = sx * -Math.cos(this.yaw) + sz * Math.sin(this.yaw);
        ang = Math.atan2(rgt, fwd);
        if (this.hurtRoll) this.hurtRoll = Math.abs(this.hurtRoll) * (rgt > 0 ? 1 : -1);
      }
      game.hud.hurt(amount, ang, this.hp / this.maxHp);
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
