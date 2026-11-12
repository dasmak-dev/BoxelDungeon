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
      price: 70, vm: { x: 0.15, y: -0.14, z: -0.28, g: 0.0085 }, muzzle: [-0.5, 4, -36],
    },
    shotgun: {
      shake: 0.38, art: 'la escopeta', name: 'Escopeta', damage: 12, fireRate: 1.5, range: 16, mag: 6, reload: 2.1, spread: 0.1105,
      pellets: 8, pierce: 0, destruction: 1.25, auto: false, recoil: 0.07, recoilPat: { up: 0.096, side: 0.0225 }, kick: 0.09, sound: 2.2,
      price: 80, vm: { x: 0.15, y: -0.15, z: -0.3, g: 0.0085 }, muzzle: [-0.5, 5.5, -46],
    },
    rifle: {
      shake: 0.32, art: 'el rifle', name: 'Rifle de cerrojo', damage: 90, fireRate: 1.1, range: 70, mag: 5, reload: 2.3, spread: 0.002,
      pellets: 1, pierce: 2, destruction: 1.6, auto: false, recoil: 0.08, recoilPat: { up: 0.088, side: 0.018 }, kick: 0.08, sound: 2.6,
      price: 90, vm: { x: 0.15, y: -0.15, z: -0.32, g: 0.008 }, muzzle: [-0.5, 5.5, -58],
    },
    launcher: {
      shake: 0.28, art: 'el lanzagranadas', name: 'Lanzagranadas', damage: 110, fireRate: 1.0, range: 40, mag: 4, reload: 2.5, spread: 0.013,
      pellets: 1, pierce: 0, destruction: 1, auto: false, recoil: 0.06, recoilPat: { up: 0.064, side: 0.015 }, kick: 0.07, sound: 2,
      grenade: true, blast: 2.3,
      price: 110, vm: { x: 0.16, y: -0.16, z: -0.32, g: 0.0085 }, muzzle: [-0.5, 4.5, -34],
    },
  };
  const GUNS = ['pistol', 'smg', 'shotgun', 'rifle', 'launcher', 'hammer'];

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
  ];

  const HAND = { hand: [0.78, 0.6, 0.47], wrist: [0.7, 0.53, 0.42], sleeve: [0.18, 0.2, 0.17] };

  // ---------------- Modelos ----------------
  function builder() {
    const vox = [];
    const add = (x0, x1, y0, y1, z0, z1, tag, cond) => {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (cond && !cond(x, y, z)) continue;
        vox.push({ x, y, z, tag, h: (M.hash3(x + 10, y + 20, z + 30) - 0.5) * 0.035 });
      }
    };
    return { vox, add };
  }
  // mano que agarra una empuñadura en (z de la empuñadura)
  function addHand(add, zc = 2, yTop = -2) {
    add(-3, 2, yTop - 8, yTop, zc - 5, zc + 4, 'hand', (x, y, z) => x === -3 || x === 2 || z === zc + 4 || y === yTop - 8);
    add(-4, -3, yTop - 1, yTop, zc - 9, zc - 1, 'hand');
    add(-3, -1, yTop - 7, yTop - 2, zc - 6, zc - 5, 'hand');
    add(-3, 2, yTop - 11, yTop - 8, zc + 2, zc + 6, 'wrist', (x, y) => x === -3 || x === 2 || y === yTop - 11 || y === yTop - 8);
    add(-4, 3, yTop - 15, yTop - 9, zc + 6, zc + 22, 'sleeve', (x, y) => x === -4 || x === 3 || y === yTop - 15 || y === yTop - 9);
  }

  const MODELS = {
    pistol() {
      const { vox, add } = builder();
      add(-2, 1, 4, 7, -23, 0, 'main', (x, y, z) => !(z > -4 && (z & 1) && (x === -2 || x === 1)));
      add(1, 1, 6, 7, -13, -9, 'dark');
      add(-1, 0, 5, 6, -24, -24, 'dark');
      add(-1, 0, 8, 8, -21, -21, 'steel');
      add(-2, 1, 8, 8, -2, -1, 'main', (x) => x === -2 || x === 1);
      add(-2, 1, 1, 3, -21, -2, 'dark');
      add(-2, 1, 0, 0, -21, -15, 'dark');
      add(-1, 0, -3, -3, -11, -4, 'dark');
      add(-1, 0, -2, 0, -11, -11, 'dark');
      add(-1, 0, -2, -1, -7, -7, 'steel');
      for (let k = 0; k <= 12; k++) {
        const zo = Math.round(k * 0.35);
        add(-2, 1, -k, -k, -4 + zo, 1 + zo, k > 11 ? 'dark' : 'grip', (x, y, z) => !((x === -2 || x === 1) && (z === 1 + zo) && k % 3 === 0));
      }
      add(-1, 0, 5, 6, 1, 1, 'dark');
      add(-2, -2, 2, 2, -18, -10, 'accent'); add(1, 1, 2, 2, -18, -10, 'accent');
      for (const v of vox) if (v.y >= 4 && v.tag !== 'accent') v.slide = true;
      addHand(add, 2, -2);
      return vox;
    },
    smg() {
      const { vox, add } = builder();
      add(-2, 1, 1, 6, -26, 0, 'main');
      add(-1, 0, 3, 4, -36, -27, 'steel');
      add(-2, 1, 2, 5, -32, -27, 'dark', (x, y, z) => (z & 1) === 0 || y === 2 || y === 5);
      add(-1, 0, -13, 0, -17, -13, 'dark');
      add(-1, 0, 7, 8, -24, -22, 'steel'); add(-1, 0, 7, 8, -4, -3, 'steel');
      add(-2, 1, 3, 4, 1, 10, 'dark', (x) => x === -2 || x === 1);
      add(-2, 1, 1, 5, 10, 11, 'dark');
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, -k, -k, -4 + zo, 0 + zo, 'grip'); }
      add(-2, -2, 4, 4, -24, -6, 'accent'); add(1, 1, 4, 4, -24, -6, 'accent');
      addHand(add, 1, -2);
      return vox;
    },
    shotgun() {
      const { vox, add } = builder();
      add(-1, 0, 5, 6, -46, -6, 'steel');
      add(-1, 0, 2, 3, -40, -10, 'dark');
      add(-2, 1, 1, 4, -32, -20, 'grip', (x, y, z) => !((z % 3 === 0) && (x === -2 || x === 1)));
      for (const v of vox) if (v.tag === 'grip') v.pump = true;
      add(-2, 1, 1, 7, -9, 3, 'main');
      add(-1, 0, 8, 8, -44, -44, 'accent');
      add(-1, 0, -3, 0, -3, 2, 'grip');
      for (let k = 0; k <= 9; k++) add(-2, 1, -k + 2, 5 - Math.floor(k * 0.3), 3 + k * 2, 4 + k * 2, 'grip');
      add(-2, -2, 4, 4, -8, 1, 'accent'); add(1, 1, 4, 4, -8, 1, 'accent');
      addHand(add, 1, -1);
      return vox;
    },
    rifle() {
      const { vox, add } = builder();
      add(-1, 0, 4, 5, -58, -12, 'steel');
      add(-2, 1, 1, 6, -14, 4, 'main');
      add(-2, 1, 0, 3, -36, -14, 'grip');
      add(-2, 1, 9, 11, -18, -2, 'dark');
      add(-1, 0, 10, 10, -19, -19, 'accent');
      add(-1, 0, 8, 8, -14, -12, 'dark'); add(-1, 0, 8, 8, -6, -4, 'dark');
      add(2, 4, 5, 5, -3, -3, 'steel'); add(4, 4, 4, 5, -3, -2, 'steel');
      for (let k = 0; k <= 12; k++) add(-2, 1, -k + 3, 5 - Math.floor(k * 0.25), 4 + k * 2, 5 + k * 2, 'grip');
      add(-1, 0, -3, 0, -2, 3, 'grip');
      addHand(add, 2, -1);
      return vox;
    },
    launcher() {
      const { vox, add } = builder();
      add(-3, 2, 2, 7, -32, 2, 'main', (x, y) => !((x === -3 || x === 2) && (y === 2 || y === 7)));
      add(-2, 1, 3, 6, -33, -33, 'dark', (x, y) => x === -2 || x === 1 || y === 3 || y === 6);
      add(-3, 2, 2, 7, -24, -22, 'dark'); add(-3, 2, 2, 7, -6, -4, 'dark');
      add(-1, 0, 8, 9, -20, -8, 'steel');
      add(-3, -3, 4, 5, -20, -8, 'accent'); add(2, 2, 4, 5, -20, -8, 'accent');
      add(-1, 0, -2, 1, -14, -10, 'grip');
      for (let k = 0; k <= 10; k++) { const zo = Math.round(k * 0.3); add(-2, 1, 1 - k, 1 - k, -2 + zo, 2 + zo, 'grip'); }
      addHand(add, 2, -1);
      return vox;
    },
    // Mazo de demolición: mango largo de fibra amarilla con franjas, empuñadura de goma
    // y una cabeza de acero rectangular ATRAVESADA en el mango (caras de golpeo a los lados)
    hammer() {
      const { vox, add } = builder();
      add(-1, 0, -1, 0, -31, 4, 'accent', (x, y, z) => !(Math.floor((z + 40) / 4) % 3 === 0));   // fibra amarilla
      add(-1, 0, -1, 0, -31, 4, 'dark', (x, y, z) => Math.floor((z + 40) / 4) % 3 === 0);        // franjas negras
      add(-2, 1, -2, 1, 2, 11, 'grip', (x, y, z) => !((x === -2 || x === 1) && (y === -2 || y === 1)) || z % 3 === 0);   // goma
      add(-2, 1, -2, 1, 12, 12, 'dark');
      // cabeza: bloque largo de lado a lado, con chaflanes
      add(-10, 9, -4, 3, -40, -32, 'main', (x, y, z) => {
        const ex = x === -10 || x === 9, ey = y === -4 || y === 3, ez = z === -40 || z === -32;
        return !((ex && ey) || (ex && ez) || (ey && ez));
      });
      add(-11, -11, -3, 2, -39, -33, 'steel'); add(10, 10, -3, 2, -39, -33, 'steel');   // caras de golpeo
      add(-3, 2, 4, 4, -38, -34, 'dark');                                                // cuña de la cabeza
      add(-2, 1, -5, -5, -38, -34, 'dark');
      add(-6, -5, 4, 4, -37, -35, 'steel'); add(4, 5, 4, 4, -37, -35, 'steel');            // marcas gastadas
      // mano con guante de trabajo
      add(-3, 2, -3, 2, 3, 9, 'hand', (x, y, z) => (x === -3 || x === 2 || y === -3 || y === 2) && z % 2 === 1);
      add(-3, 2, -4, 3, 10, 13, 'wrist', (x, y) => x === -3 || x === 2 || y === -4 || y === 3);
      add(-4, 3, -5, 4, 13, 29, 'sleeve', (x, y) => x === -4 || x === 3 || y === -5 || y === 4);
      return vox;
    },
    // Cuchillo (sin mano: sólo se ve el arma). form: la forma desbloqueada
    knife(form = 'cuchillo') { return KNIFE_MODELS[form] ? KNIFE_MODELS[form]() : KNIFE_MODELS.cuchillo(); },
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
    cuchillo() {
      const { vox, add } = builder();
      for (let z = -26; z <= -4; z++) {
        const tip = z < -21 ? Math.round((z + 26) * 0.6) : 3;
        add(0, 0, 0, Math.max(0, tip), z, z, 'blade');
        if (tip >= 1) add(0, 0, 0, 0, z, z, 'steel');
      }
      add(-1, 1, 3, 3, -14, -5, 'dark', (x) => x === 0);
      add(-2, 2, -1, 4, -3, -3, 'dark');
      add(-1, 1, -1, 3, -2, 8, 'grip', (x, y, z) => !(x !== 0 && y === 1 && z % 3 === 0));
      add(-1, 1, -1, 3, 9, 10, 'accent');
      return vox;
    },
    // garra curva con anilla para el dedo
    karambit() {
      const { vox, add } = builder();
      for (let t = 0; t <= 16; t++) {
        const z = -3 - t, c = -Math.round((t * t) / 16), w = Math.max(0, Math.round(3 - t * 0.17));
        add(0, 0, c, c + w, z, z, 'blade');
        add(0, 0, c, c, z, z, 'steel');
      }
      add(-1, 1, -1, 3, -2, -2, 'dark');
      add(-1, 1, -1, 2, -1, 7, 'grip');
      for (let a = 0; a < 20; a++) {
        const th = (a / 20) * Math.PI * 2, y = 1 + Math.round(Math.sin(th) * 3), z = 11 + Math.round(Math.cos(th) * 3);
        add(-1, 1, y, y, z, z, 'accent', (x) => x === 0 || a % 2 === 0);
      }
      return vox;
    },
    // doble filo simétrico con nervio central y guarda ancha
    daga() {
      const { vox, add } = builder();
      for (let z = -24; z <= -4; z++) {
        const w = z < -14 ? Math.round((z + 24) * 0.25) : 2;
        add(0, 0, 1 - w, 1 + w, z, z, 'blade');
        add(0, 0, 1, 1, z, z, 'steel');
      }
      add(-1, 1, -3, 5, -3, -3, 'accent'); add(-1, 1, -4, -4, -3, -3, 'accent', (x) => x === 0); add(-1, 1, 6, 6, -3, -3, 'accent', (x) => x === 0);
      add(-1, 1, 0, 2, -2, 7, 'grip', (x, y, z) => !(z % 2 === 0 && x !== 0));
      add(-1, 1, -1, 3, 8, 9, 'accent');
      return vox;
    },
    // hoja larga y ancha con panza en la punta
    machete() {
      const { vox, add } = builder();
      for (let z = -40; z <= -4; z++) {
        const top = z < -33 ? Math.round(5 - (z + 40) * 0.0) : 4;
        const bot = z < -32 ? -Math.round((z + 40) * 0.12) : -1;
        const tipCut = z < -37 ? Math.round((-37 - z) * 1.6) : 0;
        add(0, 0, bot, top - tipCut, z, z, 'blade');
        add(0, 0, bot, bot, z, z, 'steel');
        if (z % 6 === 0) add(0, 0, top - 1, top - 1, z, z, 'dark');
      }
      add(-1, 1, -1, 4, -3, -3, 'dark');
      add(-1, 1, -1, 3, -2, 9, 'grip', (x, y, z) => !(x !== 0 && z % 4 === 0));
      add(-1, 1, -2, 3, 10, 10, 'dark');
      return vox;
    },
    // larga y estrecha, con sierra en el lomo y anilla para el cañón
    bayoneta() {
      const { vox, add } = builder();
      for (let z = -32; z <= -4; z++) {
        const tip = z < -27 ? Math.round((z + 32) * 0.5) : 2;
        add(0, 0, 0, Math.max(0, tip), z, z, 'blade');
        add(0, 0, 0, 0, z, z, 'steel');
        if (z > -24 && z < -8 && z % 2 === 0) add(0, 0, 3, 3, z, z, 'dark');   // sierra
      }
      for (let a = 0; a < 16; a++) { const th = a / 16 * Math.PI * 2; add(Math.round(Math.cos(th) * 2), Math.round(Math.cos(th) * 2), 5 + Math.round(Math.sin(th) * 2), 5 + Math.round(Math.sin(th) * 2), -3, -3, 'dark'); }
      add(-1, 1, -1, 3, -3, -3, 'dark');
      add(-1, 1, -1, 3, -2, 8, 'grip');
      add(-1, 1, 0, 2, 9, 11, 'steel');
      return vox;
    },
    // dos cachas caladas que se abren alrededor de la hoja
    mariposa() {
      const { vox, add } = builder();
      for (let z = -24; z <= -4; z++) {
        const tip = z < -18 ? Math.round((z + 24) * 0.5) : 3;
        add(0, 0, 0, Math.max(0, tip), z, z, 'blade');
        add(0, 0, 0, 0, z, z, 'steel');
      }
      add(-2, 2, 0, 3, -3, -3, 'dark');
      for (const x of [-2, 2]) add(x, x, -1, 3, -2, 10, 'grip', (xx, y, z) => !(y >= 0 && y <= 2 && z % 3 !== 0 && z > -1 && z < 9));
      add(-2, 2, -1, -1, 10, 10, 'accent');   // pestillo
      add(-1, 1, -1, 3, -2, -2, 'accent');
      return vox;
    },
  };
  void 0;
  const DEFAULT_PAL = {
    knife: { blade: [0.75, 0.77, 0.8], steel: [0.95, 0.96, 1], dark: [0.2, 0.2, 0.22], grip: [0.3, 0.2, 0.12], accent: [0.6, 0.6, 0.62] },
    hammer: { main: [0.24, 0.25, 0.27], steel: [0.66, 0.67, 0.7], dark: [0.07, 0.07, 0.08], grip: [0.09, 0.09, 0.1], accent: [0.92, 0.66, 0.08], hand: [0.62, 0.48, 0.24], wrist: [0.5, 0.38, 0.2] },
    pistol: { main: [0.36, 0.36, 0.39], dark: [0.2, 0.2, 0.22], grip: [0.24, 0.17, 0.12], steel: [0.7, 0.71, 0.75], accent: [0.9, 0.4, 0.1] },
    smg: { main: [0.25, 0.27, 0.24], dark: [0.15, 0.15, 0.16], grip: [0.2, 0.2, 0.2], steel: [0.6, 0.6, 0.64], accent: [0.9, 0.4, 0.1] },
    shotgun: { main: [0.3, 0.3, 0.33], dark: [0.15, 0.15, 0.16], grip: [0.45, 0.27, 0.13], steel: [0.5, 0.5, 0.54], accent: [0.9, 0.4, 0.1] },
    rifle: { main: [0.28, 0.28, 0.3], dark: [0.12, 0.12, 0.13], grip: [0.4, 0.24, 0.12], steel: [0.48, 0.48, 0.52], accent: [0.4, 0.8, 1, 0.8] },
    launcher: { main: [0.3, 0.36, 0.24], dark: [0.15, 0.17, 0.13], grip: [0.18, 0.18, 0.18], steel: [0.55, 0.56, 0.6], accent: [1, 0.75, 0.1] },
  };

  // Construye la lista de vóxeles coloreados para un arma y una skin
  const cache = {};
  function coloredModel(id, skinId, form) {
    const key = id + ':' + skinId + ':' + (form || '');
    if (cache[key]) return cache[key];
    const base = MODELS[id](form);
    const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    const pal = { ...HAND, ...DEFAULT_PAL[id], ...(skin.pal || {}) };
    const out = base.map((v) => {
      let c = pal[v.tag] || [1, 0, 1];
      if (skin.pal && skin.pal.checker && (v.tag === 'main' || v.tag === 'dark') && ((v.x + v.y + v.z) & 1)) c = [c[0] * 1.6, c[1] * 1.6, c[2] * 1.7];
      return { x: v.x, y: v.y, z: v.z, tag: v.tag, slide: v.slide, pump: v.pump, r: c[0] + v.h, g: c[1] + v.h, b: c[2] + v.h, e: c[3] || 0 };
    });
    cache[key] = out;
    return out;
  }

  VX.Weapons = { DEFS, GUNS, SKINS, MODELS, KNIVES, coloredModel };
})();
