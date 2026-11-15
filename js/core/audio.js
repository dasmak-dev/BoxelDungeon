// Efectos de sonido sintetizados con WebAudio (no requiere archivos).
(function () {
  const A = { ctx: null, master: null, sfx: null, enabled: true, noiseBuf: null, volume: 0.8 };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = A.ctx.createGain();
      // arranca en silencio y sube poco a poco: al entrar o recargar no puede sonar un golpe fuerte
      A.master.gain.value = 0;
      A.master.gain.setTargetAtTime(A.hidden ? 0 : 0.9 * (A.masterVol ?? 1), A.ctx.currentTime + 0.15, 0.45);
      A.master.connect(A.ctx.destination);
      A.sfx = A.ctx.createGain();
      A.sfx.gain.value = A.volume * 0.5;
      A.sfx.connect(A.master);
      // buses con volumen propio (Ajustes): ambiente (fondo de cada bioma y ruidos de la sala) y enemigos
      A.ambBus = A.ctx.createGain(); A.ambBus.gain.value = A.ambVol ?? 1; A.ambBus.connect(A.sfx);
      A.enemyBus = A.ctx.createGain(); A.enemyBus.gain.value = A.enemyVol ?? 1; A.enemyBus.connect(A.sfx);
      // reverberación: dos respuestas (sala pequeña / gran nave) que se mezclan según el tamaño
      const ir = (secs, decay) => {
        const n = Math.floor(A.ctx.sampleRate * secs), b = A.ctx.createBuffer(2, n, A.ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const d = b.getChannelData(c);
          for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 40 ? i / 40 : 1); }
        }
        return b;
      };
      A.revSmall = A.ctx.createConvolver(); A.revSmall.buffer = ir(0.7, 3.2);
      A.revLarge = A.ctx.createConvolver(); A.revLarge.buffer = ir(2.8, 2.2);
      A.revSmallG = A.ctx.createGain(); A.revLargeG = A.ctx.createGain();
      A.revSmallG.gain.value = 0.18; A.revLargeG.gain.value = 0.05;
      const pre = A.ctx.createBiquadFilter(); pre.type = 'lowpass'; pre.frequency.value = 3200;
      A.sfx.connect(pre);
      pre.connect(A.revSmall); pre.connect(A.revLarge);
      A.revSmall.connect(A.revSmallG); A.revLarge.connect(A.revLargeG);
      A.revSmallG.connect(A.master); A.revLargeG.connect(A.master);
      const len = A.ctx.sampleRate * 1.0;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { A.enabled = false; }
  };

  // ---------- Sonido en 3D ----------
  // Mientras hay una «fuente» activa (A.source / A.at), todo lo que suena sale desde ese punto:
  // panorama HRTF (se distingue delante, detrás, arriba y abajo), volumen por distancia,
  // agudos que se apagan con la distancia y sonido ahogado si hay una pared en medio.
  let src3 = null, chain3 = null;
  A.listen = (P) => {
    if (!A.ctx || !P) return;
    const L = A.ctx.listener, t = A.ctx.currentTime;
    const x = P.x, y = P.eyeY ? P.eyeY() : P.y + 1.6, z = P.z;
    const cp = Math.cos(P.pitch || 0), fx = Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch || 0), fz = Math.cos(P.yaw) * cp;
    const ux = -Math.sin(P.yaw) * fy, uy = cp, uz = -Math.cos(P.yaw) * fy;
    if (L.positionX) {
      L.positionX.setValueAtTime(x, t); L.positionY.setValueAtTime(y, t); L.positionZ.setValueAtTime(z, t);
      L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(fy, t); L.forwardZ.setValueAtTime(fz, t);
      L.upX.setValueAtTime(ux, t); L.upY.setValueAtTime(uy, t); L.upZ.setValueAtTime(uz, t);
    } else { L.setPosition(x, y, z); L.setOrientation(fx, fy, fz, ux, uy, uz); }
  };
  // fija la fuente (null = sonidos normales, sin posición)
  A.source = (x, y, z, ref) => { src3 = x === null || x === undefined ? null : { x, y, z, ref: ref || 2.5 }; chain3 = null; };
  // hace sonar fn() desde un punto
  A.at = (x, y, z, fn, ref, tag) => {
    // indicadores visuales de sonido (accesibilidad): avisa al HUD de dónde viene
    if (VX.Settings && VX.Settings.data.soundViz && VX.game && VX.game.hud && VX.game.hud.soundAt) VX.game.hud.soundAt(x, z, tag || A.vizTag || 'sound');
    const s = src3, c = chain3, en = A.enemyCtx;
    A.source(x, y, z, ref);
    if (tag === 'enemy') A.enemyCtx = true;
    try { fn(); } finally { src3 = s; chain3 = c; A.enemyCtx = en; }
  };
  // a qué bus va lo que suena ahora
  function bus() { return A.ambCtx && A.ambBus ? A.ambBus : A.enemyCtx && A.enemyBus ? A.enemyBus : A.sfx; }
  A.setBusVolumes = (amb, enemy) => {
    A.ambVol = amb; A.enemyVol = enemy;
    if (A.ambBus) A.ambBus.gain.value = amb;
    if (A.enemyBus) A.enemyBus.gain.value = enemy;
  };
  // sonido sin posición aunque haya una fuente activa (el dolor del jugador, la interfaz…)
  A.direct = (fn) => { const s = src3, c = chain3, en = A.enemyCtx; src3 = null; chain3 = null; A.enemyCtx = false; try { fn(); } finally { src3 = s; chain3 = c; A.enemyCtx = en; } };
  function chain() {
    if (chain3 !== null) return chain3;
    const g = VX.game, P = g && g.player, S = src3;
    if (!P) { chain3 = bus(); return chain3; }
    const ey = P.eyeY ? P.eyeY() : P.y + 1.6;
    const d = Math.hypot(S.x - P.x, S.y - ey, S.z - P.z);
    if (d > 75) { chain3 = false; return chain3; }   // demasiado lejos: no se oye
    const pn = A.ctx.createPanner();
    const q = VX.Settings && VX.Settings.data && VX.Settings.data.quality;
    pn.panningModel = q === 'baja' ? 'equalpower' : 'HRTF';
    pn.distanceModel = 'inverse'; pn.refDistance = S.ref; pn.rolloffFactor = 1.15; pn.maxDistance = 90;
    if (pn.positionX) { pn.positionX.value = S.x; pn.positionY.value = S.y; pn.positionZ.value = S.z; } else pn.setPosition(S.x, S.y, S.z);
    // pared en medio: cuanto más muro (o una puerta cerrada, otra sala) hay entre medias, más apagado y lejano suena
    let occl = 0;
    try { if (d > 1.5 && g.world) occl = A.occlusion(g.world, P.x, ey, P.z, S.x, S.y, S.z); } catch (e) { /* nada */ }
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.5;
    const open = Math.max(1800, 19000 * Math.exp(-d / 35));
    f.frequency.value = occl > 0 ? Math.max(220, 900 * Math.pow(1 - occl, 1.6)) : open;
    const gn = A.ctx.createGain(); gn.gain.value = occl > 0 ? 0.7 - occl * 0.45 : 1;
    f.connect(gn); gn.connect(pn); pn.connect(bus());
    chain3 = f;
    return chain3;
  }

  // Oclusión 0..1: muestrea el rayo entre el oyente y la fuente y cuenta cuánto sólido atraviesa
  // (una columna fina apenas tapa; un muro grueso, la roca o una puerta cerrada tapan mucho)
  A.occlusion = (world, ax, ay, az, bx, by, bz) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
    if (L < 0.5) return 0;
    const n = Math.min(80, Math.ceil(L / 0.25));
    let solid = 0;
    for (let i = 1; i < n; i++) { const t = i / n; if (world.isSolidAt(ax + dx * t, ay + dy * t, az + dz * t)) solid++; }
    if (!solid) return 0;
    return Math.min(1, 0.3 + solid * 0.25 * 0.35);   // ~0,3 con un poco de muro, 1 con ~2 m de sólido
  };

  // salida con panorama estéreo opcional
  function out(pan) {
    if (src3) return chain();
    if (pan === undefined || pan === null || !A.ctx.createStereoPanner) return bus();
    const p = A.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(bus());
    return p;
  }

  function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0, pan) {
    if (!A.ctx || !A.enabled) return;
    const t = A.ctx.currentTime + delay;
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dst = out(pan); if (!dst) return;
    o.connect(g); g.connect(dst);
    if (!A.voice(o)) return;
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, freq = 1200, type = 'lowpass', delay = 0, q = 0.8, pan) {
    if (!A.ctx || !A.enabled) return;
    const t = A.ctx.currentTime + delay;
    const s = A.ctx.createBufferSource();
    s.buffer = A.noiseBuf;
    const f = A.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dst = out(pan); if (!dst) return;
    s.connect(f); f.connect(g); g.connect(dst);
    if (!A.voice(s)) return;
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // para js/core/sfx.js (sonidos más ricos): la misma salida (3D, buses) que el resto
  A._out = (pan) => out(pan);
  // límite de sonidos a la vez (0.52): en un tiroteo grande se acumulaban cientos de nodos de audio
  // y el móvil se ahogaba. Si ya suenan demasiados, los nuevos (los más pequeños) se saltan.
  A.voices = 0;
  A.maxVoices = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) ? 48 : 96;
  A.voice = (node) => { if (A.voices >= A.maxVoices) return false; A.voices++; node.onended = () => { A.voices--; }; return true; };
  A._tone = tone; A._noise = noise;
  A.setVolume = (v) => { A.volume = v; if (A.sfx) A.sfx.gain.value = v * 0.5; };
  // volumen general (música + efectos) y silencio cuando el juego no se ve (pestaña oculta, minimizado…)
  A.masterVol = 1; A.hidden = false;
  A.applyMaster = () => {
    if (!A.master) return;
    const v = A.hidden ? 0 : 0.9 * A.masterVol;
    // al volver a la pestaña también sube con un fundido corto (antes saltaba de golpe)
    try { A.master.gain.cancelScheduledValues(A.ctx.currentTime); A.master.gain.setTargetAtTime(v, A.ctx.currentTime, A.hidden ? 0.03 : 0.25); } catch (e) { A.master.gain.value = v; }
  };
  A.setMaster = (v) => { A.masterVol = v; A.applyMaster(); };
  A.setHidden = (h) => {
    A.hidden = h; A.applyMaster();
    if (!A.ctx) return;
    try { if (h) A.ctx.suspend(); else A.ctx.resume(); } catch (e) { /* nada */ }
  };

  let lastHit = 0;
  A.shoot = (power = 1, kind) => {
    const p = Math.min(power, 3), j = 0.94 + Math.random() * 0.12;   // pequeña variación entre disparos
    switch (kind) {
      case 'pistol':
        noise(0.11, 0.55, 3600 * j, 'lowpass'); noise(0.04, 0.3, 4200, 'highpass', 0, 0.7);
        tone(190 * j, 0.07, 'square', 0.1, 70); tone(95, 0.16, 'sine', 0.32, 40);
        noise(0.35, 0.1, 800, 'lowpass', 0.03); return;
      case 'deagle':   // estampido grave y largo, con chasquido metálico de la corredera
        noise(0.22, 0.75, 2400 * j, 'lowpass'); noise(0.06, 0.45, 3000, 'highpass', 0, 0.7);
        tone(72, 0.45, 'sine', 0.6, 28); tone(140 * j, 0.12, 'sawtooth', 0.12, 50);
        noise(0.9, 0.22, 520, 'lowpass', 0.03, 0.7);
        tone(1900 * j, 0.06, 'triangle', 0.04, null, 0.07); return;
      case 'revolver':   // restallido seco que resuena y el clic del tambor al girar
        noise(0.14, 0.65, 3000 * j, 'lowpass'); noise(0.05, 0.4, 5000, 'highpass', 0, 0.8);
        tone(85, 0.32, 'sine', 0.5, 32); tone(2300 * j, 0.25, 'triangle', 0.035, 2100);
        noise(0.7, 0.16, 650, 'lowpass', 0.04, 0.7);
        tone(1500, 0.02, 'square', 0.05, null, 0.24); noise(0.02, 0.06, 4000, 'highpass', 0.24); return;
      case 'auto':   // chasquidos cortos y secos
        noise(0.06, 0.38, 3800 * j, 'bandpass', 0, 0.9); tone(300 * j, 0.04, 'square', 0.07, 120); tone(110, 0.08, 'sine', 0.18, 50); return;
      case 'smg':
        noise(0.07, 0.42, 3000 * j, 'lowpass'); tone(240 * j, 0.05, 'square', 0.08, 90); tone(90, 0.1, 'sine', 0.22, 45); noise(0.2, 0.06, 700, 'lowpass', 0.02); return;
      case 'shotgun':   // trueno corto y ancho
        noise(0.3, 0.8, 1700 * j, 'lowpass'); noise(0.08, 0.35, 2600, 'highpass', 0, 0.6);
        tone(55, 0.5, 'sine', 0.6, 25); tone(120, 0.15, 'sawtooth', 0.12, 45);
        noise(0.9, 0.2, 380, 'lowpass', 0.05, 0.7); return;
      case 'rifle':   // chasquido supersónico y eco que se aleja
        noise(0.05, 0.7, 5200 * j, 'highpass', 0, 0.7); noise(0.16, 0.6, 2200, 'lowpass');
        tone(62, 0.55, 'sine', 0.55, 26);
        noise(1.4, 0.2, 700, 'lowpass', 0.06, 0.7); noise(1.1, 0.08, 1400, 'bandpass', 0.35, 1.5); return;
      case 'crossbow':   // chasquido de la cuerda y zumbido del virote
        tone(240 * j, 0.2, 'triangle', 0.22, 110); noise(0.05, 0.3, 2600, 'bandpass', 0, 3); noise(0.25, 0.08, 1200, 'bandpass', 0.03, 6); return;
      case 'dbarrel':   // estampido doble, más grave que la escopeta
        noise(0.35, 0.95, 1400 * j, 'lowpass'); noise(0.1, 0.4, 2400, 'highpass', 0, 0.6);
        tone(46, 0.6, 'sine', 0.7, 22); tone(100, 0.2, 'sawtooth', 0.15, 40); noise(1.1, 0.24, 330, 'lowpass', 0.05, 0.7); return;
      case 'lmg':   // golpe seco y pesado
        noise(0.09, 0.5, 2600 * j, 'lowpass'); tone(170 * j, 0.06, 'square', 0.09, 70); tone(68, 0.14, 'sine', 0.32, 36); noise(0.3, 0.08, 600, 'lowpass', 0.02); return;
      case 'flamer':   // soplido de la llama
        noise(0.16, 0.13, 700 + Math.random() * 300, 'lowpass', 0, 0.6); noise(0.12, 0.05, 2800, 'bandpass', 0, 1.5); return;
      case 'raygun':   // zumbido eléctrico que cae
        tone(1500 * j, 0.2, 'sawtooth', 0.11, 260); tone(760, 0.22, 'square', 0.05, 140); noise(0.12, 0.16, 4200, 'highpass'); tone(90, 0.18, 'sine', 0.25, 50); return;
      case 'launcher':   // "tunk" hueco y siseo del proyectil
        tone(150 * j, 0.16, 'sine', 0.45, 55); noise(0.25, 0.35, 420, 'lowpass');
        noise(0.45, 0.07, 3200, 'bandpass', 0.04, 1.2); return;
    }
    noise(0.1 + p * 0.04, 0.5 + p * 0.08, 3800 - p * 700, 'lowpass');
    noise(0.3 + p * 0.1, 0.12, 900, 'lowpass', 0.03);
    tone(240 - p * 40, 0.09, 'square', 0.12, 70);
    tone(100 - p * 15, 0.18 + p * 0.05, 'sine', 0.3 + p * 0.06, 35);
  };
  A.flesh = () => {
    if (!A.ctx) return;
    const now = A.ctx.currentTime; if (now - lastHit < 0.03) return; lastHit = now;
    noise(0.12, 0.35, 700, 'lowpass');
    tone(110 + Math.random() * 40, 0.1, 'sawtooth', 0.08, 60);
  };
  A.wall = () => { noise(0.08, 0.22, 3200, 'bandpass', 0, 1.5); tone(900 + Math.random() * 400, 0.04, 'square', 0.04); };
  A.gold = () => { tone(1320, 0.08, 'square', 0.07); tone(1760, 0.12, 'square', 0.07, null, 0.06); };
  A.hurt = (k = 0.5) => { if (src3) return A.direct(() => A.hurt(k));
    tone(240 - k * 60, 0.25, 'sawtooth', 0.18 + k * 0.1, 80); noise(0.15, 0.2 + k * 0.15, 500);
    tone(70, 0.3, 'sine', 0.35 * k + 0.15, 35);                // golpe sordo en el pecho
    if (k > 0.6) noise(0.4, 0.12, 3200, 'bandpass', 0.05, 6);  // pitido de oídos
  };
  A.heartbeat = (v = 0.5) => { tone(55, 0.12, 'sine', 0.35 * v, 40); tone(50, 0.14, 'sine', 0.28 * v, 35, 0.18); };
  A.reload = () => { tone(500, 0.04, 'square', 0.08); tone(350, 0.05, 'square', 0.08, null, 0.25); tone(800, 0.05, 'square', 0.1, null, 0.5); };
  A.empty = () => tone(1200, 0.03, 'square', 0.06);
  // objetos arrojables: anilla de la granada y pitido del señuelo
  A.pin = () => { tone(2600, 0.03, 'triangle', 0.08); tone(1800, 0.04, 'square', 0.04, null, 0.04); };
  A.beep = (vol = 1) => tone(1650, 0.06, 'square', 0.07 * vol);
  A.door = () => { noise(0.8, 0.3, 300); tone(60, 0.8, 'sawtooth', 0.12, 40); };
  // rastrillo de hierro subiendo: chirrido de cadenas y golpe al final
  A.gate = () => {
    noise(0.9, 0.18, 700, 'bandpass', 0, 3); tone(90, 0.9, 'sawtooth', 0.08, 140);
    for (let i = 0; i < 7; i++) tone(1400 + Math.random() * 600, 0.04, 'square', 0.03, null, i * 0.12);
    noise(0.25, 0.3, 250, 'lowpass', 0.85); tone(55, 0.3, 'sine', 0.25, 35, 0.85);
  };
  A.buy = () => { tone(660, 0.08, 'square', 0.1); tone(990, 0.08, 'square', 0.1, null, 0.08); tone(1320, 0.15, 'square', 0.1, null, 0.16); };
  A.deny = () => { tone(180, 0.15, 'square', 0.12); tone(140, 0.2, 'square', 0.12, null, 0.12); };
  A.upgrade = () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, null, i * 0.08)); };
  A.groan = () => {
    const f = 70 + Math.random() * 50;
    tone(f, 0.9, 'sawtooth', 0.05, f * 0.7);
    tone(f * 1.02, 0.9, 'sawtooth', 0.04, f * 0.6);
  };
  A.zombieDie = () => { noise(0.35, 0.4, 500); tone(90, 0.4, 'sawtooth', 0.12, 30); };
  A.punch = () => { noise(0.1, 0.3, 400); tone(70, 0.12, 'sine', 0.3, 40); };
  A.roar = () => { tone(60, 1.4, 'sawtooth', 0.22, 30); tone(64, 1.4, 'sawtooth', 0.18, 28); noise(1.2, 0.25, 400); };
  // Explosión: estampido seco, golpe grave que se nota en el pecho y retumbo con cascotes
  A.explosion = (dist = 0) => {
    const v = Math.max(0.25, 1 - dist * 0.7);
    noise(0.18, 0.6 * v, 5000, 'lowpass');
    noise(0.06, 0.4 * v, 3000, 'highpass', 0, 0.7);
    tone(65, 0.9, 'sine', 0.75 * v, 22);
    tone(110, 0.35, 'triangle', 0.25 * v, 40);
    noise(1.6, 0.42 * v, 320, 'lowpass', 0.03, 0.6);
    noise(2.4, 0.16 * v, 140, 'lowpass', 0.25, 0.8);
    for (let i = 0; i < 7; i++) noise(0.05, 0.06 * v, 1800 + Math.random() * 2500, 'bandpass', 0.35 + Math.random() * 0.9, 3);
  };
  A.slam = () => { tone(45, 0.8, 'sine', 0.6, 25); noise(0.7, 0.5, 250); };
  A.crumble = () => { noise(0.3, 0.18, 900, 'lowpass'); };
  // Pasos según el suelo que pisas
  A.step = (surf = 'stone') => {
    const r = Math.random();
    switch (surf) {
      case 'wood': tone(140 + r * 40, 0.07, 'triangle', 0.05, 90); noise(0.04, 0.03, 900, 'bandpass', 0, 2); break;
      case 'water': noise(0.12, 0.06, 1400 + r * 600, 'bandpass', 0, 1.5); tone(600 + r * 300, 0.06, 'sine', 0.025, 300, 0.02); break;
      case 'bone': for (let i = 0; i < 3; i++) noise(0.025, 0.05, 3500, 'highpass', i * 0.018, 1); break;
      case 'metal': tone(320 + r * 80, 0.12, 'square', 0.02, 260); noise(0.04, 0.03, 2500, 'bandpass', 0, 3); break;
      case 'dirt': noise(0.08, 0.05, 260 + r * 80, 'lowpass', 0, 0.7); break;
      case 'crystal': tone(1800 + r * 900, 0.15, 'sine', 0.02, null); noise(0.03, 0.025, 4000, 'highpass'); break;
      default: noise(0.05, 0.035, 300 + r * 120); noise(0.02, 0.012, 1800, 'bandpass', 0.01, 2);
    }
  };

  // pisada de un zombi (más fuerte que la del jugador: se oye venir entre la niebla)
  A.zstep = () => { const r = Math.random(); noise(0.08, 0.16, 220 + r * 90, 'lowpass', 0, 0.8); noise(0.04, 0.05, 1400 + r * 500, 'bandpass', 0.01, 2); };

  // Tamaño de la sala → cuánta reverberación (m³ aproximados)
  A.setRoom = (vol) => {
    if (!A.ctx || !A.revLargeG) return;
    const k = Math.max(0, Math.min(1, (vol - 1500) / 7000));
    const t = A.ctx.currentTime;
    A.revSmallG.gain.setTargetAtTime(0.16 * (1 - k) + 0.04, t, 0.5);
    A.revLargeG.gain.setTargetAtTime(0.04 + 0.3 * k, t, 0.5);
  };

  // Sonidos de ambiente situados en un punto de la sala
  A.ambientAt = (kind, x, z) => {
    if (!A.ctx || !VX.game) return;
    const s = A.spatial(x, z, VX.game.player);
    if (s.vol <= 0.03) return;
    const v = s.vol, p = s.pan, r = Math.random();
    A.ambCtx = true;
    try { ambientSound(kind, v, p, r); } finally { A.ambCtx = false; }
  };
  function ambientSound(kind, v, p, r) {
    switch (kind) {
      case 'drip': { const fr = 1300 + r * 1500; tone(fr, 0.06, 'sine', 0.06 * v, fr * 0.55, 0, p); if (r < 0.5) tone(fr * 0.8, 0.05, 'sine', 0.03 * v, fr * 0.5, 0.22, p); break; }
      case 'chain': for (let i = 0; i < 4; i++) { tone(900 + Math.random() * 500, 0.05, 'square', 0.012 * v, 700, i * 0.11, p); noise(0.03, 0.02 * v, 4000, 'highpass', i * 0.11, 1, p); } break;
      case 'creak': tone(120 + r * 60, 0.9, 'sawtooth', 0.025 * v, 90 + r * 50, 0, p); noise(0.8, 0.02 * v, 700, 'bandpass', 0, 6, p); break;
      case 'wind': noise(2.2, 0.06 * v, 500 + r * 300, 'bandpass', 0, 2.5, p); break;
      case 'moan': { const f = 90 + r * 60; tone(f, 1.8, 'sawtooth', 0.03 * v, f * 0.75, 0, p); tone(f * 1.5, 1.6, 'sine', 0.02 * v, f, 0.2, p); break; }
      case 'rumble': tone(38 + r * 10, 1.6, 'sine', 0.18 * v, 30); noise(1.4, 0.06 * v, 180, 'lowpass', 0, 0.8, p); break;
      case 'pebbles': for (let i = 0; i < 5; i++) noise(0.03, 0.04 * v, 2500 + Math.random() * 2000, 'bandpass', i * 0.07 + Math.random() * 0.05, 3, p); break;
      case 'bubble': for (let i = 0; i < 3; i++) tone(200 + Math.random() * 300, 0.08, 'sine', 0.04 * v, 500, i * 0.09, p); break;
      case 'hammer': tone(1700 + r * 200, 0.3, 'triangle', 0.03 * v, null, 0, p); noise(0.04, 0.05 * v, 5000, 'highpass', 0, 1, p); break;
      case 'whisper': noise(1.2, 0.04 * v, 2600 + r * 1500, 'bandpass', 0, 8, p); noise(1, 0.03 * v, 1800, 'bandpass', 0.3, 9, p); break;
      case 'chime': [0, 2, 4].forEach((n, i) => tone(1046 * Math.pow(2, (n + r * 2) / 12), 1.4, 'sine', 0.02 * v, null, i * 0.18, p)); break;
    }
  }
  A.bite = () => { noise(0.08, 0.35, 1800, 'bandpass', 0, 2); tone(320, 0.06, 'square', 0.08, 120); noise(0.06, 0.25, 900, 'lowpass', 0.07); };
  A.snap = () => { noise(0.05, 0.4, 2500, 'highpass'); tone(180, 0.08, 'square', 0.1, 60); };
  A.save = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, 'sine', 0.1, null, i * 0.1)); };
  A.click = () => tone(880, 0.03, 'square', 0.05);
  // Ignición: un "fuuum" suave que crece y se apaga (aire que entra en la llama)
  A.torch = (vol = 1) => {
    if (!A.ctx || !A.enabled) return;
    const t = A.ctx.currentTime, src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf;
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.18); f.frequency.exponentialRampToValueAtTime(260, t + 0.8);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(f); f.connect(g); g.connect(A.sfx); src.start(t, Math.random() * 0.4); src.stop(t + 0.95);
    for (let i = 0; i < 4; i++) A.crackle(0.6 * vol, 0, 0.1 + Math.random() * 0.5);
  };
  // Chasquido de la madera al arder: un clic seco y, a veces, un estallido más grave
  A.crackle = (vol = 1, pan, delay = 0) => {
    if (!A.ctx || !A.enabled) return;
    const r = Math.random();
    noise(0.008 + r * 0.02, (0.05 + r * 0.06) * vol, 2500 + r * 3500, 'highpass', delay, 0.7, pan);
    if (r < 0.25) noise(0.05, 0.05 * vol, 700 + r * 600, 'bandpass', delay + 0.01, 2, pan);
  };
  // Lecho del fuego: rumor continuo de las llamas (volumen según lo cerca y lo grande que sea)
  A.setFire = (level, pan = 0) => {
    if (!A.ctx || !A.enabled) return;
    if (!A.fireBed) {
      const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.5;
      const bp = A.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.6;
      const g1 = A.ctx.createGain(), g2 = A.ctx.createGain(); g1.gain.value = 1; g2.gain.value = 0.18;
      const g = A.ctx.createGain(); g.gain.value = 0;
      const pn = A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : null;
      // la llama "respira": un LFO lento mueve el volumen y el filtro
      const lfo = A.ctx.createOscillator(); lfo.frequency.value = 0.7; const lg = A.ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(lp.frequency);
      src.connect(lp); lp.connect(g1); src.connect(bp); bp.connect(g2); g1.connect(g); g2.connect(g);
      if (pn) { g.connect(pn); pn.connect(A.sfx); } else g.connect(A.sfx);
      src.start(); lfo.start();
      A.fireBed = { g, pn };
    }
    const t = A.ctx.currentTime, v = Math.min(0.32, level * 0.22);
    A.fireBed.g.gain.setTargetAtTime(v, t, 0.25);
    if (A.fireBed.pn) A.fireBed.pn.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), t, 0.2);
  };
  // Lluvia: siseo continuo con gotas sueltas (volumen 0 = apagada)
  A.setRain = (level) => {
    if (!A.ctx || !A.enabled) return;
    if (!A.rainBed) {
      const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
      const hp = A.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
      const src2 = A.ctx.createBufferSource(); src2.buffer = A.noiseBuf; src2.loop = true; src2.playbackRate.value = 0.5;
      const lp2 = A.ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 400;
      const g2 = A.ctx.createGain(); g2.gain.value = 0.45;
      const g = A.ctx.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); src2.connect(lp2); lp2.connect(g2); g2.connect(g); g.connect(A.sfx);
      src.start(); src2.start(0, 0.3);
      A.rainBed = { g };
    }
    // de fondo, sin tapar el resto: un siseo suave que sube y baja con las rachas
    const gust = 0.8 + Math.sin(A.ctx.currentTime * 0.23) * 0.2;
    A.rainBed.g.gain.setTargetAtTime(Math.min(0.09, level * 0.08) * gust, A.ctx.currentTime, 0.8);
  };
  // Trueno: estallido seco y retumbo largo
  A.thunder = (dist = 0.5) => {
    noise(0.25, 0.35 * (1 - dist * 0.6), 1800, 'lowpass');
    noise(3.5, 0.32, 160 + (1 - dist) * 200, 'lowpass', 0.05 + dist * 0.6, 0.7);
    tone(42, 2.8, 'sine', 0.3, 28, 0.1 + dist * 0.5);
  };
  // chillón: grito agudo que sube y vibra; antes, una inspiración ronca
  A.screamWind = () => { noise(0.9, 0.08, 900, 'bandpass', 0, 3); tone(140, 0.9, 'sawtooth', 0.04, 220); };
  A.scream = () => {
    tone(700, 1.1, 'sawtooth', 0.16, 1500); tone(1050, 1.0, 'square', 0.07, 1900, 0.03); tone(520, 1.2, 'sawtooth', 0.1, 980, 0.05);
    noise(1.1, 0.22, 2600, 'bandpass', 0, 2.5); noise(0.5, 0.15, 5000, 'highpass', 0.1, 1);
  };
  // graznido de cuervo
  A.crow = () => { if (!A.ctx) return; const f = 520 + Math.random() * 160; tone(f, 0.16, 'sawtooth', 0.07, f * 0.6); noise(0.14, 0.06, 1400, 'bandpass', 0, 4); tone(f * 0.9, 0.12, 'square', 0.03, f * 0.5, 0.2); };
  A.rotor = () => { noise(0.07, 0.22, 260, 'lowpass', 0, 1.2); tone(48, 0.08, 'sine', 0.18, 38); };
  A.splat = () => { noise(0.18, 0.45, 600, 'lowpass'); noise(0.12, 0.25, 2400, 'bandpass', 0.04, 2); tone(70, 0.15, 'sine', 0.2, 40); };
  A.dash = () => { noise(0.22, 0.3, 1600, 'bandpass', 0, 1.2); tone(300, 0.15, 'sine', 0.05, 150); };
  A.fuse = () => { for (let i = 0; i < 6; i++) tone(900 + i * 120, 0.06, 'square', 0.06, null, i * 0.14); };
  A.reward = () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, null, i * 0.07)); };
  A.fail = () => { tone(300, 0.25, 'sawtooth', 0.1, 120); };

  // Sonido situado en el espacio: volumen por distancia y panorama izquierda/derecha
  A.spatial = (x, z, P) => {
    const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz) || 1;
    const rx = -Math.cos(P.yaw), rz = Math.sin(P.yaw);  // vector "derecha"
    return { pan: (dx * rx + dz * rz) / d * 0.85, vol: Math.max(0, 1 - d / 22) };
  };
  A.groanAt = (x, z, P, dog, y) => {
    if (!A.ctx) return;
    A.vizTag = dog ? 'dog' : 'enemy';
    A.at(x, (y !== undefined ? y : (P ? P.y : 0)) + 1.5, z, () => {
      if (dog) { tone(220, 0.25, 'sawtooth', 0.09, 120); noise(0.2, 0.14, 900, 'bandpass', 0.05, 2); return; }
      const f = 70 + Math.random() * 50;
      tone(f, 0.9, 'sawtooth', 0.11, f * 0.7);
      tone(f * 1.02, 0.9, 'sawtooth', 0.08, f * 0.6);
    });
    A.vizTag = null;
  };

  // Ambiente: viento continuo y goteos al azar
  A.ambient = { on: false };
  A.startAmbient = () => {
    if (!A.ctx || A.ambient.on) return;
    A.ambient.on = true;
    if (A.setBiome) return;   // ahora el fondo lo pone la capa de cada bioma (A.setBiome)
    const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.5;
    const g = A.ctx.createGain(); g.gain.value = 0.05;
    const lfo = A.ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = A.ctx.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(g.gain);
    const lfo2 = A.ctx.createOscillator(); lfo2.frequency.value = 0.13;
    const lg2 = A.ctx.createGain(); lg2.gain.value = 160;
    lfo2.connect(lg2); lg2.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(A.sfx);
    src.start(); lfo.start(); lfo2.start();
    const drip = () => {
      if (!A.ambient.on) return;
      const pan = Math.random() * 2 - 1, fr = 1400 + Math.random() * 1600;
      tone(fr, 0.06, 'sine', 0.035, fr * 0.6, 0, pan);
      if (Math.random() < 0.5) tone(fr * 0.8, 0.05, 'sine', 0.02, fr * 0.5, 0.25, pan);
      setTimeout(drip, 900 + Math.random() * 3200);
    };
    void drip;
  };
  // ---------- Ambiente de fondo de cada bioma ----------
  // Una capa continua que cambia con el bioma (con fundido): viento por las grietas en la Cripta,
  // agua que corre en las Cloacas, roca que cruje en las Minas, fuelles y martillos en la Forja,
  // zumbido de esporas en el Jardín y un tono grave que late en el Vacío.
  A.bedZone = -2;
  function bedNode() {
    if (!A.bed) { A.bed = A.ctx.createGain(); A.bed.gain.value = 1; A.bed.connect(A.ambBus || A.sfx); }
    return A.bed;
  }
  function loopNoise(freq, type, q, vol, dst) {
    const src = A.ctx.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = A.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dst); src.start(0, Math.random());
    return { src, f, g };
  }
  function lfo(rate, depth, param) {
    const o = A.ctx.createOscillator(); o.frequency.value = rate;
    const g = A.ctx.createGain(); g.gain.value = depth;
    o.connect(g); g.connect(param); o.start();
    return o;
  }
  function osc(freq, type, vol, dst) {
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = A.ctx.createGain(); g.gain.value = vol;
    o.connect(g); g.connect(dst); o.start();
    return { o, g };
  }
  A.setBiome = (zone) => {
    if (!A.ctx || zone === A.bedZone) return;
    A.bedZone = zone;
    const t = A.ctx.currentTime, root = bedNode();
    // fundido de salida de la capa anterior
    if (A.bedLayer) { const L = A.bedLayer; L.g.gain.setTargetAtTime(0, t, 0.8); setTimeout(() => { for (const n of L.nodes) { try { n.stop ? n.stop() : 0; } catch (e) { /* nada */ } } L.g.disconnect(); }, 4000); clearTimeout(L.timer); L.dead = true; }
    A.bedLayer = null;
    if (zone < 0 || zone > 5) return;
    const g = A.ctx.createGain(); g.gain.value = 0; g.connect(root); g.gain.setTargetAtTime(1, t, 1.2);
    const L = { g, nodes: [], timer: 0, dead: false };
    const keep = (x) => { if (x.src) L.nodes.push(x.src); if (x.o) L.nodes.push(x.o); if (x.start && x.stop) L.nodes.push(x); return x; };
    switch (zone) {
      case 0: {   // viento que silba por las grietas y un zumbido grave de cripta
        const w = keep(loopNoise(520, 'bandpass', 3, 0.045, g)); keep(lfo(0.07, 0.035, w.g.gain)); keep(lfo(0.11, 260, w.f.frequency));
        const w2 = keep(loopNoise(1500, 'bandpass', 9, 0.012, g)); keep(lfo(0.05, 0.012, w2.g.gain)); keep(lfo(0.09, 500, w2.f.frequency));
        keep(osc(55, 'sine', 0.025, g));
        break;
      }
      case 1: {   // agua corriendo por los canales, con borboteo
        const a = keep(loopNoise(800, 'bandpass', 0.7, 0.05, g)); keep(lfo(0.3, 0.012, a.g.gain));
        const b = keep(loopNoise(3200, 'highpass', 0.7, 0.012, g)); keep(lfo(7, 0.008, b.g.gain));
        keep(loopNoise(160, 'lowpass', 0.8, 0.05, g));
        break;
      }
      case 2: {   // rumor de roca, corrientes de aire en las galerías
        const r = keep(loopNoise(110, 'lowpass', 1.2, 0.09, g)); keep(lfo(0.05, 0.05, r.g.gain));
        const w = keep(loopNoise(380, 'bandpass', 2, 0.02, g)); keep(lfo(0.08, 120, w.f.frequency));
        break;
      }
      case 3: {   // rugido del fuego, fuelles que respiran y martillos lejanos
        const f = keep(loopNoise(260, 'lowpass', 0.9, 0.06, g)); keep(lfo(0.22, 0.045, f.g.gain)); keep(lfo(0.22, 140, f.f.frequency));
        keep(loopNoise(2400, 'bandpass', 2, 0.006, g));
        break;
      }
      case 4: {   // zumbido de esporas e insectos, aire húmedo
        const z = keep(osc(118, 'sawtooth', 0.004, g)); keep(lfo(5.5, 0.003, z.g.gain));
        const z2 = keep(osc(121, 'sawtooth', 0.003, g)); void z2;
        const h = keep(loopNoise(5200, 'bandpass', 6, 0.008, g)); keep(lfo(0.4, 0.006, h.g.gain));
        keep(loopNoise(300, 'lowpass', 0.7, 0.03, g));
        break;
      }
      case 5: {   // tono grave que late (dos ondas casi iguales) y barridos de ruido
        keep(osc(48, 'sine', 0.05, g)); keep(osc(49.3, 'sine', 0.05, g)); keep(osc(96.5, 'triangle', 0.008, g));
        const s = keep(loopNoise(900, 'bandpass', 4, 0.012, g)); keep(lfo(0.04, 700, s.f.frequency)); keep(lfo(0.06, 0.01, s.g.gain));
        break;
      }
    }
    // sonidos sueltos de cada bioma, de vez en cuando y desde cualquier lado
    const extra = () => {
      if (L.dead || !A.ctx) return;
      const p = Math.random() * 2 - 1, r = Math.random();
      const d = (fn) => { const s0 = src3, c0 = chain3; src3 = null; chain3 = null; try { fn(); } finally { src3 = s0; chain3 = c0; } };
      d(() => {
        if (zone === 1) for (let i = 0; i < 3; i++) tone(180 + Math.random() * 260, 0.07, 'sine', 0.02, 420, i * 0.09, p);           // burbujas
        else if (zone === 3) { tone(1500 + r * 300, 0.35, 'triangle', 0.012, null, 0, p); noise(0.03, 0.02, 5000, 'highpass', 0, 1, p); }   // martillo lejano
        else if (zone === 2 && r < 0.5) for (let i = 0; i < 4; i++) noise(0.03, 0.02, 2500 + Math.random() * 2000, 'bandpass', i * 0.08, 3, p);   // gravilla
        else if (zone === 4) [0, 4, 7].forEach((n, i) => tone(880 * Math.pow(2, (n + r * 3) / 12), 1.2, 'sine', 0.006, null, i * 0.2, p));
        else if (zone === 0 && r < 0.4) { const f = 80 + r * 50; tone(f, 1.6, 'sawtooth', 0.008, f * 0.75, 0, p); }                     // gemido lejano
        else if (zone === 5) tone(1900 + r * 600, 1.5, 'sine', 0.006, 900, 0, p);
      });
      L.timer = setTimeout(extra, 2500 + Math.random() * 6000);
    };
    L.timer = setTimeout(extra, 2000);
    A.bedLayer = L;
  };
  // Silencio tenso: baja el ambiente y la música un momento (antes de una emboscada)
  A.duck = (secs = 1.4, to = 0.06) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    const ps = [A.bed && A.bed.gain, VX.Music && VX.Music.out && VX.Music.out.gain].filter(Boolean);
    for (const p of ps) {
      const v = p === (A.bed && A.bed.gain) ? 1 : (VX.Music.vol || 0.55) * 0.6;
      p.cancelScheduledValues(t); p.setTargetAtTime(v * to, t, 0.12); p.setTargetAtTime(v, t + secs, 0.08);
    }
  };

  // cristal roto: estallido agudo y tintineo de trozos que caen
  A.glass = (n = 50) => {
    const k = Math.min(1, 0.4 + n / 300);
    noise(0.25, 0.35 * k, 4200, 'highpass');
    noise(0.5, 0.15 * k, 2600, 'bandpass', 0.05, 3);
    for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 2600, 0.05 + Math.random() * 0.08, 'sine', 0.035 * k, null, 0.08 + i * (0.05 + Math.random() * 0.07));
  };
  A.swish = () => { noise(0.14, 0.22, 2200, 'bandpass', 0, 3); };
  A.slash = () => { noise(0.1, 0.35, 1400, 'bandpass', 0, 2); tone(140, 0.08, 'sawtooth', 0.08, 70); };
  A.orb = () => tone(520 + Math.random() * 200, 0.12, 'sine', 0.03, 260);
  A.phase = () => { tone(110, 1.2, 'sawtooth', 0.15, 55); tone(220, 1.2, 'square', 0.06, 440); noise(1, 0.2, 800); };

  VX.Audio = A;
})();
