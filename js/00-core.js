/* ==========================================================================
   RIFTLIGHT — core namespace, constants, utilities, input
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL = window.RL || {};
  RL.VERSION = '2.0.0';

  RL.CFG = {
    TILE: 8,
    ROOM_W: 84,
    ROOM_H: 34,
    PLAYER_W: 12,
    PLAYER_H: 16,
    RUN: 102,
    ACCEL: 1080,
    FRICTION: 1500,
    AIR_ACCEL: 720,
    JUMP: -252,
    GRAV_UP: 1080,
    GRAV_DOWN: 1320,
    MAX_FALL: 330,
    COYOTE: 0.105,
    JUMP_BUFFER: 0.13,
    JUMP_CUT: 0.46,
    DASH_SPEED: 330,
    DASH_TIME: 0.125,
    DASH_FREEZE: 0.045,
    DASH_END: 145,
    WALL_SLIDE: 48,
    WALL_JUMP_X: 155,
    WALL_JUMP_Y: -238,
    CLIMB_SPEED: 58,
    STAMINA: 1.7,
    STAMINA_REFILL: 2.6,
    MAX_DASH: 1,
    RESPAWN: 0.46,
    RESONANCE_MAX: 100,
    RESONANCE_DECAY: 6.5,
    FEVER_TIME: 8,
    TIME_STEP: 1 / 120,
    SAVE_KEY: 'riftlight.save.v1'
  };

  RL.Util = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    invLerp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); },
    damp(a, b, lambda, dt) { return RL.Util.lerp(a, b, 1 - Math.exp(-lambda * dt)); },
    approach(v, target, delta) { return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target); },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeOutBack(t) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
    rect(x, y, w, h) { return { x, y, w, h }; },
    intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },
    pointInRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; },
    pad(n, width) { return String(n).padStart(width, '0'); },
    formatTime(sec) {
      sec = Math.max(0, sec || 0);
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec % 1) * 100);
      return `${RL.Util.pad(m, 2)}:${RL.Util.pad(s, 2)}.${RL.Util.pad(cs, 2)}`;
    },
    formatClock(sec) {
      sec = Math.max(0, sec || 0);
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return `${RL.Util.pad(m, 2)}:${RL.Util.pad(s, 2)}`;
    },
    hash(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
    mulberry32(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    pick(rng, arr) { return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]; },
    chance(rng, p) { return rng() < p; },
    hexToRgb(hex) {
      const h = hex.replace('#', '');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    },
    rgbToHex(c) {
      const p = n => RL.Util.clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
      return `#${p(c.r)}${p(c.g)}${p(c.b)}`;
    },
    lerpColor(a, b, t) {
      const ca = RL.Util.hexToRgb(a), cb = RL.Util.hexToRgb(b);
      return RL.Util.rgbToHex({ r: RL.Util.lerp(ca.r, cb.r, t), g: RL.Util.lerp(ca.g, cb.g, t), b: RL.Util.lerp(ca.b, cb.b, t) });
    },
    alpha(hex, a) {
      const c = RL.Util.hexToRgb(hex);
      return `rgba(${c.r},${c.g},${c.b},${a})`;
    },
    todaySeed() {
      const d = new Date();
      return RL.Util.hash(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-riftlight`);
    },
    todayKey() {
      const d = new Date();
      return `${d.getUTCFullYear()}-${RL.Util.pad(d.getUTCMonth() + 1, 2)}-${RL.Util.pad(d.getUTCDate(), 2)}`;
    },
    shuffle(rng, arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
  };

  RL.Bus = (() => {
    const map = {};
    return {
      on(name, fn) { (map[name] = map[name] || []).push(fn); return () => RL.Bus.off(name, fn); },
      off(name, fn) { const a = map[name]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
      emit(name, data) { const a = map[name]; if (!a) return; for (let i = 0; i < a.length; i++) { try { a[i](data); } catch (e) { RL.lastError = e; } } }
    };
  })();

  RL.ACHIEVEMENTS = [
    { id: 'first_dash', icon: '✦', name: { tw: '初次共鳴', cn: '初次共鸣', en: 'First Resonance' }, desc: { tw: '第一次成功衝刺。', cn: '第一次成功冲刺。', en: 'Perform your first dash.' } },
    { id: 'air_dance', icon: '≡', name: { tw: '凌空舞步', cn: '凌空舞步', en: 'Air Dance' }, desc: { tw: '單次滯空連續衝刺 3 次。', cn: '单次滞空连续冲刺 3 次。', en: 'Dash 3 times in a single airborne chain.' } },
    { id: 'wall_bloom', icon: '⌁', name: { tw: '觸壁生花', cn: '触壁生花', en: 'Wall Bloom' }, desc: { tw: '單一房間累積 20 次蹬牆。', cn: '单一房间累积 20 次蹬墙。', en: 'Wall-jump 20 times in one room.' } },
    { id: 'perfect_land', icon: '◎', name: { tw: '完美落地', cn: '完美落地', en: 'Perfect Landing' }, desc: { tw: '累積 10 次完美落地。', cn: '累积 10 次完美落地。', en: 'Land 10 perfect landings.' } },
    { id: 'chapter_one', icon: 'Ⅰ', name: { tw: '裂隙初啼', cn: '裂隙初啼', en: 'First Light' }, desc: { tw: '完成第 1 章。', cn: '完成第 1 章。', en: 'Complete Chapter 1.' } },
    { id: 'sky_top', icon: '✧', name: { tw: '天穹之巔', cn: '天穹之巅', en: 'Sky Summit' }, desc: { tw: '完成主線第六章。', cn: '完成主线第六章。', en: 'Complete Chapter 6.' } },
    { id: 'no_death', icon: '◇', name: { tw: '無聲行者', cn: '无声行者', en: 'Silent Walker' }, desc: { tw: '零死亡完成任一章節。', cn: '零死亡完成任一章节。', en: 'Clear a chapter without dying.' } },
    { id: 's_rank', icon: 'S', name: { tw: '疾風之證', cn: '疾风之证', en: 'Wind Proof' }, desc: { tw: '累積 10 個 S 級房間。', cn: '累积 10 个 S 级房间。', en: 'Earn S rank in 10 rooms.' } },
    { id: 'boss', icon: '◉', name: { tw: '巨像之影', cn: '巨像之影', en: 'Colossus Shadow' }, desc: { tw: '逃離裂界巨像。', cn: '逃离裂界巨像。', en: 'Escape the Rift Colossus.' } },
    { id: 'daily', icon: '☼', name: { tw: '每日旅人', cn: '每日旅人', en: 'Daily Traveler' }, desc: { tw: '完成一次每日裂隙。', cn: '完成一次每日裂隙。', en: 'Finish a Daily Rift.' } },
    { id: 'endless_30', icon: '∞', name: { tw: '無盡迴響', cn: '无尽回响', en: 'Endless Echo' }, desc: { tw: '無盡天穹抵達第 30 層。', cn: '无尽天穹抵达第 30 层。', en: 'Reach floor 30 in Endless.' } },
    { id: 'forge', icon: '✎', name: { tw: '工坊巨匠', cn: '工坊巨匠', en: 'Forge Master' }, desc: { tw: '建立並匯出一張自訂關卡。', cn: '建立并导出一张自定义关卡。', en: 'Build and export a custom room.' } },
    { id: 'collector', icon: '◈', name: { tw: '稜光收藏家', cn: '棱光收藏家', en: 'Prism Collector' }, desc: { tw: '解鎖 8 款角色皮膚。', cn: '解锁 8 款角色皮肤。', en: 'Unlock 8 character skins.' } },
    { id: 'resonance_50', icon: '✹', name: { tw: '共鳴大師', cn: '共鸣大师', en: 'Resonance Master' }, desc: { tw: '累積發動 50 次共鳴爆發。', cn: '累积发动 50 次共鸣爆发。', en: 'Unleash 50 resonance bursts.' } },
    { id: 'codex_all', icon: '◉', name: { tw: '全知之眼', cn: '全知之眼', en: 'All-Seeing Eye' }, desc: { tw: '完成圖鑑所有元素與反應。', cn: '完成图鉴所有元素与反应。', en: 'Complete the element and reaction codex.' } },
    { id: 'gauntlet', icon: '♜', name: { tw: '天穹試煉者', cn: '天穹试炼者', en: 'Gauntlet Runner' }, desc: { tw: '完成 10 房連續試煉。', cn: '完成 10 房连续试炼。', en: 'Clear the 10-room gauntlet.' } }
  ];

  RL.ELEMENTS = [
    { id: 'wind', glyph: '≋', color: '#9BE7FF', name: { tw: '風場', cn: '风场', en: 'Wind' }, desc: { tw: '持續上升氣流，可延長滯空與跨越深淵。', cn: '持续上升气流，可延长滞空与跨越深渊。', en: 'Rising current that extends airtime.' } },
    { id: 'ice', glyph: '❄', color: '#B7E3FF', name: { tw: '冰面', cn: '冰面', en: 'Ice' }, desc: { tw: '摩擦極低，起跑與煞停都需要提前規劃。', cn: '摩擦极低，起跑与煞停都需要提前规划。', en: 'Low friction. Plan your stops early.' } },
    { id: 'fire', glyph: '♨', color: '#FF8A5B', name: { tw: '火種', cn: '火种', en: 'Ember' }, desc: { tw: '周期性噴發的灼熱危險，碰到即死亡。', cn: '周期性喷发的灼热危险，碰到即死亡。', en: 'Pulsing heat hazard. One touch is fatal.' } },
    { id: 'thunder', glyph: 'ϟ', color: '#FFE66D', name: { tw: '雷雲', cn: '雷云', en: 'Thunder' }, desc: { tw: '預告後落雷，麻痺區域內的動態機關。', cn: '预告后落雷，麻痹区域内的动态机关。', en: 'Telegraphed lightning that stuns mechanisms.' } },
    { id: 'magnet', glyph: '◎', color: '#D6A8FF', name: { tw: '磁礦', cn: '磁矿', en: 'Magnetite' }, desc: { tw: '牽引鄰近的金屬平台與玩家，可改變路線。', cn: '牵引邻近的金属平台与玩家，可改变路线。', en: 'Pulls metal platforms and the player.' } },
    { id: 'spring', glyph: '↟', color: '#9DFFB0', name: { tw: '彈簧菌', cn: '弹簧菌', en: 'Springcap' }, desc: { tw: '踩踏後產生強力彈跳，可連鎖觸發。', cn: '踩踏后产生强力弹跳，可连锁触发。', en: 'Bounce high and chain launches.' } },
    { id: 'portal', glyph: '◌', color: '#C4A7FF', name: { tw: '傳送門', cn: '传送门', en: 'Portal' }, desc: { tw: '成對出現，入口與出口共享動量。', cn: '成对出现，入口与出口共享动量。', en: 'Paired gates that preserve momentum.' } },
    { id: 'gravity', glyph: '◍', color: '#F0B7FF', name: { tw: '重力晶', cn: '重力晶', en: 'Gravity Crystal' }, desc: { tw: '局部改變重力方向，製造漂浮與急墜。', cn: '局部改变重力方向，制造漂浮与急坠。', en: 'Alters local gravity direction.' } },
    { id: 'time', glyph: '◷', color: '#A8F0E0', name: { tw: '時滯泡', cn: '时滞泡', en: 'Time Bubble' }, desc: { tw: '減慢範圍內的危險節奏，爭取反應時間。', cn: '减慢范围内的危险节奏，争取反应时间。', en: 'Slows hazards inside the bubble.' } },
    { id: 'prism', glyph: '✧', color: '#FFD166', name: { tw: '光影鏡', cn: '光影镜', en: 'Prism' }, desc: { tw: '衝刺穿過後折射光束，暫時生成光橋。', cn: '冲刺穿过后折射光束，暂时生成光桥。', en: 'Dash through to refract a temporary bridge.' } },
    { id: 'crystal', glyph: '◆', color: '#7DF9FF', name: { tw: '水晶', cn: '水晶', en: 'Crystal' }, desc: { tw: '碰觸即刷新空中衝刺，是連段的關鍵。', cn: '碰触即刷新空中冲刺，是连段的关键。', en: 'Refreshes your air dash. Chain it.' } },
    { id: 'rift', glyph: '◈', color: '#FF6FA5', name: { tw: '裂隙', cn: '裂隙', en: 'Rift' }, desc: { tw: '不穩定的空間傷口，將接觸者送回檢查點。', cn: '不稳定的空间伤口，将接触者送回检查点。', en: 'An unstable wound that returns you to checkpoint.' } }
  ];

  RL.REACTIONS = [
    { a: 'fire', b: 'ice', glyph: '☁', name: { tw: '蒸氣上升', cn: '蒸气上升', en: 'Steam Rise' }, desc: { tw: '火融化冰，生成短暫上升氣流。', cn: '火融化冰，生成短暂上升气流。', en: 'Fire melts ice into a short updraft.' } },
    { a: 'thunder', b: 'ice', glyph: 'ϟ', name: { tw: '導電霜徑', cn: '导电霜径', en: 'Conductive Frost' }, desc: { tw: '雷電沿冰面擴散，短暫癱瘓附近機關。', cn: '雷电沿冰面扩散，短暂瘫痪附近机关。', en: 'Lightning skates across ice, stunning mechanisms.' } },
    { a: 'wind', b: 'fire', glyph: '✹', name: { tw: '餘燼擴散', cn: '余烬扩散', en: 'Ember Spread' }, desc: { tw: '風助火勢，火星點亮隱藏符文。', cn: '风助火势，火星点亮隐藏符文。', en: 'Wind spreads embers and reveals runes.' } },
    { a: 'ice', b: 'portal', glyph: '❄', name: { tw: '凍結出口', cn: '冻结出口', en: 'Frozen Exit' }, desc: { tw: '冰晶凍結傳送門，暫時變成安全平台。', cn: '冰晶冻结传送门，暂时变成安全平台。', en: 'Frozen portals become safe platforms.' } },
    { a: 'magnet', b: 'spring', glyph: '◎', name: { tw: '磁力彈射', cn: '磁力弹射', en: 'Maglev Launch' }, desc: { tw: '磁場壓縮彈簧，產生超遠彈跳。', cn: '磁场压缩弹簧，产生超远弹跳。', en: 'Magnetism compresses a spring for a super launch.' } },
    { a: 'prism', b: 'thunder', glyph: '✧', name: { tw: '稜光雷橋', cn: '棱光雷桥', en: 'Prism Lightning' }, desc: { tw: '折射的雷光凝聚成臨時光橋。', cn: '折射的雷光凝聚成临时光桥。', en: 'Refracted lightning solidifies into a bridge.' } },
    { a: 'time', b: 'rift', glyph: '◷', name: { tw: '時隙穩定', cn: '时隙稳定', en: 'Time Seam' }, desc: { tw: '時滯泡穩定裂隙，短暫停止其吞噬。', cn: '时滞泡稳定裂隙，短暂停止其吞噬。', en: 'Time bubbles stabilize a rift briefly.' } },
    { a: 'crystal', b: 'gravity', glyph: '◆', name: { tw: '反重力共鳴', cn: '反重力共鸣', en: 'Anti-Gravity Echo' }, desc: { tw: '水晶與重力晶共鳴，刷新衝刺並反轉重力。', cn: '水晶与重力晶共鸣，刷新冲刺并反转重力。', en: 'Crystal and gravity resonate, refreshing dash.' } }
  ];

  RL.SIGILS = [
    { id: 'windstep', name: { tw: '風紋步', cn: '风纹步', en: 'Windstep' }, desc: { tw: '空中可額外衝刺一次。', cn: '空中可额外冲刺一次。', en: 'Gain one extra air dash.' } },
    { id: 'frostheart', name: { tw: '霜心', cn: '霜心', en: 'Frostheart' }, desc: { tw: '衝刺穿過危險時獲得 0.2 秒保護。', cn: '冲刺穿过危险时获得 0.2 秒保护。', en: 'Dash grants a brief hazard grace.' } },
    { id: 'thunderchain', name: { tw: '雷鏈', cn: '雷链', en: 'Thunderchain' }, desc: { tw: '連段時共鳴累積 +35%。', cn: '连段时共鸣累积 +35%。', en: 'Combo resonance gain +35%.' } },
    { id: 'magnetboots', name: { tw: '磁靴', cn: '磁靴', en: 'Magnet Boots' }, desc: { tw: '攀牆體力消耗降低 45%。', cn: '攀墙体力消耗降低 45%。', en: 'Wall climb stamina cost -45%.' } },
    { id: 'timesand', name: { tw: '時砂', cn: '时砂', en: 'Time Sand' }, desc: { tw: '完美落地觸發短暫慢動作。', cn: '完美落地触发短暂慢动作。', en: 'Perfect landings briefly slow time.' } },
    { id: 'crystalheart', name: { tw: '晶心', cn: '晶心', en: 'Crystal Heart' }, desc: { tw: '每房一次，致命傷自動改為回到檢查點並保留收集。', cn: '每房一次，致命伤自动改为回到检查点并保留收集。', en: 'Once per room, survive a fatal hit.' } }
  ];

  RL.SKINS = (() => {
    const out = [];
    const base = [
      ['default', '露米', 'Lumi', '#F5F3FF', '#22D3EE'],
      ['ember', '餘燼', 'Ember', '#FFE2C4', '#FF7A59'],
      ['frost', '霜語', 'Frost', '#DFF7FF', '#76C7FF'],
      ['moss', '苔行', 'Moss', '#E6FFD9', '#7CE38B'],
      ['dusk', '暮色', 'Dusk', '#F2D7FF', '#B15CFF'],
      ['gold', '金痕', 'Gold', '#FFF4C2', '#FFC857'],
      ['ghost', '回聲', 'Echo', '#E9F9FF', '#A8F0E0'],
      ['rose', '緋光', 'Rose', '#FFE0EC', '#FF4D8D']
    ];
    for (let i = 0; i < 16; i++) {
      const b = base[i % base.length];
      out.push({ id: i < base.length ? b[0] : `${b[0]}${i}`, name: { tw: i < 8 ? b[1] : `${b[1]}·${i + 1}`, cn: i < 8 ? b[2] : `${b[2]} ${i + 1}`, en: i < 8 ? b[2] : `${b[2]} ${i + 1}` }, body: i < 8 ? b[3] : RL.Util.lerpColor(b[3], '#FFFFFF', .25), accent: b[4], unlock: i < 4 ? 0 : i * 2 });
    }
    return out;
  })();

  RL.TRAILS = (() => {
    const list = [
      ['pixel', '像素', 'Pixel', '#22D3EE'], ['petal', '花瓣', 'Petal', '#FF9EC4'], ['ember', '火星', 'Ember', '#FF9F1C'],
      ['snow', '霜屑', 'Snow', '#B7E3FF'], ['data', '資料', 'Data', '#00E5FF'], ['ink', '墨滴', 'Ink', '#3A3733'],
      ['prism', '稜光', 'Prism', '#FFD166'], ['void', '虛空', 'Void', '#B15CFF']
    ];
    return list.map((x, i) => ({ id: x[0], name: { tw: x[1], cn: x[2], en: x[2] }, color: x[3], unlock: i * 2 }));
  })();

  RL.CHAPTERS = [
    { id: 1, key: 'wind', name: { tw: '甦醒之脊', cn: '苏醒之脊', en: 'Awakening Ridge' }, sub: { tw: '風場與初次衝刺', cn: '风场与初次冲刺', en: 'Wind and first flight' }, color: '#9BE7FF' },
    { id: 2, key: 'ice', name: { tw: '鏡霜庭園', cn: '镜霜庭园', en: 'Mirrorfrost Garden' }, sub: { tw: '冰面與傳送門', cn: '冰面与传送门', en: 'Ice and portals' }, color: '#B7E3FF' },
    { id: 3, key: 'thunder', name: { tw: '雷鳴遺構', cn: '雷鸣遗构', en: 'Thunder Ruins' }, sub: { tw: '雷雲與磁場', cn: '雷云与磁场', en: 'Thunder and magnets' }, color: '#FFE66D' },
    { id: 4, key: 'time', name: { tw: '時滯迴廊', cn: '时滞回廊', en: 'Timeworn Halls' }, sub: { tw: '時滯與重力', cn: '时滞与重力', en: 'Time and gravity' }, color: '#A8F0E0' },
    { id: 5, key: 'fire', name: { tw: '影火熔城', cn: '影火熔城', en: 'Emberfall' }, sub: { tw: '火種與崩塌', cn: '火种与崩塌', en: 'Embers and collapse' }, color: '#FF8A5B' },
    { id: 6, key: 'prism', name: { tw: '天穹之眼', cn: '天穹之眼', en: 'Eye of the Sky' }, sub: { tw: '全元素與巨像', cn: '全元素与巨像', en: 'All elements and the Colossus' }, color: '#FFD166' }
  ];

  RL.Input = (() => {
    const held = Object.create(null);
    const pressed = Object.create(null);
    const virtual = Object.create(null);
    const touchAxis = { x: 0, y: 0 };
    let lastDevice = 'keyboard';
    const keyMap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', KeyX: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
      KeyC: 'grab', ControlLeft: 'grab', ControlRight: 'grab', KeyV: 'burst',
      KeyR: 'retry', Escape: 'pause', KeyP: 'pause', Tab: 'codex', KeyM: 'mute', KeyT: 'theme'
    };
    const api = {
      get lastDevice() { return lastDevice; },
      down(action) { return !!(held[action] || virtual[action]); },
      pressed(action) { return !!pressed[action]; },
      consume(action) { const v = !!pressed[action]; delete pressed[action]; return v; },
      axisX() { return RL.Util.clamp((virtual.left ? -1 : 0) + (virtual.right ? 1 : 0) + (held.left ? -1 : 0) + (held.right ? 1 : 0) + touchAxis.x, -1, 1); },
      axisY() { return RL.Util.clamp((virtual.up ? -1 : 0) + (virtual.down ? 1 : 0) + (held.up ? -1 : 0) + (held.down ? 1 : 0) + touchAxis.y, -1, 1); },
      setVirtual(action, on) {
        if (on && !virtual[action]) pressed[action] = true;
        virtual[action] = !!on; lastDevice = 'touch';
      },
      setAxis(x, y) { touchAxis.x = x; touchAxis.y = y; lastDevice = 'touch'; },
      reset() { for (const k in held) held[k] = false; for (const k in virtual) virtual[k] = false; for (const k in pressed) delete pressed[k]; touchAxis.x = 0; touchAxis.y = 0; },
      clearPressed() { for (const k in pressed) delete pressed[k]; },
      init() {
        window.addEventListener('keydown', (e) => {
          const a = keyMap[e.code];
          if (a) {
            if (a === 'codex' || a === 'pause' || a === 'retry' || a === 'mute' || a === 'theme') {
              if (e.target && /input|textarea|select/i.test(e.target.tagName) && a === 'codex') return;
            }
            if (!held[a]) pressed[a] = true;
            held[a] = true; lastDevice = 'keyboard';
            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Tab'].includes(e.code)) e.preventDefault();
          }
        }, { passive: false });
        window.addEventListener('keyup', (e) => { const a = keyMap[e.code]; if (a) held[a] = false; });
        window.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'touch') lastDevice = 'touch';
          else if (e.pointerType === 'mouse') lastDevice = 'mouse';
        }, { passive: true });
        window.addEventListener('blur', () => { api.reset(); });
      }
    };
    return api;
  })();

  RL.Gamepad = {
    poll() {
      if (!navigator.getGamepads) return;
      const pads = navigator.getGamepads();
      const p = pads && pads[0];
      if (!p) return;
      const b = p.buttons;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      const set = (name, on) => RL.Input.setVirtual(name, on);
      set('left', ax < -0.3 || (b[14] && b[14].pressed));
      set('right', ax > 0.3 || (b[15] && b[15].pressed));
      set('up', ay < -0.5 || (b[12] && b[12].pressed));
      set('down', ay > 0.5 || (b[13] && b[13].pressed));
      set('jump', b[0] && b[0].pressed);
      set('dash', b[1] && b[1].pressed);
      set('grab', b[2] && b[2].pressed || b[4] && b[4].pressed);
      set('burst', b[3] && b[3].pressed);
    }
  };
})();
