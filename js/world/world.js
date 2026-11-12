// El mundo: cadena de habitaciones, colisiones, raycast y destrucción.
(function () {
  const S = VX.S;

  const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  class World {
    constructor() {
      this.rooms = [];
      this.flow = null;
      this.flowRoom = null;
      this.flowTimer = 0;
    }

    reset() {
      for (const r of this.rooms) r.dispose();
      this.rooms = [];
      this.flow = null; this.flowRoom = null;
    }

    // Primera sala (inicio, guardado, título)
    addStart(type, index, exits, template, zone = 0) {
      const r = new VX.Room(index, type, template || VX.RoomPool.pick(type, zone), { entrance: 'zn', exits, zone });
      r.place(-r.cx, -4);
      r.build();
      this.rooms.push(r);
      return r;
    }

    // Sala vecina conectada a la salida 'side' de 'cur'
    addNeighbor(cur, side, type, exits, zone = 0, extra = {}) {
      const ent = VX.Room.OPP[side];
      const opts = { entrance: ent, exits, zone };
      // las salas laterales no invaden a las otras vecinas (fondo ≤ el de la sala actual)…
      // …salvo la guarida del jefe, que siempre es grande: entonces son las del frente/fondo
      // las que no pueden ser más anchas que la sala actual
      if ((side === 'xp' || side === 'xn') && type !== 'boss') opts.maxD = cur.d;
      if ((side === 'zp' || side === 'zn') && extra.lateralBoss) opts.maxW = cur.w;
      const r = new VX.Room(cur.index + 1, type, VX.RoomPool.pick(type, zone), opts);
      let ox, oz;
      if (side === 'zp') { ox = cur.ox + cur.cx - r.cx; oz = cur.oz + cur.D; }
      else if (side === 'zn') { ox = cur.ox + cur.cx - r.cx; oz = cur.oz - r.D; }
      else if (side === 'xp') { ox = cur.ox + cur.W; oz = cur.oz + cur.cz - r.cz; }
      else { ox = cur.ox - r.W; oz = cur.oz + cur.cz - r.cz; }
      r.place(ox, oz);
      r.build();
      r.parent = cur; r.parentSide = side;
      cur.doors[side].neighbor = r;
      cur.doors[side].type = type;
      this.rooms.push(r);
      return r;
    }

    keepOnly(list) {
      this.rooms = this.rooms.filter((r) => {
        if (list.includes(r)) return true;
        r.dispose();
        return false;
      });
      this.flow = null; this.flowRoom = null;
    }

    // Salas visibles: la actual y las vecinas con la puerta abierta
    visibleRooms(current) {
      if (!current) return this.rooms;
      const out = [current];
      for (const s in current.doors) {
        const d = current.doors[s];
        if (d.neighbor && !d.closed) out.push(d.neighbor);
      }
      return out;
    }

    groundAt(x, z) {
      const gx = Math.floor(x / S), gz = Math.floor(z / S);
      const r = this.roomAtG(gx, gz);
      if (!r) return 0;
      return r.groundL(gx - r.ox, gz - r.oz);
    }

    roomAtG(gx, gz) {
      for (const r of this.rooms) if (r.containsG(gx, gz)) return r;
      return null;
    }
    roomAt(x, z) { return this.roomAtG(Math.floor(x / S), Math.floor(z / S)); }

    getBlock(gx, gy, gz) {
      if (gy < 0) return VX.Blocks.BEDROCK; // suelo
      const r = this.roomAtG(gx, gz);
      if (!r) return 0;
      return r.get(gx - r.ox, gy, gz - r.oz);
    }

    isSolidG(gx, gy, gz) { return VX.Blocks.isSolid(this.getBlock(gx, gy, gz)); }
    isSolidAt(x, y, z) { return this.isSolidG(Math.floor(x / S), Math.floor(y / S), Math.floor(z / S)); }
    // Igual, pero sin las celdas invisibles de colisión de los objetos (para partículas)
    isSolidVisibleAt(x, y, z) { const b = this.getBlock(Math.floor(x / S), Math.floor(y / S), Math.floor(z / S)); return !VX.Blocks.invisible[b] && VX.Blocks.isSolid(b); }

    // ¿Colisiona la caja con algún vóxel sólido?
    boxCollides(minx, miny, minz, maxx, maxy, maxz) {
      const x0 = Math.floor(minx / S), x1 = Math.floor((maxx - 1e-6) / S);
      const y0 = Math.floor(miny / S), y1 = Math.floor((maxy - 1e-6) / S);
      const z0 = Math.floor(minz / S), z1 = Math.floor((maxz - 1e-6) / S);
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const r = this.roomAtG(x, z);
          for (let y = y0; y <= y1; y++) {
            if (y < 0) return true;
            if (!r) continue;
            if (VX.Blocks.isSolid(r.get(x - r.ox, y, z - r.oz))) return true;
          }
        }
      return false;
    }

    // Lista de vóxeles destructibles que tocan la caja (para el jefe "excavadora")
    smashBox(minx, miny, minz, maxx, maxy, maxz, game) {
      const x0 = Math.floor(minx / S), x1 = Math.floor((maxx - 1e-6) / S);
      const y0 = Math.max(0, Math.floor(miny / S)), y1 = Math.floor((maxy - 1e-6) / S);
      const z0 = Math.floor(minz / S), z1 = Math.floor((maxz - 1e-6) / S);
      let n = 0;
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const r = this.roomAtG(x, z);
          if (!r) continue;
          for (let y = y0; y <= y1; y++) {
            const lx = x - r.ox, lz = z - r.oz;
            const t = r.get(lx, y, lz);
            if (VX.Blocks.isDestructible(t)) { this.destroyCell(r, lx, y, lz, t, game, n < 30 ? 1 : 0); n++; }
          }
        }
      return n;
    }

    // Raycast DDA contra la rejilla. Devuelve el primer vóxel sólido.
    raycast(ox, oy, oz, dx, dy, dz, maxDist) {
      let gx = Math.floor(ox / S), gy = Math.floor(oy / S), gz = Math.floor(oz / S);
      const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
      const tDX = Math.abs(S / (dx || 1e-9)), tDY = Math.abs(S / (dy || 1e-9)), tDZ = Math.abs(S / (dz || 1e-9));
      const bx = (gx + (dx > 0 ? 1 : 0)) * S, by = (gy + (dy > 0 ? 1 : 0)) * S, bz = (gz + (dz > 0 ? 1 : 0)) * S;
      let tMX = dx !== 0 ? (bx - ox) / dx : Infinity;
      let tMY = dy !== 0 ? (by - oy) / dy : Infinity;
      let tMZ = dz !== 0 ? (bz - oz) / dz : Infinity;
      let t = 0, nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < 1400; i++) {
        const b = this.getBlock(gx, gy, gz);
        if (b && b !== 17 && VX.Blocks.isSolid(b)) {   // las celdas PROP las resuelve el propio objeto
          return { t, gx, gy, gz, nx, ny, nz, block: b, x: ox + dx * t, y: oy + dy * t, z: oz + dz * t };
        }
        if (tMX < tMY && tMX < tMZ) { gx += stepX; t = tMX; tMX += tDX; nx = -stepX; ny = 0; nz = 0; }
        else if (tMY < tMZ) { gy += stepY; t = tMY; tMY += tDY; nx = 0; ny = -stepY; nz = 0; }
        else { gz += stepZ; t = tMZ; tMZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
        if (t > maxDist) return null;
        if (gy > 60) return null;
      }
      return null;
    }

    // Línea de visión libre entre dos puntos
    lineOfSight(ax, ay, az, bx, by, bz) {
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const d = Math.hypot(dx, dy, dz);
      if (d < 0.01) return true;
      const h = this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d);
      return !h;
    }

    destroyCell(r, lx, ly, lz, t, game, debris = 4) {
      r.set(lx, ly, lz, 0);
      // cristales y persianas: se viene abajo el panel entero
      if (game && VX.Blocks.info[t].shatter) { this.shatter(r, lx, ly, lz, t, game); return; }
      if (t === VX.Blocks.BARREL && game) { this.detonateBarrel(r, lx, ly, lz, game); return; }
      if (game) this.queueSupport(r, lx, ly, lz);
      if (game && game.particles) {
        const col = VX.Blocks.color(t, r.ox + lx, ly, r.oz + lz, [0, 0, 0]);
        const cx = (r.ox + lx + 0.5) * S, cy = (ly + 0.5) * S, cz = (r.oz + lz + 0.5) * S;
        for (let i = 0; i < debris; i++) {
          game.particles.spawn(cx + VX.M.rand(-0.1, 0.1), cy + VX.M.rand(-0.1, 0.1), cz + VX.M.rand(-0.1, 0.1),
            VX.M.rand(-3, 3), VX.M.rand(1, 5), VX.M.rand(-3, 3),
            col[0], col[1], col[2], VX.M.rand(0.05, 0.12), VX.M.rand(2.5, 5), 0);
        }
        // si el bloque sujetaba una antorcha, cae
        for (const t of r.torches) {
          if (t.alive && t.anchor[0] === lx && t.anchor[1] === ly && t.anchor[2] === lz) {
            t.alive = false;
            for (let i = 0; i < 12; i++) game.particles.spawn(t.x, t.y, t.z, VX.M.rand(-2, 2), VX.M.rand(0, 3), VX.M.rand(-2, 2), 1, 0.6, 0.2, 0.05, VX.M.rand(0.4, 1), 1);
            VX.Audio.torch();
          }
        }
      }
    }

    // Rompe de golpe todas las celdas del mismo tipo unidas a la que se ha roto
    shatter(r, sx, sy, sz, t, game) {
      const M = VX.M, glass = VX.Blocks.info[t].glass;
      const q = [[sx, sy, sz]], seen = new Set([r.idx(sx, sy, sz)]);
      for (let h = 0; h < q.length && q.length < 700; h++) {
        const [x, y, z] = q[h];
        for (const [dx, dy, dz] of N6) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (!r.inBounds(nx, ny, nz)) continue;
          const i = r.idx(nx, ny, nz);
          if (seen.has(i) || r.grid[i] !== t) continue;
          seen.add(i); q.push([nx, ny, nz]);
        }
      }
      const col = VX.Blocks.color(t, r.ox + sx, sy, r.oz + sz, [0, 0, 0]);
      let n = 0;
      for (const [x, y, z] of q) {
        if (n++) r.set(x, y, z, 0);
        this.queueSupport(r, x, y, z);
        if (Math.random() < (glass ? 0.35 : 0.2)) {
          const cx = (r.ox + x + 0.5) * S, cy = (y + 0.5) * S, cz = (r.oz + z + 0.5) * S;
          if (glass) game.particles.spawn(cx, cy, cz, M.rand(-2.5, 2.5), M.rand(-0.5, 2), M.rand(-2.5, 2.5), 0.55, 0.75, 0.85, M.rand(0.025, 0.06), M.rand(1.2, 2.5), 0.15);
          else game.particles.spawn(cx, cy, cz, M.rand(-2, 2), M.rand(0, 3), M.rand(-2, 2), col[0], col[1], col[2], M.rand(0.04, 0.09), M.rand(1.5, 3), 0);
        }
      }
      if (glass) { VX.Audio.glass && VX.Audio.glass(q.length); }
      else { VX.Audio.crumble(); VX.Audio.slam && q.length > 30 && VX.Audio.punch(); }
      if (game.shake) game.shake(Math.min(0.25, q.length / 600));
    }

    // ---------- Derrumbes ----------
    // Al romper un bloque se comprueba si lo que había al lado sigue apoyado en el suelo
    // o en las paredes de la sala. Lo que queda colgando (un pilar sin base, un arco
    // sin columna…) se viene abajo de una pieza y, si es alto, se vuelca.
    queueSupport(r, lx, ly, lz) { (this.supportQ || (this.supportQ = [])).push([r, lx, ly, lz]); }

    processSupport(game) {
      const Q = this.supportQ;
      if (!Q || !Q.length) return;
      this.supportQ = [];
      const done = new Set();
      let budget = 30000;
      for (const [r, x, y, z] of Q) {
        for (const [dx, dy, dz] of N6) {
          if (budget <= 0) return;
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (!r.inBounds(nx, ny, nz) || done.has(r.idx(nx, ny, nz) * 64 + (r.index % 64))) continue;
          const res = this.findUnsupported(r, nx, ny, nz, done);
          if (!res) continue;
          budget -= res.visited;
          if (res.cells) game.addBlockFaller(r, res.cells);
        }
      }
    }

    findUnsupported(r, sx, sy, sz, done) {
      const B = VX.Blocks, W = r.W, D = r.D, top = r.H - 4;
      const shell = (x, z) => Math.min(x, z, W - 1 - x, D - 1 - z) < 4;
      const movable = (t) => t && t !== B.PROP && t !== B.DOOR && t !== B.BEDROCK && B.info[t].hp !== Infinity;
      const t0 = r.inBounds(sx, sy, sz) ? r.grid[r.idx(sx, sy, sz)] : 0;
      if (!movable(t0) || sy >= top || shell(sx, sz)) return null;
      const LIMIT = 9000, key = (i) => i * 64 + (r.index % 64);
      const seen = new Set([r.idx(sx, sy, sz)]);
      const q = [[sx, sy, sz]];
      let supported = false;
      for (let h = 0; h < q.length; h++) {
        const [x, y, z] = q[h];
        if (y === 0) { supported = true; break; }
        if (q.length > LIMIT) { supported = true; break; }
        for (const [dx, dy, dz] of N6) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (!r.inBounds(nx, ny, nz)) continue;
          if (ny >= top) { if (r.topSupports && r.grid[r.idx(nx, ny, nz)]) { supported = true; break; } continue; }
          const i = r.idx(nx, ny, nz), t = r.grid[i];
          if (!t) continue;
          if (shell(nx, nz) || !movable(t)) {
            // apoyado en la pared de la sala o en algo fijo (puertas, hierro…)
            if (t !== B.PROP) { supported = true; break; }
            continue;
          }
          if (!seen.has(i)) { seen.add(i); q.push([nx, ny, nz]); }
        }
        if (supported) break;
      }
      for (const i of seen) done.add(key(i));
      if (supported) return { visited: seen.size };
      return { visited: seen.size, cells: q };
    }

    // Un barril explosivo dañado revienta: se quita entero y se programa la explosión
    detonateBarrel(r, lx, ly, lz, game) {
      const B = VX.Blocks.BARREL;
      const stack = [[lx, ly, lz]];
      let sx = 0, sy = 0, sz = 0, n = 0;
      const seen = new Set();
      while (stack.length) {
        const [x, y, z] = stack.pop();
        const k = (y * r.D + z) * r.W + x;
        if (seen.has(k)) continue;
        seen.add(k);
        sx += x; sy += y; sz += z; n++;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (r.get(nx, ny, nz) === B) { r.set(nx, ny, nz, 0); stack.push([nx, ny, nz]); }
        }
      }
      const cx = (r.ox + sx / n + 0.5) * S, cy = (sy / n + 0.5) * S, cz = (r.oz + sz / n + 0.5) * S;
      game.queueExplosion({ x: cx, y: cy, z: cz, R: 2.4, dmg: 110, destr: 1, delay: 0.12 });
    }

    // Daño esférico a bloques. Devuelve nº de bloques destruidos.
    damageSphere(x, y, z, radius, dmg, game) {
      const r0 = Math.ceil(radius / S);
      const cgx = Math.floor(x / S), cgy = Math.floor(y / S), cgz = Math.floor(z / S);
      let destroyed = 0;
      for (let gx = cgx - r0; gx <= cgx + r0; gx++)
        for (let gz = cgz - r0; gz <= cgz + r0; gz++) {
          const r = this.roomAtG(gx, gz);
          if (!r) continue;
          for (let gy = Math.max(0, cgy - r0); gy <= cgy + r0; gy++) {
            const cx = (gx + 0.5) * S, cy = (gy + 0.5) * S, cz = (gz + 0.5) * S;
            const d = Math.hypot(cx - x, cy - y, cz - z);
            if (d > radius + S * 0.5) continue;
            const lx = gx - r.ox, lz = gz - r.oz;
            if (!r.inBounds(lx, gy, lz)) continue;
            const i = r.idx(lx, gy, lz);
            const t = r.grid[i];
            if (!VX.Blocks.isDestructible(t)) continue;
            const k = Math.max(0.25, 1 - d / (radius + S));
            r.hp[i] -= dmg * k;
            r.dirty = true;
            if (r.hp[i] <= 0) {
              this.destroyCell(r, lx, gy, lz, t, game, destroyed < 10 ? 2 : (destroyed < 40 ? 1 : 0));
              destroyed++;
            }
          }
        }
      if (destroyed && game) VX.Audio.crumble();
      return destroyed;
    }

    // ---------- Campo de flujo (pathfinding de los enemigos) ----------
    updateFlow(room, px, pz, dt) {
      this.flowTimer -= dt;
      if (this.flowRoom === room && this.flowTimer > 0 && this.flow) return;
      this.flowTimer = 0.25;
      this.flowRoom = room;
      const W = room.W, D = room.D;
      const walk = room.getWalk();
      const dist = new Int16Array(W * D).fill(-1);
      let sx = Math.floor(px / S) - room.ox, sz = Math.floor(pz / S) - room.oz;
      sx = VX.M.clamp(sx, 0, W - 1); sz = VX.M.clamp(sz, 0, D - 1);
      const q = new Int32Array(W * D);
      const hm = room.hmap;
      let qh = 0, qt = 0;
      dist[sz * W + sx] = 0; q[qt++] = sz * W + sx;
      const visit = (c, n, nd) => {
        if (walk[n] && dist[n] < 0 && Math.abs(hm[n] - hm[c]) <= 2) { dist[n] = nd; q[qt++] = n; }
      };
      while (qh < qt) {
        const c = q[qh++];
        const cx = c % W, cz = (c - cx) / W;
        const nd = dist[c] + 1;
        if (cx > 0) visit(c, c - 1, nd);
        if (cx < W - 1) visit(c, c + 1, nd);
        if (cz > 0) visit(c, c - W, nd);
        if (cz < D - 1) visit(c, c + W, nd);
      }
      this.flow = dist;
    }

    // Dirección hacia el jugador según el campo de flujo
    flowDir(x, z, out) {
      const room = this.flowRoom, dist = this.flow;
      out[0] = 0; out[1] = 0;
      if (!room || !dist) return false;
      const W = room.W, D = room.D;
      const cx = Math.floor(x / S) - room.ox, cz = Math.floor(z / S) - room.oz;
      if (cx < 0 || cz < 0 || cx >= W || cz >= D) return false;
      const cur = dist[cz * W + cx];
      let best = cur < 0 ? 32767 : cur, bx = 0, bz = 0;
      const walk = room.getWalk();
      for (let oz = -1; oz <= 1; oz++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oz) continue;
          const nx = cx + ox, nz = cz + oz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
          if (ox && oz && (!walk[cz * W + nx] || !walk[nz * W + cx])) continue;
          const d = dist[nz * W + nx];
          if (d >= 0 && d < best) { best = d; bx = ox; bz = oz; }
        }
      if (!bx && !bz) return false;
      // apuntar al centro de la celda vecina
      const tx = (room.ox + cx + bx + 0.5) * S, tz = (room.oz + cz + bz + 0.5) * S;
      const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1;
      out[0] = dx / l; out[1] = dz / l;
      return true;
    }

    // ¿Se puede ir andando en línea recta entre dos puntos (m)? Usa el mapa transitable de la sala
    // de flujo: todas las celdas atravesadas deben ser transitables y sin escalones > 2 vóxeles.
    // Primer objeto (barril, caja…) que corta el rayo
    propHit(ox, oy, oz, dx, dy, dz, maxT) {
      let best = null;
      for (const r of this.rooms) for (const p of r.props) {
        if (p.dead || p.def.soft) continue;
        const h = p.rayHit(ox, oy, oz, dx, dy, dz, best ? best.t : maxT);
        if (h) best = h;
      }
      return best;
    }

    // Las cosas blandas (telarañas, paja, charcos) no paran la bala, pero se rompen a su paso
    cutSoft(ox, oy, oz, dx, dy, dz, maxT, dmg, game) {
      for (const r of this.rooms) for (const p of r.props) {
        if (p.dead || !p.def.soft) continue;
        const h = p.rayHit(ox, oy, oz, dx, dy, dz, maxT);
        if (h) p.hit(h, dmg, { dx, dy, dz }, game);
      }
    }

    straightWalk(x0, z0, x1, z1) {
      const room = this.flowRoom;
      if (!room) return false;
      const walk = room.getWalk(), hm = room.hmap, W = room.W, D = room.D;
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
      const n = Math.max(1, Math.ceil(len / (S * 0.5)));
      let prev = -1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const cx = Math.floor((x0 + dx * t) / S) - room.ox, cz = Math.floor((z0 + dz * t) / S) - room.oz;
        if (cx < 0 || cz < 0 || cx >= W || cz >= D) return false;
        const c = cz * W + cx;
        if (c === prev) continue;
        if (i > 0 && i < n && !walk[c]) return false;
        if (prev >= 0 && Math.abs(hm[c] - hm[prev]) > 2) return false;
        prev = c;
      }
      return true;
    }

    // Dirección suavizada hacia el jugador: sigue el campo de flujo varias celdas por delante y
    // apunta a la más lejana que se ve en línea recta (camino "estirado", sin zigzag de rejilla).
    pathDir(x, z, out) {
      const room = this.flowRoom, dist = this.flow;
      out[0] = 0; out[1] = 0;
      if (!room || !dist) return false;
      const W = room.W, D = room.D, walk = room.getWalk();
      let cx = Math.floor(x / S) - room.ox, cz = Math.floor(z / S) - room.oz;
      if (cx < 1 || cz < 1 || cx >= W - 1 || cz >= D - 1) return false;
      if (dist[cz * W + cx] < 0) return this.flowDir(x, z, out);
      let px = cx, pz = cz, tx = 0, tz = 0, found = false;
      for (let step = 0; step < 14; step++) {
        const cur = dist[pz * W + px];
        if (cur <= 0) break;
        let best = cur, bx = 0, bz = 0;
        for (let oz = -1; oz <= 1; oz++)
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oz) continue;
            const nx = px + ox, nz = pz + oz;
            if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
            if (ox && oz && (!walk[pz * W + nx] || !walk[nz * W + px])) continue;
            const d = dist[nz * W + nx];
            if (d >= 0 && d < best) { best = d; bx = ox; bz = oz; }
          }
        if (!bx && !bz) break;
        px += bx; pz += bz;
        const wx = (room.ox + px + 0.5) * S, wz = (room.oz + pz + 0.5) * S;
        if (step < 2 || this.straightWalk(x, z, wx, wz)) { tx = wx; tz = wz; found = true; }
        else break;
      }
      if (!found) return this.flowDir(x, z, out);
      const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz);
      if (l < 1e-4) return this.flowDir(x, z, out);
      out[0] = dx / l; out[1] = dz / l;
      return true;
    }

    // Reconstruye mallas: la sala del jugador entera, las demás poco a poco
    updateMeshes(R, current) {
      let budget = current && current.cleared ? 14 : 6;
      for (const r of this.rooms) {
        if (r === current) r.updateMeshes(R, 999);
        else if (budget > 0) budget -= r.updateMeshes(R, budget);
      }
    }

    // Las salas siguientes solo se dibujan si la puerta de salida está abierta
    render(R, current) {
      for (const r of this.visibleRooms(current)) r.draw(R);
    }
    renderGlass(R, current) {
      for (const r of this.visibleRooms(current)) r.drawGlass(R);
    }

    // Luces de antorchas de las salas visibles
    collectLights(out, t, rooms) {
      for (const r of rooms) {
        const TC = (VX.ZONES[r.zone || 0] || VX.ZONES[0]).torch || [3.3, 1.6, 0.5];
        for (const tc of r.torches) {
          if (!tc.alive) continue;
          const fl = 0.85 + Math.sin(t * 9 + tc.phase) * 0.08 + Math.sin(t * 23.7 + tc.phase * 3) * 0.06;
          out.push({ x: tc.x + tc.nx * 0.15, y: tc.y + 0.15, z: tc.z + tc.nz * 0.15, r: 10.5, cr: TC[0] * fl, cg: TC[1] * fl, cb: TC[2] * fl, torch: tc });
        }
        for (const sp of r.spikes) {
          if (sp.kind === 'spikes') continue;
          const PL = VX.POOLS[sp.kind] || VX.POOLS.acid;
          if (!PL.light) continue;
          const fl = 0.85 + Math.sin(t * 3 + sp.phase) * 0.15;
          out.push({ x: r.uX((sp.ux0 + sp.ux1 + 1) / 2), y: 0.5, z: r.uZ((sp.uz0 + sp.uz1 + 1) / 2), r: 5,
            cr: PL.light[0] * fl, cg: PL.light[1] * fl, cb: PL.light[2] * fl });
        }
        for (const f of r.features) {
          if (f.kind !== 'light') continue;
          if (f.cell !== undefined && !r.grid[f.cell]) continue;   // farola rota a tiros
          let fl = 0.95 + Math.sin(t * 2 + f.x) * 0.05, c = f.c;
          if (f.flick) fl = 0.75 + Math.sin(t * 13 + f.x * 3) * 0.13 + Math.sin(t * 29 + f.z * 5) * 0.09;
          if (f.broken) fl *= Math.sin(t * 7.3 + f.x * 13) > 0.86 || Math.sin(t * 23 + f.z) > 0.97 ? 0.08 : 1;
          if (f.siren) c = ((t * 2.2 + f.x) % 2) < 1 ? [1.4, 0.08, 0.06] : [0.1, 0.25, 1.6];
          out.push({ x: f.x, y: f.y, z: f.z, r: f.r * 1.15, cr: c[0] * 2.6 * fl, cg: c[1] * 2.6 * fl, cb: c[2] * 2.6 * fl });
        }
      }
    }

    renderTorches(batch, t, rooms) {
      for (const r of rooms || this.rooms) {
        const FC = (VX.ZONES[r.zone || 0] || VX.ZONES[0]).flame || [1, 0.75, 0.25];
        for (const tc of r.torches) {
          if (!tc.alive) continue;
          const bx = tc.x - tc.nx * 0.18, bz = tc.z - tc.nz * 0.18;
          // soporte
          batch.box(bx, tc.y - 0.28, bz, 0.07, 0.07, 0.07, 0.15, 0.15, 0.17);
          batch.box(bx + tc.nx * 0.07, tc.y - 0.22, bz + tc.nz * 0.07, 0.06, 0.06, 0.06, 0.15, 0.15, 0.17);
          // palo
          for (let i = 0; i < 4; i++)
            batch.box(tc.x - tc.nx * (0.1 - i * 0.025), tc.y - 0.24 + i * 0.06, tc.z - tc.nz * (0.1 - i * 0.025), 0.05, 0.06, 0.05, 0.35, 0.22, 0.1);
          // llama
          for (let i = 0; i < 5; i++) {
            const k = Math.sin(t * 14 + i * 2.1 + tc.phase);
            const s = 0.06 - i * 0.008 + k * 0.01;
            const yy = tc.y + i * 0.05 + Math.abs(k) * 0.02;
            batch.box(tc.x + k * 0.012, yy, tc.z + Math.cos(t * 11 + i) * 0.012, s, s, s, FC[0] * (1 - i * 0.03), FC[1] * (1 - i * 0.12), FC[2] * (1 - i * 0.15), 1);
          }
        }
      }
    }
  }

  VX.World = World;
})();
