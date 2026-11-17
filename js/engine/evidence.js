// What can Mason prove? The epilogue's ending comes from the habit log alone (it survives a checkpoint
// reload). Key evidence: the two photos that show him (night one's hallway, the closet at 12:30), and
// from under the house his notebook, photographed or taken, and a photo of the nest. Strong = 3 or more
// key items including one that shows him; partial = 2; little = 0 or 1. What Mason saw but cannot show
// (the pet cam clip, the prints, the poster, the face at the glass) is support: it colours the lines,
// never the verdict. Pure logic.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./habits.js'));
  else {
    root.OC = root.OC || {};
    root.OC.evidence = factory(root.OC.habits);
  }
})(typeof self !== 'undefined' ? self : this, function (habits) {
  // in the order the epilogue lists them
  var KEY = [
    { id: 'photoWes', shows: true, test: function (e) { return e.action === 'photoWes'; } },
    { id: 'photoEye', shows: true, test: function (e) { return e.action === 'photoEye'; } },
    { id: 'notebook', shows: false, test: function (e) { return e.action === 'notebook' && (e.detail.kind === 'photo' || e.detail.kind === 'took'); } },
    { id: 'photoNest', shows: false, test: function (e) { return e.action === 'photoNest'; } },
  ];
  var SUPPORT = [
    { id: 'clip', action: 'sawClip' },
    { id: 'prints', action: 'sawPrintsOut' },
    { id: 'poster', action: 'sawPoster' },
    { id: 'face', action: 'faceAtGlass' },
  ];
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function clean(entries) {
    return (entries || []).filter(function (e) { return e && typeof e.action === 'string'; }).map(function (e) {
      return { action: e.action, detail: e.detail && typeof e.detail === 'object' ? e.detail : {} };
    });
  }
  function any(list, fn) {
    for (var i = 0; i < list.length; i++) if (fn(list[i])) return list[i];
    return null;
  }
  function last(list, action) {
    for (var i = list.length - 1; i >= 0; i--) if (list[i].action === action) return list[i];
    return null;
  }

  function resolveEnding(entries) {
    var list = clean(entries);
    var key = KEY.filter(function (k) { return any(list, k.test); });
    var showsHim = key.some(function (k) { return k.shows; });
    var tier = key.length >= 3 && showsHim ? 'strong' : key.length >= 2 ? 'partial' : 'little';
    var book = last(list, 'notebook');
    var survived = last(list, 'survived');
    return {
      tier: tier,
      key: key.map(function (k) { return k.id; }),
      showsHim: showsHim,
      support: SUPPORT.filter(function (s) { return !!last(list, s.action); }).map(function (s) { return s.id; }),
      notebook: book ? book.detail.kind || null : null,
      plan: !!last(list, 'readNotebook'),
      deputy: !!last(list, 'calledDeputy'),
      ray: !!(survived && survived.detail.ray),
      counted: !!any(list, function (e) { return e.action === 'crawl' && e.detail.kind === 'tally'; }),
      shopper: !!last(list, 'sawShopper'),
    };
  }

  // the verdict's text ids, in order: the tier, what only Mason knew, the deputy
  function endingLines(r) {
    var out = ['ep.' + r.tier + '.1', 'ep.' + r.tier + '.2'];
    if (r.plan) out.push('ep.plan');
    if (r.deputy) out.push('ep.deputy');
    return out;
  }

  // the achievement marks this ending gives
  function endingMarks(r) {
    var out = ['ending:' + r.tier];
    if (r.ray) out.push('ending:ray');
    return out;
  }

  // "tuesday 11/17, 9:42 pm": when the player really started, in his hand
  function formatStarted(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    var h = d.getHours();
    var m = d.getMinutes();
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return DAYS[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate() + ', ' + h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'am' : 'pm');
  }

  // The notebook, read out at the end: his first lines about night one and day two (the pages he wrote
  // before night two), and the real time the player started, which the epilogue writes last.
  function notebookReadout(entries, started, max) {
    max = max || 6;
    var lines = [];
    habits.notebookPages(entries || [], 99).forEach(function (p) {
      if (p.title === "TONIGHT'S PLAN") return;
      lines = lines.concat(p.lines);
    });
    return { lines: lines.slice(0, max), last: formatStarted(started) };
  }

  return {
    KEY: KEY.map(function (k) { return k.id; }),
    resolveEnding: resolveEnding,
    endingLines: endingLines,
    endingMarks: endingMarks,
    formatStarted: formatStarted,
    notebookReadout: notebookReadout,
  };
});
