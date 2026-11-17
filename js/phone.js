// Mason's phone: Tab opens it, and the game goes on while it is out (walk, look, use things with E).
// Apps, switched with keys 1 to 8 while it is open: Home (the to-do list, Dave-isms, the shopping list),
// Texts (a chat for each person: the list, then the conversation; 2 again goes back), Camera (with
// flash), the Pet Cam, Photos, Flappy Cooper, Ethan's mixtape and Calls. The mouse wheel scrolls, or
// picks in a list; a click (or Space, or Enter) opens or does the app's thing. No instructions sit on
// the phone: each app says how it works once, the first time it is opened. It buzzes with a preview
// when a text comes in, and runs the choices (keys 1, 2, 3...) and the calls.
(function () {
  var OC = (window.OC = window.OC || {});
  var APPS = ['home', 'messages', 'camera', 'petcam', 'photos', 'flappy', 'music', 'calls'];
  var APP_LABELS = { home: 'Home', messages: 'Texts', camera: 'Camera', petcam: 'Pet Cam', photos: 'Photos', flappy: 'Flappy', music: 'Mixtape', calls: 'Calls' };
  // what the mouse wheel scrolls in each app
  var SCROLLS = { home: 'appHome', messages: 'phoneMsgs', photos: 'photoGrid', music: 'trackList', calls: 'contactList' };
  var NAMES = { dave: 'Uncle Dave', ethan: 'Ethan', mom: 'Mom' };
  var COLORS = { dave: '#d9a01a', ethan: '#6ab0ff', mom: '#e88aa8' };
  // said once, the first time each app is opened (nothing stays written on the phone)
  var TIPS = {
    messages: 'Scroll to pick, click to open. 2 goes back.',
    camera: 'Click to take a photo.',
    calls: 'Scroll to pick, click to call.',
    flappy: 'Click to flap.',
    music: 'Click for the next track.',
  };

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
    var readBy = {}; // thread -> how many of its messages have been seen
    var freshFrom = {}; // thread -> where the new ones started when the chat was opened
    var chat = null; // the open conversation's thread, or null for the chat list
    var chatSel = 0; // the picked row in the chat list
    var tipped = {};
    var wheelAcc = 0;
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
        if (name === 'messages' && app === 'messages' && chat) chat = null; // 2 again: back to the chats
        else if (name !== app && name === 'messages') chat = null;
        app = name;
        if (api.isOpen && TIPS[name] && !tipped[name] && OC.hud) {
          tipped[name] = true;
          OC.hud.toast(TIPS[name], 3800);
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
      // the chats: open one (by thread, or the picked row), go back to the list, which is open
      openChat: function (thread) {
        var list = threads();
        thread = thread || list[chatSel];
        if (!thread) return false;
        chat = thread;
        chatSel = Math.max(0, list.indexOf(thread));
        freshFrom[thread] = readBy[thread] || 0;
        readBy[thread] = inThread(thread).length;
        updateHint();
        if (api.isOpen) render();
        el('phoneMsgs').scrollTop = 1e6;
        return true;
      },
      back: function () {
        chat = null;
        if (api.isOpen) render();
      },
      openThread: function () {
        return chat;
      },
      threads: function () {
        return threads();
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
        if (api.isOpen && app === 'messages' && chat === thread) readBy[thread] = inThread(thread).length;
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
        if (api.isOpen && app === 'messages' && chat === thread) readBy[thread] = inThread(thread).length;
        updateHint();
        if (api.isOpen) render();
      },
      messages: function () {
        return messages.slice();
      },
      unread: function (thread) {
        if (thread) return unreadIn(thread);
        return threads().reduce(function (n, th) { return n + unreadIn(th); }, 0);
      },
      // the mouse wheel: scrolls, or in a list (the chats, the contacts) moves the pick
      scroll: function (dy) {
        if ((app === 'messages' && !chat) || app === 'calls') {
          wheelAcc += dy;
          var steps = 0;
          while (wheelAcc >= 60) { wheelAcc -= 60; steps++; }
          while (wheelAcc <= -60) { wheelAcc += 60; steps--; }
          if (!steps) return;
          if (app === 'calls' && contacts.length) picked = Math.max(0, Math.min(contacts.length - 1, picked + steps));
          else chatSel = Math.max(0, Math.min(threads().length - 1, chatSel + steps));
          render();
          return;
        }
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
        else if (app === 'messages') {
          if (!chat) api.openChat();
          else openLinkIn(chat);
        } else if (app === 'calls' && contacts.length) api.call();
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

    function inThread(th) {
      return messages.filter(function (m) { return m.thread === th; });
    }
    function unreadIn(th) {
      var list = inThread(th);
      var n = 0;
      for (var i = readBy[th] || 0; i < list.length; i++) if (!list[i].mine) n++;
      return n;
    }
    // the threads, the one with the newest message first
    function threads() {
      var order = [];
      for (var i = messages.length - 1; i >= 0; i--) if (order.indexOf(messages[i].thread) < 0) order.push(messages[i].thread);
      return order;
    }
    function nameOf(th) {
      return NAMES[th] || th.charAt(0).toUpperCase() + th.slice(1);
    }
    function openLinkIn(th) {
      var list = inThread(th);
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i].link) {
          list[i].link.opened = true;
          if (api.onLink) api.onLink(list[i].link);
          if (api.isOpen) render();
          return list[i].link;
        }
      }
      return null;
    }

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
      if (unread) extras += '<div class="phone-line unread">' + unread + ' new text' + (unread > 1 ? 's' : '') + '</div>';
      el('phoneExtras').innerHTML = extras;
    }

    function avatar(th) {
      return '<span class="chat-avatar" style="background:' + (COLORS[th] || '#8a909a') + '">' + esc(nameOf(th).replace('Uncle ', '').charAt(0)) + '</span>';
    }
    function renderMessages() {
      var box = el('phoneMsgs');
      var html = '';
      if (!chat) {
        // the chat list
        var list = threads();
        chatSel = Math.max(0, Math.min(chatSel, list.length - 1));
        el('msgHeader').innerHTML = 'TEXTS';
        list.forEach(function (th, i) {
          var msgs = inThread(th);
          var last = msgs[msgs.length - 1];
          var n = unreadIn(th);
          var preview = (last.mine ? 'You: ' : '') + (last.link && !last.mine ? last.link.title : last.text);
          html += '<div class="chat-row' + (i === chatSel ? ' on' : '') + (n ? ' unread' : '') + '">' + avatar(th) +
            '<div class="chat-main"><div class="chat-top"><span class="chat-name">' + esc(nameOf(th)) + '</span><span class="chat-time">' + esc(last.time || '') + '</span></div>' +
            '<div class="chat-preview">' + esc(preview) + '</div></div>' + (n ? '<b class="badge">' + n + '</b>' : '') + '</div>';
        });
        box.innerHTML = html || '<div class="empty">No messages.</div>';
        var row = box.querySelector('.chat-row.on');
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
        return;
      }
      // one conversation
      el('msgHeader').innerHTML = '<span class="back">&#8249;</span>' + avatar(chat) + ' ' + esc(nameOf(chat));
      var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
      var lastTime = null;
      inThread(chat).forEach(function (m, i) {
        if (m.time && m.time !== lastTime) {
          html += '<div class="when">' + esc(m.time) + '</div>';
          lastTime = m.time;
        }
        var fresh = i >= (freshFrom[chat] || 0) && !m.mine ? ' fresh' : '';
        html += '<div class="bubble ' + (m.mine ? 'mine' : '') + fresh + '">' + esc(m.text) + '</div>';
        if (m.link) html += '<div class="bubble link' + (m.link.opened ? ' opened' : '') + '">&#128279; ' + esc(m.link.title) + '</div>';
      });
      box.innerHTML = html;
      if (atBottom) box.scrollTop = 1e6;
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
      else if (e.code === 'Enter' && (app === 'calls' || (app === 'messages' && !chat))) {
        e.preventDefault();
        api.act();
      } else if (e.code === 'Backspace' && app === 'messages' && chat) {
        e.preventDefault();
        api.back();
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
