/* ==========================================================================
   RIFTLIGHT — deterministic room generation + handcrafted room grammar
   Tile: 0 empty | 1 solid | 2 spike | 3 one-way | 4 ice
   ========================================================================== */
(function () {
  'use strict';
  const RL = window.RL, U = RL.Util, C = RL.CFG, T = C.TILE;

  function roomSeed(mode, ch, room, extra) {
    return U.hash(`riftlight|${mode}|${ch}|${room}|${extra || ''}`);
  }

  function emptyRoom(w, h) {
    const tiles = [];
    for (let y = 0; y < h; y++) { const row = new Array(w).fill(0); tiles.push(row); }
    return { w, h, tiles, entities: [], spawn: { x: 3 * T, y: 20 * T }, checkpoint: null, goal: null, boss: false, chase: null, tag: 'flow' };
  }

  function groundTopAt(room, tx) {
    tx = U.clamp(tx, 0, room.w - 1);
    for (let y = 0; y < room.h; y++) {
      const t = room.tiles[y][tx];
      if (t === 1 || t === 2 || t === 4) return y;
    }
    return room.h - 1;
  }

  function fillGround(room, x1, x2, top) {
    for (let x = Math.max(0, x1); x <= Math.min(room.w - 1, x2); x++) {
      for (let y = Math.max(1, top); y < room.h; y++) room.tiles[y][x] = 1;
    }
  }

  function clearColumn(room, x1, x2, y1, y2) {
    for (let x = Math.max(0, x1); x <= Math.min(room.w - 1, x2); x++)
      for (let y = Math.max(0, y1); y <= Math.min(room.h - 1, y2); y++) room.tiles[y][x] = 0;
  }

  function addPlatform(room, x, y, len, type) {
    for (let i = 0; i < len; i++) {
      const tx = x + i;
      if (tx < 1 || tx >= room.w - 1 || y < 1 || y >= room.h - 1) continue;
      room.tiles[y][tx] = type === 'ice' ? 4 : 3;
    }
  }

  function addShard(room, x, y) {
    room.entities.push({ type: 'shard', x, y, w: 7, h: 7, collected: false, phase: Math.random() * 6.28 });
  }

  function addElement(room, kind, x, y, opts) {
    const e = Object.assign({ type: 'element', kind, x, y, w: 16, h: 16, t: 0, active: true }, opts || {});
    if (kind === 'wind') { e.w = 30; e.h = 74; }
    if (kind === 'magnet') { e.w = 18; e.h = 18; e.radius = 58; }
    if (kind === 'gravity') { e.w = 24; e.h = 42; e.force = -780; }
    if (kind === 'time') { e.w = 52; e.h = 52; }
    if (kind === 'portal') { e.w = 14; e.h = 22; }
    if (kind === 'fire') { e.w = 12; e.h = 30; }
    if (kind === 'thunder') { e.w = 28; e.h = 54; }
    if (kind === 'spring') { e.w = 16; e.h = 10; }
    if (kind === 'ice') { e.w = 24; e.h = 8; }
    if (kind === 'prism') { e.w = 12; e.h = 12; }
    if (kind === 'rift') { e.w = 16; e.h = 20; }
    room.entities.push(e);
    return e;
  }

  function addReaction(room, a, b, x, y) {
    const def = RL.REACTIONS.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)) || RL.REACTIONS[0];
    room.entities.push({ type: 'reaction', a, b, def, x, y, w: 22, h: 22, triggered: false, t: 0 });
  }

  function makeRoom(opts) {
    opts = opts || {};
    const mode = opts.mode || 'story';
    const ch = opts.chapter || 1;
    const idx = opts.index || 1;
    const seed = roomSeed(mode, ch, idx, opts.extra);
    const rng = U.mulberry32(seed);
    let boss = !!opts.boss;
    if (mode === 'story' && ch === 6 && idx === 8) boss = true;
    const hard = !!opts.hard;
    const tutorial = mode === 'story' && ch === 1 && idx === 1;
    const W = Math.min(112, tutorial ? 62 : 76 + ch * 3 + idx * 2 + (opts.widthBonus || 0));
    const H = C.ROOM_H;
    const room = emptyRoom(W, H);
    room.seed = seed; room.mode = mode; room.chapter = ch; room.index = idx;
    room.id = opts.id || `${mode}-${ch}-${idx}`;
    room.name = opts.name || null;
    room.timeLimit = opts.timeLimit || 0;
    room.dashLimit = opts.dashLimit || 0;
    room.boss = boss;
    room.gauntlet = !!opts.gauntlet;
    room.sandbox = !!opts.sandbox;

    // Base bedrock: a floor at the very bottom, never removed.
    for (let x = 0; x < W; x++) room.tiles[H - 1][x] = 1;
    // Side walls
    for (let y = 0; y < H; y++) { room.tiles[y][0] = 1; room.tiles[y][W - 1] = 1; }

    const startY = 29;
    fillGround(room, 0, 7, startY);
    let x = 7;
    let lastY = startY;
    const iceChapter = ch === 2 || (ch === 6 && rng() < .3);
    const gapMax = tutorial ? 1 : 2 + Math.min(2, Math.floor(ch / 2)) + (hard ? 1 : 0);
    let segIndex = 0;

    while (x < W - 11) {
      // Jumpable gap.
      if (!tutorial && segIndex > 0 && rng() < (boss ? .16 : .46)) {
        const gap = 1 + Math.floor(rng() * (gapMax + 1));
        const pitStart = x;
        clearColumn(room, pitStart, pitStart + gap, 1, H - 2);
        for (let gx = pitStart; gx < pitStart + gap; gx++) {
          room.tiles[H - 2][gx] = 2;
        }
        x += gap;
        if (rng() < .32) addElement(room, 'wind', (pitStart + 0.5) * T, (H - 8) * T, { w: 30, h: 78 });
        if (rng() < .38) addShard(room, (pitStart + gap * .5) * T, (lastY - 4) * T);
      }
      const segLen = 4 + Math.floor(rng() * 7);
      let ny = lastY + (tutorial ? U.pick(rng, [0, 0, 0, 1]) : U.pick(rng, [-2, -1, -1, 0, 0, 0, 1, 2]));
      ny = U.clamp(ny, 19, 30);
      fillGround(room, x, x + segLen, ny);
      // Ice cap
      if (iceChapter && rng() < .35) {
        for (let ix = x + 1; ix < x + segLen; ix++) room.tiles[ny][ix] = 4;
      }
      // Ground spikes
      if (!tutorial && rng() < (hard ? .3 : .16) && x > 12 && segLen >= 5) {
        const sx = x + 1 + Math.floor(rng() * (segLen - 2));
        if (room.tiles[ny][sx] === 1) room.tiles[ny][sx] = 2;
      }
      // Midair one-way platform & collectibles
      if (rng() < (tutorial ? .9 : .6)) {
        const py = ny - (3 + Math.floor(rng() * 4));
        const len = 3 + Math.floor(rng() * 4);
        addPlatform(room, x + 1, py, len, rng() < .25 ? 'ice' : 'normal');
        if (rng() < .55) addShard(room, (x + 1 + len / 2) * T, py * T - 12);
        if (rng() < .25) addElement(room, 'crystal', (x + 1 + len / 2) * T, py * T - 14);
      } else if (rng() < .25) {
        addShard(room, (x + segLen / 2) * T, (ny - 3) * T);
      }
      // Springcap
      if (!tutorial && rng() < .13 && x > 14) {
        addElement(room, 'spring', (x + Math.floor(segLen / 2)) * T, (ny - 1) * T, { w: 16, h: 8 });
      }
      // Chapter element placement
      const key = ['wind', 'ice', 'thunder', 'time', 'fire', 'prism'][ch - 1] || 'prism';
      if (rng() < (tutorial ? .35 : .62)) {
        const ex = (x + Math.floor(segLen / 2)) * T;
        const ey = (ny - 3) * T;
        if (key === 'fire') addElement(room, 'fire', ex, (ny - 3) * T, { w: 12, h: 30 });
        else if (key === 'thunder') addElement(room, 'thunder', ex, (ny - 6) * T, { w: 30, h: 54 });
        else if (key === 'ice') {
          if (rng() < .45) {
            const p1 = addElement(room, 'portal', ex, (ny - 4) * T);
            p1.pair = 1;
            const p2 = addElement(room, 'portal', (x + 2) * T, (ny - 8) * T);
            p2.pair = 2;
          } else addPlatform(room, x + 1, ny - 3, 4, 'ice');
        } else if (key === 'time') addElement(room, 'time', ex, (ny - 5) * T);
        else if (key === 'wind') addElement(room, 'wind', ex, (ny - 7) * T, { w: 30, h: 72 });
        else if (key === 'prism') {
          addElement(room, 'prism', ex, (ny - 4) * T);
          if (rng() < .5) addElement(room, 'gravity', (x + 3) * T, (ny - 6) * T);
        }
      }
      // Extra elements by chapter / hard mode
      if (!tutorial && rng() < .28) {
        const extras = ['magnet', 'gravity', 'rift', 'crystal', 'spring'];
        const kind = U.pick(rng, extras);
        addElement(room, kind, (x + Math.floor(segLen / 2)) * T, (ny - 3) * T);
      }
      // Reaction pair on a mid platform (chapters 3+)
      if (ch >= 3 && rng() < .18) {
        const pair = U.pick(rng, RL.REACTIONS);
        addReaction(room, pair.a, pair.b, (x + Math.floor(segLen / 2)) * T, (ny - 6) * T);
      }
      // Moving platform
      if (rng() < .12) {
        room.entities.push({ type: 'moving', x: (x + 1) * T, y: (ny - 5) * T, w: 30, h: 7, baseX: (x + 1) * T, baseY: (ny - 5) * T, rangeX: 30, rangeY: 0, speed: 1.1, phase: rng() * 6.28 });
      }
      lastY = ny;
      x += segLen + 1;
      segIndex++;
    }

    // Final safe platform and beacon.
    fillGround(room, x, W - 2, startY);
    clearColumn(room, W - 8, W - 2, 1, startY - 1);
    addPlatform(room, W - 9, startY - 4, 6, 'normal');
    x = W - 2;
    room.goal = { type: 'goal', x: (W - 4) * T, y: (startY - 5) * T, w: 16, h: 40 };
    room.entities.push(room.goal);

    // Guaranteed safe start zone.
    for (let sx = 0; sx <= 14; sx++) {
      for (let sy = startY; sy < H; sy++) room.tiles[sy][sx] = 1;
      for (let sy = 1; sy < startY; sy++) room.tiles[sy][sx] = 0;
    }
    // Start spawn.
    room.spawn = { x: 3 * T, y: (startY - 2) * T - C.PLAYER_H };
    // Checkpoint around the middle.
    let cpTx = Math.floor(W * .5);
    for (let i = 0; i < 8; i++) {
      const tx = cpTx + i;
      if (tx < W - 10 && room.tiles[startY][tx] === 1) { cpTx = tx; break; }
    }
    const cpY = groundTopAt(room, cpTx) * T - 18;
    room.checkpoint = { type: 'checkpoint', x: cpTx * T, y: cpY, w: 10, h: 18, active: false };
    room.entities.push(room.checkpoint);

    // Place some shards reliably.
    for (let i = 0; i < 9; i++) {
      const tx = 10 + Math.floor(rng() * (W - 20));
      const ty = groundTopAt(room, tx) - 2 - Math.floor(rng() * 3);
      addShard(room, tx * T, ty * T);
    }
    if (boss) {
      room.goal = { type: 'goal', x: (W - 4) * T, y: (startY - 5) * T, w: 16, h: 40 };
      room.entities.push(room.goal);
      room.chase = { x: -170, speed: 24 + ch * 2 + (hard ? 6 : 0), phase: 0, active: true };
      room.tag = 'peak';
    } else {
      room.tag = idx % 4 === 0 ? 'challenge' : (idx % 3 === 0 ? 'flow' : 'breathing');
    }
    // Ensure goal has clean air.
    clearColumn(room, W - 6, W - 2, 1, startY - 1);
    return room;
  }

  function makeDaily(daySeed, index) {
    return makeRoom({ mode: 'daily', chapter: 1 + ((index - 1) % 6), index, extra: daySeed, hard: true, id: `daily-${index}`, timeLimit: 0 });
  }

  function makeEndless(floor, seed) {
    const ch = 1 + ((floor - 1) % 6);
    const room = makeRoom({ mode: 'endless', chapter: ch, index: 1 + ((floor - 1) % 8), extra: seed + floor * 977, hard: floor > 10, id: `endless-${floor}`, widthBonus: Math.min(14, floor) });
    room.tag = floor % 10 === 0 ? 'peak' : 'challenge';
    return room;
  }

  function makeGauntlet(index, seed) {
    const ch = 1 + ((index - 1) % 6);
    return makeRoom({ mode: 'gauntlet', chapter: ch, index: 1 + ((index - 1) % 8), extra: seed + index * 131, hard: true, gauntlet: true, id: `gauntlet-${index}`, widthBonus: 8 });
  }

  function makeSandbox(params) {
    params = params || {};
    const room = makeRoom({ mode: 'sandbox', chapter: 6, index: 1, extra: 'lab', widthBonus: 10, id: 'sandbox' });
    room.sandbox = true;
    room.params = params;
    room.timeLimit = 0;
    // Guarantee a playground: broad platform with elemental runes.
    const cx = Math.floor(room.w / 2);
    const kinds = ['wind', 'spring', 'crystal', 'portal', 'time', 'gravity', 'prism', 'fire', 'ice', 'thunder', 'magnet', 'rift'];
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i];
      const x = (cx - 20 + (i % 6) * 7) * T;
      const y = (18 + Math.floor(i / 6) * 5) * T;
      addElement(room, kind, x, y);
      if (kind === 'portal') { room.entities[room.entities.length - 1].pair = 1; }
    }
    room.entities.push({ type: 'goal', x: (room.w - 4) * T, y: 24 * T, w: 16, h: 40 });
    return room;
  }

  function fromCustom(data) {
    const w = U.clamp(data.w || 60, 24, 120), h = U.clamp(data.h || 34, 20, 44);
    const room = emptyRoom(w, h);
    room.id = data.id || 'custom'; room.mode = 'custom'; room.custom = true;
    room.w = w; room.h = h;
    if (Array.isArray(data.tiles)) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) room.tiles[y][x] = data.tiles[y] && data.tiles[y][x] || 0;
    }
    room.spawn = { x: (data.spawn && data.spawn.x || 3) * T, y: (data.spawn && data.spawn.y || 20) * T };
    if (data.goal) room.goal = { type: 'goal', x: data.goal.x * T, y: data.goal.y * T, w: 16, h: 40 };
    else room.goal = { type: 'goal', x: (w - 4) * T, y: 20 * T, w: 16, h: 40 };
    room.entities = [];
    (data.entities || []).forEach(e => {
      const o = Object.assign({ type: 'element', kind: 'crystal', w: 16, h: 16, t: 0, active: true }, e);
      o.x = e.x * T; o.y = e.y * T;
      room.entities.push(o);
    });
    if (!room.entities.find(e => e.type === 'goal')) room.entities.push(room.goal);
    room.checkpoint = { type: 'checkpoint', x: (w / 2) * T, y: 20 * T, w: 10, h: 18, active: false };
    room.entities.push(room.checkpoint);
    return room;
  }

  function serializeCustom(room) {
    return {
      id: room.id, w: room.w, h: room.h,
      tiles: room.tiles.map(row => row.slice()),
      spawn: { x: Math.round(room.spawn.x / T), y: Math.round(room.spawn.y / T) },
      goal: room.goal ? { x: Math.round(room.goal.x / T), y: Math.round(room.goal.y / T) } : { x: room.w - 4, y: 20 },
      entities: room.entities.filter(e => e.type === 'element' && e.kind !== 'goal').map(e => ({ type: e.type, kind: e.kind, x: Math.round(e.x / T), y: Math.round(e.y / T), w: e.w, h: e.h, pair: e.pair })),
      v: 1
    };
  }

  RL.Levels = {
    T, makeRoom, makeDaily, makeEndless, makeGauntlet, makeSandbox, fromCustom, serializeCustom,
    emptyRoom, groundTopAt, addElement, addShard, addReaction
  };
})();
