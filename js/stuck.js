// "I'm stuck", in the game (the rules are js/engine/stuck.js; the lines are content/text.js).
//   The pause menu's button: refused (with Mason's reason, on the menu) during a set piece, a cutscene,
//   under the house, in the car or away from home. Otherwise it puts him on the nearest stand point he
//   could have walked to from where he is (so it never skips anything), and he says so.
//   The stall nudge: a few minutes of play with nothing done on the list, and Mason works out what he
//   was doing, more exactly than the list says. A thought, never a tutorial box, and never over another
//   line. Each task is nudged once a night.
(function () {
  var OC = (window.OC = window.OC || {});

  function create(o) {
    // o: { g, ctl, hud, phone, house, current() -> { id, act } }
    var S = OC.stuck;
    var g = o.g;
    var ctl = o.ctl;
    var subEl = document.getElementById('subtitle');
    var st = null;

    function enter(id) {
      st = { act: id, t: 0, seenAt: {}, given: {}, lastNudge: 0, sub: { text: '', at: -99 } };
    }
    enter(null);

    function flagsNow() {
      var cur = o.current();
      return cur.act && cur.act.flags ? cur.act.flags : {};
    }

    // null when he can be moved, or why not ('scene' | 'busy' | 'crawl' | 'away')
    function refusal() {
      var cur = o.current();
      return S.refusal({
        act: cur.act ? cur.id : null,
        cutscene: !!g.state.cutscene,
        modal: !!g.state.modal,
        choosing: o.phone.choosing(),
        reading: o.hud.isReading(),
        frozen: !!ctl.frozen,
        prone: !!ctl.prone,
        actBusy: S.busyFor(cur.id, flagsNow()),
        zone: S.zoneOf(o.house, ctl.pos.x, ctl.pos.z),
      });
    }

    function walk(a, b) {
      var p = ctl.nav.findPath(a, b);
      if (!p) return null;
      var m = 0;
      var prev = a;
      p.forEach(function (q) {
        m += Math.hypot(q.x - prev.x, q.z - prev.z);
        prev = q;
      });
      return m;
    }

    // the move itself: returns the spot, or null when there is nowhere to put him
    function move() {
      var spot = S.pickSpot({
        house: o.house,
        pos: { x: ctl.pos.x, z: ctl.pos.z },
        free: function (x, z) { return ctl.nav.isFree(x, z); },
        walk: walk,
      });
      if (!spot) return null;
      ctl.teleport(spot.x, spot.z, ctl.yaw, 0);
      // and if he has been at it a while, what he was doing (it counts as tonight's nudge for that task)
      var id = due(true);
      if (id) give(id);
      else o.hud.say(g.t('stuck.moved'), 4500);
      return spot;
    }

    // ---- the stall nudge -----------------------------------------------------------------------------
    // Is a line up? Timed in game time from when its text changed, as long as a line of that length
    // stays (js/talkback.js does the same): the box hides on a real-time timer, which a fast-forward or a
    // paused game would not keep in step with the night.
    function watchSubtitle() {
      if (!subEl) return;
      var text = subEl.textContent;
      if (text !== st.sub.text) st.sub = { text: text, at: st.t };
    }
    function talking() {
      if (!subEl || !subEl.classList.contains('on')) return false;
      var lasts = Math.min(14, Math.max(2.2, st.sub.text.length * 0.055)) + 0.3;
      return st.t - st.sub.at < lasts;
    }
    function quiet() {
      return !talking() && !g.state.cutscene && !g.state.modal && !o.hud.isReading() && !o.phone.choosing();
    }
    // the task to talk about now, or null. asked: he pressed "I'm stuck" (no waiting for the timer)
    function due(asked) {
      var hints = S.HINTS[st.act];
      var cur = o.current();
      if (!hints || !cur.act || !cur.act.director) return null;
      if (!asked) {
        var since = cur.act.director.sinceTask ? cur.act.director.sinceTask() : 0;
        if (since < S.NUDGE_EVERY || st.t - st.lastNudge < S.NUDGE_EVERY) return null;
      }
      return S.pickHint({ tasks: o.phone.tasks(), seenAt: st.seenAt, hints: hints, given: st.given, now: st.t, minAge: S.MIN_AGE });
    }
    function give(id) {
      st.given[id] = true;
      st.lastNudge = st.t;
      o.hud.say(g.t(S.hintText(st.act, id)), 7000);
    }
    function update(dt) {
      if (!S.HINTS[st.act]) return;
      st.t += dt;
      watchSubtitle();
      o.phone.tasks().forEach(function (x) {
        if (!(x.id in st.seenAt)) st.seenAt[x.id] = st.t;
      });
      if (!quiet()) return;
      var cur = o.current();
      var since = cur.act && cur.act.director && cur.act.director.sinceTask ? cur.act.director.sinceTask() : 0;
      if (since < S.NUDGE_EVERY || st.t - st.lastNudge < S.NUDGE_EVERY) return;
      var id = due(false);
      if (id) give(id);
      else st.lastNudge = st.t; // nothing worth saying yet: look again in a few minutes
    }

    return {
      enter: enter,
      refusal: refusal,
      move: move,
      update: update,
      state: function () { return st; },
    };
  }

  OC.stuckHelp = { create: create };
})();
