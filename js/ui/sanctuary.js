// Santuario: se gasta la esencia (moneda permanente) en bendiciones y armas iniciales.
(function () {
  const $ = (id) => document.getElementById(id);

  const Sanctuary = {
    open() {
      this.render();
      VX.Menus.show('sanctuary');
    },

    // pestañas: cada una cabe en una pantalla (tarjetas en cuadrícula, sin listas largas)
    TABS: [
      { id: 'perks', name: 'BENDICIONES', note: 'Ventajas para todas tus partidas.' },
      { id: 'shop', name: 'LA TIENDA', note: 'Mejora la tienda del vendedor: más altares, mejor género y servicios.' },
      { id: 'goods', name: 'MERCANCÍA', note: 'Objetos nuevos que podrán aparecer a la venta en las tiendas.' },
      { id: 'arsenal', name: 'ARSENAL', note: 'Sólo las armas desbloqueadas salen en tiendas y botines. Clic en una tuya: será tu arma inicial.' },
    ],
    tab: 'perks',

    // cada cosa que se compra, con lo mismo para todas las pestañas
    items(tab) {
      const P = VX.Profile, d = P.data;
      if (tab === 'perks') {
        const lv = P.perkLevels();
        return P.PERKS.map((p) => { const l = lv[p.id]; return { key: 'perk:' + p.id, name: p.name, desc: p.desc, lvl: l, max: p.max, cost: l >= p.max ? 0 : p.cost(l), done: l >= p.max }; });
      }
      if (tab === 'shop') return P.SHOPUPS.map((u) => { const l = P.shopUp(u.id); return { key: 'shopup:' + u.id, name: u.name, desc: u.desc, lvl: l, max: u.max, cost: l >= u.max ? 0 : u.cost(l), done: l >= u.max }; });
      if (tab === 'goods') return VX.Upgrades.list.filter((u) => u.shop).map((u) => { const own = d.shopUnlocks.includes(u.id); return { key: 'shop:' + u.id, name: u.name, desc: u.desc, cost: own ? 0 : u.unlock, done: own, doneTxt: 'A LA VENTA' }; });
      return P.ARSENAL.map((w) => {
        const own = d.weapons.includes(w.id), sel = d.startWeapon === w.id;
        return { key: 'weapon:' + w.id, name: VX.Weapons.DEFS[w.id].name, desc: 'Mejoras: ' + VX.Upgrades.POOL_NAME[VX.Upgrades.POOL_OF[w.id]], cost: own ? 0 : w.cost, done: own, on: sel, doneTxt: sel ? 'ARMA INICIAL' : 'TUYA · ELEGIR', click: own };
      });
    },

    render() {
      const P = VX.Profile, d = P.data;
      $('essenceTotal').innerHTML = `<span>ESENCIA</span><b>${d.essence}</b>`;
      // cuántas cosas se pueden comprar ya en cada pestaña
      $('sancTabs').innerHTML = this.TABS.map((t) => {
        const can = this.items(t.id).filter((x) => !x.done && x.cost <= d.essence).length;
        return `<button class="small sancTab${t.id === this.tab ? ' on' : ''}" data-st="${t.id}">${t.name}${can ? `<i>${can}</i>` : ''}</button>`;
      }).join('');
      const tab = this.TABS.find((t) => t.id === this.tab);
      $('sancNote').textContent = tab.note;
      const only = $('sancAfford').checked;
      let list = this.items(this.tab);
      if (only) list = list.filter((x) => !x.done && x.cost <= d.essence);
      $('sancGrid').innerHTML = list.length ? list.map((x) => {
        const afford = !x.done && x.cost <= d.essence;
        const pips = x.max ? `<span class="pips">${'■'.repeat(x.lvl)}${'□'.repeat(x.max - x.lvl)}</span>` : '';
        const price = x.done ? `<em class="done">${x.max ? 'MÁXIMO' : x.doneTxt || 'TUYO'}</em>` : `<em class="${afford ? 'ok' : 'no'}">${x.cost} ✦</em>`;
        return `<button class="sancCard${x.on ? ' on' : ''}${x.done ? ' done' : ''}${afford ? ' can' : ''}" data-k="${x.key}" ${!afford && !x.click ? 'disabled' : ''}><b>${x.name.toUpperCase()}</b>${pips}<small>${x.desc}</small>${price}</button>`;
      }).join('') : '<p class="sancEmpty">No te llega para nada de esta pestaña todavía.</p>';
      for (const b of document.querySelectorAll('#sancTabs button')) b.onclick = () => { VX.Audio.click(); this.tab = b.dataset.st; this.render(); };
      $('sancAfford').onchange = () => this.render();
      for (const b of document.querySelectorAll('#sancGrid button')) b.onclick = () => {
        const [k, id] = b.dataset.k.split(':');
        const ok = k === 'perk' ? P.buyPerk(id) : k === 'shopup' ? P.buyShopUp(id) : k === 'shop' ? P.buyShopItem(id) : P.buyWeapon(id);
        if (ok) (k === 'perk' || k === 'shopup' ? VX.Audio.upgrade() : VX.Audio.buy()); else VX.Audio.deny();
        this.render();
      };
    },
  };

  VX.Sanctuary = Sanctuary;
})();
