// Gestor de armas del jugador: hasta 2 armas de fuego + el cuchillo.
// Disparo hitscan, granadas, ataques cuerpo a cuerpo, cambio de arma,
// modelos en primera persona con skins y trazadoras.
(function () {
  const M = VX.M;
  const tmp = [0, 0, 0];
  const ucol = [0, 0, 0, 0];

  // (0.57) niveles del arma: se mejoran en el vendedor (I → II → III)
  const LEVELS = [{ dmg: 1, mag: 1, reload: 1 }, { dmg: 1.2, mag: 1.25, reload: 0.88 }, { dmg: 1.45, mag: 1.5, reload: 0.76 }];
  const MOD0 = () => ({ damage: 1, rate: 1, range: 1, mag: 1, reload: 1, pierce: 0, destruction: 1, pellets: 0, spread: 1, auto: false, recoil: 1 });

  class Weapon {
    constructor() { this.reset(); }

    reset() {
      this.mods = MOD0();
      this.limited = false;
      this.slots = [this.mk('pistol'), this.mk('knife')];
      this.cur = 0; this.prev = 1;
      this.cooldown = 0;
      this.reloading = false; this.reloadT = 0;
      this.kick = 0; this.slide = 0; this.flash = 0;
      this.casings = []; this.ejectQ = []; this.fireT = 99; this.shots = 0; this.puffs = [];
      this.switchT = 0;
      this.swingT = 0; this.swingSide = 1; this.pendingHit = -1;
      this.tracers = [];
      this.grenades = [];
      this.explosions = [];
      this.queued = false;
      this.accent = null;
      this.att = {};                                       // accesorios montados por arma: { smg: ['reflex', 'extmag'] }
      this.throws = { frag: 0, molotov: 0, decoy: 0 };     // objetos arrojables de la partida (se empieza sin nada: se encuentran)
      this.throwSel = 'frag'; this.throwCd = 0;
    }

    // ---- accesorios ----
    attList(id = this.slot && this.slot.id) { return (this.att && this.att[id]) || []; }
    attMul(id = this.slot.id) {
      const m = { damage: 1, spread: 1, range: 1, mag: 1, reload: 1, recoil: 1, sound: 1 };
      for (const a of this.attList(id)) { const d = VX.Weapons.ATTACH[a]; if (d) for (const k in d.mul) m[k] *= d.mul[k]; }
      return m;
    }
    formOf(id) { return id === 'pistol' ? VX.Weapons.DEFS.pistol.form || 'pistola' : null; }
    // monta un accesorio: primero en el arma de la mano, si no cabe en la otra. Devuelve el arma o null
    giveAttach(a, game) {
      const def = VX.Weapons.ATTACH[a];
      const guns = [this.slot, ...this.slots.filter((s) => s !== this.slot)].filter((s) => !VX.Weapons.DEFS[s.id].melee && VX.Weapons.attFits(s.id, this.formOf(s.id), a));
      if (!def || !guns.length) return null;
      // mejor un arma que aún no lo tenga y con ese hueco libre
      const score = (s) => (this.attList(s.id).includes(a) ? 2 : 0) + (this.attList(s.id).some((x) => VX.Weapons.ATTACH[x].slot === def.slot) ? 1 : 0);
      const g = guns.slice().sort((p, q) => score(p) - score(q))[0];
      const list = this.attList(g.id).filter((x) => VX.Weapons.ATTACH[x].slot !== def.slot);
      const old = this.attList(g.id).find((x) => VX.Weapons.ATTACH[x].slot === def.slot);
      list.push(a); this.att[g.id] = list;
      if (game) game.hud.banner('ACCESORIO: ' + def.name.toUpperCase(), VX.Weapons.DEFS[g.id].name + ' · ' + def.desc + (old && old !== a ? ' (sustituye a ' + VX.Weapons.ATTACH[old].name.toLowerCase() + ')' : ''), 3);
      return g.id;
    }
    // un accesorio que le sirva a alguna de tus armas (mejor uno que todavía no tengas)
    randomAttach() {
      const ids = Object.keys(VX.Weapons.ATTACH).filter((a) => VX.Profile.attachUnlocked(a));   // sólo los desbloqueados con su misión
      const fits = ids.filter((a) => this.slots.some((s) => !VX.Weapons.DEFS[s.id].melee && VX.Weapons.attFits(s.id, this.formOf(s.id), a)));
      const fresh = fits.filter((a) => !this.slots.some((s) => this.attList(s.id).includes(a)));
      const pool = fresh.length ? fresh : fits;
      return pool.length ? pool[(Math.random() * pool.length) | 0] : null;
    }

    mk(id) { return { id, ammo: this.magFor(id), reserve: this.reserveStart(id) }; }
    // --- munición limitada (modo Horda): cada arma lleva su reserva ---
    reserveMax(id) {
      const d = VX.Weapons.DEFS[id];
      if (d.melee) return 0;
      const mags = { pistol: 8, smg: 6, shotgun: 6, rifle: 6, grenade: 4, crossbow: 20, dbarrel: 12, lmg: 4, flamer: 4, raygun: 5, dual: 5, nailgun: 5, harpoon: 18 }[id] || 6;
      return Math.round(d.mag * (this.mods ? this.mods.mag : 1)) * mags;
    }
    reserveStart(id) { return Math.round(this.reserveMax(id) * 0.5); }
    // reparte munición a todas las armas (frac = cargadores)
    addAmmo(frac) {
      let any = false;
      for (const s of this.slots) {
        const d = VX.Weapons.DEFS[s.id];
        if (d.melee) continue;
        const max = this.reserveMax(s.id), add = Math.max(1, Math.ceil(this.magFor(s.id) * frac));
        if ((s.reserve || 0) < max) { s.reserve = Math.min(max, (s.reserve || 0) + add); any = true; }
      }
      return any;
    }
    refillAll() { for (const s of this.slots) if (!VX.Weapons.DEFS[s.id].melee) { s.reserve = this.reserveMax(s.id); s.ammo = this.magFor(s.id); } }
    magFor(id) { const d = VX.Weapons.DEFS[id]; return d.melee ? 0 : Math.round(d.mag * (this.mods ? this.mods.mag : 1) * this.attMul(id).mag * LEVELS[this.lvlOf(id) - 1].mag); }
    lvlOf(id) { const s = this.slots && this.slots.find((x) => x.id === id); return Math.max(1, Math.min(3, (s && s.lvl) || 1)); }   // con el cargador ampliado si lo lleva

    get slot() { return this.slots[this.cur]; }
    get def() { return VX.Weapons.DEFS[this.slot.id]; }
    get id() { return this.slot.id; }

    stats(id = this.slot.id) {
      const d = VX.Weapons.DEFS[id], m = this.mods, a = this.attMul(id);
      if (d.melee) { const k = d.katana; return { melee: true, damage: d.damage * Math.sqrt(m.damage) * (m.meleeDmg || 1) * (k ? m.kPower || 1 : 1), fireRate: d.fireRate * (m.meleeRate || 1) * (k ? m.kSpeed || 1 : 1), reach: d.reach * (m.reach || 1) * (k ? m.kReach || 1 : 1), destruction: 1 }; }
      // (0.57) nivel del arma (I·II·III, se mejora en el vendedor) y golpe tras la patada (el siguiente disparo hace el doble)
      const lv = this.lvlOf(id), LV = LEVELS[lv - 1];
      const kb = this.kickBuff > 0 && this.slot && id === this.slot.id ? 2 : 1;
      return {
        lvl: lv,
        damage: d.damage * m.damage * a.damage * LV.dmg * kb, fireRate: d.fireRate * m.rate * (m.spinup ? 1 + Math.min(0.5, (this.heat || 0) * 0.035) : 1), range: d.range * m.range * a.range,
        mag: Math.round(d.mag * m.mag * a.mag * LV.mag), reload: d.reload * m.reload * a.reload * LV.reload, spread: d.spread * m.spread * a.spread,
        pellets: d.pellets + (d.pellets > 1 ? m.pellets * 2 : m.pellets), pierce: d.pierce + m.pierce,
        destruction: d.destruction * m.destruction, auto: d.auto || m.auto, ricochet: m.ricochet || 0,
      };
    }

    // compatibilidad con el resto del juego / HUD
    get damage() { return this.stats().damage; }
    get destruction() { return this.stats().destruction; }
    get fireRate() { return this.stats().fireRate; }
    get range() { return this.stats().range || 0; }
    get magSize() { return this.stats().mag || 0; }
    get ammo() { return this.slot.ammo; }
    set ammo(v) { this.slot.ammo = v; }
    get reloadTime() { return this.stats().reload || 1; }
    get auto() { return !!this.stats().auto; }
    get pierce() { return this.stats().pierce || 0; }
    get pellets() { return this.stats().pellets || 1; }
    get name() { return this.def.name; }

    has(id) { return this.slots.some((s) => s.id === id); }
    // forma de la hoja que llevas en la mano (la katana es un arma propia; el cuchillo cambia de forma)
    bladeForm(id = this.slot && this.slot.id) { return id === 'katana' ? 'katana' : VX.Profile.knifeForm ? VX.Profile.knifeForm() : 'cuchillo'; }

    // Recoge un arma: si ya la tienes, recarga; si no, ocupa un hueco o sustituye la actual
    giveWeapon(id) {
      const i = this.slots.findIndex((s) => s.id === id);
      if (i >= 0) { this.slots[i].ammo = this.magFor(id); this.slots[i].reserve = this.reserveMax(id); this.select(i); return 'refill'; }
      const guns = this.slots.filter((s) => !VX.Weapons.DEFS[s.id].melee);
      const w = this.mk(id);
      if (guns.length < 2) { this.slots.splice(guns.length, 0, w); this.cur = -1; this.select(guns.length); return 'added'; }
      const idx = this.def.melee ? 0 : this.cur;
      const old = this.slots[idx].id;
      this.slots[idx] = w;
      this.cur = -1; this.select(idx);
      return old;
    }

    // (0.57) lanzar el arma que llevas: vuela girando, golpea fuerte y aturde; luego queda en el suelo
    // para recogerla (con su munición y su nivel). Si te vas de la sala sin ella, la pierdes.
    throwGun(game) {
      const P = game.player, s = this.slot, d = this.def;
      if (game.state !== 'playing' || P.hp <= 0 || !s || d.melee || this.switchT > 0 || this.swingT > 0 || this.throwCd > 0) return;
      if (VX.Coop.active) { game.hud.toast('No disponible en cooperativo'); VX.Audio.deny(); return; }
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const fwd = [sy * cp, sp, cy * cp], v = 17;
      const heavy = { shotgun: 1.3, minigun: 1.6, launcher: 1.5, flamethrower: 1.4, rifle: 1.2, harpoon: 1.3 }[s.id] || 1;
      this.grenades.push({
        type: 'gun', id: s.id, slotData: { ...s }, x: P.x + fwd[0] * 0.5 - cy * 0.15, y: P.eyeY() - 0.15 + fwd[1] * 0.4, z: P.z + fwd[2] * 0.5 + sy * 0.15,
        vx: fwd[0] * v + P.vx * 0.6, vy: fwd[1] * v + 2.2, vz: fwd[2] * v + P.vz * 0.6, life: 8, rot: 0, dmg: 55 * heavy, heavy, hitSet: [],
      });
      const idx = this.cur;
      this.slots.splice(idx, 1);
      this.cur = -1; this.prev = 0; this.reloading = false;
      const next = this.slots.findIndex((x) => !VX.Weapons.DEFS[x.id].melee);
      this.select(next >= 0 ? next : this.slots.findIndex((x) => x.id === 'knife'));
      this.throwCd = 0.5;
      VX.Audio.swish();
      game.hud.toast('¡Arma lanzada!');
    }

    // (0.57) patada: empuja y aturde a lo que tengas delante. Encadenadas (3 seguidas) la última pega el doble.
    // Sinergia: tras una patada que acierte, el siguiente disparo hace el doble de daño.
    doKick(game) {
      const P = game.player;
      if (game.state !== 'playing' || P.hp <= 0 || this.kickCd > 0 || this.swingT > 0) return;
      this.kickCd = 0.55; this.kickT = 0.32;
      this.kickChain = this.kickChainT > 0 ? (this.kickChain || 0) + 1 : 1;
      this.kickChainT = 1.3;
      const big = this.kickChain >= 3;
      if (big) this.kickChain = 0;
      this.inspectT = 0;
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      const cand = [];
      for (const e of game.enemies) {
        if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue;
        const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
        if (d > 2.4 || Math.abs(e.y - P.y) > 2) continue;
        if (d > 0.5 && (dx * sy + dz * cy) / d < 0.5) continue;
        cand.push({ e, d });
      }
      cand.sort((a, b) => a.d - b.d);
      let any = false;
      game.dmgSource = 'knife'; game.dmgWeapon = 'kick';
      for (const { e, d } of cand.slice(0, 3)) {
        const tx = e.body.cx - ox, ty = e.body.cy - oy, tz = e.body.cz - oz, L = Math.hypot(tx, ty, tz) || 1;
        const h = e.body.rayHit(ox, oy, oz, tx / L, ty / L, tz / L, L + 1);
        const dmg = 16 * Math.sqrt(this.mods.damage || 1) * (this.mods.meleeDmg || 1) * (big ? 2 : 1);
        let killed = false;
        if (h) killed = e.hit(h, dmg, { ox, oy, oz, dx: tx / L, dy: ty / L, dz: tz / L }, game, {});
        any = true;
        if (!killed && !e.dead) {
          const nx = d > 0.01 ? (e.x - P.x) / d : sy, nz = d > 0.01 ? (e.z - P.z) / d : cy;
          const f = (e.isBoss ? 1.2 : (e.T && e.T.heavy) ? 5 : 10) * (big ? 1.6 : 1);
          e.kx = (e.kx || 0) + nx * f; e.kz = (e.kz || 0) + nz * f;
          if (!e.isBoss) e.stunT = Math.max(e.stunT || 0, big ? 2.2 : 1.3);
        }
      }
      game.dmgSource = null;
      if (any) {
        this.kickBuff = 2.5;
        game.hud.hitmarker(false);
        VX.Audio.wall(); game.shake(big ? 0.3 : 0.16); VX.Haptics.buzz(big ? 45 : 25);
        if (big) game.hud.toast('¡Patada encadenada!');
      } else VX.Audio.swish();
      P.knock(-sy * (any ? 1.2 : 0), -cy * (any ? 1.2 : 0));
    }

    // (0.59) katana: estela del corte y, con «Corte del viento», una onda que vuela y corta
    katanaFx(game, ox, oy, oz, ray, sl) {
      for (let i = 0; i < 10; i++) { const t = (i - 4.5) * 0.09; game.particles.spawn(ox + ray.dx * 1.4 + sl[0] * t, oy + ray.dy * 1.4 + sl[1] * t, oz + ray.dz * 1.4 + sl[2] * t, ray.dx, 0, ray.dz, 0.9, 0.95, 1, 0.02, 0.15, 1, 1); }
    }
    katanaWave(game) {
      const P = game.player, st = this.stats();
      const ox = P.eyeX(), oy = P.eyeY() - 0.15, oz = P.eyeZ();
      const cp = Math.cos(P.pitch), dx = Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = Math.cos(P.yaw) * cp;
      const wh = game.world.raycast(ox, oy, oz, dx, dy, dz, 9), maxT = wh ? wh.t : 9;
      const hits = [];
      for (const e of game.enemies) { if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue; const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, maxT); if (h) hits.push({ e, h }); }
      hits.sort((a, b) => a.h.t - b.h.t);
      game.dmgSource = 'knife'; game.dmgWeapon = 'katana';
      for (const x of hits.slice(0, 4)) x.e.hit(x.h, st.damage * 0.55, { ox, oy, oz, dx, dy, dz }, game, { slash: [-Math.cos(P.yaw), 0.15, Math.sin(P.yaw)], katana: true });
      game.dmgSource = null;
      this.tracers.push({ x0: ox + dx * 0.6, y0: oy, z0: oz + dz * 0.6, x1: ox + dx * maxT, y1: oy + dy * maxT, z1: oz + dz * maxT, life: 0.25, max: 0.25, w: 5, c: [0.85, 0.92, 1] });
    }

    select(i) {
      if (i < 0 || i >= this.slots.length || i === this.cur) return;
      if (this.cur >= 0) this.prev = this.cur;
      this.cur = i;
      this.switchT = 0.28;
      this.reloading = false;
      this.swingT = 0; this.pendingHit = -1;
      VX.Audio.click();
    }

    startReload() {
      const st = this.stats();
      if (st.melee || this.reloading || this.slot.ammo >= st.mag) return;
      if (this.limited && (this.slot.reserve || 0) <= 0) {
        if (!this.noAmmoT || performance.now() - this.noAmmoT > 1500) { this.noAmmoT = performance.now(); VX.game && VX.game.hud.toast('¡Sin munición!'); }
        return;
      }
      if (this.mods.belt && this.slot.ammo > 0) return;   // cinta de munición: no se recarga a mano
      this.reloading = true;
      this.reloadT = st.reload;
      if (this.mods.tacReload && this.slot.ammo <= 0) this.reloadT *= 0.6;     // recarga táctica
      if (this.mods.belt && this.slot.ammo <= 0) { this.reloadT = st.reload * 1.4; VX.game && VX.game.hud.toast('¡Recalentada!'); }
      this.reloadDur = this.reloadT;
      this.magKills = 0;   // misión «con un solo cargador»
      this.rlCue = -1;   // los sonidos de la recarga los pone la animación, pieza a pieza (js/core/sfx.js)
    }

    // Retroceso real: cada disparo sube la mira (y la desvía un poco a un lado).
    // Al mantener el gatillo se acumula «calor» y el arma sube cada vez más;
    // al soltar, la mira vuelve sola en parte. Las mejoras de retroceso lo reducen.
    applyRecoil(P, d) {
      const R = d.recoilPat || { up: d.recoil * 0.35, side: d.recoil * 0.12 };
      const m = (this.mods.recoil || 1) * this.attMul().recoil;
      this.heat = Math.min(30, (this.heat || 0) + 1);
      const climb = R.up * (1 + Math.min(1.2, this.heat * 0.06)) * m;
      // deriva lateral: tira hacia un lado y cambia de sentido a ráfagas
      this.driftDir = this.heat <= 1 ? (Math.random() < 0.5 ? -1 : 1) : (this.driftDir || 1);
      if (this.heat > 6 && Math.random() < 0.12) this.driftDir *= -1;
      const side = (R.side * (0.4 + Math.random() * 0.8) * this.driftDir + (Math.random() - 0.5) * R.side * 0.6) * m;
      P.pitch = Math.min(1.5, P.pitch + climb);
      P.yaw -= side;
      this.recoilDebt = (this.recoilDebt || 0) + climb;
      this.sinceShot = 0;
    }

    updateRecoil(dt, P) {
      this.sinceShot = (this.sinceShot || 0) + dt;
      if (this.sinceShot > 0.12) {
        this.heat = Math.max(0, (this.heat || 0) - dt * 22);
        // la mira vuelve sola a medias (el resto lo tienes que corregir tú con el ratón)
        if (this.recoilDebt > 0) {
          const back = Math.min(this.recoilDebt, this.recoilDebt * dt * 7 + dt * 0.02);
          P.pitch -= back * 0.65;
          this.recoilDebt -= back;
        }
      }
    }

    update(dt, game) {
      const I = VX.Input;
      this.cooldown -= dt;
      this.updateRecoil(dt, game.player);
      this.kick = M.lerp(this.kick, 0, Math.min(1, dt * 14));
      if (this.kickL || this.kickR) { this.kickL = M.lerp(this.kickL || 0, 0, Math.min(1, dt * 16)); this.kickR = M.lerp(this.kickR || 0, 0, Math.min(1, dt * 16)); }
      this.slide = Math.max(0, this.slide - dt * 9);
      VX.GunAnim.update(this, dt, this.slot.id);
      if (this.puffs.length) { for (const p of this.puffs) p.t += dt; this.puffs = VX.M.compact(this.puffs, (p) => p.t < 0.7); }
      this.flash = Math.max(0, this.flash - dt * 16);
      this.switchT = Math.max(0, this.switchT - dt);
      this.swingT = Math.max(0, this.swingT - dt);
      this.inspectT = Math.max(0, (this.inspectT || 0) - dt);
      // mirilla del rifle: mantener el clic derecho
      this.scoped = this.slot.id === 'rifle' && I.rightDown && !this.reloading && this.switchT <= 0 && game.state === 'playing';
      this.scopeK = M.lerp(this.scopeK || 0, this.scoped ? 1 : 0, Math.min(1, dt * (this.scoped ? 9 : 14)));
      if (this.scopeK < 0.002) this.scopeK = 0;
      // cooperativo: en el suelo o muerto no se dispara
      if (VX.Coop.down || VX.Coop.deadWait) { this.updateGrenades(dt, game); this.tracers = VX.M.compact(this.tracers, (t) => (t.life -= dt) > 0); return; }
      if (this.scoped) this.inspectT = 0;
      // [F] inspeccionar el arma (se cancela al disparar, recargar o cambiar)
      const KS = VX.Settings, kInspect = KS.key('inspect'), kKnife = KS.key('knife');
      if (I.wasPressed(kInspect) && this.switchT <= 0 && !this.reloading && this.swingT <= 0) {
        this.inspectT = this.inspectT > 0 ? 0 : 2.6;
        if (this.inspectT) VX.Audio.reload();
      }
      if (I.mouseClicked || I.wasPressed(KS.key('reload')) || I.wheel || I.wasPressed(KS.key('prev')) || I.wasPressed(kKnife) ||
          I.wasPressed('Digit1') || I.wasPressed('Digit2') || I.wasPressed('Digit3')) this.inspectT = 0;
      for (const t of this.tracers) t.life -= dt;
      this.tracers = VX.M.compact(this.tracers, (t) => t.life > 0);
      for (const e of this.explosions) e.t -= dt;
      this.explosions = VX.M.compact(this.explosions, (e) => e.t > 0);
      this.updateGrenades(dt, game);

      // cambio de arma
      if (I.wasPressed('Digit1')) this.select(0);
      if (I.wasPressed('Digit2')) this.select(1);
      if (I.wasPressed('Digit3')) this.select(2);
      if (I.wasPressed(KS.key('prev'))) this.select(this.prev);
      if (I.wheel) this.select((this.cur + (I.wheel > 0 ? 1 : this.slots.length - 1)) % this.slots.length);
      // objetos arrojables: lanzar y cambiar el elegido
      this.throwCd = Math.max(0, this.throwCd - dt);
      if (I.wasPressed(KS.key('throwNext'))) VX.Throw.cycle(game);
      if (I.wasPressed(KS.key('throw'))) VX.Throw.toss(game);
      if (I.wasPressed(KS.key('throwGun'))) this.throwGun(game);
      this.kickCd = Math.max(0, (this.kickCd || 0) - dt); this.kickT = Math.max(0, (this.kickT || 0) - dt);
      this.kickBuff = Math.max(0, (this.kickBuff || 0) - dt); this.kickChainT = Math.max(0, (this.kickChainT || 0) - dt);
      if (I.wasPressed(KS.key('kick'))) this.doKick(game);
      if (I.wasPressed(kKnife)) {
        const k = this.slots.findIndex((s) => s.id === 'knife');
        if (this.cur !== k) { this.select(k); this.switchT = 0.08; }
        this.queued = true;
      }

      const st = this.stats();
      this.counterT = Math.max(0, (this.counterT || 0) - dt);
      // cinta de munición: el arma recupera balas sola si no disparas
      if (this.mods.belt && !st.melee && !this.def.grenade && !this.reloading) {
        this.beltIdle = (this.beltIdle || 0) + dt;
        if (this.beltIdle > 0.45 && this.slot.ammo < st.mag && (!this.limited || (this.slot.reserve || 0) > 0)) {
          this.beltAcc = (this.beltAcc || 0) + st.mag * 0.55 * dt;
          while (this.beltAcc >= 1 && this.slot.ammo < st.mag) { this.beltAcc -= 1; this.slot.ammo++; if (this.limited) this.slot.reserve--; }
        }
      }
      // bocanada: al soltar el gatillo del lanzallamas sale una bola de fuego
      if (this.def.flame && this.mods.fireball) {
        if (I.mouseDown && this.slot.ammo > 0 && !this.reloading) this.flameHold = (this.flameHold || 0) + dt;
        else if (this.flameHold > 0.25 && this.slot.ammo > 0 && game.player.hp > 0) { this.launchFireball(game, st); this.flameHold = 0; }
        else this.flameHold = 0;
      }
      if (this.reloading) {
        this.reloadT -= dt;
        if (this.reloadT <= 0) {
          this.reloading = false;
          if (this.limited) {
            const take = Math.min(st.mag - this.slot.ammo, this.slot.reserve || 0);
            this.slot.ammo += take; this.slot.reserve = (this.slot.reserve || 0) - take;
          } else this.slot.ammo = st.mag;
        }
      }
      if (I.wasPressed(KS.key('reload'))) this.startReload();

      if (this.pendingHit >= 0) {
        this.pendingHit -= dt;
        if (this.pendingHit < 0) this.meleeHit(game);
      }

      if (I.mouseClicked) this.queued = true;
      // (0.57) pistolas dobles: clic derecho dispara la de la izquierda
      const dual = !!this.def.dual;
      if (dual && I.rightClicked) this.queuedL = true;
      if (!dual) this.queuedL = false;
      if (this.switchT > 0 || game.player.hp <= 0) return;
      const want = st.melee ? (this.queued || I.mouseDown) : (st.auto ? I.mouseDown : this.queued || (dual && this.queuedL));
      if (want && this.cooldown <= 0 && !this.reloading) {
        if (dual) {
          // con los dos clics a la vez se alternan; si no, dispara la que toque
          this.dualSide = this.queued && this.queuedL ? 1 - (this.dualSide || 0) : this.queuedL ? 1 : 0;
          if (this.dualSide) this.queuedL = false; else this.queued = false;
        }
        if (!dual) this.queued = false;
        if (st.melee) this.swing(game);
        else if (this.slot.ammo <= 0) { VX.Audio.empty(); this.startReload(); this.cooldown = 0.25; }
        else this.fire(game, st);
      }
      if (!I.mouseDown && this.cooldown < -0.15) this.queued = false;
      if (!I.rightDown && this.cooldown < -0.15) this.queuedL = false;
    }

    // ---------------- Cuerpo a cuerpo ----------------
    // Cuchillo: tajos alternos a cada lado y, cada pocos golpes, una estocada o un golpe de arriba abajo
    swing() {
      const st = this.stats();
      if (this.def.heavy) {
        // martillo: mazazo de arriba abajo y barrido lateral, alternos
        this.swingN = (this.swingN || 0) + 1;
        this.swingType = this.swingN % 2 ? 'smash' : 'sweep';
        const dur = this.swingType === 'smash' ? 0.66 : 0.56;
        this.cooldown = 1 / st.fireRate;
        this.swingT = dur; this.swingDur = dur;
        this.swingSide = -this.swingSide;
        this.pendingHit = this.swingType === 'smash' ? 0.36 : 0.27;
        setTimeout(() => VX.Audio.swish(), this.swingType === 'smash' ? 260 : 170);
        return;
      }
      // karambit: dos zarpazos rápidos en gancho y un giro completo sobre la anilla
      if (this.bladeForm() === 'karambit') {
        this.swingN = ((this.swingN || 0) + 1) % 3;
        this.swingType = this.swingN === 0 ? 'kspin' : 'khook';
        this.swingSide = this.swingN === 1 ? 1 : -1;
        const dur = this.swingType === 'kspin' ? 0.5 : 0.3;
        this.cooldown = 1 / st.fireRate * (this.swingType === 'kspin' ? 1.3 : 0.9);
        this.swingT = dur; this.swingDur = dur;
        this.pendingHit = this.swingType === 'kspin' ? 0.22 : 0.1;
        VX.Audio.swish();
        if (this.swingType === 'kspin') setTimeout(() => VX.Audio.swish(), 180);
        return;
      }
      // cada forma del cuchillo tiene su propio juego de golpes
      const form = this.bladeForm();
      const SETS = {
        // daga: dos estocadas rápidas y un revés con la hoja invertida
        daga: [['dstab', 0.22, 0.75, 0.08], ['dstab', 0.22, 0.75, 0.08], ['drev', 0.36, 1.1, 0.12]],
        // machete: hachazo diagonal de arriba abajo y barrido ancho
        machete: [['mchop', 0.46, 1.35, 0.26], ['mwide', 0.5, 1.25, 0.22]],
        // bayoneta: dos tajos cortos y una embestida larga
        bayoneta: [['bslash', 0.3, 0.9, 0.1], ['bslash', 0.3, 0.9, 0.1], ['blunge', 0.42, 1.6, 0.2]],
        // mariposa: dos cortes rapidísimos y una floritura (se abre girando) con tajo final
        mariposa: [['bquick', 0.2, 0.7, 0.07], ['bquick', 0.2, 0.7, 0.07], ['bflip', 0.5, 1.3, 0.34]],
        // katana: desenvaine en tajo ancho y corte vertical
        katana: [['kiai', 0.46, 1.5, 0.18], ['kdown', 0.52, 1.7, 0.28]],
      };
      const set = SETS[form];
      if (set) {
        this.swingN = ((this.swingN || 0) + 1) % set.length;
        const [type, dur, cdK, hitAt] = set[this.swingN];
        this.swingType = type; this.swingSide = this.swingN % 2 ? 1 : -1;
        this.cooldown = 1 / st.fireRate * cdK;
        this.swingT = dur; this.swingDur = dur;
        this.pendingHit = hitAt;
        VX.Audio.swish();
        if (type === 'bflip') { setTimeout(() => VX.Audio.click(), 90); setTimeout(() => VX.Audio.click(), 200); setTimeout(() => VX.Audio.swish(), 320); }
        if (type === 'kiai' || type === 'kdown') setTimeout(() => VX.Audio.swish(), 60);
        return;
      }
      // tres golpes en ciclo: tajo de derecha a izquierda, revés y estocada
      this.swingN = ((this.swingN || 0) + 1) % 3;
      this.swingType = this.swingN === 0 ? 'stab' : 'slash';
      this.swingSide = this.swingN === 1 ? 1 : -1;
      const dur = this.swingType === 'slash' ? 0.34 : 0.4;
      this.cooldown = 1 / st.fireRate * (this.swingType === 'slash' ? 1 : 1.2);
      this.swingT = dur; this.swingDur = dur;
      this.pendingHit = this.swingType === 'slash' ? 0.11 : 0.15;
      VX.Audio.swish();
    }

    // Golpe del martillo: alcanza a todos los que estén delante, los lanza lejos
    // y, si golpeas el suelo o una pared, revienta los bloques del sitio
    heavyHit(game) {
      const P = game.player, st = this.stats();
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      const fx = sy * cp, fy = sp, fz = cy * cp;
      const smash = this.swingType === 'smash';
      let hits = 0, kills = 0;
      game.dmgSource = 'hammer'; game.dmgWeapon = this.slot.id;
      for (const list of [game.enemies, game.corpses, game.npcHit()]) for (const e of list) {
        if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue;
        const ex = e.x - P.x, ez = e.z - P.z, dist = Math.hypot(ex, ez);
        if (dist > st.reach + (e.radius || 0.3)) continue;
        const dot = (ex * sy + ez * cy) / (dist || 1);
        if (dot < (smash ? 0.55 : 0.2)) continue;
        // rayo hacia el centro del cuerpo para saber qué parte golpea
        const ty = e.y + (e.body.height || 1.6) * (smash ? 0.75 : 0.55);
        let dx = e.x - ox, dy = ty - oy, dz = e.z - oz;
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, st.reach + 1);
        if (!h) continue;
        const ray = { ox, oy, oz, dx, dy, dz };
        const killed = e.hit(h, st.damage * (smash ? 1.25 : 1), ray, game, { blunt: true });
        if (!e.isCorpse) {
          hits++; if (killed) kills++;
          const kb = (smash ? 5 : 9) * (e.isBoss ? 0.15 : 1);
          e.kx = (e.kx || 0) + (ex / (dist || 1)) * kb; e.kz = (e.kz || 0) + (ez / (dist || 1)) * kb;
          if (!e.isBoss && smash && !killed && e.state !== 'leap' && e.state !== 'climb') { e.state = 'stun'; e.stateT = 0.7; }
        }
      }
      game.dmgSource = null;
      if (hits) game.hud.hitmarker(kills > 0);   // (los golpes cuerpo a cuerpo no cuentan para la precisión)
      // punto de impacto contra el escenario
      let t = st.reach;
      const wh = game.world.raycast ? game.world.raycast(ox, oy, oz, fx, fy, fz, st.reach) : null;
      if (wh && wh.t !== undefined) t = Math.min(t, wh.t);
      const ph = game.world.propHit(ox, oy, oz, fx, fy, fz, st.reach);
      if (ph) ph.prop.blast(ox + fx * ph.t, oy + fy * ph.t, oz + fz * ph.t, 0.6, 70, game);
      let ix = ox + fx * t, iy = oy + fy * t, iz = oz + fz * t;
      const g = game.world.groundAt(ix, iz);
      const touches = wh || iy < g + 0.35 || ph;
      if (smash && !wh && !ph) { iy = Math.max(g + 0.05, iy); }
      if (touches || (smash && iy < g + 0.9)) {
        // mazo de demolición: abre boquetes enormes en paredes, suelos y estructuras
        const rad = smash ? 1.25 : 0.9, pow = smash ? 600 : 380;
        game.world.damageSphere(ix, Math.max(iy, g + 0.1), iz, rad, pow, game);
        if (wh) game.world.damageSphere(ix + fx * 0.6, iy + fy * 0.6, iz + fz * 0.6, rad * 0.8, pow, game);   // atraviesa la pared
        if (ph) ph.prop.blast(ix, iy, iz, 1.2, 200, game);
        for (let i = 0; i < 40; i++) game.particles.spawn(ix, Math.max(iy, g) + 0.05, iz, M.rand(-4, 4), M.rand(1, 5), M.rand(-4, 4), 0.42, 0.39, 0.35, M.rand(0.04, 0.1), M.rand(1, 2.2));
        VX.Audio.slam();
        game.shake(smash ? 0.5 : 0.3);
        VX.Haptics.buzz(smash ? 70 : 45);
      } else if (hits) { VX.Audio.slam(); game.shake(0.25); }
      if (hits) VX.Audio.flesh && VX.Audio.flesh();
      P.knock(-sy * 0.8, -cy * 0.8);
    }

    meleeHit(game) {
      if (this.def.heavy) return this.heavyHit(game);
      if (this.def.katana && this.mods.kWave) this.katanaWave(game);
      const P = game.player, st = this.stats();
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      let best = null, bestE = null, bestDir = null;
      const T = this.swingType;
      const form = this.bladeForm(), kat = !!this.def.katana;
      const reach = st.reach * (kat ? 1 : ({ katana: 1.4, machete: 1.15, bayoneta: 1.1 }[form] || 1)) * (T === 'blunge' ? 1.3 : 1);
      const wide = T === 'mwide' || T === 'kiai';
      const fan = wide ? [0, -0.3, 0.3, -0.6, 0.6, -0.9, 0.9] : [0, -0.25, 0.25, -0.5, 0.5];
      const extra = [];   // golpes anchos: alcanzan a varios
      // varios rayos en abanico para que sea fácil acertar
      for (const a of fan) {
        const yaw = P.yaw + a * 0.6, pitch = P.pitch - (a === 0 ? 0 : 0.05);
        const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
        for (const list of [game.enemies, game.corpses, game.npcHit()]) for (const e of list) {
          if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue;
          const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, reach);
          if (!h) continue;
          if (wide && e !== bestE && !extra.some((x) => x.e === e)) extra.push({ e, h, dir: [dx, dy, dz] });
          if (!best || h.t < best.t) { best = h; bestE = e; bestDir = [dx, dy, dz]; }
        }
        if (best && !wide) break;
      }
      if (best) {
        const ray = { ox, oy, oz, dx: bestDir[0], dy: bestDir[1], dz: bestDir[2] };
        // eje del tajo: horizontal con algo de diagonal, alternando
        // eje del corte según el tipo de golpe (vertical en el golpe de arriba, corto en la estocada)
        let ax = -cy, ay = this.swingSide > 0 ? 0.6 : -0.6, az = sy;
        if (this.swingType === 'overhead' || T === 'mchop' || T === 'kdown') { ax *= 0.15; ay = 1; az *= 0.15; }
        const al = Math.hypot(ax, ay, az);
        const MULT = { stab: 1.5, kspin: 1.45, overhead: 1.3, dstab: 1.1, drev: 1.35, mchop: 1.6, mwide: 1.25, blunge: 1.8, bslash: 1, bquick: 0.85, bflip: 1.5, kiai: 1.6, kdown: 1.9 };
        const mult = MULT[T] || 1;
        game.dmgSource = 'knife'; game.dmgWeapon = kat ? 'katana' : 'knife';
        const so = { slash: [ax / al, ay / al, az / al], katana: kat };
        // los tajos anchos también cortan a los de al lado (con menos fuerza)
        for (const x of extra) if (x.e !== bestE && !x.e.dead) { const rr = { ox, oy, oz, dx: x.dir[0], dy: x.dir[1], dz: x.dir[2] }; x.e.hit(x.h, st.damage * mult * 0.7, rr, game, so); }
        let killed = bestE.hit(best, st.damage * mult, ray, game, so);
        // (0.59) tajo doble de la katana
        if (kat && this.mods.kDouble && !killed && !bestE.dead && Math.random() < 0.35) { const h2 = bestE.body.rayHit(ox, oy, oz, ray.dx, ray.dy, ray.dz, reach + 1); if (h2) { killed = bestE.hit(h2, st.damage * mult * 0.6, ray, game, { slash: [ax / al, -ay / al, az / al], katana: true }); game.hud.toast('¡Tajo doble!'); } }
        if (kat) this.katanaFx(game, ox, oy, oz, ray, [ax / al, ay / al, az / al]);
        this.meleeExtras(game, st, mult, bestE, [ax / al, ay / al, az / al]);
        game.dmgSource = null;
        if (!bestE.isCorpse) game.hud.hitmarker(killed);   // (los golpes cuerpo a cuerpo no cuentan para la precisión)
        if (killed && this.mods.meleeHeal && !bestE.isCorpse) game.player.heal(4);   // sinergia Berserker
        game.shake(0.12);
        VX.Haptics.buzz(25);
        VX.Audio.slash();
        P.knock(Math.sin(P.yaw) * 1.5, Math.cos(P.yaw) * 1.5);
        return;
      }
      game.dmgSource = 'knife'; game.dmgWeapon = 'knife';
      this.meleeExtras(game, st, 1, null, [-cy, 0.6, sy]);
      game.dmgSource = null;
      const dx = sy * cp, dy = sp, dz = cy * cp;
      const ph = game.world.propHit(ox, oy, oz, dx, dy, dz, st.reach);
      if (ph) {
        ph.prop.hit(ph, st.damage, { ox, oy, oz, dx, dy, dz }, game);
        game.shake(0.1); VX.Audio.slash();
        return;
      }
      const w = game.world.raycast(ox, oy, oz, dx, dy, dz, st.reach);
      if (w) {
        game.world.damageSphere(w.x + dx * 0.05, w.y + dy * 0.05, w.z + dz * 0.05, 0.22, 35, game);
        game.particles.sparks(w.x, w.y, w.z, w.nx, w.ny, w.nz, 6);
        VX.Audio.wall();
      }
    }

    // Torbellino y Hoja arrojadiza (mejoras de cuerpo a cuerpo)
    meleeExtras(game, st, mult, hitE, slash) {
      const m = this.mods, P = game.player;
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      if (m.whirl) {
        // corta a todos los que tengas alrededor
        const R = st.reach * (m.hurricane ? 1.6 : 1.25), k = m.hurricane ? 1 : 0.6;
        for (const e of game.enemies) {
          if (e.dead || e === hitE || (e.spawnT && e.spawnT > 0.5)) continue;
          if (Math.hypot(e.x - P.x, e.z - P.z) > R + (e.radius || 0.3)) continue;
          let dx = e.body.cx - ox, dy = e.body.cy - oy, dz = e.body.cz - oz; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
          const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, R + 1.5);
          if (h) e.hit(h, st.damage * mult * k, { ox, oy, oz, dx, dy, dz }, game, { slash });
        }
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; game.particles.spawn(P.x + Math.sin(a) * R * 0.8, oy - 0.4, P.z + Math.cos(a) * R * 0.8, Math.cos(a) * 2, 0, -Math.sin(a) * 2, 0.85, 0.9, 1, 0.02, 0.18, 1, 1); }
      }
      if (m.throwBlade) {
        this.bladeN = ((this.bladeN || 0) + 1) % 3;
        if (this.bladeN === 0) {
          // hoja fantasma: vuela 12 m y atraviesa hasta 3 enemigos
          const cp = Math.cos(P.pitch), dx = Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = Math.cos(P.yaw) * cp;
          const wh = game.world.raycast(ox, oy, oz, dx, dy, dz, 12);
          const maxT = wh ? wh.t : 12;
          const hits = [];
          for (const e of game.enemies) {
            if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue;
            const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, maxT);
            if (h) hits.push({ e, h });
          }
          hits.sort((a, b) => a.h.t - b.h.t);
          for (const x of hits.slice(0, 3)) x.e.hit(x.h, st.damage * 1.2, { ox, oy, oz, dx, dy, dz }, game, { slash: [-Math.cos(P.yaw), 0.2, Math.sin(P.yaw)] });
          this.tracers.push({ x0: ox + dx * 0.5, y0: oy - 0.1, z0: oz + dz * 0.5, x1: ox + dx * maxT, y1: oy + dy * maxT, z1: oz + dz * maxT, life: 0.22, max: 0.22, w: 4, c: [0.6, 0.85, 1] });
          VX.Audio.swish();
        }
      }
    }

    // (0.57) clavadora y arpón: frenan, tiran del zombi y lo clavan a la pared si hay una justo detrás
    pinFx(game, e, h, ray) {
      const W = game.world, x = h.vox.wx, y = h.vox.wy, z = h.vox.wz;
      const wall = W.raycast(x, y, z, ray.dx, 0, ray.dz, this.def.harpoon ? 1.6 : 1.1);
      if (e.isBoss) { e.stunT = Math.max(e.stunT || 0, this.def.harpoon ? 0.5 : 0.08); return; }
      if (wall) {
        // clavado: no se mueve un rato
        e.stunT = Math.max(e.stunT || 0, this.def.harpoon ? 2.6 : 1.2);
        e.kx = 0; e.kz = 0; e.pinT = Math.max(e.pinT || 0, this.def.harpoon ? 2.6 : 1.2);
        if (!e.pinnedMsg && this.def.harpoon) { e.pinnedMsg = true; game.hud.toast('¡Clavado a la pared!'); }
        for (let i = 0; i < 5; i++) game.particles.spawn(wall.x, wall.y, wall.z, M.rand(-1, 1), M.rand(0, 1.5), M.rand(-1, 1), 0.8, 0.8, 0.82, 0.02, 0.4, 0.3, 1);
        VX.Audio.at(wall.x, wall.y, wall.z, () => VX.Audio.click());
      } else if (this.def.harpoon) {
        // tira de él hacia ti con la cuerda
        e.kx = (e.kx || 0) - ray.dx * 11; e.kz = (e.kz || 0) - ray.dz * 11;
        e.stunT = Math.max(e.stunT || 0, 0.9);
      } else {
        e.nails = (e.nails || 0) + 1;
        e.stunT = Math.max(e.stunT || 0, Math.min(0.5, 0.1 + e.nails * 0.04));
      }
      if (this.def.harpoon && this.muzzle) this.tracers.push({ x0: this.muzzle[0], y0: this.muzzle[1], z0: this.muzzle[2], x1: x, y1: y, z1: z, life: 0.45, max: 0.45, c: [0.75, 0.62, 0.42], w: 1.4 });
    }

    // Efectos de la munición especial (mejoras de la partida) al alcanzar a un enemigo
    bulletFx(game, e, h, dmg, killed) {
      const m = this.mods;
      if (this.def.flame) return;
      const x = h.vox.wx, y = h.vox.wy, z = h.vox.wz;
      if (m.frost && !e.isBoss) { e.chillT = 2.5; if (Math.random() < 0.6) for (let i = 0; i < 4; i++) game.particles.spawn(x, y, z, M.rand(-1, 1), M.rand(0, 1.5), M.rand(-1, 1), 0.7, 0.92, 1, 0.025, 0.6, 0.8, 1); }
      if (m.toxic && !e.isBoss) { e.poisonT = 4; e.poisonDps = Math.max(e.poisonDps || 0, 8 + dmg * 0.15); }
      if (m.shock) {
        // el rayo salta a los enemigos más cercanos
        let from = e, n = m.shock;
        const hitSet = new Set([e]);
        for (let k = 0; k < n; k++) {
          let best = null, bd = 5.5;
          for (const o of game.enemies) {
            if (o.dead || hitSet.has(o) || (o.spawnT && o.spawnT > 0.5)) continue;
            const d = Math.hypot(o.body.cx - from.body.cx, o.body.cy - from.body.cy, o.body.cz - from.body.cz);
            if (d < bd) { bd = d; best = o; }
          }
          if (!best) break;
          hitSet.add(best);
          // trazo en zigzag
          const ax = from.body.cx, ay = from.body.cy, az = from.body.cz, bx = best.body.cx, by = best.body.cy, bz = best.body.cz;
          let px = ax, py = ay, pz = az;
          for (let s = 1; s <= 4; s++) {
            const t = s / 4, j = s < 4 ? 0.25 : 0;
            const nx = ax + (bx - ax) * t + M.rand(-j, j), ny = ay + (by - ay) * t + M.rand(-j, j), nz = az + (bz - az) * t + M.rand(-j, j);
            this.tracers.push({ x0: px, y0: py, z0: pz, x1: nx, y1: ny, z1: nz, life: 0.12, max: 0.12, w: 1.6, c: [0.55, 0.85, 1] });
            px = nx; py = ny; pz = nz;
          }
          game.dmgSource = 'gun';
          best.blast(bx, by, bz, 0.4, dmg * 0.45, game);
          best.stunT = Math.max(best.stunT || 0, 0.35);
          from = best;
        }
        if (Math.random() < 0.5) VX.Audio.snap && VX.Audio.snap();
      }
      if (m.explosive) this.bulletBoom(game, x, y, z, dmg);
      void killed;
    }
    bulletBoom(game, x, y, z, dmg) {
      const now = game.time;
      if (this.lastBoom && now - this.lastBoom < 0.1) return;   // con las armas rápidas, como mucho 10 por segundo
      this.lastBoom = now;
      game.explode({ x, y, z, R: 1.0, dmg: dmg * 0.45, destr: 0.5, selfK: 0, small: true, frost: !!this.mods.frostBlast });
    }

    // ---------------- Armas de fuego ----------------
    viewToWorld(P, vx, vy, vz) {
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const fwd = [sy * cp, sp, cy * cp], right = [-cy, 0, sy], up = [-sy * sp, cp, -cy * sp];
      return [P.eyeX() + right[0] * vx + up[0] * vy - fwd[0] * vz,
        P.eyeY() + up[1] * vy - fwd[1] * vz,
        P.eyeZ() + right[2] * vx + up[2] * vy - fwd[2] * vz];
    }

    fire(game, st) {
      const P = game.player, d = this.def;
      if (this.kickBuff > 0) { this.kickBuff = 0; this.kickShot = true; } else this.kickShot = false;   // golpe tras patada: se gasta en este disparo
      // primer disparo y últimas balas (se miran antes de gastar la bala)
      this.shotFirst = !!this.mods.firstShot && this.slot.ammo >= st.mag;
      this.shotLast = !!this.mods.lastRounds && this.slot.ammo - 1 < st.mag * 0.2;
      this.beltIdle = 0;
      // detonador remoto: disparar otra granada hace estallar las que están pegadas
      if (d.grenade && this.mods.remote) for (const g of this.grenades) if (g.stuck && !g.dead && !g.mini) { g.dead = true; this.explode(game, g); }
      this.slot.ammo--;
      this.cooldown = 1 / st.fireRate;
      this.kick = 1; this.slide = 1; this.flash = 1;
      VX.GunAnim.onFire(this, this.slot.id, d.form);
      P.recoilPitch += (d.recoil + st.damage * 0.0002) * this.attMul().recoil;
      game.stats.shots++;
      this.shotHit = false;
      game.roomShots = (game.roomShots || 0) + 1;
      VX.Audio.shoot(d.sound * this.attMul().sound, d.sfx);
      game.shake(d.shake || 0.1);
      VX.Haptics.buzz(Math.round(8 + (d.shake || 0.1) * 70));

      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const fwd = [sy * cp, sp, cy * cp], right = [-cy, 0, sy], up = [-sy * sp, cp, -cy * sp];
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      const vm = d.vm, mz = d.dual && this.dualSide ? [-d.muzzle[0] - 31, d.muzzle[1], d.muzzle[2]] : d.muzzle;
      if (d.dual) { if (this.dualSide) this.kickL = 1; else this.kickR = 1; }
      this.muzzle = this.viewToWorld(P, vm.x + mz[0] * vm.g, vm.y + mz[1] * vm.g, vm.z + mz[2] * vm.g);
      const [mx, my, mzz] = this.muzzle;
      // fogonazo ligero en la punta (sólo las armas de balas): un destello suave y una voluta de humo
      if (!d.grenade && !d.flame && !d.beam && !d.bolt && !d.ray && ['pistol', 'smg', 'rifle', 'shotgun', 'dbarrel', 'lmg', 'dual'].includes(this.slot.id)) {
        if (this.puffs.length > 24) this.puffs.shift();
        // la punta tal como se ve: el arma se dibuja con 58° de campo de visión y el mundo con el tuyo,
        // así que la posición en pantalla se pasa de una perspectiva a la otra
        const tw = this.tipWorld({ x: P.eyeX(), y: P.eyeY(), z: P.eyeZ(), yaw: P.yaw, pitch: P.pitch + P.recoilPitch }) || [mx, my, mzz];
        this.puffs.push({ x: tw[0], y: tw[1], z: tw[2], dx: fwd[0], dy: fwd[1], dz: fwd[2], t: 0, big: d.pellets > 1 ? 1.35 : 1, seed: Math.random() * 100 });
      }

      const coopDirs = VX.Coop.active ? [] : null;
      if (d.grenade) {
        const sp0 = 17;
        this.grenades.push({
          x: mx, y: my, z: mzz, vx: fwd[0] * sp0 + P.vx * 0.5, vy: fwd[1] * sp0 + 2.5, vz: fwd[2] * sp0 + P.vz * 0.5,
          life: 4, rot: 0, dmg: st.damage, blast: d.blast * Math.sqrt(st.destruction) * (this.mods.blastR || 1), destr: st.destruction,
          bounces: this.mods.bouncy ? 1 : 0,
        });
        if (coopDirs) VX.Coop.shareGrenade(this.grenades[this.grenades.length - 1]);
      } else {
        if (d.flame) {
          // chorro de fuego: lenguas de llama que salen de la boquilla
          for (let k = 0; k < 4; k++) {
            const sp = M.rand(7, 11);
            game.particles.spawn(mx, my, mzz, fwd[0] * sp + M.rand(-0.8, 0.8) + P.vx * 0.6, fwd[1] * sp + M.rand(-0.4, 1), fwd[2] * sp + M.rand(-0.8, 0.8) + P.vz * 0.6,
              1, M.rand(0.35, 0.75), 0.1, M.rand(0.06, 0.12), M.rand(0.45, 0.8), 1, 1);
          }
          if (Math.random() < 0.3) game.particles.spawn(mx + fwd[0] * 5, my + fwd[1] * 5 + 0.3, mzz + fwd[2] * 5, M.rand(-0.5, 0.5), M.rand(0.8, 1.5), M.rand(-0.5, 0.5), 0.12, 0.11, 0.1, M.rand(0.12, 0.2), M.rand(1, 2), 0, 1);
        }
        for (let p = 0; p < st.pellets; p++) {
          // la dispersión crece si mantienes el gatillo (ráfagas largas = menos precisión)
          const bloom = 1 + Math.min(0.7, (this.heat || 0) * 0.045) * (this.mods.recoil || 1);
          const s = st.spread * (st.pellets > 1 && d.pellets === 1 ? 2 : 1) * bloom * (1 - (this.scopeK || 0) * 0.9);
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * s;
          let dx = fwd[0] + right[0] * Math.cos(a) * r + up[0] * Math.sin(a) * r;
          let dy = fwd[1] + up[1] * Math.sin(a) * r;
          let dz = fwd[2] + right[2] * Math.cos(a) * r + up[2] * Math.sin(a) * r;
          const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
          this.shootRay(game, st, ox, oy, oz, dx, dy, dz, mx, my, mzz);
          if (coopDirs) coopDirs.push([dx, dy, dz, this.rayEnd, this.rayKind]);
        }
        if (coopDirs) VX.Coop.shareShot(game, ox, oy, oz, coopDirs, this.slot.id, st.damage, st.destruction, mx, my, mzz, this.mods);
      }
      this.applyRecoil(P, d);
      this.shotFirst = this.shotLast = false;
      // retroceso propulsor: con perdigones en el aire, el disparo te empuja hacia atrás y arriba
      if (this.mods.recoilJump && st.pellets > 1 && !P.onGround) {
        P.vy = Math.max(P.vy, 6.8);
        P.knock(-fwd[0] * 7, -fwd[2] * 7);
      }
      // (0.53.1: ya no sale aquí la vaina antigua, que iba hacia la izquierda; las vainas las suelta GunAnim, a la derecha)
      if (this.slot.ammo <= 0) this.startReload();
    }

    shootRay(game, st, ox, oy, oz, dx, dy, dz, mx, my, mz, bounce = 0) {
      game.dmgSource = 'gun'; game.dmgWeapon = this.id;
      const wHit = game.world.raycast(ox, oy, oz, dx, dy, dz, st.range);
      let maxT = wHit ? wHit.t : st.range;
      // barriles, cajas y demás objetos se interponen antes que la pared
      const ph = game.world.propHit(ox, oy, oz, dx, dy, dz, maxT);
      if (ph) maxT = ph.t;
      // las balas pueden destruir los proyectiles enemigos "disparables"
      const sb = game.bullets ? game.bullets.rayHit(ox, oy, oz, dx, dy, dz, maxT) : null;
      let dmg = st.damage;
      let pierce = st.pierce;
      const ignore = new Set();
      let endT = maxT;
      let stoppedByEnemy = false;
      const ray = { ox, oy, oz, dx, dy, dz };

      while (true) {
        let best = null, bestE = null;
        for (const list of [game.enemies, game.corpses, game.npcHit()]) {
          for (const e of list) {
            if (e.dead || ignore.has(e) || (e.spawnT && e.spawnT > 0.5)) continue;
            const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, best ? best.t : maxT);
            if (h && (!best || h.t < best.t)) { best = h; bestE = e; }
          }
        }
        if (sb && (!best || sb.t < best.t)) {
          game.bullets.destroy(sb.b, game);
          endT = sb.t; stoppedByEnemy = true;
          break;
        }
        if (!best) break;
        const killed = bestE.hit(best, dmg, ray, game);
        if (!game.visualOnly) this.bulletFx(game, bestE, best, dmg, killed);
        // precisión: cada disparo cuenta como mucho un acierto (aunque varios perdigones o una bala que atraviesa den a varios)
        if (!bestE.isCorpse) { game.hud.hitmarker(killed); if (!this.shotHit) { this.shotHit = true; game.stats.hits++; } }
        if (this.def.flame && !killed && !bestE.isBoss && !(bestE.T && bestE.T.fireImmune)) bestE.burn = Math.max(bestE.burn || 0, this.mods.blueFlame ? 2 : 3);   // lanzallamas: arde
        if (this.def.flame && this.mods.tar && Math.random() < 0.04 && game.addFire && !bestE.isCorpse) game.addFire(bestE.x, bestE.z, 0.7, 5);
        if ((this.def.nail || this.def.harpoon) && !killed && !bestE.dead && !bestE.isCorpse) this.pinFx(game, bestE, best, ray);
        ignore.add(bestE);
        if (pierce > 0) { pierce--; dmg *= 0.75; continue; }
        endT = best.t + 0.4; stoppedByEnemy = true;
        break;
      }

      if (!stoppedByEnemy && ph) {
        ph.prop.hit(ph, dmg * st.destruction, ray, game);
        stoppedByEnemy = true; endT = ph.t;
      }
      // para el cooperativo: dónde acabó la bala y qué tocó (los compañeros lo repiten igual)
      this.rayEnd = stoppedByEnemy ? endT : wHit ? wHit.t : st.range;
      this.rayKind = stoppedByEnemy ? 1 : wHit ? 2 : 0;
      if (!stoppedByEnemy && wHit && this.def.flame) {
        // el fuego no agujerea: chamusca y a veces prende el suelo
        if (Math.random() < (this.mods.tar ? 0.3 : 0.05) && wHit.ny > 0.5 && game.addFire) game.addFire(wHit.x, wHit.z, this.mods.tar ? 0.7 : 0.5, this.mods.tar ? 6 : 2.5);   // brea: charcos que arden
        game.dmgSource = null;
        return;
      }
      if (!stoppedByEnemy && wHit) {
        const hx = wHit.x + dx * 0.02, hy = wHit.y + dy * 0.02, hz = wHit.z + dz * 0.02;
        const radius = 0.16 + 0.14 * st.destruction + st.damage / 300;
        const n = game.world.damageSphere(hx, hy, hz, radius, Math.min(140, st.damage * 1.4) * st.destruction, game);
        if (this.mods.explosive && !this.def.flame) this.bulletBoom(game, wHit.x - dx * 0.1, wHit.y - dy * 0.1, wHit.z - dz * 0.1, st.damage);
        game.particles.sparks(wHit.x, wHit.y, wHit.z, wHit.nx, wHit.ny, wHit.nz, 4);
        if (!n && game.addBulletHole) game.addBulletHole(wHit);   // el agujero se queda en la pared
        if (this.mods.magnesium && st.pellets > 1 && Math.random() < 0.07 && wHit.ny > 0.5 && game.addFire) game.addFire(wHit.x, wHit.z, 0.6, 3);
        if (this.mods.napalm && this.mods.fire && Math.random() < 0.3 && wHit.y < game.world.groundAt(wHit.x, wHit.z) + 0.6) game.addFire(wHit.x, wHit.z, 0.5, 3);
        const col = VX.Blocks.color(wHit.block, wHit.gx, wHit.gy, wHit.gz, [0, 0, 0, 0]);
        for (let i = 0; i < 4; i++)
          game.particles.spawn(wHit.x, wHit.y, wHit.z, wHit.nx * 2 + M.rand(-1.5, 1.5), wHit.ny * 2 + M.rand(0, 2.5), wHit.nz * 2 + M.rand(-1.5, 1.5),
            col[0], col[1], col[2], M.rand(0.025, 0.06), M.rand(0.6, 1.4), 0);
        if (!n) VX.Audio.wall();
        // mejora "Rebote": la bala busca otro enemigo desde la pared
        if (bounce < (st.ricochet || 0)) {
          // rebote de verdad: sale reflejada por la normal de la pared y sólo se tuerce un poco
          // hacia un enemigo que quede cerca de esa dirección (antes buscaba a cualquiera en 14 m)
          const sx = wHit.x - dx * 0.08, sy = wHit.y - dy * 0.08, sz = wHit.z - dz * 0.08;
          const dn = dx * wHit.nx + dy * wHit.ny + dz * wHit.nz;
          const rx = dx - 2 * dn * wHit.nx, ry = dy - 2 * dn * wHit.ny, rz = dz - 2 * dn * wHit.nz;
          let best = null, bc = Math.cos(0.32);
          for (const e of game.enemies) {
            if (e.dead || e.spawnT > 0.5) continue;
            const ex = e.body.cx - sx, ey = e.body.cy - sy, ez = e.body.cz - sz, d = Math.hypot(ex, ey, ez);
            if (d > 12 || d < 0.3) continue;
            const c = (ex * rx + ey * ry + ez * rz) / d;
            if (c > bc && game.world.lineOfSight(sx, sy, sz, e.body.cx, e.body.cy, e.body.cz)) { bc = c; best = e; }
          }
          if (best) {
            const bx = best.body.cx - sx, by = best.body.cy - sy, bz = best.body.cz - sz, bl = Math.hypot(bx, by, bz);
            this.tracers.push({ x0: mx, y0: my, z0: mz, x1: wHit.x, y1: wHit.y, z1: wHit.z, life: 0.06 });
            this.shootRay(game, { ...st, damage: st.damage * 0.7 }, sx, sy, sz, bx / bl, by / bl, bz / bl, sx, sy, sz, bounce + 1);
            game.dmgSource = null;
            return;
          }
        }
      }
      game.dmgSource = null;
      game.world.cutSoft(ox, oy, oz, dx, dy, dz, endT, st.damage, game);
      const ex = ox + dx * endT, ey = oy + dy * endT, ez = oz + dz * endT;
      // la bala abre un surco en la niebla baja
      if (game.stirFog && bounce === 0) { game.stirFog(ex, ez, 0.9, 0.7, 0.4); game.stirFog(ox + dx * Math.min(endT, 3), oz + dz * Math.min(endT, 3), 0.8, 0.5, 0.5); }
      if (this.def.flame) return;
      if (this.def.ray) this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: 0.14, max: 0.14, c: [0.35, 1, 0.45], w: 3 });
      else if (this.def.nail) this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: 0.07, max: 0.07, c: [0.7, 0.72, 0.76], w: 0.9 });
      else if (this.def.harpoon) this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: 0.14, max: 0.14, c: [0.8, 0.82, 0.86], w: 2.2 });
      else if (this.def.bolt) this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: 0.09, max: 0.09, c: [0.75, 0.7, 0.6], w: 1.6 });
      else {
        // la trazadora cambia con la munición: más gruesa y lenta (subsónica, magnum), fina y rápida (alta velocidad), azul (eléctrica)…
        const m = this.mods, cal = m.caliber;
        const c = m.shock ? [0.55, 0.85, 1] : m.frost ? [0.7, 0.95, 1] : m.toxic ? [0.5, 1, 0.35] : m.explosive ? [1, 0.55, 0.2] : m.tracer;
        this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: cal === 'subsonic' || cal === 'magnum' ? 0.1 : 0.06, max: cal === 'subsonic' || cal === 'magnum' ? 0.1 : 0.06, c, w: cal === 'magnum' ? 2 : cal === 'subsonic' ? 1.5 : cal === 'highvel' ? 0.7 : 1 });
      }
    }

    // ---------------- Granadas ----------------
    updateGrenades(dt, game) {
      const m = this.mods;
      for (const g of this.grenades) {
        if (g.type) { g.life -= dt; VX.Throw.step(this, game, g, dt); continue; }   // objetos arrojables
        if (g.stuck) {
          // granada pegada (detonador remoto) o mina: espera
          g.life -= dt; g.armT = Math.max(0, (g.armT || 0) - dt);
          if (Math.random() < dt * 3) game.particles.spawn(g.x, g.y + 0.06, g.z, 0, 0.3, 0, 1, 0.15, 0.1, 0.03, 0.2, 1, 1);
          let boom = g.life <= 0;
          if (g.mine && g.armT <= 0) for (const e of game.enemies) if (!e.dead && Math.hypot(e.x - g.x, e.z - g.z) < 1.7 && Math.abs(e.y - g.y) < 2) { boom = true; break; }
          if (boom) { g.dead = true; this.explode(game, g); }
          continue;
        }
        const px = g.x, py = g.y, pz = g.z;
        g.vy -= (g.fireball ? 2.5 : 14) * dt;
        g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
        g.rot += dt * 10; g.life -= dt;
        if (g.fireball) { for (let i = 0; i < 3; i++) game.particles.spawn(g.x + M.rand(-0.1, 0.1), g.y + M.rand(-0.1, 0.1), g.z + M.rand(-0.1, 0.1), M.rand(-0.6, 0.6), M.rand(0, 1), M.rand(-0.6, 0.6), 1, M.rand(0.35, 0.75), 0.1, M.rand(0.06, 0.12), M.rand(0.25, 0.5), 1, 1); }
        else if (g.mini) { if (Math.random() < 0.7) game.particles.spawn(g.x, g.y, g.z, 0, 0.2, 0, g.col ? g.col[0] : 1, g.col ? g.col[1] : 0.7, g.col ? g.col[2] : 0.2, 0.03, 0.3, 1, 1); }
        else if (Math.random() < 0.6) game.particles.spawn(g.x, g.y, g.z, 0, 0.4, 0, 0.35, 0.33, 0.32, 0.05, 0.6, 0, 1);
        let enemyHit = false;
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.body.cx - g.x, e.body.cy - g.y, e.body.cz - g.z) < (e.isBoss ? 1.3 : g.fireball ? 0.9 : 0.7)) { enemyHit = true; break; }
        }
        const solid = game.world.isSolidAt(g.x, g.y, g.z) || g.y < 0.05;
        if (!enemyHit && solid && g.bounces > 0 && !g.remote) {
          // rebotadoras: rebota en lo que toque
          g.bounces--;
          const floor = game.world.isSolidAt(px, g.y, pz);
          g.x = px; g.y = py; g.z = pz;
          if (floor) g.vy = Math.abs(g.vy) * 0.55; else { g.vx *= -0.6; g.vz *= -0.6; g.vy *= 0.7; }
          VX.Audio.wall();
          continue;
        }
        if (!enemyHit && !g.remote && !g.mini && !g.fireball && (solid || g.life <= 0) && (m.remote || m.mine)) {
          // se queda pegada donde cae
          g.x = px; g.y = solid ? py : g.y; g.z = pz; g.vx = g.vy = g.vz = 0;
          g.stuck = true; g.mine = !!m.mine; g.armT = 0.6; g.life = m.remote ? 30 : 20;
          VX.Audio.click();
          continue;
        }
        if (enemyHit || solid || g.life <= 0) {
          g.dead = true;
          // granada de un compañero: sólo rompe paredes y se ve (el daño a los zombis lo cuenta su dueño)
          if (g.remote) { game.visualOnly = true; try { game.explode({ x: g.x, y: g.y, z: g.z, R: g.blast, dmg: g.dmg, destr: g.destr, selfK: 0, weapon: 'launcher' }); } finally { game.visualOnly = false; } }
          else this.explode(game, g);
        }
      }
      this.grenades = VX.M.compact(this.grenades, (g) => !g.dead);
      VX.Throw.update();
    }

    explode(game, g) {
      const m = this.mods;
      if (g.fireball) {
        // bocanada: estalla y deja el suelo ardiendo (con «Dragón», una columna de llamas)
        game.explode({ x: g.x, y: g.y, z: g.z, R: m.dragon ? 2.2 : 1.6, dmg: g.dmg * (m.dragon ? 1.4 : 1), destr: 0.6, selfK: 0, weapon: 'flamer' });
        if (game.addFire) game.addFire(g.x, g.z, m.dragon ? 1.8 : 1.1, m.dragon ? 7 : 4);
        if (m.dragon) for (let i = 0; i < 30; i++) game.particles.spawn(g.x + M.rand(-0.5, 0.5), game.world.groundAt(g.x, g.z) + 0.2, g.z + M.rand(-0.5, 0.5), M.rand(-0.5, 0.5), M.rand(4, 9), M.rand(-0.5, 0.5), 1, M.rand(0.3, 0.7), 0.08, M.rand(0.08, 0.15), M.rand(0.5, 1), 1, 1);
        return;
      }
      game.explode({ x: g.x, y: g.y, z: g.z, R: g.blast, dmg: g.dmg, destr: g.destr, weapon: 'launcher', small: !!g.mini });
      // racimo: suelta minigranadas (con «Fuegos artificiales», 5 y de colores)
      if (m.cluster && !g.mini) {
        const n = m.fireworks ? 5 : 3;
        const COLS = [[1, 0.3, 0.3], [0.3, 1, 0.4], [0.4, 0.6, 1], [1, 0.9, 0.3], [1, 0.4, 1]];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random(), sp = M.rand(3, 5);
          this.grenades.push({ mini: true, x: g.x, y: g.y + 0.3, z: g.z, vx: Math.cos(a) * sp, vy: M.rand(4, 6.5), vz: Math.sin(a) * sp, life: M.rand(0.7, 1.1), rot: 0,
            dmg: g.dmg * 0.4, blast: g.blast * 0.6, destr: g.destr * 0.5, bounces: 0, col: m.fireworks ? COLS[i % COLS.length] : null });
        }
      }
    }

    // bola de fuego del lanzallamas (mejora «Bocanada»): gasta un poco de depósito
    launchFireball(game, st) {
      const P = game.player;
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const [mx, my, mz] = this.muzzle || [P.eyeX(), P.eyeY(), P.eyeZ()];
      this.slot.ammo = Math.max(0, this.slot.ammo - 6);
      this.grenades.push({ fireball: true, x: mx, y: my, z: mz, vx: sy * cp * 20, vy: sp * 20 + 1, vz: cy * cp * 20, life: 1.6, rot: 0, dmg: st.damage * 9, blast: 1.6, destr: 0.6, bounces: 0 });
      VX.Audio.at ? VX.Audio.explosion(0.15) : 0;
      game.shake(0.1);
    }

    // ---- mejoras 0.44: multiplicador de daño según la situación ----
    hitMul(e, pn, opts, game) {
      const m = this.mods, P = game.player;
      const gun = game.dmgSource === 'gun', melee = game.dmgSource === 'knife' || game.dmgSource === 'hammer';
      let k = 1;
      if (gun && this.shotFirst) k *= 2;
      if (gun && this.shotLast) k *= 1.4;
      if (gun && m.pointBlank && Math.hypot(e.x - P.x, e.z - P.z) < 2.5) k *= 1.6;
      if (gun && m.blueFlame && this.def.flame) k *= 1.4;
      if (e.markT > 0) k *= 1.3;
      if (m.berserkPact) k *= 1 + 0.6 * M.clamp(1 - P.hp / P.maxHp, 0, 1);
      if (melee) {
        if (m.lunge && P.lungeT > 0) { k *= 1.8; P.lungeT = 0; game.hud.toast('¡Embestida!'); }
        if (m.counter && this.counterT > 0) { k *= 3; this.counterT = 0; game.hud.toast('¡Contraataque!'); }
        if (m.execute && !e.isBoss && e.maxHp && e.hp > 0 && e.hp < e.maxHp * 0.25) { k *= 40; e.executed = true; }
      }
      return k;
    }
    // efectos al alcanzar a un enemigo (después del daño)
    onHitFx(e, pn, dmg, dir, opts, game) {
      const m = this.mods, P = game.player;
      const gun = game.dmgSource === 'gun', melee = game.dmgSource === 'knife' || game.dmgSource === 'hammer';
      if (m.bleed && melee && !e.isBoss) { e.bleedT = 4; e.bleedDps = Math.max(e.bleedDps || 0, 6 + dmg * 0.12); }
      if (gun && m.knee && pn && pn.startsWith('leg') && !e.isBoss && !e.crawling && e.state !== 'stun' && e.state !== 'charge') { e.state = 'stun'; e.stateT = 1.0; e.kx = (e.kx || 0) + dir[0] * 2; e.kz = (e.kz || 0) + dir[2] * 2; }
      if (gun && m.suppress) e.suppressT = 1.5;
      if (gun && m.pointBlank && Math.hypot(e.x - P.x, e.z - P.z) < 2.5) { e.kx = (e.kx || 0) + dir[0] * 5; e.kz = (e.kz || 0) + dir[2] * 5; }
      if (gun && m.magnesium && this.stats().pellets > 1 && !(e.T && e.T.fireImmune)) e.burn = Math.max(e.burn || 0, 3);
      if (gun && m.mark && !(this.marked && !this.marked.dead && this.marked.markT > 0)) { this.marked = e; e.markT = 5; }
      if (e.executed && melee) {
        e.executed = false;
        game.particles.blood(e.body.cx, e.body.cy, e.body.cz, dir[0] * 2, 1, dir[2] * 2, 30);
        game.shake(0.2); VX.Audio.splat && VX.Audio.splat();
        if (m.butcher) game.pickups.dropHeart(e.x, e.y + 1, e.z, 10);
      }
    }

    // ---------------- Render ----------------
    renderTracers(batch) {
      for (const t of this.tracers) {
        const dx = t.x1 - t.x0, dy = t.y1 - t.y0, dz = t.z1 - t.z0;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.01) continue;
        const q = M.qFromDir(dx / len, dy / len, dz / len);
        const w = 0.012 * (t.w || 1) * (t.life / (t.max || 0.06));
        const c = t.c || [1, 0.85, 0.5];
        batch.rbox((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, (t.z0 + t.z1) / 2, w, w, len, q, c[0], c[1], c[2], 1);
      }
      // (0.57) la bota de la patada (se ve al mirar al frente/abajo)
      if (this.kickT > 0 && VX.game) {
        const P = VX.game.player, k = Math.sin(Math.PI * (1 - this.kickT / 0.32));
        const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), q = M.qMul(M.qY(P.yaw), M.qX(-0.9 * k));
        const r = 0.28 + 0.62 * k, bx = P.x + sy * r + cy * 0.1, bz = P.z + cy * r - sy * 0.1, by = P.y + 0.3 + 0.5 * k;
        batch.rbox(bx, by, bz, 0.17, 0.15, 0.3, q, 0.24, 0.16, 0.1, 0);                      // bota
        batch.rbox(bx, by - 0.08, bz, 0.18, 0.04, 0.31, q, 0.1, 0.08, 0.07, 0);             // suela
        batch.rbox(bx - sy * 0.18, by + 0.12, bz - cy * 0.18, 0.15, 0.34, 0.15, q, 0.2, 0.22, 0.28, 0);   // pierna
      }
      for (const g of this.grenades) {
        if (g.type) { VX.Throw.render(batch, g, (VX.game && VX.game.time) || 0); continue; }
        const q = M.qAxis(0.6, 0.3, 0.74, g.rot);
        if (g.fireball) { batch.rbox(g.x, g.y, g.z, 0.22, 0.22, 0.22, q, 1, 0.55, 0.1, 1); batch.rbox(g.x, g.y, g.z, 0.12, 0.12, 0.12, q, 1, 0.95, 0.6, 1); continue; }
        if (g.mini) { const c = g.col || [0.35, 0.36, 0.3]; batch.rbox(g.x, g.y, g.z, 0.06, 0.06, 0.06, q, c[0], c[1], c[2], g.col ? 0.8 : 0); continue; }
        batch.rbox(g.x, g.y, g.z, 0.09, 0.09, 0.13, q, 0.3, 0.36, 0.22, 0);
        const blink = g.stuck ? (Math.sin((VX.game ? VX.game.time : 0) * (g.mine ? 14 : 6)) > 0 ? 1 : 0.15) : 1;
        batch.rbox(g.x, g.y + 0.05, g.z, 0.03, 0.03, 0.03, q, 1, 0.2 * blink, 0.1 * blink, blink);
      }
    }

    // Modelo en primera persona (espacio de cámara: x der, y arriba, -z delante).
    // pose: {x,y,z,q} para la vitrina de la Armería.
    renderViewmodel(batch, game, idOverride, pose, skinOverride) {
      const P = game.player;
      const id = idOverride || this.slot.id;
      const d = VX.Weapons.DEFS[id];
      const vm = d.vm;
      let g = vm.g;
      const model = VX.Weapons.coloredModel(id, skinOverride || VX.Profile.skinFor(id), id === 'knife' ? (pose && pose.form) || VX.Profile.knifeForm() : id === 'pistol' ? (pose && pose.form) || d.form || null : null, !pose, pose ? (pose.atts || null) : this.attList(id));
      const A = !pose && !d.melee && !idOverride ? VX.GunAnim.animate(this, id, d, d.form) : null;
      let bx = vm.x, by = vm.y, bz = vm.z, q;
      let bYaw = 0, bPitch = 0, bRoll = 0;   // giro de la hoja sobre la empuñadura (sólo cuchillo)
      if (pose) {
        q = pose.q;
        // centrar y escalar el arma (sin mano) para la vitrina
        let cx = 0, cy = 0, cz = 0, n = 0, mn = [1e9, 1e9, 1e9], mxv = [-1e9, -1e9, -1e9];
        for (const v of model) {
          if (v.tag === 'hand' || v.tag === 'wrist' || v.tag === 'sleeve') continue;
          cx += v.x; cy += v.y; cz += v.z; n++;
          mn[0] = Math.min(mn[0], v.x); mn[1] = Math.min(mn[1], v.y); mn[2] = Math.min(mn[2], v.z);
          mxv[0] = Math.max(mxv[0], v.x); mxv[1] = Math.max(mxv[1], v.y); mxv[2] = Math.max(mxv[2], v.z);
        }
        cx /= n; cy /= n; cz /= n;
        g = pose.size / Math.max(mxv[0] - mn[0], mxv[1] - mn[1], mxv[2] - mn[2], 1);
        M.qRot(q, cx * g, cy * g, cz * g, tmp);
        bx = pose.x - tmp[0]; by = pose.y - tmp[1]; bz = pose.z - tmp[2];
      }
      else {
        let pitch = 0, roll = 0, yawR = 0.09;
        bYaw = 0; bPitch = 0; bRoll = 0;
        const hs = Math.hypot(P.vx, P.vz);
        const bob = P.onGround ? Math.min(1, hs / 5) : 0;
        bx += Math.sin(P.walkT) * 0.01 * bob;
        by -= Math.abs(Math.cos(P.walkT)) * 0.008 * bob;
        bz += this.kick * (d.kick || 0.03);
        pitch = this.kick * (d.melee ? 0 : 0.22 + (d.recoil || 0) * 2);
        if (A) { pitch += A.pitch; roll += A.roll; yawR += A.yaw; bx += A.bx; by += A.by; bz += A.bz; }
        if (d.melee) {
          // La mano se mueve poco; casi todo el gesto lo hace la hoja girando sobre la empuñadura
          yawR = d.heavy ? 0.2 : 0.06; pitch = d.heavy ? 0.35 : 0.12;
          if (d.heavy) { by -= 0.02; roll = -0.2; }
          const tt = game.time;
          bRoll += Math.sin(tt * 1.7) * 0.05; bPitch += Math.sin(tt * 1.3) * 0.03; by += Math.sin(tt * 2.1) * 0.003;
          if (this.swingT > 0) {
            const k = 1 - this.swingT / (this.swingDur || 0.32);
            const side = this.swingSide;
            if (d.heavy) {
              if (this.swingType === 'smash') {
                // mazazo: el brazo sube el martillo por encima del hombro y lo descarga
                const up = k < 0.5 ? Math.sin((k / 0.5) * Math.PI * 0.5) : 1 - M.smoothstep(0.5, 0.62, k);
                const down = k >= 0.5 ? Math.sin(Math.min(1, (k - 0.5) / 0.3) * Math.PI * 0.5) * (1 - M.smoothstep(0.8, 1, k)) : 0;
                by += up * 0.1 - down * 0.12; bz += up * 0.05 - down * 0.12; bx -= up * 0.03;
                pitch += up * 0.9 - down * 1.25; roll += up * 0.15;
                bPitch += up * 0.6 - down * 0.5;
              } else {
                // barrido: de un lado a otro con todo el cuerpo
                const e = M.smoothstep(0.15, 0.6, k), arc = Math.sin(k * Math.PI);
                const wind = k < 0.3 ? Math.sin((k / 0.3) * Math.PI * 0.5) : 1;
                yawR += side * (0.9 * wind - e * 2.0); bx += side * (0.08 * wind - e * 0.2); bz -= arc * 0.1; by += arc * 0.03;
                roll += side * (0.5 - e * 1.1); pitch += -0.3 * arc; bYaw += side * (0.4 - e * 0.8);
              }
            } else if (this.swingType === 'khook') {
              // zarpazo en gancho: la garra sube por fuera y baja tirando hacia dentro, con la muñeca girada
              const wind = k < 0.22 ? Math.sin((k / 0.22) * Math.PI * 0.5) : 1;
              const e = M.smoothstep(0.18, 0.6, k), back = 1 - M.smoothstep(0.7, 1, k);
              const arc = Math.sin(Math.min(1, k * 1.2) * Math.PI);
              yawR += side * (0.28 * wind - e * 0.7) * back;
              bx += side * (0.04 * wind - e * 0.11) * back; by += (0.05 * wind - e * 0.09) * back; bz -= arc * 0.06;
              roll += side * (0.45 * wind - e * 0.9) * back; pitch += (0.25 * wind - e * 0.45) * back;
              bPitch += (-0.7 * wind + e * 1.3) * back;           // la garra se cierra al tirar
              bYaw += side * (0.3 - e * 0.6) * back;
            } else if (this.swingType === 'kspin') {
              // giro completo de la hoja alrededor del dedo en la anilla, y tajo al terminar la vuelta
              const spin = M.smoothstep(0.0, 0.55, k) * Math.PI * 2;
              const e = M.smoothstep(0.45, 0.75, k), back = 1 - M.smoothstep(0.8, 1, k);
              bPitch -= spin;
              yawR += (0.15 - e * 0.55) * back; bx += (0.02 - e * 0.08) * back; bz -= Math.sin(k * Math.PI) * 0.05;
              roll += (0.2 - e * 0.6) * back; by += Math.sin(Math.min(1, k * 1.8) * Math.PI) * 0.03;
            } else if (this.swingType === 'dstab') {
              // daga: pinchazo corto y seco, alternando un poco de lado
              const back = k < 0.2 ? Math.sin((k / 0.2) * Math.PI * 0.5) : 1 - M.smoothstep(0.2, 0.32, k);
              const thrust = k >= 0.2 ? Math.sin(Math.min(1, (k - 0.2) / 0.3) * Math.PI * 0.5) * (1 - M.smoothstep(0.6, 1, k)) : 0;
              bz += back * 0.04 - thrust * 0.14; bx += side * 0.02 * thrust; by += thrust * 0.02;
              yawR -= side * thrust * 0.12; bRoll += side * 0.4 * thrust;
            } else if (this.swingType === 'drev') {
              // daga: la gira en la mano (agarre invertido) y da un revés de derecha a izquierda
              const flip = M.smoothstep(0, 0.22, k) * (1 - M.smoothstep(0.82, 1, k));
              const e = M.smoothstep(0.25, 0.7, k), back = 1 - M.smoothstep(0.75, 1, k), arc = Math.sin(Math.min(1, k * 1.1) * Math.PI);
              bPitch += Math.PI * flip;
              yawR += (-0.35 + e * 0.8) * back; bx += (-0.05 + e * 0.12) * back; bz -= arc * 0.05;
              roll += (-0.4 + e * 0.8) * back; bYaw += (-0.4 + e * 0.8) * back;
            } else if (this.swingType === 'mchop' || this.swingType === 'kdown') {
              // machete / katana: lo alza por encima del hombro y lo descarga en diagonal (la katana, recto)
              const kat = this.swingType === 'kdown';
              const up = k < 0.42 ? Math.sin((k / 0.42) * Math.PI * 0.5) : 1 - M.smoothstep(0.42, 0.55, k);
              const down = k >= 0.42 ? Math.sin(Math.min(1, (k - 0.42) / 0.25) * Math.PI * 0.5) * (1 - M.smoothstep(0.78, 1, k)) : 0;
              const diag = kat ? 0 : 1;
              pitch += up * 0.95 - down * 1.35; by += up * 0.09 - down * 0.11; bz += up * 0.03 - down * 0.08;
              yawR += diag * (up * 0.25 - down * 0.45); roll += diag * (up * 0.45 - down * 0.7) + (kat ? up * 0.1 : 0);
              bPitch += up * 0.9 - down * 1.1; bx += diag * (up * 0.03 - down * 0.06) - (kat ? up * 0.05 : 0);
            } else if (this.swingType === 'mwide' || this.swingType === 'kiai') {
              // barrido ancho (machete) / desenvaine (katana): sale desde el costado y cruza toda la pantalla
              const kat = this.swingType === 'kiai', A = kat ? 1.6 : 1.35;
              const wind = k < 0.28 ? Math.sin((k / 0.28) * Math.PI * 0.5) : 1;
              const e = M.smoothstep(0.24, 0.62, k), back = 1 - M.smoothstep(0.72, 1, k), arc = Math.sin(Math.min(1, k * 1.1) * Math.PI);
              yawR += side * (0.38 * wind - e * 0.95) * A * back; bx += side * (0.06 * wind - e * 0.16) * back;
              bz -= arc * 0.07; by += (kat ? -0.04 * wind + e * 0.05 : arc * 0.02) * back;
              roll += side * (0.4 * wind - e * 0.9) * back; pitch -= arc * (kat ? 0.05 : 0.12);
              bYaw += side * (0.5 - e * 1.05) * back;
            } else if (this.swingType === 'blunge') {
              // bayoneta: se recoge y embiste con todo el brazo, muy lejos
              const back = k < 0.3 ? Math.sin((k / 0.3) * Math.PI * 0.5) : 1 - M.smoothstep(0.3, 0.42, k);
              const thrust = k >= 0.3 ? Math.sin(Math.min(1, (k - 0.3) / 0.25) * Math.PI * 0.5) * (1 - M.smoothstep(0.68, 1, k)) : 0;
              bz += back * 0.07 - thrust * 0.26; bx -= thrust * 0.05; by += thrust * 0.03 - back * 0.02;
              pitch += back * 0.15 - thrust * 0.08; yawR -= thrust * 0.15; roll -= thrust * 0.2;
            } else if (this.swingType === 'bflip') {
              // mariposa: las cachas se abren girando dos veces y remata con un tajo
              const spin = M.smoothstep(0, 0.55, k) * Math.PI * 4;
              const e = M.smoothstep(0.55, 0.85, k), back = 1 - M.smoothstep(0.85, 1, k);
              bRoll += spin; by += Math.sin(Math.min(1, k * 1.8) * Math.PI) * 0.02;
              yawR += side * (0.2 - e * 0.6) * back; bx += side * (0.03 - e * 0.09) * back; roll += side * (0.3 - e * 0.6) * back;
              bYaw += side * (0.3 - e * 0.7) * back;
            } else if (this.swingType === 'stab') {
              // estocada: el puño se recoge y sale recto hacia delante, con giro de muñeca
              const back = k < 0.3 ? Math.sin((k / 0.3) * Math.PI * 0.5) : 1 - M.smoothstep(0.3, 0.45, k);
              const thrust = k >= 0.3 ? Math.sin(Math.min(1, (k - 0.3) / 0.35) * Math.PI * 0.5) * (1 - M.smoothstep(0.7, 1, k)) : 0;
              bz += back * 0.05 - thrust * 0.16; bx -= thrust * 0.035; by += thrust * 0.025 - back * 0.01;
              pitch += back * 0.1 - thrust * 0.04; yawR -= thrust * 0.1;
              bRoll += -0.5 * thrust;
            } else {
              // tajo y revés: el brazo entero barre la pantalla; el puño y la hoja van juntos
              const wind = k < 0.25 ? Math.sin((k / 0.25) * Math.PI * 0.5) : 1;
              const e = M.smoothstep(0.2, 0.7, k);
              const arc = Math.sin(Math.min(1, k * 1.15) * Math.PI);
              const back = 1 - M.smoothstep(0.75, 1, k);
              yawR += side * (0.22 * wind - e * 0.62) * back;
              bx += side * (0.035 * wind - e * 0.1) * back; bz -= arc * 0.05; by += arc * 0.025;
              roll += side * (0.3 * wind - e * 0.65) * back; pitch -= arc * 0.08;
              bYaw += side * (0.35 - e * 0.75) * back;
            }
          }
        }
        // inspección: el arma se acerca al centro, gira para enseñar un lado y luego el otro
        if (this.inspectT > 0) {
          const T = 2.6, k = 1 - this.inspectT / T;
          const inn = M.smoothstep(0, 0.15, k) * (1 - M.smoothstep(0.85, 1, k));
          const turn = M.smoothstep(0.1, 0.3, k) - M.smoothstep(0.45, 0.65, k) * 2 + M.smoothstep(0.7, 0.88, k);   // 0 → 1 → -1 → 0
          if (d.melee) {
            // el cuchillo da una voltereta en la mano
            const fm = id === 'knife' || id === 'katana' ? this.bladeForm(id) : '';
            const flip = fm === 'karambit' || fm === 'katana' ? 0 : M.smoothstep(0.42, 0.62, k) * Math.PI * 2 * (fm === 'mariposa' ? 3 : 1);
            if (fm === 'katana') { bYaw += Math.sin(k * Math.PI * 2) * 0.6 * inn; bPitch -= M.smoothstep(0.3, 0.5, k) * (1 - M.smoothstep(0.6, 0.8, k)) * 0.8; }
            if (VX.Profile.knifeForm() === 'karambit' && id === 'knife') bPitch -= (M.smoothstep(0.35, 0.5, k) + M.smoothstep(0.55, 0.7, k)) * Math.PI * 2;
            yawR = M.lerp(yawR, 0.5 * turn, inn); pitch = M.lerp(pitch, 0.15, inn);
            bYaw = M.lerp(bYaw, 0.9 * turn, inn); bRoll = M.lerp(bRoll, 0.3, inn) + flip;
          } else {
            yawR = M.lerp(yawR, 1.15 * turn, inn); roll = M.lerp(roll, -0.35 + Math.sin(k * 9) * 0.04, inn); pitch = M.lerp(pitch, 0.3, inn);
          }
          bx = M.lerp(bx, vm.x * 0.35, inn); by = M.lerp(by, vm.y + 0.02, inn); bz = M.lerp(bz, vm.z - 0.04, inn);
        }
        if (this.switchT > 0) { const s = this.switchT / 0.28; by -= s * 0.25; pitch -= s * 0.8; }
        if (this.scopeK > 0) { const k = M.smoothstep(0, 0.6, this.scopeK); bx = M.lerp(bx, 0, k); by = M.lerp(by, -0.08, k); bz = M.lerp(bz, -0.2, k); yawR = M.lerp(yawR, 0, k); pitch = M.lerp(pitch, 0, k); roll = M.lerp(roll, 0, k); }
        q = M.qMul(M.qMul(M.qY(yawR), M.qX(pitch)), M.qZ(roll));
      }
      const bladeQ = (!pose && d.melee) ? M.qMul(M.qMul(M.qY(bYaw), M.qX(bPitch)), M.qZ(bRoll)) : null;
      const qb = bladeQ ? M.qMul(q, bladeQ) : q;
      const kar = id === 'knife' && !pose && VX.Profile.knifeForm() === 'karambit';
      const PIV = kar ? (this.swingType === 'kspin' && this.swingT > 0 ? [0, -2, 13] : [0, 0, 6]) : [0, 1, 3];
      const slideBack = A ? A.slideZ : pose ? 0 : this.slide * 4;
      const pumpBack = A ? A.pumpZ : pose ? 0 : this.slide * 6;
      const parts = A ? A.parts : null, lp = [0, 0, 0];
      const lvV = pose || d.melee ? 1 : this.lvlOf(id);
      for (const v of model) {
        let vq = q, insts = null;
        if (v.part) {
          const pp = parts && parts[v.part];
          if (v.part.startsWith('rl_') && !pp) continue;
          if (pp && pp.hide) continue;
        }
        if (bladeQ) {
          // la hoja y el mango giran alrededor del puño
          M.qRot(bladeQ, (v.x - PIV[0]) * g, (v.y - PIV[1]) * g, (v.z - PIV[2]) * g, tmp);
          M.qRot(q, tmp[0] + PIV[0] * g, tmp[1] + PIV[1] * g, tmp[2] + PIV[2] * g, tmp);
          vq = qb;
        } else {
          lp[0] = v.x; lp[1] = v.y; lp[2] = v.z + (v.slide ? slideBack : v.pump ? pumpBack : 0);
          if (v.side === 'L') lp[2] += (this.kickL || 0) * 3; else if (d.dual) lp[2] += (this.kickR || 0) * 3;
          const pp = v.part && parts ? parts[v.part] : null;
          let pq = null;
          if (pp) {
            if (pp.fn) pp.fn(v, lp);
            if (pp.pre) { M.qRot(pp.pre.q, lp[0] - pp.pre.px, lp[1] - pp.pre.py, lp[2] - pp.pre.pz, tmp); lp[0] = tmp[0] + pp.pre.px; lp[1] = tmp[1] + pp.pre.py; lp[2] = tmp[2] + pp.pre.pz; pq = pp.pre.q; }
            if (pp.q) { M.qRot(pp.q, lp[0] - pp.px, lp[1] - pp.py, lp[2] - pp.pz, tmp); lp[0] = tmp[0] + pp.px; lp[1] = tmp[1] + pp.py; lp[2] = tmp[2] + pp.pz; pq = pq ? M.qMul(pp.q, pq) : pp.q; }
            lp[0] += pp.ox || 0; lp[1] += pp.oy || 0; lp[2] += pp.oz || 0;
            if (pq) vq = M.qMul(q, pq);
            insts = pp.inst || null;
          }
          if (insts) {
            for (const o of insts) {
              M.qRot(q, (lp[0] + o[0]) * g, (lp[1] + o[1]) * g, (lp[2] + o[2]) * g, tmp);
              batch.rbox(bx + tmp[0], by + tmp[1], bz + tmp[2], g, g, g, vq, v.r, v.g, v.b, v.e);
            }
            continue;
          }
          M.qRot(q, lp[0] * g, lp[1] * g, lp[2] * g, tmp);
        }
        let r = v.r, gg = v.g, b = v.b, e = v.e;
        if (v.an && model.ult) { VX.Weapons.ultColor(v, model.ult, game.time, ucol); r = ucol[0]; gg = ucol[1]; b = ucol[2]; e = Math.max(e, ucol[3]); }
        if (v.tag === 'accent' && this.accent && !pose && VX.Profile.skinFor(id) === 'default') { r = this.accent[0]; gg = this.accent[1]; b = this.accent[2]; e = Math.max(e, 0.5); }
        // (0.57) nivel del arma: II con bandas de acero pulido, III con bandas y detalles dorados
        if (lvV > 1 && !v.an && (((v.tag === 'main' || v.tag === 'dark') && (Math.round(v.z) % 6 + 6) % 6 === 0) || (lvV === 3 && v.tag === 'accent'))) {
          if (lvV === 2) { r = r * 0.4 + 0.42; gg = gg * 0.4 + 0.46; b = b * 0.4 + 0.54; e = Math.max(e, 0.06); }
          else { r = 1; gg = 0.76; b = 0.28; e = Math.max(e, 0.32); }
        }
        batch.rbox(bx + tmp[0], by + tmp[1], bz + tmp[2], g, g, g, vq, r, gg, b, e);
      }
      if (A && this.casings.length) VX.GunAnim.drawCasings(this, batch, q, g, bx, by, bz, tmp);
      // dónde queda la boca del cañón en pantalla (para el fogonazo, que se dibuja en el mundo)
      if (!pose && !d.melee && !idOverride && d.muzzle) { const mz = d.muzzle; M.qRot(q, mz[0] * g, mz[1] * g, (mz[2] - 1) * g, tmp); this.vmTip = [bx + tmp[0], by + tmp[1], bz + tmp[2]]; }
      if (this.flash > 0.05 && !d.melee && !pose) {
        const mz = d.muzzle;
        M.qRot(q, mz[0] * g, mz[1] * g, (mz[2] - 3) * g, tmp);
        const f = this.flash, big = d.pellets > 1 || d.grenade ? 1.6 : 1;
        for (let i = 0; i < 7; i++) {
          const s = (0.02 + Math.random() * 0.03) * f * big;
          batch.rbox(bx + tmp[0] + M.rand(-0.018, 0.018) * f, by + tmp[1] + M.rand(-0.018, 0.018) * f, bz + tmp[2] - M.rand(0, 0.05),
            s, s, s, M.qZ(Math.random() * 3), 1, 0.75 + Math.random() * 0.2, 0.35, 1);
        }
      }
    }

    // Fogonazo ligero: destello cálido y suave que dura un suspiro, y una voluta de humo tenue que
    // sale hacia delante, sube y se deshace
    // la boca del cañón (como se ve en pantalla) en coordenadas del mundo, para una cámara dada
    tipWorld(cam) {
      const vt = this.vmTip;
      if (!vt) return null;
      const R = VX.Renderer, k = Math.tan((R.fov || 1.3) * (R.zoom || 1) / 2) / Math.tan(29 * Math.PI / 180);
      const vx = vt[0] * k, vy = vt[1] * k, vz = vt[2];
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
      return [cam.x - cy * vx + -sy * sp * vy - sy * cp * vz, cam.y + cp * vy - sp * vz, cam.z + sy * vx + -cy * sp * vy - cy * cp * vz];
    }
    renderMuzzle(cam) {
      const R = VX.Renderer, FI = R.fire, SM = R.smoke;
      if (!FI || !this.puffs.length) return;
      const tip = cam ? this.tipWorld(cam) : null;   // el destello va pegado al arma (que sube con el retroceso)
      for (const p of this.puffs) {
        const t = p.t, B = p.big;
        if (t < 0.06) {
          const k = 1 - t / 0.06, X = tip ? tip[0] : p.x, Y = tip ? tip[1] : p.y, Z = tip ? tip[2] : p.z;
          FI.add(X, Y, Z, 0.26 * B * (0.7 + k * 0.3), 0.55 * k, 0.36 * k, 0.14 * k, 0.4, p.seed, p.seed);
          FI.add(X + p.dx * 0.05, Y + p.dy * 0.05, Z + p.dz * 0.05, 0.11 * B, 0.7 * k, 0.58 * k, 0.36 * k, 0.55, p.seed * 2, p.seed + 1);
        }
        const k = t / 0.7, go = 1 - Math.pow(1 - Math.min(1, t / 0.35), 2);
        SM.add(p.x + p.dx * 0.25 * go, p.y + p.dy * 0.25 * go + t * 0.35, p.z + p.dz * 0.25 * go, (0.07 + k * 0.3) * B, 0.55, 0.53, 0.5, 0.2 * (1 - k) * Math.min(1, t / 0.05), p.seed + t * 0.8, p.seed);
      }
    }

    // Guardado / carga
    serialize() { return { mods: { ...this.mods }, slots: this.slots.map((s) => s.id), accent: this.accent, att: JSON.parse(JSON.stringify(this.att)), throws: { ...this.throws } }; }
    load(data) {
      this.reset();
      if (!data) return;
      if (data.mods) Object.assign(this.mods, data.mods);
      if (data.slots) this.slots = data.slots.filter((id) => VX.Weapons.DEFS[id]).map((id) => this.mk(id));
      if (!this.slots.some((s) => !VX.Weapons.DEFS[s.id].melee)) this.slots.unshift(this.mk('pistol'));
      if (!this.has('knife')) this.slots.push(this.mk('knife'));
      if (data.accent) this.accent = data.accent;
      if (data.att) this.att = data.att;
      if (data.throws) this.throws = { ...this.throws, ...data.throws };
      this.cur = 0;
    }
  }

  VX.Weapon = Weapon;
})();
