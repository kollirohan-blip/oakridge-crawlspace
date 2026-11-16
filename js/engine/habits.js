// The habit log: everything Mason does, with the clock time he did it. It feeds the settled-in gate,
// next night's habit gates (gated learning) and the notebook Wes keeps about him. Pure logic.
// entry = { action, detail: {}, at: '7:42 PM', t: seconds into the act }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.habits = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var SETTLED_TASKS = 4;
  var SETTLED_SECONDS = 480;

  // What Wes writes down. Keyed by action, or by action:kind when the detail has a kind.
  var LINES = {
    'dinner:lasagna': 'ate the lasagna. good.',
    'dinner:pizza': 'pizza',
    'dinner:mac': "mac and cheese. a child's dinner",
    'dinner:cereal': 'cereal with no milk. i will get milk',
    'dinner:tupperware': 'he ate from the blue box. that was mine',
    gaveBite: 'gave the dog some. the dog likes me better',
    noBite: 'made the dog beg',
    fedCooper: 'fed the dog. one scoop',
    twoScoops: 'two scoops. dave said one',
    petCooper: 'pets the dog a lot',
    trick: 'made the dog do tricks',
    fetch: 'threw the ball for the dog',
    mail: 'read my mail',
    trash: 'took the trash out. stood at the trees a long time',
    sawTreeLight: 'saw my light',
    washedUp: 'washed the dishes with his back to me',
    brushedTeeth: 'brushed his teeth. never looks behind him',
    lockedPatio: 'locked the slider. pulled it twice',
    watchedTv: 'watched tv',
    photo: 'took pictures of the house',
    photoWes: 'took my picture',
    coaxedCooper: 'tried to bring the dog to my door',
    'scratch:lights': 'turned on every light',
    'scratch:cooper': 'called the dog. the dog came to me',
    'scratch:hatch': 'came to the hatch. stood right on top of me',
    'scratch:froze': 'stood still. good boy',
    knocksOpened: 'opened the door for me',
  };

  function clean(e) {
    if (!e || typeof e !== 'object' || typeof e.action !== 'string' || !e.action) return null;
    return {
      action: e.action,
      detail: e.detail && typeof e.detail === 'object' ? e.detail : {},
      at: typeof e.at === 'string' ? e.at : '',
      t: typeof e.t === 'number' ? e.t : 0,
    };
  }

  function createHabits(initial) {
    var list = initial || [];
    function matching(action) {
      return list.filter(function (e) { return e.action === action; });
    }
    return {
      // when = { clock: '7:42 PM', t: seconds }
      log: function (action, detail, when) {
        var e = { action: action, detail: detail || {}, at: (when && when.clock) || '', t: (when && when.t) || 0 };
        list.push(e);
        return e;
      },
      count: function (action) { return matching(action).length; },
      has: function (action) { return matching(action).length > 0; },
      last: function (action) {
        var m = matching(action);
        return m.length ? m[m.length - 1] : null;
      },
      entries: function () { return list.slice(); },
      serialize: function () { return { v: 1, entries: list.slice() }; },
      reset: function () { list = []; },
    };
  }

  // Bad or unknown data (an old save, a hand-edited one) gives an empty log rather than an error.
  function restore(obj) {
    if (!obj || typeof obj !== 'object' || obj.v !== 1 || !Array.isArray(obj.entries)) return createHabits();
    return createHabits(obj.entries.map(clean).filter(Boolean));
  }

  function settledIn(s) {
    return s.tasksDone >= SETTLED_TASKS || s.elapsed >= SETTLED_SECONDS;
  }

  function lastOf(entries, action) {
    for (var i = entries.length - 1; i >= 0; i--) if (entries[i].action === action) return entries[i];
    return null;
  }

  // Next night's gates, read from this night's log.
  function gates(entries) {
    var bed = lastOf(entries, 'bed');
    var light = lastOf(entries, 'phoneLight');
    var looks = entries.filter(function (e) { return e.action === 'windowLook'; }).length;
    return {
      lightsOn: !!bed && (bed.detail.lights || 0) >= 3,
      heavyLight: !!light && (light.detail.sec || 0) >= 120,
      windowWatcher: looks >= 3,
    };
  }

  function lineFor(e) {
    if (e.action === 'bed') return (e.detail.lights || 0) >= 3 ? 'bed. every light on' : 'bed';
    if (e.detail && e.detail.kind && LINES[e.action + ':' + e.detail.kind]) return LINES[e.action + ':' + e.detail.kind];
    return LINES[e.action] || null;
  }

  // The notebook: one line per kind of thing he did, the first time he did it, in Wes's hand.
  function notebookLines(entries) {
    var seen = {};
    var out = [];
    entries.forEach(function (e) {
      var text = lineFor(e);
      if (!text || seen[text]) return;
      seen[text] = true;
      var time = (e.at || '').replace(/\s*[AP]M$/i, '');
      out.push((time ? time + ' ' : '') + text);
    });
    return out;
  }

  return { createHabits: createHabits, restore: restore, settledIn: settledIn, gates: gates, notebookLines: notebookLines, LINES: LINES };
});
