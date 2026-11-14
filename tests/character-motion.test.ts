import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ids, initialWorld, applyRound, type Id, type Decisions } from '../src/engine.js';
import { scenePlan, type ScenePoint } from '../src/sceneDynamics.js';
import {
  createCharacterMotion, retargetCharacterMotion, stepCharacterMotion, settleCharacterMotion,
  characterMotionView, characterRoute, facingForDirection, walkFrameForDistance,
  resolveMotionTargets, personalDistance, PERSONAL_SPACE, WALK_BOUNDS, type CharacterMotionState,
  refreshCharacterFacing,
} from '../src/characterMotion.js';

const initial: Record<Id, ScenePoint> = {
  bob: { x: 20, y: 80 }, alice: { x: 45, y: 91 }, kevin: { x: 76, y: 76 }, mia: { x: 80, y: 91 },
};
function run(state: CharacterMotionState, seconds: number, inspect?: (state: CharacterMotionState) => void) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    state = stepCharacterMotion(state, 1 / 60);
    inspect?.(state);
  }
  return state;
}
function assertSafe(state: CharacterMotionState) {
  ids.forEach(id => {
    const actor = state.actors[id];
    assert.ok(actor.x >= WALK_BOUNDS.left && actor.x <= WALK_BOUNDS.right);
    assert.ok(actor.y >= WALK_BOUNDS.top && actor.y <= WALK_BOUNDS.bottom);
  });
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    assert.ok(personalDistance(state.actors[ids[i]], state.actors[ids[j]]) >= PERSONAL_SPACE - 0.02,
      `${ids[i]} and ${ids[j]} must retain personal space`);
  }
}

test('turning precedes stepping; characters accelerate, walk, brake and arrive', () => {
  const start = createCharacterMotion(initial);
  let state = retargetCharacterMotion(start, { ...initial, bob: { x: 54, y: 79 } });
  assert.equal(state.actors.bob.arrived, false);
  state = stepCharacterMotion(state, 0.08);
  assert.equal(state.actors.bob.x, initial.bob.x);
  assert.equal(state.actors.bob.moving, false);
  assert.equal(state.actors.bob.arrived, false);
  state = run(state, 0.6);
  assert.ok(state.actors.bob.speed > 1);
  assert.ok(state.actors.bob.speed < 14);
  assert.equal(state.actors.bob.moving, true);
  state = run(state, 6, assertSafe);
  assert.equal(state.actors.bob.arrived, true);
  assert.ok(Math.abs(state.actors.bob.x - 54) < 0.15);
  assert.ok(Math.abs(state.actors.bob.y - 79) < 0.15);
  assert.equal(state.actors.bob.speed, 0);
});

test('gait is distance driven and stops during a stationary conversation', () => {
  assert.equal(walkFrameForDistance('bob', 0), 0);
  assert.equal(walkFrameForDistance('bob', 2), 1);
  assert.equal(walkFrameForDistance('bob', 4), 2);
  assert.equal(walkFrameForDistance('bob', 6), 3);
  assert.equal(walkFrameForDistance('bob', 7.7), 0);
  let state = retargetCharacterMotion(createCharacterMotion(initial), { ...initial, bob: { x: 30, y: 80 } });
  state = run(state, 3);
  const arrivedFrame = state.actors.bob.walkFrame;
  const arrivedDistance = state.actors.bob.distanceWalked;
  state = run(state, 2);
  assert.equal(state.actors.bob.walkFrame, arrivedFrame);
  assert.equal(state.actors.bob.distanceWalked, arrivedDistance);
  assert.equal(state.actors.bob.moving, false);
});

test('curved routes remain on the ground and retargeting never teleports a walker', () => {
  const route = characterRoute('bob', { x: 8, y: 70 }, { x: 92, y: 70 });
  assert.ok(route.some(p => p.y > 70.1), 'long route should have a shallow bend');
  route.forEach(p => {
    assert.ok(p.x >= 8 && p.x <= 92 && p.y >= 70 && p.y <= 92);
  });
  let state = retargetCharacterMotion(createCharacterMotion(initial), { ...initial, bob: { x: 62, y: 80 } });
  state = run(state, 1);
  const position = { x: state.actors.bob.x, y: state.actors.bob.y };
  state = retargetCharacterMotion(state, { ...initial, bob: { x: 10, y: 89 } });
  assert.deepEqual({ x: state.actors.bob.x, y: state.actors.bob.y }, position);
  assert.equal(state.actors.bob.arrived, false);
  state = run(state, 5, assertSafe);
  assert.equal(state.actors.bob.arrived, true);
});

test('crossing citizens pass each other without overlaps and finish their errands', () => {
  const start = { ...initial, bob: { x: 18, y: 81 }, alice: { x: 74, y: 81 } };
  const targets = { ...initial, bob: { x: 74, y: 81 }, alice: { x: 18, y: 81 } };
  let state = retargetCharacterMotion(createCharacterMotion(start), targets);
  state = run(state, 14, assertSafe);
  ids.forEach(id => assert.equal(state.actors[id].arrived, true, `${id} should arrive`));
});

test('standing citizens do not trap errands on an occupied intermediate waypoint', () => {
  const rounds: Decisions[] = [
    { bob: 'influence', alice: 'cooperate', kevin: 'support', mia: 'ask' },
    { bob: 'hoard', alice: 'trade', kevin: 'influence', mia: 'cooperate' },
    { bob: 'ask', alice: 'share', kevin: 'trade', mia: 'cooperate' },
  ];
  rounds.forEach(decisions => {
    const plan = scenePlan(applyRound(initialWorld(), decisions));
    const origins = Object.fromEntries(plan.map(p => [p.id, p.origin])) as Record<Id, ScenePoint>;
    const targets = Object.fromEntries(plan.map(p => [p.id, p.destination])) as Record<Id, ScenePoint>;
    const state = run(retargetCharacterMotion(createCharacterMotion(origins), targets), 15, assertSafe);
    ids.forEach(id => assert.equal(state.actors[id].arrived, true, `${id} should complete the ${decisions[id]} errand`));
  });
});

test('crowded destinations resolve into distinct nearby positions, including ground edges', () => {
  const targets = Object.fromEntries(ids.map(id => [id, { x: 8, y: 70 }])) as Record<Id, ScenePoint>;
  const resolved = resolveMotionTargets(targets);
  assert.deepEqual(resolveMotionTargets(targets), resolved, 'target layout must be deterministic');
  let state = retargetCharacterMotion(createCharacterMotion(initial), targets);
  state = run(state, 25, assertSafe);
  ids.forEach(id => assert.equal(state.actors[id].arrived, true, `${id} should join the queue`));
});

test('idle participants turn toward their conversational partner with depth-aware facing', () => {
  assert.equal(facingForDirection(-12, 1), 'left');
  assert.equal(facingForDirection(12, 1), 'right');
  assert.equal(facingForDirection(2, -6), 'back-right');
  assert.equal(facingForDirection(-2, -6), 'back-left');
  assert.equal(facingForDirection(0, 4), 'front');
  let state = createCharacterMotion(initial);
  state = refreshCharacterFacing(state, { bob: 'kevin', kevin: 'bob' });
  assert.equal(state.actors.bob.facingReady, false, 'speech waits for an idle turn to finish');
  for (let i = 0; i < 30; i++) state = stepCharacterMotion(state, 1 / 30, { bob: 'kevin', kevin: 'bob' });
  assert.equal(state.actors.bob.facing, 'right');
  assert.equal(state.actors.kevin.facing, 'left');
  assert.equal(state.actors.bob.moving, false);
  assert.equal(state.actors.bob.facingReady, true);
  assert.ok(state.actors.mia.depth > state.actors.kevin.depth);
});

test('stepping and retargeting preserve all caller inputs; reduced motion settles immediately', () => {
  const original = createCharacterMotion(initial), snapshot = JSON.stringify(original), input = JSON.stringify(initial);
  const targets = { ...initial, bob: { x: 60, y: 83 } };
  const next = run(retargetCharacterMotion(original, targets), 2);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(JSON.stringify(initial), input);
  const settled = settleCharacterMotion(next, targets, { bob: 'alice' });
  assert.deepEqual({ x: settled.actors.bob.x, y: settled.actors.bob.y }, targets.bob);
  ids.forEach(id => { assert.equal(settled.actors[id].moving, false); assert.equal(settled.actors[id].arrived, true); });
  const view = characterMotionView(settled);
  assert.equal(view.bob.speed, 0);
  assert.equal('route' in view.bob, false);
});
