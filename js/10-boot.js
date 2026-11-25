/* ==========================================================================
   RIFTLIGHT — boot, fixed-step loop, focus protection, FPS
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL;
  const Boot = {
    running: false, acc: 0, last: 0, started: false, frames: 0, fpsTime: 0, fps: 60, raf: 0,
    init() {
      try {
        RL.Save.load();
        RL.I18n.setLang(RL.Save.data.profile.lang || 'zh-TW', true);
        RL.Themes.set(RL.Save.data.profile.theme || 'arcane', { animate: false });
        RL.Particles.setQuality(RL.Save.data.profile.quality || 'high');
        RL.Input.init();
        if (RL.Assets) RL.Assets.init();
        RL.Renderer.init(document.getElementById('game'));
        RL.Game.init();
        RL.Themes.set(RL.Save.data.profile.theme || 'arcane', { animate: false });
        RL.UI.init();
        RL.Editor.init();
        document.body.classList.toggle('high-contrast', !!RL.Save.data.profile.contrast);
        document.getElementById('fps').classList.toggle('hidden', !RL.Save.data.profile.showFps);
        RL.UI.showMenu();
        this.bindFocus();
        this.started = true;
        if (RL.Save.data.profile.showFps) RL.UI.toggleSetting;
      } catch (e) {
        RL.lastError = e;
        console.error('RIFTLIGHT boot error', e);
        const m = document.getElementById('menu');
        if (m) {
          const box = document.createElement('div');
          box.style.cssText = 'position:fixed;inset:0;display:grid;place-content:center;padding:20px;background:#070B1E;color:#E8ECFF;font:12px monospace;z-index:99;text-align:center';
          box.textContent = 'RIFTLIGHT failed to start. ' + (e && e.message ? e.message : '');
          document.body.appendChild(box);
        }
      }
    },
    bindFocus() {
      const pause = () => {
        if (RL.Game && (RL.Game.phase === 'playing' || RL.Game.phase === 'dead') && !RL.Game.paused) RL.Game.togglePause(true);
        if (RL.Audio) RL.Audio.suspend();
      };
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
        else { if (RL.Audio) RL.Audio.resume(); }
      });
      window.addEventListener('blur', pause);
      window.addEventListener('focus', () => { if (RL.Audio) RL.Audio.resume(); });
      window.addEventListener('beforeunload', () => { RL.Save.save(); });
    },
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      const loop = (now) => {
        this.raf = requestAnimationFrame(loop);
        this.tick(now);
      };
      this.raf = requestAnimationFrame(loop);
    },
    tick(now) {
      let delta = Math.max(0, (now - this.last) / 1000);
      this.last = now;
      if (delta > .1) delta = .1;
      this.acc += delta;
      let steps = 0;
      while (this.acc >= RL.CFG.TIME_STEP && steps < 6) {
        try { RL.Game.update(RL.CFG.TIME_STEP); }
        catch (e) { RL.lastError = e; console.error(e); }
        this.acc -= RL.CFG.TIME_STEP;
        steps++;
      }
      try { RL.Renderer.render(now / 1000); } catch (e) { RL.lastError = e; console.error(e); }
      this.frames++;
      this.fpsTime += delta;
      if (this.fpsTime >= .5) {
        this.fps = Math.round(this.frames / this.fpsTime);
        this.frames = 0; this.fpsTime = 0;
        const f = document.getElementById('fps');
        if (f && RL.Save.data.profile.showFps) { f.textContent = this.fps + ' FPS'; f.classList.remove('hidden'); }
      }
    },
    step(ms) {
      this.last = performance.now();
      this.tick(this.last + (ms || 16.666));
    },
    pauseAudio() { if (RL.Audio) RL.Audio.suspend(); },
    resumeAudio() { if (RL.Audio) RL.Audio.resume(); }
  };
  RL.Boot = Boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { Boot.init(); Boot.start(); });
  else { Boot.init(); Boot.start(); }
})();
