// Mapa del modo Horda: el Coliseo (104 × 80 m), al anochecer.
// Empiezas en el centro de la arena. Alrededor: el podio de 4 m con su paseo, al que
// se sube por cuatro escalinatas; detrás, las gradas en escalones (se puede correr por
// ellas) y el palco imperial. En la arena: un estrado con obelisco, ruinas de un templo
// elevadas, galería de tiro con arco con dianas, muñecos de entrenamiento, jaulas,
// empalizadas, braseros y armeros. Los zombis salen por las cuatro puertas y por las
// trampillas del hipogeo. Por encima del muro, las gradas altas y el ático (decorado).
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const SX = 104, SZ = 80;
  const CXm = SX / 2, CZm = SZ / 2;      // centro de la arena (metros locales)
  const A = 36, Bz = 22;                 // semiejes de la arena
  const PODIUM = 4, STEPS = 8, STEP_D = 0.75, WALL = 10;   // podio, gradas y muro
  const G = { SAND: 0, STONEF: 1, BLOOD: 2 };

  // desplazamiento elíptico: el punto (x, z) está sobre la elipse (A + o, Bz + o)
  const off = (x, z) => {
    let lo = -40, hi = 60;
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2, a = Math.max(0.05, A + m), b = Math.max(0.05, Bz + m);
      if ((x / a) ** 2 + (z / b) ** 2 > 1) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  };
  // punto y tangente de la elipse desplazada, para colocar cosas alrededor
  const ell = (o, th) => {
    const a = A + o, b = Bz + o;
    const x = Math.cos(th) * a, z = Math.sin(th) * b;
    const tx = -Math.sin(th) * a, tz = Math.cos(th) * b, l = Math.hypot(tx, tz);
    return { x: CXm + x, z: CZm + z, tx: tx / l, tz: tz / l, nx: tz / l, nz: -tx / l };   // n: hacia fuera
  };

  class ColiseumRoom extends VX.BigRoom {
    constructor() {
      super('Coliseo', SX, SZ, 17, 7);
      this.coliseum = true;
    }
    generate() { generate(this); }
    floorColor(gt, mx, mz, gx, gz, h, h2, o) {
      let r, g, b;
      if (gt === G.SAND) { const k = 0.8 + h * 0.2 + h2 * 0.12; r = 0.34 * k; g = 0.27 * k; b = 0.17 * k; }
      else if (gt === G.BLOOD) { const k = 0.8 + h * 0.2; r = 0.2 * k; g = 0.06 * k; b = 0.04 * k; }
      else { const k = 0.7 + h * 0.3; r = 0.26 * k; g = 0.23 * k; b = 0.19 * k; }
      o[0] = r; o[1] = g; o[2] = b; o[3] = 0; o[4] = 0;
    }
  }

  function generate(r) {
    const K = VX.BigBuild(r);
    const { C, H, wx, wz, setc, getc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash } = K;

    // ---- puertas: túneles en los extremos de los ejes ----
    const GATES = [
      { ax: 'x', s: 1, w: 5 }, { ax: 'x', s: -1, w: 5 },
      { ax: 'z', s: 1, w: 4 }, { ax: 'z', s: -1, w: 4 },
    ];
    const inGate = (rx, rz, o) => {
      if (o < -0.5) return null;
      for (const g of GATES) {
        if (g.ax === 'x' && Math.sign(rx) === g.s && Math.abs(rz) < g.w / 2) return g;
        if (g.ax === 'z' && Math.sign(rz) === g.s && Math.abs(rx) < g.w / 2) return g;
      }
      return null;
    };
    const topAt = (o) => {
      if (o < 0) return 0;
      if (o < PODIUM) return 16;
      if (o < WALL) return Math.min(24, 16 + Math.ceil((o - PODIUM + 0.001) / STEP_D));   // gradas bajas: el muro de atrás (2,5 m) no se puede escalar
      return H;
    };

    // 1) la estructura: arena, podio, gradas, muro y límite
    for (let cz = 0; cz < r.D; cz++)
      for (let cx = 0; cx < r.W; cx++) {
        const rx = (cx + 0.5) / C - CXm, rz = (cz + 0.5) / C - CZm;
        const o = off(rx, rz);
        const mi = Math.floor(cz / C) * SX + Math.floor(cx / C);
        if (o < 0) { r.gmap[mi] = G.SAND; continue; }
        const gate = inGate(rx, rz, o);
        if (o >= WALL + 1 && !(gate && o < WALL + 3)) { fc(cx, 0, cz, cx + 1, H, cz + 1, B.BARRIER); continue; }
        const top = topAt(o);
        if (gate) {
          r.gmap[mi] = G.STONEF;
          if (o >= WALL + 2.5) { fc(cx, 0, cz, cx + 1, H, cz + 1, B.BARRIER); continue; }
          fc(cx, 14, cz, cx + 1, Math.max(top, 16), cz + 1, B.TRAV);
          continue;
        }
        for (let y = 0; y < top; y++) {
          let t = B.STONE;
          if (o < 0.26) t = y < 2 ? B.TRAV : y >= 14 ? B.TRAV : (y >= 3 && y < 13 ? B.FRESCO : B.MARBLE);   // cara del podio
          else if (o >= PODIUM && y === top - 1) t = B.TRAV;          // asientos
          else if (o < PODIUM && y === top - 1) t = B.TRAV;           // paseo del podio
          else if (o >= WALL) t = B.TRAV;
          setc(cx, y, cz, t);
        }
        // pretil del podio con huecos para saltar a la arena
        if (o < 0.3) {
          const th = Math.atan2(rz / Bz, rx / A), seg = Math.floor(((th + Math.PI) / (Math.PI * 2)) * 48);
          if (seg % 4 !== 0) { setc(cx, 16, cz, B.TRAV); setc(cx, 17, cz, B.TRAV); }
        }
      }

    // 2) escalinatas de la arena al podio (en los lados largos)
    const stairs = (xa, xb, side) => {
      // sube hacia |x| menor; banda de 3 m pegada al muro
      for (let cx = cm(CXm + xa); cx < cm(CXm + xb); cx++) {
        const rx = (cx + 0.5) / C - CXm;
        const zw = Bz * Math.sqrt(Math.max(0, 1 - (rx / A) ** 2));
        const far = Math.max(Math.abs(xa), Math.abs(xb)), h = Math.min(16, 1 + Math.floor((far - Math.abs(rx)) * 2));
        for (let cz = cm(CZm + side * (zw - 3.2)); side > 0 ? cz < cm(CZm + side * zw) + 1 : cz > cm(CZm + side * zw) - 2; cz += side) {
          const rz = (cz + 0.5) / C - CZm;
          if (off(rx, rz) >= 0) continue;
          for (let y = 0; y < h; y++) setc(cx, y, cz, y === h - 1 ? B.TRAV : B.STONE);
        }
      }
    };
    stairs(-21, -12.5, -1); stairs(12.5, 21, -1); stairs(-21, -12.5, 1); stairs(12.5, 21, 1);

    // 3) palco imperial (norte) y tribuna de los jueces (sur)
    const box = (side, half, height) => {
      for (let cz = 0; cz < r.D; cz++) for (let cx = cm(CXm - half - 2.5); cx < cm(CXm + half + 2.5); cx++) {
        const rx = (cx + 0.5) / C - CXm, rz = (cz + 0.5) / C - CZm;
        if (Math.sign(rz) !== side) continue;
        const o = off(rx, rz);
        if (o < 0 || o >= 9) continue;
        const ax = Math.abs(rx);
        let h = height;
        if (ax >= half) h = Math.max(topAt(o), height - 2 * Math.ceil((ax - half) / 0.6));   // escalones laterales
        if (h <= topAt(o) && ax >= half) continue;
        for (let y = 0; y < h; y++) setc(cx, y, cz, B.TRAV);
        if (o < 0.3 && ax < half) { setc(cx, h, cz, B.TRAV); if (Math.floor(ax * 2) % 3 === 0) setc(cx, h + 1, cz, B.GOLDB); }
      }
    };
    box(-1, 7, 24); box(1, 4, 20);
    {
      // columnas, tronos, toldo y estandartes del palco
      const pz = CZm - Bz - 4.5;
      for (const sx of [-6.5, 6.5]) for (const dz of [-3.5, 3]) {
        const X = cm(CXm + sx), Z = cm(pz + dz);
        fc(X - 1, 24, Z - 1, X + 1, H, Z + 1, B.MARBLE);
        dec(CXm + sx, 8.5 + 3, pz + dz, 0.5, 6, 0.5, 0.6, 0.57, 0.5);
      }
      dec(CXm, 14.6, pz - 0.2, 14.5, 0.3, 7.6, 0.45, 0.06, 0.06);   // toldo púrpura
      dec(CXm, 14.9, pz - 0.2, 15, 0.2, 8, 0.6, 0.48, 0.15, 0.2);
      for (const sx of [-1.4, 1.4]) {
        const X = cm(CXm + sx), Z = cm(pz + 1.5);
        fc(X - 2, 24, Z - 2, X + 2, 26, Z + 2, B.MARBLE);
        fc(X - 2, 26, Z + 1, X + 2, 30, Z + 2, B.GOLDB);
        fc(X - 2, 26, Z - 2, X - 1, 28, Z + 2, B.GOLDB); fc(X + 1, 26, Z - 2, X + 2, 28, Z + 2, B.GOLDB);
      }
      for (const sx of [-4.5, -1.5, 1.5, 4.5]) {
        // estandartes colgando sobre la cara del podio
        dec(CXm + sx, 2.9, CZm - Bz - 0.06 + (Math.abs(sx) > 3 ? 0.35 : 0.05), 1.2, 3.2, 0.06, 0.48, 0.05, 0.05);
        dec(CXm + sx, 4.45, CZm - Bz - 0.08 + (Math.abs(sx) > 3 ? 0.35 : 0.05), 1.35, 0.15, 0.08, 0.7, 0.55, 0.15, 0.3);
        dec(CXm + sx, 2.0, CZm - Bz - 0.07 + (Math.abs(sx) > 3 ? 0.35 : 0.05), 0.45, 0.45, 0.07, 0.7, 0.55, 0.15, 0.25);
      }
      r.merchantSpots.push({ x: wx(CXm + 3.5), z: wz(pz - 1), name: 'el palco imperial' });
      chestSpot(CXm - 4.5, pz - 1.5);
      r.merchantSpots.push({ x: wx(CXm), z: wz(CZm + Bz + 2.5), name: 'la tribuna de los jueces' });
    }

    // 4) en la arena
    // estrado central con obelisco (aquí empiezas)
    const disc = (cx, cz, rad, y0, y1, t) => {
      const X = cm(cx), Z = cm(cz), R2 = (rad * C) ** 2;
      for (let z = Math.floor(Z - rad * C); z <= Z + rad * C; z++) for (let x = Math.floor(X - rad * C); x <= X + rad * C; x++)
        if ((x + 0.5 - X) ** 2 + (z + 0.5 - Z) ** 2 <= R2) for (let y = y0; y < y1; y++) setc(x, y, z, t);
    };
    disc(CXm, CZm, 4.2, 0, 1, B.TRAV); disc(CXm, CZm, 3.4, 1, 2, B.TRAV);
    fm(CXm - 0.6, 0.5, CZm - 0.6, CXm + 0.6, 1, CZm + 0.6, B.TRAV);
    fm(CXm - 0.45, 1, CZm - 0.45, CXm + 0.45, 6.5, CZm + 0.45, B.MARBLE);
    fm(CXm - 0.3, 6.5, CZm - 0.3, CXm + 0.3, 7.25, CZm + 0.3, B.GOLDB);
    // ruinas de un templo elevadas (2,5 m) con escalinata y columnas rotas, a ambos lados
    const ruin = (x0, z0, x1, z1, stairSide) => {
      const X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1), HR = 10;
      for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) {
        const edge = x === X0 || x === X1 - 1 || z === Z0 || z === Z1 - 1;
        const broken = edge && hash(x, 3, z) < 0.12;
        for (let y = 0; y < (broken ? HR - 2 : HR); y++) setc(x, y, z, B.TRAV);
      }
      // escalinata: 5 escalones de 0,5 m
      for (let k = 0; k < 5; k++) for (let d = 0; d < 3; d++) {
        const hh = HR - 2 - k * 2;
        if (stairSide === 'xp') fc(X1 + k * 3 + d, 0, Z0 + 4, X1 + k * 3 + d + 1, hh, Z1 - 4, B.TRAV);
        else fc(X0 - 1 - k * 3 - d, 0, Z0 + 4, X0 - k * 3 - d, hh, Z1 - 4, B.TRAV);
      }
      // columnas (alguna entera, la mayoría rotas) y un trozo caído en la arena
      const cols = [[X0 + 2, Z0 + 2], [X1 - 4, Z0 + 2], [X0 + 2, Z1 - 4], [X1 - 4, Z1 - 4], [Math.round((X0 + X1) / 2) - 1, Z0 + 2], [Math.round((X0 + X1) / 2) - 1, Z1 - 4]];
      cols.forEach(([x, z], i) => {
        const ch = i === 0 ? 24 : 4 + Math.floor(hash(x, z, 1) * 14);
        for (let y = HR; y < Math.min(H, HR + ch); y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) setc(x + dx, y, z + dz, (y - HR) % 6 === 5 ? B.TRAV : B.MARBLE);
      });
      const fx = stairSide === 'xp' ? x0 - 2.5 : x1 + 2.5, fz = (z0 + z1) / 2 + 2;
      fm(fx - 0.5, 0, fz - 2.2, fx + 0.5, 1, fz + 2.2, B.TRAV);
      fm(fx - 0.5, 0, fz + 2.6, fx + 0.5, 1, fz + 3.6, B.TRAV);
      chestSpot((x0 + x1) / 2, (z0 + z1) / 2);
    };
    ruin(CXm - 27, CZm - 4, CXm - 19, CZm + 4, 'xp');
    // galería de tiro con arco al este: dianas sobre caballetes con fardos de paja
    const target = (x, z) => {
      const X = cm(x), Z = cm(z), cy = 7;
      fc(X - 1, 0, Z - 4, X + 2, 3, Z + 4, B.HAY);                       // fardos
      for (const dz of [-3, 3]) fc(X + 1, 0, Z + dz, X + 2, 11, Z + dz + 1, B.PLANK);   // caballete
      for (let z = -4; z <= 4; z++) for (let y = -4; y <= 4; y++) {
        const d = Math.hypot(z, y);
        if (d > 4.3) continue;
        const t = d < 1 ? B.TGT_Y : d < 2 ? B.TGT_R : d < 3 ? B.CAR_B : d < 3.6 ? B.CAR_K : B.TGT_W;
        setc(X, cy + y, Z + z, t);
      }
      // flechas clavadas (decorado)
      for (let k = 0; k < 3; k++) {
        const az = (hash(x, k, z) - 0.5) * 1.6, ay = (hash(k, x, z) - 0.5) * 1.6;
        dec(x - 0.25, (cy + 0.5) * S + ay, z + az, 0.5, 0.025, 0.025, 0.35, 0.25, 0.12);
        dec(x - 0.5, (cy + 0.5) * S + ay, z + az, 0.06, 0.08, 0.08, 0.8, 0.8, 0.75);
      }
    };
    for (const z of [-12, -6, 0, 6, 12]) target(CXm + 28.5, CZm + z);
    // línea de tiro: valla baja de madera con huecos, y soportes con arcos y carcajes
    for (let z = -14; z <= 14; z += 4) {
      fm(CXm + 14, 0, CZm + z - 1.6, CXm + 14.25, 1, CZm + z + 1.6, B.PLANK);
      fm(CXm + 13.9, 1, CZm + z - 1.5, CXm + 14.35, 1.12, CZm + z + 1.5, B.WOOD);
    }
    for (const z of [-15.5, 15.5]) {
      fm(CXm + 12.5, 0, CZm + z - 1, CXm + 12.75, 2, CZm + z + 1, B.PLANK);
      for (let k = -0.7; k <= 0.7; k += 0.35) dec(CXm + 12.85, 1.2, CZm + z + k, 0.04, 1.6, 0.06, 0.32, 0.2, 0.1);
    }
    // muñecos de entrenamiento (poste, brazos, cuerpo de saco y escudo)
    const dummy = (x, z) => {
      const X = cm(x), Z = cm(z);
      fc(X, 0, Z, X + 1, 7, Z + 1, B.WOOD);
      fc(X - 1, 3, Z - 1, X + 2, 6, Z + 2, B.SANDBAG);
      fc(X - 3, 5, Z, X + 4, 6, Z + 1, B.WOOD);
      fc(X, 7, Z, X + 1, 8, Z + 1, B.HAY);
      fc(X + 2, 3, Z - 2, X + 3, 6, Z + 2, B.TGT_R); setc(X + 2, 4, Z, B.GOLDB);
    };
    for (const [x, z] of [[-8, 12], [-4, 14], [4, 14], [8, 12]]) dummy(CXm + x, CZm + z);
    // armeros con lanzas y escudos junto al muro norte
    const rack = (x, z) => {
      const X = cm(x), Z = cm(z);
      fc(X, 0, Z, X + 1, 8, Z + 1, B.WOOD); fc(X + 7, 0, Z, X + 8, 8, Z + 1, B.WOOD);
      fc(X, 6, Z, X + 8, 7, Z + 1, B.WOOD); fc(X, 2, Z, X + 8, 3, Z + 1, B.WOOD);
      for (let k = 1; k < 7; k += 2) { fc(X + k, 1, Z - 1, X + k + 1, 9, Z, B.WOOD); setc(X + k, 9, Z - 1, B.STEEL); }
      for (const k of [2, 5]) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) setc(X + k + a, 4 + b, Z + 1, a === 0 && b === 0 ? B.GOLDB : B.TGT_R);
    };
    rack(CXm - 12, CZm - 15); rack(CXm + 4, CZm - 16.5);
    // jaulas de fieras con la puerta reventada
    const cage = (x, z) => {
      const X = cm(x), Z = cm(z), L = 9;
      for (let a = 0; a < L; a++) for (let y = 0; y < 11; y++) {
        const bar = a % 2 === 0 || y === 0 || y === 10;
        if (!bar) continue;
        setc(X + a, y, Z, B.IRON); setc(X + a, y, Z + L - 1, B.IRON); setc(X, y, Z + a, B.IRON);
        if (a < 3 || a > 6) setc(X + L - 1, y, Z + a, B.IRON);
      }
      fc(X, 10, Z, X + L, 11, Z + L, B.IRON);
      fc(X + 1, 0, Z + 1, X + L - 1, 1, Z + L - 1, B.HAY);
    };
    cage(CXm - 30, CZm + 9); cage(CXm - 31, CZm - 13);
    // empalizadas de estacas como cobertura
    const palisade = (x0, z0, x1, z1) => {
      const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n, X = cm(x), Z = cm(z);
        const hh = 6 + Math.floor(hash(X, Z, 2) * 3);
        for (let y = 0; y < hh; y++) setc(X, y, Z, y === hh - 1 ? B.DEADWOOD : B.WOOD);
      }
    };
    palisade(CXm - 12, CZm - 6, CXm - 9, CZm - 9); palisade(CXm + 9, CZm + 6, CXm + 12, CZm + 9);
    palisade(CXm + 6, CZm - 9, CXm + 10, CZm - 8); palisade(CXm - 10, CZm + 8, CXm - 6, CZm + 9);
    // carro de guerra volcado
    {
      const X = cm(CXm - 16), Z = cm(CZm + 3);
      fc(X, 0, Z, X + 8, 3, Z + 6, B.WOOD); fc(X, 3, Z, X + 2, 6, Z + 6, B.WOOD);
      for (let k = -4; k <= 4; k++) for (let j = -4; j <= 4; j++) { const d = Math.hypot(k, j); if (d > 3 && d < 4.4 || (k === 0 || j === 0) && d < 4) setc(X + 4 + k, 4 + j, Z - 1, B.WOOD); }
      fc(X + 8, 1, Z + 2, X + 14, 2, Z + 3, B.WOOD);
    }
    // braseros en trípode
    const brazier = (x, z) => {
      const X = cm(x), Z = cm(z);
      for (const [dx, dz] of [[-1, -1], [1, -1], [0, 1]]) fc(X + dx, 0, Z + dz, X + dx + 1, 4, Z + dz + 1, B.IRON);
      fc(X - 2, 4, Z - 2, X + 3, 5, Z + 3, B.IRON); fc(X - 1, 5, Z - 1, X + 2, 6, Z + 2, B.FIRE);
      r.features.push({ kind: 'flame', x: wx(x + 0.12), y: 1.5, z: wz(z + 0.12), small: true });
      light(x + 0.12, 2.2, z + 0.12, 11, [1.25, 0.6, 0.18], { flick: true, cell: r.idx(X, 5, Z) });
    };
    for (const [x, z] of [[-10, 0], [10, 0], [0, -12], [0, 12], [-22, -12], [22, 12], [20, -10], [-20, 13]]) brazier(CXm + x, CZm + z);
    // fardos de paja, cajas, barriles y manchas de sangre
    for (const [x, z] of [[-2, -7], [3, 8], [16, -4], [-14, -11], [18, 9], [-24, 8]]) fm(CXm + x, 0, CZm + z, CXm + x + 1, 0.5, CZm + z + 0.5, B.HAY);
    prop('crate', CXm + 24, CZm - 17); prop('crate', CXm + 24.8, CZm - 17); prop('barrel', CXm - 6, CZm - 17.5); prop('xbarrel', CXm + 17, CZm + 15);
    prop('barrel', CXm + 6.5, CZm + 16.5);
    for (let k = 0; k < 10; k++) {
      const x = CXm + (hash(k, 1, 2) - 0.5) * 50, z = CZm + (hash(k, 3, 4) - 0.5) * 28;
      if (off(x - CXm, z - CZm) < -1) gm(x - 1, z - 1, x + 1 + hash(k, 5, 6), z + 1, G.BLOOD);
    }
    // trampillas del hipogeo (también salen zombis por aquí)
    for (const [x, z] of [[-16, -6], [16, 5], [-6, 16], [7, -16]]) {
      dec(CXm + x, 0.01, CZm + z, 2, 0.02, 2, 0.16, 0.1, 0.05);
      for (let k = -0.75; k <= 0.75; k += 0.5) dec(CXm + x + k, 0.025, CZm + z, 0.06, 0.02, 1.9, 0.07, 0.07, 0.07);
      r.spawns.push({ x: wx(CXm + x), z: wz(CZm + z), trap: true });
    }

    // 5) puertas: rastrillo levantado, antorchas y puntos de aparición dentro del túnel
    for (const g of GATES) {
      const th = g.ax === 'x' ? (g.s > 0 ? 0 : Math.PI) : (g.s > 0 ? Math.PI / 2 : -Math.PI / 2);
      const p0 = ell(0, th);
      for (const d of [1.5, 4]) { const p = ell(d, th); r.spawns.push({ x: wx(p.x), z: wz(p.z), gate: true }); }
      // rastrillo de hierro subido (sólo se ven los pinchos asomando)
      for (let k = -g.w / 2 + 0.25; k < g.w / 2; k += 0.4) {
        const px = g.ax === 'x' ? p0.x + g.s * 0.3 : p0.x + k, pz = g.ax === 'x' ? p0.z + k : p0.z + g.s * 0.3;
        dec(px, 3.2, pz, 0.08, 0.6, 0.08, 0.07, 0.07, 0.075, -0.4);
      }
      for (const sgn of [-1, 1]) {
        const k = sgn * (g.w / 2 + 0.6);
        const px = g.ax === 'x' ? p0.x - g.s * 0.2 : p0.x + k, pz = g.ax === 'x' ? p0.z + k : p0.z - g.s * 0.2;
        dec(px, 2.6, pz, 0.15, 0.5, 0.15, 1, 0.55, 0.15, 1);
        light(px, 2.9, pz, 8, [1.2, 0.58, 0.16], { flick: true });
      }
      const pd = ell(6.5, th);
      light(pd.x, 2.4, pd.z, 6, [0.9, 0.45, 0.12], { flick: true });
      chestSpot(ell(8, th).x, ell(8, th).z);
    }

    // 6) estandartes y antorchas en la cara del podio
    for (let k = 0; k < 28; k++) {
      const th = (k + 0.5) / 28 * Math.PI * 2;
      const p = ell(-0.05, th), yaw = Math.atan2(-p.tz, p.tx);
      if (Math.abs(Math.cos(th)) > 0.97 || Math.abs(Math.sin(th)) > 0.985) continue;   // puertas
      if (k % 2 === 0) {
        dec(p.x, 2.7, p.z, 1.1, 2.6, 0.05, 0.42, 0.05, 0.05, 0, yaw);
        dec(p.x, 4.05, p.z, 1.25, 0.12, 0.07, 0.65, 0.5, 0.14, 0.25, yaw);
        dec(p.x, 2.2, p.z, 0.4, 0.4, 0.07, 0.65, 0.5, 0.14, 0.2, yaw);
      } else {
        const q = ell(-0.25, th);
        dec(q.x, 3.0, q.z, 0.12, 0.45, 0.12, 0.2, 0.12, 0.06);
        dec(q.x, 3.35, q.z, 0.18, 0.25, 0.18, 1, 0.55, 0.15, 1);
        if (k % 4 === 1) light(q.x, 3.5, q.z, 9, [1.15, 0.55, 0.15], { flick: true });
      }
    }
    // cofres en el paseo del podio
    chestSpot(ell(2, 0.6).x, ell(2, 0.6).z); chestSpot(ell(2, Math.PI + 0.6).x, ell(2, Math.PI + 0.6).z);
    r.merchantSpots.push({ x: wx(ell(2, Math.PI - 0.5).x), z: wz(ell(2, Math.PI - 0.5).z), name: 'el paseo del podio' });

    // 7) por encima del muro: gradas altas, ático con arcos, mástiles y antorchas (decorado)
    const ringBoxes = (o, y0, y1, col, seg = 2.6, e = 0) => {
      const per = 2 * Math.PI * Math.sqrt(((A + o) ** 2 + (Bz + o) ** 2) / 2), n = Math.ceil(per / seg);
      for (let k = 0; k < n; k++) {
        const th = (k + 0.5) / n * Math.PI * 2, p = ell(o, th);
        dec(p.x, (y0 + y1) / 2, p.z, per / n + 0.15, y1 - y0, 1.6, col[0], col[1], col[2], e, Math.atan2(-p.tz, p.tx));
      }
    };
    for (let k = 0; k < 9; k++) {
      const o = WALL + 0.9 + k * 1.5, top = 8.5 + (k + 1) * 1.3;
      const c = 0.2 + (k % 2) * 0.03;
      ringBoxes(o, top - 1.4, top, [c * 1.1, c * 0.95, c * 0.78]);
      if (k % 3 === 2) {
        // pasillos (vomitorios) oscuros cada pocos metros
        const per = 2 * Math.PI * Math.sqrt(((A + o) ** 2 + (Bz + o) ** 2) / 2), n = Math.ceil(per / 9);
        for (let j = 0; j < n; j++) { const th = (j + 0.3) / n * Math.PI * 2, p = ell(o - 0.85, th); dec(p.x, top - 0.9, p.z, 1.4, 1.6, 0.2, 0.02, 0.015, 0.015, 0, Math.atan2(-p.tz, p.tx)); }
      }
    }
    const atticO = WALL + 15, atticY = 8.5 + 10 * 1.3;
    ringBoxes(atticO, 0, atticY + 7, [0.24, 0.21, 0.17], 3.2);
    {
      const per = 2 * Math.PI * Math.sqrt(((A + atticO) ** 2 + (Bz + atticO) ** 2) / 2), n = Math.ceil(per / 4.5);
      for (let j = 0; j < n; j++) {
        const th = (j + 0.5) / n * Math.PI * 2, p = ell(atticO - 0.82, th), yaw = Math.atan2(-p.tz, p.tx);
        dec(p.x, atticY + 2.8, p.z, 1.6, 2.6, 0.08, 0.025, 0.018, 0.02, 0, yaw);            // arco
        dec(p.x, atticY + 4.25, p.z, 1.0, 0.4, 0.08, 0.025, 0.018, 0.02, 0, yaw);
        if (j % 3 === 0) {
          const m = ell(atticO - 1.2, th);
          dec(m.x, atticY + 9, m.z, 0.25, 6, 0.25, 0.18, 0.12, 0.07);                     // mástil del velario
          dec(m.x, atticY + 7.4, m.z, 0.3, 0.3, 0.3, 1, 0.55, 0.15, 1);                    // antorcha
        }
      }
    }
    // jirones del velario cruzando el cielo
    for (let j = 0; j < 10; j++) {
      const th = j / 10 * Math.PI * 2, p = ell(atticO - 2, th), q = ell(atticO - 9, th + 0.1);
      const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2, len = Math.hypot(p.x - q.x, p.z - q.z);
      dec(mx, atticY + 7, mz, len, 0.05, 2.2, 0.32, 0.22, 0.14, 0, Math.atan2(-(q.z - p.z), q.x - p.x));
    }

    // máquinas de ventajas junto al muro de la arena
    K.machine(CXm - 30, CZm - 8, 'xp', 'coraza'); K.machine(CXm + 30, CZm + 8, 'xn', 'manos'); K.machine(CXm - 8, CZm + 18, 'zn', 'gatillo');
    K.machine(CXm + 8, CZm - 18.5, 'zp', 'liebre'); K.machine(CXm + 18, CZm - 12, 'xn', 'aliento');
    r.playerStart = { x: wx(CXm), z: wz(CZm + 6) };
  }

  VX.Coliseum = {
    create() { const r = new ColiseumRoom(); r.build(); return r; },
    G,
  };
})();
