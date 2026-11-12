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
    boss: { label: '¡JEFE!', shape: 'skull', color: [0.85, 0.25, 1] },
    start: { label: 'Entrada', shape: 'star', color: [1, 1, 1] },
  };

  function weaponDesc(id) {
    const d = VX.Weapons.DEFS[id];
    return { pistol: 'Fiable y precisa', smg: 'Automática, cargador de 30', shotgun: 'Devastadora a corta distancia', rifle: 'Atraviesa varios enemigos', launcher: 'Granadas que lo revientan todo' }[id] + ` · daño ${Math.round(d.damage)}${d.pellets > 1 ? 'x' + d.pellets : ''}`;
  }
  VX.weaponDesc = weaponDesc;

  class Spawner {
    constructor() { this.reset(); }

    reset() {
      this.roomsSinceBoss = 0;
      this.nextBossIn = M.randInt(4, 7);
      this.bossCount = 0;
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
      if (Math.random() < 0.7) pick = [fwd, ...pick.filter((s) => s !== fwd)];
      return pick.slice(0, k);
    }

    // Tipos de sala para varias salidas (sin repetir salas especiales)
    pickTypes(n, from) {
      const out = [];
      for (let i = 0; i < n; i++) {
        let t;
        for (let tries = 0; tries < 10; tries++) {
          const r = Math.random();
          t = r < 0.52 ? 'normal' : r < 0.7 ? 'reward' : r < 0.86 ? 'shop' : 'save';
          if (t !== 'normal' && (out.includes(t) || from.type === t)) continue;
          break;
        }
        out.push(t);
      }
      // al menos una sala de combate si hay varias opciones (hay que ganarse las recompensas)
      if (n >= 2 && !out.includes('normal')) out[M.randInt(0, n - 1)] = 'normal';
      return out;
    }

    // Genera las salas vecinas de 'room' (tras sus puertas de salida)
    populateNeighbors(game, room) {
      const exits = room.exits;
      if (!exits.length) return;
      let types;
      if (room.type === 'boss') types = exits.map(() => 'shop');
      else if (room.bossNext) types = exits.map(() => 'boss');
      else types = this.pickTypes(exits.length, room);
      exits.forEach((side, i) => {
        const t = types[i];
        const ent = VX.Room.OPP[side];
        // si la sala siguiente a ésta toca jefe, solo tendrá una salida
        const bossNext = t !== 'boss' && this.roomsSinceBoss + 1 >= this.nextBossIn;
        const nexits = this.planExits(ent, t, bossNext || t === 'boss');
        const n = game.world.addNeighbor(room, side, t, nexits, this.bossCount % VX.ZONES.length);
        n.bossNext = bossNext;
      });
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
        game.enemies.push(new VX.Zombie(this.pickKind(game.floor), p.x, p.z, game.floor, { elite, y: game.world.groundAt(p.x, p.z) }));
      }
    }

    onEnter(game, room) {
      if (room.type === 'boss') { this.roomsSinceBoss = 0; this.nextBossIn = M.randInt(4, 7); }
      else this.roomsSinceBoss++;
      switch (room.type) {
        case 'normal': {
          const D = this.difficulty(game.floor);
          const n = M.randInt(D.lo, Math.max(D.lo, D.hi));
          this.spawnWave(game, room, n);
          room.pendingWaves = Math.random() < D.waves ? (game.floor >= 12 && Math.random() < 0.4 ? 2 : 1) : 0;
          room.waveSize = Math.max(2, Math.round(n * 0.7));
          // reto opcional de la sala
          if (game.floor >= 1 && Math.random() < 0.32) {
            const type = M.choice(['nohit', 'time', 'knife']);
            game.startChallenge(type, Math.round(22 + n * 4 + room.pendingWaves * 14));
          }
          break;
        }
        case 'boss': {
          const e = room.doors[room.entrance];
          const n = VX.Room.INWARD[room.entrance];
          const dist = (room.entrance === 'zn' || room.entrance === 'zp' ? room.D : room.W) * VX.S * 0.18;
          const x = room.centerX() + n[0] * dist, z = room.centerZ() + n[1] * dist;
          const boss = new VX.Boss(x, z, game.floor, this.bossCount++, VX.ZONES[room.zone || 0].boss);
          boss.y = game.world.groundAt(x, z);
          boss.body.yaw = Math.atan2(-n[0], -n[1]);
          game.enemies.push(boss);
          game.boss = boss;
          game.hud.showBoss(boss);
          VX.Audio.roar();
          void e;
          break;
        }
        case 'shop': {
          const slots = room.features.filter((f) => f.kind === 'shopSlot');
          const ups = VX.Upgrades.random(2, game);
          // la tienda suele ofrecer un arma que no tengas
          // sólo armas desbloqueadas en el Arsenal del Santuario
          const notOwned = VX.Weapons.GUNS.filter((id) => !game.weapon.has(id) && VX.Profile.weaponUnlocked(id));
          const gun = notOwned.length && Math.random() < 0.75 ? M.choice(notOwned) : null;
          slots.forEach((s, i) => {
            if (i === 2 && gun) {
              const d = VX.Weapons.DEFS[gun];
              game.pickups.addItem({ kind: 'weapon', weapon: gun, price: d.price + game.floor * 2, x: s.x, y: s.y, z: s.z, title: d.name, desc: weaponDesc(gun), color: [1, 0.85, 0.5], shape: 'star' });
            } else if (i === 0) {
              game.pickups.addItem({ kind: 'heal', amount: 40, price: 15 + game.floor, x: s.x, y: s.y, z: s.z, title: 'Botiquín', desc: '+40 de vida', color: [1, 0.2, 0.25], shape: 'plus' });
            } else {
              const up = ups[i - 1];
              game.pickups.addItem({ kind: 'upgrade', up, price: VX.Upgrades.price(game), x: s.x, y: s.y, z: s.z, title: up.name, desc: up.desc, color: up.color, shape: up.shape, onTake: (g) => g.stats.purchases++ });
            }
          });
          const v = room.features.find((f) => f.kind === 'vendor');
          if (v) {
            const body = new VX.VoxelBody(VX.Models.vendor(), 1);
            body.x = v.x; body.z = v.z; body.yaw = Math.PI / 2; body.y = 0;
            game.npcs.push({ body, t: 0 });
          }
          break;
        }
        case 'save': {
          const f = room.features.find((x) => x.kind === 'saveAltar');
          game.pickups.addItem({ kind: 'rest', price: 0, x: f.x, y: f.y, z: f.z, title: 'Cristal de almas', desc: 'Descansa y recupera un 35% de vida', action: 'Descansar', color: [0.4, 0.9, 1], shape: 'crystal' });
          const o = room.features.find((x) => x.kind === 'offering');
          if (o) {
            const ess = 6 + Math.floor(game.floor / 3);
            game.pickups.addItem({ kind: 'offering', essence: ess, price: Math.round((22 + game.floor * 2) / (game.priceMul || 1)), x: o.x, y: o.y, z: o.z,
              title: 'Ofrenda', desc: `Entrega oro y recibe ${ess} de esencia para el Santuario`, action: 'Ofrecer', color: [0.8, 0.55, 1], shape: 'coin' });
          }
          break;
        }
        case 'reward': {
          const f = room.features.find((x) => x.kind === 'reward');
          const rr = Math.random();
          const kind = rr < 0.3 ? 'rare' : rr < 0.45 ? 'curse' : 'normal';
          const up = VX.Upgrades.random(1, game, [], kind)[0];
          const tag = up.rare ? ' ★ RARA' : up.curse ? ' ☠ MALDICIÓN' : '';
          game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: f.x, y: f.y, z: f.z, title: up.name + tag, desc: up.desc, color: up.color, shape: up.shape });
          break;
        }
      }
    }

    pickKind(floor) {
      const f = floor;
      const w = {
        brute: Math.min(0.25, Math.max(0, (f - 2) * 0.03)),
        runner: Math.min(0.3, 0.1 + f * 0.02),
        spitter: f >= 3 ? Math.min(0.18, (f - 2) * 0.025) : 0,
        dog: f >= 2 ? Math.min(0.18, (f - 1) * 0.03) : 0,
        exploder: f >= 3 ? Math.min(0.12, (f - 2) * 0.025) : 0,
        shielder: f >= 4 ? Math.min(0.14, (f - 3) * 0.03) : 0,
        climber: f >= 4 ? Math.min(0.12, (f - 3) * 0.025) : 0,
      };
      let r = Math.random();
      for (const k in w) { if (r < w[k]) return k; r -= w[k]; }
      return 'walker';
    }

    spawnZombieNear(game, x, z, radius, kind) {
      const room = game.currentRoom;
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2, d = M.rand(1.5, radius);
        const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (!room || !room.contains(px, pz)) continue;
        const gy = game.world.groundAt(px, pz);
        if (!game.world.boxCollides(px - 0.35, gy + 0.05, pz - 0.35, px + 0.35, gy + 1.6, pz + 0.35)) {
          game.enemies.push(new VX.Zombie(kind, px, pz, game.floor, { y: gy }));
          return;
        }
      }
    }
  }

  VX.Spawner = Spawner;
})();
