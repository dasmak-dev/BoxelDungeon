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
    scroll: ['XXXXX', 'X.X.X', 'XX.XX', 'X.X.X', 'XXXXX'],
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
    chest: ['.XXX.', 'XXXXX', 'XX.XX', 'XXXXX', 'XXXXX'],
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

    // Caja de munición (modo Horda): reparte balas a todas las armas
    dropAmmo(x, y, z, frac = 1) {
      this.gold.push({ x, y, z, vx: M.rand(-1.5, 1.5), vy: M.rand(3, 5), vz: M.rand(-1.5, 1.5), t: M.rand(0, 6), value: 0, ammo: frac, delay: 0.5 });
    }

    // Corazón pequeño (cura al recogerlo)
    dropHeart(x, y, z, amount = 10) {
      this.gold.push({ x, y, z, vx: M.rand(-1.5, 1.5), vy: M.rand(3, 5), vz: M.rand(-1.5, 1.5), t: 0, value: 0, heal: amount, delay: 0.5 });
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
        const homing = g.delay <= 0 && (g.homing || d < 3.6 + game.player.magnet);
        if (homing) {
          // atraída hacia el jugador: vuela directa (atraviesa lo que haya en medio, no se queda pegada en el aire)
          const pull = 14 / Math.max(d, 0.3);
          g.vx += (dx / d) * pull * dt * 6; g.vy += (dy / d) * pull * dt * 6; g.vz += (dz / d) * pull * dt * 6;
          g.vx *= 0.9; g.vy *= 0.9; g.vz *= 0.9;
          g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.rest = false;
        } else {
          if (!g.rest) g.vy -= 18 * dt;
          const nx = g.x + g.vx * dt, nz = g.z + g.vz * dt;
          if (!game.world.isSolidAt(nx, g.y, g.z)) g.x = nx; else g.vx *= -0.4;
          if (!game.world.isSolidAt(g.x, g.y, nz)) g.z = nz; else g.vz *= -0.4;
          g.y += g.vy * dt;
          const gr = game.world.groundAt(g.x, g.z) + (g.heal || g.ammo ? 0.05 : 0.015);
          if (g.y <= gr) {
            // cae al suelo (si quedó dentro de algo, sube a su superficie) y se queda quieta
            g.y = gr;
            if (Math.abs(g.vy) < 2.2) { g.vy = 0; g.vx *= 0.5; g.vz *= 0.5; if (Math.hypot(g.vx, g.vz) < 0.15) { g.rest = true; g.vx = g.vz = 0; } }
            else { g.vy *= -0.35; g.vx *= 0.7; g.vz *= 0.7; }
          } else if (g.rest && g.y > gr + 0.02) g.rest = false;   // lo de debajo se rompió: vuelve a caer
        }
        if (g.delay <= 0 && d < 0.7) {
          this.gold.splice(i, 1);
          if (g.heal) { game.player.heal(g.heal); VX.Audio.orb(); game.hud.toast(`+${g.heal} de vida`); continue; }
          if (g.ammo) {
            if (game.weapon.addAmmo(g.ammo)) { VX.Audio.reload(); game.hud.toast('+munición'); }
            else { VX.Audio.click(); game.hud.toast('Munición al máximo'); }
            continue;
          }
          game.stats.gold += g.value; game.stats.totalGold += g.value;
          if (game.weapon.mods.goldHeal) game.player.heal(1);
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
      if (it.kind === 'stairs') { it.taken = true; game.enterSecret(); return; }
      if (it.kind === 'secretChest') {
        it.taken = true;
        const p = it.prop, top = p.oy + p.h * VX.PV;
        VX.Audio.reward(); VX.Audio.door && VX.Audio.door();
        // la tapa salta por los aires
        p.blast(p.cx, top - 0.05, p.cz, 0.22, 25, game);
        for (let i = 0; i < 30; i++) game.particles.spawn(p.cx, top, p.cz, M.rand(-1.5, 1.5), M.rand(2, 5), M.rand(-1.5, 1.5), 1, 0.8, 0.3, 0.04, M.rand(0.6, 1.4), 1, 1);
        this.dropGold(p.cx, top + 0.2, p.cz, M.randInt(18, 28));
        this.dropHeart(p.cx, top + 0.3, p.cz, 25);
        const up = VX.Upgrades.random(1, game, [], Math.random() < 0.5 ? 'rare' : 'normal')[0];
        if (up) this.addItem({ kind: 'upgrade', up, price: 0, x: p.cx, y: top + 0.3, z: p.cz, title: up.name + (up.rare ? ' ★ RARA' : ''), desc: up.desc, color: up.color, shape: up.shape });
        game.hud.toast('¡Tesoro!');
        return;
      }
      if (it.kind === 'map') { it.taken = true; game.studyMap(); return; }
      if (it.kind === 'supply') { it.taken = true; VX.HordeMode.openSupply(game, it); return; }
      if (it.kind === 'chest') {
        it.taken = true;
        if (it.mimic) {
          // ¡era un mímico!
          VX.Audio.roar(); game.shake(0.5);
          const z = new VX.Zombie('mimic', it.x, it.z, game.floor, { y: game.world.groundAt(it.x, it.z) });
          z.spawnT = 0; game.enemies.push(z);
          const r = game.currentRoom; r.cleared = false; r.pendingWaves = 0;
          game.hud.banner('¡ERA UN MÍMICO!', 'Mátalo y escupirá su tesoro', 2.5);
        } else {
          VX.Audio.reward();
          const up = VX.Upgrades.random(1, game, [], Math.random() < 0.5 ? 'rare' : 'normal')[0];
          if (up) this.addItem({ kind: 'upgrade', up, price: 0, x: it.x, y: it.y + 0.2, z: it.z, title: up.name + (up.rare ? ' ★ RARA' : ''), desc: up.desc, color: up.color, shape: up.shape });
          game.pickups.dropGold(it.x, it.y + 0.5, it.z, 8 + game.floor);
          game.hud.banner('COFRE', 'Dentro había algo útil', 2);
        }
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
      } else if (it.kind === 'refill') {
        game.weapon.refillAll();
        VX.Audio.buy(); VX.Audio.reload();
        game.hud.banner('MUNICIÓN COMPLETA', 'Cargadores y reservas a tope', 2.2);
      } else if (it.kind === 'heal') {
        game.player.heal(it.amount);
        VX.Audio.buy();
        game.hud.toast(`+${it.amount} de vida`);
      } else {
        it.up.apply(game);
        VX.Profile.codexUp(it.up.id);
        game.upgradesTaken.push(it.up);
        VX.Upgrades.checkSynergies(game);
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
        if (g.heal) {
          // corazón de vóxeles
          const s = 0.035, by = g.y + 0.05 + Math.sin(g.t * 3) * 0.03;
          for (const [a, b] of [[-1, 1], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) {
            M.qRot(q, a * s, b * s, 0, tmp);
            batch.rbox(g.x + tmp[0], by + tmp[1], g.z + tmp[2], s, s, s, q, 1, 0.15, 0.2, 0.8);
          }
          continue;
        }
        if (g.ammo) {
          // caja de munición: verde oliva con las puntas de las balas asomando
          const by = g.y + 0.05 + Math.sin(g.t * 3) * 0.03;
          batch.rbox(g.x, by, g.z, 0.2, 0.13, 0.12, q, 0.24, 0.28, 0.14, 0.12);
          for (let k = -2; k <= 2; k++) { M.qRot(q, k * 0.035, 0.085, 0, tmp); batch.rbox(g.x + tmp[0], by + tmp[1], g.z + tmp[2], 0.025, 0.05, 0.025, q, 0.85, 0.65, 0.25, 0.5); }
          continue;
        }
        // moneda: disco octogonal con canto y relieve; gira en el aire y reposa plana en el suelo
        const cq = g.rest ? M.qMul(M.qY(g.spin || (g.spin = Math.random() * 6)), M.qX(Math.PI / 2)) : M.qMul(M.qY(g.t * 5), M.qX(g.t * 7));
        const cy = g.rest ? g.y + 0.014 : g.y;
        batch.rbox(g.x, cy, g.z, 0.17, 0.115, 0.028, cq, 0.95, 0.72, 0.14, 0.35);
        batch.rbox(g.x, cy, g.z, 0.115, 0.17, 0.028, cq, 0.95, 0.72, 0.14, 0.35);
        M.qRot(cq, 0, 0, 0.012, tmp);
        batch.rbox(g.x + tmp[0], cy + tmp[1], g.z + tmp[2], 0.075, 0.075, 0.012, cq, 0.75, 0.52, 0.08, 0.25);
        M.qRot(cq, 0, 0, -0.012, tmp);
        batch.rbox(g.x + tmp[0], cy + tmp[1], g.z + tmp[2], 0.075, 0.075, 0.012, cq, 0.75, 0.52, 0.08, 0.25);
      }
      // Objetos flotantes
      for (const it of this.items) {
        if (it.kind === 'weapon') { this.renderWeapon(batch, it); continue; }
        if (it.kind === 'supply') { this.renderSupply(batch, it); continue; }
        if (it.kind === 'secretChest') continue;   // se ve el propio cofre
        if (it.kind === 'stairs') {
          // foso con escalones de piedra que bajan hacia la pared y se pierden en la oscuridad
          const dx = it.dx, dz = it.dz, L = it.L || 1.6, Wd = it.Wd || 0.8, n = 7;
          const ax = dx !== 0 ? 0 : 1, az = dz !== 0 ? 0 : 1;
          const Pt = (t, a) => [it.fx - dx * t + ax * a, it.fz - dz * t + az * a];
          for (let i = 0; i < n; i++) {
            const t = L - (i + 0.5) * (L / n), top = -0.28 * (i + 1), k = 0.75 - i * 0.09;
            const [cx, cz] = Pt(t, 0), sl = L / n;
            batch.box(cx, top - 1.5, cz, dx ? sl : Wd * 2, 3, dz ? sl : Wd * 2, 0.3 * k, 0.28 * k, 0.3 * k, 0);
            const [ex, ez] = Pt(t + sl * 0.45, 0);
            batch.box(ex, top - 0.02, ez, dx ? 0.06 : Wd * 2, 0.04, dz ? 0.06 : Wd * 2, 0.42 * k, 0.4 * k, 0.42 * k, 0);   // borde del peldaño
          }
          // paredes del foso y fondo oscuro
          for (const sgn of [-1, 1]) { const [sx, sz] = Pt(L / 2, sgn * (Wd + 0.06)); batch.box(sx, -1.3, sz, dx ? L : 0.12, 2.6, dz ? L : 0.12, 0.16, 0.15, 0.17, 0); }
          { const [sx, sz] = Pt(L + 0.06, 0); batch.box(sx, -1.3, sz, dx ? 0.12 : Wd * 2, 2.6, dz ? 0.12 : Wd * 2, 0.16, 0.15, 0.17, 0); }
          { const [bx, bz] = Pt(-0.3, 0); batch.box(bx, -2.6, bz, dx ? 0.8 : Wd * 2, 0.1, dz ? 0.8 : Wd * 2, 0.01, 0.005, 0.015, 0); }
          // brocal alrededor y resplandor violeta que sube del fondo
          for (const sgn of [-1, 1]) { const [sx, sz] = Pt(L / 2, sgn * (Wd + 0.12)); batch.box(sx, 0.05, sz, dx ? L + 0.24 : 0.12, 0.1, dz ? L + 0.24 : 0.12, 0.35, 0.33, 0.36, 0); }
          { const [sx, sz] = Pt(L + 0.12, 0); batch.box(sx, 0.05, sz, dx ? 0.12 : Wd * 2 + 0.24, 0.1, dz ? 0.12 : Wd * 2 + 0.24, 0.35, 0.33, 0.36, 0); }
          const gl = 0.5 + Math.sin(it.t * 3) * 0.3;
          { const [gx, gz] = Pt(0.1, 0); batch.box(gx, -2.0, gz, 0.5, 0.05, 0.5, 0.6 * gl, 0.2 * gl, 1 * gl, 1); }
          if (Math.random() < 0.3 && VX.game) { const [px, pz] = Pt(M.rand(0, L * 0.5), M.rand(-Wd, Wd)); VX.game.particles.spawn(px, -1.2, pz, 0, M.rand(0.5, 1.2), 0, 0.7, 0.3, 1, 0.03, 1.5, 1, 1); }
          continue;
        }
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

  // Caja de suministros militar (verde, con cierres y la tapa marcada)
  Pickups.prototype.renderSupply = function (batch, it) {
    const s = 0.05, x0 = it.x, z0 = it.z, y0 = it.y;
    const q = M.qY(it.rot || 0);
    const P = (a, b, c, cr, cg, cb, e = 0) => { M.qRot(q, a * s, b * s, c * s, tmp); batch.rbox(x0 + tmp[0], y0 + tmp[1], z0 + tmp[2], s, s, s, q, cr, cg, cb, e); };
    for (let a = -7; a <= 7; a++) for (let c = -4; c <= 4; c++) for (let b = 0; b < 9; b++) {
      const edge = Math.abs(a) === 7 || Math.abs(c) === 4 || b === 0 || b === 8;
      if (!edge) continue;
      let cr = 0.2, cg = 0.25, cb = 0.12;
      if (b === 6) { cr = 0.12; cg = 0.14; cb = 0.08; }                       // junta de la tapa
      if ((Math.abs(a) === 5 || Math.abs(a) === 6) && (b === 5 || b === 6) && Math.abs(c) === 4) { cr = 0.5; cg = 0.48; cb = 0.42; }   // cierres
      if (b === 8 && Math.abs(a) <= 3 && c === 0) { cr = 0.75; cg = 0.6; cb = 0.15; }   // marca amarilla
      if (b === 8 && a === 0 && Math.abs(c) <= 2) { cr = 0.75; cg = 0.6; cb = 0.15; }
      P(a, b + 0.5, c, cr, cg, cb);
    }
    // resplandor para encontrarla en la oscuridad
    const gl = 0.4 + Math.sin(it.t * 3) * 0.25;
    for (let k = 0; k < 4; k++) {
      const a = it.t * 1.5 + k * Math.PI / 2;
      batch.box(x0 + Math.cos(a) * 0.55, y0 + 0.65 + Math.sin(it.t * 2 + k) * 0.1, z0 + Math.sin(a) * 0.55, 0.04, 0.04, 0.04, 1, 0.85, 0.35, gl);
    }
  };

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
