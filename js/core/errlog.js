// Registro de errores: guarda los últimos fallos del juego (con la versión, el modo y dónde
// estabas) para poder copiarlos desde Ajustes → Perfil y pasárselos a quien lo arregle.
(function () {
  const KEY = 'boxel.errlog', MAX = 40;
  const Err = {
    list: [],
    load() { try { this.list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { this.list = []; } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.list.slice(-MAX))); } catch (e) { /* nada */ } },
    // dónde estaba la partida cuando falló
    where() {
      const g = VX.game;
      if (!g) return '';
      const parts = [g.state, g.mode];
      if (g.mode === 'dungeon') parts.push('piso ' + g.floor, g.currentRoom ? (g.currentRoom.type + (g.currentRoom.template ? ':' + g.currentRoom.template.name : '')) : '');
      if (g.mode === 'horde' && VX.HordeMode) parts.push('oleada ' + VX.HordeMode.wave);
      if (VX.Coop && VX.Coop.active) parts.push('coop ' + VX.Coop.role);
      return parts.filter(Boolean).join(' · ');
    },
    add(msg, stack, kind = 'error') {
      msg = String(msg || '').slice(0, 300);
      if (!msg) return;
      const last = this.list[this.list.length - 1];
      // el mismo error muchas veces seguidas (en cada fotograma) cuenta como uno
      if (last && last.msg === msg) { last.n = (last.n || 1) + 1; last.t = new Date().toISOString(); this.dirty = true; return; }
      this.list.push({ t: new Date().toISOString(), v: VX.VERSION, k: kind, msg, at: this.where(), stack: String(stack || '').split('\n').slice(0, 6).join('\n').slice(0, 900), n: 1 });
      if (this.list.length > MAX) this.list.shift();
      this.dirty = true;
      this.badge();
    },
    flush() { if (this.dirty) { this.dirty = false; this.save(); } },
    clear() { this.list = []; this.save(); this.badge(); },
    text() {
      const ua = navigator.userAgent;
      const head = `VOXEL DUNGEON ${VX.VERSION} · ${new Date().toISOString()}\n${ua}\nPantalla ${innerWidth}×${innerHeight} · calidad ${VX.Settings && VX.Settings.data.quality}\n`;
      if (!this.list.length) return head + '\nSin errores registrados.';
      return head + '\n' + this.list.map((e) => `[${e.t}] v${e.v} ${e.k}${e.n > 1 ? ' ×' + e.n : ''}\n${e.msg}\nen: ${e.at}\n${e.stack}`).join('\n\n');
    },
    async copy() {
      const t = this.text();
      try { await navigator.clipboard.writeText(t); return true; } catch (e) {
        const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { /* nada */ }
        ta.remove(); return ok;
      }
    },
    badge() { const b = document.getElementById('errCount'); if (b) b.textContent = this.list.length ? `(${this.list.length})` : ''; },
  };
  Err.load();
  window.addEventListener('error', (e) => Err.add(e.message, e.error && e.error.stack || `${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => Err.add(e.reason && e.reason.message || e.reason, e.reason && e.reason.stack, 'promesa'));
  // los errores que el juego atrapa (console.error) también
  const ce = console.error.bind(console);
  console.error = (...a) => { try { const e = a.find((x) => x instanceof Error); Err.add(e ? e.message : a.map(String).join(' '), e && e.stack); } catch (x) { /* nada */ } ce(...a); };
  setInterval(() => Err.flush(), 3000);
  VX.ErrLog = Err;
})();
