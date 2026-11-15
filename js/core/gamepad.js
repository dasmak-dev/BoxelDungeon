// Mando (Gamepad API): Xbox, PlayStation, Switch Pro y similares, en PC y en el móvil
// (Bluetooth o cable). Escribe en VX.Input igual que el teclado y el ratón, y en los menús
// mueve un foco por los botones.
//
//   Stick izq.: moverse (analógico) · L3: correr      Stick der.: apuntar · R3: cuchillo
//   RT: disparar · LT: mirilla (rifle)                RB: cuchillo · LB: lanzar objeto
//   A: saltar · B: esquivar · X: usar / recargar · Y: cambiar de arma
//   Cruceta: ↑ linterna · ↓ cambiar objeto a lanzar · ← → arma anterior / siguiente
//   Start: pausa · Select: mapa (Horda: empezar oleada)
(function () {
  const I = VX.Input;
  const DZ = 0.16;   // zona muerta de los sticks
  const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

  const Pad = {
    active: false,      // se ha usado el mando hace poco (oculta los controles táctiles, no hace falta el ratón)
    prev: [],
    held: {},           // teclas que el mando mantiene pulsadas
    sprint: false,
    navT: 0, focus: -1,

    pad() {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of list) if (p && p.connected && p.buttons.length >= 12) return p;
      return null;
    },

    setActive(on) {
      if (this.active === on) return;
      this.active = on;
      document.body.classList.toggle('padOn', on);
      if (on && VX.game && VX.game.state === 'playing') I.locked = true;
      if (!on) this.clearFocus();
    },

    key(code, down) {
      if (!code) return;
      if (down) { if (!I.keys[code]) I.pressed[code] = true; I.keys[code] = true; this.held[code] = true; }
      else if (this.held[code]) { I.keys[code] = false; delete this.held[code]; }
    },

    poll(dt, game) {
      const p = this.pad();
      if (!p) { if (this.active) { this.release(); this.setActive(false); } return; }
      const btn = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.45));
      const now = p.buttons.map((_, i) => btn(i));
      const down = (i) => now[i] && !this.prev[i];
      const ax = (i) => { const v = p.axes[i] || 0; return Math.abs(v) < DZ ? 0 : (v - Math.sign(v) * DZ) / (1 - DZ); };
      const lx = ax(0), ly = ax(1), rx = ax(2), ry = ax(3);
      if (now.some((b) => b) || Math.hypot(lx, ly) > 0.3 || Math.hypot(rx, ry) > 0.3) this.setActive(true);
      if (!this.active) { this.prev = now; return; }

      const playing = game.state === 'playing';
      if (!playing) {
        this.release();
        this.menuNav(dt, game, now, down, lx, ly);
        this.prev = now;
        return;
      }
      this.clearFocus();
      I.locked = true;
      const K = (a) => VX.Settings.key(a);

      // moverse: analógico (el jugador lee I.padMove)
      I.padMove = Math.hypot(lx, ly) > 0 ? { x: lx, y: -ly } : null;
      if (down(B.L3)) this.sprint = !this.sprint;
      if (Math.hypot(lx, ly) < 0.2) this.sprint = false;
      this.key(K('run'), !VX.Settings.data.autoRun && this.sprint);

      // apuntar: curva para que sea fino al centro y rápido al fondo
      const S = VX.Settings.data.padSens || 1;
      const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 1.7);
      const scope = game.weapon && game.weapon.scopeK ? 1 - game.weapon.scopeK * 0.6 : 1;
      // ayuda para apuntar (la misma del táctil): frena la mira sobre los enemigos y la atrae un poco
      let fr = 1;
      if (VX.Touch && VX.Touch.assist && VX.Settings.data.aimAssist !== false) {
        try { const lk = Math.hypot(rx, ry) > 0; VX.Touch.lookMoved = lk; VX.Touch.assist(game, dt, lk); fr = VX.Touch.friction || 1; } catch (e) { /* nada */ }
      }
      I.dx += curve(rx) * 1150 * S * dt * scope * fr;
      I.dy += curve(ry) * 820 * S * dt * scope * fr;

      // gatillos y botones
      const rt = btn(B.RT);
      if (rt && !this.prev[B.RT]) { I.mouseClicked = true; I.mouseDown = true; }
      if (!rt && this.prev[B.RT]) I.mouseDown = false;
      I.rightDown = btn(B.LT);
      if (down(B.LT)) I.rightClicked = game.weapon && game.weapon.slot && game.weapon.slot.id === 'rifle';
      this.key(K('jump'), now[B.A]);
      this.key(K('dash'), now[B.B]);
      // X: usar si hay algo delante (comprar, abrir…); si no, recargar
      if (down(B.X)) {
        const pr = document.getElementById('prompt');
        const canUse = (pr && !pr.classList.contains('hidden')) || !!game.coopPrompt;
        this.tap(canUse ? K('use') : K('reload'));
      }
      if (down(B.Y)) I.wheel += 1;
      this.key(K('knife'), now[B.RB] || now[B.R3]);
      this.key(K('throw'), now[B.LB]);
      if (down(B.UP)) this.tap(K('flashlight'));
      if (down(B.DOWN)) this.tap(K('throwNext'));
      if (down(B.LEFT)) this.tap(K('prev'));
      if (down(B.RIGHT)) I.wheel += 1;
      if (down(B.SELECT)) this.tap(game.mode === 'horde' ? K('wave') : K('map'));
      if (down(B.START)) { this.release(); I.locked = false; game.pause(); }
      this.prev = now;
    },

    // pulsación de un fotograma
    tap(code) { if (!code) return; I.pressed[code] = true; I.keys[code] = true; this.held[code] = true; this.tapped = (this.tapped || []); this.tapped.push(code); },
    endFrame() { if (this.tapped) { for (const c of this.tapped) { I.keys[c] = false; delete this.held[c]; } this.tapped = null; } },

    release() {
      for (const c of Object.keys(this.held)) I.keys[c] = false;
      this.held = {};
      if (this.active) { I.mouseDown = false; I.rightDown = false; }
      I.padMove = null;
    },

    // ---- menús: el foco salta entre los botones visibles ----
    items() {
      const all = [...document.querySelectorAll('.screen:not(.hidden) button, .screen:not(.hidden) input[type=range], .screen:not(.hidden) select, .screen:not(.hidden) input[type=checkbox], .modal:not(.hidden) button, #upgradeChoice:not(.hidden) button')];
      return all.filter((e) => !e.disabled && e.offsetParent !== null && !e.closest('#hud') && !e.closest('#touch'));
    },
    clearFocus() { const f = document.querySelector('.padFocus'); if (f) f.classList.remove('padFocus'); this.focus = -1; },
    menuNav(dt, game, now, down, lx, ly) {
      const items = this.items();
      if (!items.length) return;
      let cur = items.indexOf(document.querySelector('.padFocus'));
      const setF = (i) => {
        const f = document.querySelector('.padFocus'); if (f) f.classList.remove('padFocus');
        const el = items[(i + items.length) % items.length];
        el.classList.add('padFocus'); el.scrollIntoView && el.scrollIntoView({ block: 'nearest' });
        try { el.focus({ preventScroll: true }); } catch (e) { /* nada */ }
      };
      if (cur < 0) { setF(0); return; }
      this.navT -= dt;
      const up = now[B.UP] || ly < -0.6, dn = now[B.DOWN] || ly > 0.6, lf = now[B.LEFT] || lx < -0.6, rt = now[B.RIGHT] || lx > 0.6;
      const el = items[cur];
      if ((up || dn || lf || rt) && this.navT <= 0) {
        this.navT = 0.18;
        if ((lf || rt) && el.type === 'range') {
          const st = parseFloat(el.step) || 0.05;
          el.value = Math.min(parseFloat(el.max), Math.max(parseFloat(el.min), parseFloat(el.value) + (rt ? st : -st)));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } else if ((lf || rt) && el.tagName === 'SELECT') {
          el.selectedIndex = Math.min(el.options.length - 1, Math.max(0, el.selectedIndex + (rt ? 1 : -1)));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else setF(cur + ((dn || rt) ? 1 : -1));
      }
      if (!(up || dn || lf || rt)) this.navT = 0;
      if (down(B.A)) {
        VX.Audio && VX.Audio.click && VX.Audio.click();
        if (el.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change', { bubbles: true })); }
        else el.click();
        // si el botón empieza la partida, el mando ya hace de «ratón capturado»
        setTimeout(() => { if (game.state === 'playing') I.locked = true; }, 0);
      }
      if (down(B.B) || (down(B.START) && game.state === 'paused')) {
        // volver: el botón de volver/continuar de la pantalla
        const back = items.find((e) => /back|Back|resume|Resume|cancel|close/.test(e.id) || /^(VOLVER|CONTINUAR|CERRAR)/.test((e.textContent || '').trim()));
        if (back) back.click();
        setTimeout(() => { if (game.state === 'playing') I.locked = true; }, 0);
      }
    },

    rumble(ms, strong) {
      const p = this.active && this.pad();
      const act = p && p.vibrationActuator;
      if (!act || !act.playEffect) return;
      try { act.playEffect('dual-rumble', { duration: Math.min(400, ms), strongMagnitude: strong ? 0.8 : 0.35, weakMagnitude: 0.6 }); } catch (e) { /* nada */ }
    },
  };

  // con el mando no hace falta capturar el ratón: la partida se considera «capturada»
  const lock0 = I.lock, unlock0 = I.unlock;
  I.lock = function () { if (Pad.active) { I.locked = true; return; } lock0(); };
  I.unlock = function () { if (Pad.active) { I.locked = false; Pad.release(); return; } unlock0(); };
  window.addEventListener('gamepadconnected', () => { if (VX.game && VX.game.hud) VX.game.hud.toast('Mando conectado'); });
  window.addEventListener('gamepaddisconnected', () => { Pad.release(); Pad.setActive(false); if (VX.game && VX.game.state === 'playing') VX.game.pause(); });
  // si vuelves al ratón o al teclado, el mando deja de mandar
  window.addEventListener('mousemove', (e) => { if (Pad.active && (Math.abs(e.movementX) + Math.abs(e.movementY) > 6)) Pad.setActive(false); });
  window.addEventListener('keydown', () => { if (Pad.active) Pad.setActive(false); });

  VX.Pad = Pad;
})();
