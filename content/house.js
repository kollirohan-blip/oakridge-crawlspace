// The Oakridge house. Meters. x runs east, z runs south, y is up. Plain data, wrapped in a script
// because index.html is opened from disk and browsers will not fetch() local JSON from file://.
//
// L-shape: the north wing (z 0..8) runs east-west; the south wing (x 0..13) runs south from its west
// end. The inside corner is the courtyard (x 13..26, z 8..24). The living room's south glass and the
// master bedroom's east windows face each other across it, about 13 m apart: that sightline is the
// signature of the game.
(function (root, factory) {
  var house = factory();
  if (typeof module === 'object' && module.exports) module.exports = house;
  else {
    root.OC = root.OC || {};
    root.OC.house = house;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var H = 2.6;
  return {
    wallHeight: H,
    rooms: [
      // north wing
      { id: 'foyer', label: 'Foyer', x0: 0, z0: 0, x1: 5, z1: 8, floor: 'floorboards', wall: 'wallpaperA' },
      { id: 'kitchen', label: 'Kitchen', x0: 5, z0: 0, x1: 13, z1: 8, floor: 'tile', wall: 'paintCream' },
      { id: 'living', label: 'Living room', x0: 13, z0: 0, x1: 26, z1: 8, floor: 'floorboards', wall: 'wallpaperB' },
      // south wing
      { id: 'hall', label: 'Hallway', x0: 5, z0: 8, x1: 7, z1: 24, floor: 'carpet', wall: 'wallpaperA' },
      { id: 'laundry', label: 'Laundry room', x0: 0, z0: 8, x1: 5, z1: 13, floor: 'concrete', wall: 'paintGrey' },
      { id: 'guest', label: 'Guest bedroom', x0: 0, z0: 13, x1: 5, z1: 19, floor: 'carpet', wall: 'wallpaperB' },
      { id: 'bath', label: 'Bathroom', x0: 0, z0: 19, x1: 5, z1: 24, floor: 'tile', wall: 'paintGrey' },
      { id: 'office', label: 'Office', x0: 7, z0: 8, x1: 13, z1: 15, floor: 'carpet', wall: 'wallpaperA' },
      { id: 'master', label: 'Master bedroom', x0: 7, z0: 15, x1: 13, z1: 24, floor: 'carpet', wall: 'wallpaperB' },
    ],
    // axis = the direction the wall runs ('x': along x at z; 'z': along z at x)
    doors: [
      { id: 'front', x: 2.5, z: 0, axis: 'x', width: 1.1 },
      { id: 'foyerKitchen', x: 5, z: 4, axis: 'z', width: 1.4 },
      { id: 'kitchenLiving', x: 13, z: 4, axis: 'z', width: 3.0 },
      { id: 'kitchenHall', x: 6, z: 8, axis: 'x', width: 2.0 },
      { id: 'laundry', x: 5, z: 10.5, axis: 'z', width: 0.9 },
      { id: 'guest', x: 5, z: 16, axis: 'z', width: 0.9 },
      { id: 'bath', x: 5, z: 21.5, axis: 'z', width: 0.9 },
      { id: 'office', x: 7, z: 11.5, axis: 'z', width: 0.9 },
      { id: 'master', x: 7, z: 19.5, axis: 'z', width: 0.9 },
      { id: 'patio', x: 19.5, z: 8, axis: 'x', width: 2.2 },
    ],
    windows: [
      { id: 'livingS1', x: 15.3, z: 8, axis: 'x', width: 2.6, sill: 0.4, height: 1.8 },
      { id: 'livingS2', x: 23.5, z: 8, axis: 'x', width: 2.6, sill: 0.4, height: 1.8 },
      { id: 'livingN', x: 19.5, z: 0, axis: 'x', width: 3.0, sill: 0.9, height: 1.2 },
      { id: 'kitchenN', x: 9, z: 0, axis: 'x', width: 1.4, sill: 1.0, height: 1.0 },
      { id: 'masterE1', x: 13, z: 17.5, axis: 'z', width: 1.6, sill: 0.9, height: 1.3 },
      { id: 'masterE2', x: 13, z: 21.5, axis: 'z', width: 1.6, sill: 0.9, height: 1.3 },
      { id: 'bathW', x: 0, z: 21.5, axis: 'z', width: 0.8, sill: 1.1, height: 0.8 },
      { id: 'guestW', x: 0, z: 16, axis: 'z', width: 1.2, sill: 0.9, height: 1.2 },
    ],
    // Furniture as boxes: b = [x0, y0, z0, x1, y1, z1], a texture, and whether it blocks walking.
    // (y0 matters only for looks; blocking is on the footprint.)
    furniture: [
      // kitchen
      { b: [5.4, 0, 0.1, 12.0, 0.88, 0.75], tex: 'cabinet', solid: true },
      { b: [5.35, 0.88, 0.1, 12.0, 0.92, 0.8], tex: 'counter' },
      { b: [12.2, 0, 0.15, 12.9, 1.85, 0.85], tex: 'appliance', solid: true }, // fridge
      { b: [5.9, 0.92, 0.2, 6.7, 1.2, 0.65], tex: 'appliance' }, // microwave
      { b: [8.4, 0.72, 3.6, 10.4, 0.78, 5.0], tex: 'cabinet', solid: true }, // table
      { b: [8.45, 0, 3.65, 8.55, 0.72, 3.75], tex: 'cabinet' },
      { b: [10.25, 0, 3.65, 10.35, 0.72, 3.75], tex: 'cabinet' },
      { b: [8.45, 0, 4.85, 8.55, 0.72, 4.95], tex: 'cabinet' },
      { b: [10.25, 0, 4.85, 10.35, 0.72, 4.95], tex: 'cabinet' },
      { b: [8.0, 0, 3.9, 8.35, 0.45, 4.3], tex: 'fabric', solid: true }, // chairs
      { b: [10.45, 0, 3.9, 10.8, 0.45, 4.3], tex: 'fabric', solid: true },
      { b: [12.0, 0, 6.6, 12.8, 0.7, 7.4], tex: 'metal', solid: true }, // kibble bin
      { b: [10.95, 0, 6.65, 11.45, 0.1, 7.15], tex: 'metal' }, // Cooper's bowl
      // living room
      { b: [17.8, 0, 0.15, 21.2, 0.5, 0.65], tex: 'cabinet', solid: true }, // TV stand
      { b: [18.3, 0.55, 0.25, 20.7, 1.35, 0.42], tex: 'black' }, // TV
      { b: [17.5, 0, 3.6, 21.0, 0.45, 4.5], tex: 'fabric', solid: true }, // couch
      { b: [17.5, 0.45, 4.2, 21.0, 0.95, 4.5], tex: 'fabric' },
      { b: [17.5, 0.45, 3.6, 17.8, 0.7, 4.5], tex: 'fabric' },
      { b: [20.7, 0.45, 3.6, 21.0, 0.7, 4.5], tex: 'fabric' },
      { b: [18.2, 0, 2.0, 20.3, 0.4, 2.8], tex: 'cabinet', solid: true }, // coffee table
      { b: [14.0, 0, 1.0, 15.0, 0.5, 2.0], tex: 'fabric2', solid: true }, // armchair
      { b: [14.0, 0.5, 0.9, 15.0, 0.95, 1.2], tex: 'fabric2' },
      { b: [25.5, 0, 2.0, 25.9, 1.9, 5.5], tex: 'cabinet', solid: true }, // bookshelf
      { b: [15.95, 0, 2.95, 16.05, 1.6, 3.05], tex: 'metal', solid: true }, // lamp pole (the glowing shade is in props.js)
      // foyer
      { b: [0.2, 0, 5.5, 1.6, 0.45, 6.4], tex: 'cabinet', solid: true },
      { b: [0.4, 0.45, 5.7, 1.0, 0.85, 6.2], tex: 'fabric2' }, // Mason's backpack
      { b: [3.6, 0, 0.2, 4.8, 0.8, 0.7], tex: 'cabinet', solid: true },
      // laundry room
      { b: [0.1, 0, 8.15, 0.75, 0.95, 9.0], tex: 'appliance', solid: true },
      { b: [0.1, 0, 9.1, 0.75, 0.95, 9.95], tex: 'appliance', solid: true },
      { b: [3.8, 0, 8.1, 4.9, 1.8, 8.6], tex: 'cabinet', solid: true },
      // guest bedroom
      { b: [0.1, 0, 14.85, 2.1, 0.35, 16.35], tex: 'cabinet', solid: true },
      { b: [0.1, 0.35, 14.85, 2.1, 0.55, 16.35], tex: 'sheets' },
      { b: [0.12, 0.55, 15.0, 0.5, 0.65, 16.2], tex: 'sheets' },
      { b: [0.1, 0, 14.25, 0.55, 0.55, 14.75], tex: 'cabinet', solid: true },
      { b: [3.4, 0, 17.4, 4.9, 2.3, 18.9], tex: 'cabinet', solid: true }, // closet
      // bathroom
      { b: [0.1, 0, 22.5, 1.6, 2.1, 23.9], tex: 'tile', solid: true }, // shower stall
      { b: [3.9, 0, 20.1, 4.8, 0.42, 20.8], tex: 'appliance', solid: true }, // toilet
      { b: [4.4, 0.42, 20.1, 4.8, 0.8, 20.5], tex: 'appliance' },
      { b: [3.4, 0, 23.3, 4.5, 0.85, 23.9], tex: 'cabinet', solid: true }, // vanity
      // master bedroom
      { b: [8.6, 0, 22.0, 10.6, 0.4, 23.9], tex: 'cabinet', solid: true },
      { b: [8.6, 0.4, 22.0, 10.6, 0.6, 23.9], tex: 'sheets' },
      { b: [8.7, 0.6, 22.1, 9.4, 0.7, 22.8], tex: 'sheets' },
      { b: [8.0, 0, 15.1, 10.0, 0.9, 15.6], tex: 'cabinet', solid: true },
      { b: [10.7, 0, 23.2, 11.2, 0.5, 23.9], tex: 'cabinet', solid: true },
      // office
      { b: [8.0, 0, 8.2, 10.5, 0.75, 9.0], tex: 'cabinet', solid: true },
      { b: [8.9, 0, 9.2, 9.5, 0.5, 9.8], tex: 'fabric', solid: true },
      { b: [12.3, 0, 9.0, 12.9, 1.9, 13.0], tex: 'cabinet', solid: true },
    ],
    roofs: [
      { x0: -0.6, z0: -0.8, x1: 26.6, z1: 8.6 },
      { x0: -0.6, z0: 7.4, x1: 13.6, z1: 24.6 },
    ],
    // thin solid boxes outside the walls: a fence around the courtyard and the edge of the world
    solids: [
      { x0: 13, x1: 26.1, z0: 24, z1: 24.1, y0: 0, y1: 1.8, kind: 'fence' },
      { x0: 26, x1: 26.1, z0: 8, z1: 24.1, y0: 0, y1: 1.8, kind: 'fence' },
      { x0: -29, x1: 55, z0: -34, z1: -33, y0: 0, y1: 3, kind: 'bound' },
      { x0: -29, x1: 55, z0: 48, z1: 49, y0: 0, y1: 3, kind: 'bound' },
      { x0: -30, x1: -29, z0: -34, z1: 49, y0: 0, y1: 3, kind: 'bound' },
      { x0: 55, x1: 56, z0: -34, z1: 49, y0: 0, y1: 3, kind: 'bound' },
    ],
    // warm pools of light; everything else is lit by the flashlight and a faint moon
    lights: [
      { x: 16, y: 1.9, z: 3, color: 0xffb070, intensity: 1.3, distance: 12 },
      { x: 9, y: 2.3, z: 4, color: 0xfff0d0, intensity: 1.1, distance: 10 },
      { x: 2.5, y: 2.3, z: 4, color: 0xffc080, intensity: 0.5, distance: 8 },
      { x: 6, y: 2.3, z: 16, color: 0xffaa70, intensity: 0.3, distance: 9 },
      { x: 2.5, y: 2.2, z: -1.4, color: 0xffd9a0, intensity: 1.0, distance: 11 },
      // the TV's glow: starts off, props.js flickers it when the TV is on
      { id: 'tv', x: 19.5, y: 1.0, z: 1.6, color: 0x7a9cff, intensity: 0, distance: 9 },
    ],
    // where the player stands to use things (also checked to be reachable on foot)
    stand: {
      fridge: { x: 12.55, z: 1.4 },
      microwave: { x: 6.3, z: 1.4 },
      bin: { x: 12.4, z: 6.0 },
      bowl: { x: 11.2, z: 6.0 },
      tv: { x: 19.5, z: 1.35 },
      couch: { x: 19.25, z: 3.3 },
      latch: { x: 19.5, z: 7.3 },
      bed: { x: 2.9, z: 15.6 },
      hatch: { x: 2.5, z: 11.7 },
      frontDoor: { x: 2.5, z: 1.0 },
      closet: { x: 2.9, z: 18.0 },
      bush: { x: 5.5, z: -2.0, outdoor: true },
      car: { x: 10, z: -8.5, outdoor: true },
      bathWindow: { x: -1.5, z: 21.5, outdoor: true },
    },
    spawns: {
      living: { x: 22.5, z: 5.5, yaw: 0.53 },
      kitchen: { x: 9, z: 2.2, yaw: 0 },
      hall: { x: 6, z: 14, yaw: Math.PI },
      master: { x: 9.5, z: 17.5, yaw: -Math.PI / 2 },
      porch: { x: 2.5, z: -4, yaw: Math.PI, outdoor: true },
      driveway: { x: 10, z: -12, yaw: Math.PI, outdoor: true },
    },
    anchors: {
      masterWindow: { x: 13, y: 1.5, z: 17.5 },
      livingGlass: { x: 15.3, y: 1.2, z: 8 },
      hatch: { x: 2.5, y: 0, z: 10.5 },
    },
  };
});
