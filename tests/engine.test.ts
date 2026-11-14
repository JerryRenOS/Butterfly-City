import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWorld, applyRound, demoDecisions, ids, divergence, type Decisions } from '../src/engine.js';
import { makeDrexRequest, parseDrexResponse } from '../server/index.js';

test('rounds are deterministic and leave snapshots untouched', () => {
  const before = initialWorld(), snapshot = JSON.stringify(before), decisions = demoDecisions(before);
  assert.deepEqual(applyRound(before, decisions), applyRound(before, decisions));
  assert.equal(JSON.stringify(before), snapshot);
  assert.equal(applyRound(before, decisions).day, 1);
});
test('branch overrides Bob only and produces state-grounded differences', () => {
  const before = initialWorld(), original = demoDecisions(before), changed: Decisions = { ...original, bob: 'share' };
  const a = applyRound(before, original), b = applyRound(before, changed);
  for (const id of ['alice', 'kevin', 'mia'] as const) assert.equal(a.lastDecisions![id], b.lastDecisions![id]);
  assert.ok(b.trust.alice.bob > a.trust.alice.bob);
  assert.ok(b.people.alice.mood > a.people.alice.mood);
  assert.ok(divergence(a, b).different > 0);
  assert.notDeepEqual(demoDecisions(a), demoDecisions(b));
});
test('food is conserved except consumption and identical daily forage; stats bounded', () => {
  let world = initialWorld();
  for (let round = 0; round < 100; round++) {
    const total = ids.reduce((sum, id) => sum + world.people[id].food, 0);
    const next = applyRound(world, demoDecisions(world));
    const nextTotal = ids.reduce((sum, id) => sum + next.people[id].food, 0);
    assert.ok(nextTotal <= total + (round > 0 ? 8 : 0) + 0.0001);
    ids.forEach(id => { assert.ok(next.people[id].food >= 0 && next.people[id].food <= 100); assert.ok(next.people[id].mood >= 0 && next.people[id].mood <= 100); ids.forEach(other => assert.ok(next.trust[id][other] >= 0 && next.trust[id][other] <= 100)); });
    world = next;
  }
});
test('request batches four typed choices and parser rejects missing or invented actions', () => {
  const request = makeDrexRequest(initialWorld());
  assert.deepEqual(Object.keys(request.questions), [...ids]);
  const answers = Object.fromEntries(ids.map(id => [id, { type: 'choice', choice: 'share', probabilities: { share: .6, hoard: .2, trade: .1, influence: .1 } }]));
  assert.equal(parseDrexResponse({ answers, model: 'drex-v2.0' }).decisions.bob, 'share');
  assert.throws(() => parseDrexResponse({ answers: { bob: { type: 'choice', choice: 'share' } } }));
  assert.throws(() => parseDrexResponse({ answers: { ...answers, bob: { type: 'choice', choice: 'steal' } } }));
});

test('different action budgets never spend food received during the same round', () => {
  const next = applyRound(initialWorld(), { bob: 'share', alice: 'share', kevin: 'trade', mia: 'influence' });
  assert.equal(next.people.bob.food, 4);
  assert.equal(next.people.alice.food, 0);
  assert.equal(next.people.kevin.food, 0);
  assert.equal(next.people.mia.food, 0);
  assert.ok(next.history[0].notes.some(note => note.includes('Alice wanted to share, but had no food')));
});
