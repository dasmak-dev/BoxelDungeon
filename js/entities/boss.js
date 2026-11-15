// Jefes: zombis gigantes con patrones de proyectiles (medio "bullet hell"),
// 3 fases, regeneración de carne y ataques cuerpo a cuerpo.
// Destrozarles la cabeza NO les mata: solo se mueren al quedarse sin vida.
(function () {
  const M = VX.M;
  const dirTmp = [0, 0];
  const PINK = [1, 0.25, 0.6], ORANGE = [1, 0.55, 0.12], PURPLE = [0.7, 0.3, 1], RED = [1, 0.15, 0.1];

  const GREEN = [0.5, 1, 0.3], CYAN = [0.4, 0.9, 1], VOID = [0.75, 0.3, 1];
  // Cada jefe tiene su estilo:
  //  coloso    → SALTA sobre ti, ondas de choque y levanta esqueletos (cuerpo a cuerpo / plataformas)
  //  ancestro  → BULLET HELL clásico: espirales, calaveras teledirigidas y teletransporte
  //  capataz   → LANZA COSAS: cartuchos de dinamita, derrumbes de rocas y barridos con el pico
  //  carnicero → EMBISTE y te ENGANCHA con su cadena para traerte a su cuchilla giratoria
  //  reina     → HORDAS: pare crías, nubes de esporas y raíces que brotan bajo tus pies
  //  guardian  → (secreto) rayos giratorios, teletransportes y orbes del vacío
  //  corazon   → (final) un poco de todos
  const BOSSES = [
    { id: 'coloso', name: 'EL COLOSO PUTREFACTO', hp: 3000, speed: 1.7, dmg: 30, col: ORANGE, minions: 'skeleton',
      patterns: [['leap', 'slam', 'rocks', 'raise'], ['leap', 'slam', 'leap3', 'rocks', 'raise'], ['leap3', 'slam', 'raise', 'ring', 'leap']] },
    { id: 'ancestro', name: 'EL ANCESTRO HUECO', hp: 2600, speed: 1.5, dmg: 24, col: PURPLE, hover: true,
      patterns: [['spiral', 'homing', 'fan', 'blink'], ['spiral', 'rain', 'homing', 'ring', 'blink'], ['spiral2', 'rain', 'homing', 'ringGap', 'blink']] },
    { id: 'capataz', name: 'EL CAPATAZ', hp: 2800, speed: 2.0, dmg: 30, col: ORANGE, minions: 'walker',
      patterns: [['dynamite', 'sweep', 'rockfall'], ['dynamite', 'sweep', 'rockfall', 'charge', 'dynamite'], ['dynamite3', 'rockfall', 'sweep', 'charge', 'raise']] },
    { id: 'carnicero', name: 'EL CARNICERO', hp: 2600, speed: 2.4, dmg: 32, col: RED, minions: 'ember',
      patterns: [['hook', 'charge', 'spin'], ['hook', 'charge', 'spin', 'wall'], ['hook', 'charge3', 'spin', 'wall', 'hook']] },
    { id: 'reina', name: 'LA REINA MICELIO', hp: 3200, speed: 0.9, dmg: 26, col: GREEN, minions: 'rat',
      patterns: [['brood', 'spores', 'roots'], ['brood', 'spores', 'roots', 'fan'], ['brood', 'roots', 'spores', 'spiral', 'brood']] },
    { id: 'guardian', name: 'EL GUARDIÁN DEL VACÍO', hp: 3600, speed: 2.0, dmg: 30, col: VOID, hover: true,
      patterns: [['laser', 'blink', 'homing'], ['laser', 'blink', 'spiral2', 'homing'], ['laser2', 'blink', 'spiral2', 'rain', 'homing']] },
    { id: 'corazon', name: 'EL CORAZÓN DE LA MAZMORRA', hp: 5200, speed: 1.4, dmg: 34, col: RED, minions: 'skeleton',
      patterns: [['brood', 'ring', 'leap', 'dynamite'], ['hook', 'spin', 'laser', 'leap3', 'rockfall'], ['laser2', 'spiral2', 'brood', 'dynamite3', 'leap3', 'roots']] },
    { id: 'tanque', name: 'EL TANQUE DE CARNE', hp: 3400, speed: 1.6, dmg: 32, col: RED, minions: 'runner', horde: true,
      patterns: [['charge', 'slam', 'raise'], ['charge', 'slam', 'raise', 'leap'], ['charge3', 'slam', 'raise', 'leap3', 'raise']] },
  ];

  class Boss {
    constructor(x, z, floor, bossNum, forceId) {
      const T = BOSSES.find((b) => b.id === forceId) || M.choice(BOSSES.filter((b) => !b.horde));
      this.T = T;
      this.name = T.name;
      this.isBoss = true;
      const cfg = VX.Models.bossConfigs[T.id];
      let model = cfg.quad ? VX.Models.quadruped(cfg) : VX.Models.humanoid(cfg);
      if (cfg.tool) model = VX.Models.addTool(model, cfg);
      this.body = new VX.VoxelBody(model, 1);
      this.quad = !!cfg.quad;
      const P_ = this.body.byName;
      P_.legL.noBreak = P_.legR.noBreak = P_.head.noBreak = P_.torso.noBreak = true;
      this.x = x; this.z = z; this.y = 0; this.vy = 0;
      this.maxHp = this.hp = T.hp * (1 + bossNum * 0.6) * (1 + floor * 0.04);
      const ck = VX.Coop.dungeonK();   // mazmorra en cooperativo: +70 % de vida por compañero
      if (ck) this.maxHp = this.hp = this.hp * (1 + 0.7 * ck);
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

    // Punto de aterrizaje dentro de la sala, lejos de las paredes y sin obstáculos
    safeLanding(game, tx, tz) {
      const r = game.currentRoom, S = VX.S, m = 2.2;
      if (!r) return [this.x, this.z];
      const x0 = (r.ox + 2) * S + m, x1 = (r.ox + r.W - 2) * S - m, z0 = (r.oz + 2) * S + m, z1 = (r.oz + r.D - 2) * S - m;
      tx = M.clamp(tx, x0, x1); tz = M.clamp(tz, z0, z1);
      const rad = this.radius;
      const free = (x, z) => {
        const g = game.world.groundAt(x, z);
        return r.contains(x, z) && Math.abs(g - this.y) < 2.5 && !game.world.boxCollides(x - rad, g + 0.4, z - rad, x + rad, g + 3.2, z + rad);
      };
      // si el punto está ocupado, se acerca poco a poco al jefe hasta encontrar hueco
      for (let k = 0; k <= 10; k++) {
        const x = M.lerp(tx, this.x, k / 10), z = M.lerp(tz, this.z, k / 10);
        if (free(x, z)) return [x, z];
      }
      return [this.x, this.z];
    }

    // ---------------- Patrones ----------------
    startPattern(name) {
      this.pattern = { name, t: 0, k: 0, a: Math.random() * 6.28, n: 0 };
      this.state = 'cast';
      this.lastPattern = name;
      if (name === 'slam') { this.state = 'slamUp'; this.stateT = 0.9; VX.Audio.roar(); this.pattern = null; }
      else if (name === 'leap' || name === 'leap3') { this.state = 'leapWind'; this.stateT = 0.55; this.leaps = name === 'leap3' ? 3 : 1; this.pattern = null; VX.Audio.roar(); }
      else if (name === 'hook') { this.state = 'hookWind'; this.stateT = 0.6; this.pattern = null; }
      else if (name === 'spin') { this.state = 'spin'; this.stateT = 1.8 + this.phase * 0.4; this.spinTick = 0; this.pattern = null; VX.Audio.roar(); }
      else if (name === 'sweep') { this.state = 'sweepWind'; this.stateT = 0.5; this.pattern = null; }
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
            const top = room ? (room.ceilBase + 4) * VX.S - 0.6 : 4;
            const gy = game.world.groundAt(x, z);
            B.add({ x, y: top, z, vx: 0, vy: -4, vz: 0, dmg: dmg * 1.6, col: ORANGE, r: 0.25, fall: true, delay: 0.9, delay0: 0.9, gy, life: 4 });
            p.n++;
          }
          return p.t > 0.12 * (14 + ph * 6) + 1.5;
        }
        case 'dynamite': case 'dynamite3': {
          // lanza cartuchos que se quedan humeando en el suelo y explotan
          const n = p.name === 'dynamite3' ? 5 : 2 + ph;
          if (p.t > 0.35 && every(0.32) && p.n < n) {
            const spread = p.n === 0 ? 0 : 2.4;
            const tx = P.x + P.vx * 0.5 + M.rand(-spread, spread), tz = P.z + P.vz * 0.5 + M.rand(-spread, spread);
            const sx = this.x, sy = this.y + this.body.height * 0.9, sz = this.z;
            const T = 0.8 + Math.hypot(tx - sx, tz - sz) * 0.04;
            game.projectiles.push({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (P.y + 0.2 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
              dmg: this.dmg, life: 4, rot: 0, col: [0.8, 0.15, 0.1], glow: 0.4, size: 0.05, dynamite: true });
            p.n++; VX.Audio.swish();
          }
          return p.t > 0.5 + n * 0.32;
        }
        case 'rockfall': {
          // derrumbe: rocas que caen del techo con aviso en el suelo
          if (every(0.1) && p.n < 18 + ph * 6) {
            const a = Math.random() * 6.28, d = p.n < 2 ? 0 : M.rand(0.5, 7);
            const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
            const room = game.currentRoom, top = room ? room.ceilBase * VX.S - 0.4 : 4;
            B.add({ x, y: top, z, vx: 0, vy: -4, vz: 0, dmg: dmg * 1.7, col: [0.4, 0.36, 0.32], r: 0.32, fall: true, delay: 0.8, delay0: 0.8, gy: game.world.groundAt(x, z), life: 4 });
            p.n++;
            if (p.n % 4 === 0) game.shake(0.12);
          }
          return p.t > 0.1 * (18 + ph * 6) + 1.4;
        }
        case 'raise': {
          if (p.t < 0.05 && game.enemies.filter((e) => !e.dead && !e.isBoss).length > 7) return true;
          // levanta a sus súbditos del suelo
          if (p.n === 0 && p.t > 0.4) {
            p.n = 1;
            for (let i = 0; i < 2 + ph; i++) game.spawner.spawnZombieNear(game, this.x, this.z, 7, this.T.minions || 'walker');
            VX.Audio.roar(); game.shake(0.3);
          }
          return p.t > 1.2;
        }
        case 'brood': {
          if (p.t < 0.05 && game.enemies.filter((e) => !e.dead && !e.isBoss).length > 7) return true;   // ya hay bastante cría
          // pare crías: bolsas de esporas que revientan y sueltan bichos
          if (p.t > 0.4 && every(0.45) && p.n < 2 + ph) {
            const a = Math.random() * 6.28, d = M.rand(3, 7);
            const tx = this.x + Math.sin(a) * d, tz = this.z + Math.cos(a) * d;
            const sx = this.x, sy = this.y + 1.6, sz = this.z, T = 0.9;
            game.projectiles.push({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (0.3 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
              dmg: 6, life: 4, rot: 0, col: [0.5, 0.9, 0.4], glow: 0.6, size: 0.1, spawn: this.T.minions || 'rat', acid: true });
            p.n++; VX.Audio.bite();
          }
          return p.t > 0.6 + (2 + ph) * 0.45;
        }
        case 'spores': {
          // nubes de esporas venenosas alrededor del jugador
          if (p.t > 0.3 && every(0.5) && p.n < 3 + ph) {
            const a = Math.random() * 6.28, d = p.n === 0 ? 0 : M.rand(1.5, 4);
            game.addFire(P.x + Math.sin(a) * d, P.z + Math.cos(a) * d, 1.6, 5, 'poison');
            p.n++; VX.Audio.splat();
          }
          return p.t > 0.5 + (3 + ph) * 0.5;
        }
        case 'roots': {
          // raíces que brotan bajo tus pies (círculo de aviso primero)
          if (p.t > 0.2 && every(0.35) && p.n < 4 + ph * 2) {
            const lead = p.n === 0 ? 0 : 0.6;
            game.telegraphs.push({ x: P.x + P.vx * lead + M.rand(-1, 1) * (p.n ? 1 : 0), z: P.z + P.vz * lead + M.rand(-1, 1) * (p.n ? 1 : 0), r: 1.1, t: 0, delay: 0.85, dmg: dmg * 1.6, kind: 'roots' });
            p.n++;
          }
          return p.t > 0.4 + (4 + ph * 2) * 0.35 + 1;
        }
        case 'laser': case 'laser2': {
          // rayo giratorio: un chorro continuo de orbes que barre la sala
          const beams = p.name === 'laser2' ? 2 : 1;
          if (p.t < 0.6) { if (every(0.15)) game.particles.spawn(mx, my, mz, M.rand(-1, 1), M.rand(-1, 1), M.rand(-1, 1), col[0], col[1], col[2], 0.08, 0.4, 1, 1); return false; }
          if (p.n === 0) { p.a = this.aimAt(P) - 1.2; p.n = 1; p.dir = Math.random() < 0.5 ? 1 : -1; VX.Audio.phase(); }
          if (every(0.035)) {
            p.a += 0.06 * p.dir * (1 + ph * 0.2);
            for (let b = 0; b < beams; b++) {
              const a = p.a + b * Math.PI;
              B.add({ x: mx, y: this.y + 1.0, z: mz, vx: Math.sin(a) * 14, vy: 0, vz: Math.cos(a) * 14, dmg: dmg * 0.7, col, r: 0.16, life: 2 });
            }
          }
          return p.t > 3.4 + ph * 0.4;
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
      if (pick === 'sweep' && dist > 6) pick = M.choice(list.filter((n) => n !== 'sweep')) || pick;
      if ((pick === 'hook') && dist < 3) pick = 'spin';
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
          if (v.alive || v.ghost) continue;
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
      if (!this.airborne) {
        if (this.y > g + 0.02) { this.vy -= 18 * dt; this.y = Math.max(g, this.y + this.vy * dt); }
        else { this.y = M.lerp(this.y, g, Math.min(1, dt * 10)); this.vy = 0; }
      }
      b.y = this.y + (this.T.hover ? 0.5 + Math.sin(game.time * 2) * 0.15 : 0);
      this.regenerate(dt);
      // Tanque de carne: cada 20 % de vida perdida se le desprenden corredores
      if (this.T.id === 'tanque' && this.state !== 'intro') {
        const step = Math.floor((1 - this.hp / this.maxHp) * 5);
        if (step > (this.burstN || 0) && !this.dead) {
          this.burstN = step;
          const n = 3 + Math.min(2, step);
          for (let k = 0; k < n; k++) {
            const z = game.spawner.spawnZombieNear(game, this.x, this.z, 3, 'runner');
            if (z && game.mode === 'horde' && VX.HordeMode.phase === 'wave') { VX.HordeMode.spawned++; VX.HordeMode.total++; }
          }
          for (let i = 0; i < 50; i++) game.particles.spawn(this.x, this.y + 2, this.z, M.rand(-5, 5), M.rand(1, 6), M.rand(-5, 5), 0.6, 0.08, 0.08, M.rand(0.05, 0.12), M.rand(1, 2.2));
          A.at(this.x, this.y + 2, this.z, () => { A.splat(); A.roar(); }, 6);
          game.shake(0.4);
          game.hud.toast('¡Se le desprenden corredores!');
        }
      }

      const room = game.currentRoom;
      if (room && !this.airborne && !room.contains(this.x, this.z)) {
        const c = room.randomFreeCell(4, P.x, P.z, 6) || { x: room.centerX(), z: room.centerZ() };
        this.x = c.x; this.z = c.z; this.y = game.world.groundAt(c.x, c.z);
        for (let i = 0; i < 30; i++) game.particles.spawn(this.x, this.y + 1, this.z, M.rand(-3, 3), M.rand(0, 4), M.rand(-3, 3), 0.3, 0.27, 0.25, 0.12, 1);
      }
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
        if (this.T.minions) for (let i = 0; i < 2 + this.phase; i++) game.spawner.spawnZombieNear(game, this.x, this.z, 6, this.T.minions);
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

        // ---- salto: se agacha, vuela en arco hasta donde estás y aterriza con onda de choque ----
        case 'leapWind':
          P_.armL.ax = P_.armR.ax = -0.6; b.yOff = -0.25 * (1 - this.stateT / 0.55);
          if (this.stateT <= 0) {
            const [tx, tz] = this.safeLanding(game, P.x + P.vx * 0.45, P.z + P.vz * 0.45), T = 0.85;
            this.leap = { sx: this.x, sz: this.z, tx, tz, t: 0, T, y0: this.y };
            this.state = 'leap'; this.stateT = T; b.yOff = 0;
            game.telegraphs.push({ x: tx, z: tz, r: 2.6, t: 0, delay: T, dmg: 0, kind: 'warn' });
          }
          break;
        case 'leap': {
          const L = this.leap; L.t += dt;
          const k = Math.min(1, L.t / L.T);
          this.x = M.lerp(L.sx, L.tx, k); this.z = M.lerp(L.sz, L.tz, k);
          const g2 = game.world.groundAt(this.x, this.z);
          this.y = M.lerp(L.y0, g2, k) + Math.sin(k * Math.PI) * 4.5;
          this.airborne = true;
          P_.armL.ax = P_.armR.ax = -2.9;
          if (k >= 1) {
            const r = this.radius, room = game.currentRoom;
            if (game.world.boxCollides(this.x - r, g2 + 0.55, this.z - r, this.x + r, g2 + 3.2, this.z + r) || (room && !room.insideDeep(this.x, this.z))) { this.x = L.sx; this.z = L.sz; }
            this.airborne = false; this.y = game.world.groundAt(this.x, this.z);
            A.slam(); game.shake(0.8);
            if (dist < 3) { P.damage(this.dmg * 1.1, this.x, this.z, game); P.knock(dx / (dist || 1) * 10, dz / (dist || 1) * 10, 5); }
            game.shockwaves.push({ x: this.x, y: this.y, z: this.z, r: 0.5, max: 10 + this.phase * 3, speed: 8, dmg: this.dmg * 0.6, hit: false });
            game.world.damageSphere(this.x, this.y + 0.3, this.z, 2.2, 160, game);
            for (let i = 0; i < 24; i++) game.particles.spawn(this.x + M.rand(-2, 2), this.y + 0.2, this.z + M.rand(-2, 2), M.rand(-5, 5), M.rand(2, 6), M.rand(-5, 5), 0.3, 0.27, 0.25, M.rand(0.1, 0.22), 1.6);
            this.leaps--;
            if (this.leaps > 0) { this.state = 'leapWind'; this.stateT = 0.35; }
            else { this.state = 'recover'; this.stateT = 0.9; }
          }
          break;
        }

        // ---- gancho: lanza la cadena; si te alcanza, te arrastra hacia él ----
        case 'hookWind':
          P_.armR.ax = -2.6; P_.armL.ax = -0.8;
          if (this.stateT <= 0) {
            this.hookDir = this.aimAt(P);
            this.chain = { a: this.hookDir, len: 0, t: 0, hit: false };
            this.state = 'hook'; this.stateT = 0.9;
            A.swish();
          }
          break;
        case 'hook': {
          const C = this.chain; C.t += dt;
          C.len = Math.min(16, C.len + dt * 34);
          P_.armR.ax = -1.6;
          const hx = this.x + Math.sin(C.a) * C.len, hz = this.z + Math.cos(C.a) * C.len;
          C.x = hx; C.z = hz;
          if (!C.hit && Math.hypot(P.x - hx, P.z - hz) < 0.9 && this.state === 'hook') {
            C.hit = true; VX.Audio.bite();
            P.damage(this.dmg * 0.4, hx, hz, game);
          }
          if (C.hit) {
            // arrastre hacia el carnicero
            const l = Math.hypot(dx, dz) || 1;
            P.knock(-dx / l * 26 * dt * 4, -dz / l * 26 * dt * 4, 0);
            C.x = P.x; C.z = P.z;
            if (dist < 2.6) { this.chain = null; this.state = 'spin'; this.stateT = 1.2; this.spinTick = 0; break; }
          }
          if (this.stateT <= 0 || (!game.world.lineOfSight(this.x, this.y + 1.2, this.z, hx, this.y + 1.2, hz))) { this.chain = null; this.state = 'recover'; this.stateT = 0.5; }
          break;
        }

        // ---- giro con la cuchilla: todo lo que esté cerca recibe ----
        case 'spin': {
          b.yaw += dt * 14;
          P_.armL.ax = P_.armR.ax = -1.5; P_.armL.az = -1.3; P_.armR.az = 1.3;
          moveSpeed = this.speed * 0.9; mx = dx / (dist || 1); mz = dz / (dist || 1);
          this.spinTick -= dt;
          if (this.spinTick <= 0) {
            this.spinTick = 0.3;
            if (dist < 3.3) { P.damage(this.dmg * 0.55, this.x, this.z, game); P.knock(dx / (dist || 1) * 8, dz / (dist || 1) * 8, 2); }
            game.bullets.ring(this.x, this.y + 0.6, this.z, 10 + this.phase * 4, 5, { angle: b.yaw, b: { dmg: this.bulletDmg, col: ORANGE, r: 0.15 } });
            A.swish();
          }
          if (this.stateT <= 0) { this.state = 'recover'; this.stateT = 0.6; }
          break;
        }

        // ---- barrido con el pico: arco delante y rocas a ras de suelo ----
        case 'sweepWind':
          P_.armR.ax = -3.0; P_.armR.az = 0.8;
          if (this.stateT <= 0) {
            A.swish(); A.slam(); game.shake(0.3);
            const a0 = this.aimAt(P);
            if (dist < 4.2) { P.damage(this.dmg, this.x, this.z, game); P.knock(dx / (dist || 1) * 9, dz / (dist || 1) * 9, 3); }
            game.bullets.fan(this.x, this.y + 0.35, this.z, a0, 9 + this.phase * 3, 1.6, 6.5, { b: { dmg: this.bulletDmg, col: [0.45, 0.4, 0.35], r: 0.2 } });
            game.world.damageSphere(this.x + Math.sin(a0) * 2.5, this.y + 0.6, this.z + Math.cos(a0) * 2.5, 1.6, 160, game);
            this.state = 'recover'; this.stateT = 0.6;
          }
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

      if (this.state === 'spin') { /* gira solo */ }
      else if (this.state !== 'charge') {
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
      if (this.quad) {   // la reina camina a cuatro patas; al conjurar se encabrita un poco
        const rear = this.state === 'cast' ? 0.35 : 0;
        P_.armL.ax = -sw - rear; P_.armR.ax = sw - rear; P_.armL.az = P_.armR.az = 0; P_.torso.ax = -rear * 0.5;
      }
      // mandíbula: rugido al conjurar, al cambiar de fase y al golpear
      if (P_.jaw && !P_.jaw.detached) {
        const roar = this.state === 'phase' || this.state === 'intro' || this.state === 'cast' || this.state === 'leapWind' || this.state === 'hookWind';
        P_.jaw.ax = M.lerp(P_.jaw.ax, roar ? 0.7 + Math.sin(game.time * 30) * 0.08 : 0.08 + Math.max(0, Math.sin(this.walkT * 0.5)) * 0.12, Math.min(1, dt * 10));
      }
      for (const p of b.parts) if (!p.detached && p.flicker) { p.ax = Math.sin(game.time * 9 + p.alive) * 0.1; }
      if (this.state !== 'slamUp' && this.state !== 'leapWind') b.yOff = Math.abs(Math.sin(this.walkT)) * 0.05;
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
      if (VX.Codex && VX.Codex.bonus && game.dmgSource) dmg *= VX.Codex.bonus('boss:' + this.T.id);   // conocer al enemigo (bestiario)
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      if (this.dead) return false;
      if (game.localAct && !game.visualOnly) VX.Coop.noteHit && VX.Coop.noteHit(this, dmg, game);
      const C = VX.Coop;
      if (C.active && !game.visualOnly) {
        if (C.isClient) { if (game.localAct) C.reportHit(this, dmg, ray, opts, hit); }
        else if (!game.noReward) C.shareHitFx(this, dmg, ray, opts, 0, hit);
      }
      const b = this.body;
      const dir = [ray.dx, ray.dy, ray.dz];
      if (!game.visualOnly) this.hurt(dmg * (hit.part.name === 'head' ? 1.5 : 1) * game.weapon.hitMul(this, hit.part.name, opts, game));
      b.flash = Math.max(b.flash, 0.6);
      const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles, 0.9);
      game.particles.blood(hit.vox.wx, hit.vox.wy, hit.vox.wz, dir[0], dir[1], dir[2], 8);
      VX.Audio.flesh();
      if (game.visualOnly) return false;
      return this.afterDamage(removed, dir, game);
    }

    blast(x, y, z, R, dmg, game) {
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      if (this.dead) return false;
      const b = this.body;
      const v = b.nearestVoxel(x, y, z);
      if (!v) return false;
      if (VX.Coop.isClient && game.localAct && !game.visualOnly) VX.Coop.reportBlast(this, x, y, z, R, dmg);
      if (!game.visualOnly) this.hurt(dmg);
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
      // la cabeza y el torso se regeneran, pero si le destrozas el 90 % del cuerpo de golpe, se acabó
      let al = 0, tot = 0;
      for (const p of b.parts) { if (p.armor || p.name === 'tool') continue; tot += p.total; if (!p.detached) al += p.alive; }
      if (tot && al / tot < 0.1 && this.hp > 0) { this.hp = 0; game.hud.banner('¡DESTROZADO!', 'No ha podido regenerarse', 2.2); }
      if (this.hp <= 0) { this.die(dir, game); return true; }
      return false;
    }

    die(dir, game) {
      if (this.dead) return;
      this.dead = true;
      if (VX.Coop.isClient && game.localAct && !game.noReward) VX.Coop.reportKill(this);
      game.bullets.clear();
      game.addCorpse(new VX.Corpse(this.body, dir, { heavy: true, life: 25 }));
      for (let i = 0; i < 4; i++) game.particles.blood(this.x, this.y + 1 + i * 0.6, this.z, M.rand(-1, 1), 1, M.rand(-1, 1), 20);
      VX.Audio.at(this.x, this.y + 1.2, this.z, () => { VX.Audio.zombieDie(); VX.Audio.roar(); }, 4);
      game.shake(1);
      // cooperativo: cada uno se lleva el premio del jefe (oro y estadística) en su equipo
      game.pickups.dropGold(this.x, this.y + 1.5, this.z, 40 + game.stats.bosses * 10);
      game.stats.kills++;
      game.stats.bosses++;
      VX.Profile.add('bosses', 1, game);
      VX.Profile.codexKill('boss:' + this.T.id);
      VX.Profile.addW(this.lastW, 'bosses', 1, game);
      if (this.lastW === 'knife') VX.Profile.add('knifeBosses', 1, game);
      VX.Profile.addW(this.lastW, 'kills', 1, game);
      VX.Profile.add('kills', 1, game);
    }

    render(batch) {
      this.body.render(batch);
      // cadena del gancho
      if (this.chain) {
        const C = this.chain, sx = this.x, sz = this.z, sy = this.y + 1.6;
        const ex = C.x ?? sx, ez = C.z ?? sz, n = Math.max(2, Math.floor(Math.hypot(ex - sx, ez - sz) / 0.18));
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          batch.box(M.lerp(sx, ex, k), sy - k * 0.6, M.lerp(sz, ez, k), 0.07, 0.07, 0.07, 0.3, 0.3, 0.33, 0);
        }
        batch.box(ex, sy - 0.6, ez, 0.2, 0.25, 0.08, 0.5, 0.5, 0.55, 0);
      }
    }
  }

  Boss.TYPES = BOSSES;
  VX.Boss = Boss;
})();
