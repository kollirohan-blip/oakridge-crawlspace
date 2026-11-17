// The TV: power, channels, the caption on screen right now, the emergency alert that interrupts every
// channel once and then is gone as if it never happened, and the channel change whose black frame
// shows a reflection. Pure logic; js/night1/tv.js draws it.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.tvSchedule = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var EPS = 1e-9;

  function captionAt(channel, t, lineSec) {
    var n = channel.lines.length;
    return channel.lines[Math.floor((t + EPS) / (lineSec || 5)) % n];
  }

  function createTv(data) {
    var index = 0;
    var chanT = 0;
    var armed = { alert: false, reflection: false };
    var seen = { alert: false, reflection: false };
    var alerting = false;
    var alertT = 0;
    var waitT = 0; // seconds the TV has been on since the alert was armed

    var api = { on: false };

    api.power = function (v) {
      api.on = !!v;
      chanT = 0;
      if (!api.on && alerting) alerting = false; // it does not wait for you to come back
    };
    api.channel = function () {
      return data.channels[index];
    };
    // the remote: returns what the screen does on the change, or null if the TV is off
    api.next = function () {
      if (!api.on) return null;
      index = (index + 1) % data.channels.length;
      chanT = 0;
      var reflection = armed.reflection && !seen.reflection;
      if (reflection) seen.reflection = true;
      return { black: true, reflection: reflection };
    };
    api.arm = function (name) {
      if (!(name in armed)) throw new Error('unknown tv event: ' + name);
      armed[name] = true;
    };
    api.tick = function (dt) {
      if (!api.on) return null;
      chanT += dt;
      if (alerting) {
        alertT += dt;
        if (alertT >= data.alert.duration - EPS) {
          alerting = false;
          return 'alertEnd';
        }
        return null;
      }
      if (armed.alert && !seen.alert) {
        waitT += dt;
        if (waitT >= data.alert.delay - EPS) {
          alerting = true;
          seen.alert = true;
          alertT = 0;
          return 'alertStart';
        }
      }
      return null;
    };
    api.alerting = function () {
      return alerting;
    };
    api.caption = function () {
      if (!api.on) return '';
      if (alerting) {
        var lines = data.alert.lines;
        var each = data.alert.duration / lines.length;
        return lines[Math.min(lines.length - 1, Math.floor((alertT + EPS) / each))];
      }
      return captionAt(api.channel(), chanT, data.lineSec);
    };
    api.seen = function (name) {
      return !!seen[name];
    };
    // which caption of this channel is up, and how many seconds into it (the picture follows these)
    api.lineIndex = function () {
      return Math.floor((chanT + EPS) / (data.lineSec || 5)) % api.channel().lines.length;
    };
    api.lineTime = function () {
      var sec = data.lineSec || 5;
      return chanT - Math.floor((chanT + EPS) / sec) * sec;
    };
    return api;
  }

  return { createTv: createTv, captionAt: captionAt };
});
