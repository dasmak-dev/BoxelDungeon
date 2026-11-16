// Mapa del modo Horda: Gasolinera en la carretera (104 × 88 m), de noche y con niebla.
// Una carretera comarcal cruza el mapa, cortada al oeste por un camión cisterna volcado que arde
// y al este por un choque múltiple. Al norte, la gasolinera: marquesina con dos islas de surtidores
// (explotan si les disparas, y en cadena), tienda 24 h con escaparates que se rompen, taller con un
// coche en el elevador y aseos detrás. Al sur, cuneta, quitamiedos, un coche patrulla con las luces
// encendidas y un cartel abandonado. Alrededor, bosque muerto. Las luces parpadean o están rotas.
(function () {
  const M = VX.M, B = VX.Blocks;
  const SX = 104, SZ = 88;
  const E0x = 8, E1x = 96, E0z = 8, E1z = 80;     // perímetro transitable
  const RZ0 = 60, RZ1 = 70;                         // la carretera (de oeste a este)
  const G = { DIRT: 0, CONC: 1, ASPH: 2, GRASS: 3, GRAVEL: 4, TILE: 5, OILY: 6 };

  class GasRoom extends VX.BigRoom {
    constructor() { super('Gasolinera', SX, SZ, 19, 10); this.damp = 0.3; this.city = true; }
    generate() { generate(this); }
    floorColor(gt, mx, mz, gx, gz, h, h2, o) {
      let r, g, b, mat = 0, wet = 0;
      switch (gt) {
        case G.DIRT: { const k = 0.6 + h * 0.3 + h2 * 0.15; r = 0.15 * k; g = 0.12 * k; b = 0.09 * k; wet = 1; break; }
        case G.GRAVEL: { const k = 0.6 + h * 0.4; r = 0.13 * k; g = 0.125 * k; b = 0.12 * k; break; }
        case G.GRASS: { const k = 0.55 + h * 0.4; r = 0.06 * k; g = 0.075 * k; b = 0.045 * k; break; }
        case G.CONC: { const k = 0.14 + h * 0.03 + (((mx >> 1) + (mz >> 1)) & 1) * 0.012; r = k; g = k * 0.98; b = k * 0.96; wet = 1; break; }
        case G.OILY: { const k = 0.08 + h * 0.03; r = k; g = k * 0.95; b = k * 0.9; wet = 1; mat = -0.3; break; }
        case G.ASPH: { const k = 0.055 + h * 0.012 + h2 * 0.01; r = k; g = k; b = k * 1.08; wet = 1; mat = -0.25; break; }
        case G.TILE: { const c = ((mx + mz) & 1) ? 0.3 : 0.24; r = c; g = c * 0.97; b = c * 0.92; mat = -0.15; break; }
        default: { r = g = b = 0.12; }
      }
      o[0] = r; o[1] = g; o[2] = b; o[3] = mat; o[4] = wet;
    }

    // ---- lo que pasa en el mapa ----
    // los surtidores revientan cuando les quedan pocos vóxeles (el fuego y las balas los rompen);
    // la explosión daña a los de al lado, así que estallan en cadena. Truenos lejanos de vez en cuando.
    updateMap(game, dt) {
      if (!this.oilsDone) { this.oilsDone = true; for (const o of this.oilSpots) game.addOil(o.x, o.z, o.r); }
      this.pumpT = (this.pumpT || 0) - dt;
      if (this.pumpT <= 0) {
        this.pumpT = 0.2;
        for (const p of this.pumps) {
          if (p.dead) continue;
          let n = 0;
          for (const i of p.cells) if (this.grid[i]) n++;
          if (n < p.cells.length * 0.8 && !p.leak) { p.leak = true; game.hud.toast('¡Un surtidor pierde gasolina!'); }
          if (p.leak && Math.random() < 0.6 && game.particles) game.particles.spawn(p.x, 0.6 + Math.random() * 0.6, p.z, M.rand(-0.6, 0.6), M.rand(1, 2.5), M.rand(-0.6, 0.6), 1, 0.6, 0.15, 0.05, 0.35, 1, 1);
          if (p.fuse != null) { p.fuse -= 0.2; p.leak = true; }
          if (n < p.cells.length * 0.62 || (p.fuse != null && p.fuse <= 0)) {
            p.dead = true;
            // en cadena: los surtidores cercanos se prenden y revientan en un momento
            for (const o of this.pumps) if (!o.dead && o !== p) { const d = Math.hypot(o.x - p.x, o.z - p.z); if (d < 12) o.fuse = Math.min(o.fuse == null ? 99 : o.fuse, 0.9 + d * 0.12 + Math.random() * 0.4); }
            if (VX.Coop.isClient) continue;
            game.explode({ x: p.x, y: 1, z: p.z, R: 3.4, dmg: 120, destr: 1.4, selfK: 1, weapon: 'surtidor' });
            if (game.addFire) { game.addFire(p.x, p.z, 1.7, 12); game.addFire(p.x + M.rand(-2, 2), p.z + M.rand(-2, 2), 1.1, 8); }
            if (game.addOil) game.addOil(p.x + M.rand(-1, 1), p.z + M.rand(-1, 1), 1.6);
            game.shake(0.6);
            game.hud.toast('¡BOOM! El surtidor ha volado por los aires');
          }
        }
      }
      this.thunderT = (this.thunderT == null ? 25 : this.thunderT) - dt;
      if (this.thunderT <= 0) { this.thunderT = 35 + Math.random() * 50; if (VX.Audio.thunder) VX.Audio.thunder(0.6); }
    }
  }

  function generate(r) {
    const K = VX.BigBuild(r);
    const { C, H, W, D, wx, wz, setc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash } = K;
    r.pumps = []; r.oilSpots = [];

    // 1) límite, suelo y carretera
    fc(0, 0, 0, W, H, D, B.BARRIER);
    fc(cm(E0x), 0, cm(E0z), cm(E1x), H, cm(E1z), 0);
    gm(E0x, E0z, E1x, E1z, (x, z) => (hash(x >> 2, z >> 2, 3) < 0.35 ? G.GRASS : G.DIRT));
    gm(20, 26, 86, RZ0, G.CONC);                    // explanada de la gasolinera
    gm(E0x, RZ0, E1x, RZ1, G.ASPH);                 // carretera
    gm(E0x, RZ1, E1x, RZ1 + 1.5, G.GRAVEL); gm(E0x, RZ0 - 1, 20, RZ0, G.GRAVEL); gm(86, RZ0 - 1, E1x, RZ0, G.GRAVEL);   // arcenes
    gm(10, 12, 32, 36, G.CONC);                     // taller
    gm(34, 10, 70, 28, G.TILE);                     // tienda
    gm(72, 12, 86, 26, G.CONC);                     // aseos
    for (const [x, z, rr] of [[44, 45, 2.2], [60, 45, 1.8], [24, 30, 2.6], [70, 34, 1.4]]) { gm(x - rr, z - rr, x + rr, z + rr, G.OILY); r.oilSpots.push({ x: wx(x), z: wz(z), r: rr * 0.7 }); }
    // marcas viales: líneas de borde blancas y la discontinua amarilla
    dec((E0x + E1x) / 2, 0.006, RZ0 + 0.3, E1x - E0x, 0.012, 0.15, 0.55, 0.55, 0.5);
    dec((E0x + E1x) / 2, 0.006, RZ1 - 0.3, E1x - E0x, 0.012, 0.15, 0.55, 0.55, 0.5);
    for (let x = E0x + 1; x < E1x - 2; x += 5) if (hash(x, 1, 1) > 0.15) dec(x + 1.5, 0.006, (RZ0 + RZ1) / 2, 3, 0.012, 0.15, 0.6, 0.48, 0.1);
    // la carretera sigue en la niebla (decorado) y el bosque muerto alrededor
    dec(-12, 0.004, (RZ0 + RZ1) / 2, 40, 0.01, RZ1 - RZ0, 0.05, 0.05, 0.055); dec(SX + 12, 0.004, (RZ0 + RZ1) / 2, 40, 0.01, RZ1 - RZ0, 0.05, 0.05, 0.055);
    for (let k = 0; k < 170; k++) {
      const side = k % 4, t = hash(k, 1, 2), d = 2 + hash(k, 3, 4) * 24;
      let x, z;
      if (side === 0) { x = t * SX; z = E0z - d; } else if (side === 1) { x = t * SX; z = E1z + d; }
      else if (side === 2) { x = E0x - d; z = t * SZ; } else { x = E1x + d; z = t * SZ; }
      if ((side === 2 || side === 3) && z > RZ0 - 2 && z < RZ1 + 2) continue;   // hueco de la carretera
      deadTree(x, z, 5 + hash(k, 5, 6) * 8, k);
    }
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; dec(52 + Math.cos(a) * 140, 16, 44 + Math.sin(a) * 120, 90, 32 + hash(k, 1, 1) * 18, 30, 0.025, 0.028, 0.032, 0, a + Math.PI / 2); }
    // árboles muertos dentro del mapa (al sur de la carretera y junto a la valla)
    for (const [x, z] of [[14, 76], [26, 77], [44, 75], [82, 77], [91, 74], [12, 46], [92, 30], [90, 14]]) deadTree(x, z, 5 + hash(x, z, 2) * 3, x * 7 + z, true);

    // 2) valla metálica del perímetro norte/este/oeste (con boquetes) y quitamiedos al sur
    const fence = (x0, z0, x1, z1, gaps) => {
      const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = ax ? x1 - x0 : z1 - z0;
      const inGap = (a) => gaps.some(([g0, g1]) => a > g0 && a < g1);
      for (let a = 0; a <= L; a += 2.5) { if (inGap(a)) continue; const px = ax ? x0 + a : x0, pz = ax ? z0 : z0 + a; fm(px - 0.1, 0, pz - 0.1, px + 0.15, 2.5, pz + 0.15, B.STEEL); }
      for (let a = 0; a < L; a += 0.25) { if (inGap(a)) continue; const px = ax ? x0 + a : x0, pz = ax ? z0 : z0 + a; fm(px, 0, pz, px + 0.25, 2.5, pz + 0.25, B.BARRIER); }
      let s0 = 0;
      for (const [g0, g1] of [...gaps, [L, L]]) {
        const l = g0 - s0, m = (s0 + g0) / 2;
        if (l > 0.3) { const px = ax ? x0 + m : x0 + 0.12, pz = ax ? z0 + 0.12 : z0 + m; dec(px, 1.25, pz, ax ? l : 0.03, 2.4, ax ? 0.03 : l, 0.16, 0.17, 0.17, -0.5); }
        s0 = g1;
      }
    };
    fence(E0x, E0z, E1x, E0z, [[40, 45], [70, 74]]);
    fence(E0x, E0z, E0x, RZ0 - 1, [[24, 28]]);
    fence(E1x, E0z, E1x, RZ0 - 1, [[18, 22]]);
    for (let x = E0x; x < E1x; x += 0.25) fm(x, 0, RZ1 + 1.6, x + 0.25, 0.9, RZ1 + 1.75, B.STEEL);   // quitamiedos
    for (let x = E0x + 1; x < E1x; x += 3) fm(x, 0, RZ1 + 1.5, x + 0.15, 0.7, RZ1 + 1.9, B.STEEL);
    for (const gx of [30, 31, 66, 67]) fm(gx, 0, RZ1 + 1.55, gx + 1, 0.9, RZ1 + 1.8, 0);   // tramos arrancados

    // 3) la marquesina con dos islas de surtidores
    {
      const x0 = 34, x1 = 70, z0 = 36, z1 = 54, y0 = 4.5;
      fm(x0, y0, z0, x1, y0 + 0.5, z1, B.CONCRETE);
      for (const x of [38, 52, 66]) for (const z of [40, 50]) fm(x - 0.25, 0, z - 0.25, x + 0.25, y0, z + 0.25, B.STEEL);
      // franja del borde: blanca con una raya roja (la mitad del rótulo, apagado)
      for (const [cx, cz, lx, lz] of [[(x0 + x1) / 2, z0 - 0.05, x1 - x0, 0.1], [(x0 + x1) / 2, z1 + 0.05, x1 - x0, 0.1], [x0 - 0.05, (z0 + z1) / 2, 0.1, z1 - z0], [x1 + 0.05, (z0 + z1) / 2, 0.1, z1 - z0]]) {
        dec(cx, y0 + 0.35, cz, lx, 0.7, lz, 0.42, 0.42, 0.4, 0.02);
        dec(cx, y0 + 0.25, cz, lx * 1.002 + (lz > 1 ? 0.01 : 0), 0.14, lz * 1.002 + (lx > 1 ? 0.01 : 0), 0.55, 0.05, 0.04, 0.25);
      }
      dec(52, y0 + 0.4, z1 + 0.12, 9, 0.5, 0.05, 0.6, 0.5, 0.1, 0.12);   // letrero sucio
      // lámparas en el techo: unas parpadean, otras están rotas
      let k = 0;
      for (const x of [41, 52, 63]) for (const z of [42, 48]) {
        const br = k === 1 || k === 4, fl = k === 2 || k === 5; k++;
        fm(x - 0.5, y0 - 0.06, z - 0.25, x + 0.5, y0, z + 0.25, br ? B.STEEL : B.PANEL);
        if (!br) light(x, y0 - 0.4, z, 13, [1.25, 1.32, 1.38], fl ? { broken: true } : {});
      }
      // islas: bordillo, surtidores y papeleras
      for (const z of [42, 48]) {
        fm(37, 0, z - 1, 67, 0.25, z + 1, B.CONCRETE);
        for (const x of [37, 67]) fm(x - 0.2, 0, z - 1, x + 0.2, 1, z + 1, B.JERSEY);
        for (const x of [42, 52, 62]) pump(x, z);
      }
      // tapas de los depósitos enterrados
      for (let i = 0; i < 4; i++) dec(46 + i * 4, 0.01, 57, 0.8, 0.02, 0.8, 0.2, 0.2, 0.22, -0.3);
      chestSpot(47, 45); chestSpot(57, 45);
      r.merchantSpots.push({ x: wx(52), z: wz(45), name: 'los surtidores' });
    }

    // 4) la tienda 24 h: escaparates (se rompen), estanterías, mostrador y neveras
    {
      const x0 = 34, x1 = 70, z0 = 10, z1 = 28, X0 = cm(x0), X1 = cm(x1), Z0 = cm(z0), Z1 = cm(z1), HS = 16;
      for (let y = 0; y < HS; y++) {
        for (let x = X0; x < X1; x++) for (const z of [Z0, Z1 - 1]) {
          const a = x - X0, front = z === Z1 - 1;
          let t = y < 2 ? B.CONCRETE : B.CBRICK;
          if (front && y >= 2 && y < 12 && a > 6 && a < X1 - X0 - 6 && a % 20 !== 0) t = B.GLASS;          // escaparate
          if (front && y < 12 && Math.abs(a - (X1 - X0) / 2) < 6) t = 0;                                  // puertas abiertas (rotas)
          if (!front && y < 10 && a > X1 - X0 - 18 && a < X1 - X0 - 12) t = 0;                              // puerta trasera
          setc(x, y, z, t);
        }
        for (let z = Z0; z < Z1; z++) for (const x of [X0, X1 - 1]) setc(x, y, z, y < 2 ? B.CONCRETE : B.CBRICK);
      }
      fc(X0, HS, Z0, X1, HS + 1, Z1, B.CONCRETE);
      // cristales reventados: algunos paneles ya no están
      for (const a of [9, 10, 11, 12, 13, 112, 113]) for (let y = 2; y < 12; y++) setc(X0 + a, y, Z1 - 1, 0);
      // dentro: góndolas con productos, mostrador con caja, neveras al fondo
      for (const gz of [15, 19]) for (const [ga, gb] of [[37, 47], [56, 66]]) {
        fm(ga, 0, gz, gb, 0.25, gz + 1, B.STEEL);
        fm(ga, 0.25, gz, gb, 1.5, gz + 1, B.PRODUCT);
        fm(ga, 1.5, gz + 0.4, gb, 1.75, gz + 0.6, B.STEEL);
      }
      fm(48, 0, 22, 54, 1.1, 23, B.PLANK); fm(48, 1.1, 22, 54, 1.2, 23, B.STEEL); fm(49, 1.2, 22.2, 50, 1.6, 22.8, B.PANEL);
      for (let x = 36; x < 68; x += 1) { fm(x, 0, 10.5, x + 1, 2.25, 11.25, (x & 3) === 0 ? B.STEEL : B.FRIDGE); }
      fm(35, 2.25, 10.5, 69, 2.5, 11.25, B.NEON_C);
      // tiradas por el suelo: cajas, latas (decorado) y sangre
      prop('crate', 44, 24); prop('crate', 61, 13.5); prop('barrel', 67, 26);
      for (let i = 0; i < 18; i++) dec(37 + hash(i, 2, 3) * 30, 0.04, 13 + hash(i, 4, 5) * 13, 0.18, 0.08, 0.12, 0.3 + hash(i, 6, 1) * 0.6, 0.2 + hash(i, 7, 1) * 0.5, 0.15, 0.1);
      dec(52, 0.012, 24.5, 3.4, 0.01, 1.6, 0.22, 0.02, 0.02, -0.4); dec(50.5, 0.012, 23.5, 1, 0.01, 2.2, 0.18, 0.015, 0.015, -0.4);
      // luces: una sana, una que parpadea y otra rota (el neón de las neveras da el resto)
      light(41, 3.4, 18, 10, [1.1, 1.2, 1.2]); light(52, 3.4, 18, 9, [0.75, 0.85, 0.85], { broken: true }); light(63, 3.4, 18, 7, [0.25, 0.65, 0.75]);
      for (const x of [41, 52]) dec(x, 3.92, 18, 1.2, 0.06, 0.25, 0.9, 0.95, 0.95, 0.7);
      // rótulo del tejado: «24H» con letras apagadas
      dec(52, 4.9, 28.1, 12, 1.4, 0.15, 0.08, 0.08, 0.09);
      for (let i = 0; i < 6; i++) { const on = i !== 2 && i !== 4; dec(47 + i * 2, 4.9, 28.2, 1.2, 0.9, 0.05, on ? 1 : 0.2, on ? 0.15 : 0.05, on ? 0.1 : 0.05, on ? 0.9 : 0); }
      light(52, 4.6, 29.5, 8, [0.8, 0.12, 0.08], { broken: true });
      chestSpot(52, 13); chestSpot(38, 24);
      r.merchantSpots.push({ x: wx(52), z: wz(20), name: 'la tienda' });
    }

    // 5) el taller: dos persianas (una reventada), un coche en el elevador, neumáticos y bidones
    {
      const x0 = 10, x1 = 32, z0 = 12, z1 = 36, X0 = cm(x0), X1 = cm(x1), Z0 = cm(z0), Z1 = cm(z1), HT = 18;
      for (let y = 0; y < HT; y++) {
        for (let z = Z0; z < Z1; z++) for (const x of [X0, X1 - 1]) {
          const a = z - Z0;
          let t = y < 2 ? B.CONCRETE : B.CBRICK;
          if (x === X1 - 1 && y < 13 && ((a >= 10 && a < 38) || (a >= 54 && a < 82))) t = a < 38 ? B.SHUTTER : (y < 9 ? 0 : B.SHUTTER);
          setc(x, y, z, t);
        }
        for (let x = X0; x < X1; x++) for (const z of [Z0, Z1 - 1]) setc(x, y, z, y < 2 ? B.CONCRETE : (y >= 7 && y < 11 && (x - X0) % 14 > 4 && (x - X0) % 14 < 10) ? B.GLASS : B.CBRICK);
      }
      fc(X0, HT, Z0, X1, HT + 1, Z1, B.CONCRETE);
      // elevador con un coche encima
      fm(15, 0, 26, 15.4, 1.6, 31, B.STEEL); fm(23, 0, 26, 23.4, 1.6, 31, B.STEEL);
      fm(15, 1.6, 26.5, 23.4, 1.75, 30.5, B.STEEL);
      car(15.5, 27, true, B.CAR_B, 1.75 * C);
      // banco de trabajo, estantería de neumáticos, bidones y aceite
      fm(11, 0, 13, 17, 0.9, 14, B.PLANK); fm(11, 0.9, 13, 17, 1, 14.2, B.STEEL);
      for (let i = 0; i < 3; i++) fm(20 + i * 1.2, 0, 12.5, 21 + i * 1.2, 1.75, 13.5, B.TIRE);
      prop('xbarrel', 28, 14); prop('xbarrel', 29, 15); prop('barrel', 11.5, 34); prop('barrel', 12.5, 34.5); prop('bigcrate', 28.5, 33.5);
      light(16, 4, 20, 8, [0.8, 0.7, 0.45], { broken: true }); light(24, 4, 30, 7, [0.8, 0.7, 0.45]);
      dec(21, 4.75, 34.6, 8, 1, 0.1, 0.1, 0.1, 0.1); dec(21, 4.75, 34.7, 6, 0.5, 0.05, 0.5, 0.42, 0.12, 0.08);   // rótulo «TALLER»
      chestSpot(13, 22);
      r.merchantSpots.push({ x: wx(20), z: wz(19), name: 'el taller' });
    }

    // 6) los aseos, detrás (alicatados, a oscuras) y un contenedor de basura
    {
      const x0 = 74, x1 = 86, z0 = 12, z1 = 24, X0 = cm(x0), X1 = cm(x1), Z0 = cm(z0), Z1 = cm(z1), HA = 12;
      for (let y = 0; y < HA; y++) {
        for (let x = X0; x < X1; x++) for (const z of [Z0, Z1 - 1]) setc(x, y, z, z === Z1 - 1 && y < 9 && ((x - X0 >= 8 && x - X0 < 12) || (x - X0 >= 36 && x - X0 < 40)) ? 0 : B.TILE);
        for (let z = Z0; z < Z1; z++) for (const x of [X0, X1 - 1]) setc(x, y, z, B.TILE);
        for (let z = Z0; z < Z1 - 8; z++) setc(X0 + 24, y, z, B.TILE);   // tabique
      }
      fc(X0, HA, Z0, X1, HA + 1, Z1, B.CONCRETE);
      fm(75, 0, 12.5, 76, 0.9, 13.5, B.TILE); fm(84, 0, 12.5, 85, 0.9, 13.5, B.TILE);
      dec(80, 0.012, 20, 2, 0.01, 1.2, 0.2, 0.02, 0.02, -0.4);
      light(77, 2.6, 16, 5, [0.55, 0.75, 0.55], { broken: true });
      // contenedor
      fm(88, 0, 20, 91, 1.5, 22, B.CONT_G); fm(88, 1.5, 20, 91, 1.6, 22, B.STEEL);
      chestSpot(83, 17);
    }

    // 7) el poste con el cartel de precios, junto a la carretera (rótulo medio fundido)
    {
      const x = 90, z = 54;
      fm(x - 0.3, 0, z - 0.3, x + 0.3, H / C - 0.3, z + 0.3, B.STEEL);
      dec(x, 8.5, z, 4.4, 3.4, 0.6, 0.12, 0.12, 0.13);
      dec(x, 9.6, z - 0.32, 4, 1, 0.05, 0.6, 0.06, 0.05, 0.55);
      dec(x, 9.6, z + 0.32, 4, 1, 0.05, 0.6, 0.06, 0.05, 0.55);
      for (let i = 0; i < 3; i++) { const on = i !== 1; for (const s of [-1, 1]) dec(x, 8.6 - i * 0.75, z + s * 0.32, 3.4, 0.55, 0.05, on ? 0.9 : 0.15, on ? 0.75 : 0.13, on ? 0.3 : 0.1, on ? 0.6 : 0); }
      light(x, 7.5, z - 1, 10, [0.9, 0.2, 0.12], { broken: true }); light(x, 7.5, z + 1, 9, [0.9, 0.75, 0.35]);
    }

    // 8) la carretera: cisterna volcada y ardiendo al oeste, choque múltiple al este, coches abandonados
    {
      // cisterna: cabina y cuba tumbadas, de través (dejan pasar por los carriles)
      const X = cm(13), Z = cm(RZ0 + 2.2);
      for (let u = 0; u < 34; u++) for (let v = 0; v < 12; v++) for (let y = 0; y < 10; y++) {
        const cx = v - 5.5, cy = y - 4.5;
        if (u >= 8 && cx * cx + cy * cy > 30) continue;
        let t = u < 8 ? (y > 6 ? B.GLASS : B.CAR_W) : ((u + y) % 9 === 0 ? B.CHAR : B.CAR_W);
        if (u < 8 && y > 8) continue;
        if (u >= 8 && (u % 13 === 0)) t = B.STEEL;
        if (hash(u, v, y) < 0.18) t = B.CHAR;
        setc(X + v, y, Z + u, t);
      }
      r.features.push({ kind: 'flame', x: wx(16), y: 1.6, z: wz(RZ0 + 5) }); r.features.push({ kind: 'flame', x: wx(15), y: 2.4, z: wz(RZ0 + 7.5) });
      light(16, 2.5, RZ0 + 6, 16, [1.5, 0.6, 0.15], { flick: true });
      r.oilSpots.push({ x: wx(19), z: wz(RZ0 + 4), r: 2.2 });
      // choque al este: tres coches empotrados y barreras
      car(84, RZ0 + 1, false, B.CAR_R); car(87, RZ0 + 5, true, B.CHAR); car(89.5, RZ0 + 1.5, false, B.CAR_K);
      for (const z of [RZ0 + 1, RZ0 + 7.5]) fm(93, 0, z, 94, 0.9, z + 1.5, B.JERSEY);
      // coches abandonados en la carretera y en la gasolinera
      car(32, RZ0 + 1.5, true, B.CAR_Y); car(58, RZ0 + 6, true, B.CHAR, 0, true); car(46, 55, true, B.CAR_W);
      car(39, 38.5, true, B.CHAR, 0, true);   // uno quemado junto a un surtidor
      car(73, 39, false, B.CAR_R);              // empotrado contra la columna de la marquesina
      // coche patrulla en la cuneta con las luces puestas (parpadean)
      car(60, RZ1 + 3.5, true, B.CAR_K);
      dec(62.2, 1.75, RZ1 + 4.5, 0.4, 0.2, 0.4, 1, 0.1, 0.1, 1); dec(62.2, 1.75, RZ1 + 5.3, 0.4, 0.2, 0.4, 0.15, 0.3, 1, 1);
      light(62, 2.2, RZ1 + 4.4, 9, [1.4, 0.1, 0.08], { broken: true }); light(62, 2.2, RZ1 + 5.4, 9, [0.12, 0.3, 1.5], { broken: true });
      chestSpot(64, RZ1 + 5);
      // el cartel publicitario abandonado, al sur
      fm(30, 0, 76, 30.4, 5, 76.4, B.STEEL); fm(38, 0, 76, 38.4, 5, 76.4, B.STEEL);
      dec(34.2, 6, 76.2, 10, 3.2, 0.25, 0.25, 0.22, 0.2);
      dec(32, 6.4, 76.05, 4, 1.4, 0.05, 0.45, 0.12, 0.08); dec(36.5, 5.4, 76.05, 3, 0.9, 0.05, 0.6, 0.55, 0.4);
      // farolas de la carretera (casi todas fundidas)
      let n = 0;
      for (let x = 14; x < E1x; x += 18) {
        fm(x, 0, RZ0 - 1, x + 0.25, 7.5, RZ0 - 0.75, B.STEEL); dec(x + 0.6, 7.6, RZ0 - 0.6, 1.4, 0.15, 0.4, 0.15, 0.15, 0.16);
        const on = n % 3 === 1; n++;
        if (on) { dec(x + 1, 7.48, RZ0 - 0.6, 0.6, 0.06, 0.3, 1, 0.75, 0.45, 0.9); light(x + 1, 7, RZ0, 18, [1.7, 1.15, 0.55], n === 5 ? { broken: true } : {}); }
      }
    }

    // 9) más luz ambiente: cajas de suministros, sangre y basura por la explanada
    for (let i = 0; i < 14; i++) dec(22 + hash(i, 9, 1) * 62, 0.012, 30 + hash(i, 9, 2) * 28, 0.6 + hash(i, 1, 3) * 1.6, 0.01, 0.5 + hash(i, 2, 3) * 1.4, 0.16, 0.012, 0.012, -0.4);
    prop('crate', 30, 52); prop('crate', 30.8, 53); prop('xbarrel', 78, 44); prop('barrel', 22, 40); prop('barrel', 22.6, 41);
    chestSpot(24, 50); chestSpot(80, 34); chestSpot(15, 74);

    // 10) puntos de aparición: los dos extremos de la carretera y los boquetes de la valla
    for (const [x, z] of [[E0x + 1.5, RZ0 + 1.5], [E0x + 1.5, RZ1 - 1.5], [E1x - 1.5, RZ0 + 3.5], [E1x - 1.5, RZ1 - 1.2], [E0x + 42.5, E0z + 1.2], [E0x + 72, E0z + 1.2], [E0x + 1.2, E0z + 26], [E1x - 1.2, E0z + 20]]) r.spawns.push({ x: wx(x), z: wz(z), mouth: true });
    for (const [x, z] of [[20, 76], [76, 77], [12, 52], [92, 44]]) r.spawns.push({ x: wx(x), z: wz(z) });

    // máquinas de ventajas
    K.machine(31.5, 38, 'xp', 'coraza'); K.machine(72.5, 31, 'zp', 'manos'); K.machine(88, 40, 'xn', 'gatillo');
    K.machine(15, 44, 'xp', 'liebre'); K.machine(45, 29.2, 'zp', 'aliento');
    r.playerStart = { x: wx(47), z: wz(45) };

    // ---- piezas ----
    // surtidor: cuerpo rojo, pantalla, tapa clara, manguera; se registra para explotar
    function pump(x, z) {
      const X = cm(x), Z = cm(z) - 2, cells = [];
      for (let u = -2; u < 2; u++) for (let v = 0; v < 4; v++) for (let y = 1; y < 8; y++) {
        let t = B.CAR_R;
        if (y >= 4 && y <= 5 && (v === 0 || v === 3)) t = B.PANEL;
        if (y === 7) t = B.CAR_W;
        if (y <= 2 && (u === -2 || u === 1)) t = B.STEEL;
        setc(X + u, y, Z + v, t);
        cells.push(r.idx(X + u, y, Z + v));
      }
      dec(x + 0.62, 0.9, z, 0.08, 0.9, 0.08, 0.06, 0.06, 0.06);   // manguera
      dec(x + 0.62, 1.25, z, 0.14, 0.12, 0.3, 0.12, 0.12, 0.13);
      r.pumps.push({ x: wx(x), z: wz(z), cells, dead: false });
    }
    // turismo: carrocería, cristales y ruedas (quemado: chapa negra sin cristales)
    function car(x, z, alongX, col, base = 0, burnt = false) {
      const X = cm(x), Z = cm(z), L = 17, Wd = 8, y0 = base | 0;
      const P = (u, v, y, t) => setc(alongX ? X + u : X + v, y0 + y, alongX ? Z + v : Z + u, t);
      const charred = col === B.CHAR || burnt;
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = 0; y < 6; y++) {
        const wheel = (u >= 2 && u < 5 || u >= 12 && u < 15) && (v === 0 || v === Wd - 1) && y < 2;
        let t = 0;
        if (wheel) t = B.TIRE;
        else if (y >= 1 && y < 3) t = col;
        else if (y >= 3 && u >= 4 && u < 13) {
          const shell = v === 0 || v === Wd - 1 || u === 4 || u === 12 || y === 5;
          if (shell) t = y === 5 ? col : (charred ? (hash(u, v, y) < 0.5 ? B.CHAR : 0) : B.GLASS);
        }
        if (t && charred && t !== B.TIRE && hash(u + X, v + Z, y) < 0.25) t = B.CHAR;
        if (t) P(u, v, y, t);
      }
      if (charred) { const cx = alongX ? x + 2.1 : x + 1, cz = alongX ? z + 1 : z + 2.1; dec(cx, 0.012, cz, 5, 0.01, 3, 0.05, 0.045, 0.04, -0.3); }
    }
    // árbol muerto: tronco y ramas desnudas (decorado o, dentro del mapa, de bloques)
    function deadTree(x, z, h, seed, solid) {
      const g = 0.05 + hash(seed, 2, 2) * 0.03;
      if (solid) fm(x - 0.25, 0, z - 0.25, x + 0.25, h * 0.7, z + 0.25, B.DEADWOOD);
      else dec(x, h * 0.35, z, 0.4, h * 0.7, 0.4, g * 1.3, g * 1.15, g);
      for (let j = 0; j < 4; j++) {
        const a = hash(seed, j, 7) * Math.PI * 2, L = 1.2 + hash(seed, j, 9) * 2, y = h * (0.45 + j * 0.13);
        dec(x + Math.cos(a) * L * 0.45, y, z + Math.sin(a) * L * 0.45, L, 0.18, 0.18, g * 1.2, g * 1.1, g, 0, a);
      }
    }
  }

  VX.GasStation = { create() { const r = new GasRoom(); r.build(); return r; }, G };
})();
