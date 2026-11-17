# Oakridge Crawlspace v2: story bible

Status: approved by Rohan on 2026-11-15. This is the story's source of truth for v2.
`docs/design-v2.md` holds the build rules and points here.

**Sources:**
- **Rohan's horror-psychology research report.** Its rules come first, because it's real.
- **His story-idea paste.** Ideas used as written are marked *(theirs)*; ideas changed to fit are
  marked *(merge)*.
- **Claude's additions**, marked *(mine)*.

**The goal, in Rohan's words:** terrifying even for someone who isn't easily scared by movies, very
fun, creative, and a character so memorable that "if people turn off their computer or phone and
they're still scared, or think about it every once in a while, we won."

## Decisions (Rohan)
- **The man grew up in the house:** Wes Hale, a real-world phrogger, no ghosts.
- **Length:** about 60 minutes, with a daytime Day 2.
- **Features:**
  - the pet cam;
  - a notebook that records your habits;
  - the deputy visit;
  - crawling under the house;
  - "a bunch more stuff".
- **Endings:** one earned bad end. His endings depend on evidence, and he is **never caught** (his
  idea).
- **From before:**
  - CC0 low-poly kits, asking before each download.
  - Night 1 is built first.
  - No weapons. All text is hand-written.
  - Commit locally only.
  - The bush is left of the porch.
- **New rule** *(mine)*: **Cooper is never hurt**, in any ending.

## The design target: scaring a horror fan (from the research)
- **They don't habituate as easily, and they stare at threats.**
  - So staring is answered with nothing (the look-away rule).
  - The worst things happen at the edge of view or behind you.
  - The threat adapts to habits (gated learning), so they can't settle on a safe routine.
- **Personal violation beats gore.**
  - The notebook writes down what YOU did.
  - "Tonight's Plan" lists your routine.
  - The last page carries the real date and time you started playing *(mine)*.
- **Real is what lingers.** Phrogging is real. A closing card, Fears to Fathom style, says so (facts
  checked before writing).
- **Presence:**
  - The title screen asks for headphones and full screen.
  - Audio moves to real 3D (Web Audio `PannerNode` with HRTF), so you hear where he is: above, below,
    behind a wall.
- **Silence is a weapon.** Familiar house noises stop (fridge hum, clock, rain) right before he's
  near.

## The character: Wes, "the man in the hoodie" (built to be remembered)
- **Silhouette:**
  - About 6'5" and skeletal. He's stooped from years under the house, head pushed forward.
  - **His signature move: unfolding.** He rises from a crouch to full height, slowly, taller than the
    door frame, and his knees pop.
- **Clothes:**
  - **The same faded navy hoodie** as the 1999 missing poster ("OAKRIDGE TIGERS", the print cracked).
    It's too small now, and the sleeves stop short of his long, pale, bony wrists. The hood is always
    up.
  - **Barefoot,** with filthy feet, and insulation fluff and dust on his shoulders.
- **Face** (seen clearly only twice: the bad end and the car window; partly in the eye):
  - grey-pale, gaunt, an overgrown beard, cracked lips;
  - **a calm, gentle, too-wide smile that never changes;**
  - eyes wide and unblinking.
  - **In flash photos his eyes glow red-eye bright**, a grounded camera effect.
- **Behaviors** (the complexity fallacy says players must be able to read him):
  - He **tilts his head like a dog when he listens**.
  - He does **three soft knocks**, his calling card.
  - He holds a finger to his lips.
  - He never runs, never yells, and speaks softly, like to a child.
- **Sound:**
  - **He hums his mother's lullaby**, an original melody that plays again after the credits *(mine)*:
    the earworm that lingers.
  - Bare-foot thuds, slow nose breathing.
- **His lines:**
  - "Shhh... It's okay, Mason. Go back to sleep." (his mother's words)
  - "This is my room."
  - "You left the light on."
- **Iconic images to design for:**
  - **Two bare feet in the light gap under the bathroom door.**
  - The head-tilt silhouette at the end of the hall in lightning.
  - The red-eye flash photo.
  - His face against the car glass.
  - Him standing in the open front door in the storm, finger to lips, not chasing.
- **How he's built:**
  - **Model:** first try a rigged CC0 low-poly human (Quaternius-style; check the licence and ask
    before downloading). Stretch it thin, add a custom hoodie, and give it a hand-painted 256 px canvas
    face. If that doesn't work, fall back to a code-built figure.
  - **Poses:** simple poses for tilt, crouch, unfold, crawl and finger-to-lips.
  - **Check:** judge readability with screenshots in the dark.

## The truth (never told outright; the player pieces it together)
- **The Hales (1985 to 2000):** Wes's bedroom is today's **guest room**. He hid **under the house**
  when his dad got angry. His mom said "Shhh, it's okay. Go back to sleep."
- **1998:** a "footsteps inside the walls" clipping about the Hales. It was teenage Wes hiding below,
  and nobody knew *(merge)*.
- **1999:** Wes, 16, runs away in the navy hoodie. The house is sold; Dave bought it years later.
  The Hale boxes are still in the shed.
- **This year:** Wes, 43, comes home.
  - **How he gets in:** the loose crawlspace vent behind the bush, and the fake-rock key.
  - **What he does:**
    - He lives under the house and sleeps right under the guest bed.
    - He eats the food and feeds Cooper. "He will lie to you about this" was Wes all along *(mine)*.
    - He forges Dave's handwriting from weeks of Dave's sticky notes *(merge)*.
  - **47 tally marks.**
- **Dave isn't a villain.** He's oblivious and funny, and thinks it's mice ("old house, noisy").
  Rohan's "Dave is away, or says he is" stays as player suspicion only. Ethan jokes "what if it's Dave lol", and nothing in the game confirms it.
- **Cooper's tell changes** *(merge)*:
  - Early on he **wags** at the hatch. It seems funny: he knows Wes.
  - Once Wes turns hostile (Night 2), he **growls**.
  - When Cooper stops wagging, you're in danger.
- **The plan escalates:**
  - "Make him leave" is why he deadbolts you out.
  - The deputy, the broom and the eye turn him.
  - He knows Mason's name from Dave's fridge note.

## The episode, beat by beat (fear 1 to 10)

### Night 1, "The House Learns You" (7:30 PM to 2:15 AM; about 16 min; fear 1 → 6 → 2)
- **The routine, in any order** (the phone To-Do list guides you):
  - **Dinner as a personality test:**
    - Dave's lasagna. The label says MASON, in handwriting that doesn't quite match Dave's other notes.
    - Pizza, in the oven.
    - Mac and cheese, with the kettle.
    - Cereal: the milk is expired, and that adds it to the shopping list.
    - **The suspicious Tupperware** leads to the gag ending.
    - Watch it heat through the microwave keypad. Eat at the table while Cooper begs. Giving him a
      bite or not is logged.
  - **Cooper:** feed him one scoop (he begs for two), pet him, play fetch, do tricks *(mine)*: sit,
    paw, play dead.
  - **Around the house:**
    - **Mail:** an exterminator invoice ("Rodent: suspected large"), and a church newsletter
      addressed "To the Hale family or current resident".
    - **Trash:** the treeline, and **one light blinking between the trees, once** *(theirs)*.
    - **Washing up** puts you by the hatch. **Brushing your teeth** shows the hall in the mirror.
  - **TV with remote:**
    - Channel 7 news about Route 9 food thefts.
    - A painfully cheap infomercial.
    - A nature show about animals that live in other animals' burrows.
    - Weather: a storm tomorrow.
    - **Late on Night 1, an emergency alert** about a prowler on Route 9 interrupts every channel, then vanishes as if it never happened *(theirs)*.
    - **After the settled-in gate, a channel change** goes black for one frame, and the reflection shows someone standing behind the couch where you aren't *(theirs)*.
- **The house's running jokes:**
  - Dave's passive-aggressive sticky notes and terrible pun magnets. You can collect them *(mine)*.
  - The singing-fish plaque (motion sensor, an original goofy jingle) teaches you the fish means
    motion.
- **The contradictions start** *(theirs)*:
  - Food you remember is missing.
  - A small fridge note in "Dave's" hand says **"If you hear scratching, it's the pipes."**
  - Cooper won't enter the laundry room. If you coax him, he sniffs the hatch and backs out with his
    ears flat.
- **Fake scare to set the baseline:** Cooper knocks a pan off the counter while begging (3, then a
  laugh).
- **Settled-in gate** (about 4 tasks or 8 minutes), then:
  - **The camera:** a flash photo shows **a hooded shoulder in the far hallway, eyes red in the
    flash**. Looking up, it's empty *(theirs, plus red-eye)*.
  - **The scratching travels** under the floor from room to room and **stops right under your feet**.
    Cooper growls.
    - You can turn on lights, call him over, or check the hatch.
    - Each choice plays out differently, and none reveals Wes.
  - **The climax** *(merge)*: Dave's lamp comes on across the courtyard and a shape moves behind the
    blinds (existing). You look away; when you look back it's gone. Cooper is staring at the closed
    laundry door. **Three soft knocks** from the other side. It's empty when you open it.
- **Relief:** lights, Cooper settling beside you, a ridiculous message from Ethan.
- **Bed:** at **2:13 AM the pet cam says "Motion detected: Living Room."** On the feed Cooper lifts
  his head toward the hall... and wags.

### Day 2, "Daylight" (10 AM to 8:30 PM; about 16 min; fear 1 → 5 → 2)
**Morning:**
- **Sunlight:** the clearest switch to safety. Cooper naps in a warm patch of light.
- **Small wrongness:** the pet cam saved a 3:40 AM clip of the camera being slowly turned to face the
  wall.
- **Calls:**
  - **Mom:** warm and funny.
  - **Dave:**
    - "I don't have a lamp timer... huh. Old wiring."
    - About the pipes note: **"I didn't write that. What pipes?"**
    - He gives you Deputy Ray's number.
- **Ethan:** "dude google phrogging" opens an in-phone article about real cases (checked first).
- **The deputy decision.** If you call: Deputy Ray Pruitt *(mine)*.
  - **Who he is:** sunflower seeds, fantasy football, calls Cooper "Sergeant".
  - **What he finds:** every clue gets a reasonable explanation. The guest room closet is empty. The
    hatch is padlocked: "Rats can't pick locks." The vent screen: "Raccoons."
  - **Afterwards:** VO: "He was nice about it. That was the worst part." The game logs `calledDeputy`.
    Calling him again gets "Ray's out on a call, someone can come Thursday."

**Afternoon lore**, in calm time:
- **The guest closet frame:** growth marks from WES 6 to WES 15, and one fresh pencil line at adult
  height: **"WES, home"**.
- **The shed:**
  - the Hale boxes;
  - the Little League photo;
  - a yearbook ("Wesley Hale, class of 2001, did not graduate");
  - an empty crowbar hook.
- **Dave's office:** his email to the exterminator: "they're taking whole cans of soup".
- **Phone fun:** Flappy Cooper and Ethan's mixtape.

**Store trip** in the evening (fear 2 → 5) *(theirs)*:
- **The drive:** a local talk-show radio with bad ads and a caller whose pantry food keeps vanishing.
- **Gas-N-Go:**
  - **The cashier:** dialogue choices. They know "the Dave place", say people used to talk about
    someone hiding in old houses on Route 9, laugh it off, and change the subject.
  - **The bulletin board:**
    - the **1998 "footsteps in the walls" clipping**;
    - **a faded MISSING poster: Wesley Hale, 16, in a dark hoodie.**
  - **A hooded shopper** watches you from the end of an aisle and leaves without buying anything.
- **The drive home:** a deer in the headlights. After it bolts, **a person-shaped silhouette stays at
  the roadside a beat too long, facing the car.**

### Night 2, "The House Has Changed" (8:30 PM to midnight; about 12 min; fear 5 → 7, 8 in the crawl)
- **Getting in:** the deadbolt is locked from inside, because his plan is "make him leave". The
  **porch light flickers on by itself.** You use the fake-rock key in the yard. Cooper waits inside
  the door, hackles up.
- **What changed** *(theirs)*:
  - a chair pulled out;
  - the toilet seat up;
  - **a wet footprint ending at the hatch**;
  - a family photo turned face down;
  - the guest bed remade with tight corners;
  - **the shared list on Dave's kitchen tablet has a new item finger-scrawled: "milk"**, added while
    you were at the store *(merge)*.
- **The fridge note now reads:** "If you hear scratching, it's ~~the pipes~~ **not the pipes**."
- **A familiar joke, altered:** a new sticky note in Dave's style is on the guest room door: "THIS IS NOT YOUR ROOM."
- **While you unpack,** food disappears from the grocery bag the moment you leave the room. The dog
  food is untouched.
- **The existing act:** the laundry light, the hatch open with the padlock gone (Dave's key hook is
  empty), the slider open three inches, the broom in the track.
- **The storm starts:** rain, wind, lightning lighting the yard.
- **Habit gates (gated learning):**
  - Lights always on last night → the breaker trips. You reset it in the laundry room, beside the
    open hatch.
  - Heavy phone-light use → it falters sooner.
  - Kept checking Dave's window → **tonight's glimpse is in the black TV: the hall door open in the
    reflection, closed in the room** *(theirs)*.
- **The scare pool** (the Director draws from it, one-time and on cooldowns; full list below):
  - the fish sings by itself in the dark hall;
  - **the light that follows you**;
  - breathing at a vent.
- **Optional: down the open hatch into the crawlspace** *(theirs; the crawl moves to the open hatch on
  Night 2)*.
  - **The space:** prone, phone light, pillars, insulation, low and wide. A threat could come from
    any side.
  - **His things:**
    - a sleeping bag **right under the guest bed**;
    - food wrappers, Dave's empty Tupperware, the Hale photo;
    - **46 tally marks**.
  - **His notebook:**
    - **your Night 1 in his handwriting**, built from your logged actions;
    - **"TONIGHT'S PLAN"**: your routine, "dinner, TV, bathroom, bed".
  - **The choice:** photograph it (evidence; he never knows), take it (he knows), or leave it.
  - **Footsteps overhead stop when you stop** *(theirs)*. Then **someone sits down on the floor right
    above you; dust sifts through the boards.** Then **the house landline starts ringing upstairs**
    *(theirs)*. Cooper whines somewhere above.
  - **If you took the notebook:** it's back on your pillow later, with a new page: **"GIVE IT BACK
    NEXT TIME."**
- **The pet cam goes offline** at 11:58 PM.

### 12:30 AM, "The Call" (about 6 min; fear 4 → 9 → 8) *(merge of theirs and the existing act)*
- **Dave calls,** casual at first, then: "have you heard anything in the walls?" The exterminator told
  him the "droppings" were food wrappers. He denies knowing anything about the hatch being opened.
  Then the call cuts out.
- **Three soft taps from the closet.** Choose:
  - leave it;
  - call Cooper;
  - **open it, which is the earned bad end:** he's there, unfolding. "This is my room." Cut to
    black.
- **Jump scare 1:** you raise the phone camera at the dark closet gap. The flash photo shows **an
  unblinking eye at the edge of the frame**. You look up: nothing.
- **The whisper:** "Shhh... It's okay, Mason. Go back to sleep." Then the existing bluff choice
  (scream, confront, or "gonna hop in the shower"). A wrong choice is the closet burst, **jump
  scare 2** (failure only).
- **Cooper turns and growls at the bedroom door,** not the closet. **Handles are being tried
  elsewhere in the house,** each followed by a pause, then footsteps under the floor.
- **The walk to the bathroom:** don't look back, the charger at the edge of view, lock the door.

### 12:35 AM, "The Search" (about 10 min; fear 8 → 10 → 1) *(merge: their search, plus the car for the reveal)*
- **The bathroom:**
  - shower on as a decoy;
  - **his footsteps cross the house through the walls**;
  - a handle turns;
  - **two bare feet stop in the light gap under the door** while he listens;
  - the scrape;
  - the storm has swollen the window shut.
- **Stealth through your own house:**
  - **His behavior:** he searches; he doesn't chase. Check a room, try a handle, tilt his head and
    listen, move on.
  - **Your tools:**
    - Cooper guides you, scared himself;
    - the pet cam back online works as a crude tracker for the living room;
    - lightning and silence as warnings.
  - **Two routes:** quiet past the laundry room, or fast through the kitchen.
  - **Gated:** hide in the same spot twice and he checks it next time.
- **The front door** *(theirs)*: the chain is fastened. You fumble with it while **a footstep comes
  up behind you and stops.** No attack is shown. The door opens.
- **Outside in the storm:** you run to the car. It's dead (the battery cable is pulled). Get down.
  - He comes out and walks to the car in the rain and tries the handles.
  - **Jump scare 3:** a lightning flash shows **his smiling face pressed to the glass**, head
    tilted. Three soft taps on the window. "Go back to sleep, Mason."
  - **Hold still and silent for 60 seconds.** If you move or make noise, the glass smashes: a fail
    screen and retry.
- **Sirens** (Ethan or Dave called 911). He steps back, walks, never runs, into the trees, and looks
  back once.
  - **If you called Ray, it's Ray at the window:** "Mason. It's Ray. You're okay." The strongest
    relief of the episode.

### Epilogue, "What Can Be Proven?" (about 2 min; a cold 5) *(theirs, plus the notebook)*
- **The scene:** you sit safe with Cooper. Your phone holds whatever evidence you found.
- **The cards:**
  - **The VHS cards:** the sleeping bag, 47 tally marks.
  - **The notebook, read out with your real habits from both nights,** ending with the real date and
    time you started playing.
  - **A short news report:** police found signs that someone had been living in the house, but **no
    one was caught**.
  - **Others:** Dave's account is vague. The cashier remembers you, but not the hooded man.
- **The ending, by evidence** (`js/engine/evidence.js`):
  - **Strong** (3 or more key items, including one that shows him): police identify **Wesley Hale,
    missing since 1999**. "He has not been found."
  - **Partial:** officials suspect trespassing but can't say how long he was inside.
  - **Little:** your account is treated as panic and exhaustion.
  - **Crawlspace line** (if you read Tonight's Plan): you know he planned to stay.
  - **Deputy line:** "Deputy Pruitt had taken a report that morning. He apologized."
- **The final scene:** the house in daylight. It looks harmless. A new note on the fridge, in
  "Dave's" hand: **"You left the light on."** After the credits, the hum.
- **Two separate endings:**
  - **The bad end:** "TONIGHT'S PLAN: done." Cooper is found safe under Dave's bed.
  - **The gag end** *(mine)*: you ate the Tupperware. Food poisoning, and Mason spends the nights in
    the bathroom. "Dave got home Thursday. The soup was gone. So was the padlock."
- **The title screen afterwards** *(mine; their idea of a calm title view of the house)*: after any
  ending, it shows the same calm house, but a light is now on in the guest room window.

## Rohan's ideas: where each one landed
| His idea | Where it is |
|---|---|
| Dave says it's an old, noisy house with mice | The truth: Dave, the mail invoice, the Day 2 call |
| "Dave is away, or says he is" | Kept as player suspicion only (Ethan's joke); never confirmed |
| Cooper seems funny, then turns out to be warning you | Cooper's tell: he wags early on, growls once Wes turns hostile |
| A hooded phrogger in crawlspace and walls who waits, listens, tests doors, retreats | Wes; the search jobs; the Director pulls him back after peaks |
| Food missing from the fridge | Night 1 contradictions |
| The pipes note Dave denies writing | Night 1 note; Day 2 Dave call; Night 2 "not the pipes" |
| Cooper won't enter the laundry room; sniffs the hatch; ears flat | Night 1 contradictions; the blocked route in the scare pool |
| The burrow nature show; your reflection in the wrong place | The Night 1 TV; the channel-change reflection |
| A flash photo shows a hooded shoulder | The Night 1 camera, plus red-eye |
| A light blinking once in the trees | Night 1 trash |
| Cooper knocks a pan off the counter | The Night 1 fake scare |
| Scratching travels and stops under your feet; three choices | Night 1, after the settled-in gate |
| The lamp shape, Cooper at the laundry door, a soft knock | The Night 1 climax *(merge: it stays Dave's window across the courtyard)* |
| Relief: lights, Cooper, Ethan's message | After the Night 1 climax |
| Talk radio, bad ads, the caller with the vanishing pantry | The Day 2 drive |
| The cashier knows "the Dave place" and the Route 9 gossip | Gas-N-Go |
| The 1998 walls clipping; the missing poster in a dark hoodie | The bulletin board *(merge: the poster is Wesley Hale)* |
| A hooded shopper watches, then leaves | Gas-N-Go |
| The deer, then a silhouette at the roadside | The drive home |
| Deadbolt locked from inside; the porch light; Cooper's hackles | Night 2 arrival |
| Chair, toilet seat, wet footprint, photo face down, missing food but dog food untouched | Night 2 changes |
| "milk" added to the list in strange handwriting | Night 2 *(merge: the shared list on Dave's kitchen tablet)* |
| The crawlspace: sleeping bag, wrappers, tally marks, Tonight's Plan | The Night 2 crawl, plus your logged routine |
| Footsteps overhead stop when you stop; Cooper whines | The Night 2 crawl |
| He sleeps right under the laundry room | *(merge)* right under the guest bed instead, which is worse |
| Dave calls, asks about the walls, denies the hatch; the call cuts | 12:30 AM, the Call |
| Closet tapping; open it, leave it, or call Cooper | 12:30 AM *(merge: opening it is the earned bad end)* |
| The phone camera shows an eye | Jump scare 1 |
| Cooper growls at the bedroom door; handles tried; footsteps below | 12:30 AM |
| Storm, the bathroom, a handle turns, he listens outside | 12:35 AM, the Search |
| Stealth through the house; Cooper guides; quiet or fast route | 12:35 AM |
| He searches, he doesn't chase | Wes's jobs |
| The chain on the front door; a footstep stops behind you; no attack shown | 12:35 AM |
| Sirens as the strongest relief | 12:35 AM *(merge: after the car, with Ray if you called him)* |
| Epilogue: phone evidence, news report, Dave vague, the cashier remembers you | Epilogue |
| "You left the light on" | The final scene |
| Strong, partial and little evidence, and the crawlspace ending | `evidence.js` endings |
| All ten extra scares | The scare pool |
| Dinner as a personality test with payoffs | Night 1 dinner; the gag ending |
| Cooper begs, fetches, naps in the sun, won't pass the laundry room | Night 1, Day 2, the scare pool |
| Sticky notes, pun magnets, the singing fish, a joke that comes back altered | Night 1 jokes; "THIS IS NOT YOUR ROOM"; the fish on Night 2 |
| Chores double as exploration | Night 1 routine |
| TV as comfort and evidence, the emergency alert | The Night 1 TV |
| A normal phone with unnerving uses | The phone apps, camera and pet cam |
| The store trip as a social breather with a bad aftertaste | Day 2 store trip |
| Assemble the phrogging story from clues | The lore spots, the mail, the clipping, Dave's email |
| A hidden routine shown through changes | Night 2 changes |
| Tension responds to habits | Habit gates and `tension.js` |
| Every scare has a landing | The relief beats; the research table |
| Evidence changes the ending's tone | `evidence.js` |
| The environment narrates; silence matters | Sound design; sudden silence |
| The title screen as part of the atmosphere | The title screen, and its change after an ending |
| A very scary, memorable character | The Wes character section |

## The scare pool (the Director's toolkit, placed by night and fear level)
All of these are player-independent unless marked "you":

| Scare | Notes |
|---|---|
| **Repeated knocks** | Three under the floor; later three answer from inside a wall. One source or two? Never answered. |
| **The held breath** | Breathing at a vent. Hold still and it stops; move away and it starts again behind you. |
| **Cooper's empty fetch** (you) | The toy rolls under a closed door, and Cooper refuses to get it. |
| **The wrong reflection** | Black TV: a door open in the reflection, closed in the room. |
| **The light that follows** | A light switches on in the room you just left, never ahead of you. |
| **The familiar sound** | The fridge opens and a plate is set down. In the kitchen the fridge is shut and the plate is gone. |
| **The almost-sighting** | A shape leans out at the end of the hall. It's a coat. Later the coat is folded on your bed. |
| **The blocked route** | Cooper won't pass the laundry room and keeps looking back at the hatch. |
| **The changed note** | "it's ~~the pipes~~ not the pipes". |
| **Sudden silence** *(mine)* | The fridge, clock and rain stop for 3 seconds before he's near. |
| **The fish** *(mine)* | Comic on Night 1, by itself on Night 2. |
| **Idle punish** | Stand still too long and the house makes a sound behind you, followed by a real relief beat. |

## Fun (Rohan: "very fun too")
- **A routine full of choices:** dinner, Cooper (fetch, tricks, petting), TV channels, chores.
- **Collecting:** Dave's pun magnets and sticky notes *(mine)*.
- **Phone:** Flappy Cooper, Ethan's mixtape, camera, pet cam.
- **People:** dialogue with the cashier and the deputy. Ethan and Mom as running comic relief.
- **Replay:** 6 endings (3 evidence tiers, bad, gag, plus variants), achievements *(mine)* like "Two
  Scoops", "Food Critic" (all dinners), "Phrogged" and "Good Boy", and chapter select.

## Research coverage (every finding, and where it lands)
| Finding | Where |
|---|---|
| Amygdala and fast jump scares need consequences | Only 3: the flash-photo eye, the closet burst (on failure), the face at the car glass. Each can fail you. |
| BNST dread from unpredictable threats | Scratching that travels, knocks, the 2:13 alert, the scare pool, the Director's random timing. |
| Habituation (IPN): repeats stop working | The cue type escalates: sound, light, photo, evidence, contact, search, siege. Pool items are one-time and never back to back. |
| Cortisol needs oxytocin relief | Petting Cooper, the calls with Mom and Ethan, Ray at the window. |
| BDNF and mental fatigue | 60 minutes with Day 2 as a rest. Above 7 only in the crawl and the climax. |
| Big heart-rate swings mean fear; small ones mean fun | A curve that rises each night, plus micro scares and micro reliefs inside it. |
| Skin response tracks frustration | Clear failure reasons, generous checkpoints, the To-Do list always says what's next. |
| Adapting live to the player | The Director reads stress signs (fast turns, sprinting, backing up, hugging the light) and adjusts lights and 4 audio layers. |
| Tunnel vision; horror fans stare | Lore in daylight; glimpses at the edge of view; staring is answered with nothing. |
| Excitation transfer needs a clear switch to safety | Morning sun, climbing out of the crawlspace, the sirens, Ray. |
| Agency makes it personal | Every choice above; the notebook reads your night back to you. |
| Empowerment kills fear; the complexity fallacy | No weapons. Wes's readable behavior: the tilt, the knocks, searching not chasing. |
| The fear spectrum | Each section has a target (below). |
| Presence (VR) | Headphones and full screen, HRTF 3D audio, first person. |
| The two-tier Director (Alien) | `tension.js` decides when and where; Wes's jobs decide how. He pulls back after peaks. |
| Gated learning | The breaker, the phone light, the moving glimpse, hiding spots, "GIVE IT BACK". |
| Sound with no visible source | Under the floor, in the walls, the landline, the hum, the voice through the glass. |
| Warning sounds vs. sounds timed to a scare | Warning: Cooper's tell, cam alerts, silence, the fish. Timed: the photo flash sting, the lightning face. |
| 3D sound and binaural audio | HRTF panning, plus the existing muffling through walls. |
| No room to move, threats from every side | The crawlspace, the dark yard and treeline, the empty road. |
| Scares you trigger vs. scares that come for you | You trigger: the flash photo, the notebook, opening the closet, the fetch. They come for you: knocks, the light that follows, idle punish. |

**Fear curve:**
- Night 1: 1 to 3, a peak of 6, then 2.
- Day 2: 1 to 3, the store up to 5.
- Night 2: 5 to 7, the crawl at 8.
- The call: 9.
- The search: 8 to 10, then 1.
- The epilogue: 5.

## New systems
- **Pure modules, test-first, UMD like `js/engine/*`:**
  - **`habits.js`:** the action log, gates, and `notebookLines(log)`.
  - **`tension.js`:** menace, budget, cooldowns, forced relief, stress signs, no repeats.
  - **`scarePool.js`:** eligibility by night, fear level and cooldowns, one-time items.
  - **`evidence.js`:** `resolveEnding(state)` for all endings and variant lines.
  - **`food.js`** and **`tvSchedule.js`**.
  - **`achievements.js`**.
- **Wes:**
  - `js/wes.js`: the model, the face, poses, the hum.
  - Search "jobs" (go to a room, check it, try a handle, listen, move on), built on `path.js`,
    `noise.js` and `sightline.js`.
- **Phone and audio:**
  - `js/petcam.js`: a second fixed low-res camera drawn into the phone; clips, alerts, snapshot.
  - Phone camera with flash photos saved to an evidence album.
  - HRTF audio in `js/audio.js`.
- **World:**
  - Prone mode in `js/controller.js`.
  - Spaces reached by fades: the crawlspace, the shed, the store, the road.
  - Daytime lighting and the storm.
- **Acts and saves:**
  - `ACT_ORDER` becomes `act1, day2, act2, act3, act4`.
  - **The habit log, evidence and achievements persist with the checkpoint.** Chapter select uses a
    default log.

## Build order (each phase playable and committed)
0. **Done:** bugs and foundations.
1. **Night 1:**
   - the routine and dinner, TV, mail, trash, sticky notes, the fish;
   - the camera and pet cam;
   - `habits.js` and `tension.js` with `scarePool.js`;
   - the gag ending.
2. **The look and Wes:**
   - CC0 kits (ask first);
   - the Wes model and face, screenshot-judged;
   - daytime lighting;
   - outside: the vent, the shed.
3. **Day 2:** the calls, the article, the deputy, the lore, the store trip and drive.
4. **Night 2:** the changes, the tablet list, the gates, the storm, the crawl in prone mode.
5. **The Call and the Search:**
   - the Act 3 rework, with the bad end;
   - Act 4 stealth with Wes's jobs, the chain door, the car reveal, Ray.
6. **The epilogue:** evidence and endings, the notebook, "You left the light on", the title-screen
   change, achievements.
7. **The pass:** scare and pacing, HRTF audio, writing and humor, credits.
8. **Learn from the neighbours** *(Rohan, 2026-11-17: "when the game is done - Go online and search up
   games similar to these, fears to fathom and see what seperates us from them and make it not a carbon
   copy but take the positives and negatives")*:
   - research Fears to Fathom and the games like it (what players praise, what they complain about);
   - write down what separates Oakridge from them, in `docs/research-similar-games.md`;
   - adopt the strengths in our own way and steer clear of the weaknesses, without copying any game.

## Critical files
- **Docs:** this file and `docs/design-v2.md`.
- **Later phases:**
  - `js/acts/act1.js`, a new `js/acts/day2.js`, `act2.js` to `act4.js`, `js/epilogue.js`;
  - `js/main.js`, `js/phone.js`, `js/controller.js`, `js/props.js`, `js/world.js`, `js/audio.js`;
  - `content/text.js`, `content/house.js`.
- **Reuse:**
  - `js/engine/director.js` for tasks and triggers;
  - `pick.js`, `path.js`, `silhouette.js`, `bluff.js` (createStareRule), `noise.js`, `doors.js`;
  - `hud.read()` for the notebook, notes, clippings and article;
  - `OC.debug.advance` and `sweep`.

## Verification
- **Each build phase:**
  - `npm test` green, with new modules written test-first (the ending resolver covers every ending);
  - `sweep()` extended to the new interactions;
  - a scripted browser run with zero console errors;
  - screenshots of each new scene, and of Wes, judged in the dark;
  - offline `file://` boot;
  - draw calls under about 150.
- **Only Rohan can judge:** whether it actually scares him, whether the jokes land, real-GPU frame
  rate.
