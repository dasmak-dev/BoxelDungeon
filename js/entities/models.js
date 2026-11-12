// Generadores de modelos vóxel (humanoides: zombis, jefes, vendedor).
// Cada parte es una caja de vóxeles con índice de rejilla para calcular
// superficie expuesta y conectividad (para poder cortar extremidades).
(function () {
  const M = VX.M;

  // dims: [w,h,d] en vóxeles; min: esquina mínima relativa al pivote (en vóxeles)
  // attach: capa por la que la parte está unida al cuerpo ('top' | 'bottom' | null)
  function makePart(name, pivot, dims, min, v, colorFn, attach) {
    const vox = [];
    const [w, h, d] = dims;
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++)
        for (let k = 0; k < d; k++) {
          const surface = i === 0 || j === 0 || k === 0 || i === w - 1 || j === h - 1 || k === d - 1;
          const c = colorFn(i, j, k, dims, surface);
          vox.push({
            i, j, k,
            x: (min[0] + i + 0.5) * v, y: (min[1] + j + 0.5) * v, z: (min[2] + k + 0.5) * v,
            r: c[0], g: c[1], b: c[2], e: c[3] || 0,
            alive: true, exposed: surface, wx: 0, wy: 0, wz: 0,
          });
        }
    return {
      name, pivot: pivot.map((p) => p * v), dims, vox, total: vox.length, alive: vox.length,
      attach, ax: 0, ay: 0, az: 0, q: [0, 0, 0, 1], wp: [0, 0, 0], detached: false, noBreak: false, parent: null,
    };
  }

  const jit = (c, amt, i, j, k) => {
    const h = (M.hash3(i * 7 + 3, j * 13 + 1, k * 5 + 11) - 0.5) * amt;
    return [c[0] + h, c[1] + h, c[2] + h];
  };
  const FLESH = [0.6, 0.07, 0.08], FLESH2 = [0.42, 0.04, 0.06], BONE = [0.86, 0.82, 0.7], GUTS = [0.62, 0.3, 0.32];

  // cfg: { v, leg, torso, arm, head, skin, shirt, pants, eye, shoes, hood?, sleeve?, tear? }
  function humanoid(cfg) {
    const v = cfg.v;
    const [lw, lh, ld] = cfg.leg, [tw, th, td] = cfg.torso, [aw, ah, ad] = cfg.arm, [hw, hh, hd] = cfg.head;
    const hipY = lh;
    const stain = (i, j, k, p, s = 0) => M.hash3(i + 91 + s, j + 17, k + 53) < p;
    // manchas agrupadas (resolución de 2 vóxeles)
    const patch = (i, j, k, p, s = 0) => M.hash3((i >> 1) + s, j >> 1, (k >> 1) + 7) < p;

    // Interior: hueso en el eje de las extremidades, carne alrededor
    const limbInner = (i, j, k, dims) => {
      const cx = (dims[0] - 1) / 2, cz = (dims[2] - 1) / 2;
      if (Math.abs(i - cx) <= 0.6 && Math.abs(k - cz) <= 0.6) return jit(BONE, 0.06, i, j, k);
      return M.hash3(i, j, k) > 0.5 ? FLESH : FLESH2;
    };
    const torsoInner = (i, j, k, dims) => {
      if (j > dims[1] * 0.45 && (j % 2 === 0) && (k === 1 || k === dims[2] - 2)) return jit(BONE, 0.05, i, j, k); // costillas
      if (Math.abs(i - (dims[0] - 1) / 2) <= 0.6 && k === dims[2] - 2) return jit(BONE, 0.05, i, j, k);       // columna
      return M.hash3(i, j, k) > 0.6 ? GUTS : (M.hash3(i, k, j) > 0.5 ? FLESH : FLESH2);
    };

    const legFn = (i, j, k, dims, surf) => {
      if (!surf) return limbInner(i, j, k, dims);
      if (j <= 1) return jit(cfg.shoes, 0.04, i, j, k);
      if (patch(i, j, k, cfg.tear ?? 0.12, 3)) return jit(cfg.skin, 0.07, i, j, k);
      if (!cfg.clean && stain(i, j, k, 0.06)) return jit([0.4, 0.05, 0.05], 0.05, i, j, k);
      return jit(cfg.pants, 0.05, i, j, k);
    };
    const torsoFn = (i, j, k, dims, surf) => {
      if (!surf) return torsoInner(i, j, k, dims);
      if (j === 0) return jit([0.18, 0.12, 0.08], 0.03, i, j, k); // cinturón
      if (cfg.pustules && M.hash3(i + 3, j + 7, k + 1) < 0.14) return [0.75, 1, 0.25, 0.9];
      if (!cfg.clean && patch(i, j, k, 0.1, 1)) return jit([0.45, 0.04, 0.05], 0.06, i, j, k);
      if (patch(i, j, k, cfg.tear ?? 0.15, 5)) return jit(cfg.skin, 0.07, i, j, k);
      return jit(cfg.shirt, 0.05, i, j, k);
    };
    const armFn = (i, j, k, dims, surf) => {
      if (!surf) return limbInner(i, j, k, dims);
      if (j >= dims[1] * 0.55) return jit(cfg.sleeve || cfg.shirt, 0.05, i, j, k);
      if (j <= 1) return jit([cfg.skin[0] * 0.8, cfg.skin[1] * 0.8, cfg.skin[2] * 0.8], 0.05, i, j, k); // manos
      if (!cfg.clean && stain(i, j, k, 0.08, 2)) return jit([0.45, 0.05, 0.05], 0.05, i, j, k);
      return jit(cfg.skin, 0.07, i, j, k);
    };
    const headFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      if (!surf) {
        if (j >= 1 && j <= h - 2 && i >= 1 && i <= w - 2 && k >= 1 && k <= d - 2 && M.hash3(i, j, k) > 0.4) return [0.75, 0.55, 0.55]; // sesos
        return jit(BONE, 0.05, i, j, k);   // cráneo
      }
      if (k === d - 1) { // cara (+Z)
        const ew = Math.max(1, Math.floor(w / 6));
        const le = Math.max(0, Math.round(w * 0.18)), re = w - le - ew;
        const er = h - 2 - Math.floor(h / 6);
        if (j >= er && j < er + ew && ((i >= le && i < le + ew) || (i >= re && i < re + ew))) return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];
        if (j === er + ew && ((i >= le - 1 && i <= le + ew) || (i >= re - 1 && i <= re + ew))) return jit([cfg.skin[0] * 0.6, cfg.skin[1] * 0.6, cfg.skin[2] * 0.6], 0.03, i, j, k);
        const mouth = Math.max(1, Math.floor(h * 0.2));
        if (j === mouth && i >= 1 && i <= w - 2) return (i % 2 ? [0.85, 0.8, 0.6] : [0.12, 0.02, 0.02]);
        if (j === mouth - 1 && i >= 2 && i <= w - 3) return [0.15, 0.03, 0.03];
        if (i === Math.floor(w / 2) && j === er - 1) return jit([cfg.skin[0] * 0.7, cfg.skin[1] * 0.7, cfg.skin[2] * 0.7], 0.03, i, j, k);
      }
      if (cfg.hood && (j >= h - 2 || k <= 1 || i === 0 || i === w - 1)) return jit(cfg.hood, 0.04, i, j, k);
      if (cfg.hair && j >= h - 1) return jit(cfg.hair, 0.05, i, j, k);
      if (!cfg.clean && patch(i, j, k, 0.12, 9)) return jit([0.5, 0.06, 0.06], 0.05, i, j, k);
      if (!cfg.clean && stain(i, j, k, 0.1, 4)) return jit(BONE, 0.05, i, j, k); // cráneo asomando
      return jit(cfg.skin, 0.06, i, j, k);
    };

    const parts = [];
    parts.push(makePart('legL', [-lw / 2, hipY, 0], cfg.leg, [-lw / 2, -lh, -ld / 2], v, legFn, 'top'));
    parts.push(makePart('legR', [lw / 2, hipY, 0], cfg.leg, [-lw / 2, -lh, -ld / 2], v, legFn, 'top'));
    parts.push(makePart('torso', [0, hipY, 0], cfg.torso, [-tw / 2, 0, -td / 2], v, torsoFn, 'bottom'));
    const shY = hipY + th - aw / 2;
    parts.push(makePart('armL', [-(tw / 2 + aw / 2), shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top'));
    parts.push(makePart('armR', [tw / 2 + aw / 2, shY, 0], cfg.arm, [-aw / 2, -ah + aw / 2, -ad / 2], v, armFn, 'top'));
    parts.push(makePart('head', [0, hipY + th, 0], cfg.head, [-hw / 2, 0, -hd / 2], v, headFn, 'bottom'));
    // brazos y cabeza cuelgan del torso (jerarquía)
    for (const p of parts) if (p.name.startsWith('arm') || p.name === 'head') p.parent = 'torso';
    return { parts, height: (hipY + th + hh) * v, width: (tw + aw * 2) * v, v, depth: td * v };
  }

  // Escudo de chapa (para el zombi escudero): parte "blindada" que cuelga del torso
  function addShield(model, cfg) {
    const v = cfg.v;
    const [tw, th, td] = cfg.torso;
    const hipY = cfg.leg[1];
    const W = tw + 4, H = th + 6, D = 2;
    const fn = (i, j, k, dims, surf) => {
      const rim = i === 0 || i === W - 1 || j === 0 || j === H - 1;
      if (rim) return jit([0.25, 0.25, 0.28], 0.03, i, j, k);
      if ((i + j) % 5 === 0 && k === D - 1) return [0.55, 0.55, 0.6];      // remaches
      if (M.hash3(i >> 1, j >> 1, 3) < 0.15) return jit([0.45, 0.22, 0.12], 0.05, i, j, k); // óxido
      return jit([0.38, 0.38, 0.42], 0.04, i, j, k);
    };
    const p = makePart('shield', [0, hipY - 3, td / 2 + 3], [W, H, D], [-W / 2, 0, -D / 2], v, fn, null);
    p.parent = 'torso'; p.armor = true;
    model.parts.push(p);
    return model;
  }

  // Cuadrúpedo (perro zombi). Patas traseras = legL/legR, delanteras = armL/armR.
  function quadruped(cfg) {
    const v = cfg.v;
    const [lw, lh, ld] = cfg.leg, [tw, th, td] = cfg.torso, [hw, hh, hd] = cfg.head;
    const inner = (i, j, k) => (M.hash3(i, j, k) > 0.5 ? FLESH : FLESH2);
    const furFn = (i, j, k, dims, surf) => {
      if (!surf) return inner(i, j, k);
      if (M.hash3((i >> 1) + 4, j >> 1, (k >> 1)) < 0.18) return jit([0.5, 0.06, 0.06], 0.05, i, j, k);
      if (M.hash3(i + 9, j, k) < 0.08) return jit(BONE, 0.05, i, j, k);   // costillas al aire
      return jit(cfg.fur, 0.07, i, j, k);
    };
    const headFn = (i, j, k, dims, surf) => {
      const [w, h, d] = dims;
      if (!surf) return jit(BONE, 0.05, i, j, k);
      if (k === d - 1 && j === h - 3 && (i === 1 || i === w - 2)) return [cfg.eye[0], cfg.eye[1], cfg.eye[2], 1];
      if (k >= d - 3 && j <= 1) return (i + k) % 2 ? [0.85, 0.82, 0.7] : [0.15, 0.03, 0.03]; // dientes
      return furFn(i, j, k, dims, surf);
    };
    const legY = lh;
    const parts = [];
    const zf = td / 2 - ld / 2 - 1, zb = -td / 2 + ld / 2 + 1;
    parts.push(makePart('legL', [-tw / 2 + lw / 2, legY, zb], cfg.leg, [-lw / 2, -lh, -ld / 2], v, furFn, 'top'));
    parts.push(makePart('legR', [tw / 2 - lw / 2, legY, zb], cfg.leg, [-lw / 2, -lh, -ld / 2], v, furFn, 'top'));
    parts.push(makePart('torso', [0, legY, 0], cfg.torso, [-tw / 2, 0, -td / 2], v, furFn, null));
    parts.push(makePart('armL', [-tw / 2 + lw / 2, legY + 1, zf], cfg.leg, [-lw / 2, -lh - 1, -ld / 2], v, furFn, 'top'));
    parts.push(makePart('armR', [tw / 2 - lw / 2, legY + 1, zf], cfg.leg, [-lw / 2, -lh - 1, -ld / 2], v, furFn, 'top'));
    parts.push(makePart('head', [0, legY + th - 2, td / 2], cfg.head, [-hw / 2, 0, -1], v, headFn, 'bottom'));
    for (const p of parts) if (p.name.startsWith('arm') || p.name === 'head') p.parent = 'torso';
    return { parts, height: (legY + th + 2) * v, width: tw * v, v, depth: th * v, quad: true };
  }

  const Models = { humanoid, quadruped, addShield };

  Models.zombieConfigs = {
    walker: {
      v: 0.055, leg: [4, 15, 4], torso: [8, 12, 4], arm: [4, 13, 4], head: [6, 7, 6],
      skin: [0.44, 0.58, 0.34], shirt: [0.3, 0.34, 0.48], pants: [0.24, 0.2, 0.17], shoes: [0.12, 0.1, 0.09],
      eye: [1.0, 0.85, 0.25],
    },
    runner: {
      v: 0.05, leg: [4, 17, 4], torso: [6, 13, 4], arm: [3, 15, 3], head: [6, 7, 6],
      skin: [0.72, 0.73, 0.64], shirt: [0.55, 0.2, 0.18], pants: [0.2, 0.22, 0.26], shoes: [0.1, 0.1, 0.1],
      eye: [1.0, 0.25, 0.15], tear: 0.25,
    },
    spitter: {
      v: 0.055, leg: [4, 14, 4], torso: [10, 12, 7], arm: [3, 12, 3], head: [6, 6, 6],
      skin: [0.55, 0.62, 0.25], shirt: [0.4, 0.48, 0.18], pants: [0.22, 0.2, 0.15], shoes: [0.1, 0.1, 0.08],
      eye: [0.6, 1.0, 0.2], tear: 0.45, sleeve: [0.5, 0.58, 0.22],
    },
    exploder: {
      v: 0.058, leg: [4, 12, 4], torso: [12, 13, 10], arm: [3, 11, 3], head: [6, 6, 6],
      skin: [0.55, 0.6, 0.3], shirt: [0.5, 0.58, 0.22], pants: [0.3, 0.25, 0.18], shoes: [0.12, 0.1, 0.08],
      eye: [1, 0.9, 0.2], tear: 0.6, sleeve: [0.55, 0.6, 0.3], pustules: true,
    },
    shielder: {
      v: 0.058, leg: [4, 15, 4], torso: [8, 12, 5], arm: [4, 13, 4], head: [6, 7, 6],
      skin: [0.42, 0.52, 0.36], shirt: [0.3, 0.28, 0.25], pants: [0.2, 0.2, 0.22], shoes: [0.1, 0.1, 0.1],
      eye: [1, 0.6, 0.2], hood: [0.28, 0.28, 0.3],
    },
    climber: {
      v: 0.048, leg: [3, 16, 3], torso: [6, 12, 4], arm: [3, 17, 3], head: [5, 6, 5],
      skin: [0.62, 0.66, 0.7], shirt: [0.25, 0.25, 0.3], pants: [0.18, 0.18, 0.2], shoes: [0.1, 0.1, 0.1],
      eye: [0.6, 1, 1], tear: 0.5,
    },
    dog: {
      v: 0.05, quad: true, leg: [3, 9, 3], torso: [7, 7, 18], head: [6, 6, 8],
      fur: [0.35, 0.3, 0.26], eye: [1, 0.3, 0.1],
    },
    brute: {
      v: 0.06, leg: [6, 15, 6], torso: [12, 14, 7], arm: [6, 15, 6], head: [8, 8, 8],
      skin: [0.36, 0.5, 0.3], shirt: [0.45, 0.4, 0.3], pants: [0.2, 0.18, 0.22], shoes: [0.1, 0.08, 0.08],
      eye: [0.45, 1.0, 0.3], tear: 0.3,
    },
  };

  Models.bossConfigs = {
    coloso: {
      v: 0.075, leg: [8, 18, 8], torso: [16, 17, 11], arm: [7, 19, 7], head: [10, 10, 10],
      skin: [0.32, 0.48, 0.26], shirt: [0.25, 0.22, 0.2], pants: [0.18, 0.16, 0.14], shoes: [0.1, 0.08, 0.06],
      eye: [1, 0.3, 0.1], tear: 0.35,
    },
    carnicero: {
      v: 0.07, leg: [8, 19, 8], torso: [16, 16, 11], arm: [7, 21, 7], head: [9, 9, 9],
      skin: [0.72, 0.56, 0.5], shirt: [0.76, 0.73, 0.69], sleeve: [0.6, 0.15, 0.12], pants: [0.25, 0.22, 0.2], shoes: [0.1, 0.08, 0.06],
      eye: [1, 1, 0.35], tear: 0.18,
    },
    ancestro: {
      v: 0.075, leg: [7, 17, 7], torso: [14, 19, 10], arm: [6, 21, 6], head: [10, 10, 10],
      skin: [0.5, 0.4, 0.62], shirt: [0.2, 0.12, 0.28], pants: [0.15, 0.1, 0.2], shoes: [0.08, 0.06, 0.1],
      eye: [0.45, 1, 1], tear: 0.2, hood: [0.22, 0.14, 0.3],
    },
  };

  Models.vendor = () => humanoid({
    v: 0.05, leg: [4, 15, 4], torso: [8, 14, 6], arm: [4, 13, 4], head: [8, 8, 8],
    skin: [0.86, 0.69, 0.53], shirt: [0.35, 0.18, 0.45], sleeve: [0.35, 0.18, 0.45], pants: [0.3, 0.16, 0.4],
    shoes: [0.2, 0.12, 0.08], eye: [0.3, 0.9, 1.0], tear: 0, clean: true, hood: [0.28, 0.14, 0.38],
  });

  VX.Models = Models;
})();
