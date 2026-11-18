// Renderer at a low internal resolution, scaled up by CSS with hard pixels (the PS1/VHS look,
// and the performance plan for a laptop with no dedicated GPU).
(function () {
  var OC = (window.OC = window.OC || {});
  var INTERNAL_WIDTH = 480;

  // Brightness (settings.brightness) is a gamma lift in the tone-mapping step: each colour becomes
  // colour ^ (1 / brightness). Black stays black and white stays white; above 1 the shadows open up,
  // below 1 they close in. At exactly 1 the shader returns the colour untouched, so the default picture
  // is the one the game was built with. It runs before fog, so the night fog and the sky keep their
  // colour; and it sits under the VHS overlay (CSS), which is untouched. The exposure uniform carries
  // the brightness value, so changing it costs nothing: no shader rebuilds.
  var PLAIN = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
  var LIFT =
    'vec3 CustomToneMapping( vec3 color ) {\n' +
    '\tif ( toneMappingExposure == 1.0 ) return color;\n' +
    '\treturn pow( max( color, vec3( 0.0 ) ), vec3( 1.0 / toneMappingExposure ) );\n' +
    '}';
  var curve = 'none';
  function installCurve(renderer) {
    var chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
    if (chunk.indexOf(PLAIN) >= 0) {
      THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(PLAIN, LIFT);
      renderer.toneMapping = THREE.CustomToneMapping;
      curve = 'gamma';
    } else if (chunk.indexOf(LIFT) >= 0) {
      renderer.toneMapping = THREE.CustomToneMapping; // already installed (a second renderer)
      curve = 'gamma';
    } else {
      renderer.toneMapping = THREE.LinearToneMapping; // a different three.js: a plain multiplier still helps
      curve = 'linear';
    }
    renderer.toneMappingExposure = 1;
  }

  function init() {
    var canvas = document.getElementById('view');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    installCurve(renderer); // before anything is drawn: every material is built with the curve in it
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
      // 0.5 (darker) .. 1 (as made) .. 2 (shadows lifted a lot)
      setBrightness: function (b) {
        renderer.toneMappingExposure = typeof b === 'number' && isFinite(b) && b > 0 ? b : 1;
      },
      brightness: function () {
        return renderer.toneMappingExposure;
      },
      curve: function () {
        return curve;
      },
    };
  }

  OC.render = { init: init, INTERNAL_WIDTH: INTERNAL_WIDTH };
})();
