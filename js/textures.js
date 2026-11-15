// Every texture is drawn on a small canvas at load time, so the game needs no image files.
(function () {
  var OC = (window.OC = window.OC || {});
  var cache = {};

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function speckle(g, w, h, r, count, strength) {
    for (var i = 0; i < count; i++) {
      var x = (r() * w) | 0;
      var y = (r() * h) | 0;
      var v = (r() * 2 - 1) * strength;
      g.fillStyle = v > 0 ? 'rgba(255,255,255,' + v + ')' : 'rgba(0,0,0,' + -v + ')';
      g.fillRect(x, y, 1, 1);
    }
  }

  var paints = {
    wallpaperA: function (g, w, h, r) {
      g.fillStyle = '#86795f';
      g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) {
        g.fillStyle = 'rgba(55,42,28,0.22)';
        g.fillRect(x, 0, 2, h);
        g.fillStyle = 'rgba(255,240,200,0.06)';
        g.fillRect(x + 4, 0, 1, h);
      }
      speckle(g, w, h, r, 420, 0.4);
    },
    wallpaperB: function (g, w, h, r) {
      g.fillStyle = '#566656';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(20,35,20,0.28)';
      for (var y = 0; y < h; y += 16) {
        for (var x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) {
          g.fillRect(x + 6, y + 6, 4, 4);
          g.fillRect(x + 7, y + 5, 2, 6);
        }
      }
      speckle(g, w, h, r, 420, 0.4);
    },
    paintCream: function (g, w, h, r) {
      g.fillStyle = '#a79d82';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 500, 0.3);
    },
    paintGrey: function (g, w, h, r) {
      g.fillStyle = '#6c7074';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 500, 0.35);
    },
    siding: function (g, w, h, r) {
      g.fillStyle = '#62666c';
      g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 8) {
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.fillRect(0, y, w, 1);
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(0, y + 1, w, 1);
      }
      speckle(g, w, h, r, 300, 0.3);
    },
    floorboards: function (g, w, h, r) {
      g.fillStyle = '#4b3322';
      g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 16) {
        var shade = r() * 0.25 - 0.12;
        g.fillStyle = shade > 0 ? 'rgba(255,200,150,' + shade + ')' : 'rgba(0,0,0,' + -shade + ')';
        g.fillRect(x, 0, 16, h);
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(x, 0, 1, h);
        var seam = (r() * h) | 0;
        g.fillRect(x, seam, 16, 1);
      }
      speckle(g, w, h, r, 400, 0.3);
    },
    carpet: function (g, w, h, r) {
      g.fillStyle = '#45515d';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 1400, 0.35);
    },
    tile: function (g, w, h, r) {
      g.fillStyle = '#b4b7b2';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#6b6d69';
      for (var i = 0; i < w; i += 16) {
        g.fillRect(i, 0, 1, h);
        g.fillRect(0, i, w, 1);
      }
      speckle(g, w, h, r, 300, 0.2);
    },
    concrete: function (g, w, h, r) {
      g.fillStyle = '#686866';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 900, 0.4);
    },
    ceiling: function (g, w, h, r) {
      g.fillStyle = '#b3afa3';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 300, 0.2);
    },
    grass: function (g, w, h, r) {
      g.fillStyle = '#1d2d1a';
      g.fillRect(0, 0, w, h);
      for (var i = 0; i < 500; i++) {
        var x = (r() * w) | 0;
        var y = (r() * h) | 0;
        g.fillStyle = r() > 0.5 ? 'rgba(60,95,45,0.55)' : 'rgba(5,15,5,0.55)';
        g.fillRect(x, y, 1, 2);
      }
    },
    shingle: function (g, w, h, r) {
      g.fillStyle = '#2a2a2f';
      g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 8) {
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(0, y, w, 1);
        for (var x = (y / 8) % 2 ? 8 : 0; x < w; x += 16) g.fillRect(x, y, 1, 8);
      }
      speckle(g, w, h, r, 300, 0.3);
    },
    wood: function (g, w, h, r) {
      g.fillStyle = '#4e3a26';
      g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 10) {
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(0, y, w, 1);
      }
      speckle(g, w, h, r, 400, 0.3);
    },
    plain: function (g, w, h) {
      g.fillStyle = '#3a3a3e';
      g.fillRect(0, 0, w, h);
    },
  };

  function baseCanvas(name) {
    if (cache[name]) return cache[name];
    var paint = paints[name];
    if (!paint) throw new Error('unknown texture: ' + name);
    var c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    var seed = 0;
    for (var i = 0; i < name.length; i++) seed = seed * 31 + name.charCodeAt(i);
    paint(c.getContext('2d'), 64, 64, rng(seed + 7));
    cache[name] = c;
    return c;
  }

  // A repeating, hard-pixel texture. Clones share the drawn canvas.
  function get(name, rx, ry) {
    var tex = new THREE.CanvasTexture(baseCanvas(name));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
    tex.repeat.set(rx || 1, ry || 1);
    return tex;
  }

  OC.textures = { get: get, names: Object.keys(paints) };
})();
