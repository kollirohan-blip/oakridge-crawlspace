// "I'm stuck": the safety net. Pure rules, no DOM and no Three.js (js/stuck.js does the rest).
// - zoneOf: which side of the walls a point is on (a room, the shed, the yard), or null when Mason is
//   away from the house (the Gas-N-Go, the road, under the house).
// - refusal: when the move is not allowed at all, and why.
// - pickSpot: the nearest safe stand point (content/house.js). First choice: the nearest he could walk
//   to from where he is, through the doors as they are right now, so the move never skips anything he
//   could not have done on foot. If he is wedged somewhere nothing can be walked to, the nearest stand
//   point in his own room (or yard, or shed) instead, never through a wall.
// - pickHint: which to-do the stall nudge should talk about.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.stuck = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var SHED = { x0: 25.5, x1: 29.5, z0: -7.5, z1: -3.5 }; // the shed in the front yard, walls included
  var GROUNDS = { x0: -6, x1: 34, z0: -14, z1: 34 }; // the house and its yard (the same box as the nav grid)
  var NUDGE_EVERY = 180; // seconds of play with nothing done on the list before a nudge
  var MIN_AGE = 60; // a task has to have been on the list this long before it is nudged
  // whole chapters that are one set piece from start to finish
  var SCENES = { act3: true, act4: true, epilogue: true };
  // every reason "I'm stuck" can be refused (each has a line on the pause menu: stuck.no.<reason>)
  var REASONS = ['scene', 'busy', 'crawl', 'away'];
  // day two's own moments: in the car there and back, the cut to the afternoon, and the shop in town
  var DAY2 = { driveOut: 'busy', driveHome: 'busy', toAfternoon: 'busy', shop: 'away' };

  // The stall nudge's lines: per night, the tasks worth a nudge (stuck.hint.<act>.<task>). after: a task
  // that has to be done first. Left out on purpose: the tasks a night resolves by itself (the hallway
  // pic, checking on Cooper, the house phone), and the shopping list, which is in town.
  var HINTS = {
    act1: {
      dinner: {}, feedCooper: {}, mail: {}, trash: {}, washUp: { after: 'dinner' },
      brushTeeth: {}, lockPatio: {}, watchTv: {}, hatch: {}, bed: {},
    },
    act2: {
      inside: {}, groceries: { after: 'inside' }, secure: { after: 'inside' }, unpack: { after: 'groceries' },
      breaker: {}, bed: {},
    },
    day2: {
      coffee: {}, feedCooper: {}, petcam: {}, turnCam: { after: 'petcam' }, callMom: {}, callDave: {},
      unpack: {}, email: {}, dogFood: {}, store: {},
    },
  };
  function hintText(act, id) {
    return 'stuck.hint.' + act + '.' + id;
  }
  var TEXT = [];
  Object.keys(HINTS).forEach(function (act) {
    Object.keys(HINTS[act]).forEach(function (id) { TEXT.push(hintText(act, id)); });
  });
  REASONS.forEach(function (r) { TEXT.push('stuck.no.' + r); });
  TEXT.push('stuck.moved');

  // what a night's own state says about moving him now: 'crawl' | 'away' | 'busy' | null
  function busyFor(act, flags) {
    flags = flags || {};
    if (flags.ending) return 'busy';
    if (act === 'act2' && flags.inCrawl) return 'crawl';
    if (act === 'day2') return DAY2[flags.phase] || null;
    return null;
  }

  function inside(r, x, z) {
    return x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1;
  }

  function zoneOf(house, x, z) {
    for (var i = 0; i < house.rooms.length; i++) {
      if (inside(house.rooms[i], x, z)) return house.rooms[i].id;
    }
    if (inside(SHED, x, z)) return 'shed';
    if (inside(GROUNDS, x, z)) return 'yard';
    return null;
  }

  // s: { act, cutscene, modal, choosing, reading, talking, frozen, prone, actBusy, zone }
  // returns null (allowed) or the reason: 'scene' | 'busy' | 'crawl' | 'away'
  function refusal(s) {
    if (!s || !s.act || SCENES[s.act]) return 'scene';
    if (s.cutscene) return 'busy';
    if (s.prone || s.actBusy === 'crawl') return 'crawl';
    if (s.actBusy === 'away' || s.zone === null || s.zone === undefined) return 'away';
    if (s.modal || s.choosing || s.reading || s.talking || s.frozen || s.actBusy) return 'busy';
    return null;
  }

  // o: { house, pos: {x, z}, free(x, z) -> bool, walk(from, to) -> metres or null, reach (m, default 1.5) }
  // returns { name, x, z, by: 'walk' | 'room', metres } or null
  function pickSpot(o) {
    var house = o.house;
    var zone = zoneOf(house, o.pos.x, o.pos.z);
    if (zone === null) return null;
    var reach = o.reach || 1.5;

    // where he can stand right now, on his own side of the walls (he may be caught in something)
    var start = null;
    if (o.free(o.pos.x, o.pos.z)) start = { x: o.pos.x, z: o.pos.z };
    for (var d = 0.1; !start && d <= reach + 1e-9; d += 0.1) {
      for (var a = 0; a < 32; a++) {
        var p = { x: o.pos.x + Math.cos((a / 32) * Math.PI * 2) * d, z: o.pos.z + Math.sin((a / 32) * Math.PI * 2) * d };
        if (zoneOf(house, p.x, p.z) === zone && o.free(p.x, p.z)) {
          start = p;
          break;
        }
      }
    }

    var cands = Object.keys(house.stand)
      .map(function (n) {
        var s = house.stand[n];
        return { name: n, x: s.x, z: s.z, zone: zoneOf(house, s.x, s.z) };
      })
      .filter(function (c) { return c.zone !== null && o.free(c.x, c.z); });

    var best = null;
    if (start) {
      cands.forEach(function (c) {
        var m = o.walk(start, { x: c.x, z: c.z });
        if (typeof m !== 'number' || !isFinite(m)) return;
        if (!best || m < best.metres) best = { name: c.name, x: c.x, z: c.z, by: 'walk', metres: m };
      });
      if (best) return best;
    }
    cands.forEach(function (c) {
      if (c.zone !== zone) return;
      var m = Math.hypot(c.x - o.pos.x, c.z - o.pos.z);
      if (!best || m < best.metres) best = { name: c.name, x: c.x, z: c.z, by: 'room', metres: m };
    });
    return best;
  }

  // o: { tasks: [{ id, done }] (what the phone shows), seenAt: { id: when it first showed },
  //      hints: { id: { after?: id or [ids] } }, given: { id: true }, now?, minAge? }
  // The newest task on the list wins (what the night just asked for); ties go in list order. A task
  // that needs another one done first is skipped until it is (no washing up before dinner).
  function pickHint(o) {
    var done = {};
    o.tasks.forEach(function (t) { if (t.done) done[t.id] = true; });
    var best = null;
    o.tasks.forEach(function (t) {
      var h = o.hints[t.id];
      if (t.done || !h || (o.given && o.given[t.id])) return;
      var after = h.after ? [].concat(h.after) : [];
      if (after.some(function (id) { return !done[id]; })) return;
      var seen = (o.seenAt && o.seenAt[t.id]) || 0;
      if (typeof o.now === 'number' && o.now - seen < (o.minAge || 0)) return; // just asked: give him a minute
      if (!best || seen > best.seen) best = { id: t.id, seen: seen };
    });
    return best ? best.id : null;
  }

  return {
    zoneOf: zoneOf, refusal: refusal, pickSpot: pickSpot, pickHint: pickHint,
    HINTS: HINTS, TEXT: TEXT, REASONS: REASONS, hintText: hintText, busyFor: busyFor,
    NUDGE_EVERY: NUDGE_EVERY, MIN_AGE: MIN_AGE, SHED: SHED, GROUNDS: GROUNDS,
  };
});
