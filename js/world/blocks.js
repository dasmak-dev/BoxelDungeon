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
  };

  // hp: vida del bloque (Infinity = indestructible)
  B.info = [];
  B.info[B.AIR] = { solid: false };
  B.info[B.BEDROCK] = { solid: true, hp: Infinity, color: [0.2, 0.19, 0.22], vary: 0.04 };
  B.info[B.BRICK] = { solid: true, hp: 30, color: [0.52, 0.3, 0.23], vary: 0.08, brick: true };
  B.info[B.STONE] = { solid: true, hp: 60, color: [0.48, 0.47, 0.5], vary: 0.06, brick: true };
  B.info[B.WOOD] = { solid: true, hp: 12, color: [0.56, 0.38, 0.19], vary: 0.06, plank: true };
  B.info[B.DOOR] = { solid: true, hp: Infinity, color: [0.33, 0.33, 0.37], vary: 0.03 };
  B.info[B.METAL] = { solid: true, hp: Infinity, color: [0.4, 0.42, 0.46], vary: 0.03 };
  B.info[B.MOSS] = { solid: true, hp: 30, color: [0.3, 0.42, 0.2], vary: 0.09, brick: true };
  B.info[B.BONE] = { solid: true, hp: 40, color: [0.8, 0.76, 0.64], vary: 0.06 };
  B.info[B.GOLDB] = { solid: true, hp: Infinity, color: [0.8, 0.6, 0.16], vary: 0.06 };
  B.info[B.CRYSTAL] = { solid: true, hp: Infinity, color: [0.35, 0.85, 1.0], vary: 0.1, e: 0.6 };
  B.info[B.TERRAIN] = { solid: true, hp: 70, color: [0.27, 0.23, 0.2], vary: 0.05, terrain: true };
  B.info[B.BARREL] = { solid: true, hp: 20, color: [0.62, 0.1, 0.08], vary: 0.04, barrel: true };
  B.info[B.WBARREL] = { solid: true, hp: 16, color: [0.45, 0.28, 0.13], vary: 0.05, barrel: true };
  B.info[B.FIRE] = { solid: true, hp: Infinity, color: [1, 0.55, 0.15], vary: 0.15, e: 1 };
  B.info[B.IRON] = { solid: true, hp: Infinity, color: [0.16, 0.16, 0.18], vary: 0.03 };
  B.info[B.PLANK] = { solid: true, hp: 18, color: [0.42, 0.28, 0.15], vary: 0.05, plank: true };

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
    } else h = H(x, y, z);
    const v = (h - 0.5) * 2 * inf.vary;
    out[0] = inf.color[0] + v; out[1] = inf.color[1] + v; out[2] = inf.color[2] + v;
    out[3] = inf.e || 0;
    if (inf.barrel && y % 3 === 1) {
      // aros del barril
      if (t === B.BARREL) { out[0] = 0.85; out[1] = 0.7; out[2] = 0.1; }
      else { out[0] = 0.22; out[1] = 0.22; out[2] = 0.24; }
    }
    if (t === B.FIRE) out[1] = 0.4 + H(x, y, z) * 0.35;
    return out;
  };

  VX.Blocks = B;
})();
