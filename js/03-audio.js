/* ==========================================================================
   RIFTLIGHT — procedural Web Audio: SFX + generative layered BGM
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL;
  const A = {
    ctx: null, master: null, comp: null, bgm: null, sfx: null,
    muted: false, bgmVol: .62, sfxVol: .78, ready: false,
    nextNote: 0, step: 0, intensity: 0, scene: 'menu', boss: false, _noise: null, _lastHover: 0,
    _unlocked: false
  };

  function now() { return A.ctx ? A.ctx.currentTime : 0; }

  A.ensure = function () {
    if (A.ctx) return true;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    try {
      A.ctx = new C();
      A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 1;
      A.comp = A.ctx.createDynamicsCompressor();
      A.comp.threshold.value = -18; A.comp.knee.value = 18; A.comp.ratio.value = 4; A.comp.attack.value = .004; A.comp.release.value = .18;
      A.bgm = A.ctx.createGain(); A.bgm.gain.value = A.bgmVol;
      A.sfx = A.ctx.createGain(); A.sfx.gain.value = A.sfxVol;
      A.bgm.connect(A.master); A.sfx.connect(A.master); A.master.connect(A.comp); A.comp.connect(A.ctx.destination);
      A.nextNote = now() + .15;
      A.ready = true;
      return true;
    } catch (e) { A.ready = false; return false; }
  };

  A.unlock = function () {
    if (A._unlocked) { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); return; }
    if (!A.ensure()) return;
    A._unlocked = true;
    if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
    A.nextNote = now() + .1;
    A.setVolumes(A.bgmVol, A.sfxVol, A.muted);
    if (RL.Save && RL.Save.data) {
      const p = RL.Save.data.profile;
      A.setVolumes(p.bgm == null ? A.bgmVol : p.bgm, p.sfx == null ? A.sfxVol : p.sfx, !!p.muted);
    }
  };

  A.setVolumes = function (bgm, sfx, muted) {
    if (bgm != null) A.bgmVol = RL.Util.clamp(bgm, 0, 1);
    if (sfx != null) A.sfxVol = RL.Util.clamp(sfx, 0, 1);
    if (muted != null) A.muted = !!muted;
    if (A.bgm) A.bgm.gain.setTargetAtTime(A.muted ? 0 : A.bgmVol, now(), .04);
    if (A.sfx) A.sfx.gain.setTargetAtTime(A.muted ? 0 : A.sfxVol, now(), .03);
    if (A.master) A.master.gain.setTargetAtTime(A.muted ? 0 : 1, now(), .03);
    if (RL.Save && RL.Save.data) { RL.Save.data.profile.bgm = A.bgmVol; RL.Save.data.profile.sfx = A.sfxVol; RL.Save.data.profile.muted = A.muted; RL.Save.queue(); }
    RL.Bus.emit('audio:volume', { bgm: A.bgmVol, sfx: A.sfxVol, muted: A.muted });
  };

  A.toggleMute = function () {
    A.setVolumes(null, null, !A.muted);
    if (!A.muted) A.sfx && A.play('select');
    return A.muted;
  };

  A.suspend = function () {
    if (!A.ctx) return;
    try { A.ctx.suspend(); } catch (e) {}
  };
  A.resume = function () {
    if (!A.ctx) return;
    try { A.ctx.resume(); A.nextNote = now() + .1; } catch (e) {}
  };

  function osc(type, freq, dur, gain, when, slideTo, filter) {
    if (!A.ctx) return;
    try {
      const t = when == null ? now() : when;
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain || .1), t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      let node = o;
      if (filter) {
        const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter;
        node.connect(f); node = f;
      }
      node.connect(g); g.connect(A.sfx);
      o.start(t); o.stop(t + dur + .02);
    } catch (e) {}
  }

  function noise(dur, gain, freq, when, type) {
    if (!A.ctx) return;
    try {
      if (!A._noise) {
        const len = Math.floor(A.ctx.sampleRate * 1.2);
        A._noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const data = A._noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      const t = when == null ? now() : when;
      const src = A.ctx.createBufferSource(); src.buffer = A._noise;
      const f = A.ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq || 800; f.Q.value = .7;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(gain || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(A.sfx);
      src.start(t); src.stop(t + dur + .03);
    } catch (e) {}
  }

  const SFX = {
    jump: () => { osc('square', 340, .09, .06, null, 640, 2000); noise(.05, .018, 1800); },
    land: () => { osc('sine', 110, .12, .09, null, 48); noise(.06, .03, 320, null, 'lowpass'); },
    dash: (n) => { const p = 1 + Math.min(6, n || 0) * .045; osc('sawtooth', 760 * p, .15, .05, null, 120 * p, 2600); noise(.11, .045, 1300); },
    step: () => { osc('sine', 130 + Math.random()*20, .035, .018, null, 90, 500); noise(.025, .012, 600); },
    wall: () => { osc('triangle', 220, .07, .045, null, 160); noise(.045, .02, 2400); },
    grab: () => { noise(.08, .025, 900); osc('sine', 180, .06, .025); },
    shard: (n) => { const p = 1 + ((n || 0) % 7) * .06; osc('sine', 880 * p, .13, .05); osc('sine', 1320 * p, .1, .025, now() + .03); },
    crystal: () => { osc('triangle', 1040, .12, .05); osc('sine', 1560, .1, .025, now() + .03); },
    checkpoint: () => { [523, 659, 784].forEach((f, i) => osc('sine', f, .28, .05, now() + i * .07)); },
    death: () => { osc('sawtooth', 340, .3, .06, null, 55, 900); noise(.25, .04, 500); },
    burst: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => osc('triangle', f, .3, .04, now() + i * .035)); noise(.35, .055, 1600); },
    beacon: () => { [392, 523, 659, 784].forEach((f, i) => osc('sine', f, .55, .05, now() + i * .09)); },
    ui: () => { osc('square', 660, .035, .028, null, 720, 1200); },
    hover: () => { const t = performance.now(); if (t - A._lastHover < 55) return; A._lastHover = t; osc('sine', 1280, .028, .012); },
    select: () => { osc('square', 520, .05, .03, null, 660, 1400); },
    error: () => { osc('square', 170, .13, .04, null, 120, 700); },
    reaction: () => { [660, 880, 1100].forEach((f, i) => osc('triangle', f, .16, .03, now() + i * .045)); },
    portal: () => { osc('sine', 260, .25, .05, null, 780); },
    spring: () => { osc('triangle', 180, .18, .06, null, 560); },
    thunder: () => { noise(.28, .08, 420, null, 'lowpass'); osc('sawtooth', 72, .25, .04); },
    fire: () => { noise(.14, .028, 760); },
    boss: () => { osc('sawtooth', 60, .6, .05, null, 38, 400); noise(.4, .04, 180, null, 'lowpass'); },
    perfect: () => { osc('sine', 1568, .1, .03); osc('sine', 2093, .12, .02, now() + .05); },
    unlock: () => { [523, 784, 1046, 1568].forEach((f, i) => osc('sine', f, .4, .04, now() + i * .07)); }
  };

  A.play = function (name, arg) {
    if (!A.ready || A.muted) return;
    try { (SFX[name] || SFX.ui)(arg); } catch (e) {}
  };

  A.setScene = function (scene, intensity) {
    if (scene) A.scene = scene;
    if (intensity != null) A.intensity = RL.Util.clamp(intensity, 0, 1);
    if (A.ctx) A.nextNote = Math.max(A.nextNote, now() + .03);
  };

  const SCALES = {
    arcane: [146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25],
    retro: [130.81, 164.81, 196, 220, 261.63, 329.63, 392, 440, 523.25, 659.25],
    cyber: [110, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 440, 523.25],
    paper: [174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33]
  };

  function bgmTone(freq, dur, type, gain, delay) {
    if (!A.ctx) return;
    try {
      const t = now() + (delay || 0);
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + .03);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(A.bgm); o.start(t); o.stop(t + dur + .03);
    } catch (e) {}
  }

  A.update = function (dt) {
    if (!A.ready || !A.ctx || A.muted) return;
    if (A.ctx.state === 'suspended') return;
    const scale = SCALES[(RL.Themes && RL.Themes.activeId) || 'arcane'];
    const stepDur = 60 / (96 + A.intensity * 34) / 4;
    const horizon = now() + .22;
    let guard = 0;
    while (A.nextNote < horizon && guard++ < 12) {
      const when = A.nextNote;
      const step = A.step++;
      const bar = Math.floor(step / 16) % 4;
      const menu = A.scene === 'menu';
      const quiet = menu ? .7 : 1;
      if (step % 8 === 0) bgmTone(scale[(bar * 2 + 1) % scale.length] / 2, .65, 'sine', .024 * quiet, 0);
      if (step % 16 === 0) {
        bgmTone(scale[(bar + 2) % scale.length] / 2, 1.2, 'triangle', .012 * quiet, 0);
        bgmTone(scale[(bar + 4) % scale.length] / 2, 1.2, 'triangle', .009 * quiet, 0);
      }
      if (step % 2 === 0 && (A.intensity > .18 || menu)) {
        const n = scale[(step * 3 + bar) % scale.length];
        bgmTone(n * (step % 8 === 0 ? 1 : 2), .18, A.scene === 'boss' ? 'sawtooth' : 'triangle', (.007 + A.intensity * .009) * quiet, 0);
      }
      if (A.intensity > .55 && step % 4 === 2) {
        const bp = A.ctx.createBufferSource();
        try {
          if (!A._noise) { noise(.01, .001, 1000); }
          bp.buffer = A._noise;
          const f = A.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000;
          const g = A.ctx.createGain(); g.gain.setValueAtTime(.012 * A.intensity, when); g.gain.exponentialRampToValueAtTime(.0001, when + .06);
          bp.connect(f); f.connect(g); g.connect(A.bgm); bp.start(when); bp.stop(when + .07);
        } catch (e) {}
      }
      A.nextNote += stepDur;
    }
    if (A.nextNote < now() - .5) A.nextNote = now() + .1;
  };

  RL.Audio = A;
})();
