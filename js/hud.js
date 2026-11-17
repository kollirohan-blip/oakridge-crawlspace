// On-screen text and meters. Everything here is plain DOM so it stays crisp over the pixelated canvas.
(function () {
  var OC = (window.OC = window.OC || {});

  function el(id) {
    return document.getElementById(id);
  }

  var subtitleTimer = null;
  var toastTimer = null;
  var flashImageTimer = null;
  var reading = false;

  var hud = {
    // night: a number (NIGHT 2) or a label of its own (DAY 2)
    setStamp: function (night, label) {
      el('stamp').textContent = (typeof night === 'string' ? night : 'NIGHT ' + night) + '   ' + label;
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
    // someone talking to Mason in person: their name, then the line
    speak: function (who, text, ms) {
      var s = el('subtitle');
      s.innerHTML = '';
      var b = document.createElement('span');
      b.className = 'who' + (who === 'Mason' ? ' mine' : '');
      b.textContent = who + ': ';
      s.appendChild(b);
      s.appendChild(document.createTextNode(text));
      s.classList.add('on');
      clearTimeout(subtitleTimer);
      subtitleTimer = setTimeout(function () {
        s.classList.remove('on');
      }, ms || Math.max(2200, text.length * 55));
    },
    // a photo thrown up full screen for a moment: the flash photo that shows what the room does not
    flashImage: function (url, ms) {
      var i = el('flashImage');
      if (!i) {
        i = document.createElement('img');
        i.id = 'flashImage';
        el('hud').appendChild(i);
      }
      i.src = url;
      i.classList.add('on');
      clearTimeout(flashImageTimer);
      flashImageTimer = setTimeout(function () { i.classList.remove('on'); }, ms || 1500);
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
    // Read something (a note, a letter, a clipping) full screen until the player closes it with E,
    // Space or Esc. onClose runs once it is put away.
    // closed captions from the TV (null hides them); alert: the red emergency style
    cc: function (text, alert) {
      var c = el('cc');
      if (!text) {
        c.classList.remove('on');
        return;
      }
      if (c.textContent !== text) c.textContent = text;
      c.classList.add('on');
      c.classList.toggle('alert', !!alert);
    },
    // the microwave keypad: open with what the display shows, or closed
    keypad: function (open, display) {
      el('keypad').classList.toggle('on', !!open);
      if (display !== undefined) el('kpDisplay').textContent = display;
    },
    // body: a string, or a list of pages ({ title?, body } or strings) turned with E. ~~words~~ in a
    // body are shown crossed out. opts: { shaky, style: 'notebook' }
    read: function (title, body, onClose, opts) {
      var r = el('reader');
      var pages = Array.isArray(body) ? body : [body];
      var at = 0;
      function show() {
        var p = pages[at];
        var text = typeof p === 'string' ? p : p.body;
        var head = (typeof p === 'object' && p.title) || title || '';
        el('readerTitle').textContent = head + (pages.length > 1 ? '   ' + (at + 1) + ' / ' + pages.length : '');
        // crossed-out words: everything is escaped first, so the note's text can never be markup
        var esc = String(text).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
        el('readerBody').innerHTML = esc.replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/\^\^(.+?)\^\^/g, '<span class="scrawl">$1</span>');
        var hint = r.querySelector('.reader-hint');
        if (hint) hint.textContent = at < pages.length - 1 ? 'E to turn the page' : 'E to put it down';
        var paper = r.querySelector('.paper');
        if (paper) paper.scrollTop = 0;
      }
      show();
      r.classList.toggle('shaky', !!(opts && opts.shaky));
      r.classList.toggle('notebook', !!(opts && opts.style === 'notebook'));
      r.classList.toggle('screen', !!(opts && opts.style === 'screen'));
      r.classList.add('on');
      reading = true;
      var armed = false;
      setTimeout(function () { armed = true; }, 250); // the E that opened it must not also close it
      function close(e) {
        if (!armed) return;
        if (e.type === 'keydown' && e.code !== 'KeyE' && e.code !== 'Space' && e.code !== 'Escape') return;
        if (at < pages.length - 1 && !(e.type === 'keydown' && e.code === 'Escape')) {
          at++;
          show();
          armed = false;
          setTimeout(function () { armed = true; }, 200);
          return;
        }
        document.removeEventListener('keydown', close);
        document.removeEventListener('mousedown', close);
        r.classList.remove('on');
        reading = false;
        if (onClose) onClose();
      }
      document.addEventListener('keydown', close);
      document.addEventListener('mousedown', close);
      document.addEventListener('wheel', wheel, { passive: true });
      function wheel(e) {
        if (!reading) return document.removeEventListener('wheel', wheel);
        var paper = r.querySelector('.paper');
        if (paper) paper.scrollTop += e.deltaY * (e.deltaMode === 1 ? 18 : 0.7);
      }
    },
    isReading: function () {
      return reading;
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
