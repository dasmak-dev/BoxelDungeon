// Pantalla de título, ajustes, pausa y fin de partida.
(function () {
  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'settings', 'pause', 'gameover', 'armory', 'sanctuary', 'codex', 'hordeSelect', 'daily'];

  const Menus = {
    settingsFrom: 'title',

    init(game) {
      this.game = game;
      const click = (id, fn) => $(id).addEventListener('click', () => { VX.Audio.init(); VX.Music.init(); VX.Audio.click(); fn(); });

      click('newBtn', () => game.newGame());
      click('hordeBtn', () => this.showHorde());
      click('hordeBack', () => { if (VX.Lobby.inRoom()) VX.Lobby.leave(); this.showTitle(); });
      VX.Lobby.init(game);
      VX.Daily.init(game);
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
      click('gameoverSanctBtn', () => { game.quitToTitle(); VX.Sanctuary.open(); });
      click('restartBtn', () => (game.mode === 'horde' ? game.startHorde(game.hordeMap) : game.daily ? VX.Daily.start(game) : game.newGame()));
      click('toTitleBtn', () => game.quitToTitle());
      click('backSettingsBtn', () => this.show(this.settingsFrom));
      click('resetSettingsBtn', () => { VX.Settings.reset(); this.syncSettings(); });
      click('presetMobile', () => { VX.Settings.preset('movil'); this.syncSettings(); });
      click('presetPc', () => { VX.Settings.preset('pc'); this.syncSettings(); });

      // clic en el canvas durante la partida = recapturar ratón
      $('game').addEventListener('click', () => {
        if (game.state === 'playing' && !VX.Input.locked) VX.Input.lock();
      });

      // pestañas de los ajustes (sonido, gráficos, controles, teclas, interfaz, perfil)
      for (const b of document.querySelectorAll('.setTab')) b.addEventListener('click', () => {
        VX.Audio.click();
        for (const o of document.querySelectorAll('.setTab')) o.classList.toggle('on', o === b);
        for (const p of document.querySelectorAll('.setPane')) p.classList.toggle('hidden', p.dataset.pane !== b.dataset.tab);
      });
      // controles de ajustes
      const S = VX.Settings;
      const bindRange = (id, key, fmt, valId) => {
        const el = $(id);
        el.addEventListener('input', () => { S.set(key, parseFloat(el.value)); $(valId).textContent = fmt(S.data[key]); });
      };
      const pct = (v) => Math.round(v * 100) + '%';
      bindRange('setMaster', 'master', pct, 'masterVal');
      bindRange('setMusic', 'music', pct, 'musicVal');
      bindRange('setSfx', 'sfx', pct, 'sfxVal');
      bindRange('setAmb', 'ambVol', pct, 'ambVal');
      bindRange('setEnemy', 'enemyVol', pct, 'enemyVal');
      bindRange('setSens', 'sensitivity', (v) => v.toFixed(2) + 'x', 'sensVal');
      bindRange('setFov', 'fov', (v) => v + '°', 'fovVal');
      $('setQuality').addEventListener('change', (e) => S.set('quality', e.target.value));
      $('setTouch').addEventListener('change', (e) => S.set('touchMode', e.target.value));
      $('errCopyBtn').addEventListener('click', async () => { VX.Audio.click(); const ok = await VX.ErrLog.copy(); $('profileMsg').textContent = ok ? `Copiado: ${VX.ErrLog.list.length} errores` : 'No se pudo copiar'; });
      $('errClearBtn').addEventListener('click', () => { VX.Audio.click(); VX.ErrLog.clear(); $('profileMsg').textContent = 'Registro borrado'; });
      $('selfTestBtn').addEventListener('click', () => { VX.Audio.click(); if (game.state !== 'title' && !confirm('Se abandonará la partida en curso. ¿Seguir?')) return; this.hideAll(); setTimeout(() => VX.SelfTest.run(game), 50); });
      VX.ErrLog.badge();
      $('tutorialBtn').addEventListener('click', () => { VX.Audio.click(); VX.Tutorial.reset(); $('profileMsg').textContent = 'El tutorial saldrá en tu próxima partida.'; });
      $('touchLayoutBtn').addEventListener('click', () => { VX.Audio.click(); VX.Touch.editLayout(); });
      $('setAimAssist').addEventListener('change', (e) => S.set('aimAssist', e.target.checked));
      $('setVibrate').addEventListener('change', (e) => { S.set('vibrate', e.target.checked); if (e.target.checked) VX.Haptics.buzz(60, true); });
      $('setFpsCap').addEventListener('change', (e) => S.set('fpsCap', +e.target.value));
      $('setSaver').addEventListener('change', (e) => S.set('batterySaver', e.target.checked));
      bindRange('setTouchSens', 'touchSens', (v) => v.toFixed(2) + 'x', 'touchSensVal');
      bindRange('setPadSens', 'padSens', (v) => v.toFixed(2) + 'x', 'padSensVal');
      $('setShadows').addEventListener('change', (e) => S.set('shadows', e.target.checked));
      $('setInvert').addEventListener('change', (e) => S.set('invertY', e.target.checked));
      $('setFps').addEventListener('change', (e) => S.set('showFps', e.target.checked));
      $('setColorblind').addEventListener('change', (e) => { S.set('colorblind', e.target.checked); if (VX.game && VX.game.hud) VX.game.hud.setKeys(VX.game.keys); });
      bindRange('setUiScale', 'uiScale', pct, 'uiScaleVal');
      bindRange('setBright', 'brightness', pct, 'brightVal');
      $('setAutoRun').addEventListener('change', (e) => S.set('autoRun', e.target.checked));
      $('setHurtFx').addEventListener('change', (e) => S.set('hurtFx', e.target.checked));
      $('setTorchShadows').addEventListener('change', (e) => S.set('torchShadows', e.target.checked));
      $('setDust').addEventListener('change', (e) => S.set('dust', e.target.checked));
      $('setGroundFog').addEventListener('change', (e) => S.set('groundFog', e.target.checked));
      $('setSoundViz').addEventListener('change', (e) => S.set('soundViz', e.target.checked));
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
        a.download = `voxel-perfil-${new Date().toISOString().slice(0, 10)}.json`;
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
      // mando: una fila por acción; clic y pulsa el botón nuevo en el mando
      const pb = $('padBinds');
      if (pb && VX.Pad) {
        pb.innerHTML = VX.Pad.ACTIONS.map(([a, label]) => `<label>${label}</label><button class="small padBind" data-pad="${a}"></button>`).join('');
        for (const b of pb.querySelectorAll('.padBind')) b.addEventListener('click', () => {
          VX.Audio.click();
          VX.Pad.waitBind = b.dataset.pad;
          b.textContent = 'Pulsa un botón del mando…';
        });
        $('padResetBtn').addEventListener('click', () => { VX.Audio.click(); VX.Pad.resetBinds(); this.syncPad(); });
      }
      // reasignar teclas: clic en el botón y pulsa la tecla nueva (Esc cancela)
      this.waitKey = null;
      for (const b of document.querySelectorAll('.keyBind')) b.addEventListener('click', () => {
        VX.Audio.click();
        this.waitKey = b.dataset.action;
        b.textContent = 'Pulsa una tecla…';
      });
      window.addEventListener('keydown', (e) => {
        if (VX.Pad && VX.Pad.waitBind && e.code === 'Escape') { VX.Pad.waitBind = null; this.syncPad(); return; }
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
      $('setMaster').value = d.master ?? 1; $('masterVal').textContent = Math.round((d.master ?? 1) * 100) + '%';
      $('setMusic').value = d.music; $('musicVal').textContent = Math.round(d.music * 100) + '%';
      $('setSfx').value = d.sfx; $('sfxVal').textContent = Math.round(d.sfx * 100) + '%';
      $('setAmb').value = d.ambVol ?? 1; $('ambVal').textContent = Math.round((d.ambVol ?? 1) * 100) + '%';
      $('setEnemy').value = d.enemyVol ?? 1; $('enemyVal').textContent = Math.round((d.enemyVol ?? 1) * 100) + '%';
      $('setSens').value = d.sensitivity; $('sensVal').textContent = d.sensitivity.toFixed(2) + 'x';
      $('setFov').value = d.fov; $('fovVal').textContent = d.fov + '°';
      $('setQuality').value = d.quality;
      $('setTouch').value = d.touchMode || 'auto';
      $('setAimAssist').checked = d.aimAssist !== false; $('setVibrate').checked = d.vibrate !== false; $('setFpsCap').value = String(d.fpsCap || 0); $('setSaver').checked = !!d.batterySaver;
      $('setPadSens').value = d.padSens || 1; $('padSensVal').textContent = (d.padSens || 1).toFixed(2) + 'x';
      $('setTouchSens').value = d.touchSens || 1; $('touchSensVal').textContent = (d.touchSens || 1).toFixed(2) + 'x';
      $('setShadows').checked = d.shadows;
      $('setInvert').checked = d.invertY;
      $('setFps').checked = d.showFps;
      $('setColorblind').checked = !!d.colorblind;
      $('setBright').value = d.brightness || 1; $('brightVal').textContent = Math.round((d.brightness || 1) * 100) + '%';
      $('setUiScale').value = d.uiScale || 1; $('uiScaleVal').textContent = Math.round((d.uiScale || 1) * 100) + '%';
      $('setAutoRun').checked = d.autoRun;
      $('setHurtFx').checked = d.hurtFx;
      $('setTorchShadows').checked = d.torchShadows;
      $('setDust').checked = d.dust; $('setGroundFog').checked = d.groundFog !== false; $('setSoundViz').checked = !!d.soundViz;
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
      this.syncPad();
    },
    syncPad() {
      const Pd = VX.Pad;
      if (!Pd) return;
      for (const b of document.querySelectorAll('.padBind')) b.textContent = Pd.waitBind === b.dataset.pad ? 'Pulsa un botón del mando…' : Pd.btnName(Pd.btnOf(b.dataset.pad));
      const h = document.getElementById('padHelpTxt'); if (h) h.textContent = Pd.helpText();
      const w = document.getElementById('padWhich');
      if (w) { const own = Pd.curId && VX.Settings.data.padById && VX.Settings.data.padById[Pd.curId]; w.textContent = Pd.curId ? `${Pd.padLabel()} · ${own ? 'con su propia configuración' : 'configuración común (al cambiar algo, se guarda sólo para este mando)'}` : 'Ningún mando conectado (pulsa un botón)'; }
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
      // ya no se puede suspender una partida: si quedaba alguna guardada de versiones anteriores, se borra
      if (VX.Save.has()) VX.Save.clear();
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
          <div class="hrec">${b ? `Récord: <b>oleada ${b.wave}</b> · ${b.kills} bajas${b.escaped ? " · ¡escapó!" : ""}` : 'Sin récord todavía'}</div>
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

    // resumen de la partida en la pausa: cómo vas, tus mejoras (con su efecto), armas y equipo
    fillPause(game) {
      { const po = $('pauseObj'); if (po) po.innerHTML = game.mode === 'dungeon' && game.objectives ? '<div class="objT">OBJETIVOS DE LA PARTIDA</div>' + VX.Objectives.html(game) : ''; }
      const el = $('pauseInfo');
      if (!el) return;
      const esc = (t) => String(t).replace(/[<>&]/g, '');
      const S = game.stats, t = game.runTime || 0, W = game.weapon;
      const where = game.mode === 'horde' ? `Oleada <b>${VX.HordeMode.wave}</b>` : `Piso <b>${game.floor}</b>`;
      let h = `<div class="pRow">${where} · Tiempo <b>${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</b> · Oro <b>${S.gold}</b> · Zombis <b>${S.kills}</b> · Cabezas <b>${S.headshots}</b> · Vida <b>${Math.ceil(game.player.hp)}/${game.player.maxHp}</b></div>`;
      // armas con sus accesorios
      h += '<div class="pCol"><u>ARMAS</u>' + W.slots.map((s) => {
        const d = VX.Weapons.DEFS[s.id], at = W.attList(s.id);
        return `<div><b>${esc(d.name)}</b>${d.melee ? '' : ` <small>${s.ammo}/${W.magFor(s.id)} · reserva ${s.reserve ?? '∞'}</small>`}${at.length ? '<br><span class="att">◆ ' + at.map((a) => VX.Weapons.ATTACH[a].name).join(' · ') + '</span>' : ''}</div>`;
      }).join('');
      const th = VX.Throw.ORDER.filter((k) => W.throws[k] > 0).map((k) => `${VX.Throw.TYPES[k].name} ×${W.throws[k]}`);
      h += `<div><small>Para lanzar (${VX.Settings.tag('throw')}): ${th.length ? th.join(' · ') : 'nada'}</small></div>`;
      if (game.keys && (game.keys.wood || game.keys.silver || game.keys.gold)) h += `<div><small>Llaves: ${['wood', 'silver', 'gold'].filter((c) => game.keys[c]).map((c) => VX.Settings.keyColorName(c) + (game.keys[c] > 1 ? ' ×' + game.keys[c] : '')).join(', ')}</small></div>`;
      h += '</div>';
      // mejoras con su efecto
      const ups = new Map();
      for (const u of game.upgradesTaken || []) { const e = ups.get(u.id) || { u, n: 0 }; e.n++; ups.set(u.id, e); }
      h += '<div class="pCol pUps"><u>MEJORAS</u>' + (ups.size ? [...ups.values()].map(({ u, n }) => {
        const tag = u.rare ? ' ★' : u.curse ? ' ☠' : '';
        const c = (u.color || [1, 1, 1]).map((x) => Math.round(x * 255)).join(',');
        return `<div><i style="background:rgb(${c})"></i><b>${esc(u.name)}${tag}${n > 1 ? ' ×' + n : ''}</b> <small>${esc(u.desc || '')}</small></div>`;
      }).join('') : '<div><small>Todavía ninguna</small></div>') + '</div>';
      el.innerHTML = h;
    },

    // lo que pasó: quién te mató, quién te hizo más daño, qué llevabas y qué te faltaba
    deathInfo(game) {
      if (!game) return '';
      const esc = (t) => String(t).replace(/[<>&]/g, '');
      let h = '<div id="deathInfo">';
      const res = game.runResult || {}, S = game.stats || {};
      // dónde y quién
      const where = game.deathWhere && game.mode !== 'horde' ? `${(VX.ZONES[game.deathWhere.zone] || {}).name || ''} · ${(VX.ROOM_TYPES[game.deathWhere.type] || {}).label || 'sala'} · piso ${game.deathWhere.floor}` : '';
      if (!res.escaped && (game.lastHitBy || where)) h += `<div class="dRow dKill">${game.lastHitBy ? `Te mató: <b>${esc(game.lastHitBy)}</b>` : ''}${where ? `<small> · en ${esc(where)}</small>` : ''}</div>`;
      // momentos de la partida
      const wk = Object.entries(S.wKills || {}).sort((a, b) => b[1] - a[1]);
      const fav = wk[0] && VX.Weapons.DEFS[wk[0][0]];
      const mom = [];
      if (fav) mom.push(['Arma favorita', `${esc(fav.name)} <small>(${wk[0][1]} muertes)</small>`]);
      if (S.bestMulti > 1) mom.push(['Mejor racha', `${S.bestMulti} seguidos`]);
      if (S.dmgDealt) mom.push(['Daño hecho', Math.round(S.dmgDealt).toLocaleString('es')]);
      const tot0 = Object.values(game.dmgTaken || {}).reduce((a, b) => a + b, 0);
      if (tot0) mom.push(['Daño recibido', Math.round(tot0).toLocaleString('es')]);
      if (S.secrets) mom.push(['Secretos', S.secrets]);
      if (mom.length) h += '<div class="dCol"><u>TU PARTIDA</u>' + mom.map(([k, v]) => `<div class="dMom"><span>${k}</span><b>${v}</b></div>`).join('') + (wk.length > 1 ? '<div class="dWk">' + wk.slice(0, 5).map(([id, n]) => `<span>${esc((VX.Weapons.DEFS[id] || {}).name || id)} ${n}</span>`).join('') + '</div>' : '') + '</div>';
      const dm = Object.entries(game.dmgTaken || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = tot0 || 1;
      if (dm.length) h += '<div class="dCol"><u>QUIÉN TE HIZO DAÑO</u>' + dm.map(([k, v]) => `<div class="dBar"><span>${esc(k)}</span><i style="width:${Math.round(v / tot * 100)}%"></i><b>${Math.round(v)}</b></div>`).join('') + '</div>';
      if (game.objectives && game.mode !== 'horde') h += '<div class="dCol"><u>OBJETIVOS</u><div class="objList">' + VX.Objectives.html(game) + '</div></div>';
      const ups = {};
      for (const u of game.upgradesTaken || []) ups[u.name] = (ups[u.name] || 0) + 1;
      const W = game.weapon, atts = W ? W.slots.filter((s) => W.attList(s.id).length).map((s) => VX.Weapons.DEFS[s.id].name + ': ' + W.attList(s.id).map((a) => VX.Weapons.ATTACH[a].name).join(', ')) : [];
      if (Object.keys(ups).length || atts.length) h += '<div class="dCol"><u>LLEVABAS</u><div class="dUps">' + Object.entries(ups).map(([n, c]) => `<span>${esc(n)}${c > 1 ? ' ×' + c : ''}</span>`).join('') + atts.map((t) => `<span class="att">◆ ${esc(t)}</span>`).join('') + '</div></div>';
      const goals = VX.Profile.nearestGoals(3);
      if (goals.length) h += '<div class="dCol"><u>TE FALTA POCO PARA</u>' + goals.map((g) => `<div class="dGoal"><b>${esc(g.name)}</b> <small>${g.what}</small><br><small>${esc(g.txt)}</small><span class="pb"><i style="width:${Math.round(g.r * 100)}%"></i></span><small>${g.v}/${g.n}</small></div>`).join('') + '</div>';
      return h + '</div>';
    },
    // tarjetas con las cifras principales
    statCards(list) { return '<div class="sCards">' + list.map(([k, v, c]) => `<div class="sCard${c ? ' ' + c : ''}"><b>${v}</b><span>${k}</span></div>`).join('') + '</div>'; },

    showGameOver(stats, floor, essence = 0, res = null, time = 0, game = null) {
      const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
      $('restartBtn').textContent = res && res.horde ? 'OTRA VEZ' : game && game.daily ? 'OTRA VEZ LA DIARIA' : 'NUEVA PARTIDA';
      document.querySelector('#gameover h2').textContent = res && res.escaped ? '¡HAS ESCAPADO!' : 'HAS CAÍDO';
      if (res && res.horde) {
        $('stats').innerHTML =
          (res.escaped ? '<span style="color:#7fd36b">Evacuado en helicóptero</span><br>' : '') +
          `Oleadas superadas: <b>${res.done}</b>` + (res.record ? ' <span style="color:#7fd36b">¡NUEVO RÉCORD!</span>' : res.prev ? ` (récord: ${res.prev.wave})` : '') + '<br>' +
          `Zombis eliminados: <b>${stats.kills}</b><br>` +
          `Cabezas reventadas: <b>${stats.headshots}</b><br>` +
          `Jefes derrotados: <b>${stats.bosses}</b><br>` +
          `Precisión: <b>${acc}%</b><br>` +
          `Tiempo: <b>${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}</b><br>` +
          `<span style="color:#c99bff">Esencia obtenida: <b style="color:#c99bff">+${essence}</b> (total ${VX.Profile.data.essence})</span>` + (game && game.coopTable ? `<div class="coopFinal">${game.coopTable}</div>` : '') + this.deathInfo(game);
        this.show('gameover');
        return;
      }
      const tm = `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
      $('stats').innerHTML = this.statCards([
        ['Piso', floor], ['Zombis', stats.kills], ['Cabezas', stats.headshots], ['Jefes', stats.bosses],
        ['Oro', stats.totalGold], ['Precisión', acc + '%'], ['Tiempo', tm], ['Esencia', '+' + essence, 'ess'],
      ]) + (game && game.daily && game.dailyRes ? `<div class="sScore" id="dailyResult">${VX.Daily.resultText(game, game.dailyRes)}</div>` : '') + (res ? `<div class="sScore">Puntuación <b>${res.score}</b>${res.record ? ' <span style="color:#7fd36b">¡NUEVO RÉCORD!</span>' : res.prev ? ` · récord ${res.prev.score}` : ''} · esencia total ${VX.Profile.data.essence}</div>` : '') +
        (game && game.coopTable ? `<div class="coopFinal">${game.coopTable}</div>` : '') + this.deathInfo(game);
      this.show('gameover');
    },
  };

  VX.Menus = Menus;
})();
