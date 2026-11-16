// The scare pool: the Director's toolkit. Which items may happen now, given the night, the fear level
// (1..10) and each item's cooldown. Scares are one-time; ambient sounds repeat after a cooldown;
// nothing fires twice in a row. Pure logic.
// item = { id, kind: 'ambient'|'scare'|'idle', nights: [n], minFear=1, maxFear=10, once=true, cooldown=0 }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.scarePool = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var KINDS = ['ambient', 'scare', 'idle'];

  function norm(it) {
    return {
      id: it.id,
      kind: it.kind,
      nights: it.nights || [],
      minFear: it.minFear || 1,
      maxFear: it.maxFear || 10,
      once: it.once !== false,
      cooldown: it.cooldown || 0,
    };
  }

  function validatePool(items) {
    var problems = [];
    var seen = {};
    items.forEach(function (raw) {
      var it = norm(raw);
      if (seen[it.id]) problems.push('duplicate id: ' + it.id);
      seen[it.id] = true;
      if (!it.nights.length) problems.push(it.id + ': no nights');
      if (it.minFear > it.maxFear) problems.push(it.id + ': minFear above maxFear');
      if (KINDS.indexOf(it.kind) < 0) problems.push(it.id + ': unknown kind ' + it.kind);
    });
    return problems;
  }

  function createScarePool(rawItems) {
    var items = rawItems.map(norm);
    var used = {};
    var lastAt = {};
    var last = null;

    function eligible(ctx) {
      return items.filter(function (it) {
        if (it.nights.indexOf(ctx.night) < 0) return false;
        if (ctx.fear < it.minFear || ctx.fear > it.maxFear) return false;
        if (ctx.kind && it.kind !== ctx.kind) return false;
        if (it.once && used[it.id]) return false;
        if (lastAt[it.id] !== undefined && ctx.now - lastAt[it.id] < it.cooldown) return false;
        return true;
      });
    }

    return {
      eligible: eligible,
      pick: function (ctx, rnd) {
        var list = eligible(ctx).filter(function (it) { return it.id !== last; });
        if (!list.length) return null;
        var r = (rnd || Math.random)();
        return list[Math.min(list.length - 1, Math.floor(r * list.length))];
      },
      fire: function (id, now) {
        if (!items.some(function (it) { return it.id === id; })) throw new Error('unknown scare: ' + id);
        used[id] = true;
        lastAt[id] = now;
        last = id;
      },
      used: function (id) {
        var it = items.filter(function (x) { return x.id === id; })[0];
        return !!(it && it.once && used[id]);
      },
    };
  }

  return { createScarePool: createScarePool, validatePool: validatePool };
});
