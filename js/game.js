// Orquestador del juego: estado, flujo de habitaciones, luces, actualización y render.
(function () {
  // llaves: madera, plata y oro (lo que hay detrás de la cerradura depende de la llave)
  VX.KEY_TIERS = {
    wood: { name: 'de madera', col: [0.58, 0.38, 0.2], desc: 'Botín modesto: algo de oro y quizá vida o un explosivo.' },
    silver: { name: 'de plata', col: [0.78, 0.8, 0.86], desc: 'Buen botín: oro, vida y una mejora.' },
    gold: { name: 'de oro', col: [1, 0.78, 0.25], desc: 'Gran botín: mucho oro, vida y una mejora rara.' },
  };
  const M = VX.M;
  const S = VX.S;
  const tmp = [0, 0, 0];

  class Game {
    constructor() {
      this.world = new VX.World();
      this.player = new VX.Player();
      this.weapon = new VX.Weapon();
      this.particles = new VX.Particles();
      this.pickups = new VX.Pickups();
      this.spawner = new VX.Spawner();
      this.hud = VX.HUD;
      this.state = 'title';
      this.frame = 0;
      this.time = 0;
      this.shakeAmt = 0;
      this.dyn = VX.Renderer.createBatch(16384, true);
      this.bullets = new VX.Bullets();
      this.showcase = null;
      this.gun = VX.Renderer.createBatch(2048, true);
      this.lights = [];
      this.lightCut = 30;
      this.zone = 0;
      this.decals = [];
      this.challenge = null;
      // gotas de sangre que caen al suelo dejan mancha
      this.particles.onLand = (x, y, z, s) => { if (Math.random() < 0.35) this.addDecal(x, y, z, 1, s * 1.6); };
      this.resetCollections();
      this.buildTitleScene();
    }

    resetCollections() {
      if (VX.Throw) VX.Throw.reset();
      this.enemies = [];
      this.corpses = [];
      this.gibs = [];
      this.projectiles = [];
      this.shockwaves = [];
      this.telegraphs = [];
      this.pendingExplosions = [];
      this.doorAnims = [];
      this.fallers = [];      // trozos de escenario que caen enteros
      this.oils = [];         // charcos de aceite (arden)
      this.fires = [];        // fuego en el suelo
      this.blasts = [];       // explosiones (bola de fuego, onda y humo)
      this.remains = [];      // restos de los caídos (para el nigromante)
      this.mapPath = [];      // salas recorridas (mapa)
      this.mapReveal = 0;     // salas que quedan con el mapa estudiado
      this.blockFallers = []; // estructuras que se derrumban
      this.rises = [];        // esqueletos que se recomponen
      this.runTime = 0;
      if (this.bullets) this.bullets.clear();
      this.npcs = [];
      this.boss = null;
      this.upgradesTaken = [];
      this.dmgTaken = {}; this.lastHitBy = null; this.dmgSrc = null;   // para la pantalla de muerte
      this.coopTable = '';
      this.synergies = [];
      this.stats = { kills: 0, headshots: 0, bosses: 0, gold: 0, totalGold: 0, shots: 0, hits: 0, purchases: 0, dmgDealt: 0 };
      this.keys = { wood: 0, silver: 0, gold: 0 };
      if (this.hud && this.hud.setKeys) this.hud.setKeys(this.keys);
      this.floor = 0;
      this.currentRoom = null;
      this.decals = [];
      this.challenge = null;
      this.zone = 0;
      this.essenceGain = 0;
    }

    // Escena de fondo de la pantalla de título
    buildTitleScene() {
      this.resetCollections();
      this.world.reset();
      this.particles.clear();
      this.pickups.clear();
      const r = this.world.addStart('normal', 0, ['zp'], VX.RoomPool.normal[0]);
      this.currentRoom = r;
      for (let i = 0; i < 5; i++) {
        const p = r.randomFreeCell(3, 0, -100);
        const zz = p.z * 0.5 + r.centerZ() * 0.5;
        const z = new VX.Zombie(M.choice(['walker', 'walker', 'runner', 'brute', 'spitter']), p.x, zz, 0, { y: this.world.groundAt(p.x, zz) });
        z.spawnT = 0;
        this.enemies.push(z);
      }
      this.player.reset();
      this.player.x = 0; this.player.z = r.worldZ(10); this.player.y = 0;
      VX.Renderer.fogColor = VX.ZONES[0].fog.slice();
      VX.Renderer.fogNear = VX.Renderer.fogFar = VX.Renderer.cullDist = undefined;
      this.mode = 'dungeon';
      this.state = 'title';
      document.getElementById('game').style.filter = ''; this.hud.lastSat = 1;
      this.hud.show(false);
      this.hud.hideBoss();
    }

    // ---------------- Partidas ----------------
    newGame() { this.startRun(null); }
    // mazmorra cooperativa: misma semilla para la primera sala; el resto lo manda el anfitrión
    startCoopDungeon(seed, rng) { this.startRun(null, { coop: true, seed, rng }); }

    continueGame() {
      const data = VX.Save.peek();
      if (!data) return this.newGame();
      this.startRun(data);
    }

    startRun(save, opts = {}) {
      if (!opts.coop && (VX.Coop.active || VX.Net.code)) { VX.Coop.stop(); VX.Net.leave(); }
      this.mode = 'dungeon';
      this.ambientMul = 1;
      { const hp = document.getElementById('hordePerks'); if (hp) hp.innerHTML = ''; }
      VX.Renderer.fogNear = VX.Renderer.fogFar = VX.Renderer.cullDist = undefined;
      this.resetCollections();
      this.world.reset();
      this.particles.clear();
      this.pickups.clear();
      this.player.reset();
      this.weapon.reset();
      this.spawner.reset();
      this.hud.hideBoss();

      let first;
      if (save) {
        Object.assign(this.player, save.player);
        this.weapon.load(save.version2 ? save.weapon : null);
        this.upgradesTaken = (save.upgrades || []).map((id) => VX.Upgrades.byId[id]).filter(Boolean);
        this.synergies = save.synergies || [];
        Object.assign(this.spawner, save.spawner);
        Object.assign(this.stats, save.stats);
        this.floor = save.floor;
        // se reanuda en una sala tranquila; la partida suspendida se consume al cargarla
        first = this.world.addStart('start', save.floor, this.spawner.planExits('zn', 'start', !!save.bossPending).slice(0, 3), null, save.zone || 0);
        first.bossNext = !!save.bossPending;
        VX.Save.clear();
      } else {
        this.floor = 0;
        const rnd0 = Math.random;
        if (opts.rng) Math.random = opts.rng;   // cooperativo: la primera sala sale igual en todos
        try { first = this.world.addStart('start', 0, this.spawner.planExits('zn', 'start', false).concat().slice(0, 3)); } finally { Math.random = rnd0; }
        first.rid = 'S';
        this.applyPerks();
      }
      this.player.dashCdBase = VX.Profile.dashCooldown();
      this.player.dashStock = this.player.dashMax;
      this.priceMul = VX.Profile.priceMul();
      this.player.magnet = Math.max(this.player.magnet, 2 * (VX.Profile.data.perks.iman || 0));
      this.revives = save && save.revives !== undefined ? save.revives : (VX.Profile.data.perks.segunda || 0);
      this.zone = first.zone || 0;
      VX.Renderer.fogColor = VX.ZONES[this.zone].fog.slice();
      first.entered = true;
      first.cleared = true;
      this.currentRoom = first;
      first.setDoor('zn', true);
      if (VX.Audio.setBiome) VX.Audio.setBiome(this.zone);
      this.spawner.populateNeighbors(this, first);
      // las puertas se abren al acercarse (ver openNearDoors)
      // construir mallas de golpe para no ver huecos
      for (const r of this.world.rooms) r.updateMeshes(VX.Renderer, 9999);

      this.player.x = 0;
      this.player.z = first.worldZ(14);
      this.player.yaw = 0;
      this.player.pitch = 0;
      this.hud.refreshUpgrades(this);
      this.state = 'playing';
      VX.Menus.hideAll();
      this.hud.show(true);
      VX.Input.lock();
      if (save) this.hud.banner('PARTIDA REANUDADA', `Continúas en el piso ${save.floor}`, 3);
      else this.hud.banner('VOXEL DUNGEON', `Acércate a una puerta para abrirla  ·  [${VX.Settings.keyName(VX.Settings.key('flashlight'))}] linterna  ·  [${VX.Settings.keyName(VX.Settings.key('inspect'))}] inspeccionar arma`, 3.5);
    }

    // ---------------- Modo Horda ----------------
    startHorde(mapId, opts = {}) {
      this.escaped = false;
      // una partida normal (no cooperativa) cierra cualquier sala abierta
      if (!opts.rng && VX.Coop.active) { VX.Coop.stop(); VX.Net.leave(); }
      const map = VX.HordeMode.MAPS.find((m) => m.id === mapId) || VX.HordeMode.MAPS[0];
      this.mode = 'horde';
      this.hordeMap = map.id;
      if (VX.Audio.setBiome) VX.Audio.setBiome(-1);
      this.ambientMul = 1;
      this.resetCollections();
      this.world.reset();
      this.particles.clear();
      this.pickups.clear();
      this.player.reset();
      this.weapon.reset();
      this.spawner.reset();
      this.hud.hideBoss();
      this.applyPerks();
      this.weapon.limited = false;
      this.player.dashCdBase = VX.Profile.dashCooldown();
      this.player.dashStock = this.player.dashMax;
      this.priceMul = VX.Profile.priceMul();
      this.player.magnet = Math.max(this.player.magnet, 2 * (VX.Profile.data.perks.iman || 0));
      this.revives = VX.Profile.data.perks.segunda || 0;
      // en el cooperativo el azar de la construcción sale de la semilla compartida: mapa idéntico
      const rnd0 = Math.random;
      if (opts.rng) Math.random = opts.rng;
      let r;
      try { r = map.create(); } finally { Math.random = rnd0; }
      r.entered = true; r.cleared = true;
      this.world.rooms.push(r);
      this.currentRoom = r;
      this.zone = map.zone;
      const Z = VX.ZONES[this.zone];
      VX.Renderer.fogColor = Z.fog.slice();
      VX.Renderer.fogNear = Z.fogNear; VX.Renderer.fogFar = Z.fogFar;
      VX.Renderer.cullDist = Z.fogFar + 6; r.drawDist = Z.fogFar + 8;
      r.updateMeshes(VX.Renderer, 99999);
      const st = r.playerStart || { x: r.centerX(), z: r.centerZ() };
      this.player.x = st.x; this.player.z = st.z; this.player.y = this.world.groundAt(st.x, st.z);
      this.player.yaw = Math.PI; this.player.pitch = 0;
      VX.HordeMode.begin(this, map);
      this.hud.refreshUpgrades(this);
      this.state = 'playing';
      VX.Menus.hideAll();
      this.hud.show(true);
      VX.Input.lock();
    }

    // Mejoras permanentes del Santuario (sólo en partidas nuevas)
    applyPerks() {
      const pk = VX.Profile.perkLevels();
      const P = this.player, W = this.weapon;
      P.maxHp += 10 * pk.vigor; P.hp = P.maxHp;
      W.mods.damage *= 1 + 0.06 * pk.fuerza;
      W.mods.recoil = (W.mods.recoil || 1) * (1 - 0.12 * (pk.pulso || 0));
      W.mods.spread *= 1 - 0.1 * (pk.punteria || 0);
      this.stats.gold += 15 * pk.fortuna;
      const sw = VX.Profile.data.startWeapon;
      if (sw && sw !== 'pistol' && VX.Weapons.DEFS[sw] && VX.Profile.weaponUnlocked(sw)) W.slots[0] = W.mk(sw);
      // las mejoras de la partida salen del estilo del arma con la que empiezas
      this.runPool = VX.Upgrades.POOL_OF[W.slots[0].id] || 'precision';
      setTimeout(() => { if (this.state === 'playing' && this.mode !== 'horde') this.hud.toast('Mejoras de esta partida: estilo ' + VX.Upgrades.POOL_NAME[this.runPool].toUpperCase()); }, 2500);
      // «Legado»: empiezas con mejoras al azar
      for (let i = 0; i < pk.legado; i++) {
        const up = VX.Upgrades.random(1, this)[0];
        if (up) { up.apply(this); this.upgradesTaken.push(up); VX.Upgrades.checkSynergies(this); }
      }
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      VX.Menus.fillPause(this);
      VX.Menus.show('pause');
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      VX.Menus.hideAll();
      VX.Input.lock();
    }

    // Guardar y salir (suspender): sólo se puede reanudar una vez y se borra al morir
    saveAndQuit() {
      if (this.mode === 'horde' || VX.Coop.active) { this.abandonRun(); return; }
      const r = this.currentRoom, Sp = this.spawner;
      const snap = { floor: this.floor, bossPending: !!(r.cleared && r.bossNext), zone: this.zone,
        spawner: Sp.snapshot() };
      if (!r.cleared) {
        // la sala a medias no cuenta: se vuelve a jugar una equivalente
        snap.floor = Math.max(0, this.floor - 1);
        if (r.type === 'boss') {
          snap.bossPending = true; snap.zone = r.zone || 0;
          // deshacer lo que contó al entrar en la sala del jefe
          if (r.finalBoss) { snap.spawner.finalPending = true; snap.spawner.loop--; }
          else if (r.secretBoss) snap.spawner.secret = { rooms: 0 };
          else { snap.spawner.bossCount--; snap.spawner.finalPending = false; }
        }
        else snap.spawner.roomsSinceBoss = Math.max(0, Sp.roomsSinceBoss - 1);
      }
      VX.Save.write(this, snap);
      this.quitToTitle();
    }

    // Abandonar = rendirse: cuenta como muerte (esencia incluida) y se borra la partida
    abandonRun() {
      if (this.state !== 'paused') return;
      if (VX.Coop.active) { VX.Coop.stop(); VX.Net.leave(); }   // se sale de la sala: los demás siguen
      VX.Menus.hideAll();
      this.state = 'playing';
      this.player.dead = true;
      this.gameOver();
      this.deathT = 0.8;
    }

    quitToTitle() {
      if (VX.Coop.active || VX.Net.code) { VX.Coop.stop(); VX.Net.leave(); }
      VX.Profile.save();
      VX.Input.unlock();
      this.buildTitleScene();
      VX.Menus.showTitle();
    }

    gameOver() {
      if (this.mode === 'horde') return this.hordeOver();
      VX.Profile.add('runs', 1);
      // esencia: moneda permanente para el Santuario
      this.essenceGain = Math.round(this.floor * 0.8 + this.stats.bosses * 8 + this.stats.kills / 20);
      VX.Profile.add('essence', this.essenceGain);
      this.runResult = VX.Profile.submitRun(this);
      // roguelite: al morir se pierde la partida guardada (la esencia sí se queda)
      VX.Save.clear();
      this.failChallenge(true);
      this.state = 'dying';
      this.deathT = 2.2;
      this.hud.banner('HAS CAÍDO', '', 2);
    }

    // Fin de la partida en la Horda: récord por mapa y esencia según la oleada
    hordeOver() {
      const H = VX.HordeMode, wave = H.wave, done = H.phase === 'wave' ? wave - 1 : wave;
      VX.Profile.add('runs', 1);
      this.essenceGain = Math.round(done * 1.6 + this.stats.kills / 18 + this.stats.bosses * 8);
      VX.Profile.add('essence', this.essenceGain);
      const D = VX.Profile.data;
      D.hordeBest = D.hordeBest || {};
      const prev = D.hordeBest[this.hordeMap];
      const record = !prev || done > prev.wave || (done === prev.wave && this.stats.kills > prev.kills);
      if (record) D.hordeBest[this.hordeMap] = { wave: done, kills: this.stats.kills, date: new Date().toISOString().slice(0, 10) };
      VX.Profile.save();
      this.runResult = { horde: true, wave, done, record, prev };
      this.coopTable = VX.Coop.active ? VX.Coop.table(this, true) : '';   // tabla final del cooperativo
      this.state = 'dying';
      this.deathT = 2.2;
      this.hud.banner('HAS CAÍDO', `Aguantaste ${done} oleada${done === 1 ? '' : 's'}`, 2);
    }

    // Final con huida: has subido al helicóptero
    hordeWin() {
      if (this.state !== 'playing') return;
      const H = VX.HordeMode, done = H.wave;
      VX.Profile.add('runs', 1);
      this.essenceGain = Math.round(done * 1.6 + this.stats.kills / 18 + this.stats.bosses * 8 + 40 + done * 2);
      VX.Profile.add('essence', this.essenceGain);
      const D = VX.Profile.data;
      D.hordeEscapes = (D.hordeEscapes || 0) + 1;
      D.hordeBest = D.hordeBest || {};
      const prev = D.hordeBest[this.hordeMap];
      const record = !prev || done > prev.wave || (done === prev.wave && !prev.escaped);
      if (record) D.hordeBest[this.hordeMap] = { wave: done, kills: this.stats.kills, escaped: true, date: new Date().toISOString().slice(0, 10) };
      VX.Profile.save();
      this.runResult = { horde: true, wave: done, done, record, prev, escaped: true };
      this.coopTable = VX.Coop.active ? VX.Coop.table(this, true) : '';
      this.escaped = true;
      VX.Coop.down = false; VX.Coop.deadWait = false;
      this.state = 'dying';
      this.deathT = 4;
      this.hud.banner('¡HAS ESCAPADO!', `Evacuado tras ${done} oleadas · +${this.essenceGain} de esencia`, 3.8);
      VX.Audio.reward();
    }

    // Nivel de detalle de cada zombi según la distancia y la calidad: lejos, modelo más simple
    // (vóxeles el doble de grandes) y animación a menos fotogramas por segundo
    enemyLod() {
      const Q = VX.Q || {}, P = this.player, f = this.frame || 0;
      for (const e of this.enemies) {
        if (e.dead || e.isBoss) { e.lod = false; e.lodSkip = false; continue; }
        const d = Math.hypot(e.x - P.x, e.z - P.z);
        e.lod = d > (Q.lodNear || 999);
        e.lodSkip = d > (Q.animFar || 999) && ((f + (e.uid || 0)) % (Q.animDiv || 2)) !== 0;
      }
    }

    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

    // ---------------- Flujo de habitaciones ----------------
    // Las salidas de una sala despejada se abren cuando te acercas; en ese momento se
    // prepara lo que hay detrás (vendedor, altar…) para que nunca se vea una sala vacía
    // Las puertas de salida se abren a voluntad: acércate y pulsa E
    openNearDoors() {
      const cr = this.currentRoom, P = this.player;
      this.doorFocus = null;
      if (!cr || !cr.cleared || this.state !== 'playing') return;
      let best = 2.4;
      for (const s of cr.exits) {
        const d = cr.doors[s];
        if (!d || !d.closed || !d.neighbor) continue;
        const w = cr.doorWorld(s);
        const dist = Math.hypot(P.x - w.x, P.z - w.z);
        if (dist < best) { best = dist; this.doorFocus = { side: s, type: d.type }; }
      }
      if (this.doorFocus && !this.pickups.focus && VX.Input.wasPressed(VX.Settings.key('use'))) {
        const s = this.doorFocus.side, d = cr.doors[s];
        if (VX.Coop.active) VX.Net.send({ k: 'door', rid: cr.rid, s }, VX.Coop.isHost ? undefined : 'all');   // los compañeros también la ven abrirse
        this.spawner.prepare(this, d.neighbor);
        cr.setDoor(s, false);
        // el rastrillo sube (animación) en lugar de desaparecer
        this.doorAnims.push({ room: cr, side: s, t: 0, dur: 1.0 });
        VX.Audio.gate();
        this.shake(0.12);
        this.doorFocus = null;
      }
    }

    // un compañero ha abierto una puerta de esta sala
    openDoorRemote(rid, s) {
      const cr = this.currentRoom;
      if (!cr || cr.rid !== rid) return;
      const d = cr.doors[s];
      if (!d || !d.closed || !d.neighbor) return;
      this.spawner.prepare(this, d.neighbor);
      cr.setDoor(s, false);
      this.doorAnims.push({ room: cr, side: s, t: 0, dur: 1.0 });
      VX.Audio.gate();
      this.shake(0.08);
    }

    roomLogic() {
      const P = this.player;
      const cr = this.currentRoom;
      this.openNearDoors();
      for (const s in cr.doors) {
        const n = cr.doors[s].neighbor;
        if (n && !cr.doors[s].closed && n.insideDeep(P.x, P.z)) { this.enterRoom(n); return; }
      }
      // cooperativo (invitado): los zombis, las oleadas y cuándo se despeja la sala los decide el anfitrión
      if (VX.Coop.isClient) return;
      this.enemyWatch(cr);
      if (cr.ambushAt) {
        // silencio tenso: el ambiente y la música se apagan justo antes de que salten
        if (!cr.ducked) { cr.ducked = true; VX.Audio.duck && VX.Audio.duck(Math.max(0.6, cr.ambushAt - this.time + 0.15)); }
        if (this.time < cr.ambushAt) return;
        cr.ambushAt = 0;
        // ¡emboscada! salen del suelo a tu alrededor
        const P2 = this.player;
        for (let i = 0; i < cr.ambushN; i++) {
          const a = (i / cr.ambushN) * 6.283 + Math.random() * 0.5, d = M.rand(3.5, 6);
          const x = P2.x + Math.sin(a) * d, z = P2.z + Math.cos(a) * d;
          const ok = cr.contains(x, z) && !this.world.boxCollides(x - 0.3, this.world.groundAt(x, z) + 0.3, z - 0.3, x + 0.3, this.world.groundAt(x, z) + 1.6, z + 0.3);
          if (ok) this.spawner.spawnZombieNear(this, x, z, 0.5, this.spawner.pickKind(this.floor, cr.zone || 0));
          else this.spawner.spawnWave(this, cr, 1);
        }
        this.hud.banner('¡EMBOSCADA!', 'Estaban esperándote', 2.2);
        VX.Audio.roar(); this.shake(0.4);
        return;
      }
      if (!cr.cleared && cr.entered) {
        const alive = this.enemies.filter((e) => !e.dead).length + this.rises.length;
        if (cr.pendingWaves > 0 && alive <= 1) {
          cr.pendingWaves--;
          this.spawner.spawnWave(this, cr, cr.waveSize || 3);
          this.hud.banner('¡OLEADA!', 'Más zombis salen del suelo', 2);
          VX.Audio.roar();
        } else if (alive === 0 && cr.pendingWaves <= 0) this.clearRoom(cr);
      }
    }

    // ---------------- Vigilante de enemigos atascados ----------------
    // A veces un enemigo se queda vivo pero no se ve: metido en una pared o en el suelo, fuera de la
    // sala, o con el cuerpo ya destrozado sin haber muerto. La sala no se despeja y algo te pega sin
    // que lo veas. Cada medio segundo se revisa a los que quedan:
    //  · sin cuerpo visible o con la posición rota → muere
    //  · fuera de la sala, bajo el suelo o dentro de un bloque un rato → se le saca a un sitio libre
    //  · si sólo quedan 1 o 2 y nadie les hace daño en 40 s → se les saca delante; a la segunda, se desvanecen
    enemyWatch(cr) {
      if (this.time < (this.watchAt || 0)) return;
      this.watchAt = this.time + 0.5;
      const live = this.enemies.filter((e) => !e.dead && !(e.spawnT > 0));
      if (!live.length) return;
      const few = live.length <= 2 && !this.boss;
      for (const e of live) {
        const now = this.time;
        if (e._wHp !== e.hp) { e._wHp = e.hp; e._wHpT = now; }
        if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.y)) { this.watchKill(e, 'perdido'); continue; }
        if (e.isBoss) continue;
        // ¿le queda algo que se vea?
        let vis = 0;
        for (const p of e.body.parts) if (!p.detached && !p.hidden) { for (const v of p.vox) if (v.alive) { vis++; if (vis > 3) break; } if (vis > 3) break; }
        if (vis <= 3 && !e.T.grows) { this.watchKill(e, 'sin cuerpo'); continue; }
        // ¿atascado?
        const g = this.world.groundAt(e.x, e.z);
        const out = !cr.contains(e.x, e.z) || e.y < g - 1.2 || e.y < -4 ||
          (!e.T.fly && this.world.boxCollides(e.x - 0.15, e.y + 0.5, e.z - 0.15, e.x + 0.15, e.y + 1.1, e.z + 0.15));
        e._wOut = out ? (e._wOut || 0) + 0.5 : 0;
        if (e._wOut >= 3) { e._wOut = 0; this.watchPull(e, cr, false); continue; }
        // los últimos, escondidos sin que nadie les dé
        if (few && now - (e._wHpT || now) > 40) {
          e._wHpT = now;
          if (e._wPulled) this.watchKill(e, 'escondido');
          else { e._wPulled = true; this.watchPull(e, cr, true); }
        }
      }
    }
    watchPull(e, cr, tell) {
      const P = this.player;
      for (let i = 0; i < 80; i++) {
        const a = Math.random() * 6.283, d = 3 + Math.random() * 6;
        const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
        if (!cr.insideDeep(x, z)) continue;
        const y = this.world.groundAt(x, z);
        if (this.world.boxCollides(x - 0.35, y + 0.2, z - 0.35, x + 0.35, y + 1.7, z + 0.35)) continue;
        e.x = x; e.z = z; e.y = y; e.vy = 0; e.vx = e.vz = 0; e.path = null;
        if (e.body) { e.body.x = x; e.body.y = y; e.body.z = z; e.body.computeWorld && e.body.computeWorld(); }
        for (let k = 0; k < 25; k++) this.particles.spawn(x, y + 0.8, z, M.rand(-1.5, 1.5), M.rand(0.5, 3), M.rand(-1.5, 1.5), 0.5, 0.2, 0.7, 0.04, M.rand(0.6, 1.2), 1, 1);
        if (tell) { this.hud.toast('¡El último estaba escondido: ahí lo tienes!'); VX.Audio.roar && VX.Audio.roar(); }
        return true;
      }
      this.watchKill(e, 'atascado');
      return false;
    }
    watchKill(e, why) {
      e.allowDie = true; e.hp = 0; e.noLoot = true;
      try { e.die([0, 1, 0], this); } catch (err) { e.dead = true; }
      e.dead = true;
      this.hud.toast(why === 'escondido' ? 'El último enemigo se ha desvanecido' : 'Un enemigo atascado se ha desvanecido');
    }

    enterRoom(r) {
      if (VX.Audio.setBiome) VX.Audio.setBiome(this.mode === 'horde' ? -1 : (r.zone || 0));
      const prev = this.currentRoom;
      this.currentRoom = r;
      r.entered = true;
      this.floor = r.index;
      VX.Profile.max('bestFloor', this.floor, this);
      for (const s of this.weapon.slots) VX.Profile.maxW(s.id, 'floor', this.floor, this);
      VX.Profile.save();
      this.bullets.clear();
      // la sala anterior y las otras opciones desaparecen: la puerta se cierra detrás
      this.world.keepOnly([r]);
      { const mo = document.getElementById('mapOverlay'); if (mo) mo.classList.add('hidden'); this.hud.mapOpen = false; }
      // el rastrillo de la entrada cae a tu espalda (se cierra al terminar la animación)
      this.doorAnims = this.doorAnims.filter((a) => a.room === r);
      this.doorAnims.push({ room: r, side: r.entrance, t: 0, dur: 0.38, drop: true });
      this.pickups.items = this.pickups.items.filter((it) => r.contains(it.x, it.z));
      this.pickups.gold = this.pickups.gold.filter((g) => r.contains(g.x, g.z));
      this.npcs = this.npcs.filter((n) => r.contains(n.body.x, n.body.z));
      this.setupVault(r);
      if (r.vault && !r.vault.open && this.keys && (this.keys.wood || this.keys.silver || this.keys.gold)) this.hud.toast('Hay una cerradura dorada en esta sala: ábrela con tu llave');
      this.enemies = [];
      this.gibs = this.gibs.filter((g) => r.contains(g.x, g.z));
      this.corpses = this.corpses.filter((c) => r.contains(c.body.x, c.body.z));
      this.decals = this.decals.filter((d) => r.contains(d.x, d.z));
      this.oils = this.oils.filter((o) => r.contains(o.x, o.z));
      this.fires = this.fires.filter((f) => r.contains(f.x, f.z));
      this.fallers = []; this.rises = [];
      this.failChallenge(true);
      let zoneMsg = null;
      if ((r.zone || 0) !== this.zone) {
        this.zone = r.zone || 0;
        const Z = VX.ZONES[this.zone];
        zoneMsg = [Z.name, Z.sub];
      }
      if (r.type !== 'boss') { this.hud.hideBoss(); this.boss = null; }
      this.champion = null; this.remains = [];
      (this.mapPath || (this.mapPath = [])).push({ type: r.type, zone: r.zone || 0, floor: r.index });
      if (this.mapPath.length > 40) this.mapPath.shift();
      if (this.mapReveal > 0) this.mapReveal--;
      VX.Horde.reset();
      this.hud.roomT = 0;
      this.spawner.onEnter(this, r);
      if (VX.Coop.active) VX.Coop.roomEntered(this, r);
      if (r.template && r.template.event && r.type === 'normal') { this.hud.banner(r.template.name.toUpperCase(), r.template.sub, 3.2); VX.Audio.roar && VX.Audio.roar(); }
      // las salas siguientes se generan ya, detrás de puertas cerradas
      this.spawner.populateNeighbors(this, r);
      void prev;
      if (r.type === 'normal' || r.type === 'boss') {
        r.cleared = false;
        if (zoneMsg) this.hud.banner(zoneMsg[0], zoneMsg[1], 3.5);
        else if (r.dark && !this.challenge) this.hud.banner('SALA A OSCURAS', this.player.flashlight ? 'Sólo tienes tu linterna' : `Enciende la linterna [${VX.Settings.keyName(VX.Settings.key('flashlight'))}]`, 2.6);
        else if (r.type === 'normal' && !this.challenge) this.hud.banner('PISO ' + this.floor, r.name + (r.exits.length > 1 ? ` · ${r.exits.length} salidas` : ''));
      } else {
        const sub = { shop: 'Gasta tu oro con cabeza', reward: 'Una mejora te espera en el altar', save: 'Descansa en el cristal o cambia oro por esencia' };
        const title = { shop: 'VENDEDOR', reward: 'RECOMPENSA', save: 'FUENTE DE ALMAS' };
        if (zoneMsg) this.hud.banner(zoneMsg[0], zoneMsg[1], 3.5);
        else this.hud.banner(title[r.type], sub[r.type]);
        this.clearRoom(r, true);
      }
    }

    clearRoom(r, silent) {
      if (r.cleared && VX.Coop.isClient) return;
      r.cleared = true;
      if (VX.Coop.isHost && this.mode === 'dungeon') VX.Net.send({ k: 'clear', rid: r.rid, s: silent ? 1 : 0 });
      // las salidas quedan desbloqueadas pero cerradas: se abren al acercarte
      if (!silent) {
        VX.Audio.door();
        // calidad de vida: el oro que quede en el suelo vuela hacia ti
        for (const g of this.pickups.gold) { g.homing = true; g.delay = Math.min(g.delay, 0.3); }
        if (this.player.regenRoom) this.player.heal(this.player.regenRoom);
        const ch = this.completeChallenge();
        if (r.type === 'boss' && r.finalBoss) this.victory();
        if (r.type === 'boss') {
          this.hud.hideBoss();
          this.hud.banner('¡JEFE DERROTADO!', 'Recompensa: mejora gratis y vida restaurada', 3.5);
          this.player.heal(this.player.maxHp);
          const up = VX.Upgrades.random(1, this)[0];
          const bz = this.boss ? this.boss.z : r.centerZ();
          const bx = this.boss ? this.boss.x : r.centerX();
          this.pickups.addItem({ kind: 'upgrade', up, price: 0, x: bx, y: this.world.groundAt(bx, bz) + 0.3, z: bz, title: up.name, desc: up.desc, color: up.color, shape: up.shape });
          // el jefe suelta un arma
          const notOwned = VX.Weapons.GUNS.filter((id) => !this.weapon.has(id) && VX.Profile.weaponUnlocked(id));
          if (notOwned.length) {
            const gid = M.choice(notOwned), d = VX.Weapons.DEFS[gid];
            const wx = bx + 2, wz = bz;
            this.pickups.addItem({ kind: 'weapon', weapon: gid, price: 0, x: wx, y: this.world.groundAt(wx, wz) + 0.2, z: wz, title: d.name, desc: VX.weaponDesc(gid), color: [1, 0.85, 0.5], shape: 'star' });
            this.hud.banner('¡JEFE DERROTADO!', `Ha soltado: ${d.name}. Vida restaurada.`, 3.5);
          }
          // y una mejora rara
          const rare = VX.Upgrades.random(1, this, [], 'rare')[0];
          if (rare) {
            const rx = bx - 2, rz = bz;
            this.pickups.addItem({ kind: 'upgrade', up: rare, price: 0, x: rx, y: this.world.groundAt(rx, rz) + 0.3, z: rz, title: rare.name, desc: rare.desc, color: rare.color, shape: rare.shape });
          }
          this.stats.bosses = this.stats.bosses || 0;
          this.boss = null;
        } else if (r.event === 'merchant') {
          this.spawnMerchant(r);
        } else if (!ch && r.event !== 'chest') {
          this.hud.banner('SALA DESPEJADA', r.exits.length > 1 ? 'Elige tu camino' : 'La puerta se abre...');
        }
      }
    }

    // Motas de polvo que sólo se ven dentro del haz de la linterna
    renderDust(b, cam) {
      const D = this.dust || (this.dust = []);
      const cp = Math.cos(cam.pitch), fx = Math.sin(cam.yaw) * cp, fy = Math.sin(cam.pitch), fz = Math.cos(cam.yaw) * cp;
      const dt = this.frameDt || 0.016;
      while (D.length < 90) D.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, ph: Math.random() * 10 });
      for (const d of D) {
        const rx = d.x - cam.x, ry = d.y - cam.y, rz = d.z - cam.z;
        const along = rx * fx + ry * fy + rz * fz;
        if (along < 0.3 || along > 7 || rx * rx + ry * ry + rz * rz > 60) {
          // renacer en algún punto del cono
          const t = 0.5 + Math.pow(Math.random(), 0.7) * 6, sp = t * 0.32;
          d.x = cam.x + fx * t + M.rand(-sp, sp); d.y = cam.y + fy * t + M.rand(-sp, sp) * 0.8; d.z = cam.z + fz * t + M.rand(-sp, sp);
          d.vx = M.rand(-0.05, 0.05); d.vy = M.rand(-0.03, 0.02); d.vz = M.rand(-0.05, 0.05);
          continue;
        }
        d.ph += dt;
        d.x += (d.vx + Math.sin(d.ph * 0.7) * 0.03) * dt; d.y += d.vy * dt; d.z += (d.vz + Math.cos(d.ph * 0.6) * 0.03) * dt;
        const l = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
        const c = along / l;                       // coseno respecto al eje del haz
        const k = M.smoothstep(0.9, 0.975, c) * (1 - along / 7.5) * (0.6 + 0.4 * Math.sin(d.ph * 3));
        if (k < 0.04) continue;
        b.box(d.x, d.y, d.z, 0.008, 0.008, 0.008, 0.9, 0.85, 0.7, Math.min(1, k * 0.7));
      }
    }

    // Material del suelo bajo los pies (para el sonido de los pasos)
    surfaceAt(x, y, z) {
      const S = VX.S, B = VX.Blocks, gx = Math.floor(x / S), gz = Math.floor(z / S), gy = Math.floor((y - 0.05) / S);
      const r = this.currentRoom;
      if (gy >= 0) {
        const b = this.world.getBlock(gx, gy, gz);
        if (b === B.WOOD || b === B.PLANK || b === B.WBARREL) return 'wood';
        if (b === B.METAL || b === B.IRON || b === B.DOOR || b === B.GOLDB) return 'metal';
        if (b === B.BONE) return 'bone';
        if (b === B.CRYSTAL) return 'crystal';
        if (b === B.TERRAIN) return 'dirt';
        if (b === B.PROP) return 'wood';
      }
      if (r) {
        const Z = VX.ZONES[r.zone || 0];
        const tx = r.ox + ((gx - r.ox) & ~1), tz = r.oz + ((gz - r.oz) & ~1);
        if (Z.damp && r.isPuddle(tx, tz, Z.damp)) return 'water';
        for (const sp of r.spikes) if (sp.kind !== 'spikes' && Math.abs(x - r.uX((sp.ux0 + sp.ux1 + 1) / 2)) < (sp.ux1 - sp.ux0 + 1) * 0.5 && Math.abs(z - r.uZ((sp.uz0 + sp.uz1 + 1) / 2)) < (sp.uz1 - sp.uz0 + 1) * 0.5) return 'water';
        if (Z.id === 'minas') return 'dirt';
        if (Z.id === 'vacio') return 'crystal';
        if (Z.id === 'cripta' && Math.random() < 0.25) return 'bone';
      }
      return 'stone';
    }

    // Sonido continuo del fuego cercano (y crepitar) y de la lluvia en los mapas con temporal
    envAudio(dt) {
      const A = VX.Audio, P = this.player, on = this.state === 'playing' || this.state === 'dead';
      let lvl = 0, best = 0, pan = 0;
      if (on) {
        const add = (x, z, size) => {
          const d = Math.hypot(x - P.x, z - P.z), k = size * Math.max(0, 1 - d / 16);
          if (k <= 0) return;
          lvl += k;
          if (k > best) { best = k; const sp = A.spatial ? A.spatial(x, z, P) : { pan: 0 }; pan = sp.pan; }
        };
        for (const f of this.fires) if (f.kind !== 'poison') add(f.x, f.z, 0.5 + f.r * 0.5);
        const r = this.currentRoom;
        if (r) {
          for (const p of r.props) if (p.burning > 0 && !p.dead) add(p.cx, p.cz, 1);
          for (const f of r.features) if (f.kind === 'flame') add(f.x, f.z, f.small ? 0.35 : 0.9);
        }
        lvl = Math.min(1.6, lvl);
      }
      A.setFire(lvl, pan);
      if (lvl > 0.05) {
        this.crackT = (this.crackT || 0) - dt;
        while (this.crackT <= 0) { this.crackT += M.rand(0.04, 0.3) / Math.max(0.3, lvl); A.crackle(Math.min(1, 0.35 + lvl * 0.5), pan + M.rand(-0.2, 0.2)); }
      }
      const rain = on ? ({ 9: 1, 6: 0.3 }[this.zone] || 0) * (this.mode === 'horde' ? 1 : 0) : 0;
      A.setRain(rain);
    }

    // Sonidos de ambiente que salen de puntos concretos de la sala (según el bioma)
    ambientSounds(dt) {
      const r = this.currentRoom, P = this.player;
      if (!r || !VX.Audio.ambientAt) return;
      // reverberación según el volumen de la sala
      if (this._revRoom !== r) { this._revRoom = r; VX.Audio.setRoom(r.city ? 260 : r.walkArea() * r.ceilBase * VX.S); }
      this.ambT = (this.ambT || 2) - dt;
      if (this.ambT > 0) return;
      this.ambT = M.rand(2.5, 6);
      const KINDS = [
        ['drip', 'chain', 'creak', 'wind', 'moan', 'chain'],
        ['drip', 'drip', 'bubble', 'creak', 'moan', 'wind'],
        ['pebbles', 'rumble', 'creak', 'hammer', 'drip', 'pebbles'],
        ['bubble', 'hammer', 'hammer', 'rumble', 'wind', 'chain'],
        ['drip', 'chime', 'creak', 'wind', 'bubble', 'drip'],
        ['whisper', 'chime', 'wind', 'whisper', 'moan', 'rumble'],
        ['wind', 'moan', 'wind', 'rumble', 'moan', 'creak'],
        ['wind', 'moan', 'chime', 'wind', 'rumble', 'moan'],
        ['wind', 'moan', 'chain', 'wind', 'rumble', 'creak'],
        ['creak', 'wind', 'rumble', 'creak', 'moan', 'chain'],
      ][r.zone || 0] || ['wind', 'moan'];
      const a = Math.random() * 6.283, d = M.rand(4, 14);
      VX.Audio.ambientAt(M.choice(KINDS), P.x + Math.sin(a) * d, P.z + Math.cos(a) * d);
    }

    // ---------- Fuego volumétrico de vóxeles ----------
    // Un campo de ruido que sube con el tiempo: donde la "densidad" supera un umbral
    // hay un vóxel de llama. Abajo es denso y claro (amarillo), arriba se deshilacha
    // en lenguas naranjas y rojas que se separan y suben.
    fireVolume(b, cx, by, cz, rx, rz, H, t, seed, k = 1) {
      const s = 0.075;
      const nx = Math.max(2, Math.ceil(rx * 2 / s)), nz = Math.max(2, Math.ceil(rz * 2 / s)), ny = Math.ceil(H / s);
      const vn = VX.vnoise;
      for (let ix = 0; ix < nx; ix++) {
        const x = cx - rx + (ix + 0.5) * s, ux = (x - cx) / rx;
        for (let iz = 0; iz < nz; iz++) {
          const z = cz - rz + (iz + 0.5) * s, uz = (z - cz) / rz;
          const r2 = ux * ux + uz * uz;
          if (r2 > 1) continue;
          for (let iy = 0; iy < ny; iy++) {
            const y = by + (iy + 0.5) * s, h = iy / ny;
            // se estrecha hacia arriba
            if (r2 > (1 - h * 0.85) * (1 - h * 0.85) + 0.05) continue;
            const base = h * 1.25 + r2 * 0.55 + 0.2;
            const n1 = vn(x * 4.2 + seed, y * 3.4 - t * 3.2, z * 4.2) * 0.65;
            if ((n1 + 0.35) * k < base) continue;          // ni con el segundo octavo llegaría
            const n = n1 + vn(x * 9 + seed * 2, y * 7 - t * 5.5, z * 9) * 0.35;
            const d = n * k - base + 0.1;
            if (d < 0.1) continue;
            let c;
            const heat = d + (1 - h) * 0.3;
            if (heat > 0.75) c = [1, 0.88, 0.5];
            else if (heat > 0.52) c = [1, 0.6, 0.12];
            else if (heat > 0.36) c = [0.97, 0.38, 0.06];
            else c = [0.72, 0.14, 0.03];
            const sz = s * (0.75 + Math.min(0.35, d));
            b.box(x, y, z, sz, sz, sz, c[0], c[1], c[2], 1);
          }
        }
      }
    }

    renderFlames(b) {
      const t = this.time, P = this.player;
      // fuego en el suelo (sólo los cercanos con todo el detalle)
      const near = this.fires.filter((f) => f.kind !== 'poison').sort((a, c) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(c.x - P.x, c.z - P.z));
      near.forEach((f, i) => {
        if (f.seed === undefined) { f.seed = Math.random() * 50; f.t0 = f.t; }
        const life = Math.min(1, f.t / 1) * Math.min(1, (f.t0 - f.t + 0.1) / 0.4);
        const gy = this.world.groundAt(f.x, f.z);
        const R = f.r * 0.9;
        if (i < 4) this.fireVolume(b, f.x, gy, f.z, R, R, 0.7 + f.r * 0.6, t, f.seed, 0.9 + life * 0.45);
        // brasas en el suelo
        for (let k = 0; k < 10; k++) {
          const a = k * 2.4 + f.seed, d = R * (0.3 + (k % 4) * 0.22);
          const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d, gl = 0.5 + 0.5 * Math.sin(t * 3 + k);
          b.box(x, gy + 0.01, z, 0.08, 0.02, 0.08, 0.6 + gl * 0.4, 0.14 + gl * 0.16, 0.02, 0.9);
        }
      });
      // objetos ardiendo
      if (this.currentRoom) for (const p of this.currentRoom.props) {
        if (!(p.burning > 0) || p.dead) continue;
        const PV = VX.PV, w = p.w * PV, d = p.d * PV, top = p.oy + p.h * PV;
        const life = Math.min(1, p.burning / 1.5);
        if (p.seed === undefined) p.seed = Math.random() * 50;
        this.fireVolume(b, p.cx, top - 0.12, p.cz, w * 0.55, d * 0.55, 0.45 + Math.min(0.4, (w + d) * 0.3), t, p.seed, 0.8 + life * 0.35);
        if (Math.random() < 0.15) this.particles.spawn(p.cx, top + 0.6, p.cz, M.rand(-0.2, 0.2), M.rand(0.5, 0.9), M.rand(-0.2, 0.2), 0.1, 0.09, 0.09, M.rand(0.08, 0.13), 2.2, 0, 1);
      }
      // enemigos en llamas: el fuego les envuelve
      for (const e of this.enemies) {
        if (e.dead || !(e.burn > 0)) continue;
        if (e.seed === undefined) e.seed = Math.random() * 50;
        const H = e.body.height;
        this.fireVolume(b, e.x, e.y + H * 0.2, e.z, 0.3, 0.3, H * 0.95, t, e.seed, 0.95);
      }
    }

    // ---------- Mapa ----------
    studyMap() {
      this.mapReveal = 9;
      const r = this.currentRoom;
      for (const s of r.exits) { const n = r.doors[s] && r.doors[s].neighbor; if (n) this.spawner.planFor(this, n); }
      VX.Audio.upgrade();
      this.hud.banner('HAS ESTUDIADO EL MAPA', 'Pulsa M: verás las salas que vienen y las grietas secretas', 4);
      this.hud.showMap(this, true);
    }

    // ---------- Nigromante: levanta a los caídos ----------
    raiseDead(necro) {
      const list = this.remains.filter((r) => Math.hypot(r.x - necro.x, r.z - necro.z) < 12 && this.time - r.t > 2);
      if (!list.length || this.enemies.filter((e) => !e.dead).length > 12) return false;
      for (const r of list.slice(0, 2)) {
        this.remains.splice(this.remains.indexOf(r), 1);
        // un hilo violeta del nigromante al cadáver
        for (let i = 0; i < 16; i++) {
          const k = i / 16;
          this.particles.spawn(M.lerp(necro.x, r.x, k), necro.y + 1.6 - k * 1.4, M.lerp(necro.z, r.z, k), 0, 0.3, 0, 0.7, 0.3, 1, 0.04, 0.8, 1, 1);
        }
        setTimeout(() => {
          if (this.state !== 'playing' || necro.dead) return;
          const z = this.spawner.spawnZombieNear(this, r.x, r.z, 0.3, r.kind);
          if (z) z.reanimated = true;
          for (let i = 0; i < 20; i++) this.particles.spawn(r.x + M.rand(-0.4, 0.4), 0.1, r.z + M.rand(-0.4, 0.4), 0, M.rand(1, 3), 0, 0.6, 0.25, 0.95, 0.05, 1, 1, 1);
        }, 900);
      }
      VX.Audio.phase && VX.Audio.phase();
      this.hud.toast('El nigromante levanta a los muertos…');
      return true;
    }

    // ---------- Agua ----------
    waterAt(x, z) {
      const r = this.currentRoom;
      if (!r) return false;
      for (const sp of r.spikes) {
        if (sp.kind !== 'water') continue;
        if (x > r.uX(sp.ux0) && x < r.uX(sp.ux1 + 1) && z > r.uZ(sp.uz0) && z < r.uZ(sp.uz1 + 1)) return true;
      }
      return false;
    }

    // ---------- Marcas permanentes: hollín y agujeros de bala ----------
    addScorch(x, z, R) {
      const n = Math.round(6 + R * 8);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * R;
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        const k = 0.03 + Math.random() * 0.04;
        this.decals.push({ x: px, y: this.world.groundAt(px, pz), z: pz, axis: 1, sign: 1, s: M.rand(0.12, 0.35) * (1 - d / (R + 0.5) * 0.5), r: k, g: k * 0.9, b: k * 0.85, life: 1 });
      }
      if (this.decals.length > 900) this.decals.splice(0, this.decals.length - 900);
    }
    addBulletHole(h) {
      const axis = h.nx ? 0 : h.ny ? 1 : 2, sign = h.nx || h.ny || h.nz;
      this.decals.push({ x: h.x, y: h.y, z: h.z, axis, sign, s: M.rand(0.035, 0.06), r: 0.03, g: 0.028, b: 0.026, life: 1 });
      if (Math.random() < 0.4) this.decals.push({ x: h.x + (axis ? M.rand(-0.04, 0.04) : 0), y: h.y + (axis !== 1 ? M.rand(-0.04, 0.04) : 0), z: h.z + (axis !== 2 ? M.rand(-0.04, 0.04) : 0), axis, sign, s: M.rand(0.08, 0.12), r: 0.09, g: 0.085, b: 0.08, life: 1 });
      if (this.decals.length > 900) this.decals.splice(0, this.decals.length - 900);
    }

    // Partículas de ambiente de cada bioma alrededor del jugador
    updateAmbience(dt) {
      const r = this.currentRoom;
      if (!r) return;
      const P = this.player, z = r.zone || 0;
      const ceil = r.ceilBase * VX.S;
      this.ambAcc = (this.ambAcc || 0) + dt;
      const rate = [7, 4, 6, 16, 12, 10, 40, 10, 8, 30][z] || 6;          // partículas por segundo
      while (this.ambAcc > 1 / rate) {
        this.ambAcc -= 1 / rate;
        const a = Math.random() * 6.283, d = 1 + Math.random() * 9;
        const x = P.x + Math.sin(a) * d, zz = P.z + Math.cos(a) * d;
        if (!r.contains(x, zz)) continue;
        const g = this.world.groundAt(x, zz);
        switch (z) {
          case 0: // Cripta: polvo que flota en el aire
            this.particles.spawn(x, g + M.rand(0.3, 3), zz, M.rand(-0.08, 0.08), M.rand(-0.03, 0.03), M.rand(-0.08, 0.08), 0.5, 0.47, 0.42, 0.012, M.rand(3, 6), 0.15, 1);
            break;
          case 1: // Cloacas: goteo del techo
            this.particles.spawn(x, ceil - 0.1, zz, 0, -0.5, 0, 0.45, 0.6, 0.45, 0.018, 2.5, 0.25);
            this.drips = (this.drips || 0) + 1;
            if (this.drips % 3 === 0) this.dripAt = { x, z: zz, t: (ceil - g) / 9 };   // sonará al llegar al suelo
            break;
          case 2: // Minas: arenilla que cae de las vigas
            if (Math.random() < 0.6) this.particles.spawn(x, ceil - 0.2, zz, M.rand(-0.1, 0.1), -0.2, M.rand(-0.1, 0.1), 0.42, 0.36, 0.28, 0.015, 3, 0);
            else this.particles.spawn(x, g + M.rand(0.5, 2.5), zz, M.rand(-0.05, 0.05), 0, M.rand(-0.05, 0.05), 0.5, 0.45, 0.35, 0.012, 4, 0.1, 1);
            break;
          case 3: // Forja: ceniza que cae y pavesas que suben
            if (Math.random() < 0.55) this.particles.spawn(x, g + M.rand(0.1, 1.5), zz, M.rand(-0.3, 0.3), M.rand(0.6, 1.4), M.rand(-0.3, 0.3), 1, M.rand(0.35, 0.6), 0.1, 0.018, M.rand(1.5, 3), 1, 1);
            else this.particles.spawn(x, ceil - 0.3, zz, M.rand(-0.15, 0.15), M.rand(-0.35, -0.2), M.rand(-0.15, 0.15), 0.22, 0.2, 0.2, 0.02, 6, 0, 1);
            break;
          case 4: // Jardín: esporas luminosas a la deriva
            this.particles.spawn(x, g + M.rand(0.3, 3.5), zz, M.rand(-0.15, 0.15), M.rand(0.02, 0.12), M.rand(-0.15, 0.15), M.rand(0.4, 0.7), 1, M.rand(0.5, 0.9), 0.016, M.rand(4, 7), 0.9, 1);
            break;
          case 5: // Vacío: motas violetas que ascienden
            this.particles.spawn(x, g + M.rand(0, 2), zz, 0, M.rand(0.2, 0.5), 0, 0.7, 0.35, 1, 0.02, M.rand(3, 5), 1, 1);
            break;
          case 7: // Coliseo: polvo de arena dorado y alguna pavesa de los braseros
            if (Math.random() < 0.75) this.particles.spawn(x, g + M.rand(0.1, 2.5), zz, M.rand(0.2, 0.6), M.rand(-0.05, 0.1), M.rand(-0.2, 0.2), 0.55, 0.45, 0.3, 0.018, M.rand(3, 5), 0.1, 1);
            else this.particles.spawn(x, g + M.rand(1, 4), zz, M.rand(-0.2, 0.2), M.rand(0.3, 0.7), M.rand(-0.2, 0.2), 1, 0.5, 0.15, 0.015, M.rand(1.5, 3), 1, 1);
            break;
          case 8: // Base militar: polvo y alguna pavesa del helicóptero
            if (Math.random() < 0.8) this.particles.spawn(x, g + M.rand(0.2, 2.5), zz, M.rand(0.3, 0.7), M.rand(-0.05, 0.05), M.rand(0.1, 0.3), 0.4, 0.36, 0.3, 0.014, M.rand(3, 5), 0.1, 1);
            else this.particles.spawn(x, g + M.rand(0.5, 3), zz, 0.5, -1.5, 0.2, 0.5, 0.52, 0.55, 0.01, 2, 0.1);
            break;
          case 9: // Barco: lluvia de tormenta en diagonal y salpicaduras
            if (Math.random() < 0.6) this.particles.spawn(x, g + 0.05, zz, M.rand(-0.6, 0.6), M.rand(0.8, 1.5), M.rand(-0.6, 0.6), 0.55, 0.6, 0.7, 0.012, 0.3, 0.2);
            break;
          case 6: // Ciudad: llovizna fina y papeles que arrastra el viento
            if (Math.random() < 0.85) this.particles.spawn(x, g + M.rand(3, 6), zz, 0.4, -7, 0.15, 0.45, 0.5, 0.6, 0.012, 0.9, 0.2);
            else this.particles.spawn(x, g + M.rand(0.1, 0.6), zz, M.rand(0.6, 1.4), M.rand(0, 0.3), M.rand(-0.3, 0.3), 0.6, 0.58, 0.52, 0.035, M.rand(2, 4), 0);
            break;
        }
      }
      // tormenta en el barco: relámpagos que iluminan la cubierta, y el trueno detrás
      if (z === 9) {
        this.boltT = (this.boltT == null ? 6 : this.boltT) - dt;
        if (this.boltT <= 0) { this.boltT = M.rand(7, 18); this.bolt = 1; this.thunderT = M.rand(0.4, 2.2); this.thunderD = (this.thunderT - 0.4) / 1.8; }
        if (this.bolt > 0) this.bolt = Math.max(0, this.bolt - dt * (this.bolt > 0.5 ? 6 : 2.2));
        if (this.thunderT > 0) { this.thunderT -= dt; if (this.thunderT <= 0) VX.Audio.thunder(this.thunderD || 0.5); }
      } else this.bolt = 0;
      if (this.dripAt) { this.dripAt.t -= dt; if (this.dripAt.t <= 0) { VX.Audio.ambientAt && VX.Audio.ambientAt('drip', this.dripAt.x, this.dripAt.z); this.dripAt = null; } }
    }

    // Evento: mercader errante que aparece tras despejar la sala (precios rebajados)
    spawnMerchant(r) {
      const cx = r.centerX(), cz = r.centerZ();
      let x = cx, z = cz;
      for (let t = 0; t < 12; t++) {
        const g = this.world.groundAt(x, z);
        if (!this.world.boxCollides(x - 1.4, g + 0.3, z - 1.4, x + 1.4, g + 2, z + 1.4)) break;
        const p = r.randomFreeCell(2, this.player.x, this.player.z); x = p.x; z = p.z;
      }
      const g = this.world.groundAt(x, z);
      const body = new VX.VoxelBody(VX.Models.vendor(), 1);
      body.x = x; body.z = z; body.y = g; body.yaw = Math.atan2(this.player.x - x, this.player.z - z);
      this.npcs.push({ body, t: 0 });
      const ups = VX.Upgrades.random(2, this, [], 'shop');
      const price = Math.round(VX.Upgrades.price(this) * 0.7);
      ups.forEach((up, i) => {
        const ox = (i ? 1 : -1) * 1.1;
        this.pickups.addItem({ kind: 'upgrade', up, price, x: x + ox * Math.cos(body.yaw), y: g + 0.3, z: z - ox * Math.sin(body.yaw), title: up.name, desc: up.desc + ' (rebajado)', color: up.color, shape: up.shape });
      });
      for (let i = 0; i < 30; i++) this.particles.spawn(x, g + 1, z, M.rand(-2, 2), M.rand(0, 3), M.rand(-2, 2), 0.9, 0.75, 0.3, 0.05, 1, 1, 1);
      VX.Audio.reward();
      this.hud.banner('MERCADER ERRANTE', 'Ofertas de paso, sólo en esta sala', 2.8);
    }

    // Jefe final derrotado: victoria y modo infinito
    victory() {
      const bonus = 40 + this.spawner.loop * 20;
      VX.Profile.add('essence', bonus);
      VX.Profile.add('victories', 1, this);
      VX.Profile.save();
      this.stats.victories = (this.stats.victories || 0) + 1;
      setTimeout(() => this.hud.banner('¡HAS CONQUISTADO LA MAZMORRA!', `+${bonus} de esencia · la mazmorra se hace más profunda (vuelta ${this.spawner.loop + 1})`, 5), 3600);
      VX.Audio.reward();
    }

    // ---------------- Retos de sala ----------------
    startChallenge(type, timeLimit) {
      const reward = 20 + this.floor * 3 + (type === 'knife' ? 15 : 0);
      const label = { nohit: 'SIN RECIBIR DAÑO', time: `EN ${timeLimit} SEGUNDOS`, knife: 'SÓLO CUCHILLO' }[type];
      this.challenge = { type, limit: timeLimit, t: 0, reward, label, shots: this.stats.shots, failed: false };
      this.hud.banner('RETO: ' + label, `Opcional · +${reward} de oro si lo consigues`, 3);
    }

    failChallenge(silent, why) {
      const c = this.challenge;
      if (!c || c.failed) { if (silent) this.challenge = null; return; }
      if (silent) { this.challenge = null; return; }
      c.failed = true;
      VX.Audio.fail();
      this.hud.banner('RETO FALLIDO', why || '', 1.8);
    }

    completeChallenge() {
      const c = this.challenge;
      this.challenge = null;
      if (!c || c.failed) return false;
      this.stats.gold += c.reward; this.stats.totalGold += c.reward;
      if (c.type === 'knife') VX.Profile.add('knifeChallenges', 1, this);
      VX.Audio.reward();
      this.hud.banner('¡RETO SUPERADO!', `+${c.reward} de oro`, 2.8);
      return true;
    }

    updateChallenge(dt) {
      const c = this.challenge;
      if (!c || c.failed) return;
      c.t += dt;
      if (c.type === 'time' && c.t > c.limit) this.failChallenge(false, 'Se acabó el tiempo');
      if (c.type === 'knife' && this.stats.shots > c.shots) this.failChallenge(false, 'Has disparado');
    }

    onPlayerHurt() { if (this.challenge && this.challenge.type === 'nohit') this.failChallenge(false, 'Te han dado'); }

    onKill(z) {
      if (this.challenge && this.challenge.type === 'knife' && this.dmgSource === 'gun') this.failChallenge(false, 'Ese no fue a cuchillo');
      if (this.mode === 'horde') VX.HordeMode.onKill(this, z);
    }

    // ---------------- Manchas de sangre ----------------
    addDecal(x, y, z, axis, size, sign = 1) {
      if (this.decals.length > 900) this.decals.splice(0, 60);
      const k = 0.55 + Math.random() * 0.35;
      this.decals.push({ x, y, z, axis, sign, s: Math.max(0.05, Math.min(0.3, size)), r: 0.3 * k, g: 0.015 * k, b: 0.02 * k, life: 1 });
    }

    // la bala atraviesa y salpica la pared de detrás
    wallSplat(x, y, z, dir) {
      const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      const dx = dir[0] / l, dy = dir[1] / l, dz = dir[2] / l;
      const h = this.world.raycast(x + dx * 0.3, y + dy * 0.3, z + dz * 0.3, dx, dy, dz, 7);
      if (!h) return;
      const axis = h.nx ? 0 : h.ny ? 1 : 2, sign = h.nx || h.ny || h.nz;
      const n = 3 + (Math.random() * 4 | 0);
      for (let i = 0; i < n; i++) {
        const j = () => M.rand(-0.22, 0.22);
        const px = h.x + (axis === 0 ? 0 : j()), py = h.y + (axis === 1 ? 0 : j()), pz = h.z + (axis === 2 ? 0 : j());
        this.addDecal(px, py, pz, axis, M.rand(0.06, 0.2), sign);
      }
    }

    renderDecals(b) {
      for (const d of this.decals) {
        const t = 0.012, o = 0.007 * d.sign;
        if (d.axis === 1) b.box(d.x, d.y + o, d.z, d.s, t, d.s, d.r, d.g, d.b, 0);
        else if (d.axis === 0) b.box(d.x + o, d.y, d.z, t, d.s, d.s, d.r, d.g, d.b, 0);
        else b.box(d.x, d.y, d.z + o, d.s, d.s, t, d.r, d.g, d.b, 0);
      }
    }

    queueExplosion(e) { this.pendingExplosions.push(e); }

    // ---------------- Física del escenario: trozos que caen enteros ----------------
    addFaller(vox, dx, dz, mat) {
      const n = vox.length / 7;
      let cx = 0, cy = 0, cz = 0, minY = 1e9;
      for (let i = 0; i < n; i++) { cx += vox[i * 7]; cy += vox[i * 7 + 1]; cz += vox[i * 7 + 2]; minY = Math.min(minY, vox[i * 7 + 1]); }
      cx /= n; cy /= n; cz /= n;
      let rad = 0;
      for (let i = 0; i < n; i++) rad = Math.max(rad, Math.hypot(vox[i * 7] - cx, vox[i * 7 + 2] - cz));
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (let i = 0; i < n; i++) { minX = Math.min(minX, vox[i * 7]); maxX = Math.max(maxX, vox[i * 7]); minZ = Math.min(minZ, vox[i * 7 + 2]); maxZ = Math.max(maxZ, vox[i * 7 + 2]); }
      this.fallers.push({ vox, n, x: 0, y: 0, z: 0, vy: 0, vx: dx * 0.8, vz: dz * 0.8, cx, cz, minY, minX, maxX, minZ, maxZ, rad: Math.min(rad, 1.6), mat, t: 0, spin: M.rand(-1, 1) });
      if (this.fallers.length > 16) this.fallers.shift();
    }

    updateFallers(dt) {
      for (const f of this.fallers) {
        f.t += dt;
        f.vy -= 18 * dt;
        f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt;
        const gx = f.cx + f.x, gz = f.cz + f.z;
        // suelo bajo toda la huella del trozo (no sólo el centro)
        let ground = this.world.groundAt(gx, gz);
        for (const [sx, sz] of [[f.minX, f.minZ], [f.maxX, f.minZ], [f.minX, f.maxZ], [f.maxX, f.maxZ]]) ground = Math.max(ground, Math.min(f.minY - 0.01, this.world.groundAt(sx + f.x, sz + f.z)));
        if (f.minY + f.y <= ground + 0.02 || f.t > 4) {
          f.dead = true;
          const speed = -f.vy, mass = f.n;
          f.y = ground - f.minY + VX.PV / 2;
          // aplasta lo que pille debajo
          const dmg = Math.min(400, mass * 0.06 * Math.max(1, speed));
          if (speed > 2.5) {
            for (const e of this.enemies) {
              if (e.dead || Math.hypot(e.x - gx, e.z - gz) > f.rad + 0.35) continue;
              if (e.isBoss) { e.hp -= dmg * 0.5; continue; }
              e.hp -= dmg; e.body.flash = 1;
              if (e.hp <= 0) { this.dmgWeapon = null; e.die([0, -1, 0], this); this.hud.toast('¡APLASTADO!'); }
            }
            const P = this.player;
            if (Math.hypot(P.x - gx, P.z - gz) < f.rad + 0.3 && this.state === 'playing') { this.dmgSrc = 'Gas inflamable'; P.damage(Math.min(45, dmg * 0.3), gx, gz, this); this.dmgSrc = null; }
            this.shake(Math.min(0.6, mass / 1500 + 0.1));
            VX.Audio.slam();
          }
          if (f.mat === 'wood' || f.mat === 'cloth') VX.Audio.crumble(); else VX.Audio.wall();
          // el trozo entero se queda en el suelo (sólo lo frágil o lo que cae muy rápido se hace añicos)
          const fragile = f.mat === 'glass' || (f.mat === 'clay' && speed > 4) || speed > 11;
          if (!fragile && this.settleFaller(f)) {
            for (let i = 0; i < 8; i++) this.particles.spawn(gx + M.rand(-f.rad, f.rad), ground + 0.05, gz + M.rand(-f.rad, f.rad), M.rand(-1, 1), M.rand(0.3, 1), M.rand(-1, 1), 0.35, 0.32, 0.3, 0.04, 1.2);
            continue;
          }
          const step = Math.max(1, Math.floor(f.n / 80));
          for (let i = 0; i < f.n; i += step) {
            const v = f.vox;
            this.particles.spawn(v[i * 7] + f.x, v[i * 7 + 1] + f.y + 0.05, v[i * 7 + 2] + f.z, M.rand(-2, 2), M.rand(0.5, 3), M.rand(-2, 2),
              v[i * 7 + 3], v[i * 7 + 4], v[i * 7 + 5], VX.PV * Math.min(2.5, step * 0.8 + 0.4), M.rand(2.5, 5), v[i * 7 + 6]);
          }
        }
      }
      this.fallers = this.fallers.filter((f) => !f.dead);
    }

    // ---------- Estructuras que se vienen abajo (bloques del escenario) ----------
    addBlockFaller(r, cells) {
      const B = VX.Blocks, S = VX.S;
      const list = [];
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const [x, y, z] of cells) {
        const i = r.idx(x, y, z), t = r.grid[i];
        const c = B.color(t, r.ox + x, y, r.oz + z, [0, 0, 0, 0]);
        list.push({ x, y, z, t, c: [c[0], c[1], c[2], c[3] || 0] });
        r.grid[i] = 0; r.hp[i] = 0; r.markDirty(x, z);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        for (const tc of r.torches) if (tc.alive && tc.anchor[0] === x && tc.anchor[1] === y && tc.anchor[2] === z) tc.alive = false;
      }
      r.walk = null; r.mapVersion++;
      // cuánto cae: hasta lo primero sólido bajo cada columna
      const low = new Map();
      for (const c of list) { const k = c.x + ':' + c.z; if (!low.has(k) || low.get(k) > c.y) low.set(k, c.y); }
      let drop = 1e9;
      for (const [k, yl] of low) {
        const [x, z] = k.split(':').map(Number);
        let s = 0;
        for (let y = yl - 1; y >= 0; y--) if (r.get(x, y, z)) { s = y + 1; break; }
        drop = Math.min(drop, yl - s);
      }
      const Hc = y1 - y0 + 1, Wd = Math.max(x1 - x0, z1 - z0) + 1;
      // los elementos altos y estrechos se vuelcan hacia el lado con más hueco
      let dir = null;
      if (Hc >= 6 && Hc > Wd * 1.5) {
        const base = y0 - drop;
        let best = -1;
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let free = 0;
          const sx = d[0] > 0 ? x1 + 1 : d[0] < 0 ? x0 - 1 : Math.round((x0 + x1) / 2), sz = d[1] > 0 ? z1 + 1 : d[1] < 0 ? z0 - 1 : Math.round((z0 + z1) / 2);
          for (let s = 0; s < Hc; s++) { if (r.get(sx + d[0] * s, base + 1, sz + d[1] * s) || r.get(sx + d[0] * s, base, sz + d[1] * s)) break; free++; }
          const score = free + Math.random() * 3;
          if (score > best) { best = score; dir = d; }
        }
      }
      const piv = dir ? [dir[0] > 0 ? x1 + 1 : dir[0] < 0 ? x0 : 0, y0 - drop, dir[1] > 0 ? z1 + 1 : dir[1] < 0 ? z0 : 0] : null;
      this.blockFallers.push({ r, list, drop, dropM: drop * S, yOff: 0, vy: 0, dir, piv, ang: 0, om: 0, phase: 'fall', t: 0, n: list.length });
      VX.Audio.crumble();
      if (list.length > 40) this.shake(Math.min(0.3, list.length / 2000));
    }

    updateBlockFallers(dt) {
      const S = VX.S;
      for (const f of this.blockFallers) {
        f.t += dt;
        if (f.phase === 'fall') {
          f.vy += 18 * dt; f.yOff += f.vy * dt;
          if (f.yOff >= f.dropM) { f.yOff = f.dropM; f.phase = f.dir ? 'tip' : 'done'; if (f.dir && f.dropM > 0.3) this.shake(0.15); }
        } else if (f.phase === 'tip') {
          f.om += dt * 5.5 * (0.25 + Math.sin(f.ang));
          f.ang = Math.min(Math.PI / 2, f.ang + f.om * dt);
          if (f.ang >= Math.PI / 2) f.phase = 'done';
        }
        if (f.phase === 'done' || f.t > 6) this.landBlockFaller(f);
      }
      this.blockFallers = this.blockFallers.filter((f) => !f.dead);
    }

    // posición (en celdas, sin redondear) de un bloque del derrumbe en este instante
    bfPos(f, c, ang, out) {
      const dropC = f.yOff / VX.S;
      let x = c.x + 0.5, y = c.y + 0.5 - dropC, z = c.z + 0.5;
      if (f.dir && ang > 0) {
        const P = f.piv, ca = Math.cos(ang), sa = Math.sin(ang);
        if (f.dir[0]) {
          const ox = (x - P[0]) * f.dir[0], oy = y - P[1];
          const nx = ox * ca + oy * sa, ny = -ox * sa + oy * ca;
          x = P[0] + nx * f.dir[0]; y = P[1] + ny;
        } else {
          const oz = (z - P[2]) * f.dir[1], oy = y - P[1];
          const nz = oz * ca + oy * sa, ny = -oz * sa + oy * ca;
          z = P[2] + nz * f.dir[1]; y = P[1] + ny;
        }
      }
      out[0] = x; out[1] = y; out[2] = z;
      return out;
    }

    landBlockFaller(f) {
      f.dead = true;
      const r = f.r, S = VX.S, p = [0, 0, 0];
      let placed = 0, cx = 0, cz = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const c of f.list) {
        this.bfPos(f, c, f.dir ? Math.PI / 2 : 0, p);
        const x = Math.floor(p[0]), y = Math.max(0, Math.floor(p[1])), z = Math.floor(p[2]);
        const wx = (r.ox + p[0]) * S, wz = (r.oz + p[2]) * S;
        cx += wx; cz += wz; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); z0 = Math.min(z0, wz); z1 = Math.max(z1, wz);
        if (r.inBounds(x, y, z) && y < r.ceilBase && !r.get(x, y, z) && Math.min(x, z, r.W - 1 - x, r.D - 1 - z) >= 4) {
          r.set(x, y, z, c.t);
          r.hp[r.idx(x, y, z)] *= 0.6;   // se ha agrietado al caer
          placed++;
        } else if (Math.random() < 0.3) this.particles.spawn(wx, (p[1]) * S, wz, M.rand(-2, 2), M.rand(1, 3), M.rand(-2, 2), c.c[0], c.c[1], c.c[2], M.rand(0.06, 0.12), 3, 0);
      }
      cx /= f.n; cz /= f.n;
      // polvo, estruendo y aplastamiento
      const big = f.n > 60;
      VX.Audio.slam(); VX.Audio.crumble();
      this.shake(Math.min(0.7, 0.12 + f.n / 900));
      for (let i = 0; i < Math.min(60, 10 + f.n / 10); i++) {
        const x = M.rand(x0, x1), z = M.rand(z0, z1);
        this.particles.spawn(x, this.world.groundAt(x, z) + 0.1, z, M.rand(-1.5, 1.5), M.rand(0.2, 1.2), M.rand(-1.5, 1.5), 0.4, 0.37, 0.34, M.rand(0.05, 0.1), M.rand(1, 2), 0, i % 3 === 0 ? 1 : 0);
      }
      if (big) {
        const inside = (x, z) => x > x0 - 0.4 && x < x1 + 0.4 && z > z0 - 0.4 && z < z1 + 0.4;
        for (const e of this.enemies) {
          if (e.dead || !inside(e.x, e.z)) continue;
          if (e.isBoss) { e.hp -= 120; continue; }
          e.hp -= 250; e.body.flash = 1;
          if (e.hp <= 0) { this.dmgWeapon = null; e.die([0, -1, 0], this); this.hud.toast('¡APLASTADO!'); }
        }
        const P = this.player;
        if (this.state === 'playing' && inside(P.x, P.z)) { this.dmgSrc = 'Un derrumbe'; P.damage(30, cx, cz, this); this.dmgSrc = null; }
      }
      r.walk = null;
      // lo que ha caído puede haber dejado otra cosa sin apoyo
      void placed;
    }

    renderBlockFallers(b) {
      const S = VX.S, p = [0, 0, 0];
      for (const f of this.blockFallers) {
        const r = f.r;
        let q = null;
        if (f.dir && f.ang > 0) q = f.dir[0] ? M.qAxis(0, 0, 1, -f.ang * f.dir[0]) : M.qAxis(1, 0, 0, f.ang * f.dir[1]);
        for (const c of f.list) {
          this.bfPos(f, c, f.ang, p);
          const x = (r.ox + p[0]) * S, y = p[1] * S, z = (r.oz + p[2]) * S;
          if (q) b.rbox(x, y, z, S * 1.002, S * 1.002, S * 1.002, q, c.c[0], c.c[1], c.c[2], c.c[3]);
          else b.box(x, y, z, S * 1.002, S * 1.002, S * 1.002, c.c[0], c.c[1], c.c[2], c.c[3]);
        }
      }
    }

    // Un trozo que ha caído se convierte en un objeto nuevo apoyado en el suelo
    settleFaller(f) {
      const PV = VX.PV, v = f.vox, n = f.n;
      const r = this.world.roomAt(f.cx + f.x, f.cz + f.z);
      if (!r || n > 6000) return false;
      if (r.props.filter((p) => p.type === 'piece' && !p.dead).length > 70) return false;
      let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
      for (let i = 0; i < n; i++) {
        x0 = Math.min(x0, v[i * 7]); x1 = Math.max(x1, v[i * 7]);
        y0 = Math.min(y0, v[i * 7 + 1]); y1 = Math.max(y1, v[i * 7 + 1]);
        z0 = Math.min(z0, v[i * 7 + 2]); z1 = Math.max(z1, v[i * 7 + 2]);
      }
      const w = Math.round((x1 - x0) / PV) + 1, h = Math.round((y1 - y0) / PV) + 1, d = Math.round((z1 - z0) / PV) + 1;
      if (w * h * d > 200000) return false;
      const fill = new Uint8Array(w * h * d), col = new Float32Array(w * h * d * 4);
      for (let q = 0; q < n; q++) {
        const i = Math.round((v[q * 7] - x0) / PV), j = Math.round((v[q * 7 + 1] - y0) / PV), k = Math.round((v[q * 7 + 2] - z0) / PV);
        const c = (j * d + k) * w + i;
        fill[c] = 1;
        col[c * 4] = v[q * 7 + 3]; col[c * 4 + 1] = v[q * 7 + 4]; col[c * 4 + 2] = v[q * 7 + 5]; col[c * 4 + 3] = v[q * 7 + 6];
      }
      const def = { ...VX.Props.DEFS.piece, mat: f.mat || 'wood', collide: n >= 90 };
      const p = VX.Props.addRaw(r, 'piece', { w, h, d, fill, col }, x0 - PV / 2 + f.x, y0 - PV / 2 + f.y, z0 - PV / 2 + f.z, def);
      p.touched = true; p.dirty = true; r.propsDirty = true;
      return true;
    }

    // ---------------- Aceite y fuego en el suelo ----------------
    addOil(x, z, r) {
      const cells = [];
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
        cells.push(x + Math.cos(a) * d, z + Math.sin(a) * d, M.rand(0.12, 0.3));
      }
      if (this.oils.length > 30) this.oils.shift();
      this.oils.push({ x, z, r, cells, y: this.world.groundAt(x, z) });
    }

    addFire(x, z, r, t, kind = 'fire') {
      // no apilar fuegos encima de otros
      for (const f of this.fires) if (f.kind === kind && Math.hypot(f.x - x, f.z - z) < Math.max(f.r, r) * 0.7) { f.t = Math.max(f.t, t); return; }
      if (this.fires.length > 40) this.fires.shift();
      this.fires.push({ x, z, r, t, t0: t, tick: 0, kind, born: this.time || 0, seed: Math.random() * 100, gy: this.world ? this.world.groundAt(x, z) : 0 });
    }

    // Avisos en el suelo (raíces, impactos): círculo que se llena y luego golpea
    updateTelegraphs(dt) {
      const P = this.player;
      for (const t of this.telegraphs) {
        t.t += dt;
        if (t.t >= t.delay && !t.done) {
          t.done = true;
          if (t.kind === 'roots') {
            VX.Audio.crumble(); this.shake(0.15);
            const gy = this.world.groundAt(t.x, t.z);
            for (let i = 0; i < 18; i++) this.particles.spawn(t.x + M.rand(-t.r, t.r) * 0.7, gy + 0.1, t.z + M.rand(-t.r, t.r) * 0.7, M.rand(-1, 1), M.rand(4, 8), M.rand(-1, 1), 0.3, 0.22, 0.12, M.rand(0.06, 0.12), 1.2);
            if (this.state === 'playing' && Math.hypot(P.x - t.x, P.z - t.z) < t.r + 0.3 && P.y < gy + 1.2) { this.dmgSrc = 'Una trampa'; P.damage(t.dmg, t.x, t.z, this); this.dmgSrc = null; P.knock(0, 0, 7); }
            t.hold = 0.8;
          }
        }
        if (t.done) t.hold = (t.hold || 0) - dt;
      }
      this.telegraphs = this.telegraphs.filter((t) => !t.done || t.hold > 0);
    }
    renderTelegraphs(b) {
      for (const t of this.telegraphs) {
        const gy = this.world.groundAt(t.x, t.z) + 0.03;
        if (!t.done) {
          const k = Math.min(1, t.t / t.delay), n = 28;
          const c = t.kind === 'roots' ? [0.5, 1, 0.3] : [1, 0.3, 0.1];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * 6.283;
            b.box(t.x + Math.cos(a) * t.r, gy, t.z + Math.sin(a) * t.r, 0.1, 0.03, 0.1, c[0], c[1], c[2], 0.9);
            if (i % 2 === 0) b.box(t.x + Math.cos(a) * t.r * k, gy, t.z + Math.sin(a) * t.r * k, 0.07, 0.03, 0.07, c[0], c[1], c[2], 0.5);
          }
        } else if (t.kind === 'roots') {
          // pinchos de raíz que salen del suelo
          const up = Math.min(1, t.hold / 0.3);
          for (let i = 0; i < 9; i++) {
            const a = i * 2.4, d = (i % 3) * t.r * 0.35;
            const h = (0.6 + (i % 4) * 0.25) * up;
            b.box(t.x + Math.cos(a) * d, gy + h / 2, t.z + Math.sin(a) * d, 0.12, h, 0.12, 0.32, 0.22, 0.12, 0);
          }
        }
      }
    }

    // ¿Ya arde bastante la sala? (limita cuánto se extiende el fuego)
    fireBusy(room) {
      if (!room) return false;
      let n = 0;
      for (const p of room.props) if (p.burning > 0 && !p.dead && ++n >= 4) return true;
      return false;
    }

    // Prende aceite y madera en un radio
    igniteAt(x, z, R) {
      for (const o of this.oils) if (!o.burning && Math.hypot(o.x - x, o.z - z) < R + o.r) { o.burning = true; this.addFire(o.x, o.z, o.r, 7); VX.Audio.torch(); }
    }

    updateFire(dt) {
      const P = this.player;
      for (const f of this.fires) {
        f.t -= dt; f.tick -= dt;
        const poison = f.kind === 'poison';
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * f.r;
          const px = f.x + Math.cos(a) * d, pz = f.z + Math.sin(a) * d;
          // gas: el volumen lo dibuja renderGas con humo suave; aquí sólo alguna burbuja pequeña que sube
          if (poison) { if (i === 0 && Math.random() < 0.25) this.particles.spawn(px, this.world.groundAt(px, pz) + 0.05, pz, M.rand(-0.1, 0.1), M.rand(0.3, 0.7), M.rand(-0.1, 0.1), 0.5, 0.95, 0.3, M.rand(0.025, 0.045), M.rand(0.5, 0.9), 0.6, 1); }
          else if (i === 0) {
            if (Math.random() < 0.35) this.particles.spawn(px, this.world.groundAt(px, pz) + 0.3, pz, M.rand(-0.4, 0.4), M.rand(1.5, 3), M.rand(-0.4, 0.4), 1, M.rand(0.5, 0.8), 0.15, 0.018, M.rand(0.5, 1.1), 1, 1);   // pavesas
            if (Math.random() < 0.2) this.particles.spawn(px, this.world.groundAt(px, pz) + 0.7, pz, M.rand(-0.15, 0.15), M.rand(0.5, 0.9), M.rand(-0.15, 0.15), 0.1, 0.09, 0.09, M.rand(0.07, 0.12), M.rand(1.5, 2.5), 0, 1);   // humo
          }
        }
        if (f.tick > 0) continue;
        f.tick = 0.3;
        if (poison) {   // nube venenosa: daña al jugador (también en el aire), no quema
          if (this.state === 'playing' && Math.hypot(P.x - f.x, P.z - f.z) < f.r && P.y < this.world.groundAt(P.x, P.z) + 2) { this.dmgSrc = 'El fuego'; P.damage(4, undefined, undefined, this); this.dmgSrc = null; if (f.slow) P.slowT = Math.max(P.slowT || 0, 0.5); }
          continue;
        }
        for (const e of this.enemies) if (!e.dead && !e.isBoss && Math.hypot(e.x - f.x, e.z - f.z) < f.r + 0.2 && !(e.T && e.T.fireImmune)) e.burn = Math.max(e.burn || 0, 2);
        // el jugador sólo se quema mientras pisa las llamas: al salir deja de hacerle daño
        if (this.state === 'playing' && Math.hypot(P.x - f.x, P.z - f.z) < f.r * 0.9 && P.y < this.world.groundAt(P.x, P.z) + 0.4) P.fireTouch(5, this);
        if (this.currentRoom && !this.fireBusy(this.currentRoom)) for (const p of this.currentRoom.props) if (!p.dead && p.flammable && Math.hypot(p.cx - f.x, p.cz - f.z) < f.r + 0.1 && Math.random() < 0.15) p.ignite();
        this.igniteAt(f.x, f.z, f.r);
      }
      for (const f of this.fires) if (f.kind !== 'poison' && this.waterAt(f.x, f.z)) { f.t = 0; for (let i = 0; i < 10; i++) this.particles.spawn(f.x + M.rand(-0.4, 0.4), 0.2, f.z + M.rand(-0.4, 0.4), 0, M.rand(0.8, 1.6), 0, 0.7, 0.7, 0.72, 0.08, 1.2, 0, 1); }
      for (const f of this.fires) if (f.t <= 0 && f.kind !== 'poison' && !f.scorched) { f.scorched = true; this.addScorch(f.x, f.z, f.r * 0.8); }
      this.fires = this.fires.filter((f) => f.t > 0);
      this.oils = this.oils.filter((o) => !o.burning || this.fires.some((f) => f.x === o.x && f.z === o.z));
      // zombis en llamas prenden el aceite que pisan
      for (const e of this.enemies) if (!e.dead && e.burn > 0) for (const o of this.oils) if (!o.burning && Math.hypot(o.x - e.x, o.z - e.z) < o.r) this.igniteAt(o.x, o.z, 0.1);
    }

    // Barrotes del rastrillo subiendo hacia el muro
    renderDoorAnims(b) {
      for (const a of this.doorAnims) {
        const r = a.room, dr = r.doorRange(a.side);
        const k = a.drop ? 1 - Math.min(1, (a.t / a.dur) ** 2) : M.smoothstep(0, 1, Math.min(1, a.t / a.dur));
        const lift = k * 12 * S + (a.drop ? 0 : Math.sin(a.t * 40) * 0.006 * (1 - k));
        const vis = 12 * S - lift;            // parte que aún asoma bajo el dintel
        if (vis <= 0.01) continue;
        // el portón entero sube (o cae): sólo se ve la parte que asoma bajo el dintel
        const y1 = dr.y1, col = [0, 0, 0, 0];
        for (let a = 0; a < 8; a++)
          for (let y = 0; y < y1; y++) {
            const yy = (y + 0.5) * S + lift;
            if (yy > y1 * S - S * 0.5) continue;
            const lx = dr.axis === 'z' ? dr.a0 + a : dr.t0 + 1.5, lz = dr.axis === 'z' ? dr.t0 + 1.5 : dr.a0 + a;
            const iron = VX.Room.doorIron(a, y, y1);
            VX.Blocks.color(iron ? VX.Blocks.DOOR : VX.Blocks.DOORWOOD, r.ox + Math.floor(lx), y, r.oz + Math.floor(lz), col);
            const x = (r.ox + lx + 0.5) * S, z = (r.oz + lz + 0.5) * S;
            b.box(x, yy, z, dr.axis === 'z' ? S : 2 * S, S, dr.axis === 'z' ? 2 * S : S, col[0], col[1], col[2], iron ? -0.45 : 0);
          }
      }
    }

    renderHazardsExtra(b) {
      for (const o of this.oils) {
        const c = o.cells;
        for (let i = 0; i < c.length; i += 3) b.box(c[i], o.y + 0.012, c[i + 1], c[i + 2], 0.02, c[i + 2], o.burning ? 0.1 : 0.05, o.burning ? 0.06 : 0.045, 0.03, o.burning ? 0.3 : 0.04);
      }
      for (const f of this.fallers) {
        const v = f.vox;
        for (let i = 0; i < f.n; i++) b.box(v[i * 7] + f.x, v[i * 7 + 1] + f.y, v[i * 7 + 2] + f.z, VX.PV, VX.PV, VX.PV, v[i * 7 + 3], v[i * 7 + 4], v[i * 7 + 5], v[i * 7 + 6]);
      }
    }

    // ---------------- Esqueletos que se recomponen ----------------
    queueRise(x, z, elite) { this.rises.push({ x, z, t: 3.2, elite }); }

    updateRises(dt) {
      for (const r of this.rises) {
        r.t -= dt;
        if (Math.random() < 0.3) this.particles.spawn(r.x + M.rand(-0.4, 0.4), this.world.groundAt(r.x, r.z) + 0.05, r.z + M.rand(-0.4, 0.4), 0, M.rand(0.5, 1.5), 0, 0.85, 0.8, 0.68, 0.04, 0.5);
        if (r.t <= 0) {
          const z = new VX.Zombie('skeleton', r.x, r.z, this.floor, { y: this.world.groundAt(r.x, r.z), elite: r.elite });
          z.risen = true; z.hp *= 0.6;
          this.enemies.push(z);
          VX.Audio.snap(); VX.Audio.groan();
          r.done = true;
        }
      }
      this.rises = this.rises.filter((r) => !r.done);
    }

    // ---------------- Cerraduras y llaves (0.41) ----------------
    // En la pared de algunas salas hay una cerradura discreta: un hueco con forma de ojo de llave.
    // Las llaves salen al azar (de algún zombi o dentro de una vasija, caja…) y cualquiera abre
    // cualquier cerradura; lo que hay dentro depende de la llave: madera, plata u oro.
    setupVault(r) {
      const v = r.vault;
      if (!v || v.open || v.item) return;
      v.item = this.pickups.addItem({ kind: 'lockdoor', vault: v, room: r, price: 0, x: v.x, y: v.y, z: v.z, title: 'Cerradura', desc: 'Ábrela con cualquier llave: cuanto mejor la llave (madera, plata, oro), mejor el botín', action: 'Abrir', color: [0.8, 0.7, 0.5], shape: 'key', hidden: true });
      // el cofre de dentro sólo se abre con llave (rompiéndolo no suelta nada)
      for (const p of r.props) if (p.type === 'chest' && !p.dead && Math.hypot(p.cx - v.cx, p.cz - v.cz) < 3) p.looted = true;
    }
    // madera la mayoría de las veces; boost sube la probabilidad de plata y oro
    rollKeyTier(boost = 0) {
      const r = Math.random();
      return r < 0.08 + boost * 0.12 ? 'gold' : r < 0.36 + boost * 0.2 ? 'silver' : 'wood';
    }
    dropKey(tier, x, y, z) {
      const K = VX.KEY_TIERS[tier] || VX.KEY_TIERS.wood;
      const ground = this.world.groundAt(x, z);
      // la llave sale despedida y cae al suelo
      this.pickups.addItem({ kind: 'key', color3: tier, price: 0, x, y: Math.max(y, ground), z, fall: true, vy: 2.5, title: 'Llave ' + K.name, desc: 'Abre una cerradura dorada de la pared o gírala en el Relicario del vendedor. ' + K.desc, action: 'Coger', color: K.col, shape: 'key' });
      VX.Audio.reward && VX.Audio.reward();
      this.hud.toast('¡Una llave ' + K.name + '!');
    }
    takeKey(tier) {
      this.keys = this.keys || { wood: 0, silver: 0, gold: 0 };
      this.keys[tier] = (this.keys[tier] || 0) + 1;
      VX.Audio.gold(); VX.Audio.click();
      this.hud.setKeys && this.hud.setKeys(this.keys);
      if (!this.keyTip) { this.keyTip = true; this.hud.banner('UNA LLAVE', 'Ábrela en una cerradura dorada de la pared o métela en el Relicario del vendedor', 3.5); }
    }
    tryVault(it) {
      const v = it.vault, r = it.room;
      this.keys = this.keys || { wood: 0, silver: 0, gold: 0 };
      const tier = ['gold', 'silver', 'wood'].find((t) => this.keys[t] > 0);   // usa la mejor que tengas
      if (!tier) { VX.Audio.deny(); this.hud.toast('Necesitas una llave (de madera, de plata o de oro)'); return; }
      this.keys[tier]--; this.hud.setKeys && this.hud.setKeys(this.keys);
      v.tier = tier;
      it.taken = true; v.open = true;
      // la puerta se abre: se viene abajo con un golpe y astillas
      for (const [lx, ly, lz] of v.cells) {
        r.set(lx, ly, lz, 0);
        if (Math.random() < 0.3) this.particles.spawn(r.worldX(lx), (ly + 0.5) * VX.S, r.worldZ(lz), M.rand(-1, 1), M.rand(1, 3), M.rand(-1, 1), 0.35, 0.22, 0.12, 0.03, M.rand(0.6, 1.2), 0);
      }
      VX.Audio.gate ? VX.Audio.gate() : VX.Audio.door();
      this.hud.banner('CERRADURA ABIERTA', 'Llave ' + VX.KEY_TIERS[tier].name + ': abre el cofre con ' + VX.Settings.tag('use'), 2.5);
      let chest = null, bd = 3;
      for (const p of r.props) if (p.type === 'chest' && !p.dead) { const d = Math.hypot(p.cx - v.cx, p.cz - v.cz); if (d < bd) { bd = d; chest = p; } }
      if (chest) { chest.looted = true; this.pickups.addItem({ kind: 'secretChest', tier, prop: chest, price: 0, x: chest.cx, y: chest.oy + 0.2, z: chest.cz, title: 'Cofre (llave ' + VX.KEY_TIERS[tier].name + ')', desc: VX.KEY_TIERS[tier].desc, action: 'Abrir', color: VX.KEY_TIERS[tier].col, shape: 'chest' }); }
      VX.Profile.add('vaults', 1, this);
    }

    // ---------------- Cámara secreta ----------------
    checkSecret() {
      const r = this.currentRoom, sc = r && r.secret, P = this.player;
      if (!sc || sc.found) return;
      // hace falta haber roto buena parte de la cara agrietada y asomarse
      if (sc.cells) {
        let gone = 0;
        for (const [lx, ly, lz] of sc.cells) if (!r.get(lx, ly, lz)) gone++;
        if (gone < sc.cells.length * 0.3) return;
      }
      if (Math.hypot(P.x - sc.x, P.z - sc.z) < 1.6) {
        sc.found = true;
        if (sc.stairs) {
          this.hud.banner('UNA ESCALERA…', 'Baja hacia algo que no debería estar aquí', 3.5);
          VX.Audio.phase && VX.Audio.phase();
          // dirección hacia el fondo del hueco (lejos de la sala)
          const dx = sc.along === 'z' ? -sc.inward : 0, dz = sc.along === 'x' ? -sc.inward : 0;
          // se abre un foso en el suelo con la escalera que baja (pegado a la pared)
          const fx = sc.x + dx * 0.45, fz = sc.z + dz * 0.45, L = 1.6, Wd = 0.8;
          const ax = dx !== 0 ? 0 : 1, az = dz !== 0 ? 0 : 1;   // eje a lo largo de la pared
          const px0 = Math.min(fx, fx - dx * L) - ax * Wd, px1 = Math.max(fx, fx - dx * L) + ax * Wd;
          const pz0 = Math.min(fz, fz - dz * L) - az * Wd, pz1 = Math.max(fz, fz - dz * L) + az * Wd;
          r.floorHoles = (r.floorHoles || []).concat([{ x0: px0, x1: px1, z0: pz0, z1: pz1 }]);
          for (let x = px0 - 0.5; x <= px1 + 0.5; x += 0.25) for (let z = pz0 - 0.5; z <= pz1 + 0.5; z += 0.25) r.markDirty(Math.floor(x / VX.S) - r.ox, Math.floor(z / VX.S) - r.oz);
          this.pickups.addItem({ kind: 'stairs', price: 0, x: fx - dx * L * 0.5, y: sc.y, z: fz - dz * L * 0.5, fx, fz, L, Wd, dx, dz, title: 'Escalera al Vacío', desc: 'Un bioma oculto: 3 salas y su guardián', action: 'Bajar', color: [0.75, 0.3, 1], shape: 'crystal' });
          VX.Profile.add('secrets', 1, this);
          return;
        }
        this.hud.banner('¡CÁMARA SECRETA!', 'Hay un cofre: ábrelo con ' + VX.Settings.tag('use'), 3);
        VX.Audio.reward();
        // el cofre del fondo se abre con E (ya no hace falta destrozarlo)
        let chest = null, bd = 3;
        for (const p of r.props) if (p.type === 'chest' && !p.dead) { const d = Math.hypot(p.cx - sc.x, p.cz - sc.z); if (d < bd) { bd = d; chest = p; } }
        if (chest) {
          chest.looted = true;
          this.pickups.addItem({ kind: 'secretChest', prop: chest, price: 0, x: chest.cx, y: chest.oy + 0.2, z: chest.cz, title: 'Cofre del tesoro', desc: 'Oro, un botiquín y una mejora', action: 'Abrir', color: [0.95, 0.75, 0.3], shape: 'chest' });
        }
        VX.Profile.add('secrets', 1, this);
        this.stats.secrets = (this.stats.secrets || 0) + 1;
      }
    }

    // Bajar por la escalera secreta: todo se desvanece y empiezas en el Vacío
    // En cooperativo primero se vota (VX.Coop.proposeSecret); si sale que sí, todos llegan aquí con
    // la misma semilla y el mismo id de sala, así el Vacío sale igual en todos los equipos.
    enterSecret(go) {
      if (this.spawner.secret) return;
      if (VX.Coop.active && !go) { VX.Coop.proposeSecret(this); return; }
      VX.Audio.door(); VX.Audio.phase && VX.Audio.phase();
      const floor = this.floor + 1;
      this.world.keepOnly([]);
      this.pickups.items = []; this.pickups.gold = [];
      this.npcs = []; this.enemies = []; this.corpses = []; this.gibs = []; this.decals = [];
      this.oils = []; this.fires = []; this.blasts = []; this.fallers = []; this.blockFallers = []; this.rises = []; this.projectiles = []; this.shockwaves = []; this.telegraphs = [];
      this.bullets.clear(); this.doorAnims = [];
      this.hud.hideBoss(); this.boss = null;
      this.spawner.secret = { rooms: 3 };
      VX.Horde.reset();
      const mk = () => this.world.addStart('start', floor, this.spawner.planExits('zn', 'start', false).slice(0, 2), null, 5);
      const first = go && go.seed ? VX.Coop.seeded(go.seed, mk) : mk();
      if (go && go.rid) first.rid = go.rid;
      this.floor = floor;
      this.zone = 5;
      VX.Renderer.fogColor = VX.ZONES[5].fog.slice();
      first.entered = true; first.cleared = true;
      this.currentRoom = first;
      first.setDoor('zn', true);
      if (VX.Audio.setBiome) VX.Audio.setBiome(this.zone);
      this.spawner.populateNeighbors(this, first);
      for (const r of this.world.rooms) r.updateMeshes(VX.Renderer, 9999);
      const P = this.player;
      P.x = 0; P.z = first.worldZ(14); P.y = this.world.groundAt(P.x, P.z); P.vy = 0; P.yaw = 0;
      if (VX.Coop.active) {
        // cada uno a un lado, y los caídos vuelven con el grupo
        const idx = Math.max(0, VX.Coop.order.indexOf(VX.Net.id));
        P.x = (idx % 2 ? 1 : -1) * Math.ceil(idx / 2) * 0.9;
        VX.Coop.remoteEnter = true;
        try { VX.Coop.roomEntered(this, first); } finally { VX.Coop.remoteEnter = false; }
      }
      this.stats.secretBiome = (this.stats.secretBiome || 0) + 1;
      this.hud.banner(VX.ZONES[5].name, VX.ZONES[5].sub, 4);
      this.shake(0.4);
    }

    // NPC a los que se puede disparar (el vendedor)
    npcHit() { return this.npcs.filter((n) => n.hit && !n.dead); }

    // Explosión: cráter en el escenario, daño a enemigos/cadáveres/jugador, fuego y humo
    explode(e) {
      const R = e.R, destr = e.destr || 1, sm = !!e.small;   // small: la de las balas explosivas
      this.world.damageSphere(e.x, e.y, e.z, R * 0.8, 220 * destr, this);
      this.weapon.explosions.push({ x: e.x, y: e.y, z: e.z, t: 0.35 });
      this.addScorch(e.x, e.z, R * 0.9);   // hollín permanente
      const reach = R + 0.8;
      this.dmgWeapon = e.weapon || null;
      for (const list of [this.enemies, this.corpses, this.npcHit()]) for (const en of list.slice()) {
        if (en.dead) continue;
        const d = Math.hypot(en.body.cx - e.x, en.body.cy - e.y, en.body.cz - e.z);
        if (d < reach) {
          en.blast(e.x, e.y, e.z, R, e.dmg * (1 - d / reach) + (sm ? 0 : 10), this); if (e.frost && !en.isBoss) en.chillT = 3;
          // onda de choque: tus explosiones lanzan por los aires y aturden
          if (e.weapon && !sm && this.weapon.mods.shockwave && !en.dead && !en.isBoss && !en.isCorpse && !en.isShopkeeper && en.vy !== undefined) {
            const dx = en.x - e.x, dz = en.z - e.z, l = Math.hypot(dx, dz) || 1;
            en.y += 0.05; en.vy = 6 * (1 - d / reach) + 2; en.kx = (en.kx || 0) + dx / l * 8; en.kz = (en.kz || 0) + dz / l * 8;
            if (en.state !== undefined) { en.state = 'stun'; en.stateT = 1.4; }
          }
        }
      }
      this.dmgWeapon = null;
      if (!sm) this.igniteAt(e.x, e.z, R);
      // los objetos (barriles, cajas…) también revientan; los barriles rojos encadenan explosiones
      for (const r of this.world.rooms) for (const p of r.props) {
        if (p.dead) continue;
        const d = Math.hypot(p.cx - e.x, p.cy - e.y, p.cz - e.z);
        if (d < reach + p.rad * 0.5) { p.blast(e.x, e.y, e.z, R, e.dmg * (1 - d / (reach + 1)) + 15, this); if (!sm && Math.random() < 0.35 && !this.fireBusy(r)) p.ignite(); }
      }
      const P = this.player;
      const dp = Math.hypot(P.x - e.x, P.y + 0.9 - e.y, P.z - e.z);
      if (dp < R && this.state === 'playing' && e.selfK !== 0) { const ds = this.dmgSrc; this.dmgSrc = ds || (e.weapon ? 'Tu propia explosión' : 'Una explosión'); P.damage(e.dmg * (e.selfK ?? 0.35) * (1 - dp / R), e.x, e.z, this); this.dmgSrc = ds; }
      this.blasts.push({ x: e.x, y: e.y, z: e.z, R: sm ? R : Math.max(1.2, R), t: 0, seed: Math.random() * 100, gy: this.world.groundAt(e.x, e.z), pop: sm });
      this.stirFog(e.x, e.z, Math.max(1.2, R) * 2.4, 1, 0.12);
      if (this.blasts.length > 16) { const i = this.blasts.findIndex((x) => x.pop); this.blasts.splice(i >= 0 ? i : 0, 1); }
      // chispas rápidas, escombros que caen y brasas que suben despacio
      if (sm) {
        // bala explosiva: estallido seco, chispas rápidas y cascotes (el resto lo dibuja renderBlasts)
        for (let i = 0; i < 6; i++) { const c = M.rand(0.08, 0.16); this.particles.spawn(e.x, e.y + 0.1, e.z, M.rand(-4, 4), M.rand(2, 6), M.rand(-4, 4), c, c * 0.9, c * 0.8, M.rand(0.03, 0.06), M.rand(0.8, 1.6)); }
        VX.Audio.at(e.x, e.y, e.z, () => VX.Audio.explosion(0.75), 4); this.shake(0.07); return;
      }
      const PK = 1;
      if (e.frost) for (let i = 0; i < 14; i++) this.particles.spawn(e.x, e.y + 0.2, e.z, M.rand(-4, 4), M.rand(0, 4), M.rand(-4, 4), 0.7, 0.92, 1, M.rand(0.03, 0.05), M.rand(0.5, 1), 0.8, 1);
      for (let i = 0; i < 34 * PK; i++) {
        const a = Math.random() * Math.PI * 2, el = M.rand(-0.2, 1), sp = M.rand(6, 14);
        this.particles.spawn(e.x, e.y + 0.2, e.z, Math.cos(a) * sp * Math.cos(el), Math.sin(el) * sp + 2, Math.sin(a) * sp * Math.cos(el), 1, M.rand(0.6, 0.9), 0.25, M.rand(0.015, 0.03), M.rand(0.25, 0.7), 1);
      }
      for (let i = 0; i < 10 * PK; i++) {   // cascotes
        const c = M.rand(0.08, 0.18);
        this.particles.spawn(e.x, e.y + 0.3, e.z, M.rand(-5, 5), M.rand(3, 9), M.rand(-5, 5), c, c * 0.9, c * 0.8, M.rand(0.04, 0.09), M.rand(1.2, 2.4));
      }
      for (let i = 0; i < 16 * PK; i++) this.particles.spawn(e.x + M.rand(-R, R) * 0.5, e.y + M.rand(0, R * 0.6), e.z + M.rand(-R, R) * 0.5, M.rand(-0.6, 0.6), M.rand(0.6, 2), M.rand(-0.6, 0.6), 1, M.rand(0.35, 0.6), 0.08, M.rand(0.03, 0.06), M.rand(1.2, 2.6), 1, 1);
      if (sm) { VX.Audio.at(e.x, e.y, e.z, () => VX.Audio.explosion(0.75), 4); this.shake(0.04); return; }
      VX.Audio.at(e.x, e.y, e.z, () => VX.Audio.explosion(Math.min(1, dp / 30) * 0.4), 9, 'boom');
      if (dp < 18) VX.Haptics.buzz(Math.round(50 + 110 * (1 - dp / 18)), VX.Touch.on && VX.Settings.data.vibrate !== false);
      this.shake(Math.max(0.25, 0.9 - dp * 0.08));
    }

    // ---------------- Niebla baja ----------------
    // Cada sala de la mazmorra tiene (o no) un manto de niebla a ras de suelo según su bioma.
    // El jugador, los disparos y las explosiones abren huecos que se cierran despacio.
    stirFog(x, z, r, s, decay = 0.35) {
      if (!this.currentRoom || this.mode === 'horde') return;
      const H = this.fogHoles || (this.fogHoles = []);
      H.push({ x, z, r, s, decay });
      if (H.length > 28) H.splice(0, H.length - 28);
    }
    updateFogHoles(dt) {
      const H = this.fogHoles;
      if (!H) return;
      for (const h of H) { h.s -= h.decay * dt; h.r += dt * 0.25; }
      this.fogHoles = H.filter((h) => h.s > 0.02);
      // estela del jugador al andar
      const P = this.player, cr = this.currentRoom;
      if (cr && P) {
        this.fogTrailT = (this.fogTrailT || 0) - dt;
        if (this.fogTrailT <= 0 && Math.hypot(P.vx, P.vz) > 1.2) { this.fogTrailT = 0.25; this.stirFog(P.x, P.z, 1.1, 0.55, 0.22); }
      }
    }
    setGroundFog(R, cam) {
      const cr = this.currentRoom;
      if (!cr || this.state === 'title' || this.mode === 'horde' || VX.Settings.data.groundFog === false) { R.gf = null; return; }
      // la sala actual y las de al lado con la puerta abierta: así la niebla ya está ahí antes de entrar
      const rooms = [];
      for (const r of [cr, ...Object.values(cr.doors).filter((d) => d.neighbor && !d.closed).map((d) => d.neighbor)]) {
        if (!r || !r.gfog || rooms.length >= 2) continue;
        const S = VX.S, g = r.gfog;
        rooms.push({ top: g.top, dens: g.dens, col: g.col, floor: 0, rect: [(r.ox + 1) * S, (r.oz + 1) * S, (r.ox + r.W - 1) * S, (r.oz + r.D - 1) * S] });
      }
      if (!rooms.length) { R.gf = null; return; }
      const out = this._gfArr || (this._gfArr = new Float32Array(32));
      out.fill(0);
      const P = this.player;
      // el jugador siempre aparta un poco la niebla a su alrededor
      const list = [{ x: P.x, z: P.z, r: 1.0, s: 0.6 }].concat((this.fogHoles || []).slice().sort((a, b) =>
        (b.s / (1 + Math.hypot(b.x - cam.x, b.z - cam.z) * 0.1)) - (a.s / (1 + Math.hypot(a.x - cam.x, a.z - cam.z) * 0.1))));
      for (let i = 0; i < Math.min(8, list.length); i++) { const h = list[i]; out[i * 4] = h.x; out[i * 4 + 1] = h.z; out[i * 4 + 2] = h.r; out[i * 4 + 3] = Math.min(1, h.s); }
      R.gf = { rooms, holes: out };
    }
    // En la niebla espesa no se ven los pies: se oyen los pasos de los que se acercan
    fogFootsteps(dt) {
      const cr = this.currentRoom;
      if (!cr || !cr.gfog || !cr.gfog.thick) return;
      const P = this.player;
      let n = 0;
      for (const e of this.enemies) {
        if (e.dead || e.isBoss || n >= 5) continue;
        const d = Math.hypot(e.x - P.x, e.z - P.z), sp = Math.hypot(e.vx || 0, e.vz || 0);
        if (d > 18 || sp < 0.4) continue;
        n++;
        e.fogStepT = (e.fogStepT || Math.random() * 0.4) - dt;
        if (e.fogStepT > 0) continue;
        e.fogStepT = M.clamp(0.9 / sp, 0.25, 0.8);
        VX.Audio.at(e.x, e.y + 0.1, e.z, () => VX.Audio.zstep && VX.Audio.zstep(), 3, 'steps');
      }
    }

    // Nubes de gas venenoso (gordo, esporas): bancos de niebla verde y baja que se abren desde el
    // centro, ondulan despacio y se deshacen al final, en vez de cubos sueltos
    renderGas() {
      const SM = VX.Renderer.smoke, FI = VX.Renderer.fire;
      if (!SM) return;
      const Q = VX.Renderer.quality === 'alta' ? 1 : VX.Renderer.quality === 'media' ? 0.7 : 0.45;
      for (const f of this.fires) {
        if (f.kind !== 'poison' || f.t <= 0) continue;
        const age = this.time - (f.born || 0), sd = f.seed || 0;
        const h = (i, k) => { const v = Math.sin(sd * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
        const open = 1 - Math.pow(1 - Math.min(1, age / 0.7), 3);                 // se abre al reventar
        const fade = Math.min(1, f.t / 1.5) * Math.min(1, age / 0.25);              // y se deshace al final
        const n = Math.round((8 + f.r * 5) * Q);
        for (let i = 0; i < n; i++) {
          const a = h(i, 1) * Math.PI * 2 + Math.sin(age * 0.3 + i) * 0.4, d = f.r * Math.sqrt(h(i, 2)) * 0.85 * open;
          const x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
          const bob = Math.sin(age * (0.6 + h(i, 3) * 0.6) + i * 1.7);
          const y = (f.gy || 0) + 0.25 + h(i, 4) * 0.45 + bob * 0.08;
          const sz = (0.9 + h(i, 5) * 0.9) * (0.6 + open * 0.5) * Math.min(1.4, 0.6 + f.r * 0.25);
          const g = 0.55 + h(i, 6) * 0.25;
          SM.add(x, y, z, sz, 0.28 * g, 0.62 * g, 0.18 * g, 0.32 * fade, h(i, 7) * 6 + age * 0.15 * (h(i, 8) - 0.5), sd + i);
        }
        // un brillo tenue en el centro, como si el gas estuviera cargado
        if (FI) FI.add(f.x, (f.gy || 0) + 0.3, f.z, f.r * 1.8 * open, 0.06 * fade, 0.18 * fade, 0.03 * fade, 0.5, 0, sd + 99);
        // al reventar, una bocanada que sale hacia fuera y se aplana contra el suelo
        if (age < 0.9) {
          const k = age / 0.9;
          for (let i = 0; i < Math.round(10 * Q); i++) {
            const a = (i / 10) * Math.PI * 2 + h(i, 20), d = f.r * (0.2 + k * 0.9);
            SM.add(f.x + Math.cos(a) * d, (f.gy || 0) + 0.4 + (1 - k) * 0.6, f.z + Math.sin(a) * d, 0.8 + k * 1.2, 0.3, 0.6, 0.2, 0.45 * (1 - k), h(i, 21) * 6, sd + 50 + i);
          }
        }
      }
    }

    // Explosión: destello, bola de fuego en varios lóbulos que sube y se oscurece, onda en el suelo y columna de humo
    renderBlasts(b) {
      // la calidad gráfica decide cuántas piezas lleva cada explosión
      const Q = VX.Renderer.quality === 'alta' ? 1 : VX.Renderer.quality === 'media' ? 0.65 : 0.4;
      for (const bl of this.blasts) {
        const t = bl.t, R = bl.R, sd = bl.seed;
        const h = (i, k) => { const v = Math.sin(sd * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
        const FI = VX.Renderer.fire, SM = VX.Renderer.smoke;
        if (bl.pop) { this.renderPop(b, bl, h, Q, FI, SM); continue; }
        // destello inicial: núcleo blanco de cubos y un resplandor suave alrededor
        if (t < 0.12) {
          const k = 1 - t / 0.12, s = R * (0.5 + t * 8);
          b.box(bl.x, bl.y + 0.3, bl.z, s, s, s, 1, 0.97, 0.88, 1);
          FI.add(bl.x, bl.y + 0.4, bl.z, s * 3, 1.1 * k, 0.75 * k, 0.35 * k, 0.8, 0, sd);
        }
        // bola de fuego: lóbulos de cubos que se hinchan, giran y suben pasando a naranja, rojo y hollín,
        // con un halo suave detrás para que no se vea como un montón de cajas
        if (t < 1.15) {
          const k = t / 1.15, grow = 1 - Math.pow(1 - Math.min(1, t / 0.25), 3);
          const n = Math.round(22 * Q) + 4;
          for (let i = 0; i < n; i++) {
            const inner = i < n * 0.3;
            const a = h(i, 1) * Math.PI * 2, el = h(i, 2) * 1.3 - 0.2, d = R * (inner ? 0.1 + h(i, 3) * 0.25 : 0.3 + h(i, 3) * 0.55) * grow;
            const x = bl.x + Math.cos(a) * Math.cos(el) * d, z = bl.z + Math.sin(a) * Math.cos(el) * d;
            const y = bl.y + 0.3 + Math.sin(el) * d * 0.8 + k * k * R * (inner ? 1.2 : 0.9);
            const sz = 0.72 * R * (inner ? 0.2 + h(i, 4) * 0.18 : 0.22 + h(i, 4) * 0.26) * (0.5 + grow * 0.7) * (1 - k * (inner ? 0.8 : 0.45));
            const heat = Math.max(0, (inner ? 1.25 : 1) - k * 1.15 - h(i, 5) * 0.25);
            const fl = 0.9 + Math.sin(t * 40 + i * 3.1) * 0.1;
            const r = (0.25 + heat * 0.75 + (1 - heat) * 0.45) * fl, g = (0.08 + heat * 0.78) * fl, bb = 0.04 + heat * heat * 0.55;
            const e = Math.max(0, 1 - k * 1.05);
            const q = M.qAxis(0.577, 0.577, 0.577, h(i, 6) * 6 + t * (1.5 + h(i, 7) * 2));
            b.rbox(x, y, z, sz, sz, sz, q, e > 0.05 ? r : 0.15, e > 0.05 ? g : 0.13, e > 0.05 ? bb : 0.12, e);
            if (i % 3 === 0 && e > 0.1) FI.add(x, y, z, sz * 3.2, r * 0.6 * e, g * 0.55 * e, bb * 0.4 * e, 0.45, h(i, 8) * 6, sd + i);
          }
        }
        // chispas: trazos que salen disparados en arco y se apagan
        if (t < 1.2) {
          const n = Math.round(40 * Q);
          for (let i = 0; i < n; i++) {
            const life = 0.5 + h(i, 20) * 0.7;
            if (t > life) continue;
            const a = h(i, 21) * Math.PI * 2, el = 0.15 + h(i, 22) * 1.1, sp = (7 + h(i, 23) * 9) * Math.min(1.6, 0.6 + R * 0.3);
            const vx = Math.cos(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp;
            const x = bl.x + vx * t, y = bl.y + 0.3 + vy * t - 4.9 * t * t, z = bl.z + vz * t;
            if (y < bl.gy) continue;
            const cvy = vy - 9.8 * t, v = Math.hypot(vx, cvy, vz) || 1, L = Math.min(0.9, v * 0.04);
            const ax = vz / v, az = -vx / v, al = Math.hypot(ax, az) || 1, ang = Math.acos(M.clamp(cvy / v, -1, 1));
            const k = 1 - t / life;
            b.rbox(x, y, z, 0.035, L, 0.035, M.qAxis(ax / al, 0, az / al, ang), 1, 0.55 + k * 0.4, 0.15 + k * 0.3, 1);
          }
        }
        // onda expansiva: anillo de cubos encendidos a ras de suelo que se abre y se apaga,
        // y detrás un segundo anillo de polvo
        if (t < 0.5) {
          const k = t / 0.5, rad = R * (0.6 + k * 2.1), w = 0.4 * (1 - k) + 0.1, n = Math.round(32 * Math.max(0.6, Q));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, x = bl.x + Math.cos(a) * rad, z = bl.z + Math.sin(a) * rad;
            b.rbox(x, bl.gy + 0.08 + (1 - k) * 0.12, z, rad * 6.3 / n, w * 0.6, w, M.qY(-a + Math.PI / 2), 0.9 - k * 0.6, 0.55 - k * 0.4, 0.25 - k * 0.15, Math.max(0, 0.85 - k * 1.2));
          }
          if (k < 0.5) SM.add(bl.x, bl.gy + 0.3, bl.z, rad * 2.2, 0.5, 0.42, 0.32, 0.25 * (1 - k * 2), 0, sd + 30);
        }
        if (t > 0.08 && t < 1.4) {
          const k = (t - 0.08) / 1.32, rad = R * (1.1 + Math.sqrt(k) * 2.4), n = Math.round(14 * Math.max(0.6, Q));
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + h(i, 30), x = bl.x + Math.cos(a) * rad, z = bl.z + Math.sin(a) * rad, sz = 0.72 * R * (0.22 + h(i, 31) * 0.18) * (1 - k * 0.5);
            const c = 0.26 - k * 0.08;
            if (Q > 0.6) b.rbox(x, bl.gy + sz * 0.5 + k * 0.4, z, sz, sz * 0.8, sz, M.qY(h(i, 32) * 6), c, c * 0.92, c * 0.85, 0);
            SM.add(x, bl.gy + 0.3 + k * 0.4, z, R * (0.6 + k * 0.8), c * 1.3, c * 1.2, c * 1.05, 0.4 * (1 - k), h(i, 33) * 6, sd + 40 + i);
          }
        }
        // humo: bocanadas de cubos oscuros que suben en columna, envueltas en humo suave
        if (t > 0.3) {
          const k = (t - 0.3) / 2.2, n = Math.round(14 * Q) + 4;
          for (let i = 0; i < n; i++) {
            const kk = k - h(i, 8) * 0.25;
            if (kk <= 0 || kk >= 1) continue;
            const a = h(i, 9) * Math.PI * 2 + kk * 1.5, d = R * (0.15 + h(i, 10) * 0.5) * (0.6 + kk * 0.8);
            const x = bl.x + Math.cos(a) * d, z = bl.z + Math.sin(a) * d, y = bl.y + R * 0.8 + kk * (2.8 + R * 1.2) + h(i, 11) * R * 0.4;
            const sz = R * (0.35 + h(i, 12) * 0.3) * (0.7 + kk * 0.9) * (1 - Math.pow(kk, 3));
            const c = 0.11 + h(i, 13) * 0.06 + (1 - kk) * 0.04, glow = Math.max(0, 0.3 - kk) * 1.6;
            if (i % 2 === 0) { const cs = sz * 0.72; b.rbox(x, y, z, cs, cs, cs, M.qAxis(0.577, 0.577, 0.577, h(i, 14) * 6 + t * 0.4), c + glow * 0.5, c * 0.95 + glow * 0.18, c * 0.92, glow * 0.4); }
            SM.add(x, y, z, sz * 2.4, c * 1.4 + glow * 0.3, c * 1.35 + glow * 0.1, c * 1.3, 0.6 * Math.min(1, kk * 5) * (1 - kk * kk), h(i, 15) * 6 + t * 0.3, sd + 80 + i);
          }
        }
        // quemadura en el suelo que se va apagando (brasas al principio)
        {
          const k = Math.min(1, t / 2.4), n = Math.round(10 * Q) + 3;
          for (let i = 0; i < n; i++) {
            const a = h(i, 40) * Math.PI * 2, d = R * h(i, 41) * 0.8, s = R * (0.35 + h(i, 42) * 0.4) * (t > 2.4 ? 1 - (t - 2.4) / 1.6 : 1);
            if (s < 0.02) continue;
            const ember = Math.max(0, 0.8 - k * 1.4) * (h(i, 43) < 0.5 ? 1 : 0.3);
            b.rbox(bl.x + Math.cos(a) * d, bl.gy + 0.012 + i * 0.0015, bl.z + Math.sin(a) * d, s, 0.02, s * 0.8, M.qY(h(i, 44) * 6), 0.04 + ember * 0.9, 0.035 + ember * 0.3, 0.03, ember);
          }
        }
      }
    }

    // Estallido de bala explosiva: distinto de una explosión grande. Un destello blanco en estrella,
    // una cáscara de onda esférica (tres anillos cruzados) que se abre en un instante, chispas muy
    // rápidas y una bocanada de humo negro con brasas; sin bola de fuego ni anillo en el suelo.
    renderPop(b, bl, h, Q, FI, SM) {
      const t = bl.t, R = bl.R, x0 = bl.x, y0 = bl.y, z0 = bl.z;
      if (t < 0.08) {   // núcleo al rojo blanco
        const k = 1 - t / 0.08, s = (0.3 + t * 7) * R;
        b.rbox(x0, y0, z0, s, s, s, M.qAxis(0.577, 0.577, 0.577, bl.seed), 1, 1, 0.95, 1);
        FI.add(x0, y0, z0, 2.0 * R, 1.6 * k, 1.25 * k, 0.8 * k, 1, 0, bl.seed);
      }
      if (t < 0.11) {   // púas de luz en estrella
        const k = t / 0.11, n = 7;
        for (let i = 0; i < n; i++) {
          const a = h(i, 1) * Math.PI * 2, el = (h(i, 2) - 0.5) * 2.6;
          const dx = Math.cos(a) * Math.cos(el), dy = Math.sin(el), dz = Math.sin(a) * Math.cos(el);
          const len = R * (0.6 + h(i, 3) * 0.7) * (0.4 + k), w = 0.1 * (1 - k) + 0.02;
          const ax = dz, az = -dx, al = Math.hypot(ax, az) || 1;
          b.rbox(x0 + dx * len * 0.5, y0 + dy * len * 0.5, z0 + dz * len * 0.5, w, len, w, M.qAxis(ax / al, 0, az / al, Math.acos(M.clamp(dy, -1, 1))), 1, 0.92, 0.6, 1);
        }
      }
      if (t < 0.24) {   // cáscara de la onda: tres anillos cruzados que se abren
        const k = t / 0.24, rad = R * (0.2 + Math.sqrt(k) * 1.0), n = Math.round(18 * Math.max(0.6, Q)), sz = 0.07 * (1 - k) + 0.02;
        const e = Math.max(0, 1 - k * 1.1);
        for (let ring = 0; ring < 3; ring++) for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring;
          const c = Math.cos(a) * rad, d = Math.sin(a) * rad;
          const [x, y, z] = ring === 0 ? [c, d * 0.35, d] : ring === 1 ? [c, d, d * 0.35] : [c * 0.35, d, c];
          b.box(x0 + x, y0 + y, z0 + z, sz, sz, sz, 1, 0.55 + e * 0.4, 0.15 + e * 0.3, e);
        }
      }
      if (t < 0.4) {   // chispas muy rápidas
        const n = Math.round(26 * Q) + 6;
        for (let i = 0; i < n; i++) {
          const life = 0.14 + h(i, 20) * 0.24;
          if (t > life) continue;
          const a = h(i, 21) * Math.PI * 2, el = (h(i, 22) - 0.35) * 2.2, sp = 13 + h(i, 23) * 10;
          const vx = Math.cos(a) * Math.cos(el) * sp, vy = Math.sin(el) * sp, vz = Math.sin(a) * Math.cos(el) * sp;
          const x = x0 + vx * t, y = y0 + vy * t - 3 * t * t, z = z0 + vz * t;
          const v = Math.hypot(vx, vy, vz), L = 0.25 + (1 - t / life) * 0.35;
          const ax = vz / v, az = -vx / v, al = Math.hypot(ax, az) || 1;
          b.rbox(x, y, z, 0.025, L, 0.025, M.qAxis(ax / al, 0, az / al, Math.acos(M.clamp(vy / v, -1, 1))), 1, 0.85, 0.4, 1);
        }
      }
      if (t > 0.07 && t < 1.4) {   // bocanada de humo negro con brasas dentro
        const k = (t - 0.07) / 1.33, n = 6;
        for (let i = 0; i < n; i++) {
          const a = h(i, 30) * Math.PI * 2, d = R * (0.15 + k * 0.35) * (0.5 + h(i, 31));
          const x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d, y = y0 + k * 0.9 + h(i, 32) * 0.2;
          const sz = R * (0.2 + h(i, 33) * 0.12) * (0.6 + k * 0.8) * (1 - k * k);
          const glow = Math.max(0, 0.18 - k) * 1.6, c = 0.07 + h(i, 34) * 0.04;
          if (i % 2) b.rbox(x, y, z, sz, sz, sz, M.qAxis(0.577, 0.577, 0.577, h(i, 35) * 6 + t), c + glow * 0.6, c + glow * 0.22, c, glow * 0.5);
          SM.add(x, y, z, sz * 2.2, c * 1.6, c * 1.5, c * 1.4, 0.5 * (1 - k), h(i, 36) * 6, bl.seed + i);
        }
      }
    }

    // Trampas de púas: salen y se esconden; hieren a quien las pise (también a los zombis)
    // Ciclo de 2,8 s: aviso (asoman) → salen de golpe → arriba → bajan despacio
    spikeState(sp) {
      const t = (this.time + sp.phase) % 2.8;
      let k = 0, warn = 0;
      if (t > 1.45 && t <= 1.8) { warn = 1; k = 0.12 + Math.sin(t * 70) * 0.04; }
      else if (t > 1.8 && t <= 1.9) k = (t - 1.8) / 0.1;
      else if (t > 1.9 && t <= 2.4) k = 1;
      else if (t > 2.4 && t <= 2.8) k = 1 - M.smoothstep(2.4, 2.78, t);
      return { up: k > 0.55 ? 1 : 0, warn, k };
    }

    updateSpikes(dt) {
      const r = this.currentRoom;
      if (!r || !r.spikes.length) return;
      const P = this.player;
      for (const sp of r.spikes) {
        const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
        const inside = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
        if (sp.kind === 'water') {
          // gotas que caen y ondas
          if (Math.random() < dt * 2) { const px = M.rand(x0, x1), pz = M.rand(z0, z1); sp.ripples = sp.ripples || []; sp.ripples.push({ x: px, z: pz, t: 0 }); if (sp.ripples.length > 6) sp.ripples.shift(); }
          if (sp.ripples) for (const rp of sp.ripples) rp.t += dt;
          continue;
        }
        if (sp.kind !== 'spikes') {
          const PL = VX.POOLS[sp.kind] || VX.POOLS.acid, lava = !!PL.burn;
          if (Math.random() < dt * 6) {
            const px = M.rand(x0, x1), pz = M.rand(z0, z1), c = PL.part;
            this.particles.spawn(px, 0.07, pz, M.rand(-0.3, 0.3), M.rand(lava ? 1 : 0.3, lava ? 2.5 : 0.9), M.rand(-0.3, 0.3), c[0], c[1], c[2], 0.045, M.rand(0.5, 1), 1, 1);
          }
          if (this.state === 'playing' && inside(P.x, P.z, 0.15) && P.y < 0.3 && !P.dashT) {
            this.dmgSrc = PL.name || 'Un charco peligroso'; P.damage(PL.pdmg, undefined, undefined, this); this.dmgSrc = null;
            P.knock(0, 0, PL.knock || 0);
          }
          for (const e of this.enemies) {
            if (e.dead || e.isBoss || !inside(e.x, e.z) || e.y > 0.3) continue;
            if (lava && e.T && e.T.fireImmune) continue;
            e.hp -= PL.edps * dt; e.body.flash = 0.4;
            if (lava) e.burn = Math.max(e.burn || 0, 1.5);
            if (e.hp <= 0) e.die([0, 1, 0], this);
          }
          continue;
        }
        const st = this.spikeState(sp);
        if (!st.up) continue;
        if (this.state === 'playing' && inside(P.x, P.z, 0.2) && P.y < 0.4) { this.dmgSrc = 'Las púas'; P.damage(14, P.x, P.z + 0.01, this); this.dmgSrc = null; }
        for (const e of this.enemies) {
          if (e.dead || e.isBoss || !inside(e.x, e.z)) continue;
          e.hp -= 45 * dt; e.body.flash = 0.5;
          if (Math.random() < 0.2) this.particles.blood(e.x, 0.2, e.z, 0, 1, 0, 2);
          if (e.hp <= 0) e.die([0, 1, 0], this);
        }
      }
    }

    renderSpikes(b, rooms) {
      for (const r of rooms) for (const sp of r.spikes) {
        if (sp.kind !== 'spikes') { this.renderPool(b, r, sp); continue; }
        const st = this.spikeState(sp);
        const h = 0.04 + st.k * 0.38;
        const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
        b.box((x0 + x1) / 2, 0.015, (z0 + z1) / 2, x1 - x0, 0.03, z1 - z0, 0.13, 0.12, 0.13, 0);
        for (let x = x0 + 0.125; x < x1; x += 0.25)
          for (let z = z0 + 0.125; z < z1; z += 0.25) {
            b.box(x, h / 2, z, 0.07, h, 0.07, 0.55, 0.55, 0.6, 0);
            // punta afilada (y ensangrentada cuando están fuera)
            b.box(x, h + 0.03, z, 0.035, 0.06, 0.035, st.k > 0.3 ? 0.7 : 0.6, st.k > 0.3 ? 0.12 : 0.6, st.k > 0.3 ? 0.1 : 0.62, 0);
          }
      }
    }

    // Forma de una poza de agua: rectángulo redondeado con la orilla mordida por ruido.
    // Devuelve cajas planas (franjas) en un array: x, y, z, w, h, d, r, g, b, material.
    poolShape(x0, z0, x1, z1, C, seed) {
      const out = [], cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
      const rad = Math.min(0.7, Math.min(hx, hz) * 0.6);
      const sdf = (x, z) => {
        const qx = Math.abs(x - cx) - (hx - rad), qz = Math.abs(z - cz) - (hz - rad);
        const o = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rad;
        return o + (M.vnoise(x * 1.7, z * 1.7, seed) - 0.5) * 0.32 + (M.vnoise(x * 4.1, z * 4.1, seed + 9) - 0.5) * 0.1;
      };
      const st = 0.0625;
      // franjas en x: une las celdas seguidas de la misma capa
      const layer = (lim, y, h, colAt, mat, pad) => {
        for (let z = z0 - pad + st / 2; z < z1 + pad; z += st) {
          let run = -1, rc = null;
          const flush = (xe) => { if (run < 0) return; out.push((run + xe) / 2, y, z, xe - run, h, st, rc[0], rc[1], rc[2], mat); run = -1; };
          for (let x = x0 - pad; x <= x1 + pad + 1e-6; x += st) {
            const d = sdf(x + st / 2, z);
            if (d < lim) {
              const c = colAt(d);
              if (run >= 0 && (Math.abs(c[0] - rc[0]) > 0.012 || x - run > 1.2)) flush(x);
              if (run < 0) { run = x; rc = c; }
            } else flush(x);
          }
          flush(x1 + pad + st);
        }
      };
      // orilla de barro húmedo (oscura y algo brillante) y luego el agua, más honda en el centro
      layer(0.16, 0.012, 0.024, (d) => { const k = 0.75 + M.clamp(-d, 0, 0.16) * 1.5; return [0.1 * k, 0.085 * k, 0.065 * k]; }, -0.55, 0.25);
      layer(0, 0.045, 0.03, (d) => {
        const dep = M.clamp(-d / 0.9, 0, 1), q = Math.round(dep * 6) / 6;
        return [C[0] * (1.35 - q * 0.6) + 0.02 * (1 - q), C[1] * (1.3 - q * 0.55) + 0.018 * (1 - q), C[2] * (1.25 - q * 0.45) + 0.012 * (1 - q)];
      }, -1.25, 0);
      return out;
    }

    // charco de lava o ácido: superficie de vóxeles que burbujea
    renderPool(b, r, sp) {
      const PL = VX.POOLS[sp.kind] || VX.POOLS.acid, C = PL.c;
      const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
      const t = this.time;
      if (PL.water) {
        // poza de agua: orilla irregular de barro mojado y una lámina de agua sin juntas que
        // brilla con las luces (ondas y gotas en el sombreador). La forma se calcula una vez.
        if (!sp.wgeo) sp.wgeo = this.poolShape(x0, z0, x1, z1, C, sp.ux0 * 7 + sp.uz0 * 13);
        const G = sp.wgeo;
        for (let i = 0; i < G.length; i += 10) b.box(G[i], G[i + 1], G[i + 2], G[i + 3], G[i + 4], G[i + 5], G[i + 6], G[i + 7], G[i + 8], G[i + 9]);
        return;
      }
      // borde oscuro
      b.box((x0 + x1) / 2, 0.01, (z0 + z1) / 2, x1 - x0 + 0.1, 0.02, z1 - z0 + 0.1, 0.06, 0.05, 0.05, 0);
      for (let x = x0 + 0.125; x < x1; x += 0.25)
        for (let z = z0 + 0.125; z < z1; z += 0.25) {
          const n = Math.sin(x * 3.1 + t * 1.3) * 0.5 + Math.sin(z * 2.7 - t * 1.7) * 0.5;
          const h = 0.035 + n * 0.012;
          const k = 0.75 + n * 0.25;
          b.box(x, h / 2, z, 0.25, h, 0.25, C[0] * k, C[1] * k * (PL.burn ? k : 1), C[2] * k, PL.e + n * 0.1);
        }
    }

    addCorpse(c) {
      this.corpses.push(c);
      if (this.corpses.length > ((VX.Q && VX.Q.corpses) || 14)) this.corpses[0].life = Math.min(this.corpses[0].life, 1.5);
    }

    musicMode() {
      if (this.state === 'title') return 'title';
      if (this.state === 'dying' || this.state === 'dead') return 'death';
      const r = this.currentRoom;
      if (!r) return 'explore';
      if (this.boss && !this.boss.dead) return 'boss';
      if (this.enemies.some((e) => !e.dead)) return 'combat';
      if (r.type === 'shop' || (this.mode === 'horde' && VX.HordeMode.merchant)) return 'shop';
      if (r.type === 'save') return 'save';
      return 'explore';
    }

    // ---------------- Actualización ----------------
    update(dt) {
      // parón de impacto: el tiempo casi se detiene un instante al recibir un golpe
      if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.12; }
      this.frame++;
      this.time += dt;
      this.frameDt = dt;
      VX.Music.setMode(this.musicMode());
      if (VX.Music.setZone) VX.Music.setZone(this.zone || 0);

      this.envAudio(dt);
      if (this.state === 'title') {
        const P = this.player;
        P.yaw = Math.sin(this.time * 0.12) * 0.5;
        P.pitch = -0.08 + Math.sin(this.time * 0.2) * 0.04;
        P.z = this.currentRoom.worldZ(10) + Math.sin(this.time * 0.1) * 1.5;
        for (const e of this.enemies) {
          const b = e.body;
          e.walkT += dt * 2;
          b.byName.legL.ax = Math.sin(e.walkT) * 0.3;
          b.byName.legR.ax = -Math.sin(e.walkT) * 0.3;
          b.byName.armL.ax = b.byName.armR.ax = -1.4 + Math.sin(this.time + e.walkT) * 0.1;
          b.byName.head.az = Math.sin(e.walkT * 0.4) * 0.3;
          b.yaw = Math.atan2(P.x - e.x, P.z - e.z);
          b.computeWorld();
        }
        this.particles.update(dt, this.world);
        return;
      }
      if ((this.state === 'paused' || this.state === 'settings') && !VX.Coop.active) return;

      const P = this.player;
      if (this.state === 'playing') {
        P.update(dt, this);
        VX.Audio.listen(P);
        this.localAct = true;   // lo que haga ahora el arma es obra del jugador de este equipo
        try { this.weapon.update(dt, this); } finally { this.localAct = false; }
        if (this.mode === 'horde') { if (VX.Coop.isClient) VX.HordeMode.clientUpdate(this, dt); else VX.HordeMode.update(this, dt); }
        else this.roomLogic();
        this.updateChallenge(dt);
        // latido con poca vida
        const hr = P.hp / P.maxHp;
        if (hr < 0.35 && !P.dead) {
          this.beatT = (this.beatT || 0) - dt;
          if (this.beatT <= 0) { VX.Audio.heartbeat(1 - hr * 2); this.beatT = 0.55 + hr * 1.6; }
        }
        // maldición de sangre: pierdes vida mientras haya enemigos vivos
        if (this.weapon.mods.bleed && P.hp > 1 && this.enemies.some((e) => !e.dead)) P.hp = Math.max(1, P.hp - dt * 1.2);
        // gemidos lejanos de ambiente
        if (Math.random() < dt * 0.04 && VX.Audio.groanAt) {
          const a = Math.random() * Math.PI * 2;
          VX.Audio.groanAt(P.x + Math.cos(a) * 14, P.z + Math.sin(a) * 14, P, Math.random() < 0.2);
        }
        this.ambientSounds(dt);
      } else if (this.state === 'dying') {
        if (this.escaped) {
          // dentro del helicóptero: se eleva y se aleja
          const up = dt * Math.min(6, (4 - this.deathT) * 3), E = VX.HordeMode.evac;
          P.y += up; P.pitch = M.lerp(P.pitch, -0.5, Math.min(1, dt * 1.5));
          if (E) { VX.HordeMode.timer = -1; E.lift = (E.lift || 0) + up; }
        } else P.eyeOffset = M.lerp(P.eyeOffset, -1.35, Math.min(1, dt * 3));
        this.deathT -= dt;
        if (this.deathT <= 0) {
          this.state = 'dead';
          VX.Input.unlock();
          VX.Menus.showGameOver(this.stats, this.floor, this.essenceGain, this.runResult, this.runTime, this);
          this.hud.show(false);
        }
      }

      if (this.currentRoom) {
        // los señuelos encendidos también son destino del mapa de caminos
        let fx = VX.Coop.flowExtra();
        if (VX.Throw.decoys.length) { fx = fx ? fx.slice() : []; for (const d of VX.Throw.decoys) if (!d.dead) fx.push(d.x, d.z); }
        // cooperativo: si el anfitrión está en el suelo o muerto, los caminos llevan a los que siguen en pie
        let ox = P.x, oz = P.z;
        if (VX.Coop.isHost && (VX.Coop.down || VX.Coop.deadWait || P.dead) && fx && fx.length >= 2) { ox = fx[0]; oz = fx[1]; }
        this.world.updateFlow(this.currentRoom, ox, oz, dt, fx);
      }

      this.enemyLod();   // detalle de cada zombi según la distancia y la calidad
      if (VX.Coop.isClient) VX.Coop.updateReplicas(dt, this);   // los zombis los mueve el anfitrión
      else {
        VX.Horde.update(this, dt);
        VX.Audio.enemyCtx = true;   // lo que suena dentro de los zombis va al volumen de «Enemigos»
        const srcName = (e) => e.isBoss ? 'Jefe: ' + (e.name || '?') : (e.champion ? 'Campeón: ' : e.elite ? 'Élite: ' : '') + ((e.T && e.T.name) || 'Un zombi');
        const tagShots = (n0) => { for (let i = n0; i < this.projectiles.length; i++) if (!this.projectiles[i].src) this.projectiles[i].src = this.dmgSrc; };
        if (VX.Coop.isHost) {
          // cada zombi va a por el jugador más cercano (el anfitrión o un compañero)
          const me = this.player;
          for (const e of this.enemies) if (!e.dead) { const dc = VX.Throw.decoyFor(e); this.player = dc ? VX.Throw.proxy(me, dc) : VX.Coop.targetFor(e, this); VX.Audio.source(e.x, e.y + 1.3, e.z); this.dmgSrc = srcName(e); const n0 = this.projectiles.length; try { e.update(dt, this); } finally { this.player = me; tagShots(n0); this.dmgSrc = null; } }
        } else for (const e of this.enemies) if (!e.dead) {
          VX.Audio.source(e.x, e.y + 1.3, e.z);
          this.dmgSrc = srcName(e);
          const dc = VX.Throw.decoyFor(e);   // señuelo encendido cerca: va a por él
          const n0 = this.projectiles.length;
          if (dc) { const me = this.player; this.player = VX.Throw.proxy(me, dc); try { e.update(dt, this); } finally { this.player = me; } }
          else e.update(dt, this);
          tagShots(n0);
        }
        VX.Audio.source(null);   // lo que suena dentro de cada zombi sale desde donde está
        VX.Audio.enemyCtx = false; this.dmgSrc = null;
        VX.Horde.separate(this);
      }
      if (this.frame % 30 === 0 && this.enemies.length) this.enemies = this.enemies.filter((e) => !e.dead || e === this.boss);

      for (const c of this.corpses) c.update(dt, this);
      this.corpses = this.corpses.filter((c) => c.life > 0);
      for (const g of this.gibs) g.update(dt, this.world);
      this.gibs = this.gibs.filter((g) => g.life > 0);
      const gMax = (VX.Q && VX.Q.gibs) || 70;
      if (this.gibs.length > gMax) this.gibs.splice(0, this.gibs.length - gMax);

      this.updateProjectiles(dt);
      this.updateSap(dt);
      this.bullets.update(dt, this);
      this.updateSpikes(dt);
      if (this.currentRoom) for (const p of this.currentRoom.props) if (p.lit > 0 || p.burning > 0) p.update(dt, this);
      // trozos caídos que se han quedado encima de algo que ya no está (una estantería quemada): vuelven a caer
      this.pieceT = (this.pieceT || 0) - dt;
      if (this.pieceT <= 0 && this.currentRoom) {
        this.pieceT = 0.4;
        for (const p of this.currentRoom.props) {
          if (p.dead || p.type !== 'piece' || p.alive <= 0) continue;
          const g = Math.max(this.world.groundAt(p.ox + p.w * VX.PV * 0.5, p.oz + p.d * VX.PV * 0.5), this.world.groundAt(p.ox + 0.05, p.oz + 0.05), this.world.groundAt(p.ox + p.w * VX.PV - 0.05, p.oz + p.d * VX.PV - 0.05));
          if (p.oy - g > 0.15) p.collapse(this, 0, 0);
        }
      }
      this.updateFallers(dt);
      this.world.processSupport(this);
      this.updateBlockFallers(dt);
      for (const a of this.doorAnims) {
        a.t += dt;
        if (a.drop) {
          if (a.t >= a.dur && !a.done) {
            a.done = true;
            a.room.setDoor(a.side, true);
            // golpe contra el suelo: polvo, chispas y estruendo
            const w = a.room.doorWorld(a.side);
            const ax = Math.abs(w.nx) > 0.5 ? 0 : 1, az = 1 - ax;
            for (let i = 0; i < 34; i++) {
              const o = M.rand(-1, 1);
              this.particles.spawn(w.x + ax * o + w.nx * M.rand(-0.3, 0.6), 0.08, w.z + az * o + w.nz * M.rand(-0.3, 0.6),
                M.rand(-1.2, 1.2) + w.nx * 1.5, M.rand(0.3, 1.6), M.rand(-1.2, 1.2) + w.nz * 1.5, 0.42, 0.39, 0.35, M.rand(0.04, 0.09), M.rand(1, 2.2), 0, i % 2);
            }
            for (let i = 0; i < 10; i++) this.particles.spawn(w.x + ax * M.rand(-1, 1), 3, w.z + az * M.rand(-1, 1), 0, M.rand(-1, 0), 0, 0.35, 0.32, 0.3, 0.03, 1.5);
            this.particles.sparks && this.particles.sparks(w.x, 0.1, w.z, w.nx, 0.5, w.nz, 8);
            VX.Audio.slam(); VX.Audio.door();
            this.shake(0.35);
          }
          continue;
        }
        if (Math.random() < 0.5 && a.t < a.dur) {
          const w = a.room.doorWorld(a.side);
          this.particles.spawn(w.x + M.rand(-1, 1), 3, w.z, M.rand(-0.3, 0.3), M.rand(-1, 0), M.rand(-0.3, 0.3), 0.35, 0.32, 0.3, 0.04, 1);
        }
      }
      this.doorAnims = this.doorAnims.filter((a) => (a.drop ? !a.done : a.t < a.dur + 0.1));
      this.updateFire(dt);
      this.updateFogHoles(dt); this.fogFootsteps(dt);
      for (const bl of this.blasts) bl.t += dt;
      if (this.blasts.length) this.blasts = this.blasts.filter((bl) => bl.t < (bl.pop ? 1.4 : 4));
      this.updateRises(dt);
      this.checkSecret();
      if (this.state === 'playing' && this.mode !== 'horde' && VX.Input.wasPressed(VX.Settings.key('map'))) this.hud.showMap(this);
      if (this.state === 'playing') this.runTime += dt;
      for (const e of this.pendingExplosions) { e.delay -= dt; if (e.delay <= 0) { e.done = true; this.explode(e); } }
      this.pendingExplosions = this.pendingExplosions.filter((e) => !e.done);
      this.updateShockwaves(dt);
      this.updateTelegraphs(dt);
      if (this.state === 'playing' || this.state === 'title') this.updateAmbience(dt);
      if (this.state === 'playing') this.pickups.update(dt, this);

      for (const n of this.npcs) {
        if (n.update) { n.update(dt, this); continue; }   // el vendedor de la tienda va por su cuenta
        n.t += dt;
        const b = n.body;
        const ty = Math.atan2(P.x - b.x, P.z - b.z);
        let d = ty - b.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        b.yaw += d * Math.min(1, dt * 3);
        b.byName.armL.ax = -0.4 + Math.sin(n.t * 2) * 0.15;
        b.byName.armR.ax = -0.9 + Math.sin(n.t * 2.5) * 0.3;
        b.byName.head.az = Math.sin(n.t * 1.3) * 0.12;
        b.yOff = Math.sin(n.t * 2) * 0.01;
        b.computeWorld();
      }

      // chispas de antorchas
      if (this.frame % 4 === 0 && this.currentRoom) {
        const ts = this.currentRoom.torches;
        if (ts.length) {
          const t = ts[(Math.random() * ts.length) | 0];
          if (t.alive) this.particles.spawn(t.x, t.y + 0.12, t.z, M.rand(-0.2, 0.2), M.rand(0.6, 1.4), M.rand(-0.2, 0.2), 1, 0.6, 0.2, 0.018, M.rand(0.4, 0.9), 1, 1);
        }
      }

      this.particles.update(dt, this.world);
      // la niebla se tiñe según el bioma
      const fz = VX.ZONES[this.zone].fog, fc = VX.Renderer.fogColor;
      for (let i = 0; i < 3; i++) fc[i] = M.lerp(fc[i], fz[i], Math.min(1, dt * 1.5));
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
      if (VX.Coop.active) VX.Coop.update(dt, this);
      this.hud.update(dt, this);
    }

    updateProjectiles(dt) {
      const P = this.player;
      for (const p of this.projectiles) {
        if (p.fuse !== undefined) {
          // dinamita en el suelo: chisporrotea y explota
          p.fuse -= dt;
          if (Math.random() < 0.8) this.particles.spawn(p.x, p.y + 0.15, p.z, M.rand(-1, 1), M.rand(1, 2.5), M.rand(-1, 1), 1, 0.8, 0.3, 0.03, 0.3, 1, 1);
          if (p.fuse <= 0) {
            p.dead = true;
            this.explode({ x: p.x, y: p.y + 0.2, z: p.z, R: 2.6, dmg: p.dmg * 1.3, selfK: 1, destr: 0.8 });
          }
          continue;
        }
        if (p.home) {
          // orbe del nigromante: corrige el rumbo hacia ti poco a poco
          const tx = P.x - p.x, ty = P.y + 1.1 - p.y, tz = P.z - p.z, l = Math.hypot(tx, ty, tz) || 1, sp = Math.hypot(p.vx, p.vy, p.vz);
          p.vx += (tx / l * sp - p.vx) * p.home * dt; p.vy += (ty / l * sp - p.vy) * p.home * dt; p.vz += (tz / l * sp - p.vz) * p.home * dt;
        }
        p.vy -= (p.g ?? 18) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.dynamite) {
          const gy = this.world.groundAt(p.x, p.z);
          if (p.y <= gy + 0.06 || this.world.isSolidAt(p.x, p.y, p.z)) {
            if (this.world.isSolidAt(p.x, p.y, p.z)) { p.x -= p.vx * dt; p.z -= p.vz * dt; }
            p.y = this.world.groundAt(p.x, p.z) + 0.06; p.fuse = 1.1; p.vx = p.vy = p.vz = 0; VX.Audio.click && VX.Audio.click();
          }
          p.rot += dt * 8;
          continue;
        }
        p.rot += dt * 6; p.life -= dt;
        if (p.arrow) {
          const dp = Math.hypot(P.x - p.x, P.y + 1 - p.y, P.z - p.z);
          if (dp < 0.55 && this.state === 'playing') { p.dead = true; this.dmgSrc = p.src || 'Un proyectil'; P.damage(p.dmg, p.x - p.vx, p.z - p.vz, this); this.dmgSrc = null; VX.Audio.flesh(); continue; }
          if (p.life <= 0 || p.y < this.world.groundAt(p.x, p.z) || this.world.isSolidAt(p.x, p.y, p.z)) {
            p.dead = true; VX.Audio.wall();
            // la flecha se queda clavada un rato
            this.stuckArrows = (this.stuckArrows || []);
            this.stuckArrows.push({ x: p.x - p.vx * dt, y: p.y - p.vy * dt, z: p.z - p.vz * dt, vx: p.vx, vy: p.vy, vz: p.vz, t: 12 });
            if (this.stuckArrows.length > 30) this.stuckArrows.shift();
          }
          continue;
        }
        if (Math.random() < 0.5) this.particles.spawn(p.x, p.y, p.z, 0, 0.5, 0, p.col[0] * 0.7, p.col[1] * 0.7, p.col[2] * 0.7, p.acid ? 0.04 : 0.07, 0.5, p.glow, 1);
        const dp = Math.hypot(P.x - p.x, P.y + 0.9 - p.y, P.z - p.z);
        if (p.y < 0.1 || p.life <= 0 || dp < (p.acid ? 0.6 : 0.9) || this.world.isSolidAt(p.x, p.y, p.z)) {
          p.dead = true;
          const br = p.blastR ?? 1.1;
          this.world.damageSphere(p.x, p.y, p.z, br, p.blockDmg ?? 120, this);
          const reach = p.acid ? 1.2 : 2.6;
          if (dp < reach && this.state === 'playing') { this.dmgSrc = p.src || (p.acid ? 'Un escupitajo ácido' : 'Un proyectil'); P.damage(p.dmg * (p.acid ? 1 : (1 - dp / 3.5)), p.x, p.z, this); this.dmgSrc = null; }
          for (let i = 0; i < (p.acid ? 16 : 26); i++)
            this.particles.spawn(p.x, p.y, p.z, M.rand(-4, 4), M.rand(1, 5), M.rand(-4, 4), p.col[0], p.col[1], p.col[2], M.rand(0.03, p.acid ? 0.07 : 0.14), M.rand(1, 2.5), p.glow);
          if (p.spawn && this.state === 'playing' && this.enemies.filter((e) => !e.dead).length < 12) {
            // el saco revienta y salen crías
            for (let k = 0; k < 2; k++) this.spawner.spawnZombieNear(this, p.x, p.z, 1.2, p.spawn);
          }
          if (p.sap) (this.sapPuddles || (this.sapPuddles = [])).push({ x: p.x, z: p.z, y: this.world.groundAt(p.x, p.z), t: 7, seed: Math.random() * 9 });
          if (p.acid) {
            VX.Audio.flesh();
            // el ácido corroe los objetos que alcanza
            if (this.currentRoom) for (const pr of this.currentRoom.props) if (!pr.dead && Math.hypot(pr.cx - p.x, pr.cy - p.y, pr.cz - p.z) < pr.rad + 0.4) pr.carve(p.x, p.y, p.z, 0.3, this, 0, 0, 0, 6);
          } else { VX.Audio.slam(); this.shake(0.3); }
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead);
    }

    // charcos de savia de la hidra: frenan y queman un poco
    updateSap(dt) {
      const L = this.sapPuddles; this.inSap = false;
      if (!L || !L.length) return;
      const P = this.player;
      for (const s of L) {
        s.t -= dt;
        if (Math.hypot(P.x - s.x, P.z - s.z) < 1.1 && P.y - s.y < 0.3) this.inSap = true;
        if (Math.random() < dt * 3) this.particles.spawn(s.x + M.rand(-0.6, 0.6), s.y + 0.05, s.z + M.rand(-0.6, 0.6), 0, M.rand(0.2, 0.6), 0, 0.5, 0.95, 0.25, 0.03, 0.6, 1, 1);
      }
      if (this.inSap && this.state === 'playing') { this.dmgSrc = 'La savia de la hidra'; P.damage(3 * dt, undefined, undefined, this, true); this.dmgSrc = null; }
      this.sapPuddles = L.filter((s) => s.t > 0);
    }
    renderSap(b) {
      if (!this.sapPuddles) return;
      for (const s of this.sapPuddles) {
        const k = Math.min(1, s.t / 1.5);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + s.seed, r = i ? 0.55 : 0;
          b.box(s.x + Math.cos(a) * r, s.y + 0.02, s.z + Math.sin(a) * r, 0.75 * k, 0.03, 0.75 * k, 0.35, 0.75, 0.2, 0.45);
        }
      }
    }

    updateShockwaves(dt) {
      const P = this.player;
      for (const s of this.shockwaves) {
        s.r += s.speed * dt;
        if (s.r < 0) continue;
        const d = Math.hypot(P.x - s.x, P.z - s.z);
        if (!s.hit && Math.abs(d - s.r) < 0.55 && P.onGround && this.state === 'playing') {
          s.hit = true;
          this.dmgSrc = s.src || 'Las esporas'; P.damage(s.dmg, s.x, s.z, this); this.dmgSrc = null;
          P.knock(((P.x - s.x) / (d || 1)) * 6, ((P.z - s.z) / (d || 1)) * 6, 5);
        }
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2;
          const px = s.x + Math.cos(a) * s.r, pz = s.z + Math.sin(a) * s.r;
          this.particles.spawn(px, this.world.groundAt(px, pz) + 0.1, pz, 0, M.rand(1, 3), 0, 0.35, 0.3, 0.28, 0.08, 0.6);
        }
      }
      this.shockwaves = this.shockwaves.filter((s) => s.r < s.max);
    }

    // ---------------- Luces ----------------
    // Mapas con el centro iluminado: lejos del centro baja la luz ambiente y la de la luna
    edgeDark() {
      const Z = VX.ZONES[this.zone], cd = Z && Z.centerDark;
      if (!cd || this.state === 'title') return 1;
      const d = Math.hypot(this.player.x, this.player.z);
      return M.lerp(1, cd.k, M.smoothstep(cd.r0, cd.r1, d));
    }
    gatherLights(cam, rooms) {
      const L = this.lights;
      L.length = 0;
      this.world.collectLights(L, this.time, rooms);
      for (const it of this.pickups.items) if (it.kind !== 'perk' && it.kind !== 'secretChest')
        L.push({ x: it.x, y: it.y + 0.6, z: it.z, r: 3.5, cr: it.color[0] * 1.2, cg: it.color[1] * 1.2, cb: it.color[2] * 1.2 });
      for (const p of this.projectiles) if (p.glow) L.push({ x: p.x, y: p.y, z: p.z, r: p.acid ? 3 : 5, cr: p.col[0] * 1.5, cg: p.col[1] * 1.5, cb: p.col[2] * 1.5 });
      for (const s of this.shockwaves) if (s.r > 0) L.push({ x: s.x, y: (s.y || 0) + 0.5, z: s.z, r: s.r + 3, cr: 1.5, cg: 0.6, cb: 0.15 });
      this.bullets.lights(L, cam);
      let nf = 0;
      for (const f of this.fires) {
        if (nf++ >= 4) break;
        const fl = 0.8 + Math.sin(this.time * 13 + f.x * 3) * 0.12 + Math.sin(this.time * 29 + f.z * 5) * 0.08;   // la luz parpadea con las llamas
        L.push(f.kind === 'poison' ? { x: f.x, y: 0.6, z: f.z, r: 3 + f.r * 2, cr: 0.5, cg: 1.2, cb: 0.3 } : { x: f.x, y: 0.5 + f.r * 0.3, z: f.z, r: 4 + f.r * 2.5, cr: 2.6 * fl, cg: 1.15 * fl, cb: 0.3 * fl });
      }
      // lámparas de los mineros
      let nl = 0;
      for (const e of this.enemies) if (!e.dead && e.T && e.T.lamp && nl++ < 3) L.push({ x: e.x + Math.sin(e.body.yaw) * 0.4, y: e.y + 1.9, z: e.z + Math.cos(e.body.yaw) * 0.4, r: 4.5, cr: 1.6, cg: 1.3, cb: 0.7 });
      if (this.currentRoom) for (const p of this.currentRoom.props) if (p.burning > 0 && nf++ < 7) { const fl = 0.8 + Math.sin(this.time * 11 + p.cx * 7) * 0.15; L.push({ x: p.cx, y: p.cy + 0.4, z: p.cz, r: 6, cr: 2.6 * fl, cg: 1.15 * fl, cb: 0.3 * fl }); }
      for (const e of this.enemies) if (!e.dead && e.burn > 0 && nf++ < 8) L.push({ x: e.x, y: e.y + 1, z: e.z, r: 4, cr: 2.2, cg: 1, cb: 0.25 });
      for (const bl of this.blasts) { if (bl.pop) { if (bl.t < 0.16) { const k = 1 - bl.t / 0.16; L.push({ x: bl.x, y: bl.y + 0.2, z: bl.z, r: 6, cr: 9 * k, cg: 6 * k, cb: 3 * k }); } continue; } if (bl.t > 0.9) continue; const k = Math.pow(1 - bl.t / 0.9, 2) * (0.85 + Math.sin(bl.t * 60) * 0.15); L.push({ x: bl.x, y: bl.y + 0.6, z: bl.z, r: 8 + bl.R * 3, cr: 7 * k, cg: 3.8 * k, cb: 1.1 * k }); }
      for (const sg of this.doorSigns()) {
        const pulse = sg.type === 'boss' ? 0.7 + Math.sin(this.time * 5) * 0.3 : 1;
        L.push({ x: sg.x + sg.nx * 0.4, y: 3.2, z: sg.z + sg.nz * 0.4, r: 3.5, cr: sg.c[0] * 0.9 * pulse, cg: sg.c[1] * 0.9 * pulse, cb: sg.c[2] * 0.9 * pulse });
      }
      // ordenar por distancia; las que rondan el límite se atenúan poco a poco (sin "popping")
      for (const l of L) l.d = Math.sqrt((l.x - cam.x) ** 2 + (l.y - cam.y) ** 2 + (l.z - cam.z) ** 2);
      L.sort((a, b) => a.d - b.d);
      const moon = this.state !== 'title' && VX.ZONES[this.zone] && VX.ZONES[this.zone].moon;
      const N = VX.MAX_LIGHTS - (moon ? 3 : 2);
      const target = L.length > N ? L[N].d : 60;
      this.lightCut = M.lerp(this.lightCut, target, Math.min(1, (this.frameDt || 0.016) * 3));
      const cut = Math.max(this.lightCut, 4);
      const out = [];
      for (const l of L) {
        if (out.length >= N) break;
        const f = 1 - M.smoothstep(cut * 0.72, cut, l.d);
        if (f <= 0.001) continue;
        l.cr *= f; l.cg *= f; l.cb *= f;
        out.push(l);
      }
      out.push({ x: cam.x, y: cam.y + 0.2, z: cam.z, r: 3, cr: 0.035, cg: 0.032, cb: 0.042 });
      // luz de luna (o del atardecer): muy lejana, ilumina de lado las fachadas en los mapas abiertos
      const mk = (this.ambientMul || 1) * this.edgeDark() + (this.bolt || 0) * 7;
      if (moon) out.push({ x: cam.x + moon.d[0] * 300, y: cam.y + moon.d[1] * 300, z: cam.z + moon.d[2] * 300, r: 900, cr: moon.c[0] * mk, cg: moon.c[1] * mk, cb: moon.c[2] * mk });
      const W = this.weapon;
      if (W.flash > 0.05 && W.muzzle) out.push({ x: W.muzzle[0], y: W.muzzle[1], z: W.muzzle[2], r: 9, cr: 5 * W.flash, cg: 3.2 * W.flash, cb: 1.2 * W.flash });
      return out;
    }

    // Carteles sobre las salidas de la sala actual (qué hay detrás)
    doorSigns() {
      const r = this.currentRoom, out = [];
      if (!r || this.state === 'title') return out;
      for (const s of r.exits) {
        const d = r.doors[s];
        if (!d || !d.type) continue;
        const w = r.doorWorld(s);
        const info = VX.ROOM_TYPES[d.type];
        out.push({ side: s, x: w.x, z: w.z, nx: w.nx, nz: w.nz, type: d.type, c: info.color, shape: info.shape, closed: d.closed, label: info.label });
      }
      return out;
    }

    renderSigns(b) {
      const S_V = VX.SHAPE_VOX;
      for (const sg of this.doorSigns()) {
        const vs = sg.type === 'boss' ? 0.075 : 0.06;
        const yaw = Math.atan2(sg.nx, sg.nz);
        const q = M.qY(yaw + Math.sin(this.time * 1.5 + sg.x) * 0.15);
        const pulse = sg.type === 'boss' ? 0.6 + Math.sin(this.time * 5) * 0.4 : 0.55;
        const cx = sg.x + sg.nx * 0.35, cy = 3.35 + Math.sin(this.time * 2 + sg.z) * 0.04, cz = sg.z + sg.nz * 0.35;
        for (const o of S_V[sg.shape]) {
          M.qRot(q, o[0] * vs, o[1] * vs, o[2] * vs * 0.5, tmp);
          b.rbox(cx + tmp[0], cy + tmp[1], cz + tmp[2], vs, vs, vs * 0.5, q, sg.c[0], sg.c[1], sg.c[2], pulse);
        }
        // placa de fondo
        M.qRot(q, 0, 0, -0.06, tmp);
        b.rbox(cx + tmp[0], cy + tmp[1], cz + tmp[2], vs * 7, vs * 7, 0.03, q, 0.12, 0.1, 0.1, 0);
      }
    }

    // la linterna titila un poco (pilas viejas)
    flashFlicker() {
      const t = this.time;
      return 0.94 + Math.sin(t * 13.1) * 0.02 + Math.sin(t * 31.7) * 0.015 + (Math.sin(t * 0.7) > 0.985 ? -0.25 : 0);
    }

    // ---------------- Render ----------------
    render() {
      const R = VX.Renderer, P = this.player;
      const sh = this.shakeAmt * this.shakeAmt * 0.25;
      const spec = VX.Coop.active && VX.Coop.deadWait ? VX.Coop.spectateCam(this) : null;   // muerto: ves la partida con un compañero
      const cam = spec || {
        x: P.eyeX() + M.rand(-sh, sh), y: P.eyeY() + M.rand(-sh, sh), z: P.eyeZ() + M.rand(-sh, sh),
        yaw: P.yaw + Math.sin(this.time * 0.9) * 0.0035 * (this.weapon.scopeK || 0), pitch: P.pitch + P.recoilPitch + Math.sin(this.time * 1.3) * 0.0028 * (this.weapon.scopeK || 0), roll: (P.hurtRoll || 0) + (this.zone === 9 && this.mode === 'horde' ? Math.sin(this.time * 0.42) * 0.016 + Math.sin(this.time * 0.97) * 0.005 : 0),
      };

      this.world.updateMeshes(R, this.currentRoom);
      const vis = this.world.visibleRooms(this.state === 'title' ? null : this.currentRoom);
      this.setGroundFog(R, cam);

      // ---- lote dinámico ----
      const b = this.dyn;
      b.clear();
      for (const e of this.enemies) if (!e.dead) e.render(b);
      if (VX.Coop.active) for (const rp of VX.Coop.remotes.values()) if (rp.seen) rp.render(b);
      for (const c of this.corpses) c.render(b);
      for (const g of this.gibs) g.render(b);
      this.renderSigns(b);
      for (const n of this.npcs) if (!n.hidden) n.body.render(b);
      this.particles.render(b);
      this.pickups.render(b);
      this.weapon.renderTracers(b);
      this.renderBlasts(b);
      this.renderSap(b);
      this.renderGas();
      this.bullets.render(b, this.time);
      this.world.renderTorches(b, this.time, vis);
      this.renderSpikes(b, vis);
      this.renderDecals(b);
      this.renderDoorAnims(b);
      this.renderHazardsExtra(b);
      this.renderFlames(b);
      this.renderBlockFallers(b);
      this.renderTelegraphs(b);
      if (this.mode === 'horde' && this.state !== 'title') VX.HordeMode.render(b, this);
      // flechas (en vuelo y clavadas)
      const arrowR = (x, y, z, vx, vy, vz) => {
        const l = Math.hypot(vx, vy, vz) || 1;
        for (let i = -4; i <= 4; i++) {
          const k = i * 0.055;
          const tip = i <= -3, fl = i >= 3;
          b.box(x + vx / l * k, y + vy / l * k, z + vz / l * k, tip ? 0.03 : 0.022, tip ? 0.03 : 0.022, tip ? 0.03 : 0.022, tip ? 0.5 : fl ? 0.85 : 0.45, tip ? 0.5 : fl ? 0.85 : 0.32, tip ? 0.55 : fl ? 0.8 : 0.18, 0);
        }
      };
      for (const p of this.projectiles) if (p.arrow) arrowR(p.x, p.y, p.z, -p.vx, -p.vy, -p.vz);
      for (const a of this.stuckArrows || []) arrowR(a.x, a.y, a.z, -a.vx, -a.vy, -a.vz);
      for (const p of this.projectiles) {
        if (p.arrow) continue;
        if (p.dynamite) {
          // cartucho: cilindro rojo con mecha
          const q = M.qAxis(0, 1, 0, p.rot);
          for (let i = -2; i <= 2; i++) { M.qRot(q, i * 0.04, 0, 0, tmp); b.rbox(p.x + tmp[0], p.y, p.z + tmp[2], 0.045, 0.05, 0.05, q, 0.75, 0.12, 0.1, 0.1); }
          const fl = p.fuse !== undefined ? 1 : 0.5;
          b.box(p.x, p.y + 0.06, p.z, 0.02, 0.06, 0.02, 1, 0.85 * fl, 0.4, 1);
          continue;
        }
        const q = M.qAxis(0.577, 0.577, 0.577, p.rot);
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
          if (i * i + j * j + k * k > 5) continue;
          const ps = p.size || 0.09;
          M.qRot(q, i * ps, j * ps, k * ps, tmp);
          const h = M.hash3(i, j, k) * 0.1;
          b.rbox(p.x + tmp[0], p.y + tmp[1], p.z + tmp[2], ps, ps, ps, q, p.col[0] + h, p.col[1] + h, p.col[2] + h, p.glow);
        }
      }
      for (const s of this.shockwaves) {
        if (s.r <= 0) continue;
        const n = Math.min(160, Math.max(24, Math.floor(s.r * 12)));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const hgt = 0.15 + Math.abs(Math.sin(a * 7 + s.r * 3)) * 0.2;
          b.box(s.x + Math.cos(a) * s.r, (s.y || 0) + hgt / 2, s.z + Math.sin(a) * s.r, 0.16, hgt, 0.16, 1, 0.45, 0.1, 0.8);
        }
      }
      if (VX.Settings.data.dust && P.flashlight && this.state !== 'title') this.renderDust(b, cam);
      b.upload();

      // ---- linterna (sombras) ----
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
      const fwd = [sy * cp, sp, cy * cp], right = [-cy, 0, sy], up = [-sy * sp, cp, -cy * sp];
      const sway = Math.sin(this.time * 1.3) * 0.01;
      const spot = {
        x: cam.x + right[0] * 0.2 - up[0] * 0.15, y: cam.y - up[1] * 0.15, z: cam.z + right[2] * 0.2 - up[2] * 0.15,
        dx: fwd[0] + right[0] * sway, dy: fwd[1] + 0.01, dz: fwd[2] + right[2] * sway,
        fov: 1.25, inner: 0.2, outer: 0.5, cr: 4.6 * this.flashFlicker(), cg: 4.2 * this.flashFlicker(), cb: 3.3 * this.flashFlicker(),
        on: (this.state !== 'title') && P.flashlight,
      };
      const l = Math.hypot(spot.dx, spot.dy, spot.dz); spot.dx /= l; spot.dy /= l; spot.dz /= l;
      R.camPos = [cam.x, cam.y, cam.z]; R.camFwd = fwd;
      if (spot.on && R.shadowsOn) {
        R.beginShadow(spot);
        this.world.render(R, this.currentRoom);
        b.draw();
        R.endShadow();
      }

      // ---- escena ----
      const lights = this.gatherLights(cam, vis);
      // Sombras de las luces de la sala (calidad alta): hasta 4 antorchas o lámparas, elegidas entre
      // las que alumbran lo que tienes delante (no sólo la más cercana). Esas luces pasan a ser las 0..3.
      for (const T of R.tsh) T.on = false;
      if (R.quality === 'alta' && VX.Settings.data.torchShadows && this.state !== 'title') {
        const cand = [];
        for (const l of lights) {
          if (!l.torch && !l.feat) continue;
          if (l.d > 30) continue;
          const vx = l.x - cam.x, vy = l.y - cam.y, vz = l.z - cam.z, dl = l.d || 1;
          const front = (vx * fwd[0] + vy * fwd[1] + vz * fwd[2]) / dl;   // delante de la cámara
          const near = l.d < l.r * 0.8;                                    // o me alumbra a mí
          if (front < -0.2 && !near) continue;
          cand.push({ l, score: (near ? 2 : 1) * (0.5 + Math.max(0, front)) / (l.d + 3) });
        }
        cand.sort((a, b) => b.score - a.score);
        const pick = cand.slice(0, 4).map((c) => c.l);
        for (let k = pick.length - 1; k >= 0; k--) { const i = lights.indexOf(pick[k]); lights.splice(i, 1); lights.unshift(pick[k]); }
        pick.forEach((tl, k) => {
          const tc = tl.torch;
          const sp = tc ? { x: tl.x + tc.nx * 0.1, y: tl.y, z: tl.z + tc.nz * 0.1, dx: tc.nx, dy: -0.55, dz: tc.nz, fov: 2.6, far: 22 }
            : { x: tl.x, y: tl.y, z: tl.z, dx: 0, dy: -1, dz: 0, fov: 2.7, far: 22 };
          R.beginShadow2(sp, k);
          this.world.render(R, this.currentRoom);
          b.draw();
          R.endShadow();
          R.tsh[k].on = true;
        });
      }
      const zt = VX.ZONES[this.zone].tint;
      // ambiente muy oscuro: la linterna, las antorchas y los braseros mandan
      const za = VX.ZONES[this.zone].ambient;
      // la tienda está en penumbra (luces cálidas y bajas): se nota al cruzar la puerta
      const tpl = this.currentRoom && this.currentRoom.template, dimT = tpl && tpl.dim && this.currentRoom.contains(this.player.x, this.player.z) ? tpl.dim : 1;
      this.roomDim = M.lerp(this.roomDim || 1, dimT, 0.04);
      const am = (this.ambientMul || 1) * this.edgeDark() * this.roomDim + (this.bolt || 0) * 3;
      const ambient = this.state === 'title' ? [0.03, 0.028, 0.04] : za ? [za[0] * am, za[1] * am, za[2] * am] : [0.009 * zt[0] * this.roomDim, 0.0085 * zt[1] * this.roomDim, 0.013 * zt[2] * this.roomDim];
      // mirilla: cierra el campo de visión y muestra la lente con la retícula
      const sk = this.state === 'playing' ? (this.weapon.scopeK || 0) : 0;
      R.zoom = 1 - M.smoothstep(0.3, 1, sk) * 0.7;
      const so = document.getElementById('scope');
      if (so) { const o = M.smoothstep(0.5, 0.75, sk); so.style.opacity = o; so.style.display = o > 0.01 ? 'block' : 'none'; const ch = document.getElementById('crosshair'); if (ch) ch.style.opacity = 1 - o; }
      // agua con reflejo (calidad alta y cerca del agua): pasada previa desde la cámara simétrica
      const room = this.currentRoom, wat = room && room.waters;
      R.reflReady = false;
      if (wat && wat.length && R.quality === 'alta' && this.state !== 'title') {
        const w0 = wat.find((w) => Math.hypot(w.x - cam.x, w.z - cam.z) < w.r + 32 && cam.y > w.y);
        if (w0) {
          R.beginReflection(cam, { lights, spot, ambient }, w0.y);
          this.world.render(R, room);
          b.draw();
          R.reflReady = true;
        }
      }
      R.beginScene(cam, { lights, spot, ambient });
      this.world.render(R, this.currentRoom);
      b.draw();
      if (wat && wat.length) {
        if (!room.waterBatch) {
          // superficie del agua: discos hechos con franjas finas que no se salen del pilón
          const wb = room.waterBatch = R.createBatch(256, false);
          for (const w of wat) for (let dz = -w.r; dz <= w.r; dz += 0.25) {
            const hw = Math.sqrt(Math.max(0, w.r * w.r - (dz + 0.125) * (dz + 0.125)));
            if (hw > 0.05) wb.box(w.x, w.y - 0.04, w.z + dz + 0.125, hw * 2, 0.08, 0.25, w.c[0], w.c[1], w.c[2], -0.95);
          }
          wb.upload();
        }
        R.drawWater(room.waterBatch);
      }
      R.endWorld();
      R.beginGlass();
      this.world.renderGlass(R, this.currentRoom);
      R.endGlass();
      R.drawSprites();   // fuego y humo suaves (explosiones)

      if (this.state === 'playing' || this.state === 'paused' || this.state === 'settings') {
        R.beginViewmodel(this.weapon.flash, [0.18, 0.17, 0.2]);
        this.gun.clear();
        if ((this.weapon.scopeK || 0) < 0.6 && !spec) this.weapon.renderViewmodel(this.gun, this);
        this.gun.upload();
        this.gun.draw();
      } else if (this.showcase) {
        // vitrina de la Armería: el arma gira en el centro de la pantalla
        const sc = this.showcase;
        R.beginViewmodel(0, [0.35, 0.33, 0.38]);
        this.gun.clear();
        if (sc.avatar) {
          // personaje del jugador (Armería → PERSONAJE), girando
          const key = VX.Look.key(sc.avatar);
          if (!this._avBody || this._avKey !== key) {
            this._avBody = new VX.VoxelBody(VX.Look.model(sc.avatar), 0.4);
            if (this._avBody.byName.gun) this._avBody.byName.gun.vox.length = 0;
            this._avKey = key;
          }
          const ab = this._avBody;
          ab.x = 0.06; ab.y = -0.4; ab.z = -1.25; ab.yaw = sc.yaw !== undefined ? sc.yaw : Math.PI + Math.sin(this.time * 0.5) * 1.2; ab.pitch = 0;
          ab.computeWorld();
          ab.render(this.gun);
          this.gun.upload(); this.gun.draw();
          R.present();
          return;
        }
        const q = sc.q || M.qMul(M.qMul(M.qY(this.time * 0.6), M.qX(0.2)), M.qZ(0.1));
        this.weapon.renderViewmodel(this.gun, this, sc.id, { x: 0.08, y: 0.0, z: -0.75, q, size: 0.42, noHand: true, form: sc.form, atts: sc.atts }, sc.skin);
        this.gun.upload();
        this.gun.draw();
      }
      R.present();
    }
  }

  VX.Game = Game;
})();
