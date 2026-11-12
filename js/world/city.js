// Mapa del modo Horda: Ciudad nocturna (120 × 120 m).
// Una gran plaza central (fuente con estatua, árboles, bancos, templete y quiosco)
// rodeada de cuatro manzanas con tiendas y vestíbulos en los que se entra rompiendo
// escaparates, persianas o paredes. Una ronda de circunvalación con pocos coches,
// un autobús abierto por dentro y barricadas en las cuatro salidas.
// Las plantas altas son decorado: fachadas con estilos (ladrillo con escaleras de
// incendios, piedra, oficinas de cristal, bloques con balcones) y ventanas con el piso
// de dentro dibujado en el shader.
(function () {
  const S = VX.S, M = VX.M, B = VX.Blocks;
  const SIZE = 120;
  const E0 = 14, E1 = 106;           // fachadas del perímetro
  const RING = [21, 99];             // ejes de la ronda
  const AVC = 60;                    // eje de las avenidas que llegan a la plaza
  const ROAD = 4;                    // media calzada
  const PZ0 = 42, PZ1 = 78;          // plaza central
  const G = { ASPH: 0, WALK: 1, TILE: 2, GRASS: 3, PLAZA: 4, MARBLE: 5, WOOD: 6, PLAZA2: 7, CONC: 8, SOIL: 9 };

  class CityRoom extends VX.BigRoom {
    constructor() {
      super('Ciudad nocturna', SIZE, SIZE, 17, 6);
      this.city = true;
      this.damp = 0.58;
    }
    generate() { generate(this); }
    floorColor(gt, mx, mz, gx, gz, h, h2, o) {
      let r, g, b, mat = 0, wet = 0;
      switch (gt) {
        case G.ASPH: { const k = 0.06 + h * 0.01 + h2 * 0.012; r = k; g = k; b = k * 1.12; wet = 1; mat = -0.2; break; }
        case G.WALK: { const k = 0.15 + h * 0.03 + h2 * 0.015; r = k; g = k * 0.98; b = k * 0.95; wet = 1; break; }
        case G.PLAZA: { const k = 0.17 + h * 0.04; r = k * 1.05; g = k; b = k * 0.92; wet = 1; break; }
        case G.PLAZA2: { const k = 0.1 + h * 0.03; r = k * 0.95; g = k * 0.95; b = k; wet = 1; break; }
        case G.GRASS: { const k = 0.55 + h * 0.45; r = 0.04 * k; g = 0.08 * k; b = 0.035 * k; break; }
        case G.SOIL: { const k = 0.6 + h * 0.4; r = 0.08 * k; g = 0.06 * k; b = 0.04 * k; break; }
        case G.MARBLE: { const c = ((mx + mz) & 1) ? 0.4 : 0.18; r = c * (0.98 + h * 0.06); g = c * 0.97; b = c * 0.95; mat = -0.55; break; }
        case G.TILE: { const c = ((mx + mz) & 1) ? 0.32 : 0.22; r = c; g = c; b = c * 1.02; mat = -0.25; break; }
        case G.WOOD: { const k = 0.6 + M.hash3(gx >> 1, 9, gz >> 3) * 0.4; r = 0.22 * k; g = 0.14 * k; b = 0.075 * k; mat = -0.15; break; }
        case G.CONC: { const k = 0.13 + h * 0.03; r = k; g = k; b = k * 1.03; wet = 1; break; }
        default: r = g = b = 0.12;
      }
      o[0] = r; o[1] = g; o[2] = b; o[3] = mat; o[4] = wet;
    }
  }

  // ---------------------------------------------------------------------------
  function generate(r) {
    const K = VX.BigBuild(r);
    const { C, H, wx, wz, setc, getc, fc, fm, cm, gm, dec, light, prop, chestSpot, hash } = K;

    // 1) límite invisible fuera de las fachadas
    fc(0, 0, 0, r.W, H, r.D, B.BARRIER);
    fc(cm(E0), 0, cm(E0), cm(E1), H, cm(E1), 0);

    // 2) suelo: aceras, ronda, avenidas y plaza (con dibujo de anillos y radios)
    gm(E0, E0, E1, E1, G.WALK);
    for (const c of RING) { gm(c - ROAD, E0, c + ROAD, E1, G.ASPH); gm(E0, c - ROAD, E1, c + ROAD, G.ASPH); }
    gm(AVC - ROAD, E0, AVC + ROAD, PZ0, G.ASPH); gm(AVC - ROAD, PZ1, AVC + ROAD, E1, G.ASPH);
    gm(E0, AVC - ROAD, PZ0, AVC + ROAD, G.ASPH); gm(PZ1, AVC - ROAD, E1, AVC + ROAD, G.ASPH);
    gm(PZ0, PZ0, PZ1, PZ1, (x, z) => {
      const d = Math.hypot(x + 0.5 - 60, z + 0.5 - 60), a = Math.atan2(z + 0.5 - 60, x + 0.5 - 60);
      if (d > 16.5) return (Math.floor(x / 2) + Math.floor(z / 2)) % 2 ? G.PLAZA : G.PLAZA2;
      const ring = Math.floor(d / 2.2) % 2 === 0, ray = Math.abs(((a / (Math.PI / 8)) % 1 + 1) % 1 - 0.5) < 0.09;
      return ring || ray ? G.PLAZA2 : G.PLAZA;
    });

    // marcas viales: bordillos, líneas y pasos de cebra
    const curb = (x0, z0, x1, z1) => dec((x0 + x1) / 2, 0.06, (z0 + z1) / 2, Math.max(0.2, x1 - x0), 0.12, Math.max(0.2, z1 - z0), 0.24, 0.24, 0.25);
    const roadsZ = [[RING[0], E0, E1], [RING[1], E0, E1], [AVC, E0, PZ0], [AVC, PZ1, E1]];   // calles a lo largo de z: [x, z0, z1]
    const isRoadAt = (x, z) => { const t = r.gmap[Math.floor(z) * SIZE + Math.floor(x)]; return t === G.ASPH; };
    for (const [c, a0, a1] of roadsZ) {
      for (let t = a0; t < a1; t += 1) {
        for (const s of [-1, 1]) {
          const px = c + s * (ROAD + 0.5);
          if (!isRoadAt(px, t + 0.5)) {
            curb(c + s * ROAD - 0.1, t, c + s * ROAD + 0.1, t + 1);
          }
          // mismo trazado girado (calles a lo largo de x)
          const pz = c + s * (ROAD + 0.5);
          if (!isRoadAt(t + 0.5, pz)) curb(t, c + s * ROAD - 0.1, t + 1, c + s * ROAD + 0.1);
        }
        if (Math.floor(t) % 4 === 0 && isRoadAt(c + ROAD + 0.5, t + 1) === false && isRoadAt(c + ROAD + 0.5, t + 2) === false) {
          dec(c, 0.006, t + 1, 0.13, 0.012, 2, 0.42, 0.4, 0.3);
          dec(t + 1, 0.006, c, 2, 0.012, 0.13, 0.42, 0.4, 0.3);
        }
      }
    }
    const zebra = (cx, cz, alongX) => { for (let k = -3.5; k <= 3.5; k += 1) alongX ? dec(cx + k, 0.006, cz, 0.5, 0.012, 2.2, 0.45, 0.45, 0.42) : dec(cx, 0.006, cz + k, 2.2, 0.012, 0.5, 0.45, 0.45, 0.42); };
    for (const c of RING) for (const s of [-1, 1]) { zebra(AVC, c + s * (ROAD + 1.4), true); zebra(c + s * (ROAD + 1.4), AVC, false); }
    zebra(AVC, PZ0 - 2.2, true); zebra(AVC, PZ1 + 2.2, true); zebra(PZ0 - 2.2, AVC, false); zebra(PZ1 + 2.2, AVC, false);

    // ------------------------------------------------------------------------
    // Ventana con piso dentro (el shader dibuja la habitación). lit: probabilidad de luz
    const window1 = (axis, plane, n, a, y, ww, wh, seedKey, lit = 0.17) => {
      const h = hash(a + seedKey, y, plane * 3 + seedKey), on = h < lit;
      const seed = on ? 0.5 + hash(a, y + 9, plane) * 0.49 : hash(a, y + 5, plane) * 0.49;
      const p = plane + n * 0.035;
      if (axis === 'x') dec(p, y + wh / 2, a, 0.07, wh, ww, 0, 0, 0, -(2 + seed));
      else dec(a, y + wh / 2, p, ww, wh, 0.07, 0, 0, 0, -(2 + seed));
      return on;
    };
    const STY = {
      brick: { body: [[0.2, 0.09, 0.07], [0.17, 0.08, 0.06], [0.22, 0.12, 0.08]], trim: [0.32, 0.28, 0.24], cw: 1.8, ww: 1.0, wh: 1.55, fh: 3.1 },
      stone: { body: [[0.26, 0.23, 0.19], [0.22, 0.2, 0.17], [0.24, 0.22, 0.2]], trim: [0.34, 0.31, 0.27], cw: 2.0, ww: 1.05, wh: 1.8, fh: 3.4 },
      glass: { body: [[0.05, 0.065, 0.085], [0.06, 0.07, 0.08]], trim: [0.12, 0.13, 0.15], cw: 1.5, ww: 1.3, wh: 2.3, fh: 3.4 },
      modern: { body: [[0.25, 0.25, 0.26], [0.2, 0.21, 0.22], [0.27, 0.26, 0.24]], trim: [0.16, 0.16, 0.17], cw: 2.4, ww: 1.5, wh: 1.7, fh: 3.0 },
    };
    // Una fachada con estilo: ventanas, alféizares, cornisas, pilastras, balcones, escalera de incendios
    const facadeFace = (axis, plane, n, a0, a1, y0, y1, st, key, opts = {}) => {
      const T = STY[st], tr = T.trim;
      const P = (a, y, z3, sa, sy, sn, c, e = 0) => axis === 'x' ? dec(plane + n * z3, y, a, sn, sy, sa, c[0], c[1], c[2], e) : dec(a, y, plane + n * z3, sa, sy, sn, c[0], c[1], c[2], e);
      const L = a1 - a0, cols = Math.max(1, Math.floor((L - 0.6) / T.cw)), pad = (L - cols * T.cw) / 2;
      const fe = opts.fireEscape ? Math.floor(cols * hash(key, 3, 1)) : -1;
      for (let y = y0; y + T.fh <= y1 + 0.01; y += T.fh) {
        const wy = y + T.fh * 0.3;
        // cornisa o banda en cada planta (más marcada en piedra y ladrillo)
        if (st !== 'glass') P((a0 + a1) / 2, y + 0.06, 0.08, L, 0.12, 0.16, tr);
        else P((a0 + a1) / 2, y + 0.3, 0.04, L, 0.6, 0.08, [0.03, 0.035, 0.045], -0.6);
        for (let k = 0; k < cols; k++) {
          const a = a0 + pad + (k + 0.5) * T.cw;
          window1(axis, plane, n, a, wy, T.ww, T.wh, key, opts.lit);
          if (st === 'brick' || st === 'stone') {
            P(a, wy - 0.06, 0.1, T.ww + 0.25, 0.1, 0.2, tr);                  // alféizar
            P(a, wy + T.wh + 0.08, 0.06, T.ww + 0.2, 0.16, 0.12, tr);          // dintel
          }
          if (st === 'stone' && k < cols - 1) P(a + T.cw / 2, (y + y + T.fh) / 2, 0.06, 0.28, T.fh, 0.12, tr);   // pilastra
          if (st === 'modern' && (k + Math.floor(y)) % 2 === 0) {
            // balcón: losa, barandilla y algún tiesto
            P(a, wy - 0.1, 0.55, T.cw * 0.95, 0.12, 1.1, tr);
            P(a, wy + 0.4, 1.08, T.cw * 0.95, 0.9, 0.05, [0.1, 0.11, 0.12], -0.4);
            if (hash(a, y, key) < 0.3) P(a + 0.5, wy + 0.2, 0.8, 0.3, 0.35, 0.3, [0.12, 0.2, 0.08]);
          }
          if (k === fe && y > y0) {
            // escalera de incendios: rellano con barandilla y tramo en zigzag
            P(a, y + 0.05, 0.7, T.cw * 1.6, 0.06, 1.3, [0.06, 0.06, 0.065]);
            P(a, y + 0.55, 1.33, T.cw * 1.6, 0.05, 0.04, [0.08, 0.08, 0.085]);
            P(a, y + 1.0, 1.33, T.cw * 1.6, 0.05, 0.04, [0.08, 0.08, 0.085]);
            for (let s = 0; s < 6; s++) P(a - T.cw * 0.6 + s * 0.22 * ((Math.floor(y / T.fh) % 2) ? 1 : -1) + (Math.floor(y / T.fh) % 2 ? 0 : T.cw * 1.2), y - 0.25 - s * 0.45, 0.7, 0.25, 0.05, 0.9, [0.07, 0.07, 0.075]);
          }
          if (hash(a, y, key + 7) < 0.06) P(a + T.ww * 0.3, wy - 0.45, 0.25, 0.7, 0.45, 0.5, [0.32, 0.32, 0.3]);   // aire acondicionado
        }
      }
    };
    // Edificio de decorado completo: cuerpo, fachadas, remate y azotea
    const building = (x0, z0, x1, z1, y0, y1, faces, st, opts = {}) => {
      const T = STY[st], col = T.body[Math.floor(hash(x0, z0, y1) * T.body.length) % T.body.length];
      dec((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, col[0], col[1], col[2], st === 'glass' ? -0.5 : 0);
      const key = x0 * 3 + z0 * 7;
      const wy0 = Math.max(y0, opts.winFrom ?? 4.5);
      const fo = { fireEscape: st === 'brick', lit: opts.lit ?? 0.17 };
      for (const f of faces) {
        if (f === 'xn') facadeFace('x', x0, -1, z0, z1, wy0, y1 - 0.6, st, key + 1, fo);
        if (f === 'xp') facadeFace('x', x1, 1, z0, z1, wy0, y1 - 0.6, st, key + 2, fo);
        if (f === 'zn') facadeFace('z', z0, -1, x0, x1, wy0, y1 - 0.6, st, key + 3, fo);
        if (f === 'zp') facadeFace('z', z1, 1, x0, x1, wy0, y1 - 0.6, st, key + 4, fo);
      }
      // remate: cornisa grande y antepecho
      const tr = T.trim;
      dec((x0 + x1) / 2, y1 + 0.15, (z0 + z1) / 2, x1 - x0 + 0.5, 0.3, z1 - z0 + 0.5, tr[0] * 0.8, tr[1] * 0.8, tr[2] * 0.8);
      dec((x0 + x1) / 2, y1 + 0.65, z0 + 0.1, x1 - x0, 0.7, 0.2, col[0], col[1], col[2]);
      dec((x0 + x1) / 2, y1 + 0.65, z1 - 0.1, x1 - x0, 0.7, 0.2, col[0], col[1], col[2]);
      dec(x0 + 0.1, y1 + 0.65, (z0 + z1) / 2, 0.2, 0.7, z1 - z0, col[0], col[1], col[2]);
      dec(x1 - 0.1, y1 + 0.65, (z0 + z1) / 2, 0.2, 0.7, z1 - z0, col[0], col[1], col[2]);
      // azotea: depósito de agua, antena, chimeneas o un cartel luminoso
      const hh = hash(x1, z1, y0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (hh < 0.3 && y1 > 12) {
        const tx = x0 + (x1 - x0) * 0.3, tz = z0 + (z1 - z0) * 0.6;
        for (const [ox, oz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) dec(tx + ox, y1 + 1, tz + oz, 0.12, 2, 0.12, 0.08, 0.06, 0.05);
        dec(tx, y1 + 2.9, tz, 2.1, 1.9, 2.1, 0.18, 0.11, 0.07);
        dec(tx, y1 + 4.0, tz, 1.4, 0.4, 1.4, 0.14, 0.09, 0.06);
      } else if (hh < 0.5 && y1 > 18) {
        dec(cx, y1 + 3, cz, 0.15, 6, 0.15, 0.15, 0.15, 0.17);
        r.beacons.push({ x: wx(cx), y: y1 + 6.1, z: wz(cz) });
      } else if (hh < 0.65 && opts.billboard !== false) {
        // cartel publicitario iluminado en la azotea, mirando a la calle
        const f = faces[0], NC = [[1, 0.35, 0.6], [0.3, 0.85, 1], [1, 0.7, 0.3]][Math.floor(hash(x0, y1, 2) * 3) % 3];
        const bw = Math.min(8, (f === 'xn' || f === 'xp' ? z1 - z0 : x1 - x0) * 0.7);
        const px = f === 'xn' ? x0 + 1 : f === 'xp' ? x1 - 1 : cx, pz = f === 'zn' ? z0 + 1 : f === 'zp' ? z1 - 1 : cz;
        const ax = f === 'xn' || f === 'xp';
        dec(px, y1 + 1.5, pz, 0.15, 3, 0.15, 0.1, 0.1, 0.1);
        dec(px, y1 + 4, pz, ax ? 0.2 : bw, 2.6, ax ? bw : 0.2, NC[0] * 0.6, NC[1] * 0.6, NC[2] * 0.6, 0.55);
        dec(px, y1 + 4, pz, ax ? 0.25 : bw + 0.2, 2.8, ax ? bw + 0.2 : 0.25, 0.06, 0.06, 0.06);
      } else {
        for (let k = 0; k < 2; k++) dec(x0 + (x1 - x0) * (0.25 + k * 0.4), y1 + 1.2, z0 + (z1 - z0) * 0.3, 0.6, 1.6, 0.6, col[0] * 0.8, col[1] * 0.8, col[2] * 0.8);
      }
    };
    // Planta baja de decorado: escaparates con tienda dentro, persianas, rótulos y toldos
    const storefront = (axis, plane, n, a0, a1, key) => {
      const p = plane + n * 0.035;
      for (let a = a0 + 0.5; a + 3 <= a1 - 0.3; a += 3.6) {
        const h = hash(a, plane, key), w = 3;
        const P = (aa, y, sa, sy, d, c, e = 0) => axis === 'x' ? dec(p + n * d, y, aa, 0.07, sy, sa, c[0], c[1], c[2], e) : dec(aa, y, p + n * d, sa, sy, 0.07, c[0], c[1], c[2], e);
        if (h < 0.4) P(a + w / 2, 1.5, w, 2.7, 0, [0.22, 0.23, 0.25], -0.25);                  // persiana bajada
        else {
          const seed = h < 0.62 ? 0.55 + hash(a, 2, plane) * 0.4 : hash(a, 3, plane) * 0.45;
          axis === 'x' ? dec(p, 1.55, a + w / 2, 0.07, 2.5, w, 0, 0, 0, -(2 + seed)) : dec(a + w / 2, 1.55, p, w, 2.5, 0.07, 0, 0, 0, -(2 + seed));
        }
        P(a + w / 2, 0.15, w + 0.3, 0.3, 0.05, [0.2, 0.19, 0.18]);                               // zócalo
        if (h > 0.75) {
          const NC = [[1, 0.25, 0.65], [0.25, 0.85, 1], [0.35, 1, 0.45], [1, 0.55, 0.15]][Math.floor(hash(a, 1, plane) * 4) % 4];
          P(a + w / 2, 3.35, w * 0.85, 0.4, 0.1, NC, 0.85);
        } else if (h > 0.55) {
          const AC = [[0.35, 0.08, 0.08], [0.08, 0.2, 0.32], [0.1, 0.26, 0.12]][Math.floor(hash(a, 6, plane) * 3) % 3];
          P(a + w / 2, 3.0, w, 0.1, 0.55, AC);
        }
      }
    };

    // ------------------------------------------------------------------------
    // Tienda a pie de calle con fachada de vóxel detallada
    const SH = 18;
    const shop = (x0, z0, x1, z1, front, kind, o = {}) => {
      const X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1);
      const wall = o.wall || B.CBRICK;
      fc(X0, 0, Z0, X1, SH + 1, Z1, 0);
      const W4 = (x, y, z) => setc(x, y, z, y < 2 ? B.CONCRETE : y >= 16 ? B.CONCRETE : wall);
      for (let y = 0; y < SH; y++) {
        for (let x = X0; x < X1; x++) { W4(x, y, Z0); W4(x, y, Z1 - 1); }
        for (let z = Z0; z < Z1; z++) { W4(X0, y, z); W4(X1 - 1, y, z); }
      }
      const along = front === 'xn' || front === 'xp' ? 'z' : 'x';
      const L = along === 'z' ? Z1 - Z0 : X1 - X0;
      const at = (a, y, t, out = 0) => {
        if (front === 'xn') setc(X0 - out, y, Z0 + a, t);
        else if (front === 'xp') setc(X1 - 1 + out, y, Z0 + a, t);
        else if (front === 'zn') setc(X0 + a, y, Z0 - out, t);
        else setc(X0 + a, y, Z1 - 1 + out, t);
      };
      const doorA = Math.floor(L * (o.doorAt ?? 0.5)) - 4, doorB = doorA + 8;
      const glassDoor = kind === 'cafe' || kind === 'ropa' || kind === 'farmacia';
      for (let a = 1; a < L - 1; a++) {
        const pil = a % 12 === 0 || a <= 2 || a >= L - 3;
        for (let y = 0; y < SH; y++) {
          let t = y < 2 || y >= 15 ? B.CONCRETE : wall;
          if (a >= doorA && a < doorB) {
            if (y < 11) t = (a === doorA || a === doorB - 1) ? B.STEEL : glassDoor ? B.GLASS : B.SHUTTER;
            else if (y === 11) t = B.STEEL;
          } else if (!pil && y >= 2 && y < 12) t = (y === 8 || a % 12 === 6) ? B.STEEL : B.GLASS;
          at(a, y, t);
        }
        // pilastras que sobresalen y cornisa de la planta baja
        if (pil && a > 2 && a < L - 3) for (let y = 0; y < 15; y++) at(a, y, y < 2 ? B.CONCRETE : wall, 1);
        at(a, 16, B.CONCRETE, 1);
      }
      // rótulo: placa oscura con letras de neón
      const NC = { super: B.NEON_C, farmacia: B.NEON_G, cafe: B.NEON_P, armeria: B.NEON_R, burger: B.LAMP, bar: B.NEON_P, ropa: B.NEON_C }[kind] || B.NEON_C;
      for (let a = Math.max(3, doorA - 6); a < Math.min(L - 3, doorB + 6); a++) for (let y = 12; y < 15; y++) at(a, y, y === 13 && (a + Math.floor(a / 3)) % 4 !== 0 ? NC : B.CAR_K, 1);
      if (kind === 'farmacia') { const m = doorB + 9; if (m < L - 4) { for (let k = -2; k <= 2; k++) { at(m + k, 13, B.NEON_G, 2); at(m, 13 + k, B.NEON_G, 2); } } }
      // toldo a rayas
      const AWN = { super: [0.08, 0.28, 0.5], farmacia: [0.08, 0.38, 0.16], cafe: [0.5, 0.12, 0.2], armeria: [0.2, 0.2, 0.18], burger: [0.6, 0.3, 0.05], bar: [0.3, 0.08, 0.3], ropa: [0.12, 0.12, 0.12] }[kind] || [0.4, 0.1, 0.1];
      if (kind !== 'armeria') for (let k = 0; k < 8; k++) {
        const fa = (k + 0.5) / 8, c = k % 2 ? AWN : [0.6, 0.58, 0.52];
        if (along === 'z') { const px = front === 'xn' ? x0 - 0.65 : x1 + 0.65; dec(px, 3.05, z0 + (z1 - z0) * fa, 1.3, 0.08, (z1 - z0) / 8, c[0] * 0.55, c[1] * 0.55, c[2] * 0.55); }
        else { const pz = front === 'zn' ? z0 - 0.65 : z1 + 0.65; dec(x0 + (x1 - x0) * fa, 3.05, pz, (x1 - x0) / 8, 0.08, 1.3, c[0] * 0.55, c[1] * 0.55, c[2] * 0.55); }
      }
      // suelo, techo y fluorescentes
      const gt = { cafe: G.WOOD, armeria: G.WOOD, bar: G.WOOD }[kind] ?? G.TILE;
      gm(x0, z0, x1, z1, gt);
      dec((x0 + x1) / 2, 4.62, (z0 + z1) / 2, x1 - x0, 0.25, z1 - z0, 0.07, 0.065, 0.06);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const lc = { super: [0.75, 0.9, 1.05], farmacia: [0.7, 1, 0.8], cafe: [1.1, 0.7, 0.4], armeria: [1, 0.55, 0.4], burger: [1.1, 0.8, 0.45], bar: [0.9, 0.45, 0.8], ropa: [1, 0.95, 0.85] }[kind] || [1, 1, 1];
      const lx = (x1 - x0) / 3.2, lz = (z1 - z0) / 3.2, dark = hash(x0, z0, 4) < 0.2;
      for (const [fx, fz] of [[-0.5, -0.5], [0.5, 0.5]]) {
        if (!dark) light(cx + fx * lx, 4.1, cz + fz * lz, 7, [lc[0] * 0.5, lc[1] * 0.5, lc[2] * 0.5], hash(cx, fx, cz) < 0.4 ? { broken: true } : {});
        dec(cx + fx * lx, 4.47, cz + fz * lz, 1.4, 0.06, 0.3, lc[0] * 0.8, lc[1] * 0.8, lc[2] * 0.8, dark ? 0 : 0.9);
      }
      // interior
      const ix0 = X0 + 2, iz0 = Z0 + 2, ix1 = X1 - 2, iz1 = Z1 - 2;
      const inward = { xn: [1, 0], xp: [-1, 0], zn: [0, 1], zp: [0, -1] }[front];
      const rowsAlong = (fn) => {   // filas perpendiculares a la fachada
        const n = kind === 'super' ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const f = (k + 1) / (n + 1);
          if (along === 'z') { const z = Math.round(iz0 + (iz1 - iz0) * f); const xa = inward[0] > 0 ? ix0 + 10 : ix0 + 3, xb = inward[0] > 0 ? ix1 - 3 : ix1 - 10; fn(xa, z - 1, xb, z + 2, true); }
          else { const x = Math.round(ix0 + (ix1 - ix0) * f); const za = inward[1] > 0 ? iz0 + 10 : iz0 + 3, zb = inward[1] > 0 ? iz1 - 3 : iz1 - 10; fn(x - 1, za, x + 2, zb, false); }
        }
      };
      if (kind === 'super' || kind === 'farmacia') {
        rowsAlong((a, b, c, d) => { fc(a, 0, b, c, 7, d, B.STEEL); fc(a, 1, b, c, 6, d, B.PRODUCT); });
        if (along === 'z') { const bx = inward[0] > 0 ? ix1 - 2 : ix0; fc(bx, 0, iz0 + 2, bx + 2, 8, iz1 - 2, B.PANEL); }
        else { const bz = inward[1] > 0 ? iz1 - 2 : iz0; fc(ix0 + 2, 0, bz, ix1 - 2, 8, bz + 2, B.PANEL); }
      }
      if (kind === 'ropa') {
        // percheros con ropa de colores y maniquíes
        rowsAlong((a, b, c, d, ax) => {
          fc(a, 0, b, c, 1, d, B.STEEL);
          if (ax) { fc(a, 6, b + 1, c, 7, b + 2, B.STEEL); fc(a + 1, 2, b + 1, c - 1, 6, b + 2, B.SOFA); }
          else { fc(a + 1, 6, b, a + 2, 7, d, B.STEEL); fc(a + 1, 2, b + 1, a + 2, 6, d - 1, B.SOFA); }
        });
      }
      if (kind === 'bar') {
        // mesa de billar y taburetes
        fm(cx - 1.2, 0, cz - 0.7, cx + 1.2, 0.75, cz + 0.7, B.PLANK);
        fm(cx - 1.0, 0.75, cz - 0.5, cx + 1.0, 0.8, cz + 0.5, B.LEAF);
      }
      // mostrador junto a la entrada (con botellas detrás en el bar)
      {
        const d0 = 5, d1 = 8, a0 = 4, a1 = Math.min(L - 4, doorA - 2);
        if (a1 - a0 > 4) for (let a = a0; a < a1; a++) for (let d = d0; d < d1; d++) for (let y = 0; y < 4; y++) {
          const t = y === 3 ? (kind === 'armeria' ? B.GLASS : B.MARBLE) : (kind === 'cafe' || kind === 'burger' || kind === 'bar' ? B.PLANK : B.STEEL);
          if (front === 'xn') setc(X0 + d, y, Z0 + a, t); else if (front === 'xp') setc(X1 - 1 - d, y, Z0 + a, t);
          else if (front === 'zn') setc(X0 + a, y, Z0 + d, t); else setc(X0 + a, y, Z1 - 1 - d, t);
        }
      }
      if (kind === 'armeria' || kind === 'bar') {
        // armeros o botelleros en la pared del fondo
        for (let a = 4; a < L - 4; a += kind === 'bar' ? 2 : 6) for (let y = 5; y < 12; y += 3) for (let k = 0; k < (kind === 'bar' ? 2 : 4); k++) {
          const t = kind === 'bar' ? B.PRODUCT : k === 0 ? B.STEEL : B.TIRE;
          if (front === 'xn') setc(X1 - 2, y, Z0 + a + k, t); else if (front === 'xp') setc(X0 + 1, y, Z0 + a + k, t);
          else if (front === 'zn') setc(X0 + a + k, y, Z1 - 2, t); else setc(X0 + a + k, y, Z0 + 1, t);
        }
      }
      if (kind === 'cafe' || kind === 'burger' || kind === 'bar') {
        for (let k = 0; k < (kind === 'bar' ? 2 : 4); k++) {
          const px = x0 + (x1 - x0) * (0.32 + (k % 2) * 0.36), pz = z0 + (z1 - z0) * (0.33 + Math.floor(k / 2) * 0.34);
          prop('table', px + (kind === 'bar' ? (x1 - x0) * 0.25 : 0), pz, { rot: 0 });
          prop('chair', px + 0.8, pz, {}); prop('chair', px - 0.8, pz, {});
        }
      }
      // carteles en las paredes (decorado)
      const back = { xn: [x1 - 1.4, z0 + 1.4], xp: [x0 + 1.4, z1 - 1.4], zn: [x1 - 1.4, z1 - 1.4], zp: [x0 + 1.4, z0 + 1.4] }[front];
      chestSpot(back[0], back[1]);
      if (o.upper) building(x0, z0, x1, z1, 4.75, o.upper, o.faces || [front], o.style || 'brick', { winFrom: 5 });
    };

    // ------------------------------------------------------------------------
    // Rascacielos: vestíbulo de doble altura con entreplanta (se ve todo a través del cristal)
    const tower = (x0, z0, x1, z1, top, front, o = {}) => {
      const X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1);
      const LX = X1 - X0, LZ = Z1 - Z0;
      fc(X0, 0, Z0, X1, H, Z1, 0);
      gm(x0, z0, x1, z1, G.MARBLE);
      const wallCell = (x, z, a, len) => {
        const pil = a < 3 || a >= len - 3 || a % 18 < 3;
        for (let y = 0; y < H; y++) {
          let t;
          if (pil || y === 0 || (y >= 15 && y < 18) || y >= 32) t = B.CONCRETE;
          else t = (a % 18 === 10 && !pil) ? B.STEEL : B.GLASS;
          setc(x, y, z, t);
          if (pil) { const ix = x === X0 ? 1 : x === X1 - 1 ? -1 : 0, iz = z === Z0 ? 1 : z === Z1 - 1 ? -1 : 0; setc(x + ix, y, z + iz, B.CONCRETE); }
        }
      };
      for (let a = 0; a < LX; a++) { wallCell(X0 + a, Z0, a, LX); wallCell(X0 + a, Z1 - 1, a, LX); }
      for (let a = 0; a < LZ; a++) { wallCell(X0, Z0 + a, a, LZ); wallCell(X1 - 1, Z0 + a, a, LZ); }
      for (const fx of [0.36, 0.64]) for (const fz of [0.36, 0.64]) {
        const px = X0 + Math.round(LX * fx), pz = Z0 + Math.round(LZ * fz);
        fc(px - 1, 0, pz - 1, px + 2, H, pz + 2, B.CONCRETE);
      }
      // entreplanta maciza al fondo con ascensores en su cara y barandilla de cristal
      const MH = 12, MD = 18;
      const inward = { xn: [1, 0], xp: [-1, 0], zn: [0, 1], zp: [0, -1] }[front];
      let mx0, mz0, mx1, mz1;
      if (front === 'xn') { mx0 = X1 - 1 - MD; mx1 = X1 - 1; mz0 = Z0 + 1; mz1 = Z1 - 1; }
      else if (front === 'xp') { mx0 = X0 + 1; mx1 = X0 + 1 + MD; mz0 = Z0 + 1; mz1 = Z1 - 1; }
      else if (front === 'zn') { mz0 = Z1 - 1 - MD; mz1 = Z1 - 1; mx0 = X0 + 1; mx1 = X1 - 1; }
      else { mz0 = Z0 + 1; mz1 = Z0 + 1 + MD; mx0 = X0 + 1; mx1 = X1 - 1; }
      for (let y = 0; y < MH; y++) for (let z = mz0; z < mz1; z++) for (let x = mx0; x < mx1; x++) if (!getc(x, y, z)) setc(x, y, z, y === MH - 1 ? B.MARBLE : B.CONCRETE);
      const edge = [];
      if (front === 'xn') for (let z = mz0; z < mz1; z++) edge.push([mx0, z]);
      else if (front === 'xp') for (let z = mz0; z < mz1; z++) edge.push([mx1 - 1, z]);
      else if (front === 'zn') for (let x = mx0; x < mx1; x++) edge.push([x, mz0]);
      else for (let x = mx0; x < mx1; x++) edge.push([x, mz1 - 1]);
      const EL = edge.length, SW = 10, sA0 = 3, sA1 = sA0 + SW;
      for (let k = 0; k < MH - 1; k++) for (let a = sA0; a < sA1; a++) {
        const [ex, ez] = edge[a];
        for (let d = 1; d <= 2; d++) {
          const sx = ex - inward[0] * (k * 2 + d), sz = ez - inward[1] * (k * 2 + d);
          for (let y = 0; y < MH - 1 - k; y++) setc(sx, y, sz, y === MH - 2 - k ? B.MARBLE : B.CONCRETE);
        }
      }
      for (let a = sA1 + 4; a < EL - 4; a++) {
        const [ex, ez] = edge[a], slot = (a - sA1 - 4) % 9;
        if (slot >= 1 && slot <= 6) for (let y = 0; y < 10; y++) setc(ex, y, ez, slot === 3 || slot === 4 ? B.STEEL : B.METAL);
        if (slot === 3) setc(ex, 10, ez, B.PANEL);
      }
      for (let a = sA1 + 1; a < EL; a++) {
        const [ex, ez] = edge[a], post = a % 8 === 0 || a === EL - 1;
        for (let y = MH; y < MH + 4; y++) setc(ex, y, ez, post || y === MH + 3 ? B.STEEL : B.GLASS);
      }
      // recepción, sofás, jardineras
      const fxy = front === 'xn' || front === 'xp';
      {
        const cz0 = Math.round((Z0 + Z1) / 2) - 7, cx0 = Math.round((X0 + X1) / 2) - 7;
        const d = front === 'xn' ? X0 + 12 : front === 'xp' ? X1 - 15 : front === 'zn' ? Z0 + 12 : Z1 - 15;
        for (let a = 0; a < 14; a++) for (let k = 0; k < 3; k++) for (let y = 0; y < 4; y++) {
          const t = y === 3 ? B.MARBLE : B.PLANK;
          if (fxy) setc(d + k, y, cz0 + a, t); else setc(cx0 + a, y, d + k, t);
        }
      }
      const planter = (x, z) => { if (getc(x + 2, MH - 1, z + 2) === B.MARBLE) return; fc(x, 0, z, x + 4, 2, z + 4, B.CBRICK); for (let y = 2; y < 7; y++) for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 4; dx++) if (hash(x + dx, y, z + dz) < 0.8 - (y - 2) * 0.13) setc(x + dx, y, z + dz, B.LEAF); };
      planter(X0 + 3, Z0 + 3); planter(X1 - 7, Z0 + 3); planter(X0 + 3, Z1 - 7); planter(X1 - 7, Z1 - 7);
      const cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2, hx = (x1 - x0) / 4, hz = (z1 - z0) / 4;
      for (const [a, b] of [[-1, -1], [1, 1]]) {
        light(cxm + a * hx, 7.4, czm + b * hz, 9, [0.5, 0.56, 0.68], hash(a, b, x0) < 0.4 ? { broken: true } : {});
        dec(cxm + a * hx, 8.44, czm + b * hz, 2.2, 0.08, 2.2, 0.75, 0.85, 1, 0.85);
      }
      for (const [a, b] of [[1, -1], [-1, 1]]) dec(cxm + a * hx, 8.44, czm + b * hz, 2.2, 0.08, 2.2, 0.3, 0.32, 0.36);   // paneles fundidos
      const nx = inward[0], nz = inward[1];
      const fcx = front === 'xn' ? x0 : front === 'xp' ? x1 : cxm, fcz = front === 'zn' ? z0 : front === 'zp' ? z1 : czm;
      dec(fcx - nx * 1.5, 4.2, fcz - nz * 1.5, nx ? 3 : 7, 0.25, nz ? 3 : 7, 0.1, 0.1, 0.11);
      dec(fcx - nx * 2.95, 4.2, fcz - nz * 2.95, nx ? 0.1 : 6, 0.12, nz ? 0.1 : 6, 0.8, 0.9, 1, 0.8);
      // oficinas en la entreplanta y cofres
      const mcx = ((mx0 + mx1) / 2) / C, mcz = ((mz0 + mz1) / 2) / C;
      for (let k = -1; k <= 1; k += 2) { const px = mcx + (fxy ? 0 : k * 3), pz = mcz + (fxy ? k * 3 : 0); fm(px - 0.75, 3, pz - 0.4, px + 0.75, 3.75, pz + 0.4, B.PLANK); }
      chestSpot(fxy ? mcx + inward[0] * 1.2 : mcx + 4, fxy ? mcz + 4 : mcz + inward[1] * 1.2);
      { const Lc = { xp: [x1 - 2, z1 - 2.5], xn: [x0 + 2, z1 - 2.5], zn: [x1 - 2.5, z0 + 2], zp: [x1 - 2.5, z1 - 2] }[front]; chestSpot(Lc[0], Lc[1]); }
      // la torre (decorado de cristal u oficinas) con retranqueos
      building(x0, z0, x1, z1, 8.5, top, ['xn', 'xp', 'zn', 'zp'], o.style || 'glass', { winFrom: 8.6, billboard: false });
      const t2 = top + 6 + hash(x0, top, 1) * 10;
      building(x0 + 2, z0 + 2, x1 - 2, z1 - 2, top + 0.9, t2, ['xn', 'xp', 'zn', 'zp'], o.style || 'glass', { winFrom: top + 1, billboard: false });
      dec(cxm, t2 + 7, czm, 0.25, 12, 0.25, 0.15, 0.15, 0.17);
      r.beacons.push({ x: wx(cxm), y: t2 + 13.2, z: wz(czm) });
    };

    // Aparcamiento: planta abierta con pilares, coches y fluorescentes que parpadean
    const garage = (x0, z0, x1, z1, front) => {
      const X0 = cm(x0), Z0 = cm(z0), X1 = cm(x1), Z1 = cm(z1), HG = 12;
      fc(X0, 0, Z0, X1, HG + 1, Z1, 0);
      gm(x0, z0, x1, z1, G.CONC);
      for (let y = 0; y < HG; y++) {
        for (let x = X0; x < X1; x++) { if (front !== 'zn') setc(x, y, Z0, B.CONCRETE); if (front !== 'zp') setc(x, y, Z1 - 1, B.CONCRETE); }
        for (let z = Z0; z < Z1; z++) { if (front !== 'xn') setc(X0, y, z, B.CONCRETE); if (front !== 'xp') setc(X1 - 1, y, z, B.CONCRETE); }
      }
      // fachada abierta: pilares y murete
      const L = front === 'xn' || front === 'xp' ? Z1 - Z0 : X1 - X0;
      for (let a = 0; a < L; a++) for (let y = 0; y < HG; y++) {
        const pil = a % 16 < 2 || a > L - 3, t = pil || y >= HG - 2 ? B.CONCRETE : y < 3 && (a % 16 < 7 || a % 16 > 10) ? B.CONCRETE : 0;
        if (!t) continue;
        if (front === 'zn') setc(X0 + a, y, Z0, t); else if (front === 'zp') setc(X0 + a, y, Z1 - 1, t);
        else if (front === 'xn') setc(X0, y, Z0 + a, t); else setc(X1 - 1, y, Z0 + a, t);
      }
      for (let x = X0 + 16; x < X1 - 4; x += 16) for (let z = Z0 + 16; z < Z1 - 4; z += 16) fc(x, 0, z, x + 2, HG, z + 2, B.CONCRETE);
      // techo bajo (3 m) y el edificio de pisos encima
      dec((x0 + x1) / 2, HG * S + 0.12, (z0 + z1) / 2, x1 - x0, 0.25, z1 - z0, 0.09, 0.09, 0.1);
      for (let k = 0; k < 3; k++) {
        const lx = x0 + (x1 - x0) * (0.25 + k * 0.25), lz = (z0 + z1) / 2;
        dec(lx, HG * S - 0.03, lz, 0.25, 0.05, 1.6, 0.9, 0.95, 1, k === 1 ? 0 : 0.85);
        if (k !== 1) light(lx, HG * S - 0.4, lz, 7, [0.45, 0.5, 0.55], { broken: k === 2 });
      }
      for (let x = x0 + 2; x < x1 - 3; x += 3) dec(x + 1.2, 0.006, z0 + (z1 - z0) * 0.3, 0.1, 0.012, 4, 0.45, 0.45, 0.4);
      chestSpot(x0 + 1.5, z0 + (z1 - z0) / 2);
      r._garage = [x0, z0, x1, z1];
      return HG;
    };

    // ------------------------------------------------------------------------
    // Mobiliario urbano
    const lamp = (x, z, ax, az, broken) => {
      const X = cm(x), Z = cm(z), top = 26;
      fc(X, 0, Z, X + 1, top + 1, Z + 1, B.STEEL);
      fc(X - 1, 0, Z - 1, X + 2, 2, Z + 2, B.STEEL);
      for (let k = 1; k <= 8; k++) setc(X + ax * k, top, Z + az * k, B.STEEL);
      const lx = X + ax * 8, lz = Z + az * 8;
      fc(Math.min(lx, lx - ax), top - 1, Math.min(lz, lz - az), Math.max(lx, lx - ax) + 1, top, Math.max(lz, lz - az) + 1, broken ? B.TIRE : B.LAMP);
      if (!broken) light((lx + 0.5) / C, (top - 1.6) * S, (lz + 0.5) / C, 13, [1.05, 0.64, 0.3], { cell: r.idx(lx, top - 1, lz) });
    };
    // farola fernandina de dos globos (plaza)
    const parkLamp = (x, z) => {
      const X = cm(x), Z = cm(z);
      fc(X - 1, 0, Z - 1, X + 2, 2, Z + 2, B.STEEL);
      fc(X, 2, Z, X + 1, 15, Z + 1, B.STEEL);
      fc(X - 2, 14, Z, X + 3, 15, Z + 1, B.STEEL);
      setc(X - 2, 15, Z, B.LAMP); setc(X + 2, 15, Z, B.LAMP); setc(X, 16, Z, B.STEEL);
      light(x + 0.12, 3.9, z + 0.12, 8, [0.9, 0.62, 0.32], { cell: r.idx(X - 2, 15, Z) });
    };
    const bench = (x, z, facing) => {
      // banco de listones con patas de hierro y respaldo (facing: hacia dónde se sienta uno)
      const X = cm(x), Z = cm(z), ax = facing === 'zp' || facing === 'zn';
      const back = { zp: [0, -1], zn: [0, 1], xp: [-1, 0], xn: [1, 0] }[facing];
      for (let a = -3; a <= 3; a++) {
        const px = ax ? X + a : X, pz = ax ? Z : Z + a;
        if (Math.abs(a) === 3) { setc(px, 0, pz, B.STEEL); setc(px, 1, pz, B.STEEL); setc(px + back[0], 0, pz + back[1], B.STEEL); }
        setc(px, 2, pz, B.PLANK); setc(px + back[0], 2, pz + back[1], B.PLANK);
        setc(px + back[0] * 2, 3, pz + back[1] * 2, Math.abs(a) === 3 ? B.STEEL : B.PLANK);
        setc(px + back[0] * 2, 4, pz + back[1] * 2, B.PLANK);
        if (Math.abs(a) === 3) setc(px + back[0] * 2, 2, pz + back[1] * 2, B.STEEL);
      }
    };
    const bin = (x, z) => { const X = cm(x), Z = cm(z); fc(X, 0, Z, X + 2, 4, Z + 2, B.CAR_K); fc(X, 4, Z, X + 2, 5, Z + 2, B.STEEL); };
    const hydrant = (x, z) => { const X = cm(x), Z = cm(z); fc(X, 0, Z, X + 1, 3, Z + 1, B.CAR_R); setc(X, 3, Z, B.STEEL); };
    const bollard = (x, z) => { const X = cm(x), Z = cm(z); fc(X, 0, Z, X + 1, 4, Z + 1, B.STEEL); };
    // árbol detallado: tronco con raíces, ramas y copa en racimos con tonos variados
    const tree = (x, z, ht = 4.2, rad = 2.2, seed = 0) => {
      const X = cm(x), Z = cm(z), th = cm(ht);
      fc(X - 1, 0, Z - 1, X + 1, th, Z + 1, B.BARK);
      for (const [dx, dz] of [[-2, 0], [1, 0], [0, -2], [0, 1]]) setc(X + dx, 0, Z + dz, B.BARK);   // raíces
      const branches = 4 + Math.floor(hash(x, z, seed) * 3), tips = [];
      for (let k = 0; k < branches; k++) {
        const a = (k / branches) * Math.PI * 2 + hash(k, x, z) * 0.8, by = th - 6 - Math.floor(hash(z, k, x) * 5);
        const len = 6 + Math.floor(hash(k, z, 3) * 4);
        let bx = X, bz = Z, yy = by;
        for (let s = 0; s < len; s++) {
          bx = X + Math.round(Math.cos(a) * s * 0.9); bz = Z + Math.round(Math.sin(a) * s * 0.9); yy = by + Math.round(s * 0.7);
          if (yy < H - 2) setc(bx, yy, bz, B.BARK);
        }
        tips.push([bx, Math.min(yy, H - 6), bz]);
      }
      tips.push([X, Math.min(th + 4, H - 6), Z]);
      const rc = rad * C * 0.52;
      for (const [cx, cy, cz] of tips) {
        const rr = rc * (0.75 + hash(cx, cy, cz) * 0.45);
        for (let y = Math.floor(cy - rr * 0.7); y <= Math.ceil(cy + rr * 0.8); y++)
          for (let zz = Math.floor(cz - rr); zz <= Math.ceil(cz + rr); zz++)
            for (let xx = Math.floor(cx - rr); xx <= Math.ceil(cx + rr); xx++) {
              if (y < 0 || y >= H) continue;
              const dx = (xx - cx) / rr, dz = (zz - cz) / rr, dy = (y - cy) / (rr * 0.75);
              if (dx * dx + dy * dy + dz * dz < 1 - hash(xx, y, zz) * 0.3 && !getc(xx, y, zz)) setc(xx, y, zz, hash(xx >> 1, y >> 1, zz >> 1) < 0.12 ? B.MOSS : B.LEAF);
            }
      }
    };
    const busStop = (x, z, along, side) => {
      const X = cm(x), Z = cm(z), L = 16, Dp = 6;
      const P = (a, d, y, t) => along === 'x' ? setc(X + a, y, Z + d * side, t) : setc(X + d * side, y, Z + a, t);
      for (let a = 0; a < L; a++) for (let y = 0; y < 10; y++) P(a, 0, y, (a === 0 || a === L - 1 || a === 8 || y === 0) ? B.STEEL : B.GLASS);
      for (let d = 0; d < Dp; d++) for (let y = 1; y < 10; y++) P(0, d, y, d === 0 ? B.STEEL : y < 9 ? B.PANEL : B.STEEL);
      for (let a = 2; a < L - 2; a++) { P(a, 1, 2, B.PLANK); P(a, 2, 2, B.PLANK); }
      const cx0 = along === 'x' ? x + L / 8 : x + side * Dp / 8, cz0 = along === 'x' ? z + side * Dp / 8 : z + L / 8;
      dec(cx0, 2.56, cz0, along === 'x' ? L / 4 + 0.1 : Dp / 4 + 0.1, 0.1, along === 'x' ? Dp / 4 + 0.1 : L / 4 + 0.1, 0.18, 0.19, 0.21);
      light(along === 'x' ? x + 0.3 : x + side * 0.8, 2.2, along === 'x' ? z + side * 0.8 : z + 0.3, 3.5, [0.35, 0.45, 0.6]);
    };

    // Vehículos: coche, taxi, policía, chatarra y el autobús (por dentro se puede entrar)
    const vehicle = (x, z, ax, flip, kind) => {
      const isBus = kind === 'bus';
      const L = isBus ? 44 : 18, Wd = isBus ? 10 : 7;
      const x0 = Math.round(x * C - (ax ? L : Wd) / 2), z0 = Math.round(z * C - (ax ? Wd : L) / 2);
      const pos = (u, v) => { const uu = flip ? L - 1 - u : u; return [ax ? x0 + uu : x0 + v, ax ? z0 + v : z0 + uu]; };
      const put = (u, v, y, t) => { const [px, pz] = pos(u, v); setc(px, y, pz, t); };
      if (isBus) {
        const door = (u) => (u >= 5 && u < 10) || (u >= 30 && u < 35);
        for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) for (let y = 0; y < 12; y++) {
          const wheel = (u >= 5 && u < 10 || u >= 34 && u < 39) && (v === 0 || v === Wd - 1) && y < 2;
          let t = 0;
          const shell = u === 0 || u === L - 1 || v === 0 || v === Wd - 1;
          if (y === 0) t = B.TIRE;
          else if (y === 1) t = wheel ? B.TIRE : (shell ? B.CAR_W : B.ASPH);              // suelo del autobús
          else if (y === 11) t = B.CAR_W;                                                 // techo
          else if (shell) {
            t = B.CAR_W;
            if (y >= 3 && y < 5) t = B.CAR_B;
            if ((v === 0 || v === Wd - 1) && y >= 5 && y < 10 && u > 1 && u < L - 2 && u % 6 !== 0) t = B.GLASS;
            if (u === 0 && y >= 4 && y < 10 && v > 0 && v < Wd - 1) t = B.GLASS;
            if (u === L - 1 && y >= 6 && y < 9 && v > 1 && v < Wd - 2) t = B.GLASS;
            if (u === 0 && y === 10 && v > 1 && v < Wd - 2) t = B.PANEL;
            if (u === 0 && y === 2 && (v === 1 || v === Wd - 2)) t = B.LAMP;
            if (u === L - 1 && y === 2 && (v === 1 || v === Wd - 2)) t = B.NEON_R;
            if (v === 0 && door(u) && y >= 2 && y < 10) t = 0;                            // puertas abiertas
          } else {
            // asientos a los lados con pasillo central
            const side = v <= 2 || v >= Wd - 3, row = u >= 12 && u < L - 3 && (u - 12) % 3 !== 2;
            if (side && row && !(v <= 2 && door(u))) t = y <= 3 ? B.SOFA : (y <= 5 && (u - 12) % 3 === 1) ? B.SOFA : 0;
            if (u === 2 && v >= Wd - 3 && y <= 4) t = B.SOFA;                             // conductor
            if (u === 1 && y >= 4 && y <= 5 && v > 0 && v < Wd - 1) t = B.TIRE;           // salpicadero
            if ((v === 3 || v === Wd - 4) && u % 9 === 4 && u > 10) t = B.STEEL;           // barras
          }
          if (t) put(u, v, y, t);
        }
        const [cx, cz] = pos(L / 2, Wd / 2);
        light(cx / C, 2.4, cz / C, 5, [0.55, 0.65, 0.6], { broken: true });
        const [dx, dz] = pos(20, Wd / 2); chestSpot(dx / C, dz / C);
        return;
      }
      const paint = { police: B.CAR_K, taxi: B.CAR_Y, wreck: B.CHAR }[kind] || [B.CAR_R, B.CAR_B, B.CAR_W, B.CAR_K, B.CAR_W, B.CAR_B][Math.floor(hash(x, z, 1) * 6) % 6];
      const wreck = kind === 'wreck';
      for (let u = 0; u < L; u++) for (let v = 0; v < Wd; v++) {
        const wheel = (u >= 2 && u < 5 || u >= 13 && u < 16) && (v === 0 || v === Wd - 1);
        for (let y = 0; y < 8; y++) {
          let t = 0;
          if (wheel && y < 2) t = B.TIRE;
          else if (y === 0) t = B.TIRE;
          else if (y >= 1 && y < 4) t = paint;
          if (y === 1 && (u === 0 || u === L - 1) && !wheel) t = wreck ? B.CHAR : B.STEEL;
          if (y === 2 && u === 0 && (v === 1 || v === Wd - 2)) t = wreck ? B.CHAR : (kind === 'police' || hash(x, z, 4) < 0.3 ? B.LAMP : B.STEEL);
          if (y === 2 && u === L - 1 && (v === 1 || v === Wd - 2)) t = wreck ? B.CHAR : B.NEON_R;
          if (y >= 4 && y < 6 && u >= 5 && u < 13) {
            const side = v === 0 || v === Wd - 1, end = u === 5 || u === 12;
            if (side && (u === 5 || u === 9 || u === 12)) t = paint;
            else if (side || end) t = wreck ? (hash(u, y, v) < 0.5 ? B.CHAR : 0) : B.GLASS;
            else t = (v === 1 || v === Wd - 2) && y === 4 && u !== 8 ? B.SOFA : B.TIRE;
          }
          if (y === 6 && u >= 6 && u < 12 && v >= 1 && v < Wd - 1) t = paint;
          if (kind === 'police' && y >= 2 && y < 4 && u >= 6 && u < 12 && (v === 0 || v === Wd - 1)) t = B.CAR_W;
          if (kind === 'police' && y === 7 && u >= 8 && u < 10 && v >= 1 && v < Wd - 1) t = v < 3 ? B.NEON_R : v > 3 ? B.NEON_C : B.STEEL;
          if (kind === 'taxi' && y === 7 && u >= 8 && u < 10 && v >= 2 && v < Wd - 2) t = B.PANEL;
          if (t) { const [px, pz] = pos(u, v); if (!getc(px, y, pz)) setc(px, y, pz, t); }
        }
      }
      if (kind === 'police') light(x, 2.2, z, 9, [1, 0.1, 0.1], { siren: true });
      if (wreck) { r.features.push({ kind: 'flame', x: wx(x), y: 1.2, z: wz(z) }); light(x, 1.6, z, 7, [1.1, 0.5, 0.14], { flick: true }); }
    };

    // ------------------------------------------------------------------------
    // LAS CUATRO MANZANAS (simétricas respecto a la plaza)
    // Coordenadas de la manzana NO; las demás se obtienen reflejando en x y/o z.
    const QUADS = [
      { mx: false, mz: false, A1: 'tower', A2: 'cafe', B: 'super', style: 'glass', name: 'Torre Norte' },
      { mx: true, mz: false, A1: 'barblock', A2: 'farmacia', B: 'burger', style: 'brick' },
      { mx: false, mz: true, A1: 'garage', A2: 'armeria', B: 'bar', style: 'modern' },
      { mx: true, mz: true, A1: 'tower', A2: 'ropa', B: 'cafe', style: 'stone', name: 'Torre Sur' },
    ];
    const flipSide = (s, q) => (q.mx && s[0] === 'x') || (q.mz && s[0] === 'z') ? s[0] + (s[1] === 'p' ? 'n' : 'p') : s;
    const R4 = (q, x0, z0, x1, z1) => {
      const a = q.mx ? SIZE - x1 : x0, b = q.mx ? SIZE - x0 : x1, c = q.mz ? SIZE - z1 : z0, d = q.mz ? SIZE - z0 : z1;
      return [a, c, b, d];
    };
    const P4 = (q, x, z) => [q.mx ? SIZE - x : x, q.mz ? SIZE - z : z];
    QUADS.forEach((q, qi) => {
      // A1: esquina de la ronda (13 × 13 m)
      const [a0, a1, a2, a3] = R4(q, 28.5, 28.5, 41.5, 41.5);
      const f1 = flipSide('zn', q);
      if (q.A1 === 'tower') tower(a0, a1, a2, a3, 48 + qi * 4, f1, { style: q.style });
      else if (q.A1 === 'garage') { garage(a0, a1, a2, a3, f1); building(a0, a1, a2, a3, 3.1, 22, [f1, flipSide('xn', q)], q.style, { winFrom: 3.6 }); }
      else { shop(a0, a1, a2, a3, f1, 'bar', { upper: 24, faces: [f1, flipSide('xn', q)], style: q.style }); }
      // A2: mira a la plaza (sur en NO)
      const [b0, b1, b2, b3] = R4(q, 41.5, 28.5, 52.5, 40);
      shop(b0, b1, b2, b3, flipSide('zp', q), q.A2, { upper: 15 + hash(qi, 2, 3) * 8, faces: [flipSide('zp', q), flipSide('xp', q), flipSide('zn', q)], style: q.style === 'glass' ? 'stone' : q.style });
      // B: mira a la plaza (este en NO)
      const [c0, c1, c2, c3] = R4(q, 28.5, 41.5, 40, 52.5);
      shop(c0, c1, c2, c3, flipSide('xp', q), q.B, { upper: 13 + hash(qi, 5, 1) * 8, faces: [flipSide('xp', q), flipSide('zp', q), flipSide('xn', q)], style: qi % 2 ? 'stone' : 'brick' });
      // esquina libre entre A2, B y la plaza: maceteros y una papelera
      const [px, pz] = P4(q, 41, 41);
      fm(px - 0.5, 0, pz - 0.5, px + 0.5, 0.5, pz + 0.5, B.CBRICK); fm(px - 0.4, 0.5, pz - 0.4, px + 0.4, 1.1, pz + 0.4, B.LEAF);
      const [bx, bz] = P4(q, 53.5, 41); bin(bx, bz);
    });
    r.merchantSpots.push({ x: wx(48.3), z: wz(75.5), name: 'el quiosco de la plaza' });

    // ------------------------------------------------------------------------
    // LA PLAZA
    // monumento: tres escalones circulares, fuente y estatua sobre pedestal
    const CX = cm(60), CZ = cm(60);
    const disc = (rad, y0, y1, t, hole = 0) => {
      const R2 = (rad * C) ** 2, h2 = (hole * C) ** 2;
      for (let z = Math.floor(CZ - rad * C); z <= CZ + rad * C; z++) for (let x = Math.floor(CX - rad * C); x <= CX + rad * C; x++) {
        const d2 = (x + 0.5 - CX) ** 2 + (z + 0.5 - CZ) ** 2;
        if (d2 <= R2 && d2 >= h2) for (let y = y0; y < y1; y++) setc(x, y, z, t);
      }
    };
    disc(9, 0, 1, B.STONE); disc(8, 1, 2, B.STONE); disc(7, 2, 3, B.MARBLE);
    disc(5.2, 3, 6, B.STONE, 4.4);                 // pretil de la fuente
    disc(1.6, 3, 10, B.STONE);                      // pedestal
    disc(2, 9, 10, B.MARBLE);
    // agua de la fuente
    dec(60, 0.95 + 0.25, 60, 8.8, 0.08, 8.8, 0.04, 0.07, 0.1, -0.95);
    r.features.push({ kind: 'fountain', x: wx(60), y: 2.6, z: wz(60) });
    light(60, 1.7, 60, 7, [0.35, 0.55, 0.75]);
    // estatua: figura de pie con el brazo alzado sosteniendo una antorcha
    {
      const sx = CX, sz = CZ, y0 = 10, ST = B.MARBLE;
      fc(sx - 1, y0, sz - 1, sx + 2, y0 + 6, sz + 1, ST);          // piernas
      fc(sx - 2, y0 + 6, sz - 1, sx + 3, y0 + 11, sz + 2, ST);     // torso con túnica
      fc(sx - 1, y0 + 11, sz, sx + 2, y0 + 13, sz + 2, ST);        // cabeza
      fc(sx + 3, y0 + 8, sz, sx + 4, y0 + 14, sz + 1, ST);         // brazo alzado
      fc(sx - 3, y0 + 6, sz, sx - 2, y0 + 9, sz + 1, ST);          // brazo caído
      if (y0 + 15 < H) setc(sx + 3, Math.min(H - 1, y0 + 14), sz, B.LAMP);
    }
    // árboles en alcorques redondos, bancos mirando a la fuente y farolas fernandinas
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) / 8 * Math.PI * 2, tx = 60 + Math.cos(a) * 13.5, tz = 60 + Math.sin(a) * 13.5;
      const RX = cm(tx), RZ = cm(tz);
      for (let z = RZ - 6; z <= RZ + 6; z++) for (let x = RX - 6; x <= RX + 6; x++) {
        const d = Math.hypot(x - RX, z - RZ);
        if (d <= 6 && d > 4.8) { setc(x, 0, z, B.CBRICK); setc(x, 1, z, B.CBRICK); }
      }
      gm(tx - 1, tz - 1, tx + 1, tz + 1, G.SOIL);
      tree(tx, tz, 3.6 + hash(k, 1, 2) * 0.8, 2.3 + hash(k, 3, 1) * 0.5, k);
    }
    for (const [x, z, f] of [[60, 50.5, 'zp'], [60, 69.5, 'zn'], [50.5, 60, 'xp'], [69.5, 60, 'xn'], [52.6, 52.6, 'zp'], [67.4, 67.4, 'zn'], [52.6, 67.4, 'xp'], [67.4, 52.6, 'xn']]) bench(x, z, f);
    for (const [x, z] of [[47, 47], [47, 71], [73, 73], [60, 45.5], [60, 74.5], [45.5, 60], [74.5, 60]]) parkLamp(x, z);
    // bolardos donde las avenidas entran en la plaza
    for (let k = -3.2; k <= 3.4; k += 1.6) { bollard(AVC + k, PZ0 - 0.5); bollard(AVC + k, PZ1 + 0.3); bollard(PZ0 - 0.5, AVC + k); bollard(PZ1 + 0.3, AVC + k); }
    // templete de música (escalones, columnas y tejado) en la esquina NE de la plaza
    {
      const tx = cm(72), tz = cm(48), RR = 14;
      for (let z = tz - RR; z <= tz + RR; z++) for (let x = tx - RR; x <= tx + RR; x++) {
        const d = Math.hypot(x - tx, z - tz);
        if (d <= RR) for (let y = 0; y < 4; y++) setc(x, y, z, y === 3 ? B.PLANK : B.STONE);
        else if (d <= RR + 2 && x < tx - RR + 6 && Math.abs(z - tz) < 5) for (let y = 0; y < 2; y++) setc(x, y, z, B.STONE);   // escalón
      }
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2, cx = Math.round(tx + Math.cos(a) * (RR - 1)), cz = Math.round(tz + Math.sin(a) * (RR - 1));
        fc(cx, 4, cz, cx + 1, 18, cz + 1, B.STEEL);
        if (!(Math.cos(a) < -0.8)) { const nx = Math.round(tx + Math.cos(a + Math.PI / 8) * (RR - 1)), nz = Math.round(tz + Math.sin(a + Math.PI / 8) * (RR - 1)); setc(nx, 5, nz, B.STEEL); setc(nx, 6, nz, B.STEEL); }
      }
      for (let k = 0; k < 5; k++) dec(72, 4.6 + k * 0.32, 48, 7.8 - k * 1.5, 0.32, 7.8 - k * 1.5, 0.12 + k * 0.01, 0.16, 0.13);
      dec(72, 6.4, 48, 0.3, 0.6, 0.3, 0.3, 0.25, 0.1);
      light(72, 3.4, 48, 7, [0.9, 0.7, 0.4], { broken: true });
      r.merchantSpots.push({ x: wx(72), z: wz(48), name: 'el templete de la plaza' });
      chestSpot(73.5, 49.5);
    }
    // quiosco de prensa en la esquina SO
    {
      const X = cm(44.5), Z = cm(74.5);
      fc(X, 0, Z, X + 10, 10, Z + 8, B.CAR_B);
      fc(X + 1, 0, Z + 1, X + 9, 10, Z + 7, 0);
      fc(X + 9, 4, Z + 2, X + 10, 8, Z + 6, 0);
      fc(X + 1, 0, Z + 1, X + 2, 4, Z + 7, B.PLANK);
      fc(X + 3, 2, Z + 7, X + 8, 9, Z + 8, B.PRODUCT);
      fc(X - 1, 10, Z - 1, X + 11, 11, Z + 9, B.CAR_R);
      light(46.5, 2.5, 75.5, 5, [0.9, 0.75, 0.5]);
    }
    // parterres con flores en las esquinas libres
    for (const [x, z] of [[53, 76], [67, 76]]) {
      fm(x - 2, 0, z - 1, x + 2, 0.5, z + 1, B.CBRICK);
      for (let k = 0; k < 14; k++) { const fx = x - 1.6 + hash(k, x, 1) * 3.2, fz = z - 0.7 + hash(k, z, 2) * 1.4; fm(fx, 0.5, fz, fx + 0.25, 0.75, fz + 0.25, hash(k, 3, x) < 0.5 ? B.LEAF : B.PRODUCT); }
    }

    // ------------------------------------------------------------------------
    // Ronda y avenidas: farolas (muchas apagadas), semáforos, papeleras, bocas de riego
    let li = 0;
    for (const c of RING) {
      for (let t = E0 + 5; t < E1 - 4; t += 13) {
        if (Math.abs(t - c) < 9 || Math.abs(t - AVC) < 9 || Math.abs(t - RING[0]) < 7 || Math.abs(t - RING[1]) < 7) continue;
        const s = (li++ % 2) ? 1 : -1;
        lamp(c + s * 4.7, t, -s, 0, hash(c, t, 3) < 0.3);
        lamp(t + 0.3, c - s * 4.7, 0, s, hash(t, c, 5) < 0.3);
        if (hash(c, t, 8) < 0.35) bin(c - s * 4.9 + 0.2, t + 2.2);
        if (hash(t, c, 9) < 0.3) hydrant(t + 3, c + s * 4.6);
      }
    }
    for (const s of [-1, 1]) for (const t of [33, 87]) { lamp(AVC + s * 4.7, t, -s, 0, hash(s, t, 1) < 0.3); lamp(t, AVC + s * 4.7, 0, -s, hash(t, s, 2) < 0.3); }
    const traffic = (x, z, state) => {
      const X = cm(x), Z = cm(z);
      fc(X, 0, Z, X + 1, 14, Z + 1, B.STEEL);
      fc(X - 1, 14, Z - 1, X + 1, 20, Z + 1, B.TIRE);
      const t = [B.NEON_R, B.LAMP, B.NEON_G][state];
      setc(X - 1, 19 - state * 2, Z - 1, t); setc(X, 19 - state * 2, Z, t);
    };
    for (const c of RING) { traffic(AVC - 5.3, c - 5.3, 0); traffic(AVC + 5.2, c + 5.2, 2); traffic(c - 5.3, AVC + 5.2, 1); traffic(c + 5.2, AVC - 5.3, 0); }
    busStop(32, 92.2, 'x', 1);
    // pocos coches: alguno aparcado, un taxi, la policía en una esquina y chatarra ardiendo
    vehicle(78, 98.6, true, false, 'car');
    vehicle(23.6, 76, false, true, 'taxi');
    vehicle(97.4, 36, false, false, 'car');
    vehicle(84, 22.4, true, true, 'wreck');
    vehicle(24, 24.5, false, false, 'police');
    vehicle(62, 33, false, true, 'car');
    vehicle(33, 58.2, true, false, 'taxi');
    vehicle(97, 71, false, true, 'wreck');
    if (r._garage) { const [g0, g1, g2, g3] = r._garage; vehicle(g0 + 4, (g1 + g3) / 2 - 1.5, false, false, 'car'); vehicle(g2 - 4, (g1 + g3) / 2 + 1, false, true, 'taxi'); }
    // el autobús (se entra por las puertas abiertas)
    vehicle(40, 97.3, true, false, 'bus');
    r.merchantSpots.push({ x: wx(30), z: wz(94), name: 'la parada del autobús' });

    // ------------------------------------------------------------------------
    // Barricadas en las cuatro salidas y la calle que se pierde en la niebla
    const mouths = [
      { x: AVC, z: E0, ax: true, n: [0, 1] }, { x: AVC, z: E1, ax: true, n: [0, -1] },
      { x: E0, z: AVC, ax: false, n: [1, 0] }, { x: E1, z: AVC, ax: false, n: [-1, 0] },
    ];
    mouths.forEach((m, i) => {
      const along = (a, d) => m.ax ? [m.x + a, m.z + m.n[1] * d] : [m.x + m.n[0] * d, m.z + a];
      for (let a = -6.8; a < 6.8; a += 3.2) {
        const [px, pz] = along(a + 1.5, 0.9), hx = m.ax ? 1.5 : 0.35, hz = m.ax ? 0.35 : 1.5;
        if (hash(i, a, 3) < 0.75) fm(px - hx, 0, pz - hz, px + hx, 1, pz + hz, B.JERSEY);
        else fm(px - hx, 0, pz - hz, px + hx, 0.75, pz + hz, B.SANDBAG);
      }
      if (i === 1) { const [bx, bz] = along(-2.5, 3.2); vehicle(bx, bz, m.ax, true, 'police'); }
      else if (i === 3) { const [bx, bz] = along(3, 3.2); vehicle(bx, bz, m.ax, true, 'wreck'); }
      const [fx, fz] = along(4.5, 2.4);
      fm(fx - 0.3, 0, fz - 0.3, fx + 0.3, 0.9, fz + 0.3, B.STEEL);
      fm(fx - 0.25, 0.9, fz - 0.25, fx + 0.25, 1, fz + 0.25, B.FIRE);
      r.features.push({ kind: 'flame', x: wx(fx), y: 1.05, z: wz(fz), small: true });
      light(fx, 1.6, fz, 7, [1.2, 0.55, 0.16], { flick: true });
      const out = (d0, d1, a0, a1, y, h, c, e = 0) => {
        const [x0, z0] = along(a0, d0), [x1, z1] = along(a1, d1);
        dec((x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0) || 0.1, h, Math.abs(z1 - z0) || 0.1, c[0], c[1], c[2], e);
      };
      out(-1, -45, -4, 4, -0.12, 0.24, [0.06, 0.06, 0.07], -0.3);
      out(-1, -45, -7, -4, -0.1, 0.24, [0.13, 0.13, 0.12]);
      out(-1, -45, 4, 7, -0.1, 0.24, [0.13, 0.13, 0.12]);
      for (let d = -4; d > -44; d -= 4) out(d, d - 2, -0.07, 0.07, 0.006, 0.012, [0.38, 0.37, 0.3]);
      for (let d = -1; d > -44; d -= 11) {
        const hh = 12 + hash(i, d, 1) * 26, hh2 = 12 + hash(d, i, 2) * 26;
        const [ax0, az0] = along(-19, d), [ax1, az1] = along(-7, d - 11);
        building(Math.min(ax0, ax1), Math.min(az0, az1), Math.max(ax0, ax1), Math.max(az0, az1), 0, hh, m.ax ? ['xp'] : ['zp'], ['brick', 'stone', 'modern'][(i + Math.round(d)) % 3 < 0 ? 0 : (i + Math.round(-d)) % 3], { winFrom: 4 });
        const [bx0, bz0] = along(7, d), [bx1, bz1] = along(19, d - 11);
        building(Math.min(bx0, bx1), Math.min(bz0, bz1), Math.max(bx0, bx1), Math.max(bz0, bz1), 0, hh2, m.ax ? ['xn'] : ['zn'], ['stone', 'brick', 'modern'][(i + Math.round(-d)) % 3], { winFrom: 4 });
      }
      for (const a of [0, -4, 4]) r.spawns.push({ x: wx(along(a, 2.3)[0]), z: wz(along(a, 2.3)[1]), mouth: true });
    });

    // Fachadas del perímetro con estilos variados y una segunda fila de torres detrás
    const styles = ['brick', 'stone', 'modern', 'brick', 'stone', 'glass'];
    for (const side of ['xn', 'xp', 'zn', 'zp']) {
      let a = 2, k = 0;
      while (a < 118) {
        let w = 9 + Math.floor(hash(a, k, side.charCodeAt(1)) * 8);
        if (a < 60 && a + w > 53) w = Math.max(3, 53 - a);
        if (a >= 53 && a < 67) { a = 67; continue; }
        const st = styles[Math.floor(hash(a, w, side.charCodeAt(0)) * styles.length) % styles.length];
        const ht = 10 + hash(a, w, side.charCodeAt(0) + 1) * (st === 'glass' ? 40 : 24);
        const face = { xn: 'xp', xp: 'xn', zn: 'zp', zp: 'zn' }[side];
        let bx0, bz0, bx1, bz1;
        if (side === 'xn') { bx0 = E0 - 12; bx1 = E0; bz0 = a; bz1 = a + w; }
        else if (side === 'xp') { bx0 = E1; bx1 = E1 + 12; bz0 = a; bz1 = a + w; }
        else if (side === 'zn') { bz0 = E0 - 12; bz1 = E0; bx0 = a; bx1 = a + w; }
        else { bz0 = E1; bz1 = E1 + 12; bx0 = a; bx1 = a + w; }
        building(bx0, bz0, bx1, bz1, 0, ht, [face], st, { winFrom: 4.6 });
        const plane = { xn: E0, xp: E1, zn: E0, zp: E1 }[side], n = { xn: 1, xp: -1, zn: 1, zp: -1 }[side];
        storefront(side === 'xn' || side === 'xp' ? 'x' : 'z', plane, n, a, a + w, k);
        // separación entre edificios: una bajante y una línea vertical oscura
        if (side === 'xn' || side === 'xp') dec(plane + n * 0.06, ht / 2, a, 0.12, ht, 0.15, 0.05, 0.05, 0.05);
        else dec(a, ht / 2, plane + n * 0.06, 0.15, ht, 0.12, 0.05, 0.05, 0.05);
        a += w; k++;
      }
      for (let t = 0; t < 4; t++) {
        const a0 = 10 + t * 28 + hash(t, side.charCodeAt(1), 3) * 8, wd = 12 + hash(t, 2, side.charCodeAt(0)) * 8;
        const ht = 40 + hash(side.charCodeAt(1), t, 4) * 45;
        const face = { xn: 'xp', xp: 'xn', zn: 'zp', zp: 'zn' }[side];
        const o = { winFrom: 10, lit: 0.14, billboard: false };
        if (side === 'xn') building(-20, a0, -6, a0 + wd, 0, ht, [face], 'glass', o);
        else if (side === 'xp') building(126, a0, 140, a0 + wd, 0, ht, [face], 'glass', o);
        else if (side === 'zn') building(a0, -20, a0 + wd, -6, 0, ht, [face], 'glass', o);
        else building(a0, 126, a0 + wd, 140, 0, ht, [face], 'glass', o);
      }
    }

    // Alcantarillas (por donde salen los zombis)
    for (const [x, z] of [[38, 21], [82, 21], [21, 38], [21, 82], [99, 38], [99, 82], [38, 99], [82, 99]]) {
      dec(x, 0.008, z, 0.9, 0.016, 0.9, 0.04, 0.04, 0.045, -0.4);
      dec(x, 0.012, z, 0.6, 0.016, 0.6, 0.075, 0.075, 0.08, -0.4);
      r.spawns.push({ x: wx(x), z: wz(z) });
    }
    r.playerStart = { x: wx(60), z: wz(49) };
  }

  VX.City = {
    create() { const r = new CityRoom(); r.build(); return r; },
    G,
  };
})();
