// Generadores de modelos vóxel (humanoides, cuadrúpedos, jefes, vendedor).
// Cada parte es una caja de vóxeles con índice de rejilla para calcular
// superficie expuesta y conectividad (para poder cortar extremidades).
// Las partes se "esculpen" con una máscara de forma (esquinas redondeadas,
// cintura, espinillas finas, pies, cráneo abovedado…) y cada individuo
// lleva una semilla propia: no hay dos zombis iguales.
(function () {
  const M = VX.M;

  // dims: [w,h,d] en vóxeles; min: esquina mínima relativa al pivote (en vóxeles)
  // attach: capa por la que la parte está unida al cuerpo ('top' | 'bottom' | null)
  // shapeFn(i,j,k,dims) → false = fuera de la silueta (hueco permanente)
  function makePart(name, pivot, dims, min, v, colorFn, attach, shapeFn) {
    const vox = [];
    const [w, h, d] = dims;
    const N = w * h * d;
    const inside = new Uint8Array(N);
    const id = (i, j, k) => (i * h + j) * d + k;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++)
      inside[id(i, j, k)] = !shapeFn || shapeFn(i, j, k, dims) ? 1 : 0;
    const isIn = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < w && j < h && k < d && inside[id(i, j, k)];
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++)
        for (let k = 0; k < d; k++) {
          const x = (min[0] + i + 0.5) * v, y = (min[1] + j + 0.5) * v, z = (min[2] + k + 0.5) * v;
          let c = null;
          if (inside[id(i, j, k)]) {
            const surface = !isIn(i + 1, j, k) || !isIn(i - 1, j, k) || !isIn(i, j + 1, k) || !isIn(i, j - 1, k) || !isIn(i, j, k + 1) || !isIn(i, j, k - 1);
            c = colorFn(i, j, k, dims, surface);
          }
          // null = hueco (costillas, ropa rota…): el vóxel existe pero nunca está vivo
          vox.push(c ? { i, j, k, x, y, z, r: c[0], g: c[1], b: c[2], e: c[3] || 0, alive: true, exposed: true, wx: 0, wy: 0, wz: 0 }
            : { i, j, k, x, y, z, r: 0, g: 0, b: 0, e: 0, alive: false, ghost: true, exposed: false, wx: 0, wy: 0, wz: 0 });
        }
    let alive = 0;
    for (const vx of vox) if (vx.alive) alive++;
    const at = (a, b, c) => (a < 0 || b < 0 || c < 0 || a >= w || b >= h || c >= d) ? null : vox[(a * h + b) * d + c];
    for (const vx of vox) {
      if (!vx.alive) continue;
      vx.exposed = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => { const n = at(vx.i + a, vx.j + b, vx.k + c); return !n || !n.alive; });
    }
    return {
      name, pivot: pivot.map((p) => p * v), dims, vox, total: alive, alive,
      attach, ax: 0, ay: 0, az: 0, q: [0, 0, 0, 1], wp: [0, 0, 0], detached: false, noBreak: false, parent: null,
    };
  }

  const jit = (c, amt, i, j, k) => {
    const h = (M.hash3(i * 7 + 3, j * 13 + 1, k * 5 + 11) - 0.5) * amt;
    return [c[0] + h, c[1] + h, c[2] + h, c[3] || 0];
  };
  const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const FLESH = [0.6, 0.07, 0.08], FLESH2 = [0.42, 0.04, 0.06], BONE = [0.86, 0.82, 0.7], GUTS = [0.62, 0.3, 0.32];
  const DARK = [0.06, 0.03, 0.03], MOUTH = [0.22, 0.02, 0.03], TOOTH = [0.86, 0.8, 0.58], METAL = [0.36, 0.37, 0.4], RUST = [0.45, 0.22, 0.1];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------------- Máscaras de forma ----------------
  const edgeI = (i, w) => i === 0 || i === w - 1;
  // extremidad: sección octogonal; las piernas llevan pie hacia delante y espinilla más fina
  const legShape = (foot, slim) => (i, j, k, [w, h, d]) => {
    const dd = d - foot;
    if (j >= 2 && k >= dd) return false;                     // el pie sólo abajo
    const ek = k === 0 || (j >= 2 ? k === dd - 1 : k === d - 1);
    if (w >= 3 && d >= 3 && edgeI(i, w) && ek) return false; // esquinas redondeadas
    if (slim && w >= 5 && j >= 2 && j <= Math.floor(h * 0.45) && (edgeI(i, w) || k === 0 || k === dd - 1)) return false; // espinilla
    return true;
  };
  const armShape = (cfg) => (i, j, k, [w, h, d]) => {
    const ek = k === 0 || k === d - 1, ei = edgeI(i, w);
    if (w >= 3 && d >= 3 && ei && ek) return false;
    if (cfg.claws && j === 0 && w >= 3 && i % 2 === 1) return false;     // dedos separados
    if (cfg.forearm === 'thin' && w >= 4 && j >= 2 && j <= Math.floor(h * 0.5) && ei) return false;
    if (cfg.forearm === 'thick' && w >= 5 && j >= Math.floor(h * 0.55) && j < h - 2 && (ei || ek)) return false;   // brazo de gorila
    return true;
  };
  const corner = (i, k, w, d) => Math.min(i, w - 1 - i) + Math.min(k, d - 1 - k);
  const torsoShape = (cfg) => (i, j, k, [w, h, d]) => {
    const ei = edgeI(i, w), ek = k === 0 || k === d - 1;
    if (w >= 6 && d >= 4 && corner(i, k, w, d) <= (w >= 10 && d >= 6 ? 1 : 0)) return false;
    if (cfg.waist !== false && w >= 8 && j < Math.floor(h * 0.3) && ei) return false;
    if (j === h - 1 && ek && (i <= 1 || i >= w - 2)) return false;      // hombros caídos
    if (cfg.hunch && k === d - 1 && j >= h - 2) return false;           // espalda encorvada: pecho hundido arriba
    return true;
  };
  const headShape = (cfg) => (i, j, k, [w, h, d]) => {
    const c = corner(i, k, w, d), big = w >= 8 ? 1 : 0;
    if (w >= 5 && c <= big + (j === h - 1 ? 2 : 0) + (j === h - 2 ? big : 0)) return false;   // cráneo redondeado
    if (j === h - 1 && (edgeI(i, w) || k === 0 || k === d - 1)) return false;
    if (cfg.jaw && j < 2 && k >= 2 && i >= 1 && i <= w - 2) return false; // hueco de la mandíbula
    if (cfg.jaw && j < 2 && k === d - 1) return false;
    return true;
  };

  // Formas clásicas (zombis): cajas rectas como los originales, sólo con la puntera
  // del zapato, las esquinas de arriba de la cabeza y el hueco de la mandíbula
  const blockyLeg = (foot) => (i, j, k, [w, h, d]) => !(k >= d - foot && j >= 1);
  const blockyArm = (cfg) => (i, j, k, [w]) => !(cfg.claws && j === 0 && w >= 3 && i % 2 === 1);
  const blockyTorso = (cfg) => (i, j, k, [w, h, d]) => !(cfg.hunch && k === d - 1 && j >= h - 2 && (i <= 1 || i >= w - 2));
  const blockyHead = (cfg) => (i, j, k, [w, h, d]) => {
    if (j === h - 1 && corner(i, k, w, d) === 0) return false;
    if (cfg.jaw && j < 2 && k >= 2 && i >= 1 && i <= w - 2) return false;
    if (cfg.jaw && j < 2 && k === d - 1) return false;
    return true;
  };

  // ================= HUMANOIDE =================
  // cfg: { v, leg, torso, arm, head, skin, shirt, pants, eye, shoes, hood?, sleeve?, tear?, ragged?, hair?,
  //        jaw?, foot?, claws?, forearm?, style?, extras?, bones?, magma?, pustules?, ... }
  function humanoid(cfg) {
    if (cfg.bones) return skeleton(cfg);
    const v = cfg.v;
    const [lw, lh, ld] = cfg.leg, [tw, th, td] = cfg.torso, [aw, ah, ad] = cfg.arm, [hw, hh, hd] = cfg.head;
    const blocky = !!cfg.blocky;
    const foot = cfg.foot ?? (blocky ? 1 : 2);
    const hipY = lh;
    const sd = (Math.random() * 9973) | 0;                       // semilla del individuo
    const H = (i, j, k, s = 0) => M.hash3(i + sd + s * 31, j + (sd >> 3) + s * 7, k + s * 17 + (sd >> 5));
    const J = (c, amt, i, j, k) => { const h = (H(i * 7 + 3, j * 13 + 1, k * 5 + 11, 9) - 0.5) * amt; return [c[0] + h, c[1] + h, c[2] + h, c[3] || 0]; };
    const patch = (i, j, k, p, s = 0) => H(i >> 1, j >> 1, k >> 1, s + 40) < p;
    const stain = (i, j, k, p, s = 0) => H(i, j, k, s + 60) < p;
    const dirty = !cfg.clean;
    // grietas de magma: bordes entre "placas" irregulares de carne carbonizada
    const plate = (i, j, k) => Math.floor(H(Math.floor((i + 2 * Math.sin(j * 0.7 + sd)) / 5), Math.floor((j + 2 * Math.sin(i * 0.9 + k * 0.5)) / 6), Math.floor((k + 2 * Math.sin(j * 0.6)) / 5), 33) * 8);
    const magma = (i, j, k) => cfg.magma && (plate(i, j, k) !== plate(i + 1, j, k) || plate(i, j, k) !== plate(i, j + 1, k)) && H(i, j, k, 34) < 0.5;
    const sideWound = Math.random() < 0.5 ? 0 : 1;          // lado de la herida abierta
    const oneEye = cfg.oneEyeChance && Math.random() < cfg.oneEyeChance;

    const limbInner = (i, j, k, dims) => {
      const cx = (dims[0] - 1) / 2, cz = (Math.min(dims[2], ld) - 1) / 2;
      if (Math.abs(i - cx) <= 0.6 && Math.abs(k - cz) <= 0.6) return J(BONE, 0.06, i, j, k);
      return H(i, j, k, 1) > 0.5 ? FLESH : FLESH2;
    };
    const torsoInner = (i, j, k, dims) => {
      if (j > dims[1] * 0.45 && (j % 2 === 0) && (k === 1 || k === dims[2] - 2)) return J(BONE, 0.05, i, j, k);
      if (Math.abs(i - (dims[0] - 1) / 2) <= 0.6 && k === 1) return J(BONE, 0.05, i, j, k);
      return H(i, j, k, 2) > 0.6 ? GUTS : (H(i, k, j, 3) > 0.5 ? FLESH : FLESH2);
    };

    const legFn = (i, j, k, dims, surf) => {
      if (cfg.dress && surf) { const dc = cfg.dress('leg', i, j, k, dims); if (dc) return dc; }   // ropa de los jugadores (Armería → PERSONAJE)
      if (magma(i, j, k)) return [1, 0.45, 0.1, 1];
      if (!surf) return limbInner(i, j, k, dims);
      if (j <= 1) {
        if (cfg.barefoot) return (k === dims[2] - 1 && i % 2 === 1) ? J(mul(cfg.skin, 0.6), 0.04, i, j, k) : J(mul(cfg.skin, 0.85), 0.06, i, j, k);
        return J(cfg.shoes, 0.04, i, j, k);
      }
      if (blocky && j === 1 && k >= ld) return J(mul(cfg.shoes, 1.3), 0.03, i, j, k);              // puntera
      if (blocky && j === 2) return J(cfg.barefoot ? mul(cfg.skin, 0.8) : mul(cfg.pants, 0.7), 0.04, i, j, k);   // dobladillo / tobillo
      if (cfg.barefoot && j <= 3) return J(cfg.skin, 0.07, i, j, k);
      const knee = Math.round(lh * 0.48);
      if (blocky && Math.abs(j - knee) <= 1 && k === ld - 1 && H(i, 0, 0, 44) < 0.5) return J(mul(cfg.pants, 0.62), 0.04, i, j, k);   // rodilla gastada
      if (cfg.ragged && j > 2 && H(i >> 1, j >> 1, k, 13) < cfg.ragged * 0.7) return J(cfg.skin, 0.07, i, j, k);
      if (patch(i, j, k, cfg.tear ?? 0.12, 3)) return J(cfg.skin, 0.07, i, j, k);
      if (dirty && stain(i, j, k, 0.07)) return J([0.4, 0.05, 0.05], 0.05, i, j, k);
      if (blocky && (i === 0 || i === lw - 1) && j > 3 && H(0, j, k, 45) < 0.08) return J(mul(cfg.pants, 1.25), 0.03, i, j, k);   // costura
      if (cfg.style === 'armor' && j > lh * 0.55 && (j % 4 === 0)) return J(METAL, 0.05, i, j, k);
      return J(cfg.pants, 0.05, i, j, k);
    };

    const torsoFn = (i, j, k, dims, surf) => {
      if (cfg.dress && surf) { const dc = cfg.dress('torso', i, j, k, dims); if (dc) return dc; }   // ropa de los jugadores (Armería → PERSONAJE)
      const [w, h, d] = dims;
      const front = k === d - 1, back = k === 0;
      if (magma(i, j, k)) return [1, 0.5, 0.12, 1];
      // ropa hecha jirones: agujeros que dejan ver costillas y vísceras
      if (cfg.ragged && surf && j > 1 && H((i >> 1) + 21, (j >> 1) + 5, k, 4) < cfg.ragged) return null;
      // herida abierta en un costado (se ven las costillas)
      if (cfg.wound && surf && i === (sideWound ? w - 1 : 0) && j > h * 0.35 && j < h * 0.8 && k > 0 && k < d - 1) return j % 2 ? J(BONE, 0.05, i, j, k) : null;
      if (!surf) return torsoInner(i, j, k, dims);
      if (cfg.pustules && H(i + 3, j + 7, k + 1, 6) < 0.12) return [0.75, 1, 0.25, 0.9];
      if (j === 0 && cfg.style !== 'bare') return J([0.18, 0.12, 0.08], 0.03, i, j, k);   // cinturón
      if (cfg.style === 'robe') return j === 0 || (front && Math.abs(i - (w - 1) / 2) < 0.6) ? [0.6, 0.45, 0.15] : J(H(i, j >> 1, k, 36) < 0.2 ? mul(cfg.shirt, 0.8) : cfg.shirt, 0.04, i, j, k);
      if (cfg.style === 'charred') return J(H(i >> 1, j >> 1, k, 35) < 0.3 ? mul(cfg.skin, 1.6) : cfg.skin, 0.05, i, j, k);
      if (cfg.style === 'bare' || cfg.style === 'gaunt') {
        // torso desnudo: costillas marcadas, ombligo y suciedad
        const ribs = j > h * 0.45 && j < h - 2 && j % 2 === 0 && (front || edgeI(i, w)) && Math.abs(i - (w - 1) / 2) > 0.8;
        if (ribs) return J(mix(cfg.skin, BONE, cfg.style === 'gaunt' ? 0.45 : 0.25), 0.05, i, j, k);
        if (front && Math.abs(i - (w - 1) / 2) < 0.6 && j === Math.floor(h * 0.3)) return J(mul(cfg.skin, 0.5), 0.03, i, j, k);
        if (dirty && patch(i, j, k, 0.14, 1)) return J([0.45, 0.04, 0.05], 0.06, i, j, k);
        if (cfg.stitches && front && (i === Math.floor(w / 2)) && j > 2) return j % 2 ? [0.1, 0.06, 0.05] : J(mul(cfg.skin, 0.7), 0.04, i, j, k);
        return J(cfg.skin, 0.07, i, j, k);
      }
      if (cfg.style === 'armor') {
        // peto de chapas remachadas
        if (front || back) {
          if (j % 4 === 0) return J(mul(METAL, 0.7), 0.03, i, j, k);
          if ((i === 1 || i === w - 2) && j % 4 === 2) return [0.6, 0.6, 0.62];
          return H(i >> 1, j >> 1, 7, 8) < 0.18 ? J(RUST, 0.05, i, j, k) : J(METAL, 0.05, i, j, k);
        }
        return J(cfg.shirt, 0.05, i, j, k);
      }
      if (cfg.style === 'apron' && front && j < h * 0.85 && i > 0 && i < w - 1) return dirty && patch(i, j, k, 0.3, 2) ? J([0.5, 0.05, 0.06], 0.06, i, j, k) : J([0.72, 0.68, 0.6], 0.05, i, j, k);
      if (dirty && patch(i, j, k, 0.1, 1)) return J([0.45, 0.04, 0.05], 0.06, i, j, k);
      if (patch(i, j, k, cfg.tear ?? 0.15, 5)) return J(cfg.skin, 0.07, i, j, k);
      // camisa: botones, cuello y arrugas
      if (front && Math.abs(i - (w - 1) / 2) < 0.6 && j % 3 === 1 && j > 1) return J(mul(cfg.shirt, 0.55), 0.02, i, j, k);
      if (j >= h - 2 && front && Math.abs(i - (w - 1) / 2) < 1.6) return J(cfg.skin, 0.06, i, j, k);
      return J(H(i, j >> 1, k, 10) < 0.2 ? mul(cfg.shirt, 0.82) : cfg.shirt, 0.05, i, j, k);
    };

    const armFn = (i, j, k, dims, surf) => {
      if (cfg.dress && surf) { const dc = cfg.dress('arm', i, j, k, dims); if (dc) return dc; }   // ropa de los jugadores (Armería → PERSONAJE)
      const h = dims[1];
      if (cfg.ragged && surf && j > 2 && j < h * 0.45 && H(i, j, k + (dims[0] > 3 ? 7 : 1), 11) < cfg.ragged * 1.4) return null;   // antebrazo descarnado
      if (magma(i, j, k)) return [1, 0.45, 0.1, 1];
      if (!surf) return limbInner(i, j, k, dims);
      if (cfg.claws && j <= 1) return j === 0 ? J([0.16, 0.13, 0.1], 0.04, i, j, k) : J(mul(cfg.skin, 0.75), 0.05, i, j, k);
      if (j <= 1) return J(mul(cfg.skin, 0.8), 0.05, i, j, k);                                   // manos
      if (cfg.manacles && (j === 3 || j === 4)) return j === 3 ? J(METAL, 0.04, i, j, k) : J(mul(METAL, 0.7), 0.03, i, j, k);
      if (cfg.style === 'armor' && j >= h - 4) return J(METAL, 0.05, i, j, k);
      if (j >= h * (cfg.shortSleeve ? 0.75 : 0.55) && cfg.style !== 'bare' && cfg.style !== 'gaunt') {
        if (j === Math.ceil(h * (cfg.shortSleeve ? 0.75 : 0.55)) && H(i, j, k, 12) < 0.5) return J(mul(cfg.sleeve || cfg.shirt, 0.7), 0.04, i, j, k);   // puño deshilachado
        return J(cfg.sleeve || cfg.shirt, 0.05, i, j, k);
      }
      if (dirty && stain(i, j, k, 0.09, 2)) return J([0.45, 0.05, 0.05], 0.05, i, j, k);
      if (dirty && H(i, j >> 1, k, 14) < 0.12) return J(mix(cfg.skin, [0.2, 0.25, 0.3], 0.5), 0.04, i, j, k);   // venas/moratones
      return J(cfg.skin, 0.07, i, j, k);
    };

    const headFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      const face = k === d - 1 || (k === d - 2 && (i === 0 || i === w - 1));
      if (magma(i, j, k)) return [1, 0.5, 0.12, 1];
      if (!surf) {
        if (j >= 1 && j <= h - 2 && i >= 1 && i <= w - 2 && k >= 1 && k <= d - 2 && H(i, j, k, 15) > 0.4) return [0.75, 0.55, 0.55]; // sesos
        return J(BONE, 0.05, i, j, k);
      }
      if (cfg.hood && (j >= h - 2 || k <= 1 || i === 0 || i === w - 1) && !(k === d - 1 && j < h - 2)) return J(cfg.hood, 0.04, i, j, k);
      if (k === d - 1) {
        const ew = w >= 9 ? 2 : 1;
        const le = Math.max(1, Math.round(w * 0.2)), re = w - le - ew;
        const er = h - 3 - (h >= 9 ? 1 : 0);
        const inEye = (ii) => ii >= le && ii < le + ew || ii >= re && ii < re + ew;
        if (cfg.human) {
          // cara de persona (jugadores): ojos con blanco, cejas del color del pelo, nariz y boca
          if (j >= er && j < er + ew && inEye(i)) return [0.08, 0.08, 0.12];
          if (j >= er && j < er + ew && (i === le - 1 || i === re + ew)) return [0.92, 0.92, 0.88];
          if (j === er + ew && (inEye(i) || i === le - 1 || i === re + ew)) return cfg.hair ? mul(cfg.hair, 0.9) : J(mul(cfg.skin, 0.6), 0.03, i, j, k);
          if (Math.abs(i - (w - 1) / 2) < 0.6 && j === er - 1) return J(mul(cfg.skin, 0.82), 0.02, i, j, k);
          if (Math.abs(i - (w - 1) / 2) < 1.1 && j === er - 3) return cfg.girl ? [0.72, 0.3, 0.36] : [0.5, 0.22, 0.22];
          if (cfg.girl && j === er - 2 && (i === 1 || i === w - 2)) return J(mix(cfg.skin, [0.9, 0.45, 0.45], 0.35), 0.02, i, j, k);   // colorete
          if (cfg.girl && j === er + ew - 1 && (i === le - 1 || i === re + ew)) return [0.1, 0.08, 0.08];   // pestañas
          if (j < h - 1) return J(cfg.skin, 0.04, i, j, k);
        }
        // ojos hundidos y brillantes (a veces falta uno: cuenca vacía)
        if (j >= er && j < er + ew && inEye(i)) {
          if (oneEye && i >= re) return DARK;
          return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];
        }
        if ((j === er - 1 || j === er + ew) && (inEye(i) || inEye(i - 1) || inEye(i + 1))) return J(mul(cfg.skin, 0.45), 0.03, i, j, k);   // ojeras
        if (j === er + ew && cfg.brow) return J(mul(cfg.skin, 0.6), 0.03, i, j, k);
        if (Math.abs(i - (w - 1) / 2) < 0.6 && j === er - 2) return DARK;                                 // nariz podrida
        if (cfg.jaw && j === 2 && i >= 1 && i <= w - 2) return i % 2 ? J(TOOTH, 0.06, i, j, k) : MOUTH;   // dientes de arriba
        if (cfg.cheekTear && j >= 2 && j <= 3 && i === (sideWound ? w - 2 : 1)) return j === 2 ? J(TOOTH, 0.05, i, j, k) : FLESH2;
      }
      if (cfg.hair && j === h - 1 && H(i, k, 77, 16) < cfg.hair[3]) return J(cfg.hair, 0.06, i, j, k);
      if (cfg.hair && j >= h - 3 && (k <= 1 || i === 0 || i === w - 1) && H(i, j, k, 17) < cfg.hair[3] * 0.8) return J(cfg.hair, 0.05, i, j, k);
      if (dirty && patch(i, j, k, 0.12, 9)) return J([0.5, 0.06, 0.06], 0.05, i, j, k);
      if (dirty && stain(i, j, k, 0.08, 4)) return J(BONE, 0.05, i, j, k);   // cráneo asomando
      return J(cfg.skin, 0.06, i, j, k);
    };

    const jawFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      if (j === h - 1 && k === d - 1) return i % 2 ? MOUTH : J(TOOTH, 0.06, i, j, k);   // dientes de abajo
      if (j === h - 1 && k >= 1) return k >= d - 3 ? [0.4, 0.06, 0.08] : MOUTH;           // lengua y garganta
      if (cfg.drool && j === 0 && k === d - 1 && i === 1) return [0.55, 0.95, 0.3, 0.7];
      if (dirty && H(i, j, k, 18) < 0.2) return J([0.45, 0.05, 0.05], 0.05, i, j, k);
      if (cfg.magma && H(i, j, k, 19) < 0.25) return [1, 0.5, 0.12, 1];
      return J(mul(cfg.skin, 0.92), 0.06, i, j, k);
    };

    const parts = [];
    const ldF = ld + foot;
    const LS = blocky ? blockyLeg(foot) : legShape(foot, cfg.slimLegs !== false);
    parts.push(makePart('legL', [-lw / 2, hipY, 0], [lw, lh, ldF], [-lw / 2, -lh, -ld / 2], v, legFn, 'top', LS));
    parts.push(makePart('legR', [lw / 2, hipY, 0], [lw, lh, ldF], [-lw / 2, -lh, -ld / 2], v, legFn, 'top', LS));
    parts.push(makePart('torso', [0, hipY, 0], cfg.torso, [-tw / 2, 0, -td / 2], v, torsoFn, 'bottom', blocky ? blockyTorso(cfg) : torsoShape(cfg)));
    const shY = hipY + th - aw / 2;
    const AS = blocky ? blockyArm(cfg) : armShape(cfg);
    parts.push(makePart('armL', [-(tw / 2 + aw / 2), shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top', AS));
    parts.push(makePart('armR', [tw / 2 + aw / 2, shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top', AS));
    const headZ = cfg.headFwd || 0;
    parts.push(makePart('head', [0, hipY + th, headZ], cfg.head, [-hw / 2, 0, -hd / 2], v, headFn, 'bottom', blocky ? blockyHead(cfg) : headShape(cfg)));
    for (const p of parts) if (p.name.startsWith('arm') || p.name === 'head') p.parent = 'torso';
    if (cfg.jaw) {
      // mandíbula articulada: bisagra atrás, se abre al gruñir y al morder
      const jp = makePart('jaw', [0, hipY + th + 2, headZ - hd / 2 + 2], [hw - 2, 2, hd - 2], [-(hw - 2) / 2, -2, 0], v, jawFn, null);
      jp.parent = 'head';
      parts.push(jp);
    }
    const model = { parts, height: (hipY + th + hh) * v, width: (tw + aw * 2) * v, v, depth: td * v };
    for (const ex of cfg.extras || []) addExtra(model, ex, cfg, H);
    return model;
  }

  // ================= ESQUELETO =================
  // Huesos finos con articulaciones, costillar con huecos, cráneo hueco con cuencas
  // profundas, mandíbula suelta y un brillo de alma dentro del pecho.
  function skeleton(cfg) {
    const v = cfg.v;
    const [lw, lh, ld] = cfg.leg, [tw, th, td] = cfg.torso, [aw, ah, ad] = cfg.arm, [hw, hh, hd] = cfg.head;
    const sd = (Math.random() * 9973) | 0;
    const H = (i, j, k, s = 0) => M.hash3(i + sd + s * 31, j + (sd >> 3) + s * 7, k + s * 17);
    const B = (i, j, k, f = 1) => { const h = (H(i, j, k, 1) - 0.5) * 0.08, c = cfg.skin, old = H(i >> 1, j >> 1, k, 2) < 0.2 ? 0.82 : 1; return [c[0] * f * old + h, c[1] * f * old + h, c[2] * f * old * 0.95 + h]; };
    const glow = cfg.eye;

    // pierna: fémur, rótula, tibia y peroné, tobillo y pie con dedos
    const legFn = (i, j, k, [w, h, d], surf) => {
      const ci = (w - 1) / 2, ck = (ld - 1) / 2;
      if (j <= 1) {                                                   // pie
        if (j === 0 && k >= ld && i % 2 === 1) return null;
        return (Math.abs(i - ci) <= 1 && k >= 0) ? B(i, j, k, 0.92) : null;
      }
      if (k >= ld) return null;
      const knee = Math.abs(j - Math.round(h * 0.47)) <= 1, hip = j >= h - 2, ankle = j === 2;
      if (knee || hip || ankle) return (Math.abs(i - ci) <= 1 && Math.abs(k - ck) <= 1 && !(edgeI(i, w) && (k === 0 || k === ld - 1))) ? B(i, j, k, knee ? 1.05 : 1) : null;
      if (j < h * 0.47) return (k === Math.round(ck) && (i === 0 || i === w - 1)) ? B(i, j, k) : null;   // tibia y peroné
      return (Math.abs(i - ci) <= 0.6 && Math.abs(k - ck) <= 0.6) || (i === Math.round(ci) && k === 0) ? B(i, j, k) : null;   // fémur
    };
    // brazo: hueso macizo de 2×2 con cabeza del húmero, codo marcado y mano de falanges
    const armFn = (i, j, k, [w, h, d], surf) => {
      const elbow = Math.round(h * 0.52);
      if (j <= 3) {                                               // mano: palma y dedos separados
        if (j <= 1) return (i + k) % 2 === 0 ? B(i, j, k, 0.92) : null;
        return B(i, j, k, 0.95);
      }
      if (j === 4) return (i + k) % 2 ? B(i, j, k, 0.8) : null;   // muñeca
      if (Math.abs(j - elbow) <= 0) return B(i, j, k, 1.12);      // codo
      if (j === elbow - 1 || j === elbow + 1) return B(i, j, k, 0.78);
      if (j >= h - 2) return B(i, j, k, 1.08);                   // cabeza del húmero
      return B(i, j, k, j < elbow ? 0.95 : 1);
    };
    // tronco: pelvis, columna, costillas curvas, esternón, clavículas y alma
    const torsoFn = (i, j, k, [w, h, d], surf) => {
      const ci = (w - 1) / 2;
      const spine = Math.abs(i - ci) <= 0.6 && k <= 1;
      if (spine) return B(i, j, k, j % 2 ? 0.88 : 1.02);                           // vértebras
      if (j <= 2) {                                                                // pelvis en cuenco
        if (j === 0) return Math.abs(i - ci) >= 1.4 && Math.abs(i - ci) <= w / 2 - 1 && k >= 1 && k <= d - 2 && surf ? B(i, j, k) : null;
        return surf && (edgeI(i, w) || k === 0 || (k === d - 1 && Math.abs(i - ci) > 1.5)) && !(edgeI(i, w) && (k === 0 || k === d - 1)) ? B(i, j, k) : null;
      }
      if (j <= 5) return null;                                                     // vientre vacío
      if (j >= h - 1) return k === Math.floor(d / 2) || (k === 0) ? B(i, j, k) : null;   // clavículas
      const sternum = Math.abs(i - ci) <= 0.6 && k === d - 1 && j >= h * 0.5;
      if (sternum) return B(i, j, k, 1.04);
      const rib = j % 2 === 0 && surf && !(Math.abs(i - ci) <= 1.4 && k === d - 1) && !(edgeI(i, w) && (k === 0 || k === d - 1));
      if (rib) return B(i, j, k);
      // alma: un núcleo que brilla tenue dentro del costillar
      if (!surf && Math.abs(i - ci) <= 1 && Math.abs(i - ci) > 0.4 && (j === Math.round(h * 0.62) || j === Math.round(h * 0.62) + 1) && k >= 2 && k <= d - 3) return [glow[0] * 0.7, glow[1] * 0.7, glow[2] * 0.7, 0.55];
      return null;
    };
    const skullShape = (i, j, k, [w, h, d]) => {
      const ei = edgeI(i, w), ek = k === 0 || k === d - 1;
      if (ei && ek) return false;
      if (j === h - 1 && (ei || ek)) return false;
      if (j < 2 && k >= 2 && i >= 1 && i <= w - 2) return false;
      if (j < 2 && (k === d - 1 || k === 0)) return false;
      if (j < 3 && ei && k >= d - 3) return false;                                  // pómulos marcados
      return true;
    };
    const headFn = (i, j, k, [w, h, d], surf) => {
      const ci = (w - 1) / 2;
      if (!surf) return null;                                                      // cráneo hueco
      if (k === d - 1) {
        const er = h - 4;
        const eyeL = i >= 1 && i <= 2, eyeR = i >= w - 3 && i <= w - 2;
        if (j >= er && j <= er + 1 && (eyeL || eyeR)) return null;                 // cuencas (se ve el ojo detrás)
        if (j === er - 2 && Math.abs(i - ci) <= 0.6) return null;                  // nariz
        if (j === er - 1 && Math.abs(i - ci) <= 0.6) return null;
        if (j === 2) return i % 2 ? B(i, j, k, 1.1) : [0.05, 0.03, 0.02];          // dientes
      }
      if (H(i, j, k, 3) < 0.05) return [0.12, 0.1, 0.08];                          // grietas
      return B(i, j, k);
    };
    // ojos: puntos de luz dentro de las cuencas
    const eyeFn = (i, j, k, [w, h, d]) => (k === d - 2 && j >= h - 4 && j <= h - 3 && ((i >= 1 && i <= 2) || (i >= w - 3 && i <= w - 2)))
      ? ((j === h - 4) ? [glow[0], glow[1], glow[2], 1] : [glow[0] * 0.6, glow[1] * 0.3, glow[2] * 0.3, 1]) : null;
    const jawFn = (i, j, k, [w, h, d]) => {
      if (j === h - 1 && k === d - 1) return i % 2 ? B(i, j, k, 1.1) : null;
      if (j === h - 1) return null;
      return (edgeI(i, w) || k === d - 1) ? B(i, j, k, 0.95) : null;
    };

    const parts = [];
    const foot = 2, hipY = lh;
    parts.push(makePart('legL', [-lw / 2, hipY, 0], [lw, lh, ld + foot], [-lw / 2, -lh, -ld / 2], v, legFn, 'top'));
    parts.push(makePart('legR', [lw / 2, hipY, 0], [lw, lh, ld + foot], [-lw / 2, -lh, -ld / 2], v, legFn, 'top'));
    parts.push(makePart('torso', [0, hipY, 0], cfg.torso, [-tw / 2, 0, -td / 2], v, torsoFn, 'bottom'));
    const shY = hipY + th - aw / 2;
    parts.push(makePart('armL', [-(tw / 2 + aw / 2 - 0.5), shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top'));
    parts.push(makePart('armR', [tw / 2 + aw / 2 - 0.5, shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top'));
    // cuello: dos vértebras entre el tronco y el cráneo
    const neckH = 2;
    const head = makePart('head', [0, hipY + th + neckH, 0.5], cfg.head, [-hw / 2, 0, -hd / 2], v, (i, j, k, dims, surf) => headFn(i, j, k, dims, surf) || eyeFn(i, j, k, dims), 'bottom',
      (i, j, k, dims) => skullShape(i, j, k, dims) || !!eyeFn(i, j, k, dims));
    parts.push(head);
    // las vértebras del cuello van con el cráneo (si vuela la cabeza, se van con ella)
    const neck = makePart('neck', [0, hipY + th, 0], [1, neckH, 1], [-0.5, 0, -1.5], v, (i, j, k) => B(i, j, k, j % 2 ? 0.9 : 1), null);
    neck.parent = 'torso'; parts.push(neck);
    for (const p of parts) if (p.name.startsWith('arm') || p.name === 'head') p.parent = 'torso';
    const jp = makePart('jaw', [0, hipY + th + neckH + 2, 0.5 - hd / 2 + 2], [hw - 2, 2, hd - 2], [-(hw - 2) / 2, -2, 0], v, jawFn, null);
    jp.parent = 'head'; parts.push(jp);
    const model = { parts, height: (hipY + th + neckH + hh) * v, width: (tw + aw * 2) * v, v, depth: td * v };
    for (const ex of cfg.extras || []) addExtra(model, ex, cfg, H);
    return model;
  }

  // ================= PIEZAS EXTRA =================
  // Se cuelgan de otra parte (padre) y se pueden arrancar a tiros.
  function addExtra(model, ex, cfg, H) {
    const v = cfg.v, P = (n) => model.parts.find((x) => x.name === n);
    const T = P('torso'), Hd = P('head');
    const [tw, th, td] = cfg.torso, [hw, hh, hd] = cfg.head;
    const hipY = cfg.leg[1];
    const neck = cfg.bones ? 2 : 0;
    const headBase = hipY + th + neck, headZ = cfg.bones ? 0.5 : (cfg.headFwd || 0);
    const add = (name, parent, pivot, dims, min, fn, shape, extra = {}) => {
      const p = makePart(name, pivot, dims, min, v, fn, null, shape);
      p.parent = parent; Object.assign(p, extra);
      if (p.alive > 0) model.parts.push(p);
      return p;
    };
    const rnd = (i, j, k, s) => (H ? H(i, j, k, s) : M.hash3(i, j, k + s));
    switch (ex) {
      case 'guts': {   // intestinos colgando de la tripa
        add('guts', 'torso', [M.rand(-1, 1), hipY + 2, td / 2], [3, 7, 2], [-1.5, -7, -0.5],
          (i, j, k) => (Math.abs(i - 1 + Math.sin(j * 0.9)) < 0.9 ? (rnd(i, j, k, 3) < 0.3 ? [0.5, 0.1, 0.12] : [0.72, 0.36, 0.38]) : null), null, { sway: 0.25 });
        break;
      }
      case 'hairLong': {   // melena sucia que cae por la espalda
        add('hair', 'head', [0, headBase + hh, headZ - hd / 2], [hw - 2, hh + 5, 1], [-(hw - 2) / 2, -hh - 5, -1],
          (i, j, k, [w, h]) => (i % 2 === 0 || rnd(i, 0, k, 4) < 0.4) && j >= Math.floor(rnd(i, 1, k, 5) * 8) ? [cfg.hair[0] * (0.8 + rnd(i, j, k, 6) * 0.4), cfg.hair[1], cfg.hair[2]] : null, null, { sway: 0.15 });
        break;
      }
      case 'spikes': {   // joroba con púas de hueso en la espalda (bruto)
        add('hump', 'torso', [0, hipY + th * 0.45, -td / 2], [tw - 2, Math.ceil(th * 0.6), 4], [-(tw - 2) / 2, 0, -4],
          (i, j, k, [w, h, d]) => {
            const r = Math.hypot((i - (w - 1) / 2) / (w / 2), (j - h * 0.55) / (h * 0.6));
            const spike = (i % 3 === 1) && j % 3 === 0 && k <= 1 && r < 0.8;
            if (spike) return [0.85, 0.8, 0.65];
            if (r < 1 && k >= 2) return rnd(i, j, k, 6) < 0.15 ? [0.45, 0.05, 0.05] : [cfg.skin[0] * 0.9, cfg.skin[1] * 0.9, cfg.skin[2] * 0.9];
            return null;
          });
        break;
      }
      case 'sac': {   // bolsa de ácido en la garganta (escupidor), brilla
        add('sac', 'torso', [0, hipY + th - 3, td / 2], [6, 6, 4], [-3, -3, 0],
          (i, j, k, [w, h, d]) => {
            const r = Math.hypot((i - 2.5) / 3, (j - 2.5) / 3, (k - 0.5) / 3.2);
            if (r > 1) return null;
            if (rnd(i, j, k, 7) < 0.25) return [0.25, 0.45, 0.1];                 // venas
            return [0.55, 1, 0.25, 0.75];
          });
        break;
      }
      case 'belly': {   // barriga hinchada con pústulas que brillan (explosivo)
        add('belly', 'torso', [0, hipY + 1, td / 2 - 1], [tw - 1, th - 3, 6], [-(tw - 1) / 2, 0, 0],
          (i, j, k, [w, h, d]) => {
            const r = Math.hypot((i - (w - 1) / 2) / (w / 2), (j - (h - 1) / 2) / (h / 2), k / d);
            if (r > 1) return null;
            if (rnd(i, j, k, 8) < 0.13) return [1, 0.75, 0.2, 1];                    // pústulas
            if (rnd(i >> 1, j >> 1, k, 9) < 0.2) return [0.75, 0.35, 0.15, 0.4];     // venas incandescentes
            return [cfg.skin[0] * 1.05, cfg.skin[1], cfg.skin[2] * 0.85];
          });
        break;
      }
      case 'helmet': {   // yelmo con visera (escudero) o casco oxidado (esqueleto)
        const W = hw + 2, D = hd + 2, Hh = cfg.bones ? 6 : Math.ceil(hh * 0.65);
        add('helmet', 'head', [0, headBase + hh - Hh + 1, headZ], [W, Hh, D], [-W / 2, 0, -D / 2],
          (i, j, k, [w, h, d]) => {
            const ei = edgeI(i, w), ek = k === 0 || k === d - 1;
            if (!(ei || ek || j === h - 1)) return null;
            if (ei && ek) return null;
            if (k === d - 1 && j === Math.floor(h * 0.35) && i > 1 && i < w - 2) return null;   // ranura de la visera
            if (cfg.bones && k === d - 1 && j < h - 2 && Math.abs(i - (w - 1) / 2) > 0.6) return null;   // casco con nasal
            if (cfg.bones && k === d - 1 && j === h - 2) return [0.3, 0.3, 0.33];                          // visera
            if (cfg.bones && (i === 0 || i === w - 1) && j < 2 && k > d / 2) return null;                  // hueco de la mandíbula
            if (corner(i, k, w, d) <= (j === h - 1 ? 2 : 0)) return null;
            if (j === 0 && rnd(i, j, k, 10) < 0.3) return null;
            return rnd(i >> 1, j, k >> 1, 11) < 0.25 ? [0.42, 0.2, 0.08] : [0.36, 0.36, 0.39];
          }, null, { armor: true });
        break;
      }
      case 'pauldron': {   // hombrera de chapa
        const aw = cfg.arm[0];
        add('pauldron', 'armR', [tw / 2 + aw / 2, hipY + th - aw / 2, 0], [aw + 2, 3, cfg.arm[2] + 2], [-(aw + 2) / 2, -1, -(cfg.arm[2] + 2) / 2],
          (i, j, k, [w, h, d]) => (j === h - 1 || edgeI(i, w) || k === 0 || k === d - 1) ? (rnd(i, j, k, 12) < 0.2 ? RUST : METAL) : null, null, { armor: true });
        break;
      }
      case 'buckler': {   // rodela redonda de madera con refuerzo de hierro (para las balas)
        const aw = cfg.arm[0], R = 5;
        add('buckler', 'armL', [-(tw / 2 + aw / 2) - aw / 2 - 1, hipY + th - cfg.arm[1] * 0.55, 0], [2, R * 2 + 1, R * 2 + 1], [-1, -R, -R],
          (i, j, k) => {
            const r = Math.hypot(j - R, k - R);
            if (r > R + 0.3) return null;
            if (i === 0 && r < 1.3) return [0.55, 0.55, 0.58];                        // umbo
            if (r > R - 0.9) return [0.32, 0.32, 0.35];                               // aro de hierro
            return rnd(j, k, i, 24) < 0.15 ? RUST : [0.4 + rnd(j, 0, 0, 25) * 0.08, 0.27, 0.14];
          }, null, { armor: true });
        break;
      }
      case 'ridge': {   // cresta de vértebras saliendo por la espalda (trepador)
        add('ridge', 'torso', [0, hipY, -td / 2], [1, th, 2], [-0.5, 0, -2],
          (i, j, k) => (j % 2 === 0 ? (k === 0 && j % 4 === 0 ? [0.9, 0.86, 0.75] : [0.8, 0.76, 0.66]) : (k === 1 ? [0.5, 0.06, 0.06] : null)));
        break;
      }
      case 'minerHelmet': {   // casco amarillo con lámpara encendida
        const W = hw + 2, D = hd + 2;
        add('helmet', 'head', [0, headBase + hh - 3, headZ], [W, 4, D + 1], [-W / 2, 0, -D / 2],
          (i, j, k, [w, h, d]) => {
            if (k === d - 1) return (j >= 1 && j <= 2 && Math.abs(i - (w - 1) / 2) < 1) ? [1, 0.95, 0.7, 1] : null;   // lámpara
            if (j === 0) return (edgeI(i, w) || k === 0 || k === d - 2) ? [0.72, 0.55, 0.1] : null;   // ala
            if (edgeI(i, w) && (k === 0 || k === d - 2)) return null;
            return (edgeI(i, w) || k === 0 || k === d - 2 || j === h - 1) ? (rnd(i, j, k, 13) < 0.15 ? [0.35, 0.3, 0.2] : [0.85, 0.66, 0.12]) : null;
          }, null, { armor: true });
        break;
      }
      case 'cap': {   // sombrero de seta gigante con motas luminosas (esporado)
        const W = hw + 6, D = hd + 6;
        add('cap', 'head', [0, headBase + hh - 2, headZ], [W, 5, D], [-W / 2, 0, -D / 2],
          (i, j, k, [w, h, d]) => {
            const r = Math.hypot((i - (w - 1) / 2) / (w / 2), (k - (d - 1) / 2) / (d / 2));
            const top = 1 - j / h;
            if (r > top + 0.05 || (j === 0 && r < 0.55)) return null;
            if (j === 0) return [0.85, 0.78, 0.65];                                // láminas
            if (rnd(i >> 1, j, k >> 1, 14) < 0.2) return [0.95, 1, 0.8, 0.85];    // motas brillantes
            return [0.7 + rnd(i, j, k, 15) * 0.08, 0.16, 0.1];
          });
        add('shrooms', 'torso', [0, hipY + th - 2, -td / 2], [tw, 4, 2], [-tw / 2, 0, -2],
          (i, j, k) => (i % 3 === 0 && rnd(i, 0, 0, 16) < 0.7 ? (j === 3 || (j === 2 && k === 0) ? [0.7, 1, 0.5, 0.8] : (j < 2 && k === 1 ? [0.85, 0.8, 0.7] : null)) : null));
        break;
      }
      case 'crest': {   // llamas en la cabeza y los hombros (ígneo)
        const flame = (i, j, k, [w, h, d]) => {
          const r = Math.abs(i - (w - 1) / 2) / (w / 2);
          if (j > (1 - r) * h * (0.6 + rnd(i, 0, k, 17) * 0.6)) return null;
          if (rnd(i, j, k, 18) < 0.3) return null;
          const t = j / h;
          return [1, 0.75 - t * 0.45, 0.25 - t * 0.2, 1];
        };
        add('crest', 'head', [0, headBase + hh - 1, headZ], [hw - 2, 5, hd - 3], [-(hw - 2) / 2, 0, -(hd - 3) / 2], (i, j, k, dims) => (j > 0 && rnd(i, j, k, 23) < 0.35 ? null : flame(i, j, k, dims)), null, { flicker: true });
        add('embers', 'torso', [0, hipY + th - 1, 0], [tw + 4, 4, td], [-(tw + 4) / 2, 0, -td / 2],
          (i, j, k, dims) => ((i <= 2 || i >= dims[0] - 3) ? flame(i % 3, j, k, [3, 4, dims[2]]) : null), null, { flicker: true });
        break;
      }
      case 'boneCrown': {   // corona de huesos afilados clavada en el cráneo (renacido)
        add('crown', 'head', [0, headBase + hh - 1, headZ], [hw + 2, 5, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2],
          (i, j, k, [w, h, d]) => {
            const ring = i === 0 || k === 0 || i === w - 1 || k === d - 1;
            if (!ring) return null;
            if (j === 0) return [0.7, 0.66, 0.55];
            const spike = (i + k) % 3 === 0 && j <= 2 + Math.floor(rnd(i, 0, k, 25) * 3);
            return spike ? [0.88, 0.84, 0.72] : null;
          });
        break;
      }
      case 'loincloth': {   // taparrabos raído (esqueleto)
        const col = pick([[0.35, 0.08, 0.08], [0.2, 0.22, 0.28], [0.3, 0.25, 0.15]]);
        add('cloth', 'torso', [0, hipY + 2, 0], [tw - 2, 7, td], [-(tw - 2) / 2, -7, -td / 2],
          (i, j, k, [w, h, d]) => {
            if (!(k === 0 || k === d - 1)) return j === h - 1 && (edgeI(i, w)) ? col : null;
            if (j < Math.floor(rnd(i, 0, k, 19) * 5)) return null;   // flecos
            if (rnd(i, j, k, 20) < 0.15) return null;                // agujeros
            return [col[0] * (0.8 + rnd(i, j, k, 21) * 0.3), col[1], col[2]];
          }, null, { sway: 0.12 });
        break;
      }
      case 'beard': {   // barba sucia (minero)
        add('beard', 'jaw', [0, headBase + 2, headZ + hd / 2], [hw - 2, 4, 2], [-(hw - 2) / 2, -4, -1],
          (i, j, k, [w, h]) => (j >= rnd(i, 0, 0, 22) * 2 ? [cfg.hair[0], cfg.hair[1], cfg.hair[2]] : null), null, { sway: 0.08 });
        break;
      }
    }
    return model;
  }

  // Escudo de chapa (para el zombi escudero): parte "blindada" que cuelga del torso
  // ================= CABALLERO NEGRO =================
  // Armadura de placas negras con remaches y ribetes dorados, yelmo cerrado con una
  // rendija que brilla, hombreras con púas, capa hecha jirones y un mandoble. Dentro no hay carne:
  // al abrirle un agujero se ve una sustancia violeta que brilla. Su único punto débil es el
  // corazón de cristal engastado en el pecho, dentro de una jaula dorada.
  // Caballero negro. kstyle elige el diseño (para comparar propuestas):
  //   actual · errante (yelmo de cubo con rendija en cruz, sin oro) · celada (casco redondeado con visera)
  //   hueco (yelmo abierto: dentro sólo oscuridad y dos ojos) · luto (capucha y manto de tela sobre la armadura)
  function knight(cfg) {
    const S = cfg.kstyle || VX.KNIGHT_STYLE || 'errante';   // diseño elegido: errante
    const model = humanoid({ ...cfg, style: 'armor', clean: true, tear: 0, jaw: false, blocky: true, barefoot: false });
    const v = cfg.v, [tw, th, td] = cfg.torso, [hw, hh, hd] = cfg.head, [aw, ah, ad] = cfg.arm, hipY = cfg.leg[1];
    const PAL = {
      actual: { ST: [0.07, 0.07, 0.085], ST2: [0.13, 0.13, 0.155], TRIM: [0.46, 0.34, 0.12], cage: [0.46, 0.34, 0.12] },
      errante: { ST: [0.1, 0.1, 0.11], ST2: [0.15, 0.15, 0.165], TRIM: [0.2, 0.2, 0.22], cage: [0.22, 0.22, 0.24] },
      celada: { ST: [0.085, 0.085, 0.1], ST2: [0.14, 0.14, 0.16], TRIM: [0.36, 0.28, 0.13], cage: [0.2, 0.2, 0.23] },
      hueco: { ST: [0.075, 0.07, 0.08], ST2: [0.12, 0.115, 0.13], TRIM: [0.16, 0.15, 0.18], cage: [0.18, 0.17, 0.2] },
      luto: { ST: [0.09, 0.09, 0.1], ST2: [0.13, 0.13, 0.145], TRIM: [0.18, 0.18, 0.2], cage: [0.2, 0.2, 0.22] },
    }[S] || {};
    const { ST, ST2, TRIM } = PAL;
    const ICH = [0.32, 0.06, 0.52, 0.65], EYE = [0.85, 0.35, 1, 1], DARK = [0.015, 0.012, 0.02];
    const hh2 = (a, b, c, s) => M.hash3(a + s * 13, b + s * 7, c + s * 3);
    for (const p of model.parts) for (const x of p.vox) {
      if (x.ghost) continue;
      let c;
      if (!x.exposed) c = ICH;
      else {
        const [w, h] = p.dims;
        const band = x.j % 5 === 0, edge = x.i === 0 || x.i === w - 1;
        c = band ? ST2 : ST;
        if (S === 'actual' && band && edge) c = TRIM;
        if (S === 'actual' && p.name === 'torso' && x.j === h - 1) c = TRIM;
        if (p.name.startsWith('arm') && x.j <= 1) c = [0.1, 0.1, 0.12];                  // guanteletes
        if (p.name.startsWith('leg') && x.j <= 1) c = [0.05, 0.05, 0.06];
        if (S === 'celada' && p.name === 'torso' && x.j >= h - 2) c = (x.i + x.k) % 2 ? [0.2, 0.2, 0.22] : [0.12, 0.12, 0.13];   // cota de malla en el cuello
        const n = (hh2(x.i, x.j, x.k, 1) - 0.5) * 0.025;
        c = [c[0] + n, c[1] + n, c[2] + n, c[3] || 0];
      }
      x.r = c[0]; x.g = c[1]; x.b = c[2]; x.e = c[3] || 0;
    }
    const add = (name, parent, pivot, dims, min, fn, shape, extra = {}) => {
      const pt = makePart(name, pivot, dims, min, v, fn, null, shape);
      pt.parent = parent; Object.assign(pt, extra);
      if (pt.alive > 0) model.parts.push(pt);
      return pt;
    };
    const headBase = hipY + th;
    const HW = hw + 2, HH = hh + 2, HD = hd + 2;
    // ---- cabeza ----
    if (S === 'actual') {
      add('helm', 'head', [0, headBase, 0], [HW, HH, HD], [-HW / 2, -1, -HD / 2], (i, j, k, [w, h, d], surf) => {
        if (!surf) return ICH;
        const front = k === d - 1, ci = (w - 1) / 2;
        if (front && j === Math.round(h * 0.55) && Math.abs(i - ci) > 0.6 && i > 0 && i < w - 1) return EYE;   // rendija
        if (front && j < Math.round(h * 0.45) && j > 0 && Math.abs(i - ci) < 1.6 && j % 2 === 0) return [0.02, 0.02, 0.02];
        if (j === h - 1 && Math.abs(i - ci) < 0.6) return TRIM;
        if (front && Math.abs(i - ci) < 0.6) return TRIM;
        if (j === 0) return TRIM;
        return (j % 4 === 0) ? ST2 : ST;
      }, (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 2 ? 2 : 0)));
    } else if (S === 'errante') {
      // yelmo de cubo, plano por arriba, con una rendija en cruz y dos puntos de luz apagada
      add('helm', 'head', [0, headBase, 0], [HW, HH, HD], [-HW / 2, -1, -HD / 2], (i, j, k, [w, h, d], surf) => {
        if (!surf) return ICH;
        const front = k === d - 1, ci = (w - 1) / 2, ey = Math.round(h * 0.6);
        if (front && j === ey && Math.abs(i - ci) <= 2.6 && i > 0 && i < w - 1) return Math.abs(Math.abs(i - ci) - 1.5) < 0.6 ? [0.6, 0.3, 0.8, 0.8] : DARK;
        if (front && Math.abs(i - ci) < 0.6 && j < ey && j > ey - 4) return DARK;                                        // rendija vertical
        if (front && j < ey - 1 && j > 0 && Math.abs(i - ci) > 1.5 && Math.abs(i - ci) < 3 && (j & 1)) return DARK;      // agujeros
        if (j === 0 || j === h - 1) return ST2;
        return ST;
      }, (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= 0));
    } else if (S === 'celada') {
      // celada redondeada que cae por la nuca, visera con una rendija y dos ojos
      add('helm', 'head', [0, headBase, 0], [HW, HH, HD + 2], [-HW / 2, -1, -HD / 2 - 2], (i, j, k, [w, h, d], surf) => {
        if (!surf) return ICH;
        const front = k === d - 1, ci = (w - 1) / 2, ey = Math.round(h * 0.55);
        if (front && j === ey && i > 0 && i < w - 1) return Math.abs(Math.abs(i - ci) - 1.5) < 0.6 ? EYE : DARK;
        if (front && j === ey + 1 && i > 0 && i < w - 1) return TRIM;                                                    // borde de la visera
        if (j === 0 && k < 3) return TRIM;
        return (k + j) % 6 === 0 ? ST2 : ST;
      }, (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 3 ? 3 - (h - 1 - j) + 1 : 0)) && !(k < 3 && j < 2 && false));
    } else if (S === 'hueco') {
      // yelmo abierto por delante: dentro no hay cara, sólo oscuridad y dos ojos
      add('helm', 'head', [0, headBase, 0], [HW, HH, HD], [-HW / 2, -1, -HD / 2], (i, j, k, [w, h, d], surf) => {
        if (!surf) return DARK;
        if (j === h - 1 || j === 0) return ST2;
        return ST;
      }, (i, j, k, [w, h, d]) => {
        const ci = (w - 1) / 2;
        if (corner(i, k, w, d) <= (j >= h - 2 ? 1 : 0)) return false;
        return !(k === d - 1 && j >= 1 && j <= h - 3 && Math.abs(i - ci) < 2.6);   // la abertura de la cara
      });
      add('eyes', 'head', [0, headBase + Math.round(HH * 0.55), HD / 2 - 3], [HW - 2, 1, 1], [-(HW - 2) / 2, 0, 0], (i, j, k, [w]) => (Math.abs(i - (w - 1) / 2) > 0.6 && Math.abs(i - (w - 1) / 2) < 2 ? EYE : DARK));
    } else {
      // capucha de tela sobre el yelmo: la cara queda en sombra con dos ojos
      const CW = HW + 2, CH2 = HH + 2, CD = HD + 2;
      add('helm', 'head', [0, headBase, 0], [CW, CH2, CD], [-CW / 2, -1, -CD / 2], (i, j, k, [w, h, d], surf) => {
        if (!surf) return DARK;
        const ci = (w - 1) / 2, n = hh2(i, j, k, 9) < 0.2;
        if (k === d - 1 && Math.abs(i - ci) < 2.6 && j >= 2 && j <= h - 3) return DARK;
        return n ? [0.06, 0.06, 0.07] : [0.1, 0.095, 0.11];
      }, (i, j, k, [w, h, d]) => {
        const ci = (w - 1) / 2;
        if (j === h - 1 && Math.abs(i - ci) > 1.6) return false;
        if (corner(i, k, w, d) <= (j >= h - 3 ? 2 : 0)) return false;
        return !(k === d - 1 && Math.abs(i - ci) < 2.6 && j >= 2 && j <= h - 3 && false);
      });
      add('eyes', 'head', [0, headBase + Math.round(HH * 0.55), HD / 2 + 1], [HW - 2, 1, 1], [-(HW - 2) / 2, 0, 0], (i, j, k, [w]) => (Math.abs(i - (w - 1) / 2) > 0.6 && Math.abs(i - (w - 1) / 2) < 2 ? [0.7, 0.35, 0.9, 0.9] : null));
    }
    // ---- hombros ----
    for (const sd of [-1, 1]) {
      const nm = sd < 0 ? 'armL' : 'armR', W2 = aw + 4, D2 = ad + 4, pn = sd < 0 ? 'pauldronL' : 'pauldronR';
      const piv = [sd * (tw / 2 + aw / 2), hipY + th - aw / 2, 0];
      if (S === 'actual') {
        add(pn, nm, piv, [W2, 6, D2], [-W2 / 2, -2, -D2 / 2], (i, j, k, [w, h, d]) => {
          if (j >= 4) return (i === (sd < 0 ? 1 : w - 2) && (k === 1 || k === d - 2 || k === Math.floor(d / 2))) ? (j === 5 ? [0.4, 0.37, 0.32] : [0.16, 0.14, 0.12]) : null;
          if (j === 0) return TRIM;
          return j % 2 ? ST2 : ST;
        }, (i, j, k, [w, h, d]) => j >= 4 || !(corner(i, k, w, d) <= 1));
      } else if (S === 'errante' || (S === 'hueco' && sd < 0)) {
        add(pn, nm, piv, [W2, 4, D2], [-W2 / 2, -2, -D2 / 2], (i, j) => (j === 0 ? ST2 : j % 2 ? ST2 : ST), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j === h - 1 ? 2 : 1)));
      } else if (S === 'celada') {
        add(pn, nm, piv, [W2 - 1, 5, D2 - 1], [-(W2 - 1) / 2, -3, -(D2 - 1) / 2], (i, j) => (j === 0 || j === 2 ? TRIM : ST), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 1 ? 2 : 1)) && !(j < 2 && (sd < 0 ? i > w - 3 : i < 2)));
      }
    }
    // ---- tela: capa, sobreveste o manto ----
    const cyH = hipY + Math.round(th * 0.6);
    const heartGap = (i, j, w, y0) => { const y = y0 + j; return y >= cyH - 3 && y <= cyH + 2 && Math.abs(i - (w - 1) / 2) < 3.6; };
    const CHt = th + Math.round(cfg.leg[1] * 0.75);
    if (S === 'actual') {
      add('cape', 'torso', [0, hipY + th - 1, -td / 2], [tw + 2, CHt, 1], [-(tw + 2) / 2, -CHt, -1], (i, j, k, [w, h]) => {
        const tear = Math.floor(hh2(i, 0, 0, 5) * 7);
        if (j < tear) return null;
        if (j === h - 1) return TRIM;
        return hh2(i >> 1, j >> 1, 0, 6) < 0.15 ? [0.1, 0.02, 0.03] : [0.2, 0.035, 0.045];
      }, null, { sway: 0.12 });
    } else if (S === 'errante') {
      // sobreveste gris raída por delante, sin capa
      const H2 = th - 2 + Math.round(cfg.leg[1] * 0.5);
      add('cape', 'torso', [0, hipY + th - 3, td / 2], [tw - 2, H2, 1], [-(tw - 2) / 2, -H2, 0], (i, j, k, [w, h]) => {
        if (j < Math.floor(hh2(i, 0, 0, 5) * 4)) return null;
        if (heartGap(i, j, w, hipY + th - 3 - H2)) return null;   // hueco para que se vea el corazón
        return hh2(i >> 1, j >> 1, 1, 6) < 0.2 ? [0.12, 0.12, 0.13] : [0.19, 0.185, 0.2];
      }, null, { sway: 0.08 });
    } else if (S === 'hueco') {
      const H2 = th - 3 + Math.round(cfg.leg[1] * 0.45);
      add('cape', 'torso', [0, hipY + th - 3, td / 2], [tw - 2, H2, 1], [-(tw - 2) / 2, -H2, 0], (i, j, k, [w, h]) => {
        if (j < Math.floor(hh2(i, 0, 0, 5) * 5)) return null;
        if (heartGap(i, j, w, hipY + th - 3 - H2)) return null;
        const ci = (w - 1) / 2;
        if (Math.abs(i - ci) < 1 && j > h - 3 && j < h) return [0.3, 0.22, 0.32];   // emblema desvaído
        return hh2(i >> 1, j >> 1, 2, 6) < 0.25 ? [0.11, 0.08, 0.13] : [0.17, 0.12, 0.2];
      }, null, { sway: 0.08 });
    } else if (S === 'luto') {
      // manto sobre los hombros y capa larga hasta casi el suelo
      add('mantle', 'torso', [0, hipY + th + 1, 0], [tw + 6, 5, td + 4], [-(tw + 6) / 2, -5, -(td + 4) / 2], (i, j, k) => (hh2(i, j, k, 8) < 0.2 ? [0.06, 0.06, 0.07] : [0.1, 0.095, 0.11]),
        (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= 1) && !(i > 2 && i < w - 3 && k > 1 && k < d - 2 && j < h - 1));
      const CL = th + cfg.leg[1] - 2;
      add('cape', 'torso', [0, hipY + th - 1, -td / 2 - 1], [tw + 4, CL, 1], [-(tw + 4) / 2, -CL, -1], (i, j) => {
        if (j < Math.floor(hh2(i, 0, 0, 5) * 3)) return null;
        return hh2(i >> 1, j >> 1, 0, 6) < 0.18 ? [0.05, 0.05, 0.055] : [0.085, 0.08, 0.095];
      }, null, { sway: 0.1 });
    }
    // ---- corazón de cristal (punto débil) ----
    const cy = hipY + Math.round(th * 0.6);
    add('core', 'torso', [0, cy, td / 2], [4, 4, 2], [-2, -2, 0], (i, j) => {
      const ctr = (i === 1 || i === 2) && (j === 1 || j === 2);
      return ctr ? [1, 0.55, 1, 1] : [0.75, 0.2, 1, 1];
    }, (i, j) => !((i === 0 || i === 3) && (j === 0 || j === 3)), { weak: true });
    add('cage', 'torso', [0, cy, td / 2 + (S === 'errante' || S === 'hueco' ? 3 : 2)], [6, 6, 1], [-3, -3, 0], (i, j, k, [w, h]) => {
      const fr = i === 0 || j === 0 || i === w - 1 || j === h - 1;
      return fr || ((i === 2 || i === 3) && (j === 0 || j === h - 1)) ? PAL.cage : null;
    });
    return addTool(model, cfg, { tool: 'greatsword', name: 'tool', arm: 'armR' });
  }

  // ================= RESTOS DEL RENACIDO =================
  // Un montón de carne viva, tendones y huesos que late en el suelo. Usa los mismos nombres de
  // pieza que un humanoide (para que todo funcione igual) pero tirados por el suelo.
  function pile(cfg) {
    const v = cfg.v, sd = (Math.random() * 999) | 0;
    const H = (i, j, k, s = 0) => M.hash3(i + sd + s * 31, j + s * 7, k + s * 17);
    const FL = (i, j, k) => {
      const h = H(i, j, k, 1);
      if (cfg.flesh === 'hydra') return h < 0.14 ? [0.75, 1, 0.3, 0.6] : h < 0.5 ? [0.4, 0.5, 0.28] : h < 0.8 ? [0.52, 0.62, 0.38] : [0.6, 0.55, 0.4];   // brote verde que late
      if (h < 0.08) return [0.86, 0.8, 0.66];                     // hueso
      if (h < 0.16) return [0.9, 0.35, 0.2, 0.55];                // brasa de vida que late
      if (h < 0.5) return [0.48, 0.07, 0.08];
      return h < 0.8 ? [0.6, 0.12, 0.12] : [0.62, 0.3, 0.32];
    };
    const parts = [];
    parts.push(makePart('torso', [0, 0, 0], [14, 6, 12], [-7, 0, -6], v, (i, j, k) => FL(i, j, k), null,
      (i, j, k, [w, h, d]) => Math.hypot((i - (w - 1) / 2) / (w / 2), j / h, (k - (d - 1) / 2) / (d / 2)) <= 1 - H(i, 0, k, 2) * 0.15));
    const bone = (i, j, k) => (H(i, j, k, 3) < 0.15 ? [0.7, 0.66, 0.55] : [0.86, 0.82, 0.7]);
    parts.push(makePart('legL', [-6, 0, 3], [10, 2, 2], [-5, 0, -1], v, bone, null));
    parts.push(makePart('legR', [5, 0, -4], [2, 2, 9], [-1, 0, -4.5], v, bone, null));
    parts.push(makePart('armL', [-4, 1, -6], [8, 2, 2], [-4, 0, -1], v, bone, null));
    parts.push(makePart('armR', [6, 1, 5], [2, 2, 7], [-1, 0, -3.5], v, bone, null));
    parts.push(makePart('head', [2, 4, 1], [6, 6, 6], [-3, 0, -3], v, (i, j, k, [w, h, d], surf) => {
      if (!surf) return null;
      if (k === d - 1 && j === 3 && (i === 1 || i === 4)) return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];   // las cuencas aún brillan
      if (k === d - 1 && j === 1) return i % 2 ? [0.86, 0.82, 0.7] : [0.05, 0.03, 0.02];
      return [0.86, 0.82, 0.7];
    }, null, (i, j, k, [w, h, d]) => !((i === 0 || i === w - 1) && (k === 0 || k === d - 1)) && !(j === h - 1 && (i === 0 || i === w - 1 || k === 0 || k === d - 1))));
    for (const p of parts) if (p.name !== 'torso') p.parent = 'torso';
    return { parts, height: 0.6, width: 0.8, v, depth: 0.6 };
  }

  function addShield(model, cfg) {
    const v = cfg.v;
    const [tw, th, td] = cfg.torso;
    const hipY = cfg.leg[1];
    const W = tw + 4, H = th + 6, D = 2;
    const fn = (i, j, k) => {
      const rim = i === 0 || i === W - 1 || j === 0 || j === H - 1;
      if (rim) return jit([0.25, 0.25, 0.28], 0.03, i, j, k);
      if (Math.abs(i - (W - 1) / 2) < 0.6 || Math.abs(j - (H - 1) / 2) < 0.6) return k === D - 1 ? jit([0.3, 0.3, 0.33], 0.02, i, j, k) : jit(METAL, 0.04, i, j, k);   // refuerzo en cruz
      if ((i + j) % 5 === 0 && k === D - 1) return [0.55, 0.55, 0.6];      // remaches
      if (M.hash3(i >> 1, j >> 1, 3) < 0.15) return jit([0.45, 0.22, 0.12], 0.05, i, j, k); // óxido
      if (M.hash3(i, j, 9) < 0.05 && k === D - 1) return [0.45, 0.05, 0.05];   // sangre
      return jit([0.38, 0.38, 0.42], 0.04, i, j, k);
    };
    const p = makePart('shield', [0, hipY - 3, td / 2 + 3], [W, H, D], [-W / 2, 0, -D / 2], v, fn, null,
      (i, j, k, [w, h]) => !((i === 0 || i === w - 1) && (j === 0 || j === h - 1)));
    p.parent = 'torso'; p.armor = true;
    model.parts.push(p);
    return model;
  }

  // ================= CUADRÚPEDO =================
  // Patas traseras = legL/legR, delanteras = armL/armR. Hocico afilado, orejas, cola.
  function quadruped(cfg) {
    const v = cfg.v;
    const [lw, lh, ld] = cfg.leg, [tw, th, td] = cfg.torso, [hw, hh, hd] = cfg.head;
    const sd = (Math.random() * 9973) | 0;
    const H = (i, j, k, s = 0) => M.hash3(i + sd + s * 31, j + (sd >> 3) + s * 7, k + s * 17);
    const J = (c, amt, i, j, k) => { const h = (H(i, j, k, 9) - 0.5) * amt; return [c[0] + h, c[1] + h, c[2] + h, c[3] || 0]; };
    const inner = (i, j, k) => (H(i, j, k, 1) > 0.5 ? FLESH : FLESH2);
    const furFn = (i, j, k, dims, surf) => {
      if (!surf) return inner(i, j, k);
      if (cfg.spots && H((i >> 1) + 9, (j >> 1) + 3, (k >> 1) + 5, 2) < 0.14) return [cfg.spots[0], cfg.spots[1], cfg.spots[2], 0.9];
      if (cfg.wood) {   // mímico: tablones con flejes de metal
        if (k % 5 === 0 || j === 0) return J([0.55, 0.42, 0.15], 0.05, i, j, k);
        return J(i % 3 === 0 ? mul(cfg.fur, 0.75) : cfg.fur, 0.05, i, j, k);
      }
      if (!cfg.clean && H((i >> 1) + 4, j >> 1, (k >> 1), 3) < 0.16) return J([0.5, 0.06, 0.06], 0.05, i, j, k);
      if (H(i, j >> 1, k >> 1, 4) < 0.15) return J(mul(cfg.fur, 0.7), 0.05, i, j, k);   // pelaje a mechones
      return J(cfg.fur, 0.08, i, j, k);
    };
    const torsoFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      // costillas al aire en un costado
      if (cfg.ribs && surf && edgeI(i, w) && k > d * 0.4 && k < d * 0.75 && j > 0 && j < h - 1 && i === (sd % 2 ? 0 : w - 1)) return k % 2 ? J(BONE, 0.05, i, j, k) : null;
      if (cfg.ribs && surf && j === h - 1 && Math.abs(i - (w - 1) / 2) < 0.6 && k % 2 === 0) return J(BONE, 0.05, i, j, k);   // espinazo
      return furFn(i, j, k, dims, surf);
    };
    const qShape = (i, j, k, [w, h, d]) => !(w >= 4 && edgeI(i, w) && (k === 0 || k === d - 1)) && !(j === h - 1 && edgeI(i, w) && w >= 5);
    const headShape = (i, j, k, [w, h, d]) => {
      // hocico: la parte delantera es más estrecha y baja
      if (cfg.snout && k >= d - cfg.snout) { if (edgeI(i, w) || (w >= 6 && (i === 1 || i === w - 2)) || j >= h - 2) return false; }
      if (edgeI(i, w) && (k === 0) && j === h - 1) return false;
      return true;
    };
    const headFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      if (!surf) return J(BONE, 0.05, i, j, k);
      const sn = cfg.snout || 0;
      const eyeK = d - sn - 1;
      if (k === eyeK && j === h - 3 && (i === 0 || i === w - 1)) return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];   // ojos a los lados del hocico
      if (!sn && k === d - 1 && j === h - 3 && (i === 1 || i === w - 2)) return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];
      if (k === d - 1 && j === Math.min(h - 3, 2) && sn && Math.abs(i - (w - 1) / 2) < 1) return [0.08, 0.05, 0.05];   // nariz
      if (k >= d - 3 && j <= 1) return (i + k) % 2 ? [0.88, 0.84, 0.7] : [0.2, 0.03, 0.03];   // dientes
      return furFn(i, j, k, dims, surf);
    };
    const legY = lh;
    const parts = [];
    const zf = td / 2 - ld / 2 - 1, zb = -td / 2 + ld / 2 + 1;
    const pawFn = (i, j, k, dims, surf) => (j === 0 && cfg.claws ? [0.12, 0.1, 0.08] : furFn(i, j, k, dims, surf));
    parts.push(makePart('legL', [-tw / 2 + lw / 2, legY, zb], cfg.leg, [-lw / 2, -lh, -ld / 2], v, pawFn, 'top', qShape));
    parts.push(makePart('legR', [tw / 2 - lw / 2, legY, zb], cfg.leg, [-lw / 2, -lh, -ld / 2], v, pawFn, 'top', qShape));
    parts.push(makePart('torso', [0, legY, 0], cfg.torso, [-tw / 2, 0, -td / 2], v, torsoFn, null, qShape));
    parts.push(makePart('armL', [-tw / 2 + lw / 2, legY + 1, zf], cfg.leg, [-lw / 2, -lh - 1, -ld / 2], v, pawFn, 'top', qShape));
    parts.push(makePart('armR', [tw / 2 - lw / 2, legY + 1, zf], cfg.leg, [-lw / 2, -lh - 1, -ld / 2], v, pawFn, 'top', qShape));
    parts.push(makePart('head', [0, legY + th - 2, td / 2], cfg.head, [-hw / 2, 0, -1], v, headFn, 'bottom', headShape));
    for (const p of parts) if (p.name.startsWith('arm') || p.name === 'head') p.parent = 'torso';
    const add = (name, parent, pivot, dims, min, fn, extra = {}) => {
      const p = makePart(name, pivot, dims, min, v, fn, null);
      p.parent = parent; Object.assign(p, extra);
      if (p.alive > 0) parts.push(p);
    };
    if (cfg.ears) {   // orejas (puntiagudas o redondas)
      for (const s of [-1, 1]) add('ear' + (s < 0 ? 'L' : 'R'), 'head', [s * (hw / 2 - 1), legY + th - 2 + hh, td / 2 + 1], [2, cfg.ears, 2], [-1, 0, -1],
        (i, j, k) => (cfg.roundEars ? (j === cfg.ears - 1 && i === (s < 0 ? 0 : 1) ? null : [0.75, 0.5, 0.5]) : (j >= cfg.ears - 1 && (i + k) % 2 ? null : J(cfg.fur, 0.06, i, j, k))));
    }
    if (cfg.tail) {   // cola: la de rata larga y rosada; la del perro, pelada
      const L = cfg.tail;
      add('tail', 'torso', [0, legY + th - 2, -td / 2], [1, 2, L], [-0.5, -1, -L],
        (i, j, k) => (cfg.ratTail ? (j === 1 && k > L * 0.3 ? null : [0.78, 0.55, 0.52]) : (j === 1 || k > L * 0.4 ? J(cfg.fur, 0.06, i, j, k) : null)), { sway: 0.35 });
    }
    if (cfg.lid) {   // mímico: hilera de dientes y una lengua enorme
      add('teeth', 'head', [0, legY + th - 2, td / 2], [hw - 2, 2, 1], [-(hw - 2) / 2, -1, hd - 2],
        (i, j) => (i % 2 === 0 ? (j === 0 ? [0.9, 0.86, 0.7] : [0.75, 0.72, 0.6]) : null));
      add('tongue', 'torso', [0, legY + th - 1, td / 2], [3, 1, 8], [-1.5, 0, 0], (i, j, k) => (k === 7 && i === 1 ? null : [0.75, 0.2, 0.3]), { sway: 0.3 });
    }
    return { parts, height: (legY + th + 2) * v, width: tw * v, v, depth: th * v, quad: true };
  }

  // Herramienta en la mano derecha (pico, cuchilla o espada oxidada)
  function addTool(model, cfg, extra) {
    const v = cfg.v, [aw, ah] = cfg.arm;
    let dims, fn, min;
    const tool = extra ? extra.tool : cfg.tool;
    if (tool === 'pick') {
      const s = cfg.toolScale || 1;
      const L = Math.round(26 * s), Wd = Math.round(16 * s);
      dims = [3, L, Wd]; min = [-1.5, -ah - Math.round(18 * s), -2];
      fn = (i, j, k) => (j <= Math.max(2, Math.round(3 * s)) ? (k === 0 || k === Wd - 1 ? [0.5, 0.52, 0.55] : [0.32, 0.33, 0.36]) : (k >= Math.floor(Wd / 2) - 1 && k <= Math.floor(Wd / 2) && i === 1 ? [0.35, 0.22, 0.12] : null));
    } else if (tool === 'bow') {
      // arco de madera curvo con su cuerda
      dims = [1, 28, 7]; min = [-0.5, -ah - 6, -1];
      fn = (i, j, k) => {
        const arc = Math.round(Math.sin((j / 27) * Math.PI) * 5);
        if (k === arc + 1 || (k === arc && j % 3 === 0)) return M.hash3(j, k, 3) < 0.2 ? [0.3, 0.18, 0.08] : [0.45, 0.3, 0.14];
        if (k === 0) return [0.8, 0.78, 0.7];
        return null;
      };
    } else if (tool === 'staff') {
      // bastón retorcido con un cráneo y una llama violeta
      dims = [3, 40, 3]; min = [-1.5, -ah - 12, -1.5];
      fn = (i, j, k) => {
        if (j >= 35) return (i === 1 || k === 1) && M.hash3(i, j, k) < 0.8 ? [0.8, 0.4, 1, 1] : null;   // llama
        if (j >= 31) return [0.85, 0.82, 0.7];                                                         // cráneo
        return i === 1 && k === 1 ? (j % 5 === 0 ? [0.2, 0.12, 0.08] : [0.32, 0.2, 0.12]) : null;
      };
    } else if (tool === 'gun') {
      // arma del compañero (cooperativo): cuerpo negro con cañón y empuñadura
      dims = [2, 16, 4]; min = [-1, -ah - 12, -1];
      fn = (i, j, k) => {
        if (j >= 12) return k <= 1 ? [0.12, 0.1, 0.09] : null;      // empuñadura en la mano
        if (j < 2) return k >= 2 ? [0.08, 0.08, 0.09] : null;        // boca del cañón
        return k >= 1 ? (j % 5 === 0 ? [0.3, 0.32, 0.36] : [0.16, 0.16, 0.18]) : null;
      };
    } else if (tool === 'greatsword') {
      // mandoble negro con filo violeta que brilla, guarda dorada en cruz y pomo
      dims = [1, 40, 6]; min = [-0.5, -ah - 28, -1.5];
      fn = (i, j, k) => {
        if (j >= 35) return k >= 2 && k <= 3 ? (j === 39 ? [0.45, 0.33, 0.12] : [0.1, 0.07, 0.06]) : null;   // empuñadura y pomo
        if (j === 34) return [0.45, 0.33, 0.12];                                                             // guarda
        if (j >= 32) return k >= 1 && k <= 4 ? [0.06, 0.06, 0.07] : null;
        if (j < 2 && (k === 0 || k === 5)) return null;                                                     // punta
        if (k === 0 || k === 5) return [0.6, 0.25, 0.9, 0.85];                                              // filos
        return M.hash3(j, k, 9) < 0.08 ? [0.5, 0.2, 0.8, 0.6] : [0.07, 0.07, 0.085];                        // runas
      };
    } else if (tool === 'sword') {
      // espada corta oxidada y mellada
      dims = [1, 22, 4]; min = [-0.5, -ah - 14, -1];
      fn = (i, j, k) => {
        if (j >= 18) return k === 1 ? [0.25, 0.15, 0.08] : null;                        // empuñadura
        if (j === 17) return [0.4, 0.36, 0.3];                                         // guarda
        if (k === 0 || k === 3) return null;
        if (j < 15 && k === 2 && M.hash3(j, 3, 1) < 0.25) return null;                 // mellas
        if (j === 0 && k === 2) return null;                                           // punta
        return M.hash3(j, k, 7) < 0.35 ? RUST : [0.55, 0.55, 0.58];
      };
    } else {
      dims = [2, 22, 12]; min = [-1, -ah - 16, -1];
      fn = (i, j, k) => (j >= 16 ? (k <= 1 ? [0.3, 0.18, 0.1] : null) : (k <= 10 ? (k === 10 || j === 0 ? [0.8, 0.82, 0.86] : (M.hash3(j, k, 5) < 0.15 ? [0.45, 0.05, 0.05] : [0.55, 0.56, 0.6])) : null));
    }
    const arm = extra ? extra.arm : 'armR';
    const p = makePart(extra ? extra.name : 'tool', [0, 0, 0], dims, min, v, fn, null);
    p.parent = arm; p.armor = true; p.noBreak = true;
    p.pivot = model.parts.find((x) => x.name === arm).pivot.slice();
    model.parts.push(p);
    return model;
  }

  // Cuervo: cuerpo pequeño y negro, alas (armL/armR) que baten, pico amarillo y ojos rojos
  function crow(cfg) {
    const v = cfg.v, sd = (Math.random() * 9973) | 0;
    const H = (i, j, k, s = 0) => M.hash3(i + sd + s * 31, j + s * 7, k + s * 17);
    const feather = (i, j, k) => { const h = (H(i, j, k, 2) - 0.5) * 0.05; const c = H(i >> 1, j, k >> 1, 3) < 0.25 ? [0.13, 0.12, 0.17] : [0.06, 0.06, 0.08]; return [c[0] + h, c[1] + h, c[2] + h + 0.01]; };
    const parts = [];
    parts.push(makePart('torso', [0, 0, 0], [5, 4, 9], [-2.5, -2, -4.5], v, (i, j, k, d, surf) => (surf ? feather(i, j, k) : FLESH), null,
      (i, j, k, [w, h, d]) => !((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) && !(k === d - 1 && (i === 0 || i === w - 1))));
    parts.push(makePart('head', [0, 1, 4], [4, 4, 4], [-2, -1, 0], v, (i, j, k, d) => {
      if (k === 3 && j === 1 && i === 2) return [0.95, 0.75, 0.15];                       // pico
      if (k === 2 && j === 2 && (i === 0 || i === 3)) return [1, 0.15, 0.1, 1];           // ojos
      return feather(i, j, k);
    }, null, (i, j, k) => !(k === 3 && !(j === 1 && i === 2))));
    parts.push(makePart('beak', [0, 1, 7], [1, 1, 2], [-0.5, -1, 0], v, () => [0.9, 0.7, 0.12]));
    parts.push(makePart('armL', [-2.5, 1, 0], [8, 1, 6], [-8, 0, -3], v, (i, j, k) => (k <= 1 && i % 2 === 0 ? [0.03, 0.03, 0.05] : feather(i, j, k)), null, (i, j, k) => !(i < 3 && k > 3 - Math.floor((3 - i) / 1.5))));
    parts.push(makePart('armR', [2.5, 1, 0], [8, 1, 6], [0, 0, -3], v, (i, j, k) => (k <= 1 && i % 2 === 1 ? [0.03, 0.03, 0.05] : feather(i, j, k)), null, (i, j, k) => !(i > 4 && k > 3 - Math.floor((i - 4) / 1.5))));
    parts.push(makePart('tail', [0, 0.5, -4.5], [5, 1, 5], [-2.5, 0, -5], v, (i, j, k) => feather(i, j, k), null, (i, j, k) => !(k === 0 && (i === 0 || i === 4))));
    parts.push(makePart('legL', [-1, -2, 0], [1, 2, 1], [-0.5, -2, -0.5], v, () => [0.25, 0.2, 0.12]));
    parts.push(makePart('legR', [1, -2, 0], [1, 2, 1], [-0.5, -2, -0.5], v, () => [0.25, 0.2, 0.12]));
    for (const p of parts) if (p.name !== 'torso') p.parent = p.name === 'beak' ? 'head' : 'torso';
    return { parts, height: 6 * v, width: 5 * v, v, depth: 9 * v, quad: true };
  }

  const Models = { humanoid, quadruped, addShield, addTool, crow };

  // Paletas para que cada zombi lleve ropa distinta
  const SHIRTS = [[0.28, 0.32, 0.44], [0.45, 0.4, 0.3], [0.55, 0.52, 0.45], [0.35, 0.18, 0.15], [0.22, 0.3, 0.22], [0.5, 0.45, 0.2]];
  const PANTS = [[0.22, 0.19, 0.16], [0.18, 0.2, 0.28], [0.3, 0.26, 0.2], [0.14, 0.14, 0.15]];
  const HAIR = [[0.12, 0.1, 0.08, 0.6], [0.35, 0.25, 0.12, 0.55], [0.5, 0.48, 0.45, 0.5], [0.2, 0.06, 0.04, 0.6]];

  // Las configuraciones son funciones: cada llamada saca una variante distinta
  const Z = {
    walker: () => ({
      v: 0.05, blocky: true, leg: [4, 17, 4], torso: [9, 13, 5], arm: [4, 15, 4], head: [8, 8, 8],
      skin: pick([[0.38, 0.56, 0.32], [0.42, 0.58, 0.34], [0.36, 0.5, 0.33]]), shirt: pick([[0.12, 0.55, 0.6], [0.15, 0.5, 0.58], [0.1, 0.45, 0.55], [0.45, 0.4, 0.3]]),
      pants: pick([[0.27, 0.25, 0.55], [0.24, 0.22, 0.5], [0.3, 0.26, 0.45]]), shoes: [0.22, 0.2, 0.22],
      eye: [1.0, 0.85, 0.25], hair: Math.random() < 0.4 ? pick(HAIR) : null, ragged: 0.1, tear: 0.18, jaw: true, wound: Math.random() < 0.5,
      cheekTear: Math.random() < 0.35, oneEyeChance: 0.2, extras: Math.random() < 0.4 ? ['guts'] : [],
    }),
    runner: () => ({
      v: 0.05, blocky: true, leg: [3, 18, 3], torso: [8, 13, 4], arm: [3, 16, 3], head: [7, 7, 7],
      skin: [0.62, 0.66, 0.55], shirt: [0.62, 0.66, 0.55], pants: [0.2, 0.22, 0.3], shoes: [0.1, 0.1, 0.1],
      eye: [1.0, 0.2, 0.1], tear: 0.35, style: 'gaunt', jaw: true, claws: true, barefoot: true, ragged: 0.1,
      hair: [0.1, 0.08, 0.07, 0.8], extras: ['hairLong'], cheekTear: true, headFwd: 1,
    }),
    spitter: () => ({
      v: 0.05, blocky: true, leg: [4, 15, 4], torso: [10, 12, 6], arm: [3, 13, 3], head: [7, 7, 7],
      skin: [0.55, 0.62, 0.25], shirt: [0.4, 0.48, 0.18], pants: [0.22, 0.2, 0.15], shoes: [0.1, 0.1, 0.08],
      eye: [0.6, 1.0, 0.2], tear: 0.45, sleeve: [0.5, 0.58, 0.22], jaw: true, drool: true, hunch: true, shortSleeve: true,
      extras: ['sac'], headFwd: 1,
    }),
    exploder: () => ({
      v: 0.05, blocky: true, leg: [5, 13, 5], torso: [13, 13, 8], arm: [4, 12, 4], head: [7, 7, 7],
      skin: [0.58, 0.55, 0.32], shirt: [0.5, 0.55, 0.25], pants: [0.3, 0.25, 0.18], shoes: [0.12, 0.1, 0.08],
      eye: [1, 0.9, 0.2], tear: 0.6, pustules: true, style: 'bare', jaw: true, barefoot: true, extras: ['belly'],
    }),
    shielder: () => ({
      v: 0.05, blocky: true, leg: [5, 16, 5], torso: [10, 14, 6], arm: [4, 14, 4], head: [8, 8, 8],
      skin: [0.38, 0.55, 0.32], shirt: [0.3, 0.28, 0.25], pants: [0.24, 0.24, 0.3], shoes: [0.14, 0.12, 0.1],
      eye: [1, 0.6, 0.2], style: 'armor', jaw: true, extras: ['helmet', 'pauldron'],
    }),
    climber: () => ({
      v: 0.045, blocky: true, leg: [3, 18, 3], torso: [8, 13, 4], arm: [3, 22, 3], head: [7, 7, 7],
      skin: [0.68, 0.72, 0.76], shirt: [0.68, 0.72, 0.76], pants: [0.18, 0.18, 0.2], shoes: [0.1, 0.1, 0.1],
      eye: [0.5, 1, 1], tear: 0.5, style: 'gaunt', claws: true, barefoot: true, jaw: true, extras: ['ridge'], headFwd: 1,
    }),
    brute: () => ({
      v: 0.06, blocky: true, leg: [6, 15, 6], torso: [13, 14, 8], arm: [6, 16, 6], head: [8, 8, 8],
      skin: [0.36, 0.52, 0.3], shirt: [0.45, 0.4, 0.3], pants: [0.24, 0.22, 0.42], shoes: [0.1, 0.08, 0.08],
      eye: [0.45, 1.0, 0.3], tear: 0.3, style: 'bare', stitches: true, manacles: true, jaw: true, brow: true,
      extras: ['spikes'], headFwd: 2, barefoot: true,
    }),
    dog: () => ({
      v: 0.045, quad: true, leg: [3, 11, 3], torso: [8, 8, 21], head: [7, 7, 10],
      fur: pick([[0.35, 0.3, 0.26], [0.2, 0.18, 0.17], [0.45, 0.38, 0.28]]), eye: [1, 0.3, 0.1], snout: 4, ribs: true, ears: 3, tail: 6, claws: true,
    }),
    // ---- enemigos de bioma ----
    skeleton: () => ({
      // cuanto más bajas, más probable que lleven equipo: casco de hierro (para las balas),
      // hombrera, rodela y espada
      ...(() => {
        const f = (VX.game && VX.game.floor) || 1, p = Math.min(0.85, 0.06 + f * 0.045);
        const ex = ['loincloth'];
        if (Math.random() < p) ex.push('helmet');
        if (Math.random() < p * 0.6) ex.push('pauldron');
        if (Math.random() < p * 0.45) ex.push('buckler');
        return { extras: ex, tool: Math.random() < 0.35 + p * 0.5 ? 'sword' : null };
      })(),
      v: 0.042, leg: [3, 21, 3], torso: [11, 16, 6], arm: [2, 19, 2], head: [9, 9, 9], bones: true, clean: true,
      skin: [0.86, 0.82, 0.7], eye: pick([[1, 0.2, 0.1], [0.4, 0.9, 1], [0.7, 1, 0.3]]),
    }),
    archer: () => ({
      v: 0.042, leg: [3, 21, 3], torso: [11, 16, 6], arm: [2, 19, 2], head: [9, 9, 9], bones: true, clean: true,
      skin: [0.82, 0.78, 0.68], eye: [0.4, 0.9, 1], tool: 'bow',
      extras: ['loincloth', ...(Math.random() < Math.min(0.7, 0.05 + ((VX.game && VX.game.floor) || 1) * 0.035) ? ['helmet'] : [])],
    }),
    necro: () => ({
      v: 0.05, blocky: true, leg: [4, 17, 4], torso: [9, 14, 5], arm: [4, 15, 4], head: [8, 8, 8], clean: true,
      skin: [0.62, 0.62, 0.66], shirt: [0.18, 0.08, 0.24], sleeve: [0.16, 0.07, 0.22], pants: [0.16, 0.07, 0.22], shoes: [0.08, 0.05, 0.08],
      eye: [0.8, 0.3, 1], hood: [0.12, 0.05, 0.16], tear: 0, jaw: true, tool: 'staff', style: 'robe',
    }),
    ember: () => ({
      v: 0.05, blocky: true, leg: [4, 17, 4], torso: [10, 14, 6], arm: [4, 15, 4], head: [8, 8, 8], magma: true, clean: true, tear: 0,
      skin: [0.14, 0.09, 0.07], shirt: [0.1, 0.07, 0.06], pants: [0.08, 0.06, 0.05], shoes: [0.06, 0.05, 0.04], eye: [1, 0.85, 0.3],
      style: 'charred', jaw: true, claws: true, barefoot: true, extras: ['crest'],
    }),
    miner: () => ({
      v: 0.05, blocky: true, leg: [4, 16, 4], torso: [10, 14, 6], arm: [4, 15, 4], head: [8, 8, 8], ragged: 0.08,
      skin: [0.5, 0.52, 0.42], shirt: [0.32, 0.26, 0.2], sleeve: [0.28, 0.22, 0.16], pants: [0.22, 0.2, 0.24], shoes: [0.1, 0.08, 0.06],
      eye: [1, 0.85, 0.4], tear: 0.25, tool: 'pick', toolScale: 0.62, jaw: true, hair: [0.25, 0.2, 0.15, 0.5], style: 'apron',
      extras: ['minerHelmet', 'beard'],
    }),
    sporeling: () => ({
      v: 0.05, blocky: true, leg: [4, 16, 4], torso: [9, 13, 5], arm: [4, 15, 4], head: [8, 8, 8], ragged: 0.15,
      skin: [0.45, 0.55, 0.38], shirt: [0.3, 0.38, 0.25], pants: [0.25, 0.3, 0.2], shoes: [0.15, 0.17, 0.1],
      eye: [0.6, 1, 0.3], tear: 0.4, pustules: true, jaw: true, barefoot: true, claws: true, extras: ['cap'],
    }),
    mimic: () => ({
      v: 0.05, quad: true, leg: [3, 7, 3], torso: [14, 10, 11], head: [14, 7, 11], wood: true,
      fur: [0.42, 0.26, 0.12], eye: [1, 0.15, 0.1], lid: true, claws: true,
    }),
    // ---- nuevos ----
    bloater: () => ({
      v: 0.055, blocky: true, leg: [6, 14, 6], torso: [16, 15, 11], arm: [5, 14, 5], head: [8, 8, 8],
      skin: [0.55, 0.6, 0.34], shirt: [0.55, 0.6, 0.34], pants: [0.3, 0.27, 0.2], shoes: [0.12, 0.1, 0.08],
      eye: [0.9, 1, 0.3], tear: 0.25, pustules: true, style: 'bare', stitches: true, jaw: true, barefoot: true, extras: ['belly', 'guts'],
    }),
    riot: () => ({
      v: 0.05, blocky: true, leg: [5, 17, 5], torso: [10, 14, 6], arm: [4, 15, 4], head: [8, 8, 8],
      skin: [0.45, 0.55, 0.38], shirt: [0.1, 0.12, 0.17], pants: [0.09, 0.1, 0.13], shoes: [0.05, 0.05, 0.06],
      eye: [1, 0.35, 0.15], style: 'armor', jaw: true, extras: ['helmet', 'pauldron'],
    }),
    screamer: () => ({
      v: 0.048, blocky: true, leg: [3, 19, 3], torso: [8, 14, 4], arm: [3, 20, 3], head: [7, 8, 7],
      skin: [0.78, 0.78, 0.74], shirt: [0.78, 0.78, 0.74], pants: [0.2, 0.18, 0.2], shoes: [0.1, 0.1, 0.1],
      eye: [1, 0.1, 0.1], tear: 0.4, style: 'gaunt', jaw: true, claws: true, barefoot: true, ribs: true,
      hair: [0.85, 0.85, 0.82, 0.8], extras: ['hairLong'], headFwd: 1,
    }),
    crow: () => ({ v: 0.05 }),   // más grande desde la 0.35 para que se le pueda dar
    knight: () => ({
      v: 0.055, leg: [6, 18, 6], torso: [13, 15, 8], arm: [5, 17, 5], head: [8, 8, 8],
      skin: [0.07, 0.07, 0.085], shirt: [0.07, 0.07, 0.085], sleeve: [0.07, 0.07, 0.085], pants: [0.07, 0.07, 0.085], shoes: [0.05, 0.05, 0.06],
      eye: [0.85, 0.35, 1], tear: 0,
    }),
    revenant: () => ({
      v: 0.05, blocky: true, leg: [4, 19, 4], torso: [10, 15, 5], arm: [4, 21, 4], head: [8, 8, 8],
      skin: [0.5, 0.13, 0.12], shirt: [0.5, 0.13, 0.12], pants: [0.16, 0.08, 0.07], shoes: [0.1, 0.05, 0.05],
      eye: [0.45, 0.9, 1], tear: 0, style: 'gaunt', jaw: true, claws: true, barefoot: true, forearm: 'thin',
      extras: ['boneCrown', 'ridge'], headFwd: 1,
    }),
    revpile: () => ({ v: 0.064, eye: [0.45, 0.9, 1] }),   // un poco más grande que antes (0.05)
    // hidra: carne pálida verdosa con bultos que laten y ojos amarillos (la cabeza es su punto débil)
    hydra: () => ({
      v: 0.05, blocky: true, leg: [4, 18, 4], torso: [10, 14, 6], arm: [4, 18, 4], head: [8, 8, 8],
      skin: [0.52, 0.6, 0.4], shirt: [0.52, 0.6, 0.4], pants: [0.26, 0.3, 0.2], shoes: [0.15, 0.17, 0.1],
      eye: [0.85, 1, 0.2], tear: 0.15, style: 'bare', pustules: true, jaw: true, claws: true, barefoot: true, ribs: true,
      extras: ['ridge'], hydra: true,
    }),
    hydrabud: () => ({ v: 0.04, eye: [0.85, 1, 0.2], flesh: 'hydra' }),
    rat: () => ({
      v: 0.04, quad: true, leg: [2, 5, 2], torso: [7, 6, 15], head: [5, 5, 8],
      fur: pick([[0.3, 0.27, 0.25], [0.22, 0.2, 0.2], [0.4, 0.36, 0.3]]), eye: [1, 0.15, 0.1], snout: 4, ears: 2, roundEars: true, tail: 14, ratTail: true, ribs: Math.random() < 0.4,
    }),
  };
  // Acceso compatible: VX.Models.zombieConfigs[kind] devuelve una variante nueva cada vez
  Models.zombieConfigs = new Proxy(Z, { get: (t, k) => (typeof t[k] === 'function' ? t[k]() : t[k]) });

  Models.bossConfigs = {
    tanque: {
      v: 0.078, leg: [9, 15, 9], torso: [20, 18, 14], arm: [9, 20, 9], head: [9, 9, 9],
      skin: [0.66, 0.4, 0.38], shirt: [0.66, 0.4, 0.38], pants: [0.25, 0.18, 0.16], shoes: [0.12, 0.08, 0.06],
      eye: [1, 0.85, 0.2], tear: 0.5, pustules: true, style: 'bare', stitches: true, manacles: true, jaw: true, brow: true,
      forearm: 'thick', barefoot: true, extras: ['spikes', 'guts', 'belly'],
    },
    capataz: {
      v: 0.072, leg: [8, 17, 8], torso: [17, 16, 12], arm: [8, 19, 8], head: [10, 10, 10],
      skin: [0.55, 0.45, 0.35], shirt: [0.42, 0.3, 0.18], sleeve: [0.35, 0.25, 0.15], pants: [0.25, 0.22, 0.2], shoes: [0.12, 0.1, 0.08],
      eye: [1, 0.9, 0.3], tear: 0.15, tool: 'pick', jaw: true, hair: [0.3, 0.22, 0.15, 0.6], style: 'apron', extras: ['minerHelmet', 'beard'],
    },
    reina: {
      v: 0.075, quad: true, leg: [6, 14, 6], torso: [20, 14, 28], head: [12, 11, 12],
      fur: [0.32, 0.22, 0.38], eye: [0.8, 1, 0.3], spots: [0.4, 1, 0.8], snout: 3, ears: 4, tail: 10, claws: true,
    },
    guardian: {
      v: 0.07, leg: [6, 22, 6], torso: [12, 18, 8], arm: [5, 24, 5], head: [8, 11, 8],
      skin: [0.25, 0.18, 0.35], shirt: [0.12, 0.08, 0.2], sleeve: [0.12, 0.08, 0.2], pants: [0.1, 0.06, 0.16], shoes: [0.06, 0.04, 0.1],
      eye: [0.9, 0.4, 1], tear: 0, clean: true, hood: [0.15, 0.08, 0.25], magma: false, pustules: false, glowRunes: true,
    },
    corazon: {
      v: 0.085, leg: [9, 18, 9], torso: [20, 20, 14], arm: [9, 22, 9], head: [12, 11, 12],
      skin: [0.45, 0.08, 0.1], shirt: [0.35, 0.05, 0.07], pants: [0.25, 0.04, 0.05], shoes: [0.15, 0.03, 0.03],
      eye: [1, 0.9, 0.3], tear: 0.4, magma: true, pustules: true, style: 'bare', jaw: true, extras: ['spikes', 'crest'],
    },
    coloso: {
      v: 0.075, leg: [8, 18, 8], torso: [16, 17, 11], arm: [7, 19, 7], head: [10, 10, 10],
      skin: [0.32, 0.48, 0.26], shirt: [0.25, 0.22, 0.2], pants: [0.18, 0.16, 0.14], shoes: [0.1, 0.08, 0.06],
      eye: [1, 0.3, 0.1], tear: 0.35, style: 'bare', stitches: true, manacles: true, jaw: true, brow: true, forearm: 'thick', extras: ['spikes'],
    },
    carnicero: {
      tool: 'cleaver',
      v: 0.07, leg: [8, 19, 8], torso: [16, 16, 11], arm: [7, 21, 7], head: [9, 9, 9],
      skin: [0.72, 0.56, 0.5], shirt: [0.76, 0.73, 0.69], sleeve: [0.6, 0.15, 0.12], pants: [0.25, 0.22, 0.2], shoes: [0.1, 0.08, 0.06],
      eye: [1, 1, 0.35], tear: 0.18, style: 'apron', jaw: true, brow: true, shortSleeve: true,
    },
    ancestro: {
      v: 0.075, leg: [7, 17, 7], torso: [14, 19, 10], arm: [6, 21, 6], head: [10, 10, 10],
      skin: [0.5, 0.4, 0.62], shirt: [0.2, 0.12, 0.28], pants: [0.15, 0.1, 0.2], shoes: [0.08, 0.06, 0.1],
      eye: [0.45, 1, 1], tear: 0.2, hood: [0.22, 0.14, 0.3], jaw: true, claws: true, forearm: 'thin',
    },
  };

  Models.vendor = () => humanoid({
    v: 0.05, leg: [4, 15, 4], torso: [8, 14, 6], arm: [4, 13, 4], head: [8, 8, 8],
    skin: [0.86, 0.69, 0.53], shirt: [0.35, 0.18, 0.45], sleeve: [0.35, 0.18, 0.45], pants: [0.3, 0.16, 0.4],
    shoes: [0.2, 0.12, 0.08], eye: [0.3, 0.9, 1.0], tear: 0, clean: true, hood: [0.28, 0.14, 0.38],
  });

  Models.knight = knight; Models.pile = pile;
  Models.makePart = makePart; Models.corner = corner;   // para piezas de fuera (personalización del jugador)
  VX.Models = Models;
})();
