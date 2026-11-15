// On-screen text and meters. Everything here is plain DOM so it stays crisp over the pixelated canvas.
(function () {
  var OC = (window.OC = window.OC || {});

  function el(id) {
    return document.getElementById(id);
  }

  var subtitleTimer = null;
  var toastTimer = null;

  var hud = {
    setStamp: function (night, label) {
      el('stamp').textContent = 'NIGHT ' + night + '   ' + label;
    },
    setBattery: function (frac) {
      var f = Math.max(0, Math.min(1, frac));
      el('batteryFill').style.transform = 'scaleX(' + f + ')';
      el('battery').classList.toggle('low', f < 0.15);
    },
    showClickPanel: function (visible) {
      el('click-panel').classList.toggle('hidden', !visible);
    },
    // a line of voiceover or thought, shown for `ms` milliseconds
    say: function (text, ms) {
      var s = el('subtitle');
      s.textContent = text;
      s.classList.add('on');
      clearTimeout(subtitleTimer);
      subtitleTimer = setTimeout(function () {
        s.classList.remove('on');
      }, ms || Math.max(2200, text.length * 55));
    },
    toast: function (text, ms) {
      var t = el('toast');
      t.textContent = text;
      t.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        t.classList.remove('on');
      }, ms || 2600);
    },
    setPrompt: function (text) {
      var p = el('prompt');
      if (text) {
        p.textContent = text;
        p.classList.add('on');
      } else {
        p.classList.remove('on');
      }
    },
    error: function (msg) {
      OC.showError(msg);
    },
  };

  // film grain: a tiny noise canvas redrawn a few times a second
  (function startGrain() {
    var c = el('grainCanvas');
    if (!c) return;
    var g = c.getContext('2d');
    var img = g.createImageData(c.width, c.height);
    setInterval(function () {
      for (var i = 0; i < img.data.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, 110);
  })();

  OC.hud = hud;
})();
