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
    // furniture and interactables are added in the next task
    props: [],
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
    ],
    spawns: {
      living: { x: 20, z: 4, yaw: Math.PI },
      kitchen: { x: 9, z: 3.5, yaw: 0 },
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
