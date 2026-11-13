// Armería (menú principal): elige la skin de cada arma. Las skins se desbloquean jugando.
(function () {
  const $ = (id) => document.getElementById(id);
  const rgb = (c, k = 1) => `rgb(${c.slice(0, 3).map((v) => Math.round(Math.min(1, v * k) * 255)).join(',')})`;

  const Armory = {
    weapon: 'pistol',
    preview: null,

    open(game) {
      this.game = game;
      VX.Profile.load();
      VX.Profile.checkUnlocks();
      this.preview = null;
      this.renderWeapons();
      this.select(this.weapon);
      VX.Menus.show('armory');
    },

    close() {
      this.game.showcase = null;
      VX.Menus.showTitle();
    },

    renderWeapons() {
      const ids = ['knife', ...VX.Weapons.GUNS];
      $('armoryWeapons').innerHTML = ids.map((id) => {
        const d = VX.Weapons.DEFS[id];
        const n = VX.Weapons.SKINS.filter((s) => VX.Profile.isUnlocked(id, s.id)).length;
        const lock = VX.Profile.weaponUnlocked(id) ? '' : ' 🔒';
        return `<button class="wpn ${id === this.weapon ? 'on' : ''}" data-id="${id}">${d.name.toUpperCase()}${lock}<small>Skins ${n}/${VX.Weapons.SKINS.length}</small></button>`;
      }).join('');
      for (const b of $('armoryWeapons').querySelectorAll('button')) {
        b.onclick = () => { VX.Audio.click(); this.select(b.dataset.id); };
      }
      this.renderStats();
    },

    renderStats() {
      const P = VX.Profile.data, w = P.wstats[this.weapon] || {};
      $('armoryStats').innerHTML =
        `<u>CON ESTA ARMA</u><br>Zombis: <b>${w.kills || 0}</b> · Cabezas: <b>${w.heads || 0}</b> · Élites: <b>${w.elites || 0}</b><br>` +
        `Jefes rematados: <b>${w.bosses || 0}</b> · Mejor piso: <b>${w.floor || 0}</b><br>` +
        `<u>TOTAL</u><br>Zombis: <b>${P.kills}</b> · Jefes: <b>${P.bosses}</b> · Mejor piso: <b>${P.bestFloor}</b> · Partidas: <b>${P.runs}</b>`;
    },

    select(id) {
      this.weapon = id;
      this.preview = null; this.previewForm = null;
      for (const b of $('armoryWeapons').querySelectorAll('button')) b.classList.toggle('on', b.dataset.id === id);
      this.renderSkins();
      this.renderStats();
      this.updateShowcase();
    },

    updateShowcase() {
      const skin = this.preview || VX.Profile.skinFor(this.weapon);
      const isP = this.weapon === 'pistol';
      const form = this.weapon === 'knife' ? (this.previewForm || VX.Profile.knifeForm()) : isP ? (this.previewForm || VX.Profile.pistolForm()) : null;
      this.game.showcase = { id: this.weapon, skin, form };
      if (form) {
        const list = isP ? VX.Weapons.PISTOLS : VX.Weapons.KNIVES;
        const k = list.find((x) => x.id === form), lk = isP ? !VX.Profile.pistolUnlocked(form) : !VX.Profile.knifeUnlocked(form);
        const cur = isP ? VX.Profile.pistolForm() : VX.Profile.knifeForm();
        // vista previa de una forma o modelo: su nombre, qué hace y si está bloqueado
        if (this.previewForm) {
          $('armoryCaption').innerHTML = `<b>${k.name.toUpperCase()}</b>` + (k.desc && isP ? `<br><small>${k.desc}</small>` : '') + (lk ? `<br><span class="bad">Bloqueado: ${k.txt}</span>` : '');
          return;
        }
      }
      // una sola línea de estado para el conjunto (forma + color)
      const s = VX.Weapons.SKINS.find((x) => x.id === skin);
      const locked = !VX.Profile.isUnlocked(this.weapon, skin);
      const fname = form ? (this.weapon === 'pistol' ? VX.Weapons.PISTOLS : VX.Weapons.KNIVES).find((x) => x.id === form).name : VX.Weapons.DEFS[this.weapon].name;
      const desc = form && this.weapon === 'pistol' ? (VX.Weapons.PISTOLS.find((x) => x.id === form).desc || '') : (VX.Weapons.DEFS[this.weapon].desc || '');
      $('armoryCaption').innerHTML = `<b>${fname.toUpperCase()}</b> · ${s.name}` + (desc ? `<br><small>${desc}</small>` : '') +
        (locked ? `<br><span class="bad">Bloqueada: ${VX.Profile.condText(s, this.weapon)}</span>` : (skin === VX.Profile.skinFor(this.weapon) ? '<br><span class="ok">Equipado</span>' : ''));
    },

    renderSkins() {
      const cur = VX.Profile.skinFor(this.weapon);
      const def = VX.Weapons.DEFS[this.weapon];
      let forms = '';
      if (this.weapon === 'knife') {
        const curF = VX.Profile.knifeForm();
        forms = '<div class="armSec">FORMA</div>' + VX.Weapons.KNIVES.map((k) => {
          const un = VX.Profile.knifeUnlocked(k.id), v = k.cond ? Math.min(VX.Profile.data[k.cond.stat] || 0, k.cond.n) : 0;
          return `<button class="skin form ${un ? '' : 'locked'} ${k.id === curF ? 'on' : ''}" data-form="${k.id}">
            <span class="nm">${k.name}${un ? '' : ' 🔒'}</span>
            <span class="ds">${un ? (k.id === curF ? 'Equipado' : 'Clic para equipar') : k.txt}</span>
            ${k.cond && !un ? `<span class="pb"><i style="width:${Math.round(v / k.cond.n * 100)}%"></i></span><span class="pt">${v}/${k.cond.n}</span>` : ''}
          </button>`;
        }).join('') + '<div class="armSec">COLOR</div>';
      }
      if (this.weapon === 'pistol') {
        const curF = VX.Profile.pistolForm();
        forms = '<div class="armSec">MODELO</div>' + VX.Weapons.PISTOLS.map((k) => {
          const un = VX.Profile.pistolUnlocked(k.id), v = k.cond ? Math.min(VX.Profile.data[k.cond.stat] || 0, k.cond.n) : 0;
          return `<button class="skin form ${un ? '' : 'locked'} ${k.id === curF ? 'on' : ''}" data-pform="${k.id}" title="${k.desc || ''}">
            <span class="nm">${k.name}${un ? '' : ' 🔒'}</span>
            <span class="ds">${un ? (k.id === curF ? 'Equipado' : 'Clic para equipar') : k.txt}</span>
            ${k.cond && !un ? `<span class="pb"><i style="width:${Math.round(v / k.cond.n * 100)}%"></i></span><span class="pt">${v}/${k.cond.n}</span>` : ''}
          </button>`;
        }).join('') + '<div class="armSec">COLOR</div>';
      }
      $('armorySkins').innerHTML = forms + VX.Weapons.SKINS.map((s) => {
        const un = VX.Profile.isUnlocked(this.weapon, s.id);
        const pal = s.pal || {};
        const main = pal.main || pal.blade || [0.4, 0.4, 0.44];
        const acc = pal.accent || pal.steel || [0.9, 0.4, 0.1];
        const prog = VX.Profile.progress(s, this.weapon);
        const p = s.cond ? `${Math.min(VX.Profile.statValue(s, this.weapon), s.cond.n)}/${s.cond.n}` : '';
        return `<button class="skin ${un ? '' : 'locked'} ${s.id === cur ? 'on' : ''}" data-id="${s.id}">
          <span class="sw" style="background:linear-gradient(135deg, ${rgb(main)} 0 55%, ${rgb(acc)} 55% 100%)"></span>
          <span class="nm">${s.name}${un ? '' : ' 🔒'}</span>
          <span class="ds">${un ? (s.id === cur ? 'Equipada' : 'Clic para equipar') : VX.Profile.condText(s, this.weapon)}</span>
          ${s.cond && !un ? `<span class="pb"><i style="width:${Math.round(prog * 100)}%"></i></span><span class="pt">${p}</span>` : ''}
        </button>`;
      }).join('');
      for (const b of $('armorySkins').querySelectorAll('button[data-form]')) {
        b.onclick = () => {
          const f = b.dataset.form;
          VX.Audio.click();
          if (VX.Profile.knifeUnlocked(f)) { VX.Profile.setKnifeForm(f); this.previewForm = null; this.renderSkins(); }
          else this.previewForm = f;
          this.updateShowcase();
        };
      }
      for (const b of $('armorySkins').querySelectorAll('button[data-pform]')) {
        b.onclick = () => {
          const f = b.dataset.pform;
          VX.Audio.click();
          if (VX.Profile.pistolUnlocked(f)) { VX.Profile.setPistolForm(f); this.previewForm = null; this.renderSkins(); this.renderWeapons(); }
          else this.previewForm = f;
          this.updateShowcase();
        };
      }
      for (const b of $('armorySkins').querySelectorAll('button[data-id]')) {
        b.onclick = () => {
          const id = b.dataset.id;
          this.previewForm = null;
          VX.Audio.click();
          if (VX.Profile.isUnlocked(this.weapon, id)) { VX.Profile.setSkin(this.weapon, id); this.preview = null; this.renderSkins(); }
          else this.preview = id;  // vista previa de una skin bloqueada
          this.updateShowcase();
        };
      }
      void def;
    },
  };

  VX.Armory = Armory;
})();
