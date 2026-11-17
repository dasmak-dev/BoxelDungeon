// (0.61) Salas de evento: sin combate, una decisión.
// - Altar de sangre: das 20 de vida y eliges una de dos mejoras raras.
// - Celda olvidada: un superviviente encerrado. Si lo liberas te da una llave y oro… o estaba
//   infectado y se convierte en una élite.
// - Ruleta del vendedor: pagas y giras (hasta 3 veces): nada, oro doble, vida, mejora, premio gordo… o zombis.
// - Pozo de los deseos: tiras oro (hasta 3 veces); cuanto más tiras, más fácil que te conceda algo.
(function () {
  const M = VX.M;
  const KINDS = { altar: 'Altar de sangre', survivor: 'Celda olvidada', roulette: 'Ruleta del vendedor', well: 'Pozo de los deseos' };

  function prepare(game, room) {
    const f = room.features.find((x) => x.kind === 'eventSpot');
    if (!f) return;
    const PK = game.pickups, kind = room.eventKind || 'altar';
    if (kind === 'altar') {
      PK.addItem({ kind: 'bloodAltar', price: 0, x: f.x, y: f.y, z: f.z, title: 'Altar de sangre', desc: '20 de vida por una mejora rara', action: 'Sangrar', color: [0.9, 0.1, 0.1], shape: 'skull' });
    } else if (kind === 'survivor') {
      const body = new VX.VoxelBody(survivorModel(), 1);
      body.x = f.x; body.z = f.z; body.y = game.world.groundAt(f.x, f.z);
      const infected = Math.random() < 0.3;
      const npc = { body, t: 0, survivor: true, infected, room, state: 'caged', update: survivorUpdate };
      game.npcs.push(npc);
      PK.addItem({ kind: 'survivor', npc, price: 0, x: f.x, y: body.y + 1, z: f.gateZ != null ? f.gateZ : f.z, title: 'Superviviente atrapado', desc: '«¡Sácame de aquí, por favor!»', action: 'Liberar', color: [1, 0.85, 0.6], shape: 'star', noDraw: true, gateZ: f.gateZ });
    } else if (kind === 'roulette') {
      const door = room.doorWorld(room.entrance || 'zn');
      const it = PK.addItem({ kind: 'roulette', price: 0, x: f.x, y: f.y, z: f.z, title: 'Ruleta del vendedor', desc: 'Gira y reza', action: 'Girar', color: [1, 0.8, 0.3], shape: 'coin', noDraw: true,
        spins: 0, ang: 0, face: Math.atan2(door.x - f.x, door.z - f.z) });
      it.cost = rouletteCost(game, it);
      it.desc = `Gira y reza · ${it.cost} de oro`;
    } else {
      PK.addItem({ kind: 'well', price: 0, x: f.x, y: f.y, z: f.z, title: 'Pozo de los deseos', desc: 'Tira oro y pide un deseo', action: 'Tirar oro', color: [0.45, 0.85, 1], shape: 'coin', tosses: 0 });
    }
  }

  const rouletteCost = (game, it) => Math.round((20 + game.floor * 2) * (1 + it.spins * 0.5));
  const wellCost = (game) => Math.min(game.stats.gold, 12 + game.floor);

  // devuelve true si el objeto era de un evento (y ya se ha gestionado)
  function interact(it, game, PK) {
    const P = game.player;
    if (it.kind === 'bloodAltar') {
      if (P.hp <= 25) { VX.Audio.deny(); game.hud.toast('No te queda sangre suficiente'); return true; }
      it.taken = true;
      P.hp -= 20; game.hud.flashDamage && game.hud.flashDamage(0.5);
      VX.Audio.hurt && VX.Audio.hurt(); VX.Audio.reward();
      for (let i = 0; i < 30; i++) game.particles.spawn(it.x, it.y + 0.2, it.z, M.rand(-1.5, 1.5), M.rand(0.5, 3), M.rand(-1.5, 1.5), 0.6, 0.02, 0.02, 0.05, 0.9, 1, 1);
      const ups = VX.Upgrades.random(2, game, [], 'rare'), cid = 'altar' + game.time;
      ups.forEach((up, i) => {
        PK.addItem({ kind: 'upgrade', up, price: 0, choice: cid, x: it.x + (i ? 1.2 : -1.2), y: it.y + 0.2, z: it.z, title: up.name + ' ★ RARA', desc: up.desc + ' · (elige una)', color: up.color, shape: up.shape,
          onTake: (gm) => { for (const o of gm.pickups.items) if (o.choice === cid && !o.taken) o.taken = true; } });
      });
      game.hud.banner('EL ALTAR BEBE', 'Elige una de las dos', 2.2);
      return true;
    }
    if (it.kind === 'survivor') {
      it.taken = true;
      const n = it.npc;
      openCage(game, n.body.x, it.gateZ != null ? it.gateZ : n.body.z);
      VX.Audio.door && VX.Audio.door();
      if (n.infected) {
        n.state = 'turning'; n.t = 0;
        game.hud.banner('¡ESTABA INFECTADO!', 'Se está transformando…', 2);
      } else {
        n.state = 'thanks'; n.t = 0;
        const tier = game.rollKeyTier(0.25);
        game.dropKey(tier, n.body.x, n.body.y + 1, n.body.z + 0.6);
        PK.dropGold(n.body.x, n.body.y + 1, n.body.z + 0.6, 15 + game.floor);
        game.hud.toast('«¡Gracias! Toma, es lo que encontré»');
        VX.Audio.reward();
      }
      return true;
    }
    if (it.kind === 'roulette') {
      if (it.spinT > 0) return true;
      if (it.spins >= 3) { game.hud.toast('La ruleta ya no gira más'); return true; }
      const cost = rouletteCost(game, it);
      if (game.stats.gold < cost) { VX.Audio.deny(); game.hud.toast(`Necesitas ${cost} de oro`); return true; }
      game.stats.gold -= cost; it.paid = cost;
      it.spins++; it.spinT = 2.2; it.spinV = 14 + Math.random() * 4;
      VX.Audio.buy(); VX.Audio.click();
      return true;
    }
    if (it.kind === 'well') {
      if (it.done) { game.hud.toast('El pozo ya te ha escuchado'); return true; }
      const c = wellCost(game);
      if (c < 5) { VX.Audio.deny(); game.hud.toast('No tienes oro que tirar'); return true; }
      game.stats.gold -= c; it.tosses++; it.thrown = (it.thrown || 0) + c;
      VX.Audio.gold();
      for (let i = 0; i < 8; i++) game.particles.spawn(it.x, it.y + 0.4, it.z, M.rand(-0.4, 0.4), M.rand(1, 2), M.rand(0.3, 1), 1, 0.85, 0.3, 0.03, 0.6, 1, 1);
      const chance = 0.2 + it.thrown / (60 + game.floor * 6) * 0.4;
      if (Math.random() < chance || it.tosses >= 3 && Math.random() < 0.5) { it.done = true; grantWish(game, it, PK); }
      else if (it.tosses >= 3) { it.done = true; game.hud.toast('…Solo se oye el eco. El pozo no te escucha'); }
      else game.hud.toast('Plof. Nada… de momento');
      if (it.done) it.taken = true;
      else it.desc = `Tira oro y pide un deseo · ${wellCost(game)} de oro`;
      return true;
    }
    return false;
  }

  function grantWish(game, it, PK) {
    const P = game.player, r = Math.random();
    VX.Audio.reward(); VX.Audio.save && VX.Audio.save();
    for (let i = 0; i < 30; i++) game.particles.spawn(it.x, it.y + 0.3, it.z, M.rand(-1, 1), M.rand(1.5, 4), M.rand(-1, 1), 0.5, 0.9, 1, 0.04, 1, 1, 1);
    if (r < 0.25) { P.heal(P.maxHp); game.hud.banner('DESEO CONCEDIDO', 'Vida llena', 2.4); }
    else if (r < 0.45) { P.maxHp += 10; P.heal(10); game.hud.banner('DESEO CONCEDIDO', '+10 de vida máxima', 2.4); }
    else if (r < 0.65) { game.dropKey(game.rollKeyTier(0.35), it.x, it.y + 0.8, it.z - 0.6); game.hud.banner('DESEO CONCEDIDO', 'Una llave sale del agua', 2.4); }
    else if (r < 0.8) { PK.dropGold(it.x, it.y + 0.6, it.z - 0.6, Math.round((it.thrown || 20) * 2.2)); game.hud.banner('DESEO CONCEDIDO', 'El pozo te devuelve el doble', 2.4); }
    else { const up = VX.Upgrades.random(1, game, [], 'rare')[0]; if (up) PK.addItem({ kind: 'upgrade', up, price: 0, x: it.x, y: it.y + 0.3, z: it.z - 0.8, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape }); game.hud.banner('DESEO CONCEDIDO', 'Una mejora rara', 2.4); }
  }

  // ruleta: 12 casillas; el resultado depende de dónde se para
  const SEG = ['nada', 'oro', 'vida', 'nada', 'mejora', 'zombis', 'oro', 'nada', 'premio', 'vida', 'nada', 'zombis'];
  const SEGC = { nada: [0.12, 0.1, 0.1], oro: [0.95, 0.75, 0.15], vida: [0.85, 0.15, 0.2], mejora: [0.5, 0.75, 1], premio: [1, 0.95, 0.6], zombis: [0.3, 0.55, 0.25] };
  function update(dt, game) {
    for (const it of game.pickups.items) {
      if (it.kind !== 'roulette' || it.taken) continue;
      if (it.spinT > 0) {
        it.spinT -= dt;
        it.ang += it.spinV * dt; it.spinV = Math.max(0.6, it.spinV * Math.pow(0.32, dt));
        it.tick = (it.tick || 0) + it.spinV * dt;
        if (it.tick > Math.PI * 2 / 12) { it.tick = 0; VX.Audio.click(); }
        if (it.spinT <= 0) rouletteResult(game, it);
      }
    }
  }
  function rouletteResult(game, it) {
    const n = SEG.length, a = ((it.ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const res = SEG[(n - Math.floor(a / (Math.PI * 2) * n)) % n];
    const PK = game.pickups, P = game.player, x = it.x - Math.sin(it.face) * -0.8, z = it.z - Math.cos(it.face) * -0.8;
    switch (res) {
      case 'nada': VX.Audio.deny(); game.hud.toast('Nada. La casa gana'); break;
      case 'oro': PK.dropGold(x, it.y + 0.5, z, it.paid * 2); VX.Audio.gold(); game.hud.toast('¡Oro doble!'); break;
      case 'vida': P.heal(40); VX.Audio.save && VX.Audio.save(); game.hud.toast('+40 de vida'); break;
      case 'mejora': { const up = VX.Upgrades.random(1, game, [], 'normal')[0]; if (up) PK.addItem({ kind: 'upgrade', up, price: 0, x, y: it.y + 0.3, z, title: up.name, desc: up.desc, color: up.color, shape: up.shape }); VX.Audio.reward(); game.hud.toast('¡Una mejora!'); break; }
      case 'premio': PK.dropGold(x, it.y + 0.5, z, it.paid * 5); game.dropKey(game.rollKeyTier(0.4), x, it.y + 0.8, z); VX.Audio.reward(); game.hud.banner('¡PREMIO GORDO!', 'Oro ×5 y una llave', 2.5); break;
      case 'zombis': {
        game.hud.banner('¡LA CASA GANA!', 'Han salido de debajo de la mesa', 2);
        const room = game.currentRoom; room.cleared = false; room.pendingWaves = 0;
        for (let i = 0; i < 3 + Math.floor(game.floor / 6); i++) game.spawner.spawnZombieNear(game, it.x, it.z, 4, game.spawner.pickKind(game.floor, game.spawner.zoneNow()));
        VX.Audio.roar && VX.Audio.roar();
        break;
      }
    }
    if (it.spins >= 3) it.desc = 'Ya no gira más'; else { it.cost = rouletteCost(game, it); it.desc = `Gira y reza · ${it.cost} de oro`; }
  }

  // la ruleta: rueda de casillas de colores, aro dorado, puntero y peana
  const tmp = [0, 0, 0];
  function renderRoulette(batch, it) {
    const q = M.qY(it.face), R = 0.62, cx = it.x, cy = it.y + 0.8, cz = it.z;
    const put = (lx, ly, lz, sx, sy, sz, r, g, b, e = 0) => { M.qRot(q, lx, ly, lz, tmp); batch.rbox(cx + tmp[0], cy + tmp[1], cz + tmp[2], sx, sy, sz, q, r, g, b, e); };
    const n = SEG.length;
    for (let s = 0; s < n; s++) {
      const c = SEGC[SEG[s]];
      for (let k = 1; k <= 5; k++) {
        const rr = R * k / 5.4, steps = 1 + Math.floor(k * 0.8);
        for (let j = 0; j < steps; j++) {
          const a = it.ang + (s + (j + 0.5) / steps) / n * Math.PI * 2;
          const alt = s % 2 && SEG[s] === 'nada' ? 0.7 : 1;
          put(Math.cos(a) * rr, Math.sin(a) * rr, 0, 0.09, 0.09, 0.05, c[0] * alt, c[1] * alt, c[2] * alt, SEG[s] === 'premio' ? 0.5 : 0.08);
        }
      }
    }
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; put(Math.cos(a) * (R + 0.03), Math.sin(a) * (R + 0.03), 0, 0.08, 0.08, 0.08, 0.85, 0.65, 0.2, i % 2 ? 0.6 : 0.1); }
    put(0, 0, 0.04, 0.1, 0.1, 0.06, 0.85, 0.65, 0.2, 0.3);
    put(0, R + 0.12, 0.06, 0.06, 0.16, 0.06, 1, 0.95, 0.85, 0.5);   // puntero
    put(0, -R - 0.18, 0, 0.12, 0.3, 0.1, 0.3, 0.2, 0.12);           // peana
  }

  // jaula: se abren los barrotes del lado de la puerta
  function openCage(game, x, zGate) {
    const W = game.world, S = VX.S;
    for (let gx = Math.floor((x - 0.6) / S); gx <= Math.floor((x + 0.6) / S); gx++)
      for (let gz = Math.floor((zGate - 0.1) / S); gz <= Math.floor((zGate + 0.6) / S); gz++) {
        const r = W.roomAtG(gx, gz); if (!r) continue;
        for (let y = 0; y < Math.floor(2.4 / S); y++) { const t = r.get(gx - r.ox, y, gz - r.oz); if (t === VX.Blocks.IRON) W.destroyCell(r, gx - r.ox, y, gz - r.oz, t, game, 1); }
      }
  }

  function survivorModel() {
    return VX.Models.humanoid({
      v: 0.05, blocky: true, clean: true, leg: [4, 17, 4], torso: [9, 13, 5], arm: [4, 15, 4], head: [8, 8, 8],
      skin: M.choice([[0.82, 0.64, 0.5], [0.62, 0.45, 0.32], [0.9, 0.74, 0.62]]), shirt: M.choice([[0.55, 0.15, 0.12], [0.2, 0.3, 0.5], [0.45, 0.42, 0.3]]),
      pants: [0.2, 0.22, 0.3], shoes: [0.15, 0.12, 0.1], eye: [0.08, 0.06, 0.05], hair: [0.18, 0.12, 0.07, 0.6], ragged: 0.12, tear: 0, jaw: false, wound: false,
    });
  }
  function survivorUpdate(dt, game) {
    const b = this.body, P = game.player;
    this.t += dt;
    const ty = Math.atan2(P.x - b.x, P.z - b.z);
    let d = ty - b.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    b.yaw += d * Math.min(1, dt * 3);
    const A = b.byName;
    if (this.state === 'caged') {
      // agarrado a los barrotes, tembloroso
      if (A.armL) A.armL.ax = -2.2 + Math.sin(this.t * 7) * 0.05; if (A.armR) A.armR.ax = -2.1 + Math.sin(this.t * 6) * 0.05;
      if (A.head) A.head.az = Math.sin(this.t * 1.7) * 0.1;
    } else if (this.state === 'thanks') {
      if (A.armR) A.armR.ax = -2.6 + Math.sin(this.t * 10) * 0.4;   // saluda
      if (this.t > 2.4) {
        this.hidden = true; this.state = 'gone';
        for (let i = 0; i < 24; i++) game.particles.spawn(b.x, b.y + 1, b.z, M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1), 0.8, 0.8, 0.85, 0.04, 0.8, 1, 1);
        game.hud.toast('El superviviente huye por la puerta');
      }
    } else if (this.state === 'turning') {
      // convulsiones y, al poco, se convierte
      if (A.head) A.head.az = Math.sin(this.t * 30) * 0.4;
      if (A.armL) A.armL.ax = -1 + Math.sin(this.t * 25) * 0.8; if (A.armR) A.armR.ax = -1 + Math.cos(this.t * 23) * 0.8;
      b.yOff = Math.abs(Math.sin(this.t * 18)) * 0.03;
      if (this.t > 1.4) {
        this.hidden = true; this.state = 'gone';
        const z = new VX.Zombie('runner', b.x, b.z, game.floor, { y: b.y, elite: true });
        z.spawnT = 0; game.enemies.push(z);
        const r = game.currentRoom; r.cleared = false; r.pendingWaves = 0;
        VX.Audio.roar && VX.Audio.roar();
        for (let i = 0; i < 20; i++) game.particles.spawn(b.x, b.y + 1, b.z, M.rand(-1.5, 1.5), M.rand(0, 2), M.rand(-1.5, 1.5), 0.5, 0.05, 0.05, 0.05, 0.6, 1, 1);
      }
    }
    b.computeWorld();
  }

  VX.RoomEvents = { KINDS, prepare, interact, update, renderRoulette };
})();
