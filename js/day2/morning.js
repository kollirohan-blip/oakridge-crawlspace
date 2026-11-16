// Day 2, the morning: sunlight, the clearest switch to safety. Cooper naps in a warm patch of light,
// there is coffee, and the calls: Mom (warm and funny), Dave ("I didn't write that. What pipes?"),
// who gives Mason Deputy Ray's number, and Ethan, who sends a link about phrogging. One small
// wrongness: the pet cam saved a 3:40 AM clip of itself being slowly turned to face the wall.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.day2 = OC.day2 || {};

  var CONTACTS = [
    { id: 'mom', name: 'Mom' },
    { id: 'dave', name: 'Uncle Dave' },
    { id: 'ethan', name: 'Ethan' },
  ];
  var NAP = { x: 21.3, z: 5.3 }; // where the sun lands on the living room floor

  OC.day2.morning = {
    CONTACTS: CONTACTS,
    TEXT: [
      'day2.vo.open', 'day2.notify.clip', 'day2.thought.clip', 'day2.thought.turnCam', 'day2.thought.coffee',
      'day2.thought.nap', 'day2.thought.lowFood', 'day2.sms.mom', 'day2.sms.dave', 'day2.sms.daveRay',
      'day2.sms.ethanLink', 'day2.sms.ethanLink2', 'day2.article.title', 'day2.article', 'day2.thought.article',
    ],
    create: function (g, ctx) {
      var t = g.t;
      var hud = g.hud;
      var phone = g.phone;
      var cooper = g.cooper;
      var props = g.props;
      var decor = props.decor;
      var st = { clip: 'none', camFixed: false, napping: true, linkSent: false, rayNumber: false, rayCalled: false, readArticle: false };

      // the patch of sun on the living room floor, and Cooper asleep in it
      var patch = ctx.once('sunpatch', function () {
        var m = new THREE.Mesh(
          new THREE.PlaneGeometry(1.9, 1.2),
          new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = 0.35;
        g.world.group.add(m);
        return m;
      });
      patch.position.set(NAP.x, 0.014, NAP.z);
      patch.visible = true;
      cooper.setPos(NAP.x, NAP.z);
      cooper.stay();
      cooper.pose('lie');
      cooper.wag(null);

      // somebody turned the pet cam to the wall in the night; by day its picture is not boosted
      g.petcam.setTurned(true);
      decor.petcamDevice.turn(true);
      g.petcam.gain = 1.05;
      g.petcam.clipGain = 2.2;
      var R = g.render;
      g.petcam.beforeRender = function (isClip) {
        if (isClip) g.world.setDaylight(0, R.renderer); // the clip is from 3:40 AM
      };
      g.petcam.afterRender = function (isClip) {
        if (isClip) g.world.setDaylight(ctx.daylight(), R.renderer);
      };

      function contacts() {
        return st.rayNumber ? CONTACTS.concat([{ id: 'ray', name: 'Deputy Ray' }]) : CONTACTS;
      }
      function giveNumber() {
        if (st.rayNumber) return;
        st.rayNumber = true;
        ctx.later(4, function () {
          phone.deliver('dave', 'Uncle Dave', t('day2.sms.daveRay'));
          phone.setContacts(contacts());
        });
      }
      function sendLink() {
        if (st.linkSent) return;
        st.linkSent = true;
        phone.deliver('ethan', 'Ethan', t('day2.sms.ethanLink'), { title: t('day2.article.title'), body: t('day2.article') });
        ctx.later(5, function () { phone.deliver('ethan', 'Ethan', t('day2.sms.ethanLink2')); });
      }

      var items = [
        {
          id: 'napCooper',
          x: NAP.x, y: 0.3, z: NAP.z, radius: 0.5,
          label: 'Pet Cooper',
          enabled: function () { return st.napping; },
          onUse: function () {
            st.napping = false;
            ctx.log('petCooper', { when: 'nap' });
            cooper.wag(1, 4);
            hud.say(t('day2.thought.nap'));
            ctx.later(3, function () {
              cooper.pose('stand');
              cooper.follow();
            });
          },
        },
        {
          id: 'coffee',
          x: 11.5, y: 1.05, z: 0.33, radius: 0.25,
          label: 'Make coffee',
          hold: 1.2,
          enabled: function () { return !ctx.done('coffee'); },
          onUse: function () {
            var pour = ctx.sfx('water');
            ctx.later(1.6, function () { pour.stop(); });
            ctx.complete('coffee');
            ctx.log('coffee');
            ctx.later(2.5, function () { hud.say(t('day2.thought.coffee')); });
          },
        },
        {
          id: 'bowl',
          x: 11.2, y: 0.14, z: 6.9, radius: 0.3,
          label: 'Feed Cooper',
          enabled: function () { return !ctx.done('feedCooper'); },
          onUse: function () {
            ctx.sfx('kibble', { pos: { x: 11.2, y: 0.2, z: 6.9 } });
            props.bowl.setFilled(true);
            st.napping = false;
            cooper.pose('stand');
            cooper.goTo(11.2, 6.35, function () {
              cooper.eat(4, function () {
                props.bowl.setFilled(false);
                cooper.follow();
              });
            });
            ctx.complete('feedCooper');
            ctx.log('fedCooper', { day: 2 });
            ctx.later(1.5, function () { hud.say(t('day2.thought.lowFood')); });
          },
        },
        {
          id: 'turnCam',
          x: decor.petcamDevice.at.x, y: decor.petcamDevice.at.y, z: decor.petcamDevice.at.z, radius: 0.18,
          label: 'Turn the pet cam back',
          enabled: function () { return g.petcam.turned() && !g.petcam.playingClip(); },
          onUse: function () {
            st.camFixed = true;
            g.petcam.setTurned(false);
            decor.petcamDevice.turn(false);
            ctx.sfx('click', { gain: 0.6 });
            ctx.complete('turnCam');
            hud.say(t('day2.thought.turnCam'));
          },
        },
      ];

      return {
        items: items,
        state: st,
        contacts: contacts,
        // a call from the Calls app
        call: function (id) {
          if (id === 'mom') {
            return ctx.call('mom', 'Mom', { onEnd: function () { ctx.complete('callMom'); } });
          }
          if (id === 'dave') {
            return ctx.call('dave', 'Uncle Dave', {
              log: function (a) { if (a === 'gotRaysNumber') giveNumber(); },
              onEnd: function () {
                ctx.complete('callDave');
                giveNumber();
              },
            });
          }
          if (id === 'ethan') return ctx.call('ethan', 'Ethan', { onEnd: sendLink });
          if (id === 'ray') {
            if (st.rayCalled) return ctx.call('rayAgain', 'Deputy Ray');
            st.rayCalled = true;
            return ctx.call('ray', 'Deputy Ray', {
              onEnd: function (logs) {
                if (logs.indexOf('calledDeputy') >= 0 && ctx.mods.deputy) ctx.mods.deputy.dispatch();
              },
            });
          }
          return false;
        },
        onLink: function () {
          if (st.readArticle) return;
          st.readArticle = true;
          ctx.log('readArticle');
          ctx.later(1, function () { hud.say(t('day2.thought.article')); });
        },
        update: function (dt) {
          var e = ctx.flags.elapsed;
          if (st.clip === 'none' && e > 8) {
            st.clip = 'ready';
            phone.notify('Pet Cam', t('day2.notify.clip'));
            if (OC.audio) OC.audio.play('buzz', { gain: 0.8 });
            ctx.reveal('petcam');
          }
          if (e > 20 && !ctx.flags.momTexted) {
            ctx.flags.momTexted = true;
            phone.deliver('mom', 'Mom', t('day2.sms.mom'));
            ctx.reveal('callMom');
          }
          if (e > 34 && !ctx.flags.daveTexted) {
            ctx.flags.daveTexted = true;
            phone.deliver('dave', 'Uncle Dave', t('day2.sms.dave'));
            ctx.reveal('callDave');
          }
          if (e > 70) sendLink();
          // the clip plays the first time the pet cam is opened after the alert
          if (st.clip === 'ready' && phone.isOpen && phone.currentApp() === 'petcam') {
            st.clip = 'playing';
            g.petcam.playClip('3:40 AM');
          } else if (st.clip === 'playing' && !g.petcam.playingClip()) {
            st.clip = 'seen';
            g.petcam.setTurned(!st.camFixed); // the live picture: still the wall, unless Mason fixed it
            ctx.complete('petcam');
            ctx.reveal('turnCam');
            ctx.log('sawClip');
            hud.say(t('day2.thought.clip'), 7000);
          }
        },
        dispose: function () {
          patch.visible = false;
        },
      };
    },
  };
})();
