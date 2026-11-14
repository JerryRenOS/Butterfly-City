import { disasterConditions, disasters, type DisasterState } from './disasters';

/** Rendering parameters only: these never alter damage, food, or the shared weather calendar. */
export function weatherVisuals(disaster: DisasterState, day: number) {
  const intensity = disasterConditions(disaster, day).intensity;
  const strength = Math.max(0, Math.min(1, intensity / Math.max(...disasters[disaster.type].impacts)));
  const damage = Math.max(0, Math.min(1, disaster.damage / 100));
  return {
    type: disaster.type, active: intensity > 0, strength, damage,
    wind: intensity > 0 ? .55 + strength * .85 : .12,
    waterDepth: disaster.type === 'tsunami' ? Math.max(intensity > 0 ? .18 : 0, damage * .37) : 0,
    snowCover: disaster.type === 'snowstorm' ? Math.sqrt(damage) : 0,
  };
}
export type WeatherVisuals = ReturnType<typeof weatherVisuals>;

/** Stable particles prevent flicker or different weather seeds between the two timelines. */
export function weatherRandom(index: number, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7 + 17.13) * 43758.5453;
  return value - Math.floor(value);
}
export const wrap = (value: number, size: number) => ((value % size) + size) % size;
