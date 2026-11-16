// The pet cam: a cheap night-vision camera high in the living room corner, watching Cooper's bed.
// It renders the real scene into a tiny target a few times a second, only while someone is watching
// it on the phone, and draws it green-grey with a timestamp.
(function () {
  var OC = (window.OC = window.OC || {});
  var W = 160;
  var H = 90;
  var FPS = 5;

  function create(r) {
    var cam = new THREE.PerspectiveCamera(74, W / H, 0.05, 60);
    cam.position.set(25.6, 2.3, 0.4);
    cam.lookAt(19.5, 0.4, 5.2);
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

    var api = {
      canvas: canvas,
      on: false,
      frames: 0,
      lastBrightness: 0,
      update: function (dt, clockLabel) {
        label = clockLabel || label;
        if (!api.on) return;
        acc += dt;
        if (acc < 1 / FPS) return;
        acc = 0;
        api.renderNow();
      },
      renderNow: function () {
        var renderer = r.renderer;
        renderer.setRenderTarget(rt);
        renderer.render(r.scene, cam);
        renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
        renderer.setRenderTarget(null);
        var d = img.data;
        var total = 0;
        for (var y = 0; y < H; y++) {
          var src = (H - 1 - y) * W * 4; // the target is upside down
          for (var x = 0; x < W; x++) {
            var i = src + x * 4;
            var lum = (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) * 3.2 + 14 + (Math.random() - 0.5) * 22;
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
        ctx.fillText('● LIVE', 4, H - 4);
        api.lastBrightness = total / (W * H);
        api.frames++;
      },
    };
    return api;
  }

  OC.petcam = { create: create };
})();
