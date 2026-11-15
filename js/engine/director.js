// Act director: tracks an act's tasks and fires its triggers. Pure logic.
// def = { tasks:[{id,label}], triggers:[{id, once?:true, when(state)->bool, do(hooks,state)}], advanceWhen?:'allTasks'|fn(director) }
// hooks = { onTask(id), onAdvance() }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.director = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function createDirector(def, hooks) {
    hooks = hooks || {};
    var completed = {};
    var fired = {};
    var advanced = false;
    var api = {};

    function known(id) {
      return def.tasks.some(function (t) { return t.id === id; });
    }

    function shouldAdvance() {
      var rule = def.advanceWhen || 'allTasks';
      if (typeof rule === 'function') return !!rule(api);
      return def.tasks.every(function (t) { return completed[t.id]; });
    }

    api.complete = function (id) {
      if (!known(id)) throw new Error('unknown task: ' + id);
      if (completed[id]) return false;
      completed[id] = true;
      if (hooks.onTask) hooks.onTask(id);
      if (!advanced && shouldAdvance()) {
        advanced = true;
        if (hooks.onAdvance) hooks.onAdvance();
      }
      return true;
    };
    api.done = function (id) { return !!completed[id]; };
    api.actDone = function () { return advanced; };
    api.list = function () {
      return def.tasks.map(function (t) { return { id: t.id, label: t.label, done: !!completed[t.id] }; });
    };
    api.tick = function (dt, state) {
      (def.triggers || []).forEach(function (tr) {
        var once = tr.once !== false;
        if (once && fired[tr.id]) return;
        if (tr.when(state)) {
          fired[tr.id] = true;
          tr.do(hooks, state);
        }
      });
    };
    return api;
  }

  return { createDirector: createDirector };
});
