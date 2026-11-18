// Checkpoints inside an act, and failing fairly (Phase 8, P1 and P2). A fail goes back to the last
// beat the act saved, not to the top of the act. Each fail is counted where it happened (its spot):
// from the second fail in the same spot, Mason thinks back to a hint written for that fail. A jump
// scare is shown once: the second time it would play (the closet burst on a second failed bluff, the
// face at the glass on a second hold in the car), the act cuts to black on his hum instead. Retrying
// keeps the counts and what was seen; starting the act fresh (the act before it, chapter select,
// Restart) forgets them. Pure logic: main.js and the acts do the saving and the showing.
//   var r = createRetry();
//   r.enter('act4');                        // a fresh start of the act
//   r.save('act4', 'car', data);            // data is plain JSON, copied
//   r.checkpoint('act4') -> { act, beat, data } | null
//   r.fail('act4', 'noise') -> { spot, reason, count, scare, hint }
//   r.scare('act4', 'faceAtGlass') -> true the first time, false after
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.checkpoint = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  // where each fail happens: two fails in the same spot earn the hint
  var SPOTS = {
    act3: { scream: 'bluff', confront: 'bluff', freeze: 'bluff', look: 'walk' },
    act4: { door: 'bath', caught: 'house', checked: 'house', outside: 'yard', seen: 'car', noise: 'car' },
  };
  // the jump scare each fail plays, the first time only
  var SCARES = {
    act3: { scream: 'closetBurst', confront: 'closetBurst', freeze: 'closetBurst', look: 'closetBurst' },
    act4: { door: 'door', caught: 'found', checked: 'found', outside: 'found', seen: 'glass', noise: 'glass' },
  };
  var HINT_AT = 2; // the fail that first earns the hint

  function hintId(act, reason) {
    return 'retry.hint.' + act + '.' + reason;
  }
  // every hint line the game must have before it boots
  var TEXT = [];
  Object.keys(SPOTS).forEach(function (act) {
    Object.keys(SPOTS[act]).forEach(function (reason) { TEXT.push(hintId(act, reason)); });
  });

  function copy(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  function spotOf(act, reason) {
    return (SPOTS[act] && SPOTS[act][reason]) || reason;
  }

  function createRetry() {
    var points = {}; // act -> { beat, data }
    var counts = {}; // act -> { spot: fails }
    var lastFail = {}; // act -> the last fail's result
    var seen = {}; // 'act.scare' -> true

    var api = {
      // a fresh start of an act: no checkpoint, no fails, every scare new again
      enter: function (act) {
        delete points[act];
        delete counts[act];
        delete lastFail[act];
        Object.keys(seen).forEach(function (k) {
          if (k.indexOf(act + '.') === 0) delete seen[k];
        });
      },
      save: function (act, beat, data) {
        if (!act || !beat) throw new Error('a checkpoint needs an act and a beat');
        points[act] = { beat: beat, data: copy(data || {}) };
      },
      // the last checkpoint of this act (a copy: a run can't change what the next retry gets)
      checkpoint: function (act) {
        var p = points[act];
        return p ? { act: act, beat: p.beat, data: copy(p.data) } : null;
      },
      fail: function (act, reason) {
        var spot = spotOf(act, reason);
        counts[act] = counts[act] || {};
        var count = (counts[act][spot] = (counts[act][spot] || 0) + 1);
        var known = !!(SPOTS[act] && SPOTS[act][reason]);
        var scareId = (SCARES[act] && SCARES[act][reason]) || 'fail.' + reason;
        var res = {
          spot: spot,
          reason: reason,
          count: count,
          scare: api.scare(act, scareId),
          hint: known && count >= HINT_AT ? hintId(act, reason) : null,
        };
        lastFail[act] = res;
        return copy(res);
      },
      fails: function (act, spot) {
        return (counts[act] && counts[act][spot]) || 0;
      },
      lastFail: function (act) {
        return lastFail[act] ? copy(lastFail[act]) : null;
      },
      // true the first time a scare plays; false once it has been seen
      scare: function (act, id) {
        var k = act + '.' + id;
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      },
      seen: function (act, id) {
        return !!seen[act + '.' + id];
      },
    };
    return api;
  }

  return { createRetry: createRetry, spotOf: spotOf, hintId: hintId, TEXT: TEXT, SPOTS: SPOTS, HINT_AT: HINT_AT };
});
