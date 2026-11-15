// Códice: bestiario (enemigos vistos y abatidos), mejoras descubiertas y mejor partida.
(function () {
  const $ = (id) => document.getElementById(id);

  const LORE = {
    walker: 'Lento e incansable. Forma el grueso del cerco.',
    runner: 'Entra en zigzag, golpea y se retira.',
    brute: 'Embiste en línea recta; si choca con un muro se queda aturdido.',
    spitter: 'Guarda las distancias y escupe ácido.',
    exploder: 'Se hincha y revienta. Dispárale de lejos.',
    shielder: 'Su escudo de hierro aguanta balas hasta romperse.',
    climber: 'Trepa por todo y salta sobre tu espalda.',
    dog: 'Ronda en círculos y se lanza a morder.',
    skeleton: 'La Cripta. Se recompone si no le rompes el cráneo.',
    rat: 'Las Cloacas. Llegan en manada.',
    ember: 'La Forja. Inmune al fuego; deja brasas a su paso.',
    archer: 'Esqueleto que mantiene la distancia y dispara flechas. Ponte a cubierto y acércate.',
    necro: 'Levanta a los muertos de la sala. Mátalo el primero o volverás a ver caras conocidas.',
    mimic: 'Parecía un cofre. Si lo matas, suelta lo que guardaba.',
    miner: 'Las Minas. Su pico rompe lo que encuentra; la lámpara le delata en la oscuridad.',
    sporeling: 'El Jardín. Al morir revienta en una nube de esporas venenosas.',
    bloater: 'Lento y enorme. Al reventar deja una nube de ácido que quema y frena: mátalo de lejos.',
    riot: 'Casco y chaleco antibalas por delante. Dispárale a las piernas, rodéalo o usa explosivos y el cuchillo.',
    screamer: 'No pelea: grita. Su chillido aturde y atrae a más zombis. Es el primero al que hay que callar.',
    crow: 'Llegan en bandada, vuelan en círculos y se lanzan en picado. Escopeta y lanzallamas.',
    knight: 'Una armadura negra sin nadie dentro. Lo que le arrancas vuelve a su sitio: sólo cae si le rompes el corazón de cristal.',
    revenant: 'Muere como cualquiera… pero sus restos laten en el suelo. Si no los destrozas, se levanta más fuerte.',
    hydra: 'Una planta carnívora de tres metros. Le vuelve a crecer todo, sus heridas brotan en hidras nuevas y, si le cortas la cabeza sin quemarla, le salen dos. Se come los cadáveres, muerde y te sujeta, y escupe savia que frena.',
    'boss:tanque': 'Jefe de la Horda (oleada 15). Una montaña de carne que embiste y suelta corredores al perder vida.',
    'boss:coloso': 'Jefe de la Cripta. Salta sobre ti y levanta a los muertos.',
    'boss:ancestro': 'Jefe de las Cloacas. Espirales y calaveras teledirigidas.',
    'boss:capataz': 'Jefe de las Minas. Dinamita, derrumbes y barridos de pico.',
    'boss:carnicero': 'Jefe de la Forja. Te engancha con su cadena y te despedaza girando.',
    'boss:reina': 'Jefa del Jardín. Pare crías, esparce esporas y hace brotar raíces.',
    'boss:guardian': 'Guardián del Vacío secreto. Rayos giratorios y teletransporte.',
    'boss:corazon': 'El final de la mazmorra… o eso parece.',
  };

  // Dónde aparece cada enemigo y cómo vencerlo
  const WHERE = {
    walker: 'Todos los biomas', runner: 'Todos los biomas', brute: 'Todos (desde el piso 3)', spitter: 'Todos los biomas', exploder: 'Todos los biomas',
    shielder: 'Todos los biomas', climber: 'Todos los biomas', dog: 'Todos los biomas', skeleton: 'Cripta y Vacío', rat: 'Cloacas', ember: 'Forja y Vacío',
    archer: 'Cripta y Vacío', necro: 'Cripta, Jardín y Vacío', mimic: 'Cofres misteriosos', miner: 'Minas', sporeling: 'Jardín fúngico',
    bloater: 'Todos (pisos altos) y Horda', knight: 'Mazmorra, desde el piso 8 (más en Cripta, Forja y Vacío)', revenant: 'Mazmorra, desde el piso 6 (más en Cripta y Jardín)', hydra: 'Mazmorra, desde el piso 7', riot: 'Todos (pisos altos) y Horda', screamer: 'Todos (pisos altos) y Horda', crow: 'Todos (pisos altos) y Horda',
  };
  const WEAK = {
    walker: 'La cabeza. Rómpele una pierna y se arrastra.', runner: 'Espera a que se lance y dispárale de frente.', brute: 'Esquiva la embestida contra un muro y remátalo aturdido.',
    spitter: 'Acércate: cuerpo a cuerpo apenas se defiende.', exploder: 'Dispárale lejos y que reviente entre los demás.', shielder: 'Rodéalo o rompe el escudo con explosivos.',
    climber: 'Mira arriba; cae en cuanto le das.', dog: 'Escopeta cuando salte.', skeleton: 'Rómpele el cráneo o se vuelve a montar.', rat: 'Perdigones: llegan juntas.',
    ember: 'No le prendas fuego: es inmune. Agua y balas.', archer: 'Cúbrete y corta la distancia.', necro: 'El primero de la sala: sin él no se levantan.',
    mimic: 'Explosivos y distancia; muerde fuerte.', miner: 'Apágale la lámpara en la oscuridad: dispara a la luz.', sporeling: 'Mátalo de lejos para que la nube no te alcance.',
    bloater: 'De lejos y fuera de su nube.', knight: 'El corazón violeta del pecho, dentro de la jaula dorada. Rodearlo no sirve: hay que apuntar.', revenant: 'Cualquier parte; después, destroza la pila de carne y huesos antes de que deje de latir.', hydra: 'La flor, sobre todo dentro de la boca cuando la abre para morder (x4). El fuego y los explosivos cauterizan: ni brota ni le salen dos cabezas. Rompe los brotes antes de que se junten.', riot: 'Piernas, espalda o explosivos.', screamer: 'Cállalo antes de que grite.', crow: 'Escopeta, lanzallamas o ráfagas.',
  };
  // Conocer al enemigo: cuantos más abates de un tipo, más daño le haces
  const TIERS = [25, 100, 250], BOSS_TIERS = [1, 3, 6], BONUS = [0.05, 0.1, 0.15];
  function tierOf(id, n) { const t = id.startsWith('boss:') ? BOSS_TIERS : TIERS; let k = 0; while (k < t.length && n >= t[k]) k++; return k; }

  const Codex = {
    open() { this.sel = this.sel || null; this.render(); VX.Menus.show('codex'); },
    // multiplicador de daño contra un tipo según lo que lo conoces
    bonus(id) {
      const E = VX.Profile.data.codex && VX.Profile.data.codex.enemies;
      const k = E ? tierOf(id, E[id] || 0) : 0;
      return 1 + (k ? BONUS[k - 1] : 0);
    },

    render() {
      const d = VX.Profile.data, E = d.codex.enemies;
      const b = d.best;
      $('codexBest').innerHTML = b
        ? `MEJOR PARTIDA: <b>${b.score}</b> pts · piso ${b.floor} · ${b.kills} bajas · ${b.bosses} jefes · ${Math.floor(b.time / 60)}:${String(b.time % 60).padStart(2, '0')} <small>(${b.date})</small>`
        : 'Aún no has terminado ninguna partida.';
      const T = VX.Zombie.TYPES;
      const names = {};
      for (const B of VX.Boss.TYPES) names['boss:' + B.id] = B.name.charAt(0) + B.name.slice(1).toLowerCase();
      const ids = [...Object.keys(T).filter((id) => !T[id].pile), ...Object.keys(names)];
      const known = ids.filter((id) => E[id]).length;
      let h = `<div class="cprog">Descubiertos ${known} / ${ids.length} · Conocer al enemigo: +5 / +10 / +15 % de daño a los ${TIERS.join(', ')} abatidos (jefes: ${BOSS_TIERS.join(', ')}). Pulsa en uno para ver sus datos.</div>`;
      h += ids.map((id) => {
        const n = E[id] || 0;
        const name = names[id] || T[id].name;
        if (!n) return `<div class="ce locked"><b>???</b><small>Aún no lo has abatido</small></div>`;
        const tiers = id.startsWith('boss:') ? BOSS_TIERS : TIERS, k = tierOf(id, n);
        const next = tiers[k], prev = k ? tiers[k - 1] : 0;
        const pct = next ? Math.round((n - prev) / (next - prev) * 100) : 100;
        const stars = '★'.repeat(k) + '☆'.repeat(3 - k);
        const open = this.sel === id;
        let x = `<div class="ce${open ? ' open' : ''}" data-id="${id}"><b>${name}</b> <span>${n} abatidos <i class="cstars">${stars}</i></span>`;
        x += `<div class="cbar"><div style="width:${pct}%"></div></div>`;
        x += `<small>${LORE[id] || ''}</small>`;
        if (open) {
          const t = T[id];
          if (t) x += `<div class="cstats">Vida ${t.hp} · Velocidad ${t.speed} m/s · Daño ${t.dmg || '—'} · Oro ${t.gold[0]}–${t.gold[1]}</div>`;
          if (WHERE[id]) x += `<div class="cline"><b>Dónde:</b> ${WHERE[id]}</div>`;
          if (WEAK[id]) x += `<div class="cline"><b>Punto débil:</b> ${WEAK[id]}</div>`;
          x += `<div class="cline"><b>Conocimiento:</b> ${k ? '+' + Math.round(BONUS[k - 1] * 100) + ' % de daño' : 'sin bonificación'}${next ? ` · siguiente a los ${next} (${next - n} más)` : ' · máximo'}</div>`;
        }
        return x + '</div>';
      }).join('');
      $('codexEnemies').innerHTML = h;
      for (const el of $('codexEnemies').querySelectorAll('.ce[data-id]')) el.onclick = () => { this.sel = this.sel === el.dataset.id ? null : el.dataset.id; this.render(); };
      $('codexUps').innerHTML = VX.Upgrades.list.map((u) => {
        const ok = d.codex.ups.includes(u.id);
        const tag = u.rare ? ' ★' : u.curse ? ' ☠' : u.shop ? ' $' : '';
        if (u.unlock && typeof u.unlock === 'object' && !VX.Profile.upUnlocked(u)) {
          const c = u.unlock, v = Math.min(c.n, VX.Profile.upValue(c));
          return `<div class="ce locked"><b>🔒 ${u.name}${tag}</b><small>${c.txt} (${v}/${c.n})</small></div>`;
        }
        return ok ? `<div class="ce"><b>${u.name}${tag}</b><small>${u.desc}</small></div>` : `<div class="ce locked"><b>???${tag}</b><small>Sin descubrir</small></div>`;
      }).join('');
    },
  };

  VX.Codex = Codex;
})();
