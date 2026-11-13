// Compañero en el cooperativo: muñeco vóxel con el arma en las manos, que sigue suavizado
// la posición que llega por la red. En el anfitrión hace también de «jugador» para los zombis
// (le atacan, le escupen, le empujan) y le reenvía el daño a su dueño.
(function () {
  const M = VX.M;
  // colores de cada jugador (camiseta) y de su nombre en pantalla
  const COLORS = [[0.85, 0.3, 0.2], [0.25, 0.55, 0.9], [0.35, 0.75, 0.3], [0.9, 0.75, 0.2]];

  function avatarModel(idx) {
    const c = COLORS[idx % COLORS.length];
    const cfg = {
      v: 0.05, blocky: true, clean: true, leg: [4, 17, 4], torso: [9, 13, 5], arm: [4, 15, 4], head: [8, 8, 8],
      skin: [[0.86, 0.68, 0.54], [0.72, 0.52, 0.38], [0.55, 0.38, 0.27], [0.9, 0.74, 0.6]][idx % 4],
      shirt: c, pants: [0.17, 0.19, 0.24], shoes: [0.12, 0.1, 0.09], eye: [0.12, 0.12, 0.16],
      hair: [[0.15, 0.1, 0.06, 0.7], [0.45, 0.3, 0.12, 0.7], [0.08, 0.07, 0.07, 0.7], [0.6, 0.45, 0.2, 0.7]][idx % 4],
      ragged: 0, tear: 0, jaw: false, wound: false, extras: [],
    };
    let model = VX.Models.humanoid(cfg);
    // arma corta en la mano derecha
    model = VX.Models.addTool(model, cfg, { tool: 'gun', name: 'gun', arm: 'armR' });
    return model;
  }

  class RemotePlayer {
    constructor(id, name, idx) {
      this.id = id;
      this.name = name;
      this.idx = idx;
      this.color = COLORS[idx % COLORS.length];
      this.body = new VX.VoxelBody(avatarModel(idx), 1);
      this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.pitch = 0;
      this.tx = 0; this.ty = 0; this.tz = 0; this.tyaw = 0; this.tpitch = 0;
      this.vx = 0; this.vz = 0;
      this.hp = 100; this.maxHp = 100;
      this.down = false; this.dead = false;   // caído (se puede reanimar) / muerto hasta la siguiente oleada
      this.weapon = 'pistol';
      this.invuln = 0;
      this.walkT = 0;
      this.seen = false;
      this.lastMsg = 0;
      this.isRemote = true;
      this.shotT = 0;
    }

    // estado que llega por la red
    setState(s) {
      this.tx = s.x; this.ty = s.y; this.tz = s.z; this.tyaw = s.yaw; this.tpitch = s.p;
      if (s.vx !== undefined) { this.vx = s.vx; this.vz = s.vz; }
      if (s.hp !== undefined) this.hp = s.hp;
      if (s.mh !== undefined) this.maxHp = s.mh;
      this.down = !!s.dn; this.dead = !!s.dd;
      if (s.w) this.weapon = s.w;
      if (!this.seen) { this.x = this.tx; this.y = this.ty; this.z = this.tz; this.yaw = this.tyaw; this.pitch = this.tpitch; this.seen = true; }
      this.lastMsg = performance.now();
    }

    update(dt) {
      // posición suavizada (llega 20 veces por segundo); si se ha ido muy lejos, salta
      const k = Math.min(1, dt * 14);
      if (Math.hypot(this.tx - this.x, this.tz - this.z) > 6) { this.x = this.tx; this.z = this.tz; this.y = this.ty; }
      const ox = this.x, oz = this.z;
      this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k;
      let dy = this.tyaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * k;
      this.pitch += (this.tpitch - this.pitch) * k;
      this.invuln = Math.max(0, this.invuln - dt);
      this.shotT = Math.max(0, this.shotT - dt);
      const spd = Math.hypot(this.x - ox, this.z - oz) / Math.max(dt, 1e-4);
      this.animate(dt, spd);
    }

    animate(dt, spd) {
      const b = this.body, P_ = b.byName;
      this.walkT += dt * (spd > 0.3 ? Math.min(spd, 7) * 2.6 : 0);
      const moving = spd > 0.3, sw = moving ? Math.sin(this.walkT) * Math.min(0.75, 0.25 + spd * 0.09) : 0;
      b.x = this.x; b.y = this.y; b.z = this.z; b.yaw = this.yaw;
      if (this.down || this.dead) {
        // tumbado en el suelo, apoyado en un codo
        b.pitch = M.lerp(b.pitch, 1.35, Math.min(1, dt * 6));
        P_.legL.ax = 0.1 + sw * 0.3; P_.legR.ax = -0.1 - sw * 0.3;
        P_.armL.ax = -2.6; P_.armR.ax = -2.2;
        P_.head.ax = -0.9;
        b.yOff = 0.08;
      } else {
        b.pitch = M.lerp(b.pitch, 0.02, Math.min(1, dt * 8));
        P_.legL.ax = sw; P_.legR.ax = -sw;
        // apunta con los dos brazos hacia donde mira
        const aim = -1.5 - this.pitch * 0.9 + (this.shotT > 0 ? -0.15 * this.shotT / 0.12 : 0);
        P_.armR.ax = aim; P_.armR.az = 0.08;
        P_.armL.ax = aim + 0.12; P_.armL.az = -0.55;
        P_.torso.ax = 0.05; P_.torso.az = sw * 0.06;
        P_.head.ax = -this.pitch * 0.6; P_.head.az = 0;
        b.yOff = Math.abs(sw) * 0.03;
      }
      b.computeWorld();
    }

    render(batch) {
      if (this.dead) return;
      this.body.render(batch);
    }

    // ---- lo que usan los zombis en el anfitrión (game.player se cambia por este) ----
    damage(amount, fromX, fromZ, game) {
      if (this.down || this.dead || this.invuln > 0) return;
      this.invuln = 0.25;
      VX.Coop.hurtRemote(this, amount, fromX, fromZ);
    }
    knock(kx, kz, up = 0) { VX.Coop.knockRemote(this, kx, kz, up); }
    fireTouch(amount, game) { if (this.invuln <= 0) this.damage(amount, undefined, undefined, game); }
    heal() { /* la vida la lleva su dueño */ }
    eyeX() { return this.x; }
    eyeY() { return this.y + 1.6; }
    eyeZ() { return this.z; }
  }

  RemotePlayer.COLORS = COLORS;
  VX.RemotePlayer = RemotePlayer;
})();
