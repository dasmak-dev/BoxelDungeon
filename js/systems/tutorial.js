// Tutorial corto: la primera partida en la mazmorra, en la sala de salida, una ventanita va
// pidiendo cosas de una en una (moverse, mirar, disparar, recargar, esquivar, cuchillo, lanzar,
// coger una llave) y pasa a la siguiente en cuanto lo haces. Se puede saltar y repetir desde Ajustes.
(function () {
  const K = (a) => VX.Settings.tag(a);
  const pad = (a) => (VX.Pad && VX.Pad.active ? ' / ' + VX.Pad.btnName(VX.Pad.btnOf(a)) : '');
  const touch = () => VX.Touch && VX.Touch.on;
  const STEPS = [
    { t: 'Muévete', d: () => touch() ? 'Usa la cruceta de la izquierda' : `${K('fwd')}${K('left')}${K('back')}${K('right')}${VX.Pad && VX.Pad.active ? ' / stick izquierdo' : ''}`, ok: (g, s) => Math.hypot(g.player.x - s.x0, g.player.z - s.z0) > 3 },
    { t: 'Mira a tu alrededor', d: () => touch() ? 'Arrastra el dedo por la pantalla' : 'Mueve el ratón' + (VX.Pad && VX.Pad.active ? ' / stick derecho' : ''), ok: (g, s) => s.look > 2.2 },
    { t: 'Dispara', d: () => touch() ? 'Botón rojo grande' : 'Clic izquierdo' + pad('fire'), ok: (g, s) => g.stats.shots > s.shots0 },
    { t: 'Recarga', d: () => touch() ? 'Botón R' : K('reload') + pad('reload'), ok: (g, s) => s.reload || g.weapon.reloading },
    { t: 'Esquiva', d: () => (touch() ? 'Botón ESQUIVA' : K('dash') + pad('dash')) + ' — mientras esquivas no te hacen daño', ok: (g, s) => s.dash },
    { t: 'Cuchillazo rápido', d: () => (touch() ? 'Botón CUCHILLO' : K('knife') + pad('knife')) + ' — no gasta balas', ok: (g, s) => s.knife },
    { t: 'Lanza una granada', d: () => (touch() ? 'Botón LANZAR' : K('throw') + pad('throw')) + ' — te dejamos una de regalo', ok: (g, s) => s.toss, enter: (g) => VX.Throw.give(g, 'frag', 1, true) },
    { t: 'Coge la llave', d: () => `Acércate y pulsa ${touch() ? 'USAR' : K('use') + pad('use')}`, ok: (g) => (g.keys.wood || 0) + (g.keys.silver || 0) + (g.keys.gold || 0) > 0,
      enter: (g) => { const P = g.player; g.dropKey('wood', P.x + Math.sin(P.yaw) * 2.2, P.y + 1.2, P.z + Math.cos(P.yaw) * 2.2); } },
    { t: 'Las llaves', d: () => 'Abren las cerraduras doradas de las paredes, las puertas doradas y el Relicario del vendedor', ok: (g, s) => s.t > 6 },
    { t: '¡Listo!', d: () => 'Acércate a una puerta y ábrela. Mata a todos para que se abran las salidas. ¡Suerte!', ok: (g, s) => s.t > 5 },
  ];

  const Tutorial = {
    // ¿le toca? (primera partida, o si se pidió repetirlo)
    // ¿le toca? la primera partida de un perfil nuevo, o si se ha pedido repetirlo en Ajustes
    want() { const D = VX.Profile.data; if (VX.Coop.active) return false; return D.tutorialDone === false || (D.tutorialDone === undefined && !(D.runs > 0)); },
    start(game) {
      if (!this.want()) { this.s = null; this.box(false); return; }
      const P = game.player;
      this.s = { i: -1, x0: P.x, z0: P.z, yaw0: P.yaw, look: 0, shots0: game.stats.shots, t: 0 };
      this.next(game);
    },
    next(game) {
      const s = this.s;
      s.i++; s.t = 0; s.dash = s.knife = s.toss = s.reload = false;
      const P = game.player; s.x0 = P.x; s.z0 = P.z; s.look = 0; s.shots0 = game.stats.shots;
      if (s.i >= STEPS.length) { this.finish(game); return; }
      const st = STEPS[s.i];
      if (st.enter) st.enter(game);
      if (s.i > 0) VX.Audio.click && VX.Audio.click();
      this.box(true);
    },
    finish(game) {
      this.s = null; this.box(false);
      VX.Profile.data.tutorialDone = true; VX.Profile.save();
    },
    skip(game) { this.finish(game); game.hud.toast('Tutorial saltado (puedes repetirlo en Ajustes → Perfil)'); },
    update(game, dt) {
      const s = this.s;
      if (!s || game.state !== 'playing' || game.mode !== 'dungeon') return;
      const I = VX.Input, k = (a) => I.wasPressed(VX.Settings.key(a));
      s.t += dt;
      const P = game.player;
      let dy = P.yaw - (s.lastYaw ?? P.yaw); while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      s.look += Math.abs(dy) + Math.abs(P.pitch - (s.lastPitch ?? P.pitch)); s.lastYaw = P.yaw; s.lastPitch = P.pitch;
      if (k('dash')) s.dash = true;
      if (k('reload')) s.reload = true;
      if (k('knife')) s.knife = true;
      if (k('throw')) s.toss = true;
      if (STEPS[s.i].ok(game, s) && s.t > 0.4) this.next(game);
      // si se va de la sala de salida, se da por hecho
      else if (game.currentRoom && game.currentRoom.rid !== undefined && game.currentRoom.type !== 'start') this.finish(game);
    },
    box(show) {
      let el = document.getElementById('tutBox');
      if (!show) { if (el) el.classList.add('hidden'); return; }
      if (!el) {
        el = document.createElement('div'); el.id = 'tutBox';
        el.innerHTML = '<div class="tutN"></div><div class="tutT"></div><div class="tutD"></div><button class="small secondary tutSkip">SALTAR TUTORIAL</button>';
        document.getElementById('hud').appendChild(el);
        const sk = (e) => { e.preventDefault(); e.stopPropagation(); this.skip(VX.game); };
        el.querySelector('.tutSkip').addEventListener('click', sk);
        el.querySelector('.tutSkip').addEventListener('touchstart', sk, { passive: false });
      }
      const s = this.s, st = STEPS[s.i];
      el.querySelector('.tutN').textContent = `TUTORIAL · ${s.i + 1} / ${STEPS.length}`;
      el.querySelector('.tutT').textContent = st.t;
      el.querySelector('.tutD').textContent = st.d();
      el.classList.remove('hidden');
    },
    reset() { VX.Profile.data.tutorialDone = false; VX.Profile.save(); },
  };

  VX.Tutorial = Tutorial;
})();
