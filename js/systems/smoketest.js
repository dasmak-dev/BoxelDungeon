// Prueba automática de todos los modos (0.55): abre el juego con ?test=all.
// Juega de verdad unos segundos cada modo (mazmorra, mazmorra diaria y cada mapa de la Horda; en el
// barco, con el temporal y los golpes de mar) con un bot invulnerable que apunta al zombi más cercano
// y dispara. Al final muestra un informe: errores de cada modo, FPS medios y peor fotograma.
// El informe también queda en window.__smoketest (para pruebas automáticas desde fuera).
(function () {
  'use strict';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const Smoke = {
    async run(game) {
      if (this.running) return;
      this.running = true;
      VX.testing = true;                       // no pausar al perder el ratón o cambiar de pestaña
      const errs = [];
      const onErr = (e) => { const m = String((e && (e.message || (e.reason && e.reason.message))) || e); if (/pointer lock/i.test(m)) return; errs.push(m.slice(0, 200)); };
      window.addEventListener('error', onErr); window.addEventListener('unhandledrejection', onErr);
      const SECS = +(new URLSearchParams(location.search).get('secs') || 12);
      const steps = [
        { name: 'Mazmorra', start: () => game.newGame(), rooms: true },
        { name: 'Mazmorra diaria', start: () => VX.Daily.start(game), rooms: true },
        ...VX.HordeMode.MAPS.map((m) => ({ name: 'Horda · ' + m.name, start: () => game.startHorde(m.id), horde: true, ship: m.id === 'barco' })),
      ];
      this.panel();
      const out = [];
      const t0 = performance.now();
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        this.progress(`${i + 1}/${steps.length} · ${st.name}…`);
        const e0 = errs.length, l0 = VX.ErrLog ? VX.ErrLog.list.length : 0;
        let ok = true;
        try { st.start(); } catch (e) { errs.push('al empezar: ' + e.message); ok = false; }
        await wait(600);
        const res = ok ? await this.play(game, st, SECS) : { fps: 0, worst: 0 };
        const newErrs = errs.slice(e0).concat(VX.ErrLog ? VX.ErrLog.list.slice(l0).map((x) => x.msg) : []);
        const uniq = [...new Set(newErrs)];
        out.push({ name: st.name, ok: !uniq.length, errs: uniq, fps: res.fps, worst: res.worst, kills: res.kills, extra: res.extra });
      }
      window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr);
      game.quitToTitle && game.quitToTitle();
      VX.testing = false;
      this.report(out, (performance.now() - t0) / 1000);
    },

    // el bot: invulnerable, apunta al zombi más cercano y dispara; recarga cuando hace falta
    async play(game, st, secs) {
      const P = game.player, W = game.weapon;
      const k0 = game.stats.kills || 0;
      let frames = 0, worst = 0, last = performance.now();
      const end = last + secs * 1000;
      let nextRoom = performance.now() + 3500, rooms = 0, waves = 0;
      if (st.horde && VX.HordeMode.timer > 1) VX.HordeMode.timer = 1;    // la primera oleada, ya
      if (st.ship && game.currentRoom.st) { game.currentRoom.st.t = 0.01; }   // en el barco, temporal enseguida
      else if (st.ship) { game.currentRoom.updateStorm(game, 0); game.currentRoom.st.t = 0.01; }
      while (performance.now() < end) {
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now(), dt = now - last; last = now; frames++;
        if (frames > 5) worst = Math.max(worst, dt);
        if (game.state === 'paused') game.resume && game.resume();
        if (game.state !== 'playing') continue;
        P.invuln = 99; P.hp = P.maxHp;
        // apuntar al más cercano y disparar
        let best = null, bd = 1e9;
        for (const e of game.enemies) { if (e.dead || (e.spawnT > 0.3)) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
        if (best && bd < 30) {
          P.yaw = Math.atan2(best.x - P.x, best.z - P.z);
          const ey = P.y + 1.6, ty = best.y + (best.body.height || 1.6) * 0.6;
          P.pitch = Math.atan2(ty - ey, bd);
          if (W.slot && W.slot.ammo <= 0 && !W.reloading) { if (W.slot.reserve !== undefined && W.slot.reserve <= 0) W.slot.reserve = 60; W.startReload(); }
          if (W.cooldown <= 0 && !W.reloading && W.slot && W.slot.ammo > 0 && !VX.Weapons.DEFS[W.slot.id].melee) { try { W.fire(game, W.stats()); } catch (e) { throw e; } }
        }
        // mazmorra: cada pocos segundos se da la sala por limpia y se pasa a la siguiente
        if (st.rooms && now > nextRoom && game.currentRoom) {
          nextRoom = now + 3500;
          const cr = game.currentRoom;
          game.flushJobs && game.flushJobs();
          for (const e of game.enemies) e.dead = true;
          cr.pendingWaves = 0; game.clearRoom(cr, true);
          const s = cr.exits.find((x) => cr.doors[x] && cr.doors[x].neighbor && !cr.doors[x].goldLock);
          if (s) { const n = cr.doors[s].neighbor; game.spawner.prepare(game, n); game.enterRoom(n); const c = n.centerX ? [n.centerX(), n.centerZ()] : null; if (c) { P.x = c[0]; P.z = c[1]; P.y = game.world.groundAt(P.x, P.z); } rooms++; }
        }
        if (st.horde) waves = Math.max(waves, VX.HordeMode.wave || 0);
      }
      const extra = st.rooms ? `${rooms} salas` : st.ship ? `oleada ${waves} · temporal ${game.currentRoom.st && game.currentRoom.st.on ? 'sí' : 'no'}` : `oleada ${waves}`;
      return { fps: Math.round(frames / secs), worst: Math.round(worst), kills: (game.stats.kills || 0) - k0, extra };
    },

    panel() {
      let el = document.getElementById('testReport');
      if (!el) {
        el = document.createElement('div'); el.id = 'testReport';
        el.innerHTML = '<h3>PRUEBA DE TODOS LOS MODOS</h3><div class="trProg"></div><pre class="trOut"></pre><div class="row"><button class="small trCopy hidden">COPIAR INFORME</button><button class="small secondary trClose">CERRAR (recarga)</button></div>';
        document.body.appendChild(el);
        el.querySelector('.trClose').onclick = () => location.href = location.pathname;
        el.querySelector('.trCopy').onclick = async () => { try { await navigator.clipboard.writeText(this.text); } catch (e) { /* nada */ } el.querySelector('.trCopy').textContent = 'COPIADO'; };
      }
      el.classList.remove('hidden');
      el.style.pointerEvents = 'none'; el.style.opacity = '0.85';
    },
    progress(t) { const el = document.querySelector('#testReport .trProg'); if (el) el.textContent = t; },
    report(out, secs) {
      const bad = out.filter((o) => !o.ok);
      const lines = [`VOXEL DUNGEON ${VX.VERSION} · prueba de todos los modos · ${secs.toFixed(0)} s`, ''];
      for (const o of out) {
        lines.push(`${o.ok ? '✔' : '✗'} ${o.name}: ${o.fps} FPS (peor fotograma ${o.worst} ms) · ${o.kills} muertes · ${o.extra || ''}`);
        for (const e of o.errs.slice(0, 5)) lines.push('    · ' + e);
      }
      lines.push('', bad.length ? `✗ ${bad.length} modo(s) con errores` : '✔ Todo correcto');
      this.text = lines.join('\n');
      const el = document.getElementById('testReport');
      el.style.pointerEvents = ''; el.style.opacity = '';
      el.querySelector('.trProg').textContent = 'Terminado';
      el.querySelector('.trOut').textContent = this.text;
      el.querySelector('.trCopy').classList.remove('hidden');
      if (VX.ErrLog && bad.length) VX.ErrLog.add(`Prueba de todos los modos: ${bad.length} con errores`, bad.map((b) => b.name + ': ' + b.errs[0]).join('\n'), 'pruebas');
      window.__smoketest = { out, text: this.text };
      this.running = false;
    },
  };
  VX.SmokeTest = Smoke;
})();
