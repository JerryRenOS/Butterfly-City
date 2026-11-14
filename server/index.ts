import 'dotenv/config';
import express from 'express';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { actions, actionDescriptions, characters, demoDecisions, ids, validDecisions, type World, type Decisions, type Id } from '../src/engine.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
const model = process.env.NACE_MODEL || 'drex-v2.0';
app.get('/api/status', (_req, res) => { res.json({ liveAvailable: Boolean(process.env.NACE_API_KEY), model }); });
function validWorld(value: unknown): value is World {
  if (!value || typeof value !== 'object') return false;
  const w = value as World;
  return Number.isInteger(w.day) && w.day >= 0 && w.day <= 1000 && Array.isArray(w.history) && w.history.length <= 1000 && ids.every(id => w.people?.[id] && ['food', 'mood'].every(key => { const n = w.people[id][key as 'food' | 'mood']; return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100; }) && ids.every(other => typeof w.trust?.[id]?.[other] === 'number' && Number.isFinite(w.trust[id][other]) && w.trust[id][other] >= 0 && w.trust[id][other] <= 100));
}
export function makeDrexRequest(world: World) {
  return {
    model,
    state: { setting: "Butterfly City, a tiny storybook town experiencing a food shortage. Bob has found the last pizza (8 food units) on day 0. Decide in character, not as an impartial planner. All four decisions are simultaneous. No one knows other residents' decisions this round. On later days each resident forages 2 food before acting. After actions everyone eats 1 food; hunger loses 12 mood, eating gains 4 mood. Food and mood range 0–100. Trust[a][b] means how much a trusts b. Share gives up to 3 food split equally among others. Trade is food for goodwill, not a food exchange. Personality, hunger, current trust and recent events must influence the choices.", characters, day: world.day, people: world.people, trust: world.trust, recentEvents: world.history.slice(-3), lastDecisions: world.lastDecisions },
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
  if (!validWorld(world) || !['demo', 'live'].includes(mode)) { res.status(400).json({ error: 'Invalid game state or mode.' }); return; }
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
app.use(express.static(resolve('dist')));
app.use((req, res) => { if (req.path.startsWith('/api/')) res.status(404).json({ error: 'API route not found.' }); else res.sendFile(resolve('dist/index.html')); });
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3001);
  app.listen(port, '127.0.0.1', () => console.log(`Butterfly City API: http://localhost:${port} (${process.env.NACE_API_KEY ? 'Live Drex available' : 'Demo mode; set NACE_API_KEY for live decisions'})`));
}
