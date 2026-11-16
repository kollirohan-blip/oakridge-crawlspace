// Night one, dinner as a personality test: pick from the fridge, cook it your way (the microwave
// keypad, the oven, the kettle), eat at the table while Cooper begs, decide about the bite. Cooper
// knocks a pan off the counter while dinner cooks (the fake scare that sets the baseline). The fridge
// is also where the first contradiction happens: food you remember is missing.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var DISH_IDS = ['lasagna', 'pizza', 'mac', 'cereal', 'tupperware'];
  var TEXT = [
    'n1.din.fridgePrompt', 'n1.din.close',
    'n1.din.opt.lasagna', 'n1.din.opt.pizza', 'n1.din.opt.mac', 'n1.din.opt.cereal', 'n1.din.opt.tupperware',
    'n1.din.choose.lasagna', 'n1.din.choose.pizza', 'n1.din.choose.mac', 'n1.din.choose.cereal', 'n1.din.choose.tupperware',
    'n1.din.wrong.microwave', 'n1.din.wrong.oven', 'n1.din.wrong.kettle', 'n1.din.wrong.none',
    'n1.din.kpEmpty', 'n1.din.kp20', 'n1.din.cooking', 'n1.din.preheat', 'n1.din.preheated', 'n1.din.ovenIn',
    'n1.din.kettleOn', 'n1.din.kettleDone',
    'n1.din.result.good', 'n1.din.result.cold', 'n1.din.result.lava', 'n1.din.result.pizza', 'n1.din.result.mac',
    'n1.din.sit', 'n1.din.eat.lasagna', 'n1.din.eat.pizza', 'n1.din.eat.mac', 'n1.din.eat.cereal', 'n1.din.eat.tupperware',
    'n1.din.bitePrompt', 'n1.din.biteYes', 'n1.din.biteNo', 'n1.din.gaveBite', 'n1.din.noBite', 'n1.din.tupperwareDog',
    'n1.din.pan', 'n1.fridge.look1', 'n1.fridge.missing', 'n1.fridge.look3',
  ];
  var TABLE_SEAT = { x: 10.6, z: 4.1, yaw: Math.PI / 2 };
  var BEG_AT = { x: 10.75, z: 5.3 };
  var PAN_SPOT = { x: 7.95, z: 1.15 };

  function create(g, ctx) {
    var t = g.t;
    var props = g.props;
    var decor = props.decor;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var hud = g.hud;
    var phone = g.phone;
    var food = OC.food;
    var dinner = food.createDinner();
    var stand = OC.house.stand;

    var st = {
      carrying: false, // the cooked dish is in Mason's hands
      lastAppliance: null,
      seated: false,
      cookT: 0,
      panDone: false,
      digits: '',
      fridgeLooks: 0,
      chosenAt: -1,
      lastLookAt: -1,
      missingSeen: false,
    };
    var hum = null;
    var keyHandler = null;

    function say(id, ms) {
      hud.say(t(id), ms);
    }
    function stopHum() {
      if (hum) hum.stop();
      hum = null;
    }

    // ---- the microwave keypad ------------------------------------------------------------------
    function display() {
      var s = st.digits.padStart(3, '0');
      return s.slice(0, -2).replace(/^0(?=\d)/, '') + ':' + s.slice(-2);
    }
    function openKeypad() {
      st.digits = '';
      g.state.modal = 'keypad';
      st.frozenWas = ctl.frozen;
      ctl.frozen = true;
      hud.keypad(true, display());
      keyHandler = function (e) {
        if (!ctl.locked) return;
        if (/^(Digit|Numpad)[0-9]$/.test(e.code)) {
          if (st.digits.length < 4) st.digits += e.code.slice(-1);
          ctx.sfx('keyBeep', { pos: { x: 6.6, y: 1.06, z: 0.7 } });
          hud.keypad(true, display());
        } else if (e.code === 'Backspace') {
          st.digits = st.digits.slice(0, -1);
          hud.keypad(true, display());
        } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          api.keypadInput(st.digits);
        } else if (e.code === 'KeyE') {
          closeKeypad();
        }
      };
      window.addEventListener('keydown', keyHandler);
    }
    function closeKeypad() {
      if (keyHandler) window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
      hud.keypad(false);
      if (g.state.modal === 'keypad') g.state.modal = null;
      ctl.frozen = !!st.frozenWas;
    }

    function startMicrowave(seconds) {
      if (!dinner.startCook('microwave', seconds)) {
        if (dinner.lastError === 'refuse') {
          say('n1.din.kp20', 6000);
          st.digits = '';
          hud.keypad(true, display());
        } else if (dinner.lastError === 'noKeypad') {
          say('n1.din.kpEmpty');
        }
        return false;
      }
      closeKeypad();
      st.carrying = false;
      st.lastAppliance = 'microwave';
      st.cookT = 0;
      decor.microwaveScreen('cook', dinner.dish);
      hum = ctx.sfx('hum', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
      say('n1.din.cooking');
      return true;
    }

    // ---- what happens when cooking finishes ----------------------------------------------------
    function onReady() {
      if (st.lastAppliance === 'microwave') {
        stopHum();
        decor.microwaveScreen('done');
        ctx.sfx('beep', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
        hud.toast('Dinner is ready');
      } else if (st.lastAppliance === 'oven') {
        decor.stoveGlow(false);
        ctx.sfx('beep', { pos: { x: 7.3, y: 0.9, z: 0.6 }, gain: 0.7 });
        hud.toast('The pizza is done');
      } else if (st.lastAppliance === 'kettle') {
        decor.kettleLight(false);
        ctx.sfx('kettle', { pos: { x: 10.8, y: 1.1, z: 0.45 }, duration: 2.5 });
        say('n1.din.kettleDone');
      }
    }

    function needed() {
      var d = dinner.dish && food.DISHES[dinner.dish];
      return d ? d.appliance : null;
    }
    function wrongAppliance(applianceHere) {
      var need = needed();
      say(need ? 'n1.din.wrong.' + need : 'n1.din.wrong.none');
      return applianceHere;
    }

    // ---- the fridge ----------------------------------------------------------------------------
    function openFridge() {
      if (dinner.state === 'fridge') {
        var opts = DISH_IDS.map(function (id) { return { id: id, text: t('n1.din.opt.' + id) }; });
        opts.push({ id: 'close', text: t('n1.din.close') });
        g.phone.choice({ prompt: t('n1.din.fridgePrompt'), options: opts }).then(function (id) {
          if (id === 'close' || id === 'timeout' || dinner.state !== 'fridge') return;
          dinner.choose(id);
          st.chosenAt = ctx.flags.elapsed;
          say('n1.din.choose.' + id, 6500);
          if (id === 'cereal') {
            st.carrying = true;
            phone.setShopping(dinner.shoppingList());
          }
        });
        return;
      }
      // after dinner is out: the pudding cups
      st.fridgeLooks++;
      var since = ctx.flags.elapsed - Math.max(st.chosenAt, st.lastLookAt);
      if (!st.missingSeen && st.fridgeLooks >= 2 && since >= 90) {
        st.missingSeen = true;
        say('n1.fridge.missing', 7000);
        ctx.log('missingFood');
      } else if (st.missingSeen) {
        say('n1.fridge.look3');
      } else {
        say('n1.fridge.look1', 6000);
        if (st.fridgeLooks >= 2) st.fridgeLooks = 1; // too soon: look again later
      }
      st.lastLookAt = ctx.flags.elapsed;
    }

    // ---- the table -----------------------------------------------------------------------------
    function sitDown() {
      if (!dinner.serve()) return;
      st.carrying = false;
      st.seated = true;
      decor.plate('table', dinner.dish);
      ctl.seat(TABLE_SEAT.x, TABLE_SEAT.z, TABLE_SEAT.yaw, -0.45);
      say('n1.din.sit');
      cooper.goTo(BEG_AT.x, BEG_AT.z, function () {
        cooper.pose('beg');
        cooper.headTo({ x: TABLE_SEAT.x, z: TABLE_SEAT.z });
        ctx.sfx('whine', { pos: { x: BEG_AT.x, y: 0.6, z: BEG_AT.z } });
      });
    }
    function getUp() {
      st.seated = false;
      ctl.stand();
      ctl.teleport(stand.table.x, stand.table.z);
      decor.plate('tableEmpty');
      cooper.follow();
    }
    function eat() {
      var r = dinner.eat();
      if (!r) return;
      ctx.sfx('munch', { gain: 0.8 });
      ctx.log('dinner', { kind: r.dish, result: r.result });
      if (r.gag) g.state.gag = true;
      decor.plate('tableEmpty');
      say('n1.din.eat.' + r.dish, 6500);
      ctx.complete('dinner');
      if (r.dish === 'tupperware') {
        // Cooper will not touch it. That is not a good sign.
        ctx.later(6.5, function () {
          say('n1.din.tupperwareDog', 6000);
          cooper.ears(true);
          ctx.later(5, getUp);
        });
        return;
      }
      ctx.later(6.5, function () {
        g.phone.choice({
          prompt: t('n1.din.bitePrompt'),
          options: [{ id: 'yes', text: t('n1.din.biteYes') }, { id: 'no', text: t('n1.din.biteNo') }],
        }).then(function (id) {
          if (id === 'yes') {
            ctx.log('gaveBite');
            cooper.wag(0.6, 2);
            ctx.sfx('munch', { pos: { x: BEG_AT.x, y: 0.5, z: BEG_AT.z }, gain: 0.6 });
            say('n1.din.gaveBite');
          } else {
            ctx.log('noBite');
            cooper.ears(true);
            ctx.sfx('whine', { pos: { x: BEG_AT.x, y: 0.6, z: BEG_AT.z } });
            say('n1.din.noBite');
          }
          ctx.later(3, function () {
            cooper.wag(null);
            getUp();
          });
        });
      });
    }

    // ---- the pan: Cooper begging at the counter while dinner cooks ------------------------------
    function panScare() {
      st.panDone = true;
      cooper.goTo(PAN_SPOT.x, PAN_SPOT.z, function () {
        cooper.pose('beg');
        ctx.later(0.8, function () {
          decor.pan.fall();
          ctx.sfx('pan', { pos: { x: PAN_SPOT.x, y: 0.5, z: PAN_SPOT.z } });
          ctx.tension.peak(3);
          cooper.pose('stand');
          ctx.later(1.4, function () {
            say('n1.din.pan', 6000);
            cooper.wag(0.6, 2.2);
          });
          ctx.later(5, function () {
            cooper.wag(null);
            cooper.follow();
          });
        });
      });
    }

    var items = [
      {
        id: 'fridge', x: 12.75, y: 0.75, z: 0.9, radius: 0.22,
        label: function () { return dinner.state === 'fridge' ? 'Open the fridge' : 'Look in the fridge'; },
        onUse: openFridge,
      },
      {
        id: 'microwave', x: 6.3, y: 1.06, z: 0.7, radius: 0.3,
        label: function () {
          if (dinner.state === 'ready' && !st.carrying && st.lastAppliance === 'microwave') return 'Take it out';
          if (dinner.state === 'ready' && st.carrying && dinner.result === 'cold') return 'Put it back in';
          return 'Use the microwave';
        },
        enabled: function () {
          if (st.seated || dinner.state === 'cooking' || dinner.state === 'preheating') return false;
          if (dinner.state === 'holding' || dinner.state === 'preheated') return true;
          if (dinner.state === 'ready' && st.lastAppliance === 'microwave') return !st.carrying || dinner.result === 'cold';
          return false;
        },
        onUse: function () {
          if (dinner.state === 'ready' && !st.carrying) {
            st.carrying = true;
            decor.microwaveScreen('off');
            say('n1.din.result.' + (dinner.result || 'good'), 6000);
            return;
          }
          if (needed() !== 'microwave') return wrongAppliance('microwave');
          openKeypad();
        },
      },
      {
        id: 'oven', x: 7.28, y: 0.45, z: 0.85, radius: 0.3,
        label: function () {
          if (dinner.state === 'preheated') return 'Put the pizza in';
          if (dinner.state === 'ready' && st.lastAppliance === 'oven' && !st.carrying) return 'Take the pizza out';
          return 'Turn on the oven';
        },
        enabled: function () {
          if (st.seated) return false;
          if (dinner.state === 'holding' || dinner.state === 'preheated') return true;
          return dinner.state === 'ready' && st.lastAppliance === 'oven' && !st.carrying;
        },
        onUse: function () {
          if (dinner.state === 'ready') {
            st.carrying = true;
            say('n1.din.result.pizza');
            return;
          }
          if (needed() !== 'oven') return wrongAppliance('oven');
          if (dinner.state === 'holding') {
            dinner.preheat();
            decor.stoveGlow(true);
            ctx.sfx('click', { pos: { x: 7.3, y: 0.9, z: 0.6 } });
            say('n1.din.preheat');
          } else if (dinner.startCook('oven')) {
            st.lastAppliance = 'oven';
            st.cookT = 0;
            say('n1.din.ovenIn');
          }
        },
      },
      {
        id: 'kettle', x: 10.8, y: 1.05, z: 0.45, radius: 0.22,
        label: function () {
          return dinner.state === 'ready' && st.lastAppliance === 'kettle' && !st.carrying ? 'Make the mac and cheese' : 'Boil the kettle';
        },
        enabled: function () {
          if (st.seated) return false;
          if (dinner.state === 'holding') return true;
          return dinner.state === 'ready' && st.lastAppliance === 'kettle' && !st.carrying;
        },
        onUse: function () {
          if (dinner.state === 'ready') {
            st.carrying = true;
            say('n1.din.result.mac');
            return;
          }
          if (needed() !== 'kettle') return wrongAppliance('kettle');
          if (dinner.startCook('kettle')) {
            st.lastAppliance = 'kettle';
            st.cookT = 0;
            decor.kettleLight(true);
            say('n1.din.kettleOn');
          }
        },
      },
      {
        id: 'table', x: 9.95, y: 0.8, z: 4.1, radius: 0.4,
        label: 'Sit down and eat',
        enabled: function () { return !st.seated && st.carrying && dinner.state === 'ready'; },
        onUse: sitDown,
      },
      {
        id: 'eat', x: 9.95, y: 0.82, z: 4.1, radius: 0.25,
        label: 'Eat',
        hold: 2.5,
        enabled: function () { return st.seated && dinner.state === 'served'; },
        onUse: eat,
      },
    ];

    var api = {
      items: items,
      dinner: function () {
        return dinner;
      },
      state: st,
      // type a time on the keypad and press Enter (for scripted runs; the keypad must be open)
      keypadInput: function (str) {
        var secs = food.parseKeypad(str);
        if (!secs) {
          say('n1.din.kpEmpty');
          return false;
        }
        return startMicrowave(secs);
      },
      keypadOpen: function () {
        return g.state.modal === 'keypad';
      },
      closeKeypad: closeKeypad,
      update: function (dt) {
        var ev = dinner.tick(dt);
        if (ev === 'preheated') {
          hud.toast("The oven's hot");
          ctx.sfx('beep', { pos: { x: 7.3, y: 0.9, z: 0.6 }, gain: 0.5 });
          say('n1.din.preheated');
        } else if (ev === 'ready') {
          onReady();
        }
        var cooking = dinner.state === 'cooking' || dinner.state === 'preheating';
        if (cooking) st.cookT += dt;
        if (!st.panDone && cooking && st.cookT > 4 && ctx.flags.room === 'kitchen' && cooper.mode === 'follow' && ctx.tension.ready()) {
          panScare();
        }
      },
      dispose: function () {
        stopHum();
        closeKeypad();
      },
    };
    return api;
  }

  OC.night1.dinner = { create: create, TEXT: TEXT };
})();
