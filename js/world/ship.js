// Mapa del modo Horda: Barco portacontenedores (136 × 44 m) en plena tormenta.
// Cubierta de acero con barandillas, castillo de popa con puente de mando (se sube por
// escaleras), filas de contenedores apilados (algunos abiertos, con cajas para trepar),
// castillo de proa elevado con cabrestantes, dos grúas, botes salvavidas y el mar alrededor.
// Los zombis suben por la borda y salen de las escotillas.
// (0.54) La cubierta está 3 m por encima del suelo del mapa: debajo de la fila central de contenedores
// hay un piso de camarotes (literas, enfermería, lavandería, arsenal…) al que se baja por dos escaleras.
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const SX = 136, SZ = 44;
  const X0 = 8, X1 = 128, Z0 = 8, Z1 = 36, ZC = 22;   // cubierta
  const BOW = 112;                                     // a partir de aquí la proa se estrecha
  const G = { DECK: 0, DECK2: 1, HATCH: 2, PAINT: 3, WOOD: 4, TILE: 5 };
  const DY = 3;                                        // altura de la cubierta sobre el suelo del mapa (m)
  const LX0 = 36, LX1 = 97, LZ0 = 19.5, LZ1 = 24.5;    // piso de camarotes (bajo la fila central de contenedores)

  // medio ancho de la cubierta en x (metros)
  const halfW = (x) => x <= BOW ? (Z1 - Z0) / 2 : Math.max(1.5, (Z1 - Z0) / 2 * Math.sqrt(Math.max(0, 1 - ((x - BOW) / (X1 - BOW)) ** 2)));

  class ShipRoom extends VX.BigRoom {
    constructor() { super('Barco', SX, SZ, 27, 9); this.damp = 1; this.city = true; }   // 27: 13,5 m de alto (la cubierta está a 3 m)
    generate() { this.stormSeed = Math.floor(Math.random() * 1e9); generate(this); }

    // ---- Temporal (0.55): la tormenta va y viene durante la partida ----
    // Calma de 60-110 s y temporal de 35-55 s, una y otra vez. En el temporal llueve a mares, caen rayos a
    // menudo, el mar se encrespa y las olas barren la cubierta: primero avisan (espuma y estruendo en la
    // borda) y luego empujan a quien esté en esa parte de la cubierta (jugadores y zombis) hacia el otro lado.
    updateStorm(game, dt) {
      const S = this.st || (this.st = { rng: VX.Coop.mulberry(this.stormSeed || 1), on: false, t: 0, k: 0, waveT: 4, waves: [] });
      if (!S.t) S.t = 60 + S.rng() * 30;                                       // la primera calma
      S.t -= dt;
      if (S.t <= 0) {
        S.on = !S.on;
        S.t = S.on ? 35 + S.rng() * 20 : 60 + S.rng() * 50;
        if (S.on) { game.hud.banner('¡TEMPORAL!', 'Las olas barren la cubierta: ponte a cubierto en los camarotes o en el castillo', 3.5); VX.Audio.thunder(0.1); }
        else game.hud.toast('La tormenta amaina…');
      }
      S.k += ((S.on ? 1 : 0) - S.k) * Math.min(1, dt * 0.35);
      this.stormK = S.k;
      // golpes de mar: con el temporal ya fuerte, cada 6-11 s por un costado y un tramo de cubierta
      if (S.on && S.k > 0.6) {
        S.waveT -= dt;
        if (S.waveT <= 0) { S.waveT = 6 + S.rng() * 5; S.waves.push({ side: S.rng() < 0.5 ? -1 : 1, xc: 38 + S.rng() * 64, t: 0, hit: false }); }
      }
      const P = game.player, OX = SX / 2, OZ = SZ / 2;
      for (const w of S.waves) {
        w.t += dt;
        const zEdge = (x) => ZC + w.side * (halfW(x) - 0.3);
        // aviso: espuma que sube por la borda en ese tramo
        if (w.t < 1.4 && game.particles && Math.random() < 0.8) for (let k = 0; k < 3; k++) {
          const x = w.xc + (Math.random() - 0.5) * 14;
          game.particles.spawn(x - OX, DY - 0.5 + Math.random(), zEdge(x) + w.side * 0.6 - OZ, (Math.random() - 0.5) * 2, 4 + Math.random() * 5, -w.side * (0.5 + Math.random()), 0.6, 0.66, 0.7, 0.1 + Math.random() * 0.12, 1.2, 0.05);
        }
        if (w.t > 0.15 && !w.snd) { w.snd = true; const A = VX.Audio; if (A._noise) { A._noise(1.6, 0.22, 700, 'lowpass', 0, 0.7); A._noise(0.9, 0.12, 2400, 'bandpass', 0.25, 0.6); } }
        // el golpe: una lámina de agua cruza la cubierta y empuja
        if (w.t >= 1.4 && !w.hit) {
          w.hit = true;
          if (VX.Audio._noise) { VX.Audio._noise(1.2, 0.3, 500, 'lowpass', 0, 0.8); VX.Audio._noise(0.5, 0.18, 3000, 'highpass', 0, 0.7); }
          const onDeck = (x, y, z) => { const lx = x + OX; return lx > w.xc - 7 && lx < w.xc + 7 && lx > 29 && lx < 107 && y > DY - 0.3 && y < DY + 0.8; };
          if (onDeck(P.x, P.y, P.z) && !P.dead) { P.knock(0, -w.side * 8, 2.5); game.shake(0.35); game.hud.toast('¡Golpe de mar!'); }
          if (!VX.Coop.isClient) for (const e of game.enemies) if (!e.dead && !e.isBoss && onDeck(e.x, e.y, e.z)) { e.kz = (e.kz || 0) - w.side * 10; if (e.state !== 'leap' && e.state !== 'climb') { e.state = 'stun'; e.stateT = 0.9; } }
        }
        if (w.t >= 1.4 && w.t < 2.4 && game.particles) for (let k = 0; k < 6; k++) {
          const x = w.xc + (Math.random() - 0.5) * 14, z = zEdge(x) - w.side * (w.t - 1.4) * 14 * Math.random();
          game.particles.spawn(x - OX, DY + 0.1 + Math.random() * 0.8, z - OZ, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, -w.side * (6 + Math.random() * 4), 0.6, 0.66, 0.72, 0.12 + Math.random() * 0.15, 0.9, 0.05);
        }
      }
      S.waves = S.waves.filter((w) => w.t < 2.6);
    }
    // Mar de tormenta: losas que suben y bajan con el oleaje, espuma en las crestas y salpicaduras contra el casco
    renderSea(b, t, P, game) {
      const OX = SX / 2, OZ = SZ / 2;
      // oleaje de tres trenes de ondas (largo, medio y corto) en distintas direcciones; cada losa se inclina con la pendiente
      const sk = 0.7 + (this.stormK || 0) * 0.75;                            // el temporal encrespa el mar
      const WV = [[0.95 * sk, 2 * Math.PI / 24, 0.96, 0.28, 1.1], [0.42 * sk, 2 * Math.PI / 11, 0.55, -0.83, 1.7], [0.18 * sk, 2 * Math.PI / 5.5, -0.35, 0.94, 2.6]];
      const wave = (x, z) => {
        let h = 0, dx = 0, dz = 0;
        for (const [A, k, ux, uz, w] of WV) { const ph = k * (ux * x + uz * z) - w * t, c = Math.cos(ph); h += A * Math.sin(ph); dx += A * k * ux * c; dz += A * k * uz * c; }
        return [h, dx, dz];
      };
      const ring = (T, r0, r1) => {
        const px = Math.round(P.x / T) * T, pz = Math.round(P.z / T) * T;
        for (let gz = -r1; gz <= r1; gz += T) for (let gx = -r1; gx <= r1; gx += T) {
          const d2 = gx * gx + gz * gz;
          if (d2 > r1 * r1 || d2 < r0 * r0) continue;
          const x = px + gx, z = pz + gz, lx = x + OX, lz = z + OZ;
          if (lx > X0 - 1.5 && lx < X1 + 0.5 && Math.abs(lz - ZC) < halfW(Math.min(X1, Math.max(X0, lx))) + 0.5) continue;
          const [h, dx, dz] = wave(x, z);
          const nl = Math.hypot(dx, 1, dz), nx = -dx / nl, nz = -dz / nl, ny = 1 / nl;
          const ang = Math.acos(Math.min(1, ny)), al = Math.hypot(nz, nx) || 1;
          const q = M.qAxis(nz / al, 0, -nx / al, ang);
          const crest = Math.max(0, (h - 0.7) / 0.85), trough = Math.max(0, -h / 1.5);
          const r = 0.02 + crest * 0.05 - trough * 0.008, g = 0.05 + crest * 0.07 - trough * 0.015, bb = 0.065 + crest * 0.06 - trough * 0.015;
          b.rbox(x, -6.9 + DY + h - 0.5, z, T * 1.08, 1, T * 1.08, q, r * 0.75, g * 0.8, bb * 0.85, -0.5);
          // espuma en las crestas, que se rompe en jirones
          if (crest > 0.45) {
            const fz = Math.sin(x * 1.7 + z * 0.9 + t * 0.6);
            if (fz > -0.3) b.rbox(x + fz * T * 0.2, -6.9 + DY + h + 0.03, z - fz * T * 0.15, T * (0.4 + crest * 0.5), 0.06, T * 0.25, q, 0.4, 0.44, 0.46, 0.03);
          }
        }
      };
      ring(2, 0, 30); ring(4, 30, 50);
      // lluvia: trazos inclinados por el viento alrededor del jugador (no entra bajo techo)
      if (game && game.world) {
        const W = game.world, HH = 9, BOX = 26;
        const NR = Math.round(150 + (this.stormK || 0) * 330);                  // más lluvia con el temporal
        for (let i = 0; i < NR; i++) {
          const h1 = Math.sin(i * 12.9898) * 43758.5453 % 1, h2 = Math.sin(i * 78.233) * 12543.123 % 1, h3 = Math.sin(i * 39.425) * 9512.77 % 1;
          const ph = ((t * 1.45 + Math.abs(h3)) % 1);
          const y = P.y + HH * 0.75 - ph * HH;
          let x = P.x + (Math.abs(h1) - 0.5) * BOX + ph * 2.2, z = P.z + (Math.abs(h2) - 0.5) * BOX - ph * 0.8;
          if (y < -6 + DY) continue;
          if (W.isSolidVisibleAt(x, Math.max(y + 0.4, 0.3), z) || W.isSolidVisibleAt(x, DY - 0.15, z) && y < DY - 0.2 || W.isSolidVisibleAt(x, 3.6 + DY, z) && y < 3.5 + DY || W.isSolidVisibleAt(x, 6.1 + DY, z) && y < 6 + DY) continue;
          b.rbox(x, y, z, 0.018, 0.55, 0.018, M.qAxis(0.36, 0, 0.93, 0.17), 0.42, 0.48, 0.56, 0.18);
        }
      }
      // espuma contra el casco y rociones en la proa
      if (game && game.particles && Math.random() < 0.35 + (this.stormK || 0) * 0.6) {
        const lx = X0 + Math.random() * (X1 - X0), sd = Math.random() < 0.5 ? -1 : 1, lz = ZC + sd * (halfW(lx) + 0.4);
        const x = lx - OX, z = lz - OZ;
        if (Math.hypot(x - P.x, z - P.z) < 45) for (let k = 0; k < 4; k++) game.particles.spawn(x, -6.4 + DY + Math.random() * 0.6, z, Math.random() - 0.5, 2 + Math.random() * 3, sd * (1 + Math.random() * 2), 0.5, 0.55, 0.58, 0.12 + Math.random() * 0.12, 1.2, 0.05);
        if (Math.random() < 0.08) { const bx = X1 - 4 - OX; for (let k = 0; k < 14; k++) game.particles.spawn(bx + Math.random() * 3, 0.5 + DY + Math.random(), (Math.random() - 0.5) * 5, -1 - Math.random() * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 4, 0.55, 0.6, 0.64, 0.08 + Math.random() * 0.1, 1.3, 0.05); }
      }
    }
    floorColor(gt, mx, mz, gx, gz, h, h2, o) {
      let r, g, b, mat = -0.25, wet = 1;
      switch (gt) {
        case G.DECK: { const k = 0.75 + h * 0.15 + ((mx >> 1) & 1) * 0.06; r = 0.2 * k; g = 0.08 * k; b = 0.06 * k; break; }    // rojo óxido
        case G.DECK2: { const k = 0.75 + h * 0.15; r = 0.14 * k; g = 0.15 * k; b = 0.13 * k; break; }
        case G.HATCH: { const k = (((gx >> 2) + (gz >> 2)) & 1) ? 0.85 : 0.7; r = 0.12 * k; g = 0.2 * k; b = 0.2 * k; break; }
        case G.PAINT: { r = 0.62; g = 0.55; b = 0.12; mat = 0; break; }                                                  // franjas amarillas
        case G.WOOD: { const k = 0.6 + M.hash3(gx >> 3, 2, gz) * 0.4; r = 0.24 * k; g = 0.16 * k; b = 0.09 * k; wet = 0; break; }
        default: { const c = ((mx + mz) & 1) ? 0.3 : 0.25; r = c; g = c; b = c * 1.05; wet = 0; }
      }
      o[0] = r; o[1] = g; o[2] = b; o[3] = mat; o[4] = wet;
    }
  }

  function generate(r) {
    const K = VX.BigBuild(r);
    const { C, H, wx, wz, cm, gm, prop, chestSpot, hash } = K;
    // todo lo de cubierta se construye 3 m más arriba (debajo queda la losa y el piso de camarotes)
    const DYc = Math.round(DY * C);
    const setc = (x, y, z, t) => K.setc(x, y + DYc, z, t);
    const getc = (x, y, z) => K.getc(x, y + DYc, z);
    const fc = (x0, y0, z0, x1, y1, z1, t) => K.fc(x0, y0 + DYc, z0, x1, y1 + DYc, z1, t);
    const fm = (x0, y0, z0, x1, y1, z1, t) => fc(cm(x0), cm(y0), cm(z0), cm(x1), cm(y1), cm(z1), t);
    const dec = (x, y, ...a) => K.dec(x, y + DY, ...a);
    const light = (x, y, ...a) => K.light(x, y + DY, ...a);
    const machine = (x, z, f, p) => K.machine(x, z, f, p, DYc);
    // (sin desplazar) para el piso de abajo
    const fmA = (x0, y0, z0, x1, y1, z1, t) => K.fc(cm(x0), cm(y0), cm(z0), cm(x1), cm(y1), cm(z1), t);

    // 1) todo es barrera salvo la cubierta (con su forma de proa); la losa de la cubierta queda debajo
    K.fc(0, 0, 0, r.W, H, r.D, B.BARRIER);
    for (let cx = cm(X0); cx < cm(X1); cx++) {
      const x = (cx + 0.5) / C, hw = halfW(x);
      fc(cx, 0, cm(ZC - hw), cx + 1, H, cm(ZC + hw), 0);
    }
    gm(X0, Z0, X1, Z1, (x, z) => Math.abs(z + 0.5 - ZC) <= halfW(x + 0.5) ? ((x % 12 < 1) ? G.DECK2 : G.DECK) : 255);
    // pasillo central de escotillas entre las filas de contenedores y franjas pintadas
    gm(34, 11, 106, 33, G.HATCH);
    gm(X0, 17.5, X1 - 6, 18.5, G.PAINT); gm(X0, 25.5, X1 - 6, 26.5, G.PAINT);
    gm(34, 17, 106, 19, G.DECK2); gm(34, 25, 106, 27, G.DECK2);

    // 2) borda: barandilla de acero de 1 m alrededor de toda la cubierta
    for (let cx = cm(X0); cx < cm(X1); cx++) {
      const x = (cx + 0.5) / C, hw = halfW(x);
      for (const s of [-1, 1]) {
        const cz = s < 0 ? cm(ZC - hw) : cm(ZC + hw) - 1;
        // la borda es de una celda de chapa con hueco y pasamanos
        setc(cx, 0, cz, B.HULL); setc(cx, 1, cz, B.HULL);
        if (cx % 6 === 0) { setc(cx, 2, cz, B.STEEL); setc(cx, 3, cz, B.STEEL); }
      }
    }
    for (let cz = cm(Z0); cz < cm(Z1); cz++) { setc(cm(X0), 0, cz, B.HULL); setc(cm(X0), 1, cz, B.HULL); if (cz % 6 === 0) { setc(cm(X0), 2, cz, B.STEEL); setc(cm(X0), 3, cz, B.STEEL); } }
    // pasamanos (decorado) y casco por debajo de la cubierta
    const segs = 32;
    for (let k = 0; k < segs; k++) {
      const xa = X0 + (X1 - X0) * k / segs, xb = X0 + (X1 - X0) * (k + 1) / segs, xm = (xa + xb) / 2;
      const ha = halfW(xa), hb = halfW(xb), hm = halfW(xm);
      const len = Math.hypot(xb - xa, hb - ha), yaw = Math.atan2(hb - ha, xb - xa);
      for (const s of [-1, 1]) {
        dec(xm, 0.95, ZC + s * (hm - 0.12), len + 0.05, 0.08, 0.08, 0.5, 0.46, 0.4, -0.3, -s * yaw);
        dec(xm, -3.6, ZC + s * (hm + 0.15), len + 0.1, 7.2, 0.3, 0.13, 0.04, 0.035, 0, -s * yaw);
        dec(xm, -0.25, ZC + s * (hm + 0.32), len + 0.1, 0.35, 0.08, 0.75, 0.75, 0.72, 0, -s * yaw);   // franja blanca
      }
    }
    dec(X0 - 0.2, -3.6, ZC, 0.4, 7.2, Z1 - Z0, 0.13, 0.04, 0.035);
    dec(X0 + 0.1, 0.95, ZC, 0.08, 0.08, Z1 - Z0, 0.5, 0.46, 0.4, -0.3);
    // el mar: planos oscuros con crestas de espuma
    // el mar lejano (las olas cercanas se dibujan animadas cada fotograma: ShipRoom.renderSea)
    dec(SX / 2, -8.6, SZ / 2, 600, 0.2, 600, 0.012, 0.03, 0.04, 0);

    // 3) castillo de popa (x 8..30): planta baja transitable y alerón del puente elevado
    {
      const xa = 10, xb = 28, za = 11, zb = 33, XA = cm(xa), XB = cm(xb), ZA = cm(za), ZB = cm(zb), HS = 14;
      gm(xa, za, xb, zb, G.TILE);
      for (let y = 0; y < HS; y++) for (let z = ZA; z < ZB; z++) for (let x = XA; x < XB; x++) {
        const edge = x < XA + 1 || x >= XB - 1 || z < ZA + 1 || z >= ZB - 1;
        const roof = y === HS - 1;
        if (!edge && !roof) continue;
        let t = B.SHIPW;
        if (edge && y >= 5 && y < 9 && !roof) { const a = (x === XA || x === XB - 1) ? z - ZA : x - XA; if (a % 10 > 2 && a % 10 < 8) t = B.GLASS; }
        if (y === 0 && edge) t = B.STEEL;
        setc(x, y, z, t);
      }
      // puertas estancas (proa y laterales)
      for (const zz of [ZA + 18, ZB - 26]) for (let z = zz; z < zz + 8; z++) for (let y = 0; y < 9; y++) setc(XB - 1, y, z, 0);
      for (let x = XA + 30; x < XA + 38; x++) for (let y = 0; y < 9; y++) { setc(x, y, ZA, 0); setc(x, y, ZB - 1, 0); }
      // tabiques interiores: comedor y sala de máquinas
      for (let z = ZA + 1; z < ZB - 1; z++) for (let y = 0; y < HS - 1; y++) if (Math.abs(z - (ZA + ZB) / 2) > 5) setc(XA + 24, y, z, B.SHIPW);
      fm(12, 0, 13, 15, 0.8, 16, B.PLANK); fm(12, 0, 28, 15, 0.8, 31, B.PLANK);
      prop('chair', 13, 17); prop('chair', 14.5, 17); prop('chair', 13, 27); prop('table', 13.5, 22);
      fm(19, 0, 13, 26, 2.2, 15, B.STEEL); fm(19, 0, 29, 26, 2.2, 31, B.STEEL);   // motores auxiliares
      fm(19.2, 2.2, 13.5, 25.8, 2.3, 14.5, B.NEON_Y);
      for (const [lx, lz] of [[14, 15], [14, 29], [23, 22]]) { light(lx, 3, lz, 8, [0.8, 0.75, 0.6], hash(lx, lz, 3) < 0.35 ? { broken: true } : {}); dec(lx, 3.42, lz, 0.9, 0.06, 0.4, 1, 0.95, 0.85, 0.85); }
      chestSpot(12, 19.5); chestSpot(26.3, 25.6);
      r.merchantSpots.push({ x: wx(18.6), z: wz(22), name: 'la sala de máquinas' });
      // --- comedor: cocina con fogones y nevera, taquillas, salvavidas y carteles ---
      fm(10.25, 0, 18, 11.25, 0.95, 26, B.STEEL); fm(10.25, 0.95, 18, 11.25, 1.0, 26, B.MARBLE);   // encimera
      fm(10.25, 0, 26.2, 11.2, 2.1, 27.4, B.SHIPW); dec(11.22, 1.1, 26.8, 0.04, 1.6, 1.0, 0.75, 0.78, 0.8, -0.3);   // nevera
      for (const z of [19, 21]) { dec(10.75, 1.03, z, 0.5, 0.04, 0.5, 0.08, 0.08, 0.08); dec(10.75, 1.06, z, 0.3, 0.02, 0.3, 0.7, 0.2, 0.05, 0.5); }   // fogones
      dec(10.7, 1.15, 23.5, 0.4, 0.3, 0.4, 0.55, 0.56, 0.6, -0.4); dec(10.7, 1.1, 24.5, 0.25, 0.2, 0.25, 0.85, 0.85, 0.82);   // ollas
      dec(10.3, 2.4, 22, 0.05, 0.9, 6, 0.28, 0.2, 0.12);                                      // estante
      for (let k = 0; k < 8; k++) dec(10.36, 2.92, 19.2 + k * 0.75, 0.12, 0.2, 0.2, [0.7, 0.2, 0.15, 0.2][k % 4] + 0.1, 0.5, 0.3 + (k % 3) * 0.15);
      for (let k = 0; k < 4; k++) { fm(12 + k * 0.7, 0, 32.25, 12.6 + k * 0.7, 2, 32.75, B.STEEL); dec(12.3 + k * 0.7, 1.4, 32.22, 0.3, 0.06, 0.02, 0.1, 0.1, 0.1); }   // taquillas
      for (const [x, z] of [[13, 11.28], [24, 11.28], [13, 32.72], [24, 32.72]]) { const s = z < 22 ? 1 : -1; dec(x, 2.1, z + s * 0.02, 0.7, 0.7, 0.04, 0.85, 0.3, 0.08); dec(x, 2.1, z + s * 0.04, 0.35, 0.35, 0.04, 0.5, 0.5, 0.47); }   // salvavidas
      dec(15.7, 2.3, 18, 0.04, 0.9, 1.4, 0.75, 0.7, 0.55); dec(15.68, 2.3, 18, 0.02, 0.7, 1.2, 0.2, 0.35, 0.5);   // carta náutica
      dec(13.5, 0.004, 22, 2.4, 0.008, 1.6, 0.3, 0.1, 0.08);                                  // alfombra
      prop('chair', 12.5, 22); prop('chair', 14.6, 22); prop('crate', 11, 13.2);
      // --- sala de máquinas: motor central, tuberías por el techo, cuadro de mandos y extintores ---
      fm(21, 0, 20, 25.5, 1.4, 24, B.STEEL); fm(21.3, 1.4, 20.4, 25.2, 1.9, 23.6, B.SHIPW);   // bancada del motor
      for (let k = 0; k < 4; k++) { const x = 21.8 + k * 1; fm(x, 1.9, 21.2, x + 0.6, 2.6, 22.8, B.STEEL); }   // culatas
      dec(23.25, 2.75, 22, 4.2, 0.12, 0.12, 0.35, 0.33, 0.3);
      for (const z of [17.8, 26.2]) dec(22, 3.3, z, 11.5, 0.22, 0.22, 0.32, 0.3, 0.27);       // tuberías del techo
      dec(22, 3.05, 18.4, 11.5, 0.15, 0.15, 0.5, 0.15, 0.1);
      for (const x of [18, 26.5]) dec(x, 1.7, 17.8, 0.22, 3.2, 0.22, 0.32, 0.3, 0.27);
      dec(26, 2.8, 22, 0.15, 0.15, 3.5, 0.35, 0.3, 0.12);
      fm(27.1, 0, 20.3, 27.75, 1.7, 23.7, B.STEEL);                                            // cuadro de mandos
      for (let k = 0; k < 6; k++) dec(27.08, 1.2 + (k % 2) * 0.25, 20.7 + Math.floor(k / 2) * 1.1, 0.03, 0.08, 0.08, k % 3 === 0 ? 1 : 0.2, k % 3 === 1 ? 1 : 0.3, 0.2, 0.9);
      dec(27.08, 1.5, 22, 0.03, 0.3, 0.6, 0.1, 0.35, 0.25, 0.4);
      for (const [x, z] of [[17.2, 11.3], [26.5, 32.7]]) { fm(x - 0.12, 0, z - 0.12, x + 0.13, 0.75, z + 0.13, B.CLOTH); dec(x, 0.45, z, 0.26, 0.65, 0.26, 0.7, 0.06, 0.04); dec(x, 0.85, z, 0.1, 0.12, 0.1, 0.1, 0.1, 0.1); }   // extintores
      for (let k = 0; k < 5; k++) dec(19 + k * 1.6, 0.003, 17.3, 0.8, 0.006, 0.1, 0.65, 0.55, 0.1);   // franjas de seguridad
      prop('barrel', 26.8, 13.2); prop('barrel', 26.8, 30.8); prop('xbarrel', 17.3, 30.6);
      // escaleras exteriores al techo de la planta baja (3,5 m): por estribor y por babor
      const stair = (s) => {
        for (let k = 0; k < 6; k++) for (let d = 0; d < 3; d++) {
          const hh = HS - 2 - k * 2; if (hh <= 0) continue;
          const xx = XB + k * 3 + d, z0 = s < 0 ? cm(11.3) : cm(30.2), z1 = s < 0 ? cm(13.8) : cm(32.7);
          fc(xx, 0, z0, xx + 1, hh, z1, B.STEEL);
        }
      };
      stair(-1); stair(1);
      // barandilla en el techo, con hueco en la llegada de las escaleras
      for (let x = XA; x < XB; x++) for (const z of [ZA, ZB - 1]) setc(x, HS, z, B.STEEL);
      for (let z = ZA; z < ZB; z++) { setc(XA, HS, z, B.STEEL); const zm = z / C; if (!(zm > 11 && zm < 14) && !(zm > 30 && zm < 33)) setc(XB - 1, HS, z, B.STEEL); }
      // puente de mando (decorado, encima): pisos escalonados con ventanas, chimenea y radar
      // puente de mando: dos pisos encima del castillo. Al primero se entra por dos puertas desde el techo
      // del castillo; dentro hay una escalera que sube al segundo (la sala del radar). El tercero es decorado
      for (let k = 0; k < 2; k++) {
        const ya = HS + k * 10, yb = Math.min(H, ya + 10), x0 = cm(11 + k), x1 = cm(22 - k * 2), w = 20 - k * 4, z0 = cm(ZC - w / 2), z1 = cm(ZC + w / 2);
        for (let y = ya; y < yb; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
          const edge = x === x0 || x === x1 - 1 || z === z0 || z === z1 - 1;
          if (!edge && y > ya && y < yb - 1) continue;
          const win = edge && y >= ya + 4 && y < ya + 8 && !((x === x0 || x === x1 - 1) && (z === z0 || z === z1 - 1));
          setc(x, y, z, win ? B.GLASS : B.SHIPW);
        }
        light(17 - k, (ya + 6) / C, ZC, 6, [0.5, 0.6, 0.7]);
        if (k === 0) {   // consola de mando con pantallas y el timón (se ve por las ventanas)
          fc(cm(19.5), ya, cm(ZC - 4), cm(20.5), ya + 4, cm(ZC + 4), B.STEEL);
          for (let q = -3; q <= 2; q++) dec(19.45, 4.2, ZC + q * 1.2 + 0.6, 0.05, 0.35, 0.8, 0.2, 0.7, 0.4, 0.6);
          dec(18.9, 4.7, ZC, 0.08, 0.7, 0.7, 0.35, 0.22, 0.1); dec(18.88, 4.7, ZC, 0.1, 0.12, 0.12, 0.2, 0.15, 0.08);
          fc(cm(13), ya, cm(ZC - 1), cm(15), ya + 3, cm(ZC + 1), B.PLANK);   // mesa de cartas
          bridgeInside(ya, x1);
        }
        if (k === 1) radarRoom(ya, x0, x1, z0, z1);
      }
      {
        const y0 = 8.7, w = 12, x0 = 13, x1 = 18;
        dec((x0 + x1) / 2, y0 + 1.3, ZC, x1 - x0, 2.6, w, 0.62, 0.62, 0.58);
        dec(x1 + 0.03, y0 + 1.6, ZC, 0.04, 0.9, w - 1, 0.75, 0.68, 0.45, 0.3);
        for (const s of [-1, 1]) dec((x0 + x1) / 2, y0 + 1.6, ZC + s * (w / 2 + 0.03), x1 - x0 - 1, 0.9, 0.04, 0.85, 0.8, 0.55, 0.3);
      }
      dec(21.6, 6.05, ZC, 1.4, 0.2, 25, 0.5, 0.5, 0.47);   // alerones del puente (salen del primer piso)
      for (const s of [-1, 1]) { fm(21.5, 3.5, ZC + s * 12 - 0.12, 21.75, 6, ZC + s * 12 + 0.13, B.STEEL); dec(21.6, 5.0, ZC + s * 12, 0.15, 2.1, 0.15, 0.3, 0.3, 0.3); }   // postes del alerón (sólidos)
      dec(14, 13, ZC, 3.5, 6, 4, 0.12, 0.12, 0.13); dec(14, 15.8, ZC, 3.7, 0.6, 4.2, 0.6, 0.12, 0.08);   // chimenea
      dec(19, 13.3, ZC, 0.2, 4, 0.2, 0.3, 0.3, 0.32); dec(19, 15.4, ZC, 0.25, 0.3, 3, 0.3, 0.3, 0.32, 0, 0.7);
      dec(19, 15.7, ZC, 0.2, 0.2, 0.2, 1, 0.1, 0.05, 1);
      light(22.4, 5.7, ZC, 12, [0.8, 0.75, 0.6]); dec(22.35, 5.85, ZC, 0.3, 0.25, 0.5, 1, 0.95, 0.8, 0.9);
    }

    // interior del primer piso del puente: puertas, escalera al segundo y el equipo de mando
    function bridgeInside(ya, x1) {
      // dos puertas en el frente (hacia proa), a los lados de la consola, con su escalón
      for (const zc of [ZC - 6, ZC + 5]) for (let z = cm(zc); z < cm(zc + 1); z++) for (let y = ya + 1; y <= ya + 8; y++) setc(x1 - 1, y, z, 0);
      for (const zc of [ZC - 6, ZC + 5]) { dec(22.02, 5.78, zc + 0.5, 0.04, 0.06, 1.1, 0.75, 0.6, 0.1); dec(22.04, 5.9, zc + 0.5, 0.03, 0.14, 0.5, 0.1, 0.7, 0.3, 0.8); }   // dintel y rótulo verde
      // escalera interior al segundo piso, contra el mamparo de babor (sube hacia proa)
      const SX0 = cm(12.6), N = 18, Z0 = cm(14.6), Z1 = cm(16.1);
      for (let i = 0; i < N; i++) {
        const top = ya + 1 + Math.round((i + 1) * 10 / N);
        for (let y = ya + 1; y < top; y++) for (let z = Z0; z < Z1; z++) setc(SX0 + i, y, z, y === top - 1 ? B.STEEL : B.SHIPW);
        if (i >= 5) for (let z = Z0; z < Z1; z++) { setc(SX0 + i, ya + 9, z, 0); setc(SX0 + i, ya + 10, z, 0); }   // hueco en el techo
        if (i % 2 === 0) dec((SX0 + i + 0.5) / C, (top - 0.02) / C, 15.35, 0.25, 0.02, 1.5, 0.65, 0.55, 0.1);           // canto amarillo
      }
      for (let i = 0; i < N; i++) setc(SX0 + i, ya + 1 + Math.round((i + 1) * 10 / N), Z1, i % 3 === 0 ? B.STEEL : 0);  // pasamanos
      // timón, sillón del capitán, telégrafo de máquinas, radar, carta náutica y prismáticos
      const Y = 3.5 + 0.25;                                                   // suelo del puente (m sobre la cubierta)
      fm(18.4, 3.75, ZC - 0.3, 18.9, 4.25, ZC + 0.3, B.STEEL);                 // pedestal del timón
      dec(18.6, Y + 1.0, ZC, 0.08, 0.9, 0.9, 0.35, 0.22, 0.1); dec(18.58, Y + 1.0, ZC, 0.1, 0.15, 0.15, 0.6, 0.5, 0.2);
      for (let a = 0; a < 8; a++) dec(18.6, Y + 1.0 + Math.sin(a * 0.785) * 0.52, ZC + Math.cos(a * 0.785) * 0.52, 0.06, 0.12, 0.12, 0.3, 0.2, 0.08);   // cabillas
      fm(16.6, 3.75, ZC + 1.6, 17.3, 4.2, ZC + 2.3, B.CLOTH); fm(16.6, 4.2, ZC + 1.6, 16.8, 4.9, ZC + 2.3, B.CLOTH);    // sillón del capitán
      dec(16.95, Y + 0.15, ZC + 1.95, 0.15, 0.3, 0.15, 0.2, 0.2, 0.2);
      fm(19.6, 4.5, ZC + 2.6, 20.1, 4.75, ZC + 3.2, B.STEEL);                  // telégrafo de máquinas (sobre la consola)
      dec(19.85, 5.0, ZC + 2.9, 0.1, 0.5, 0.35, 0.65, 0.55, 0.25, -0.3); dec(19.79, 5.05, ZC + 2.9, 0.04, 0.32, 0.28, 0.85, 0.82, 0.7, 0.3);
      dec(19.47, 4.15, ZC - 2.6, 0.05, 0.55, 0.55, 0.05, 0.25, 0.1, 0.8); dec(19.44, 4.15, ZC - 2.6, 0.03, 0.5, 0.04, 0.4, 1, 0.5, 1);   // pantalla del radar
      dec(14, Y + 0.78, ZC, 1.8, 0.02, 1.6, 0.75, 0.7, 0.55); dec(14.2, Y + 0.8, ZC + 0.2, 0.06, 0.02, 0.5, 0.15, 0.15, 0.15, 0, 0.6);   // carta y regla
      dec(13.4, Y + 0.82, ZC - 0.5, 0.2, 0.12, 0.25, 0.1, 0.1, 0.1);           // prismáticos
      for (const zz of [ZC - 9.4, ZC + 9.4]) { dec(12, Y + 1.4, zz, 0.7, 0.7, 0.04, 0.85, 0.3, 0.08); dec(12, Y + 1.4, zz, 0.35, 0.35, 0.05, 0.5, 0.5, 0.47); }   // salvavidas
      dec(11.3, Y + 1.5, ZC + 4, 0.04, 0.6, 0.9, 0.2, 0.25, 0.3, 0.2);         // panel de alarmas
      for (let q = 0; q < 6; q++) dec(11.28, Y + 1.3 + (q % 2) * 0.2, ZC + 3.7 + Math.floor(q / 2) * 0.25, 0.03, 0.08, 0.08, q % 3 ? 0.2 : 1, q % 3 === 1 ? 1 : 0.2, 0.15, 0.9);
      light(15, Y + 1.7, ZC + 6, 4, [0.6, 0.7, 0.8]);
    }
    // segundo piso: la sala del radar, con barandilla alrededor del hueco de la escalera
    function radarRoom(ya, x0, x1, z0, z1) {
      const Y = (ya + 1) / C;
      for (let x = cm(12.6) + 4; x < cm(12.6) + 18; x++) setc(x, ya + 1, cm(16.1), B.STEEL);   // barandilla del hueco
      for (let z = cm(14.6); z < cm(16.1); z++) setc(cm(12.6) + 4, ya + 1, z, B.STEEL);
      fm(17.6, Y, ZC - 2, 18.2, Y + 1.5, ZC + 2, B.STEEL);                      // consola del radar
      dec(17.57, Y + 1.05, ZC, 0.05, 0.6, 0.6, 0.05, 0.25, 0.1, 0.8); dec(17.54, Y + 1.05, ZC, 0.03, 0.55, 0.04, 0.4, 1, 0.5, 1);
      for (let q = -1; q <= 1; q += 2) dec(17.57, Y + 1.0, ZC + q * 1.2, 0.05, 0.45, 0.7, 0.15, 0.4, 0.7, 0.6);
      fm(13.6, Y, ZC + 3.5, 14.3, Y + 0.45, ZC + 4.2, B.CLOTH);                 // asiento
      light(16, Y + 1.6, ZC, 5, [0.45, 0.6, 0.75]);
    }

    // 4) contenedores: tres filas (babor, centro, estribor) en ocho bahías
    const box = (x, z, lvl, t, open) => {
      // 6 × 2,5 × 2,5 m a lo largo de x
      const XA = cm(x), ZA = cm(z), L = 24, Wd = 10, Hc = 10, y0 = lvl * Hc;
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = y0; y < y0 + Hc && y < H; y++) {
        const shell = u === 0 || u === L - 1 || v === 0 || v === Wd - 1 || y === y0 || y === y0 + Hc - 1;
        if (!shell) continue;
        if (open && (open === 1 ? u === L - 1 : u === 0) && y > y0 && y < y0 + Hc - 1 && v > 0 && v < Wd - 1) continue;
        setc(XA + u, y, ZA + v, ((u === 0 || u === L - 1) && (v === 0 || v === Wd - 1)) ? B.STEEL : t);
      }
      const y = lvl * 2.5, hv = hash(x, z + lvl, 11);
      // puertas del extremo: dos hojas con cuatro barras de cierre y manillas, y la placa con la matrícula
      for (const end of [0, 1]) {
        if (open && (open === 1 ? end === 1 : end === 0)) continue;
        const ex = end ? x + 6.02 : x - 0.02;
        dec(ex, y + 1.25, z + 1.25, 0.02, 2.3, 0.04, 0.05, 0.05, 0.05);                                  // junta de las hojas
        for (const bz of [0.45, 0.95, 1.55, 2.05]) {
          dec(ex, y + 1.25, z + bz, 0.04, 2.25, 0.05, 0.42, 0.42, 0.4, -0.2);                              // barra de cierre
          dec(ex + (end ? 0.03 : -0.03), y + 1.1, z + bz + 0.08, 0.04, 0.05, 0.16, 0.5, 0.5, 0.48, -0.2);  // manilla
        }
        dec(ex, y + 2.15, z + 0.75, 0.02, 0.18, 0.5, 0.85, 0.85, 0.8);                                   // matrícula
      }
      // costados: logotipo de la naviera (franja clara) en uno de cada dos
      if (hv < 0.5) for (const sz of [z - 0.02, z + 2.52]) { dec(x + 3, y + 1.6, sz, 3.4, 0.5, 0.02, 0.8, 0.78, 0.7); dec(x + 2.2, y + 1.6, sz, 0.5, 0.36, 0.025, [0.7, 0.15, 0.1][Math.floor(hv * 6) % 3] + 0.1, 0.3, 0.45); }
      if (open && lvl === 0) {   // puertas abiertas de par en par (sólidas) y carga dentro
        const ex = open === 1 ? x + 6 : x;
        const xa = open === 1 ? ex : ex - 1.2, xb = open === 1 ? ex + 1.2 : ex;
        fm(xa, 0, z, xb, 2.4, z + 0.25, B.STEEL); fm(xa, 0, z + 2.25, xb, 2.4, z + 2.5, B.STEEL);
        for (const zz of [z + 0.12, z + 2.38]) for (const bx of [0.3, 0.8]) dec(ex + open * bx, 1.2, zz, 0.05, 2.2, 0.3, 0.42, 0.42, 0.4, -0.2);
        if (hash(x, z, 5) < 0.6) prop('crate', x + 3, z + 1.25);
      }
    };
    const COLS = [B.CONT_R, B.CONT_B, B.CONT_G, B.CONT_O];
    const rows = [11.5, 19.5, 27.5];   // z de cada fila (dos contenedores de ancho)
    let bay = 0;
    for (let x = 36; x + 6 <= 106; x += 9, bay++) {
      for (let ri = 0; ri < 3; ri++) {
        const z = rows[ri];
        for (let w = 0; w < 2; w++) {
          const zz = z + w * 2.5, hv = hash(bay, ri, w);
          const below = ri === 1 && x < LX1;                       // encima del piso de camarotes: siempre cerrado
          if (ri === 1 && x >= LX1) continue;                      // aquí baja la escalera de proa
          if (hv < 0.1 && !below) continue;                        // hueco en la fila
          const t = COLS[Math.floor(hash(bay, ri * 3 + w, 7) * 4)];
          const open = hv < 0.25 && !below ? (bay & 1 ? 1 : -1) : 0;
          box(x, zz, 0, t, open);
          if (hv > 0.55 && !open) box(x, zz, 1, COLS[Math.floor(hash(w, bay, ri) * 4)], 0);
        }
      }
      // escalones de cajas para trepar a los contenedores
      if (bay % 3 === 1) {
        fm(x - 1.25, 0, 17.3, x - 0.25, 1.25, 18.7, B.CRATE);
        fm(x - 2.5, 0, 17.3, x - 1.25, 0.5, 18.7, B.CRATE);
      }
      // trincas de los contenedores (barras sólidas en las esquinas)
      for (const z of [11.5, 16.5, 19.5, 24.5, 27.5, 32.5]) { fm(x - 0.25, 0, z - 0.12, x, 2.75, z + 0.13, B.CHAIN); dec(x - 0.12, 1.4, z, 0.06, 2.8, 0.06, 0.4, 0.38, 0.32, 0, 0.3); }
      // puente de trincaje en el hueco de la fila central (sobre los camarotes no se camina)
      if (x + 6 < LX1) {
        const ga = x + 6, gb = Math.min(LX1, x + 9);
        fm(ga, 0, LZ0, gb, 0.5, LZ1, B.STEEL);                                            // base
        for (const zz of [LZ0, LZ1 - 0.25]) fm(ga, 0.5, zz, gb, 2.75, zz + 0.25, B.STEEL);  // barandas laterales
        fm(ga + 0.2, 0.5, LZ0 + 0.25, gb - 0.2, 2.75, LZ1 - 0.25, B.CHAIN);              // rejilla del puente
        dec((ga + gb) / 2, 2.85, ZC, gb - ga, 0.1, LZ1 - LZ0, 0.6, 0.5, 0.1);            // pasarela amarilla de arriba
        for (const zz of [LZ0 + 0.6, LZ1 - 0.6]) dec((ga + gb) / 2, 1.6, zz, gb - ga - 0.4, 0.06, 0.06, 0.7, 0.6, 0.1);
      }
      // focos de cubierta en postes junto a la borda (alumbran los pasillos)
      if (bay % 2 === 0) for (const sd of [-1, 1]) {
        const lz = ZC + sd * (halfW(x + 7.5) - 0.45);
        fm(x + 7.35, 0, lz - 0.15, x + 7.65, 3.5, lz + 0.15, B.STEEL);
        fm(x + 7.25, 3.25, lz - 0.25 - sd * 0.3, x + 7.75, 3.5, lz + 0.25 - sd * 0.3, B.LAMP);
        light(x + 7.5, 3.0, lz - sd * 0.6, 9, [0.8, 0.74, 0.55]);
      }
      if (bay === 2 || bay === 5) chestSpot(x + 7.5, 22);
    }

    r.merchantSpots.push({ x: wx(66.5), z: wz(26), name: 'el pasillo de los contenedores' });
    // 5) grúas de cubierta (columna maciza y pluma de decorado)
    // grúa de cubierta: pedestal redondo, corona de giro, cabina con ventanas, contrapeso, castillete
    // en A y pluma de celosía horizontal con el cable y el gancho colgando. ax, az: hacia dónde apunta la pluma
    const crane = (x, z, ax, az, L) => {
      const XA = cm(x), ZA = cm(z), RP = 4;                                         // radio del pedestal (celdas)
      const put = (u, v, y, t) => setc(XA + u * ax - v * az, y, ZA + u * az + v * ax, t);   // u: a lo largo de la pluma, v: de lado
      for (let y = 0; y < 18; y++) for (let a = -RP; a <= RP; a++) for (let b = -RP; b <= RP; b++) {
        const d = Math.hypot(a, b);
        if (d > RP + 0.3) continue;
        setc(XA + a, y, ZA + b, y < 2 ? B.STEEL : y === 16 || y === 17 ? B.CDARK : (y % 6 === 5 && d > RP - 0.8 ? B.STEEL : B.MACH_Y));   // pedestal (con aros) y corona
      }
      // plataforma, cabina (con ventanas hacia la pluma y a los lados) y contrapeso detrás
      for (let u = -6; u <= 5; u++) for (let v = -5; v <= 5; v++) put(u, v, 18, B.STEEL);
      for (let u = -2; u <= 5; u++) for (let v = 1; v <= 5; v++) for (let y = 19; y < 29; y++) {
        const edge = u === -2 || u === 5 || v === 1 || v === 5 || y === 28;
        if (!edge) { put(u, v, y, 0); continue; }
        const win = y >= 22 && y <= 26 && ((u === 5 && v > 1 && v < 5) || (v === 5 && u > -1 && u < 4));
        put(u, v, y, win ? B.GLASS : B.MACH_Y);
      }
      for (let u = -6; u <= -3; u++) for (let v = -4; v <= 4; v++) for (let y = 19; y < 25; y++) put(u, v, y, (y + v) % 4 ? B.STEEL : B.CDARK);   // contrapeso
      // castillete en A: dos patas que suben hasta la cabeza de la pluma
      for (let y = 19; y < 40; y++) for (const v of [-3, -2, 2, 3]) if (Math.abs(v) === 3 || y > 34) put(-1, v, y, B.MACH_Y);
      for (let v = -3; v <= 3; v++) { put(-1, v, 39, B.MACH_Y); put(-1, v, 30, B.MACH_Y); }
      // pluma de celosía: cordones arriba y abajo a los dos lados, diagonales en zigzag y tirantes
      const UL = Math.round(L * C), YB = 32, HB = 5;                                // largo, altura del cordón inferior, canto
      for (let u = 0; u <= UL; u++) {
        const taper = u > UL - 8 ? Math.floor((u - (UL - 8)) / 4) : 0;
        const h = HB - taper, w = 2 - (taper > 0 ? 1 : 0);
        for (const v of [-w, w]) {
          put(u, v, YB, B.MACH_Y); put(u, v, YB + h, B.MACH_Y);                    // cordones
          const k = u % (2 * h);
          put(u, v, YB + (k < h ? k : 2 * h - k), B.MACH_Y);                      // diagonal en zigzag
        }
        if (u % 4 === 0) for (let v = -w; v <= w; v++) { put(u, v, YB, B.MACH_Y); put(u, v, YB + h, B.MACH_Y); }   // tirantes
      }
      // cabeza con la polea y tirantes del castillete a la punta (cables tensos, en escalera de celdas)
      for (let v = -1; v <= 1; v++) for (let y = YB - 1; y <= YB + 2; y++) put(UL + 1, v, y, B.CDARK);
      for (let u = 0; u <= UL; u++) { const y = 39 - Math.round(u * (39 - (YB + 3)) / UL); put(u, 0, y, B.CHAIN); }
      // cable y gancho colgando de la punta
      const hx = (XA + (UL + 1) * ax + 0.5) / C, hz = (ZA + (UL + 1) * az + 0.5) / C;
      for (let y = 14; y < YB - 1; y++) put(UL + 1, 0, y, B.CHAIN);
      fm(hx - 0.3, 2.75, hz - 0.3, hx + 0.3, 3.5, hz + 0.3, B.MACH_Y);            // motón del gancho
      dec(hx, 2.55, hz, 0.12, 0.4, 0.12, 0.25, 0.25, 0.25); dec(hx, 2.3, hz + 0.1, 0.12, 0.12, 0.3, 0.25, 0.25, 0.25);
      // luces: roja de aviso en la punta y en el castillete, foco de trabajo bajo la pluma
      const tx = (XA + UL * ax) / C, tz = (ZA + UL * az) / C;
      dec(tx, (YB + 6) / C, tz, 0.25, 0.25, 0.25, 1, 0.1, 0.05, 1); light(tx, (YB + 6) / C, tz, 5, [1, 0.15, 0.08]);
      dec(x - ax * 0.25, 10.1, z - az * 0.25, 0.25, 0.25, 0.25, 1, 0.1, 0.05, 1);
      light(x + ax * 4, 7.6, z + az * 4, 9, [0.85, 0.8, 0.6]);
      // escala de acceso al pedestal y rótulo de carga máxima
      for (let k = 0; k < 9; k++) dec(x - ax * 1.12, 0.4 + k * 0.45, z - az * 1.12, 0.5 * Math.abs(az) + 0.05, 0.04, 0.5 * Math.abs(ax) + 0.05, 0.3, 0.3, 0.3);
      dec(x + ax * 1.13, 2.5, z + az * 1.13, 0.6 * Math.abs(az) + 0.02, 0.35, 0.6 * Math.abs(ax) + 0.02, 0.9, 0.85, 0.75);
    };
    crane(34.5, 10.2, 1, 0, 13); crane(69.5, 33.6, 0, -1, 11);

    // 6) botes salvavidas colgados de sus pescantes junto a la popa
    for (const s of [-1, 1]) for (const x of [30.8]) {
      const z = ZC + s * 12.6;
      fm(x - 2.6, 0, z - 0.3, x - 2.3, 2.6, z + 0.3, B.STEEL); fm(x + 2.3, 0, z - 0.3, x + 2.6, 2.6, z + 0.3, B.STEEL);
      fm(x - 2.1, 1.4, z - 0.75, x + 2.1, 2.4, z + 0.75, B.CONT_O);                        // casco del bote (sólido)
      dec(x, 1.9, z, 4.4, 1.1, 1.6, 0.9, 0.35, 0.08); dec(x, 2.5, z, 3.6, 0.35, 1.3, 0.85, 0.82, 0.78);
      for (const k of [-1.5, 0, 1.5]) dec(x + k, 2.72, z, 0.3, 0.12, 1.4, 0.2, 0.2, 0.2);                  // asideros del toldo
      dec(x - 2.45, 2.75, z, 0.08, 0.5, 0.08, 0.3, 0.3, 0.3); dec(x + 2.45, 2.75, z, 0.08, 0.5, 0.08, 0.3, 0.3, 0.3);   // cabos de los pescantes
    }

    // 7) castillo de proa elevado (1,5 m) con cabrestantes, bitas y el mástil de proa
    {
      const xa = 108, HP = 6;
      for (let cx = cm(xa); cx < cm(X1); cx++) {
        const x = (cx + 0.5) / C, hw = halfW(x) - 0.3;
        fc(cx, 0, cm(ZC - hw), cx + 1, HP, cm(ZC + hw), B.HULL);
        fc(cx, HP - 1, cm(ZC - hw) + 1, cx + 1, HP, cm(ZC + hw) - 1, B.DECK);
        // borda del castillo
        const za = cm(ZC - hw), zb = cm(ZC + hw) - 1;
        for (const cz of [za, zb]) { setc(cx, HP, cz, B.HULL); setc(cx, HP + 1, cz, B.HULL); if (cx % 6 === 0) { setc(cx, HP + 2, cz, B.STEEL); setc(cx, HP + 3, cz, B.STEEL); } }
      }
      gm(xa, Z0, X1, Z1, (x, z) => Math.abs(z + 0.5 - ZC) <= halfW(x + 0.5) ? G.DECK2 : 255);
      // escalones desde la cubierta
      for (let k = 0; k < 3; k++) for (let d = 0; d < 3; d++) fc(cm(xa) - 1 - k * 3 - d, 0, cm(19.5), cm(xa) - k * 3 - d, HP - 2 - k * 2 > 0 ? HP - 2 - k * 2 : 0, cm(24.5), B.STEEL);
      // cabrestantes y bitas
      for (const s of [-1, 1]) {
        fm(114, 1.5, ZC + s * 4 - 1, 116.5, 2.5, ZC + s * 4 + 1, B.STEEL); dec(115.25, 2.9, ZC + s * 4, 1.4, 0.7, 2.2, 0.4, 0.38, 0.33);
        fm(110, 1.5, ZC + s * 8 - 0.3, 110.6, 2.2, ZC + s * 8 + 0.3, B.STEEL); fm(111.2, 1.5, ZC + s * 8 - 0.3, 111.8, 2.2, ZC + s * 8 + 0.3, B.STEEL);
        dec(119, 1.53, ZC + s * 2.2, 5, 0.06, 0.12, 0.25, 0.22, 0.18, 0, s * 0.35);   // cadenas del ancla
      }
      fm(121.5, 1.5, ZC - 0.25, 122, 7, ZC + 0.25, B.STEEL);
      dec(121.75, 7.12, ZC, 0.3, 0.25, 0.3, 1, 1, 0.85, 1);
      light(121.75, 6.6, ZC, 12, [0.9, 0.9, 0.75]);
      // luces de navegación: roja a babor, verde a estribor
      light(112, 2.6, ZC - halfW(112) + 0.6, 6, [1.2, 0.15, 0.1]); dec(112, 2.4, ZC - halfW(112) + 0.4, 0.25, 0.25, 0.25, 1, 0.1, 0.05, 1);
      light(112, 2.6, ZC + halfW(112) - 0.6, 6, [0.1, 1.1, 0.2]); dec(112, 2.4, ZC + halfW(112) - 0.4, 0.25, 0.25, 0.25, 0.1, 1, 0.2, 1);
      chestSpot(118, ZC);
      r.merchantSpots.push({ x: wx(106), z: wz(17.8), name: 'el pie del castillo de proa' });
    }

    // 8) escotillas abiertas por donde salen los zombis, y bidones y cabos por cubierta
    const hatch = (x, z) => {
      fm(x - 1, 0, z - 1, x + 1, 0.4, z + 1, B.STEEL);
      fm(x - 0.7, 0.3, z - 0.7, x + 0.7, 0.4, z + 0.7, 0);
      dec(x, 0.2, z, 1.3, 0.02, 1.3, 0.01, 0.01, 0.01);
      fm(x + 1.05, 0, z - 0.75, x + 1.3, 1.25, z + 0.75, B.SHIPW);   // tapa levantada (sólida)
      dec(x + 1.2, 0.6, z, 0.06, 1.2, 1.5, 0.15, 0.25, 0.25);
      r.spawns.push({ x: wx(x), z: wz(z), mouth: true });
    };
    hatch(107, 14); hatch(107, 30);   // (la del centro de popa es ahora la escalera a los camarotes)
    for (const [x, z] of [[32, 14], [32.8, 14.3], [32, 30], [106, 22.5]]) prop(hash(x, z, 1) < 0.5 ? 'barrel' : 'xbarrel', x, z);
    for (const [x, z] of [[47, 9.5], [83, 34.5], [97, 9.3]]) { fm(x - 0.6, 0, z - 0.6, x + 0.6, 0.25, z + 0.6, B.PLANK); dec(x, 0.16, z, 1.4, 0.3, 1.4, 0.55, 0.45, 0.3); dec(x, 0.32, z, 0.5, 0.04, 0.5, 0.15, 0.12, 0.08); }   // rollos de cabo

    // 9) abordaje por la borda: los zombis trepan desde el mar
    for (let k = 0; k < 10; k++) {
      const x = 36 + k * 7.5, s = k & 1 ? 1 : -1;
      r.spawns.push({ x: wx(x), z: wz(ZC + s * (halfW(x) - 0.8)) });
    }

    // máquinas de ventajas
    machine(30.5, 22, 'xp', 'coraza');
    machine(46, 9.6, 'zp', 'manos');
    machine(78, 34.4, 'zn', 'gatillo');
    machine(100, 9.6, 'zp', 'liebre');
    machine(93.5, 34.4, 'zn', 'aliento');

    // 10) más detalle de cubierta: ventiladores de seta, bitas, tuberías junto a la borda, charcos y óxido en el casco
    deckDetail();
    // 11) la cubierta pasa a ser una losa de bloques con los colores del suelo pintado
    deckSlab();
    // 12) el piso de camarotes, debajo de la fila central de contenedores
    lowerDeck();
    r.playerStart = { x: wx(70.5), z: wz(18) };

    function deckDetail() {
      for (let x = 14; x < 108; x += 9) for (const s of [-1, 1]) {
        if (x > 8 && x < 30) continue;                                    // junto al castillo de popa no
        const zb = ZC + s * (halfW(x) - 0.75), k = hash(x, s, 21);
        if (k < 0.45) {                                                   // ventilador de seta
          fm(x - 0.25, 0, zb - 0.25, x + 0.25, 0.9, zb + 0.25, B.STEEL);
          dec(x, 1.0, zb, 0.75, 0.22, 0.75, 0.75, 0.73, 0.68); dec(x, 0.92, zb, 0.6, 0.06, 0.6, 0.05, 0.05, 0.05);
        } else if (k < 0.8) {                                             // bita doble de amarre
          for (const d of [-0.35, 0.35]) { fm(x + d - 0.15, 0, zb - 0.15, x + d + 0.15, 0.6, zb + 0.15, B.STEEL); dec(x + d, 0.63, zb, 0.4, 0.06, 0.4, 0.2, 0.2, 0.2); }
          dec(x, 0.35, zb, 0.7, 0.08, 0.12, 0.6, 0.5, 0.35);
        } else {                                                          // armario de manguera contra incendios
          fm(x - 0.4, 0, zb - 0.15, x + 0.4, 1.1, zb + 0.15, B.CLOTH);
          dec(x, 0.75, zb - s * 0.17, 0.5, 0.5, 0.02, 0.9, 0.85, 0.75); dec(x, 0.75, zb - s * 0.18, 0.3, 0.3, 0.02, 0.6, 0.08, 0.05);
        }
      }
      // tuberías de servicio a lo largo de la borda (al pie, sólidas: se pueden pisar)
      for (const s of [-1, 1]) {
        const z = ZC + s * (halfW(60) - 0.35);
        fm(30, 0, z - 0.12, 108, 0.25, z + 0.13, B.STEEL);
        dec(69, 0.14, z, 78, 0.16, 0.16, 0.3, 0.3, 0.28, -0.2);
        for (let x = 33; x < 108; x += 6) dec(x, 0.14, z, 0.12, 0.24, 0.24, 0.55, 0.15, 0.08);   // bridas
      }
      // casco: marcas de calado en proa y popa, chorretones de óxido y escobén del ancla
      for (const s of [-1, 1]) {
        for (const x of [10, 109]) for (let k = 0; k < 5; k++) dec(x, -0.6 - k * 0.7, ZC + s * (halfW(x) + 0.34), 0.5, 0.08, 0.02, 0.8, 0.8, 0.78, 0, s * 0);
        for (let i = 0; i < 18; i++) { const x = 12 + hash(i, s, 41) * 96; dec(x, -0.9 - hash(i, s, 42) * 0.8, ZC + s * (halfW(x) + 0.33), 0.14 + hash(i, s, 43) * 0.2, 1.4 + hash(i, s, 44) * 1.6, 0.02, 0.2, 0.09, 0.05); }
        dec(117, -0.4, ZC + s * (halfW(117) + 0.3), 0.9, 0.9, 0.05, 0.03, 0.03, 0.03);
        dec(117, -1.3, ZC + s * (halfW(117) + 0.32), 0.12, 1.6, 0.03, 0.15, 0.13, 0.12, 0, 0.2);
      }
      // castillo de popa por fuera: aros salvavidas, escalas y antenas
      for (const s of [-1, 1]) { const z = s < 0 ? 10.95 : 33.05; dec(27.2, 1.5, z, 0.7, 0.7, 0.04, 0.85, 0.3, 0.08); dec(27.2, 1.5, z + s * 0.01, 0.35, 0.35, 0.05, 0.5, 0.5, 0.47); }
      for (const s of [-1, 1]) for (let k = 0; k < 10; k++) dec(28.04, 0.3 + k * 0.3, ZC + s * 3, 0.04, 0.04, 0.5, 0.35, 0.35, 0.33);   // escalas por fuera del castillo
      for (const s of [-1, 1]) { dec(28.04, 1.5, ZC + s * 3.25, 0.04, 3, 0.04, 0.35, 0.35, 0.33); dec(28.04, 1.5, ZC + s * 2.75, 0.04, 3, 0.04, 0.35, 0.35, 0.33); }
      for (let k = 0; k < 3; k++) dec(15 + k * 1.2, 15.5 + k * 0.4, ZC + 3, 0.05, 3 + k, 0.05, 0.35, 0.35, 0.37);   // antenas
      for (let i = 0; i < 10; i++) dec(10.5 + i * 1.6, 3.52, 22, 0.8, 0.02, 0.2, 0.65, 0.55, 0.1);   // franjas de seguridad en el techo
    }

    // la losa de la cubierta: la capa de arriba con los colores del suelo pintado de antes
    function deckSlab() {
      const top = DYc - 1, SXm = r.sxM;
      const T = { [G.DECK]: B.SDECK, [G.DECK2]: B.SDECK2, [G.HATCH]: B.SHATCH, [G.PAINT]: B.SPAINT, [G.WOOD]: B.PLANK, [G.TILE]: B.STILE };
      for (let cz = 0; cz < r.D; cz++) for (let cx = 0; cx < r.W; cx++) {
        if (K.getc(cx, top, cz) !== B.BARRIER || K.getc(cx, top + 1, cz) === B.BARRIER) continue;
        const g = r.gmap[(cz >> 2) * SXm + (cx >> 2)];
        if (g === 255 || g === undefined) continue;
        let t = T[g] || B.SDECK;
        if (t === B.SDECK && ((cx >> 3) & 1)) t = B.SDECKB;
        if (t === B.SHATCH && (((cx >> 2) + (cz >> 2)) & 1)) t = B.SHATCH2;
        K.setc(cx, top, cz, t);
      }
    }

    // ---------- piso de camarotes ----------
    // pasillo de 2,25 m a lo largo (lado de babor) y diez camarotes grandes de 6 × 2,5 m (lado de estribor),
    // techo a 2,75 m. Se baja por una escalera abierta en popa (x 32..36) y otra en proa (x 97..105), del ancho del pasillo.
    function lowerDeck() {
      const XA = cm(LX0), XB = cm(LX1), ZA = cm(LZ0), ZB = cm(LZ1), TOP = DYc - 1;   // TOP: la capa de la cubierta (techo)
      const CW = 9;                                                                   // ancho del pasillo (celdas): z ZA..ZA+9, frente en ZA+9
      // vaciar, paredes de dos colores y techo blanco
      for (let y = 0; y < TOP + 1; y++) for (let z = ZA - 1; z <= ZB; z++) for (let x = XA - 1; x <= XB; x++) {
        const edge = x === XA - 1 || x === XB || z === ZA - 1 || z === ZB;
        if (y === TOP) { if (!edge) K.setc(x, y, z, B.SHIPW); continue; }
        K.setc(x, y, z, edge ? (y < 4 ? B.DECK : B.SHIPW) : 0);
      }
      // suelo: baldosa en el pasillo, madera en los camarotes
      gm(LX0, LZ0, LX1, LZ1, G.WOOD); gm(LX0, LZ0, LX1, LZ0 + CW / C, G.TILE);
      // frentes (con puerta de 1,5 m) y tabiques cada 6 m
      const types = ['litera', 'almacen', 'litera', 'enfermeria', 'comedor', 'litera', 'lavanderia', 'arsenal', 'litera', 'maquinas'];
      const fz = ZA + CW, MOD = 24;
      let n = 0;
      for (let x0 = XA; x0 < XB; x0 += MOD) {
        const xe = Math.min(XB, x0 + MOD);
        for (let y = 0; y < TOP; y++) {
          if (x0 > XA) for (let z = fz; z < ZB; z++) K.setc(x0, y, z, y < 4 ? B.DECK : B.SHIPW);                       // tabique
          for (let x = x0; x < xe; x++) if (!(x >= x0 + 9 && x < x0 + 15 && y < 9)) K.setc(x, y, fz, y < 4 ? B.DECK : B.SHIPW);   // frente con puerta
        }
        if (xe - x0 < 16) continue;
        const mx0 = (x0 + 1) / C, mx1 = xe / C, cmx = (x0 + 12) / C;
        const zIn = (d) => LZ1 - d;                                                      // a d metros de la pared del fondo
        cabin(types[n % types.length], mx0, mx1, cmx, zIn, n); n++;
        K.dec(cmx, 2.4, LZ0 + CW / C - 0.02, 0.6, 0.2, 0.04, 0.85, 0.82, 0.7);          // número sobre la puerta
        K.dec(cmx, 2.42, LZ0 + CW / C - 0.03, 0.2, 0.12, 0.03, 0.1, 0.1, 0.1);
      }
      // pasillo: tuberías y bandeja de cables en el techo, luces (algunas fundidas), luces rojas de emergencia y flechas
      const cz = LZ0 + CW / C / 2, XM = (LX0 + LX1) / 2;
      K.dec(XM, 2.55, LZ0 + 0.35, LX1 - LX0, 0.16, 0.16, 0.35, 0.33, 0.3, -0.2);
      K.dec(XM, 2.45, LZ0 + 0.6, LX1 - LX0, 0.12, 0.12, 0.5, 0.15, 0.1);
      K.dec(XM, 2.62, cz + 0.3, LX1 - LX0, 0.04, 0.5, 0.25, 0.25, 0.24);
      for (let x = LX0 + 2; x < LX1; x += 4.5) {
        const broken = hash(x, 7, 61) < 0.3;
        K.light(x, 2.45, cz, 7, broken ? [0.5, 0.45, 0.35] : [0.75, 0.7, 0.55], broken ? { broken: true } : {});
        K.dec(x, 2.67, cz, 0.8, 0.05, 0.3, 1, 0.95, 0.8, broken ? 0.3 : 0.85);
      }
      for (const x of [LX0 + 0.6, LX1 - 0.6]) { K.light(x, 2.3, cz, 4, [0.9, 0.08, 0.05]); K.dec(x, 2.45, LZ0 + 0.1, 0.2, 0.2, 0.2, 1, 0.1, 0.05, 1); }
      for (let x = LX0 + 1.5; x < LX1; x += 3) K.dec(x, 1.1, LZ0 + 0.02, 0.5, 0.25, 0.02, 0.1, 0.4, 0.2, 0.5);   // flechas de salida
      for (let x = LX0 + 3; x < LX1; x += 6) { K.dec(x, 1.3, LZ0 + 0.03, 0.04, 0.9, 0.04, 0.6, 0.15, 0.1); K.dec(x, 0.8, LZ0 + 0.06, 0.3, 0.3, 0.06, 0.6, 0.08, 0.05); }   // mangueras
      // escaleras del ancho del pasillo: popa (baja hacia +x) y proa (baja hacia -x)
      stairs(cm(32), XA - 1, 1, ZA, ZA + CW);
      stairs(cm(104.5) - 1, XB, -1, ZA, ZA + CW);
      // los zombis también salen de aquí abajo
      r.spawns.push({ x: wx(LX0 + 2), z: wz(cz) }, { x: wx(LX1 - 2), z: wz(cz) });
    }

    // escalera abierta (sin techo): de la cubierta (x0, arriba) al piso de abajo (x1), en las filas z0..z1
    function stairs(x0, x1, dir, z0, z1) {
      const len = Math.abs(x1 - x0), a = Math.min(x0, x1), b = Math.max(x0, x1);
      // caja de la escalera: vaciar hasta el cielo y paredes visibles a los lados
      for (let x = a; x <= b; x++) {
        const k = dir > 0 ? x - x0 : x0 - x;                                   // pasos desde arriba
        const h = Math.max(0, DYc - Math.round((k + 1) * DYc / (len - 3)));     // altura del peldaño (celdas)
        for (let y = 0; y < r.H; y++) for (let z = z0; z < z1; z++) {
          if (y < h) K.setc(x, y, z, y === h - 1 ? B.STEEL : B.BARRIER);
          else K.setc(x, y, z, 0);
        }
        for (let y = 0; y < DYc + 4; y++) for (const z of [z0 - 1, z1]) {
          if (y < DYc) K.setc(x, y, z, y < 4 ? B.DECK : B.SHIPW);
          else K.setc(x, y, z, B.STEEL);                                       // barandilla en cubierta
        }
        if (k % 2 === 0 && h > 0) K.dec((x + 0.5) / C, (h - 0.02) / C + 0.01, (z0 + z1) / 2 / C, 0.25, 0.02, (z1 - z0) / C, 0.65, 0.55, 0.1);   // canto amarillo
      }
      K.dec((a + b + 1) / 2 / C, DY + 0.95, (z0 - 0.5) / C, (b - a + 1) / C, 0.06, 0.06, 0.5, 0.46, 0.4);
      K.dec((a + b + 1) / 2 / C, DY + 0.95, (z1 + 0.5) / C, (b - a + 1) / C, 0.06, 0.06, 0.5, 0.46, 0.4);
      K.light((a + b + 1) / 2 / C, DY - 0.5, (z0 + z1) / 2 / C, 5, [0.7, 0.65, 0.5]);
    }

    // un camarote grande (6 × 2,5 m): mx0..mx1 a lo largo; zIn(d): z a d metros de la pared del fondo
    function cabin(kind, mx0, mx1, cmx, zIn, n) {
      const L = mx1 - mx0;
      const zr = (d0, d1) => [Math.min(zIn(d0), zIn(d1)), Math.max(zIn(d0), zIn(d1))];
      const box = (xa, xb, d0, d1, y0, y1, t) => { const [za, zb] = zr(d0, d1); fmA(xa, y0, za, xb, y1, zb, t); };
      const D = (x, y, d, sx, sy, sz, ...c) => K.dec(x, y, zIn(d), sx, sy, sz, ...c);   // (sin la altura de la cubierta)
      const bunk = (xa) => {   // litera doble de 2 m contra el fondo
        box(xa, xa + 2, 0, 0.85, 0, 0.45, B.PLANK); box(xa, xa + 2, 0, 0.85, 1.3, 1.55, B.PLANK);   // (cada litera, al menos un bloque de grosor)
        D(xa + 1, 0.52, 0.42, 1.9, 0.12, 0.76, 0.18, 0.22, 0.35); D(xa + 1, 1.56, 0.42, 1.9, 0.12, 0.76, 0.35 + hash(xa, 1, 3) * 0.3, 0.15, 0.12);
        D(xa + 0.25, 0.6, 0.42, 0.35, 0.1, 0.55, 0.8, 0.8, 0.75); D(xa + 0.25, 1.64, 0.42, 0.35, 0.1, 0.55, 0.8, 0.8, 0.75);
        for (const x of [xa + 0.04, xa + 1.96]) D(x, 1.0, 0.8, 0.06, 2.0, 0.06, 0.25, 0.18, 0.1);
      };
      for (const x of [mx0 + L * 0.25, mx0 + L * 0.75]) {
        K.light(x, 2.3, zIn(1.2), 4, [0.75, 0.62, 0.42], hash(x, n, 71) < 0.2 ? { broken: true } : {});
        D(x, 2.65, 1.2, 0.4, 0.06, 0.4, 1, 0.9, 0.7, 0.8);
      }
      if (kind === 'litera') {
        bunk(mx0 + 0.1); bunk(mx1 - 2.1);
        box(cmx - 0.45, cmx + 0.45, 0, 0.6, 0, 0.75, B.PLANK); D(cmx, 0.8, 0.3, 0.3, 0.06, 0.2, 0.85, 0.8, 0.6, 0.6);   // mesita con flexo
        D(cmx - 0.2, 0.78, 0.35, 0.25, 0.03, 0.18, 0.7, 0.68, 0.6);                                                     // libro
        D(cmx, 1.7, 0.01, 0.55, 0.7, 0.02, 0.2 + hash(mx0, 1, 81) * 0.6, 0.3, 0.5);                                     // póster
        for (const x of [mx0 + 0.1, mx1 - 0.65]) { box(x, x + 0.55, 2.0, 2.45, 0, 1.9, B.STEEL); D(x + 0.27, 1.0, 1.98, 0.2, 0.04, 0.03, 0.1, 0.1, 0.1); }   // taquillas junto a la puerta
      } else if (kind === 'almacen') {
        for (const [x, d] of [[mx0 + 0.6, 0.55], [mx0 + 1.5, 0.55], [mx0 + 0.6, 1.5], [mx1 - 0.6, 1.6]]) prop('crate', x, zIn(d));
        for (const xa of [cmx - 0.6, mx1 - 1.9]) {
          box(xa, xa + 1.1, 0, 0.45, 0, 2.2, B.STEEL);
          for (let k = 0; k < 4; k++) D(xa + 0.55, 0.45 + k * 0.5, 0.48, 1, 0.04, 0.05, 0.4, 0.38, 0.33);
          for (let k = 0; k < 6; k++) D(xa + 0.25 + (k % 3) * 0.3, 0.62 + Math.floor(k / 3) * 0.5, 0.5, 0.22, 0.22, 0.02, 0.5, 0.38, 0.2);
        }
      } else if (kind === 'enfermeria') {
        for (const xa of [mx0 + 0.2, mx1 - 2.1]) { box(xa, xa + 1.9, 0, 0.85, 0, 0.6, B.SHIPW); D(xa + 0.95, 0.67, 0.42, 1.85, 0.1, 0.8, 0.85, 0.85, 0.82); D(xa + 0.3, 0.75, 0.42, 0.3, 0.08, 0.5, 0.75, 0.8, 0.85); }   // camillas
        D(cmx, 1.7, 0.01, 0.6, 0.18, 0.02, 0.85, 0.1, 0.08, 0.4); D(cmx, 1.7, 0.01, 0.18, 0.6, 0.02, 0.85, 0.1, 0.08, 0.4);   // cruz roja
        box(cmx - 0.4, cmx + 0.4, 0, 0.4, 0, 1.5, B.SHIPW); D(cmx, 1.15, 0.42, 0.5, 0.35, 0.02, 0.4, 0.6, 0.65, 0.2);       // botiquín
        D(mx0 + 1.2, 1.4, 1.4, 0.05, 1.4, 0.05, 0.6, 0.6, 0.62);                                                         // gotero
      } else if (kind === 'lavanderia') {
        for (let k = 0; k < 4; k++) {
          const x = mx0 + 0.2 + k * 0.75;
          box(x, x + 0.65, 0, 0.65, 0, 0.85, B.SHIPW);
          D(x + 0.33, 0.45, 0.67, 0.4, 0.4, 0.02, 0.05, 0.06, 0.08, 0.1); D(x + 0.33, 0.45, 0.68, 0.26, 0.26, 0.02, 0.2, 0.3, 0.4, 0.2);
        }
        box(mx1 - 1.6, mx1 - 0.1, 0, 0.6, 0, 0.9, B.PLANK); D(mx1 - 0.85, 0.95, 0.3, 1.3, 0.08, 0.5, 0.75, 0.75, 0.8);   // mesa de planchar
        D(cmx, 1.9, 1.3, L - 0.6, 0.02, 0.02, 0.3, 0.3, 0.3);                                                            // cuerda de tender
        for (let k = 0; k < 6; k++) D(mx0 + 0.6 + k * 0.85, 1.65, 1.3, 0.3, 0.5, 0.02, [0.7, 0.2, 0.2, 0.3, 0.8, 0.5][k] + 0.1, 0.3 + (k % 3) * 0.2, 0.6);
      } else if (kind === 'comedor') {
        box(mx0 + 0.3, mx0 + 2.5, 0.2, 0.9, 0, 0.75, B.PLANK); D(mx0 + 1.4, 0.78, 0.55, 2.1, 0.04, 0.65, 0.75, 0.72, 0.65);   // mesa con mantel
        box(mx0 + 0.3, mx0 + 2.5, 1.15, 1.4, 0, 0.45, B.PLANK);                                                                // banco
        for (let k = 0; k < 4; k++) D(mx0 + 0.6 + k * 0.5, 0.82, 0.55, 0.15, 0.06, 0.15, 0.85, 0.85, 0.82);                   // platos
        box(mx1 - 2.4, mx1 - 0.1, 0, 0.6, 0, 0.95, B.STEEL); box(mx1 - 2.4, mx1 - 0.1, 0, 0.6, 0.95, 1.0, B.MARBLE);          // barra de servir
        for (let k = 0; k < 3; k++) D(mx1 - 2 + k * 0.7, 1.12, 0.3, 0.35, 0.25, 0.35, 0.55, 0.56, 0.6, -0.4);                  // ollas
      } else if (kind === 'arsenal') {
        prop('crate', mx0 + 0.6, zIn(0.55)); prop('crate', mx0 + 0.6, zIn(1.5));
        box(mx0 + 1.3, mx1 - 0.1, 0, 0.3, 0, 2, B.STEEL);                                                                     // armero
        for (let k = 0; k < 10; k++) D(mx0 + 1.5 + k * 0.4, 1.1, 0.32, 0.07, 1.2, 0.05, 0.12, 0.12, 0.12);                   // fusiles
        D((mx0 + 1.3 + mx1) / 2, 2.1, 0.32, mx1 - mx0 - 1.6, 0.05, 0.05, 0.8, 0.7, 0.1);
        chestSpot(cmx + 0.5, zIn(1.2));
      } else {                                                                                                               // máquinas: bombas, válvulas y tuberías
        box(mx0 + 0.3, mx0 + 1.5, 0, 0.9, 0, 1.1, B.STEEL); box(mx1 - 1.5, mx1 - 0.3, 0, 0.9, 0, 1.1, B.STEEL);
        D(mx0 + 0.9, 1.25, 0.45, 0.5, 0.3, 0.5, 0.15, 0.3, 0.2, 0.2); D(mx1 - 0.9, 1.25, 0.45, 0.5, 0.3, 0.5, 0.15, 0.3, 0.2, 0.2);
        for (let k = 0; k < 5; k++) D(cmx - 0.8 + k * 0.4, 1.5, 0.08, 0.2, 0.2, 0.06, 0.7, 0.1, 0.05);
        D(cmx, 2.2, 0.15, L - 0.2, 0.18, 0.18, 0.32, 0.3, 0.27); D(cmx, 1.9, 0.35, L - 0.2, 0.12, 0.12, 0.5, 0.15, 0.1);
        chestSpot(cmx, zIn(1.3));
      }
    }
  }

  VX.Ship = { create() { const r = new ShipRoom(); r.build(); return r; }, G };
})();
