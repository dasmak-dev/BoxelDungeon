// Objetos arrojables (tecla propia, T por defecto; B cambia el elegido):
//   granada   rebota y explota a los 1,8 s
//   molotov   se rompe al tocar algo y deja un charco de fuego que quema a los zombis
//   señuelo   cae, pita y parpadea: los zombis cercanos van a por él unos segundos y luego revienta
// Se llevan en VX.game.weapon.throws (por partida) y vuelan en la lista de granadas del arma,
// así que el cooperativo los comparte igual que las del lanzagranadas.
(function () {
  const M = VX.M;

  const TYPES = {
    frag: { name: 'Granada', short: 'GRANADA', max: 4, desc: 'Rebota y explota a los 2 segundos', color: [0.45, 0.55, 0.3], shape: 'grenade', price: 14 },
    molotov: { name: 'Cóctel molotov', short: 'MOLOTOV', max: 4, desc: 'Se rompe y deja un charco de fuego', color: [1, 0.5, 0.15], shape: 'bottle', price: 12, unlock: { stat: 'secrets', n: 2, txt: 'Descubre 2 cámaras secretas' } },
    decoy: { name: 'Señuelo', short: 'SEÑUELO', max: 3, desc: 'Pita y atrae a los zombis cercanos; luego revienta', color: [1, 0.25, 0.2], shape: 'decoy', price: 12, unlock: { stat: 'vaults', n: 3, txt: 'Abre 3 puertas con llave' } },
  };
  const ORDER = ['frag', 'molotov', 'decoy'];

  const Throw = {
    TYPES, ORDER,
    decoys: [],

    reset() { this.decoys = []; },

    // añade objetos (respeta el máximo de cada uno). Devuelve cuántos cupieron
    give(game, type, n = 1, quiet) {
      const W = game.weapon, T = TYPES[type];
      if (!T) return 0;
      const before = W.throws[type] || 0, after = Math.min(T.max, before + n);
      W.throws[type] = after;
      if (after > before && !before && !(W.throws[W.throwSel] > 0)) W.throwSel = type;
      if (!quiet) {
        if (after > before) { VX.Audio.reload(); game.hud.toast(`+${after - before} ${T.name.toLowerCase()} (${after}/${T.max})`); }
        else game.hud.toast(`Ya llevas el máximo de ${T.name.toLowerCase()}s`);
      }
      return after - before;
    },

    // uno al azar, mejor de los que tengas menos
    unlocked(t) { return !VX.Profile.throwUnlocked || VX.Profile.throwUnlocked(t); },
    // sólo de los que ya tienes desbloqueados (la granada viene de serie)
    randomType(W) {
      const list = ORDER.filter((t) => this.unlocked(t));
      const w = list.map((t) => Math.max(0.15, 1 - (W.throws[t] || 0) / TYPES[t].max) * (t === 'frag' ? 1.2 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < list.length; i++) { if (r < w[i]) return list[i]; r -= w[i]; }
      return 'frag';
    },

    cycle(game) {
      const W = game.weapon;
      const have = ORDER.filter((t) => W.throws[t] > 0);
      const list = have.length ? have : ORDER.filter((t) => this.unlocked(t));
      const i = list.indexOf(W.throwSel);
      W.throwSel = list[(i + 1) % list.length];
      VX.Audio.click();
      game.hud.toast(`Lanzable: ${TYPES[W.throwSel].name} (${W.throws[W.throwSel] || 0})`);
    },

    toss(game) {
      const W = game.weapon, P = game.player;
      if (game.state !== 'playing' || P.hp <= 0 || W.throwCd > 0 || W.swingT > 0) return;
      let t = W.throwSel;
      if (!(W.throws[t] > 0)) t = ORDER.find((k) => W.throws[k] > 0);
      if (!t) { VX.Audio.empty(); game.hud.toast('No te quedan objetos para lanzar'); return; }
      W.throwSel = t;
      W.throws[t]--;
      W.throwCd = 0.7;
      W.switchT = Math.max(W.switchT, 0.3);   // el arma baja un momento mientras se lanza
      W.reloading = false;
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const fwd = [sy * cp, sp, cy * cp];
      const v = t === 'molotov' ? 15 : 13;
      const g = {
        type: t, x: P.x + fwd[0] * 0.5 - cy * 0.15, y: P.eyeY() - 0.15 + fwd[1] * 0.4, z: P.z + fwd[2] * 0.5 + sy * 0.15,
        vx: fwd[0] * v + P.vx * 0.6, vy: fwd[1] * v + 3.2, vz: fwd[2] * v + P.vz * 0.6,
        life: t === 'frag' ? 1.8 : t === 'decoy' ? 12 : 5, rot: 0, dmg: t === 'frag' ? 190 : 60, blast: t === 'frag' ? 3 : 1.5, destr: 1.2,
      };
      W.grenades.push(g);
      if (VX.Coop.active) VX.Coop.shareGrenade(g);
      if (t === 'frag') VX.Audio.pin(); else VX.Audio.swish();
      if (W.throws[t] <= 0) { const nx = ORDER.find((k) => W.throws[k] > 0); if (nx) W.throwSel = nx; }
    },

    // ---- simulación (la llama updateGrenades del arma para los que tienen type) ----
    step(W, game, g, dt) {
      g.vy -= 14 * dt;
      const nx = g.x + g.vx * dt, ny = g.y + g.vy * dt, nz = g.z + g.vz * dt;
      g.rot += dt * (g.rest ? 0 : 11);
      const Wd = game.world;
      if (g.type === 'molotov') {
        g.x = nx; g.y = ny; g.z = nz;
        if (Math.random() < 0.8) game.particles.spawn(g.x, g.y + 0.06, g.z, M.rand(-0.2, 0.2), M.rand(0.4, 1), M.rand(-0.2, 0.2), 1, M.rand(0.4, 0.7), 0.1, 0.035, M.rand(0.2, 0.4), 1, 1);
        let hit = g.life <= 0 || Wd.isSolidAt(g.x, g.y, g.z) || g.y < Wd.groundAt(g.x, g.z) + 0.05;
        if (!hit) for (const e of game.enemies) if (!e.dead && Math.hypot(e.body.cx - g.x, e.body.cy - g.y, e.body.cz - g.z) < (e.isBoss ? 1.3 : 0.6)) { hit = true; break; }
        if (hit) { g.dead = true; this.shatter(game, g); }
        return;
      }
      // granada y señuelo rebotan
      if (!g.rest) {
        if (Wd.isSolidAt(nx, g.y, g.z)) { g.vx *= -0.45; } else g.x = nx;
        if (Wd.isSolidAt(g.x, g.y, nz)) { g.vz *= -0.45; } else g.z = nz;
        const gr = Wd.groundAt(g.x, g.z) + 0.06;
        if (ny < gr || Wd.isSolidAt(g.x, ny, g.z)) {
          if (g.vy < 0) { g.y = Math.max(gr, g.y); g.vy *= -0.35; g.vx *= 0.6; g.vz *= 0.6; if (Math.abs(g.vy) > 1.2) VX.Audio.at(g.x, g.y, g.z, () => VX.Audio.click()); }
          else g.vy = 0;
          if (Math.abs(g.vy) < 0.8 && Math.hypot(g.vx, g.vz) < 0.6) { g.rest = true; g.vx = g.vz = g.vy = 0; g.y = gr; }
        } else g.y = ny;
      }
      if (g.type === 'frag') {
        if (Math.random() < 0.5) game.particles.spawn(g.x, g.y + 0.05, g.z, 0, 0.5, 0, 0.4, 0.38, 0.36, 0.03, 0.5, 0, 1);
        if (g.life <= 0) { g.dead = true; this.blast(game, g, 'frag'); }
        return;
      }
      if (g.type === 'decoy') {
        if (g.rest && !g.on) { g.on = true; g.life = Math.min(g.life, 7); this.decoys.push(g); }
        if (g.on) {
          g.beep = (g.beep || 0) - dt;
          if (g.beep <= 0) { g.beep = g.life < 2 ? 0.18 : 0.45; VX.Audio.at(g.x, g.y, g.z, () => VX.Audio.beep(), undefined, 'decoy'); }
        }
        if (g.life <= 0 || g.hits > 6) { g.dead = true; this.blast(game, g, 'decoy'); }
      }
    },

    blast(game, g, kind) {
      const R = kind === 'frag' ? 3 : 1.6;
      if (g.remote) { game.visualOnly = true; try { game.explode({ x: g.x, y: g.y + 0.1, z: g.z, R, dmg: g.dmg, destr: g.destr, selfK: 0, weapon: 'throw' }); } finally { game.visualOnly = false; } }
      else game.explode({ x: g.x, y: g.y + 0.1, z: g.z, R, dmg: g.dmg, destr: g.destr, selfK: 0.35, weapon: 'throw' });
    },

    shatter(game, g) {
      const x = g.x, z = g.z, y = game.world.groundAt(x, z);
      VX.Audio.at(x, y, z, () => { VX.Audio.glass(30); VX.Audio.torch(1.2); });
      for (let i = 0; i < 18; i++) game.particles.spawn(x, y + 0.3, z, M.rand(-3, 3), M.rand(1, 4), M.rand(-3, 3), 0.35, 0.5, 0.25, M.rand(0.02, 0.04), M.rand(0.4, 0.9), 0.3, 1);
      for (let i = 0; i < 30; i++) game.particles.spawn(x + M.rand(-0.6, 0.6), y + 0.2, z + M.rand(-0.6, 0.6), M.rand(-1.5, 1.5), M.rand(1, 4), M.rand(-1.5, 1.5), 1, M.rand(0.35, 0.7), 0.08, M.rand(0.06, 0.12), M.rand(0.5, 1), 1, 1);
      if (game.waterAt && game.waterAt(x, z)) return;   // en el agua se apaga
      game.addFire(x, z, 1.5, 7);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.random(); game.addFire(x + Math.cos(a) * 1.3, z + Math.sin(a) * 1.3, 0.9, 5.5); }
      game.igniteAt(x, z, 2);
      if (!g.remote) for (const e of game.enemies) if (!e.dead && !(e.T && e.T.fireImmune) && Math.hypot(e.x - x, e.z - z) < 2.4) e.burn = Math.max(e.burn || 0, e.isBoss ? 2 : 4);
      game.stirFog && game.stirFog(x, z, 3, 1, 0.1);
    },

    // ¿a quién persigue este zombi? Si hay un señuelo encendido cerca, a él
    decoyFor(e) {
      if (!this.decoys.length || e.isBoss || (e.T && e.T.pile)) return null;
      let best = null, bd = 16;
      for (const d of this.decoys) {
        if (d.dead) continue;
        const dd = Math.hypot(d.x - e.x, d.z - e.z);
        if (dd < bd) { bd = dd; best = d; }
      }
      return best;
    },
    // un «jugador» falso en el señuelo: hereda del de verdad pero no recibe daño (cada golpe lo gasta)
    proxy(P, d) {
      if (!d.proxy) {
        const o = Object.create(P);
        o.damage = () => { d.hits = (d.hits || 0) + 1; };
        o.knock = () => {}; o.fireTouch = () => {}; o.heal = () => {};
        d.proxy = o;
      }
      const o = d.proxy;
      o.x = d.x; o.z = d.z; o.y = d.y - 0.06; o.vx = 0; o.vz = 0; o.vy = 0; o.hp = Math.max(1, P.hp);
      return o;
    },
    update() { this.decoys = this.decoys.filter((d) => !d.dead); },

    // artículos para la tienda, cofres y cajas
    item(type, n, price) {
      const T = TYPES[type];
      return { kind: 'throw', type, n, price, title: (n > 1 ? n + ' × ' : '') + T.name, desc: T.desc + ` (máx. ${T.max}) · se lanza con ${VX.Settings.keyName(VX.Settings.key('throw'))}`, color: T.color, shape: T.shape };
    },
    attachItem(W, price) {
      const a = W.randomAttach();
      if (!a) return null;
      const d = VX.Weapons.ATTACH[a];
      return { kind: 'attach', att: a, price, title: 'Accesorio: ' + d.name, desc: d.desc + ' (para esta partida; se monta en el arma)', color: d.color, shape: 'scope' };
    },

    // ---- dibujo ----
    render(batch, g, time) {
      const q = M.qAxis(0.6, 0.3, 0.74, g.rot);
      if (g.type === 'frag') {
        batch.rbox(g.x, g.y, g.z, 0.1, 0.12, 0.1, q, 0.3, 0.36, 0.2, 0);
        batch.rbox(g.x, g.y + 0.08, g.z, 0.05, 0.04, 0.05, q, 0.45, 0.45, 0.48, 0);
        batch.rbox(g.x + 0.03, g.y + 0.06, g.z, 0.02, 0.07, 0.03, q, 0.55, 0.55, 0.58, 0);
      } else if (g.type === 'molotov') {
        batch.rbox(g.x, g.y, g.z, 0.08, 0.15, 0.08, q, 0.25, 0.4, 0.18, 0.1);
        batch.rbox(g.x, g.y + 0.1, g.z, 0.035, 0.07, 0.035, q, 0.3, 0.45, 0.2, 0.1);
        batch.rbox(g.x, g.y + 0.15, g.z, 0.04, 0.05, 0.04, q, 1, 0.55, 0.15, 1);
      } else {
        const blink = g.on && Math.sin(time * (g.life < 2 ? 40 : 14)) > 0;
        batch.rbox(g.x, g.y + 0.04, g.z, 0.14, 0.08, 0.1, q, 0.15, 0.15, 0.17, 0);
        batch.rbox(g.x, g.y + 0.1, g.z, 0.03, 0.05, 0.03, q, blink ? 1 : 0.4, blink ? 0.15 : 0.05, 0.05, blink ? 1 : 0);
        batch.rbox(g.x + 0.05, g.y + 0.14, g.z, 0.01, 0.12, 0.01, q, 0.5, 0.5, 0.52, 0);   // antena
      }
    },
  };

  VX.Throw = Throw;
})();
