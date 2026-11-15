// Ajustes del jugador (se guardan en localStorage).
(function () {
  const KEY = 'boxel_settings_v1';
  const DEFAULTS = {
    master: 1,           // volumen general
    music: 0.55,
    sfx: 0.8,
    ambVol: 1,           // volumen del ambiente (fondo de cada bioma, goteos, cadenas…), sobre «Efectos»
    enemyVol: 1,         // volumen de los enemigos (gruñidos, pasos, ataques), sobre «Efectos»
    sensitivity: 1.0,
    invertY: false,
    fov: 75,
    quality: 'alta',   // alta | media | baja
    shadows: true,
    showFps: false,
    autoRun: false,      // correr siempre (Shift para andar)
    hurtFx: true,        // efectos de pantalla al recibir daño
    torchShadows: true,  // la antorcha más cercana proyecta sombras (calidad alta)
    dust: true,          // motas de polvo en el haz de la linterna
    groundFog: true,     // niebla baja a ras de suelo en la mazmorra
    soundViz: false,     // indicadores en pantalla de dónde vienen los sonidos
    autoQuality: true,   // baja la calidad si caen los FPS
    enemyLocator: false, // flechas con la distancia a los últimos enemigos
    bloom: true,         // resplandor de luces y brillos
    ssao: true,          // oclusión ambiental (rincones más oscuros; calidad alta)
    touchMode: 'auto',   // controles táctiles: auto | on | off
    touchSens: 1.0,      // sensibilidad al apuntar con el dedo
    padSens: 1.0,        // sensibilidad del stick derecho del mando
    aimAssist: true,     // la mira se frena y se pega un poco a los enemigos (sólo táctil)
    vibrate: true,       // vibración del móvil al disparar, recibir daño y con las explosiones
    fpsCap: 0,           // 0 = sin límite, 60 o 30
    batterySaver: false, // 30 FPS y menos resolución (móvil con poca batería)
    uiScale: 1,          // tamaño de la interfaz de juego (HUD)
    brightness: 1,       // brillo (aclara las sombras sin quemar las luces); en el móvil empieza en 1,35
    colorblind: false,   // modo para daltónicos: símbolos además de colores (llaves, mapa…)
    keys: {   // teclas configurables (todas salvo 1·2·3, la rueda, las flechas y Esc)
      fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', run: 'ShiftLeft', dash: 'KeyC',
      reload: 'KeyR', use: 'KeyE', prev: 'KeyQ', map: 'KeyM', wave: 'KeyG', pause: 'KeyP',
      flashlight: 'KeyF', inspect: 'ControlLeft', knife: 'KeyV', throw: 'KeyT', throwNext: 'KeyB',
    },
  };
  const KEY_DEFAULTS = { ...DEFAULTS.keys };
  // preajustes de gráficos
  const PRESETS = {
    movil: { quality: 'media', shadows: false, torchShadows: false, ssao: false, bloom: false, dust: false, groundFog: false, autoQuality: true, fpsCap: 60 },
    pc: { quality: 'alta', shadows: true, torchShadows: true, ssao: true, bloom: true, dust: true, groundFog: true, autoQuality: true, fpsCap: 0 },
  };

  const Settings = {
    data: { ...DEFAULTS },

    load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY) || '{}');
        // v0.13: el cuchillo rápido vuelve a la V y la inspección pasa a Ctrl
        if (s.keys && !s.keysV13) { s.keys.knife = 'KeyV'; s.keys.inspect = 'ControlLeft'; s.keysV13 = true; }
        this.data = { ...DEFAULTS, ...s, keys: { ...KEY_DEFAULTS, ...(s.keys || {}) } };
        // en el móvil, la primera vez (y una vez para quien ya jugaba antes de la 0.40) se pone el
        // preajuste de móvil: así va fluido sin tener que tocar nada
        if (this.isMobile() && !s.mobilePreset) { Object.assign(this.data, PRESETS.movil); this.data.mobilePreset = 1; this.save(); }
        // 0.46: en el móvil se veía muy oscuro: se sube el brillo una vez (luego se puede ajustar)
        if (this.isMobile() && !s.mobileBright) { this.data.brightness = 1.45; this.data.mobileBright = 1; this.save(); }
      } catch (e) { this.data = { ...DEFAULTS }; }
      return this.data;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    reset() { this.data = { ...DEFAULTS, keys: { ...KEY_DEFAULTS } }; if (this.isMobile()) Object.assign(this.data, PRESETS.movil, { mobilePreset: 1, brightness: 1.45, mobileBright: 1 }); this.save(); this.apply(); },
    PRESETS,
    preset(name) { Object.assign(this.data, PRESETS[name]); this.save(); this.apply(); },
    // ¿móvil o tableta? (pantalla táctil sin ratón, o lo dice el navegador)
    isMobile() {
      try {
        const mm = window.matchMedia;
        return !!((mm && mm('(pointer: coarse)').matches && !mm('(any-pointer: fine)').matches) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''));
      } catch (e) { return false; }
    },

    // Tecla asignada a una acción
    key(action) { return (this.data.keys && this.data.keys[action]) || KEY_DEFAULTS[action]; },

    // Asigna una tecla; si otra acción la usaba, intercambia
    bind(action, code) {
      const k = this.data.keys;
      for (const a in k) if (a !== action && k[a] === code) k[a] = k[action];
      k[action] = code;
      this.save();
    },

    // nombre de una llave (con su símbolo en el modo para daltónicos)
    keyColorName(c) { return { wood: 'de madera', silver: 'de plata', gold: 'de oro' }[c] || ''; },

    // «[E]»: la tecla de una acción entre corchetes, para los textos de ayuda
    tag(action) { return '[' + this.keyName(this.key(action)) + ']'; },

    // Nombre legible de una tecla
    keyName(code) {
      if (!code) return '—';
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      const N = { Space: 'Espacio', ShiftLeft: 'Shift izq.', ShiftRight: 'Shift dcho.', ControlLeft: 'Ctrl', ControlRight: 'Ctrl dcho.', AltLeft: 'Alt', Tab: 'Tab', CapsLock: 'Bloq Mayús', Backquote: 'º', Minus: '-', Equal: '=' };
      return N[code] || code;
    },

    set(key, value) { this.data[key] = value; this.save(); this.apply(); },

    // Aplica los ajustes a los sistemas
    apply() {
      const d = this.data;
      if (VX.Audio) { if (VX.Audio.setMaster) VX.Audio.setMaster(d.master ?? 1); VX.Audio.setVolume(d.sfx); if (VX.Audio.setBusVolumes) VX.Audio.setBusVolumes(d.ambVol ?? 1, d.enemyVol ?? 1); }
      if (VX.Music) VX.Music.setVolume(d.music);
      if (VX.Input) { VX.Input.sensitivity = 0.0022 * d.sensitivity; VX.Input.invertY = d.invertY; }
      if (VX.Renderer) VX.Renderer.brightness = d.brightness || 1;
      if (VX.Renderer && VX.Renderer.gl) {
        VX.Renderer.fov = d.fov * Math.PI / 180;
        VX.Renderer.setQuality(d.quality, d.shadows);
        VX.Renderer.setPost(d.bloom && d.quality !== 'baja', d.ssao && d.quality === 'alta');
        if (VX.resetAutoQuality) VX.resetAutoQuality();
      }
      if (VX.Touch && VX.Touch.el) VX.Touch.apply();
      const hud = document.getElementById('hud');
      if (hud) hud.style.zoom = d.uiScale || 1;
      document.body.classList.toggle('cb', !!d.colorblind);
      const fps = document.getElementById('fps');
      if (fps) fps.classList.toggle('hidden', !d.showFps);
    },
  };

  VX.Settings = Settings;
})();
