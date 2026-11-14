// Decoración estructural de cada bioma, hecha de bloques de la propia sala (se rompe y, si algo
// se queda sin apoyo, se cae). Da a cada sala el aspecto de su bioma, sea cual sea la plantilla:
//  cripta  → pilastras de sillería con calaveras, nichos funerarios con huesos, lápidas y osarios
//  cloacas → contrafuertes de ladrillo, desagües con rejilla, tuberías y musgo que chorrea
//  minas   → cuadros de entibado de madera de verdad, afloramientos de roca y vetas de cristal
//  forja   → pilares de acero remachados, grietas al rojo, hollín, cadenas y rejillas de escoria
//  jardín  → raíces que trepan, mantos de musgo y setas yesqueras luminosas en las paredes
//  vacío   → lajas de obsidiana, racimos de cristal violeta y runas que brillan en los muros
(function () {
  const M = VX.M, S = VX.S;

  // Material de los muros de la sala según el bioma (y, celda, mancha)
  function shellBlock(zone, x, y, z, H, idx) {
    const B = VX.Blocks;
    const patch = M.hash3(x >> 3, y >> 2, (z >> 3) + idx * 17), n = M.hash3(x, y + 77, z);
    switch (zone) {
      case 0: return y < 2 ? B.STONE : patch < 0.07 ? B.MOSS : patch < 0.2 ? B.STONE : B.CSTONE;
      case 1: return y < 2 ? B.STONE : (y < 7 && patch < 0.45) || patch < 0.08 ? B.MOSS : B.BRICK;
      case 2: return patch < 0.35 ? B.TERRAIN : B.CROCK;
      case 3: return y < 2 ? B.CSTONE : (y > H * 0.55 && patch < 0.5) || n < 0.04 ? B.CDARK : B.STONE;
      case 4: return patch < 0.45 ? B.MOSS : B.CROCK;
      case 5: return patch < 0.25 ? B.CDARK : B.CROCK;
      default: return y < 2 ? B.STONE : patch < 0.1 ? B.MOSS : B.BRICK;
    }
  }

  function apply(r) {
    if (r.type === 'shop' || r.type === 'horde') return;
    const B = VX.Blocks, W = r.W, D = r.D, top = r.ceilBase, zone = r.zone || 0;
    const rnd = (() => { let s = (r.index * 7919 + zone * 104729 + W * 31 + D) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const ok = (x, y, z) => r.inBounds(x, y, z) && y < top && x >= 1 && z >= 1 && x < W - 1 && z < D - 1 && !r.isReservedU(x >> 1, z >> 1);
    const put = (x, y, z, t) => { if (ok(x, y, z) && !r.get(x, y, z)) r.set(x, y, z, t); };
    const force = (x, y, z, t) => { if (ok(x, y, z) && r.get(x, y, z) !== B.BEDROCK) r.set(x, y, z, t); };
    const carve = (x, y, z) => { if (ok(x, y, z) && r.get(x, y, z) && r.get(x, y, z) !== B.BEDROCK) r.set(x, y, z, 0); };
    // las 4 paredes: a = a lo largo, m = profundidad desde fuera (3 = cara del muro, 4 = primera celda libre)
    const sides = [];
    for (const s of ['zn', 'zp', 'xn', 'xp']) {
      const alongX = s === 'zn' || s === 'zp', len = alongX ? W : D;
      const cell = (a, m) => (s === 'zn' ? [a, m] : s === 'zp' ? [a, D - 1 - m] : s === 'xn' ? [m, a] : [W - 1 - m, a]);
      const door = r.doors[s] ? (alongX ? r.cx : r.cz) : null;
      sides.push({ s, len, cell, door });
    }
    const free = (sd, a, w) => {
      if (a - w < 6 || a + w > sd.len - 7) return false;
      if (sd.door != null && Math.abs(a - sd.door) < 10 + w) return false;
      if (Math.abs(((a - 12) % 44 + 44) % 44) < 5 + w || Math.abs(((a - 12) % 44 + 44) % 44 - 44) < 5 + w) return false;   // antorchas
      for (let m = 4; m < 8; m++) { const [x, z] = sd.cell(a, m); if (r.get(x, 1, z)) return false; }
      return true;
    };
    // recorre cada pared colocando un elemento cada «step» vóxeles (si hay sitio)
    const along = (step, w, fn) => { for (const sd of sides) for (let a = 8 + ri(0, step >> 1); a < sd.len - 8; a += step + ri(-2, 2)) if (free(sd, a, w)) fn(sd, a); };
    const light = (x, y, z, rad, c) => r.features.push({ kind: 'light', x: r.worldX(x), y: y * S, z: r.worldZ(z), r: rad, c });
    const floorFree = (x, z, rad) => { for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (!ok(x + dx, 0, z + dz) || r.get(x + dx, 0, z + dz)) return false; return true; };
    const interior = () => [ri(10, W - 11), ri(10, D - 11)];

    switch (zone) {
      case 0: {   // ---------------- CRIPTA ----------------
        // pilastras de sillería con una calavera por capitel
        along(12, 2, (sd, a) => {
          for (let y = 0; y < top; y++) for (let da = -1; da <= 1; da++) for (let m = 4; m <= 5; m++) {
            const [x, z] = sd.cell(a + da, m);
            const base = y < 2 || (y >= 9 && y <= 10);
            if (m === 5 && !base) continue;
            put(x, y, z, base ? B.CRIB : B.CSTONE);
          }
          const [sx, sz] = sd.cell(a, 6);
          if (rnd() < 0.7) { put(sx, 11, sz, B.BONE); const [sx2, sz2] = sd.cell(a, 5); put(sx2, 11, sz2, B.BONE); put(sx2, 12, sz2, B.BONE); }
        });
        // nichos funerarios (loculi) excavados en el muro, con huesos dentro
        along(9, 3, (sd, a) => {
          if (rnd() < 0.35) return;
          const rows = rnd() < 0.5 ? [2, 6] : [3];
          for (const y0 of rows) {
            for (let da = -2; da <= 2; da++) for (let y = y0; y < y0 + 3; y++) for (let m = 2; m <= 3; m++) { const [x, z] = sd.cell(a + da, m); carve(x, y, z); }
            for (let da = -2; da <= 2; da++) { const [x, z] = sd.cell(a + da, 2); if (rnd() < 0.7) force(x, y0, z, B.BONE); }
            if (rnd() < 0.5) { const [x, z] = sd.cell(a + ri(-1, 1), 3); force(x, y0, z, B.BONE); force(x, y0 + 1, z, B.BONE); }
            for (let da = -3; da <= 3; da++) { const [x, z] = sd.cell(a + da, 3); force(x, y0 + 3, z, B.CRIB); }
          }
        });
        // lápidas y túmulos de piedra en el suelo
        for (let i = 0, n = Math.round(W * D / 900); i < n; i++) {
          const [x, z] = interior(), alongX = rnd() < 0.5, lw = alongX ? 6 : 4, ld = alongX ? 4 : 6;
          if (!floorFree(x + lw / 2, z + ld / 2, 4)) continue;
          for (let dx = 0; dx < lw; dx++) for (let dz = 0; dz < ld; dz++) {
            const edge = dx === 0 || dz === 0 || dx === lw - 1 || dz === ld - 1;
            put(x + dx, 0, z + dz, B.CRIB); if (!edge || rnd() < 0.4) put(x + dx, 1, z + dz, B.CSTONE);
          }
          // cabecera con cruz
          const hx = alongX ? x - 1 : x + (lw >> 1), hz = alongX ? z + (ld >> 1) : z - 1;
          for (let y = 0; y < 5; y++) put(hx, y, hz, B.CRIB);
          put(alongX ? hx : hx - 1, 3, alongX ? hz - 1 : hz, B.CRIB); put(alongX ? hx : hx + 1, 3, alongX ? hz + 1 : hz, B.CRIB);
        }
        // montones de huesos al pie de los muros
        along(14, 2, (sd, a) => {
          if (rnd() < 0.5) return;
          for (let da = -2; da <= 2; da++) for (let m = 4; m <= 6; m++) {
            const h = Math.max(0, 3 - Math.abs(da) - (m - 4));
            const [x, z] = sd.cell(a + da, m);
            for (let y = 0; y < h; y++) if (rnd() < 0.85) put(x, y, z, B.BONE);
          }
        });
        break;
      }
      case 1: {   // ---------------- CLOACAS ----------------
        // contrafuertes de ladrillo con arranque de arco
        along(14, 2, (sd, a) => {
          for (let y = 0; y < top; y++) for (let da = -1; da <= 1; da++) for (let m = 4; m <= 6; m++) {
            if (m - 4 > Math.max(0, 2 - Math.floor(y / 6))) continue;   // se estrecha al subir
            const [x, z] = sd.cell(a + da, m);
            put(x, y, z, y < 2 ? B.STONE : (y < 6 && rnd() < 0.4) ? B.MOSS : B.BRICK);
          }
        });
        // desagües: boca en el muro a ras del suelo con rejilla y un reguero de musgo
        along(17, 3, (sd, a) => {
          if (rnd() < 0.4) return;
          for (let da = -2; da <= 2; da++) for (let y = 0; y < 4; y++) for (let m = 2; m <= 3; m++) { const [x, z] = sd.cell(a + da, m); carve(x, y, z); }
          for (let da = -2; da <= 2; da++) for (let y = 0; y < 4; y++) { const [x, z] = sd.cell(a + da, 3); if ((da + 2) % 2 === 0 || y === 3) force(x, y, z, B.CHAIN); }
          for (let da = -3; da <= 3; da++) { const [x, z] = sd.cell(a + da, 3); force(x, 4, z, B.STONE); }
          for (let y = 5; y < Math.min(top, 14); y++) { const [x, z] = sd.cell(a + ri(-1, 1), 3); if (rnd() < 0.7) force(x, y, z, B.MOSS); }
          for (let m = 4; m <= 7; m++) { const [x, z] = sd.cell(a + ri(-1, 1), m); put(x, 0, z, B.MOSS); }
        });
        // tubería de hierro corriendo por los muros, con abrazaderas y bajantes
        for (const sd of sides) {
          if (rnd() < 0.35) continue;
          const y = ri(9, Math.min(13, top - 3));
          for (let a = 6; a < sd.len - 6; a++) {
            if (sd.door != null && Math.abs(a - sd.door) < 9) continue;
            const [x, z] = sd.cell(a, 4); put(x, y, z, a % 10 === 0 ? B.CHAIN : B.STEEL);
            if (a % 23 === 0) for (let yy = 0; yy < y; yy++) { const [x2, z2] = sd.cell(a, 4); put(x2, yy, z2, B.STEEL); }
          }
        }
        break;
      }
      case 2: {   // ---------------- MINAS ----------------
        // cuadros de entibado: dos postes y un travesaño de madera de lado a lado (si cortas un poste, se viene abajo)
        const zAxis = D >= W, len = zAxis ? D : W, span = zAxis ? W : D;
        const fh = Math.min(top - 2, 13);
        for (let a = 12; a < len - 10; a += 14 + ri(0, 4)) {
          const cell = (s, y) => (zAxis ? [s, y, a] : [a, y, s]);
          let blocked = false;
          for (const s of [4, 5, span - 6, span - 5]) { const [x, , z] = cell(s, 0); if (r.isReservedU(x >> 1, z >> 1) || r.get(x, 0, z)) blocked = true; }
          // ni a través de nada (la copa del gran árbol, columnas…): si no, lo dejaba colgado de la pared
          for (let s = 4; s < span - 4 && !blocked; s++) for (let y = fh - 4; y < fh + 3 && !blocked; y++) { const [x, yy, z] = cell(s, y); if (r.get(x, yy, z) || r.get(zAxis ? x : x + 1, yy, zAxis ? z + 1 : z)) blocked = true; }
          if (blocked) continue;
          for (const s0 of [4, span - 6]) for (let y = 0; y < fh; y++) for (let s = s0; s < s0 + 2; s++) for (let t = 0; t < 2; t++) {
            const [x, yy, z] = cell(s, y); put(zAxis ? x : x + t, yy, zAxis ? z + t : z, B.PLANK);
          }
          for (let s = 4; s < span - 4; s++) for (let y = fh; y < fh + 2; y++) for (let t = 0; t < 2; t++) {
            const [x, yy, z] = cell(s, y); put(zAxis ? x : x + t, yy, zAxis ? z + t : z, B.WOOD);
          }
          // tornapuntas en diagonal
          for (let k = 0; k < 4; k++) for (const [s, sg] of [[6, 1], [span - 7, -1]]) { const [x, yy, z] = cell(s + sg * k, fh - 1 - k); put(x, yy, z, B.PLANK); }
          // farol colgando del travesaño
          if (rnd() < 0.6) { const s = span >> 1; const [x, yy, z] = cell(s, fh - 1); put(x, yy, z, B.CHAIN); put(x, yy - 1, z, B.LAMP); light(x, yy - 1, z, 7, [1.2, 0.75, 0.35]); }
        }
        // afloramientos de roca al pie de las paredes y vetas de cristal
        along(11, 3, (sd, a) => {
          const h = ri(3, 9), w = ri(2, 4);
          for (let da = -w; da <= w; da++) for (let m = 4; m <= 7; m++) {
            const hh = Math.round(h * (1 - Math.abs(da) / (w + 1)) * (1 - (m - 4) / 4.5));
            const [x, z] = sd.cell(a + da, m);
            for (let y = 0; y < hh; y++) put(x, y, z, rnd() < 0.25 ? B.TERRAIN : B.CROCK);
          }
        });
        for (const sd of sides) for (let v = 0; v < 2; v++) {
          let a = ri(10, sd.len - 10), y = ri(3, top - 6);
          for (let k = 0; k < 14; k++) {
            const [x, z] = sd.cell(a, 3);
            if (r.get(x, y, z) && r.get(x, y, z) !== B.BEDROCK) force(x, y, z, B.MCRYST);
            a += ri(0, 1) ? 1 : 0; y += ri(-1, 1);
          }
        }
        break;
      }
      case 3: {   // ---------------- FORJA ----------------
        // pilares de acero remachados
        along(13, 2, (sd, a) => {
          for (let y = 0; y < top; y++) for (let da = -1; da <= 1; da++) for (let m = 4; m <= 5; m++) {
            const [x, z] = sd.cell(a + da, m);
            const flange = da !== 0 && m === 5 && y % 6 !== 3;
            if (flange) continue;
            put(x, y, z, y % 6 === 3 && da !== 0 ? B.IRON : B.STEEL);
          }
        });
        // grietas al rojo que suben por los muros y el hollín encima
        along(9, 1, (sd, a) => {
          if (rnd() < 0.45) return;
          let aa = a, y = ri(0, 3);
          const n = ri(6, 14);
          for (let k = 0; k < n && y < top - 2; k++) {
            const [x, z] = sd.cell(aa, 3); force(x, y, z, B.EMBER);
            y += 1; if (rnd() < 0.3) aa += ri(-1, 1);
          }
          for (let k = 0; k < 10; k++) { const [x, z] = sd.cell(aa + ri(-2, 2), 3); force(x, Math.min(top - 1, y + ri(0, 5)), z, B.CDARK); }
          const [lx, lz] = sd.cell(a, 4); light(lx, 3, lz, 4, [1.2, 0.4, 0.08]);
        });
        // rejillas de escoria en el suelo (hierro sobre brasas)
        for (let i = 0, n = Math.round(W * D / 1100); i < n; i++) {
          const [x, z] = interior();
          if (!floorFree(x + 2, z + 2, 3)) continue;
          for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) {
            if (r.get(x + dx, 0, z + dz) === 0) put(x + dx, 0, z + dz, (dx + dz) % 2 ? B.EMBER : B.IRON);
          }
          light(x + 2, 1, z + 2, 4, [1.3, 0.45, 0.1]);
        }
        break;
      }
      case 4: {   // ---------------- JARDÍN FÚNGICO ----------------
        // raíces que trepan por los muros
        along(8, 1, (sd, a) => {
          let aa = a, m = 4;
          const h = ri(8, top - 2);
          for (let y = 0; y < h; y++) {
            const [x, z] = sd.cell(aa, m); put(x, y, z, B.BARK);
            if (y < 3) { const [x2, z2] = sd.cell(aa, m + 1); put(x2, y, z2, B.BARK); }
            if (rnd() < 0.25) aa += ri(-1, 1);
            if (y > 4 && rnd() < 0.1) { const [x3, z3] = sd.cell(aa + ri(-1, 1), 5); put(x3, y, z3, B.GLOWLEAF); }
          }
        });
        // setas yesqueras luminosas en los muros
        along(10, 2, (sd, a) => {
          if (rnd() < 0.3) return;
          const y0 = ri(3, top - 6);
          for (let k = 0; k < ri(1, 3); k++) {
            const y = y0 + k * 3, w = 2 - k % 2;
            for (let da = -w; da <= w; da++) for (let m = 4; m <= 4 + (w - Math.abs(da)); m++) { const [x, z] = sd.cell(a + da + k, m); put(x, y, z, B.FGLOW); }
          }
          const [lx, lz] = sd.cell(a, 5); light(lx, y0 + 1, lz, 5, [0.3, 1, 0.8]);
        });
        // mantos de musgo en la base de los muros
        for (const sd of sides) for (let a = 6; a < sd.len - 6; a++) {
          if (sd.door != null && Math.abs(a - sd.door) < 9) continue;
          const h = Math.round(M.hash3(a, zone, sd.len) * 3) - 1;
          for (let m = 4; m < 4 + Math.max(0, h); m++) { const [x, z] = sd.cell(a, m); put(x, 0, z, B.MOSS); }
        }
        break;
      }
      case 5: {   // ---------------- VACÍO ----------------
        // lajas de obsidiana inclinadas contra los muros
        along(13, 2, (sd, a) => {
          const h = ri(8, Math.min(top - 1, 20)), lean = rnd() < 0.5 ? 1 : -1;
          for (let y = 0; y < h; y++) {
            const sh = Math.floor(y / 5) * lean, w = y > h - 3 ? 0 : 1;
            for (let da = -w; da <= w; da++) for (let m = 4; m <= 5; m++) { const [x, z] = sd.cell(a + da + sh, m); put(x, y, z, m === 5 && da === 0 && y % 4 === 1 ? B.VCRYST : B.CDARK); }
          }
        });
        // racimos de cristal violeta en las esquinas y al pie de los muros
        along(9, 2, (sd, a) => {
          if (rnd() < 0.5) return;
          for (let k = 0; k < ri(2, 4); k++) {
            const da = ri(-2, 2), m = ri(4, 6), h = ri(2, 6);
            for (let y = 0; y < h; y++) { const [x, z] = sd.cell(a + da + (y > h / 2 ? Math.sign(da) : 0), m); put(x, y, z, B.VCRYST); }
          }
          const [lx, lz] = sd.cell(a, 5); light(lx, 1, lz, 5, [0.8, 0.3, 1.4]);
        });
        // runas: franja rota que brilla a media altura
        const ry = ri(6, Math.min(top - 4, 10));
        for (const sd of sides) for (let a = 6; a < sd.len - 6; a++) {
          if ((a >> 2) % 3 === 0 || M.hash3(a, ry, sd.len) < 0.2) continue;
          const [x, z] = sd.cell(a, 3);
          const t = r.get(x, ry, z);
          if (t && t !== B.BEDROCK && (a % 4 !== 1)) force(x, ry, z, B.VCRYST);
        }
        break;
      }
    }
  }

  // Niebla baja de la sala: color, altura y densidad según el bioma. Algunas salas no tienen
  // y otras la tienen espesa (te llega por la cintura y sólo se ven los ojos de los zombis)
  const FOG = [
    { col: [0.5, 0.52, 0.6], top: 0.55, dens: 0.9, p: 0.3 },    // cripta: gris azulado
    { col: [0.38, 0.55, 0.36], top: 0.7, dens: 1.3, p: 0.45 },   // cloacas: verdosa y espesa
    { col: [0.58, 0.47, 0.34], top: 0.45, dens: 0.7, p: 0.25 },  // minas: polvo
    { col: [0.55, 0.38, 0.3], top: 0.6, dens: 0.85, p: 0.3 },    // forja: humo y calima
    { col: [0.36, 0.6, 0.55], top: 0.6, dens: 1.1, p: 0.4 },     // jardín: esporas
    { col: [0.4, 0.27, 0.74], top: 0.6, dens: 1.15, p: 0.45 },  // vacío: violeta
  ];
  function fogFor(r) {
    if (r.type === 'shop' || r.type === 'horde' || r.type === 'start') return null;
    const F = FOG[r.zone || 0] || FOG[0];
    if (Math.random() > F.p) return null;
    const thick = r.type === 'normal' && Math.random() < 0.25;
    return { col: F.col, top: thick ? 1.2 : F.top * M.rand(0.85, 1.2), dens: thick ? F.dens * 2.4 : F.dens * M.rand(0.8, 1.2), thick };
  }

  VX.BiomeDecor = { apply, shellBlock, fogFor };
})();
