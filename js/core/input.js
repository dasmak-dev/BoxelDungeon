// Teclado, ratón y pointer lock.
(function () {
  const Input = {
    keys: {},
    pressed: {},      // pulsadas este frame
    mouseDown: false,
    mouseClicked: false,
    rightClicked: false,
    dx: 0, dy: 0,
    wheel: 0,
    locked: false,
    sensitivity: 0.0022,
    invertY: false,
    canvas: null,
    onLockChange: null,
  };

  Input.init = function (canvas) {
    Input.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!Input.keys[e.code]) Input.pressed[e.code] = true;
      Input.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      // con el ratón capturado, evita los atajos del navegador con Ctrl (salvo Ctrl+W, que el navegador no deja bloquear)
      if (Input.locked && (e.ctrlKey || e.code.startsWith('Control'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
    window.addEventListener('blur', () => { Input.keys = {}; Input.mouseDown = false; Input.rightDown = false; });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { Input.mouseDown = true; Input.mouseClicked = true; }
      if (e.button === 2) { Input.rightClicked = true; Input.rightDown = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) Input.mouseDown = false; if (e.button === 2) Input.rightDown = false; });
    window.addEventListener('mousemove', (e) => {
      if (!Input.locked) return;
      // Ignora saltos enormes (bug conocido de algunos navegadores al bloquear)
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      Input.dx += e.movementX;
      Input.dy += e.movementY;
    });
    window.addEventListener('wheel', (e) => { if (Input.locked) Input.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === canvas;
      if (!Input.locked) { Input.mouseDown = false; Input.keys = {}; }
      if (Input.onLockChange) Input.onLockChange(Input.locked);
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  Input.lock = function () {
    const c = Input.canvas;
    if (!c || !c.requestPointerLock) return;
    try {
      const p = c.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { c.requestPointerLock(); } catch (e) {} });
    } catch (e) {
      try { c.requestPointerLock(); } catch (e2) {}
    }
  };

  Input.unlock = function () {
    if (document.exitPointerLock) document.exitPointerLock();
  };

  Input.isDown = (code) => !!Input.keys[code];
  Input.wasPressed = (code) => !!Input.pressed[code];

  // Llamar al final de cada frame
  Input.endFrame = function () {
    Input.pressed = {};
    Input.mouseClicked = false;
    Input.rightClicked = false;
    Input.dx = 0; Input.dy = 0;
    Input.wheel = 0;
  };

  VX.Input = Input;
})();
