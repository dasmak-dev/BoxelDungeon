# Historial de versiones

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [versionado semántico](https://semver.org/lang/es/).
La versión actual también se ve en la esquina de la pantalla de título (`VX.VERSION` en `js/core/namespace.js`).

## [0.61.2] — 2026-11-17

- Las llaves de arriba a la izquierda ahora son llaves de verdad (anilla, tija y dientes) del color de cada una; también en el mapa.
- Salas más limpias: fuera los escombros, huesos, calaveras y paja sueltos por el suelo. Los pocos montones que quedan van arrimados a los muros y las esquinas; el centro de la sala queda despejado.
- Menos montones junto a las paredes y más separados; charcos sólo de vez en cuando.
- Piezas con sentido en su sitio: en la cripta, hileras de lápidas junto a los muros (además de los túmulos); en el jardín, corros de setas al pie de las paredes.

## [0.61.1] — 2026-11-17

- Pistolas dobles: cada una tiene su propio cargador (12 y 12). Clic izquierdo gasta la derecha y clic derecho la izquierda; si una se vacía, hace clic en seco y queda con la corredera atrás. El marcador enseña las dos («izquierda · derecha»).
- Nueva recarga de las pistolas dobles: cada mano suelta su cargador, baja al cinturón, vuelve con el nuevo, lo asienta de un golpe y suelta la corredera; primero la derecha y luego la izquierda. Si sólo una lo necesita, sólo recarga esa (y tarda menos). Sonidos sincronizados con cada mano.

## [0.61.0] — 2026-11-17

- Salas extrañas (sin combate): altar de sangre (vida a cambio de una mejora rara), superviviente enjaulado (puede estar infectado), ruleta y pozo de los deseos.
- Élites con afijo y nombre: vampiro, divisor, cuervero, blindado y rabioso (se ve la etiqueta al apuntarles).
- La sala guarda la pelea: vainas en el suelo, charcos de sangre donde caen los cuerpos y hollín de los fuegos.
- Muertes vistosas: cámara lenta al matar al último de la sala o con un tiro a la cabeza lejano; las explosiones los hacen trizas; los restos se desmoronan en polvo.
- Salas de dos alturas (una por bioma): Muralla, Depósito elevado, Andamios, Altos hornos y Terrazas, con escaleras, pasarelas y barandillas.
- Resumen al morir: ruta por salas y biomas y la mejora más útil (además de quién te mató y el arma favorita).
- Optimización: los zombis comparten forma interna y el motor los optimiza de verdad; menos basura por fotograma (menos tirones del recolector); las sombras ya no dibujan partículas, manchas ni llamas, y cada luz sólo dibuja los cuerpos que tiene delante.
- Nuevos límites de FPS (144, 120, 90) con reparto más regular, y medidor ampliado (Ajustes → Mostrar FPS): CPU de lógica y dibujo, GPU y peor fotograma.

## [0.60.2] — 2026-11-16

- Nuevo sonido del lanzallamas: rugido grave y turbulento del chorro, siseo del gas, chasquidos sueltos de llama, «fuuomp» al prender y soplo al apagarse (sin el zumbido de antes).

## [0.60.1] — 2026-11-16

- La katana ya no es una forma del cuchillo (ahora es un arma aparte); si la llevabas equipada, vuelve el cuchillo de combate.
- Armería: los textos ya no se salen de sus recuadros (formas, skins y nombres largos de armas).
- Skins legendarias para Pistolas dobles (Gemelas de fuego), Clavadora (Óxido radiactivo) y Arpón (Abisal), que no tenían.

## [0.60.0] — 2026-11-16

### Horda: nuevo mapa «Gasolinera»
- Una gasolinera perdida en una carretera comarcal, de noche, con niebla y bosque muerto alrededor.
- Marquesina con dos islas de surtidores: si les disparas pierden gasolina y **explotan**, y los de alrededor revientan en cadena.
- Tienda 24 h con escaparates rotos, góndolas y neveras; taller con un coche en el elevador y persianas que se rompen; aseos a oscuras detrás.
- La carretera está cortada por un camión cisterna volcado que arde y por un choque múltiple; coche patrulla con las luces puestas, farolas fundidas y charcos de gasolina que se prenden.
- Luces que parpadean o están rotas, truenos lejanos y música propia, lenta y oscura.

## [0.59.2] — 2026-11-16

- Lanzallamas: chorro continuo al mantener el clic, sin animación ni estampido de disparo; suena a fuego (rugido en bucle, encendido y soplido al soltar).
- El lanzallamas prende cajas, estanterías, barriles y demás objetos de madera o tela, y quema poco a poco los bloques de madera y paja.

## [0.59.1] — 2026-11-16

- Recarga mucho más fuerte y contundente (sobre todo revólver y rifle): más volumen, golpe grave al encajar el tambor, el cargador y el cerrojo, y compresor propio.

## [0.59.0] — 2026-11-16

- **Katana** (nueva, 160 de esencia): cortes limpios que parten en dos; floja contra armaduras. Mejoras propias (Filo templado, Iaido, Hoja larga, Corte del viento, Acero de Masamune, Tajo doble) y skins Sakura, Oni y Luna sangrienta.
- Las tiendas nunca ofrecen un arma que ya llevas: se cambia por otra desbloqueada.
- Máquina de chicles con cúpula de vóxeles.
- Holograma del cartógrafo más pequeño y sin pisar al pergamino.
- Arreglo: los campeones y élites se veían con los vóxeles separados.
- Las jaulas cuelgan de una cadena hasta el techo real y caen si la cortas.

## [0.58.2] — 2026-11-16

- Carteles, avisos y tutorial mucho más cortos.
- Fuente de almas: altar escalonado con el cristal bien plantado; el cristal de descanso y la ofrenda ya no flotan en el aire.
- La recarga de las armas suena bastante más fuerte.

## [0.58.1] — 2026-11-16

- Textos de los objetos mucho más cortos: llaves, cofres, máquina de chicles, tienda, mejoras, armas, accesorios y arrojables.

## [0.58.0] — 2026-11-16

### Cartógrafo
- **Mapa nuevo (M)**: maqueta isométrica de vóxeles con la forma real de tu sala y de las de detrás de cada puerta, figuritas de enemigos (las élites en dorado) y de ti, y pasillos de luz entre salas. Con el mapa estudiado salen también las salas siguientes como maquetas de alambre con su icono.
- **Iconos de pixel art** nuevos para cada tipo de sala, enemigos, élites, llaves, cofres, mejoras raras, maldiciones, armas, emboscadas, grietas, oscuridad, niebla y peligros.
- **Panel de la derecha** rehecho: tu sala, oro y llaves, a cuántas salas está el jefe y una ficha por puerta con lo que hay detrás.
- **Previsión real** (se cumple al entrar): cuántos enemigos y élites, si hay emboscada, qué premio hay en las salas de recompensa (cofre, mejora rara o maldición) y si el vendedor trae arma.
- **Llave marcada**: en algunas salas el cartógrafo marca una llave, que suelta el último enemigo.
- **Ruta recomendada**: el cartógrafo señala en dorado la mejor puerta y lo que conviene después, según tu vida, tu oro y lo que hay.
- **Sala del cartógrafo** redecorada: alfombra, sillas, estanterías de rollos, mapas colgados, velas y un **holograma** de la mazmorra que flota sobre la mesa (azul al entrar; con los colores de cada sala al estudiar el mapa).

## [0.57.0] — 2026-11-16

### Armas
- **Pistolas dobles** (nueva, 100 de esencia en el Arsenal): clic izquierdo dispara la derecha, clic derecho la izquierda; con los dos a la vez se alternan. Menos precisión y recarga más lenta.
- **Clavadora** (nueva, 140): ráfagas de clavos que frenan al zombi; si hay pared detrás, lo deja clavado un momento.
- **Arpón** (nuevo, 170): atraviesa a 3 zombis, tira de ellos hacia ti con la cuerda y los clava a la pared si hay una detrás.
- **Niveles de arma I → II → III**: el vendedor a veces ofrece mejorar un arma (más daño, cargador y recarga más rápida). II lleva bandas de acero pulido y III detalles dorados; el nivel se ve en la barra de armas.
- **Lanzar el arma** [Z]: vuela girando, golpea fuerte, aturde y empuja. Queda en el suelo con su munición y su nivel; si sales de la sala sin recogerla (o pasan 90 s en la Horda), la pierdes.
- El vendedor sólo trae un arma el **40 %** de las veces (una de tus desbloqueadas que no lleves).
- **Patada** [X]: empuja y aturde a lo que tengas delante; la tercera seguida pega el doble. Si acierta, el siguiente disparo hace **×2** de daño.

### Mercader y llaves
- El relicario es ahora una **máquina de chicles**: metes la llave, gira la manivela y suelta bolas (madera 1, plata 2-3, oro 3-5); cada una da un premio (oro, mejora, arma, arrojable…).
- Los enemigos sueltan llaves bastante más a menudo.

### Horda
- Algo menos de enemigos por ronda, pero más variedad de tipos en cada una.
- **Rondas especiales** (raras): sólo cuervos, sólo explosivos, caballeros con corredores, ratas, huesos, hinchados…

## [0.56.0] — 2026-11-16

### Cambiado
- **Los enemigos se endurecen de verdad según avanzas.** La vida ya crecía con el piso, pero casi nunca contaba: los zombis morían antes por destrozos (cabeza o torso rotos) y hacían falta los mismos disparos en el piso 1 que en el 40. Ahora:
  - **El torso solo se parte en dos si le queda menos de la mitad de la vida.** Antes, cuatro balas a la altura del pecho lo cortaban de lado a lado (tiene 25 cm de fondo) con casi toda la vida. Lo mismo para morir con el torso destrozado.
  - **El trozo que arranca cada bala depende del daño frente a la vida total.** Al principio se ve igual que antes; en pisos altos, con más vida, cada bala arranca menos.
  - **El cráneo aguanta más en pisos altos:** del 45 % destrozado en el piso 1 al 70 % en el piso 40. El tiro a la cabeza sigue matando de golpe.
  - **Curva de vida:** +15 % de base para todos y +12 % por piso, antes +15 %.

  Disparos de pistola sin mejoras (pecho / cabeza), piso 1 → piso 40:
  - zombi: 3,8 / 1,8 → 8 / 2,3;
  - corredor: 3 / 1,3 → 6,5 / 2;
  - escudero: 13 / 3 → 24 / 3,2.
- **Esqueletos (y arqueros) mucho más resistentes.** Antes una bala casi en cualquier sitio los mataba: su columna mide 1 o 2 vóxeles y cualquier impacto la cortaba y los «partía en dos», y el cráneo hueco se «separaba» del cuello con un solo tiro. Ahora:
  - su torso y su cráneo no se parten, solo cuenta cuánto queda;
  - sus huesos se astillan menos con cada impacto;
  - tienen más vida: el esqueleto pasa de 55 a 85 y el arquero de 45 a 65.

  Disparos de pistola, piso 1 → piso 40: pecho de 1 a 5 → 12; cabeza de 1 a 2 → 5.

## [0.55.0] — 2026-11-16

### Añadido
- **Mutadores en la mazmorra diaria.** Cada día hay una regla distinta, la misma para todo el mundo. Se ve en la pantalla de la diaria, en el aviso al empezar y en el resultado:
  - Zombis veloces: los zombis corren un 30 % más.
  - Cañón de cristal: la mitad de vida y un 60 % más de daño.
  - Apagón: todo mucho más oscuro.
  - Fiebre del oro: el doble de oro, pero los zombis tienen un 30 % más de vida.
  - Vampiro: cada muerte te cura 3, pero no aparecen corazones.
  - Escopetero: empiezas con la escopeta.
  - Carne dura: los zombis tienen un 50 % más de vida y tú haces un 20 % más de daño.
- **Temporal en el Barco (Horda).** La tormenta va y viene durante toda la partida: calma de 1 a 2 minutos y temporal de 35 a 55 s, una y otra vez. Con el temporal:
  - llueve el triple y la lluvia suena más;
  - los rayos caen cada 3-6 s, en vez de cada 14-30 s en calma;
  - el mar se encrespa;
  - **las olas barren la cubierta**: primero avisan con espuma y estruendo en la borda, y luego una lámina de agua cruza la cubierta y empuja hacia el otro lado a jugadores y zombis (los zombis quedan aturdidos un momento). En los camarotes y en el castillo se está a cubierto.

  Avisa al empezar («¡TEMPORAL!») y al terminar.
- **Prueba de todos los modos** (Ajustes → «Prueba de todos los modos», o abrir el juego con `?test=all`). Juega unos segundos la mazmorra, la diaria y cada mapa de la Horda (en el Barco, con el temporal) con un bot invulnerable que apunta y dispara. Al final da un informe con los errores de cada modo, los FPS y el peor fotograma.
- **Ajustes gráficos nuevos:** distancia de dibujado en los mapas grandes (corta, normal o larga, y la niebla se ajusta con ella) y cadáveres en el suelo a la vez (automático, 6, 14 o 30). Las sombras de las antorchas ya se podían quitar.

### Mejorado
- **Sombras de las antorchas más baratas.** Cada uno de sus cuatro mapas de sombra se redibuja cada 3 fotogramas, por turnos, en vez de los cuatro en cada fotograma. El mundo se dibuja unas 2,7 veces menos por fotograma con calidad alta, y no se nota.
- **Menos basura de memoria:** 24 listas que se limpiaban creando una lista nueva en cada fotograma ahora se limpian en el sitio.

### Interno
- Se ha borrado el código muerto del antiguo «guardar y salir», que ya no se usaba: continuar partida, la rama de cargar en `startRun`, el guardado del generador y de los objetivos. También 9 funciones que nadie llamaba.
- El arranque de partida (mazmorra, diaria, cooperativo y horda) usa funciones comunes, `resetSystems` y `applyRunPerks`, en vez de repetir el mismo código.

## [0.54.3] — 2026-11-16

### Mejorado
- **Sin tirones al derrumbarse algo en los mapas grandes de la Horda.** Cada derrumbe rehacía la navegación de los zombis de todo el mapa: 10 ms en la Ciudad y 6 ms en el Barco en un ordenador, unas 3 veces más en un móvil. Ahora solo se recalcula la zona tocada, unos 0,01 ms. El resultado es idéntico: comprobado tras un derrumbe real, 0 casillas distintas.

## [0.54.2] — 2026-11-16

### Cambiado
- **Barco: piso de camarotes más amplio, pensado para el cooperativo.**
  - El pasillo pasa de 1,5 a 2,25 m de ancho y va por un lado. Las dos escaleras de bajada se ensanchan igual.
  - En vez de 40 camarotes pequeños de 3 × 1,75 m hay 10 grandes de 6 × 2,5 m, con puertas de 1,5 m.
  - Cada camarote tiene más dentro:
    - literas: dos literas dobles, mesita con flexo y libro, póster y dos taquillas;
    - almacén: cuatro cajas y dos estanterías;
    - enfermería: dos camillas, gotero y botiquín;
    - lavandería: cuatro lavadoras, mesa de planchar y ropa tendida;
    - comedor: mesa, banco y barra de servir con ollas;
    - arsenal: armero de diez fusiles y cofre;
    - sala de máquinas: dos bombas, válvulas, tuberías y cofre.
  - El pasillo tiene además mangueras contra incendios y dos luces por camarote.

### Corregido
- La litera de arriba no tenía base sólida: era tan fina que se quedaba sin ningún bloque.

## [0.54.1] — 2026-11-16

### Añadido
- **Barco: el puente de mando se puede visitar.** Desde el techo del castillo de popa se entra por dos puertas, a los lados de la consola, con dintel y rótulo verde.
  - **Primer piso:** timón con cabillas, sillón del capitán, telégrafo de máquinas, pantalla de radar, mesa de cartas con carta, regla y prismáticos, panel de alarmas y aros salvavidas.
  - **Segundo piso (sala del radar):** se sube por una escalera interior y tiene consola con pantallas, un asiento y barandilla alrededor del hueco de la escalera.
- **Grúas nuevas, hechas de bloques:**
  - pedestal redondo con aros, corona de giro, plataforma, cabina con ventanas y contrapeso;
  - castillete en A y pluma de celosía horizontal (cordones, diagonales en zigzag y tirantes) que se estrecha en la punta;
  - tirante desde el castillete, cable y gancho colgando, luces rojas de aviso, foco de trabajo, escala y rótulo de carga.

  Antes era una columna amarilla que subía hasta el cielo, con una pluma de decorado suelta.

### Corregido
- **Al subir la cubierta, todo lo que pasaba de 8,5 m quedaba cortado.** El mapa tenía ese techo, así que desaparecían el segundo piso del puente y parte de la grúa, y quedaban piezas flotando. Ahora el mapa mide 13,5 m de alto.
- **Cuadrados negros flotando**, sobre todo encima de las escaleras a los camarotes. Eran los charcos de lluvia de la 0.54.0, que quedaban a la altura de la cubierta aunque debajo hubiera un hueco. Se han quitado.
- Pantallas y telégrafo del puente que sobresalían de sus consolas.

## [0.54.0] — 2026-11-16

### Añadido
- **Barco (Horda): piso de camarotes bajo la cubierta.** Debajo de la fila central de contenedores hay un pasillo de 60 m con 40 camarotes a los dos lados, con puerta y número. Cada camarote es de un tipo:
  - literas con colchones, mantas, almohadas, taquilla y póster;
  - almacén con cajas y estanterías;
  - enfermería con camilla, cruz roja y botiquín;
  - lavandería con lavadoras y ropa tendida;
  - comedor con mesa, mantel, platos y banco;
  - arsenal con armero y fusiles, que guarda un cofre;
  - sala de máquinas con bomba y válvulas, que a veces guarda un cofre.

  El pasillo tiene paredes de dos colores, tuberías y bandeja de cables en el techo, luces (algunas fundidas), luces rojas de emergencia y flechas de salida. Se baja por dos escaleras abiertas con barandilla, una en popa (donde estaba la escotilla central) y otra en proa. Los zombis también salen de abajo y saben bajar y subir.
- **Más detalle en el barco:**
  - en cubierta, ventiladores de seta, bitas de amarre, armarios de manguera contra incendios, tuberías de servicio junto a la borda y charcos de lluvia;
  - en los contenedores, puertas con barras de cierre, manillas, matrícula y el logotipo de la naviera;
  - en el casco, marcas de calado, chorretones de óxido y el escobén del ancla;
  - en el castillo de popa, aros salvavidas, escalas, antenas y franjas de seguridad en el techo;
  - en los huecos de la fila central, puentes de trincaje.

### Cambiado
- La cubierta del barco está ahora 3 m más alta (así cabe el piso de abajo) y es una losa de bloques con los colores de antes: acero rojo óxido, juntas, tapas de bodega y franjas amarillas.

### Corregido
- **Objetos del barco que se podían atravesar.** Eran solo decorado, sin bloque sólido. Ahora tienen física:
  - las puertas abiertas de los contenedores, los botes salvavidas, los rollos de cabo y la tapa de las escotillas;
  - los extintores, el gancho de las grúas, las trincas de los contenedores y los postes de los alerones del puente.

## [0.53.4] — 2026-11-16

### Mejorado
- **Sonidos de recarga más realistas.** Las piezas metálicas se hacían con tonos puros que resonaban y sonaban a moneda. Ahora son golpes cortos de ruido filtrado, como el acero y el polímero al encajar. El cargador suena con un «clac» seco al entrar (chasquido, cuerpo y golpe), la corredera y el cerrojo cierran de golpe, y las balas traquetean dentro del cargador al sacarlo y meterlo, y en el cargador rápido del revólver. El cargador vacío cae al suelo con un golpe sordo, y las vainas tintinean cortas y apagadas.

### Corregido
- **Revólver: hueco en la parte de atrás.** El armazón estaba vacío por dentro detrás del tambor, y desde la vista del jugador se veía un agujero. Se ha rellenado con el escudo trasero del armazón, con el canal del percutor.

## [0.53.3] — 2026-11-16

### Corregido
- **La precisión podía pasar del 100 %** en las estadísticas al morir. Cada perdigón de la escopeta y cada zombi atravesado por una bala sumaban un acierto, pero el disparo solo contaba una vez. Además, los golpes de cuchillo y mazo sumaban aciertos sin sumar disparos. Ahora cada disparo cuenta como mucho un acierto, y el cuerpo a cuerpo no cuenta para la precisión.

## [0.53.2] — 2026-11-16

### Añadido
- **Fogonazo ligero** en la punta de las armas de balas (pistola, subfusil, rifle, escopeta, recortada y ametralladora): al disparar sale un destello cálido y suave que dura un instante, y una voluta de humo muy tenue que avanza, sube y se deshace. El destello va pegado a la boca del cañón aunque el arma suba con el retroceso, y en la escopeta y la recortada es algo más grande.

## [0.53.1] — 2026-11-16

### Corregido
- **Salía un casquillo hacia la izquierda al disparar** (pistola, rifle y demás). Era una vaina antigua que salía de la boca del arma, además de la de la animación. Se ha quitado: ahora las vainas solo salen por la derecha, como se expulsan de verdad.

## [0.53.0] — 2026-11-16

### Cambiado
- **Vuelven los sonidos y la música de antes de la 0.51.** Se quitan los sonidos «por capas» (disparos, explosiones, fuego, impactos, puertas, monedas…), la banda sonora nueva y las fanfarrias. En la mazmorra suena otra vez la música de siempre, también con los jefes y en el Vacío.
- Se mantienen los **sonidos de recarga pieza a pieza** de cada arma.
- Se quita el limitador de volumen de la salida. Se mantienen el fundido al arrancar y el límite de sonidos a la vez.

### Añadido
- **Música de la Horda**: una marcha de guerra propia mientras hay zombis. Lleva bombo de marcha, toms, un bajo que no para, golpes de acorde a contratiempo y una melodía de metales, con un redoble al final de cada frase. Con 10 zombis o más se añaden capas (más toms y platos, y la melodía sube de octava). Entre oleadas suena la música de exploración del mapa.

## [0.52.1] — 2026-11-16

### Corregido
- **Parecía que las armas soltaban varios casquillos por disparo.** Cada disparo suelta uno en la animación del arma y otro de verdad que cae al suelo, y los dos salían a la vez desde el mismo sitio. Ahora el del suelo aparece un poco después, por debajo del arma y fuera de la vista: al disparar se ve un solo casquillo, y al mirar abajo sigue viéndose caer y rebotar.

## [0.52.0] — 2026-11-16

### Añadido
- **Mazmorra diaria** (botón en el título): cada día, la misma mazmorra para todo el mundo. Las mismas salas tras las mismas puertas, con los mismos enemigos y la misma tienda. Hay una clasificación con las 10 mejores marcas del día, tu puesto al morir, tu nombre en la tabla y cuánto falta para la siguiente. Sin conexión se juega igual y se guarda tu mejor marca. Si sales con «guardar y salir», la partida sigue siendo la diaria.
- **Servidor**: rutas `/daily` para la clasificación, que guarda los últimos 7 días en `server/daily.json`. En Render la tabla se vacía si se reinicia el servicio.
- **Juego sin conexión completo**: al instalarse, el juego descarga todos sus archivos, así que funciona sin internet desde el primer momento. Las copias de versiones antiguas se borran solas.

### Mejorado
- **Enemigos dibujados en la tarjeta gráfica**: cada pieza del cuerpo guarda sus vóxeles en la GPU y en cada fotograma sólo se manda dónde está y cómo está girada. Antes se giraban y subían todos los vóxeles en cada fotograma. Con 30 zombis en pantalla, el dibujo de los cuerpos pasa de unos 7 ms a 1,5 ms por fotograma, y las llamadas de dibujo bajan de 946 a 220. La malla se rehace sólo cuando el cuerpo cambia (disparos, cortes, regeneración).
- **Sin tirones al entrar en una sala**: las salas vecinas se construyen en segundo plano, una por fotograma. Si te acercas a una puerta antes de que estén listas, se terminan en ese momento. Entrar en una sala pasa de 15–60 ms a 1–20 ms.
- **Límite de sonidos a la vez** (96 en ordenador, 48 en móvil): en un tiroteo enorme ya no se acumulan cientos de sonidos que ahogaban el audio del móvil.
- **Cooperativo más ligero**: el estado de la partida viaja en binario y sólo con lo que ha cambiado, con un envío completo cada segundo. Con 18 enemigos, el anfitrión manda unos 5 KB/s en vez de 15. Se sincroniza exactamente lo mismo que antes, incluida la destrucción. Hace falta el servidor nuevo; con uno antiguo se usa el formato de antes.

## [0.51.0] — 2026-11-15

### Añadido
- **Recargas con sonido pieza a pieza**, sincronizado con la animación de cada arma:
  - **Pistolas y subfusil**: sueltas el cargador, el viejo cae al suelo con un ruido metálico, encaja el nuevo con un golpe y la corredera va atrás y adelante.
  - **Rifle**: el cargador viejo sale despedido y cae, el nuevo entra de un golpe y el cerrojo sube, va atrás (con la vaina tintineando), adelante y baja.
  - **Revólver**: se abre el tambor, la varilla expulsa las seis vainas (cada una suena al caer), entra el cargador rápido y se cierra con un golpe y el trinquete.
  - **Escopeta, recortada y lanzagranadas**: se abren por la bisagra, cada cartucho o granada suena al entrar y se cierran de golpe. La escopeta además se monta y la recortada suelta sus dos cartuchos.
  - **Ametralladora**: tapa, caja fuera, caja dentro, cinta que entra eslabón a eslabón, tapa cerrada de golpe y montar.
  - **Ballesta**: manivela con trinquete, la cuerda que se engancha, el virote que se coloca y el clic.
  - **Lanzallamas**: válvula cerrada con siseo, depósito fuera y dentro, válvula abierta y el gas que vuelve.
  - **Desintegrador**: la célula sale con un chispazo, entra y el arma se carga con un zumbido que sube.
- **Skins especiales**: cada arma tiene una propia, con una misión de su estilo. Salen en la Armería marcadas como «◆ ESPECIAL»:
  - Pistola **Duelista** (40 muertes a más de 20 m) · Subfusil **Acróbata** (40 en el aire) · Escopeta **Quemarropa** (80 a menos de 2,5 m)
  - Rifle **Francotirador** (60 con la mirilla) y **Ojo de halcón** (25 cabezas a más de 18 m)
  - Lanzagranadas **Demolición** (25 veces 2 o más de un disparo) · Mazo **Rompehuesos** (80 extremidades) · Ballesta **Cazador** (40 a más de 20 m)
  - Recortada **Doble trueno** (20 veces 2 o más de un disparo) · Ametralladora **Supresión** (15 muertes con un solo cargador)
  - Lanzallamas **Infierno** (100 que estén ardiendo) · Desintegrador **Desintegrador** (30 veces 2 o más de un disparo) · Cuchillo **Sombra** (20 en el aire)
- **Doble salto**: nueva bendición del Santuario (220 de esencia). Suelta y vuelve a pulsar saltar en el aire.
- **Nueva banda sonora**:
  - Un **segundo tema del título**, que se alterna con el de siempre.
  - **Melodía propia de cada bioma** al explorar.
  - Una **segunda parte en el combate**, con toms y un riff agudo cuando hay muchos enemigos.
  - **Marcha de la Horda**, **tema del Vacío** (el bioma secreto) y **tema del jefe final**.
  - **Jefes**: la música aprieta en cada fase (más rápida, más bombo, coro y medio tono más alta en la fase final).
  - **Fanfarrias** al despejar una sala, al vencer a un jefe y al encontrar un secreto.
- **Sonidos mejorados**, hechos por capas (estallido, cuerpo, golpe grave, mecánica y eco de la sala) en lugar de un pitido y un ruido:
  - Todos los disparos, las explosiones (con cascotes que caen), el fuego (rugido, cuerpo que respira, chasquidos y savia que sisea) y las antorchas.
  - Los impactos en carne y en pared, el cuchillo, el mazo, las muertes de los zombis, las monedas, las puertas y el rastrillo, la esquiva, el clic del arma vacía y la munición que recoges.

### Cambiado
- **Objetivos de partida desbloqueables**: al principio no salen. Se desbloquean de tres formas: en el Santuario (bendición «Objetivos de partida», 120 de esencia), venciendo a tu primer jefe o como premio del Relicario (más probable con llaves mejores). El nivel 2 de la bendición da 4 objetivos y un 25 % más de esencia.
- **Retos de sala más difíciles**: el de «en X segundos» se calcula con la vida que hay que quitar y lo grande que es la sala, con poco margen (más o menos la mitad que antes). Da 15 de oro más.

## [0.50.3] — 2026-11-15

### Cambiado
- **Los menús van a 30 FPS** (título, pausa, ajustes, Santuario…). No necesitan más, y con los FPS sin límite la tarjeta gráfica iba a tope nada más cargar. Eso podía hacer que el ordenador zumbara o acelerara el ventilador (un siseo que baja poco a poco). Jugando no cambia nada.

## [0.50.2] — 2026-11-15

### Corregido
- **Enemigos que aparecían encerrados**: podían salir dentro de recintos cerrados de una sala (por ejemplo, dentro del murete del pozo en «Pozo central»), desde donde no hay camino hasta ti. Se quedaban ahí sin llegar nunca, y era otra causa de «queda 1 enemigo y no lo veo». Ahora sólo aparecen (y sólo cuentan como sitio transitable) en la zona principal de la sala.
- **El rodeo para atacarte por los lados** empieza ya cerca (a 7 m, antes a 11): desde lejos alargaba mucho el camino en las salas grandes.

### Cambiado
- **Modo de pruebas más fiable** (los avisos que daba sin ser fallos):
  - Cierra la puerta de entrada, como el juego. Antes los enemigos salían por ella y contaban como «fuera de la sala».
  - Ya no avisa de los que esperan su turno en el cerco a unos metros (lo hacen a propósito), ni de los lentos que sí se van acercando.
  - Ya no prueba los restos del renacido ni los brotes, que no aparecen solos.
  - Cada pelea dura 25 s.

## [0.50.1] — 2026-11-15

### Corregido
- **Sonido muy fuerte al entrar en el juego o al recargar**:
  - El sonido arranca en silencio y sube con un fundido de medio segundo.
  - Al volver a la pestaña también vuelve con un fundido corto, en vez de de golpe.
  - Hay un **limitador** a la salida: aunque suenen muchas cosas a la vez (explosiones, disparos…) nunca llega a saturar ni a dar un golpe de volumen.

## [0.50.0] — 2026-11-15

### Añadido
- **Cooperativo: reconectar**. Si se te corta la conexión, el juego vuelve a entrar solo (lo intenta durante 2 minutos) y sigues en la misma partida. Si cierras la pestaña o recargas, en la sala de espera sale **VOLVER A XXXX**: el anfitrión te manda la partida y apareces en su sala con tu personaje como estaba (vida, armas, mejoras, oro y llaves). El servidor guarda tu sitio 15 minutos.
- **Cooperativo: el anfitrión puede irse** también en la mazmorra: otro jugador pasa a dirigir la partida, con los mismos enemigos y las mismas salas, y quien vuelva se pone al día con él.
- **Cooperativo: levantar a un compañero**:
  - **Cuenta atrás visible**: el caído ve cuántos segundos le quedan, y los demás los ven en su etiqueta.
  - **Más rápido entre varios**: cada compañero de pie que haya alrededor acelera la reanimación un 60 %.
  - **Penalización**: cada vez que te levantan pierdes un 10 % de la vida máxima hasta la siguiente sala u oleada. Además, cada caída en la misma sala te deja 8 s menos en el suelo (mínimo 12 s).
- **Enemigos que se coordinan**:
  - De los que atacan por turno, el primero va de frente y los demás **dan un rodeo para entrarte por los lados o por la espalda**.
  - Corredores, perros, esqueletos, arqueros, escupidores, nigromantes, chillones, ratas y esporas **huyen un rato cuando les queda poca vida** (una vez) y luego vuelven.
  - Los escupidores y los chillones que no te ven **buscan otro sitio desde donde verte**, en vez de ir directos a por ti.
- **Fases de los jefes más claras**:
  - Marcas en la barra al 66 % y al 33 %, y el rótulo «FASE 1/3, 2/3, 3/3». La barra cambia de color y late en la fase final.
  - Al cambiar de fase: rugido más largo, onda que te aparta, fogonazo de su color y un instante a cámara lenta (en cooperativo no).
  - Anuncia el ataque que estrena en esa fase y es lo primero que hace al acabar el rugido.
  - Le salen chispas de su color, más cuanto más avanzada la fase.
- **Objetivos de partida** (mazmorra): al empezar salen 3 al azar entre 12 (despejar salas sin daño, matar a cuchillo, reventar cabezas, usar llaves, arrancar extremidades, matar con explosiones, llegar a un piso…). Cada uno cumplido da esencia en el momento. Se ven al empezar, en la pausa y en la pantalla final.
- **Puertas doradas**: desde el piso 2, a veces una puerta lateral sale con herrajes de oro y necesita una **llave de oro**. Detrás hay una **sala del tesoro** (mucho oro, mejora rara, corazón y explosivos) o un **vendedor raro** (dos mejoras raras y un arma a mitad de precio).
- **Tutorial corto** la primera vez: en la sala de salida te pide moverte, mirar, disparar, recargar, esquivar, el cuchillazo, lanzar una granada y coger una llave, y te explica para qué sirven. Se puede saltar, y repetir desde Ajustes → Perfil.
- **Controles táctiles personalizables** (Ajustes → Controles → Personalizar): mueve cada botón y la cruceta, cambia su tamaño y la opacidad.
- **Ajustes por mando**: cada mando guarda su propia configuración de botones (la pestaña MANDO dice cuál está conectado).
- **Ahorro de batería** (Ajustes → Gráficos): 30 FPS y menos resolución. Si el móvil tiene poca batería y no está cargando, te lo sugiere.
- **Registro de errores** (Ajustes → Perfil): guarda los últimos fallos, con la versión y dónde estabas. Se puede COPIAR para pasarlo, o BORRAR.
- **Modo de pruebas** (Ajustes → Perfil → PROBAR, o `?test=1`):
  - Construye todas las salas y comprueba que se puede llegar a todas las salidas y que con la misma semilla salen iguales.
  - Hace pelear a cada tipo de enemigo y avisa si se atasca, se sale de la sala o no llega a ti.
  - Al acabar enseña un informe para copiar.

### Cambiado
- **Pantalla de fin de partida**: cifras en tarjetas, sala, zona y piso donde caíste, arma favorita y muertes por arma, mejor racha, daño hecho y recibido, quién te hizo daño, los objetivos y, en cooperativo, la tabla del equipo también en la mazmorra.
- **Santuario rediseñado**: pestañas (Bendiciones, La tienda, Mercancía, Arsenal) con tarjetas en cuadrícula, sin listas largas ni scroll. Cada pestaña dice cuántas cosas puedes comprar ya, y se puede filtrar «sólo lo que puedo comprar».
- **Calidad automática más fina**: si caen los FPS, quita primero lo que menos se nota (oclusión, resplandor, polvo y niebla, partículas, sombras de las antorchas) y baja la resolución poco a poco antes de cambiar de nivel de calidad. Lo devuelve paso a paso si sobra margen.

### Corregido
- **Con mando no se podía levantar a un compañero** (por ejemplo al anfitrión): el botón de usar sólo «tocaba» un instante y hay que mantenerlo. Ahora, con alguien caído al lado, se mantiene.

## [0.49.0] — 2026-11-15

### Añadido
- **Controles del mando configurables**: nueva pestaña **MANDO** en Ajustes. Clic (o A) en una acción y pulsa el botón nuevo; si otra acción lo usaba, se intercambian. Hay acciones nuevas que se pueden poner en un botón (recargar sola, inspeccionar el arma) y un botón para volver a los de siempre. Start (pausa) y A / B en los menús no se cambian. La ayuda de Controles muestra tus botones.

### Corregido
- **El último enemigo invisible** («queda 1» y algo te pega sin verse), también en la mazmorra en cooperativo. Un vigilante revisa a los enemigos cada medio segundo:
  - **Sin cuerpo visible** (destrozado sin llegar a morir) o con la posición rota: muere.
  - **Fuera de la sala, bajo el suelo o metido en un bloque** durante 3 s: se le saca a un sitio libre cerca de ti.
  - **Si quedan 1 o 2 y nadie les hace daño en 40 s**: se les saca delante de ti («¡el último estaba escondido!»); si a los otros 40 s sigue igual, se desvanece y la sala se despeja.
  - Las **flechas hacia los últimos enemigos** salen solas si quedan 1 o 2 y la sala se alarga (más de 25 s), aunque estén desactivadas en Ajustes.

## [0.48.0] — 2026-11-15

### Añadido
- **Relicario de las llaves** en todas las tiendas: metes una llave (usa la mejor que tengas) y gira como una tómbola hasta dar un premio. Cuanto mejor la llave, mejor el premio:
  - **Madera**: oro, un corazón, explosivos, una mejora… o, muy de vez en cuando, una mejora rara.
  - **Plata**: mucho oro, mejoras, mejoras raras, +6 de esencia o un arma gratis.
  - **Oro**: mejoras raras, dos mejoras, un arma, +15 de esencia o el premio gordo (mejora rara, mejora, 50 de oro y vida al máximo).
- **Cooperativo: votación para bajar al bioma secreto**. Quien encuentra la escalera propone bajar y sale una votación para todos (Y = sí, N = no; con mando, cruceta arriba o abajo; en el móvil, con los botones). Si la mayoría dice que sí, bajáis todos juntos al Vacío; si no (o pasan 20 s), seguís en la mazmorra.
- **8 peinados nuevos**: rizos, trenza, pinchos, flequillo, rastas, coleta alta, raya al lado y mohicano.

### Cambiado
- **Las cerraduras se ven mejor**: llevan un marco dorado y el ojo de la cerradura tiene un brillo cálido. Al coger tu primera llave te explica para qué sirve, y al entrar en una sala con cerradura (si llevas llave) te avisa.
- **Jefes más suaves en la mazmorra en cooperativo**: +40 % de vida por compañero (antes +70 %) y un 5 % menos de daño por compañero.

### Corregido
- **Línea brillante en la cabeza** con algunos peinados (afro, largo, melena…): el pelo de lo alto de la cabeza brillaba como si tuviera luz propia.

## [0.47.0] — 2026-11-15

### Añadido
- **Cooperativo (mazmorra y Horda): se ve lo que hacen tus compañeros con las manos**:
  - **Recargar**: bajan el arma inclinada y la mano libre va al cinturón a por el cargador.
  - **Cuchillo y armas cuerpo a cuerpo**: tajos de lado a lado, estocadas y mazazos de arriba abajo, según el golpe que den de verdad.
  - **Lanzar** granadas y objetos: brazo atrás por encima del hombro y fuera.
  - **Cambiar de arma**: bajan los brazos y vuelven a subirlos con el arma nueva.
  - **Inspeccionar el arma**: la giran delante de la cara.
  - Siguen viéndose el arma que llevan (con su skin), los disparos y el retroceso.

### Cambiado
- **Mazmorra en cooperativo más difícil** cuantos más seáis (por cada compañero): +45 % de enemigos por sala (con más tope), +35 % de vida y +12 % de daño de los enemigos y +70 % de vida de los jefes.

## [0.46.1] — 2026-11-15

### Corregido
- **Mazmorra en cooperativo**:
  - **Las puertas**: si uno abre una puerta, los demás la ven abrirse (con su rastrillo y su ruido).
  - **Los bloques rotos**: lo que rompe cada jugador (disparos, golpes, explosiones, objetos del escenario) se rompe también en los demás. Antes sólo pasaba en la Horda.
  - **Los disparos de los compañeros** (fogonazo, trazadoras, sonido) también se ven y se oyen en la mazmorra.
  - **Las heridas de los zombis**: un impacto se repite en el mismo sitio del cuerpo en todos los equipos aunque el zombi esté un poco desplazado en el otro; así, si un compañero le destroza o le arranca la pierna, tú también lo ves (y al revés).
  - Las salas usan exactamente la misma plantilla en todos los equipos (antes podían elegirse distintas en raras ocasiones).
  - Las asistencias y los «salvados» cuentan también en la mazmorra.

## [0.46.0] — 2026-11-15

### Añadido
- **Mazmorra en cooperativo** (hasta 4): en la barra del cooperativo (pantalla de la Horda) el anfitrión tiene el botón **MAZMORRA EN COOPERATIVO**. Bajáis juntos: el anfitrión genera las salas y manda a los demás la «receta» (todos ven exactamente la misma sala); cuando uno cruza una puerta, entráis todos y los que se quedaron atrás aparecen junto a la entrada. Los zombis, jefes y oleadas los dirige el anfitrión; el oro, las mejoras, la tienda y el vendedor son de cada uno. Si caes, un compañero te levanta; si mueres, vuelves en la siguiente sala; si caéis todos, se acaba. (Las escaleras secretas no se pueden bajar en cooperativo.)
- **Soporte de mando** (Xbox, PlayStation, Switch Pro…) en PC y en el móvil: stick izquierdo analógico para moverse (L3 correr), derecho para apuntar con ayuda al apuntado, RT disparar, LT mirilla, A saltar, B esquivar, X usar/recargar (según haya algo delante), Y cambiar de arma, RB cuchillo, LB lanzar, cruceta para linterna, objeto y armas, Start pausa y Select mapa. Vibra con los disparos, los golpes y las explosiones. En los menús se navega con la cruceta o el stick (A aceptar, B volver). Con el mando no hace falta capturar el ratón y se ocultan los controles táctiles. Nueva opción: sensibilidad del mando.
- **Ajuste de brillo** (Ajustes → Interfaz): aclara las sombras sin quemar las luces.

### Cambiado
- **La hidra, rediseñada**: ahora es el **Coloso jorobado**, una planta carnívora de unos 3 m con el tronco lleno de púas, raíces por patas, brazos-liana con garras y una flor enorme colgando por delante (anillo de ojos al fondo de la garganta, dos filas de dientes, babas). Paleta carne o morada según el bioma. Mecánicas nuevas:
  - **La flor es el punto débil** (x2,5) y, **cuando abre la boca para morder, x4**.
  - **Las heridas brotan**: el daño al cuerpo se acumula como savia; al pasar del umbral la herida burbujea y, si no la quemas en ~1,5 s, brota otra hidra de ahí.
  - **El fuego y los explosivos cauterizan**: mientras arde no se regenera ni brota.
  - **Córtale la cabeza y le salen dos**: si la matas sin fuego ni explosivos, del cuello brotan dos flores (bicéfala); hay que reventar las dos.
  - **Dos brotes que se tocan se funden en una Hidra madre** (más vida y más daño).
  - **Se come los cadáveres** si estás lejos: se cura y echa un brote.
  - **Mordisco en embestida**: abre la flor, se echa atrás y se lanza; si te pilla, te sujeta un momento.
  - **Escupitajo de savia**: deja un charco que frena y quema.
  - **Recompensa**: matarla cauterizada o sin brotes vivos da oro extra y, a veces, un **Corazón de hidra** (verde) que regenera vida unos segundos.
- **En el móvil se veía muy oscuro**: el brillo sube al 145 % en móviles (una vez; se puede ajustar).

## [0.45.0] — 2026-11-15

### Añadido
- **La tienda se mejora con esencia**: nueva sección **LA TIENDA** en el Santuario con 8 mejoras permanentes:
  - **Más altares** (3 niveles): +1 pedestal de venta por nivel (hasta 6), en una segunda fila.
  - **Género selecto** (3): uno de los altares puede traer una mejora rara ★ (20/35/50 %).
  - **Rebajas** (2): uno o dos altares a mitad de precio.
  - **Campana del vendedor** (2): altar con campana; pagas oro y el vendedor repone todo el género (1 o 2 veces por tienda, cada vez más caro).
  - **Caja misteriosa**: altar con una mejora sorpresa (normal, rara… o maldita).
  - **Altar de las almas**: cambia oro por esencia dentro de la tienda (+5 cada vez, cada ofrenda más cara).
  - **Botica** (2): el botiquín de la tienda cura +60 / +80.
  - **Paciencia** (2): el vendedor sube menos los precios cuando le pegas y aguanta una muerte más (por nivel) antes de cerrar o volverse hostil.
- Los altares especiales tienen remate dorado y su propia luz, y se colocan siempre lejos de los pasillos de las puertas.

## [0.44.0] — 2026-11-15

### Añadido
- **29 mejoras nuevas**, sobre todo para los estilos que tenían pocas:
  - **Cuerpo a cuerpo**: Ejecución (remata a los que tienen menos del 25 % de vida), Embestida (tras esquivar, +80 % al siguiente golpe), Torbellino (cortas a todos los de alrededor), Filo sangrante ★ (sangrado 4 s), Contraataque ★ (si te golpean, el siguiente golpe hace el triple), Hoja arrojadiza ★ (cada tercer tajo lanza una hoja fantasma que atraviesa enemigos).
  - **Fuego**: Llama azul (+40 % y quema más deprisa), Brea (charcos ardiendo), Pirómano (los quemados te devuelven combustible), Bocanada ★ (al soltar el gatillo sale una bola de fuego), Inmolación ★ (el fuego se contagia).
  - **Explosivos**: Rebotadoras, Racimo (3 minigranadas), Detonador remoto (las granadas se pegan y estallan al volver a disparar), Onda de choque ★ (lanza por los aires y aturde), Mina de proximidad ★.
  - **Precisión**: Primer disparo (la primera bala del cargador hace el doble), Disparo en la rodilla (derriba), Marcar ★ (+30 % de daño al marcado).
  - **Ráfaga**: Fuego de supresión (frena), Últimas balas (+40 % al final del cargador), Cinta de munición ★ (no recargas: el arma recupera balas sola; si la vacías, se recalienta).
  - **Perdigones**: Retroceso propulsor (salto extra disparando en el aire), Boca a boca (+60 % y empujón a quemarropa), Dragón de magnesio ★ (perdigones incendiarios).
  - **Generales**: Segundo aliento (una vez por sala te curas 25 al bajar de 25), Adrenalina (velocidad al matar), Recarga táctica (vacío = 40 % más rápido) y la maldición **Pacto del berserker** (hasta +60 % de daño cuanta menos vida, pero sin botiquines).
  - **4 sinergias nuevas**: Carnicero (Ejecución + Filo sangrante), Huracán (Torbellino + Muñecas de hierro), Dragón (Bocanada + Mezcla caliente) y Fuegos artificiales (Racimo + Carga reforzada).
- **Mejoras que se desbloquean luchando**: 17 de las nuevas no salen hasta que cumples su reto (se guarda entre partidas): matar cierto número de un enemigo concreto (40 Perros zombi, 25 Caballeros negros, 60 Esqueletos arqueros, 50 Explosivos, 20 Hidras, 60 Brutos…), derrotar a un jefe concreto (Carnicero, Coloso, Capataz, Reina Micelio) o acumular muertes y jefes. Al cumplirlo sale «¡NUEVA MEJORA DESBLOQUEADA!»; en el Códice aparecen con su candado y su progreso, y la pantalla de muerte te dice cuáles tienes más cerca.

### Cambiado
- **Salas rediseñadas** que no encajaban con el estilo del juego:
  - **Columnata**: ya no es una cuadrícula de columnas iguales; ahora es una nave de catedral con dos filas de columnas gruesas (alguna partida, con sus tambores en el suelo), braseros, pasillo central de losas y estatuas al fondo.
  - **Almacén abandonado**: fuera las estanterías de libros (en unas cloacas o una mina no pintaban nada); ahora es la despensa de la guarnición, con pasillos de palés cargados de cajas, sacos y barriles y la mesa del intendente.
  - **Salón en cruz**: las cuatro esquinas eran bloques lisos; ahora son capillas con arcos que dan al cruce, con estatuas o sepulcros dentro, y una fuente rodeada de braseros en el centro.
  - **Sala en zigzag**: los dos bloques lisos son ahora muros viejos medio derruidos, con contrafuertes y escombros.
  - **Cresta**: sin cajas en mitad de la roca; piedras, huesos y, según el bioma, cristales o setas.

## [0.43.3] — 2026-11-15

### Cambiado
- **Nuevo estallido para las balas explosivas**: ya no es una explosión grande en miniatura (bola de fuego blanda y anillo en el suelo). Ahora es un golpe seco: destello blanco cegador, púas de luz en estrella, una onda esférica de metralla que se abre en un instante, chispas muy rápidas en todas direcciones y una bocanada de humo negro con brasas. Más luz en el impacto, algo más de temblor de pantalla y cascotes. El daño no cambia.

## [0.43.2] — 2026-11-15

### Cambiado
- **Antidisturbios, Escudero y Caballero negro se giran de forma más natural**: antes te encaraban siempre y al instante, aunque estuvieran dando la vuelta a una esquina (andaban de lado o de espaldas mirándote). Ahora, como los demás, miran hacia donde caminan y sólo te encaran cuando te tienen a la vista y cerca (6-7 m). Además se giran con peso, a una velocidad máxima: si los rodeas deprisa (o con un dash) les puedes pillar el costado o la espalda.

## [0.43.1] — 2026-11-15

### Corregido
- Los mensajes del vendedor salían con código HTML a la vista (`<span …>Vendedor:</span>`). Ahora se lee «Vendedor: «…»» limpio.

## [0.43.0] — 2026-11-15

### Añadido
- **El vendedor es ahora un bicho**: encorvado, de piel gris verdosa, orejas largas que asoman por la capucha, nariz de garfio y ojos de farol; túnica morada con ribetes dorados, mochila con petate, farol en la mano y bolsa de monedas. Tiene animaciones: respira, te sigue con la mirada, mueve las orejas, cuenta monedas, mira el farol, se rasca la cabeza, se apoya en el mostrador cuando te acercas y te saluda al entrar.
- **Se le puede disparar y romper a trozos** (orejas, nariz, brazos, cabeza…). Por dentro está lleno de oro y de un icor morado que brilla, y todo le vuelve a crecer. Cada golpe **sube los precios** de la tienda, y arrancarle algo los sube más.
- **Es inmortal**: si lo «matas» se deshace en un remolino de oro e icor y vuelve a formarse de los pies a la cabeza, cada vez **más rápido y más fuerte** (más vida, regenera antes, y los ojos se le van poniendo rojos), pero **siempre del mismo tamaño**. Cada muerte: +25 % a los precios.
- **A la tercera muerte se harta**: o **cierra la tienda** (se lleva el género y no habrá tiendas en unas cuantas salas) o **se vuelve hostil**: se teletransporta a tu lado, te sacude con el farol y te lanza abanicos de monedas. Hostil sigue siendo inmortal, y cada vez que vuelve lo hace antes y pega más: lo único que puedes hacer es salir de la tienda.
- **Te recuerda**: si en esta partida ya lo mataste, en la siguiente tienda te saluda con rencor y los precios empiezan algo más altos. El mercader errante y el de la horda tienen el mismo aspecto nuevo.

### Cambiado
- **Tienda rediseñada**: penumbra cálida y acogedora, sin antorchas en las paredes. Un farol sobre el mostrador de madera, focos pequeños sobre cada pedestal, velas en el mostrador, alfombra roja con ribete dorado desde la entrada, estantería con género al fondo, cajas y sacos en los rincones y una mesa y un banco junto a la puerta. Al entrar, la luz ambiental baja.

### Corregido
- **Pedestales que no salían** (el objeto flotaba junto a la pared): los dos pedestales de los lados quedaban dentro del pasillo de las puertas laterales de la tienda y, al abrir el paso, se borraban (pasaba en 1 de cada 6 tiendas, más o menos). Ahora los pedestales están en el centro, lejos de las puertas, y además se rehacen si algo los borra.

## [0.42.0] — 2026-11-14

### Cambiado
- **Hidra con aspecto nuevo**: ya no parece un zombi más. Ahora es alta (unos 2 m), de brazos larguísimos con garras, con una **boca vertical enorme que le parte el pecho** rodeada de ojos, una lengua-tentáculo que sale de ella y se enrosca, bultos que brillan, espolones de hueso en los hombros y una cabeza pequeña con otra boquita. **La cabeza pequeña sigue siendo lo único que la mata.**
- **Cambia de color según el bioma**: de **carne viva** con ojos amarillos y bultos naranjas (Cripta, Minas, Jardín fúngico, Coliseo y Base militar) o **morada** con ojos y bultos cian (Cloacas, Forja, Vacío, Ciudad nocturna y Barco). Los brotes que deja en el suelo van del mismo color.

## [0.41.5] — 2026-11-14

### Cambiado
- **La hidra se reconoce**: es algo más grande (+12 %) y de un verde más vivo, y la primera vez que aparece sale el aviso «¡UNA HIDRA!» (sólo muere si le revientas la cabeza). Comprobado que sí sale en la Horda cooperativa: en la oleada 8, unas 4 de cada 100 apariciones; antes se confundía con un zombi normal.
- **Desert Eagle aún más pequeña en pantalla** (un 10 % menos que en la 0.41.3).

## [0.41.4] — 2026-11-14

### Arreglado (cooperativo)
- **Los zombis ya no se quedan con quien está en el suelo o muerto**: si el anfitrión caía, el mapa de caminos seguía llevando a los zombis hasta su cuerpo aunque ya no fuera su objetivo. Ahora, con el anfitrión en el suelo o muerto, los caminos llevan a los compañeros que siguen en pie.
- **El renacido se ve igual en todas las pantallas**: cuando vuelve a levantarse más grande (y más fuerte), los compañeros ahora lo ven con su tamaño nuevo, no con el de siempre.
- **Las partes arrancadas se ven en todas las pantallas**: si alguien le arranca las piernas (o un brazo, la cabeza…) a un zombi, a los demás también se les cae y lo ven arrastrarse. Al caballero y a la hidra les vuelve a crecer también en la pantalla de los compañeros.
- **Minimizar ya no congela la partida**: si el anfitrión minimizaba la ventana o cambiaba de pestaña (por ejemplo, mientras estaba en el suelo), el navegador dejaba de mover el juego y la partida se paraba para todos. Ahora sigue funcionando en segundo plano (sin dibujar ni sonar) y los demás pueden seguir jugando.

## [0.41.3] — 2026-11-14

### Cambiado
- **Casquillos de la pistola**: al disparar, la vaina sale despedida por arriba a la derecha (más grande y más lenta, para que se vea) y además cae al suelo de verdad y rebota. Las vainas de las demás armas (subfusil, rifle, ametralladora, escopeta) también caen al suelo.
- **Desert Eagle más pequeña en pantalla**: se dibuja a un 80 % de la escala de antes, más o menos como la pistola normal, para que no tape tanto.

## [0.41.2] — 2026-11-14

### Cambiado
- **Balas a la vista en los cargadores**: el cargador de caja del rifle lleva ahora las balas asomando por arriba, entre los labios (como ya tenían la pistola, la Desert Eagle, la automática y el subfusil).
- **El cargador que tiras sale vacío**: al recargar, el que se cae ya no lleva balas; el nuevo entra con ellas. Vale para todas las armas con cargador.

## [0.41.1] — 2026-11-14

### Añadido
- **Volumen general** en Ajustes → SONIDO: sube o baja todo el juego a la vez (música y efectos), además de los volúmenes de siempre.

### Cambiado
- **Si el juego deja de verse, se calla y se pausa**: al cambiar de pestaña, minimizar o pasar a otra ventana, el sonido se corta del todo y la partida se pone en pausa. Al volver, el sonido regresa y sigues desde la pausa. En el cooperativo la partida no se puede parar (los demás siguen jugando), pero tampoco suena.
- **Recarga del rifle por abajo**: ahora el cargador de caja que se ve bajo el arma cae, entra uno nuevo de un golpe y se monta el cerrojo (antes metía las balas una a una por arriba). El cargador ampliado y el doble también se mueven con él.

## [0.41.0] — 2026-11-14

### Añadido
- **Llaves de madera, plata y oro.** Salen al azar: alguna vez al matar un zombi (los élites, el campeón y los jefes más a menudo, y con mejores llaves) o dentro de vasijas, cajas, sacos… al romperlos (no en todas las salas). La llave sale despedida y cae al suelo.
- **Cerraduras nuevas**: en lugar de la puertecita con placa de color, ahora es un **hueco oscuro con forma de ojo de llave** metido en la pared, muy discreto. Salen al azar en cualquier sala de la mazmorra y **cualquier llave abre cualquier cerradura** (se usa la mejor que lleves). En la sala de la cerradura no tiene por qué haber llave. El cofre de dentro depende de la llave:
  - **Madera**: algo de oro y vida o un explosivo.
  - **Plata**: más oro, vida y una mejora.
  - **Oro**: mucho oro, vida, una mejora rara y a veces un explosivo.
- **Salas grandes de evento** (≈6 % de las salas desde el piso 2, unos 40×45 m, el triple que una normal), con más zombis y más oleadas:
  - **Catedral en ruinas**: nave con columnas altas, naves laterales elevadas con escaleras y bancos, y el altar sobre una tarima.
  - **Mina profunda**: caverna con lomas, pilares de roca con vigas, dos vías con vagonetas y farolillos, y cristales que brillan.
  - **Puerto inundado**: dos dársenas de agua que te frenan cruzadas por muelles de madera, un muelle alto al fondo y mucha carga (cajas, barriles, sacos).
- **La hidra también sale en la Horda** (desde la oleada 5, poco).

### Cambiado
- **Objetos en 3D** con el estilo de las armas: botiquín con asa, caja de munición con balas, llaves de verdad, granada de piña, molotov encendido, señuelo con antena, mira telescópica, pergamino, cofre con herrajes y cristal de almas. Las mejoras van dentro de un medallón de hierro (de oro si son raras). Algo más pequeños que en la vista previa.
- **Accesorios de las armas**: ahora se colocan sobre la forma real de cada arma (la mira encima de lo más alto, el silenciador y el compensador pegados a la boca del cañón, el cargador ampliado bajo el cargador de verdad). En la pistola automática el cargador ampliado y el doble quedaban flotando y en otras armas algunos se metían dentro.

### Arreglado
- **El árbol gigante (y otras estructuras) no caía al cortarlo**: se quedaba sujeto por una lámpara de hierro, un cristal o una estalactita que rozaba la copa, o por una viga de entibado que lo atravesaba (Minas). Ahora los adornos indestructibles sueltos no sostienen nada, las estalactitas y las vigas ya no se pegan a lo que haya debajo, y una explosión grande ya no hace que se pierda la comprobación de lo que queda colgando.
- Comprobado que la **hidra** sale en la mazmorra: desde el piso 7, ≈1,5 % de los zombis, y ≈2,8 % en el piso 14.

## [0.40.1] — 2026-11-14

### Cambiado
- **El juego se llama ahora VOXEL DUNGEON** (con V): título de la pestaña, pantalla de inicio, cartel al empezar, nombre al instalarlo en el móvil o el ordenador, archivo de perfil exportado y el servidor del cooperativo.
- Por dentro no cambia nada: **las partidas, el perfil, los ajustes y el nombre de jugador se conservan**, los perfiles exportados antes se siguen pudiendo importar y el cooperativo usa el mismo servidor.

## [0.40.0] — 2026-11-14

### Añadido
- **Chico o chica** en la personalización del personaje (Armería → PERSONAJE): la chica tiene el cuerpo y los brazos algo más finos, pestañas, colorete y labios.
- **Prendas de arriba**: camiseta, polo, sudadera (con bolsillo y cordones), camisa de cuadros, rayas, chaqueta abierta con cremallera, tirantes, chaleco táctico, top corto y vestido. **16 colores** (antes 10).
- **Prendas de abajo**: pantalón, pantalón corto (con calcetines), falda, cargo con bolsillos, vaquero roto y mallas. **10 colores** (antes 5).
- **Más cosas para la cabeza**: gorra al revés, bandana, boina, lazo, diadema, auriculares, orejas de gato y corona de flores.
- **Más cosas para la cara**: gafas redondas, barba, bigote, pendientes, máscara de hockey, pintura de guerra, pecas, collar y gafas de esquí.
- **Más pelo**: dos coletas, moño y tres colores nuevos (rosa, verde y platino).
- **Preajuste de móvil**: en móviles y tabletas el juego arranca con calidad media, sin sombras, sin resplandor, sin oclusión, sin polvo ni niebla baja y a 60 FPS como mucho (con la calidad automática activada). Se aplica solo la primera vez, también si ya habías jugado antes en el móvil. En Ajustes → GRÁFICOS hay dos botones para cambiar de un preajuste a otro: **MÓVIL** y **PC**. «Restablecer» en el móvil vuelve al preajuste de móvil.

## [0.39.0] — 2026-11-14

### Añadido
- **Hidra** (enemigo nuevo, mazmorra desde el piso 7): le puedes arrancar piernas, brazos o partirla por la mitad y **todo le vuelve a crecer** en 2,5–3,5 s; además, **de cada trozo arrancado sale un brote verde** que, si no lo rompes en 3,5 s, crece y se convierte en otra hidra. **Sólo muere si le revientas la cabeza.** (Como mucho dos generaciones y 9 a la vez, para que no se desmadre.)
- **Mejoras según el arma inicial**: en la mazmorra, las mejoras que salen (cofres, tiendas, jefes, salas de premio) son del **estilo del arma con la que empiezas**: Precisión (pistola, rifle, ballesta, desintegrador), Ráfaga (subfusil, ametralladora), Perdigones (escopetas), Explosivos (lanzagranadas), Cuerpo a cuerpo (mazo) o Fuego (lanzallamas). Cada estilo tiene **mejoras propias** (Cazacabezas, Pulso de cirujano, Cañón caliente, Tambor, Choke cerrado, Postas, Carga reforzada, Espoleta rápida, Golpe brutal, Muñecas de hierro, Brazo largo, Depósito grande, Mezcla caliente) y **sinergias nuevas** (Ejecutor, Tormenta de plomo, Muro de plomo, Demolición, Berserker, Infierno). El estilo se ve en el Santuario y al empezar la partida. En la Horda no cambia nada.
- **Peinados** para tu personaje: corto, rapado, largo, cresta, coleta, afro, tupé, melena o calvo.
- **Gira tu personaje** en la Armería arrastrando con el ratón (o el dedo); por defecto mira de frente.

### Cambiado
- **Cara de persona** para los jugadores: ojos con blanco, cejas del color del pelo, nariz y boca (antes tenían la cara de zombi, con ojeras).
- **Los compañeros ya no van con los brazos en cruz**: sujetan el arma con las dos manos (la izquierda bajo el cañón), la bajan un poco si llevan un rato sin disparar y con el cuchillo o el mazo el otro brazo se balancea al andar.
- **Menos mejoras gratis**: el campeón suelta sólo su mejora (ya no además un objeto para lanzar) y la cámara secreta da **sólo la mejora del cofre** (antes a veces había otra rara al lado).
- **Caballero negro y renacido salen más tarde** en la mazmorra: desde el piso 8 y el 6 (antes 4 y 3).
- **Zombi explosivo**: más rápido (1,8 en vez de 1,35), la mecha dura 0,5 s (antes 0,9) y casi no frena mientras se enciende.

## [0.38.1] — 2026-11-14

### Añadido (Horda cooperativa)
- **Ves la munición especial de tus compañeros**: si un compañero lleva balas explosivas ves las explosiones; con eléctricas, el rayo saltando entre zombis; con congelantes o tóxicas, el hielo y el veneno al impactar. Las trazadoras salen del mismo color y grosor que las ve él (magnum gruesas, alta velocidad finas…). La bala acaba exactamente donde acabó en su pantalla.
- **El mapa roto es el mismo para todos**: lo que rompe cada jugador (disparos, golpes, granadas, barriles) y lo que rompen zombis y jefes llega a los demás con la lista exacta de bloques. También los objetos (cajas, barriles, mesas…) que golpea cada uno. Se manda en paquetes cada 0,15 s con 3 números por bloque, así que **apenas pesa en el servidor**: sólo reenvía mensajes pequeños, no calcula nada.

### Cambiado
- **Cuervos**: ya no se quedan atascados en las paredes. Si no te ven, rodean los muros siguiendo el camino del suelo; si dejan de avanzar, se apartan de lado y suben; y se deslizan por la pared en vez de pararse en seco.
- **Caballero oscuro**: regenera antes las partes que le arrancas (4–5,5 s en vez de 6–8) y los vóxeles sueltos también.
- **Renacido**: la pila de carne y huesos es más grande y aguanta más (65 de vida +22 por cada vez que ha vuelto, antes 40 +15).
- **Ajustes ordenados por pestañas**: SONIDO, GRÁFICOS, CONTROLES, TECLAS, INTERFAZ y PERFIL.
- **Armería en pantallas grandes** (1440p, 4K…): columnas, botones, textos y muestras crecen con la ventana en vez de quedarse pequeños. Los modelos de pistola ya no parten el nombre letra a letra.
- **Charcos de agua nuevos**: orilla redondeada e irregular en vez de losas cuadradas, lámina de agua sin juntas con ondas que se mueven, anillos de gotas que caen y brillos de las luces y la linterna. Las pozas de las cloacas tienen orilla de barro mojado y son más oscuras en el centro.

## [0.38.0] — 2026-11-14

### Añadido (Horda cooperativa)
- **Personaliza tu personaje** (Armería → PERSONAJE): color de camiseta (10), pantalón (5), piel (5) y pelo (6); algo en la cabeza (gorra, casco militar, gorro de lana, capucha, sombrero, cinta o casco de minero) y un complemento (gafas de sol, mascarilla, mochila, bufanda o parche). Se ve girando en la vitrina.
- **Los compañeros te ven como eres**: con tu ropa y con **las skins y modelos de arma que tengas equipados** (cuchillo y pistola incluidos). Tu nombre en la lista sale del color de tu camiseta.
- **Ver la partida al morir**: si se te acaban los 30 s en el suelo, la cámara sigue a un compañero desde detrás en lugar de quedarse mirando al suelo. Con clic o saltar cambias de compañero.
- **Recompensas por jugar en equipo**:
  - **+20 de oro** por levantar a un compañero.
  - **+2** por cada **asistencia** (le diste en los últimos 6 s y lo remató otro).
  - **+5** por **salvar** a un compañero (matar a un zombi que estaba encima de él).
- **Tabla al acabar cada oleada**: bajas, cabezas, daño, compañeros levantados, asistencias, salvadas y caídas de cada jugador en esa oleada, con **★ el mejor de la oleada**. Al acabar la partida sale la tabla de toda la partida.

### Cambiado
- **Jefes, campeones y élites con más vida en el cooperativo**: +75 %, +60 % y +30 % por cada compañero (con cuatro jugadores, el jefe tiene más del triple). Antes sólo aumentaba el número de zombis.
- Al empezar cada oleada vuelven con la mitad de vida **todos los que estaban muertos y también los que seguían en el suelo**, siempre que algún compañero haya aguantado.

### Arreglado
- **Cooperativo: a veces no volvías en la siguiente oleada.** Estando caído o muerto, el fuego, el ácido u otra cosa del suelo te podían volver a «tumbar»: se reiniciaba la cuenta y te quedabas en el suelo para siempre. Ahora, mientras estás caído o muerto, nada te hace daño.

## [0.37.1] — 2026-11-14

### Cambiado
- **Ya no se empieza con granadas.** La granada también se desbloquea con una misión: **llegar al piso 3**. Hasta entonces no sale nada para lanzar en tiendas, cofres, vendedores ni cajas, y los zombis tampoco lo sueltan. Una vez desbloqueada, hay que **encontrarla por los pisos**: en tiendas, cofres y cajas, o la sueltan los zombis (sobre todo los élites y campeones). Lo mismo con el molotov y el señuelo, cada uno con su misión.
- Si pulsas la tecla de lanzar sin tener nada, el aviso te dice si aún no lo has desbloqueado (Armería → Equipo) o si sólo te falta encontrarlo.

## [0.37.0] — 2026-11-14

### Cambiado
- **Ya no se puede guardar a mitad de partida**: se quitan «Guardar y salir» de la pausa y «Continuar» del título. Cada partida va de principio a fin. Si quedaba alguna partida suspendida de una versión anterior, se borra.

### Añadido (calidad de vida)
- **Todas las teclas configurables** (Ajustes → Teclas): avanzar, retroceder, izquierda, derecha, saltar, correr, esquivar, recargar, usar, arma anterior, mapa, llamar la oleada y pausa, además de las que ya se podían cambiar. Las flechas siguen moviendo, y 1·2·3, la rueda y Esc no cambian. Los avisos en pantalla («[E] Abrir», «[G] llamarla ya», «[M] cerrar»…), la ayuda del título y los botones táctiles usan la tecla que hayas puesto.
- **Pantalla de muerte con lo que pasó**:
  - **Quién te mató** (con élites, campeones y jefes por su nombre, y también trampas, fuego, púas, derrumbes o tu propia explosión).
  - **Daño recibido** de cada fuente, con barras.
  - **Lo que llevabas**: mejoras y accesorios.
  - **Te falta poco para**: las tres misiones de skins o de equipo que tienes más cerca de cumplir, con su progreso.
- **Comparar armas en la tienda**: al mirar un arma aparecen sus diferencias con la que llevas en la mano, con tus mejoras ya aplicadas (DPS, daño, cadencia, cargador, recarga, alcance y dispersión), en verde ▲ o rojo ▼. También dice si se añade o a cuál sustituye.
- **Pausa con resumen de la partida**: piso u oleada, tiempo, oro, zombis, cabezas y vida; tus armas con la munición y los accesorios; lo que llevas para lanzar y las llaves; y **todas tus mejoras con lo que hacen** (★ raras, ☠ maldiciones).
- **Tamaño de la interfaz** (70-150 %) en Ajustes.
- **Modo para daltónicos** en Ajustes:
  - Las llaves llevan símbolo (▲ roja, ■ azul, ✚ dorada) en el HUD, en los avisos, en la pausa y en el mapa.
  - En el mapa, los enemigos son cruces y los objetos rombos.
  - En la comparación de armas, azul y naranja en lugar de verde y rojo.
  - Además, la placa de las puertas con llave tiene ahora una forma distinta por color para todo el mundo: pirámide la roja, marco la azul y cruz la dorada.
- **Volumen de ambiente y de enemigos** por separado, bajo «Efectos»: el fondo de cada bioma y los ruidos de la sala por un lado, y los gruñidos, pasos y ataques de los enemigos por otro.

### Arreglado
- El **cargador ampliado** no rellenaba las balas de más al recoger munición ni al comprar el arma otra vez (sólo al recargar).

## [0.36.3] — 2026-11-14

### Cambiado
- **Caballero negro con un diseño más sobrio («Errante»)**: acero gris oscuro sin adornos dorados, **yelmo de cubo plano con una rendija en cruz** y dos puntos de luz apagada, hombreras lisas redondeadas, sin púas ni capa roja y con una **sobreveste gris raída** por delante que deja a la vista el corazón, enmarcado ahora por una jaula de acero oscuro. Se juega igual que antes.

## [0.36.2] — 2026-11-14

### Cambiado
- **Caballero negro**: ahora se le puede destrozar como a cualquier otro enemigo, pero **mientras el corazón aguante le vuelve a crecer todo**:
  - Si le arrancas una pierna cae y **se arrastra**; a los 6-8 segundos la pierna le vuelve a crecer desde la cadera y **se levanta**.
  - Lo mismo con los brazos (sin brazos muerde) y con la cabeza (decapitado sigue andando).
  - Los trozos sueltos de armadura tardan más en volver (3-5 s en vez de 1-2).
  - Sólo muere si le rompes el corazón. El torso ya no se parte en dos, para no arrancarle el corazón por accidente.
  - En el cooperativo los compañeros también lo ven arrastrarse y levantarse.
- **Armería en pantallas pequeñas**: la lista de armas va en dos columnas compactas, sin barra de desplazamiento horizontal. Las columnas se encogen con la ventana, las tarjetas de skins son más pequeñas y en pantallas muy bajas se ocultan las estadísticas.

### Arreglado
- **Renacido en el cooperativo**:
  - A un jugador no le salía bien la «calavera con carne y huesos»: en el equipo que no era anfitrión, los restos se animaban como si fueran un zombi andando y el cráneo y los huesos se descolocaban. Ahora sólo laten, igual para todos.
  - Los restos podían quedarse **«vivos» sin carne que darles**: los disparos atravesaban el agujero ya abierto y en la Horda su vida crecía mucho con la oleada. Ahora tienen una vida fija (55 la primera vez, más en cada vuelta), algo de margen al apuntar y **se destrozan en cuanto les quitas la mitad de la carne**.
  - Cuando los restos se levantaban en el anfitrión, a los demás les salía «Restos destrozados: ya no volverá». Ahora simplemente desaparecen y aparece el renacido.

## [0.36.1] — 2026-11-14

### Cambiado
- **El equipo nuevo ya no está todo disponible desde el principio: se desbloquea con misiones.** Hasta cumplirlas, ese accesorio u objeto no sale en tiendas, cofres, salas de recompensa ni cajas, ni lo sueltan los zombis.
  - **Para lanzar**: la **granada** viene de serie; el **cóctel molotov** se desbloquea al descubrir 2 cámaras secretas y el **señuelo** al abrir 3 puertas con llave.
  - **Accesorios**:
    - Mira réflex: revienta 50 cabezas.
    - Silenciador: remata a un jefe con la pistola.
    - Compensador: elimina 120 zombis con la escopeta.
    - Empuñadura vertical: elimina 150 zombis con el subfusil.
    - Láser: llega al piso 8.
    - Cargador ampliado: elimina 300 zombis en total.
    - Doble cargador: derrota a 3 jefes.
  - Al cumplir una misión durante la partida sale un aviso, y desde ese momento ya puede aparecer.
  - Nueva sección **EQUIPO** en la Armería: cada misión con su progreso, y el subfusil girando con los accesorios que ya tengas.
  - El progreso que ya tuvieras cuenta: lo que ya cumplas se desbloquea solo.

## [0.36.0] — 2026-11-14

### Añadido
- **Objetos arrojables con tecla propia** (**T** lanza, **B** cambia el elegido; las dos se pueden cambiar en Ajustes; en el móvil, botón **LANZAR** y **OBJETO ⇄** arriba):
  - **Granada**: rebota por el suelo y las paredes y explota a los 2 segundos.
  - **Cóctel molotov**: se rompe al tocar algo y deja un charco de fuego que quema a los zombis y prende el aceite y la madera (en el agua se apaga).
  - **Señuelo**: cae, pita y parpadea; durante unos segundos los zombis cercanos van a por él en vez de a por ti, y al final revienta.
  - Se empieza con 2 granadas. Se consiguen en tiendas, cofres, vendedores y cajas de la Horda, y a veces los suelta un zombi (bastante más los élites y campeones). Máximo 4 granadas, 4 molotov y 3 señuelos.
  - En el HUD se ve cuántos llevas de cada uno y cuál se lanza. En el cooperativo los compañeros también los ven.
- **Accesorios de arma para la partida**: se montan en el arma (primero en la que llevas en la mano; si no cabe, en la otra), **se ven en el modelo** y mejoran sus estadísticas:
  - **Mira réflex** (encima): −30 % de dispersión y +15 % de alcance.
  - **Silenciador** (boca): +12 % de daño y disparos mucho más silenciosos.
  - **Compensador** (boca): −45 % de retroceso.
  - **Empuñadura vertical** (debajo): −25 % de retroceso y −15 % de dispersión.
  - **Láser** (debajo): −25 % de dispersión y +10 % de daño.
  - **Cargador ampliado** (cargador): +50 % de balas.
  - **Doble cargador** (cargador): recarga un 35 % más rápido.
  - Cada arma tiene sus huecos: por ejemplo, el rifle ya lleva visor y bípode, y la ballesta no admite ninguno. Un accesorio nuevo en un hueco ocupado sustituye al anterior. Se ven en las estadísticas del arma y se guardan al «Guardar y salir».
  - Aparecen en tiendas, cofres, salas de recompensa, vendedores y cajas de suministros de la Horda.

### Cambiado
- **Las siete formas del cuchillo, rediseñadas con más detalle** (las animaciones de combate son las mismas):
  - **Cuchillo**: punta de clip, filo brillante, acanaladura, sierra en el lomo, guarda, mango de anillas de cuero y pomo con agujero.
  - **Karambit**: acanaladura en la hoja, espolón con muescas, forro en el mango y anilla gruesa con remaches.
  - **Katana**: línea de templado ondulada, habaki dorado, tsuba calada, menuki y kashira.
  - **Daga**: filos brillantes con nervio central, guarda curvada, mango de alambre trenzado y pomo con gema.
  - **Machete**: lomo pavonado, filo brillante, agujero para colgar, empuñadura de goma con dedos y anilla para el cordón.
  - **Bayoneta**: acanaladura, sierra más marcada, anilla del cañón, tornillos, pomo con ranura y botón de retén.
  - **Navaja mariposa**: hoja tanto con acanaladura, cachas caladas con remaches, pasadores y pestillo.

## [0.35.4] — 2026-11-14

### Cambiado
- **Las tres últimas armas, con el mismo nivel de detalle** (las recargas se mantienen):
  - **Ametralladora**: cajón remachado con chapa lateral y palanca de carga, camisa agujereada con **asa de transporte**, apagallamas ranurado, bípode plegado, tapa de alimentación con alza y pestillo, **caja de munición más grande** con nervios y cierre, cinta con balas de punta de plomo, y culata con cantonera y apoyo.
  - **Lanzallamas**: boquilla ancha con aro, tubo con **aros de refrigeración**, tubo del encendedor y llama piloto bajo la boca, **depósito grande con flejes, tapas, válvula y manómetro**, manguera, asa delantera, empuñadura y apoyo de hombro.
  - **Desintegrador**: cuerpo redondeado con cúpula, **tres anillos grandes y redondos** que brillan, emisor de cristal entre dos púas, aletas arriba y a los lados, diales, empuñadura con nervios y célula de energía con tapa.

## [0.35.3] — 2026-11-14

### Cambiado
- **Escopeta con aspecto nuevo, táctico**: negra con corredera de polímero color arena, **protector térmico agujereado** sobre el cañón, boca dentada, tubo cargador largo con abrazadera, raíl con mira de anillo, punto de mira verde, **portacartuchos con 4 cartuchos en el costado**, empuñadura de pistola y culata telescópica. Se sigue abriendo por la bisagra para recargar.
- **Recortada más pequeña y distinta**: cañones serrados mucho más cortos, báscula plateada con **grabados dorados**, dos martillos, dos gatillos y **empuñadura de pistola curva de madera en vez de culata**. Se ve más compacta en la mano. La recarga es la misma: se abre, saltan los dos cartuchos y entran los nuevos.

## [0.35.2] — 2026-11-14

### Cambiado
- **Subfusil, escopeta y rifle con el mismo nivel de detalle** que el resto (las recargas se mantienen):
  - **Subfusil**: cajón ancho con aristas, raíl de mira con muescas, punto de mira y alza de anilla, camisa del cañón agujereada y apagallamas, **palanca de carga en el tubo izquierdo** (es la que se monta al recargar), cargador curvo con brocal, selector, empuñadura con relieve y culata plegable de dos barras con cantonera.
  - **Escopeta**: cañón grueso con banda ventilada y punto, tubo cargador con abrazadera, corredera ancha con ranuras, cajón con ventana de expulsión, **cartuchos de repuesto en el costado**, mira de anillo, guardamonte y culata con cantonera de goma. Se sigue abriendo por la bisagra para recargar.
  - **Rifle**: cañón pesado con **freno de boca**, visor grande con anillas, lente y torretas, cajón de acero, cargador de caja, bípode plegado bajo el guardamanos y culata con carrillera y cantonera.

## [0.35.1] — 2026-11-14

### Cambiado
- **Pistolas con más detalle**, al nivel de la Desert Eagle (las recargas son las mismas):
  - **Pistola**: corredera con estrías delante y detrás, ranura lateral, ventana de expulsión, mira con punto de fibra, cañón que asoma, raíl bajo el armazón, retén, cola de castor, martillo, cachas con relieve y tornillos, y base del cargador ancha.
  - **Revólver**: cañón más grueso con banda ventilada y funda del extractor a todo lo largo, mira, puente sobre el tambor, tambor estriado, pestillo, percutor con espuela grande y culata de madera más ancha con chapa y medallón.
  - **Pistola automática**: corredera con ventanas que dejan ver el cañón, compensador largo con lumbreras, empuñadura delantera abatible, selector grande, cachas con relieve y cargador largo reforzado con tope.
- **Mazo más robusto**: mango más grueso con collar y chapas de refuerzo de acero, empuñadura de goma con aros y pomo de hierro; cabeza más grande con flejes, remaches, caras de golpeo anchas, cuña y marcas de aviso.

## [0.35.0] — 2026-11-14

### Cambiado
- **Armas más robustas**, en la línea de la nueva ballesta:
  - **Recortada**: cañones más gruesos con bocas reforzadas, abrazaderas y banda superior con punto de mira; báscula grande con chapas atornilladas, **dos martillos exteriores**, dos gatillos, guardamanos ancho y culata serrada con cantonera de hierro.
  - **Lanzagranadas**: tubo de 40 mm más grueso con **aros de refuerzo**, boca abocinada, camisa con aletas y franjas amarillas; cajón con bisagra y tornillos, alza de mira, empuñadura delantera y culata de dos barras con cantonera. Ahora **el tubo bascula de verdad** al recargar y la granada entra en el cañón.
  - **Desert Eagle**: ya no parece la pistola normal. Corredera ancha de **acero pulido** con carril de mira, **compensador con ventanas**, martillo de espuela, guardamonte cuadrado, empuñadura gruesa de goma negra con medallón dorado y su propia paleta.
- **Caballero negro y renacido salen más a menudo en las salas**: el caballero desde el piso 4 (antes 6) y el renacido desde el 3 (antes 4), los dos con bastante más probabilidad (~4-5 % y ~6-8 % de los enemigos).
- **Cuervos más fáciles de acertar**: son un 40 % más grandes, vuelan más despacio (velocidad, picado y giros alrededor del jugador más lentos) y los disparos tienen un pequeño margen extra para darles.

## [0.34.3] — 2026-11-14

### Cambiado
- **Ballesta rediseñada** como una ballesta pesada de asedio, mucho más robusta:
  - culata maciza de madera oscura con **chapas de hierro remachadas** y cantonera;
  - **cabeza de hierro** con emblema rojo y **estribo** para el pie en la punta;
  - **palas gruesas y más anchas** con abrazaderas de acero y **poleas** en los extremos;
  - virote con **punta ancha de acero** y plumas rojas, manivela lateral, guardamonte y mira trasera.
  - Las animaciones de cuerda y virote se ajustaron a las nuevas palas; el virote sale ahora desde la nueva punta.

## [0.34.2] — 2026-11-14

### Cambiado
- **Skins legendarias rediseñadas**: fuera los adornos grandes (cuernos, alas, leones, coronas). Ahora son como un arma mejorada: la silueta es la de siempre, pero todo el arma lleva un **camuflaje animado de dos tonos que fluye despacio**, los detalles **laten con luz** y un **reflejo del color del arma recorre el metal** de vez en cuando.
  - Pistola *Oro fundido*, subfusil *Nebulosa*, escopeta *Magma*, rifle *Glaciar*, lanzagranadas *Toxina*, mazo *Bronce real*, ballesta *Nácar*, recortada *Abismo*, ametralladora *Sangre de guerra*, lanzallamas *Llamarada*, desintegrador *Plasma* y cuchillo *Hoja maldita*.
  - Siguen desbloqueándose al conseguir los 8 camuflajes del arma.

## [0.34.1] — 2026-11-14

### Corregido
- **Cuervos**: aparecían por encima del techo de la sala (dentro de la roca o en el tejado) y había que abrir un agujero para que entraran. Ahora entran siempre por debajo del techo, vuelan sin subir más allá y, si un techo bajo o un derrumbe los deja dentro de un bloque, bajan al hueco libre. Comprobado con 180 cuervos en 30 salas: ninguno dentro de bloques ni por encima del techo.

### Cambiado
- **Horda**: el caballero negro y el renacido salen desde la oleada 3, pocos: cada zombi tiene un 3 % de ser caballero y un 4 % de ser renacido.
- Las mejoras nuevas (balas eléctricas, explosivas, de hielo y tóxicas, y los calibres) también salen en la Horda: en las elecciones de mejora, en los vendedores y en los cofres.

## [0.34.0] — 2026-11-13

### Añadido
- **Munición especial (mejoras raras)**:
  - **Balas eléctricas**: cada impacto suelta un rayo que salta a 2 enemigos cercanos, les hace daño y los aturde un momento.
  - **Balas explosivas**: las balas estallan al impactar (en enemigos y paredes) con una explosión pequeña que no te hace daño.
  - **Balas de hielo**: los enemigos alcanzados van a la mitad de velocidad unos segundos (escarcha azul).
  - **Balas tóxicas**: envenenan y les quitan vida durante unos segundos.
  - La trazadora de cada disparo cambia de color con la munición.
- **Calibre (mejoras normales; sólo uno por partida)**:
  - **Munición subsónica**: balas lentas y pesadas, +65 % de daño y +30 % de destrucción, -25 % de cadencia.
  - **Alta velocidad**: +35 % de cadencia, +30 % de alcance y atraviesan un enemigo más, -20 % de daño.
  - **Calibre magnum**: +90 % de daño, -40 % de cadencia, -30 % de cargador y más retroceso.
- **Sinergias nuevas**: Arco voltaico (eléctricas + rebote: el rayo salta a 2 más), Escarcha explosiva (hielo + explosivas: las explosiones congelan) y Plaga (tóxicas + perdigones: el veneno se contagia).
- **Skin legendaria para cada arma**, que se desbloquea al conseguir los 8 camuflajes de esa arma. Cada una tiene paleta y ornamentos propios en vóxel:
  - Pistola: *Rugido del león* (negra y dorada, medallones con cabeza de león de ojos rojos y runas doradas).
  - Subfusil: *Avispa infernal* (alas de luz ámbar). Escopeta: *Cuerno del diablo* (cuernos con puntas al rojo). Rifle: *Ojo del cazador* (hueso y oro con corona y runas azules).
  - Lanzagranadas: *Fauces del dragón* (verde y oro, cresta de púas y cuernos). Mazo: *Martillo del rey* (oro, corona con gemas). Ballesta: *Alas del serafín* (blanca con alas de plumas).
  - Recortada: *Gemelos del abismo* (negra con cuernos y runas violetas). Ametralladora: *Bestia de guerra* (cresta de púas y león). Lanzallamas: *Aliento del fénix* (alas de fuego). Desintegrador: *Corona estelar* (blanco y cian con corona). Cuchillo: *Colmillo real* (hoja negra con filo rojo).

### Cambiado
- **Horda más asequible**: menos zombis por oleada (oleada 4: 20 en vez de 29; oleada 10: 47 en vez de 65), algo menos de vida por oleada y menos a la vez. En el cooperativo salen un 40 % más por cada jugador extra.
- **Horda más variada**: muchas veces sale uno de los tipos especiales que la oleada ya ha desbloqueado (perros, escupidores, brutos, explosivos, escuderos, trepadores, cuervos, renacidos, gordos, chillones, antidisturbios, arqueros y, desde la oleada 7, caballeros negros).
- **Jefes**: siguen regenerándose, pero si consigues destrozarles el 90 % del cuerpo, mueren («¡DESTROZADO!»).

## [0.33.2] — 2026-11-13

### Corregido
- **El caballero negro y el renacido no salían nunca**, y tampoco el antidisturbios, el chillón ni otros enemigos del final de la lista en los pisos altos. Al sumar las probabilidades de todos los tipos pasaban del 100 % y los últimos nunca llegaban a elegirse. Ahora se reparten en proporción y siempre queda al menos un 15 % de zombis normales. Comprobado: en 60 salas del piso 10 salieron 31 caballeros y 25 renacidos de 814 enemigos.

### Añadido
- **El caballero negro y el renacido también salen en la Horda**: el renacido desde la oleada 3 y el caballero desde la 5, más o menos. En el cooperativo los restos del renacido los crea el anfitrión y la armadura del caballero se recompone también en las pantallas de los demás.

## [0.33.1] — 2026-11-13

### Cambiado
- **Caballero negro**: sin cuernos en el yelmo.
- **Caballero negro y explosiones**: todo lo que le arranca una explosión vuelve a su sitio mientras el corazón siga entero. Ya no pierde vida por estar cerca de la explosión: sólo muere si la explosión le destroza el corazón.

## [0.33.0] — 2026-11-13

### Añadido
- **Caballero negro** (desde el piso 6, más en la Cripta, la Forja y el Vacío): armadura de placas negras con ribetes dorados, yelmo cerrado con una rendija violeta que brilla, hombreras con púas, capa hecha jirones y un mandoble negro de filo violeta. No tiene carne dentro: al abrirle un agujero se ve una sustancia violeta.
  - **Sólo muere si le rompes el corazón**: el cristal violeta del pecho, dentro de una jaula dorada.
  - Todo lo demás que le arrancas (placas, brazos, piernas, el yelmo) **vuelve a su sitio** en un par de segundos.
  - No le afecta el fuego ni lo matan los derrumbes; las explosiones sólo le hacen daño si le pillan el corazón.
- **Renacido** (desde el piso 4, más en la Cripta y el Jardín): carne viva sin piel, garras, una corona de huesos clavada en el cráneo y vértebras por la espalda.
  - Muere como cualquier otro, pero **deja una pila de carne y huesos** que late cada vez más deprisa.
  - Si no la destrozas en unos 7 segundos, **se levanta otra vez, más grande, más rápido y más duro** (con los ojos al rojo). Así hasta que destroces sus restos.
  - El oro y la baja cuentan cuando destrozas los restos. La sala no se da por despejada mientras queden restos.
- Los dos en el bestiario, con su punto débil.

### Cambiado
- **Puertas con llave** (antes rejas): ahora son puertecitas de madera vieja con herrajes, del tamaño de un hombre, metidas en el muro (no destacan). En el centro llevan una placa del color de la llave que las abre.
- **Niebla baja**:
  - Ya está en la sala de al lado en cuanto se abre la puerta (antes aparecía de golpe al entrar), y no se sale de su sala.
  - Sale en bastantes menos salas (entre un 25 y un 45 % según el bioma) y, de esas, una de cada cuatro es espesa.

## [0.32.0] — 2026-11-13

### Añadido
- **Niebla baja a ras de suelo** en la mazmorra, distinta en cada bioma:
  - Cripta: gris azulada. Cloacas: verdosa y espesa. Minas: polvo. Forja: humo. Jardín: esporas. Vacío: violeta.
  - No todas las salas la tienen, y en algunas es **espesa**: llega por la cintura, sólo se ven los ojos de los zombis (lo que brilla asoma entre la niebla) y **se oyen sus pasos** acercándose.
  - **Reacciona**: el jugador la aparta al andar (deja estela), las balas abren un surco, las explosiones la barren, y se vuelve a cerrar despacio.
  - **Se ilumina** con el haz de la linterna y con las antorchas cercanas: la luz la «corta».
  - Se puede quitar en **Ajustes → Niebla baja a ras de suelo**.
- **Ambiente sonoro propio de cada bioma**, con fundido al cambiar: viento que silba por las grietas (Cripta), agua corriendo y borboteos (Cloacas), rumor de roca y gravilla (Minas), rugido del fuego, fuelles y martillos lejanos (Forja), zumbido de esporas y campanillas (Jardín) y un tono grave que late (Vacío).
- **Silencio antes de una emboscada**: el ambiente y la música se apagan un instante justo antes de que salten.
- **Rejas de colores y llaves**: algunas salas (desde el piso 2) tienen una cámara con cofre tras una reja roja, azul o dorada. La llave del mismo color está escondida dentro de algún objeto de la sala que se puede romper (urna, caja, sarcófago, barril…). Las llaves se ven junto al oro y las que sobran abren rejas del mismo color más adelante.
- **Indicadores visuales de sonido** (accesibilidad, en Ajustes): un arco alrededor de la mira señala de dónde viene cada sonido, con una etiqueta (gruñido, pasos, explosión, ruido) y más intenso cuanto más cerca.

### Cambiado
- **Sonido tras los muros**: ya se apagaba si había una pared en medio; ahora depende de cuánto sólido hay entre medias (una columna fina casi no tapa; un muro grueso, la roca o una puerta cerrada lo ahogan mucho más).
- **Mapa [M]** rehecho (sigue abriéndose sólo con la tecla):
  - **Planta de la sala** vista desde arriba y orientada según por dónde entraste: suelo, obstáculos y muros, lava, ácido, agua, púas y vacío, las puertas con el color de lo que hay detrás, antorchas, objetos, enemigos y tú con la dirección en la que miras (se actualiza en directo).
  - Datos de la sala: niebla, oscuridad, peligros, reja, enemigos que quedan, tus llaves y si la guarida del jefe está cerca.
  - **Con el mapa del cartógrafo** ves el nombre de cada sala que hay tras las puertas, si está a oscuras o con niebla, sus peligros, si tiene reja o grieta secreta, y qué hay después. También marca la grieta secreta de la sala actual.
- **Bestiario**:
  - Pulsa un enemigo para ver sus datos: vida, velocidad, daño, oro, dónde aparece y su punto débil.
  - **Conocer al enemigo**: a los 25, 100 y 250 abatidos de un tipo (1, 3 y 6 para los jefes) le haces un 5, 10 y 15 % más de daño. Se ve con estrellas y una barra de progreso.
  - Recuento de enemigos descubiertos.

## [0.31.0] — 2026-11-13

### Añadido
- **Seis salas nuevas, una por bioma** (todo de bloques: se rompe y lo que queda suelto se cae):
  - Cripta: **Catacumbas**, pasillos entre muros de nichos con huesos, con huecos para cruzar, velas y jaulas.
  - Cloacas: **Aljibe**, cisterna inundada con columnas de ladrillo que salen del agua y bordillo de piedra.
  - Minas: **Derrumbe**, galería hundida con montañas de roca, vigas partidas atravesadas y cristales al aire.
  - Forja: **Sala de calderas**, calderas de acero tumbadas con remaches, chimeneas hasta el techo y hogares encendidos.
  - Jardín: **Raíces del abismo**, raíces enormes que cruzan la sala en arco con musgo y setas luminosas.
  - Vacío: **La fractura**, una grieta de vacío parte la sala en dos y la cruzan dos puentes de obsidiana.

### Corregido
- Los zombis ya no aparecen en el tejado ni en sitios a los que no llega el jugador (encima de columnas que suben hasta el techo, muros, estanterías…). Ahora sólo cuenta como suelo transitable lo que se alcanza andando desde el suelo de la sala; también para los que invocan otros enemigos.

## [0.30.2] — 2026-11-13

### Cambiado
- **Gas venenoso** (el gordo al reventar y las esporas): en vez de cubos verdes sueltos, ahora es un banco de niebla verde y baja que se abre desde el centro al reventar, ondula despacio a ras de suelo, tiene un brillo tenue y se deshace al terminar. Sólo quedan algunas burbujas pequeñas.
- **Explosión**: vuelve a ser la de la 0.29 (con la columna de humo), pero con los cubos de la bola de fuego, del anillo de polvo y del humo algo más pequeños.

## [0.30.1] — 2026-11-13

### Cambiado
- **Explosión** (también la del zombi explosivo): el humo ya no sube en columna; rueda a ras de suelo hacia fuera empujado por la onda y sólo una nube baja se levanta un poco. La bola de fuego sube menos y los cubos de humo son pocos y pequeños, así que no quedan cajas flotando en el aire.
- **Rebote**: ahora la bala sale reflejada por la pared y sólo se desvía un poco hacia un enemigo que esté cerca de esa dirección. Antes buscaba a cualquier enemigo a 14 m, así que cualquier disparo a una pared acababa dándole a alguien.

### Corregido
- Recortada, escopeta y lanzagranadas: los cartuchos y granadas entran por arriba en la recámara abierta (antes subían desde debajo del arma) y se meten siguiendo la inclinación del cañón.
- Revólver: con el tambor abierto ya no se ven balas dentro. Las balas nuevas se quedan en el tambor y sólo se aparta el cargador rápido.

## [0.30.0] — 2026-11-13

### Añadido
- **Animaciones de recarga por arma y por forma**, con piezas que se mueven de verdad:
  - Pistola, Desert Eagle y automática: el cargador cae, entra uno nuevo de un golpe y se monta la corredera (que se queda abierta con el cargador vacío).
  - Revólver: el tambor se abre hacia un lado, la varilla expulsa las 6 vainas, entra el cargador rápido con 6 balas y se cierra de un golpe de muñeca.
  - Escopeta: se abre por la bisagra, se meten los cartuchos uno a uno, se cierra y se monta la corredera.
  - Recortada: se abre, salen despedidos los dos cartuchos, entran dos nuevos y se cierra de golpe.
  - Rifle: se abre el cerrojo y se meten las balas una a una por la ventana.
  - Subfusil: cambio de cargador y tirón de la palanca de carga.
  - Ametralladora: se levanta la tapa, se cambia la caja de cinta y se cierra.
  - Ballesta: se tensa la cuerda y se coloca el virote.
  - Lanzagranadas: se abre y se meten las granadas.
  - Lanzallamas: cambio de depósito.
  - Desintegrador: sale la célula de energía y entra una nueva.
- **Animaciones de disparo**:
  - Vainas de latón que salen despedidas.
  - Corredera de la escopeta después de cada tiro, cartucho rojo expulsado.
  - Cerrojo del rifle entre disparos.
  - Percutor y giro del tambor del revólver.
  - Cinta de la ametralladora que avanza y anillos del desintegrador que vibran.
- **Decoración propia de cada bioma, hecha de bloques** (se rompe y lo que queda sin apoyo se cae):
  - Cripta: pilastras con calaveras, nichos funerarios con huesos, lápidas con cruz y osarios.
  - Cloacas: contrafuertes de ladrillo, desagües con rejilla y regueros de musgo, tuberías por los muros.
  - Minas: cuadros de entibado de madera de verdad (si cortas un poste, se viene abajo), faroles, afloramientos de roca y vetas de cristal.
  - Forja: pilares de acero remachados, grietas al rojo con hollín y rejillas de escoria en el suelo.
  - Jardín fúngico: raíces que trepan por los muros, setas yesqueras luminosas y musgo.
  - Vacío: lajas de obsidiana, racimos de cristal violeta y runas brillantes.
- Los muros de cada bioma tienen su propio material: sillería oscura, ladrillo húmedo, roca, piedra tiznada, roca musgosa o roca violeta.

### Cambiado
- Las armas se ven sin manos.
- Cada bioma sólo usa objetos que le pegan: en la cripta ya no hay cajas ni sacos (se cambian por urnas, sarcófagos y huesos); en el jardín, setas; en el vacío, cristales y estatuas.

### Quitado
- Los postes y vigas de madera contra las paredes, que se rompían pero no tenían físicas.

## [0.29.0] — 2026-11-13

### Añadido
- **Katana** (nueva forma del cuchillo): se desbloquea matando 300 zombis con el cuchillo. Más alcance; desenvaine en tajo ancho y corte vertical muy fuerte.
- **Animaciones propias para cada forma del cuchillo**, como ya tenía el karambit:
  - Daga: dos pinchazos rápidos y un revés con la hoja invertida.
  - Machete: hachazo diagonal de arriba abajo y barrido ancho que alcanza a varios.
  - Bayoneta: dos tajos cortos y una embestida larga (más alcance y daño).
  - Mariposa: dos cortes rapidísimos y una floritura abriendo las cachas con tajo final.
  - Katana: desenvaine ancho y corte vertical; al inspeccionarla inclina la hoja en vez de girarla.

### Cambiado
- **Explosión rehecha**: punto intermedio entre la antigua y la realista. Vuelven los cubos de fuego y la onda expansiva de cubos brillantes, ahora con halos suaves de fuego, anillo de polvo y humo de cubos envuelto en humo suave. Cantidad según la calidad gráfica.
- **Sombras de antorchas y luces (calidad alta)**: hasta 4 luces proyectan sombra a la vez. Se eligen las que tienes delante o muy cerca, así que ya no se apagan al dar unos pasos atrás.
- **Techos rediseñados en todas las salas**:
  - Cornisa escalonada donde el techo se une a los muros.
  - Texturas por sillares de 4×2 en vez de vóxeles sueltos (se acabó el «ruido»).
  - Vetas de cristal, brasas y vacío como líneas continuas, y colonias luminosas de 2×2 en el bosque de hongos.
  - Cripta con arcos fajones de hueso y nichos; cloacas con musgo solo en los arranques y rejilla en la clave; minas con cuadros de entibado; forja con retícula de vigas de acero; vacío con cúpula baja y menos cristales colgando.

### Corregido
- El menú de opciones se puede desplazar cuando no cabe en la pantalla (vale para todos los menús).
- Las estanterías (y todo lo que arde) ya no sueltan bloques que se quedan flotando: lo que se quema se convierte en ceniza, y los trozos que se quedan sin apoyo se caen.

## [0.28.0] — 2026-11-13

### Añadido
- **Seis salas nuevas, una por bioma**, hechas de bloques (todo se rompe y lo que queda suelto se cae):
  - Cripta: **Osario** — pilares de huesos y calaveras, un gran montón de huesos y sarcófagos.
  - Cloacas: **Colector** — canal de agua a lo largo, pasarelas con barandilla, puentes de ladrillo y tuberías.
  - Minas: **Pozo de extracción** — castillete de madera que se puede derribar, raíles y montones de mineral.
  - Forja: **Fundición** — crisol gigante de metal fundido sobre patas, río de lava, chimeneas hasta el techo y lingotes.
  - Jardín: **Setas gigantes** — si les cortas el pie, el sombrero se viene abajo.
  - Vacío: **Monolitos** — losas negras con vetas violetas, algunas inclinadas, y racimos de cristal.
- **Suelos con detalle de bloques en todas las salas** según el bioma: huesos, calaveras, lápidas rotas y cascotes (cripta); ladrillos caídos, musgo y tuberías (cloacas); rocas con mineral y tablones (minas); escoria con brasas y chatarra (forja); setas, musgo y raíces (jardín); esquirlas de cristal (vacío). Más en calidad alta, menos en baja.

### Cambiado
- **Derrumbes sin límite de tamaño**: la comprobación de apoyos ya no se rinde con las piezas grandes. Se reparte entre fotogramas y busca primero hacia el suelo y las paredes, así que es rápida (un disparo al techo ~1 ms) y ahora sí se caen trozos grandes: un pedazo de techo recortado, la copa entera del gran árbol si le cortas el tronco, el sombrero de una seta gigante, un castillete…
- El gran árbol ya no toca el techo ni las paredes: se sostiene sólo por el tronco.
- El techo es una losa de 4 bloques que sigue el relieve (antes era maciza hasta arriba); por encima no se dibuja nada que no se vea.
- **Calidad gráfica**:
  - Partículas: todas en alta, ~60 % en media y ~35 % en baja.
  - Restos y cadáveres que se quedan: 140 / 24 en alta, 70 / 14 en media, 35 / 8 en baja.
  - **Zombis lejanos con menos detalle**: pasan a un modelo con vóxeles el doble de grandes (desde 60 m en alta, 24 m en media y 9 m en baja: en baja casi todos van con el modelo simple) y, más lejos, se animan a la mitad o un tercio de fotogramas.
  - En alta, todo al máximo.
- **Sólo en el móvil**: menos partículas, restos y cadáveres, el detalle de los zombis baja antes, menos trabajo de derrumbes por fotograma, menos detalle de suelo y, la primera vez, calidad media sin oclusión ambiental. En el ordenador no cambia nada de esto.

## [0.27.0] — 2026-11-13

### Cambiado
- **El techo de la mazmorra es parte de la sala**: ya no es un decorado aparte, sino bloques de la misma rejilla que las paredes, el suelo y las columnas. Se le puede disparar, las balas dejan agujeros, las explosiones abren boquetes y las piezas que se quedan sin apoyo (cadenas, jaulas, lámparas, estalactitas, setas, cristales, tuberías…) se caen y pueden aplastar a quien esté debajo.
- La sala crece hacia arriba lo que necesite su techo (las bóvedas de catedral, hasta 4,5 m más) y las paredes suben hasta cerrarlo.
- Pilares, columnas y muros que llegaban al techo ahora están unidos a él con bloques de verdad.
- El techo recibe la oclusión ambiental y las sombras de la linterna como el resto de la sala.
- La decoración colgante de cada bioma (calaveras, jaulas, lámparas doradas, faroles, garfios, raíces, setas, cristales, tuberías y musgo) también está hecha de bloques destructibles.
- Bloques nuevos para los techos: sillería, nervios, plementos pintados, estrellas y claves doradas, hollín, grietas al rojo, cristal violeta y azul, setas luminosas, roca de cueva y cadenas.

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
