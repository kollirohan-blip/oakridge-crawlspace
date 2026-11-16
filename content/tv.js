// What is on TV on night one: four channels with closed captions, and the alert that interrupts all
// of them once. Hand-written. Read by js/engine/tvSchedule.js.
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else {
    root.OC = root.OC || {};
    root.OC.tvData = data;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    lineSec: 5,
    channels: [
      {
        n: 7,
        id: 'news',
        name: 'CH 7 NEWS',
        lines: [
          'Good evening. We begin out on Route 9, where residents say someone is helping themselves to their groceries.',
          'Deputies say at least six homes have reported missing food since September. Canned soup. Bread. A whole ham.',
          '"Nothing broken, nothing forced. You open the pantry and it\'s just... lighter," one resident told us.',
          "The Sheriff's Office believes it may be teenagers, or, quote, \"a very organized raccoon.\"",
          'In sports, the Oakridge Tigers fall to Dunmore, 28 to 3.',
        ],
      },
      {
        n: 22,
        id: 'shop',
        name: 'SHOP-AT-HOME 22',
        lines: [
          "Tired of soup that's TOO HOT? Introducing the SOUP SENTRY!",
          "It's a spoon. With a thermometer on it. Folks, this is the future.",
          "Call in the next ten minutes and we'll DOUBLE your order. That's two spoons.",
          '"I used to burn my mouth every single day. Then I found Soup Sentry." Gary, Ohio.',
          'Soup Sentry is not a toy. Do not give Soup Sentry to dogs. Three easy payments of $19.99.',
        ],
      },
      {
        n: 31,
        id: 'nature',
        name: 'NATURE HOUR 31',
        lines: [
          'The burrowing owl does not dig its own home.',
          'It waits for a prairie dog to dig one. Then it simply moves in.',
          'Some share the tunnel for months. The prairie dogs rarely notice. The owl is very, very quiet.',
          'Biologists call this commensalism: one animal benefits, and the other is not harmed.',
          'After the break: the cuckoo, and the nest that was never hers.',
        ],
      },
      {
        n: 48,
        id: 'weather',
        name: 'WEATHER 48',
        lines: [
          'Quiet and cold tonight, a low of 41. Patchy fog along Route 9 after midnight.',
          'Tomorrow, a strong line of storms moves in by evening. Heavy rain, gusty winds.',
          'Some of those storms could knock out power out in the rural areas. Charge your phones, folks.',
          "Rain starts around eight tomorrow night and doesn't let up until Friday.",
        ],
      },
    ],
    alert: {
      delay: 4,
      duration: 16,
      lines: [
        "EMERGENCY ALERT. THE SHERIFF'S OFFICE HAS ISSUED AN ADVISORY FOR THE ROUTE 9 AREA.",
        'A PROWLER HAS BEEN REPORTED INSIDE OCCUPIED HOMES. A TALL ADULT IN A DARK HOODED SWEATSHIRT.',
        'SECURE ALL DOORS, WINDOWS AND OUTSIDE VENTS. DO NOT APPROACH.',
        'THIS MESSAGE WILL NOT BE REPEATED.',
      ],
    },
  };
});
