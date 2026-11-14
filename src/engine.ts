export const ids = ['bob', 'alice', 'kevin', 'mia'] as const;
export type Id = typeof ids[number];
export const actions = ['share', 'hoard', 'trade', 'influence'] as const;
export type Action = typeof actions[number];
export type Decisions = Record<Id, Action>;
export const characters: Record<Id, { name: string; personality: string; role: string; color: string }> = {
  bob: { name: 'Bob', role: 'Lovable troublemaker', personality: 'Mischievous, selfish opportunist. Loves a shortcut and wants to be liked, but usually puts his own belly first.', color: '#ee8552' },
  alice: { name: 'Alice', role: 'The big-hearted optimist', personality: 'Kindhearted idealist who shares freely, values fairness, and cooperates when others show kindness.', color: '#e995ad' },
  kevin: { name: 'Kevin', role: 'Resident overthinker', personality: 'Paranoid conspiracy theorist. Suspects pizza shortages are planned. Guards supplies unless trust is earned.', color: '#9d8ed4' },
  mia: { name: 'Mia', role: 'Small-town visionary', personality: 'Confident entrepreneur. Sees opportunities everywhere, prefers fair trades, and builds alliances with reliable neighbors.', color: '#57b6ab' },
};
export type RoundEvent = { day: number; decisions: Decisions; notes: string[] };
export type World = { day: number; people: Record<Id, { food: number; mood: number }>; trust: Record<Id, Record<Id, number>>; history: RoundEvent[]; lastDecisions: Decisions | null };
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function initialWorld(): World {
  return { day: 0, people: { bob: { food: 8, mood: 65 }, alice: { food: 0, mood: 72 }, kevin: { food: 0, mood: 42 }, mia: { food: 0, mood: 65 } }, trust: Object.fromEntries(ids.map(id => [id, Object.fromEntries(ids.map(other => [other, id === other ? 100 : 50]))])) as World['trust'], history: [], lastDecisions: null };
}
export const actionDescriptions: Record<Action, string> = {
  share: 'Share up to 3 food equally, one unit to each other resident; every recipient trusts you 14 more and gains 6 mood.',
  hoard: 'Keep your food. Each other resident trusts you 9 less. Gain 3 mood if you have food.',
  trade: 'Give one food to the next resident around the table. Gain 5 mood; both parties gain 7 trust in each other.',
  influence: 'Give one food to the next resident to build influence. They trust you 12 more; the others trust you 4 less. Gain 7 mood.',
};
export function validDecisions(value: unknown): value is Decisions {
  return !!value && typeof value === 'object' && ids.every(id => actions.includes((value as Decisions)[id]));
}
export function applyRound(world: World, decisions: Decisions): World {
  if (!validDecisions(decisions)) throw new Error('A round requires four valid decisions.');
  const next = structuredClone(world);
  const notes: string[] = [];
  // The same external event occurs in both branches: two foraged food per citizen after day one.
  if (world.day > 0) { ids.forEach(id => { next.people[id].food += 2; }); notes.push('Everyone foraged 2 food. Same weather, same harvest in both worlds.'); }
  // Budgets are snapshotted: gifts received this round cannot be given away again this round.
  const budgets = Object.fromEntries(ids.map(id => [id, next.people[id].food])) as Record<Id, number>;
  ids.forEach((id, index) => {
    const name = characters[id].name, others = ids.filter(other => other !== id), action = decisions[id];
    const give = (other: Id, amount: number) => { next.people[id].food -= amount; next.people[other].food += amount; };
    if (action === 'share') {
      const amount = Math.min(3, budgets[id]);
      if (amount > 0) {
        others.forEach(other => { give(other, amount / 3); next.trust[other][id] += 14; next.people[other].mood += 6; });
        next.people[id].mood += 5;
        notes.push(`${name} shared ${formatNumber(amount)} food. Every neighbor's trust in ${name} rose by 14.`);
      } else notes.push(`${name} wanted to share, but had no food to give.`);
    } else if (action === 'hoard') {
      others.forEach(other => { next.trust[other][id] -= 9; });
      if (budgets[id] > 0) next.people[id].mood += 3;
      notes.push(`${name} kept supplies private. Each neighbor's trust in ${name} fell by 9.`);
    } else {
      const other = ids[(index + 1) % ids.length];
      if (budgets[id] >= 1) {
        give(other, 1);
        if (action === 'trade') { next.trust[other][id] += 7; next.trust[id][other] += 7; next.people[id].mood += 5; notes.push(`${name} traded 1 food for ${characters[other].name}'s goodwill. Mutual trust rose by 7.`); }
        else { next.trust[other][id] += 12; others.filter(x => x !== other).forEach(x => { next.trust[x][id] -= 4; }); next.people[id].mood += 7; notes.push(`${name} gave ${characters[other].name} 1 food for influence: +12 trust from them, −4 from the others.`); }
      } else notes.push(`${name} tried to ${action}, but had no food to offer.`);
    }
  });
  ids.forEach(id => {
    const fed = next.people[id].food >= 1;
    next.people[id].food = Math.max(0, Math.min(100, next.people[id].food - 1));
    next.people[id].mood = clamp(next.people[id].mood + (fed ? 4 : -12));
    ids.forEach(other => { next.trust[id][other] = clamp(next.trust[id][other]); });
  });
  notes.push('Dinner costs 1 food each. A full belly adds 4 mood; hunger costs 12 mood.');
  next.day += 1; next.lastDecisions = { ...decisions };
  next.history.push({ day: next.day, decisions: { ...decisions }, notes });
  return next;
}
export function demoDecisions(world: World): Decisions {
  return {
    bob: world.day === 0 ? 'hoard' : world.trust.alice.bob >= 55 ? 'share' : 'influence',
    alice: world.trust.alice.bob >= 45 ? 'share' : 'hoard',
    kevin: world.trust.kevin.bob >= 60 ? 'trade' : 'hoard',
    mia: world.trust.mia.bob >= 50 ? 'trade' : 'influence',
  };
}
export function metrics(world: World) {
  return { food: ids.reduce((sum, id) => sum + world.people[id].food, 0), mood: ids.reduce((sum, id) => sum + world.people[id].mood, 0) / 4, trust: ids.reduce((sum, id) => sum + ids.filter(x => x !== id).reduce((n, x) => n + world.trust[id][x], 0), 0) / 12 };
}
export function formatNumber(n: number) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }
export function divergence(a: World, b: World) {
  let different = 0;
  ids.forEach(id => { if (Math.abs(a.people[id].food - b.people[id].food) > .001) different++; if (a.people[id].mood !== b.people[id].mood) different++; ids.filter(x => x !== id).forEach(x => { if (a.trust[id][x] !== b.trust[id][x]) different++; }); });
  return { different, total: 20 };
}
