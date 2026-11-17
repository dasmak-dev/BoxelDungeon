// Definición de armas, modelos vóxel en primera persona y skins.
(function () {
  const M = VX.M;

  // ---------------- Armas ----------------
  // Las estadísticas base se multiplican por las mejoras del jugador (mods).
  const DEFS = {
    knife: {
      art: 'el cuchillo', name: 'Cuchillo', melee: true, damage: 48, fireRate: 2.6, reach: 1.9,
      price: 0, vm: { x: 0.13, y: -0.105, z: -0.29, g: 0.009 },
    },
    hammer: {
      art: 'el mazo', name: 'Mazo de demolición', melee: true, heavy: true, damage: 40, fireRate: 1.1, reach: 2.6, demolish: true,
      price: 85, vm: { x: 0.17, y: -0.2, z: -0.3, g: 0.0095 },
    },
    pistol: {
      shake: 0.12, art: 'la pistola', name: 'Pistola', damage: 24, fireRate: 6, range: 32, mag: 10, reload: 1.25, spread: 0.0104,
      pellets: 1, pierce: 0, destruction: 1, auto: false, recoil: 0.025, recoilPat: { up: 0.0352, side: 0.009 }, kick: 0.035, sound: 1,
      price: 40, vm: { x: 0.14, y: -0.125, z: -0.27, g: 0.0095 }, muzzle: [-0.5, 5.5, -27],
    },
    smg: {
      shake: 0.07, art: 'el subfusil', name: 'Subfusil', damage: 14, fireRate: 12, range: 24, mag: 30, reload: 1.6, spread: 0.0364,
      pellets: 1, pierce: 0, destruction: 0.8, auto: true, recoil: 0.012, recoilPat: { up: 0.0128, side: 0.0075 }, kick: 0.02, sound: 0.7,
      price: 70, vm: { x: 0.15, y: -0.14, z: -0.29, g: 0.0083 }, muzzle: [-0.5, 3.5, -42],
    },
    shotgun: {
      shake: 0.38, art: 'la escopeta', name: 'Escopeta', damage: 12, fireRate: 1.5, range: 16, mag: 6, reload: 2.1, spread: 0.1105,
      pellets: 8, pierce: 0, destruction: 1.25, auto: false, recoil: 0.07, recoilPat: { up: 0.096, side: 0.0225 }, kick: 0.09, sound: 2.2,
      price: 80, vm: { x: 0.15, y: -0.15, z: -0.3, g: 0.0082 }, muzzle: [-0.5, 5.5, -48],
    },
    rifle: {
      shake: 0.32, art: 'el rifle', name: 'Rifle de cerrojo', damage: 90, fireRate: 1.1, range: 70, mag: 5, reload: 2.3, spread: 0.002,
      pellets: 1, pierce: 2, destruction: 1.6, auto: false, recoil: 0.08, recoilPat: { up: 0.088, side: 0.018 }, kick: 0.08, sound: 2.6,
      price: 90, vm: { x: 0.15, y: -0.15, z: -0.32, g: 0.008 }, muzzle: [-0.5, 4.5, -63],
    },
    launcher: {
      shake: 0.28, art: 'el lanzagranadas', name: 'Lanzagranadas', damage: 110, fireRate: 1.0, range: 40, mag: 4, reload: 2.5, spread: 0.013,
      pellets: 1, pierce: 0, destruction: 1, auto: false, recoil: 0.06, recoilPat: { up: 0.064, side: 0.015 }, kick: 0.07, sound: 2,
      grenade: true, blast: 2.3,
      price: 110, vm: { x: 0.16, y: -0.16, z: -0.34, g: 0.0082 }, muzzle: [-0.5, 4.5, -37],
    },
    // ---- armas desbloqueables nuevas (se compran en el Santuario con esencia) ----
    crossbow: {
      shake: 0.08, art: 'la ballesta', name: 'Ballesta', damage: 140, fireRate: 1.2, range: 60, mag: 1, reload: 1.05, spread: 0.0015,
      pellets: 1, pierce: 4, destruction: 0.4, auto: false, recoil: 0.03, recoilPat: { up: 0.03, side: 0.006 }, kick: 0.05, sound: 0.4,
      bolt: true, desc: 'Silenciosa; atraviesa a 5',
      price: 95, vm: { x: 0.15, y: -0.15, z: -0.33, g: 0.0082 }, muzzle: [-0.5, 7, -42],
    },
    dbarrel: {
      shake: 0.5, art: 'la recortada', name: 'Recortada', damage: 13, fireRate: 5, range: 13, mag: 2, reload: 1.8, spread: 0.16,
      pellets: 12, pierce: 0, destruction: 1.7, auto: false, recoil: 0.11, recoilPat: { up: 0.14, side: 0.03 }, kick: 0.12, sound: 2.6,
      desc: 'Dos tiros brutales',
      price: 90, vm: { x: 0.15, y: -0.14, z: -0.27, g: 0.0078 }, muzzle: [-0.5, 5, -23],
    },
    lmg: {
      shake: 0.09, art: 'la ametralladora', name: 'Ametralladora', damage: 19, fireRate: 13, range: 36, mag: 80, reload: 3.6, spread: 0.042,
      pellets: 1, pierce: 1, destruction: 1.05, auto: true, recoil: 0.014, recoilPat: { up: 0.017, side: 0.011 }, kick: 0.025, sound: 1.1,
      desc: '80 balas, recarga lenta',
      price: 150, vm: { x: 0.16, y: -0.16, z: -0.31, g: 0.0079 }, muzzle: [-0.5, 3.5, -60],
    },
    flamer: {
      shake: 0.03, art: 'el lanzallamas', name: 'Lanzallamas', damage: 7, fireRate: 16, range: 9, mag: 90, reload: 2.8, spread: 0.07,
      pellets: 1, pierce: 3, destruction: 0.15, auto: true, recoil: 0.002, recoilPat: { up: 0.002, side: 0.002 }, kick: 0.01, sound: 0.5,
      flame: true, desc: 'Quema todo de cerca',
      price: 140, vm: { x: 0.16, y: -0.16, z: -0.31, g: 0.0081 }, muzzle: [-0.5, 4, -47],
    },
    raygun: {
      shake: 0.15, art: 'el desintegrador', name: 'Desintegrador', damage: 75, fireRate: 3.2, range: 50, mag: 14, reload: 1.9, spread: 0.003,
      pellets: 1, pierce: 8, destruction: 2.4, auto: false, recoil: 0.03, recoilPat: { up: 0.035, side: 0.006 }, kick: 0.05, sound: 1.4,
      ray: true, desc: 'Rayo que lo atraviesa todo',
      price: 200, vm: { x: 0.14, y: -0.13, z: -0.29, g: 0.0086 }, muzzle: [-0.5, 5.5, -34],
    },
    // ---- (0.57) nuevas ----
    dual: {
      shake: 0.1, art: 'las pistolas dobles', name: 'Pistolas dobles', damage: 20, fireRate: 8, range: 28, mag: 24, reload: 2.3, spread: 0.022,
      pellets: 1, pierce: 0, destruction: 0.9, auto: false, recoil: 0.02, recoilPat: { up: 0.03, side: 0.014 }, kick: 0.03, sound: 1,
      dual: true, desc: 'Una en cada clic',
      price: 85, vm: { x: 0.15, y: -0.13, z: -0.27, g: 0.0092 }, muzzle: [-0.5, 5.5, -27],
    },
    nailgun: {
      shake: 0.06, art: 'la clavadora', name: 'Clavadora', damage: 15, fireRate: 9, range: 26, mag: 40, reload: 2.0, spread: 0.022,
      pellets: 1, pierce: 0, destruction: 0.5, auto: true, recoil: 0.01, recoilPat: { up: 0.011, side: 0.006 }, kick: 0.02, sound: 0.6,
      nail: true, desc: 'Frena y clava a la pared',
      price: 95, vm: { x: 0.15, y: -0.14, z: -0.3, g: 0.0072 }, muzzle: [-0.5, 3, -34],
    },
    harpoon: {
      shake: 0.22, art: 'el arpón', name: 'Arpón', damage: 95, fireRate: 1, range: 32, mag: 1, reload: 1.35, spread: 0.002,
      pellets: 1, pierce: 2, destruction: 0.6, auto: false, recoil: 0.05, recoilPat: { up: 0.05, side: 0.01 }, kick: 0.06, sound: 0.8,
      harpoon: true, desc: 'Atraviesa, atrae y clava',
      price: 110, vm: { x: 0.15, y: -0.15, z: -0.31, g: 0.0082 }, muzzle: [-0.5, 6, -52],
    },
    // (0.59) katana: cuerpo a cuerpo de hueco propio; cortes limpios que parten en dos, floja contra armaduras
    katana: {
      art: 'la katana', name: 'Katana', melee: true, katana: true, damage: 78, fireRate: 1.75, reach: 2.5,
      desc: 'Corta en dos; floja contra armaduras',
      price: 120, vm: { x: 0.14, y: -0.115, z: -0.27, g: 0.0092 },
    },
  };
  const GUNS = ['pistol', 'smg', 'shotgun', 'rifle', 'launcher', 'hammer', 'crossbow', 'dbarrel', 'lmg', 'flamer', 'raygun', 'dual', 'nailgun', 'harpoon', 'katana'];

  // ---------------- Skins ----------------
  // Paletas por "etiqueta" de vóxel: main, dark, grip, steel, accent, blade. e = emisivo
  const SKINS = [
    { id: 'default', name: 'Original', desc: 'Disponible desde el principio' },
    { id: 'oxido', name: 'Óxido', cond: { stat: 'kills', n: 25 },
      pal: { main: [0.48, 0.26, 0.14], dark: [0.28, 0.14, 0.08], grip: [0.3, 0.2, 0.12], steel: [0.6, 0.38, 0.2], accent: [0.8, 0.45, 0.15], blade: [0.6, 0.36, 0.2] } },
    { id: 'zombi', name: 'Podrido', cond: { stat: 'elites', n: 5 },
      pal: { main: [0.42, 0.56, 0.32], dark: [0.25, 0.32, 0.18], grip: [0.45, 0.08, 0.08], steel: [0.6, 0.7, 0.5], accent: [0.9, 0.85, 0.3, 0.6], blade: [0.55, 0.65, 0.45] } },
    { id: 'hueso', name: 'Hueso', cond: { stat: 'bosses', n: 1 },
      pal: { main: [0.86, 0.8, 0.68], dark: [0.55, 0.5, 0.42], grip: [0.42, 0.1, 0.1], steel: [0.96, 0.93, 0.85], accent: [0.6, 0.08, 0.08], blade: [0.95, 0.92, 0.84] } },
    { id: 'sangre', name: 'Sangre', cond: { stat: 'heads', n: 40 },
      pal: { main: [0.5, 0.05, 0.06], dark: [0.25, 0.02, 0.03], grip: [0.08, 0.06, 0.06], steel: [0.85, 0.12, 0.12], accent: [1, 0.15, 0.1, 0.8], blade: [0.8, 0.1, 0.1] } },
    { id: 'oro', name: 'Oro', cond: { stat: 'floor', n: 12 },
      pal: { main: [0.95, 0.74, 0.2], dark: [0.62, 0.43, 0.1], grip: [0.18, 0.12, 0.08], steel: [1, 0.9, 0.5], accent: [1, 0.95, 0.6, 0.6], blade: [1, 0.85, 0.35] } },
    { id: 'neon', name: 'Neón tóxico', cond: { stat: 'kills', n: 250 },
      pal: { main: [0.09, 0.09, 0.11], dark: [0.04, 0.04, 0.05], grip: [0.12, 0.12, 0.14], steel: [0.3, 1, 0.3, 0.7], accent: [0.3, 1, 0.25, 1], blade: [0.35, 1, 0.35, 0.8] } },
    { id: 'carbono', name: 'Carbono', cond: { stat: 'bosses', n: 3 },
      pal: { main: [0.1, 0.1, 0.11], dark: [0.05, 0.05, 0.06], grip: [0.15, 0.15, 0.17], steel: [0.4, 0.42, 0.46], accent: [0.2, 0.6, 1, 0.9], blade: [0.25, 0.25, 0.28], checker: true } },
    { id: 'cristal', name: 'Cristal', cond: { stat: 'floor', n: 20 },
      pal: { main: [0.45, 0.82, 1, 0.35], dark: [0.2, 0.45, 0.75, 0.2], grip: [0.15, 0.25, 0.4], steel: [0.8, 0.95, 1, 0.5], accent: [1, 1, 1, 1], blade: [0.6, 0.9, 1, 0.5] } },
    { id: 'leyenda', name: 'Leyenda', ultimate: true, cond: { stat: 'allSkins', n: 8 } },
  ];

  // Skins especiales (0.51): cada arma tiene la suya, con una misión propia de su estilo
  const SPECIAL = {
    pistol: [{ id: 'duelista', name: 'Duelista', special: true, cond: { stat: 'long', n: 40 },
      pal: { main: [0.9, 0.86, 0.76], dark: [0.32, 0.2, 0.12], grip: [0.42, 0.24, 0.12], steel: [0.98, 0.94, 0.8], accent: [1, 0.8, 0.3, 0.7], blade: [0.95, 0.9, 0.78] } }],
    smg: [{ id: 'acrobata', name: 'Acróbata', special: true, cond: { stat: 'air', n: 40 },
      pal: { main: [0.85, 0.15, 0.6], dark: [0.35, 0.05, 0.3], grip: [0.1, 0.1, 0.14], steel: [0.2, 0.9, 1, 0.6], accent: [0.2, 1, 1, 1], blade: [0.9, 0.3, 0.7] } }],
    shotgun: [{ id: 'quemarropa', name: 'Quemarropa', special: true, cond: { stat: 'close', n: 80 },
      pal: { main: [0.12, 0.1, 0.1], dark: [0.06, 0.05, 0.05], grip: [0.3, 0.12, 0.06], steel: [1, 0.35, 0.08, 0.8], accent: [1, 0.55, 0.1, 1], blade: [0.9, 0.3, 0.08] } }],
    rifle: [{ id: 'francotirador', name: 'Francotirador', special: true, cond: { stat: 'scoped', n: 60 },
      pal: { main: [0.3, 0.38, 0.2], dark: [0.18, 0.22, 0.12], grip: [0.38, 0.3, 0.18], steel: [0.25, 0.27, 0.22], accent: [0.6, 0.75, 0.3], blade: [0.35, 0.4, 0.25], checker: true } },
    { id: 'halcon', name: 'Ojo de halcón', special: true, cond: { stat: 'longHead', n: 25 },
      pal: { main: [0.95, 0.95, 0.97], dark: [0.55, 0.57, 0.62], grip: [0.2, 0.2, 0.24], steel: [1, 0.82, 0.35, 0.5], accent: [1, 0.85, 0.3, 1], blade: [0.95, 0.95, 1] } }],
    launcher: [{ id: 'demolicion', name: 'Demolición', special: true, cond: { stat: 'multi', n: 25 },
      pal: { main: [0.95, 0.75, 0.1], dark: [0.1, 0.1, 0.1], grip: [0.12, 0.12, 0.12], steel: [0.3, 0.3, 0.32], accent: [1, 0.3, 0.1, 0.9], blade: [0.95, 0.75, 0.1], checker: true } }],
    hammer: [{ id: 'rompehuesos', name: 'Rompehuesos', special: true, cond: { stat: 'limbs', n: 80 },
      pal: { main: [0.86, 0.82, 0.7], dark: [0.4, 0.08, 0.06], grip: [0.3, 0.06, 0.05], steel: [0.92, 0.88, 0.76], accent: [0.6, 0.05, 0.05, 0.4], blade: [0.86, 0.8, 0.68] } }],
    crossbow: [{ id: 'cazador', name: 'Cazador', special: true, cond: { stat: 'long', n: 40 },
      pal: { main: [0.28, 0.18, 0.1], dark: [0.16, 0.1, 0.06], grip: [0.2, 0.3, 0.14], steel: [0.5, 0.55, 0.45], accent: [0.4, 0.85, 0.3, 0.6], blade: [0.6, 0.62, 0.55] } }],
    dbarrel: [{ id: 'trueno', name: 'Doble trueno', special: true, cond: { stat: 'multi', n: 20 },
      pal: { main: [0.16, 0.2, 0.32], dark: [0.08, 0.1, 0.18], grip: [0.22, 0.16, 0.12], steel: [0.6, 0.75, 1, 0.5], accent: [0.6, 0.85, 1, 1], blade: [0.5, 0.65, 0.95] } }],
    lmg: [{ id: 'supresion', name: 'Supresión', special: true, cond: { stat: 'magKills', n: 15 },
      pal: { main: [0.32, 0.34, 0.2], dark: [0.18, 0.19, 0.12], grip: [0.12, 0.12, 0.1], steel: [0.4, 0.4, 0.38], accent: [1, 0.5, 0.1, 0.8], blade: [0.35, 0.36, 0.22] } }],
    flamer: [{ id: 'infierno', name: 'Infierno', special: true, cond: { stat: 'burn', n: 100 },
      pal: { main: [0.08, 0.06, 0.07], dark: [0.04, 0.03, 0.03], grip: [0.15, 0.06, 0.04], steel: [1, 0.4, 0.05, 0.9], accent: [1, 0.7, 0.15, 1], blade: [1, 0.35, 0.05, 0.8] } }],
    raygun: [{ id: 'desintegrador', name: 'Desintegrador', special: true, cond: { stat: 'multi', n: 30 },
      pal: { main: [0.82, 0.84, 0.9], dark: [0.4, 0.42, 0.5], grip: [0.18, 0.12, 0.25], steel: [0.75, 0.35, 1, 0.8], accent: [0.85, 0.5, 1, 1], blade: [0.8, 0.82, 0.9] } }],
    katana: [{ id: 'sakura', name: 'Sakura', special: true, cond: { stat: 'kills', n: 60 },
      pal: { blade: [0.95, 0.72, 0.8], steel: [1, 0.88, 0.92, 0.4], dark: [0.18, 0.08, 0.12], grip: [0.55, 0.15, 0.3], accent: [1, 0.55, 0.75, 0.8] } },
      { id: 'oni', name: 'Oni', special: true, cond: { stat: 'heads', n: 40 },
      pal: { blade: [0.12, 0.1, 0.11], steel: [1, 0.2, 0.1, 0.9], dark: [0.05, 0.03, 0.03], grip: [0.6, 0.06, 0.05], accent: [1, 0.35, 0.1, 1] } }],
    knife: [{ id: 'sombra', name: 'Sombra', special: true, cond: { stat: 'air', n: 20 },
      pal: { main: [0.06, 0.06, 0.08], dark: [0.03, 0.03, 0.04], grip: [0.1, 0.08, 0.12], steel: [0.55, 0.2, 0.9, 0.7], accent: [0.7, 0.3, 1, 1], blade: [0.18, 0.15, 0.25] } }],
  };
  // todas las skins de un arma: las comunes, su especial y, al final, la legendaria
  function skinsFor(w) { const sp = SPECIAL[w] || []; return SKINS.filter((s) => !s.ultimate).concat(sp, SKINS.filter((s) => s.ultimate)); }
  const ALL_SKINS = () => SKINS.concat(...Object.values(SPECIAL));
  function findSkin(id) { return ALL_SKINS().find((s) => s.id === id); }

  const HAND = { hand: [0.78, 0.6, 0.47], wrist: [0.7, 0.53, 0.42], sleeve: [0.18, 0.2, 0.17] };

  // ---------------- Modelos ----------------
  // part(): las piezas que se mueven por separado al disparar o recargar (cargador, tambor, cerrojo…).
  // Las piezas «rl_…» sólo se ven durante la recarga (cartuchos, balas, granadas que se meten).
  function builder() {
    const vox = [];
    let cur = null;
    const add = (x0, x1, y0, y1, z0, z1, tag, cond) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (cond && !cond(x, y, z)) continue;
        vox.push({ x, y, z, tag, part: cur, h: (M.hash3(x + 10, y + 20, z + 30) - 0.5) * 0.035 });
      }
    };
    return { vox, add, part: (n) => { cur = n || null; } };
  }
  // quita vóxeles repetidos en la misma celda (se queda el último: los refuerzos van encima del cuerpo);
  // las piezas de recarga «rl_» no cuentan, porque sólo se ven cuando el resto se aparta
  function dedupe(vox) {
    const m = new Map();
    for (const v of vox) m.set(v.x + ',' + v.y + ',' + v.z + (v.part && v.part.startsWith('rl_') ? 'r' : ''), v);
    return [...m.values()];
  }
  // cartucho de escopeta (rojo con culote de latón), de pie a lo largo de z, con el culote atrás
  function shell(add, x, y, z) { add(x, x + 1, y, y + 1, z - 5, z - 1, 'shell'); add(x, x + 1, y, y + 1, z, z, 'brass'); }
  // bala de latón con punta de plomo
  function round(add, x, y, z, len = 4) { add(x, x, y, y, z - len, z - 1, 'brass'); add(x, x, y, y, z - len - 1, z - len - 1, 'lead'); }
  // mano que agarra una empuñadura en (z de la empuñadura)
  // Cargador dentro de la empuñadura (pistolas): la chapa de abajo y el cuerpo, que sale al recargar
  function magIn(vox, add, part, n, slope, z0, z1, x0, x1) {
    for (const v of vox) if (v.tag !== 'accent' && v.y <= -n + 0.5 && v.y >= -n - 0.5 && v.z > -6) v.part = 'mag';
    part('mag');
    for (let k = 1; k < n; k++) { const zo = Math.round(k * slope); add(x0, x1, -k, -k, z0 + zo, z1 + zo, 'dark'); }
    add(x0, x1, 0, 0, z0, z1, 'brass');
    part(null);
  }

  const MODELS = {
    pistol(form) {
      if (form && form !== 'pistola' && PISTOL_MODELS[form]) return PISTOL_MODELS[form]();
      // pistola de servicio: corredera con estrías delante y detrás, ventana de expulsión, mira con
      // punto de fibra, cañón que asoma, raíl bajo el armazón, cola de castor y cachas con relieve
      const { vox, add, part } = builder();
      add(-2, 1, 4, 8, -24, 0, 'main', (x, y, z) => !((x === -2 || x === 1) && y === 8) && !(((z > -5) || (z < -20 && z > -24)) && (z & 1) && (x === -2 || x === 1) && y > 4 && y < 8));
      add(-2, -2, 6, 6, -19, -6, 'dark'); add(1, 1, 6, 6, -19, -6, 'dark');                   // ranura lateral
      add(1, 1, 6, 7, -13, -9, 'dark');                                                        // ventana de expulsión
      add(-1, 0, 6, 6, -25, -25, 'steel'); add(-1, 0, 5, 5, -25, -25, 'dark');                 // cañón que asoma
      add(-1, 0, 9, 9, -22, -22, 'steel'); add(-1, -1, 9, 9, -21, -21, 'accent');              // mira delantera con punto
      add(-2, 1, 9, 9, -2, -1, 'dark', (x) => x === -2 || x === 1);                            // alza
      for (const v of vox) if (v.y >= 4) v.slide = true;
      add(-3, -3, 3, 3, -3, -1, 'accent');                                                     // seguro
      // armazón
      add(-2, 1, 1, 3, -22, 1, 'dark');
      add(-2, 1, 0, 0, -22, -14, 'dark'); add(-1, 0, -1, -1, -21, -15, 'dark', (x, y, z) => (z & 1) === 0);   // raíl
      add(-3, -3, 2, 2, -12, -9, 'steel');                                                     // retén de la corredera
      add(-1, 0, -3, -3, -12, -4, 'dark'); add(-1, 0, -2, 0, -12, -12, 'dark'); add(-1, 0, -2, -1, -7, -7, 'steel');   // guardamonte y gatillo
      add(-1, 0, 2, 3, 2, 3, 'dark');                                                          // cola de castor
      add(-1, 0, 8, 9, 1, 2, 'steel');                                                         // martillo
      for (let k = 0; k <= 12; k++) {
        const zo = Math.round(k * 0.35);
        add(-2, 1, -k, -k, -4 + zo, 1 + zo, k > 11 ? 'dark' : 'grip');
        if (k >= 2 && k <= 10) { add(-3, -3, -k, -k, -3 + zo, 0 + zo, (k + zo) % 2 ? 'grip' : 'dark'); add(2, 2, -k, -k, -3 + zo, 0 + zo, (k + zo) % 2 ? 'grip' : 'dark'); }   // cachas con relieve
      }
      add(-3, -3, -6, -6, 0, 0, 'accent'); add(2, 2, -6, -6, 0, 0, 'accent');                  // tornillos de las cachas
      magIn(vox, add, part, 13, 0.35, -3, 0, -1, 0);
      part('mag'); add(-2, 1, -13, -13, 1, 5, 'dark'); part(null);                             // base del cargador ancha
      return dedupe(vox);
    },
    smg() {
      // subfusil táctico: cajón ancho con aristas, raíl de mira con muescas, alza de anilla y punto,
      // camisa del cañón agujereada y apagallamas, palanca de carga en el tubo izquierdo, cargador
      // curvo con brocal, empuñadura con relieve y culata plegable de dos barras con cantonera
      const { vox, add, part } = builder();
      add(-3, 2, 1, 7, -26, 0, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 7)) && !((x === -3 || x === 2) && y === 4 && z > -22 && z < -4 && (z & 1)));
      add(-2, 1, 8, 8, -25, -2, 'dark', (x, y, z) => (z & 1) === 0 || x === -2 || x === 1);   // raíl con muescas
      add(-1, 0, 9, 11, -24, -24, 'steel'); add(-1, 0, 12, 12, -24, -24, 'accent');          // punto de mira
      add(-2, 1, 9, 12, -3, -2, 'steel', (x, y) => x === -2 || x === 1 || y === 12);          // alza de anilla
      add(-4, -4, 5, 6, -24, -6, 'dark');                                                     // tubo de la palanca
      part('bolt'); add(-5, -5, 5, 6, -23, -22, 'steel'); add(-6, -6, 5, 5, -23, -22, 'steel'); part(null);
      // camisa con agujeros, cañón y apagallamas
      add(-2, 1, 1, 6, -34, -27, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === 1 || y === 6)) && !((x === -2 || x === 1 || y === 6) && (z & 1) && y > 1 && y < 6 || (y === 6 && (z & 1) && x > -2 && x < 1)));
      add(-1, 0, 3, 4, -38, -35, 'steel');
      add(-2, 1, 2, 5, -41, -39, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === 2 || y === 5)) && !(x >= -1 && x <= 0 && y >= 3 && y <= 4) && !(z === -40 && (x === -2 || x === 1)));
      add(-3, -3, 2, 3, -26, -10, 'accent', (x, y, z) => (z % 4) !== 0); add(2, 2, 2, 3, -26, -10, 'accent', (x, y, z) => (z % 4) !== 0);
      // brocal del cargador y cargador curvo
      add(-2, 1, -1, 0, -19, -11, 'dark', (x, y, z) => !((x === -2 || x === 1) && y === -1 && (z === -19 || z === -11)));
      part('mag');
      for (let k = 1; k <= 13; k++) { const zo = Math.round(k * k * 0.025); add(-1, 0, -k, -k, -17 - zo, -13 - zo, k === 13 ? 'dark' : 'dark'); if (k % 4 === 2) { add(-2, -2, -k, -k, -16 - zo, -14 - zo, 'dark'); add(1, 1, -k, -k, -16 - zo, -14 - zo, 'dark'); } }
      add(-2, 1, -14, -14, -22, -16, 'steel'); add(-1, 0, 1, 1, -16, -14, 'brass');
      part(null);
      // guardamonte, gatillo y empuñadura
      add(-1, 0, -3, -3, -10, -4, 'dark'); add(-1, 0, -2, 0, -10, -10, 'dark'); add(-1, 0, -2, -1, -7, -7, 'steel');
      add(2, 3, 3, 4, -5, -3, 'accent');                                                      // selector
      for (let k = 0; k <= 11; k++) {
        const zo = Math.round(k * 0.3);
        add(-2, 1, -k, -k, -4 + zo, 1 + zo, k === 11 ? 'dark' : 'grip', (x, y, z) => !(z === -4 + zo && k % 3 === 2));
        if (k >= 2 && k <= 9) { add(-3, -3, -k, -k, -3 + zo, 0 + zo, k % 2 ? 'grip' : 'dark'); add(2, 2, -k, -k, -3 + zo, 0 + zo, k % 2 ? 'grip' : 'dark'); }
      }
      // culata plegable: dos barras, bisagra y cantonera de goma
      add(-1, 0, 5, 5, 0, 1, 'steel');
      add(-2, -2, 2, 3, 1, 12, 'dark'); add(1, 1, 2, 3, 1, 12, 'dark');
      add(-2, -2, 5, 6, 1, 12, 'dark'); add(1, 1, 5, 6, 1, 12, 'dark');
      add(-2, 1, 0, 7, 13, 14, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 0 || y === 7)));
      add(-2, 1, 1, 6, 15, 15, 'grip');
      return dedupe(vox);
    },
    // escopeta de báscula con corredera: el cañón y el tubo se abren hacia abajo para meter los cartuchos
    shotgun() {
      // escopeta táctica: cañón con protector térmico agujereado y boca dentada, tubo cargador largo,
      // corredera de polímero con estrías, cajón negro con raíl, mira de anillo fantasma, portacartuchos
      // en el costado, empuñadura de pistola y culata telescópica. Se abre por la bisagra para recargar
      const { vox, add, part } = builder();
      part('brl');
      add(-1, 0, 5, 6, -46, -10, 'steel', (x, y, z) => !(z === -46 && y === 5));
      add(-2, 1, 4, 7, -48, -47, 'dark', (x, y, z) => !(x >= -1 && x <= 0 && y >= 5 && y <= 6) && !(z === -48 && ((x + y) & 1)));   // boca dentada
      add(-2, 1, 5, 8, -40, -12, 'dark', (x, y, z) => !(x >= -1 && x <= 0 && y >= 5 && y <= 6) && !(y > 4 && (z % 3 === 0) && z > -39 && z < -13 && (y === 8 || x === -2 || x === 1) && y > 5));   // protector térmico
      add(-1, 0, 9, 10, -39, -39, 'steel'); add(-1, 0, 11, 11, -39, -39, 'accent');             // punto de mira
      add(-2, 1, 1, 3, -44, -10, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 1 || y === 3)));   // tubo cargador
      add(-1, 0, 2, 2, -45, -45, 'steel');
      add(-3, 2, 0, 9, -43, -42, 'steel', (x, y) => !((x === -3 || x === 2) && (y === 0 || y === 9)) && !(x >= -2 && x <= 1 && y >= 1 && y <= 8));   // abrazadera
      add(-3, 2, -1, 4, -33, -19, 'grip', (x, y, z) => !((x === -3 || x === 2) && (y === -1 || y === 4)) && !((z & 1) && (x === -3 || x === 2) && y > -1 && y < 4));   // corredera
      for (const v of vox) if (v.tag === 'grip') v.pump = true;
      add(-1, 0, 5, 6, -10, -10, 'dark');                                                         // recámara (se ve al abrir)
      part(null);
      add(-1, 0, 4, 4, -10, -9, 'dark');                                                          // bisagra
      // cajón
      add(-3, 2, 0, 8, -9, 4, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 0 || y === 8)));
      add(-2, 1, 9, 9, -8, 3, 'dark', (x, y, z) => (z & 1) === 0 || x === -2 || x === 1);         // raíl
      add(-2, 1, 10, 12, 1, 2, 'steel', (x, y) => x === -2 || x === 1 || y === 12);               // anillo fantasma
      add(2, 2, 5, 7, -7, -3, 'dark');                                                            // ventana de expulsión
      add(-1, 0, 0, 0, -8, -2, 'dark');                                                           // boca de carga
      add(-4, -4, 1, 7, -9, 1, 'dark', (x, y, z) => y === 1 || y === 7 || z === -9 || z === 1);   // portacartuchos
      for (let i = 0; i < 4; i++) { add(-5, -5, 3, 6, -7 + i * 2, -7 + i * 2, 'shell'); add(-5, -5, 2, 2, -7 + i * 2, -7 + i * 2, 'brass'); }
      add(3, 3, 3, 3, -1, 1, 'accent');                                                           // seguro
      part('rl_shell'); shell(add, -1, 5, -4); part(null);
      add(-1, 0, -1, -1, -6, 1, 'dark'); add(-1, 0, -4, -1, -7, -7, 'dark'); add(-1, 0, -4, -4, -6, 1, 'dark'); add(-1, 0, -2, -1, -3, -3, 'steel');   // guardamonte
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, -k, -k, 2 + zo, 6 + zo, k === 10 ? 'dark' : 'grip', (x, y, z) => !(z === 2 + zo && k % 3 === 2)); }   // empuñadura
      // culata telescópica: tubo, cuerpo hueco y cantonera
      add(-1, 0, 4, 6, 5, 20, 'dark');
      add(-2, 1, -1, 7, 13, 23, 'main', (x, y, z) => !(x > -2 && x < 1 && y > 0 && y < 6 && z > 14 && z < 22) && !((x === -2 || x === 1) && (y === -1 || y === 7)));
      add(-2, 1, -2, 8, 24, 25, 'grip', (x, y) => !((x === -2 || x === 1) && (y === -2 || y === 8)));
      return dedupe(vox);
    },
    rifle() {
      // rifle de cerrojo de tirador: cañón pesado con freno de boca, visor grande con anillas y torreta,
      // cajón de acero, cargador de caja, bípode plegado bajo el guardamanos y culata con carrillera
      const { vox, add, part } = builder();
      add(-2, 1, 3, 6, -40, -12, 'steel', (x, y) => !((x === -2 || x === 1) && (y === 3 || y === 6)));   // cañón pesado
      add(-1, 0, 4, 5, -58, -41, 'steel');
      add(-2, 1, 3, 6, -62, -59, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === 3 || y === 6)) && !((x === -2 || x === 1) && (z === -61)) && !(z === -62 && x >= -1 && x <= 0 && y >= 4 && y <= 5));   // freno de boca
      add(-3, 2, 1, 7, -14, 4, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 7)));   // cajón
      add(-3, 2, -1, 2, -38, -15, 'grip', (x, y, z) => !((x === -3 || x === 2) && y === -1) && !(y === 2 && x > -3 && x < 2));   // guardamanos
      for (const x of [-2, 1]) add(x, x, -2, -2, -36, -24, 'steel');                              // bípode plegado
      add(-2, 1, -2, -2, -37, -37, 'dark');
      // visor
      add(-2, 1, 9, 12, -20, -2, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 9 || y === 12)));
      add(-3, 2, 8, 13, -25, -21, 'dark', (x, y) => !((x === -3 || x === 2) && (y === 8 || y === 13)));
      add(-2, 1, 9, 12, -26, -26, 'accent', (x, y) => !((x === -2 || x === 1) && (y === 9 || y === 12)));   // lente
      add(-3, 2, 8, 13, -1, 1, 'dark', (x, y) => !((x === -3 || x === 2) && (y === 8 || y === 13)));
      add(-1, 0, 13, 14, -12, -10, 'steel'); add(2, 3, 10, 11, -12, -10, 'steel');                // torretas
      for (const z of [-15, -5]) add(-2, 1, 7, 8, z, z + 1, 'steel');                             // anillas
      part('bolt'); add(2, 4, 5, 5, -3, -3, 'steel'); add(4, 5, 4, 5, -3, -2, 'steel'); add(-1, 0, 7, 7, -10, -3, 'steel'); part(null);
      add(-1, 0, 6, 6, -10, -5, 'dark');                                                         // ventana de carga (se ve con el cerrojo atrás)
      part('mag'); add(-2, 1, -3, 0, -12, -6, 'dark'); add(-2, 1, -4, -4, -12, -6, 'steel');   // cargador de caja (sale por abajo al recargar)
      add(-1, 0, 0, 0, -10, -7, 'brass'); add(-1, 0, 0, 0, -11, -11, 'lead'); part(null);         // las balas de arriba, entre los labios
      add(-1, 0, -1, -1, -4, 2, 'dark'); add(-1, 0, -3, -1, 3, 3, 'dark'); add(-1, 0, -1, 0, -1, -1, 'steel');   // guardamonte
      for (let k = 0; k <= 12; k++) add(-2, 1, -k + 2, 5 - Math.floor(k * 0.25), 5 + k * 2, 6 + k * 2, 'grip', (x, y) => !((x === -2 || x === 1) && y === -k + 2));
      for (let k = 3; k <= 8; k++) add(-2, 1, 6 - Math.floor(k * 0.25), 7, 5 + k * 2, 6 + k * 2, 'grip');   // carrillera
      add(-2, 1, 8, 8, 12, 20, 'dark');                                                          // goma de la carrillera
      add(-2, 1, -10, 5, 30, 31, 'dark', (x, y) => !((x === -2 || x === 1) && (y === -10 || y === 5)));   // cantonera
      add(-1, 0, -3, 1, -3, 3, 'grip');
      part('rl_round'); round(add, 0, 9, -4, 5); part(null);
      return dedupe(vox);
    },
    launcher() {
      // lanzagranadas pesado de 40 mm: tubo grueso con aros de refuerzo y boca abocinada, que bascula
      // para cargar; cajón con bisagra y tornillos, mira de alza, empuñadura delantera y culata con cantonera
      const { vox, add, part } = builder();
      part('brl');
      add(-4, 3, 1, 8, -34, -7, 'main', (x, y, z) => !((x === -4 || x === 3) && (y === 1 || y === 8)) && !(x >= -2 && x <= 1 && y >= 3 && y <= 6));
      add(-5, 4, 0, 9, -37, -35, 'dark', (x, y) => !((x === -5 || x === 4) && (y === 0 || y === 9)) && !(x >= -2 && x <= 1 && y >= 3 && y <= 6));   // boca abocinada
      for (const z of [-31, -22, -13]) add(-5, 4, 0, 9, z, z + 1, 'steel', (x, y) => !((x === -5 || x === 4) && (y === 0 || y === 9)) && !(x >= -2 && x <= 1 && y >= 3 && y <= 6));   // aros
      for (let z = -29; z <= -15; z += 2) if (z !== -22 && z !== -21) add(-4, 3, 9, 9, z, z, 'dark');                                  // aletas de la camisa
      add(-1, 0, 9, 11, -36, -35, 'steel'); add(-1, 0, 12, 12, -36, -36, 'accent');                                                   // punto de mira
      add(-3, 2, -1, 0, -26, -16, 'grip', (x, y, z) => !((x === -3 || x === 2) && y === -1));                                          // guardamanos
      for (let k = 1; k <= 7; k++) add(-2, 1, -1 - k, -1 - k, -21 - Math.round(k * 0.2), -18 - Math.round(k * 0.2), k === 7 ? 'dark' : 'grip');   // empuñadura delantera
      add(-5, -5, 3, 6, -28, -16, 'accent', (x, y, z) => (z & 3) !== 0); add(4, 4, 3, 6, -28, -16, 'accent', (x, y, z) => (z & 3) !== 0);   // franjas
      part(null);
      part('rl_gren');
      // la granada se mete 6 vóxeles cañón adentro al cargar (ver gunAnim)
      add(-2, 1, 3, 6, -5, -1, 'gren', (x, y) => !((x === -2 || x === 1) && (y === 3 || y === 6))); add(-1, 0, 4, 5, -6, -6, 'accent');
      add(-2, 1, 3, 6, 0, 1, 'brass', (x, y) => !((x === -2 || x === 1) && (y === 3 || y === 6)));
      part(null);
      // cajón
      add(-4, 3, 0, 9, -6, 4, 'dark', (x, y, z) => !((x === -4 || x === 3) && (y === 0 || y === 9)));
      add(-5, -5, 1, 2, -7, -5, 'steel'); add(4, 4, 1, 2, -7, -5, 'steel');                                                          // bisagra
      for (const z of [-3, 1]) for (const y of [2, 7]) { add(-5, -5, y, y, z, z, 'steel'); add(4, 4, y, y, z, z, 'steel'); }        // tornillos
      add(-1, 0, 10, 10, -5, -1, 'dark'); add(-2, 1, 11, 13, -2, -1, 'steel', (x, y) => x === -2 || x === 1 || y === 13);           // alza
      add(-1, 0, 10, 11, 1, 3, 'dark');                                                                                              // palanca de apertura
      add(-1, 0, -2, -1, -4, 2, 'dark'); add(-1, 0, -4, -2, -5, -5, 'dark'); add(-1, 0, -5, -5, -4, 2, 'dark'); add(-1, 0, -2, -1, -1, -1, 'steel');   // guardamonte y gatillo
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, -k, -k, 3 + zo, 6 + zo, k === 10 ? 'dark' : 'grip'); }
      // culata: dos barras y una cantonera ancha de goma
      add(-1, 0, 6, 7, 5, 13, 'main'); add(-1, 0, 0, 1, 5, 12, 'main');
      add(-1, 0, 2, 5, 12, 13, 'main');
      add(-2, 1, -1, 8, 14, 15, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === -1 || y === 8)));
      return dedupe(vox);
    },
    // Ballesta: culata, raíl, palas curvas, cuerda tensada y el virote listo
    crossbow() {
      // ballesta pesada de asedio: culata maciza con chapas remachadas, cabeza de hierro con
      // estribo, palas gruesas reforzadas con poleas en las puntas, manivela y un virote de punta ancha
      const { vox, add, part } = builder();
      add(-3, 2, 0, 5, -12, 8, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 0 || y === 5)));   // culata
      add(-3, 2, 1, 4, 9, 11, 'dark', (x, y) => !((x === -3 || x === 2) && (y === 1 || y === 4)));       // cantonera de hierro
      add(-2, 1, 6, 6, 1, 8, 'main');                                                                    // apoyo de la mejilla
      for (let z = -10; z <= 7; z += 4) { add(-4, -4, 1, 4, z, z + 1, 'dark'); add(3, 3, 1, 4, z, z + 1, 'dark'); }   // chapas laterales
      for (let z = -9; z <= 7; z += 4) { add(-4, -4, 4, 4, z, z, 'steel'); add(3, 3, 4, 4, z, z, 'steel'); add(-4, -4, 1, 1, z, z, 'steel'); add(3, 3, 1, 1, z, z, 'steel'); }   // remaches
      add(-1, 0, 4, 6, -36, -12, 'dark');                                                                // canal del virote
      add(-2, 1, 3, 3, -36, -12, 'dark');
      add(-3, 2, 0, 8, -34, -29, 'dark', (x, y, z) => !((x === -3 || x === 2) && (y === 0 || y === 8)) && !(y >= 6 && x >= -1 && x <= 0));   // cabeza de hierro (con el paso del virote)
      add(-3, 2, 8, 8, -33, -30, 'steel', (x) => x === -3 || x === 2);
      add(-1, 0, 2, 3, -33, -30, 'accent');                                                              // emblema
      add(-2, 1, -3, 0, -38, -36, 'steel', (x, y) => x === -2 || x === 1 || y === -3);                   // estribo para tensarla con el pie
      add(-2, -2, -1, 0, -36, -35, 'steel'); add(1, 1, -1, 0, -36, -35, 'steel');
      for (let x = -18; x <= 17; x++) {                                                                   // palas gruesas, curvadas hacia atrás
        const ax = Math.abs(x + 0.5);
        if (ax < 3) continue;
        const bend = Math.round(ax * ax * 0.028), th = ax > 14 ? 1 : 2;
        add(x, x, 4, 4 + th, -31 + bend, -30 + bend, ax > 8 && ax < 15 ? 'accent' : 'dark');
        if (ax % 4 < 1) add(x, x, 3, 3 + th + 2, -31 + bend, -30 + bend, 'steel');                         // abrazaderas
      }
      for (const sx of [-18, 17]) {                                                                       // poleas en las puntas
        const bend = Math.round(17.5 * 17.5 * 0.028);
        add(sx, sx, 3, 7, -32 + bend, -29 + bend, 'steel', (x, y, z) => !((y === 3 || y === 7) && (z === -32 + bend || z === -29 + bend)));
      }
      part('str');
      for (let x = -17; x <= 16; x++) {                                                                   // cuerda tensa hasta la nuez
        const ax = Math.abs(x + 0.5), z = -29 + Math.round((1 - ax / 17) * 17) + Math.round(ax * ax * 0.028);
        add(x, x, 6, 6, z, z, 'steel');
      }
      part('bolt');
      add(-1, 0, 7, 7, -38, -12, 'blade');                                                                // virote
      add(-2, 1, 6, 8, -41, -39, 'steel', (x, y, z) => !((x === -2 || x === 1) && (y !== 7 || z === -41)));   // punta ancha
      add(-1, 0, 7, 7, -42, -42, 'steel');
      add(-2, 1, 7, 9, -15, -12, 'accent', (x, y) => x === -2 || x === 1 || y === 9);                      // plumas
      part(null);
      add(-1, 0, -2, 0, -6, -3, 'dark');                                                                  // nuez y gatillo
      add(-2, 1, -3, -3, -8, -1, 'dark', (x) => x === -2 || x === 1);                                     // guardamonte
      for (let k = 0; k <= 10; k++) add(-2, 1, 1 - k, 1 - k, -3 + Math.round(k * 0.3), 1 + Math.round(k * 0.3), 'grip');
      add(3, 4, 3, 3, 4, 4, 'steel'); add(4, 4, 1, 3, 4, 4, 'steel'); add(4, 5, 1, 1, 4, 4, 'grip');        // manivela
      add(-1, 0, 7, 9, 2, 2, 'steel', (x, y) => y < 9 || x === -1);                                       // alza
      return vox;
    },
    // Recortada: dos cañones cortos uno junto al otro, báscula y culata de madera serrada
    dbarrel() {
      // recortada compacta: dos cañones cortos serrados, báscula con grabados dorados, dos martillos
      // exteriores y empuñadura de pistola curva de madera (sin culata)
      const { vox, add, part } = builder();
      part('brl');
      add(-3, -1, 4, 6, -21, -6, 'steel', (x, y, z) => !(x === -2 && y === 5 && (z < -19 || z === -6)));
      add(0, 2, 4, 6, -21, -6, 'steel', (x, y, z) => !(x === 1 && y === 5 && (z < -19 || z === -6)));
      add(-3, 2, 4, 6, -22, -22, 'dark', (x, y) => !((x === -2 || x === 1) && y === 5) && !((x === -3 || x === 2) && (y === 4 || y === 6)));   // bocas serradas
      add(-4, 3, 3, 7, -15, -14, 'dark', (x, y) => !((x === -4 || x === 3) && (y === 3 || y === 7)) && !(y >= 4 && y <= 6 && x >= -3 && x <= 2));   // abrazadera
      add(-1, 0, 7, 7, -21, -7, 'dark'); add(-1, 0, 8, 8, -21, -21, 'accent');                // banda y punto
      add(-3, 2, 1, 3, -17, -8, 'grip', (x, y, z) => !((x === -3 || x === 2) && y === 1));     // guardamanos corto
      part(null);
      part('rl_shell'); shell(add, -1, 5, -1); part(null);
      // báscula con grabados
      add(-3, 2, 1, 7, -6, 2, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 7)));
      for (const x of [-4, 3]) add(x, x, 2, 6, -5, 1, 'accent', (xx, y, z) => ((y * 3 + z) % 4 === 0) || (y === 4 && (z & 1)));
      add(-1, 0, 8, 8, -4, 0, 'dark'); add(-1, 0, 9, 9, -1, 0, 'steel');                       // palanca de apertura
      add(-3, -2, 7, 9, 1, 2, 'steel', (x, y) => !(y === 9 && x === -2)); add(1, 2, 7, 9, 1, 2, 'steel', (x, y) => !(y === 9 && x === 1));   // martillos
      add(-1, 0, -1, 0, -3, 2, 'dark'); add(-1, 0, -3, -1, -4, -4, 'dark'); add(-1, 0, -3, -3, -3, 2, 'dark');   // guardamonte
      add(-1, -1, -2, -1, -1, -1, 'steel'); add(0, 0, -2, -1, 1, 1, 'steel');                  // dos gatillos
      // empuñadura de pistola curva
      for (let k = 0; k <= 9; k++) { const zo = Math.round(k * 0.45 + (k > 5 ? (k - 5) * 0.5 : 0)); add(-2, 1, 1 - k, 1 - k, 1 + zo, 5 + zo, 'grip', (x, y, z) => !((x === -2 || x === 1) && z === 5 + zo && k % 3 === 1)); }
      add(-2, 1, -9, -9, 9, 13, 'dark');                                                        // remate
      add(-2, 1, 2, 6, 3, 5, 'grip');
      return dedupe(vox);
    },
    // Ametralladora ligera: cajón grande, cañón con camisa agujereada, caja de cinta y asa
    lmg() {
      // ametralladora pesada: cajón remachado con chapa lateral, camisa agujereada con asa de transporte,
      // apagallamas ranurado, bípode plegado, tapa de alimentación con alza, caja de munición grande
      // con cinta de balas a la vista, empuñadura y culata con cantonera y apoyo para el hombro
      const { vox, add, part } = builder();
      add(-2, 1, 1, 7, -24, 4, 'main', (x, y, z) => !((x === -2 || x === 1) && (y === 1 || y === 7)) && !(x === -2 && y === 3 && z >= -18 && z <= -9));
      add(2, 2, 2, 6, -22, 2, 'dark');                                                            // chapa lateral
      for (const z of [-20, -12, -4]) for (const y of [3, 5]) add(3, 3, y, y, z, z, 'steel');     // remaches
      add(-3, -3, 5, 6, -22, -20, 'steel');                                                       // palanca de carga
      add(-1, 0, 3, 4, -55, -24, 'steel');
      add(-2, 1, 2, 5, -46, -25, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === 2 || y === 5)) && !((z % 3 === 0) && (y === 5 || x === -2 || x === 1) && y > 2 && z > -45));   // camisa
      add(-2, 1, 2, 5, -59, -56, 'dark', (x, y, z) => !(x >= -1 && x <= 0 && y >= 3 && y <= 4) && !(z !== -56 && ((x === -2 || x === 1) && (y === 3 || y === 4))));   // apagallamas
      add(-1, 0, 6, 8, -52, -52, 'steel'); add(-1, 0, 9, 9, -52, -52, 'accent');                  // punto de mira
      add(-1, 0, 6, 6, -37, -29, 'dark'); add(-1, 0, 7, 9, -37, -36, 'steel'); add(-1, 0, 7, 9, -30, -29, 'steel'); add(-1, 0, 10, 10, -37, -29, 'grip');   // asa de transporte
      for (const x of [-2, 1]) { add(x, x, 1, 1, -44, -30, 'steel'); add(x, x, 0, 1, -45, -45, 'dark'); }   // bípode plegado
      add(-2, 1, 1, 1, -29, -28, 'dark');
      part('box');
      add(-8, -4, -8, 2, -19, -7, 'dark', (x, y, z) => !((x === -8 || x === -4) && (y === -8 || y === 2) && (z === -19 || z === -7)));   // caja de la cinta
      add(-9, -9, -6, 0, -17, -9, 'dark', (x, y, z) => y === -6 || y === 0 || z === -17 || z === -9);   // nervios
      add(-9, -9, -4, -2, -14, -12, 'accent');                                                     // marca
      add(-8, -4, 3, 3, -18, -8, 'steel');                                                         // cierre
      part('belt');
      for (let z = -18; z <= -9; z += 2) { add(-3, -2, 3, 3, z, z, 'brass'); add(-4, -4, 3, 3, z, z, 'lead'); }   // cartuchos de la cinta
      part('lid');
      add(-2, 1, 8, 8, -24, -2, 'main', (x, y, z) => !((z % 4 === 0) && (x === -2 || x === 1)));   // tapa del cajón
      add(-1, 0, 9, 11, -6, -5, 'steel', (x, y) => !(y === 10 && x === 0));                       // alza
      add(-2, 1, 9, 9, -2, -1, 'accent');                                                          // pestillo
      part(null);
      add(-1, 0, -1, 0, -6, 2, 'dark'); add(-1, 0, -3, -1, -7, -7, 'dark'); add(-1, 0, -3, -3, -6, 2, 'dark'); add(-1, 0, -2, -1, -3, -3, 'steel');   // guardamonte
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, 1 - k, 1 - k, 0 + zo, 4 + zo, k === 10 ? 'dark' : 'grip', (x, y, z) => !(z === zo && k % 3 === 2)); }
      // culata
      for (let k = 0; k <= 9; k++) add(-2, 1, -k + 3, 7 - Math.floor(k * 0.25), 5 + k * 2, 6 + k * 2, 'main', (x, y) => !((x === -2 || x === 1) && y === -k + 3));
      add(-2, 1, -7, 7, 25, 26, 'dark', (x, y) => !((x === -2 || x === 1) && (y === -7 || y === 7)));   // cantonera
      add(-1, 0, 8, 8, 12, 22, 'dark');                                                            // apoyo
      return dedupe(vox);
    },
    flamer() {
      // lanzallamas pesado: boquilla ancha con encendedor y llama piloto, tubo con aros de refrigeración,
      // depósito grande con flejes, tapas y manómetro, manguera, asa delantera y empuñadura
      const { vox, add, part } = builder();
      add(-3, 2, 1, 7, -20, 4, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 7)));
      add(-2, 1, 8, 8, -18, 2, 'dark', (x, y, z) => (z & 1) === 0 || x === -2 || x === 1);
      add(-1, 0, 3, 5, -40, -20, 'steel');
      for (let z = -38; z <= -24; z += 3) add(-2, 1, 2, 6, z, z, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 2 || y === 6)));   // aros de refrigeración
      add(-3, 2, 1, 7, -45, -41, 'dark', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 7)) && !(z === -45 && x >= -2 && x <= 1 && y >= 2 && y <= 6));   // boquilla
      add(-2, 1, 2, 6, -46, -46, 'steel', (x, y) => x === -2 || x === 1 || y === 2 || y === 6);
      add(2, 2, 0, 1, -40, -22, 'steel');                                                          // tubo del encendedor
      part('pilot'); add(-1, 0, 0, 0, -44, -43, 'accent'); part(null);                             // llama piloto
      part('tank');
      add(-5, 4, -10, 0, -18, -2, 'accent', (x, y, z) => !((x === -5 || x === 4) && (y === -10 || y === 0)) && !((z === -18 || z === -2) && (x === -5 || x === 4 || y === -10 || y === 0)));   // depósito
      for (const z of [-14, -6]) add(-6, 5, -11, 1, z, z, 'dark', (x, y) => !((x === -6 || x === 5) && (y === -11 || y === 1)) && (x === -6 || x === 5 || y === -11 || y === 1));   // flejes
      add(-3, 2, -8, -2, -19, -19, 'dark'); add(-3, 2, -8, -2, -1, -1, 'dark');                   // tapas
      add(5, 5, -7, -4, -11, -8, 'steel', (x, y, z) => !((y === -7 || y === -4) && (z === -11 || z === -8))); add(6, 6, -6, -5, -10, -9, 'dark');   // manómetro
      add(-1, 0, -12, -11, -11, -8, 'steel'); add(-2, 1, -13, -13, -11, -8, 'dark');               // válvula
      part(null);
      add(3, 3, -1, 2, -3, 3, 'dark'); add(-1, 0, 0, 0, -12, -4, 'dark');                          // manguera
      for (let k = 1; k <= 7; k++) add(-1, 0, 1 - k, 1 - k, -29 + Math.round(k * 0.2), -26 + Math.round(k * 0.2), k === 7 ? 'dark' : 'grip');   // asa delantera
      add(-1, 0, 0, 0, -30, -25, 'steel');
      add(-1, 0, -1, 0, 0, 5, 'dark'); add(-1, 0, -3, -2, -1, -1, 'dark'); add(-1, 0, -1, 0, 2, 2, 'steel');
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, 1 - k, 1 - k, 3 + zo, 7 + zo, k === 10 ? 'dark' : 'grip'); }
      add(-1, 0, 2, 6, 5, 12, 'dark'); add(-2, 1, 0, 8, 13, 14, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 0 || y === 8)));   // apoyo de hombro
      return dedupe(vox);
    },
    raygun() {
      // desintegrador retro pesado: cuerpo redondeado con cúpula, cañón con tres anillos grandes que
      // brillan, emisor de cristal entre dos púas, aletas arriba y a los lados, diales, empuñadura con
      // nervios y la célula de energía de cristal detrás
      const { vox, add, part } = builder();
      add(-3, 2, 2, 9, -16, 4, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 2 || y === 9)) && !((z === -16 || z === 4) && (x === -3 || x === 2 || y === 2 || y === 9)));
      add(-2, 1, 10, 10, -13, 1, 'main'); add(-1, 0, 11, 11, -10, -2, 'main');                      // cúpula
      add(-1, 0, 4, 7, -30, -16, 'steel');
      for (const [i, z] of [[0, -27], [1, -23], [2, -19]]) {                                          // anillos
        part('ring' + i);
        add(-5, 4, 1, 10, z, z, 'accent', (x, y) => { const dx = x + 0.5, dy = y - 5.5, r = Math.hypot(dx, dy); return r > 3.3 && r < 5.3; });
        part(null);
      }
      add(-2, 1, 4, 7, -33, -31, 'blade', (x, y, z) => !((x === -2 || x === 1) && (y === 4 || y === 7)));   // emisor
      add(-3, -3, 5, 6, -35, -30, 'dark'); add(2, 2, 5, 6, -35, -30, 'dark');                        // púas
      add(-1, 0, 12, 15, -9, -1, 'dark', (x, y, z) => z >= -9 + (y - 12) * 2);                       // aleta superior
      add(-6, -4, 5, 6, -12, -2, 'dark', (x, y, z) => z >= -12 + (-4 - x) * 2); add(3, 5, 5, 6, -12, -2, 'dark', (x, y, z) => z >= -12 + (x - 3) * 2);   // aletas laterales
      add(-4, -4, 7, 8, -6, -5, 'accent'); add(3, 3, 7, 8, -6, -5, 'accent');                        // diales
      add(-4, -4, 3, 3, -12, -8, 'steel'); add(3, 3, 3, 3, -12, -8, 'steel');
      part('cell'); add(-1, 0, 4, 7, 5, 9, 'blade'); add(-2, 1, 3, 8, 10, 10, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 3 || y === 8))); part(null);   // célula de energía
      add(-1, 0, 0, 1, -9, -2, 'main'); add(-1, 0, -3, -3, -9, -4, 'dark'); add(-1, 0, -2, 0, -9, -9, 'dark'); add(-1, 0, -2, -1, -6, -6, 'steel');   // guardamonte
      for (let k = 0; k <= 11; k++) { const zo = Math.round(k * 0.35); add(-2, 1, 1 - k, 1 - k, -3 + zo, 2 + zo, k === 11 ? 'dark' : 'grip', (x, y, z) => !((x === -2 || x === 1) && k % 3 === 0)); }
      return dedupe(vox);
    },
    // Mazo de demolición: mango largo de fibra amarilla con franjas, empuñadura de goma
    // y una cabeza de acero rectangular ATRAVESADA en el mango (caras de golpeo a los lados)
    hammer() {
      // mazo de demolición pesado: mango grueso de fibra con franjas, chapas de refuerzo de acero
      // bajo la cabeza, cabeza grande con flejes y remaches, caras de golpeo anchas y pomo de hierro
      const { vox, add } = builder();
      add(-2, 1, -2, 1, -31, 4, 'accent', (x, y, z) => !((x === -2 || x === 1) && (y === -2 || y === 1)) && Math.floor((z + 40) / 4) % 3 !== 0);   // fibra amarilla
      add(-2, 1, -2, 1, -31, 4, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === -2 || y === 1)) && Math.floor((z + 40) / 4) % 3 === 0);     // franjas negras
      add(-3, 2, -3, 2, 3, 13, 'grip', (x, y, z) => !((x === -3 || x === 2) && (y === -3 || y === 2)) && (z % 3 !== 0 || !(x === -3 || x === 2 || y === -3 || y === 2)));   // goma con aros
      add(-3, 2, -3, 2, 14, 16, 'steel', (x, y, z) => !((x === -3 || x === 2) && (y === -3 || y === 2)) && !(z === 16 && (x === -3 || x === 2 || y === -3 || y === 2)));   // pomo
      add(-3, 2, -3, 2, -31, -27, 'steel', (x, y, z) => !((x === -3 || x === 2) && (y === -3 || y === 2)));                                     // collar
      for (const x of [-3, 2]) add(x, x, -1, 0, -26, -16, 'steel');                                                                             // chapas de refuerzo
      add(-3, -3, -1, 0, -24, -24, 'dark'); add(2, 2, -1, 0, -24, -24, 'dark'); add(-3, -3, -1, 0, -19, -19, 'dark'); add(2, 2, -1, 0, -19, -19, 'dark');
      // cabeza
      add(-11, 10, -5, 4, -42, -32, 'main', (x, y, z) => {
        const ex = x === -11 || x === 10, ey = y === -5 || y === 4, ez = z === -42 || z === -32;
        return !((ex && ey) || (ex && ez) || (ey && ez));
      });
      for (const x of [-8, 7]) add(x, x + 1, -6, 5, -43, -31, 'dark', (xx, y, z) => (y === -6 || y === 5 || z === -43 || z === -31) && !((y === -6 || y === 5) && (z === -43 || z === -31)));   // flejes
      for (const x of [-8, 8]) for (const z of [-40, -34]) { add(x, x, 5, 5, z, z, 'steel'); add(x, x, -6, -6, z, z, 'steel'); }                   // remaches
      add(-13, -12, -4, 3, -41, -33, 'steel', (x, y, z) => !(x === -13 && (y === -4 || y === 3 || z === -41 || z === -33)));                     // caras de golpeo
      add(11, 12, -4, 3, -41, -33, 'steel', (x, y, z) => !(x === 12 && (y === -4 || y === 3 || z === -41 || z === -33)));
      add(-3, 2, 5, 5, -40, -34, 'dark'); add(-1, 0, 6, 6, -39, -35, 'steel');                                                                   // cuña
      add(-3, 2, -6, -6, -40, -34, 'dark');
      add(-5, -4, 5, 5, -38, -36, 'accent'); add(3, 4, 5, 5, -38, -36, 'accent');                                                               // marcas de aviso
      return dedupe(vox);
    },
    // Cuchillo (sin mano: sólo se ve el arma). form: la forma desbloqueada
    knife(form = 'cuchillo') { return KNIFE_MODELS[form] ? KNIFE_MODELS[form]() : KNIFE_MODELS.cuchillo(); },
  };

  // ---------------- Modelos de pistola (cambian cómo dispara) ----------------
  const PISTOLS = [
    { id: 'pistola', name: 'Pistola', desc: 'Equilibrada: precisa y rápida' },
    { id: 'deagle', name: 'Desert Eagle', cond: { stat: 'headshots', n: 75 }, txt: 'Revienta 75 cabezas',
      desc: 'Mucho daño, lenta',
      vm: { x: 0.14, y: -0.115, z: -0.29, g: 0.0068 },   // modelo grande: a menos escala para que no tape media pantalla
      stats: { name: 'Desert Eagle', damage: 58, fireRate: 2.6, mag: 7, reload: 1.7, spread: 0.007, pierce: 1, destruction: 1.5, recoil: 0.06, recoilPat: { up: 0.09, side: 0.02 }, kick: 0.075, shake: 0.26, sound: 1.9, sfx: 'deagle', muzzle: [-0.5, 6.5, -36] } },
    { id: 'revolver', name: 'Revólver', cond: { stat: 'bosses', n: 2 }, txt: 'Remata a 2 jefes',
      desc: 'Seis balas, mucho daño',
      stats: { name: 'Revólver', damage: 46, fireRate: 3.1, mag: 6, reload: 2.1, spread: 0.004, pierce: 1, destruction: 1.25, recoil: 0.045, recoilPat: { up: 0.07, side: 0.012 }, kick: 0.06, shake: 0.2, sound: 1.6, sfx: 'revolver', muzzle: [-0.5, 6, -35] } },
    { id: 'auto', name: 'Pistola automática', cond: { stat: 'kills', n: 400 }, txt: 'Mata 400 zombis',
      desc: 'Automática, mucha cadencia',
      stats: { name: 'Pistola automática', damage: 13, fireRate: 15, mag: 22, reload: 1.5, spread: 0.03, auto: true, recoil: 0.014, recoilPat: { up: 0.016, side: 0.012 }, kick: 0.025, shake: 0.06, sound: 0.75, sfx: 'auto', muzzle: [-0.5, 5.5, -31] } },
  ];
  const PISTOL_MODELS = {
    // pistola grande de corredera triangular, cañón con estrías y empuñadura gruesa
    deagle() {
      // Desert Eagle .50: mucho más grande y cuadrada que la pistola normal. Corredera ancha de acero
      // pulido con carril de mira encima, cañón poligonal largo con compensador de ventanas, martillo
      // de espuela, guardamonte cuadrado y empuñadura gruesa de goma negra
      const { vox, add, part } = builder();
      add(-3, 2, 4, 9, -29, 1, 'main', (x, y, z) => !((x === -3 || x === 2) && y === 9) && !(z > -7 && (z & 1) && (x === -3 || x === 2) && y > 4 && y < 9));
      add(-2, 1, 10, 10, -28, 0, 'main');
      add(-1, 0, 11, 11, -27, -2, 'dark', (x, y, z) => (z & 1) === 0);                         // carril con muescas
      add(-1, 0, 12, 12, -27, -26, 'steel'); add(-2, 1, 12, 12, -1, 0, 'steel', (x) => x !== -1 && x !== 0);   // miras
      add(-3, -3, 6, 7, -26, -12, 'dark'); add(2, 2, 6, 7, -26, -12, 'dark');                  // ranura de la corredera
      add(2, 2, 5, 8, -10, -8, 'dark');                                                        // ventana de expulsión
      add(-3, -3, 5, 5, -6, -3, 'accent');                                                     // seguro
      // compensador con ventanas por arriba
      add(-3, 2, 4, 9, -36, -30, 'dark', (x, y, z) => !((x === -3 || x === 2) && (y === 4 || y === 9)) && !(y === 9 && (z & 1) && x > -3 && x < 2) && !(x >= -1 && x <= 0 && y >= 6 && y <= 7 && z === -36));
      add(-2, 1, 10, 10, -35, -31, 'steel', (x, y, z) => (z & 1) === 0);
      for (const v of vox) if (v.y >= 4 && v.z >= -29 && v.tag !== 'accent') v.slide = true;
      // armazón
      add(-3, 2, 1, 3, -28, 0, 'dark');
      add(-3, 2, 0, 0, -28, -17, 'dark'); add(-2, 1, -1, -1, -27, -20, 'dark', (x, y, z) => (z & 1) === 0);   // raíl inferior
      add(-1, 0, -5, -5, -15, -3, 'dark'); add(-1, 0, -4, 0, -15, -15, 'dark'); add(-1, 0, -2, -1, -8, -8, 'steel');   // guardamonte cuadrado
      add(-1, 0, 7, 11, 2, 3, 'steel', (x, y, z) => !(y === 11 && z === 2));                  // martillo de espuela
      for (let k = 0; k <= 14; k++) {
        const zo = Math.round(k * 0.4);
        add(-3, 2, -k, -k, -4 + zo, 3 + zo, k > 13 ? 'dark' : 'grip', (x, y, z) => !(z === -4 + zo && k % 3 === 1) && !((x === -3 || x === 2) && (z === 3 + zo) && k % 3 === 0));
      }
      add(-4, -4, -7, -5, -1, 1, 'accent', (x, y, z) => (y + z) % 2 === 0); add(3, 3, -7, -5, -1, 1, 'accent', (x, y, z) => (y + z) % 2 === 0);   // medallón de las cachas
      magIn(vox, add, part, 14, 0.4, -3, 1, -1, 0);
      return dedupe(vox);
    },
    // revólver: tambor de seis recámaras, cañón largo con mira y percutor; la culata curva
    revolver() {
      // revólver magnum: cañón grueso con banda ventilada y funda del extractor de largo completo,
      // tambor estriado, puente superior, percutor de espuela grande y culata de madera con chapa
      const { vox, add, part } = builder();
      add(-2, 1, 5, 7, -33, -11, 'steel', (x, y, z) => !((x === -2 || x === 1) && y === 7) && !(z === -33 && x >= -1 && x <= 0 && y === 6));
      add(-1, 0, 8, 8, -32, -11, 'dark', (x, y, z) => (z % 3) !== 0);                          // banda ventilada
      add(-1, 0, 9, 10, -32, -31, 'accent');                                                   // mira
      add(-2, 1, 3, 4, -32, -12, 'dark', (x, y) => !((x === -2 || x === 1) && y === 3));       // funda del extractor
      add(-2, 1, 5, 7, -13, -11, 'main');
      add(-1, 0, 7, 8, -11, -2, 'main');                                                       // puente sobre el tambor
      // tambor de seis recámaras con estrías (se abre hacia la izquierda sobre la grúa)
      part('cyl');
      for (let z = -10; z <= -3; z++) for (let a = 0; a < 16; a++) {
        const th = (a / 16) * Math.PI * 2, x = Math.round(Math.cos(th) * 2.6) - 1, y = 4 + Math.round(Math.sin(th) * 2.6);
        add(x, x, y, y, z, z, z === -10 || z === -3 ? 'dark' : (a % 4 === 2 && z > -9 && z < -4 ? 'dark' : 'main'));
      }
      add(-2, 1, 3, 5, -9, -4, 'dark');
      part('cylb');
      for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 + 0.5; add(Math.round(Math.cos(th) * 1.6 - 0.5), Math.round(Math.cos(th) * 1.6 - 0.5), 4 + Math.round(Math.sin(th) * 1.6), 4 + Math.round(Math.sin(th) * 1.6), -3, -3, 'brass'); }   // culotes
      part('crane'); add(-1, 0, 1, 2, -11, -10, 'steel'); part(null);
      // las seis balas del cargador rápido (sólo al recargar)
      part('rl_speed');
      for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 + 0.5, x = Math.round(Math.cos(th) * 1.6 - 0.5), y = 4 + Math.round(Math.sin(th) * 1.6); round(add, x, y, -2, 6); }
      part('rl_loader'); add(-1, 0, 3, 4, -2, 0, 'dark');
      part('rl_cases');
      for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2 + 0.5, x = Math.round(Math.cos(th) * 1.6 - 0.5), y = 4 + Math.round(Math.sin(th) * 1.6); add(x, x, y, y, -9, -3, 'brass'); }
      part(null);
      add(-2, 1, 1, 8, -2, 1, 'main', (x, y) => y < 3 || y > 6 || x === -2 || x === 1);
      // escudo trasero del armazón: tapa la parte de atrás del tambor (antes era un hueco que se veía desde atrás)
      add(-1, 0, 3, 6, -2, 1, 'main', (x, y, z) => !(z === 1 && y >= 4 && y <= 5));
      add(-1, 0, 4, 5, 1, 1, 'dark');                                                          // canal del percutor
      add(-3, -3, 3, 4, -1, 0, 'steel');                                                       // pestillo del tambor
      part('ham'); add(-1, 0, 8, 9, 1, 3, 'dark'); add(-1, 0, 10, 10, 2, 4, 'steel'); part(null);   // percutor con espuela
      add(-1, 0, 0, 1, -10, -3, 'main');
      add(-1, 0, -2, -2, -9, -3, 'dark'); add(-1, 0, -1, 0, -9, -9, 'dark'); add(-1, 0, -1, 0, -5, -5, 'steel');
      for (let k = 0; k <= 12; k++) {
        const zo = Math.round(k * 0.55 + (k > 7 ? (k - 7) * 0.4 : 0));
        add(-3, 2, -k, -k, -2 + zo, 3 + zo, k === 12 ? 'steel' : 'grip', (x, y, z) => !((x === -3 || x === 2) && (z === -2 + zo || z === 3 + zo)) && !((x === -3 || x === 2) && k % 4 === 1));
      }
      add(-3, -3, -5, -4, 2, 3, 'accent'); add(2, 2, -5, -4, 2, 3, 'accent');                  // medallón de la culata
      add(-2, -2, 1, 1, -12, -11, 'accent'); add(1, 1, 1, 1, -12, -11, 'accent');
      return dedupe(vox);
    },
    // automática: compensador ranurado, selector de tiro y cargador largo que asoma
    auto() {
      // automática de ráfaga: corredera con ventanas que dejan ver el cañón, compensador largo con
      // tres lumbreras, empuñadura delantera abatible, selector grande y cargador largo con tope
      const { vox, add, part } = builder();
      add(-2, 1, 4, 8, -22, 0, 'main', (x, y, z) => !((x === -2 || x === 1) && y === 8) && !(z > -5 && (z & 1) && (x === -2 || x === 1) && y > 4 && y < 8) && !(y === 8 && z > -19 && z < -8 && (z % 3) !== 0));
      add(-1, 0, 7, 7, -19, -8, 'steel');                                                      // cañón por las ventanas
      add(1, 1, 6, 7, -12, -8, 'dark');
      add(-2, 1, 3, 8, -30, -23, 'dark', (x, y, z) => !((x === -2 || x === 1) && (y === 3 || y === 8)) && !(y === 8 && (z === -29 || z === -27 || z === -25)) && !(x >= -1 && x <= 0 && y >= 5 && y <= 6 && z === -30));   // compensador
      add(-2, -2, 5, 6, -28, -24, 'accent', (x, y, z) => (z & 1) === 0); add(1, 1, 5, 6, -28, -24, 'accent', (x, y, z) => (z & 1) === 0);
      add(-1, 0, 9, 9, -21, -21, 'steel'); add(-2, 1, 9, 9, -2, -1, 'dark', (x) => x === -2 || x === 1);
      for (const v of vox) if (v.y >= 4 && v.tag !== 'accent' && v.z > -23) v.slide = true;
      add(-2, 1, 1, 3, -22, 1, 'dark'); add(-2, 1, 0, 0, -22, -14, 'dark');
      add(-1, 0, -1, -1, -21, -15, 'dark', (x, y, z) => (z & 1) === 0);
      // empuñadura delantera abatible
      add(-1, 0, -2, -2, -21, -17, 'steel'); for (let k = 3; k <= 8; k++) add(-1, 0, -k, -k, -20, -18, k === 8 ? 'dark' : 'grip');
      add(-1, 0, -3, -3, -12, -4, 'dark'); add(-1, 0, -2, 0, -12, -12, 'dark'); add(-1, 0, -2, -1, -7, -7, 'steel');
      add(1, 2, 4, 5, -7, -3, 'accent'); add(2, 2, 6, 6, -5, -5, 'accent');                  // selector grande
      add(-1, 0, 8, 9, 1, 2, 'steel');
      for (let k = 0; k <= 12; k++) {
        const zo = Math.round(k * 0.35);
        add(-2, 1, -k, -k, -4 + zo, 1 + zo, 'grip');
        if (k >= 2 && k <= 10) { add(-3, -3, -k, -k, -3 + zo, 0 + zo, k % 2 ? 'grip' : 'dark'); add(2, 2, -k, -k, -3 + zo, 0 + zo, k % 2 ? 'grip' : 'dark'); }
      }
      part('mag');
      for (let k = 1; k <= 20; k++) { const zo = Math.round(k * 0.35); add(-1, 0, -k, -k, -3 + zo, 0 + zo, 'dark'); if (k > 12) { add(-2, -2, -k, -k, -3 + zo, 0 + zo, 'dark'); add(1, 1, -k, -k, -3 + zo, 0 + zo, 'dark'); } }   // cargador largo
      add(-2, 1, -21, -22, 3, 8, 'accent', (x, y) => y === -21 || (x > -2 && x < 1)); add(-1, 0, 0, 0, -3, 0, 'brass');
      part(null);
      return dedupe(vox);
    },
  };

  // ---------------- Formas del cuchillo (se desbloquean con misiones) ----------------
  const KNIVES = [
    { id: 'cuchillo', name: 'Cuchillo de combate', desc: 'El de siempre' },
    { id: 'karambit', name: 'Karambit', cond: { stat: 'knifeKills', n: 40 }, txt: 'Mata 40 zombis con el cuchillo' },
    { id: 'daga', name: 'Daga', cond: { stat: 'knifeChallenges', n: 3 }, txt: 'Supera 3 retos de sala «sólo cuchillo»' },
    { id: 'machete', name: 'Machete', cond: { stat: 'knifeElites', n: 8 }, txt: 'Mata 8 élites o campeones con el cuchillo' },
    { id: 'bayoneta', name: 'Bayoneta', cond: { stat: 'knifeBosses', n: 1 }, txt: 'Remata a un jefe con el cuchillo' },
    { id: 'mariposa', name: 'Navaja mariposa', cond: { stat: 'knifeKills', n: 150 }, txt: 'Mata 150 zombis con el cuchillo' },
  ];
  const KNIFE_MODELS = {
    // cuchillo de combate: hoja con punta de clip, filo brillante, acanaladura y sierra en el lomo;
    // guarda de acero, mango de anillas de cuero y pomo con agujero para el cordón
    cuchillo() {
      const { vox, add } = builder();
      for (let z = -27; z <= -4; z++) {
        const top = z < -20 ? 4 - Math.round((-20 - z) * 0.55) : 4;
        const bot = z < -24 ? Math.round((-24 - z) * 0.8) : 0;
        for (let y = bot; y <= Math.max(bot, top); y++) add(0, 0, y, y, z, z, y === bot ? 'steel' : y === 2 && z > -19 && z < -6 ? 'dark' : 'blade');
        if (z > -15 && z < -5 && (z & 1)) add(0, 0, 5, 5, z, z, 'dark');               // sierra del lomo
        if (z > -9) add(-1, 1, 3, 4, z, z, 'blade', (x) => x !== 0);                    // recazo grueso
      }
      add(-1, 1, -2, 5, -3, -3, 'steel'); add(-2, 2, -1, 4, -3, -3, 'dark', (x) => x === -2 || x === 2);   // guarda
      add(0, 0, -4, -3, -3, -3, 'steel');                                                // gavilán
      for (let z = -2; z <= 9; z++) add(-1, 1, -1, 3, z, z, z % 3 === 0 ? 'dark' : 'grip', (x, y) => !((x !== 0) && (y === -1 || y === 3)));   // anillas
      add(-1, 1, -2, 4, 10, 11, 'steel', (x, y, z) => !((x !== 0) && (y === -2 || y === 4)) && !(x === 0 && y === 1 && z === 11));   // pomo
      add(0, 0, 1, 1, 11, 11, 'accent');
      return vox;
    },
    // garra en media luna: el filo va por dentro de la curva; mango curvo y anilla grande para el índice
    karambit() {
      const { vox, add } = builder();
      const R = 18, CY = 2 - R, CZ = -3, A = 1.12;
      const seen = new Set();
      const put = (y, z, tag) => { const k = y + ',' + z; if (seen.has(k)) return; seen.add(k); add(0, 0, y, y, z, z, tag); };
      for (let yy = -16; yy <= 4; yy++) for (let zz = -24; zz <= -2; zz++) {
        const dy = yy - CY, dz = zz - CZ, d = Math.hypot(dy, dz), th = Math.atan2(-dz, dy);
        if (th < -0.02 || th > A) continue;
        const t = Math.max(0, th) / A, w = Math.max(0.7, 5.6 * (1 - Math.pow(t, 1.8)));
        if (d > R + 0.5 || d < R + 0.5 - w) continue;
        const edge = d < R + 1.4 - w || t > 0.88, groove = !edge && Math.abs(d - (R + 0.5 - w * 0.55)) < 0.5 && t > 0.1 && t < 0.7;
        put(yy, zz, edge ? 'steel' : groove ? 'dark' : 'blade');
      }
      add(-1, 1, -1, 2, -2, -2, 'dark'); add(-1, 1, 3, 3, -2, -2, 'steel', (x) => x === 0);   // guarda
      for (let z = -3; z <= -1; z++) add(-1, 1, 3, 4, z, z, 'dark', (x, y) => x === 0 && (y === 3 || (z & 1)));   // espolón con muescas
      // mango curvo con cachas, forro y remaches
      for (let z = -1; z <= 9; z++) {
        const sag = z > 4 ? -Math.round((z - 4) * 0.45) : 0;
        add(-1, 1, -1 + sag, 2 + sag, z, z, 'grip', (x, y) => !(x !== 0 && (z === 1 || z === 6) && y === sag));
        add(0, 0, -2 + sag, -2 + sag, z, z, 'dark');                                    // forro
        if (z === 1 || z === 6) add(-1, 1, sag, sag, z, z, 'accent', (x) => x !== 0);
        if (z > 1 && z < 9 && (z & 1)) add(0, 0, -2 + sag, -2 + sag, z, z, 'grip');      // hueco para los dedos
      }
      // anilla de seguridad gruesa
      const RY = -2, RZ = 13;
      for (let a = 0; a < 32; a++) {
        const th = (a / 32) * Math.PI * 2;
        const y = RY + Math.round(Math.sin(th) * 3.4), z = RZ + Math.round(Math.cos(th) * 3.4);
        add(-1, 1, y, y, z, z, a % 4 === 0 ? 'steel' : 'accent');
      }
      return vox;
    },
    // hoja larga y curva con línea de templado, habaki, tsuba calada, empuñadura trenzada con menuki y kashira
    katana() {
      const { vox, add } = builder();
      for (let z = -62; z <= -5; z++) {
        const t = (-5 - z) / 57, curve = Math.round(t * t * 3);
        const tip = z < -57 ? Math.round((z + 62) * 0.5) : 2;
        const top = curve + Math.max(0, tip), hamon = curve + ((Math.floor(z / 3) & 1) ? 1 : 0);
        for (let y = curve; y <= top; y++) add(0, 0, y, y, z, z, y === top ? 'steel' : y <= hamon && z > -58 ? 'steel' : 'blade');
        if (z > -54 && z < -10) add(-1, 1, top, top, z, z, 'blade', (x) => x !== 0 && z % 9 === 0);   // shinogi
      }
      add(-1, 1, -1, 3, -7, -5, 'accent', (x, y) => !((x !== 0) && (y === -1 || y === 3)));   // habaki
      for (let r = 0; r <= 3; r++) for (let a = 0; a < 24; a++) {                             // tsuba calada
        const th = a / 24 * Math.PI * 2, x = Math.round(Math.cos(th) * r), y = 1 + Math.round(Math.sin(th) * r);
        add(x, x, y, y, -4, -4, r === 3 ? 'accent' : r === 2 && a % 6 < 2 ? 'dark' : 'dark');
      }
      add(-1, 1, -1, 3, -3, 14, 'grip', (x, y, z) => !(((y + z) % 3 === 0) && x !== 0));
      add(-1, 1, -1, 3, -3, 14, 'dark', (x, y, z) => ((y + z) % 3 === 0) && x !== 0);
      add(-2, -2, 1, 1, 4, 6, 'accent'); add(2, 2, 1, 1, 4, 6, 'accent');                    // menuki
      add(-1, 1, -1, 3, 15, 16, 'steel', (x, y, z) => !(z === 16 && (x !== 0) && (y === -1 || y === 3))); add(0, 0, 1, 1, 17, 17, 'accent');   // kashira
      return vox;
    },
    // daga de doble filo con nervio central, guarda curvada, mango de alambre trenzado y pomo con gema
    daga() {
      const { vox, add } = builder();
      for (let z = -25; z <= -4; z++) {
        const w = z < -14 ? Math.round((z + 25) * 0.23) : 2;
        add(0, 0, 1 - w, 1 + w, z, z, 'blade', (x, y) => Math.abs(y - 1) !== w);
        add(0, 0, 1 - w, 1 - w, z, z, 'steel'); add(0, 0, 1 + w, 1 + w, z, z, 'steel');      // filos
        if (z > -22) add(-1, 1, 1, 1, z, z, 'steel', (x) => x !== 0 || true);                // nervio
      }
      add(-1, 1, -2, 4, -3, -3, 'accent');
      for (const [y, d] of [[-3, 0], [-4, 1], [-5, 2], [5, 0], [6, 1], [7, 2]]) add(0, 0, y, y, -3 + d, -3 + d, 'accent');   // guarda curvada
      add(-1, 1, 0, 2, -2, 7, 'grip', (x, y, z) => !(z % 2 === 0 && x !== 0));
      add(-1, 1, 0, 2, -2, 7, 'accent', (x, y, z) => z % 2 === 0 && x !== 0 && y === 1);   // alambre
      add(-1, 1, -1, 3, 8, 10, 'accent', (x, y, z) => !((x !== 0) && (y === -1 || y === 3) && (z !== 9)));
      add(0, 0, 1, 1, 11, 11, 'blade');                                                      // gema
      return vox;
    },
    // machete pesado: hoja ancha con lomo pavonado, filo brillante, panza y agujero de colgar; empuñadura
    // de goma con dedos, guarda y anilla para el cordón
    machete() {
      const { vox, add } = builder();
      for (let z = -41; z <= -4; z++) {
        const top = 4, bot = z < -32 ? -Math.round((z + 41) * 0.12) - (z < -36 ? 0 : 0) : -1;
        const tipCut = z < -37 ? Math.round((-37 - z) * 1.6) : 0;
        for (let y = bot; y <= top - tipCut; y++) add(0, 0, y, y, z, z, y === bot ? 'steel' : y >= top - 1 && z > -36 ? 'dark' : 'blade', () => !(z >= -34 && z <= -33 && y === 1));
        if (z > -14) add(-1, 1, 4, 4, z, z, 'dark', (x) => x !== 0);                          // lomo grueso
      }
      add(-1, 1, -2, 5, -3, -3, 'dark'); add(0, 0, 6, 6, -3, -3, 'steel');                   // guarda
      for (let z = -2; z <= 9; z++) add(-1, 1, -1, 3, z, z, 'grip', (x, y) => !(y === -1 && (z % 3 === 0)) && !((x !== 0) && (y === -1 || y === 3)));
      add(-1, 1, -2, 4, 10, 11, 'dark', (x, y) => !((x !== 0) && (y === -2 || y === 4)));
      add(0, 0, -4, -3, 11, 13, 'steel', (x, y, z) => !(y === -3 && z === 12));             // anilla
      return vox;
    },
    // bayoneta: hoja con acanaladura y sierra, anilla para el cañón, botón de retén, cachas y pomo con ranura
    bayoneta() {
      const { vox, add } = builder();
      for (let z = -33; z <= -4; z++) {
        const tip = z < -28 ? Math.round((z + 33) * 0.5) : 2;
        for (let y = 0; y <= Math.max(0, tip); y++) add(0, 0, y, y, z, z, y === 0 ? 'steel' : y === 1 && z > -27 && z < -6 ? 'dark' : 'blade');
        if (z > -25 && z < -8 && z % 2 === 0) add(0, 0, 3, 4, z, z, 'dark', (x, y) => y === 3 || z % 4 === 0);   // sierra
      }
      for (let a = 0; a < 20; a++) { const th = a / 20 * Math.PI * 2; add(Math.round(Math.cos(th) * 2), Math.round(Math.cos(th) * 2), 5 + Math.round(Math.sin(th) * 2.4), 5 + Math.round(Math.sin(th) * 2.4), -3, -3, 'steel'); }   // anilla del cañón
      add(-1, 1, -2, 3, -3, -3, 'dark');
      add(-1, 1, -1, 3, -2, 8, 'grip', (x, y, z) => !((x !== 0) && (y === -1 || y === 3)) && !(x !== 0 && (z === 0 || z === 6) && y === 1));
      add(-2, -2, 1, 1, 0, 0, 'steel'); add(2, 2, 1, 1, 0, 0, 'steel'); add(-2, -2, 1, 1, 6, 6, 'steel'); add(2, 2, 1, 1, 6, 6, 'steel');   // tornillos
      add(-1, 1, -2, 4, 9, 11, 'steel', (x, y, z) => !((x !== 0) && (y === -2 || y === 4)) && !(x === 0 && y >= 1 && y <= 2 && z === 11));   // pomo con ranura
      add(-2, -2, 2, 3, 9, 10, 'accent');                                                     // botón de retén
      return vox;
    },
    // navaja mariposa: hoja tanto con acanaladura, dos cachas caladas con pasadores y pestillo
    mariposa() {
      const { vox, add } = builder();
      for (let z = -24; z <= -4; z++) {
        const top = 3, bot = z < -20 ? Math.round((-20 - z) * 0.75) : 0;
        for (let y = bot; y <= top; y++) add(0, 0, y, y, z, z, y === bot ? 'steel' : y === 2 && z > -19 && z < -6 ? 'dark' : 'blade');
      }
      add(0, 0, 0, 3, -20, -20, 'steel');                                                     // quiebre de la punta tanto
      add(-2, 2, -1, 4, -3, -3, 'dark', (x, y) => x !== 0 || y === -1 || y === 4);
      add(-2, -2, 1, 1, -3, -3, 'steel'); add(2, 2, 1, 1, -3, -3, 'steel');                   // pasadores
      for (const x of [-2, 2]) {
        add(x, x, -1, 3, -2, 11, 'grip', (xx, y, z) => !(y >= 0 && y <= 2 && z % 3 !== 0 && z > -1 && z < 10));
        add(x + Math.sign(x), x + Math.sign(x), 0, 2, 0, 9, 'dark', (xx, y, z) => z % 3 === 0 && y === 1);   // remaches
      }
      add(-2, 2, -1, -1, 11, 11, 'accent'); add(-2, -2, -2, -1, 11, 12, 'accent');             // pestillo
      add(-1, 1, -1, 3, -2, -2, 'accent');
      return vox;
    },
  };

  // (0.57) pistolas dobles: la pistola de servicio en cada mano (la izquierda, en espejo, 30 vóxeles a la izquierda)
  MODELS.dual = () => {
    const R = MODELS.pistol('pistola');
    // (0.61) cada pistola tiene sus piezas (cargador «mag» y «mag_L»): se recargan por separado
    for (const v of R) v.side = 'R';
    const L = R.map((v) => ({ ...v, x: -v.x - 1 - 30, side: 'L', part: v.part ? v.part + '_L' : v.part }));
    return R.concat(L);
  };
  // (0.57) clavadora neumática: cuerpo industrial amarillo, nariz de contacto, tira de clavos inclinada,
  // manómetro, racor del aire y la manguera que cuelga
  MODELS.nailgun = () => {
    const { vox, add } = builder();
    add(-3, 2, 1, 8, -22, 2, 'main', (x, y, z) => !((x === -3 || x === 2) && (y === 1 || y === 8)));          // cuerpo
    add(-3, -3, 5, 6, -20, -4, 'accent'); add(2, 2, 5, 6, -20, -4, 'accent');                                   // franjas
    add(-2, 1, 2, 7, -29, -23, 'dark', (x, y) => !((x === -2 || x === 1) && (y === 2 || y === 7)));           // cabezal
    add(-1, 0, 2, 4, -33, -30, 'steel'); add(-2, 1, 1, 1, -33, -32, 'steel');                                   // nariz de contacto
    add(-1, 0, -1, 1, -30, -7, 'dark');                                                                        // guía de la tira
    for (let z = -28; z <= -9; z += 2) add(-1, 0, -3, -2, z, z, 'steel');                                       // clavos en tira
    add(-2, 1, -4, -4, -29, -8, 'dark', (x, y, z) => (z & 3) !== 0);                                            // muelle del cargador
    add(-1, 0, 9, 10, -8, -4, 'steel'); add(-1, -1, 10, 10, -6, -6, 'accent');                                   // manómetro
    for (let k = 0; k <= 11; k++) {
      const zo = Math.round(k * 0.3);
      add(-2, 1, -k, -k, -3 + zo, 2 + zo, k > 10 ? 'dark' : 'grip');
      if (k >= 2 && k <= 9 && (k & 1)) { add(-3, -3, -k, -k, -2 + zo, 1 + zo, 'dark'); add(2, 2, -k, -k, -2 + zo, 1 + zo, 'dark'); }   // goma
    }
    add(-1, 0, -2, 0, -7, -5, 'accent');                                                                        // gatillo
    add(-1, 0, -3, -3, -9, -3, 'dark');                                                                         // guardamonte
    add(-1, 0, -12, -11, 5, 7, 'steel');                                                                        // racor
    for (let k = 0; k < 6; k++) add(-1, 0, -13 - k, -13 - k, 6 + Math.round(k * 0.5), 6 + Math.round(k * 0.5), 'dark');   // manguera
    return dedupe(vox);
  };
  // (0.57) arpón submarino: tubo con gomas, carrete de cuerda, empuñadura y el arpón con lengüetas encima
  MODELS.harpoon = () => {
    const { vox, add, part } = builder();
    add(-2, 1, 1, 4, -40, -6, 'main', (x, y, z) => !((x === -2 || x === 1) && (y === 1 || y === 4)));          // tubo
    add(-3, 2, 0, 5, -42, -40, 'dark', (x, y) => !((x === -3 || x === 2) && (y === 0 || y === 5)));           // cabeza
    for (const z of [-30, -20]) add(-3, 2, 1, 4, z, z, 'steel', (x, y) => !((x === -3 || x === 2) && (y === 1 || y === 4)));   // abrazaderas
    for (const x of [-3, 2]) for (let z = -39; z <= -12; z++) add(x, x, 5, 5, z, z, 'accent');                  // gomas
    add(-3, 2, 5, 6, -12, -11, 'accent');                                                                      // puente de las gomas
    add(-3, 2, -4, 0, -24, -16, 'dark', (x, y, z) => !((x === -3 || x === 2) && (y === -4 || y === 0)));     // carrete
    add(-1, 0, -3, -1, -23, -17, 'accent');                                                                    // cuerda enrollada
    add(-2, 1, 1, 4, -6, 6, 'grip', (x, y, z) => !((x === -2 || x === 1) && (y === 1 || y === 4)));           // culata
    for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, -k, -k, -4 + zo, 0 + zo, k > 9 ? 'dark' : 'grip'); }
    add(-1, 0, -2, 0, -7, -6, 'steel'); add(-1, 0, -3, -3, -9, -3, 'dark');                                       // gatillo y guardamonte
    part('bolt');
    add(-1, 0, 6, 6, -48, -6, 'steel');                                                                        // vástago
    add(-1, 0, 5, 7, -51, -49, 'steel', (x, y, z) => !(z === -51 && y !== 6)); add(-1, 0, 6, 6, -53, -52, 'steel');   // punta
    add(-2, -2, 7, 7, -48, -46, 'steel'); add(1, 1, 7, 7, -48, -46, 'steel');                                   // lengüetas
    part(null);
    return dedupe(vox);
  };

  MODELS.katana = () => KNIFE_MODELS.katana();
  void 0;
  const DEFAULT_PAL = {
    katana: { blade: [0.78, 0.8, 0.84], steel: [0.95, 0.96, 1], dark: [0.12, 0.1, 0.1], grip: [0.14, 0.12, 0.2], accent: [0.85, 0.65, 0.25] },
    dual: { main: [0.36, 0.36, 0.39], dark: [0.2, 0.2, 0.22], grip: [0.24, 0.17, 0.12], steel: [0.7, 0.71, 0.75], accent: [0.9, 0.4, 0.1] },
    nailgun: { main: [0.86, 0.62, 0.1], dark: [0.15, 0.15, 0.16], grip: [0.12, 0.12, 0.13], steel: [0.68, 0.7, 0.74], accent: [0.9, 0.22, 0.1] },
    harpoon: { main: [0.18, 0.32, 0.36], dark: [0.1, 0.12, 0.14], grip: [0.35, 0.24, 0.14], steel: [0.72, 0.74, 0.78], accent: [0.95, 0.55, 0.12] },
    knife: { blade: [0.75, 0.77, 0.8], steel: [0.95, 0.96, 1], dark: [0.2, 0.2, 0.22], grip: [0.3, 0.2, 0.12], accent: [0.6, 0.6, 0.62] },
    hammer: { main: [0.24, 0.25, 0.27], steel: [0.66, 0.67, 0.7], dark: [0.07, 0.07, 0.08], grip: [0.09, 0.09, 0.1], accent: [0.92, 0.66, 0.08], hand: [0.62, 0.48, 0.24], wrist: [0.5, 0.38, 0.2] },
    pistol: { main: [0.36, 0.36, 0.39], dark: [0.2, 0.2, 0.22], grip: [0.24, 0.17, 0.12], steel: [0.7, 0.71, 0.75], accent: [0.9, 0.4, 0.1] },
    smg: { main: [0.25, 0.27, 0.24], dark: [0.15, 0.15, 0.16], grip: [0.2, 0.2, 0.2], steel: [0.6, 0.6, 0.64], accent: [0.9, 0.4, 0.1] },
    shotgun: { main: [0.11, 0.11, 0.12], dark: [0.06, 0.06, 0.07], grip: [0.42, 0.36, 0.24], steel: [0.48, 0.48, 0.52], accent: [0.35, 1, 0.3, 0.8] },
    rifle: { main: [0.28, 0.28, 0.3], dark: [0.12, 0.12, 0.13], grip: [0.4, 0.24, 0.12], steel: [0.48, 0.48, 0.52], accent: [0.4, 0.8, 1, 0.8] },
    crossbow: { main: [0.3, 0.18, 0.09], dark: [0.12, 0.12, 0.13], grip: [0.2, 0.12, 0.07], steel: [0.58, 0.58, 0.62], accent: [0.5, 0.1, 0.07], blade: [0.42, 0.3, 0.18] },
    dbarrel: { main: [0.42, 0.4, 0.42], dark: [0.1, 0.1, 0.11], grip: [0.38, 0.2, 0.09], steel: [0.16, 0.16, 0.18], accent: [0.85, 0.65, 0.25] },
    lmg: { main: [0.2, 0.22, 0.19], dark: [0.11, 0.11, 0.12], grip: [0.17, 0.17, 0.17], steel: [0.42, 0.42, 0.45], accent: [0.85, 0.65, 0.2] },
    flamer: { main: [0.3, 0.31, 0.3], dark: [0.12, 0.12, 0.13], grip: [0.18, 0.18, 0.18], steel: [0.6, 0.6, 0.62], accent: [0.85, 0.15, 0.1] },
    raygun: { main: [0.75, 0.72, 0.65], dark: [0.55, 0.12, 0.1], grip: [0.2, 0.2, 0.24], steel: [0.6, 0.62, 0.68], accent: [0.35, 1, 0.45, 0.9], blade: [0.6, 1, 0.7, 1] },
    'pistol:deagle': { main: [0.6, 0.61, 0.65], dark: [0.1, 0.1, 0.11], grip: [0.07, 0.07, 0.08], steel: [0.82, 0.83, 0.87], accent: [0.85, 0.65, 0.25] },
    launcher: { main: [0.3, 0.36, 0.24], dark: [0.15, 0.17, 0.13], grip: [0.18, 0.18, 0.18], steel: [0.55, 0.56, 0.6], accent: [1, 0.75, 0.1] },
  };

  // Construye la lista de vóxeles coloreados para un arma y una skin
  // ---------------- Skin definitiva («Leyenda») ----------------
  // Una por arma, al estilo de un arma mejorada: sin adornos que cambien la silueta, sino un
  // camuflaje propio de dos tonos que fluye despacio por el arma y detalles que laten con luz.
  // Se desbloquea al conseguir todos los demás camuflajes de esa arma.
  //   c1/c2: los dos tonos del camuflaje animado · glow: color de los detalles que brillan
  const ULT = {
    pistol: { name: 'Oro fundido', c1: [0.05, 0.045, 0.04], c2: [0.62, 0.45, 0.12], glow: [1, 0.75, 0.25], speed: 1 },
    smg: { name: 'Nebulosa', c1: [0.06, 0.04, 0.14], c2: [0.18, 0.12, 0.45], glow: [0.35, 0.9, 1], speed: 1.3 },
    shotgun: { name: 'Magma', c1: [0.07, 0.02, 0.02], c2: [0.55, 0.12, 0.03], glow: [1, 0.45, 0.1], speed: 0.8 },
    rifle: { name: 'Glaciar', c1: [0.7, 0.8, 0.9], c2: [0.2, 0.38, 0.6], glow: [0.4, 0.9, 1], speed: 0.6 },
    launcher: { name: 'Toxina', c1: [0.04, 0.08, 0.03], c2: [0.25, 0.5, 0.08], glow: [0.6, 1, 0.2], speed: 1.1 },
    hammer: { name: 'Bronce real', c1: [0.42, 0.26, 0.1], c2: [0.85, 0.66, 0.25], glow: [1, 0.95, 0.7], speed: 0.7 },
    crossbow: { name: 'Nácar', c1: [0.82, 0.8, 0.84], c2: [0.62, 0.55, 0.72], glow: [1, 0.55, 0.85], speed: 0.9 },
    dbarrel: { name: 'Abismo', c1: [0.03, 0.02, 0.05], c2: [0.3, 0.08, 0.45], glow: [0.8, 0.35, 1], speed: 1 },
    lmg: { name: 'Sangre de guerra', c1: [0.12, 0.12, 0.13], c2: [0.45, 0.04, 0.04], glow: [1, 0.15, 0.1], speed: 1.2 },
    flamer: { name: 'Llamarada', c1: [0.45, 0.12, 0.02], c2: [0.95, 0.6, 0.1], glow: [1, 0.9, 0.4], speed: 1.6 },
    raygun: { name: 'Plasma', c1: [0.85, 0.92, 0.95], c2: [0.1, 0.55, 0.6], glow: [1, 0.3, 0.9], speed: 1.4 },
    dual: { name: 'Gemelas de fuego', c1: [0.06, 0.03, 0.02], c2: [0.6, 0.18, 0.05], glow: [1, 0.55, 0.15], speed: 1.2 },
    nailgun: { name: 'Óxido radiactivo', c1: [0.12, 0.1, 0.05], c2: [0.45, 0.4, 0.08], glow: [0.7, 1, 0.2], speed: 1.1 },
    harpoon: { name: 'Abisal', c1: [0.02, 0.05, 0.08], c2: [0.05, 0.3, 0.42], glow: [0.2, 1, 0.85], speed: 0.8 },
    katana: { name: 'Luna sangrienta', c1: [0.08, 0.02, 0.04], c2: [0.5, 0.05, 0.12], glow: [1, 0.25, 0.35], speed: 0.9 },
    knife: { name: 'Hoja maldita', c1: [0.04, 0.03, 0.03], c2: [0.4, 0.03, 0.04], glow: [1, 0.12, 0.08], speed: 1 },
  };
  // color animado de un vóxel con skin definitiva en el instante t
  function ultColor(v, U, t, out) {
    const sp = U.speed || 1;
    if (v.an === 1) {
      // camuflaje: manchas que se deforman y avanzan despacio a lo largo del arma
      const k = 0.5 + 0.5 * Math.sin(v.x * 0.8 + v.y * 0.55 + Math.sin(v.z * 0.23 + t * 0.9 * sp) * 2.2 - t * 1.4 * sp);
      const kk = k * k * (3 - 2 * k), f = v.dk || 1;
      out[0] = (U.c1[0] + (U.c2[0] - U.c1[0]) * kk) * f + v.h; out[1] = (U.c1[1] + (U.c2[1] - U.c1[1]) * kk) * f + v.h; out[2] = (U.c1[2] + (U.c2[2] - U.c1[2]) * kk) * f + v.h;
      out[3] = kk > 0.88 && f === 1 ? (kk - 0.88) * 0.8 : 0;   // el tono claro reluce apenas
    } else if (v.an === 3) {
      // metal: oscuro, con un reflejo del color del arma que lo recorre de vez en cuando
      const w = Math.max(0, Math.sin(v.z * 0.18 - t * 2 * sp)), sh = Math.pow(w, 12);
      out[0] = 0.12 + U.glow[0] * sh * 0.8 + v.h; out[1] = 0.12 + U.glow[1] * sh * 0.8 + v.h; out[2] = 0.13 + U.glow[2] * sh * 0.8 + v.h;
      out[3] = sh * 0.6;
    } else {
      // detalles: laten y una onda de luz recorre el arma de atrás adelante
      const w = Math.max(0, Math.sin(v.z * 0.35 + t * 3.2 * sp));
      const p = 0.55 + 0.25 * Math.sin(t * 2.4 * sp) + 0.35 * w * w;
      out[0] = U.glow[0] * (0.6 + 0.4 * p); out[1] = U.glow[1] * (0.6 + 0.4 * p); out[2] = U.glow[2] * (0.6 + 0.4 * p);
      out[3] = Math.min(1, p);
    }
    return out;
  }
  function skinLabel(s, weapon) { return s && s.ultimate ? (ULT[weapon] ? ULT[weapon].name : s.name) : (s ? s.name : ''); }
  function skinPal(s, weapon) { return s && s.ultimate && ULT[weapon] ? { main: ULT[weapon].c2, accent: ULT[weapon].glow } : (s && s.pal) || {}; }


  // ---------------- Accesorios de arma (sólo para la partida en curso) ----------------
  // Se encuentran en cofres, tiendas y cajas; se montan en el arma, se ven en el modelo y la mejoran.
  // slot: dónde va (top encima, muzzle en la boca, under debajo del cañón, mag en el cargador)
  const ATTACH = {
    reflex: { slot: 'top', name: 'Mira réflex', desc: '-30 % de dispersión y +15 % de alcance', mul: { spread: 0.7, range: 1.15 }, color: [1, 0.3, 0.25], unlock: { stat: 'headshots', n: 50, txt: 'Revienta 50 cabezas' } },
    silencer: { slot: 'muzzle', name: 'Silenciador', desc: '+12 % de daño y disparos mucho más silenciosos', mul: { damage: 1.12, sound: 0.35 }, color: [0.6, 0.65, 0.7], unlock: { w: 'pistol', stat: 'bosses', n: 1, txt: 'Remata a un jefe con la pistola' } },
    comp: { slot: 'muzzle', name: 'Compensador', desc: '-45 % de retroceso', mul: { recoil: 0.55 }, color: [0.95, 0.6, 0.2], unlock: { w: 'shotgun', stat: 'kills', n: 120, txt: 'Elimina 120 zombis con la escopeta' } },
    vgrip: { slot: 'under', name: 'Empuñadura vertical', desc: '-25 % de retroceso y -15 % de dispersión', mul: { recoil: 0.75, spread: 0.85 }, color: [0.7, 0.6, 0.45], unlock: { w: 'smg', stat: 'kills', n: 150, txt: 'Elimina 150 zombis con el subfusil' } },
    laser: { slot: 'under', name: 'Láser', desc: '-25 % de dispersión y +10 % de daño', mul: { spread: 0.75, damage: 1.1 }, color: [1, 0.15, 0.15], unlock: { stat: 'bestFloor', n: 8, txt: 'Llega al piso 8' } },
    extmag: { slot: 'mag', name: 'Cargador ampliado', desc: '+50 % de balas por cargador', mul: { mag: 1.5 }, color: [0.95, 0.75, 0.2], unlock: { stat: 'kills', n: 300, txt: 'Elimina 300 zombis en total' } },
    dualmag: { slot: 'mag', name: 'Doble cargador', desc: 'Recarga un 35 % más rápido', mul: { reload: 0.65 }, color: [0.4, 0.8, 1], unlock: { stat: 'bosses', n: 3, txt: 'Derrota a 3 jefes' } },
  };
  // anclajes por arma (y modelo de pistola): [x, y, z, pieza, corredera]. Si falta, ese accesorio no cabe.
  //   top: primera fila libre encima · muzzle: centro de la boca, justo delante · under: primera fila libre
  //   debajo · mag: debajo del fondo del cargador
  const ANCH = {
    'pistol:pistola': { top: [-0.5, 9, -11, null, true], muzzle: [-0.5, 5.5, -26], under: [-0.5, -2, -18], mag: [-0.5, -14, 3, 'mag'] },
    'pistol:deagle': { top: [-0.5, 12, -12, null, true], muzzle: [-0.5, 6.5, -37], under: [-0.5, -2, -23], mag: [-0.5, -15, 4, 'mag'] },
    'pistol:revolver': { top: [-0.5, 9, -6], muzzle: [-0.5, 6, -34], under: [-0.5, 2, -27] },
    'pistol:auto': { top: [-0.5, 9, -12, null, true], muzzle: [-0.5, 5.5, -31], mag: [-0.5, -23, 6, 'mag'] },
    smg: { top: [-0.5, 9, -13], muzzle: [-0.5, 3.5, -42], under: [-0.5, 0, -30], mag: [-0.5, -15, -19, 'mag'] },
    shotgun: { top: [-0.5, 10, -5], muzzle: [-0.5, 5.5, -49, 'brl'], under: [-0.5, 0, -38, 'brl'] },
    rifle: { muzzle: [-0.5, 4.5, -63], mag: [-0.5, -5, -9, 'mag'] },
    launcher: { top: [-0.5, 10, -5] },
    dbarrel: { top: [-0.5, 8, -14, 'brl'], under: [-0.5, 0, -13, 'brl'] },
    lmg: { top: [-0.5, 9, -15, 'lid'], muzzle: [-0.5, 3.5, -60] },
    flamer: { top: [-0.5, 9, -8] },
    raygun: { top: [-0.5, 11, -14] },
  };
  const ATT_PAL = { att: [0.13, 0.13, 0.14], attDark: [0.06, 0.06, 0.07], attSteel: [0.5, 0.51, 0.55], attLens: [0.35, 0.55, 0.7, 0.35], attGlow: [1, 0.12, 0.08, 1], attTan: [0.45, 0.38, 0.26], attTape: [0.75, 0.6, 0.2] };
  function anchorKey(id, form) { return id === 'pistol' ? 'pistol:' + (form || 'pistola') : id; }
  function attFits(id, form, a) { const A = ANCH[anchorKey(id, form)]; return !!(A && ATTACH[a] && A[ATTACH[a].slot]); }
  // vóxeles de los accesorios montados (se añaden al modelo del arma)
  // Ajusta los anclajes a la forma real del modelo (las armas se han rediseñado y algunos
  // accesorios quedaban flotando o metidos dentro): la boca es el frente del cañón y el
  // cargador ampliado va justo debajo del fondo del cargador de verdad.
  const anchFix = {};
  function liveAnchors(id, form) {
    const k = anchorKey(id, form);
    if (anchFix[k]) return anchFix[k];
    const A = ANCH[k];
    if (!A) return null;
    const out = { ...A };
    const base = MODELS[id](form).filter((v) => !HAND[v.tag] && !(v.part && v.part.startsWith('rl_')));
    if (A.muzzle) {
      // la punta del cañón: la fila más adelantada cerca del eje central
      const near = base.filter((v) => v.x >= -2 && v.x <= 1 && Math.abs(v.y - A.muzzle[1]) <= 4);
      if (near.length) {
        const zmin = Math.min(...near.map((v) => v.z));
        const tip = near.filter((v) => v.z === zmin);
        const yc = tip.reduce((s2, v) => s2 + v.y, 0) / tip.length;
        out.muzzle = [A.muzzle[0], yc, zmin - 1, A.muzzle[3], A.muzzle[4]];
      }
    }
    if (A.mag) {
      const mag = base.filter((v) => v.part === 'mag');
      if (mag.length) {
        const ymin = Math.min(...mag.map((v) => v.y));
        const row = mag.filter((v) => v.y === ymin);
        const zc = row.reduce((s2, v) => s2 + v.z, 0) / row.length;
        out.mag = [A.mag[0], ymin - 1, zc, A.mag[3], A.mag[4]];
      }
    }
    if (A.top) {
      // encima de lo más alto que haya en ese tramo (para que la mira se apoye y no se hunda)
      const col = base.filter((v) => v.x >= -1 && v.x <= 0 && Math.abs(v.z - A.top[2]) <= 3);
      if (col.length) out.top = [A.top[0], Math.max(...col.map((v) => v.y)) + 1, A.top[2], A.top[3], A.top[4]];
    }
    if (A.under) {
      const col = base.filter((v) => v.x >= -1 && v.x <= 0 && Math.abs(v.z - A.under[2]) <= 3 && v.y <= A.under[1] + 6);
      if (col.length) out.under = [A.under[0], Math.min(...col.map((v) => v.y)) - 1, A.under[2], A.under[3], A.under[4]];
    }
    return (anchFix[k] = out);
  }
  function attVoxels(id, form, list) {
    const out = [], A = liveAnchors(id, form);
    if (!A) return out;
    for (const a of list) {
      const def = ATTACH[a], an = def && A[def.slot];
      if (!an) continue;
      const [ax, ay, az, prt, sl] = an, x0 = Math.round(ax - 0.5);   // x0..x0+1 son las dos columnas centrales
      const put = (x1, x2, y1, y2, z1, z2, tag, cond) => {
        for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) {
          if (cond && !cond(x, y, z)) continue;
          out.push({ x, y, z, tag, part: prt || null, slide: !!sl, h: (M.hash3(x + 7, y + 3, z + 11) - 0.5) * 0.03 });
        }
      };
      const X = x0, Y = Math.round(ay), Z = Math.round(az);
      if (a === 'reflex') {
        put(X, X + 1, Y, Y, Z - 3, Z + 3, 'attDark');                                                    // montura
        put(X - 1, X + 2, Y + 1, Y + 4, Z - 2, Z - 2, 'att', (x, y) => x === X - 1 || x === X + 2 || y === Y + 1 || y === Y + 4);   // marco
        put(X, X + 1, Y + 2, Y + 3, Z - 2, Z - 2, 'attLens');                                            // cristal
        put(X - 1, X + 2, Y + 1, Y + 2, Z - 1, Z + 2, 'att', (x, y, z) => !(y === Y + 2 && (x === X - 1 || x === X + 2) && z > Z - 1));
        put(X + 2, X + 2, Y + 1, Y + 1, Z, Z, 'attSteel');                                               // ruedecilla
        put(X, X, Y + 3, Y + 3, Z - 1, Z - 1, 'attGlow');                                                // punto rojo
      } else if (a === 'silencer') {
        const yc = ay;
        put(X - 1, X + 2, Math.round(yc - 2), Math.round(yc + 1), Z - 13, Z, 'att', (x, y, z) => !((x === X - 1 || x === X + 2) && (y === Math.round(yc - 2) || y === Math.round(yc + 1))) && !(z === Z - 13 && x >= X && x <= X + 1 && y >= Math.round(yc - 1) && y <= Math.round(yc)));
        for (const z of [Z - 1, Z - 12]) put(X - 1, X + 2, Math.round(yc - 2), Math.round(yc + 1), z, z, 'attSteel', (x, y) => !((x === X - 1 || x === X + 2) && (y === Math.round(yc - 2) || y === Math.round(yc + 1))));
        for (let z = Z - 10; z <= Z - 3; z += 2) put(X - 1, X - 1, Math.round(yc - 1), Math.round(yc), z, z, 'attDark');
      } else if (a === 'comp') {
        const y1 = Math.round(ay - 2), y2 = Math.round(ay + 1);
        put(X - 1, X + 2, y1, y2, Z - 5, Z, 'attSteel', (x, y, z) => !(x >= X && x <= X + 1 && y > y1 && y < y2) && !(y === y2 && (z === Z - 2 || z === Z - 4) && x >= X && x <= X + 1) && !((x === X - 1 || x === X + 2) && (z === Z - 2 || z === Z - 4) && y > y1 && y < y2));
        put(X - 1, X + 2, y1, y1, Z - 5, Z, 'attDark', (x) => x === X - 1 || x === X + 2);
      } else if (a === 'vgrip') {
        put(X - 1, X + 2, Y, Y, Z - 3, Z + 2, 'attDark');                                                // riel
        for (let k = 1; k <= 7; k++) put(X, X + 1, Y - k, Y - k, Z - 1 + Math.round(k * 0.15), Z + 1 + Math.round(k * 0.15), k === 7 ? 'attDark' : (k % 2 ? 'attTan' : 'att'));
      } else if (a === 'laser') {
        put(X - 1, X + 2, Y, Y, Z - 3, Z + 2, 'attDark');
        put(X - 1, X + 2, Y - 2, Y - 1, Z - 4, Z + 1, 'att', (x, y, z) => !((x === X - 1 || x === X + 2) && y === Y - 2));
        put(X, X, Y - 2, Y - 2, Z - 5, Z - 5, 'attGlow'); put(X + 1, X + 1, Y - 1, Y - 1, Z - 5, Z - 5, 'attLens');
        put(X + 2, X + 2, Y - 1, Y - 1, Z, Z, 'attGlow');                                                // botón
      } else if (a === 'extmag') {
        put(X, X + 1, Y - 4, Y, Z - 2, Z + 2, 'att');
        put(X - 1, X + 2, Y - 5, Y - 5, Z - 3, Z + 3, 'attDark');
        put(X - 1, X - 1, Y - 3, Y - 2, Z - 1, Z + 1, 'attTape'); put(X + 2, X + 2, Y - 3, Y - 2, Z - 1, Z + 1, 'attTape');
      } else if (a === 'dualmag') {
        put(X - 1, X + 2, Y, Y + 1, Z - 2, Z + 2, 'attTape', (x, y, z) => z === Z - 2 || z === Z + 2);   // cinta
        put(X, X + 1, Y - 3, Y + 1, Z + 3, Z + 6, 'att');                                                // el segundo cargador, al revés
        put(X, X + 1, Y - 4, Y - 4, Z + 3, Z + 6, 'attSteel');
        put(X - 1, X + 2, Y - 1, Y - 1, Z - 2, Z + 6, 'attTape', (x, y, z) => z === Z - 1 || z === Z + 4);
      }
    }
    return out;
  }

  const cache = {};
  const AMMO_PAL = { brass: [0.86, 0.66, 0.26], lead: [0.42, 0.42, 0.46], shell: [0.62, 0.1, 0.07], gren: [0.24, 0.32, 0.18] };
  // Las manos ya no se dibujan (sólo el arma). Con extras = true incluye las piezas de recarga
  function coloredModel(id, skinId, form, extras, atts) {
    const key = id + ':' + skinId + ':' + (form || '') + (extras ? ':x' : '') + (atts && atts.length ? ':' + atts.join('+') : '');
    if (cache[key]) return cache[key];
    let base = MODELS[id](form).filter((v) => !HAND[v.tag] && (extras || !(v.part && v.part.startsWith('rl_'))));
    if (atts && atts.length) {
      // los accesorios tapan lo que hubiera en su sitio
      const add = attVoxels(id, form, atts), taken = new Set(add.map((v) => v.x + ',' + v.y + ',' + v.z));
      base = base.filter((v) => !taken.has(v.x + ',' + v.y + ',' + v.z)).concat(add);
    }
    const skin = findSkin(skinId) || SKINS[0];
    const U = skin.ultimate ? ULT[id] : null;
    const pal = { ...AMMO_PAL, ...DEFAULT_PAL[id], ...((form && DEFAULT_PAL[id + ':' + form]) || {}), ...(skin.pal || {}) };
    const out = base.map((v) => {
      let c = pal[v.tag] || [1, 0, 1];
      if (skin.pal && skin.pal.checker && (v.tag === 'main' || v.tag === 'dark') && ((v.x + v.y + v.z) & 1)) c = [c[0] * 1.6, c[1] * 1.6, c[2] * 1.7];
      if (AMMO_PAL[v.tag]) c = AMMO_PAL[v.tag];
      if (ATT_PAL[v.tag]) c = ATT_PAL[v.tag];
      // las balas que asoman por arriba del cargador van aparte: el cargador que se tira sale vacío
      const prt = v.part === 'mag' && (v.tag === 'brass' || v.tag === 'lead' || v.tag === 'shell') ? 'magr' : v.part;
      const o = { x: v.x, y: v.y, z: v.z, tag: v.tag, part: prt, slide: v.slide, pump: v.pump, side: v.side, r: c[0] + v.h, g: c[1] + v.h, b: c[2] + v.h, e: c[3] || 0, h: v.h };
      // skin definitiva: el cuerpo lleva el camuflaje animado (an 1) y los detalles brillan (an 2)
      if (U && !AMMO_PAL[v.tag] && !ATT_PAL[v.tag]) {
        // 1 camuflaje (cuerpo, culata, empuñadura) · 2 detalles que laten (pocos y pequeños) · 3 metal con brillo que pasa
        const bigAccent = id === 'flamer' || id === 'hammer';   // en estas el «acento» es una pieza grande
        o.an = v.tag === 'main' || v.tag === 'dark' || v.tag === 'grip' || ((id === 'knife' || id === 'katana') && v.tag === 'blade') || (bigAccent && v.tag === 'accent') ? 1
          : v.tag === 'accent' || (id === 'raygun' && v.tag === 'blade') ? 2 : v.tag === 'steel' || v.tag === 'blade' ? 3 : 0;
        if (o.an === 1 && (v.tag === 'grip' || v.tag === 'dark')) o.dk = 0.6;
        if (o.an) { const cc = ultColor(o, U, 0, [0, 0, 0, 0]); o.r = cc[0]; o.g = cc[1]; o.b = cc[2]; o.e = cc[3]; }
      }
      return o;
    });
    if (U) out.ult = U;
    cache[key] = out;
    return out;
  }

  // Cambia la pistola equipada por otro modelo (sus estadísticas, nombre, sonido y boca del cañón)
  const PISTOL_BASE = JSON.parse(JSON.stringify(DEFS.pistol));
  DEFS.pistol.sfx = 'pistol';
  PISTOL_BASE.sfx = 'pistol';
  function applyPistolForm(id) {
    const f = PISTOLS.find((p) => p.id === id) || PISTOLS[0];
    for (const k of Object.keys(DEFS.pistol)) delete DEFS.pistol[k];
    Object.assign(DEFS.pistol, JSON.parse(JSON.stringify(PISTOL_BASE)), f.stats ? JSON.parse(JSON.stringify(f.stats)) : {});
    DEFS.pistol.vm = { ...(f.vm || PISTOL_BASE.vm) };
    DEFS.pistol.form = f.id;
  }
  DEFS.smg.sfx = 'smg'; DEFS.shotgun.sfx = 'shotgun'; DEFS.rifle.sfx = 'rifle'; DEFS.launcher.sfx = 'launcher';
  for (const id of ['crossbow', 'dbarrel', 'lmg', 'flamer', 'raygun', 'nailgun', 'harpoon']) DEFS[id].sfx = id;
  DEFS.dual.sfx = 'pistol';

  VX.Weapons = { DEFS, GUNS, SKINS, SPECIAL, skinsFor, findSkin, MODELS, KNIVES, PISTOLS, ULT, ultColor, coloredModel, applyPistolForm, skinLabel, skinPal, ATTACH, attFits };
})();
