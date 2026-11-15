// Interfaz en pantalla (DOM superpuesto al canvas).
(function () {
  const $ = (id) => document.getElementById(id);
  const M0 = (a, b) => a + Math.random() * (b - a);

  const TYPE_LABEL = {
    start: 'Entrada', normal: 'Sala infestada', shop: 'Vendedor', reward: 'Recompensa', boss: 'Guarida del jefe', save: 'Fuente de almas', map: 'Cartógrafo',
  };

  const HUD = {
    hitT: 0, dmgT: 0, bannerT: 0, toastT: 0, goldPulse: 0,
    lastKey: '',

    init() {
      this.el = {
        hud: $('hud'), floor: $('floorLabel'), room: $('roomLabel'), gold: $('goldValue'),
        hp: $('hpFill'), hpText: $('hpText'), ammo: $('ammoText'), reload: $('reloadFill'),
        reloadBar: $('reloadFill').parentElement, stats: $('weaponStats'),
        prompt: $('prompt'), banner: $('banner'), bannerTitle: $('bannerTitle'), bannerSub: $('bannerSub'),
        hit: $('hitmarker'), vig: $('vignette'), boss: $('bossBar'), bossName: $('bossName'), bossFill: $('bossFill'),
        ups: $('upgradeList'), enemies: $('enemyCount'), fps: $('fps'), door: $('doorHint'), slots: $('weaponSlots'),
      };
    },

    show(v) { this.el.hud.classList.toggle('hidden', !v); },

    banner(title, sub = '', time = 2.4) {
      this.el.bannerTitle.textContent = title;
      this.el.bannerSub.textContent = sub;
      const b = this.el.banner;
      b.classList.add('hidden'); void b.offsetWidth; b.classList.remove('hidden');
      this.bannerT = time;
    },

    toast(msg) { this.banner('', msg, 1.4); },

    // Comparación de un arma de la tienda con la que llevas en la mano (o la que sustituiría)
    weaponCompare(game, id) {
      const W = game.weapon;
      if (!W || !VX.Weapons.DEFS[id] || VX.Weapons.DEFS[id].melee) return '';
      if (W.slots.some((s) => s.id === id)) return '<div class="cmp"><span class="cmpEq">Ya la llevas: te llena la munición</span></div>';
      const guns = W.slots.filter((s) => !VX.Weapons.DEFS[s.id].melee);
      const ref = W.def.melee ? guns[0] : W.slot;
      if (!ref) return '';
      const a = W.stats(id), b = W.stats(ref.id);
      const dps = (s) => s.damage * (s.pellets || 1) * s.fireRate;
      const rows = [
        ['DPS', dps(a), dps(b), true], ['Daño', a.damage * (a.pellets || 1), b.damage * (b.pellets || 1), true],
        ['Cadencia', a.fireRate, b.fireRate, true], ['Cargador', a.mag, b.mag, true],
        ['Recarga', a.reload, b.reload, false], ['Alcance', a.range, b.range, true], ['Dispersión', a.spread, b.spread, false],
      ];
      const chip = ([n, x, y, up]) => {
        if (!y || Math.abs(x - y) / Math.abs(y) < 0.04) return `<span class="cmpEq">= ${n}</span>`;
        const p = Math.round((x - y) / Math.abs(y) * 100), good = up ? x > y : x < y;
        return `<span class="${good ? 'cmpUp' : 'cmpDn'}">${good ? '▲' : '▼'} ${n} ${p > 0 ? '+' : ''}${p}%</span>`;
      };
      const note = guns.length < 2 ? 'se añade' : 'sustituye a ' + VX.Weapons.DEFS[ref.id].name.toLowerCase();
      return `<div class="cmp"><small>Frente a tu ${VX.Weapons.DEFS[ref.id].name.toLowerCase()} (${note}):</small><br>${rows.map(chip).join(' ')}</div>`;
    },

    // Llaves de colores que llevas (para las rejas de las cámaras)
    setKeys(k) {
      const el = $('keyLabel');
      if (!el) return;
      const parts = [];
      for (const c of ['wood', 'silver', 'gold']) if (k && k[c]) parts.push(`<span class="key k-${c}"></span>${VX.Settings.data.colorblind ? '<b class="ksym">' + { wood: 'M', silver: 'P', gold: 'O' }[c] + '</b>' : ''}${k[c] > 1 ? '×' + k[c] : ''}`);
      el.innerHTML = parts.join(' ');
      el.classList.toggle('hidden', !parts.length);
    },

    // Indicadores visuales de sonido: un arco alrededor de la mira hacia donde suena algo,
    // con una etiqueta corta (voz, pasos, explosión…). Se activan en Ajustes.
    soundAt(x, z, tag) {
      const g = VX.game, P = g && g.player;
      if (!P || g.state !== 'playing') return;
      const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
      if (d < 0.8 || d > 40) return;
      const sx = dx / d, sz = dz / d;
      const fwd = sx * Math.sin(P.yaw) + sz * Math.cos(P.yaw), rgt = sx * -Math.cos(P.yaw) + sz * Math.sin(P.yaw);
      const ang = Math.atan2(rgt, fwd);
      const bucket = Math.round(ang / (Math.PI / 8)) + ':' + tag, now = performance.now();
      this._snd = this._snd || {};
      if (this._snd[bucket] && now - this._snd[bucket] < 350) return;
      this._snd[bucket] = now;
      const near = Math.max(0.25, 1 - d / 30);
      const C = { enemy: '255,110,60', dog: '255,110,60', steps: '255,210,90', boom: '255,80,40', sound: '170,210,255' }[tag] || '170,210,255';
      const L = { enemy: 'gruñido', dog: 'gruñido', steps: 'pasos', boom: 'explosión', sound: 'ruido' }[tag] || 'ruido';
      const box = $('sndDirs');
      if (!box) return;
      if (box.childElementCount > 14) box.firstChild.remove();
      const a = document.createElement('div');
      a.className = 'sndArc';
      a.style.transform = `rotate(${ang}rad)`;
      a.style.setProperty('--c', C); a.style.setProperty('--w', (18 + near * 22) + 'deg'); a.style.setProperty('--a', (0.35 + near * 0.6).toFixed(2));
      const t = document.createElement('div');
      t.className = 'sndTag';
      t.textContent = L;
      t.style.left = Math.sin(ang) * 175 + 'px'; t.style.top = -Math.cos(ang) * 175 + 'px'; t.style.color = `rgb(${C})`;
      box.appendChild(a); box.appendChild(t);
      setTimeout(() => { a.remove(); t.remove(); }, 1300);
    },

    hitmarker(kill) {
      this.hitT = kill ? 0.3 : 0.15;
      this.el.hit.classList.toggle('kill', !!kill);
    },

    flashDamage(a) { this.dmgT = Math.max(this.dmgT, a); },

    // Golpe recibido: arco de dirección, salpicadura de sangre en pantalla y número de daño
    hurt(amount, ang, ratio) {
      const k = Math.min(1, amount / 30);
      const fx = !VX.Settings || VX.Settings.data.hurtFx;
      if (ang !== null) {
        const d = document.createElement('div');
        d.className = 'dmgArc';
        d.style.transform = `rotate(${ang}rad)`;
        d.style.setProperty('--w', (60 + k * 60) + 'deg');
        $('dmgDirs').appendChild(d);
        setTimeout(() => d.remove(), 1200);
      }
      // salpicaduras en los bordes
      const bs = $('bloodScreen');
      const blobs = [];
      for (let i = 0; i < 3 + Math.round(k * 5); i++) {
        const edge = Math.random() < 0.5;
        const x = edge ? (Math.random() < 0.5 ? M0(0, 18) : M0(82, 100)) : M0(0, 100);
        const y = edge ? M0(0, 100) : (Math.random() < 0.5 ? M0(0, 15) : M0(85, 100));
        const r = M0(6, 14) * (0.7 + k);
        blobs.push(`radial-gradient(circle at ${x}% ${y}%, rgba(120,0,0,.85) 0, rgba(90,0,0,.6) ${r * 0.6}%, transparent ${r}%)`);
      }
      bs.style.background = blobs.join(',');
      if (fx) this.bloodT = Math.max(this.bloodT || 0, 0.6 + k * 0.9);
      // la barra de vida tiembla y aparece el daño
      const bl = $('bottomLeft');
      bl.classList.remove('hit'); void bl.offsetWidth; bl.classList.add('hit');
      const n = document.createElement('div');
      n.className = 'dmgNum';
      n.textContent = '-' + Math.round(amount);
      bl.appendChild(n);
      setTimeout(() => n.remove(), 900);
      void ratio;
    },
    pulseGold() { this.goldPulse = 0.2; },

    showBoss(boss) {
      this.el.boss.classList.remove('hidden');
      this.el.bossName.textContent = boss.name;
      this.banner(boss.name, '¡Prepárate!', 3);
    },
    hideBoss() { this.el.boss.classList.add('hidden'); },

    // ---------- Mapa (tecla M) ----------
    // Mapa [M]: a la izquierda, la sala actual vista desde arriba (suelo, obstáculos, peligros,
    // puertas con lo que hay detrás, objetos, enemigos y tú); a la derecha, el piso: qué hay tras
    // cada puerta y, con el mapa del cartógrafo estudiado, lo que viene después (nombre de la sala,
    // si está a oscuras, con niebla, peligros, rejas y grietas secretas).
    showMap(game, force) {
      const el = document.getElementById('mapOverlay');
      if (!el) return;
      if (!force && !el.classList.contains('hidden')) { el.classList.add('hidden'); this.mapOpen = false; return; }
      const T = VX.ROOM_TYPES, Z = VX.ZONES;
      const ICON = { normal: '☠', reward: '★', shop: '$', save: '✦', boss: '◆', start: '▶', map: '✎' };
      const rgb = (c) => c.map((v) => Math.round(Math.min(1, v) * 255)).join(',');
      const chip = (type, extra = '') => `<span class="mchip ${extra}" style="color:rgb(${rgb((T[type] || T.normal).color)})" title="${(T[type] || {}).label || type}">${ICON[type] || '?'}</span>`;
      const r = game.currentRoom, zn = Z[game.zone || 0];
      const reveal = game.mapReveal > 0;
      const HZ = { lava: 'lava', acid: 'ácido', spikes: 'púas', spores: 'esporas', void: 'vacío', water: 'agua' };
      const roomTags = (n) => {
        const t = [];
        if (n.dark) t.push('a oscuras');
        if (n.gfog) t.push(n.gfog.thick ? 'niebla espesa' : 'niebla');
        const hz = [...new Set((n.spikes || []).map((s) => HZ[s.kind]).filter(Boolean))];
        if (hz.length) t.push(hz.join(', '));
        if (n.vault) t.push(`<span class="mkey k-gold"></span> cerradura`);
        if (n.secret) t.push(`<span class="msecret">${n.secret.stairs ? '✦ grieta con escalera' : '✦ grieta secreta'}</span>`);
        return t.join(' · ');
      };
      let h = `<h2>MAPA · ${game.floor === 0 ? 'Entrada' : 'Piso ' + game.floor} · ${zn.name}</h2>`;
      h += `<div class="msub">${reveal ? `Mapa del cartógrafo estudiado: ves dos salas por delante y lo que esconden (${game.mapReveal} salas más)` : 'Busca la Sala del cartógrafo (✎) para ver qué hay más allá'}</div>`;
      h += '<div class="mcols"><div class="mleft"><canvas id="mapCanvas" width="340" height="340"></canvas>';
      h += '<div class="mlegend"><span><i style="background:#e8e2d0"></i>tú</span><span><i style="background:#ff4a3a"></i>enemigos</span><span><i style="background:#ffd23f"></i>objetos</span><span><i style="background:#c75a1e"></i>lava</span><span><i style="background:#5fc84a"></i>ácido</span><span><i style="background:#2c5a78"></i>agua</span><span><i style="background:#8a3fe0"></i>vacío/esporas</span><span><i style="background:#888"></i>púas</span></div></div>';
      // ---- columna derecha: la sala y el piso ----
      const alive = game.enemies.filter((e) => !e.dead).length;
      h += '<div class="mright">';
      h += `<div class="mroom"><b>${r.name || ''}</b> ${chip(r.type)}<br><span class="mtags">${roomTags(r) || '&nbsp;'}</span><br>${alive ? `<span style="color:#ff6a5a">${alive} enemigo${alive > 1 ? 's' : ''} en la sala</span>` : r.cleared ? '<span style="color:#7fd07f">Sala despejada</span>' : ''}</div>`;
      const k = game.keys || {};
      const keys = ['wood', 'silver', 'gold'].filter((c) => k[c]).map((c) => `<span class="mkey k-${c}"></span>${k[c] > 1 ? '×' + k[c] : ''}`).join(' ');
      if (keys) h += `<div class="mline">Llaves: ${keys}</div>`;
      const sp = game.spawner;
      if (sp && sp.secret) h += `<div class="mline" style="color:#c79bff">Vacío: ${sp.secret.rooms > 0 ? sp.secret.rooms + ' salas hasta el guardián' : 'el guardián espera'}</div>`;
      else if (sp && sp.bossSoon) h += '<div class="mline" style="color:#ff8a5a">◆ La guarida del jefe está cerca</div>';
      else if (game.floor < 10) h += `<div class="mline">Primer jefe a partir del piso 10</div>`;
      // puertas de la sala actual
      const dirs = { zp: [0, 1], zn: [0, -1], xp: [1, 0], xn: [-1, 0] };
      const f = dirs[VX.Room.OPP[r.entrance || 'zn']], right = [-f[1], f[0]];
      const label = (s) => { const v = dirs[s]; return v[0] === f[0] && v[1] === f[1] ? 'Al frente' : v[0] === right[0] && v[1] === right[1] ? 'Derecha' : 'Izquierda'; };
      h += '<h3>Puertas</h3><div class="mexits">';
      for (const s of r.exits || []) {
        const d = r.doors[s];
        if (!d || !d.type) continue;
        const n = d.neighbor;
        h += `<div class="mexit"><b>${label(s)}</b> ${chip(d.type)} ${(T[d.type] || {}).label || ''}`;
        if (reveal && n) {
          h += `<div class="mname">${n.name || ''}</div>`;
          const tg = roomTags(n);
          if (tg) h += `<div class="mtags">${tg}</div>`;
          if (n.plannedTypes) h += `<div class="mnext">y después: ${n.plannedTypes.map((t) => chip(t)).join(' ')}</div>`;
        }
        h += '</div>';
      }
      h += '</div>';
      // camino recorrido
      const path = (game.mapPath || []).slice(-14);
      h += '<h3>Recorrido</h3><div class="mrow">' + path.map((p, i) => {
        const zc = Z[p.zone].fog.map((v) => Math.round(Math.min(1, v * 12) * 255)).join(',');
        return `<span class="mstep" style="border-color:rgb(${zc})">${chip(p.type, i === path.length - 1 ? 'mcur' : '')}</span>`;
      }).join('<span class="mlink">›</span>') + '</div>';
      h += '</div></div><div class="mhint">' + VX.Settings.tag('map') + ' cerrar</div>';
      el.innerHTML = h;
      el.classList.remove('hidden');
      this.mapOpen = true; this.mapT = 0;
      this.drawRoomMap(game);
    },

    // Planta de la sala actual (se redibuja mientras el mapa está abierto)
    drawRoomMap(game) {
      const cv = document.getElementById('mapCanvas'), r = game.currentRoom;
      if (!cv || !r || !r.hmap) return;
      const ctx = cv.getContext('2d'), W = r.W, D = r.D, S = VX.S;
      if (!this._mapImg || this._mapRoom !== r || this._mapVer !== r.mapVersion) {
        // fondo: suelo, obstáculos y muros (sólo cambia si se rompe algo)
        const img = ctx.createImageData(W, D), walk = r.getWalk(), hm = r.hmap;
        for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
          const i = z * W + x, o = i * 4, m = Math.min(x, z, W - 1 - x, D - 1 - z);
          let c;
          if (m < 4 && hm[i] > 0) c = [26, 22, 20];
          else if (walk[i]) { const k = Math.min(1, hm[i] / 10); c = [70 + k * 50, 62 + k * 44, 54 + k * 36]; }
          else if (hm[i] > 0) c = [140, 128, 112];
          else c = [52, 46, 42];
          img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
        }
        const HC = { lava: [199, 90, 30], acid: [95, 200, 74], water: [44, 90, 120], void: [138, 63, 224], spores: [138, 63, 224], spikes: [136, 136, 136] };
        for (const sp of r.spikes || []) {
          const c = HC[sp.kind] || [136, 136, 136];
          for (let z = sp.uz0 * 2; z < (sp.uz1 + 1) * 2; z++) for (let x = sp.ux0 * 2; x < (sp.ux1 + 1) * 2; x++) {
            if (x < 0 || z < 0 || x >= W || z >= D) continue;
            const o = (z * W + x) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2];
          }
        }
        const off = document.createElement('canvas'); off.width = W; off.height = D;
        off.getContext('2d').putImageData(img, 0, 0);
        this._mapImg = off; this._mapRoom = r; this._mapVer = r.mapVersion;
      }
      const sc = Math.min(cv.width / W, cv.height / D), ox = (cv.width - W * sc) / 2, oz = (cv.height - D * sc) / 2;
      // orientado según la entrada: la puerta por la que entraste queda abajo
      const rot = { zn: 0, zp: Math.PI, xn: -Math.PI / 2, xp: Math.PI / 2 }[r.entrance || 'zn'] || 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0c0a0d'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(rot); ctx.scale(1, -1); ctx.translate(-cv.width / 2, -cv.height / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._mapImg, ox, oz, W * sc, D * sc);
      const P2 = (wx, wz) => [ox + (wx / S - r.ox) * sc, oz + (wz / S - r.oz) * sc];
      const dot = (wx, wz, rad, col) => { const [x, y] = P2(wx, wz); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
      // modo para daltónicos: los enemigos son cruces y los objetos rombos (no sólo rojo y amarillo)
      const cb = VX.Settings.data.colorblind;
      const cross = (wx, wz, rad, col) => { const [x, y] = P2(wx, wz); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, rad * 0.7); ctx.beginPath(); ctx.moveTo(x - rad, y - rad); ctx.lineTo(x + rad, y + rad); ctx.moveTo(x + rad, y - rad); ctx.lineTo(x - rad, y + rad); ctx.stroke(); };
      const diamond = (wx, wz, rad, col) => { const [x, y] = P2(wx, wz); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - rad); ctx.lineTo(x + rad, y); ctx.lineTo(x, y + rad); ctx.lineTo(x - rad, y); ctx.closePath(); ctx.fill(); };
      // antorchas
      for (const t of r.torches || []) if (t.alive) dot(t.x, t.z, 2.2, '#ff9a3a');
      // reja y grieta
      if (r.vault && !r.vault.open) { const c = { red: '#e3392c', blue: '#4f7dff', gold: '#f0c040' }[r.vault.color]; const [x, y] = P2(r.vault.x, r.vault.z); ctx.fillStyle = c; ctx.fillRect(x - 5, y - 5, 10, 10); if (cb) { ctx.save(); ctx.translate(x, y); ctx.scale(1, -1); ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText({ red: '▲', blue: '■', gold: '✚' }[r.vault.color], 0, 1); ctx.restore(); } }
      if (r.secret && (r.secret.found || game.mapReveal > 0)) { const [x, y] = P2(r.secret.x, r.secret.z); ctx.strokeStyle = '#c79bff'; ctx.lineWidth = 2; ctx.strokeRect(x - 6, y - 6, 12, 12); }
      // puertas: color del tipo de sala que hay detrás
      for (const s in r.doors) {
        const d = r.doors[s], w = r.doorWorld(s), [x, y] = P2(w.x, w.z);
        const c = d.type && VX.ROOM_TYPES[d.type] ? VX.ROOM_TYPES[d.type].color : [0.6, 0.6, 0.6];
        ctx.fillStyle = s === r.entrance ? '#555' : `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})`;
        ctx.fillRect(x - 7, y - 7, 14, 14);
      }
      // objetos que se pueden coger/usar
      for (const it of game.pickups.items) if (!it.taken && r.contains(it.x, it.z) && it.kind !== 'lockdoor') (cb ? diamond : dot)(it.x, it.z, cb ? 4.2 : 3.2, '#ffd23f');
      // enemigos
      for (const e of game.enemies) if (!e.dead) (cb ? cross : dot)(e.x, e.z, e.isBoss ? 6 : cb ? 3.5 : 3, '#ff4a3a');
      // tú: flecha hacia donde miras
      const P = game.player, [px, py] = P2(P.x, P.z);
      ctx.save(); ctx.translate(px, py); ctx.rotate(-Math.atan2(Math.sin(P.yaw), Math.cos(P.yaw)));
      ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-5, -5); ctx.lineTo(0, -2); ctx.lineTo(5, -5); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    refreshUpgrades(game) {
      const counts = {};
      for (const u of game.upgradesTaken) counts[u.id] = (counts[u.id] || 0) + 1;
      this.el.ups.innerHTML = Object.keys(counts).map((id) => {
        const u = VX.Upgrades.byId[id];
        const c = u.color.map((x) => Math.round(x * 255)).join(',');
        return `<div class="up">${u.name}${counts[id] > 1 ? ' x' + counts[id] : ''}<span class="sw" style="background:rgb(${c})"></span></div>`;
      }).join('');
    },

    update(dt, game) {
      const P = game.player, W = game.weapon, el = this.el;
      if (this.mapOpen) { this.mapT = (this.mapT || 0) - dt; if (this.mapT <= 0) { this.mapT = 0.12; this.drawRoomMap(game); } }
      const r = game.currentRoom;
      if (game.mode === 'horde') {
        el.floor.textContent = VX.HordeMode.hudTop(game);
        el.room.textContent = VX.HordeMode.hudSub(game);
      } else {
        el.floor.textContent = game.floor === 0 ? 'ENTRADA' : `PISO ${game.floor}`;
        el.room.textContent = r ? `${TYPE_LABEL[r.type] || 'Sala'} · ${r.name}` : '';
      }
      el.gold.textContent = game.stats.gold;
      this.goldPulse = Math.max(0, this.goldPulse - dt);
      el.gold.parentElement.style.transform = `scale(${1 + this.goldPulse * 1.2})`;
      el.gold.parentElement.style.transformOrigin = 'left center';

      el.hp.style.width = `${(P.hp / P.maxHp) * 100}%`;
      el.hpText.textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
      const melee = W.def.melee;
      el.ammo.innerHTML = melee ? `<small>${W.name.toUpperCase()}</small>` : W.reloading ? `<small>RECARGANDO</small>` :
        W.limited ? `${W.ammo} <small style="${(W.slot.reserve || 0) <= 0 ? 'color:#ff5a4a' : ''}">/ ${W.slot.reserve || 0}</small>` : `${W.ammo} <small>/ ${W.magSize}</small>`;
      const sk = W.slots.map((s) => s.id).join('|') + W.cur;
      if (sk !== this.slotKey) {
        this.slotKey = sk;
        el.slots.innerHTML = W.slots.map((s, i) => `<span class="${i === W.cur ? 'on' : ''}">${i + 1} ${VX.Weapons.DEFS[s.id].name.toUpperCase()}</span>`).join('');
      }
      // objetos arrojables: cuántos de cada uno y cuál se lanza
      const tk = VX.Throw.ORDER.map((t) => W.throws[t] || 0).join(',') + W.throwSel + VX.Settings.key('throw') + ((VX.Profile.data.gear || []).length);
      if (tk !== this.throwKey) {
        this.throwKey = tk;
        const kn = VX.Settings.keyName(VX.Settings.key('throw'));
        const tEl = this.throwEl || (this.throwEl = document.getElementById('throwSlots'));
        if (tEl) tEl.innerHTML = VX.Throw.ORDER.filter((t) => VX.Throw.unlocked(t) || W.throws[t] > 0).map((t) => `<span class="${t === W.throwSel ? 'on' : ''}${W.throws[t] ? '' : ' none'}">${t === W.throwSel ? '[' + kn + '] ' : ''}${VX.Throw.TYPES[t].short} ${W.throws[t] || 0}</span>`).join('');
      }
      el.reloadBar.classList.toggle('on', W.reloading);
      if (W.reloading) el.reload.style.width = `${(1 - W.reloadT / W.reloadTime) * 100}%`;
      const key = `${W.id}|${W.attList().join('+')}|${W.auto}|${W.mods.recoil}|${W.damage.toFixed(0)}|${W.fireRate.toFixed(1)}|${W.range.toFixed(0)}|${W.pierce}|${W.pellets}`;
      if (key !== this.lastKey) {
        this.lastKey = key;
        el.stats.innerHTML = melee ? `CUERPO A CUERPO<br>DAÑO ${W.damage.toFixed(0)} · TAJOS ${W.fireRate.toFixed(1)}/s` :
          `${W.auto ? 'AUTOMÁTICA' : 'SEMIAUTOMÁTICA'}<br>DAÑO ${W.damage.toFixed(0)}${W.pellets > 1 ? 'x' + W.pellets : ''} · CADENCIA ${W.fireRate.toFixed(1)}/s<br>ALCANCE ${W.range.toFixed(0)}m${(W.mods.recoil || 1) < 0.99 ? ` · RETROCESO -${Math.round((1 - W.mods.recoil) * 100)}%` : ''}` +
          (W.pierce ? ` · PERFORA ${W.pierce}` : '') +
          (W.attList().length ? `<br><span class="att">◆ ${W.attList().map((a) => VX.Weapons.ATTACH[a].name).join(' · ')}</span>` : '');
      }

      this.hitT = Math.max(0, this.hitT - dt);
      el.hit.style.opacity = this.hitT > 0 ? 1 : 0;
      this.dmgT = Math.max(0, this.dmgT - dt * 1.5);
      const ratio = P.hp / P.maxHp;
      const lowHp = ratio < 0.3 ? 0.35 + Math.sin(performance.now() / 200) * 0.1 : 0;
      el.vig.style.opacity = Math.max(this.dmgT, lowHp);
      this.bloodT = Math.max(0, (this.bloodT || 0) - dt);
      document.getElementById('bloodScreen').style.opacity = Math.min(1, this.bloodT);
      // con poca vida el mundo pierde color
      const fxOn = !VX.Settings || VX.Settings.data.hurtFx;
      const sat = fxOn && ratio < 0.35 && !P.dead ? Math.round((0.35 + ratio * 1.6) * 20) / 20 : 1;
      if (sat !== this.lastSat) { this.lastSat = sat; document.getElementById('game').style.filter = sat < 1 ? `saturate(${sat}) contrast(1.08)` : ''; }

      if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) el.banner.classList.add('hidden'); }

      // indicador de objeto cercano
      const f = game.pickups.focus;
      if (f) {
        const can = f.price <= game.stats.gold;
        const price = f.price > 0 ? ` · <span class="${can ? 'price' : 'bad'}">${f.price} oro</span>` : (f.kind === 'keyAltar' ? (() => { const K = game.keys || {}, n = (K.wood || 0) + (K.silver || 0) + (K.gold || 0); return ` · <span class="${n ? 'price' : 'bad'}">1 llave${n ? ' (tienes ' + n + ')' : ' (no tienes)'}</span>`; })()
          : f.kind === 'stairs' && VX.Coop.active ? ' · <span class="price">se vota</span>'
          : f.kind === 'rest' || f.kind === 'supply' || f.kind === 'secretChest' || f.kind === 'stairs' || f.kind === 'lockdoor' ? '' : ' · <span class="price">GRATIS</span>');
        const act = f.action || (f.price > 0 ? 'Comprar' : 'Recoger');
        el.prompt.innerHTML = `<b>${f.title}</b> — ${f.desc}<br>${VX.Settings.tag('use')} ${act}${price}` + (f.kind === 'weapon' ? this.weaponCompare(game, f.weapon) : '');
        el.prompt.classList.remove('hidden');
      } else if (game.coopPrompt) {
        el.prompt.innerHTML = game.coopPrompt;
        el.prompt.classList.remove('hidden');
      } else if (game.doorFocus) {
        const info = VX.ROOM_TYPES[game.doorFocus.type] || {};
        el.prompt.innerHTML = `<b>Puerta</b> — ${info.label || 'Siguiente sala'}<br>${VX.Settings.tag('use')} Abrir`;
        el.prompt.classList.remove('hidden');
      } else el.prompt.classList.add('hidden');

      // cartel de la puerta más cercana
      let near = null, nd = 4.5;
      for (const sg of game.doorSigns()) {
        const d = Math.hypot(P.x - sg.x, P.z - sg.z);
        if (d < nd) { nd = d; near = sg; }
      }
      if (near && !f) {
        const col = `rgb(${near.c.map((v) => Math.round(v * 255)).join(',')})`;
        el.door.innerHTML = `Salida → <b style="color:${col}">${near.label.toUpperCase()}</b>` + (near.closed && !game.currentRoom.cleared ? ' <span style="opacity:.7">(acaba con los enemigos)</span>' : '');
        el.door.classList.remove('hidden');
      } else el.door.classList.add('hidden');

      // jefe
      const bb = (game.boss && !game.boss.dead) ? game.boss : (game.champion && !game.champion.dead ? game.champion : null);
      if (bb) el.bossFill.style.width = `${Math.max(0, bb.hp / bb.maxHp) * 100}%`;

      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' FPS'; this.fpsAcc = 0; this.fpsN = 0; }
      const alive = game.enemies.filter((e) => !e.dead).length;
      el.enemies.textContent = alive > 0 ? `ENEMIGOS: ${alive}` : '';
      // localizador: con pocos enemigos y tras un rato, flechas que apuntan a los que quedan
      const loc = document.getElementById('locator');
      const left = game.enemies.filter((e) => !e.dead && !e.isBoss && e.spawnT <= 0);
      const roomT = game.currentRoom && game.currentRoom.entered ? (this.roomT = (this.roomT || 0) + dt) : (this.roomT = 0);
      if (VX.Settings.data.enemyLocator && left.length && left.length <= 3 && roomT > 8) {
        let html = '';
        for (const e of left) {
          const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
          const fwd = (dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw)) / d, rgt = (dx * -Math.cos(P.yaw) + dz * Math.sin(P.yaw)) / d;
          const a = Math.atan2(rgt, fwd);
          html += `<i style="transform:rotate(${a}rad) translateY(-92px)"><b>${Math.round(d)}m</b></i>`;
        }
        loc.innerHTML = html;
      } else if (loc.innerHTML) loc.innerHTML = '';
      // esquiva
      const dp = document.getElementById('dashPip');
      const full = (P.dashCdBase || 0.85) * (P.dashMul || 1);
      const k = P.dashStock >= P.dashMax ? 1 : (P.dashStock + (1 - Math.max(0, P.dashCd) / full)) / P.dashMax;
      dp.style.setProperty('--k', Math.round(k * 100) + '%');
      dp.style.setProperty('--n', P.dashMax);
      dp.classList.toggle('ready', k >= 1);
      dp.classList.toggle('multi', P.dashMax > 1);
      // reto de la sala
      const ch = game.challenge, ce = document.getElementById('challenge');
      if (ch) {
        const extra = ch.type === 'time' && !ch.failed ? ` · ${Math.max(0, Math.ceil(ch.limit - ch.t))}s` : '';
        ce.textContent = `RETO: ${ch.label}${extra} · +${ch.reward} ORO`;
        ce.classList.toggle('failed', ch.failed);
        ce.classList.remove('hidden');
      } else ce.classList.add('hidden');
    },
  };

  VX.HUD = HUD;
})();
