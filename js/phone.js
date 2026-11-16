// Mason's phone: Tab opens it. It holds the to-do list and the texts from Uncle Dave and Ethan,
// buzzes with a preview when a text comes in, and runs the timed choice and the call in Act 3.
(function () {
  var OC = (window.OC = window.OC || {});

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

    var api = {
      isOpen: false,
      enabled: true,
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
        document.body.classList.remove('phone-open');
      },
      toggle: function () {
        if (api.isOpen) api.close();
        else api.open();
      },
      setTasks: function (list) {
        tasks = list.slice();
        if (api.isOpen) render();
      },
      setTime: function (label) {
        time = label;
        el('phoneTime').textContent = label;
      },
      setBattery: function (frac) {
        el('phoneBatt').textContent = Math.max(0, Math.round(frac * 100)) + '%';
      },
      // a text arriving from someone else
      deliver: function (thread, from, text) {
        messages.push({ thread: thread, from: from, text: text, mine: false, time: time });
        if (OC.audio) OC.audio.play('buzz', { gain: 0.8 });
        var n = el('notif');
        n.innerHTML = '<b>' + esc(from) + '</b> ' + esc(text.length > 70 ? text.slice(0, 68) + '...' : text);
        n.classList.add('on');
        clearTimeout(notifTimer);
        notifTimer = setTimeout(function () { n.classList.remove('on'); }, 5200);
        if (api.isOpen) render();
      },
      // a text Mason sends
      send: function (thread, text) {
        messages.push({ thread: thread, from: 'Mason', text: text, mine: true, time: time });
        if (api.isOpen) render();
      },
      messages: function () {
        return messages.slice();
      },
      // a timed choice: resolves with the chosen option's id, or 'timeout'. Keys 1, 2, 3.
      choice: function (opts) {
        return new Promise(function (resolve) {
          var box = el('choice');
          el('choicePrompt').textContent = opts.prompt || '';
          el('choiceOpts').innerHTML = opts.options
            .map(function (o, i) {
              return '<div class="opt"><span class="key">' + (i + 1) + '</span>' + esc(o.text) + '</div>';
            })
            .join('');
          box.classList.remove('hidden');
          choiceState = { opts: opts, left: opts.seconds, total: opts.seconds, resolve: resolve };
        });
      },
      choosing: function () {
        return !!choiceState;
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
      update: function (dt) {
        if (!choiceState) return;
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

    function render() {
      el('phoneTasks').innerHTML = tasks
        .map(function (t) {
          return '<li class="' + (t.done ? 'done' : '') + '">' + (t.done ? '[x] ' : '[ ] ') + esc(t.label) + '</li>';
        })
        .join('') || '<li class="empty">Nothing on the list.</li>';
      var html = '';
      ['dave', 'ethan'].forEach(function (thread) {
        var list = messages.filter(function (m) { return m.thread === thread; });
        if (!list.length) return;
        html += '<div class="thread"><div class="who">' + (thread === 'dave' ? 'Uncle Dave' : 'Ethan') + '</div>';
        list.forEach(function (m) {
          html += '<div class="bubble ' + (m.mine ? 'mine' : '') + '">' + esc(m.text) + '</div>';
        });
        html += '</div>';
      });
      el('phoneMsgs').innerHTML = html || '<div class="empty">No messages.</div>';
      el('phoneMsgs').scrollTop = 1e6;
    }

    window.addEventListener('keydown', function (e) {
      if (!ctl.locked) return;
      if (choiceState && /^Digit[1-9]$/.test(e.code)) {
        var i = Number(e.code.slice(5)) - 1;
        if (i < choiceState.opts.options.length) finishChoice(choiceState.opts.options[i].id);
        return;
      }
      if (e.code === 'Tab' && !e.repeat) {
        e.preventDefault();
        api.toggle();
      }
    });

    return api;
  }

  OC.phone = { create: create };
})();
