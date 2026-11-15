# VOXEL DUNGEON

Shooter en primera persona de estilo vóxel con habitaciones procedurales, enemigos destructibles y jefes.

## Cómo jugar
Abre `index.html` con doble clic (Chrome, Edge o Firefox actualizados; necesita WebGL2). No hace falta servidor ni internet (salvo para el cooperativo).

| Tecla | Acción |
|---|---|
| WASD / flechas | Moverse |
| Ratón | Apuntar |
| Clic izquierdo | Disparar (un clic, un disparo; mantener con la mejora "Gatillo automático") |
| R | Recargar |
| Espacio | Saltar |
| Shift | Correr |
| E | Comprar / recoger / guardar / abrir puertas |
| F | Encender / apagar linterna (configurable) |
| M | Mapa: planta de la sala (enemigos, objetos, peligros, puertas) y qué hay tras cada puerta |
| G | Modo Horda: llamar ya a la siguiente oleada |
| E (mantener) | Cooperativo: levantar a un compañero caído |
| Ctrl | Inspeccionar el arma (configurable) |
| 1 · 2 · 3 / rueda / Q | Cambiar de arma (Q = la anterior) |
| V | Cuchillazo rápido (configurable) |
| T | Lanzar granada, cóctel molotov o señuelo (configurable) |
| B | Cambiar el objeto que se lanza (configurable) |
| C / clic derecho | Esquivar (impulso corto con invulnerabilidad) |
| Clic derecho (con el rifle) | Mantener para mirar por la mirilla |
| Esc o P | Pausa |

Todas las teclas (salvo 1·2·3, la rueda, las flechas y Esc) se pueden cambiar en **Ajustes → Teclas**.

### En el móvil o la tableta
Se juega en horizontal con controles táctiles (aparecen solos en pantallas táctiles; se pueden forzar o quitar en **Ajustes → Controles táctiles**):
- **Cruceta** (izquierda): moverse. Empujar más allá del borde hacia delante, o el botón **CORRER**, para correr.
- **Arrastrar el dedo** por la pantalla: apuntar (también arrastrando desde el botón de disparo).
- **Botones** (derecha): disparo, salto, esquiva, recarga, cambiar arma, cuchillazo, **USAR** (se ilumina cuando hay algo con lo que interactuar) y **MIRILLA** con el rifle.
- Arriba: pausa, linterna, mapa u oleada, y pantalla completa.

- **Apuntado asistido**: sobre un enemigo la mira se frena y se arrastra un poco hacia él (se quita en Ajustes).
- **Vibración** al disparar, recibir golpes y con las explosiones cercanas (Android).
- **Límite de FPS** (sin límite, 60 o 30) en Ajustes, para ahorrar batería.
- **Instalable**: botón «INSTALAR EL JUEGO» en el menú (Chrome/Android y ordenador); en iPhone, Safari → Compartir → «Añadir a pantalla de inicio». Instalado se abre a pantalla completa y funciona sin conexión (salvo el cooperativo).

Va mejor en Chrome para Android. La primera vez el juego empieza en calidad media; la calidad automática la baja si hace falta.

## Características
- **Mazmorra procedural** de salas continuas sacadas de un pool aleatorio: combate, tienda, recompensa, Fuente de almas y jefes. Caminos ramificados: el icono sobre cada puerta indica qué hay detrás.
- **Todo es vóxel y destructible**: las balas abren túneles en los zombis (piernas → se arrastran, brazos → muerden, cabeza → mueren) y rompen paredes hasta cierto punto.
- **Más de 12 tipos de enemigo** con comportamiento propio y una horda que te va cercando por turnos. **7 jefes** que pelean de forma distinta (saltos, dinamita, cadenas, crías, rayos, bullet hell) con fases.
- **5 biomas + 1 secreto** (Cripta, Cloacas, Minas, Forja, Jardín fúngico y El Vacío) con salas, enemigos, jefe, peligros y música propios. Jefes desde el piso 10, jefe final y modo infinito.
- **Modo Horda** (desde el menú principal): oleadas infinitas en mapas grandes. Cuatro mapas: **Ciudad nocturna** (gran plaza central, rascacielos, tiendas y un autobús en los que se entra, cristales transparentes y pisos iluminados tras las ventanas), **Coliseo** (arena con dianas, ruinas, podio, gradas y palco imperial), **Base militar** (hangar, barracones, búnker, torres de vigilancia, helicóptero estrellado, tanque y contenedores) y **Barco** (portacontenedores en plena tormenta, con castillos de popa y proa). Cajas de suministros; **máquinas de ventajas** que se pagan con oro (Coraza, Manos rápidas, Gatillo loco, Piernas de liebre y Último aliento); **eventos de oleada** al azar (apagón, niebla, jauría, estampida, lluvia de flechas, gigantes, fiebre del oro); cada 3 oleadas, vendedor o elección de mejora; campeón cada 5 y jefe cada 10.
- **Horda cooperativa** hasta 4 jugadores, por código de sala (por internet o en red local). Ver más abajo.
- **Eventos de sala**: emboscadas y cofres que pueden ser mímicos.
- **Puertas con llave**: algunas salas guardan un cofre tras una puertecita con una marca roja, azul o dorada; su llave está escondida dentro de algún objeto de la sala que se puede romper.
- **Niebla baja** según el bioma, que se abre al pasar, disparar o con las explosiones; en las salas de niebla espesa sólo se ven los ojos de los zombis y se oyen sus pasos.
- **6 armas** + mejoras normales, raras y maldiciones; esquiva; retos opcionales por sala.
- **Objetos arrojables** con tecla propia: granadas que rebotan, cócteles molotov que dejan un charco de fuego y señuelos que pitan y atraen a los zombis antes de reventar.
- **Accesorios de arma** para la partida (mira réflex, silenciador, compensador, empuñadura vertical, láser, cargador ampliado y doble cargador): se montan en el arma, se ven en el modelo y la mejoran. Los accesorios y todos los objetos para lanzar **se desbloquean con misiones** (Armería → Equipo) y luego hay que encontrarlos por los pisos.
- **Progresión permanente**: esencia para el Santuario (bendiciones y arsenal), skins por arma que se desbloquean con retos **formas del cuchillo** (karambit, daga, machete, bayoneta, navaja mariposa) y **modelos de pistola** (Desert Eagle, revólver y pistola automática, cada uno con su daño, cadencia, cargador y sonido) que se desbloquean con misiones.
- Escenarios llenos de objetos de vóxel fino (barriles, cajas, lápidas, estanterías…) que se pueden destrozar.
- Música procedural por bioma, sonido posicional con reverberación, iluminación con linterna, sombras, resplandor y oclusión ambiental, sin dependencias ni servidor.

Cooperativo: personaliza tu personaje en **Armería → PERSONAJE** (tus compañeros te ven así, con tus skins); al morir ves la partida con un compañero y vuelves en la siguiente oleada; al final de cada oleada sale la tabla del equipo.

Historial completo de cambios en [CHANGELOG.md](CHANGELOG.md). Versión actual: **0.48.0**.

## Modo Horda cooperativo (hasta 4 jugadores)
Uno crea la sala, los demás se unen con su código de 4 letras y, cuando estéis todos, el anfitrión elige mapa. Cada uno ejecuta el juego en su ordenador; el servidor solo reenvía mensajes.

- El **anfitrión** (quien crea la sala) lleva las oleadas y los zombis. Si se va, otro jugador pasa a ser el anfitrión y la partida sigue.
- Cada uno tiene su oro, sus ventajas y sus cofres.
- A 0 de vida caes al suelo: puedes arrastrarte, pero no disparar. Un compañero te levanta manteniendo **E** a tu lado 2,5 s. Si nadie te levanta en 30 s, mueres y vuelves en la siguiente oleada. Si caéis todos, fin de la partida.
- No se puede entrar a una partida ya empezada.
- **Evacuación**: desde la oleada 20 (y cada 5) aparece una radio. Al usarla, el helicóptero llega en 90 s; aguantad la horda sin fin y subid todos a la zona de aterrizaje para escapar y ganar la partida.

### Jugar en red local (sin internet)
En Windows, haz doble clic en **`iniciar-servidor.bat`**. Si no tienes [Node.js](https://nodejs.org), la primera vez descarga una copia portable (unos 30 MB) en `server/node` sin instalar nada; después abre el juego en el navegador. En otros sistemas, con Node.js 18 o superior:
```bash
node server/server.js
```
La consola muestra las direcciones (por ejemplo `http://192.168.1.20:8080`). Todos abrís esa dirección en el navegador y el juego usa ese mismo servidor.

### Jugar por internet (GitHub Pages + Render gratis)
El juego sigue en GitHub Pages; sólo el servidor de salas va en [Render](https://render.com):
1. Entra en Render con tu cuenta de GitHub → **New → Web Service** → elige este repositorio.
2. **Root Directory**: `server` · **Runtime**: Node · **Build Command**: vacío (o `npm install`) · **Start Command**: `node server.js` · **Instance type**: Free.
3. Al terminar el despliegue Render te da una dirección como `https://boxel-dungeon-coop.onrender.com`. Comprueba que `…/health` responde `ok`. El servidor oficial del juego ya está configurado: `https://boxeldungeon.onrender.com`.
4. En el juego: **Modo Horda → ⚙** y pega esa dirección (vale tal cual; se convierte en `wss://…/ws`). Para que nadie tenga que configurarlo, cambia `VX.NET_SERVER` en `js/net/net.js` por tu dirección y súbelo.

El plan gratuito de Render apaga el servidor tras 15 minutos sin uso y tarda alrededor de un minuto en despertarlo. El juego lo despierta solo al abrirse y al entrar en el menú de la horda (allí se ve «servidor listo» en verde), y lo mantiene despierto mientras estáis en ese menú. También se puede forzar un servidor con `?server=wss://…/ws` en la URL del juego.

## Publicar en GitHub
```bash
git add .
git commit -m "v0.12.0"
git tag v0.12.0
git push origin main --tags
```
Para jugar desde el navegador sin descargar nada, activa **GitHub Pages** (Settings → Pages → rama `main`, carpeta raíz): el juego funciona tal cual como página estática.

Para cada versión nueva: sube `VX.VERSION` en `js/core/namespace.js`, añade la entrada en `CHANGELOG.md` y crea su etiqueta `vX.Y.Z`.

## Estructura
```
index.html            Página principal (carga todos los scripts en orden)
css/style.css         HUD y menús
js/core/              Base: espacio de nombres, matemáticas, entrada, sonido, música, ajustes y guardado
js/render/            Motor WebGL2 de cubos instanciados, sombras y shaders de iluminación
js/world/             Bloques, habitación, pool de habitaciones, objetos de vóxel fino (props.js), decorado de salas (dress.js) y mundo
js/entities/          Modelos vóxel, cuerpo destructible/gibs, zombis, jefes, jugador, arma, oro y objetos, partículas
js/systems/           Armas y skins, perfil (esencia, desbloqueos), mejoras, generador de salas/enemigos y coordinador de la horda
js/net/               Conexión con el servidor de salas (net.js) y sincronización de la horda cooperativa (coop.js)
js/ui/                HUD, Armería, Santuario, sala cooperativa (lobby.js) y pantallas de menú
server/               Servidor de salas en Node sin dependencias (WebSocket + archivos del juego para red local)
js/game.js            Orquestador del juego (flujo de salas, update, render)
js/main.js            Arranque y bucle principal
```

## Cómo ampliarlo
- **Nueva habitación:** añade una plantilla en `js/world/roomPool.js` dentro de `normal`, `shop`, `reward`, `save` o `boss` (`name`, rangos `w`/`d` en unidades de 0,5 m y función `build(room)`).
- **Nueva mejora:** añade una entrada en `js/systems/upgrades.js` (`shape` debe existir en `js/entities/pickups.js`).
- **Nuevo zombi:** añade un tipo en `TYPES` de `js/entities/zombie.js` y su configuración en `zombieConfigs` de `js/entities/models.js`.
- **Nueva arma:** añade su definición en `DEFS` y su modelo en `MODELS` de `js/systems/weapons.js`, y su id en `GUNS`.
- **Nueva skin:** añade una entrada en `SKINS` (`js/systems/weapons.js`) con su paleta y la condición de desbloqueo.
- **Nuevo jefe:** añade una entrada a `BOSSES` en `js/entities/boss.js` y su modelo en `bossConfigs`.
- **Frecuencia de jefes:** `bossEligible()` y `populateNeighbors()` en `js/systems/spawner.js` (piso mínimo 10).

En la consola del navegador puedes acceder a la partida con `VX.game` (p. ej. `VX.game.stats.gold = 999`).
- **Nuevo objeto o decoración:** añade su modelo en `MODELS` y su entrada en `DEFS` de `js/world/props.js` (vóxeles de 1/16 m). Para colocarlo desde una plantilla usa `r.queue('tipo', x, z)`; el decorado general está en `js/world/dress.js`.
