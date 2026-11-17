// The phone camera: a flash photo of whatever Mason is looking at, saved to the album. The act can
// stage something for the photo only (beforeShot), which is how a flash shows what the room does not.
(function () {
  var OC = (window.OC = window.OC || {});
  var W = 320;
  var H = 180;

  function create(g, r) {
    // the flash: a light that is always in the scene (adding one later would recompile every material)
    var flash = new THREE.PointLight(0xf4f6ff, 0, 26, 1.4);
    r.scene.add(flash);
    var overlay = document.getElementById('flash');
    var cooldown = 0;

    var api = {
      album: [],
      // fn(cam) -> null | { subject, undo(), flash? }: called just before the picture is taken (flash: a
      // strength for this shot, 1 = normal; something close needs less or it burns out)
      beforeShot: null,
      shoot: function () {
        if (cooldown > 0) return null;
        cooldown = 0.8;
        if (g.audio) g.audio.play('shutter', { gain: 0.8 });
        var cam = { x: g.ctl.pos.x, y: r.camera.position.y, z: g.ctl.pos.z, yaw: g.ctl.yaw, pitch: g.ctl.pitch };
        var staged = api.beforeShot ? api.beforeShot(cam) : null;
        var spot = g.ctl.light.spot;
        var spotWas = spot.intensity;
        flash.position.copy(r.camera.position);
        var k = staged && staged.flash ? staged.flash : 1;
        flash.intensity = 1.7 * k;
        spot.intensity = 3.4 * k;
        r.render();
        // copy the frame while it is still in the drawing buffer (same task as the render)
        var src = r.renderer.domElement;
        var c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        var sh = Math.min(src.height, Math.round((src.width * H) / W));
        var sw = Math.round((sh * W) / H);
        c.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, W, H);
        flash.intensity = 0;
        spot.intensity = spotWas;
        if (staged && staged.undo) staged.undo();
        overlay.classList.remove('on');
        void overlay.offsetWidth; // restart the flash animation
        overlay.classList.add('on');
        var photo = { canvas: c, url: c.toDataURL(), at: g.clock ? g.clock.label() : '', subject: (staged && staged.subject) || null };
        api.album.push(photo);
        g.phone.addPhoto(photo);
        if (api.onPhoto) api.onPhoto(photo);
        return photo;
      },
      onPhoto: null,
      update: function (dt) {
        cooldown = Math.max(0, cooldown - dt);
      },
      reset: function () {
        cooldown = 0;
        api.beforeShot = null;
        api.onPhoto = null;
      },
    };
    return api;
  }

  // how bright a photo is, 0..255 (for automated checks that it is not a black frame)
  function brightness(canvas) {
    var d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    var sum = 0;
    for (var i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  }

  OC.camera = { create: create, brightness: brightness };
})();
