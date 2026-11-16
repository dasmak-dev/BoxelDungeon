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
      // (0.57) maqueta isométrica a la izquierda; a la derecha, la sala, las puertas con su previsión y la ruta
      const C = VX.Carto, T = VX.ROOM_TYPES, Z = VX.ZONES, I = (n, px, t) => C.icon(n, px, t);
      const r = game.currentRoom, zn = Z[game.zone || 0];
      const reveal = C.studied(game);
      const rt = C.route(game);
      this.mapRoute = rt;
      const HZ = { lava: 'lava', acid: 'ácido', spikes: 'púas', spores: 'esporas', void: 'vacío', water: 'agua' };
      const tags = (n) => {
        const t = [];
        if (n.dark) t.push(I('dark', 14) + 'a oscuras');
        if (n.gfog) t.push(I('fog', 14) + (n.gfog.thick ? 'niebla espesa' : 'niebla'));
        const hz = [...new Set((n.spikes || []).map((x) => HZ[x.kind]).filter(Boolean))];
        if (hz.length) t.push(I('hazard', 14) + hz.join(', '));
        if (n.vault) t.push(I('lock', 14) + 'cerradura');
        if (n.secret) t.push(`<span class="msecret">${I('secret', 14)}${n.secret.stairs ? 'grieta con escalera' : 'grieta secreta'}</span>`);
        return t.map((x) => `<span class="mtag">${x}</span>`).join('');
      };
      let h = `<div class="mtitle"><h2>${I('map', 22)} MAPA · ${game.floor === 0 ? 'Entrada' : 'Piso ' + game.floor} · ${zn.name}</h2>`;
      h += `<div class="msub">${reveal ? `Mapa del cartógrafo: ves las salas de detrás de cada puerta, lo que esconden y las siguientes <b>(${game.mapReveal} salas más)</b>` : 'Busca la Sala del cartógrafo para ver qué hay más allá de las puertas'}</div></div>`;
      h += '<div class="mcols"><div class="mleft"><canvas id="mapCanvas" width="640" height="470"></canvas></div>';
      // ---- panel derecho ----
      const alive = game.enemies.filter((e) => !e.dead), el2 = alive.filter((e) => e.elite || e.champion).length;
      h += '<div class="mright">';
      h += `<div class="mcard mcur">${I(r.type, 26)}<div><b>${r.name || ''}</b><div class="mtags">${tags(r)}</div>`;
      h += alive.length ? `<div class="mfc">${I('enemy', 14)} <span style="color:#ff6a5a">${alive.length} enemigo${alive.length > 1 ? 's' : ''}</span>${el2 ? ` · ${I('elite', 14)} ${el2} élite${el2 > 1 ? 's' : ''}` : ''}</div>` : r.cleared ? '<div class="mfc" style="color:#7fd07f">Sala despejada</div>' : '';
      h += '</div></div>';
      const k = game.keys || {};
      const keys = ['wood', 'silver', 'gold'].filter((c) => k[c]).map((c) => `<span class="mkey k-${c}"></span>${k[c] > 1 ? '×' + k[c] : ''}`).join(' ');
      h += `<div class="mline">${I('shop', 14)} ${game.stats.gold || 0} de oro${keys ? ' · Llaves: ' + keys : ''}</div>`;
      const bi = C.bossInfo(game);
      h += `<div class="mline" style="color:${bi.n <= 2 ? '#ff8a5a' : bi.n <= 3 ? '#ffb07a' : '#b9ad92'}">${I('boss', 14)} Jefe: ${bi.txt}</div>`;
      // puertas
      const dirs = { zp: [0, 1], zn: [0, -1], xp: [1, 0], xn: [-1, 0] };
      const f = dirs[VX.Room.OPP[r.entrance || 'zn']], right = [-f[1], f[0]];
      const label = (sd) => { const v = dirs[sd]; return v[0] === f[0] && v[1] === f[1] ? 'Al frente' : v[0] === right[0] && v[1] === right[1] ? 'Derecha' : 'Izquierda'; };
      const ord = { Izquierda: 0, 'Al frente': 1, Derecha: 2 };
      const nbs = C.neighbors(game).sort((a, b) => ord[label(a.side)] - ord[label(b.side)]);
      h += '<h3>Puertas</h3>';
      for (const nb of nbs) {
        const n = nb.room, best = rt && rt.side === nb.side;
        h += `<div class="mcard mdoor${best ? ' mbest' : ''}">${I(nb.type, 26)}<div><b>${label(nb.side)}</b> · ${(T[nb.type] || {}).label || ''}${nb.door.goldLock ? ' ' + I('lock', 14, 'Puerta dorada') : ''}${best ? ` <span class="mroute">${I('route', 14)} RUTA</span>` : ''}`;
        if (reveal && n) {
          h += `<div class="mname">${n.name || ''}</div>`;
          const tg = tags(n);
          if (tg) h += `<div class="mtags">${tg}</div>`;
          const fc = n.fc;
          if (fc) {
            const bits = [];
            if (fc.n) bits.push(`${I('enemy', 14)} ${fc.n} enemigos`);
            if (fc.elites) bits.push(`${I('elite', 14)} ${fc.elites} élite${fc.elites > 1 ? 's' : ''}`);
            if (fc.ambush) bits.push(`${I('ambush', 14)} <span style="color:#ff9a3a">¡emboscada!</span>`);
            if (fc.key) bits.push(`${I('key', 14)} <span style="color:#ffd23f">llave marcada</span>`);
            if (fc.reward) bits.push({ chest: `${I('chest', 14)} cofre misterioso`, rare: `${I('rare', 14)} <span style="color:#c79bff">mejora rara</span>`, curse: `${I('curse', 14)} <span style="color:#d070d0">maldición</span>`, normal: `${I('reward', 14)} mejora` }[fc.reward]);
            if (fc.gun != null && nb.type === 'shop') bits.push(fc.gun ? `${I('gun', 14)} <span style="color:#9fe08a">vende un arma</span>` : `${I('nogun', 14)} sin armas`);
            if (bits.length) h += `<div class="mfc">${bits.join(' · ')}</div>`;
          }
          if (n.plannedTypes) h += `<div class="mnext">después: ${n.plannedTypes.map((t, i) => `<span class="${best && rt.nextSide === n.exits[i] ? 'mnbest' : ''}">${I(t, 18, (T[t] || {}).label)}</span>`).join(' ')}</div>`;
        } else if (!reveal) h += '<div class="mfc" style="opacity:.6">¿Qué habrá detrás?</div>';
        h += '</div></div>';
      }
      if (rt) h += `<div class="mline mroutel">${I('route', 16)} El cartógrafo recomienda: <b>${label(rt.side).toLowerCase()}</b>${rt.next ? ' y luego ' + I(rt.next, 16) + ' ' + ((T[rt.next] || {}).label || '').toLowerCase() : ''}</div>`;
      // recorrido
      const path = (game.mapPath || []).slice(-12);
      h += '<h3>Recorrido</h3><div class="mrow">' + path.map((p, i) => `<span class="mstep${i === path.length - 1 ? ' mcurs' : ''}">${I(p.type, 16)}</span>`).join('<span class="mlink">›</span>') + '</div>';
      h += '</div></div><div class="mhint">' + VX.Settings.tag('map') + ' cerrar</div>';
      el.innerHTML = h;
      el.classList.remove('hidden');
      this.mapOpen = true; this.mapT = 0;
      this.drawRoomMap(game);
    },

    // Maqueta isométrica (se redibuja mientras el mapa está abierto)
    drawRoomMap(game) {
      const cv = document.getElementById('mapCanvas');
      if (!cv || !game.currentRoom || !game.currentRoom.grid) return;
      VX.Carto.drawIso(cv, game, this.mapRoute);
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
      if (this.mapOpen) { this.mapT = (this.mapT || 0) - dt; if (this.mapT <= 0) { this.mapT = 0.1; this.drawRoomMap(game); } }
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
      const sk = W.slots.map((s) => s.id + (s.lvl || 1)).join('|') + W.cur + (W.kickBuff > 0 ? 'k' : '');
      if (sk !== this.slotKey) {
        this.slotKey = sk;
        el.slots.innerHTML = W.slots.map((s, i) => `<span class="${i === W.cur ? 'on' : ''}">${i + 1} ${VX.Weapons.DEFS[s.id].name.toUpperCase()}${(s.lvl || 1) > 1 ? ' <b style="color:' + (s.lvl === 3 ? '#ffc94a' : '#b9c6dc') + '">' + ['', '', 'II', 'III'][s.lvl] + '</b>' : ''}</span>`).join('') + (W.kickBuff > 0 ? ' <span style="color:#ffb347">PATADA: ×2</span>' : '');
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
        const df = game.doorFocus, K = game.keys || {};
        el.prompt.innerHTML = df.gold ? `<b>Puerta dorada</b> — ${df.vault === 'hoard' ? 'Sala del tesoro' : 'Vendedor raro'}<br>${VX.Settings.tag('use')} Abrir · <span class="${K.gold ? 'price' : 'bad'}">llave de oro${K.gold ? '' : ' (no tienes)'}</span>`
          : `<b>Puerta</b> — ${info.label || 'Siguiente sala'}<br>${VX.Settings.tag('use')} Abrir`;
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
      if (bb) {
        el.bossFill.style.width = `${Math.max(0, bb.hp / bb.maxHp) * 100}%`;
        // fase del jefe: 1/3, 2/3, 3/3 (la barra cambia de color en cada una)
        const ph = Math.max(bb.phase || 0, bb.hp < bb.maxHp * 0.33 ? 2 : bb.hp < bb.maxHp * 0.66 ? 1 : 0);   // en el invitado sale de la vida
        if (this.bossPh !== ph) { this.bossPh = ph; const pe = document.getElementById('bossPhase'); if (pe) pe.textContent = ['FASE 1 / 3', 'FASE 2 / 3 · FURIA', 'FASE 3 / 3 · FINAL'][ph] || ''; el.boss.dataset.phase = ph; }
      }

      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' FPS'; this.fpsAcc = 0; this.fpsN = 0; }
      const alive = game.enemies.filter((e) => !e.dead).length;
      el.enemies.textContent = alive > 0 ? `ENEMIGOS: ${alive}` : '';
      // localizador: con pocos enemigos y tras un rato, flechas que apuntan a los que quedan
      const loc = document.getElementById('locator');
      const left = game.enemies.filter((e) => !e.dead && !e.isBoss && e.spawnT <= 0);
      const roomT = game.currentRoom && game.currentRoom.entered ? (this.roomT = (this.roomT || 0) + dt) : (this.roomT = 0);
      // aunque estén desactivadas, salen solas si los últimos llevan mucho rato sin aparecer
      if (left.length && ((VX.Settings.data.enemyLocator && left.length <= 3 && roomT > 8) || (left.length <= 2 && roomT > 25))) {
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
