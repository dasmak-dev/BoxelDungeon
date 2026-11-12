// Pantalla de título, ajustes, pausa y fin de partida.
(function () {
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'settings', 'pause', 'gameover', 'armory', 'sanctuary'];

  const Menus = {
    settingsFrom: 'title',

    init(game) {
      this.game = game;
      const click = (id, fn) => $(id).addEventListener('click', () => { VX.Audio.init(); VX.Music.init(); VX.Audio.click(); fn(); });

      click('newBtn', () => game.newGame());
      click('continueBtn', () => { if (VX.Save.has()) game.continueGame(); });
      click('settingsBtn', () => this.openSettings('title'));
      click('armoryBtn', () => VX.Armory.open(game));
      click('armoryBack', () => VX.Armory.close());
      click('sanctuaryBtn', () => VX.Sanctuary.open());
      click('sanctuaryBack', () => this.showTitle());
      click('resumeBtn', () => game.resume());
      click('pauseSettingsBtn', () => this.openSettings('pause'));
      click('quitBtn', () => game.abandonRun());
      click('saveQuitBtn', () => game.saveAndQuit());
      click('gameoverSanctBtn', () => { game.quitToTitle(); VX.Sanctuary.open(); });
      click('restartBtn', () => game.newGame());
      click('toTitleBtn', () => game.quitToTitle());
      click('backSettingsBtn', () => this.show(this.settingsFrom));
      click('resetSettingsBtn', () => { VX.Settings.reset(); this.syncSettings(); });

      // clic en el canvas durante la partida = recapturar ratón
      $('game').addEventListener('click', () => {
        if (game.state === 'playing' && !VX.Input.locked) VX.Input.lock();
      });

      // controles de ajustes
      const S = VX.Settings;
      const bindRange = (id, key, fmt, valId) => {
        const el = $(id);
        el.addEventListener('input', () => { S.set(key, parseFloat(el.value)); $(valId).textContent = fmt(S.data[key]); });
      };
      const pct = (v) => Math.round(v * 100) + '%';
      bindRange('setMusic', 'music', pct, 'musicVal');
      bindRange('setSfx', 'sfx', pct, 'sfxVal');
      bindRange('setSens', 'sensitivity', (v) => v.toFixed(2) + 'x', 'sensVal');
      bindRange('setFov', 'fov', (v) => v + '°', 'fovVal');
      $('setQuality').addEventListener('change', (e) => S.set('quality', e.target.value));
      $('setShadows').addEventListener('change', (e) => S.set('shadows', e.target.checked));
      $('setInvert').addEventListener('change', (e) => S.set('invertY', e.target.checked));
      $('setFps').addEventListener('change', (e) => S.set('showFps', e.target.checked));

      // el primer gesto del usuario activa el audio (requisito del navegador)
      const unlock = () => {
        VX.Audio.init(); VX.Music.init(); VX.Settings.apply();
        if (VX.Audio.startAmbient) VX.Audio.startAmbient();
        $('audioHint').classList.add('hidden');
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);

      this.showTitle();
    },

    syncSettings() {
      const d = VX.Settings.data;
      $('setMusic').value = d.music; $('musicVal').textContent = Math.round(d.music * 100) + '%';
      $('setSfx').value = d.sfx; $('sfxVal').textContent = Math.round(d.sfx * 100) + '%';
      $('setSens').value = d.sensitivity; $('sensVal').textContent = d.sensitivity.toFixed(2) + 'x';
      $('setFov').value = d.fov; $('fovVal').textContent = d.fov + '°';
      $('setQuality').value = d.quality;
      $('setShadows').checked = d.shadows;
      $('setInvert').checked = d.invertY;
      $('setFps').checked = d.showFps;
    },

    openSettings(from) {
      this.settingsFrom = from;
      this.syncSettings();
      this.show('settings');
    },

    show(name) {
      for (const id of SCREENS) $(id).classList.toggle('hidden', id !== name);
    },

    hideAll() { this.show(null); },

    showTitle() {
      const save = VX.Save.peek();
      const btn = $('continueBtn');
      btn.disabled = !save;
      $('continueInfo').textContent = save ? `Piso ${save.floor} · ${save.stats.gold} oro` : 'Sin partida suspendida';
      $('versionTag').textContent = 'v' + VX.VERSION;
      $('essenceInfo').textContent = `Esencia: ${VX.Profile.data.essence || 0}`;
      this.show('title');
    },

    showGameOver(stats, floor, essence = 0) {
      const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
      $('stats').innerHTML =
        `Piso alcanzado: <b>${floor}</b><br>` +
        `Zombis eliminados: <b>${stats.kills}</b><br>` +
        `Cabezas reventadas: <b>${stats.headshots}</b><br>` +
        `Jefes derrotados: <b>${stats.bosses}</b><br>` +
        `Oro recogido: <b>${stats.totalGold}</b><br>` +
        `Precisión: <b>${acc}%</b><br>` +
        `<span style="color:#c99bff">Esencia obtenida: <b style="color:#c99bff">+${essence}</b> (total ${VX.Profile.data.essence})</span>`;
      this.show('gameover');
    },
  };

  VX.Menus = Menus;
})();
