// Música procedural con WebAudio: un secuenciador sencillo con capas que
// cambian según la situación (título, exploración, combate, jefe, tienda, guardado).
(function () {
  const Mu = {
    mode: 'silent', vol: 0.55, out: null, step: 0, nextTime: 0, bpm: 80, timer: null,
    fade: null, sendDelay: null,
  };
  const A = () => VX.Audio;
  const f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Progresiones (raíz MIDI, menor/mayor)
  const PROG_MINOR = [[50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']];      // Dm Bb Gm A
  const PROG_DARK = [[50, 'm'], [48, 'M'], [46, 'M'], [45, 'M']];       // Dm C Bb A
  const PROG_SHOP = [[53, 'M'], [48, 'M'], [50, 'm'], [46, 'M']];       // F C Dm Bb
  const PROG_SAVE = [[45, 'M'], [50, 'm'], [53, 'M'], [48, 'M']];       // A Dm F C
  const HARM = [62, 64, 65, 67, 69, 70, 73, 74, 76, 77];                // re menor armónica
  const BOSS_RIFF = [0, -1, 3, -1, 4, 3, 1, -1, 0, -1, 5, 4, 3, -1, 6, 4];

  const TEMPO = { title: 70, explore: 76, combat: 124, boss: 140, shop: 96, save: 64, silent: 80, death: 60 };

  Mu.init = function () {
    const ctx = A().ctx;
    if (!ctx || Mu.out) return;
    Mu.out = ctx.createGain();
    Mu.out.gain.value = Mu.vol * 0.6;
    Mu.out.connect(A().master);
    // Eco
    const d = ctx.createDelay(1.5);
    d.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(Mu.out);
    Mu.sendDelay = d;
    Mu.timer = setInterval(Mu.tick, 25);
  };

  Mu.setVolume = function (v) {
    Mu.vol = v;
    if (Mu.out) Mu.out.gain.setTargetAtTime(v * 0.6, A().ctx.currentTime, 0.1);
  };

  Mu.setMode = function (m) {
    if (m === Mu.mode) return;
    const prev = Mu.mode;
    Mu.mode = m;
    Mu.bpm = TEMPO[m] || 80;
    // al cambiar de modo, sincroniza al siguiente compás
    if (prev !== m) Mu.step = Math.ceil(Mu.step / 16) * 16;
  };

  Mu.tick = function () {
    const ctx = A().ctx;
    if (!ctx || ctx.state !== 'running' || !Mu.out) return;
    if (Mu.nextTime < ctx.currentTime) Mu.nextTime = ctx.currentTime + 0.05;
    while (Mu.nextTime < ctx.currentTime + 0.15) {
      Mu.playStep(Mu.step, Mu.nextTime);
      Mu.nextTime += 60 / Mu.bpm / 4;
      Mu.step++;
    }
  };

  // ---------- Voces ----------
  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function pad(t, notes, dur, vol = 0.035, cutoff = 700) {
    const ctx = A().ctx;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 2;
    filt.frequency.setValueAtTime(cutoff * 0.6, t);
    filt.frequency.linearRampToValueAtTime(cutoff * 1.4, t + dur * 0.5);
    filt.frequency.linearRampToValueAtTime(cutoff * 0.6, t + dur);
    const g = ctx.createGain();
    env(g, t, Math.min(1.5, dur * 0.3), vol, dur, Math.min(1.5, dur * 0.4));
    filt.connect(g); g.connect(Mu.out);
    for (const n of notes) for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f(n); o.detune.value = det;
      o.connect(filt); o.start(t); o.stop(t + dur + 0.05);
    }
  }

  function pluck(t, note, dur, vol = 0.06, type = 'triangle', echo = 0.5) {
    const ctx = A().ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(Mu.out);
    if (echo > 0) { const s = ctx.createGain(); s.gain.value = echo; g.connect(s); s.connect(Mu.sendDelay); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  function bass(t, note, dur, vol = 0.12, type = 'sine', drive = false) {
    const ctx = A().ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f(note);
    const g = ctx.createGain();
    env(g, t, 0.01, vol, dur, dur * 0.5);
    if (drive) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 6;
      o.connect(lp); lp.connect(g);
    } else o.connect(g);
    g.connect(Mu.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function kick(t, vol = 0.5) {
    const ctx = A().ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(Mu.out);
    o.start(t); o.stop(t + 0.35);
  }

  function noiseHit(t, dur, vol, freq, type) {
    const ctx = A().ctx;
    const s = ctx.createBufferSource(); s.buffer = A().noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(Mu.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const snare = (t, v = 0.18) => { noiseHit(t, 0.18, v, 1800, 'bandpass'); bassTone(t, 190, 0.08, v * 0.5); };
  const hat = (t, v = 0.05) => noiseHit(t, 0.04, v, 7000, 'highpass');
  function bassTone(t, fr, dur, vol) {
    const ctx = A().ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(Mu.out); o.start(t); o.stop(t + dur + 0.02);
  }

  function chordNotes(root, q) { return [root, root + (q === 'm' ? 3 : 4), root + 7]; }

  // ---------- Secuenciador ----------
  Mu.playStep = function (step, t) {
    const m = Mu.mode;
    if (m === 'silent') return;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const spb = 60 / Mu.bpm;      // segundos por negra
    const R = Math.random;

    if (m === 'title' || m === 'save' || m === 'death') {
      const prog = m === 'save' ? PROG_SAVE : PROG_DARK;
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const ch = chordNotes(root, q);
      if (s === 0 && bar % 2 === 0) pad(t, ch.map((n) => n + 12), spb * 8, m === 'death' ? 0.02 : 0.03, 600);
      if (s === 0) bass(t, root - 12, spb * 4, 0.1);
      if (s % 4 === 0 && m !== 'death') {
        const arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 36];
        pluck(t, arp[(s / 4 + bar) % 4], 1.2, 0.045, 'sine', 0.6);
      }
      if (s === 10 && R() < 0.4) pluck(t, ch[2] + 36, 1.5, 0.03, 'sine', 0.7);
      return;
    }

    if (m === 'explore') {
      const [root, q] = PROG_MINOR[Math.floor(bar / 2) % 4];
      const ch = chordNotes(root, q);
      if (s === 0 && bar % 2 === 0) pad(t, ch.map((n) => n + 12), spb * 8, 0.026, 500);
      if (s === 0 || s === 10) bass(t, root - 12, spb * 2, 0.11);
      if (s % 2 === 0 && R() < 0.22) pluck(t, ch[Math.floor(R() * 3)] + 24 + (R() < 0.3 ? 12 : 0), 0.9, 0.035, 'triangle', 0.6);
      if (s === 8 && bar % 4 === 3) noiseHit(t, 1.2, 0.03, 400, 'lowpass');
      return;
    }

    if (m === 'shop') {
      const [root, q] = PROG_SHOP[Math.floor(bar / 2) % 4];
      const ch = chordNotes(root, q);
      if (s === 0 && bar % 2 === 0) pad(t, ch.map((n) => n + 12), spb * 8, 0.02, 900);
      if (s % 4 === 0) bass(t, (s === 8 ? ch[2] : root) - 12, spb * 0.9, 0.09, 'triangle');
      if (s % 2 === 0) pluck(t, [ch[0], ch[1], ch[2], ch[1]][(s / 2) % 4] + 24, 0.35, 0.04, 'square', 0.25);
      if (s % 4 === 2) hat(t, 0.025);
      return;
    }

    if (m === 'combat') {
      const [root, q] = PROG_MINOR[bar % 4];
      const ch = chordNotes(root, q);
      if (s === 0) pad(t, ch.map((n) => n + 12), spb * 4, 0.02, 1100);
      if (s === 0 || s === 8 || (s === 11 && R() < 0.6)) kick(t, 0.42);
      if (s === 4 || s === 12) snare(t, 0.15);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.045 : 0.025);
      if (s % 2 === 0) bass(t, root - 12 + (s % 8 === 6 ? 12 : 0), spb * 0.45, 0.14, 'sawtooth', true);
      if (s % 4 === 3 && R() < 0.5) pluck(t, ch[Math.floor(R() * 3)] + 24, 0.25, 0.03, 'square', 0.3);
      return;
    }

    if (m === 'boss') {
      const [root] = PROG_DARK[Math.floor(bar / 2) % 4];
      if (s % 4 === 0 || (s === 14)) kick(t, 0.5);
      if (s === 4 || s === 12) snare(t, 0.2);
      hat(t, s % 2 ? 0.02 : 0.04);
      bass(t, root - 12 + (s % 4 === 3 ? 7 : 0), spb * 0.22, 0.16, 'sawtooth', true);
      const r = BOSS_RIFF[s];
      if (r >= 0) pluck(t, HARM[r] + (bar % 4 >= 2 ? 0 : -12) + (root - 50), 0.22, 0.045, 'sawtooth', 0.2);
      if (s === 0 && bar % 2 === 0) pad(t, [root, root + 3, root + 6].map((n) => n + 12), spb * 8, 0.022, 900);
    }
  };

  VX.Music = Mu;
})();
