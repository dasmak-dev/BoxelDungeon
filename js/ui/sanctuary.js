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
        const sty = 'Mejoras: ' + VX.Upgrades.POOL_NAME[VX.Upgrades.POOL_OF[w.id]];
        const sub = (sel ? 'Arma inicial' : own ? 'En tiendas y jefes · clic: arma inicial' : `Bloqueada · ${w.cost} esencia`) + ' · ' + sty;
        return `<button data-weapon="${w.id}" class="${sel ? 'on' : ''}" ${!own && d.essence < w.cost ? 'disabled' : ''}>${name}<small>${sub}</small></button>`;
      }).join('');
      // mercancía para las tiendas
      $('shopUnlockList').innerHTML = VX.Upgrades.list.filter((u) => u.shop).map((u) => {
        const own = d.shopUnlocks.includes(u.id);
        return `<button data-shop="${u.id}" class="${own ? 'on' : ''}" ${own || d.essence < u.unlock ? 'disabled' : ''}>${u.name.toUpperCase()}` +
          `<small>${u.desc} · ${own ? 'Ya a la venta' : u.unlock + ' esencia'}</small></button>`;
      }).join('');
      // la tienda del vendedor
      $('shopUpList').innerHTML = P.SHOPUPS.map((u) => {
        const l = P.shopUp(u.id), maxed = l >= u.max, cost = u.cost(l);
        const pips = '■'.repeat(l) + '□'.repeat(u.max - l);
        return `<button data-shopup="${u.id}" ${maxed || d.essence < cost ? 'disabled' : ''}>${u.name.toUpperCase()} <span class="pips">${pips}</span>` +
          `<small>${u.desc} · ${maxed ? 'MÁXIMO' : cost + ' esencia'}</small></button>`;
      }).join('');
      for (const b of document.querySelectorAll('#shopUpList button')) b.onclick = () => {
        if (VX.Profile.buyShopUp(b.dataset.shopup)) VX.Audio.upgrade(); else VX.Audio.deny();
        this.render();
      };
      for (const b of document.querySelectorAll('#shopUnlockList button')) b.onclick = () => {
        if (VX.Profile.buyShopItem(b.dataset.shop)) VX.Audio.buy(); else VX.Audio.deny();
        this.render();
      };
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
