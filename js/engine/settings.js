// Player settings: defaults, sanity limits, and saving to the browser's storage. If storage is blocked
// (a private window) the game still works with defaults; saving just reports that it could not.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.settings = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var KEY = 'oakridge.settings';
  // brightness: 1 leaves the picture exactly as it was made; above 1 lifts the shadows (render.js)
  var DEFAULTS = { sensitivity: 1, volume: 0.9, vhs: 1, fov: 72, subtitle: 'medium', bob: true, brightness: 1 };
  var RANGES = { sensitivity: [0.3, 3], volume: [0, 1], vhs: [0, 1], fov: [55, 95], brightness: [0.5, 2] };
  var SUBTITLES = ['small', 'medium', 'large'];

  function normalize(input) {
    var s = {};
    var src = input && typeof input === 'object' ? input : {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = src[k];
      if (RANGES[k]) {
        s[k] = typeof v === 'number' && isFinite(v) ? Math.min(RANGES[k][1], Math.max(RANGES[k][0], v)) : DEFAULTS[k];
      } else if (k === 'subtitle') {
        s[k] = SUBTITLES.indexOf(v) >= 0 ? v : DEFAULTS[k];
      } else {
        s[k] = typeof v === 'boolean' ? v : DEFAULTS[k];
      }
    });
    return s;
  }

  function load(storage) {
    try {
      var raw = storage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : {});
    } catch (e) {
      return normalize({});
    }
  }

  function save(storage, s) {
    try {
      storage.setItem(KEY, JSON.stringify(normalize(s)));
      return true;
    } catch (e) {
      return false;
    }
  }

  return { DEFAULTS: normalize(DEFAULTS), normalize: normalize, load: load, save: save, SUBTITLES: SUBTITLES };
});
