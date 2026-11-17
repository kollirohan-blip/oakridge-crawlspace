// The epilogue: a VHS screen with what the police found, one line at a time, then the title.
// The gag variant (Mason ate the Tupperware on night one) and the closet ending (he opened it) have
// their own lines.
(function () {
  var OC = (window.OC = window.OC || {});
  var LINES = ['epilogue.1', 'epilogue.2', 'epilogue.3', 'epilogue.4', 'epilogue.5', 'epilogue.6'];
  var GAG = ['gag.1', 'gag.2', 'gag.3'];
  var BAD = ['bad.1', 'bad.2', 'bad.3'];

  OC.epilogue = {
    requiredText: LINES.concat(GAG, BAD, ['epilogue.vo', 'epilogue.title', 'epilogue.credit', 'gag.title', 'bad.title']),
    create: function (g, opts) {
      var variant = (opts && opts.variant) || 'main';
      var gag = variant === 'gag' || variant === 'bad'; // a short card of its own
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
      var lines = variant === 'gag' ? GAG : variant === 'bad' ? BAD : LINES;
      lines.forEach(function (id, i) {
        steps.push({ at: 1.5 + i * 5.2, fn: function () { add(t(id), 'line'); } });
      });
      var end = 1.5 + lines.length * 5.2 + 1.5;
      if (gag) {
        steps.push({ at: end, fn: function () { body.innerHTML = ''; add(t(variant === 'bad' ? 'bad.title' : 'gag.title'), 'title'); add(t('epilogue.credit'), 'credit'); } });
        end -= 7;
      } else {
        steps.push({ at: end, fn: function () { body.innerHTML = ''; add(t('epilogue.vo'), 'vo'); } });
        steps.push({ at: end + 7, fn: function () { body.innerHTML = ''; add(t('epilogue.title'), 'title'); add(t('epilogue.credit'), 'credit'); } });
      }
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
        variant: variant,
        update: function (dt) {
          at += dt;
          while (steps.length && steps[0].at <= at) steps.shift().fn();
        },
      };
    },
  };
})();
