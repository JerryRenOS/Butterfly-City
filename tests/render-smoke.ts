import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { initialWorld, applyRound, demoDecisions } from '../src/engine.js';
const transport=createHttpServer();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>null},configurable:true});
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:{server:transport},watch:null},appType:'custom'});
try {
 const {default:App}=await server.ssrLoadModule('/src/App.tsx');
 const initial=renderToString(createElement(App));
 assert.match(initial,/The last pizza/);
 assert.match(initial,/painted-landscape/);
 assert.match(initial,/Meet Bob/);
 assert.match(initial,/class="story-controls"/);
 assert.match(initial,/<details class="story-details"/);
 const before=initialWorld(),decisions=demoDecisions(before);
 const world=applyRound(before,decisions),alternate=applyRound(before,{...decisions,bob:'share'});
 const session={world,pivot:{before,decisions},branches:[world,alternate],mode:'demo',receipts:[]};
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>JSON.stringify(session)},configurable:true});
 const split=renderToString(createElement(App));
 assert.match(split,/Advance both worlds/);
 assert.match(split,/THE ORIGINAL/);
 assert.match(split,/THE WHAT IF/);
 assert.equal((split.match(/class="painted-landscape"/g)||[]).length,2);
 assert.equal((split.match(/aria-label="Meet Bob"/g)||[]).length,2);
 assert.match(split,/ripple-details/);
 assert.match(split,/public coins/);
 console.log('PASS: initial and saved split worlds render, all residents remain interactive, primary controls and expandable details are present.');
} finally {
 delete (globalThis as unknown as Record<string,unknown>).localStorage;
 await server.close();
}
