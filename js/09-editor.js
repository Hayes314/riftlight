/* ==========================================================================
   RIFTLIGHT — Rift Forge: paint rooms, test, save, share
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util, T = RL.CFG.TILE, $ = id => document.getElementById(id);

  const TOOLS = [
    { kind: 'tile', id: '1', glyph: '▦', key: 'editor.brush.solid' },
    { kind: 'tile', id: '2', glyph: '▲', key: 'editor.brush.spike' },
    { kind: 'tile', id: '3', glyph: '═', key: 'editor.brush.oneway' },
    { kind: 'tile', id: '4', glyph: '❄', key: 'editor.brush.ice' },
    { kind: 'tile', id: '0', glyph: '◇', key: 'editor.brush.erase' },
    { kind: 'spawn', id: 'spawn', glyph: '◉', key: 'editor.brush.spawn' },
    { kind: 'goal', id: 'goal', glyph: '✦', key: 'editor.brush.goal' },
    { kind: 'entity', id: 'shard', glyph: '◆', key: 'editor.brush.shard' },
    { kind: 'entity', id: 'spring', glyph: '↟', key: 'editor.brush.spring' },
    { kind: 'entity', id: 'crystal', glyph: '◈', key: 'editor.brush.crystal' },
    { kind: 'entity', id: 'wind', glyph: '≋', key: 'editor.brush.wind' },
    { kind: 'entity', id: 'checkpoint', glyph: '⚑', key: 'editor.brush.checkpoint' }
  ];

  const Ed = {
    active: false, testing: false, room: null, tool: TOOLS[0], cursor: { tx: 0, ty: 0, show: false },
    undoStack: [], redoStack: [], drawing: false, lastKey: '', snapshot: null, ui: null, returnBtn: null,
    init() {
      this.createUI();
      const canvas = $('game');
      canvas.addEventListener('pointerdown', (e) => this.onDown(e));
      canvas.addEventListener('pointermove', (e) => this.onMove(e));
      canvas.addEventListener('pointerup', (e) => this.onUp(e));
      canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    },
    createUI() {
      if ($('editor-ui')) { this.ui = $('editor-ui'); return; }
      const el = document.createElement('section');
      el.id = 'editor-ui'; el.className = 'editor-ui hidden';
      el.innerHTML = `
        <div class="editor-top">
          <div class="editor-title"><span class="brand-mark">✦</span> RIFT FORGE <span class="muted small" data-i18n="editor.desc"></span></div>
          <div class="editor-actions">
            <button class="btn small" data-ma="editorUndo">↶ <span data-i18n="editor.undo">Undo</span></button>
            <button class="btn small" data-ma="editorRedo">↷ <span data-i18n="editor.redo">Redo</span></button>
            <button class="btn small" data-ma="editorSave">⇩ <span data-i18n="editor.save">Save</span></button>
            <button class="btn small" data-ma="editorExport">↗ <span data-i18n="editor.export">Export</span></button>
            <button class="btn small" data-ma="editorImport">↘ <span data-i18n="editor.import">Import</span></button>
            <button class="btn small" data-ma="editorNew">＋ <span data-i18n="editor.new">New</span></button>
            <button class="btn small" data-ma="editorSaved">▤ <span data-i18n="editor.savedLevels">Saved</span></button>
            <button class="btn small primary" data-ma="editorTest">▶ <span data-i18n="editor.test">Playtest</span></button>
            <button class="btn small danger" data-ma="editorClose">× <span data-i18n="common.close">Close</span></button>
          </div>
        </div>
        <div class="editor-palette" id="editor-palette"></div>
        <div class="editor-note" data-i18n="editor.note"></div>
      `;
      $('app').appendChild(el);
      this.ui = el;
      this.buildPalette();
      RL.I18n.applyDOM(el);
    },
    buildPalette() {
      const p = $('editor-palette'); if (!p) return;
      p.innerHTML = TOOLS.map((x, i) => `<button class="editor-tool ${i === 0 ? 'on' : ''}" data-ma="editorTool" data-tool="${x.kind}" data-kind="${x.id}" title="${RL.I18n.t(x.key)}"><b>${x.glyph}</b><span>${RL.I18n.t(x.key)}</span></button>`).join('');
    },
    open() {
      this.createUI();
      this.active = true; this.testing = false;
      RL.Game.phase = 'editor';
      RL.Game.paused = false; RL.Game.room = null;
      $('menu').classList.add('hidden');
      $('hud').classList.add('hidden');
      $('touch-controls').classList.add('hidden');
      RL.UI.hideModal();
      this.ui.classList.remove('hidden');
      if (RL.Renderer) RL.Renderer.resize();
      if (!this.room) this.newRoom();
      this.buildPalette();
      RL.I18n.applyDOM(this.ui);
      if (RL.Audio) RL.Audio.setScene('menu', .2);
    },
    close() {
      this.active = false; this.testing = false;
      this.ui.classList.add('hidden');
      if (this.returnBtn) { this.returnBtn.remove(); this.returnBtn = null; }
      if (RL.Game) { RL.Game.room = null; RL.Game.phase = 'menu'; }
      RL.UI.showMenu();
    },
    newRoom() {
      const room = RL.Levels.emptyRoom(68, 34);
      for (let x = 0; x < room.w; x++) { room.tiles[33][x] = 1; room.tiles[32][x] = 1; }
      for (let y = 0; y < room.h; y++) { room.tiles[y][0] = 1; room.tiles[y][room.w - 1] = 1; }
      room.spawn = { x: 3 * T, y: 29 * T - 18 };
      room.goal = { type: 'goal', x: (room.w - 5) * T, y: 24 * T, w: 16, h: 40 };
      room.entities = [room.goal];
      room.checkpoint = { type: 'checkpoint', x: (room.w / 2) * T, y: 24 * T, w: 10, h: 18, active: false };
      room.entities.push(room.checkpoint);
      room.editor = true;
      room.id = 'custom-' + Date.now().toString(36);
      this.room = room; this.undoStack = []; this.redoStack = [];
      this.cursor = { tx: 0, ty: 0, show: false };
    },
    setTool(kind, id) {
      const found = TOOLS.find(x => x.kind === kind && String(x.id) === String(id));
      if (found) this.tool = found;
      const pal = $('editor-palette');
      if (pal) Array.from(pal.children).forEach((b, i) => b.classList.toggle('on', TOOLS[i] === found));
    },
    snapshotState() {
      try {
        return JSON.stringify({
          w: this.room.w, h: this.room.h,
          tiles: this.room.tiles,
          spawn: this.room.spawn, goal: this.room.goal,
          entities: this.room.entities.filter(e => e.type !== 'goal').map(e => ({ type: e.type, kind: e.kind, x: e.x, y: e.y, w: e.w, h: e.h, pair: e.pair, active: e.active })),
          id: this.room.id
        });
      } catch (e) { return ''; }
    },
    pushUndo() {
      const s = this.snapshotState();
      if (!s) return;
      this.undoStack.push(s);
      if (this.undoStack.length > 60) this.undoStack.shift();
      this.redoStack.length = 0;
    },
    restore(s) {
      if (!s) return;
      try {
        const o = JSON.parse(s);
        const r = RL.Levels.emptyRoom(o.w, o.h);
        r.id = o.id || this.room.id;
        r.tiles = o.tiles;
        r.spawn = o.spawn; r.goal = o.goal;
        r.entities = o.entities.map(e => Object.assign({ t: 0, active: true }, e));
        if (r.goal) r.entities.push(r.goal);
        r.checkpoint = r.entities.find(e => e.type === 'checkpoint') || { type: 'checkpoint', x: r.w * 4, y: 24 * T, w: 10, h: 18, active: false };
        if (!r.entities.find(e => e.type === 'checkpoint')) r.entities.push(r.checkpoint);
        r.editor = true;
        this.room = r;
      } catch (e) {}
    },
    undo() { if (!this.undoStack.length) return; this.redoStack.push(this.snapshotState()); this.restore(this.undoStack.pop()); },
    redo() { if (!this.redoStack.length) return; this.undoStack.push(this.snapshotState()); this.restore(this.redoStack.pop()); },
    screenToTile(clientX, clientY) {
      const R = RL.Renderer;
      if (!R || !this.room) return null;
      const ev = this.view();
      const tx = Math.floor((clientX - ev.x) / ev.scale / T);
      const ty = Math.floor((clientY - ev.y) / ev.scale / T);
      if (tx < 0 || ty < 0 || tx >= this.room.w || ty >= this.room.h) return null;
      return { tx, ty };
    },
    view() {
      if (RL.Renderer && RL.Renderer.editorView) return RL.Renderer.editorView;
      const w = window.innerWidth, h = window.innerHeight;
      const scale = Math.min((w * .92) / (this.room.w * T), (h * .74) / (this.room.h * T));
      return { x: (w - this.room.w * T * scale) / 2, y: (h - this.room.h * T * scale) / 2 + 26, scale };
    },
    onDown(e) {
      if (!this.active) return;
      e.preventDefault();
      const c = this.screenToTile(e.clientX, e.clientY); if (!c) return;
      this.pushUndo(); this.drawing = true; this.lastKey = '';
      this.paint(c.tx, c.ty);
      try { $('game').setPointerCapture(e.pointerId); } catch (err) {}
    },
    onMove(e) {
      if (!this.active) return;
      const c = this.screenToTile(e.clientX, e.clientY);
      if (c) this.cursor = { tx: c.tx, ty: c.ty, show: true }; else this.cursor.show = false;
      if (this.drawing && c) {
        const k = c.tx + ',' + c.ty;
        if (k !== this.lastKey) { this.lastKey = k; this.paint(c.tx, c.ty); }
      }
    },
    onUp() { this.drawing = false; this.lastKey = ''; },
    paint(tx, ty) {
      const room = this.room, tool = this.tool;
      if (tool.kind === 'tile') {
        room.tiles[ty][tx] = parseInt(tool.id);
        return;
      }
      // remove previous entity of same kind at tile
      const wx = tx * T, wy = ty * T;
      room.entities = room.entities.filter(e => !(e.type === 'element' || e.type === 'shard' || e.type === 'spring') || Math.abs(e.x - wx) > 4 || Math.abs(e.y - wy) > 4);
      if (tool.kind === 'spawn') {
        room.spawn = { x: wx, y: wy };
        if (room.goal) { room.entities = room.entities.filter(e => e.type !== 'goal'); room.entities.push(room.goal); }
        return;
      }
      if (tool.kind === 'goal') {
        room.goal = { type: 'goal', x: wx, y: wy, w: 16, h: 40 };
        room.entities = room.entities.filter(e => e.type !== 'goal');
        room.entities.push(room.goal);
        return;
      }
      if (tool.kind === 'entity') {
        const e = Object.assign({ type: 'element', kind: tool.id, w: 16, h: 16, x: wx, y: wy, t: 0, active: true }, {});
        if (tool.id === 'shard') { e.type = 'shard'; e.w = 7; e.h = 7; e.phase = 0; }
        if (tool.id === 'checkpoint') { e.type = 'checkpoint'; e.w = 10; e.h = 18; e.active = false; }
        if (tool.id === 'wind') { e.w = 30; e.h = 74; }
        if (tool.id === 'spring') { e.w = 16; e.h = 10; }
        room.entities.push(e);
      }
    },
    serialize() {
      const r = this.room;
      return {
        v: 1, id: r.id || 'custom', w: r.w, h: r.h,
        tiles: r.tiles.map(row => row.slice()),
        spawn: { x: Math.round(r.spawn.x / T), y: Math.round(r.spawn.y / T) },
        goal: r.goal ? { x: Math.round(r.goal.x / T), y: Math.round(r.goal.y / T) } : { x: r.w - 4, y: 20 },
        entities: r.entities.filter(e => e.type !== 'goal' && e.type !== 'checkpoint').map(e => ({
          type: e.type, kind: e.kind, x: Math.round(e.x / T), y: Math.round(e.y / T), w: e.w, h: e.h
        }))
      };
    },
    exportCode() {
      try {
        const code = btoa(unescape(encodeURIComponent(JSON.stringify(this.serialize()))));
        RL.Save.unlock('forge');
        RL.UI.copyText(code);
        RL.UI.openModal(RL.I18n.t('editor.export'), `<p class="muted small">${RL.I18n.t('editor.copied')}</p><textarea readonly style="width:100%;height:130px;resize:vertical">${code}</textarea><div class="btn-row"><button class="btn" data-ma="close">${RL.I18n.t('common.close')}</button></div>`, `<button class="btn" data-ma="close">${RL.I18n.t('common.close')}</button>`, 'editor-export');
        RL.UI.toast(RL.I18n.t('editor.copied'));
      } catch (e) { RL.UI.toast(RL.I18n.t('editor.invalid')); }
    },
    saveLevel() {
      const data = this.serialize();
      RL.Save.addCustomLevel(data);
      RL.Save.unlock('forge');
      RL.UI.toast(RL.I18n.t('editor.saved'));
    },
    importCode() {
      RL.UI.openModal(RL.I18n.t('editor.import'), `<p class="muted small">${RL.I18n.t('editor.desc')}</p><textarea id="editor-import-code" style="width:100%;height:130px;resize:vertical"></textarea>`, `<button class="btn" data-ma="close">${RL.I18n.t('common.cancel')}</button><button class="btn primary" id="editor-import-go">${RL.I18n.t('common.import')}</button>`, 'editor-import');
      setTimeout(() => {
        const b = $('editor-import-go'); if (!b) return;
        b.addEventListener('click', () => {
          try {
            const raw = $('editor-import-code').value.trim();
            const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
            this.restore(this.snapshotState());
            const r = RL.Levels.fromCustom(json);
            this.room = r; this.room.editor = true;
            this.room.spawn = { x: (json.spawn ? json.spawn.x : 3) * T, y: (json.spawn ? json.spawn.y : 20) * T };
            this.room.goal = { type: 'goal', x: (json.goal ? json.goal.x : r.w - 4) * T, y: (json.goal ? json.goal.y : 20) * T, w: 16, h: 40 };
            this.room.entities = r.entities.concat([this.room.goal]);
            this.room.entities = this.room.entities.filter(e => e.type !== 'goal' || e === this.room.goal);
            RL.UI.hideModal(); RL.UI.toast(RL.I18n.t('editor.imported'));
          } catch (e) { RL.UI.toast(RL.I18n.t('editor.invalid')); }
        });
      }, 20);
    },
    test() {
      if (!this.room.goal) { RL.UI.toast(RL.I18n.t('editor.note')); return; }
      const data = this.serialize();
      this.snapshot = this.snapshotState();
      this.testing = true;
      this.ui.classList.add('hidden');
      RL.Game.phase = 'menu';
      RL.Game.startCustom(data);
      if (!this.returnBtn) {
        this.returnBtn = document.createElement('button');
        this.returnBtn.className = 'btn editor-return-btn';
        this.returnBtn.textContent = '↩ ' + RL.I18n.t('editor.stop');
        this.returnBtn.addEventListener('click', () => this.returnFromTest());
        $('app').appendChild(this.returnBtn);
      }
      setTimeout(() => { if (this.returnBtn) this.returnBtn.classList.remove('hidden'); }, 300);
    },
    showSaved() {
      const list = (RL.Save.data.progress.customLevels || []);
      let body = `<p class="muted small">${RL.I18n.t('editor.desc')}</p><div class="card-grid">`;
      if (!list.length) body += `<p class="muted">${RL.I18n.t('editor.empty')}</p>`;
      list.forEach((lvl, i) => {
        body += `<div class="mini-card"><h4>${lvl.id || ('Room ' + (i + 1))}</h4><p>${lvl.w} × ${lvl.h} · ${(lvl.entities || []).length} entities</p><button class="btn small" style="margin-top:8px" data-ma="editorPlay" data-idx="${i}">▶ ${RL.I18n.t('common.play')}</button></div>`;
      });
      body += `</div>`;
      RL.UI.openModal(RL.I18n.t('editor.savedLevels'), body, `<button class="btn" data-ma="close">${RL.I18n.t('common.back')}</button>`, 'editor-saved');
    },
    playSaved(index) {
      const lvl = (RL.Save.data.progress.customLevels || [])[index];
      if (!lvl) return;
      this.testing = true;
      this.ui.classList.add('hidden');
      RL.UI.hideModal();
      RL.Game.startCustom(lvl);
      if (!this.returnBtn) {
        this.returnBtn = document.createElement('button');
        this.returnBtn.className = 'btn editor-return-btn';
        this.returnBtn.textContent = '↩ ' + RL.I18n.t('editor.stop');
        this.returnBtn.addEventListener('click', () => this.returnFromTest());
        document.getElementById('app').appendChild(this.returnBtn);
      }
      this.returnBtn.classList.remove('hidden');
      this.snapshot = this.snapshotState();
    },
    returnFromTest() {
      this.testing = false;
      if (this.returnBtn) { this.returnBtn.classList.add('hidden'); }
      this.active = true;
      RL.Game.phase = 'editor';
      RL.Game.room = null;
      $('hud').classList.add('hidden');
      $('touch-controls').classList.add('hidden');
      this.ui.classList.remove('hidden');
      if (this.snapshot) this.restore(this.snapshot);
      if (RL.Renderer) RL.Renderer.resize();
    }
  };
  RL.Editor = Ed;
})();
