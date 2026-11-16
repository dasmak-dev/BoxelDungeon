// Punto de entrada: inicializa sistemas y arranca el bucle principal.
(function () {
  const canvas = document.getElementById('game');
  VX.Settings.load();
  VX.Profile.load();

  let ok = false;
  try { ok = VX.Renderer.init(canvas); } catch (e) { console.error(e); ok = false; }
  if (!ok) {
    document.getElementById('title').classList.add('hidden');
    document.getElementById('noWebgl').classList.remove('hidden');
    return;
  }

  VX.Input.init(canvas);
  VX.HUD.init();
  VX.Settings.apply();
  const game = new VX.Game();
  VX.game = game; // accesible desde la consola para depurar
  VX.onLimb = (body) => game.noteLimb(body);   // objetivos: brazos y piernas arrancados
  if (new URLSearchParams(location.search).get('test') === '1') setTimeout(() => { VX.Menus.hideAll(); VX.SelfTest.run(game); }, 1500);   // modo de pruebas
  if (new URLSearchParams(location.search).get('test') === 'all') setTimeout(() => { VX.Menus.hideAll(); VX.SmokeTest.run(game); }, 1500);   // prueba de todos los modos
  VX.Menus.init(game);
  VX.Touch.init(game);

  VX.Input.onLockChange = (locked) => {
    if (!locked && game.state === 'playing' && !VX.testing) game.pause();
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === VX.Settings.key('pause') && game.state === 'playing') { VX.Input.unlock(); game.pause(); }
  });

  // Si el juego deja de verse (otra pestaña, minimizado, otra ventana encima) se calla y se pausa.
  // En el cooperativo la partida sigue (no se puede parar a los demás), pero tampoco suena.
  const away = () => { VX.Audio.setHidden && VX.Audio.setHidden(true); if (game.state === 'playing' && !VX.testing) { VX.Input.unlock(); game.pause(); } };
  const back = () => { if (!document.hidden) VX.Audio.setHidden && VX.Audio.setHidden(false); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else back(); });
  window.addEventListener('blur', away);
  window.addEventListener('focus', back);
  window.addEventListener('pagehide', away);

  // Calidad automática por escalones finos: si los FPS caen, se quita primero lo que menos se nota
  // (oclusión, resplandor, polvo, niebla, sombras de antorchas…) y sólo al final se baja la
  // resolución y el nivel de calidad. Si sobra margen durante un rato, se devuelve paso a paso.
  const STEPS = [
    { label: 'completa' },
    { label: 'sin oclusión ambiental', ssao: 0 },
    { label: 'sin resplandor', bloom: 0 },
    { label: 'sin polvo ni niebla baja', dust: 0, gf: 0 },
    { label: 'menos partículas', part: 0.65 },
    { label: 'resolución 90 %', scale: 0.9 },
    { label: 'sin sombras de antorchas', torch: 0 },
    { label: 'resolución 80 %', scale: 0.8 },
    { label: 'sin sombras', shadows: 0 },
    { label: 'calidad media', q: 'media' },
    { label: 'calidad media · 85 %', q: 'media', scale: 0.85 },
    { label: 'calidad baja', q: 'baja' },
  ];
  const AQ = { t: 0, frames: 0, low: 0, high: 0, step: 0 };
  // lo que dice el escalón actual, sobre los ajustes que ha elegido el jugador
  function applyStep(n) {
    const S = VX.Settings.data, R = VX.Renderer;
    const has = (k) => STEPS.slice(1, n + 1).some((s) => s[k] !== undefined);
    const last = (k, d) => { let v = d; for (let i = 1; i <= n; i++) if (STEPS[i][k] !== undefined) v = STEPS[i][k]; return v; };
    const order = ['baja', 'media', 'alta'];
    const q = order[Math.min(order.indexOf(S.quality), order.indexOf(last('q', S.quality)))];
    VX.AQoff = { dust: has('dust'), gf: has('gf'), torch: has('torch') };
    R.setQuality(q, S.shadows && !has('shadows'));
    R.setPost(S.bloom && !has('bloom') && q !== 'baja', S.ssao && !has('ssao') && q === 'alta');
    if (VX.Q) VX.Q.particles *= has('part') ? 0.65 : 1;
    const sc = last('scale', 1);
    if (sc < 1) { R.renderScale *= sc; R.resize(); }
  }
  function autoQuality(realDt) {
    const S = VX.Settings.data;
    if (!S.autoQuality || game.state !== 'playing') { AQ.t = 0; AQ.frames = 0; return; }
    AQ.t += realDt; AQ.frames++;
    if (AQ.t < 1.5) return;
    const fps = AQ.frames / AQ.t;
    AQ.t = 0; AQ.frames = 0;
    const tgt = S.batterySaver ? 30 : S.fpsCap || 60;   // con límite de FPS, "ir bien" es llegar a ese límite
    if (fps < tgt * 0.8) { AQ.low++; AQ.high = 0; } else if (fps > tgt * 0.96) { AQ.high++; AQ.low = 0; } else { AQ.low = 0; AQ.high = 0; }
    if (AQ.low >= 2 && AQ.step < STEPS.length - 1) {
      // muy por debajo: salta dos escalones de golpe
      AQ.step = Math.min(STEPS.length - 1, AQ.step + (fps < tgt * 0.5 ? 2 : 1)); AQ.low = 0;
      applyStep(AQ.step);
      game.hud.toast(`Calidad automática: ${STEPS[AQ.step].label} (${Math.round(fps)} FPS)`);
    } else if (AQ.high >= 6 && AQ.step > 0) {
      AQ.step--; AQ.high = 0;
      applyStep(AQ.step);
    }
  }
  VX.resetAutoQuality = () => { AQ.step = 0; VX.AQoff = null; };
  // con poca batería y sin cargar, se sugiere (una vez) el modo de ahorro
  if (navigator.getBattery) navigator.getBattery().then((b) => {
    const check = () => { if (!VX.Settings.data.batterySaver && !b.charging && b.level <= 0.2 && !VX.saverHinted) { VX.saverHinted = true; game.hud.toast('Batería baja: activa «Ahorro de batería» en Ajustes → Gráficos'); } };
    b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check); check();
  }).catch(() => {});

  // Instalable (PWA): service worker y botón «Instalar» en el menú
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  const installBtn = document.getElementById('installBtn');
  const standalone = window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) || navigator.standalone;
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (installBtn) installBtn.classList.remove('hidden'); });
  window.addEventListener('appinstalled', () => { deferredInstall = null; if (installBtn) installBtn.classList.add('hidden'); });
  // iPhone/iPad: Safari no avisa; se explica cómo hacerlo a mano
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (installBtn && iOS && !standalone) { installBtn.classList.remove('hidden'); document.getElementById('installInfo').textContent = 'En Safari: Compartir → «Añadir a pantalla de inicio»'; }
  if (installBtn) installBtn.addEventListener('click', async () => {
    VX.Audio.click && VX.Audio.click();
    if (deferredInstall) { deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* nada */ } deferredInstall = null; installBtn.classList.add('hidden'); }
    else if (iOS) game.hud.toast('En Safari pulsa Compartir y luego «Añadir a pantalla de inicio»');
  });

  let last = performance.now();
  function loop(now) {
    // límite de FPS (30 o 60): se salta los refrescos de pantalla que sobran
    // ahorro de batería: 30 FPS. En los menús (título, pausa, ajustes…) también 30: no hace falta más y así
    // la tarjeta gráfica no va a tope (con FPS sin límite podía zumbar o acelerar el ventilador al cargar)
    const menu = game.state !== 'playing' && game.state !== 'dying';
    const cap = VX.Settings.data.batterySaver || menu ? 30 : VX.Settings.data.fpsCap;
    if (cap && now - last < 1000 / cap - 2) { requestAnimationFrame(loop); return; }
    const realDt = (now - last) / 1000;
    const dt = Math.min(0.05, realDt);
    last = now;
    if (realDt < 1) autoQuality(realDt);
    try {
      VX.Pad.poll(dt, game);
      game.update(dt);
      VX.Touch.update(game, dt);
      game.render();
    } catch (e) { console.error(e); }
    VX.Input.endFrame();
    VX.Pad.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Con la ventana minimizada o en otra pestaña el navegador deja de llamar a requestAnimationFrame.
  // En el cooperativo eso congelaba la partida de todos si era el anfitrión (y al invitado lo dejaba
  // quieto). Un «reloj» en un worker (que el navegador no frena tanto) sigue moviendo el juego, sin dibujar.
  try {
    const src = 'let t=null;onmessage=(e)=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),50);};';
    const tick = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    let hidLast = 0;
    tick.onmessage = () => {
      if (!document.hidden || !VX.Coop.active) return;
      const now = performance.now();
      let realDt = (now - (hidLast || now - 50)) / 1000;
      hidLast = now; last = now;
      realDt = Math.min(realDt, 0.5);
      try {
        while (realDt > 0.0001) { const step = Math.min(0.05, realDt); game.update(step); realDt -= step; }
      } catch (e) { console.error(e); }
      VX.Input.endFrame();
    };
    document.addEventListener('visibilitychange', () => { hidLast = 0; tick.postMessage(document.hidden ? 1 : 0); });
  } catch (e) { /* sin workers: como antes */ }
})();
