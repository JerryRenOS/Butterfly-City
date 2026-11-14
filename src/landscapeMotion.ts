import { disasterConditions, type DisasterState } from './disasters';

export type LandscapeMotionProfile = { wind: number; speed: number; cloudSpeed: number };
export function landscapeMotionProfile(disaster: DisasterState, day: number): LandscapeMotionProfile {
  const active = disasterConditions(disaster, day).intensity > 0;
  if (!active) return { wind: .46, speed: .8, cloudSpeed: .7 };
  return disaster.type === 'tornado' ? { wind: 1.65, speed: 1.8, cloudSpeed: 1.8 }
    : disaster.type === 'snowstorm' ? { wind: 1.2, speed: 1.35, cloudSpeed: 1.3 }
      : { wind: 1.05, speed: 1.15, cloudSpeed: 1.1 };
}

/** Matches object-fit: cover; object-position: center 65%, in top-left texture coordinates. */
export function landscapeCover(width: number, height: number, imageWidth: number, imageHeight: number) {
  if (![width, height, imageWidth, imageHeight].every(n => Number.isFinite(n) && n > 0)) return { scale: [1, 1] as const, offset: [0, 0] as const };
  const zoom = Math.max(width / imageWidth, height / imageHeight);
  const sx = Math.min(1, width / (imageWidth * zoom)), sy = Math.min(1, height / (imageHeight * zoom));
  return { scale: [sx, sy] as const, offset: [(1 - sx) * .5, (1 - sy) * .65] as const };
}

// The painted assets share these landmarks. Masks stay in image space, so responsive crops
// cannot move a tree's animation onto a door or across the cobblestone square.
export const foliageRegions = [
  [.21, .045, .32, .235], // overhead branches
  [.325, .308, .15, .14], // wisteria and ivy over the market
  [.793, .378, .11, .16], // climbing roses beside the oven
  [.055, .802, .13, .18], // foreground hydrangeas
  [.945, .855, .17, .20], // foreground lavender and grasses
  [.61, .558, .09, .085], // potted plants along the low wall
] as const;
export const fabricRegions = [
  [.453, .361, .102, .031], // bakery awning
  [.275, .431, .081, .032], // market awning
] as const;

export function regionWeight(x: number, y: number, region: readonly number[]) {
  const d = Math.hypot((x - region[0]) / region[2], (y - region[1]) / region[3]);
  const u = Math.max(0, Math.min(1, (d - .56) / .44));
  return 1 - u * u * (3 - 2 * u);
}

/** Used for inspection/tests; the renderer also gates foliage by painted leaf colour. */
export function landscapeRegionWeights(x: number, y: number) {
  return {
    foliage: Math.max(...foliageRegions.map(region => regionWeight(x, y, region))),
    fabric: Math.max(...fabricRegions.map(region => regionWeight(x, y, region))),
  };
}
