// Animaciones de las armas de fuego en primera persona: piezas que se mueven por separado
// (cargador, corredera, tambor, cerrojo, báscula, cuerda, depósito…) al disparar y al recargar.
// Devuelve, para el instante actual, la pose del arma entera y la transformación de cada pieza.
// Coordenadas del modelo: x derecha, y arriba, -z hacia delante, en vóxeles.
(function () {
  const M = VX.M;
  const S = (k, a, b) => M.smoothstep(a, b, k);
  const bump = (k, a, b, c, d) => S(k, a, b) * (1 - S(k, c, d));

  // pieza girada alrededor de un pivote y luego desplazada
  const rot = (q, px, py, pz, ox = 0, oy = 0, oz = 0) => ({ q, px, py, pz, ox, oy, oz });
  const off = (ox, oy, oz) => ({ ox, oy, oz });

  // cargador que sale por abajo, se cae y entra uno nuevo (pistolas, subfusil)
  function magSwap(k, a, depth) {
    const t0 = a, out = depth || 7;
    if (k < t0 + 0.3) {
      if (k > t0 + 0.26) return { hide: true };
      return { ...off(-S(k, t0 + 0.1, t0 + 0.26) * 3, -S(k, t0, t0 + 0.1) * out - S(k, t0 + 0.1, t0 + 0.26) * 40, 0), drop: true };   // el viejo, vacío
    }
    return off(0, -(1 - S(k, t0 + 0.52, t0 + 0.6)) * out - (1 - S(k, t0 + 0.32, t0 + 0.5)) * 26, 0);
  }

  // nº de inserciones (cartuchos, balas) repartidas en [a, b] y estado de la actual
  function inserts(k, a, b, n) {
    if (k < a || k >= b) return null;
    const c = (k - a) / (b - a) * n, i = Math.floor(c);
    return { i, f: c - i };
  }

  // A: pose global y piezas. w: el gestor de armas, d: la definición, form: modelo de pistola
  function animate(w, id, d, form) {
    const A = { parts: {}, pitch: 0, roll: 0, yaw: 0, bx: 0, by: 0, bz: 0, slideZ: w.slide * 4, pumpZ: 0 };
    const P = A.parts;
    const f = w.fireT == null ? 99 : w.fireT, cd = 1 / Math.max(0.1, w.stats().fireRate);
    const rl = w.reloading, k = rl ? 1 - w.reloadT / w.reloadTime : 0;
    const tilt = rl ? S(k, 0, 0.12) * (1 - S(k, 0.86, 1)) : 0;
    const key = id === 'pistol' ? (form && form !== 'pistola' ? form : 'pistola') : id;
    switch (key) {
      case 'pistola': case 'deagle': case 'auto': {
        if (rl) {
          A.roll -= tilt * 0.6; A.pitch += tilt * 0.18; A.bx -= tilt * 0.04; A.by += tilt * 0.07; A.yaw += tilt * 0.25;
          P.mag = magSwap(k, 0.08, key === 'auto' ? 9 : 7);
          // golpe de la mano al meter el cargador y corredera adelante
          A.by += bump(k, 0.66, 0.69, 0.7, 0.76) * 0.012;
          const rack = bump(k, 0.76, 0.82, 0.86, 0.9);
          A.slideZ = Math.max(A.slideZ, (w.slot.ammo <= 0 && k < 0.76 ? 1 : rack) * 4.5);
          A.roll -= rack * 0.15;
        } else if (w.slot.ammo <= 0 && !rl) A.slideZ = 4.5;   // corredera abierta con el cargador vacío
        break;
      }
      case 'revolver': {
        // percutor amartillado y tambor girando un sexto por disparo
        const cock = f < 99 ? S(f, 0.05, cd * 0.8) : 1;
        P.ham = rot(M.qX(cock * 0.55), -0.5, 8, 3);
        const spin = ((w.shots || 0) - 1 + S(f, 0.02, 0.12)) * Math.PI / 3;
        let open = 0;
        if (rl) {
          A.roll += tilt * 0.7; A.pitch += tilt * 0.25 - bump(k, 0.18, 0.22, 0.26, 0.32) * 0.25; A.yaw += tilt * 0.3; A.bx -= tilt * 0.04; A.by += tilt * 0.03;
          open = S(k, 0.05, 0.16) * (1 - S(k, 0.84, 0.92));
          A.roll -= bump(k, 0.84, 0.88, 0.9, 0.97) * 0.3;   // golpe de muñeca para cerrarlo
        }
        const sw = M.qZ(open * 1.35), pre = { q: M.qZ(spin), px: -0.5, py: 4, pz: 0 };
        const cyl = { q: sw, px: -0.5, py: 1.5, pz: 0, ox: -open * 1.5, oy: 0, oz: 0, pre };
        P.cyl = cyl;
        // culotes de las balas en el tambor: no se ven desde que se expulsan las vainas hasta que entran las nuevas
        P.cylb = rl && k > 0.19 && k < 0.7 ? { hide: true } : cyl;
        P.crane = { q: sw, px: -0.5, py: 1.5, pz: 0, ox: -open * 1.5, oy: 0, oz: 0 };
        if (rl) {
          // la varilla expulsa las seis vainas, que caen
          if (k > 0.18 && k < 0.42) P.rl_cases = { ...cyl, oz: S(k, 0.18, 0.25) * 8 + S(k, 0.25, 0.42) * 10, oy: -S(k, 0.25, 0.42) * 40, ox: cyl.ox - S(k, 0.25, 0.42) * 10 };
          // el cargador rápido llega por detrás con seis balas y las suelta en el tambor
          if (k > 0.44 && k < 0.84) {
            const inn = S(k, 0.44, 0.62), push = S(k, 0.62, 0.7), away = S(k, 0.72, 0.84);
            const ld = { ...cyl, oz: (1 - inn) * 16 + (1 - push) * 5 + away * 30, oy: -(1 - inn) * 18 - away * 20, ox: cyl.ox - (1 - inn) * 6 };
            P.rl_loader = ld;
            if (k < 0.7) P.rl_speed = ld;   // las balas se quedan en el tambor y el cargador rápido se va
          }
        }
        break;
      }
      case 'smg': {
        if (rl) {
          A.roll -= tilt * 0.5; A.pitch += tilt * 0.12; A.yaw += tilt * 0.2; A.bx -= tilt * 0.04; A.by += tilt * 0.07;
          P.mag = magSwap(k, 0.08, 6);
          A.by += bump(k, 0.66, 0.69, 0.7, 0.76) * 0.012;
          const rack = bump(k, 0.78, 0.84, 0.86, 0.9);
          P.bolt = off(0, 0, rack * 7); A.roll -= rack * 0.2;
        }
        P.bolt = P.bolt || off(0, 0, w.slide * 5);
        break;
      }
      case 'shotgun': {
        // corredera atrás y adelante después de cada disparo (expulsa el cartucho)
        A.pumpZ = bump(f, 0.08, 0.2, 0.26, 0.4) * 8;
        A.roll -= bump(f, 0.08, 0.2, 0.26, 0.4) * 0.08;
        if (rl) {
          // se abre por la bisagra, entran los cartuchos uno a uno, se cierra de golpe y se monta
          const open = S(k, 0.04, 0.14) * (1 - S(k, 0.84, 0.9));
          A.pitch += tilt * 0.12 + open * 0.08; A.roll += tilt * 0.2; A.yaw += tilt * 0.75; A.bx -= tilt * 0.05; A.by += tilt * 0.05; A.bz -= tilt * 0.07;
          A.pitch -= bump(k, 0.84, 0.88, 0.89, 0.95) * 0.25;
          P.brl = rot(M.qX(-open * 0.5), -0.5, 4, -10);
          const n = Math.min(6, Math.max(2, w.stats().mag - Math.max(0, w.slot.ammo)));
          const ins = inserts(k, 0.16, 0.82, Math.min(n, 4));
          if (ins && ins.f < 0.85) {
            const a = S(ins.f, 0, 0.55), b = S(ins.f, 0.55, 0.85);
            // llega por arriba y entra en la recámara siguiendo el cañón inclinado
            const o = open * 0.5;
            P.rl_shell = { ...P.brl, ox: (1 - a) * 5, oy: (1 - a) * 11 - b * 5 * Math.sin(o), oz: (1 - a) * 9 - b * 5 * Math.cos(o) };
          }
          A.pumpZ = Math.max(A.pumpZ, bump(k, 0.9, 0.94, 0.95, 0.99) * 8);
        }
        break;
      }
      case 'dbarrel': {
        if (rl) {
          const open = S(k, 0.04, 0.16) * (1 - S(k, 0.74, 0.8));
          A.pitch += tilt * 0.12 + open * 0.1; A.roll += tilt * 0.2; A.yaw += tilt * 0.75; A.bx -= tilt * 0.05; A.by += tilt * 0.05; A.bz -= tilt * 0.07;
          A.pitch -= bump(k, 0.74, 0.78, 0.8, 0.88) * 0.35;   // cierre de golpe
          P.brl = rot(M.qX(-open * 0.75), -0.5, 3, -6);
          if (k > 0.3 && k < 0.7) {
            const a = S(k, 0.3, 0.55), b = S(k, 0.55, 0.68);
            const o = open * 0.75;   // caen por arriba en los cañones abiertos, inclinados como ellos
            const s = { ...P.brl, ox: 0, oy: (1 - a) * 13 - b * 5 * Math.sin(o), oz: (1 - a) * 8 - b * 5 * Math.cos(o) };
            P.rl_shell = { ...s, inst: [[-1.5, 0, 0], [1.5, 0, 0]] };
          }
        }
        break;
      }
      case 'rifle': {
        // cerrojo: sube la palanca, atrás (expulsa la vaina), adelante y abajo
        let lift = 0, back = 0;
        if (f < cd) { const t = f / cd; lift = bump(t, 0.25, 0.36, 0.62, 0.72); back = bump(t, 0.36, 0.46, 0.52, 0.62); A.roll += lift * 0.12; }
        if (rl) {
          // recarga por abajo: el cargador de caja cae, entra uno nuevo de un golpe y se monta el cerrojo
          A.roll -= tilt * 0.45; A.pitch += tilt * 0.12; A.yaw += tilt * 0.3; A.bx -= tilt * 0.04; A.by += tilt * 0.07;
          P.mag = magSwap(k, 0.1, 6);
          A.by += bump(k, 0.66, 0.69, 0.7, 0.76) * 0.014;   // golpe de la mano al meterlo
          lift = Math.max(lift, bump(k, 0.76, 0.8, 0.9, 0.95));
          back = Math.max(back, bump(k, 0.8, 0.84, 0.86, 0.9));
          A.roll += lift * 0.12;
        }
        P.bolt = rot(M.qZ(lift * 1.1), -0.5, 5.5, 0, 0, 0, back * 8);
        break;
      }
      case 'lmg': {
        P.belt = off(0, 0, -bump(f, 0, 0.03, 0.04, 0.08) * 2);
        if (rl) {
          A.roll -= tilt * 0.25; A.pitch += tilt * 0.1; A.yaw += tilt * 0.45; A.bx -= tilt * 0.04; A.by += tilt * 0.05;
          const open = S(k, 0.06, 0.16) * (1 - S(k, 0.78, 0.86));
          P.lid = rot(M.qX(open * 1.2), -0.5, 8, -2);
          let boxY = 0, boxX = 0, hide = false;
          if (k < 0.42) { boxY = -S(k, 0.2, 0.4) * 40; boxX = -S(k, 0.2, 0.4) * 6; hide = k > 0.38; }
          else boxY = -(1 - S(k, 0.44, 0.62)) * 30;
          P.box = hide ? { hide: true } : off(boxX, boxY, 0);
          P.belt = k > 0.38 && k < 0.64 ? { hide: true } : off(0, S(k, 0.62, 0.7) * 0 + (k < 0.7 && k >= 0.64 ? (1 - S(k, 0.64, 0.7)) * 3 : 0), 0);
          A.pitch -= bump(k, 0.78, 0.82, 0.84, 0.9) * 0.15;
        }
        break;
      }
      case 'crossbow': {
        // la cuerda se suelta al disparar y se vuelve a tensar al recargar
        const loaded = w.slot.ammo > 0 && !rl;
        let relax = loaded ? 0 : 1, boltOn = loaded;
        let bolt = null;
        if (rl) {
          A.pitch -= tilt * 0.12; A.by += tilt * 0.02; A.roll += tilt * 0.2; A.yaw += tilt * 0.2;
          relax = 1 - S(k, 0.1, 0.5);
          if (k > 0.55) { boltOn = true; const a = S(k, 0.55, 0.85); bolt = off(0, (1 - a) * 10, (1 - a) * 14); }
        }
        if (!loaded && f < 0.12 && !rl) relax = S(f, 0, 0.04);
        P.str = { fn: (v, o) => { const ax = Math.abs(v.x + 0.5); o[2] = M.lerp(v.z, -29 + Math.round(ax * ax * 0.028), relax); } };
        P.bolt = boltOn ? (bolt || off(0, 0, 0)) : { hide: true };
        break;
      }
      case 'launcher': {
        if (rl) {
          const open = S(k, 0.04, 0.14) * (1 - S(k, 0.84, 0.9));
          A.pitch += tilt * 0.12; A.roll += tilt * 0.2; A.yaw += tilt * 0.7; A.bx -= tilt * 0.05; A.by += tilt * 0.05; A.bz -= tilt * 0.07;
          A.pitch -= bump(k, 0.84, 0.87, 0.89, 0.95) * 0.3;
          P.brl = rot(M.qX(-open * 0.45), -0.5, 0, -6);
          const ins = inserts(k, 0.16, 0.82, Math.min(4, Math.max(1, w.stats().mag - Math.max(0, w.slot.ammo))));
          if (ins && ins.f < 0.85) {
            const a = S(ins.f, 0, 0.55), b = S(ins.f, 0.55, 0.85);
            const o = open * 0.45;
            P.rl_gren = { ...P.brl, ox: (1 - a) * 4, oy: (1 - a) * 12 - b * 6 * Math.sin(o), oz: (1 - a) * 8 - b * 6 * Math.cos(o) };
          }
        }
        break;
      }
      case 'flamer': {
        P.pilot = off(0, Math.random() < 0.3 ? 0.4 : 0, 0);
        if (rl) {
          A.roll -= tilt * 0.4; A.pitch += tilt * 0.1; A.yaw += tilt * 0.1;
          if (k < 0.42) P.tank = k > 0.38 ? { hide: true } : rot(M.qX(-S(k, 0.12, 0.2) * 0.3), -0.5, -3, -3, 0, -S(k, 0.06, 0.12) * 2 - S(k, 0.2, 0.38) * 40, 0);
          else P.tank = off(0, -(1 - S(k, 0.44, 0.66)) * 30 - (1 - S(k, 0.66, 0.72)) * 2, 0);
          A.roll += bump(k, 0.74, 0.78, 0.8, 0.86) * 0.25;   // gira la válvula
        }
        break;
      }
      case 'raygun': {
        for (let i = 0; i < 3; i++) P['ring' + i] = off(0, 0, -bump(f, 0.01 + i * 0.03, 0.04 + i * 0.03, 0.06 + i * 0.03, 0.14 + i * 0.03) * 2);
        if (rl) {
          A.roll += tilt * 0.4; A.pitch += tilt * 0.3; A.yaw -= tilt * 0.1;
          if (k < 0.45) P.cell = k > 0.4 ? { hide: true } : off(S(k, 0.18, 0.4) * 8, S(k, 0.08, 0.18) * 4 - S(k, 0.18, 0.4) * 30, S(k, 0.08, 0.18) * 6);
          else P.cell = off(0, (1 - S(k, 0.48, 0.66)) * 10, (1 - S(k, 0.48, 0.66)) * 4 + (1 - S(k, 0.66, 0.74)) * 5);
          A.by += bump(k, 0.72, 0.74, 0.75, 0.8) * 0.01;
        }
        break;
      }
      default: {
        if (rl) { const s = Math.sin(k * Math.PI); A.pitch -= s * 0.55; A.roll += s * 0.7; A.by -= s * 0.07; }
      }
    }
    // balas del cargador: van con él, salvo en el que se cae (está vacío)
    if (P.mag) P.magr = P.mag.drop || P.mag.hide ? { hide: true } : P.mag;
    return A;
  }

  // Vainas y cartuchos expulsados (en el espacio del arma)
  const EJECT = {
    pistol: { x: 2, y: 8, z: -9, kind: 'brass', at: 0.02, vx: -25, vy: 35, vz: -10 }, smg: { x: 2, y: 5, z: -10, kind: 'brass', at: 0 },
    lmg: { x: 2, y: 4, z: -14, kind: 'brass', at: 0 }, rifle: { x: 2, y: 6, z: -6, kind: 'brass', at: 0.42 },
    shotgun: { x: 2, y: 4, z: -6, kind: 'shell', at: 0.2 },
  };
  function onFire(w, id, form) {
    w.fireT = 0; w.shots = (w.shots || 0) + 1;
    if (id === 'pistol' && form === 'revolver') return;
    const e = EJECT[id];
    if (!e) return;
    const at = id === 'rifle' ? e.at / Math.max(0.1, w.stats().fireRate) : e.at;
    w.ejectQ.push({ t: at, ...e });
  }
  function spawn(w, e) {
    const sh = e.kind === 'shell';
    // y en el mundo: la vaina sale por la derecha, cae al suelo y rebota (se ve al mirar abajo)
    const g = VX.game, P = g && g.player;
    if (P && g.particles && !g.visualOnly) {
      const c = Math.cos(P.yaw), s = Math.sin(P.yaw), ey = P.eyeY ? P.eyeY() : P.y + 1.6;
      const rx = -c, rz = s;   // derecha de la cámara
      const fx = s, fz = c;
      const x = P.x + rx * 0.22 + fx * 0.3, z = P.z + rz * 0.22 + fz * 0.3;
      g.particles.spawn(x, ey - 0.12, z, rx * M.rand(1.2, 2) + fx * M.rand(-0.3, 0.3), M.rand(1.5, 2.6), rz * M.rand(1.2, 2) + fz * M.rand(-0.3, 0.3),
        sh ? 0.62 : 0.86, sh ? 0.1 : 0.66, sh ? 0.07 : 0.26, sh ? 0.03 : 0.018, M.rand(1.6, 2.4), 0.1);
    }
    w.casings.push({ x: e.x, y: e.y, z: e.z, vx: 70 + Math.random() * 50 + (e.vx || 0), vy: 90 + Math.random() * 50 + (e.vy || 0), vz: 30 + Math.random() * 40 + (e.vz || 0),
      a: Math.random() * 3, va: 12 + Math.random() * 10, t: 0.7, kind: e.kind, big: sh });
  }
  function update(w, dt, id) {
    w.fireT = (w.fireT == null ? 99 : w.fireT) + dt;
    for (const e of w.ejectQ) { e.t -= dt; if (e.t <= 0) spawn(w, e); }
    w.ejectQ = w.ejectQ.filter((e) => e.t > 0);
    // la recortada suelta los dos cartuchos al abrirse
    if (w.reloading && id === 'dbarrel') {
      const k = 1 - w.reloadT / w.reloadTime;
      if (k > 0.14 && !w.dbEjected) { w.dbEjected = true; for (const x of [-2, 1]) spawn(w, { x, y: 5, z: -4, kind: 'shell', vx: -80 + x * 10, vy: 40, vz: 120 }); }
    } else w.dbEjected = false;
    for (const c of w.casings) {
      c.t -= dt; c.vy -= 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.a += c.va * dt;
    }
    w.casings = w.casings.filter((c) => c.t > 0 && c.y > -120);
  }
  function drawCasings(w, batch, q, g, bx, by, bz, tmp) {
    for (const c of w.casings) {
      M.qRot(q, c.x * g, c.y * g, c.z * g, tmp);
      const cq = M.qMul(q, M.qMul(M.qX(c.a), M.qY(c.a * 0.7)));
      if (c.big) batch.rbox(bx + tmp[0], by + tmp[1], bz + tmp[2], g * 2, g * 2, g * 5, cq, 0.62, 0.1, 0.07, 0);
      else batch.rbox(bx + tmp[0], by + tmp[1], bz + tmp[2], g * 1.4, g * 1.4, g * 3.2, cq, 0.86, 0.66, 0.26, 0.2);
    }
  }

  VX.GunAnim = { animate, onFire, update, drawCasings };
})();
