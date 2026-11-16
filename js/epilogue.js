// The epilogue: a VHS screen with what the police found, one line at a time, then the title.
(function () {
  var OC = (window.OC = window.OC || {});
  var LINES = ['epilogue.1', 'epilogue.2', 'epilogue.3', 'epilogue.4', 'epilogue.5', 'epilogue.6'];

  OC.epilogue = {
    requiredText: LINES.concat(['epilogue.vo', 'epilogue.title', 'epilogue.credit']),
    create: function (g) {
      var t = g.t;
      var root = document.getElementById('epilogue');
      var body = document.getElementById('epilogueLines');
      body.innerHTML = '';
      root.classList.add('on');
      g.state.cutscene = true;
      g.hud.fadeIn();
      if (g.drone && g.drone.setTension) g.drone.setTension(0.1);

      var at = 0;
      var steps = [];
      LINES.forEach(function (id, i) {
        steps.push({ at: 1.5 + i * 5.2, fn: function () { add(t(id), 'line'); } });
      });
      var end = 1.5 + LINES.length * 5.2 + 1.5;
      steps.push({ at: end, fn: function () { body.innerHTML = ''; add(t('epilogue.vo'), 'vo'); } });
      steps.push({ at: end + 7, fn: function () { body.innerHTML = ''; add(t('epilogue.title'), 'title'); add(t('epilogue.credit'), 'credit'); } });
      steps.push({
        at: end + 11,
        fn: function () {
          add('Press E to play again', 'again');
          document.addEventListener('keydown', function again(e) {
            if (e.code === 'KeyE' || e.code === 'Space') location.reload();
          });
        },
      });
      function add(text, cls) {
        var d = document.createElement('div');
        d.className = 'ep-' + cls;
        d.textContent = text;
        body.appendChild(d);
      }
      return {
        update: function (dt) {
          at += dt;
          while (steps.length && steps[0].at <= at) steps.shift().fn();
        },
      };
    },
  };
})();
