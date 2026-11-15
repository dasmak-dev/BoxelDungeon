// Tipos de bloque del mundo.
(function () {
  const B = {
    AIR: 0,
    BEDROCK: 1,   // capa exterior indestructible
    BRICK: 2,     // pared interior destructible
    STONE: 3,     // pilares, resistentes
    WOOD: 4,      // cajas, frágiles
    DOOR: 5,      // barrotes de puerta (solo los abre el juego)
    METAL: 6,     // pedestales / mostrador (indestructible)
    MOSS: 7,      // ladrillo con musgo
    BONE: 8,      // decoración sala jefe
    GOLDB: 9,     // decoración tienda
    CRYSTAL: 10,  // cristal de guardado (emisivo)
    PLANK: 11,    // estanterías / tablones
    TERRAIN: 12,  // relieve del terreno (roca y tierra)
    BARREL: 13,   // barril explosivo (rojo)
    WBARREL: 14,  // barril de madera
    FIRE: 15,     // brasas de un brasero (emisivo)
    IRON: 16,     // hierro oscuro (braseros, jaulas, cadenas)
    PROP: 17,     // celda invisible ocupada por un objeto de vóxel fino (colisión)
    CRACK: 18,    // ladrillo agrietado (esconde una cámara secreta)
    BARK: 19,     // corteza de árbol
    LEAF: 20,     // hojas
    GLOWLEAF: 21, // hojas luminosas (Jardín)
    DEADWOOD: 22, // madera muerta, pálida (Cripta)
    CRYSTWOOD: 23, // tronco cristalizado (Vacío)
    DOORWOOD: 24, // hoja de madera de las puertas
    // --- ciudad (modo Horda) ---
    CONCRETE: 25, // hormigón de los rascacielos (paneles)
    CBRICK: 26,   // ladrillo rojo de las tiendas
    GLASS: 27,    // cristal: se rompe el panel entero
    CAR_R: 28, CAR_B: 29, CAR_W: 30, CAR_Y: 31, CAR_K: 32,   // chapa de coche
    TIRE: 33,     // neumático / goma
    LAMP: 34,     // luz cálida (farolas, faros)
    NEON_P: 35, NEON_C: 36, NEON_G: 37, NEON_R: 38,          // neones y pilotos
    STEEL: 39,    // postes, marcos, barandillas
    BARRIER: 40,  // límite invisible del mapa
    JERSEY: 41,   // barrera de hormigón con franjas
    PRODUCT: 42,  // productos de las estanterías (colores)
    TILE: 43,     // azulejo blanco
    SANDBAG: 44,  // sacos terreros
    MARBLE: 45,   // mármol del vestíbulo
    SHUTTER: 46,  // persiana metálica / puerta de tienda (se rompe entera)
    CHAR: 47,     // chapa quemada
    SOFA: 48,     // tapicería
    PANEL: 49,    // cartel luminoso blanco
    ASPH: 50,     // asfalto levantado / escombro oscuro
    // --- coliseo ---
    TRAV: 51,     // travertino (sillares)
    HAY: 52,      // paja
    FRESCO: 53,   // enlucido pintado en rojo
    TGT_W: 54, TGT_R: 55, TGT_Y: 56,   // anillos de las dianas
    CLOTH: 57,    // tela roja de estandartes y toldos
    // --- máquinas de ventajas (indestructibles) y mapas militares ---
    MACH_R: 58, MACH_G: 59, MACH_Y: 60, MACH_B: 61, MACH_P: 62,
    OLIVE: 63,    // verde militar (vehículos, tiendas de campaña)
    CONT_R: 64, CONT_B: 65, CONT_G: 66, CONT_O: 67,   // contenedores de carga (chapa ondulada)
    DIRT: 68,     // tierra de los gaviones
    DECK: 69,     // cubierta de acero del barco (antideslizante)
    HULL: 70,     // casco rojo / blanco del barco
    SHIPW: 71,    // chapa pintada de blanco (superestructura del barco)
    FRIDGE: 72,   // puerta de cristal de una nevera de tienda (con producto detrás y luz tenue)
    // --- techos de la mazmorra ---
    CSTONE: 73,   // sillería de las bóvedas
    CRIB: 74,     // nervios y arcos (piedra clara)
    CPAINT: 75,   // plementos pintados de azul (catedral)
    CSTAR: 76,    // estrellas doradas pintadas (emisivas)
    CGOLD: 77,    // claves y lámparas doradas
    CDARK: 78,    // hollín, nichos y huecos oscuros
    EMBER: 79,    // grieta al rojo (Forja)
    VCRYST: 80,   // cristal violeta (Vacío)
    FGLOW: 81,    // seta luminosa (Jardín)
    CROCK: 82,    // roca de las cuevas
    CHAIN: 83,    // cadenas, rejillas y jaulas (hierro que se puede romper)
    MCRYST: 84,   // veta de cristal azul (Minas)
    LOCKR: 85, LOCKB: 86, LOCKY: 87,   // placa de color de las puertas cerradas con llave (roja, azul, dorada)
  };

  // hp: vida del bloque (Infinity = indestructible)
  B.info = [];
  B.info[B.AIR] = { solid: false };
  B.info[B.BEDROCK] = { solid: true, hp: Infinity, color: [0.2, 0.19, 0.22], vary: 0.04 };
  B.info[B.BRICK] = { solid: true, hp: 30, color: [0.4, 0.34, 0.31], vary: 0.09, brick: true };
  B.info[B.STONE] = { solid: true, hp: 60, color: [0.36, 0.36, 0.39], vary: 0.07, brick: true };
  B.info[B.WOOD] = { solid: true, hp: 12, color: [0.56, 0.38, 0.19], vary: 0.06, plank: true };
  B.info[B.DOOR] = { solid: true, hp: Infinity, color: [0.33, 0.33, 0.37], vary: 0.03, shiny: 0.45 };
  B.info[B.METAL] = { solid: true, hp: Infinity, color: [0.4, 0.42, 0.46], vary: 0.03, shiny: 0.7 };
  B.info[B.MOSS] = { solid: true, hp: 30, color: [0.27, 0.33, 0.21], vary: 0.09, brick: true };
  B.info[B.BONE] = { solid: true, hp: 40, color: [0.8, 0.76, 0.64], vary: 0.06 };
  B.info[B.GOLDB] = { solid: true, hp: Infinity, color: [0.8, 0.6, 0.16], vary: 0.06, shiny: 0.8 };
  B.info[B.CRYSTAL] = { solid: true, hp: Infinity, color: [0.35, 0.85, 1.0], vary: 0.1, e: 0.6 };
  B.info[B.TERRAIN] = { solid: true, hp: 70, color: [0.27, 0.23, 0.2], vary: 0.05, terrain: true };
  B.info[B.BARREL] = { solid: true, hp: 20, color: [0.62, 0.1, 0.08], vary: 0.04, barrel: true };
  B.info[B.WBARREL] = { solid: true, hp: 16, color: [0.45, 0.28, 0.13], vary: 0.05, barrel: true };
  B.info[B.FIRE] = { solid: true, hp: Infinity, color: [1, 0.55, 0.15], vary: 0.15, e: 1 };
  B.info[B.IRON] = { solid: true, hp: Infinity, color: [0.16, 0.16, 0.18], vary: 0.03, shiny: 0.5 };
  B.info[B.PLANK] = { solid: true, hp: 18, color: [0.42, 0.28, 0.15], vary: 0.05, plank: true };

  B.info[B.PROP] = { solid: true, hp: Infinity, color: [0, 0, 0], vary: 0, invisible: true };
  B.info[B.CRACK] = { solid: true, hp: 9, color: [0.4, 0.34, 0.31], vary: 0.09, brick: true, crack: true };
  B.info[B.BARK] = { solid: true, hp: 45, color: [0.3, 0.2, 0.12], vary: 0.07, bark: true };
  B.info[B.LEAF] = { solid: true, hp: 3, color: [0.16, 0.3, 0.12], vary: 0.09, leaf: true };
  B.info[B.GLOWLEAF] = { solid: true, hp: 3, color: [0.2, 0.55, 0.45], vary: 0.12, leaf: true, glow: true };
  B.info[B.DEADWOOD] = { solid: true, hp: 40, color: [0.42, 0.39, 0.34], vary: 0.06, bark: true };
  B.info[B.DOORWOOD] = { solid: true, hp: Infinity, color: [0.34, 0.21, 0.11], vary: 0.06, doorwood: true };
  B.info[B.CRYSTWOOD] = { solid: true, hp: 60, color: [0.3, 0.18, 0.42], vary: 0.08, bark: true, shiny: 0.6 };

  // ciudad
  B.info[B.CONCRETE] = { solid: true, hp: 55, color: [0.42, 0.42, 0.44], vary: 0.05, panel: true };
  B.info[B.CBRICK] = { solid: true, hp: 30, color: [0.46, 0.22, 0.16], vary: 0.08, brick: true };
  B.info[B.GLASS] = { solid: true, hp: 3, color: [0.16, 0.24, 0.3], vary: 0.03, shiny: 0.95, glass: true, shatter: true };
  B.info[B.CAR_R] = { solid: true, hp: 35, color: [0.55, 0.06, 0.06], vary: 0.03, shiny: 0.75, car: true };
  B.info[B.CAR_B] = { solid: true, hp: 35, color: [0.08, 0.17, 0.42], vary: 0.03, shiny: 0.75, car: true };
  B.info[B.CAR_W] = { solid: true, hp: 35, color: [0.7, 0.7, 0.68], vary: 0.03, shiny: 0.7, car: true };
  B.info[B.CAR_Y] = { solid: true, hp: 35, color: [0.82, 0.62, 0.08], vary: 0.03, shiny: 0.7, car: true };
  B.info[B.CAR_K] = { solid: true, hp: 35, color: [0.07, 0.07, 0.08], vary: 0.02, shiny: 0.8, car: true };
  B.info[B.TIRE] = { solid: true, hp: 30, color: [0.06, 0.06, 0.06], vary: 0.02 };
  B.info[B.LAMP] = { solid: true, hp: 4, color: [1, 0.78, 0.45], vary: 0.04, e: 1 };
  B.info[B.NEON_P] = { solid: true, hp: 4, color: [1, 0.25, 0.7], vary: 0.03, e: 1 };
  B.info[B.NEON_C] = { solid: true, hp: 4, color: [0.25, 0.9, 1], vary: 0.03, e: 1 };
  B.info[B.NEON_G] = { solid: true, hp: 4, color: [0.3, 1, 0.4], vary: 0.03, e: 1 };
  B.info[B.NEON_R] = { solid: true, hp: 4, color: [1, 0.12, 0.08], vary: 0.03, e: 0.9 };
  B.info[B.STEEL] = { solid: true, hp: 70, color: [0.22, 0.23, 0.25], vary: 0.03, shiny: 0.5 };
  B.info[B.BARRIER] = { solid: true, hp: Infinity, color: [0, 0, 0], vary: 0, invisible: true };
  B.info[B.JERSEY] = { solid: true, hp: 70, color: [0.6, 0.6, 0.58], vary: 0.05, jersey: true };
  B.info[B.PRODUCT] = { solid: true, hp: 3, color: [0.5, 0.5, 0.5], vary: 0, product: true };
  B.info[B.TILE] = { solid: true, hp: 25, color: [0.72, 0.74, 0.74], vary: 0.03, tile: true };
  B.info[B.SANDBAG] = { solid: true, hp: 40, color: [0.45, 0.4, 0.28], vary: 0.07, brick: true };
  B.info[B.MARBLE] = { solid: true, hp: 60, color: [0.62, 0.6, 0.58], vary: 0.06, shiny: 0.6 };
  B.info[B.SHUTTER] = { solid: true, hp: 6, color: [0.36, 0.38, 0.4], vary: 0.03, shiny: 0.35, shutter: true, shatter: true };
  B.info[B.CHAR] = { solid: true, hp: 30, color: [0.08, 0.07, 0.065], vary: 0.04 };
  B.info[B.SOFA] = { solid: true, hp: 10, color: [0.32, 0.12, 0.1], vary: 0.04 };
  B.info[B.PANEL] = { solid: true, hp: 4, color: [0.75, 0.85, 1], vary: 0.03, e: 0.75 };
  B.info[B.ASPH] = { solid: true, hp: 40, color: [0.1, 0.1, 0.11], vary: 0.04 };
  B.info[B.TRAV] = { solid: true, hp: 70, color: [0.56, 0.5, 0.4], vary: 0.06, ashlar: true };
  B.info[B.HAY] = { solid: true, hp: 4, color: [0.62, 0.5, 0.22], vary: 0.12 };
  B.info[B.FRESCO] = { solid: true, hp: 40, color: [0.45, 0.13, 0.08], vary: 0.06 };
  B.info[B.TGT_W] = { solid: true, hp: 5, color: [0.85, 0.82, 0.74], vary: 0.03 };
  B.info[B.TGT_R] = { solid: true, hp: 5, color: [0.75, 0.1, 0.07], vary: 0.03 };
  B.info[B.TGT_Y] = { solid: true, hp: 5, color: [0.95, 0.75, 0.15], vary: 0.03, shiny: 0.3 };
  B.info[B.CLOTH] = { solid: true, hp: 3, color: [0.5, 0.06, 0.06], vary: 0.05 };
  B.info[B.MACH_R] = { solid: true, hp: Infinity, color: [0.6, 0.06, 0.06], vary: 0.02, shiny: 0.6 };
  B.info[B.MACH_G] = { solid: true, hp: Infinity, color: [0.06, 0.45, 0.15], vary: 0.02, shiny: 0.6 };
  B.info[B.MACH_Y] = { solid: true, hp: Infinity, color: [0.75, 0.55, 0.05], vary: 0.02, shiny: 0.6 };
  B.info[B.MACH_B] = { solid: true, hp: Infinity, color: [0.07, 0.2, 0.6], vary: 0.02, shiny: 0.6 };
  B.info[B.MACH_P] = { solid: true, hp: Infinity, color: [0.4, 0.08, 0.5], vary: 0.02, shiny: 0.6 };
  B.info[B.OLIVE] = { solid: true, hp: 45, color: [0.22, 0.25, 0.14], vary: 0.04 };
  B.info[B.CONT_R] = { solid: true, hp: 50, color: [0.42, 0.1, 0.07], vary: 0.03, corrug: true };
  B.info[B.CONT_B] = { solid: true, hp: 50, color: [0.09, 0.18, 0.34], vary: 0.03, corrug: true };
  B.info[B.CONT_G] = { solid: true, hp: 50, color: [0.13, 0.28, 0.17], vary: 0.03, corrug: true };
  B.info[B.CONT_O] = { solid: true, hp: 50, color: [0.55, 0.3, 0.07], vary: 0.03, corrug: true };
  B.info[B.DIRT] = { solid: true, hp: 30, color: [0.3, 0.24, 0.16], vary: 0.1 };
  B.info[B.DECK] = { solid: true, hp: 80, color: [0.2, 0.24, 0.22], vary: 0.04 };
  B.info[B.HULL] = { solid: true, hp: Infinity, color: [0.45, 0.08, 0.06], vary: 0.03 };
  B.info[B.SHIPW] = { solid: true, hp: 60, color: [0.5, 0.5, 0.47], vary: 0.03 };
  B.info[B.FRIDGE] = { solid: true, hp: 4, color: [0.32, 0.4, 0.46], vary: 0.06, e: 0.12 };
  B.info[B.CSTONE] = { solid: true, hp: 55, color: [0.25, 0.24, 0.23], vary: 0.07, ashlar: true };
  B.info[B.CRIB] = { solid: true, hp: 70, color: [0.44, 0.42, 0.38], vary: 0.05, ashlar: true };
  B.info[B.CPAINT] = { solid: true, hp: 40, color: [0.1, 0.13, 0.3], vary: 0.03 };
  B.info[B.CSTAR] = { solid: true, hp: 15, color: [1, 0.86, 0.5], vary: 0.05, e: 0.9 };
  B.info[B.CGOLD] = { solid: true, hp: 45, color: [0.85, 0.64, 0.22], vary: 0.05, shiny: 0.8 };
  B.info[B.CDARK] = { solid: true, hp: 45, color: [0.07, 0.065, 0.065], vary: 0.02 };
  B.info[B.EMBER] = { solid: true, hp: 30, color: [1, 0.38, 0.08], vary: 0.12, e: 0.85 };
  B.info[B.VCRYST] = { solid: true, hp: 18, color: [0.62, 0.28, 0.95], vary: 0.08, e: 0.75 };
  B.info[B.FGLOW] = { solid: true, hp: 6, color: [0.3, 1, 0.8], vary: 0.1, e: 0.85 };
  B.info[B.CROCK] = { solid: true, hp: 65, color: [0.23, 0.21, 0.2], vary: 0.09, terrain: false, rock: true };
  B.info[B.CHAIN] = { solid: true, hp: 14, color: [0.15, 0.145, 0.15], vary: 0.03, shiny: 0.45 };
  B.info[B.MCRYST] = { solid: true, hp: 20, color: [0.4, 0.85, 1], vary: 0.08, e: 0.7 };
  B.info[B.LOCKR] = { solid: true, hp: Infinity, color: [0.16, 0.09, 0.03], vary: 0.03, e: 0.35, shiny: 0.3 };   // ojo de cerradura: hueco oscuro con un leve brillo cálido
  B.info[B.LOCKB] = { solid: true, hp: Infinity, color: [0.15, 0.28, 0.8], vary: 0.03, e: 0.35 };
  B.info[B.LOCKY] = { solid: true, hp: Infinity, color: [0.8, 0.6, 0.12], vary: 0.03, e: 0.35 };
  // celdas que no se dibujan (colisión de objetos, límites del mapa)
  B.invisible = new Uint8Array(256);
  for (let i = 0; i < B.info.length; i++) if (B.info[i] && B.info[i].invisible) B.invisible[i] = 1;
  // celdas transparentes (cristal): se dibujan en una pasada aparte, con mezcla
  B.transparent = new Uint8Array(256);
  for (let i = 0; i < B.info.length; i++) if (B.info[i] && B.info[i].glass) B.transparent[i] = 1;

  B.isSolid = (t) => t !== 0 && B.info[t].solid;
  B.isDestructible = (t) => t !== 0 && B.info[t].hp !== Infinity;

  const H = (x, y, z) => VX.M.hash3(x, y, z);

  // Color con patrón de ladrillo/tablón y variación por posición
  B.color = function (t, x, y, z, out) {
    const inf = B.info[t];
    let h;
    if (inf.brick) {
      // ladrillos de 2x1 vóxeles, alternando el desfase por hilada
      const off = y & 1;
      h = H(Math.floor((x + off) / 2), y, Math.floor((z + off) / 2));
    } else if (inf.plank) {
      h = H(Math.floor(x / 4), y, Math.floor(z / 4)) * 0.6 + H(x, y, z) * 0.4;
    } else if (inf.terrain) {
      h = H(x >> 1, y, z >> 1) * 0.5 + H(x, y, z) * 0.5;
      if (y % 3 === 0) h -= 0.15; // estratos
    } else if (inf.doorwood) {
      // tablones verticales de 2 vóxeles con juntas oscuras
      const col = (x + z) >> 1;
      h = H(col, y >> 3, 7) * 0.7 + H(x, y, z) * 0.3;
      if ((x + z) % 2 === 0 && H(col, y, 9) < 0.5) h -= 0.25;
    } else if (inf.bark) {
      // vetas verticales y nudos
      h = H(x, y >> 2, z) * 0.7 + H(x, y, z) * 0.3;
      if (H(x >> 1, y >> 3, z >> 1) < 0.06) h -= 0.6;
    } else if (inf.panel) {
      // paneles de hormigón de 1 × 0,75 m con juntas
      h = H((x + z) >> 2, y >> 2, 3) * 0.7 + H(x, y, z) * 0.3;
      if (y % 3 === 0 || (x + z) % 4 === 0) h -= 0.35;
    } else if (inf.ashlar) {
      // sillares de 1 × 0,5 m con juntas
      const row = y >> 1, k = ((x + z + (row & 1) * 2) >> 2);
      h = H(k, row, 7) * 0.65 + H(x, y, z) * 0.35;
      if (y % 2 === 0 || (x + z + (row & 1) * 2) % 4 === 0) h -= 0.3;
    } else if (inf.tile) {
      h = ((x + z) % 2 === 0 || y % 2 === 0) ? 0.35 : 0.65;
    } else h = H(x, y, z);
    const v = (h - 0.5) * 2 * inf.vary;
    out[0] = inf.color[0] + v; out[1] = inf.color[1] + v; out[2] = inf.color[2] + v;
    out[3] = inf.e || (inf.shiny ? -inf.shiny : 0);
    if (inf.barrel && y % 3 === 1) {
      // aros del barril
      if (t === B.BARREL) { out[0] = 0.85; out[1] = 0.7; out[2] = 0.1; }
      else { out[0] = 0.22; out[1] = 0.22; out[2] = 0.24; }
    }
    if (t === B.FIRE) out[1] = 0.4 + H(x, y, z) * 0.35;
    if (inf.corrug && ((x + z) & 1)) { out[0] *= 0.78; out[1] *= 0.78; out[2] *= 0.78; }   // chapa ondulada
    if (inf.jersey && ((x + z + (y >> 1)) >> 1) % 3 === 0 && y >= 2) { out[0] = 0.75; out[1] = 0.12; out[2] = 0.08; }   // franjas rojas
    if (inf.shutter && y % 2 === 0) { out[0] *= 0.7; out[1] *= 0.7; out[2] *= 0.7; }   // lamas de la persiana
    if (inf.product) {
      // cajas y botes de colores en las estanterías
      const k = H(x >> 1, y, z >> 1), P = [[0.8, 0.2, 0.15], [0.2, 0.45, 0.8], [0.9, 0.75, 0.2], [0.25, 0.65, 0.3], [0.85, 0.85, 0.8], [0.6, 0.3, 0.6]];
      const c = P[Math.floor(k * P.length) % P.length], d = 0.8 + H(x, y, z) * 0.3;
      out[0] = c[0] * d; out[1] = c[1] * d; out[2] = c[2] * d;
    }
    if (inf.glass && H(x, y, z) < 0.08) { out[0] += 0.08; out[1] += 0.1; out[2] += 0.12; }   // reflejos
    if (inf.glow && H(x, y + 3, z) < 0.18) { out[0] = 0.55; out[1] = 1; out[2] = 0.8; out[3] = 0.85; }   // frutos/brotes luminosos
    if (inf.leaf && !inf.glow && H(x, y + 5, z) < 0.08) { out[0] = 0.4; out[1] = 0.32; out[2] = 0.1; }      // hojas secas
    // grietas en zigzag
    if (inf.crack && (((x + z) + (y >> 1)) % 3 === 0 || H(x, y, z) < 0.12)) { out[0] *= 0.35; out[1] *= 0.33; out[2] *= 0.32; }
    return out;
  };

  VX.Blocks = B;
})();
