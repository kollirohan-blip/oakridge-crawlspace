// Mason's phone: Tab opens it, and the game goes on while it is out (walk, look, use things with E).
// Apps: Home (the to-do list, Dave-isms, the shopping list), Texts (a chat for each person: the list,
// then the conversation), Camera (with flash), the Pet Cam, Photos, Flappy Cooper, Ethan's mixtape and
// Calls. While it is out, the mouse is a cursor on it (js/engine/cursor.js): point at an app, a chat, the
// back arrow, a link, a song or a name and click it; push the mouse off the phone and the view turns as
// usual. The camera puts the phone down: there the mouse looks and a click takes the photo. The keys
// still work: 1 to 8 switch apps (2 again goes back), Space or Enter does the picked thing, Backspace goes
// back, and the wheel scrolls (or moves the pick in a list). No instructions sit on the phone: each app
// says how it works once, the first time it is opened. It buzzes with a preview when a text comes in, and
// runs the choices (keys 1, 2, 3...) and the calls.
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
    messages: 'Click a chat to open it.',
    camera: 'Click to take a photo.',
    calls: 'Click a name to call.',
    flappy: 'Click to flap.',
    music: 'Click a song to play it.',
  };

  function el(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // the checkpoint mark: a cloud with a tick (Phase 8)
  var SAVED_ICON = '<svg class="saved-icon" viewBox="0 0 20 16" role="img" aria-label="Saved"><path d="M5.2 13.2h9.6a3.7 3.7 0 0 0 .5-7.4A5.2 5.2 0 0 0 5.4 6.3a3.5 3.5 0 0 0-.2 6.9z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7.4 9.3l1.9 1.8 3.5-3.7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  function create(ctl) {
    var savedTimer = null;
    var top = document.querySelector('#phone .phone-top');
    if (top && el('phoneBatt')) {
      var mark = document.createElement('span');
      mark.innerHTML = SAVED_ICON;
      top.insertBefore(mark, el('phoneBatt'));
    }
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
    // the cursor on the phone
    var cur = OC.cursor.create();
    var placed = false; // put on the phone since it last came out
    var cursorAt = { fx: 0.5, fy: 0.5 }; // where it was across the phone, for next time
    var hoverEl = null; // what it is over (an element with data-hit)
    var hoverKey = null; // which thing that is ('chat:dave'), so a re-render does not count as a new one
    var hoverDirty = false;

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
        forgetCursor();
        api.isOpen = false;
        el('phone').classList.add('hidden');
        el('viewfinder').classList.add('hidden');
        document.body.classList.remove('phone-open');
        drawCursor(null);
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
      // what the to-do list shows right now (the stall nudge reads it)
      tasks: function () {
        return tasks.slice();
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
        forgetCursor(); // the phone moves: the cursor goes back to the same spot on it
        el('phone').classList.toggle('raised', !!v);
        document.body.classList.toggle('phone-raised', !!v); // the HUD goes above the fade, for this
        drawCursor(phoneRect());
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
      // a checkpoint (Phase 8): a small cloud-and-tick for a few seconds, in the phone's status bar and
      // beside TAB PHONE, the way a phone shows a backup finishing. No words.
      saved: function () {
        document.body.classList.add('just-saved');
        clearTimeout(savedTimer);
        savedTimer = setTimeout(function () { document.body.classList.remove('just-saved'); }, 4500);
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
      // the cursor, for checks: is it showing, where it is drawn, is the mouse off the phone, what it is over
      cursor: function () {
        var r = phoneRect();
        var p = r ? OC.cursor.point(cur, r) : null;
        return { on: !!r, x: p ? p.x : null, y: p ? p.y : null, out: p ? p.out : true, hover: hoverKey };
      },
      update: function (dt) {
        if (hoverDirty) refreshHover();
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

    // ---- the cursor ---------------------------------------------------------------------------------
    // the phone on screen, or null when it is put away or down (the camera)
    function phoneRect() {
      if (!api.isOpen) return null;
      var r = el('phone').getBoundingClientRect();
      return r.width > 1 && r.height > 1 ? r : null;
    }
    function drawCursor(r) {
      if (r && !placed) {
        OC.cursor.place(cur, r, cursorAt.fx, cursorAt.fy);
        placed = true;
      }
      document.body.classList.toggle('phone-cursor', !!r);
      var c = el('phoneCursor');
      if (!r || !c) return;
      var p = OC.cursor.point(cur, r);
      c.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      c.classList.toggle('out', p.out);
    }
    // remember where it is on the phone (the phone is going away, or moving), and let go of what it is over
    function forgetCursor() {
      var r = phoneRect();
      if (r && placed) cursorAt = OC.cursor.where(cur, r);
      placed = false;
      if (hoverEl) hoverEl.classList.remove('hover');
      hoverEl = null;
      hoverKey = null;
    }
    // the mouse moved (the controller asks): the cursor takes what it can, the rest turns the view
    ctl.mouseFilter = function (dx, dy, abs) {
      var r = phoneRect();
      if (!r) return null; // put away, or the camera: the mouse looks
      if (!placed) drawCursor(r);
      var look = OC.cursor.move(cur, dx, dy, r, abs);
      drawCursor(r);
      hoverDirty = true;
      return look;
    };
    // what clickable thing on the phone is at this point (the top one there), or null
    function hitAt(x, y) {
      if (!document.elementsFromPoint) return null;
      var phoneEl = el('phone');
      var list = document.elementsFromPoint(x, y);
      for (var i = 0; i < list.length; i++) {
        if (phoneEl.contains(list[i])) return list[i] === phoneEl ? null : list[i].closest('[data-hit]');
      }
      return null;
    }
    function under() {
      var r = phoneRect();
      if (!r) return null;
      var p = OC.cursor.point(cur, r);
      return p.out ? null : hitAt(p.x, p.y);
    }
    function keyOf(n) {
      return n ? n.getAttribute('data-hit') + ':' + (n.getAttribute('data-arg') || '') : null;
    }
    // light up what the cursor is over; a chat or a name it moves onto becomes the pick (Space, Enter)
    function refreshHover() {
      hoverDirty = false;
      var n = under();
      if (hoverEl && hoverEl !== n) hoverEl.classList.remove('hover');
      hoverEl = n;
      if (n) n.classList.add('hover');
      var key = keyOf(n);
      if (key === hoverKey) return;
      hoverKey = key;
      if (!n) return;
      var kind = n.getAttribute('data-hit');
      var arg = n.getAttribute('data-arg');
      if (kind === 'chat') {
        var i = threads().indexOf(arg);
        if (i < 0 || i === chatSel) return;
        chatSel = i;
        var rows = el('phoneMsgs').querySelectorAll('.chat-row');
        for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('on', rows[k] === n);
      } else if (kind === 'contact' && Number(arg) !== picked) {
        picked = Number(arg);
        render();
      }
    }
    // a click on the thing under the cursor
    function use(n) {
      var kind = n.getAttribute('data-hit');
      var arg = n.getAttribute('data-arg');
      if (OC.audio) OC.audio.play('click', { gain: 0.3 });
      if (kind === 'app') api.app(arg);
      else if (kind === 'chat') api.openChat(arg);
      else if (kind === 'back') api.back();
      else if (kind === 'texts') api.app('messages');
      else if (kind === 'link') openLinkAt(Number(arg));
      else if (kind === 'song') {
        track = track === Number(arg) ? -1 : Number(arg); // the playing one again: stop
        if (api.onMusic) api.onMusic(track);
        render();
      } else if (kind === 'contact' && contacts[Number(arg)]) api.call(contacts[Number(arg)].id);
    }
    function click() {
      var r = phoneRect();
      if (!r) return api.act(); // the camera: the shutter
      var n = under();
      if (n) return use(n);
      if (app === 'flappy') api.act(); // Flappy flaps on any click
    }
    function openLinkAt(i) {
      var m = chat ? inThread(chat)[i] : null;
      if (!m || !m.link) return;
      m.link.opened = true;
      if (api.onLink) api.onLink(m.link);
      if (api.isOpen) render();
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
      if (unread) extras += '<div class="phone-line unread" data-hit="texts">' + unread + ' new text' + (unread > 1 ? 's' : '') + '</div>';
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
        el('msgHeader').removeAttribute('data-hit');
        list.forEach(function (th, i) {
          var msgs = inThread(th);
          var last = msgs[msgs.length - 1];
          var n = unreadIn(th);
          var preview = (last.mine ? 'You: ' : '') + (last.link && !last.mine ? last.link.title : last.text);
          html += '<div class="chat-row' + (i === chatSel ? ' on' : '') + (n ? ' unread' : '') + '" data-hit="chat" data-arg="' + esc(th) + '">' + avatar(th) +
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
      el('msgHeader').setAttribute('data-hit', 'back'); // the whole top line goes back, not just the arrow
      var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
      var lastTime = null;
      inThread(chat).forEach(function (m, i) {
        if (m.time && m.time !== lastTime) {
          html += '<div class="when">' + esc(m.time) + '</div>';
          lastTime = m.time;
        }
        var fresh = i >= (freshFrom[chat] || 0) && !m.mine ? ' fresh' : '';
        html += '<div class="bubble ' + (m.mine ? 'mine' : '') + fresh + '">' + esc(m.text) + '</div>';
        if (m.link) html += '<div class="bubble link' + (m.link.opened ? ' opened' : '') + '" data-hit="link" data-arg="' + i + '">&#128279; ' + esc(m.link.title) + '</div>';
      });
      box.innerHTML = html;
      if (atBottom) box.scrollTop = 1e6;
    }

    function render() {
      var unread = api.unread();
      el('phoneApps').innerHTML = APPS.map(function (a, i) {
        var badge = a === 'messages' && unread ? ' <b class="badge">' + unread + '</b>' : '';
        return '<span class="' + (a === app ? 'on' : '') + '" data-hit="app" data-arg="' + a + '">' + (i + 1) + ' ' + APP_LABELS[a] + badge + '</span>';
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
          return '<li class="' + (i === track ? 'on' : '') + '" data-hit="song" data-arg="' + i + '">' + (i === track ? '&#9654; ' : '') + esc(n) + '</li>';
        }).join('');
      }
      if (app === 'flappy' && flappy) drawFlappy();
      if (app === 'calls') {
        el('contactList').innerHTML = contacts.length
          ? contacts.map(function (c, i) { return '<li class="' + (i === picked ? 'on' : '') + '" data-hit="contact" data-arg="' + i + '">' + (i === picked ? '&#9654; ' : '') + esc(c.name) + '</li>'; }).join('')
          : '<li class="empty">No one to call.</li>';
      }
      drawCursor(phoneRect()); // the camera puts the phone down, every other app brings it back
      refreshHover(); // what is under the cursor was just redrawn
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
    // a click does what is under the cursor
    document.addEventListener('mousedown', function (e) {
      if (!ctl.locked || !api.isOpen || e.button !== 0) return;
      var r = phoneRect();
      if (r && e.isTrusted && !ctl.captured()) {
        // a real pointer the browser is not holding: it is where it is
        if (!placed) drawCursor(r);
        OC.cursor.move(cur, 0, 0, r, { x: e.clientX, y: e.clientY });
        drawCursor(r);
      }
      click();
    });
    // the mouse wheel scrolls the open app (the pointer is locked, so nothing else would)
    document.addEventListener('wheel', function (e) {
      if (!ctl.locked || !api.isOpen) return;
      api.scroll(e.deltaY * (e.deltaMode === 1 ? 18 : 0.7));
      hoverDirty = true; // something else may be under the cursor now
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (api.isOpen) drawCursor(phoneRect());
    });
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
      h.innerHTML = '<b>TAB</b> PHONE' + (n ? ' <span class="badge">' + n + ' NEW</span>' : '') + SAVED_ICON;
    }
    updateHint();

    return api;
  }

  OC.phone = { create: create, APPS: APPS };
})();
