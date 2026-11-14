import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWorld, applyRound, demoDecisions, ids, metrics, migrateWorld, type Action, type Decisions } from '../src/engine.js';
import { disasterTypes, disasterConditions } from '../src/disasters.js';
import { makeDrexRequest, validWorld } from '../server/index.js';
import { scenePlan, locationEffects } from '../src/sceneDynamics.js';
const all = (action: Action) => Object.fromEntries(ids.map(id => [id, action])) as Decisions;

test('three disasters have distinct weather, persistent damage, and bounded deterministic rounds', () => {
  const records = [];
  for (const type of disasterTypes) {
    let world = initialWorld(type);
    for (let day = 0; day < 20; day++) {
      const before = structuredClone(world), choices = demoDecisions(world);
      const next = applyRound(world, choices);
      assert.deepEqual(next, applyRound(world, choices));
      assert.deepEqual(world, before);
      assert.equal(next.disaster.type, type);
      assert.ok(next.disaster.damage >= 0 && next.disaster.damage <= 100);
      assert.ok(validWorld(next));
      assert.deepEqual(migrateWorld(next), next);
      const gathered = next.history.at(-1)!.disaster.forage * 4;
      assert.ok(metrics(next).food >= metrics(world).food + gathered - 4 - 1e-7);
      assert.ok(metrics(next).food <= metrics(world).food + gathered + 1e-7);
      assert.ok(Math.abs(metrics(next).wealth + next.history.reduce((n, e) => n + e.disaster.repairCost, 0) - 16) < 1e-7);
      world = next;
    }
    records.push(world.history.slice(0, 4).map(e => [e.disaster.intensity, e.disaster.forage]));
  }
  assert.notDeepEqual(records[0], records[1]);
  assert.notDeepEqual(records[1], records[2]);
});

test('changing only Bob keeps the weather identical but changes recovery and later gathering', () => {
  for (const type of disasterTypes) {
    const before = initialWorld(type), choices = demoDecisions(before);
    let original = applyRound(before, choices);
    let alternate = applyRound(before, { ...choices, bob: 'cooperate' });
    ids.filter(id => id !== 'bob').forEach(id => assert.equal(original.lastDecisions![id], alternate.lastDecisions![id]));
    assert.equal(original.history[0].disaster.intensity, alternate.history[0].disaster.intensity);
    assert.ok(alternate.disaster.damage < original.disaster.damage);
    for (let day = 1; day < 8; day++) {
      assert.equal(disasterConditions(original.disaster, day).intensity, disasterConditions(alternate.disaster, day).intensity);
      original = applyRound(original, all('hoard'));
      alternate = applyRound(alternate, all('cooperate'));
    }
    assert.ok(alternate.disaster.damage < 50);
    assert.ok(original.disaster.damage >= 50);
    assert.equal(disasterConditions(original.disaster, original.day).forage, 1);
    assert.equal(disasterConditions(alternate.disaster, alternate.day).forage, 2);
  }
});

test('funded repairs consume actual public money and create worksite movement', () => {
  const before = initialWorld('tsunami');
  const next = applyRound(before, { bob: 'cooperate', alice: 'ask', kevin: 'ask', mia: 'ask' });
  const record = next.history[0].disaster;
  assert.equal(record.repairCost, 1);
  assert.equal(record.repaired, 8);
  assert.equal(metrics(next).wealth, metrics(before).wealth - 1);
  assert.equal(next.disaster.damage, 86);
  assert.equal(locationEffects(next).repairs.length, 1);
  assert.ok(scenePlan(next).find(p => p.id === 'bob')!.repairDestination);
  assert.equal(scenePlan(next).find(p => p.id === 'alice')!.repairDestination, undefined);
});

test('unfunded or failed contributions never repair damage or animate repair crews', () => {
  const before = initialWorld();
  ids.forEach(id => { before.people[id].food = 0; before.people[id].wealth = 0; });
  before.town.wealth = 0;
  const failed = applyRound(before, all('cooperate'));
  assert.equal(failed.history[0].disaster.repaired, 0);
  assert.equal(locationEffects(failed).repairs.length, 0);
  assert.ok(scenePlan(failed).every(p => !p.repairDestination));
  before.people.bob.food = 2;
  const unfunded = applyRound(before, all('cooperate'));
  assert.equal(unfunded.history[0].civic.cooperativeActions, 1);
  assert.equal(unfunded.history[0].disaster.repaired, 0);
});

test('emergency grants take priority over repairs when public funds are scarce', () => {
  const before = applyRound(initialWorld(), all('hoard'));
  ids.forEach(id => { before.people[id].food = 0; before.people[id].wealth = 0; });
  before.town.wealth = 1;
  const next = applyRound(before, all('cooperate'));
  assert.equal(next.history.at(-1)!.disaster.repairCost, 0);
  assert.equal(next.history.at(-1)!.disaster.repaired, 0);
  ids.forEach(id => assert.equal(next.people[id].wealth, .25));
});

test('repairs stop at zero damage without wasting money or creating resources', () => {
  let world = initialWorld('snowstorm');
  for (let day = 0; day < 5; day++) world = applyRound(world, all('cooperate'));
  assert.equal(world.disaster.damage, 0);
  const next = applyRound(world, all('cooperate'));
  assert.equal(next.history.at(-1)!.disaster.repairCost, 0);
  assert.equal(next.history.at(-1)!.disaster.repaired, 0);
  assert.equal(metrics(next).wealth, metrics(world).wealth);
  assert.equal(disasterConditions(next.disaster, next.day).phase, 'Village restored');
});

test('older saves replay under explicit tornado rules; current saves reject invalid disaster state', () => {
  const expected = applyRound(initialWorld(), all('share'));
  const { disaster: _, ...oldWorld } = expected;
  const legacy = { ...oldWorld, schemaVersion: 2, history: expected.history.map(({ disaster: _, ...e }) => e) };
  assert.deepEqual(migrateWorld(legacy), expected);
  assert.equal(validWorld(legacy), false);
  for (const bad of [undefined, { type: 'earthquake', damage: 1 }, { type: 'tornado', damage: NaN }, { type: 'tornado', damage: 101 }, { type: 'tornado', damage: -1 }]) {
    assert.equal(validWorld({ ...expected, disaster: bad }), false);
  }
  const corrupt = structuredClone(expected); corrupt.history[0].disaster.repaired = 30;
  assert.equal(validWorld(corrupt), false);
});

test('Drex receives the same disaster forecast and repair costs used by the engine', () => {
  for (const type of disasterTypes) {
    const world = applyRound(initialWorld(type), all('share'));
    const request = makeDrexRequest(world);
    assert.equal(request.state.disaster.type, type);
    assert.equal(request.state.disaster.damage, world.disaster.damage);
    assert.deepEqual(request.state.forecast, disasterConditions(world.disaster, world.day));
    assert.match(request.questions.bob.criteria.cooperate, /repairs 8 damage/);
    assert.doesNotMatch(request.state.setting, /pizza/i);
  }
});
