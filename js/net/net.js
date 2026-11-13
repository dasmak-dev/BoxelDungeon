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
