// Sonidos de recarga (0.51): cada arma suena pieza a pieza, sincronizada con su animación.
// (0.53.4: rehechos con golpes de ruido filtrado; antes resonaban como monedas)
// (0.53: los demás sonidos «por capas» de la 0.51 se han quitado; vuelven a sonar los de audio.js)
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
    if (A.voice && !A.voice(s)) return;
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
    o.connect(g); g.connect(dst);
    if (A.voice && !A.voice(o)) return;
    o.start(t); o.stop(t + dur + 0.03);
  }
  // (0.53.4) Las piezas ya no se hacen con tonos puros, que resonaban como una moneda o una campanita:
  // son golpes de ruido filtrado muy cortos, como suenan de verdad el acero y el polímero al encajar.
  // golpe resonante: ruido por un filtro estrecho (el «cuerpo» de la pieza), muy corto
  const knock = (vol, delay = 0, pan, f = 900, q = 5, dur = 0.05) => nz(dur, vol, f, 'bandpass', delay, q, pan, f * 0.8, 0.001);
  // pieza de metal: dos resonancias cortas y apagadas (antes: armónicos que sonaban a moneda)
  function metal(f, vol, delay = 0, pan, decay = 0.1) {
    const d = Math.min(0.07, decay * 0.45);
    knock(vol * 3.2, delay, pan, f * 0.7, 7, d);
    knock(vol * 1.3, delay, pan, f * 1.6, 5, d * 0.6);
  }
  // vaina de latón: tintineo corto y apagado
  const brass = (vol, delay, pan) => { knock(vol * 4, delay, pan, rnd(2200, 3200), 10, 0.035); knock(vol * 1.6, (delay || 0) + 0.004, pan, rnd(4500, 5500), 8, 0.02); };
  // tic: el roce seco de un retén o un seguro
  const tick = (vol, delay = 0, pan, f = 4500) => nz(0.007, vol, f, 'bandpass', delay, 1.2, pan, f * 0.7, 0.0005);
  // clic seco (seguros, retenes, gatillos)
  const click = (vol = 0.1, delay = 0, pan, f = 3200) => { tick(vol * 1.3, delay, pan, f * 1.4); knock(vol * 0.6, delay + 0.002, pan, f * 0.45, 4, 0.02); };
  // golpe sordo (algo que encaja de golpe)
  const thunk = (vol = 0.2, delay = 0, pan, f = 160) => { nz(0.06, vol, 900, 'lowpass', delay, 1, pan, 250); os(f, 0.06, 'sine', vol * 0.6, f * 0.6, delay, pan); };
  // «clac»: el cargador o la corredera que encajan (chasquido + cuerpo + golpe)
  const clack = (vol = 0.2, delay = 0, pan, body = 800, low = 150) => {
    tick(vol * 0.9, delay, pan, 3800);
    knock(vol * 1.1, delay + 0.001, pan, body, 3, 0.045);
    knock(vol * 0.5, delay + 0.001, pan, body * 2.2, 3, 0.025);
    os(low, 0.05, 'sine', vol * 0.55, low * 0.6, delay, pan);
  };
  // las balas que se mueven dentro del cargador (traqueteo sordo)
  const rounds = (vol = 0.04, delay = 0, pan, n = 3) => { for (let i = 0; i < n; i++) knock(vol * (1 - i * 0.2), delay + i * rnd(0.012, 0.02), pan, rnd(1500, 2100), 6, 0.018); };
  // deslizar metal contra metal (corredera, cerrojo hacia atrás)
  const slide = (vol = 0.06, delay = 0, pan, dur = 0.08, f = 1600, f2 = 2600) => nz(dur, vol, f, 'bandpass', delay, 2.5, pan, f2, dur * 0.4);

  // ---------- recargas: cada arma, pieza a pieza ----------
  // [momento de la animación (0-1), sonido]. Los momentos coinciden con gunAnim.js
  const R = {
    magOut: () => { click(0.12, 0, undefined, 2600); slide(0.06, 0.012, undefined, 0.09, 1700, 900); rounds(0.03, 0.03); },
    magDrop: () => { thunk(0.07, 0.28, 0.4, 110); knock(0.05, 0.28, 0.4, 700, 3, 0.05); rounds(0.025, 0.29, 0.4, 2); thunk(0.03, 0.39, 0.45, 130); },
    magIn: () => { slide(0.05, 0, undefined, 0.06, 900, 1500); rounds(0.03, 0.02, undefined, 2); clack(0.24, 0.055, undefined, 750, 140); },
    slideBack: () => { tick(0.08, 0); slide(0.08, 0.004, undefined, 0.07, 1200, 2400); knock(0.05, 0.07, undefined, 1300, 4, 0.03); },
    slideFwd: () => { slide(0.07, 0, undefined, 0.035, 2400, 1500); clack(0.2, 0.033, undefined, 1100, 190); },
    boltUp: () => { click(0.1, 0, undefined, 1800); metal(1700, 0.04, 0.005, undefined, 0.1); },
    boltBack: () => { slide(0.18, 0, undefined, 0.1, 900, 1700); brass(0.04, 0.08, 0.5); },
    boltFwd: () => { slide(0.09, 0, undefined, 0.06, 1700, 1000); clack(0.16, 0.055, undefined, 950, 200); },
    boltDown: () => { click(0.14, 0, undefined, 2000); metal(1500, 0.035, 0.005, undefined, 0.12); },
    cylOpen: () => { click(0.1, 0, undefined, 2600); metal(2600, 0.04, 0.01, undefined, 0.14); },
    ejectRod: () => { slide(0.06, 0, undefined, 0.05, 1500, 2500); for (let i = 0; i < 6; i++) brass(0.03, 0.12 + i * 0.035 + Math.random() * 0.03, rnd(-0.3, 0.6)); },
    speedIn: () => { slide(0.05, 0, undefined, 0.06, 1100, 1800); rounds(0.035, 0.03, undefined, 4); click(0.12, 0.06, undefined, 2900); },
    cylClose: () => { thunk(0.14, 0, undefined, 260); click(0.12, 0.01); for (let i = 0; i < 3; i++) click(0.04, 0.05 + i * 0.03, undefined, 4200); },
    breakOpen: () => { click(0.2, 0, undefined, 1500); os(220, 0.12, 'sawtooth', 0.02, 160, 0.01); metal(800, 0.05, 0.02, undefined, 0.2); },
    shellIn: () => { nz(0.05, 0.06, 1800, 'lowpass', 0, 1); thunk(0.1, 0.035, undefined, 300); },
    shellsOut: () => { nz(0.03, 0.08, 1300, 'bandpass', 0, 2); nz(0.03, 0.07, 1100, 'bandpass', 0.02, 2); thunk(0.04, 0.38, 0.4, 420); thunk(0.04, 0.45, 0.5, 380); },
    breakClose: () => { thunk(0.28, 0, undefined, 120); metal(650, 0.07, 0.005, undefined, 0.22); click(0.12, 0.01); },
    pumpBack: () => { slide(0.2, 0, undefined, 0.07, 700, 1300); click(0.08, 0.06, undefined, 1800); },
    pumpFwd: () => { slide(0.1, 0, undefined, 0.06, 1300, 700); clack(0.2, 0.05, undefined, 650, 170); },
    lidOpen: () => { click(0.12, 0, undefined, 1600); os(300, 0.15, 'sawtooth', 0.02, 220, 0.01); metal(1100, 0.04, 0.02, undefined, 0.15); },
    boxOut: () => { slide(0.06, 0, undefined, 0.08, 900, 600); metal(500, 0.05, 0.3, 0.4, 0.25); thunk(0.08, 0.32, 0.4, 120); },
    boxIn: () => { thunk(0.26, 0, undefined, 110); metal(600, 0.05, 0.01, undefined, 0.2); },
    beltLoad: () => { for (let i = 0; i < 6; i++) { click(0.03, i * 0.045, undefined, 3000 + i * 150); knock(0.02, i * 0.045 + 0.01, undefined, 1800, 6, 0.015); } },
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

  VX.Sfx = { nz, os, metal, click, thunk, slide, brass, knock, tick, clack, rounds, R };
})();
