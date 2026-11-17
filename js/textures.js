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
    cabinet: function (g, w, h, r) {
      g.fillStyle = '#4a3828';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      for (var x = 0; x < w; x += 32) g.fillRect(x, 0, 1, h);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.strokeRect(4.5, 4.5, 23, 55);
      g.strokeRect(36.5, 4.5, 23, 55);
      speckle(g, w, h, r, 300, 0.3);
    },
    counter: function (g, w, h, r) {
      g.fillStyle = '#6d6a62';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 700, 0.35);
    },
    appliance: function (g, w, h, r) {
      g.fillStyle = '#b9bbb6';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 200, 0.15);
    },
    metal: function (g, w, h, r) {
      g.fillStyle = '#5b5f64';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 250, 0.3);
    },
    fabric: function (g, w, h, r) {
      g.fillStyle = '#3f5560';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 1200, 0.3);
    },
    fabric2: function (g, w, h, r) {
      g.fillStyle = '#5c3030';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 1200, 0.3);
    },
    sheets: function (g, w, h, r) {
      g.fillStyle = '#8f98a3';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (var y = 0; y < h; y += 12) g.fillRect(0, y, w, 1);
      speckle(g, w, h, r, 500, 0.2);
    },
    black: function (g, w, h) {
      g.fillStyle = '#0d0d10';
      g.fillRect(0, 0, w, h);
    },
    door: function (g, w, h, r) {
      g.fillStyle = '#3d2a1c';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(6, 6, 52, 24);
      g.fillRect(6, 34, 52, 24);
      speckle(g, w, h, r, 300, 0.25);
    },
    plain: function (g, w, h) {
      g.fillStyle = '#3a3a3e';
      g.fillRect(0, 0, w, h);
    },
    // the road to town
    asphalt: function (g, w, h, r) {
      g.fillStyle = '#2b2c2e';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 700, 0.18);
    },
    stripe: function (g, w, h) {
      g.fillStyle = '#b8a24a';
      g.fillRect(0, 0, w, h);
    },
    // the Gas-N-Go bulletin board
    cork: function (g, w, h, r) {
      g.fillStyle = '#8a6a44';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 600, 0.3);
    },
    shopfloor: function (g, w, h, r) {
      g.fillStyle = '#bdb8aa';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, 0, 2, h);
      speckle(g, w, h, r, 200, 0.12);
    },
    // under the house: packed dirt, cinder block, the underside of the floor, pink insulation
    dirt: function (g, w, h, r) {
      g.fillStyle = '#4a3b2c';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 900, 0.22);
      for (var i = 0; i < 14; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(20,14,8,0.35)' : 'rgba(120,100,78,0.25)';
        g.fillRect((r() * w) | 0, (r() * h) | 0, 2 + ((r() * 4) | 0), 1 + ((r() * 2) | 0));
      }
    },
    block: function (g, w, h, r) {
      g.fillStyle = '#4f4e4a';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 500, 0.16);
      g.fillStyle = 'rgba(30,30,30,0.55)';
      g.fillRect(0, 0, w, 2);
      g.fillRect(0, h / 2, w, 2);
      g.fillRect(0, 0, 2, h / 2);
      g.fillRect(w / 2, h / 2, 2, h / 2);
    },
    subfloor: function (g, w, h, r) {
      g.fillStyle = '#5a4630';
      g.fillRect(0, 0, w, h);
      for (var y = 0; y < h; y += 8) {
        g.fillStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.2) + ')';
        g.fillRect(0, y, w, 1);
        g.fillStyle = 'rgba(255,220,170,' + r() * 0.08 + ')';
        g.fillRect(0, y + 1, w, 6);
      }
      speckle(g, w, h, r, 300, 0.14);
    },
    insulation: function (g, w, h, r) {
      g.fillStyle = '#b77f86';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 900, 0.2);
      for (var i = 0; i < 8; i++) {
        g.fillStyle = 'rgba(70,40,45,0.3)';
        g.fillRect(0, (r() * h) | 0, w, 1);
      }
    },
    // the blinds in Dave's bedroom windows
    blinds: function (g, w, h, r) {
      g.fillStyle = '#8a7f6a';
      g.fillRect(0, 0, w, h);
      speckle(g, w, h, r, 80, 0.12);
    },
    // Dave's sticky notes: yellow paper, blue scribbles
    sticky: function (g, w, h, r) {
      g.fillStyle = '#e8d35a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(0, 0, w, 6);
      g.strokeStyle = '#2b3a7a';
      g.lineWidth = 2;
      for (var y = 16; y < h - 6; y += 10) {
        var x = 6;
        g.beginPath();
        g.moveTo(x, y);
        while (x < w - 8 - r() * 14) {
          x += 4 + r() * 5;
          g.lineTo(x, y + (r() - 0.5) * 4);
        }
        g.stroke();
      }
    },
    // fridge magnets: small bright blocks
    magnet: function (g, w, h, r) {
      var colors = ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22'];
      for (var y = 0; y < h; y += 16) {
        for (var x = 0; x < w; x += 16) {
          g.fillStyle = colors[(r() * colors.length) | 0];
          g.fillRect(x, y, 16, 16);
        }
      }
      speckle(g, w, h, r, 120, 0.3);
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
