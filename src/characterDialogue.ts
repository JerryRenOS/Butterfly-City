import { ids, type Id, type Action, type World } from './engine';
import { voiceCast, voiceAssetVersion } from './voiceCast';

export const voiceProfiles = voiceCast;

export type ReplyKey = 'greeting' | 'thanks' | 'reassure' | 'concern' | 'agree';
export type DialogueKey = Action | 'intro' | 'unfulfilled' | ReplyKey;
export type DialogueGesture = 'talk' | 'give' | 'concern' | 'listen' | 'work';
export type DialogueLine = { id: Id; key: DialogueKey; text: string; src: string; target?: Id; gesture: DialogueGesture };

/** Captions and prerecorded speech share exactly the same script. */
export const characterDialogue: Record<Id, Record<DialogueKey, string>> = {
  bob: {
    intro: "I'm Bob. I managed to save some supplies. Now, what are we going to do?",
    share: "All right, take a little. There's some for everyone.",
    hoard: "I'm keeping what I've got. Just for now.",
    trade: "There we are. A fair deal, wouldn't you say?",
    influence: "Here you go. Just remember who looked out for you.",
    cooperate: "Oh, all right. I'll put something towards the village.",
    support: "Here, take this. Don't say I never help.",
    ask: "Could I have a bit from the pantry today?",
    suspicion: "I don't know. Something about this feels off.",
    unfulfilled: "Well, that didn't work out. I'll have to think again.",
    greeting: "We're still here, aren't we? We'll find a way through.",
    thanks: "Thanks for that. I needed a bit of good news.",
    reassure: "Hang on. Let's think this through together.",
    concern: "I'm not sure about that. What happens to everyone else?",
    agree: "Yes, that's a start. Let's keep at it.",
  },
  alice: {
    intro: "I'm Alice. How are you holding up? We don't have to face this alone.",
    share: "Here's a little for everyone. Let's make it stretch.",
    hoard: "I'm sorry. I need to look after myself today.",
    trade: "That feels fair. I'm glad we could work it out.",
    influence: "Here, this is for you. I hope you'll remember me.",
    cooperate: "I'll put in what I can. This place matters to me.",
    support: "Here, take some of mine. No one should go hungry.",
    ask: "I could use a little pantry food myself today.",
    suspicion: "I hate feeling like this. I don't know who to trust.",
    unfulfilled: "That didn't go as I'd hoped. Let's try something else.",
    greeting: "I'm holding up, thank you. It's good to see a familiar face.",
    thanks: "Thank you. That really does mean a lot.",
    reassure: "Take your time. I'm here, and I'm listening.",
    concern: "I'm worried about the others. How will they manage?",
    agree: "It all helps. Let's keep looking after each other.",
  },
  kevin: {
    intro: "I'm Kevin. Before we rush into anything, let's see what we've got.",
    share: "Go on, take some. I suppose we have to trust each other.",
    hoard: "I'd rather keep what I've got. We don't know what's coming.",
    trade: "Yes, those numbers work. That seems fair to me.",
    influence: "Here you are. We should look out for each other, shouldn't we?",
    cooperate: "I've put something in. Let's see what we can do with it.",
    support: "Here, this might help. It's something, at least.",
    ask: "Could I ask for some food from the pantry?",
    suspicion: "Something doesn't add up. Am I the only one who sees it?",
    unfulfilled: "No, that won't work. I need to rethink this.",
    greeting: "I'm managing, thanks. Let's work through this one step at a time.",
    thanks: "Thank you. That's one less thing to worry about.",
    reassure: "Let's slow down and check what we actually know.",
    concern: "That worries me. Have we thought this through?",
    agree: "Yes, that helps. Let's work out what comes next.",
  },
  mia: {
    intro: "I'm Mia. It's a mess, I know. Come on, let's figure out where to start.",
    share: "Take a little each. We need everyone on their feet.",
    hoard: "I'm holding on to what I've got. Tomorrow could be rough.",
    trade: "Done. That's a good deal for both of us.",
    influence: "Here, take this. We could make a good team.",
    cooperate: "I'm putting something in. Let's get this place going again.",
    support: "Here you go. We all need a hand sometimes.",
    ask: "I'm running short. Is there something in the pantry?",
    suspicion: "Wait a second. These numbers aren't adding up.",
    unfulfilled: "That didn't pan out. Let's find another way.",
    greeting: "We'll work it out. One problem at a time, yes?",
    thanks: "Thanks, I appreciate it. That makes a difference.",
    reassure: "Let's try a different angle. We still have options.",
    concern: "I'm not sold on that. What about the rest of town?",
    agree: "We're getting somewhere. Let's keep going.",
  },
};

export function dialogueFor(world: World, id: Id): DialogueLine {
  const action = world.lastDecisions?.[id];
  const failed = world.history.at(-1)?.effects.some(effect => effect.actor === id && effect.kind === 'unfulfilled');
  const key: DialogueKey = !action ? 'intro' : failed ? 'unfulfilled' : action;
  // A performed transfer determines the partner. Otherwise this is an ambient
  // conversation with a neighbor, not an invented successful action or new decision.
  const recipient = world.history.at(-1)?.effects.find(effect => effect.actor === id && effect.kind === 'food-transfer' && effect.target !== id)?.target;
  const target = recipient ?? ids[(ids.indexOf(id) + 1) % ids.length];
  const gesture: DialogueGesture = key === 'unfulfilled' || key === 'hoard' || key === 'suspicion' ? 'concern'
    : key === 'share' || key === 'support' || key === 'influence' ? 'give'
    : key === 'cooperate' ? 'work' : 'talk';
  return lineFor(id, key, target, gesture);
}

function lineFor(id: Id, key: DialogueKey, target: Id, gesture: DialogueGesture = 'talk'): DialogueLine {
  return { id, key, target, gesture, text: characterDialogue[id][key], src: `/audio/${voiceAssetVersion}/${id}/${key}.mp3` };
}

export function roundDialogue(world: World): DialogueLine[] {
  return ids.map(id => dialogueFor(world, id));
}

/** Fixed, voiced responses to recorded events; these are not Drex-generated dialogue. */
export function conversationDialogue(world: World): DialogueLine[] {
  return roundDialogue(world).flatMap(line => {
    const target = line.target!;
    const effects = world.history.at(-1)?.effects ?? [];
    const received = effects.some(effect => effect.actor === line.id && effect.kind === 'food-transfer' && effect.target === target);
    const contributed = effects.some(effect => effect.actor === line.id && effect.kind === 'cooperate');
    const reply: ReplyKey = line.key === 'intro' ? 'greeting'
      : line.key === 'unfulfilled' ? 'reassure'
      : received ? 'thanks'
      : contributed ? 'agree'
      : line.key === 'hoard' ? 'concern' : 'reassure';
    return [line, lineFor(target, reply, line.id, reply === 'concern' ? 'concern' : 'talk')];
  });
}
