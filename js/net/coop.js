// Cooperativo del modo Horda (hasta 4 jugadores).
//
// Reparto del trabajo:
//  - El ANFITRIÓN ejecuta la partida de verdad: oleadas, zombis, jefes, proyectiles y quién
//    muere. Envía una «foto» del estado 15 veces por segundo.
//  - Cada INVITADO mueve a su jugador en su propio equipo (sin retraso), manda su posición
//    20 veces por segundo y ve a los zombis como réplicas que siguen la foto del anfitrión.
//  - Los disparos se calculan en quien dispara (respuesta inmediata) y se avisan: el anfitrión
//    aplica el daño, y todos repiten el agujero en la pared y la herida en el zombi.
//  - Oro, mejoras, ventajas y cajas son de cada jugador.
//  - Al quedarte sin vida caes al suelo: un compañero puede levantarte (mantener E). Si nadie
//    lo hace en 30 s, mueres hasta la siguiente oleada. Si caen todos, se acaba la partida.
(function () {
  const M = VX.M;
  const SNAP_HZ = 15, ME_HZ = 20;
  const DOWN_TIME = 30, REVIVE_TIME = 2.5, REVIVE_DIST = 2.2;
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  // generador pseudoaleatorio con semilla (para que el mapa salga igual en todos los equipos)
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const Coop = {
    active: false,
    role: null,
    remotes: new Map(),      // id → VX.RemotePlayer
    reps: new Map(),         // (invitado) id de red → réplica de zombi/jefe
    order: [],               // ids en orden de la sala (para colores y puntos de salida)
    snapT: 0, meT: 0,
    down: false, downT: 0, deadWait: false,
    reviveT: 0, reviveId: -1,
    lastWave: 0, lastPhase: 'prep',
    handlersReady: false,

    get isHost() { return this.active && this.role === 'host'; },
    get isClient() { return this.active && this.role === 'client'; },

    // ---------------- inicio y fin ----------------
    initHandlers() {
      if (this.handlersReady) return;
      this.handlersReady = true;
      const N = VX.Net, g = () => VX.game;
      N.on('start', (d) => { if (N.isClient) this.begin(d.map, d.seed, d.order); });
      N.on('me', (d, from) => this.onMe(g(), d, from));
      N.on('s', (d) => this.onSnap(g(), d));
      N.on('hit', (d, from) => this.onHit(g(), d, from));
      N.on('hx', (d) => this.onHitFx(g(), d));
      N.on('kill', (d, from) => this.onKill(g(), d, from));
      N.on('bl', (d, from) => this.onBlast(g(), d, from));
      N.on('shot', (d, from) => this.onShot(g(), d, from));
      N.on('gr', (d, from) => this.onGrenade(g(), d, from));
      N.on('pj', (d) => this.onProjectiles(g(), d));
      N.on('hurt', (d) => this.onHurt(g(), d));
      N.on('knock', (d) => { const P = g().player; if (!this.down && !this.deadWait) P.knock(d.kx, d.kz, d.up); });
      N.on('rv', () => this.revived(g()));
      N.on('callwave', () => { const H = VX.HordeMode; if (this.isHost && (H.phase === 'prep' || H.phase === 'break') && H.timer > 3) { H.timer = 3; g().hud.toast('¡Un compañero ha llamado a la oleada!'); } });
      N.on('wave', (d) => this.onWave(g(), d));
      N.on('ewave', (d) => this.onEndWave(g(), d));
      N.on('over', () => this.allDown(g()));
      N.on('chat', (d) => g().hud.toast(d.m));
      // evacuación: un invitado usa la radio, el anfitrión elige la zona y avisa; al subir todos, se acaba
      N.on('evaccall', () => { if (this.isHost) VX.HordeMode.callEvac(g()); });
      N.on('evac', (d) => { if (this.isClient) VX.HordeMode.startEvac(g(), d.x, d.z); });
      N.on('escaped', () => { if (this.isClient) g().hordeWin(); });
    },

    // el anfitrión elige mapa y arranca para todos
    hostStart(mapId) {
      const N = VX.Net;
      const seed = (Math.random() * 1e9) | 0;
      const order = N.players.map((p) => p.id);
      N.send({ k: 'start', map: mapId, seed, order });
      N.setStarted(true);
      this.begin(mapId, seed, order);
    },

    begin(mapId, seed, order) {
      const N = VX.Net, game = VX.game;
      this.active = true;
      this.role = N.role;
      this.order = order || N.players.map((p) => p.id);
      this.remotes.clear(); this.reps.clear();
      this.down = false; this.deadWait = false; this.reviveT = 0;
      this.lastWave = 0; this.lastPhase = 'prep';
      for (const p of N.players) {
        if (p.id === N.id) continue;
        this.remotes.set(p.id, new VX.RemotePlayer(p.id, p.name, Math.max(0, this.order.indexOf(p.id))));
      }
      // mapa idéntico en todos: el azar de la construcción sale de la semilla compartida
      game.startHorde(mapId, { seed, rng: mulberry(seed) });
      // cada uno sale en un punto distinto alrededor de la salida
      const idx = Math.max(0, this.order.indexOf(N.id)), P = game.player;
      if (idx > 0) {
        const a = idx * 1.7;
        for (let tries = 0; tries < 8; tries++) {
          const x = P.x + Math.cos(a + tries) * 1.6, z = P.z + Math.sin(a + tries) * 1.6, y = game.world.groundAt(x, z);
          if (!game.world.boxCollides(x - 0.3, y + 0.05, z - 0.3, x + 0.3, y + 1.7, z + 0.3)) { P.x = x; P.z = z; P.y = y; break; }
        }
      }
      game.hud.toast(this.isHost ? `Partida cooperativa · ${N.players.length} jugadores` : 'Conectado: el anfitrión dirige la partida');
      this.renderTags(true);
    },

    stop() {
      this.active = false;
      this.role = null;
      this.remotes.clear(); this.reps.clear();
      const el = document.getElementById('coopTags'); if (el) el.innerHTML = '';
      const pl = document.getElementById('coopPlayers'); if (pl) pl.innerHTML = '';
      if (VX.game) VX.game.coopPrompt = null;
    },

    // alguien se ha ido o el anfitrión ha cerrado
    peerLeft(id) {
      const r = this.remotes.get(id);
      if (r) { VX.game.hud.toast(`${r.name} ha salido de la partida`); this.remotes.delete(id); }
    },

    // El anfitrión se ha ido y el servidor ha elegido a otro. Si soy yo, mis réplicas pasan a
    // ser zombis de verdad (con su IA) y sigo la oleada donde estaba; los demás no notan nada.
    hostChanged(game, newId, leftId) {
      this.peerLeft(leftId);
      const N = VX.Net, H = VX.HordeMode;
      if (newId !== N.id) {
        const p = N.players.find((q) => q.id === newId);
        game.hud.toast(`El anfitrión se ha ido · ahora dirige ${p ? p.name : 'otro jugador'}`);
        return;
      }
      this.role = 'host';
      for (const e of this.reps.values()) {
        if (e.dead) continue;
        e.net = null; e.replica = false; e.coopT = 0;
        e.state = 'chase'; e.stateT = M.rand(0.3, 1);
        e.windup = 0; e.spitting = false; e.fuse = 0;
        e.vx = 0; e.vz = 0; e.pathT = 0;
        if (e.body.byName.blade) e.body.byName.blade.hidden = !e.swordOut;
      }
      this.reps.clear();
      H.championAt = -1; H.spawnT = 1.5; H.straggleT = 0;
      if (H.phase === 'wave' && game.boss && !game.boss.dead) H.bossWave = true;
      this.snapT = 0; this.overT = 0;
      game.hud.banner('ERES EL ANFITRIÓN', 'El anfitrión se ha ido: la partida sigue y ahora la diriges tú', 3.5);
    },

    // ---------------- cada fotograma ----------------
    update(dt, game) {
      if (!this.active) return;
      const N = VX.Net;
      for (const r of this.remotes.values()) r.update(dt);
      if (this.isHost) {
        this.shareProjectiles(game);
        this.snapT -= dt;
        if (this.snapT <= 0) { this.snapT = 1 / SNAP_HZ; N.send(this.snapshot(game)); }
        this.checkAllDown(game);
      } else {
        this.meT -= dt;
        if (this.meT <= 0) { this.meT = 1 / ME_HZ; N.send(this.meState(game)); }
      }
      this.updateDown(dt, game);
      this.updateRevive(dt, game);
      this.renderTags(false);
    },

    // jugadores vivos (para los zombis del anfitrión)
    targets(game) {
      const list = [];
      const P = game.player;
      if (!P.dead && !this.down && !this.deadWait) list.push(P);
      for (const r of this.remotes.values()) if (r.seen && !r.down && !r.dead) list.push(r);
      return list;
    },
    // cada zombi persigue al jugador más cercano (se reevalúa cada segundo, con algo de inercia)
    targetFor(e, game) {
      e.coopT = (e.coopT || 0) - game.frameDt;
      if (e.coopT > 0 && e.coopTarget && !e.coopTarget.down && !e.coopTarget.dead && !(e.coopTarget === game.player && (this.down || this.deadWait))) return e.coopTarget;
      e.coopT = M.rand(0.8, 1.3);
      let best = null, bd = 1e9;
      for (const p of this.targets(game)) {
        const d = Math.hypot(p.x - e.x, p.z - e.z) * (p === e.coopTarget ? 0.8 : 1);
        if (d < bd) { bd = d; best = p; }
      }
      e.coopTarget = best || game.player;
      return e.coopTarget;
    },
    // puntos extra para el campo de caminos (los zombis llegan a cualquiera de los jugadores)
    flowExtra() {
      if (!this.isHost) return null;
      const out = [];
      for (const r of this.remotes.values()) if (r.seen && !r.down && !r.dead) out.push(r.x, r.z);
      return out;
    },

    // ---------------- estado propio (invitado → anfitrión) ----------------
    meState(game) {
      const P = game.player;
      return { k: 'me', x: r2(P.x), y: r2(P.y), z: r2(P.z), yaw: r3(P.yaw), p: r3(P.pitch), vx: r2(P.vx), vz: r2(P.vz), hp: Math.round(P.hp), mh: P.maxHp, dn: this.down ? 1 : 0, dd: this.deadWait ? 1 : 0, w: game.weapon.slot.id };
    },
    onMe(game, d, from) {
      if (!this.isHost) return;
      let r = this.remotes.get(from);
      if (!r) {
        const p = VX.Net.players.find((q) => q.id === from);
        r = new VX.RemotePlayer(from, p ? p.name : 'Jugador', Math.max(0, this.order.indexOf(from)));
        this.remotes.set(from, r);
      }
      r.setState(d);
    },

    // ---------------- foto del anfitrión ----------------
    snapshot(game) {
      const P = game.player, H = VX.HordeMode;
      const pl = [[VX.Net.id, r2(P.x), r2(P.y), r2(P.z), r3(P.yaw), r3(P.pitch), Math.round(P.hp), P.maxHp, (this.down ? 1 : 0) | (this.deadWait ? 2 : 0), game.weapon.slot.id]];
      for (const r of this.remotes.values()) if (r.seen) pl.push([r.id, r2(r.tx), r2(r.ty), r2(r.tz), r3(r.tyaw), r3(r.tpitch), Math.round(r.hp), r.maxHp, (r.down ? 1 : 0) | (r.dead ? 2 : 0), r.weapon]);
      const en = [];
      for (const e of game.enemies) {
        if (e.dead && e !== game.boss) continue;
        // id de red único aunque cambie el anfitrión: cada equipo numera en su propio tramo
        if (!e.netId) e.netId = (VX.Net.id + 1) * 1000000 + (this.netSeq = (this.netSeq || 0) + 1);
        let f = 0;
        if (e.dead) f |= 1;
        if (e.crawling) f |= 2;
        if (e.spitting) f |= 4;
        if (e.biter) f |= 8;
        if (e.swordOut) f |= 16;
        if (e.elite) f |= 32;
        if (e.champion) f |= 64;
        if (e.burn > 0) f |= 128;
        if (e.state === 'leap') f |= 256;
        if (e.fuse > 0) f |= 512;
        if (e.screamT > 0) f |= 1024;
        if (e.state === 'dive') f |= 2048;
        const k = e.windup > 0 ? r2(1 - e.windup / (e.windTotal || 0.45)) : 0;
        const kind = e.isBoss ? 'boss:' + e.T.id + ':' + (e.bossNum || 1) : e.kind;
        en.push([e.netId, kind, r2(e.x), r2(e.y), r2(e.z), r3(e.body.yaw), Math.max(0, Math.round(e.hp)), Math.round(e.maxHp), f, k, e.spawnT > 0 ? r2(e.spawnT) : 0]);
      }
      return { k: 's', pl, en, w: [H.wave, H.phase, r2(H.timer), H.total, H.spawned, H.killed, H.event ? H.event.id : 0] };
    },

    onSnap(game, d) {
      if (!this.isClient || game.mode !== 'horde') return;
      const N = VX.Net, H = VX.HordeMode;
      // compañeros (incluido el anfitrión)
      for (const p of d.pl) {
        if (p[0] === N.id) continue;
        let r = this.remotes.get(p[0]);
        if (!r) {
          const q = N.players.find((x) => x.id === p[0]);
          r = new VX.RemotePlayer(p[0], q ? q.name : 'Jugador', Math.max(0, this.order.indexOf(p[0])));
          this.remotes.set(p[0], r);
        }
        r.setState({ x: p[1], y: p[2], z: p[3], yaw: p[4], p: p[5], hp: p[6], mh: p[7], dn: p[8] & 1, dd: p[8] & 2, w: p[9] });
      }
      // zombis y jefes
      const seen = new Set();
      for (const s of d.en) {
        seen.add(s[0]);
        let e = this.reps.get(s[0]);
        if (!e) {
          if (s[8] & 1) continue;
          e = this.makeReplica(game, s);
          if (!e) continue;
          this.reps.set(s[0], e);
          game.enemies.push(e);
        }
        e.net = s;
        e.hp = Math.min(e.hp, s[6]);
        e.maxHp = s[7];
        if ((s[8] & 1) && !e.dead) this.killReplica(game, e);
      }
      for (const [id, e] of this.reps) if (!seen.has(id)) { if (!e.dead) this.killReplica(game, e); this.reps.delete(id); }
      // oleada (para el marcador)
      const w = d.w;
      H.wave = w[0]; H.phase = w[1]; H.timer = w[2]; H.total = w[3]; H.spawned = w[4]; H.killed = w[5];
    },

    makeReplica(game, s) {
      const kind = s[1];
      let e;
      try {
        if (kind.startsWith('boss:')) {
          const [, id, num] = kind.split(':');
          e = new VX.Boss(s[2], s[4], game.floor, +num || 1, id);
          e.state = 'chase';
          game.boss = e;
          game.hud.showBoss(e);
        } else {
          e = new VX.Zombie(kind, s[2], s[4], game.floor, { elite: !!(s[8] & 32), champion: !!(s[8] & 64), y: s[3] });
          e.spawnT = s[10] || 0;
          if (e.champion) { game.champion = e; game.hud.showBoss(e); }
        }
      } catch (err) { console.warn('réplica', kind, err); return null; }
      e.netId = s[0];
      e.replica = true;
      e.x = s[2]; e.y = s[3]; e.z = s[4];
      e.body.yaw = s[5];
      e.hp = s[6]; e.maxHp = s[7];
      e.body.x = e.x; e.body.y = e.y; e.body.z = e.z;
      e.body.computeWorld();
      return e;
    },

    killReplica(game, e) {
      const dx = e.x - game.player.x, dz = e.z - game.player.z, l = Math.hypot(dx, dz) || 1;
      game.noReward = true;
      e.allowDie = true;
      try { e.die([dx / l, 0.3, dz / l], game); } finally { game.noReward = false; }
      if (e === game.boss) { game.hud.hideBoss(); }
      if (e === game.champion) { game.champion = null; game.hud.hideBoss(); }
    },

    // las réplicas siguen la foto: posición suavizada, orientación y animación
    updateReplicas(dt, game) {
      for (const e of game.enemies) {
        if (e.dead || !e.net) continue;
        const s = e.net, b = e.body;
        e.game = game;
        if (e.T && e.T.knight && e.knightRegen) e.knightRegen(dt, game);   // la armadura del caballero se recompone también en las réplicas
        const ox = e.x, oz = e.z;
        const k = Math.min(1, dt * 10);
        if (Math.hypot(s[2] - e.x, s[4] - e.z) > 5) { e.x = s[2]; e.z = s[4]; e.y = s[3]; }
        e.x += (s[2] - e.x) * k; e.z += (s[4] - e.z) * k; e.y += (s[3] - e.y) * k;
        let dy = s[5] - b.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        b.yaw += dy * Math.min(1, dt * 12);
        b.flash = Math.max(0, b.flash - dt * 6);
        const spd = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
        if (e.isBoss) {
          // jefe: paso pesado
          e.walkT = (e.walkT || 0) + dt * Math.min(spd, 6) * 2;
          const P_ = b.byName, sw = spd > 0.3 ? Math.sin(e.walkT) * 0.5 : 0;
          if (P_.legL) { P_.legL.ax = sw; P_.legR.ax = -sw; }
          if (P_.armL) { P_.armL.ax = -0.3 - sw * 0.4; P_.armR.ax = -0.3 + sw * 0.4; }
          b.x = e.x; b.y = e.y; b.z = e.z;
          b.computeWorld();
          continue;
        }
        const f = s[8];
        e.burn = (f & 128) ? 1 : 0;
        e.swordOut = !!(f & 16);
        if (e.body.byName.blade) e.body.byName.blade.hidden = !e.swordOut;
        e.spitting = !!(f & 4);
        e.biter = !!(f & 8);
        e.fuse = (f & 512) ? 0.5 : 0;
        if ((f & 2) && !e.crawling) { e.crawling = true; e.crawlC = 1; }
        e.crawlC = e.crawling ? Math.min(1, e.crawlC + dt * 3) : 0;
        e.windTotal = 1; e.windup = s[9] > 0 ? 1 - s[9] : 0;
        e.spawnT = s[10] || 0;
        if (e.spawnT > 0) b.yOff = -b.height * Math.max(0, e.spawnT) / 1.1;
        const fl = e.fl;
        fl.vx += (-60 * fl.x - 9 * fl.vx) * dt; fl.vz += (-60 * fl.z - 9 * fl.vz) * dt;
        fl.x += fl.vx * dt; fl.z += fl.vz * dt;
        if (e.burn && Math.random() < 0.15) game.particles.spawn(e.x + M.rand(-0.25, 0.25), e.y + M.rand(0.8, 1.8), e.z + M.rand(-0.25, 0.25), M.rand(-0.3, 0.3), M.rand(1.5, 2.5), M.rand(-0.3, 0.3), 1, M.rand(0.5, 0.8), 0.15, 0.018, M.rand(0.4, 0.8), 1, 1);
        if (e.champion && Math.random() < 0.5) game.particles.spawn(e.x + M.rand(-0.5, 0.5), e.y + M.rand(0.2, b.height), e.z + M.rand(-0.5, 0.5), 0, M.rand(0.3, 0.9), 0, 1, 0.8, 0.25, 0.025, 0.7, 1, 1);
        if (e.fuse > 0) b.flash = (Math.sin(game.time * 40) > 0) ? 1 : 0.2;
        e.screamT = (f & 1024) ? Math.max(0.05, (e.screamT || 1.1) - dt) : 0;
        if (e.T.fly) { e.state = (f & 2048) ? 'dive' : 'circle'; e.vy = (s[3] - e.y) / Math.max(dt, 1e-3); e.animateCrow(dt); }
        else if (e.T.quad) e.animateDog(dt, spd); else e.animate(dt, spd);
        b.x = e.x; b.z = e.z; b.y = e.y;
        b.computeWorld();
      }
    },

    // ---------------- disparos e impactos ----------------
    // (invitado) un impacto mío en una réplica: el anfitrión aplica el daño
    reportHit(e, dmg, ray, opts) {
      if (!e.netId) return;
      VX.Net.send({ k: 'hit', id: e.netId, dmg: r2(dmg), o: [r2(ray.ox), r2(ray.oy), r2(ray.oz)], d: [r3(ray.dx), r3(ray.dy), r3(ray.dz)], sl: opts && opts.slash ? 1 : 0 });
    },
    reportKill(e) {
      if (!e.netId) return;
      VX.Net.send({ k: 'kill', id: e.netId });
    },
    reportBlast(e, x, y, z, R, dmg) {
      if (!e.netId) return;
      VX.Net.send({ k: 'bl', id: e.netId, x: r2(x), y: r2(y), z: r2(z), R: r2(R), dmg: r2(dmg) });
    },
    // (anfitrión) que los demás vean la herida
    shareHitFx(e, dmg, ray, opts, by = 0) {
      if (!e.netId) e.netId = (VX.Net.id + 1) * 1000000 + (this.netSeq = (this.netSeq || 0) + 1);
      VX.Net.send({ k: 'hx', by, id: e.netId, dmg: r2(dmg), o: [r2(ray.ox), r2(ray.oy), r2(ray.oz)], d: [r3(ray.dx), r3(ray.dy), r3(ray.dz)], sl: opts && opts.slash ? 1 : 0 });
    },
    findEnemy(game, id) {
      if (this.isClient) return this.reps.get(id);
      for (const e of game.enemies) if (e.netId === id) return e;
      return null;
    },
    // el impacto se repite con el mismo rayo sobre el cuerpo de este equipo
    replayHit(game, e, d, applyDamage) {
      const ray = { ox: d.o[0], oy: d.o[1], oz: d.o[2], dx: d.d[0], dy: d.d[1], dz: d.d[2] };
      const h = e.body.rayHit(ray.ox, ray.oy, ray.oz, ray.dx, ray.dy, ray.dz, 80);
      if (!applyDamage) game.visualOnly = true;
      game.noReward = true;
      try {
        if (h) e.hit(h, d.dmg, ray, game, d.sl ? { slash: true } : undefined);
        else if (applyDamage) { e.hp -= d.dmg; e.body.flash = 0.8; if (e.hp <= 0) e.die([ray.dx, 0.3, ray.dz], game); }
      } finally { game.visualOnly = false; game.noReward = false; }
    },
    onHit(game, d, from) {
      if (!this.isHost) return;
      const e = this.findEnemy(game, d.id);
      if (!e || e.dead) return;
      this.replayHit(game, e, d, true);
      VX.Net.send({ ...d, k: 'hx', by: from });
    },
    onHitFx(game, d) {
      if (!this.isClient || d.by === VX.Net.id) return;
      const e = this.findEnemy(game, d.id);
      if (!e || e.dead) return;
      this.replayHit(game, e, d, false);
    },
    onKill(game, d, from) {
      if (!this.isHost) return;
      const e = this.findEnemy(game, d.id);
      if (!e || e.dead) return;
      const r = this.remotes.get(from);
      const dx = e.x - (r ? r.x : 0), dz = e.z - (r ? r.z : 0), l = Math.hypot(dx, dz) || 1;
      game.noReward = true;
      try { e.hp = 0; e.allowDie = true; e.die([dx / l, 0.3, dz / l], game); } finally { game.noReward = false; }
      // la oleada lo cuenta igual que una muerte del anfitrión
      if (!e.counted) { e.counted = true; VX.HordeMode.onKillCount && VX.HordeMode.onKillCount(game, e); }
    },
    onBlast(game, d) {
      if (!this.isHost) return;
      const e = this.findEnemy(game, d.id);
      if (!e || e.dead) return;
      game.noReward = true;
      try { e.blast(d.x, d.y, d.z, d.R, d.dmg, game); } finally { game.noReward = false; }
    },

    // disparo: los demás repiten el trazo, el sonido y el agujero en la pared
    shareShot(game, ox, oy, oz, dirs, w, dmg, destr, mx, my, mz) {
      VX.Net.send({ k: 'shot', by: VX.Net.id, o: [r2(ox), r2(oy), r2(oz)], m: [r2(mx), r2(my), r2(mz)], ds: dirs.map((v) => [r3(v[0]), r3(v[1]), r3(v[2])]), w, dmg: r2(dmg), de: r2(destr) }, this.isHost ? undefined : 'all');
    },
    onShot(game, d) {
      if (d.by === VX.Net.id || game.mode !== 'horde') return;
      const r = this.remotes.get(d.by);
      if (r) r.shotT = 0.12;
      const def = VX.Weapons.DEFS[d.w] || VX.Weapons.DEFS.pistol;
      const P = game.player, dist = Math.hypot(d.o[0] - P.x, d.o[2] - P.z);
      if (dist < 70) VX.Audio.at(d.m[0], d.m[1], d.m[2], () => VX.Audio.shoot(def.sound || 1, def.sfx), 5);   // se oye desde donde dispara
      if (def.flame) {   // lanzallamas de un compañero: sólo las llamas
        const v = d.ds[0];
        for (let k = 0; k < 4; k++) { const sp = M.rand(7, 11); game.particles.spawn(d.m[0], d.m[1], d.m[2], v[0] * sp + M.rand(-0.8, 0.8), v[1] * sp + M.rand(-0.4, 1), v[2] * sp + M.rand(-0.8, 0.8), 1, M.rand(0.35, 0.75), 0.1, M.rand(0.06, 0.12), M.rand(0.45, 0.8), 1, 1); }
        return;
      }
      for (const v of d.ds) {
        const hit = game.world.raycast(d.o[0], d.o[1], d.o[2], v[0], v[1], v[2], def.range || 60);
        const t = hit ? hit.t : Math.min(40, def.range || 40);
        const tr = { x0: d.m[0], y0: d.m[1], z0: d.m[2], x1: d.o[0] + v[0] * t, y1: d.o[1] + v[1] * t, z1: d.o[2] + v[2] * t, life: 0.06 };
        if (def.ray) Object.assign(tr, { life: 0.14, max: 0.14, c: [0.35, 1, 0.45], w: 3 });
        game.weapon.tracers.push(tr);
        if (hit) {
          const radius = 0.16 + 0.14 * d.de + d.dmg / 300;
          const n = game.world.damageSphere(hit.x + v[0] * 0.02, hit.y + v[1] * 0.02, hit.z + v[2] * 0.02, radius, Math.min(140, d.dmg * 1.4) * d.de, game);
          game.particles.sparks(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, 3);
          if (!n && game.addBulletHole) game.addBulletHole(hit);
        }
      }
    },
    shareGrenade(g) {
      VX.Net.send({ k: 'gr', by: VX.Net.id, t: g.type || undefined, x: r2(g.x), y: r2(g.y), z: r2(g.z), vx: r2(g.vx), vy: r2(g.vy), vz: r2(g.vz), dmg: g.dmg, bl: g.blast, de: g.destr }, this.isHost ? undefined : 'all');
    },
    onGrenade(game, d) {
      if (d.by === VX.Net.id) return;
      game.weapon.grenades.push({ type: d.t, x: d.x, y: d.y, z: d.z, vx: d.vx, vy: d.vy, vz: d.vz, life: d.t === 'frag' ? 1.8 : d.t === 'decoy' ? 12 : d.t ? 5 : 4, rot: 0, dmg: d.dmg, blast: d.bl, destr: d.de, remote: true });
    },

    // ---------------- proyectiles enemigos ----------------
    // el anfitrión los crea; cada equipo los simula y cada uno esquiva (y recibe) los suyos
    shareProjectiles(game) {
      const out = [];
      const pack = (p, b) => {
        const o = {};
        for (const k in p) { const v = p[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || Array.isArray(v)) o[k] = v; }
        o._b = b ? 1 : 0;
        return o;
      };
      for (const p of game.projectiles) if (!p._net) { p._net = true; out.push(pack(p, false)); }
      for (const p of game.bullets.list) if (!p._net) { p._net = true; out.push(pack(p, true)); }
      if (out.length) VX.Net.send({ k: 'pj', a: out });
    },
    onProjectiles(game, d) {
      if (!this.isClient) return;
      for (const p of d.a) {
        p._net = true;
        if (p._b) game.bullets.list.push(p); else game.projectiles.push(p);
      }
    },

    // ---------------- daño a los compañeros ----------------
    hurtRemote(r, amount, fx, fz) {
      VX.Net.send({ k: 'hurt', a: r2(amount), fx: fx === undefined ? null : r2(fx), fz: fz === undefined ? null : r2(fz) }, r.id);
    },
    knockRemote(r, kx, kz, up) {
      VX.Net.send({ k: 'knock', kx: r2(kx), kz: r2(kz), up: r2(up || 0) }, r.id);
    },
    onHurt(game, d) {
      if (this.down || this.deadWait || game.state !== 'playing') return;
      game.player.damage(d.a, d.fx === null ? undefined : d.fx, d.fz === null ? undefined : d.fz, game);
    },

    // ---------------- caer, levantarse y morir ----------------
    // en vez de morir, caes al suelo: un compañero te puede levantar
    goDown(game) {
      VX.Haptics.buzz([200, 90, 260], VX.Touch.on && VX.Settings.data.vibrate !== false);
      const P = game.player;
      P.hp = 0;
      this.down = true;
      this.downT = DOWN_TIME;
      P.vx = P.vz = 0;
      game.hud.banner('¡HAS CAÍDO!', 'Un compañero puede levantarte manteniendo E a tu lado', 3);
      VX.Audio.hurt(1);
      VX.Net.send({ k: 'chat', m: `${this.myName()} ha caído: ¡levántalo!` }, this.isHost ? undefined : 'all');
    },
    revived(game) {
      if (!this.down) return;
      const P = game.player;
      this.down = false;
      P.hp = Math.round(P.maxHp * 0.4);
      P.invuln = 2;
      P.eyeOffset = 0;
      game.hud.banner('¡TE HAN LEVANTADO!', '', 2);
      VX.Audio.phase && VX.Audio.phase();
    },
    updateDown(dt, game) {
      const P = game.player;
      if (this.down) {
        P.eyeOffset = M.lerp(P.eyeOffset, -1.1, Math.min(1, dt * 4));
        this.downT -= dt;
        if (this.downT <= 0) {
          this.down = false; this.deadWait = true;
          game.hud.banner('HAS MUERTO', 'Volverás al empezar la siguiente oleada', 3.5);
        }
      } else if (this.deadWait) {
        P.eyeOffset = M.lerp(P.eyeOffset, -1.4, Math.min(1, dt * 3));
      }
      // al empezar una oleada nueva, los muertos vuelven
      const H = VX.HordeMode;
      if (H.wave !== this.lastWave && H.phase === 'wave') {
        this.lastWave = H.wave;
        if (this.deadWait) {
          this.deadWait = false;
          P.hp = Math.round(P.maxHp * 0.5); P.invuln = 3; P.eyeOffset = 0;
          const st = game.currentRoom.playerStart;
          if (st) { P.x = st.x; P.z = st.z; P.y = game.world.groundAt(st.x, st.z); }
          game.hud.banner('¡DE VUELTA!', 'Has vuelto con tus compañeros', 2.5);
        }
      }
    },
    // levantar a un compañero caído: mantener E a su lado
    updateRevive(dt, game) {
      const P = game.player;
      let target = null, bd = REVIVE_DIST;
      if (!this.down && !this.deadWait && game.state === 'playing') {
        for (const r of this.remotes.values()) {
          if (!r.down) continue;
          const d = Math.hypot(r.x - P.x, r.z - P.z);
          if (d < bd && Math.abs(r.y - P.y) < 1.5) { bd = d; target = r; }
        }
      }
      if (!target) { this.reviveT = 0; game.coopPrompt = null; return; }
      if (VX.Input.keys.KeyE) {
        if (this.reviveId !== target.id) { this.reviveId = target.id; this.reviveT = 0; }
        this.reviveT += dt;
        if (this.reviveT >= REVIVE_TIME) {
          VX.Net.send({ k: 'rv' }, target.id);
          target.down = false;
          this.reviveT = 0;
          game.hud.toast(`Has levantado a ${target.name}`);
          game.coopPrompt = null;
          return;
        }
      } else this.reviveT = 0;
      const pct = Math.round(this.reviveT / REVIVE_TIME * 100);
      game.coopPrompt = `<b>${target.name}</b> está en el suelo<br>[mantén E] Levantar${pct ? ` · ${pct}%` : ''}`;
    },
    checkAllDown(game) {
      if (game.state !== 'playing') return;
      if (this.targets(game).length > 0) { this.overT = 0; return; }
      this.overT = (this.overT || 0) + game.frameDt;
      if (this.overT > 0.5) { VX.Net.send({ k: 'over' }); this.allDown(game); }
    },
    allDown(game) {
      if (game.state !== 'playing') return;
      this.down = false; this.deadWait = false;
      game.player.dead = true;
      game.hordeOver();
      game.hud.banner('HABÉIS CAÍDO TODOS', `Aguantasteis ${Math.max(0, VX.HordeMode.wave - 1)} oleadas`, 3);
    },

    // ---------------- oleadas (anfitrión → invitados) ----------------
    hostWave(game, H) {
      VX.Net.send({ k: 'wave', n: H.wave, ev: H.event ? H.event.id : 0, total: H.total, boss: H.bossWave ? 1 : 0, elite: H.eliteWave ? 1 : 0 });
    },
    onWave(game, d) {
      if (!this.isClient) return;
      const H = VX.HordeMode;
      H.wave = d.n; H.phase = 'wave'; H.total = d.total; H.spawned = 0; H.killed = 0;
      H.bossWave = !!d.boss; H.eliteWave = !!d.elite;
      game.floor = H.levelFor(d.n);
      H.dismissMerchant(game);
      H.endEvent(game);
      if (d.ev) H.startEvent(game, d.ev);
      let sub = `${d.total} zombis se acercan`;
      if (H.event) sub = `${H.event.name} · ${H.event.sub} · ${d.total} zombis`;
      if (d.boss) sub += ' · ¡y un jefe!'; else if (d.elite) sub += ' · ¡con un campeón!';
      game.hud.banner(H.event ? `OLEADA ${d.n}: ${H.event.name}` : `OLEADA ${d.n}`, sub, 3.6);
      VX.Audio.roar(); game.shake(0.3);
    },
    hostEndWave(game, n, merchant, special) {
      VX.Net.send({ k: 'ewave', n, m: merchant ? 1 : 0, sp: special ? 1 : 0 });
    },
    onEndWave(game, d) {
      if (!this.isClient) return;
      VX.HordeMode.endWaveLocal(game, d.n, !!d.m, !!d.sp);
    },

    // ---------------- nombres sobre los compañeros y lista en pantalla ----------------
    myName() { const p = VX.Net.players.find((q) => q.id === VX.Net.id); return p ? p.name : 'Jugador'; },
    renderTags(force) {
      const el = document.getElementById('coopTags');
      if (!el) return;
      const R = VX.Renderer;
      if (!this.active || !R.proj || !R.view) { el.innerHTML = ''; return; }
      const PV = M.multiply(R.proj, R.view);
      let html = '';
      const W = window.innerWidth, Hh = window.innerHeight;
      for (const r of this.remotes.values()) {
        if (!r.seen) continue;
        const x = r.x, y = r.y + (r.down ? 0.9 : 2.15), z = r.z;
        const cx = PV[0] * x + PV[4] * y + PV[8] * z + PV[12], cy = PV[1] * x + PV[5] * y + PV[9] * z + PV[13], cw = PV[3] * x + PV[7] * y + PV[11] * z + PV[15];
        if (cw <= 0.1) continue;
        const sx = (cx / cw * 0.5 + 0.5) * W, sy = (1 - (cy / cw * 0.5 + 0.5)) * Hh;
        if (sx < -50 || sx > W + 50 || sy < -50 || sy > Hh + 50) continue;
        const c = r.color.map((v) => Math.round(v * 255)).join(',');
        const hp = Math.max(0, Math.min(1, r.hp / (r.maxHp || 100)));
        const dist = Math.hypot(r.x - VX.game.player.x, r.z - VX.game.player.z);
        const op = dist > 45 ? 0.5 : 1;
        html += `<div class="ctag${r.down ? ' down' : ''}" style="left:${sx | 0}px;top:${sy | 0}px;opacity:${op}"><span style="color:rgb(${c})">${r.name}</span>${r.down ? '<em>¡CAÍDO!</em>' : r.dead ? '<em>muerto</em>' : `<i><b style="width:${Math.round(hp * 100)}%;background:rgb(${c})"></b></i>`}</div>`;
      }
      el.innerHTML = html;
      // lista de jugadores (esquina)
      this.listT = (this.listT || 0) - 1;
      if (this.listT > 0 && !force) return;
      this.listT = 15;
      const pl = document.getElementById('coopPlayers');
      if (!pl) return;
      let s = '';
      const me = VX.game.player;
      s += `<div><b style="color:rgb(${(VX.RemotePlayer.COLORS[Math.max(0, this.order.indexOf(VX.Net.id)) % 4]).map((v) => Math.round(v * 255)).join(',')})">${this.myName()} (tú)</b> ${this.down ? '· CAÍDO' : this.deadWait ? '· muerto' : `· ${Math.round(me.hp)}`}</div>`;
      for (const r of this.remotes.values()) s += `<div><b style="color:rgb(${r.color.map((v) => Math.round(v * 255)).join(',')})">${r.name}</b> ${r.down ? '· CAÍDO' : r.dead ? '· muerto' : `· ${Math.round(r.hp)}`}</div>`;
      pl.innerHTML = s;
    },
  };

  VX.Coop = Coop;
})();
