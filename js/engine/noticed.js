// What gets noticed. Two things, both read from the habit log (js/engine/habits.js). Pure logic.
//
// P5, the learning made visible: when a night-two habit gate fires because of something Mason really
// did on night one, he thinks a line that says so ("he knew"), and Wes's notebook has the same habit on
// its WHAT HE DOES page. A breaker that only trips as the fallback learned nothing, so it gets neither.
//
// P6, Mason talks back to silly play: counters over the log (flushing five times, a minute of petting
// Cooper, the fridge over and over, the padlocked hatch again and again...). Each reaction is Mason's
// own thought, plays at most once a night, and some of them end up in Wes's notebook, in his lowercase.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./habits.js'));
  else {
    root.OC = root.OC || {};
    root.OC.noticed = factory(root.OC.habits);
  }
})(typeof self !== 'undefined' ? self : this, function (habits) {
  // gate -> the habit that sets it (habits.nightTwoPlan's `why`), Mason's thought, Wes's line
  var GATES = {
    breaker: { habit: 'lightsOn', text: 'p8.knew.breaker', note: 'sleeps with every light on. i counted them' },
    lightFalters: { habit: 'heavyLight', text: 'p8.knew.light', note: 'always has his little light on. it will not last' },
    tvReflection: { habit: 'windowWatcher', text: 'p8.knew.tv', note: "keeps looking at dave's window. i will give him something to look at" },
  };
  var GATE_ORDER = ['breaker', 'lightFalters', 'tvReflection'];

  // The silly things. A rule is one of:
  //   count: N           the action happened N times tonight
  //   span: S, gap: G    a run of the action, no more than G s apart, lasting S s
  //   burst: N, within: W  N of the action inside any W seconds
  // note (optional) is what Wes writes about it; {n} is how many times.
  var QUIRKS = [
    { id: 'treeline', action: 'treeline', count: 1, nights: [1, 2], text: 'p8.quirk.treeline', text2: 'p8.quirk.treeline2', note: 'walked into my trees in the dark. i was three trees away' },
    { id: 'flush', action: 'flush', count: 5, nights: [1], text: 'p8.quirk.flush', note: 'flushed {n} times. the pipes go right past my head' },
    { id: 'pet', action: 'petCooper', span: 60, gap: 15, nights: [1], text: 'p8.quirk.pet', note: 'pet the dog for a whole minute. at night the dog comes to me' },
    { id: 'fridge', action: 'fridge', count: 6, nights: [1], text: 'p8.quirk.fridge', note: 'opened the fridge {n} times. hungry boy' },
    { id: 'hatch', action: 'hatchTry', count: 4, nights: [1], text: 'p8.quirk.hatch', note: 'tried my door {n} times. i heard every one' },
    { id: 'fish', action: 'fishSet', count: 4, nights: [1], text: 'p8.quirk.fish', note: 'made the fish sing {n} times. it sings for me too' },
    { id: 'magnets', action: 'readMagnets', count: 3, nights: [1], text: 'p8.quirk.magnets' },
    { id: 'channels', action: 'channel', count: 12, nights: [1], text: 'p8.quirk.channels', note: 'changed the channel {n} times. there are only four' },
    { id: 'switches', action: 'switch', burst: 8, within: 15, nights: [1], text: 'p8.quirk.switches', note: 'turned the lights on and off {n} times. i saw it from the trees' },
    { id: 'fetch', action: 'fetch', count: 8, nights: [1], text: 'p8.quirk.fetch', note: 'threw the ball {n} times. the dog brings it to me too' },
    { id: 'mirror', action: 'mirrorStare', count: 1, nights: [1], text: 'p8.quirk.mirror' },
  ];
  var BY_ID = {};
  QUIRKS.forEach(function (q) { BY_ID[q.id] = q; });

  // every text id this feature can say (a module's requiredText lists them)
  var TEXT = GATE_ORDER.map(function (g) { return GATES[g].text; }).concat(['p8.knew.book']);
  QUIRKS.forEach(function (q) {
    TEXT.push(q.text);
    if (q.text2) TEXT.push(q.text2);
  });

  function quirk(id) {
    return BY_ID[id] || null;
  }

  // ---- P5 ----------------------------------------------------------------------------------------------
  // The habit this gate learned, or null: the gate did not fire, or (the breaker) fired as the fallback.
  // A plan forced for a check has no reasons: its gates count as learned.
  function habitFor(plan, gate) {
    var g = GATES[gate];
    if (!g || !plan || !plan.gates || !plan.gates[gate]) return null;
    var why = plan.why ? plan.why[gate] : g.habit;
    return why === g.habit ? why : null;
  }
  function knewText(plan, gate) {
    return habitFor(plan, gate) ? GATES[gate].text : null;
  }

  // ---- P6 ----------------------------------------------------------------------------------------------
  function ofAction(entries, action) {
    return entries.filter(function (e) { return e && e.action === action; });
  }
  // how far along a rule is: a count, the longest run in seconds, or the most inside one window
  function progress(entries, q) {
    var list = ofAction(entries, q.action);
    if (q.span) {
      var best = 0;
      var start = 0;
      for (var i = 1; i < list.length; i++) {
        if (list[i].t - list[i - 1].t > q.gap) start = i;
        best = Math.max(best, list[i].t - list[start].t);
      }
      return best;
    }
    if (q.burst) {
      var most = 0;
      var lo = 0;
      for (var j = 0; j < list.length; j++) {
        while (list[j].t - list[lo].t > q.within) lo++;
        most = Math.max(most, j - lo + 1);
      }
      return most;
    }
    return list.length;
  }
  function reached(entries, q) {
    return progress(entries, q) >= (q.span || q.burst || q.count);
  }
  // the reactions due tonight (entries: tonight's log), leaving out any already said
  function due(entries, night, said) {
    said = said || {};
    return QUIRKS.filter(function (q) {
      return q.nights.indexOf(night) >= 0 && !said[q.id] && reached(entries, q);
    }).map(function (q) {
      return { id: q.id, text: night === 2 && q.text2 ? q.text2 : q.text };
    });
  }

  // ---- the notebook ------------------------------------------------------------------------------------
  // the log before night two: night one, and day two from its marker
  function beforeNightTwo(entries) {
    var end = entries.length;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].action === 'nightTwo') {
        end = i;
        break;
      }
    }
    var before = entries.slice(0, end);
    for (var k = 0; k < before.length; k++) {
      if (before[k].action === 'dayTwo') return { night: before.slice(0, k), day: before.slice(k + 1) };
    }
    return { night: before, day: [] };
  }
  // WHAT HE DOES: the habits tonight's gates learned, then the silly things from night one he counted
  function noteLines(entries) {
    var parts = beforeNightTwo(entries || []);
    var plan = habits.nightTwoPlan(entries || []);
    var out = [];
    GATE_ORDER.forEach(function (g) {
      if (habitFor(plan, g)) out.push(GATES[g].note);
    });
    QUIRKS.forEach(function (q) {
      if (q.note && q.nights.indexOf(1) >= 0 && reached(parts.night, q)) {
        out.push(q.note.replace('{n}', String(progress(parts.night, q))));
      }
    });
    return out;
  }
  // the notebook as the crawl shows it: habits.notebookPages, with WHAT HE DOES before the plan
  function notebookPages(entries, perPage) {
    perPage = perPage || 9;
    var pages = habits.notebookPages(entries || [], perPage);
    var lines = noteLines(entries);
    if (!lines.length) return pages;
    var extra = [];
    for (var i = 0; i < lines.length; i += perPage) {
      extra.push({ title: i ? 'WHAT HE DOES (' + (i / perPage + 1) + ')' : 'WHAT HE DOES', lines: lines.slice(i, i + perPage) });
    }
    return pages.slice(0, -1).concat(extra, pages.slice(-1));
  }

  return {
    GATES: GATES,
    QUIRKS: QUIRKS,
    TEXT: TEXT,
    quirk: quirk,
    habitFor: habitFor,
    knewText: knewText,
    progress: progress,
    due: due,
    noteLines: noteLines,
    notebookPages: notebookPages,
  };
});
