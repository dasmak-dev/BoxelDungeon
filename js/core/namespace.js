// Espacio de nombres global. Se usan scripts clásicos (no módulos) para que
// el juego funcione abriendo index.html directamente desde el disco (file://).
window.VX = window.VX || {};

VX.S = 0.25;   // tamaño de un vóxel del mundo (metros)
VX.K = 2;      // vóxeles por "unidad" de diseño de sala
VX.U = 0.5;    // tamaño de una unidad de diseño (metros)

// Versión del juego (ver CHANGELOG.md). Formato semántico: MAYOR.MENOR.PARCHE
VX.VERSION = '0.26.0';
