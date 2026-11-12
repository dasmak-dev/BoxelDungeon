// Efectos de sonido sintetizados con WebAudio (no requiere archivos).
(function () {
  const A = { ctx: null, master: null, sfx: null, enabled: true, noiseBuf: null, volume: 0.8 };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      A.ctx = new (window.AudioContext || window.webkitAudioContext)();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.9;
      A.master.connect(A.ctx.destination);
      A.sfx = A.ctx.createGain();
      A.sfx.gain.value = A.volume * 0.5;
      A.sfx.connect(A.master);
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

  // salida con panorama estéreo opcional
  function out(pan) {
    if (pan === undefined || pan === null || !A.ctx.createStereoPanner) return A.sfx;
    const p = A.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(A.sfx);
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
    o.connect(g); g.connect(out(pan));
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
    s.connect(f); f.connect(g); g.connect(out(pan));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  A.setVolume = (v) => { A.volume = v; if (A.sfx) A.sfx.gain.value = v * 0.5; };

  let lastHit = 0;
  A.shoot = (power = 1) => {
    const p = Math.min(power, 3);
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
  A.hurt = (k = 0.5) => {
    tone(240 - k * 60, 0.25, 'sawtooth', 0.18 + k * 0.1, 80); noise(0.15, 0.2 + k * 0.15, 500);
    tone(70, 0.3, 'sine', 0.35 * k + 0.15, 35);                // golpe sordo en el pecho
    if (k > 0.6) noise(0.4, 0.12, 3200, 'bandpass', 0.05, 6);  // pitido de oídos
  };
  A.heartbeat = (v = 0.5) => { tone(55, 0.12, 'sine', 0.35 * v, 40); tone(50, 0.14, 'sine', 0.28 * v, 35, 0.18); };
  A.reload = () => { tone(500, 0.04, 'square', 0.08); tone(350, 0.05, 'square', 0.08, null, 0.25); tone(800, 0.05, 'square', 0.1, null, 0.5); };
  A.empty = () => tone(1200, 0.03, 'square', 0.06);
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
  };
  A.bite = () => { noise(0.08, 0.35, 1800, 'bandpass', 0, 2); tone(320, 0.06, 'square', 0.08, 120); noise(0.06, 0.25, 900, 'lowpass', 0.07); };
  A.snap = () => { noise(0.05, 0.4, 2500, 'highpass'); tone(180, 0.08, 'square', 0.1, 60); };
  A.save = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.6, 'sine', 0.1, null, i * 0.1)); };
  A.click = () => tone(880, 0.03, 'square', 0.05);
  A.torch = () => noise(0.4, 0.15, 600);
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
  A.groanAt = (x, z, P, dog) => {
    if (!A.ctx) return;
    const s = A.spatial(x, z, P);
    if (s.vol <= 0.02) return;
    if (dog) { tone(220, 0.25, 'sawtooth', 0.06 * s.vol, 120, 0, s.pan); noise(0.2, 0.1 * s.vol, 900, 'bandpass', 0.05, 2, s.pan); return; }
    const f = 70 + Math.random() * 50;
    tone(f, 0.9, 'sawtooth', 0.07 * s.vol, f * 0.7, 0, s.pan);
    tone(f * 1.02, 0.9, 'sawtooth', 0.05 * s.vol, f * 0.6, 0, s.pan);
  };

  // Ambiente: viento continuo y goteos al azar
  A.ambient = { on: false };
  A.startAmbient = () => {
    if (!A.ctx || A.ambient.on) return;
    A.ambient.on = true;
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
