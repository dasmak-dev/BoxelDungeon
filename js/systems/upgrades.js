// Mejoras del arma y del jugador.
(function () {
  const U = [
    { id: 'damage', name: 'Balas pesadas', desc: '+25% de daño', shape: 'bullet', color: [1, 0.3, 0.2],
      apply: (g) => { g.weapon.mods.damage *= 1.25; } },
    { id: 'range', pools: ['precision', 'spray', 'fire'], name: 'Cañón largo', desc: '+35% de alcance', shape: 'arrow', color: [0.3, 0.8, 1],
      apply: (g) => { g.weapon.mods.range *= 1.35; g.weapon.mods.spread *= 0.85; } },
    { id: 'rate', pools: ['precision', 'spray', 'scatter', 'fire'], name: 'Gatillo ligero', desc: '+20% de cadencia', shape: 'bolt', color: [1, 0.9, 0.2],
      apply: (g) => { g.weapon.mods.rate *= 1.2; } },
    { id: 'mag', pools: ['precision', 'spray', 'scatter', 'blast', 'fire'], name: 'Cargador ampliado', desc: '+40% de balas por cargador', shape: 'mag', color: [0.6, 0.6, 0.65],
      apply: (g) => { g.weapon.mods.mag *= 1.4; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'reload', pools: ['precision', 'spray', 'scatter', 'blast', 'fire'], name: 'Recarga rápida', desc: '-25% tiempo de recarga', shape: 'clock', color: [0.4, 1, 0.5],
      apply: (g) => { g.weapon.mods.reload *= 0.75; } },
    { id: 'pierce', pools: ['precision', 'spray', 'scatter'], name: 'Perforación', desc: 'Atraviesa +1 enemigo', shape: 'pierce', color: [0.8, 0.4, 1],
      apply: (g) => { g.weapon.mods.pierce += 1; } },
    { id: 'blast', pools: ['scatter', 'blast'], name: 'Munición expansiva', desc: '+40% de destrucción', shape: 'star', color: [1, 0.55, 0.1],
      apply: (g) => { g.weapon.mods.destruction *= 1.4; g.weapon.mods.damage *= 1.05; } },
    { id: 'multi', pools: ['scatter', 'spray'], name: 'Perdigones', desc: '+1 proyectil por disparo', shape: 'multi', color: [0.9, 0.9, 0.9],
      apply: (g) => { g.weapon.mods.pellets += 1; g.weapon.mods.spread *= 1.25; } },
    { id: 'vital', name: 'Corazón de vóxel', desc: '+25 de vida máxima', shape: 'heart', color: [1, 0.25, 0.4],
      apply: (g) => { g.player.maxHp += 25; g.player.hp += 25; } },
    { id: 'grip', pools: ['precision', 'spray', 'scatter'], name: 'Empuñadura firme', desc: '-30% de retroceso', shape: 'arrow', color: [0.75, 0.65, 0.5],
      available: (g) => (g.weapon.mods.recoil || 1) > 0.3, apply: (g) => { g.weapon.mods.recoil = (g.weapon.mods.recoil || 1) * 0.7; } },
    { id: 'speed', name: 'Botas ligeras', desc: '+12% de velocidad', shape: 'boot', color: [0.5, 0.75, 1],
      apply: (g) => { g.player.speed *= 1.12; } },
    { id: 'auto', pools: ['precision', 'scatter'], name: 'Gatillo automático', desc: 'Todas las armas son automáticas', shape: 'auto', color: [1, 0.35, 0.6],
      available: (g) => !g.weapon.mods.auto, apply: (g) => { g.weapon.mods.auto = true; g.weapon.mods.rate *= 1.1; } },
    // ---- propias de cada estilo de arma (sólo salen si empiezas la partida con un arma de ese estilo) ----
    { id: 'headhunter', pools: ['precision'], name: 'Cazacabezas', desc: '+60% de daño en la cabeza', shape: 'skull', color: [1, 0.85, 0.4],
      apply: (g) => { g.weapon.mods.headMul = (g.weapon.mods.headMul || 1) * 1.6; } },
    { id: 'steady', pools: ['precision'], name: 'Pulso de cirujano', desc: '-40% de dispersión y +15% de daño', shape: 'eye', color: [0.7, 0.9, 1],
      apply: (g) => { g.weapon.mods.spread *= 0.6; g.weapon.mods.damage *= 1.15; } },
    { id: 'spinup', pools: ['spray'], name: 'Cañón caliente', desc: 'La cadencia sube al mantener (+50%)', shape: 'bolt', color: [1, 0.5, 0.2],
      available: (g) => !g.weapon.mods.spinup, apply: (g) => { g.weapon.mods.spinup = true; } },
    { id: 'drum', pools: ['spray'], name: 'Tambor', desc: '+80% cargador, recarga más lenta', shape: 'mag', color: [0.5, 0.5, 0.55],
      apply: (g) => { g.weapon.mods.mag *= 1.8; g.weapon.mods.reload *= 1.1; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'choke', pools: ['scatter'], name: 'Choke cerrado', desc: '-35% dispersión, +25% alcance', shape: 'arrow', color: [0.85, 0.75, 0.6],
      apply: (g) => { g.weapon.mods.spread *= 0.65; g.weapon.mods.range *= 1.25; } },
    { id: 'slugs', pools: ['scatter'], name: 'Postas', desc: '+30% daño por perdigón', shape: 'bullet', color: [0.9, 0.4, 0.3],
      apply: (g) => { g.weapon.mods.damage *= 1.3; g.weapon.mods.destruction *= 1.3; } },
    { id: 'blastR', pools: ['blast'], name: 'Carga reforzada', desc: '+30% radio de explosión', shape: 'star', color: [1, 0.6, 0.2],
      apply: (g) => { g.weapon.mods.blastR = (g.weapon.mods.blastR || 1) * 1.3; } },
    { id: 'quickfuse', pools: ['blast'], name: 'Espoleta rápida', desc: '+30% de cadencia y recarga un 20% más rápida', shape: 'clock', color: [1, 0.8, 0.3],
      apply: (g) => { g.weapon.mods.rate *= 1.3; g.weapon.mods.reload *= 0.8; } },
    { id: 'brutal', pools: ['melee'], name: 'Golpe brutal', desc: '+35% de daño cuerpo a cuerpo', shape: 'skull', color: [0.9, 0.3, 0.25],
      apply: (g) => { g.weapon.mods.meleeDmg = (g.weapon.mods.meleeDmg || 1) * 1.35; } },
    { id: 'wrists', pools: ['melee'], name: 'Muñecas de hierro', desc: 'Golpeas un 25% más rápido', shape: 'bolt', color: [0.75, 0.75, 0.8],
      apply: (g) => { g.weapon.mods.meleeRate = (g.weapon.mods.meleeRate || 1) * 1.25; } },
    { id: 'reach', pools: ['melee'], name: 'Brazo largo', desc: '+25% de alcance cuerpo a cuerpo', shape: 'arrow', color: [0.6, 0.8, 0.6],
      apply: (g) => { g.weapon.mods.reach = (g.weapon.mods.reach || 1) * 1.25; } },
    { id: 'tank', pools: ['fire'], name: 'Depósito grande', desc: '+60% depósito, +15% alcance', shape: 'mag', color: [0.9, 0.5, 0.2],
      apply: (g) => { g.weapon.mods.mag *= 1.6; g.weapon.mods.range *= 1.15; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'hotter', pools: ['fire'], name: 'Mezcla caliente', desc: '+30% de daño del fuego', shape: 'star', color: [1, 0.35, 0.1],
      apply: (g) => { g.weapon.mods.damage *= 1.3; } },
    // ---- calibre (sólo uno por partida: cambia cómo pega cada bala) ----
    { id: 'subsonic', pools: ['precision', 'spray', 'scatter'], name: 'Munición subsónica', desc: '+65% daño, -25% cadencia', shape: 'bullet', color: [0.55, 0.45, 0.35],
      available: (g) => !g.weapon.mods.caliber, apply: (g) => { const m = g.weapon.mods; m.caliber = 'subsonic'; m.damage *= 1.65; m.destruction *= 1.3; m.rate *= 0.75; m.tracer = [1, 0.55, 0.25]; } },
    { id: 'highvel', pools: ['precision', 'spray'], name: 'Alta velocidad', desc: '+35% cadencia, atraviesan 1, -20% daño', shape: 'arrow', color: [0.5, 0.9, 1],
      available: (g) => !g.weapon.mods.caliber, apply: (g) => { const m = g.weapon.mods; m.caliber = 'highvel'; m.rate *= 1.35; m.range *= 1.3; m.pierce += 1; m.damage *= 0.8; m.tracer = [0.6, 0.95, 1]; } },
    { id: 'magnum', pools: ['precision', 'scatter'], name: 'Calibre magnum', desc: '+90% daño, -40% cadencia, -30% cargador', shape: 'bullet', color: [0.95, 0.75, 0.3],
      available: (g) => !g.weapon.mods.caliber, apply: (g) => { const m = g.weapon.mods; m.caliber = 'magnum'; m.damage *= 1.9; m.rate *= 0.6; m.mag *= 0.7; m.recoil = (m.recoil || 1) * 1.35; m.destruction *= 1.2; m.tracer = [1, 0.85, 0.4]; for (const sl of g.weapon.slots) sl.ammo = Math.min(sl.ammo, g.weapon.magFor(sl.id)); } },
    // ---- raras (efectos especiales) ----
    { id: 'shock', pools: ['precision', 'spray', 'scatter'], rare: true, name: 'Balas eléctricas', desc: 'Un rayo salta a 2 enemigos', shape: 'bolt', color: [0.45, 0.75, 1],
      available: (g) => !g.weapon.mods.shock, apply: (g) => { g.weapon.mods.shock = 2; } },
    { id: 'explosive', pools: ['scatter', 'spray', 'precision'], rare: true, name: 'Balas explosivas', desc: 'Las balas explotan', shape: 'star', color: [1, 0.4, 0.1],
      available: (g) => !g.weapon.mods.explosive, apply: (g) => { g.weapon.mods.explosive = true; } },
    { id: 'frost', pools: ['spray', 'scatter', 'precision'], rare: true, name: 'Balas de hielo', desc: 'Ralentizan a la mitad', shape: 'crystal', color: [0.6, 0.9, 1],
      available: (g) => !g.weapon.mods.frost, apply: (g) => { g.weapon.mods.frost = true; } },
    { id: 'toxic', pools: ['spray', 'scatter'], rare: true, name: 'Balas tóxicas', desc: 'Envenenan', shape: 'skull', color: [0.5, 1, 0.3],
      available: (g) => !g.weapon.mods.toxic, apply: (g) => { g.weapon.mods.toxic = true; } },
    { id: 'fire', pools: ['scatter', 'blast', 'spray'], rare: true, name: 'Balas incendiarias', desc: 'Prenden fuego a los zombis', shape: 'bolt', color: [1, 0.45, 0.05],
      available: (g) => !g.weapon.mods.fire, apply: (g) => { g.weapon.mods.fire = true; } },
    { id: 'ricochet', pools: ['precision', 'spray'], rare: true, name: 'Rebote', desc: 'Rebotan hacia otro enemigo', shape: 'arrow', color: [0.4, 1, 0.9],
      available: (g) => (g.weapon.mods.ricochet || 0) < 2, apply: (g) => { g.weapon.mods.ricochet = (g.weapon.mods.ricochet || 0) + 1; } },
    { id: 'lifesteal', rare: true, name: 'Vampirismo', desc: 'Cada impacto y cada muerte te curan', shape: 'heart', color: [0.85, 0.1, 0.3],
      available: (g) => !g.weapon.mods.lifesteal, apply: (g) => { g.weapon.mods.lifesteal = true; } },
    { id: 'corpseBlast', pools: ['blast', 'scatter', 'melee', 'fire'], rare: true, name: 'Cadáveres explosivos', desc: 'Los zombis revientan al morir', shape: 'star', color: [1, 0.3, 0.1],
      available: (g) => !g.weapon.mods.corpseBlast, apply: (g) => { g.weapon.mods.corpseBlast = true; } },
    // ---- maldiciones (poder a cambio de un precio) ----
    { id: 'glass', curse: true, name: 'Pacto de cristal', desc: '+50% de daño, pero -30% de vida máxima', shape: 'eye', color: [0.7, 0.3, 1],
      apply: (g) => { g.weapon.mods.damage *= 1.5; g.player.maxHp = Math.max(30, Math.round(g.player.maxHp * 0.7)); g.player.hp = Math.min(g.player.hp, g.player.maxHp); } },
    { id: 'blood', curse: true, name: 'Pacto de sangre', desc: '+40% cadencia, pero sangras', shape: 'eye', color: [0.7, 0.05, 0.1],
      available: (g) => !g.weapon.mods.bleed, apply: (g) => { g.weapon.mods.rate *= 1.4; g.weapon.mods.bleed = true; } },
    { id: 'greed', curse: true, name: 'Pacto del avaro', desc: 'Doble de oro, zombis +25% vida', shape: 'coin', color: [0.9, 0.7, 0.1],
      available: (g) => !g.weapon.mods.greed, apply: (g) => { g.weapon.mods.greed = true; } },
    // ================= 0.44: mejoras nuevas =================
    // unlock: { kind (enemigo del bestiario, 'boss:id' para un jefe) | stat (estadística del perfil), n, txt }
    // ---- cuerpo a cuerpo ----
    { id: 'execute', pools: ['melee'], name: 'Ejecución', desc: 'Remata de un tajo bajo 25% de vida', shape: 'blade', color: [0.85, 0.15, 0.15],
      unlock: { kind: 'boss:carnicero', n: 1, txt: 'Derrota al Carnicero' },
      available: (g) => !g.weapon.mods.execute, apply: (g) => { g.weapon.mods.execute = true; } },
    { id: 'lunge', pools: ['melee'], name: 'Embestida', desc: 'Tras esquivar: +80% al siguiente tajo', shape: 'boot', color: [0.95, 0.55, 0.3],
      available: (g) => !g.weapon.mods.lunge, apply: (g) => { g.weapon.mods.lunge = true; } },
    { id: 'whirl', pools: ['melee'], name: 'Torbellino', desc: 'Los tajos dan a todos alrededor', shape: 'multi', color: [0.8, 0.85, 0.95],
      available: (g) => !g.weapon.mods.whirl, apply: (g) => { g.weapon.mods.whirl = true; } },
    { id: 'bleed', pools: ['melee'], rare: true, name: 'Filo sangrante', desc: 'Los cortes hacen sangrar', shape: 'drop', color: [0.75, 0.05, 0.1],
      unlock: { stat: 'knifeKills', n: 150, txt: 'Mata 150 zombis a cuchillo' },
      available: (g) => !g.weapon.mods.bleed, apply: (g) => { g.weapon.mods.bleed = true; } },
    { id: 'counter', pools: ['melee'], rare: true, name: 'Contraataque', desc: 'Tras recibir un golpe: tajo ×3', shape: 'skull', color: [1, 0.75, 0.2],
      unlock: { kind: 'knight', n: 25, txt: 'Mata 25 Caballeros negros' },
      available: (g) => !g.weapon.mods.counter, apply: (g) => { g.weapon.mods.counter = true; } },
    { id: 'throwblade', pools: ['melee'], rare: true, name: 'Hoja arrojadiza', desc: 'Cada 3 tajos, una hoja voladora', shape: 'blade', color: [0.6, 0.85, 1],
      unlock: { kind: 'archer', n: 60, txt: 'Mata 60 Esqueletos arqueros' },
      available: (g) => !g.weapon.mods.throwBlade, apply: (g) => { g.weapon.mods.throwBlade = true; } },
    // ---- fuego ----
    { id: 'blueflame', pools: ['fire'], name: 'Llama azul', desc: '+40% daño de fuego', shape: 'flame', color: [0.35, 0.6, 1],
      unlock: { kind: 'ember', n: 40, txt: 'Mata 40 Ígneos' },
      available: (g) => !g.weapon.mods.blueFlame, apply: (g) => { g.weapon.mods.blueFlame = true; } },
    { id: 'tar', pools: ['fire'], name: 'Brea', desc: 'Deja charcos ardiendo', shape: 'drop', color: [0.25, 0.2, 0.15],
      available: (g) => !g.weapon.mods.tar, apply: (g) => { g.weapon.mods.tar = true; } },
    { id: 'pyro', pools: ['fire'], name: 'Pirómano', desc: 'Matar quemando recarga el depósito', shape: 'mag', color: [1, 0.5, 0.1],
      available: (g) => !g.weapon.mods.pyro, apply: (g) => { g.weapon.mods.pyro = true; } },
    { id: 'fireball', pools: ['fire'], rare: true, name: 'Bocanada', desc: 'Al soltar: bola de fuego', shape: 'flame', color: [1, 0.3, 0.05],
      unlock: { stat: 'bosses', n: 3, txt: 'Derrota a 3 jefes' },
      available: (g) => !g.weapon.mods.fireball, apply: (g) => { g.weapon.mods.fireball = true; } },
    { id: 'immolate', pools: ['fire'], rare: true, name: 'Inmolación', desc: 'El fuego se contagia', shape: 'flame', color: [1, 0.6, 0.15],
      unlock: { kind: 'bloater', n: 15, txt: 'Mata 15 Gordos hinchados' },
      available: (g) => !g.weapon.mods.immolate, apply: (g) => { g.weapon.mods.immolate = true; } },
    // ---- explosivos ----
    { id: 'bouncy', pools: ['blast'], name: 'Rebotadoras', desc: 'Rebotan y estallan al tocar', shape: 'grenade', color: [0.5, 0.85, 0.4],
      available: (g) => !g.weapon.mods.bouncy, apply: (g) => { g.weapon.mods.bouncy = true; } },
    { id: 'cluster', pools: ['blast'], name: 'Racimo', desc: 'Sueltan 3 minigranadas', shape: 'multi', color: [1, 0.7, 0.2],
      unlock: { kind: 'exploder', n: 50, txt: 'Mata 50 Explosivos' },
      available: (g) => !g.weapon.mods.cluster, apply: (g) => { g.weapon.mods.cluster = true; } },
    { id: 'remote', pools: ['blast'], name: 'Detonador remoto', desc: 'Se pegan; estallan al volver a disparar', shape: 'scope', color: [0.9, 0.2, 0.2],
      available: (g) => !g.weapon.mods.remote, apply: (g) => { g.weapon.mods.remote = true; } },
    { id: 'shockwave', pools: ['blast'], rare: true, name: 'Onda de choque', desc: 'Las explosiones lanzan y aturden', shape: 'star', color: [0.9, 0.9, 1],
      unlock: { kind: 'boss:coloso', n: 1, txt: 'Derrota al Coloso putrefacto' },
      available: (g) => !g.weapon.mods.shockwave, apply: (g) => { g.weapon.mods.shockwave = true; } },
    { id: 'mine', pools: ['blast'], rare: true, name: 'Mina de proximidad', desc: 'Las que fallan quedan como minas', shape: 'grenade', color: [0.95, 0.85, 0.2],
      unlock: { kind: 'boss:capataz', n: 1, txt: 'Derrota al Capataz' },
      available: (g) => !g.weapon.mods.mine, apply: (g) => { g.weapon.mods.mine = true; } },
    // ---- precisión ----
    { id: 'firstshot', pools: ['precision'], name: 'Primer disparo', desc: '1.ª bala del cargador ×2', shape: 'bullet', color: [1, 0.95, 0.6],
      available: (g) => !g.weapon.mods.firstShot, apply: (g) => { g.weapon.mods.firstShot = true; } },
    { id: 'knee', pools: ['precision', 'spray'], name: 'Disparo en la rodilla', desc: 'Tiros a las piernas derriban', shape: 'pierce', color: [0.8, 0.6, 0.4],
      unlock: { kind: 'dog', n: 40, txt: 'Mata 40 Perros zombi' },
      available: (g) => !g.weapon.mods.knee, apply: (g) => { g.weapon.mods.knee = true; } },
    { id: 'mark', pools: ['precision'], rare: true, name: 'Marcar', desc: 'Marca al enemigo: +30% daño', shape: 'eye', color: [1, 0.3, 0.3],
      unlock: { kind: 'screamer', n: 30, txt: 'Mata 30 Chillones' },
      available: (g) => !g.weapon.mods.mark, apply: (g) => { g.weapon.mods.mark = true; } },
    // ---- ráfaga ----
    { id: 'suppress', pools: ['spray'], name: 'Fuego de supresión', desc: 'Ralentizan un 30%', shape: 'bolt', color: [0.6, 0.65, 0.9],
      available: (g) => !g.weapon.mods.suppress, apply: (g) => { g.weapon.mods.suppress = true; } },
    { id: 'lastrounds', pools: ['spray', 'precision'], name: 'Últimas balas', desc: 'Últimas balas: +40% daño', shape: 'mag', color: [1, 0.45, 0.3],
      available: (g) => !g.weapon.mods.lastRounds, apply: (g) => { g.weapon.mods.lastRounds = true; } },
    { id: 'belt', pools: ['spray'], rare: true, name: 'Cinta de munición', desc: 'Sin recargar: las balas vuelven solas', shape: 'auto', color: [0.75, 0.6, 0.3],
      unlock: { stat: 'kills', n: 1500, txt: 'Mata 1500 zombis' },
      available: (g) => !g.weapon.mods.belt, apply: (g) => { g.weapon.mods.belt = true; } },
    // ---- perdigones ----
    { id: 'recoiljump', pools: ['scatter'], name: 'Retroceso propulsor', desc: 'Disparar en el aire te impulsa', shape: 'boot', color: [0.6, 0.8, 1],
      unlock: { kind: 'crow', n: 40, txt: 'Mata 40 Cuervos' },
      available: (g) => !g.weapon.mods.recoilJump, apply: (g) => { g.weapon.mods.recoilJump = true; } },
    { id: 'pointblank', pools: ['scatter'], name: 'Boca a boca', desc: 'De cerca: +60% daño y empuje', shape: 'skull', color: [1, 0.55, 0.35],
      available: (g) => !g.weapon.mods.pointBlank, apply: (g) => { g.weapon.mods.pointBlank = true; } },
    { id: 'magnesium', pools: ['scatter'], rare: true, name: 'Dragón de magnesio', desc: 'Perdigones incendiarios', shape: 'flame', color: [1, 0.85, 0.5],
      unlock: { kind: 'boss:reina', n: 1, txt: 'Derrota a la Reina Micelio' },
      available: (g) => !g.weapon.mods.magnesium, apply: (g) => { g.weapon.mods.magnesium = true; } },
    // ---- generales ----
    { id: 'secondwind', name: 'Segundo aliento', desc: 'Bajo 25 de vida: +25 (1 por sala)', shape: 'heart', color: [0.4, 1, 0.6],
      unlock: { kind: 'hydra', n: 20, txt: 'Mata 20 Hidras' },
      available: (g) => !g.weapon.mods.secondWind, apply: (g) => { g.weapon.mods.secondWind = true; } },
    { id: 'adrenaline', name: 'Adrenalina', desc: 'Matar da velocidad', shape: 'boot', color: [1, 0.85, 0.3],
      available: (g) => !g.weapon.mods.adrenaline, apply: (g) => { g.weapon.mods.adrenaline = true; } },
    { id: 'tacreload', pools: ['precision', 'spray', 'scatter', 'blast', 'fire'], name: 'Recarga táctica', desc: 'Recarga en vacío 40% más rápida', shape: 'clock', color: [0.5, 0.95, 0.8],
      available: (g) => !g.weapon.mods.tacReload, apply: (g) => { g.weapon.mods.tacReload = true; } },
    { id: 'berserkpact', curse: true, name: 'Pacto del berserker', desc: 'Menos vida, más daño; sin botiquines', shape: 'eye', color: [0.9, 0.2, 0.05],
      unlock: { kind: 'brute', n: 60, txt: 'Mata 60 Brutos' },
      available: (g) => !g.weapon.mods.berserkPact, apply: (g) => { g.weapon.mods.berserkPact = true; } },
    // ---- mercancía de la tienda (se desbloquea con esencia en el Santuario) ----
    { id: 'magnet', shop: true, unlock: 45, name: 'Imán de oro', desc: '+3 m de radio para recoger monedas', shape: 'coin', color: [1, 0.8, 0.2],
      apply: (g) => { g.player.magnet += 3; } },
    { id: 'dash2', shop: true, unlock: 90, name: 'Doble impulso', desc: '+1 carga de esquiva (encadena dos seguidas)', shape: 'boot', color: [0.6, 0.85, 1],
      available: (g) => g.player.dashMax < 3, apply: (g) => { g.player.dashMax++; g.player.dashStock = g.player.dashMax; } },
    { id: 'dashcd', shop: true, unlock: 60, name: 'Piernas de gato', desc: 'La esquiva recarga un 30% más rápido', shape: 'clock', color: [0.5, 0.9, 1],
      available: (g) => g.player.dashMul > 0.4, apply: (g) => { g.player.dashMul *= 0.7; } },
    { id: 'bandolier', shop: true, unlock: 50, name: 'Bandolera', desc: '+15% cargador, recarga más rápida', shape: 'mag', color: [0.8, 0.6, 0.3],
      apply: (g) => { g.weapon.mods.mag *= 1.15; g.weapon.mods.reload *= 0.88; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
    { id: 'brake', shop: true, unlock: 55, name: 'Freno de boca', desc: '-25% de retroceso y -15% de dispersión', shape: 'pierce', color: [0.55, 0.6, 0.7],
      available: (g) => (g.weapon.mods.recoil || 1) > 0.3, apply: (g) => { g.weapon.mods.recoil = (g.weapon.mods.recoil || 1) * 0.75; g.weapon.mods.spread *= 0.85; } },
    { id: 'medkit', shop: true, unlock: 70, name: 'Botiquín de campaña', desc: 'Al despejar una sala recuperas 8 de vida', shape: 'plus', color: [1, 0.4, 0.45],
      apply: (g) => { g.player.regenRoom = (g.player.regenRoom || 0) + 8; } },
    // ---- (0.59) de la katana: salen si la llevas ----
    { id: 'kPower', name: 'Filo templado', desc: '+30% daño de katana', shape: 'star', color: [0.85, 0.9, 1],
      available: (g) => g.weapon.has('katana'), apply: (g) => { g.weapon.mods.kPower = (g.weapon.mods.kPower || 1) * 1.3; } },
    { id: 'kSpeed', name: 'Iaido', desc: 'Katana +30% más rápida', shape: 'bolt', color: [0.7, 0.9, 1],
      available: (g) => g.weapon.has('katana'), apply: (g) => { g.weapon.mods.kSpeed = (g.weapon.mods.kSpeed || 1) * 1.3; } },
    { id: 'kReach', name: 'Hoja larga', desc: 'Katana +25% alcance', shape: 'arrow', color: [0.75, 0.8, 0.9],
      available: (g) => g.weapon.has('katana'), apply: (g) => { g.weapon.mods.kReach = (g.weapon.mods.kReach || 1) * 1.25; } },
    { id: 'kWave', name: 'Corte del viento', desc: 'Cada tajo lanza una onda', shape: 'pierce', color: [0.6, 0.95, 1],
      available: (g) => g.weapon.has('katana') && !g.weapon.mods.kWave, apply: (g) => { g.weapon.mods.kWave = true; } },
    { id: 'kArmor', name: 'Acero de Masamune', desc: 'La katana corta armaduras', shape: 'skull', color: [1, 0.85, 0.5],
      available: (g) => g.weapon.has('katana') && !g.weapon.mods.kArmor, apply: (g) => { g.weapon.mods.kArmor = true; } },
    { id: 'kDouble', name: 'Tajo doble', desc: 'A veces corta dos veces', shape: 'multi', color: [0.95, 0.6, 0.7],
      available: (g) => g.weapon.has('katana') && !g.weapon.mods.kDouble, apply: (g) => { g.weapon.mods.kDouble = true; } },
  ];

  // estilo de cada arma inicial
  const POOL_OF = { pistol: 'precision', rifle: 'precision', crossbow: 'precision', raygun: 'precision', smg: 'spray', lmg: 'spray',
    shotgun: 'scatter', dbarrel: 'scatter', launcher: 'blast', hammer: 'melee', knife: 'melee', flamer: 'fire', dual: 'spray', nailgun: 'spray', harpoon: 'precision', katana: 'melee' };
  const POOL_NAME = { precision: 'Precisión', spray: 'Ráfaga', scatter: 'Perdigones', blast: 'Explosivos', melee: 'Cuerpo a cuerpo', fire: 'Fuego' };

  const Upgrades = {
    POOL_OF, POOL_NAME,
    list: U,
    byId: Object.fromEntries(U.map((u) => [u.id, u])),
    // n mejoras distintas al azar
    // kind: 'normal' (por defecto), 'rare', 'curse'
    // kind 'shop': normales + mercancía desbloqueada en el Santuario
    random(n, game, exclude = [], kind = 'normal', noStyle = false) {
      const unlocked = (u) => VX.Profile.data.shopUnlocks.includes(u.id);
      const locked = (u) => u.unlock && !VX.Profile.upUnlocked(u);
      const ok = (u) => kind === 'rare' ? u.rare : kind === 'curse' ? u.curse : kind === 'shop' ? (!u.rare && !u.curse && (!u.shop || unlocked(u))) : (!u.rare && !u.curse && !u.shop);
      // en la mazmorra salen las del estilo del arma con la que empezaste (para buscar sinergias)
      const style = game && game.mode !== 'horde' && !noStyle ? game.runPool : null;
      const pool = VX.M.shuffle(U.filter((u) => ok(u) && !locked(u) && !exclude.includes(u.id) && (!u.available || !game || u.available(game)) && (!style || !u.pools || u.pools.includes(style))));
      if (pool.length < n && style) return this.random(n, game, exclude, kind, true);
      if (!pool.length && kind !== 'normal') return this.random(n, game, exclude, 'normal');
      return pool.slice(0, n);
    },
    // ---- Sinergias: dos mejoras concretas juntas desbloquean un efecto nuevo ----
    SYNERGIES: [
      { id: 'napalm', name: 'Napalm', needs: ['fire', 'blast'], desc: 'Prenden el suelo', apply: (g) => { g.weapon.mods.napalm = true; } },
      { id: 'metralla', name: 'Metralla', needs: ['multi', 'pierce'], desc: 'Los perdigones atraviesan un enemigo más', apply: (g) => { g.weapon.mods.pierce += 1; } },
      { id: 'brasas', name: 'Sangre ardiente', needs: ['lifesteal', 'fire'], desc: 'Cada zombi que muere en llamas te cura 5', apply: (g) => { g.weapon.mods.burnHeal = true; } },
      { id: 'cadena', name: 'Reacción en cadena', needs: ['corpseBlast', 'blast'], desc: 'Los cadáveres explotan mucho más fuerte', apply: (g) => { g.weapon.mods.bigCorpse = true; } },
      { id: 'pistolero', name: 'Pistolero', needs: ['rate', 'reload'], desc: '+15% de cadencia y recarga un 15% más rápida', apply: (g) => { g.weapon.mods.rate *= 1.15; g.weapon.mods.reload *= 0.85; } },
      { id: 'billar', name: 'Bola de billar', needs: ['ricochet', 'pierce'], desc: 'Las balas rebotan una vez más', apply: (g) => { g.weapon.mods.ricochet = (g.weapon.mods.ricochet || 0) + 1; } },
      { id: 'tirador', name: 'Tirador', needs: ['grip', 'range'], desc: '-25% de dispersión y +10% de daño', apply: (g) => { g.weapon.mods.spread *= 0.75; g.weapon.mods.damage *= 1.1; } },
      { id: 'fiebre', name: 'Fiebre del oro', needs: ['magnet', 'greed'], desc: 'Cada moneda que recoges te cura 1', apply: (g) => { g.weapon.mods.goldHeal = true; } },
      { id: 'tanque', name: 'Tanque', needs: ['vital', 'speed'], desc: '+20 de vida máxima y te curas del todo', apply: (g) => { g.player.maxHp += 20; g.player.hp = g.player.maxHp; } },
      { id: 'arco', name: 'Arco voltaico', needs: ['shock', 'ricochet'], desc: 'Los rayos saltan a 2 enemigos más', apply: (g) => { g.weapon.mods.shock += 2; } },
      { id: 'escarcha', name: 'Escarcha explosiva', needs: ['frost', 'explosive'], desc: 'Explosiones que congelan', apply: (g) => { g.weapon.mods.frostBlast = true; } },
      { id: 'plaga', name: 'Plaga', needs: ['toxic', 'multi'], desc: 'El veneno se contagia a los zombis cercanos', apply: (g) => { g.weapon.mods.plague = true; } },
      { id: 'ejecutor', name: 'Ejecutor', needs: ['headhunter', 'magnum'], desc: '+20% más de daño en la cabeza y +10% de daño', apply: (g) => { g.weapon.mods.headMul = (g.weapon.mods.headMul || 1) * 1.2; g.weapon.mods.damage *= 1.1; } },
      { id: 'tormenta', name: 'Tormenta de plomo', needs: ['spinup', 'drum'], desc: '+25% de cargador y +10% de cadencia', apply: (g) => { g.weapon.mods.mag *= 1.25; g.weapon.mods.rate *= 1.1; for (const s of g.weapon.slots) s.ammo = g.weapon.magFor(s.id); } },
      { id: 'muro', name: 'Muro de plomo', needs: ['choke', 'multi'], desc: '-15% de dispersión y +15% de daño', apply: (g) => { g.weapon.mods.spread *= 0.85; g.weapon.mods.damage *= 1.15; } },
      { id: 'demolicion', name: 'Demolición', needs: ['blastR', 'blast'], desc: '+15% de radio y +25% de destrucción', apply: (g) => { g.weapon.mods.blastR = (g.weapon.mods.blastR || 1) * 1.15; g.weapon.mods.destruction *= 1.25; } },
      { id: 'berserk', name: 'Berserker', needs: ['brutal', 'wrists'], desc: 'Cada golpe que mata te cura 4', apply: (g) => { g.weapon.mods.meleeHeal = true; } },
      { id: 'infierno', name: 'Infierno', needs: ['tank', 'hotter'], desc: '+20% de daño y +10% de alcance', apply: (g) => { g.weapon.mods.damage *= 1.2; g.weapon.mods.range *= 1.1; } },
      { id: 'carnicero', name: 'Carnicero', needs: ['execute', 'bleed'], desc: 'Cada ejecución suelta un corazón', apply: (g) => { g.weapon.mods.butcher = true; } },
      { id: 'huracan', name: 'Huracán', needs: ['whirl', 'wrists'], desc: 'Torbellino más fuerte y largo', apply: (g) => { g.weapon.mods.hurricane = true; } },
      { id: 'dragon', name: 'Dragón', needs: ['fireball', 'hotter'], desc: 'Bolas de fuego más fuertes', apply: (g) => { g.weapon.mods.dragon = true; } },
      { id: 'fuegosart', name: 'Fuegos artificiales', needs: ['cluster', 'blastR'], desc: 'El racimo suelta 5 minigranadas de colores', apply: (g) => { g.weapon.mods.fireworks = true; } },
      { id: 'cohete', name: 'Pies de cohete', needs: ['dash2', 'dashcd'], desc: 'Esquivar empuja a los enemigos cercanos', apply: (g) => { g.weapon.mods.dashPush = true; } },
    ],
    checkSynergies(game) {
      const have = new Set(game.upgradesTaken.map((u) => u.id));
      game.synergies = game.synergies || [];
      for (const s of this.SYNERGIES) {
        if (game.synergies.includes(s.id) || !s.needs.every((n) => have.has(n))) continue;
        game.synergies.push(s.id);
        s.apply(game);
        setTimeout(() => { game.hud.banner('¡SINERGIA! ' + s.name.toUpperCase(), s.desc, 3.5); VX.Audio.upgrade(); }, 1300);
      }
    },
    price(game, base = 30) {
      return Math.round(base + game.stats.purchases * 8 + game.floor * 1.5);
    },
  };

  VX.Upgrades = Upgrades;
})();
