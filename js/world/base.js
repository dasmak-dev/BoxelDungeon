// Mapa del modo Horda: Base militar (112 × 96 m), de noche, rodeada de bosque.
// Muro de bloques en T y alambrada, cuatro torres de vigilancia con escalera (se sube),
// hangar abierto con un camión, dos barracones con literas, búnker de mando, helipuerto
// con un helicóptero estrellado ardiendo, parque de vehículos (tanque, jeeps, depósitos,
// contenedores), plaza de armas con mástil y nidos de sacos terreros. Los zombis entran
// por la puerta principal y por dos brechas de la alambrada.
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const SX = 112, SZ = 96;
  const E0x = 10, E1x = 102, E0z = 10, E1z = 86;   // perímetro transitable
  const G = { DIRT: 0, CONC: 1, ASPH: 2, GRASS: 3, GRAVEL: 4, PAD: 5, WOOD: 6, TILE: 7 };

  class BaseRoom extends VX.BigRoom {
    constructor() { super('Base militar', SX, SZ, 17, 8); this.damp = 0.35; this.city = true; }
    generate() { generate(this); }
    floorColor(gt, mx, mz, gx, gz, h, h2, o) {
      let r, g, b, mat = 0, wet = 0;
      switch (gt) {
        case G.DIRT: { const k = 0.7 + h * 0.3 + h2 * 0.15; r = 0.2 * k; g = 0.16 * k; b = 0.11 * k; wet = 1; break; }
        case G.GRAVEL: { const k = 0.7 + h * 0.4; r = 0.17 * k; g = 0.165 * k; b = 0.15 * k; break; }
        case G.CONC: { const k = 0.18 + h * 0.03 + (((mx >> 2) + (mz >> 2)) & 1) * 0.02; r = k; g = k; b = k * 1.02; wet = 1; break; }
        case G.PAD: { const k = 0.2 + h * 0.03; r = k; g = k; b = k; break; }
        case G.ASPH: { const k = 0.07 + h * 0.012; r = k; g = k; b = k * 1.1; wet = 1; mat = -0.2; break; }
        case G.GRASS: { const k = 0.6 + h * 0.4; r = 0.05 * k; g = 0.09 * k; b = 0.04 * k; break; }
        case G.WOOD: { const k = 0.6 + M.hash3(gx >> 1, 9, gz >> 3) * 0.4; r = 0.22 * k; g = 0.15 * k; b = 0.08 * k; break; }
        default: { const c = ((mx + mz) & 1) ? 0.3 : 0.22; r = c; g = c; b = c; mat = -0.2; }
      }
      o[0] = r; o[1] = g; o[2] = b; o[3] = mat; o[4] = wet;
    }
  }

  function generate(r) {
    const K = VX.BigBuild(r);
    const { C, H, wx, wz, setc, getc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash } = K;

    // 1) límite y suelo
    fc(0, 0, 0, r.W, H, r.D, B.BARRIER);
    fc(cm(E0x), 0, cm(E0z), cm(E1x), H, cm(E1z), 0);
    gm(E0x, E0z, E1x, E1z, (x, z) => (hash(x >> 2, z >> 2, 3) < 0.25 ? G.GRASS : G.DIRT));
    gm(52, 66, 60, E1z, G.ASPH);                // carretera desde la puerta (sur)
    gm(30, 40, 82, 66, G.ASPH);                  // explanada central
    gm(42, 44, 70, 62, G.CONC);                  // plaza de armas

    // 2) perímetro: bloques en T de hormigón con alambrada encima, y tramos de malla
    const twall = (x0, z0, x1, z1) => {
      // de 3,5 m, en bloques de 1,5 m con junta
      const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const L = ax ? x1 - x0 : z1 - z0;
      for (let a = 0; a < L; a += 1.5) {
        const p0 = ax ? [x0 + a, z0] : [x0, z0 + a];
        if (ax) fm(p0[0] + 0.05, 0, p0[1] - 0.25, p0[0] + 1.45, 3.5, p0[1] + 0.25, B.CONCRETE);
        else fm(p0[0] - 0.25, 0, p0[1] + 0.05, p0[0] + 0.25, 3.5, p0[1] + 1.45, B.CONCRETE);
      }
      // alambre de espino (decorado)
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      dec(cx, 3.75, cz, ax ? L : 0.35, 0.35, ax ? 0.35 : L, 0.18, 0.18, 0.2, -0.3);
    };
    const fence = (x0, z0, x1, z1, gapA = -1, gapB = -1) => {
      const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const L = ax ? x1 - x0 : z1 - z0;
      for (let a = 0; a <= L; a += 2.5) {
        if (a > gapA && a < gapB) continue;
        const px = ax ? x0 + a : x0, pz = ax ? z0 : z0 + a;
        fm(px - 0.1, 0, pz - 0.1, px + 0.15, 3, pz + 0.15, B.STEEL);
      }
      // malla: celdas invisibles (no se puede atravesar) y decorado de rombos
      for (let a = 0; a < L; a += 0.25) {
        if (a > gapA && a < gapB) continue;
        const px = ax ? x0 + a : x0, pz = ax ? z0 : z0 + a;
        fm(px, 0, pz, px + 0.25, 3, pz + 0.25, B.BARRIER);
      }
      const segs = gapA < 0 ? [[0, L]] : [[0, gapA], [gapB, L]];
      for (const [s0, s1] of segs) {
        const m = (s0 + s1) / 2, l = s1 - s0;
        const px = ax ? x0 + m : x0 + 0.12, pz = ax ? z0 + 0.12 : z0 + m;
        dec(px, 1.5, pz, ax ? l : 0.03, 2.9, ax ? 0.03 : l, 0.25, 0.27, 0.28, -0.5);
        dec(px, 3.1, pz, ax ? l : 0.25, 0.25, ax ? 0.25 : l, 0.15, 0.15, 0.17, -0.3);
      }
    };
    twall(E0x, E0z, 50, E0z); twall(62, E0z, E1x, E0z);   // norte (brecha en la alambrada del medio)
    fence(50, E0z, 62, E0z, 4, 8);
    twall(E0x, E0z, E0x, E1z);                              // oeste
    twall(E1x, E0z, E1x, 48); fence(E1x, 48, E1x, 62, 5, 9); twall(E1x, 62, E1x, E1z);   // este (brecha)
    twall(E0x, E1z, 50, E1z); twall(62, E1z, E1x, E1z);     // sur con la puerta principal (50..62)
    // puerta principal: barrera levadiza, garita y focos
    fm(50, 0, E1z - 0.4, 51, 1.1, E1z + 0.4, B.CONCRETE); fm(61, 0, E1z - 0.4, 62, 1.1, E1z + 0.4, B.CONCRETE);
    dec(56, 1.05, E1z, 10, 0.12, 0.12, 0.8, 0.1, 0.08, 0.15);
    for (let k = 0; k < 5; k++) dec(51.5 + k * 2, 1.05, E1z, 0.8, 0.13, 0.13, 0.9, 0.9, 0.85, 0.1);
    {
      const X = cm(63), Z = cm(E1z - 4);
      fc(X, 0, Z, X + 10, 11, Z + 10, B.OLIVE); fc(X + 1, 0, Z + 1, X + 9, 10, Z + 9, 0);
      fc(X, 4, Z + 2, X + 1, 8, Z + 8, B.GLASS); fc(X + 2, 4, Z, X + 8, 8, Z + 1, B.GLASS);
      fc(X + 9, 0, Z + 3, X + 10, 8, Z + 7, 0);
      fc(X - 1, 11, Z - 1, X + 11, 12, Z + 11, B.CONCRETE);
      light(64.25, 2.5, E1z - 2.75, 4, [0.6, 0.7, 0.5]);
      chestSpot(64.5, E1z - 2.5);
    }
    // fuera, al otro lado del muro: bosque y montañas (decorado)
    for (let k = 0; k < 140; k++) {
      const side = k % 4, t = hash(k, 1, 2), d = 3 + hash(k, 3, 4) * 22;
      let x, z;
      if (side === 0) { x = t * SX; z = E0z - d; } else if (side === 1) { x = t * SX; z = E1z + d; }
      else if (side === 2) { x = E0x - d; z = t * SZ; } else { x = E1x + d; z = t * SZ; }
      const h = 7 + hash(k, 5, 6) * 9, g = 0.05 + hash(k, 7, 8) * 0.03;
      dec(x, 0.8, z, 0.4, 1.6, 0.4, 0.1, 0.07, 0.05);
      for (let j = 0; j < 4; j++) { const w = (4 - j) * 0.9 + 0.6; dec(x, 1.6 + j * h / 5 + h / 10, z, w, h / 5, w, g * 0.7, g * 1.3, g * 0.8); }
    }
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; dec(56 + Math.cos(a) * 140, 18, 48 + Math.sin(a) * 120, 90, 36 + hash(k, 1, 1) * 20, 30, 0.035, 0.045, 0.05, 0, a + Math.PI / 2); }

    // 3) torres de vigilancia (base maciza de 3 m con escalera; arriba sacos terreros y foco)
    const tower = (x, z, sz) => {
      const X = cm(x), Z = cm(z), HT = 12;
      fc(X - 6, 0, Z - 6, X + 6, HT, Z + 6, B.CONCRETE);
      fc(X - 6, HT - 1, Z - 6, X + 6, HT, Z + 6, B.PLANK);
      const zs = sz > 0 ? 5 : -6;   // lado por el que llega la escalera
      for (let a = -6; a < 6; a++) for (const [dx, dz] of [[a, -6], [a, 5], [-6, a], [5, a]]) {
        if (dz === zs && dx === a && a >= -2 && a < 2) continue;
        setc(X + dx, HT, Z + dz, B.SANDBAG); setc(X + dx, HT + 1, Z + dz, B.SANDBAG);
      }
      // escalera: 5 escalones de 0,5 m hacia dentro de la base
      for (let k = 0; k < 5; k++) for (let d = 0; d < 3; d++) {
        const hh = HT - 2 - k * 2, zz = sz > 0 ? Z + 6 + k * 3 + d : Z - 7 - k * 3 - d;
        fc(X - 2, 0, zz, X + 2, hh, zz + 1, B.CONCRETE);
      }
      for (const [dx, dz] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) fc(X + dx, HT, Z + dz, X + dx + 1, HT + 10, Z + dz + 1, B.STEEL);
      dec(x, 5.6, z, 3.4, 0.25, 3.4, 0.2, 0.22, 0.14);   // tejadillo
      dec(x + 0.8, 5.25, z + 0.8, 0.5, 0.4, 0.5, 1, 0.95, 0.8, 1);
      light(x + 0.8, 4.9, z + 0.8, 20, [1.1, 1.05, 0.9]);
      chestSpot(x - 0.7, z - 0.7);
    };
    tower(14, 14, 1); tower(98, 14, 1); tower(14, 82, -1); tower(98, 82, -1);

    // 4) hangar (noroeste): nave abierta al sur con un camión dentro
    {
      const x0 = 16, z0 = 16, x1 = 42, z1 = 36, X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1);
      gm(x0, z0, x1, z1, G.CONC);
      for (let y = 0; y < H; y++) {
        for (let x = X0; x < X1; x++) { setc(x, y, Z0, B.OLIVE); setc(x, y, Z0 + 1, B.OLIVE); }
        for (let z = Z0; z < Z1; z++) { for (const x of [X0, X0 + 1, X1 - 2, X1 - 1]) setc(x, y, z, (z % 16 < 2) ? B.CONCRETE : B.OLIVE); }
        for (let x = X0; x < X1; x++) {
          const a = x - X0, open = a > 14 && a < X1 - X0 - 14;
          if (!open || y >= 28) { setc(x, y, Z1 - 1, B.OLIVE); setc(x, y, Z1 - 2, B.OLIVE); }
          if (!open && y >= 4 && y < 10 && a % 6 < 4 && a > 3 && a < X1 - X0 - 3) setc(x, y, Z1 - 1, B.GLASS);
        }
      }
      // puerta corredera abierta a un lado y nombre pintado
      dec(x0 + 4, 3.5, z1 + 0.2, 7, 7, 0.15, 0.2, 0.23, 0.15);
      dec((x0 + x1) / 2, 7.6, z1 + 0.06, 6, 0.6, 0.05, 0.75, 0.72, 0.6, 0.15);
      // tejado curvo (decorado) por encima de la rejilla
      for (let k = 0; k < 9; k++) { const t = (k + 0.5) / 9, y = 8.5 + Math.sin(t * Math.PI) * 3; dec((x0 + x1) / 2, y + 0.15, z0 + (z1 - z0) * t, x1 - x0 + 0.4, 0.3, (z1 - z0) / 9 + 0.05, 0.16, 0.18, 0.12); }
      for (const xx of [x0, x1]) dec(xx, 9.9, (z0 + z1) / 2, 0.3, 2.8, z1 - z0, 0.16, 0.18, 0.12);
      // dentro: camión, banco de trabajo, bidones, cajas y lámparas colgantes
      truck(22, 26, true);
      fm(36, 0, 17, 41, 1, 18, B.PLANK); fm(36, 1, 17, 41, 1.1, 18.2, B.STEEL);
      for (let k = 0; k < 4; k++) prop('barrel', 37 + k * 0.8, 20);
      prop('bigcrate', 33, 18); prop('bigcrate', 34.2, 18); prop('crate', 33.5, 19.4); prop('xbarrel', 39, 22);
      for (const [lx, lz] of [[24, 22], [34, 22], [24, 31], [34, 31]]) { dec(lx, 6.5, lz, 0.05, 3.5, 0.05, 0.1, 0.1, 0.1); dec(lx, 4.7, lz, 0.6, 0.15, 0.6, 1, 0.9, 0.7, 0.9); light(lx, 4.3, lz, 9, [0.75, 0.68, 0.5], hash(lx, lz, 1) < 0.4 ? { broken: true } : {}); }
      chestSpot(39.5, 33.5);
      r.merchantSpots.push({ x: wx(29), z: wz(33), name: 'el hangar' });
    }

    // 5) barracones (noreste): dos naves con literas y taquillas; se entra por la puerta o rompiendo las ventanas
    const barracks = (x0, z0) => {
      const x1 = x0 + 20, z1 = z0 + 7.5, X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1), HB = 14;
      gm(x0, z0, x1, z1, G.WOOD);
      for (let y = 0; y < HB; y++) {
        for (let x = X0; x < X1; x++) for (const z of [Z0, Z1 - 1]) {
          const a = x - X0, win = y >= 5 && y < 10 && a % 12 > 4 && a % 12 < 10;
          setc(x, y, z, win ? B.GLASS : y < 1 ? B.CONCRETE : B.OLIVE);
        }
        for (let z = Z0; z < Z1; z++) for (const x of [X0, X1 - 1]) setc(x, y, z, y < 1 ? B.CONCRETE : B.OLIVE);
      }
      // puerta abierta al oeste; al este, una persiana que se revienta
      for (let z = Z0 + 11; z < Z0 + 19; z++) for (let y = 0; y < 10; y++) { setc(X0, y, z, 0); setc(X1 - 1, y, z, B.SHUTTER); }
      // literas y taquillas
      for (let a = 2; a < 19; a += 3) {
        for (const zz of [z0 + 0.3, z1 - 1.3]) {
          fm(x0 + a, 0, zz, x0 + a + 2, 0.5, zz + 1, B.STEEL);
          fm(x0 + a, 0.5, zz, x0 + a + 2, 0.75, zz + 1, B.SOFA);
          fm(x0 + a, 1.5, zz, x0 + a + 2, 1.75, zz + 1, B.SOFA);
          fm(x0 + a, 0, zz, x0 + a + 0.25, 2, zz + 0.25, B.STEEL); fm(x0 + a + 1.75, 0, zz + 0.75, x0 + a + 2, 2, zz + 1, B.STEEL);
        }
      }
      fm(x0 + 0.3, 0, z0 + 5.4, x0 + 0.8, 2, z0 + 6.9, B.STEEL);
      dec((x0 + x1) / 2, 3.6, (z0 + z1) / 2, x1 - x0, 0.2, z1 - z0, 0.08, 0.08, 0.07);
      for (let k = 0; k < 4; k++) dec((x0 + x1) / 2, 3.9 + k * 0.35, (z0 + z1) / 2, x1 - x0 + 0.4, 0.35, z1 - z0 - k * 1.9, 0.15, 0.17, 0.12);   // tejado a dos aguas
      light(x0 + 6, 3, (z0 + z1) / 2, 7, [0.75, 0.7, 0.55], { broken: true }); light(x0 + 14, 3, (z0 + z1) / 2, 7, [0.75, 0.7, 0.55]);
      dec(x0 + 6, 3.45, (z0 + z1) / 2, 1.2, 0.06, 0.25, 1, 0.95, 0.8, 0.8); dec(x0 + 14, 3.45, (z0 + z1) / 2, 1.2, 0.06, 0.25, 1, 0.95, 0.8, 0.8);
      chestSpot(x0 + 10, (z0 + z1) / 2);
    };
    barracks(66, 15); barracks(66, 26);

    // 6) búnker de mando (centro-oeste): hormigón con entrada en codo protegida por sacos
    {
      const x0 = 14, z0 = 44, x1 = 26, z1 = 56, X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1), HB = 13;
      gm(x0, z0, x1, z1, G.TILE);
      for (let y = 0; y < HB; y++) for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
        const edge = x < X0 + 2 || x >= X1 - 2 || z < Z0 + 2 || z >= Z1 - 2;
        if (edge || y >= HB - 1) setc(x, y, z, B.CONCRETE);
      }
      for (let z = Z0 + 18; z < Z0 + 26; z++) for (let y = 0; y < 9; y++) for (const x of [X1 - 2, X1 - 1]) setc(x, y, z, 0);   // entrada al este
      fm(27, 0, 47.5, 27.5, 1.25, 54, B.SANDBAG); fm(27, 0, 54, 29.5, 1.25, 54.5, B.SANDBAG);
      // dentro: mesa con mapas, radio y pantallas
      fm(17, 0, 48, 22, 0.9, 51, B.PLANK); fm(17.5, 0.9, 48.5, 21.5, 0.95, 50.5, B.PANEL);
      fm(14.6, 0.8, 52, 15, 2, 55, B.STEEL); fm(14.55, 1.2, 52.5, 14.6, 1.8, 54.5, B.NEON_G);
      light(20, 2.6, 50, 7, [0.6, 0.9, 0.6]);
      // por encima: antena y radar (decorado)
      dec(20, 3.6, 50, x1 - x0, 0.4, z1 - z0, 0.2, 0.2, 0.21);
      dec(17, 7, 47, 0.15, 7, 0.15, 0.2, 0.2, 0.22); dec(17, 10.6, 47, 0.3, 0.3, 0.3, 1, 0.1, 0.05, 1);
      dec(23, 5.5, 53, 0.4, 3, 0.4, 0.25, 0.25, 0.27); dec(23, 7.5, 53, 3.2, 1.6, 0.25, 0.4, 0.4, 0.42, 0, 0.6);
      chestSpot(16, 54.5);
      r.merchantSpots.push({ x: wx(29), z: wz(51), name: 'la entrada del búnker' });
    }

    // 7) helipuerto (suroeste) con un helicóptero estrellado ardiendo
    {
      const cx = 24, cz = 72;
      gm(cx - 9, cz - 9, cx + 9, cz + 9, G.PAD);
      for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; dec(cx + Math.cos(a) * 7.5, 0.006, cz + Math.sin(a) * 7.5, 0.5, 0.012, 0.5, 0.75, 0.7, 0.2); }
      dec(cx - 1.6, 0.006, cz, 0.5, 0.012, 4, 0.8, 0.8, 0.78); dec(cx + 1.6, 0.006, cz, 0.5, 0.012, 4, 0.8, 0.8, 0.78); dec(cx, 0.006, cz, 2.7, 0.012, 0.5, 0.8, 0.8, 0.78);
      // fuselaje volcado sobre un costado
      const X = cm(cx + 3), Z = cm(cz - 2);
      for (let u = 0; u < 22; u++) for (let v = 0; v < 9; v++) for (let y = 0; y < 8; y++) {
        const nose = u < 5 ? (5 - u) : 0;
        if (v < nose * 0.4 || v > 8 - nose * 0.4 || y > 7 - nose * 0.6) continue;
        let t = B.OLIVE;
        if (u < 6 && y > 3) t = B.GLASS;
        if ((u + v) % 7 === 0 && u > 8) t = B.CHAR;
        setc(X + u, y, Z + v, t);
      }
      for (let u = 22; u < 46; u++) { const hh = 3 - Math.floor((u - 22) / 10); fc(X + u, Math.max(0, 3 - hh), Z + 3, X + u + 1, 4, Z + 6, B.OLIVE); }
      fc(X + 44, 0, Z + 1, X + 46, 7, Z + 2, B.OLIVE);
      // palas del rotor partidas (decorado)
      dec(cx + 5, 2.1, cz - 1, 7, 0.06, 0.35, 0.1, 0.1, 0.1, 0, 0.4); dec(cx + 2, 0.2, cz + 4, 5, 0.06, 0.35, 0.1, 0.1, 0.1, 0, 2.1);
      r.features.push({ kind: 'flame', x: wx(cx + 7), y: 1.4, z: wz(cz) }); light(cx + 7, 2, cz, 10, [1.3, 0.55, 0.15], { flick: true });
      chestSpot(cx - 5, cz + 5);
    }

    // 8) parque de vehículos (sureste): tanque, jeeps, depósitos de combustible y contenedores
    const container = (x, z, alongX, t, level = 0, open = false) => {
      const L = 24, Wd = 10, Hc = 10, X = cm(x), Z = cm(z), y0 = level * Hc;
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = y0; y < y0 + Hc && y < H; y++) {
        const shell = u === 0 || u === L - 1 || v === 0 || v === Wd - 1 || y === y0 || y === y0 + Hc - 1;
        if (!shell) continue;
        if (open && u === L - 1 && y > y0 && y < y0 + Hc - 1 && v > 0 && v < Wd - 1) continue;   // puertas abiertas
        const px = alongX ? X + u : X + v, pz = alongX ? Z + v : Z + u;
        setc(px, y, pz, (u === 0 || u === L - 1) && (v === 0 || v === Wd - 1) ? B.STEEL : t);
      }
    };
    container(70, 70, true, B.CONT_G); container(70, 70, true, B.CONT_B, 1); container(70, 73, true, B.CONT_R, 0, true);
    container(86, 76, false, B.CONT_O); container(89, 76, false, B.CONT_G); container(89, 76, false, B.CONT_R, 1);
    chestSpot(75, 73.7);
    tank(84, 60);
    jeep(66, 78, true); jeep(36, 60, false);
    for (const [x, z] of [[94, 66], [94, 72]]) {
      const X = cm(x), Z = cm(z), R = 9;
      for (let y = 0; y < 14; y++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dz * dz <= R * R && (y === 13 || dx * dx + dz * dz > (R - 1.5) ** 2)) setc(X + dx, y, Z + dz, (y >> 2) % 2 ? B.CAR_W : B.STEEL);
      dec(x, 4.2, z, 1.8, 0.4, 1.8, 0.75, 0.1, 0.08, 0.2);
    }
    r.merchantSpots.push({ x: wx(80), z: wz(66), name: 'el parque de vehículos' });

    // 9) plaza de armas: mástil con bandera, nidos de sacos terreros, gaviones y focos
    {
      fm(55.8, 0, 52.8, 56.2, H * S, 53.2, B.STEEL);
      dec(56, 10, 53, 0.2, 3, 0.2, 0.3, 0.3, 0.32);
      dec(57.2, 10.6, 53, 2.4, 1.4, 0.05, 0.5, 0.1, 0.08, 0, 0.25);
      fm(54.5, 0, 51.5, 57.5, 0.5, 54.5, B.CONCRETE);
    }
    const nest = (x, z) => {
      const X = cm(x), Z = cm(z);
      for (let a = -7; a <= 7; a++) for (let y = 0; y < 5; y++) { setc(X + a, y, Z - 7, B.SANDBAG); if (a < 4) { setc(X - 7, y, Z + a, B.SANDBAG); setc(X + 7, y, Z + a, B.SANDBAG); } }
      dec(x, 1.4, z - 1.6, 0.18, 0.18, 1.6, 0.12, 0.12, 0.13);   // ametralladora
      dec(x, 1.1, z - 0.9, 0.1, 0.6, 0.1, 0.12, 0.12, 0.13);
    };
    nest(46, 48); nest(66, 58);
    const hesco = (x0, z0, n, alongX) => { for (let k = 0; k < n; k++) { const x = alongX ? x0 + k * 1.1 : x0, z = alongX ? z0 : z0 + k * 1.1; fm(x, 0, z, x + 1, 1.25, z + 1, B.DIRT); dec(x + 0.5, 0.63, z + 0.5, 1.04, 1.26, 1.04, 0.3, 0.3, 0.26, -0.2); } };
    hesco(32, 42, 6, true); hesco(80, 42, 5, false); hesco(44, 64, 4, true); hesco(60, 38, 4, true);
    const flood = (x, z) => {
      const X = cm(x), Z = cm(z);
      fc(X, 0, Z, X + 1, 26, Z + 1, B.STEEL); fc(X - 1, 0, Z - 1, X + 2, 2, Z + 2, B.CONCRETE);
      fc(X - 1, 26, Z - 1, X + 2, 27, Z + 2, B.LAMP);
      light(x, 6, z, 24, [1.6, 1.5, 1.3], { cell: r.idx(X, 26, Z) });
    };
    flood(38, 42); flood(76, 40); flood(40, 64); flood(76, 64); flood(56, 30); flood(56, 78);

    // 10) puntos de aparición: la puerta y las brechas de la alambrada
    for (const [x, z] of [[54, E1z - 1.5], [58, E1z - 1.5], [55, E0z + 1.5], [57, E0z + 1.5], [E1x - 1.5, 54], [E1x - 1.5, 56]]) r.spawns.push({ x: wx(x), z: wz(z), mouth: true });
    for (const [x, z] of [[20, 40], [92, 40], [50, 80], [86, 50]]) r.spawns.push({ x: wx(x), z: wz(z) });

    // máquinas de ventajas
    K.machine(43, 37.5, 'zp', 'coraza'); K.machine(66.5, 37.5, 'zp', 'manos'); K.machine(31, 63, 'xp', 'gatillo');
    K.machine(82, 52, 'xn', 'liebre'); K.machine(48, 66.5, 'zn', 'aliento');
    r.playerStart = { x: wx(56), z: wz(56) };

    // ---- vehículos ----
    function truck(x, z, alongX) {
      const X = cm(x), Z = cm(z), L = 30, Wd = 10;
      const P = (u, v, y, t) => setc(alongX ? X + u : X + v, y, alongX ? Z + v : Z + u, t);
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = 0; y < 13; y++) {
        const wheel = (u >= 3 && u < 7 || u >= 18 && u < 22 || u >= 23 && u < 27) && (v === 0 || v === Wd - 1) && y < 4;
        let t = 0;
        if (wheel) t = B.TIRE;
        else if (y === 0 || y === 1) t = B.TIRE;
        else if (u < 9) { if (y < 10) t = (y >= 6 && (u === 0 || v === 0 || v === Wd - 1) && u < 7) ? B.GLASS : B.OLIVE; if (y === 3 && u === 0 && (v === 1 || v === Wd - 2)) t = B.LAMP; }
        else if (y === 2) t = B.OLIVE;
        else if (u > 9 && (v === 0 || v === Wd - 1 || u === L - 1) && y < 6) t = B.PLANK;
        else if (u > 9 && y >= 6 && y < 12 && (v === 0 || v === Wd - 1 || u === L - 1 || y === 11)) t = B.CLOTH;   // lona
        if (t) P(u, v, y, t);
      }
    }
    function jeep(x, z, alongX) {
      const X = cm(x), Z = cm(z), L = 16, Wd = 7;
      const P = (u, v, y, t) => setc(alongX ? X + u : X + v, y, alongX ? Z + v : Z + u, t);
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = 0; y < 7; y++) {
        const wheel = (u >= 2 && u < 5 || u >= 11 && u < 14) && (v === 0 || v === Wd - 1) && y < 3;
        let t = 0;
        if (wheel) t = B.TIRE; else if (y === 0) t = B.TIRE;
        else if (y < 4) t = B.OLIVE;
        else if (y === 4 && u === 6) t = B.GLASS;
        else if (y < 6 && (u === 13 || u === 14) && v > 0 && v < Wd - 1) t = B.SOFA;
        else if (y === 6 && (u === 7 || u === 15) && (v === 0 || v === Wd - 1)) t = B.STEEL;
        if (t) P(u, v, y, t);
      }
    }
    function tank(x, z) {
      const X = cm(x), Z = cm(z), L = 28, Wd = 14;
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = 0; y < 6; y++) {
        let t = 0;
        const track = v < 3 || v >= Wd - 3;
        if (track && y < 4 && !(y === 3 && (u < 2 || u > L - 3))) t = (u % 2 === 0 && y < 3) ? B.TIRE : B.STEEL;
        else if (!track && y >= 1) t = y === 5 && (u < 3 || u > L - 3) ? 0 : B.OLIVE;
        else if (track && y >= 4) t = B.OLIVE;
        if (t) setc(X + u, y, Z + v, t);
      }
      // torreta y cañón
      for (let u = 8; u < 20; u++) for (let v = 3; v < 11; v++) for (let y = 6; y < 10; y++) {
        if ((u === 8 || u === 19) && (v === 3 || v === 10)) continue;
        setc(X + u, y, Z + v, B.OLIVE);
      }
      for (let u = 20; u < 40; u++) { setc(X + u, 8, Z + 6, B.STEEL); setc(X + u, 8, Z + 7, B.STEEL); setc(X + u, 7, Z + 6, B.STEEL); setc(X + u, 7, Z + 7, B.STEEL); }
      fc(X + 12, 10, Z + 5, X + 15, 11, Z + 8, B.STEEL);
    }
  }

  VX.MilitaryBase = { create() { const r = new BaseRoom(); r.build(); return r; }, G };
})();
