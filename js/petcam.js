// The pet cam: a cheap night-vision camera high in the living room corner, watching Cooper's bed.
// It renders the real scene into a tiny target a few times a second, only while someone is watching
// it on the phone, and draws it green-grey with a timestamp.
(function () {
  var OC = (window.OC = window.OC || {});
  var W = 240;
  var H = 135;
  var FPS = 5;

  function create(r) {
    var cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 13); // a cheap IR camera sees the room, not the house
    cam.position.set(25.55, 2.1, 1.2); // on top of the bookshelf
    cam.lookAt(21.9, 0.3, 6.3); // Cooper's bed, with the way to the kitchen and hall beyond it
    // its infrared lamp: on only while the pet cam renders, so it lights the room for the feed alone
    var ir = new THREE.PointLight(0xffffff, 0, 14, 1.3);
    ir.position.copy(cam.position);
    r.scene.add(ir);
    var rt = new THREE.WebGLRenderTarget(W, H);
    var buf = new Uint8Array(W * H * 4);
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.className = 'petcam';
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(W, H);
    var acc = 1;
    var label = '';
    var FACING = new THREE.Vector3(21.9, 0.3, 6.3); // Cooper's bed
    var WALL = new THREE.Vector3(25.9, 1.6, -2); // the corner: what it saw after someone turned it
    var turned = 0; // 0 facing the room .. 1 facing the wall
    var clip = null; // { t, label }
    function aim() {
      var at = FACING.clone().lerp(WALL, turned);
      cam.lookAt(at);
    }

    var api = {
      canvas: canvas,
      on: false,
      frames: 0,
      lastBrightness: 0,
      // turned to face the wall (Day 2), or back
      setTurned: function (v) {
        turned = v ? 1 : 0;
        aim();
      },
      turned: function () {
        return turned > 0.5;
      },
      // play a saved clip: the camera being turned slowly to the wall, at this time of night
      playClip: function (timeLabel) {
        clip = { t: 0, label: timeLabel };
        turned = 0;
        aim();
      },
      playingClip: function () {
        return !!clip;
      },
      update: function (dt, clockLabel) {
        label = clockLabel || label;
        if (clip) {
          clip.t += dt;
          turned = Math.min(1, Math.max(0, (clip.t - 1.5) / 6));
          aim();
          label = clip.label;
          if (clip.t > 9) clip = null;
        }
        if (!api.on) return;
        acc += dt;
        if (acc < 1 / FPS) return;
        acc = 0;
        api.renderNow();
      },
      gain: 2.2, // how hard the night vision boosts the picture (lower in daylight)
      beforeRender: null, // (isClip) a hook to change the scene for the camera alone (a night clip by day)
      afterRender: null,
      renderNow: function () {
        var renderer = r.renderer;
        var isClip = !!clip;
        if (api.beforeRender) api.beforeRender(isClip);
        var boost = isClip && api.clipGain ? api.clipGain : api.gain;
        ir.intensity = 1.3;
        renderer.setRenderTarget(rt);
        renderer.render(r.scene, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
        renderer.setRenderTarget(null);
        ir.intensity = 0;
        if (api.afterRender) api.afterRender(isClip);
        var d = img.data;
        var total = 0;
        for (var y = 0; y < H; y++) {
          var src = (H - 1 - y) * W * 4; // the target is upside down
          for (var x = 0; x < W; x++) {
            var i = src + x * 4;
            var lum = (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) * boost + 12 + (Math.random() - 0.5) * 22;
            lum = Math.max(0, Math.min(255, lum));
            var o = (y * W + x) * 4;
            d[o] = lum * 0.72;
            d[o + 1] = lum;
            d[o + 2] = lum * 0.68;
            d[o + 3] = 255;
            total += lum;
          }
        }
        ctx.putImageData(img, 0, 0);
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(230,255,230,0.9)';
        ctx.fillText('LIVING ROOM', 4, 9);
        ctx.fillText(label, W - 4 - ctx.measureText(label).width, 9);
        ctx.fillStyle = '#ff4a3a';
        ctx.fillText(clip ? '▶ SAVED CLIP' : '● LIVE', 4, H - 4);
        api.lastBrightness = total / (W * H);
        api.frames++;
      },
    };
    return api;
  }

  OC.petcam = { create: create };
})();
