// Oro, objetos de mejora y artículos de la tienda.
(function () {
  const M = VX.M;
  const tmp = [0, 0, 0];

  const SHAPES = {
    heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
    plus: ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],
    bullet: ['..X..', '.XXX.', '.XXX.', '.XXX.', '.XXX.'],
    bolt: ['...XX', '..XX.', '.XXXX', '..XX.', '.XX..'],
    arrow: ['..X..', '.XXX.', 'X.X.X', '..X..', '..X..'],
    star: ['X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X'],
    scroll: ['XXXXX', 'X.X.X', 'XX.XX', 'X.X.X', 'XXXXX'],
    boot: ['.XX..', '.XX..', '.XX..', '.XXXX', '.XXXX'],
    clock: ['.XXX.', 'X.X.X', 'X.XXX', 'X...X', '.XXX.'],
    multi: ['X...X', '.....', '..X..', '.....', 'X...X'],
    mag: ['XXXX.', 'XXXX.', '.XXX.', '.XXX.', '..XX.'],
    pierce: ['.....', '...X.', 'XXXXX', '...X.', '.....'],
    eye: ['.....', '.XXX.', 'XX.XX', '.XXX.', '.....'],
    crystal: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
    auto: ['XXXX.', 'XX...', 'XXXX.', 'XX...', 'XXXX.'],
    skull: ['.XXX.', 'XXXXX', 'X.X.X', 'XXXXX', '.X.X.'],
    coin: ['.XXX.', 'XX.XX', 'X.X.X', 'XX.XX', '.XXX.'],
    chest: ['.XXX.', 'XXXXX', 'XX.XX', 'XXXXX', 'XXXXX'],
    key: ['.XXX.', '.X.X.', '.XXX.', '..X..', '..XX.'],
    grenade: ['..XX.', '.XX.X', 'XXXX.', 'XXXX.', '.XX..'],
    bottle: ['..X..', '..X..', '.XXX.', '.XXX.', '.XXX.'],
    decoy: ['X...X', '.X.X.', '..X..', '.XXX.', '.XXX.'],
    scope: ['.....', 'XXXXX', 'X.X.X', 'XXXXX', '..X..'],
    blade: ['....X', '...X.', '..X..', 'XX...', 'X....'],
    flame: ['..X..', '.XX..', '.XXX.', 'XXXXX', '.XXX.'],
    drop: ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.XXX.'],
    bell: ['..X..', '.XXX.', '.XXX.', 'XXXXX', '..X..'],
  };
  // Precalcular offsets
  const SHAPE_VOX = {};
  for (const k in SHAPES) {
    const rows = SHAPES[k], out = [];
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === 'X') {
        out.push([i - 2, 2 - j, -0.5]); out.push([i - 2, 2 - j, 0.5]);
      }
    });
    SHAPE_VOX[k] = out;
  }

  // ---------------- Objetos en 3D (0.41) ----------------
  // En vez de un icono plano, cada objeto es una pieza de vóxeles con volumen, en el mismo estilo
  // robusto que las armas: botiquín con asa, caja de munición con balas, llave de verdad, granada
  // de piña, molotov con la mecha encendida, pergamino, cofre con herrajes… Las mejoras van en un
  // medallón de hierro (dorado si es rara) con su símbolo dentro.
  const MODEL_CACHE = {};
  function build(fn) {
    const V = new Map();
    const put = (x, y, z, c, e = 0) => V.set(x + ',' + y + ',' + z, [x, y, z, c[0], c[1], c[2], e]);
    const box = (x0, y0, z0, x1, y1, z1, col, e = 0, shell = false) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (shell && x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) continue;
        const cc = typeof col === 'function' ? col(x, y, z) : col;
        if (cc) put(x, y, z, cc, e);
      }
    };
    fn(put, box);
    const out = [...V.values()];
    let mx = 0, mz = 0, my = 1e9;
    for (const v of out) { mx += v[0]; mz += v[2]; my = Math.min(my, v[1]); }
    mx /= out.length; mz /= out.length;
    for (const v of out) { v[0] -= mx; v[2] -= mz; v[1] -= my; }
    return out;
  }
  const J = (c, x, y, z, a = 0.08) => { const h = (M.hash3(x, y * 3, z * 7) - 0.5) * a; return [c[0] + h, c[1] + h, c[2] + h]; };
  const IRON = [0.28, 0.28, 0.31], DIRON = [0.16, 0.16, 0.18], BRASS = [0.85, 0.64, 0.25], WOOD = [0.42, 0.26, 0.13];
  const ITEM_MODELS = {
    medkit: () => build((put, box) => {
      const R = [0.72, 0.1, 0.1];
      box(-6, 0, -3, 6, 7, 3, (x, y, z) => (Math.abs(x) === 6 && (y === 0 || y === 7)) || ((y === 0 || y === 7) && Math.abs(z) === 3) ? [0.5, 0.06, 0.06] : y === 5 ? [0.55, 0.07, 0.07] : J(R, x, y, z));
      for (const z of [-4, 4]) { box(-1, 2, z, 1, 6, z, [0.95, 0.95, 0.92]); box(-3, 3, z, 3, 5, z, [0.95, 0.95, 0.92]); }   // cruz blanca
      box(-3, 8, -1, -3, 9, 1, DIRON); box(3, 8, -1, 3, 9, 1, DIRON); box(-3, 10, -1, 3, 10, 1, [0.2, 0.2, 0.22]);   // asa
      for (const x of [-5, 5]) box(x, 5, -4, x, 6, -4, [0.7, 0.7, 0.72]), box(x, 5, 4, x, 6, 4, [0.7, 0.7, 0.72]);   // cierres
    }),
    ammo: () => build((put, box) => {
      const O = [0.3, 0.34, 0.18];
      box(-6, 0, -3, 6, 6, 3, (x, y, z) => y === 4 ? [0.2, 0.22, 0.12] : (Math.abs(x) === 6 && Math.abs(z) === 3) ? [0.22, 0.25, 0.13] : J(O, x, y, z, 0.05));
      box(-4, 2, -4, 4, 2, -4, [0.85, 0.7, 0.15]); box(-4, 2, 4, 4, 2, 4, [0.85, 0.7, 0.15]);   // franja amarilla
      box(-1, 7, -1, 1, 7, 1, DIRON);   // asa
      for (let i = 0; i < 5; i++) { const x = -4 + i * 2; box(x, 7, 0, x, 9, 0, BRASS); put(x, 10, 0, [0.72, 0.38, 0.18]); }   // balas
    }),
    key: (col) => build((put, box) => {
      const C = col;
      for (let x = -3; x <= 3; x++) for (let y = 8; y <= 14; y++) { const d = Math.hypot(x, y - 11); if (d <= 3.4 && d >= 1.6) for (const z of [0, 1]) put(x, y, z, J(C, x, y, z, 0.1)); }   // ojo
      put(0, 11, 0, [1, 1, 1], 1); put(0, 11, 1, [1, 1, 1], 1);   // gema que brilla
      box(-1, 1, 0, 0, 7, 1, (x, y, z) => J(C, x, y, z, 0.1));   // caña
      box(1, 1, 0, 2, 2, 1, C); box(1, 4, 0, 3, 5, 1, C);        // dientes
      box(-2, 7, 0, 1, 7, 1, (x, y, z) => J(C, x, y, z, 0.2));
    }),
    frag: () => build((put, box) => {
      const O = [0.32, 0.38, 0.2];
      for (let x = -3; x <= 3; x++) for (let y = 0; y <= 8; y++) for (let z = -3; z <= 3; z++) {
        const d = Math.hypot(x / 3.4, (y - 4) / 4.4, z / 3.4);
        if (d > 1) continue;
        put(x, y, z, (y % 2 === 0 || (x + z) % 3 === 0) && d > 0.75 ? [0.2, 0.24, 0.12] : J(O, x, y, z, 0.06));
      }
      box(-1, 9, -1, 1, 10, 1, IRON); box(-1, 11, -1, 1, 11, 1, DIRON);   // espoleta
      box(2, 5, 0, 2, 10, 0, [0.5, 0.5, 0.52]); put(2, 10, 0, [0.5, 0.5, 0.52]); put(1, 10, 0, [0.5, 0.5, 0.52]);   // palanca
      for (const [x, y] of [[-2, 10], [-3, 10], [-3, 9], [-3, 8], [-2, 8]]) put(x, y, 0, BRASS);   // anilla
    }),
    molotov: () => build((put, box) => {
      const G = [0.22, 0.45, 0.22];
      box(-2, 0, -2, 2, 6, 2, (x, y, z) => (Math.abs(x) < 2 && Math.abs(z) < 2) ? [0.85, 0.5, 0.1] : y > 4 ? J(G, x, y, z) : J(mix3(G, [0.85, 0.5, 0.1], 0.45), x, y, z), 0.15);
      box(-1, 7, -1, 1, 9, 1, (x, y, z) => J(G, x, y, z), 0.1);
      box(-1, 10, -1, 1, 11, 1, [0.85, 0.8, 0.68]); put(0, 12, 0, [0.85, 0.8, 0.68]); put(1, 12, 0, [0.85, 0.8, 0.68]);   // trapo
      put(0, 13, 0, [1, 0.6, 0.15], 1); put(1, 13, 0, [1, 0.85, 0.3], 1); put(0, 14, 0, [1, 0.45, 0.1], 1);   // llama
    }),
    decoy: () => build((put, box) => {
      box(-3, 0, -2, 3, 4, 2, (x, y, z) => (y === 4 || Math.abs(x) === 3) ? [0.18, 0.18, 0.2] : J([0.3, 0.3, 0.33], x, y, z));
      box(-2, 1, 3, 2, 3, 3, (x, y) => (y === 2 && x !== 0) ? [0.1, 0.1, 0.1] : [0.2, 0.2, 0.22]);   // altavoz
      put(2, 5, 0, [1, 0.15, 0.1], 1);   // piloto rojo
      box(-2, 5, 0, -2, 10, 0, [0.15, 0.15, 0.15]); put(-2, 11, 0, [1, 0.2, 0.15], 0.8);   // antena
    }),
    scope: () => build((put, box) => {
      for (let x = -6; x <= 6; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
        const r = Math.hypot(y, z), rr = Math.abs(x) >= 5 ? 2.4 : 1.8;
        if (r > rr) continue;
        if (Math.abs(x) === 6 && r < 1.2) put(x, y + 4, z, [0.3, 0.85, 1], 0.9);
        else put(x, y + 4, z, Math.abs(x) === 3 ? [0.3, 0.3, 0.32] : J([0.12, 0.12, 0.14], x, y, z, 0.04));
      }
      box(-1, 6, -1, 1, 7, 1, [0.2, 0.2, 0.22]);   // rueda
      box(-3, 0, -1, -3, 1, 1, DIRON); box(3, 0, -1, 3, 1, 1, DIRON); box(-4, 0, -1, 4, 0, 1, DIRON);   // montura
    }),
    scroll: () => build((put, box) => {
      const P = [0.85, 0.75, 0.52];
      for (let x = -5; x <= 5; x++) for (let y = 0; y <= 4; y++) for (let z = -2; z <= 2; z++) {
        if (Math.hypot(y - 2, z) > 2.4) continue;
        put(x, y, z, Math.abs(x) === 5 ? WOOD : x === 0 || x === 1 ? [0.7, 0.12, 0.1] : J(P, x, y, z, 0.07));
      }
      box(-7, 1, -1, -6, 3, 1, [0.32, 0.2, 0.1]); box(6, 1, -1, 7, 3, 1, [0.32, 0.2, 0.1]);   // pomos
      put(0, -1, 2, [0.7, 0.12, 0.1]); put(1, -2, 2, [0.7, 0.12, 0.1]);   // cinta colgando
      box(-4, 0, 3, 3, 0, 3, (x) => J(P, x, 0, 3, 0.07));   // borde desenrollado
    }),
    chest: () => build((put, box) => {
      box(-6, 0, -4, 6, 6, 4, (x, y, z) => (Math.abs(x) === 6 || x === 0 || y === 0) ? J(IRON, x, y, z, 0.05) : J(WOOD, x, y, z, 0.1));
      for (let x = -6; x <= 6; x++) for (let y = 7; y <= 9; y++) for (let z = -4; z <= 4; z++) {   // tapa abombada
        if (Math.hypot((y - 6) / 3.2, z / 4.6) > 1) continue;
        put(x, y, z, (Math.abs(x) === 6 || x === 0) ? J(IRON, x, y, z, 0.05) : J(mul3(WOOD, 1.1), x, y, z, 0.1));
      }
      box(-1, 5, 5, 1, 7, 5, BRASS, 0.25); put(0, 5, 5, [0.15, 0.1, 0.05]);   // cerradura
    }),
    crystal: () => build((put, box) => {
      box(-4, 0, -4, 4, 1, 4, (x, y, z) => (Math.abs(x) === 4 && Math.abs(z) === 4) ? null : J([0.32, 0.3, 0.34], x, y, z, 0.1));
      const spike = (cx, cz, h, r) => { for (let y = 0; y < h; y++) { const rr = r * (y < h * 0.6 ? 1 : (h - y) / (h * 0.4)); for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) + Math.abs(z) <= rr) put(cx + x, y + 2, cz + z, mix3([0.3, 0.8, 1], [0.8, 1, 1], y / h), 0.75); } };
      spike(0, 0, 11, 1.6); spike(-2, 1, 6, 1.1); spike(2, -1, 7, 1.1);
    }),
  };
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul3(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  // medallón para las mejoras: aro de hierro (oro si es rara) y el símbolo dentro
  function medallion(shape, color, rare) {
    return build((put) => {
      const rim = rare ? [0.95, 0.72, 0.2] : [0.32, 0.31, 0.34];
      for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) {
        const d = Math.hypot(x, y);
        if (d > 5.4 || d < 4.2) continue;
        for (const z of [0, 1]) put(x, y + 5, z, J(rim, x, y, z, rare ? 0.08 : 0.06), rare ? 0.25 : 0);
      }
      for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) put(Math.round(Math.cos(a) * 4.8), Math.round(Math.sin(a) * 4.8) + 5, 2, rare ? [1, 0.9, 0.5] : [0.5, 0.5, 0.55], rare ? 0.6 : 0);   // remaches
      const rows = SHAPES[shape] || SHAPES.star;
      rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') for (const z of [0, 1]) put(i - 2, 2 - j + 5, z, color, 0.6); });
    });
  }
  function itemModel(it) {
    if (VX.OLD_ITEMS) return null;
    let key = null, make = null;
    if (it.kind === 'heal') key = 'medkit';
    else if (it.kind === 'refill') key = 'ammo';
    else if (it.kind === 'key') { key = 'key:' + it.color3; make = () => ITEM_MODELS.key({ wood: [0.46, 0.29, 0.14], silver: [0.62, 0.64, 0.7], gold: [0.85, 0.6, 0.17] }[it.color3] || [0.85, 0.6, 0.17]); }
    else if (it.kind === 'map') key = 'scroll';
    else if (it.kind === 'chest') key = 'chest';
    else if (it.kind === 'rest') key = 'crystal';
    else if (it.kind === 'throw') key = it.type === 'molotov' ? 'molotov' : it.type === 'decoy' ? 'decoy' : 'frag';
    else if (it.kind === 'attach') key = 'scope';
    else if (it.kind === 'upgrade' || it.kind === 'offering' || it.kind === 'restock' || it.kind === 'mystery') {
      const rare = !!(it.up && (it.up.rare || it.up.curse === undefined && it.title && it.title.includes('★')));
      key = 'med:' + it.shape + ':' + (it.color || []).join(',') + (rare ? ':r' : '');
      make = () => medallion(it.shape, it.color || [1, 1, 1], rare);
    }
    if (!key) return null;
    if (!MODEL_CACHE[key]) MODEL_CACHE[key] = make ? make() : ITEM_MODELS[key]();
    return MODEL_CACHE[key];
  }

  class Pickups {
    constructor() { this.gold = []; this.items = []; this.focus = null; }

    clear() { this.gold = []; this.items = []; this.focus = null; }

    dropGold(x, y, z, n) {
      for (let i = 0; i < n; i++) {
        this.gold.push({
          x, y, z, vx: M.rand(-2.5, 2.5), vy: M.rand(3, 6), vz: M.rand(-2.5, 2.5),
          t: M.rand(0, 6), value: 1, delay: 0.5,
        });
      }
    }

    // Caja de munición (modo Horda): reparte balas a todas las armas
    dropAmmo(x, y, z, frac = 1) {
      this.gold.push({ x, y, z, vx: M.rand(-1.5, 1.5), vy: M.rand(3, 5), vz: M.rand(-1.5, 1.5), t: M.rand(0, 6), value: 0, ammo: frac, delay: 0.5 });
    }

    // Corazón pequeño (cura al recogerlo)
    dropHeart(x, y, z, amount = 10) {
      this.gold.push({ x, y, z, vx: M.rand(-1.5, 1.5), vy: M.rand(3, 5), vz: M.rand(-1.5, 1.5), t: 0, value: 0, heal: amount, delay: 0.5 });
    }

    // item: { kind:'upgrade'|'heal', up?, price, x,y,z, title, desc, color, shape }
    addItem(item) {
      // bendición «Regateo» del Santuario
      if (item.price > 0 && VX.game && VX.game.priceMul) item.price = Math.max(1, Math.round(item.price * VX.game.priceMul));
      item.t = M.rand(0, 6);
      item.taken = false;
      this.items.push(item);
      return item;
    }

    update(dt, game) {
      const P = game.player;
      const ex = P.x, ey = P.y + 0.9, ez = P.z;
      // --- Oro ---
      for (let i = this.gold.length - 1; i >= 0; i--) {
        const g = this.gold[i];
        g.t += dt; g.delay -= dt;
        const dx = ex - g.x, dy = ey - g.y, dz = ez - g.z, d = Math.hypot(dx, dy, dz);
        const homing = g.delay <= 0 && (g.homing || d < 3.6 + game.player.magnet);
        if (homing) {
          // atraída hacia el jugador: vuela directa (atraviesa lo que haya en medio, no se queda pegada en el aire)
          const pull = 14 / Math.max(d, 0.3);
          g.vx += (dx / d) * pull * dt * 6; g.vy += (dy / d) * pull * dt * 6; g.vz += (dz / d) * pull * dt * 6;
          g.vx *= 0.9; g.vy *= 0.9; g.vz *= 0.9;
          g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.rest = false;
        } else {
          if (!g.rest) g.vy -= 18 * dt;
          const nx = g.x + g.vx * dt, nz = g.z + g.vz * dt;
          if (!game.world.isSolidAt(nx, g.y, g.z)) g.x = nx; else g.vx *= -0.4;
          if (!game.world.isSolidAt(g.x, g.y, nz)) g.z = nz; else g.vz *= -0.4;
          g.y += g.vy * dt;
          const gr = game.world.groundAt(g.x, g.z) + (g.heal || g.ammo ? 0.05 : 0.015);
          if (g.y <= gr) {
            // cae al suelo (si quedó dentro de algo, sube a su superficie) y se queda quieta
            g.y = gr;
            if (Math.abs(g.vy) < 2.2) { g.vy = 0; g.vx *= 0.5; g.vz *= 0.5; if (Math.hypot(g.vx, g.vz) < 0.15) { g.rest = true; g.vx = g.vz = 0; } }
            else { g.vy *= -0.35; g.vx *= 0.7; g.vz *= 0.7; }
          } else if (g.rest && g.y > gr + 0.02) g.rest = false;   // lo de debajo se rompió: vuelve a caer
        }
        if (g.delay <= 0 && d < 0.7) {
          this.gold.splice(i, 1);
          if (g.heal) { game.player.heal(g.heal); VX.Audio.orb(); game.hud.toast(`+${g.heal} de vida`); continue; }
          if (g.ammo) {
            if (game.weapon.addAmmo(g.ammo)) { VX.Audio.reload(); game.hud.toast('+munición'); }
            else { VX.Audio.click(); game.hud.toast('Munición al máximo'); }
            continue;
          }
          game.stats.gold += g.value; game.stats.totalGold += g.value;
          if (game.weapon.mods.goldHeal) game.player.heal(1);
          VX.Audio.gold();
          game.hud.pulseGold();
        }
      }

      // --- Objetos ---
      this.focus = null;
      let best = 2.0;
      for (const it of this.items) {
        if (it.taken) continue;
        it.t += dt;
        if (it.fall) {   // llave que cae (de un zombi o de una vasija rota)
          it.vy = (it.vy || 0) - 14 * dt; it.y += it.vy * dt;
          const gnd = game.world.groundAt(it.x, it.z);
          if (it.y <= gnd) { it.y = gnd; if (it.vy < -3) { it.vy *= -0.3; } else { it.fall = false; it.vy = 0; } }
        }
        const d = Math.hypot(it.x - P.x, it.z - P.z);
        if (d < best) { best = d; this.focus = it; }
      }
      if (this.focus && VX.Input.wasPressed(VX.Settings.key('use'))) this.interact(this.focus, game);
      this.items = this.items.filter((i) => !i.taken);
    }

    interact(it, game) {
      if (it.kind === 'rest') {
        it.taken = true;
        game.player.heal(Math.round(game.player.maxHp * 0.35));
        VX.Audio.save();
        game.hud.banner('DESCANSAS', 'El cristal cierra tus heridas (+35% de vida)', 3);
        for (let i = 0; i < 40; i++)
          game.particles.spawn(it.x, it.y, it.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), 0.4, 0.9, 1, 0.05, M.rand(0.6, 1.4), 1);
        return;
      }
      if (it.kind === 'stairs') { it.taken = true; game.enterSecret(); return; }
      if (it.kind === 'perk') { VX.HordeMode.buyPerk(game, it); return; }
      if (it.kind === 'secretChest') {
        it.taken = true;
        const p = it.prop, top = p.oy + p.h * VX.PV;
        VX.Audio.reward(); VX.Audio.door && VX.Audio.door();
        // la tapa salta por los aires
        p.blast(p.cx, top - 0.05, p.cz, 0.22, 25, game);
        for (let i = 0; i < 30; i++) game.particles.spawn(p.cx, top, p.cz, M.rand(-1.5, 1.5), M.rand(2, 5), M.rand(-1.5, 1.5), 1, 0.8, 0.3, 0.04, M.rand(0.6, 1.4), 1, 1);
        const tier = it.tier;   // cofre de cerradura: el botín depende de la llave usada
        const thr = () => { const ty = VX.Throw && VX.Throw.randomType(game.weapon); if (ty) this.addItem({ ...VX.Throw.item(ty, 1, 0), x: p.cx + M.rand(-0.4, 0.4), y: top + 0.2, z: p.cz + M.rand(-0.4, 0.4) }); };
        const upg = (kind) => { const up = VX.Upgrades.random(1, game, [], kind)[0]; if (up) this.addItem({ kind: 'upgrade', up, price: 0, x: p.cx, y: top + 0.3, z: p.cz, title: up.name + (up.rare ? ' ★ RARA' : ''), desc: up.desc, color: up.color, shape: up.shape }); };
        if (tier === 'wood') {
          this.dropGold(p.cx, top + 0.2, p.cz, M.randInt(8, 14));
          if (Math.random() < 0.5) this.dropHeart(p.cx, top + 0.3, p.cz, 15); else thr();
          game.hud.toast('Cofre de madera: un poco de botín');
        } else if (tier === 'silver') {
          this.dropGold(p.cx, top + 0.2, p.cz, M.randInt(15, 24));
          this.dropHeart(p.cx, top + 0.3, p.cz, 25);
          upg('normal');
          game.hud.toast('Cofre de plata: ¡buen botín!');
        } else if (tier === 'gold') {
          this.dropGold(p.cx, top + 0.2, p.cz, M.randInt(28, 40));
          this.dropHeart(p.cx, top + 0.3, p.cz, 30);
          upg('rare');
          if (Math.random() < 0.5) thr();
          game.hud.toast('¡Cofre de oro: gran tesoro!');
        } else {
          this.dropGold(p.cx, top + 0.2, p.cz, M.randInt(18, 28));
          this.dropHeart(p.cx, top + 0.3, p.cz, 25);
          upg(Math.random() < 0.5 ? 'rare' : 'normal');
          game.hud.toast('¡Tesoro!');
        }
        return;
      }
      if (it.kind === 'key') { it.taken = true; game.takeKey(it.color3); return; }
      if (it.kind === 'lockdoor') { game.tryVault(it); return; }
      if (it.kind === 'map') { it.taken = true; game.studyMap(); return; }
      if (it.kind === 'supply') { it.taken = true; VX.HordeMode.openSupply(game, it); return; }
      if (it.kind === 'evac') { it.taken = true; VX.HordeMode.callEvac(game); return; }
      if (it.kind === 'chest') {
        it.taken = true;
        if (it.mimic) {
          // ¡era un mímico!
          VX.Audio.roar(); game.shake(0.5);
          const z = new VX.Zombie('mimic', it.x, it.z, game.floor, { y: game.world.groundAt(it.x, it.z) });
          z.spawnT = 0; game.enemies.push(z);
          const r = game.currentRoom; r.cleared = false; r.pendingWaves = 0;
          game.hud.banner('¡ERA UN MÍMICO!', 'Mátalo y escupirá su tesoro', 2.5);
        } else {
          VX.Audio.reward();
          const up = VX.Upgrades.random(1, game, [], Math.random() < 0.5 ? 'rare' : 'normal')[0];
          if (up) this.addItem({ kind: 'upgrade', up, price: 0, x: it.x, y: it.y + 0.2, z: it.z, title: up.name + (up.rare ? ' ★ RARA' : ''), desc: up.desc, color: up.color, shape: up.shape });
          game.pickups.dropGold(it.x, it.y + 0.5, it.z, 8 + game.floor);
          // y a veces un accesorio o algo para lanzar
          const tt = VX.Throw.randomType(game.weapon), ex = Math.random() < 0.5 || !tt ? VX.Throw.attachItem(game.weapon, 0) : VX.Throw.item(tt, 2, 0);
          if (ex) this.addItem({ ...ex, x: it.x + 0.7, y: it.y + 0.2, z: it.z });
          game.hud.banner('COFRE', 'Dentro había algo útil', 2);
        }
        return;
      }
      if (it.price > game.stats.gold) {
        VX.Audio.deny();
        game.hud.toast('No tienes suficiente oro');
        return;
      }
      game.stats.gold -= it.price;
      it.taken = true;
      if (it.kind === 'restock') {
        // campana del vendedor: repone el género (se puede usar las veces que diga el Santuario)
        VX.Audio.buy(); VX.Audio.gold();
        game.spawner.restockShop(game, it.shopRoom || game.currentRoom);
        it.uses = (it.uses || 1) - 1;
        if (it.uses > 0) { it.taken = false; it.basePrice = Math.round((it.basePrice || it.price) * 1.6); it.price = Math.round(it.price * 1.6); it.desc = `El vendedor repone todo el género (queda ${it.uses})`; }
        game.hud.banner('¡GÉNERO NUEVO!', 'El vendedor ha repuesto los altares', 2.2);
      } else if (it.kind === 'mystery') {
        // caja misteriosa: normal, rara o maldita
        const r = Math.random(), kind = r < 0.6 ? 'normal' : r < 0.88 ? 'rare' : 'curse';
        const up = VX.Upgrades.random(1, game, [], kind, true)[0];
        VX.Audio.reward();
        if (up) {
          const tag = up.rare ? ' ★ RARA' : up.curse ? ' ☠ MALDITA' : '';
          if (up.curse) { up.apply(game); VX.Profile.codexUp(up.id); game.upgradesTaken.push(up); game.hud.banner('¡MALDICIÓN!', `La caja traía «${up.name}»: ${up.desc}`, 3.5); game.hud.refreshUpgrades(game); VX.Audio.deny(); }
          else this.addItem({ kind: 'upgrade', up, price: 0, x: it.x, y: it.y + 0.2, z: it.z, title: up.name + tag, desc: up.desc, color: up.color, shape: up.shape });
        }
      } else if (it.kind === 'offering') {
        VX.Profile.add('essence', it.essence);
        VX.Profile.save();
        game.essenceBanked = (game.essenceBanked || 0) + it.essence;
        VX.Audio.reward();
        game.hud.banner('OFRENDA ACEPTADA', `+${it.essence} de esencia (ya es tuya aunque caigas)`, 3);
        if (it.again) { it.taken = false; it.price = Math.round(it.price * 1.5); it.basePrice = it.price; }   // altar de las almas: se repite, más caro
      } else if (it.kind === 'weapon') {
        const r = game.weapon.giveWeapon(it.weapon);
        const name = VX.Weapons.DEFS[it.weapon].name;
        VX.Audio.upgrade();
        if (r === 'refill') game.hud.banner(name.toUpperCase(), 'Cargador lleno');
        else if (r === 'added') game.hud.banner('NUEVA ARMA: ' + name.toUpperCase(), 'Cambia de arma con 1·2·3, la rueda o Q');
        else game.hud.banner('NUEVA ARMA: ' + name.toUpperCase(), `Sustituye a: ${VX.Weapons.DEFS[r].name}`);
        if (it.onTake) it.onTake(game);
      } else if (it.kind === 'throw') {
        VX.Throw.give(game, it.type, it.n || 1);
        if (it.price > 0) VX.Audio.buy();
      } else if (it.kind === 'attach') {
        const g = game.weapon.giveAttach(it.att, game);
        if (!g) { game.stats.gold += it.price; it.taken = false; VX.Audio.deny(); game.hud.toast('No le cabe a ninguna de tus armas'); return; }
        VX.Audio.upgrade(); if (it.price > 0) VX.Audio.buy();
      } else if (it.kind === 'refill') {
        game.weapon.refillAll();
        VX.Audio.buy(); VX.Audio.reload();
        game.hud.banner('MUNICIÓN COMPLETA', 'Cargadores y reservas a tope', 2.2);
      } else if (it.kind === 'heal') {
        if (game.weapon.mods.berserkPact) { game.hud.toast('El Pacto del berserker no te deja usar botiquines'); }
        else game.player.heal(it.amount);
        VX.Audio.buy();
        game.hud.toast(`+${it.amount} de vida`);
      } else {
        it.up.apply(game);
        VX.Profile.codexUp(it.up.id);
        game.upgradesTaken.push(it.up);
        VX.Upgrades.checkSynergies(game);
        game.weapon.accent = it.up.color.slice();
        if (it.price > 0) VX.Audio.buy();
        VX.Audio.upgrade();
        game.hud.banner(it.up.name.toUpperCase(), it.up.desc);
        game.hud.refreshUpgrades(game);
        if (it.onTake) it.onTake(game);
      }
      for (let i = 0; i < 24; i++)
        game.particles.spawn(it.x, it.y + 0.5, it.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), it.color[0], it.color[1], it.color[2], 0.07, M.rand(0.5, 1), 1);
    }

    render(batch) {
      // Monedas
      for (const g of this.gold) {
        const q = M.qY(g.t * 4);
        if (g.heal) {
          // corazón de vóxeles
          const s = 0.035, by = g.y + 0.05 + Math.sin(g.t * 3) * 0.03;
          for (const [a, b] of [[-1, 1], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) {
            M.qRot(q, a * s, b * s, 0, tmp);
            batch.rbox(g.x + tmp[0], by + tmp[1], g.z + tmp[2], s, s, s, q, 1, 0.15, 0.2, 0.8);
          }
          continue;
        }
        if (g.ammo) {
          // caja de munición: verde oliva con las puntas de las balas asomando
          const by = g.y + 0.05 + Math.sin(g.t * 3) * 0.03;
          batch.rbox(g.x, by, g.z, 0.2, 0.13, 0.12, q, 0.24, 0.28, 0.14, 0.12);
          for (let k = -2; k <= 2; k++) { M.qRot(q, k * 0.035, 0.085, 0, tmp); batch.rbox(g.x + tmp[0], by + tmp[1], g.z + tmp[2], 0.025, 0.05, 0.025, q, 0.85, 0.65, 0.25, 0.5); }
          continue;
        }
        // moneda: disco octogonal con canto y relieve; gira en el aire y reposa plana en el suelo
        const cq = g.rest ? M.qMul(M.qY(g.spin || (g.spin = Math.random() * 6)), M.qX(Math.PI / 2)) : M.qMul(M.qY(g.t * 5), M.qX(g.t * 7));
        const cy = g.rest ? g.y + 0.014 : g.y;
        batch.rbox(g.x, cy, g.z, 0.17, 0.115, 0.028, cq, 0.95, 0.72, 0.14, 0.35);
        batch.rbox(g.x, cy, g.z, 0.115, 0.17, 0.028, cq, 0.95, 0.72, 0.14, 0.35);
        M.qRot(cq, 0, 0, 0.012, tmp);
        batch.rbox(g.x + tmp[0], cy + tmp[1], g.z + tmp[2], 0.075, 0.075, 0.012, cq, 0.75, 0.52, 0.08, 0.25);
        M.qRot(cq, 0, 0, -0.012, tmp);
        batch.rbox(g.x + tmp[0], cy + tmp[1], g.z + tmp[2], 0.075, 0.075, 0.012, cq, 0.75, 0.52, 0.08, 0.25);
      }
      // Objetos flotantes
      for (const it of this.items) {
        if (it.kind === 'weapon') { this.renderWeapon(batch, it); continue; }
        if (it.kind === 'supply') { this.renderSupply(batch, it); continue; }
        if (it.kind === 'secretChest' || it.kind === 'perk' || it.kind === 'lockdoor') continue;   // se ve el propio cofre / la máquina / la reja
        if (it.kind === 'stairs') {
          // foso con escalones de piedra que bajan hacia la pared y se pierden en la oscuridad
          const dx = it.dx, dz = it.dz, L = it.L || 1.6, Wd = it.Wd || 0.8, n = 7;
          const ax = dx !== 0 ? 0 : 1, az = dz !== 0 ? 0 : 1;
          const Pt = (t, a) => [it.fx - dx * t + ax * a, it.fz - dz * t + az * a];
          for (let i = 0; i < n; i++) {
            const t = L - (i + 0.5) * (L / n), top = -0.28 * (i + 1), k = 0.75 - i * 0.09;
            const [cx, cz] = Pt(t, 0), sl = L / n;
            batch.box(cx, top - 1.5, cz, dx ? sl : Wd * 2, 3, dz ? sl : Wd * 2, 0.3 * k, 0.28 * k, 0.3 * k, 0);
            const [ex, ez] = Pt(t + sl * 0.45, 0);
            batch.box(ex, top - 0.02, ez, dx ? 0.06 : Wd * 2, 0.04, dz ? 0.06 : Wd * 2, 0.42 * k, 0.4 * k, 0.42 * k, 0);   // borde del peldaño
          }
          // paredes del foso y fondo oscuro
          for (const sgn of [-1, 1]) { const [sx, sz] = Pt(L / 2, sgn * (Wd + 0.06)); batch.box(sx, -1.3, sz, dx ? L : 0.12, 2.6, dz ? L : 0.12, 0.16, 0.15, 0.17, 0); }
          { const [sx, sz] = Pt(L + 0.06, 0); batch.box(sx, -1.3, sz, dx ? 0.12 : Wd * 2, 2.6, dz ? 0.12 : Wd * 2, 0.16, 0.15, 0.17, 0); }
          { const [bx, bz] = Pt(-0.3, 0); batch.box(bx, -2.6, bz, dx ? 0.8 : Wd * 2, 0.1, dz ? 0.8 : Wd * 2, 0.01, 0.005, 0.015, 0); }
          // brocal alrededor y resplandor violeta que sube del fondo
          for (const sgn of [-1, 1]) { const [sx, sz] = Pt(L / 2, sgn * (Wd + 0.12)); batch.box(sx, 0.05, sz, dx ? L + 0.24 : 0.12, 0.1, dz ? L + 0.24 : 0.12, 0.35, 0.33, 0.36, 0); }
          { const [sx, sz] = Pt(L + 0.12, 0); batch.box(sx, 0.05, sz, dx ? 0.12 : Wd * 2 + 0.24, 0.1, dz ? 0.12 : Wd * 2 + 0.24, 0.35, 0.33, 0.36, 0); }
          const gl = 0.5 + Math.sin(it.t * 3) * 0.3;
          { const [gx, gz] = Pt(0.1, 0); batch.box(gx, -2.0, gz, 0.5, 0.05, 0.5, 0.6 * gl, 0.2 * gl, 1 * gl, 1); }
          if (Math.random() < 0.3 && VX.game) { const [px, pz] = Pt(M.rand(0, L * 0.5), M.rand(-Wd, Wd)); VX.game.particles.spawn(px, -1.2, pz, 0, M.rand(0.5, 1.2), 0, 0.7, 0.3, 1, 0.03, 1.5, 1, 1); }
          continue;
        }
        const mdl = itemModel(it);
        if (mdl) {
          // objeto en 3D: gira despacio y flota; en la tienda, quieto sobre el mostrador
          // tamaño según el objeto (las mejoras y las llaves, algo más pequeñas)
          const vs = (it.kind === 'chest' || it.kind === 'rest' ? 0.034 : it.kind === 'upgrade' || it.kind === 'offering' ? 0.03 : it.kind === 'key' ? 0.028 : 0.032), q = M.qY(it.t * 1.1);
          const by = it.fall ? it.y + 0.05 : it.y + 0.36 + Math.sin(it.t * 2.2) * 0.05;
          for (const o of mdl) {
            M.qRot(q, o[0] * vs, o[1] * vs, o[2] * vs, tmp);
            batch.rbox(it.x + tmp[0], by + tmp[1], it.z + tmp[2], vs, vs, vs, q, o[3], o[4], o[5], Math.max(o[6], 0.12));
          }
          const c = it.color || [1, 1, 1], gl = 0.5 + Math.sin(it.t * 3) * 0.3;
          for (let k = 0; k < 3; k++) {
            const a = it.t * 1.6 + k * Math.PI * 2 / 3;
            batch.box(it.x + Math.cos(a) * 0.34, by + 0.12 + Math.sin(it.t * 3 + k) * 0.1, it.z + Math.sin(a) * 0.34, 0.025, 0.025, 0.025, c[0], c[1], c[2], gl);
          }
          continue;
        }
        const vs = 0.06;
        const q = M.qY(it.t * 1.6);
        const by = it.y + 0.55 + Math.sin(it.t * 2.2) * 0.08;
        const vox = SHAPE_VOX[it.shape] || SHAPE_VOX.star;
        const c = it.color;
        for (const o of vox) {
          M.qRot(q, o[0] * vs, o[1] * vs, o[2] * vs, tmp);
          batch.rbox(it.x + tmp[0], by + tmp[1], it.z + tmp[2], vs, vs, vs, q, c[0], c[1], c[2], 0.55);
        }
        // halo orbitando
        for (let k = 0; k < 4; k++) {
          const a = it.t * 2 + k * Math.PI / 2;
          batch.box(it.x + Math.cos(a) * 0.4, by + Math.sin(it.t * 3 + k) * 0.15, it.z + Math.sin(a) * 0.4, 0.04, 0.04, 0.04, c[0], c[1], c[2], 1);
        }
      }
    }
  }

  // Caja de suministros militar (verde, con cierres y la tapa marcada)
  Pickups.prototype.renderSupply = function (batch, it) {
    const s = 0.05, x0 = it.x, z0 = it.z, y0 = it.y;
    const q = M.qY(it.rot || 0);
    const P = (a, b, c, cr, cg, cb, e = 0) => { M.qRot(q, a * s, b * s, c * s, tmp); batch.rbox(x0 + tmp[0], y0 + tmp[1], z0 + tmp[2], s, s, s, q, cr, cg, cb, e); };
    for (let a = -7; a <= 7; a++) for (let c = -4; c <= 4; c++) for (let b = 0; b < 9; b++) {
      const edge = Math.abs(a) === 7 || Math.abs(c) === 4 || b === 0 || b === 8;
      if (!edge) continue;
      let cr = 0.2, cg = 0.25, cb = 0.12;
      if (b === 6) { cr = 0.12; cg = 0.14; cb = 0.08; }                       // junta de la tapa
      if ((Math.abs(a) === 5 || Math.abs(a) === 6) && (b === 5 || b === 6) && Math.abs(c) === 4) { cr = 0.5; cg = 0.48; cb = 0.42; }   // cierres
      if (b === 8 && Math.abs(a) <= 3 && c === 0) { cr = 0.75; cg = 0.6; cb = 0.15; }   // marca amarilla
      if (b === 8 && a === 0 && Math.abs(c) <= 2) { cr = 0.75; cg = 0.6; cb = 0.15; }
      P(a, b + 0.5, c, cr, cg, cb);
    }
    // resplandor para encontrarla en la oscuridad
    const gl = 0.4 + Math.sin(it.t * 3) * 0.25;
    for (let k = 0; k < 4; k++) {
      const a = it.t * 1.5 + k * Math.PI / 2;
      batch.box(x0 + Math.cos(a) * 0.55, y0 + 0.65 + Math.sin(it.t * 2 + k) * 0.1, z0 + Math.sin(a) * 0.55, 0.04, 0.04, 0.04, 1, 0.85, 0.35, gl);
    }
  };

  // Arma expuesta sobre su pedestal, girando
  Pickups.prototype.renderWeapon = function (batch, it) {
    const model = VX.Weapons.coloredModel(it.weapon, VX.Profile.skinFor(it.weapon));
    const g = 0.022;
    const q = M.qMul(M.qY(it.t * 1.2), M.qZ(0.15));
    const by = it.y + 0.6 + Math.sin(it.t * 2) * 0.06;
    for (const v of model) {
      if (v.tag === 'hand' || v.tag === 'wrist' || v.tag === 'sleeve') continue;
      M.qRot(q, v.x * g, v.y * g, (v.z + 10) * g, tmp);
      batch.rbox(it.x + tmp[0], by + tmp[1], it.z + tmp[2], g, g, g, q, v.r, v.g, v.b, Math.max(v.e, 0.12));
    }
  };

  VX.Pickups = Pickups;
  VX.SHAPES = SHAPES;
  VX.SHAPE_VOX = SHAPE_VOX;
})();
