// Wes, searching the house (Act 4). He never chases and he never runs. He picks a room, walks to its
// door, tries the handle, goes in and looks round, then stands still with his head tilted and listens,
// and moves on, never to the room he just left. A loud enough sound brings him to look at where it
// was. He finds you only if the act says he can see you for long enough, or if you hide in the same
// place a second time: then he walks straight to it and looks. Pure logic: the act moves his body and
// decides what he can see and hear.
//   var s = createSearch({ rooms: [{ id, door, point }], hides: [{ id, at }], start, path, rnd });
//   s.start(); s.update(dt, { seen, noise: { x, z, loud } | null, hidden: hideId | null }) -> events
//   events: { type: 'step' | 'handle' | 'check' | 'listen' | 'heard' | 'checkHide' | 'caught', room?, hide? }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.search = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_DT = 0.1;

  function createSearch(opts) {
    var rooms = opts.rooms || [];
    var hides = opts.hides || [];
    var rnd = opts.rnd || Math.random;
    var path = opts.path || null;
    var speed = opts.speed || 1.15;
    var stepEvery = opts.stepEvery || 0.62;
    var seeSec = opts.seeSec || 0.7;
    var HANDLE = opts.handleSec || 1.6;
    var CHECK = opts.checkSec || 2.6;
    var LISTEN = opts.listenSec || 2.6;
    var hearRange = opts.hearRange || 14; // metres a sound of loudness 1 carries

    var pos = { x: opts.start.x, z: opts.start.z };
    var heading = 0;
    var job = 'idle'; // 'idle' | 'room' | 'investigate' | 'checkHide' | 'caught'
    var held = false;
    var steps = []; // the current task, as steps: { type: 'goto'|'handle'|'check'|'listen', ... }
    var lastRoom = null;
    var seenT = 0;
    var walkT = 0;
    var uses = Object.assign({}, opts.uses || {}); // hiding places already used (a retry from a checkpoint)
    var wasHidden = null;
    var hideTarget = null;

    function route(to) {
      var pts = path ? path({ x: pos.x, z: pos.z }, to) : null;
      return pts && pts.length ? pts.slice() : [{ x: to.x, z: to.z }];
    }
    function nextRoom() {
      // rooms marked scripted are only ever visited when the act sends him there
      var open = rooms.filter(function (r) { return !r.scripted; });
      var choices = open.filter(function (r) { return r.id !== lastRoom; });
      if (!choices.length) choices = open;
      var r = choices[Math.floor(rnd() * choices.length) % choices.length];
      lastRoom = r.id;
      job = 'room';
      steps = [
        { type: 'goto', pts: route(r.door) },
        { type: 'handle', t: HANDLE, room: r.id },
        { type: 'goto', to: r.point },
        { type: 'check', t: CHECK, room: r.id },
        { type: 'listen', t: LISTEN, room: r.id },
      ];
    }
    function investigate(p) {
      job = 'investigate';
      steps = [{ type: 'goto', pts: route(p) }, { type: 'listen', t: LISTEN + 0.6 }];
    }
    function checkHide(h) {
      job = 'checkHide';
      hideTarget = h;
      steps = [{ type: 'goto', pts: route(h.at) }, { type: 'look', hide: h.id }, { type: 'listen', t: 2 }];
    }

    // move along the current goto step; true when it has arrived
    function walk(step, dt, events) {
      if (!step.pts) step.pts = route(step.to);
      var left = speed * dt;
      while (left > 1e-9 && step.pts.length) {
        var wp = step.pts[0];
        var dx = wp.x - pos.x;
        var dz = wp.z - pos.z;
        var d = Math.hypot(dx, dz);
        if (d < 1e-6) {
          step.pts.shift();
          continue;
        }
        var go = Math.min(d, left);
        pos.x += (dx / d) * go;
        pos.z += (dz / d) * go;
        heading = Math.atan2(dx, dz);
        left -= go;
        if (go >= d - 1e-9) step.pts.shift();
      }
      walkT += dt;
      if (walkT >= stepEvery) {
        walkT -= stepEvery;
        events.push({ type: 'step' });
      }
      return step.pts.length === 0;
    }

    var api = {
      start: function () {
        if (job === 'idle') nextRoom();
      },
      update: function (dt, sense) {
        dt = Math.min(Math.max(dt, 0), MAX_DT);
        var events = [];
        if (job === 'idle' || job === 'caught' || held) return events;
        sense = sense || {};

        // seen: long enough, and he has found you
        seenT = sense.seen ? seenT + dt : Math.max(0, seenT - dt);
        if (seenT >= seeSec - 1e-9) {
          job = 'caught';
          steps = [];
          events.push({ type: 'caught' });
          return events;
        }

        // hiding: the second time in the same place, he comes to look
        var hidden = sense.hidden || null;
        if (hidden && hidden !== wasHidden) {
          uses[hidden] = (uses[hidden] || 0) + 1;
          var h = hides.filter(function (x) { return x.id === hidden; })[0];
          if (h && uses[hidden] >= 2) checkHide(h);
        }
        wasHidden = hidden;

        // heard: he comes to look where it was (unless he is already on his way to a hiding place)
        var n = sense.noise;
        if (n && job !== 'checkHide') {
          var d = Math.hypot(n.x - pos.x, n.z - pos.z);
          if (d <= (n.loud || 0) * hearRange) {
            var already = job === 'investigate' && steps.length && steps[0].type === 'goto' && steps[0].pts.length &&
              Math.hypot(steps[0].pts[steps[0].pts.length - 1].x - n.x, steps[0].pts[steps[0].pts.length - 1].z - n.z) < 2;
            if (!already) {
              events.push({ type: 'heard' });
              investigate({ x: n.x, z: n.z });
            }
          }
        }

        var s = steps[0];
        if (!s) {
          nextRoom();
          return events;
        }
        if (s.type === 'goto') {
          if (walk(s, dt, events)) steps.shift(); // the next step starts on the next update
          return events;
        }
        if (s.type === 'look') {
          steps.shift();
          if (hidden === s.hide) {
            job = 'caught';
            steps = [];
            events.push({ type: 'caught', hide: s.hide });
            return events;
          }
          events.push({ type: 'checkHide', hide: s.hide });
          hideTarget = null;
          return events;
        }
        // handle, check, listen: stand still for a while
        if (!s.started) {
          s.started = true;
          s.elapsed = 0;
          events.push(s.room ? { type: s.type, room: s.room } : { type: s.type });
          return events;
        }
        s.elapsed += dt;
        if (s.elapsed >= s.t - 1e-9) {
          steps.shift();
          if (!steps.length) {
            if (job === 'checkHide' || job === 'investigate') job = 'room';
            nextRoom();
          }
        }
        return events;
      },
      // what he is doing: 'idle', a room step ('goto', 'handle', 'check', 'listen'), 'investigate',
      // 'checkHide', 'caught' or 'held'
      job: function () {
        if (held && job !== 'caught') return 'held';
        if (job === 'room') return steps.length ? steps[0].type : 'goto';
        return job;
      },
      pos: function () {
        return pos;
      },
      heading: function () {
        return heading;
      },
      // the head tilts a beat into a listen
      pose: function () {
        var s = steps[0];
        return s && s.type === 'listen' && s.started && s.elapsed > 0.15 ? 'tilt' : 'stand';
      },
      // the room he is heading for or in
      room: function () {
        var s = steps.filter(function (x) { return x.room; })[0];
        return job === 'room' && s ? s.room : null;
      },
      uses: function (id) {
        return uses[id] || 0;
      },
      // stop him where he is (a scripted moment), and let him carry on
      hold: function () {
        held = true;
      },
      go: function () {
        held = false;
      },
      // make this room his next job, from wherever he is
      send: function (roomId) {
        var r = rooms.filter(function (x) { return x.id === roomId; })[0];
        if (!r) throw new Error('no room "' + roomId + '"');
        if (job === 'caught') return;
        if (job === 'idle') job = 'room';
        lastRoom = r.id;
        job = 'room';
        steps = [
          { type: 'goto', pts: route(r.door) },
          { type: 'handle', t: HANDLE, room: r.id },
          { type: 'goto', to: r.point },
          { type: 'check', t: CHECK, room: r.id },
          { type: 'listen', t: LISTEN, room: r.id },
        ];
      },
      // put him somewhere and start him on a fresh room
      place: function (p) {
        pos.x = p.x;
        pos.z = p.z;
        if (job !== 'idle' && job !== 'caught') nextRoom();
      },
    };
    return api;
  }

  return { createSearch: createSearch };
});
