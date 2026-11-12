// Zombis: enemigos muy destructibles.
// - Pierna rota/cortada  -> caen al suelo (animación) y se arrastran.
// - Sin brazos           -> atacan a mordiscos.
// - Cabeza destrozada    -> mueren al instante. También mueren al quedarse sin vida.
// - Torso partido        -> la mitad de arriba cae y el resto se deshace.
// Variantes: caminante, corredor, bruto, escupidor, explosivo, escudero, trepador y perro.
(function () {
  const M = VX.M;
  const dirTmp = [0, 0];

  const TYPES = {
    walker: { name: 'Zombi', hp: 70, speed: 1.6, dmg: 10, gold: [2, 4], reach: 1.0, lean: 0.08 },
    runner: { name: 'Corredor', hp: 45, speed: 3.4, dmg: 8, gold: [2, 3], reach: 0.95, lean: 0.3, dodge: true },
    brute: { name: 'Bruto', hp: 190, speed: 1.2, dmg: 22, gold: [5, 8], reach: 1.3, lean: 0.12, heavy: true },
    spitter: { name: 'Escupidor', hp: 85, speed: 1.3, dmg: 12, gold: [3, 5], reach: 1.0, lean: 0.05, ranged: true },
    exploder: { name: 'Explosivo', hp: 55, speed: 1.35, dmg: 0, gold: [3, 5], reach: 1.7, lean: 0.0, explode: true },
    shielder: { name: 'Escudero', hp: 110, speed: 1.35, dmg: 14, gold: [4, 6], reach: 1.1, lean: 0.05, shield: true },
    climber: { name: 'Trepador', hp: 50, speed: 2.6, dmg: 9, gold: [3, 4], reach: 1.0, lean: 0.35, climb: true, dodge: true },
    dog: { name: 'Perro zombi', hp: 40, speed: 5.0, dmg: 9, gold: [2, 3], reach: 1.15, lean: 0, quad: true, dodge: true },
  };

  const FALL_TIME = 0.6;
  let UID = 0;

  // Comportamiento de cada tipo:
  // ring = participa en el cerco por turnos · accel/turn = agilidad · mass = cuánto empuja a los demás
  const BEH = {
    walker: { ring: true, accel: 5, turn: 5, mass: 1 },
    runner: { ring: true, accel: 10, turn: 9, mass: 0.8, ringAdd: 1.2, hitRun: true, eager: 1, dodge: true },
    brute: { ring: false, accel: 3, turn: 2.6, mass: 3 },
    spitter: { ring: false, accel: 5, turn: 6, mass: 1, keep: [5.5, 10] },
    exploder: { ring: false, accel: 6, turn: 6, mass: 1 },
    shielder: { ring: true, accel: 4, turn: 7, mass: 1.8, ringAdd: -0.5, eager: 1.5, faceAlways: true },
    climber: { ring: true, accel: 9, turn: 9, mass: 0.8, ringAdd: 0.5, behind: true, climb: true, dodge: true },
    dog: { ring: false, accel: 11, turn: 10, mass: 0.7, dodge: true },
  };

  class Zombie {
    constructor(kind, x, z, floor, opts = {}) {
      const T = TYPES[kind];
      this.kind = kind;
      this.T = T;
      this.isBoss = false;
      this.elite = !!opts.elite;
      const cfg = VX.Models.zombieConfigs[kind];
      let model = T.quad ? VX.Models.quadruped(cfg) : VX.Models.humanoid(cfg);
      if (T.shield) model = VX.Models.addShield(model, cfg);
      if (this.elite) {
        for (const p of model.parts) for (const v of p.vox) {
          if (p.armor) continue;
          if (v.e > 0) { v.r = 1; v.g = 0.12; v.b = 0.08; v.e = 1; }
          else { v.r = v.r * 0.75 + 0.12; v.g *= 0.72; v.b *= 0.75; }
        }
      }
      this.body = new VX.VoxelBody(model, this.elite ? 1.08 : 1);
      this.x = x; this.z = z;
      this.y = opts.y || 0; this.vy = 0;
      this.body.x = x; this.body.z = z; this.body.y = this.y;
      // ---- dificultad según el piso ----
      const f = floor;
      const eliteK = this.elite ? 1.7 : 1;
      const greed = VX.game && VX.game.weapon && VX.game.weapon.mods.greed ? 1.25 : 1;
      this.maxHp = this.hp = T.hp * (1 + f * 0.15) * eliteK * greed;
      this.baseSpeed = Math.min(T.speed * (1 + f * 0.03), T.speed * 1.7) * M.rand(0.9, 1.1) * (this.elite ? 1.2 : 1);
      this.dmg = Math.round(T.dmg * (1 + f * 0.08) * (this.elite ? 1.3 : 1));
      this.cdBase = Math.max(0.55, 1.15 - f * 0.025);
      this.gold = this.elite ? [T.gold[0] * 2, T.gold[1] * 2] : T.gold;
      this.reach = T.reach;
      this.radius = T.quad ? 0.3 : this.body.height * 0.16;
      this.attackCd = M.rand(0.5, 1);
      this.windup = 0;
      this.walkT = M.rand(0, 6);
      this.dead = false;
      this.crawling = false;
      this.crawlC = 0;
      this.fallT = 0;
      this.biter = !!T.quad;
      this.limp = false;
      this.armsLost = 0;
      this.spawnT = 1.1;
      this.groanT = M.rand(2, 8);
      this.stuckT = 0; this.sideT = 0; this.sideDir = 1;
      this.kx = 0; this.kz = 0;
      this.fl = { x: 0, z: 0, vx: 0, vz: 0 };
      this.tilt = M.rand(-0.25, 0.25);
      this.gait = M.rand(0.85, 1.15);
      this.spitCd = M.rand(1.5, 3);
      this.flank = M.rand(-1, 1);       // por dónde intenta rodear al jugador
      this.dodgeCd = M.rand(0.5, 2);
      this.burn = 0;
      this.fuse = 0;
      this.climbing = 0;
      this.B = BEH[kind];
      this.uid = ++UID;
      this.vx = 0; this.vz = 0; this.aspd = 0;
      this.state = 'chase'; this.stateT = M.rand(0.5, 2);
      this.pathT = 0; this.pdir = [0, 0]; this.direct = false;
      this.token = false; this.waitT = 0;
      this.leapCd = M.rand(1, 3); this.chargeCd = M.rand(1.5, 4);
      this.sideDir = M.chance(0.5) ? 1 : -1;
      this.body.yaw = opts.yaw ?? Math.PI;
    }

    get speed() {
      let s = this.baseSpeed;
      if (this.crawling) {
        s *= (this.body.broken('legL') && this.body.broken('legR')) ? 0.32 : 0.42;
        if (this.armsLost >= 2) s *= 0.6;
        s *= 0.35 + 0.65 * Math.max(0, Math.sin(this.walkT));
      } else if (this.limp) s *= 0.5;
      else if (this.biter && !this.T.quad) s *= 1.12;
      if (this.fuse > 0) s *= 0.4;
      return s;
    }

    get attackReach() {
      if (this.crawling) return 1.0;
      return this.biter && !this.T.quad ? 0.85 : this.reach;
    }

    followGround(dt, world) {
      if (this.climbing > 0 || this.state === 'leap') { this.body.y = this.y; return; }
      const g = world.groundAt(this.x, this.z);
      if (this.y > g + 0.02) { this.vy -= 18 * dt; this.y = Math.max(g, this.y + this.vy * dt); if (this.y === g) this.vy = 0; }
      else { this.y = M.lerp(this.y, g, Math.min(1, dt * 22)); this.vy = 0; }
      this.body.y = this.y;
    }

    update(dt, game) {
      const b = this.body, P = game.player;
      b.flash = Math.max(0, b.flash - dt * 6);
      const fl = this.fl;
      fl.vx += (-60 * fl.x - 9 * fl.vx) * dt; fl.vz += (-60 * fl.z - 9 * fl.vz) * dt;
      fl.x += fl.vx * dt; fl.z += fl.vz * dt;
      this.followGround(dt, game.world);
      this.climbing = Math.max(0, this.climbing - dt);

      // ardiendo
      if (this.burn > 0) {
        this.burn -= dt;
        this.hp -= 16 * dt;
        if (Math.random() < 0.6) game.particles.spawn(this.x + M.rand(-0.25, 0.25), this.y + M.rand(0.3, 1.5), this.z + M.rand(-0.25, 0.25), M.rand(-0.3, 0.3), M.rand(1, 2.5), M.rand(-0.3, 0.3), 1, M.rand(0.35, 0.7), 0.1, M.rand(0.04, 0.08), M.rand(0.3, 0.6), 1, 1);
        if (this.hp <= 0 && this.spawnT <= 0) { this.die([0, 1, 0], game); return; }
      }

      if (this.spawnT > 0) {
        this.spawnT -= dt;
        b.yOff = -b.height * Math.max(0, this.spawnT) / 1.1;
        if (Math.random() < 0.5) game.particles.spawn(this.x + M.rand(-0.4, 0.4), this.y + 0.05, this.z + M.rand(-0.4, 0.4), M.rand(-1, 1), M.rand(1, 3), M.rand(-1, 1), 0.25, 0.22, 0.24, 0.06, 1);
        this.animate(dt, 0);
        b.computeWorld();
        return;
      }

      if (this.fallT > 0) {
        this.fallT -= dt;
        const k = 1 - Math.max(0, this.fallT) / FALL_TIME;
        this.crawlC = k * k;
        if (this.fallT <= 0) this.land(game);
        this.animate(dt, 0);
        b.x = this.x; b.z = this.z;
        b.computeWorld();
        return;
      }

      const dx = P.x - this.x, dz = P.z - this.z;
      const dist = Math.hypot(dx, dz);

      // ---- explosivo: mecha ----
      if (this.T.explode) {
        if (this.fuse <= 0 && dist < 1.8 && Math.abs(P.y - this.y) < 1.5) { this.fuse = 0.9; VX.Audio.fuse(); }
        if (this.fuse > 0) {
          this.fuse -= dt;
          b.flash = (Math.sin(this.fuse * 40) > 0) ? 1 : 0.2;
          if (this.fuse <= 0) { this.detonate(game); return; }
        }
      }

      // --- Movimiento e IA ---
      const B = this.B;
      this.losT = (this.losT || 0) - dt;
      if (this.losT <= 0) {
        this.losT = 0.25 + Math.random() * 0.1;
        this.los = game.world.lineOfSight(this.x, this.y + 0.3, this.z, P.x, P.y + 0.3, P.z) &&
          game.world.lineOfSight(this.x, this.y + 0.9, this.z, P.x, P.y + 0.9, P.z);
      }
      this.pathT -= dt;
      this.stateT = Math.max(0, this.stateT - dt);
      this.leapCd -= dt; this.chargeCd -= dt;
      const toX = dx / (dist || 1), toZ = dz / (dist || 1);

      if (this.state === 'leap') { this.updateLeap(dt, game, dist); return; }

      let gx = 0, gz = 0, want = 0, spdOverride = 0;
      const stopDist = Math.max(this.attackReach * 0.7, this.radius + 0.45);
      const busy = this.windup > 0;

      if (this.crawling) {
        const p = this.pathTo(game, dist, toX, toZ);
        gx = p[0]; gz = p[1]; want = dist > stopDist ? 1 : 0;
      } else if (this.state === 'retreat') {
        // se aleja un momento tras atacar (golpea y huye)
        gx = -toX + -toZ * this.sideDir * 0.6; gz = -toZ + toX * this.sideDir * 0.6;
        want = 1.1;
        if (this.stateT <= 0) this.state = 'chase';
      } else if (this.state === 'chargeWind') {
        want = 0;
        if (Math.random() < 0.4) game.particles.spawn(this.x + M.rand(-0.4, 0.4), this.y + 0.05, this.z + M.rand(-0.4, 0.4), M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1), 0.3, 0.27, 0.25, 0.06, 0.6);
        if (this.stateT <= 0) { this.state = 'charge'; this.stateT = 1.25; this.chargeHit = false; VX.Audio.dash(); }
      } else if (this.state === 'charge') {
        gx = this.chargeX; gz = this.chargeZ; want = 1; spdOverride = 7 + Math.min(3, game.floor * 0.1);
        if (!this.chargeHit && dist < 1.25 && Math.abs(P.y - this.y) < 1.2) {
          this.chargeHit = true;
          P.damage(this.dmg * 1.3, this.x, this.z, game);
          P.knock(this.chargeX * 9, this.chargeZ * 9, 4);
          VX.Audio.punch(); game.shake(0.6);
        }
        if (this.stateT <= 0) { this.state = 'chase'; this.chargeCd = M.rand(4.5, 7.5); }
      } else if (this.state === 'stun') {
        want = 0;
        if (this.stateT <= 0) { this.state = 'chase'; this.chargeCd = M.rand(3.5, 6); }
      } else if (!busy) {
        switch (this.kind) {
          case 'brute': {
            const p = this.pathTo(game, dist, toX, toZ);
            gx = p[0]; gz = p[1]; want = dist > stopDist ? 1 : 0;
            if (this.los && this.direct && dist > 3.5 && dist < 10 && this.chargeCd <= 0) {
              this.state = 'chargeWind'; this.stateT = 0.8; this.chargeX = toX; this.chargeZ = toZ;
              VX.Audio.roar(); game.shake(0.15);
            }
            break;
          }
          case 'spitter': {
            const [lo, hi] = B.keep;
            if (!this.los || dist > hi) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = 1; }
            else {
              if (this.stateT <= 0) { this.stateT = M.rand(1.8, 3.4); this.sideDir = -this.sideDir; }
              const tx = -toZ * this.sideDir, tz = toX * this.sideDir;
              if (dist < lo) { gx = -toX + tx * 0.5; gz = -toZ + tz * 0.5; want = 0.95; }
              else { gx = tx + toX * (dist - (lo + hi) / 2) * 0.15; gz = tz + toZ * (dist - (lo + hi) / 2) * 0.15; want = 0.45; }
            }
            break;
          }
          case 'exploder': {
            const p = this.pathTo(game, dist, toX, toZ);
            gx = p[0]; gz = p[1]; want = dist < 5 ? 1.7 : 1;   // esprinta al final
            break;
          }
          case 'dog': {
            // ronda en círculos y se lanza a por ti
            const R = 3.4;
            if (!this.los || dist > R + 2.5) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = 1; }
            else {
              const tx = -toZ * this.sideDir, tz = toX * this.sideDir;
              const rad = M.clamp((dist - R) * 0.8, -1, 1);
              gx = tx + toX * rad; gz = tz + toZ * rad; want = 0.85;
              if (this.stateT <= 0) { this.stateT = M.rand(1.5, 3); if (Math.random() < 0.4) this.sideDir = -this.sideDir; }
            }
            if (this.los && dist > 1.6 && dist < 4.3 && this.leapCd <= 0 && Math.abs(P.y - this.y) < 1) this.startLeap(game, toX, toZ, 8, 3.4);
            break;
          }
          default: {
            // caminante, corredor, escudero y trepador: cerco por turnos
            this.approachRing(game, dist, toX, toZ, stopDist);
            gx = this.gx; gz = this.gz; want = this.want;
            if (this.kind === 'runner' && this.token && dist > 3) {
              const z = Math.sin(game.time * 6 + this.uid) * 0.75;   // zigzag
              gx += -toZ * z; gz += toX * z; want *= 1.15;
            }
            if (this.kind === 'walker' && want > 0.2) {
              const z = Math.sin(this.walkT * 0.45 + this.uid) * 0.3;   // arrastra los pies, se tambalea
              gx += -gz * z; gz += gx * z;
            }
            if (this.kind === 'climber' && this.token && this.los && dist > 2 && dist < 5.2 && this.leapCd <= 0 && Math.abs(P.y - this.y) < 1.6)
              this.startLeap(game, toX, toZ, 6.5, 5);
          }
        }
      }

      // esquivar cuando el jugador le apunta
      if (B.dodge && !this.crawling && this.state === 'chase' && dist > 3 && dist < 16) {
        this.dodgeCd -= dt;
        const cp = Math.cos(P.pitch), fx = Math.sin(P.yaw) * cp, fz = Math.cos(P.yaw) * cp;
        const aim = (-dx * fx - dz * fz) / (dist || 1);
        if (aim > 0.985 && this.dodgeCd <= 0) {
          this.dodgeCd = M.rand(1.2, 2.5);
          this.sideT = 0.35; this.sideDir = M.chance(0.5) ? 1 : -1; this.dodging = 0.35;
        }
      }
      this.dodging = Math.max(0, (this.dodging || 0) - dt);
      if (this.sideT > 0) {
        this.sideT -= dt;
        if (this.dodging > 0) { const sx = -toZ * this.sideDir, sz = toX * this.sideDir; gx = gx * 0.3 + sx; gz = gz * 0.3 + sz; }
        else {
          // desvío para desatascarse: de lado respecto a donde quería ir
          const l = Math.hypot(gx, gz) || 1, ux = gx / l, uz = gz / l;
          gx = ux * 0.35 - uz * this.sideDir; gz = uz * 0.35 + ux * this.sideDir;
        }
        want = Math.max(want, 0.8);
      }

      this.intent = want;
      // --- dirección final: separación y esquivar a los compañeros ---
      let gl = Math.hypot(gx, gz);
      if (gl > 1e-4) { gx /= gl; gz /= gl; }
      let ax = 0, az = 0, slow = 1;
      if (this.state !== 'charge') for (const o of game.enemies) {
        if (o === this || o.dead || o.spawnT > 0) continue;
        const ox = this.x - o.x, oz = this.z - o.z;
        const d = Math.hypot(ox, oz);
        if (d > 1.6 || d < 1e-4 || Math.abs(o.y - this.y) > 1.2) continue;
        const min = this.radius + o.radius;
        // separación suave
        const k = Math.max(0, 1 - (d - min) / (1.6 - min));
        ax += (ox / d) * k * k * 0.9; az += (oz / d) * k * k * 0.9;
        // alguien delante en mi camino: lo rodeo por un lado y freno un poco (hacen cola, no se empujan)
        if (want > 0.1) {
          const ahead = -(ox * gx + oz * gz) / d;
          if (ahead > 0.55 && d < min + 0.7) {
            const side = (gx * -oz + gz * ox) > 0 ? 1 : -1;
            ax += -gz * side * 0.9; az += gx * side * 0.9;
            slow = Math.min(slow, M.clamp(0.45 + 0.55 * (d - min) / 0.7, 0.3, 1));
          }
        }
      }
      gx = gx * want + ax; gz = gz * want + az;
      gl = Math.hypot(gx, gz);
      const mag = Math.min(gl, Math.max(want, 0.6));
      let spd = (spdOverride || this.speed) * mag * slow;
      if (this.dodging > 0) spd = this.baseSpeed * 2.2;
      if (busy && !this.T.quad) spd *= 0.15;
      const dvx = gl > 1e-4 ? (gx / gl) * spd : 0, dvz = gl > 1e-4 ? (gz / gl) * spd : 0;
      const acc = Math.min(1, (this.state === 'charge' ? 8 : B.accel) * dt);
      this.vx += (dvx - this.vx) * acc; this.vz += (dvz - this.vz) * acc;
      const vx = this.vx + this.kx, vz = this.vz + this.kz;
      this.kx *= Math.pow(0.02, dt); this.kz *= Math.pow(0.02, dt);

      const ox0 = this.x, oz0 = this.z;
      const okx = this.tryMove(vx * dt, 0, game.world);
      if (!okx) this.vx *= 0.3;
      const okz = this.tryMove(0, vz * dt, game.world);
      if (!okz) this.vz *= 0.3;
      // trepador: si un obstáculo le corta el paso, trepa por él
      if (B.climb && spd > 0 && (!okx || !okz) && this.blockedH && this.blockedH - this.y < 3.2) {
        this.climbing = 0.15;
        this.y += 2.4 * dt;
        this.vy = 0;
        this.body.y = this.y;
        this.tryMove(vx * dt * 0.5, vz * dt * 0.5, game.world);
      }
      const moved = Math.hypot(this.x - ox0, this.z - oz0);
      this.aspd = M.lerp(this.aspd || 0, moved / Math.max(dt, 1e-4), Math.min(1, dt * 10));
      // la embestida acaba contra la pared: aturdido
      if (this.state === 'charge' && (!okx || !okz) && this.stateT < 1.1) {
        this.state = 'stun'; this.stateT = 1.3;
        game.world.damageSphere(this.x + this.chargeX * 0.7, this.y + 1, this.z + this.chargeZ * 0.7, 0.9, 160, game);
        VX.Audio.slam(); game.shake(0.35);
      }
      // atascado: recalcula camino y prueba un desvío lateral
      if (spd > 0.4 && moved < spd * dt * 0.2 && this.climbing <= 0 && this.state === 'chase') {
        this.stuckT += dt;
        if (this.stuckT > 0.45) {
          this.pathT = 0; this.direct = false;
          this.stuckN = (this.stuckN || 0) + 1;
          if (this.stuckN % 2 === 0) this.sideDir = -this.sideDir;   // si no funcionó, prueba el otro lado
          this.sideT = M.rand(0.35, 0.7);
          this.stuckT = 0;
        }
      } else { this.stuckT = Math.max(0, this.stuckT - dt * 2); if (moved > spd * dt * 0.6) this.stuckN = 0; }

      // --- orientación: mira a donde camina; de cerca, al jugador ---
      let targetYaw = Math.atan2(dx, dz);
      const vl = Math.hypot(this.vx, this.vz);
      if (!(dist < 3.2 || B.faceAlways || busy || this.state === 'chargeWind' || vl < 0.35)) targetYaw = Math.atan2(this.vx, this.vz);
      if (this.state === 'charge') targetYaw = Math.atan2(this.chargeX, this.chargeZ);
      let dy = targetYaw - b.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      b.yaw += dy * Math.min(1, dt * (this.crawling ? 3 : B.turn));

      // --- Ataque ---
      this.attackCd -= dt;
      const wind = this.T.quad ? 0.25 : this.biter ? 0.32 : 0.45;
      const canAttack = this.state === 'chase' || this.crawling;
      if (this.T.explode) { /* el explosivo no golpea: revienta */ }
      else if (this.windup > 0) {
        this.windup -= dt;
        if (this.windup <= 0) {
          if (this.spitting) this.spit(game);
          else if (dist < this.attackReach + 0.45 && Math.abs(P.y - this.y) < 1.2) {
            let dmg = this.dmg;
            if (this.biter) { dmg *= this.T.quad ? 1 : 0.8; VX.Audio.bite(); }
            else { if (this.armsLost === 1) dmg *= 0.7; VX.Audio.punch(); }
            if (this.crawling) dmg *= 0.7;
            P.damage(dmg, this.x, this.z, game);
            // el escudero te empuja con el escudo
            if (this.T.shield && this.body.byName.shield && !this.body.byName.shield.detached) P.knock(toX * 7, toZ * 7, 2);
          }
          // el corredor golpea y se retira
          if (this.B.hitRun && !this.spitting && !this.crawling) { this.state = 'retreat'; this.stateT = M.rand(0.6, 1); this.sideDir = M.chance(0.5) ? 1 : -1; }
          this.spitting = false;
          this.attackCd = this.cdBase * M.rand(0.85, 1.15);
        }
      } else if (canAttack && dist < this.attackReach && this.attackCd <= 0 && Math.abs(P.y - this.y) < 1.2) {
        this.windup = wind; this.windTotal = wind;
        if (this.T.quad) { this.kx += (dx / (dist || 1)) * 4; this.kz += (dz / (dist || 1)) * 4; }  // salto
      } else if (canAttack && this.T.ranged && !this.crawling && this.los && dist > 3 && dist < 14) {
        this.spitCd -= dt;
        if (this.spitCd <= 0) { this.windup = 0.7; this.windTotal = 0.7; this.spitting = true; this.spitCd = Math.max(1.6, 3.2 - game.floor * 0.08); }
      }

      this.groanT -= dt;
      if (this.groanT <= 0) { VX.Audio.groanAt(this.x, this.z, P, this.T.quad); this.groanT = M.rand(4, 10); }

      this.animate(dt, Math.min(spd, this.aspd * 1.1));
      b.x = this.x; b.z = this.z;
      b.computeWorld();
    }

    // Dirección por el camino transitable hacia el jugador (recto si se puede)
    pathTo(game, dist, toX, toZ) {
      const P = game.player;
      if (this.pathT <= 0) {
        this.pathT = 0.16 + Math.random() * 0.1;
        this.direct = dist < 14 && game.world.straightWalk(this.x, this.z, P.x, P.z);
        if (!this.direct && !game.world.pathDir(this.x, this.z, this.pdir)) { this.pdir[0] = toX; this.pdir[1] = toZ; }
      }
      if (this.direct) { this.pdir[0] = toX; this.pdir[1] = toZ; }
      return this.pdir;
    }

    // Cerco: con turno de ataque va a por ti; si no, espera en su hueco del anillo
    approachRing(game, dist, toX, toZ, stopDist) {
      const p = this.pathTo(game, dist, toX, toZ);
      const H = VX.Horde, P = game.player;
      const R = H.ringR + (this.B.ringAdd || 0);
      let ringA = this.ringA;
      // el trepador prefiere atacar por la espalda
      if (this.B.behind && ringA !== undefined) ringA = Math.atan2(-Math.cos(P.yaw), -Math.sin(P.yaw)) + Math.sin(this.uid) * 0.8;
      if (this.token || !this.los || !this.direct || dist > R + 2.5 || ringA === undefined) {
        this.gx = p[0]; this.gz = p[1];
        this.want = dist > stopDist ? (this.token ? 1 : 0.9) : 0;
        return;
      }
      const cur = Math.atan2(this.z - P.z, this.x - P.x);
      let da = ringA - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const rad = M.clamp((dist - R) * 0.9, -1, 1);
      const tang = M.clamp(da * 1.4, -1, 1);
      const tx = -Math.sin(cur), tz = Math.cos(cur);
      this.gx = toX * rad + tx * tang;
      this.gz = toZ * rad + tz * tang;
      const m = Math.hypot(this.gx, this.gz);
      this.want = m < 0.15 ? 0 : Math.min(1, m) * 0.55;   // acechan despacio
    }

    // Salto (perro y trepador)
    startLeap(game, toX, toZ, h, vy) {
      this.state = 'leap';
      this.leapX = toX * h; this.leapZ = toZ * h;
      this.vy = vy; this.y += 0.05;
      this.leapHit = false;
      this.leapCd = M.rand(2.4, 4);
      VX.Audio.dash();
    }

    updateLeap(dt, game, dist) {
      const P = game.player, b = this.body;
      this.vy -= 18 * dt;
      this.y += this.vy * dt;
      this.tryMove(this.leapX * dt, 0, game.world);
      this.tryMove(0, this.leapZ * dt, game.world);
      if (!this.leapHit && dist < 1.0 && Math.abs(P.y + 0.8 - (this.y + 0.4)) < 1.1) {
        this.leapHit = true;
        P.damage(this.dmg * 1.2, this.x, this.z, game);
        VX.Audio.bite();
      }
      const g = game.world.groundAt(this.x, this.z);
      if (this.vy < 0 && this.y <= g) {
        this.y = g; this.vy = 0;
        this.vx = this.leapX * 0.3; this.vz = this.leapZ * 0.3;
        if (this.T.quad) { this.state = 'retreat'; this.stateT = M.rand(0.5, 0.9); this.sideDir = M.chance(0.5) ? 1 : -1; }
        else this.state = 'chase';
      }
      b.y = this.y;
      b.yaw = Math.atan2(this.leapX, this.leapZ);
      this.animate(dt, 6);
      b.x = this.x; b.z = this.z;
      b.computeWorld();
    }

    spit(game) {
      const P = game.player;
      const head = this.body.byName.head;
      const sx = head.detached ? this.x : head.wp[0], sy = head.detached ? this.y + 1.3 : head.wp[1] + 0.15, sz = head.detached ? this.z : head.wp[2];
      const tx = P.x + P.vx * 0.5, tz = P.z + P.vz * 0.5;
      const d = Math.hypot(tx - sx, tz - sz);
      const T = 0.45 + d * 0.05;
      game.projectiles.push({
        x: sx, y: sy, z: sz,
        vx: (tx - sx) / T, vy: (P.y + 1.0 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
        dmg: this.dmg * 1.1, life: 3, rot: 0, col: [0.45, 0.9, 0.15], glow: 0.7,
        blastR: 0.5, blockDmg: 25, acid: true, size: 0.06,
      });
      VX.Audio.bite();
    }

    detonate(game) {
      if (this.dead) return;
      const dir = [0, 1, 0];
      this.dead = true;
      game.explode({ x: this.x, y: this.y + 0.8, z: this.z, R: 2.6, dmg: 42 + game.floor * 2, selfK: 1 });
      this.body.collapse(game.gibs, 0, 0, 6);
      for (let i = 0; i < 30; i++) game.particles.spawn(this.x, this.y + 1, this.z, M.rand(-5, 5), M.rand(1, 6), M.rand(-5, 5), 0.6, 0.9, 0.2, M.rand(0.04, 0.1), M.rand(1, 3), 0.6);
      this.reward(game, dir);
    }

    land(game) {
      const b = this.body;
      this.fallT = 0; this.crawlC = 1;
      const shift = b.height * 0.45;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      for (const k of [1, 0.6, 0.3, 0]) {
        const nx = this.x + fx * shift * k, nz = this.z + fz * shift * k;
        if (k === 0 || !game.world.boxCollides(nx - this.radius, this.y + 0.05, nz - this.radius, nx + this.radius, this.y + 0.45, nz + this.radius)) {
          this.x = nx; this.z = nz; b.fwdOff = -shift * k; break;
        }
      }
      game.shake(0.05);
      VX.Audio.punch();
      for (let i = 0; i < 10; i++)
        game.particles.spawn(this.x + M.rand(-0.5, 0.5), this.y + 0.05, this.z + M.rand(-0.5, 0.5), M.rand(-1.5, 1.5), M.rand(0.5, 2), M.rand(-1.5, 1.5), 0.25, 0.22, 0.22, 0.05, 0.8);
    }

    // ---------------- Animación ----------------
    animate(dt, spd) {
      if (this.T.quad) return this.animateDog(dt, spd);
      const b = this.body, P_ = b.byName, T = this.T;
      this.walkT += dt * (spd > 0 ? (this.crawling ? 5.5 : spd * 3.2 * this.gait) : 1.2);
      const moving = spd > 0.05 || (this.crawling && this.fallT <= 0);
      const sw = Math.sin(this.walkT) * (moving ? 0.6 : 0.05);
      const k = this.windup > 0 ? 1 - this.windup / (this.windTotal || 0.45) : 0;
      const fl = this.fl;

      const S = {};
      const limpL = this.body.ratio('legL') < 0.8 ? 0.5 : 1, limpR = this.body.ratio('legR') < 0.8 ? 0.5 : 1;
      S.legL = sw * limpL; S.legR = -sw * limpR;
      let arm = -1.35 + Math.sin(this.walkT * 0.5) * 0.12;
      if (T.ranged) arm = -0.5 + Math.sin(this.walkT) * 0.2;
      if (T.explode) arm = -0.3 + Math.sin(this.walkT) * 0.25;
      S.armL = arm + Math.sin(this.walkT) * 0.15; S.armR = arm - Math.sin(this.walkT) * 0.15;
      if (T.shield) { S.armL = -1.5; }
      if (this.body.ratio('armL') < 0.6) S.armL = 0.1 + sw * 0.4;
      if (this.body.ratio('armR') < 0.6) S.armR = 0.1 - sw * 0.4;
      S.armLz = -0.12; S.armRz = 0.12;
      S.torso = 0.12 + T.lean * 0.5; S.torsoZ = Math.sin(this.walkT) * 0.06;
      S.head = Math.sin(this.walkT * 2) * 0.05; S.headZ = this.tilt + Math.sin(this.walkT * 0.37) * 0.12;
      S.pitch = 0.04 + T.lean; S.yOff = Math.abs(Math.sin(this.walkT)) * 0.03 * (moving ? 1 : 0.2);
      if (this.climbing > 0) { S.pitch = -0.55; S.armL = S.armR = -2.9 + sw * 0.8; }
      if (this.dodging > 0) S.torsoZ += this.sideDir * 0.35;
      if (this.windup > 0) {
        if (this.spitting) {
          const e = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3;
          S.torso = 0.12 - e * 0.45 + (k > 0.7 ? 0.6 : 0); S.head = -e * 0.6 + (k > 0.7 ? 0.5 : 0);
        } else if (this.biter) {
          const lunge = Math.sin(k * Math.PI);
          S.torso = 0.35 + lunge * 0.55; S.head = 0.2 + lunge * 0.5; S.pitch += lunge * 0.15;
        } else {
          const pull = k < 0.55 ? k / 0.55 : 1 - (k - 0.55) / 0.45;
          const swing = k < 0.55 ? -1.35 - pull * 1.5 : -2.85 + ((k - 0.55) / 0.45) * 2.1;
          if (!this.body.broken('armR')) S.armR = swing;
          if (!this.body.broken('armL') && !T.shield) S.armL = swing + (this.armsLost ? 0 : 0.15);
          S.torso += k < 0.55 ? -pull * 0.25 : (k - 0.55) / 0.45 * 0.45;
          S.pitch += k > 0.55 ? 0.1 : 0;
        }
      } else if (this.biter) { S.torso = 0.35; S.head = 0.2; }
      if (this.fuse > 0) { S.armL = S.armR = -2.8; S.head = -0.4; S.torsoZ += Math.sin(this.fuse * 50) * 0.08; }
      if (this.spawnT > 0) { S.armL = S.armR = -2.9 + Math.sin(this.walkT * 3) * 0.2; S.head = 0.4; }

      const C = {};
      C.legL = sw * 0.25; C.legR = -sw * 0.25;
      C.armL = -2.9 + Math.sin(this.walkT) * 0.7; C.armR = -2.9 - Math.sin(this.walkT) * 0.7;
      C.armLz = -0.3; C.armRz = 0.3;
      C.torso = 0; C.torsoZ = Math.sin(this.walkT) * 0.1;
      C.head = -0.85 + Math.sin(this.walkT * 2) * 0.1 + (this.windup > 0 ? Math.sin(k * Math.PI) * 0.6 : 0);
      C.headZ = this.tilt * 0.5;
      C.pitch = 1.42; C.yOff = 0.03;
      if (this.fallT > 0) C.armL = C.armR = -2.6;

      const c = this.crawlC;
      const mix = (a, bb) => a + (bb - a) * c;
      P_.legL.ax = mix(S.legL, C.legL); P_.legR.ax = mix(S.legR, C.legR);
      P_.armL.ax = mix(S.armL, C.armL); P_.armR.ax = mix(S.armR, C.armR);
      P_.armL.az = mix(S.armLz, C.armLz); P_.armR.az = mix(S.armRz, C.armRz);
      P_.torso.ax = mix(S.torso, C.torso) + fl.x; P_.torso.az = mix(S.torsoZ, C.torsoZ) + fl.z;
      P_.head.ax = mix(S.head, C.head) + fl.x * 1.4; P_.head.az = mix(S.headZ, C.headZ) + fl.z * 1.2;
      if (P_.shield) { P_.shield.ax = -0.05 + fl.x * 0.5; P_.shield.az = Math.sin(this.walkT) * 0.04; }
      b.pitch = mix(S.pitch, C.pitch);
      if (this.spawnT <= 0) b.yOff = mix(S.yOff, C.yOff);
    }

    animateDog(dt, spd) {
      const b = this.body, P_ = b.byName, fl = this.fl;
      this.walkT += dt * (spd > 0 ? spd * 2.6 : 1);
      const moving = spd > 0.05;
      const g = Math.sin(this.walkT) * (moving ? 0.75 : 0.04);
      P_.armL.ax = g; P_.armR.ax = g * 0.8;          // galope: delanteras juntas
      P_.legL.ax = -g; P_.legR.ax = -g * 0.8;        // traseras al contrario
      P_.torso.ax = (moving ? Math.sin(this.walkT) * 0.08 : 0) + fl.x;
      P_.torso.az = fl.z;
      const k = this.windup > 0 ? 1 - this.windup / (this.windTotal || 0.25) : 0;
      P_.head.ax = 0.1 + Math.sin(this.walkT * 2) * 0.06 + (this.windup > 0 ? -Math.sin(k * Math.PI) * 0.5 : 0) + fl.x;
      P_.head.az = this.tilt * 0.5;
      b.pitch = this.windup > 0 ? -Math.sin(k * Math.PI) * 0.25 : 0;
      if (this.spawnT <= 0) b.yOff = moving ? Math.abs(Math.sin(this.walkT)) * 0.08 : 0;
    }

    tryMove(dx, dz, world) {
      const r = Math.min(this.radius, 0.22), h = this.crawling ? 0.45 : (this.T.quad ? 0.75 : 1.4);
      const nx = this.x + dx, nz = this.z + dz;
      // altura de referencia: la real bajo los pies (this.y puede ir un poco por detrás al subir)
      const fy = this.state === 'leap' ? this.y : Math.max(this.y, world.groundAt(this.x, this.z));
      let g = world.groundAt(nx, nz);
      this.blockedH = 0;
      if (g - fy > 0.55) { this.blockedH = g; return false; }
      // el pie puede apoyarse en el escalón de al lado (escaleras empinadas de 2 en 2 vóxeles)
      const rr = r + 0.002, c0 = g;
      for (const [ox, oz] of [[-rr, -rr], [rr, -rr], [-rr, rr], [rr, rr]]) {
        const gg = world.groundAt(nx + ox, nz + oz);
        if (gg > g && gg - c0 <= 0.55 && gg - fy <= 1.05) g = gg;
      }
      const base = Math.max(g, fy) + 0.06;
      if (!world.boxCollides(nx - r, base, nz - r, nx + r, base + h, nz + r)) { this.x = nx; this.z = nz; return true; }
      this.blockedH = this.y + 1.5;
      return false;
    }

    // ---------------- Daño ----------------
    hit(hit, dmg, ray, game, opts) {
      if (this.dead) return false;
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      const b = this.body;
      const pn = hit.part.name;
      const dir = [ray.dx, ray.dy, ray.dz];
      // el escudo para las balas: solo se abolla
      if (hit.part.armor) {
        const p = hit.part, r2 = (b.v * (1.2 + dmg / 40)) ** 2;
        let n = 0;
        for (const v of p.vox) if (v.alive && (v.wx - hit.vox.wx) ** 2 + (v.wy - hit.vox.wy) ** 2 + (v.wz - hit.vox.wz) ** 2 < r2) { v.alive = false; n++; }
        p.alive -= n;
        VX.updateExposure(p);
        game.particles.sparks(hit.vox.wx, hit.vox.wy, hit.vox.wz, -dir[0], 0.3, -dir[2], 6);
        VX.Audio.wall();
        this.kx += dir[0] * 0.8; this.kz += dir[2] * 0.8;
        if (p.alive / p.total < 0.35) { b.detach('shield', game.gibs, dir[0] * 2, 1.5, dir[2] * 2); game.hud.toast('¡Escudo destrozado!'); }
        return false;
      }
      const mult = pn === 'head' ? 2.5 : (pn.startsWith('arm') || pn.startsWith('leg') ? 0.7 : 1);
      this.hp -= dmg * mult;
      b.flash = 0.8;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      const along = dir[0] * fx + dir[2] * fz, side = dir[0] * fz - dir[2] * fx;
      const pow = Math.min(1.5, 0.4 + dmg / 40);
      this.fl.vx += along * 7 * pow; this.fl.vz += -side * 5 * pow;
      const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles);
      const ex = hit.vox.wx, ey = hit.vox.wy, ez = hit.vox.wz;
      game.particles.blood(ex, ey, ez, -dir[0] * 0.5, 0.3, -dir[2] * 0.5, 5);
      game.particles.blood(ex + dir[0] * 0.3, ey + dir[1] * 0.3, ez + dir[2] * 0.3, dir[0] * 1.5, dir[1], dir[2] * 1.5, 8 + Math.min(10, dmg / 6 | 0));
      this.kx += dir[0] * (0.8 + dmg / 35); this.kz += dir[2] * (0.8 + dmg / 35);
      let total = 0; for (const k in removed) total += removed[k];
      if (total > 12 && !(opts && opts.slash)) {
        VX.Audio.splat();                 // la bala sale por el otro lado
        game.wallSplat(ex, ey, ez, dir);  // y mancha la pared de detrás
      } else VX.Audio.flesh();
      if (game.weapon.mods.fire && !(opts && opts.slash)) this.burn = 3;
      if (game.weapon.mods.lifesteal) game.player.heal(0.6);
      return this.afterDamage(removed, dir, game);
    }

    blast(x, y, z, R, dmg, game) {
      if (this.dead) return false;
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      const b = this.body;
      const v = b.nearestVoxel(x, y, z);
      if (!v) return false;
      this.hp -= dmg;
      b.flash = 1;
      const dx = v.wx - x, dz = v.wz - z, l = Math.hypot(dx, dz) || 1;
      const dir = [dx / l, 0.3, dz / l];
      const removed = b.carveSphere(v.wx, v.wy, v.wz, 0.18 + dmg / 280, game.particles, dir[0], 0.6, dir[2], 20);
      this.kx += dir[0] * 6; this.kz += dir[2] * 6;
      this.fl.vx += 8;
      return this.afterDamage(removed, dir, game);
    }

    afterDamage(removed, dir, game) {
      const b = this.body;
      const res = b.afterCarve(removed, game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5);
      if (Object.keys(res).length) VX.Audio.snap();
      if (res.torso === 'halved') { game.hud.toast('¡PARTIDO EN DOS!'); this.hp = 0; }
      if (b.broken('head', 0.55)) {
        if (!b.byName.head.detached) b.detach('head', game.gibs, dir[0] * 3, 2.5, dir[2] * 3);
        game.stats.headshots++;
        VX.Profile.add('headshots', 1, game);
        VX.Profile.addW(this.lastW, 'heads', 1, game);
        this.hp = 0;
      }
      const legGone = b.broken('legL', 0.45) || b.broken('legR', 0.45);
      if (this.T.quad) {
        // el perro cojea con cualquier pata rota
        if (legGone || b.broken('armL', 0.45) || b.broken('armR', 0.45)) this.limp = true;
      } else {
        if (legGone && !this.crawling && this.hp > 0) {
          this.crawling = true;
          this.fallT = FALL_TIME;
          this.windup = 0; this.spitting = false;
          game.hud.toast('¡Pierna destrozada!');
        }
        this.armsLost = (b.broken('armL', 0.4) ? 1 : 0) + (b.broken('armR', 0.4) ? 1 : 0);
        if (this.armsLost >= 2 && !this.biter) { this.biter = true; if (!this.spitting) this.windup = 0; }
      }
      if (b.ratio('torso') < 0.4) this.hp = 0;
      if (this.hp <= 0) { this.die(dir, game); return true; }
      return false;
    }

    die(dir, game) {
      if (this.dead) return;
      this.dead = true;
      const b = this.body;
      // el explosivo revienta también al morir (reacción en cadena)
      if (this.T.explode) game.queueExplosion({ x: this.x, y: this.y + 0.8, z: this.z, R: 2.6, dmg: 42 + game.floor * 2, selfK: 1, delay: 0.25 });
      else if (game.weapon.mods.corpseBlast) game.queueExplosion({ x: this.x, y: this.y + 0.7, z: this.z, R: 1.7, dmg: 40, selfK: 0, delay: 0.3 });
      b.collapse(game.gibs, dir[0], dir[2], 2.2);
      game.particles.blood(this.x, this.y + 0.9, this.z, dir[0], 0.5, dir[2], 14);
      VX.Audio.zombieDie();
      this.reward(game, dir);
    }

    reward(game) {
      game.pickups.dropGold(this.x, this.y + 0.8, this.z, M.randInt(this.gold[0], this.gold[1]) * (game.weapon.mods.greed ? 2 : 1));
      game.stats.kills++;
      VX.Profile.add('kills', 1, game);
      if (game.dmgSource === 'knife') VX.Profile.add('knifeKills', 1, game);
      VX.Profile.addW(this.lastW, 'kills', 1, game);
      if (this.elite) VX.Profile.addW(this.lastW, 'elites', 1, game);
      if (game.weapon.mods.lifesteal) game.player.heal(3);
      game.onKill(this);
    }

    render(batch) { this.body.render(batch); }
  }

  Zombie.TYPES = TYPES;
  VX.Zombie = Zombie;
})();
