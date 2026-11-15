// Controles táctiles (móvil y tableta): cruceta a la izquierda, botones a la derecha y
// arrastrar el dedo por la pantalla para apuntar. Escriben en VX.Input igual que el
// teclado y el ratón, así que el resto del juego no sabe si juega con dedos o con ratón.
(function () {
  const I = VX.Input;
  const LOOK_K = 2.4;   // píxeles de dedo → "píxeles de ratón"

  // botones: id, texto, acción (tecla, 'fire', 'aim', 'swap', 'run', 'pause', 'full')
  const BUTTONS = [
    ['fire', '', 'fire'],
    ['jump', 'SALTO', 'jump'],
    ['dash', 'ESQUIVA', 'dash'],
    ['reload', 'R', 'reload'],
    ['swap', 'ARMA', 'swap'],
    ['knife', 'CUCHILLO', 'knife'],
    ['throw', 'LANZAR', 'throw'],
    ['use', 'USAR', 'use'],
    ['aim', 'MIRILLA', 'aim'],
  ];
  const TOP = [
    ['pause', '❚❚', 'pause'],
    ['light', 'LUZ', 'flashlight'],
    ['map', 'MAPA', 'map'],
    ['tnext', 'OBJETO ⇄', 'throwNext'],
    ['wave', 'OLEADA', 'wave'],
    ['full', '⛶', 'full'],
  ];

  const Touch = {
    on: false,
    el: null,
    touches: new Map(),   // identifier → { role, key, x, y, cx, cy }
    run: false,
    padKeys: [],

    // ¿pantalla táctil sin ratón? (o forzado en Ajustes o con ?touch=1 en la URL)
    detect() {
      const q = new URLSearchParams(location.search).get('touch');
      if (q === '1') return true;
      if (q === '0') return false;
      const mode = (VX.Settings.data && VX.Settings.data.touchMode) || 'auto';
      if (mode === 'on') return true;
      if (mode === 'off') return false;
      const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      const fine = window.matchMedia && matchMedia('(any-pointer: fine)').matches;
      return !!coarse && !fine || (navigator.maxTouchPoints > 0 && !fine);
    },

    init(game) {
      this.game = game;
      this.build();
      this.apply();
    },

    // vuelve a mirar el ajuste (al cambiarlo en el menú)
    apply() {
      this.on = this.detect();
      document.body.classList.toggle('touch', this.on);
      if (VX.Renderer && VX.Renderer.quality) VX.Renderer.setQuality(VX.Renderer.quality, VX.Renderer.shadowsOn);   // recalcula el perfil (móvil)
      if (!this.on) this.releaseAll();
      this.applyLayout();
    },

    // ---- disposición personalizada (Ajustes → Controles → Colocar botones táctiles) ----
    // cada control se puede mover y cambiar de tamaño; se guarda como desplazamiento y escala
    parts() {
      const out = { pad: this.pad };
      for (const k in this.btn) if (!this.btn[k].closest('.ttop')) out[k] = this.btn[k];
      return out;
    },
    applyLayout() {
      if (!this.el) return;
      const L = VX.Settings.data.touchLayout || {}, P = this.parts();
      for (const k in P) {
        const v = L[k] || {};
        P[k].style.setProperty('--dx', (v.dx || 0) + 'px');
        P[k].style.setProperty('--dy', (v.dy || 0) + 'px');
        P[k].style.setProperty('--s', v.s || 1);
      }
      this.el.style.setProperty('--ta', VX.Settings.data.touchAlpha ?? 1);
    },
    editLayout() {
      const S = VX.Settings;
      const L = S.data.touchLayout = JSON.parse(JSON.stringify(S.data.touchLayout || {}));
      this.editing = true; this.releaseAll();
      const ov = document.createElement('div');
      ov.id = 'touchEdit';
      ov.innerHTML = `<div class="teBar"><b>Arrastra cada control a donde quieras</b><span class="teSel">Toca uno para elegirlo</span>
        <button class="small secondary teMinus">TAMAÑO −</button><button class="small secondary tePlus">TAMAÑO +</button>
        <label>Opacidad <input type="range" class="teAlpha" min="0.25" max="1" step="0.05"></label>
        <button class="small secondary teReset">RESTAURAR</button><button class="small teDone">LISTO</button></div>`;
      document.body.appendChild(ov);
      this.homeParent = this.el.parentNode;
      ov.appendChild(this.el);
      document.body.classList.add('touchEditing');
      const P = this.parts();
      let sel = null, drag = null;
      const select = (k) => { sel = k; for (const q in P) P[q].classList.toggle('teOn', q === k); ov.querySelector('.teSel').textContent = 'Elegido: ' + ({ pad: 'cruceta', fire: 'disparo', run: 'correr' }[k] || (P[k].textContent || k).trim().toLowerCase()); };
      const down = (k) => (e) => {
        e.preventDefault(); e.stopPropagation();
        select(k);
        const v = L[k] || (L[k] = {});
        const pt = e.touches ? e.touches[0] : e;
        drag = { k, x: pt.clientX, y: pt.clientY, dx: v.dx || 0, dy: v.dy || 0 };
      };
      const move = (e) => {
        if (!drag) return;
        e.preventDefault();
        const pt = e.touches ? e.touches[0] : e, v = L[drag.k];
        v.dx = Math.round(drag.dx + pt.clientX - drag.x); v.dy = Math.round(drag.dy + pt.clientY - drag.y);
        this.applyLayout();
      };
      const up = () => { drag = null; };
      this.editHandlers = [];
      for (const k in P) for (const ev of ['mousedown', 'touchstart']) { const h = down(k); P[k].addEventListener(ev, h, { passive: false }); this.editHandlers.push([P[k], ev, h]); }
      for (const [ev, h] of [['mousemove', move], ['touchmove', move], ['mouseup', up], ['touchend', up]]) { window.addEventListener(ev, h, { passive: false }); this.editHandlers.push([window, ev, h]); }
      const size = (f) => { if (!sel) return; const v = L[sel] || (L[sel] = {}); v.s = Math.max(0.6, Math.min(1.8, Math.round(((v.s || 1) + f) * 100) / 100)); this.applyLayout(); };
      ov.querySelector('.teMinus').onclick = () => size(-0.1);
      ov.querySelector('.tePlus').onclick = () => size(0.1);
      const al = ov.querySelector('.teAlpha'); al.value = S.data.touchAlpha ?? 1;
      al.oninput = () => { S.data.touchAlpha = +al.value; this.applyLayout(); };
      ov.querySelector('.teReset').onclick = () => { for (const k in L) delete L[k]; S.data.touchAlpha = 1; al.value = 1; this.applyLayout(); };
      ov.querySelector('.teDone').onclick = () => this.endEdit();
    },
    endEdit() {
      const ov = document.getElementById('touchEdit');
      for (const [el, ev, h] of this.editHandlers || []) el.removeEventListener(ev, h);
      this.editHandlers = null;
      for (const b of this.el.querySelectorAll('.teOn')) b.classList.remove('teOn');
      if (this.homeParent) this.homeParent.appendChild(this.el);
      if (ov) ov.remove();
      document.body.classList.remove('touchEditing');
      this.editing = false;
      VX.Settings.save();
      this.applyLayout();
    },

    build() {
      const hud = document.getElementById('hud');
      const el = document.createElement('div');
      el.id = 'touchUI';
      let h = '<div class="tpad" data-role="pad"><div class="tarm up">▲</div><div class="tarm dn">▼</div><div class="tarm lf">◀</div><div class="tarm rt">▶</div><div class="tknob"></div></div>';
      h += '<button class="tbtn trun" data-act="run">CORRER</button>';
      for (const [id, txt, act] of BUTTONS) h += `<button class="tbtn t-${id}" data-act="${act}">${txt}</button>`;
      h += '<div class="ttop">' + TOP.map(([id, txt, act]) => `<button class="tbtn t-${id}" data-act="${act}">${txt}</button>`).join('') + '</div>';
      el.innerHTML = h;
      hud.appendChild(el);
      this.el = el;
      this.pad = el.querySelector('.tpad');
      this.knob = el.querySelector('.tknob');
      this.btn = {};
      for (const b of el.querySelectorAll('[data-act]')) this.btn[b.className.match(/t-(\w+)|trun/)[1] || 'run'] = b;

      const opt = { passive: false };
      el.addEventListener('touchstart', (e) => this.onStart(e), opt);
      el.addEventListener('touchmove', (e) => this.onMove(e), opt);
      el.addEventListener('touchend', (e) => this.onEnd(e), opt);
      el.addEventListener('touchcancel', (e) => this.onEnd(e), opt);
      // gira el móvil
      const rot = document.createElement('div');
      rot.id = 'rotateHint';
      rot.innerHTML = '<div>⟳</div><p>Gira el móvil en horizontal para jugar</p>';
      document.body.appendChild(rot);
    },

    onStart(e) {
      if (this.editing) return;   // colocando los botones: no se juega
      e.preventDefault();
      this.fullscreenOnce();
      for (const t of e.changedTouches) {
        const target = document.elementFromPoint(t.clientX, t.clientY) || t.target;
        const b = target.closest && target.closest('[data-act]');
        const pad = target.closest && target.closest('.tpad');
        const s = { role: 'look', x: t.clientX, y: t.clientY };
        if (pad) { s.role = 'pad'; this.padMove(t.clientX, t.clientY); }
        else if (b) { s.role = 'btn'; s.act = b.dataset.act; s.el = b; b.classList.add('down'); this.press(s.act); }
        this.touches.set(t.identifier, s);
      }
    },

    onMove(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier);
        if (!s) continue;
        if (s.role === 'pad') { this.padMove(t.clientX, t.clientY); continue; }
        // apuntar: con el dedo libre y también arrastrando desde disparo o mirilla
        if (s.role === 'look' || s.act === 'fire' || s.act === 'aim') {
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          const k = LOOK_K * this.sens() * (this.friction || 1);   // sobre un enemigo la mira se frena (apuntado asistido)
          if (Math.abs(dx) < 200 && Math.abs(dy) < 200) { I.dx += dx * k; I.dy += dy * k; this.lookMoved = true; }
        }
        s.x = t.clientX; s.y = t.clientY;
      }
    },

    onEnd(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier);
        if (!s) continue;
        this.touches.delete(t.identifier);
        if (s.role === 'pad') this.padRelease();
        else if (s.role === 'btn') { s.el.classList.remove('down'); this.release(s.act); }
      }
    },

    sens() { return (VX.Settings.data.touchSens || 1); },

    // cruceta de 8 direcciones; empujar más allá del borde hacia delante = correr
    padMove(x, y) {
      const r = this.pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      const keys = [];
      if (d > R * 0.22) {
        const a = Math.atan2(-dy, dx);   // 0 = derecha, π/2 = arriba
        const sec = Math.round(a / (Math.PI / 4));   // -4..4
        const K = (a) => VX.Settings.key(a), W = K('fwd'), S = K('back'), A = K('left'), D = K('right');
        const dirs = { 0: [D], 1: [W, D], 2: [W], 3: [W, A], 4: [A], '-4': [A], '-3': [S, A], '-2': [S], '-1': [S, D] };
        keys.push(...dirs[sec]);
      }
      const sprint = d > R * 1.15 && keys.includes(VX.Settings.key('fwd'));
      this.setPad(keys, sprint);
      const k = Math.min(1, d / R);
      const m = d > 0 ? (k * R * 0.55) / d : 0;
      this.knob.style.transform = `translate(${dx * m}px, ${dy * m}px)`;
      this.pad.classList.toggle('sprint', sprint);
    },

    padRelease() { this.setPad([], false); this.knob.style.transform = ''; this.pad.classList.remove('sprint'); },

    setPad(keys, sprint) {
      for (const k of this.padKeys) if (!keys.includes(k)) I.keys[k] = false;
      for (const k of keys) { if (!I.keys[k]) I.pressed[k] = true; I.keys[k] = true; }
      this.padKeys = keys;
      // con "Correr siempre" de los ajustes ya se corre: Shift serviría para andar, así que no se toca
      I.keys[VX.Settings.key('run')] = !VX.Settings.data.autoRun && (this.run || sprint);
      for (const a of ['up', 'dn', 'lf', 'rt']) this.pad.querySelector('.' + a).classList.toggle('on', keys.includes(VX.Settings.key({ up: 'fwd', dn: 'back', lf: 'left', rt: 'right' }[a])));
    },

    key(code, down) {
      if (down) { if (!I.keys[code]) I.pressed[code] = true; I.keys[code] = true; } else I.keys[code] = false;
    },

    press(act) {
      switch (act) {
        case 'fire': I.mouseDown = true; I.mouseClicked = true; break;
        case 'aim': I.rightDown = true; break;
        case 'swap': I.wheel += 1; break;
        case 'run': this.run = !this.run; this.btn.run.classList.toggle('lit', this.run); this.setPad(this.padKeys, false); break;
        case 'pause': if (this.game.state === 'playing') this.game.pause(); break;
        case 'full': this.toggleFullscreen(); break;
        case 'flashlight': this.key(VX.Settings.key('flashlight'), true); break;
        case 'knife': this.key(VX.Settings.key('knife'), true); break;
        case 'throw': case 'throwNext': this.key(VX.Settings.key(act), true); break;
        default: this.key(VX.Settings.key(act) || act, true);
      }
    },

    release(act) {
      switch (act) {
        case 'fire': I.mouseDown = false; break;
        case 'aim': I.rightDown = false; break;
        case 'flashlight': this.key(VX.Settings.key('flashlight'), false); break;
        case 'knife': this.key(VX.Settings.key('knife'), false); break;
        case 'throw': case 'throwNext': this.key(VX.Settings.key(act), false); break;
        case 'swap': case 'run': case 'pause': case 'full': break;
        default: this.key(VX.Settings.key(act) || act, false);
      }
    },

    releaseAll() {
      for (const s of this.touches.values()) if (s.role === 'btn') { s.el.classList.remove('down'); this.release(s.act); }
      this.touches.clear();
      if (this.pad) this.padRelease();
      I.mouseDown = false; I.rightDown = false;
    },

    // pantalla completa y horizontal al primer toque de la partida (el navegador exige un gesto)
    fullscreenOnce() {
      if (this.triedFull) return;
      this.triedFull = true;
      if (!document.fullscreenElement) this.toggleFullscreen();
    },

    toggleFullscreen() {
      const d = document, de = d.documentElement;
      try {
        if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
        const req = de.requestFullscreen || de.webkitRequestFullscreen;
        if (!req) return;
        const p = req.call(de, { navigationUI: 'hide' });
        const lockOr = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) { /* nada */ } };
        if (p && p.then) p.then(lockOr).catch(() => {}); else lockOr();
      } catch (e) { /* nada */ }
    },

    // Apuntado asistido: con el dedo apuntar es más difícil que con el ratón. Si la mira pasa
    // cerca de un enemigo, el giro se frena (más fácil quedarse encima) y la mira se arrastra un
    // poco hacia él, sólo mientras mueves el dedo o disparas (nunca apunta sola).
    assist(game, dt, padLooking) {
      this.friction = 1;
      const S = VX.Settings.data;
      if (S.aimAssist === false || !dt) return;
      let looking = false;
      for (const s of this.touches.values()) if (s.role === 'look' || s.act === 'fire' || s.act === 'aim') looking = true;
      if (padLooking) looking = true;
      const firing = I.mouseDown;
      if (!looking && !firing) { this.lookMoved = false; return; }
      const P = game.player, W = game.weapon, st = W.stats();
      const range = st.melee ? 4 : Math.min(60, st.range || 30);
      const ex = P.eyeX(), ey = P.eyeY(), ez = P.eyeZ();
      const cp = Math.cos(P.pitch), fx = Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = Math.cos(P.yaw) * cp;
      let best = null, bestScore = 1;
      for (const e of game.enemies) {
        if (e.dead || (e.spawnT && e.spawnT > 0.4)) continue;
        const b = e.body, tx = b.cx !== undefined ? b.cx : e.x, ty = b.cy !== undefined ? b.cy : e.y + 1.1, tz = b.cz !== undefined ? b.cz : e.z;
        const dx = tx - ex, dy = ty - ey, dz = tz - ez, d = Math.hypot(dx, dy, dz);
        if (d > range || d < 0.5) continue;
        const dot = (dx * fx + dy * fy + dz * fz) / d;
        if (dot < 0.9) continue;
        const ang = Math.acos(Math.min(1, dot));
        const cone = Math.max(0.05, Math.min(0.2, (e.isBoss ? 2.2 : 0.9) / d));   // más ancho de cerca
        const score = ang / cone;
        if (score < bestScore && game.world.lineOfSight(ex, ey, ez, tx, ty, tz)) { bestScore = score; best = { tx, ty, tz, d }; }
      }
      if (!best) return;
      this.friction = 0.45 + 0.4 * bestScore;
      if (!this.lookMoved && !firing) return;
      // imán: un poco hacia el centro del enemigo
      const dx = best.tx - ex, dy = best.ty - ey, dz = best.tz - ez;
      let dyaw = Math.atan2(dx, dz) - P.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const dpit = Math.atan2(dy, Math.hypot(dx, dz)) - P.pitch;
      const k = Math.min(1, dt * 5) * 0.35 * (1 - bestScore * 0.6);
      P.yaw += dyaw * k;
      P.pitch += dpit * k * 0.6;
      this.lookMoved = false;
    },

    // cada frame: qué botones tienen sentido ahora
    update(game, dt) {
      if (!this.on) return;
      if (game.state !== 'playing') { if (this.touches.size) this.releaseAll(); return; }
      this.assist(game, dt);
      const B = this.btn, W = game.weapon, slot = W && W.slot;
      const show = (b, v) => { if (b && b._v !== v) { b._v = v; b.classList.toggle('hidden', !v); } };
      show(B.aim, !!slot && slot.id === 'rifle');
      show(B.map, game.mode !== 'horde');
      show(B.wave, game.mode === 'horde' && VX.HordeMode && VX.HordeMode.phase !== 'wave');
      const pr = document.getElementById('prompt');
      const canUse = (pr && !pr.classList.contains('hidden')) || !!game.coopPrompt;
      if (B.use && B.use._lit !== canUse) { B.use._lit = canUse; B.use.classList.toggle('lit', canUse); }
      show(B.reload, !!slot && !(W.stats && W.stats().melee));
    },
  };

  // sin ratón no hay pointer lock: la partida se considera "capturada" mientras se juega
  const lock0 = I.lock, unlock0 = I.unlock;
  I.lock = function () { if (Touch.on) { I.locked = true; return; } lock0(); };
  I.unlock = function () { if (Touch.on) { I.locked = false; Touch.releaseAll(); return; } unlock0(); };

  VX.Touch = Touch;

  // Vibración del móvil (Android; iPhone no la permite en el navegador)
  const Haptics = {
    last: 0,
    buzz(ms, force) {
      if (VX.Pad && VX.Pad.active) { if (VX.Settings.data.vibrate !== false) VX.Pad.rumble(Array.isArray(ms) ? ms.reduce((a, b) => a + b, 0) : ms, (Array.isArray(ms) ? 300 : ms) > 120); return; }
      if (!force && (!Touch.on || VX.Settings.data.vibrate === false)) return;
      if (!navigator.vibrate) return;
      const now = performance.now();
      if (!force && !Array.isArray(ms) && now - this.last < 70) return;   // no saturar con las armas automáticas
      this.last = now;
      try { navigator.vibrate(ms); } catch (e) { /* nada */ }
    },
  };
  VX.Haptics = Haptics;
})();
