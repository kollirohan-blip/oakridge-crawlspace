// Conversations as data: nodes with lines to say, then either choices (each with a next node and
// something to log), a next node to move on to, or the end. Pure logic; the phone and the HUD show it.
// tree = { start, nodes: { id: { say: [[who, text]], choices?: [{id, text, next, log?}], next?, end? } } }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.dialogue = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function validateDialogue(tree) {
    var problems = [];
    var nodes = tree.nodes || {};
    if (!nodes[tree.start]) problems.push('start "' + tree.start + '" is not a node');
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      if (n.choices && n.choices.length) {
        n.choices.forEach(function (c) {
          if (!nodes[c.next]) problems.push('"' + id + '" links to missing node "' + c.next + '"');
        });
      } else if (n.next) {
        if (!nodes[n.next]) problems.push('"' + id + '" links to missing node "' + n.next + '"');
      } else if (!n.end) {
        problems.push('"' + id + '" has no choices, no next and no end');
      }
    });
    return problems;
  }

  function createDialogue(tree) {
    var at = tree.start;
    var history = [];
    var api = {
      id: function () {
        return at;
      },
      node: function () {
        return tree.nodes[at];
      },
      done: function () {
        return !!tree.nodes[at].end;
      },
      choose: function (choiceId) {
        var n = tree.nodes[at];
        if (n.end) throw new Error('dialogue is over');
        var c = (n.choices || []).filter(function (x) { return x.id === choiceId; })[0];
        if (!c) throw new Error('no choice "' + choiceId + '" at "' + at + '"');
        history.push({ node: at, choice: c.id, log: c.log });
        at = c.next;
        return tree.nodes[at];
      },
      // move past a node that has no choices; false if it waits for a choice or is the end
      advance: function () {
        var n = tree.nodes[at];
        if (n.end || (n.choices && n.choices.length) || !n.next) return false;
        at = n.next;
        return true;
      },
      history: function () {
        return history.slice();
      },
      logs: function () {
        return history.map(function (h) { return h.log; }).filter(Boolean);
      },
    };
    return api;
  }

  return { createDialogue: createDialogue, validateDialogue: validateDialogue };
});
