// Jefes: zombis gigantes con patrones de proyectiles (medio "bullet hell"),
// 3 fases, regeneración de carne y ataques cuerpo a cuerpo.
// Destrozarles la cabeza NO les mata: solo se mueren al quedarse sin vida.
(function () {
  const M = VX.M;
  const dirTmp = [0, 0];
  const PINK = [1, 0.25, 0.6], ORANGE = [1, 0.55, 0.12], PURPLE = [0.7, 0.3, 1], RED = [1, 0.15, 0.1];

  const BOSSES = [
    { id: 'coloso', name: 'EL COLOSO PUTREFACTO', hp: 2800, speed: 1.8, dmg: 28, col: ORANGE, summon: true,
      patterns: [['slam', 'ring', 'rocks', 'fan'], ['slam', 'ringGap', 'rocks', 'ring', 'fan'], ['slam', 'spiral', 'ringGap', 'rocks', 'rain']] },
    { id: 'carnicero', name: 'EL CARNICERO', hp: 2500, speed: 2.5, dmg: 32, col: RED, summon: false,
      patterns: [['charge', 'fan', 'burst'], ['charge', 'wall', 'fan', 'burst'], ['charge3', 'wall', 'burst', 'ringGap', 'fan']] },
    { id: 'ancestro', name: 'EL ANCESTRO HUECO', hp: 2600, speed: 1.5, dmg: 24, col: PURPLE, summon: true,
      patterns: [['spiral', 'homing', 'fan', 'blink'], ['spiral', 'rain', 'homing', 'ring', 'blink'], ['spiral2', 'rain', 'homing', 'ringGap', 'blink']] },
  ];

  class Boss {
    constructor(x, z, floor, bossNum, forceId) {
      const T = BOSSES.find((b) => b.id === forceId) || M.choice(BOSSES);
      this.T = T;
      this.name = T.name;
      this.isBoss = true;
      this.body = new VX.VoxelBody(VX.Models.humanoid(VX.Models.bossConfigs[T.id]), 1);
      const P_ = this.body.byName;
      P_.legL.noBreak = P_.legR.noBreak = P_.head.noBreak = P_.torso.noBreak = true;
      this.x = x; this.z = z; this.y = 0; this.vy = 0;
      this.maxHp = this.hp = T.hp * (1 + bossNum * 0.6) * (1 + floor * 0.04);
      this.speed = T.speed;
      this.dmg = Math.round(T.dmg * (1 + bossNum * 0.2));
      this.bulletDmg = Math.round(9 + bossNum * 3 + floor * 0.3);
      this.radius = 0.8;
      this.reach = 2.3;
      this.dead = false;
      this.phase = 0;
      this.state = 'intro'; this.stateT = 2.2;
      this.attackCd = 2;
      this.patternCd = 2.5;
      this.pattern = null;
      this.walkT = 0;
      this.kx = 0; this.kz = 0;
      this.invuln = 0;
      this.regenT = 0;
      this.body.yaw = Math.PI;
      this.cdx = 0; this.cdz = 0;
      this.lastPattern = '';
      this.charges = 0;
    }

    get muzzle() { return [this.x, this.y + this.body.height * 0.6, this.z]; }
    aimAt(P) { return Math.atan2(P.x - this.x, P.z - this.z); }

    // ---------------- Patrones ----------------
    startPattern(name) {
      this.pattern = { name, t: 0, k: 0, a: Math.random() * 6.28, n: 0 };
      this.state = 'cast';
      this.lastPattern = name;
      if (name === 'slam') { this.state = 'slamUp'; this.stateT = 0.9; VX.Audio.roar(); this.pattern = null; }
      else if (name === 'charge' || name === 'charge3') { this.state = 'chargeWind'; this.stateT = 0.7; this.charges = name === 'charge3' ? 3 : 1; this.pattern = null; VX.Audio.roar(); }
      else if (name === 'rocks') { this.state = 'throw'; this.stateT = 0.7; this.pattern = null; }
    }

    runPattern(dt, game) {
      const p = this.pattern, B = game.bullets, P = game.player;
      p.t += dt;
      const [mx, my, mz] = this.muzzle;
      const ph = this.phase, sp = 1 + ph * 0.18;
      const col = this.T.col, dmg = this.bulletDmg;
      const opts = (extra) => ({ b: { dmg, col, r: 0.17, ...extra } });
      const every = (iv) => { if (p.t >= p.k) { p.k += iv; return true; } return false; };
      const P_ = this.body.byName;
      P_.armL.ax = P_.armR.ax = -2.6 + Math.sin(p.t * 8) * 0.2;   // brazos en alto al conjurar
      switch (p.name) {
        case 'ring': {
          if (p.t > 0.5 && every(0.55) && p.n < 2 + ph) {
            B.ring(mx, this.y + 1.0, mz, 22 + ph * 6, 5 * sp, { angle: p.n * 0.13, ...opts() });
            p.n++; VX.Audio.orb();
          }
          return p.t > 0.6 + (2 + ph) * 0.55;
        }
        case 'ringGap': {
          if (p.t > 0.4 && every(0.75) && p.n < 3 + ph) {
            B.ring(mx, this.y + 1.0, mz, 40, 5.5 * sp, { angle: 0, gapAt: this.aimAt(P) + M.rand(-0.7, 0.7), gapW: 0.32, ...opts({ r: 0.15 }) });
            p.n++; VX.Audio.orb();
          }
          return p.t > 0.5 + (3 + ph) * 0.75;
        }
        case 'spiral':
        case 'spiral2': {
          const arms = p.name === 'spiral2' ? 4 : 3 + ph;
          if (every(0.085)) {
            p.a += 0.21;
            for (let i = 0; i < arms; i++) {
              const a = p.a + (i / arms) * Math.PI * 2;
              B.add({ x: mx, y: this.y + 1.1, z: mz, vx: Math.sin(a) * 4.5 * sp, vy: 0, vz: Math.cos(a) * 4.5 * sp, dmg, col, r: 0.15 });
              if (p.name === 'spiral2') {
                const b2 = -a + 0.5;
                B.add({ x: mx, y: this.y + 0.75, z: mz, vx: Math.sin(b2) * 3.6, vy: 0, vz: Math.cos(b2) * 3.6, dmg, col: PINK, r: 0.14 });
              }
            }
            if ((p.n++ & 3) === 0) VX.Audio.orb();
          }
          return p.t > 3.2 + ph * 0.6;
        }
        case 'fan': {
          if (p.t > 0.35 && every(0.4) && p.n < 3 + ph) {
            const d = Math.hypot(P.x - mx, P.z - mz) || 1;
            B.fan(mx, my, mz, this.aimAt(P), 7 + ph * 2, 1.0, 8 * sp, { vy: (P.y + 1 - my) / d * 8 * sp, ...opts() });
            p.n++; VX.Audio.orb();
          }
          return p.t > 0.5 + (3 + ph) * 0.4;
        }
        case 'burst': {
          if (p.t > 0.3 && p.t < 1.6 + ph * 0.4 && every(0.07)) {
            const a = this.aimAt(P) + M.rand(-0.08, 0.08);
            const d = Math.hypot(P.x - mx, P.z - mz) || 1;
            B.add({ x: mx, y: my, z: mz, vx: Math.sin(a) * 12, vy: (P.y + 1 - my) / d * 12, vz: Math.cos(a) * 12, dmg: dmg * 0.6, col: RED, r: 0.11 });
            if ((p.n++ & 1) === 0) VX.Audio.orb();
          }
          return p.t > 1.8 + ph * 0.4;
        }
        case 'wall': {
          if (p.t > 0.3 && every(0.9) && p.n < 3 + ph) {
            const a = this.aimAt(P), fx = Math.sin(a), fz = Math.cos(a), rx = -fz, rz = fx;
            const gap = M.rand(-4, 4), low = p.n % 2 === 1;
            for (let s = -9; s <= 9; s += 0.55) {
              if (Math.abs(s - gap) < 1.3) continue;
              B.add({ x: this.x + rx * s + fx * 1.2, y: this.y + (low ? 0.45 : 1.1), z: this.z + rz * s + fz * 1.2, vx: fx * 5.5 * sp, vy: 0, vz: fz * 5.5 * sp, dmg, col: low ? ORANGE : col, r: 0.17 });
            }
            p.n++; VX.Audio.orb();
          }
          return p.t > 0.4 + (3 + ph) * 0.9;
        }
        case 'homing': {
          if (p.t > 0.4 && every(0.35) && p.n < 4 + ph * 2) {
            const a = this.aimAt(P) + (p.n % 2 ? 1 : -1) * (0.9 + Math.random() * 0.5);
            B.add({ x: mx, y: my + 0.4, z: mz, vx: Math.sin(a) * 5, vy: 1.5, vz: Math.cos(a) * 5, dmg: dmg * 1.4, col: PURPLE, r: 0.26, homing: 1.7, life: 6, shootable: true, hp: 2, skull: true });
            p.n++; VX.Audio.orb();
          }
          return p.t > 0.6 + (4 + ph * 2) * 0.35;
        }
        case 'rain': {
          if (every(0.12) && p.n < 14 + ph * 6) {
            const a = Math.random() * 6.28, d = p.n < 3 ? 0 : M.rand(0.5, 6);
            const x = P.x + Math.sin(a) * d + P.vx * 0.4, z = P.z + Math.cos(a) * d + P.vz * 0.4;
            const room = game.currentRoom;
            const top = room ? room.H * VX.S - 0.6 : 4;
            const gy = game.world.groundAt(x, z);
            B.add({ x, y: top, z, vx: 0, vy: -4, vz: 0, dmg: dmg * 1.6, col: ORANGE, r: 0.25, fall: true, delay: 0.9, delay0: 0.9, gy, life: 4 });
            p.n++;
          }
          return p.t > 0.12 * (14 + ph * 6) + 1.5;
        }
        case 'blink': {
          if (p.n === 0 && p.t > 0.5) {
            p.n = 1;
            const puff = () => { for (let i = 0; i < 30; i++) game.particles.spawn(this.x + M.rand(-0.6, 0.6), this.y + M.rand(0, 3), this.z + M.rand(-0.6, 0.6), M.rand(-2, 2), M.rand(0, 3), M.rand(-2, 2), 0.7, 0.3, 1, 0.08, 0.8, 1); };
            puff();
            const c = game.currentRoom.randomFreeCell(7, P.x, P.z, 6);
            this.x = c.x; this.z = c.z; this.y = game.world.groundAt(c.x, c.z);
            puff();
            VX.Audio.phase();
          }
          if (p.n === 1 && p.t > 0.8) {
            p.n = 2;
            B.ring(this.x, this.y + 1.0, this.z, 18 + ph * 6, 4.5, opts());
          }
          return p.t > 1.2;
        }
      }
      return true;
    }

    choosePattern(game) {
      const list = this.T.patterns[this.phase].filter((n) => n !== this.lastPattern);
      const P = game.player, dist = Math.hypot(P.x - this.x, P.z - this.z);
      let pick = M.choice(list);
      if (pick === 'slam' && dist > 12) pick = M.choice(list);
      if ((pick === 'charge' || pick === 'charge3') && dist < 4) pick = M.choice(list);
      this.startPattern(pick);
    }

    // ---------------- Regeneración ----------------
    regenerate(dt) {
      this.regenT -= dt;
      if (this.regenT > 0) return;
      this.regenT = 0.12;
      const per = 10 + this.phase * 8;
      for (const p of this.body.parts) {
        if (p.detached || p.alive >= p.total) continue;
        let n = 0;
        for (let tries = 0; tries < per * 3 && n < per; tries++) {
          const v = p.vox[(Math.random() * p.vox.length) | 0];
          if (v.alive) continue;
          v.alive = true;
          if (!v.regen) { v.r = Math.min(1, v.r * 0.55 + 0.32); v.g *= 0.55; v.b *= 0.55; v.regen = true; } // carne nueva, rojiza
          p.alive++; n++;
        }
        if (n) VX.updateExposure(p);
      }
    }

    // ---------------- Actualización ----------------
    update(dt, game) {
      const b = this.body, P = game.player, A = VX.Audio;
      b.flash = Math.max(0, b.flash - dt * 6);
      this.invuln = Math.max(0, this.invuln - dt);
      const g = game.world.groundAt(this.x, this.z);
      if (this.y > g + 0.02) { this.vy -= 18 * dt; this.y = Math.max(g, this.y + this.vy * dt); }
      else { this.y = M.lerp(this.y, g, Math.min(1, dt * 10)); this.vy = 0; }
      b.y = this.y;
      this.regenerate(dt);

      const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz);
      const P_ = b.byName;
      let moveSpeed = 0, mx = 0, mz = 0;

      // cambio de fase al 66% y al 33%
      const want = this.hp < this.maxHp * 0.33 ? 2 : this.hp < this.maxHp * 0.66 ? 1 : 0;
      if (want > this.phase) {
        this.phase = want;
        this.state = 'phase'; this.stateT = 1.8; this.pattern = null;
        this.invuln = 1.8;
        this.speed *= 1.15;
        A.phase(); A.roar();
        game.shake(0.6);
        game.hud.banner(this.phase === 1 ? '¡FURIA!' : '¡FASE FINAL!', this.name + (this.phase === 1 ? ' se enfurece' : ' lo da todo'), 2.4);
        game.bullets.ring(this.x, this.y + 1.0, this.z, 30, 6, { b: { dmg: this.bulletDmg, col: this.T.col, r: 0.18 } });
        if (this.T.summon) for (let i = 0; i < 2 + this.phase; i++) game.spawner.spawnZombieNear(game, this.x, this.z, 6, M.choice(['walker', 'runner', 'spitter']));
      }

      this.stateT -= dt;
      switch (this.state) {
        case 'intro':
          P_.armL.ax = P_.armR.ax = -2.8 + Math.sin(this.stateT * 10) * 0.2;
          if (this.stateT <= 0) this.state = 'chase';
          break;

        case 'phase':
          P_.armL.ax = P_.armR.ax = -3.0 + Math.sin(this.stateT * 20) * 0.15;
          b.flash = 0.5 + Math.sin(this.stateT * 20) * 0.3;
          if (this.stateT <= 0) { this.state = 'chase'; this.patternCd = 0.6; }
          break;

        case 'chase': {
          moveSpeed = dist > this.reach * 0.8 ? this.speed : 0;
          if (game.world.lineOfSight(this.x, this.y + 1, this.z, P.x, P.y + 1, P.z) || !game.world.flowDir(this.x, this.z, dirTmp)) {
            mx = dx / (dist || 1); mz = dz / (dist || 1);
          } else { mx = dirTmp[0]; mz = dirTmp[1]; }
          this.attackCd -= dt; this.patternCd -= dt;
          if (dist < this.reach && this.attackCd <= 0) { this.state = 'swing'; this.stateT = 0.55; }
          else if (this.patternCd <= 0) this.choosePattern(game);
          break;
        }

        case 'cast': {
          moveSpeed = this.T.id === 'carnicero' ? this.speed * 0.35 : this.speed * 0.15;
          mx = dx / (dist || 1); mz = dz / (dist || 1);
          if (dist < this.reach) moveSpeed = 0;
          if (this.runPattern(dt, game)) {
            this.pattern = null; this.state = 'chase';
            this.patternCd = M.rand(1.0, 1.8) * (1 - this.phase * 0.2);
          }
          break;
        }

        case 'swing': {
          const k = 1 - this.stateT / 0.55;
          P_.armR.ax = -2.9 + k * 2.6; P_.armL.ax = -1.2;
          if (this.stateT <= 0) {
            if (dist < this.reach + 0.6) { P.damage(this.dmg, this.x, this.z, game); A.punch(); P.knock(dx / (dist || 1) * 9, dz / (dist || 1) * 9, 4); }
            game.world.damageSphere(this.x + Math.sin(b.yaw) * 2, this.y + 1, this.z + Math.cos(b.yaw) * 2, 1.2, 120, game);
            this.state = 'chase'; this.attackCd = this.phase ? 0.8 : 1.3;
          }
          break;
        }

        case 'slamUp': {
          P_.armL.ax = P_.armR.ax = -3.0;
          b.yOff = Math.sin((1 - this.stateT / 0.9) * Math.PI) * 0.6;
          if (this.stateT <= 0) {
            b.yOff = 0;
            A.slam();
            game.shake(0.6);
            for (let i = 0; i < 1 + this.phase; i++) game.shockwaves.push({ x: this.x, y: this.y, z: this.z, r: 0.5 - i * 3, max: 16, speed: 9, dmg: this.dmg * 0.8, hit: false });
            game.bullets.ring(this.x, this.y + 0.45, this.z, 16 + this.phase * 8, 4, { b: { dmg: this.bulletDmg, col: ORANGE, r: 0.18 } });
            game.world.damageSphere(this.x, this.y + 0.3, this.z, 2.6, 200, game);
            for (let i = 0; i < 30; i++) game.particles.spawn(this.x + M.rand(-2, 2), this.y + 0.2, this.z + M.rand(-2, 2), M.rand(-5, 5), M.rand(3, 8), M.rand(-5, 5), 0.3, 0.27, 0.25, M.rand(0.1, 0.25), 2);
            this.state = 'recover'; this.stateT = 0.7;
          }
          break;
        }

        case 'throw': {
          const k = 1 - this.stateT / 0.7;
          P_.armL.ax = -3.0 + k * 1.8; P_.armR.ax = -3.0 + k * 1.8;
          if (this.stateT <= 0) {
            for (let i = 0; i < 1 + this.phase; i++) {
              const tx = P.x + P.vx * 0.6 + M.rand(-1.5, 1.5) * (i ? 1 : 0), tz = P.z + P.vz * 0.6 + M.rand(-1.5, 1.5) * (i ? 1 : 0);
              const sx = this.x, sy = this.y + this.body.height * 0.95, sz = this.z;
              const T = 1.0 + dist * 0.04;
              game.projectiles.push({
                x: sx, y: sy, z: sz,
                vx: (tx - sx) / T, vy: (P.y + 0.8 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
                dmg: this.dmg * 0.9, life: 4, rot: 0, col: [0.4, 0.38, 0.36], glow: 0,
              });
            }
            this.state = 'recover'; this.stateT = 0.4;
          }
          break;
        }

        case 'chargeWind':
          P_.armL.ax = P_.armR.ax = -1.6;
          this.cdx = dx / (dist || 1); this.cdz = dz / (dist || 1);
          if (this.stateT <= 0) { this.state = 'charge'; this.stateT = 1.2; this.chargeHit = false; }
          break;

        case 'charge': {
          mx = this.cdx; mz = this.cdz; moveSpeed = 11 + this.phase * 1.5;
          P_.armL.ax = P_.armR.ax = -1.5;
          game.world.smashBox(this.x - 1, this.y + 0.55, this.z - 1, this.x + 1, this.y + 3.2, this.z + 1, game);
          if (Math.random() < 0.35 + this.phase * 0.15) {
            const s = Math.random() < 0.5 ? 1 : -1;
            game.bullets.add({ x: this.x, y: this.y + 1.0, z: this.z, vx: -this.cdz * s * 4, vy: 0, vz: this.cdx * s * 4, dmg: this.bulletDmg, col: RED, r: 0.15, life: 3 });
          }
          if (dist < 1.6 && !this.chargeHit) {
            this.chargeHit = true;
            P.damage(this.dmg * 1.2, this.x, this.z, game);
            P.knock(this.cdx * 14, this.cdz * 14, 5);
          }
          if (this.stateT <= 0) {
            this.charges--;
            game.bullets.fan(this.x, this.y + 1.2, this.z, this.aimAt(P), 9 + this.phase * 2, 1.4, 7, { b: { dmg: this.bulletDmg, col: RED, r: 0.16 } });
            if (this.charges > 0) { this.state = 'chargeWind'; this.stateT = 0.45; }
            else { this.state = 'recover'; this.stateT = 0.8; }
          }
          break;
        }

        case 'recover':
          if (this.stateT <= 0) { this.state = 'chase'; this.patternCd = M.rand(0.8, 1.5); }
          break;
      }

      if (moveSpeed > 0) {
        const vx = mx * moveSpeed + this.kx, vz = mz * moveSpeed + this.kz;
        const r = this.radius;
        const y0 = this.y + 0.55, y1 = this.y + 3.2;
        const nx = this.x + vx * dt;
        if (!game.world.boxCollides(nx - r, y0, this.z - r, nx + r, y1, this.z + r) && game.world.groundAt(nx, this.z) - this.y < 0.6) this.x = nx;
        else if (game.world.smashBox(nx - r, y0, this.z - r, nx + r, y1, this.z + r, game)) A.crumble();
        const nz = this.z + vz * dt;
        if (!game.world.boxCollides(this.x - r, y0, nz - r, this.x + r, y1, nz + r) && game.world.groundAt(this.x, nz) - this.y < 0.6) this.z = nz;
        else if (game.world.smashBox(this.x - r, y0, nz - r, this.x + r, y1, nz + r, game)) A.crumble();
        if (this.state === 'charge' && Math.random() < 0.5) game.shake(0.15);
      }
      this.kx *= Math.pow(0.05, dt); this.kz *= Math.pow(0.05, dt);

      if (this.state !== 'charge') {
        let dy = Math.atan2(dx, dz) - b.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        b.yaw += dy * Math.min(1, dt * 3);
      } else b.yaw = Math.atan2(this.cdx, this.cdz);

      this.walkT += dt * (moveSpeed > 0 ? moveSpeed * 1.6 : 0.6);
      const sw = Math.sin(this.walkT) * (moveSpeed > 0 ? 0.5 : 0.03);
      P_.legL.ax = sw; P_.legR.ax = -sw;
      if (this.state === 'chase' || this.state === 'recover') {
        P_.armL.ax = -0.3 - sw * 0.6; P_.armR.ax = -0.3 + sw * 0.6;
      }
      P_.armL.az = -0.15; P_.armR.az = 0.15;
      P_.torso.ax = 0.15;
      if (this.state !== 'slamUp') b.yOff = Math.abs(Math.sin(this.walkT)) * 0.05;
      if (moveSpeed > 0 && Math.abs(Math.sin(this.walkT)) < 0.08 && !this._stepped) { game.shake(0.08); this._stepped = true; }
      if (Math.abs(Math.sin(this.walkT)) > 0.3) this._stepped = false;
      b.x = this.x; b.z = this.z;
      b.computeWorld();
    }

    hurt(dmg) {
      if (this.invuln > 0) { VX.Audio.wall(); return; }
      this.hp -= dmg;
    }

    hit(hit, dmg, ray, game, opts) {
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      if (this.dead) return false;
      const b = this.body;
      const dir = [ray.dx, ray.dy, ray.dz];
      this.hurt(dmg * (hit.part.name === 'head' ? 1.5 : 1));
      b.flash = Math.max(b.flash, 0.6);
      const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles, 0.9);
      game.particles.blood(hit.vox.wx, hit.vox.wy, hit.vox.wz, dir[0], dir[1], dir[2], 8);
      VX.Audio.flesh();
      return this.afterDamage(removed, dir, game);
    }

    blast(x, y, z, R, dmg, game) {
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      if (this.dead) return false;
      const b = this.body;
      const v = b.nearestVoxel(x, y, z);
      if (!v) return false;
      this.hurt(dmg);
      b.flash = 1;
      const dx = v.wx - x, dz = v.wz - z, l = Math.hypot(dx, dz) || 1;
      const dir = [dx / l, 0.3, dz / l];
      const removed = b.carveSphere(v.wx, v.wy, v.wz, 0.2 + dmg / 300, game.particles, dir[0], 0.5, dir[2], 20);
      return this.afterDamage(removed, dir, game);
    }

    afterDamage(removed, dir, game) {
      const b = this.body;
      const res = b.afterCarve(removed, game.gibs, dir[0] * 2, 1, dir[2] * 2);
      for (const name of ['armL', 'armR']) {
        if (res[name] || (!b.byName[name].detached && b.ratio(name) < 0.3)) {
          if (!this['lost_' + name] && b.broken(name, 0.3)) {
            this['lost_' + name] = true;
            if (!b.byName[name].detached) b.detach(name, game.gibs, dir[0] * 3, 2, dir[2] * 3);
            this.dmg *= 0.85;
            VX.Audio.snap();
            game.hud.banner('¡BRAZO ARRANCADO!', 'Sus golpes pierden fuerza', 1.6);
          }
        }
      }
      // la cabeza y el torso se regeneran: solo muere al quedarse sin vida
      if (this.hp <= 0) { this.die(dir, game); return true; }
      return false;
    }

    die(dir, game) {
      if (this.dead) return;
      this.dead = true;
      game.bullets.clear();
      game.addCorpse(new VX.Corpse(this.body, dir, { heavy: true, life: 25 }));
      for (let i = 0; i < 4; i++) game.particles.blood(this.x, this.y + 1 + i * 0.6, this.z, M.rand(-1, 1), 1, M.rand(-1, 1), 20);
      VX.Audio.zombieDie(); VX.Audio.roar();
      game.shake(1);
      game.pickups.dropGold(this.x, this.y + 1.5, this.z, 40 + game.stats.bosses * 10);
      game.stats.kills++;
      game.stats.bosses++;
      VX.Profile.add('bosses', 1, game);
      VX.Profile.addW(this.lastW, 'bosses', 1, game);
      VX.Profile.addW(this.lastW, 'kills', 1, game);
      VX.Profile.add('kills', 1, game);
    }

    render(batch) { this.body.render(batch); }
  }

  Boss.TYPES = BOSSES;
  VX.Boss = Boss;
})();
