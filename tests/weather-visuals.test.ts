import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weatherVisuals, weatherRandom } from '../src/weatherVisuals.js';
import { disasterTypes } from '../src/disasters.js';

test('storm strength follows the shared calendar, independently of branch damage',()=>{
 for(const type of disasterTypes){
  for(let day=0;day<6;day++){
   const original=weatherVisuals({type,damage:90},day),alternate=weatherVisuals({type,damage:15},day);
   assert.equal(original.strength,alternate.strength);
   assert.equal(original.active,alternate.active);
   assert.ok(original.strength>=0&&original.strength<=1);
  }
  assert.equal(weatherVisuals({type,damage:90},5).active,false);
 }
 assert.ok(weatherVisuals({type:'tornado',damage:56},0).strength>weatherVisuals({type:'tornado',damage:56},1).strength);
 assert.ok(weatherVisuals({type:'snowstorm',damage:42},1).strength>weatherVisuals({type:'snowstorm',damage:42},0).strength);
});

test('recovery removes residual water, snow and debris without changing simulation inputs',()=>{
 for(const type of disasterTypes){
  const source={type,damage:80},snapshot=JSON.stringify(source);
  const damaged=weatherVisuals(source,5),repaired=weatherVisuals({type,damage:20},5),restored=weatherVisuals({type,damage:0},5);
  assert.equal(JSON.stringify(source),snapshot);
  assert.ok(damaged.damage>repaired.damage);
  assert.equal(restored.damage,0);assert.equal(restored.waterDepth,0);assert.equal(restored.snowCover,0);
  if(type==='tsunami')assert.ok(damaged.waterDepth>repaired.waterDepth);
  if(type==='snowstorm')assert.ok(damaged.snowCover>repaired.snowCover);
 }
 // A currently active sea surge remains visible even if all existing damage has been repaired.
 assert.ok(weatherVisuals({type:'tsunami',damage:0},0).waterDepth>0);
});

test('weather particles are stable between views and stay within normalized bounds',()=>{
 const first=Array.from({length:500},(_,i)=>weatherRandom(i,19));
 assert.deepEqual(first,Array.from({length:500},(_,i)=>weatherRandom(i,19)));
 assert.ok(first.every(n=>n>=0&&n<1));
 assert.notDeepEqual(first,Array.from({length:500},(_,i)=>weatherRandom(i,20)));
});
