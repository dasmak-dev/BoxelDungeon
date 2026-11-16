// Mazmorra diaria (0.52): cada día, la misma mazmorra para todo el mundo y una clasificación.
// La semilla sale de la fecha (UTC). Las salas, sus puertas y los enemigos de cada sala salen del
// azar de esa semilla y del camino (cada sala tiene su propia semilla según por qué puertas llegaste),
// así dos jugadores que eligen las mismas puertas ven exactamente las mismas salas.
// La puntuación se manda al servidor del cooperativo (rutas /daily); sin conexión se juega igual
// y la tabla muestra sólo tu mejor marca.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // mutadores (0.55): cada día una regla distinta, la misma para todo el mundo
  const MUTS = [
    { id: 'veloces', name: 'Zombis veloces', desc: 'Los zombis corren un 30 % más', espd: 1.3 },
    { id: 'cristal', name: 'Cañón de cristal', desc: 'Tienes la mitad de vida, pero haces un 60 % más de daño', php: 0.5, pdmg: 1.6 },
    { id: 'apagon', name: 'Apagón', desc: 'La mazmorra está mucho más oscura: tu linterna es lo único que alumbra', dark: 0.42 },
    { id: 'oro', name: 'Fiebre del oro', desc: 'Los zombis sueltan el doble de oro, pero tienen un 30 % más de vida', gold: 2, ehp: 1.3 },
    { id: 'vampiro', name: 'Vampiro', desc: 'Cada zombi que matas te cura 3 de vida, pero no aparecen corazones', vamp: 3, noHearts: true },
    { id: 'escopetero', name: 'Escopetero', desc: 'Empiezas con la escopeta en vez de la pistola', start: 'shotgun' },
    { id: 'duros', name: 'Carne dura', desc: 'Los zombis tienen un 50 % más de vida; tú haces un 20 % más de daño', ehp: 1.5, pdmg: 1.2 },
  ];
  const Daily = {
    hash, MUTS,
    // el mutador de una fecha (o el de la partida diaria en curso)
    mutOf(date) { return MUTS[hash('boxel-mutador-' + date) % MUTS.length]; },
    mut() { const g = VX.game; return g && g.daily ? (g.daily.mut || (g.daily.mut = this.mutOf(g.daily.date))) : null; },
    // aplica al empezar lo que toca al jugador (vida, daño, arma inicial, oscuridad)
    applyStart(game) {
      const m = this.mut(); if (!m) return;
      const P = game.player, W = game.weapon;
      if (m.php) { P.maxHp = Math.round(P.maxHp * m.php); P.hp = P.maxHp; }
      if (m.pdmg) W.mods.damage *= m.pdmg;
      if (m.start) W.slots[0] = W.mk(m.start);
      if (m.dark) game.ambientMul = m.dark;
    },
    today() { return new Date().toISOString().slice(0, 10); },
    seedOf(date) { return hash('boxel-diaria-' + date); },
    // semilla de una sala concreta (por su ruta de puertas) y de una tarea en ella
    roomSeed(game, rid, k) { return hash(game.daily.seed + ':' + (rid || 'S') + ':' + k); },
    url(q) {
      const h = VX.Net.healthUrl && VX.Net.healthUrl();
      if (!h) return null;
      const u = new URL(h); u.pathname = '/daily'; u.search = q || ''; return u.toString();
    },
    name() {
      let n = '';
      try { n = localStorage.getItem('boxel.dailyName') || localStorage.getItem('boxel.name') || ''; } catch (e) { /* nada */ }
      return (n || 'Anónimo').slice(0, 16);
    },
    mine() { const d = VX.Profile.data.daily; return d && d.date === this.today() ? d : null; },

    init(game) {
      this.game = game;
      const click = (id, fn) => $(id).addEventListener('click', () => { VX.Audio.init(); VX.Music.init(); VX.Audio.click(); fn(); });
      click('dailyBtn', () => this.open());
      click('dailyBack', () => VX.Menus.showTitle());
      click('dailyPlay', () => this.start(game));
      const ni = $('dailyName');
      ni.value = this.name();
      ni.addEventListener('keydown', (e) => e.stopPropagation());
      ni.addEventListener('change', () => { try { localStorage.setItem('boxel.dailyName', ni.value.trim().slice(0, 16)); } catch (e) { /* nada */ } });
      this.refreshInfo();
    },
    refreshInfo() {
      const m = this.mine(), el = $('dailyInfo');
      if (el) el.textContent = m ? `Hoy: tu mejor ${m.best} puntos · ${m.tries} intento${m.tries === 1 ? '' : 's'}` : 'La misma para todos hoy · clasificación';
    },
    open() {
      VX.Menus.show('daily');
      $('dailyDate').textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
      const m = this.mine();
      { const mu = this.mutOf(this.today()); $('dailyMut').innerHTML = `<b>Regla de hoy: ${esc(mu.name)}</b><br>${esc(mu.desc)}`; }
      $('dailyMine').innerHTML = m ? `Tu mejor marca de hoy: <b>${m.best}</b> (piso ${m.floor}) · ${m.tries} intento${m.tries === 1 ? '' : 's'}` : 'Aún no la has jugado hoy.';
      this.loadBoard();
      // cuánto falta para la siguiente
      const now = new Date(), nx = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1), h = Math.floor((nx - now) / 3600000), mi = Math.floor(((nx - now) % 3600000) / 60000);
      $('dailyNext').textContent = `Nueva mazmorra en ${h} h ${mi} min`;
    },
    async loadBoard() {
      const box = $('dailyBoard'), u = this.url('?date=' + this.today() + '&id=' + encodeURIComponent(VX.Net.token ? VX.Net.token() : ''));
      box.innerHTML = '<div class="dRow dWait">Cargando la clasificación… (el servidor puede tardar ~1 min en despertar)</div>';
      if (!u) { box.innerHTML = '<div class="dRow dWait">Sin servidor configurado.</div>'; return; }
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 70000);
        const r = await fetch(u, { signal: ctl.signal }); clearTimeout(to);
        const d = await r.json();
        this.renderBoard(d.top || []);
      } catch (e) {
        box.innerHTML = '<div class="dRow dWait">No se pudo cargar la clasificación (¿sin conexión?). Puedes jugar igual: tu marca se guarda aquí.</div>';
      }
    },
    renderBoard(top) {
      const box = $('dailyBoard'), me = VX.Net.token ? VX.Net.token() : '';
      if (!top.length) { box.innerHTML = '<div class="dRow dWait">Nadie la ha jugado todavía hoy. ¡Sé el primero!</div>'; return; }
      box.innerHTML = top.slice(0, 10).map((e, i) => `<div class="dRow${e.me || e.id === me ? ' dMe' : ''}"><span class="dPos">${i + 1}</span><span class="dName">${esc(e.name)}</span><span class="dFl">piso ${e.floor | 0} · ${e.kills | 0} zombis</span><b>${e.score | 0}</b></div>`).join('');
    },

    start(game) {
      const date = this.today();
      game.startRun(null, { daily: { date, seed: this.seedOf(date) } });
    },

    // al morir: guarda tu mejor marca de hoy y la manda a la tabla
    submit(game, res) {
      const D = game.daily;
      if (!D || !res) return null;
      const P = VX.Profile.data, today = D.date;
      let m = P.daily && P.daily.date === today ? P.daily : (P.daily = { date: today, best: 0, floor: 0, tries: 0 });
      m.tries++;
      const rec = res.score > m.best;
      if (rec) { m.best = res.score; m.floor = game.floor; }
      VX.Profile.save();
      this.refreshInfo();
      const u = this.url();
      const out = { rec, sent: false, pos: 0 };
      if (u) {
        fetch(u, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ date: today, id: VX.Net.token ? VX.Net.token() : '', name: this.name(), score: res.score, floor: game.floor, kills: game.stats.kills, time: Math.round(game.runTime || 0) }) })
          .then((r) => r.json()).then((d) => { out.sent = true; out.pos = d.pos || 0; const el = $('dailyResult'); if (el) el.innerHTML = this.resultText(game, out); })
          .catch(() => { const el = $('dailyResult'); if (el) el.innerHTML = this.resultText(game, out, true); });
      }
      return out;
    },
    resultText(game, out, fail) {
      const m = VX.Profile.data.daily || {};
      const mu = this.mut();
      return `<b>MAZMORRA DIARIA</b>${mu ? ' (' + esc(mu.name) + ')' : ''} · ` + (out.rec ? '<span style="color:#7fd36b">¡tu mejor marca de hoy!</span>' : `tu mejor de hoy: ${m.best}`) +
        (out.pos ? ` · puesto <b>#${out.pos}</b> en la clasificación` : fail ? ' · sin conexión: no se ha podido mandar a la tabla' : ' · mandando a la tabla…');
    },
  };
  VX.Daily = Daily;
})();
