// Mejoras del arma y del jugador.
(function () {
  const U = [
    { id: 'damage', name: 'Balas pesadas', desc: '+25% de daño', shape: 'bullet', color: [1, 0.3, 0.2],
      apply: (g) => { g.weapon.mods.damage *= 1.25; } },
    { id: 'range', name: 'Cañón largo', desc: '+35% de alcance', shape: 'arrow', color: [0.3, 0.8, 1],
      apply: (g) => { g.weapon.mods.range *= 1.35; g.weapon.mods.spread *= 0.85; } },
    { id: 'rate', name: 'Gatillo ligero', desc: '+20% de cadencia', shape: 'bolt', color: [1, 0.9, 0.2],
      apply: (g) => { g.weapon.mods.rate *= 1.2; } },
    { id: 'mag', name: 'Cargador ampliado', desc: '+40% de balas por cargador', shape: 'mag', color: [0.6, 0.6, 0.65],
      apply: (g) => { g.weapon.mods.mag *= 1.4; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'reload', name: 'Recarga rápida', desc: '-25% tiempo de recarga', shape: 'clock', color: [0.4, 1, 0.5],
      apply: (g) => { g.weapon.mods.reload *= 0.75; } },
    { id: 'pierce', name: 'Perforación', desc: 'Atraviesa +1 enemigo', shape: 'pierce', color: [0.8, 0.4, 1],
      apply: (g) => { g.weapon.mods.pierce += 1; } },
    { id: 'blast', name: 'Munición expansiva', desc: '+40% de destrucción', shape: 'star', color: [1, 0.55, 0.1],
      apply: (g) => { g.weapon.mods.destruction *= 1.4; g.weapon.mods.damage *= 1.05; } },
    { id: 'multi', name: 'Perdigones', desc: '+1 proyectil por disparo', shape: 'multi', color: [0.9, 0.9, 0.9],
      apply: (g) => { g.weapon.mods.pellets += 1; g.weapon.mods.spread *= 1.25; } },
    { id: 'vital', name: 'Corazón de vóxel', desc: '+25 de vida máxima', shape: 'heart', color: [1, 0.25, 0.4],
      apply: (g) => { g.player.maxHp += 25; g.player.hp += 25; } },
    { id: 'grip', name: 'Empuñadura firme', desc: '-30% de retroceso: el arma sube menos al mantener el gatillo', shape: 'arrow', color: [0.75, 0.65, 0.5],
      available: (g) => (g.weapon.mods.recoil || 1) > 0.3, apply: (g) => { g.weapon.mods.recoil = (g.weapon.mods.recoil || 1) * 0.7; } },
    { id: 'speed', name: 'Botas ligeras', desc: '+12% de velocidad', shape: 'boot', color: [0.5, 0.75, 1],
      apply: (g) => { g.player.speed *= 1.12; } },
    { id: 'auto', name: 'Gatillo automático', desc: 'Todas las armas disparan en ráfaga al mantener', shape: 'auto', color: [1, 0.35, 0.6],
      available: (g) => !g.weapon.mods.auto, apply: (g) => { g.weapon.mods.auto = true; g.weapon.mods.rate *= 1.1; } },
    // ---- raras (efectos especiales) ----
    { id: 'fire', rare: true, name: 'Balas incendiarias', desc: 'Prenden fuego a los zombis', shape: 'bolt', color: [1, 0.45, 0.05],
      available: (g) => !g.weapon.mods.fire, apply: (g) => { g.weapon.mods.fire = true; } },
    { id: 'ricochet', rare: true, name: 'Rebote', desc: 'Las balas rebotan en las paredes hacia otro enemigo', shape: 'arrow', color: [0.4, 1, 0.9],
      available: (g) => (g.weapon.mods.ricochet || 0) < 2, apply: (g) => { g.weapon.mods.ricochet = (g.weapon.mods.ricochet || 0) + 1; } },
    { id: 'lifesteal', rare: true, name: 'Vampirismo', desc: 'Cada impacto y cada muerte te curan', shape: 'heart', color: [0.85, 0.1, 0.3],
      available: (g) => !g.weapon.mods.lifesteal, apply: (g) => { g.weapon.mods.lifesteal = true; } },
    { id: 'corpseBlast', rare: true, name: 'Cadáveres explosivos', desc: 'Los zombis revientan al morir', shape: 'star', color: [1, 0.3, 0.1],
      available: (g) => !g.weapon.mods.corpseBlast, apply: (g) => { g.weapon.mods.corpseBlast = true; } },
    // ---- maldiciones (poder a cambio de un precio) ----
    { id: 'glass', curse: true, name: 'Pacto de cristal', desc: '+50% de daño, pero -30% de vida máxima', shape: 'eye', color: [0.7, 0.3, 1],
      apply: (g) => { g.weapon.mods.damage *= 1.5; g.player.maxHp = Math.max(30, Math.round(g.player.maxHp * 0.7)); g.player.hp = Math.min(g.player.hp, g.player.maxHp); } },
    { id: 'blood', curse: true, name: 'Pacto de sangre', desc: '+40% de cadencia, pero sangras durante los combates', shape: 'eye', color: [0.7, 0.05, 0.1],
      available: (g) => !g.weapon.mods.bleed, apply: (g) => { g.weapon.mods.rate *= 1.4; g.weapon.mods.bleed = true; } },
    { id: 'greed', curse: true, name: 'Pacto del avaro', desc: 'Doble de oro, pero los zombis aguantan un 25% más', shape: 'coin', color: [0.9, 0.7, 0.1],
      available: (g) => !g.weapon.mods.greed, apply: (g) => { g.weapon.mods.greed = true; } },
    // ---- mercancía de la tienda (se desbloquea con esencia en el Santuario) ----
    { id: 'magnet', shop: true, unlock: 45, name: 'Imán de oro', desc: '+3 m de radio para recoger monedas', shape: 'coin', color: [1, 0.8, 0.2],
      apply: (g) => { g.player.magnet += 3; } },
    { id: 'dash2', shop: true, unlock: 90, name: 'Doble impulso', desc: '+1 carga de esquiva (encadena dos seguidas)', shape: 'boot', color: [0.6, 0.85, 1],
      available: (g) => g.player.dashMax < 3, apply: (g) => { g.player.dashMax++; g.player.dashStock = g.player.dashMax; } },
    { id: 'dashcd', shop: true, unlock: 60, name: 'Piernas de gato', desc: 'La esquiva recarga un 30% más rápido', shape: 'clock', color: [0.5, 0.9, 1],
      available: (g) => g.player.dashMul > 0.4, apply: (g) => { g.player.dashMul *= 0.7; } },
    { id: 'bandolier', shop: true, unlock: 50, name: 'Bandolera', desc: '+15% de balas por cargador y recarga un 12% más rápida', shape: 'mag', color: [0.8, 0.6, 0.3],
      apply: (g) => { g.weapon.mods.mag *= 1.15; g.weapon.mods.reload *= 0.88; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'brake', shop: true, unlock: 55, name: 'Freno de boca', desc: '-25% de retroceso y -15% de dispersión', shape: 'pierce', color: [0.55, 0.6, 0.7],
      available: (g) => (g.weapon.mods.recoil || 1) > 0.3, apply: (g) => { g.weapon.mods.recoil = (g.weapon.mods.recoil || 1) * 0.75; g.weapon.mods.spread *= 0.85; } },
    { id: 'medkit', shop: true, unlock: 70, name: 'Botiquín de campaña', desc: 'Al despejar una sala recuperas 8 de vida', shape: 'plus', color: [1, 0.4, 0.45],
      apply: (g) => { g.player.regenRoom = (g.player.regenRoom || 0) + 8; } },
  ];

  const Upgrades = {
    list: U,
    byId: Object.fromEntries(U.map((u) => [u.id, u])),
    // n mejoras distintas al azar
    // kind: 'normal' (por defecto), 'rare', 'curse'
    // kind 'shop': normales + mercancía desbloqueada en el Santuario
    random(n, game, exclude = [], kind = 'normal') {
      const unlocked = (u) => VX.Profile.data.shopUnlocks.includes(u.id);
      const ok = (u) => kind === 'rare' ? u.rare : kind === 'curse' ? u.curse : kind === 'shop' ? (!u.rare && !u.curse && (!u.shop || unlocked(u))) : (!u.rare && !u.curse && !u.shop);
      const pool = VX.M.shuffle(U.filter((u) => ok(u) && !exclude.includes(u.id) && (!u.available || !game || u.available(game))));
      if (!pool.length && kind !== 'normal') return this.random(n, game, exclude, 'normal');
      return pool.slice(0, n);
    },
    // ---- Sinergias: dos mejoras concretas juntas desbloquean un efecto nuevo ----
    SYNERGIES: [
      { id: 'napalm', name: 'Napalm', needs: ['fire', 'blast'], desc: 'Tus balas incendiarias prenden fuego al suelo donde impactan', apply: (g) => { g.weapon.mods.napalm = true; } },
      { id: 'metralla', name: 'Metralla', needs: ['multi', 'pierce'], desc: 'Los perdigones atraviesan un enemigo más', apply: (g) => { g.weapon.mods.pierce += 1; } },
      { id: 'brasas', name: 'Sangre ardiente', needs: ['lifesteal', 'fire'], desc: 'Cada zombi que muere en llamas te cura 5', apply: (g) => { g.weapon.mods.burnHeal = true; } },
      { id: 'cadena', name: 'Reacción en cadena', needs: ['corpseBlast', 'blast'], desc: 'Los cadáveres explotan mucho más fuerte', apply: (g) => { g.weapon.mods.bigCorpse = true; } },
      { id: 'pistolero', name: 'Pistolero', needs: ['rate', 'reload'], desc: '+15% de cadencia y recarga un 15% más rápida', apply: (g) => { g.weapon.mods.rate *= 1.15; g.weapon.mods.reload *= 0.85; } },
      { id: 'billar', name: 'Bola de billar', needs: ['ricochet', 'pierce'], desc: 'Las balas rebotan una vez más', apply: (g) => { g.weapon.mods.ricochet = (g.weapon.mods.ricochet || 0) + 1; } },
      { id: 'tirador', name: 'Tirador', needs: ['grip', 'range'], desc: '-25% de dispersión y +10% de daño', apply: (g) => { g.weapon.mods.spread *= 0.75; g.weapon.mods.damage *= 1.1; } },
      { id: 'fiebre', name: 'Fiebre del oro', needs: ['magnet', 'greed'], desc: 'Cada moneda que recoges te cura 1', apply: (g) => { g.weapon.mods.goldHeal = true; } },
      { id: 'tanque', name: 'Tanque', needs: ['vital', 'speed'], desc: '+20 de vida máxima y te curas del todo', apply: (g) => { g.player.maxHp += 20; g.player.hp = g.player.maxHp; } },
      { id: 'cohete', name: 'Pies de cohete', needs: ['dash2', 'dashcd'], desc: 'Esquivar empuja a los enemigos cercanos', apply: (g) => { g.weapon.mods.dashPush = true; } },
    ],
    checkSynergies(game) {
      const have = new Set(game.upgradesTaken.map((u) => u.id));
      game.synergies = game.synergies || [];
      for (const s of this.SYNERGIES) {
        if (game.synergies.includes(s.id) || !s.needs.every((n) => have.has(n))) continue;
        game.synergies.push(s.id);
        s.apply(game);
        setTimeout(() => { game.hud.banner('¡SINERGIA! ' + s.name.toUpperCase(), s.desc, 3.5); VX.Audio.upgrade(); }, 1300);
      }
    },
    price(game, base = 30) {
      return Math.round(base + game.stats.purchases * 8 + game.floor * 1.5);
    },
  };

  VX.Upgrades = Upgrades;
})();
