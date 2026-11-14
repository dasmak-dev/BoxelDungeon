// Detalle del suelo de la mazmorra, hecho de bloques (se rompe, se dispersa con las explosiones y,
// si queda sin apoyo, se cae): montones de escombros, huesos, setas, mineral, escoria, cristales…
// según el bioma. En calidad alta hay más; en baja, menos.
(function () {
  const M = VX.M;

  function scatter(r) {
    if (!r.ceilPlan || r.type === 'shop' || r.type === 'save' || r.type === 'map') return;
    const B = VX.Blocks, W = r.W, D = r.D, zone = r.zone || 0;
    const q = (VX.Renderer && VX.Renderer.quality) || 'media';
    const dens = (q === 'alta' ? 1 : q === 'media' ? 0.7 : 0.4) * ((VX.Touch && VX.Touch.on) ? 0.7 : 1);
    const hazard = new Uint8Array(W * D);
    for (const sp of r.spikes) for (let z = sp.uz0 * 2; z < (sp.uz1 + 1) * 2; z++) for (let x = sp.ux0 * 2; x < (sp.ux1 + 1) * 2; x++) if (x >= 0 && z >= 0 && x < W && z < D) hazard[z * W + x] = 1;
    const ok = (x, z) => x >= 5 && z >= 5 && x < W - 5 && z < D - 5 && !hazard[z * W + x] && !r.isReservedU(x >> 1, z >> 1) && !r.get(x, 0, z) && !r.get(x, 1, z) && !(r.occ && r.occ[z * W + x]);
    const put = (x, y, z, t) => { if (r.inBounds(x, y, z) && !r.get(x, y, z) && (y === 0 ? ok(x, z) : r.get(x, y - 1, z))) r.set(x, y, z, t); };
    // montón irregular: más alto en el centro
    const pile = (x, z, rad, hMax, pickT) => {
      for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
        const d = Math.hypot(dx, dz) / (rad + 0.5);
        if (d > 1 || Math.random() < d * 0.6) continue;
        const h = Math.max(1, Math.round((1 - d) * hMax + Math.random() * 0.6));
        for (let y = 0; y < h; y++) put(x + dx, y, z + dz, pickT(y, d));
      }
    };
    const N = Math.round((W * D) / 240 * dens);
    for (let n = 0; n < N; n++) {
      const x = M.randInt(5, W - 6), z = M.randInt(5, D - 6);
      if (!ok(x, z)) continue;
      const k = Math.random();
      switch (zone) {
        case 0:   // cripta: huesos, calaveras, cascotes y lápidas rotas
          if (k < 0.4) pile(x, z, M.randInt(1, 2), 2, () => (Math.random() < 0.8 ? B.BONE : B.CSTONE));
          else if (k < 0.6) { for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let y = 0; y < 2; y++) put(x + dx, y, z + dz, B.BONE); }
          else if (k < 0.8) pile(x, z, M.randInt(1, 3), 2, () => B.CSTONE);
          else { const a = Math.random() < 0.5; for (let i = 0; i < 3; i++) for (let y = 0; y < (i === 1 ? 3 : 2); y++) put(x + (a ? i : 0), y, z + (a ? 0 : i), B.STONE); }
          break;
        case 1:   // cloacas: ladrillos caídos, musgo, tramos de tubería
          if (k < 0.45) pile(x, z, M.randInt(1, 3), 2, () => (Math.random() < 0.75 ? B.BRICK : B.MOSS));
          else if (k < 0.75) pile(x, z, M.randInt(2, 3), 1, () => B.MOSS);
          else { const a = Math.random() < 0.5; for (let i = 0; i < M.randInt(3, 6); i++) put(x + (a ? i : 0), 0, z + (a ? 0 : i), B.STEEL); }
          break;
        case 2:   // minas: rocas con mineral, tablones sueltos
          if (k < 0.6) pile(x, z, M.randInt(1, 3), 3, (y, d) => (Math.random() < 0.15 ? B.MCRYST : B.CROCK));
          else { const a = Math.random() < 0.5; for (let i = 0; i < M.randInt(3, 6); i++) put(x + (a ? i : 0), 0, z + (a ? 0 : i), B.PLANK); }
          break;
        case 3:   // forja: escoria con brasas y chatarra
          if (k < 0.6) pile(x, z, M.randInt(1, 2), 2, (y) => (y === 0 && Math.random() < 0.3 ? B.EMBER : B.CDARK));
          else pile(x, z, 1, 2, () => B.STEEL);
          break;
        case 4:   // jardín: setas pequeñas, montículos de musgo y raíces
          if (k < 0.45) { const h = M.randInt(1, 3); for (let y = 0; y < h; y++) put(x, y, z, B.DEADWOOD); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(x + dx, h, z + dz, Math.random() < 0.5 ? B.FGLOW : B.GLOWLEAF); }
          else if (k < 0.75) pile(x, z, M.randInt(2, 3), 1, () => B.MOSS);
          else { let cx = x, cz = z; for (let i = 0; i < M.randInt(5, 10); i++) { put(cx, 0, cz, B.BARK); if (Math.random() < 0.5) cx += Math.random() < 0.5 ? 1 : -1; else cz += Math.random() < 0.5 ? 1 : -1; } }
          break;
        default:  // vacío: esquirlas de cristal y roca oscura
          if (k < 0.5) { const h = M.randInt(1, 4); for (let y = 0; y < h; y++) put(x, y, z, B.VCRYST); if (Math.random() < 0.5) put(x + 1, 0, z, B.VCRYST); }
          else pile(x, z, M.randInt(1, 2), 2, () => (Math.random() < 0.85 ? B.CDARK : B.VCRYST));
      }
    }
    r.walk = null;
  }

  VX.FloorDetail = { scatter };
})();
