// Service worker: permite instalar el juego en el móvil/ordenador y jugar sin conexión.
// Al instalarse descarga TODO el juego (0.52), así funciona sin internet desde el primer momento.
// Al jugar con conexión, primero intenta la red (así siempre tienes la última versión) y guarda la
// copia; sin conexión, usa la copia guardada.
const CACHE = 'boxel-cache-v13';
const ASSETS = [
"./",
"./index.html",
"./manifest.webmanifest",
"./css/style.css",
"./js/game.js",
"./js/main.js",
"./img/icons/apple-touch-icon.png",
"./img/icons/favicon.png",
"./img/icons/icon-192.png",
"./img/icons/icon-512.png",
"./img/icons/icon-maskable-512.png",
"./img/maps/barco.jpg",
"./img/maps/base.jpg",
"./img/maps/ciudad.jpg",
"./img/maps/coliseo.jpg",
"./js/core/audio.js",
"./js/core/errlog.js",
"./js/core/gamepad.js",
"./js/core/input.js",
"./js/core/math.js",
"./js/core/music.js",
"./js/core/namespace.js",
"./js/core/save.js",
"./js/core/settings.js",
"./js/core/sfx.js",
"./js/entities/boss.js",
"./js/entities/bullets.js",
"./js/entities/gunAnim.js",
"./js/entities/models.js",
"./js/entities/particles.js",
"./js/entities/pickups.js",
"./js/entities/player.js",
"./js/entities/remotePlayer.js",
"./js/entities/shopkeeper.js",
"./js/entities/voxelBody.js",
"./js/entities/weapon.js",
"./js/entities/zombie.js",
"./js/net/coop.js",
"./js/net/net.js",
"./js/net/pack.js",
"./js/render/renderer.js",
"./js/render/shaders.js",
"./js/systems/daily.js",
"./js/systems/horde.js",
"./js/systems/hordeMode.js",
"./js/systems/look.js",
"./js/systems/objectives.js",
"./js/systems/profile.js",
"./js/systems/selftest.js",
"./js/systems/smoketest.js",
"./js/systems/spawner.js",
"./js/systems/throwables.js",
"./js/systems/tutorial.js",
"./js/systems/upgrades.js",
"./js/systems/weapons.js",
"./js/ui/cartography.js",
"./js/ui/armory.js",
"./js/ui/codex.js",
"./js/ui/hud.js",
"./js/ui/lobby.js",
"./js/ui/menus.js",
"./js/ui/sanctuary.js",
"./js/ui/touch.js",
"./js/world/base.js",
"./js/world/bigRoom.js",
"./js/world/biomeDecor.js",
"./js/world/blocks.js",
"./js/world/ceilings.js",
"./js/world/city.js",
"./js/world/coliseum.js",
"./js/world/dress.js",
"./js/world/floorDetail.js",
"./js/world/props.js",
"./js/world/room.js",
"./js/world/roomPool.js",
"./js/world/ship.js",
"./js/world/gasStation.js",
"./img/maps/gasolinera.jpg",
"./js/world/world.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/health') || url.pathname.includes('/daily')) return;   // el servidor (cooperativo, tabla diaria), nunca
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
