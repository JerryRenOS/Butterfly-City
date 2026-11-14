export const disasterTypes = ['tornado', 'tsunami', 'snowstorm'] as const;
export type DisasterType = typeof disasterTypes[number];
export type DisasterState = { type: DisasterType; damage: number };
export type DisasterRound = { intensity: number; forage: number; damageAdded: number; repaired: number; repairCost: number; damageAfter: number };

export const disasters: Record<DisasterType, {
  name: string; symbol: string; headline: string; description: string; initialDamage: number;
  impacts: readonly number[]; stormForage: number; activeLabel: string; repair: string;
}> = {
  tornado: {
    name: 'Tornado', symbol: '◎', headline: 'The wind took the roofs.',
    description: 'A funnel tore through the village. Clear debris, restore the paths, and share the supplies Bob rescued.',
    initialDamage: 56, impacts: [18, 8], stormForage: 1,
    activeLabel: 'Dangerous winds', repair: 'cleared debris and repaired roofs',
  },
  tsunami: {
    name: 'Tsunami', symbol: '≋', headline: 'The sea crossed the square.',
    description: 'A coastal surge flooded the valley. Drain the streets and rebuild the routes that bring food into town.',
    initialDamage: 70, impacts: [24, 12], stormForage: .5,
    activeLabel: 'Coastal flooding', repair: 'drained floodwater and restored paths',
  },
  snowstorm: {
    name: 'Snowstorm', symbol: '❄', headline: 'The village woke in white.',
    description: 'Deep snow has cut off the roads. Clear a way to the stores and keep your neighbors supplied through the cold.',
    initialDamage: 42, impacts: [10, 16, 10], stormForage: .5,
    activeLabel: 'Blizzard conditions', repair: 'cleared snow and restored access',
  },
};

/** Calendar-driven weather is identical across branches. Road access depends on each world's repairs. */
export function disasterConditions(disaster: DisasterState, day: number) {
  const scenario = disasters[disaster.type];
  const intensity = scenario.impacts[day] ?? 0;
  const forage = day === 0 ? 0 : intensity > 0 ? scenario.stormForage : disaster.damage >= 50 ? 1 : 2;
  return {
    intensity, forage,
    phase: intensity > 0 ? scenario.activeLabel : disaster.damage > 0 ? 'Recovery underway' : 'Village restored',
    access: intensity > 0 ? 'Weather limits gathering' : disaster.damage >= 50 ? 'Damaged routes limit gathering' : 'Supply routes open',
  };
}
