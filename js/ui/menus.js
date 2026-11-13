// Pantalla de título, ajustes, pausa y fin de partida.
(function () {
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'settings', 'pause', 'gameover', 'armory', 'sanctuary', 'codex', 'hordeSelect'];

  const Menus = {
    settingsFrom: 'title',

    init(game) {
      this.game = game;
      const click = (id, fn) => $(id).addEventListener('click', () => { VX.Audio.init(); VX.Music.init(); VX.Audio.click(); fn(); });

      click('newBtn', () => game.newGame());
      click('hordeBtn', () => this.showHorde());
      click('hordeBack', () => { if (VX.Lobby.inRoom()) VX.Lobby.leave(); this.showTitle(); });
      VX.Lobby.init(game);
      click('continueBtn', () => { if (VX.Save.has()) game.continueGame(); });
      click('settingsBtn', () => this.openSettings('title'));
      click('armoryBtn', () => VX.Armory.open(game));
      click('armoryBack', () => VX.Armory.close());
      click('sanctuaryBtn', () => VX.Sanctuary.open());
      click('sanctuaryBack', () => this.showTitle());
      click('codexBtn', () => VX.Codex.open());
      click('codexBack', () => this.showTitle());
      click('resumeBtn', () => game.resume());
      click('pauseSettingsBtn', () => this.openSettings('pause'));
      click('quitBtn', () => game.abandonRun());
      click('saveQuitBtn', () => game.saveAndQuit());
      click('gameoverSanctBtn', () => { game.quitToTitle(); VX.Sanctuary.open(); });
      click('restartBtn', () => (game.mode === 'horde' ? game.startHorde(game.hordeMap) : game.newGame()));
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
      $('setTouch').addEventListener('change', (e) => S.set('touchMode', e.target.value));
      bindRange('setTouchSens', 'touchSens', (v) => v.toFixed(2) + 'x', 'touchSensVal');
      $('setShadows').addEventListener('change', (e) => S.set('shadows', e.target.checked));
      $('setInvert').addEventListener('change', (e) => S.set('invertY', e.target.checked));
      $('setFps').addEventListener('change', (e) => S.set('showFps', e.target.checked));
      $('setAutoRun').addEventListener('change', (e) => S.set('autoRun', e.target.checked));
      $('setHurtFx').addEventListener('change', (e) => S.set('hurtFx', e.target.checked));
      $('setTorchShadows').addEventListener('change', (e) => S.set('torchShadows', e.target.checked));
      $('setDust').addEventListener('change', (e) => S.set('dust', e.target.checked));
      $('setAutoQ').addEventListener('change', (e) => S.set('autoQuality', e.target.checked));
      $('setLocator').addEventListener('change', (e) => S.set('enemyLocator', e.target.checked));
      $('setBloom').addEventListener('change', (e) => S.set('bloom', e.target.checked));
      $('setSsao').addEventListener('change', (e) => S.set('ssao', e.target.checked));
      // exportar / importar el perfil (esencia, Santuario, skins, códice…)
      click('exportProfileBtn', () => {
        VX.Profile.save();
        const blob = new Blob([JSON.stringify({ boxelProfile: 1, version: VX.VERSION, data: VX.Profile.data }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `boxel-perfil-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        $('profileMsg').textContent = 'Perfil exportado.';
      });
      click('importProfileBtn', () => $('importProfileFile').click());
      $('importProfileFile').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try {
            const j = JSON.parse(rd.result);
            const d = j && j.boxelProfile ? j.data : null;
            if (!d || typeof d !== 'object' || typeof d.essence !== 'number') throw new Error('formato');
            if (!confirm('¿Sustituir tu perfil actual por el del archivo? (esencia, Santuario, armas, skins y códice)')) return;
            localStorage.setItem('boxel_profile_v1', JSON.stringify(d));
            VX.Profile.load();
            VX.Profile.save();
            $('profileMsg').textContent = 'Perfil importado correctamente.';
            if (VX.game && VX.game.state === 'title') VX.Menus.refreshEssence && VX.Menus.refreshEssence();
          } catch (err) { $('profileMsg').textContent = 'Archivo no válido.'; }
          e.target.value = '';
        };
        rd.readAsText(f);
      });
      // reasignar teclas: clic en el botón y pulsa la tecla nueva (Esc cancela)
      this.waitKey = null;
      for (const b of document.querySelectorAll('.keyBind')) b.addEventListener('click', () => {
        VX.Audio.click();
        this.waitKey = b.dataset.action;
        b.textContent = 'Pulsa una tecla…';
      });
      window.addEventListener('keydown', (e) => {
        if (!this.waitKey) return;
        e.preventDefault(); e.stopPropagation();
        if (e.code !== 'Escape') S.bind(this.waitKey, e.code);
        this.waitKey = null;
        this.syncKeys();
      }, true);

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
      $('setTouch').value = d.touchMode || 'auto';
      $('setTouchSens').value = d.touchSens || 1; $('touchSensVal').textContent = (d.touchSens || 1).toFixed(2) + 'x';
      $('setShadows').checked = d.shadows;
      $('setInvert').checked = d.invertY;
      $('setFps').checked = d.showFps;
      $('setAutoRun').checked = d.autoRun;
      $('setHurtFx').checked = d.hurtFx;
      $('setTorchShadows').checked = d.torchShadows;
      $('setDust').checked = d.dust;
      $('setAutoQ').checked = d.autoQuality;
      $('setLocator').checked = d.enemyLocator;
      $('setBloom').checked = d.bloom;
      $('setSsao').checked = d.ssao;
      $('profileMsg').textContent = '';
      this.syncKeys();
    },

    syncKeys() {
      const S = VX.Settings;
      for (const b of document.querySelectorAll('.keyBind')) b.textContent = S.keyName(S.key(b.dataset.action));
      for (const b of document.querySelectorAll('[data-key]')) b.textContent = S.keyName(S.key(b.dataset.key));
    },

    openSettings(from) {
      this.settingsFrom = from;
      this.syncSettings();
      this.show('settings');
    },

    show(name) {
      for (const id of SCREENS) $(id).classList.toggle('hidden', id !== name);
      if (VX.Net) VX.Net.keepAwake(name === 'hordeSelect');   // en el menú de la horda, el servidor despierto
    },

    hideAll() { this.show(null); },

    showTitle() {
      const save = VX.Save.peek();
      const btn = $('continueBtn');
      btn.disabled = !save;
      $('continueInfo').textContent = save ? `Piso ${save.floor} · ${save.stats.gold} oro` : 'Sin partida suspendida';
      $('versionTag').textContent = 'v' + VX.VERSION;
      $('essenceInfo').textContent = `Esencia: ${VX.Profile.data.essence || 0}`;
      { const hb = VX.Profile.data.hordeBest || {}, w = Math.max(0, ...Object.values(hb).map((x) => x.wave));
        $('hordeInfo').textContent = w ? `Oleadas infinitas · récord: oleada ${w}` : 'Oleadas infinitas · elige mapa'; }
      const b = VX.Profile.data.best;
      $('codexInfo').textContent = b ? `Récord: ${b.score} pts · piso ${b.floor}` : 'Enemigos, mejoras y récords';
      this.syncKeys();
      this.show('title');
    },

    // Selector de mapas de la Horda (con el récord de cada uno)
    showHorde() {
      const best = VX.Profile.data.hordeBest || {};
      const cards = VX.HordeMode.MAPS.map((m) => {
        const b = best[m.id];
        return `<div class="hmap" data-map="${m.id}">
          <div class="hmapArt ${m.id}"></div>
          <h3>${m.name.toUpperCase()}</h3><p>${m.desc}</p>
          <div class="hrec">${b ? `Récord: <b>oleada ${b.wave}</b> · ${b.kills} bajas` : 'Sin récord todavía'}</div>
          <button class="hplay" data-map="${m.id}">JUGAR</button></div>`;
      });
      if (cards.length < 3) cards.push(`<div class="hmap locked"><div class="hmapArt soon"></div><h3>PRÓXIMAMENTE</h3><p>Más mapas en futuras versiones.</p><div class="hrec">&nbsp;</div><button disabled>BLOQUEADO</button></div>`);
      $('hordeMaps').innerHTML = cards.join('');
      for (const b of document.querySelectorAll('.hplay')) b.addEventListener('click', () => {
        VX.Audio.init(); VX.Music.init(); VX.Audio.click();
        VX.Lobby.play(b.dataset.map);
      });
      VX.Lobby.refresh();
      this.show('hordeSelect');
    },

    showGameOver(stats, floor, essence = 0, res = null, time = 0) {
      const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
      $('restartBtn').textContent = res && res.horde ? 'OTRA VEZ' : 'NUEVA PARTIDA';
      if (res && res.horde) {
        $('stats').innerHTML =
          `Oleadas superadas: <b>${res.done}</b>` + (res.record ? ' <span style="color:#7fd36b">¡NUEVO RÉCORD!</span>' : res.prev ? ` (récord: ${res.prev.wave})` : '') + '<br>' +
          `Zombis eliminados: <b>${stats.kills}</b><br>` +
          `Cabezas reventadas: <b>${stats.headshots}</b><br>` +
          `Jefes derrotados: <b>${stats.bosses}</b><br>` +
          `Precisión: <b>${acc}%</b><br>` +
          `Tiempo: <b>${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}</b><br>` +
          `<span style="color:#c99bff">Esencia obtenida: <b style="color:#c99bff">+${essence}</b> (total ${VX.Profile.data.essence})</span>`;
        this.show('gameover');
        return;
      }
      $('stats').innerHTML =
        `Piso alcanzado: <b>${floor}</b><br>` +
        `Zombis eliminados: <b>${stats.kills}</b><br>` +
        `Cabezas reventadas: <b>${stats.headshots}</b><br>` +
        `Jefes derrotados: <b>${stats.bosses}</b><br>` +
        `Oro recogido: <b>${stats.totalGold}</b><br>` +
        `Precisión: <b>${acc}%</b><br>` +
        `Tiempo: <b>${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}</b>` + (res ? ` · Puntuación: <b>${res.score}</b>${res.record ? ' <span style="color:#7fd36b">¡NUEVO RÉCORD!</span>' : ` (récord ${res.prev.score})`}` : '') + '<br>' +
        `<span style="color:#c99bff">Esencia obtenida: <b style="color:#c99bff">+${essence}</b> (total ${VX.Profile.data.essence})</span>`;
      this.show('gameover');
    },
  };

  VX.Menus = Menus;
})();
