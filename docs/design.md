# Oakridge Crawlspace: design

Status: draft for Rohan's approval. Nothing has been built from this yet.
Date: 2026-11-15

## Intent

Rohan wants two things from one project:

1. **A game that is actually good**: a slow-burn, first-person horror game that plays in a browser on his Asus Vivobook and that he would hand to a friend. It is in the spirit of the short, domestic-dread episodes of the Fears to Fathom genre, but it is its own story with its own characters.
2. **An experiment with his four local models** (deepseek-r1:8b, llama3.1, llama3.2, qwen2.5-coder, via Ollama). They run for hours while he is at school or studying, so slowness is not the problem. Quality is.

When the two pull against each other, **the game wins**. Rohan chose this over a pure model-built game (see Approaches).

His first attempt (the `oakridge_crawlspace_build` folder on his Desktop, made by `ai_dev_team.py`) produced a green cube on a black screen. The models did not fail at the story brief. They failed at building a whole engine in one shot. The brief itself is the strongest asset in the project, and it stays the source of truth.

## The story (source of truth)

The `GAME_BRIEF` string in `ai_dev_team.py` is canon. Step one of the build copies it, unchanged, to `canon.md`.

Short version: Mason (17) is housesitting for three nights at his uncle's secluded L-shaped house with a golden retriever, Cooper.

- **Act 1, Arrival and Routine (7:30 PM to 1:30 AM).** Microwave dinner, feed Cooper, lock the sliding patio door, watch TV. The master bedroom window looks across the dark courtyard into the living room glass, and a silhouette shifts behind the blinds. Something scratches under the laundry room floor hatch ("rats").
- **Act 2, The Deadbolt (night 2, 8:30 PM to 12:00 AM).** The front deadbolt is locked from the inside. Mason finds a hide-a-key under a porch bush. The laundry light is on and the hatch is ajar. Cooper snarls at the patio door, which is open 3 inches. Mason locks it and wedges a broomstick in the track, which locks the intruder inside.
- **Act 3, The Eye in the Closet (12:30 AM).** On the phone with Ethan, Mason drops his phone and sees an unblinking eye through a 2-inch closet crack. The intruder whispers "Shhhh... It's okay, Mason. Go back to sleep." Mason has to pick the calm bluff ("Dropped my phone Ethan, gonna hop in the shower") over screaming or confronting.
- **Act 4, Shower Decoy and Car Siege (12:35 AM).** Shower on to mask sound, out the bathroom window, to the car. The engine is dead (battery cable pulled). The intruder smashes the window with a crowbar while Mason stays silent for 60 seconds, waiting for sirens.
- **Post-credits VHS screen.** 47 tally marks in the crawlspace and a notebook logging Mason's schedule and "Tonight's Plan".

## Goals

- Playable by double-clicking `index.html`. No server, no build step, no install.
- Runs smoothly on the Vivobook (Intel Iris Xe, no dedicated GPU). Target: 30 fps or better, to be measured in the first milestone, not assumed.
- **Phase 1 delivers Act 1 start to finish** (about 10 to 15 minutes), plus the model-written content pipeline. Phase 2 adds Acts 2 to 4 and the epilogue, each as its own plan.
- The world and story are data, not hard-coded: rooms, props, tasks, scare triggers and all text live in data files, so adding an act or swapping text never means rewriting the engine.
- Every piece of model-written text is checked by a script and chosen by a human before it goes into the game.

**Success for Phase 1:** Rohan plays Act 1 through without being told what to do, at least three beats make him uneasy (the silhouette, the scratching, Cooper reacting), and he would hand the laptop to a friend.

## Non-goals

- Multiplayer, saves, mobile or touch controls, voice acting, downloaded 3D models or art packs.
- Local models writing game code (that is the job of this build, not the experiment).
- Any scares that need real graphics horsepower.

## Anti-goals (failure even if it technically works)

- **Jump scares as the main fear.** The brief's dread is wrongness, not screaming faces. Restraint is the design.
- **Text that sounds like AI.** The first run produced "the lines between reality and nightmare are blurred." Anything like that fails.
- **A debug-looking world.** No placeholder cubes in the final Act 1.
- **A flattened house.** The L-shaped layout and the courtyard sightline from master bedroom to living room glass are the game's signature. If they are missing, it is a different game.
- **The player not knowing what to do.** Tasks must always be findable.
- **Silent failure.** Missing assets or a bad content file must produce a visible error, not a blank screen.

## Constraints

- Hardware: Intel i5-1334U, 15.6 GB RAM, Iris Xe. Windows 11.
- Opened straight from disk (`file://`), so **no ES modules** (browsers block them from `file://`). Use classic script tags.
- Three.js **r128** (the version already in use). Its core build has **no PointerLockControls** (verified), so the first-person controller is written as part of the game.
- Three.js has to reach the page either from a CDN script tag or as a local copy. A local copy needs a download (603 KB), which requires Rohan's yes at build time. Default: ask, then vendor it so the game works offline.
- Python is `C:\Users\Kolli\miniconda3\python.exe` (3.13, `requests` installed). Plain `python` in PowerShell hits the Microsoft Store alias. Node 20 and git are available.
- Ollama only, one model loaded at a time (16 GB RAM), `temperature` sent inside `options` (at the top level Ollama ignores it, which was tested).
- Overnight runs need the laptop plugged in with sleep off. Rohan changes that setting himself.

## Approaches considered

1. **Claude builds the game; local models write the text.** *Chosen.* Best game, and a smaller but real experiment. Models do jobs they are decent at and a script checks them.
2. **Local models build everything**, with a loop that runs the page and feeds errors back. Purest experiment, but one 8B coder cannot keep a whole game coherent. Expected result: a rough game.
3. **Hybrid**: the engine takes small, script-checked pieces (a room's props, a trigger) from the models as well as text. Most interesting experiment, more machinery.

Why 1: Rohan said the game has to be good. Because everything is data-driven, **approach 3 stays open later** by letting a model fill in props or triggers once the engine exists. The data format is designed with that in mind.

## Design

### Game engine (browser, Three.js r128, plain scripts)

- **Look.** PS1/VHS found-footage: low internal resolution scaled up with crisp pixels, fog, flat-shaded low-poly boxes, canvas-drawn textures, scanlines, vignette, tracking noise, a REC timestamp. Low internal resolution is also the performance plan.
- **Movement.** A custom pointer-lock controller: WASD and mouse-look, simple collision against walls and props, a light head bob. Sprinting only exists in Act 4.
- **Flashlight.** `F` toggles. A real spotlight that follows the camera, with a battery that drains (battery shown as an on-screen bar, not a world object).
- **World from data.** `content/house.json` describes the L-shaped house: rooms, doors, windows, and props by name. The engine builds walls and furniture from it. The long arm of the L and the courtyard window sightline are specified in this file.
- **Interaction.** Crosshair, `E` to interact, a short prompt when looking at something usable. Timed interactions (microwave, feeding Cooper) take real time, and that waiting is where scares happen.
- **Phone.** `Tab` opens it. It shows the task list and the SMS threads (Uncle Dave, Ethan). It is the main place model-written text appears.
- **Cooper.** A simple low-poly dog that follows Mason and stares at whatever is wrong before the player notices it. He is the game's fear barometer.
- **Events and acts.** Each act is data: its tasks, its triggers (condition and effect, such as "player looked at the window then looked away, then the silhouette moves"), and its advance rule. Effects are sounds, light flickers, prop changes, incoming texts and subtitles.
- **Audio.** Everything synthesized with the Web Audio API (no audio files): room tone, footsteps, microwave hum and beep, scratching that comes from the hatch's actual position in 3D, TV murmur. Sound carries at least half the fear.
- **Subtitles** for voiceover lines (no recorded or text-to-speech voice, because robotic voices kill dread).
- **Errors.** Content or asset problems show a visible error panel.

### Content pipeline (the experiment)

- **Story bible.** `canon.md` (facts that cannot be contradicted) and `style.md` (voice rules): Mason is 17 and casual; texts are short, specific and a little sloppy; the Reddit-style narration is flat and matter-of-fact with no foreshadowing adjectives. A few hand-written golden examples live in `style.md`.
- **Slots.** `content/slots.json` lists every piece of text the game needs. Each slot has an id, type (sms, voiceover, note, tv line, Cooper beat), speaker, length limit and what must or must not appear.
- **Runner.** `tools/content_team.py`: one model drafts several candidates per slot, another scores them against `style.md`, and a script checks them. Roles are a starting point to tune: llama3.1 drafts dialogue and narration, deepseek-r1:8b critiques (with `<think>` stripped), llama3.2 drafts bulk variants, qwen2.5-coder repairs structure. Sequential, resumable after a sleep or crash, with timings logged.
- **Hard checks (no model involved):** valid format, length, only known names, a banned-phrase list of AI clichés ("nightmare", "little did", "the lines between", "has only just begun" and so on), no repeated candidates, no contradiction with `canon.md`.
- **Human pick.** Candidates and scores land in `content/candidates/`. Rohan (or Claude with him) picks winners into the files the game loads. **Nothing is wired into the game automatically.** The game ships with hand-written placeholder text first, so it is playable before the pipeline exists.

### Order of work (Phase 1)

1. **Walkable house.** The empty L-shaped house, VHS look, flashlight, collision. Measure frame rate on the Vivobook. Playable, nothing to do yet.
2. **Act 1 world.** Furnished rooms, Cooper, interactions, task list, Web Audio ambience.
3. **Act 1 dread.** Phone with placeholder texts, the silhouette, the scratching, the hatch, the act's end.
4. **Content pipeline.** Story bible, slots, runner, checks; first overnight run; swap in the picked text.

Phase 2 (separate plans, in order): Act 2, Act 3 (the timed bluff choice, the centerpiece), Act 4 and the epilogue.

### Where things live

- The game goes in `C:\Users\Kolli\Projects\oakridge-crawlspace` (outside OneDrive so syncing does not fight git). It gets a git repo from the start, so a bad change never destroys the game the way `chat_editor.py` can.
- `oakridge_crawlspace_build` and `ai_dev_team.py` on the Desktop are left alone as a record of the first attempt.
- Rerunning `ai_dev_team.py` would overwrite that old folder, not the new game.

## Left to the builder

Room dimensions and colors, texture drawing, task and trigger timings, the in-game clock speed (7:30 PM to 1:30 AM compressed into a real-time act), code layout, validator thresholds, banned-phrase list details, how Rohan picks candidates (a small HTML picker page beats hand-editing JSON), and how the browser test run works (the in-app browser cannot execute local files, so likely a temporary local server for testing only).

## Calls made without Rohan (please check)

1. Phase 1 is Act 1 plus the pipeline; Acts 2 to 4 come after.
2. Three.js r128 plus my own controller, plain scripts, no server.
3. New folder under `Projects`, git from the start, old attempt left untouched.
4. Subtitles only, no voice. Synthesized audio, no audio files.
5. Models never write code or touch the game directly; a human picks every line.
6. "Fears to Fathom" is dropped from the title. The game is just *Oakridge Crawlspace*.
