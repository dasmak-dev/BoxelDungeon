// Techos de la mazmorra, hechos de bloques de la propia sala (se pueden disparar, romper y,
// si algo se queda sin apoyo, se cae). La losa sale de la parte alta de las paredes y tiene
// relieve y decoración según el bioma y el tipo de sala:
//  cripta   → bóveda de cañón con nervios de hueso, calaveras, nichos funerarios y jaulas colgando
//  cloacas  → bóveda de ladrillo con musgo, rejillas y tuberías
//  minas    → roca con entibado de madera, vetas de cristal, faroles y estalactitas
//  forja    → piedra tiznada, vigas de acero, grietas al rojo y cadenas con garfios
//  jardín   → roca con musgo, setas luminosas y raíces colgando
//  vacío    → roca violeta con vetas y racimos de cristales
//  capillas, templos, salas del trono, de jefe y fuentes de almas → bóveda de crucería alta
//  (catedral) con nervios, claves doradas, plementos azules con estrellas y lámparas
//  tienda   → artesonado de madera con lámpara de araña
(function () {
  const S = VX.S, M = VX.M;
  const CHURCH = new Set(['Capilla', 'Templo en ruinas', 'Claustro', 'Sala del trono', 'Galería de arcos', 'Santuario', 'Fuente de almas', 'Biblioteca maldita', 'Coliseo de huesos']);
  const ZSTYLE = ['crypt', 'sewer', 'mine', 'forge', 'fungal', 'void'];
  // materiales de cada celda del plano
  const BASE = 0, RIB = 1, GOLD = 2, GLOW = 3, PAINT = 4, WOOD = 5, DARK = 6, MOSS = 7, STAR = 8, BONE = 9;

  function vnoise(x, z, s, seed) {
    const xi = Math.floor(x / s), zi = Math.floor(z / s), fx = x / s - xi, fz = z / s - zi;
    const a = M.hash3(xi, seed, zi), b = M.hash3(xi + 1, seed, zi), c = M.hash3(xi, seed, zi + 1), d = M.hash3(xi + 1, seed, zi + 1);
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  // Plano del techo: altura de la cara inferior (en vóxeles sobre la base) y material de cada columna.
  // Se calcula al crear la sala, porque decide cuánto más alta es su rejilla.
  function plan(r) {
    const zone = r.zone || 0;
    let style = ZSTYLE[zone] || 'crypt';
    if (r.type === 'shop') style = 'coffer';
    else if ((r.type === 'save' || r.type === 'boss' || CHURCH.has(r.name)) && zone !== 2 && zone !== 4) style = 'cathedral';
    const W = r.W, D = r.D, alongX = W > D, span = alongX ? D : W, len = alongX ? W : D;
    const seed = (Math.random() * 99991) | 0;
    let rise = 0;
    if (style === 'cathedral') rise = Math.min(18, Math.round(span * 0.3));
    else if (style === 'crypt' || style === 'sewer') rise = Math.min(12, Math.round(span * 0.22));
    const C = { style, alongX, span, len, rise, seed, W, D, h: new Int16Array(W * D), k: new Uint8Array(W * D), bay: 16 };
    let maxH = 0;
    // sillar: piedras de 4×2 vóxeles a matajunta, para que el material cambie por piezas y no por vóxel suelto
    const stone = (a, l, s) => { const row = Math.floor(a / 2); return M.hash3(row, seed + s, Math.floor((l + (row & 1) * 2) / 4)); };
    // vetas: líneas finas y continuas (cresta de un ruido suave), recortadas por una máscara
    const vein = (x, z, sc, w, s) => Math.abs(vnoise(x, z, sc, seed + s) - 0.5) < w && vnoise(x, z, sc * 1.7, seed + s + 1) > 0.45;
    // manchas: un punto de 2×2 en algunas celdas de una retícula de 6×6
    const spot = (x, z, p, s) => { const cx = Math.floor(x / 6), cz = Math.floor(z / 6); if (M.hash3(cx, seed + s, cz) > p) return false;
      const ox = 1 + Math.floor(M.hash3(cx, seed + s + 1, cz) * 3), oz = 1 + Math.floor(M.hash3(cx, seed + s + 2, cz) * 3);
      const dx = x - cx * 6 - ox, dz = z - cz * 6 - oz; return dx >= 0 && dx < 2 && dz >= 0 && dz < 2; };
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const a = alongX ? z : x, l = alongX ? x : z, t = (a + 0.5) / span;
      const m = Math.min(x, z, W - 1 - x, D - 1 - z);
      let h = 0, k = BASE;
      const n1 = M.hash3(x, seed, z), st = stone(a, l, 50);
      switch (style) {
        case 'crypt': {
          // bóveda de cañón: arcos fajones de hueso cada 16, nervio de clave y nichos oscuros entre fajones
          const hb = Math.round(Math.sin(t * Math.PI) * rise);
          h = hb;
          const p = l % 16;
          if (p < 2) { h = Math.max(0, hb - 1); k = RIB; if (p === 0 && hb > rise * 0.6) k = BONE; }
          else if (Math.abs(a - span / 2 + 0.5) < 1) { h = Math.max(0, hb - 1); k = RIB; }
          else if (t > 0.14 && t < 0.3 || t > 0.7 && t < 0.86) { if (p >= 5 && p <= 12) { h = hb + 2; k = DARK; if (p === 5 || p === 12) h = hb + 1; } }
          else if (st < 0.1) k = DARK;
          break;
        }
        case 'sewer': {
          // bóveda de ladrillo; el musgo cuelga solo en los arranques, donde gotea, y una rejilla en la clave
          const hb = Math.round(Math.sin(t * Math.PI) * rise);
          h = hb;
          if (Math.abs(a - span / 2 + 0.5) < 1.5 && l % 16 >= 6 && l % 16 < 10) { h = hb + 1; k = DARK; }
          else if (l % 16 < 2) { h = Math.max(0, hb - 1); k = RIB; }
          else if ((t < 0.2 || t > 0.8) && vnoise(x, z, 4, seed) > 0.42 + Math.min(t, 1 - t) * 1.5) k = MOSS;
          else if (st < 0.12) k = DARK;
          break;
        }
        case 'cathedral': {
          const bay = C.bay, v = ((l % bay) + 0.5) / bay;
          const hA = Math.round(Math.pow(Math.sin(t * Math.PI), 0.55) * rise);
          const hB = Math.round(Math.pow(Math.sin(v * Math.PI), 0.55) * rise * 0.85 + rise * 0.15);
          h = Math.min(hA, hB);
          k = PAINT;
          if (l % bay === 0 || l % bay === bay - 1) { k = RIB; h = Math.max(0, h - 1); }
          else if (Math.abs(hA - hB) <= 1 && h > 2) { k = RIB; h = Math.max(0, h - 1); }
          else if (Math.abs(a - span / 2 + 0.5) < 1 && h > rise - 3) { k = RIB; h = Math.max(0, h - 1); }
          if (Math.abs(a - span / 2 + 0.5) < 1.6 && Math.abs((l % bay) - bay / 2 + 0.5) < 1.6) { k = GOLD; h = Math.max(0, h - 2); }
          if (k === PAINT && n1 < 0.012 && h > rise * 0.5) k = STAR;
          if (t < 0.08 || t > 0.92) k = st < 0.2 ? DARK : BASE;
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
          // roca irregular pero suave, cuadros de entibado (vigas transversales + largueros) y vetas de cristal finas
          h = 3 + Math.round((vnoise(x, z, 7, seed) - 0.5) * 3 + (vnoise(x, z, 3, seed + 8) - 0.5) * 1.2);
          if (l % 12 < 2) { h = 0; k = WOOD; }
          else if (a === 5 || a === span - 6) { h = 1; k = WOOD; }
          else if (vein(x, z, 11, 0.022, 5)) { k = GLOW; h += 1; }
          else if (st < 0.15) k = DARK;
          break;
        }
        case 'forge': {
          // losas tiznadas, retícula de vigas de acero y grietas al rojo que forman líneas
          h = 2 + Math.round((vnoise(x, z, 8, seed) - 0.5) * 2);
          if (l % 12 < 2) { h = 0; k = RIB; }
          else if (a % 14 === 7) { h = 1; k = RIB; }
          else if (vein(x, z, 10, 0.02, 3)) { k = GLOW; h += 1; }
          else if (st < 0.35) k = DARK;
          break;
        }
        case 'fungal': {
          // cueva ondulada, mantos de musgo amplios y colonias luminosas de 2×2
          h = 3 + Math.round(vnoise(x, z, 9, seed) * 4 + vnoise(x, z, 4, seed + 9) * 1.5 - 1);
          if (vnoise(x, z, 8, seed + 2) > 0.55) k = MOSS;
          if (spot(x, z, 0.12, 60)) { k = GLOW; h += 1; }
          break;
        }
        default: {
          // vacío: cúpula baja de roca violeta con vetas brillantes continuas
          const dome = Math.round(Math.sin(t * Math.PI) * 4);
          h = 2 + dome + Math.round((vnoise(x, z, 8, seed) - 0.5) * 3);
          if (vein(x, z, 12, 0.02, 4)) { k = GLOW; h += 1; } else if (st < 0.22) k = DARK;
        }
      }
      // cornisa: moldura escalonada donde el techo se une a los muros (2 vóxeles)
      if (style !== 'coffer' && m >= 4 && m <= 5) { h = Math.min(h, m - 4); k = RIB; }
      else if (style !== 'coffer' && m === 6 && h > 1) h = Math.min(h, Math.max(2, h - 2));
      h = Math.max(0, h);
      C.h[z * W + x] = h; C.k[z * W + x] = k;
      if (h > maxH) maxH = h;
    }
    C.maxH = maxH;
    return C;
  }

  // bloque de cada material según el estilo
  function block(style, k) {
    const B = VX.Blocks;
    switch (style) {
      case 'crypt': return [B.CSTONE, B.CRIB, B.CGOLD, B.CSTAR, B.CSTONE, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
      case 'sewer': return [B.BRICK, B.CRIB, B.CGOLD, B.CSTAR, B.BRICK, B.PLANK, B.CHAIN, B.MOSS, B.CSTAR, B.BONE][k];
      case 'cathedral': return [B.CSTONE, B.CRIB, B.CGOLD, B.CSTAR, B.CPAINT, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
      case 'coffer': return [B.PLANK, B.CRIB, B.CGOLD, B.CSTAR, B.FRESCO, B.PLANK, B.WOOD, B.MOSS, B.CSTAR, B.BONE][k];
      case 'mine': return [B.CROCK, B.CRIB, B.CGOLD, B.MCRYST, B.CROCK, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
      case 'forge': return [B.CSTONE, B.STEEL, B.CGOLD, B.EMBER, B.CSTONE, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
      case 'fungal': return [B.CROCK, B.CRIB, B.CGOLD, B.FGLOW, B.CROCK, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
      default: return [B.CROCK, B.CRIB, B.CGOLD, B.VCRYST, B.CROCK, B.PLANK, B.CDARK, B.MOSS, B.CSTAR, B.BONE][k];
    }
  }

  const ORGANIC = new Set();
  function info(r) { return r.ceilPlan || (r.ceilPlan = plan(r)); }

  // altura (m) de la cara inferior del techo
  function ceilY(r, wx, wz) {
    const C = info(r);
    const x = M.clamp(Math.floor(wx / S) - r.ox, 0, C.W - 1), z = M.clamp(Math.floor(wz / S) - r.oz, 0, C.D - 1);
    return (r.ceilBase + C.h[z * C.W + x]) * S;
  }

  // Escribe el techo en la rejilla de la sala (tras la plantilla, para unir los pilares)
  function fill(r) {
    if (!ORGANIC.size) { const B0 = VX.Blocks; for (const t of [B0.BARK, B0.LEAF, B0.GLOWLEAF, B0.DEADWOOD, B0.CRYSTWOOD]) ORGANIC.add(t); }
    const C = info(r), B = VX.Blocks, W = r.W, D = r.D, H = r.H, cb = r.ceilBase;
    const shell = (x, z) => Math.min(x, z, W - 1 - x, D - 1 - z) < 4;
    const set = (x, y, z, t) => { if (!r.inBounds(x, y, z)) return; const i = r.idx(x, y, z); r.grid[i] = t; r.hp[i] = B.info[t].hp; };
    const baseT = block(C.style, BASE);
    // 1) la losa: desde la cara inferior hasta arriba del todo (y el muro sube hasta cerrar la bóveda)
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const m = Math.min(x, z, W - 1 - x, D - 1 - z);
      if (m === 0) { for (let y = cb; y < H; y++) set(x, y, z, B.BEDROCK); continue; }
      if (m < 4) { for (let y = cb; y < H; y++) set(x, y, z, baseT); continue; }
      const i = z * W + x, h = C.h[i], t = block(C.style, C.k[i]);
      const y0 = cb + h;
      // losa de 4 bloques de grosor que sigue el relieve (así un trozo recortado puede caerse)
      for (let y = y0; y < Math.min(H, y0 + 4); y++) set(x, y, z, y === y0 ? t : (y < y0 + 2 && C.k[i] !== BASE ? t : baseT));
      // 2) pilares, columnas y muros que llegaban a la base del techo suben hasta tocarlo (los árboles no)
      const below = r.grid[r.idx(x, cb - 1, z)];
      if (below && !B.invisible[below] && !B.transparent[below] && below !== B.PROP && below !== B.DOOR && below !== B.DOORWOOD && !ORGANIC.has(below))
        for (let y = cb; y < y0; y++) set(x, y, z, below);
    }
    decorate(r, C, set, shell);
  }

  // ---------------- decoración colgante (también de bloques) ----------------
  function decorate(r, C, set0, shell) {
    const B = VX.Blocks, W = C.W, D = C.D, cb = r.ceilBase, seed = C.seed;
    const set = (x, y, z, t) => { if (x < 4 || z < 4 || x >= W - 4 || z >= D - 4 || y < 2 || r.get(x, y, z)) return; set0(x, y, z, t); };
    const under = (x, z) => cb + C.h[M.clamp(z, 0, D - 1) * W + M.clamp(x, 0, W - 1)] - 1;   // primera celda libre bajo el techo
    const cellAt = (a, l) => (C.alongX ? [l, a] : [a, l]);
    const Hs = (i, s) => M.hash3(i, seed + s, 13);
    const column = (x, z, len, t, y = under(x, z)) => { for (let k = 0; k < len; k++) set(x, y - k, z, t); return y - len; };
    const stalactites = (n, t) => {
      for (let i = 0; i < n; i++) {
        const x = 5 + Math.floor(Hs(i, 40) * (W - 10)), z = 5 + Math.floor(Hs(i, 41) * (D - 10)), y = under(x, z);
        const len = 2 + Math.floor(Hs(i, 42) * 6), fat = Hs(i, 43) < 0.35;
        for (let k = 0; k < len; k++) {
          if (r.get(x, y - k - 1, z) || r.get(x + 1, y - k, z) || r.get(x - 1, y - k, z) || r.get(x, y - k, z + 1) || r.get(x, y - k, z - 1)) break;   // no se pega a lo que haya debajo (la copa de un árbol…)
          set(x, y - k, z, t);
          if (fat && k < len * 0.4) { set(x + 1, y - k, z, t); set(x, y - k, z + 1, t); set(x + 1, y - k, z + 1, t); }
        }
      }
    };
    const area = W * D;
    switch (C.style) {
      case 'crypt': {
        // calaveras en la clave de cada nervio
        for (let l = 0; l < C.len; l += 24) {
          const [x, z] = cellAt(Math.floor(C.span / 2) - 1, l), y = under(x, z);
          for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) set(x + dx, y - dy, z + dz, B.BONE);
          set(x + (C.alongX ? 0 : 2), y - 1, z + (C.alongX ? 2 : 0), B.BONE);
        }
        // cadenas con jaulas
        const n = Math.max(2, Math.round(C.len / 22));
        for (let i = 0; i < n; i++) {
          const a = Math.round((0.32 + Hs(i, 7) * 0.36) * C.span), l = Math.round((i + 0.5) / n * C.len);
          const [x, z] = cellAt(a, l), len = 3 + Math.floor(Hs(i, 8) * 5);
          const yb = column(x, z, len, B.CHAIN);
          if (Hs(i, 9) < 0.6) {
            for (let dy = 0; dy < 5; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
              const edge = dy === 0 || dy === 4 || ((dx !== 0 || dz !== 0) && (dx + dz) % 2 !== 0) || (Math.abs(dx) === 1 && Math.abs(dz) === 1);
              if (edge && !(dx === 0 && dz === 0 && dy > 0 && dy < 4)) set(x + dx, yb - dy, z + dz, B.CHAIN);
            }
            if (Hs(i, 10) < 0.5) set(x, yb - 3, z, B.BONE);
          }
        }
        stalactites(Math.round(area / 900), B.CSTONE);
        break;
      }
      case 'sewer': {
        // tuberías a lo largo con abrazaderas, y musgo que gotea
        for (const t of [0.26, 0.74]) {
          const a = Math.round(t * C.span);
          for (let l = 4; l < C.len - 4; l++) {
            const [x, z] = cellAt(a, l), y = under(x, z) - 1;
            set(x, y, z, l % 12 === 0 ? B.CRIB : B.STEEL);
            if (l % 12 === 0) set(x, y + 1, z, B.CHAIN);
          }
        }
        for (let i = 0; i < Math.round(area / 200); i++) {
          const x = 5 + Math.floor(Hs(i, 11) * (W - 10)), z = 5 + Math.floor(Hs(i, 12) * (D - 10));
          if (C.k[z * W + x] !== MOSS) continue;
          column(x, z, 1 + Math.floor(Hs(i, 13) * 3), B.MOSS);
        }
        break;
      }
      case 'cathedral': {
        // lámparas doradas colgando de las claves
        for (let l = C.bay / 2; l < C.len; l += C.bay * 2) {
          const [x, z] = cellAt(Math.floor(C.span / 2) - 1, Math.floor(l)), y = under(x, z) - 1;
          const room = y - 8;
          if (room < 6) continue;
          const len = Math.min(8, room - 6);
          for (let k = 0; k < len; k++) set(x, y - k, z, B.CHAIN);
          const ly = y - len;
          for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 3) set(x + dx, ly, z + dz, B.CGOLD);
          for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) set(x + dx, ly - 1, z + dz, B.LAMP);
          set(x, ly - 1, z, B.CGOLD);
        }
        break;
      }
      case 'coffer': {
        const x = Math.floor(W / 2), z = Math.floor(D / 2), y = under(x, z);
        for (let k = 0; k < 4; k++) set(x, y - k, z, B.CHAIN);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 3) set(x + dx, y - 4, z + dz, B.CGOLD);
        for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) set(x + dx, y - 5, z + dz, B.LAMP);
        break;
      }
      case 'mine': {
        // faroles colgando de las vigas
        for (let l = 1; l < C.len; l += 24) {
          const [x, z] = cellAt(Math.floor(C.span / 2), l + 1), y = under(x, z);
          set(x, y, z, B.CHAIN); set(x, y - 1, z, B.LAMP);
        }
        stalactites(Math.round(area / 350), B.CROCK);
        break;
      }
      case 'forge': {
        for (let i = 0; i < Math.round(C.len / 10); i++) {
          const a = Math.round((0.2 + Hs(i, 15) * 0.6) * C.span), l = Math.round(Hs(i, 16) * C.len), [x, z] = cellAt(a, l);
          const yb = column(x, z, 3 + Math.floor(Hs(i, 17) * 6), B.CHAIN);
          set(x, yb, z, B.STEEL); set(x + 1, yb, z, B.STEEL); set(x + 1, yb + 1, z, B.STEEL);   // garfio
        }
        stalactites(Math.round(area / 1200), B.CDARK);
        break;
      }
      case 'fungal': {
        stalactites(Math.round(area / 500), B.CROCK);
        for (let i = 0; i < Math.round(area / 260); i++) {
          const x = 5 + Math.floor(Hs(i, 20) * (W - 10)), z = 5 + Math.floor(Hs(i, 21) * (D - 10));
          if (Hs(i, 22) < 0.5) {
            const yb = column(x, z, 1 + Math.floor(Hs(i, 23) * 3), B.DEADWOOD);
            for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(x + dx, yb, z + dz, B.FGLOW);
          } else {
            let cx = x, cz = z, y = under(x, z);
            const len = 3 + Math.floor(Hs(i, 26) * 9);
            for (let k = 0; k < len; k++) { set(cx, y - k, cz, k % 4 === 3 && Hs(i * 7 + k, 27) < 0.3 ? B.GLOWLEAF : B.BARK); if (Hs(i * 7 + k, 28) < 0.2) cx += Hs(i * 7 + k, 29) < 0.5 ? 1 : -1; }
          }
        }
        break;
      }
      case 'void': {
        for (let i = 0; i < Math.round(area / 650); i++) {
          const x = 5 + Math.floor(Hs(i, 30) * (W - 10)), z = 5 + Math.floor(Hs(i, 31) * (D - 10));
          const n = 2 + Math.floor(Hs(i, 32) * 3);
          for (let k = 0; k < n; k++) {
            const dx = Math.floor((Hs(i * 5 + k, 34) - 0.5) * 3), dz = Math.floor((Hs(i * 5 + k, 35) - 0.5) * 3);
            column(x + dx, z + dz, 2 + Math.floor(Hs(i * 5 + k, 33) * 4), B.VCRYST);
          }
        }
        stalactites(Math.round(area / 500), B.CROCK);
        break;
      }
    }
  }

  VX.Ceilings = { plan, info, ceilY, fill };
})();
