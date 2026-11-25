/* ==========================================================================
   RIFTLIGHT — game engine: modes, player FSM, physics, entities, feedback
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util, C = RL.CFG, T = C.TILE;

  RL.ABILITIES = [
    { id: 'm1', branch: 'mobility', cost: 2, name: { tw: '輕盈足尖', cn: '轻盈足尖', en: 'Light Toe' }, desc: { tw: '跳躍初速 +5%。', cn: '跳跃初速 +5%。', en: 'Jump velocity +5%.' } },
    { id: 'm2', branch: 'mobility', cost: 3, name: { tw: '疾風步', cn: '疾风步', en: 'Gale Step' }, desc: { tw: '跑速 +6%。', cn: '跑速 +6%。', en: 'Run speed +6%.' } },
    { id: 'm3', branch: 'mobility', cost: 5, name: { tw: '蹬牆宗師', cn: '蹬墙宗师', en: 'Wall Adept' }, desc: { tw: '蹬牆水平推力 +12%。', cn: '蹬墙水平推力 +12%。', en: 'Wall-jump push +12%.' } },
    { id: 'm4', branch: 'mobility', cost: 7, name: { tw: '長息', cn: '长息', en: 'Long Breath' }, desc: { tw: '攀牆體力上限 +35%。', cn: '攀墙体力上限 +35%。', en: 'Climb stamina +35%.' } },
    { id: 'm5', branch: 'mobility', cost: 9, name: { tw: '空中華爾滋', cn: '空中华尔兹', en: 'Air Waltz' }, desc: { tw: '空中衝刺額外 +1 次。', cn: '空中冲刺额外 +1 次。', en: 'Gain one extra air dash.' } },
    { id: 'm6', branch: 'mobility', cost: 12, name: { tw: '無聲落地', cn: '无声落地', en: 'Silent Landing' }, desc: { tw: '完美落地窗口延長，並回復少量體力。', cn: '完美落地窗口延长，并回复少量体力。', en: 'Wider perfect landing window and stamina refund.' } },
    { id: 'r1', branch: 'resonance', cost: 2, name: { tw: '共鳴感知', cn: '共鸣感知', en: 'Resonance Sense' }, desc: { tw: '共鳴累積 +12%。', cn: '共鸣累积 +12%。', en: 'Resonance gain +12%.' } },
    { id: 'r2', branch: 'resonance', cost: 3, name: { tw: '稜光親和', cn: '棱光亲和', en: 'Lumen Affinity' }, desc: { tw: '每枚稜光額外 +1 資源。', cn: '每枚棱光额外 +1 资源。', en: 'Each lumen grants +1 extra.' } },
    { id: 'r3', branch: 'resonance', cost: 5, name: { tw: '連段延長', cn: '连段延长', en: 'Chain Extender' }, desc: { tw: '連段維持時間 +0.6 秒。', cn: '连段维持时间 +0.6 秒。', en: 'Combo window +0.6s.' } },
    { id: 'r4', branch: 'resonance', cost: 8, name: { tw: '狂熱餘燼', cn: '狂热余烬', en: 'Fever Embers' }, desc: { tw: '共鳴爆發後的狂熱 +2 秒。', cn: '共鸣爆发后的狂热 +2 秒。', en: 'Fever after burst lasts +2s.' } },
    { id: 'r5', branch: 'resonance', cost: 11, name: { tw: '爆發護盾', cn: '爆发护盾', en: 'Burst Shield' }, desc: { tw: '共鳴爆發無敵時間 +0.6 秒。', cn: '共鸣爆发无敌时间 +0.6 秒。', en: 'Burst invulnerability +0.6s.' } },
    { id: 'r6', branch: 'resonance', cost: 14, name: { tw: '超載核心', cn: '超载核心', en: 'Overdrive Core' }, desc: { tw: '狂熱期間衝刺速度 +8%。', cn: '狂热期间冲刺速度 +8%。', en: 'Dash speed +8% during fever.' } },
    { id: 'e1', branch: 'explore', cost: 2, name: { tw: '尋光者', cn: '寻光者', en: 'Light Seeker' }, desc: { tw: '稜光吸附範圍擴大。', cn: '棱光吸附范围扩大。', en: 'Wider lumen pickup radius.' } },
    { id: 'e2', branch: 'explore', cost: 4, name: { tw: '安全著陸', cn: '安全着陆', en: 'Safe Landing' }, desc: { tw: '重生後無敵時間 +0.4 秒。', cn: '重生后无敌时间 +0.4 秒。', en: 'Longer respawn invulnerability.' } },
    { id: 'e3', branch: 'explore', cost: 6, name: { tw: '檢查點連結', cn: '检查点链接', en: 'Checkpoint Link' }, desc: { tw: '抵達檢查點時立即刷新衝刺。', cn: '抵达检查点时立即刷新冲刺。', en: 'Checkpoints refresh your dash.' } },
    { id: 'e4', branch: 'explore', cost: 9, name: { tw: '地圖感知', cn: '地图感知', en: 'Map Sense' }, desc: { tw: '畫面邊緣顯示信標方向。', cn: '画面边缘显示信标方向。', en: 'Show beacon direction at screen edge.' } },
    { id: 'e5', branch: 'explore', cost: 12, name: { tw: '深層共鳴', cn: '深层共鸣', en: 'Deep Resonance' }, desc: { tw: '元素反應額外 +10 共鳴。', cn: '元素反应额外 +10 共鸣。', en: 'Reactions grant +10 resonance.' } },
    { id: 'e6', branch: 'explore', cost: 16, name: { tw: '裂隙行者', cn: '裂隙行者', en: 'Riftwalker' }, desc: { tw: '每房一次，致命傷害改為傳送回檢查點。', cn: '每房一次，致命伤害改为传送回检查点。', en: 'Once per room, survive a fatal hit.' } }
  ];

  function newPlayer(x, y) {
    return {
      x, y, w: C.PLAYER_W, h: C.PLAYER_H, vx: 0, vy: 0,
      facing: 1, onGround: false, coyote: 0, jumpBuffer: 0, jumpHeld: false,
      dashes: C.MAX_DASH, maxDashes: C.MAX_DASH, dashTime: 0, dashFreeze: 0,
      dashVX: 0, dashVY: 0, stamina: C.STAMINA, maxStamina: C.STAMINA,
      wallDir: 0, grabbing: false, wallSlide: false, invuln: 0, flash: 0,
      squash: 1, stretch: 1, airTime: 0, lastVy: 0, anim: 0, trailTimer: 0,
      platform: null, dashChain: 0, dashChainTimer: 0, respawnBlink: 0, perfectArmed: false, dropTimer: 0,
      inWind: false, inGravity: false, inTime: false, wasDashing: false
    };
  }

  function newState() {
    return {
      mode: 'menu', phase: 'menu', room: null, player: null,
      chapter: 1, index: 1, seed: 0, dailyIndex: 1, dailySeed: 0,
      floor: 1, gauntletIndex: 1, lives: 3, maxLives: 3,
      time: 0, roomTime: 0, runTime: 0, deaths: 0, roomDeaths: 0,
      shards: 0, runShards: 0, roomShards: 0, roomShardTotal: 0,
      resonance: 0, combo: 0, comboTimer: 0, maxCombo: 0,
      dashesUsed: 0, jumps: 0, wallJumps: 0, perfectLandings: 0,
      feverTimer: 0, burstTimer: 0, burstCount: 0, hitstop: 0, slowmo: 0,
      shake: 0, trauma: 0, flash: 0, flashColor: '#fff', fade: 0, fadeDir: 0,
      camera: { x: 0, y: 0, tx: 0, ty: 0, viewW: 480, viewH: 270, scale: 2, shakeX: 0, shakeY: 0, zoom: 1, zoomKick: 0 },
      view: { w: 480, h: 270, scale: 2 },
      respawnTimer: 0, clearTimer: 0, result: null, resultShown: false,
      checkpoint: null, reviveUsed: false, lightBridges: [], meteors: [],
      event: null, eventTimer: 0, eventCount: 0,
      params: { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 },
      contracts: {}, assisted: false, chapterDeaths: 0, chapterStarted: 1,
      lastHint: 0, hintTimer: 0, portalCooldown: 0, goalActive: false,
      sigils: [], maxDashesBonus: 0, bestGrade: null, runMode: 'story',
      paused: false, pausedAt: 0, fadeTimer: 0, showHint: null, bossPhase: 1,
      trailStyle: 'pixel', skin: 'default', quality: 'high', fps: 60,
      timeLimit: 0, dashLimit: 0, forcedEvent: null
    };
  }

  const Game = newState();
  RL.Game = Game;

  Game.viewResize = function (cssW, cssH) {
    const aspect = cssW / cssH;
    let vw, vh;
    if (aspect >= 1.14) { vh = 270; vw = Math.max(300, vh * aspect); }
    else { vw = U.clamp(270 * aspect * 1.42, 180, 340); vh = vw / aspect; }
    Game.view.w = vw; Game.view.h = vh;
    Game.camera.viewW = vw; Game.camera.viewH = vh;
    Game.camera.scale = cssW / vw;
    if (Game.room) Game.snapCamera();
  };

  Game.roomW = function () { return (Game.room ? Game.room.w : 80) * T; };
  Game.roomH = function () { return (Game.room ? Game.room.h : 34) * T; };

  Game.hasAbility = function (id) { return !!(RL.Save && RL.Save.data.progress.tree && RL.Save.data.progress.tree[id]); };
  Game.equipped = function (id) { return !!(RL.Save && RL.Save.data.progress.equippedSigils && RL.Save.data.progress.equippedSigils.includes(id)); };
  Game.assistOn = function () { return !!(RL.Save && RL.Save.data.profile.assist); };

  Game.playerEff = function () {
    const p = Game.player;
    const base = {
      run: C.RUN, jump: C.JUMP, stamina: C.STAMINA, dashSpeed: C.DASH_SPEED,
      maxDashes: C.MAX_DASH, coyote: C.COYOTE, gravity: C.GRAV_UP, wallJumpX: C.WALL_JUMP_X
    };
    if (Game.hasAbility('m1')) base.jump *= 1.05;
    if (Game.hasAbility('m2')) base.run *= 1.06;
    if (Game.hasAbility('m3')) base.wallJumpX *= 1.12;
    if (Game.hasAbility('m4')) base.stamina *= 1.35;
    if (Game.hasAbility('m5')) base.maxDashes += 1;
    if (Game.assistOn()) { base.coyote += .07; base.stamina += .35; }
    if (Game.equipped('windstep')) base.maxDashes += 1;
    if (Game.feverTimer > 0) { base.maxDashes += 1; base.dashSpeed *= Game.hasAbility('r6') ? 1.08 : 1; }
    if (Game.resonance >= 30) base.run *= 1.03;
    if (Game.resonance >= 65) base.run *= 1.03;
    if (Game.resonance >= 100) base.run *= 1.02;
    if (Game.params.dash) base.maxDashes = Math.max(base.maxDashes, Game.params.dash | 0);
    if (Game.contracts.noDash) base.maxDashes = 0;
    if (Game.timeLimit > 0 && Game.mode === 'time') base.maxDashes = Math.max(base.maxDashes, 2);
    return base;
  };

  Game.setPlayerDashesMax = function () {
    const p = Game.player;
    if (!p) return;
    const eff = Game.playerEff();
    p.maxDashes = eff.maxDashes;
    p.dashes = Math.min(p.dashes, p.maxDashes);
    p.maxStamina = eff.stamina;
    p.stamina = Math.min(p.stamina, p.maxStamina);
  };

  Game.startStory = function (chapter, room, challenge) {
    Game.mode = 'story'; Game.runMode = 'story';
    Game.params = { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 };
    Game.chapter = U.clamp(chapter || 1, 1, 6);
    Game.index = U.clamp(room || 1, 1, 8);
    Game.contracts = {}; Game.timeLimit = 0; Game.dashLimit = 0;
    if (challenge === 'time') Game.timeLimit = 90;
    if (challenge === 'dash') Game.dashLimit = 12;
    if (challenge === 'noDash') Game.contracts.noDash = true;
    if (challenge === 'oneHit') Game.contracts.oneHit = true;
    Game.lives = 3; Game.maxLives = 3;
    Game.runTime = 0; Game.runShards = 0; if (Game.index === 1) Game.chapterDeaths = 0;
    Game.startRoom(RL.Levels.makeRoom({ mode: 'story', chapter: Game.chapter, index: Game.index, hard: Game.index > 4 }), { freshRun: true });
  };

  Game.startDaily = function () {
    Game.mode = 'daily'; Game.runMode = 'daily';
    Game.params = { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 };
    Game.dailySeed = U.todaySeed(); Game.dailyIndex = 1;
    Game.timeLimit = 0; Game.dashLimit = 0; Game.contracts = {};
    Game.lives = 3; Game.maxLives = 3; Game.runTime = 0; Game.runShards = 0;
    Game.chapterDeaths = 0;
    Game.startRoom(RL.Levels.makeDaily(Game.dailySeed, 1), { freshRun: true });
  };

  Game.startEndless = function () {
    Game.mode = 'endless'; Game.runMode = 'endless';
    Game.params = { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 };
    Game.seed = (Math.random() * 0x7fffffff) | 0;
    Game.floor = 1; Game.lives = 3; Game.maxLives = 3;
    Game.timeLimit = 0; Game.dashLimit = 0; Game.contracts = {};
    Game.runTime = 0; Game.runShards = 0; Game.chapterDeaths = 0;
    Game.startRoom(RL.Levels.makeEndless(1, Game.seed), { freshRun: true });
  };

  Game.startGauntlet = function () {
    Game.mode = 'gauntlet'; Game.runMode = 'gauntlet';
    Game.params = { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 };
    Game.gauntletIndex = 1; Game.seed = U.todaySeed() ^ 0x9e3779b9;
    Game.lives = 3; Game.maxLives = 3; Game.timeLimit = 0; Game.dashLimit = 0;
    Game.contracts = {}; Game.runTime = 0; Game.runShards = 0; Game.chapterDeaths = 0;
    Game.startRoom(RL.Levels.makeGauntlet(1, Game.seed), { freshRun: true });
  };

  Game.startSandbox = function (params) {
    Game.mode = 'sandbox'; Game.runMode = 'sandbox';
    Game.params = Object.assign({ gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 }, params || {});
    Game.timeLimit = 0; Game.dashLimit = 0; Game.contracts = {};
    Game.lives = 99; Game.maxLives = 99; Game.runTime = 0; Game.runShards = 0;
    Game.startRoom(RL.Levels.makeSandbox(Game.params), { freshRun: true });
  };

  Game.startCustom = function (data) {
    Game.mode = 'custom'; Game.runMode = 'custom';
    Game.params = { gravity: 1, dash: 1, wind: 1, time: 1, fever: 0 };
    Game.timeLimit = 0; Game.dashLimit = 0; Game.contracts = {};
    Game.lives = 99; Game.maxLives = 99; Game.runTime = 0; Game.runShards = 0;
    let room;
    try { room = RL.Levels.fromCustom(data); } catch (e) { room = RL.Levels.makeRoom({ mode: 'sandbox', chapter: 1, index: 1 }); }
    room.customData = data;
    Game.startRoom(room, { freshRun: true });
  };

  Game.makeModeRoom = function () {
    if (Game.mode === 'daily') return RL.Levels.makeDaily(Game.dailySeed, Game.dailyIndex);
    if (Game.mode === 'endless') return RL.Levels.makeEndless(Game.floor, Game.seed);
    if (Game.mode === 'gauntlet') return RL.Levels.makeGauntlet(Game.gauntletIndex, Game.seed);
    return RL.Levels.makeRoom({ mode: 'story', chapter: Game.chapter, index: Game.index, hard: Game.index > 4 });
  };

  Game.startRoom = function (room, opts) {
    Game.room = room;
    Game.phase = 'playing';
    Game.paused = false;
    Game.roomTime = 0;
    Game.roomDeaths = 0;
    Game.roomShards = 0;
    Game.dashesUsed = 0;
    if (opts && opts.freshRun) Game.resonance = 0;
    Game.roomShardTotal = room.entities.filter(e => e.type === 'shard').length;
    Game.resonance = Math.min(Game.resonance || 0, 60);
    Game.combo = 0; Game.comboTimer = 0;
    Game.feverTimer = 0; Game.burstTimer = 0; Game.slowmo = 0; Game.hitstop = 0;
    Game.reviveUsed = false;
    Game.roomWallJumps = 0;
    Game.tStage = 0;
    Game.lightBridges = []; Game.meteors = [];
    Game.event = null; Game.eventTimer = 0;
    Game.dailyIndex = Game.mode === 'daily' ? Game.dailyIndex : Game.dailyIndex;
    Game.timeLimit = room.timeLimit || (Game.challengeKind === 'time' ? 90 : 0) || Game.timeLimit || 0;
    if (Game.mode === 'time') Game.timeLimit = 90;
    Game.dashLimit = room.dashLimit || (Game.challengeKind === 'dash' ? 12 : 0) || Game.dashLimit || 0;
    if (Game.mode === 'daily') Game.timeLimit = 0;
    if (Game.contracts.oneHit) Game.lives = 1;
    // events for procedural modes
    if (Game.mode === 'endless' || Game.mode === 'daily') {
      const rng = U.mulberry32(room.seed ^ 0xa5a5a5a5);
      const roll = rng();
      if (roll < .22) Game.event = 'meteor';
      else if (roll < .4) Game.event = 'gravity';
      else if (roll < .54) Game.event = 'treasure';
      if (Game.event === 'treasure') {
        for (let i = 0; i < 6; i++) {
          room.entities.push({ type: 'shard', x: (room.w * .45 + (i % 3) * 3) * T, y: (18 - Math.floor(i / 3) * 2) * T, w: 7, h: 7, collected: false, phase: rng() * 6.28 });
        }
        Game.roomShardTotal = room.entities.filter(e => e.type === 'shard').length;
        if (RL.UI) RL.UI.toast(RL.I18n.t('event.treasure') || 'Treasure Rift');
      } else if (Game.event && RL.UI) RL.UI.toast(RL.I18n.t('event.' + Game.event) || Game.event);
    }
    const startP = room.spawn;
    Game.player = newPlayer(startP.x, startP.y);
    Game.checkpoint = { x: room.spawn.x, y: room.spawn.y };
    Game.setPlayerDashesMax();
    Game.player.dashes = Game.player.maxDashes;
    if (Game.params.fever) Game.resonance = Math.max(Game.resonance, Game.params.fever);
    Game.invuln = 0;
    Game.room.goalActive = false;
    if (room.goal) room.goal.active = false;
    Game.snapCamera();
    Game.trailStyle = (RL.Save && RL.Save.data.progress.trail) || 'pixel';
    Game.skin = (RL.Save && RL.Save.data.progress.skin) || 'default';
    Game.assisted = Game.assistOn();
    Game.fade = 1; Game.fadeDir = -1;
    Game.result = null; Game.resultShown = false;
    if (RL.UI) {
      RL.UI.showGame();
      RL.UI.hideModal();
      RL.UI.updateHUD(true);
      RL.UI.showRoomIntro(room);
    }
    if (RL.Audio) { RL.Audio.setScene(Game.mode === 'story' ? 'game' : 'game', Game.room.tag === 'peak' ? .9 : .42); RL.Audio.unlock(); }
    if (!(opts && opts.noHint)) Game.maybeHint(room);
  };

  Game.maybeHint = function (room) {
    let key = '';
    if (Game.mode === 'story' && Game.chapter === 1 && Game.index === 1) key = 'hint.first';
    else if (Game.mode === 'story' && Game.chapter === 1 && Game.index === 2) key = 'hint.dash';
    else if (Game.mode === 'daily' && Game.dailyIndex === 1) key = 'hint.daily';
    else if (Game.mode === 'endless' && Game.floor === 1) key = 'hint.endless';
    else if (room.boss) key = 'hint.boss';
    if (key && RL.UI) RL.UI.showHint(RL.I18n.t(key));
  };

  Game.snapCamera = function () {
    const p = Game.player; if (!p) return;
    const cam = Game.camera, rw = Game.roomW(), rh = Game.roomH();
    const maxX = Math.max(0, rw - cam.viewW), maxY = Math.max(0, rh - cam.viewH);
    cam.x = U.clamp(p.x + p.w / 2 - cam.viewW * .5, 0, maxX);
    cam.y = U.clamp(p.y + p.h / 2 - cam.viewH * .56, 0, maxY);
    if (cam.viewH > rh) cam.y = (rh - cam.viewH) / 2;
    if (cam.viewW > rw) cam.x = (rw - cam.viewW) / 2;
    cam.tx = cam.x; cam.ty = cam.y;
  };

  Game.updateCamera = function (dt) {
    const p = Game.player, cam = Game.camera;
    if (!p) return;
    const rw = Game.roomW(), rh = Game.roomH();
    const maxX = Math.max(0, rw - cam.viewW), maxY = Math.max(0, rh - cam.viewH);
    let look = U.clamp(p.vx * .16, -26, 26);
    let tx = p.x + p.w / 2 - cam.viewW * .5 + look;
    let ty = p.y + p.h / 2 - cam.viewH * .55 + (p.vy > 120 ? 12 : 0);
    if (cam.viewW > rw) tx = (rw - cam.viewW) / 2; else tx = U.clamp(tx, 0, maxX);
    if (cam.viewH > rh) ty = (rh - cam.viewH) / 2; else ty = U.clamp(ty, 0, maxY);
    cam.tx = tx; cam.ty = ty;
    const k = 1 - Math.exp(-10 * dt);
    cam.x += (cam.tx - cam.x) * k;
    cam.y += (cam.ty - cam.y) * k;
    cam.zoomKick = U.damp(cam.zoomKick || 0, 0, 7, dt);
    cam.zoom = U.damp(cam.zoom || 1, 1 + (cam.zoomKick || 0), 14, dt);
    // shake from trauma
    const tr = Game.trauma;
    if (tr > 0) {
      const mag = tr * tr * (Game.quality === 'low' ? 3 : 7) * (RL.Save.data.profile.motion == null ? 1 : RL.Save.data.profile.motion);
      cam.shakeX = (Math.random() * 2 - 1) * mag;
      cam.shakeY = (Math.random() * 2 - 1) * mag;
      Game.trauma = Math.max(0, tr - dt * 1.9);
    } else { cam.shakeX = 0; cam.shakeY = 0; }
  };

  Game.cameraPunch = function (n) {
    if (!Game.camera) return;
    Game.camera.zoomKick = Math.max(Game.camera.zoomKick || 0, n);
  };

  Game.addShake = function (n) {
    const motion = RL.Save && RL.Save.data ? RL.Save.data.profile.motion : 1;
    Game.trauma = Math.min(1, Game.trauma + n * (motion == null ? 1 : motion));
  };
  Game.addFlash = function (n, color) { Game.flash = Math.min(1, Game.flash + n); Game.flashColor = color || '#fff'; };

  Game.addResonance = function (n, silent) {
    if (n <= 0) return;
    let mult = 1;
    if (Game.hasAbility('r1')) mult += .12;
    if (Game.equipped('thunderchain') && Game.combo > 3) mult += .35;
    if (Game.hasAbility('e5') && silent === 'reaction') mult += .1;
    Game.resonance = U.clamp(Game.resonance + n * mult, 0, C.RESONANCE_MAX);
    if (Game.resonance >= 100 && RL.UI) RL.UI.burstReady(true);
  };

  Game.addCombo = function (n) {
    Game.combo += n;
    Game.comboTimer = 2.5 + (Game.hasAbility('r3') ? .6 : 0);
    if (Game.combo > Game.maxCombo) Game.maxCombo = Game.combo;
    if (Game.combo % 5 === 0 && RL.UI) RL.UI.comboPop(Game.combo);
  };

  Game.collectShard = function (e) {
    if (e.collected) return;
    e.collected = true;
    Game.roomShards++;
    let amount = 1 + (Game.hasAbility('r2') ? 1 : 0);
    if (Game.equipped('crystalheart')) amount += 0;
    Game.runShards += amount;
    RL.Save.addLumen(amount);
    Game.addResonance(7); Game.addCombo(1);
    Game.player.dashes = Math.min(Game.player.maxDashes, Game.player.dashes + 1);
    if (RL.Audio) RL.Audio.play('shard', Game.roomShards);
    if (RL.Particles) RL.Particles.burst(e.x + 4, e.y + 4, 'shard', RL.Save.data.profile.quality);
    Game.floatText('+ ' + amount, e.x, e.y - 4, RL.Themes.current.collect);
    if (Game.sigils.indexOf('crystalheart') >= 0) {}
  };

  Game.floatText = function (text, x, y, color, size) {
    if (!RL.Particles) return;
    RL.Particles.text(text, x, y, color || RL.Themes.current.text, size || 7);
  };

  Game.die = function (reason) {
    if (Game.phase !== 'playing' || Game.player.invuln > 0) return;
    if (Game.equipped('crystalheart') && !Game.reviveUsed && reason !== 'time') {
      Game.reviveUsed = true;
      Game.player.invuln = 1.6;
      Game.player.x = Game.checkpoint.x; Game.player.y = Game.checkpoint.y;
      Game.player.vx = 0; Game.player.vy = 0;
      Game.addFlash(.45, RL.Themes.current.accent);
      Game.addShake(.4);
      if (RL.UI) { RL.UI.toast(RL.I18n.t('sigil.revive') || 'Crystal Heart'); }
      if (RL.Audio) RL.Audio.play('crystal');
      return;
    }
    if (Game.hasAbility('e6') && !Game.reviveUsed && reason !== 'time') {
      Game.reviveUsed = true;
      Game.player.x = Game.checkpoint.x; Game.player.y = Game.checkpoint.y;
      Game.player.vx = 0; Game.player.vy = 0; Game.player.invuln = 1.4;
      Game.addFlash(.35, RL.Themes.current.accent);
      if (RL.Audio) RL.Audio.play('portal');
      return;
    }
    if (Game.contracts.oneHit) { Game.lives = 0; Game.failRun('oneHit', .25); }
    if (Game.phase === 'result') return;
    Game.phase = 'dead';
    Game.respawnTimer = C.RESPAWN;
    Game.deaths++; Game.roomDeaths++;
    if (Game.mode === 'story') Game.chapterDeaths++;
    Game.lives = Game.mode === 'endless' || Game.mode === 'gauntlet' ? Math.max(0, Game.lives - 1) : Game.lives;
    Game.combo = 0; Game.comboTimer = 0; Game.feverTimer = 0;
    Game.shake = 1; Game.addShake(.65); Game.cameraPunch(.045); Game.addFlash(.3, RL.Themes.current.hazard);
    Game.hitstop = Math.max(Game.hitstop, .045);
    if (RL.Particles) {
      RL.Particles.burst(Game.player.x + 5, Game.player.y + 7, 'death', RL.Save.data.profile.quality);
      RL.Particles.ring(Game.player.x + 5, Game.player.y + 7, RL.Themes.current.hazard);
    }
    if (RL.Audio) RL.Audio.play('death');
    if (RL.UI) RL.UI.flashDamage();
    RL.Save.addStat('deaths');
    if (Game.roomDeaths === 5 && RL.UI) RL.UI.showHint(RL.I18n.t('hint.stuck'), 3600);
    if (Game.mode === 'endless' && Game.lives <= 0) Game.failRun('outOfLives', 1.0);
  };

  Game.respawn = function () {
    if (Game.phase !== 'dead') return;
    if (Game.mode === 'endless' && Game.lives <= 0) return;
    const p = Game.player;
    p.x = Game.checkpoint.x; p.y = Game.checkpoint.y;
    p.vx = 0; p.vy = 0;
    p.dashes = p.maxDashes; p.stamina = p.maxStamina;
    p.invuln = 0.95 + (Game.hasAbility('e2') ? .4 : 0);
    p.dashChain = 0; p.grabbing = false;
    Game.resonance = Math.min(Game.resonance, 50);
    Game.hitstop = 0;
    Game.phase = 'playing';
    Game.roomTime += 0;
    Game.snapCamera();
    if (RL.Particles) RL.Particles.ring(p.x + 5, p.y + 7, RL.Themes.current.accent);
    if (RL.Audio) RL.Audio.play('crystal');
  };

  Game.failRun = function (reason, delay) {
    if (Game.phase === 'result') return;
    Game.phase = 'result';
    Game.result = Game.makeResult(false, reason);
    Game.result.delay = delay || 0;
    if (Game.mode === 'story') {
      Game.chapterDeaths += 0;
    }
    if (RL.UI) {
      if (Game._resultTimer) clearTimeout(Game._resultTimer);
      Game._resultTimer = setTimeout(() => { Game._resultTimer = null; if (Game.phase === 'result' && Game.result) RL.UI.showResult(Game.result); }, (delay || 0) * 1000);
    }
  };

  Game.completeRoom = function () {
    if (Game.phase !== 'playing') return;
    Game.phase = 'clear'; Game.clearTimer = .85;
    Game.goalActive = true;
    if (Game.room.goal) Game.room.goal.active = true;
    Game.addFlash(.5, RL.Themes.current.collect);
    Game.addShake(.3); Game.cameraPunch(.022);
    Game.hitstop = Math.max(Game.hitstop, .07);
    Game.addResonance(25);
    if (RL.Particles) {
      RL.Particles.burst(Game.room.goal.x + 8, Game.room.goal.y + 20, 'beacon', RL.Save.data.profile.quality);
      RL.Particles.ring(Game.room.goal.x + 8, Game.room.goal.y + 20, RL.Themes.current.collect, 60);
    }
    if (RL.Audio) { RL.Audio.play('beacon'); RL.Audio.setScene('result', .2); }
    Game.result = Game.makeResult(true);
    Game.result.chapterComplete = Game.mode === 'story' && Game.chapter === 6 && Game.index === 8;
    if (Game.mode === 'story') {
      const key = RL.Save.markRoom(Game.chapter, Game.index, {
        time: Game.roomTime, deaths: Game.roomDeaths, shards: Game.roomShards,
        grade: Game.result.grade, assisted: Game.assisted
      });
      if (Game.result.grade === 'S') Game.result.sCount = Object.values(RL.Save.data.progress.story.grades || {}).filter(g => g === 'S').length;
      if (Game.chapter === 1 && Game.index === 8) RL.Save.unlock('chapter_one');
      if (Game.chapter === 6 && Game.index === 8) RL.Save.unlock('sky_top');
      if (Game.index === 8 && Game.chapterDeaths === 0) RL.Save.unlock('no_death');
      if (Game.room.boss) RL.Save.unlock('boss');
      if (Game.index === 8) Game.result.chapterEnd = true;
    } else if (Game.mode === 'daily') {
      if (Game.dailyIndex >= 5) {
        RL.Save.setDaily(Game.runTime);
        Game.result.dailyComplete = true;
      }
    } else if (Game.mode === 'endless') {
      RL.Save.setEndless(Game.floor);
      Game.result.endlessFloor = Game.floor;
    } else if (Game.mode === 'gauntlet') {
      if (Game.gauntletIndex >= 10) {
        RL.Save.markGauntlet();
        Game.result.gauntletComplete = true;
      }
    }
    RL.Save.addStat('rooms');
    if (RL.UI) RL.UI.updateHUD(true);
  };

  Game.makeResult = function (success, reason) {
    const par = 20 + Game.room.w * .02 + Game.chapter * 2.2;
    const shardRate = Game.roomShardTotal ? Game.roomShards / Game.roomShardTotal : 1;
    let grade = 'C';
    if (success) {
      if (Game.roomDeaths === 0 && Game.roomTime <= par * 1.05 && shardRate >= .7) grade = 'S';
      else if (Game.roomTime <= par * 1.55 && Game.roomDeaths <= 1) grade = 'A';
      else if (Game.roomTime <= par * 2.4) grade = 'B';
    }
    let modeLabel = RL.I18n.t('mode.' + Game.mode);
    let score = success ? 1000 + Game.roomShards * 25 + Game.maxCombo * 15 - Game.roomDeaths * 80 : 0;
    if (success && Game.contracts.oneHit) score *= 2;
    if (success && Game.challengeKind === 'dash') score *= 1.5;
    if (success && Game.assisted) score = Math.round(score * .8);
    const result = {
      success: !!success, reason: reason || '', grade, mode: Game.mode, modeLabel, score: Math.max(0, Math.round(score)),
      chapter: Game.chapter, index: Game.index, floor: Game.floor, dailyIndex: Game.dailyIndex,
      gauntletIndex: Game.gauntletIndex,
      time: Game.roomTime || Game.runTime, runTime: Game.runTime,
      deaths: Game.roomDeaths, totalDeaths: Game.deaths, shards: Game.roomShards,
      totalShards: Game.runShards, maxCombo: Game.maxCombo,
      assisted: Game.assisted, isNewBest: false,
      boss: !!Game.room.boss, chapterEnd: false, chapterComplete: false,
      dailyComplete: false, endlessFloor: 0, gauntletComplete: false,
      lives: Game.lives, event: Game.event
    };
    if (Game.mode === 'story') {
      const best = RL.Save.data.progress.story.best[`${Game.chapter}-${Game.index}`];
      if (best && success && Game.roomTime < best.time) result.isNewBest = true;
      else if (success && !best) result.isNewBest = true;
    }
    return result;
  };

  Game.nextRoom = function () {
    Game.challengeKind = '';
    Game.timeLimit = 0; Game.dashLimit = 0; Game.contracts = {};
    if (Game.mode === 'story') {
      if (Game.index < 8) { Game.index++; Game.startRoom(RL.Levels.makeRoom({ mode: 'story', chapter: Game.chapter, index: Game.index, hard: Game.index > 4 })); }
      else if (Game.chapter < 6) { Game.chapter++; Game.index = 1; Game.startRoom(RL.Levels.makeRoom({ mode: 'story', chapter: Game.chapter, index: 1, hard: false })); }
      else { Game.phase = 'menu'; if (RL.UI) RL.UI.showMenu(); }
    } else if (Game.mode === 'daily') {
      if (Game.dailyIndex < 5) { Game.dailyIndex++; Game.startRoom(RL.Levels.makeDaily(Game.dailySeed, Game.dailyIndex)); }
      else { Game.phase = 'menu'; if (RL.UI) RL.UI.showMenu(); }
    } else if (Game.mode === 'endless') {
      if (Game.lives <= 0) { Game.phase = 'menu'; if (RL.UI) RL.UI.showMenu(); return; }
      Game.floor++; Game.startRoom(RL.Levels.makeEndless(Game.floor, Game.seed));
    } else if (Game.mode === 'gauntlet') {
      if (Game.gauntletIndex < 10) { Game.gauntletIndex++; Game.startRoom(RL.Levels.makeGauntlet(Game.gauntletIndex, Game.seed)); }
      else { Game.phase = 'menu'; if (RL.UI) RL.UI.showMenu(); }
    } else if (Game.mode === 'custom' || Game.mode === 'sandbox') {
      if (RL.UI) RL.UI.showMenu();
      Game.phase = 'menu';
    }
  };

  Game.retry = function () {
    if (Game.mode === 'story') Game.startRoom(RL.Levels.makeRoom({ mode: 'story', chapter: Game.chapter, index: Game.index, hard: Game.index > 4 }), { noHint: true });
    else if (Game.mode === 'daily') Game.startRoom(RL.Levels.makeDaily(Game.dailySeed, Game.dailyIndex), { noHint: true });
    else if (Game.mode === 'endless') { Game.lives = 3; Game.startRoom(RL.Levels.makeEndless(Game.floor, Game.seed), { noHint: true }); }
    else if (Game.mode === 'gauntlet') { Game.lives = 3; Game.startRoom(RL.Levels.makeGauntlet(Game.gauntletIndex, Game.seed), { noHint: true }); }
    else if (Game.mode === 'custom') { if (Game.room && Game.room.customData) Game.startCustom(Game.room.customData); else if (RL.UI) RL.UI.showMenu(); }
    else if (Game.mode === 'sandbox') Game.startSandbox(Game.params);
  };

  Game.togglePause = function (force) {
    if (Game.phase === 'result' || Game.phase === 'menu') return;
    const want = force == null ? !Game.paused : !!force;
    if (want === Game.paused) return;
    Game.paused = want;
    if (Game.paused) {
      Game.pausedAt = performance.now();
      if (RL.UI) RL.UI.showPause();
    } else {
      if (RL.UI) RL.UI.hideModal();
      if (RL.Input) RL.Input.clearPressed();
    }
  };

  Game.quitToMenu = function () {
    Game.phase = 'menu'; Game.paused = false;
    if (RL.UI) { RL.UI.hideModal(); RL.UI.showMenu(); }
    if (RL.Audio) RL.Audio.setScene('menu', .2);
  };

  Game.useBurst = function () {
    if (Game.phase !== 'playing' || Game.resonance < 100) return;
    Game.resonance = 0;
    Game.burstTimer = 6 + (Game.hasAbility('r4') ? 2 : 0);
    Game.feverTimer = Game.burstTimer;
    Game.player.invuln = Math.max(Game.player.invuln, 1.15 + (Game.hasAbility('r5') ? .6 : 0));
    Game.setPlayerDashesMax();
    Game.player.dashes = Game.player.maxDashes;
    Game.lightBridges = [];
    Game.slowmo = .5;
    Game.addFlash(.7, RL.Themes.current.collect);
    Game.addShake(.55); Game.cameraPunch(.035);
    Game.burstCount++; RL.Save.addStat('bursts');
    if (Game.burstCount >= 50) RL.Save.unlock('resonance_50');
    if (RL.Particles) {
      RL.Particles.ring(Game.player.x + 5, Game.player.y + 7, RL.Themes.current.collect, 100);
      RL.Particles.burst(Game.player.x + 5, Game.player.y + 7, 'burst', RL.Save.data.profile.quality);
    }
    if (RL.Audio) RL.Audio.play('burst');
    if (RL.UI) { RL.UI.burstReady(false); RL.UI.updateHUD(true); RL.UI.toast(RL.I18n.t('toast.burst')); }
    Game.floatText('RESONANCE', Game.player.x, Game.player.y - 20, RL.Themes.current.collect, 10);
    for (const e of Game.room.entities) {
      if (e.type === 'element' && (e.kind === 'fire' || e.kind === 'thunder' || e.kind === 'rift')) e.disabled = 2.4;
    }
  };

  // ------------------------------- input / physics -------------------------------
  Game.tileAt = function (tx, ty) {
    const r = Game.room;
    if (!r) return 0;
    if (tx < 0 || tx >= r.w) return 1;
    if (ty < 0) return 0;
    if (ty >= r.h) return 0;
    return r.tiles[ty][tx] || 0;
  };
  Game.isSolid = function (t) { return t === 1 || t === 4; };
  Game.overlapTiles = function (x, y, w, h, predicate) {
    const tx0 = Math.floor(x / T), tx1 = Math.floor((x + w - 0.001) / T);
    const ty0 = Math.floor(y / T), ty1 = Math.floor((y + h - 0.001) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (predicate(Game.tileAt(tx, ty), tx, ty)) return true;
    }
    return false;
  };

  Game.updatePlayer = function (dt) {
    const p = Game.player;
    if (!p) return;
    const eff = Game.playerEff();
    const moveX = RL.Input.axisX();
    const moveY = RL.Input.axisY();
    const jumpPressed = RL.Input.consume('jump');
    const jumpHeld = RL.Input.down('jump');
    const dashPressed = RL.Input.consume('dash');
    const grabHeld = RL.Input.down('grab');
    const upHeld = RL.Input.down('up');
    const downHeld = RL.Input.down('down');

    p.invuln = Math.max(0, p.invuln - dt);
    p.dashFreeze = Math.max(0, p.dashFreeze - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.dashChainTimer = Math.max(0, p.dashChainTimer - dt);
    p.dropTimer = Math.max(0, p.dropTimer - dt);
    p.flash = Math.max(0, p.flash - dt * 3);
    p.anim += dt * (Math.abs(p.vx) > 10 ? 8 : 2);
    if (p.dashChainTimer <= 0) p.dashChain = 0;

    if (Game.contracts.noDash) { /* dashes stay zero */ }

    if (jumpPressed) p.jumpBuffer = C.JUMP_BUFFER;

    // --- dash start ---
    if (dashPressed && p.dashTime <= 0 && p.dashFreeze <= 0 && p.dashes > 0 && !Game.contracts.noDash) {
      let dx = moveX, dy = moveY;
      if (dx === 0 && dy === 0) { dx = p.facing; dy = 0; }
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      p.dashTime = C.DASH_TIME;
      p.dashVX = dx * eff.dashSpeed;
      p.dashVY = dy * eff.dashSpeed;
      p.vx = p.dashVX; p.vy = p.dashVY;
      p.dashes--; p.dashFreeze = C.DASH_FREEZE;
      p.grabbing = false;
      p.dashChain++; p.dashChainTimer = .8;
      if (p.onGround) p.dashChain = 1;
      if (p.dashChain >= 3) RL.Save.unlock('air_dance');
      Game.dashesUsed++; Game.addCombo(1); Game.addResonance(6);
      Game.addShake(.12); Game.cameraPunch(.012);
      Game.hitstop = Math.max(Game.hitstop, .022);
      if (RL.Save) RL.Save.addStat('dashes');
      if (RL.Audio) RL.Audio.play('dash', Game.combo);
      if (RL.Particles) {
        RL.Particles.dash(p.x + p.w / 2, p.y + p.h / 2, RL.Themes.current.accent);
        RL.Particles.trail(p.x + p.w / 2, p.y + p.h / 2, RL.Save.data.profile.quality);
      }
      RL.Save.unlock('first_dash');
      Game.player.dashDirX = dx; Game.player.dashDirY = dy;
      if (Game.feverTimer > 0 && RL.Particles) RL.Particles.burst(p.x + 5, p.y + 7, 'spark', RL.Save.data.profile.quality);
    }

    // --- wall detection ---
    p.wallDir = 0;
    if (!p.onGround) {
      if (Game.overlapTiles(p.x - 1, p.y + 2, 1, p.h - 4, t => Game.isSolid(t))) p.wallDir = -1;
      else if (Game.overlapTiles(p.x + p.w, p.y + 2, 1, p.h - 4, t => Game.isSolid(t))) p.wallDir = 1;
    }

    // --- grab / climb ---
    p.grabbing = false;
    if (!p.onGround && p.wallDir !== 0 && grabHeld && p.stamina > 0 && p.dashTime <= 0) {
      p.grabbing = true;
      p.dashes = Math.min(p.dashes, p.maxDashes);
      const staminaCost = (Game.equipped('magnetboots') ? .55 : 1) * (upHeld || downHeld ? 1 : .4);
      p.stamina = Math.max(0, p.stamina - dt * staminaCost);
      p.vy = U.clamp((moveY || 0) * C.CLIMB_SPEED, -C.CLIMB_SPEED, C.CLIMB_SPEED);
      if (p.vy === 0) p.vy = 0;
      p.vx = 0;
      if (upHeld || downHeld) {
        if (p.wallSlide) { }
        p.wallSlide = false;
      }
      if (RL.Particles && Math.random() < .18) RL.Particles.dust(p.x + (p.wallDir > 0 ? p.w : 0), p.y + p.h * .55, RL.Themes.current.dim);
    } else p.wallSlide = false;

    // --- jump / drop-through ---
    if (p.jumpBuffer > 0) {
      if (p.onGround && downHeld) {
        p.dropTimer = .18; p.onGround = false; p.jumpBuffer = 0; p.coyote = 0;
        p.y += 2; p.vy = 60;
      } else if (p.onGround || p.coyote > 0) {
        p.vy = eff.jump;
        p.onGround = false; p.coyote = 0; p.jumpBuffer = 0; p.jumpHeld = true;
        p.squash = .72; p.stretch = 1.22;
        Game.jumps++; RL.Save.addStat('jumps');
        Game.addResonance(2);
        if (RL.Audio) RL.Audio.play('jump');
        if (RL.Particles) RL.Particles.dust(p.x + 5, p.y + p.h, RL.Themes.current.dim);
      } else if (p.wallDir !== 0) {
        p.vx = -p.wallDir * eff.wallJumpX;
        p.vy = C.WALL_JUMP_Y;
        p.jumpBuffer = 0; p.jumpHeld = true; p.grabbing = false;
        p.facing = -p.wallDir;
        p.dashes = Math.min(p.maxDashes, p.dashes + 1);
        p.squash = .78; p.stretch = 1.18;
        Game.wallJumps++; RL.Save.addStat('wallJumps');
        Game.addResonance(4); Game.addCombo(1);
        if (RL.Audio) RL.Audio.play('wall');
        if (RL.Particles) {
          RL.Particles.dust(p.x + (p.wallDir > 0 ? p.w : 0), p.y + p.h * .6, RL.Themes.current.accent);
          RL.Particles.spark(p.x + 5, p.y + 7, RL.Themes.current.accent);
        }
        Game.roomWallJumps = (Game.roomWallJumps || 0) + 1;
        if (Game.roomWallJumps >= 20) RL.Save.unlock('wall_bloom');
      }
    }
    // variable jump
    if (!jumpHeld && p.jumpHeld && p.vy < 0) { p.vy *= C.JUMP_CUT; p.jumpHeld = false; }

    // --- dash movement or normal movement ---
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashVX; p.vy = p.dashVY;
      if (p.dashTime <= 0) {
        p.vx = p.dashVX * C.DASH_END / C.DASH_SPEED;
        p.vy = p.dashVY * C.DASH_END / C.DASH_SPEED;
        p.vy = Math.min(p.vy, 80);
      }
      p.grabbing = false;
    } else if (p.dashFreeze <= 0) {
      const accel = p.onGround ? C.ACCEL : C.AIR_ACCEL;
      const target = moveX * eff.run;
      const onIce = p.onGround && Game.overlapTiles(p.x + 1, p.y + p.h, p.w - 2, 2, t => t === 4);
      const friction = onIce ? C.FRICTION * .12 : C.FRICTION;
      if (moveX !== 0) {
        if (Math.sign(p.vx) !== Math.sign(target) && p.vx !== 0) p.vx = U.approach(p.vx, target, friction * dt * 2);
        else p.vx = U.approach(p.vx, target, accel * dt);
      } else {
        p.vx = U.approach(p.vx, 0, friction * dt);
      }
      if (moveX !== 0) p.facing = moveX > 0 ? 1 : -1;
      // gravity
      let grav = p.vy < 0 ? C.GRAV_UP : C.GRAV_DOWN;
      grav *= Game.params.gravity || 1;
      if (Game.event === 'gravity') grav *= 1 + Math.sin(Game.roomTime * .75) * .22;
      if (Game.slowmo > 0) grav *= .42;
      if (p.grabbing) grav = 0;
      if (p.wallDir !== 0 && !p.onGround && !p.grabbing && p.vy > 0) p.vy = Math.min(p.vy, C.WALL_SLIDE);
      const inWind = Game.entityAt(p, 'wind');
      if (inWind) p.vy -= 580 * (Game.params.wind || 1) * dt;
      const inGravity = Game.entityAt(p, 'gravity');
      if (inGravity) p.vy -= 520 * dt;
      const magnet = Game.nearestEntity(p, 'magnet', 70);
      if (magnet) {
        const cx = magnet.x + magnet.w / 2, cy = magnet.y + magnet.h / 2;
        const dx = cx - (p.x + p.w / 2), dy = cy - (p.y + p.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        if (d > 8) { p.vx += (dx / d) * 260 * dt; p.vy += (dy / d) * 190 * dt; }
      }
      if (p.vy < C.MAX_FALL) p.vy = Math.min(C.MAX_FALL, p.vy + grav * dt);
      if (p.vy > C.MAX_FALL) p.vy = C.MAX_FALL;
      if (p.vy < -640) p.vy = -640;
    }

    // --- horizontal collision ---
    const prevX = p.x, prevY = p.y;
    const oldGround = p.onGround;
    p.onGround = false;
    p.x += p.vx * dt;
    if (p.vx !== 0) {
      if (p.vx > 0 && Game.overlapTiles(p.x + p.w - 1, p.y + 1, 1, p.h - 2, t => Game.isSolid(t))) {
        p.x = Math.floor((p.x + p.w - 1) / T) * T - p.w - .01; p.vx = 0; if (p.dashTime > 0) p.dashTime = 0;
      } else if (p.vx < 0 && Game.overlapTiles(p.x, p.y + 1, 1, p.h - 2, t => Game.isSolid(t))) {
        p.x = (Math.floor(p.x / T) + 1) * T + .01; p.vx = 0; if (p.dashTime > 0) p.dashTime = 0;
      }
    }
    // vertical
    p.y += p.vy * dt;
    if (p.vy >= 0) {
      if (Game.overlapTiles(p.x + 1, p.y + p.h - 1, p.w - 2, 1, t => Game.isSolid(t))) {
        const ty = Math.floor((p.y + p.h) / T);
        p.y = ty * T - p.h - .01;
        p.vy = 0; p.onGround = true;
      } else {
        // one-way tile platforms
        const feet = p.y + p.h;
        const prevFeet = prevY + p.h;
        const tx0 = Math.floor((p.x + 1) / T), tx1 = Math.floor((p.x + p.w - 2) / T);
        for (let tx = tx0; tx <= tx1; tx++) {
          const ty = Math.floor(feet / T);
          if (p.dropTimer <= 0 && Game.tileAt(tx, ty) === 3 && prevFeet <= ty * T + 2 && feet >= ty * T) {
            p.y = ty * T - p.h - .01; p.vy = 0; p.onGround = true; break;
          }
        }
      }
      // moving platforms (top-only)
      if (p.vy >= 0) {
        for (const m of Game.room.entities) {
          if (m.type !== 'moving') continue;
          if (p.dropTimer <= 0 && p.x + p.w > m.x + 1 && p.x < m.x + m.w - 1 && prevY + p.h <= m.y + 4 && p.y + p.h >= m.y) {
            p.y = m.y - p.h - .01; p.vy = 0; p.onGround = true; p.platform = m;
            p.x += m.dx || 0;
            break;
          }
        }
      }
      // light bridges
      for (const b of Game.lightBridges) {
        if (p.x + p.w > b.x && p.x < b.x + b.w && prevY + p.h <= b.y + 4 && p.y + p.h >= b.y) {
          p.y = b.y - p.h - .01; p.vy = 0; p.onGround = true; break;
        }
      }
    } else {
      if (Game.overlapTiles(p.x + 1, p.y, p.w - 2, 1, t => Game.isSolid(t))) {
        p.y = (Math.floor(p.y / T) + 1) * T + .01; p.vy = 0;
      }
    }
    if (p.onGround) {
      p.coyote = eff.coyote; p.dashes = p.maxDashes;
      if (Math.abs(p.vx) > 25) {
        Game.stepTimer = (Game.stepTimer || 0) - dt;
        if (Game.stepTimer <= 0) {
          Game.stepTimer = .23;
          if (RL.Audio) RL.Audio.play('step');
          if (RL.Particles) RL.Particles.dust(p.x + 5, p.y + p.h, RL.Themes.current.dim, 1);
        }
      }
      if (!oldGround && p.airTime > .18) {
        const speed = Math.abs(p.lastVy || p.vy);
        if (p.airTime > .5 && speed > 160) {
          Game.perfectLandings++; RL.Save.addStat('perfectLandings');
          Game.addResonance(5); Game.addCombo(1);
          Game.floatText(RL.I18n.t('toast.perfect') || 'PERFECT', p.x, p.y - 12, RL.Themes.current.accent, 7);
          if (RL.Particles) RL.Particles.ring(p.x + 5, p.y + p.h, RL.Themes.current.accent, 22);
          Game.addShake(.16); Game.cameraPunch(.009);
          if (RL.Audio) RL.Audio.play('perfect');
          if (Game.perfectLandings >= 10 || RL.Save.data.stats.perfectLandings >= 10) RL.Save.unlock('perfect_land');
          if (Game.equipped('timesand')) Game.slowmo = .28;
        }
        if (RL.Particles) RL.Particles.land(p.x + 5, p.y + p.h, RL.Themes.current.dim, speed);
        if (RL.Audio) RL.Audio.play('land');
        p.squash = 1.25; p.stretch = .78;
      }
      p.airTime = 0;
      p.stamina = Math.min(p.maxStamina, p.stamina + C.STAMINA_REFILL * dt);
      p.dashChain = 0;
    } else {
      p.airTime += dt;
      p.lastVy = p.vy;
    }
    p.x = U.clamp(p.x, 1, Game.roomW() - p.w - 1);
    if (p.y > Game.roomH() + 30) { Game.die('fall'); return; }
    if (p.y < -80) p.y = -80;

    // stamina / dash refill on ground already
    p.squash = U.damp(p.squash, 1, 16, dt);
    p.stretch = U.damp(p.stretch, 1, 16, dt);

    // --- tile hazards ---
    if (Game.overlapTiles(p.x + 2, p.y + 2, p.w - 4, p.h - 2, t => t === 2)) Game.die('spike');
    // --- entity interactions ---
    Game.interactEntities(dt, moveX);
    // --- chase wall ---
    if (Game.room.chase && Game.room.chase.active) {
      Game.room.chase.x += Game.room.chase.speed * dt * (Game.room.boss ? (1 + Game.roomTime / 80) : 1);
      if (p.x < Game.room.chase.x + 12) Game.die('chase');
    }
    if (Game.room.boss) {
      Game.bossPhase = Game.room.chase && Game.room.chase.x > Game.roomW() * .55 ? 3 : (Game.room.chase && Game.room.chase.x > Game.roomW() * .28 ? 2 : 1);
      if (Game.bossPhase >= 3 && Game.roomTime % 3 < dt && RL.Audio) RL.Audio.play('boss');
    }
    if (p.invuln > 0 && RL.Particles && Math.random() < .2) RL.Particles.spark(p.x + 5, p.y + 7, RL.Themes.current.accent);
    if (p.dashTime > 0 && RL.Particles) {
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = .035;
        RL.Particles.trail(p.x + p.w / 2, p.y + p.h / 2, RL.Themes.current.accent);
      }
    }
  };

  Game.entityAt = function (p, kind) {
    return Game.room.entities.some(e => e.type === 'element' && e.kind === kind && e.active !== false && !e.disabled &&
      p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h);
  };
  Game.nearestEntity = function (p, kind, radius) {
    let best = null, bd = radius * radius;
    for (const e of Game.room.entities) {
      if (e.type !== 'element' || e.kind !== kind || e.active === false || e.disabled) continue;
      const dx = e.x + e.w / 2 - (p.x + p.w / 2), dy = e.y + e.h / 2 - (p.y + p.h / 2);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  Game.interactEntities = function (dt, moveX) {
    const p = Game.player, r = Game.room;
    const center = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    for (const e of r.entities) {
      if (!e) continue;
      if (e.type === 'shard') {
        const rad = (Game.hasAbility('e1') ? 16 : 10);
        if (!e.collected && Math.abs(center.x - (e.x + 3.5)) < rad && Math.abs(center.y - (e.y + 3.5)) < rad) Game.collectShard(e);
      } else if (e.type === 'checkpoint') {
        if (p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y - 8 && p.y < e.y + e.h + 8) {
          if (!e.active) {
            e.active = true;
            Game.checkpoint = { x: e.x - 10, y: e.y - 14 };
            Game.addFlash(.25, RL.Themes.current.accent);
            if (RL.Particles) RL.Particles.ring(e.x + 5, e.y + 9, RL.Themes.current.accent);
            if (RL.Audio) RL.Audio.play('checkpoint');
            if (RL.UI) RL.UI.toast(RL.I18n.t('toast.checkpoint'));
            if (Game.hasAbility('e3')) p.dashes = p.maxDashes;
            RL.Save.queue();
          }
        }
      } else if (e.type === 'goal') {
        if (p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h) Game.completeRoom();
      } else if (e.type === 'moving') {
        // handled in vertical collision
      } else if (e.type === 'reaction') {
        if (e.triggered) { e.t += dt; if (e.t > 2.2) e.triggered = false; continue; }
        if (Game.overlapRect(p, e)) {
          e.triggered = true; e.t = 0;
          Game.addResonance(20, 'reaction');
          Game.addCombo(2);
          Game.addFlash(.35, RL.Themes.current.accent2);
          if (RL.UI) RL.UI.toast(RL.I18n.t('toast.reaction', { name: RL.I18n.name(e.def.name) }));
          if (RL.Audio) RL.Audio.play('reaction');
          if (RL.Particles) RL.Particles.ring(e.x + 11, e.y + 11, RL.Themes.current.accent2, 45);
          Game.applyReaction(e.def);
        }
      } else if (e.type === 'element') {
        if (e.disabled > 0) { e.disabled -= dt; continue; }
        const overlap = Game.overlapRect(p, e);
        switch (e.kind) {
          case 'crystal':
            if (overlap && p.dashes < p.maxDashes) {
              p.dashes = p.maxDashes;
              p.dashChain = Math.max(0, p.dashChain);
              if (RL.UI) RL.UI.toast(RL.I18n.t('toast.dashRefill'));
              if (RL.Audio) RL.Audio.play('crystal');
              if (RL.Particles) RL.Particles.ring(e.x + 8, e.y + 8, RL.Themes.current.collect, 30);
              Game.addResonance(8); Game.addCombo(1);
              e.t = 1.1;
            }
            if (e.t > 0) e.t -= dt;
            break;
          case 'spring':
            if (overlap && p.vy >= -30) {
              p.vy = -365; p.onGround = false; p.dashFreeze = .02;
              p.squash = .72; p.stretch = 1.3;
              Game.springs = (Game.springs || 0) + 1;
              if (RL.Audio) RL.Audio.play('spring');
              if (RL.Particles) RL.Particles.burst(e.x + 8, e.y, 'spark', RL.Save.data.profile.quality);
              Game.addResonance(4); Game.addCombo(1);
            }
            break;
          case 'fire':
            e.active = Math.sin(e.t * 2.2) > -.15;
            if (e.active && overlap) Game.die('fire');
            break;
          case 'thunder':
            const cycle = 2.2;
            e.state = (e.t % cycle) < 1.2 ? 'warn' : ((e.t % cycle) < 1.55 ? 'strike' : 'off');
            if (e.state === 'strike' && overlap) Game.die('thunder');
            if (e.state === 'strike' && e.lastState !== 'strike') {
              if (RL.Audio) RL.Audio.play('thunder');
              if (RL.Particles) RL.Particles.spark(e.x + e.w / 2, e.y + e.h, RL.Themes.current.collect);
              Game.addShake(.18);
            }
            e.lastState = e.state;
            break;
          case 'rift':
            if (overlap) {
              Game.die('rift');
            }
            break;
          case 'portal':
            if (overlap && Game.portalCooldown <= 0) {
              const other = r.entities.find(o => o !== e && o.type === 'element' && o.kind === 'portal' && o.pair !== e.pair);
              if (other) {
                p.x = other.x + (p.x - e.x); p.y = other.y + (p.y - e.y);
                Game.portalCooldown = .8;
                Game.addFlash(.25, RL.Themes.current.accent2);
                if (RL.Audio) RL.Audio.play('portal');
                if (RL.Particles) RL.Particles.ring(p.x + 5, p.y + 7, RL.Themes.current.accent2, 35);
                Game.snapCamera();
              }
            }
            break;
          case 'prism':
            e.t += dt;
            if (p.dashTime > 0 && overlap && e.cooldown <= 0) {
              e.cooldown = 4;
              Game.lightBridges.push({ x: e.x - 8, y: e.y + 20, w: 48, h: 4, life: 4 });
              if (RL.UI) RL.UI.toast(RL.I18n.t('toast.lightBridge') || 'Light bridge');
              if (RL.Audio) RL.Audio.play('crystal');
            }
            if (e.cooldown > 0) e.cooldown -= dt;
            break;
          case 'wind': case 'gravity': case 'magnet': case 'time': case 'ice':
            // handled in physics/visual; time affects hazard timer below
            break;
        }
      }
    }
    if (Game.portalCooldown > 0) Game.portalCooldown -= dt;
    // light bridge life
    for (let i = Game.lightBridges.length - 1; i >= 0; i--) {
      Game.lightBridges[i].life -= dt;
      if (Game.lightBridges[i].life <= 0) Game.lightBridges.splice(i, 1);
    }
  };

  Game.overlapRect = function (p, e) {
    return p.x + p.w > e.x && p.x < e.x + e.w && p.y + p.h > e.y && p.y < e.y + e.h;
  };

  Game.applyReaction = function (def) {
    const p = Game.player;
    const id = def.a + '+' + def.b;
    if (/fire\+ice|ice\+fire/.test(id)) { p.vy = Math.min(p.vy, -290); if (RL.Particles) RL.Particles.burst(p.x + 5, p.y, 'steam', 18); }
    else if (/thunder\+ice|ice\+thunder/.test(id)) { p.invuln = Math.max(p.invuln, 1.4); }
    else if (/wind\+fire|fire\+wind/.test(id)) { Game.addResonance(12); Game.addFlash(.25, RL.Themes.current.hazard); }
    else if (/ice\+portal|portal\+ice/.test(id)) { p.invuln = Math.max(p.invuln, .8); }
    else if (/magnet\+spring|spring\+magnet/.test(id)) { p.vy = -390; }
    else if (/prism\+thunder|thunder\+prism/.test(id)) { Game.lightBridges.push({ x: p.x - 16, y: p.y + 20, w: 64, h: 4, life: 5 }); }
    else if (/time\+rift|rift\+time/.test(id)) { Game.slowmo = .9; p.invuln = Math.max(p.invuln, 1.2); }
    else { p.dashes = p.maxDashes; p.vy = Math.min(p.vy, -240); }
    if (RL.Particles) RL.Particles.burst(p.x + 5, p.y + 7, 'burst', RL.Save.data.profile.quality);
    if (Game.hasAbility('e5')) Game.addResonance(10);
  };

  Game.updateEntities = function (dt) {
    const r = Game.room, p = Game.player;
    const tScale = p && p.inTime ? .45 : 1;
    for (const e of r.entities) {
      if (e.type === 'moving') {
        e.phase += dt * e.speed;
        const nx = e.baseX + Math.sin(e.phase) * e.rangeX;
        const ny = e.baseY + Math.cos(e.phase * .8) * e.rangeY;
        e.dx = nx - e.x; e.x = nx; e.y = ny;
      } else if (e.type === 'element') {
        e.t = (e.t || 0) + dt * tScale;
        if (e.kind === 'portal' && RL.Particles && Math.random() < .08) RL.Particles.spark(e.x + e.w / 2, e.y + e.h / 2, RL.Themes.current.accent2);
      } else if (e.type === 'shard') {
        e.phase = (e.phase || 0) + dt;
      } else if (e.type === 'reaction') {
        if (!e.triggered) e.t = (e.t || 0) + dt;
      }
    }
    // time bubbles
    if (p) {
      p.inTime = r.entities.some(e => e.type === 'element' && e.kind === 'time' && e.active !== false && Game.overlapRect(p, e));
    }
    // boss chase
    if (r.chase && r.chase.active && p) {
      r.chase.phase += dt;
    }
    // boss debris barrage
    if (r.boss && p && Game.phase === 'playing') {
      Game.bossAttackTimer = (Game.bossAttackTimer == null ? 1.6 : Game.bossAttackTimer) - dt;
      if (Game.bossAttackTimer <= 0) {
        Game.bossAttackTimer = 1.9 + Math.random() * 1.4;
        const baseX = p.x + (Math.random() < .5 ? 70 : 150) + Math.random() * 130;
        for (let i = 0; i < 2; i++) Game.meteors.push({ x: baseX + i * 28, y: -60, vy: 0, warn: .9 + i * .18, life: 5, boss: true });
        if (RL.Audio) RL.Audio.play('thunder');
        if (RL.UI) RL.UI.toast(RL.I18n.t('hint.bossDebris') || 'Debris incoming!');
      }
    }
    // random event: meteors
    if (Game.event === 'meteor' && p) {
      Game.eventTimer -= dt;
      if (Game.eventTimer <= 0) {
        Game.eventTimer = 1.15 + Math.random() * .9;
        Game.meteors.push({ x: p.x + 50 + Math.random() * 150, y: -20, vy: 120 + Math.random() * 60, r: 6, life: 4 });
        if (RL.Audio) RL.Audio.play('fire');
      }
      for (let i = Game.meteors.length - 1; i >= 0; i--) {
        const m = Game.meteors[i];
        if (m.warn > 0) { m.warn -= dt; m.life -= dt; if (m.warn <= 0) m.vy = 260; }
        else { m.y += m.vy * dt; m.life -= dt; }
        if (m.y > Game.roomH() + 20 || m.life <= 0) { Game.meteors.splice(i, 1); continue; }
        if (m.warn <= 0 && Math.abs((p.x + 5) - m.x) < 11 && Math.abs((p.y + 7) - m.y) < 14) { Game.meteors.splice(i, 1); Game.die('meteor'); }
      }
    }
    // burst timer
    if (Game.burstTimer > 0) {
      Game.burstTimer -= dt;
      if (Game.burstTimer <= 0) Game.setPlayerDashesMax();
    }
    if (Game.portalCooldown > 0) Game.portalCooldown -= dt;
    // goal pulse
    if (r.goal) r.goal.pulse = (r.goal.pulse || 0) + dt;
  };

  Game.tutorialTick = function () {
    if (Game.mode !== 'story' || Game.chapter !== 1 || Game.index !== 1) return;
    const p = Game.player;
    if (!p) return;
    if (!Game.tStage && p.x > 60) { Game.tStage = 1; if (RL.UI) RL.UI.showHint(RL.I18n.t('hint.dash'), 3000); }
    else if (Game.tStage === 1 && Game.dashesUsed > 0) { Game.tStage = 2; if (RL.UI) RL.UI.showHint(RL.I18n.t('hint.grab') || 'Hold C / Ctrl on a wall', 3000); }
    else if (Game.tStage === 2 && Game.roomShards > 0) { Game.tStage = 3; if (RL.UI) RL.UI.showHint(RL.I18n.t('hint.burst'), 3200); }
  };

  Game.updateResonance = function (dt) {
    if (Game.feverTimer > 0) {
      Game.feverTimer -= dt;
      if (Game.feverTimer <= 0) { Game.feverTimer = 0; Game.setPlayerDashesMax(); }
    }
    if (Game.resonance >= 100) {
      if (RL.UI) RL.UI.burstReady(true);
      return;
    }
    if (Game.comboTimer > 0) {
      Game.comboTimer -= dt;
      if (Game.comboTimer <= 0) { Game.combo = 0; }
    } else {
      Game.resonance = Math.max(0, Game.resonance - C.RESONANCE_DECAY * dt);
    }
    const tier = Game.resonance >= 100 ? 3 : Game.resonance >= 65 ? 2 : Game.resonance >= 30 ? 1 : 0;
    if (tier !== Game.resTier) {
      Game.resTier = tier;
      if (tier >= 2 && RL.Particles) RL.Particles.ring(Game.player.x + 5, Game.player.y + 7, RL.Themes.current.collect, 30);
    }
  };

  Game.update = function (dt) {
    if (RL.Themes) RL.Themes.update(dt);
    if (RL.Audio) RL.Audio.update(dt);
    if (Game.phase === 'playing' || Game.phase === 'dead' || Game.phase === 'clear') {
      Game.roomTime += dt;
      Game.runTime += dt;
      RL.Save.data.stats.playTime = (RL.Save.data.stats.playTime || 0) + dt;
    }
    if (Game.flash > 0) Game.flash = Math.max(0, Game.flash - dt * 2.2);
    if (Game.fade > 0 && Game.fadeDir !== 0) {
      Game.fade = Math.max(0, Game.fade + Game.fadeDir * dt * 2.4);
      if (Game.fade <= 0) Game.fadeDir = 0;
    }
    if (Game.slowmo > 0) Game.slowmo = Math.max(0, Game.slowmo - dt);
    if (Game.phase === 'menu') {
      Game.menuTime = (Game.menuTime || 0) + dt;
      if (RL.Particles) RL.Particles.update(dt);
      return;
    }
    if (Game.paused) {
      if (RL.Particles) RL.Particles.update(dt * .1);
      return;
    }
    if (Game.phase === 'result') {
      if (RL.Particles) RL.Particles.update(dt);
      Game.updateCamera(dt);
      return;
    }
    if (Game.hitstop > 0) { Game.hitstop -= dt; if (RL.Particles) RL.Particles.update(dt * .15); return; }
    if (RL.Particles) RL.Particles.update(dt);
    if (Game.phase === 'playing') {
      if (RL.Input.consume('pause')) { Game.togglePause(true); return; }
      if (RL.Input.consume('retry')) { Game.retry(); return; }
      if (RL.Input.consume('burst')) Game.useBurst();
    }
    if (Game.phase === 'dead') {
      Game.respawnTimer -= dt;
      Game.updateCamera(dt);
      if (Game.respawnTimer <= 0) {
        if (Game.mode === 'endless' && Game.lives <= 0) { Game.failRun('outOfLives', 0); }
        else if (Game.mode === 'endless' || Game.mode === 'gauntlet') {
          if (Game.lives <= 0) Game.failRun('outOfLives', 0);
          else Game.respawn();
        } else Game.respawn();
      }
      return;
    }
    if (Game.phase === 'clear') {
      Game.clearTimer -= dt;
      Game.updateCamera(dt);
      if (Game.clearTimer <= 0 && !Game.resultShown) {
        Game.resultShown = true;
        Game.phase = 'result';
        if (RL.UI) RL.UI.showResult(Game.result);
      }
      return;
    }
    if (Game.phase !== 'playing') return;
    const ts = (Game.slowmo > 0 ? .4 : 1) * (Game.mode === 'sandbox' ? (Game.params.time || 1) : 1);
    const sdt = dt * ts;
    Game.updatePlayer(sdt);
    if (Game.phase !== 'playing') { Game.updateCamera(dt); return; }
    Game.updateEntities(sdt);
    Game.updateResonance(dt);
    Game.updateCamera(dt);
    // limit checks
    if (Game.timeLimit > 0 && Game.roomTime >= Game.timeLimit) Game.failRun('timeout', .2);
    if (Game.dashLimit > 0 && Game.dashesUsed > Game.dashLimit) Game.failRun('dashLimit', .2);
    if (Game.contracts.oneHit && Game.lives <= 0 && Game.phase === 'playing') Game.failRun('oneHit', 0);
    Game.tutorialTick();
    // HUD
    if (RL.UI) RL.UI.updateHUD(false);
    if (RL.Audio) {
      const intensity = U.clamp(.25 + Game.resonance / 140 + (Game.room.tag === 'peak' ? .3 : 0) + (Game.room.boss ? .2 : 0), 0, 1);
      RL.Audio.setScene(Game.room.boss ? 'boss' : 'game', intensity);
    }
    // ambient achievement for chapter completion handled in completeRoom
    if (Game.room.boss && Game.roomTime > 2 && !Game.bossSfx) { Game.bossSfx = true; if (RL.Audio) RL.Audio.play('boss'); }
  };

  Game.init = function () {
    Game.phase = 'menu';
    Game.menuTime = 0;
    RL.Save.load();
    RL.I18n.setLang(RL.Save.data.profile.lang, true);
    RL.Themes.set(RL.Save.data.profile.theme, { animate: false });
    if (RL.Audio) RL.Audio.setVolumes(RL.Save.data.profile.bgm, RL.Save.data.profile.sfx, RL.Save.data.profile.muted);
  };
})();
