// Menus: the title screen, the pause menu (shown whenever the mouse is released mid-game), chapter
// select (after finishing once) and settings. menu.js only shows screens and reports choices; main.js
// decides what they do.
(function () {
  var OC = (window.OC = window.OC || {});
  var SCREENS = ['title', 'pause', 'chapters', 'settings'];

  function el(id) {
    return document.getElementById(id);
  }

  function create(opts) {
    // opts: { onChoice(action, arg), settings, onSettings(settings) }
    var current = null;
    var back = 'title'; // where Back goes from settings and chapters
    var settings = opts.settings;

    function show(name) {
      current = name;
      // the title screen is a clean screen: no in-game REC stamp or meters behind it
      document.body.classList.toggle('at-title', name === 'title' || name === 'chapters' || (name === 'settings' && back !== 'pause'));
      SCREENS.forEach(function (s) {
        el(s).classList.toggle('on', s === name);
      });
    }

    // ---- settings form ----------------------------------------------------------------------------
    var form = {
      sensitivity: el('sSensitivity'),
      volume: el('sVolume'),
      vhs: el('sVhs'),
      fov: el('sFov'),
      subtitle: el('sSubtitle'),
      bob: el('sBob'),
    };
    function fillForm() {
      form.sensitivity.value = settings.sensitivity;
      form.volume.value = settings.volume;
      form.vhs.value = settings.vhs;
      form.fov.value = settings.fov;
      form.subtitle.value = settings.subtitle;
      form.bob.checked = settings.bob;
    }
    function readForm() {
      settings = OC.settings.normalize({
        sensitivity: Number(form.sensitivity.value),
        volume: Number(form.volume.value),
        vhs: Number(form.vhs.value),
        fov: Number(form.fov.value),
        subtitle: form.subtitle.value,
        bob: form.bob.checked,
      });
      opts.onSettings(settings);
    }
    Object.keys(form).forEach(function (k) {
      form[k].addEventListener('input', readForm);
      form[k].addEventListener('change', readForm);
    });

    // ---- buttons ----------------------------------------------------------------------------------
    el('menus').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (OC.audio) OC.audio.play('click', { gain: 0.5 });
      var act = b.getAttribute('data-act');
      var chapter = b.getAttribute('data-chapter');
      if (chapter) return opts.onChoice('chapter', chapter);
      if (act === 'settings') {
        back = current;
        fillForm();
        return show('settings');
      }
      if (act === 'chapters') {
        back = 'title';
        return show('chapters');
      }
      if (act === 'back') return show(back);
      if (act === 'fullscreen') {
        var d = document.documentElement;
        if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(function () {});
        else if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
        return;
      }
      opts.onChoice(act);
    });

    return {
      showTitle: function (state) {
        // state: { continueLabel or null, chaptersUnlocked }
        var c = el('mContinue');
        c.hidden = !state.continueLabel;
        if (state.continueLabel) c.textContent = 'Continue (' + state.continueLabel + ')';
        el('mChapters').hidden = !state.chaptersUnlocked;
        show('title');
      },
      showPause: function () {
        show('pause');
      },
      hide: function () {
        show(null);
      },
      current: function () {
        return current;
      },
    };
  }

  OC.menu = { create: create };
})();
