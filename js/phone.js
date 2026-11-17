// Mason's phone: Tab opens it, and the game goes on while it is out (walk, look, use things with E).
// Apps, switched with keys 1 to 8 while it is open: Home (the to-do list, Dave-isms, the shopping list),
// Texts (every message, and links to open), Camera (with flash), the Pet Cam, Photos, Flappy Cooper,
// Ethan's mixtape and Calls. The mouse wheel scrolls whatever app is open. It buzzes with a preview
// when a text comes in, and runs the choices (keys 1, 2, 3...) and the calls.
(function () {
  var OC = (window.OC = window.OC || {});
  var APPS = ['home', 'messages', 'camera', 'petcam', 'photos', 'flappy', 'music', 'calls'];
  var APP_LABELS = { home: 'Home', messages: 'Texts', camera: 'Camera', petcam: 'Pet Cam', photos: 'Photos', flappy: 'Flappy', music: 'Mixtape', calls: 'Calls' };
  // what the mouse wheel scrolls in each app
  var SCROLLS = { home: 'appHome', messages: 'phoneMsgs', photos: 'photoGrid', music: 'trackList', calls: 'contactList' };

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
    var contacts = []; // { id, name }
    var readCount = 0; // texts read (seen in the Texts app)
    var readCountAtOpen = 0; // where the new ones started when the Texts app was opened
    var picked = 0;

    var api = {
      isOpen: false,
      enabled: true,
      onShoot: null, // set by main: takes a photo, returns it
      onMusic: null, // set by main: (trackIndex | -1)
      onApp: null, // (name) when the app changes
      onCall: null, // (contactId) when Mason calls someone from the Calls app
      onLink: null, // ({ title, body }) when Mason opens a link someone texted
      onCallsChange: null,
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
        if (name === 'messages') {
          readCountAtOpen = readCount;
          readCount = messages.length;
        }
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
      // a count shown on Home (label defaults to Dave-isms); pass null to hide it
      setCollected: function (n, total, label) {
        collected = n === null ? null : { n: n, total: total, label: label || 'Dave-isms found' };
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
        document.body.classList.toggle('phone-raised', !!v); // the HUD goes above the fade, for this
      },
      stopMusic: function () {
        if (track >= 0) {
          track = -1;
          if (api.onMusic) api.onMusic(-1);
          if (api.isOpen) render();
        }
      },
      // who is in the Calls app
      setContacts: function (list) {
        contacts = list.slice();
        picked = Math.min(picked, Math.max(0, contacts.length - 1));
        if (api.isOpen) render();
      },
      contacts: function () {
        return contacts.slice();
      },
      // call the contact picked in the Calls app (Enter), or a contact by id
      call: function (id) {
        var c = id ? contacts.filter(function (x) { return x.id === id; })[0] : contacts[picked];
        if (!c || !api.onCall) return false;
        api.onCall(c.id);
        return true;
      },
      // the newest link anyone texted, opened (Space on Home)
      openLink: function () {
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].link) {
            messages[i].link.opened = true;
            if (api.onLink) api.onLink(messages[i].link);
            if (api.isOpen) render();
            return messages[i].link;
          }
        }
        return null;
      },
      // a text arriving from someone else (link: { title, body } makes it a link Mason can open)
      deliver: function (thread, from, text, link) {
        messages.push({ thread: thread, from: from, text: text, mine: false, time: time, link: link || null });
        if (api.isOpen && app === 'messages') readCount = messages.length;
        updateHint();
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
        if (readCount === messages.length - 1) readCount = messages.length; // your own text is read
        updateHint();
        if (api.isOpen) render();
      },
      messages: function () {
        return messages.slice();
      },
      unread: function () {
        return Math.max(0, messages.length - readCount);
      },
      // scroll the open app (the mouse wheel)
      scroll: function (dy) {
        var box = SCROLLS[app] && el(SCROLLS[app]);
        if (box) box.scrollTop += dy;
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
      // take the open choice away (the scene it belonged to ended)
      cancelChoice: function () {
        if (choiceState) finishChoice('cancel');
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
        else if (app === 'messages' || app === 'home') api.openLink();
        else if (app === 'calls' && contacts.length) {
          picked = (picked + 1) % contacts.length;
          render();
        }
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
      if (collected) extras += '<div class="phone-line">' + esc(collected.label) + ': ' + collected.n + ' / ' + collected.total + '</div>';
      if (shopping.length) extras += '<div class="phone-line">Shopping list: ' + esc(shopping.join(', ')) + '</div>';
      var unread = api.unread();
      if (messages.length) extras += '<div class="phone-line' + (unread ? ' unread' : '') + '">' + (unread ? unread + ' new text' + (unread > 1 ? 's' : '') : 'Texts') + ': press 2</div>';
      el('phoneExtras').innerHTML = extras;
    }

    function renderMessages() {
      var box = el('phoneMsgs');
      var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
      var html = '';
      var hasLink = false;
      // in the order they came, like a chat; a name over each run of messages from the same person
      var NAMES = { dave: 'Uncle Dave', ethan: 'Ethan', mom: 'Mom' };
      var last = null;
      messages.forEach(function (m, i) {
        var who = m.mine ? 'You to ' + (NAMES[m.thread] || m.thread) : m.from || NAMES[m.thread] || m.thread;
        if (who !== last) {
          html += '<div class="who' + (m.mine ? ' mine' : '') + '">' + esc(who) + (m.time ? ' <span class="when">' + esc(m.time) + '</span>' : '') + '</div>';
          last = who;
        }
        var fresh = i >= readCountAtOpen ? ' fresh' : '';
        html += '<div class="bubble ' + (m.mine ? 'mine' : '') + fresh + '">' + esc(m.text) + '</div>';
        if (m.link) {
          hasLink = true;
          html += '<div class="bubble link' + (m.link.opened ? ' opened' : '') + '">' + esc(m.link.title) + '</div>';
        }
      });
      if (hasLink) html += '<div class="phone-small">Space: open the newest link.</div>';
      box.innerHTML = html || '<div class="empty">No messages.</div>';
      if (atBottom || !renderMessages.done) box.scrollTop = 1e6;
      renderMessages.done = true;
    }

    function render() {
      var unread = api.unread();
      el('phoneApps').innerHTML = APPS.map(function (a, i) {
        var badge = a === 'messages' && unread ? ' <b class="badge">' + unread + '</b>' : '';
        return '<span class="' + (a === app ? 'on' : '') + '">' + (i + 1) + ' ' + APP_LABELS[a] + badge + '</span>';
      }).join('');
      ['home', 'messages', 'petcam', 'photos', 'flappy', 'music', 'calls'].forEach(function (a) {
        el('app' + a.charAt(0).toUpperCase() + a.slice(1)).classList.toggle('hidden', a !== app);
      });
      var camera = app === 'camera' && api.isOpen;
      el('phone').classList.toggle('camera-mode', camera);
      el('viewfinder').classList.toggle('hidden', !camera);
      if (app === 'home') renderHome();
      if (app === 'messages') renderMessages();
      updateHint();
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
      if (app === 'calls') {
        el('contactList').innerHTML = contacts.length
          ? contacts.map(function (c, i) { return '<li class="' + (i === picked ? 'on' : '') + '">' + (i === picked ? '&#9654; ' : '') + esc(c.name) + '</li>'; }).join('')
          : '<li class="empty">No one to call.</li>';
      }
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
      if (/^Digit[1-8]$/.test(e.code)) api.app(APPS[Number(e.code.slice(5)) - 1]);
      else if (e.code === 'Enter' && app === 'calls') {
        e.preventDefault();
        api.call();
      }
      else if (e.code === 'Space') {
        e.preventDefault();
        api.act();
      }
    });
    document.addEventListener('mousedown', function (e) {
      if (!ctl.locked || !api.isOpen || e.button !== 0) return;
      api.act();
    });
    // the mouse wheel scrolls the open app (the pointer is locked, so nothing else would)
    document.addEventListener('wheel', function (e) {
      if (!ctl.locked || !api.isOpen) return;
      api.scroll(e.deltaY * (e.deltaMode === 1 ? 18 : 0.7));
    }, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (!ctl.locked || !api.isOpen) return;
      if (e.code === 'PageDown') api.scroll(120);
      else if (e.code === 'PageUp') api.scroll(-120);
    });

    // the controls by the light meter, with the count of unread texts
    function updateHint() {
      var h = el('phoneHint');
      if (!h) return;
      var n = api.unread();
      h.innerHTML = '<b>TAB</b> PHONE' + (n ? ' <span class="badge">' + n + ' NEW</span>' : '');
    }
    updateHint();

    return api;
  }

  OC.phone = { create: create, APPS: APPS };
})();
