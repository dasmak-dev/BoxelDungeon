// Perfil del jugador (persistente entre partidas): estadísticas, esencia, bendiciones,
// arsenal desbloqueado y skins (cada arma desbloquea sus propias skins con sus retos).
(function () {
  const KEY = 'boxel_profile_v1';
  const WEAPON_IDS = () => ['knife', ...VX.Weapons.GUNS];
  const WS0 = () => ({ kills: 0, heads: 0, bosses: 0, elites: 0, floor: 0 });
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
  };

  const Profile = {
    data: DEF(),
    dirty: false,
    PERKS, ARSENAL,

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
      return (this.data.wstats[weapon] || {})[skin.cond.stat] || 0;
    },

    progress(skin, weapon) {
      if (!skin.cond) return 1;
      return Math.min(1, this.statValue(skin, weapon) / skin.cond.n);
    },

    isUnlocked(weapon, skinId) {
      return skinId === 'default' || this.data.unlocked.includes(weapon + ':' + skinId);
    },

    checkUnlocks(game, onlyWeapon) {
      if (VX.Weapons && VX.Weapons.KNIVES) this.checkKnives(game);
      if (VX.Weapons && VX.Weapons.PISTOLS) this.checkPistols(game);
      const list = onlyWeapon ? [onlyWeapon] : WEAPON_IDS();
      for (const w of list) {
        for (const s of VX.Weapons.SKINS) {
          if (!s.cond || this.isUnlocked(w, s.id)) continue;
          if (this.statValue(s, w) >= s.cond.n) {
            this.data.unlocked.push(w + ':' + s.id);
            this.dirty = true;
            if (game && game.hud && game.state === 'playing') {
              game.hud.banner('¡SKIN DESBLOQUEADA!', `${VX.Weapons.DEFS[w].name}: «${s.name}» — equípala en la Armería`, 3.5);
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
    codexKill(kind) { const e = this.data.codex.enemies; e[kind] = (e[kind] || 0) + 1; this.dirty = true; },
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
