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
    'boss:tanque': 'Jefe de la Horda (oleada 15). Una montaña de carne que embiste y suelta corredores al perder vida.',
    'boss:coloso': 'Jefe de la Cripta. Salta sobre ti y levanta a los muertos.',
    'boss:ancestro': 'Jefe de las Cloacas. Espirales y calaveras teledirigidas.',
    'boss:capataz': 'Jefe de las Minas. Dinamita, derrumbes y barridos de pico.',
    'boss:carnicero': 'Jefe de la Forja. Te engancha con su cadena y te despedaza girando.',
    'boss:reina': 'Jefa del Jardín. Pare crías, esparce esporas y hace brotar raíces.',
    'boss:guardian': 'Guardián del Vacío secreto. Rayos giratorios y teletransporte.',
    'boss:corazon': 'El final de la mazmorra… o eso parece.',
  };

  const Codex = {
    open() { this.render(); VX.Menus.show('codex'); },

    render() {
      const d = VX.Profile.data, E = d.codex.enemies;
      const b = d.best;
      $('codexBest').innerHTML = b
        ? `MEJOR PARTIDA: <b>${b.score}</b> pts · piso ${b.floor} · ${b.kills} bajas · ${b.bosses} jefes · ${Math.floor(b.time / 60)}:${String(b.time % 60).padStart(2, '0')} <small>(${b.date})</small>`
        : 'Aún no has terminado ninguna partida.';
      const T = VX.Zombie.TYPES;
      const names = {};
      for (const B of VX.Boss.TYPES) names['boss:' + B.id] = B.name.charAt(0) + B.name.slice(1).toLowerCase();
      const ids = [...Object.keys(T), ...Object.keys(names)];
      $('codexEnemies').innerHTML = ids.map((id) => {
        const n = E[id] || 0;
        const name = names[id] || T[id].name;
        return n ? `<div class="ce"><b>${name}</b> <span>${n} abatidos</span><small>${LORE[id] || ''}</small></div>`
          : `<div class="ce locked"><b>???</b><small>Aún no lo has abatido</small></div>`;
      }).join('');
      $('codexUps').innerHTML = VX.Upgrades.list.map((u) => {
        const ok = d.codex.ups.includes(u.id);
        const tag = u.rare ? ' ★' : u.curse ? ' ☠' : u.shop ? ' $' : '';
        return ok ? `<div class="ce"><b>${u.name}${tag}</b><small>${u.desc}</small></div>` : `<div class="ce locked"><b>???${tag}</b><small>Sin descubrir</small></div>`;
      }).join('');
    },
  };

  VX.Codex = Codex;
})();
