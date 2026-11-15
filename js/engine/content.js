// Text lookup. A missing or empty id is an error, never a silent blank.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.content = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function createContent(textData, requiredIds) {
    function has(id) {
      return typeof textData[id] === 'string' && textData[id].length > 0;
    }
    return {
      t: function (id) {
        if (!has(id)) throw new Error('missing text: ' + id);
        return textData[id];
      },
      has: has,
      missing: function () {
        return (requiredIds || []).filter(function (id) { return !has(id); });
      },
    };
  }
  return { createContent: createContent };
});
