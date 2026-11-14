import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWorld, applyRound, demoDecisions, actions, ids } from '../src/engine.js';
import { makeDrexRequest, validWorld } from '../server/index.js';
test('Drex receives public resources, persistent traits, social memory, and complete action choices',()=>{
 const w=applyRound(initialWorld(),demoDecisions(initialWorld()));
 const request=makeDrexRequest(w);
 assert.deepEqual(request.state.publicTown,w.town);
 assert.deepEqual(request.state.people.bob.recentActions,w.people.bob.recentActions);
 assert.ok(request.state.people.bob.traits.length>0);
 assert.deepEqual(request.state.trust,w.trust);
 for(const id of ids)assert.deepEqual(Object.keys(request.questions[id].criteria),[...actions]);
 assert.equal(Object.keys(request.questions).length,4);
});
test('API validation rejects missing civic state and invalid wealth without changing valid saves',()=>{
 const w=initialWorld();assert.equal(validWorld(w),true);
 assert.equal(validWorld({...w,town:undefined}),false);
 assert.equal(validWorld({...w,people:{...w.people,bob:{...w.people.bob,wealth:NaN}}}),false);
 assert.equal(validWorld({...w,people:{...w.people,bob:{...w.people.bob,wealth:-1}}}),false);
 assert.equal(validWorld({...w,town:{...w.town,stability:101}}),false);
 const advanced=applyRound(w,demoDecisions(w));assert.equal(validWorld(advanced),true);
});
