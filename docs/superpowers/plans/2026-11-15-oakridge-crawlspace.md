# Oakridge Crawlspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full game (Acts 1 to 4 plus epilogue) as a browser horror game, plus a local-model pipeline that writes its story text, and run that pipeline.

**Architecture:** Plain-script Three.js r128 game opened from `file://`. Story, house layout and text are data files (`.js` wrapping JSON, because `file://` blocks `fetch`). Pure logic (layout, collision, sightlines, clock, act director, content lookup) lives in dual-environment modules tested with `node --test`. A Python pipeline asks local Ollama models for text candidates, a script rejects bad ones, and the best survivors are built into `content/text.js`.

**Tech Stack:** Three.js r128 (CDN, local copy used if `vendor/three.min.js` exists), Web Audio API, Node 20 (`node --test`), Python 3.13 at `C:\Users\Kolli\miniconda3\python.exe` with `requests` and `unittest`, Ollama at `http://localhost:11434`.

**Spec:** `docs/design.md`

## Global Constraints

- Opens by double-clicking `index.html`: classic `<script>` tags only, no ES modules, no `fetch` of local files.
- Three.js **r128**. It has no PointerLockControls; the controller is our own.
- Low internal resolution (about 480x270 upscaled, `image-rendering: pixelated`). Target 30 fps or better on Iris Xe; measured, not assumed.
- No audio files and no model files: all sound is Web Audio synthesis, all textures are drawn on canvas.
- Models never write code. Ollama calls send `temperature` inside `options`, strip `<think>` blocks, run one model at a time.
- The game title is *Oakridge Crawlspace* (no "Fears to Fathom" in any user-visible text).
- A missing text id, bad data or failed asset shows a visible error panel, never a blank screen.
- `git` is local only. Never push.
- Python is not on PATH as `python`; use `C:\Users\Kolli\miniconda3\python.exe`.

## Review Focus

Failure modes the spec implies that no feature task exercises; each has a test in the task that owns the code.

1. **Pointer lock denied or lost** (tab unfocused, Esc): game pauses behind a "click to play" panel, no crash, no drift. (Task 4)
2. **Missing text id**: visible error panel naming the id. (Task 1 `content`, Task 7)
3. **Tunneling**: a large per-frame move or a diagonal into a corner must not put the player outside the walls. (Task 1 `collision`)
4. **Repeat or out-of-order interaction** (feed Cooper twice, lock the door twice, finish tasks in any order): tasks complete once, the act advances once. (Task 1 `director`)
5. **Tab hidden, then returned**: a huge frame delta is clamped so nothing teleports and no timer jumps. (Task 1 `clock`, Task 3)

---

## File Structure

```
index.html                  boot page, script order, error panel, click-to-play panel
css/style.css               HUD, phone, VHS overlay, panels
js/engine/*.js              pure modules (UMD: window.OC.x in browser, module.exports in Node)
  layout.js collision.js sightline.js clock.js director.js content.js
js/render.js                renderer, low-res target, fog, VHS timestamp
js/controller.js            pointer-lock first-person controller (uses collision)
js/textures.js              canvas-drawn textures
js/props.js                 prop and Cooper builders (boxes + textures)
js/world.js                 builds the house/exterior from content/house.js
js/audio.js                 Web Audio synthesis
js/interact.js              raycast, prompts, timed interactions
js/phone.js                 phone UI (tasks, SMS threads, choice UI)
js/acts/act1.js .. act4.js  act definitions and set-piece sequences
js/epilogue.js              end screens
js/main.js                  boot, loop, debug hooks (?act=2)
content/house.js            OC.house data
content/slots.json          every text slot + hand-written placeholder
content/canon.md style.md   story bible, voice rules + golden examples
content/text.js             generated: OC.textData
content/candidates/         pipeline output
tools/ollama.py checks.py content_team.py build_text.py serve.js
tests/*.test.js tests/test_*.py
```

---

### Task 1: Skeleton and pure engine modules

**Files:** Create `package.json` (`"test": "node --test tests/"`), `.gitignore`, `tools/serve.js` (static server, port 8123), `content/canon.md` (copy of `GAME_BRIEF` from `C:\Users\Kolli\OneDrive\Desktop\ai_dev_team.py`, unchanged), all `js/engine/*.js`, `tests/*.test.js`. `git init`.

**Interfaces (Produces):**
- `layout.js`: `buildWalls(house) -> Box[]`; `roomAt(house, x, z) -> roomId|null`; `Box = {x0,z0,x1,z1,y0,y1,kind}`. `house = {wallHeight, rooms:[{id,x0,z0,x1,z1}], doors:[{x,z,axis:'x'|'z',width}], windows:[{x,z,axis,width,sill,height}], props:[...]}`.
- `collision.js`: `resolveMove(pos:{x,z}, delta:{x,z}, boxes:Box[], radius:number) -> {x,z}`; moves in sub-steps no longer than `radius/2` and slides along walls.
- `sightline.js`: `inView(cam:{x,z,yaw}, target:{x,z}, halfFov:number) -> boolean`; `createLookWatcher(target, halfFov) -> {update(cam)->'looked'|'looked-away'|null}` fires `'looked'` when the target enters view and `'looked-away'` when it leaves after having been seen.
- `clock.js`: `gameClock({startMin,endMin,durationSec}) -> {tick(dt), minutes(), label()}`; `tick` clamps `dt` to 0.1 s; `label()` returns e.g. `"9:45 PM"`.
- `director.js`: `createDirector(def, hooks) -> {complete(taskId), tick(dt,state), done(taskId), actDone()}` where `def = {tasks:[{id,label}], triggers:[{id,once:true,when:(state)=>bool,do:(hooks)=>void}], advanceWhen:'allTasks'|fn}`; `complete` is idempotent and `hooks.onAdvance` fires exactly once.
- `content.js`: `createContent(textData, requiredIds) -> {t(id), missing()}`; `t` throws `Error("missing text: <id>")` for an unknown id.

- [ ] **Step 1: Write failing tests** in `tests/layout.test.js`, `collision.test.js`, `sightline.test.js`, `clock.test.js`, `director.test.js`, `content.test.js`. Key assertions:
  - `layout`: a two-room fixture with one door has a wall gap of exactly `door.width`; `roomAt` returns the right id and `null` outside.
  - `collision`: moving 5 m in one call into a wall stops at `wall - radius`; diagonal move into an inside corner stays inside the room; moving along a wall slides (z changes, x blocked).
  - `sightline`: target straight ahead is in view; behind is not; `createLookWatcher` yields `'looked'` then `'looked-away'` then `null` repeatedly.
  - `clock`: `tick(1000)` advances as `tick(0.1)`; `label()` at start is `"7:30 PM"`; label wraps past midnight to `"12:30 AM"`.
  - `director`: `complete('a')` twice leaves one completion; completing tasks in any order advances once; a `once` trigger fires once while `when` stays true.
  - `content`: `t('x')` throws `missing text: x`; `missing()` lists required ids absent from data.
- [ ] **Step 2:** `npm test` fails (modules missing).
- [ ] **Step 3: Implement the modules** with the signatures above in the UMD wrapper.
- [ ] **Step 4:** `npm test` passes.
- [ ] **Step 5:** `git add -A && git commit -m "feat: skeleton and pure engine modules"` (attribution trailer per session instructions).

### Task 2: Walkable L-shaped house with the VHS look

**Files:** Create `index.html`, `css/style.css`, `js/render.js`, `js/controller.js`, `js/textures.js`, `js/world.js`, `content/house.js`, `js/main.js`; add `.claude/launch.json` entry or equivalent for the test server.

**Interfaces:**
- Consumes: `OC.layout.buildWalls`, `OC.collision.resolveMove`.
- Produces: `OC.render.init() -> {scene,camera,renderer,resize()}`; `OC.controller.create(camera, boxes) -> {update(dt), pos, yaw, locked, setLocked(bool)}`; `OC.world.build(scene, house) -> {boxes, rooms, anchors}` where `anchors` is a map of named positions (`microwave`, `hatch`, `masterWindow`, `livingGlass`, `closet`, `bathWindow`, `car`, `porchBush`, ...) later tasks read; `OC.textures.get(name) -> THREE.CanvasTexture`.
- `content/house.js` sets `OC.house`: the L-shape from the design. Horizontal bar `z 0..8` (front door and porch on the north side, entry, kitchen, living room at the east end with a south glass wall and sliding door onto a patio); vertical bar `x 0..11, z 8..26` going south with a hallway, laundry room (floor hatch), guest bedroom with closet, bathroom with window, and the master bedroom at the south end with east windows facing the courtyard. Courtyard: the open inner corner; living-room glass and master windows face each other across it (distance about 14 m).

- [ ] **Step 1:** Build `index.html` with script order, three.js CDN tag plus local fallback (`vendor/three.min.js` if present), `#error-panel`, `#click-panel`.
- [ ] **Step 2:** Implement renderer at low internal resolution with fog and a canvas-text REC timestamp overlay (CSS scanlines, vignette, slight noise).
- [ ] **Step 3:** Implement the controller: pointer lock, WASD, mouse-look (pitch clamped to +-85 degrees), light head bob, collision through `resolveMove`, `F` flashlight as a camera-following `SpotLight` with a battery value that drains only while on. When pointer lock is lost the controller sets `locked=false`, the click panel shows, and `update` ignores input.
- [ ] **Step 4:** Implement `world.build`: floors, ceilings, walls from `buildWalls` (windows as gaps with glass planes), canvas textures (wallpaper, floorboards, carpet, tile), dim warm interior lights per room, night sky and exterior ground for the courtyard.
- [ ] **Step 5: Verify in a real browser.** Serve the folder, open with Playwright, assert no console errors, take screenshots from three spawn points (living room, hallway, master bedroom looking at the living glass), and read `renderer.info` plus an average frame time over 120 frames. Record the numbers in `docs/perf.md`. Walk a scripted path (inject key events) through every doorway and confirm the player never leaves `roomAt`.
- [ ] **Step 6:** Commit `feat: walkable L-shaped house with VHS look`.

### Task 3: Act 1 world: props, Cooper, interactions, tasks

**Files:** Create `js/props.js`, `js/interact.js`, `js/hud.js`, `js/acts/act1.js`; modify `js/world.js`, `js/main.js`.

**Interfaces:**
- Consumes: `world.anchors`, `OC.director.createDirector`, `OC.clock.gameClock`, `OC.content.t`.
- Produces: `OC.props.build(kind, opts) -> THREE.Object3D` for: `microwave, fridge, counter, tv, couch, coffeeTable, dogBowl, patioSlider, hatch, bed, closet, bathroomFixtures, car, broomstick, bush, dog`; `OC.interact.create(camera, scene, controller) -> {register({object,label,prompt,hold,enabled,onUse}), update(dt)}` (crosshair raycast within 2.2 m; `E` uses; `hold` seconds fills a progress ring; ignores input while the controller is unlocked); `OC.hud` exposes `say(textId, ms)` (subtitle), `toast(text)`, `setBattery(0..1)`, `setClock(label)`.
- Act 1 tasks (ids): `microwave` (hold 6 s then a 40 s heating wait with hum, ending in a beep), `feedCooper`, `lockPatio`, `watchTv` (sit and watch 20 s on the couch). Each is idempotent. Cooper follows Mason at 1.5 m, and stares at his current "worry target" (window, hatch) once a trigger sets one.

- [ ] **Step 1:** Add tests for any new pure logic (task ordering, interaction `enabled` gating) in `tests/interact.test.js`.
- [ ] **Step 2:** Build props from boxes and canvas textures; place them from `house.props`.
- [ ] **Step 3:** Implement interactions and the four tasks wired through `director.complete`.
- [ ] **Step 4:** Clamp frame `dt` (0.1 s) in the main loop; verify with a headless test that a simulated 10 s tab-hidden gap moves nothing.
- [ ] **Step 5: Verify:** Playwright plays all four tasks (programmatic interaction through a `window.OC.debug` hook, plus one real key-driven run), asserts `director.actDone()` flips once, screenshots the kitchen and living room.
- [ ] **Step 6:** Commit `feat: act 1 world and tasks`.

### Task 4: Audio, phone, and Act 1 dread

**Files:** Create `js/audio.js`, `js/phone.js`; extend `js/acts/act1.js`, `css/style.css`.

**Interfaces:**
- Produces: `OC.audio.init()` (after first click); `OC.audio.play(name, {pos?, gain?})` for `drone, step, beep, hum, scratch, whisper, tv, glassSmash, siren, shower, engineSputter, doorLock, knock`; `scratch` and `siren` take a 3D position (PannerNode); `OC.phone.open()/close()` (`Tab`), `OC.phone.deliver(threadId, {from, textId})`, `OC.phone.setTasks(tasks)`, `OC.phone.choice({promptId, options:[{textId, id}], seconds}) -> Promise<optionId|'timeout'>`.
- Act 1 triggers: arrival text from Uncle Dave at start; scratching from the hatch after the microwave starts; the silhouette appears behind the master blinds the first time the player looks at the master window from the living room and then looks away (`createLookWatcher`), shifts position each time it is re-seen after that, and never moves while being watched; Cooper stares at the hatch; the act ends when all tasks are done and the player is in bed or at 1:30 AM game time, whichever first.

- [ ] **Step 1:** Add `tests/director.test.js` cases for the dread triggers (silhouette fires on `'looked-away'`, not on first sight).
- [ ] **Step 2:** Implement synthesized sounds; verify each by running an `OfflineAudioContext` in the browser test and asserting the buffer is not silent.
- [ ] **Step 3:** Implement the phone UI and `deliver`/`choice` (timeout resolves `'timeout'`).
- [ ] **Step 4:** Wire the Act 1 triggers with placeholder text from `content/slots.json` (Task 5 creates it; use a small stub until then, replaced in Task 7).
- [ ] **Step 5: Verify** in the browser: pointer-lock loss shows the click panel and pauses the clock; the silhouette is invisible while looked at and present after looking away; screenshot the phone.
- [ ] **Step 6:** Commit `feat: audio, phone and act 1 dread`.

### Task 5: Content pipeline and checks

**Files:** Create `content/slots.json`, `content/style.md`, `tools/ollama.py`, `tools/checks.py`, `tools/content_team.py`, `tools/build_text.py`, `tests/test_checks.py`, `tests/test_content_team.py`, `tests/test_build_text.py`.

**Interfaces:**
- `slots.json`: list of `{id, act, type:'sms'|'voiceover'|'note'|'tv'|'thought'|'cooper'|'choice', speaker, maxChars, mustInclude?:[str], context, placeholder}` covering all four acts and the epilogue (about 60 slots). `placeholder` is hand-written fallback text and the game's text when no pick exists.
- `ollama.py`: `generate(model, system, prompt, *, temperature, num_predict, num_ctx=4096, keep_alive='10m', timeout=600, base_url=...) -> str` (posts `options`; strips `<think>...</think>`; raises `OllamaError`); `unload(model)`.
- `checks.py`: `BANNED: list[str]`, `KNOWN_NAMES = {'Mason','Cooper','Uncle Dave','Ethan'}`, `check(slot, text) -> list[str]` of violations (length, banned phrase, unknown capitalised name, empty, missing `mustInclude`), `is_duplicate(text, others) -> bool` (normalised comparison).
- `content_team.py`: `main(argv)`; phases `draft` (llama3.1 writes `--n` candidates per slot, llama3.2 writes variants for slots of type `thought`/`cooper`), `score` (llama3.1 scores 1-10 against `style.md`; deepseek-r1:8b re-ranks the top 3 per slot), writing `content/candidates/<slotId>.json` = `{slot, candidates:[{text, model, score, rank, violations}]}`. Resumable: skips slots that already have output for the phase. Logs per-call seconds to `content/candidates/run.log`. `--limit N` and `--dry-run` (uses a fake generator) exist for tests.
- `build_text.py`: `build(slots, candidates_dir, overrides) -> dict[id,str]`; chooses the best-ranked candidate with zero violations, else the placeholder; writes `content/text.js` (`window.OC.textData = {...}`) and `content/REVIEW.md` (per slot: chosen text, source `model:<name>` or `placeholder`, runner-ups).

- [ ] **Step 1:** Write failing tests: each banned phrase is flagged; "Mason" passes but an invented name ("Jessica") is flagged; over-length text is flagged; `is_duplicate` ignores case and punctuation; `content_team.main(['--dry-run','--limit','3'])` writes three candidate files with valid shape and is a no-op on the second run (resumable); `build` prefers the best clean candidate, falls back to the placeholder when all violate, and the generated `text.js` parses and contains every slot id.
- [ ] **Step 2:** Run `C:\Users\Kolli\miniconda3\python.exe -m unittest discover -s tests` to see failures.
- [ ] **Step 3:** Implement the modules; write `style.md` (voice rules and hand-written golden examples for each slot type) and all slots with placeholders.
- [ ] **Step 4:** Tests pass; run one real slot through `llama3.1` as a smoke test and read the result.
- [ ] **Step 5:** Commit `feat: content pipeline`.

### Task 6: Run the bots

- [ ] **Step 1:** Ask for keep-awake (`until: session_idle`); confirm Ollama is up and all four models are listed.
- [ ] **Step 2:** Start `content_team.py` for all slots in the background (`--n 4`), phase `draft` then `score`. Log sizes and timings. Keep working on later tasks while it runs, and check `run.log` rather than polling.
- [ ] **Step 3:** When done, run `build_text.py`, read `REVIEW.md` in full, and replace any pick that sounds generic, contradicts `canon.md` or breaks `style.md` with the hand-written placeholder (recorded as an override with the reason). Report how many lines came from each model.
- [ ] **Step 4:** Commit `content: first model run and picks`.

### Task 7: Game reads generated text

**Files:** Modify `index.html`, `js/main.js`, `js/acts/*.js`.

- [ ] **Step 1:** Load `content/text.js`; boot calls `createContent(OC.textData, requiredIds).missing()` and shows the error panel listing missing ids instead of starting.
- [ ] **Step 2:** Replace every stub string with `content.t(id)`.
- [ ] **Step 3: Verify:** break it on purpose (delete one id) and confirm the error panel names it; restore.
- [ ] **Step 4:** Commit `feat: game reads generated text`.

### Task 8: Act 2 (the deadbolt)

**Files:** Create `js/acts/act2.js`; extend `world.js` (porch, bush, driveway, exterior ground and sky), `props.js`, `audio.js`.

Behaviors: spawn at the driveway at 8:30 PM with Cooper inside barking once; the front door is locked; dig the key (hold `E` at the bush); enter; laundry light on and hatch ajar (prop state); Cooper snarls at the patio slider, open 3 inches; the player picks up the broomstick in the kitchen and wedges it in the track (interaction at the slider); a trigger notes that this locks the intruder in (a subtle sound from the hatch). Act ends when the broomstick is placed.

- [ ] **Step 1:** Add director tests for Act 2 ordering (door interaction disabled until the key is found; broomstick placement disabled until it is held).
- [ ] **Step 2:** Implement; **Step 3:** Playwright run of the full act via debug hooks plus a key-driven run of the door and key; screenshot; **Step 4:** commit `feat: act 2`.

### Task 9: Act 3 (the eye in the closet)

**Files:** Create `js/acts/act3.js`; extend `props.js` (closet with a 2-inch crack, the eye), `phone.js`.

Behaviors: Mason sits on the guest bed on a call with Ethan (SMS-style call transcript on screen); the player triggers "drop the phone" after the call line; the camera pitches down to the bed frame; the eye in the crack becomes visible only when looking down; the whisper plays; `OC.phone.choice` with three options and an 8 s timer; choice C survives; A, B and `'timeout'` lead to the fail screen with a retry (Retry restarts Act 3 only).

- [ ] **Step 1:** Add tests: only option C resolves to survive; `'timeout'` resolves to fail.
- [ ] **Step 2:** Implement; **Step 3:** Playwright run of all three outcomes plus timeout; screenshots; **Step 4:** commit `feat: act 3`.

### Task 10: Act 4 and epilogue

**Files:** Create `js/acts/act4.js`, `js/epilogue.js`; extend `world.js` (bathroom window route, driveway car), `audio.js`.

Behaviors: lock the bathroom door, turn on the shower (audio masks footsteps), climb out the window, run to the car (sprint enabled, stamina-free), turn the key (engine sputters, dead), drop to the floorboard (camera low, view locked); a noise meter rises with mouse movement and key presses (no microphone); the intruder's crowbar smashes the window at a set moment; surviving 60 s of low noise brings sirens and the win; exceeding the meter ends in the fail screen with a retry. The epilogue is a VHS-styled screen: tally marks, the notebook "Tonight's Plan", credits.

- [ ] **Step 1:** Add tests for the noise meter (`createNoiseMeter() -> {poke(amount), tick(dt), level(), exceeded()}` in `js/engine/noise.js`, pure and tested: stays below threshold when idle for 60 s; exceeds when poked repeatedly).
- [ ] **Step 2:** Implement; **Step 3:** Playwright run of win and fail paths; screenshots; **Step 4:** commit `feat: act 4 and epilogue`.

### Task 11: Whole-game check

- [ ] **Step 1:** `npm test` and the Python tests all pass.
- [ ] **Step 2:** Playwright plays the game from `?act=1` to the epilogue using debug hooks, with zero console errors; screenshots from each act.
- [ ] **Step 3:** Try to break it: resize the window mid-game, drop pointer lock mid-set-piece, rapid-fire `E` on every interactable, switch tabs for 30 s, reload mid-act. Fix what breaks.
- [ ] **Step 4:** Write `README.md` (how to play, controls, how to rerun the bots) and `docs/perf.md` numbers; list what could not be checked (real feel on the Vivobook's own GPU, scare effectiveness, audio through speakers).
- [ ] **Step 5:** Commit `docs: readme and final check`.
