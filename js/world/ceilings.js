// Techos vóxel de la mazmorra: una losa de 4 vóxeles (0,25 m) de grosor, con relieve y
// decoración según el bioma y el tipo de sala:
//  cripta   → bóveda de cañón con nervios de hueso, calaveras, nichos funerarios y jaulas colgando
//  cloacas  → bóveda de ladrillo con musgo, rejillas y tuberías
//  minas    → roca con entibado de madera y faroles
//  forja    → piedra tiznada, vigas de hierro, grietas al rojo y cadenas con garfios
//  jardín   → roca con musgo, setas luminosas y raíces colgando
//  vacío    → roca violeta con vetas y cristales que brillan
//  capillas, templos, salas del trono y jefes → bóveda de crucería alta (catedral) con nervios,
//  claves doradas y plementos azules con estrellas
//  tienda   → artesonado de madera
(function () {
  const S = VX.S, M = VX.M;
  const CHURCH = new Set(['Capilla', 'Templo en ruinas', 'Claustro', 'Sala del trono', 'Galería de arcos', 'Santuario', 'Fuente de almas', 'Biblioteca maldita', 'Coliseo de huesos']);
  const ZSTYLE = ['crypt', 'sewer', 'mine', 'forge', 'fungal', 'void'];
  // materiales de cada celda
  const BASE = 0, RIB = 1, GOLD = 2, GLOW = 3, PAINT = 4, WOOD = 5, DARK = 6, MOSS = 7, STAR = 8, BONE = 9;

  // ruido suave por celdas (valor interpolado)
  function vnoise(x, z, s, seed) {
    const xi = Math.floor(x / s), zi = Math.floor(z / s), fx = x / s - xi, fz = z / s - zi;
    const a = M.hash3(xi, seed, zi), b = M.hash3(xi + 1, seed, zi), c = M.hash3(xi, seed, zi + 1), d = M.hash3(xi + 1, seed, zi + 1);
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  function info(r) {
    if (r._ceil) return r._ceil;
    const h0 = M.hash3(r.ox, 17, r.oz), zone = r.zone || 0;
    let style = ZSTYLE[zone] || 'crypt';
    if (r.type === 'shop') style = 'coffer';
    else if ((r.type === 'save' || r.type === 'boss' || CHURCH.has(r.name)) && zone !== 2 && zone !== 4) style = 'cathedral';
    const W = r.W, D = r.D, alongX = W > D, span = alongX ? D : W, len = alongX ? W : D;
    const top = (r.H - 4) * S;
    const seed = (h0 * 99991) | 0;
    let rise = 0;
    if (style === 'cathedral') rise = Math.min(18, Math.round(span * 0.3));
    else if (style === 'crypt' || style === 'sewer') rise = Math.min(12, Math.round(span * 0.22));
    const C = { style, top, alongX, span, len, rise, seed, th: 4, W, D, h: new Int16Array(W * D), k: new Uint8Array(W * D), bay: 16 };
    let maxH = 0;
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const a = alongX ? z : x, l = alongX ? x : z, t = (a + 0.5) / span;
      let h = 0, k = BASE;
      const n1 = M.hash3(x, seed, z);
      switch (style) {
        case 'crypt': {
          const hb = Math.round(Math.sin(t * Math.PI) * rise);
          h = hb;
          if (l % 24 < 2) { h = Math.max(0, hb - 1); k = (l + a) % 3 === 0 ? BONE : RIB; }                 // nervios con huesos
          else if (Math.abs(a - span / 2 + 0.5) < 1) { h = Math.max(0, hb - 1); k = RIB; }                // espinazo de la bóveda
          else if ((t > 0.1 && t < 0.28) || (t > 0.72 && t < 0.9)) {
            const p = l % 8;
            if (p >= 3 && p <= 6 && l % 24 > 3 && l % 24 < 22) { h = hb + 2; k = DARK; }                  // nichos funerarios
          }
          if (k === BASE && n1 < 0.04) k = MOSS;
          break;
        }
        case 'sewer': {
          const hb = Math.round(Math.sin(t * Math.PI) * rise);
          h = hb;
          if (Math.abs(a - span / 2 + 0.5) < 1.5 && l % 16 < 3) { h = hb + 1; k = DARK; }                 // rejillas en la clave
          else if (l % 20 < 2) { h = Math.max(0, hb - 1); k = RIB; }                                     // arcos de refuerzo
          else if (vnoise(x, z, 5, seed) > 0.68) k = MOSS;
          break;
        }
        case 'cathedral': {
          const bay = C.bay, v = ((l % bay) + 0.5) / bay;
          const hA = Math.round(Math.pow(Math.sin(t * Math.PI), 0.55) * rise);
          const hB = Math.round(Math.pow(Math.sin(v * Math.PI), 0.55) * rise * 0.85 + rise * 0.15);
          h = Math.min(hA, hB);
          k = PAINT;
          if (l % bay === 0 || l % bay === bay - 1) { k = RIB; h = Math.max(0, h - 1); }                 // arco fajón
          else if (Math.abs(hA - hB) <= 1 && h > 2) { k = RIB; h = Math.max(0, h - 1); }                 // nervios cruzados
          else if (Math.abs(a - span / 2 + 0.5) < 1 && h > rise - 3) { k = RIB; h = Math.max(0, h - 1); }  // ligadura
          if (Math.abs(a - span / 2 + 0.5) < 1.6 && Math.abs((l % bay) - bay / 2 + 0.5) < 1.6) { k = GOLD; h = Math.max(0, h - 2); }   // clave
          if (k === PAINT && n1 < 0.02) k = STAR;
          if (t < 0.06 || t > 0.94) k = RIB;
          break;
        }
        case 'coffer': {
          const gx = x % 10, gz = z % 10;
          if (gx < 2 || gz < 2) { h = 0; k = WOOD; }
          else if (gx < 3 || gx > 8 || gz < 3 || gz > 8) { h = 2; k = DARK; }
          else { h = 4; k = PAINT; if (gx >= 5 && gx <= 6 && gz >= 5 && gz <= 6) { k = GOLD; h = 3; } }
          break;
        }
        case 'mine': {
          h = 3 + Math.round((vnoise(x, z, 4, seed) - 0.5) * 4);
          if (l % 12 < 3) { h = 0; k = WOOD; }                                                         // vigas del entibado
          else if (a === 3 || a === 4 || a === span - 5 || a === span - 4) { h = 1; k = WOOD; }          // largueros
          else if (vnoise(x, z, 3, seed + 5) > 0.8) k = GLOW;                                          // veta de cristal
          break;
        }
        case 'forge': {
          h = 2 + Math.round((vnoise(x, z, 4, seed) - 0.5) * 2);
          if (l % 10 < 2) { h = 0; k = RIB; }                                                         // vigas de hierro
          else { const c = Math.abs(vnoise(x, z, 6, seed + 3) - 0.5); if (c < 0.012 && n1 < 0.7) k = GLOW; else if (n1 < 0.3) k = DARK; }
          break;
        }
        case 'fungal': {
          h = 3 + Math.round(vnoise(x, z, 6, seed) * 4 + vnoise(x, z, 2.5, seed + 9) * 2 - 1);
          if (vnoise(x, z, 4, seed + 2) > 0.6) k = MOSS;
          if (n1 < 0.012) k = GLOW;
          break;
        }
        default: {   // void
          h = 3 + Math.round(vnoise(x, z, 7, seed) * 5 + vnoise(x, z, 2.5, seed + 9) * 2 - 1);
          const c = Math.abs(vnoise(x, z, 5, seed + 4) - 0.5);
          if (c < 0.012 && n1 < 0.75) k = GLOW; else if (n1 < 0.25) k = DARK;
        }
      }
      h = Math.max(0, h);
      C.h[z * W + x] = h; C.k[z * W + x] = k;
      if (h > maxH) maxH = h;
    }
    C.maxH = maxH;
    r._ceil = C;
    return C;
  }

  // altura (m) de la cara inferior del techo
  function ceilY(r, wx, wz) {
    const C = info(r);
    const x = M.clamp(Math.floor(wx / S) - r.ox, 0, C.W - 1), z = M.clamp(Math.floor(wz / S) - r.oz, 0, C.D - 1);
    return C.top + C.h[z * C.W + x] * S;
  }

  // paleta por estilo y material (sin tinte del bioma)
  function color(style, k, x, z, h, j) {
    const J = (c, a = 0.06) => [c[0] + j * a, c[1] + j * a, c[2] + j * a, c[3] || 0];
    switch (style) {
      case 'crypt':
        if (k === RIB) return J([0.3, 0.28, 0.26]);
        if (k === BONE) return J([0.78, 0.74, 0.62], 0.04);
        if (k === DARK) return J([0.05, 0.045, 0.045], 0.02);
        if (k === MOSS) return J([0.12, 0.17, 0.09]);
        return J(((x >> 1) + (z >> 2)) % 5 === 0 ? [0.17, 0.16, 0.16] : [0.2, 0.19, 0.18]);
      case 'sewer': {
        if (k === DARK) return (x + z) % 2 ? [0.02, 0.02, 0.02] : [0.18, 0.2, 0.19];   // rejilla
        if (k === RIB) return J([0.24, 0.2, 0.17]);
        if (k === MOSS) return J([0.12, 0.22, 0.1]);
        const mortar = (z % 3 === 0) || ((x + (Math.floor(z / 3) % 2) * 3) % 6 === 0);
        return mortar ? J([0.14, 0.14, 0.12], 0.03) : J([0.3, 0.2, 0.15]);
      }
      case 'cathedral':
        if (k === RIB) return J([0.48, 0.45, 0.4]);
        if (k === GOLD) return [0.95, 0.72, 0.25, 0.6];
        if (k === STAR) return [1, 0.9, 0.55, 1];
        return J([0.09, 0.11, 0.24], 0.03);   // plementos pintados de azul
      case 'coffer':
        if (k === WOOD) return J([0.3, 0.18, 0.09]);
        if (k === DARK) return J([0.2, 0.12, 0.06]);
        if (k === GOLD) return [0.95, 0.75, 0.3, 0.5];
        return J([0.38, 0.12, 0.1], 0.03);
      case 'mine':
        if (k === WOOD) return J((x + z) % 4 === 0 ? [0.2, 0.12, 0.06] : [0.32, 0.2, 0.1]);
        if (k === GLOW) return [0.45, 0.85, 1, 0.8];
        return J([0.24, 0.2, 0.17], 0.08);
      case 'forge':
        if (k === RIB) return J((x + z) % 5 === 0 ? [0.38, 0.36, 0.34] : [0.16, 0.16, 0.17]);
        if (k === GLOW) return [1, 0.35, 0.08, 0.8];
        if (k === DARK) return J([0.06, 0.05, 0.05], 0.02);
        return J([0.17, 0.13, 0.12], 0.05);
      case 'fungal':
        if (k === MOSS) return J([0.12, 0.24, 0.14]);
        if (k === GLOW) return [0.3, 1, 0.8, 1];
        return J([0.17, 0.19, 0.2], 0.06);
      default:
        if (k === GLOW) return [0.6, 0.25, 0.9, 0.7];
        if (k === DARK) return J([0.05, 0.03, 0.08], 0.02);
        return J([0.13, 0.1, 0.18], 0.05);
    }
  }

  function build(r, R) {
    const C = info(r), b = R.createBatch(Math.max(4096, C.W * C.D + 2048), false);
    const Z = VX.ZONES[r.zone || 0] || VX.ZONES[0], tn = Z.tint || [1, 1, 1];
    const tint = (c) => [c[0] * tn[0], c[1] * tn[1], c[2] * tn[2], c[3] || 0];
    const top = C.top, W = C.W, D = C.D;
    const yTop = top + (C.maxH + C.th) * S;
    const BX = (x, y, z, sx, sy, sz, c, e) => b.box(x, y, z, sx, sy, sz, c[0], c[1], c[2], e !== undefined ? e : (c[3] || 0));
    // la losa: una columna por vóxel, desde la cara de abajo hasta arriba (se ven los escalones)
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x, h = C.h[i], k = C.k[i];
      const j = M.hash3(x + r.ox, 7, z + r.oz) - 0.5;
      const c = color(C.style, k, x, z, h, j);
      // en el borde de la sala la losa baja hasta las paredes (cierra la bóveda por los extremos)
      const edge = x < 2 || z < 2 || x >= W - 2 || z >= D - 2;
      const y0 = edge ? top : top + h * S;
      BX((r.ox + x + 0.5) * S, (y0 + yTop) / 2, (r.oz + z + 0.5) * S, S, yTop - y0, S, c[3] ? c : tint(c));
    }
    decorate(r, C, BX, tint);
    b.upload();
    return b;
  }

  // ---------------- decoración colgante ----------------
  function decorate(r, C, BX, tint) {
    const W = C.W, D = C.D, x0 = r.ox * S, z0 = r.oz * S, seed = C.seed;
    const cell = (wx, wz) => ({ x: M.clamp(Math.floor(wx / S) - r.ox, 0, W - 1), z: M.clamp(Math.floor(wz / S) - r.oz, 0, D - 1) });
    const under = (wx, wz) => { const c = cell(wx, wz); return C.top + C.h[c.z * W + c.x] * S; };
    const at = (a, l) => (C.alongX ? [x0 + (l + 0.5) * S, z0 + (a + 0.5) * S] : [x0 + (a + 0.5) * S, z0 + (l + 0.5) * S]);
    const H = (i, s) => M.hash3(i, seed + s, 13);
    const chain = (wx, wz, y1, len, col = [0.16, 0.15, 0.15]) => {
      for (let y = y1 - 0.06, n = 0; y > y1 - len; y -= 0.11, n++) BX(wx, y, wz, n % 2 ? 0.035 : 0.06, 0.1, n % 2 ? 0.06 : 0.035, col);
    };
    const floorY = 0;
    void floorY;
    switch (C.style) {
      case 'crypt': {
        // calaveras en la clave de cada nervio y en los nichos; jaulas y cadenas colgando
        for (let l = 0; l < C.len; l += 24) {
          const [wx, wz] = at(C.span / 2 - 0.5, l + 0.5), y = under(wx, wz);
          skull(BX, wx, y - 0.14, wz, C.alongX);
        }
        for (let l = 4; l < C.len - 4; l += 8) for (const t of [0.19, 0.81]) {
          if (l % 24 <= 3 || l % 24 >= 22 || H(l + t * 7, 3) < 0.45) continue;
          const [wx, wz] = at(Math.round(t * C.span), l + 0.5), y = under(wx, wz);
          if (H(l, 4) < 0.6) skull(BX, wx, y - 0.12, wz, C.alongX);
          else for (let n = 0; n < 4; n++) BX(wx + (H(l + n, 5) - 0.5) * 0.3, y - 0.05 - n * 0.02, wz + (H(l + n, 6) - 0.5) * 0.3, 0.2, 0.05, 0.05, [0.76, 0.72, 0.6]);   // huesos
        }
        const n = Math.round(C.len / 20);
        for (let i = 0; i < n; i++) {
          const a = Math.round((0.3 + H(i, 7) * 0.4) * C.span), l = Math.round((i + 0.5) / n * C.len);
          const [wx, wz] = at(a, l), y = under(wx, wz), len = 1.2 + H(i, 8) * 1.4;
          chain(wx, wz, y, len);
          if (H(i, 9) < 0.55) cage(BX, wx, y - len - 0.55, wz, H(i, 10) < 0.5);
        }
        cobwebs(r, C, BX, under);
        break;
      }
      case 'sewer': {
        // dos tuberías a lo largo con bridas y goteras de musgo
        for (const t of [0.24, 0.76]) {
          const a = Math.round(t * C.span);
          for (let l = 0; l < C.len; l += 2) {
            const [wx, wz] = at(a, l + 1), y = under(wx, wz) - 0.3;
            const c = l % 24 === 0 ? [0.32, 0.34, 0.3] : [0.2, 0.25, 0.21];
            BX(wx, y, wz, C.alongX ? 2 * S + 0.01 : 0.28, 0.28, C.alongX ? 0.28 : 2 * S + 0.01, tint(c));
            if (l % 12 === 0) BX(wx, y + 0.2, wz, 0.08, 0.14, 0.08, [0.12, 0.13, 0.12]);   // abrazadera
          }
        }
        for (let i = 0; i < Math.round(C.len / 3); i++) {
          const a = Math.round(H(i, 11) * C.span), l = Math.round(H(i, 12) * C.len), [wx, wz] = at(a, l);
          const ci = cell(wx, wz);
          if (C.k[ci.z * W + ci.x] !== MOSS) continue;
          const y = under(wx, wz), len = 0.15 + H(i, 13) * 0.5;
          BX(wx, y - len / 2, wz, 0.06, len, 0.06, [0.15, 0.32, 0.12]);
          if (H(i, 14) < 0.4) BX(wx, y - len - 0.03, wz, 0.04, 0.05, 0.04, [0.4, 0.9, 0.3], 0.6);   // gota
        }
        break;
      }
      case 'cathedral': {
        // lámparas colgantes de bronce en el centro de cada tramo
        for (let l = C.bay / 2; l < C.len; l += C.bay * 2) {
          const [wx, wz] = at(C.span / 2 - 0.5, l), y = under(wx, wz), len = Math.min(3, (y - 4) * 0.5);
          if (len < 0.6) continue;
          chain(wx, wz, y - 0.25, len, [0.4, 0.3, 0.12]);
          const ly = y - 0.25 - len;
          BX(wx, ly - 0.1, wz, 0.5, 0.08, 0.5, [0.45, 0.33, 0.12]);
          BX(wx, ly - 0.22, wz, 0.3, 0.16, 0.3, [1, 0.8, 0.45], 1);
          for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) BX(wx + dx, ly - 0.02, wz + dz, 0.06, 0.12, 0.06, [1, 0.85, 0.5], 1);
        }
        break;
      }
      case 'mine': {
        // faroles colgando de las vigas
        for (let l = 1; l < C.len; l += 24) {
          const [wx, wz] = at(C.span / 2 - 0.5, l + 1), y = under(wx, wz);
          chain(wx, wz, y, 0.5, [0.2, 0.17, 0.13]);
          BX(wx, y - 0.62, wz, 0.18, 0.24, 0.18, [0.18, 0.15, 0.1]);
          BX(wx, y - 0.62, wz, 0.12, 0.16, 0.12, [1, 0.7, 0.3], 1);
        }
        stalactites(r, C, BX, under, H, [0.24, 0.2, 0.17], 0.5, tint);
        break;
      }
      case 'forge': {
        // cadenas con garfios y hollín
        for (let i = 0; i < Math.round(C.len / 10); i++) {
          const a = Math.round((0.2 + H(i, 15) * 0.6) * C.span), l = Math.round(H(i, 16) * C.len), [wx, wz] = at(a, l);
          const y = under(wx, wz), len = 1 + H(i, 17) * 2;
          chain(wx, wz, y, len, [0.1, 0.09, 0.09]);
          BX(wx, y - len - 0.06, wz, 0.05, 0.16, 0.05, [0.3, 0.29, 0.28]);
          BX(wx + 0.07, y - len - 0.15, wz, 0.14, 0.05, 0.05, [0.3, 0.29, 0.28]);
        }
        break;
      }
      case 'fungal': {
        stalactites(r, C, BX, under, H, [0.17, 0.19, 0.2], 0.35, tint);
        // setas luminosas y raíces colgando
        for (let i = 0; i < Math.round(W * D / 260); i++) {
          const wx = x0 + H(i, 20) * W * S, wz = z0 + H(i, 21) * D * S, y = under(wx, wz);
          if (H(i, 22) < 0.5) {
            const st = 0.15 + H(i, 23) * 0.4;
            BX(wx, y - st / 2, wz, 0.06, st, 0.06, [0.75, 0.75, 0.68]);
            const cw = 0.2 + H(i, 24) * 0.25;
            BX(wx, y - st - 0.05, wz, cw, 0.1, cw, H(i, 25) < 0.5 ? [0.3, 1, 0.8] : [0.6, 0.4, 1], 0.9);
          } else {
            const len = 0.6 + H(i, 26) * 2.2;
            for (let s = 0; s < len; s += 0.25) BX(wx + Math.sin(s * 3 + i) * 0.05, y - s - 0.12, wz, 0.07, 0.26, 0.07, [0.17, 0.3, 0.12]);
          }
        }
        break;
      }
      case 'void': {
        // racimos de cristales violetas
        for (let i = 0; i < Math.round(W * D / 320); i++) {
          const wx = x0 + H(i, 30) * W * S, wz = z0 + H(i, 31) * D * S, y = under(wx, wz);
          const n = 2 + Math.floor(H(i, 32) * 3);
          for (let k = 0; k < n; k++) {
            const len = 0.3 + H(i * 5 + k, 33) * 0.9, dx = (H(i * 5 + k, 34) - 0.5) * 0.4, dz = (H(i * 5 + k, 35) - 0.5) * 0.4;
            BX(wx + dx, y - len / 2, wz + dz, 0.12, len, 0.12, [0.65, 0.3, 1], 0.9);
            BX(wx + dx, y - len - 0.05, wz + dz, 0.06, 0.1, 0.06, [0.9, 0.7, 1], 1);
          }
        }
        stalactites(r, C, BX, under, H, [0.13, 0.1, 0.18], 0.3, tint);
        break;
      }
      case 'coffer': {
        // lámpara de araña central
        const wx = x0 + W * S / 2, wz = z0 + D * S / 2, y = under(wx, wz);
        chain(wx, wz, y, 1, [0.4, 0.3, 0.12]);
        BX(wx, y - 1.1, wz, 0.7, 0.08, 0.7, [0.45, 0.33, 0.12]);
        for (const [dx, dz] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) BX(wx + dx, y - 1.0, wz + dz, 0.06, 0.12, 0.06, [1, 0.85, 0.5], 1);
        break;
      }
    }
  }

  // estalactitas escalonadas (vóxel a vóxel, más finas abajo)
  function stalactites(r, C, BX, under, H, col, density, tint) {
    const n = Math.round(C.W * C.D * S * S / 9 * density * 2);
    for (let i = 0; i < n; i++) {
      const wx = r.ox * S + (Math.floor(H(i, 40) * C.W) + 0.5) * S, wz = r.oz * S + (Math.floor(H(i, 41) * C.D) + 0.5) * S;
      const y = under(wx, wz), steps = 2 + Math.floor(H(i, 42) * 6);
      for (let s = 0; s < steps; s++) {
        const w = Math.max(1, Math.round((steps - s) * 0.6)) * S;
        const k = 0.85 + H(i * 9 + s, 43) * 0.3;
        BX(wx, y - (s + 0.5) * S, wz, w, S, w, tint([col[0] * k, col[1] * k, col[2] * k]));
      }
    }
  }

  // calavera vóxel (3×3×3 con cuencas y dientes)
  function skull(BX, x, y, z, alongX) {
    const B = [0.8, 0.76, 0.64], d = 0.075;
    BX(x, y, z, d * 3, d * 3, d * 3, B);
    const fx = alongX ? 0 : 1, fz = alongX ? 1 : 0;
    BX(x + fx * d * 1.45 - fz * d, y + d * 0.2, z + fz * d * 1.45 - fx * d, 0.03 + fz * 0.05, d * 0.9, 0.03 + fx * 0.05, [0.04, 0.03, 0.03]);
    BX(x + fx * d * 1.45 + fz * d, y + d * 0.2, z + fz * d * 1.45 + fx * d, 0.03 + fz * 0.05, d * 0.9, 0.03 + fx * 0.05, [0.04, 0.03, 0.03]);
    BX(x + fx * d * 0.8, y - d * 1.9, z + fz * d * 0.8, d * 2 * (fz || 0.6), d, d * 2 * (fx || 0.6), [0.72, 0.68, 0.55]);   // mandíbula
  }

  // jaula colgante (a veces con un esqueleto dentro)
  function cage(BX, x, y, z, bones) {
    const c = [0.14, 0.13, 0.13], w = 0.36, h = 0.55;
    BX(x, y + h, z, w * 2, 0.04, w * 2, c);
    BX(x, y - h, z, w * 2, 0.04, w * 2, c);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; BX(x + Math.cos(a) * w, y, z + Math.sin(a) * w, 0.035, h * 2, 0.035, c); }
    if (bones) { BX(x, y - h + 0.08, z, 0.3, 0.08, 0.12, [0.78, 0.74, 0.62]); BX(x - 0.05, y - h + 0.2, z + 0.06, 0.14, 0.14, 0.14, [0.8, 0.76, 0.64]); }
  }

  // telarañas en las esquinas
  function cobwebs(r, C, BX, under) {
    const corners = [[2, 2], [C.W - 3, 2], [2, C.D - 3], [C.W - 3, C.D - 3]];
    for (const [cx, cz] of corners) {
      const wx = (r.ox + cx + 0.5) * S, wz = (r.oz + cz + 0.5) * S, y = under(wx, wz);
      const sx = cx < 5 ? 1 : -1, sz = cz < 5 ? 1 : -1;
      for (let i = 0; i < 6; i++) {
        const k = i / 5;
        BX(wx + sx * k * 0.6, y - 0.05 - k * 0.5, wz + sz * (1 - k) * 0.6, 0.6 * (1 - k * 0.5), 0.015, 0.015, [0.6, 0.6, 0.62]);
        BX(wx + sx * (1 - k) * 0.6, y - 0.05 - k * 0.5, wz + sz * k * 0.6, 0.015, 0.015, 0.6 * (1 - k * 0.5), [0.6, 0.6, 0.62]);
      }
    }
  }

  VX.Ceilings = { info, ceilY, build };
})();
