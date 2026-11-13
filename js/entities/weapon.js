// Gestor de armas del jugador: hasta 2 armas de fuego + el cuchillo.
// Disparo hitscan, granadas, ataques cuerpo a cuerpo, cambio de arma,
// modelos en primera persona con skins y trazadoras.
(function () {
  const M = VX.M;
  const tmp = [0, 0, 0];

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
      this.switchT = 0;
      this.swingT = 0; this.swingSide = 1; this.pendingHit = -1;
      this.tracers = [];
      this.grenades = [];
      this.explosions = [];
      this.queued = false;
      this.accent = null;
    }

    mk(id) { return { id, ammo: this.magFor(id), reserve: this.reserveStart(id) }; }
    // --- munición limitada (modo Horda): cada arma lleva su reserva ---
    reserveMax(id) {
      const d = VX.Weapons.DEFS[id];
      if (d.melee) return 0;
      const mags = { pistol: 8, smg: 6, shotgun: 6, rifle: 6, grenade: 4 }[id] || 6;
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
    // fracción total de munición (para que los enemigos suelten más cuando vas justo)
    ammoFrac() {
      let a = 0, m = 0;
      for (const s of this.slots) { if (VX.Weapons.DEFS[s.id].melee) continue; a += s.ammo + (s.reserve || 0); m += this.magFor(s.id) + this.reserveMax(s.id); }
      return m ? a / m : 1;
    }
    magFor(id) { const d = VX.Weapons.DEFS[id]; return d.melee ? 0 : Math.round(d.mag * (this.mods ? this.mods.mag : 1)); }

    get slot() { return this.slots[this.cur]; }
    get def() { return VX.Weapons.DEFS[this.slot.id]; }
    get id() { return this.slot.id; }

    stats(id = this.slot.id) {
      const d = VX.Weapons.DEFS[id], m = this.mods;
      if (d.melee) return { melee: true, damage: d.damage * Math.sqrt(m.damage), fireRate: d.fireRate, reach: d.reach, destruction: 1 };
      return {
        damage: d.damage * m.damage, fireRate: d.fireRate * m.rate, range: d.range * m.range,
        mag: Math.round(d.mag * m.mag), reload: d.reload * m.reload, spread: d.spread * m.spread,
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
        if (!this.noAmmoT || performance.now() - this.noAmmoT > 1500) { this.noAmmoT = performance.now(); VX.game && VX.game.hud.toast('¡Sin munición! Busca cajas o usa el cuchillo [V]'); }
        return;
      }
      this.reloading = true;
      this.reloadT = st.reload;
      VX.Audio.reload();
    }

    // Retroceso real: cada disparo sube la mira (y la desvía un poco a un lado).
    // Al mantener el gatillo se acumula «calor» y el arma sube cada vez más;
    // al soltar, la mira vuelve sola en parte. Las mejoras de retroceso lo reducen.
    applyRecoil(P, d) {
      const R = d.recoilPat || { up: d.recoil * 0.35, side: d.recoil * 0.12 };
      const m = this.mods.recoil || 1;
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
      this.slide = Math.max(0, this.slide - dt * 9);
      this.flash = Math.max(0, this.flash - dt * 16);
      this.switchT = Math.max(0, this.switchT - dt);
      this.swingT = Math.max(0, this.swingT - dt);
      this.inspectT = Math.max(0, (this.inspectT || 0) - dt);
      // mirilla del rifle: mantener el clic derecho
      this.scoped = this.slot.id === 'rifle' && I.rightDown && !this.reloading && this.switchT <= 0 && game.state === 'playing';
      this.scopeK = M.lerp(this.scopeK || 0, this.scoped ? 1 : 0, Math.min(1, dt * (this.scoped ? 9 : 14)));
      if (this.scopeK < 0.002) this.scopeK = 0;
      // cooperativo: en el suelo o muerto no se dispara
      if (VX.Coop.down || VX.Coop.deadWait) { this.updateGrenades(dt, game); this.tracers = this.tracers.filter((t) => (t.life -= dt) > 0); return; }
      if (this.scoped) this.inspectT = 0;
      // [F] inspeccionar el arma (se cancela al disparar, recargar o cambiar)
      const KS = VX.Settings, kInspect = KS.key('inspect'), kKnife = KS.key('knife');
      if (I.wasPressed(kInspect) && this.switchT <= 0 && !this.reloading && this.swingT <= 0) {
        this.inspectT = this.inspectT > 0 ? 0 : 2.6;
        if (this.inspectT) VX.Audio.reload();
      }
      if (I.mouseClicked || I.wasPressed('KeyR') || I.wheel || I.wasPressed('KeyQ') || I.wasPressed(kKnife) ||
          I.wasPressed('Digit1') || I.wasPressed('Digit2') || I.wasPressed('Digit3')) this.inspectT = 0;
      for (const t of this.tracers) t.life -= dt;
      this.tracers = this.tracers.filter((t) => t.life > 0);
      for (const e of this.explosions) e.t -= dt;
      this.explosions = this.explosions.filter((e) => e.t > 0);
      this.updateGrenades(dt, game);

      // cambio de arma
      if (I.wasPressed('Digit1')) this.select(0);
      if (I.wasPressed('Digit2')) this.select(1);
      if (I.wasPressed('Digit3')) this.select(2);
      if (I.wasPressed('KeyQ')) this.select(this.prev);
      if (I.wheel) this.select((this.cur + (I.wheel > 0 ? 1 : this.slots.length - 1)) % this.slots.length);
      if (I.wasPressed(kKnife)) {
        const k = this.slots.findIndex((s) => s.id === 'knife');
        if (this.cur !== k) { this.select(k); this.switchT = 0.08; }
        this.queued = true;
      }

      const st = this.stats();
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
      if (I.wasPressed('KeyR')) this.startReload();

      if (this.pendingHit >= 0) {
        this.pendingHit -= dt;
        if (this.pendingHit < 0) this.meleeHit(game);
      }

      if (I.mouseClicked) this.queued = true;
      if (this.switchT > 0 || game.player.hp <= 0) return;
      const want = st.melee ? (this.queued || I.mouseDown) : (st.auto ? I.mouseDown : this.queued);
      if (want && this.cooldown <= 0 && !this.reloading) {
        this.queued = false;
        if (st.melee) this.swing(game);
        else if (this.slot.ammo <= 0) { VX.Audio.empty(); this.startReload(); this.cooldown = 0.25; }
        else this.fire(game, st);
      }
      if (!I.mouseDown && this.cooldown < -0.15) this.queued = false;
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
      if (VX.Profile.knifeForm && VX.Profile.knifeForm() === 'karambit') {
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
      for (const list of [game.enemies, game.corpses]) for (const e of list) {
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
      if (hits) { game.hud.hitmarker(kills > 0); game.stats.hits++; }
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
      } else if (hits) { VX.Audio.slam(); game.shake(0.25); }
      if (hits) VX.Audio.flesh && VX.Audio.flesh();
      P.knock(-sy * 0.8, -cy * 0.8);
    }

    meleeHit(game) {
      if (this.def.heavy) return this.heavyHit(game);
      const P = game.player, st = this.stats();
      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch), sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      let best = null, bestE = null, bestDir = null;
      // varios rayos en abanico para que sea fácil acertar
      for (const a of [0, -0.25, 0.25, -0.5, 0.5]) {
        const yaw = P.yaw + a * 0.6, pitch = P.pitch - (a === 0 ? 0 : 0.05);
        const dx = Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
        for (const list of [game.enemies, game.corpses]) for (const e of list) {
          if (e.dead || (e.spawnT && e.spawnT > 0.5)) continue;
          const h = e.body.rayHit(ox, oy, oz, dx, dy, dz, st.reach);
          if (h && (!best || h.t < best.t)) { best = h; bestE = e; bestDir = [dx, dy, dz]; }
        }
        if (best) break;
      }
      if (best) {
        const ray = { ox, oy, oz, dx: bestDir[0], dy: bestDir[1], dz: bestDir[2] };
        // eje del tajo: horizontal con algo de diagonal, alternando
        // eje del corte según el tipo de golpe (vertical en el golpe de arriba, corto en la estocada)
        let ax = -cy, ay = this.swingSide > 0 ? 0.6 : -0.6, az = sy;
        if (this.swingType === 'overhead') { ax *= 0.15; ay = 1; az *= 0.15; }
        const al = Math.hypot(ax, ay, az);
        const mult = this.swingType === 'stab' ? 1.5 : this.swingType === 'kspin' ? 1.45 : this.swingType === 'overhead' ? 1.3 : 1;
        game.dmgSource = 'knife'; game.dmgWeapon = 'knife';
        const killed = bestE.hit(best, st.damage * mult, ray, game, { slash: [ax / al, ay / al, az / al] });
        game.dmgSource = null;
        if (!bestE.isCorpse) { game.hud.hitmarker(killed); game.stats.hits++; }
        game.shake(0.12);
        VX.Audio.slash();
        P.knock(Math.sin(P.yaw) * 1.5, Math.cos(P.yaw) * 1.5);
        return;
      }
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
      this.slot.ammo--;
      this.cooldown = 1 / st.fireRate;
      this.kick = 1; this.slide = 1; this.flash = 1;
      P.recoilPitch += d.recoil + st.damage * 0.0002;
      game.stats.shots++;
      game.roomShots = (game.roomShots || 0) + 1;
      VX.Audio.shoot(d.sound, d.sfx);
      game.shake(d.shake || 0.1);

      const cp = Math.cos(P.pitch), sp = Math.sin(P.pitch);
      const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const fwd = [sy * cp, sp, cy * cp], right = [-cy, 0, sy], up = [-sy * sp, cp, -cy * sp];
      const ox = P.eyeX(), oy = P.eyeY(), oz = P.eyeZ();
      const vm = d.vm, mz = d.muzzle;
      this.muzzle = this.viewToWorld(P, vm.x + mz[0] * vm.g, vm.y + mz[1] * vm.g, vm.z + mz[2] * vm.g);
      const [mx, my, mzz] = this.muzzle;

      const coopDirs = VX.Coop.active ? [] : null;
      if (d.grenade) {
        const sp0 = 17;
        this.grenades.push({
          x: mx, y: my, z: mzz, vx: fwd[0] * sp0 + P.vx * 0.5, vy: fwd[1] * sp0 + 2.5, vz: fwd[2] * sp0 + P.vz * 0.5,
          life: 4, rot: 0, dmg: st.damage, blast: d.blast * Math.sqrt(st.destruction), destr: st.destruction,
        });
        if (coopDirs) VX.Coop.shareGrenade(this.grenades[this.grenades.length - 1]);
      } else {
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
          if (coopDirs) coopDirs.push([dx, dy, dz]);
        }
        if (coopDirs) VX.Coop.shareShot(game, ox, oy, oz, coopDirs, this.slot.id, st.damage, st.destruction, mx, my, mzz);
      }
      this.applyRecoil(P, d);
      const shell = d.pellets > 1;
      game.particles.spawn(mx - fwd[0] * 0.3, my, mzz - fwd[2] * 0.3, -right[0] * 2.5 + M.rand(-0.5, 0.5), 2.5, -right[2] * 2.5 + M.rand(-0.5, 0.5),
        shell ? 0.8 : 0.85, shell ? 0.15 : 0.65, shell ? 0.1 : 0.25, shell ? 0.035 : 0.025, 1.5, 0.2);
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
        for (const list of [game.enemies, game.corpses]) {
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
        if (!bestE.isCorpse) { game.hud.hitmarker(killed); game.stats.hits++; }
        ignore.add(bestE);
        if (pierce > 0) { pierce--; dmg *= 0.75; continue; }
        endT = best.t + 0.4; stoppedByEnemy = true;
        break;
      }

      if (!stoppedByEnemy && ph) {
        ph.prop.hit(ph, dmg * st.destruction, ray, game);
        stoppedByEnemy = true; endT = ph.t;
      }
      if (!stoppedByEnemy && wHit) {
        const hx = wHit.x + dx * 0.02, hy = wHit.y + dy * 0.02, hz = wHit.z + dz * 0.02;
        const radius = 0.16 + 0.14 * st.destruction + st.damage / 300;
        const n = game.world.damageSphere(hx, hy, hz, radius, Math.min(140, st.damage * 1.4) * st.destruction, game);
        game.particles.sparks(wHit.x, wHit.y, wHit.z, wHit.nx, wHit.ny, wHit.nz, 4);
        if (!n && game.addBulletHole) game.addBulletHole(wHit);   // el agujero se queda en la pared
        if (this.mods.napalm && this.mods.fire && Math.random() < 0.3 && wHit.y < game.world.groundAt(wHit.x, wHit.z) + 0.6) game.addFire(wHit.x, wHit.z, 0.5, 3);
        const col = VX.Blocks.color(wHit.block, wHit.gx, wHit.gy, wHit.gz, [0, 0, 0, 0]);
        for (let i = 0; i < 4; i++)
          game.particles.spawn(wHit.x, wHit.y, wHit.z, wHit.nx * 2 + M.rand(-1.5, 1.5), wHit.ny * 2 + M.rand(0, 2.5), wHit.nz * 2 + M.rand(-1.5, 1.5),
            col[0], col[1], col[2], M.rand(0.025, 0.06), M.rand(0.6, 1.4), 0);
        if (!n) VX.Audio.wall();
        // mejora "Rebote": la bala busca otro enemigo desde la pared
        if (bounce < (st.ricochet || 0)) {
          const sx = wHit.x - dx * 0.08, sy = wHit.y - dy * 0.08, sz = wHit.z - dz * 0.08;
          let best = null, bd = 14;
          for (const e of game.enemies) {
            if (e.dead || e.spawnT > 0.5) continue;
            const d = Math.hypot(e.body.cx - sx, e.body.cy - sy, e.body.cz - sz);
            if (d < bd && game.world.lineOfSight(sx, sy, sz, e.body.cx, e.body.cy, e.body.cz)) { bd = d; best = e; }
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
      this.tracers.push({ x0: mx, y0: my, z0: mz, x1: ex, y1: ey, z1: ez, life: 0.06 });
    }

    // ---------------- Granadas ----------------
    updateGrenades(dt, game) {
      for (const g of this.grenades) {
        g.vy -= 14 * dt;
        g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
        g.rot += dt * 10; g.life -= dt;
        if (Math.random() < 0.6) game.particles.spawn(g.x, g.y, g.z, 0, 0.4, 0, 0.35, 0.33, 0.32, 0.05, 0.6, 0, 1);
        let hit = g.life <= 0 || game.world.isSolidAt(g.x, g.y, g.z) || g.y < 0.05;
        if (!hit) for (const e of game.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.body.cx - g.x, e.body.cy - g.y, e.body.cz - g.z) < (e.isBoss ? 1.3 : 0.7)) { hit = true; break; }
        }
        if (hit) {
          g.dead = true;
          // granada de un compañero: sólo rompe paredes y se ve (el daño a los zombis lo cuenta su dueño)
          if (g.remote) { game.visualOnly = true; try { game.explode({ x: g.x, y: g.y, z: g.z, R: g.blast, dmg: g.dmg, destr: g.destr, selfK: 0, weapon: 'launcher' }); } finally { game.visualOnly = false; } }
          else this.explode(game, g);
        }
      }
      this.grenades = this.grenades.filter((g) => !g.dead);
    }

    explode(game, g) {
      game.explode({ x: g.x, y: g.y, z: g.z, R: g.blast, dmg: g.dmg, destr: g.destr, weapon: 'launcher' });
    }

    // ---------------- Render ----------------
    renderTracers(batch) {
      for (const t of this.tracers) {
        const dx = t.x1 - t.x0, dy = t.y1 - t.y0, dz = t.z1 - t.z0;
        const len = Math.hypot(dx, dy, dz);
        if (len < 0.01) continue;
        const q = M.qFromDir(dx / len, dy / len, dz / len);
        const w = 0.012 * (t.life / 0.06);
        batch.rbox((t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2, (t.z0 + t.z1) / 2, w, w, len, q, 1, 0.85, 0.5, 1);
      }
      for (const g of this.grenades) {
        const q = M.qAxis(0.6, 0.3, 0.74, g.rot);
        batch.rbox(g.x, g.y, g.z, 0.09, 0.09, 0.13, q, 0.3, 0.36, 0.22, 0);
        batch.rbox(g.x, g.y + 0.05, g.z, 0.03, 0.03, 0.03, q, 1, 0.2, 0.1, 1);
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
      const model = VX.Weapons.coloredModel(id, skinOverride || VX.Profile.skinFor(id), id === 'knife' ? (pose && pose.form) || VX.Profile.knifeForm() : id === 'pistol' ? (pose && pose.form) || d.form || null : null);
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
        if (this.reloading) {
          const k = 1 - this.reloadT / this.reloadTime;
          const s = Math.sin(k * Math.PI);
          pitch -= s * 0.55; roll = s * 0.7; by -= s * 0.07;
        }
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
            const flip = VX.Profile.knifeForm() === 'karambit' && id === 'knife' ? 0 : M.smoothstep(0.42, 0.62, k) * Math.PI * 2;
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
      const slideBack = pose ? 0 : this.slide * 4 * g;
      const pumpBack = pose ? 0 : this.slide * 6 * g;
      for (const v of model) {
        if (pose && pose.noHand && (v.tag === 'hand' || v.tag === 'wrist' || v.tag === 'sleeve')) continue;
        const zOff = v.slide ? slideBack : v.pump ? pumpBack : 0;
        const isHand = v.tag === 'sleeve' || (d.heavy && (v.tag === 'hand' || v.tag === 'wrist'));
        let vq = q;
        if (bladeQ && !isHand) {
          // la hoja y el mango giran alrededor del puño
          M.qRot(bladeQ, (v.x - PIV[0]) * g, (v.y - PIV[1]) * g, (v.z - PIV[2]) * g, tmp);
          M.qRot(q, tmp[0] + PIV[0] * g, tmp[1] + PIV[1] * g, tmp[2] + PIV[2] * g, tmp);
          vq = qb;
        } else M.qRot(q, v.x * g, v.y * g, v.z * g + zOff, tmp);
        let r = v.r, gg = v.g, b = v.b, e = v.e;
        if (v.tag === 'accent' && this.accent && !pose && VX.Profile.skinFor(id) === 'default') { r = this.accent[0]; gg = this.accent[1]; b = this.accent[2]; e = Math.max(e, 0.5); }
        batch.rbox(bx + tmp[0], by + tmp[1], bz + tmp[2], g, g, g, vq, r, gg, b, e);
      }
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

    // Guardado / carga
    serialize() { return { mods: { ...this.mods }, slots: this.slots.map((s) => s.id), accent: this.accent }; }
    load(data) {
      this.reset();
      if (!data) return;
      if (data.mods) Object.assign(this.mods, data.mods);
      if (data.slots) this.slots = data.slots.filter((id) => VX.Weapons.DEFS[id]).map((id) => this.mk(id));
      if (!this.slots.some((s) => !VX.Weapons.DEFS[s.id].melee)) this.slots.unshift(this.mk('pistol'));
      if (!this.has('knife')) this.slots.push(this.mk('knife'));
      if (data.accent) this.accent = data.accent;
      this.cur = 0;
    }
  }

  VX.Weapon = Weapon;
})();
