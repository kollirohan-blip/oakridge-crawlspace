// The bathroom mirror above the vanity. A real planar reflection: a second camera at the player's eye
// reflected through the mirror, with an off-axis frustum that passes exactly through the mirror's
// edges, rendered into a small target only while the player is in the bathroom facing it. Mason has a
// simple body that only the mirror camera sees (layer 1), so he is not a vampire.
(function () {
  var OC = (window.OC = window.OC || {});
  var ZM = 23.875; // the mirror's plane, just in front of its frame; it faces north (-z)
  var X0 = 3.55;
  var X1 = 4.35;
  var Y0 = 1.15;
  var Y1 = 1.85;
  var W = 128;
  var H = 112;
  var MASON_LAYER = 1;

  function create(r, ctl) {
    var rt = new THREE.WebGLRenderTarget(W, H);
    rt.texture.wrapS = THREE.RepeatWrapping;
    rt.texture.repeat.x = -1; // the plane faces north, so its u runs east to west
    rt.texture.offset.x = 1;
    // toneMapped: false, because the reflection was drawn with the brightness curve already in it
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Y1 - Y0), new THREE.MeshBasicMaterial({ map: rt.texture, color: 0xc8ccd0, toneMapped: false }));
    glass.position.set((X0 + X1) / 2, (Y0 + Y1) / 2, ZM);
    glass.rotation.y = Math.PI;
    r.scene.add(glass);

    var cam = new THREE.PerspectiveCamera();
    cam.layers.enable(MASON_LAYER);
    r.scene.add(cam);

    // Mason, as only the mirror sees him: a grey t-shirt, a head, brown hair
    var mason = new THREE.Group();
    function part(w, h, d, color, x, y, z) {
      // unlit, so his own face never reads as a stranger's in a dark bathroom
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: color }));
      m.position.set(x, y, z);
      m.layers.set(MASON_LAYER);
      mason.add(m);
      return m;
    }
    part(0.44, 0.62, 0.24, 0x3d434c, 0, -0.5, 0.05); // torso (below and a little behind the eyes)
    part(0.12, 0.1, 0.12, 0x8c6c58, 0, -0.17, 0.04); // neck
    part(0.2, 0.25, 0.22, 0x9c7a64, 0, 0.0, 0.02); // head
    part(0.22, 0.08, 0.24, 0x3b2a1c, 0, 0.13, 0.03); // hair
    part(0.22, 0.2, 0.06, 0x3b2a1c, 0, 0.04, 0.13); // hair at the back
    part(0.035, 0.02, 0.01, 0x1a1a1a, -0.05, 0.02, -0.09); // eyes
    part(0.035, 0.02, 0.01, 0x1a1a1a, 0.05, 0.02, -0.09);
    r.scene.add(mason);

    var api = {
      active: false,
      frames: 0,
      // hooks to stage something for the mirror alone (what it shows that the room does not)
      beforeRender: null,
      afterRender: null,
      at: { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, z: ZM },
      update: function () {
        var e = r.camera.position;
        var room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
        var view = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
        api.active = room === 'bath' && e.z < ZM - 0.1 && OC.sightline.inView(view, api.at, 1.1);
        if (!api.active) return;
        mason.position.set(e.x, e.y, e.z);
        mason.rotation.set(0, ctl.yaw, 0);
        var n = ZM - e.z;
        cam.position.set(e.x, e.y, 2 * ZM - e.z);
        cam.rotation.set(0, 0, 0);
        cam.near = n;
        cam.far = n + 30;
        cam.projectionMatrix.makePerspective(X0 - e.x, X1 - e.x, Y1 - e.y, Y0 - e.y, n, n + 30);
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
        cam.updateMatrixWorld();
        glass.visible = false;
        if (api.beforeRender) api.beforeRender();
        r.renderer.setRenderTarget(rt);
        r.renderer.render(r.scene, cam);
        r.renderer.setRenderTarget(null);
        if (api.afterRender) api.afterRender();
        glass.visible = true;
        api.frames++;
      },
      // average brightness of what the mirror shows, 0..255 (for automated checks)
      sample: function () {
        var buf = new Uint8Array(W * H * 4);
        r.renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i += 4) sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
        return sum / (W * H);
      },
    };
    return api;
  }

  OC.mirror = { create: create };
})();
