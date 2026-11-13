// Pool de plantillas de habitación. Medidas en unidades de 0,5 m.
// Cada tipo tiene varias variantes; cada una genera su contenido al azar.
(function () {
  const M = VX.M;
  const BL = () => VX.Blocks;

  // ---------- Ayudantes ----------
  // Montón de cajas (objetos de vóxel fino) sobre un hueco de size x size unidades
  function crate(r, x, z, size, h) {
    const n = Math.max(1, Math.round((size * 0.5) / 0.64));
    const step = (size * 0.5) / n;
    const levels = M.clamp(Math.round((h * 0.5) / 0.62), 1, 3);
    // menos cajas: una caja grande en el centro o unas pocas pequeñas sueltas (no un muro de cajas)
    if (n >= 2 && Math.random() < 0.55) {
      r.queue('bigcrate', r.uX(x) + size * 0.25, r.uZ(z) + size * 0.25, { rot: 0 }, 1);
      if (Math.random() < 0.4) r.queue('crate', r.uX(x) + 0.35, r.uZ(z) + 0.35, { rot: 0 }, 1);
      return;
    }
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        if (Math.random() < 0.45) continue;
        r.queue('crate', r.uX(x) + (a + 0.5) * step, r.uZ(z) + (b + 0.5) * step, { rot: 0 }, Math.max(1, levels - 1 - (Math.random() < 0.5 ? 1 : 0)));
      }
  }
  function pillar(r, x, z, w, h, t) {
    r.box(x, 0, z, x + w - 1, h - 1, z + w - 1, t || BL().STONE);
  }
  // Muro irregular con bordes rotos a nivel de vóxel
  function ruinWall(r, x, z, len, horiz, hMax, t) {
    for (let i = 0; i < len; i++) {
      const xx = horiz ? x + i : x, zz = horiz ? z : z + i;
      if (M.chance(0.1)) continue;
      const hv = M.randInt(Math.max(2, hMax * 2 - 5), hMax * 2);
      r.column(xx, zz, hv, M.chance(0.22) ? BL().MOSS : t);
    }
  }
  const area = (r) => (r.w - 4) * (r.d - 4);

  // Columna clásica de piedra: basa, fuste y capitel. broken = partida a media altura
  function column(r, ux, uz, wU = 2, broken = false) {
    if (r.isReservedU(ux, uz)) return;
    const x0 = ux * 2, z0 = uz * 2, w = wU * 2, St = BL().STONE;
    const H = r.H - 4;
    const hTop = broken ? M.randInt(4, Math.max(5, Math.floor(H * 0.55))) : H;
    for (let y = 0; y < hTop; y++) {
      const wide = y < 2 || (!broken && y >= hTop - 2);
      const m = wide ? 1 : 0;
      for (let x = x0 - m; x < x0 + w + m; x++)
        for (let z = z0 - m; z < z0 + w + m; z++) {
          if (broken && y > hTop - 3 && Math.random() < 0.45) continue;
          if (r.inBounds(x, y, z) && !r.get(x, y, z)) r.set(x, y, z, St);
        }
    }
  }

  // Muro con arcos de medio punto (en vóxeles). along 'x': de x0 a x1 en la fila z0
  function archWall(r, a0, a1, b0, along, t = BL().BRICK, hgt = 16, thick = 2, period = 16, ow = 8, spring = 7) {
    for (let a = a0; a <= a1; a++) {
      const rel = ((a - a0) % period) - period / 2 + 0.5;
      for (let y = 0; y < Math.min(hgt, r.H - 4); y++) {
        if (Math.abs(rel) < ow / 2 && (y < spring || Math.hypot(rel, (y - spring) * 1.1) < ow / 2)) continue;
        for (let d = 0; d < thick; d++) {
          const x = along === 'x' ? a : b0 + d, z = along === 'x' ? b0 + d : a;
          if (r.isReservedU(x >> 1, z >> 1) || !r.inBounds(x, y, z) || r.get(x, y, z)) continue;
          // remate de sillería arriba y abajo
          r.set(x, y, z, y < 2 || y === hgt - 1 ? BL().STONE : t);
        }
      }
    }
  }

  // ---------- Objetos ----------
  // Barril de 1x1 unidades (0,5 m) y 0,75 m de alto; apilable
  function barrel(r, ux, uz, explosive, stack = 1) {
    if (ux < 2 || uz < 2 || ux > r.w - 3 || uz > r.d - 3 || r.isReservedU(ux, uz)) return;
    r.queue(explosive ? 'xbarrel' : 'barrel', r.uX(ux) + 0.3, r.uZ(uz) + 0.3, {}, explosive ? 1 : stack);
  }
  function scatterBarrels(r, n, explosiveChance = 0.6) {
    for (let i = 0; i < n; i++) {
      const ux = M.randInt(4, r.w - 5), uz = M.randInt(5, r.d - 6);
      const ex = Math.random() < explosiveChance;
      barrel(r, ux, uz, ex);
      if (Math.random() < 0.5) barrel(r, ux + 1, uz + 0.4, ex);
      if (Math.random() < 0.3) barrel(r, ux + 0.5, uz + 1.3, !ex);
    }
  }
  // Brasero: pie de hierro con brasas y luz
  function brazier(r, ux, uz) {
    if (ux < 2 || uz < 2 || ux > r.w - 3 || uz > r.d - 3 || r.isReservedU(ux, uz)) return;
    r.queue('brazier', r.uX(ux + 1), r.uZ(uz + 1), { rot: 0 });
    r.features.push({ kind: 'light', x: r.uX(ux + 1), y: 1.2, z: r.uZ(uz + 1), r: 8, c: [1.1, 0.55, 0.18] });
  }
  // Jaula colgada del techo
  // Jaula colgante (objeto de vóxel fino): si le cortas la cadena, cae y aplasta
  function cage(r, ux, uz) {
    const PV = VX.PV, ceil = (r.H - 4) * VX.S;
    r.pending.push({ type: 'cage', x: r.uX(ux) + 0.25 - 0.5, z: r.uZ(uz) + 0.25 - 0.5, at: { y: ceil - 40 * PV, rot: 0, v: M.randInt(0, 3) } });
  }

  // ---------- Relieve ----------
  // Colinas suaves con ruido (las pendientes son siempre transitables)
  function reliefNoise(r, amp, scale, thr = 0.45) {
    const seed = M.randInt(0, 9999);
    for (let z = 4; z < r.D - 4; z++)
      for (let x = 4; x < r.W - 4; x++) {
        let n = M.vnoise(x / scale, z / scale, seed) * 0.75 + M.vnoise(x / (scale * 0.5), z / (scale * 0.5), seed + 7) * 0.25;
        n = M.clamp((n - thr) / (1 - thr), 0, 1);
        const hv = Math.round(n * amp * r.doorMask(x, z));
        if (hv > 0) r.terrainColumn(x, z, hv);
      }
  }
  const maybeRelief = (chance, amp) => (r) => {
    if (Math.random() < chance) reliefNoise(r, M.randInt(Math.max(2, amp - 1), amp + 1), M.rand(18, 28));
  };

  // Biomas: cambian al derrotar a cada jefe
  // 5 biomas + 1 secreto (se llega por una grieta con escaleras en cualquier sala)
  VX.ZONES = [
    { id: 'cripta', name: 'LA CRIPTA', sub: 'Piedra, huesos y púas', tint: [1, 1, 1], floor: [1, 1, 1], fog: [0.012, 0.01, 0.016], hazard: 'spikes', boss: 'coloso', ceil: 12, music: 0, torch: [3.3, 1.6, 0.5], flame: [1, 0.75, 0.25], damp: 0.5 },
    { id: 'cloacas', name: 'LAS CLOACAS', sub: 'Cuidado con los charcos de ácido', tint: [0.72, 0.95, 0.78], floor: [0.75, 0.95, 0.85], fog: [0.008, 0.02, 0.014], hazard: 'acid', boss: 'ancestro', ceil: 12, music: 1, torch: [2.4, 2.3, 0.9], flame: [0.85, 1, 0.4], damp: 1 },
    { id: 'minas', name: 'LAS MINAS', sub: 'Vigas podridas, vagonetas y vetas de cristal', tint: [0.95, 0.85, 0.72], floor: [0.9, 0.82, 0.7], fog: [0.016, 0.012, 0.008], hazard: 'spikes', boss: 'capataz', ceil: 13, music: 2, torch: [3.4, 2.1, 0.75], flame: [1, 0.85, 0.35], damp: 0.25 },
    { id: 'forja', name: 'LA FORJA', sub: 'El suelo arde: no pises la lava', tint: [1.08, 0.8, 0.7], floor: [1.02, 0.8, 0.72], fog: [0.03, 0.012, 0.006], hazard: 'lava', boss: 'carnicero', ceil: 14, music: 3, torch: [3.9, 1.15, 0.3], flame: [1, 0.5, 0.12], damp: 0 },
    { id: 'jardin', name: 'EL JARDÍN FÚNGICO', sub: 'Hongos que brillan y esporas venenosas', tint: [0.8, 0.9, 0.95], floor: [0.75, 0.85, 0.8], fog: [0.01, 0.016, 0.02], hazard: 'spores', boss: 'reina', ceil: 13, music: 4, torch: [1.5, 2.6, 2.0], flame: [0.5, 1, 0.8], damp: 0.8 },
    { id: 'vacio', name: 'EL VACÍO', sub: 'Un lugar que no debería existir', tint: [0.75, 0.65, 1.05], floor: [0.7, 0.6, 1], fog: [0.012, 0.004, 0.024], hazard: 'void', boss: 'guardian', ceil: 16, music: 5, secret: true, torch: [2.2, 1.0, 3.3], flame: [0.75, 0.4, 1], damp: 0.2 },
    // modo Horda (no aparece en la mazmorra)
    { id: 'ciudad', name: 'CIUDAD NOCTURNA', sub: 'La ciudad ya no duerme', tint: [1, 1, 1], floor: [1, 1, 1], fog: [0.032, 0.037, 0.055], hazard: null, boss: 'coloso', ceil: 17, music: 6, horde: true, torch: [3.2, 1.9, 0.8], flame: [1, 0.7, 0.3], damp: 0.55, ambient: [0.021, 0.023, 0.036], fogNear: 6, fogFar: 44, fogEvent: [1.2, 10], moon: { d: [0.45, 0.72, -0.53], c: [0.13, 0.15, 0.23] }, centerDark: { r0: 20, r1: 46, k: 0.4 } },
    { id: 'coliseo', name: 'COLISEO', sub: 'La arena vuelve a llenarse', tint: [1.15, 0.98, 0.82], floor: [1.1, 0.95, 0.8], fog: [0.07, 0.04, 0.045], hazard: null, boss: 'coloso', ceil: 17, music: 7, horde: true, torch: [3.4, 1.7, 0.55], flame: [1, 0.6, 0.2], damp: 0, ambient: [0.05, 0.037, 0.04], fogNear: 8, fogFar: 50, fogEvent: [1.5, 11], moon: { d: [-0.75, 0.42, 0.5], c: [0.3, 0.15, 0.09] } },
    { id: 'base', name: 'BASE MILITAR', sub: 'La última línea de defensa cayó', tint: [0.95, 1, 0.95], floor: [1, 1, 1], fog: [0.02, 0.025, 0.03], hazard: null, boss: 'coloso', ceil: 17, music: 8, horde: true, torch: [3.2, 3.0, 2.5], flame: [1, 0.65, 0.25], damp: 0.35, ambient: [0.042, 0.046, 0.048], fogNear: 7, fogFar: 46, fogEvent: [1.3, 10], moon: { d: [-0.4, 0.75, 0.52], c: [0.21, 0.24, 0.29] } },
    { id: 'barco', name: 'EL BARCO', sub: 'No hay a dónde huir en alta mar', tint: [0.92, 0.98, 1.05], floor: [1, 1, 1], fog: [0.04, 0.046, 0.056], hazard: null, boss: 'coloso', ceil: 17, music: 9, horde: true, torch: [3, 2.8, 2.2], flame: [1, 0.65, 0.25], damp: 1, ambient: [0.038, 0.044, 0.056], fogNear: 5, fogFar: 40, fogEvent: [1.2, 9], moon: { d: [0.3, 0.6, 0.74], c: [0.18, 0.21, 0.28] } },
  ];

  // Charcos peligrosos: color, brillo, luz y daño
  VX.POOLS = {
    lava: { c: [1, 0.32, 0.04], e: 0.9, light: [2.4, 0.9, 0.15], pdmg: 16, edps: 40, burn: true, knock: 5, part: [1, 0.45, 0.08] },
    acid: { c: [0.25, 0.85, 0.2], e: 0.55, light: [0.5, 1.6, 0.3], pdmg: 9, edps: 22, part: [0.35, 0.95, 0.25] },
    spores: { c: [0.55, 0.3, 0.75], e: 0.5, light: [1, 0.4, 1.4], pdmg: 7, edps: 18, poison: true, part: [0.75, 0.45, 1] },
    water: { c: [0.07, 0.12, 0.14], e: 0, shiny: true, light: null, pdmg: 0, edps: 0, water: true, part: [0.6, 0.7, 0.75] },
    void: { c: [0.18, 0.04, 0.32], e: 0.75, light: [0.9, 0.2, 1.8], pdmg: 13, edps: 30, part: [0.6, 0.2, 1] },
  };

  const Pool = {};

  Pool.start = [{
    name: 'Entrada a la mazmorra', w: [24, 24], d: [22, 22],
    build(r) {
      crate(r, 3, 6, 2, 2); crate(r, 3, 9, 2, 1); crate(r, 5, 6, 1, 1);
      crate(r, r.w - 6, 11, 2, 3);
      pillar(r, 6, 13, 2, r.h - 2); pillar(r, r.w - 8, 5, 2, r.h - 2);
    },
  }];

  Pool.normal = [
    {
      name: 'Columnata', relief: maybeRelief(0.3, 3), w: [46, 58], d: [46, 60],
      build(r) {
        const step = M.choice([8, 9, 10]);
        for (let x = 6; x < r.w - 6; x += step)
          for (let z = 7; z < r.d - 7; z += step) column(r, x, z, 2, Math.random() < 0.15);
        if (Math.random() < 0.5) scatterBarrels(r, 3);
      },
    },
    {
      name: 'Almacén abandonado', relief: maybeRelief(0.3, 3), w: [44, 56], d: [46, 58],
      build(r) {
        const n = Math.floor(area(r) / 90);
        for (let i = 0; i < n; i++) {
          const s = M.choice([2, 2, 3]);
          const x = M.randInt(3, r.w - 6), z = M.randInt(4, r.d - 6);
          crate(r, x, z, s, M.randInt(2, 4));
          if (M.chance(0.4)) crate(r, x + s, z, 2, M.randInt(1, 2));
          if (M.chance(0.25)) crate(r, x, z, s - 1, M.randInt(4, 5));
        }
        scatterBarrels(r, M.randInt(2, 4), 0.5);
        // estanterías
        for (let i = 0; i < 3; i++) {
          const z = M.randInt(8, r.d - 10), x = M.randInt(4, r.w - 14), rot = M.choice([0, 2]);
          for (let k = 0; k < 4; k++) r.queue('shelf', r.uX(x) + 0.5 + k, r.uZ(z) + 0.2, { rot });
        }
        for (let i = 0; i < 4; i++) r.queue('sack', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)));
      },
    },
    {
      name: 'Templo en ruinas', relief: maybeRelief(0.25, 3), w: [48, 60], d: [50, 62],
      build(r) {
        // columnata de dos filas: muchas columnas partidas y sus tambores tirados por el suelo
        const xs = [Math.round(r.w / 3), Math.round(r.w * 2 / 3) - 2];
        for (const ux of xs)
          for (let uz = 8; uz < r.d - 8; uz += 6) {
            const broken = Math.random() < 0.5;
            column(r, ux, uz, 2, broken);
            if (broken && Math.random() < 0.7) r.queue('fallen', r.uX(ux + (ux < r.w / 2 ? -3 : 5)), r.uZ(uz) + 0.5, { rot: M.choice([0, 1]) });
          }
        // estatuas al fondo y algún muro derruido
        r.queue('statue', r.centerX(), r.uZ(r.d - 7), { rot: 2 });
        if (Math.random() < 0.6) r.queue('statue', r.centerX(), r.uZ(9), { rot: 0 });
        for (let i = 0; i < 2; i++) ruinWall(r, M.randInt(4, r.w - 10), M.randInt(6, r.d - 10), M.randInt(4, 7), M.chance(0.5), M.randInt(2, 4), BL().STONE);
      },
    },
    {
      name: 'Barricadas', w: [44, 54], d: [52, 64],
      build(r) {
        // filas de barricadas de estacas con sacos y cajas; siempre quedan huecos para pasar
        for (let uz = 9; uz < r.d - 9; uz += 8) {
          const gap = M.randInt(4, r.w - 8);
          for (let ux = 4; ux < r.w - 6; ux += 4) {
            if (Math.abs(ux - gap) < 4) continue;
            const roll = Math.random();
            if (roll < 0.6) r.queue('barricade', r.uX(ux) + 0.95, r.uZ(uz), { rot: 0 });
            else if (roll < 0.8) { r.queue('sack', r.uX(ux) + 0.4, r.uZ(uz)); r.queue('sack', r.uX(ux) + 1.1, r.uZ(uz)); }
            else crate(r, ux, uz - 1, 2, 2);
          }
        }
        scatterBarrels(r, 2, 0.4);
      },
    },
    {
      name: 'Claustro', w: [50, 58], d: [50, 58],
      build(r) {
        const cx = Math.floor(r.w / 2), cz = Math.floor(r.d / 2);
        // fuente en el centro
        r.queue('fountain', r.uX(cx), r.uZ(cz), { rot: 0 });
        // arcada cuadrada alrededor del patio
        const R = 11;
        for (let a = -R; a <= R; a += 5.5) {
          const o = Math.round(a);
          for (const [ux, uz] of [[cx + o, cz - R], [cx + o, cz + R], [cx - R, cz + o], [cx + R, cz + o]]) column(r, ux, uz, 2, Math.random() < 0.12);
        }
        // árboles secos en parterres de piedra
        for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
          const ux = cx + dx, uz = cz + dz;
          for (let x = (ux - 2) * 2; x < (ux + 2) * 2; x++)
            for (let z = (uz - 2) * 2; z < (uz + 2) * 2; z++)
              if (x === (ux - 2) * 2 || x === (ux + 2) * 2 - 1 || z === (uz - 2) * 2 || z === (uz + 2) * 2 - 1) r.set(x, 0, z, BL().STONE);
          r.queue('tree', r.uX(ux), r.uZ(uz), { margin: 2 });
        }
      },
    },
    {
      name: 'Cripta', relief: maybeRelief(0.3, 3), w: [44, 56], d: [48, 60],
      build(r) {
        // sarcófagos con velas y filas de lápidas
        for (let z = 8; z < r.d - 9; z += 7) {
          for (let x = 5; x < r.w - 7; x += 8) {
            if (M.chance(0.2)) continue;
            r.queue('sarcophagus', r.uX(x) + 0.5, r.uZ(z) + 1, { rot: 0 });
            if (M.chance(0.6)) r.queue('candles', r.uX(x) + 0.5, r.uZ(z) - 0.25, {});
            for (let t = 0; t < 2; t++) if (M.chance(0.7)) r.queue('tomb', r.uX(x + 3) + t * 0.9, r.uZ(z) + 1, { rot: 0 });
          }
        }
        for (let i = 0; i < 8; i++) r.queue(M.chance(0.5) ? 'bones' : 'skull', r.uX(M.randInt(3, r.w - 4)), r.uZ(M.randInt(4, r.d - 5)), {});
        brazier(r, 4, Math.floor(r.d / 2)); brazier(r, r.w - 6, Math.floor(r.d / 2));
      },
    },
    {
      name: 'Pozo central', w: [48, 56], d: [48, 56],
      build(r) {
        const cx = r.w / 2, cz = Math.floor(r.d / 2);
        for (let x = cx - 6; x <= cx + 5; x++)
          for (let z = cz - 6; z <= cz + 5; z++) {
            const edge = x === cx - 6 || x === cx + 5 || z === cz - 6 || z === cz + 5;
            if (edge) r.box(x, 0, z, x, 1, z, BL().STONE);
          }
        crate(r, 4, 6, 2, 3); crate(r, r.w - 6, 6, 2, 2);
        crate(r, 4, r.d - 8, 3, 2); crate(r, r.w - 7, r.d - 8, 2, 3);
        for (const [x, z] of [[cx - 12, cz - 12], [cx + 10, cz - 12], [cx - 12, cz + 10], [cx + 10, cz + 10]]) pillar(r, x, z, 2, r.h - 2);
      },
    },
    {
      name: 'Sala de las púas', w: [46, 56], d: [50, 60],
      build(r) {
        for (let uz = 8; uz < r.d - 9; uz += 9) {
          const gap = M.randInt(4, r.w - 9);
          if (gap > 5) r.addSpikes(3, uz, gap - 1, uz + 2);
          if (gap + 4 < r.w - 4) r.addSpikes(gap + 4, uz, r.w - 4, uz + 2);
        }
        brazier(r, 4, 4); brazier(r, r.w - 6, 4); brazier(r, 4, r.d - 6); brazier(r, r.w - 6, r.d - 6);
        scatterBarrels(r, 2, 0.8);
      },
    },
    {
      name: 'Polvorín', w: [44, 54], d: [46, 56], relief: maybeRelief(0.2, 2),
      build(r) {
        for (let g = 0; g < 6; g++) {
          const ux = M.randInt(5, r.w - 7), uz = M.randInt(6, r.d - 8);
          barrel(r, ux, uz, true); barrel(r, ux + 1, uz, true); barrel(r, ux, uz + 1, true);
          if (Math.random() < 0.5) barrel(r, ux + 1, uz + 1, true, 2);
        }
        for (let i = 0; i < 6; i++) crate(r, M.randInt(3, r.w - 5), M.randInt(5, r.d - 6), 2, M.randInt(1, 3));
        brazier(r, Math.floor(r.w / 2) - 1, Math.floor(r.d / 2));
      },
    },
    {
      name: 'Bodega', w: [44, 52], d: [48, 58],
      build(r) {
        for (let uz = 8; uz < r.d - 8; uz += 7) {
          for (let ux = 5; ux < r.w - 5; ux++) {
            if (Math.abs(ux - r.w / 2) < 4) continue;
            if (Math.random() < 0.8) barrel(r, ux, uz, Math.random() < 0.12, Math.random() < 0.4 ? 2 : 1);
          }
        }
        for (let uz = 6; uz < r.d - 6; uz += 4) r.queue('shelf', r.uX(3) + 0.25, r.uZ(uz), { rot: 3 });
        for (let i = 0; i < 3; i++) r.queue('table', r.uX(Math.floor(r.w / 2)), r.uZ(M.randInt(10, r.d - 10)), { rot: 0 });
        brazier(r, Math.floor(r.w / 2) - 1, 7);
      },
    },
    {
      name: 'Capilla', w: [40, 46], d: [52, 60], h: 16,
      build(r) {
        // orientada según la entrada: el altar siempre queda al fondo
        const F = localFrame(r);
        const ROT = { zn: 0, zp: 2, xn: 3, xp: 1 }[r.entrance || 'zn'];
        const ca = Math.floor(F.A / 2), back = F.Bd - 4;
        const at = (a, b) => { const [ux, uz] = F.T(a, b); return [r.uX(ux) + 0.25, r.uZ(uz) + 0.25]; };
        // dos filas de columnas gruesas
        for (let b = 8; b < back - 6; b += 8) for (const a of [ca - 8, ca + 6]) { const [ux, uz] = F.T(a, b); column(r, ux - 1, uz - 1, 3); }
        // alfombra por el pasillo central
        for (let b = 4; b < back - 4; b += 8) { const [x, z] = at(ca - 0.5, b + 4); r.queue('carpet', x, z, { rot: ROT % 2 ? 1 : 0, margin: 2 }); }
        // bancos a ambos lados del pasillo, mirando al altar
        for (let b = 9; b < back - 7; b += 3)
          for (const a of [ca - 5, ca + 3]) if (Math.random() < 0.9) { const [x, z] = at(a, b); r.queue('bench', x, z, { rot: (2 + ROT) % 4 }); }
        // altar con velas y una estatua detrás
        lbox(r, F, ca - 3, back - 2, ca + 2, back - 1, 0, 1, BL().STONE, true);
        { const [x, z] = at(ca - 2, back - 3); r.queue('candles', x, z, {}); }
        { const [x, z] = at(ca + 1, back - 3); r.queue('candles', x, z, {}); }
        { const [x, z] = at(ca - 0.5, back + 1); r.queue('statue', x, z, { rot: (ROT + 2) % 4, margin: 2 }); }
        { const p = F.T(ca - 6, back - 1); brazier(r, p[0], p[1]); }
        { const p = F.T(ca + 5, back - 1); brazier(r, p[0], p[1]); }
        r.wantWindows = true; r.wantChandeliers = 2;
      },
    },
    {
      name: 'Celdas', w: [46, 54], d: [50, 60],
      build(r) {
        for (let uz = 6; uz < r.d - 8; uz += 7) {
          for (const left of [true, false]) {
            const x0 = left ? 2 : r.w - 9, x1 = left ? 8 : r.w - 3;
            r.box(x0, 0, uz, x1, r.h - 3, uz, BL().BRICK);
            // barrotes de la celda (algunos rotos)
            const bx = left ? 8 : r.w - 9;
            for (let z = (uz + 1) * 2; z < (uz + 7) * 2; z++)
              for (let y = 0; y < 12; y++)
                if ((z % 2 === 0 || y % 4 === 3) && Math.random() > 0.1 && !r.isReservedU(bx, z >> 1)) for (let x = bx * 2; x < bx * 2 + 1; x++) if (!r.get(x, y, z)) r.set(x, y, z, BL().DOOR);
            r.queue('straw', r.uX(left ? 4 : r.w - 6), r.uZ(uz + 3), {});
            if (Math.random() < 0.6) r.queue(Math.random() < 0.5 ? 'bones' : 'skull', r.uX(left ? 5 : r.w - 5), r.uZ(uz + 2), {});
            else if (Math.random() < 0.5) barrel(r, left ? 4 : r.w - 6, uz + 3, Math.random() < 0.5);
          }
        }
        // abrir algunas celdas para que los zombis puedan salir
        for (let uz = 6; uz < r.d - 8; uz += 7) for (const bx of [8, r.w - 9]) if (Math.random() < 0.6) r.box(bx, 0, uz + 2, bx, 5, uz + 4, 0, true);
      },
    },
    {
      name: 'Matadero', w: [46, 56], d: [48, 58],
      build(r) {
        for (let i = 0; i < 7; i++) cage(r, M.randInt(4, r.w - 6), M.randInt(5, r.d - 7));
        r.addSpikes(Math.floor(r.w / 2) - 3, Math.floor(r.d / 2) - 3, Math.floor(r.w / 2) + 2, Math.floor(r.d / 2) + 2);
        for (let i = 0; i < 8; i++) r.queue('bones', r.uX(M.randInt(3, r.w - 4)), r.uZ(M.randInt(4, r.d - 5)), {});
        for (let i = 0; i < 3; i++) r.queue('table', r.uX(M.randInt(4, r.w - 6)), r.uZ(M.randInt(5, r.d - 6)), {});
        scatterBarrels(r, 3, 0.7);
        brazier(r, 5, Math.floor(r.d / 2)); brazier(r, r.w - 7, Math.floor(r.d / 2));
      },
    },
    {
      name: 'Foso', w: [50, 60], d: [50, 60],
      build(r) {
        for (let i = 0; i < 5; i++) crate(r, M.randInt(Math.floor(r.w / 2) - 5, Math.floor(r.w / 2) + 3), M.randInt(Math.floor(r.d / 2) - 5, Math.floor(r.d / 2) + 3), 2, M.randInt(1, 2));
      },
      relief(r) {
        const hv = M.randInt(3, 4), R0 = Math.min(r.W, r.D) * 0.2;
        for (let z = 4; z < r.D - 4; z++)
          for (let x = 4; x < r.W - 4; x++) {
            const d = Math.hypot(x - r.cx, z - r.cz);
            const h = Math.round(hv * M.smoothstep(R0, R0 + hv * 2.4, d) * r.doorMask(x, z));
            if (h > 0) r.terrainColumn(x, z, h);
          }
        // columnas sobre el borde del foso
        for (let a = 0; a < 6; a++) {
          const ang = a / 6 * Math.PI * 2 + 0.4;
          const ux = Math.round(r.cu + Math.cos(ang) * (R0 / 2 + hv * 1.6)), uz = Math.round(r.cuz + Math.sin(ang) * (R0 / 2 + hv * 1.6));
          if (!r.isReservedU(ux, uz)) for (let x = ux * 2; x < ux * 2 + 2; x++) for (let z = uz * 2; z < uz * 2 + 2; z++) for (let y = 0; y < r.H - 4; y++) if (!r.get(x, y, z)) r.set(x, y, z, BL().STONE);
        }
      },
    },
    {
      name: 'Colinas de huesos', w: [52, 62], d: [52, 62],
      build(r) {
        for (let i = 0; i < 16; i++) r.queue(M.chance(0.7) ? 'bones' : 'skull', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(4, r.d - 5)), {});
      },
      relief(r) { reliefNoise(r, M.randInt(4, 5), M.rand(20, 26), 0.32); },
    },
    {
      name: 'Cresta', w: [48, 58], d: [52, 62],
      build(r) {
        for (let i = 0; i < 4; i++) crate(r, M.randInt(4, r.w - 6), M.randInt(5, r.d - 7), 2, M.randInt(2, 3));
      },
      relief(r) {
        const hv = M.randInt(3, 4);
        const seed = M.randInt(0, 999);
        for (let z = 4; z < r.D - 4; z++)
          for (let x = 4; x < r.W - 4; x++) {
            const wob = (M.vnoise(x / 14, 0, seed) - 0.5) * 16;
            const ridge = 1 - M.smoothstep(3, 3 + hv * 2.4, Math.abs(z - r.cz - wob));
            const h = Math.round(hv * ridge * r.doorMask(x, z));
            if (h > 0) r.terrainColumn(x, z, h);
          }
      },
    },
    {
      name: 'Galería de arcos', w: [50, 58], d: [54, 64],
      build(r) {
        // muros transversales con arcos: se ve de sala en sala a través de ellos
        for (let uz = 10; uz < r.d - 10; uz += 9) archWall(r, 8, r.W - 9, uz * 2, 'x', M.chance(0.3) ? BL().MOSS : BL().BRICK, 16, 2, M.choice([14, 16, 18]), 8, 7);
        for (let i = 0; i < 4; i++) r.queue('statue', r.uX(M.randInt(5, r.w - 5)), r.uZ(M.randInt(6, r.d - 6)), { rot: M.randInt(0, 3) });
      },
    },
    {
      name: 'Biblioteca maldita', relief: maybeRelief(0.3, 3), w: [46, 54], d: [50, 60],
      build(r) {
        let rot = 0;
        for (let z = 8; z < r.d - 8; z += 9) {
          for (let x = 5; x + 2 <= Math.floor(r.w / 2) - 4; x += 2) r.queue('shelf', r.uX(x) + 0.5, r.uZ(z) + 0.2, { rot });
          for (let x = Math.floor(r.w / 2) + 4; x + 2 <= r.w - 5; x += 2) r.queue('shelf', r.uX(x) + 0.5, r.uZ(z) + 0.2, { rot });
          rot = 2 - rot;
        }
        for (let i = 0; i < 4; i++) r.queue('table', r.uX(M.randInt(4, r.w - 6)), r.uZ(M.randInt(5, r.d - 6)), {});
        for (let i = 0; i < 6; i++) r.queue('candles', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)), {});
      },
    },
    {
      name: 'Comedor de guardia', w: [44, 52], d: [50, 58],
      build(r) {
        // mesa larga con sillas a los lados y una chimenea al fondo
        const F = localFrame(r);
        const ROT = { zn: 0, zp: 2, xn: 3, xp: 1 }[r.entrance || 'zn'];
        const ca = Math.floor(F.A / 2), back = F.Bd - 3;
        const at = (a, b) => { const [ux, uz] = F.T(a, b); return [r.uX(ux) + 0.25, r.uZ(uz) + 0.25]; };
        for (const off of [-6, 5]) {
          for (let b = 10; b < back - 8; b += 2.25) {
            const [x, z] = at(ca + off, b);
            r.queue('table', x, z, { rot: ROT % 2 ? 0 : 1, margin: 2 });
            if (Math.random() < 0.4) r.queue(M.choice(['candles', 'skull', 'flasks']), x, z, { margin: 2, onTop: true });
            for (const side of [-1.6, 1.6]) if (Math.random() < 0.8) { const [cx, cz] = at(ca + off + side, b); r.queue('chair', cx, cz, { rot: (ROT + (side < 0 ? 3 : 1)) % 4, margin: 2 }); }
          }
        }
        { const [x, z] = at(ca - 0.5, back + 0.6); r.queue('fireplace', x, z, { rot: (ROT + 2) % 4, margin: 1 }); r.features.push({ kind: 'light', x, y: 0.6, z, r: 9, c: [1.3, 0.6, 0.18] }); }
        scatterBarrels(r, 2, 0.1);
      },
    },
    {
      name: 'Herrería', w: [44, 52], d: [46, 54],
      build(r) {
        // gran horno de forja, yunques y braseros
        const F = localFrame(r);
        const ROT = { zn: 0, zp: 2, xn: 3, xp: 1 }[r.entrance || 'zn'];
        const ca = Math.floor(F.A / 2), back = F.Bd - 3;
        const at = (a, b) => { const [ux, uz] = F.T(a, b); return [r.uX(ux) + 0.25, r.uZ(uz) + 0.25]; };
        { const [x, z] = at(ca - 0.5, back - 0.5); r.queue('furnace', x, z, { rot: (ROT + 2) % 4, margin: 1 }); r.features.push({ kind: 'light', x, y: 0.8, z, r: 11, c: [1.5, 0.55, 0.12] }); }
        for (let i = 0; i < 4; i++) { const [x, z] = at(ca + M.randInt(-9, 8), M.randInt(10, back - 6)); r.queue('anvil', x, z, { rot: M.randInt(0, 3) }); }
        for (let i = 0; i < 3; i++) { const [x, z] = at(ca + M.randInt(-10, 9), M.randInt(8, back - 4)); r.queue('table', x, z, {}); }
        for (const a of [ca - 8, ca + 7]) { const p = F.T(a, Math.floor(back / 2)); brazier(r, p[0], p[1]); }
        for (let i = 0; i < 2; i++) r.queue(Math.random() < 0.4 ? 'bigcrate' : 'crate', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)), { rot: 0 }, 1);
      },
    },
    {
      name: 'Puente del río', w: [46, 54], d: [44, 52],
      build(r) {
        // un río de lava (o de ácido en las cloacas) cruza la sala; se pasa por puentes de piedra
        const kind = { 1: 'acid', 4: 'spores', 5: 'void' }[r.zone || 0] || 'lava';
        const cz = Math.floor(r.d / 2) - 2;
        const bridges = [M.randInt(8, Math.floor(r.w / 2) - 5), M.randInt(Math.floor(r.w / 2) + 3, r.w - 11)];
        let x = 5;
        for (const bx of bridges) { if (bx - 1 > x) r.addSpikes(x, cz, bx - 1, cz + 3, kind); x = bx + 3; }
        if (r.w - 6 > x) r.addSpikes(x, cz, r.w - 6, cz + 3, kind);
        for (const bx of bridges) {
          // pretiles de piedra a ambos lados del puente
          for (let z = (cz - 1) * 2; z < (cz + 5) * 2; z++) for (const px of [bx * 2, (bx + 3) * 2 - 1]) for (let y = 0; y < 3; y++) if (!r.isReservedU(px >> 1, z >> 1)) r.set(px, y, z, BL().STONE);
        }
        for (let i = 0; i < 6; i++) column(r, M.choice([4, r.w - 6]), M.randInt(6, r.d - 8), 2, Math.random() < 0.3);
        r.name = { acid: 'Canal de ácido', spores: 'Río de esporas', void: 'Grieta del vacío', lava: 'Río de lava' }[kind];
      },
    },
    {
      name: 'Sala del trono', w: [44, 50], d: [54, 62],
      build(r) {
        const F = localFrame(r);
        const ROT = { zn: 0, zp: 2, xn: 3, xp: 1 }[r.entrance || 'zn'];
        const ca = Math.floor(F.A / 2), back = F.Bd - 4;
        const at = (a, b) => { const [ux, uz] = F.T(a, b); return [r.uX(ux) + 0.25, r.uZ(uz) + 0.25]; };
        // estrado escalonado con el trono
        lbox(r, F, ca - 5, back - 5, ca + 4, back, 0, 0, BL().STONE, true);
        lbox(r, F, ca - 3, back - 3, ca + 2, back, 1, 1, BL().STONE, true);
        { const [x, z] = at(ca - 0.5, back - 1); r.queue('throne', x, z, { rot: (ROT + 2) % 4, margin: 1 }); }
        for (const a of [ca - 5, ca + 4]) { const [x, z] = at(a, back - 6); r.queue('statue', x, z, { rot: (ROT + 2) % 4 }); }
        // alfombra hasta el trono, columnas a los lados
        for (let b = 4; b < back - 8; b += 8) { const [x, z] = at(ca - 0.5, b + 4); r.queue('carpet', x, z, { rot: ROT % 2 ? 1 : 0, margin: 2 }); }
        for (let b = 8; b < back - 6; b += 7) for (const a of [ca - 8, ca + 6]) { const [ux, uz] = F.T(a, b); column(r, ux - 1, uz - 1, 2); }
        for (const a of [ca - 7, ca + 6]) { const p = F.T(a, back - 2); brazier(r, p[0], p[1]); }
        r.wantChandeliers = 2;
      },
    },
    {
      name: 'Laboratorio del alquimista', w: [42, 50], d: [44, 52],
      build(r) {
        // calderos burbujeantes, mesas llenas de redomas y estanterías
        for (let i = 0; i < 3; i++) {
          const x = r.uX(M.randInt(8, r.w - 9)), z = r.uZ(M.randInt(9, r.d - 10));
          r.queue('cauldron', x, z, {});
          r.features.push({ kind: 'light', x, y: 0.8, z, r: 5, c: [0.35, 0.9, 0.25] });
        }
        for (let i = 0; i < 5; i++) {
          const x = r.uX(M.randInt(5, r.w - 6)), z = r.uZ(M.randInt(6, r.d - 7));
          r.queue('table', x, z, {});
          r.queue('flasks', x, z, { onTop: true, margin: 2 });
        }
        for (let i = 0; i < 6; i++) r.queue('acidpuddle', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)), {});
      },
    },
    // ================= Formas de sala =================
    {
      name: 'Salón en cruz', w: [50, 58], d: [50, 58],
      build(r) {
        // cuatro bloques macizos en las esquinas: queda una cruz de pasillos anchos
        const g = M.randInt(5, 6), cx = Math.floor(r.w / 2), cz = Math.floor(r.d / 2);
        for (const [x0, x1] of [[2, cx - g], [cx + g, r.w - 3]])
          for (const [z0, z1] of [[2, cz - g], [cz + g, r.d - 3]]) solidBlock(r, x0, z0, x1, z1);
        column(r, cx - 1, cz - 1, 2);
      },
    },
    {
      name: 'Sala en U', w: [48, 56], d: [50, 58],
      build(r) {
        // un gran bloque pegado a una pared sin puerta: hay que rodearlo
        const free = ['zp', 'xp', 'xn', 'zn'].filter((s) => !r.doors[s]);
        const s = free[0];
        const W = r.w, D = r.d;
        if (s === 'zp') solidBlock(r, Math.round(W * 0.3), Math.round(D * 0.4), Math.round(W * 0.7), D - 3);
        else if (s === 'zn') solidBlock(r, Math.round(W * 0.3), 2, Math.round(W * 0.7), Math.round(D * 0.6));
        else if (s === 'xp') solidBlock(r, Math.round(W * 0.4), Math.round(D * 0.3), W - 3, Math.round(D * 0.7));
        else if (s === 'xn') solidBlock(r, 2, Math.round(D * 0.3), Math.round(W * 0.6), Math.round(D * 0.7));
        else { for (let i = 0; i < 4; i++) column(r, M.randInt(8, W - 10), M.randInt(8, D - 10), 3); }
        r.queue('statue', r.centerX(), r.centerZ(), {});
      },
    },
    {
      name: 'Sala en zigzag', w: [48, 56], d: [54, 64],
      build(r) {
        // dos muros que salen de lados opuestos: el camino serpentea en forma de N
        const W = r.w, D = r.d;
        solidBlock(r, 2, Math.round(D * 0.28), Math.round(W * 0.62), Math.round(D * 0.4));
        solidBlock(r, Math.round(W * 0.38), Math.round(D * 0.6), W - 3, Math.round(D * 0.72));
        scatterBarrels(r, 2, 0.4);
      },
    },
    {
      name: 'Pasillo largo', w: [16, 20], d: [72, 90],
      build(r) {
        // galería estrecha y muy larga con columnas y hornacinas a los lados
        for (let uz = 8; uz < r.d - 8; uz += 7) {
          column(r, 3, uz, 2, Math.random() < 0.15); column(r, r.w - 5, uz, 2, Math.random() < 0.15);
        }
        for (let i = 0; i < 4; i++) r.queue(M.choice(['urn', 'statue', 'bones']), r.uX(M.choice([6, r.w - 7])), r.uZ(M.randInt(8, r.d - 8)), {});
      },
    },
    {
      name: 'Galería con balcón', w: [48, 56], d: [50, 60], h: 15,
      build(r) {
        // pasarelas elevadas (un "segundo piso") en las paredes sin puerta, con escaleras y barandilla
        const H = 6;   // 1,5 m
        const sides = ['xn', 'xp', 'zp'].filter((s) => !r.doors[s]);
        for (const s of sides.slice(0, 2)) {
          const along = s === 'zp' ? 'x' : 'z';
          const len = along === 'z' ? r.d : r.w;
          const a0 = 6, a1 = len - 7;
          for (let a = a0; a <= a1; a++)
            for (let t = 2; t < 7; t++) {
              // escaleras en los extremos
              const fromEnd = Math.min(a - a0, a1 - a);
              const h = fromEnd < 3 ? (fromEnd + 1) * 2 : H;
              const [ux, uz] = along === 'z' ? [s === 'xn' ? t : r.w - 1 - t, a] : [a, r.d - 1 - t];
              if (r.isReservedU(ux, uz)) continue;
              for (let x = ux * 2; x < ux * 2 + 2; x++) for (let z = uz * 2; z < uz * 2 + 2; z++)
                for (let y = 0; y < h; y++) if (!r.get(x, y, z)) r.set(x, y, z, y === h - 1 ? BL().PLANK : BL().STONE);
              // barandilla en el borde de la pasarela
              if (t === 6 && h === H && a % 2 === 0) {
                for (let x = ux * 2; x < ux * 2 + 2; x++) for (let z = uz * 2; z < uz * 2 + 2; z++) {
                  const edge = along === 'z' ? (s === 'xn' ? x === ux * 2 + 1 : x === ux * 2) : z === uz * 2;
                  if (edge) for (let y = H; y < H + 3; y++) if (!r.get(x, y, z)) r.set(x, y, z, y === H + 2 ? BL().PLANK : BL().IRON);
                }
              }
            }
        }
        for (let i = 0; i < 4; i++) column(r, M.randInt(12, r.w - 13), M.randInt(12, r.d - 13), 2);
        r.wantChandeliers = 2;
      },
    },

    // ================= Minas =================
    {
      name: 'Galería minera', w: [40, 48], d: [56, 68], h: 12,
      build(r) {
        // raíles con vagonetas y entibado de madera cada pocos metros
        const xs = [Math.round(r.w * 0.35), Math.round(r.w * 0.65)];
        for (const ux of xs) for (let uz = 3; uz < r.d - 6; uz += 8) r.queue('rails', r.uX(ux) + 0.5, r.uZ(uz) + 2, { rot: 0, margin: 2 });
        for (let i = 0; i < 3; i++) r.queue('cart', r.uX(M.choice(xs)) + 0.5, r.uZ(M.randInt(8, r.d - 9)), { rot: 0, margin: 2 });
        r.wantMineFrames = true;
        for (let i = 0; i < 4; i++) r.queue('crystal', r.uX(M.choice([4, r.w - 5])), r.uZ(M.randInt(6, r.d - 6)), {});
        for (let i = 0; i < 5; i++) r.queue('rubble', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(6, r.d - 6)), {});
        scatterBarrels(r, 2, 0.6);
      },
    },
    {
      name: 'Veta de cristal', relief: maybeRelief(0.8, 3), w: [46, 54], d: [46, 56],
      build(r) {
        // caverna con racimos de cristales que iluminan la roca
        for (let i = 0; i < 9; i++) {
          const x = r.uX(M.randInt(5, r.w - 6)), z = r.uZ(M.randInt(6, r.d - 7));
          r.queue('crystal', x, z, {});
          if (i < 4) r.features.push({ kind: 'light', x, y: 0.8, z, r: 6, c: M.choice([[0.3, 0.6, 1.2], [0.8, 0.35, 1.2]]) });
        }
        for (let i = 0; i < 4; i++) column(r, M.randInt(6, r.w - 8), M.randInt(7, r.d - 9), 2, true);
      },
    },

    // ================= Jardín fúngico =================
    {
      name: 'Bosque de hongos', w: [48, 56], d: [50, 60], h: 14,
      build(r) {
        // setas gigantes que brillan; bajo sus sombreros se puede pasar
        for (let i = 0; i < 8; i++) {
          const x = r.uX(M.randInt(6, r.w - 7)), z = r.uZ(M.randInt(7, r.d - 8));
          r.queue('mushroom', x, z, { rot: M.randInt(0, 3) });
          if (i < 4) r.features.push({ kind: 'light', x, y: 2.3, z, r: 7, c: M.choice([[0.4, 0.9, 1], [0.9, 0.4, 1]]) });
        }
        for (let i = 0; i < 14; i++) r.queue('shrooms', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)), {});
      },
    },
    {
      name: 'Cueva de esporas', relief: maybeRelief(0.9, 3), w: [44, 52], d: [46, 56],
      build(r) {
        for (let i = 0; i < 3; i++) { const x = M.randInt(6, r.w - 10), z = M.randInt(8, r.d - 12); r.addSpikes(x, z, x + M.randInt(2, 3), z + M.randInt(2, 3), 'spores'); }
        for (let i = 0; i < 3; i++) { const x = r.uX(M.randInt(8, r.w - 9)), z = r.uZ(M.randInt(8, r.d - 9)); r.queue('mushroom', x, z, {}); }
        for (let i = 0; i < 18; i++) r.queue('shrooms', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(5, r.d - 6)), {});
        for (let i = 0; i < 4; i++) r.features.push({ kind: 'light', x: r.uX(M.randInt(6, r.w - 6)), y: 0.4, z: r.uZ(M.randInt(6, r.d - 6)), r: 5, c: [0.6, 0.3, 1] });
      },
    },

    // ================= El gran árbol (varios biomas) =================
    {
      name: 'El gran árbol', w: [50, 58], d: [52, 62], h: 18, lit: true,
      build(r) {
        bigTree(r, Math.floor(r.W / 2) + M.randInt(-6, 6), Math.floor(r.D / 2) + M.randInt(-4, 6));
      },
    },

    // ================= El Vacío (secreto) =================
    {
      name: 'Santuario del vacío', w: [48, 56], d: [50, 60], h: 16,
      build(r) {
        // columnas rotas, estatuas y cristales violetas sobre charcos de vacío
        for (let i = 0; i < 6; i++) column(r, M.randInt(6, r.w - 8), M.randInt(7, r.d - 9), 2, Math.random() < 0.6);
        for (let i = 0; i < 6; i++) {
          const x = r.uX(M.randInt(5, r.w - 6)), z = r.uZ(M.randInt(6, r.d - 7));
          r.queue('crystal', x, z, { v: 1 });
          if (i < 3) r.features.push({ kind: 'light', x, y: 0.9, z, r: 7, c: [0.8, 0.3, 1.4] });
        }
        r.queue('statue', r.centerX(), r.uZ(r.d - 7), { rot: 2 });
      },
    },
  ];

  // Bloque macizo de muro a toda altura (unidades); respeta los pasos de las puertas
  // Árbol gigante en vóxeles: raíces por el suelo, tronco hasta el techo y copa.
  // Según el bioma: muerto y pálido (Cripta), vivo con hojas que brillan (Jardín),
  // raíces petrificadas (Minas) o cristalizado (Vacío).
  function bigTree(r, cx, cz) {
    const B = BL(), z = r.zone || 0;
    const kind = z === 4 ? 'glow' : z === 0 ? 'dead' : z === 5 ? 'crystal' : z === 2 ? 'stone' : 'live';
    const wood = { glow: B.BARK, dead: B.DEADWOOD, crystal: B.CRYSTWOOD, stone: B.TERRAIN, live: B.BARK }[kind];
    const leaf = { glow: B.GLOWLEAF, live: B.LEAF }[kind] || 0;
    const top = r.H - 4;
    const free = (x, y, zz) => r.inBounds(x, y, zz) && x >= 4 && zz >= 4 && x < r.W - 4 && zz < r.D - 4 && !r.isReservedU(x >> 1, zz >> 1);
    const put = (x, y, zz, t) => { if (free(x, y, zz) && !r.get(x, y, zz)) r.set(x, y, zz, t); };
    // tronco: sección irregular que se ensancha abajo y se retuerce al subir
    const R0 = M.randInt(5, 6);
    let ox = 0, oz = 0;
    const tw = M.rand(0, 6.28);
    for (let y = 0; y < top; y++) {
      const flare = y < 6 ? (6 - y) * 0.55 : 0;
      const rad = R0 + flare - (y / top) * 1.5;
      ox = Math.sin(y * 0.09 + tw) * 2.2; oz = Math.cos(y * 0.07 + tw) * 1.6;
      for (let dx = -10; dx <= 10; dx++) for (let dz = -10; dz <= 10; dz++) {
        const a = Math.atan2(dz, dx);
        const rr = rad * (1 + Math.sin(a * 5 + y * 0.15) * 0.12);   // surcos de la corteza
        if (dx * dx + dz * dz <= rr * rr) put(Math.round(cx + ox + dx), y, Math.round(cz + oz + dz), wood);
      }
    }
    // raíces: serpentean por el suelo y se hunden poco a poco
    const nRoots = M.randInt(6, 9);
    for (let i = 0; i < nRoots; i++) {
      let a = (i / nRoots) * 6.283 + M.rand(-0.3, 0.3), x = cx, zz = cz;
      const len = M.randInt(12, 26);
      for (let s = 0; s < len; s++) {
        a += M.rand(-0.25, 0.25);
        x += Math.cos(a); zz += Math.sin(a);
        const k = 1 - s / len, th = Math.max(1, Math.round(1 + k * 2.2)), h = Math.max(1, Math.round(k * 3.2));
        for (let dx = -th; dx <= th; dx++) for (let dz = -th; dz <= th; dz++) {
          if (dx * dx + dz * dz > th * th + 0.5) continue;
          for (let y = 0; y < h; y++) put(Math.round(x + dx), y, Math.round(zz + dz), wood);
        }
      }
    }
    // ramas: salen de la parte alta, suben en diagonal y terminan en copas
    const nBr = M.randInt(5, 7), tips = [];
    for (let i = 0; i < nBr; i++) {
      const a = (i / nBr) * 6.283 + M.rand(-0.4, 0.4);
      let y = Math.floor(top * M.rand(0.45, 0.7)), x = cx + ox, zz = cz + oz;
      const len = M.randInt(14, 22);
      for (let s = 0; s < len; s++) {
        x += Math.cos(a) * 0.9; zz += Math.sin(a) * 0.9;
        if (s % 2 === 0 && y < top - 4) y++;
        const th = s < len * 0.5 ? 2 : 1;
        for (let dx = -th; dx <= th; dx++) for (let dy = -th; dy <= th; dy++) for (let dz = -th; dz <= th; dz++)
          if (dx * dx + dy * dy + dz * dz <= th * th + 0.3) put(Math.round(x + dx), y + dy, Math.round(zz + dz), wood);
      }
      tips.push([Math.round(x), y, Math.round(zz)]);
    }
    // copa
    if (leaf) {
      for (const [tx, ty, tz] of tips.concat([[Math.round(cx + ox), top - 4, Math.round(cz + oz)]])) {
        const R = M.randInt(8, 11);
        for (let dx = -R; dx <= R; dx++) for (let dy = -4; dy <= 5; dy++) for (let dz = -R; dz <= R; dz++) {
          const d = (dx * dx + dz * dz) / (R * R) + (dy * dy) / 25;
          if (d > 1 || Math.random() < 0.25 + d * 0.3) continue;
          put(tx + dx, Math.min(top - 1, ty + dy), tz + dz, leaf);
        }
        // hojas que cuelgan
        for (let k = 0; k < 12; k++) {
          const hx = tx + M.randInt(-R + 2, R - 2), hz = tz + M.randInt(-R + 2, R - 2), L = M.randInt(3, 9);
          for (let y = ty - 4; y > ty - 4 - L; y--) put(hx, y, hz, leaf);
        }
      }
      r.features.push({ kind: 'light', x: r.worldX(cx), y: (top - 5) * VX.S, z: r.worldZ(cz), r: 14, c: kind === 'glow' ? [0.35, 1, 0.8] : [0.6, 0.8, 0.5] });
    } else if (kind === 'crystal') {
      for (const [tx, ty, tz] of tips) {
        for (let y = 0; y < 4; y++) put(tx, ty + y, tz, B.CRYSTAL);
        r.features.push({ kind: 'light', x: r.worldX(tx), y: ty * VX.S, z: r.worldZ(tz), r: 8, c: [0.8, 0.3, 1.4] });
      }
    } else if (kind === 'dead') {
      // del árbol muerto cuelgan jaulas y cadenas
      for (const [tx, ty, tz] of tips.slice(0, 3)) {
        for (let y = ty - 1; y > ty - 7; y--) put(tx, y, tz, B.IRON);
        r.features.push({ kind: 'light', x: r.worldX(tx), y: (ty - 8) * VX.S, z: r.worldZ(tz), r: 6, c: [1, 0.6, 0.25] });
        for (let y = ty - 11; y < ty - 7; y++) for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(tx + dx, y, tz + dz, B.IRON);
      }
    }
  }

  function solidBlock(r, ux0, uz0, ux1, uz1) {
    r.box(Math.min(ux0, ux1), 0, Math.min(uz0, uz1), Math.max(ux0, ux1), r.h - 3, Math.max(uz0, uz1), BL().BRICK);
    // zócalo de sillares
    r.box(Math.min(ux0, ux1), 0, Math.min(uz0, uz1), Math.max(ux0, ux1), 0, Math.max(uz0, uz1), BL().STONE);
  }

  // Qué salas pueden salir en cada bioma (0 cripta, 1 cloacas, 2 minas, 3 forja, 4 jardín, 5 vacío)
  const BIOMES = {
    'Columnata': [0, 4, 5], 'Almacén abandonado': [1, 2, 3], 'Templo en ruinas': [0, 4, 5], 'Barricadas': [1, 2, 3],
    'Claustro': [0, 4], 'Cripta': [0], 'Pozo central': [1, 2], 'Sala de las púas': [0, 3], 'Polvorín': [2, 3],
    'Bodega': [1, 2], 'Capilla': [0, 5], 'Celdas': [0, 1], 'Matadero': [1, 3], 'Foso': [2, 4], 'Colinas de huesos': [0, 4],
    'Cresta': [2, 4], 'Galería de arcos': [0, 1, 5], 'Biblioteca maldita': [0, 5], 'Comedor de guardia': [1, 2, 3],
    'Herrería': [2, 3], 'Puente del río': [1, 3, 4, 5], 'Sala del trono': [0, 3, 5], 'Laboratorio del alquimista': [1, 4],
    'Salón en cruz': [0, 1, 2, 3, 4, 5], 'Sala en U': [0, 1, 2, 3, 4, 5], 'Sala en zigzag': [0, 1, 2, 3, 4, 5],
    'Pasillo largo': [0, 1, 2, 3, 4, 5], 'Galería con balcón': [0, 1, 3, 5],
    'Galería minera': [2], 'Veta de cristal': [2, 5], 'Bosque de hongos': [4], 'Cueva de esporas': [4], 'Santuario del vacío': [5],
    'El gran árbol': [0, 1, 2, 4, 5],
  };

  // La tienda se construye en un marco local: 'a' = a lo ancho (izq→der visto desde la entrada),
  // 'b' = profundidad desde la entrada. Así el vendedor siempre está de frente al entrar.
  function localFrame(r) {
    const e = r.entrance || 'zn';
    if (e === 'zn') return { A: r.w, Bd: r.d, T: (a, b) => [a, b] };
    if (e === 'zp') return { A: r.w, Bd: r.d, T: (a, b) => [r.w - 1 - a, r.d - 1 - b] };
    if (e === 'xn') return { A: r.d, Bd: r.w, T: (a, b) => [b, r.d - 1 - a] };
    return { A: r.d, Bd: r.w, T: (a, b) => [r.w - 1 - b, a] };
  }
  function lbox(r, F, a0, b0, a1, b1, y0, y1, t, ig) {
    for (let a = Math.min(a0, a1); a <= Math.max(a0, a1); a++)
      for (let b = Math.min(b0, b1); b <= Math.max(b0, b1); b++) {
        const [ux, uz] = F.T(a, b);
        r.box(ux, y0, uz, ux, y1, uz, t, ig);
      }
  }
  // centro (en metros) de un bloque local de unidades [a0..a1]x[b0..b1]
  function lcenter(r, F, a0, b0, a1, b1) {
    const p = F.T(a0, b0), q = F.T(a1, b1);
    return { x: r.uX((Math.min(p[0], q[0]) + Math.max(p[0], q[0]) + 1) / 2), z: r.uZ((Math.min(p[1], q[1]) + Math.max(p[1], q[1]) + 1) / 2) };
  }

  Pool.shop = [{
    name: 'Tienda del vendedor', w: [30, 34], d: [30, 34],
    build(r) {
      const F = localFrame(r);
      const ca = Math.floor(F.A / 2), back = F.Bd - 3;
      // mostrador al fondo, de cara a la entrada
      lbox(r, F, ca - 6, back - 4, ca + 5, back - 4, 0, 1, BL().METAL, true);
      lbox(r, F, ca - 7, back - 4, ca - 7, back - 1, 0, 1, BL().GOLDB, true);
      lbox(r, F, ca + 6, back - 4, ca + 6, back - 1, 0, 1, BL().GOLDB, true);
      lbox(r, F, ca - 5, back, ca + 4, back, 0, 5, BL().PLANK, true);           // estantería
      const v = lcenter(r, F, ca - 1, back - 2, ca, back - 2);
      r.features.push({ kind: 'vendor', x: v.x, z: v.z });
      [-6, 0, 6].forEach((da, i) => {
        const a = ca + da - 1, b = back - 10;
        lbox(r, F, a, b, a + 1, b + 1, 0, 1, BL().METAL, true);
        const c = lcenter(r, F, a, b, a + 1, b + 1);
        r.features.push({ kind: 'shopSlot', slot: i, x: c.x, z: c.z, y: 1.0 });
      });
      const L = lcenter(r, F, ca, back - 6, ca, back - 6);
      r.features.push({ kind: 'light', x: L.x, y: 2.4, z: L.z, r: 10, c: [1.0, 0.75, 0.35] });
      const [bx1, bz1] = F.T(3, back - 2), [bx2, bz2] = F.T(F.A - 5, back - 2);
      brazier(r, bx1, bz1); brazier(r, bx2, bz2);
    },
  }];

  Pool.reward = [
    {
      name: 'Santuario', w: [28, 32], d: [28, 32],
      build(r) {
        const cx = r.w / 2, cz = Math.floor(r.d / 2);
        r.box(cx - 1, 0, cz - 1, cx, 1, cz, BL().METAL, true);
        r.features.push({ kind: 'reward', x: r.centerX(), z: r.uZ(cz), y: 1.0 });
        for (const [x, z] of [[5, 5], [r.w - 7, 5], [5, r.d - 7], [r.w - 7, r.d - 7]]) pillar(r, x, z, 2, r.h - 3);
      },
    },
    {
      name: 'Altar musgoso', w: [28, 34], d: [28, 34],
      build(r) {
        const cx = r.w / 2, cz = Math.floor(r.d / 2);
        r.box(cx - 3, 0, cz - 3, cx + 2, 0, cz + 2, BL().MOSS, true);
        r.box(cx - 1, 1, cz - 1, cx, 1, cz, BL().METAL, true);
        r.features.push({ kind: 'reward', x: r.centerX(), z: r.uZ(cz), y: 1.0 });
        for (let i = 0; i < 6; i++) ruinWall(r, M.randInt(3, r.w - 8), M.randInt(4, r.d - 8), 4, M.chance(0.5), 3, BL().MOSS);
      },
    },
  ];

  Pool.save = [{
    name: 'Fuente de almas', w: [28, 32], d: [26, 30],
    build(r) {
      const cx = r.w / 2, cz = Math.floor(r.d / 2);
      r.box(cx - 2, 0, cz - 2, cx + 1, 0, cz + 1, BL().STONE, true);
      r.box(cx - 1, 1, cz - 1, cx, 3, cz, BL().CRYSTAL, true);
      r.features.push({ kind: 'saveAltar', x: r.centerX(), z: r.uZ(cz), y: 2.0 });
      // pila de ofrendas: oro a cambio de esencia
      r.box(cx - 7, 0, cz - 1, cx - 6, 1, cz, BL().STONE, true);
      r.features.push({ kind: 'offering', x: r.uX(cx - 6), z: r.uZ(cz), y: 1.0 });
      r.features.push({ kind: 'light', x: r.centerX(), y: 1.6, z: r.uZ(cz), r: 11, c: [0.35, 0.8, 1.2] });
      for (const [x, z] of [[5, 5], [r.w - 7, 5], [5, r.d - 7], [r.w - 7, r.d - 7]]) {
        pillar(r, x, z, 2, r.h - 2);
        r.box(x, 3, z, x + 1, 3, z + 1, BL().CRYSTAL);
      }
    },
  }];

  // Sala del cartógrafo: una mesa con el mapa de la mazmorra
  Pool.map = [{
    name: 'Sala del cartógrafo', w: [28, 32], d: [26, 30],
    build(r) {
      const cx = r.w / 2, cz = Math.floor(r.d / 2);
      r.box(cx - 3, 0, cz - 2, cx + 2, 1, cz + 1, BL().PLANK, true);          // mesa grande
      r.features.push({ kind: 'mapTable', x: r.centerX(), z: r.uZ(cz), y: 1.15 });
      r.features.push({ kind: 'light', x: r.centerX(), y: 2.2, z: r.uZ(cz), r: 9, c: [1.1, 0.85, 0.5] });
      for (const [x, z] of [[4, 5], [r.w - 6, 5]]) { r.box(x, 0, z, x + 1, 5, z + 4, BL().PLANK); }   // estanterías de rollos
      for (const [x, z] of [[5, r.d - 7], [r.w - 7, r.d - 7]]) pillar(r, x, z, 2, r.h - 2);
    },
  }];

  Pool.boss = [
    {
      name: 'Cámara del jefe', w: [62, 68], d: [64, 72], h: 14, relief: maybeRelief(0.3, 3),
      build(r) {
        for (const [x, z] of [[9, 10], [r.w - 11, 10], [9, r.d - 12], [r.w - 11, r.d - 12],
          [Math.floor(r.w / 2) - 14, Math.floor(r.d / 2)], [Math.floor(r.w / 2) + 12, Math.floor(r.d / 2)]])
          pillar(r, x, z, 3, r.h - 2);
        for (let i = 0; i < 18; i++) r.queue(M.chance(0.7) ? 'bones' : 'skull', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(6, r.d - 7)), {});
        for (let i = 0; i < 6; i++) r.queue('rubble', r.uX(M.randInt(4, r.w - 5)), r.uZ(M.randInt(6, r.d - 7)), {});
      },
    },
    {
      name: 'Coliseo de huesos', w: [62, 68], d: [62, 70], h: 14, relief: maybeRelief(0.3, 3),
      build(r) {
        for (let x = 8; x < r.w - 8; x += 10) {
          r.box(x, 0, 9, x + 1, 2, 10, BL().BONE);
          r.box(x, 0, r.d - 11, x + 1, 2, r.d - 10, BL().BONE);
        }
        ruinWall(r, 10, Math.floor(r.d / 2), 8, true, 3, BL().BRICK);
        ruinWall(r, r.w - 18, Math.floor(r.d / 2), 8, true, 3, BL().BRICK);
      },
    },
  ];

  // Elige al azar evitando repetir las últimas plantillas usadas
  Pool.recent = [];
  Pool.pick = (type, zone = 0) => {
    let list = Pool[type];
    if (type === 'normal') {
      const inZone = list.filter((t) => (BIOMES[t.name] || [0, 1, 2, 3, 4]).includes(zone));
      if (inZone.length) list = inZone;
    }
    const fresh = list.filter((t) => !Pool.recent.includes(t.name));
    const t = M.choice(fresh.length ? fresh : list);
    Pool.recent.push(t.name);
    if (Pool.recent.length > Math.min(5, list.length - 2)) Pool.recent.shift();
    return t;
  };

  VX.RoomPool = Pool;
})();
