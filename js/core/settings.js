// Ajustes del jugador (se guardan en localStorage).
(function () {
  const KEY = 'boxel_settings_v1';
  const DEFAULTS = {
    music: 0.55,
    sfx: 0.8,
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
    autoQuality: true,   // baja la calidad si caen los FPS
    enemyLocator: false, // flechas con la distancia a los últimos enemigos
    bloom: true,         // resplandor de luces y brillos
    ssao: true,          // oclusión ambiental (rincones más oscuros; calidad alta)
    touchMode: 'auto',   // controles táctiles: auto | on | off
    touchSens: 1.0,      // sensibilidad al apuntar con el dedo
    keys: { flashlight: 'KeyF', inspect: 'ControlLeft', knife: 'KeyV' },   // teclas configurables
  };
  const KEY_DEFAULTS = { ...DEFAULTS.keys };

  const Settings = {
    data: { ...DEFAULTS },

    load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY) || '{}');
        // v0.13: el cuchillo rápido vuelve a la V y la inspección pasa a Ctrl
        if (s.keys && !s.keysV13) { s.keys.knife = 'KeyV'; s.keys.inspect = 'ControlLeft'; s.keysV13 = true; }
        this.data = { ...DEFAULTS, ...s, keys: { ...KEY_DEFAULTS, ...(s.keys || {}) } };
        // primera vez en un móvil: calidad media (la automática la ajusta después)
        if (!localStorage.getItem(KEY) && window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) this.data.quality = 'media';
      } catch (e) { this.data = { ...DEFAULTS }; }
      return this.data;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    reset() { this.data = { ...DEFAULTS, keys: { ...KEY_DEFAULTS } }; this.save(); this.apply(); },

    // Tecla asignada a una acción
    key(action) { return (this.data.keys && this.data.keys[action]) || KEY_DEFAULTS[action]; },

    // Asigna una tecla; si otra acción la usaba, intercambia
    bind(action, code) {
      const k = this.data.keys;
      for (const a in k) if (a !== action && k[a] === code) k[a] = k[action];
      k[action] = code;
      this.save();
    },

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
      if (VX.Audio) VX.Audio.setVolume(d.sfx);
      if (VX.Music) VX.Music.setVolume(d.music);
      if (VX.Input) { VX.Input.sensitivity = 0.0022 * d.sensitivity; VX.Input.invertY = d.invertY; }
      if (VX.Renderer && VX.Renderer.gl) {
        VX.Renderer.fov = d.fov * Math.PI / 180;
        VX.Renderer.setQuality(d.quality, d.shadows);
        VX.Renderer.setPost(d.bloom && d.quality !== 'baja', d.ssao && d.quality === 'alta');
        if (VX.resetAutoQuality) VX.resetAutoQuality();
      }
      if (VX.Touch && VX.Touch.el) VX.Touch.apply();
      const fps = document.getElementById('fps');
      if (fps) fps.classList.toggle('hidden', !d.showFps);
    },
  };

  VX.Settings = Settings;
})();
