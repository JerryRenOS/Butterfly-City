export const ids = ['bob', 'alice', 'kevin', 'mia'] as const;
export type Id = typeof ids[number];
export const actions = ['share', 'hoard', 'trade', 'influence', 'cooperate', 'support', 'ask', 'suspicion'] as const;
export type Action = typeof actions[number];
export type Decisions = Record<Id, Action>;
export const characters: Record<Id, { name: string; personality: string; role: string; color: string }> = {
  bob: { name: 'Bob', role: 'Lovable troublemaker', personality: 'Mischievous, selfish opportunist. Loves a shortcut and wants to be liked, but usually puts his own belly first.', color: '#ee8552' },
  alice: { name: 'Alice', role: 'The big-hearted optimist', personality: 'Kindhearted idealist who shares freely, values fairness, and cooperates when others show kindness.', color: '#e995ad' },
  kevin: { name: 'Kevin', role: 'Resident overthinker', personality: 'Paranoid conspiracy theorist. Suspects pizza shortages are planned. Guards supplies unless trust is earned.', color: '#9d8ed4' },
  mia: { name: 'Mia', role: 'Small-town visionary', personality: 'Confident entrepreneur. Sees opportunities everywhere, prefers fair trades, and builds alliances with reliable neighbors.', color: '#57b6ab' },
};
export type Effect = { actor: Id; target?: Id; kind: string; description: string };
export type CivicResult = { outcome: string; summary: string; cooperativeActions: number; hungry: number; stabilityDelta: number };
export type RoundEvent = { day: number; decisions: Decisions; notes: string[]; effects: Effect[]; civic: CivicResult };
export type Person = { food: number; mood: number; wealth: number; role: string; traits: string[]; recentActions: Action[] };
export type Town = { food: number; wealth: number; trust: number; mood: number; stability: number; outcome: string; summary: string };
export type World = { schemaVersion: 2; day: number; people: Record<Id, Person>; town: Town; trust: Record<Id, Record<Id, number>>; history: RoundEvent[]; lastDecisions: Decisions | null };
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const epsilon = 1e-8;
const traits: Record<Id, string[]> = { bob: ['opportunistic', 'mischievous', 'status-seeking'], alice: ['kindhearted', 'fair-minded', 'idealistic'], kevin: ['suspicious', 'cautious', 'inventive'], mia: ['enterprising', 'confident', 'pragmatic'] };
export function initialWorld(): World {
  const moods = { bob: 65, alice: 72, kevin: 42, mia: 65 };
  const person = (id: Id): Person => ({ food: id === 'bob' ? 8 : 0, mood: moods[id], wealth: 3, role: characters[id].role, traits: [...traits[id]], recentActions: [] });
  return { schemaVersion: 2, day: 0, people: { bob: person('bob'), alice: person('alice'), kevin: person('kevin'), mia: person('mia') }, town: { food: 0, wealth: 4, trust: 50, mood: 61, stability: 55, outcome: 'Uneasy Peace', summary: 'Eight slices, four neighbors, and a decision still to be made.' }, trust: Object.fromEntries(ids.map(id => [id, Object.fromEntries(ids.map(other => [other, id === other ? 100 : 50]))])) as World['trust'], history: [], lastDecisions: null };
}
export const actionDescriptions: Record<Action, string> = {
  share: 'Give up to 3 private food equally to all three neighbors. Recipients gain 6 mood and 14 trust in you; you gain 5 mood.',
  hoard: 'Keep your private food; each neighbor loses 9 trust in you. Gain 3 mood if you have food.',
  trade: 'Sell 1 food for 1 wealth to the next resident in Bob → Alice → Kevin → Mia → Bob order, if you have food and they can pay from their starting wealth after any cooperation tax. Both gain 7 mutual trust and you gain 5 mood.',
  influence: 'Give 1 food to the next resident in town order. They gain 12 trust in you; the other two lose 4 trust in you. You gain 7 mood.',
  cooperate: 'Deposit up to 2 private food into the public pantry and pay up to 1 wealth into the town treasury. A successful contribution raises stability by 5 and every neighbor gains 6 trust in you.',
  support: 'Give up to 2 private food to the poorest-fed other resident(s), splitting ties equally. Recipients gain 10 mood and 12 trust in you.',
  ask: 'Request public pantry aid toward 3 private food (dinner plus a two-food reserve). Available food is divided fairly between requesters, capped at each person’s need; current-round public donations are available.',
  suspicion: 'Spread a suspicious rumor. Lose 10 trust in every neighbor; each neighbor loses 5 trust in you. Lose 3 mood and lower stability by 4.',
};
export function validDecisions(value: unknown): value is Decisions {
  return !!value && typeof value === 'object' && ids.every(id => actions.includes((value as Decisions)[id]));
}
export function metrics(world: World) {
  return { food: world.town.food + ids.reduce((sum, id) => sum + world.people[id].food, 0), wealth: world.town.wealth + ids.reduce((sum, id) => sum + world.people[id].wealth, 0), mood: ids.reduce((sum, id) => sum + world.people[id].mood, 0) / 4, trust: ids.reduce((sum, id) => sum + ids.filter(x => x !== id).reduce((n, x) => n + world.trust[id][x], 0), 0) / 12, stability: world.town.stability };
}
export function formatNumber(n: number) { return Math.abs(n - Math.round(n)) < epsilon ? String(Math.round(n)) : n.toFixed(1); }

export function applyRound(world: World, decisions: Decisions): World {
  if (!validDecisions(decisions)) throw new Error('A round requires four valid decisions.');
  const next = structuredClone(world), notes: string[] = [], effects: Effect[] = [];
  const effect = (actor: Id, kind: string, description: string, target?: Id) => effects.push({ actor, ...(target ? { target } : {}), kind, description });
  const mood = (actor: Id, target: Id, amount: number) => {
    const before = next.people[target].mood; next.people[target].mood = clamp(before + amount);
    const delta = next.people[target].mood - before;
    if (Math.abs(delta) > epsilon) effect(actor, 'mood', `${characters[target].name}'s mood ${delta > 0 ? '+' : ''}${formatNumber(delta)}.`, target);
  };
  const trust = (actor: Id, observer: Id, target: Id, amount: number) => {
    const before = next.trust[observer][target]; next.trust[observer][target] = clamp(before + amount);
    const delta = next.trust[observer][target] - before;
    if (Math.abs(delta) > epsilon) effect(actor, 'trust', `${characters[observer].name}'s trust in ${characters[target].name} ${delta > 0 ? '+' : ''}${formatNumber(delta)}.`, observer);
  };
  let stabilityChange = 0, cooperativeActions = 0, trades = 0, aidActions = 0;
  if (world.day > 0) {
    ids.forEach(id => { next.people[id].food += 2; effect(id, 'harvest', `${characters[id].name} foraged 2 food.`); });
    notes.push('Everyone foraged 2 food. Both timelines receive the same harvest.');
  }
  // All private spending uses beginning-of-round budgets: incoming gifts and sale proceeds cannot be spent again.
  const foodBudget = Object.fromEntries(ids.map(id => [id, next.people[id].food])) as Record<Id, number>;
  const wealthBudget = Object.fromEntries(ids.map(id => [id, next.people[id].wealth - (decisions[id] === 'cooperate' ? Math.min(1, next.people[id].wealth) : 0)])) as Record<Id, number>;
  const transfer = (actor: Id, target: Id, amount: number) => { next.people[actor].food -= amount; next.people[target].food += amount; effect(actor, 'food-transfer', `${characters[actor].name} gave ${characters[target].name} ${formatNumber(amount)} food.`, target); };
  const say = (actor: Id, kind: string, description: string, target?: Id) => { notes.push(description); effect(actor, kind, description, target); };
  ids.forEach((id, index) => {
    const name = characters[id].name, others = ids.filter(other => other !== id), action = decisions[id], neighbor = ids[(index + 1) % 4];
    if (action === 'share' || action === 'support') {
      const amount = Math.min(action === 'share' ? 3 : 2, foodBudget[id]);
      const poorest = Math.min(...others.map(other => foodBudget[other]));
      const recipients = action === 'share' ? others : others.filter(other => Math.abs(foodBudget[other] - poorest) < epsilon);
      if (amount > epsilon) {
        recipients.forEach(other => { transfer(id, other, amount / recipients.length); trust(id, other, id, action === 'share' ? 14 : 12); mood(id, other, action === 'share' ? 6 : 10); });
        mood(id, id, 5); cooperativeActions++; aidActions++; stabilityChange += 3;
        say(id, action, `${name} ${action === 'share' ? 'shared' : 'gave aid of'} ${formatNumber(amount)} food ${action === 'share' ? 'equally to all neighbors' : `to ${recipients.map(other => characters[other].name).join(' and ')}${recipients.length > 1 ? ', splitting their equal need fairly' : ''}`}.`);
      } else say(id, 'unfulfilled', `${name} wanted to ${action}, but had no food to give.`);
    } else if (action === 'hoard') {
      others.forEach(other => trust(id, other, id, -9));
      if (foodBudget[id] > 0) mood(id, id, 3);
      stabilityChange -= 2; say(id, action, `${name} kept supplies private; neighbors became less trusting.`);
    } else if (action === 'trade') {
      if (foodBudget[id] >= 1 && wealthBudget[neighbor] >= 1) {
        transfer(id, neighbor, 1); next.people[neighbor].wealth -= 1; next.people[id].wealth += 1;
        trust(id, neighbor, id, 7); trust(id, id, neighbor, 7); mood(id, id, 5); trades++; stabilityChange += 2;
        say(id, action, `${name} sold 1 food to ${characters[neighbor].name} for 1 wealth.`, neighbor);
      } else say(id, 'unfulfilled', `${name}'s trade failed: ${foodBudget[id] < 1 ? 'no food to sell' : `${characters[neighbor].name} had no available starting wealth`}.`);
    } else if (action === 'influence') {
      if (foodBudget[id] >= 1) {
        transfer(id, neighbor, 1); trust(id, neighbor, id, 12); others.filter(other => other !== neighbor).forEach(other => trust(id, other, id, -4)); mood(id, id, 7);
        say(id, action, `${name} gave ${characters[neighbor].name} 1 food to gain influence.`, neighbor);
      } else say(id, 'unfulfilled', `${name} tried to gain influence, but had no food to offer.`);
    } else if (action === 'cooperate') {
      const food = Math.min(2, foodBudget[id]), wealth = Math.min(1, world.people[id].wealth);
      next.people[id].food -= food; next.town.food += food; next.people[id].wealth -= wealth; next.town.wealth += wealth;
      if (food + wealth > epsilon) {
        cooperativeActions++; stabilityChange += 5; others.forEach(other => trust(id, other, id, 6)); mood(id, id, 4);
        say(id, action, `${name} contributed ${formatNumber(food)} food to the public pantry and ${formatNumber(wealth)} wealth to the treasury.`);
      } else say(id, 'unfulfilled', `${name} wanted to contribute, but had no private resources.`);
    } else if (action === 'suspicion') {
      others.forEach(other => { trust(id, id, other, -10); trust(id, other, id, -5); }); mood(id, id, -3); stabilityChange -= 4;
      say(id, action, `${name} spread suspicion, weakening trust around town.`);
    }
  });
  // Public aid uses progressive equal shares, capped by each asker's actual need. No resident-order advantage.
  const requests = ids.filter(id => decisions[id] === 'ask');
  const needs = Object.fromEntries(requests.map(id => [id, Math.max(0, 3 - next.people[id].food)])) as Partial<Record<Id, number>>;
  const allocations = Object.fromEntries(requests.map(id => [id, 0])) as Partial<Record<Id, number>>;
  let available = next.town.food;
  let pending = requests.filter(id => (needs[id] || 0) > epsilon);
  while (pending.length && available > epsilon) {
    const share = Math.min(available / pending.length, ...pending.map(id => needs[id]! - allocations[id]!));
    pending.forEach(id => { allocations[id]! += share; }); available -= share * pending.length;
    pending = pending.filter(id => needs[id]! - allocations[id]! > epsilon);
  }
  requests.forEach(id => {
    const amount = allocations[id] || 0;
    next.people[id].food += amount; next.town.food -= amount;
    if (amount > epsilon) { mood(id, id, 6); aidActions++; stabilityChange += 1; say(id, 'ask', `${characters[id].name} received ${formatNumber(amount)} food from the public pantry.`); }
    else say(id, 'unfulfilled', `${characters[id].name} requested aid, but ${needs[id]! <= epsilon ? 'already had at least 3 food' : 'the public pantry was empty'}.`);
  });
  next.town.food = Math.max(0, next.town.food);
  let hungry = 0;
  const hungryResidents: Id[] = [];
  ids.forEach(id => {
    const eaten = Math.min(1, Math.max(0, next.people[id].food)), fed = eaten >= 1 - epsilon;
    next.people[id].food = Math.max(0, next.people[id].food - eaten);
    if (!fed) { hungry++; hungryResidents.push(id); }
    effect(id, 'dinner', `${characters[id].name} ate ${formatNumber(eaten)} food${fed ? '' : ' and remained hungry'}.`);
    mood(id, id, fed ? 4 : -12);
    next.people[id].recentActions = [...next.people[id].recentActions, decisions[id]].slice(-6);
  });
  // After the first day, the treasury gives equally sized emergency grants to hungry residents with <1 wealth.
  // Grants arrive after all actions, so they can fund trades only on a future day.
  if (world.day > 0) {
    const eligible = hungryResidents.filter(id => next.people[id].wealth < 1 - epsilon);
    const grant = eligible.length ? Math.min(1, next.town.wealth / eligible.length) : 0;
    if (grant > epsilon) {
      eligible.forEach(id => { next.people[id].wealth += grant; stabilityChange += 1; say(id, 'treasury-aid', `The town treasury paid ${formatNumber(grant)} wealth to ${characters[id].name} after a hungry dinner.`); });
      next.town.wealth = Math.max(0, next.town.wealth - grant * eligible.length);
    }
  }
  stabilityChange -= hungry * 4;
  next.town.stability = clamp(world.town.stability + stabilityChange);
  const stabilityDelta = next.town.stability - world.town.stability;
  const stats = metrics(next); next.town.trust = stats.trust; next.town.mood = stats.mood;
  const suspicious = ids.filter(id => decisions[id] === 'suspicion').length;
  const hoarders = ids.filter(id => decisions[id] === 'hoard').length;
  let outcome = 'Uneasy Peace', summary = `${hungry ? `${hungry} resident${hungry === 1 ? '' : 's'} went hungry` : 'Everyone ate dinner'}, with average trust at ${formatNumber(stats.trust)} and stability at ${formatNumber(next.town.stability)}.`;
  if (hungry >= 3) { outcome = 'Food Panic'; summary = `${hungry} of four residents lacked a full dinner. Food distribution is failing the town.`; }
  else if (suspicious >= 2 || stats.trust < 30) { outcome = 'Suspicion Wave'; summary = `${suspicious >= 2 ? `${suspicious} residents spread rumors` : `Average trust fell below 30 (${formatNumber(stats.trust)})`}. Relationships are fraying.`; }
  else if (hoarders >= 2 && cooperativeActions > 0 || stats.trust < 45 || next.town.stability < 35) { outcome = 'Divided Town'; summary = `${cooperativeActions} successful cooperative act${cooperativeActions === 1 ? '' : 's'}, ${hoarders} hoarder${hoarders === 1 ? '' : 's'}, and trust ${formatNumber(stats.trust)} / stability ${formatNumber(next.town.stability)} reveal a divided town.`; }
  else if (trades >= 2) { outcome = 'Trade Boom'; summary = `${trades} completed food-for-wealth trades kept the local market moving.`; }
  else if (aidActions >= 2) { outcome = 'Community Aid Chain'; summary = `${aidActions} successful sharing, support, or public-aid actions helped food reach neighbors.`; }
  else if (cooperativeActions >= 2 && hungry === 0) { outcome = 'Cooperative Village'; summary = `${cooperativeActions} successful cooperative acts and dinner for everyone strengthened the village.`; }
  next.town.outcome = outcome; next.town.summary = summary;
  notes.push(`${hungry} hungry after dinner. Stability ${stabilityDelta >= 0 ? '+' : ''}${formatNumber(stabilityDelta)}. ${summary}`);
  next.day++; next.lastDecisions = { ...decisions };
  next.history.push({ day: next.day, decisions: { ...decisions }, notes, effects, civic: { outcome, summary, cooperativeActions, hungry, stabilityDelta } });
  return next;
}

export function demoDecisions(world: World): Decisions {
  if (world.day === 0) return { bob: 'hoard', alice: 'share', kevin: 'suspicion', mia: 'trade' };
  return { bob: world.trust.alice.bob >= 55 ? 'cooperate' : 'influence', alice: world.people.alice.food < 1 && world.town.food > 0 ? 'ask' : world.trust.alice.bob >= 45 ? 'support' : 'hoard', kevin: world.trust.kevin.bob >= 50 ? 'cooperate' : 'suspicion', mia: world.trust.mia.bob >= 50 ? 'trade' : 'hoard' };
}
export function divergence(a: World, b: World) {
  let different = 0;
  const compare = (x: number, y: number) => { if (Math.abs(x - y) > .001) different++; };
  ids.forEach(id => { compare(a.people[id].food, b.people[id].food); compare(a.people[id].wealth, b.people[id].wealth); compare(a.people[id].mood, b.people[id].mood); ids.filter(x => x !== id).forEach(x => compare(a.trust[id][x], b.trust[id][x])); });
  compare(a.town.food, b.town.food); compare(a.town.wealth, b.town.wealth); compare(a.town.stability, b.town.stability);
  return { different, total: 27 };
}
export function civicChain(world: World): string[] {
  if (!world.history.length) return ['Bob has not made the pivotal decision yet.', 'The town’s future is still unwritten.'];
  const first = world.history[0];
  const bobAction = first.effects.find(effect => effect.actor === 'bob' && ['share', 'support', 'trade', 'hoard', 'influence', 'cooperate', 'ask', 'suspicion', 'unfulfilled'].includes(effect.kind));
  const bobTrust = first.effects.find(effect => effect.actor === 'bob' && effect.kind === 'trust');
  const later = world.history.slice(1).reduce((sum, event) => sum + event.civic.cooperativeActions, 0);
  return [bobAction?.description || `Bob chose ${first.decisions.bob}.`, ...(bobTrust ? [bobTrust.description] : []), `Later rounds recorded ${later} successful cooperative act${later === 1 ? '' : 's'}. This is an observation, not proof of causation.`, `${world.town.outcome}: ${world.town.summary}`];
}

/** Validates v2 saves; legacy saves are rebuilt from decisions under the new rules, never given invented AI receipts. */
export function migrateWorld(value: unknown): World | null {
  if (!value || typeof value !== 'object') return null;
  const w = value as World;
  if (!Number.isInteger(w.day) || w.day < 0 || w.day > 1000 || !Array.isArray(w.history) || w.history.length !== w.day || !w.history.every((event, i) => event && event.day === i + 1 && validDecisions(event.decisions))) return null;
  if (w.schemaVersion !== undefined && w.schemaVersion !== 2) return null;
  if (w.schemaVersion !== 2) {
    let replayed = initialWorld();
    for (const event of w.history) replayed = applyRound(replayed, event.decisions);
    return replayed;
  }
  const resource = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e9;
  const stat = (n: unknown) => resource(n) && (n as number) <= 100;
  if (!ids.every(id => {
    const p = w.people?.[id];
    return p && resource(p.food) && resource(p.wealth) && stat(p.mood) && typeof p.role === 'string' && Array.isArray(p.traits) && p.traits.every(t => typeof t === 'string') && Array.isArray(p.recentActions) && p.recentActions.length <= 6 && p.recentActions.every(action => actions.includes(action)) && ids.every(other => stat(w.trust?.[id]?.[other]));
  })) return null;
  if (!w.town || !resource(w.town.food) || !resource(w.town.wealth) || !stat(w.town.trust) || !stat(w.town.mood) || !stat(w.town.stability) || typeof w.town.outcome !== 'string' || typeof w.town.summary !== 'string') return null;
  if (w.day === 0 ? w.lastDecisions !== null : !validDecisions(w.lastDecisions) || !ids.every(id => w.lastDecisions![id] === w.history[w.day - 1].decisions[id])) return null;
  if (!w.history.every(event => Array.isArray(event.notes) && event.notes.every(note => typeof note === 'string') && Array.isArray(event.effects) && event.effects.every(effect => effect && ids.includes(effect.actor) && (effect.target === undefined || ids.includes(effect.target)) && typeof effect.kind === 'string' && typeof effect.description === 'string') && event.civic && typeof event.civic.outcome === 'string' && typeof event.civic.summary === 'string' && Number.isInteger(event.civic.cooperativeActions) && event.civic.cooperativeActions >= 0 && event.civic.cooperativeActions <= 4 && Number.isInteger(event.civic.hungry) && event.civic.hungry >= 0 && event.civic.hungry <= 4 && typeof event.civic.stabilityDelta === 'number' && Number.isFinite(event.civic.stabilityDelta) && Math.abs(event.civic.stabilityDelta) <= 100)) return null;
  const m = metrics(w);
  if (Math.abs(m.trust - w.town.trust) > epsilon || Math.abs(m.mood - w.town.mood) > epsilon) return null;
  return structuredClone(w);
}

export function isWorld(value: unknown): value is World {
  return !!value && typeof value === 'object' && (value as World).schemaVersion === 2 && migrateWorld(value) !== null;
}
