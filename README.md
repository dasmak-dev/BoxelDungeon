# BOXEL DUNGEON

Shooter en primera persona de estilo vóxel con habitaciones procedurales, enemigos destructibles y jefes.

## Cómo jugar
Abre `index.html` con doble clic (Chrome, Edge o Firefox actualizados; necesita WebGL2). No hace falta servidor ni internet.

| Tecla | Acción |
|---|---|
| WASD / flechas | Moverse |
| Ratón | Apuntar |
| Clic izquierdo | Disparar (un clic, un disparo; mantener con la mejora "Gatillo automático") |
| R | Recargar |
| Espacio | Saltar |
| Shift | Correr |
| E | Comprar / recoger / guardar |
| F | Encender / apagar linterna |
| 1 · 2 · 3 / rueda / Q | Cambiar de arma (Q = la anterior) |
| V | Cuchillazo rápido |
| C / clic derecho | Esquivar (impulso corto con invulnerabilidad) |
| Esc o P → Guardar y salir | Suspende la partida (se reanuda una vez; se pierde si mueres) |
| Esc o P | Pausa |

## Características
- **Mazmorra procedural** de salas continuas sacadas de un pool aleatorio: combate, tienda, recompensa, Fuente de almas y jefes. Caminos ramificados: el icono sobre cada puerta indica qué hay detrás.
- **Todo es vóxel y destructible**: las balas abren túneles en los zombis (piernas → se arrastran, brazos → muerden, cabeza → mueren) y rompen paredes hasta cierto punto.
- **8 tipos de enemigo** con comportamiento propio y una horda que te va cercando por turnos. **Jefes "bullet hell"** con fases.
- **3 biomas** (Cripta, Cloacas, Forja) con su jefe, peligros y ambiente.
- **6 armas** + mejoras normales, raras y maldiciones; esquiva; retos opcionales por sala.
- **Progresión permanente**: esencia para el Santuario (bendiciones y arsenal) y skins por arma que se desbloquean con retos.
- Música procedural, sonido posicional, iluminación con linterna y sombras, sin dependencias ni servidor.

Historial completo de cambios en [CHANGELOG.md](CHANGELOG.md). Versión actual: **0.7.0**.

## Publicar en GitHub
```bash
git add .
git commit -m "v0.7.0"
git tag v0.7.0
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
js/world/             Bloques, habitación, pool de habitaciones, mundo (colisión, raycast, destrucción, pathfinding)
js/entities/          Modelos vóxel, cuerpo destructible/gibs, zombis, jefes, jugador, arma, oro y objetos, partículas
js/systems/           Armas y skins, perfil (esencia, desbloqueos), mejoras, generador de salas/enemigos y coordinador de la horda
js/ui/                HUD, Armería, Santuario y pantallas de menú
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
- **Frecuencia de jefes:** `M.randInt(4, 7)` en `js/systems/spawner.js`.

En la consola del navegador puedes acceder a la partida con `VX.game` (p. ej. `VX.game.stats.gold = 999`).
