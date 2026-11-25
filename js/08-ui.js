/* ==========================================================================
   RIFTLIGHT — DOM UI / HUD / menus / settings / codex / touch / editor hooks
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util, T = RL.CFG.TILE;
  const $ = id => document.getElementById(id);
  const t = (k, v) => RL.I18n.t(k, v);
  const nm = o => RL.I18n.name(o);

  const UI = {
    root: null, modalOpen: false, currentModal: '', toastTimer: null, hintTimer: null, achQueue: [], achShowing: false,
    touchVisible: false, lastHUD: {}, joystick: null, _codexSeen: {}, _sandbox: { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 },
    init() {
      this.root = $('app');
      $('modal-close').addEventListener('click', () => this.closeModal());
      $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) this.closeModal(); });
      document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-action]');
        if (a) { e.preventDefault(); this.menuAction(a.dataset.action, a); return; }
        const m = e.target.closest('[data-ma]');
        if (m) { e.preventDefault(); this.modalAction(m.dataset.ma, m); return; }
      });
      document.querySelectorAll('#lang-switch button').forEach(b => b.addEventListener('click', () => this.setLang(b.dataset.lang)));
      $('btn-theme').addEventListener('click', () => RL.Themes.cycle());
      $('btn-mute').addEventListener('click', () => this.toggleMute());
      $('btn-pause').addEventListener('click', () => RL.Game.togglePause());
      $('btn-burst').addEventListener('click', () => RL.Game.useBurst());
      document.querySelectorAll('[data-touch]').forEach(b => this.bindTouchButton(b));
      this.bindJoystick();
      this.bindKeyboard();
      document.addEventListener('mouseover', (e) => { const b = e.target.closest('button, .link-btn, .level-dot, .codex-item'); if (b && !b.__hovered) { b.__hovered = true; if (RL.Audio) RL.Audio.play('hover'); setTimeout(() => { b.__hovered = false; }, 80); } });
      window.addEventListener('resize', () => this.layout());
      window.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 100));
      RL.Bus.on('achievement:unlock', (def) => this.queueAchievement(def));
      RL.Bus.on('achievement:unlock', (def) => { if (def && def.id) { /* toast handled */ } });
      RL.Bus.on('lang:change', () => { this.applyStatic(); this.refreshMenu(); this.layout(); });
      RL.Bus.on('theme:change', () => this.applyTheme());
      RL.Bus.on('collection:change', () => {});
      RL.Bus.on('skin:unlock', (skin) => { this.toast(t('toast.unlockSkin', { name: nm(skin.name) })); });
      RL.Bus.on('audio:volume', () => this.updateMuteIcon());
      $('modal').addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
      document.addEventListener('pointerdown', () => { if (RL.Audio) RL.Audio.unlock(); }, { passive: true });
      this.applyStatic();
      this.applyTheme();
      this.layout();
      this.refreshMenu();
    },
    applyStatic() {
      RL.I18n.applyDOM();
      document.querySelectorAll('#lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === RL.I18n.lang));
      this.updateMuteIcon();
    },
    applyTheme() {
      this.updateMuteIcon();
      const names = RL.Themes.name();
      $('btn-theme').title = names + ' · ' + t('menu.theme');
    },
    updateMuteIcon() {
      const muted = RL.Save.data.profile.muted;
      const b = $('btn-mute'); if (b) { b.textContent = muted ? '♪̸' : '♪'; b.classList.toggle('muted', muted); }
    },
    setLang(lang) {
      RL.I18n.setLang(lang);
      if (RL.Save) { RL.Save.data.profile.lang = lang; RL.Save.save(); }
      this.applyStatic();
      this.refreshMenu();
      if (this.currentModal === 'settings') this.showSettings();
    },
    toggleMute() {
      if (!RL.Audio) return;
      RL.Audio.unlock();
      RL.Audio.toggleMute();
      RL.Save.data.profile.muted = RL.Audio.muted;
      RL.Save.save();
      this.updateMuteIcon();
    },
    layout() {
      const G = RL.Game;
      document.body.classList.toggle('left-hand', !!(RL.Save && RL.Save.data.profile.leftHand));
      const playing = G && (G.phase === 'playing' || G.phase === 'dead' || G.phase === 'clear');
      const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
      const touch = playing && coarse;
      this.touchVisible = touch;
      $('touch-controls').classList.toggle('hidden', !touch);
      if (!touch) { RL.Input.setAxis(0, 0); }
      if (RL.Game && RL.Game.room) RL.Game.viewResize(window.innerWidth, window.innerHeight);
    },
    refreshMenu() {
      const s = RL.Save; if (!s) return;
      const prog = s.storyProgress();
      const bestTimes = Object.values(s.data.progress.story.best || {}).map(x => x.time).filter(Boolean);
      const best = bestTimes.length ? Math.min.apply(null, bestTimes) : null;
      $('menu-progress').textContent = t('menu.progress', { done: prog });
      $('menu-best').textContent = best != null ? t('menu.best', { time: U.formatTime(best) }) : t('menu.best', { time: '--:--' });
      document.querySelectorAll('#lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === RL.I18n.lang));
    },
    showMenu() {
      const G = RL.Game;
      G.phase = 'menu'; G.paused = false; G.room = null;
      $('menu').classList.remove('hidden');
      $('hud').classList.add('hidden');
      $('touch-controls').classList.add('hidden');
      this.closeModal();
      this.refreshMenu();
      this.layout();
      if (RL.Audio) RL.Audio.setScene('menu', .2);
      if (RL.Particles) RL.Particles.clear();
    },
    showGame() {
      $('menu').classList.add('hidden');
      $('hud').classList.remove('hidden');
      this.closeModal();
      this.refreshTouch();
      this.burstReady(false);
      this.layout();
    },
    refreshTouch() {
      const G = RL.Game;
      const playing = G.phase === 'playing' || G.phase === 'dead' || G.phase === 'clear';
      const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
      $('touch-controls').classList.toggle('hidden', !(playing && coarse));
    },
    hideModal() { this.modalOpen = false; $('modal').classList.add('hidden'); this.currentModal = ''; },
    closeModal() {
      if (this.currentModal === 'finale') { this.hideModal(); if (RL.Game) RL.Game.quitToMenu(); return; }
      const wasPaused = !!(RL.Game && RL.Game.paused);
      const wasPause = this.currentModal === 'pause';
      const wasResult = this.currentModal === 'result';
      this.hideModal();
      if (wasPaused) { if (wasPause) RL.Game.togglePause(false); else this.showPause(); return; }
      if (wasResult) { RL.Game.quitToMenu(); return; }
    },
    openModal(title, body, foot, id) {
      this.modalOpen = true; this.currentModal = id || '';
      $('modal-title').textContent = title;
      $('modal-body').innerHTML = body;
      const f = $('modal-foot');
      if (foot) { f.innerHTML = foot; f.classList.remove('hidden'); } else { f.innerHTML = ''; f.classList.add('hidden'); }
      $('modal').classList.remove('hidden');
      $('modal-body').scrollTop = 0;
      RL.I18n.applyDOM($('modal'));
      if (RL.Audio) RL.Audio.play('ui');
    },
    menuAction(action, el) {
      if (RL.Audio) RL.Audio.unlock();
      switch (action) {
        case 'story': this.showStory(); break;
        case 'daily': this.showDaily(); break;
        case 'endless': this.showEndless(); break;
        case 'sandbox': this.showSandbox(); break;
        case 'editor': if (RL.Editor) RL.Editor.open(); break;
        case 'codex': this.showCodex(); break;
        case 'achievements': this.showAchievements(); break;
        case 'collection': this.showCollection(); break;
        case 'ability': this.showAbility(); break;
        case 'settings': this.showSettings(); break;
      }
      if (RL.Audio) RL.Audio.play('select');
    },
    modalAction(action, el) {
      const G = RL.Game;
      if (RL.Audio) { RL.Audio.unlock(); RL.Audio.play('ui'); }
      switch (action) {
        case 'close': this.closeModal(); break;
        case 'startLevel': G.startStory(+el.dataset.ch, +el.dataset.room); break;
        case 'challenge': G.startStory(+el.dataset.ch, +el.dataset.room, el.dataset.kind); break;
        case 'dailyStart': G.startDaily(); break;
        case 'endlessStart': G.startEndless(); break;
        case 'sandboxStart': G.startSandbox(Object.assign({}, this._sandbox)); break;
        case 'sandboxSlotSave': { const sl = RL.Save.data.progress.sandboxSlots || (RL.Save.data.progress.sandboxSlots = [null,null,null,null,null]); sl[+el.dataset.slot] = Object.assign({}, this._sandbox); RL.Save.save(); this.toast(t('sandbox.saved')); this.showSandbox(); break; }
        case 'sandboxSlotLoad': { const sl = RL.Save.data.progress.sandboxSlots || []; const v = sl[+el.dataset.slot]; if (v) { this._sandbox = Object.assign({}, v); this.toast(t('sandbox.loaded')); this.showSandbox(); } break; }
        case 'gauntletStart': G.startGauntlet(); break;
        case 'retry': this.hideModal(); G.retry(); break;
        case 'next': this.hideModal(); if (G.mode === 'custom' && RL.Editor && RL.Editor.testing) RL.Editor.returnFromTest(); else G.nextRoom(); break;
        case 'finale': this.hideModal(); this.showFinale(); break;
        case 'resume': G.togglePause(false); break;
        case 'restart': this.hideModal(); G.retry(); break;
        case 'quit': this.hideModal(); G.quitToMenu(); break;
        case 'pauseSettings': this.showSettings(); break;
        case 'pauseCodex': this.showCodex(); break;
        case 'sigils': this.showSigils(); break;
        case 'equipSigil': this.equipSigil(el.dataset.id); break;
        case 'buyAbility': this.buyAbility(el.dataset.id); break;
        case 'skin': this.equipSkin(el.dataset.id); break;
        case 'trail': this.equipTrail(el.dataset.id); break;
        case 'setTheme': RL.Themes.set(el.dataset.theme); this.applyTheme(); if (this.currentModal === 'settings' || this.currentModal === 'collection') { if (this.currentModal === 'settings') this.showSettings(); else this.showCollection(); } break;
        case 'codexTab': this.showCodex(el.dataset.tab); break;
        case 'exportSave': RL.Save.download(); this.toast(t('toast.exported')); break;
        case 'copySave': this.copyText(RL.Save.exportB64()); this.toast(t('toast.exported')); break;
        case 'importSave': this.showImport(); break;
        case 'resetSave': if (confirm(t('settings.resetConfirm'))) { RL.Save.reset(); RL.I18n.setLang(RL.Save.data.profile.lang, true); RL.Themes.set(RL.Save.data.profile.theme, { animate: false }); RL.Audio.setVolumes(RL.Save.data.profile.bgm, RL.Save.data.profile.sfx, RL.Save.data.profile.muted); RL.Particles.setQuality(RL.Save.data.profile.quality); this.applyStatic(); this.applyTheme(); this.toast(t('toast.reset')); this.closeModal(); this.showMenu(); } break;
        case 'doImport': {
          const code = ($('import-code') && $('import-code').value) || '';
          const r = RL.Save.importB64(code);
          if (r.ok) { this.toast(t('toast.imported')); this.closeModal(); RL.I18n.setLang(RL.Save.data.profile.lang, true); RL.Themes.set(RL.Save.data.profile.theme, { animate: false }); this.applyStatic(); this.refreshMenu(); }
          else this.toast(t('toast.importFail'));
          break;
        }
        case 'setLang': this.setLang(el.dataset.lang); this.showSettings(); break;
        case 'quality': RL.Save.data.profile.quality = el.dataset.quality; RL.Save.save(); RL.Particles.setQuality(el.dataset.quality); if (RL.Renderer) RL.Renderer.resize(); this.showSettings(); break;
        case 'toggleSetting': this.toggleSetting(el.dataset.key); break;
        case 'volume': break;
        case 'closeEditor': if (RL.Editor) RL.Editor.close(); break;
        case 'editorTool': if (RL.Editor) RL.Editor.setTool(el.dataset.tool, el.dataset.kind); break;
        case 'editorUndo': if (RL.Editor) RL.Editor.undo(); break;
        case 'editorRedo': if (RL.Editor) RL.Editor.redo(); break;
        case 'editorTest': if (RL.Editor) RL.Editor.test(); break;
        case 'editorSave': if (RL.Editor) RL.Editor.saveLevel(); break;
        case 'editorExport': if (RL.Editor) RL.Editor.exportCode(); break;
        case 'editorImport': if (RL.Editor) RL.Editor.importCode(); break;
        case 'editorNew': if (RL.Editor) RL.Editor.newRoom(); break;
        case 'editorReturn': if (RL.Editor) RL.Editor.returnFromTest(); break;
        case 'editorClose': if (RL.Editor) RL.Editor.close(); break;
        case 'editorPlay': if (RL.Editor) RL.Editor.playSaved(+el.dataset.idx); break;
        case 'editorSaved': if (RL.Editor) RL.Editor.showSaved(); break;
      }
    },
    showStory() {
      const s = RL.Save.data.progress.story;
      let html = `<div class="mini-card" style="margin-bottom:12px"><h4>${t('story.prologueTitle')}</h4><p style="font-size:11px;line-height:1.65">${t('story.prologue')}</p></div><p class="muted">${t('story.desc')}</p><div class="chapter-grid">`;
      RL.CHAPTERS.forEach(ch => {
        const unlocked = RL.Save.isChapterUnlocked(ch.id);
        let done = 0;
        for (let r = 1; r <= 8; r++) if (s.completed[`${ch.id}-${r}`]) done++;
        html += `<div class="chapter-card"><div class="ch-num">${t('story.chapter', { n: ch.id }).toUpperCase()}</div><h4>${nm(ch.name)}</h4><p>${nm(ch.sub)}</p>`;
        html += `<div class="level-dots">`;
        for (let r = 1; r <= 8; r++) {
          const key = `${ch.id}-${r}`;
          const roomUnlocked = RL.Save.isRoomUnlocked(ch.id, r);
          const doneRoom = s.completed[key];
          const grade = s.grades[key] || '';
          html += `<button class="level-dot ${doneRoom ? 'done' : ''} ${roomUnlocked ? '' : 'locked'}" ${roomUnlocked ? `data-ma="startLevel" data-ch="${ch.id}" data-room="${r}"` : 'disabled title="' + t('story.locked') + '"'}>${grade || r}</button>`;
        }
        html += `</div>`;
        if (!unlocked) html += `<div class="ch-lock">✧ ${t('story.locked')}</div>`;
        html += `</div>`;
      });
      html += `</div><div class="btn-row" style="margin-top:16px"><button class="btn" data-ma="sigils">✧ ${t('story.sigils')}</button><span class="chip">${t('story.sigilHint')}</span></div>`;
      const latest = RL.Save.data.progress.story;
      const foot = `<button class="btn" data-ma="close">${t('common.back')}</button><button class="btn" data-ma="challenge" data-ch="${latest.chapter || 1}" data-room="${latest.room || 1}" data-kind="time">⏱ ${t('story.timeAttack')}</button><button class="btn" data-ma="challenge" data-ch="${latest.chapter || 1}" data-room="${latest.room || 1}" data-kind="dash">➤ ${t('story.dashAttack')}</button><button class="btn danger" data-ma="challenge" data-ch="${latest.chapter || 1}" data-room="${latest.room || 1}" data-kind="oneHit">☠ ${t('story.oneHit') || 'One hit'}</button>`;
      this.openModal(t('story.title'), html, foot, 'story');
    },
    showDaily() {
      const d = RL.Save.data.progress.daily;
      const today = U.todayKey();
      const done = d.date === today && d.done;
      const seed = U.todaySeed().toString(16).toUpperCase();
      const body = `<p class="muted">${t('daily.desc')}</p>
        <div class="card-grid">
          <div class="mini-card"><h4>${t('daily.today')}</h4><p style="color:var(--accent);font-family:var(--font)">${seed}</p></div>
          <div class="mini-card"><h4>${t('daily.streak', { n: d.streak || 0 })}</h4><p>${d.date === today ? (done ? '✓ ' + t('daily.done') : '—') : '—'}</p></div>
          <div class="mini-card"><h4>${t('daily.best')}</h4><p>${d.date === today && d.time ? U.formatTime(d.time) : '--:--'}</p></div>
        </div>
        <div class="mini-card" style="margin-top:10px"><h4>LOCAL TOP 3</h4><p class="small">${(RL.Save.data.records.dailyTop || []).slice(0, 3).map(x => x.date + ' · ' + U.formatTime(x.time)).join('<br>') || '—'}</p></div>
        <div class="btn-row" style="margin-top:16px"><button class="btn primary" data-ma="dailyStart">${t('daily.start')}</button></div>`;
      this.openModal(t('daily.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'daily');
    },
    showEndless() {
      const best = RL.Save.data.progress.endless.bestFloor || 0;
      const body = `<p class="muted">${t('endless.desc')}</p>
        <div class="card-grid"><div class="mini-card"><h4>${t('endless.best', { n: best })}</h4><p>∞</p></div><div class="mini-card"><h4>${t('endless.lives') || 'Lives'}</h4><p>♥ ♥ ♥</p></div></div>
        <div class="mini-card" style="margin-top:10px"><h4>LOCAL TOP 3</h4><p class="small">${(RL.Save.data.records.endlessTop || []).slice(0, 3).map(x => 'Floor ' + x.floor + ' · ' + x.date).join('<br>') || '—'}</p></div>
        <div class="btn-row" style="margin-top:16px"><button class="btn primary" data-ma="endlessStart">${t('endless.start')}</button><button class="btn" data-ma="gauntletStart">♜ ${t('mode.gauntlet')}</button></div>`;
      this.openModal(t('endless.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'endless');
    },
    showSandbox() {
      const p = this._sandbox;
      const row = (key, label, min, max, step, val) => `<div class="set-row"><label>${label}</label><div class="slider-row"><input type="range" data-sandbox="${key}" min="${min}" max="${max}" step="${step}" value="${val}"><span id="sb-${key}">${val}</span></div></div>`;
      let body = `<p class="muted">${t('sandbox.desc')}</p><div class="sandbox-grid"><div class="set-group">
        ${row('gravity', t('sandbox.gravity'), .4, 2, .1, p.gravity)}
        ${row('dash', t('sandbox.dash'), 0, 4, 1, p.dash)}
        ${row('wind', t('sandbox.wind'), 0, 2, .1, p.wind)}
        ${row('time', t('sandbox.time'), .5, 1.5, .1, p.time)}
        ${row('fever', t('sandbox.fever'), 0, 100, 10, p.fever)}
      </div><div class="set-group"><h3>${t('sandbox.notes') || 'Sandbox'}</h3><p class="small muted">${t('sandbox.info')}</p></div></div>`;
      const slots = RL.Save.data.progress.sandboxSlots || [];
      let slotHtml = `<div class="set-group" style="margin-top:12px"><h3>${t('sandbox.saveSlot')} / ${t('sandbox.loadSlot')}</h3><div class="btn-row">`;
      for (let i = 0; i < 5; i++) slotHtml += `<button class="btn small" data-ma="sandboxSlotLoad" data-slot="${i}" ${slots[i] ? '' : 'disabled'}>${t('sandbox.slot', { n: i + 1 })}${slots[i] ? ' ✓' : ''}</button>`;
      slotHtml += `</div><div class="btn-row" style="margin-top:6px">`;
      for (let i = 0; i < 5; i++) slotHtml += `<button class="btn small" data-ma="sandboxSlotSave" data-slot="${i}">${t('sandbox.saveSlot')} ${i + 1}</button>`;
      slotHtml += `</div></div>`;
      body += slotHtml;
      this.openModal(t('sandbox.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button><button class="btn primary" data-ma="sandboxStart">${t('sandbox.start')}</button>`, 'sandbox');
      $('modal-body').querySelectorAll('[data-sandbox]').forEach(inp => {
        inp.addEventListener('input', () => {
          const k = inp.dataset.sandbox;
          this._sandbox[k] = parseFloat(inp.value) || 0;
          $('sb-' + k).textContent = inp.value;
        });
      });
    },
    showSigils() {
      const eq = RL.Save.data.progress.equippedSigils || [];
      const owned = RL.Save.data.progress.sigils || ['windstep'];
      let body = `<p class="muted">${t('story.sigilHint')}</p><div class="sigil-grid">`;
      RL.SIGILS.forEach(s => {
        const isOwned = owned.includes(s.id);
        const isEq = eq.includes(s.id);
        body += `<div class="sigil-card ${isEq ? 'equipped' : ''}"><h4>${nm(s.name)} ${isEq ? '✦' : ''}</h4><p>${nm(s.desc)}</p><button class="btn small" style="margin-top:8px" ${isOwned ? `data-ma="equipSigil" data-id="${s.id}"` : 'disabled'}>${isOwned ? (isEq ? t('common.equipped') : t('common.select')) : t('common.locked')}</button></div>`;
      });
      body += `</div>`;
      this.openModal(t('story.sigils'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'sigils');
    },
    equipSigil(id) {
      const p = RL.Save.data.progress;
      let eq = p.equippedSigils || [];
      if (eq.includes(id)) eq = eq.filter(x => x !== id);
      else { if (eq.length >= 3) eq.shift(); eq.push(id); }
      p.equippedSigils = eq;
      RL.Save.save();
      this.showSigils();
      if (RL.Game.player) RL.Game.setPlayerDashesMax();
    },
    showCodex(tab) {
      tab = tab || 'elements';
      const tabs = ['elements', 'reactions', 'sigils', 'controls', 'stats'];
      this._codexSeen[tab] = true;
      let body = `<div class="tabs">` + tabs.map(x => `<button class="tab ${x === tab ? 'on' : ''}" data-ma="codexTab" data-tab="${x}">${t('codex.' + x)}</button>`).join('') + `</div>`;
      if (tab === 'elements') {
        body += `<p class="muted small">${t('codex.elementsDesc')}</p><div class="codex-grid">`;
        RL.ELEMENTS.forEach(e => { body += `<div class="codex-item"><h4>${e.glyph} ${nm(e.name)}<span>${e.id.toUpperCase()}</span></h4><p>${nm(e.desc)}</p></div>`; });
        body += `</div>`;
      } else if (tab === 'reactions') {
        body += `<p class="muted small">${t('codex.reactionsDesc')}</p><div class="codex-grid">`;
        RL.REACTIONS.forEach(r => { body += `<div class="codex-item"><h4>${r.glyph} ${nm(r.name)}<span>${r.a} + ${r.b}</span></h4><p>${nm(r.desc)}</p></div>`; });
        body += `</div>`;
      } else if (tab === 'sigils') {
        body += `<p class="muted small">${t('codex.sigilsDesc')}</p><div class="sigil-grid">`;
        RL.SIGILS.forEach(s => { body += `<div class="sigil-card"><h4>${nm(s.name)}</h4><p>${nm(s.desc)}</p></div>`; });
        body += `</div>`;
      } else if (tab === 'controls') {
        body += `<p class="muted small">${t('codex.controlsDesc')}</p><div class="help-keys">
          <div class="key-row"><span>${t('hint.jump')}</span><kbd>Space / Z</kbd></div>
          <div class="key-row"><span>${t('hint.dash')}</span><kbd>X / Shift</kbd></div>
          <div class="key-row"><span>${t('hint.grab')}</span><kbd>C / Ctrl</kbd></div>
          <div class="key-row"><span>${t('hint.burst')}</span><kbd>V</kbd></div>
          <div class="key-row"><span>${t('common.retry')}</span><kbd>R</kbd></div>
          <div class="key-row"><span>${t('hud.pause')}</span><kbd>Esc / P</kbd></div>
          <div class="key-row"><span>${t('menu.theme')}</span><kbd>T</kbd></div>
          <div class="key-row"><span>${t('menu.mute')}</span><kbd>M</kbd></div>
        </div><p class="small muted" style="margin-top:12px">${t('hint.touchJump')} · ${t('hint.touchDash')} · ${t('hint.touchGrab')}</p>`;
      } else {
        const st = RL.Save.data.stats;
        body += `<div class="result-stats">
          <div class="result-stat"><b>${st.deaths || 0}</b><span>${t('hud.deaths')}</span></div>
          <div class="result-stat"><b>${st.dashes || 0}</b><span>${t('hud.dash')}</span></div>
          <div class="result-stat"><b>${st.jumps || 0}</b><span>JUMP</span></div>
          <div class="result-stat"><b>${Math.round((st.playTime || 0) / 60)}m</b><span>PLAY</span></div>
          <div class="result-stat"><b>${st.rooms || 0}</b><span>ROOMS</span></div>
          <div class="result-stat"><b>${st.bursts || 0}</b><span>BURST</span></div>
        </div>`;
      }
      this.openModal(t('codex.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'codex');
      if (this._codexSeen.elements && this._codexSeen.reactions) RL.Save.unlock('codex_all');
    },
    showAchievements() {
      const a = RL.Save.data.achievements || {};
      let body = `<p class="muted small">${t('ach.progress', { done: RL.Save.achievementCount(), total: RL.ACHIEVEMENTS.length })}</p><div class="ach-grid">`;
      RL.ACHIEVEMENTS.forEach(x => {
        const on = !!a[x.id];
        body += `<div class="ach-item ${on ? 'on' : ''}"><div class="ach-icon">${x.icon}</div><div><h4>${nm(x.name)}</h4><p>${nm(x.desc)}</p></div></div>`;
      });
      body += `</div>`;
      this.openModal(t('ach.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'achievements');
    },
    showCollection() {
      const p = RL.Save.data.progress;
      let body = `<h3>${t('collection.skins')}</h3><div class="skin-grid">`;
      RL.SKINS.forEach(s => {
        const has = p.skins.includes(s.id);
        const eq = (p.skin || 'default') === s.id;
        body += `<button class="skin ${has ? '' : 'locked'} ${eq ? 'on' : ''}" ${has ? `data-ma="skin" data-id="${s.id}"` : ''}><i style="background:${s.body};border-color:${s.accent}"></i>${nm(s.name)}${eq ? ' ✓' : ''}${has ? '' : '<br><span style="font-size:8px">' + t('collection.skinUnlock', { n: s.unlock }) + '</span>'}</button>`;
      });
      body += `</div><h3 style="margin-top:18px">${t('collection.trails')}</h3><div class="skin-grid">`;
      RL.TRAILS.forEach(x => {
        const has = p.trails.includes(x.id);
        const eq = (p.trail || 'pixel') === x.id;
        body += `<button class="skin ${has ? '' : 'locked'} ${eq ? 'on' : ''}" ${has ? `data-ma="trail" data-id="${x.id}"` : ''}><i style="background:${x.color};height:6px;margin-top:18px;border-radius:99px"></i>${nm(x.name)}${eq ? ' ✓' : ''}</button>`;
      });
      body += `</div><h3 style="margin-top:18px">${t('collection.themes')}</h3><div class="theme-grid">`;
      RL.Themes.ids.forEach(id => {
        const th = RL.Themes.list[id];
        body += `<button class="theme-swatch ${RL.Themes.activeId === id ? 'on' : ''}" data-ma="setTheme" data-theme="${id}"><i style="background:linear-gradient(135deg,${th.bg0},${th.accent})"></i>${RL.I18n.name(th.name)}</button>`;
      });
      body += `</div>`;
      this.openModal(t('collection.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'collection');
    },
    equipSkin(id) { RL.Save.equipSkin(id); this.showCollection(); this.toast(t('collection.selected')); },
    equipTrail(id) { RL.Save.equipTrail(id); this.showCollection(); this.toast(t('collection.selected')); },
    showAbility() {
      const p = RL.Save.data.progress;
      let body = `<p class="muted">${t('ability.desc')}</p><p class="chip">${t('ability.points', { n: p.lumen })}</p><div class="settings-grid">`;
      ['mobility', 'resonance', 'explore'].forEach(branch => {
        body += `<div class="set-group"><h3>${t('ability.' + branch)}</h3>`;
        RL.ABILITIES.filter(a => a.branch === branch).forEach(a => {
          const on = !!p.tree[a.id];
          body += `<div class="set-row" style="align-items:flex-start"><div><label style="font-weight:700">${nm(a.name)}</label><div class="small muted" style="margin-top:2px">${nm(a.desc)}</div></div><div style="text-align:right;min-width:76px"><div class="chip">${on ? '✓' : a.cost + ' ◆'}</div>${on ? '' : `<button class="btn small" style="margin-top:6px" data-ma="buyAbility" data-id="${a.id}">${t('ability.unlock')}</button>`}</div></div>`;
        });
        body += `</div>`;
      });
      body += `</div>`;
      this.openModal(t('ability.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'ability');
    },
    buyAbility(id) {
      const a = RL.ABILITIES.find(x => x.id === id); if (!a) return;
      const p = RL.Save.data.progress;
      if (p.tree[id]) return;
      if (p.lumen < a.cost) { if (RL.Audio) RL.Audio.play('error'); this.toast(t('ability.need', { n: a.cost })); return; }
      p.lumen -= a.cost; p.tree[id] = true; RL.Save.save();
      if (RL.Audio) RL.Audio.play('unlock');
      if (RL.Game && RL.Game.player) RL.Game.setPlayerDashesMax();
      this.showAbility();
    },
    showSettings() {
      const p = RL.Save.data.profile;
      const themeSwatches = RL.Themes.ids.map(id => {
        const th = RL.Themes.list[id];
        return `<button class="theme-swatch ${RL.Themes.activeId === id ? 'on' : ''}" data-ma="setTheme" data-theme="${id}"><i style="background:linear-gradient(135deg,${th.bg0},${th.accent})"></i>${RL.I18n.name(th.name)}</button>`;
      }).join('');
      const langBtns = RL.I18n.languages.map(l => `<button class="seg-btn ${l === RL.I18n.lang ? 'on' : ''}" data-ma="setLang" data-lang="${l}">${l === 'zh-TW' ? '繁體中文' : l === 'zh-CN' ? '简体中文' : 'English'}</button>`).join('');
      const range = (key, val) => `<input type="range" min="0" max="100" value="${Math.round(val * 100)}" data-vol="${key}">`;
      const body = `<div class="settings-grid">
        <div class="set-group"><h3>${t('settings.language')} / ${t('settings.theme')}</h3>
          <div class="lang-grid">${langBtns}</div>
          <div class="theme-grid" style="margin-top:12px">${themeSwatches}</div>
          <p class="small muted" style="margin-top:9px">${t('settings.themeHint')}</p>
        </div>
        <div class="set-group"><h3>${t('settings.audio')}</h3>
          <div class="set-row"><label>${t('settings.bgm')}</label>${range('bgm', p.bgm == null ? .62 : p.bgm)}</div>
          <div class="set-row"><label>${t('settings.sfx')}</label>${range('sfx', p.sfx == null ? .78 : p.sfx)}</div>
          <div class="set-row"><label>${t('settings.mute')}</label><button class="switch ${p.muted ? 'on' : ''}" data-ma="toggleSetting" data-key="muted"></button></div>
        </div>
        <div class="set-group"><h3>${t('settings.display')}</h3>
          <div class="set-row"><label>${t('settings.quality')}</label><div class="lang-grid">${['low','medium','high'].map(q => `<button class="seg-btn ${p.quality === q ? 'on' : ''}" data-ma="quality" data-quality="${q}">${t('settings.quality.' + (q === 'medium' ? 'med' : q))}</button>`).join('')}</div></div>
          <div class="set-row"><label>${t('settings.motion')}</label><div class="slider-row"><input type="range" min="0" max="100" value="${Math.round((p.motion == null ? 1 : p.motion) * 100)}" data-motion><span>${Math.round((p.motion == null ? 1 : p.motion) * 100)}%</span></div></div>
          <div class="set-row"><label>${t('settings.fps')}</label><button class="switch ${p.showFps ? 'on' : ''}" data-ma="toggleSetting" data-key="showFps"></button></div>
          <div class="set-row"><label>${t('settings.contrast')}</label><button class="switch ${p.contrast ? 'on' : ''}" data-ma="toggleSetting" data-key="contrast"></button></div>
        </div>
        <div class="set-group"><h3>${t('settings.controls')}</h3>
          <div class="set-row"><label>${t('settings.assist')}</label><button class="switch ${p.assist ? 'on' : ''}" data-ma="toggleSetting" data-key="assist"></button></div>
          <p class="small muted" style="margin:2px 0 10px">${t('settings.assist.desc')}</p>
          <div class="set-row"><label>${t('settings.leftHand')}</label><button class="switch ${p.leftHand ? 'on' : ''}" data-ma="toggleSetting" data-key="leftHand"></button></div>
          <p class="small muted" style="margin-top:8px">${t('settings.qualityHint')}</p>
        </div>
        <div class="set-group"><h3>${t('settings.saveData')}</h3>
          <div class="btn-row"><button class="btn small" data-ma="exportSave">⇩ ${t('settings.export')}</button><button class="btn small" data-ma="importSave">⇧ ${t('settings.import')}</button><button class="btn small danger" data-ma="resetSave">${t('settings.reset')}</button></div>
          <p class="small muted" style="margin-top:9px">LocalStorage · JSON</p>
        </div>
        <div class="set-group"><h3>${t('settings.about')}</h3><p class="small muted">${t('settings.aboutText')}</p><div class="about-links"><span class="chip">v${RL.VERSION}</span><span class="chip">64 / 64</span><span class="chip">Web Audio</span><span class="chip">Canvas 2D</span></div></div>
      </div>`;
      this.openModal(t('settings.title'), body, `<button class="btn" data-ma="close">${t('common.back')}</button>`, 'settings');
      const mb = $('modal-body');
      mb.querySelectorAll('[data-vol]').forEach(inp => inp.addEventListener('input', () => {
        const key = inp.dataset.vol;
        RL.Audio.unlock();
        if (key === 'bgm') RL.Audio.setVolumes(parseInt(inp.value) / 100, null, null);
        else RL.Audio.setVolumes(null, parseInt(inp.value) / 100, null);
      }));
      const mo = mb.querySelector('[data-motion]');
      if (mo) mo.addEventListener('input', () => { p.motion = parseInt(mo.value) / 100; mo.nextElementSibling.textContent = mo.value + '%'; RL.Save.queue(); });
    },
    toggleSetting(key) {
      const p = RL.Save.data.profile;
      p[key] = !p[key];
      if (key === 'muted') { if (RL.Audio) { RL.Audio.unlock(); RL.Audio.setVolumes(null, null, p.muted); } this.updateMuteIcon(); }
      if (key === 'contrast') document.body.classList.toggle('high-contrast', !!p.contrast);
      if (key === 'assist') this.toast(p.assist ? t('toast.assistOn') : t('toast.assistOff'));
      if (key === 'showFps') $('fps').classList.toggle('hidden', !p.showFps);
      if (key === 'leftHand') this.layout();
      RL.Save.save();
      if (this.currentModal === 'settings') this.showSettings();
    },
    showImport() {
      this.openModal(t('settings.import'), `<p class="muted small">${t('settings.importHint')}</p><textarea id="import-code" style="width:100%;height:130px;resize:vertical"></textarea>`, `<button class="btn" data-ma="close">${t('common.cancel')}</button><button class="btn primary" data-ma="doImport">${t('common.import')}</button>`, 'import');
    },
    showPause() {
      const G = RL.Game;
      const st = G ? `<div class="result-stats"><div class="result-stat"><b>${U.formatTime(G.roomTime)}</b><span>${t('result.time')}</span></div><div class="result-stat"><b>${G.roomDeaths}</b><span>${t('result.deaths')}</span></div><div class="result-stat"><b>${G.roomShards}/${G.roomShardTotal}</b><span>${t('result.shards')}</span></div><div class="result-stat"><b>${Math.floor(G.resonance)}</b><span>${t('hud.resonance')}</span></div></div>` : '';
      const body = `<p class="muted">${G ? nm((RL.CHAPTERS[G.chapter - 1] || {}).name) : ''} · ${G ? G.chapter + '-' + G.index : ''}</p>${st}<div class="btn-row" style="margin-top:12px"><button class="btn primary wide" data-ma="resume">▶ ${t('pause.resume')}</button></div><div class="btn-row" style="margin-top:8px"><button class="btn" data-ma="restart">↻ ${t('pause.restart')}</button><button class="btn" data-ma="pauseSettings">⚙ ${t('pause.settings')}</button><button class="btn" data-ma="pauseCodex">▤ ${t('pause.codex')}</button><button class="btn danger" data-ma="quit">${t('pause.quit')}</button></div>`;
      this.openModal(t('pause.title'), body, '', 'pause');
    },
    showResult(r) {
      if (!r) return;
      const success = r.success;
      const title = success ? t('result.clear') : (r.reason === 'timeout' ? t('result.timeout') : r.reason === 'outOfLives' ? t('result.outOfLives') : t('result.fail'));
      const grade = success ? `<div class="result-grade">${r.grade}</div><div class="result-title">${t('grade.' + r.grade)}</div>` : `<div class="result-grade" style="font-size:42px;color:var(--danger)">✕</div><div class="result-title">${title}</div>`;
      let body = `<div class="result-hero">${grade}${r.isNewBest ? `<div class="chip" style="margin-top:10px;border-color:var(--gold);color:var(--gold)">✦ ${t('result.newRecord')}</div>` : ''}</div>`;
      body += `<div class="result-stats">
        <div class="result-stat"><b>${U.formatTime(r.time)}</b><span>${t('result.time')}</span></div>
        <div class="result-stat"><b>${r.deaths}</b><span>${t('result.deaths')}</span></div>
        <div class="result-stat"><b>${r.shards}</b><span>${t('result.shards')}</span></div>
        <div class="result-stat"><b>${r.maxCombo || 0}</b><span>COMBO</span></div>
      </div>`;
      if (r.score) body += `<p class="small" style="text-align:center;color:var(--accent);font-family:var(--font);letter-spacing:.14em">SCORE ${r.score}</p>`;
      if (r.assisted) body += `<p class="small muted" style="text-align:center">◇ ${t('result.assist')}</p>`;
      if (r.chapterEnd) body += `<p class="chip" style="margin:10px auto;display:table">✦ ${t('story.chapter', { n: r.chapter })} ${t('result.unlocked')}</p>`;
      if (r.dailyComplete) body += `<p class="chip" style="margin:10px auto;display:table">☼ ${t('daily.done')}</p>`;
      if (r.gauntletComplete) body += `<p class="chip" style="margin:10px auto;display:table">♜ ${t('mode.gauntlet')} ✓</p>`;
      if (r.endlessFloor) body += `<p class="small muted" style="text-align:center">∞ Floor ${r.endlessFloor}</p>`;
      let foot = '';
      if (success && r.chapterComplete) {
        foot += `<button class="btn primary" data-ma="finale">${t('result.finale')}</button>`;
      } else if (success) {
        foot += `<button class="btn primary" data-ma="next">${r.mode === 'story' && r.index === 8 && r.chapter < 6 ? t('common.next') + ' →' : t('common.next')}</button>`;
      } else {
        foot += `<button class="btn primary" data-ma="retry">${t('result.retry')}</button>`;
      }
      foot += `<button class="btn" data-ma="retry">↻ ${t('common.retry')}</button><button class="btn" data-ma="quit">${t('pause.quit')}</button>`;
      this.openModal(t('result.title'), body, foot, 'result');
      if (RL.Audio) RL.Audio.play(success ? 'unlock' : 'error');
    },
    showFinale() {
      const st = RL.Save.data.stats;
      const ach = RL.Save.achievementCount();
      const body = `<div style="text-align:center;padding:6px 0 4px"><div style="font-family:var(--font);font-size:10px;letter-spacing:.3em;color:var(--accent)">${t('finale.sub')}</div><h2 style="font-size:30px;letter-spacing:.18em;margin:10px 0 4px">${t('finale.title')}</h2><div style="height:1px;background:var(--line);max-width:260px;margin:14px auto"></div></div>
        <p style="max-width:560px;margin:0 auto 14px;line-height:1.9;text-align:center">${t('finale.body')}</p>
        <div class="result-stats" style="max-width:620px;margin:0 auto"><div class="result-stat"><b>${st.rooms || 0}</b><span>ROOMS</span></div><div class="result-stat"><b>${st.deaths || 0}</b><span>DEATHS</span></div><div class="result-stat"><b>${st.shards || 0}</b><span>LUMEN</span></div><div class="result-stat"><b>${ach}/${RL.ACHIEVEMENTS.length}</b><span>ACHIEVEMENTS</span></div></div>
        <p style="text-align:center;margin-top:18px;color:var(--gold)">✦ ${t('finale.thanks')} ✦</p><p class="small muted" style="text-align:center;margin-top:8px">${t('finale.credits')}</p>`;
      this.openModal(t('finale.title'), body, `<button class="btn primary" data-ma="quit">${t('pause.quit')}</button>`, 'finale');
      if (RL.Audio) RL.Audio.play('beacon');
    },
    showRoomIntro(room) {
      if (!room) return;
      const chap = RL.CHAPTERS[(room.chapter || 1) - 1] || RL.CHAPTERS[0];
      let text = `${nm(chap.name)} · ${room.chapter || 1}-${room.index || 1}`;
      if (RL.Game.mode === 'sandbox') text = t('mode.sandbox');
      else if (RL.Game.mode === 'custom') text = t('mode.editor');
      if (room.boss) text = '◉ ' + t('hint.boss');
      this.showHint(text, 2400);
    },
    showHint(text, ms) {
      if (!text) return;
      const el = $('hint-strip');
      el.textContent = text;
      el.classList.remove('hidden');
      if (this.hintTimer) clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => el.classList.add('hidden'), ms || 2600);
    },
    hideHint() { $('hint-strip').classList.add('hidden'); },
    toast(text, ms) {
      const box = $('toasts');
      const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
      box.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(12px)'; setTimeout(() => el.remove(), 220); }, ms || 2200);
      while (box.children.length > 4) box.firstChild.remove();
    },
    queueAchievement(def) {
      if (!def) return;
      this.achQueue.push(def);
      if (!this.achShowing) this.nextAchievement();
    },
    nextAchievement() {
      const def = this.achQueue.shift();
      if (!def) { this.achShowing = false; return; }
      this.achShowing = true;
      $('ach-toast-name').textContent = nm(def.name);
      const el = $('achievement-toast');
      el.classList.remove('hidden');
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      if (RL.Audio) RL.Audio.play('unlock');
      setTimeout(() => { el.classList.add('hidden'); setTimeout(() => this.nextAchievement(), 220); }, 2800);
    },
    updateHUD(force) {
      const G = RL.Game; if (!G || !G.player || !G.room) return;
      const p = G.player;
      const sh = this.lastHUD;
      const stam = Math.round((p.stamina / p.maxStamina) * 100);
      if (force || sh.stam !== stam) { $('hud-stamina').style.width = Math.max(0, stam) + '%'; sh.stam = stam; }
      if (force || sh.dash !== p.dashes || sh.maxDash !== p.maxDashes) {
        let s = '';
        for (let i = 0; i < Math.max(p.maxDashes, 1); i++) s += `<i class="${i < p.dashes ? 'on' : ''}"></i>`;
        $('hud-dashes').innerHTML = s; sh.dash = p.dashes; sh.maxDash = p.maxDashes;
      }
      const res = Math.round(G.resonance);
      if (force || sh.res !== res) { $('hud-resonance').style.width = res + '%'; sh.res = res; $('hud-fever').classList.toggle('hidden', G.feverTimer <= 0); }
      const time = G.timeLimit > 0 ? '⏱ ' + U.formatTime(Math.max(0, G.timeLimit - G.roomTime)) : U.formatTime(G.roomTime);
      if (force || sh.time !== time) { $('hud-timer').textContent = time; sh.time = time; }
      if (force || sh.deaths !== G.roomDeaths) { $('hud-deaths').textContent = G.roomDeaths; sh.deaths = G.roomDeaths; }
      if (force || sh.shards !== G.roomShards) { $('hud-shards').textContent = G.roomShards; sh.shards = G.roomShards; }
      let room = G.chapter + '-' + G.index;
      if (G.mode === 'daily') room = 'DAILY ' + G.dailyIndex + '/5';
      else if (G.mode === 'endless') room = 'FLOOR ' + G.floor + ' · ♥' + G.lives;
      else if (G.mode === 'gauntlet') room = 'TRIAL ' + G.gauntletIndex + '/10';
      else if (G.mode === 'sandbox') room = 'LAB';
      if (G.dashLimit > 0) room += ' · ' + Math.max(0, G.dashLimit - G.dashesUsed);
      if (force || sh.room !== room) { $('hud-room').textContent = room; sh.room = room; }
      const boss = $('boss-wrap');
      if (G.room.boss) {
        boss.classList.remove('hidden');
        const prog = G.room.chase ? U.clamp((G.room.chase.x + 60) / Math.max(1, G.room.goal.x), 0, 1) : 0;
        $('boss-fill').style.width = Math.max(0, 100 - prog * 100) + '%';
      } else boss.classList.add('hidden');
      const b = $('btn-burst');
      const ready = G.resonance >= 100;
      b.classList.toggle('hidden', !ready);
      if (ready) b.classList.add('on'); else b.classList.remove('on');
    },
    burstReady(on) { const b = $('btn-burst'); if (b) b.classList.toggle('hidden', !on); const tb = document.querySelector('.tbtn-burst'); if (tb) { tb.classList.toggle('off', !on); tb.disabled = !on; } },
    comboPop(n) {
      const el = $('combo-pop');
      if (!el) return;
      el.textContent = 'x' + n;
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), 450);
    },
    flashDamage() {
      const el = $('flash'); if (!el) return;
      el.style.opacity = '.22';
      setTimeout(() => { el.style.opacity = '0'; }, 70);
    },
    copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
      else { try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) {} }
    },
    bindKeyboard() {
      window.addEventListener('keydown', (e) => {
        if (RL.Game.paused && (e.code === 'KeyP' || e.code === 'Escape') && this.currentModal === 'pause') { RL.Game.togglePause(false); return; }
        if (RL.Game.phase === 'playing' || RL.Game.phase === 'dead' || RL.Game.phase === 'clear') {
          if (e.code === 'KeyM') { this.toggleMute(); }
          if (e.code === 'KeyT' && !e.repeat) { RL.Themes.cycle(); this.applyTheme(); }
          return;
        }
        if (e.code === 'Escape') {
          if (this.currentModal) this.closeModal();
          else if (RL.Game.phase === 'menu') { /* no-op */ }
        }
        if (e.code === 'KeyM' && !e.repeat) this.toggleMute();
        if (e.code === 'KeyT' && !e.repeat) { RL.Themes.cycle(); this.applyTheme(); }
        if (e.code === 'Tab' && RL.Game.phase === 'menu') { e.preventDefault(); this.showCodex(); }
      });
    },
    bindTouchButton(btn) {
      const action = btn.dataset.touch;
      const down = (e) => { e.preventDefault(); if (RL.Audio) RL.Audio.unlock(); RL.Input.setVirtual(action, true); btn.classList.add('pressed'); try { btn.setPointerCapture(e.pointerId); } catch (err) {} if (navigator.vibrate) navigator.vibrate(8); };
      const up = (e) => { e.preventDefault(); RL.Input.setVirtual(action, false); btn.classList.remove('pressed'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    },
    bindJoystick() {
      const zone = $('joystick'), base = zone.querySelector('.stick-base'), knob = $('stick-knob');
      let pid = null;
      const update = (e) => {
        const r = base.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let dx = e.clientX - cx, dy = e.clientY - cy;
        const max = r.width * .42;
        const len = Math.hypot(dx, dy);
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        RL.Input.setAxis(U.clamp(dx / max, -1, 1), U.clamp(dy / max, -1, 1));
      };
      zone.addEventListener('pointerdown', (e) => {
        e.preventDefault(); pid = e.pointerId; if (RL.Audio) RL.Audio.unlock();
        try { base.setPointerCapture(e.pointerId); } catch (err) {}
        update(e);
      });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) { e.preventDefault(); update(e); } });
      const end = (e) => { if (e.pointerId !== pid) return; pid = null; RL.Input.setAxis(0, 0); knob.style.transform = 'translate(-50%,-50%)'; };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('contextmenu', e => e.preventDefault());
    }
  };
  RL.UI = UI;
})();
