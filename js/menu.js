// Menus: the title screen, the pause menu (shown whenever the mouse is released mid-game), chapter
// select (after finishing once) and settings. menu.js only shows screens and reports choices; main.js
// decides what they do.
(function () {
  var OC = (window.OC = window.OC || {});
  var SCREENS = ['title', 'pause', 'chapters', 'achievements', 'settings', 'bright'];

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
      document.body.classList.toggle('at-title', name === 'title' || name === 'chapters' || name === 'achievements' || (name === 'settings' && back !== 'pause'));
      document.body.classList.toggle('in-check', name === 'bright'); // the hall behind it, with no HUD on top
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
      brightness: el('sBrightness'),
      subtitle: el('sSubtitle'),
      bob: el('sBob'),
    };
    function fillForm() {
      form.sensitivity.value = settings.sensitivity;
      form.volume.value = settings.volume;
      form.vhs.value = settings.vhs;
      form.fov.value = settings.fov;
      form.brightness.value = settings.brightness;
      form.subtitle.value = settings.subtitle;
      form.bob.checked = settings.bob;
    }
    function readForm() {
      settings = OC.settings.normalize({
        sensitivity: Number(form.sensitivity.value),
        volume: Number(form.volume.value),
        vhs: Number(form.vhs.value),
        fov: Number(form.fov.value),
        brightness: Number(form.brightness.value),
        subtitle: form.subtitle.value,
        bob: form.bob.checked,
      });
      opts.onSettings(settings);
    }
    Object.keys(form).forEach(function (k) {
      form[k].addEventListener('input', readForm);
      form[k].addEventListener('change', readForm);
    });
    // the first-run check's own slider: the same setting, changed live
    var brightSlider = el('bBrightness');
    function readBright() {
      settings = OC.settings.normalize(Object.assign({}, settings, { brightness: Number(brightSlider.value) }));
      opts.onSettings(settings);
    }
    brightSlider.addEventListener('input', readBright);
    brightSlider.addEventListener('change', readBright);

    // ---- achievements: earned ones lit, the rest dim with a hint (the endings' hints give nothing away)
    function fillAchievements() {
      var list = opts.achievements ? opts.achievements() : [];
      var box = el('achList');
      box.innerHTML = '';
      list.forEach(function (a) {
        var row = document.createElement('div');
        row.className = 'ach' + (a.unlocked ? ' on' : '');
        var h = document.createElement('div');
        h.className = 'ach-title';
        h.textContent = a.title;
        var d = document.createElement('div');
        d.className = 'ach-desc';
        d.textContent = a.unlocked || !a.hint ? a.desc : a.hint;
        row.appendChild(h);
        row.appendChild(d);
        box.appendChild(row);
      });
      box.scrollTop = 0;
    }

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
      if (act === 'achievements') {
        back = 'title';
        fillAchievements();
        return show('achievements');
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
        el('mAchievements').textContent = 'Achievements' + (state.achievements ? ' (' + state.achievements + ')' : '');
        show('title');
      },
      showPause: function () {
        el('stuckNote').hidden = true;
        show('pause');
      },
      // why "I'm stuck" can't move him right now, under the buttons
      pauseNote: function (text) {
        var n = el('stuckNote');
        n.textContent = text;
        n.hidden = false;
      },
      // the first-run brightness check, over the dark hall
      showBright: function () {
        brightSlider.value = settings.brightness;
        show('bright');
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
