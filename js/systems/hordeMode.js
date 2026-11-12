// Modo Horda: oleadas infinitas en un mapa grande y abierto.
// - Antes de cada oleada se avisa de cuántos zombis vienen; salen por las alcantarillas
//   y las barricadas, lejos de ti, y nunca hay más de unos cuantos a la vez.
// - La munición NO es infinita: los enemigos sueltan cajas de balas al azar (más cuando
//   vas justo) y hay cajas de suministros repartidas por los edificios.
// - Cada 3 oleadas llega un vendedor (mejoras, botiquín y munición completa) y se marcha
//   cuando empieza la siguiente oleada. Cada 5, un campeón; cada 10, un jefe.
(function () {
  const M = VX.M;

  const MAPS = [
    { id: 'ciudad', name: 'Ciudad nocturna', zone: 6, create: () => VX.City.create(),
      desc: 'Una gran plaza con fuente, rascacielos y tiendas a pie de calle. Rompe escaparates y persianas para entrar en los edificios, o métete en el autobús.' },
    { id: 'coliseo', name: 'Coliseo', zone: 7, create: () => VX.Coliseum.create(),
      desc: 'Empiezas en el centro de la arena. Sube al podio y a las gradas, a las ruinas del templo o al palco imperial. Salen por las puertas y las trampillas.' },
  ];
  const BOSS_ROT = ['coloso', 'capataz', 'carnicero', 'ancestro', 'reina'];
  const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

  const H = {
    MAPS,

    begin(game, map) {
      this.map = map;
      this.room = game.currentRoom;
      this.wave = 0;
      this.phase = 'prep';
      this.timer = 14;
      this.total = 0; this.spawned = 0; this.killed = 0;
      this.spawnT = 0;
      this.merchant = null;
      this.lastSpot = -1;
      this.supplies = [];
      this.straggleT = 0;
      this.flameT = 0;
      for (let i = 0; i < 4; i++) this.addSupply(game, true);
      game.floor = 1;
      game.hud.banner(map.name.toUpperCase(), `Prepárate: la primera oleada llega en ${Math.round(this.timer)} s  ·  [G] llamarla ya`, 4);
    },

    // nivel de dificultad (equivale al «piso» de la mazmorra)
    levelFor(n) { return Math.round(1 + n * 1.1); },
    totalFor(n) { return Math.round(8 + n * 3.5 + Math.pow(n, 1.35)); },
    maxAlive(n) { return Math.min(8 + n, 22); },

    alive(game) { return game.enemies.filter((e) => !e.dead).length + game.rises.length; },

    update(game, dt) {
      const P = game.player;
      // humo y llamas de los coches quemados y los bidones
      this.flameT -= dt;
      if (this.flameT <= 0) {
        this.flameT = 0.05;
        for (const f of this.room.features) {
          if (f.kind === 'fountain' && Math.hypot(f.x - P.x, f.z - P.z) < 45) {
            // chorros de la fuente cayendo al estanque
            for (let k = 0; k < 3; k++) {
              const a = Math.random() * Math.PI * 2, sp = M.rand(1.2, 1.8);
              game.particles.spawn(f.x + Math.cos(a) * 1.7, f.y, f.z + Math.sin(a) * 1.7, Math.cos(a) * sp, M.rand(2.5, 3.5), Math.sin(a) * sp, 0.45, 0.6, 0.75, 0.035, 0.75, 0.15, 0);
            }
            continue;
          }
          if (f.kind !== 'flame' || Math.hypot(f.x - P.x, f.z - P.z) > 40) continue;
          const sm = f.small;
          game.particles.spawn(f.x + M.rand(-0.3, 0.3) * (sm ? 0.5 : 1.6), f.y + M.rand(0, 0.2), f.z + M.rand(-0.3, 0.3) * (sm ? 0.5 : 1.6), M.rand(-0.2, 0.2), M.rand(1, 2.4), M.rand(-0.2, 0.2), 1, M.rand(0.35, 0.7), 0.1, M.rand(0.03, 0.07), M.rand(0.35, 0.8), 1, 1);
          if (Math.random() < 0.3) game.particles.spawn(f.x, f.y + 0.8, f.z, M.rand(-0.2, 0.2), M.rand(0.6, 1.2), M.rand(-0.2, 0.2), 0.1, 0.1, 0.11, M.rand(0.06, 0.12), M.rand(2, 3.5), 0, 1);
        }
      }

      if (this.phase === 'prep' || this.phase === 'break') {
        this.timer -= dt;
        if (VX.Input.wasPressed('KeyG') && this.timer > 3) { this.timer = 3; game.hud.toast('¡Que vengan!'); }
        if (this.timer <= 0) this.startWave(game);
        return;
      }

      // --- oleada en curso ---
      const alive = this.alive(game);
      this.spawnT -= dt;
      if (this.spawned < this.total && alive < this.maxAlive(this.wave) && this.spawnT <= 0) {
        this.spawnT = M.rand(0.35, 0.9) * (this.wave < 3 ? 1.4 : 1);
        this.spawnOne(game);
      }
      // los rezagados: si quedan pocos y no aparecen, se acercan solos
      const bossAlive = game.boss && !game.boss.dead;
      if (this.spawned >= this.total && alive <= 3 && alive > 0 && !bossAlive) {
        this.straggleT += dt;
        if (this.straggleT > 20) {
          this.straggleT = 0;
          for (const e of game.enemies) {
            if (e.dead || Math.hypot(e.x - P.x, e.z - P.z) < 25) continue;
            const sp = this.pickSpawn(game, 14, 30);
            if (sp) { e.x = sp.x; e.z = sp.z; e.y = game.world.groundAt(sp.x, sp.z); e.spawnT = 0.6; }
          }
        }
      } else this.straggleT = 0;
      if (this.spawned >= this.total && alive === 0 && !bossAlive) this.endWave(game);
    },

    startWave(game) {
      this.wave++;
      const n = this.wave;
      this.phase = 'wave';
      this.total = this.totalFor(n);
      this.spawned = 0; this.killed = 0;
      this.spawnT = 1.2;
      this.straggleT = 0;
      game.floor = this.levelFor(n);
      this.eliteWave = n % 5 === 0 && n % 10 !== 0;
      this.bossWave = n % 10 === 0;
      this.championAt = this.eliteWave ? Math.floor(this.total * M.rand(0.3, 0.6)) : -1;
      this.dismissMerchant(game);
      let sub = `${this.total} zombis se acercan`;
      if (this.bossWave) sub += ' · ¡y un jefe!';
      else if (this.eliteWave) sub += ' · ¡con un campeón!';
      game.hud.banner(`OLEADA ${n}`, sub, 3.2);
      VX.Audio.roar(); game.shake(0.3);
      if (this.bossWave) {
        const sp = this.pickSpawn(game, 22, 50) || { x: 0, z: 0 };
        const kind = BOSS_ROT[(n / 10 - 1) % BOSS_ROT.length];
        const boss = new VX.Boss(sp.x, sp.z, game.floor, n / 10, kind);
        boss.y = game.world.groundAt(sp.x, sp.z);
        game.enemies.push(boss);
        game.boss = boss;
        game.hud.showBoss(boss);
      }
    },

    endWave(game) {
      const n = this.wave, P = game.player;
      this.phase = 'break';
      const merchant = n % 3 === 0;
      this.timer = merchant ? 45 : 20;
      const bonus = 6 + n * 2;
      game.stats.gold += bonus; game.stats.totalGold += bonus;
      game.hud.pulseGold && game.hud.pulseGold();
      P.heal(Math.round(P.maxHp * 0.12));
      VX.Profile.max && VX.Profile.max('hordeWave', n, game);
      // recompensa del jefe: mejora rara y un arma
      if (this.bossWave && game.boss) {
        const bx = game.boss.x, bz = game.boss.z;
        const rare = VX.Upgrades.random(1, game, [], 'rare')[0];
        if (rare) game.pickups.addItem({ kind: 'upgrade', up: rare, price: 0, x: bx, y: game.world.groundAt(bx, bz) + 0.3, z: bz, title: rare.name + ' ★ RARA', desc: rare.desc, color: rare.color, shape: rare.shape });
        const notOwned = VX.Weapons.GUNS.filter((id) => !game.weapon.has(id) && VX.Profile.weaponUnlocked(id));
        if (notOwned.length) {
          const gid = M.choice(notOwned), d = VX.Weapons.DEFS[gid];
          game.pickups.addItem({ kind: 'weapon', weapon: gid, price: 0, x: bx + 2, y: game.world.groundAt(bx + 2, bz) + 0.2, z: bz, title: d.name, desc: VX.weaponDesc(gid), color: [1, 0.85, 0.5], shape: 'star' });
        }
        game.pickups.dropAmmo(bx, game.boss.y + 1, bz, 3);
        game.hud.hideBoss();
        game.boss = null;
      }
      if (game.champion) { game.champion = null; game.hud.hideBoss(); }
      // reponer cajas de suministros
      const want = Math.min(4, 2 + Math.floor(n / 4));
      for (let i = this.supplies.filter((s) => !s.taken).length; i < want; i++) this.addSupply(game);
      VX.Audio.door();
      if (merchant) {
        const sp = this.spawnMerchant(game);
        game.hud.banner(`OLEADA ${n} SUPERADA`, `+${bonus} de oro · Ha llegado el vendedor (${sp ? sp.name : 'en la ciudad'}). Se irá en cuanto empiece la oleada ${n + 1}`, 4.5);
      } else {
        game.hud.banner(`OLEADA ${n} SUPERADA`, `+${bonus} de oro · Siguiente oleada en ${this.timer} s  ·  [G] llamarla ya`, 3.5);
      }
    },

    // Punto de aparición lejos del jugador (preferiblemente donde no te ve)
    pickSpawn(game, dMin = 16, dMax = 55) {
      const P = game.player, r = this.room;
      const ok = r.spawns.filter((s) => { const d = Math.hypot(s.x - P.x, s.z - P.z); return d >= dMin && d <= dMax; });
      if (ok.length) {
        const hidden = ok.filter((s) => !game.world.lineOfSight(P.x, P.y + 1.6, P.z, s.x, 1.2, s.z));
        const s = M.choice(hidden.length ? hidden : ok);
        return { x: s.x + M.rand(-0.8, 0.8), z: s.z + M.rand(-0.8, 0.8) };
      }
      return r.randomFreeCell(dMin, P.x, P.z);
    },

    spawnOne(game) {
      const sp = this.pickSpawn(game);
      if (!sp) return;
      const f = game.floor;
      const champion = this.spawned === this.championAt;
      let kind = game.spawner.pickKind(f, 6);
      if (champion && ['rat', 'exploder', 'mimic', 'archer', 'necro'].includes(kind)) kind = 'walker';
      const elite = !champion && Math.random() < game.spawner.difficulty(f).elite;
      let z;
      if (champion || elite) {
        const gy = game.world.groundAt(sp.x, sp.z);
        if (game.world.boxCollides(sp.x - 0.35, gy + 0.05, sp.z - 0.35, sp.x + 0.35, gy + 1.6, sp.z + 0.35)) return;
        z = new VX.Zombie(kind, sp.x, sp.z, f, { elite, champion, y: gy });
        game.enemies.push(z);
      } else z = game.spawner.spawnZombieNear(game, sp.x, sp.z, 1.2, kind);
      if (!z) return;
      this.spawned++;
      if (champion) { game.champion = z; game.hud.showBoss(z); game.hud.toast('¡Un campeón se acerca!'); }
      if (kind === 'rat') for (let k = 0; k < 2 && this.spawned < this.total; k++) if (game.spawner.spawnZombieNear(game, sp.x, sp.z, 1.5, 'rat')) this.spawned++;
    },

    onKill(game, z) {
      this.killed++;
      // munición: más probable cuanto menos te queda
      const fr = game.weapon.ammoFrac();
      const p = (z.champion ? 1 : z.elite ? 0.6 : 0.16) + (fr < 0.25 ? 0.22 : fr < 0.45 ? 0.1 : 0);
      if (Math.random() < p) game.pickups.dropAmmo(z.x, z.y + 0.8, z.z, z.champion ? 2.5 : z.elite ? 1.2 : 0.6);
      else if (Math.random() < 0.04) game.pickups.dropHeart(z.x, z.y + 0.8, z.z, 12);
    },

    // ---------- Cajas de suministros ----------
    addSupply(game, initial) {
      const r = this.room, P = game.player;
      const used = new Set(this.supplies.filter((s) => !s.taken).map((s) => s.spot));
      const free = r.chestSpots.map((s, i) => ({ s, i })).filter(({ s, i }) => !used.has(i) && (initial || Math.hypot(s.x - P.x, s.z - P.z) > 12));
      if (!free.length) return;
      const { s, i } = M.choice(free);
      const y = game.world.groundAt(s.x, s.z);
      const it = game.pickups.addItem({ kind: 'supply', spot: i, price: 0, x: s.x, y, z: s.z, rot: Math.random() * 6.28, title: 'Caja de suministros', desc: 'Munición, oro y a veces algo mejor', action: 'Abrir', color: [0.85, 0.75, 0.3], shape: 'chest' });
      this.supplies.push(it);
    },

    openSupply(game, it) {
      const n = Math.max(1, this.wave);
      VX.Audio.reward(); VX.Audio.reload();
      for (let i = 0; i < 26; i++) game.particles.spawn(it.x, it.y + 0.4, it.z, M.rand(-2, 2), M.rand(1, 4), M.rand(-2, 2), 0.9, 0.75, 0.3, 0.05, M.rand(0.5, 1.2), 1, 1);
      const got = game.weapon.addAmmo(1.6);
      game.pickups.dropGold(it.x, it.y + 0.5, it.z, 5 + n);
      let msg = got ? '+munición' : 'Munición al máximo';
      const roll = Math.random();
      if (roll < 0.33) {
        const up = VX.Upgrades.random(1, game, [], Math.random() < 0.2 ? 'rare' : 'normal')[0];
        if (up) { game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: it.x, y: it.y + 0.2, z: it.z, title: up.name + (up.rare ? ' ★ RARA' : ''), desc: up.desc, color: up.color, shape: up.shape }); msg += ' · ¡y una mejora!'; }
      } else if (roll < 0.5) { game.pickups.dropHeart(it.x, it.y + 0.6, it.z, 25); msg += ' · botiquín'; }
      game.hud.toast('Caja de suministros: ' + msg);
    },

    // ---------- Vendedor ----------
    spawnMerchant(game) {
      const r = this.room, P = game.player;
      const spots = r.merchantSpots;
      if (!spots.length) return null;
      let idx = M.randInt(0, spots.length - 1);
      if (idx === this.lastSpot && spots.length > 1) idx = (idx + 1) % spots.length;
      this.lastSpot = idx;
      const sp = spots[idx];
      const g = game.world.groundAt(sp.x, sp.z);
      const body = new VX.VoxelBody(VX.Models.vendor(), 1);
      body.x = sp.x; body.z = sp.z; body.y = g;
      body.yaw = Math.atan2(-sp.x, -sp.z);   // mira hacia el centro de la ciudad
      const npc = { body, t: 0, merchant: true };
      game.npcs.push(npc);
      const n = this.wave, fx = Math.sin(body.yaw), fz = Math.cos(body.yaw);
      const goods = [];
      goods.push({ kind: 'refill', price: 16 + n * 2, title: 'Munición completa', desc: 'Llena los cargadores y la reserva de todas tus armas', color: [0.9, 0.75, 0.3], shape: 'bullet' });
      goods.push({ kind: 'heal', amount: 50, price: 14 + n, title: 'Botiquín', desc: '+50 de vida', color: [1, 0.2, 0.25], shape: 'plus' });
      for (const up of VX.Upgrades.random(2, game, [], 'shop')) goods.push({ kind: 'upgrade', up, price: VX.Upgrades.price(game), title: up.name, desc: up.desc, color: up.color, shape: up.shape, onTake: (gm) => gm.stats.purchases++ });
      const notOwned = VX.Weapons.GUNS.filter((id) => !game.weapon.has(id) && VX.Profile.weaponUnlocked(id));
      if (notOwned.length && Math.random() < 0.65) {
        const gid = M.choice(notOwned), d = VX.Weapons.DEFS[gid];
        goods.push({ kind: 'weapon', weapon: gid, price: d.price + n * 2, title: d.name, desc: VX.weaponDesc(gid), color: [1, 0.85, 0.5], shape: 'star' });
      }
      goods.forEach((it, i) => {
        const a = (i - (goods.length - 1) / 2) * 0.55;
        const ca = Math.cos(a), sa = Math.sin(a);
        const dx = fx * ca + fz * sa, dz = -fx * sa + fz * ca;
        const x = sp.x + dx * 1.8, z = sp.z + dz * 1.8;
        game.pickups.addItem({ ...it, merchant: true, x, y: game.world.groundAt(x, z) + 0.3, z });
      });
      for (let i = 0; i < 40; i++) game.particles.spawn(sp.x, g + 1, sp.z, M.rand(-2, 2), M.rand(0, 3), M.rand(-2, 2), 0.9, 0.75, 0.3, 0.05, 1, 1, 1);
      VX.Audio.reward();
      this.merchant = { x: sp.x, z: sp.z, y: g, name: sp.name, npc };
      void P;
      return sp;
    },

    dismissMerchant(game) {
      if (!this.merchant) return;
      const m = this.merchant;
      game.npcs = game.npcs.filter((n) => n !== m.npc);
      game.pickups.items = game.pickups.items.filter((it) => !it.merchant);
      for (let i = 0; i < 30; i++) game.particles.spawn(m.x, m.y + 1, m.z, M.rand(-1.5, 1.5), M.rand(0.5, 3), M.rand(-1.5, 1.5), 0.6, 0.55, 0.5, 0.06, 1, 0, 1);
      this.merchant = null;
    },

    // ---------- HUD ----------
    arrowTo(game, x, z) {
      const P = game.player;
      let rel = Math.atan2(x - P.x, z - P.z) - P.yaw;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const k = ((Math.round(-rel / (Math.PI / 4)) % 8) + 8) % 8;
      return `${ARROWS[k]} ${Math.round(Math.hypot(x - P.x, z - P.z))} m`;
    },

    hudTop() { return this.wave ? `OLEADA ${this.wave}` : 'PREPÁRATE'; },

    hudSub(game) {
      if (this.phase !== 'wave') {
        let s = `Siguiente oleada en ${Math.max(0, Math.ceil(this.timer))} s · [G] ya`;
        if (this.merchant) s += ` · Vendedor ${this.arrowTo(game, this.merchant.x, this.merchant.z)}`;
        return s;
      }
      const left = this.total - this.spawned + this.alive(game);
      let s = `Quedan ${left} zombi${left === 1 ? '' : 's'}`;
      if (this.spawned >= this.total && left <= 3 && left > 0) {
        const P = game.player;
        let best = null, bd = 1e9;
        for (const e of game.enemies) if (!e.dead) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
        if (best && bd > 8) s += ` · ${this.arrowTo(game, best.x, best.z)}`;
      }
      return s;
    },

    // Columna de luz sobre el vendedor (se ve desde toda la ciudad) y pilotos de las torres
    render(b, game) {
      const t = game.time;
      if (this.merchant) {
        const m = this.merchant;
        for (let i = 0; i < 26; i++) {
          const y = m.y + 3 + i * 0.9, k = 0.55 + Math.sin(t * 3 - i * 0.4) * 0.25;
          b.box(m.x, y, m.z, 0.12, 0.85, 0.12, 1 * k, 0.8 * k, 0.35 * k, 1);
        }
      }
      const r = this.room;
      if (r && r.beacons) for (const be of r.beacons) {
        const on = Math.sin(t * 2.4 + be.x) > 0.2;
        if (on) b.box(be.x, be.y, be.z, 0.6, 0.6, 0.6, 1, 0.1, 0.05, 1);
      }
    },
  };

  VX.HordeMode = H;
})();
