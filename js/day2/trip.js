// Day 2, the store trip in the evening (fear 2 to 5). The drive out: a local talk-show on the radio
// with bad ads and a caller whose pantry keeps emptying. The Gas-N-Go: the shopping list, the cashier
// (who knows "the Dave place"), the bulletin board (a 1998 clipping, a faded MISSING poster), and a
// hooded shopper who watches Mason from the end of an aisle and leaves without buying anything. The
// drive home: a deer in the headlights, and after it bolts, a person-shaped silhouette at the roadside
// that stays a beat too long, facing the car. Then Night 2. Mason drives both ways himself (W, S, A, D):
// only the deer takes the wheel from him, for the few seconds he stands on the brake.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.day2 = OC.day2 || {};

  var RADIO = ['day2.radio.1', 'day2.radio.2', 'day2.radio.3', 'day2.radio.4', 'day2.radio.5', 'day2.radio.6', 'day2.radio.7', 'day2.radio.8'];
  var PARKED = { x: 393.6, z: -11 }; // in the Gas-N-Go lot, facing the shop
  var DEER_Z = 120; // where the deer steps out on the way home
  var CASHIER_LOOK = {
    shirt: 0x7d2a26, pants: 0x2b2b31, skinLight: '#e3b89d', skinDark: '#a97c63', hair: '#2b1e15',
    hat: 'cap', capColor: 0x7d2a26, glasses: true, height: 1.72,
  };

  function buildDeer(scene) {
    var d = new THREE.Group(); // faces local +z
    var fur = new THREE.MeshPhongMaterial({ color: 0x7a5a3a, specular: 0 });
    var pale = new THREE.MeshPhongMaterial({ color: 0xd8cbb5, specular: 0 });
    function box(w, h, l, m, x, y, z, parent) {
      var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
      o.position.set(x, y, z);
      (parent || d).add(o);
      return o;
    }
    box(0.36, 0.42, 1.05, fur, 0, 1.0, 0);
    var neck = new THREE.Group();
    neck.position.set(0, 1.12, 0.45);
    neck.rotation.x = -0.6;
    d.add(neck);
    box(0.16, 0.5, 0.18, fur, 0, 0.25, 0, neck);
    var head = new THREE.Group();
    head.position.set(0, 0.5, 0.04);
    neck.add(head);
    box(0.17, 0.17, 0.32, fur, 0, 0, 0.1, head).rotation.x = 0.6;
    box(0.05, 0.14, 0.03, fur, -0.09, 0.14, -0.02, head).rotation.z = 0.5;
    box(0.05, 0.14, 0.03, fur, 0.09, 0.14, -0.02, head).rotation.z = -0.5;
    var shine = new THREE.MeshBasicMaterial({ color: 0xe9f3cf });
    box(0.03, 0.03, 0.02, shine, -0.075, 0.04, 0.16, head);
    box(0.03, 0.03, 0.02, shine, 0.075, 0.04, 0.16, head);
    [[-0.12, 0.38], [0.12, 0.38], [-0.12, -0.4], [0.12, -0.4]].forEach(function (p) { box(0.07, 0.8, 0.07, fur, p[0], 0.4, p[1]); });
    box(0.1, 0.16, 0.06, pale, 0, 1.12, -0.54);
    d.visible = false;
    scene.add(d);
    return { group: d, head: head };
  }

  OC.day2.trip = {
    TEXT: [
      'day2.thought.arrive', 'day2.thought.wait', 'day2.thought.snack', 'day2.snack.a',
      'day2.snack.b', 'day2.snack.c', 'day2.note.boardTitle', 'day2.note.board', 'day2.thought.board',
      'day2.thought.shopper', 'day2.thought.shopperGone', 'day2.thought.deer', 'day2.thought.roadside',
      'day2.thought.noSignal', 'day2.thought.roadsideStare', 'day2.thought.driveNudgeOut', 'day2.thought.driveNudgeHome',
    ].concat(RADIO),
    create: function (g, ctx) {
      var t = g.t;
      var hud = g.hud;
      var ctl = g.ctl;
      var props = g.props;
      var car = props.car;
      var wes = props.intruder;
      var phone = g.phone;
      var scene = g.render.scene;
      var P = OC.places;
      var home = { x: car.group.position.x, z: car.group.position.z, ry: car.group.rotation.y };
      var st = { stage: 'idle', z: 0, speed: 0, radioI: -1, radioT: 0, picked: {}, paid: false, wes: 'none', wesT: 0, seenT: 0, deer: 'none', deerT: 0, endT: 0 };
      var sounds = [];

      // what Mason has to buy: milk too, if he had cereal last night
      var needMilk = g.habits.entries().some(function (e) { return e.action === 'dinner' && e.detail && e.detail.kind === 'cereal'; });
      var LIST = [['dogFood', 'dog food'], ['batteries', 'batteries'], ['snack', 'something for dinner']].concat(needMilk ? [['milk', 'milk']] : []);

      var stock = ctx.once('shopStock', function () {
        var kraft = new THREE.MeshPhongMaterial({ color: 0xb8955e, specular: 0 });
        var red = new THREE.MeshPhongMaterial({ color: 0x8a2a1d, specular: 0 });
        var food = new THREE.Group();
        food.position.set(396.62, 0.12, 5.75);
        var bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.42), kraft);
        bag.position.y = 0.21;
        food.add(bag);
        var band = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.43), red);
        band.position.y = 0.24;
        food.add(band);
        scene.add(food);
        var batt = new THREE.Group();
        batt.position.set(403.1, 0.97, 1.3);
        var card = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.12), new THREE.MeshPhongMaterial({ color: 0xd8742a, specular: 0 }));
        card.position.y = 0.08;
        batt.add(card);
        scene.add(batt);
        return { dogFood: food, batteries: batt };
      });
      stock.dogFood.visible = true;
      stock.batteries.visible = true;
      var cashier = ctx.once('cashier', function () { return OC.person.create(scene, CASHIER_LOOK); });
      cashier.setPos(404.0, 0.62);
      cashier.faceTo(404.0, 3);
      cashier.show(false);
      var deer = ctx.once('deer', function () { return buildDeer(scene); });
      deer.group.visible = false;

      function loop(name, opts) {
        var h = g.audio ? g.audio.play(name, opts) : { stop: function () {} };
        sounds.push(h);
        return h;
      }
      function stopSounds() {
        sounds.forEach(function (h) { h.stop(); });
        sounds.length = 0;
      }
      function shopping() {
        return LIST.filter(function (x) { return !st.picked[x[0]]; }).map(function (x) { return x[1]; });
      }
      function allPicked() {
        return LIST.every(function (x) { return st.picked[x[0]]; });
      }
      function pick(id) {
        st.picked[id] = true;
        ctx.complete('buy_' + id);
        phone.setShopping(shopping());
        ctx.sfx('rustle', { gain: 0.6 });
      }

      // ---- driving: Mason drives the road between the house and the Gas-N-Go (W gas, S brake and then
      // back up, A and D steer). The ditch before the trees is the edge. The deer takes the wheel for a few
      // seconds: he stands on the brake.
      var GAS = 4.5; // metres a second, each second
      var BRAKE = 10;
      var DRAG = 0.8; // coasting
      var TOP = 22; // about 50 mph
      var GRAVEL = 9; // the most the shoulder allows
      var BACK = 4; // backing up
      var STEER = 0.9; // radians a second at speed
      var MAX_TURN = 0.55; // never more than this off the road's line
      var LANE = 4; // the asphalt, either side of the line
      var EDGE = 6.3; // the ditch, before the trees
      function wrap(a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
      }
      // the car at (x, z) facing cy (0 is +z), and Mason in the driver's seat: 0.4 m to its left, a little back
      function seatAt(x, z, cy) {
        car.group.position.set(x, 0, z);
        car.group.rotation.y = cy;
        ctl.teleport(x + 0.4 * Math.cos(cy) - 0.05 * Math.sin(cy), z - 0.4 * Math.sin(cy) - 0.05 * Math.cos(cy));
      }
      function startDrive(dir) {
        st.dir = dir;
        st.base = dir > 0 ? 0 : Math.PI; // the road's line, the way he is going
        st.cy = st.base;
        st.x = dir > 0 ? P.ROAD_X + 1.9 : P.ROAD_X - 1.9;
        st.z = dir > 0 ? P.ROAD_Z0 + 10 : P.ROAD_Z1 - 10;
        st.speed = 0;
        st.idleT = 0;
        st.nudged = false;
        g.state.cutscene = true; // no prompts from the driver's seat
        ctl.seat(st.x, st.z, dir > 0 ? Math.PI : 0, -0.6);
        seatAt(st.x, st.z, st.cy);
        st.engine = loop('engine');
        document.body.classList.add('driving');
        hud.fadeIn();
      }
      // out of the car: prompts work again, and the car's keys go away
      function stopDriving() {
        g.state.cutscene = false;
        document.body.classList.remove('driving');
        st.engine = null;
      }
      // turn the car by d, within MAX_TURN of the road's line; the view turns with it
      function turn(d) {
        var was = wrap(st.cy - st.base);
        var rel = Math.max(-MAX_TURN, Math.min(MAX_TURN, was + d));
        st.cy += rel - was;
        ctl.yaw += rel - was;
      }
      function move(dt) {
        st.x += st.speed * Math.sin(st.cy) * dt;
        st.z += st.speed * Math.cos(st.cy) * dt;
        var off = st.x - P.ROAD_X;
        if (Math.abs(off) > EDGE) {
          // the ditch: scraping along it slows him down, the harder he hits it the more, and straightens him
          // out (all the way: a car a hair off straight would grind along it for ever)
          st.x = P.ROAD_X + Math.sign(off) * EDGE;
          var rel = wrap(st.cy - st.base);
          st.speed *= Math.pow(0.35, dt * Math.min(1, Math.abs(Math.sin(rel)) * 4));
          turn(Math.abs(rel) < 0.01 ? -rel : -rel * Math.min(1, dt * 3));
        }
        st.z = Math.max(P.ROAD_Z0 + 6, Math.min(P.ROAD_Z1 - 6, st.z));
        seatAt(st.x, st.z, st.cy);
        if (st.engine && st.engine.setSpeed) st.engine.setSpeed(Math.abs(st.speed));
      }
      // Mason at the wheel
      function wheel(dt) {
        var gas = ctl.held('KeyW') || ctl.held('ArrowUp');
        var brake = ctl.held('KeyS') || ctl.held('ArrowDown');
        var steer = (ctl.held('KeyA') || ctl.held('ArrowLeft') ? 1 : 0) - (ctl.held('KeyD') || ctl.held('ArrowRight') ? 1 : 0);
        var top = Math.abs(st.x - P.ROAD_X) > LANE ? GRAVEL : TOP;
        if (gas && st.speed < -0.1) st.speed = Math.min(0, st.speed + BRAKE * dt); // rolling back: W brakes first
        else if (gas) st.speed += GAS * dt;
        else if (brake && st.speed > 0.1) st.speed = Math.max(0, st.speed - BRAKE * dt);
        else if (brake) st.speed = Math.max(-BACK, st.speed - 2 * dt); // stopped: S backs up, slowly
        else st.speed -= Math.sign(st.speed) * Math.min(Math.abs(st.speed), DRAG * dt);
        if (st.speed > top) st.speed = Math.max(top, st.speed - BRAKE * 0.5 * dt); // the gravel holds him back
        turn(steer * STEER * Math.max(-1, Math.min(1, st.speed / 6)) * dt); // steering needs speed, and swaps backing up
        move(dt);
        // parked on the road a while: Mason says so, once a drive
        st.idleT = Math.abs(st.speed) < 0.5 ? st.idleT + dt : 0;
        if (st.idleT > 20 && !st.nudged) {
          st.nudged = true;
          hud.say(t(st.dir > 0 ? 'day2.thought.driveNudgeOut' : 'day2.thought.driveNudgeHome'), 5000);
        }
      }
      // the car drives itself (the deer: Mason on the brake), straightening up as it goes
      function driveStep(dt, target) {
        st.speed += Math.max(-9 * dt, Math.min(4 * dt, target - st.speed));
        turn(-wrap(st.cy - st.base) * Math.min(1, dt * 2));
        move(dt);
      }

      function goShop() {
        st.stage = 'toShop';
        hud.fadeOut('');
        ctx.later(1.4, function () {
          stopSounds();
          stopDriving(); // out of the car: the shop's prompts work again
          hud.cc(null);
          ctx.setPhase('shop');
          car.group.position.set(PARKED.x, 0, PARKED.z);
          car.group.rotation.y = 0;
          ctl.stand();
          ctl.teleport(PARKED.x + 1.4, PARKED.z + 0.6, Math.PI, 0);
          cashier.show(true);
          phone.setShopping(shopping());
          st.stage = 'shop';
          hud.fadeIn();
          ctx.later(1.2, function () { hud.say(t('day2.thought.arrive')); });
        });
      }
      function goHome() {
        st.stage = 'toHome';
        hud.fadeOut('');
        ctx.later(1.4, function () {
          cashier.show(false);
          wes.show(false);
          ctx.setPhase('driveHome');
          car.headlights(true);
          startDrive(-1);
          st.stage = 'driveHome';
        });
      }

      var items = [
        {
          id: 'car',
          x: 10.95, y: 1.0, z: -9.7, radius: 0.6,
          label: 'Drive to the Gas-N-Go',
          enabled: function () { return ctx.phase() === 'errand' && !(ctx.mods.deputy && ctx.mods.deputy.busy()); },
          onUse: function () {
            st.stage = 'leaving';
            ctx.complete('store');
            hud.fadeOut('');
            ctx.later(1.4, function () {
              ctx.setPhase('driveOut');
              startDrive(1);
              st.stage = 'driveOut';
              loop('radio');
            });
          },
        },
        {
          id: 'grabDogFood',
          x: 396.62, y: 0.35, z: 5.75, radius: 0.3,
          label: 'Grab a bag of dog food',
          enabled: function () { return st.stage === 'shop' && !st.picked.dogFood; },
          onUse: function () {
            stock.dogFood.visible = false;
            pick('dogFood');
          },
        },
        {
          id: 'grabBatteries',
          x: 403.1, y: 1.05, z: 1.3, radius: 0.2,
          label: 'Grab batteries',
          enabled: function () { return st.stage === 'shop' && !st.picked.batteries; },
          onUse: function () {
            stock.batteries.visible = false;
            pick('batteries');
          },
        },
        {
          id: 'grabSnack',
          x: 400.3, y: 1.1, z: 3.8, radius: 0.35,
          label: 'Grab something for dinner',
          enabled: function () { return st.stage === 'shop' && !st.picked.snack && !phone.choosing(); },
          onUse: function () {
            phone
              .choice({
                prompt: t('day2.thought.snack'),
                options: [{ id: 'a', text: t('day2.snack.a') }, { id: 'b', text: t('day2.snack.b') }, { id: 'c', text: t('day2.snack.c') }],
              })
              .then(function (id) {
                if (id === 'cancel' || st.picked.snack) return;
                ctx.log('snack', { kind: id });
                pick('snack');
              });
          },
        },
        {
          id: 'grabMilk',
          x: 397.95, y: 1.1, z: 7.15, radius: 0.35,
          label: 'Grab milk',
          enabled: function () { return needMilk && st.stage === 'shop' && !st.picked.milk; },
          onUse: function () {
            ctx.sfx('fridgeHum', { gain: 0.3 });
            pick('milk');
          },
        },
        {
          id: 'board',
          x: 394.2, y: 1.45, z: 1.9, radius: 0.5,
          label: 'Read the bulletin board',
          enabled: function () { return st.stage === 'shop'; },
          onUse: function () {
            g.read(t('day2.note.boardTitle'), t('day2.note.board'), function () {
              if (!st.board) {
                st.board = true;
                ctx.log('sawPoster');
                hud.say(t('day2.thought.board'), 6500);
              }
            });
          },
        },
        {
          id: 'cashier',
          x: 404.0, y: 1.45, z: 0.66, radius: 0.35,
          label: function () { return allPicked() ? 'Pay' : 'Talk to the cashier'; },
          enabled: function () { return st.stage === 'shop' && !st.paid && !ctx.talking(); },
          onUse: function () {
            if (!allPicked()) {
              hud.speak('Cashier', t('day2.thought.wait'));
              return;
            }
            ctx.talk('cashier', {
              onLine: function (who, text) { if (who === 'Cashier') cashier.talk(OC.talk.lineTime(text)); },
              onEnd: function () {
                st.paid = true;
                ctx.complete('pay');
                ctx.reveal('driveHome');
              },
            });
          },
        },
        {
          id: 'shopCar',
          x: PARKED.x + 0.95, y: 1.0, z: PARKED.z, radius: 0.6,
          label: 'Drive home',
          enabled: function () { return st.stage === 'shop' && st.paid; },
          onUse: function () {
            ctx.complete('driveHome');
            goHome();
          },
        },
      ];

      // ---- the hooded shopper -----------------------------------------------------------------------
      function lookingAt(x, y, z) {
        var dx = x - ctl.pos.x;
        var dz = z - ctl.pos.z;
        var fx = -Math.sin(ctl.yaw);
        var fz = -Math.cos(ctl.yaw);
        var d = Math.hypot(dx, dz);
        if (d < 0.01) return true;
        var dot = (dx * fx + dz * fz) / d;
        return dot > Math.cos(0.4) && OC.sightline.lineOfSight(ctl.boxes, { x: ctl.pos.x, z: ctl.pos.z }, { x: x, z: z }, y);
      }
      function shopper(dt) {
        var picks = Object.keys(st.picked).length;
        if (st.wes === 'none') {
          if (picks >= 2 && ctl.pos.z < 2.6 && !st.paid) {
            st.wes = 'watching';
            st.wesT = 0;
            st.seenT = 0;
            wes.setPos(398.4, 6.85);
            wes.faceTo(ctl.pos.x, ctl.pos.z);
            wes.pose('stand', true);
            wes.crouch = 0;
            wes.raise = 0;
            wes.redEye(false);
            wes.show(true);
          }
          return;
        }
        if (st.wes === 'watching') {
          st.wesT += dt;
          wes.faceTo(ctl.pos.x, ctl.pos.z);
          if (st.wesT > 1.2) wes.pose('tilt');
          if (lookingAt(398.4, 1.7, 6.85)) st.seenT += dt;
          if (st.seenT > 1.4 || st.wesT > 10) {
            st.wes = 'leaving';
            wes.pose('stand');
            if (st.seenT > 1.4) hud.say(t('day2.thought.shopper'), 4000);
            ctx.log('sawShopper', { looked: st.seenT > 1.4 });
          }
          return;
        }
        if (st.wes === 'leaving') {
          var wp = wes.pos.z > 1.4 ? { x: 398.4, z: 1.3 } : wes.pos.x < 399.9 ? { x: 400.0, z: 1.2 } : { x: 400.0, z: -4 };
          wes.stepTo(wp.x, wp.z, 1.15, dt);
          if (wes.pos.z < 0.4 && !st.chimed) {
            st.chimed = true;
            ctx.sfx('chime', { pos: { x: 400, y: 2.2, z: 0.2 } });
          }
          if (wes.pos.z < -3.8) {
            wes.show(false);
            st.wes = 'gone';
            ctx.later(1.5, function () { hud.say(t('day2.thought.shopperGone'), 5000); });
          }
        }
      }

      // ---- the drive home: the deer, then the man at the roadside -------------------------------------
      function driveHome(dt) {
        var ahead = st.z - DEER_Z; // the car drives -z: distance to the deer
        if (st.deer === 'none') {
          wheel(dt);
          if (ahead < 48 && ahead > 0) {
            st.deer = 'standing';
            st.deerT = 0;
            deer.group.visible = true;
            deer.group.position.set(P.ROAD_X - 1.6, 0, DEER_Z);
            deer.group.rotation.y = Math.PI / 2; // side-on, across the lane
            deer.head.rotation.y = -Math.PI / 2; // looking into the lights
            ctx.sfx('brakes');
          }
          return;
        }
        if (st.deer === 'standing') {
          st.deerT += dt;
          // Mason stands on the brake, whatever he was doing: slowing to a stop 13 m short, never speeding up
          driveStep(dt, Math.min(Math.max(0, st.speed), ahead > 13 ? Math.max(0, (ahead - 13) * 0.9) : 0));
          if (st.deerT > 4.2) {
            st.deer = 'bolting';
            st.deerT = 0;
            deer.head.rotation.y = 0;
            deer.group.rotation.y = -Math.PI / 2;
            // and he is there, on the other side, where the deer was looking from
            wes.setPos(P.ROAD_X + 4.6, DEER_Z - 9);
            wes.faceTo(st.x, st.z);
            wes.pose('stand', true);
            wes.crouch = 0;
            wes.raise = 0;
            wes.show(true);
            ctx.later(1.2, function () { hud.say(t('day2.thought.deer')); });
          }
          return;
        }
        if (st.deer === 'bolting') {
          st.deerT += dt;
          deer.group.position.x -= 9 * dt;
          deer.group.position.y = Math.abs(Math.sin(st.deerT * 9)) * 0.35;
          driveStep(dt, 0);
          wes.faceTo(ctl.pos.x, ctl.pos.z);
          if (st.deerT > 1.4) deer.group.visible = false;
          if (st.deerT > 4.6) {
            st.deer = 'passing';
            ctx.log('sawRoadside');
            wes.pose('tilt');
          }
          return;
        }
        if (st.deer === 'passing') {
          wheel(dt); // the wheel is his again
          if (st.wesGo) {
            // stared at, he backs off the shoulder into the trees, still facing the car
            wes.stepTo(P.ROAD_X + 14, wes.pos.z, 1.4, dt);
            wes.faceTo(ctl.pos.x, ctl.pos.z);
            if (wes.pos.x > P.ROAD_X + 11) {
              wes.show(false);
              hud.say(t('day2.thought.roadsideStare'), 6500);
              st.deer = 'past';
              st.pastZ = st.z;
            }
            return;
          }
          wes.faceTo(ctl.pos.x, ctl.pos.z); // his head turns to follow the car
          st.stareT = Math.abs(st.speed) < 0.5 ? (st.stareT || 0) + dt : 0;
          if (st.stareT > 5) st.wesGo = true; // stopped to look at him: he goes
          if (wes.visible() && st.z < DEER_Z - 30) {
            wes.show(false);
            hud.say(t('day2.thought.roadside'), 6000);
            st.deer = 'past';
            st.pastZ = st.z;
          }
          return;
        }
        if (st.deer === 'past') {
          wheel(dt);
          if (st.stage === 'driveHome' && (st.pastZ - st.z > 110 || st.z < P.ROAD_Z0 + 12)) {
            st.stage = 'ending';
            stopSounds();
            st.engine = null;
            ctx.finish();
          }
        }
      }

      return {
        items: items,
        state: st,
        list: LIST,
        allPicked: allPicked,
        DEER_Z: DEER_Z,
        update: function (dt) {
          cashier.update(dt);
          if (st.stage === 'driveOut') {
            wheel(dt);
            st.radioT -= dt;
            if (st.radioT <= 0 && st.radioI < RADIO.length - 1) {
              st.radioI++;
              st.radioT = 5.2;
              hud.cc(t(RADIO[st.radioI]));
            }
            if (st.z > P.ROAD_Z1 - 70 && st.radioI >= RADIO.length - 1) goShop();
            else if (st.z > P.ROAD_Z1 - 20) goShop();
          } else if (st.stage === 'shop') {
            shopper(dt);
          } else if (st.stage === 'driveHome' || st.stage === 'ending') {
            driveHome(dt);
          }
        },
        dispose: function () {
          stopSounds();
          hud.cc(null);
          cashier.show(false);
          deer.group.visible = false;
          car.group.position.set(home.x, 0, home.z);
          car.group.rotation.y = home.ry;
          car.headlights(false);
          wes.show(false);
          stopDriving();
        },
      };
    },
  };
})();
