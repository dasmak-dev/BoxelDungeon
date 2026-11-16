// (0.57) Cartografía: el mapa del cartógrafo como maqueta isométrica de vóxeles, iconos de pixel art,
// la previsión de lo que hay tras las puertas (enemigos, élites, botín, llave marcada, arma del
// vendedor), la ruta recomendada y el holograma que flota sobre la mesa del cartógrafo.
(function () {
  const M = VX.M;
  const DIRS = { zp: [0, 1], zn: [0, -1], xp: [1, 0], xn: [-1, 0] };

  // ---------------- Iconos (pixel art 12×12) ----------------
  // Cada carácter es un color de la paleta del icono; '.' es transparente.
  const SPR = {
    normal: { p: { a: '#f2ead8', b: '#1a1214', c: '#b8ab92', r: '#e2483a' }, s: [
      '...aaaaaa...', '..aaaaaaaa..', '.aaaaaaaaaa.', '.abbaaaabba.', '.abbbaabbba.', '.aabbaabbaa.',
      '.aaaaabaaaa.', '..aaabbbaa..', '...acacaca..', '...aaaaaa...', '....cacac...', '............'] },
    boss: { p: { a: '#f2ead8', b: '#1a1214', h: '#d94cff', r: '#ff3a2a' }, s: [
      'h..........h', 'hh.aaaaaa.hh', '.haaaaaaaah.', '.aaaaaaaaaa.', '.arraaaarra.', '.abbbaabbba.',
      '.aabbaabbaa.', '.aaaaabaaaa.', '..aabbbbaa..', '...ababab...', '...aaaaaa...', '............'] },
    reward: { p: { a: '#ffd23f', b: '#a8741a', c: '#fff4b8' }, s: [
      '.....aa.....', '.....aa.....', '....acca....', 'aaaaaccaaaaa', '.aaaacaaaaa.', '..aaaaaaaa..',
      '...aaaaaa...', '...aaaaaa...', '..aaabbaaa..', '..aab..baa..', '.ab......ba.', '............'] },
    shop: { p: { a: '#e8b23a', b: '#7a5214', c: '#fff0a0', d: '#3a2a10' }, s: [
      '....dddd....', '.....bb.....', '....aaaa....', '...aaaaaa...', '..aaaccaaa..', '.aaaacaaaaa.',
      '.aaaaccaaaa.', '.aaaaacaaaa.', '.aaaccaaaaa.', '.baaaaaaaab.', '..bbbbbbbb..', '............'] },
    save: { p: { a: '#6fe6ff', b: '#1d7a9a', c: '#e8ffff' }, s: [
      '.....aa.....', '....acca....', '...aacaaa...', '...acaaab...', '..aacaaabb..', '..aaaaabbb..',
      '..aaaabbbb..', '...aabbbb...', '...aabbbb...', '....abbb....', '.....bb.....', '............'] },
    map: { p: { a: '#e8d6a6', b: '#8a6a3a', c: '#6fd06a', r: '#c0392b' }, s: [
      '.bbbbbbbbbb.', 'baaaaaaaaaab', '.aaccaaaaaa.', '.aaccaaraaa.', '.aaaacaaaaa.', '.aaaaacaaaa.',
      '.aaaaaaccaa.', '.aaraaaacaa.', '.aaaaaaaaaa.', 'baaaaaaaaaab', '.bbbbbbbbbb.', '............'] },
    start: { p: { a: '#f2ead8', b: '#6a5a44' }, s: [
      '............', '..bbbbbbbb..', '..baaaaaab..', '..ba....ab..', '..ba....ab..', '..ba....ab..',
      '..ba....ab..', '..ba....ab..', '..ba..a.ab..', '..ba....ab..', 'bbbbbbbbbbbb', '............'] },
    unknown: { p: { a: '#9a8f80' }, s: [
      '............', '...aaaaaa...', '..aa....aa..', '........aa..', '.......aa...', '......aa....',
      '.....aa.....', '.....aa.....', '............', '.....aa.....', '.....aa.....', '............'] },
    enemy: { p: { a: '#ff5a46', b: '#7a1a12' }, s: [
      '............', '....aaaa....', '...aaaaaa...', '...abaaba...', '...aaaaaa...', '....aaaa....',
      '..aaaaaaaa..', '.aa.aaaa.aa.', '.a..aaaa..a.', '....a..a....', '...aa..aa...', '............'] },
    elite: { p: { a: '#ffd23f', b: '#ff5a46', c: '#7a1a12' }, s: [
      '..a.a..a.a..', '..aaaaaaaa..', '...bbbbbb...', '...bcbbcb...', '...bbbbbb...', '....bbbb....',
      '..bbbbbbbb..', '.bb.bbbb.bb.', '.b..bbbb..b.', '....b..b....', '...bb..bb...', '............'] },
    key: { p: { a: '#ffd23f', b: '#9a6a14' }, s: [
      '............', '.aaaa.......', 'aa..aa......', 'a....a......', 'aa..aaaaaaaa', '.aaaa.....ab',
      '.........a.a', '.........b.b', '............', '............', '............', '............'] },
    chest: { p: { a: '#b8742a', b: '#5a3410', c: '#ffd23f' }, s: [
      '............', '..bbbbbbbb..', '.baaaaaaaab.', '.baaaaaaaab.', '.bbbbbbbbbb.', '.baaaccaaab.',
      '.baaaccaaab.', '.baaaaaaaab.', '.baaaaaaaab.', '.bbbbbbbbbb.', '............', '............'] },
    rare: { p: { a: '#c79bff', b: '#6a3ab8', c: '#ffffff' }, s: [
      '.....a......', '.....aa.....', '....acaa....', 'aaaaacaaaaaa', '.aaaaaaaaab.', '..aaaaaaab..',
      '...aaaaab...', '...aabaab...', '..aab..baa..', '..ab....ba..', '.ab......ba.', '............'] },
    curse: { p: { a: '#8a2a8a', b: '#3a0a3a', c: '#ff5aff' }, s: [
      '............', '...aaaaaa...', '..aaaaaaaa..', '.aacaaaacaa.', '.aaaaaaaaaa.', '.aabbbbbbaa.',
      '..abababba..', '..aaaaaaaa..', '...a.a.a.a..', '...a.a.a.a..', '............', '............'] },
    gun: { p: { a: '#c8ccd4', b: '#4a4e58', c: '#ffd23f' }, s: [
      '............', '............', '.aaaaaaaaaa.', '.abbbbbbbaaa', '.aaaaaaaaaa.', '.......abb..',
      '......aab...', '.....aab....', '....aab.....', '....bbb.....', '............', '............'] },
    nogun: { p: { a: '#6a6e78', r: '#e2483a' }, s: [
      'r..........r', '.r........r.', '.aarrrrrrar.', '.aaarrrrraaa', '.aaaarraaaa.', '.....rr.....',
      '....rrrr....', '...rr..rr...', '..rr....rr..', '.rr......rr.', 'rr........rr', '............'] },
    ambush: { p: { a: '#ff9a3a', b: '#7a3a0a' }, s: [
      '.....aa.....', '.....aa.....', '....aaaa....', '....abba....', '...aabbaa...', '...aabbaa...',
      '..aaabbaaa..', '..aaaaaaaa..', '.aaaabbaaaa.', '.aaaaaaaaaa.', 'aaaaaaaaaaaa', '............'] },
    secret: { p: { a: '#c79bff', b: '#4a2a7a' }, s: [
      '......a.....', '.....ab.....', '.....a......', '....ab......', '....a.......', '...aba......',
      '.....ba.....', '......a.....', '.....ab.....', '....ab......', '....a.......', '............'] },
    dark: { p: { a: '#6a7aa8', b: '#2a3050' }, s: [
      '............', '....aaaa....', '...aaabb....', '..aaab......', '..aab.......', '..aab.......',
      '..aab.......', '..aaab......', '...aaabb....', '....aaaa....', '............', '............'] },
    fog: { p: { a: '#b8bcc8' }, s: [
      '............', '............', '.aaaa..aaa..', '............', '...aaaaaa...', '............',
      '.aaa..aaaaa.', '............', '....aaaa....', '............', '............', '............'] },
    hazard: { p: { a: '#ff7a1a', b: '#ffd23f', c: '#3a1a0a' }, s: [
      '.....aa.....', '....aaaa....', '....acca....', '...aacbaa...', '...aacbaa...', '..aaacbaaa..',
      '..aaaaaaaa..', '.aaaacbaaaa.', '.aaaaaaaaaa.', 'aaaaaaaaaaaa', '............', '............'] },
    lock: { p: { a: '#ffd23f', b: '#8a6a14', c: '#3a2a10' }, s: [
      '............', '....aaaa....', '...a....a...', '...a....a...', '..bbbbbbbb..', '..baaaaaab..',
      '..baacaaab..', '..baacaaab..', '..baaaaaab..', '..bbbbbbbb..', '............', '............'] },
    route: { p: { a: '#ffd23f', b: '#fff4b8' }, s: [
      '.....a......', '.....aa.....', '.....aaa....', '.....aaaa...', 'aaaaaaabaa..', 'aaaaaaabbaa.',
      'aaaaaaabaa..', '.....aaaa...', '.....aaa....', '.....aa.....', '.....a......', '............'] },
  };
  const cache = {};
  function sprite(name) {
    if (cache[name]) return cache[name];
    const d = SPR[name] || SPR.unknown;
    const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12;
    const c = cv.getContext('2d');
    d.s.forEach((row, y) => { for (let x = 0; x < 12; x++) { const ch = row[x]; if (ch && ch !== '.' && d.p[ch]) { c.fillStyle = d.p[ch]; c.fillRect(x, y, 1, 1); } } });
    cache[name] = cv;
    return cv;
  }
  function iconURL(name) { const k = 'u:' + name; if (!cache[k]) cache[k] = sprite(name).toDataURL(); return cache[k]; }
  // <img> nítido para el panel
  function icon(name, px = 20, title = '') { return `<img class="cico" src="${iconURL(name)}" width="${px}" height="${px}"${title ? ` title="${title}"` : ''}>`; }
  function drawIcon(ctx, name, x, y, px, glow) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 10; }
    ctx.drawImage(sprite(name), Math.round(x - px / 2), Math.round(y - px / 2), px, px);
    ctx.restore();
  }

  // ---------------- Previsión y ruta ----------------
  const studied = (game) => game.mapReveal > 0;
  function neighbors(game, r = game.currentRoom) {
    const out = [];
    for (const s of r.exits || []) {
      const d = r.doors[s];
      if (!d || !d.type || s === r.entrance) continue;
      out.push({ side: s, type: d.type, room: d.neighbor || null, door: d });
    }
    return out;
  }
  function scoreType(game, t, fc, lvl) {
    const P = game.player, low = P.hp < P.maxHp * 0.5, gold = game.stats.gold || 0;
    switch (t) {
      case 'reward': return fc && fc.reward ? { rare: 5, chest: 4, normal: 3, curse: 0.6 }[fc.reward] || 3 : 3;
      case 'shop': return 1.5 + (gold >= 60 ? 1.5 : 0) + (fc && fc.gun ? 1.5 : 0);
      case 'save': return low ? 4.5 : 1;
      case 'map': return 1.2;
      case 'boss': return low ? -3 : 3;
      case 'normal': return (fc ? (fc.key ? 1.6 : 0) + Math.min(2, (fc.elites || 0) * 0.6) - (low ? (fc.n || 4) * 0.25 : 0) : 0.8) + (lvl ? 0 : 0.3);
    }
    return 0;
  }
  // la ruta que traza el cartógrafo: la puerta y lo que conviene después
  function route(game) {
    if (!studied(game)) return null;
    let best = null;
    for (const nb of neighbors(game)) {
      if (nb.door.goldLock && !(game.keys && game.keys.gold)) continue;
      const n = nb.room;
      const s1 = scoreType(game, nb.type, n && n.fc, 0);
      let s2 = 0, nextI = -1;
      if (n && n.plannedTypes) n.plannedTypes.forEach((t, i) => { const v = scoreType(game, t, null, 1) * 0.6; if (nextI < 0 || v > s2) { s2 = v; nextI = i; } });
      const sc = s1 + s2;
      if (!best || sc > best.score) best = { side: nb.side, score: sc, next: nextI >= 0 ? n.plannedTypes[nextI] : null, nextSide: nextI >= 0 ? n.exits[nextI] : null };
    }
    return best;
  }
  function bossInfo(game) {
    const nbs = neighbors(game);
    if (nbs.some((n) => n.type === 'boss')) return { n: 1, txt: '¡Tras una de estas puertas!' };
    if (studied(game) && nbs.some((n) => n.room && n.room.plannedTypes && n.room.plannedTypes.includes('boss'))) return { n: 2, txt: 'A 2 salas' };
    const sp = game.spawner;
    if (sp && sp.secret) return { n: sp.secret.rooms, txt: sp.secret.rooms > 0 ? `Guardián del Vacío: ${sp.secret.rooms} salas` : 'El guardián espera' };
    if (sp && sp.bossSoon) return { n: 3, txt: 'Muy cerca (3 salas o menos)' };
    if (game.floor < 10) return { n: 99, txt: 'Primer jefe a partir del piso 10' };
    return { n: 99, txt: 'Aún lejos' };
  }

  // ---------------- Maqueta isométrica ----------------
  // bloques de una sala (cada bloque = k×k vóxeles), con la altura y el color de cada uno
  function roomBlocks(r) {
    if (r._carto && r._carto.ver === r.mapVersion) return r._carto;
    const walk = r.getWalk(), hm = r.hmap, W = r.W, D = r.D;
    const k = Math.max(4, Math.ceil(Math.max(W, D) / 16));
    const bw = Math.ceil(W / k), bd = Math.ceil(D / k);
    const HC = { lava: [0.85, 0.36, 0.12], acid: [0.36, 0.78, 0.3], water: [0.18, 0.36, 0.5], void: [0.55, 0.25, 0.88], spores: [0.55, 0.25, 0.88], spikes: [0.55, 0.55, 0.55] };
    const hz = new Uint8Array(bw * bd); const hzk = [];
    for (const sp of r.spikes || []) {
      const ki = hzk.indexOf(sp.kind) >= 0 ? hzk.indexOf(sp.kind) : hzk.push(sp.kind) - 1;
      for (let z = sp.uz0 * 2; z < (sp.uz1 + 1) * 2; z++) for (let x = sp.ux0 * 2; x < (sp.ux1 + 1) * 2; x++) {
        const bx = Math.floor(x / k), bz = Math.floor(z / k);
        if (bx >= 0 && bz >= 0 && bx < bw && bz < bd) hz[bz * bw + bx] = ki + 1;
      }
    }
    const blocks = [];
    for (let bz = 0; bz < bd; bz++) for (let bx = 0; bx < bw; bx++) {
      let walkN = 0, n = 0, hmax = 0, hsum = 0;
      for (let z = bz * k; z < Math.min(D, bz * k + k); z++) for (let x = bx * k; x < Math.min(W, bx * k + k); x++) {
        const i = z * W + x; n++; if (walk[i]) { walkN++; hsum += hm[i]; } else hmax = Math.max(hmax, hm[i]);
      }
      if (!n) continue;
      const edge = bx === 0 || bz === 0 || bx === bw - 1 || bz === bd - 1;
      let h, kind;
      if (walkN / n > 0.45) { h = 0.35 + Math.min(1.2, (hsum / walkN) / k); kind = 'floor'; }
      else if (hmax <= 0) { h = 0.12; kind = 'pit'; }
      else if (edge) { h = 1.7; kind = 'wall'; }
      else { h = Math.min(2.4, 0.5 + hmax / k * 0.6); kind = 'block'; }
      const hk = hz[bz * bw + bx];
      blocks.push({ x: bx * k, z: bz * k, h, kind, hz: hk && kind === 'floor' ? HC[hzk[hk - 1]] : null });
    }
    r._carto = { ver: r.mapVersion, k, blocks };
    return r._carto;
  }

  const shade = (c, f, a = 1) => `rgba(${Math.round(Math.min(1, c[0] * f) * 255)},${Math.round(Math.min(1, c[1] * f) * 255)},${Math.round(Math.min(1, c[2] * f) * 255)},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function drawIso(cv, game, rt) {
    const ctx = cv.getContext('2d'), Wc = cv.width, Hc = cv.height;
    const cur = game.currentRoom, T = VX.ROOM_TYPES, Z = VX.ZONES, S = VX.S;
    const rev = studied(game);
    // orientación: la puerta por la que entraste queda abajo y el frente, arriba
    const fw = DIRS[VX.Room.OPP[cur.entrance || 'zn']] || [0, 1], rg = [fw[1], -fw[0]];
    const toAB = (wx, wz) => {   // celdas del mundo → ejes isométricos (a, b)
      const lx = wx * rg[0] + wz * rg[1], lz = -(wx * fw[0] + wz * fw[1]);
      return [lx, lz];
    };
    // salas a dibujar: la actual, las vecinas y las de después (fantasmas)
    const list = [{ r: cur, cur: true }];
    const nbs = neighbors(game);
    for (const nb of nbs) if (nb.room && nb.room.grid) list.push({ r: nb.room, nb });
    const ghosts = [];
    if (rev) for (const nb of nbs) {
      const n = nb.room;
      if (!n || !n.plannedTypes) continue;
      n.exits.forEach((s, i) => {
        if (s === n.entrance) return;
        const dw = n.doorWorld(s), d = DIRS[s], sz = M.clamp(Math.min(n.W, n.D) * 0.75, 44, 80);
        const cx = dw.x / S + d[0] * (sz / 2 + 14), cz = dw.z / S + d[1] * (sz / 2 + 14);
        ghosts.push({ cx, cz, size: sz, type: n.plannedTypes[i], parent: n, side: s, from: dw });
      });
    }
    // encuadre
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    const ext = (wx, wz) => { const [a, b] = toAB(wx, wz); const sx = a - b, sy = (a + b) * 0.5; a0 = Math.min(a0, sx); a1 = Math.max(a1, sx); b0 = Math.min(b0, sy); b1 = Math.max(b1, sy); };
    for (const e of list) { const r = e.r; ext(r.ox, r.oz); ext(r.ox + r.W, r.oz); ext(r.ox, r.oz + r.D); ext(r.ox + r.W, r.oz + r.D); }
    for (const g of ghosts) { ext(g.cx - g.size / 2, g.cz - g.size / 2); ext(g.cx + g.size / 2, g.cz + g.size / 2); ext(g.cx - g.size / 2, g.cz + g.size / 2); ext(g.cx + g.size / 2, g.cz - g.size / 2); }
    const sc = Math.min((Wc - 70) / (a1 - a0), (Hc - 90) / (b1 - b0));
    const ox = Wc / 2 - (a0 + a1) / 2 * sc, oy = Hc / 2 + 20 - (b0 + b1) / 2 * sc;
    const P = (wx, wz, h = 0) => { const [a, b] = toAB(wx, wz); return [ox + (a - b) * sc, oy + (a + b) * 0.5 * sc - h * sc]; };
    // fondo
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createRadialGradient(Wc / 2, Hc / 2, 30, Wc / 2, Hc / 2, Math.max(Wc, Hc) * 0.7);
    bg.addColorStop(0, '#1e1a22'); bg.addColorStop(1, '#09080b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, Wc, Hc);
    // rejilla de la mesa
    ctx.strokeStyle = 'rgba(200,180,140,0.05)'; ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i++) { const c = cur.ox + cur.W / 2, d = cur.oz + cur.D / 2, L = 400; let p = P(c + i * 20, d - L), q = P(c + i * 20, d + L); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); p = P(c - L, d + i * 20); q = P(c + L, d + i * 20); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); }
    // pasillos de luz: de la sala actual a cada vecina, y de las vecinas a las de después
    const beam = (x0, z0, x1, z1, col, w, dash) => { const p = P(x0, z0, 0.3), q = P(x1, z1, 0.3); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); ctx.setLineDash([]); };
    const ccx = (r) => r.ox + r.W / 2, ccz = (r) => r.oz + r.D / 2;
    for (const e of list) if (e.nb) {
      const onRoute = rt && rt.side === e.nb.side;
      beam(ccx(cur), ccz(cur), ccx(e.r), ccz(e.r), onRoute ? 'rgba(255,210,80,0.85)' : 'rgba(140,190,255,0.3)', onRoute ? 5 : 3, [9, 6]);
    }
    for (const g of ghosts) {
      const onRoute = rt && rt.side && g.parent === (nbs.find((n) => n.side === rt.side) || {}).room && rt.nextSide === g.side;
      beam(ccx(g.parent), ccz(g.parent), g.cx, g.cz, onRoute ? 'rgba(255,210,80,0.8)' : 'rgba(140,190,255,0.2)', onRoute ? 4 : 2, [6, 6]);
    }
    // bloques de todas las salas, ordenados de atrás a delante
    const quads = [];
    for (const e of list) {
      const r = e.r, B = roomBlocks(r), k = B.k, zn = Z[r.zone || 0];
      const tc = (T[r.type] || T.normal).color;
      const known = e.cur || rev;
      const base = mix([0.42, 0.37, 0.32].map((v, i) => v * zn.floor[i]), tc, e.cur ? 0.12 : 0.3);
      for (const bl of B.blocks) {
        const wx = r.ox + bl.x, wz = r.oz + bl.z;
        const [a, b] = toAB(wx + k / 2, wz + k / 2);
        let c = bl.kind === 'floor' ? base : bl.kind === 'pit' ? [0.06, 0.05, 0.06] : bl.kind === 'wall' ? mix(base, [0.2, 0.18, 0.17], 0.45) : mix(base, [0.75, 0.7, 0.62], 0.25);
        if (bl.hz && known) c = bl.hz;
        quads.push({ d: a + b, wx, wz, k, h: bl.h * k * 0.9, c, f: known ? 1 : 0.5, cur: e.cur });
      }
    }
    quads.sort((p, q) => p.d - q.d);
    for (const q of quads) {
      const { wx, wz, k, h } = q;
      // las cuatro esquinas, en el orden de la pantalla
      const cs = [[wx, wz], [wx + k, wz], [wx + k, wz + k], [wx, wz + k]].map(([x, z]) => ({ t: P(x, z, h), g: P(x, z, 0) }));
      cs.sort((m, n) => m.g[1] - n.g[1]);
      const top = cs[0], bot = cs[3], L = cs[1].g[0] < cs[2].g[0] ? cs[1] : cs[2], Rr = L === cs[1] ? cs[2] : cs[1];
      const f = q.f;
      ctx.fillStyle = shade(q.c, 0.62 * f); ctx.beginPath(); ctx.moveTo(...L.t); ctx.lineTo(...bot.t); ctx.lineTo(...bot.g); ctx.lineTo(...L.g); ctx.fill();
      ctx.fillStyle = shade(q.c, 0.45 * f); ctx.beginPath(); ctx.moveTo(...Rr.t); ctx.lineTo(...bot.t); ctx.lineTo(...bot.g); ctx.lineTo(...Rr.g); ctx.fill();
      ctx.fillStyle = shade(q.c, 1.12 * f); ctx.beginPath(); ctx.moveTo(...top.t); ctx.lineTo(...Rr.t); ctx.lineTo(...bot.t); ctx.lineTo(...L.t); ctx.closePath(); ctx.fill();
    }
    // salas de después: maquetas «de alambre» con su icono
    for (const g of ghosts) {
      const hs = g.size / 2, c = (T[g.type] || T.normal).color, col = shade(c, 1, 0.55);
      const pts = [[g.cx - hs, g.cz - hs], [g.cx + hs, g.cz - hs], [g.cx + hs, g.cz + hs], [g.cx - hs, g.cz + hs]];
      ctx.fillStyle = shade(c, 0.35, 0.18); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath(); pts.forEach(([x, z], i) => { const p = P(x, z, 0); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); pts.forEach(([x, z], i) => { const p = P(x, z, 16); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      const p = P(g.cx, g.cz, 30);
      drawIcon(ctx, g.type, p[0], p[1], 26, shade(c, 1));
    }
    // figuritas e iconos
    const pawn = (wx, wz, col, s = 1) => { const p = P(wx, wz, 0.5); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p[0], p[1], 5 * s, 2.5 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(p[0] - 2.5 * s, p[1] - 9 * s, 5 * s, 8 * s); ctx.beginPath(); ctx.arc(p[0], p[1] - 11 * s, 3.2 * s, 0, 7); ctx.fill(); };
    // sala actual: objetos, enemigos y tú
    for (const it of game.pickups.items) if (!it.taken && cur.contains(it.x, it.z) && it.kind !== 'lockdoor') { const p = P(it.x / S, it.z / S, 3); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 4); ctx.lineTo(p[0] + 4, p[1]); ctx.lineTo(p[0], p[1] + 4); ctx.lineTo(p[0] - 4, p[1]); ctx.fill(); }
    for (const e of game.enemies) if (!e.dead) pawn(e.x / S, e.z / S, e.elite || e.champion ? '#ffb02a' : '#ff4a3a', e.isBoss ? 1.8 : e.champion ? 1.3 : 0.85);
    const Pl = game.player;
    pawn(Pl.x / S, Pl.z / S, '#f2ead8', 1.15);
    { const p = P(Pl.x / S, Pl.z / S, 0.5), q = P(Pl.x / S + Math.sin(Pl.yaw) * 12, Pl.z / S + Math.cos(Pl.yaw) * 12, 0.5); ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke(); }
    { const p = P(Pl.x / S, Pl.z / S, 0); ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#f2ead8'; ctx.fillText('TÚ', p[0], p[1] - 26); }
    // grietas secretas (con el mapa, también las de las vecinas)
    for (const e of list) { const r = e.r; if (r.secret && (r.secret.found || rev)) { const p = P(r.secret.x / S, r.secret.z / S, 8); drawIcon(ctx, 'secret', p[0], p[1], 18, '#c79bff'); } }
    // icono de cada vecina con su previsión
    for (const e of list) if (e.nb) {
      const r = e.r, nb = e.nb, c = (T[nb.type] || T.normal).color;
      const p = P(ccx(r), ccz(r), 34);
      drawIcon(ctx, nb.type, p[0], p[1], 30, shade(c, 1));
      if (nb.door.goldLock) drawIcon(ctx, 'lock', p[0] + 20, p[1] - 10, 16);
      if (rt && rt.side === nb.side) drawIcon(ctx, 'route', p[0] - 22, p[1] - 12, 18, '#ffd23f');
      if (rev && r.fc) {
        const fc = r.fc, row = [];
        if (fc.n) for (let i = 0; i < Math.min(fc.n, 8); i++) row.push(i < (fc.elites || 0) ? 'elite' : 'enemy');
        if (fc.ambush) row.push('ambush');
        if (fc.key) row.push('key');
        if (fc.reward) row.push(fc.reward === 'chest' ? 'chest' : fc.reward === 'rare' ? 'rare' : fc.reward === 'curse' ? 'curse' : 'reward');
        if (fc.gun != null && nb.type === 'shop') row.push(fc.gun ? 'gun' : 'nogun');
        const w = row.length * 13;
        row.forEach((ic, i) => drawIcon(ctx, ic, p[0] - w / 2 + 6 + i * 13, p[1] + 24, 12));
      }
      if (rev && r.name) { ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(240,215,154,0.9)'; ctx.fillText(r.name, p[0], p[1] - 22); }
    }
    // marco
    ctx.strokeStyle = 'rgba(120,96,60,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, Wc - 2, Hc - 2);
  }

  // ---------------- Holograma sobre la mesa del cartógrafo ----------------
  const tmp = [0, 0, 0];
  function holo(batch, game) {
    const r = game.currentRoom;
    if (!r || r.type !== 'map' || !r.features) return;
    const f = r.features.find((x) => x.kind === 'mapTable');
    if (!f) return;
    const t = game.time, rev = studied(game), S = VX.S, T = VX.ROOM_TYPES;
    const fw = DIRS[VX.Room.OPP[r.entrance || 'zn']] || [0, 1];
    const rooms = [{ r, c: [0.4, 0.85, 1] }];
    for (const nb of neighbors(game, r)) if (nb.room && nb.room.grid) rooms.push({ r: nb.room, c: rev ? (T[nb.type] || T.normal).color : [0.4, 0.85, 1], nb });
    // escala: que todo quepa en ~1,6 m
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const e of rooms) { x0 = Math.min(x0, e.r.ox); x1 = Math.max(x1, e.r.ox + e.r.W); z0 = Math.min(z0, e.r.oz); z1 = Math.max(z1, e.r.oz + e.r.D); }
    const sc = 1.25 / Math.max(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const q = M.qMul(M.qY(Math.atan2(fw[0], fw[1]) + Math.sin(t * 0.25) * 0.3), M.qX(-0.55));   // inclinada hacia quien entra
    const by = f.y + 1.0 + Math.sin(t * 1.3) * 0.02;
    const flick = 0.85 + Math.sin(t * 9) * 0.05 + (Math.random() < 0.02 ? -0.3 : 0);
    for (const e of rooms) {
      const B = roomBlocks(e.r), k = B.k, s = k * sc;
      for (const bl of B.blocks) {
        if (bl.kind === 'pit') continue;
        const lx = (e.r.ox + bl.x + k / 2 - cx) * sc, lz = (e.r.oz + bl.z + k / 2 - cz) * sc;
        const h = bl.h * s * 0.7;
        M.qRot(q, lx, h / 2, lz, tmp);
        const scan = 0.6 + 0.4 * Math.sin(t * 3 - (lx + lz) * 6);
        const c = e.c, br = (bl.kind === 'floor' ? 0.55 : 0.95) * flick * scan;
        batch.rbox(f.x + tmp[0], by + tmp[1], f.z + tmp[2], s * 0.9, Math.max(0.01, h), s * 0.9, q, c[0] * br, c[1] * br, c[2] * br, 0.9);
      }
    }
    // tú: un punto blanco que late
    const P = game.player; M.qRot(q, (P.x / S - cx) * sc, 0.06, (P.z / S - cz) * sc, tmp);
    const pz = 0.025 + Math.sin(t * 6) * 0.008;
    batch.rbox(f.x + tmp[0], by + tmp[1], f.z + tmp[2], pz, pz * 2, pz, q, 1, 1, 1, 1);
    // proyector: un cristal pequeño en la mesa y el cono de luz que sube
    batch.rbox(f.x, f.y + 0.08, f.z, 0.14, 0.12, 0.14, q, 0.35, 0.85, 1, 1);
    batch.rbox(f.x, f.y + 0.02, f.z, 0.22, 0.04, 0.22, q, 0.25, 0.22, 0.2, 0);
    for (let i = 0; i < 7; i++) { const w = 0.03 + i * 0.07; batch.rbox(f.x, f.y + 0.18 + i * 0.1, f.z, w, 0.015, w, q, 0.2 * flick, 0.5 * flick, 0.7, 0.4); }
  }

  VX.Carto = { sprite, icon, iconURL, drawIcon, neighbors, route, bossInfo, drawIso, holo, roomBlocks, studied };
})();
