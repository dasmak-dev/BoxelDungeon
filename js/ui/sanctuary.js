// Santuario: se gasta la esencia (moneda permanente) en bendiciones y armas iniciales.
(function () {
  const $ = (id) => document.getElementById(id);

  const Sanctuary = {
    open() {
      this.render();
      VX.Menus.show('sanctuary');
    },

    render() {
      const P = VX.Profile, d = P.data;
      $('essenceTotal').innerHTML = `ESENCIA: <b>${d.essence}</b>`;
      const lv = P.perkLevels();
      $('perkList').innerHTML = P.PERKS.map((p) => {
        const l = lv[p.id], maxed = l >= p.max, cost = p.cost(l);
        const pips = '■'.repeat(l) + '□'.repeat(p.max - l);
        return `<button data-perk="${p.id}" ${maxed || d.essence < cost ? 'disabled' : ''}>${p.name.toUpperCase()} <span class="pips">${pips}</span>` +
          `<small>${p.desc} · ${maxed ? 'MÁXIMO' : cost + ' esencia'}</small></button>`;
      }).join('');
      $('startWeaponList').innerHTML = P.ARSENAL.map((w) => {
        const own = d.weapons.includes(w.id), sel = d.startWeapon === w.id;
        const name = VX.Weapons.DEFS[w.id].name.toUpperCase();
        const sub = sel ? 'Arma inicial' : own ? 'En tiendas y jefes · clic: arma inicial' : `Bloqueada · ${w.cost} esencia`;
        return `<button data-weapon="${w.id}" class="${sel ? 'on' : ''}" ${!own && d.essence < w.cost ? 'disabled' : ''}>${name}<small>${sub}</small></button>`;
      }).join('');
      for (const b of document.querySelectorAll('#perkList button')) b.onclick = () => {
        if (VX.Profile.buyPerk(b.dataset.perk)) VX.Audio.upgrade(); else VX.Audio.deny();
        this.render();
      };
      for (const b of document.querySelectorAll('#startWeaponList button')) b.onclick = () => {
        if (VX.Profile.buyWeapon(b.dataset.weapon)) VX.Audio.buy(); else VX.Audio.deny();
        this.render();
      };
    },
  };

  VX.Sanctuary = Sanctuary;
})();
