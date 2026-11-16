# Oakridge Crawlspace v2: a real indie horror episode

> **Update, 2026-11-15 (late):** Rohan approved a full story redesign, in **`docs/story-v2.md`**. It
> replaces this file's story beats, fear curve, time budget and phase list:
> - **The story:** Wes Hale, the man who grew up in the house.
> - **Length:** about 60 minutes, with a daytime Day 2.
> - **Features:** the pet cam, the habit notebook, the deputy, the Night 2 crawl, evidence endings
>   where he is never caught, and the "absolutely terrifying, and fun" target.
>
> **This file still holds:** the model pipeline, the research rules table, and per-phase
> verification.
>
> **Status:** Phase 0 is done (commits 66bcc28 to ea3582d). The build order now lives in
> `story-v2.md`.
>
> The project is about making an awesome game now; the local-model experiment is dropped.

## Context

v1 works end to end (4 acts + epilogue, 85 tests), but Rohan's verdict is "decent for first code".
What holds it back:
- The house feels empty and blocky.
- There is little to do before the scares, and almost no choices.
- The tone is all dread with no indie personality.
- There is no lore, and the store trip that opens Night 2 is not playable.

Two bugs reported while playing:
1. **The fridge note cannot be seen.** There is no note object, only an invisible use-point on the fridge
   (`js/acts/act1.js:227`), and its text shows as an 11-second subtitle.
2. **The front door traps you in Act 2.** Act 2's `inside` trigger closes the door the moment the
   player's center crosses the threshold (`roomAt` says foyer at z >= 0). The door's solid box
   (z -0.06..0.06) then overlaps the player (radius 0.28). `resolveMove` (`js/engine/collision.js`)
   refuses every move from an overlapping position. Confirmed with the real collision code: at z 0.01 to
   0.2 the player can move neither forward nor back. Everyone who walks in normally is stuck. My earlier
   test teleported away right after walking in, so it never saw this.

Rohan's research report sets the design rules (below). The goal: a lived-in, slightly funny house you
can move around in freely, a playable store trip, real lore, and fear built as dread with relief beats,
not as jump-scare spam. It still runs from `index.html` on the Vivobook, offline.

## Decisions (Rohan, 2026-11-15)
- **Art:** free CC0 low-poly model kits, bundled so the game stays offline.
- **Length:** about 45 minutes. *Superseded: about 60 minutes (see `story-v2.md`).*
- **Order:** Phase 0 (bugs and foundations), then Night 1 freedom, then the look, store trip, lore,
  scare pass. *Superseded by the build order in `story-v2.md`.*
- **Story:** open to changing the story itself to make it scarier (Rohan, mid-build). *Done: the
  redesign is approved in `story-v2.md`.*

**Time budget for 45 minutes** (*superseded; see the beat timings in `story-v2.md`*):
- Act 1 free-roam routine plus dread: about 15.
- Store trip: about 8.
- Act 2: about 8.
- Act 3: about 6.
- Act 4: about 6.
- Epilogue: about 2.

**Model pipeline (for the art decision):**
- **Sources:** Kenney.nl kits (Furniture, Food, Nature, Car), listed as CC0. Check the licence on each pack
  page before downloading, and ask Rohan before every download.
- **Loader:** `GLTFLoader` for r128, the classic-script build from `three@0.128.0/examples/js/`, vendored
  into `vendor/` like `three.min.js`.
- **Embedding:** browsers block `fetch` on `file://`, so a small Node script `tools/embed_models.js` turns
  the chosen `.glb` files into base64 inside `content/models.js` (`OC.models`), parsed with
  `loader.parse()`. The script is tested, and the game shows a visible error if a model fails to parse.
- **Batching:** static models are merged into the existing per-material batch, so draw calls stay low.
- **Budget:** models under about 10 MB total. A credits screen lists the packs.

## What the research changes (design rules for every phase)

| Research finding | What we do |
|---|---|
| Dread (unpredictable, unseen threat) outlasts panic; jump scares habituate fast | At most **3 real jump scares** in the whole episode: the eye, the closet burst on failure, the car window. Everything else is dread. |
| Relief injections + excitation transfer: fear only pays off with a clear switch from danger to safety | After every scare, a **relief beat**: lights on, petting Cooper (social and pet comfort), a dumb text from Ethan, a funny TV moment, the store trip between nights. Humor is relief by design. |
| Level-of-fear spectrum (1 calm to 10 panic) | A written **fear curve** for the episode (below). Each act is tuned to it, and nothing sits above 7 for long except the Act 4 climax. |
| Director AI with a tension budget (Alien: Isolation) | New pure module `js/engine/tension.js`, a **Tension Director**. It tracks time since the last event, current tension and the player's state (in the dark, idle, light on), and spends a budget on ambient events from a pool, with cooldowns and forced relief windows. |
| Gated learning: punish relying on one safe strategy | The director notices habits and counters them: keep the phone light on and the battery dies sooner and he notices the light; keep staring at the same window and the next glimpse appears somewhere else; stand still and hide too long and something happens behind you. |
| Acousmatic sound (unseen sources), leading audio warnings (Silent Hill's radio static) | **Cooper is the warning system**: his ears go up and he growls *before* something happens, so you know danger is near but not where. Footsteps above and below you (the crawlspace is under the floor), breathing through walls, sounds muffled by walls (already modeled). |
| Player-dependent vs player-independent scares | Both: some scares are triggered by your actions (open the fridge and food is missing, read a note and hear a knock), others run on their own timer (idle too long and the house reacts). Doing nothing is not safe. |
| Tunnel vision under stress | **Lore goes in calm moments**; under stress, the extra glimpses sit at the edge of view. |
| Empowerment kills horror; the "complexity fallacy" | No weapons, no fighting, ever. The man's behavior is *staged to look like searching*: pauses, tries handles, listens, leaves. No complex AI. |
| Flat screens anchor you in reality through peripheral vision | The title screen offers **full screen + headphones**. |

**Fear curve (target):**
- Night 1, routine: 1 to 3, with one early fake scare for comedy (Cooper knocks a pan off the
  counter) to calibrate.
- Scratching under the floor: 4. Dave's lamp and the figure: 6. Relief, then bed.
- Store trip: 2 to 3, with the hooded stranger at 4. Deadbolt and open hatch: 5 to 6. Broom: 6.
- Act 3 call: rising from 4. The eye: 9. Walking out: 8.
- Act 4: 8 to 10. Sirens: release. The epilogue is a slow cold 5.

## Approach: six phases, each playable and committed on its own

### Phase 0: bugs and foundations
- **Door trap, both halves, test first:**
  - `resolveMove` lets a body that already overlaps a box move as long as that doesn't push it deeper.
  - Doors close only when the player is clear: `frontDoor.close()` and `bathDoor.close()` defer while the
    player overlaps the door's box.
- **Readable notes:** a real paper note on the fridge (canvas handwriting, magnets). New `hud.read()`
  overlay that stays until E/Esc. Reused for mail, clippings, sticky notes and the notebook.
- **Esc pause menu and settings:** sensitivity, volumes, VHS strength, head bob, field of view, subtitle size.
  **Title screen:** New, Continue, Chapter select (after finishing), Settings, full screen.
- **`OC.debug.sweep()` as a standing check:** every interaction reachable through the real picker. Add a
  "walk in normally" check (real W key across each doorway the game closes behind you) so the door-trap
  class of bug is caught.

### Phase 1: Night 1 freedom (the routine is the game)
- **Choose dinner from the animated fridge:**
  - Dave's lasagna (labelled "MASON").
  - Frozen pizza (oven, preheat).
  - Mac and cheese cup (kettle).
  - Cereal (the milk is three weeks expired; funny, and it goes on the Night 2 list).
  - A "DO NOT EAT" Tupperware.
- **Watch it cook:** the plate turns inside the lit microwave, and you type the time on the keypad
  (20:00 gets a line). Beep, steam. Eat at the table while Cooper begs; feed him a bite or not (he remembers).
- **A real TV with a remote, closed captions and channels:**
  - Channel 7 news (break-ins and missing food out on Route 9).
  - An awful infomercial.
  - A nature documentary about animals living in other animals' burrows.
  - Weather (a storm tomorrow).
  - Late at night every channel cuts to an emergency alert about a prowler, then it is gone.
- **Freedom:** mail with lore, taking out the trash (first time outside, the treeline), washing up,
  light switches, doors, petting Cooper, fetch, brushing teeth (the mirror).
- **Phone apps:** Camera with flash (a later photo shows him), Music, a dumb mini-game.
- **The director runs Night 1's ambient pacing:** house creaks, the ice maker, Cooper's ears. The
  existing dread beats wait until the player has settled in.

### Phase 2: the look
- **Art source:** see the open question; my recommendation is CC0 low-poly kits embedded for offline
  use, plus code-drawn textures.
- **House detail:** trim, frames, curtains, fixtures, rugs, photos (one turned face-down on Night 2),
  kitchen sink, stove and upper cabinets, clutter, a singing-fish plaque that goes off at 3 AM, Dave's
  passive-aggressive sticky notes, pun magnets.
- **Outside:** porch steps and rail, mailbox, bins, shed, fence, lamp post, varied trees, grass, a distant
  neighbor's light, a real leafy bush that rustles.
- **Cooper:** sit, lie down, wag, beg, and refusing to pass the laundry room. **The man:** better silhouette
  and posture. Blob shadows. An optional PS1 vertex-snap and dither shader.

### Phase 3: the store trip (playable Night 2 opening, a relief stretch)
- **The drive:** car interior, scrolling dark road, radio talk show (lore plus absurd local ads), a deer
  in the headlights.
- **Gas-N-Go:** aisles, cooler, bulletin board (missing posters). Phone shopping list: dog food, milk,
  batteries (recharge the phone light), a snack.
- **People:** an awkward cashier with dialogue choices who knows "the Dave place". A man in a dark hoodie
  who watches you and leaves without buying anything, the same hoodie as the intruder.
- **Back home:** drive back to the deadbolted door (current Act 2). The store is built far off in the same
  world and reached by a faded teleport.

### Phase 4: lore, evidence, endings
- **Breadcrumbs:** Dave's emails to the exterminator ("the rats are taking whole cans of soup"), a 1998
  clipping about a family hearing someone in their walls, tally marks on the hatch's underside, food
  vanishing between nights.
- **The real hook:** "phrogging" (people secretly living in others' homes), the "based on real events"
  angle.
- **Evidence app:** found evidence collects on the phone and changes the epilogue (believed or not, caught
  or not).
- **Optional:** bolt cutters from the shed and a crawl *into* the crawlspace on Night 2: the sleeping bag,
  the marks, reading "Tonight's Plan" yourself, then footsteps above you. A worse ending if you open the
  closet in Act 3.

### Phase 5: scare and pacing pass
- **Tune the director and the fear curve.**
- **Changes between nights:** a chair pulled out, the toilet seat up, a wet footprint by the hatch.
- **Glimpses:** him reflected in the black TV, the treeline from the kitchen window, one frame at the end of
  the hall, your own photo. These use the look-away rule in `js/engine/silhouette.js`.
- **Storm on Night 2:** rain, wind, lightning that lights the yard.
- **Act 4:** his footsteps moving through the house while you are in the bathroom (unseen, through walls).
- **Writing:** a final tone and humor pass on every line.

## Files (patterns)
- **New pure modules, test-first, UMD like the rest of `js/engine/`:**
  - `tension.js` (the director).
  - `food.js` (the dinner state machine).
  - `tvSchedule.js` (channels).
  - `evidence.js` (endings).
  - `doors.js` (door state, deferring while occupied).
- **Fix:** `js/engine/collision.js` (escaping overlap) and `js/acts/act2.js` (close the door only when clear).
- **Extend:**
  - `js/props.js`: every door on the `bathDoor` hinge pattern, new props.
  - `js/world.js`: batch static detail with `world.box`/`emitBox`.
  - `js/textures.js`, `js/audio.js` (rain, thunder, radio, creaks, footsteps above).
  - `js/hud.js` (read overlay, menus), `js/phone.js` (apps).
  - `js/main.js` (title, pause, sweep, store location).
  - `content/house.js`, `content/text.js`, `js/acts/*.js`.
- **Reuse:**
  - The director's triggers and once-only tasks (`js/engine/director.js`).
  - The picker (`js/engine/pick.js`), path-finding (`js/engine/path.js`), the look-away rule
    (`js/engine/silhouette.js`), the noise meter.
  - `OC.debug.advance`/`use`, the checkpoint in `js/main.js`.

## Verification (every phase)
- `npm test` green, with new modules written test-first. The door trap gets a failing collision test
  before the fix.
- `OC.debug.sweep()` plus real key-driven walk-ins through every door that closes; no "teleport past it"
  shortcuts in checks.
- A scripted full playthrough in the browser with zero console errors. Screenshots of every new scene,
  judged for readability in the dark.
- `docs/perf.md`: draw calls under about 150 in the busiest view; boots offline from `file://` in headless
  Chrome.
- Unverifiable without Rohan: real-GPU frame rate, whether it scares, whether the jokes land.
