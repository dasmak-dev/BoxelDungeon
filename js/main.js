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

  VX.Input.onLockChange = (locked) => {
    if (!locked && game.state === 'playing') game.pause();
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && game.state === 'playing') { VX.Input.unlock(); game.pause(); }
  });

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      game.update(dt);
      game.render();
    } catch (e) { console.error(e); }
    VX.Input.endFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
