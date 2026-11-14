import assert from 'node:assert/strict';
import {initialWorld,applyRound,divergence,type World} from '../src/engine.js';
const base=process.env.SMOKE_URL||'http://localhost:5173';
async function decide(world:World,mode='demo'){
 const response=await fetch(`${base}/api/decide`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world,mode})});
 return {status:response.status,body:await response.json()};
}
assert.equal((await fetch(base)).status,200);
const status=await (await fetch(`${base}/api/status`)).json();
const snapshot=initialWorld();
const first=await decide(snapshot);assert.equal(first.status,200);assert.equal(first.body.source,'demo');
const day1=applyRound(snapshot,first.body.decisions);
const second=await decide(day1);assert.equal(second.status,200);
const day2=applyRound(day1,second.body.decisions);assert.equal(day2.day,2);
let original=applyRound(snapshot,first.body.decisions);
let alternate=applyRound(snapshot,{...first.body.decisions,bob:'share'});
assert.deepEqual(original.history[0].decisions.alice,alternate.history[0].decisions.alice);
for(let i=0;i<2;i++){
 const results=await Promise.all([decide(original),decide(alternate)]);
 results.forEach(r=>assert.equal(r.status,200));
 original=applyRound(original,results[0].body.decisions);alternate=applyRound(alternate,results[1].body.decisions);
}
assert.equal(original.day,3);assert.equal(alternate.day,3);assert.ok(divergence(original,alternate).different>0);
assert.equal(snapshot.day,0);
if(!status.liveAvailable){const live=await decide(snapshot,'live');assert.equal(live.status,503);assert.match(live.body.error,/NACE_API_KEY/);assert.equal(live.body.decisions,undefined)}
const invalid=await fetch(`${base}/api/decide`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world:{},mode:'demo'})});assert.equal(invalid.status,400);
console.log('PASS: page, proxy, pizza crisis, next day, exact-snapshot branching, two independent future rounds, missing-key live failure, invalid state rejection.');
console.log('Day 3 divergence:',divergence(original,alternate));
