// Sonidos más ricos (0.51): en lugar de un pitido y un ruido, cada sonido se monta por capas
//  · chasquido (el estallido inicial, muy corto y agudo)
//  · cuerpo (ruido con el filtro barriendo de agudo a grave: el «bum» de verdad)
//  · golpe grave (un seno que cae de tono: el pecho del disparo)
//  · mecánica (piezas de metal que suenan con varios armónicos, como el metal real)
//  · cola (el eco de la sala, largo y bajito)
// y las recargas suenan pieza a pieza, sincronizadas con la animación de cada arma.
(function () {
  const A = VX.Audio;
  const ctx = () => A.ctx;
  const ok = () => A.ctx && A.enabled !== false && A.noiseBuf;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- piezas sueltas ----------
  // ruido filtrado con ataque suave opcional y barrido del filtro (f → f2)
  function nz(dur, vol, f, type = 'lowpass', delay = 0, q = 0.8, pan, f2, att = 0.002, rate = 1) {
    if (!ok()) return;
    const c = ctx(), t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.playbackRate.value = rate;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dst = A._out(pan); if (!dst) return;
    s.connect(fl); fl.connect(g); g.connect(dst);
    s.start(t, Math.random() * 0.6); s.stop(t + dur + 0.03);
  }
  // tono con caída de frecuencia (f → f2)
  function os(f, dur, type, vol, f2, delay = 0, pan, att = 0.001) {
    if (!ok()) return;
    const c = ctx(), t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(10, f2), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const dst = A._out(pan); if (!dst) return;
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.03);
  }
  // metal: varios armónicos inarmónicos que se apagan a distinto ritmo (suena a pieza de acero)
  function metal(f, vol, delay = 0, pan, decay = 0.18, ratios = [1, 2.76, 5.4, 8.93]) {
    ratios.forEach((r, i) => os(f * r * rnd(0.985, 1.015), decay / (1 + i * 0.6), 'sine', vol / (1 + i * 0.8), null, delay, pan));
  }
  // latón (vainas, cartuchos): más agudo, corto y brillante
  const brass = (vol, delay, pan) => metal(rnd(2800, 4200), vol, delay, pan, 0.12, [1, 2.4, 4.1]);
  // clic seco (seguros, retenes, gatillos)
  const click = (vol = 0.1, delay = 0, pan, f = 3200) => { nz(0.012, vol, 5000, 'highpass', delay, 0.7, pan); os(f, 0.018, 'square', vol * 0.25, f * 0.7, delay, pan); };
  // golpe sordo (algo que encaja de golpe)
  const thunk = (vol = 0.2, delay = 0, pan, f = 160) => { nz(0.07, vol, 900, 'lowpass', delay, 1, pan, 300); os(f, 0.09, 'sine', vol * 0.8, f * 0.55, delay, pan); };
  // deslizar metal contra metal (corredera, cerrojo hacia atrás)
  const slide = (vol = 0.06, delay = 0, pan, dur = 0.08, f = 1600, f2 = 2600) => nz(dur, vol, f, 'bandpass', delay, 2.5, pan, f2, dur * 0.4);

  // ---------- recargas: cada arma, pieza a pieza ----------
  // [momento de la animación (0-1), sonido]. Los momentos coinciden con gunAnim.js
  const R = {
    magOut: () => { click(0.1); slide(0.05, 0.01, undefined, 0.07, 2200, 1400); },
    magDrop: () => { metal(rnd(900, 1300), 0.05, 0.28, 0.4, 0.2); nz(0.05, 0.05, 1800, 'bandpass', 0.28, 2, 0.4); metal(rnd(700, 1000), 0.025, 0.38, 0.4, 0.12); },
    magIn: () => { slide(0.05, 0, undefined, 0.06, 1200, 1900); thunk(0.22, 0.05, undefined, 140); click(0.14, 0.055, undefined, 2600); },
    slideBack: () => { click(0.08); slide(0.09, 0.005, undefined, 0.07, 1400, 2800); },
    slideFwd: () => { slide(0.07, 0, undefined, 0.04, 2800, 1800); click(0.16, 0.035, undefined, 2200); metal(2100, 0.05, 0.035, undefined, 0.15); },
    boltUp: () => { click(0.1, 0, undefined, 1800); metal(1700, 0.04, 0.005, undefined, 0.1); },
    boltBack: () => { slide(0.1, 0, undefined, 0.1, 900, 1700); brass(0.04, 0.08, 0.5); },
    boltFwd: () => { slide(0.09, 0, undefined, 0.07, 1700, 1000); thunk(0.1, 0.06, undefined, 220); },
    boltDown: () => { click(0.14, 0, undefined, 2000); metal(1500, 0.035, 0.005, undefined, 0.12); },
    cylOpen: () => { click(0.1, 0, undefined, 2600); metal(2600, 0.04, 0.01, undefined, 0.14); },
    ejectRod: () => { slide(0.06, 0, undefined, 0.05, 1500, 2500); for (let i = 0; i < 6; i++) brass(0.03, 0.12 + i * 0.035 + Math.random() * 0.03, rnd(-0.3, 0.6)); },
    speedIn: () => { slide(0.05, 0, undefined, 0.06, 1100, 1800); click(0.12, 0.05, undefined, 2900); },
    cylClose: () => { thunk(0.14, 0, undefined, 260); click(0.12, 0.01); for (let i = 0; i < 3; i++) click(0.04, 0.05 + i * 0.03, undefined, 4200); },
    breakOpen: () => { click(0.11, 0, undefined, 1500); os(220, 0.12, 'sawtooth', 0.02, 160, 0.01); metal(800, 0.05, 0.02, undefined, 0.2); },
    shellIn: () => { nz(0.05, 0.06, 1800, 'lowpass', 0, 1); thunk(0.1, 0.035, undefined, 300); },
    shellsOut: () => { nz(0.03, 0.08, 1300, 'bandpass', 0, 2); nz(0.03, 0.07, 1100, 'bandpass', 0.02, 2); thunk(0.04, 0.38, 0.4, 420); thunk(0.04, 0.45, 0.5, 380); },
    breakClose: () => { thunk(0.28, 0, undefined, 120); metal(650, 0.07, 0.005, undefined, 0.22); click(0.12, 0.01); },
    pumpBack: () => { slide(0.11, 0, undefined, 0.07, 700, 1300); click(0.08, 0.06, undefined, 1800); },
    pumpFwd: () => { slide(0.1, 0, undefined, 0.06, 1300, 700); thunk(0.18, 0.05, undefined, 180); },
    lidOpen: () => { click(0.12, 0, undefined, 1600); os(300, 0.15, 'sawtooth', 0.02, 220, 0.01); metal(1100, 0.04, 0.02, undefined, 0.15); },
    boxOut: () => { slide(0.06, 0, undefined, 0.08, 900, 600); metal(500, 0.05, 0.3, 0.4, 0.25); thunk(0.08, 0.32, 0.4, 120); },
    boxIn: () => { thunk(0.26, 0, undefined, 110); metal(600, 0.05, 0.01, undefined, 0.2); },
    beltLoad: () => { for (let i = 0; i < 6; i++) { click(0.03, i * 0.045, undefined, 3000 + i * 150); brass(0.006, i * 0.045 + 0.01); } },
    lidClose: () => { thunk(0.3, 0, undefined, 130); metal(950, 0.06, 0.005, undefined, 0.2); click(0.12, 0.01); },
    charge: () => { slide(0.09, 0, undefined, 0.08, 900, 1800); slide(0.08, 0.12, undefined, 0.06, 1800, 1000); thunk(0.14, 0.17, undefined, 200); },
    crank: () => { for (let i = 0; i < 7; i++) click(0.06, i * 0.07, undefined, 2200 + (i % 2) * 300); nz(0.5, 0.02, 600, 'bandpass', 0, 3, undefined, 900, 0.05); },
    stringLock: () => { thunk(0.16, 0, undefined, 240); os(190, 0.35, 'triangle', 0.06, 140, 0.01); },
    boltLay: () => { nz(0.12, 0.05, 1200, 'bandpass', 0, 1.5, undefined, 700, 0.03); },
    boltClick: () => { click(0.12, 0, undefined, 2400); },
    grenIn: () => { slide(0.05, 0, undefined, 0.08, 700, 1100); thunk(0.22, 0.07, undefined, 110); metal(480, 0.04, 0.07, undefined, 0.2); },
    valveOff: () => { os(1200, 0.12, 'sine', 0.025, 900); nz(0.45, 0.05, 4000, 'highpass', 0, 0.7, undefined, 2500, 0.01); },
    tankOut: () => { click(0.12, 0, undefined, 1400); metal(700, 0.05, 0.01, undefined, 0.25); thunk(0.1, 0.33, 0.4, 100); },
    tankIn: () => { thunk(0.3, 0, undefined, 95); metal(520, 0.06, 0.01, undefined, 0.3); },
    valveOn: () => { os(900, 0.16, 'sine', 0.03, 1250); nz(0.6, 0.035, 2000, 'highpass', 0.05, 0.7, undefined, 5000, 0.25); os(140, 0.4, 'sine', 0.04, 260, 0.15); },
    cellOut: () => { os(130, 0.18, 'square', 0.03, 70); nz(0.2, 0.06, 3000, 'bandpass', 0, 4, undefined, 1200); click(0.08, 0.02); },
    cellIn: () => { thunk(0.18, 0, undefined, 180); click(0.12, 0.01, undefined, 3400); },
    chargeUp: () => { os(180, 0.55, 'sawtooth', 0.025, 1700); os(360, 0.55, 'sine', 0.03, 3400, 0.02); nz(0.5, 0.02, 5000, 'highpass', 0.05, 0.7, undefined, 8000, 0.3); click(0.06, 0.55, undefined, 5000); },
  };
  // la secuencia de cada arma (los momentos son los de la animación de recarga)
  function cues(key, w) {
    switch (key) {
      case 'pistola': case 'deagle': case 'auto':
        return [[0.08, 'magOut'], [0.14, 'magDrop'], [0.62, 'magIn'], [0.77, 'slideBack'], [0.86, 'slideFwd']];
      case 'revolver':
        return [[0.06, 'cylOpen'], [0.2, 'ejectRod'], [0.6, 'speedIn'], [0.86, 'cylClose']];
      case 'smg':
        return [[0.08, 'magOut'], [0.14, 'magDrop'], [0.62, 'magIn'], [0.79, 'slideBack'], [0.86, 'slideFwd']];
      case 'rifle':   // el cargador viejo sale despedido y cae; el nuevo entra de un golpe; se monta el cerrojo
        return [[0.1, 'magOut'], [0.16, 'magDrop'], [0.64, 'magIn'], [0.77, 'boltUp'], [0.81, 'boltBack'], [0.86, 'boltFwd'], [0.91, 'boltDown']];
      case 'shotgun': case 'launcher': {
        const n = Math.min(4, Math.max(key === 'launcher' ? 1 : 2, w.stats().mag - Math.max(0, w.slot.ammo)));
        const out = [[0.05, 'breakOpen']];
        for (let i = 0; i < n; i++) out.push([0.16 + (i + 0.6) * (0.66 / n), key === 'launcher' ? 'grenIn' : 'shellIn']);
        out.push([0.85, 'breakClose']);
        if (key === 'shotgun') out.push([0.91, 'pumpBack'], [0.95, 'pumpFwd']);
        return out;
      }
      case 'dbarrel':
        return [[0.05, 'breakOpen'], [0.14, 'shellsOut'], [0.52, 'shellIn'], [0.6, 'shellIn'], [0.75, 'breakClose']];
      case 'lmg':
        return [[0.07, 'lidOpen'], [0.2, 'boxOut'], [0.55, 'boxIn'], [0.65, 'beltLoad'], [0.8, 'lidClose'], [0.88, 'charge']];
      case 'crossbow':
        return [[0.1, 'crank'], [0.5, 'stringLock'], [0.58, 'boltLay'], [0.84, 'boltClick']];
      case 'flamer':
        return [[0.04, 'valveOff'], [0.12, 'tankOut'], [0.64, 'tankIn'], [0.75, 'valveOn']];
      case 'raygun':
        return [[0.08, 'cellOut'], [0.62, 'cellIn'], [0.72, 'chargeUp']];
    }
    return null;
  }
  // lo llama GunAnim.update cada fotograma: suena cada pieza en cuanto la animación pasa por ella
  A.reloadTick = (w, id) => {
    if (!w.reloading) { w.rlCue = -1; w.rlList = null; return; }
    const key = id === 'pistol' ? (VX.Weapons.DEFS.pistol.form || 'pistola') : id;
    if (w.rlCue === -1 || !w.rlList || w.rlKey !== key) { w.rlList = cues(key, w) || [[0.1, 'magOut'], [0.6, 'magIn'], [0.85, 'slideFwd']]; w.rlCue = 0; w.rlKey = key; }
    const k = 1 - w.reloadT / Math.max(0.01, w.reloadDur || w.reloadTime);
    while (w.rlCue < w.rlList.length && k >= w.rlList[w.rlCue][0]) { const fn = R[w.rlList[w.rlCue][1]]; w.rlCue++; if (fn && A.ctx) fn(); }
  };
  // el pitido antiguo de recarga ya no suena al empezar (lo hacen las piezas); sigue para la munición recogida
  A.reloadStart = () => {};
  A.ammoPickup = () => { for (let i = 0; i < 3; i++) brass(0.04, i * 0.05, rnd(-0.3, 0.3)); click(0.08, 0.16); };

  // ---------- disparos ----------
  // shot(): capas comunes con el carácter de cada arma
  function shot(o) {
    const j = rnd(0.94, 1.06);
    if (o.crack) nz(o.crack[0], o.crack[1], o.crack[2] * j, 'highpass', 0, 0.7);
    if (o.body) nz(o.body[0], o.body[1], o.body[2] * j, 'lowpass', 0, 0.9, undefined, o.body[3], 0.001);
    if (o.mid) nz(o.mid[0], o.mid[1], o.mid[2] * j, 'bandpass', 0, o.mid[3] || 1.2);
    if (o.sub) os(o.sub[0] * j, o.sub[1], 'sine', o.sub[2], o.sub[3], 0, undefined, 0.002);
    if (o.punch) os(o.punch[0] * j, o.punch[1], 'triangle', o.punch[2], o.punch[3]);
    if (o.tail) nz(o.tail[0], o.tail[1], o.tail[2], 'lowpass', o.tail[3] || 0.03, 0.7, undefined, o.tail[4], 0.02);
    if (o.echo) nz(o.echo[0], o.echo[1], o.echo[2], 'bandpass', o.echo[3], 1.4, rnd(-0.6, 0.6), o.echo[4], 0.05);
    if (o.mech) o.mech();
  }
  const SHOTS = {
    pistol: { crack: [0.03, 0.4, 5200], body: [0.14, 0.62, 5200, 700], sub: [130, 0.18, 0.38, 45], tail: [0.45, 0.1, 900, 0.03, 300], mech: () => click(0.05, 0.03, undefined, 3600) },
    deagle: { crack: [0.05, 0.55, 4200], body: [0.26, 0.85, 4200, 450], sub: [85, 0.5, 0.65, 26], punch: [160, 0.12, 0.12, 60], tail: [1.0, 0.24, 700, 0.03, 200], echo: [0.8, 0.05, 1100, 0.3, 500], mech: () => metal(1900, 0.03, 0.06, undefined, 0.12) },
    revolver: { crack: [0.04, 0.5, 5600], body: [0.18, 0.7, 4600, 600], sub: [95, 0.36, 0.55, 30], tail: [0.8, 0.18, 750, 0.04, 240], echo: [0.7, 0.04, 1300, 0.28, 600], mech: () => { metal(2300, 0.025, 0.02, undefined, 0.25); click(0.06, 0.25, undefined, 1800); } },
    auto: { crack: [0.02, 0.35, 5600], body: [0.07, 0.45, 4400, 900], sub: [140, 0.08, 0.2, 60], mech: () => click(0.03, 0.02, undefined, 4000) },
    smg: { crack: [0.02, 0.38, 6000], body: [0.08, 0.5, 4200, 800], sub: [120, 0.1, 0.24, 55], tail: [0.22, 0.06, 800, 0.02, 300], mech: () => click(0.03, 0.015, undefined, 4200) },
    shotgun: { crack: [0.06, 0.5, 3600], body: [0.34, 0.95, 3200, 260], sub: [62, 0.55, 0.7, 24], punch: [130, 0.16, 0.14, 45], tail: [1.1, 0.24, 520, 0.04, 160], echo: [0.9, 0.05, 900, 0.3, 400] },
    dbarrel: { crack: [0.07, 0.55, 3200], body: [0.4, 1.0, 2800, 200], sub: [50, 0.65, 0.8, 20], punch: [110, 0.2, 0.16, 38], tail: [1.3, 0.28, 450, 0.05, 140], echo: [1.0, 0.06, 800, 0.32, 350] },
    rifle: { crack: [0.06, 0.75, 6500], body: [0.18, 0.7, 4800, 500], sub: [70, 0.55, 0.6, 26], tail: [1.6, 0.22, 900, 0.06, 250], echo: [1.3, 0.09, 1500, 0.35, 450] },
    lmg: { crack: [0.025, 0.42, 5000], body: [0.1, 0.6, 3600, 600], sub: [80, 0.15, 0.36, 36], tail: [0.3, 0.08, 700, 0.02, 260], mech: () => click(0.03, 0.02, undefined, 3000) },
    crossbow: { mid: [0.06, 0.3, 2600, 3], punch: [260, 0.22, 0.22, 110], tail: [0.3, 0.06, 1400, 0.03, 800], mech: () => { os(170, 0.3, 'triangle', 0.08, 120, 0.01); nz(0.35, 0.05, 1600, 'bandpass', 0.05, 5, undefined, 600, 0.05); } },
    launcher: { body: [0.25, 0.4, 900, 200], sub: [150, 0.18, 0.5, 55], mid: [0.5, 0.08, 3000, 1.2], mech: () => nz(0.6, 0.05, 2500, 'bandpass', 0.06, 2, undefined, 800, 0.1) },
    flamer: { mech: () => { nz(0.18, 0.26, 900 + Math.random() * 300, 'lowpass', 0, 0.6, undefined, 500, 0.02); nz(0.14, 0.08, 3000, 'bandpass', 0, 1.5); nz(0.2, 0.14, 200, 'lowpass', 0, 0.7); } },
    raygun: { crack: [0.03, 0.2, 7000], sub: [100, 0.2, 0.28, 50], mech: () => { os(1700, 0.22, 'sawtooth', 0.09, 240); os(850, 0.24, 'square', 0.04, 120); nz(0.18, 0.08, 6000, 'highpass', 0, 0.7, undefined, 2500); } },
  };
  const shoot0 = A.shoot;
  A.shoot = (power = 1, kind) => {
    const o = SHOTS[kind];
    if (!o || !ok()) return shoot0(power, kind);
    shot(o);
  };

  // ---------- explosión ----------
  A.explosion = (dist = 0) => {
    if (!ok()) return;
    const v = Math.max(0.25, 1 - dist * 0.7);
    nz(0.05, 0.55 * v, 4000, 'highpass', 0, 0.7);                        // estallido
    nz(0.5, 0.95 * v, 6000, 'lowpass', 0, 0.8, undefined, 140, 0.002);    // la onda: de agudo a grave
    os(70, 1.1, 'sine', 0.85 * v, 20, 0, undefined, 0.003);               // golpe en el pecho
    os(130, 0.4, 'triangle', 0.22 * v, 40);
    nz(2.2, 0.38 * v, 300, 'lowpass', 0.05, 0.6, undefined, 90, 0.08);     // retumbo que se aleja
    for (let i = 0; i < 9; i++) nz(0.04, rnd(0.04, 0.09) * v, rnd(1500, 4000), 'bandpass', rnd(0.25, 1.4), 3, rnd(-0.8, 0.8));   // cascotes que caen
    for (let i = 0; i < 3; i++) metal(rnd(600, 1400), 0.02 * v, rnd(0.4, 1.2), rnd(-0.7, 0.7), 0.2);
  };

  // ---------- fuego ----------
  // chasquido de la madera: un clic, a veces un estallido con resonancia y un siseo
  A.crackle = (vol = 1, pan, delay = 0) => {
    if (!ok()) return;
    const r = Math.random();
    nz(0.006 + r * 0.012, (0.05 + r * 0.07) * vol, 3000 + r * 4000, 'highpass', delay, 0.7, pan);
    if (r < 0.3) nz(0.04, 0.05 * vol, 900 + r * 1800, 'bandpass', delay + 0.005, 6, pan);
    if (r > 0.9) nz(0.25, 0.025 * vol, 5000, 'highpass', delay + 0.02, 0.7, pan, 2500, 0.05);   // savia que sisea
  };
  // lecho del fuego: rugido grave, cuerpo que «respira» y siseo alto
  A.setFire = (level, pan = 0) => {
    if (!ok()) return;
    const c = ctx();
    if (!A.fireBed2) {
      const mk = (type, f, q, vol, rate) => { const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true; s.playbackRate.value = rate; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); s.start(0, Math.random()); return { s, fl, g }; };
      const roar = mk('lowpass', 170, 0.7, 1, 0.5), body = mk('bandpass', 700, 0.8, 0.45, 1), hiss = mk('highpass', 4200, 0.7, 0.05, 1);
      const out = c.createGain(); out.gain.value = 0;
      const pn = c.createStereoPanner ? c.createStereoPanner() : null;
      for (const L of [roar, body, hiss]) L.g.connect(out);
      if (pn) { out.connect(pn); pn.connect(A.ambBus || A.sfx); } else out.connect(A.ambBus || A.sfx);
      // la llama respira: dos osciladores lentos mueven el cuerpo y el rugido
      const lf = (rate, depth, param) => { const o = c.createOscillator(); o.frequency.value = rate; const g = c.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(); };
      lf(0.6, 0.18, body.g.gain); lf(0.37, 160, body.fl.frequency); lf(0.23, 0.3, roar.g.gain);
      A.fireBed2 = { out, pn };
    }
    const t = c.currentTime, v = Math.min(0.34, level * 0.24);
    A.fireBed2.out.gain.setTargetAtTime(v, t, 0.3);
    if (A.fireBed2.pn) A.fireBed2.pn.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, pan)), t, 0.2);
  };
  A.torch = (vol = 1) => {
    if (!ok()) return;
    nz(0.9, 0.3 * vol, 220, 'lowpass', 0, 0.9, undefined, 900, 0.12);
    nz(0.7, 0.05 * vol, 2500, 'bandpass', 0.05, 1, undefined, 900, 0.15);
    for (let i = 0; i < 5; i++) A.crackle(0.6 * vol, 0, 0.1 + Math.random() * 0.6);
  };

  // ---------- impactos ----------
  let lastFlesh = 0;
  A.flesh = () => {
    if (!ok()) return;
    const n = ctx().currentTime; if (n - lastFlesh < 0.03) return; lastFlesh = n;
    nz(0.13, 0.32, 1200, 'bandpass', 0, 1.3, undefined, 380, 0.003);   // chapoteo
    os(rnd(90, 130), 0.1, 'sine', 0.2, 55);                             // golpe sordo
    if (Math.random() < 0.4) nz(0.06, 0.08, 3000, 'highpass', 0.02, 0.7);
  };
  A.wall = () => {
    if (!ok()) return;
    nz(0.05, 0.2, rnd(2400, 3400), 'bandpass', 0, 1.6);
    nz(0.12, 0.08, 900, 'lowpass', 0.005, 0.8, undefined, 300);
    if (Math.random() < 0.6) for (let i = 0; i < 3; i++) nz(0.02, 0.04, rnd(3000, 6000), 'bandpass', 0.04 + i * rnd(0.03, 0.07), 3);   // gravilla
    if (Math.random() < 0.15) os(rnd(1800, 3600), 0.25, 'sine', 0.02, rnd(900, 1500));   // rebote que silba
  };
  A.empty = () => { click(0.1, 0, undefined, 2200); metal(1600, 0.02, 0.005, undefined, 0.08); };

  // ---------- más sonidos con capas ----------
  // tajo al aire: el filo corta el aire de agudo a grave
  A.swish = () => { if (!ok()) return; nz(0.16, 0.2, 3600, 'bandpass', 0, 2.5, undefined, 1200, 0.04); nz(0.1, 0.05, 7000, 'highpass', 0.02, 0.7); };
  // tajo que da en carne
  A.slash = () => { if (!ok()) return; nz(0.12, 0.3, 2200, 'bandpass', 0, 2, undefined, 600, 0.003); nz(0.16, 0.18, 800, 'lowpass', 0.01, 1, undefined, 250); os(150, 0.08, 'sawtooth', 0.06, 70, 0.005); };
  // mazazo: golpe sordo con crujido
  A.punch = () => { if (!ok()) return; os(80, 0.18, 'sine', 0.4, 32, 0, undefined, 0.002); nz(0.12, 0.35, 700, 'lowpass', 0, 1, undefined, 200); for (let i = 0; i < 3; i++) nz(0.02, 0.06, rnd(2000, 3500), 'bandpass', 0.02 + i * 0.02, 4); };
  // muerte del zombi: golpe húmedo y el cuerpo que cae
  A.zombieDie = () => { if (!ok()) return; nz(0.3, 0.32, 900, 'lowpass', 0, 1, undefined, 200, 0.004); os(rnd(80, 110), 0.4, 'sawtooth', 0.08, 35); thunk(0.16, rnd(0.25, 0.4), undefined, 90); nz(0.15, 0.06, 1500, 'bandpass', rnd(0.25, 0.4), 2); };
  // monedas: dos piezas de metal que tintinean
  A.gold = () => { if (!ok()) return; metal(rnd(2400, 2700), 0.05, 0, undefined, 0.22, [1, 2.1, 3.9]); metal(rnd(3000, 3300), 0.035, 0.05, undefined, 0.18, [1, 2.2, 4.3]); };
  // portón que se abre: madera pesada, roce y golpe al tope
  A.door = () => { if (!ok()) return; nz(0.8, 0.4, 260, 'lowpass', 0, 0.9, undefined, 140, 0.08); os(70, 0.7, 'sawtooth', 0.05, 45); thunk(0.25, 0.6, undefined, 90); };
  // rastrillo de hierro: cadenas que traquetean y golpe metálico al final
  A.gate = () => {
    if (!ok()) return;
    for (let i = 0; i < 9; i++) { click(0.05, i * 0.09, undefined, 1800 + (i % 3) * 300); metal(rnd(900, 1300), 0.015, i * 0.09, undefined, 0.1); }
    nz(0.9, 0.12, 600, 'bandpass', 0, 2, undefined, 900, 0.05);
    thunk(0.3, 0.85, undefined, 70); metal(420, 0.07, 0.86, undefined, 0.5);
  };
  // esquiva: ráfaga de aire que pasa
  A.dash = () => { if (!ok()) return; nz(0.24, 0.24, 900, 'bandpass', 0, 1.2, undefined, 2600, 0.05); nz(0.18, 0.06, 5000, 'highpass', 0.04, 0.7); };
  // reventar: chapoteo más gordo
  A.splat = () => { if (!ok()) return; nz(0.22, 0.42, 1400, 'lowpass', 0, 1, undefined, 300, 0.003); nz(0.14, 0.2, 2600, 'bandpass', 0.03, 2); os(75, 0.18, 'sine', 0.22, 38); for (let i = 0; i < 4; i++) nz(0.04, 0.05, rnd(800, 1600), 'bandpass', rnd(0.1, 0.4), 3, rnd(-0.6, 0.6)); };

  VX.Sfx = { nz, os, metal, click, thunk, slide, brass, R };
})();
