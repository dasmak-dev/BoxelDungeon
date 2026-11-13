# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).
La versión actual también se ve en la esquina de la pantalla de título (`VX.VERSION` en `js/core/namespace.js`).

## [0.26.0] — 2026-11-13

### Añadido
- **Enemigos nuevos**:
  - **Gordo hinchado**: lento y con mucha vida; al reventar deja una nube de ácido que quema y te frena.
  - **Antidisturbios**: casco y chaleco que paran casi todo el daño de las balas que le llegan de frente. Dale en las piernas, por la espalda, con explosivos o con el cuchillo y el mazo.
  - **Chillón**: no pelea; guarda las distancias y grita. El grito te aturde (te frena un momento) y trae dos o tres zombis más. Grita hasta tres veces.
  - **Cuervos**: llegan volando en bandadas de cuatro o cinco, dan vueltas sobre ti y se lanzan en picado a picotearte.
  - **El Tanque de carne**: jefe de la Horda en la oleada 15 (y 35, 55…). Embiste, aplasta y, cada vez que pierde un 20 % de vida, se le desprenden corredores.
  Todos salen en la mazmorra (según el piso) y en la Horda, tienen su entrada en el Códice y funcionan en cooperativo.
- **Techos vóxel en la mazmorra**: losa de 4 vóxeles de grosor con relieve y decoración propia de cada bioma:
  - Cripta: bóveda con nervios de hueso, calaveras, nichos funerarios, jaulas colgando de cadenas y telarañas.
  - Cloacas: bóveda de ladrillo con musgo, rejillas, tuberías con abrazaderas y goteras.
  - Minas: roca con entibado de madera, vetas de cristal, faroles y estalactitas.
  - Forja: piedra tiznada con vigas de hierro, grietas al rojo y cadenas con garfios.
  - Jardín fúngico: roca con musgo, setas luminosas y raíces colgando.
  - Vacío: roca violeta con vetas y racimos de cristales que brillan.
  - Capillas, templos, salas del trono, salas de jefe y fuentes de almas: **bóveda de crucería alta** tipo catedral, con nervios, claves doradas, plementos azules con estrellas y lámparas colgantes.
  - Tienda: artesonado de madera con lámpara de araña.
- **Cooperativo: cada compañero lleva en la mano el arma que tiene seleccionada** (la misma maqueta que en primera persona).

### Cambiado
- **Explosiones**: la bola de fuego, el destello, el polvo y el humo son ahora bocanadas redondas y difusas (sprites suaves) en lugar de cubos.
- **Niebla permanente en todos los mapas de la Horda**, más cerrada que antes (ciudad, coliseo, base y barco); con el evento de niebla, mucho más.

## [0.25.0] — 2026-11-13

### Añadido
- **Final con huida en la Horda**: desde la oleada 20 (y cada 5 más) aparece una radio de rescate. Al usarla, un helicóptero viene a por vosotros en 90 s: la horda no para hasta que llega. Se ve la zona de aterrizaje (anillo, bengala de humo y columna de luz), el helicóptero llega volando y aterriza, y al subir todos los que siguen en pie se gana la partida con mucha más esencia. El récord del mapa marca si escapaste.
- **Cinco armas nuevas** que se desbloquean en el Santuario (Arsenal) con esencia y luego aparecen en vendedores y botines de jefe:
  - **Recortada** (110): dos cañones, doce perdigones cada uno, a quemarropa.
  - **Ballesta** (120): virote silencioso que atraviesa a cinco zombis.
  - **Lanzallamas** (160): chorro de fuego corto que prende a los enemigos y a veces el suelo.
  - **Ametralladora** (180): cinta de 80 balas, perfora, recarga lenta.
  - **Desintegrador** (280): rayo verde que atraviesa filas enteras y abre boquetes.
  Cada una con su modelo, sonido, munición y las skins de siempre.
- **Cooperativo: si se va el anfitrión, la partida sigue**. El servidor elige otro anfitrión; sus zombis pasan a ser de verdad y la oleada continúa donde estaba. También en la sala de espera. (Hay que volver a desplegar el servidor en Render.)
- **Móvil**:
  - **Apuntado asistido**: sobre un enemigo la mira se frena y se arrastra un poco hacia él mientras mueves el dedo o disparas.
  - **Vibración** al disparar, al dar con el cuchillo o el mazo, al recibir golpes, con explosiones cercanas y al caer en el cooperativo.
  - **Instalable como app** (PWA): icono propio, pantalla completa en horizontal y sin conexión. Botón «INSTALAR EL JUEGO» en el menú; en iPhone explica cómo hacerlo desde Safari.
- **Límite de FPS** en Ajustes: sin límite, 60 o 30 (ahorra batería). La calidad automática lo tiene en cuenta.
- **Sonido en 3D**: gruñidos, golpes, mordiscos, muertes, explosiones y disparos de los compañeros suenan desde donde están (HRTF: se distingue delante, detrás, arriba y abajo), pierden agudos con la distancia y se oyen ahogados si hay una pared en medio.

### Cambiado
- El Arsenal del Santuario se muestra en dos columnas y la lista de armas de la Armería se puede desplazar.

## [0.24.2] — 2026-11-13

### Corregido
- El aviso del servidor del cooperativo se quedaba en «sin respuesta» aunque el servidor estaba funcionando. Ahora comprueba a la vez `/health` y una conexión de prueba por WebSocket (la misma con la que se juega), sigue intentándolo hasta 3 minutos y, si falla, muestra a qué servidor intenta conectar. Pulsando el aviso en rojo se reintenta.

## [0.24.1] — 2026-11-13

### Añadido
- **El servidor del cooperativo se despierta solo**: el juego lo llama nada más abrirse y otra vez al entrar en el menú de la horda, y lo mantiene despierto (cada 4 minutos) mientras estás en ese menú. Junto a los botones del cooperativo se ve su estado: «despertando servidor…» (naranja), «servidor listo» (verde) o «sin respuesta» (rojo).

## [0.24.0] — 2026-11-13

### Añadido
- **Controles táctiles** para jugar en el móvil o la tableta (en horizontal):
  - Cruceta de 8 direcciones a la izquierda; al empujarla más allá del borde hacia delante se corre. Botón CORRER para dejarlo fijo.
  - Apuntar arrastrando el dedo por cualquier parte libre de la pantalla, o desde el propio botón de disparo para disparar y apuntar a la vez.
  - Botones de disparo, salto, esquiva, recarga, cambiar arma, cuchillazo y USAR (se ilumina cuando hay algo cerca; mantenerlo para levantar a un compañero). MIRILLA sólo con el rifle.
  - Fila superior: pausa, linterna, mapa (mazmorra) u oleada (horda) y pantalla completa.
  - Al primer toque pasa a pantalla completa y en horizontal. En vertical pide girar el móvil.
- Ajustes: **Controles táctiles** (automático, siempre o nunca) y **Sensibilidad táctil**.

### Cambiado
- En pantallas táctiles el HUD se recoloca (vida y munición arriba a la derecha) para dejar sitio a los pulgares.
- En el móvil se dibuja a menor resolución interna y la primera vez empieza en calidad media.
- Menús más compactos en pantallas bajas (móvil en horizontal); se pueden desplazar.

## [0.23.1] — 2026-11-13

### Añadido
- **`iniciar-servidor.bat`**: doble clic para arrancar el servidor en red local en Windows. Si no hay Node.js instalado, descarga una copia portable la primera vez (en `server/node`) y abre el juego en el navegador.

### Cambiado
- El cooperativo usa por defecto el servidor de Render `boxeldungeon.onrender.com`: desde GitHub Pages ya no hay que configurar nada.

## [0.23.0] — 2026-11-13

### Añadido
- **Modo Horda cooperativo** para 2 a 4 jugadores:
  - En el menú de la horda: pon tu nombre y **CREAR SALA**, o el código de un amigo y **UNIRSE**. El anfitrión elige mapa y empezáis todos a la vez, en el mismo mapa.
  - El anfitrión lleva las oleadas, los zombis y los jefes; los demás los ven moverse y animarse igual. Cada uno calcula sus propios disparos, así que apuntar no tiene retardo.
  - Los zombis persiguen al jugador más cercano. Los disparos, las granadas, las explosiones y los agujeros en paredes y enemigos se ven en todas las pantallas.
  - Los compañeros se ven como muñecos de colores con arma y su nombre encima; a la izquierda, la lista de jugadores con su vida.
  - **Caído y reanimación**: a 0 de vida caes y te arrastras; un compañero te levanta manteniendo E 2,5 s. Tras 30 s caído mueres hasta la siguiente oleada. Si caéis todos, se acaba la partida.
  - Oro, ventajas, cofres y mejoras son de cada jugador. G (llamar la oleada) funciona para todos.
- **Servidor de salas** (`server/server.js`): Node sin dependencias. Sirve también el juego para jugar en red local, y se puede subir gratis a Render para jugar por internet desde GitHub Pages. Instrucciones en el README.
- Botón ⚙ en la barra cooperativa para indicar la dirección del servidor.

## [0.22.2] — 2026-11-13

### Cambiado
- **Ciudad nocturna y Barco**: bruma permanente suave. Lo lejano se difumina en una niebla algo más clara que el cielo nocturno, pero el perfil de los edificios y del barco se sigue viendo.
- **Evento «Niebla espesa»** en estos dos mapas: mucho más cerrado que en el resto; apenas se ve a 10–12 m durante esa oleada. Al acabar la oleada vuelve la bruma suave.
- Barco: el oleaje se dibuja sólo hasta donde llega la vista.

## [0.22.1] — 2026-11-13

### Cambiado
- **Esqueleto arquero**:
  - Guarda las distancias: retrocede de espaldas sin dejar de mirarte, se mueve de lado y dispara con el arco desde lejos.
  - Si te le echas encima, desenvaina una espada corta y pelea a tajos; cuando te alejas, vuelve al arco.
  - Al acercarse lleva el arco listo y la flecha en la otra mano.
- **Explosiones** más detalladas, según la calidad gráfica (baja, media o alta):
  - núcleo amarillo dentro de la bola de fuego, que parpadea al arder;
  - chispas que salen disparadas en arco dejando un trazo;
  - columna de humo cuya base sigue brillando;
  - quemadura con brasas en el suelo;
  - en calidad alta, una segunda onda de polvo.
- **Ciudad nocturna**:
  - **Fuente**: el agua ya no se sale; ahora es un estanque redondo dentro del pilón, y los chorros caen dentro.
  - **Reflejo del agua**: en calidad alta refleja de verdad la estatua, los árboles y los edificios, con ondas que mueven el reflejo.
  - **Tiendas**: el muro blanco brillante del súper y la farmacia ahora son neveras con puertas de cristal y marcos.
- **Barco**:
  - La lluvia suena mucho más suave y de fondo, y respeta el volumen de efectos.
  - Olas más realistas: tres trenes de ondas, con las losas inclinadas según la pendiente y espuma rompiendo en las crestas.
  - La luz del puente ya no deslumbra.
- **Modo Horda**:
  - Los zombis ya no aparecen encima de muros invisibles ni caen del cielo: siempre salen a la altura del suelo de su punto de aparición.
  - En los mapas pequeños, si no hay ningún punto de aparición a buena distancia, salen por el más lejano.
- **Menús**:
  - La Armería muestra una sola línea de estado («Equipado») para el arma con su forma y color.
  - Los botones de forma y modelo ya no montan el nombre sobre la descripción.
  - En Ajustes, los botones Exportar e Importar ya no se salen de su fila.

## [0.22.0] — 2026-11-13

### Añadido
- **Modelos de pistola** (en la Armería, sección «Modelo»): cambian cómo dispara, no sólo el color.
  - **Desert Eagle** (revienta 75 cabezas): calibre .50, 58 de daño, atraviesa, 7 balas y mucho retroceso.
  - **Revólver** (remata a 2 jefes): seis balas muy precisas que atraviesan; recarga lenta.
  - **Pistola automática** (mata 400 zombis): ráfaga continua, cargador de 22, poco daño por bala.
- **Mirilla del francotirador**: con el rifle, mantener el clic derecho mira por la mirilla. Al apuntar:
  - el zoom cierra el campo de visión;
  - aparece la lente con retícula y punto rojo;
  - el ratón va más fino;
  - la puntería se vuelve casi perfecta;
  - te mueves más despacio y el pulso se balancea un poco.
  - Con el rifle, esquivar queda en la C.
- **Sonido de disparo propio de cada arma**: pistola, Desert Eagle, revólver (con el clic del tambor), pistola automática, subfusil, escopeta, rifle (con eco) y lanzagranadas.

### Cambiado
- **Fuego**:
  - Suena natural: un rumor continuo que respira, según lo cerca y lo grande que sea, con chasquidos de madera; al prender, un «fuuum» suave.
  - Se extiende mucho menos: sólo salta a lo que está pegado y poco a poco, y nunca arden más de cuatro objetos a la vez en una sala.
- **Explosiones**:
  - destello y bola de fuego en varios lóbulos que sube y pasa de blanco a naranja, rojo y hollín;
  - onda expansiva a ras de suelo y columna de humo;
  - chispas, cascotes y brasas;
  - un estampido grave con retumbo.
- **Barco**:
  - **Mar**: oleaje animado con espuma en las crestas, salpicaduras contra el casco y rociones en la proa.
  - **Temporal**: lluvia en trazos inclinados que no entra bajo techo, sonido de lluvia, truenos de verdad y un ligero balanceo.
  - **Luces**: fuera las lámparas que flotaban en los pasillos; ahora hay focos en postes junto a la borda. Las luces del puente y del mástil de proa están apoyadas.
  - **Interiores** decorados:
    - comedor con cocina, fogones, nevera, taquillas, salvavidas, carta náutica y alfombra;
    - sala de máquinas con motor central, tuberías, cuadro de mandos con pilotos, extintores y franjas de seguridad;
    - el puente de mando, con su consola y el timón.
  - Arreglados elementos que se veían a medias: alerones del puente sueltos en el aire, mástil de proa corto y un cofre dentro del motor.
- **Mazmorra: el techo encaja con lo que llega hasta él**:
  - El techo de cada sala está ahora donde terminan paredes, pilares y columnas, así que ya no se quedan cortos a medio metro.
  - Las cadenas, ganchos y lámparas cuelgan del techo de verdad, también en las bóvedas.
  - En las salas con bóveda o artesonado, los pilares y muros que tocan el techo se prolongan hasta él; si se rompen, la prolongación desaparece.
- La Ciudad suena con llovizna.

## [0.21.1] — 2026-11-13

### Cambiado
- **Fuego**:
  - Al jugador sólo le quema mientras está dentro de las llamas o pegado a un objeto que arde; en cuanto se aparta, deja de recibir daño.
  - Las llamas de los coches calcinados y de los bidones también queman a quien se mete en ellas.
  - Los zombis siguen prendiéndose y ardiendo un rato.
- **Karambit**:
  - Nuevo modelo: hoja en media luna que se curva hacia abajo como una garra, con el filo por dentro, mango curvo con remaches y una anilla grande.
  - Animación propia: dos zarpazos en gancho y un giro completo de la hoja alrededor del dedo en la anilla, que pega más fuerte.
  - Al inspeccionarlo, da dos vueltas sobre la anilla.
- **Ciudad nocturna**:
  - Fuera todos los coches, menos los calcinados que arden. El aparcamiento queda vacío, con manchas de aceite, bidones y cajas.
  - Interiores de las tiendas más decorados:
    - paredes revestidas según la tienda (azulejo, madera, mármol o yeso);
    - falso techo, zócalo, carteles, papeles y manchas en el suelo;
    - pizarras y lámparas colgantes en cafeterías, hamburgueserías y bares, más plantas;
    - en el bar, diana y neón; en la farmacia, una cruz verde; en la armería, dianas de tiro; en la tienda de ropa, espejos y maniquíes; en el súper, carteles de ofertas y carros.
  - Iluminación:
    - las luces rotas ya no parpadean sin parar: están apagadas;
    - el fuego parpadea más suave;
    - las máquinas y los cofres secretos no gastan luces.
  - Menos luz en general: la plaza central sigue iluminada (farolas más intensas) y las afueras quedan a oscuras, con la mayoría de farolas apagadas y menos luz de luna y ambiente cuanto más te alejas del centro.
  - Los charcos ya no hacen destellos cuadrados en el suelo.
- **Menú del modo Horda**: las tarjetas de los cuatro mapas muestran capturas del propio juego.

## [0.21.0] — 2026-11-13

### Añadido
- **Máquinas de ventajas** (solo en el modo Horda): cinco máquinas con luz de neón repartidas por cada mapa. Se acercan, se pulsa E y se paga con oro:
  - **Coraza** (120): +50 de vida máxima.
  - **Manos rápidas** (140): recargas un 40 % más rápidas.
  - **Gatillo loco** (160): +30 % de cadencia.
  - **Piernas de liebre** (110): +18 % de velocidad y el impulso se recarga antes.
  - **Último aliento** (200, el precio se dobla con cada compra): una resurrección más.
  - Las ventajas compradas se ven como iconos junto a la vida.
- **Eventos de oleada** (solo en el modo Horda): desde la oleada 3, algunas oleadas (nunca las de jefe) traen un evento que se anuncia en el cartel:
  - **Apagón**: se apagan las farolas y baja la luz.
  - **Niebla**: apenas se ve a 20 m.
  - **Jauría**: perros y corredores.
  - **Estampida**: corredores y trepadores.
  - **Lluvia de flechas**: arqueros y escupidores, algo menos numerosos.
  - **Gigantes**: brutos y escuderos, la mitad de zombis.
  - **Fiebre del oro**: oro doble.
- **Nuevo mapa: Base militar** (112 × 96 m, de noche):
  - muro de bloques en T con alambre de espino, alambrada y cuatro torres de vigilancia con escalera, a las que se sube;
  - hangar abierto con un camión, dos barracones con literas, un búnker de mando con radar y antenas;
  - helipuerto con un helicóptero estrellado en llamas;
  - parque de vehículos con un tanque, jeeps, depósitos de combustible y contenedores apilados (uno abierto);
  - plaza de armas con mástil, nidos de sacos terreros, gaviones y torres de focos;
  - bosque y montañas alrededor.
  - Los zombis entran por la puerta principal y por las brechas de la alambrada.
- **Nuevo mapa: Barco** (portacontenedores de 120 m en plena tormenta):
  - castillo de popa con comedor y sala de máquinas, escaleras a su techo y el puente de mando encima;
  - tres filas de contenedores apilados (algunos abiertos, con cajas para trepar);
  - castillo de proa elevado con cabrestantes y luces de navegación;
  - dos grúas, botes salvavidas y el mar alrededor.
  - Lluvia en diagonal y relámpagos con trueno.
  - Los zombis suben por la borda y salen de las escotillas.
- Música, sonidos y partículas de ambiente propios para los dos mapas nuevos.

## [0.20.1] — 2026-11-13
### Cambios
- **Corredor**: vuelve el zigzag, ahora más natural.
  - Hace curvas amplias y lentas (en vez de tirones), de poco más de un metro a cada lado.
  - Se inclina hacia el lado de la curva.
  - Las curvas se cierran al acercarse y en los últimos metros va recto a embestir.
  - Ya no se da la vuelta sobre sí mismo.

## [0.20.0] — 2026-11-13
### Armas
- **Mazo de demolición** (sustituye al martillo de guerra): mango largo de fibra amarilla con franjas negras y una gran cabeza de acero atravesada. Hace poco daño a los enemigos (40) pero es **brutal con el escenario**: abre boquetes enormes en paredes, suelos y estructuras, y atraviesa los muros.
- **Cuchillo sin mano**: sólo se ve el arma.
- **Formas del cuchillo**, que se desbloquean con misiones y se eligen en la Armería (sección «Forma», junto a los colores):
  - Karambit: 40 bajas a cuchillo.
  - Daga: 3 retos de sala «sólo cuchillo».
  - Machete: 8 élites o campeones a cuchillo.
  - Bayoneta: rematar a un jefe a cuchillo.
  - Navaja mariposa: 150 bajas a cuchillo.

### Enemigos
- **Corredor**: ya no corre en zigzag ni se da la vuelta tras cada ataque. Va directo a por ti, te mira de cerca y esquiva bastante menos.
- **Daño por choque**: si un enemigo se te echa encima a la carrera, también hace daño (no sólo con sus ataques).
- **Animaciones de ataque a distancia**:
  - el arquero levanta el arco y tensa la cuerda hasta la cara antes de soltar;
  - el nigromante alza el bastón cargando energía morada y lo descarga;
  - el escupidor se echa atrás babeando ácido.

### Mazmorra
- Quitado el **mercader errante**.
- **Cajas**: todas huecas por dentro. Hay una **caja grande** de 1 m con esquinas de hierro y se generan bastantes menos cajas.
- **Techos distintos** según el bioma y la sala: bóveda de cañón con arcos, artesonado de casetones, tablones con viguetas, roca con estalactitas (con raíces en el Jardín) o vigas.
- **Las puertas siempre se pueden cruzar**: delante de cada entrada y salida queda un pasillo despejado de 4 × 4 m (comprobado en las 504 combinaciones de sala y bioma).
- **Cofre de la cámara secreta**: se abre con **E**. La tapa sale volando y da oro, un botiquín y una mejora (la mitad de las veces, rara).
- **Escalera al bioma secreto**: ahora se ve de verdad, un foso en el suelo con peldaños que bajan hacia un resplandor violeta. Se baja con E.
- **Monedas**: más grandes y con forma de moneda (disco con canto y relieve). Giran en el aire, **caen al suelo** y se quedan tumbadas. Ya no se quedan flotando contra un obstáculo cuando las atrae el imán.
- **Santuario**: las bendiciones van a dos columnas y todo cabe en pantalla sin desplazarse.

### Modo Horda
- **Munición infinita otra vez.**
- **Cada 3 oleadas**, al azar: llega el vendedor o aparecen **tres mejoras gratis para elegir una**.
- **Coliseo**:
  - ya no se puede salir del mapa por las gradas: son más bajas y el muro de detrás no se escala;
  - además, hay un techo invisible en los mapas grandes;
  - se han quitado los brillos fuertes del suelo (estrado, ruinas y manchas).
- **Ciudad**:
  - luz de luna que ilumina de lado las fachadas, que ya no se ven negras;
  - fachadas algo más claras;
  - una **fila continua de edificios** detrás del perímetro para que no se vea el vacío;
  - un edificio que cierra el final de cada calle de salida.

## [0.19.0] — 2026-11-12
### Ciudad nocturna, rediseñada
- Nueva distribución con una **gran plaza central**: fuente sobre tres escalones con una estatua, ocho árboles detallados (raíces, ramas y copa en racimos) en alcorques, bancos de listones con respaldo, farolas de dos globos, un templete de música elevado, quiosco, parterres y bolardos.
- Cuatro manzanas alrededor de la plaza con **fachadas de vóxel más detalladas**: zócalo, pilastras, escaparates con montantes, rótulos de neón, cornisa y toldos. Tiendas nuevas: **bar** (con billar y botellero) y **tienda de ropa**. Un **aparcamiento** abierto con coches dentro.
- Las plantas altas tienen **estilos**: ladrillo con escaleras de incendios, piedra con pilastras y alféizares, oficinas de cristal y bloques modernos con balcones. Además hay carteles luminosos, depósitos de agua y antenas en las azoteas.
- **Cristales transparentes**: escaparates, vestíbulos, marquesinas y coches dejan ver el interior.
- **Se ve el piso detrás de cada ventana**: habitaciones con profundidad, muebles, cortinas, luz encendida o apagada y el brillo de alguna tele.
- **Menos coches** y un **autobús en el que se puede entrar**, con asientos, barras y las puertas abiertas.
- **Ambiente más oscuro**: menos ventanas encendidas, niebla más cerrada y más farolas apagadas.

### Nuevo mapa: Coliseo
- Interior de un coliseo romano al anochecer. Empiezas en el centro de la arena, junto a un obelisco.
- **Varios niveles de altura**:
  - el podio de 4 m con su paseo, al que se sube por cuatro escalinatas;
  - las gradas en escalones, por las que se puede correr;
  - el palco imperial y las ruinas de un templo elevadas.
- En la arena hay:
  - una galería de tiro con arco con dianas y flechas clavadas;
  - muñecos de entrenamiento, armeros con lanzas y escudos;
  - jaulas de fieras, empalizadas, un carro volcado, fardos de paja y braseros.
- Los zombis salen por las cuatro puertas y por las trampillas del hipogeo.
- Por encima del muro, las gradas altas, el ático con arcos, los mástiles del velario y antorchas.
- Música propia.

### Arreglos
- Un zombi que bajaba de un coche (o al que le caían escombros encima) podía quedarse metido dentro del bloque sin moverse. Ahora, si un enemigo queda atrapado dentro de algo sólido, sale al hueco libre más cercano.

### Rendimiento
- El decorado de los mapas grandes se divide en zonas y sólo se dibuja lo que se ve.
- La distancia de dibujo se ajusta a la niebla de cada mapa.

## [0.18.0] — 2026-11-12
### Nuevo: Modo Horda
- Nuevo modo en el menú principal: **oleadas infinitas** en mapas grandes. Eliges el mapa antes de entrar y cada mapa guarda tu récord de oleadas.
- Antes de cada oleada se avisa de **cuántos zombis vienen**. Salen por las alcantarillas y por las barricadas, lejos de ti, y hay un máximo de zombis a la vez. El HUD muestra cuántos quedan y hacia dónde están los últimos.
- **La munición no es infinita** en este modo: cada arma tiene su reserva. Los enemigos sueltan cajas de balas al azar (más a menudo cuando vas justo) y hay **cajas de suministros** en los edificios (munición, oro y a veces una mejora).
- **Vendedor cada 3 oleadas**, con una columna de luz que se ve desde toda la ciudad: mejoras, botiquín, a veces un arma y **munición completa** (sólo en este modo). Se marcha cuando empieza la siguiente oleada.
- **Campeón cada 5 oleadas y jefe cada 10.** Entre oleadas recuperas algo de vida y oro.
- [G] llama ya a la siguiente oleada. La esencia que ganas depende de las oleadas superadas.
- Si te subes a un coche, los zombis trepan a por ti.

### Mapa: Ciudad nocturna
- Ciudad de 120 × 120 m, de noche, con llovizna: **rascacielos** con ventanas encendidas, avenidas con pasos de cebra, **coches** aparcados y abandonados (taxis, coches de policía con sirena, chatarra en llamas), **farolas altas** que se apagan si les disparas, semáforos, **paradas de autobús**, papeleras, bocas de riego y un parque con fuente, árboles y quiosco.
- **Se puede entrar en los edificios**: los escaparates y las puertas de cristal estallan enteros, las persianas metálicas se revientan y las paredes se pueden atravesar a tiros. En los rascacielos sólo se llega al vestíbulo de doble altura y a la entreplanta (escalera, recepción, ascensores y oficinas). Hay supermercado, cafetería, farmacia, armería y hamburguesería.
- Las salidas están cortadas por barricadas (barreras de hormigón, sacos terreros, un autobús, coches de policía y bidones ardiendo). Detrás, la calle sigue hasta perderse en la niebla.
- Música propia de sintetizador para la ciudad.

### Cambios
- **Las salas de jefe son siempre grandes**: antes, si estaban detrás de una puerta lateral, quedaban recortadas al fondo de la sala anterior.
- Las pantallas bajas muestran el menú principal entero.
- Rendimiento: en mapas grandes, la sombra de la linterna sólo calcula lo cercano.

## [0.17.0] — 2026-11-12
### Rediseños
- **Puertas** rediseñadas: ocupan todo el hueco, de doble hoja de madera con bandas, bordes, remaches y tiradores de hierro.
- **Fuego** de nuevo: ahora es un volumen de vóxeles con ruido que forma lenguas que suben, se estrechan y se desprenden, con el color graduado por calor (blanco-amarillo, naranja, rojo).
- **Cuchillo**: mano nueva (dedos que rodean el mango, pulgar, nudillos, muñeca y puño), que se mueve rígida con la hoja. Solo **3 ataques** en ciclo: tajo, revés y estocada, con movimientos más contenidos para que la mano se vea bien en todos.

### Nuevo
- **Sinergias**: 10 combinaciones de mejoras con efecto extra (Napalm, Metralla, Brasas, Cadena, Pistolero, Billar, Tirador, Fiebre, Tanque, Cohete). Se anuncian al conseguirlas y se guardan con la partida.
- **Arquero esqueleto** (dispara flechas que se quedan clavadas) y **Nigromante** (orbes que te persiguen y levanta a los muertos de la sala).
- **Campeones**: desde el piso 6, algunas salas tienen un enemigo élite enorme con ojos dorados, aura y barra propia. Al morir deja una mejora rara y oro.
- **Zombis que se arrastran** más a menudo: al romperles una pierna o al dispararles a las piernas cuando están malheridos.
- **Agua** en las Cloacas (y a veces en el Jardín): charcos que te frenan a ti y a los enemigos y apagan el fuego.
- **Sala del cartógrafo**: sala aleatoria poco frecuente con una mesa de mapas. Al estudiarla ves el tipo de las salas dos puertas por delante y las grietas secretas durante 9 salas.
- **Mapa [M]**: tu recorrido del piso y a dónde llevan las puertas de la sala actual.
- **Marcas permanentes**: agujeros de bala en las paredes y quemaduras en el suelo tras explosiones y fuego.

### Cambios
- **Las salas especiales no se repiten**: tras un vendedor, una recompensa o una sala de curación, las siguientes salas son de otro tipo.
- **Más retroceso y dispersión** en todas las armas (+60 % de retroceso vertical, +30 % de dispersión): al principio se notan torpes.
- Nuevas mejoras permanentes con esencias: **Pulso firme** (−12 % de retroceso por nivel, hasta 4) y **Puntería** (−10 % de dispersión por nivel, hasta 3).

### Arreglos
- Un campeón esqueleto ya no se recompone (perdía la recompensa y la barra).

## [0.16.0] — 2026-11-12
### Fuego
- **Llamas de vóxeles de verdad**: lenguas de fuego que ondulan, con la base amarilla, el cuerpo naranja y las puntas rojas que se desprenden. Brasas en el suelo, pavesas y humo. Arden así el suelo, los objetos y los enemigos.
- La luz del fuego **parpadea** con las llamas y los objetos de madera **se ennegrecen** mientras arden.

### Física de la destrucción
- **Los trozos caen enteros**: si rompes lo que sujetaba la parte de arriba de un objeto, esa parte cae de una pieza y **se queda en el suelo** como un objeto nuevo, que puedes seguir rompiendo o quemar. Sólo lo frágil (cristal, barro) o lo que cae desde muy alto se hace añicos.
- **Derrumbes del escenario**: si rompes la base de un pilar, una columna, un arco o un muro, lo que queda sin apoyo **se viene abajo**. Lo alto y estrecho **se vuelca** hacia el lado con más hueco y se queda tumbado en el suelo. Levanta polvo, hace estruendo y **aplasta** a quien pille debajo. Los árboles grandes también pueden caer.

### Enemigos
- Los **zombis recuperan su aspecto original**, con más detalle: proporciones clásicas de cajas, piel verde, camisa turquesa y pantalón morado. Llevan mandíbula que se mueve, desgarros, heridas, rodillas gastadas, costuras y puntera en el zapato. Las variantes (corredor, escupidor, explosivo, escudero, trepador, bruto, minero, ígneo, esporado) siguen el mismo estilo.
- **Piernas rehechas**: rectas y naturales, sin espinillas finas ni pies desproporcionados.
- **Esqueleto**: brazos nuevos, huesos de 2×2 con cabeza del húmero, codo, muñeca y dedos.
- **Esqueletos equipados**: cuanto más bajas, más llevan **casco de hierro**, hombrera, **rodela** y espada. El casco y la rodela **paran las balas**: se abollan con cada impacto hasta romperse y caer.

### Puertas y salas secretas
- **Rastrillo simétrico**: dos pares de barrotes en espejo y travesaños.
- **Las puertas se abren con E**: acércate y pulsa E («Puerta — Sala infestada / Vendedor / ¡JEFE!…»).
- Al entrar en una sala, el rastrillo **cae a tu espalda** con un golpe seco, polvo, chispas y temblor.
- **La grieta de las cámaras secretas va a ras de la pared**: el hueco está excavado dentro del muro y desde la sala sólo se ve un trozo de pared con ladrillos agrietados.

### Armas
- **Martillo de guerra** (nuevo, en el Arsenal por 80 de esencia y luego en las tiendas). Alterna un **mazazo** de arriba abajo, que aturde y revienta el suelo y las paredes, con un **barrido** lateral que lanza lejos a todos los que tengas delante. Lento y brutal.
- **Animación del cuchillo**: ahora el brazo acompaña el tajo, la estocada y el golpe de arriba abajo, y la hoja sigue girando sobre la empuñadura.

## [0.15.0] — 2026-11-12
### Iluminación
- **Resplandor (bloom)**: antorchas, ojos de los enemigos, magma, cristales, setas y disparos irradian luz. Desactivable en Ajustes.
- **Oclusión ambiental**: los rincones, la base de las paredes y el suelo bajo los objetos se oscurecen de forma natural (calidad alta; desactivable).
- **Luz de color por bioma**: antorchas anaranjadas en la Cripta, verdosas en las Cloacas, amarillas en las Minas, rojas en la Forja, turquesas en el Jardín y violetas en el Vacío (luz y llama).
- Viñeta suave en los bordes de la pantalla.

### Materiales y escenarios
- **Materiales brillantes**: el metal, el hierro, el oro, los barrotes y los charcos reflejan las luces; la piedra no.
- **Charcos** en el suelo de las zonas húmedas (Cloacas, Jardín, Cripta) que reflejan las antorchas.
- **Paredes con desgaste**: variaciones de tono a gran escala, musgo en las juntas de abajo y chorretones de humedad que bajan desde el techo.
- **Partículas de ambiente**: polvo flotando en la Cripta, goteo del techo en las Cloacas, arenilla en las Minas, ceniza y pavesas en la Forja, esporas luminosas en el Jardín y motas en el Vacío.
- **Nueva sala: El gran árbol**: un árbol gigante con raíces por el suelo y ramas hasta el techo. Es distinto en cada bioma: muerto y con jaulas colgando en la Cripta, con copa luminosa en el Jardín, cristalizado en el Vacío y petrificado en las Minas. Es destructible.

### Sonido
- **Sonidos de ambiente situados en la sala** (se oyen desde un punto y con dirección): goteos, cadenas, crujidos, viento, gemidos, derrumbes de piedras, burbujeo, martillos lejanos, susurros y campanillas, según el bioma.
- **Reverberación según el tamaño de la sala**: las salas grandes resuenan, las pequeñas suenan secas.
- **Pasos según el suelo**: piedra, madera, charco, hueso, metal, tierra y cristal.

### Armas
- **Retroceso real**: cada disparo sube la mira y la desvía un poco a un lado; si mantienes el gatillo (subfusil), el arma sube cada vez más y la dispersión crece. Al soltar, la mira vuelve sola en parte.
- Nuevas mejoras: **Empuñadura firme** (-30 % de retroceso, en el bote normal) y **Freno de boca** (-25 % de retroceso y -15 % de dispersión, en la tienda tras desbloquearlo en el Santuario por 55 de esencia). El HUD muestra el retroceso reducido.

### Equilibrio
- **Enemigos según el tamaño de la sala**: el número depende de la superficie transitable y la densidad sube poco a poco con el piso (con un tope). Las salas pequeñas ya no se llenan de zombis. Las manadas de ratas también son menores en salas pequeñas.
- **La Fuente de almas es más rara**: menos probable y nunca a menos de 6 salas de la anterior. Tras un jefe, la segunda salida es una Fuente sólo si hace tiempo que no visitas una (si no, Recompensa).

### Correcciones
- Los trozos que saltan al romper objetos ya no se quedan **flotando y girando** encima del objeto: ignoran la colisión invisible del objeto, dejan de girar al posarse y se desvanecen antes.
- El jefe que **salta** ya no puede aterrizar fuera de la sala ni dentro de una pared: el punto de aterrizaje se ajusta a una zona libre de la sala, y si por cualquier motivo acaba fuera, vuelve a ella.

## [0.14.0] — 2026-11-12
### Enemigos rediseñados
- **Siluetas esculpidas**: se acabaron los cuerpos de cajas. Cráneos redondeados, torsos con cintura y hombros caídos, espinillas más finas que los muslos, pies que sobresalen y brazos con antebrazo propio (fino en los famélicos, de gorila en el bruto).
- **Mandíbula articulada**: los zombis gruñen abriendo y cerrando la boca y la abren del todo al morder; se puede arrancar a tiros.
- **No hay dos iguales**: cada individuo tiene su propia semilla (heridas, manchas, ropa, pelo, ojo vacío, desgarro en la mejilla, tripas colgando…).
- **Caminante**: camisa con botones y desgarros, herida abierta en el costado con costillas a la vista, a veces descalzo o con las tripas fuera.
- **Corredor**: famélico y encorvado, costillas marcadas, garras, melena sucia y ojos rojos.
- **Escupidor**: encorvado, con una **bolsa de ácido brillante** en la garganta y babeando.
- **Explosivo**: **barriga hinchada** con pústulas y venas incandescentes.
- **Escudero**: peto de chapas remachadas, **yelmo con visera** (los ojos brillan por la ranura), hombrera y escudo reforzado.
- **Trepador**: pálido y alargado, brazos larguísimos con garras y **vértebras saliendo por la espalda**.
- **Bruto**: enorme, con **joroba llena de púas de hueso**, grilletes, puntos de sutura y antebrazos gigantes.
- **Esqueleto** rehecho desde cero: fémur, rótula, tibia y peroné, cúbito y radio, falanges, pelvis en cuenco, costillas curvas con esternón, cuello de vértebras, cráneo hueco con cuencas profundas y pómulos, ojos de luz al fondo y un **alma que brilla dentro del pecho**. Lleva taparrabos raído y a veces casco, hombrera y **espada oxidada**.
- **Ígneo**: carne carbonizada con **grietas de magma** y **llamas** en la cabeza y los hombros.
- **Minero**: casco con **lámpara**, barba, delantal y un pico a su medida.
- **Esporado**: un **sombrero de seta gigante** con motas luminosas y setas brotándole de la espalda.
- **Perro y rata**: hocico, orejas, cola (la de la rata, larga y rosada) y costillas al aire. **Mímico**: hilera de dientes, lengua y tapa que se abre.
- Los jefes heredan las siluetas nuevas y ganan mandíbula, joroba, llamas o casco según el jefe.
- Si vuela la cabeza, lo que cuelga de ella (mandíbula, casco, pelo, seta) cae también.

### Interfaz
- Las **flechas con la distancia (m) a los últimos enemigos** quedan **desactivadas por defecto**; se pueden activar en Ajustes.

### Técnico
- Los cuerpos sólo recalculan cada fotograma la posición de los vóxeles de superficie; el interior se calcula al cortar. Permite modelos con más del doble de detalle sin coste extra.

## [0.13.0] — 2026-11-12
### Controles
- El **cuchillazo rápido** vuelve a la **V** y **inspeccionar el arma** pasa a **Ctrl** (ambas siguen siendo configurables; los ajustes antiguos se migran solos).

### Biomas y progresión
- **5 biomas + 1 secreto**: Cripta, Cloacas, Minas, Forja y Jardín fúngico, más **El Vacío**. Siempre empiezas en la Cripta; el orden de los otros cuatro es aleatorio en cada partida.
- Las salas se generan **al azar dentro del pool de su bioma**: cada escenario sólo sale en los biomas donde tiene sentido (vetas de cristal y galerías mineras en las Minas, bosques de hongos en el Jardín, etc.).
- **Jefes a partir del piso 10**: antes no puede salir ninguno. Desde el piso 10, cualquier puerta de combate puede convertirse al azar en la de un jefe (garantizado si llevas muchas salas sin jefe).
- **Jefe final y modo infinito**: tras derrotar a los 5 jefes de bioma aparece **El Corazón de la Mazmorra**. Al vencerlo ganas esencia extra y la mazmorra vuelve a empezar, más dura (vuelta 2, 3…).
- **El Vacío (secreto)**: en cualquier sala de combate puede haber una **pared agrietada con una escalera** detrás. Bajas [E] a 3 salas del Vacío y su guardián; después vuelves a tu bioma.

### Salas nuevas
- Formas nuevas: **salón en cruz, sala en U, sala en zigzag (N), pasillo muy largo y galería con balcón** (un segundo nivel con escaleras y barandillas).
- Del bioma: galería minera (raíles, vagonetas, entibado con farolillos), veta de cristal, bosque de hongos, cueva de esporas y santuario del vacío. Charcos nuevos: **esporas venenosas** y **vacío**.

### Eventos de sala
- **Emboscada**: la sala parece vacía… hasta que salen del suelo a tu alrededor (con oleada extra).
- **Mercader errante**: al despejar algunas salas aparece un vendedor con dos mejoras rebajadas.
- **Cofre misterioso** en las salas de recompensa: puede guardar una mejora (a menudo rara) y oro… o ser un **Mímico** que, al morir, escupe su tesoro.

### Enemigos
- **Esqueleto** rehecho: pelvis, columna, costillas con huecos, articulaciones y un cráneo hueco con mandíbula, dientes y ojos brillantes.
- **Zombi** con ropa hecha jirones, pelo ralo y mandíbula rota.
- Nuevos enemigos de bioma: **Minero** (pico y lámpara en el casco que ilumina) y **Esporado** (revienta en una nube venenosa al morir). Nuevo **Mímico**.

### Jefes: cada uno pelea a su manera
- **El Coloso Putrefacto** (Cripta): **salta** sobre ti con onda de choque (hasta 3 saltos seguidos), golpe en el suelo, lanza rocas y levanta esqueletos.
- **El Ancestro Hueco** (Cloacas): el *bullet hell* de siempre, flotando: espirales, lluvia y calaveras teledirigidas.
- **El Capataz** (Minas, nuevo): lanza **cartuchos de dinamita** que chisporrotean antes de explotar, provoca **derrumbes** de rocas desde el techo y hace barridos con el pico.
- **El Carnicero** (Forja): te **engancha con una cadena** y te arrastra hasta su **cuchilla giratoria**.
- **La Reina Micelio** (Jardín, nueva, a cuatro patas): **pare crías** en sacos que revientan, suelta **nubes de esporas** y hace brotar **raíces** bajo tus pies (con aviso en el suelo).
- **El Guardián del Vacío** (secreto): **rayos giratorios** que barren la sala, teletransporte y orbes.
- **El Corazón de la Mazmorra** (final): mezcla los ataques de todos.

### Presentación
- **Sombras de las antorchas**: la antorcha más cercana proyecta sombras de verdad (calidad alta; desactivable).
- **Polvo en el haz de la linterna** (desactivable en Ajustes).
- **Música por bioma**: cada uno tiene tono, tempo y una capa propia (campana en la Cripta, goteos en las Cloacas, picos en las Minas, yunque en la Forja, campanillas en el Jardín, disonancias en el Vacío).

### Técnico
- **Calidad automática**: si los FPS caen por debajo de ~42 de forma sostenida baja un escalón, y vuelve a subir si sobra rendimiento (nunca por encima de la que elegiste).
- **Exportar / importar el perfil** (esencia, Santuario, armas, skins, códice) a un archivo `.json` desde Ajustes.

## [0.12.0] — 2026-11-12
### Controles
- La **linterna** vuelve a la **F**.
- **Teclas configurables** en Ajustes: linterna (F), inspeccionar arma (**V** por defecto) y cuchillazo rápido (**X** por defecto). Si eliges una tecla ya usada por otra acción, se intercambian. Los textos de ayuda muestran siempre tus teclas.

### Cuchillo
- Nueva animación: la mano apenas se mueve y es la **hoja la que gira sobre la empuñadura** (tajos de muñeca, estocada con giro y golpe de arriba abajo levantando la hoja). En la inspección, el cuchillo da la voltereta en la mano.

### Iluminación
- **Muchas menos antorchas**: una cada ~11 m de pared (antes cada 6 m) y algunas faltan al azar. De media hay unas 3-4 por sala.

## [0.11.0] — 2026-11-12
### Más oscuridad
- Entre un 28 % y un 50 % de las salas de combate (más cuanto más bajas) están **a oscuras**: sin antorchas en las paredes, sólo con tu linterna (aviso al entrar).
- La luz ambiente y el relleno alrededor del jugador se reducen todavía más.

### Puertas
- Las salidas se abren cuando estás **mucho más cerca** (menos de 2 m).
- **Animación de rastrillo**: los barrotes suben hacia el muro con chirrido de cadenas, polvo y un golpe final.

### Armas
- **Cuchillo con combo**: tajos alternos a izquierda y derecha, una **estocada** (×1,5 de daño) y un golpe **de arriba abajo** (×1,3), además de un ligero balanceo en reposo.
- **[F] Inspeccionar el arma**: la acercas, la giras para ver un lado y el otro (el cuchillo da una voltereta en la mano). Se cancela al disparar, recargar o cambiar de arma.
- La **linterna** pasa a la tecla **L**.

## [0.10.0] — 2026-11-12
### Una estructura reconocible por sala
- Salas nuevas: **Comedor de guardia** (mesas largas con sillas y chimenea), **Herrería** (gran horno, yunques y armeros), **Río de lava / Canal de ácido** (un río cruza la sala; se pasa por puentes de piedra con pretil), **Sala del trono** (estrado, trono, estatuas y alfombra) y **Laboratorio del alquimista** (calderos burbujeantes, mesas llenas de redomas).
- La Columnata usa columnas clásicas (basa, fuste y capitel) y el Matadero, jaulas colgantes.

### El escenario como arma
- **Física de destrucción**: si un trozo grande se queda sin apoyo cae entero y **aplasta** lo que haya debajo (lámparas de araña, jaulas colgantes, cajas apiladas…). Dispara a la cadena para dejarla caer sobre los zombis.
- **Fuego, aceite y ácido**: la madera y la tela arden, se consumen y propagan el fuego; los barriles de madera rotos derraman **aceite** que se prende con explosiones, balas incendiarias o zombis en llamas; el ácido de los escupidores corroe los objetos.
- **Cámaras secretas**: algunos muros de ladrillo **agrietado** esconden un hueco con un cofre (oro y corazón) y a veces una mejora rara.

### Enemigos de bioma
- **Esqueleto** (Cripta): se recompone una vez si no le rompes el cráneo.
- **Rata gigante** (Cloacas): rápidas, en manada.
- **Ígneo** (Forja): inmune al fuego, deja brasas a su paso y estalla en llamas al morir.

### Códice y récords
- Nuevo **Códice** en el menú: bestiario con bajas por enemigo, mejoras descubiertas y la mejor partida.
- Puntuación al terminar cada partida (piso, bajas, jefes, oro y secretos) con aviso de **nuevo récord** y tiempo de partida.

### Ambientación
- Iluminación mucho **más oscura**: la linterna (más potente y con un leve titileo), las antorchas, los braseros y las lámparas mandan.
- **Techos más altos** según el bioma (y aún más en la Capilla, la Sala del trono y las guaridas de jefe).

### Puertas
- Las salidas de una sala despejada ya no se abren solas: se abren **al acercarte**, y en ese momento se prepara lo que hay detrás (el vendedor, el altar…), así nunca ves la sala vacía.

### Rendimiento
- Los objetos intactos de cada zona de la sala se dibujan juntos en un solo lote; sólo los que dañas pasan a tener lote propio. Las estanterías y estatuas fusionan sus vóxeles en vertical.

## [0.9.0] — 2026-11-12
### Progresión
- **Mercancía de la tienda** en el Santuario: Bandolera, Botiquín de campaña, Imán de oro, Piernas de gato y Doble impulso ya no salen de serie; se desbloquean con esencia y a partir de entonces pueden aparecer a la venta en las tiendas (sólo en tiendas).
- **Esencia más escasa**: se gana bastante menos por partida (piso, jefes y bajas) y la ofrenda de las Fuentes de almas da menos y cuesta más. Las bendiciones y el arsenal son más caros.

### Todo se rompe
- Telarañas, cadenas, estandartes, velas, huesos, charcos, vigas y postes también se pueden destrozar.
- Los objetos ya no revientan de golpe al llegar a cierto daño: se rompen vóxel a vóxel tanto como quieras. Lo que se queda sin apoyo se cae a trozos (lo de arriba de un barril, una cadena cortada, lo que había encima de una mesa…).
- Las balas atraviesan lo blando (telarañas, paja, charcos, alfombras) rompiéndolo a su paso.
- Los objetos sólidos ya no se pueden usar de escalón (los zombis se subían a los bancos y se atascaban).

### Salas más variadas y reconocibles
- Cada tipo de sala tiene su propio tema de decorado. Las lápidas sólo aparecen en la Cripta.
- **Capilla**: techo de 7 m, columnas gruesas, alfombra hasta el altar, bancos orientados hacia él, estatua, vidrieras de colores y lámparas de araña (siempre se entra por el lado opuesto al altar).
- Los "muros aleatorios" se sustituyen por estructuras reconocibles:
  - **Templo en ruinas**: columnata con columnas partidas, tambores caídos por el suelo y estatuas de caballeros.
  - **Claustro**: fuente central, arcada de columnas y árboles secos en parterres.
  - **Galería de arcos**: muros con arcos de medio punto.
  - **Barricadas**: filas de estacas de madera, sacos y cajas.
- Biblioteca con lámparas de araña; Matadero con muchos ganchos; Celdas con paja; Polvorín lleno de barriles rojos…

## [0.8.0] — 2026-11-12
### Escenarios con detalle
- **Objetos de vóxel fino** (1/16 m, cuatro veces más pequeños que el mundo): ahora se reconocen de un vistazo.
  - Destructibles (las balas los van agujereando hasta que revientan, a veces sueltan oro o un corazón): barriles de madera con flejes, **barriles explosivos** rojos con franjas de peligro (al dañarlos se enciende la mecha y estallan en cadena), cajas, vasijas de barro, sacos, lápidas, sarcófagos, estanterías con libros, mesas y bancos de capilla.
  - Decoración: velas, calaveras y huesos, escombros, charcos, paja, cadenas y ganchos colgando del techo, telarañas en las esquinas, estandartes, armeros, tuberías (cloacas), yunques (forja) y braseros de hierro.
- **Ambientación de mazmorra**: muros de piedra gris con zócalo de sillares, entibado de madera (postes y vigas en el techo) y cada sala se "viste" según su tipo y bioma (la Cripta con sarcófagos, lápidas y velas; la Bodega con barriles y estanterías; la Biblioteca con estanterías de libros; la Capilla con bancos; las Celdas con paja y huesos…).

### Sensación al recibir daño
- Indicador rojo de la **dirección** del golpe, **salpicaduras de sangre** en los bordes de la pantalla, número de daño junto a la barra de vida (que tiembla), sacudida y ladeo de cámara y un breve **parón de impacto**.
- Golpe sordo y pitido de oídos en los golpes fuertes; con poca vida se oye el **latido** y el mundo pierde color.
- Opción en Ajustes para desactivar los efectos de pantalla.

### Calidad de vida
- Mejoras nuevas: **Doble impulso** (cargas de esquiva, hasta 3), **Piernas de gato** (la esquiva recarga antes), **Bandolera** y **Botiquín de campaña** (curas al despejar sala). El **Imán de oro** ahora indica su radio (+3 m) y el radio base es mayor.
- Al despejar una sala, el oro que quede en el suelo vuela hacia ti.
- Si quedan 3 enemigos o menos durante un rato, unas flechas indican dónde están.
- Ajuste **Correr siempre** (Shift para andar).

### Arreglos
- Las púas ahora bajan con animación (antes desaparecían de golpe).

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

[0.12.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.12.0
[0.11.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.11.0
[0.10.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.10.0
[0.9.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.9.0
[0.8.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.8.0
[0.7.0]: https://github.com/USUARIO/BoxelDungeon/releases/tag/v0.7.0
