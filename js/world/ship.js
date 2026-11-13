// Mapa del modo Horda: Barco portacontenedores (136 × 44 m) en plena tormenta.
// Cubierta de acero con barandillas, castillo de popa con puente de mando (se sube por
// escaleras), filas de contenedores apilados (algunos abiertos, con cajas para trepar),
// castillo de proa elevado con cabrestantes, dos grúas, botes salvavidas y el mar alrededor.
// Los zombis suben por la borda y salen de las escotillas.
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const SX = 136, SZ = 44;
  const X0 = 8, X1 = 128, Z0 = 8, Z1 = 36, ZC = 22;   // cubierta
  const BOW = 112;                                     // a partir de aquí la proa se estrecha
  const G = { DECK: 0, DECK2: 1, HATCH: 2, PAINT: 3, WOOD: 4, TILE: 5 };

  // medio ancho de la cubierta en x (metros)
  const halfW = (x) => x <= BOW ? (Z1 - Z0) / 2 : Math.max(1.5, (Z1 - Z0) / 2 * Math.sqrt(Math.max(0, 1 - ((x - BOW) / (X1 - BOW)) ** 2)));

  class ShipRoom extends VX.BigRoom {
    constructor() { super('Barco', SX, SZ, 17, 9); this.damp = 1; this.city = true; }
    generate() { generate(this); }
    // Mar de tormenta: losas que suben y bajan con el oleaje, espuma en las crestas y salpicaduras contra el casco
    renderSea(b, t, P, game) {
      const OX = SX / 2, OZ = SZ / 2;
      // oleaje de tres trenes de ondas (largo, medio y corto) en distintas direcciones; cada losa se inclina con la pendiente
      const WV = [[0.95, 2 * Math.PI / 24, 0.96, 0.28, 1.1], [0.42, 2 * Math.PI / 11, 0.55, -0.83, 1.7], [0.18, 2 * Math.PI / 5.5, -0.35, 0.94, 2.6]];
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
          b.rbox(x, -6.9 + h - 0.5, z, T * 1.08, 1, T * 1.08, q, r * 0.75, g * 0.8, bb * 0.85, -0.5);
          // espuma en las crestas, que se rompe en jirones
          if (crest > 0.45) {
            const fz = Math.sin(x * 1.7 + z * 0.9 + t * 0.6);
            if (fz > -0.3) b.rbox(x + fz * T * 0.2, -6.9 + h + 0.03, z - fz * T * 0.15, T * (0.4 + crest * 0.5), 0.06, T * 0.25, q, 0.4, 0.44, 0.46, 0.03);
          }
        }
      };
      ring(2, 0, 30); ring(4, 30, 50);
      // lluvia: trazos inclinados por el viento alrededor del jugador (no entra bajo techo)
      if (game && game.world) {
        const W = game.world, HH = 9, BOX = 26;
        for (let i = 0; i < 260; i++) {
          const h1 = Math.sin(i * 12.9898) * 43758.5453 % 1, h2 = Math.sin(i * 78.233) * 12543.123 % 1, h3 = Math.sin(i * 39.425) * 9512.77 % 1;
          const ph = ((t * 1.45 + Math.abs(h3)) % 1);
          const y = P.y + HH * 0.75 - ph * HH;
          let x = P.x + (Math.abs(h1) - 0.5) * BOX + ph * 2.2, z = P.z + (Math.abs(h2) - 0.5) * BOX - ph * 0.8;
          if (y < -6) continue;
          if (W.isSolidVisibleAt(x, Math.max(y + 0.4, 0.3), z) || W.isSolidVisibleAt(x, 3.6, z) && y < 3.5 || W.isSolidVisibleAt(x, 6.1, z) && y < 6) continue;
          b.rbox(x, y, z, 0.018, 0.55, 0.018, M.qAxis(0.36, 0, 0.93, 0.17), 0.42, 0.48, 0.56, 0.18);
        }
      }
      // espuma contra el casco y rociones en la proa
      if (game && game.particles && Math.random() < 0.5) {
        const lx = X0 + Math.random() * (X1 - X0), sd = Math.random() < 0.5 ? -1 : 1, lz = ZC + sd * (halfW(lx) + 0.4);
        const x = lx - OX, z = lz - OZ;
        if (Math.hypot(x - P.x, z - P.z) < 45) for (let k = 0; k < 4; k++) game.particles.spawn(x, -6.4 + Math.random() * 0.6, z, Math.random() - 0.5, 2 + Math.random() * 3, sd * (1 + Math.random() * 2), 0.5, 0.55, 0.58, 0.12 + Math.random() * 0.12, 1.2, 0.05);
        if (Math.random() < 0.08) { const bx = X1 - 4 - OX; for (let k = 0; k < 14; k++) game.particles.spawn(bx + Math.random() * 3, 0.5 + Math.random(), (Math.random() - 0.5) * 5, -1 - Math.random() * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 4, 0.55, 0.6, 0.64, 0.08 + Math.random() * 0.1, 1.3, 0.05); }
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
    const { C, H, wx, wz, setc, getc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash } = K;

    // 1) todo es barrera salvo la cubierta (con su forma de proa)
    fc(0, 0, 0, r.W, H, r.D, B.BARRIER);
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
      for (const [x, z] of [[17.2, 11.3], [26.5, 32.7]]) { dec(x, 0.45, z, 0.22, 0.65, 0.22, 0.7, 0.06, 0.04); dec(x, 0.85, z, 0.1, 0.12, 0.1, 0.1, 0.1, 0.1); }   // extintores
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
      // puente de mando: dos pisos macizos encima (se ven las ventanas, no se entra) y un tercero de decorado
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
          for (let q = -3; q <= 2; q++) dec(19.45, 4.6, ZC + q * 1.2 + 0.6, 0.05, 0.35, 0.8, 0.2, 0.7, 0.4, 0.6);
          dec(18.9, 4.7, ZC, 0.08, 0.7, 0.7, 0.35, 0.22, 0.1); dec(18.88, 4.7, ZC, 0.1, 0.12, 0.12, 0.2, 0.15, 0.08);
          fc(cm(13), ya, cm(ZC - 1), cm(15), ya + 3, cm(ZC + 1), B.PLANK);   // mesa de cartas
        }
      }
      {
        const y0 = 8.7, w = 12, x0 = 13, x1 = 18;
        dec((x0 + x1) / 2, y0 + 1.3, ZC, x1 - x0, 2.6, w, 0.62, 0.62, 0.58);
        dec(x1 + 0.03, y0 + 1.6, ZC, 0.04, 0.9, w - 1, 0.75, 0.68, 0.45, 0.3);
        for (const s of [-1, 1]) dec((x0 + x1) / 2, y0 + 1.6, ZC + s * (w / 2 + 0.03), x1 - x0 - 1, 0.9, 0.04, 0.85, 0.8, 0.55, 0.3);
      }
      dec(21.6, 6.05, ZC, 1.4, 0.2, 25, 0.5, 0.5, 0.47);   // alerones del puente (salen del primer piso)
      for (const s of [-1, 1]) dec(21.6, 5.0, ZC + s * 12, 0.15, 2.1, 0.15, 0.3, 0.3, 0.3);
      dec(14, 13, ZC, 3.5, 6, 4, 0.12, 0.12, 0.13); dec(14, 15.8, ZC, 3.7, 0.6, 4.2, 0.6, 0.12, 0.08);   // chimenea
      dec(19, 13.3, ZC, 0.2, 4, 0.2, 0.3, 0.3, 0.32); dec(19, 15.4, ZC, 0.25, 0.3, 3, 0.3, 0.3, 0.32, 0, 0.7);
      dec(19, 15.7, ZC, 0.2, 0.2, 0.2, 1, 0.1, 0.05, 1);
      light(22.4, 5.7, ZC, 12, [0.8, 0.75, 0.6]); dec(22.35, 5.85, ZC, 0.3, 0.25, 0.5, 1, 0.95, 0.8, 0.9);
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
      if (open && lvl === 0) {   // puertas abiertas de par en par y carga dentro
        const ex = open === 1 ? x + 6 : x;
        dec(ex + open * 0.05, 1.25, z + 0.08, 0.05, 2.4, 1.2, 0.2, 0.2, 0.2, 0, open * 1.3);
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
          if (hv < 0.1) continue;                                  // hueco en la fila
          const t = COLS[Math.floor(hash(bay, ri * 3 + w, 7) * 4)];
          const open = hv < 0.25 ? (bay & 1 ? 1 : -1) : 0;
          box(x, zz, 0, t, open);
          if (hv > 0.55 && !open) box(x, zz, 1, COLS[Math.floor(hash(w, bay, ri) * 4)], 0);
        }
      }
      // escalones de cajas para trepar a los contenedores
      if (bay % 3 === 1) {
        fm(x - 1.25, 0, 17.3, x - 0.25, 1.25, 18.7, B.CRATE);
        fm(x - 2.5, 0, 17.3, x - 1.25, 0.5, 18.7, B.CRATE);
      }
      // trincas de los contenedores (decorado)
      for (const z of [11.5, 16.5, 19.5, 24.5, 27.5, 32.5]) dec(x - 0.1, 1.5, z, 0.05, 3, 0.05, 0.4, 0.38, 0.32, 0, 0.3);
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
    const crane = (x, z, yaw) => {
      const XA = cm(x), ZA = cm(z);
      fc(XA - 4, 0, ZA - 4, XA + 4, 2, ZA + 4, B.STEEL);
      fc(XA - 3, 2, ZA - 3, XA + 3, H, ZA + 3, B.MACH_Y);
      dec(x, 9.4, z, 3, 1.6, 2.4, 0.6, 0.5, 0.1);
      dec(x + Math.cos(yaw) * 9, 10.2, z + Math.sin(yaw) * 9, 18, 0.5, 0.6, 0.6, 0.5, 0.1, 0, -yaw);
      dec(x + Math.cos(yaw) * 17, 6.4, z + Math.sin(yaw) * 17, 0.05, 7.5, 0.05, 0.2, 0.2, 0.2);
      dec(x + Math.cos(yaw) * 17, 2.6, z + Math.sin(yaw) * 17, 0.6, 0.4, 0.4, 0.6, 0.5, 0.1);
      dec(x, 10.3, z, 0.25, 0.25, 0.25, 1, 0.15, 0.05, 1);
    };
    crane(34.5, 10.5, 0.6); crane(69, 33.5, -1.0);

    // 6) botes salvavidas colgados de sus pescantes junto a la popa
    for (const s of [-1, 1]) for (const x of [30.8]) {
      const z = ZC + s * 12.6;
      fm(x - 2.6, 0, z - 0.3, x - 2.3, 2.6, z + 0.3, B.STEEL); fm(x + 2.3, 0, z - 0.3, x + 2.6, 2.6, z + 0.3, B.STEEL);
      dec(x, 1.9, z, 4.4, 1.1, 1.6, 0.9, 0.35, 0.08); dec(x, 2.5, z, 3.6, 0.35, 1.3, 0.85, 0.82, 0.78);
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
      dec(x + 1.4, 0.6, z, 0.1, 1.2, 1.5, 0.15, 0.25, 0.25, 0, 0.5);
      r.spawns.push({ x: wx(x), z: wz(z), mouth: true });
    };
    hatch(34, 22); hatch(107, 14); hatch(107, 30);
    for (const [x, z] of [[32, 14], [32.8, 14.3], [32, 30], [106, 22.5]]) prop(hash(x, z, 1) < 0.5 ? 'barrel' : 'xbarrel', x, z);
    for (const [x, z] of [[47, 9.5], [83, 34.5], [97, 9.3]]) { dec(x, 0.15, z, 1.4, 0.3, 1.4, 0.55, 0.45, 0.3); }   // rollos de cabo

    // 9) abordaje por la borda: los zombis trepan desde el mar
    for (let k = 0; k < 10; k++) {
      const x = 36 + k * 7.5, s = k & 1 ? 1 : -1;
      r.spawns.push({ x: wx(x), z: wz(ZC + s * (halfW(x) - 0.8)) });
    }

    // máquinas de ventajas
    K.machine(30.5, 22, 'xp', 'coraza');
    K.machine(46, 9.6, 'zp', 'manos');
    K.machine(78, 34.4, 'zn', 'gatillo');
    K.machine(100, 9.6, 'zp', 'liebre');
    K.machine(93.5, 34.4, 'zn', 'aliento');
    r.playerStart = { x: wx(70.5), z: wz(18) };
  }

  VX.Ship = { create() { const r = new ShipRoom(); r.build(); return r; }, G };
})();
