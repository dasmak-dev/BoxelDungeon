// Personalización del personaje para el cooperativo: colores de la ropa, piel y pelo, algo en la
// cabeza y un complemento. Se guarda en el perfil (VX.Profile.data.look) y se envía a los compañeros,
// que te ven así (con las skins de tus armas). Se elige en la Armería → PERSONAJE.
(function () {
  const M = VX.M;
  const OPT = {
    body: { name: 'Cuerpo', list: [['Chico'], ['Chica']] },
    top: { name: 'Prenda', list: [['Camiseta'], ['Polo'], ['Sudadera'], ['Cuadros'], ['Rayas'], ['Chaqueta'], ['Tirantes'], ['Chaleco táctico'], ['Top corto'], ['Vestido']] },
    shirt: { name: 'Color de arriba', list: [
      ['Roja', [0.85, 0.3, 0.2]], ['Azul', [0.25, 0.55, 0.9]], ['Verde', [0.35, 0.75, 0.3]], ['Amarilla', [0.9, 0.75, 0.2]],
      ['Morada', [0.55, 0.3, 0.8]], ['Naranja', [0.95, 0.5, 0.15]], ['Negra', [0.12, 0.12, 0.14]], ['Blanca', [0.85, 0.85, 0.82]],
      ['Camuflaje', [0.32, 0.38, 0.22]], ['Rosa', [0.9, 0.45, 0.6]], ['Gris', [0.45, 0.46, 0.48]], ['Granate', [0.45, 0.1, 0.14]],
      ['Turquesa', [0.2, 0.7, 0.7]], ['Marino', [0.12, 0.17, 0.35]], ['Beige', [0.75, 0.66, 0.5]], ['Lima', [0.65, 0.85, 0.2]],
    ] },
    bottom: { name: 'Abajo', list: [['Pantalón'], ['Pantalón corto'], ['Falda'], ['Cargo'], ['Vaquero roto'], ['Mallas']] },
    pants: { name: 'Color de abajo', list: [
      ['Vaquero', [0.17, 0.22, 0.34]], ['Negro', [0.1, 0.1, 0.12]], ['Caqui', [0.45, 0.4, 0.27]], ['Gris', [0.32, 0.32, 0.34]], ['Marrón', [0.3, 0.2, 0.12]],
      ['Blanco', [0.82, 0.82, 0.8]], ['Verde militar', [0.25, 0.3, 0.17]], ['Rojo', [0.6, 0.12, 0.12]], ['Azul claro', [0.4, 0.55, 0.75]], ['Rosa', [0.85, 0.45, 0.6]],
    ] },
    skin: { name: 'Piel', list: [
      ['Clara', [0.9, 0.74, 0.6]], ['Media', [0.86, 0.68, 0.54]], ['Morena', [0.72, 0.52, 0.38]], ['Oscura', [0.55, 0.38, 0.27]], ['Muy oscura', [0.38, 0.26, 0.18]],
    ] },
    hair: { name: 'Pelo', list: [
      ['Negro', [0.08, 0.07, 0.07]], ['Castaño', [0.3, 0.18, 0.09]], ['Rubio', [0.75, 0.6, 0.3]], ['Pelirrojo', [0.6, 0.25, 0.1]], ['Canoso', [0.7, 0.7, 0.7]], ['Azul', [0.2, 0.35, 0.8]],
      ['Rosa', [0.9, 0.4, 0.6]], ['Verde', [0.3, 0.7, 0.35]], ['Platino', [0.88, 0.85, 0.75]],
    ] },
    cut: { name: 'Peinado', list: [['Corto'], ['Rapado'], ['Largo'], ['Cresta'], ['Coleta'], ['Afro'], ['Tupé'], ['Melena'], ['Calvo'], ['Dos coletas'], ['Moño'],
      ['Rizos'], ['Trenza'], ['Pinchos'], ['Flequillo'], ['Rastas'], ['Coleta alta'], ['Raya al lado'], ['Mohicano']] },
    hat: { name: 'Cabeza', list: [['Nada'], ['Gorra'], ['Casco militar'], ['Gorro de lana'], ['Capucha'], ['Sombrero'], ['Cinta'], ['Casco de minero'],
      ['Gorra al revés'], ['Bandana'], ['Boina'], ['Lazo'], ['Diadema'], ['Auriculares'], ['Orejas de gato'], ['Corona de flores']] },
    extra: { name: 'Cara', list: [['Nada'], ['Gafas de sol'], ['Mascarilla'], ['Mochila'], ['Bufanda'], ['Parche'],
      ['Gafas redondas'], ['Barba'], ['Bigote'], ['Pendientes'], ['Máscara de hockey'], ['Pintura de guerra'], ['Pecas'], ['Collar'], ['Gafas de esquí']] },
  };
  const KEYS = Object.keys(OPT);

  const Look = {
    OPT, KEYS,
    // por defecto, uno distinto para cada jugador
    def(idx = 0) { return { body: 0, top: 0, shirt: idx % 4, bottom: 0, pants: 0, skin: [1, 2, 3, 0][idx % 4], hair: [0, 1, 0, 2][idx % 4], cut: [0, 2, 1, 4][idx % 4], hat: 0, extra: 0 }; },
    mine() {
      const D = VX.Profile.data;
      const l = { ...this.def(0), ...(D.look || {}) };
      for (const k of KEYS) l[k] = Math.max(0, Math.min(OPT[k].list.length - 1, l[k] | 0));
      return l;
    },
    set(k, v) { const D = VX.Profile.data; D.look = { ...this.mine(), [k]: v }; VX.Profile.save(); },
    cycle(k, dir = 1) { const n = OPT[k].list.length; this.set(k, (this.mine()[k] + dir + n) % n); },
    label(l, k) { return OPT[k].list[l[k]][0]; },
    key(l) { return KEYS.map((k) => l[k]).join(','); },

    // muñeco del jugador con esta ropa (lo usan los compañeros y la vitrina de la Armería)
    model(l) {
      const C = (k) => OPT[k].list[l[k]][1];
      const hair = C('hair');
      const cfg = {
        v: 0.05, blocky: true, clean: true, human: true, girl: l.body === 1, leg: [4, 17, 4], torso: l.body === 1 ? [8, 13, 5] : [9, 13, 5], arm: l.body === 1 ? [3, 15, 3] : [4, 15, 4], head: [8, 8, 8],
        skin: C('skin'), shirt: C('shirt'), pants: C('pants'), shoes: [0.12, 0.1, 0.09], eye: [0.12, 0.12, 0.16],
        hair: l.cut === 8 ? null : l.hat === 4 || l.hat === 2 || l.hat === 7 || l.hat === 9 ? [hair[0], hair[1], hair[2], 0.25]
          : l.cut === 1 ? [hair[0] * 0.6 + 0.3 * 0.4, hair[1] * 0.6 + 0.22 * 0.4, hair[2] * 0.6 + 0.16 * 0.4, 0.55]   // rapado: casi se ve la piel
          : l.cut === 5 || l.cut === 7 || l.cut === 2 || l.cut === 11 || l.cut === 15 ? [hair[0], hair[1], hair[2], 1] : [hair[0], hair[1], hair[2], 0.7],
        ragged: 0, tear: 0, jaw: false, wound: false, extras: [],
      };
      cfg.dress = dressFn(l, cfg);
      let model = VX.Models.humanoid(cfg);
      model = VX.Models.addTool(model, cfg, { tool: 'gun', name: 'gun', arm: 'armR' });
      const { makePart, corner } = VX.Models, v = cfg.v;
      const [hw, hh, hd] = cfg.head, [tw, th, td] = cfg.torso, hipY = cfg.leg[1], top = hipY + th + hh;
      const add = (name, parent, pivot, dims, min, fn, shape) => {
        const p = makePart(name, pivot, dims, min, v, fn, null, shape);
        p.parent = parent;
        if (p.alive > 0) model.parts.push(p);
      };
      const shirt = C('shirt'), dark = (c, k = 0.6) => [c[0] * k, c[1] * k, c[2] * k];
      // ---- peinado ----
      const HC = (i, j, k) => { const n = M.hash3(i, j * 3 + k, 41) * 0.16 + 0.92; return [hair[0] * n, hair[1] * n, hair[2] * n]; };
      const capped = [1, 2, 3, 4, 5, 7, 8, 9, 10, 13, 15].includes(l.hat);
      switch (l.cut) {
        case 2:   // largo: cae por detrás hasta los hombros
          add('hairL', 'head', [0, top - hh - 4, -hd / 2 - 1], [hw + 1, hh + 4, 2], [-(hw + 1) / 2, 0, 0], HC, (i, j, k, [w, h]) => !(j < 3 && (i === 0 || i === w - 1)));
          add('hairS', 'head', [0, top - 5, 0], [hw + 2, 5, hd - 2], [-(hw + 2) / 2, 0, -hd / 2 - 1], HC, (i, j, k, [w]) => i === 0 || i === w - 1);
          break;
        case 3:   // cresta
          if (!capped) add('hairM', 'head', [0, top, 0], [2, 3, hd + 1], [-1, 0, -(hd + 1) / 2], HC, (i, j, k, [w, h, d]) => !(j === h - 1 && (k === 0 || k === d - 1)) && !(j >= 1 && k === 0));
          break;
        case 4:   // coleta
          add('hairP', 'head', [0, top - 7, -hd / 2 - 1], [2, 6, 2], [-1, 0, -1], HC, (i, j) => !(j === 0 && i === 1));
          add('hairT', 'head', [0, top - 2, -hd / 2 - 1], [3, 2, 1], [-1.5, 0, 0], () => [0.8, 0.15, 0.15]);   // goma
          break;
        case 5:   // afro
          if (!capped) add('hairA', 'head', [0, top - 4, -0.5], [hw + 4, 7, hd + 3], [-(hw + 4) / 2, 0, -(hd + 3) / 2], HC,
            (i, j, k, [w, h, d]) => corner(i, k, w, d) > (j >= h - 2 ? 2 : 1) - 1 && !(k >= d - 3 && j < 4) && !(k >= d - 2 && j < 5));
          break;
        case 6:   // tupé
          if (!capped) add('hairQ', 'head', [0, top, hd / 2 - 3], [hw - 2, 2, 4], [-(hw - 2) / 2, 0, 0], HC, (i, j, k, [w, h, d]) => !(j === 1 && k < 1) && !(j === 1 && (i === 0 || i === w - 1)));
          break;
        case 7:   // melena: por los lados y detrás, a media altura
          add('hairS', 'head', [0, top - hh - 1, -0.5], [hw + 2, hh + 1, hd + 1], [-(hw + 2) / 2, 0, -(hd + 1) / 2], HC, (i, j, k, [w, h, d]) => (i === 0 || i === w - 1 || k === 0) && !(k === d - 1));
          break;
      }
      // ---- cabeza ----
      switch (l.hat) {
        case 1:   // gorra con visera
          add('hat', 'head', [0, top - 2, 0], [hw + 2, 3, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j === 0 ? dark(shirt, 0.8) : shirt), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j === h - 1 ? 1 : 0)));
          add('visor', 'head', [0, top - 2, hd / 2 + 1], [hw, 1, 3], [-hw / 2, 0, 0], () => dark(shirt, 0.55));
          break;
        case 2:   // casco militar
          add('hat', 'head', [0, top - 4, 0], [hw + 2, 5, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j === 0 ? [0.18, 0.2, 0.13] : [0.27, 0.31, 0.19]), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 2 ? 2 : 0)));
          break;
        case 3:   // gorro de lana con pompón
          add('hat', 'head', [0, top - 3, 0], [hw + 2, 4, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j === 0 ? [0.85, 0.85, 0.82] : (i + j) % 3 ? shirt : dark(shirt, 0.75)), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j === h - 1 ? 2 : 0)));
          add('pompom', 'head', [0, top + 1, 0], [2, 2, 2], [-1, 0, -1], () => [0.88, 0.88, 0.85]);
          break;
        case 4:   // capucha de la sudadera
          add('hat', 'head', [0, top - hh - 1, -1], [hw + 2, hh + 3, hd + 3], [-(hw + 2) / 2, 0, -(hd + 3) / 2], (i, j) => (j % 4 === 0 ? dark(shirt, 0.8) : dark(shirt, 0.92)),
            (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 2 ? 2 : 0)) && !(k >= d - 2 && i > 0 && i < w - 1 && j > 0 && j < h - 2));
          break;
        case 5:   // sombrero de ala ancha
          add('hat', 'head', [0, top - 1, 0], [hw, 4, hd], [-hw / 2, 0, -hd / 2], (i, j) => (j === 0 ? [0.12, 0.08, 0.05] : [0.36, 0.24, 0.14]), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j === h - 1 ? 1 : 0)));
          add('brim', 'head', [0, top - 1, 0], [hw + 6, 1, hd + 6], [-(hw + 6) / 2, 0, -(hd + 6) / 2], () => [0.32, 0.21, 0.12], (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= 2));
          break;
        case 6:   // cinta en la frente
          add('hat', 'head', [0, top - 4, 0], [hw + 1, 1, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], () => shirt, (i, j, k, [w, h, d]) => i === 0 || k === 0 || i === w - 1 || k === d - 1);
          add('knot', 'head', [0, top - 5, -hd / 2 - 1], [1, 3, 1], [0, 0, -1], () => shirt);
          break;
        case 7:   // casco de minero con linterna
          add('hat', 'head', [0, top - 3, 0], [hw + 2, 4, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j === 0 ? [0.75, 0.6, 0.12] : [0.92, 0.75, 0.18]), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j >= h - 1 ? 2 : 0)));
          add('lamp', 'head', [0, top - 2, hd / 2 + 1], [2, 2, 1], [-1, 0, 0], () => [1, 0.95, 0.7, 1]);
          break;
      }
      // ---- más peinados ----
      if (l.cut === 9) {   // dos coletas
        for (const sx of [-1, 1]) add(sx < 0 ? 'hairP' : 'hairP2', 'head', [sx * (hw / 2 + 1), top - 7, -1], [2, 5, 2], [-1, 0, -1], HC, (i, j) => !(j === 0 && i === 1));
      } else if (l.cut === 10 && !capped) {   // moño
        add('hairB', 'head', [0, top, -hd / 2 + 1], [4, 3, 4], [-2, 0, -2], HC, (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= 0));
      } else if (l.cut === 11) {   // rizos: casquete abultado con bucles sueltos
        add('hairC', 'head', [0, top - 4, 0], [hw + 2, capped ? 4 : 5, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], HC,
          (i, j, k, [w, h, d]) => (i === 0 || i === w - 1 || k === 0 || j >= 4) && !(k >= d - 2 && j < 4) && !(corner(i, k, w, d) <= (j >= 4 ? 1 : 0)) && M.hash3(i, j, k + 5) < (j >= 4 ? 0.9 : 0.75));
      } else if (l.cut === 12) {   // trenza larga a la espalda, con su lazo
        add('hairBr', 'head', [0, top - 15, -hd / 2 - 1], [2, 13, 2], [-1, 0, -1], (i, j, k) => (j % 3 === 0 ? [hair[0] * 0.7, hair[1] * 0.7, hair[2] * 0.7] : HC(i, j, k)), (i, j, k) => !(j % 3 === 0 && i === k));
        add('hairT', 'head', [0, top - 15, -hd / 2 - 1], [3, 1, 3], [-1.5, 0, -1.5], () => shirt);
      } else if (l.cut === 13 && !capped) {   // pinchos de punta
        add('hairSp', 'head', [0, top, 0], [hw, 3, hd], [-hw / 2, 0, -hd / 2], HC,
          (i, j, k) => j === 0 ? true : j === 1 ? (i + k) % 2 === 0 : i % 3 === 1 && k % 3 === 1);
      } else if (l.cut === 14) {   // flequillo recto sobre la frente y pelo corto por los lados
        add('hairF', 'head', [0, top - 3, hd / 2], [hw, 3, 1], [-hw / 2, 0, 0], HC, (i, j) => !(j === 0 && i % 3 === 1));
        add('hairS', 'head', [0, top - 4, 0], [hw + 2, 4, hd - 2], [-(hw + 2) / 2, 0, -hd / 2 - 1], HC, (i, j, k, [w]) => i === 0 || i === w - 1);
      } else if (l.cut === 15) {   // rastas: mechones gruesos que caen por los lados y la espalda
        add('hairR', 'head', [0, top - 13, 0], [hw + 2, 13, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2],
          (i, j, k) => { const c = HC(i, j, k), n = j % 4 === 0 ? 0.75 : 1; return [c[0] * n, c[1] * n, c[2] * n]; },
          (i, j, k, [w, h, d]) => (i === 0 || i === w - 1 || k === 0) && k < d - 3 && (j >= h - 4 || ((i + k) % 2 === 0 && j >= Math.floor(M.hash3(i, 0, k + 9) * 4))));
      } else if (l.cut === 16) {   // coleta alta: sale de lo alto de la coronilla y cae
        add('hairP', 'head', [0, top - 6, -hd / 2 - 2], [2, 7, 2], [-1, 0, -1], HC, (i, j) => !(j === 0 && i === 1));
        add('hairT', 'head', [0, top, -hd / 2 - 1], [3, 2, 2], [-1.5, 0, -1], () => [0.85, 0.2, 0.45]);
      } else if (l.cut === 17 && !capped) {   // raya al lado: más volumen a un lado y mechón sobre la frente
        add('hairSw', 'head', [0, top, 0], [hw + 1, 2, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], HC,
          (i, j, k, [w, h, d]) => j === 0 ? i !== 2 : i > 2 && !(corner(i, k, w, d) <= 0));
        add('hairF', 'head', [-1, top - 2, hd / 2], [5, 2, 1], [0, 0, 0], HC, (i, j) => !(j === 0 && i < 2));
      } else if (l.cut === 18 && !capped) {   // mohicano alto
        add('hairM', 'head', [0, top, 0], [2, 5, hd + 1], [-1, 0, -(hd + 1) / 2], HC, (i, j, k, [w, h, d]) => j < 2 || (k > 0 && k < d - 1 && j < h - ((k + 1) % 3 === 0 ? 0 : 1)));
      }
      // ---- más cosas en la cabeza ----
      const flower = (i, j, k) => [[0.95, 0.4, 0.55], [1, 0.85, 0.3], [0.6, 0.45, 0.95], [1, 1, 1]][(i * 3 + k * 5) % 4];
      switch (l.hat) {
        case 8:   // gorra al revés
          add('hat', 'head', [0, top - 2, 0], [hw + 2, 3, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j === 0 ? dark(shirt, 0.8) : shirt), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j === h - 1 ? 1 : 0)));
          add('visor', 'head', [0, top - 2, -hd / 2 - 4], [hw, 1, 3], [-hw / 2, 0, 0], () => dark(shirt, 0.55));
          break;
        case 9:   // bandana de lunares
          add('hat', 'head', [0, top - 3, 0], [hw + 1, 4, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], (i, j, k) => ((i + j * 2 + k) % 4 === 0 ? [0.95, 0.92, 0.88] : [0.75, 0.13, 0.12]),
            (i, j, k, [w, h, d]) => (j === h - 1 || i === 0 || i === w - 1 || k === 0 || (k === d - 1 && j >= 2)));
          add('knot', 'head', [0, top - 4, -hd / 2 - 1], [2, 3, 1], [-1, 0, -1], () => [0.75, 0.13, 0.12]);
          break;
        case 10:   // boina
          add('hat', 'head', [0.5, top, 0.5], [hw + 2, 2, hd + 2], [-(hw + 2) / 2, 0, -(hd + 2) / 2], (i, j) => (j ? [0.18, 0.17, 0.2] : [0.13, 0.12, 0.14]), (i, j, k, [w, h, d]) => !(corner(i, k, w, d) <= (j ? 2 : 1)));
          add('stem', 'head', [0.5, top + 2, 0.5], [1, 1, 1], [-0.5, 0, -0.5], () => [0.13, 0.12, 0.14]);
          break;
        case 11:   // lazo
          add('bow', 'head', [2, top - 1, 0], [5, 3, 2], [-2.5, 0, -1], (i) => (i === 2 ? [0.8, 0.25, 0.45] : [0.95, 0.45, 0.65]), (i, j) => i === 2 ? j === 1 : !((i === 1 || i === 3) && j !== 1));
          break;
        case 12:   // diadema
          add('hat', 'head', [0, top - 3, 1], [hw + 2, 4, 1], [-(hw + 2) / 2, 0, -0.5], () => shirt, (i, j, k, [w, h]) => i === 0 || i === w - 1 || j === h - 1);
          break;
        case 13:   // auriculares
          add('hat', 'head', [0, top, 0], [hw + 2, 1, 2], [-(hw + 2) / 2, 0, -1], (i, j, k, [w]) => (i === 0 || i === w - 1 ? [0.15, 0.15, 0.17] : [0.22, 0.22, 0.25]));
          for (const sx of [-1, 1]) {
            add(sx < 0 ? 'cupL' : 'cupR', 'head', [sx * (hw / 2 + 1), top - 5, 0], [1, 5, 1], [-0.5, 0, -0.5], () => [0.15, 0.15, 0.17]);
            add(sx < 0 ? 'padL' : 'padR', 'head', [sx * (hw / 2 + 1), top - 6, 0], [2, 3, 3], [-1, 0, -1.5], (i, j) => (j === 1 ? shirt : [0.12, 0.12, 0.13]));
          }
          break;
        case 14:   // orejas de gato
          for (const sx of [-1, 1]) add(sx < 0 ? 'earL' : 'earR', 'head', [sx * 2.5, top, 0], [3, 3, 1], [-1.5, 0, -0.5], (i, j) => (i === 1 && j === 0 ? [0.95, 0.6, 0.7] : hair), (i, j) => (j === 0) || (j === 1 && i !== (sx < 0 ? 2 : 0)) || (j === 2 && i === (sx < 0 ? 0 : 2)));
          break;
        case 15:   // corona de flores
          add('hat', 'head', [0, top - 1, 0], [hw + 1, 2, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], (i, j, k) => (j === 0 ? [0.25, 0.55, 0.2] : flower(i, j, k)),
            (i, j, k, [w, h, d]) => (i === 0 || k === 0 || i === w - 1 || k === d - 1) && (j === 0 || (i + k) % 2 === 0));
          break;
      }
      // ---- complemento ----
      const eyeY = top - Math.round(hh * 0.45);
      switch (l.extra) {
        case 1:   // gafas de sol
          add('glasses', 'head', [0, eyeY, hd / 2], [hw, 2, 1], [-hw / 2, 0, 0], (i) => (i === Math.floor(hw / 2) || i === Math.floor(hw / 2) - 1 ? [0.2, 0.2, 0.22] : [0.04, 0.04, 0.05]));
          break;
        case 2:   // mascarilla
          add('mask', 'head', [0, eyeY - 4, hd / 2], [hw - 2, 3, 1], [-(hw - 2) / 2, 0, 0], () => [0.62, 0.78, 0.86]);
          break;
        case 3:   // mochila
          add('pack', 'torso', [0, hipY + 2, -td / 2], [tw - 2, th - 3, 3], [-(tw - 2) / 2, 0, -3], (i, j) => (j === 3 ? [0.2, 0.17, 0.12] : (i === 0 || i === tw - 3) ? [0.22, 0.26, 0.16] : [0.3, 0.35, 0.21]), (i, j, k, [w, h, d]) => !(corner(i, j, w, h) <= 0));
          break;
        case 4:   // bufanda
          add('scarf', 'torso', [0, hipY + th - 2, 0], [tw + 1, 2, td + 1], [-(tw + 1) / 2, 0, -(td + 1) / 2], (i, j, k) => ((i + k) % 3 ? [0.8, 0.18, 0.15] : [0.9, 0.85, 0.8]), (i, j, k, [w, h, d]) => i === 0 || k === 0 || i === w - 1 || k === d - 1);
          add('scarfEnd', 'torso', [2, hipY + th - 6, td / 2 + 1], [2, 4, 1], [0, 0, 0], (i, j) => (j % 2 ? [0.8, 0.18, 0.15] : [0.9, 0.85, 0.8]));
          break;
        case 5:   // parche en el ojo
          add('patch', 'head', [hw / 2 - 3, eyeY, hd / 2], [2, 2, 1], [0, 0, 0], () => [0.05, 0.05, 0.05]);
          add('strap', 'head', [0, eyeY + 2, 0], [hw + 1, 1, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], () => [0.07, 0.07, 0.07], (i, j, k, [w, h, d]) => i === 0 || k === 0 || i === w - 1 || k === d - 1);
          break;
      }
      const fy = top - hh;   // fila de abajo de la cabeza (barbilla)
      switch (l.extra) {
        case 6:   // gafas redondas
          add('glasses', 'head', [0, fy + 4, hd / 2], [hw, 3, 1], [-hw / 2, 0, 0], () => [0.12, 0.1, 0.08],
            (i, j) => { const c = i < hw / 2 ? 2 : 5; return Math.abs(i - c) <= 1 && !(i === c && j === 1); });
          break;
        case 7:   // barba
          add('beard', 'head', [0, fy, hd / 2], [hw, 4, 1], [-hw / 2, 0, 0], (i, j, k) => [hair[0] * (0.9 + (i + j) % 2 * 0.1), hair[1], hair[2]],
            (i, j, k, [w]) => !(j === 2 && i >= w / 2 - 1 && i <= w / 2) && !(j === 3 && i > 1 && i < w - 2));
          break;
        case 8:   // bigote
          add('stache', 'head', [0, fy + 3, hd / 2], [4, 1, 1], [-2, 0, 0], () => hair);
          break;
        case 9:   // pendientes
          for (const sx of [-1, 1]) add(sx < 0 ? 'earringL' : 'earringR', 'head', [sx * (hw / 2 + 0.5), fy + 1, 0], [1, 2, 1], [-0.5, 0, -0.5], (i, j) => (j === 0 ? [1, 0.85, 0.3, 0.3] : [0.85, 0.7, 0.25]));
          break;
        case 10:   // máscara de hockey
          add('mask', 'head', [0, fy, hd / 2], [hw, 7, 1], [-hw / 2, 0, 0], (i, j) => ((i + j) % 3 === 0 && j < 4 ? [0.75, 0.15, 0.12] : [0.92, 0.9, 0.85]),
            (i, j) => !(j === 5 && (i === 2 || i === 5)) && !(j === 1 && (i === 2 || i === 5)));
          break;
        case 11:   // pintura de guerra
          add('paint', 'head', [0, fy + 2, hd / 2], [hw, 3, 1], [-hw / 2, 0, 0], (i, j) => (j === 1 ? [0.1, 0.1, 0.1] : [0.75, 0.12, 0.1]), (i, j, k, [w]) => (i <= 1 || i >= w - 2) && j !== 2 || (j === 2 && (i === 0 || i === w - 1)));
          break;
        case 12:   // pecas
          add('freckles', 'head', [0, fy + 3, hd / 2], [hw, 2, 1], [-hw / 2, 0, 0], () => dark(C('skin'), 0.7), (i, j) => (i === 1 || i === 2 || i === hw - 2 || i === hw - 3) && (i + j) % 2 === 0);
          break;
        case 13:   // collar
          add('necklace', 'torso', [0, hipY + th - 1, 0], [tw + 1, 1, td + 1], [-(tw + 1) / 2, 0, -(td + 1) / 2], () => [0.9, 0.75, 0.3, 0.15], (i, j, k, [w, h, d]) => (k === d - 1 || i === 0 || i === w - 1 || k === 0));
          add('pendant', 'torso', [0, hipY + th - 3, td / 2 + 0.5], [1, 2, 1], [-0.5, 0, 0], () => [0.4, 0.8, 1, 0.5]);
          break;
        case 14:   // gafas de esquí
          add('goggles', 'head', [0, fy + 4, hd / 2], [hw + 1, 2, 1], [-(hw + 1) / 2, 0, 0], (i) => (i === 0 || i === hw ? [0.12, 0.12, 0.13] : [0.95, 0.55, 0.15, 0.2]));
          add('strap', 'head', [0, fy + 4, 0], [hw + 1, 1, hd + 1], [-(hw + 1) / 2, 0, -(hd + 1) / 2], () => [0.12, 0.12, 0.13], (i, j, k, [w, h, d]) => i === 0 || k === 0 || i === w - 1);
          break;
      }
      // ---- falda o vestido: vuelo alrededor de la cadera ----
      if (l.bottom === 2 || l.top === 9) {
        const sc = l.top === 9 ? shirt : C('pants');
        add('skirt', 'torso', [0, hipY - 5, 0], [tw + 2, 6, td + 3], [-(tw + 2) / 2, 0, -(td + 3) / 2], (i, j) => (j === 0 ? dark(sc, 0.75) : (i + j) % 4 === 0 ? dark(sc, 0.88) : sc),
          (i, j, k, [w, h, d]) => (i === 0 || k === 0 || i === w - 1 || k === d - 1 || j === h - 1) && !(j < 2 && corner(i, k, w, d) <= 0));
      }
      return model;
    },
  };

  // Colores de la ropa vóxel a vóxel: estampados, mangas, cuellos, bolsillos, rotos…
  function dressFn(l, cfg) {
    const S = cfg.shirt, P = cfg.pants, K = cfg.skin;
    const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const H = (i, j, k) => M.hash3(i, j * 7 + 3, k * 13 + 1);
    const WHITE = [0.9, 0.9, 0.87], skin = (i, j, k) => mul(K, 0.96 + H(i, j, k) * 0.06);
    // estampado de la prenda de arriba en un punto (mismo en el pecho y en las mangas)
    const pat = (i, j, k) => {
      switch (l.top) {
        case 3: { const a = i % 4 === 0, b = j % 4 === 0; return a && b ? mul(S, 0.45) : a || b ? mul(S, 0.68) : (i + j) % 2 ? S : mul(S, 0.93); }   // cuadros
        case 4: return j % 3 === 0 ? WHITE : S;   // rayas
        case 7: return mul([0.32, 0.36, 0.24], 0.95 + H(i, j, k) * 0.1);   // camuflaje debajo del chaleco
        default: return mul(S, 0.95 + H(i, j, k) * 0.07);
      }
    };
    // largo de manga (fracción del brazo desde el hombro): 1 = hasta la muñeca, 0 = sin manga
    const sleeve = [0.3, 0.32, 1, 1, 1, 1, 0, 0.3, 0.22, 0][l.top] ?? 0.3;
    return (part, i, j, k, [w, h, d]) => {
      const c = (w - 1) / 2, front = k === d - 1, back = k === 0;
      if (part === 'torso') {
        if (l.top === 8 && j < 4) return skin(i, j, k);   // top corto: se ve la tripa
        if (j === 0 && l.top !== 9 && l.bottom !== 2) return l.bottom === 5 ? mul(P, 0.85) : [0.16, 0.12, 0.08];   // cinturón
        if (j === 0 && l.top === 9) return mul(S, 0.8);
        switch (l.top) {
          case 0: case 8: if (front && j >= h - 1 && Math.abs(i - c) < 1.6) return skin(i, j, k); break;   // cuello redondo
          case 1:   // polo: cuello y botones
            if (j >= h - 1 && (front || back || i === 0 || i === w - 1)) return mul(S, 0.75);
            if (front && Math.abs(i - c) < 0.6 && j >= h - 4) return j % 2 ? [0.9, 0.9, 0.9] : mul(S, 0.7);
            break;
          case 2:   // sudadera: bolsillo canguro y cordones
            if (front && j >= 2 && j <= 4 && i >= 2 && i <= w - 3) return mul(S, j === 4 ? 0.6 : 0.82);
            if (front && j >= h - 4 && j < h - 1 && (Math.round(c - 1) === i || Math.round(c + 1) === i)) return WHITE;
            if (j === 1) return mul(S, 0.75);
            break;
          case 5:   // chaqueta abierta sobre camiseta blanca, con cremallera
            if (front && Math.abs(i - c) < 1.6) return Math.abs(i - c) < 0.6 ? WHITE : (j % 2 ? [0.7, 0.7, 0.72] : mul(S, 0.6));
            if (j >= h - 2 && (front || i === 0 || i === w - 1)) return mul(S, 0.7);
            break;
          case 6:   // tirantes: hombros al aire
            if (j >= h - 1 && !(i === 1 || i === w - 2)) return skin(i, j, k);
            if (front && j >= h - 3 && Math.abs(i - c) < 1.6) return skin(i, j, k);
            break;
          case 7:   // chaleco táctico con bolsillos
            if ((front || back) && j >= 2 && j <= h - 2) return (front && j >= 2 && j <= 4 && i % 3 !== 2) ? [0.15, 0.17, 0.11] : (j === h - 2 ? [0.12, 0.13, 0.1] : [0.22, 0.25, 0.16]);
            break;
          case 9:   // vestido
            if (front && j >= h - 1 && Math.abs(i - c) < 1.6) return skin(i, j, k);
            if (j === 3) return mul(S, 0.75);
            break;
        }
        return pat(i, j, k);
      }
      if (part === 'arm') {
        if (j <= 1) return mul(K, 0.9);   // manos
        if (sleeve <= 0) return skin(i, j, k);
        const from = Math.round(h * (1 - sleeve)) + (sleeve >= 1 ? 2 : 0);
        if (j < from) return skin(i, j, k);
        if (j === from && sleeve < 1) return mul(l.top === 1 ? S : pat(i, j, k), 0.78);   // borde de la manga
        if (sleeve >= 1 && j === from && (l.top === 2 || l.top === 5)) return mul(S, 0.65);   // puño
        return pat(i, j, k + 30);
      }
      if (part === 'leg') {
        if (j <= 1) return null;   // zapatos (los pone el modelo)
        const knee = Math.round(h * 0.48);
        switch (l.bottom) {
          case 1: if (j < h * 0.55) return j === 2 ? WHITE : skin(i, j, k); return j <= Math.ceil(h * 0.55) ? mul(P, 0.8) : P;   // corto
          case 2: if (l.top !== 9) return j === 2 ? mul(K, 0.8) : skin(i, j, k); break;   // falda (la pone otra pieza)
          case 3:   // cargo: bolsillos a los lados
            if ((i === 0 || i === w - 1) && j >= knee + 1 && j <= knee + 4) return j === knee + 4 ? mul(P, 0.6) : mul(P, 0.82);
            return j === 2 ? mul(P, 0.7) : mul(P, 0.96 + H(i, j, k) * 0.06);
          case 4:   // vaquero roto
            if (k === d - 1 && Math.abs(j - knee) <= 1 && i > 0 && i < w - 1) return j === knee ? skin(i, j, k) : WHITE;
            if (k === d - 1 && j > knee + 3 && H(i, j, 7) < 0.12) return WHITE;
            return mix(P, WHITE, j > knee ? 0.18 : 0.08);
          case 5: return j === 2 ? mul(P, 0.7) : mul(P, 0.9);   // mallas
        }
        if (l.top === 9) return j === 2 ? mul(K, 0.8) : skin(i, j, k);   // vestido: piernas al aire
        return j === 2 ? mul(P, 0.7) : mul(P, 0.95 + H(i, j, k) * 0.06);
      }
      return null;
    };
  }

  VX.Look = Look;
})();
