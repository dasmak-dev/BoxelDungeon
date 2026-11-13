// Sala de espera del cooperativo (en la pantalla del modo Horda): crear o unirse con un
// código de 4 letras, ver quién está y, el anfitrión, elegir mapa para empezar todos.
(function () {
  const $ = (id) => document.getElementById(id);

  const Lobby = {
    init(game) {
      this.game = game;
      let name = '';
      try { name = localStorage.getItem('boxel.name') || ''; } catch (e) { /* nada */ }
      $('coopName').value = name;
      $('coopName').addEventListener('change', () => { try { localStorage.setItem('boxel.name', this.name()); } catch (e) { /* nada */ } });
      $('coopCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.join(); e.stopPropagation(); });
      $('coopName').addEventListener('keydown', (e) => e.stopPropagation());
      $('coopServerUrl').addEventListener('keydown', (e) => e.stopPropagation());
      $('coopCreate').addEventListener('click', () => this.create());
      $('coopJoin').addEventListener('click', () => this.join());
      $('coopLeave').addEventListener('click', () => this.leave());
      $('coopCfg').addEventListener('click', () => {
        $('coopServer').classList.toggle('hidden');
        $('coopServerUrl').value = VX.Net.serverUrl();
      });
      $('coopServerSave').addEventListener('click', () => {
        let v = $('coopServerUrl').value.trim();
        // admite la URL tal cual la da Render (https://algo.onrender.com) o solo el dominio
        if (v) {
          v = v.replace(/^http(s?):\/\//i, 'ws$1://').replace(/\/+$/, '');
          if (!/^wss?:\/\//i.test(v)) v = 'wss://' + v;
          if (!/\/ws$/.test(v)) v += '/ws';
          $('coopServerUrl').value = v;
        }
        try { if (v) localStorage.setItem('boxel.netServer', v); else localStorage.removeItem('boxel.netServer'); } catch (e) { /* nada */ }
        $('coopServer').classList.add('hidden');
        this.msg('Servidor guardado');
      });
      VX.Net.onWake = (st) => this.showWake(st);
      VX.Net.wake();   // despierta el servidor nada más abrir el juego
      VX.Net.onLobby = (m) => this.onLobby(m);
      VX.Coop.initHandlers();
    },

    showWake(st) {
      const el = $('coopSrv');
      if (!el) return;
      el.className = 'coopSrv ' + st;
      el.textContent = { waking: '● despertando servidor…', ready: '● servidor listo', fail: '● servidor sin respuesta' }[st] || '';
    },

    name() { return ($('coopName').value || '').trim().slice(0, 14) || 'Jugador'; },
    msg(t) { $('coopMsg').textContent = t || ''; },
    busy(b) { $('coopCreate').disabled = b; $('coopJoin').disabled = b; },

    async create() {
      VX.Audio.init(); VX.Audio.click();
      this.busy(true);
      this.msg('Conectando con el servidor… (si estaba dormido puede tardar hasta un minuto)');
      try { await VX.Net.create(this.name()); } catch (e) { this.msg(e.message); this.busy(false); }
    },
    async join() {
      VX.Audio.init(); VX.Audio.click();
      const code = ($('coopCode').value || '').trim().toUpperCase();
      if (code.length !== 4) { this.msg('Escribe el código de 4 letras que ve el anfitrión'); return; }
      this.busy(true);
      this.msg('Conectando con el servidor…');
      try { await VX.Net.join(code, this.name()); } catch (e) { this.msg(e.message); this.busy(false); }
    },
    leave() {
      VX.Audio.click();
      VX.Coop.stop();
      VX.Net.leave();
      this.refresh();
      this.msg('');
    },

    onLobby(m) {
      const game = this.game;
      if (m.t === 'created') { this.busy(false); this.msg('Pasa el código a tus amigos. Cuando estéis, elige un mapa: empezaréis todos a la vez.'); }
      else if (m.t === 'joined') { this.busy(false); this.msg('¡Dentro! El anfitrión elegirá el mapa.'); }
      else if (m.t === 'error') { this.busy(false); this.msg(m.msg); VX.Net.leave(); }
      else if (m.t === 'peer') { VX.Audio.click(); if (VX.Coop.active) game.hud.toast(`${m.name} se ha unido`); }
      else if (m.t === 'leave') { if (VX.Coop.active) VX.Coop.peerLeft(m.id); }
      else if (m.t === 'closed') {
        const inGame = VX.Coop.active && (game.state === 'playing' || game.state === 'paused' || game.state === 'settings');
        VX.Coop.stop();
        VX.Net.reset();
        if (inGame) {
          game.hud.banner('PARTIDA TERMINADA', m.msg || 'Se ha cerrado la sala', 4);
          setTimeout(() => { if (game.mode === 'horde') game.quitToTitle(); }, 3500);
        } else this.msg(m.msg || 'Se ha cerrado la sala');
      }
      this.refresh();
    },

    inRoom() { return !!VX.Net.code; },

    // estado de la barra y de los botones de los mapas
    refresh() {
      const N = VX.Net, inRoom = this.inRoom();
      $('coopIdle').classList.toggle('hidden', inRoom);
      $('coopRoom').classList.toggle('hidden', !inRoom);
      if (inRoom) {
        $('coopRoomCode').textContent = N.code;
        const cols = VX.RemotePlayer.COLORS;
        $('coopRoster').innerHTML = N.players.map((p, i) => `<b style="color:rgb(${cols[i % 4].map((v) => Math.round(v * 255)).join(',')})">${p.id === 0 ? '★ ' : ''}${p.name}${p.id === N.id ? ' (tú)' : ''}</b>`).join('');
        $('coopHint').textContent = N.isHost ? `${N.players.length}/4 · elige mapa para empezar` : 'Esperando al anfitrión…';
      }
      for (const card of document.querySelectorAll('#hordeMaps .hmap[data-map]')) {
        const btn = card.querySelector('.hplay');
        card.classList.toggle('waiting', inRoom && !N.isHost);
        if (btn) btn.textContent = inRoom ? (N.isHost ? `EMPEZAR (${N.players.length})` : 'ESPERANDO') : 'JUGAR';
      }
    },

    // botón JUGAR de un mapa
    play(mapId) {
      const N = VX.Net;
      if (this.inRoom()) {
        if (!N.isHost) return;
        $('hordeMaps').innerHTML = '<p class="hordeIntro">Construyendo el mapa para todos…</p>';
        setTimeout(() => VX.Coop.hostStart(mapId), 30);
        return;
      }
      $('hordeMaps').innerHTML = '<p class="hordeIntro">Construyendo el mapa…</p>';
      setTimeout(() => this.game.startHorde(mapId), 30);
    },
  };

  VX.Lobby = Lobby;
})();
