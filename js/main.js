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
    if (e.code === 'KeyP' && game.state === 'playing') { VX.Input.unlock(); game.pause(); }
  });

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
    if (fps < 42) { AQ.low++; AQ.high = 0; } else if (fps > 58) { AQ.high++; AQ.low = 0; } else { AQ.low = 0; AQ.high = 0; }
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

  let last = performance.now();
  function loop(now) {
    const realDt = (now - last) / 1000;
    const dt = Math.min(0.05, realDt);
    last = now;
    if (realDt < 1) autoQuality(realDt);
    try {
      game.update(dt);
      VX.Touch.update(game);
      game.render();
    } catch (e) { console.error(e); }
    VX.Input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
