// Objetos del escenario hechos con vóxeles finos (1/16 m): barriles, cajas, vasijas, lápidas,
// sarcófagos, estanterías, mesas… y decoración (velas, telarañas, cadenas, estandartes, huesos).
// - Los "props" son destructibles: las balas los van agujereando y al final revientan
//   (los barriles rojos explotan). Bloquean el paso con celdas invisibles del mundo (PROP).
// - La "decoración" es estática y no tiene colisión.
(function () {
  const M = VX.M;
  const S = VX.S;
  const PV = 1 / 16;
  VX.PV = PV;

  // ---------------- Modelado ----------------
  function mk(w, h, d) { return { w, h, d, fill: new Uint8Array(w * h * d), col: new Float32Array(w * h * d * 4) }; }
  const id = (m, i, j, k) => (j * m.d + k) * m.w + i;
  function put(m, i, j, k, c, e = 0, jit = 0.07, seed = 0) {
    if (i < 0 || j < 0 || k < 0 || i >= m.w || j >= m.h || k >= m.d) return;
    const n = id(m, i, j, k);
    const v = 1 + (M.hash3(i + seed * 31, j, k + seed * 17) - 0.5) * 2 * jit;
    m.fill[n] = 1;
    m.col[n * 4] = c[0] * v; m.col[n * 4 + 1] = c[1] * v; m.col[n * 4 + 2] = c[2] * v; m.col[n * 4 + 3] = e;
  }
  const filled = (m, i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < m.w && j < m.h && k < m.d && m.fill[id(m, i, j, k)];
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // gira el modelo q cuartos de vuelta alrededor de Y
  function rotate(m, q) {
    q = ((q % 4) + 4) % 4;
    if (!q) return m;
    const w = q % 2 ? m.d : m.w, d = q % 2 ? m.w : m.d;
    const o = mk(w, m.h, d);
    for (let j = 0; j < m.h; j++)
      for (let k = 0; k < m.d; k++)
        for (let i = 0; i < m.w; i++) {
          const n = id(m, i, j, k);
          if (!m.fill[n]) continue;
          let ni, nk;
          if (q === 1) { ni = m.d - 1 - k; nk = i; } else if (q === 2) { ni = m.w - 1 - i; nk = m.d - 1 - k; } else { ni = k; nk = m.w - 1 - i; }
          const t = id(o, ni, j, nk);
          o.fill[t] = 1;
          for (let c = 0; c < 4; c++) o.col[t * 4 + c] = m.col[n * 4 + c];
        }
    return o;
  }

  const WOOD = [0.38, 0.24, 0.13], WOOD_D = [0.24, 0.15, 0.08], WOOD_L = [0.5, 0.35, 0.2];
  const IRON = [0.2, 0.2, 0.22], STONE = [0.44, 0.43, 0.46], STONE_D = [0.25, 0.25, 0.28];
  const BONE = [0.84, 0.8, 0.68], MOSS = [0.26, 0.38, 0.16], FLAME = [1, 0.62, 0.2], WAX = [0.9, 0.85, 0.7];

  const MODELS = {
    // Barril de madera con flejes de hierro (0,6 x 0,8 m)
    barrel(v, opt) {
      const m = mk(10, 13, 10), c = 4.5;
      const red = opt === 'x';
      for (let j = 0; j < 13; j++) {
        const R = 4.05 + 0.85 * Math.sin(Math.PI * j / 12);
        for (let k = 0; k < 10; k++)
          for (let i = 0; i < 10; i++) {
            const dx = i - c, dz = k - c, r = Math.hypot(dx, dz);
            if (r > R) continue;
            const stave = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2) * 14);
            const shell = r > R - 1.3;
            let col, e = 0;
            if (j === 12) {
              col = r > R - 1.1 ? (red ? [0.4, 0.06, 0.05] : WOOD_D) : (red ? [0.55, 0.08, 0.06] : WOOD_L);
              if (!red && Math.abs(dx) < 0.6) col = WOOD_D;
            } else if (shell && (j === 1 || j === 2 || j === 10 || j === 11)) col = IRON;
            else if (red) {
              col = stave % 2 ? [0.62, 0.09, 0.07] : [0.54, 0.07, 0.06];
              if (j >= 5 && j <= 7 && shell) col = ((stave + j) % 4 < 2) ? [0.95, 0.74, 0.1] : [0.07, 0.07, 0.07];
            } else col = stave % 2 ? WOOD : mul(WOOD, 0.82);
            put(m, i, j, k, col, e, 0.06, v);
          }
      }
      return m;
    },

    // Caja de madera con marco y refuerzo en diagonal (0,6 m)
    // Caja de madera HUECA (al romperla se ve por dentro)
    crate(v) {
      const n = 10, m = mk(n, n, n);
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++)
          for (let i = 0; i < n; i++) {
            const ei = i === 0 || i === n - 1, ej = j === 0 || j === n - 1, ek = k === 0 || k === n - 1;
            const edges = ei + ej + ek;
            if (!edges) continue;
            let col = j % 3 === 0 ? mul(WOOD_L, 0.86) : WOOD_L;
            if (edges >= 2) col = WOOD_D;
            else if ((ek && (i === j || i === n - 1 - j)) || (ei && (k === j || k === n - 1 - j))) col = WOOD;
            put(m, i, j, k, col, 0, 0.06, v);
          }
      return m;
    },

    // Caja grande de carga (1 m), hueca, con listones y esquinas de hierro
    bigcrate(v) {
      const n = 16, h = 14, m = mk(n, h, n);
      for (let j = 0; j < h; j++)
        for (let k = 0; k < n; k++)
          for (let i = 0; i < n; i++) {
            const ei = i === 0 || i === n - 1, ej = j === 0 || j === h - 1, ek = k === 0 || k === n - 1;
            const edges = ei + ej + ek;
            if (!edges) continue;
            let col = (ek ? i : k) % 4 === 0 ? mul(WOOD, 0.8) : (v % 2 ? WOOD : mul(WOOD_L, 0.85));
            if (j === 1 || j === h - 2 || j === Math.floor(h / 2)) col = WOOD_D;              // listones
            const nearC = (i < 2 || i > n - 3) && (k < 2 || k > n - 3);
            if (edges >= 2 && (nearC || j < 2 || j > h - 3)) col = IRON;                      // esquinas de hierro
            if (edges >= 2 && !nearC && j >= 2 && j <= h - 3) col = WOOD_D;
            if (ej && j === h - 1 && Math.abs(i - n / 2) < 3 && Math.abs(k - n / 2) < 1) col = [0.6, 0.5, 0.2];   // marca
            put(m, i, j, k, col, 0, 0.05, v);
          }
      return m;
    },

    // Vasija de barro
    urn(v) {
      const prof = [2.2, 3.1, 3.7, 3.9, 3.9, 3.6, 3.0, 2.0, 1.6, 2.1];
      const m = mk(9, 10, 9), c = 4;
      const base = v % 2 ? [0.62, 0.33, 0.18] : [0.5, 0.36, 0.24];
      for (let j = 0; j < 10; j++)
        for (let k = 0; k < 9; k++)
          for (let i = 0; i < 9; i++) {
            const r = Math.hypot(i - c, k - c);
            if (r > prof[j]) continue;
            if (j === 9 && r < 1.2) continue;    // boca
            let col = base;
            if (j === 4) col = ((Math.atan2(k - c, i - c) * 3 | 0) % 2) ? [0.2, 0.12, 0.08] : mul(base, 1.25);
            if (j >= 8) col = mul(base, 1.15);
            put(m, i, j, k, col, 0, 0.07, v);
          }
      return m;
    },

    // Saco de arpillera
    sack(v) {
      const m = mk(9, 8, 8);
      for (let j = 0; j < 8; j++)
        for (let k = 0; k < 8; k++)
          for (let i = 0; i < 9; i++) {
            const R = j < 6 ? 4.2 - Math.max(0, j - 3) * 0.5 : 1.2;
            if (Math.hypot((i - 4) * 0.9, k - 3.5) > R) continue;
            put(m, i, j, k, j === 6 ? [0.35, 0.28, 0.16] : [0.62, 0.52, 0.34], 0, 0.1, v);
          }
      return m;
    },

    // Lápida (redondeada o en forma de cruz)
    tomb(v) {
      if (v % 3 === 2) {
        const m = mk(10, 17, 3);
        for (let j = 0; j < 17; j++)
          for (let k = 0; k < 3; k++)
            for (let i = 0; i < 10; i++) {
              const base = j < 3 && i >= 2 && i <= 7;
              const vert = i >= 4 && i <= 5;
              const hor = j >= 11 && j <= 12 && i >= 1 && i <= 8;
              if (!(base || vert || hor)) continue;
              put(m, i, j, k, j < 2 && M.hash3(i, j, k + v) < 0.5 ? MOSS : STONE, 0, 0.08, v);
            }
        return m;
      }
      const m = mk(12, 15, 5);
      for (let j = 0; j < 15; j++)
        for (let k = 0; k < 5; k++)
          for (let i = 0; i < 12; i++) {
            const plinth = j < 2;
            if (!plinth && (k === 0 || k === 4 || i === 0 || i === 11)) continue;
            if (!plinth && j > 9 && Math.hypot(i - 5.5, j - 9) > 4.6) continue;
            let col = STONE;
            if (k === 1 && !plinth && ((i >= 5 && i <= 6 && j >= 4 && j <= 11) || (j >= 9 && j <= 10 && i >= 3 && i <= 8))) col = STONE_D;
            if (k === 1 && j === 3 && i >= 3 && i <= 8 && i % 2) col = STONE_D;
            if (j < 3 && M.hash3(i, j, k + v) < 0.45) col = MOSS;
            put(m, i, j, k, col, 0, 0.08, v);
          }
      return m;
    },

    // Sarcófago de piedra con tapa tallada
    sarcophagus(v) {
      const m = mk(13, 9, 22);
      for (let j = 0; j < 9; j++)
        for (let k = 0; k < 22; k++)
          for (let i = 0; i < 13; i++) {
            const lid = j >= 7;
            if (!lid && (i === 0 || i === 12 || k === 0 || k === 21)) continue;
            let col = lid ? mul(STONE, 1.08) : STONE;
            if (!lid && (j === 1 || j === 5)) col = STONE_D;
            if (j === 8 && ((i === 6 && k >= 4 && k <= 17) || (k === 13 && i >= 3 && i <= 9))) col = [0.6, 0.5, 0.25];
            if (j < 2 && M.hash3(i, k, v) < 0.3) col = MOSS;
            put(m, i, j, k, col, 0, 0.06, v);
          }
      return m;
    },

    // Estantería con libros de colores
    shelf(v) {
      const m = mk(16, 30, 6);
      const BOOKS = [[0.5, 0.1, 0.1], [0.12, 0.25, 0.45], [0.18, 0.4, 0.18], [0.55, 0.42, 0.15], [0.35, 0.2, 0.4], [0.3, 0.22, 0.15]];
      for (let j = 0; j < 30; j++)
        for (let k = 0; k < 6; k++)
          for (let i = 0; i < 16; i++) {
            const frame = i === 0 || i === 15 || k === 0 || j === 0 || j === 29 || j % 7 === 0;
            if (frame) { put(m, i, j, k, k === 0 && !(i === 0 || i === 15) && j % 7 ? WOOD_D : WOOD, 0, 0.05, v); continue; }
            if (k === 5) continue;
            const shelfN = Math.floor(j / 7), bh = 3 + Math.floor(M.hash3(i, shelfN, v) * 4);
            if (j % 7 > bh || M.hash3(i, shelfN, v + 3) < 0.12) continue;
            put(m, i, j, k, BOOKS[Math.floor(M.hash3(i, shelfN, v + 7) * BOOKS.length)], 0, 0.05, v);
          }
      return m;
    },

    // Mesa de taberna
    table(v) {
      const m = mk(18, 11, 11);
      for (let j = 0; j < 11; j++)
        for (let k = 0; k < 11; k++)
          for (let i = 0; i < 18; i++) {
            const top = j >= 9;
            const leg = (i <= 1 || i >= 16) && (k <= 1 || k >= 9);
            const brace = j === 3 && (k === 5) && i > 1 && i < 16;
            if (!(top || leg || brace)) continue;
            put(m, i, j, k, top ? (k % 3 === 0 ? WOOD_D : WOOD_L) : WOOD, 0, 0.06, v);
          }
      return m;
    },

    // Banco de capilla
    bench(v) {
      const m = mk(22, 9, 6);
      for (let j = 0; j < 9; j++)
        for (let k = 0; k < 6; k++)
          for (let i = 0; i < 22; i++) {
            const seat = j === 3 || j === 4;
            const back = k === 5 && j > 4;
            const leg = (i <= 1 || i >= 20) && j < 4;
            if (!(seat || back || leg)) continue;
            put(m, i, j, k, back ? WOOD : WOOD_L, 0, 0.06, v);
          }
      return m;
    },

    // Yunque (forja)
    anvil(v) {
      const m = mk(14, 9, 6);
      for (let j = 0; j < 9; j++)
        for (let k = 0; k < 6; k++)
          for (let i = 0; i < 14; i++) {
            let ok = false;
            if (j < 2) ok = i >= 3 && i <= 10;
            else if (j < 6) ok = i >= 5 && i <= 8 && k >= 1 && k <= 4;
            else ok = (i >= 2 && i <= 11) || (i < 2 && j === 7 && k >= 2 && k <= 3);
            if (ok) put(m, i, j, k, [0.18, 0.18, 0.2], 0, 0.05, v);
          }
      return m;
    },

    // Brasero de hierro con brasas
    brazier(v) {
      const m = mk(10, 14, 10), c = 4.5;
      for (let j = 0; j < 14; j++)
        for (let k = 0; k < 10; k++)
          for (let i = 0; i < 10; i++) {
            const r = Math.hypot(i - c, k - c);
            if (j < 8) { if (r < 1.2 || (j < 2 && r < 3.2 && r > 2)) put(m, i, j, k, IRON, 0, 0.05, v); continue; }
            if (j < 11) {
              if (r > 4.6) continue;
              if (r > 3.6 || j === 8) put(m, i, j, k, IRON, 0, 0.05, v);
              else if (j === 10) put(m, i, j, k, M.hash3(i, k, v) < 0.5 ? [1, 0.45, 0.1] : [0.6, 0.15, 0.05], 1, 0.15, v);
              continue;
            }
            if (r < 2.6 - (j - 11) * 0.8 && M.hash3(i, j, k + v) < 0.6) put(m, i, j, k, j > 12 ? [1, 0.85, 0.35] : FLAME, 1, 0.1, v);
          }
      return m;
    },

    // ---------- Decoración ----------
    candles(v) {
      const m = mk(7, 9, 7);
      const cs = [[1, 1, 5], [4, 2, 7], [2, 4, 3], [5, 5, 4]];
      for (let n = 0; n < (v % 2 ? 4 : 3); n++) {
        const [ci, ck, h] = cs[n];
        for (let j = 0; j < h; j++) put(m, ci, j, ck, WAX, 0, 0.04, v);
        put(m, ci, h, ck, FLAME, 1, 0.1, v);
        if (h > 3) put(m, ci + 1, h - 2, ck, WAX, 0, 0.04, v);
      }
      return m;
    },

    skull(v) {
      const m = mk(5, 5, 6);
      for (let j = 0; j < 5; j++)
        for (let k = 0; k < 6; k++)
          for (let i = 0; i < 5; i++) {
            if (j === 0 && (k < 2 || i === 0 || i === 4)) continue;
            if (j === 4 && (i === 0 || i === 4 || k === 0 || k === 5)) continue;
            let col = BONE;
            if (k === 0 && j === 2 && (i === 1 || i === 3)) col = [0.05, 0.04, 0.04];
            if (k === 0 && j === 1 && i === 2) col = [0.1, 0.08, 0.07];
            put(m, i, j, k, col, 0, 0.05, v);
          }
      return m;
    },

    bones(v) {
      const m = mk(14, 3, 14);
      for (let b = 0; b < 5; b++) {
        const a = M.hash3(b, v, 1) * Math.PI, cx = 3 + M.hash3(b, v, 2) * 8, cz = 3 + M.hash3(b, v, 3) * 8;
        const L = 3 + M.hash3(b, v, 4) * 3, dx = Math.cos(a), dz = Math.sin(a);
        for (let t = -L; t <= L; t += 0.5) put(m, Math.round(cx + dx * t), 0, Math.round(cz + dz * t), BONE, 0, 0.06, v);
        for (const s of [-L, L]) { put(m, Math.round(cx + dx * s), 1, Math.round(cz + dz * s), BONE); put(m, Math.round(cx + dx * s - dz), 0, Math.round(cz + dz * s + dx), BONE); }
      }
      if (v % 2) { // calavera
        for (let j = 0; j < 3; j++) for (let k = 5; k < 9; k++) for (let i = 9; i < 12; i++) put(m, i, j, k, BONE, 0, 0.05, v);
        put(m, 9, 1, 5, [0.05, 0.04, 0.04]); put(m, 11, 1, 5, [0.05, 0.04, 0.04]);
      }
      return m;
    },

    rubble(v) {
      const m = mk(14, 4, 14);
      for (let n = 0; n < 9; n++) {
        const cx = 2 + M.hash3(n, v, 5) * 10, cz = 2 + M.hash3(n, v, 6) * 10, r = 1 + M.hash3(n, v, 7) * 1.8;
        for (let j = 0; j < 4; j++) for (let k = 0; k < 14; k++) for (let i = 0; i < 14; i++)
          if (Math.hypot(i - cx, (j + 0.5) * 1.6, k - cz) < r * 1.3) put(m, i, j, k, mul(STONE, 0.75 + M.hash3(n, 0, v) * 0.3), 0, 0.08, v);
      }
      return m;
    },

    puddle(v, opt) {
      const m = mk(20, 1, 16);
      const col = opt === 'acid' ? [0.15, 0.3, 0.1] : [0.06, 0.07, 0.09];
      for (let k = 0; k < 16; k++) for (let i = 0; i < 20; i++) {
        const n = M.vnoise(i / 5, k / 5, v * 13) + 0.4 - Math.hypot((i - 10) / 10, (k - 8) / 8) * 0.8;
        if (n > 0.35) put(m, i, 0, k, col, opt === 'acid' ? 0.15 : 0.02, 0.05, v);
      }
      return m;
    },

    straw(v) {
      const m = mk(16, 2, 14);
      for (let k = 0; k < 14; k++) for (let i = 0; i < 16; i++)
        if (Math.hypot((i - 8) / 8, (k - 7) / 7) < 0.9 + M.hash3(i, k, v) * 0.2) {
          put(m, i, 0, k, [0.62, 0.52, 0.22], 0, 0.15, v);
          if (M.hash3(i, k, v + 1) < 0.3) put(m, i, 1, k, [0.7, 0.6, 0.28], 0, 0.15, v);
        }
      return m;
    },

    // Cadena colgante (opt 'hook' = gancho al final)
    chain(v, opt) {
      const L = opt === 'hook' ? 22 : 18 + (v % 3) * 6;
      const m = mk(5, L, 5);
      for (let j = 0; j < L; j++) {
        const link = Math.floor(j / 3) % 2, edge = j % 3 !== 1;
        if (link) { put(m, 2, j, 1, IRON); put(m, 2, j, 3, IRON); if (edge) put(m, 2, j, 2, IRON); }
        else { put(m, 1, j, 2, IRON); put(m, 3, j, 2, IRON); if (edge) put(m, 2, j, 2, IRON); }
      }
      if (opt === 'hook') {
        for (let j = 0; j < 4; j++) put(m, 2, j, 2, [0.35, 0.33, 0.33]);
        put(m, 3, 0, 2, [0.35, 0.33, 0.33]); put(m, 4, 1, 2, [0.35, 0.33, 0.33]); put(m, 4, 2, 2, [0.35, 0.33, 0.33]);
      }
      return m;
    },

    // Telaraña de esquina (plano vertical)
    web(v) {
      const n = 14, m = mk(n, n, 1);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x = i, y = n - 1 - j;           // esquina arriba-izquierda
          const r = Math.hypot(x, y), a = Math.atan2(y, x);
          if (r > n - 0.5) continue;
          const radial = [0.12, 0.5, 0.9, 1.35].some((t) => Math.abs(a - t) < 0.55 / Math.max(1, r));
          const ring = [4, 8, 12].some((t) => Math.abs(r - t - (Math.sin(a * 6) * 0.4)) < 0.45);
          if (radial || ring) put(m, i, j, 0, [0.72, 0.72, 0.75], 0.05, 0.08, v);
        }
      return m;
    },

    // Estandarte de tela colgado de la pared
    banner(v) {
      const m = mk(10, 20, 1);
      const cloth = [[0.45, 0.05, 0.06], [0.1, 0.15, 0.35], [0.12, 0.28, 0.12]][v % 3];
      const gold = [0.75, 0.58, 0.18];
      for (let j = 0; j < 20; j++)
        for (let i = 0; i < 10; i++) {
          if (j === 19) { put(m, i, j, 0, WOOD_D); continue; }
          if (j < 4 && Math.abs(i - 4.5) < 4.5 - j * 1.2) continue;   // corte en V
          let col = cloth;
          if (i === 1 || i === 8) col = gold;
          // emblema: calavera estilizada
          const ex = i - 4.5, ey = j - 12;
          if (Math.hypot(ex, ey) < 2.6) col = gold;
          if ((j === 12 && (i === 3 || i === 6)) || (j === 10 && (i === 4 || i === 5))) col = cloth;
          put(m, i, j, 0, col, 0, 0.06, v);
        }
      return m;
    },

    // Soporte con espadas y lanzas
    rack(v) {
      const m = mk(16, 22, 3);
      for (let i = 0; i < 16; i++) { put(m, i, 4, 1, WOOD); put(m, i, 16, 1, WOOD); }
      for (let j = 0; j < 22; j++) { put(m, 0, j, 1, WOOD_D); put(m, 15, j, 1, WOOD_D); }
      for (let n = 0; n < 4; n++) {
        const x = 3 + n * 3;
        for (let j = 1; j < 20; j++) put(m, x, j, 0, j < 5 ? [0.3, 0.2, 0.12] : [0.65, 0.66, 0.7], 0, 0.04, v);
        put(m, x - 1, 5, 0, [0.5, 0.4, 0.15]); put(m, x + 1, 5, 0, [0.5, 0.4, 0.15]);
      }
      return m;
    },

    // Tubería de las cloacas (horizontal, a lo largo de X)
    pipe(v) {
      const L = 32, m = mk(L, 6, 6);
      for (let i = 0; i < L; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < 6; k++) {
        const r = Math.hypot(j - 2.5, k - 2.5);
        if (r > 2.9) continue;
        const ring = i % 8 === 0 || i % 8 === 1;
        put(m, i, j, k, ring ? [0.22, 0.24, 0.2] : [0.3, 0.36, 0.26], 0, 0.1, v);
        if (!ring && j === 0 && M.hash3(i, k, v) < 0.2) put(m, i, j, k, [0.25, 0.5, 0.15], 0.2);
      }
      return m;
    },
  };

  // ---------- Modelos nuevos (0.9) ----------
  Object.assign(MODELS, {
    // Lámpara de araña con velas (cuelga del techo)
    chandelier(v) {
      const m = mk(17, 26, 17), c = 8;
      for (let j = 4; j < 26; j++) { put(m, 8, j, 8, IRON); if (j % 3 === 0) put(m, 8, j, 9, IRON); }
      for (let k = 0; k < 17; k++) for (let i = 0; i < 17; i++) {
        const r = Math.hypot(i - c, k - c);
        if (Math.abs(r - 7.2) < 0.7) put(m, i, 1, k, IRON, 0, 0.05, v);
        if (r < 1.2) put(m, i, 2, k, IRON);
        if (Math.abs(i - c) < 0.5 && r < 7) put(m, i, 2, k, IRON);
        if (Math.abs(k - c) < 0.5 && r < 7) put(m, i, 2, k, IRON);
      }
      for (let n = 0; n < 8; n++) {
        const a = n / 8 * Math.PI * 2, i = Math.round(c + Math.cos(a) * 7.2), k = Math.round(c + Math.sin(a) * 7.2);
        put(m, i, 2, k, WAX); put(m, i, 3, k, WAX); put(m, i, 4, k, FLAME, 1);
      }
      return m;
    },

    // Vidriera de colores (emisiva, en lo alto de la pared)
    window(v) {
      const m = mk(16, 34, 1);
      const GL = [[0.9, 0.15, 0.15], [0.15, 0.35, 0.95], [0.95, 0.75, 0.15], [0.2, 0.75, 0.3], [0.6, 0.2, 0.8]];
      for (let j = 0; j < 34; j++)
        for (let i = 0; i < 16; i++) {
          const top = j > 25 && Math.hypot(i - 7.5, j - 25) > 8;
          if (top) continue;
          const lead = i === 0 || i === 15 || j === 0 || (j > 25 && Math.hypot(i - 7.5, j - 25) > 6.8) || i === 7 || i === 8 && false || j % 8 === 0;
          if (lead) { put(m, i, j, 0, [0.12, 0.12, 0.13]); continue; }
          const cell = Math.floor(i / 4) + Math.floor(j / 8) * 3 + v;
          put(m, i, j, 0, GL[cell % GL.length], 0.85, 0.12, v);
        }
      return m;
    },

    // Estatua de caballero sobre pedestal
    statue(v) {
      const m = mk(16, 44, 12), ST = mul(STONE, 1.1);
      const box = (i0, j0, k0, i1, j1, k1, c = ST) => { for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) put(m, i, j, k, c, 0, 0.06, v); };
      box(0, 0, 0, 15, 7, 11, STONE_D);   // pedestal
      box(1, 8, 1, 14, 8, 10, STONE);
      box(4, 9, 4, 6, 20, 7); box(9, 9, 4, 11, 20, 7);   // piernas
      box(3, 21, 3, 12, 31, 8);           // torso
      box(1, 22, 4, 2, 30, 7); box(13, 22, 4, 14, 30, 7);  // brazos
      box(5, 32, 4, 10, 37, 8);           // yelmo
      box(7, 34, 3, 8, 35, 3, STONE_D);   // visera
      box(6, 38, 5, 9, 39, 7);            // cimera
      // espada clavada delante, sujeta con las dos manos
      box(7, 9, 1, 8, 24, 1, [0.55, 0.56, 0.6]); box(5, 24, 1, 10, 24, 2, [0.55, 0.56, 0.6]); box(7, 25, 1, 8, 27, 2, [0.35, 0.28, 0.2]);
      box(2, 25, 1, 13, 26, 2);           // antebrazos hacia la empuñadura
      return m;
    },

    // Árbol seco (claustro)
    tree(v) {
      const m = mk(24, 48, 24), c = 11.5, BARK = [0.2, 0.15, 0.11];
      for (let j = 0; j < 28; j++) {
        const r = j < 3 ? 3.2 : 2.2 - j * 0.02;
        for (let k = 0; k < 24; k++) for (let i = 0; i < 24; i++) if (Math.hypot(i - c, k - c) < r) put(m, i, j, k, BARK, 0, 0.1, v);
      }
      const branch = (a, el, len, j0) => {
        for (let t = 0; t < len; t += 0.5) {
          const i = Math.round(c + Math.cos(a) * t * Math.cos(el)), k = Math.round(c + Math.sin(a) * t * Math.cos(el)), j = Math.round(j0 + t * Math.sin(el));
          put(m, i, j, k, BARK, 0, 0.1, v);
          if (t < len * 0.4) put(m, i, j + 1, k, BARK, 0, 0.1, v);
        }
      };
      for (let n = 0; n < 7; n++) branch(n * 0.9 + v, 0.5 + M.hash3(n, v, 1) * 0.6, 8 + M.hash3(n, v, 2) * 5, 16 + n * 1.6);
      return m;
    },

    // Fuente de piedra con agua
    fountain(v) {
      const n = 44, m = mk(n, 30, n), c = n / 2 - 0.5;
      for (let j = 0; j < 30; j++) for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) {
        const r = Math.hypot(i - c, k - c);
        if (j < 8 && r < 21.5 && r > 18.5) put(m, i, j, k, j === 7 ? mul(STONE, 1.15) : STONE, 0, 0.06, v);
        else if (j < 2 && r <= 18.5) put(m, i, j, k, STONE_D);
        else if (j >= 2 && j < 6 && r <= 18.5 && r > 3) { if (j === 5) put(m, i, j, k, [0.1, 0.22, 0.3], 0.15, 0.1, v); }
        else if (j < 22 && r < 2.6) put(m, i, j, k, STONE, 0, 0.06, v);
        else if (j >= 18 && j < 21 && r < 8 && r > 2) put(m, i, j, k, j === 20 && r < 7 ? [0.12, 0.26, 0.35] : STONE, j === 20 ? 0.15 : 0, 0.06, v);
        else if (j >= 22 && r < 1.5 && j < 25) put(m, i, j, k, [0.3, 0.6, 0.8], 0.3, 0.1, v);
      }
      return m;
    },

    // Columna caída (tambores de piedra en el suelo, a lo largo de X)
    fallen(v) {
      const L = 40, m = mk(L, 14, 14), c = 6.5;
      for (let i = 0; i < L; i++) {
        if (i % 11 === 10 && M.hash3(i, v, 0) < 0.6) continue;   // juntas entre tambores
        for (let j = 0; j < 14; j++) for (let k = 0; k < 14; k++) {
          const r = Math.hypot(j - c, k - c);
          if (r > 6.6 || (i > L - 5 && M.hash3(i, j, k + v) < 0.5)) continue;
          const flute = Math.floor((Math.atan2(k - c, j - c) + Math.PI) / (Math.PI * 2) * 16) % 2;
          put(m, i, j, k, r > 5.8 && flute ? mul(STONE, 0.85) : mul(STONE, 1.08), 0, 0.05, v);
        }
      }
      return m;
    },

    // Barricada de madera con estacas
    barricade(v) {
      const m = mk(30, 14, 12);
      for (let i = 0; i < 30; i++) for (let j = 0; j < 14; j++) for (let k = 0; k < 12; k++) {
        const t = (i % 10) / 10;
        const stakeA = Math.abs((j - k) - 1) < 1.2 && i % 10 < 2;
        const stakeB = Math.abs((j - (11 - k)) - 1) < 1.2 && i % 10 > 4 && i % 10 < 7;
        const rail = (j === 4 || j === 5) && k >= 5 && k <= 6;
        if (stakeA || stakeB || rail) put(m, i, j, k, j > 11 ? WOOD_L : rail ? WOOD_D : WOOD, 0, 0.08, v);
        void t;
      }
      return m;
    },

    // Alfombra (tira larga a lo largo de Z)
    carpet(v) {
      const m = mk(16, 1, 64);
      for (let k = 0; k < 64; k++) for (let i = 0; i < 16; i++) {
        const border = i < 2 || i > 13;
        put(m, i, 0, k, border ? [0.6, 0.45, 0.15] : (k % 8 === 4 && i === 8 ? [0.6, 0.45, 0.15] : [0.42, 0.05, 0.06]), 0, 0.05, v);
      }
      return m;
    },
  });

  // ---------- Modelos de las salas temáticas (0.10) ----------
  Object.assign(MODELS, {
    chair(v) {
      const m = mk(8, 15, 8);
      for (let j = 0; j < 15; j++) for (let k = 0; k < 8; k++) for (let i = 0; i < 8; i++) {
        const leg = (i <= 1 || i >= 6) && (k <= 1 || k >= 6) && j < 7;
        const seat = j === 7 || j === 8;
        const back = k >= 6 && j > 8 && (i <= 1 || i >= 6 || j === 13 || j === 14 || j === 11);
        if (leg || seat || back) put(m, i, j, k, seat ? WOOD_L : WOOD, 0, 0.06, v);
      }
      return m;
    },
    // Caldero con brebaje verde burbujeante
    cauldron(v) {
      const m = mk(14, 11, 14), c = 6.5;
      for (let j = 0; j < 11; j++) for (let k = 0; k < 14; k++) for (let i = 0; i < 14; i++) {
        const r = Math.hypot(i - c, k - c);
        const R = j < 2 ? 4 + j : j > 8 ? 5.6 : 6.4;
        if (j < 2 && (i + k) % 5 === 0 && r < 5.5 && r > 4) { put(m, i, j, k, IRON); continue; }   // patas
        if (j < 1) continue;
        if (r > R) continue;
        if (r > R - 1.2 || j === 1) put(m, i, j, k, [0.14, 0.14, 0.15], 0, 0.06, v);
        else if (j === 8) put(m, i, j, k, M.hash3(i, k, v) < 0.3 ? [0.6, 1, 0.3] : [0.25, 0.75, 0.15], 0.8, 0.1, v);
      }
      return m;
    },
    // Frascos y redomas de colores
    flasks(v) {
      const m = mk(12, 9, 8);
      const COL = [[0.9, 0.2, 0.2], [0.2, 0.5, 1], [0.4, 1, 0.3], [0.9, 0.6, 0.1], [0.8, 0.3, 1]];
      for (let n = 0; n < 5; n++) {
        const ci = 1 + (n * 5) % 10, ck = 1 + (n * 3) % 6, h = 3 + (n + v) % 4, c = COL[(n + v) % COL.length];
        for (let j = 0; j < h; j++) {
          const w = j < h - 2 ? 1 : 0;
          for (let di = 0; di <= w; di++) for (let dk = 0; dk <= w; dk++) put(m, ci + di, j, ck + dk, j < h - 2 ? c : [0.7, 0.75, 0.8], j < h - 2 ? 0.6 : 0.1, 0.05, v);
        }
        put(m, ci, h, ck, [0.45, 0.32, 0.2]);
      }
      return m;
    },
    // Trono
    throne(v) {
      const m = mk(16, 34, 14);
      const GOLD = [0.8, 0.6, 0.18], RED = [0.5, 0.06, 0.08];
      for (let j = 0; j < 34; j++) for (let k = 0; k < 14; k++) for (let i = 0; i < 16; i++) {
        const base = j < 3;
        const seat = j >= 3 && j < 10 && k < 11;
        const arm = j >= 10 && j < 15 && (i < 3 || i > 12) && k < 11;
        const back = k >= 11 && j < 34 - Math.abs(i - 7.5) * 0.6;
        if (!(base || seat || arm || back)) continue;
        let c = mul(STONE, 0.9);
        if (back && i > 2 && i < 13 && j > 12 && j < 30 && k === 11) c = RED;
        if (seat && j === 9 && i > 1 && i < 14) c = RED;
        if ((back && (i === 0 || i === 15 || j > 30 - Math.abs(i - 7.5) * 0.6)) || (arm && j === 14)) c = GOLD;
        put(m, i, j, k, c, 0, 0.05, v);
      }
      return m;
    },
    // Horno de forja con boca de fuego
    furnace(v) {
      const m = mk(20, 30, 16);
      for (let j = 0; j < 30; j++) for (let k = 0; k < 16; k++) for (let i = 0; i < 20; i++) {
        const chimney = j >= 18 && (i < 6 || i > 13 || k > 11);
        if (j >= 18 && !chimney) continue;
        if (j >= 18 && (i < 5 || i > 14)) continue;
        const mouth = k < 3 && i > 5 && i < 14 && j > 3 && j < 12;
        if (mouth && k < 2) continue;
        let c = (j + (i >> 1)) % 4 === 0 ? [0.22, 0.13, 0.1] : [0.38, 0.2, 0.14];
        let e = 0;
        if (mouth) { c = M.hash3(i, j, v) < 0.5 ? [1, 0.5, 0.1] : [1, 0.8, 0.3]; e = 1; }
        put(m, i, j, k, c, e, 0.08, v);
      }
      return m;
    },
    // Chimenea de piedra con fuego
    fireplace(v) {
      const m = mk(26, 30, 8);
      for (let j = 0; j < 30; j++) for (let k = 0; k < 8; k++) for (let i = 0; i < 26; i++) {
        const opening = i > 5 && i < 20 && j < 14 && k < 6;
        const hood = j >= 14 && j < 18;
        if (opening) {
          if (j < 2 && k > 1 && k < 5 && (i % 4 < 2)) put(m, i, j, k, [0.2, 0.13, 0.08]);   // leños
          else if (j >= 2 && j < 7 && M.hash3(i, j, k + v) < 0.35 - (j - 2) * 0.06) put(m, i, j, k, j > 4 ? [1, 0.8, 0.3] : FLAME, 1, 0.1, v);
          continue;
        }
        if (j >= 18 && (i < 7 || i > 18)) continue;
        put(m, i, j, k, hood ? mul(STONE, 1.1) : STONE, 0, 0.07, v);
      }
      return m;
    },
    // Jaula colgante (con cadena arriba)
    cage(v) {
      const m = mk(16, 40, 16);
      for (let j = 26; j < 40; j++) { put(m, 8, j, 8, IRON); if (j % 3 === 0) put(m, 8, j, 7, IRON); }
      for (let j = 0; j < 26; j++) for (let k = 0; k < 16; k++) for (let i = 0; i < 16; i++) {
        const edge = i === 0 || i === 15 || k === 0 || k === 15;
        const cap = j === 0 || j === 1 || j === 24 || j === 25;
        if (cap || (edge && ((i + k) % 3 === 0))) put(m, i, j, k, [0.2, 0.19, 0.2], 0, 0.05, v);
      }
      if (v % 2) for (let j = 2; j < 7; j++) for (let i = 6; i < 10; i++) put(m, i, j, 7, BONE, 0, 0.05, v);   // restos
      return m;
    },
    // Cofre del tesoro
    chest(v) {
      const m = mk(14, 10, 9);
      for (let j = 0; j < 10; j++) for (let k = 0; k < 9; k++) for (let i = 0; i < 14; i++) {
        if (j > 6 && Math.hypot(k - 4, j - 6) > 4.4) continue;
        let c = WOOD;
        if (i === 0 || i === 13 || i === 6 || i === 7 || j === 6) c = [0.8, 0.62, 0.2];
        if (k === 0 && j === 5 && (i === 6 || i === 7)) c = [0.15, 0.12, 0.08];
        put(m, i, j, k, c, 0, 0.05, v);
      }
      return m;
    },
  });

  // ---------- Minas, jardín fúngico y vacío (0.13) ----------
  Object.assign(MODELS, {
    // Vagoneta de mina
    cart(v) {
      const m = mk(14, 13, 20);
      for (let j = 0; j < 13; j++) for (let k = 0; k < 20; k++) for (let i = 0; i < 14; i++) {
        const wheel = j < 4 && (k < 5 || k > 14) && (i === 0 || i === 13) && Math.hypot(j - 1.5, (k < 5 ? k - 2 : k - 17)) < 2.2;
        const body = j >= 3 && (i <= 1 || i >= 12 || k <= 1 || k >= 18 || j === 3);
        const ore = j >= 9 && j <= 11 && i > 1 && i < 12 && k > 1 && k < 18 && M.hash3(i, j + v, k) < 0.6 - (j - 9) * 0.2;
        if (wheel) put(m, i, j, k, IRON);
        else if (body) put(m, i, j, k, (j === 3 || j === 12 || k === 0 || k === 19) ? [0.25, 0.25, 0.27] : WOOD, 0, 0.07, v);
        else if (ore) put(m, i, j, k, M.hash3(i, k, v) < 0.2 ? [0.3, 0.7, 1] : [0.28, 0.25, 0.22], M.hash3(i, k, v) < 0.2 ? 0.6 : 0, 0.1, v);
      }
      return m;
    },
    // Raíles con traviesas (a lo largo de Z)
    rails(v) {
      const m = mk(16, 2, 64);
      for (let k = 0; k < 64; k++) {
        if (k % 6 < 2) for (let i = 0; i < 16; i++) put(m, i, 0, k, WOOD_D, 0, 0.08, v);
        put(m, 2, 1, k, [0.32, 0.3, 0.3]); put(m, 13, 1, k, [0.32, 0.3, 0.3]);
      }
      return m;
    },
    // Racimo de cristales (brillan)
    crystal(v) {
      const m = mk(14, 24, 14);
      const COL = [[0.35, 0.75, 1], [0.75, 0.4, 1], [0.4, 1, 0.75]][v % 3];
      for (let n = 0; n < 6; n++) {
        const cx = 3 + M.hash3(n, v, 1) * 8, cz = 3 + M.hash3(n, v, 2) * 8, h = 8 + M.hash3(n, v, 3) * 15, r0 = 1.2 + M.hash3(n, v, 4) * 1.4;
        const lean = (M.hash3(n, v, 5) - 0.5) * 0.5;
        for (let j = 0; j < h; j++) {
          const r = r0 * (1 - Math.max(0, j - h + 4) / 4);
          const ox = cx + lean * j;
          for (let k = 0; k < 14; k++) for (let i = 0; i < 14; i++) if (Math.abs(i - ox) + Math.abs(k - cz) < r * 1.3) put(m, i, j, k, mul(COL, 0.6 + j / h * 0.5), 0.75, 0.1, v);
        }
      }
      for (let k = 0; k < 14; k++) for (let i = 0; i < 14; i++) if (Math.hypot(i - 6.5, k - 6.5) < 6 && M.hash3(i, k, v) < 0.5) put(m, i, 0, k, [0.25, 0.23, 0.22]);
      return m;
    },
    // Seta gigante con sombrero moteado que brilla
    mushroom(v) {
      const m = mk(30, 40, 30), c = 14.5;
      const CAP = [[0.45, 0.15, 0.45], [0.15, 0.3, 0.45], [0.5, 0.25, 0.1]][v % 3];
      for (let j = 0; j < 40; j++) for (let k = 0; k < 30; k++) for (let i = 0; i < 30; i++) {
        const r = Math.hypot(i - c, k - c);
        if (j < 30 && r < 2.8 + (j < 3 ? 1.2 - j * 0.4 : 0)) { put(m, i, j, k, [0.78, 0.74, 0.62], 0, 0.06, v); continue; }
        if (j >= 26) {
          const R = 14.5 * Math.sqrt(Math.max(0, 1 - ((j - 26) / 13) ** 2));
          if (r < R && r > R - 2.2) {
            const spot = M.hash3(i >> 1, j >> 1, (k >> 1) + v) < 0.12;
            put(m, i, j, k, spot ? [0.6, 1, 0.9] : CAP, spot ? 0.9 : 0.05, 0.08, v);
          } else if (j === 26 && r < R) put(m, i, j, k, mul(CAP, 0.5), 0.15);   // láminas
        }
      }
      return m;
    },
    // Setas pequeñas luminosas
    shrooms(v) {
      const m = mk(12, 8, 12);
      for (let n = 0; n < 5; n++) {
        const ci = 2 + ((n * 7 + v) % 8), ck = 2 + ((n * 5 + v * 3) % 8), h = 2 + (n + v) % 4;
        for (let j = 0; j < h; j++) put(m, ci, j, ck, [0.8, 0.78, 0.7]);
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) put(m, ci + a, h, ck + b, n % 2 ? [0.3, 0.9, 1] : [0.85, 0.4, 1], 0.9, 0.1, v);
      }
      return m;
    },
  });

  // ---------------- Definiciones ----------------
  // Todo se puede romper. collide: bloquea el paso · loot: probabilidad de soltar oro al destrozarlo
  // anchor: 'bottom' (se apoya en el suelo), 'top' (cuelga), 'none' (pegado a la pared)
  // soft: las balas lo atraviesan (telarañas, charcos, paja…) · mat: sonido y dureza
  const DEFS = {
    barrel: { model: 'barrel', collide: true, loot: 0.35, mat: 'wood' },
    xbarrel: { model: 'barrel', opt: 'x', hp: 22, collide: true, explosive: true, mat: 'wood' },
    crate: { model: 'crate', collide: true, loot: 0.5, mat: 'wood' },
    bigcrate: { model: 'bigcrate', collide: true, loot: 0.8, mat: 'wood' },
    urn: { model: 'urn', collide: true, loot: 0.6, mat: 'clay' },
    sack: { model: 'sack', collide: true, loot: 0.3, mat: 'cloth' },
    tomb: { model: 'tomb', collide: true, loot: 0.15, mat: 'stone' },
    sarcophagus: { model: 'sarcophagus', collide: true, loot: 1, mat: 'stone' },
    shelf: { model: 'shelf', collide: true, loot: 0.3, mat: 'wood', alongY: true },
    table: { model: 'table', collide: true, mat: 'wood' },
    bench: { model: 'bench', collide: true, mat: 'wood' },
    anvil: { model: 'anvil', collide: true, mat: 'metal' },
    brazier: { model: 'brazier', collide: true, mat: 'metal' },
    statue: { model: 'statue', collide: true, mat: 'stone', loot: 0.3, alongY: true },
    tree: { model: 'tree', collide: true, mat: 'wood' },
    fountain: { model: 'fountain', collide: true, mat: 'stone' },
    fallen: { model: 'fallen', collide: true, mat: 'stone' },
    barricade: { model: 'barricade', collide: true, mat: 'wood' },
    // decoración (sin colisión, también se rompe)
    candles: { model: 'candles', mat: 'clay' }, skull: { model: 'skull', mat: 'clay' }, bones: { model: 'bones', mat: 'clay' },
    rubble: { model: 'rubble', mat: 'stone' }, puddle: { model: 'puddle', soft: true, anchor: 'none' }, acidpuddle: { model: 'puddle', opt: 'acid', soft: true, anchor: 'none' },
    straw: { model: 'straw', soft: true, mat: 'cloth' }, chain: { model: 'chain', anchor: 'top', mat: 'metal' }, hook: { model: 'chain', opt: 'hook', anchor: 'top', mat: 'metal' },
    web: { model: 'web', soft: true, anchor: 'none', mat: 'cloth' }, banner: { model: 'banner', anchor: 'top', mat: 'cloth' }, rack: { model: 'rack', anchor: 'none', mat: 'wood' },
    pipe: { model: 'pipe', anchor: 'none', mat: 'metal' }, chandelier: { model: 'chandelier', anchor: 'top', mat: 'metal' },
    window: { model: 'window', anchor: 'none', mat: 'glass' }, carpet: { model: 'carpet', soft: true, anchor: 'none', mat: 'cloth' },
    chair: { model: 'chair', mat: 'wood' }, cauldron: { model: 'cauldron', collide: true, mat: 'metal' }, flasks: { model: 'flasks', mat: 'glass' },
    throne: { model: 'throne', collide: true, mat: 'stone', loot: 1 }, furnace: { model: 'furnace', collide: true, mat: 'stone' },
    fireplace: { model: 'fireplace', collide: true, mat: 'stone' }, cage: { model: 'cage', anchor: 'top', mat: 'metal' },
    chest: { model: 'chest', collide: true, mat: 'wood', loot: 1, treasure: true },
    piece: { model: null, mat: 'wood', anchor: 'bottom' },   // trozo que se ha caído y se ha quedado en el suelo
    cart: { model: 'cart', collide: true, mat: 'wood', loot: 0.5 }, rails: { model: 'rails', soft: true, anchor: 'none', mat: 'metal' },
    crystal: { model: 'crystal', collide: true, mat: 'glass', alongY: true }, mushroom: { model: 'mushroom', collide: true, core: 0.3, mat: 'cloth', alongY: true },
    shrooms: { model: 'shrooms', mat: 'cloth' },
  };

  const cache = {};
  function getModel(type, variant, rot) {
    const def = DEFS[type];
    const key = def.model + ':' + (def.opt || '') + ':' + variant + ':' + rot;
    if (!cache[key]) cache[key] = rotate(MODELS[def.model](variant, def.opt), rot);
    return cache[key];
  }

  // Modelo de caja maciza (vigas y postes de madera)
  function boxModel(w, h, d, c) {
    const m = mk(w, h, d);
    for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) {
      const grain = ((w > h && w > d ? j + k : i + k) % 3 === 0) ? 0.85 : 1;
      put(m, i, j, k, mul(c, grain), 0, 0.05);
    }
    return m;
  }

  // Genera cajas para una rejilla de vóxeles finos, fusionando tiras a lo largo de X
  function emitGrid(batch, w, h, d, fill, col, ox, oy, oz, flash = false, alongY = false) {
    if (alongY) return emitGridY(batch, w, h, d, fill, col, ox, oy, oz, flash);
    const has = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < w && j < h && k < d && fill[(j * d + k) * w + i];
    const near = (a, b) => Math.abs(col[a * 4] - col[b * 4]) < 0.045 && Math.abs(col[a * 4 + 1] - col[b * 4 + 1]) < 0.045 &&
      Math.abs(col[a * 4 + 2] - col[b * 4 + 2]) < 0.045 && col[a * 4 + 3] === col[b * 4 + 3];
    for (let j = 0; j < h; j++) {
      const ao = 0.78 + 0.22 * Math.min(1, (j + 1) / 4);
      for (let k = 0; k < d; k++) {
        let i = 0;
        while (i < w) {
          const n = (j * d + k) * w + i;
          if (!fill[n]) { i++; continue; }
          let len = 1, exposed = false;
          for (;;) {
            const ii = i + len - 1;
            if (!exposed && !(has(ii + 1, j, k) && has(ii - 1, j, k) && has(ii, j + 1, k) && has(ii, j - 1, k) && has(ii, j, k + 1) && has(ii, j, k - 1))) exposed = true;
            const nn = n + len;
            if (i + len < w && fill[nn] && near(n, nn)) len++; else break;
          }
          if (exposed) {
            let r = col[n * 4] * ao, g = col[n * 4 + 1] * ao, b = col[n * 4 + 2] * ao;
            if (flash) { r = Math.min(1, r + 0.4); g += 0.15; }
            batch.box(ox + (i + len / 2) * PV, oy + (j + 0.5) * PV, oz + (k + 0.5) * PV, PV * len * 1.001, PV * 1.002, PV * 1.002, r, g, b, col[n * 4 + 3]);
          }
          i += len;
        }
      }
    }
  }

  // Igual que emitGrid pero fusionando tiras verticales (estanterías: cada libro es una tira)
  function emitGridY(batch, w, h, d, fill, col, ox, oy, oz, flash) {
    const has = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < w && j < h && k < d && fill[(j * d + k) * w + i];
    const near = (a, b) => Math.abs(col[a * 4] - col[b * 4]) < 0.045 && Math.abs(col[a * 4 + 1] - col[b * 4 + 1]) < 0.045 &&
      Math.abs(col[a * 4 + 2] - col[b * 4 + 2]) < 0.045 && col[a * 4 + 3] === col[b * 4 + 3];
    const step = w * d;
    for (let k = 0; k < d; k++)
      for (let i = 0; i < w; i++) {
        let j = 0;
        while (j < h) {
          const n = (j * d + k) * w + i;
          if (!fill[n]) { j++; continue; }
          let len = 1, exposed = false;
          for (;;) {
            const jj = j + len - 1;
            if (!exposed && !(has(i + 1, jj, k) && has(i - 1, jj, k) && has(i, jj + 1, k) && has(i, jj - 1, k) && has(i, jj, k + 1) && has(i, jj, k - 1))) exposed = true;
            const nn = n + len * step;
            if (j + len < h && fill[nn] && near(n, nn)) len++; else break;
          }
          if (exposed) {
            let r = col[n * 4], g = col[n * 4 + 1], b = col[n * 4 + 2];
            if (flash) { r = Math.min(1, r + 0.4); g += 0.15; }
            batch.box(ox + (i + 0.5) * PV, oy + (j + len / 2) * PV, oz + (k + 0.5) * PV, PV * 1.002, PV * len * 1.001, PV * 1.002, r, g, b, col[n * 4 + 3]);
          }
          j += len;
        }
      }
  }

  // ---------------- Objeto destructible ----------------
  // No tiene "vida": se rompe vóxel a vóxel. Lo que queda suelto (sin apoyo) se cae a trozos.
  const CARVE_K = { wood: 1, cloth: 1.3, clay: 1.25, stone: 0.7, metal: 0.55, glass: 1.4 };

  class Prop {
    constructor(type, model, ox, oy, oz, defOverride) {
      this.type = type;
      this.def = defOverride || DEFS[type];
      this.m = model;
      this.w = model.w; this.h = model.h; this.d = model.d;
      this.fill = model.fill.slice();
      this.ox = ox; this.oy = oy; this.oz = oz;
      this.total = 0; for (const f of this.fill) this.total += f;
      this.alive = this.total;
      this.hp = this.def.hp || 0;
      this.dead = false;
      this.looted = false;
      this.cells = [];
      this.riders = [];
      this.lit = 0;     // mecha encendida (barril explosivo)
      this.dirty = true; this.batch = null;
      this.cx = ox + this.w * PV / 2; this.cy = oy + this.h * PV / 2; this.cz = oz + this.d * PV / 2;
      this.rad = Math.hypot(this.w, this.h, this.d) * PV / 2;
    }

    has(i, j, k) { return i >= 0 && j >= 0 && k >= 0 && i < this.w && j < this.h && k < this.d && this.fill[(j * this.d + k) * this.w + i]; }

    emit(batch) {
      emitGrid(batch, this.w, this.h, this.d, this.fill, this.m.col, this.ox, this.oy, this.oz, this.lit > 0 && Math.sin(this.lit * 30) > 0, !!this.def.alongY);
    }

    // Rayo contra la caja y luego DDA dentro de la rejilla del objeto
    rayHit(ox, oy, oz, dx, dy, dz, maxT) {
      if (this.dead) return null;
      const lx = ox - this.cx, ly = oy - this.cy, lz = oz - this.cz;
      const tc = lx * -dx + ly * -dy + lz * -dz;
      if (lx * lx + ly * ly + lz * lz - tc * tc > this.rad * this.rad) return null;
      const bmin = [this.ox, this.oy, this.oz], bmax = [this.ox + this.w * PV, this.oy + this.h * PV, this.oz + this.d * PV];
      const o = [ox, oy, oz], dir = [dx, dy, dz];
      let t0 = 0, t1 = maxT;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(dir[a]) < 1e-9) { if (o[a] < bmin[a] || o[a] > bmax[a]) return null; continue; }
        let ta = (bmin[a] - o[a]) / dir[a], tb = (bmax[a] - o[a]) / dir[a];
        if (ta > tb) { const s = ta; ta = tb; tb = s; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) return null;
      }
      let t = t0 + 1e-5;
      let i = Math.floor((ox + dx * t - this.ox) / PV), j = Math.floor((oy + dy * t - this.oy) / PV), k = Math.floor((oz + dz * t - this.oz) / PV);
      i = M.clamp(i, 0, this.w - 1); j = M.clamp(j, 0, this.h - 1); k = M.clamp(k, 0, this.d - 1);
      const si = dx > 0 ? 1 : -1, sj = dy > 0 ? 1 : -1, sk = dz > 0 ? 1 : -1;
      const nx = (this.ox + (i + (dx > 0 ? 1 : 0)) * PV), ny = (this.oy + (j + (dy > 0 ? 1 : 0)) * PV), nz = (this.oz + (k + (dz > 0 ? 1 : 0)) * PV);
      let tx = dx ? (nx - ox) / dx : Infinity, ty = dy ? (ny - oy) / dy : Infinity, tz = dz ? (nz - oz) / dz : Infinity;
      const ddx = dx ? PV / Math.abs(dx) : Infinity, ddy = dy ? PV / Math.abs(dy) : Infinity, ddz = dz ? PV / Math.abs(dz) : Infinity;
      for (let n = 0; n < 400; n++) {
        if (this.has(i, j, k)) return { t, i, j, k, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t, prop: this };
        if (tx < ty && tx < tz) { i += si; t = tx; tx += ddx; }
        else if (ty < tz) { j += sj; t = ty; ty += ddy; }
        else { k += sk; t = tz; tz += ddz; }
        if (t > t1 + 1e-4 || i < 0 || j < 0 || k < 0 || i >= this.w || j >= this.h || k >= this.d) return null;
      }
      return null;
    }

    // Quita vóxeles en una esfera (coordenadas de mundo)
    carve(px, py, pz, radius, game, dx, dy, dz, maxDebris = 12) {
      const r = radius / PV;
      const ci = (px - this.ox) / PV - 0.5, cj = (py - this.oy) / PV - 0.5, ck = (pz - this.oz) / PV - 0.5;
      let n = 0, debris = 0;
      const col = this.m.col;
      for (let j = Math.max(0, Math.floor(cj - r)); j <= Math.min(this.h - 1, Math.ceil(cj + r)); j++)
        for (let k = Math.max(0, Math.floor(ck - r)); k <= Math.min(this.d - 1, Math.ceil(ck + r)); k++)
          for (let i = Math.max(0, Math.floor(ci - r)); i <= Math.min(this.w - 1, Math.ceil(ci + r)); i++) {
            const q = (j * this.d + k) * this.w + i;
            if (!this.fill[q]) continue;
            if ((i - ci) ** 2 + (j - cj) ** 2 + (k - ck) ** 2 > r * r) continue;
            this.fill[q] = 0; n++;
            if (game && debris < maxDebris) {
              debris++;
              game.particles.spawn(this.ox + (i + 0.5) * PV, this.oy + (j + 0.5) * PV, this.oz + (k + 0.5) * PV,
                dx * M.rand(1, 3) + M.rand(-1.5, 1.5), M.rand(1, 3.5), dz * M.rand(1, 3) + M.rand(-1.5, 1.5),
                col[q * 4], col[q * 4 + 1], col[q * 4 + 2], PV * M.rand(0.8, 1.1), M.rand(2, 4), col[q * 4 + 3]);
            }
          }
      this.alive -= n;
      if (n) this.afterCarve(game, dx, dz);
      return n;
    }

    // Lo que ha quedado sin apoyo se desprende y cae; libera la colisión vacía
    afterCarve(game, dx = 0, dz = 0) {
      const anchor = this.def.anchor || 'bottom';
      if (anchor !== 'none' && this.alive > 0) {
        const { w, h, d, fill } = this;
        const seen = new Uint8Array(fill.length), q = [];
        const j0 = anchor === 'top' ? h - 1 : 0;
        for (let k = 0; k < d; k++) for (let i = 0; i < w; i++) { const n = (j0 * d + k) * w + i; if (fill[n]) { seen[n] = 1; q.push(n); } }
        while (q.length) {
          const n = q.pop();
          const i = n % w, k = Math.floor(n / w) % d, j = Math.floor(n / (w * d));
          const nb = [i > 0 ? n - 1 : -1, i < w - 1 ? n + 1 : -1, k > 0 ? n - w : -1, k < d - 1 ? n + w : -1, j > 0 ? n - w * d : -1, j < h - 1 ? n + w * d : -1];
          for (const m of nb) if (m >= 0 && fill[m] && !seen[m]) { seen[m] = 1; q.push(m); }
        }
        const loose = [];
        for (let n = 0; n < fill.length; n++) if (fill[n] && !seen[n]) loose.push(n);
        if (loose.length) this.drop(loose, game, dx, dz);
      }
      // celdas de colisión que se han quedado vacías
      if (this.cells.length) {
        const r = this.room, per = S / PV;
        this.cells = this.cells.filter((cell) => {
          const lx = cell % r.W, lz = Math.floor(cell / r.W) % r.D, ly = Math.floor(cell / (r.W * r.D));
          const x0 = (r.ox + lx) * S - this.ox, y0 = ly * S - this.oy, z0 = (r.oz + lz) * S - this.oz;
          const i0 = Math.floor(x0 / PV), j0 = Math.floor(y0 / PV), k0 = Math.floor(z0 / PV);
          for (let j = j0; j < j0 + per; j++) for (let k = k0; k < k0 + per; k++) for (let i = i0; i < i0 + per; i++) if (this.has(i, j, k)) return true;
          if (r.grid[cell] === VX.Blocks.PROP) r.grid[cell] = 0;
          r.walk = null;
          return false;
        });
      }
      // botín al destrozarlo casi entero
      if (!this.looted && this.alive < this.total * 0.35) {
        this.looted = true;
        if (game && this.type === 'barrel' && game.addOil) game.addOil(this.cx, this.cz, 1.1);   // el aceite se derrama
        if (game && this.def.loot && Math.random() < this.def.loot) {
          const n = this.def.treasure ? M.randInt(15, 25) : this.type === 'sarcophagus' || this.type === 'throne' ? M.randInt(6, 12) : M.randInt(1, 4);
          if (this.def.treasure) game.pickups.dropHeart(this.cx, this.oy + 0.5, this.cz, 25);
          game.pickups.dropGold(this.cx, this.oy + 0.4, this.cz, n);
          if (Math.random() < 0.18) game.pickups.dropHeart(this.cx, this.oy + 0.4, this.cz);
        }
      }
      // lo que estaba encima se viene abajo
      if (this.alive < this.total * 0.5) for (const rd of this.riders) if (!rd.dead) rd.collapse(game, dx, dz);
      if (this.alive <= 0) this.dead = true;
      this.dirty = true; this.touched = true; this.room.propsDirty = true;
    }

    // Vóxeles que caen como trozos
    drop(list, game, dx, dz, spray = false) {
      const col = this.m.col;
      // un trozo grande cae entero y aplasta lo que haya debajo
      if (game && !spray && list.length >= 6 && game.addFaller) {
        const vox = [];
        for (const q of list) {
          const i = q % this.w, k = Math.floor(q / this.w) % this.d, j = Math.floor(q / (this.w * this.d));
          vox.push(this.ox + (i + 0.5) * PV, this.oy + (j + 0.5) * PV, this.oz + (k + 0.5) * PV, col[q * 4], col[q * 4 + 1], col[q * 4 + 2], col[q * 4 + 3]);
          this.fill[q] = 0;
        }
        this.alive -= list.length;
        game.addFaller(vox, dx, dz, this.def.mat);
        return;
      }
      const step = Math.max(1, Math.floor(list.length / 90));
      for (let c = 0; c < list.length; c++) {
        const q = list[c];
        if (game && c % step === 0) {
          const i = q % this.w, k = Math.floor(q / this.w) % this.d, j = Math.floor(q / (this.w * this.d));
          game.particles.spawn(this.ox + (i + 0.5) * PV, this.oy + (j + 0.5) * PV, this.oz + (k + 0.5) * PV,
            dx * M.rand(0.3, 1.5) + M.rand(-0.6, 0.6), M.rand(-0.5, 1.5), dz * M.rand(0.3, 1.5) + M.rand(-0.6, 0.6),
            col[q * 4], col[q * 4 + 1], col[q * 4 + 2], PV * Math.min(2.2, step * 0.9 + 0.2), M.rand(2.5, 4.5), col[q * 4 + 3]);
        }
        this.fill[q] = 0;
      }
      this.alive -= list.length;
    }

    // Se desmorona entero
    collapse(game, dx = 0, dz = 0) {
      const all = [];
      for (let n = 0; n < this.fill.length; n++) if (this.fill[n]) all.push(n);
      this.drop(all, game, dx, dz);
      this.afterCarve(game, dx, dz);
    }

    hit(h, dmg, ray, game) {
      if (this.dead) return;
      const k = CARVE_K[this.def.mat] ?? 1;
      this.carve(h.x, h.y, h.z, PV * (1.3 + dmg / 22) * k, game, ray.dx, ray.dy, ray.dz);
      if (this.def.mat === 'metal' || this.def.mat === 'stone') game.particles.sparks(h.x, h.y, h.z, -ray.dx, 0.3, -ray.dz, 3);
      this.sound();
      if (game.weapon && game.weapon.mods.fire && game.dmgSource === 'gun') this.ignite();
      this.damage(dmg, game, ray.dx, ray.dz);
    }

    // ---- Fuego: la madera y la tela arden, se consumen y lo propagan ----
    get flammable() { return this.def.mat === 'wood' || this.def.mat === 'cloth'; }

    ignite() {
      if (this.dead || !this.flammable || this.burning > 0) return;
      this.burning = M.rand(7, 11);
      this.burnTick = 0;
      if (this.def.explosive && this.lit <= 0) this.lit = 0.8;
    }

    updateFire(dt, game) {
      this.burning -= dt;
      this.burnTick -= dt;
      const top = this.oy + this.h * PV;
      if (Math.random() < 0.3) game.particles.spawn(this.ox + Math.random() * this.w * PV, top + 0.1, this.oz + Math.random() * this.d * PV,
        M.rand(-0.4, 0.4), M.rand(1.5, 3), M.rand(-0.4, 0.4), 1, M.rand(0.5, 0.8), 0.15, 0.018, M.rand(0.5, 1), 1, 1);   // pavesas
      // la madera se ennegrece mientras arde
      if (this.burnTick <= 0) {
        if (!this.ownCol) { this.m = { ...this.m, col: this.m.col.slice() }; this.ownCol = true; }
        const c = this.m.col;
        for (let t = 0; t < 30; t++) {
          const q = (Math.random() * this.fill.length) | 0;
          if (!this.fill[q]) continue;
          c[q * 4] = c[q * 4] * 0.72 + 0.01; c[q * 4 + 1] *= 0.66; c[q * 4 + 2] *= 0.62;
        }
        this.dirty = true; this.touched = true; this.room.propsDirty = true;
      }
      if (this.burnTick > 0) return;
      this.burnTick = 0.25;
      // se consume poco a poco
      const n = Math.max(3, Math.round(this.total / 120));
      const list = [];
      for (let t = 0; t < n * 4 && list.length < n; t++) {
        const q = (Math.random() * this.fill.length) | 0;
        if (this.fill[q] && list.indexOf(q) < 0) list.push(q);
      }
      if (list.length) { this.drop(list, game, 0, 0); this.afterCarve(game, 0, 0); }
      // quema a quien esté cerca y propaga el fuego
      const R = Math.max(this.w, this.d) * PV / 2 + 0.6;
      for (const e of game.enemies) if (!e.dead && !e.isBoss && Math.hypot(e.x - this.cx, e.z - this.cz) < R && !(e.T && e.T.fireImmune)) e.burn = Math.max(e.burn || 0, 1.5);
      const P = game.player;
      const RP = Math.max(this.w, this.d) * PV / 2 + 0.25;   // al jugador sólo le quema si está pegado
      if (Math.hypot(P.x - this.cx, P.z - this.cz) < RP && P.y < top) P.fireTouch(5, game);
      // el fuego sólo salta a lo que está pegado, poco a poco, y nunca arde media sala a la vez
      if (!game.fireBusy || !game.fireBusy(this.room)) for (const o of this.room.props) if (o !== this && !o.dead && o.flammable && !(o.burning > 0) && Math.hypot(o.cx - this.cx, o.cz - this.cz) < R + 0.15 && Math.random() < 0.025) o.ignite();
      if (game.igniteAt) game.igniteAt(this.cx, this.cz, R * 0.6);
      if (this.burning <= 0 || this.alive < 10) { this.burning = 0; if (this.alive < 10 && this.alive > 0) this.collapse(game, 0, 0); }
    }

    blast(x, y, z, R, dmg, game) {
      if (this.dead) return;
      const dx = this.cx - x, dz = this.cz - z, l = Math.hypot(dx, dz) || 1;
      const k = CARVE_K[this.def.mat] ?? 1;
      // agujero grande en el lado de la explosión
      const px = M.clamp(x, this.ox, this.ox + this.w * PV), py = M.clamp(y, this.oy, this.oy + this.h * PV), pz = M.clamp(z, this.oz, this.oz + this.d * PV);
      this.carve(px, py, pz, (0.25 + dmg / 140) * k, game, dx / l, 0.5, dz / l, 10);
      this.damage(dmg * 1.5, game, dx / l, dz / l);
    }

    sound() {
      const mat = this.def.mat;
      if (mat === 'stone' || mat === 'metal') VX.Audio.wall();
      else if (mat === 'clay' || mat === 'glass') VX.Audio.snap();
      else VX.Audio.crumble();
    }

    damage(dmg, game) {
      if (!this.def.explosive) return;
      this.hp -= dmg;
      if (this.hp > 0 && this.lit <= 0) { this.lit = 1.1; VX.Audio.fuse(); }
      if (this.hp <= 0 || this.alive < this.total * 0.5) this.explode(game);
    }

    update(dt, game) {
      if (this.burning > 0 && !this.dead) this.updateFire(dt, game);
      if (this.lit > 0 && !this.dead) {
        this.lit -= dt;
        if (Math.random() < 0.7) game.particles.spawn(this.cx + M.rand(-0.1, 0.1), this.oy + this.h * PV + 0.05, this.cz + M.rand(-0.1, 0.1),
          M.rand(-0.6, 0.6), M.rand(1.5, 3), M.rand(-0.6, 0.6), 1, M.rand(0.5, 0.8), 0.15, 0.04, 0.4, 1, 1);
        this.dirty = true; this.touched = true; this.room.propsDirty = true;
        if (this.lit <= 0) this.explode(game);
      }
    }

    explode(game) {
      if (this.dead) return;
      const all = [];
      for (let n = 0; n < this.fill.length; n++) if (this.fill[n]) all.push(n);
      this.drop(all, game, 0, 0, true);
      this.dead = true;
      for (const cell of this.cells) if (this.room.grid[cell] === VX.Blocks.PROP) this.room.grid[cell] = 0;
      this.cells = []; this.room.walk = null;
      this.dirty = true; this.touched = true; this.room.propsDirty = true;
      VX.Audio.crumble();
      game.queueExplosion({ x: this.cx, y: this.oy + 0.4, z: this.cz, R: 2.8, dmg: 70, selfK: 0.6, delay: 0.05 });
      game.shake(0.5);
    }
  }

  // ---------------- Colocación en las salas ----------------
  function colH(r, lx, lz) {
    let h = 0;
    while (h < r.H && r.grid[(h * r.D + lz) * r.W + lx]) h++;
    return h;
  }

  function inHazard(r, ux, uz) {
    for (const s of r.spikes) if (ux >= s.ux0 - 1 && ux <= s.ux1 + 1 && uz >= s.uz0 - 1 && uz <= s.uz1 + 1) return true;
    return false;
  }

  // ¿Cabe algo de (hw, hd) de semiancho centrado en (x, z)? Devuelve la altura de suelo (vóxeles) o -1
  function spotFree(r, x, z, hw, hd, needH, margin = 4) {
    const lx0 = Math.floor((x - hw) / S) - r.ox, lx1 = Math.floor((x + hw - 1e-4) / S) - r.ox;
    const lz0 = Math.floor((z - hd) / S) - r.oz, lz1 = Math.floor((z + hd - 1e-4) / S) - r.oz;
    if (lx0 < margin || lz0 < margin || lx1 >= r.W - margin || lz1 >= r.D - margin) return -1;
    let h0 = -1;
    for (let lz = lz0; lz <= lz1; lz++)
      for (let lx = lx0; lx <= lx1; lx++) {
        if (r.occ[lz * r.W + lx]) return -1;
        if (r.isReservedU(lx >> 1, lz >> 1) || inHazard(r, lx >> 1, lz >> 1)) return -1;
        const h = colH(r, lx, lz);
        if (h0 < 0) h0 = h; else if (h !== h0) return -1;
        for (let y = h; y < h + needH && y < r.H; y++) if (r.grid[(y * r.D + lz) * r.W + lx]) return -1;
      }
    return h0;
  }

  // Añade el objeto a la sala (y sus celdas de colisión)
  function addProp(r, type, m, ox, oy, oz, def) {
    const p = new Prop(type, m, ox, oy, oz, def);
    p.room = r;
    if (p.def.collide) {
      const T = VX.Blocks.PROP;
      const y0 = Math.round(oy / S), y1 = Math.round((oy + m.h * PV) / S);
      // 'core': sólo bloquea el centro (p. ej. el pie de una seta gigante)
      const cxm = ox + m.w * PV / 2, czm = oz + m.d * PV / 2, hwm = p.def.core || m.w * PV / 2 - 0.04, hdm = p.def.core || m.d * PV / 2 - 0.04;
      const lx0 = Math.floor((cxm - hwm) / S) - r.ox, lx1 = Math.floor((cxm + hwm) / S) - r.ox;
      const lz0 = Math.floor((czm - hdm) / S) - r.oz, lz1 = Math.floor((czm + hdm) / S) - r.oz;
      for (let lz = lz0; lz <= lz1; lz++)
        for (let lx = lx0; lx <= lx1; lx++)
          for (let yy = y0; yy < Math.max(y0 + 3, y1); yy++) {   // mínimo 0,75 m: no se puede subir encima
            if (!r.inBounds(lx, yy, lz)) continue;
            const n = r.idx(lx, yy, lz);
            if (!r.grid[n]) { r.grid[n] = T; p.cells.push(n); }
          }
      r.walk = null;
    }
    r.props.push(p);
    return p;
  }

  // Coloca un objeto apoyado en el suelo. opts: { rot, v, y (forzar altura en m), noOcc, on (objeto de debajo) }
  function place(r, type, x, z, opts = {}) {
    const def = DEFS[type];
    if (!def) return null;
    const rot = opts.rot ?? M.randInt(0, 3);
    const v = opts.v ?? M.randInt(0, 5);
    const m = getModel(type, v, rot);
    const hw = m.w * PV / 2, hd = m.d * PV / 2;
    let y = opts.y;
    if (y === undefined) {
      const h = spotFree(r, x, z, hw, hd, Math.ceil(m.h * PV / S), opts.margin ?? 4);
      if (h < 0) return null;
      y = h * S;
    }
    const ox = x - hw, oz = z - hd;
    if (!opts.noOcc) {
      const lx0 = Math.floor(ox / S) - r.ox, lx1 = Math.floor((x + hw - 1e-4) / S) - r.ox;
      const lz0 = Math.floor(oz / S) - r.oz, lz1 = Math.floor((z + hd - 1e-4) / S) - r.oz;
      for (let lz = lz0; lz <= lz1; lz++) for (let lx = lx0; lx <= lx1; lx++) if (lx >= 0 && lz >= 0 && lx < r.W && lz < r.D) r.occ[lz * r.W + lx] = 1;
    }
    const p = addProp(r, type, m, ox, y, oz);
    if (opts.on) opts.on.riders.push(p);
    return p;
  }

  // Objeto colgado o pegado a la pared: (ox, oy, oz) = esquina mínima
  function placeAt(r, type, ox, oy, oz, rot = 0, v = 0) {
    return addProp(r, type, getModel(type, v, rot), ox, oy, oz);
  }

  // Viga o poste de madera (también se rompe)
  function placeBeam(r, ox, oy, oz, w, h, d, anchor = 'none') {
    const m = boxModel(Math.max(1, Math.round(w / PV)), Math.max(1, Math.round(h / PV)), Math.max(1, Math.round(d / PV)), [0.26, 0.17, 0.09]);
    return addProp(r, 'beam', m, ox, oy, oz, { mat: 'wood', anchor });
  }

  VX.Props = { DEFS, Prop, getModel, place, placeAt, placeBeam, addRaw: addProp, spotFree, colH, PV, emitGrid };
})();
