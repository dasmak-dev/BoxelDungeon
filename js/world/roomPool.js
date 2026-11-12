// Pool de plantillas de habitación. Medidas en unidades de 0,5 m.
// Cada tipo tiene varias variantes; cada una genera su contenido al azar.
(function () {
  const M = VX.M;
  const BL = () => VX.Blocks;

  // ---------- Ayudantes ----------
  function crate(r, x, z, size, h) {
    r.box(x, 0, z, x + size - 1, h - 1, z + size - 1, BL().WOOD);
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

  // ---------- Objetos ----------
  // Barril de 1x1 unidades (0,5 m) y 0,75 m de alto; apilable
  function barrel(r, ux, uz, explosive, stack = 1) {
    if (ux < 2 || uz < 2 || ux > r.w - 3 || uz > r.d - 3 || r.isReservedU(ux, uz)) return;
    const t = explosive ? BL().BARREL : BL().WBARREL;
    for (let x = ux * 2; x < ux * 2 + 2; x++)
      for (let z = uz * 2; z < uz * 2 + 2; z++)
        for (let y = 0; y < 3 * stack; y++) if (!r.get(x, y, z)) r.set(x, y, z, t);
  }
  function scatterBarrels(r, n, explosiveChance = 0.6) {
    for (let i = 0; i < n; i++) {
      const ux = M.randInt(4, r.w - 5), uz = M.randInt(5, r.d - 6);
      const ex = Math.random() < explosiveChance;
      barrel(r, ux, uz, ex);
      if (Math.random() < 0.5) barrel(r, ux + 1, uz, ex);
      if (Math.random() < 0.3) barrel(r, ux, uz + 1, !ex);
    }
  }
  // Brasero: pie de hierro con brasas y luz
  function brazier(r, ux, uz) {
    if (ux < 2 || uz < 2 || ux > r.w - 3 || uz > r.d - 3 || r.isReservedU(ux, uz)) return;
    for (let x = ux * 2; x < ux * 2 + 2; x++)
      for (let z = uz * 2; z < uz * 2 + 2; z++) {
        for (let y = 0; y < 3; y++) r.set(x, y, z, BL().IRON);
        r.set(x, 3, z, BL().FIRE);
      }
    r.features.push({ kind: 'light', x: r.uX(ux + 1), y: 1.3, z: r.uZ(uz + 1), r: 8, c: [1.1, 0.55, 0.18] });
  }
  // Jaula colgada del techo
  function cage(r, ux, uz) {
    const x0 = ux * 2, z0 = uz * 2, top = r.H - 1, y1 = r.H - 5, y0 = y1 - 6;
    for (let y = y1; y < top; y++) r.set(x0 + 1, y, z0 + 1, BL().IRON);       // cadena
    for (let x = x0 - 1; x <= x0 + 3; x++)
      for (let z = z0 - 1; z <= z0 + 3; z++)
        for (let y = y0; y <= y1; y++) {
          const edgeX = x === x0 - 1 || x === x0 + 3, edgeZ = z === z0 - 1 || z === z0 + 3;
          const cap = y === y0 || y === y1;
          if (cap || ((edgeX || edgeZ) && ((x + z) & 1) === 0)) r.set(x, y, z, cap ? BL().IRON : BL().DOOR);
        }
    if (Math.random() < 0.6) r.set(x0 + 1, y0 + 1, z0 + 1, BL().BONE);
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
  VX.ZONES = [
    { id: 'cripta', name: 'LA CRIPTA', sub: 'Piedra, huesos y púas', tint: [1, 1, 1], floor: [1, 1, 1], fog: [0.012, 0.01, 0.016], hazard: 'spikes', boss: 'coloso' },
    { id: 'cloacas', name: 'LAS CLOACAS', sub: 'Cuidado con los charcos de ácido', tint: [0.72, 0.95, 0.78], floor: [0.75, 0.95, 0.85], fog: [0.008, 0.02, 0.014], hazard: 'acid', boss: 'ancestro' },
    { id: 'forja', name: 'LA FORJA', sub: 'El suelo arde: no pises la lava', tint: [1.08, 0.8, 0.7], floor: [1.02, 0.8, 0.72], fog: [0.03, 0.012, 0.006], hazard: 'lava', boss: 'carnicero' },
  ];

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
          for (let z = 7; z < r.d - 7; z += step) pillar(r, x, z, 2, r.h - 2);
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
          const z = M.randInt(8, r.d - 10), x = M.randInt(4, r.w - 14);
          r.box(x, 0, z, x + 8, 5, z, BL().PLANK);
        }
      },
    },
    {
      name: 'Ruinas', relief: maybeRelief(0.3, 3), w: [48, 60], d: [48, 62],
      build(r) {
        const n = Math.floor(area(r) / 160);
        for (let i = 0; i < n; i++) {
          ruinWall(r, M.randInt(3, r.w - 10), M.randInt(5, r.d - 10), M.randInt(5, 11), M.chance(0.5), M.randInt(3, 6), BL().BRICK);
        }
      },
    },
    {
      name: 'Trincheras', w: [44, 54], d: [52, 64],
      build(r) {
        for (let z = 8; z < r.d - 8; z += 7) {
          r.box(2, 0, z, r.w - 3, 1, z, BL().BRICK);
          for (let g = 0; g < 3; g++) {
            const gx = M.randInt(3, r.w - 7);
            r.box(gx, 0, z, gx + 3, 1, z, 0, true);
          }
          if (M.chance(0.6)) crate(r, M.randInt(3, r.w - 5), z + 2, 2, 2);
        }
      },
    },
    {
      name: 'Patio en cruz', relief: maybeRelief(0.3, 3), w: [50, 58], d: [50, 58],
      build(r) {
        const cx = r.w / 2, cz = Math.floor(r.d / 2);
        const t = BL().BRICK;
        ruinWall(r, 6, cz, cx - 8, true, 5, t);
        ruinWall(r, cx + 3, cz, r.w - cx - 9, true, 5, t);
        ruinWall(r, cx, 8, cz - 10, false, 5, t);
        ruinWall(r, cx, cz + 3, r.d - cz - 11, false, 5, t);
        pillar(r, cx - 1, cz - 1, 2, 3);
        for (const [x, z] of [[8, 8], [r.w - 10, 8], [8, r.d - 10], [r.w - 10, r.d - 10]]) pillar(r, x, z, 2, r.h - 2);
      },
    },
    {
      name: 'Cripta', relief: maybeRelief(0.3, 3), w: [44, 56], d: [48, 60],
      build(r) {
        for (let z = 8; z < r.d - 9; z += 7) {
          for (let x = 5; x < r.w - 7; x += 8) {
            if (M.chance(0.2)) continue;
            r.box(x, 0, z, x + 1, 1, z + 3, BL().STONE);
            if (M.chance(0.5)) r.box(x, 2, z + 1, x + 1, 2, z + 2, BL().BONE);
          }
        }
        for (let i = 0; i < 10; i++) {
          const x = M.randInt(3, r.w - 4), z = M.randInt(4, r.d - 5);
          r.column(x, z, M.randInt(1, 3), BL().BONE);
        }
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
        r.box(3, 0, 3, 3, 5, r.d - 4, BL().PLANK);
        brazier(r, Math.floor(r.w / 2) - 1, 7);
      },
    },
    {
      name: 'Capilla en ruinas', w: [40, 48], d: [52, 62],
      build(r) {
        const cx = Math.floor(r.w / 2);
        for (let uz = 9; uz < r.d - 14; uz += 4) {
          r.box(4, 0, uz, cx - 3, 0, uz, BL().PLANK);
          r.box(cx + 2, 0, uz, r.w - 5, 0, uz, BL().PLANK);
          if (Math.random() < 0.3) r.box(M.randInt(4, r.w - 6), 0, uz, M.randInt(4, r.w - 6), 0, uz, 0, true);
        }
        r.box(cx - 3, 0, r.d - 10, cx + 2, 1, r.d - 9, BL().STONE);
        brazier(r, cx - 6, r.d - 10); brazier(r, cx + 5, r.d - 10);
        for (let uz = 8; uz < r.d - 8; uz += 10) { pillar(r, 3, uz, 2, r.h - 2); pillar(r, r.w - 5, uz, 2, r.h - 2); }
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
            if (Math.random() < 0.5) r.column(left ? 4 : r.w - 6, uz + 3, M.randInt(1, 2), BL().BONE);
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
        for (let i = 0; i < 8; i++) r.column(M.randInt(3, r.w - 4), M.randInt(4, r.d - 5), M.randInt(1, 2), BL().BONE);
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
        for (let i = 0; i < 12; i++) r.column(M.randInt(4, r.w - 5), M.randInt(4, r.d - 5), M.randInt(1, 3), BL().BONE);
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
      name: 'Galería de muros', relief: maybeRelief(0.3, 3), w: [50, 58], d: [54, 64],
      build(r) {
        let left = M.chance(0.5);
        for (let z = 9; z < r.d - 9; z += 8) {
          const gap = 8;
          if (left) r.box(2 + gap, 0, z, r.w - 3, 5, z, BL().BRICK);
          else r.box(2, 0, z, r.w - 3 - gap, 5, z, BL().BRICK);
          left = !left;
        }
      },
    },
    {
      name: 'Biblioteca maldita', relief: maybeRelief(0.3, 3), w: [46, 54], d: [50, 60],
      build(r) {
        for (let z = 8; z < r.d - 8; z += 6) {
          r.box(5, 0, z, Math.floor(r.w / 2) - 5, 6, z, BL().PLANK);
          r.box(Math.floor(r.w / 2) + 4, 0, z, r.w - 6, 6, z, BL().PLANK);
        }
        for (let i = 0; i < 6; i++) crate(r, M.randInt(3, r.w - 5), M.randInt(5, r.d - 6), 1, 1);
      },
    },
  ];

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

  Pool.boss = [
    {
      name: 'Cámara del jefe', w: [62, 68], d: [64, 72], h: 14, relief: maybeRelief(0.3, 3),
      build(r) {
        for (const [x, z] of [[9, 10], [r.w - 11, 10], [9, r.d - 12], [r.w - 11, r.d - 12],
          [Math.floor(r.w / 2) - 14, Math.floor(r.d / 2)], [Math.floor(r.w / 2) + 12, Math.floor(r.d / 2)]])
          pillar(r, x, z, 3, r.h - 2);
        for (let i = 0; i < 14; i++) r.column(M.randInt(4, r.w - 5), M.randInt(6, r.d - 7), M.randInt(1, 3), BL().BONE);
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
  Pool.pick = (type) => {
    const list = Pool[type];
    const fresh = list.filter((t) => !Pool.recent.includes(t.name));
    const t = M.choice(fresh.length ? fresh : list);
    Pool.recent.push(t.name);
    if (Pool.recent.length > Math.min(6, Pool.normal.length - 2)) Pool.recent.shift();
    return t;
  };

  VX.RoomPool = Pool;
})();
