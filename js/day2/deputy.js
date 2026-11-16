// Day 2, the deputy decision. If Mason calls Ray and asks him to come out, a cruiser pulls into the
// driveway twenty minutes later (about half a minute of game time), Ray knocks, and he gives Mason the
// tour he asked for: every clue gets a reasonable explanation. The guest closet is empty. The hatch is
// padlocked: "Rats can't pick locks." The vent screen: "Raccoons." Then he leaves, friendly, and
// Mason says the worst thing about it was how nice he was. Logs rayVisited (calledDeputy is logged by
// the call itself).
(function () {
  var OC = (window.OC = window.OC || {});
  OC.day2 = OC.day2 || {};

  var PARK = { x: 10, z: -16 }; // behind Mason's car, facing the house
  var ROAD = { x: 10, z: -36 };
  var EYE = 1.65;
  // where everyone stands for each stop on the tour (the node ids of talkData.rayVisit)
  var STOPS = {
    door: { ray: [2.5, -1.05], mason: [2.5, 1.45], fade: false },
    closet: { ray: [1.35, 16.7], rayLook: [1.0, 18], mason: [3.4, 15.2], look: [1.3, 1.3, 17.6] },
    hatch: { ray: [1.75, 11.35], rayLook: [2.5, 10.5], mason: [3.5, 12.1], look: [2.5, 0.1, 10.5] },
    vent: { ray: [4.95, -1.6], rayLook: [5.6, -0.12], mason: [6.7, -2.7], look: [5.6, 0.3, -0.12] },
    bye: { ray: [8.6, -14.2], mason: [7.0, -12.3] },
  };
  var RAY_LOOK = {
    shirt: 0x9a8a62, pants: 0x3d3b30, skinLight: '#d4a585', skinDark: '#94674f', hair: '#5a4632',
    hat: 'campaign', badge: true, moustache: true, height: 1.86,
  };

  OC.day2.deputy = {
    TEXT: ['day2.thought.cruiser', 'day2.thought.knock', 'day2.vo.ray'],
    create: function (g, ctx) {
      var t = g.t;
      var hud = g.hud;
      var ctl = g.ctl;
      var cooper = g.cooper;
      var props = g.props;
      var scene = g.render.scene;
      var st = { stage: 'none', carT: 0, knocks: 0, nextKnock: 0, talk: null };

      var car = ctx.once('policeCar', function () {
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
        scene.add(grp);
        return grp;
      });
      var ray = ctx.once('ray', function () { return OC.person.create(scene, RAY_LOOK); });
      car.visible = false;
      ray.show(false);

      function carAt(z) {
        car.position.set(PARK.x, 0, z);
        car.rotation.y = 0;
      }
      function look(x, y, z) {
        var dx = x - ctl.pos.x;
        var dz = z - ctl.pos.z;
        ctl.yaw = Math.atan2(-dx, -dz);
        ctl.pitch = Math.atan2(y - EYE, Math.hypot(dx, dz));
      }
      function stand(stop) {
        var s = STOPS[stop];
        ray.setPos(s.ray[0], s.ray[1]);
        ctl.teleport(s.mason[0], s.mason[1]);
        if (s.rayLook) ray.faceTo(s.rayLook[0], s.rayLook[1]);
        else ray.faceTo(s.mason[0], s.mason[1]);
        if (s.look) look(s.look[0], s.look[1], s.look[2]);
        else look(s.ray[0], 1.7, s.ray[1]);
        cooper.setPos(s.mason[0] + 0.7, s.mason[1] - 0.3);
        cooper.headTo({ x: s.ray[0], y: 1.2, z: s.ray[1] });
      }
      // move everyone to a stop behind a quick fade; the promise resolves when the picture is back
      function moveTo(stop) {
        if (STOPS[stop] && STOPS[stop].fade === false) {
          stand(stop);
          return null;
        }
        if (!STOPS[stop]) return null;
        return new Promise(function (resolve) {
          hud.fadeOut('');
          ctx.later(1.0, function () {
            stand(stop);
            hud.fadeIn();
            ctx.later(0.7, resolve);
          });
        });
      }

      function startTour() {
        st.stage = 'tour';
        g.state.cutscene = true;
        ctl.frozen = true;
        props.frontDoor.open();
        cooper.follow();
        cooper.wag(1, 5);
        st.talk = ctx.talk('rayVisit', {
          onNode: moveTo,
          onLine: function (who, text) {
            if (who === 'Ray') ray.talk(OC.talk.lineTime(text));
          },
          onEnd: function () {
            st.stage = 'leaving';
            g.state.cutscene = false;
            ctl.frozen = false;
            props.frontDoor.close();
            ctx.log('rayVisited');
            ray.walkTo(PARK.x + 1.1, PARK.z, null, function () {
              ray.show(false);
              st.stage = 'driving off';
              st.carT = 0;
              if (OC.audio) st.engine = OC.audio.play('engine', { pos: { x: PARK.x, y: 0.5, z: PARK.z } });
            });
          },
        });
      }

      var items = [
        {
          id: 'answerDoor',
          x: 2.5, y: 1.1, z: 0.12, radius: 0.5,
          label: 'Answer the door',
          enabled: function () { return st.stage === 'knocking'; },
          onUse: startTour,
        },
      ];

      return {
        items: items,
        state: st,
        busy: function () {
          return st.stage !== 'none' && st.stage !== 'done';
        },
        // Ray said he's coming
        dispatch: function () {
          if (st.stage !== 'none') return;
          st.stage = 'coming';
          ctx.later(28, function () {
            if (st.stage !== 'coming') return;
            st.stage = 'arriving';
            st.carT = 0;
            car.visible = true;
            carAt(ROAD.z);
            if (OC.audio) st.engine = OC.audio.play('engine', { pos: { x: PARK.x, y: 0.5, z: ROAD.z } });
            hud.say(t('day2.thought.cruiser'));
          });
        },
        update: function (dt) {
          ray.update(dt);
          if (st.stage === 'arriving') {
            st.carT = Math.min(1, st.carT + dt / 6);
            var k = 1 - Math.pow(1 - st.carT, 3);
            carAt(ROAD.z + (PARK.z - ROAD.z) * k);
            if (st.carT >= 1) {
              if (st.engine) st.engine.stop();
              st.stage = 'walking';
              ray.setPos(PARK.x + 1.1, PARK.z);
              ray.show(true);
              ray.walkTo(2.5, -2.9, null, function () {
                ray.faceTo(2.5, 0);
                st.stage = 'knocking';
                st.nextKnock = 0;
              });
            }
          } else if (st.stage === 'knocking') {
            st.nextKnock -= dt;
            if (st.nextKnock <= 0) {
              st.nextKnock = 16;
              ctx.sfx('knock', { pos: { x: 2.5, y: 1.2, z: 0 }, count: 4, gain: 1.2 });
              if (st.knocks++ === 0) ctx.later(1.4, function () { hud.say(t('day2.thought.knock')); });
            }
          } else if (st.stage === 'driving off') {
            st.carT = Math.min(1, st.carT + dt / 6);
            var e = st.carT * st.carT;
            carAt(PARK.z + (ROAD.z - PARK.z) * e);
            if (st.carT >= 1) {
              if (st.engine) st.engine.stop();
              car.visible = false;
              st.stage = 'done';
              ctx.later(2, function () { hud.say(t('day2.vo.ray'), 6000); });
            }
          }
        },
        dispose: function () {
          if (st.talk) st.talk.stop();
          if (st.engine) st.engine.stop();
          car.visible = false;
          ray.show(false);
        },
      };
    },
  };
})();
