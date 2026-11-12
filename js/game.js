// Orquestador del juego: estado, flujo de habitaciones, luces, actualización y render.
(function () {
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
      this.enemies = [];
      this.corpses = [];
      this.gibs = [];
      this.projectiles = [];
      this.shockwaves = [];
      this.pendingExplosions = [];
      if (this.bullets) this.bullets.clear();
      this.npcs = [];
      this.boss = null;
      this.upgradesTaken = [];
      this.stats = { kills: 0, headshots: 0, bosses: 0, gold: 0, totalGold: 0, shots: 0, hits: 0, purchases: 0 };
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
      this.state = 'title';
      this.hud.show(false);
      this.hud.hideBoss();
    }

    // ---------------- Partidas ----------------
    newGame() { this.startRun(null); }

    continueGame() {
      const data = VX.Save.peek();
      if (!data) return this.newGame();
      this.startRun(data);
    }

    startRun(save) {
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
        Object.assign(this.spawner, save.spawner);
        Object.assign(this.stats, save.stats);
        this.floor = save.floor;
        // se reanuda en una sala tranquila; la partida suspendida se consume al cargarla
        first = this.world.addStart('start', save.floor, this.spawner.planExits('zn', 'start', !!save.bossPending).slice(0, 3), null, save.zone || 0);
        first.bossNext = !!save.bossPending;
        VX.Save.clear();
      } else {
        this.floor = 0;
        first = this.world.addStart('start', 0, this.spawner.planExits('zn', 'start', false).concat().slice(0, 3));
        this.applyPerks();
      }
      this.player.dashCdBase = VX.Profile.dashCooldown();
      this.priceMul = VX.Profile.priceMul();
      this.player.magnet = Math.max(this.player.magnet, 2 * (VX.Profile.data.perks.iman || 0));
      this.revives = save && save.revives !== undefined ? save.revives : (VX.Profile.data.perks.segunda || 0);
      this.zone = first.zone || 0;
      VX.Renderer.fogColor = VX.ZONES[this.zone].fog.slice();
      first.entered = true;
      first.cleared = true;
      this.currentRoom = first;
      first.setDoor('zn', true);
      this.spawner.populateNeighbors(this, first);
      for (const s of first.exits) first.setDoor(s, false);
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
      else this.hud.banner('BOXEL DUNGEON', 'Cruza la puerta para empezar el descenso  ·  [F] linterna', 3.5);
    }

    // Mejoras permanentes del Santuario (sólo en partidas nuevas)
    applyPerks() {
      const pk = VX.Profile.perkLevels();
      const P = this.player, W = this.weapon;
      P.maxHp += 10 * pk.vigor; P.hp = P.maxHp;
      W.mods.damage *= 1 + 0.06 * pk.fuerza;
      this.stats.gold += 15 * pk.fortuna;
      const sw = VX.Profile.data.startWeapon;
      if (sw && sw !== 'pistol' && VX.Weapons.DEFS[sw] && VX.Profile.weaponUnlocked(sw)) W.slots[0] = W.mk(sw);
      // «Legado»: empiezas con mejoras al azar
      for (let i = 0; i < pk.legado; i++) {
        const up = VX.Upgrades.random(1, this)[0];
        if (up) { up.apply(this); this.upgradesTaken.push(up); }
      }
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
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
      const r = this.currentRoom, Sp = this.spawner;
      const snap = { floor: this.floor, bossPending: !!(r.cleared && r.bossNext), zone: this.zone,
        spawner: { roomsSinceBoss: Sp.roomsSinceBoss, nextBossIn: Sp.nextBossIn, bossCount: Sp.bossCount } };
      if (!r.cleared) {
        // la sala a medias no cuenta: se vuelve a jugar una equivalente
        snap.floor = Math.max(0, this.floor - 1);
        if (r.type === 'boss') { snap.bossPending = true; snap.spawner.bossCount--; snap.zone = r.zone || 0; }
        else snap.spawner.roomsSinceBoss = Math.max(0, Sp.roomsSinceBoss - 1);
      }
      VX.Save.write(this, snap);
      this.quitToTitle();
    }

    // Abandonar = rendirse: cuenta como muerte (esencia incluida) y se borra la partida
    abandonRun() {
      if (this.state !== 'paused') return;
      VX.Menus.hideAll();
      this.state = 'playing';
      this.player.dead = true;
      this.gameOver();
      this.deathT = 0.8;
    }

    quitToTitle() {
      VX.Profile.save();
      VX.Input.unlock();
      this.buildTitleScene();
      VX.Menus.showTitle();
    }

    gameOver() {
      VX.Profile.add('runs', 1);
      // esencia: moneda permanente para el Santuario
      this.essenceGain = Math.round(this.floor * 2 + this.stats.bosses * 15 + this.stats.kills / 8);
      VX.Profile.add('essence', this.essenceGain);
      VX.Profile.save();
      // roguelite: al morir se pierde la partida guardada (la esencia sí se queda)
      VX.Save.clear();
      this.failChallenge(true);
      this.state = 'dying';
      this.deathT = 2.2;
      this.hud.banner('HAS CAÍDO', '', 2);
    }

    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

    // ---------------- Flujo de habitaciones ----------------
    roomLogic() {
      const P = this.player;
      const cr = this.currentRoom;
      for (const s in cr.doors) {
        const n = cr.doors[s].neighbor;
        if (n && !cr.doors[s].closed && n.insideDeep(P.x, P.z)) { this.enterRoom(n); return; }
      }
      if (!cr.cleared && cr.entered) {
        const alive = this.enemies.filter((e) => !e.dead).length;
        if (cr.pendingWaves > 0 && alive <= 1) {
          cr.pendingWaves--;
          this.spawner.spawnWave(this, cr, cr.waveSize || 3);
          this.hud.banner('¡OLEADA!', 'Más zombis salen del suelo', 2);
          VX.Audio.roar();
        } else if (alive === 0 && cr.pendingWaves <= 0) this.clearRoom(cr);
      }
    }

    enterRoom(r) {
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
      r.setDoor(r.entrance, true);
      VX.Audio.door();
      this.pickups.items = [];
      this.pickups.gold = this.pickups.gold.filter((g) => r.contains(g.x, g.z));
      this.npcs = [];
      this.enemies = [];
      this.gibs = this.gibs.filter((g) => r.contains(g.x, g.z));
      this.corpses = this.corpses.filter((c) => r.contains(c.body.x, c.body.z));
      this.decals = this.decals.filter((d) => r.contains(d.x, d.z));
      this.failChallenge(true);
      let zoneMsg = null;
      if ((r.zone || 0) !== this.zone) {
        this.zone = r.zone || 0;
        const Z = VX.ZONES[this.zone];
        zoneMsg = [Z.name, Z.sub];
      }
      if (r.type !== 'boss') { this.hud.hideBoss(); this.boss = null; }
      VX.Horde.reset();
      this.spawner.onEnter(this, r);
      // las salas siguientes se generan ya, detrás de puertas cerradas
      this.spawner.populateNeighbors(this, r);
      void prev;
      if (r.type === 'normal' || r.type === 'boss') {
        r.cleared = false;
        if (zoneMsg) this.hud.banner(zoneMsg[0], zoneMsg[1], 3.5);
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
      r.cleared = true;
      for (const s of r.exits) r.setDoor(s, false);
      if (!silent) {
        VX.Audio.door();
        const ch = this.completeChallenge();
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
        } else if (!ch) {
          this.hud.banner('SALA DESPEJADA', r.exits.length > 1 ? 'Elige tu camino' : 'La puerta se abre...');
        }
      }
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
      void z;
    }

    // ---------------- Manchas de sangre ----------------
    addDecal(x, y, z, axis, size, sign = 1) {
      if (this.decals.length > 420) this.decals.splice(0, 40);
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

    // Explosión: cráter en el escenario, daño a enemigos/cadáveres/jugador, fuego y humo
    explode(e) {
      const R = e.R, destr = e.destr || 1;
      this.world.damageSphere(e.x, e.y, e.z, R * 0.8, 220 * destr, this);
      this.weapon.explosions.push({ x: e.x, y: e.y, z: e.z, t: 0.35 });
      const reach = R + 0.8;
      this.dmgWeapon = e.weapon || null;
      for (const list of [this.enemies, this.corpses]) for (const en of list.slice()) {
        if (en.dead) continue;
        const d = Math.hypot(en.body.cx - e.x, en.body.cy - e.y, en.body.cz - e.z);
        if (d < reach) en.blast(e.x, e.y, e.z, R, e.dmg * (1 - d / reach) + 10, this);
      }
      this.dmgWeapon = null;
      const P = this.player;
      const dp = Math.hypot(P.x - e.x, P.y + 0.9 - e.y, P.z - e.z);
      if (dp < R && this.state === 'playing') P.damage(e.dmg * (e.selfK ?? 0.35) * (1 - dp / R), e.x, e.z, this);
      for (let i = 0; i < 40; i++) {
        const fire = i < 22;
        this.particles.spawn(e.x, e.y, e.z, M.rand(-6, 6), M.rand(1, 8), M.rand(-6, 6),
          fire ? 1 : 0.25, fire ? M.rand(0.4, 0.8) : 0.24, fire ? 0.1 : 0.24, M.rand(0.08, 0.2), M.rand(0.4, 1.4), fire ? 1 : 0, fire ? 1 : 0);
      }
      VX.Audio.slam(); VX.Audio.crumble();
      this.shake(Math.max(0.25, 0.9 - dp * 0.08));
    }

    // Trampas de púas: salen y se esconden; hieren a quien las pise (también a los zombis)
    spikeState(sp) {
      const t = (this.time + sp.phase) % 2.8;
      if (t > 1.8 && t < 2.6) return { up: 1, warn: 0 };
      if (t > 1.45 && t <= 1.8) return { up: 0, warn: 1 };
      return { up: 0, warn: 0 };
    }

    updateSpikes(dt) {
      const r = this.currentRoom;
      if (!r || !r.spikes.length) return;
      const P = this.player;
      for (const sp of r.spikes) {
        const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
        const inside = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
        if (sp.kind === 'lava' || sp.kind === 'acid') {
          const lava = sp.kind === 'lava';
          if (Math.random() < dt * 6) {
            const px = M.rand(x0, x1), pz = M.rand(z0, z1);
            if (lava) this.particles.spawn(px, 0.08, pz, M.rand(-0.3, 0.3), M.rand(1, 2.5), M.rand(-0.3, 0.3), 1, 0.45, 0.08, 0.04, M.rand(0.5, 1), 1, 1);
            else this.particles.spawn(px, 0.06, pz, 0, M.rand(0.3, 0.8), 0, 0.35, 0.95, 0.25, 0.05, 0.6, 0.6, 1);
          }
          if (this.state === 'playing' && inside(P.x, P.z, 0.15) && P.y < 0.3 && !P.dashT) {
            P.damage(lava ? 16 : 9, undefined, undefined, this);
            P.knock(0, 0, lava ? 5 : 0);
          }
          for (const e of this.enemies) {
            if (e.dead || e.isBoss || !inside(e.x, e.z) || e.y > 0.3) continue;
            e.hp -= (lava ? 40 : 22) * dt; e.body.flash = 0.4;
            if (lava) e.burn = Math.max(e.burn || 0, 1.5);
            if (e.hp <= 0) e.die([0, 1, 0], this);
          }
          continue;
        }
        const st = this.spikeState(sp);
        if (!st.up) continue;
        if (this.state === 'playing' && inside(P.x, P.z, 0.2) && P.y < 0.4) P.damage(14, P.x, P.z + 0.01, this);
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
        if (sp.kind === 'lava' || sp.kind === 'acid') { this.renderPool(b, r, sp); continue; }
        const st = this.spikeState(sp);
        const t = (this.time + sp.phase) % 2.8;
        let h = 0.05;
        if (st.warn) h = 0.07 + Math.sin(this.time * 60) * 0.02;
        if (st.up) h = Math.min(0.42, 0.05 + (t - 1.8) * 6);
        const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
        b.box((x0 + x1) / 2, 0.015, (z0 + z1) / 2, x1 - x0, 0.03, z1 - z0, 0.13, 0.12, 0.13, 0);
        for (let x = x0 + 0.125; x < x1; x += 0.25)
          for (let z = z0 + 0.125; z < z1; z += 0.25) {
            b.box(x, h / 2, z, 0.07, h, 0.07, 0.55, 0.55, 0.6, 0);
            if (st.up) b.box(x, h - 0.03, z, 0.035, 0.06, 0.035, 0.75, 0.1, 0.1, 0);
          }
      }
    }

    // charco de lava o ácido: superficie de vóxeles que burbujea
    renderPool(b, r, sp) {
      const lava = sp.kind === 'lava';
      const x0 = r.uX(sp.ux0), x1 = r.uX(sp.ux1 + 1), z0 = r.uZ(sp.uz0), z1 = r.uZ(sp.uz1 + 1);
      const t = this.time;
      // borde oscuro
      b.box((x0 + x1) / 2, 0.01, (z0 + z1) / 2, x1 - x0 + 0.1, 0.02, z1 - z0 + 0.1, 0.06, 0.05, 0.05, 0);
      for (let x = x0 + 0.125; x < x1; x += 0.25)
        for (let z = z0 + 0.125; z < z1; z += 0.25) {
          const n = Math.sin(x * 3.1 + t * 1.3) * 0.5 + Math.sin(z * 2.7 - t * 1.7) * 0.5;
          const h = 0.035 + n * 0.012;
          const k = 0.75 + n * 0.25;
          if (lava) b.box(x, h / 2, z, 0.25, h, 0.25, 1.0 * k, 0.32 * k * k, 0.04, 0.9 + n * 0.1);
          else b.box(x, h / 2, z, 0.25, h, 0.25, 0.25 * k, 0.85 * k, 0.2 * k, 0.55 + n * 0.15);
        }
    }

    addCorpse(c) {
      this.corpses.push(c);
      if (this.corpses.length > 14) this.corpses[0].life = Math.min(this.corpses[0].life, 1.5);
    }

    musicMode() {
      if (this.state === 'title') return 'title';
      if (this.state === 'dying' || this.state === 'dead') return 'death';
      const r = this.currentRoom;
      if (!r) return 'explore';
      if (this.boss && !this.boss.dead) return 'boss';
      if (this.enemies.some((e) => !e.dead)) return 'combat';
      if (r.type === 'shop') return 'shop';
      if (r.type === 'save') return 'save';
      return 'explore';
    }

    // ---------------- Actualización ----------------
    update(dt) {
      this.frame++;
      this.time += dt;
      this.frameDt = dt;
      VX.Music.setMode(this.musicMode());

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
      if (this.state === 'paused' || this.state === 'settings') return;

      const P = this.player;
      if (this.state === 'playing') {
        P.update(dt, this);
        this.weapon.update(dt, this);
        this.roomLogic();
        this.updateChallenge(dt);
        // maldición de sangre: pierdes vida mientras haya enemigos vivos
        if (this.weapon.mods.bleed && P.hp > 1 && this.enemies.some((e) => !e.dead)) P.hp = Math.max(1, P.hp - dt * 1.2);
        // gemidos lejanos de ambiente
        if (Math.random() < dt * 0.06 && VX.Audio.groanAt) {
          const a = Math.random() * Math.PI * 2;
          VX.Audio.groanAt(P.x + Math.cos(a) * 14, P.z + Math.sin(a) * 14, P, Math.random() < 0.2);
        }
      } else if (this.state === 'dying') {
        P.eyeOffset = M.lerp(P.eyeOffset, -1.35, Math.min(1, dt * 3));
        this.deathT -= dt;
        if (this.deathT <= 0) {
          this.state = 'dead';
          VX.Input.unlock();
          VX.Menus.showGameOver(this.stats, this.floor, this.essenceGain);
          this.hud.show(false);
        }
      }

      if (this.currentRoom) this.world.updateFlow(this.currentRoom, P.x, P.z, dt);

      VX.Horde.update(this, dt);
      for (const e of this.enemies) if (!e.dead) e.update(dt, this);
      VX.Horde.separate(this);
      if (this.frame % 30 === 0 && this.enemies.length) this.enemies = this.enemies.filter((e) => !e.dead || e === this.boss);

      for (const c of this.corpses) c.update(dt, this);
      this.corpses = this.corpses.filter((c) => c.life > 0);
      for (const g of this.gibs) g.update(dt, this.world);
      this.gibs = this.gibs.filter((g) => g.life > 0);
      if (this.gibs.length > 70) this.gibs.splice(0, this.gibs.length - 70);

      this.updateProjectiles(dt);
      this.bullets.update(dt, this);
      this.updateSpikes(dt);
      for (const e of this.pendingExplosions) { e.delay -= dt; if (e.delay <= 0) { e.done = true; this.explode(e); } }
      this.pendingExplosions = this.pendingExplosions.filter((e) => !e.done);
      this.updateShockwaves(dt);
      if (this.state === 'playing') this.pickups.update(dt, this);

      for (const n of this.npcs) {
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
      this.hud.update(dt, this);
    }

    updateProjectiles(dt) {
      const P = this.player;
      for (const p of this.projectiles) {
        p.vy -= 18 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.rot += dt * 6; p.life -= dt;
        if (Math.random() < 0.5) this.particles.spawn(p.x, p.y, p.z, 0, 0.5, 0, p.col[0] * 0.7, p.col[1] * 0.7, p.col[2] * 0.7, p.acid ? 0.04 : 0.07, 0.5, p.glow, 1);
        const dp = Math.hypot(P.x - p.x, P.y + 0.9 - p.y, P.z - p.z);
        if (p.y < 0.1 || p.life <= 0 || dp < (p.acid ? 0.6 : 0.9) || this.world.isSolidAt(p.x, p.y, p.z)) {
          p.dead = true;
          const br = p.blastR ?? 1.1;
          this.world.damageSphere(p.x, p.y, p.z, br, p.blockDmg ?? 120, this);
          const reach = p.acid ? 1.2 : 2.6;
          if (dp < reach && this.state === 'playing') P.damage(p.dmg * (p.acid ? 1 : (1 - dp / 3.5)), p.x, p.z, this);
          for (let i = 0; i < (p.acid ? 16 : 26); i++)
            this.particles.spawn(p.x, p.y, p.z, M.rand(-4, 4), M.rand(1, 5), M.rand(-4, 4), p.col[0], p.col[1], p.col[2], M.rand(0.03, p.acid ? 0.07 : 0.14), M.rand(1, 2.5), p.glow);
          if (p.acid) VX.Audio.flesh(); else { VX.Audio.slam(); this.shake(0.3); }
        }
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead);
    }

    updateShockwaves(dt) {
      const P = this.player;
      for (const s of this.shockwaves) {
        s.r += s.speed * dt;
        if (s.r < 0) continue;
        const d = Math.hypot(P.x - s.x, P.z - s.z);
        if (!s.hit && Math.abs(d - s.r) < 0.55 && P.onGround && this.state === 'playing') {
          s.hit = true;
          P.damage(s.dmg, s.x, s.z, this);
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
    gatherLights(cam, rooms) {
      const L = this.lights;
      L.length = 0;
      this.world.collectLights(L, this.time, rooms);
      for (const it of this.pickups.items)
        L.push({ x: it.x, y: it.y + 0.6, z: it.z, r: 3.5, cr: it.color[0] * 1.2, cg: it.color[1] * 1.2, cb: it.color[2] * 1.2 });
      for (const p of this.projectiles) if (p.glow) L.push({ x: p.x, y: p.y, z: p.z, r: p.acid ? 3 : 5, cr: p.col[0] * 1.5, cg: p.col[1] * 1.5, cb: p.col[2] * 1.5 });
      for (const s of this.shockwaves) if (s.r > 0) L.push({ x: s.x, y: (s.y || 0) + 0.5, z: s.z, r: s.r + 3, cr: 1.5, cg: 0.6, cb: 0.15 });
      this.bullets.lights(L, cam);
      for (const e of this.weapon.explosions) { const k = e.t / 0.35; L.push({ x: e.x, y: e.y + 0.3, z: e.z, r: 10, cr: 6 * k, cg: 3.5 * k, cb: 1 * k }); }
      for (const sg of this.doorSigns()) {
        const pulse = sg.type === 'boss' ? 0.7 + Math.sin(this.time * 5) * 0.3 : 1;
        L.push({ x: sg.x + sg.nx * 0.4, y: 3.2, z: sg.z + sg.nz * 0.4, r: 3.5, cr: sg.c[0] * 0.9 * pulse, cg: sg.c[1] * 0.9 * pulse, cb: sg.c[2] * 0.9 * pulse });
      }
      // ordenar por distancia; las que rondan el límite se atenúan poco a poco (sin "popping")
      for (const l of L) l.d = Math.sqrt((l.x - cam.x) ** 2 + (l.y - cam.y) ** 2 + (l.z - cam.z) ** 2);
      L.sort((a, b) => a.d - b.d);
      const N = VX.MAX_LIGHTS - 2;
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
      out.push({ x: cam.x, y: cam.y + 0.2, z: cam.z, r: 4.5, cr: 0.16, cg: 0.15, cb: 0.18 });
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

    // ---------------- Render ----------------
    render() {
      const R = VX.Renderer, P = this.player;
      const sh = this.shakeAmt * this.shakeAmt * 0.25;
      const cam = {
        x: P.eyeX() + M.rand(-sh, sh), y: P.eyeY() + M.rand(-sh, sh), z: P.eyeZ() + M.rand(-sh, sh),
        yaw: P.yaw, pitch: P.pitch + P.recoilPitch,
      };

      this.world.updateMeshes(R, this.currentRoom);
      const vis = this.world.visibleRooms(this.state === 'title' ? null : this.currentRoom);

      // ---- lote dinámico ----
      const b = this.dyn;
      b.clear();
      for (const e of this.enemies) if (!e.dead) e.render(b);
      for (const c of this.corpses) c.render(b);
      for (const g of this.gibs) g.render(b);
      this.renderSigns(b);
      for (const n of this.npcs) n.body.render(b);
      this.particles.render(b);
      this.pickups.render(b);
      this.weapon.renderTracers(b);
      this.bullets.render(b, this.time);
      this.world.renderTorches(b, this.time, vis);
      this.renderSpikes(b, vis);
      this.renderDecals(b);
      for (const p of this.projectiles) {
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
      b.upload();

      // ---- linterna (sombras) ----
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
      const fwd = [sy * cp, sp, cy * cp], right = [-cy, 0, sy], up = [-sy * sp, cp, -cy * sp];
      const sway = Math.sin(this.time * 1.3) * 0.01;
      const spot = {
        x: cam.x + right[0] * 0.2 - up[0] * 0.15, y: cam.y - up[1] * 0.15, z: cam.z + right[2] * 0.2 - up[2] * 0.15,
        dx: fwd[0] + right[0] * sway, dy: fwd[1] + 0.01, dz: fwd[2] + right[2] * sway,
        fov: 1.25, inner: 0.22, outer: 0.52, cr: 3.2, cg: 3.0, cb: 2.6,
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
      const zt = VX.ZONES[this.zone].tint;
      const ambient = this.state === 'title' ? [0.06, 0.06, 0.08] : [0.05 * zt[0], 0.048 * zt[1], 0.065 * zt[2]];
      R.beginScene(cam, { lights, spot, ambient });
      this.world.render(R, this.currentRoom);
      b.draw();

      if (this.state === 'playing' || this.state === 'paused' || this.state === 'settings') {
        R.beginViewmodel(this.weapon.flash, [0.18, 0.17, 0.2]);
        this.gun.clear();
        this.weapon.renderViewmodel(this.gun, this);
        this.gun.upload();
        this.gun.draw();
      } else if (this.showcase) {
        // vitrina de la Armería: el arma gira en el centro de la pantalla
        const sc = this.showcase;
        R.beginViewmodel(0, [0.35, 0.33, 0.38]);
        this.gun.clear();
        const q = M.qMul(M.qMul(M.qY(this.time * 0.6), M.qX(0.2)), M.qZ(0.1));
        this.weapon.renderViewmodel(this.gun, this, sc.id, { x: 0.08, y: 0.0, z: -0.75, q, size: 0.42, noHand: true }, sc.skin);
        this.gun.upload();
        this.gun.draw();
      }
    }
  }

  VX.Game = Game;
})();
