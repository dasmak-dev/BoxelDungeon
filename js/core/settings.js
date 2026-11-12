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
  };

  const Settings = {
    data: { ...DEFAULTS },

    load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY) || '{}');
        this.data = { ...DEFAULTS, ...s };
      } catch (e) { this.data = { ...DEFAULTS }; }
      return this.data;
    },

    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    },

    reset() { this.data = { ...DEFAULTS }; this.save(); this.apply(); },

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
      }
      const fps = document.getElementById('fps');
      if (fps) fps.classList.toggle('hidden', !d.showFps);
    },
  };

  VX.Settings = Settings;
})();
