// Modo de pruebas: genera todas las plantillas de sala y hace pelear a cada tipo de enemigo,
// sin jugar, buscando fallos que luego se notan jugando:
//  · salas que no se construyen, puertas tapadas o salidas a las que no se puede llegar
//  · salas que salen distintas con la misma semilla (en cooperativo se verían distintas)
//  · enemigos que se quedan atascados, se salen de la sala, se rompen sin morir o no llegan a ti
// Se lanza desde Ajustes → Perfil (o con ?test=1). Al acabar enseña un informe para copiar.
// Al cerrar recarga la página: la partida de pruebas no toca tu perfil.
(function () {
  const M = VX.M;
  const wait = () => new Promise((r) => setTimeout(r, 0));

  const SelfTest = {
    running: false,
    async run(game) {
      if (this.running) return;
      this.running = true;
      this.ui();
      const out = this.out = { rooms: 0, roomFail: [], enemy: 0, enemyFail: [], determinism: [], watch: 0, t0: performance.now() };
      game.noReward = true;   // nada de esencia, muertes ni oro en el perfil
      VX.Profile.save = () => {};
      try {
        await this.rooms(game);
        await this.enemies(game);
      } catch (e) { out.roomFail.push('El modo de pruebas falló: ' + e.message); VX.ErrLog && VX.ErrLog.add(e.message, e.stack, 'pruebas'); }
      this.report();
    },

    // ---------- salas ----------
    templates() {
      const P = VX.RoomPool, list = [];
      for (const type of Object.keys(P)) {
        if (!Array.isArray(P[type]) || type === 'recent') continue;
        for (const tpl of P[type]) if (tpl && tpl.name) list.push({ type: type === 'event' ? 'normal' : type, tpl });
      }
      return list;
    },
    async rooms(game) {
      const W = game.world, list = this.templates(), out = this.out;
      game.mode = 'dungeon';
      let i = 0;
      for (const { type, tpl } of list) {
        this.progress(`Salas: ${++i} / ${list.length} · ${tpl.name}`);
        for (const zone of [0, 3]) {
          let r;
          try {
            W.reset();
            r = VX.Coop.seeded(1234 + i, () => W.addStart(type, 4, ['zp', 'xp', 'xn'], tpl, zone));
          } catch (e) { out.roomFail.push(`${tpl.name} (zona ${zone}): no se construye — ${e.message}`); continue; }
          out.rooms++;
          const bad = this.checkRoom(game, r);
          if (bad) out.roomFail.push(`${tpl.name} (${type}, zona ${zone}): ${bad}`);
          // la misma semilla tiene que dar la misma sala (si no, en cooperativo cada uno ve otra)
          if (zone === 0) {
            const a = this.sum(r);
            W.reset();
            const r2 = VX.Coop.seeded(1234 + i, () => W.addStart(type, 4, ['zp', 'xp', 'xn'], tpl, zone));
            if (this.sum(r2) !== a) out.determinism.push(tpl.name);
          }
        }
        await wait();
      }
    },
    sum(r) { let s = 0; for (let i = 0; i < r.grid.length; i += 3) s = (s * 31 + r.grid[i]) | 0; return s; },
    // ¿se puede ir andando (o saltando) de la entrada a cada salida?
    checkRoom(game, r) {
      const W = game.world, S = VX.S, IN = VX.Room.INWARD;
      const free = (x, z) => { const y = W.groundAt(x, z); return !W.boxCollides(x - 0.25, y + 0.3, z - 0.25, x + 0.25, y + 1.65, z + 0.25) ? y : null; };   // los escalones bajos se suben solos
      const pt = (s) => { const w = r.doorWorld(s), k = IN[s]; return [w.x + k[0] * 1.3, w.z + k[1] * 1.3]; };
      const [sx, sz] = pt(r.entrance);
      if (free(sx, sz) === null) return 'la entrada está tapada';
      const step = 0.5, key = (x, z) => Math.round(x / step) + ',' + Math.round(z / step);
      const seen = new Map([[key(sx, sz), free(sx, sz)]]), q = [[sx, sz]];
      let n = 0;
      while (q.length && n < 20000) {
        const [x, z] = q.shift(); n++;
        const y0 = seen.get(key(x, z));
        for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const nx = x + dx, nz = z + dz, k = key(nx, nz);
          if (seen.has(k) || !r.contains(nx, nz)) continue;
          const y = free(nx, nz);
          if (y !== null && y - y0 <= 1.25) { seen.set(k, y); q.push([nx, nz]); continue; }   // andando o subiendo de un salto (~1,2 m)
          // saltando por encima de algo bajo (una valla, un borde) hasta el punto siguiente
          const jx = x + dx * 2, jz = z + dz * 2, jk = key(jx, jz);
          if (seen.has(jk) || !r.contains(jx, jz) || W.groundAt(nx, nz) - y0 > 1.25) continue;
          const jy = free(jx, jz);
          if (jy !== null && jy - y0 <= 1.25) { seen.set(jk, jy); q.push([jx, jz]); }
        }
      }
      const miss = r.exits.filter((s) => { const [x, z] = pt(s); return !seen.has(key(x, z)); });
      if (miss.length) return 'no se llega a la salida ' + miss.join(', ') + ` (zona alcanzable: ${seen.size} puntos)`;
      if (seen.size < 60) return 'casi no hay sitio para moverse';
      return null;
    },

    // ---------- enemigos ----------
    async enemies(game) {
      const out = this.out, W = game.world, P = game.player;
      const kinds = Object.keys(VX.Zombie.TYPES).filter((k) => !VX.Zombie.TYPES[k].grows && !VX.Zombie.TYPES[k].pile);   // los restos (del renacido, brotes) no aparecen solos
      const normal = VX.RoomPool.normal;
      // cuántas veces actúa el vigilante (enemigos que tuvo que sacar o hacer desaparecer)
      const pull = game.watchPull.bind(game), kill = game.watchKill.bind(game);
      let watched = [];
      game.watchPull = (e, cr, tell) => { watched.push(e.kind + ' sacado'); return pull(e, cr, tell); };
      game.watchKill = (e, why) => { watched.push(e.kind + ' ' + why); return kill(e, why); };
      let i = 0;
      for (const kind of kinds) {
        this.progress(`Enemigos: ${++i} / ${kinds.length} · ${VX.Zombie.TYPES[kind].name}`);
        for (const tpl of [normal[i % normal.length], normal[(i * 7 + 3) % normal.length]]) {
          W.reset();
          const r = W.addStart('normal', 5, ['zp', 'xp', 'xn'], tpl, 0);
          r.setDoor(r.entrance, true);   // como en el juego: la puerta de entrada se cierra detrás de ti
          r.entered = true; r.cleared = false; r.pendingWaves = 0;
          game.currentRoom = r; game.enemies = []; game.corpses = []; game.projectiles = []; game.boss = null;
          game.state = 'playing'; game.objectives = null;
          const w0 = r.doorWorld(r.entrance), k = VX.Room.INWARD[r.entrance];
          P.x = w0.x + k[0] * 3; P.z = w0.z + k[1] * 3; P.y = W.groundAt(P.x, P.z); P.hp = P.maxHp; P.godMode = true; P.invuln = 1e9;
          const list = [];
          for (let n = 0; n < 3; n++) {
            const ex = P.x + k[0] * M.rand(8, 14) + M.rand(-3, 3), ez = P.z + k[1] * M.rand(8, 14) + M.rand(-3, 3);
            const e = game.spawner.spawnZombieNear(game, ex, ez, 2, kind);
            if (e) { e.spawnT = 0; list.push(e); }
          }
          if (!list.length) { out.enemyFail.push(`${kind} (${tpl.name}): no se pudo colocar`); continue; }
          out.enemy += list.length;
          watched = [];
          const st = list.map((e) => ({ minD: 1e9, d0: Math.hypot(e.x - P.x, e.z - P.z), nan: false, out: 0, solid: 0, empty: false }));
          const dt = 1 / 30;
          for (let f = 0; f < 30 * 25; f++) {
            P.x += Math.sin(f / 60) * 0.02; P.hp = P.maxHp;
            try { game.update(dt); } catch (e) { out.enemyFail.push(`${kind}: error al actualizar — ${e.message}`); break; }
            list.forEach((e, j) => {
              if (e.dead) return;
              const s = st[j];
              if (!Number.isFinite(e.x + e.y + e.z)) s.nan = true;
              s.minD = Math.min(s.minD, Math.hypot(e.x - P.x, e.z - P.z));
              if (!r.contains(e.x, e.z)) s.out += dt;
              if (!e.T.fly && W.boxCollides(e.x - 0.12, e.y + 0.5, e.z - 0.12, e.x + 0.12, e.y + 1.1, e.z + 0.12)) s.solid += dt;
            });
            if (f % 30 === 0) await wait();
          }
          const T = VX.Zombie.TYPES[kind], B = list[0].B || {}, melee = !T.ranged && !T.pile && T.speed > 0 && !B.keep;   // los que guardan la distancia no cuentan
          list.forEach((e, j) => {
            const s = st[j], why = [];
            if (s.nan) why.push('posición rota (NaN)');
            if (s.out > 1.5) why.push(`fuera de la sala ${s.out.toFixed(1)} s`);
            if (s.solid > 1.5) why.push(`dentro de un bloque ${s.solid.toFixed(1)} s`);
            if (melee && s.minD > (B.ring ? VX.Horde.ringR + 1.2 : (T.reach || 1) + 2.8) && s.d0 - s.minD < 4) why.push(`no llega a ti (se quedó a ${s.minD.toFixed(1)} m)`);
            if (why.length) out.enemyFail.push(`${T.name} en ${tpl.name}: ${why.join(', ')}`);
          });
          if (watched.length) { out.watch += watched.length; out.enemyFail.push(`${T.name} en ${tpl.name}: el vigilante tuvo que actuar (${watched.join(', ')})`); }
        }
      }
    },

    // ---------- informe ----------
    ui() {
      let el = document.getElementById('testReport');
      if (!el) {
        el = document.createElement('div'); el.id = 'testReport';
        el.innerHTML = '<h3>MODO DE PRUEBAS</h3><div class="trProg"></div><pre class="trOut"></pre><div class="row"><button class="small trCopy hidden">COPIAR INFORME</button><button class="small secondary trClose">CERRAR (recarga)</button></div>';
        document.body.appendChild(el);
        el.querySelector('.trClose').onclick = () => location.reload();
        el.querySelector('.trCopy').onclick = async () => { try { await navigator.clipboard.writeText(this.text); } catch (e) { /* nada */ } el.querySelector('.trCopy').textContent = 'COPIADO'; };
      }
      el.classList.remove('hidden');
    },
    progress(t) { const el = document.querySelector('#testReport .trProg'); if (el) el.textContent = t; },
    report() {
      const o = this.out, secs = ((performance.now() - o.t0) / 1000).toFixed(0);
      const lines = [`VOXEL DUNGEON ${VX.VERSION} · modo de pruebas · ${secs} s`, '',
        `Salas construidas: ${o.rooms} · con problemas: ${o.roomFail.length}`, ...o.roomFail.map((t) => '  ✗ ' + t),
        `Salas distintas con la misma semilla (cooperativo): ${o.determinism.length ? o.determinism.join(', ') : 'ninguna'}`, '',
        `Enemigos probados: ${o.enemy} · con problemas: ${o.enemyFail.length}`, ...o.enemyFail.map((t) => '  ✗ ' + t)];
      if (!o.roomFail.length && !o.enemyFail.length && !o.determinism.length) lines.push('', '✔ Todo correcto');
      this.text = lines.join('\n');
      const el = document.getElementById('testReport');
      el.querySelector('.trProg').textContent = 'Terminado';
      el.querySelector('.trOut').textContent = this.text;
      el.querySelector('.trCopy').classList.remove('hidden');
      if (VX.ErrLog && (o.roomFail.length || o.enemyFail.length || o.determinism.length)) VX.ErrLog.add(`Modo de pruebas: ${o.roomFail.length} salas y ${o.enemyFail.length} enemigos con problemas`, o.roomFail.concat(o.enemyFail).slice(0, 8).join('\n'), 'pruebas');
      this.running = false;
      window.__selftest = o;
    },
  };

  VX.SelfTest = SelfTest;
})();
