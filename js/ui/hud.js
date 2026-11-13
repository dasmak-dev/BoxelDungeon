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
    showMap(game, force) {
      const el = document.getElementById('mapOverlay');
      if (!el) return;
      if (!force && !el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
      const T = VX.ROOM_TYPES, Z = VX.ZONES;
      const ICON = { normal: '☠', reward: '★', shop: '$', save: '✦', boss: '◆', start: '▶', map: '✎' };
      const chip = (type, extra = '') => {
        const c = (T[type] || T.normal).color;
        return `<span class="mchip ${extra}" style="color:rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})" title="${(T[type] || {}).label || type}">${ICON[type] || '?'}</span>`;
      };
      const r = game.currentRoom, zn = Z[game.zone || 0];
      let h = `<h2>MAPA · Piso ${game.floor} · ${zn.name}</h2>`;
      h += `<div class="msub">${game.mapReveal > 0 ? `Mapa estudiado: ves dos salas por delante (${game.mapReveal} salas más)` : 'Busca la Sala del cartógrafo (✎) para ver más allá'}</div>`;
      // camino recorrido
      const path = (game.mapPath || []).slice(-18);
      h += '<div class="mrow">' + path.map((p, i) => {
        const zc = Z[p.zone].fog.map((v) => Math.round(Math.min(1, v * 12) * 255)).join(',');
        return `<span class="mstep" style="border-color:rgb(${zc})">${chip(p.type, i === path.length - 1 ? 'mcur' : '')}</span>`;
      }).join('<span class="mlink">›</span>') + '</div>';
      // puertas de la sala actual
      const dirs = { zp: [0, 1], zn: [0, -1], xp: [1, 0], xn: [-1, 0] };
      const f = dirs[VX.Room.OPP[r.entrance || 'zn']], right = [-f[1], f[0]];
      const label = (s) => { const v = dirs[s]; return v[0] === f[0] && v[1] === f[1] ? 'Al frente' : v[0] === right[0] && v[1] === right[1] ? 'Derecha' : 'Izquierda'; };
      h += '<h3>Puertas de esta sala</h3><div class="mexits">';
      for (const s of r.exits || []) {
        const d = r.doors[s];
        if (!d || !d.type) continue;
        const n = d.neighbor;
        h += `<div class="mexit"><b>${label(s)}</b><div>${chip(d.type)} ${(T[d.type] || {}).label || ''}</div>`;
        if (game.mapReveal > 0 && n) {
          if (n.secret) h += `<div class="msecret">${n.secret.stairs ? '✦ Grieta con escalera' : '✦ Grieta secreta'}</div>`;
          if (n.plannedTypes) h += `<div class="mnext">después: ${n.plannedTypes.map((t) => chip(t)).join(' ')}</div>`;
        }
        h += '</div>';
      }
      h += '</div><div class="mhint">[M] cerrar</div>';
      el.innerHTML = h;
      el.classList.remove('hidden');
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
      el.reloadBar.classList.toggle('on', W.reloading);
      if (W.reloading) el.reload.style.width = `${(1 - W.reloadT / W.reloadTime) * 100}%`;
      const key = `${W.id}|${W.auto}|${W.mods.recoil}|${W.damage.toFixed(0)}|${W.fireRate.toFixed(1)}|${W.range.toFixed(0)}|${W.pierce}|${W.pellets}`;
      if (key !== this.lastKey) {
        this.lastKey = key;
        el.stats.innerHTML = melee ? `CUERPO A CUERPO<br>DAÑO ${W.damage.toFixed(0)} · TAJOS ${W.fireRate.toFixed(1)}/s` :
          `${W.auto ? 'AUTOMÁTICA' : 'SEMIAUTOMÁTICA'}<br>DAÑO ${W.damage.toFixed(0)}${W.pellets > 1 ? 'x' + W.pellets : ''} · CADENCIA ${W.fireRate.toFixed(1)}/s<br>ALCANCE ${W.range.toFixed(0)}m${(W.mods.recoil || 1) < 0.99 ? ` · RETROCESO -${Math.round((1 - W.mods.recoil) * 100)}%` : ''}` +
          (W.pierce ? ` · PERFORA ${W.pierce}` : '');
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
        const price = f.price > 0 ? ` · <span class="${can ? 'price' : 'bad'}">${f.price} oro</span>` : (f.kind === 'rest' || f.kind === 'supply' || f.kind === 'secretChest' || f.kind === 'stairs' ? '' : ' · <span class="price">GRATIS</span>');
        const act = f.action || (f.price > 0 ? 'Comprar' : 'Recoger');
        el.prompt.innerHTML = `<b>${f.title}</b> — ${f.desc}<br>[E] ${act}${price}`;
        el.prompt.classList.remove('hidden');
      } else if (game.coopPrompt) {
        el.prompt.innerHTML = game.coopPrompt;
        el.prompt.classList.remove('hidden');
      } else if (game.doorFocus) {
        const info = VX.ROOM_TYPES[game.doorFocus.type] || {};
        el.prompt.innerHTML = `<b>Puerta</b> — ${info.label || 'Siguiente sala'}<br>[E] Abrir`;
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
