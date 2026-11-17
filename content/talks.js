// Conversations, as trees for js/engine/dialogue.js. Hand-written. Each node says its lines in order,
// then offers choices (keys 1, 2, 3), moves on to `next`, or ends. A choice's `log` goes into the habit
// log, which the later nights read. Phone calls run on the phone's call screen; people standing in
// front of Mason (Ray, the cashier) talk in subtitles.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.talkData = {
    // ---- the morning calls ----------------------------------------------------------------------
    mom: {
      start: 'hi',
      nodes: {
        hi: {
          say: [['Mom', 'There he is! My son, the professional dog sitter.'], ['Mason', 'House sitter.'], ['Mom', 'Did you eat a vegetable. Be honest.']],
          choices: [
            { id: 'veg', text: 'Define vegetable.', next: 'veg' },
            { id: 'noises', text: 'Is it weird if a house makes noises?', next: 'noises' },
          ],
        },
        veg: { say: [['Mom', 'Ketchup is not a vegetable, Mason.'], ['Mason', "It's a tomato."], ['Mom', "It's a tomato's ghost."]], next: 'cooper' },
        noises: {
          say: [
            ['Mom', "Dave's house? Honey, that house has made noises since the nineties."],
            ['Mom', 'Grandpa swore there was a raccoon in the attic for a whole winter. He named it. Gerald.'],
          ],
          next: 'cooper',
        },
        cooper: {
          say: [['Mom', 'Is Cooper being good?'], ['Mason', 'He sleeps on my feet.'], ['Mom', 'That means he loves you. Or your feet are warm. Both.']],
          choices: [
            { id: 'bye', text: 'Love you. Gotta go.', next: 'bye' },
            { id: 'stay', text: 'Can you talk a little longer?', next: 'longer', log: 'stayedOnWithMom' },
          ],
        },
        longer: {
          say: [
            ['Mom', '...Of course. You okay?'],
            ['Mason', "Yeah. It's just really quiet out here."],
            ['Mom', 'Leave a light on. Put the TV on. And call me tonight, any time. I sleep with my phone like a teenager.'],
          ],
          next: 'bye',
        },
        bye: { say: [['Mom', 'Love you. Wear socks. Two more nights!']], end: true },
      },
    },

    dave: {
      start: 'hi',
      nodes: {
        hi: {
          say: [['Dave', 'Mason! My man! How is my house? Still standing?'], ['Mason', 'Still standing. Hey, quick thing.']],
          choices: [
            { id: 'lamp', text: 'Is your bedroom lamp on a timer?', next: 'lamp' },
            { id: 'hatch', text: 'Cooper keeps sitting by the hatch.', next: 'hatch' },
          ],
        },
        lamp: {
          say: [
            ['Dave', "A timer? I don't have a lamp timer."],
            ['Dave', '...Huh. Old wiring, probably. That whole side of the house is from 1971.'],
          ],
          next: 'pipes',
        },
        hatch: {
          say: [
            ['Dave', "Ha! He does that. There's mice under there. I think he thinks they're his friends."],
            ['Dave', "Don't open it, though. It's gross down there. That's what the padlock's for."],
          ],
          next: 'pipes',
        },
        pipes: {
          say: [
            ['Mason', "And your note says if I hear scratching, it's the pipes."],
            ['Dave', 'My note says what?'],
            ['Mason', 'The little one. On the fridge.'],
            ['Dave', "I didn't write that. What pipes? I wrote about the rats. The rats are the whole note."],
          ],
          choices: [
            { id: 'hand', text: "It's in your handwriting.", next: 'hand' },
            { id: 'drop', text: 'Never mind. Probably the rats.', next: 'drop' },
          ],
        },
        hand: {
          say: [
            ['Dave', 'Then I guess I wrote it? I write a lot of notes. Your aunt says I am a sticky note with a man attached.'],
            ['Dave', "Look. If anything weirds you out, I've got a buddy on the force out there."],
          ],
          next: 'number',
        },
        drop: {
          say: [['Dave', 'Probably the rats! Good man.'], ['Dave', "But hey. If anything weirds you out, I've got a buddy on the force out there."]],
          next: 'number',
        },
        number: {
          say: [['Dave', "Ray Pruitt. Deputy. Great guy. Terrible at fantasy football. I'll text you his number."]],
          choices: [
            { id: 'thanks', text: 'Thanks, Dave.', next: 'bye', log: 'gotRaysNumber' },
            { id: 'fine', text: "I'm sure it's fine.", next: 'byeFine', log: 'gotRaysNumber' },
          ],
        },
        bye: { say: [['Dave', "Scratch Cooper for me. Not the ears. He's weird about the ears."]], end: true },
        byeFine: {
          say: [['Dave', "It's always fine! That's what I love about that house."], ['Dave', "I'll text you his number anyway. Scratch Cooper for me."]],
          end: true,
        },
      },
    },

    ethan: {
      start: 'hi',
      nodes: {
        hi: {
          say: [
            ['Ethan', "bro. it's morning. why are you calling me with your voice"],
            ['Mason', "Something's weird about this house."],
            ['Ethan', 'weird like haunted or weird like dave has a lot of fish'],
          ],
          choices: [
            { id: 'moved', text: 'Weird like stuff moves on its own.', next: 'serious' },
            { id: 'fish', text: 'He does have a lot of fish.', next: 'fish' },
          ],
        },
        fish: {
          say: [['Ethan', 'i knew it. fish guy energy'], ['Mason', 'No, seriously. Stuff moves. A light turned on by itself.']],
          next: 'serious',
        },
        serious: {
          say: [
            ['Ethan', 'ok. serious mode. have you heard of phrogging'],
            ['Mason', 'Frogging?'],
            ['Ethan', "with a PH. people living in someone else's house. secretly. i sent you a link"],
            ['Ethan', "don't read it at night. actually read it now. it's daytime. daytime is legally safe"],
          ],
          next: 'bye',
        },
        bye: { say: [['Ethan', "gotta go, my mom's making me clean the gutters. if i die i'm haunting you specifically"]], end: true },
      },
    },

    ray: {
      start: 'hi',
      nodes: {
        hi: {
          say: [
            ['Ray', 'Pruitt.'],
            ['Mason', "Hi. Um. I'm house sitting for Dave? Out past the Gas-N-Go?"],
            ['Ray', "Dave's nephew! The famous Mason. He said you might call. What's going on, bud?"],
          ],
          choices: [
            { id: 'come', text: "I think someone's been in the house. Can you come look?", next: 'come', log: 'calledDeputy' },
            { id: 'never', text: 'Actually, never mind. Sorry.', next: 'never' },
          ],
        },
        come: {
          say: [
            ['Ray', 'Somebody in the house. Okay. Anything missing? Doors forced?'],
            ['Mason', "Not really. Food. And a note I don't think Dave wrote."],
            ['Ray', "Hm. Well, I'm out your way anyhow. Give me twenty minutes. Put the dog up if he jumps."],
            ['Mason', "He doesn't jump."],
            ['Ray', "They all jump for me. It's the sunflower seeds."],
          ],
          end: true,
        },
        never: { say: [['Ray', 'No bother. Old house, lots of noises. You call me if you need me. Day or night.']], end: true },
      },
    },

    // calling Ray a second time: he's out
    rayAgain: {
      start: 'hi',
      nodes: {
        hi: {
          say: [['Dispatch', "Sheriff's office. Deputy Pruitt's out on a call, hon."], ['Dispatch', 'Someone can come out Thursday. Is it an emergency?']],
          choices: [
            { id: 'no', text: "No. It's not an emergency.", next: 'thursday' },
            { id: 'idk', text: "I don't know.", next: 'idk' },
          ],
        },
        thursday: { say: [['Dispatch', 'Thursday, then. You have a good day.']], end: true },
        idk: { say: [['Dispatch', "If you're ever in danger, you hang up and dial 911. Otherwise, Thursday."]], end: true },
      },
    },

    // ---- Ray's visit: one node per stop on the tour (js/day2/deputy.js moves everyone between them) --
    rayVisit: {
      start: 'door',
      nodes: {
        door: {
          say: [
            ['Ray', 'Afternoon! Ray Pruitt. You must be Mason.'],
            ['Ray', "And who's this? Hey, Sergeant. Hey, buddy. Yes you are."],
            ['Mason', "His name's Cooper."],
            ['Ray', "Not to me it isn't. Okay. Show me around."],
          ],
          next: 'closet',
        },
        closet: {
          say: [
            ['Ray', "Guest room. This where you're sleeping?"],
            ['Ray', 'Closet is empty. Some hangers. Dust bunnies the size of real bunnies.'],
            ['Mason', 'I heard knocking. From in here, I think.'],
            ['Ray', 'Old houses settle, bud. Wood shrinks at night and it pops. Like knuckles.'],
          ],
          next: 'hatch',
        },
        hatch: {
          say: [
            ['Ray', 'That the crawlspace?'],
            ['Mason', "Cooper won't leave it alone. And I hear scratching."],
            ['Ray', 'Padlocked. Rusty, too. See that?'],
            ['Ray', "Rats can't pick locks."],
          ],
          choices: [
            { id: 'open', text: 'Can we open it and look?', next: 'noOpen' },
            { id: 'ok', text: 'Okay.', next: 'vent' },
          ],
        },
        noOpen: {
          say: [['Ray', "Dave's got the key, and I'm not crawling under there in this shirt. My wife irons this shirt."]],
          next: 'vent',
        },
        vent: {
          say: [
            ['Ray', "Now this. Screen's half off."],
            ['Mason', 'Is that bad?'],
            ['Ray', "That's raccoons. They'll pull a screen right off for a warm spot. Tell Dave to get a better screen."],
            ['Ray', 'Seed? No? More for me.'],
          ],
          next: 'bye',
        },
        bye: {
          say: [
            ['Ray', "Look. Nothing's forced, nothing's gone but some food, and the dog's happy. That's a good house."],
            ['Ray', 'Lock up tonight. Call me if anything changes. See you, Sergeant.'],
          ],
          end: true,
        },
      },
    },

    // ---- night two: the house phone rings, and it is only Dave ------------------------------------
    daveLandline: {
      start: 'hi',
      nodes: {
        hi: {
          say: [
            ['Dave', "Mason! There he is. You weren't picking up your cell."],
            ['Mason', 'I was... busy. Is everything okay?'],
            ['Dave', "Storm's all over the news here. Wanted to make sure the house hasn't floated away."],
          ],
          choices: [
            { id: 'someone', text: "Dave, somebody's been in the house.", next: 'someone', log: 'toldDave' },
            { id: 'power', text: "The power's been weird.", next: 'power' },
          ],
        },
        someone: {
          say: [
            ['Dave', 'In the house? You mean Ray? Ray said you seemed a little jumpy. No offense.'],
            ['Mason', "Not Ray. Things are moved. The bed's made. I don't make beds."],
            ['Dave', 'Huh. ...You sure that was not your buddy?'],
          ],
          next: 'buddy',
        },
        power: {
          say: [
            ['Dave', "Yeah, that breaker's touchy. It's in the laundry room. If it trips, you just flip it back."],
            ['Dave', 'Hey, tell your buddy thanks, by the way.'],
          ],
          next: 'buddy',
        },
        buddy: {
          say: [
            ['Mason', 'What buddy?'],
            ['Dave', 'The fella who answered the house phone this afternoon. While you were at the store.'],
            ['Dave', "Quiet guy. Real polite. Said you'd stepped out. I figured it was Ethan."],
          ],
          choices: [
            { id: 'far', text: "Ethan's at his mom's. Two hundred miles from here.", next: 'far' },
            { id: 'sound', text: 'What did he sound like?', next: 'sound', log: 'askedAboutVoice' },
          ],
        },
        far: {
          say: [['Dave', 'Huh! Well, somebody picked up.'], ['Dave', "Probably a crossed line. Storm does that. That phone's older than you are."]],
          next: 'bye',
        },
        sound: {
          say: [
            ['Dave', 'Soft. Like a guy in a library. Called me sir.'],
            ['Dave', 'Asked when I was coming home. I said Thursday. He said, "Good."'],
          ],
          next: 'bye',
        },
        bye: {
          say: [
            ['Dave', "Anyway! Lock up, get some sleep. You're doing great, bud."],
            ['Dave', 'Oh, and Mason? Leave a light on. That house gets dark.'],
          ],
          end: true,
        },
      },
    },

    // ---- the Gas-N-Go ---------------------------------------------------------------------------
    cashier: {
      start: 'hi',
      nodes: {
        hi: {
          say: [['Cashier', 'Evening. Find everything okay?']],
          choices: [
            { id: 'dave', text: "I'm watching the Dave place. Up the road.", next: 'dave', log: 'toldCashier' },
            { id: 'fine', text: 'Yeah. Thanks.', next: 'total' },
          ],
        },
        dave: {
          say: [
            ['Cashier', 'Oh, the Dave place! The old Hale house.'],
            ['Mason', 'The what?'],
            ['Cashier', "That's what my mom still calls it. The family before Dave. They moved off when I was little."],
          ],
          next: 'gossip',
        },
        gossip: {
          say: [
            ['Cashier', 'People used to talk about that whole stretch of Route 9. Said somebody was living in the old houses. Hiding in them.'],
            ['Cashier', "Kid stuff. Every town's got one of those."],
          ],
          choices: [
            { id: 'who', text: 'Who was hiding?', next: 'who', log: 'askedGossip' },
            { id: 'huh', text: 'Huh.', next: 'total' },
          ],
        },
        who: { say: [['Cashier', 'Nobody, probably! Raccoons and teenagers.'], ['Cashier', 'Anyway. You want a bag?']], next: 'total' },
        total: {
          say: [['Cashier', "That's twenty-three fifty."], ['Cashier', 'Drive safe. Deer are bad this time of year. They just stand there.']],
          end: true,
        },
      },
    },
  };
})();
