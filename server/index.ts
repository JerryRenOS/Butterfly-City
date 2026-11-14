import 'dotenv/config';
import { disasters, disasterConditions } from '../src/disasters.js';
import express from 'express';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { actions, actionDescriptions, characters, demoDecisions, ids, validDecisions, isWorld, type World, type Decisions, type Id } from '../src/engine.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
const model = process.env.NACE_MODEL || 'drex-v2.0';
app.get('/api/status', (_req, res) => { res.json({ liveAvailable: Boolean(process.env.NACE_API_KEY), model }); });
export function validWorld(value: unknown): value is World {
  if (!value || typeof value !== 'object') return false;
  const w = value as World;
  const resource = (n: unknown) => typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1000000;
  const bounded = (n: unknown) => resource(n) && (n as number)<=100;
  return isWorld(value) && w.schemaVersion===3 && Number.isInteger(w.day) && w.day>=0 && w.day<=1000
    && Array.isArray(w.history) && w.history.length===w.day
    && !!w.town && resource(w.town.food) && resource(w.town.wealth)
    && ['trust','mood','stability'].every(k=>bounded(w.town[k as 'trust'|'mood'|'stability']))
    && typeof w.town.outcome==='string' && w.town.outcome.length<100 && typeof w.town.summary==='string' && w.town.summary.length<2000
    && ids.every(id=>w.people?.[id] && resource(w.people[id].food) && resource(w.people[id].wealth) && bounded(w.people[id].mood)
      && typeof w.people[id].role==='string' && w.people[id].role.length<200
      && Array.isArray(w.people[id].traits) && w.people[id].traits.length<=20 && w.people[id].traits.every(t=>typeof t==='string'&&t.length<200)
      && Array.isArray(w.people[id].recentActions) && w.people[id].recentActions.length<=10 && w.people[id].recentActions.every(a=>actions.includes(a))
      && ids.every(other=>bounded(w.trust?.[id]?.[other])))
    && (w.lastDecisions===null || validDecisions(w.lastDecisions))
    && w.history.every(e=>e && Number.isInteger(e.day) && validDecisions(e.decisions) && Array.isArray(e.notes) && e.notes.every(n=>typeof n==='string') && !!e.civic && Array.isArray(e.effects));
}
export function makeDrexRequest(world: World) {
  return {
    model,
    state: {
      setting: "Butterfly City is a miniature civilization recovering from a natural disaster. Bob rescued an emergency cache of 8 food; the others have no private food initially. Decide in character, not as an impartial planner. All four actions are simultaneous against this SAME snapshot: do not assume another person's current choice. The forecast specifies food gathered per citizen before actions (0 on day 0). Active weather restricts gathering; after it clears, damage of 50 or more limits gathering to 1 food, otherwise 2. Weather adds the forecast intensity to damage, capped at 100, and reduces stability by ceil(intensity / 6). After dinner and emergency grants, each successful cooperate action organizes up to one public coin of repair, repairing 8 damage per coin, capped by remaining damage and treasury funds. Repair costs are consumed. The identical weather calendar applies to both timelines; repairs may diverge. Resource budgets are fixed before actions; gifts and income received this round cannot be spent again in the same round. Dinner costs 1 food each: +4 mood if fed, -12 if hungry. Trust[a][b] is a's trust toward b. Public pantry and treasury are distinct from private resources. After dinner on later days the treasury fairly grants up to one coin to each hungry citizen with less than one private coin, subject to funds; grants can only be spent next round. Evaluate each action using the exact action criteria. Personality traits, role, hunger, wealth, relationships, recent actions, and public stability should influence decisions. Civic outcomes are calculated AFTER the round by deterministic rules. Do not predict or replace those outcomes.",
      disaster: { ...world.disaster, name: disasters[world.disaster.type].name, description: disasters[world.disaster.type].description }, forecast: disasterConditions(world.disaster, world.day),
      characters, day:world.day, people:world.people, publicTown:world.town, trust:world.trust,
      recentEvents:world.history.slice(-3), lastDecisions:world.lastDecisions,
    },
    questions: Object.fromEntries(ids.map(id => [id, { type: 'choice', instructions: `What action will ${characters[id].name} take today? Personality: ${characters[id].personality} Choose the most plausible action given this resident's resources and relationships, even if selfish or irrational.`, criteria: actionDescriptions }])),
  };
}
export function parseDrexResponse(data: unknown) {
  if (!data || typeof data !== 'object') throw new Error('Drex returned an invalid response.');
  const payload = data as { answers?: Record<string, { type?: string; choice?: unknown; probabilities?: unknown }>; model?: unknown };
  const decisions = Object.fromEntries(ids.map(id => [id, payload.answers?.[id]?.choice])) as Decisions;
  if (!validDecisions(decisions) || !ids.every(id => payload.answers?.[id]?.type === 'choice')) throw new Error('Drex did not return a valid choice for all four citizens. Please retry.');
  const probabilities: Partial<Record<Id, Record<string, number>>> = {};
  ids.forEach(id => {
    const p = payload.answers?.[id]?.probabilities;
    if (p && typeof p === 'object' && actions.every(action => typeof (p as Record<string, number>)[action] === 'number' && Number.isFinite((p as Record<string, number>)[action]) && (p as Record<string, number>)[action] >= 0 && (p as Record<string, number>)[action] <= 1)) probabilities[id] = Object.fromEntries(actions.map(action => [action, (p as Record<string, number>)[action]]));
  });
  return { decisions, probabilities, model: typeof payload.model === 'string' ? payload.model : model };
}
app.post('/api/decide', async (req, res) => {
  const { world, mode } = req.body || {};
  if (!validWorld(world) || !['demo', 'live'].includes(mode)) { res.status(400).json({ error: 'Invalid civilization state or mode. Reload the game to migrate an older save.' }); return; }
  const started = performance.now();
  if (mode === 'demo') { res.json({ decisions: demoDecisions(world), source: 'demo', model: 'Local deterministic demo', latencyMs: Math.round(performance.now() - started), decisionsEvaluated: 4, probabilities: {} }); return; }
  if (!process.env.NACE_API_KEY) { res.status(503).json({ error: 'Live mode needs NACE_API_KEY in the server .env file. Add the key and restart the server, or select Demo Mode.' }); return; }
  try {
    const response = await fetch('https://console.nace.ai/v1/systemone', { method: 'POST', headers: { Authorization: `Bearer ${process.env.NACE_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(makeDrexRequest(world)), signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      const messages: Record<number, string> = { 401: 'The Nace API key was rejected. Check NACE_API_KEY.', 402: 'Nace account balance is insufficient.', 403: 'The Nace API key cannot access this model.', 422: 'Nace rejected this model or request. Check NACE_MODEL against the models available to your account.', 429: 'Drex is rate limited. Wait a moment and retry.' };
      res.status(502).json({ error: messages[response.status] || `Drex is unavailable (HTTP ${response.status}). Please retry.` }); return;
    }
    const parsed = parseDrexResponse(await response.json());
    res.json({ ...parsed, source: 'live', latencyMs: Math.round(performance.now() - started), decisionsEvaluated: 4 });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'Drex took too long. Your town is unchanged; please retry.' : error instanceof Error && error.message.startsWith('Drex') ? error.message : 'Could not reach Drex. Your town is unchanged; please retry.';
    res.status(502).json({ error: message });
  }
});
const jsonErrorHandler: express.ErrorRequestHandler = (error, _req, res, next) => {
  if(error?.type==='entity.too.large'){res.status(413).json({error:'This saved civilization is too large to process. Start a new story to continue.'});return;}
  if(error?.type==='entity.parse.failed'){res.status(400).json({error:'The request contained invalid JSON.'});return;}
  next(error);
};
app.use(jsonErrorHandler);
app.use(express.static(resolve('dist')));
app.use((req, res) => { if (req.path.startsWith('/api/')) res.status(404).json({ error: 'API route not found.' }); else res.sendFile(resolve('dist/index.html')); });
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Butterfly City API: http://localhost:${port} (${process.env.NACE_API_KEY ? 'Live Drex available' : 'Demo mode; set NACE_API_KEY for live decisions'})`));
}
