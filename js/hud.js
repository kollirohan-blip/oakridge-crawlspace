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
    // the noise meter while hiding: 0..1, or null to hide it
    setNoise: function (level) {
      var n = el('noise');
      if (level === null || level === undefined) {
        n.classList.remove('on');
        return;
      }
      n.classList.add('on');
      n.classList.toggle('loud', level > 0.6);
      el('noiseFill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, level)) + ')';
    },
    setCrosshair: function (visible) {
      el('crosshair').style.display = visible ? '' : 'none';
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
    // progress of a hold-to-use action: 0..1, or null to hide
    setHold: function (frac) {
      var h = el('hold');
      if (frac === null || frac === undefined) {
        h.classList.remove('on');
        return;
      }
      h.classList.add('on');
      el('holdFill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, frac)) + ')';
    },
    // fade to black with a line of text; resolves the callback once the fade is complete
    fadeOut: function (text, cb) {
      var f = el('fade');
      el('fadeText').textContent = text || '';
      f.classList.add('on');
      if (cb) setTimeout(cb, 1600);
    },
    setFadeText: function (text) {
      el('fadeText').textContent = text;
    },
    fadeIn: function () {
      el('fade').classList.remove('on');
    },
    // a failure: black screen, a title, a line, and "click to try again"
    failScreen: function (title, line, onRetry) {
      var f = el('fade');
      el('fadeText').innerHTML = '';
      var h = document.createElement('div');
      h.className = 'fail-title';
      h.textContent = title;
      var p = document.createElement('div');
      p.className = 'fail-line';
      p.textContent = line;
      var r = document.createElement('div');
      r.className = 'fail-retry';
      r.textContent = 'Click or press E to try again';
      el('fadeText').appendChild(h);
      el('fadeText').appendChild(p);
      el('fadeText').appendChild(r);
      f.classList.add('on');
      var armed = false;
      setTimeout(function () { armed = true; }, 1200);
      function go(e) {
        if (!armed) return;
        if (e.type === 'keydown' && e.code !== 'KeyE' && e.code !== 'Space') return;
        document.removeEventListener('mousedown', go);
        document.removeEventListener('keydown', go);
        onRetry();
      }
      document.addEventListener('mousedown', go);
      document.addEventListener('keydown', go);
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
