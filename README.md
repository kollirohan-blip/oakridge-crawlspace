# Oakridge Crawlspace

A short first-person horror game that runs in a browser. Mason, 17, is housesitting for his uncle
Dave for three nights: an L-shaped house in the middle of nowhere, a golden retriever named Cooper,
and a hatch in the laundry room floor that is padlocked "because of rats".

About 20 to 30 minutes, four acts and an epilogue.

## How to play

Double-click `index.html`. It opens in your browser; click to start.

| Key | What it does |
|---|---|
| W A S D | walk (Shift runs, but only when you need to) |
| Mouse | look |
| E | use (some things need E held down) |
| F | phone light (it drains the battery) |
| Tab | your phone: the to-do list and your texts |
| 1 2 3 | answer, when the game asks |
| Esc | pause |

Headphones help: the sounds are positional, and the scratching under the floor comes from where the
hatch actually is.

The game saves a checkpoint at the start of each act. Reopening it continues from there; press **N**
on the start screen to start over.

**No internet needed:** the 3D library (Three.js r128, MIT licence) is included as
`vendor/three.min.js`. If that file is ever missing, the game falls back to loading it from cdnjs.

## What is in it

- **Act 1, night one.** Dinner, the dog, the slider, the TV. Scratching under the hatch. A light comes
  on in Dave's bedroom across the courtyard, and something behind the blinds moves, but only when
  you look away.
- **Act 2, night two.** The front door is deadbolted from the inside. The hatch is open and the padlock
  is gone. Cooper is snarling at a slider that is open three inches.
- **Act 3, 12:30 AM.** A phone call, a dropped phone, and a gap in the closet door.
- **Act 4, 12:35 AM.** The shower, the window, the car.
- **Epilogue.** What the police found.

Acts 3 and 4 can be failed; you retry from the start of the act.

## For development

- `index.html?act=3` jumps to an act (1 to 4). `?spawn=living` picks a start point from `content/house.js`.
- In the browser console: `OC.debug.stats()` (frame time, draw calls, position, tasks),
  `OC.debug.advance(seconds)` (run the game forward in fixed steps), `OC.debug.use('itemId')`.
- `npm test` runs the logic tests (Node 20, no install needed).
- `node tools/serve.js` serves the folder on http://127.0.0.1:8123, for testing in a browser that
  will not run local files.

Layout:

```
index.html, css/        the page, HUD, phone, VHS look
content/house.js        the house: rooms, doors, windows, furniture, lights, spawn and stand points
content/text.js         every line of story text, by id (the game refuses to start if one is missing)
js/engine/              pure logic, tested in Node: layout, collision, sight lines, the act director,
                        path-finding, the figure in the window, the bluff, the noise meter, the clock
js/                     rendering, the controller, props, Cooper, audio (all synthesized), the phone
js/acts/act1-4.js       the four acts; js/epilogue.js
tests/                  node --test
docs/design.md          the design; docs/superpowers/plans/ the build plan; docs/perf.md
```

Everything is drawn and synthesized at runtime: no image, model or audio files.

## Not checked

- The real frame rate on the Vivobook's own GPU (tested in headless Chrome with software rendering:
  17 to 96 draw calls, about 1 to 5 ms of work per frame). See `docs/perf.md`.
- Whether it is actually scary, and how the audio sounds through real speakers or headphones.
