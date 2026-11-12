// Oro, objetos de mejora y artículos de la tienda.
(function () {
  const M = VX.M;
  const tmp = [0, 0, 0];

  const SHAPES = {
    heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
    plus: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
    bullet: ['..X..', '.XXX.', '.XXX.', '.XXX.', '.XXX.'],
    bolt: ['...XX', '..XX.', '.XXXX', '..XX.', '.XX..'],
    arrow: ['..X..', '.XXX.', 'X.X.X', '..X..', '..X..'],
    star: ['X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'],
    boot: ['.XX..', '.XX..', '.XX..', '.XXXX', '.XXXX'],
    clock: ['.XXX.', 'X.X.X', 'X.XXX', 'X...X', '.XXX.'],
    multi: ['X...X', '.....', '..X..', '.....', 'X...X'],
    mag: ['XXXX.', 'XXXX.', '.XXX.', '.XXX.', '..XX.'],
    pierce: ['.....', '...X.', 'XXXXX', '...X.', '.....'],
    eye: ['.....', '.XXX.', 'XX.XX', '.XXX.', '.....'],
    crystal: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
    auto: ['XXXX.', 'XX...', 'XXXX.', 'XX...', 'XXXX.'],
    skull: ['.XXX.', 'XXXXX', 'X.X.X', 'XXXXX', '.X.X.'],
    coin: ['.XXX.', 'XX.XX', 'X.X.X', 'XX.XX', '.XXX.'],
  };
  // Precalcular offsets
  const SHAPE_VOX = {};
  for (const k in SHAPES) {
    const rows = SHAPES[k], out = [];
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === 'X') {
        out.push([i - 2, 2 - j, -0.5]); out.push([i - 2, 2 - j, 0.5]);
      }
    });
    SHAPE_VOX[k] = out;
  }

  class Pickups {
    constructor() { this.gold = []; this.items = []; this.focus = null; }

    clear() { this.gold = []; this.items = []; this.focus = null; }

    dropGold(x, y, z, n) {
      for (let i = 0; i < n; i++) {
        this.gold.push({
          x, y, z, vx: M.rand(-2.5, 2.5), vy: M.rand(3, 6), vz: M.rand(-2.5, 2.5),
          t: M.rand(0, 6), value: 1, delay: 0.5,
        });
      }
    }

    // item: { kind:'upgrade'|'heal', up?, price, x,y,z, title, desc, color, shape }
    addItem(item) {
      // bendición «Regateo» del Santuario
      if (item.price > 0 && VX.game && VX.game.priceMul) item.price = Math.max(1, Math.round(item.price * VX.game.priceMul));
      item.t = M.rand(0, 6);
      item.taken = false;
      this.items.push(item);
      return item;
    }

    update(dt, game) {
      const P = game.player;
      const ex = P.x, ey = P.y + 0.9, ez = P.z;
      // --- Oro ---
      for (let i = this.gold.length - 1; i >= 0; i--) {
        const g = this.gold[i];
        g.t += dt; g.delay -= dt;
        const dx = ex - g.x, dy = ey - g.y, dz = ez - g.z, d = Math.hypot(dx, dy, dz);
        if (g.delay <= 0 && d < 3.2 + game.player.magnet) {
          const pull = 14 / Math.max(d, 0.3);
          g.vx += (dx / d) * pull * dt * 6; g.vy += (dy / d) * pull * dt * 6; g.vz += (dz / d) * pull * dt * 6;
          g.vx *= 0.9; g.vy *= 0.9; g.vz *= 0.9;
        } else g.vy -= 18 * dt;
        const nx = g.x + g.vx * dt, nz = g.z + g.vz * dt;
        if (!game.world.isSolidAt(nx, g.y, g.z)) g.x = nx; else g.vx *= -0.5;
        if (!game.world.isSolidAt(g.x, g.y, nz)) g.z = nz; else g.vz *= -0.5;
        g.y += g.vy * dt;
        const gr = game.world.groundAt(g.x, g.z) + 0.05;
        if (g.y < gr && gr - g.y < 0.6) { g.y = gr; g.vy *= -0.4; g.vx *= 0.8; g.vz *= 0.8; }
        else if (g.y < 0.05) { g.y = 0.05; g.vy *= -0.4; }
        if (g.delay <= 0 && d < 0.7) {
          game.stats.gold += g.value; game.stats.totalGold += g.value;
          this.gold.splice(i, 1);
          VX.Audio.gold();
          game.hud.pulseGold();
        }
      }

      // --- Objetos ---
      this.focus = null;
      let best = 2.0;
      for (const it of this.items) {
        if (it.taken) continue;
        it.t += dt;
        const d = Math.hypot(it.x - P.x, it.z - P.z);
        if (d < best) { best = d; this.focus = it; }
      }
      if (this.focus && VX.Input.wasPressed('KeyE')) this.interact(this.focus, game);
      this.items = this.items.filter((i) => !i.taken);
    }

    interact(it, game) {
      if (it.kind === 'rest') {
        it.taken = true;
        game.player.heal(Math.round(game.player.maxHp * 0.35));
        VX.Audio.save();
        game.hud.banner('DESCANSAS', 'El cristal cierra tus heridas (+35% de vida)', 3);
        for (let i = 0; i < 40; i++)
          game.particles.spawn(it.x, it.y, it.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), 0.4, 0.9, 1, 0.05, M.rand(0.6, 1.4), 1);
        return;
      }
      if (it.price > game.stats.gold) {
        VX.Audio.deny();
        game.hud.toast('No tienes suficiente oro');
        return;
      }
      game.stats.gold -= it.price;
      it.taken = true;
      if (it.kind === 'offering') {
        VX.Profile.add('essence', it.essence);
        VX.Profile.save();
        game.essenceBanked = (game.essenceBanked || 0) + it.essence;
        VX.Audio.reward();
        game.hud.banner('OFRENDA ACEPTADA', `+${it.essence} de esencia (ya es tuya aunque caigas)`, 3);
      } else if (it.kind === 'weapon') {
        const r = game.weapon.giveWeapon(it.weapon);
        const name = VX.Weapons.DEFS[it.weapon].name;
        VX.Audio.upgrade();
        if (r === 'refill') game.hud.banner(name.toUpperCase(), 'Cargador lleno');
        else if (r === 'added') game.hud.banner('NUEVA ARMA: ' + name.toUpperCase(), 'Cambia de arma con 1·2·3, la rueda o Q');
        else game.hud.banner('NUEVA ARMA: ' + name.toUpperCase(), `Sustituye a: ${VX.Weapons.DEFS[r].name}`);
        if (it.onTake) it.onTake(game);
      } else if (it.kind === 'heal') {
        game.player.heal(it.amount);
        VX.Audio.buy();
        game.hud.toast(`+${it.amount} de vida`);
      } else {
        it.up.apply(game);
        game.upgradesTaken.push(it.up);
        game.weapon.accent = it.up.color.slice();
        if (it.price > 0) VX.Audio.buy();
        VX.Audio.upgrade();
        game.hud.banner(it.up.name.toUpperCase(), it.up.desc);
        game.hud.refreshUpgrades(game);
        if (it.onTake) it.onTake(game);
      }
      for (let i = 0; i < 24; i++)
        game.particles.spawn(it.x, it.y + 0.5, it.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), it.color[0], it.color[1], it.color[2], 0.07, M.rand(0.5, 1), 1);
    }

    render(batch) {
      // Monedas
      for (const g of this.gold) {
        const q = M.qY(g.t * 4);
        batch.rbox(g.x, g.y, g.z, 0.09, 0.09, 0.025, q, 1.0, 0.78, 0.15, 0.7);
      }
      // Objetos flotantes
      for (const it of this.items) {
        if (it.kind === 'weapon') { this.renderWeapon(batch, it); continue; }
        const vs = 0.06;
        const q = M.qY(it.t * 1.6);
        const by = it.y + 0.55 + Math.sin(it.t * 2.2) * 0.08;
        const vox = SHAPE_VOX[it.shape] || SHAPE_VOX.star;
        const c = it.color;
        for (const o of vox) {
          M.qRot(q, o[0] * vs, o[1] * vs, o[2] * vs, tmp);
          batch.rbox(it.x + tmp[0], by + tmp[1], it.z + tmp[2], vs, vs, vs, q, c[0], c[1], c[2], 0.55);
        }
        // halo orbitando
        for (let k = 0; k < 4; k++) {
          const a = it.t * 2 + k * Math.PI / 2;
          batch.box(it.x + Math.cos(a) * 0.4, by + Math.sin(it.t * 3 + k) * 0.15, it.z + Math.sin(a) * 0.4, 0.04, 0.04, 0.04, c[0], c[1], c[2], 1);
        }
      }
    }
  }

  // Arma expuesta sobre su pedestal, girando
  Pickups.prototype.renderWeapon = function (batch, it) {
    const model = VX.Weapons.coloredModel(it.weapon, VX.Profile.skinFor(it.weapon));
    const g = 0.022;
    const q = M.qMul(M.qY(it.t * 1.2), M.qZ(0.15));
    const by = it.y + 0.6 + Math.sin(it.t * 2) * 0.06;
    for (const v of model) {
      if (v.tag === 'hand' || v.tag === 'wrist' || v.tag === 'sleeve') continue;
      M.qRot(q, v.x * g, v.y * g, (v.z + 10) * g, tmp);
      batch.rbox(it.x + tmp[0], by + tmp[1], it.z + tmp[2], g, g, g, q, v.r, v.g, v.b, Math.max(v.e, 0.12));
    }
  };

  VX.Pickups = Pickups;
  VX.SHAPES = SHAPES;
  VX.SHAPE_VOX = SHAPE_VOX;
})();
