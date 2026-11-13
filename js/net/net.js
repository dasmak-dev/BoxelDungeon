// Conexión con el servidor de salas del cooperativo (WebSocket).
// El servidor solo reenvía: el anfitrión (id 0) ejecuta la partida y los demás le mandan
// lo suyo y reciben el estado. Los mensajes del juego van dentro de { t:'msg', d:{ k:... } }.
(function () {
  // Dirección del servidor desplegado (Render). Si el juego se abre desde el propio servidor
  // (red local: http://IP:8080) se usa ese mismo servidor y esto no hace falta.
  VX.NET_SERVER = VX.NET_SERVER || 'wss://boxeldungeon.onrender.com/ws';

  const Net = {
    ws: null,
    state: 'off',          // off | connecting | open
    role: null,            // 'host' | 'client'
    id: -1,
    code: null,
    players: [],           // [{ id, name }]
    handlers: {},          // tipo de mensaje del juego → función(d, from)
    onLobby: null,         // avisos de la sala (unirse, salir, errores…)
    bytesIn: 0, bytesOut: 0,

    // dirección del servidor: el mismo si nos sirve el juego; si no, el desplegado
    serverUrl() {
      const q = new URLSearchParams(location.search).get('server');
      if (q) return q;
      if (location.protocol === 'http:' && location.host) return `ws://${location.host}/ws`;
      try { const saved = localStorage.getItem('boxel.netServer'); if (saved) return saved; } catch (e) { /* nada */ }
      if (location.protocol === 'https:' && !/github\.io$/.test(location.hostname) && location.port) return `wss://${location.host}/ws`;
      if (/\.onrender\.com$/.test(location.hostname)) return `wss://${location.host}/ws`;
      return VX.NET_SERVER;
    },

    // Despierta el servidor (Render lo duerme tras 15 min sin uso y tarda ~1 min en arrancar).
    // Se llama al abrir el juego y al entrar en el menú de la horda; mientras se está en ese
    // menú se repite cada 4 min para que no se vuelva a dormir.
    wakeState: 'idle',     // idle | waking | ready | fail
    onWake: null,
    healthUrl() {
      try {
        const u = new URL(this.serverUrl().replace(/^ws/i, 'http'));
        u.pathname = '/health'; u.search = '';
        return u.toString();
      } catch (e) { return null; }
    },
    wake(force) {
      if (this.wakeState === 'waking' || (this.wakeState === 'ready' && !force && Date.now() - this.wokeAt < 60000)) return;
      if (this.wakeState !== 'ready') this.setWake('waking');
      const t0 = Date.now();
      const ok = () => { if (this.wakeState === 'ready' && Date.now() - this.wokeAt < 1000) return; this.wokeAt = Date.now(); this.setWake('ready'); };
      // dos caminos a la vez: GET /health y una conexión WebSocket de prueba (no depende de CORS
      // y comprueba justo la dirección con la que se juega). Basta con que responda uno.
      const tryOnce = () => {
        let done = false, pending = 2;
        const finish = (good) => {
          if (done) return;
          if (good) { done = true; ok(); return; }
          if (--pending > 0) return;
          done = true;
          if (Date.now() - t0 < 180000) setTimeout(tryOnce, 4000);   // Render puede tardar en arrancar: sigue probando 3 min
          else this.setWake('fail');
        };
        const url = this.healthUrl();
        if (url && typeof fetch === 'function') {
          const ctl = typeof AbortController === 'function' ? new AbortController() : null;
          const timer = setTimeout(() => ctl && ctl.abort(), 30000);
          fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
            .then((r) => { clearTimeout(timer); finish(r.ok); })
            .catch(() => { clearTimeout(timer); finish(false); });
        } else finish(false);
        let ws = null;
        try { ws = new WebSocket(this.serverUrl()); } catch (e) { finish(false); return; }
        const wt = setTimeout(() => { try { ws.close(); } catch (e) { /* nada */ } finish(false); }, 30000);
        ws.onopen = () => { clearTimeout(wt); finish(true); try { ws.close(); } catch (e) { /* nada */ } };
        ws.onerror = () => { clearTimeout(wt); finish(false); };
        ws.onclose = () => { clearTimeout(wt); finish(false); };
      };
      tryOnce();
    },
    serverHost() { try { return new URL(this.serverUrl().replace(/^ws/i, 'http')).host; } catch (e) { return '?'; } },
    setWake(s) { this.wakeState = s; if (this.onWake) this.onWake(s); },
    keepAwake(on) {
      clearInterval(this.awakeTimer);
      if (on) { this.wake(); this.awakeTimer = setInterval(() => this.wake(true), 4 * 60000); }
    },

    connect() {
      return new Promise((resolve, reject) => {
        if (this.ws && this.state === 'open') { resolve(); return; }
        this.state = 'connecting';
        let done = false;
        const ws = new WebSocket(this.serverUrl());
        this.ws = ws;
        const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('El servidor no responde (si está en Render puede tardar ~1 minuto en despertar; vuelve a intentarlo)')); try { ws.close(); } catch (e) { /* nada */ } } }, 70000);
        ws.onopen = () => { this.state = 'open'; if (!done) { done = true; clearTimeout(timer); resolve(); } };
        ws.onerror = () => { if (!done) { done = true; clearTimeout(timer); reject(new Error('No se pudo conectar con el servidor del cooperativo')); } };
        ws.onclose = () => {
          const was = this.state;
          this.state = 'off';
          if (was === 'open' && this.code) this.lobby({ t: 'closed', msg: 'Se ha perdido la conexión con el servidor' });
          this.reset();
        };
        ws.onmessage = (ev) => {
          this.bytesIn += ev.data.length;
          let m;
          try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m.t === 'msg') { const h = this.handlers[m.d && m.d.k]; if (h) h(m.d, m.from); return; }
          if (m.t === 'created' || m.t === 'joined') { this.id = m.id; this.code = m.code; this.role = m.id === 0 ? 'host' : 'client'; }
          if (m.t === 'host') this.role = m.id === this.id ? 'host' : 'client';   // el anfitrión se ha ido
          if (m.players) this.players = m.players;
          this.lobby(m);
        };
      });
    },

    lobby(m) { if (this.onLobby) this.onLobby(m); },

    async create(name) { await this.connect(); this.raw({ t: 'create', name }); },
    async join(code, name) { await this.connect(); this.raw({ t: 'join', code, name }); },
    setStarted(v) { this.raw({ t: 'started', v }); },

    raw(o) {
      if (!this.ws || this.state !== 'open') return;
      const s = JSON.stringify(o);
      this.bytesOut += s.length;
      this.ws.send(s);
    },
    // a: id concreto; sin él, el anfitrión lo manda a todos y un invitado al anfitrión ('all' = a todos)
    send(d, to) { this.raw(to === undefined ? { t: 'msg', d } : { t: 'msg', d, to }); },
    on(k, fn) { this.handlers[k] = fn; },

    leave() {
      const ws = this.ws;
      this.reset();
      this.state = 'off';
      if (ws) { ws.onclose = null; try { ws.close(); } catch (e) { /* nada */ } }
    },
    reset() { this.ws = null; this.role = null; this.id = -1; this.code = null; this.players = []; },
    get isHost() { return this.role === 'host'; },
    get isClient() { return this.role === 'client'; },
  };

  VX.Net = Net;
})();
