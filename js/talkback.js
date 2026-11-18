// What gets noticed, in the game (the rules are js/engine/noticed.js; the lines are content/text.js).
//   P6: Mason talks back to his own silly play. This module counts the things no other module logs
//   (walking into the trees, flushing, staring in the mirror), watches the habit log, and when a quirk
//   is due says Mason's line once, as a short subtitle, when nothing else is being said.
//   P5: a night-two gate calls knew(gate) when it fires; if the gate learned a habit from last night,
//   Mason thinks the line that says so.
// A line never talks over another one: it waits for the subtitle to clear (and, on night one, for the
// dread to be between beats), and gives up if it waits too long. Night one and night two each make one.
(function () {
  var OC = (window.OC = window.OC || {});

  // the yard and the drive; past this is the trees (js/world.js keeps the trees out of this box)
  var CLEAR = { x0: -5, x1: 31, z0: -22, z1: 30 };
  // the driveway runs out past the yard to the road: that is not the trees
  var DRIVE = { x0: 6, x1: 14 };
  var TOILET = { x: 4.35, y: 0.86, z: 20.45 };
  // night one's dread stages that are between beats: a joke may go then
  var CALM = { routine: true, photo: true, relief: true, bed: true };
  var MIRROR_STARE = 12; // seconds at the mirror, on his feet, before it counts
  var QUIRK_WAIT = 30; // a reaction waits this long for a quiet moment, then tries again later

  function inTrees(x, z) {
    if (x > CLEAR.x0 && x < CLEAR.x1 && z > CLEAR.z0 && z < CLEAR.z1) return false;
    if (x > DRIVE.x0 && x < DRIVE.x1 && z <= CLEAR.z0) return false;
    return true;
  }

  function create(g, ctx, night) {
    var t = g.t;
    var hud = g.hud;
    var ctl = g.ctl;
    var flags = ctx.flags;
    var N = OC.noticed;
    var start = g.habits.entries().length; // tonight's entries come after this
    var subEl = document.getElementById('subtitle');

    var st = {
      said: {}, // quirk id -> true, once said tonight
      queued: {}, // quirk id -> true, while waiting
      queue: [],
      knew: {}, // gate -> 'queued' | 'said'
      seen: -1, checkAt: 0,
      trees: false, mirrorT: 0, mirrorLogged: false, flushUntil: 0,
      sub: { text: '', at: -99 },
    };

    // ---- is anything being said? (game time, so it also holds when a check fast-forwards) ------------
    function watchSubtitle() {
      if (!subEl) return;
      var text = subEl.textContent;
      if (text !== st.sub.text) st.sub = { text: text, at: flags.elapsed };
    }
    function talking() {
      if (!subEl || !subEl.classList.contains('on')) return false;
      var lasts = Math.min(14, Math.max(2.2, st.sub.text.length * 0.055)) + 0.3;
      return flags.elapsed - st.sub.at < lasts;
    }
    function quiet() {
      return !talking() && !g.state.cutscene && !g.state.modal && !hud.isReading() && !g.phone.choosing();
    }
    function calm() {
      if (night !== 1) return true;
      var d = ctx.dread;
      return !d || !!CALM[d.stage()];
    }

    // ---- the queue: one line at a time, when it is quiet --------------------------------------------
    function enqueue(item) {
      st.queue.push(item);
    }
    function runQueue() {
      for (var i = 0; i < st.queue.length; i++) {
        var q = st.queue[i];
        if (flags.elapsed < q.at) continue;
        if (flags.elapsed > q.until) {
          st.queue.splice(i, 1);
          if (q.drop) q.drop();
          return;
        }
        if (quiet() && (!q.when || q.when())) {
          st.queue.splice(i, 1);
          hud.say(t(q.text), q.ms);
          st.sub = { text: subEl ? subEl.textContent : '', at: flags.elapsed };
          if (q.done) q.done();
          return;
        }
      }
    }

    // ---- P6: the quirks -----------------------------------------------------------------------------
    function checkQuirks() {
      var all = g.habits.entries();
      if (all.length === st.seen && flags.elapsed < st.checkAt) return;
      st.seen = all.length;
      st.checkAt = flags.elapsed + 2;
      var skip = Object.assign({}, st.said, st.queued);
      N.due(all.slice(start), night, skip).forEach(function (d) {
        st.queued[d.id] = true;
        enqueue({
          text: d.text, ms: 5500, at: flags.elapsed + 0.8, until: flags.elapsed + QUIRK_WAIT,
          when: calm,
          done: function () {
            delete st.queued[d.id];
            st.said[d.id] = true;
            ctx.log('quirk', { kind: d.id });
          },
          drop: function () { delete st.queued[d.id]; },
        });
      });
    }

    // ---- P5: a gate fired. Did it learn something from last night? ------------------------------------
    // Returns true when Mason will say so (the gate's own beats can make room for it).
    function knew(gate, delay, opts) {
      opts = opts || {};
      var text = N.knewText(ctx.plan, gate);
      if (!text || st.knew[gate]) return false;
      st.knew[gate] = 'queued';
      enqueue({
        text: text, ms: opts.ms || 5200, at: flags.elapsed + (delay || 0), until: flags.elapsed + (delay || 0) + (opts.wait || 12),
        when: opts.when,
        done: function () {
          st.knew[gate] = 'said';
          ctx.log('knew', { kind: gate });
        },
      });
      return true;
    }

    // ---- what nobody else counts ----------------------------------------------------------------------
    var items = [];
    if (night === 1) {
      items.push({
        id: 'toilet', x: TOILET.x, y: TOILET.y, z: TOILET.z, radius: 0.3,
        label: 'Flush the toilet',
        enabled: function () { return flags.elapsed >= st.flushUntil; },
        onUse: function () {
          st.flushUntil = flags.elapsed + 2.6;
          var w = ctx.sfx('water', { pos: { x: TOILET.x, y: 0.5, z: TOILET.z }, gain: 1.2 });
          ctx.sfx('click', { pos: TOILET, gain: 0.5 });
          ctx.later(2.2, function () { if (w) w.stop(); });
          ctx.log('flush');
        },
      });
    }

    return {
      items: items,
      state: st,
      knew: knew,
      // did any gate's line get said tonight?
      knewAny: function () {
        return Object.keys(st.knew).some(function (k) { return st.knew[k] === 'said'; });
      },
      update: function (dt) {
        watchSubtitle();
        // walking into the trees (each time he goes in counts once)
        var trees = flags.room === null && !flags.inCrawl && inTrees(ctl.pos.x, ctl.pos.z);
        if (trees && !st.trees) ctx.log('treeline');
        st.trees = trees;
        // staring at himself in the bathroom mirror, on his feet (brushing his teeth does not count)
        if (night === 1 && !st.mirrorLogged) {
          st.mirrorT = g.mirror && g.mirror.active && !ctl.frozen ? st.mirrorT + dt : 0;
          if (st.mirrorT >= MIRROR_STARE) {
            st.mirrorLogged = true;
            ctx.log('mirrorStare');
          }
        }
        checkQuirks();
        runQueue();
      },
      dispose: function () {
        st.queue.length = 0;
      },
    };
  }

  OC.talkback = { create: create, inTrees: inTrees };
  // each night composes it like its own modules
  var mod = { create: function (g, ctx) { return create(g, ctx, 1); }, TEXT: [] };
  var mod2 = { create: function (g, ctx) { return create(g, ctx, 2); }, TEXT: [] };
  OC.night1 = OC.night1 || {};
  OC.night2 = OC.night2 || {};
  OC.night1.talkback = mod;
  OC.night2.talkback = mod2;
  // the text list comes from the rules (noticed.js loads first)
  if (OC.noticed) mod.TEXT = mod2.TEXT = OC.noticed.TEXT.slice();
})();
