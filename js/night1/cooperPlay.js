// Night one with Cooper: feed him (one scoop; he begs for two), pet him, tricks (sit, paw, play dead),
// fetch with the tennis ball. And the contradiction: he will not set foot in the laundry room. Coax
// him and he sniffs the hatch, wags once, then backs out with his ears flat.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = [
    'n1.coop.menu', 'n1.coop.pet', 'n1.coop.sit', 'n1.coop.paw', 'n1.coop.playDead', 'n1.coop.never',
    'n1.coop.pet1', 'n1.coop.pet2', 'n1.coop.pet3', 'n1.coop.sitLine', 'n1.coop.pawLine', 'n1.coop.deadLine',
    'n1.coop.scoop', 'n1.coop.needScoop', 'n1.coop.bowl', 'n1.coop.beg2', 'n1.coop.twoScoops',
    'n1.coop.ball', 'n1.coop.fetch1', 'n1.coop.fetch2', 'n1.coop.refuseBall',
    'n1.coop.refuse', 'n1.coop.coax1', 'n1.coop.coax2',
  ];
  var LAUNDRY = { x0: 0, x1: 5, z0: 8, z1: 13 };
  var WAIT = { x: 5.7, z: 10.5 };
  var HATCH_SNIFF = { x: 3.35, z: 10.5 };
  var BIN = { x: 12.4, y: 0.78, z: 7.0 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var cooper = g.cooper;
    var props = g.props;
    var ctl = g.ctl;
    var ball = props.decor.ball;

    var st = { scoop: false, fed: false, eating: false, second: false, petCount: 0, refusedSeen: false, coaxing: false, fetches: 0, fetching: false };
    function say(id, ms) {
      hud.say(t(id), ms);
    }

    cooper.setAvoid(LAUNDRY, WAIT);
    ball.onBounce = function (p) {
      ctx.sfx('bounce', { pos: { x: p.x, y: 0.1, z: p.z }, gain: 0.7 });
    };

    function trick(id) {
      if (id === 'pet') {
        st.petCount++;
        cooper.pose('sit');
        cooper.wag(0.6, 1.6);
        say('n1.coop.pet' + (((st.petCount - 1) % 3) + 1));
        ctx.log('petCooper');
        ctx.tension.relieve(12);
      } else if (id === 'sit') {
        cooper.pose('sit');
        say('n1.coop.sitLine');
        ctx.log('trick', { kind: 'sit' });
      } else if (id === 'paw') {
        cooper.pose('paw');
        say('n1.coop.pawLine');
        ctx.log('trick', { kind: 'paw' });
      } else if (id === 'playDead') {
        cooper.pose('playDead');
        say('n1.coop.deadLine');
        ctx.log('trick', { kind: 'playDead' });
      } else return;
      ctx.later(4, function () {
        if (cooper.mode === 'follow' || cooper.mode === 'idle') {
          cooper.wag(null);
          cooper.pose('stand');
        }
      });
    }

    function coax() {
      st.coaxing = true;
      cooper.setAvoid(null);
      say('n1.coop.coax1', 5000);
      cooper.sniff(HATCH_SNIFF, function () {
        cooper.wag(0.35, 0.5); // one slow wag
        ctx.later(1.1, function () {
          cooper.wag(0);
          cooper.ears(true);
          say('n1.coop.coax2', 7000);
          ctx.log('coaxedCooper');
          cooper.goTo(WAIT.x, WAIT.z, function () {
            cooper.follow();
            cooper.ears(true);
            cooper.wag(0.05);
            cooper.setAvoid(LAUNDRY, WAIT);
            st.coaxing = false;
            ctx.later(8, function () {
              cooper.ears(false);
              cooper.wag(null);
            });
          });
        });
      });
    }

    function busy() {
      return cooper.mode === 'goto' || cooper.mode === 'eat' || cooper.mode === 'fetch' || cooper.mode === 'sniff' || st.coaxing;
    }

    var dogItem = {
      id: 'cooper', x: 15.5, y: 0.7, z: 5.5, radius: 0.35,
      label: function () { return cooper.waiting ? 'Call Cooper in' : 'Cooper'; },
      enabled: function () { return !busy() && !g.state.cutscene; },
      onUse: function () {
        if (cooper.waiting) return coax();
        g.phone.choice({
          prompt: t('n1.coop.menu'),
          options: [
            { id: 'pet', text: t('n1.coop.pet') },
            { id: 'sit', text: t('n1.coop.sit') },
            { id: 'paw', text: t('n1.coop.paw') },
            { id: 'playDead', text: t('n1.coop.playDead') },
            { id: 'never', text: t('n1.coop.never') },
          ],
        }).then(trick);
      },
    };
    var throwItem = {
      id: 'throw', x: 0, y: 1.2, z: 0, radius: 0.6,
      label: 'Throw the ball',
      enabled: function () { return ball.held; },
      onUse: function () {
        var cam = { x: ctl.pos.x, y: g.camera.position.y, z: ctl.pos.z, yaw: ctl.yaw, pitch: ctl.pitch };
        ball.throwFrom(cam);
        st.fetching = true;
        cooper.fetch(ball, function (how) {
          st.fetching = false;
          if (how === 'done') {
            st.fetches++;
            say(st.fetches === 1 ? 'n1.coop.fetch1' : 'n1.coop.fetch2');
            ctx.log('fetch');
            cooper.wag(0.6, 2);
            ctx.later(3, function () { cooper.wag(null); });
          } else if (how === 'refused') {
            say('n1.coop.refuseBall', 7000);
          }
        });
      },
    };

    var items = [
      dogItem,
      {
        id: 'bin', x: BIN.x, y: BIN.y, z: BIN.z, radius: 0.35,
        label: function () { return st.fed ? 'Give him a second scoop' : "Scoop Cooper's food"; },
        enabled: function () {
          if (st.scoop || st.eating) return false;
          return !st.fed || !st.second;
        },
        onUse: function () {
          st.scoop = true;
          ctx.sfx('kibble', { pos: BIN, gain: 0.7 });
          if (st.fed) {
            st.second = true;
            say('n1.coop.twoScoops', 6000);
            ctx.log('twoScoops');
          } else say('n1.coop.scoop');
        },
      },
      {
        id: 'bowl', x: 11.2, y: 0.14, z: 6.9, radius: 0.3,
        label: "Fill Cooper's bowl",
        enabled: function () { return st.scoop && !st.eating; },
        onUse: function () {
          st.scoop = false;
          st.eating = true;
          props.bowl.setFilled(true);
          ctx.sfx('kibble', { pos: { x: 11.2, y: 0.2, z: 6.9 }, gain: 0.6 });
          var second = st.fed;
          if (!second) say('n1.coop.bowl');
          cooper.goTo(11.2, 6.2, function () {
            cooper.eat(second ? 3 : 4, function () {
              st.eating = false;
              props.bowl.setFilled(false);
              if (second) return;
              st.fed = true;
              ctx.complete('feedCooper');
              ctx.log('fedCooper');
              // and then the con begins
              ctx.later(1.5, function () {
                if (cooper.mode !== 'follow') return;
                cooper.stare(BIN);
                ctx.sfx('whine', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z } });
                say('n1.coop.beg2', 6500);
                ctx.later(6, function () { cooper.stare(null); });
              });
            });
          });
        },
      },
      {
        id: 'ball', x: ball.pos.x, y: 0.1, z: ball.pos.z, radius: 0.18,
        label: 'Pick up the ball',
        enabled: function () { return !ball.held && !ball.moving && !ball.carried && !st.fetching; },
        onUse: function () {
          if (!st.ballSeen) say('n1.coop.ball');
          st.ballSeen = true;
          ball.pickUp();
        },
      },
      throwItem,
    ];

    var api = {
      items: items,
      state: st,
      update: function () {
        // the dog and the ball move: keep their prompts on them
        var hx = Math.cos(cooper.heading) * 0.55;
        var hz = -Math.sin(cooper.heading) * 0.55;
        dogItem.x = cooper.pos.x + hx;
        dogItem.z = cooper.pos.z + hz;
        items[3].x = ball.pos.x;
        items[3].y = ball.pos.y + 0.04;
        items[3].z = ball.pos.z;
        // "throw" sits just ahead of Mason while he holds the ball
        throwItem.x = ctl.pos.x - Math.sin(ctl.yaw) * 1.0;
        throwItem.z = ctl.pos.z - Math.cos(ctl.yaw) * 1.0;
        throwItem.y = g.camera.position.y - 0.25;
        if (cooper.waiting && !st.refusedSeen && ctx.flags.room === 'laundry') {
          st.refusedSeen = true;
          ctx.later(1, function () { say('n1.coop.refuse', 7000); });
          ctx.log('cooperRefused');
        }
      },
      dispose: function () {
        cooper.setAvoid(null);
        ball.onBounce = null;
      },
    };
    return api;
  }

  OC.night1.cooperPlay = { create: create, TEXT: TEXT };
})();
