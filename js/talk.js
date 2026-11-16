// Plays one conversation from content/talks.js: on the phone's call screen (a call) or as subtitles
// (someone standing in front of Mason). Lines are paced by their length, in game time, and Space skips
// to the next one. Choices use the choice box, with no time limit. Driven by the act's update(dt).
//   var t = OC.talk.start(g, tree, { call: 'Mom', onNode: fn(id) -> Promise?, onLine: fn(who, text), log: fn(action), onEnd: fn(logs) })
//   t.update(dt) every frame; t.active(); t.node()
(function () {
  var OC = (window.OC = window.OC || {});

  function lineTime(text) {
    return 1.5 + text.length * 0.048;
  }

  function start(g, tree, opts) {
    opts = opts || {};
    var d = OC.dialogue.createDialogue(tree);
    var lines = [];
    var wait = 0;
    var phase = 'lines'; // 'lines' | 'choice' | 'node' (waiting for the act to move people) | 'done'
    var logged = [];
    if (opts.call) g.phone.startCall(opts.call);

    function show(who, text) {
      if (opts.onLine) opts.onLine(who, text);
      if (opts.call) g.phone.callLine(who, text);
      else g.hud.speak(who, text, lineTime(text) * 1000 + 600);
    }
    function enter() {
      var r = opts.onNode ? opts.onNode(d.id()) : null;
      lines = d.node().say.slice();
      wait = 0.35;
      if (r && typeof r.then === 'function') {
        phase = 'node';
        r.then(function () {
          if (phase === 'node') phase = 'lines';
        });
      } else phase = 'lines';
    }
    function finish() {
      phase = 'done';
      window.removeEventListener('keydown', onKey);
      if (opts.call) setTimeout(function () { g.phone.endCall(); }, 1400);
      if (opts.onEnd) opts.onEnd(d.logs());
    }
    function afterLines() {
      var n = d.node();
      if (n.choices && n.choices.length) {
        phase = 'choice';
        g.phone
          .choice({
            prompt: opts.call ? 'On the phone with ' + opts.call + '.' : '',
            options: n.choices.map(function (c) { return { id: c.id, text: c.text }; }),
          })
          .then(function (id) {
            if (phase !== 'choice') return;
            var c = n.choices.filter(function (x) { return x.id === id; })[0] || n.choices[0];
            d.choose(c.id);
            show('Mason', c.text);
            if (c.log) {
              logged.push(c.log);
              if (opts.log) opts.log(c.log);
            }
            wait = lineTime(c.text) * 0.8;
            phase = 'gap';
          });
      } else if (n.end) finish();
      else {
        d.advance();
        enter();
      }
    }
    function onKey(e) {
      if (e.code === 'Space' && phase === 'lines' && !g.phone.isOpen) wait = Math.min(wait, 0.05);
    }
    window.addEventListener('keydown', onKey);

    var api = {
      update: function (dt) {
        if (phase === 'gap') {
          wait -= dt;
          if (wait <= 0) enter();
          return;
        }
        if (phase !== 'lines') return;
        wait -= dt;
        if (wait > 0) return;
        if (lines.length) {
          var l = lines.shift();
          show(l[0], l[1]);
          wait = lineTime(l[1]);
        } else afterLines();
      },
      active: function () {
        return phase !== 'done';
      },
      node: function () {
        return d.id();
      },
      logs: function () {
        return logged.slice();
      },
      // stop now (the act ended): no more lines, the call screen goes
      stop: function () {
        if (phase === 'done') return;
        var wasChoosing = phase === 'choice';
        phase = 'done';
        if (wasChoosing) g.phone.cancelChoice();
        window.removeEventListener('keydown', onKey);
        if (opts.call) g.phone.endCall();
      },
    };
    enter();
    return api;
  }

  OC.talk = { start: start, lineTime: lineTime };
})();
