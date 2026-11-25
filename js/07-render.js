/* ==========================================================================
   RIFTLIGHT — particles, pixel renderer, parallax, juice
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util, C = RL.CFG, T = C.TILE;

  /* ============================== PARTICLES ============================== */
  const P = {
    list: [], texts: [], quality: 'high', caps: { low: 150, medium: 320, high: 650 },
    setQuality(q) { P.quality = P.caps[q] ? q : 'high'; P.list.length = Math.min(P.list.length, P.caps[P.quality]); },
    cap() { return P.caps[P.quality] || 650; },
    push(o) {
      if (P.list.length >= P.cap()) P.list.shift();
      P.list.push(o); return o;
    },
    spawn(x, y, vx, vy, life, size, color, opts) {
      return P.push(Object.assign({ x, y, vx, vy, life, max: life, size, color, gravity: 160, shape: 'square', rot: 0, vr: 0, alpha: 1, fade: true, additive: false, drag: 0 }, opts || {}));
    },
    spark(x, y, color) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.283, s = 20 + Math.random() * 55;
        P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, .3 + Math.random() * .25, 1.5 + Math.random() * 1.3, color, { shape: 'px', gravity: 80 });
      }
    },
    dust(x, y, color, n) {
      for (let i = 0; i < (n || 2); i++) {
        P.spawn(x + (Math.random() - .5) * 5, y - Math.random() * 3, (Math.random() - .5) * 20, -8 - Math.random() * 18, .35 + Math.random() * .25, 1 + Math.random() * 1.4, color, { gravity: 40, shape: 'px', additive: true });
      }
    },
    trail(x, y, color) {
      const trail = RL.Save && RL.Save.data.progress.trail;
      const conf = RL.TRAILS.find(t => t.id === trail) || RL.TRAILS[0];
      const c = conf.color || color;
      P.spawn(x, y, (Math.random() - .5) * 3, (Math.random() - .5) * 3, .28, 1.4 + Math.random() * 1.8, c, { shape: conf.id === 'ink' ? 'px' : 'diamond', gravity: 0, additive: true, drag: .9 });
    },
    dash(x, y, color) {
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * 6.283;
        P.spawn(x, y, Math.cos(a) * (50 + Math.random() * 90), Math.sin(a) * (50 + Math.random() * 90), .18 + Math.random() * .2, 1 + Math.random() * 2.4, color, { gravity: 0, additive: true, shape: i % 2 ? 'px' : 'diamond' });
      }
    },
    land(x, y, color, speed) {
      const n = Math.min(14, 4 + Math.floor((speed || 100) / 25));
      for (let i = 0; i < n; i++) {
        const a = Math.PI + Math.random() * Math.PI;
        P.spawn(x + (Math.random() - .5) * 8, y, Math.cos(a) * 25, Math.sin(a) * 12, .3 + Math.random() * .3, 1 + Math.random() * 1.5, color, { gravity: 70, additive: true });
      }
    },
    ring(x, y, color, n) {
      const count = n || 14;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 6.283;
        P.spawn(x, y, Math.cos(a) * 60, Math.sin(a) * 60, .32 + Math.random() * .2, 1.2 + Math.random() * 1.6, color, { gravity: 0, additive: true, shape: 'px', drag: .9 });
      }
    },
    burst(x, y, type, quality) {
      const q = quality || P.quality;
      const n = q === 'low' ? 12 : q === 'medium' ? 22 : 36;
      if (type === 'death') {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, s = 40 + Math.random() * 150;
          P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, .35 + Math.random() * .45, 1 + Math.random() * 2.6, RL.Themes.current.hazard, { gravity: 320, additive: true, shape: i % 3 ? 'px' : 'diamond' });
        }
      } else if (type === 'beacon') {
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - .5) * 2.4;
          P.spawn(x, y, Math.cos(a) * (35 + Math.random() * 80), Math.sin(a) * (35 + Math.random() * 110), .6 + Math.random() * .7, 1 + Math.random() * 2.2, RL.Themes.current.collect, { gravity: 60, additive: true, shape: i % 2 ? 'diamond' : 'px' });
        }
      } else if (type === 'steam') {
        for (let i = 0; i < n; i++) P.spawn(x + (Math.random() - .5) * 14, y, (Math.random() - .5) * 12, -18 - Math.random() * 32, .5, 2 + Math.random() * 2, RL.Themes.current.dim, { gravity: -20, additive: true, shape: 'px' });
      } else if (type === 'spark') {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, s = 35 + Math.random() * 90;
          P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, .25 + Math.random() * .25, 1 + Math.random() * 1.5, RL.Themes.current.collect, { gravity: 40, additive: true, shape: 'px' });
        }
      } else {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, s = 50 + Math.random() * 140;
          P.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, .4 + Math.random() * .5, 1 + Math.random() * 2.4, RL.Themes.current.accent, { gravity: 40, additive: true, shape: i % 3 === 0 ? 'diamond' : 'px' });
        }
      }
    },
    text(text, x, y, color, size) {
      if (P.texts.length > 28) P.texts.shift();
      P.texts.push({ text, x, y, color: color || RL.Themes.current.text, size: size || 7, life: .85, max: .85, vy: -26 });
    },
    update(dt) {
      for (let i = P.list.length - 1; i >= 0; i--) {
        const p = P.list[i];
        p.life -= dt;
        if (p.life <= 0) { P.list.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.gravity || 0) * dt;
        if (p.drag) { p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); }
        p.rot += p.vr * dt;
      }
      for (let i = P.texts.length - 1; i >= 0; i--) {
        const t = P.texts[i]; t.life -= dt; t.y += t.vy * dt;
        if (t.life <= 0) P.texts.splice(i, 1);
      }
    },
    draw(ctx) {
      const theme = RL.Themes.current;
      ctx.save();
      if (theme.bloom && !theme.light) ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < P.list.length; i++) {
        const p = P.list[i];
        const a = U.clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = a * (p.alpha == null ? 1 : p.alpha);
        ctx.fillStyle = p.color;
        if (p.shape === 'diamond') {
          ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else if (p.shape === 'line') {
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size * 2, 1);
        } else {
          ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.ceil(p.size), Math.ceil(p.size));
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.textAlign = 'center';
      for (let i = 0; i < P.texts.length; i++) {
        const t = P.texts[i], a = U.clamp(t.life / t.max, 0, 1);
        ctx.globalAlpha = a;
        ctx.font = `700 ${t.size}px "Courier New", monospace`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
      }
      ctx.restore();
    },
    clear() { P.list.length = 0; P.texts.length = 0; }
  };
  RL.Particles = P;

  /* ============================== RENDERER ============================== */
  const R = {
    canvas: null, ctx: null, dpr: 1, cssW: 0, cssH: 0, stars: [], motes: [], roomLayer: null, layerKey: '',
    init(canvas) {
      R.canvas = canvas; R.ctx = canvas.getContext('2d', { alpha: false });
      if (!R.ctx) return;
      R.resize();
      window.addEventListener('resize', R.resize);
      window.addEventListener('orientationchange', () => setTimeout(R.resize, 80));
      R.makeStars();
    },
    resize() {
      if (!R.canvas) return;
      const w = Math.max(1, window.innerWidth || 800), h = Math.max(1, window.innerHeight || 600);
      const q = RL.Save && RL.Save.data ? RL.Save.data.profile.quality : 'high';
      const dpr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
      R.cssW = w; R.cssH = h; R.dpr = dpr;
      R.canvas.width = Math.round(w * dpr); R.canvas.height = Math.round(h * dpr);
      R.canvas.style.width = w + 'px'; R.canvas.style.height = h + 'px';
      if (R.ctx) { R.ctx.imageSmoothingEnabled = false; }
      if (RL.Game) RL.Game.viewResize(w, h);
      if (RL.UI) RL.UI.layout();
      R.makeStars();
    },
    makeStars() {
      const rng = U.mulberry32(U.hash('stars' + R.cssW + 'x' + R.cssH));
      R.stars = [];
      const n = R.cssW < 600 ? 46 : 80;
      for (let i = 0; i < n; i++) R.stars.push({ x: rng() * R.cssW, y: rng() * R.cssH * .72, s: .5 + rng() * 1.7, a: .2 + rng() * .6, tw: rng() * 6.28 });
      R.motes = [];
      for (let i = 0; i < 26; i++) R.motes.push({ x: rng() * R.cssW, y: rng() * R.cssH, s: 1 + rng() * 2, sp: 4 + rng() * 14, ph: rng() * 6.28, a: .1 + rng() * .35 });
    },
    begin() {
      const ctx = R.ctx;
      ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, R.cssW, R.cssH);
    },
    bgGradient() {
      const theme = RL.Themes.current, ctx = R.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, R.cssH);
      g.addColorStop(0, theme.bg0); g.addColorStop(.58, theme.bg1); g.addColorStop(1, theme.fog || theme.bg0);
      ctx.fillStyle = g; ctx.fillRect(0, 0, R.cssW, R.cssH);
    },
    drawStars(t) {
      const theme = RL.Themes.current, ctx = R.ctx;
      for (let i = 0; i < R.stars.length; i++) {
        const s = R.stars[i];
        const tw = .5 + .5 * Math.sin(t * 1.2 + s.tw);
        ctx.globalAlpha = s.a * (theme.light ? .24 : .7) * (.5 + tw * .5);
        ctx.fillStyle = theme.light ? theme.dim : theme.accent;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < R.motes.length; i++) {
        const m = R.motes[i];
        m.y -= m.sp * .016; if (m.y < -4) { m.y = R.cssH + 4; m.x = Math.random() * R.cssW; }
        ctx.globalAlpha = m.a * (theme.light ? .35 : .8);
        ctx.fillStyle = theme.particle;
        ctx.fillRect((m.x + Math.sin(t * .4 + m.ph) * 16) | 0, m.y | 0, m.s, m.s);
      }
      ctx.globalAlpha = 1;
    },
    mountainLayer(offset, baseY, height, color, step, seed) {
      const ctx = R.ctx, theme = RL.Themes.current;
      const rng = U.mulberry32(seed || 7);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-80, R.cssH);
      let pts = [];
      const n = Math.ceil(R.cssW / step) + 4;
      for (let i = 0; i < n; i++) {
        const h = height * (.35 + rng() * .65);
        pts.push({ x: i * step - (offset % step), y: baseY - h });
      }
      ctx.lineTo(pts[0].x, baseY);
      for (let i = 0; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
        if (i < pts.length - 1) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          ctx.lineTo(mx, Math.min(pts[i].y, pts[i + 1].y));
        }
      }
      ctx.lineTo(R.cssW + 80, R.cssH);
      ctx.closePath(); ctx.fill();
    },
    drawParallax(t, menu) {
      const theme = RL.Themes.current, ctx = R.ctx;
      const camX = menu ? 0 : (RL.Game.camera.x || 0);
      R.bgGradient();
      R.drawStars(t);
      R.drawSkyRuins(camX, t, menu);
      // distant glow orb
      const gx = R.cssW * (menu ? .72 : .78) - camX * .02;
      const gy = R.cssH * .27;
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(R.cssW, R.cssH) * .34);
      gg.addColorStop(0, U.alpha(theme.accent, theme.light ? .11 : .18));
      gg.addColorStop(.55, U.alpha(theme.accent2, theme.light ? .04 : .07));
      gg.addColorStop(1, U.alpha(theme.bg0, 0));
      ctx.fillStyle = gg; ctx.fillRect(0, 0, R.cssW, R.cssH);
      // mountains
      R.mountainLayer(camX * .07, R.cssH * .67, R.cssH * .19, theme.far, 130, 11);
      R.mountainLayer(camX * .16 + 40, R.cssH * .78, R.cssH * .22, theme.mid, 95, 29);
      // ruins silhouettes
      ctx.globalAlpha = theme.light ? .32 : .4;
      ctx.fillStyle = theme.mid;
      const off = -((camX * .24) % 280);
      for (let i = 0; i < 5; i++) {
        const x = off + i * 280 + 30;
        const bh = R.cssH * (.13 + (i % 2) * .04);
        ctx.fillRect(x, R.cssH * .76 - bh, 34, bh);
        ctx.fillRect(x + 40, R.cssH * .76 - bh * .8, 20, bh * .8);
        ctx.fillRect(x + 5, R.cssH * .76 - bh - 12, 7, 12);
      }
      ctx.globalAlpha = 1;
      if (!theme.light) {
        ctx.fillStyle = U.alpha(theme.fog, .28);
        ctx.fillRect(0, R.cssH * .72, R.cssW, R.cssH * .28);
      }
      if (theme.scan) R.drawScanlines();
    },
    drawScanlines() {
      const ctx = R.ctx; ctx.save(); ctx.globalAlpha = RL.Themes.current.light ? .07 : .09; ctx.fillStyle = '#000';
      for (let y = 0; y < R.cssH; y += 4) ctx.fillRect(0, y, R.cssW, 1);
      ctx.restore();
    },
    drawSkyRuins(camX, t, menu) {
      const theme = RL.Themes.current, ctx = R.ctx;
      const sy = R.cssH * .16;
      ctx.save();
      // distant floating ruins
      ctx.globalAlpha = theme.light ? .2 : .28;
      for (let i = 0; i < 4; i++) {
        const span = R.cssW + 520;
        let x = ((i * 380 - camX * .08) % span + span) % span - 260;
        const y = sy + i * 54 + Math.sin(t * .16 + i) * 8;
        const w = 90 + (i % 3) * 44;
        ctx.fillStyle = i % 2 ? theme.mid : theme.far;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * .26, y + 20);
        ctx.lineTo(x - w * .3, y + 16); ctx.closePath(); ctx.fill();
        ctx.fillRect(x - w * .42, y - 6, w * .16, 6);
        ctx.fillRect(x + w * .18, y - 14, w * .1, 14);
        ctx.globalAlpha *= .75;
      }
      ctx.restore();
      // light shafts
      ctx.save();
      const shafts = theme.light ? .07 : .1;
      for (let i = 0; i < 3; i++) {
        const x = ((i * 430 - camX * .05 + 150) % (R.cssW + 400) + R.cssW + 400) % (R.cssW + 400) - 200;
        const g = ctx.createLinearGradient(x, 0, x + 160, R.cssH * .8);
        g.addColorStop(0, U.alpha(theme.accent, shafts));
        g.addColorStop(.65, U.alpha(theme.accent2, shafts * .35));
        g.addColorStop(1, U.alpha(theme.accent, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + 70, -20); ctx.lineTo(x + 260, R.cssH); ctx.lineTo(x + 80, R.cssH); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // hanging chains / distant ropes
      ctx.save(); ctx.globalAlpha = theme.light ? .12 : .2;
      ctx.strokeStyle = theme.tileHi; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 250 - camX * .12) % (R.cssW + 300) + R.cssW + 300) % (R.cssW + 300) - 150;
        const len = R.cssH * (.08 + (i % 3) * .045);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(t * .2 + i) * 3, len); ctx.stroke();
      }
      ctx.restore();
    },
    drawMenu(t) {
      R.drawParallax(t, true);
      const ctx = R.ctx, theme = RL.Themes.current;
      // floating islands
      const bob = Math.sin(t * .55) * 8;
      R.island(R.cssW * .2, R.cssH * .7 + bob, 150, 34, theme);
      R.island(R.cssW * .63, R.cssH * .8 - bob * .6, 220, 45, theme);
      R.island(R.cssW * .86, R.cssH * .62 + bob * .4, 100, 26, theme);
      // giant prism
      R.crystal(R.cssW * .78, R.cssH * .26, 26 + Math.sin(t * .9) * 2, theme);
      // little hero silhouette on platform
      R.drawHero(R.cssW * .635, R.cssH * .8 - 38, 3.4, 1, t, true);
      // foreground fog
      const fg = ctx.createLinearGradient(0, R.cssH * .7, 0, R.cssH);
      fg.addColorStop(0, U.alpha(theme.fog, 0)); fg.addColorStop(1, U.alpha(theme.fog, theme.light ? .3 : .65));
      ctx.fillStyle = fg; ctx.fillRect(0, R.cssH * .7, R.cssW, R.cssH * .3);
      R.vignette();
    },
    island(x, y, w, h, theme) {
      const ctx = R.ctx;
      ctx.save();
      ctx.fillStyle = theme.tile;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * .27, y + h); ctx.lineTo(x - w * .3, y + h * .8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = theme.tileHi; ctx.globalAlpha = .42; ctx.fillRect(x - w / 2, y - 2, w, 2);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const px = x - w * .3 + i * w * .27;
        ctx.fillStyle = theme.accent; ctx.globalAlpha = .4;
        ctx.fillRect(px, y - 4, 1, 4); ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
    crystal(x, y, size, theme) {
      const ctx = R.ctx;
      ctx.save(); ctx.translate(x, y);
      if (!theme.light) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25; ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(0, 0, size * 1.8, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = theme.accent;
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .52, -size * .1); ctx.lineTo(0, size); ctx.lineTo(-size * .52, -size * .1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = theme.collect; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * .22, -size * .1); ctx.lineTo(0, size * .2); ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    drawEditor() {
      const Ed = RL.Editor;
      if (!Ed || !Ed.room) return;
      const room = Ed.room, theme = RL.Themes.current, ctx = R.ctx;
      R.bgGradient();
      const padTop = 58, padBottom = 74;
      const availW = R.cssW - 24, availH = R.cssH - padTop - padBottom;
      const scale = Math.max(.55, Math.min(availW / (room.w * T), availH / (room.h * T)));
      const ox = (R.cssW - room.w * T * scale) / 2;
      const oy = padTop + (availH - room.h * T * scale) / 2;
      R.editorView = { x: ox, y: oy, scale };
      ctx.save();
      ctx.translate(ox, oy); ctx.scale(scale, scale);
      // backing panel
      ctx.fillStyle = U.alpha(theme.bg0, theme.light ? .12 : .52);
      ctx.fillRect(0, 0, room.w * T, room.h * T);
      const G = RL.Game;
      const fake = { tiles: room.tiles, w: room.w, h: room.h };
      const oldRoom = G.room, oldCam = G.camera;
      G.room = fake; G.camera = { x: 0, y: 0, viewW: room.w * T, viewH: room.h * T };
      R.drawTiles();
      G.room = oldRoom; G.camera = oldCam;
      // entities
      const fakeG = { room: room, player: null, camera: { x: 0, y: 0, viewW: room.w * T, viewH: room.h * T }, goalActive: false, lightBridges: [], meteors: [] };
      for (const e of room.entities) {
        if (!e) continue;
        if (e.type === 'goal') {
          ctx.fillStyle = theme.collect; ctx.fillRect(e.x + 6, e.y + 10, 4, 30);
          ctx.beginPath(); ctx.moveTo(e.x + 8, e.y); ctx.lineTo(e.x + 15, e.y + 7); ctx.lineTo(e.x + 8, e.y + 14); ctx.closePath(); ctx.fill();
        } else if (e.type === 'checkpoint') {
          ctx.fillStyle = theme.accent; ctx.fillRect(e.x + 3, e.y + 4, 2, 14);
          ctx.beginPath(); ctx.moveTo(e.x + 5, e.y + 4); ctx.lineTo(e.x + 13, e.y + 8); ctx.lineTo(e.x + 5, e.y + 12); ctx.closePath(); ctx.fill();
        } else if (e.type === 'shard') {
          ctx.fillStyle = theme.collect;
          ctx.beginPath(); ctx.moveTo(e.x + 3, e.y); ctx.lineTo(e.x + 7, e.y + 3); ctx.lineTo(e.x + 3, e.y + 7); ctx.lineTo(e.x, e.y + 3); ctx.closePath(); ctx.fill();
        } else if (e.type === 'element') {
          ctx.fillStyle = theme.accent2;
          ctx.fillRect(e.x + e.w * .2, e.y + e.h * .2, e.w * .6, e.h * .6);
          ctx.fillStyle = theme.text; ctx.globalAlpha = .5; ctx.fillRect(e.x + 2, e.y + 2, 2, 2); ctx.globalAlpha = 1;
        }
      }
      // spawn marker
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 1; ctx.strokeRect(room.spawn.x - 2, room.spawn.y - 2, 14, 18);
      ctx.fillStyle = theme.accent; ctx.fillRect(room.spawn.x + 3, room.spawn.y - 3, 4, 10);
      // grid
      ctx.strokeStyle = U.alpha(theme.text, theme.light ? .12 : .08); ctx.lineWidth = .5;
      for (let x = 0; x <= room.w; x += 4) { ctx.beginPath(); ctx.moveTo(x * T, 0); ctx.lineTo(x * T, room.h * T); ctx.stroke(); }
      for (let y = 0; y <= room.h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y * T); ctx.lineTo(room.w * T, y * T); ctx.stroke(); }
      // border
      ctx.strokeStyle = theme.line || theme.tileHi; ctx.lineWidth = 1; ctx.strokeRect(0, 0, room.w * T, room.h * T);
      // cursor
      if (Ed.cursor && Ed.cursor.show) {
        ctx.strokeStyle = theme.collect; ctx.lineWidth = 1.2;
        ctx.strokeRect(Ed.cursor.tx * T, Ed.cursor.ty * T, T, T);
        ctx.globalAlpha = .14; ctx.fillStyle = theme.collect; ctx.fillRect(Ed.cursor.tx * T, Ed.cursor.ty * T, T, T); ctx.globalAlpha = 1;
      }
      ctx.restore();
      R.vignette();
    },
    drawRoom(t) {
      const G = RL.Game, theme = RL.Themes.current;
      R.drawParallax(t, false);
      R.drawWeather(t);
      const cam = G.camera;
      const baseScale = G.camera.scale || (R.cssW / G.view.w);
      const zoom = cam.zoom || 1;
      const scale = baseScale * zoom;
      const ctx = R.ctx;
      ctx.save();
      ctx.translate((cam.shakeX || 0) * baseScale, (cam.shakeY || 0) * baseScale);
      ctx.translate(-cam.viewW * .5 * baseScale * (zoom - 1), -cam.viewH * .5 * baseScale * (zoom - 1));
      ctx.scale(scale, scale);
      ctx.translate(-cam.x, -cam.y);
      R.drawRoomBackdrop(t);
      R.drawChapterDecorBack(t);
      R.drawTiles();
      R.drawChapterDecorFront(t);
      R.drawLightBridges();
      R.drawEntities(t);
      R.drawMeteors();
      R.drawPlayer(t);
      RL.Particles.draw(ctx);
      R.drawBoss();
      R.drawForeground(t);
      ctx.restore();
      R.drawGoalArrow();
      // screen-space post
      R.drawEventBanner();
      R.vignette();
      if (G.room && G.room.boss) R.bossVignette(t);
      if (G.resonance >= 65) R.resonanceBorder(t);
    },
    drawRoomBackdrop(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      const rw = G.roomW(), rh = G.roomH();
      // room frame glow
      ctx.fillStyle = U.alpha(theme.bg0, theme.light ? .1 : .32);
      ctx.fillRect(-400, -400, rw + 800, rh + 800);
      // distant tower silhouettes (strictly background)
      const rng = U.mulberry32(G.room.seed || 1);
      for (let i = 0; i < 4; i++) {
        const x = rng() * rw, y = rh * (.45 + rng() * .2);
        const w = 10 + rng() * 14, h = 40 + rng() * 60;
        ctx.globalAlpha = theme.light ? .06 : .1;
        ctx.fillStyle = theme.mid;
        ctx.fillRect(Math.round(x), Math.round(y), w, h);
        ctx.fillRect(Math.round(x + w * .2), Math.round(y - 8), w * .6, 8);
      }
      ctx.globalAlpha = 1;
    },
    chapterInfo() {
      const G = RL.Game;
      return { ch: (G.room && G.room.chapter) || 1, seed: (G.room && G.room.seed) || 1 };
    },
    drawWeather(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!G.room) return;
      const ch = this.chapterInfo().ch;
      const W = R.cssW, H = R.cssH;
      const rng = U.mulberry32(((G.room.seed || 1) ^ 0x51f15e) >>> 0);
      ctx.save();
      for (let i = 0; i < (R.cssW < 600 ? 22 : 42); i++) {
        const rx = rng(), ry = rng(), rs = rng(), rp = rng() * 6.28;
        let x, y, a, c;
        if (ch === 2) {
          x = (rx * W + t * (6 + rs * 12)) % (W + 20) - 10;
          y = (ry * H + t * (16 + rs * 26)) % (H + 20) - 10;
          a = .25 + rs * .35; c = theme.text;
          ctx.fillRect(x | 0, y | 0, rs > .55 ? 2 : 1, rs > .55 ? 2 : 1);
        } else if (ch === 5) {
          x = (rx * W + Math.sin(t * .8 + rp) * 22) % W;
          y = (H - ((ry * H + t * (20 + rs * 30)) % (H + 40)));
          a = .18 + rs * .4; c = theme.hazard;
          ctx.fillRect(x | 0, y | 0, 1 + (rs > .7 ? 1 : 0), 1 + (rs > .8 ? 1 : 0));
        } else if (ch === 3) {
          x = rx * W; y = ry * H;
          a = .15 + rs * .3; c = theme.collect;
          if ((Math.sin(t * 1.5 + rp) + 1) > .85) ctx.fillRect(x | 0, y | 0, 1, 2 + (rs * 4 | 0));
        } else if (ch === 4) {
          x = (rx * W + Math.sin(t * .25 + rp) * 30) % W; y = ry * H;
          a = .12 + rs * .2; c = theme.accent;
          ctx.fillRect(x | 0, y | 0, 2, 2);
        } else if (ch === 6) {
          x = (rx * W + Math.sin(t * .4 + rp) * 34) % W; y = (ry * .75 + .1) * H;
          a = .15 + rs * .35; c = theme.collect;
          ctx.fillRect(x | 0, y | 0, 1, 1);
        } else {
          x = (rx * W + Math.sin(t * .5 + rp) * 18) % W; y = (ry * .8 + .12) * H;
          a = .08 + rs * .2; c = theme.accent;
          ctx.fillRect(x | 0, y | 0, 1, 1);
        }
        ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1);
      }
      ctx.restore();
    },
    drawChapterDecorBack(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!G.room) return;
      const { ch, seed } = this.chapterInfo();
      const rw = G.roomW(), rh = G.roomH();
      const rng = U.mulberry32((seed ^ 0x9e3779b9) >>> 0);
      ctx.save();
      // large background pillars / arches
      for (let i = 0; i < 4; i++) {
        const x = 70 + i * (rw / 4) + rng() * 40;
        const w = 10 + rng() * 18;
        const top = 30 + rng() * 50;
        ctx.globalAlpha = theme.light ? .06 : .11;
        ctx.fillStyle = theme.mid;
        ctx.fillRect(x, top, w, rh - top);
        ctx.fillRect(x - 5, top + 20, w + 10, 6);
        if (ch === 6) { ctx.fillStyle = theme.accent2; ctx.globalAlpha *= .8; ctx.fillRect(x + w / 2 - 1, top - 14, 2, 14); }
      }
      // hanging vines / chains / cables
      const count = ch === 4 ? 5 : 8;
      for (let i = 0; i < count; i++) {
        const x = 30 + rng() * (rw - 60);
        const len = 40 + rng() * 120;
        ctx.globalAlpha = theme.light ? .08 : .18;
        ctx.strokeStyle = ch === 3 ? theme.accent : (ch === 5 ? theme.hazard : theme.tileHi);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + Math.sin(t * .5 + i) * 8, len * .5, x + Math.sin(t * .4 + i) * 14, len); ctx.stroke();
        if (ch === 1 || ch === 2) {
          ctx.fillStyle = ch === 2 ? theme.text : theme.accent;
          ctx.globalAlpha *= .65;
          ctx.fillRect(x - 2, len * .55, 3, 1); ctx.fillRect(x + 2, len * .75, 2, 1);
        }
        if (ch === 5) { ctx.globalAlpha *= .7; ctx.fillStyle = theme.collect; ctx.fillRect(x - 1, len, 2, 2); }
      }
      // chapter-specific iconic silhouettes
      if (ch === 6) {
        for (let i = 0; i < 3; i++) {
          const x = rw * (.2 + i * .3), y = 80 + i * 18;
          ctx.globalAlpha = .14; ctx.strokeStyle = theme.collect; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 22 + Math.sin(t * .3 + i) * 2, 0, 6.283); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y - 14); ctx.lineTo(x - 14, y + 14); ctx.stroke();
        }
      }
      ctx.restore();
    },
    drawChapterDecorFront(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!G.room) return;
      const { ch, seed } = this.chapterInfo();
      const rng = U.mulberry32((seed ^ 0x7f4a7c15) >>> 0);
      const tile = RL.CFG.TILE;
      ctx.save();
      for (let tx = 1; tx < G.room.w - 1; tx += 3) {
        const top = (i => { for (let y = 0; y < G.room.h; y++) if (G.room.tiles[y][i] === 1 || G.room.tiles[y][i] === 4) return y; return -1; })(tx);
        if (top < 1) continue;
        if (G.room.tiles[top - 1] && G.room.tiles[top - 1][tx] !== 0) continue;
        const x = tx * tile + 1, y = top * tile;
        const v = rng();
        if (ch === 1) {
          ctx.globalAlpha = .35; ctx.fillStyle = theme.accent;
          ctx.fillRect(x, y - (2 + v * 3 | 0), 1, 2 + v * 3 | 0);
          ctx.fillStyle = theme.collect; ctx.fillRect(x - 1, y - 4, 1, 1);
        } else if (ch === 2) {
          ctx.globalAlpha = .4; ctx.fillStyle = theme.text;
          ctx.fillRect(x, y - 3, 1, 3); ctx.fillRect(x + 2, y - 2, 1, 2);
        } else if (ch === 3) {
          ctx.globalAlpha = .3; ctx.strokeStyle = theme.collect; ctx.lineWidth = .6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 4); ctx.stroke();
        } else if (ch === 4) {
          ctx.globalAlpha = .3; ctx.fillStyle = theme.accent2;
          ctx.fillRect(x, y - 1, 3, 1);
        } else if (ch === 5) {
          ctx.globalAlpha = .35; ctx.fillStyle = theme.hazard;
          ctx.fillRect(x, y - 2, 1, 2);
        } else {
          ctx.globalAlpha = .3; ctx.fillStyle = theme.collect;
          ctx.fillRect(x, y - 3, 1, 3);
        }
      }
      ctx.restore();
    },
    drawTiles() {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      const room = G.room; if (!room) return;
      const cam = G.camera;
      const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(room.w - 1, Math.ceil((cam.x + cam.viewW) / T) + 1);
      const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(room.h - 1, Math.ceil((cam.y + cam.viewH) / T) + 1);
      const light = theme.light;
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const v = room.tiles[ty][tx];
          if (!v) continue;
          const x = tx * T, y = ty * T;
          if (v === 1 || v === 4) {
            const shade = ((tx * 13 + ty * 7) % 5 === 0) ? 1 : 0;
            ctx.fillStyle = v === 4 ? U.lerpColor(theme.tile, theme.accent, .18) : theme.tile;
            ctx.fillRect(x, y, T, T);
            // top highlight
            if (G.tileAt(tx, ty - 1) === 0) {
              ctx.fillStyle = v === 4 ? theme.accent : theme.tileHi;
              ctx.globalAlpha = v === 4 ? .8 : .62; ctx.fillRect(x, y, T, 1); ctx.globalAlpha = 1;
            }
            // left highlight
            if (G.tileAt(tx - 1, ty) === 0) {
              ctx.fillStyle = v === 4 ? theme.accent : theme.tileHi; ctx.globalAlpha = .18; ctx.fillRect(x, y, 1, T); ctx.globalAlpha = 1;
            }
            if (shade) {
              ctx.fillStyle = light ? 'rgba(58,55,51,.14)' : 'rgba(0,0,0,.18)';
              ctx.fillRect(x + 2, y + 3, 3, 2);
            }
            if (v === 4) {
              ctx.fillStyle = U.alpha(theme.accent, .35); ctx.fillRect(x + 1, y + T - 2, T - 2, 1);
            }
            // bottom dark edge
            ctx.fillStyle = light ? 'rgba(58,55,51,.1)' : 'rgba(0,0,0,.22)';
            ctx.fillRect(x, y + T - 1, T, 1);
          } else if (v === 2) {
            ctx.fillStyle = theme.hazard;
            for (let k = 0; k < 2; k++) {
              const sx = x + k * 4;
              ctx.beginPath(); ctx.moveTo(sx, y + T); ctx.lineTo(sx + 2, y + 3); ctx.lineTo(sx + 4, y + T); ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = U.alpha(theme.hazard, .35); ctx.fillRect(x, y + T - 1, T, 1);
          } else if (v === 3) {
            ctx.fillStyle = theme.tileHi; ctx.globalAlpha = .7;
            ctx.fillRect(x, y, T, 2); ctx.globalAlpha = 1;
            ctx.fillStyle = light ? 'rgba(58,55,51,.2)' : 'rgba(0,0,0,.25)';
            ctx.fillRect(x + 3, y + 2, 1, 2);
          }
        }
      }
    },
    drawEntities(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      const room = G.room;
      for (const e of room.entities) {
        if (!e) continue;
        if (e.type === 'shard') {
          if (e.collected) continue;
          const bob = Math.sin(t * 2.5 + (e.phase || 0)) * 2;
          const x = e.x + 3.5, y = e.y + 3.5 + bob;
          if (!theme.light) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .12; ctx.fillStyle = theme.collect; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
          else { ctx.globalAlpha = .18; ctx.fillStyle = theme.collect; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
          ctx.fillStyle = theme.collect;
          ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3.5, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3.5, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = theme.text; ctx.globalAlpha = .6; ctx.fillRect(x - 1, y - 3, 1, 3); ctx.globalAlpha = 1;
        } else if (e.type === 'moving') {
          ctx.fillStyle = theme.tile; ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = theme.tileHi; ctx.fillRect(e.x, e.y, e.w, 1);
          ctx.fillStyle = U.alpha(theme.accent, .4); ctx.fillRect(e.x + 4, e.y + 3, 3, 1); ctx.fillRect(e.x + e.w - 7, e.y + 3, 3, 1);
        } else if (e.type === 'checkpoint') {
          const active = e.active;
          ctx.fillStyle = active ? theme.accent : theme.dim;
          ctx.fillRect(e.x + 3, e.y + 4, 2, e.h - 4);
          ctx.fillStyle = active ? theme.collect : theme.dim;
          ctx.beginPath(); ctx.moveTo(e.x + 5, e.y + 4); ctx.lineTo(e.x + 14, e.y + 8); ctx.lineTo(e.x + 5, e.y + 12); ctx.closePath(); ctx.fill();
          if (active) { ctx.globalAlpha = .2 + Math.sin(t * 3) * .08; ctx.fillStyle = theme.accent; ctx.fillRect(e.x - 2, e.y - 2, 16, e.h + 4); ctx.globalAlpha = 1; }
        } else if (e.type === 'goal') {
          R.drawBeacon(e, t);
        } else if (e.type === 'reaction') {
          const pulse = .5 + Math.sin(t * 3) * .5;
          ctx.save(); ctx.translate(e.x + 11, e.y + 11); ctx.rotate(t * .8);
          ctx.strokeStyle = theme.accent2; ctx.lineWidth = 1.5; ctx.globalAlpha = .5 + pulse * .4;
          ctx.strokeRect(-9, -9, 18, 18); ctx.rotate(1.57); ctx.strokeRect(-9, -9, 18, 18);
          ctx.globalAlpha = 1; ctx.restore();
          ctx.fillStyle = theme.accent2; ctx.fillRect(e.x + 9, e.y + 9, 4, 4);
        } else if (e.type === 'element') {
          R.drawElement(e, t);
        }
      }
    },
    drawBeacon(e, t) {
      const theme = RL.Themes.current, ctx = R.ctx;
      const x = e.x + 8, y = e.y;
      const active = e.active || RL.Game.goalActive;
      ctx.save();
      // pillar
      ctx.fillStyle = active ? theme.collect : theme.tile;
      ctx.fillRect(x - 3, y + 10, 6, 30);
      ctx.fillStyle = active ? theme.accent : theme.dim;
      ctx.fillRect(x - 1, y + 6, 2, 26);
      // crystal
      ctx.translate(x, y + 6);
      const s = 7 + Math.sin(t * 2.4) * 1.2;
      ctx.fillStyle = active ? theme.collect : theme.tileHi;
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * .7, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = theme.text; ctx.globalAlpha = .6; ctx.fillRect(-1, -s + 2, 1, s);
      ctx.globalAlpha = 1;
      if (active && !theme.light) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
        g.addColorStop(0, U.alpha(theme.collect, .45)); g.addColorStop(1, U.alpha(theme.collect, 0));
        ctx.fillStyle = g; ctx.fillRect(-34, -34, 68, 68);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    },
    drawElement(e, t) {
      const theme = RL.Themes.current, ctx = R.ctx;
      const x = e.x + e.w / 2, y = e.y + e.h / 2;
      const disabled = e.disabled > 0;
      ctx.save(); ctx.globalAlpha = disabled ? .28 : 1;
      if (e.kind === 'wind') {
        ctx.strokeStyle = theme.accent; ctx.lineWidth = 1; ctx.globalAlpha *= .55;
        for (let i = 0; i < 4; i++) {
          const yy = e.y + ((t * 32 + i * 18) % e.h);
          const xx = e.x + e.w * .5 + Math.sin(t * 2 + i) * 5;
          ctx.beginPath(); ctx.moveTo(xx - 6, yy); ctx.lineTo(xx + 6, yy - 2); ctx.stroke();
        }
        ctx.globalAlpha = .3; ctx.fillStyle = theme.accent; ctx.fillRect(e.x + e.w / 2 - 1, e.y, 2, e.h);
      } else if (e.kind === 'portal') {
        ctx.strokeStyle = theme.accent2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 5 + Math.sin(t * 3) * 1.5, 10, 0, 0, 6.283); ctx.stroke();
        ctx.strokeStyle = theme.accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, 2, 7, 0, 0, 6.283); ctx.stroke();
      } else if (e.kind === 'fire') {
        const active = e.active !== false;
        if (active) {
          ctx.fillStyle = theme.hazard;
          for (let i = 0; i < 3; i++) {
            const fx = e.x + 2 + i * 4, fh = 8 + Math.sin(t * 9 + i * 2) * 5;
            ctx.beginPath(); ctx.moveTo(fx, e.y + e.h); ctx.lineTo(fx + 2, e.y + e.h - fh); ctx.lineTo(fx + 4, e.y + e.h); ctx.closePath(); ctx.fill();
          }
          ctx.globalAlpha *= .2; ctx.fillStyle = theme.hazard; ctx.fillRect(e.x - 3, e.y, e.w + 6, e.h);
        } else { ctx.globalAlpha *= .2; ctx.fillStyle = theme.dim; ctx.fillRect(e.x, e.y + e.h - 2, e.w, 2); }
      } else if (e.kind === 'thunder') {
        ctx.fillStyle = theme.dim;
        ctx.beginPath(); ctx.arc(x, e.y + 8, 8, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(x - 6, e.y + 9, 5, 0, 6.283); ctx.fill();
        if (e.state === 'warn') {
          ctx.globalAlpha *= .4 + (Math.sin(t * 18) * .3 + .3); ctx.fillStyle = theme.collect;
          ctx.fillRect(x - 1, e.y + 12, 2, e.h - 12);
        } else if (e.state === 'strike') {
          ctx.fillStyle = theme.collect;
          ctx.beginPath(); ctx.moveTo(x - 2, e.y + 12); ctx.lineTo(x + 4, e.y + e.h * .55); ctx.lineTo(x - 1, e.y + e.h * .55); ctx.lineTo(x + 2, e.y + e.h); ctx.lineTo(x - 6, e.y + e.h * .6); ctx.lineTo(x - 1, e.y + e.h * .6); ctx.closePath(); ctx.fill();
          ctx.globalAlpha *= .2; ctx.fillRect(x - 12, e.y + 10, 24, e.h - 10);
        }
      } else if (e.kind === 'magnet') {
        ctx.strokeStyle = theme.accent2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 5, .5, 2.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 5, 3.7, 5.8); ctx.stroke();
        ctx.fillStyle = theme.accent2; ctx.fillRect(x - 6, y - 2, 2, 4); ctx.fillRect(x + 4, y - 2, 2, 4);
        if (RL.Particles) { }
      } else if (e.kind === 'spring') {
        ctx.fillStyle = theme.accent; ctx.fillRect(e.x + 2, e.y + 5, e.w - 4, 3);
        ctx.fillStyle = theme.collect; ctx.fillRect(e.x + 4, e.y, 8, 5);
        ctx.fillStyle = theme.text; ctx.fillRect(e.x + 7, e.y + 2, 2, 2);
      } else if (e.kind === 'crystal') {
        const bob = Math.sin(t * 3) * 2;
        ctx.translate(x, y + bob);
        ctx.fillStyle = theme.collect;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4, 0); ctx.lineTo(0, 7); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = theme.text; ctx.globalAlpha = .5; ctx.fillRect(-1, -4, 1, 5);
      } else if (e.kind === 'gravity') {
        ctx.strokeStyle = theme.accent2; ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) { ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(x, y, 8 + i * 5 + Math.sin(t + i) * 2, 0, 6.283); ctx.stroke(); }
        ctx.globalAlpha = .8; ctx.fillStyle = theme.accent2; ctx.fillRect(x - 2, y - 2, 4, 4);
      } else if (e.kind === 'time') {
        ctx.globalAlpha *= .13; ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(x, y, 24 + Math.sin(t * 2) * 2, 0, 6.283); ctx.fill();
        ctx.globalAlpha = .6; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 22, t, t + 4.2); ctx.stroke();
      } else if (e.kind === 'prism') {
        ctx.translate(x, y); ctx.rotate(t * .3);
        ctx.fillStyle = e.cooldown > 0 ? theme.dim : theme.collect;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, 5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = theme.accent; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 14); ctx.stroke();
      } else if (e.kind === 'rift') {
        ctx.translate(x, y); ctx.rotate(t * .5);
        ctx.fillStyle = theme.hazard;
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const rr = i % 2 ? 8 : 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = theme.bg0; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 6.283); ctx.fill();
      } else if (e.kind === 'ice') {
        ctx.fillStyle = U.alpha(theme.accent, .45); ctx.fillRect(e.x, e.y, e.w, 4);
      }
      ctx.restore();
    },
    drawLightBridges() {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      for (const b of G.lightBridges) {
        const a = Math.min(1, b.life / 1.2);
        ctx.globalAlpha = a * .95;
        if (!theme.light) { ctx.globalCompositeOperation = 'lighter'; }
        ctx.fillStyle = theme.collect;
        ctx.fillRect(b.x, b.y, b.w, 2);
        ctx.globalAlpha = a * .3; ctx.fillRect(b.x, b.y - 2, b.w, 6);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    },
    drawMeteors() {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      for (const m of G.meteors) {
        if (m.warn > 0) {
          ctx.globalAlpha = .35 + Math.sin(m.warn * 18) * .25;
          ctx.fillStyle = theme.hazard;
          const gx = m.x, gy = 0;
          ctx.fillRect(gx - 1, gy, 2, 34);
          ctx.beginPath(); ctx.moveTo(gx - 5, 34); ctx.lineTo(gx + 5, 34); ctx.lineTo(gx, 42); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }
        ctx.fillStyle = theme.hazard;
        ctx.fillRect(m.x - 4, m.y - 4, 8, 8);
        ctx.globalAlpha = .3; ctx.fillRect(m.x - 2, m.y - 20, 4, 18); ctx.globalAlpha = 1;
      }
    },
    drawHero(x, y, scale, facing, t, menu) {
      const theme = RL.Themes.current, ctx = R.ctx;
      const G = RL.Game;
      const p = menu ? null : G.player;
      const skinId = (menu ? ((RL.Save && RL.Save.data.progress.skin) || 'default') : (G.skin || 'default'));
      const skinIndex = Math.max(0, RL.SKINS.findIndex(s => s.id === skinId));
      const skin = RL.SKINS[skinIndex] || RL.SKINS[0];
      const img = RL.Assets && RL.Assets.player;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (scale !== 1) ctx.scale(scale, scale);
      if (facing < 0) ctx.scale(-1, 1);
      const sq = p ? p.squash : 1, st = p ? p.stretch : 1;
      ctx.scale(sq, st);
      if (img) {
        let row = 0, col = 0;
        if (menu) { row = 0; col = Math.floor(t * 5) % 4; }
        else if (G.phase === 'dead') { row = 5; col = 6; }
        else if (p.dashTime > 0) { row = 4; col = Math.floor(t * 18) % 3; }
        else if (p.grabbing || p.wallSlide) { row = 5; col = Math.floor(t * 7) % 2; }
        else if (!p.onGround) {
          if (p.vy < 0) { row = 2; col = Math.floor(t * 8) % 2; }
          else { row = 3; col = 2 + (Math.floor(t * 7) % 2); }
        } else if (Math.abs(p.vx) > 10) { row = 1; col = Math.floor(p.anim * 1.1) % 6; }
        else { row = 0; col = Math.floor(t * 4) % 4; }
        const srcX = col * 16;
        const srcY = skinIndex * 120 + row * 20;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, srcX, srcY, 16, 20, -8, -20, 16, 20);
        ctx.restore();
        return;
      }
      // Asset fallback: high-contrast silhouette, still anchored to the feet.
      const body = skin.body || theme.player;
      const accent = skin.accent || theme.player2;
      const frame = Math.floor(menu ? t * 3 : (p ? p.anim : t * 3));
      ctx.fillStyle = accent;
      ctx.fillRect(-7 - (frame % 2), -9, 6, 2);
      ctx.fillRect(-9 - (frame % 2), -8, 4, 1);
      ctx.fillStyle = body;
      if (p && !p.onGround && !p.grabbing) {
        ctx.fillRect(-3, -4, 3, 3); ctx.fillRect(1, -3, 3, 3);
      } else if (p && Math.abs(p.vx) > 10) {
        const step = frame % 2 ? 1 : -1;
        ctx.fillRect(-3 + step, -4, 3, 4); ctx.fillRect(1 - step, -4, 3, 4);
      } else {
        ctx.fillRect(-3, -4, 3, 4); ctx.fillRect(1, -4, 3, 4);
      }
      ctx.fillRect(-4, -9, 9, 5);
      ctx.fillStyle = U.alpha(theme.bg0, .32); ctx.fillRect(-4, -6, 9, 2);
      ctx.fillStyle = body; ctx.fillRect(-3, -14, 7, 5);
      ctx.fillStyle = accent; ctx.fillRect(-4, -14, 8, 2); ctx.fillRect(-4, -12, 2, 2);
      ctx.fillStyle = theme.bg0; ctx.fillRect(1, -12, 3, 2);
      ctx.fillStyle = theme.accent; ctx.fillRect(2, -12, 1, 1);
      ctx.restore();
    },
    drawPlayer(t) {
      const G = RL.Game, p = G.player, theme = RL.Themes.current, ctx = R.ctx;
      if (!p) return;
      if (p.invuln > 0 && Math.floor(t * 20) % 2 === 0 && G.phase === 'playing') return;
      // dash afterimages (sprite copies, not boxes)
      if (p.dashTime > 0) {
        const img = RL.Assets && RL.Assets.player;
        if (img) {
          const skinIndex = Math.max(0, RL.SKINS.findIndex(s => s.id === (G.skin || 'default')));
          const srcY = skinIndex * 120 + 4 * 20;
          for (let i = 1; i <= 3; i++) {
            const ax = p.x + p.w / 2 - p.dashVX * .012 * i;
            const ay = p.y + p.h - p.dashVY * .012 * i;
            ctx.save(); ctx.globalAlpha = .15 / i;
            if (p.facing < 0) { ctx.translate(ax, ay); ctx.scale(-1, 1); ctx.drawImage(img, 16, srcY, 16, 20, -8, -20, 16, 20); }
            else ctx.drawImage(img, 16, srcY, 16, 20, ax - 8, ay - 20, 16, 20);
            ctx.restore();
          }
        } else {
          for (let i = 1; i <= 3; i++) {
            ctx.globalAlpha = .12 / i; ctx.fillStyle = theme.accent;
            ctx.fillRect(p.x - p.dashVX * .012 * i, p.y - p.dashVY * .012 * i, p.w, p.h);
          }
        }
        ctx.globalAlpha = 1;
      }
      // ground shadow
      if (p.onGround) { ctx.globalAlpha = .18; ctx.fillStyle = theme.bg0; ctx.fillRect(p.x + 1, p.y + p.h - 1, 8, 2); ctx.globalAlpha = 1; }
      const cx = p.x + p.w / 2, cy = p.y + p.h;
      R.drawHero(cx, cy - 1, 1, p.facing, t, false);
      if (RL.DEBUG_HITBOX) { ctx.strokeStyle = '#00FF88'; ctx.lineWidth = .6; ctx.strokeRect(p.x, p.y, p.w, p.h); }
      // stamina ring near player if low
      if (p.stamina < p.maxStamina * .3 && p.stamina > 0) {
        ctx.globalAlpha = .5; ctx.strokeStyle = theme.accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy - 21, 8, 0, (p.stamina / p.maxStamina) * 6.283); ctx.stroke(); ctx.globalAlpha = 1;
      }
    },
    drawBoss() {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!G.room || !G.room.chase || !G.room.boss) return;
      const ch = G.room.chase;
      const x = ch.x, y = G.roomH() * .5;
      // void wall
      const g = ctx.createLinearGradient(x - 40, 0, x + 10, 0);
      g.addColorStop(0, U.alpha(theme.bg0, 0)); g.addColorStop(1, U.alpha(theme.hazard, .45));
      ctx.fillStyle = g; ctx.fillRect(x - 40, -300, 50, G.roomH() + 600);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = U.alpha(theme.hazard, .18 + i * .05);
        ctx.fillRect(x + 5 + i * 4, 0, 2, G.roomH());
      }
      // eye
      ctx.save(); ctx.translate(x + 18, y + Math.sin(G.roomTime) * 10);
      ctx.fillStyle = theme.boss || theme.hazard;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = theme.bg0; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.283); ctx.fill();
      ctx.fillStyle = theme.collect; ctx.beginPath(); ctx.arc(2, 0, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = theme.text; ctx.fillRect(1, -2, 2, 2);
      ctx.restore();
    },
    drawForeground(t) {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!theme.light) {
        ctx.fillStyle = U.alpha(theme.fog, .12);
        ctx.fillRect(G.camera.x, G.camera.y + G.camera.viewH - 12, G.camera.viewW, 12);
      }
    },
    drawGoalArrow() {
      const G = RL.Game, theme = RL.Themes.current, ctx = R.ctx;
      if (!G.room || !G.room.goal || G.phase !== 'playing') return;
      if (!G.hasAbility('e4') && G.view.w < 300) { /* still show in portrait by default */ }
      const cam = G.camera, g = G.room.goal;
      const sx = (g.x - cam.x) * cam.scale, sy = (g.y + 20 - cam.y) * cam.scale;
      const pad = 36;
      if (sx > pad && sx < R.cssW - pad && sy > pad && sy < R.cssH - pad) return;
      const cx = R.cssW / 2, cy = R.cssH / 2;
      let dx = sx - cx, dy = sy - cy;
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const rx = (R.cssW / 2 - pad) / Math.max(.0001, Math.abs(dx));
      const ry = (R.cssH / 2 - pad) / Math.max(.0001, Math.abs(dy));
      const t = Math.min(rx, ry);
      const ax = cx + dx * t, ay = cy + dy * t;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha = .8; ctx.fillStyle = theme.collect;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    drawEventBanner() {
      const G = RL.Game;
      if (!G.event || G.phase !== 'playing') return;
      const ctx = R.ctx;
      // small screen-space label top-left below HUD handled by UI toast instead
    },
    vignette() {
      const theme = RL.Themes.current, ctx = R.ctx;
      const g = ctx.createRadialGradient(R.cssW / 2, R.cssH / 2, Math.min(R.cssW, R.cssH) * .28, R.cssW / 2, R.cssH / 2, Math.max(R.cssW, R.cssH) * .78);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, theme.light ? 'rgba(58,55,51,.14)' : 'rgba(0,0,0,.42)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, R.cssW, R.cssH);
    },
    bossVignette(t) {
      const ctx = R.ctx, theme = RL.Themes.current;
      const a = .12 + Math.sin(t * 3) * .04;
      const g = ctx.createRadialGradient(R.cssW / 2, R.cssH / 2, R.cssH * .2, R.cssW / 2, R.cssH / 2, R.cssW * .7);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, U.alpha(theme.hazard, a));
      ctx.fillStyle = g; ctx.fillRect(0, 0, R.cssW, R.cssH);
    },
    resonanceBorder(t) {
      const ctx = R.ctx, theme = RL.Themes.current;
      ctx.save(); ctx.globalAlpha = .18 + Math.sin(t * 4) * .06; ctx.strokeStyle = theme.collect; ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, R.cssW - 4, R.cssH - 4); ctx.restore();
    },
    render(t) {
      if (!R.ctx) return;
      R.begin();
      const G = RL.Game;
      if (G && G.phase === 'editor' && RL.Editor && RL.Editor.active) R.drawEditor();
      else if (!G || G.phase === 'menu' || G.phase === 'boot') R.drawMenu(t);
      else if (!G.room) R.drawMenu(t);
      else R.drawRoom(t);
      // screen flash
      if (G.flash > 0) {
        R.ctx.globalAlpha = G.flash * .75; R.ctx.fillStyle = G.flashColor || '#fff';
        R.ctx.fillRect(0, 0, R.cssW, R.cssH); R.ctx.globalAlpha = 1;
      }
      // damage edge
      if (G.phase === 'dead') {
        const a = Math.min(.5, .18 + (1 - G.respawnTimer / C.RESPAWN) * .3);
        R.ctx.fillStyle = U.alpha(RL.Themes.current.hazard, a); R.ctx.fillRect(0, 0, R.cssW, R.cssH);
      }
      // fade
      if (G.fade > 0) {
        R.ctx.fillStyle = RL.Themes.current.bg0; R.ctx.globalAlpha = G.fade;
        R.ctx.fillRect(0, 0, R.cssW, R.cssH); R.ctx.globalAlpha = 1;
      }
      if (RL.Save.data.profile.contrast) {
        R.ctx.strokeStyle = RL.Themes.current.light ? 'rgba(43,43,43,.5)' : 'rgba(255,255,255,.35)';
        R.ctx.lineWidth = 2; R.ctx.strokeRect(1, 1, R.cssW - 2, R.cssH - 2);
      }
    }
  };
  RL.Renderer = R;
})();
