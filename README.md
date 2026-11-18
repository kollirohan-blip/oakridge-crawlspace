# Oakridge Crawlspace

A short first-person horror game that runs in a browser. Mason, 17, is housesitting for his uncle
Dave for three nights: an L-shaped house in the middle of nowhere, a golden retriever named Cooper,
and a hatch in the laundry room floor that is padlocked "because of rats".

About an hour so far: a long first night, a day, a long second night, two more acts and an epilogue.
(v2 is being built in phases; the plan is in `docs/story-v2.md`.)

## How to play

Double-click `index.html`. It opens in your browser; click to start.

| Key | What it does |
|---|---|
| W A S D | walk (Shift runs, but only when you need to) |
| Mouse | look |
| E | use (some things need E held down) |
| F | phone light (it drains the battery) |
| Tab | your phone; Tab again puts it away. The game goes on while it is out: walk, look, and use things with E. While it is out the mouse is a cursor on it: point at an app, a chat, the back arrow, a link, a song or a name and click it. Push the mouse off the phone to look around. Apps: home (to-do), texts (a chat for each person), camera (the mouse aims, a click takes the photo), pet cam, photos, Flappy Cooper, Ethan's mixtape, calls. The keys work too: 1 to 8 switch apps (2 again goes back), Space or Enter does the picked thing, and the mouse wheel scrolls |
| Space | skip to the next line when someone is talking |
| 1 2 3 ... | answer, when the game asks |
| 0 to 9, Enter | the microwave keypad (2 3 0 is 2:30). E cancels |
| Esc | pause |

Headphones help: the sounds are positional, and the scratching under the floor comes from where the
hatch actually is.

The game saves a checkpoint at the start of each act. Reopening it offers **Continue** from there;
**New game** starts over.

The first **New game** asks you to set the brightness: turn it up until you can just see Cooper down the
dark hall (it is in Settings too). If you get caught on something, **I'm stuck** on the pause menu puts you
somewhere close by that you could have walked to. It won't during 12:30, 12:35 or an ending, under the house,
or away from home, and it says why. If a few minutes go by with nothing done on your list, Mason thinks out
loud about where the thing he was meant to do is.

**No internet needed:** the 3D library (Three.js r128, MIT licence) is included as
`vendor/three.min.js`. If that file is ever missing, the game falls back to loading it from cdnjs.

## What is in it

- **Night 1, "The House Learns You".** A free routine full of choices: five dinners (one of them
  is a mistake), Cooper's tricks and fetch, the mail, the trash, the dishes, the mirror, a TV with
  four channels and captions, Dave's sticky notes and terrible magnets, a singing fish, a phone with
  a camera and a pet cam. The house notices what you do, and Mason notices when you are being silly (five
  flushes, a whole minute of petting Cooper, the fridge again). Once you have settled in: a flash photo of
  the hallway, scratching that follows you under the floor, the shape in Dave's window, three soft
  knocks from the laundry room, and the pet cam at 2:13 AM.
- **Day 2, "Daylight".** Sun, coffee, Cooper asleep in a patch of light, and a pet cam clip from
  3:40 AM of the camera being turned to the wall. Calls to Mom, Dave and Ethan, an article about
  phrogging, and an optional visit from Deputy Ray, who explains everything away. The guest closet's
  pencil marks, the shed, Dave's email. A drive to the Gas-N-Go at dusk, and the drive home.
- **Night 2, "The House Has Changed".** The deadbolt is thrown from the inside. Seven small things
  are wrong in the house, the food you bought vanishes, the hatch stands open, and a storm comes in.
  The night reads how you spent the last one: sleep with every light on and the breaker trips; use a
  lot of phone light and it falters; keep checking Dave's window and the black TV shows you something.
  Each time, Mason works out that it was meant for him.
  You can go down the hatch: on your belly, under the house, to where he sleeps, and the notebook he
  keeps about you. Then the house phone rings.
- **12:30 AM, "The Call".** Dave calls about what the exterminator found. Three taps from inside the closet: leave
  it, call Cooper, or open it (an ending of its own). A flash photo of the closet. A whisper, and a bluff.
- **12:35 AM, "The Search".** The bathroom, the shower, two bare feet in the light under the door. Then get out
  through your own house while he searches it room by room, trying handles and listening. He never runs.
  Hide, but not in the same place twice. The chain on the front door. The car. Stay down.
- **Epilogue, "What Can Be Proven?"** Dawn on the porch steps, a deputy's car in the drive, and what is on
  your phone. The ending is built from what you actually did: the photos you took, whether you left his
  notebook or brought it out, whether you called the deputy in the daytime. His notebook is read back to you
  with your real habits in it and the real time you pressed play. The news, Dave, the cashier, and one of three
  verdicts. Then the house, two weeks later, in daylight, and a note on the fridge.

Six endings in all (three verdicts, one for calling Ray, the closet, and the Tupperware). After any of them the
title screen has a light on in the guest room window, and chapter select opens. Eighteen achievements, kept in
the browser between plays (some only show a hint until you earn them).

12:30 and 12:35 can be failed. A fail sends you back to the last moment the game saved inside that part (out
of the bathroom, at the front door, at the car), with everything you had done until then. Fail twice in the
same place and Mason works out what went wrong. Each scare there only plays the first time.

## For development

- `index.html?act=3` jumps to an act (1 to 4). `?spawn=living` picks a start point from `content/house.js`.
  Chapter select (after one finish) also has Day 2.
- In the browser console: `OC.debug.stats()` (frame time, draw calls, position, tasks),
  `OC.debug.advance(seconds)` (run the game forward in fixed steps), `OC.debug.use('itemId')`.
- `await OC.debug.sweep()`: the standing check. Every interaction must be findable through the real
  picker, the doors that close behind you must not trap you, and Night 1's flows (all five dinners,
  the TV, the photo, the pet cam, the mirror, the laundry door, a pause in a modal, a mid-night
  restart, a player who never moves) and Night 2's (the breaker, the black TV, the faltering light, the
  crawl, a player who never moves), the later acts' and the endings' (the strong and the empty-handed
  verdicts, leaving an ending for a new night, pausing, restarting and quitting in the middle of one, the
  title's light and achievements) must play through. Returns a promise; `ok: true` means all of it passed.
- `OC.debug.night2({ breaker, lightFalters, tvReflection })` starts Night 2 with chosen habit gates.
- `tools/night1-run.js`, `tools/day2-run.js`, `tools/night2-run.js`, `tools/ending-run.js`: scripted runs for
  the Playwright MCP's `browser_run_code`. Each saves screenshots and returns every console error.
- `node tools/bundle.js` packs the whole game into one HTML file (`dist/`), to play anywhere.
- `npm test` runs the logic tests (Node 20, no install needed).
- `node tools/serve.js` serves the folder on http://127.0.0.1:8123, for testing in a browser that
  will not run local files.

Layout:

```
index.html, css/        the page, HUD, phone, VHS look
content/house.js        the house: rooms, doors, windows, furniture, lights, spawn and stand points
content/text.js         every line of story text, by id (the game refuses to start if one is missing)
js/engine/              pure logic, tested in Node: layout, collision, sight lines, the act director,
                        path-finding, the figure in the window, the bluff, the noise meter, the clock,
                        the habit log, the tension Director, the scare pool, dinner, the TV, Flappy Cooper,
                        conversations, the storm, the footsteps overhead, the evidence behind the endings,
                        achievements
js/night1/              night one's routine and dread, composed by js/acts/act1.js
js/day2/, js/night2/    day two and night two, composed by js/acts/day2.js and js/acts/act2.js
content/talks.js        every conversation, as trees
js/tvshows.js           what is on TV: the shows, drawn on the screen
js/crawl.js, places.js  under the house; the road and the Gas-N-Go
content/scares.js, tv.js the scare pool and the TV channels
js/                     rendering, the controller, props, Cooper, audio (all synthesized), the phone
js/acts/act1-4.js       the four acts; js/epilogue.js, every ending
tests/                  node --test
docs/design.md          the design; docs/superpowers/plans/ the build plan; docs/perf.md
```

The furniture, food, cars and the trees are free CC0 models by Kenney (kenney.nl): Furniture Kit, Food Kit,
Car Kit and Nature Kit, kept in `assets/models/` with their licence and embedded into `content/models.js` so the game
still opens from disk. Change a model, then run `node tools/embed_models.js` (a test fails if you forget).
Wes, Cooper, the house itself, every texture and every sound are made by code: no image or audio files.

## Not checked

- The real frame rate on the Vivobook's own GPU (tested in headless Chrome with software rendering:
  17 to 96 draw calls, about 1 to 5 ms of work per frame). See `docs/perf.md`.
- Whether it is actually scary, and how the audio sounds through real speakers or headphones.
