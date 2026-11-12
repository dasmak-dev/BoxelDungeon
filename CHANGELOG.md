# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).
La versión actual también se ve en la esquina de la pantalla de título (`VX.VERSION` en `js/core/namespace.js`).

## [0.7.0] — 2026-11-12
### IA de los enemigos
- **Cerco por turnos**: sólo unos pocos zombis (2–5 según el piso) atacan a la vez; el resto espera en un anillo alrededor del jugador que se va cerrando poco a poco. Los que llevan más rato esperando tienen prioridad para el siguiente turno.
- **Movimiento más natural**: aceleración e inercia, giro progresivo hacia donde caminan, caminos "estirados" (van en línea recta cuando pueden en lugar de en zigzag de rejilla), hacen cola y rodean a los compañeros en vez de empujarse, y los cuerpos ya no se atraviesan.
- **Cada enemigo con su comportamiento**:
  - *Caminante*: arrastra los pies y se tambalea; forma el grueso del cerco.
  - *Corredor*: entra en zigzag, golpea y se retira.
  - *Bruto*: se prepara y **embiste** en línea recta; si choca contra una pared se queda aturdido (y la rompe).
  - *Escupidor*: mantiene la distancia, se mueve de lado y retrocede si te acercas.
  - *Explosivo*: va directo a por ti y esprinta al final.
  - *Escudero*: primera línea; siempre te encara y te empuja con el escudo.
  - *Trepador*: intenta atacar por la espalda y **salta** sobre ti.
  - *Perro*: ronda en círculos y se lanza a morder; luego se aparta.
- **Arreglado**: los zombis se quedaban atascados en los escalones del relieve (su "huella" no tenía en cuenta los bordes del cuerpo y el escalón de al lado).

### Progresión
- **Skins por arma**: cada arma (y el cuchillo) tiene sus propios retos: matar X zombis con ella, cabezas, élites, rematar jefes y llegar a cierto piso llevándola. La Armería muestra el progreso de cada una. Las skins ya desbloqueadas en versiones anteriores se conservan para todas las armas.
- **Arsenal** en el Santuario: el subfusil, la escopeta, el rifle y el lanzagranadas se desbloquean con esencia. Sólo las armas desbloqueadas aparecen en las tiendas y en el botín de los jefes, y puedes elegir cualquiera como arma inicial.
- **Bendiciones nuevas**: Regateo (tienda más barata), Imán (oro desde más lejos), Legado (empiezas con mejoras) y Segunda oportunidad (revives una vez por partida).

### Guardado (estilo roguelite)
- **Guardar y salir** desde la pausa: suspende la partida y la reanuda en una sala tranquila. La partida suspendida se borra al cargarla y al morir. Si sales en mitad de un combate, esa sala se repite.
- **Abandonar partida** cuenta como muerte (se gana la esencia).
- Las salas de guardado pasan a ser **Fuentes de almas**: un cristal para descansar (+35% vida) y una pila de **ofrendas** para cambiar oro por esencia (ganada en el momento, aunque luego caigas).

### Otros
- Número de versión en la pantalla de título y en los datos de guardado.

## [0.6.0]
- Enemigos nuevos: explosivo, escudero, trepador y perros zombi. IA que flanquea, esquiva y evita peligros.
- Sensación de disparo: vibración por arma, sangre en suelo y paredes, sonido de salida de bala.
- Mejoras raras (fuego, rebote, robo de vida, cadáveres explosivos) y maldiciones.
- Biomas con su jefe: Cripta, Cloacas (ácido) y Forja (lava).
- Esquiva (C / clic derecho), retos opcionales por sala, Santuario con esencia, sonido ambiente y descarte por frustum.

## [0.5.0]
- Salas nuevas (púas, polvorín, bodega, capilla, celdas, matadero), barriles explosivos y braseros.
- Relieve más suave; zombis que se deshacen en trozos al morir; tienda siempre de frente.
- Arreglado el altar de recompensa vacío. Quitado el minimapa.

## [0.4.0]
- Armas comprables y botín de jefes (subfusil, escopeta, rifle, lanzagranadas) + cuchillo siempre a mano.
- Armería con skins desbloqueables. Jefes "bullet hell" con 3 fases que no mueren por la cabeza.

## [0.3.0]
- Caminos ramificados con iconos sobre las puertas, relieve en el suelo, dificultad progresiva.
- Animaciones suaves (caída al arrastrarse, partir en dos), luces sin "popping".

## [0.2.0]
- Vóxeles más pequeños, pistola inicial, iluminación realista, salas más grandes.
- Daño localizado (piernas → se arrastran, brazos → muerden, cabeza → mueren) y agujeros que atraviesan.
- Música procedural, pantalla de título, ajustes y salas de guardado.

## [0.1.0]
- Primera versión: shooter vóxel en primera persona con salas procedurales (combate, tienda, recompensa, jefe), zombis destructibles, paredes destructibles y oro.

[0.7.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.7.0
