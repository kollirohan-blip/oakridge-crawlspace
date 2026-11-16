// Renderer at a low internal resolution, scaled up by CSS with hard pixels (the PS1/VHS look,
// and the performance plan for a laptop with no dedicated GPU).
(function () {
  var OC = (window.OC = window.OC || {});
  var INTERNAL_WIDTH = 480;

  function init() {
    var canvas = document.getElementById('view');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    // a very dark navy night rather than pure black, so a figure outside can be seen against the sky
    renderer.setClearColor(0x0a0e16);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e16, 0.04);

    var camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 140);
    camera.rotation.order = 'YXZ';
    scene.add(camera); // the phone light is a child of the camera

    var override = Number(new URLSearchParams(location.search).get('res'));
    var width = override > 120 ? override : INTERNAL_WIDTH;

    function resize() {
      var aspect = window.innerWidth / Math.max(1, window.innerHeight);
      var height = Math.max(120, Math.round(width / aspect));
      renderer.setSize(width, height, false); // false: leave the CSS size (100vw x 100vh) alone
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    return {
      scene: scene,
      camera: camera,
      renderer: renderer,
      resize: resize,
      render: function () {
        renderer.render(scene, camera);
      },
    };
  }

  OC.render = { init: init, INTERNAL_WIDTH: INTERNAL_WIDTH };
})();
