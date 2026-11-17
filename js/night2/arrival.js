// Night two, getting in and settling: the deadbolt thrown from the inside, the porch light that comes
// on by itself, the fake rock (on its back), Cooper waiting behind the door with his hackles up, and
// the groceries. The bag goes on the kitchen table; the food in it is gone the first time Mason leaves
// the room. The dog food is not touched. The batteries go in Dave's flashlight.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night2 = OC.night2 || {};

  var TEXT = [
    'act2.sms.mason1', 'act2.sms.dave1', 'act2.thought.door', 'act2.thought.key', 'act2.thought.unlock', 'act2.thought.inside',
    'n2.thought.porchLight', 'n2.notify.list', 'n2.thought.listNotify', 'n2.thought.bagDown', 'n2.thought.needBag',
    'n2.thought.foodGone.a', 'n2.thought.foodGone.b', 'n2.thought.foodGone.c', 'n2.thought.foodGone2',
    'n2.thought.binFilled', 'n2.thought.cooperWontEat', 'n2.thought.fridge', 'n2.thought.fridgeMilk',
    'n2.thought.torchDead', 'n2.thought.torchReady', 'n2.thought.tookBatteries',
  ];
  var ROCK = { x: 4.78, y: 0.12, z: -1.42 };
  var TABLE = { x: 9.4, z: 4.3 };
  var BOWL = { x: 11.2, y: 0.14, z: 6.9 };
  var BIN = { x: 12.4, y: 0.75, z: 7.0 };
  var HALL_END = { x: 6, y: 1.0, z: 23 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var phone = g.phone;
    var ch = props.changes;
    var flags = ctx.flags;
    var say = ctx.say;

    // what he bought (read from day two; a chapter started cold gets burritos and no milk)
    var entries = g.habits.entries();
    var snackEntry = entries.filter(function (e) { return e.action === 'snack'; }).pop();
    var snack = (snackEntry && snackEntry.detail && snackEntry.detail.kind) || 'b';
    var boughtMilk = entries.some(function (e) { return e.action === 'dinner' && e.detail && e.detail.kind === 'cereal'; });

    var st = {
      hasKey: false, triedDoor: false, doorOpen: false, porchLit: false,
      hasBag: true, placed: false, awayT: 0, foodGone: false, foodNoticed: false,
      hasBatteries: false, hasDogFood: false, binFilled: false, fed: false,
      fridgeSeen: false, torchFound: false, torchReady: false, growlT: 2,
    };
    ch.groceries.reset();
    ch.groceries.snackKind(snack);

    // Cooper is right behind the front door, facing it, ears flat
    cooper.setPos(2.5, 2.3);
    cooper.follow();
    cooper.stay();
    cooper.pose('stand');
    cooper.headTo({ x: 2.5, y: 0.8, z: 0 });
    cooper.ears(true);
    cooper.wag(0);

    // Mason has just parked: the headlights are on, then they click off on their own
    props.car.headlights(true);
    ctx.later(30, function () {
      props.car.headlights(false);
      ctx.sfx('click', { pos: { x: 10, y: 0.8, z: -7.6 } });
    });

    function flickerPorch() {
      st.porchLit = true;
      [[0, true], [0.11, false], [0.3, true], [0.38, false], [0.62, true]].forEach(function (f) {
        ctx.later(f[0], function () { ctx.lights.set('porch', f[1]); });
      });
      ctx.sfx('click', { pos: { x: 2.5, y: 2.2, z: -1.4 }, gain: 0.5 });
      ctx.later(1.6, function () { say('n2.thought.porchLight', 6000); });
    }
    function comeInside() {
      flags.insideAt = flags.elapsed;
      ctx.setStage('inside');
      ctx.complete('inside');
      props.frontDoor.close(ctl.pos);
      st.doorOpen = false;
      if (ctl.nav) ctl.nav.rebuild();
      ctx.sfx('doorLock', { pos: { x: 2.5, y: 1, z: 0 } });
      // he does not bark. He presses in against Mason's legs, shaking
      ctx.sfx('whine', { pos: { x: cooper.pos.x, y: 0.5, z: cooper.pos.z } });
      cooper.headTo(null);
      cooper.follow();
      cooper.ears(true);
      ctx.later(1.0, function () { say('act2.thought.inside', 6000); });
      ctx.later(7.5, function () {
        phone.notify("Dave's List", t('n2.notify.list'));
        if (g.audio) g.audio.play('buzz', { gain: 0.8 });
      });
      ctx.later(10.5, function () { say('n2.thought.listNotify', 6000); });
    }
    function checkUnpacked() {
      if (st.binFilled && st.torchReady) ctx.complete('unpack');
    }

    var items = [
      {
        id: 'frontDoor', x: 2.5, y: 1.0, z: -0.1, radius: 0.6,
        label: function () { return st.hasKey ? 'Unlock the front door' : 'Try the front door'; },
        hold: function () { return st.hasKey ? 1.0 : 0; },
        enabled: function () { return !st.doorOpen && !ctx.done('inside'); },
        onUse: function () {
          if (!st.hasKey) {
            ctx.sfx('thud', { pos: { x: 2.5, y: 1, z: 0 }, gain: 0.5 });
            say('act2.thought.door');
            if (!st.triedDoor) {
              st.triedDoor = true;
              ctx.later(2.5, function () { phone.send('dave', t('act2.sms.mason1')); });
              ctx.later(9, function () { phone.deliver('dave', 'Uncle Dave', t('act2.sms.dave1')); });
            }
            return;
          }
          st.doorOpen = true;
          props.frontDoor.open();
          if (ctl.nav) ctl.nav.rebuild();
          ctx.sfx('doorLock', { pos: { x: 2.5, y: 1, z: 0 } });
          ctx.sfx('creak', { pos: { x: 2.5, y: 1, z: 0 }, delay: 0.3 });
          say('act2.thought.unlock');
        },
      },
      {
        id: 'rock', x: ROCK.x, y: ROCK.y, z: ROCK.z, radius: 0.45,
        label: 'Check the fake rock',
        hold: 1.2,
        enabled: function () { return !st.hasKey; },
        onUse: function () {
          st.hasKey = true;
          ctx.sfx('dig', { pos: ROCK });
          hud.toast('Found the spare key');
          say('act2.thought.key', 7000);
        },
      },
      {
        id: 'groceries', x: TABLE.x, y: 0.9, z: TABLE.z, radius: 0.45,
        label: 'Put the groceries down',
        enabled: function () { return ctx.done('inside') && st.hasBag; },
        onUse: function () {
          st.hasBag = false;
          st.placed = true;
          ch.groceries.show(true);
          ch.groceries.set('milk', boughtMilk);
          ctx.sfx('rustle', { pos: { x: TABLE.x, y: 0.9, z: TABLE.z } });
          ctx.complete('groceries');
          say('n2.thought.bagDown');
        },
      },
      {
        id: 'batteries', x: ch.groceries.partAt.batteries.x, y: ch.groceries.partAt.batteries.y, z: ch.groceries.partAt.batteries.z, radius: 0.16,
        label: 'Take the batteries',
        enabled: function () { return st.placed && !st.hasBatteries; },
        onUse: function () {
          st.hasBatteries = true;
          ch.groceries.set('batteries', false);
          ctx.sfx('click', { gain: 0.5 });
          if (!st.torchFound) say('n2.thought.tookBatteries');
        },
      },
      {
        id: 'dogFood', x: ch.groceries.partAt.dogFood.x, y: ch.groceries.partAt.dogFood.y, z: ch.groceries.partAt.dogFood.z, radius: 0.24,
        label: 'Take the dog food',
        enabled: function () { return st.placed && !st.hasDogFood && !st.binFilled; },
        onUse: function () {
          st.hasDogFood = true;
          ch.groceries.set('dogFood', false);
          ctx.sfx('rustle', { gain: 0.6 });
        },
      },
      {
        id: 'bin', x: BIN.x, y: BIN.y, z: BIN.z, radius: 0.45,
        label: "Fill Cooper's bin",
        hold: 1.2,
        enabled: function () { return st.hasDogFood && !st.binFilled; },
        onUse: function () {
          st.binFilled = true;
          st.hasDogFood = false;
          ctx.sfx('kibble', { pos: BIN });
          say('n2.thought.binFilled');
          checkUnpacked();
        },
      },
      {
        id: 'bowl', x: BOWL.x, y: BOWL.y, z: BOWL.z, radius: 0.3,
        label: 'Feed Cooper',
        enabled: function () { return st.binFilled && !st.fed; },
        onUse: function () {
          st.fed = true;
          ctx.sfx('kibble', { pos: BOWL, gain: 0.7 });
          props.bowl.setFilled(true);
          ctx.log('fedCooper', { night: 2 });
          // he comes, he sniffs it, he does not eat. He looks down the hall
          cooper.sniff({ x: BOWL.x, z: BOWL.z - 0.55 }, function () {
            cooper.follow();
            cooper.ears(true);
            cooper.stare(HALL_END);
            say('n2.thought.cooperWontEat', 6500);
            ctx.later(6, function () { cooper.stare(null); });
          });
        },
      },
      {
        id: 'fridge', x: 12.55, y: 1.2, z: 0.87, radius: 0.4,
        label: function () { return st.placed && ch.groceries.has('milk') ? 'Put the milk away' : 'Look in the fridge'; },
        enabled: function () { return ctx.done('inside') && (!st.fridgeSeen || (st.placed && ch.groceries.has('milk'))); },
        onUse: function () {
          var milk = st.placed && ch.groceries.has('milk');
          ctx.sfx('click', { pos: { x: 12.55, y: 1, z: 0.9 }, gain: 0.6 });
          if (milk) {
            ch.groceries.set('milk', false);
            say('n2.thought.fridgeMilk');
          }
          if (!st.fridgeSeen) {
            st.fridgeSeen = true;
            ctx.log('sawTupperwareGone');
            ctx.later(milk ? 4.2 : 0.3, function () { say('n2.thought.fridge', 7000); });
          }
        },
      },
      {
        id: 'drawer', x: ch.torch.at.x, y: ch.torch.at.y, z: ch.torch.at.z, radius: 0.3,
        label: function () {
          if (!st.torchFound) return 'Open the junk drawer';
          return 'Put the batteries in the flashlight';
        },
        enabled: function () { return ctx.done('inside') && !st.torchReady && (!st.torchFound || st.hasBatteries); },
        onUse: function () {
          if (!st.torchFound) {
            st.torchFound = true;
            ch.torch.show(true);
            ctx.sfx('slide', { pos: ch.torch.at, gain: 0.5 });
            if (!st.hasBatteries) {
              say('n2.thought.torchDead', 7000);
              return;
            }
          }
          st.torchReady = true;
          ch.torch.show(false);
          ctl.light.power = 2.7;
          ctl.light.spot.angle = 0.74;
          ctl.light.spot.distance = 32;
          ctl.light.battery = 1;
          ctl.light.available = true;
          ctl.light.drain = ctx.plan.gates.lightFalters ? 1.7 : 0.7;
          ctl.light.on = true;
          ctx.sfx('click', { gain: 0.7 });
          hud.toast('Flashlight: press F');
          say('n2.thought.torchReady');
          ctx.log('flashlight');
          checkUnpacked();
        },
      },
    ];

    return {
      items: items,
      state: st,
      snack: snack,
      update: function (dt) {
        // outside: the porch light, and Cooper behind the door
        if (!ctx.done('inside')) {
          var onPorch = Math.abs(ctl.pos.x - 2.5) < 2.4 && ctl.pos.z > -3.4 && ctl.pos.z < 0;
          if (onPorch && !st.porchLit) flickerPorch();
          st.growlT -= dt;
          if (st.growlT <= 0 && ctl.pos.z > -6) {
            st.growlT = 5 + Math.random() * 4;
            ctx.sfx('growl', { pos: { x: 2.5, y: 0.5, z: 1.6 }, duration: 1.8, gain: 0.8 });
          }
          if (st.doorOpen && flags.room === 'foyer' && ctl.pos.z > 0.75) comeInside();
          return;
        }
        // the food: gone the first time he is out of the kitchen for a few seconds
        if (st.placed && !st.foodGone) {
          var near = flags.room === 'kitchen' || flags.room === 'living';
          st.awayT = near ? 0 : st.awayT + dt;
          if (st.awayT > 6) {
            st.foodGone = true;
            ch.groceries.set('snack', false);
            if (ch.groceries.has('milk')) ch.groceries.set('milk', false);
          }
        } else if (st.foodGone && !st.foodNoticed && flags.room === 'kitchen') {
          var d = Math.hypot(ctl.pos.x - TABLE.x, ctl.pos.z - TABLE.z);
          var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
          if (d < 5 && OC.sightline.inView(cam, { x: TABLE.x, z: TABLE.z }, 0.7) && ctx.free()) {
            st.foodNoticed = true;
            ctx.log('foodTaken', { kind: snack });
            ctx.tension.peak(5);
            say('n2.thought.foodGone.' + snack, 5000);
            ctx.later(5.2, function () { say('n2.thought.foodGone2', 6000); });
          }
        }
      },
      dispose: function () {
        props.car.headlights(false);
      },
    };
  }

  OC.night2.arrival = { create: create, TEXT: TEXT };
})();
