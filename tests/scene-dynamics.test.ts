import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorld,applyRound} from '../src/engine.js';
import {scenePlan,locationEffects,civicPlaces} from '../src/sceneDynamics.js';
test('cooperation and aid take residents to the public pantry with successful place effects',()=>{
 const w=applyRound(initialWorld(),{bob:'cooperate',alice:'ask',kevin:'ask',mia:'ask'});
 const plan=scenePlan(w);
 assert.equal(plan[0].destination.x,civicPlaces.pantry.x);
 assert.equal(locationEffects(w).pantry.filter(e=>e.kind==='cooperate').length,1);
 assert.equal(locationEffects(w).pantry.filter(e=>e.kind==='ask').length,3);
 assert.equal(plan.find(p=>p.id==='alice')!.failed,false);
});
test('failed plans can approach a location but cannot create a successful location effect',()=>{
 const before=initialWorld();before.people.alice.wealth=0;
 const w=applyRound(before,{bob:'hoard',alice:'cooperate',kevin:'trade',mia:'ask'});
 assert.equal(scenePlan(w).find(p=>p.id==='alice')!.failed,true);
 assert.equal(locationEffects(w).pantry.length,0);
 assert.equal(locationEffects(w).market.length,0);
});
test('social routes and atmosphere derive from recorded decisions without mutating state',()=>{
 const w=applyRound(initialWorld(),{bob:'share',alice:'hoard',kevin:'suspicion',mia:'trade'});
 const snapshot=JSON.stringify(w),plans=scenePlan(w);
 assert.notDeepEqual(plans[0].destination,plans[0].origin);
 assert.ok(plans.find(p=>p.id==='alice')!.receiving);
 assert.equal(locationEffects(w).tension.length,2);
 scenePlan(w);locationEffects(w);
 assert.equal(JSON.stringify(w),snapshot);
});
test('coin-only contributions animate the treasury without claiming a food deposit',()=>{
 const w=applyRound(initialWorld(),{bob:'hoard',alice:'cooperate',kevin:'hoard',mia:'hoard'});
 assert.equal(locationEffects(w).pantry.length,0);
 assert.equal(locationEffects(w).treasury.length,1);
 assert.match(scenePlan(w).find(p=>p.id==='alice')!.activity,/treasury/);
});
