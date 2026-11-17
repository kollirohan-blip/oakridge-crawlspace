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
    // day two: he listens through the floor, and he went to the store too
    sawClip: 'he saw me turn the camera. i do not like it watching',
    coffee: "drank dave's coffee. dave makes it too strong",
    stayedOnWithMom: 'asked his mother to stay on the phone. mine said go back to sleep',
    readArticle: 'read about people like me. i am not like them. this is my house',
    calledDeputy: 'he called a policeman',
    rayVisited: 'the policeman stood on my door. he did not open it',
    sawGrowthMarks: 'he found my marks. i am taller now',
    'lore:boxes': 'went through my boxes',
    'lore:photo': 'looked at my team. i hit one',
    'lore:yearbook': 'read the book. i did not graduate',
    sawHook: 'looked for the bar. i have the bar',
    emptyBag: 'found the bag. the dog was hungry. dave forgets',
    sawPoster: 'saw my picture at the store. i was 16',
    toldCashier: 'told the girl at the store where he sleeps',
    'snack:a': 'bought cheese puffs',
    'snack:b': 'bought burritos',
    'snack:c': 'bought a salad. nobody wants that',
    sawShopper: 'i went to the store too. he looked right at me',
    sawRoadside: 'watched him drive home. he saw me. good',
    flappyTen: 'plays the game on his phone where the dog flies. he got to ten',
  };
  // what goes on the first page when he never saw the boy do anything worth writing down
  var NOTHING_SEEN = ['came in a grey car', 'the dog likes him. the dog likes me better'];
  // how tonight's plan ends, under the boy's own routine
  var PLAN_END = ['he sleeps', 'i go up'];
  var ROUTINE = { dinner: 'dinner', tvOn: 'tv', watchedTv: 'tv', brushedTeeth: 'bathroom' };

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
      // Mark where a chapter starts ('dayTwo', 'nightTwo'). Starting it again (a restart, or chapter
      // select) first forgets that chapter and everything after it, so the log never doubles up.
      startChapter: function (marker) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].action === marker) {
            list = list.slice(0, i);
            break;
          }
        }
        list.push({ action: marker, detail: {}, at: '', t: 0 });
      },
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
  // seen (optional) carries what is already written, so a later section does not repeat it.
  function notebookLines(entries, seen) {
    seen = seen || {};
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

  // the log is one list: night one, then day two from its 'dayTwo' marker, then night two from its
  // 'nightTwo' marker (which the notebook was written before, so it is left out)
  function split(entries) {
    var end = entries.length;
    for (var n = 0; n < entries.length; n++) {
      if (entries[n].action === 'nightTwo') {
        end = n;
        break;
      }
    }
    var before = entries.slice(0, end);
    for (var i = 0; i < before.length; i++) {
      if (before[i].action === 'dayTwo') return { night: before.slice(0, i), day: before.slice(i + 1) };
    }
    return { night: before, day: [] };
  }

  // Night two, read from the log: which habits the house punishes (always at least one), and which
  // sound from his own evening he hears again from another room.
  function nightTwoPlan(entries) {
    var parts = split(entries);
    var g = gates(parts.night.concat(parts.day));
    var dinner = lastOf(parts.night, 'dinner');
    var kind = dinner && dinner.detail ? dinner.detail.kind : null;
    var familiar = 'microwave';
    if (kind === 'mac') familiar = 'kettle';
    else if (kind === 'pizza') familiar = 'oven';
    else if (kind === 'cereal' && entries.some(function (e) { return e.action === 'tvOn' || e.action === 'watchedTv'; })) familiar = 'tv';
    return {
      gates: {
        breaker: g.lightsOn || (!g.heavyLight && !g.windowWatcher),
        lightFalters: g.heavyLight,
        tvReflection: g.windowWatcher,
      },
      familiar: familiar,
    };
  }

  // "TONIGHT'S PLAN": the boy's own routine, in the order he did it last night, and bed last.
  function tonightsPlan(entries) {
    var plan = [];
    split(entries).night.forEach(function (e) {
      var step = ROUTINE[e.action];
      if (step && plan.indexOf(step) < 0) plan.push(step);
    });
    plan.push('bed');
    return plan;
  }

  // The notebook, page by page: [{ title, lines }]. Last night, then today, then tonight's plan.
  function notebookPages(entries, perPage) {
    perPage = perPage || 9;
    var parts = split(entries);
    var seen = {};
    var pages = [];
    function section(title, lines) {
      for (var i = 0; i < lines.length; i += perPage) {
        pages.push({ title: i ? title + ' (' + (i / perPage + 1) + ')' : title, lines: lines.slice(i, i + perPage) });
      }
    }
    var night = notebookLines(parts.night, seen);
    section('MASON', night.length ? night : NOTHING_SEEN.slice());
    section('TODAY', notebookLines(parts.day, seen));
    pages.push({ title: "TONIGHT'S PLAN", lines: tonightsPlan(entries).concat(PLAN_END) });
    return pages;
  }

  return {
    createHabits: createHabits,
    restore: restore,
    settledIn: settledIn,
    gates: gates,
    notebookLines: notebookLines,
    nightTwoPlan: nightTwoPlan,
    tonightsPlan: tonightsPlan,
    notebookPages: notebookPages,
    LINES: LINES,
  };
});
