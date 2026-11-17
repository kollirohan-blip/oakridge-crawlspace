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
      { id: 'livingS2', x: 23.4, z: 8, axis: 'x', width: 3.2, sill: 0.4, height: 1.8 },
      { id: 'livingN', x: 19.5, z: 0, axis: 'x', width: 3.0, sill: 0.9, height: 1.2 },
      { id: 'kitchenN', x: 9, z: 0, axis: 'x', width: 1.4, sill: 1.0, height: 1.0 },
      { id: 'masterE1', x: 13, z: 17.5, axis: 'z', width: 2.0, sill: 0.8, height: 1.4 },
      { id: 'masterE2', x: 13, z: 21.5, axis: 'z', width: 2.0, sill: 0.8, height: 1.4 },
      { id: 'bathW', x: 0, z: 21.5, axis: 'z', width: 0.8, sill: 1.1, height: 0.8 },
      { id: 'guestW', x: 0, z: 16, axis: 'z', width: 1.2, sill: 0.9, height: 1.2 },
    ],
    // Furniture as boxes: b = [x0, y0, z0, x1, y1, z1], a texture, and whether it blocks walking.
    // (y0 matters only for looks; blocking is on the footprint.)
    furniture: [
      // kitchen
      { b: [5.4, 0, 0.1, 12.0, 0.88, 0.75], tex: 'cabinet', solid: true },
      { b: [5.35, 0.88, 0.1, 12.0, 0.92, 0.8], tex: 'counter' },
      // `model` (with `rot` quarter turns; models face +z at rot 0) replaces the box's look with a CC0
      // model stretched to fill it. The box still does the colliding.
      { b: [12.2, 0, 0.15, 12.9, 1.85, 0.85], tex: 'appliance', model: 'kitchenFridgeLarge', solid: true }, // fridge
      { b: [5.9, 0.92, 0.2, 6.7, 1.2, 0.65], tex: 'appliance', model: 'kitchenMicrowave' }, // microwave
      { b: [8.4, 0, 3.6, 10.4, 0.78, 5.0], tex: 'cabinet', model: 'table', solid: true }, // table
      { b: [7.95, 0, 3.85, 8.4, 0.95, 4.35], tex: 'fabric', model: 'chairCushion', rot: 1, solid: true }, // chairs
      // (the east chair is a prop, js/decor2.js: on night two someone moves it)
      { b: [12.0, 0, 6.6, 12.8, 0.7, 7.4], tex: 'metal', solid: true }, // kibble bin
      { b: [10.95, 0, 6.65, 11.45, 0.1, 7.15], tex: 'metal' }, // Cooper's bowl
      // upper cabinets, and the counter's clutter (Dave's soup)
      { b: [5.4, 1.45, 0.1, 6.1, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [6.1, 1.45, 0.1, 6.8, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [6.8, 1.45, 0.1, 7.5, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [7.5, 1.45, 0.1, 8.2, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [9.8, 1.45, 0.1, 10.55, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [10.55, 1.45, 0.1, 11.3, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [11.3, 1.45, 0.1, 12.0, 2.1, 0.45], model: 'kitchenCabinetUpper' },
      { b: [10.1, 0.92, 0.18, 10.4, 1.08, 0.36], model: 'toaster' },
      { b: [11.35, 0.92, 0.15, 11.65, 1.24, 0.5], model: 'kitchenCoffeeMachine' },
      { b: [7.72, 0.92, 0.22, 7.8, 1.03, 0.3], model: 'food-can' },
      { b: [7.82, 0.92, 0.22, 7.9, 1.03, 0.3], model: 'food-can' },
      { b: [7.77, 1.03, 0.22, 7.85, 1.14, 0.3], model: 'food-can' },
      // living room
      { b: [17.8, 0, 0.15, 21.2, 0.5, 0.65], tex: 'cabinet', model: 'cabinetTelevision', solid: true }, // TV stand
      { b: [18.22, 0.52, 0.24, 20.78, 1.99, 0.4], tex: 'black' }, // the TV: Dave's pride, 100 inches
      { b: [19.2, 0.5, 0.26, 19.8, 0.52, 0.38], tex: 'black' }, // its foot
      { b: [17.5, 0, 3.6, 21.0, 0.95, 4.5], tex: 'fabric', model: 'loungeSofaLong', rot: 2, solid: true }, // couch
      { b: [18.2, 0, 2.0, 20.3, 0.4, 2.8], tex: 'cabinet', model: 'tableCoffee', solid: true }, // coffee table
      { b: [17.4, 0.003, 1.3, 21.1, 0.012, 3.5], model: 'rugRectangle' },
      { b: [14.0, 0, 0.9, 15.0, 0.95, 2.0], tex: 'fabric2', model: 'loungeChair', solid: true }, // armchair
      { b: [25.5, 0, 2.0, 25.9, 1.9, 5.5], solid: true }, // the bookshelves (three models, below)
      { b: [25.5, 0, 2.0, 25.9, 1.9, 3.17], model: 'bookcaseOpen', rot: 3 },
      { b: [25.5, 0, 3.17, 25.9, 1.9, 4.33], model: 'bookcaseOpen', rot: 3 },
      { b: [25.5, 0, 4.33, 25.9, 1.9, 5.5], model: 'bookcaseOpen', rot: 3 },
      { b: [15.95, 0, 2.95, 16.05, 1.6, 3.05], tex: 'metal', solid: true }, // lamp pole (the glowing shade is in props.js)
      { b: [13.2, 0, 0.25, 13.75, 1.25, 0.8], model: 'pottedPlant' },
      { b: [25.3, 0, 7.2, 25.85, 1.25, 7.75], model: 'pottedPlant' },
      // foyer
      { b: [0.2, 0, 5.5, 1.6, 0.45, 6.4], tex: 'cabinet', solid: true },
      { b: [0.4, 0.45, 5.7, 1.0, 0.85, 6.2], tex: 'fabric2' }, // Mason's backpack
      { b: [3.6, 0, 0.2, 4.8, 0.8, 0.7], tex: 'cabinet', model: 'sideTable', solid: true },
      { b: [0.2, 0, 0.2, 0.7, 1.75, 0.7], model: 'coatRackStanding', solid: true },
      { b: [1.95, 0.003, 0.15, 3.05, 0.012, 0.75], model: 'rugDoormat' },
      // laundry room
      { b: [0.1, 0, 8.15, 0.75, 0.95, 9.0], tex: 'appliance', model: 'washer', rot: 1, solid: true },
      { b: [0.1, 0, 9.1, 0.75, 0.95, 9.95], tex: 'appliance', model: 'dryer', rot: 1, solid: true },
      { b: [3.8, 0, 8.1, 4.9, 1.8, 8.6], tex: 'cabinet', model: 'bookcaseClosedWide', solid: true },
      { b: [0.3, 0, 12.25, 0.9, 0.55, 12.85], model: 'cardboardBoxClosed', solid: true },
      { b: [0.4, 0.55, 12.35, 0.85, 0.95, 12.8], model: 'cardboardBoxOpen' },
      // guest bedroom (his old room)
      { b: [0.1, 0, 14.85, 2.1, 0.65, 16.35], tex: 'cabinet', model: 'bedSingle', rot: 1, solid: true },
      { b: [0.1, 0, 14.25, 0.55, 0.55, 14.75], tex: 'cabinet', model: 'cabinetBedDrawerTable', rot: 1, solid: true },
      { b: [0.2, 0.55, 14.37, 0.45, 0.95, 14.63], model: 'lampSquareTable' },
      { b: [0.1, 0, 17.6, 1.9, 2.3, 18.9], tex: 'cabinet', solid: true }, // closet (its doors face the bed)
      { b: [2.0, 0.003, 15.1, 3.6, 0.012, 16.7], model: 'rugRound' },
      // bathroom
      { b: [0.1, 0, 22.5, 1.6, 2.1, 23.9], tex: 'tile', model: 'shower', rot: 2, solid: true }, // shower stall
      { b: [3.9, 0, 20.1, 4.8, 0.8, 20.8], tex: 'appliance', model: 'toilet', rot: 3, solid: true }, // toilet
      { b: [3.4, 0, 23.3, 4.5, 0.85, 23.9], tex: 'cabinet', model: 'bathroomSink', rot: 2, solid: true }, // vanity
      // master bedroom
      { b: [8.6, 0, 22.0, 10.6, 0.75, 23.9], tex: 'cabinet', model: 'bedDouble', rot: 2, solid: true },
      { b: [8.0, 0, 15.1, 10.0, 0.9, 15.6], tex: 'cabinet', model: 'bookcaseClosedWide', solid: true },
      { b: [10.7, 0, 23.2, 11.2, 0.5, 23.9], tex: 'cabinet', model: 'cabinetBedDrawerTable', rot: 2, solid: true },
      // office
      { b: [8.0, 0, 8.2, 10.5, 0.75, 9.0], tex: 'cabinet', model: 'desk', solid: true },
      { b: [8.85, 0, 9.15, 9.55, 1.0, 9.85], tex: 'fabric', model: 'chairDesk', rot: 2, solid: true },
      { b: [8.95, 0.75, 8.3, 9.65, 1.25, 8.55], model: 'computerScreen' },
      { b: [12.3, 0, 9.0, 12.9, 1.9, 13.0], solid: true }, // the cabinets along the east wall (three models)
      { b: [12.3, 0, 9.0, 12.9, 1.9, 10.33], model: 'bookcaseClosedWide', rot: 3 },
      { b: [12.3, 0, 10.33, 12.9, 1.9, 11.67], model: 'bookcaseClosedWide', rot: 3 },
      { b: [12.3, 0, 11.67, 12.9, 1.9, 13.0], model: 'bookcaseClosedWide', rot: 3 },
      // ---- night one: the routine's things ----
      // kitchen: the stove (its cabinet is already solid), the sink, the kettle, the bin
      { b: [6.9, 0, 0.1, 7.65, 0.92, 0.8], tex: 'appliance', model: 'kitchenStove' },
      { b: [8.5, 0.92, 0.15, 9.5, 0.94, 0.65], tex: 'metal' }, // sink
      { b: [8.95, 0.94, 0.15, 9.05, 1.2, 0.22], tex: 'metal' }, // faucet
      { b: [10.71, 0.92, 0.37, 10.89, 1.12, 0.53], tex: 'metal' }, // kettle
      { b: [7.5, 0, 7.3, 7.9, 0.6, 7.75], tex: 'metal', solid: true }, // trash can
      // living room: Cooper's bed, the remote on the coffee table
      { b: [22.1, 0, 6.05, 23.1, 0.18, 6.95], tex: 'fabric2' }, // in the middle of the pet cam's view
      { b: [19.52, 0.4, 2.27, 19.58, 0.42, 2.43], tex: 'black' },
      // hall: the singing fish's plaque
      { b: [6.86, 1.25, 9.1, 6.9, 1.65, 9.7], tex: 'wood' },
      // foyer: the thermostat
      { b: [0.1, 1.38, 2.94, 0.13, 1.5, 3.06], tex: 'appliance' },
      // laundry room: the utility sink (dishes go here: the kitchen sink is clogged)
      { b: [1.1, 0, 8.1, 2.0, 0.9, 8.65], tex: 'appliance', solid: true },
      { b: [1.2, 0.9, 8.15, 1.9, 0.92, 8.6], tex: 'metal' },
      { b: [1.5, 0.92, 8.1, 1.6, 1.15, 8.18], tex: 'metal' },
      // bathroom: the mirror's frame above the vanity
      { b: [3.5, 1.1, 23.88, 4.4, 1.9, 23.9], tex: 'cabinet' },
      // outside: the bins (right of the porch) and the mailbox at the end of the drive
      { b: [-1.9, 0, -1.0, -0.9, 1.0, -0.4], tex: 'metal', solid: true },
      { b: [7.0, 0, -13.46, 7.12, 1.1, -13.34], tex: 'wood' },
      { b: [6.85, 1.1, -13.6, 7.3, 1.35, -13.2], tex: 'metal' },
      // ---- night two's fixtures ----
      // floor registers: the hall, the living room, the kitchen
      { b: [6.35, 0, 13.3, 6.85, 0.012, 13.6], tex: 'metal' },
      { b: [14.95, 0, 7.15, 15.45, 0.012, 7.45], tex: 'metal' },
      { b: [12.15, 0, 2.85, 12.65, 0.012, 3.15], tex: 'metal' },
      // the wall phone in the kitchen (its handset is a prop)
      { b: [7.38, 1.24, 7.86, 7.62, 1.56, 7.9], tex: 'appliance' },
      // the junk drawer, at the west end of the counter
      { b: [5.45, 0.7, 0.75, 5.85, 0.86, 0.762], tex: 'cabinet' },
      { b: [5.58, 0.77, 0.762, 5.72, 0.79, 0.78], tex: 'metal' },
      // Dave's key hook by the laundry door: a little plaque, a hook, no key
      { b: [4.87, 1.44, 11.5, 4.9, 1.56, 11.7], tex: 'wood' },
      { b: [4.85, 1.46, 11.59, 4.87, 1.48, 11.61], tex: 'metal' },
      // light switches
      { b: [1.56, 1.19, 0.1, 1.64, 1.31, 0.12], tex: 'appliance' },
      { b: [5.1, 1.19, 2.86, 5.12, 1.31, 2.94], tex: 'appliance' },
      { b: [13.1, 1.19, 2.16, 13.12, 1.31, 2.24], tex: 'appliance' },
      { b: [6.88, 1.19, 8.31, 6.9, 1.31, 8.39], tex: 'appliance' },
      { b: [4.88, 1.19, 9.66, 4.9, 1.31, 9.74], tex: 'appliance' },
      { b: [4.88, 1.19, 20.86, 4.9, 1.31, 20.94], tex: 'appliance' },
      // ---- outside: the crawlspace vent behind the bush (its screen is in js/decor.js) ----
      { b: [5.2, 0.08, -0.14, 6.0, 0.46, -0.1], tex: 'black' },
      { b: [5.18, 0.06, -0.16, 6.02, 0.1, -0.1], tex: 'metal' },
      { b: [5.18, 0.44, -0.16, 6.02, 0.48, -0.1], tex: 'metal' },
      // ---- the shed in the front yard: the Hale boxes are in here ----
      { b: [25.5, 0, -7.5, 29.5, 2.3, -7.38], tex: 'siding', solid: true },
      { b: [25.5, 0, -7.5, 25.62, 2.3, -3.5], tex: 'siding', solid: true },
      { b: [29.38, 0, -7.5, 29.5, 2.3, -3.5], tex: 'siding', solid: true },
      { b: [25.5, 0, -3.62, 26.9, 2.3, -3.5], tex: 'siding', solid: true },
      { b: [27.9, 0, -3.62, 29.5, 2.3, -3.5], tex: 'siding', solid: true },
      { b: [26.9, 2.0, -3.62, 27.9, 2.3, -3.5], tex: 'siding' },
      { b: [25.3, 2.3, -7.7, 29.7, 2.42, -3.3], tex: 'shingle' },
      { b: [25.62, 0.0, -7.38, 29.38, 0.02, -3.62], tex: 'concrete' },
      { b: [25.62, 2.27, -7.38, 29.38, 2.3, -3.62], tex: 'wood', under: true }, // the shed's ceiling
      { b: [28.4, 0, -7.32, 29.3, 0.6, -6.6], model: 'cardboardBoxClosed', solid: true }, // the Hale boxes
      { b: [28.6, 0.6, -7.25, 29.2, 1.1, -6.75], model: 'cardboardBoxClosed' },
      { b: [27.5, 0, -7.32, 28.25, 0.5, -6.8], model: 'cardboardBoxOpen', solid: true },
      { b: [25.62, 0, -6.9, 26.05, 1.8, -5.3], model: 'bookcaseOpen', rot: 1, solid: true },
      { b: [28.75, 0, -5.7, 29.38, 0.9, -4.2], model: 'desk', rot: 3, solid: true }, // the workbench
      { b: [26.85, 1.38, -7.38, 26.9, 1.43, -7.32], tex: 'metal' }, // the crowbar hook, empty
      { b: [27.25, 1.38, -7.38, 27.3, 1.43, -7.32], tex: 'metal' },
      { b: [26.8, 1.25, -7.379, 27.35, 1.55, -7.378], tex: 'black' }, // its outline, painted on the wall
    ],
    // Dave's sticky notes (collectible; text in content/text.js as sticky.<id>). face = the way it faces.
    stickies: [
      { id: 'sink', x: 10.0, y: 1.2, z: 0.105, face: 'pz' },
      { id: 'thermostat', x: 0.105, y: 1.27, z: 3.0, face: 'px' },
      { id: 'remote', x: 18.6, y: 0.38, z: 0.66, face: 'pz' },
      { id: 'mirror', x: 4.46, y: 1.7, z: 23.895, face: 'nz' },
      { id: 'dryer', x: 0.76, y: 0.8, z: 9.5, face: 'px' },
      { id: 'frontDoor', x: 3.4, y: 1.45, z: 0.105, face: 'pz' },
      { id: 'kibble', x: 11.99, y: 0.5, z: 7.0, face: 'nx' },
      { id: 'pipes', x: 12.36, y: 1.12, z: 0.858, face: 'pz' },
    ],
    // CC0 scenery outside: the courtyard fence (its collision is in solids) and things at the edge of the
    // trees. b = fill a box (with rot quarter turns), or x/z with a height or scale.
    scenery: [
      { model: 'fence_simple', b: [13, 0, 23.97, 14.857, 1.5, 24.07] },
      { model: 'fence_simple', b: [14.857, 0, 23.97, 16.714, 1.5, 24.07] },
      { model: 'fence_simple', b: [16.714, 0, 23.97, 18.571, 1.5, 24.07] },
      { model: 'fence_simple', b: [18.571, 0, 23.97, 20.429, 1.5, 24.07] },
      { model: 'fence_simple', b: [20.429, 0, 23.97, 22.286, 1.5, 24.07] },
      { model: 'fence_simple', b: [22.286, 0, 23.97, 24.143, 1.5, 24.07] },
      { model: 'fence_simple', b: [24.143, 0, 23.97, 26, 1.5, 24.07] },
      { model: 'fence_simple', b: [25.97, 0, 8, 26.07, 1.5, 10], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 10, 26.07, 1.5, 12], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 12, 26.07, 1.5, 14], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 14, 26.07, 1.5, 16], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 16, 26.07, 1.5, 18], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 18, 26.07, 1.5, 20], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 20, 26.07, 1.5, 22], rot: 1 },
      { model: 'fence_simple', b: [25.97, 0, 22, 26.07, 1.5, 24], rot: 1 },
      { model: 'rock_smallA', b: [4.6, 0, -1.6, 4.95, 0.17, -1.25] }, // the fake rock with the spare key
      { model: 'rock_largeA', x: -6, z: -8, height: 0.7, rotY: 0.6 },
      { model: 'rock_largeA', x: 32, z: 14, height: 0.8, rotY: 2.1 },
      { model: 'rock_largeA', x: -4, z: 28, height: 0.6, rotY: 4 },
      { model: 'stump_round', x: -8, z: -3, height: 0.45, rotY: 1 },
      { model: 'stump_round', x: 30, z: -12, height: 0.5, rotY: 2 },
      { model: 'stump_round', x: 33, z: 30, height: 0.4, rotY: 3 },
      { model: 'log', x: -7, z: 12, height: 0.35, rotY: 0.4 },
      { model: 'log', x: 34, z: 4, height: 0.4, rotY: 1.9 },
      { model: 'grass_large', x: 2, z: -3.5, height: 0.35, rotY: 0 },
      { model: 'grass_large', x: -2.5, z: 2, height: 0.35, rotY: 1 },
      { model: 'grass_large', x: 15, z: -2, height: 0.3, rotY: 2 },
      { model: 'grass_large', x: 24, z: -1.5, height: 0.35, rotY: 3 },
      { model: 'grass_large', x: 27.5, z: 11, height: 0.35, rotY: 4 },
      { model: 'grass_large', x: -1.5, z: 18, height: 0.35, rotY: 5 },
      { model: 'grass_large', x: 14, z: 26, height: 0.3, rotY: 1 },
      { model: 'grass_large', x: 6, z: 27, height: 0.35, rotY: 2 },
      { model: 'rock_smallA', x: -3, z: -6, height: 0.25, rotY: 1 },
      { model: 'rock_smallA', x: 20, z: 27, height: 0.3, rotY: 2 },
    ],
    // the light switches: which light, where
    switches: [
      { light: 'foyer', label: 'foyer', x: 1.6, y: 1.25, z: 0.12, on: 0.5 },
      { light: 'kitchen', label: 'kitchen', x: 5.12, y: 1.25, z: 2.9, on: 1.1 },
      { light: 'living', label: 'living room', x: 13.12, y: 1.25, z: 2.2, on: 1.3 },
      { light: 'hall', label: 'hall', x: 6.88, y: 1.25, z: 8.35, on: 0.6 },
      { light: 'laundry', label: 'laundry room', x: 4.88, y: 1.25, z: 9.7, on: 0.9 },
      { light: 'bath', label: 'bathroom', x: 4.88, y: 1.25, z: 20.9, on: 0.9 },
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
      // Mason's car on the driveway, and the bush beside the porch (the fake rock is under it)
      { x0: 9.1, x1: 10.9, z0: -11.8, z1: -7.6, y0: 0, y1: 1.45, kind: 'car' },
      { x0: 5.0, x1: 6.2, z0: -1.3, z1: -0.15, y0: 0, y1: 0.9, kind: 'bush' },
    ],
    // warm pools of light; everything else is lit by the flashlight and a faint moon
    // Each act sets these to its own levels (props.setLights).
    lights: [
      { id: 'living', x: 16, y: 1.9, z: 3, color: 0xffb070, intensity: 1.3, distance: 12 },
      { id: 'kitchen', x: 9, y: 2.3, z: 4, color: 0xfff0d0, intensity: 1.1, distance: 10 },
      { id: 'foyer', x: 2.5, y: 2.3, z: 4, color: 0xffc080, intensity: 0.5, distance: 8 },
      { id: 'hall', x: 6, y: 2.3, z: 16, color: 0xffaa70, intensity: 0.3, distance: 9 },
      { id: 'porch', x: 2.5, y: 2.2, z: -1.4, color: 0xffd9a0, intensity: 1.0, distance: 11 },
      // the TV's glow: starts off, props.js flickers it when the TV is on
      { id: 'tv', x: 19.5, y: 1.0, z: 1.6, color: 0x7a9cff, intensity: 0, distance: 9 },
      // the laundry room: off, until night two
      { id: 'laundry', x: 2.5, y: 2.3, z: 10.5, color: 0xfff1d6, intensity: 0, distance: 8 },
      // the guest room bedside lamp
      { id: 'guest', x: 0.35, y: 0.9, z: 14.5, color: 0xffc88a, intensity: 0, distance: 6 },
      // moonlight over the driveway (outdoor scenes only)
      { id: 'yard', x: 8.5, y: 4.5, z: -9.5, color: 0x8fa6d6, intensity: 0, distance: 16 },
      // the dropped phone's screen, face up on the floor by the closet
      { id: 'phoneglow', x: 1.25, y: 0.12, z: 16.95, color: 0x9fc3ff, intensity: 0, distance: 3.2 },
      // the bathroom ceiling light (night one has a switch for it; every act starts with it off)
      { id: 'bath', x: 2.5, y: 2.3, z: 21.5, color: 0xf2f0e6, intensity: 0, distance: 7 },
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
      closet: { x: 2.4, z: 17.2 },
      bush: { x: 5.5, z: -2.0, outdoor: true },
      car: { x: 11.5, z: -9.6, outdoor: true }, // the driver's door (the car faces the house, so it is the east side)
      shower: { x: 0.85, z: 21.9 },
      bathWindowInside: { x: 0.8, z: 21.5 },
      bathDoor: { x: 4.2, z: 21.5 },
      broom: { x: 4.1, z: 12.2 },
      guestDoor: { x: 6, z: 16 },
      bathWindow: { x: -1.5, z: 21.5, outdoor: true },
      // night one
      stove: { x: 7.3, z: 1.4 },
      kettle: { x: 10.8, z: 1.4 },
      table: { x: 11.25, z: 4.1 }, // beside the east chair; sitting puts you on it (10.6, 4.1)
      laundrySink: { x: 1.55, z: 9.3 },
      trash: { x: 7.7, z: 6.8 },
      bins: { x: -1.4, z: -1.8, outdoor: true },
      mailbox: { x: 7.8, z: -13.4, outdoor: true },
      vanity: { x: 3.95, z: 22.8 },
      fish: { x: 6.3, z: 9.6 },
      remote: { x: 19.2, z: 3.2 },
      dogBed: { x: 22.6, z: 5.6 },
      laundryDoorHall: { x: 6.0, z: 10.5 },
      vent: { x: 5.6, z: -1.6, outdoor: true },
      shedDoor: { x: 27.4, z: -2.8, outdoor: true },
      shedInside: { x: 27.4, z: -5.2, outdoor: true },
      // night two
      rock: { x: 4.5, z: -2.2, outdoor: true },
      tablet: { x: 8.1, z: 1.45 },
      junkDrawer: { x: 5.65, z: 1.5 },
      groceries: { x: 9.4, z: 5.6 },
      photoTable: { x: 4.2, z: 1.4 },
      breaker: { x: 1.0, z: 10.5 },
      landline: { x: 7.1, z: 6.9 },
      keyHook: { x: 4.1, z: 11.6 },
    },
    spawns: {
      living: { x: 22.5, z: 5.5, yaw: 0.53 },
      kitchen: { x: 9, z: 2.2, yaw: 0 },
      hall: { x: 6, z: 14, yaw: Math.PI },
      master: { x: 9.5, z: 17.5, yaw: -Math.PI / 2 },
      porch: { x: 2.5, z: -4, yaw: Math.PI, outdoor: true },
      driveway: { x: 10, z: -13.5, yaw: Math.PI, outdoor: true },
      guestBed: { x: 2.4, z: 15.2, yaw: -Math.PI / 2 },
      bathInside: { x: 3.0, z: 21.5, yaw: -Math.PI / 2 },
    },
    anchors: {
      masterWindow: { x: 13, y: 1.5, z: 17.5 },
      livingGlass: { x: 15.3, y: 1.2, z: 8 },
      hatch: { x: 2.5, y: 0, z: 10.5 },
      vent: { x: 5.6, y: 0.27, z: -0.12 }, // the crawlspace vent behind the bush: how he gets in
    },
  };
});
