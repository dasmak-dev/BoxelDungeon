// El vendedor de la tienda (0.43). Un bicho inmortal que vive tras el mostrador.
// - Animado: respira, te sigue con la mirada, mueve las orejas, cuenta monedas, se rasca,
//   saluda cuando entras y se encoge cuando le das.
// - Se le puede disparar y romper a trozos (orejas, nariz, brazos, la cabeza…): por dentro está
//   lleno de oro y de un icor morado, y todo le vuelve a crecer.
// - Cada golpe sube los precios. Si lo «matas», se deshace en un remolino y vuelve a formarse:
//   cada vez más rápido y más fuerte (más vida, más daño), pero siempre del mismo tamaño.
// - A la tercera muerte se harta: o cierra la tienda (no habrá tiendas en unas cuantas salas)
//   o se vuelve hostil y te persigue por la sala a golpe de farol y lluvia de monedas.
//   Hostil sigue siendo inmortal: lo único que puedes hacer es salir de ahí.
(function () {
  const M = VX.M;
  const SAY = {
    hello: ['¡Pasa, pasa! Aquí no muerde nadie… salvo los precios.', 'Bienvenido, cliente. Mira sin prisa.', 'Género fresco de la mazmorra. Todo legal. Casi.'],
    back: ['Te recuerdo… La casa no olvida.', 'Ah, tú otra vez. Los precios también se acuerdan de ti.'],
    hit: ['¡Eh! ¡Eso se paga!', '¡Ay! Apuntado en tu cuenta.', '¡Cuidado con el género!', '¡Que te subo los precios!', '¡Mi túnica buena!'],
    part: { earL: '¡Mi oreja!', earR: '¡Mi oreja!', nose: '¡Mi nariz! Ya me crecerá…', armL: '¡Mi farol! ¡Mi brazo!', armR: '¡Ese brazo cuenta el dinero!', head: '…', pack: '¡Mi mochila!', hood: '¡Mi capucha!' },
    revive1: 'Eso ha dolido. Precios +25 %.',
    revive2: 'Una más y te cierro la tienda. O algo peor.',
    close: 'Se acabó. CERRADO. Ya te buscarás la vida.',
    hostile: 'Muy bien… Ahora te cobro yo.',
    hostRevive: ['¿Otra vez? Qué cliente más pesado.', 'No me puedes matar. Pero yo a ti sí.', 'Cada vez que vuelvo, vuelvo con más ganas.'],
  };

  class Shopkeeper {
    constructor(game, room, x, z) {
      const sp = game.spawner;
      this.mem = sp.vendorMem || (sp.vendorMem = { deaths: 0, visits: 0 });
      this.mem.visits++;
      this.room = room;
      this.home = { x, z };
      this.x = x; this.z = z; this.y = game.world.groundAt(x, z);
      this.yaw = Math.PI / 2;
      this.t = 0;
      this.radius = 0.45;
      this.isBoss = true;          // sin aturdir, congelar ni envenenar
      this.isShopkeeper = true;
      this.deaths = 0;             // muertes en esta tienda
      this.hostDeaths = 0;         // muertes estando hostil
      this.grudge = 0;
      this.markup = 1 + this.mem.deaths * 0.1;   // de otras tiendas: se acuerda de ti
      this.state = 'idle';         // idle | down | reform | hostile | gone
      this.act = null; this.actT = M.rand(2, 4);
      this.flinch = 0; this.angryT = 0; this.waved = false;
      this.dead = false;
      this.seed = (Math.random() * 9973) | 0;
      this.build(0);
      this.greet = this.mem.deaths > 0 ? M.choice(SAY.back) : M.choice(SAY.hello);
    }

    // fuerza y velocidad de regeneración según las veces que ha vuelto (el tamaño no cambia)
    get power() { return this.deaths + this.hostDeaths; }
    get regenK() { return Math.pow(0.78, this.power); }

    build(rage) {
      const body = new VX.VoxelBody(VX.Models.merchant({ seed: this.seed, rage }), 1);
      body.x = this.x; body.z = this.z; body.y = this.y; body.yaw = this.yaw;
      this.body = body;
      this.maxHp = 180 * Math.pow(1.4, this.power);
      this.hp = this.maxHp;
      this.regenQ = [];
      body.computeWorld();
    }

    say(game, msg) {
      if (!msg || !game.hud) return;
      this.saidT = 0;
      game.hud.banner('', `Vendedor: «${msg}»`, 2.2);
    }

    // ---------- precios ----------
    applyPrices(game) {
      const pat = VX.Profile.shopUp ? VX.Profile.shopUp('patience') : 0;   // «Paciencia» del Santuario
      const m = Math.min(4, this.markup * (1 + Math.floor(this.grudge / (70 * (1 + 0.6 * pat))) * 0.05));
      if (Math.abs(m - (this.shownMul || 1)) < 1e-3) return;
      const up = m > (this.shownMul || 1);
      this.shownMul = m;
      for (const it of game.pickups.items) {
        if (it.shopRoom !== this.room || it.taken || !it.basePrice) continue;
        it.price = Math.max(1, Math.round(it.basePrice * m));
      }
      if (up && game.hud && !this.priceHint) { this.priceHint = true; game.hud.toast('Los precios de la tienda han subido'); }
    }
    closeShop(game, why) {
      for (const it of game.pickups.items) if (it.shopRoom === this.room && !it.taken) {
        it.taken = true;
        for (let i = 0; i < 10; i++) game.particles.spawn(it.x, it.y, it.z, M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1), 0.6, 0.25, 0.9, 0.03, 0.7, 1, 1);
      }
      game.spawner.shopBan = Math.max(game.spawner.shopBan || 0, 4 + this.mem.deaths);
      if (why === 'close') game.hud.banner('TIENDA CERRADA', `No habrá tiendas en las próximas ${game.spawner.shopBan} salas`, 3);
    }

    // ---------- daño ----------
    carve(fn) {
      const b = this.body;
      b.ensureAll();
      const before = [];
      for (const p of b.parts) if (!p.detached) for (const v of p.vox) if (v.alive) before.push(p, v);
      const res = fn();
      const touched = new Set();
      const k = this.regenK;
      for (let i = 0; i < before.length; i += 2) {
        const p = before[i], v = before[i + 1];
        if (!v.alive) { this.regenQ.push({ p, v, t: M.rand(1.8, 3.2) * k }); touched.add(p); }
      }
      for (const p of touched) if (!p.detached) VX.updateExposure(p);
      return res || {};
    }

    hit(h, dmg, ray, game, opts) {
      if (this.dead) return false;
      const b = this.body, dir = [ray.dx, ray.dy, ray.dz];
      const res = this.carve(() => b.afterCarve(b.cutFor(h, dmg, ray, opts, game.weapon.destruction, game.particles, 0.9), game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5));
      return this.afterHit(res, dmg, dir, game, h.vox);
    }
    blast(x, y, z, R, dmg, game) {
      if (this.dead) return;
      const b = this.body;
      const dx = b.cx - x, dz = b.cz - z, l = Math.hypot(dx, dz) || 1;
      const px = b.cx - dx / l * 0.2, pz = b.cz - dz / l * 0.2;
      const res = this.carve(() => b.afterCarve(b.carveSphere(px, Math.max(y, b.cy), pz, 0.2 + dmg / 260, game.particles, dx / l, 0.6, dz / l, 20), game.gibs, dx / l * 3, 2, dz / l * 3));
      this.afterHit(res, dmg, [dx / l, 0.3, dz / l], game, null);
    }
    afterHit(res, dmg, dir, game, vox) {
      const b = this.body;
      b.flash = 0.7; this.flinch = 1; this.angryT = 4;
      if (!game.visualOnly) this.hp -= dmg;
      this.grudge += dmg;
      // monedas y chispas de icor (sólo de adorno: no da oro)
      if (vox) for (let i = 0; i < 4; i++) {
        const gold = Math.random() < 0.5;
        game.particles.spawn(vox.wx, vox.wy, vox.wz, dir[0] * 2 + M.rand(-1.5, 1.5), M.rand(1, 3), dir[2] * 2 + M.rand(-1.5, 1.5), gold ? 1 : 0.6, gold ? 0.8 : 0.2, gold ? 0.25 : 0.9, 0.03, M.rand(0.4, 0.8), 1, 1);
      }
      VX.Audio.flesh();
      let partMsg = null;
      for (const [n, r] of Object.entries(res)) if (r === 'detached' || r === 'severed') { this.grudge += 40; partMsg = partMsg || SAY.part[n]; }
      // trozos que cuelgan pero siguen pegados: se sueltan del todo para que vuelvan a crecer limpios
      for (const a of ['armL', 'armR']) if (b.byName[a] && !b.byName[a].detached && b.broken(a, 0.35)) b.detach(a, game.gibs, dir[0] * 2, 1.5, dir[2] * 2);
      const killed = this.hp <= 0 || b.byName.head.detached || b.byName.torso.detached || b.broken('torso', 0.3);
      if (killed) { this.die(dir, game); return true; }
      if (this.state === 'idle') {
        if (partMsg) this.say(game, partMsg);
        else if (!this.saidT || this.saidT > 1.6) this.say(game, M.choice(SAY.hit));
      }
      this.applyPrices(game);
      return false;
    }

    die(dir, game) {
      const b = this.body;
      b.collapse(game.gibs, dir[0], dir[2], 3);
      this.dead = true;
      VX.Audio.zombieDie();
      game.shake(0.15);
      for (let i = 0; i < 30; i++) {
        const gold = Math.random() < 0.5;
        game.particles.spawn(this.x, this.y + 1, this.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), gold ? 1 : 0.6, gold ? 0.8 : 0.2, gold ? 0.25 : 0.9, M.rand(0.02, 0.05), M.rand(0.6, 1.4), 1, 1);
      }
      if (this.state === 'hostile') {
        this.hostDeaths++;
        this.downT = Math.max(1.2, 5 * Math.pow(0.7, this.hostDeaths));
      } else {
        this.deaths++; this.mem.deaths++;
        this.markup += 0.25;
        this.downT = Math.max(2.5, 7 * Math.pow(0.8, this.deaths));
      }
      this.prevState = this.state;
      this.state = 'down';
      if (game.hud && this.prevState !== 'hostile') game.hud.toast(this.deaths === 1 ? 'Se ha deshecho… pero algo se arremolina donde estaba' : 'Vuelve a arremolinarse. Más deprisa que antes');
    }

    reform(game) {
      // vuelve a formarse de los pies a la cabeza
      const rage = Math.min(1, (this.power) / 4);
      if (this.state !== 'hostile' && this.prevState !== 'hostile') { this.x = this.home.x; this.z = this.home.z; }
      this.y = game.world.groundAt(this.x, this.z);
      this.build(rage);
      const b = this.body;
      for (const p of b.parts) {
        const h = p.dims[1];
        for (const v of p.vox) if (v.alive) {
          v.alive = false;
          const wy = (p.pivot[1] + v.y) / b.height;   // altura relativa (0 pies, 1 cabeza)
          this.regenQ.push({ p, v, t: 0.05 + Math.max(0, wy) * 0.7 + Math.random() * 0.2 });
          void h;
        }
        p.alive = 0;
      }
      this.state = 'reform'; this.reformT = 1.0;
      VX.Audio.phase();
    }

    // ---------- regeneración ----------
    regen(dt, game) {
      const b = this.body;
      for (const p of b.parts) {
        if (!p.detached) continue;
        const par = p.parent && b.byName[p.parent];
        if (par && par.detached) continue;
        if (!p.regrowT) { p.regrowT = M.rand(3, 4.5) * this.regenK; continue; }
        p.regrowT -= dt;
        if (p.regrowT > 0) continue;
        p.regrowT = 0; p.detached = false; p.severed = false;
        const h = p.dims[1];
        for (const v of p.vox) {
          if (v.ghost) continue;
          const d = p.attach === 'top' ? (h - 1 - v.j) : v.j;
          v.alive = false;
          this.regenQ.push({ p, v, t: 0.05 + d * 0.05 + Math.random() * 0.12 });
        }
        p.alive = 0;
        VX.updateExposure(p);
        if (p.wp) for (let i = 0; i < 8; i++) game.particles.spawn(p.wp[0], p.wp[1], p.wp[2], M.rand(-0.6, 0.6), M.rand(0.2, 1.2), M.rand(-0.6, 0.6), 0.7, 0.3, 1, 0.03, 0.6, 1, 1);
      }
      for (const p of b.parts) if (p.severed && !p.detached && p.alive / p.total > 0.85) p.severed = false;
      if (this.state !== 'down') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.08 * dt / this.regenK);
      const Q = this.regenQ;
      if (!Q.length) return;
      const touched = new Set();
      for (const r of Q) {
        if (r.p.detached) continue;
        r.t -= dt;
        if (r.t > 0) continue;
        if (!r.v.alive) { r.v.alive = true; r.p.alive++; touched.add(r.p); }
        r.done = true;
      }
      if (touched.size) { for (const p of touched) VX.updateExposure(p); this.regenQ = Q.filter((r) => !r.done); }
    }

    // ---------- comportamiento ----------
    update(dt, game) {
      this.t += dt;
      this.saidT = (this.saidT || 0) + dt;
      const P = game.player;
      const b = this.body;
      if (this.state === 'gone') return;
      const inRoom = this.room.contains(P.x, P.z);
      if (inRoom && !this.greeted && Math.hypot(P.x - this.x, P.z - this.z) < 12) { this.greeted = true; this.say(game, this.greet); this.act = 'wave'; this.actT = 2.2; }

      if (this.state === 'down') {
        this.downT -= dt;
        // remolino de oro e icor donde estaba
        if (Math.random() < 0.7) {
          const a = this.t * 6 + Math.random() * 6.28, r = M.rand(0.2, 0.6);
          game.particles.spawn(this.x + Math.cos(a) * r, this.y + M.rand(0.1, 1.6), this.z + Math.sin(a) * r, -Math.sin(a) * 1.5, M.rand(0.3, 1), Math.cos(a) * 1.5, Math.random() < 0.5 ? 1 : 0.6, 0.5, 0.9, 0.03, 0.7, 1, 1);
        }
        if (this.downT <= 0) this.reform(game);
        return;
      }
      this.regen(dt, game);
      if (this.state === 'reform') {
        this.reformT -= dt;
        if (this.reformT <= 0 && this.regenQ.length < 20) this.afterReform(game);
      }

      // mirar al jugador
      const ty = Math.atan2(P.x - this.x, P.z - this.z);
      let d = ty - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const turn = this.state === 'hostile' ? 8 : 2.5;
      this.yaw += M.clamp(d, -turn * dt, turn * dt);
      if (this.state === 'hostile') this.hostile(dt, game);
      this.animate(dt, game, d);
      b.x = this.x; b.z = this.z; b.y = this.y; b.yaw = this.yaw;
      b.flash = Math.max(0, b.flash - dt * 4);
      b.computeWorld();
    }

    afterReform(game) {
      this.dead = false;
      if (this.prevState === 'hostile') { this.state = 'hostile'; this.say(game, M.choice(SAY.hostRevive)); this.hstate = 'blink'; this.hT = 0.6; return; }
      this.state = 'idle';
      if (this.deaths === 1) this.say(game, SAY.revive1);
      const limit = 3 + (VX.Profile.shopUp ? VX.Profile.shopUp('patience') : 0);
      if (this.deaths > 1 && this.deaths === limit - 1) this.say(game, SAY.revive2);
      else if (this.deaths > 1 && this.deaths < limit - 1) this.say(game, 'Otra vez… Eso también va a tu cuenta.');
      else if (this.deaths >= limit) {
        if (Math.random() < 0.5) {
          this.say(game, SAY.close);
          this.closeShop(game, 'close');
          this.leaveT = 1.8; this.state = 'leaving'; this.dead = true;
          return;
        }
        this.say(game, SAY.hostile);
        this.closeShop(game, 'hostile');
        game.hud.banner('¡EL VENDEDOR SE HA HARTADO!', 'Es inmortal: sal de la tienda', 3);
        VX.Audio.roar(); game.shake(0.4);
        this.state = 'hostile'; this.hstate = 'blink'; this.hT = 1.0;
        return;
      }
      this.applyPrices(game);
    }

    // hostil: se teletransporta a tu lado, te sacude con el farol y te lanza monedas
    hostile(dt, game) {
      const P = game.player, n = this.hostDeaths;
      const spd = 1 + n * 0.15, dmg = 14 * Math.pow(1.25, n);
      const dist = Math.hypot(P.x - this.x, P.z - this.z);
      this.hT -= dt * spd;
      if (!this.room.contains(P.x, P.z)) { this.hstate = 'wait'; return; }
      switch (this.hstate) {
        case 'wait': if (this.hT <= 0) { this.hstate = 'blink'; this.hT = 0.4; } break;
        case 'blink':
          if (this.hT > 0) break;
          if (this.blinkTo(game)) { this.hstate = Math.random() < 0.65 || dist < 3 ? 'wind' : 'cast'; this.hT = this.hstate === 'wind' ? 0.5 : 0.7; }
          else this.hT = 0.2;
          break;
        case 'wind':
          if (this.hT <= 0) {
            this.hstate = 'swing'; this.hT = 0.25; VX.Audio.swish();
            const dd = Math.hypot(P.x - this.x, P.z - this.z);
            if (dd < 2.2 && game.state === 'playing') { const ds = game.dmgSrc; game.dmgSrc = 'El vendedor'; P.damage(dmg, this.x, this.z, game); game.dmgSrc = ds; VX.Audio.punch(); }
          }
          break;
        case 'swing': if (this.hT <= 0) { this.hstate = Math.random() < 0.5 ? 'cast' : 'blink'; this.hT = this.hstate === 'cast' ? 0.6 : 0.5; } break;
        case 'cast':
          if (this.hT <= 0) {
            // abanico de monedas
            const k = 3 + Math.min(4, n);
            const by = this.y + 1.3;
            const ty = P.y + 1.0;
            for (let i = 0; i < k; i++) {
              const a = Math.atan2(P.x - this.x, P.z - this.z) + (i - (k - 1) / 2) * 0.16;
              const s = 7 + n * 0.8, vy = (ty - by) / Math.max(1, dist) * s;
              game.bullets.add({ x: this.x + Math.sin(a) * 0.5, y: by, z: this.z + Math.cos(a) * 0.5, vx: Math.sin(a) * s, vy, vz: Math.cos(a) * s, dmg: dmg * 0.5, col: [1, 0.8, 0.25], r: 0.11, life: 3 });
            }
            VX.Audio.gold();
            this.hstate = 'blink'; this.hT = M.rand(0.8, 1.4);
          }
          break;
      }
    }
    blinkTo(game) {
      const P = game.player, W = game.world;
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.random() * Math.PI * 2, r = M.rand(1.6, 2.6);
        const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
        if (!this.room.contains(x, z)) continue;
        const g = W.groundAt(x, z);
        if (Math.abs(g - P.y) > 1.2) continue;
        if (W.isSolidAt(x, g + 0.5, z) || W.isSolidAt(x, g + 1.4, z)) continue;
        this.puff(game);
        this.x = x; this.z = z; this.y = g;
        this.yaw = Math.atan2(P.x - x, P.z - z);
        this.puff(game);
        VX.Audio.orb();
        return true;
      }
      return false;
    }
    puff(game) {
      for (let i = 0; i < 14; i++) game.particles.spawn(this.x + M.rand(-0.3, 0.3), this.y + M.rand(0.2, 1.7), this.z + M.rand(-0.3, 0.3), M.rand(-1, 1), M.rand(0, 1.2), M.rand(-1, 1), 0.5, 0.2, 0.75, M.rand(0.03, 0.06), M.rand(0.4, 0.8), 1, 1);
    }

    animate(dt, game, dyaw) {
      const b = this.body, B = b.byName, t = this.t, P = game.player;
      const set = (n, ax, ay, az) => { const p = B[n]; if (!p) return; p.ax = ax; if (ay !== undefined) p.ay = ay; if (az !== undefined) p.az = az; };
      this.flinch = Math.max(0, this.flinch - dt * 3);
      this.angryT = Math.max(0, this.angryT - dt);
      const fl = this.flinch;
      const breath = Math.sin(t * 1.7);
      // cabeza: sigue al jugador un poco más que el cuerpo
      const look = M.clamp(dyaw, -0.7, 0.7);
      const pitch = M.clamp(Math.atan2((P.y + 1.5) - (this.y + 1.6), Math.hypot(P.x - this.x, P.z - this.z)), -0.4, 0.4);
      let tAx = 0.12 + breath * 0.025 - fl * 0.35, hAx = -pitch * 0.7 - fl * 0.4, hAy = look, hAz = Math.sin(t * 0.9) * 0.06;
      let lAx = -0.25 + breath * 0.04, lAz = -0.08, rAx = -0.2 + breath * 0.04, rAz = 0.08;
      b.yOff = breath * 0.008;

      if (this.state === 'leaving') {
        this.leaveT -= dt;
        rAx = -2.6; rAz = 0.4 + Math.sin(t * 10) * 0.3;   // adiós
        if (this.leaveT <= 0) { this.puff(game); this.puff(game); VX.Audio.phase(); this.state = 'gone'; this.dead = true; this.hidden = true; return; }
      } else if (this.state === 'hostile') {
        tAx = 0.3;
        const hs = this.hstate;
        if (hs === 'wind') { lAx = -2.8; lAz = -0.3; tAx = 0.05; }
        else if (hs === 'swing') { lAx = -0.6; lAz = 0.5; tAx = 0.5; }
        else if (hs === 'cast') { rAx = -1.6 - Math.sin(t * 20) * 0.2; lAx = -1.4; }
        else { lAx = -0.5 + Math.sin(t * 14) * 0.2; rAx = -0.5 - Math.sin(t * 14) * 0.2; }
        hAz = Math.sin(t * 9) * 0.08;
      } else if (this.angryT > 0) {
        // puños en alto, temblando de rabia
        lAx = -2.2 + Math.sin(t * 22) * 0.12; rAx = -2.2 + Math.cos(t * 22) * 0.12; lAz = -0.35; rAz = 0.35;
        hAz = Math.sin(t * 18) * 0.05;
      } else {
        // pequeñas tareas mientras esperas
        this.actT -= dt;
        if (this.actT <= 0) {
          if (this.act) { this.act = null; this.actT = M.rand(1.5, 3.5); }
          else { this.act = M.choice(['count', 'count', 'lantern', 'scratch', 'lean', 'ears']); this.actT = M.rand(2.2, 3.8); }
        }
        const near = Math.hypot(P.x - this.x, P.z - this.z) < 3.2;
        switch (this.act) {
          case 'wave': rAx = -2.7; rAz = 0.5 + Math.sin(t * 9) * 0.35; break;
          case 'count':
            lAx = -1.15; rAx = -1.05 + Math.abs(Math.sin(t * 6)) * 0.25; lAz = 0.25; rAz = -0.25; hAx = 0.35;
            if (Math.random() < dt * 2.5 && B.armR && !B.armR.detached) { const w = B.armR.wp; game.particles.spawn(w[0], w[1] - 0.25, w[2], M.rand(-0.3, 0.3), 1.8, M.rand(-0.3, 0.3), 1, 0.8, 0.25, 0.03, 0.5, 1, 0); VX.Audio.orb(); }
            break;
          case 'lantern': lAx = -1.5 + Math.sin(t * 2) * 0.1; lAz = 0.3; hAy = -0.35; hAx = 0.15; break;
          case 'scratch': rAx = -2.9; rAz = -0.3 + Math.sin(t * 16) * 0.12; hAz = 0.18; break;
          case 'lean': tAx = 0.35; lAx = -0.9; rAx = -0.9; break;
          case 'ears': break;
        }
        if (near && !this.act) { tAx = 0.28; lAx = -0.8; rAx = -0.8; }   // se inclina sobre el mostrador
      }
      set('torso', tAx, 0, 0);
      set('head', hAx, hAy, hAz);
      set('armL', lAx, 0, lAz);
      set('armR', rAx, 0, rAz);
      // orejas: tic nervioso de vez en cuando (se ponen tiesas si está enfadado)
      const tw = this.act === 'ears' ? Math.sin(t * 14) * 0.3 : (Math.sin(t * 3.1) > 0.97 ? 0.3 : 0);
      const up = this.angryT > 0 || this.state === 'hostile' ? 0.45 : 0;
      set('earL', 0, 0, -0.25 - tw - up);
      set('earR', 0, 0, 0.25 + tw + up);
      // el farol se balancea
      if (B.lantern) B.lantern.ax = -lAx * 0.8 + Math.sin(t * 2.2) * 0.12;
    }
  }

  VX.Shopkeeper = Shopkeeper;
})();
