// Partida guardada de versiones antiguas (ya no se puede suspender): sólo se comprueba si queda y se borra.
(function () {
  const KEY = 'boxel_save_v1';

  const Save = {
    has() {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },

    clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
  };

  VX.Save = Save;
})();
