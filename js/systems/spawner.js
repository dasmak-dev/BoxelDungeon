// Decide qué salas hay detrás de cada salida y las puebla
// (enemigos, oleadas, tienda, recompensas, guardado, jefes). La dificultad crece con el piso.
(function () {
  const M = VX.M;

  // Información de cada tipo de sala (icono sobre la puerta y minimapa)
  VX.ROOM_TYPES = {
    normal: { label: 'Sala infestada', shape: 'skull', color: [0.95, 0.3, 0.22] },
    reward: { label: 'Recompensa', shape: 'star', color: [1, 0.85, 0.25] },
    shop: { label: 'Vendedor', shape: 'coin', color: [1, 0.7, 0.15] },
    save: { label: 'Fuente de almas', shape: 'crystal', color: [0.4, 0.9, 1] },
    map: { label: 'Sala del cartógrafo', shape: 'scroll', color: [0.55, 1, 0.55] },
    boss: { label: '¡JEFE!', shape: 'skull', color: [0.85, 0.25, 1] },
    start: { label: 'Entrada', shape: 'star', color: [1, 1, 1] },
  };

  function weaponDesc(id) {
    const d = VX.Weapons.DEFS[id];
    return ({ pistol: 'Fiable y precisa', smg: 'Automática, cargador de 30', shotgun: 'Devastadora a corta distancia', rifle: 'Atraviesa varios enemigos', launcher: 'Granadas que lo revientan todo', hammer: 'Derriba paredes y lanza a los zombis' }[id] || d.desc || d.name) + ` · daño ${Math.round(d.damage)}${d.pellets > 1 ? 'x' + d.pellets : ''}`;
  }
  VX.weaponDesc = weaponDesc;

  class Spawner {
    constructor() { this.reset(); }

    reset() {
      this.roomsSinceBoss = 0;
      this.shopBan = 0; this.vendorMem = null;
      this.nextBossIn = 0;
      this.bossCount = 0;          // jefes de bioma derrotados (o empezados)
      this.order = [0, ...M.shuffle([1, 2, 3, 4])];   // orden de los 5 biomas (siempre se empieza en la Cripta)
      this.loop = 0;               // vueltas completas (modo infinito)
      this.finalPending = false;   // toca el jefe final
      this.secret = null;          // { rooms } mientras estás en el bioma secreto
      this.roomsSinceSave = 0;
      this.roomsSinceMap = 99;
      this.history = [];
    }

    // Bioma en el que se generan las salas nuevas
    zoneNow() {
      if (this.secret) return 5;
      return this.order[this.bossCount % 5];
    }

    // Snapshot para guardar la partida

    // ¿Pueden aparecer puertas de jefe? El primero nunca antes del piso 10
    bossEligible(floor) {
      if (this.secret) return this.secret.rooms <= 0;
      if (this.finalPending) return true;
      if (floor < 10) return false;
      return this.bossCount === 0 || this.roomsSinceBoss >= 6;
    }

    // Lados de salida para una sala nueva
    planExits(entrance, type, single) {
      const fwd = VX.Room.OPP[entrance];
      if (type === 'shop') {
        // el mostrador ocupa el fondo: las salidas de la tienda van a los lados
        const sides = M.shuffle(['zp', 'zn', 'xp', 'xn'].filter((s) => s !== entrance && s !== fwd));
        return sides.slice(0, single ? 1 : M.randInt(1, 2));
      }
      if (single || type === 'boss') return [fwd];
      const sides = ['zp', 'zn', 'xp', 'xn'].filter((s) => s !== entrance);
      const r = Math.random();
      const k = r < 0.3 ? 1 : r < 0.78 ? 2 : 3;
      let pick = M.shuffle(sides.slice());
      if (Math.random() < 0.7 || this.bossSoon) pick = [fwd, ...pick.filter((s) => s !== fwd)];
      return pick.slice(0, k);
    }

    // Tipos de sala para varias salidas (sin repetir salas especiales)
    pickTypes(n, from) {
      const out = [];
      for (let i = 0; i < n; i++) {
        let t;
        for (let tries = 0; tries < 10; tries++) {
          const r = Math.random();
          t = r < 0.55 ? 'normal' : r < 0.73 ? 'reward' : r < 0.9 ? 'shop' : r < 0.955 ? 'save' : 'map';
          // las salas especiales no se repiten seguidas: si acabas de pasar por una
          // tienda, mejora, fuente o mapa, las siguientes puertas son de otro tipo
          if (t !== 'normal' && (out.includes(t) || from.type === t || (this.history || []).slice(-3).includes(t))) continue;
          if (t === 'map' && (this.roomsSinceMap || 99) < 9) continue;
          if (t === 'shop' && this.shopBan > 0) continue;   // el vendedor ha cerrado
          // la Fuente de almas es rara: nunca dos cerca (al menos 6 salas entre una y otra)
          if (t === 'save' && this.roomsSinceSave < 6) continue;
          break;
        }
        out.push(t);
      }
      // al menos una sala de combate si hay varias opciones (hay que ganarse las recompensas)
      if (n >= 2 && !out.includes('normal')) out[M.randInt(0, n - 1)] = 'normal';
      return out;
    }

    // Genera las salas vecinas de 'room' (tras sus puertas de salida)
    // mazmorra diaria: lo que se decide en una sala sale de la semilla del día y de esa sala
    dailyRun(game, room, k, fn) {
      if (!game.daily || this._dly) return fn();
      this._dly = true;
      try { return VX.Coop.seeded(VX.Daily.roomSeed(game, room.rid, k), fn); } finally { this._dly = false; }
    }

    populateNeighbors(game, room) {
      if (game.daily && !this._dly) return this.dailyRun(game, room, 'nb', () => this.populateNeighbors(game, room));
      const exits = room.exits;
      if (!exits.length) return;
      // mazmorra cooperativa: las salas nuevas las genera el anfitrión y manda la «receta» a los demás
      const coop = VX.Coop.active && game.mode === 'dungeon';
      if (coop && VX.Coop.isClient) { VX.Coop.applyNeighbors(game, room); return; }
      const recipes = coop ? [] : null;
      let types;
      if (room.type === 'boss') types = exits.map((_, i) => (i === 0 ? (this.shopBan > 0 ? 'reward' : 'shop') : i === 1 && this.roomsSinceSave >= 3 ? 'save' : 'reward'));
      else if (room.plannedTypes && room.plannedTypes.length === exits.length) types = room.plannedTypes.slice();   // ya decididos (mapa)
      else types = this.pickTypes(exits.length, room);
      // jefes: a partir del piso 10, alguna de las puertas puede llevar a uno (al azar)
      let pushBoss = false;
      if (!room.plannedTypes && room.type !== 'boss' && (room.bossNext || this.bossEligible(game.floor + 1))) {
        const forced = room.bossNext || this.secret || this.finalPending || this.roomsSinceBoss >= 14;
        const p = 0.28 + Math.max(0, this.roomsSinceBoss - 6) * 0.06;
        // el jefe va siempre tras la puerta del frente: las salas laterales tienen el fondo
        // limitado (para no pisar a sus vecinas) y la guarida quedaría pequeña.
        // Si no hay puerta al frente, el jefe espera a la siguiente sala.
        const fi = room.entrance ? exits.indexOf(VX.Room.OPP[room.entrance]) : 0;
        if (fi >= 0 && (types[fi] === 'normal' || forced) && (forced || Math.random() < p)) types[fi] = 'boss';
        else if (fi < 0 && forced) pushBoss = true;
      }
      const zone = this.zoneNow();
      this.bossSoon = this.bossEligible(game.floor + 2) && this.roomsSinceBoss >= 12;
      const lateralBoss = exits.some((s, i) => types[i] === 'boss' && (s === 'xp' || s === 'xn'));
      // puerta dorada (piso 2 en adelante): una salida lateral se cierra con llave de oro y detrás
      // hay una sala del tesoro o un vendedor raro
      let goldSide = null;
      if (game.mode === 'dungeon' && !this.secret && room.type !== 'boss' && game.floor >= 2 && exits.length >= 2 && Math.random() < 0.15) {
        const cand = exits.filter((s, i) => (s === 'xp' || s === 'xn') && types[i] !== 'boss' && types[i] !== 'shop' && types[i] !== 'save');
        if (cand.length) { goldSide = M.choice(cand); types[exits.indexOf(goldSide)] = 'reward'; }
      }
      // cada sala vecina se construye en su propio trabajo, repartidos en varios fotogramas (game.jobs):
      // así entrar en una sala no da un tirón. Al abrir una puerta se termina lo que falte.
      const job = (fn, k) => { const f = game.daily ? () => this.dailyRun(game, room, 'nb.' + (k || 'x'), fn) : fn; return game.jobs ? game.jobs.push({ tag: room, fn: f }) : f(); };
      exits.forEach((side, i) => job(() => {
        const t = types[i];
        const ent = VX.Room.OPP[side];
        const nexits = this.planExits(ent, t, t === 'boss');
        const nz = t === 'boss' && this.finalPending && !this.secret ? 5 : zone;
        const seed = (Math.random() * 2147483647) | 0;
        const tpl = VX.RoomPool.pick(t, nz);   // la plantilla se elige fuera: así la construcción gasta el mismo azar en todos los equipos
        const n = VX.Coop.withTemplate(tpl, () => VX.Coop.seeded(seed, () => game.world.addNeighbor(room, side, t, nexits, nz, { lateralBoss })));
        n.rid = (room.rid || 'S') + '.' + side;
        if (pushBoss && t === 'normal') n.bossNext = true;
        if (t === 'boss') n.bossKind = this.secret ? 'guardian' : this.finalPending ? 'corazon' : VX.ZONES[zone].boss;
        if (side === goldSide) this.goldDoor(room, side, n, Math.random() < 0.5 ? 'hoard' : 'rare');
        if (recipes) recipes.push({ gv: n.goldVault || null, side, t, ex: nexits, z: nz, lb: lateralBoss ? 1 : 0, seed, bn: n.bossNext ? 1 : 0, bk: n.bossKind || null, ev: n.event || null, tn: n.template && n.template.name });
        if (game.mapReveal > 0) this.planFor(game, n);
      }, side));
      if (recipes) job(() => VX.Coop.sendNeighbors(game, room, recipes));
    }

    // cierra esa puerta con llave de oro (la sala de detrás es un tesoro o un vendedor raro)
    goldDoor(room, side, n, kind) {
      n.goldVault = kind;
      room.doors[side].goldLock = true;
      room.setDoor(side, true);
    }

    // Decide ya los tipos de sala que habrá tras las puertas de 'n' (lo que muestra el mapa)
    planFor(game, n) {
      if (n.plannedTypes || !n.exits.length) return;
      let types = n.type === 'boss' ? n.exits.map((_, i) => (i === 0 ? 'shop' : 'reward')) : this.pickTypes(n.exits.length, n);
      if (n.type !== 'boss' && this.bossEligible(n.index + 1)) {
        const p = 0.28 + Math.max(0, this.roomsSinceBoss - 5) * 0.06;
        const fi = n.entrance ? n.exits.indexOf(VX.Room.OPP[n.entrance]) : 0;
        if (fi >= 0 && types[fi] === 'normal' && Math.random() < p) types[fi] = 'boss';
      }
      n.plannedTypes = types;
    }

    // Enemigos según el espacio libre de la sala: una sala pequeña no se llena de zombis.
    // La densidad sube con el piso (más apretados cuanto más bajas), con un tope.
    enemyCount(room, f) {
      const area = room.walkArea ? room.walkArea() : 400;
      const dens = (1 / 170) * (1 + f * 0.07);
      const ck = VX.Coop.dungeonK();   // mazmorra en cooperativo: más enemigos por sala (+45 % por compañero)
      const cap = Math.min(12, 3 + Math.floor(f * 0.45)) + ck * 4;
      return M.clamp(Math.round(area * dens * M.rand(0.85, 1.15) * (1 + 0.45 * ck)), 2 + ck, cap);
    }

    difficulty(f) {
      return {
        lo: 2 + Math.floor(f / 4),
        hi: Math.min(10, 3 + Math.floor(f * 0.6)),
        elite: f >= 5 ? Math.min(0.35, (f - 4) * 0.045) : 0,
        waves: f >= 5 ? Math.min(0.65, (f - 4) * 0.08) : 0,
      };
    }

    spawnWave(game, room, n) {
      const P = game.player;
      const D = this.difficulty(game.floor);
      for (let i = 0; i < n; i++) {
        const p = room.randomFreeCell(6, P.x, P.z);
        const elite = Math.random() < D.elite;
        let kind = this.pickKind(game.floor, room.zone || 0);
        // campeón: un enemigo enorme con nombre y barra de vida, desde el piso 6 (uno por sala)
        const champion = room.type === 'normal' && !room.hadChampion && game.floor >= 6 && Math.random() < Math.min(0.3, (game.floor - 5) * 0.035);
        if (champion) { room.hadChampion = true; if (['rat', 'exploder', 'mimic', 'archer', 'necro', 'revenant', 'knight', 'hydra'].includes(kind)) kind = 'walker'; }
        const z = new VX.Zombie(kind, p.x, p.z, game.floor, { elite, champion, y: game.world.groundAt(p.x, p.z) });
        game.enemies.push(z);
        if (champion) { game.champion = z; game.hud.showBoss(z); game.hud.toast('¡Un campeón ronda esta sala!'); }
        // las ratas vienen en manada
        if (kind === 'rat') for (let k = 0; k < (room.walkArea() > 380 ? 2 : 1); k++) this.spawnZombieNear(game, p.x, p.z, 1.5, 'rat');
        // los cuervos llegan en bandada
        if (kind === 'crow') for (let k = 0; k < 3; k++) this.spawnZombieNear(game, p.x, p.z, 1.5, 'crow');
      }
    }

    // Género de la tienda en los pedestales (también al tocar la campana: repone todo)
    fillShop(game, room, slots) {
      const PR = VX.Profile;
      const ups = VX.Upgrades.random(Math.max(2, slots.length), game, [], 'shop');
      // la tienda suele ofrecer un arma que no tengas (sólo las desbloqueadas en el Arsenal)
      const notOwned = VX.Weapons.GUNS.filter((id) => !game.weapon.has(id) && VX.Profile.weaponUnlocked(id));
      const gun = notOwned.length && Math.random() < 0.75 ? M.choice(notOwned) : null;
      const heal = [40, 60, 80][PR.shopUp('apothecary')];
      // género selecto: un altar con una mejora rara
      const rareAt = Math.random() < [0, 0.2, 0.35, 0.5][PR.shopUp('select')] ? M.choice(slots.map((_, i) => i).filter((i) => i > 0)) : -1;
      const made = [];
      const add = (it) => { const r = game.pickups.addItem(it); made.push(r); return r; };
      let ui = 0;
      slots.forEach((s, i) => {
        const P = { x: s.x, y: s.y, z: s.z };
        if (i === rareAt) {
          const up = VX.Upgrades.random(1, game, [], 'rare')[0];
          if (up) { add({ kind: 'upgrade', up, price: Math.round(VX.Upgrades.price(game) * 1.7), ...P, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape, onTake: (g) => g.stats.purchases++ }); return; }
        }
        const roll = Math.random();
        if (i === 2 && gun) {
          const d = VX.Weapons.DEFS[gun];
          add({ kind: 'weapon', weapon: gun, price: d.price + game.floor * 2, ...P, title: d.name, desc: weaponDesc(gun), color: [1, 0.85, 0.5], shape: 'star' });
        } else if ((i === 2 || (i > 2 && roll < 0.25)) && Math.random() < 0.6 && VX.Throw.attachItem(game.weapon, 0)) {
          const it = VX.Throw.attachItem(game.weapon, Math.round((26 + game.floor * 2) * (game.priceMul || 1)));
          add({ ...it, ...P, onTake: (g) => g.stats.purchases++ });
        } else if ((i === 1 || (i > 2 && roll < 0.5)) && Math.random() < 0.35 && VX.Throw.randomType(game.weapon)) {
          const t = VX.Throw.randomType(game.weapon);
          add({ ...VX.Throw.item(t, 2, Math.round(VX.Throw.TYPES[t].price * 1.6 + game.floor)), ...P });
        } else if (i === 0) {
          add({ kind: 'heal', amount: heal, price: 15 + game.floor + (heal - 40) / 4, ...P, title: heal > 40 ? 'Botiquín grande' : 'Botiquín', desc: `+${heal} de vida`, color: [1, 0.2, 0.25], shape: 'plus' });
        } else {
          const up = ups[ui++] || VX.Upgrades.random(1, game, [], 'shop')[0];
          if (up) add({ kind: 'upgrade', up, price: VX.Upgrades.price(game), ...P, title: up.name, desc: up.desc, color: up.color, shape: up.shape, onTake: (g) => g.stats.purchases++ });
        }
      });
      // rebajas: uno o dos altares a mitad de precio
      const nSale = PR.shopUp('sale');
      for (const it of M.shuffle(made.filter((x) => x.price > 0)).slice(0, nSale)) { it.price = Math.max(1, Math.round(it.price * 0.5)); it.title += ' · REBAJA'; it.sale = true; }
      for (const it of made) { it.shopRoom = room; it.basePrice = it.price; }
      return made;
    }

    // la campana: se lleva lo que no hayas comprado y pone género nuevo
    restockShop(game, room) {
      const slots = room.features.filter((f) => f.kind === 'shopSlot');
      for (const it of game.pickups.items) if (it.shopRoom === room && !it.taken && (it.kind === 'upgrade' || it.kind === 'weapon' || it.kind === 'heal' || it.kind === 'throw' || it.kind === 'attach')) {
        it.taken = true;
        for (let i = 0; i < 10; i++) game.particles.spawn(it.x, it.y, it.z, M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1), 1, 0.8, 0.3, 0.03, 0.6, 1, 1);
      }
      this.fillShop(game, room, slots);
      const sk = game.npcs.find((n) => n.isShopkeeper && n.room === room);
      if (sk) { sk.shownMul = 1; sk.applyPrices(game); sk.act = 'wave'; sk.actT = 1.5; }
    }

    // Contenido de las salas tranquilas: se crea al abrir la puerta (antes de entrar)
    prepare(game, room) {
      if (game.daily && !this._dly) return this.dailyRun(game, room, 'prep', () => this.prepare(game, room));
      if (room.prepared) return;
      room.prepared = true;
      switch (room.type) {
        case 'shop': {
          const slots = room.features.filter((f) => f.kind === 'shopSlot');
          const specials = room.features.filter((f) => f.kind === 'shopSpecial');
          // el pedestal tiene que estar: si algo lo ha borrado (un pasillo de puerta, un derrumbe), se rehace
          for (const s of [...slots, ...specials]) {
            const lx = Math.floor(s.x / VX.S) - room.ox, lz = Math.floor(s.z / VX.S) - room.oz;
            for (let x = lx - 2; x <= lx + 1; x++) for (let z = lz - 2; z <= lz + 1; z++) for (let y = 0; y < 4; y++)
              if (!room.get(x, y, z)) room.set(x, y, z, VX.Blocks.METAL);
          }
          const n0 = game.pickups.items.length;
          this.fillShop(game, room, slots);
          // altares especiales (mejoras de la tienda del Santuario)
          const PR = VX.Profile;
          for (const f of specials) {
            if (f.what === 'keys') {
              game.pickups.addItem({ kind: 'keyAltar', color3: 'gold', price: 0, x: f.x, y: f.y, z: f.z, title: 'Relicario de las llaves', desc: 'Mete una llave y gira: madera, plata y oro dan premios cada vez mejores (y a veces el gordo)', action: 'Meter una llave', color: [1, 0.78, 0.3], shape: 'key' });
            } else if (f.what === 'bell') {
              const uses = PR.shopUp('bell');
              game.pickups.addItem({ kind: 'restock', uses, price: 20 + game.floor * 2, x: f.x, y: f.y, z: f.z, title: 'Campana del vendedor', desc: `El vendedor repone todo el género (${uses} ${uses > 1 ? 'veces' : 'vez'})`, action: 'Tocar la campana', color: [0.95, 0.78, 0.3], shape: 'bell' });
            } else if (f.what === 'mystery') {
              game.pickups.addItem({ kind: 'mystery', price: 35 + game.floor * 2, x: f.x, y: f.y, z: f.z, title: 'Caja misteriosa', desc: 'Una mejora al azar: normal, rara… o maldita', action: 'Abrir', color: [0.7, 0.4, 1], shape: 'chest' });
            } else if (f.what === 'souls') {
              game.pickups.addItem({ kind: 'offering', essence: 5, again: true, price: 25, x: f.x, y: f.y, z: f.z, title: 'Altar de las almas', desc: '+5 de esencia (para siempre). Cada ofrenda cuesta más', action: 'Ofrendar', color: [0.75, 0.55, 1], shape: 'crystal' });
            }
          }
          for (const it of game.pickups.items.slice(n0)) { it.shopRoom = room; it.basePrice = it.price; }
          const v = room.features.find((f) => f.kind === 'vendor');
          if (v) {
            const sk = new VX.Shopkeeper(game, room, v.x, v.z);
            game.npcs.push(sk);
            if (sk.markup > 1) sk.applyPrices(game);
          }
          break;
        }
        case 'map': {
          const f = room.features.find((x) => x.kind === 'mapTable');
          game.pickups.addItem({ kind: 'map', price: 0, x: f.x, y: f.y, z: f.z, title: 'Mapa de la mazmorra', desc: 'Estúdialo para ver qué hay tras las próximas puertas (y las grietas)', action: 'Estudiar', color: [0.55, 1, 0.55], shape: 'scroll' });
          break;
        }
        case 'save': {
          const f = room.features.find((x) => x.kind === 'saveAltar');
          game.pickups.addItem({ kind: 'rest', price: 0, x: f.x, y: f.y, z: f.z, title: 'Cristal de almas', desc: 'Descansa y recupera un 35% de vida', action: 'Descansar', color: [0.4, 0.9, 1], shape: 'crystal' });
          const o = room.features.find((x) => x.kind === 'offering');
          if (o) {
            const ess = 3 + Math.floor(game.floor / 5);
            game.pickups.addItem({ kind: 'offering', essence: ess, price: Math.round((30 + game.floor * 3) / (game.priceMul || 1)), x: o.x, y: o.y, z: o.z,
              title: 'Ofrenda', desc: `Entrega oro y recibe ${ess} de esencia para el Santuario`, action: 'Ofrecer', color: [0.8, 0.55, 1], shape: 'coin' });
          }
          break;
        }
        case 'reward': {
          const f = room.features.find((x) => x.kind === 'reward');
          if (room.goldVault && f) { this.fillGoldVault(game, room, f); break; }
          // evento: cofre misterioso (a veces es un mímico)
          if (game.floor >= 3 && Math.random() < 0.25) {
            game.pickups.addItem({ kind: 'chest', mimic: Math.random() < 0.4, price: 0, x: f.x, y: f.y, z: f.z, title: 'Cofre misterioso', desc: 'Puede guardar una mejora rara… o morder', action: 'Abrir', color: [0.95, 0.7, 0.25], shape: 'chest' });
            room.event = 'chest';
            break;
          }
          const rr = Math.random();
          const kind = rr < 0.3 ? 'rare' : rr < 0.45 ? 'curse' : 'normal';
          // a veces el premio es un accesorio para el arma
          const ai = kind !== 'curse' && Math.random() < 0.2 ? VX.Throw.attachItem(game.weapon, 0) : null;
          if (ai) { game.pickups.addItem({ ...ai, x: f.x, y: f.y, z: f.z }); break; }
          const up = VX.Upgrades.random(1, game, [], kind)[0];
          const tag = up.rare ? ' ★ RARA' : up.curse ? ' ☠ MALDICIÓN' : '';
          game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: f.x, y: f.y, z: f.z, title: up.name + tag, desc: up.desc, color: up.color, shape: up.shape });
          break;
        }
      }
    }

    // tras una puerta dorada: montón de tesoro o un vendedor con género raro (más barato)
    fillGoldVault(game, room, f) {
      const PK = game.pickups;
      if (room.goldVault === 'hoard') {
        PK.dropGold(f.x, f.y + 0.6, f.z, M.randInt(45, 70));
        PK.dropHeart(f.x + 0.8, f.y + 0.5, f.z, 40);
        const up = VX.Upgrades.random(1, game, [], 'rare')[0];
        if (up) PK.addItem({ kind: 'upgrade', up, price: 0, x: f.x, y: f.y, z: f.z, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape });
        const ty = VX.Throw.randomType(game.weapon);
        if (ty) PK.addItem({ ...VX.Throw.item(ty, 2, 0), x: f.x - 1.2, y: f.y, z: f.z });
      } else {
        const ups = VX.Upgrades.random(2, game, [], 'rare');
        const price = Math.round(VX.Upgrades.price(game) * 1.1);
        ups.forEach((up, i) => { const it = PK.addItem({ kind: 'upgrade', up, price, x: f.x + (i ? 1.4 : -1.4), y: f.y, z: f.z, title: up.name + ' ★ RARA', desc: up.desc + ' (vendedor raro)', color: up.color, shape: up.shape, onTake: (g) => g.stats.purchases++ }); it.shopRoom = room; it.basePrice = price; });
        const notOwned = VX.Weapons.GUNS.filter((id) => !game.weapon.has(id) && VX.Profile.weaponUnlocked(id));
        if (notOwned.length) { const id = M.choice(notOwned), d = VX.Weapons.DEFS[id]; const it = PK.addItem({ kind: 'weapon', weapon: id, price: Math.round(d.price * 0.6), x: f.x, y: f.y, z: f.z, title: d.name + ' · REBAJA', desc: 'Del vendedor raro, a mitad de precio', color: [1, 0.85, 0.5], shape: 'star' }); it.shopRoom = room; it.basePrice = it.price; }
        else { const up = VX.Upgrades.random(1, game, [], 'rare')[0]; if (up) PK.addItem({ kind: 'upgrade', up, price: 0, x: f.x, y: f.y, z: f.z, title: up.name + ' ★ REGALO', desc: up.desc, color: up.color, shape: up.shape }); }
      }
    }

    onEnter(game, room) {
      if (game.daily && !this._dly) return this.dailyRun(game, room, 'enter', () => this.onEnter(game, room));
      const client = VX.Coop.isClient && game.mode === 'dungeon';   // cooperativo: los enemigos los pone el anfitrión
      this.roomsSinceSave = room.type === 'save' ? 0 : (this.roomsSinceSave || 0) + 1;
      this.roomsSinceMap = room.type === 'map' ? 0 : (this.roomsSinceMap || 99) + 1;
      if (this.shopBan > 0) this.shopBan--;
      (this.history || (this.history = [])).push(room.type);
      if (this.history.length > 6) this.history.shift();
      if (room.type === 'boss') this.roomsSinceBoss = 0;
      else { this.roomsSinceBoss++; if (this.secret && room.type === 'normal') this.secret.rooms--; }
      switch (client && (room.type === 'normal' || room.type === 'boss') ? 'none' : room.type) {
        case 'normal': {
          const D = this.difficulty(game.floor);
          const n = this.enemyCount(room, game.floor);
          // evento de sala: emboscada (vacía… hasta que no)
          const ev = Math.random();
          room.event = game.floor >= 3 && ev < 0.1 && !(room.template && room.template.event) ? 'ambush' : null;
          if (room.event === 'ambush') {
            room.ambushAt = game.time + 1.6;
            room.pendingWaves = 1 + (game.floor >= 10 ? 1 : 0);
            room.waveSize = Math.max(2, Math.round(n * 0.8));
            room.ambushN = n;
          } else {
            const big = room.template && room.template.event;   // sala grande de evento: más gente y más oleadas
            const nn = big ? Math.min(16, n + 4) : n;
            this.spawnWave(game, room, nn);
            room.pendingWaves = big ? 2 + (game.floor >= 8 ? 1 : 0) : Math.random() < D.waves ? (game.floor >= 12 && Math.random() < 0.4 ? 2 : 1) : 0;
            room.waveSize = Math.max(2, Math.round(nn * 0.7));
          }
          // tesoro de la cámara secreta: a veces una mejora rara
          if (false && room.secret) {   // (quitado: el cofre de la cámara ya da su mejora; antes salían dos)
            const up = VX.Upgrades.random(1, game, [], 'rare')[0];
            const sc = room.secret;
            if (up) game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: sc.x, y: sc.y + 0.75, z: sc.z, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape });
          }
          // reto opcional de la sala
          if (room.event !== 'ambush' && game.floor >= 1 && Math.random() < 0.32) {
            const type = M.choice(['nohit', 'time', 'knife']);
            // tiempo ajustado (0.51): según la vida que hay que quitar y lo grande que es la sala,
            // con poco margen (antes sobraba casi la mitad del tiempo y siempre se superaba)
            const hpSum = game.enemies.filter((e) => !e.dead).reduce((a, e) => a + Math.min(e.maxHp || 60, 400), 0);
            const dps = 55 + game.floor * 6;   // lo que un jugador normal quita por segundo en ese piso
            const travel = Math.sqrt(room.walkArea ? room.walkArea() : 400) * 0.35;
            const limit = 5 + hpSum / dps + travel + room.pendingWaves * (7 + (room.waveSize || 3) * 1.6);
            game.startChallenge(type, Math.max(10, Math.round(limit)));
          }
          break;
        }
        case 'boss': {
          const e = room.doors[room.entrance];
          const n = VX.Room.INWARD[room.entrance];
          const dist = (room.entrance === 'zn' || room.entrance === 'zp' ? room.D : room.W) * VX.S * 0.18;
          const x = room.centerX() + n[0] * dist, z = room.centerZ() + n[1] * dist;
          const kind = room.bossKind || VX.ZONES[room.zone || 0].boss;
          const num = this.bossCount + this.loop * 2;
          if (kind === 'corazon') { this.finalPending = false; this.loop++; room.finalBoss = true; }
          else if (kind === 'guardian') { this.secret = null; room.secretBoss = true; }
          else { this.bossCount++; if (this.bossCount % 5 === 0) this.finalPending = true; }
          const boss = new VX.Boss(x, z, game.floor, num, kind);
          boss.y = game.world.groundAt(x, z);
          boss.body.yaw = Math.atan2(-n[0], -n[1]);
          game.enemies.push(boss);
          game.boss = boss;
          game.hud.showBoss(boss);
          VX.Audio.roar();
          void e;
          break;
        }
        case 'shop': case 'save': case 'reward': case 'map': this.prepare(game, room); break;
      }
    }

    pickKind(floor, zone = 0) {
      const f = floor;
      const w = {
        // enemigos propios de cada bioma
        skeleton: (zone === 0 && f >= 2 ? 0.22 : 0) + (zone === 5 ? 0.1 : 0),
        rat: zone === 1 ? 0.22 : 0,
        miner: zone === 2 ? 0.24 : 0,
        ember: (zone === 3 ? 0.24 : 0) + (zone === 5 ? 0.08 : 0),
        sporeling: zone === 4 ? 0.24 : 0,
        archer: (zone === 0 || zone === 5) && f >= 3 ? 0.12 : f >= 8 ? 0.05 : 0,
        necro: f >= 5 && (zone === 0 || zone === 4 || zone === 5) ? 0.05 : f >= 10 ? 0.03 : 0,
        brute: Math.min(0.25, Math.max(0, (f - 2) * 0.03)),
        runner: Math.min(0.3, 0.1 + f * 0.02),
        spitter: f >= 3 ? Math.min(0.18, (f - 2) * 0.025) : 0,
        dog: f >= 2 ? Math.min(0.18, (f - 1) * 0.03) : 0,
        exploder: f >= 3 ? Math.min(0.12, (f - 2) * 0.025) : 0,
        shielder: f >= 4 ? Math.min(0.14, (f - 3) * 0.03) : 0,
        climber: f >= 4 ? Math.min(0.12, (f - 3) * 0.025) : 0,
        // nuevos
        crow: f >= 3 ? Math.min(0.07, (f - 2) * 0.015) : 0,
        bloater: f >= 4 ? Math.min(0.08, (f - 3) * 0.02) : 0,
        screamer: f >= 5 ? Math.min(0.05, (f - 4) * 0.012) : 0,
        riot: f >= 6 ? Math.min(0.09, (f - 5) * 0.02) : 0,
        // caballero negro (sólo cae si le rompes el corazón) y renacido (vuelve si no destrozas sus restos)
        // (más frecuentes desde la 0.35: aparecen antes y con más peso)
        // (desde la 0.39 salen más adelante: el caballero desde el piso 8 y el renacido desde el 6)
        knight: VX.game && VX.game.mode === 'horde' ? 0 : f >= 8 ? Math.min(0.12, 0.03 + (f - 8) * 0.015) * (zone === 0 || zone === 3 || zone === 5 ? 1.4 : 1) : 0,
        revenant: VX.game && VX.game.mode === 'horde' ? 0 : f >= 6 ? Math.min(0.16, 0.04 + (f - 6) * 0.02) * (zone === 0 || zone === 4 ? 1.3 : 1) : 0,
        hydra: VX.game && VX.game.mode === 'horde' ? 0 : f >= 7 ? Math.min(0.08, 0.03 + (f - 7) * 0.012) : 0,
      };
      // si los pesos suman más de lo que cabe, se reparten en proporción (antes los últimos de la
      // lista —antidisturbios, chillón, caballero, renacido…— no llegaban a salir en los pisos altos);
      // siempre queda al menos un 15 % de zombis normales
      let sum = 0; for (const k in w) sum += w[k];
      let r = Math.random() * Math.max(1, sum / 0.85);
      for (const k in w) { if (r < w[k]) return k; r -= w[k]; }
      return 'walker';
    }

    spawnZombieNear(game, x, z, radius, kind) {
      return this._spawnNear(game, x, z, radius, kind);
    }
    _spawnNear(game, x, z, radius, kind) {
      const room = game.currentRoom;
      const g0 = game.world.groundAt(x, z);
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, d = radius < 1.5 ? M.rand(0, radius) * (1 + i * 0.2) : M.rand(1.5, radius);
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (!room || !room.contains(px, pz)) continue;
        { const lx = Math.floor(px / VX.S) - room.ox, lz = Math.floor(pz / VX.S) - room.oz, w = room.getWalk(); if (!w[lz * room.W + lx]) continue; }   // sólo donde llega el jugador
        const gy = game.world.groundAt(px, pz);
        // nunca encima de un muro invisible ni de un tejado: a la altura del punto de aparición
        if (Math.abs(gy - g0) > 1.1) continue;
        if (!game.world.boxCollides(px - 0.35, gy + 0.05, pz - 0.35, px + 0.35, gy + 1.6, pz + 0.35)) {
          const zb = new VX.Zombie(kind, px, pz, game.floor, { y: gy });
          game.enemies.push(zb);
          return zb;
        }
      }
    }
  }

  VX.Spawner = Spawner;
})();
