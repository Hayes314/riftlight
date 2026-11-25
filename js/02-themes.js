/* ==========================================================================
   RIFTLIGHT — four visual themes + smooth canvas palette transition
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util;
  const THEMES = {
    arcane: {
      id: 'arcane', name: { tw: '秘法霓虹', cn: '秘法霓虹', en: 'Arcane Neon' }, light: false,
      bg0: '#070B1E', bg1: '#121A3A', far: '#1B2450', mid: '#2A2F6B', tile: '#39408C', tileHi: '#7C5CFF',
      player: '#F5F3FF', player2: '#22D3EE', accent: '#22D3EE', accent2: '#7C5CFF', hazard: '#FF4D8D',
      collect: '#FFD166', text: '#E8ECFF', dim: '#9AA6D6', particle: '#A78BFA', glass: 'rgba(18,24,56,.55)',
      glow: '#22D3EE', fog: '#0B1230', boss: '#FF4D8D', bloom: true, scan: false, grain: false
    },
    retro: {
      id: 'retro', name: { tw: '復古餘暉', cn: '复古余晖', en: 'Retro Afterglow' }, light: false,
      bg0: '#100B1E', bg1: '#2A1638', far: '#3B1F47', mid: '#5A2A4A', tile: '#7A3B4A', tileHi: '#F2C14E',
      player: '#FFF3D6', player2: '#4D9DE0', accent: '#F2C14E', accent2: '#4D9DE0', hazard: '#F78154',
      collect: '#7BD389', text: '#F6E7C1', dim: '#C39E8F', particle: '#F2C14E', glass: 'rgba(30,15,40,.60)',
      glow: '#F2C14E', fog: '#1B1028', boss: '#F78154', bloom: false, scan: true, grain: false
    },
    cyber: {
      id: 'cyber', name: { tw: '賽博暗域', cn: '赛博暗域', en: 'Cyber Noir' }, light: false,
      bg0: '#02040A', bg1: '#07111F', far: '#0A1524', mid: '#101F30', tile: '#162A3B', tileHi: '#00E5FF',
      player: '#E6FAFF', player2: '#FF2E63', accent: '#00E5FF', accent2: '#FF2E63', hazard: '#FF9F1C',
      collect: '#9D4EDD', text: '#D7E1EA', dim: '#6D8499', particle: '#00E5FF', glass: 'rgba(7,17,31,.62)',
      glow: '#00E5FF', fog: '#040A14', boss: '#FF2E63', bloom: true, scan: true, grain: false
    },
    paper: {
      id: 'paper', name: { tw: '紙白晝夢', cn: '纸白昼梦', en: 'Paper Daylight' }, light: true,
      bg0: '#F7F2E8', bg1: '#E9E0D1', far: '#E2D7C5', mid: '#D6C9B5', tile: '#C8BAA5', tileHi: '#3A3733',
      player: '#2B2B2B', player2: '#C8553D', accent: '#C8553D', accent2: '#3A3733', hazard: '#B23A48',
      collect: '#B8862F', text: '#2B2B2B', dim: '#6F675C', particle: '#C8553D', glass: 'rgba(255,252,245,.62)',
      glow: '#C8553D', fog: '#EFE8DC', boss: '#B23A48', bloom: false, scan: false, grain: true
    }
  };
  const ids = ['arcane', 'retro', 'cyber', 'paper'];
  const paletteKeys = ['bg0','bg1','far','mid','tile','tileHi','player','player2','accent','accent2','hazard','collect','text','dim','particle','glow','fog','boss'];

  let activeId = 'arcane';
  let source = null, target = THEMES.arcane, current = Object.assign({}, THEMES.arcane);
  let t = 1;
  const listeners = [];

  function applyCss(id) {
    document.body.dataset.theme = id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[id].bg0);
  }

  const Themes = {
    ids, list: THEMES,
    get activeId() { return activeId; },
    get current() { return current; },
    get animating() { return t < 1; },
    name(id) { return RL.I18n.name(THEMES[id || activeId].name); },
    set(id, opts) {
      if (!THEMES[id]) return;
      const animate = !(opts && opts.animate === false);
      if (id === activeId && animate) { applyCss(id); return; }
      const from = Object.assign({}, current);
      activeId = id; target = THEMES[id]; source = from; t = animate ? 0 : 1;
      if (!animate) { current = Object.assign({}, target); }
      applyCss(id);
      if (RL.Save && RL.Save.data) { RL.Save.data.profile.theme = id; RL.Save.queue(); }
      RL.Bus.emit('theme:change', { id, theme: THEMES[id] });
      listeners.forEach(fn => { try { fn(id); } catch (e) { RL.lastError = e; } });
    },
    cycle() {
      const i = ids.indexOf(activeId);
      Themes.set(ids[(i + 1) % ids.length]);
    },
    update(dt) {
      if (t >= 1 || !source) return;
      t = Math.min(1, t + dt / 0.62);
      const e = U.easeInOutCubic(t);
      for (let i = 0; i < paletteKeys.length; i++) {
        const k = paletteKeys[i];
        current[k] = U.lerpColor(source[k] || target[k], target[k], e);
      }
      current.bloom = target.bloom; current.scan = target.scan; current.grain = target.grain; current.light = target.light;
      if (t >= 1) current = Object.assign({}, target);
    },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    snapshotHex() { return Object.assign({}, current); }
  };
  RL.Themes = Themes;
  applyCss(activeId);
})();
