import assert from 'node:assert/strict';
import {disasterTypes} from '../src/disasters.js';
import {initialWorld,applyRound,divergence,type World} from '../src/engine.js';
const base=process.env.SMOKE_URL||'http://localhost:5173';
async function decide(world:World,mode='demo'){
 const response=await fetch(`${base}/api/decide`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world,mode})});
 return {status:response.status,body:await response.json()};
}
assert.equal((await fetch(base)).status,200);
await Promise.all(['village-painted.png','village-empty.png','citizens-painted.png'].map(async file=>{
 const response=await fetch(`${base}/art/${file}`);assert.equal(response.status,200);
 assert.match(response.headers.get('content-type')||'',/image\/png/);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
}));
const status=await (await fetch(`${base}/api/status`)).json();
for(const type of disasterTypes){
 let world=initialWorld(type);
 for(let day=0;day<4;day++){const result=await decide(world);assert.equal(result.status,200);world=applyRound(world,result.body.decisions);assert.equal(world.disaster.type,type);}
}
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
for(const branch of [original,alternate]){
 assert.equal(branch.schemaVersion,3);
 assert.ok(branch.town.outcome.length>0);
 assert.ok(branch.town.food>=0 && branch.town.wealth>=0);
 assert.ok(branch.town.stability>=0 && branch.town.stability<=100);
 assert.equal(branch.history.at(-1)?.civic.outcome,branch.town.outcome);
 assert.ok(branch.people.bob.recentActions.length>0);
}
assert.equal(divergence(original,alternate).total,28);
if(!status.liveAvailable){const live=await decide(snapshot,'live');assert.equal(live.status,503);assert.match(live.body.error,/NACE_API_KEY/);assert.equal(live.body.decisions,undefined);console.log('Live Drex: NOT tested (NACE_API_KEY unavailable).')}else{const live=await decide(snapshot,'live');assert.equal(live.status,200,live.body.error);assert.equal(live.body.source,'live');assert.equal(live.body.decisionsEvaluated,4);const liveWorld=applyRound(snapshot,live.body.decisions);assert.ok(liveWorld.town.outcome);console.log('Live Drex: tested one actual four-citizen round using',live.body.model)}
const invalid=await fetch(`${base}/api/decide`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world:{},mode:'demo'})});assert.equal(invalid.status,400);
console.log('PASS: page, proxy, disaster response, next day, exact-snapshot branching, two independent future rounds, missing-key live failure, invalid state rejection.');
console.log('Day 3 civic identities:',original.town.outcome,'/',alternate.town.outcome);
console.log('Day 3 divergence:',divergence(original,alternate));
