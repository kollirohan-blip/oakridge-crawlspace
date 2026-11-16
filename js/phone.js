// Mason's phone: Tab opens it. Apps, switched with keys 1 to 6 while it is open: Home (the to-do
// list, Dave-isms collected, the shopping list, texts), Camera (with flash), the Pet Cam, Photos,
// Flappy Cooper and Ethan's mixtape. It buzzes with a preview when a text comes in, and runs the
// choices (keys 1, 2, 3...) and the call in Act 3.
(function () {
  var OC = (window.OC = window.OC || {});
  var APPS = ['home', 'camera', 'petcam', 'photos', 'flappy', 'music'];
  var APP_LABELS = { home: 'Home', camera: 'Camera', petcam: 'Pet Cam', photos: 'Photos', flappy: 'Flappy', music: 'Mixtape' };

  function el(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function create(ctl) {
    var messages = []; // { thread, from, text, mine, time }
    var tasks = [];
    var time = '';
    var notifTimer = null;
    var choiceState = null;
    var app = 'home';
    var collected = null; // { n, total }
    var shopping = [];
    var photos = [];
    var reviewTimer = null;
    var flappy = OC.flappy ? OC.flappy.createFlappy({ w: 120, h: 180 }) : null;
    var track = -1;

    var api = {
      isOpen: false,
      enabled: true,
      onShoot: null, // set by main: takes a photo, returns it
      onMusic: null, // set by main: (trackIndex | -1)
      onApp: null, // (name) when the app changes
      open: function () {
        if (!api.enabled) return;
        api.isOpen = true;
        el('phone').classList.remove('hidden');
        document.body.classList.add('phone-open');
        render();
        if (OC.audio) OC.audio.play('click', { gain: 0.6 });
      },
      close: function () {
        api.isOpen = false;
        el('phone').classList.add('hidden');
        el('viewfinder').classList.add('hidden');
        document.body.classList.remove('phone-open');
      },
      toggle: function () {
        if (api.isOpen) api.close();
        else api.open();
      },
      app: function (name) {
        if (APPS.indexOf(name) < 0) throw new Error('unknown app: ' + name);
        app = name;
        if (api.onApp) api.onApp(name);
        render();
      },
      currentApp: function () {
        return app;
      },
      setTasks: function (list) {
        tasks = list.slice();
        if (api.isOpen) render();
      },
      setCollected: function (n, total) {
        collected = { n: n, total: total };
        if (api.isOpen) render();
      },
      setShopping: function (list) {
        shopping = list.slice();
        if (api.isOpen) render();
      },
      setTime: function (label) {
        time = label;
        el('phoneTime').textContent = label;
      },
      setBattery: function (frac) {
        el('phoneBatt').textContent = Math.max(0, Math.round(frac * 100)) + '%';
      },
      setPetcamCanvas: function (canvas) {
        el('petcamWrap').appendChild(canvas);
      },
      addPhoto: function (photo) {
        photos.push(photo);
        var img = el('vfReview');
        img.src = photo.url;
        img.classList.add('on');
        clearTimeout(reviewTimer);
        reviewTimer = setTimeout(function () { img.classList.remove('on'); }, 2200);
        if (api.isOpen) render();
      },
      photos: function () {
        return photos.slice();
      },
      // the phone held up in front of everything (the 2:13 AM pet cam alert)
      raise: function (v) {
        el('phone').classList.toggle('raised', !!v);
      },
      stopMusic: function () {
        if (track >= 0) {
          track = -1;
          if (api.onMusic) api.onMusic(-1);
          if (api.isOpen) render();
        }
      },
      // a text arriving from someone else
      deliver: function (thread, from, text) {
        messages.push({ thread: thread, from: from, text: text, mine: false, time: time });
        if (OC.audio) OC.audio.play('buzz', { gain: 0.8 });
        api.notify(from, text);
        if (api.isOpen) render();
      },
      // a notification with no message (the pet cam's motion alert)
      notify: function (from, text) {
        var n = el('notif');
        n.innerHTML = '<b>' + esc(from) + '</b> ' + esc(text.length > 70 ? text.slice(0, 68) + '...' : text);
        n.classList.add('on');
        clearTimeout(notifTimer);
        notifTimer = setTimeout(function () { n.classList.remove('on'); }, 5200);
      },
      // a text Mason sends
      send: function (thread, text) {
        messages.push({ thread: thread, from: 'Mason', text: text, mine: true, time: time });
        if (api.isOpen) render();
      },
      messages: function () {
        return messages.slice();
      },
      // a choice: resolves with the chosen option's id, or 'timeout'. Keys 1 to 9.
      // opts.seconds: a time limit, or leave it out for no limit.
      choice: function (opts) {
        return new Promise(function (resolve) {
          var box = el('choice');
          el('choicePrompt').textContent = opts.prompt || '';
          el('choiceOpts').innerHTML = opts.options
            .map(function (o, i) {
              return '<div class="opt"><span class="key">' + (i + 1) + '</span>' + esc(o.text) + '</div>';
            })
            .join('');
          el('choiceTimer').style.display = opts.seconds ? '' : 'none';
          box.classList.remove('hidden');
          choiceState = { opts: opts, left: opts.seconds || 0, total: opts.seconds || 0, resolve: resolve };
        });
      },
      choosing: function () {
        return !!choiceState;
      },
      // answer the open choice by number (1-based), as if the key was pressed
      answer: function (n) {
        if (choiceState && n >= 1 && n <= choiceState.opts.options.length) finishChoice(choiceState.opts.options[n - 1].id);
      },
      // a phone call shown on screen, line by line
      startCall: function (name) {
        el('callName').textContent = name;
        el('callLines').innerHTML = '';
        el('call').classList.remove('hidden');
      },
      callLine: function (who, text) {
        var d = document.createElement('div');
        d.className = 'line ' + (who === 'Mason' ? 'mine' : '');
        d.innerHTML = '<b>' + esc(who) + ':</b> ' + esc(text);
        el('callLines').appendChild(d);
        var lines = el('callLines').children;
        while (lines.length > 4) el('callLines').removeChild(lines[0]);
      },
      endCall: function () {
        el('call').classList.add('hidden');
      },
      // the app's own action (Space or a click): photo, flap, next track
      act: function () {
        if (!api.isOpen) return;
        if (app === 'camera' && api.onShoot) api.onShoot();
        else if (app === 'flappy' && flappy) flappy.flap();
        else if (app === 'music') {
          var n = OC.audio && OC.audio.tracks ? OC.audio.tracks.length : 3;
          track = track + 1 >= n ? -1 : track + 1;
          if (api.onMusic) api.onMusic(track);
          render();
        }
      },
      flappy: function () {
        return flappy;
      },
      update: function (dt) {
        if (api.isOpen && app === 'flappy' && flappy) {
          flappy.tick(dt);
          drawFlappy();
        }
        if (!choiceState || !choiceState.total) return;
        choiceState.left -= dt;
        el('choiceTimerFill').style.transform = 'scaleX(' + Math.max(0, choiceState.left / choiceState.total) + ')';
        if (choiceState.left <= 0) finishChoice('timeout');
      },
    };

    function finishChoice(id) {
      var s = choiceState;
      choiceState = null;
      el('choice').classList.add('hidden');
      s.resolve(id);
    }

    function drawFlappy() {
      var c = el('flappyCanvas');
      var g = c.getContext('2d');
      var s = flappy.state;
      g.fillStyle = '#16233f';
      g.fillRect(0, 0, 120, 180);
      g.fillStyle = '#2c3b22';
      g.fillRect(0, 172, 120, 8);
      s.pipes.forEach(function (p) {
        g.fillStyle = '#b8322a'; // fire hydrants, top and bottom
        g.fillRect(p.x - 8, 0, 16, p.gapY - flappy.GAP / 2);
        g.fillRect(p.x - 8, p.gapY + flappy.GAP / 2, 16, 180);
        g.fillStyle = '#e0e0d0';
        g.fillRect(p.x - 10, p.gapY - flappy.GAP / 2 - 4, 20, 4);
        g.fillRect(p.x - 10, p.gapY + flappy.GAP / 2, 20, 4);
      });
      var y = s.y;
      g.fillStyle = '#c9963f'; // Cooper
      g.fillRect(flappy.X - 7, y - 5, 14, 10);
      g.fillRect(flappy.X + 3, y - 9, 7, 7);
      g.fillStyle = '#3a2a1a';
      g.fillRect(flappy.X + 3, y - 10, 2, 4);
      g.fillRect(flappy.X + 9, y - 6, 2, 2);
      g.fillStyle = '#fff';
      g.font = '10px monospace';
      g.fillText(String(s.score), 56, 16);
      if (!flappy.started() || !s.alive) {
        g.font = '8px monospace';
        g.fillText(s.alive ? 'SPACE TO FLAP' : 'WOMP. BEST ' + flappy.best(), 22, 96);
      }
    }

    function renderHome() {
      el('phoneTasks').innerHTML = tasks
        .map(function (t) {
          return '<li class="' + (t.done ? 'done' : '') + '">' + (t.done ? '[x] ' : '[ ] ') + esc(t.label) + '</li>';
        })
        .join('') || '<li class="empty">Nothing on the list.</li>';
      var extras = '';
      if (collected) extras += '<div class="phone-line">Dave-isms found: ' + collected.n + ' / ' + collected.total + '</div>';
      if (shopping.length) extras += '<div class="phone-line">Shopping list: ' + esc(shopping.join(', ')) + '</div>';
      el('phoneExtras').innerHTML = extras;
      var html = '';
      ['dave', 'ethan', 'mom'].forEach(function (thread) {
        var list = messages.filter(function (m) { return m.thread === thread; });
        if (!list.length) return;
        html += '<div class="thread"><div class="who">' + { dave: 'Uncle Dave', ethan: 'Ethan', mom: 'Mom' }[thread] + '</div>';
        list.forEach(function (m) {
          html += '<div class="bubble ' + (m.mine ? 'mine' : '') + '">' + esc(m.text) + '</div>';
        });
        html += '</div>';
      });
      el('phoneMsgs').innerHTML = html || '<div class="empty">No messages.</div>';
      el('phoneMsgs').scrollTop = 1e6;
    }

    function render() {
      el('phoneApps').innerHTML = APPS.map(function (a, i) {
        return '<span class="' + (a === app ? 'on' : '') + '">' + (i + 1) + ' ' + APP_LABELS[a] + '</span>';
      }).join('');
      ['home', 'petcam', 'photos', 'flappy', 'music'].forEach(function (a) {
        el('app' + a.charAt(0).toUpperCase() + a.slice(1)).classList.toggle('hidden', a !== app);
      });
      var camera = app === 'camera' && api.isOpen;
      el('phone').classList.toggle('camera-mode', camera);
      el('viewfinder').classList.toggle('hidden', !camera);
      if (app === 'home') renderHome();
      if (app === 'photos') {
        el('photoGrid').innerHTML = photos.length
          ? photos.slice().reverse().map(function (p) { return '<figure><img src="' + p.url + '"><figcaption>' + esc(p.at) + '</figcaption></figure>'; }).join('')
          : '<div class="empty">No photos yet.</div>';
      }
      if (app === 'music') {
        var names = (OC.audio && OC.audio.tracks) || [];
        el('trackList').innerHTML = names.map(function (n, i) {
          return '<li class="' + (i === track ? 'on' : '') + '">' + (i === track ? '&#9654; ' : '') + esc(n) + '</li>';
        }).join('');
      }
      if (app === 'flappy' && flappy) drawFlappy();
    }

    window.addEventListener('keydown', function (e) {
      if (!ctl.locked) return;
      if (choiceState && /^Digit[1-9]$/.test(e.code)) {
        api.answer(Number(e.code.slice(5)));
        return;
      }
      if (e.code === 'Tab' && !e.repeat) {
        e.preventDefault();
        api.toggle();
        return;
      }
      if (!api.isOpen || e.repeat) return;
      if (/^Digit[1-6]$/.test(e.code)) api.app(APPS[Number(e.code.slice(5)) - 1]);
      else if (e.code === 'Space') {
        e.preventDefault();
        api.act();
      }
    });
    document.addEventListener('mousedown', function (e) {
      if (!ctl.locked || !api.isOpen || e.button !== 0) return;
      api.act();
    });

    return api;
  }

  OC.phone = { create: create, APPS: APPS };
})();
