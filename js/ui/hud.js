// Interfaz en pantalla (DOM superpuesto al canvas).
(function () {
  const $ = (id) => document.getElementById(id);

  const TYPE_LABEL = {
    start: 'Entrada', normal: 'Sala infestada', shop: 'Vendedor', reward: 'Recompensa', boss: 'Guarida del jefe', save: 'Fuente de almas',
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
    pulseGold() { this.goldPulse = 0.2; },

    showBoss(boss) {
      this.el.boss.classList.remove('hidden');
      this.el.bossName.textContent = boss.name;
      this.banner(boss.name, '¡Prepárate!', 3);
    },
    hideBoss() { this.el.boss.classList.add('hidden'); },

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
      el.floor.textContent = game.floor === 0 ? 'ENTRADA' : `PISO ${game.floor}`;
      const r = game.currentRoom;
      el.room.textContent = r ? `${TYPE_LABEL[r.type]} · ${r.name}` : '';
      el.gold.textContent = game.stats.gold;
      this.goldPulse = Math.max(0, this.goldPulse - dt);
      el.gold.parentElement.style.transform = `scale(${1 + this.goldPulse * 1.2})`;
      el.gold.parentElement.style.transformOrigin = 'left center';

      el.hp.style.width = `${(P.hp / P.maxHp) * 100}%`;
      el.hpText.textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
      const melee = W.def.melee;
      el.ammo.innerHTML = melee ? `<small>${W.name.toUpperCase()}</small>` : W.reloading ? `<small>RECARGANDO</small>` : `${W.ammo} <small>/ ${W.magSize}</small>`;
      const sk = W.slots.map((s) => s.id).join('|') + W.cur;
      if (sk !== this.slotKey) {
        this.slotKey = sk;
        el.slots.innerHTML = W.slots.map((s, i) => `<span class="${i === W.cur ? 'on' : ''}">${i + 1} ${VX.Weapons.DEFS[s.id].name.toUpperCase()}</span>`).join('');
      }
      el.reloadBar.classList.toggle('on', W.reloading);
      if (W.reloading) el.reload.style.width = `${(1 - W.reloadT / W.reloadTime) * 100}%`;
      const key = `${W.id}|${W.auto}|${W.damage.toFixed(0)}|${W.fireRate.toFixed(1)}|${W.range.toFixed(0)}|${W.pierce}|${W.pellets}`;
      if (key !== this.lastKey) {
        this.lastKey = key;
        el.stats.innerHTML = melee ? `CUERPO A CUERPO<br>DAÑO ${W.damage.toFixed(0)} · TAJOS ${W.fireRate.toFixed(1)}/s` :
          `${W.auto ? 'AUTOMÁTICA' : 'SEMIAUTOMÁTICA'}<br>DAÑO ${W.damage.toFixed(0)}${W.pellets > 1 ? 'x' + W.pellets : ''} · CADENCIA ${W.fireRate.toFixed(1)}/s<br>ALCANCE ${W.range.toFixed(0)}m` +
          (W.pierce ? ` · PERFORA ${W.pierce}` : '');
      }

      this.hitT = Math.max(0, this.hitT - dt);
      el.hit.style.opacity = this.hitT > 0 ? 1 : 0;
      this.dmgT = Math.max(0, this.dmgT - dt * 1.5);
      const lowHp = P.hp / P.maxHp < 0.3 ? 0.35 + Math.sin(performance.now() / 200) * 0.1 : 0;
      el.vig.style.opacity = Math.max(this.dmgT, lowHp);

      if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) el.banner.classList.add('hidden'); }

      // indicador de objeto cercano
      const f = game.pickups.focus;
      if (f) {
        const can = f.price <= game.stats.gold;
        const price = f.price > 0 ? ` · <span class="${can ? 'price' : 'bad'}">${f.price} oro</span>` : (f.kind === 'rest' ? '' : ' · <span class="price">GRATIS</span>');
        const act = f.action || (f.price > 0 ? 'Comprar' : 'Recoger');
        el.prompt.innerHTML = `<b>${f.title}</b> — ${f.desc}<br>[E] ${act}${price}`;
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
        el.door.innerHTML = `Salida → <b style="color:${col}">${near.label.toUpperCase()}</b>` + (near.closed ? ' <span style="opacity:.7">(acaba con los enemigos)</span>' : '');
        el.door.classList.remove('hidden');
      } else el.door.classList.add('hidden');

      // jefe
      if (game.boss && !game.boss.dead) el.bossFill.style.width = `${Math.max(0, game.boss.hp / game.boss.maxHp) * 100}%`;

      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' FPS'; this.fpsAcc = 0; this.fpsN = 0; }
      const alive = game.enemies.filter((e) => !e.dead).length;
      el.enemies.textContent = alive > 0 ? `ENEMIGOS: ${alive}` : '';
      // esquiva
      const dp = document.getElementById('dashPip');
      const k = P.dashCd > 0 ? 1 - P.dashCd / (P.dashCdBase || 0.85) : 1;
      dp.style.setProperty('--k', Math.round(k * 100) + '%');
      dp.classList.toggle('ready', k >= 1);
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
