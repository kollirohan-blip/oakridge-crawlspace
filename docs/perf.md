# Performance notes

What was measured, where, and what it does and does not tell you.

## Task 2: walkable house (2026-11-15)

Measured in headless Chromium (software WebGL, not the Vivobook's Iris Xe GPU) at a 480x270 internal
resolution, 1280x720 window.

| Scene | Draw calls | Triangles | JS work per frame |
|---|---|---|---|
| Living room, looking at the glass | 17 | about 2,200 | 0.4 to 1.8 ms |
| Hallway with the phone light on | 17 | about 2,000 | 1.7 ms |
| Porch, outside | 17 | about 2,200 | 0.4 ms |

Before batching static geometry by texture (one mesh per wall piece), the same scenes took 154 to 375
draw calls per frame. Merging everything that never moves into one mesh per texture cut that to 17,
which is the number that matters on integrated graphics.

**What this does not tell you:** GPU time. "JS work per frame" is the CPU time spent updating and
submitting a frame, not how long the Vivobook's GPU takes to draw it. A real frame rate on the laptop
has not been measured. The scene is small (a couple of thousand triangles, low internal resolution),
so it should be comfortable, but that is a judgment, not a measurement. Check it once by playing.

## Finished game (2026-11-15)

Same setup. Draw calls with all props, Cooper, the car and the intruder in the scene:

| Scene | Draw calls |
|---|---|
| Act 1, living room / kitchen | 23 to 44 |
| Act 2, the driveway (trees, car, house) | about 96 |
| Act 2, laundry room | 28 |

Still far below what integrated graphics struggle with. Path-finding for Cooper and the intruder takes
about 3.5 ms per route across the whole house, and only runs a couple of times a second.

To see your own numbers: open the game, click to play, open the browser console and run
`OC.debug.stats()`.

## Phase 1, Night 1 (2026-11-16)

Same setup (headless Chrome, software WebGL, 480 px internal width). Night 1 adds two extra render
passes that only run sometimes: the pet cam (5 times a second, only while its app is open) and the
bathroom mirror (only while you are in the bathroom facing it). The numbers are whole frames,
including those passes.

| Scene | Draw calls |
|---|---|
| Living room, a frame where the pet cam renders | 141 |
| Kitchen, pet cam open | 96 |
| Living room toward the kitchen | 95 |
| Hall, looking north | 100 |
| Bathroom at the mirror | 97 |
| Driveway toward the house | 104 |

Two changes kept this under the ~150 target: the 26 blind slats in Dave's windows are now part of
the static batch (they were 26 meshes), and the pet cam only sees 13 m (a cheap IR camera sees the
room, not the house). Before them the pet cam frame was 190.

Not measured: the frame rate on the Vivobook's own GPU.
