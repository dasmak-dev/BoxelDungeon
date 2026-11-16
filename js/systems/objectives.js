// Objetivos de partida (mazmorra): al empezar salen 3 al azar. Cada uno cumplido da esencia en el
// momento (ya es tuya aunque caigas). Se ven en la pausa y en el mapa, y un rato al empezar.
(function () {
  const POOL = [
    { id: 'nohit', text: 'Despeja 3 salas seguidas sin recibir daño', goal: 3, ess: 15, get: (g) => g.obj.nohitBest },
    { id: 'knife', text: 'Mata 10 enemigos a cuchillo', goal: 10, ess: 10, get: (g) => g.obj.knife },
    { id: 'heads', text: 'Revienta 25 cabezas', goal: 25, ess: 12, get: (g) => g.stats.headshots },
    { id: 'boss', text: 'Derrota a un jefe', goal: 1, ess: 15, get: (g) => g.stats.bosses },
    { id: 'gold', text: 'Consigue 250 de oro', goal: 250, ess: 10, get: (g) => g.stats.totalGold },
    { id: 'keys', text: 'Usa 2 llaves (cerraduras, puertas doradas o el Relicario)', goal: 2, ess: 10, get: (g) => g.obj.keys },
    { id: 'floor', text: 'Llega al piso 8', goal: 8, ess: 15, get: (g) => g.floor },
    { id: 'boom', text: 'Mata 12 enemigos con explosiones', goal: 12, ess: 12, get: (g) => g.obj.boom },
    { id: 'limbs', text: 'Arranca 25 brazos, piernas o cabezas', goal: 25, ess: 10, get: (g) => g.obj.limbs },
    { id: 'secret', text: 'Encuentra una cámara secreta', goal: 1, ess: 12, get: (g) => g.stats.secrets || 0 },
    { id: 'elite', text: 'Mata 3 élites o campeones', goal: 3, ess: 12, get: (g) => g.obj.elite },
    { id: 'fast', text: 'Despeja una sala en menos de 20 s', goal: 1, ess: 8, get: (g) => g.obj.fast },
  ];
  const byId = {}; for (const o of POOL) byId[o.id] = o;

  const Objectives = {
    POOL,
    blank() { return { knife: 0, keys: 0, boom: 0, limbs: 0, elite: 0, fast: 0, nohit: 0, nohitBest: 0, roomDmg: 0 }; },
    start(game, saved) {
      game.obj = { ...this.blank(), ...(saved && saved.c ? saved.c : {}) };
      // bloqueados hasta comprarlos en el Santuario, vencer a un jefe o sacarlos en el Relicario
      const lvl = VX.Profile.objLevel();
      if (!lvl && !(saved && saved.list)) { game.objectives = null; this.render(game, false); return; }
      if (saved && saved.list) game.objectives = saved.list.filter((o) => byId[o.id]).map((o) => ({ id: o.id, done: !!o.done }));
      else {
        const ids = VX.M.shuffle(POOL.map((o) => o.id)).slice(0, lvl >= 2 ? 4 : 3);
        game.objectives = ids.map((id) => ({ id, done: false }));
      }
      this.showT = 7;
      this.render(game, true);
    },
    // ---- lo que va contando el juego ----
    kill(game, z) {
      if (!game.obj) return;
      if (game.dmgSource === 'knife') game.obj.knife++;
      if (game.inBlast) game.obj.boom++;
      if (z && (z.elite || z.champion)) game.obj.elite++;
    },
    limb(game) { if (game.obj) game.obj.limbs++; },
    keyUsed(game) { if (game.obj) game.obj.keys++; },
    hurt(game, amount) { if (game.obj && amount > 0) game.obj.roomDmg += amount; },
    roomEntered(game) { if (game.obj) { game.obj.roomDmg = 0; game.obj.enterT = game.time; } },
    roomCleared(game, r) {
      const o = game.obj;
      if (!o || r.type !== 'normal' && r.type !== 'boss') return;
      if (o.roomDmg <= 0) { o.nohit++; o.nohitBest = Math.max(o.nohitBest, o.nohit); } else o.nohit = 0;
      if (o.enterT !== undefined && game.time - o.enterT < 20) o.fast = 1;
    },
    // cada medio segundo: ¿se ha cumplido alguno?
    update(game, dt) {
      if (!game.objectives || game.mode !== 'dungeon') return;
      this.t = (this.t || 0) - dt;
      if (this.showT > 0) { this.showT -= dt; if (this.showT <= 0) this.render(game, false); }
      if (this.t > 0) return;
      this.t = 0.5;
      for (const ob of game.objectives) {
        if (ob.done) continue;
        const d = byId[ob.id];
        if ((d.get(game) || 0) >= d.goal) {
          ob.done = true;
          const ess = Math.round(d.ess * (VX.Profile.objLevel() >= 2 ? 1.25 : 1));
          VX.Profile.add('essence', ess); VX.Profile.add('objectives', 1, game); VX.Profile.save();
          game.essenceBanked = (game.essenceBanked || 0) + ess;
          game.hud.banner('OBJETIVO CUMPLIDO', `${d.text} · +${ess} de esencia`, 3);
          VX.Audio.upgrade ? VX.Audio.upgrade() : VX.Audio.reward();
          this.showT = 4;
          this.render(game, true);
        }
      }
    },
    // texto con el progreso (para la pausa, el mapa y el panel)
    html(game) {
      if (!game.objectives) return '';
      return game.objectives.map((ob) => {
        const d = byId[ob.id], v = Math.min(d.goal, d.get(game) || 0);
        return `<div class="obj${ob.done ? ' done' : ''}"><span>${ob.done ? '✔' : '◇'} ${d.text}</span><b>${ob.done ? '+' + d.ess + ' esencia' : (d.goal > 1 ? v + ' / ' + d.goal : '') + ' · ' + d.ess + ' ✦'}</b></div>`;
      }).join('');
    },
    render(game, show) {
      const el = document.getElementById('objPanel');
      if (!el) return;
      if (show && game.objectives) { el.innerHTML = '<div class="objT">OBJETIVOS DE LA PARTIDA</div>' + this.html(game); el.classList.remove('hidden'); }
      else el.classList.add('hidden');
    },
  };

  VX.Objectives = Objectives;
})();
