/* ==========================================================================
   RIFTLIGHT — persistent save, achievements, records, import/export
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util;
  const VERSION = 1;

  function defaults() {
    return {
      v: VERSION,
      profile: {
        lang: 'zh-TW', theme: 'arcane', bgm: .62, sfx: .78, muted: false,
        quality: (navigator.maxTouchPoints || 0) > 0 ? 'medium' : 'high',
        motion: 1, showFps: false, contrast: false, assist: false, leftHand: false
      },
      progress: {
        story: { chapter: 1, room: 1, completed: {}, best: {}, grades: {} },
        daily: { date: '', time: 0, streak: 0, done: false },
        endless: { bestFloor: 0 },
        lumen: 0,
        sigils: ['windstep'],
        equippedSigils: [],
        tree: {},
        skins: ['default'],
        trails: ['pixel'],
        seenHints: {},
        customLevels: [],
        sandboxSlots: [null, null, null, null, null],
        gauntlet: { done: false, best: 0 },
        shardsTotal: 0
      },
      stats: {
        deaths: 0, dashes: 0, jumps: 0, playTime: 0, bursts: 0, shards: 0,
        wallJumps: 0, perfectLandings: 0, maxCombo: 0, rooms: 0, runs: 0, bestChain: 0
      },
      achievements: {},
      records: { tutorial: {}, roomBest: {}, dailyTop: [], endlessTop: [] }
    };
  }

  const Save = {
    data: defaults(),
    _timer: null,
    load() {
      let loaded = null;
      try { const raw = localStorage.getItem(RL.CFG.SAVE_KEY); if (raw) loaded = JSON.parse(raw); } catch (e) { loaded = null; }
      const base = defaults();
      if (loaded && typeof loaded === 'object') {
        const d = Object.assign(base, loaded);
        d.profile = Object.assign(base.profile, loaded.profile || {});
        d.progress = Object.assign(base.progress, loaded.progress || {});
        d.progress.story = Object.assign(base.progress.story, (loaded.progress && loaded.progress.story) || {});
        d.progress.daily = Object.assign(base.progress.daily, (loaded.progress && loaded.progress.daily) || {});
        d.progress.endless = Object.assign(base.progress.endless, (loaded.progress && loaded.progress.endless) || {});
        d.progress.gauntlet = Object.assign(base.progress.gauntlet, (loaded.progress && loaded.progress.gauntlet) || {});
        d.stats = Object.assign(base.stats, loaded.stats || {});
        d.achievements = loaded.achievements || {};
        d.records = Object.assign(base.records, loaded.records || {});
        if (!Array.isArray(d.progress.skins) || !d.progress.skins.length) d.progress.skins = ['default'];
        if (!Array.isArray(d.progress.trails) || !d.progress.trails.length) d.progress.trails = ['pixel'];
        this.data = d;
      } else this.data = base;
      if (!this.data.progress.equippedSigils || !this.data.progress.equippedSigils.length) {
        this.data.progress.equippedSigils = this.data.progress.sigils.slice(0, 3);
      }
      return this.data;
    },
    persist() { this.load(); },
    queue() {
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => { this._timer = null; this.save(); }, 420);
    },
    save() {
      try {
        localStorage.setItem(RL.CFG.SAVE_KEY, JSON.stringify(this.data));
        RL.Bus.emit('save:write', this.data);
        return true;
      } catch (e) { RL.lastError = e; return false; }
    },
    reset() {
      this.data = defaults();
      try { localStorage.removeItem(RL.CFG.SAVE_KEY); } catch (e) {}
      this.save();
      RL.Bus.emit('save:reset', this.data);
    },
    exportB64() {
      try {
        const json = JSON.stringify(this.data);
        return btoa(unescape(encodeURIComponent(json)));
      } catch (e) { return ''; }
    },
    importB64(code) {
      try {
        let json;
        const raw = String(code || '').trim();
        try { json = decodeURIComponent(escape(atob(raw))); } catch (e) { json = raw; }
        const obj = JSON.parse(json);
        if (!obj || typeof obj !== 'object' || !obj.profile || !obj.progress) return { ok: false, reason: 'schema' };
        const base = defaults();
        const d = Object.assign(base, obj);
        d.profile = Object.assign(base.profile, obj.profile || {});
        d.progress = Object.assign(base.progress, obj.progress || {});
        d.stats = Object.assign(base.stats, obj.stats || {});
        d.achievements = obj.achievements || {};
        d.records = Object.assign(base.records, obj.records || {});
        if (!Array.isArray(d.records.dailyTop)) d.records.dailyTop = [];
        if (!Array.isArray(d.records.endlessTop)) d.records.endlessTop = [];
        this.data = d;
        this.save();
        RL.Bus.emit('save:import', d);
        return { ok: true };
      } catch (e) { return { ok: false, reason: 'parse' }; }
    },
    download() {
      try {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'riftlight-save.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1200);
        return true;
      } catch (e) { return false; }
    },
    unlock(id) {
      if (!id || this.data.achievements[id]) return false;
      const def = RL.ACHIEVEMENTS.find(a => a.id === id);
      if (!def) return false;
      this.data.achievements[id] = Date.now();
      this.save();
      RL.Bus.emit('achievement:unlock', def);
      if (RL.Audio) RL.Audio.play('unlock');
      return true;
    },
    unlocked(id) { return !!this.data.achievements[id]; },
    achievementCount() { return Object.keys(this.data.achievements || {}).length; },
    addLumen(n) {
      const v = Math.max(0, Math.floor(n || 0));
      this.data.progress.lumen += v;
      this.data.stats.shards += v;
      this.data.progress.shardsTotal = (this.data.progress.shardsTotal || 0) + v;
      if (v > 0) this.refreshUnlocks();
      this.queue();
      return v;
    },
    refreshUnlocks() {
      const lumen = this.data.progress.lumen;
      let changed = false;
      for (const s of RL.SKINS) {
        if (!this.data.progress.skins.includes(s.id) && lumen >= s.unlock) { this.data.progress.skins.push(s.id); changed = true; RL.Bus.emit('skin:unlock', s); }
      }
      for (const t of RL.TRAILS) {
        if (!this.data.progress.trails.includes(t.id) && lumen >= t.unlock) { this.data.progress.trails.push(t.id); changed = true; }
      }
      if (changed) { RL.Bus.emit('collection:change'); this.save(); }
      if (this.data.progress.skins.length >= 8) this.unlock('collector');
      return changed;
    },
    hasSkin(id) { return this.data.progress.skins.includes(id); },
    hasTrail(id) { return this.data.progress.trails.includes(id); },
    equipSkin(id) { if (this.hasSkin(id)) { this.data.progress.skin = id; this.save(); RL.Bus.emit('collection:change'); } },
    equipTrail(id) { if (this.hasTrail(id)) { this.data.progress.trail = id; this.save(); RL.Bus.emit('collection:change'); } },
    storyProgress() {
      const s = this.data.progress.story;
      return Object.keys(s.completed || {}).length;
    },
    isChapterUnlocked(ch) { return ch <= 1 || !!this.data.progress.story.completed[`${ch - 1}-8`] || (this.data.progress.story.chapter || 1) >= ch; },
    isRoomUnlocked(ch, room) {
      if (!this.isChapterUnlocked(ch)) return false;
      if (ch === 1 && room === 1) return true;
      if (room === 1) return !!this.data.progress.story.completed[`${ch - 1}-8`] || (this.data.progress.story.chapter || 1) > ch;
      return !!this.data.progress.story.completed[`${ch}-${room - 1}`];
    },
    markRoom(ch, room, result) {
      const key = `${ch}-${room}`;
      const st = this.data.progress.story;
      st.completed[key] = true;
      if (!st.best[key] || result.time < st.best[key].time) {
        st.best[key] = { time: result.time, deaths: result.deaths, shards: result.shards, grade: result.grade, assisted: result.assisted };
        st.grades[key] = result.grade;
        if (RL.Themes && result.time != null) {}
      }
      if (RL.Save) {}
      if (RL.Save && result.grade === 'S') {
        const sCount = Object.values(st.grades || {}).filter(g => g === 'S').length;
        if (sCount >= 10) this.unlock('s_rank');
      }
      if (room === 8 && ch < 6) { st.chapter = Math.max(st.chapter || 1, ch + 1); st.room = 1; }
      else if (room < 8) { st.chapter = Math.max(st.chapter || 1, ch); st.room = Math.max(st.room || 1, room + 1); }
      this.queue();
      return key;
    },
    setDaily(time) {
      const d = this.data.progress.daily;
      const today = RL.Util.todayKey();
      if (d.date !== today) { d.date = today; d.time = time; d.done = true; d.streak = (d.streak || 0) + 1; }
      else if (!d.time || time < d.time) d.time = time;
      const top = this.data.records.dailyTop;
      top.push({ date: today, time });
      top.sort((a, b) => a.time - b.time);
      this.data.records.dailyTop = top.slice(0, 10);
      this.unlock('daily');
      this.save();
    },
    setEndless(floor) {
      if (floor > (this.data.progress.endless.bestFloor || 0)) this.data.progress.endless.bestFloor = floor;
      if (floor >= 30) this.unlock('endless_30');
      const et = this.data.records.endlessTop;
      et.push({ date: RL.Util.todayKey(), floor });
      et.sort((a, b) => b.floor - a.floor);
      this.data.records.endlessTop = et.slice(0, 10);
      this.queue();
    },
    markGauntlet() {
      this.data.progress.gauntlet.done = true;
      this.unlock('gauntlet');
      this.save();
    },
    addCustomLevel(lvl) {
      const arr = this.data.progress.customLevels || (this.data.progress.customLevels = []);
      const idx = arr.findIndex(x => x.id === lvl.id);
      if (idx >= 0) arr[idx] = lvl; else arr.push(lvl);
      if (arr.length > 12) arr.shift();
      this.save();
    },
    seenHint(id) {
      if (this.data.progress.seenHints[id]) return true;
      this.data.progress.seenHints[id] = true; this.queue(); return false;
    },
    addStat(key, n) { this.data.stats[key] = (this.data.stats[key] || 0) + (n == null ? 1 : n); this.queue(); },
    resetSettingsKeep() { /* reserved */ }
  };
  RL.Save = Save;
})();
