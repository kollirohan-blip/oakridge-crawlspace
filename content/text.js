// Story text, keyed by id. Hand-written. (tools/build_text.py can regenerate this file from
// content/slots.json if model-written lines are ever picked over these.)
(function () {
  var OC = (window.OC = window.OC || {});
  OC.textData = {
    // ---- Act 1 ----------------------------------------------------------------------------------
    'act1.vo.open':
      "My uncle Dave asked me to watch his house for three nights. A hundred and fifty bucks, a golden retriever named Cooper, and a house in the middle of nowhere. I figured it was the easiest money I'd ever make.",
    'act1.vo.silhouette':
      "I want to be clear about one thing. I never went into Dave's room that night. Not once. I didn't even know where the lamp switch was.",
    'act1.vo.end': 'I told myself it was a coat on a hook. I slept with the light on anyway.',
    'act1.note.fridge':
      "MASON. Cooper gets ONE scoop, nights only. The slider sticks, make sure it's locked. Don't mess with the hatch in the laundry room, it's padlocked, rats. Back Thursday. Dave",
    'act1.sms.dave1': "You get in ok? Lasagna's in the fridge. Cooper eats around 8, one scoop. He'll try to con you into two.",
    'act1.sms.ethan1': "yo how's the murder cabin",
    'act1.sms.mason1': "its not a cabin. its just really far from everything",
    'act1.sms.dave2':
      "Forgot to say. If you hear scratching under the laundry room that's the rats. Guy's coming next week. Don't open the hatch.",
    'act1.thought.microwave': 'Uncle Dave left me a lasagna with my name on the lid. Okay.',
    'act1.thought.microwaveDone': "Smells good. Better than whatever I'd have made.",
    'act1.thought.bin': 'One scoop. Like the note says.',
    'act1.thought.needKibble': 'I need his food first. The bin in the corner.',
    'act1.thought.bowl': 'There you go, buddy.',
    'act1.thought.latch': 'Locked. Dave said it sticks, so I pulled on it twice.',
    'act1.thought.tvon': 'Static, then the late news. Good enough.',
    'act1.thought.couch': 'Nobody to text back. Might as well watch something.',
    'act1.thought.couchDone': "I couldn't tell you what we watched.",
    'act1.thought.allDone': "That's everything on the list. Guest room, then sleep.",
    'act1.thought.scratch1': '...Rats. The note said rats.',
    'act1.thought.scratch2': "That was louder. Rats don't thump.",
    'act1.thought.hatch': 'Still padlocked. Whatever is down there can stay down there.',
    'act1.thought.lampOn': "Dave's bedroom light is on. I haven't been in there.",
    'act1.thought.silhouette1': "Is that... no. It's a coat on a hook. Or a lamp. It's something.",
    'act1.thought.silhouette2': "It's at the other window now. Coats don't move.",
    'act1.thought.lampOff': "The light's off. I didn't see it go off.",
    'act1.thought.masterEmpty': "Nobody. The bed's made. The lamp is cold.",
    'act1.thought.late': "It's almost two. I need to sleep.",

    // ---- Act 2 ----------------------------------------------------------------------------------
    'act2.vo.open':
      'The second night I drove into town for groceries. I was gone forty minutes, tops. When I got back, the front door was locked. Not the knob. The deadbolt.',
    'act2.vo.end':
      "I found out later that the slider wasn't how he got in. It was how he was leaving. I'd just locked him in with me.",
    'act2.sms.mason1': 'did you lock the deadbolt?? i cant get in',
    'act2.sms.dave1': "No? Nobody else has a key. Spare's in the fake rock under the bush by the porch.",
    'act2.sms.ethan1': 'u getting on tonight or what',
    'act2.sms.mason2': 'later maybe. weird night',
    'act2.thought.door': "It won't budge. The deadbolt's thrown, and Dave never gave me a key for that. You can only lock it from inside.",
    'act2.thought.key': 'A fake rock. Dave, come on.',
    'act2.thought.unlock': 'The deadbolt slid back like it had never been locked at all.',
    'act2.thought.inside': 'Cooper? Hey, buddy. Where are you?',
    'act2.thought.laundryLight': "The laundry room light is on. I didn't go in there today.",
    'act2.thought.hatch': 'The padlock is gone. Not broken. Gone. And the hatch is open.',
    'act2.thought.hatchClosed': "I shut it. There's nothing left to lock it with.",
    'act2.thought.slider': 'The slider is open. Three inches, maybe. I locked it last night. I pulled on it twice.',
    'act2.thought.sliderClosed': 'Closed.',
    'act2.thought.latchBroken': "The latch won't catch. It just spins. I need something to jam the track.",
    'act2.thought.broomTake': "This'll work. I didn't look at the hatch while I grabbed it.",
    'act2.thought.broom': "Broom in the track. Nobody's opening that from outside now.",
    'act2.thought.cooperStares': "Cooper won't stop staring down the hall.",

    // ---- Act 3 ----------------------------------------------------------------------------------
    'act3.vo.open': "I couldn't sleep, so I called Ethan. I remember it was 12:30, because my phone was about to die.",
    'act3.call.e1': 'dude you sound dead',
    'act3.call.m1': 'long night. this house is weird at night',
    'act3.call.e2': 'weird how',
    'act3.call.m2': "the slider was open when i got back. and dave's light was on yesterday. i never went in there",
    'act3.call.e3': 'bro. did you tell him',
    'act3.call.m3': 'he said nobody else has a key',
    'act3.call.e4': "ok that's actually creepy. hold on, my mom's yelling",
    'act3.call.e5': '...hello? dude? did you drop me?',
    'act3.call.e6': 'Mason? you there? what was that?',
    'act3.call.e7': '...ok? weird. text me tomorrow.',
    'act3.thought.cooper': "Cooper's been staring at the closet for ten minutes.",
    'act3.thought.charger': "Three percent. The charger's on the nightstand.",
    'act3.thought.drop': 'No, no. It slid off the bed.',
    'act3.whisper': "Shhhh... It's okay, Mason. Go back to sleep.",
    'act3.choice.prompt': 'Ethan is still on the line.',
    'act3.choice.a': "Ethan, there's someone in the closet. Call the cops.",
    'act3.choice.b': "Who's there? Get out of here!",
    'act3.choice.c': 'Dropped my phone, Ethan. Gonna hop in the shower.',
    'act3.thought.walk': "Pick up the phone. Stand up. Don't look at the closet. Walk.",
    'act3.thought.hall': 'Keep walking. Bathroom. Lock the door.',
    'act3.fail.scream': 'Screaming told him you had seen him.',
    'act3.fail.confront': 'You confronted someone who had already decided.',
    'act3.fail.freeze': "You froze. He didn't.",
    'act3.fail.look': 'You looked back. He knew you knew.',
  };
})();
