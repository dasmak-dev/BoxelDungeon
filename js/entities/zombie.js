// Zombis: enemigos muy destructibles.
// - Pierna rota/cortada  -> caen al suelo (animación) y se arrastran.
// - Sin brazos           -> atacan a mordiscos.
// - Cabeza destrozada    -> mueren al instante. También mueren al quedarse sin vida.
// - Torso partido        -> la mitad de arriba cae y el resto se deshace.
// Variantes: caminante, corredor, bruto, escupidor, explosivo, escudero, trepador y perro.
(function () {
  const M = VX.M;
  const dirTmp = [0, 0];

  const TYPES = {
    walker: { name: 'Zombi', hp: 70, speed: 1.6, dmg: 10, gold: [2, 4], reach: 1.0, lean: 0.08 },
    runner: { name: 'Corredor', hp: 45, speed: 3.4, dmg: 8, gold: [2, 3], reach: 0.95, lean: 0.3, dodge: true },
    brute: { name: 'Bruto', hp: 190, speed: 1.2, dmg: 22, gold: [5, 8], reach: 1.3, lean: 0.12, heavy: true },
    spitter: { name: 'Escupidor', hp: 85, speed: 1.3, dmg: 12, gold: [3, 5], reach: 1.0, lean: 0.05, ranged: true },
    exploder: { name: 'Explosivo', hp: 55, speed: 1.8, dmg: 0, gold: [3, 5], reach: 1.7, lean: 0.0, explode: true },
    shielder: { name: 'Escudero', hp: 110, speed: 1.35, dmg: 14, gold: [4, 6], reach: 1.1, lean: 0.05, shield: true },
    climber: { name: 'Trepador', hp: 50, speed: 2.6, dmg: 9, gold: [3, 4], reach: 1.0, lean: 0.35, climb: true, dodge: true },
    dog: { name: 'Perro zombi', hp: 40, speed: 5.0, dmg: 9, gold: [2, 3], reach: 1.15, lean: 0, quad: true, dodge: true },
    // de bioma
    archer: { name: 'Esqueleto arquero', hp: 45, speed: 1.7, dmg: 12, gold: [3, 5], reach: 1.0, lean: 0.05, ranged: true, arrow: true },
    necro: { name: 'Nigromante', hp: 95, speed: 1.35, dmg: 10, gold: [6, 10], reach: 1.0, lean: 0.1, ranged: true, necro: true },
    skeleton: { name: 'Esqueleto', hp: 55, speed: 2.1, dmg: 11, gold: [2, 4], reach: 1.05, lean: 0.05, reassemble: true },
    ember: { name: 'Ígneo', hp: 85, speed: 1.6, dmg: 13, gold: [3, 5], reach: 1.05, lean: 0.1, fireImmune: true, trail: true },
    miner: { name: 'Minero', hp: 100, speed: 1.5, dmg: 16, gold: [3, 5], reach: 1.3, lean: 0.12, tool: true, lamp: true },
    sporeling: { name: 'Esporado', hp: 60, speed: 1.9, dmg: 9, gold: [2, 4], reach: 1.0, lean: 0.2, sporeBurst: true },
    mimic: { name: 'Mímico', hp: 260, speed: 3.6, dmg: 20, gold: [12, 18], reach: 1.2, lean: 0, quad: true, mimic: true },
    rat: { name: 'Rata gigante', hp: 16, speed: 4.4, dmg: 5, gold: [1, 1], reach: 0.75, lean: 0, quad: true },
    // nuevos
    bloater: { name: 'Gordo hinchado', hp: 230, speed: 1.0, dmg: 15, gold: [5, 8], reach: 1.25, lean: 0.04, heavy: true, bloat: true },
    riot: { name: 'Antidisturbios', hp: 150, speed: 1.45, dmg: 16, gold: [5, 8], reach: 1.1, lean: 0.04, riot: true },
    screamer: { name: 'Chillón', hp: 60, speed: 1.9, dmg: 6, gold: [4, 7], reach: 1.0, lean: 0.15, scream: true },
    crow: { name: 'Cuervo', hp: 12, speed: 4.1, dmg: 5, gold: [1, 1], reach: 0.8, lean: 0, quad: true, fly: true },
    // sólo muere si le rompes el corazón del pecho; lo demás se le vuelve a unir
    knight: { name: 'Caballero negro', hp: 70, speed: 1.45, dmg: 22, gold: [10, 15], reach: 1.5, lean: 0.03, knight: true, fireImmune: true },
    // muere como cualquiera, pero deja sus restos: si no los destrozas, vuelve más fuerte
    revenant: { name: 'Renacido', hp: 80, speed: 2.0, dmg: 13, gold: [0, 0], reach: 1.15, lean: 0.18, revenant: true },
    revpile: { name: 'Restos del renacido', hp: 40, speed: 0, dmg: 0, gold: [0, 0], reach: 0, lean: 0, pile: true },
    // hidra: todo lo que le rompes le vuelve a crecer y de cada trozo arrancado brota otra; sólo muere por la cabeza
    hydra: { name: 'Hidra', hp: 150, speed: 1.45, dmg: 14, gold: [8, 12], reach: 1.7, lean: 0.06, hydra: true },
    hydrabud: { name: 'Brote de hidra', hp: 28, speed: 0, dmg: 0, gold: [0, 0], reach: 0, lean: 0, pile: true, grows: 'hydra' },
  };

  const FALL_TIME = 0.6;
  let UID = 0;

  // Comportamiento de cada tipo:
  // ring = participa en el cerco por turnos · accel/turn = agilidad · mass = cuánto empuja a los demás
  const BEH = {
    walker: { ring: true, accel: 5, turn: 5, mass: 1 },
    runner: { ring: true, accel: 9, turn: 7, mass: 0.8, ringAdd: 0.8, eager: 1, dodge: true, faceClose: 6 },
    brute: { ring: false, accel: 3, turn: 2.6, mass: 3 },
    spitter: { ring: false, accel: 5, turn: 6, mass: 1, keep: [5.5, 10] },
    archer: { ring: false, accel: 6, turn: 8, mass: 0.8, keep: [8, 13], faceClose: 15 },
    necro: { ring: false, accel: 4, turn: 5, mass: 1, keep: [8, 14] },
    exploder: { ring: false, accel: 6, turn: 6, mass: 1 },
    shielder: { ring: true, accel: 4, turn: 5, mass: 1.8, ringAdd: -0.5, eager: 1.5, faceClose: 7, faceLos: true, turnMax: 2.6 },
    climber: { ring: true, accel: 9, turn: 9, mass: 0.8, ringAdd: 0.5, behind: true, climb: true, dodge: true },
    dog: { ring: false, accel: 11, turn: 10, mass: 0.7, dodge: true },
    skeleton: { ring: true, accel: 7, turn: 7, mass: 0.8 },
    ember: { ring: true, accel: 4, turn: 5, mass: 1.3 },
    rat: { ring: false, accel: 14, turn: 14, mass: 0.3 },
    mimic: { ring: false, accel: 9, turn: 8, mass: 2.5 },
    miner: { ring: true, accel: 4, turn: 5, mass: 1.5, ringAdd: -0.3 },
    sporeling: { ring: true, accel: 8, turn: 8, mass: 0.8, ringAdd: 0.8, eager: 1 },
    bloater: { ring: true, accel: 3, turn: 3, mass: 3.2, ringAdd: -0.4 },
    riot: { ring: true, accel: 4, turn: 5, mass: 2, ringAdd: -0.3, faceClose: 7, faceLos: true, turnMax: 2.4 },
    screamer: { ring: false, accel: 6, turn: 7, mass: 0.8, keep: [9, 15] },
    crow: { ring: false, accel: 5, turn: 7, mass: 0.25 },
    knight: { ring: true, accel: 3.5, turn: 4, mass: 3, ringAdd: -0.4, faceClose: 6, faceLos: true, turnMax: 2.2, eager: 1.5 },
    revenant: { ring: true, accel: 8, turn: 7, mass: 1, ringAdd: 0.4, eager: 1.2 },
    revpile: { ring: false, accel: 0, turn: 0, mass: 50 },
    hydra: { ring: true, accel: 5, turn: 5, mass: 1.1, eager: 1.2 },
    hydrabud: { ring: false, accel: 0, turn: 0, mass: 50 },
  };

  // Paleta de la hidra según dónde aparece: carne viva (Cripta, Minas, Jardín, Coliseo, Base militar)
  // o morada (Cloacas, Forja, Vacío, Ciudad, Barco)
  function hydraPal(x, z) {
    const g = VX.game;
    if (g && g.mode === 'horde') {
      const m = VX.HordeMode && VX.HordeMode.map;
      const id = m && (m.id || m);
      return id === 'coliseo' || id === 'base' ? 'carne' : 'morado';
    }
    let zone = 0;
    if (g && g.world) { const r = g.world.rooms.find((q) => q.contains(x, z)) || g.currentRoom; zone = r ? r.zone || 0 : 0; }
    return [0, 2, 4].includes(zone) ? 'carne' : 'morado';
  }

  // partes que cuentan como «cabeza» de la hidra (la flor, sus babas y, en la bicéfala, la segunda flor)
  const game_time = () => (VX.game ? VX.game.time : 0);
  const HEADS = (p) => /^head2?$/.test(p.name) || (p.parent && /^head2?$/.test(p.parent)) || /^head2?drool/.test(p.name);

  class Zombie {
    constructor(kind, x, z, floor, opts = {}) {
      const T = TYPES[kind];
      this.kind = kind;
      this.T = T;
      this.isBoss = false;
      this.elite = !!opts.elite || !!opts.champion;
      this.champion = !!opts.champion;
      const cfg = VX.Models.zombieConfigs[kind];
      const hpal = T.hydra || T.grows ? hydraPal(x, z) : null;   // la hidra (y sus brotes) cambian de color según el bioma
      let model = T.knight ? VX.Models.knight(cfg) : T.hydra ? VX.Models.hydra({ ...cfg, hstyle: VX.HYDRA_STYLE || (opts.twin ? 'n4ab2' : 'n4ab'), hpal: VX.HYDRA_PAL || hpal }) : T.pile ? VX.Models.pile(T.grows ? { ...cfg, flesh: 'hydra-' + hpal } : cfg) : T.fly ? VX.Models.crow(cfg) : T.quad ? VX.Models.quadruped(cfg) : VX.Models.humanoid(cfg);
      if (T.shield) model = VX.Models.addShield(model, cfg);
      if (cfg.tool) model = VX.Models.addTool(model, cfg);
      // el arquero lleva además una espada corta envainada para cuando lo acorralan
      if (kind === 'archer') model = VX.Models.addTool(model, cfg, { tool: 'sword', name: 'blade', arm: 'armL' });
      if (this.elite) {
        for (const p of model.parts) for (const v of p.vox) {
          if (p.armor) continue;
          if (v.e > 0) { v.r = 1; v.g = 0.12; v.b = 0.08; v.e = 1; }
          else { v.r = v.r * 0.75 + 0.12; v.g *= 0.72; v.b *= 0.75; }
        }
      }
      this.body = new VX.VoxelBody(model, this.champion ? 1.4 : this.elite ? 1.08 : 1);
      if (this.body.byName.blade) this.body.byName.blade.hidden = true;
      if (this.champion) {
        // campeón: dorado y brillante
        for (const p of model.parts) for (const v of p.vox) if (v.e > 0) { v.r = 1; v.g = 0.8; v.b = 0.2; v.e = 1; }
      }
      this.x = x; this.z = z;
      this.y = opts.y || 0; this.vy = 0; this.embedN = 0;
      this.body.x = x; this.body.z = z; this.body.y = this.y;
      // ---- dificultad según el piso ----
      const f = floor;
      const eliteK = this.elite ? 1.7 : 1;
      const greed = VX.game && VX.game.weapon && VX.game.weapon.mods.greed ? 1.25 : 1;
      this.maxHp = this.hp = T.hp * (1 + f * 0.15) * eliteK * greed * (this.champion ? 3.5 : 1);
      if (this.champion) this.name = 'Campeón: ' + T.name;
      this.baseSpeed = Math.min(T.speed * (1 + f * 0.03), T.speed * 1.7) * M.rand(0.9, 1.1) * (this.elite ? 1.2 : 1);
      this.dmg = Math.round(T.dmg * (1 + f * 0.08) * (this.elite ? 1.3 : 1) * (this.champion ? 1.25 : 1));
      this.cdBase = Math.max(0.55, 1.15 - f * 0.025);
      this.gold = this.elite ? [T.gold[0] * 2, T.gold[1] * 2] : T.gold;
      this.reach = T.reach;
      this.radius = T.quad ? 0.3 : this.body.height * 0.16;
      this.attackCd = M.rand(0.5, 1);
      this.windup = 0;
      this.walkT = M.rand(0, 6);
      this.dead = false;
      this.crawling = false;
      this.crawlC = 0;
      this.fallT = 0;
      this.biter = !!T.quad;
      this.limp = false;
      this.armsLost = 0;
      this.spawnT = 1.1;
      this.groanT = M.rand(2, 8);
      this.stuckT = 0; this.sideT = 0; this.sideDir = 1;
      this.kx = 0; this.kz = 0;
      this.fl = { x: 0, z: 0, vx: 0, vz: 0 };
      this.tilt = M.rand(-0.25, 0.25);
      this.gait = M.rand(0.85, 1.15);
      this.spitCd = M.rand(1.5, 3);
      this.flank = M.rand(-1, 1);       // por dónde intenta rodear al jugador
      this.dodgeCd = M.rand(0.5, 2);
      this.burn = 0;
      this.fuse = 0;
      this.climbing = 0;
      this.B = BEH[kind];
      this.uid = ++UID;
      this.vx = 0; this.vz = 0; this.aspd = 0;
      this.state = 'chase'; this.stateT = M.rand(0.5, 2);
      this.pathT = 0; this.pdir = [0, 0]; this.direct = false;
      this.token = false; this.waitT = 0;
      this.leapCd = M.rand(1, 3); this.chargeCd = M.rand(1.5, 4);
      this.sideDir = M.chance(0.5) ? 1 : -1;
      this.body.yaw = opts.yaw ?? Math.PI;
      // el cuervo llega volando desde arriba
      if (T.fly) {
        this.spawnT = 0; this.flyH = M.rand(2.0, 3.0); this.state = 'circle'; this.attackCd = M.rand(1, 3);
        this.body.hitPad = 0.05;   // un poco de margen al apuntar: es pequeño y no para quieto
        // entra volando desde arriba, pero siempre por debajo del techo de la sala (nunca dentro de la roca)
        const W = VX.game && VX.game.world;
        this.y += M.rand(5, 8);
        if (W) this.y = Math.min(this.y, Zombie.ceilAt(W, this.x, this.z, this.y0 = opts.y || 0) - 0.7);
      }
      if (T.scream) { this.screamCd = M.rand(2, 4); this.screams = 0; this.screamT = 0; }
      if (T.knight) { this.swordOut = true; this.regenQ = []; this.coreHp = this.hp; for (const p of this.body.parts) for (const v of p.vox) v.orig = v.alive; if (this.body.byName.torso) this.body.byName.torso.noBreak = true; }
      if (T.hydra && !opts.gen && VX.game && VX.game.hud && !VX.game.hydraWarned) {   // la primera vez, que se sepa qué es
        VX.game.hydraWarned = true;
        VX.game.hud.banner('¡UNA HIDRA!', 'Revienta la flor (dentro de la boca abierta, x4). El fuego cauteriza sus heridas', 3.5);
      }
      if (T.hydra) { this.sap = 0; this.woundQ = []; this.mouthOpen = 0; this.biteCd = M.rand(2, 4); this.hspitCd = M.rand(3, 6); this.eatCd = 2; this.twin = !!opts.twin; this.mother = !!opts.mother;
        if (opts.mother) { this.maxHp = this.hp = this.hp * 1.8; this.dmg = Math.round(this.dmg * 1.3); for (const p of this.body.parts) for (const v of p.vox) if (v.e > 0.5) { v.r = Math.min(1, v.r * 1.2); } }
        this.regenQ = []; this.gen = opts.gen || 0; for (const p of this.body.parts) for (const v of p.vox) v.orig = v.alive; if (this.gen) this.spawnT = 0.3; }   // orig: lo que vuelve a crecer   // orig: lo que hay que reconstruir; el torso no se parte (lleva el corazón)
      if (T.pile) { this.spawnT = 0; this.gen = opts.gen || 1; this.pileT = 8; this.pileMax = 8; this.maxHp = this.hp = 65 + this.gen * 22; this.body.hitPad = 0.05; }
      if (T.grows) { this.pileT = this.pileMax = 3.5; this.maxHp = this.hp = 28; this.body.hitPad = 0.06; }   // brote de hidra: poco tiempo para romperlo   // vida fija (no crece con el nivel) y algo de margen al apuntar
      // un renacido que vuelve: más grande, más rápido, más duro y con los ojos en llamas
      if (T.revenant && opts.gen) {
        this.gen = opts.gen;
        const k = this.gen;
        this.maxHp = this.hp = this.hp * (1 + 0.5 * k); this.baseSpeed *= 1 + 0.12 * k; this.dmg = Math.round(this.dmg * (1 + 0.25 * k));
        this.body.scale *= 1 + 0.08 * k; this.body.height *= 1 + 0.08 * k; this.body.v *= 1 + 0.08 * k;
        for (const p of this.body.parts) for (const v of p.vox) if (v.e > 0) { v.r = 1; v.g = 0.35 - Math.min(0.3, k * 0.1); v.b = 0.1; v.e = 1; }
        this.spawnT = 0.9;
      }
    }

    get speed() {
      let s = this.baseSpeed;
      if (this.crawling) {
        s *= (this.body.broken('legL') && this.body.broken('legR')) ? 0.32 : 0.42;
        if (this.armsLost >= 2) s *= 0.6;
        s *= 0.35 + 0.65 * Math.max(0, Math.sin(this.walkT));
      } else if (this.limp) s *= 0.5;
      else if (this.biter && !this.T.quad) s *= 1.12;
      if (this.fuse > 0) s *= 0.75;
      if (this.chillT > 0) s *= 0.5;          // balas de hielo
      if (this.suppressT > 0) s *= 0.7;       // fuego de supresión
      if (this.stunT > 0) s *= 0.15;          // descarga eléctrica
      return s;
    }

    get attackReach() {
      if (this.crawling) return 1.0;
      if (this.swordOut) return 1.45;
      return this.biter && !this.T.quad ? 0.85 : this.reach;
    }

    followGround(dt, world) {
      if (this.T.fly) { this.body.y = this.y; return; }
      if (this.climbing > 0 || this.state === 'leap') { this.body.y = this.y; return; }
      // desatasco: si el cuerpo ha quedado metido en algo sólido (al bajar de un coche,
      // un trozo de pared que le cae encima…), sale al hueco libre más cercano
      this.embedT = (this.embedT || 0) - dt;
      if (this.embedT <= 0 && !this.isBoss) {
        this.embedT = 0.25;
        const r = Math.min(this.radius, 0.22), h = this.crawling ? 0.45 : (this.T.quad ? 0.75 : 1.4), yb = this.y + 0.06;
        if (world.boxCollides(this.x - r, yb, this.z - r, this.x + r, yb + h, this.z + r)) {
          if (++this.embedN >= 2) { this.unstick(world, r, h); this.embedN = 0; }
        } else this.embedN = 0;
      }
      const g = world.groundAt(this.x, this.z);
      if (this.y > g + 0.02) { this.vy -= 18 * dt; this.y = Math.max(g, this.y + this.vy * dt); if (this.y === g) this.vy = 0; }
      else { this.y = M.lerp(this.y, g, Math.min(1, dt * 22)); this.vy = 0; }
      this.body.y = this.y;
    }

    update(dt, game) {
      this.game = game;
      const b = this.body, P = game.player;
      b.flash = Math.max(0, b.flash - dt * 6);
      const fl = this.fl;
      fl.vx += (-60 * fl.x - 9 * fl.vx) * dt; fl.vz += (-60 * fl.z - 9 * fl.vz) * dt;
      fl.x += fl.vx * dt; fl.z += fl.vz * dt;
      this.followGround(dt, game.world);
      this.climbing = Math.max(0, this.climbing - dt);

      // ardiendo
      if (this.T.fireImmune) this.burn = 0;
      // el ígneo deja un rastro de brasas
      if (this.T.trail && this.spawnT <= 0) { this.trailT = (this.trailT || 0) - dt; if (this.trailT <= 0) { this.trailT = 0.9; game.addFire(this.x, this.z, 0.45, 2.2); } }
      // aura del campeón
      if (this.champion && Math.random() < 0.5) game.particles.spawn(this.x + M.rand(-0.5, 0.5), this.y + M.rand(0.2, this.body.height), this.z + M.rand(-0.5, 0.5), 0, M.rand(0.3, 0.9), 0, 1, 0.8, 0.25, 0.025, 0.7, 1, 1);
      // el agua frena y apaga el fuego
      this.wet = game.waterAt ? game.waterAt(this.x, this.z) : false;
      if (this.wet) this.burn = 0;
      if (this.burn > 0) {
        this.burn -= dt;
        this.hp -= (game.weapon.mods.blueFlame ? 26 : 16) * dt;   // llama azul: quema más deprisa
        // inmolación: prende a los que tiene al lado
        if (game.weapon.mods.immolate && Math.random() < dt * 2.5) for (const o of game.enemies) if (o !== this && !o.dead && !(o.burn > 0) && !(o.T && o.T.fireImmune) && Math.hypot(o.x - this.x, o.z - this.z) < 1.6) { o.burn = 3; break; }
        if (Math.random() < 0.15) game.particles.spawn(this.x + M.rand(-0.25, 0.25), this.y + M.rand(0.8, 1.8), this.z + M.rand(-0.25, 0.25), M.rand(-0.3, 0.3), M.rand(1.5, 2.5), M.rand(-0.3, 0.3), 1, M.rand(0.5, 0.8), 0.15, 0.018, M.rand(0.4, 0.8), 1, 1);
        if (this.hp <= 0 && this.spawnT <= 0) { this.die([0, 1, 0], game); return; }
      }

      if (this.T.knight || this.T.hydra) this.knightRegen(dt, game);
      if (this.T.hydra) { this.mouthOpen = Math.max(0, this.mouthOpen - dt); this.twinGrowT = Math.max(0, (this.twinGrowT || 0) - dt); this.updateWounds(dt, game); }
      // hielo, veneno y descarga (munición especial)
      if (this.chillT > 0) { this.chillT -= dt; b.flash = Math.max(b.flash, 0.12); if (Math.random() < 0.12) game.particles.spawn(this.x + M.rand(-0.3, 0.3), this.y + M.rand(0.3, 1.6), this.z + M.rand(-0.3, 0.3), 0, M.rand(-0.3, 0.2), 0, 0.75, 0.93, 1, 0.022, 0.6, 0.7, 1); }
      if (this.stunT > 0) this.stunT -= dt;
      if (this.suppressT > 0) this.suppressT -= dt;
      if (this.markT > 0) { this.markT -= dt; if (Math.random() < 0.25) game.particles.spawn(this.x + M.rand(-0.2, 0.2), this.y + this.body.height + 0.15, this.z + M.rand(-0.2, 0.2), 0, 0.3, 0, 1, 0.2, 0.2, 0.03, 0.35, 1, 1); }
      // filo sangrante: pierde vida mientras sangra
      if (this.bleedT > 0) {
        this.bleedT -= dt;
        if (!game.visualOnly && !VX.Coop.isClient) this.hp -= (this.bleedDps || 6) * dt;
        if (Math.random() < 0.3) game.particles.blood(this.x, this.y + M.rand(0.5, 1.4), this.z, 0, -0.5, 0, 1);
        if (this.hp <= 0 && this.spawnT <= 0) { this.die([0, 1, 0], game); return; }
      }
      if (this.poisonT > 0) {
        this.poisonT -= dt;
        if (!game.visualOnly && !(VX.Coop.isClient)) this.hp -= (this.poisonDps || 8) * dt;
        if (Math.random() < 0.2) game.particles.spawn(this.x + M.rand(-0.3, 0.3), this.y + M.rand(0.4, 1.7), this.z + M.rand(-0.3, 0.3), 0, M.rand(0.3, 0.8), 0, 0.45, 1, 0.3, 0.025, 0.7, 0.8, 1);
        // con «Plaga» se contagia a los de al lado
        if (game.weapon.mods.plague && Math.random() < dt * 1.5) for (const o of game.enemies) if (o !== this && !o.dead && !(o.poisonT > 0) && Math.hypot(o.x - this.x, o.z - this.z) < 2) { o.poisonT = 3; o.poisonDps = this.poisonDps; break; }
        if (this.hp <= 0 && this.spawnT <= 0) { this.die([0, 1, 0], game); return; }
      }
      if (this.T.pile) { this.updatePile(dt, game); return; }
      if (this.spawnT > 0) {
        this.spawnT -= dt;
        b.yOff = -b.height * Math.max(0, this.spawnT) / 1.1;
        if (Math.random() < 0.5) game.particles.spawn(this.x + M.rand(-0.4, 0.4), this.y + 0.05, this.z + M.rand(-0.4, 0.4), M.rand(-1, 1), M.rand(1, 3), M.rand(-1, 1), 0.25, 0.22, 0.24, 0.06, 1);
        this.animate(dt, 0);
        b.computeWorld();
        return;
      }

      if (this.fallT > 0) {
        this.fallT -= dt;
        const k = 1 - Math.max(0, this.fallT) / FALL_TIME;
        this.crawlC = k * k;
        if (this.fallT <= 0) this.land(game);
        this.animate(dt, 0);
        b.x = this.x; b.z = this.z;
        b.computeWorld();
        return;
      }

      if (this.T.fly) { this.updateFly(dt, game); return; }
      const dx = P.x - this.x, dz = P.z - this.z;
      const dist = Math.hypot(dx, dz);

      // ---- chillón: grita para llamar a más zombis y aturdirte ----
      if (this.T.scream && !this.crawling) {
        this.screamCd -= dt;
        if (this.screamT > 0) { this.screamT -= dt; if (this.screamT <= 0) this.scream(game); }
        else if (this.los && dist < 16 && this.screamCd <= 0 && this.screams < 3 && this.windup <= 0) {
          this.screamT = 1.1; VX.Audio.screamWind && VX.Audio.screamWind();
        }
      }

      // ---- explosivo: mecha ----
      if (this.T.explode) {
        if (this.fuse <= 0 && dist < 2 && Math.abs(P.y - this.y) < 1.5) { this.fuse = 0.5; VX.Audio.fuse(); }   // mecha corta: casi no da tiempo a huir
        if (this.fuse > 0) {
          this.fuse -= dt;
          b.flash = (Math.sin(this.fuse * 40) > 0) ? 1 : 0.2;
          if (this.fuse <= 0) { this.detonate(game); return; }
        }
      }

      // --- Movimiento e IA ---
      const B = this.B;
      this.losT = (this.losT || 0) - dt;
      if (this.losT <= 0) {
        this.losT = 0.25 + Math.random() * 0.1;
        this.los = game.world.lineOfSight(this.x, this.y + 0.3, this.z, P.x, P.y + 0.3, P.z) &&
          game.world.lineOfSight(this.x, this.y + 0.9, this.z, P.x, P.y + 0.9, P.z);
      }
      this.pathT -= dt;
      this.stateT = Math.max(0, this.stateT - dt);
      this.leapCd -= dt; this.chargeCd -= dt;
      const toX = dx / (dist || 1), toZ = dz / (dist || 1);

      if (this.state === 'leap') { this.updateLeap(dt, game, dist); return; }

      let gx = 0, gz = 0, want = 0, spdOverride = 0;
      const stopDist = Math.max(this.attackReach * 0.7, this.radius + 0.45);
      const busy = this.windup > 0;

      if (this.crawling) {
        const p = this.pathTo(game, dist, toX, toZ);
        gx = p[0]; gz = p[1]; want = dist > stopDist ? 1 : 0;
      } else if (this.state === 'retreat') {
        // se aleja un momento tras atacar (golpea y huye)
        gx = -toX + -toZ * this.sideDir * 0.6; gz = -toZ + toX * this.sideDir * 0.6;
        want = 1.1;
        if (this.stateT <= 0) this.state = 'chase';
      } else if (this.state === 'chargeWind') {
        want = 0;
        if (Math.random() < 0.4) game.particles.spawn(this.x + M.rand(-0.4, 0.4), this.y + 0.05, this.z + M.rand(-0.4, 0.4), M.rand(-1, 1), M.rand(0.5, 2), M.rand(-1, 1), 0.3, 0.27, 0.25, 0.06, 0.6);
        if (this.stateT <= 0) { this.state = 'charge'; this.stateT = this.T.hydra ? 0.45 : 1.25; this.chargeHit = false; VX.Audio.dash(); if (this.T.hydra) this.mouthOpen = 0.6; }
      } else if (this.state === 'charge') {
        gx = this.chargeX; gz = this.chargeZ; want = 1; spdOverride = this.T.hydra ? 8.5 : 7 + Math.min(3, game.floor * 0.1);
        if (!this.chargeHit && dist < 1.25 && Math.abs(P.y - this.y) < 1.2) {
          this.chargeHit = true;
          P.damage(this.dmg * (this.T.hydra ? 1.5 : 1.3), this.x, this.z, game);
          if (this.T.hydra) { P.grabT = 1.1; game.hud.toast('¡Te ha atrapado!'); }   // mordisco: te sujeta y te frena
          else P.knock(this.chargeX * 9, this.chargeZ * 9, 4);
          VX.Audio.punch(); game.shake(0.6);
        }
        if (this.stateT <= 0) { this.state = 'chase'; this.chargeCd = M.rand(4.5, 7.5); }
      } else if (this.state === 'stun') {
        want = 0;
        if (this.stateT <= 0) { this.state = 'chase'; this.chargeCd = M.rand(3.5, 6); }
      } else if (!busy) {
        switch (this.kind) {
          case 'brute': {
            const p = this.pathTo(game, dist, toX, toZ);
            gx = p[0]; gz = p[1]; want = dist > stopDist ? 1 : 0;
            if (this.los && this.direct && dist > 3.5 && dist < 10 && this.chargeCd <= 0) {
              this.state = 'chargeWind'; this.stateT = 0.8; this.chargeX = toX; this.chargeZ = toZ;
              VX.Audio.roar(); game.shake(0.15);
            }
            break;
          }
          case 'screamer':
          case 'spitter': {
            const [lo, hi] = B.keep;
            if (!this.los || dist > hi) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = 1; }
            else {
              if (this.stateT <= 0) { this.stateT = M.rand(1.8, 3.4); this.sideDir = -this.sideDir; }
              const tx = -toZ * this.sideDir, tz = toX * this.sideDir;
              if (dist < lo) { gx = -toX + tx * 0.5; gz = -toZ + tz * 0.5; want = 0.95; }
              else { gx = tx + toX * (dist - (lo + hi) / 2) * 0.15; gz = tz + toZ * (dist - (lo + hi) / 2) * 0.15; want = 0.45; }
            }
            break;
          }
          case 'archer': {
            // guarda las distancias y dispara; si te le echas encima, desenvaina la espada y pelea
            const [lo, hi] = B.keep;
            if (!this.swordOut && dist < 2.8 && this.los) this.setSword(game, true);
            else if (this.swordOut && dist > 6) this.setSword(game, false);
            if (this.swordOut) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = dist > 1.1 ? 1.05 : 0; }
            else if (!this.los || dist > hi) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = 1; }
            else {
              if (this.stateT <= 0) { this.stateT = M.rand(1.6, 3); this.sideDir = -this.sideDir; }
              const tx = -toZ * this.sideDir, tz = toX * this.sideDir;
              if (dist < lo) { gx = -toX * 1.4 + tx * 0.35; gz = -toZ * 1.4 + tz * 0.35; want = 1.1; }   // retrocede de espaldas, mirándote
              else { gx = tx + toX * (dist - (lo + hi) / 2) * 0.15; gz = tz + toZ * (dist - (lo + hi) / 2) * 0.15; want = 0.35; }
            }
            break;
          }
          case 'hydra': {
            const r = this.hydraBrain(dt, game, dist, toX, toZ);
            if (r) { gx = r.gx; gz = r.gz; want = r.want; break; }
            if (this.state === 'chargeWind') { want = 0; break; }
            this.approachRing(game, dist, toX, toZ, stopDist);
            gx = this.gx; gz = this.gz; want = this.want;
            break;
          }
          case 'exploder': {
            const p = this.pathTo(game, dist, toX, toZ);
            gx = p[0]; gz = p[1]; want = dist < 5 ? 1.7 : 1;   // esprinta al final
            break;
          }
          case 'dog': {
            // ronda en círculos y se lanza a por ti
            const R = 3.4;
            if (!this.los || dist > R + 2.5) { const p = this.pathTo(game, dist, toX, toZ); gx = p[0]; gz = p[1]; want = 1; }
            else {
              const tx = -toZ * this.sideDir, tz = toX * this.sideDir;
              const rad = M.clamp((dist - R) * 0.8, -1, 1);
              gx = tx + toX * rad; gz = tz + toZ * rad; want = 0.85;
              if (this.stateT <= 0) { this.stateT = M.rand(1.5, 3); if (Math.random() < 0.4) this.sideDir = -this.sideDir; }
            }
            if (this.los && dist > 1.6 && dist < 4.3 && this.leapCd <= 0 && Math.abs(P.y - this.y) < 1) this.startLeap(game, toX, toZ, 8, 3.4);
            break;
          }
          default: {
            // caminante, corredor, escudero y trepador: cerco por turnos
            this.approachRing(game, dist, toX, toZ, stopDist);
            gx = this.gx; gz = this.gz; want = this.want;
            if (this.kind === 'runner' && dist > 2) {
              want *= 1.12;
              // zigzag suave: curvas amplias y lentas (no tirones), que se van cerrando al acercarse
              // y desaparecen en el último tramo para que la embestida final sea recta
              if (!this.weaveF) { this.weaveF = M.rand(1.9, 2.5); this.weaveP = M.rand(0, 6.28); }
              const fade = M.clamp((dist - 3.5) / 6, 0, 1);
              const w = Math.sin(game.time * this.weaveF + this.weaveP) * 0.62 * fade;
              gx += -toZ * w; gz += toX * w;
              this.weaveLean = w;
            } else this.weaveLean = 0;
            if (this.kind === 'walker' && want > 0.2) {
              const z = Math.sin(this.walkT * 0.45 + this.uid) * 0.3;   // arrastra los pies, se tambalea
              gx += -gz * z; gz += gx * z;
            }
            if (this.kind === 'climber' && this.token && this.los && dist > 2 && dist < 5.2 && this.leapCd <= 0 && Math.abs(P.y - this.y) < 1.6)
              this.startLeap(game, toX, toZ, 6.5, 5);
          }
        }
      }

      // en la Horda, si te subes a un coche o a un muro bajo, no se quedan mirando: empujan y trepan
      if (game.mode === 'horde' && !this.T.quad && !this.isBoss && P.y - this.y > 0.9 && dist < 2.6) { gx = toX; gz = toZ; want = 1; }

      // esquivar cuando el jugador le apunta
      if (B.dodge && !this.crawling && this.state === 'chase' && dist > 6 && dist < 16) {
        this.dodgeCd -= dt;
        const cp = Math.cos(P.pitch), fx = Math.sin(P.yaw) * cp, fz = Math.cos(P.yaw) * cp;
        const aim = (-dx * fx - dz * fz) / (dist || 1);
        if (aim > 0.985 && this.dodgeCd <= 0) {
          this.dodgeCd = M.rand(2.8, 4.5);
          this.sideT = 0.35; this.sideDir = M.chance(0.5) ? 1 : -1; this.dodging = 0.35;
        }
      }
      this.dodging = Math.max(0, (this.dodging || 0) - dt);
      if (this.sideT > 0) {
        this.sideT -= dt;
        if (this.dodging > 0) { const sx = -toZ * this.sideDir, sz = toX * this.sideDir; gx = gx * 0.3 + sx; gz = gz * 0.3 + sz; }
        else {
          // desvío para desatascarse: de lado respecto a donde quería ir
          const l = Math.hypot(gx, gz) || 1, ux = gx / l, uz = gz / l;
          gx = ux * 0.35 - uz * this.sideDir; gz = uz * 0.35 + ux * this.sideDir;
        }
        want = Math.max(want, 0.8);
      }

      this.intent = want;
      // --- dirección final: separación y esquivar a los compañeros ---
      let gl = Math.hypot(gx, gz);
      if (gl > 1e-4) { gx /= gl; gz /= gl; }
      let ax = 0, az = 0, slow = 1;
      if (this.state !== 'charge') for (const o of game.enemies) {
        if (o === this || o.dead || o.spawnT > 0) continue;
        const ox = this.x - o.x, oz = this.z - o.z;
        const d = Math.hypot(ox, oz);
        if (d > 1.6 || d < 1e-4 || Math.abs(o.y - this.y) > 1.2) continue;
        const min = this.radius + o.radius;
        // separación suave
        const k = Math.max(0, 1 - (d - min) / (1.6 - min));
        ax += (ox / d) * k * k * 0.9; az += (oz / d) * k * k * 0.9;
        // alguien delante en mi camino: lo rodeo por un lado y freno un poco (hacen cola, no se empujan)
        if (want > 0.1) {
          const ahead = -(ox * gx + oz * gz) / d;
          if (ahead > 0.55 && d < min + 0.7) {
            const side = (gx * -oz + gz * ox) > 0 ? 1 : -1;
            ax += -gz * side * 0.9; az += gx * side * 0.9;
            slow = Math.min(slow, M.clamp(0.45 + 0.55 * (d - min) / 0.7, 0.3, 1));
          }
        }
      }
      gx = gx * want + ax; gz = gz * want + az;
      gl = Math.hypot(gx, gz);
      const mag = Math.min(gl, Math.max(want, 0.6));
      let spd = (spdOverride || this.speed) * mag * slow * (this.wet ? 0.6 : 1);
      if (this.dodging > 0) spd = this.baseSpeed * 2.2;
      if (busy && !this.T.quad) spd *= 0.15;
      const dvx = gl > 1e-4 ? (gx / gl) * spd : 0, dvz = gl > 1e-4 ? (gz / gl) * spd : 0;
      const acc = Math.min(1, (this.state === 'charge' ? 8 : B.accel) * dt);
      this.vx += (dvx - this.vx) * acc; this.vz += (dvz - this.vz) * acc;
      const vx = this.vx + this.kx, vz = this.vz + this.kz;
      this.kx *= Math.pow(0.02, dt); this.kz *= Math.pow(0.02, dt);

      const ox0 = this.x, oz0 = this.z;
      const okx = this.tryMove(vx * dt, 0, game.world);
      if (!okx) this.vx *= 0.3;
      const okz = this.tryMove(0, vz * dt, game.world);
      if (!okz) this.vz *= 0.3;
      // trepador: si un obstáculo le corta el paso, trepa por él
      // en la Horda cualquiera trepa a un coche o a una marquesina si te subes encima
      const climbs = B.climb || (game.mode === 'horde' && !this.T.quad && !this.isBoss && game.player.y - this.y > 0.9 && Math.hypot(game.player.x - this.x, game.player.z - this.z) < 5);
      if (climbs && spd > 0 && (!okx || !okz) && this.blockedH && this.blockedH - this.y < 3.2) {
        this.climbing = 0.15;
        this.y += 2.4 * dt;
        this.vy = 0;
        this.body.y = this.y;
        this.tryMove(vx * dt * 0.5, vz * dt * 0.5, game.world);
      }
      const moved = Math.hypot(this.x - ox0, this.z - oz0);
      this.aspd = M.lerp(this.aspd || 0, moved / Math.max(dt, 1e-4), Math.min(1, dt * 10));
      // la embestida acaba contra la pared: aturdido
      if (this.state === 'charge' && (!okx || !okz) && this.stateT < 1.1) {
        this.state = 'stun'; this.stateT = 1.3;
        game.world.damageSphere(this.x + this.chargeX * 0.7, this.y + 1, this.z + this.chargeZ * 0.7, 0.9, 160, game);
        VX.Audio.slam(); game.shake(0.35);
      }
      // atascado: recalcula camino y prueba un desvío lateral
      if (spd > 0.4 && moved < spd * dt * 0.2 && this.climbing <= 0 && this.state === 'chase') {
        this.stuckT += dt;
        if (this.stuckT > 0.45) {
          this.pathT = 0; this.direct = false;
          this.stuckN = (this.stuckN || 0) + 1;
          if (this.stuckN % 2 === 0) this.sideDir = -this.sideDir;   // si no funcionó, prueba el otro lado
          this.sideT = M.rand(0.35, 0.7);
          this.stuckT = 0;
        }
      } else { this.stuckT = Math.max(0, this.stuckT - dt * 2); if (moved > spd * dt * 0.6) this.stuckN = 0; }

      // --- choque: si se te echa encima a la carrera, también hace daño ---
      this.contactCd = Math.max(0, (this.contactCd || 0) - dt);
      if (this.contactCd <= 0 && !this.isBoss && !this.crawling && this.spawnT <= 0 && Math.abs(P.y - this.y) < 1.2) {
        const cd = Math.hypot(P.x - this.x, P.z - this.z);
        const closing = cd > 1e-3 ? (this.vx * (P.x - this.x) + this.vz * (P.z - this.z)) / cd : 0;
        const fast = closing > 2.2 && this.state === 'chase';
        if (fast && cd < this.radius + 0.45) {
          this.contactCd = 1.1;
          const dmg = Math.max(2, Math.round(this.dmg * 0.35));
          P.damage(dmg, this.x, this.z, game);
          P.knock && P.knock((P.x - this.x) / (cd || 1) * 2.2, (P.z - this.z) / (cd || 1) * 2.2);
          game.shake(0.12);
        }
      }

      // --- orientación: mira a donde camina; de cerca, al jugador ---
      let targetYaw = Math.atan2(dx, dz);
      const vl = Math.hypot(this.vx, this.vz);
      // faceLos: sólo te encara si te ve (si no, mira por donde va, como los demás)
      const faceP = dist < (B.faceClose || 3.2) && (!B.faceLos || this.los);
      if (!(faceP || B.faceAlways || busy || this.state === 'chargeWind' || this.state === 'retreat' || vl < 0.35)) targetYaw = Math.atan2(this.vx, this.vz);
      if (this.state === 'charge') targetYaw = Math.atan2(this.chargeX, this.chargeZ);
      let dy = targetYaw - b.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      let turnStep = dy * Math.min(1, dt * (this.crawling ? 3 : B.turn));
      // turnMax: giro con velocidad máxima (rad/s): se gira con peso y, si lo rodeas deprisa, le pillas la espalda
      if (B.turnMax && this.state !== 'charge') turnStep = M.clamp(turnStep, -B.turnMax * dt, B.turnMax * dt);
      b.yaw += turnStep;

      // --- Ataque ---
      this.attackCd -= dt;
      const wind = this.T.quad ? 0.25 : this.biter ? 0.32 : 0.45;
      const canAttack = this.state === 'chase' || this.crawling;
      if (this.T.explode || this.screamT > 0) { /* el explosivo no golpea: revienta; el chillón está gritando */ }
      else if (this.windup > 0) {
        this.windup -= dt;
        if (this.windup <= 0) {
          if (this.raising) { this.raising = false; this.attackCd = 0.5; this.windup = 0; return; }
          if (this.spitting) { if (this.T.hydra) this.hydraSpit(game); else this.spit(game); }
          else if (dist < this.attackReach + 0.45 && Math.abs(P.y - this.y) < 1.2) {
            let dmg = this.dmg;
            if (this.biter) { dmg *= this.T.quad ? 1 : 0.8; VX.Audio.bite(); }
            else { if (this.armsLost === 1) dmg *= 0.7; VX.Audio.punch(); }
            if (this.crawling) dmg *= 0.7;
            P.damage(dmg, this.x, this.z, game);
            // el escudero te empuja con el escudo
            if (this.T.shield && this.body.byName.shield && !this.body.byName.shield.detached) P.knock(toX * 7, toZ * 7, 2);
          }
          // el corredor golpea y se retira
          if (this.B.hitRun && !this.spitting && !this.crawling) { this.state = 'retreat'; this.stateT = M.rand(0.6, 1); this.sideDir = M.chance(0.5) ? 1 : -1; }
          this.spitting = false;
          this.attackCd = this.cdBase * M.rand(0.85, 1.15);
        }
      } else if (canAttack && dist < this.attackReach && this.attackCd <= 0 && Math.abs(P.y - this.y) < 1.2) {
        this.windup = wind; this.windTotal = wind;
        if (this.T.quad) { this.kx += (dx / (dist || 1)) * 4; this.kz += (dz / (dist || 1)) * 4; }  // salto
      } else if (canAttack && this.T.ranged && !this.crawling && !this.swordOut && this.los && dist > 3 && dist < 16) {
        this.spitCd -= dt;
        if (this.spitCd <= 0) {
          // el nigromante prefiere levantar muertos si hay restos cerca
          if (this.T.necro && game.raiseDead && game.raiseDead(this)) { this.spitCd = 6; this.windup = 1.0; this.windTotal = 1.0; this.raising = true; }
          else { this.windup = this.T.arrow ? 1.1 : this.T.necro ? 1.0 : 0.8; this.windTotal = this.windup; this.spitting = true; this.spitCd = Math.max(this.T.arrow ? 1.8 : 1.6, (this.T.arrow ? 3 : 3.2) - game.floor * 0.08); }
        }
      }

      this.groanT -= dt;
      if (this.groanT <= 0) { VX.Audio.groanAt(this.x, this.z, P, this.T.quad); this.groanT = M.rand(4, 10); }

      // lejos y con poca calidad: se anima a saltos (acumula el tiempo de los fotogramas que se salta)
      this.animAcc = (this.animAcc || 0) + dt;
      if (this.lodSkip) return;
      this.animate(this.animAcc, Math.min(spd, this.aspd * 1.1));
      this.animAcc = 0;
      b.x = this.x; b.z = this.z;
      b.computeWorld();
    }

    // Arquero: saca o guarda la espada (la del arco baja al costado)
    setSword(game, on) {
      this.swordOut = on;
      const bl = this.body.byName.blade;
      if (bl) bl.hidden = !on;
      if (on) { this.windup = 0; this.spitting = false; this.attackCd = 0.35; VX.Audio.swish && VX.Audio.swish(); }
      else this.spitCd = Math.min(this.spitCd, 0.8);
    }

    // Dirección por el camino transitable hacia el jugador (recto si se puede)
    pathTo(game, dist, toX, toZ) {
      const P = game.player;
      if (this.pathT <= 0) {
        this.pathT = 0.16 + Math.random() * 0.1;
        this.direct = dist < 14 && game.world.straightWalk(this.x, this.z, P.x, P.z);
        if (!this.direct && !game.world.pathDir(this.x, this.z, this.pdir)) { this.pdir[0] = toX; this.pdir[1] = toZ; }
      }
      if (this.direct) { this.pdir[0] = toX; this.pdir[1] = toZ; }
      return this.pdir;
    }

    // Cerco: con turno de ataque va a por ti; si no, espera en su hueco del anillo
    approachRing(game, dist, toX, toZ, stopDist) {
      const p = this.pathTo(game, dist, toX, toZ);
      const H = VX.Horde, P = game.player;
      const R = H.ringR + (this.B.ringAdd || 0);
      let ringA = this.ringA;
      // el trepador prefiere atacar por la espalda
      if (this.B.behind && ringA !== undefined) ringA = Math.atan2(-Math.cos(P.yaw), -Math.sin(P.yaw)) + Math.sin(this.uid) * 0.8;
      if (this.token || !this.los || !this.direct || dist > R + 2.5 || ringA === undefined) {
        this.gx = p[0]; this.gz = p[1];
        this.want = dist > stopDist ? (this.token ? 1 : 0.9) : 0;
        return;
      }
      const cur = Math.atan2(this.z - P.z, this.x - P.x);
      let da = ringA - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const rad = M.clamp((dist - R) * 0.9, -1, 1);
      const tang = M.clamp(da * 1.4, -1, 1);
      const tx = -Math.sin(cur), tz = Math.cos(cur);
      this.gx = toX * rad + tx * tang;
      this.gz = toZ * rad + tz * tang;
      const m = Math.hypot(this.gx, this.gz);
      this.want = m < 0.15 ? 0 : Math.min(1, m) * 0.55;   // acechan despacio
    }

    // Salto (perro y trepador)
    startLeap(game, toX, toZ, h, vy) {
      this.state = 'leap';
      this.leapX = toX * h; this.leapZ = toZ * h;
      this.vy = vy; this.y += 0.05;
      this.leapHit = false;
      this.leapCd = M.rand(2.4, 4);
      VX.Audio.dash();
    }

    updateLeap(dt, game, dist) {
      const P = game.player, b = this.body;
      this.vy -= 18 * dt;
      this.y += this.vy * dt;
      this.tryMove(this.leapX * dt, 0, game.world);
      this.tryMove(0, this.leapZ * dt, game.world);
      if (!this.leapHit && dist < 1.0 && Math.abs(P.y + 0.8 - (this.y + 0.4)) < 1.1) {
        this.leapHit = true;
        P.damage(this.dmg * 1.2, this.x, this.z, game);
        VX.Audio.bite();
      }
      const g = game.world.groundAt(this.x, this.z);
      if (this.vy < 0 && this.y <= g) {
        this.y = g; this.vy = 0;
        this.vx = this.leapX * 0.3; this.vz = this.leapZ * 0.3;
        if (this.T.quad) { this.state = 'retreat'; this.stateT = M.rand(0.5, 0.9); this.sideDir = M.chance(0.5) ? 1 : -1; }
        else this.state = 'chase';
      }
      b.y = this.y;
      b.yaw = Math.atan2(this.leapX, this.leapZ);
      this.animate(dt, 6);
      b.x = this.x; b.z = this.z;
      b.computeWorld();
    }

    spit(game) {
      const P = game.player;
      if (this.T.arrow || this.T.necro) {
        const hd = this.body.byName.head;
        const sx = this.x, sy = this.y + this.body.height * 0.75, sz = this.z;
        const tx = P.x + P.vx * 0.25, tz = P.z + P.vz * 0.25, ty = P.y + 1.2;
        const d = Math.hypot(tx - sx, ty - sy, tz - sz) || 1, spd = this.T.arrow ? 20 : 9;
        const T = d / spd;
        void hd;
        game.projectiles.push(this.T.arrow
          ? { x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy) / T + 0.5 * 4 * T, vz: (tz - sz) / T, g: 4, dmg: this.dmg * 1.2, life: 2, rot: 0, col: [0.55, 0.4, 0.25], glow: 0, arrow: true, acid: true, blastR: 0.15, blockDmg: 6 }
          : { x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (ty - sy) / T, vz: (tz - sz) / T, g: 0, home: 1.6, dmg: this.dmg * 1.4, life: 4, rot: 0, col: [0.6, 0.2, 1], glow: 1, acid: true, size: 0.05, blastR: 0.3, blockDmg: 10 });
        VX.Audio.swish();
        return;
      }
      const head = this.body.byName.head;
      const sx = head.detached ? this.x : head.wp[0], sy = head.detached ? this.y + 1.3 : head.wp[1] + 0.15, sz = head.detached ? this.z : head.wp[2];
      const tx = P.x + P.vx * 0.5, tz = P.z + P.vz * 0.5;
      const d = Math.hypot(tx - sx, tz - sz);
      const T = 0.45 + d * 0.05;
      game.projectiles.push({
        x: sx, y: sy, z: sz,
        vx: (tx - sx) / T, vy: (P.y + 1.0 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
        dmg: this.dmg * 1.1, life: 3, rot: 0, col: [0.45, 0.9, 0.15], glow: 0.7,
        blastR: 0.5, blockDmg: 25, acid: true, size: 0.06,
      });
      VX.Audio.bite();
    }

    detonate(game) {
      if (this.dead) return;
      const dir = [0, 1, 0];
      this.dead = true;
      game.explode({ x: this.x, y: this.y + 0.8, z: this.z, R: 2.6, dmg: 42 + game.floor * 2, selfK: 1 });
      this.body.collapse(game.gibs, 0, 0, 6);
      for (let i = 0; i < 30; i++) game.particles.spawn(this.x, this.y + 1, this.z, M.rand(-5, 5), M.rand(1, 6), M.rand(-5, 5), 0.6, 0.9, 0.2, M.rand(0.04, 0.1), M.rand(1, 3), 0.6);
      this.reward(game, dir);
    }

    land(game) {
      const b = this.body;
      this.fallT = 0; this.crawlC = 1;
      const shift = b.height * 0.45;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      for (const k of [1, 0.6, 0.3, 0]) {
        const nx = this.x + fx * shift * k, nz = this.z + fz * shift * k;
        if (k === 0 || !game.world.boxCollides(nx - this.radius, this.y + 0.05, nz - this.radius, nx + this.radius, this.y + 0.45, nz + this.radius)) {
          this.x = nx; this.z = nz; b.fwdOff = -shift * k; break;
        }
      }
      game.shake(0.05);
      VX.Audio.punch();
      for (let i = 0; i < 10; i++)
        game.particles.spawn(this.x + M.rand(-0.5, 0.5), this.y + 0.05, this.z + M.rand(-0.5, 0.5), M.rand(-1.5, 1.5), M.rand(0.5, 2), M.rand(-1.5, 1.5), 0.25, 0.22, 0.22, 0.05, 0.8);
    }

    // ---------------- Animación ----------------
    animate(dt, spd) {
      if (this.T.fly) return this.animateCrow(dt);
      if (this.T.quad) return this.animateDog(dt, spd);
      const b = this.body, P_ = b.byName, T = this.T;
      this.walkT += dt * (spd > 0 ? (this.crawling ? 5.5 : spd * 3.2 * this.gait) : 1.2);
      const moving = spd > 0.05 || (this.crawling && this.fallT <= 0);
      const sw = Math.sin(this.walkT) * (moving ? 0.6 : 0.05);
      const k = this.windup > 0 ? 1 - this.windup / (this.windTotal || 0.45) : 0;
      const fl = this.fl;

      const S = {};
      const limpL = this.body.ratio('legL') < 0.8 ? 0.5 : 1, limpR = this.body.ratio('legR') < 0.8 ? 0.5 : 1;
      S.legL = sw * limpL; S.legR = -sw * limpR;
      let arm = -1.35 + Math.sin(this.walkT * 0.5) * 0.12;
      if (T.ranged) arm = -0.5 + Math.sin(this.walkT) * 0.2;
      const sword = this.swordOut;
      if (T.explode) arm = -0.3 + Math.sin(this.walkT) * 0.25;
      S.armL = arm + Math.sin(this.walkT) * 0.15; S.armR = arm - Math.sin(this.walkT) * 0.15;
      if (sword) { S.armL = -1.15 + Math.sin(this.walkT) * 0.08; S.armLz = -0.25; S.armR = -0.15 + Math.sin(this.walkT) * 0.1; }   // en guardia; el arco, al costado
      else if (T.arrow && this.windup <= 0) { S.armR = -0.7 + Math.sin(this.walkT) * 0.1; S.armL = -0.35 + Math.sin(this.walkT) * 0.15; }   // arco listo, flecha en la otra mano
      if (T.shield) { S.armL = -1.5; }
      if (this.body.ratio('armL') < 0.6) S.armL = 0.1 + sw * 0.4;
      if (this.body.ratio('armR') < 0.6) S.armR = 0.1 - sw * 0.4;
      if (!sword) { S.armLz = -0.12; S.armRz = 0.12; } else S.armRz = 0.12;
      S.torso = 0.12 + T.lean * 0.5; S.torsoZ = Math.sin(this.walkT) * 0.06;
      S.head = Math.sin(this.walkT * 2) * 0.05; S.headZ = this.tilt + Math.sin(this.walkT * 0.37) * 0.12;
      S.pitch = 0.04 + T.lean; S.yOff = Math.abs(Math.sin(this.walkT)) * 0.03 * (moving ? 1 : 0.2);
      if (this.climbing > 0) { S.pitch = -0.55; S.armL = S.armR = -2.9 + sw * 0.8; }
      if (this.dodging > 0) S.torsoZ += this.sideDir * 0.35;
      if (this.weaveLean) S.torsoZ += this.weaveLean * 0.3;
      if (this.windup > 0) {
        if (this.spitting && T.arrow) {
          // arquero: levanta el arco, tensa la cuerda hasta la cara y suelta
          const raise = Math.min(1, k / 0.18), draw = M.clamp((k - 0.18) / 0.62, 0, 1), rel = k > 0.86 ? (k - 0.86) / 0.14 : 0;
          S.armR = -0.5 - raise * 1.05; S.armRz = 0.12 - raise * 0.15;                       // brazo del arco, extendido
          S.armL = -0.5 - raise * 1.0 + draw * 0.35 - rel * 0.4; S.armLz = -0.12 - draw * 0.85 + rel * 0.7;   // mano de la cuerda
          S.torsoZ = draw * 0.22 - rel * 0.15; S.torso = 0.08 - draw * 0.08;
          S.head = -0.05; S.headZ = this.tilt + draw * 0.15;
        } else if (this.spitting && T.necro) {
          // nigromante: alza el bastón cargando energía y lo descarga hacia delante
          const up = Math.min(1, k / 0.7), cast = k > 0.75 ? (k - 0.75) / 0.25 : 0;
          S.armR = -0.5 - up * 2.4 + cast * 1.6; S.armRz = 0.12 + up * 0.15;
          S.armL = -0.5 - up * 1.0 - cast * 0.3; S.armLz = -0.3;
          S.torso = 0.1 - up * 0.3 + cast * 0.55; S.head = -up * 0.35 + cast * 0.3;
          S.torsoZ = Math.sin(this.walkT * 6) * 0.04 * up;
        } else if (this.spitting) {
          const e = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3;
          S.torso = 0.12 - e * 0.45 + (k > 0.7 ? 0.6 : 0); S.head = -e * 0.6 + (k > 0.7 ? 0.5 : 0);
          S.armL = S.armR = -0.4 - e * 0.5;
        } else if (sword) {
          // tajo con la espada: alza en diagonal y corta hacia abajo cruzando el cuerpo
          const up = k < 0.5 ? k / 0.5 : 1, cut = k > 0.5 ? (k - 0.5) / 0.5 : 0;
          S.armL = -1.2 - up * 1.5 + cut * 2.3; S.armLz = -0.25 - up * 0.5 + cut * 0.9;
          S.torso = 0.1 - up * 0.15 + cut * 0.4; S.torsoZ = -up * 0.2 + cut * 0.35;
          S.armR = -0.2;
        } else if (this.biter) {
          const lunge = Math.sin(k * Math.PI);
          S.torso = 0.35 + lunge * 0.55; S.head = 0.2 + lunge * 0.5; S.pitch += lunge * 0.15;
        } else {
          const pull = k < 0.55 ? k / 0.55 : 1 - (k - 0.55) / 0.45;
          const swing = k < 0.55 ? -1.35 - pull * 1.5 : -2.85 + ((k - 0.55) / 0.45) * 2.1;
          if (!this.body.broken('armR')) S.armR = swing;
          if (!this.body.broken('armL') && !T.shield) S.armL = swing + (this.armsLost ? 0 : 0.15);
          S.torso += k < 0.55 ? -pull * 0.25 : (k - 0.55) / 0.45 * 0.45;
          S.pitch += k > 0.55 ? 0.1 : 0;
        }
      } else if (this.biter) { S.torso = 0.35; S.head = 0.2; }
      if (this.fuse > 0) { S.armL = S.armR = -2.8; S.head = -0.4; S.torsoZ += Math.sin(this.fuse * 50) * 0.08; }
      if (this.spawnT > 0) { S.armL = S.armR = -2.9 + Math.sin(this.walkT * 3) * 0.2; S.head = 0.4; }
      if (this.screamT > 0) {   // chillón: echa la cabeza atrás, abre los brazos y chilla
        const kk = 1 - this.screamT / 1.1, sh = kk > 0.8 ? Math.sin(this.walkT * 40) * 0.05 : 0;
        S.head = -0.25 - kk * 0.65 + sh; S.torso = 0.1 - kk * 0.35; S.armL = S.armR = -0.6 - kk * 0.9; S.armLz = -0.4 - kk * 0.6; S.armRz = 0.4 + kk * 0.6;
      }

      const C = {};
      C.legL = sw * 0.25; C.legR = -sw * 0.25;
      C.armL = -2.9 + Math.sin(this.walkT) * 0.7; C.armR = -2.9 - Math.sin(this.walkT) * 0.7;
      C.armLz = -0.3; C.armRz = 0.3;
      C.torso = 0; C.torsoZ = Math.sin(this.walkT) * 0.1;
      C.head = -0.85 + Math.sin(this.walkT * 2) * 0.1 + (this.windup > 0 ? Math.sin(k * Math.PI) * 0.6 : 0);
      C.headZ = this.tilt * 0.5;
      C.pitch = 1.42; C.yOff = 0.03;
      if (this.fallT > 0) C.armL = C.armR = -2.6;

      const c = this.crawlC;
      const mix = (a, bb) => a + (bb - a) * c;
      P_.legL.ax = mix(S.legL, C.legL); P_.legR.ax = mix(S.legR, C.legR);
      P_.armL.ax = mix(S.armL, C.armL); P_.armR.ax = mix(S.armR, C.armR);
      P_.armL.az = mix(S.armLz, C.armLz); P_.armR.az = mix(S.armRz, C.armRz);
      P_.torso.ax = mix(S.torso, C.torso) + fl.x; P_.torso.az = mix(S.torsoZ, C.torsoZ) + fl.z;
      P_.head.ax = mix(S.head, C.head) + fl.x * 1.4; P_.head.az = mix(S.headZ, C.headZ) + fl.z * 1.2;
      if (P_.shield) { P_.shield.ax = -0.05 + fl.x * 0.5; P_.shield.az = Math.sin(this.walkT) * 0.04; }
      if (T.hydra) {
        // la hidra: brazos-liana colgando que se balancean, cuello que se mece y se echa atrás antes de morder
        const t = this.walkT, open = this.mouthOpen > 0 ? 1 : 0;
        if (this.windup <= 0 && this.climbing <= 0) { P_.armL.ax = mix(-0.25 + Math.sin(t) * 0.3, C.armL); P_.armR.ax = mix(-0.25 - Math.sin(t) * 0.3, C.armR); P_.armL.az = -0.18; P_.armR.az = 0.18; }
        const wind = this.state === 'chargeWind' ? 1 : 0, lunge = this.state === 'charge' ? 1 : 0;
        for (const nm of ['neck', 'neck2']) {
          const N = P_[nm]; if (!N) continue;
          N.ax = Math.sin(t * 0.6 + (nm === 'neck2' ? 1.7 : 0)) * 0.09 - wind * 0.45 + lunge * 0.55 + (this.eating ? 0.7 : 0) + fl.x;
          N.az = Math.sin(t * 0.4 + (nm === 'neck2' ? 2 : 0)) * 0.08;
        }
        for (const nm of ['head', 'head2']) {
          const H = P_[nm]; if (!H) continue;
          H.ax = -open * 0.25 + Math.sin(t * 1.3) * 0.05 + (open ? Math.sin(game_time() * 40) * 0.03 : 0);
          H.az = Math.sin(t * 0.7 + (nm === 'head2' ? 1 : 0)) * 0.1;
        }
        S.pitch = 0.05;
      }
      this.animExtras(dt, k);
      b.pitch = mix(S.pitch, C.pitch);
      if (this.spawnT <= 0) b.yOff = mix(S.yOff, C.yOff);
    }

    animateDog(dt, spd) {
      const b = this.body, P_ = b.byName, fl = this.fl;
      this.walkT += dt * (spd > 0 ? spd * 2.6 : 1);
      const moving = spd > 0.05;
      const g = Math.sin(this.walkT) * (moving ? 0.75 : 0.04);
      P_.armL.ax = g; P_.armR.ax = g * 0.8;          // galope: delanteras juntas
      P_.legL.ax = -g; P_.legR.ax = -g * 0.8;        // traseras al contrario
      P_.torso.ax = (moving ? Math.sin(this.walkT) * 0.08 : 0) + fl.x;
      P_.torso.az = fl.z;
      const k = this.windup > 0 ? 1 - this.windup / (this.windTotal || 0.25) : 0;
      P_.head.ax = 0.1 + Math.sin(this.walkT * 2) * 0.06 + (this.windup > 0 ? -Math.sin(k * Math.PI) * 0.5 : 0) + fl.x;
      P_.head.az = this.tilt * 0.5;
      b.pitch = this.windup > 0 ? -Math.sin(k * Math.PI) * 0.25 : 0;
      this.animExtras(dt, k);
      if (this.spawnT <= 0) b.yOff = moving ? Math.abs(Math.sin(this.walkT)) * 0.08 : 0;
    }

    // Mandíbula que gruñe y muerde, y piezas que cuelgan y se balancean
    animExtras(dt, k) {
      const P_ = this.body.byName;
      if (this.windup > 0 && this.spitting && this.game) {
        const g = this.game, tool = P_.tool, head = P_.head;
        if (this.T.necro && tool && !tool.detached && tool.wp && Math.random() < 0.7) {
          // energía morada que se arremolina en la punta del bastón (hombro + brazo alzado)
          const ax = P_.armR.ax || 0, Lr = 1.15, yw = this.body.yaw;
          const ly = -Lr * Math.cos(ax), lz = -Lr * Math.sin(ax);
          const tx = tool.wp[0] + Math.sin(yw) * lz, ty = tool.wp[1] + ly, tz = tool.wp[2] + Math.cos(yw) * lz;
          const a = Math.random() * 6.28, r = 0.35 * (1 - k);
          g.particles.spawn(tx + Math.cos(a) * r, ty + Math.sin(a * 2) * 0.1, tz + Math.sin(a) * r, -Math.cos(a) * 0.8, 0.3, -Math.sin(a) * 0.8, 0.7, 0.3, 1, 0.035, 0.35, 1, 1);
        } else if (this.T.arrow && tool && !tool.detached && tool.wp && k > 0.3 && k < 0.86 && Math.random() < 0.25) {
          g.particles.spawn(tool.wp[0], tool.wp[1], tool.wp[2], 0, 0.2, 0, 0.9, 0.85, 0.6, 0.02, 0.2, 1, 1);   // brillo de la punta de la flecha
        } else if (!this.T.arrow && !this.T.necro && head && !head.detached && head.wp && Math.random() < 0.35) {
          g.particles.spawn(head.wp[0], head.wp[1] - 0.05, head.wp[2], 0, -0.5, 0, 0.45, 0.9, 0.15, 0.03, 0.6, 0.5);   // babas ácidas
        }
      }
      const jaw = P_.jaw;
      if (jaw && !jaw.detached) {
        const growl = 0.12 + Math.max(0, Math.sin(this.walkT * 0.9 + this.tilt * 9)) * 0.22;
        const bite = this.windup > 0 ? Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.75 : 0;
        jaw.ax = this.dead ? 0.6 : this.screamT > 0 ? 0.3 + Math.min(1, (1.1 - this.screamT) * 2) * 0.9 : Math.max(growl, bite) + (this.spawnT > 0 ? 0.5 : 0);
      }
      if (P_.teeth && !P_.teeth.detached && this.T.mimic) P_.head.ax -= 0.25 + Math.abs(Math.sin(this.walkT * 2)) * 0.5;
      for (const p of this.body.parts) {
        if (p.detached) continue;
        if (p.flicker) { p.ax = Math.sin(this.walkT * 7 + p.alive) * 0.12; p.az = Math.cos(this.walkT * 5.3) * 0.08; }
        if (p.sway) { p.ax = Math.sin(this.walkT * 1.1) * p.sway + 0.1; p.az = Math.sin(this.walkT * 0.7 + 1) * p.sway * 0.6; }
      }
    }

    // ---- Cuervo: vuela en círculos sobre ti y se lanza en picado a picotearte ----
    // altura del primer sólido por encima del suelo (el techo de la sala, una viga…)
    static ceilAt(W, x, z, y0) {
      const g = Math.max(y0 || 0, W.groundAt(x, z));
      for (let y = g + 0.6; y < g + 14; y += 0.25) if (W.isSolidAt(x, y, z)) return y;
      return g + 14;
    }

    updateFly(dt, game) {
      const P = game.player, b = this.body, W = game.world;
      this.ceilT = (this.ceilT || 0) - dt;
      if (this.ceilT <= 0) { this.ceilT = 0.25; this.ceilY = Zombie.ceilAt(W, this.x, this.z, Math.min(this.y, W.groundAt(this.x, this.z) + 0.5)); }
      const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz);
      this.attackCd -= dt; this.stateT -= dt;
      this.losT = (this.losT || 0) - dt;
      if (this.losT <= 0) { this.losT = 0.3; this.los = W.lineOfSight(this.x, this.y, this.z, P.x, P.y + 1.4, P.z); }
      let tx, ty, tz, spd = this.baseSpeed;
      const floorY = Math.max(W.groundAt(this.x, this.z), P.y);
      if (this.state === 'dive') {
        tx = P.x; tz = P.z; ty = P.y + 1.35; spd *= 1.3;
        if (Math.hypot(tx - this.x, ty - this.y, tz - this.z) < 0.75) {
          P.damage(this.dmg, this.x, this.z, game);
          VX.Audio.bite();
          this.state = 'climb'; this.stateT = 1.2; this.attackCd = M.rand(1.8, 3.2);
        }
        if (this.stateT <= 0) { this.state = 'climb'; this.stateT = 0.8; }
      } else {
        const a = game.time * (0.7 + (this.uid % 5) * 0.06) + this.uid * 1.7, R = this.state === 'climb' ? 5 : 3.8;
        tx = P.x + Math.cos(a) * R; tz = P.z + Math.sin(a) * R; ty = floorY + this.flyH + (this.state === 'climb' ? 1.5 : 0) + Math.sin(game.time * 2 + this.uid) * 0.3;
        if (this.state === 'climb' && this.stateT <= 0) this.state = 'circle';
        if (this.state === 'circle' && this.attackCd <= 0 && dist < 9 && this.los) { this.state = 'dive'; this.stateT = 2; VX.Audio.crow && VX.Audio.crow(); }
      }
      if (this.ceilY) ty = Math.min(ty, this.ceilY - 0.75);   // vuela por debajo del techo
      // el punto del círculo puede caer dentro de un muro o detrás de una pared: entonces se acerca más
      // al jugador; y si no ve al jugador, sigue el mismo mapa de caminos que los zombis de tierra
      if (this.state !== 'dive' && (W.isSolidAt(tx, ty, tz) || W.isSolidAt(tx, ty - 0.6, tz))) { tx = P.x + (tx - P.x) * 0.35; tz = P.z + (tz - P.z) * 0.35; }
      if (!this.los && this.state !== 'dive' && W.flowDir(this.x, this.z, this.fdir || (this.fdir = [0, 0])) && (this.fdir[0] || this.fdir[1])) {
        tx = this.x + this.fdir[0] * 2; tz = this.z + this.fdir[1] * 2;
        ty = Math.min(ty, W.groundAt(this.x, this.z) + 1.6);   // por los pasillos, más bajo
      }
      // atascado (apenas avanza y no está donde quiere): sube o baja y busca otro lado durante un momento
      this.stuckT = (this.stuckT || 0) + dt;
      if (this.stuckT > 0.6) {
        const moved = Math.hypot(this.x - (this.lastX ?? this.x), this.z - (this.lastZ ?? this.z), this.y - (this.lastY ?? this.y));
        if (moved < 0.25 && Math.hypot(tx - this.x, tz - this.z) > 1) { this.unstickT = 0.9; this.unstickA = Math.atan2(P.x - this.x, P.z - this.z) + (Math.random() < 0.5 ? 1.6 : -1.6); }
        this.stuckT = 0; this.lastX = this.x; this.lastY = this.y; this.lastZ = this.z;
      }
      if (this.unstickT > 0) {
        this.unstickT -= dt;
        tx = this.x + Math.sin(this.unstickA) * 2; tz = this.z + Math.cos(this.unstickA) * 2;
        ty = W.groundAt(this.x, this.z) + 1.2;
      }
      let gx = tx - this.x, gy = ty - this.y, gz = tz - this.z;
      const gl = Math.hypot(gx, gy, gz) || 1;
      const acc = Math.min(1, dt * this.B.accel);
      this.vx += (gx / gl * spd - this.vx) * acc; this.vz += (gz / gl * spd - this.vz) * acc;
      this.vy += (gy / gl * spd - this.vy) * acc;
      const nx = this.x + (this.vx + this.kx) * dt, ny = this.y + this.vy * dt, nz = this.z + (this.vz + this.kz) * dt;
      this.kx *= Math.pow(0.05, dt); this.kz *= Math.pow(0.05, dt);
      // metido dentro de algo (un derrumbe, un hueco que se ha cerrado): sale hacia el jugador atravesándolo
      if (W.isSolidAt(this.x, this.y, this.z)) { const l = Math.hypot(P.x - this.x, P.y + 1.4 - this.y, P.z - this.z) || 1; this.x += (P.x - this.x) / l * 3 * dt; this.y += (P.y + 1.4 - this.y) / l * 3 * dt; this.z += (P.z - this.z) / l * 3 * dt; }
      // choque: se desliza por la pared (prueba cada eje por separado) en vez de quedarse pegado
      const free = (x, y, z) => !W.isSolidAt(x, y, z) && !W.isSolidAt(x, y + 0.25, z) && !W.isSolidAt(x + 0.2, y, z) && !W.isSolidAt(x - 0.2, y, z) && !W.isSolidAt(x, y, z + 0.2) && !W.isSolidAt(x, y, z - 0.2);
      if (free(nx, ny, nz)) { this.x = nx; this.y = ny; this.z = nz; }
      else {
        let moved = false;
        if (free(nx, this.y, this.z)) { this.x = nx; moved = true; } else this.vx *= -0.3;
        if (free(this.x, this.y, nz)) { this.z = nz; moved = true; } else this.vz *= -0.3;
        if (free(this.x, ny, this.z)) this.y = ny;
        else this.vy = 0;
        if (!moved) {
          // de frente contra algo: sube si hay sitio; si no, baja
          if (free(this.x, this.y + 0.3, this.z) && (!this.ceilY || this.y + 0.9 < this.ceilY)) { this.vy = 3; this.y += 3 * dt; }
          else if (free(this.x, this.y - 0.3, this.z)) { this.vy = -2; this.y -= 2 * dt; }
        }
      }
      const g = W.groundAt(this.x, this.z);
      if (this.y < g + 0.35) { this.y = g + 0.35; this.vy = Math.max(0, this.vy); }
      // si aun así acaba metido en el techo (techos bajos, derrumbes), baja al hueco libre
      if (W.isSolidAt(this.x, this.y + 0.15, this.z)) { for (let k = 0; k < 40 && W.isSolidAt(this.x, this.y + 0.15, this.z) && this.y > g + 0.4; k++) this.y -= 0.25; this.vy = Math.min(0, this.vy); }
      if (Math.random() < dt * 0.15) VX.Audio.crow && VX.Audio.crow();
      b.yaw = Math.atan2(this.vx, this.vz);
      this.animateCrow(dt);
      b.x = this.x; b.y = this.y; b.z = this.z;
      b.computeWorld();
    }

    animateCrow(dt) {
      const b = this.body, P_ = b.byName;
      const dive = this.state === 'dive';
      this.walkT += dt * (dive ? 9 : 15);
      const f = dive ? 0.25 + Math.sin(this.walkT) * 0.15 : Math.sin(this.walkT) * 0.8;
      if (P_.armL) P_.armL.az = f;
      if (P_.armR) P_.armR.az = -f;
      if (P_.tail) P_.tail.ax = Math.sin(this.walkT * 0.5) * 0.1;
      if (P_.head) P_.head.ax = dive ? 0.2 : Math.sin(this.walkT * 0.3) * 0.15;
      b.pitch = dive ? 0.45 : (this.vy || 0) < -1 ? 0.25 : -0.05;
      b.yOff = 0;
    }

    // ---- Chillón: el grito aturde a quien esté cerca y atrae a más zombis ----
    scream(game) {
      this.screams++;
      this.screamCd = M.rand(6, 9);
      const P = game.player, d = Math.hypot(P.x - this.x, P.z - this.z);
      VX.Audio.at(this.x, this.y + 1.6, this.z, () => VX.Audio.scream && VX.Audio.scream(), 8);
      for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; game.particles.spawn(this.x, this.y + 1.5, this.z, Math.cos(a) * 9, M.rand(-0.5, 0.5), Math.sin(a) * 9, 0.85, 0.85, 0.9, 0.035, 0.5, 1, 1); }
      if (d < 14 && !P.isRemote && this.los) {
        P.slowT = Math.max(P.slowT || 0, 1.4);
        game.shake(0.45);
        game.hud.flashDamage && game.hud.flashDamage(0.25);
        game.hud.toast('¡Un chillón! Te ha aturdido y llama a la horda');
      }
      // refuerzos
      const n = 2 + (game.floor > 10 ? 1 : 0), H = VX.HordeMode;
      for (let k = 0; k < n; k++) {
        if (game.mode === 'horde' && H.alive(game) >= H.maxAlive(H.wave) + 4) break;
        const z = game.spawner.spawnZombieNear(game, this.x, this.z, 3.5, Math.random() < 0.6 ? 'runner' : 'walker');
        if (z && game.mode === 'horde' && H.phase === 'wave') { H.spawned++; H.total++; }
      }
    }

    unstick(world, r, h) {
      // hueco libre más cercano; mejor al nivel del suelo que encima de un coche
      let best = null, bs = 1e9;
      for (const rad of [0.25, 0.45, 0.7, 1.0, 1.4, 1.9, 2.5]) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + rad;
          const nx = this.x + Math.sin(a) * rad, nz = this.z + Math.cos(a) * rad;
          const g = world.groundAt(nx, nz);
          if (Math.abs(g - this.y) > 2.2) continue;
          if (world.boxCollides(nx - r, g + 0.06, nz - r, nx + r, g + 0.06 + h, nz + r)) continue;
          const sc = rad + Math.max(0, g - this.y) * 3 + g * 0.5;
          if (sc < bs) { bs = sc; best = [nx, nz, g]; }
        }
        if (best && bs < rad + 0.6) break;
      }
      if (!best) return false;
      [this.x, this.z, this.y] = best; this.vy = 0;
      this.body.x = this.x; this.body.z = this.z; this.body.y = this.y;
      return true;
    }

    tryMove(dx, dz, world) {
      const r = Math.min(this.radius, 0.22), h = this.crawling ? 0.45 : (this.T.quad ? 0.75 : 1.4);
      const nx = this.x + dx, nz = this.z + dz;
      // altura de referencia: la real bajo los pies (this.y puede ir un poco por detrás al subir)
      const fy = this.state === 'leap' ? this.y : Math.max(this.y, world.groundAt(this.x, this.z));
      let g = world.groundAt(nx, nz);
      this.blockedH = 0;
      if (g - fy > 0.55) { this.blockedH = g; return false; }
      // el pie puede apoyarse en el escalón de al lado (escaleras empinadas de 2 en 2 vóxeles)
      const rr = r + 0.002, c0 = g;
      for (const [ox, oz] of [[-rr, -rr], [rr, -rr], [-rr, rr], [rr, rr]]) {
        const gg = world.groundAt(nx + ox, nz + oz);
        if (gg > g && gg - c0 <= 0.55 && gg - fy <= 1.05) g = gg;
      }
      const base = Math.max(g, fy) + 0.06;
      if (!world.boxCollides(nx - r, base, nz - r, nx + r, base + h, nz + r)) { this.x = nx; this.z = nz; return true; }
      this.blockedH = this.y + 1.5;
      return false;
    }

    // ---------------- Daño ----------------
    hit(hit, dmg, ray, game, opts) {
      if (VX.Codex && VX.Codex.bonus && game.dmgSource) dmg *= VX.Codex.bonus(this.kind);   // conocer al enemigo (bestiario)
      if (this.dead) return false;
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      if (game.localAct && !game.visualOnly) VX.Coop.noteHit && VX.Coop.noteHit(this, dmg, game);   // daño hecho y asistencias (cooperativo)
      // cooperativo: el invitado avisa al anfitrión de sus impactos; el anfitrión enseña los suyos a los demás
      const C = VX.Coop;
      if (C.active && !game.visualOnly) {
        if (C.isClient) { if (game.localAct) C.reportHit(this, dmg, ray, opts, hit); }
        else if (!game.noReward) C.shareHitFx(this, dmg, ray, opts, 0, hit);
      }
      if (this.T.knight) return this.knightHit(hit, dmg, ray, game, opts);
      if (this.T.hydra) return this.hydraHit(hit, dmg, ray, game, opts);
      if (this.T.pile) return this.pileHit(hit, dmg, ray, game, opts);
      const b = this.body;
      const pn = hit.part.name;
      const dir = [ray.dx, ray.dy, ray.dz];
      // el escudo para las balas: solo se abolla
      if (hit.part.armor) {
        const p = hit.part, r2 = (b.v * (1.2 + dmg / 40)) ** 2;
        b.ensureAll();
        let n = 0;
        for (const v of p.vox) if (v.alive && (v.wx - hit.vox.wx) ** 2 + (v.wy - hit.vox.wy) ** 2 + (v.wz - hit.vox.wz) ** 2 < r2) { v.alive = false; n++; }
        p.alive -= n;
        VX.updateExposure(p);
        if (p.alive <= 0) { p.detached = true; b.cascade(game.gibs); }
        game.particles.sparks(hit.vox.wx, hit.vox.wy, hit.vox.wz, -dir[0], 0.3, -dir[2], 6);
        VX.Audio.wall();
        this.kx += dir[0] * 0.8; this.kz += dir[2] * 0.8;
        if (p.alive / p.total < 0.35 && !p.noBreak) {
          b.detach(p.name, game.gibs, dir[0] * 2, 1.5, dir[2] * 2);
          game.hud.toast({ shield: '¡Escudo destrozado!', helmet: '¡Casco reventado!', buckler: '¡Rodela rota!', pauldron: '¡Hombrera arrancada!' }[p.name] || '¡Armadura rota!');
        }
        return false;
      }
      // antidisturbios: el casco y el chaleco paran las balas que le llegan de frente
      if (this.T.riot && !(opts && (opts.slash || opts.blunt)) && (pn === 'torso' || pn === 'head' || pn.startsWith('arm'))) {
        const fx0 = Math.sin(b.yaw), fz0 = Math.cos(b.yaw);
        if (-(dir[0] * fx0 + dir[2] * fz0) > 0.25) {
          if (!game.visualOnly) this.hp -= dmg * 0.1;
          b.flash = 0.4;
          game.particles.sparks(hit.vox.wx, hit.vox.wy, hit.vox.wz, -dir[0], 0.3, -dir[2], 7);
          VX.Audio.wall();
          this.kx += dir[0] * 0.5; this.kz += dir[2] * 0.5;
          if (!this.riotHint && game.hud) { this.riotHint = true; game.hud.toast('Blindado por delante: dale en las piernas, por la espalda o con explosivos'); }
          if (this.hp <= 0 && !game.visualOnly) { this.die(dir, game); return true; }
          return false;
        }
      }
      const mult = (pn === 'head' ? 2.5 * (game.dmgSource === 'gun' && game.weapon.mods.headMul || 1) : (pn.startsWith('arm') || pn.startsWith('leg') ? 0.7 : 1)) * (game.visualOnly ? 1 : game.weapon.hitMul(this, pn, opts, game));
      if (!game.visualOnly) this.hp -= dmg * mult;
      if (!game.visualOnly) game.weapon.onHitFx(this, pn, dmg * mult, dir, opts, game);
      b.flash = 0.8;
      const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
      const along = dir[0] * fx + dir[2] * fz, side = dir[0] * fz - dir[2] * fx;
      const pow = Math.min(1.5, 0.4 + dmg / 40);
      this.fl.vx += along * 7 * pow; this.fl.vz += -side * 5 * pow;
      const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles);
      const ex = hit.vox.wx, ey = hit.vox.wy, ez = hit.vox.wz;
      game.particles.blood(ex, ey, ez, -dir[0] * 0.5, 0.3, -dir[2] * 0.5, 5);
      game.particles.blood(ex + dir[0] * 0.3, ey + dir[1] * 0.3, ez + dir[2] * 0.3, dir[0] * 1.5, dir[1], dir[2] * 1.5, 8 + Math.min(10, dmg / 6 | 0));
      this.kx += dir[0] * (0.8 + dmg / 35); this.kz += dir[2] * (0.8 + dmg / 35);
      let total = 0; for (const k in removed) total += removed[k];
      if (total > 12 && !(opts && opts.slash)) {
        VX.Audio.splat();                 // la bala sale por el otro lado
        game.wallSplat(ex, ey, ez, dir);  // y mancha la pared de detrás
      } else VX.Audio.flesh();
      if (game.visualOnly) { this.body.afterCarve(removed, game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5); return false; }   // sólo la herida (la vida la lleva otro)
      if (game.weapon.mods.fire && !(opts && opts.slash)) this.burn = 3;
      if (game.weapon.mods.lifesteal && !game.noReward) game.player.heal(0.6);
      return this.afterDamage(removed, dir, game, pn);
    }

    blast(x, y, z, R, dmg, game) {
      if (this.dead) return false;
      if (game.dmgWeapon) this.lastW = game.dmgWeapon;
      const b = this.body;
      const v = b.nearestVoxel(x, y, z);
      if (!v) return false;
      if (this.T.knight) {
        // la explosión le arranca placas que vuelven a su sitio; sólo le hace daño si le pilla el corazón
        // todo lo que arranca la explosión vuelve a su sitio; sólo muere si le destroza el corazón
        const dxk = v.wx - x, dzk = v.wz - z, lk = Math.hypot(dxk, dzk) || 1;
        const resB = this.knightCarve(() => b.afterCarve(b.carveSphere(v.wx, v.wy, v.wz, 0.18 + dmg / 280, game.particles, 0, 0.6, 0, 20), game.gibs, dxk / lk * 3, 2, dzk / lk * 3), game, true);
        if (this.knightAfter(resB, [dxk / lk, 0.3, dzk / lk], game)) return true;
        const core = b.byName.core;
        if (core && !game.visualOnly && core.alive / core.total < 0.3) { this.allowDie = true; this.hp = 0; this.die([0, 1, 0], game); return true; }
        this.kx += (v.wx - x) * 3; this.kz += (v.wz - z) * 3;
        return false;
      }
      if (this.T.pile) {
        if (!game.visualOnly) this.hp -= dmg;
        const removed = b.carveSphere(v.wx, v.wy, v.wz, 0.2 + dmg / 200, game.particles, 0, 0.8, 0, 20);
        b.afterCarve(removed, game.gibs, 0, 1.5, 0);
        if (!game.visualOnly && b.ratio('torso') < 0.5) this.hp = 0;
        if (this.hp <= 0 && !game.visualOnly) { this.die([0, 1, 0], game); return true; }
        return false;
      }
      if (VX.Coop.isClient && game.localAct && !game.visualOnly) VX.Coop.reportBlast(this, x, y, z, R, dmg);
      if (game.localAct && !game.visualOnly) VX.Coop.noteHit && VX.Coop.noteHit(this, dmg, game);
      if (this.T.hydra) {
        const dxh = v.wx - x, dzh = v.wz - z, lh = Math.hypot(dxh, dzh) || 1, dh = [dxh / lh, 0.3, dzh / lh];
        if (!game.visualOnly) this.hp -= dmg * 0.6;
        b.flash = 1;
        const resH = this.knightCarve(() => b.afterCarve(b.carveSphere(v.wx, v.wy, v.wz, 0.18 + dmg / 280, game.particles, dh[0], 0.6, dh[2], 20), game.gibs, dh[0] * 3, 2, dh[2] * 3), game);
        this.kx += dh[0] * 5; this.kz += dh[2] * 5;
        if (!game.visualOnly) this.burn = Math.max(this.burn || 0, 1.5);   // la explosión cauteriza
        return this.hydraAfter(resH, dh, game, true);
      }
      if (!game.visualOnly) this.hp -= dmg;
      b.flash = 1;
      const dx = v.wx - x, dz = v.wz - z, l = Math.hypot(dx, dz) || 1;
      const dir = [dx / l, 0.3, dz / l];
      const removed = b.carveSphere(v.wx, v.wy, v.wz, 0.18 + dmg / 280, game.particles, dir[0], 0.6, dir[2], 20);
      this.kx += dir[0] * 6; this.kz += dir[2] * 6;
      this.fl.vx += 8;
      if (game.visualOnly) { b.afterCarve(removed, game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5); return false; }
      return this.afterDamage(removed, dir, game);
    }

    afterDamage(removed, dir, game, pn = '') {
      const b = this.body;
      const res = b.afterCarve(removed, game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5);
      if (Object.keys(res).length) VX.Audio.snap();
      if (res.torso === 'halved') { game.hud.toast('¡PARTIDO EN DOS!'); this.hp = 0; }
      if (b.broken('head', 0.55)) {
        if (!b.byName.head.detached) b.detach('head', game.gibs, dir[0] * 3, 2.5, dir[2] * 3);
        game.stats.headshots++;
        VX.Profile.add('headshots', 1, game);
        VX.Profile.addW(this.lastW, 'heads', 1, game);
        this.hp = 0;
      }
      const legHit = pn.startsWith('leg');
      const legGone = b.broken('legL', 0.6) || b.broken('legR', 0.6) || (legHit && this.hp < this.maxHp * 0.55 && !this.T.bones && Math.random() < 0.4);
      if (this.T.quad) {
        // el perro cojea con cualquier pata rota
        if (legGone || b.broken('armL', 0.45) || b.broken('armR', 0.45)) this.limp = true;
      } else {
        if (legGone && !this.crawling && this.hp > 0) {
          this.crawling = true;
          this.fallT = FALL_TIME;
          this.windup = 0; this.spitting = false;
          game.hud.toast('¡Pierna destrozada!');
        }
        this.armsLost = (b.broken('armL', 0.4) ? 1 : 0) + (b.broken('armR', 0.4) ? 1 : 0);
        if (this.armsLost >= 2 && !this.biter) { this.biter = true; if (!this.spitting) this.windup = 0; }
      }
      if (b.ratio('torso') < 0.4) this.hp = 0;
      if (this.hp <= 0) { this.die(dir, game); return true; }
      return false;
    }

    die(dir, game) {
      if (this.dead) return;
      // el caballero negro sólo cae si le rompes el corazón (ni el fuego, ni la lava, ni los derrumbes)
      if ((this.T.knight || this.T.hydra) && !this.allowDie) { this.hp = Math.max(1, this.hp); return; }
      this.dead = true;
      // cooperativo: si lo he matado yo en mi equipo, el anfitrión lo da por muerto
      if (VX.Coop.isClient && game.localAct && !game.noReward) VX.Coop.reportKill(this);
      if (this.T.pile) { this.pileDie(dir, game); return; }
      if (this.T.knight) {
        // el corazón estalla y la armadura vacía se desmorona
        const core = this.body.byName.core, cx = core && core.wp ? core.wp[0] : this.x, cy = core && core.wp ? core.wp[1] : this.y + 1.2, cz = core && core.wp ? core.wp[2] : this.z;
        for (let i = 0; i < 40; i++) game.particles.spawn(cx, cy, cz, M.rand(-5, 5), M.rand(0, 6), M.rand(-5, 5), 0.8, 0.3, 1, M.rand(0.03, 0.07), M.rand(0.6, 1.4), 1, 1);
        for (const p of this.body.parts) for (const v of p.vox) if (v.e > 0) v.e = 0;
        VX.Audio.at(cx, cy, cz, () => { VX.Audio.glass && VX.Audio.glass(30); VX.Audio.slam(); }, 5);
        game.shake(0.35);
        game.hud.toast('¡Corazón roto!');
        this.regenQ = [];
      }
      if (this.T.revenant) {
        // deja sus restos: si no los destrozas, vuelve a levantarse más fuerte
        this.body.collapse(game.gibs, dir[0], dir[2], 1.6);
        game.particles.blood(this.x, this.y + 0.9, this.z, dir[0], 0.5, dir[2], 14);
        VX.Audio.at(this.x, this.y + 1.2, this.z, () => { VX.Audio.zombieDie(); }, 4);
        // (en el cooperativo los restos los crea el anfitrión y llegan como réplica)
        if (!VX.Coop.isClient) {
          const pl = new Zombie('revpile', this.x, this.z, game.floor, { y: game.world.groundAt(this.x, this.z), gen: (this.gen || 0) + 1 });
          pl.body.yaw = Math.random() * 6.28; pl.body.computeWorld();
          game.enemies.push(pl);
        }
        if (!game.revHint) { game.revHint = true; game.hud.banner('SUS RESTOS SE MUEVEN', 'Destrózalos o volverá más fuerte', 3); }
        else game.hud.toast('¡Destroza sus restos!');
        return;
      }
      const b = this.body;
      // el esqueleto se recompone una vez si no le rompes el cráneo
      if (this.T.reassemble && !this.champion && !this.risen && !(b.byName.head.detached || b.broken('head', 0.55))) {
        b.collapse(game.gibs, dir[0], dir[2], 1.5);
        VX.Audio.crumble();
        game.queueRise(this.x, this.z, this.elite);
        game.hud.toast('Los huesos tiemblan… ¡apunta a la cabeza!');
        return;
      }
      if (this.T.trail) game.addFire(this.x, this.z, 1.4, 4);
      if (this.T.mimic) {
        // el mímico suelta lo que guardaba de verdad
        const up = VX.Upgrades.random(1, game, [], 'rare')[0];
        if (up) game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: this.x, y: game.world.groundAt(this.x, this.z) + 0.3, z: this.z, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape });
        game.hud.banner('MÍMICO DERROTADO', 'Ha escupido su tesoro', 2.5);
      }
      if (this.T.sporeBurst) { game.addFire(this.x, this.z, 1.5, 4, 'poison'); VX.Audio.splat && VX.Audio.splat(); }
      if (this.T.bloat) {   // gordo: revienta en una nube de ácido que quema y frena
        game.addFire(this.x, this.z, 2.6, 6, 'poison');
        const f = game.fires[game.fires.length - 1]; if (f && f.kind === 'poison') f.slow = true;
        for (let i = 0; i < 14; i++) game.particles.spawn(this.x, this.y + 1, this.z, M.rand(-4, 4), M.rand(1, 4), M.rand(-4, 4), 0.5, 0.8, 0.15, M.rand(0.03, 0.05), M.rand(0.5, 1), 0.4);   // salpicones (el gas lo pinta renderGas)
        VX.Audio.at(this.x, this.y + 1, this.z, () => { VX.Audio.splat(); VX.Audio.splat(); }, 5);
        game.shake(0.2);
      }
      // el explosivo revienta también al morir (reacción en cadena)
      if (this.T.explode) game.queueExplosion({ x: this.x, y: this.y + 0.8, z: this.z, R: 2.6, dmg: 42 + game.floor * 2, selfK: 1, delay: 0.25 });
      else if (game.weapon.mods.corpseBlast) game.queueExplosion({ x: this.x, y: this.y + 0.7, z: this.z, R: game.weapon.mods.bigCorpse ? 2.8 : 1.7, dmg: game.weapon.mods.bigCorpse ? 70 : 40, selfK: 0, delay: 0.3 });
      if (game.weapon.mods.burnHeal && this.burn > 0) game.player.heal(5);
      // hidra limpia: quemada o sin brotes vivos -> oro extra y, a veces, su corazón (regenera vida)
      if (this.T.hydra && !(game.noReward || (VX.Coop.isClient && !game.localAct))) {
        const buds = game.enemies.some((e) => !e.dead && e !== this && (e.T.grows || e.T.hydra));
        if (this.cauterized || !buds) {
          game.pickups.dropGold(this.x, this.y + 1, this.z, M.randInt(6, 10));
          if (Math.random() < (this.cauterized ? 0.6 : 0.35)) game.pickups.dropHeart(this.x, this.y + 1.2, this.z, 10, true);
          game.hud.toast(this.cauterized ? '¡Hidra cauterizada! Botín extra' : '¡Hidra sin brotes! Botín extra');
        }
      }
      // pirómano: los que mueren quemados devuelven combustible
      if (game.weapon.mods.pyro && this.burn > 0) { const fl = game.weapon.slots.find((x) => x.id === 'flamer'); if (fl) fl.ammo = Math.min(game.weapon.magFor('flamer'), fl.ammo + Math.ceil(game.weapon.magFor('flamer') * 0.1)); }
      // adrenalina: cada muerte acelera un poco (hasta 3 veces)
      if (game.weapon.mods.adrenaline) { const P = game.player; P.adrenN = P.adrenT > 0 ? Math.min(3, (P.adrenN || 0) + 1) : 1; P.adrenT = 3; }
      if (!this.T.quad && game.remains) { game.remains.push({ x: this.x, z: this.z, kind: this.kind === 'necro' ? 'walker' : this.kind, t: game.time }); if (game.remains.length > 24) game.remains.shift(); }
      if (this.champion) {
        const up = VX.Upgrades.random(1, game, [], 'rare')[0];
        if (up) game.pickups.addItem({ kind: 'upgrade', up, price: 0, x: this.x, y: game.world.groundAt(this.x, this.z) + 0.3, z: this.z, title: up.name + ' ★ RARA', desc: up.desc, color: up.color, shape: up.shape });
        game.pickups.dropGold(this.x, this.y + 1, this.z, 15 + game.floor);
        game.hud.banner('¡CAMPEÓN ABATIDO!', 'Ha dejado algo valioso', 2.5);
        if (game.champion === this) { game.champion = null; game.hud.hideBoss(); }
      }
      b.collapse(game.gibs, dir[0], dir[2], 2.2);
      game.particles.blood(this.x, this.y + 0.9, this.z, dir[0], 0.5, dir[2], 14);
      VX.Audio.at(this.x, this.y + 1.2, this.z, () => { VX.Audio.zombieDie(); }, 4);
      this.reward(game, dir);
    }

    // ---------------- Caballero negro ----------------
    // Lo que se le arranca (placas, brazos, el yelmo…) se queda flotando un instante y vuelve a su sitio.
    knightCarve(fn, game, coreHurts = false) {
      const b = this.body;
      b.ensureAll();
      const before = [];
      // coreHurts: lo que pierde el corazón no vuelve (explosiones que lo pillan de lleno)
      for (const p of b.parts) if (!p.detached && !(coreHurts && p.weak)) for (const v of p.vox) if (v.alive) before.push(p, v);
      const removed = fn();
      const touched = new Set();
      for (let i = 0; i < before.length; i += 2) {
        const p = before[i], v = before[i + 1];
        if (!v.alive) { this.regenQ.push({ p, v, t: M.rand(2, 3.5) }); touched.add(p); }
      }
      for (const p of touched) if (!p.detached) VX.updateExposure(p);
      return removed;
    }
    // tras un golpe en la armadura: se le pueden arrancar piernas, brazos o la cabeza como a cualquiera
    // (se arrastra, muerde…), pero mientras el corazón aguante todo le vuelve a crecer
    knightAfter(res, dir, game) {
      const b = this.body;
      if (Object.keys(res).length) VX.Audio.snap();
      if (b.byName.core && b.byName.core.detached) { this.allowDie = true; this.hp = 0; this.die(dir, game); return true; }
      if (res.head === 'detached' || res.head === 'severed' || (b.byName.head && !b.byName.head.detached && b.broken('head', 0.45))) {
        if (!b.byName.head.detached) b.detach('head', game.gibs, dir[0] * 3, 2.5, dir[2] * 3);
        if (game.hud && !this.headHint) { this.headHint = true; game.hud.toast('¡Decapitado!… y sigue andando: la cabeza le volverá a salir'); }
      }
      const legGone = b.broken('legL', 0.55) || b.broken('legR', 0.55);
      if (legGone && !this.crawling) {
        if (b.byName.legL && !b.byName.legL.detached && b.broken('legL', 0.55)) b.detach('legL', game.gibs, dir[0] * 2, 1.5, dir[2] * 2);
        if (b.byName.legR && !b.byName.legR.detached && b.broken('legR', 0.55)) b.detach('legR', game.gibs, dir[0] * 2, 1.5, dir[2] * 2);
        this.crawling = true; this.rising = false;
        this.fallT = FALL_TIME; this.windup = 0;
        game.hud && game.hud.toast('¡Pierna arrancada! Se arrastra… hasta que le vuelva a crecer');
      }
      for (const a of ['armL', 'armR']) if (b.byName[a] && !b.byName[a].detached && b.broken(a, 0.4)) b.detach(a, game.gibs, dir[0] * 2, 1.5, dir[2] * 2);
      this.armsLost = (b.broken('armL', 0.4) ? 1 : 0) + (b.broken('armR', 0.4) ? 1 : 0);
      if (this.armsLost >= 2) { this.biter = true; this.windup = 0; }
      return false;
    }
    knightRegen(dt, game) {
      const b = this.body;
      if (this.dead || !b) return;
      if (this.T.hydra && this.burn > 0) return;   // el fuego cauteriza: mientras arde no se regenera
      if (this.T.hydra && !game.visualOnly && !VX.Coop.isClient) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.12 * dt);   // la vida también vuelve
      // las partes arrancadas vuelven a crecer desde la articulación (primero el padre, luego lo que cuelga)
      for (const p of b.parts) {
        if (!p.detached || p.weak) continue;
        if (this.T.hydra && HEADS(p)) continue;   // la cabeza de la hidra no vuelve
        const par = p.parent && b.byName[p.parent];
        if (par && par.detached) continue;
        if (!p.regrowT) { p.regrowT = this.T.hydra ? M.rand(2.5, 3.5) : M.rand(4, 5.5); continue; }
        p.regrowT -= dt;
        if (p.regrowT > 0) continue;
        p.regrowT = 0; p.detached = false; p.severed = false;
        const h = p.dims ? p.dims[1] : 1;
        for (const v of p.vox) {
          if (v.orig === false) continue;
          const d = p.attach === 'top' ? (h - 1 - (v.j || 0)) : (v.j || 0);
          if (v.alive) { v.alive = false; }
          (this.regenQ || (this.regenQ = [])).push({ p, v, t: 0.05 + d * 0.06 + Math.random() * 0.15 });
        }
        p.alive = 0;
        VX.updateExposure(p);
        const rc = this.T.hydra ? [0.55, 1, 0.3] : [0.7, 0.25, 1];
        if (Math.random() < 0.5 && p.wp) for (let i = 0; i < 8; i++) game.particles.spawn(p.wp[0], p.wp[1], p.wp[2], M.rand(-0.6, 0.6), M.rand(0.2, 1.2), M.rand(-0.6, 0.6), rc[0], rc[1], rc[2], 0.03, 0.6, 1, 1);
      }
      // una pierna o un brazo «cortado» que ya ha vuelto a crecer deja de contar como cortado
      for (const p of b.parts) if (p.severed && !p.detached && p.alive / p.total > 0.85) p.severed = false;
      // con las dos piernas otra vez, se levanta
      if (this.crawling && this.fallT <= 0 && !b.broken('legL', 0.7) && !b.broken('legR', 0.7)) this.rising = true;
      if (this.rising) {
        this.crawlC = Math.max(0, (this.crawlC || 0) - dt * 1.1);
        if (this.crawlC <= 0) { this.crawling = false; this.rising = false; }
      }
      if (this.biter && !b.broken('armL', 0.5) && !b.broken('armR', 0.5)) { this.biter = false; this.armsLost = 0; }
      const Q = this.regenQ;
      if (!Q || !Q.length) return;
      const touched = new Set();
      for (const r of Q) {
        if (r.p.detached) continue;   // espera a que la parte vuelva a crecer
        r.t -= dt;
        if (r.t > 0) continue;
        if (!r.v.alive) { r.v.alive = true; r.p.alive++; touched.add(r.p); if (Math.random() < 0.08 && r.v.wx) game.particles.spawn(r.v.wx, r.v.wy, r.v.wz, M.rand(-0.3, 0.3), M.rand(0.2, 0.8), M.rand(-0.3, 0.3), this.T.hydra ? 0.55 : 0.7, this.T.hydra ? 1 : 0.25, this.T.hydra ? 0.3 : 1, 0.025, 0.5, 1, 1); }
        r.done = true;
      }
      if (touched.size) { for (const p of touched) VX.updateExposure(p); this.regenQ = Q.filter((r) => !r.done); }
    }
    knightHit(hit, dmg, ray, game, opts) {
      const b = this.body, dir = [ray.dx, ray.dy, ray.dz], pn = hit.part.name;
      const ex = hit.vox.wx, ey = hit.vox.wy, ez = hit.vox.wz;
      if (pn === 'core') {
        // ¡en el corazón!
        if (!game.visualOnly) this.hp -= dmg * (opts && opts.slash ? 1.5 : 1);
        b.flash = 1;
        const removed = b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles, 0.6);
        void removed; VX.updateExposure(b.byName.core);
        for (let i = 0; i < 10; i++) game.particles.spawn(ex, ey, ez, -dir[0] * 2 + M.rand(-1, 1), M.rand(0, 2), -dir[2] * 2 + M.rand(-1, 1), 0.85, 0.35, 1, 0.03, 0.6, 1, 1);
        VX.Audio.glass && VX.Audio.glass(8);
        this.kx += dir[0] * 1.2; this.kz += dir[2] * 1.2;
        if (!game.visualOnly && (this.hp <= 0 || b.ratio('core') < 0.3)) { this.allowDie = true; this.hp = 0; this.die(dir, game); return true; }
        return false;
      }
      // en la armadura: chispas, salta un trozo (o el miembro entero)… y se le vuelve a unir
      const res = this.knightCarve(() => b.afterCarve(b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles, 0.8), game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5), game);
      if (this.knightAfter(res, dir, game)) return true;
      game.particles.sparks(ex, ey, ez, -dir[0], 0.3, -dir[2], 5);
      for (let i = 0; i < 3; i++) game.particles.spawn(ex, ey, ez, -dir[0] + M.rand(-0.5, 0.5), M.rand(0, 1), -dir[2] + M.rand(-0.5, 0.5), 0.5, 0.15, 0.8, 0.025, 0.5, 1, 1);
      VX.Audio.wall();
      b.flash = 0.25;
      this.kx += dir[0] * 0.3; this.kz += dir[2] * 0.3;
      if (!this.knightHint && game.hud) { this.knightHint = true; game.hud.toast('La armadura se le vuelve a unir: ¡dale en el corazón que brilla en el pecho!'); }
      return false;
    }

    // ---------------- Hidra ----------------
    // Se le puede arrancar todo (piernas, brazos, medio cuerpo) y le vuelve a crecer; de cada trozo
    // arrancado brota otra hidra si no rompes el brote a tiempo. Sólo muere si le revientas la cabeza.
    hydraHit(hit, dmg, ray, game, opts) {
      const b = this.body, dir = [ray.dx, ray.dy, ray.dz];
      const head = HEADS(hit.part);
      // la flor es el punto débil; con la boca abierta, mucho más (x4)
      const open = head && this.mouthOpen > 0;
      if (!game.visualOnly) this.hp -= dmg * (head ? (open ? 4 : 2.5) : 0.6);
      if (open) { game.hud.hitmarker && game.hud.hitmarker(true); for (let i = 0; i < 6; i++) game.particles.spawn(hit.vox.wx, hit.vox.wy, hit.vox.wz, M.rand(-2, 2), M.rand(1, 3), M.rand(-2, 2), 1, 0.9, 0.3, 0.03, 0.5, 1, 1); }
      b.flash = 0.8;
      const res = this.knightCarve(() => b.afterCarve(b.cutFor(hit, dmg, ray, opts, game.weapon.destruction, game.particles), game.gibs, dir[0] * 2.5, 1.5, dir[2] * 2.5), game);
      const ex = hit.vox.wx, ey = hit.vox.wy, ez = hit.vox.wz;
      game.particles.blood(ex, ey, ez, -dir[0] * 0.5, 0.3, -dir[2] * 0.5, 5);
      for (let i = 0; i < 3; i++) game.particles.spawn(ex, ey, ez, -dir[0] + M.rand(-0.6, 0.6), M.rand(0, 1.2), -dir[2] + M.rand(-0.6, 0.6), 0.5, 0.9, 0.25, 0.022, 0.5, 0.6);   // savia
      VX.Audio.flesh();
      this.kx += dir[0] * (0.4 + dmg / 60); this.kz += dir[2] * (0.4 + dmg / 60);
      const fireHit = (game.weapon.def && game.weapon.def.flame && game.dmgSource === 'gun') || (game.weapon.mods.fire && !(opts && opts.slash)) || (game.weapon.mods.magnesium && game.weapon.stats().pellets > 1);
      if (fireHit && !game.visualOnly) this.burn = Math.max(this.burn || 0, 3);
      // heridas que brotan: el daño al cuerpo se acumula como savia; al pasar del umbral, la herida
      // burbujea y, si no la quemas a tiempo, brota otra hidra de ahí
      if (!head && !game.visualOnly && !(this.burn > 0)) this.addSap(dmg, ex, ey, ez, game);
      return this.hydraAfter(res, dir, game, fireHit);
    }
    addSap(dmg, x, y, z, game) {
      this.sap = (this.sap || 0) + dmg;
      const th = this.maxHp * 0.35;
      if (this.sap < th || VX.Coop.isClient) return;
      this.sap -= th;
      if (this.woundQ.length < 3) this.woundQ.push({ x, y, z, t: 1.4, dx: x - this.x, dz: z - this.z, dy: y - this.y });
      if (!game.sapHint) { game.sapHint = true; game.hud.toast('¡La herida burbujea! Quémala o va a brotar otra hidra'); }
    }
    hydraAfter(res, dir, game, caut) {
      const b = this.body;
      // lo que pierde la cabeza no vuelve a crecer
      if (this.regenQ) this.regenQ = this.regenQ.filter((r) => !HEADS(r.p));
      const gone = (n) => { if (this.twinGrowT > 0) return false; const h = b.byName[n]; return !h || h.detached || res[n] === 'detached' || res[n] === 'severed' || b.broken(n, 0.5); };
      const headsDown = this.twin ? gone('head') && gone('head2') : gone('head');
      if (this.twin && !game.visualOnly) for (const n of ['head', 'head2']) { const h = b.byName[n]; if (h && !h.detached && gone(n)) { b.detach(n, game.gibs, dir[0] * 3, 2.5, dir[2] * 3); game.hud.toast('¡Una cabeza menos! Queda otra'); } }
      if (headsDown) {
        if (game.visualOnly) return false;
        for (const n of ['head', 'head2']) { const h = b.byName[n]; if (h && !h.detached) b.detach(n, game.gibs, dir[0] * 3, 2.5, dir[2] * 3); }
        game.stats.headshots++;
        VX.Profile.add('headshots', 1, game);
        VX.Profile.addW(this.lastW, 'heads', 1, game);
        // corta una cabeza y salen dos: si no la has quemado ni volado, del cuello brotan dos
        const burnt = caut || this.burn > 0 || game.dmgSource === 'blast';
        if (!this.twin && !burnt && !this.gen && !VX.Coop.isClient) { this.becomeTwin(game, dir); return false; }
        this.cauterized = burnt;
        this.allowDie = true; this.hp = 0; this.regenQ = []; this.woundQ = [];
        this.die(dir, game);
        return true;
      }
      if (game.visualOnly) return false;
      const was = new Set(b.parts.filter((p) => p.detached).map((p) => p.name));
      this.knightAfter(res, dir, game);
      // de cada brazo arrancado también puede brotar otra (si no está ardiendo)
      const cut = b.parts.filter((p) => p.detached && !was.has(p.name) && !HEADS(p) && /^(arm|leg)/.test(p.name) && p.total > 6);
      if (!(this.burn > 0) && !caut) for (const p of cut) this.sprout(game, p, dir);
      if (!this.hydraHint && game.hud) { this.hydraHint = true; game.hud.toast('Le vuelve a crecer todo: dispara dentro de la flor cuando abra la boca'); }
      return false;
    }
    // la cabeza cortada se convierte en dos
    becomeTwin(game, dir) {
      const old = this.body;
      const twin = new Zombie('hydra', this.x, this.z, game.floor, { y: this.y, twin: true, mother: this.mother });
      const b = twin.body;
      b.yaw = old.yaw; b.x = this.x; b.y = this.y; b.z = this.z;
      // las cabezas nuevas crecen desde el cuello
      this.regenQ = [];
      for (const p of b.parts) {
        if (!/^(neck2?|head2?)/.test(p.name) && !(p.parent && /^(neck2?|head2?)/.test(p.parent))) continue;
        for (const v of p.vox) if (v.alive) { v.alive = false; p.alive--; this.regenQ.push({ p, v, t: 0.1 + Math.min(1.5, Math.max(0, v.y + 0.5) * 0.45) + Math.random() * 0.25 }); }
        VX.updateExposure(p);
      }
      for (const p of b.parts) for (const v of p.vox) v.orig = v.alive || this.regenQ.some((r) => r.v === v);
      this.body = b; this.twin = true; this.twinGrowT = 2.2;
      this.hp = this.maxHp * 0.7;
      b.computeWorld();
      game.shake(0.3); VX.Audio.roar();
      for (let i = 0; i < 30; i++) game.particles.spawn(this.x, this.y + 2.3, this.z, M.rand(-2, 2), M.rand(1, 4), M.rand(-2, 2), 0.5, 0.9, 0.25, 0.04, 0.8, 0.6);
      game.hud.banner('¡LE SALEN DOS CABEZAS!', 'Córtale la cabeza con fuego o explosivos… o rómpele las dos', 2.6);
    }
    // heridas que burbujean y brotan (si no se queman antes)
    updateWounds(dt, game) {
      if (!this.woundQ.length) return;
      for (const w of this.woundQ) {
        w.t -= dt;
        const cy = Math.cos(this.body.yaw), sy = Math.sin(this.body.yaw);
        const x = this.x + w.dx, y = this.y + w.dy, z = this.z + w.dz;
        if (Math.random() < 0.6) game.particles.spawn(x + M.rand(-0.1, 0.1), y, z + M.rand(-0.1, 0.1), M.rand(-0.5, 0.5), M.rand(0.5, 1.5), M.rand(-0.5, 0.5), 0.55, 1, 0.3, M.rand(0.03, 0.06), 0.5, 1, 1);
        void cy; void sy;
        if (this.burn > 0) { w.t = -99; for (let i = 0; i < 8; i++) game.particles.spawn(x, y, z, M.rand(-1, 1), M.rand(1, 2), M.rand(-1, 1), 0.2, 0.2, 0.2, 0.05, 0.8, 0); continue; }   // cauterizada
        if (w.t <= 0) { w.t = -99; this.sprout(game, { wp: [x, y, z] }, [w.dx, 0, w.dz]); VX.Audio.flesh(); }
      }
      this.woundQ = this.woundQ.filter((w) => w.t > -50);
    }
    sprout(game, p, dir) {
      if (VX.Coop.isClient || (this.gen || 0) >= 2) return;
      let n = 0;
      for (const e of game.enemies) if (!e.dead && (e.T.hydra || e.T.grows)) n++;
      if (n >= 9) return;
      const px = (p && p.wp ? p.wp[0] : this.x) + dir[0] * 0.7 + M.rand(-0.3, 0.3), pz = (p && p.wp ? p.wp[2] : this.z) + dir[2] * 0.7 + M.rand(-0.3, 0.3);
      const room = game.currentRoom;
      let x = px, z = pz;
      if (room && !room.contains(x, z)) { x = this.x; z = this.z; }
      if (game.world.isSolidAt(x, game.world.groundAt(x, z) + 0.3, z)) { x = this.x; z = this.z; }
      const bud = new Zombie('hydrabud', x, z, game.floor, { y: game.world.groundAt(x, z), gen: (this.gen || 0) + 1 });
      bud.body.yaw = Math.random() * 6.28; bud.body.computeWorld();
      game.enemies.push(bud);
      for (let i = 0; i < 10; i++) game.particles.spawn(x, bud.y + 0.2, z, M.rand(-1.5, 1.5), M.rand(1, 3), M.rand(-1.5, 1.5), 0.5, 0.9, 0.25, 0.03, 0.7, 0.6);
    }
    // conducta propia de la hidra: mordisco en embestida, escupitajo de savia y comer cadáveres
    hydraBrain(dt, game, dist, toX, toZ) {
      const P = game.player;
      this.biteCd -= dt; this.hspitCd -= dt; this.eatCd -= dt;
      if (this.eating) {
        // comiendo un cadáver: se cura y echa un brote
        this.eatT -= dt; this.mouthOpen = 0.3;
        if (Math.random() < 0.4) game.particles.blood(this.eating.body.x, this.y + 0.3, this.eating.body.z, M.rand(-1, 1), 1.5, M.rand(-1, 1), 2);
        if (this.eatT <= 0) {
          const c = this.eating; this.eating = null;
          c.life = Math.min(c.life, 0.2);
          this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.35);
          this.sprout(game, { wp: [c.body.x, this.y, c.body.z] }, [0, 0, 0]);
          VX.Audio.bite && VX.Audio.bite();
          this.eatCd = 8;
        }
        return { gx: 0, gz: 0, want: 0 };
      }
      // ¿un cadáver cerca y tú lejos? va a comérselo
      if (this.eatCd <= 0 && dist > 5 && game.corpses.length && !VX.Coop.isClient) {
        let best = null, bd = 7;
        for (const c of game.corpses) { if (!c.body || c.life < 3) continue; const d = Math.hypot(c.body.x - this.x, c.body.z - this.z); if (d < bd) { bd = d; best = c; } }
        if (best) {
          if (bd < 1.4) { this.eating = best; this.eatT = 1.6; if (!game.eatHint) { game.eatHint = true; game.hud.toast('¡La hidra se está comiendo un cadáver!'); } return { gx: 0, gz: 0, want: 0 }; }
          const l = bd || 1;
          return { gx: (best.body.x - this.x) / l, gz: (best.body.z - this.z) / l, want: 1.1 };
        }
        this.eatCd = 1;
      }
      // mordisco en embestida: abre la flor (punto débil x4), se echa atrás y se lanza
      if (this.los && dist > 2.2 && dist < 5.5 && this.biteCd <= 0 && Math.abs(P.y - this.y) < 1.2) {
        this.state = 'chargeWind'; this.stateT = 0.75; this.chargeX = toX; this.chargeZ = toZ; this.mouthOpen = 1.3;
        this.biteCd = M.rand(4, 6.5); VX.Audio.roar(); game.shake(0.12);
        return null;
      }
      // escupitajo de savia a distancia (deja un charco que frena)
      if (this.los && dist > 6 && dist < 14 && this.hspitCd <= 0 && this.windup <= 0) {
        this.windup = 0.7; this.windTotal = 0.7; this.spitting = true; this.mouthOpen = 0.9; this.hspitCd = M.rand(4, 7);
      }
      return null;
    }
    hydraSpit(game) {
      const P = game.player, h = this.body.byName.head && !this.body.byName.head.detached ? this.body.byName.head : this.body.byName.head2;
      const sx = h && h.wp ? h.wp[0] : this.x, sy = h && h.wp ? h.wp[1] : this.y + 2.4, sz = h && h.wp ? h.wp[2] : this.z;
      const tx = P.x + P.vx * 0.4, tz = P.z + P.vz * 0.4;
      const d = Math.hypot(tx - sx, tz - sz), T = 0.5 + d * 0.05;
      game.projectiles.push({ x: sx, y: sy, z: sz, vx: (tx - sx) / T, vy: (P.y + 0.5 - sy + 0.5 * 18 * T * T) / T, vz: (tz - sz) / T,
        dmg: this.dmg * 0.7, life: 3, rot: 0, col: [0.55, 0.95, 0.25], glow: 0.8, blastR: 0.4, blockDmg: 15, acid: true, size: 0.08, sap: true, src: 'Un escupitajo de la hidra' });
      VX.Audio.bite && VX.Audio.bite();
    }

    // ---------------- Restos del renacido ----------------
    // lo que se ve y se oye mientras late (también en las réplicas del cooperativo)
    pileVisual(dt, game) {
      const b = this.body;
      if (this.replica) this.pileT = Math.max(0, this.pileT - dt);
      const k = 1 - Math.max(0, this.pileT) / this.pileMax;
      // late cada vez más deprisa y suelta vapor
      b.flash = Math.max(b.flash, Math.max(0, Math.sin(game.time * (3 + k * 12))) * (0.2 + k * 0.6));
      if (Math.random() < 0.15 + k * 0.4) game.particles.spawn(this.x + M.rand(-0.35, 0.35), this.y + 0.2, this.z + M.rand(-0.35, 0.35), 0, M.rand(0.4, 1.2), 0, this.T.grows ? 0.45 : 0.5, this.T.grows ? 0.8 : 0.12, this.T.grows ? 0.25 : 0.1, 0.035, 0.7, 0.3);
      this.heartT = (this.heartT || 0) - dt;
      if (this.heartT <= 0) { this.heartT = Math.max(0.25, 1.1 - k * 0.85); VX.Audio.at(this.x, this.y + 0.3, this.z, () => VX.Audio.heartbeat(0.6 + k * 0.6), 3, 'enemy'); }
      b.x = this.x; b.z = this.z; b.y = this.y;
      b.computeWorld();
    }
    updatePile(dt, game) {
      this.pileT -= dt;
      // dos brotes que se tocan se funden en una hidra madre
      if (this.T.grows && !VX.Coop.isClient && !game.visualOnly) for (const o of game.enemies) {
        if (o === this || o.dead || !o.T.grows || Math.hypot(o.x - this.x, o.z - this.z) > 1.4) continue;
        this.dead = o.dead = true;
        const x = (this.x + o.x) / 2, z = (this.z + o.z) / 2;
        const m = new Zombie('hydra', x, z, game.floor, { y: game.world.groundAt(x, z), gen: Math.max(this.gen || 1, o.gen || 1), mother: true });
        game.enemies.push(m);
        game.shake(0.3); VX.Audio.roar();
        for (let i = 0; i < 30; i++) game.particles.spawn(x, m.y + 0.5, z, M.rand(-2, 2), M.rand(1, 4), M.rand(-2, 2), 0.5, 0.9, 0.25, 0.05, 0.9, 0.6);
        game.hud.banner('¡HIDRA MADRE!', 'Dos brotes se han fundido: más grande, más fuerte', 2.5);
        return;
      }
      this.pileVisual(dt, game);
      if (this.pileT <= 0 && !game.visualOnly) {
        // ¡se levanta otra vez! (en el cooperativo, los demás quitan sus restos sin «destrozarlos»)
        if (VX.Coop.active && this.netId) VX.Net.send({ k: 'prise', id: this.netId });
        this.dead = true;
        const z = this.T.grows ? new Zombie(this.T.grows, this.x, this.z, game.floor, { y: this.y, gen: this.gen })
          : new Zombie('revenant', this.x, this.z, game.floor, { y: this.y, gen: this.gen, elite: this.gen >= 3 });
        game.enemies.push(z);
        for (let i = 0; i < 24; i++) game.particles.spawn(this.x, this.y + 0.3, this.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), 0.55, 0.08, 0.08, M.rand(0.03, 0.06), M.rand(0.5, 1.2));
        VX.Audio.at(this.x, this.y + 1, this.z, () => { VX.Audio.roar(); }, 6);
        if (this.T.grows) game.hud.toast('¡Ha brotado otra hidra! Rompe los brotes antes de que crezcan');
        else game.hud.banner('¡HA VUELTO A LEVANTARSE!', this.gen >= 2 ? 'Cada vez más fuerte: destroza sus restos' : 'Más fuerte que antes', 2.4);
      }
    }
    pileHit(hit, dmg, ray, game, opts) {
      const b = this.body, dir = [ray.dx, ray.dy, ray.dz];
      if (!game.visualOnly) this.hp -= dmg;
      b.flash = 0.8;
      const removed = b.cutFor(hit, dmg * 1.5, ray, opts, game.weapon.destruction, game.particles);
      b.afterCarve(removed, game.gibs, dir[0] * 2, 1.2, dir[2] * 2);
      game.particles.blood(hit.vox.wx, hit.vox.wy, hit.vox.wz, -dir[0] * 0.5, 0.4, -dir[2] * 0.5, 6);
      VX.Audio.flesh();
      // también cuenta lo destrozado: si ya no queda ni la mitad de la carne, se acabó
      // (antes, con los disparos atravesando el agujero, podía quedar «vivo» sin carne que darle)
      if (!game.visualOnly && b.ratio('torso') < 0.5) this.hp = 0;
      if (this.hp <= 0 && !game.visualOnly) { this.die(dir, game); return true; }
      return false;
    }
    pileDie(dir, game) {
      if (this.rose) {   // réplica: en el anfitrión se ha levantado otra vez; aquí sólo desaparecen los restos
        for (let i = 0; i < 24; i++) game.particles.spawn(this.x, this.y + 0.3, this.z, M.rand(-3, 3), M.rand(1, 5), M.rand(-3, 3), 0.55, 0.08, 0.08, M.rand(0.03, 0.06), M.rand(0.5, 1.2));
        return;
      }
      this.body.collapse(game.gibs, dir[0], dir[2], 2.5);
      game.particles.blood(this.x, this.y + 0.3, this.z, dir[0], 1, dir[2], 20);
      VX.Audio.at(this.x, this.y + 0.5, this.z, () => { VX.Audio.splat(); VX.Audio.crumble(); }, 4);
      if (this.T.grows) { if (!(game.noReward || (VX.Coop.isClient && !game.localAct))) game.pickups.dropGold(this.x, this.y + 0.4, this.z, 1); return; }   // brote roto: no crece
      game.hud.toast('Restos destrozados: ya no volverá');
      // la recompensa es por acabar con él de verdad
      if (!(game.noReward || (VX.Coop.isClient && !game.localAct))) {
        game.pickups.dropGold(this.x, this.y + 0.5, this.z, M.randInt(4, 7) + this.gen * 3);
        game.stats.kills++;
        VX.Profile.add('kills', 1, game);
        VX.Profile.addW(this.lastW, 'kills', 1, game);
        VX.Profile.codexKill('revenant');
        game.onKill(this);
      }
    }

    reward(game) {
      // cooperativo: el oro y las estadísticas son de quien lo mata (a los demás que le dieron, asistencia)
      if (game.noReward || (VX.Coop.isClient && !game.localAct)) { if (VX.Coop.isHost && game.mode === 'horde') VX.HordeMode.killed++; VX.Coop.noteAssist && VX.Coop.noteAssist(this, game); return; }
      VX.Coop.noteSave && VX.Coop.noteSave(this, game);
      game.pickups.dropGold(this.x, this.y + 0.8, this.z, M.randInt(this.gold[0], this.gold[1]) * (game.weapon.mods.greed ? 2 : 1));
      // a veces suelta algo para lanzar (los élites y campeones, bastante más)
      if (!this.champion && Math.random() < (this.elite ? 0.25 : 0.02) && VX.Throw.randomType(game.weapon)) {   // el campeón ya suelta su mejora: sólo una cosa
        const t = VX.Throw.randomType(game.weapon), gy = game.world.groundAt(this.x, this.z);
        game.pickups.addItem({ ...VX.Throw.item(t, 1, 0), x: this.x, y: gy + 0.3, z: this.z });
      }
      // llaves al azar (sólo en la mazmorra): pocas, más de los élites y del campeón
      if (game.mode !== 'horde' && !this.T.pile && game.dropKey && Math.random() < (this.champion ? 0.3 : this.elite ? 0.1 : this.T.boss ? 0.5 : 0.022)) {
        game.dropKey(game.rollKeyTier(this.champion || this.T.boss ? 0.8 : this.elite ? 0.4 : 0), this.x, this.y + 1.1, this.z);
      }
      game.stats.kills++;
      VX.Profile.add('kills', 1, game);
      if (game.dmgSource === 'knife') { VX.Profile.add('knifeKills', 1, game); if (this.elite || this.champion) VX.Profile.add('knifeElites', 1, game); }
      VX.Profile.addW(this.lastW, 'kills', 1, game);
      VX.Profile.codexKill(this.kind);
      if (this.elite) VX.Profile.addW(this.lastW, 'elites', 1, game);
      if (game.weapon.mods.lifesteal) game.player.heal(3);
      game.onKill(this);
    }

    render(batch) { if (this.lod) this.body.renderCoarse(batch); else this.body.render(batch); }
  }

  Zombie.TYPES = TYPES;
  VX.Zombie = Zombie;
})();
