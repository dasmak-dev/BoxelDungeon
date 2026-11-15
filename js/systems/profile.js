// Perfil del jugador (persistente entre partidas): estadísticas, esencia, bendiciones,
// arsenal desbloqueado y skins (cada arma desbloquea sus propias skins con sus retos).
(function () {
  const KEY = 'boxel_profile_v1';
  const WEAPON_IDS = () => ['knife', ...VX.Weapons.GUNS];
  const WS0 = () => ({ kills: 0, heads: 0, bosses: 0, elites: 0, floor: 0, scoped: 0, long: 0, longHead: 0, close: 0, air: 0, multi: 0, limbs: 0, burn: 0, magKills: 0 });
  const DEF = () => ({
    v: 2, kills: 0, headshots: 0, bosses: 0, bestFloor: 0, knifeKills: 0, runs: 0,
    unlocked: [], skinSel: {}, wstats: {},
    essence: 0, perks: {}, weapons: ['pistol'], startWeapon: 'pistol', shopUnlocks: [],
    codex: { enemies: {}, ups: [] }, best: null, secrets: 0,
  });

  // Bendiciones: mejoras permanentes que se compran con esencia en el Santuario
  const PERKS = [
    { id: 'vigor', name: 'Vigor', desc: '+10 de vida máxima', max: 5, cost: (l) => 30 + l * 25 },
    { id: 'fuerza', name: 'Fuerza', desc: '+6% de daño', max: 5, cost: (l) => 40 + l * 30 },
    { id: 'fortuna', name: 'Fortuna', desc: 'Empiezas con +15 de oro', max: 5, cost: (l) => 25 + l * 20 },
    { id: 'reflejos', name: 'Reflejos', desc: 'La esquiva recarga un 14% antes', max: 3, cost: (l) => 45 + l * 40 },
    { id: 'regateo', name: 'Regateo', desc: 'Todo cuesta un 8% menos en la tienda', max: 3, cost: (l) => 55 + l * 40 },
    { id: 'iman', name: 'Imán', desc: 'El oro viene hacia ti desde más lejos', max: 3, cost: (l) => 30 + l * 25 },
    { id: 'legado', name: 'Legado', desc: 'Empiezas con una mejora al azar', max: 2, cost: (l) => 140 + l * 120 },
    { id: 'pulso', name: 'Pulso firme', desc: '-12% de retroceso en todas las armas', max: 4, cost: (l) => 35 + l * 30 },
    { id: 'punteria', name: 'Puntería', desc: '-10% de dispersión de las balas', max: 3, cost: (l) => 40 + l * 35 },
    { id: 'segunda', name: 'Segunda oportunidad', desc: 'Una vez por partida, revives con media vida', max: 1, cost: () => 250 },
    { id: 'doble', name: 'Doble salto', desc: 'Puedes volver a saltar una vez en el aire', max: 1, cost: () => 220 },
    { id: 'objetivos', name: 'Objetivos de partida', desc: 'Cada partida trae 3 objetivos que dan esencia (nivel 2: 4 objetivos y +25 % de esencia). También se desbloquea venciendo a tu primer jefe o en el Relicario', max: 2, cost: (l) => 120 + l * 180 },
  ];

  // La tienda del vendedor (0.45): mejoras permanentes que se compran con esencia
  const SHOPUPS = [
    { id: 'altars', name: 'Más altares', desc: '+1 altar de venta en cada tienda', max: 3, cost: (l) => 60 + l * 50 },
    { id: 'select', name: 'Género selecto', desc: 'Un altar puede traer una mejora rara ★ (20/35/50 %)', max: 3, cost: (l) => 70 + l * 55 },
    { id: 'sale', name: 'Rebajas', desc: 'Uno de los altares sale a mitad de precio (2 con el nivel máximo)', max: 2, cost: (l) => 50 + l * 60 },
    { id: 'bell', name: 'Campana del vendedor', desc: 'Altar con campana: pagas oro y el vendedor repone todo el género (1 vez; 2 al máximo)', max: 2, cost: (l) => 90 + l * 80 },
    { id: 'mystery', name: 'Caja misteriosa', desc: 'Altar con una caja sorpresa: una mejora al azar, que puede ser rara… o maldita', max: 1, cost: () => 120 },
    { id: 'souls', name: 'Altar de las almas', desc: 'Cambia oro por esencia en la tienda (se puede repetir, cada vez más caro)', max: 1, cost: () => 150 },
    { id: 'apothecary', name: 'Botica', desc: 'El botiquín de la tienda cura más (+60 / +80)', max: 2, cost: (l) => 40 + l * 40 },
    { id: 'patience', name: 'Paciencia', desc: 'El vendedor se enfada menos: los golpes suben menos los precios y aguanta una muerte más antes de hartarse', max: 2, cost: (l) => 45 + l * 45 },
  ];

  // Arsenal: un arma bloqueada no aparece en tiendas ni la sueltan los jefes
  const ARSENAL = [
    { id: 'pistol', cost: 0 },
    { id: 'smg', cost: 50 },
    { id: 'shotgun', cost: 90 },
    { id: 'rifle', cost: 130 },
    { id: 'launcher', cost: 190 },
    { id: 'hammer', cost: 80 },
    { id: 'dbarrel', cost: 110 },
    { id: 'crossbow', cost: 120 },
    { id: 'flamer', cost: 160 },
    { id: 'lmg', cost: 180 },
    { id: 'raygun', cost: 280 },
  ];

  // Retos de cada skin: se cuentan por arma (stat dentro de wstats[arma])
  const STAT_TXT = {
    kills: (n, w) => `Elimina ${n} zombis con ${w}`,
    heads: (n, w) => `Revienta ${n} cabezas con ${w}`,
    bosses: (n, w) => n === 1 ? `Remata a un jefe con ${w}` : `Remata a ${n} jefes con ${w}`,
    elites: (n, w) => `Mata ${n} zombis élite con ${w}`,
    floor: (n, w) => `Llega al piso ${n} llevando ${w}`,
    allSkins: (n, w) => `Consigue los ${n} camuflajes de ${w}`,
    scoped: (n, w) => `Mata ${n} zombis apuntando con la mirilla de ${w}`,
    long: (n, w) => `Mata ${n} zombis a más de 20 m con ${w}`,
    longHead: (n, w) => `Revienta ${n} cabezas a más de 18 m con ${w}`,
    close: (n, w) => `Mata ${n} zombis a quemarropa (a menos de 2,5 m) con ${w}`,
    air: (n, w) => `Mata ${n} zombis en el aire (saltando) con ${w}`,
    multi: (n, w) => `Mata a 2 o más de un solo disparo, ${n} veces, con ${w}`,
    limbs: (n, w) => `Arranca ${n} brazos, piernas o cabezas con ${w}`,
    burn: (n, w) => `Mata ${n} zombis que estén ardiendo con ${w}`,
    magKills: (n, w) => `Mata ${n} zombis con un solo cargador de ${w}`,
  };

  const Profile = {
    data: DEF(),
    dirty: false,
    PERKS, ARSENAL, SHOPUPS,
    shopUp(id) { return ((this.data.shopUps || {})[id]) || 0; },
    buyShopUp(id) {
      const u = SHOPUPS.find((x) => x.id === id), l = this.shopUp(id);
      if (!u || l >= u.max || this.data.essence < u.cost(l)) return false;
      this.data.essence -= u.cost(l);
      this.data.shopUps = this.data.shopUps || {}; this.data.shopUps[id] = l + 1;
      this.save();
      return true;
    },

    load() {
      let d = {};
      try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
      this.data = { ...DEF(), ...d };
      this.migrate(d);
      if (VX.Weapons && VX.Weapons.applyPistolForm) VX.Weapons.applyPistolForm(this.pistolForm());
      return this.data;
    },

    // Perfiles antiguos: las skins eran globales -> se conceden a todas las armas
    migrate(d) {
      const D = this.data;
      if ((d.v || 1) < 2) {
        const old = (d.unlocked || []).filter((s) => s && !s.includes(':') && s !== 'default');
        D.unlocked = [];
        for (const w of WEAPON_IDS()) for (const s of old) D.unlocked.push(w + ':' + s);
        D.v = 2;
      }
      for (const w of WEAPON_IDS()) D.wstats[w] = { ...WS0(), ...(D.wstats[w] || {}) };
      if (!D.weapons.includes('pistol')) D.weapons.unshift('pistol');
      if (!Array.isArray(D.shopUnlocks)) D.shopUnlocks = [];
      if (!D.codex || !D.codex.enemies) D.codex = { enemies: {}, ups: [] };
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
      this.dirty = false;
    },

    add(stat, n = 1, game) {
      this.data[stat] = (this.data[stat] || 0) + n;
      this.dirty = true;
      if (stat !== 'essence') this.checkUnlocks(game);
    },

    max(stat, v, game) {
      if (v > (this.data[stat] || 0)) { this.data[stat] = v; this.dirty = true; this.checkUnlocks(game); }
    },

    // Estadística de un arma concreta
    addW(weapon, stat, n = 1, game) {
      if (!weapon || !this.data.wstats[weapon]) return;
      this.data.wstats[weapon][stat] += n;
      this.dirty = true;
      this.checkUnlocks(game, weapon);
    },

    maxW(weapon, stat, v, game) {
      const w = this.data.wstats[weapon];
      if (w && v > w[stat]) { w[stat] = v; this.dirty = true; this.checkUnlocks(game, weapon); }
    },

    condText(skin, weapon) {
      if (!skin.cond) return skin.desc;
      const name = weapon === 'knife' ? 'el cuchillo' : (VX.Weapons.DEFS[weapon].art || 'esta arma');
      return STAT_TXT[skin.cond.stat](skin.cond.n, name);
    },

    statValue(skin, weapon) {
      if (!skin.cond) return 0;
      if (skin.cond.stat === 'allSkins') return VX.Weapons.SKINS.filter((s) => s.cond && !s.ultimate && this.isUnlocked(weapon, s.id)).length;
      return (this.data.wstats[weapon] || {})[skin.cond.stat] || 0;
    },

    progress(skin, weapon) {
      if (!skin.cond) return 1;
      return Math.min(1, this.statValue(skin, weapon) / skin.cond.n);
    },

    isUnlocked(weapon, skinId) {
      return skinId === 'default' || this.data.unlocked.includes(weapon + ':' + skinId);
    },

    // ---- equipo: accesorios de arma y objetos arrojables (se desbloquean con misiones) ----
    // lista de todo lo que tiene misión: { id: 'att:reflex' | 'thr:molotov', name, kind, cond }
    gearList() {
      const out = [];
      if (VX.Throw) for (const t of VX.Throw.ORDER) out.push({ id: 'thr:' + t, key: t, kind: 'throw', name: VX.Throw.TYPES[t].name, desc: VX.Throw.TYPES[t].desc, cond: VX.Throw.TYPES[t].unlock || null });
      if (VX.Weapons && VX.Weapons.ATTACH) for (const a in VX.Weapons.ATTACH) out.push({ id: 'att:' + a, key: a, kind: 'attach', name: VX.Weapons.ATTACH[a].name, desc: VX.Weapons.ATTACH[a].desc, cond: VX.Weapons.ATTACH[a].unlock || null });
      return out;
    },
    gearValue(cond) { return cond.w ? ((this.data.wstats[cond.w] || {})[cond.stat] || 0) : (this.data[cond.stat] || 0); },
    gearUnlocked(id) { const g = this.gearList().find((x) => x.id === id); return !g || !g.cond || (this.data.gear || []).includes(id); },
    attachUnlocked(a) { return this.gearUnlocked('att:' + a); },
    throwUnlocked(t) { return this.gearUnlocked('thr:' + t); },
    // las misiones (equipo y skins) que tienes más cerca de cumplir, para la pantalla de muerte
    nearestGoals(k = 3) {
      const out = [];
      for (const g of this.gearList()) {
        if (!g.cond || this.gearUnlocked(g.id)) continue;
        const v = this.gearValue(g.cond);
        out.push({ name: g.name, what: g.kind === 'attach' ? 'accesorio' : 'objeto', txt: g.cond.txt, v, n: g.cond.n, r: v / g.cond.n });
      }
      if (VX.Weapons && VX.Weapons.SKINS) for (const w in this.data.wstats) {
        if (!VX.Weapons.DEFS[w]) continue;
        for (const sk of VX.Weapons.skinsFor(w)) {
          if (!sk.cond || sk.ultimate || this.isUnlocked(w, sk.id)) continue;
          const v = this.statValue(sk, w);
          if (v <= 0) continue;
          out.push({ name: sk.name + ' (' + VX.Weapons.DEFS[w].name + ')', what: 'skin', txt: this.condText(sk, w), v, n: sk.cond.n, r: v / sk.cond.n });
        }
      }
      if (VX.Upgrades) for (const u of VX.Upgrades.list) {
        const c = u.unlock;
        if (!c || typeof c !== 'object' || this.upUnlocked(u)) continue;
        const v = this.upValue(c);
        out.push({ name: u.name, what: 'mejora', txt: c.txt, v, n: c.n, r: v / c.n });
      }
      return out.filter((o) => o.r < 1 && o.v > 0).sort((a, b) => b.r - a.r).slice(0, k);   // sólo las que ya has empezado
    },
    checkGear(game) {
      this.data.gear = this.data.gear || [];
      for (const g of this.gearList()) {
        if (!g.cond || this.data.gear.includes(g.id)) continue;
        if (this.gearValue(g.cond) >= g.cond.n) {
          this.data.gear.push(g.id); this.dirty = true;
          if (game && game.hud && game.state === 'playing') {
            game.hud.banner(g.kind === 'attach' ? '¡NUEVO ACCESORIO!' : '¡NUEVO OBJETO PARA LANZAR!', `«${g.name}» — ya puede aparecer en tiendas, cofres y cajas`, 3.5);
            VX.Audio.upgrade();
          }
        }
      }
    },

    checkUnlocks(game, onlyWeapon) {
      this.checkGear(game);
      this.checkUps(game);
      if (VX.Weapons && VX.Weapons.KNIVES) this.checkKnives(game);
      if (VX.Weapons && VX.Weapons.PISTOLS) this.checkPistols(game);
      const list = onlyWeapon ? [onlyWeapon] : WEAPON_IDS();
      for (const w of list) {
        for (const s of VX.Weapons.skinsFor(w)) {
          if (!s.cond || this.isUnlocked(w, s.id)) continue;
          if (this.statValue(s, w) >= s.cond.n) {
            this.data.unlocked.push(w + ':' + s.id);
            this.dirty = true;
            if (game && game.hud && game.state === 'playing') {
              game.hud.banner(s.ultimate ? '¡SKIN LEGENDARIA!' : '¡SKIN DESBLOQUEADA!', `${VX.Weapons.DEFS[w].name}: «${VX.Weapons.skinLabel(s, w)}» — equípala en la Armería`, 3.5);
              VX.Audio.upgrade();
            }
          }
        }
      }
    },

    // ---- modelos de pistola ----
    pistolUnlocked(id) { return id === 'pistola' || (this.data.pistols || []).includes(id); },
    pistolForm() { const f = this.data.pistolForm || 'pistola'; return this.pistolUnlocked(f) ? f : 'pistola'; },
    setPistolForm(id) { if (this.pistolUnlocked(id)) { this.data.pistolForm = id; this.save(); VX.Weapons.applyPistolForm(id); } },
    checkPistols(game) {
      this.data.pistols = this.data.pistols || [];
      for (const k of VX.Weapons.PISTOLS) {
        if (!k.cond || this.pistolUnlocked(k.id)) continue;
        if ((this.data[k.cond.stat] || 0) >= k.cond.n) {
          this.data.pistols.push(k.id); this.dirty = true;
          if (game && game.hud && game.state === 'playing') { game.hud.banner('¡NUEVA PISTOLA!', `«${k.name}» — elígela en la Armería`, 3.5); VX.Audio.upgrade(); }
        }
      }
    },

    // ---- formas del cuchillo ----
    knifeUnlocked(id) { return id === 'cuchillo' || (this.data.knives || []).includes(id); },
    knifeForm() { const f = this.data.knifeForm || 'cuchillo'; return this.knifeUnlocked(f) ? f : 'cuchillo'; },
    setKnifeForm(id) { if (this.knifeUnlocked(id)) { this.data.knifeForm = id; this.save(); } },
    checkKnives(game) {
      this.data.knives = this.data.knives || [];
      for (const k of VX.Weapons.KNIVES) {
        if (!k.cond || this.knifeUnlocked(k.id)) continue;
        if ((this.data[k.cond.stat] || 0) >= k.cond.n) {
          this.data.knives.push(k.id); this.dirty = true;
          if (game && game.hud && game.state === 'playing') { game.hud.banner('¡NUEVO CUCHILLO!', `«${k.name}» — elígelo en la Armería`, 3.5); VX.Audio.upgrade(); }
        }
      }
    },

    skinFor(weaponId) {
      const s = this.data.skinSel[weaponId] || 'default';
      return this.isUnlocked(weaponId, s) ? s : 'default';
    },

    setSkin(weaponId, skinId) {
      if (!this.isUnlocked(weaponId, skinId)) return;
      this.data.skinSel[weaponId] = skinId;
      this.save();
    },

    // ---- Santuario ----
    perkLevels() {
      const o = {};
      for (const p of PERKS) o[p.id] = this.data.perks[p.id] || 0;
      return o;
    },

    dashCooldown() { return 0.85 * (1 - 0.14 * (this.data.perks.reflejos || 0)); },
    priceMul() { return 1 - 0.08 * (this.data.perks.regateo || 0); },

    buyPerk(id) {
      const p = PERKS.find((x) => x.id === id);
      const l = this.data.perks[id] || 0;
      if (!p || l >= p.max || this.data.essence < p.cost(l)) return false;
      this.data.essence -= p.cost(l);
      this.data.perks[id] = l + 1;
      this.save();
      return true;
    },

    // ---- Códice y récords ----
    codexKill(kind) { const e = this.data.codex.enemies; e[kind] = (e[kind] || 0) + 1; this.dirty = true; this.checkUps(VX.game); },

    // ---- mejoras que se desbloquean luchando (matando a ciertos enemigos o jefes) ----
    upValue(c) { return c.kind ? ((this.data.codex.enemies || {})[c.kind] || 0) : (this.data[c.stat] || 0); },
    upUnlocked(u) {
      const c = u.unlock;
      if (!c || typeof c !== 'object') return true;
      return (this.data.upUnlocks || []).includes(u.id) || this.upValue(c) >= c.n;
    },
    // objetivos de partida: nivel 0 = bloqueados; 1 = desbloqueados (Santuario, primer jefe o Relicario); 2 = mejorados
    objLevel() { return Math.max(this.data.perks.objetivos || 0, this.data.objUnlocked ? 1 : 0); },
    unlockObjectives(game, how) {
      if (this.objLevel() > 0) return false;
      this.data.objUnlocked = true; this.dirty = true; this.save();
      if (game && game.hud) { game.hud.banner('¡OBJETIVOS DE PARTIDA!', `${how}: desde la próxima partida, cada una trae 3 objetivos que dan esencia`, 4); VX.Audio.upgrade && VX.Audio.upgrade(); }
      return true;
    },
    checkUps(game) {
      // el reto que desbloquea los objetivos de partida: vencer a tu primer jefe
      if (!this.data.objUnlocked && !(this.data.perks.objetivos > 0) && (this.data.bosses || 0) >= 1) this.unlockObjectives(game, 'Has vencido a tu primer jefe');
      if (!VX.Upgrades) return;
      this.data.upUnlocks = this.data.upUnlocks || [];
      for (const u of VX.Upgrades.list) {
        const c = u.unlock;
        if (!c || typeof c !== 'object' || this.data.upUnlocks.includes(u.id)) continue;
        if (this.upValue(c) < c.n) continue;
        this.data.upUnlocks.push(u.id); this.dirty = true;
        if (game && game.hud && game.state === 'playing') {
          const tag = u.rare ? ' ★ RARA' : u.curse ? ' ☠ MALDITA' : '';
          setTimeout(() => { game.hud.banner('¡NUEVA MEJORA DESBLOQUEADA!', `«${u.name}»${tag} — ${u.desc}`, 4); VX.Audio.upgrade(); }, 900);
        }
      }
    },
    codexUp(id) { if (!this.data.codex.ups.includes(id)) { this.data.codex.ups.push(id); this.dirty = true; } },

    // Puntuación de la partida; devuelve { score, record }
    submitRun(game) {
      const st = game.stats;
      const score = Math.round(game.floor * 100 + st.kills * 5 + st.bosses * 500 + st.totalGold + (game.stats.secrets || 0) * 150);
      const prev = this.data.best;
      const record = !prev || score > prev.score;
      if (record) this.data.best = { score, floor: game.floor, kills: st.kills, bosses: st.bosses, time: Math.round(game.runTime), date: new Date().toISOString().slice(0, 10) };
      this.save();
      return { score, record, prev };
    },

    // Mercancía nueva para las tiendas
    buyShopItem(id) {
      const u = VX.Upgrades.byId[id];
      if (!u || !u.shop || this.data.shopUnlocks.includes(id) || this.data.essence < u.unlock) return false;
      this.data.essence -= u.unlock;
      this.data.shopUnlocks.push(id);
      this.save();
      return true;
    },

    weaponUnlocked(id) { return id === 'knife' || this.data.weapons.includes(id); },

    // Desbloquea un arma (si hace falta) y la deja como arma inicial
    buyWeapon(id) {
      const w = ARSENAL.find((x) => x.id === id);
      if (!w) return false;
      if (!this.data.weapons.includes(id)) {
        if (this.data.essence < w.cost) return false;
        this.data.essence -= w.cost;
        this.data.weapons.push(id);
      }
      this.data.startWeapon = id;
      this.save();
      return true;
    },
  };

  VX.Profile = Profile;
})();
