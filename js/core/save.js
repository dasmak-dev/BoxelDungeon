// Guardado de partida en localStorage (se usa en las salas de guardado).
(function () {
  const KEY = 'boxel_save_v1';

  const Save = {
    has() {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },

    peek() {
      try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
    },

    write(game, snap = {}) {
      const W = game.weapon, P = game.player, Sp = game.spawner;
      const data = {
        version: 1,
        date: new Date().toISOString(),
        floor: snap.floor ?? game.floor,
        bossPending: !!snap.bossPending,
        zone: snap.zone ?? game.zone,
        player: { hp: P.hp, maxHp: P.maxHp, speed: P.speed, magnet: P.magnet },
        version2: true,
        weapon: W.serialize(),
        upgrades: game.upgradesTaken.map((u) => u.id),
        spawner: snap.spawner || { roomsSinceBoss: Sp.roomsSinceBoss, nextBossIn: Sp.nextBossIn, bossCount: Sp.bossCount },
        stats: { ...game.stats },
        revives: game.revives || 0,
        gameVersion: VX.VERSION,
      };
      try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
    },

    clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
  };

  VX.Save = Save;
})();
