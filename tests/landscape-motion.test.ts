import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landscapeCover, landscapeMotionProfile, landscapeRegionWeights } from '../src/landscapeMotion.js';

test('responsive landscape crop keeps top-left image landmarks aligned with CSS cover', () => {
  const original = landscapeCover(1672, 941, 1672, 941);
  assert.deepEqual(original, { scale: [1, 1], offset: [0, 0] });
  const wide = landscapeCover(1500, 450, 1672, 941);
  assert.equal(wide.scale[0], 1);
  assert.ok(wide.scale[1] < 1);
  assert.ok(Math.abs(wide.offset[1] - (1 - wide.scale[1]) * .65) < 1e-8);
  const narrow = landscapeCover(600, 500, 1672, 941);
  assert.equal(narrow.scale[1], 1);
  assert.ok(narrow.scale[0] < 1);
  assert.equal(narrow.offset[0], (1 - narrow.scale[0]) / 2);
});

test('motion regions select leaves and fabric while architecture and square stay anchored', () => {
  for (const [x, y] of [[.21, .04], [.06, .8], [.945, .855]]) assert.ok(landscapeRegionWeights(x, y).foliage > .9);
  assert.ok(landscapeRegionWeights(.453, .361).fabric > .9);
  for (const [x, y] of [[.46, .76], [.5, .48], [.46, .23], [.56, .07]]) {
    assert.deepEqual(landscapeRegionWeights(x, y), { foliage: 0, fabric: 0 });
  }
});

test('recovered villages keep moving and each active storm strengthens ambient wind', () => {
  for (const type of ['tornado', 'tsunami', 'snowstorm'] as const) {
    const calm = landscapeMotionProfile({ type, damage: 0 }, 5);
    const active = landscapeMotionProfile({ type, damage: 70 }, 0);
    assert.ok(calm.wind > 0 && calm.speed > 0 && calm.cloudSpeed > 0);
    assert.ok(active.wind > calm.wind);
    assert.ok(active.speed > calm.speed);
  }
});
