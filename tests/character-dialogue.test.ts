import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ids, actions, initialWorld, applyRound } from '../src/engine.js';
import { voiceProfiles, characterDialogue, dialogueFor, roundDialogue, type DialogueKey } from '../src/characterDialogue.js';

test('all four requested accents have complete recorded dialogue matching the displayed scripts', () => {
  const expected = { bob: 'en-GB', alice: 'en-IE', kevin: 'en-IN', mia: 'en-AU' };
  const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.clips.length, 40);
  for (const id of ids) {
    assert.equal(voiceProfiles[id].locale, expected[id]);
    for (const key of [...actions, 'intro', 'unfulfilled'] as DialogueKey[]) {
      const clips = manifest.clips.filter((c: { id: string; key: string }) => c.id === id && c.key === key);
      assert.equal(clips.length, 1);
      const clip = clips[0];
      assert.equal(clip.text, characterDialogue[id][key]);
      assert.equal(clip.locale, voiceProfiles[id].locale);
      assert.equal(clip.voice, voiceProfiles[id].voice);
      assert.equal(clip.src, `/audio/${id}/${key}.m4a`);
      const bytes = readFileSync(new URL(`../public${clip.src}`, import.meta.url));
      assert.equal(bytes.length, clip.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), clip.sha256);
      assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
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
