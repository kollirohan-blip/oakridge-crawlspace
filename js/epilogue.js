// The epilogue, "What Can Be Proven?" Dawn on the porch steps with Cooper, a cruiser's lights in the
// drive, and whatever evidence is on Mason's phone. Then the VHS cards: what police found under the
// house, the notebook read out with his real habits and the real time the player pressed play, the
// news, Dave and the cashier, and the verdict, which js/engine/evidence.js reads from the habit log.
// Then the house in daylight, and a new note on the fridge in "Dave's" hand. Credits, and the hum.
// The Tupperware and the closet endings are short cards of their own. Everything runs on dt (no
// timers), so OC.debug.advance can play it through.
(function () {
  var OC = (window.OC = window.OC || {});
  var GAG = ['gag.1', 'gag.2', 'gag.3'];
  var BAD = ['bad.1', 'bad.2', 'bad.3'];
  var CREDITS = ['epilogue.credit', 'ep.credit.models', 'ep.credit.kits', 'ep.credit.tech', 'ep.credit.sound', 'ep.credit.thanks'];
  var CREDIT_SUB = { 'ep.credit.kits': true, 'ep.credit.sound': true }; // small lines that sit under the one before
  var TEXT = GAG.concat(BAD, CREDITS, [
    'epilogue.vo', 'epilogue.title', 'gag.title', 'bad.title',
    'ep.stamp', 'ep.stamp.later', 'ep.porch.1', 'ep.porch.ray', 'ep.porch.phone', 'ep.porch.nothing', 'ep.card.head', 'ep.card.photoWes',
    'ep.card.photoEye', 'ep.card.notebookTook', 'ep.card.notebookPhoto', 'ep.card.photoNest', 'ep.card.clip',
    'ep.card.prints', 'ep.card.poster', 'ep.card.face', 'ep.card.none', 'ep.found.1', 'ep.found.2', 'ep.found.little.1',
    'ep.found.little.2', 'ep.found.counted', 'ep.book.found', 'ep.book.took', 'ep.book.title', 'ep.book.last',
    'ep.book.plan', 'ep.news.tag', 'ep.news.head', 'ep.news.line', 'ep.news.strong', 'ep.news.ticker', 'ep.dave',
    'ep.cashier', 'ep.cashier.shopper', 'ep.strong.1', 'ep.strong.2', 'ep.partial.1', 'ep.partial.2', 'ep.little.1',
    'ep.little.2', 'ep.plan', 'ep.deputy', 'ep.cooper', 'ep.house', 'ep.house.charger', 'ep.fridge', 'ep.fridge.vo',
    'ep.again',
  ]);
  var SUBJECT = { photoWes: 'wesShoulder', photoEye: 'eye', photoNest: 'nest' }; // which album photo shows each
  var PARK = { x: 10, z: -16 }; // the cruiser, behind Mason's car, as on day two
  var SEAT = { x: 2.5, z: -2.05 }; // the top porch step
  var NOTE = { x: 12.56, y: 1.27, z: 0.873 }; // stuck over the bottom of Dave's own note on the fridge door
  var LINE = 5.4; // seconds a card line stays before the next

  function el(id) {
    return document.getElementById(id);
  }

  // scenery made once and kept on g.cache (day two may have made the cruiser and Ray already)
  function policeCar(g) {
    g.cache = g.cache || {};
    if (g.cache.policeCar) return g.cache.policeCar;
    var grp = new THREE.Group();
    if (OC.models && OC.models.has('car-police')) {
      var inst = OC.models.instance('car-police');
      OC.models.fitObject(inst, 'car-police', [-0.95, 0, -2.2, 0.95, 1.65, 2.2], 0);
      grp.add(inst);
    } else {
      var m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 4.3), new THREE.MeshPhongMaterial({ color: 0x1d2433, specular: 0 }));
      m.position.y = 0.65;
      grp.add(m);
    }
    g.render.scene.add(grp);
    g.cache.policeCar = grp;
    return grp;
  }
  function deputy(g) {
    g.cache = g.cache || {};
    if (!g.cache.ray && OC.person && OC.day2 && OC.day2.deputy) g.cache.ray = OC.person.create(g.render.scene, OC.day2.deputy.RAY_LOOK);
    return g.cache.ray || null;
  }
  // the note Dave did not write: a sticky note in his round capitals
  function fridgeNote(g, text) {
    g.cache = g.cache || {};
    if (g.cache.fridgeNote) return g.cache.fridgeNote;
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#efe7a8';
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(120,100,20,0.10)';
    x.fillRect(0, 0, 256, 40); // the sticky strip
    x.fillStyle = '#1f2a4a';
    x.font = '46px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var words = text.split(' ');
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var next = cur ? cur + ' ' + w : w;
      if (x.measureText(next).width > 220 && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    });
    if (cur) lines.push(cur);
    lines.forEach(function (l, i) {
      x.fillText(l, 128, 140 + (i - (lines.length - 1) / 2) * 58);
    });
    var tex = new THREE.CanvasTexture(c);
    var m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), new THREE.MeshPhongMaterial({ map: tex, specular: 0 }));
    m.position.set(NOTE.x, NOTE.y, NOTE.z);
    m.rotation.z = -0.06;
    m.visible = false;
    g.render.scene.add(m);
    g.cache.fridgeNote = m;
    return m;
  }

  function create(g, opts) {
    var variant = (opts && opts.variant) || 'main';
    var t = g.t;
    var hud = g.hud;
    var ctl = g.ctl;
    var cooper = g.cooper;
    var world = g.world;
    var r3 = g.render;
    var root = el('epilogue');
    var body = el('epilogueLines');
    var board = el('evidence');
    var lights = world.lightById || {};
    var yard = lights.yard;
    var yardWas = yard ? { pos: yard.position.clone(), color: yard.color.getHex(), intensity: yard.intensity, distance: yard.distance } : null;
    var kitchenWas = lights.kitchen ? lights.kitchen.intensity : null;
    var entries = g.habits ? g.habits.entries() : [];
    var res = OC.evidence.resolveEnding(entries);
    var shown = []; // every line put on screen, in order (for checks)
    var stage = 'start';
    var queue = [];
    var wait = 0;
    var bar = false; // the cruiser's light bar (the yard light, borrowed)
    var barT = 0;
    var car = null;
    var ray = null;
    var note = null;
    var hum = null;
    var onKey = null;

    g.state.cutscene = true;
    hud.setCrosshair(false);
    if (g.phone && g.phone.isOpen) g.phone.close();
    if (g.drone && g.drone.setTension) g.drone.setTension(0.1);
    ctl.light.on = false;
    board.classList.remove('on');
    body.innerHTML = '';
    root.classList.add('on');
    hud.fadeIn();

    // ---- the screen ---------------------------------------------------------------------------------
    function black(on) {
      root.classList.toggle('on', on);
    }
    function clear() {
      body.innerHTML = '';
    }
    function add(text, cls, parent) {
      var d = document.createElement('div');
      d.className = 'ep-' + cls;
      d.textContent = text;
      (parent || body).appendChild(d);
      shown.push(text);
      return d;
    }
    function card(id, cls) {
      return function () {
        add(t(id), cls || 'line');
        return LINE;
      };
    }
    function vo(text, ms) {
      hud.say(text, ms);
      shown.push(text);
    }
    function fadeOut() {
      hud.fadeOut('');
      return 1.4;
    }
    function restoreYard() {
      bar = false;
      if (!yard || !yardWas) return;
      yard.position.copy(yardWas.pos);
      yard.color.setHex(yardWas.color);
      yard.intensity = yardWas.intensity;
      yard.distance = yardWas.distance;
    }
    function hideScenery() {
      if (car) car.visible = false;
      if (ray) ray.show(false);
      if (note) note.visible = false;
      board.classList.remove('on');
      restoreYard();
    }

    // ---- 1. dawn, the porch steps -------------------------------------------------------------------
    function porch() {
      stage = 'porch';
      black(false);
      clear();
      world.setDaylight(0.3, r3.renderer);
      if (lights.porch) {
        lights.porch.color.setHex(0xffd9a0);
        lights.porch.intensity = 0.7;
      }
      car = policeCar(g);
      car.visible = true;
      car.position.set(PARK.x, 0, PARK.z);
      car.rotation.set(0, 0, 0);
      if (yard) {
        yard.position.set(PARK.x, 1.95, PARK.z + 0.4);
        yard.distance = 14;
        yard.intensity = 1.3;
        bar = true;
      }
      ray = deputy(g);
      if (ray) {
        ray.lift = 0;
        if (res.ray) {
          ray.setPos(5.3, -5.9); // he stayed with Mason
          ray.faceTo(SEAT.x, SEAT.z);
        } else {
          ray.setPos(PARK.x - 1.7, PARK.z + 1.5); // at the cruiser, on the radio
          ray.faceTo(4, 0);
        }
        ray.show(true);
        ray.update(0.001);
      }
      cooper.stay();
      cooper.setPos(2.92, -4.93); // lying in the grass below the steps, watching him
      cooper.pose('lie');
      cooper.headTo({ x: SEAT.x, y: 0.95, z: SEAT.z });
      cooper.wag(0.12, 0.5);
      ctl.seat(SEAT.x, SEAT.z, -0.42, -0.72);
      ctl.pitch = -0.06;
      hud.fadeIn();
      return 1.6;
    }
    // the evidence: what is on Mason's phone, as cards beside the picture
    function evidenceCards() {
      var list = [];
      var album = (g.photo && g.photo.album) || [];
      function photoOf(subject) {
        for (var i = album.length - 1; i >= 0; i--) if (album[i].subject === subject) return album[i];
        return null;
      }
      res.key.forEach(function (id) {
        var textId = id === 'notebook' ? (res.notebook === 'took' ? 'ep.card.notebookTook' : 'ep.card.notebookPhoto') : 'ep.card.' + id;
        var p = SUBJECT[id] ? photoOf(SUBJECT[id]) : null;
        list.push({ text: t(textId), img: p ? p.url : null, dim: false });
      });
      res.support.forEach(function (id) {
        list.push({ text: t('ep.card.' + id), img: null, dim: true });
      });
      if (!list.length) list.push({ text: t('ep.card.none'), img: null, dim: true });
      return list;
    }
    function showBoard() {
      board.innerHTML = '';
      add(t('ep.card.head'), 'head', board).className = 'ev-head';
      board.classList.add('on');
    }
    function addCard(c) {
      return function () {
        var d = document.createElement('div');
        d.className = 'ev-card' + (c.dim ? ' dim' : '') + (c.img ? ' has-img' : '');
        if (c.img) {
          var im = document.createElement('img');
          im.src = c.img;
          im.alt = '';
          d.appendChild(im);
        }
        var s = document.createElement('div');
        s.className = 'ev-text';
        s.textContent = c.text;
        d.appendChild(s);
        board.appendChild(d);
        shown.push(c.text);
        return 1.3;
      };
    }

    // ---- 2-6. the tape ------------------------------------------------------------------------------
    function toTape() {
      hideScenery();
      black(true);
      clear();
      hud.fadeIn();
      stage = 'found';
      return 1.2;
    }
    function notebook() {
      var readout = OC.evidence.notebookReadout(entries, g.began ? g.began() : null, 7);
      var steps = [
        function () {
          stage = 'notebook';
          clear();
          add(t(res.notebook === 'took' ? 'ep.book.took' : 'ep.book.found'), 'line');
          return 4.8;
        },
      ];
      var paper = null;
      steps.push(function () {
        clear();
        paper = document.createElement('div');
        paper.className = 'ep-paper';
        body.appendChild(paper);
        add(t('ep.book.title'), 'paper-title', paper);
        return 1.0;
      });
      readout.lines.forEach(function (l) {
        steps.push(function () {
          add(l, 'paper-line', paper);
          return 1.5;
        });
      });
      if (readout.last) {
        steps.push(function () { return 1.4; });
        steps.push(function () {
          add(readout.last + '. ' + t('ep.book.last'), 'paper-last', paper);
          return 6.5;
        });
      } else steps.push(function () { return 3; });
      steps.push(function () {
        clear();
        add(t('ep.book.plan'), 'line');
        return LINE;
      });
      return steps;
    }
    function news() {
      stage = 'news';
      clear();
      var box = document.createElement('div');
      box.className = 'ep-news';
      body.appendChild(box);
      add(t('ep.news.tag'), 'news-tag', box);
      add(t('ep.news.head'), 'news-head', box);
      add(t(res.tier === 'strong' ? 'ep.news.strong' : 'ep.news.line'), 'news-line', box);
      var tick = add('', 'news-ticker', box);
      var span = document.createElement('span');
      span.textContent = t('ep.news.ticker') + t('ep.news.ticker');
      tick.appendChild(span);
      return 9;
    }
    function verdict() {
      stage = 'verdict';
      clear();
      if (g.unlock) g.unlock(OC.evidence.endingMarks(res));
      return 0.6;
    }

    // ---- 7. daylight, and the note -------------------------------------------------------------------
    function house() {
      stage = 'house';
      hideScenery();
      black(false);
      clear();
      world.setDaylight(0.9, r3.renderer);
      if (lights.porch) lights.porch.intensity = 0;
      if (opts && opts.def) opts.def.stamp = t('ep.stamp.later');
      g.clock = OC.clock.gameClock({ startMin: 14 * 60 + 40, endMin: 14 * 60 + 50, durationSec: 600 });
      cooper.setPos(15.5, 5.5); // inside, out of the picture
      cooper.pose('stand');
      cooper.wag(null);
      ctl.seat(0.4, -11.2, -2.84, 0);
      ctl.pitch = 0.04;
      hud.fadeIn();
      var charger = entries.some(function (e) { return e.action === 'tookCharger'; });
      vo(t(charger ? 'ep.house.charger' : 'ep.house'), 5600);
      return 6.6;
    }
    function fridge() {
      stage = 'fridge';
      note = fridgeNote(g, t('ep.fridge'));
      note.visible = true;
      shown.push(t('ep.fridge'));
      if (lights.kitchen) lights.kitchen.intensity = 0.5;
      ctl.seat(NOTE.x, 1.6, 0, -0.33);
      ctl.eyeOffset = -0.33; // no slow sink into the shot
      ctl.pitch = -0.07;
      r3.camera.fov = 27;
      r3.camera.updateProjectionMatrix();
      hud.fadeIn();
      return 4.2;
    }

    // ---- 8. the end ---------------------------------------------------------------------------------
    function outro(first) {
      var steps = [];
      if (first) steps = steps.concat(first);
      steps.push(function () {
        clear();
        add(t(variant === 'main' ? 'epilogue.title' : variant === 'bad' ? 'bad.title' : 'gag.title'), 'title');
        return 2.4;
      });
      CREDITS.forEach(function (id) {
        steps.push(function () {
          add(t(id), CREDIT_SUB[id] ? 'credit ep-sub' : 'credit');
          return 1.6;
        });
      });
      steps.push(function () { return 4; });
      steps.push(function () {
        stage = 'hum';
        clear();
        hum = g.audio ? g.audio.play('lullaby', { gain: 0.55 }) : null;
        return 7.5;
      });
      steps.push(function () {
        stage = 'done';
        add(t('ep.again'), 'again');
        onKey = function (e) {
          if (!ctl.locked) return; // a key pressed in the pause menu is not for us
          if (e.code === 'KeyE' || e.code === 'Space') location.reload(); // the title, with the light on
        };
        document.addEventListener('keydown', onKey);
        return 0;
      });
      return steps;
    }

    // ---- the running order ----------------------------------------------------------------------------
    if (variant === 'gag' || variant === 'bad') {
      stage = 'cards';
      (variant === 'bad' ? BAD : GAG).forEach(function (id) {
        queue.push(function () { return 1.5; });
        queue.push(card(id));
      });
      queue.push(function () { return 3.7; });
      queue = queue.concat(outro());
    } else {
      queue.push(function () { return 1.0; }); // a beat of black after the last night
      queue.push(porch);
      queue.push(function () {
        vo(t('ep.porch.1'), 6200);
        return 6.8;
      });
      if (res.ray) {
        queue.push(function () {
          vo(t('ep.porch.ray'), 5200);
          return 5.8;
        });
      }
      queue.push(function () {
        vo(t(res.key.length ? 'ep.porch.phone' : 'ep.porch.nothing'), 4800);
        showBoard();
        return 1.2;
      });
      evidenceCards().forEach(function (c) { queue.push(addCard(c)); });
      queue.push(function () { return 3.6; });
      queue.push(fadeOut);
      queue.push(toTape);
      if (res.tier === 'little') {
        queue.push(card('ep.found.little.1'));
        queue.push(card('ep.found.little.2'));
      } else {
        queue.push(card('ep.found.1'));
        queue.push(card('ep.found.2'));
      }
      if (res.counted) queue.push(card('ep.found.counted'));
      if (res.tier !== 'little' || res.notebook === 'took' || res.notebook === 'photo') queue = queue.concat(notebook());
      queue.push(news);
      queue.push(function () {
        stage = 'others';
        clear();
        return 0.4;
      });
      queue.push(card('ep.dave'));
      queue.push(card('ep.cashier'));
      if (res.shopper) queue.push(card('ep.cashier.shopper'));
      queue.push(verdict);
      OC.evidence.endingLines(res).forEach(function (id) { queue.push(card(id)); });
      queue.push(card('ep.cooper'));
      queue.push(function () { return 1.5; });
      queue.push(fadeOut);
      queue.push(house);
      queue.push(fadeOut);
      queue.push(fridge);
      queue.push(function () {
        vo(t('ep.fridge.vo'), 3800);
        return 5;
      });
      queue.push(fadeOut);
      queue = queue.concat(outro([
        function () {
          stage = 'vo';
          hideScenery();
          black(true);
          clear();
          hud.fadeIn();
          r3.camera.fov = g.baseFov;
          r3.camera.updateProjectionMatrix();
          return 1.2;
        },
        function () {
          add(t('epilogue.vo'), 'vo');
          return 7.5;
        },
      ]));
    }

    return {
      variant: variant,
      tier: variant === 'main' ? res.tier : variant,
      result: res,
      stage: function () {
        return stage;
      },
      shown: function () {
        return shown.slice();
      },
      noteVisible: function () {
        return !!(note && note.visible);
      },
      update: function (dt) {
        if (!ctl.locked) return; // paused, like every night: the menu is up
        if (ray && ray.visible()) ray.update(dt);
        if (bar && yard) {
          barT += dt;
          yard.color.setHex(Math.floor(barT / 0.38) % 2 ? 0xff2a2a : 0x2a4dff);
        }
        wait -= dt;
        while (wait <= 0 && queue.length) wait += queue.shift()() || 0;
      },
      dispose: function () {
        hideScenery();
        black(false);
        clear();
        if (onKey) document.removeEventListener('keydown', onKey);
        if (hum && hum.stop) hum.stop();
        if (lights.kitchen && kitchenWas !== null) lights.kitchen.intensity = kitchenWas;
        cooper.pose('stand');
        cooper.wag(null);
        r3.camera.fov = g.baseFov;
        r3.camera.updateProjectionMatrix();
        hud.setCrosshair(true);
        g.state.cutscene = false;
      },
    };
  }

  OC.epilogue = { requiredText: TEXT, create: create };
})();
