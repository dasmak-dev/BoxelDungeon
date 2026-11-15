// "Vestido" de las salas: llena la mazmorra de detalles con objetos de vóxel fino.
// Cada tipo de sala tiene su propio tema (qué hay junto a las paredes, en el suelo, colgando…)
// para que no todas se parezcan. Se ejecuta al final de Room.build (tras relieve y peligros).
// Todo lo que se coloca aquí se puede romper.
(function () {
  const M = VX.M;
  const S = VX.S;
  const P = () => VX.Props;
  const PV = () => VX.PV;

  // ---------------- Temas por sala ----------------
  // wall: montones junto a las paredes · wallP: probabilidad por hueco · banners/webs/beams/chains/chandeliers
  // floor: cosas sueltas por el suelo (y cuántas por cada 100 m²)
  const BASE = { wall: ['barrels', 'crates', 'urns', 'sacks'], wallP: 0.4, banners: 0.35, webs: 0.8, beams: true, chains: 1.2, floor: ['rubble', 'bones', 'puddle'], floorN: 2.2 };
  const THEMES = {
    'Columnata': { wall: ['urns', 'urns', 'bones'], beams: false, banners: 0.6, floor: ['rubble', 'puddle'], floorN: 1.5 },
    'Almacén abandonado': { wall: ['crates', 'crates', 'sacks', 'barrels', 'shelf'], wallP: 0.6, chains: 0.6, floor: ['rubble', 'straw'] },
    'Templo en ruinas': { wall: ['urns', 'bones'], beams: false, banners: 0.2, webs: 1, chains: 0.3, floor: ['rubble', 'rubble', 'skull'], floorN: 3.5 },
    'Barricadas': { wall: ['sacks', 'crates', 'barrels', 'rack'], wallP: 0.5, floor: ['rubble', 'bones', 'straw'] },
    'Claustro': { wall: ['urns', 'urns'], beams: false, banners: 0.5, chains: 0, webs: 0.5, floor: ['rubble', 'puddle'], floorN: 1 },
    'Cripta': { wall: ['urns', 'bones', 'bones', 'candlesWall'], wallP: 0.55, beams: false, banners: 0.2, webs: 1, chains: 0.6, floor: ['bones', 'skull', 'rubble'], floorN: 3 },
    'Pozo central': { wall: ['barrels', 'crates', 'bones'], chains: 2.5, floor: ['rubble', 'puddle'] },
    'Sala de las púas': { wall: ['rack', 'rack', 'bones', 'barrels'], beams: false, floor: ['bones', 'skull'] },
    'Polvorín': { wall: ['xbarrels', 'crates', 'sacks'], wallP: 0.6, floor: ['rubble', 'straw'] },
    'Bodega': { wall: ['barrels', 'barrels', 'shelf', 'table'], wallP: 0.6, floor: ['puddle', 'straw'] },
    'Capilla': { wall: ['candlesWall', 'urns'], wallP: 0.3, beams: false, banners: 0.7, webs: 0.6, chains: 0, floor: ['rubble'], floorN: 0.6 },
    'Celdas': { wall: ['bones', 'straw'], wallP: 0.4, beams: false, chains: 0.4, floor: ['straw', 'bones', 'puddle'], floorN: 3 },
    'Matadero': { wall: ['table', 'barrels', 'rack', 'bones'], wallP: 0.5, chains: 4, hooks: true, floor: ['bones', 'puddle', 'skull'], floorN: 3 },
    'Foso': { wall: ['bones', 'urns'], beams: false, chains: 0.6, floor: ['rubble', 'bones'] },
    'Colinas de huesos': { wall: ['bones', 'bones'], beams: false, banners: 0, chains: 0, floor: ['bones', 'skull', 'bones'], floorN: 4 },
    'Cresta': { wall: ['crates', 'barrels'], beams: false, floor: ['rubble'], floorN: 2.5 },
    'Galería de arcos': { wall: ['urns', 'statueWall'], wallP: 0.35, beams: false, banners: 0.6, floor: ['rubble', 'puddle'] },
    'Comedor de guardia': { wall: ['barrels', 'crates', 'rack', 'sacks'], wallP: 0.45, banners: 0.7, chandeliers: 1, floor: ['bones', 'straw'], floorN: 1.2 },
    'Herrería': { wall: ['rack', 'rack', 'crates', 'barrels', 'sacks'], wallP: 0.55, banners: 0.2, chains: 1.5, floor: ['rubble'], floorN: 2 },
    'Río de lava': { wall: ['bones', 'urns'], wallP: 0.3, beams: false, chains: 0.5, floor: ['rubble', 'bones'], floorN: 1.5 },
    'Canal de ácido': { wall: ['barrels', 'bones'], wallP: 0.3, beams: false, chains: 0.5, floor: ['rubble', 'acidpuddle'], floorN: 1.5 },
    'Sala del trono': { wall: ['urns', 'candlesWall'], wallP: 0.35, beams: false, banners: 0.95, chains: 0, webs: 0.6, floor: ['rubble'], floorN: 0.5 },
    'Laboratorio del alquimista': { wall: ['shelf', 'shelf', 'table', 'urns'], wallP: 0.6, chains: 0.6, webs: 1, floor: ['puddle', 'skull'], floorN: 1.5 },
    'Salón en cruz': { wall: ['barrels', 'crates', 'urns', 'bones'], wallP: 0.35, floor: ['rubble', 'bones'], floorN: 1.5 },
    'Sala en U': { wall: ['urns', 'bones', 'barrels'], wallP: 0.35, banners: 0.5, floor: ['rubble'], floorN: 1.5 },
    'Sala en zigzag': { wall: ['barrels', 'crates', 'sacks'], wallP: 0.4, floor: ['rubble', 'bones'], floorN: 2 },
    'Pasillo largo': { wall: ['urns', 'bones', 'candlesWall'], wallP: 0.35, beams: false, banners: 0.7, chains: 1, floor: ['rubble', 'puddle'], floorN: 2 },
    'Galería con balcón': { wall: ['barrels', 'crates', 'shelf'], wallP: 0.35, beams: false, banners: 0.6, chains: 0.5, floor: ['rubble'], floorN: 1 },
    'Galería minera': { wall: ['crates', 'barrels', 'sacks'], wallP: 0.5, beams: false, banners: 0, chains: 0.3, floor: ['rubble', 'rubble'], floorN: 3 },
    'Veta de cristal': { wall: ['crates', 'bones'], wallP: 0.25, beams: false, banners: 0, chains: 0, floor: ['rubble'], floorN: 3 },
    'Bosque de hongos': { wall: ['shroomsW', 'bones'], wallP: 0.5, beams: false, banners: 0, chains: 0, webs: 1, floor: ['shrooms', 'puddle'], floorN: 3 },
    'Cueva de esporas': { wall: ['shroomsW', 'bones'], wallP: 0.5, beams: false, banners: 0, chains: 0, webs: 1, floor: ['shrooms', 'rubble'], floorN: 2 },
    'Santuario del vacío': { wall: ['crystalW', 'urns'], wallP: 0.35, beams: false, banners: 0.4, chains: 0.4, floor: ['rubble', 'skull'], floorN: 2 },
    'El gran árbol': { wall: ['bones', 'urns', 'barrels'], wallP: 0.3, beams: false, banners: 0, chains: 0.2, webs: 2, floor: ['rubble', 'skull', 'puddle'], floorN: 3 },
    'Río de esporas': { wall: ['shroomsW', 'bones'], wallP: 0.35, beams: false, chains: 0, floor: ['shrooms'], floorN: 2 },
    'Grieta del vacío': { wall: ['crystalW', 'bones'], wallP: 0.3, beams: false, chains: 0.3, floor: ['rubble'], floorN: 1.5 },
    'Biblioteca maldita': { wall: ['shelf', 'table', 'candlesWall', 'urns'], wallP: 0.45, beams: false, banners: 0.3, chains: 0, chandeliers: 3, floor: ['rubble', 'skull'], floorN: 1.2 },
  };
  const TYPE_THEMES = {
    start: { wall: ['crates', 'barrels', 'sacks'], wallP: 0.5, floor: ['rubble'], floorN: 1 },
    shop: { wall: ['sacks', 'crates', 'barrels'], wallP: 0.6, onlyEntranceWall: true, chains: 0.5, floor: ['straw'], floorN: 1 },
    reward: { wall: ['urns', 'candlesWall'], wallP: 0.4, beams: false, banners: 0.7, chains: 0, floor: ['rubble'], floorN: 0.8 },
    map: { wall: ['crates', 'candlesWall', 'sacks'], wallP: 0.5, beams: true, banners: 0.6, chains: 0, floor: ['rubble'], floorN: 0.6 },
    save: { wall: ['candlesWall', 'urns'], wallP: 0.5, beams: false, banners: 0.5, chains: 0, floor: ['puddle'], floorN: 0.5 },
    boss: { wall: ['bones', 'bones', 'rack', 'urns'], wallP: 0.4, beams: false, banners: 0.9, chains: 1.5, floor: ['bones', 'skull', 'rubble'], floorN: 2.5 },
  };

  // Datos de las 4 paredes interiores: cara (m), eje y rotación para mirar hacia dentro
  function walls(r) {
    const x0 = (r.ox + 4) * S, x1 = (r.ox + r.W - 4) * S, z0 = (r.oz + 4) * S, z1 = (r.oz + r.D - 4) * S;
    return [
      { side: 'zn', along: 'x', a0: x0, a1: x1, face: z0, inward: 1, rot: 0 },
      { side: 'zp', along: 'x', a0: x0, a1: x1, face: z1, inward: -1, rot: 2 },
      { side: 'xn', along: 'z', a0: z0, a1: z1, face: x0, inward: 1, rot: 3 },
      { side: 'xp', along: 'z', a0: z0, a1: z1, face: x1, inward: -1, rot: 1 },
    ];
  }
  const wallPt = (w, a, off) => (w.along === 'x' ? [a, w.face + w.inward * off] : [w.face + w.inward * off, a]);

  // ¿Hay pared sólida detrás a la altura y (m) y aire delante?
  function solidWall(r, w, a, y) {
    const [x, z] = wallPt(w, a, -0.12);
    const lx = Math.floor(x / S) - r.ox, lz = Math.floor(z / S) - r.oz, ly = Math.floor(y / S);
    if (!r.inBounds(lx, ly, lz)) return false;
    const t = r.grid[r.idx(lx, ly, lz)];
    if (!t || t === VX.Blocks.DOOR || t === VX.Blocks.PROP) return false;
    const [fx, fz] = wallPt(w, a, 0.15);
    const flx = Math.floor(fx / S) - r.ox, flz = Math.floor(fz / S) - r.oz;
    return r.inBounds(flx, ly, flz) && !r.grid[r.idx(flx, ly, flz)];
  }

  function nearTorch(r, x, z, y, d = 1.1) {
    for (const t of r.torches) if (Math.hypot(t.x - x, t.z - z) < d && Math.abs(t.y - y) < 1.4) return true;
    return false;
  }

  // Objeto plano colgado en la pared (estandarte, vidriera, armero…); y = altura de su base
  function onWall(r, w, a, y, type, v) {
    const m = P().getModel(type, v, w.along === 'x' ? 0 : 1);
    const pv = PV();
    const [px, pz] = wallPt(w, a, 0.005);
    const ox = w.along === 'x' ? px - m.w * pv / 2 : (w.inward > 0 ? px : px - m.w * pv);
    const oz = w.along === 'z' ? pz - m.d * pv / 2 : (w.inward > 0 ? pz : pz - m.d * pv);
    return P().addRaw(r, type, m, ox, y, oz);
  }

  // Montón junto a la pared
  function cluster(r, w, a, kind) {
    const pl = P().place, pv = PV();
    const [x, z] = wallPt(w, a, 0.42);
    const along = (d) => (w.along === 'x' ? [x + d, z] : [x, z + d]);
    switch (kind) {
      case 'barrels': case 'xbarrels': {
        const n = M.randInt(1, 3);
        for (let i = 0; i < n; i++) {
          const [px, pz] = along((i - (n - 1) / 2) * 0.66);
          const ex = kind === 'xbarrels' ? Math.random() < 0.75 : Math.random() < 0.15;
          const b = pl(r, ex ? 'xbarrel' : 'barrel', px, pz);
          if (b && !ex && Math.random() < 0.25) pl(r, 'barrel', px, pz, { y: b.oy + b.h * pv, noOcc: true, on: b });
        }
        break;
      }
      case 'crates': {
        if (Math.random() < 0.4) { const [px, pz] = along(0); pl(r, 'bigcrate', px, pz, { rot: 0 }); break; }
        const [px, pz] = along(0);
        let c = pl(r, 'crate', px, pz, { rot: 0 });
        if (c && Math.random() < 0.3) pl(r, 'crate', px, pz, { rot: 0, y: c.oy + c.h * pv, noOcc: true, on: c });
        break;
      }
      case 'urns': for (let i = 0; i < M.randInt(2, 4); i++) { const [px, pz] = along(M.rand(-0.6, 0.6)); pl(r, 'urn', px + M.rand(-0.1, 0.1), pz + M.rand(-0.1, 0.1)); } break;
      case 'sacks': for (let i = 0; i < M.randInt(2, 3); i++) { const [px, pz] = along((i - 1) * 0.55); pl(r, 'sack', px, pz); } break;
      case 'straw': pl(r, 'straw', x, z); break;
      case 'shelf': { const [px, pz] = wallPt(w, a, 0.2); pl(r, 'shelf', px, pz, { rot: w.rot }); break; }
      case 'table': {
        const t = pl(r, 'table', x, z, { rot: w.along === 'x' ? 0 : 1 });
        if (t) {
          if (Math.random() < 0.6) pl(r, 'candles', t.cx + M.rand(-0.25, 0.25), t.cz, { y: t.oy + t.h * pv, noOcc: true, on: t });
          if (Math.random() < 0.4) pl(r, 'skull', t.cx + M.rand(-0.3, 0.3), t.cz + M.rand(-0.1, 0.1), { y: t.oy + t.h * pv, noOcc: true, on: t });
        }
        break;
      }
      case 'candlesWall': { const [px, pz] = wallPt(w, a, 0.2); pl(r, 'candles', px, pz); const [qx, qz] = along(0.3); pl(r, 'candles', qx, qz); break; }
      case 'bones': pl(r, 'bones', x, z); if (Math.random() < 0.5) { const [px, pz] = along(0.4); pl(r, 'skull', px, pz); } break;
      case 'rack': if (solidWall(r, w, a, 1.2) && solidWall(r, w, a, 0.5)) onWall(r, w, a, 0.3, 'rack', 0); break;
      case 'anvil': pl(r, 'anvil', x, z, { rot: w.along === 'x' ? 0 : 1 }); break;
      case 'shroomsW': for (let i = 0; i < 2; i++) { const [px, pz] = along(M.rand(-0.6, 0.6)); pl(r, 'shrooms', px, pz); } break;
      case 'crystalW': { const [px, pz] = wallPt(w, a, 0.5); pl(r, 'crystal', px, pz, { v: 1 }); break; }
      case 'cart': pl(r, 'cart', x, z, { rot: w.along === 'x' ? 1 : 0 }); break;
      case 'statueWall': { const [px, pz] = wallPt(w, a, 0.5); pl(r, 'statue', px, pz, { rot: (w.rot + 2) % 4 }); break; }
    }
  }

  function dress(r) {
    const W = r.W, D = r.D;
    r.occ = new Uint8Array(W * D);
    const Z = VX.ZONES[r.zone || 0];
    const T = { ...BASE, ...(r.type === 'normal' ? (THEMES[r.name] || {}) : (TYPE_THEMES[r.type] || {})) };
    const pl = P().place;
    const ceil = r.ceilBase * S;
    const area = (r.W * S) * (r.D * S);

    // 1) lo que han pedido las plantillas
    const lastAt = {};
    // objetos de la plantilla que no pegan con el bioma se cambian por otros que sí
    const SWAP = { cripta: { crate: 'urn', bigcrate: 'sarcophagus', sack: 'bones', barrel: 'urn', straw: 'bones' },
      jardin: { crate: 'shrooms', bigcrate: 'mushroom', sack: 'shrooms', barrel: 'shrooms' },
      vacio: { crate: 'crystal', bigcrate: 'statue', sack: 'rubble', barrel: 'urn', straw: 'rubble' } }[Z.id];
    if (SWAP && r.type === 'normal') for (const q of r.pending) if (SWAP[q.type] && P().DEFS[SWAP[q.type]]) { q.type = SWAP[q.type]; q.stack = 1; if (q.opts) { delete q.opts.onTop; } }
    for (const q of r.pending) {
      if (q.at) { P().placeAt(r, q.type, q.x, q.at.y, q.z, q.at.rot || 0, q.at.v || 0); continue; }
      const key = q.x.toFixed(2) + ',' + q.z.toFixed(2);
      if (q.opts && q.opts.onTop) {
        const base = lastAt[key];
        if (base && !base.dead) pl(r, q.type, q.x, q.z, { ...q.opts, y: base.oy + base.h * PV(), noOcc: true, on: base });
        continue;
      }
      let p = pl(r, q.type, q.x, q.z, q.opts || {});
      if (p) lastAt[key] = p;
      for (let s = 1; p && s < (q.stack || 1); s++) p = pl(r, q.type, q.x, q.z, { ...(q.opts || {}), y: p.oy + p.h * PV(), noOcc: true, on: p });
    }
    r.pending = [];

    // 1b) cámara secreta tras un muro agrietado
    // grietas: cámara con cofre, o (más raro) la escalera que baja al bioma secreto
    if (r.type === 'normal' && (r.zone || 0) !== 5 && r.index >= 3 && Math.random() < 0.08) addSecret(r, true);
    else if (r.type === 'normal' && Math.random() < 0.28) addSecret(r);
    // cámara cerrada con reja de color: la llave está escondida en algún objeto de la sala
    if (r.type === 'normal' && r.index >= 1 && !(VX.game && VX.game.mode === 'horde') && Math.random() < (r.template && r.template.event ? 0.7 : 0.22)) addSecret(r, false, true);   // cerradura

    // 2) junto a las paredes (con extras del bioma)
    // cada bioma sólo admite lo que le pega (nada de cajas y sacos en una cripta) y añade lo suyo
    const BIO = {
      cripta: { ok: ['urns', 'bones', 'candlesWall', 'statueWall', 'shelf', 'table', 'rack', 'straw'], add: ['bones', 'urns', 'candlesWall'] },
      cloacas: { ok: ['barrels', 'crates', 'bones', 'sacks', 'rack', 'straw', 'table', 'shelf'], add: ['barrels', 'bones'] },
      minas: { ok: ['crates', 'barrels', 'sacks', 'cart', 'rack', 'bones', 'xbarrels', 'table', 'shelf', 'straw'], add: ['crates', 'cart', 'sacks'] },
      forja: { ok: ['anvil', 'rack', 'barrels', 'crates', 'xbarrels', 'table', 'bones', 'shelf'], add: ['anvil', 'rack', 'anvil'] },
      jardin: { ok: ['shroomsW', 'bones', 'urns', 'straw', 'shelf', 'table'], add: ['shroomsW', 'shroomsW', 'bones'] },
      vacio: { ok: ['crystalW', 'urns', 'bones', 'statueWall', 'candlesWall', 'shelf', 'table'], add: ['crystalW', 'crystalW', 'urns'] },
    }[Z.id];
    let set = T.wall.slice();
    if (BIO && r.type === 'normal') set = set.filter((k) => BIO.ok.includes(k)).concat(BIO.add);
    else if (BIO) set = set.concat(BIO.add.slice(0, 1));
    for (const w of walls(r)) {
      if (T.onlyEntranceWall && w.side !== r.entrance) continue;
      for (let a = w.a0 + 1.2; a < w.a1 - 1.2; a += M.rand(1.3, 2.4))
        if (Math.random() < T.wallP) cluster(r, w, a, M.choice(set));
      // estandartes
      if (T.banners) for (let a = w.a0 + 2.5; a < w.a1 - 2.5; a += M.rand(4, 7)) {
        if (Math.random() < T.banners && solidWall(r, w, a, 2.0) && solidWall(r, w, a, 3.0) && !nearTorch(r, ...wallPt(w, a, 0.3), 2.4))
          onWall(r, w, a, 1.75, 'banner', M.randInt(0, 2) + (r.zone || 0));
      }
      // tuberías en las cloacas
      if (Z.id === 'cloacas') for (let a = w.a0 + 1.2; a < w.a1 - 2.2; a += 2) if (Math.random() < 0.7 && solidWall(r, w, a + 1, 0.6) && solidWall(r, w, a + 1, 0.2)) {
        const m = P().getModel('pipe', 0, w.along === 'x' ? 0 : 1);
        const [px, pz] = wallPt(w, a, 0.02);
        P().addRaw(r, 'pipe', m, w.along === 'x' ? px : (w.inward > 0 ? px : px - m.w * PV()), 0.05, w.along === 'z' ? pz : (w.inward > 0 ? pz : pz - m.d * PV()));
      }
    }

    // 2b) vidrieras de colores en las paredes largas (capilla)
    if (r.wantWindows) {
      const along = (r.entrance === 'xn' || r.entrance === 'xp') ? 'x' : 'z';
      for (const w of walls(r)) {
        if (w.along !== along) continue;
        for (let a = w.a0 + 2; a < w.a1 - 2; a += 3.5)
          if (solidWall(r, w, a, 3.2) && solidWall(r, w, a, 4.9)) onWall(r, w, a, 2.9, 'window', M.randInt(0, 4));
      }
    }
    if (r.wantChandeliers) {
      const n = r.wantChandeliers, zAxis = !(r.entrance === 'xn' || r.entrance === 'xp');
      for (let i = 0; i < n; i++) {
        const f = (i + 1) / (n + 1);
        hangChandelier(r, zAxis ? r.centerX() : (r.ox + r.W * f) * S, zAxis ? (r.oz + r.D * f) * S : r.centerZ());
      }
    }

    // (los entibados de mina y los postes de madera ahora son de bloques: ver biomeDecor.js)

    // 4) telarañas en las esquinas altas
    for (const w of walls(r)) {
      const yTop = ceil - 14 * PV();
      if (Math.random() < T.webs) webAt(r, w, w.a0, yTop, false);
      if (Math.random() < T.webs) webAt(r, w, w.a1, yTop, true);
    }

    // 5) colgando del techo: cadenas, ganchos y lámparas
    const nChains = Math.round((area / 100) * T.chains);
    for (let i = 0; i < nChains; i++) {
      const x = r.uX(M.randInt(4, r.w - 4)) + 0.25, z = r.uZ(M.randInt(4, r.d - 4)) + 0.25;
      const type = T.hooks && Math.random() < 0.6 ? 'hook' : 'chain';
      const m = P().getModel(type, M.randInt(0, 5), 0);
      const cy = r.ceilY ? r.ceilY(x, z) : ceil;   // cuelga del techo de verdad (en las bóvedas, más arriba)
      P().addRaw(r, type, m, x - m.w * PV() / 2, cy - m.h * PV(), z - m.d * PV() / 2);
    }
    for (let i = 0; i < (T.chandeliers || 0); i++) hangChandelier(r, r.centerX() + M.rand(-2, 2), r.uZ(Math.round(r.d * (i + 1) / ((T.chandeliers || 0) + 1))));

    // 6) suelo
    const nFloor = Math.round((area / 100) * T.floorN);
    for (let i = 0; i < nFloor; i++) {
      const x = r.uX(M.randInt(3, r.w - 3)), z = r.uZ(M.randInt(3, r.d - 3));
      let kind = M.choice(T.floor);
      if (Z.id === 'cloacas' && Math.random() < 0.35) kind = 'acidpuddle';
      pl(r, kind, x, z, { margin: 5 });
    }

    // 7) a veces hay una llave escondida dentro de algo que se puede romper (sobre todo vasijas);
    //    no tiene que ver con que haya cerradura en esta sala
    if (r.type === 'normal' && !(VX.game && VX.game.mode === 'horde') && Math.random() < (r.template && r.template.event ? 0.8 : 0.28)) {
      const KEEP = new Set(['urn', 'crate', 'bigcrate', 'barrel', 'sack', 'sarcophagus', 'shelf', 'tomb', 'cart', 'statue', 'shrooms', 'mushroom']);
      const cand = r.props.filter((p) => !p.dead && KEEP.has(p.type));
      const urns = cand.filter((p) => p.type === 'urn');
      if (cand.length) {
        const p = M.choice(urns.length && Math.random() < 0.7 ? urns : cand);
        const g = VX.game, rr = Math.random();
        p.key = g && g.rollKeyTier ? g.rollKeyTier(r.template && r.template.event ? 0.6 : 0) : rr < 0.1 ? 'gold' : rr < 0.4 ? 'silver' : 'wood';
      }
    }
  }

  // Hueco tapiado contra una pared: muro de ladrillo con una parte agrietada; dentro, un cofre
  // Cámara secreta excavada DENTRO de la pared: desde la sala sólo se ve un trozo
  // de la pared lisa con ladrillos agrietados, a ras del resto.
  function addSecret(r, stairs, lock) {
    const BL = VX.Blocks;
    const ws = walls(r).filter((w) => w.side !== r.entrance);
    for (let tries = 0; tries < 24; tries++) {
      const w = M.choice(ws);
      const a = M.rand(w.a0 + 2.5, w.a1 - 2.5);
      if (!solidWall(r, w, a - 0.9, 1) || !solidWall(r, w, a + 0.9, 1) || !solidWall(r, w, a, 1.9) || !solidWall(r, w, a - 0.9, 1.9) || !solidWall(r, w, a + 0.9, 1.9)) continue;
      if (nearTorch(r, ...wallPt(w, a, 0.5), 1.8)) continue;
      const [qx, qz] = wallPt(w, a, 0.6);
      if (P().spotFree(r, qx, qz, w.along === 'x' ? 0.9 : 0.4, w.along === 'x' ? 0.4 : 0.9, 10, 2) < 0) continue;
      const g = P().colH(r, Math.floor(qx / S) - r.ox, Math.floor(qz / S) - r.oz);
      if (g !== 0) continue;
      // capas de la pared: m3 = la cara que ves, m2 y m1 = hueco, m0 = fondo
      const faceL = Math.round(w.face / S) - (w.along === 'x' ? r.oz : r.ox);
      const m3 = w.inward > 0 ? faceL - 1 : faceL;
      const lay = (m) => m3 - w.inward * (3 - m);
      const ac = Math.round(a / S) - (w.along === 'x' ? r.ox : r.oz);
      const cell = (al, depth, y) => (w.along === 'x' ? [al, y, depth] : [depth, y, al]);
      const A0 = ac - 3, A1 = ac + 2, Y1 = g + 7;
      // ¿pared de ladrillo en todo el recuadro?
      let ok = true;
      for (let al = A0; al <= A1 && ok; al++) for (let y = g; y <= Y1 && ok; y++) for (const m of [1, 2, 3]) {
        const [lx, ly, lz] = cell(al, lay(m), y);
        const t = r.inBounds(lx, ly, lz) ? r.get(lx, ly, lz) : 0;
        if (!t || t === BL.DOOR || t === BL.PROP) ok = false;
      }
      if (!ok) continue;
      for (let al = A0; al <= A1; al++) for (let y = g; y <= Y1; y++) for (const m of [1, 2]) { const [lx, ly, lz] = cell(al, lay(m), y); r.set(lx, ly, lz, 0); }
      // cofre al fondo del hueco
      const F = w.face, depth0 = w.inward > 0 ? F - 0.75 : F + 0.75;
      if (!stairs) {
        const md = P().getModel('chest', 0, w.rot), PVv = PV();
        const dd = (w.along === 'x' ? md.d : md.w) * PVv;
        const back = w.inward > 0 ? depth0 : depth0 - dd;
        const ox = w.along === 'x' ? a - md.w * PVv / 2 : back, oz = w.along === 'x' ? back : a - md.d * PVv / 2;
        P().placeAt(r, 'chest', ox, g * S, oz, w.rot, 0);
      }
      const [cx, cz] = wallPt(w, a, -0.45);
      if (lock) {
        // cerradura discreta: la pared sigue igual salvo un hueco oscuro con forma de ojo de
        // llave (círculo arriba y ranura que se ensancha abajo). Al abrirla cae todo el recuadro.
        const cells = [];
        const d0 = A0 + 1, d1 = A1 - 1, top = g + 6;
        const KEYHOLE = ['.XX.', 'XXXX', 'XXXX', '.XX.', '.XX.', 'XXXX', 'XXXX'];   // de arriba (y = top) a abajo
        for (let al = d0; al <= d1; al++) for (let y = g; y <= top; y++) {
          const c = cell(al, lay(3), y);
          const row = KEYHOLE[top - y] || '....', col = al - d0;
          if (row[col] === 'X') r.set(c[0], c[1], c[2], BL.LOCKR);
          cells.push(c);
        }
        // marco dorado alrededor (no cae al abrirla): así se reconoce de lejos
        for (let y = g; y <= top + 1; y++) for (const al of [A0, A1]) { const c = cell(al, lay(3), y); r.set(c[0], c[1], c[2], BL.GOLDB); }
        for (let al = A0; al <= A1; al++) { const c = cell(al, lay(3), top + 1); r.set(c[0], c[1], c[2], BL.GOLDB); }
        const [dx, dz] = wallPt(w, a, 0.55);
        r.vault = { cells, x: dx, z: dz, y: g * S, cx, cz, open: false };
        r.walk = null;
        return;
      }
      // la cara: ladrillos agrietados, a ras de la pared
      const cells = [];
      for (let al = A0; al <= A1; al++) for (let y = g; y <= Y1; y++) { const c = cell(al, lay(3), y); r.set(c[0], c[1], c[2], BL.CRACK); cells.push(c); }
      r.secret = { x: cx, z: cz, hw: 1, hd: 1, found: false, y: g * S, stairs: !!stairs, rot: w.rot, inward: w.inward, along: w.along, cells };
      r.walk = null;
      return;
    }
  }

  // Lámpara de araña colgada del techo (con su luz)
  function hangChandelier(r, x, z) {
    const ceil = r.ceilY ? r.ceilY(x, z) : r.ceilBase * S;
    const m = P().getModel('chandelier', 0, 0);
    const y = Math.max(2.6, ceil - 1.2 - m.h * PV());
    const pv = PV();
    P().addRaw(r, 'chandelier', m, x - m.w * pv / 2, y, z - m.d * pv / 2);
    // cadena hasta el techo
    const len = ceil - (y + m.h * pv);
    if (len > 0.1) P().placeBeam(r, x - pv / 2, y + m.h * pv, z - pv / 2, pv, len, pv, 'none');
    r.features.push({ kind: 'light', x, y: y + 0.2, z, r: 7, c: [1.2, 0.8, 0.4] });
  }

  // Telaraña pegada a la esquina: 'end' = en el extremo final de la pared
  function webAt(r, w, a, y, end) {
    const pv = PV();
    const rot = w.along === 'x' ? (end ? 2 : 0) : (end ? 3 : 1);
    const m = P().getModel('web', M.randInt(0, 3), rot);
    let ox, oz;
    if (w.along === 'x') { ox = end ? a - m.w * pv : a; oz = w.inward > 0 ? w.face : w.face - m.d * pv; }
    else { oz = end ? a - m.d * pv : a; ox = w.inward > 0 ? w.face : w.face - m.w * pv; }
    P().addRaw(r, 'web', m, ox, y, oz);
  }

  VX.Dress = { dress, walls, wallPt, solidWall, onWall, hangChandelier };
})();
