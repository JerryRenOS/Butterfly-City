import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ids, initialWorld, applyRound } from '../src/engine.js';
import { voiceProfiles, characterDialogue, dialogueFor, roundDialogue, conversationDialogue, type DialogueKey } from '../src/characterDialogue.js';

test('all four citizens have complete British or Indian neural dialogue matching the captions', () => {
  const expected = { bob: 'en-GB', alice: 'en-GB', kevin: 'en-IN', mia: 'en-IN' };
  const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.clips.length, ids.reduce((count, id) => count + Object.keys(characterDialogue[id]).length, 0));
  for (const id of ids) {
    assert.equal(voiceProfiles[id].locale, expected[id]);
    for (const key of Object.keys(characterDialogue[id]) as DialogueKey[]) {
      const clips = manifest.clips.filter((c: { id: string; key: string }) => c.id === id && c.key === key);
      assert.equal(clips.length, 1);
      const clip = clips[0];
      assert.equal(clip.text, characterDialogue[id][key]);
      assert.equal(clip.locale, voiceProfiles[id].locale);
      assert.equal(clip.voice, voiceProfiles[id].voice);
      assert.equal(clip.src, `/audio/neural-v1/${id}/${key}.mp3`);
      const bytes = readFileSync(new URL(`../public${clip.src}`, import.meta.url));
      assert.equal(bytes.length, clip.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), clip.sha256);
      assert.ok(clip.voice.endsWith('Neural'));
      assert.ok(bytes.toString('ascii', 0, 3) === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0, 'Expected an MP3 stream');
      assert.ok(clip.durationSeconds > .3 && clip.durationSeconds < 15);
    }
  }
});

test('introductions and failed actions select their own speech rather than inventing successful dialogue', () => {
  const before = initialWorld();
  for (const id of ids) assert.equal(dialogueFor(before, id).key, 'intro');
  const next = applyRound(before, { bob: 'share', alice: 'share', kevin: 'trade', mia: 'influence' });
  assert.equal(dialogueFor(next, 'bob').key, 'share');
  for (const id of ['alice', 'kevin', 'mia'] as const) {
    assert.equal(dialogueFor(next, id).key, 'unfulfilled');
    assert.equal(dialogueFor(next, id).text, characterDialogue[id].unfulfilled);
  }
});

test('each timeline receives its own ordered captions without mutating simulation state', () => {
  const before = initialWorld();
  const choices = { bob: 'hoard', alice: 'ask', kevin: 'suspicion', mia: 'trade' } as const;
  const original = applyRound(before, choices);
  const alternate = applyRound(before, { ...choices, bob: 'cooperate' });
  const snapshot = JSON.stringify([original, alternate]);
  assert.deepEqual(roundDialogue(original).map(line => line.id), [...ids]);
  assert.equal(roundDialogue(original)[0].key, 'hoard');
  assert.equal(roundDialogue(alternate)[0].key, 'cooperate');
  assert.equal(dialogueFor(original, 'alice').key, 'unfulfilled');
  assert.equal(dialogueFor(alternate, 'alice').key, 'ask');
  assert.equal(JSON.stringify([original, alternate]), snapshot);
});

test('conversation partners are actual recipients and replies face back toward the speaker', () => {
  const before = initialWorld();
  before.people.alice.food = 2;
  before.people.kevin.food = 4;
  const next = applyRound(before, { bob: 'support', alice: 'hoard', kevin: 'hoard', mia: 'ask' });
  const lines = conversationDialogue(next);
  assert.equal(lines.length, ids.length * 2);
  assert.equal(lines[0].id, 'bob');
  assert.equal(lines[0].target, 'mia'); // Poorest recipient, not Bob's next neighbor Alice.
  assert.equal(lines[0].gesture, 'give');
  assert.equal(lines[1].id, 'mia');
  assert.equal(lines[1].target, 'bob');
  assert.equal(lines[1].key, 'thanks');
  for (let index = 0; index < lines.length; index += 2) {
    assert.equal(lines[index].id, ids[index / 2]);
    assert.equal(lines[index + 1].id, lines[index].target);
    assert.equal(lines[index + 1].target, lines[index].id);
    assert.notEqual(lines[index].id, lines[index].target);
  }
});

test('gratitude requires an actual transfer and failed actions never imply successful help', () => {
  const next = applyRound(initialWorld(), { bob: 'trade', alice: 'share', kevin: 'trade', mia: 'influence' });
  const lines = conversationDialogue(next);
  assert.equal(lines[0].key, 'trade');
  assert.equal(lines[0].target, 'alice');
  assert.equal(lines[1].key, 'thanks');
  for (let index = 2; index < lines.length; index += 2) {
    assert.equal(lines[index].key, 'unfulfilled');
    assert.equal(lines[index].gesture, 'concern');
    assert.equal(lines[index + 1].key, 'reassure');
  }
  for (const reply of lines.filter(line => line.key === 'thanks')) {
    assert.ok(next.history.at(-1)?.effects.some(effect => effect.kind === 'food-transfer' && effect.actor === reply.target && effect.target === reply.id));
  }
});

test('greetings and civic responses use fixed scripts and never modify either world', () => {
  const before = initialWorld();
  const next = applyRound(before, { bob: 'cooperate', alice: 'ask', kevin: 'suspicion', mia: 'hoard' });
  const snapshot = JSON.stringify([before, next]);
  const introductions = conversationDialogue(before);
  assert.deepEqual(introductions.map(line => line.key), ['intro', 'greeting', 'intro', 'greeting', 'intro', 'greeting', 'intro', 'greeting']);
  const lines = conversationDialogue(next);
  assert.equal(lines[1].key, 'agree');
  assert.equal(lines[3].key, 'reassure'); // Public aid does not invent a private benefactor.
  assert.equal(lines[5].key, 'reassure');
  assert.equal(lines[7].key, 'concern');
  for (const line of [...introductions, ...lines]) {
    assert.equal(line.text, characterDialogue[line.id][line.key]);
    assert.equal(line.src, `/audio/neural-v1/${line.id}/${line.key}.mp3`);
  }
  assert.equal(JSON.stringify([before, next]), snapshot);
});
