// Coordinador de la horda: los zombis no atacan todos a la vez ni se amontonan.
// - "Turnos de ataque": sólo unos pocos (según el piso) van a por ti; el resto espera
//   formando un anillo a tu alrededor que se va cerrando poco a poco (te acorralan).
// - Cada zombi del anillo recibe un hueco repartido alrededor del jugador.
// - Al final de cada frame se separan los cuerpos que se solapan.
(function () {
  const M = VX.M;
  const TAU = Math.PI * 2;

  const Horde = {
    t: 0,
    engageT: 0,
    ringR: 4.5,

    reset() { this.t = 0; this.engageT = 0; this.ringR = 4.5; },

    // ¿Participa este enemigo en el sistema de turnos/anillo?
    member(e) {
      return !e.dead && !e.isBoss && e.spawnT <= 0 && !e.crawling && e.B && e.B.ring;
    },

    update(game, dt) {
      const P = game.player;
      const list = game.enemies.filter((e) => this.member(e));
      if (!list.length) { this.engageT = Math.max(0, this.engageT - dt * 4); this.ringR = 4.5; return; }
      // cuanto más dura el combate, más se cierra el cerco
      this.engageT += dt;
      this.ringR = Math.max(2.4, 4.6 - this.engageT * 0.06);
      for (const e of list) e.waitT = (e.waitT || 0) + (e.token ? 0 : dt);
      this.t -= dt;
      if (this.t > 0) return;
      this.t = 0.3;

      // --- turnos de ataque ---
      const maxTok = Math.min(5, 2 + Math.floor(game.floor / 5));
      const scored = list.map((e) => {
        const d = Math.hypot(e.x - P.x, e.z - P.z);
        // los que ya lo tenían lo conservan; los que llevan mucho esperando tienen prioridad
        let s = d - (e.token ? 1.5 : 0) - Math.min(3, e.waitT * 0.35) - (e.B.eager || 0);
        if (!e.los) s += 3;
        return { e, s, d };
      });
      scored.sort((a, b) => a.s - b.s);
      scored.forEach((o, i) => {
        const had = o.e.token;
        o.e.token = i < maxTok && o.d < 14;
        if (o.e.token && !had) o.e.waitT = 0;
      });

      // --- huecos del anillo (sólo los que esperan y ven al jugador) ---
      const ring = scored.filter((o) => !o.e.token && o.d < 12).map((o) => o.e);
      const n = ring.length;
      if (!n) return;
      const ang = ring.map((e) => Math.atan2(e.z - P.z, e.x - P.x));
      const idx = ring.map((_, i) => i).sort((a, b) => ang[a] - ang[b]);
      // giro del reparto que menos movimiento exige (media circular)
      let sx = 0, sz = 0;
      idx.forEach((k, i) => { const a = ang[k] - (i * TAU) / n; sx += Math.cos(a); sz += Math.sin(a); });
      const base = Math.atan2(sz, sx);
      idx.forEach((k, i) => { ring[k].ringA = base + (i * TAU) / n; });
    },

    // Empuje físico entre cuerpos para que no se atraviesen
    separate(game) {
      const L = game.enemies;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        if (a.dead || a.isBoss || a.spawnT > 0) continue;
        for (let j = i + 1; j < L.length; j++) {
          const b = L[j];
          if (b.dead || b.isBoss || b.spawnT > 0) continue;
          if (Math.abs(a.y - b.y) > 1.2) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
          const min = (a.radius + b.radius) * 0.95;
          if (d >= min) continue;
          const nx = d > 1e-4 ? dx / d : Math.cos(i + j), nz = d > 1e-4 ? dz / d : Math.sin(i + j);
          const push = (min - d) * 0.5;
          // el más pesado se mueve menos
          const wa = b.B.mass / (a.B.mass + b.B.mass), wb = 1 - wa;
          a.tryMove(-nx * push * 2 * wa, 0, game.world); a.tryMove(0, -nz * push * 2 * wa, game.world);
          b.tryMove(nx * push * 2 * wb, 0, game.world); b.tryMove(0, nz * push * 2 * wb, game.world);
        }
      }
    },
  };

  void M;
  VX.Horde = Horde;
})();
