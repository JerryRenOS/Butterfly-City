import { ids, type Id, type Action, type World } from './engine';

export const voiceProfiles: Record<Id, { accent: string; locale: string; voice: string }> = {
  bob: { accent: 'British', locale: 'en-GB', voice: 'Daniel' },
  alice: { accent: 'Irish', locale: 'en-IE', voice: 'Moira' },
  kevin: { accent: 'Indian', locale: 'en-IN', voice: 'Rishi' },
  mia: { accent: 'Australian', locale: 'en-AU', voice: 'Karen' },
};

export type DialogueKey = Action | 'intro' | 'unfulfilled';
export type DialogueLine = { id: Id; key: DialogueKey; text: string; src: string };

/** Captions and prerecorded speech share exactly the same script. */
export const characterDialogue: Record<Id, Record<DialogueKey, string>> = {
  bob: {
    intro: "I'm Bob. I rescued these supplies. Let's see how we get through this.",
    share: 'All right. Supplies for everyone.',
    hoard: 'I rescued it, didn’t I?',
    trade: 'A fair price, my friend.',
    influence: 'Remember who helped you.',
    cooperate: 'Let’s rebuild this place.',
    support: 'Here. You need this more.',
    ask: 'Perhaps I could use a hand.',
    suspicion: 'Something isn’t quite right.',
    unfulfilled: 'Perhaps another way…',
  },
  alice: {
    intro: "I'm Alice. We'll get through this together. No one should be left behind.",
    share: 'There is enough if we share.',
    hoard: 'I have to save a little, too.',
    trade: 'Something fair for both of us.',
    influence: 'I hope you’ll remember this.',
    cooperate: 'For everyone’s tomorrow.',
    support: 'No one should go hungry.',
    ask: 'Would you help me today?',
    suspicion: 'I wish I knew who to trust.',
    unfulfilled: 'Perhaps another way…',
  },
  kevin: {
    intro: "I'm Kevin. Let's check our supplies and make a sensible plan.",
    share: 'Trust is worth a little risk.',
    hoard: 'Best to be prepared.',
    trade: 'Let me check the numbers.',
    influence: 'We should look out for each other.',
    cooperate: 'Perhaps this could work.',
    support: 'Here. Just in case.',
    ask: 'I could use a little help.',
    suspicion: 'I have a worrying theory…',
    unfulfilled: 'Perhaps another way…',
  },
  mia: {
    intro: "I'm Mia. We can rebuild this place if everyone lends a hand.",
    share: 'An investment in our neighbors.',
    hoard: 'Saving something for tomorrow.',
    trade: 'A good day for a fair trade.',
    influence: 'Let’s make an alliance.',
    cooperate: 'A town is built together.',
    support: 'We all need a hand sometimes.',
    ask: 'A little help to get started.',
    suspicion: 'These accounts don’t add up.',
    unfulfilled: 'Perhaps another way…',
  },
};

export function dialogueFor(world: World, id: Id): DialogueLine {
  const action = world.lastDecisions?.[id];
  const failed = world.history.at(-1)?.effects.some(effect => effect.actor === id && effect.kind === 'unfulfilled');
  const key: DialogueKey = !action ? 'intro' : failed ? 'unfulfilled' : action;
  return { id, key, text: characterDialogue[id][key], src: `/audio/${id}/${key}.m4a` };
}

export function roundDialogue(world: World): DialogueLine[] {
  return ids.map(id => dialogueFor(world, id));
}
