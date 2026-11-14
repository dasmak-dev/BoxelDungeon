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
  VX.Menus.init(game);
  VX.Touch.init(game);

  VX.Input.onLockChange = (locked) => {
    if (!locked && game.state === 'playing') game.pause();
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === VX.Settings.key('pause') && game.state === 'playing') { VX.Input.unlock(); game.pause(); }
  });

  // Si el juego deja de verse (otra pestaña, minimizado, otra ventana encima) se calla y se pausa.
  // En el cooperativo la partida sigue (no se puede parar a los demás), pero tampoco suena.
  const away = () => { VX.Audio.setHidden && VX.Audio.setHidden(true); if (game.state === 'playing') { VX.Input.unlock(); game.pause(); } };
  const back = () => { if (!document.hidden) VX.Audio.setHidden && VX.Audio.setHidden(false); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else back(); });
  window.addEventListener('blur', away);
  window.addEventListener('focus', back);
  window.addEventListener('pagehide', away);

  // Calidad automática: si los FPS caen de forma sostenida, baja un escalón (y vuelve a subir si sobra)
  const LEVELS = ['baja', 'media', 'alta'];
  const AQ = { t: 0, frames: 0, low: 0, high: 0, level: null };
  function autoQuality(realDt) {
    const S = VX.Settings.data;
    if (!S.autoQuality || game.state !== 'playing') { AQ.t = 0; AQ.frames = 0; return; }
    const cap = LEVELS.indexOf(S.quality);
    if (AQ.level === null || AQ.level > cap) AQ.level = cap;
    AQ.t += realDt; AQ.frames++;
    if (AQ.t < 2) return;
    const fps = AQ.frames / AQ.t;
    AQ.t = 0; AQ.frames = 0;
    const tgt = S.fpsCap || 60;   // con límite de FPS, "ir bien" es llegar a ese límite
    if (fps < tgt * 0.7) { AQ.low++; AQ.high = 0; } else if (fps > tgt * 0.96) { AQ.high++; AQ.low = 0; } else { AQ.low = 0; AQ.high = 0; }
    if (AQ.low >= 2 && AQ.level > 0) {
      AQ.level--; AQ.low = 0;
      VX.Renderer.setQuality(LEVELS[AQ.level], S.shadows);
      VX.Renderer.setPost(S.bloom && AQ.level > 0, S.ssao && AQ.level > 1);
      game.hud.toast(`Calidad automática: ${LEVELS[AQ.level]} (${Math.round(fps)} FPS)`);
    } else if (AQ.high >= 8 && AQ.level < cap) {
      AQ.level++; AQ.high = 0;
      VX.Renderer.setQuality(LEVELS[AQ.level], S.shadows);
      VX.Renderer.setPost(S.bloom && AQ.level > 0, S.ssao && AQ.level > 1);
    }
  }
  VX.resetAutoQuality = () => { AQ.level = null; };

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
    const cap = VX.Settings.data.fpsCap;
    if (cap && now - last < 1000 / cap - 2) { requestAnimationFrame(loop); return; }
    const realDt = (now - last) / 1000;
    const dt = Math.min(0.05, realDt);
    last = now;
    if (realDt < 1) autoQuality(realDt);
    try {
      game.update(dt);
      VX.Touch.update(game, dt);
      game.render();
    } catch (e) { console.error(e); }
    VX.Input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
