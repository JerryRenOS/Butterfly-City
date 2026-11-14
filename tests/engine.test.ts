import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWorld, applyRound, demoDecisions, ids, actions, divergence, metrics, migrateWorld, isWorld, civicChain, type Decisions, type Action } from '../src/engine.js';
import { disasterConditions } from '../src/disasters.js';
import { makeDrexRequest, parseDrexResponse } from '../server/index.js';
const all = (action: Action): Decisions => Object.fromEntries(ids.map(id => [id, action])) as Decisions;
const stocked = () => { const world = initialWorld(); ids.forEach(id => { world.people[id].food = 3; }); return world; };
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} differs from ${b}`);

test('initial world separates public and private resources and has eight rescued food supplies', () => {
  const w = initialWorld();
  assert.equal(w.schemaVersion, 3); assert.equal(metrics(w).food, 8); assert.equal(w.people.bob.food, 8);
  assert.equal(w.town.food, 0); assert.equal(w.town.wealth, 4); assert.equal(metrics(w).wealth, 16);
  ids.forEach(id => { assert.equal(w.people[id].wealth, 3); assert.ok(w.people[id].traits.length); });
  assert.ok(isWorld(w));
});
test('rounds are deterministic and leave pivotal snapshots untouched', () => {
  const before = initialWorld(), snapshot = JSON.stringify(before), decisions = demoDecisions(before);
  assert.deepEqual(applyRound(before, decisions), applyRound(before, decisions));
  assert.equal(JSON.stringify(before), snapshot); assert.equal(applyRound(before, decisions).day, 1);
});
test('branch overrides Bob only and produces state-grounded differences', () => {
  const before = initialWorld(), original = demoDecisions(before), changed: Decisions = { ...original, bob: 'share' };
  const a = applyRound(before, original), b = applyRound(before, changed);
  for (const id of ['alice', 'kevin', 'mia'] as const) assert.equal(a.lastDecisions![id], b.lastDecisions![id]);
  assert.ok(b.trust.alice.bob > a.trust.alice.bob); assert.ok(b.people.alice.mood > a.people.alice.mood);
  assert.ok(divergence(a, b).different > 0); assert.equal(divergence(a, b).total, 28);
  assert.notDeepEqual(demoDecisions(a), demoDecisions(b)); assert.notEqual(a.town.outcome, b.town.outcome);
  assert.ok(civicChain(b)[0].includes('shared 3 food')); assert.ok(civicChain(b).some(line => line.includes('not proof of causation')));
});
test('food accounts for weather-limited gathering and dinner; wealth accounts for funded repairs', () => {
  let world = initialWorld();
  for (let round = 0; round < 80; round++) {
    const next = applyRound(world, Object.fromEntries(ids.map((id, i) => [id, actions[(round + i) % actions.length]])) as Decisions);
    const beforeDinner = metrics(world).food + disasterConditions(world.disaster, world.day).forage * 4;
    const eaten = next.history.at(-1)!.effects.filter(effect => effect.kind === 'dinner').reduce((sum, effect) => sum + Number(effect.description.match(/ate ([\d.]+)/)![1]), 0);
    // Descriptions round for display; verify strict conservation bounds independently of that presentation.
    assert.ok(metrics(next).food <= beforeDinner + 1e-7); assert.ok(metrics(next).food >= beforeDinner - 4 - 1e-7); assert.ok(eaten <= 4);
    near(metrics(next).wealth + next.history.reduce((sum, event) => sum + event.disaster.repairCost, 0), 16);
    ids.forEach(id => { assert.ok(next.people[id].food >= 0); assert.ok(next.people[id].wealth >= 0); assert.ok(next.people[id].mood >= 0 && next.people[id].mood <= 100); ids.forEach(other => assert.ok(next.trust[id][other] >= 0 && next.trust[id][other] <= 100)); });
    assert.ok(isWorld(next)); world = next;
  }
});
test('private gifts cannot be spent again in the same round', () => {
  const next = applyRound(initialWorld(), { bob: 'share', alice: 'share', kevin: 'trade', mia: 'influence' });
  assert.equal(next.people.bob.food, 4); ids.filter(id => id !== 'bob').forEach(id => assert.equal(next.people[id].food, 0));
  assert.ok(next.history[0].notes.some(note => note.includes('Alice wanted to share, but had no food')));
});
test('trade exchanges actual food for starting wealth, never same-round sale proceeds', () => {
  const world = stocked(); ids.forEach(id => { world.people[id].wealth = id === 'alice' ? 1 : 0; });
  const next = applyRound(world, { bob: 'trade', alice: 'hoard', kevin: 'hoard', mia: 'trade' });
  assert.equal(next.people.bob.wealth, 1); assert.equal(next.people.alice.wealth, 0); assert.equal(next.people.mia.wealth, 0);
  assert.equal(next.people.bob.food, 1); assert.equal(next.people.alice.food, 3); assert.equal(next.people.mia.food, 2);
  assert.equal(next.history[0].effects.filter(e => e.kind === 'trade').length, 1);
});
test('cooperation tax is reserved before buyers can spend wealth', () => {
  const world = stocked(); world.people.alice.wealth = 1;
  const next = applyRound(world, { bob: 'trade', alice: 'cooperate', kevin: 'hoard', mia: 'hoard' });
  assert.equal(next.people.alice.wealth, 0); assert.equal(next.town.wealth, 4); assert.equal(next.town.food, 2);
  assert.equal(next.people.bob.wealth, 3); assert.equal(next.history[0].effects.filter(e => e.kind === 'trade').length, 0);
});
test('public pantry aid divides scarce food equally without citizen-order bias', () => {
  const world = initialWorld(); ids.forEach(id => { world.people[id].food = 0; }); world.town.food = 6;
  const next = applyRound(world, all('ask'));
  ids.forEach(id => near(next.people[id].food, .5)); near(next.town.food, 0);
  assert.equal(next.history[0].effects.filter(e => e.kind === 'ask').length, 4); assert.equal(next.history[0].civic.hungry, 0);
});
test('support splits ties among equally hungry neighbors; failed acts do not count as cooperation', () => {
  const next = applyRound(initialWorld(), { bob: 'support', alice: 'share', kevin: 'support', mia: 'cooperate' });
  const gifts = next.history[0].effects.filter(e => e.kind === 'food-transfer' && e.actor === 'bob');
  assert.deepEqual(gifts.map(e => e.target), ['alice', 'kevin', 'mia']); assert.equal(new Set(gifts.map(e => e.description.split(' ').at(-2))).size, 1);
  assert.equal(next.history[0].civic.cooperativeActions, 2); // Bob's food + Mia's treasury contribution.
});
test('all seven civic outcomes follow observed actions and resources', () => {
  assert.equal(applyRound(initialWorld(), all('hoard')).town.outcome, 'Food Panic');
  assert.equal(applyRound(stocked(), all('suspicion')).town.outcome, 'Suspicion Wave');
  assert.equal(applyRound(stocked(), { bob: 'share', alice: 'hoard', kevin: 'hoard', mia: 'influence' }).town.outcome, 'Divided Town');
  assert.equal(applyRound(stocked(), all('trade')).town.outcome, 'Trade Boom');
  assert.equal(applyRound(stocked(), all('support')).town.outcome, 'Community Aid Chain');
  assert.equal(applyRound(stocked(), all('cooperate')).town.outcome, 'Cooperative Village');
  assert.equal(applyRound(stocked(), all('influence')).town.outcome, 'Uneasy Peace');
});
test('effect descriptions report actual clamped changes', () => {
  const world = initialWorld(); world.trust.alice.bob = 97; world.people.alice.mood = 99;
  const next = applyRound(world, { bob: 'share', alice: 'ask', kevin: 'ask', mia: 'ask' });
  assert.ok(next.history[0].effects.some(e => e.actor === 'bob' && e.description === "Alice's trust in Bob +3."));
  assert.ok(next.history[0].effects.some(e => e.actor === 'bob' && e.description === "Alice's mood +1."));
});
test('migration replays legacy decisions and validates v3 without fabricated receipts', () => {
  const first = demoDecisions(initialWorld()), expected = applyRound(initialWorld(), first);
  const legacy = { day: 1, people: { bob: { food: 999 } }, history: [{ day: 1, decisions: first }], lastDecisions: first };
  assert.deepEqual(migrateWorld(legacy), expected); assert.deepEqual(migrateWorld(expected), expected);
  assert.equal('receipts' in migrateWorld(legacy)!, false);
  assert.equal(migrateWorld({ ...expected, town: { ...expected.town, food: -1 } }), null);
  assert.equal(migrateWorld({ ...expected, history: [] }), null);
  assert.equal(migrateWorld({ ...expected, people: { ...expected.people, bob: { ...expected.people.bob, mood: NaN } } }), null);
  assert.equal(migrateWorld({ ...expected, schemaVersion: 4 }), null);
});
test('request batches four typed eight-action choices and rejects missing or invented answers', () => {
  const request = makeDrexRequest(initialWorld()); assert.deepEqual(Object.keys(request.questions), [...ids]);
  const probabilities = Object.fromEntries(actions.map(action => [action, 1 / actions.length]));
  const answers = Object.fromEntries(ids.map(id => [id, { type: 'choice', choice: 'cooperate', probabilities }]));
  const parsed = parseDrexResponse({ answers, model: 'drex-v2.0' });
  assert.equal(parsed.decisions.bob, 'cooperate'); assert.deepEqual(parsed.probabilities.bob, probabilities);
  assert.throws(() => parseDrexResponse({ answers: { bob: { type: 'choice', choice: 'share' } } }));
  assert.throws(() => parseDrexResponse({ answers: { ...answers, bob: { type: 'choice', choice: 'steal' } } }));
});

test('later-day treasury grants fairly help hungry low-wealth residents without creating money', () => {
  const world = applyRound(initialWorld(), all('hoard'));
  ids.forEach(id => { world.people[id].food = 0; world.people[id].wealth = 0; }); world.town.wealth = 1.5;
  const next = applyRound(world, all('cooperate'));
  ids.forEach(id => near(next.people[id].wealth, .375)); near(next.town.wealth, 0); near(metrics(next).wealth, 1.5);
  assert.equal(next.history.at(-1)!.effects.filter(e => e.kind === 'treasury-aid').length, 4);
});

test('civic division reflects persistent low stability even when dinner succeeds',()=>{
 const w=stocked();w.town.stability=10;
 const next=applyRound(w,all('influence'));
 assert.equal(next.history[0].civic.hungry,0);
 assert.equal(next.town.outcome,'Divided Town');
});
test('public aid remains useful after a later-day harvest without creating food',()=>{
 const w=applyRound(initialWorld(),all('hoard'));
 ids.forEach(id=>{w.people[id].food=0});w.town.food=4;
 const next=applyRound(w,all('ask'));
 ids.forEach(id=>near(next.people[id].food,1));near(next.town.food,0);
 assert.equal(next.history.at(-1)!.effects.filter(e=>e.kind==='ask').length,4);
 near(metrics(next).food,metrics(w).food+4-4);
});
