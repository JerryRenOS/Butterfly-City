import { ids, type Id } from './engine.js';
import type { ScenePoint } from './sceneDynamics.js';

export type CharacterFacing = 'front' | 'right' | 'left' | 'back-right' | 'back-left';
export type FacingTargets = Partial<Record<Id, Id | ScenePoint>>;
export type CharacterMotion = ScenePoint & {
  facing: CharacterFacing;
  moving: boolean;
  walkFrame: 0 | 1 | 2 | 3;
  arrived: boolean;
  /** Actual ground speed in scene units per second. */
  speed: number;
  /** Nearer feet have a larger depth, for scale and draw order. */
  depth: number;
  turnProgress: number;
  /** True once an idle conversational turn has finished. */
  facingReady: boolean;
};
export type CharacterMotionView = Record<Id, CharacterMotion>;
export const WALK_BOUNDS = { left: 8, right: 92, top: 70, bottom: 92 } as const;
export const PERSONAL_SPACE = 6.4;
const DEPTH_SCALE = 1.35;
const ACCELERATION = 37;
const BRAKING = 31;
const STRIDE: Record<Id, number> = { bob: 7.7, alice: 7.1, kevin: 7.4, mia: 8 };
const PACE: Record<Id, number> = { bob: 13.3, alice: 12.7, kevin: 12.1, mia: 14.1 };

type ActorMotion = CharacterMotion & {
  target: ScenePoint;
  route: ScenePoint[];
  waypoint: number;
  heading: number;
  turnRemaining: number;
  turnDuration: number;
  pace: number;
  distanceWalked: number;
};
export type CharacterMotionState = { actors: Record<Id, ActorMotion>; targets: Record<Id, ScenePoint> };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const point = (p: ScenePoint): ScenePoint => ({
  x: clamp(p.x, WALK_BOUNDS.left, WALK_BOUNDS.right),
  y: clamp(p.y, WALK_BOUNDS.top, WALK_BOUNDS.bottom),
});
const distance = (a: ScenePoint, b: ScenePoint) => Math.hypot(b.x - a.x, b.y - a.y);
export const personalDistance = (a: ScenePoint, b: ScenePoint) => Math.hypot(b.x - a.x, (b.y - a.y) * DEPTH_SCALE);
const samePoint = (a: ScenePoint, b: ScenePoint) => distance(a, b) < 0.001;
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const headingTo = (a: ScenePoint, b: ScenePoint) => Math.atan2((b.y - a.y) * DEPTH_SCALE, b.x - a.x);
const depthAt = (y: number) => clamp((y - WALK_BOUNDS.top) / (WALK_BOUNDS.bottom - WALK_BOUNDS.top), 0, 1);

export function facingForDirection(dx: number, dy: number, previous: CharacterFacing = 'front'): CharacterFacing {
  if (Math.hypot(dx, dy) < 0.01) return previous;
  if (dy < -0.15 && -dy > Math.abs(dx) * 0.4) return dx < -0.05 ? 'back-left' : 'back-right';
  if (dy > Math.abs(dx) * 1.7) return 'front';
  return dx < 0 ? 'left' : 'right';
}

/** One full gait cycle is a character's stride distance, never an elapsed-time loop. */
export function walkFrameForDistance(id: Id, distanceWalked: number): 0 | 1 | 2 | 3 {
  return (Math.floor(Math.max(0, distanceWalked) / STRIDE[id] * 4) % 4) as 0 | 1 | 2 | 3;
}

/** Keep a queue at a busy destination instead of putting several bodies on one point. */
export function resolveMotionTargets(targets: Record<Id, ScenePoint>): Record<Id, ScenePoint> {
  const resolved = {} as Record<Id, ScenePoint>;
  const placed: ScenePoint[] = [];
  ids.forEach((id, index) => {
    const desired = point(targets[id]);
    let chosen = desired;
    let found = placed.every(other => personalDistance(desired, other) >= PERSONAL_SPACE + 0.2);
    // Candidate order is stable, including at ground edges and on repeated re-renders.
    for (let ring = 1; !found && ring <= 15; ring++) {
      const candidates = Array.from({ length: 24 }, (_, direction) => {
        const angle = direction * Math.PI / 12 + index * Math.PI / 2;
        return point({ x: desired.x + Math.cos(angle) * ring * 2.4, y: desired.y + Math.sin(angle) * ring * 2.4 / DEPTH_SCALE });
      }).sort((a, b) => distance(a, desired) - distance(b, desired));
      const clear = candidates.find(candidate => placed.every(other => personalDistance(candidate, other) >= PERSONAL_SPACE + 0.2));
      if (clear) { chosen = clear; found = true; }
    }
    resolved[id] = chosen;
    placed.push(chosen);
  });
  return resolved;
}

/** A shallow quadratic bend keeps short errands from looking like rigid translation. */
export function characterRoute(id: Id, from: ScenePoint, to: ScenePoint): ScenePoint[] {
  const start = point(from), end = point(to);
  const dx = end.x - start.x, dy = (end.y - start.y) * DEPTH_SCALE;
  const length = Math.hypot(dx, dy);
  if (length < 0.01) return [end];
  const bend = Math.min(6, length * 0.17) * (ids.indexOf(id) % 2 ? -1 : 1);
  const control = point({ x: (start.x + end.x) / 2 - dy / length * bend, y: (start.y + end.y) / 2 + dx / length * bend / DEPTH_SCALE });
  const count = Math.max(2, Math.ceil(length / 3));
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 1) / count, s = 1 - t;
    return point({ x: s * s * start.x + 2 * s * t * control.x + t * t * end.x, y: s * s * start.y + 2 * s * t * control.y + t * t * end.y });
  });
}

export function createCharacterMotion(initial: Record<Id, ScenePoint>): CharacterMotionState {
  const positions = resolveMotionTargets(initial);
  const actors = Object.fromEntries(ids.map(id => {
    const p = positions[id];
    return [id, {
      ...p, facing: 'front', moving: false, walkFrame: 0, arrived: true, speed: 0,
      depth: depthAt(p.y), turnProgress: 1, facingReady: true, target: { ...p }, route: [{ ...p }], waypoint: 0,
      heading: Math.PI / 2, turnRemaining: 0, turnDuration: 0, pace: 0, distanceWalked: 0,
    }];
  })) as Record<Id, ActorMotion>;
  return { actors, targets: positions };
}

/** Retarget from the current foot position; it never replays from an old origin. */
export function retargetCharacterMotion(state: CharacterMotionState, requested: Record<Id, ScenePoint>): CharacterMotionState {
  const targets = resolveMotionTargets(requested);
  let changed = false;
  const actors = { ...state.actors };
  ids.forEach(id => {
    const actor = state.actors[id], target = targets[id];
    if (samePoint(target, actor.target)) return;
    changed = true;
    const route = characterRoute(id, actor, target);
    const turnAngle = Math.abs(angleDelta(actor.heading, headingTo(actor, route[0])));
    const turnDuration = clamp(turnAngle / 7, 0.1, 0.32);
    actors[id] = { ...actor, target, route, waypoint: 0, arrived: false, moving: false, speed: 0,
      pace: 0, turnRemaining: turnDuration, turnDuration, turnProgress: 0 };
  });
  return changed ? { actors, targets } : state;
}

function turnToward(actor: ActorMotion, heading: number, dt: number) {
  actor.heading += clamp(angleDelta(actor.heading, heading), -dt * 8.5, dt * 8.5);
  actor.facing = facingForDirection(Math.cos(actor.heading), Math.sin(actor.heading), actor.facing);
}

function facePartner(actor: ActorMotion, id: Id, actors: Record<Id, ActorMotion>, facingTargets: FacingTargets, dt: number) {
  const focus = facingTargets[id];
  const destination = typeof focus === 'string' ? actors[focus] : focus;
  actor.facingReady = true;
  if (destination && distance(actor, destination) > 0.1) {
    const desired = headingTo(actor, destination);
    turnToward(actor, desired, dt);
    actor.facingReady = Math.abs(angleDelta(actor.heading, desired)) < 0.08;
    actor.turnProgress = 1 - Math.min(1, Math.abs(angleDelta(actor.heading, desired)) / Math.PI);
  }
}

/** Mark a new conversation turn as pending before the next animation frame. */
export function refreshCharacterFacing(state: CharacterMotionState, facingTargets: FacingTargets = {}): CharacterMotionState {
  const actors = Object.fromEntries(ids.map(id => [id, { ...state.actors[id] }])) as Record<Id, ActorMotion>;
  ids.forEach(id => {
    if (actors[id].arrived) facePartner(actors[id], id, actors, facingTargets, 0);
    else actors[id].facingReady = false;
  });
  return { actors, targets: state.targets };
}

function advance(state: CharacterMotionState, dt: number, facingTargets: FacingTargets): CharacterMotionState {
  const actors = Object.fromEntries(ids.map(id => [id, { ...state.actors[id] }])) as Record<Id, ActorMotion>;
  const velocities = {} as Record<Id, ScenePoint>;
  ids.forEach(id => {
    const actor = actors[id];
    const remaining = personalDistance(actor, actor.target);
    if (actor.arrived && remaining < 0.2) {
      actor.pace = 0;
      actor.moving = false;
      actor.speed = 0;
      facePartner(actor, id, actors, facingTargets, dt);
      velocities[id] = { x: 0, y: 0 };
      return;
    }
    actor.arrived = false;
    actor.facingReady = false;
    while (actor.waypoint < actor.route.length - 1) {
      const here = actor.route[actor.waypoint], following = actor.route[actor.waypoint + 1];
      // A sidestep may carry a walker past a waypoint without crossing its tiny
      // arrival radius. Move on rather than orbiting that obsolete point.
      const passed = (actor.x - here.x) * (following.x - here.x) +
        (actor.y - here.y) * (following.y - here.y) * DEPTH_SCALE * DEPTH_SCALE > 0;
      const occupied = ids.some(otherId => otherId !== id && actors[otherId].arrived &&
        personalDistance(here, actors[otherId]) < PERSONAL_SPACE + 0.8);
      if (personalDistance(actor, here) >= 2.1 && !passed && !occupied) break;
      actor.waypoint++;
    }
    const waypoint = actor.route[actor.waypoint];
    const desiredHeading = headingTo(actor, waypoint);
    turnToward(actor, desiredHeading, dt);
    if (actor.turnRemaining > 0) {
      actor.turnRemaining = Math.max(0, actor.turnRemaining - dt);
      actor.turnProgress = 1 - actor.turnRemaining / actor.turnDuration;
      actor.moving = false;
      actor.speed = 0;
      velocities[id] = { x: 0, y: 0 };
      return;
    }
    actor.turnProgress = 1;
    const wantedSpeed = Math.min(PACE[id], Math.sqrt(2 * BRAKING * remaining));
    actor.pace += clamp(wantedSpeed - actor.pace, -BRAKING * dt, ACCELERATION * dt);
    const dx = waypoint.x - actor.x, dy = (waypoint.y - actor.y) * DEPTH_SCALE;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const stepSpeed = Math.min(actor.pace, remaining / dt);
    velocities[id] = { x: dx / length * stepSpeed, y: dy / length * stepSpeed };
  });

  // Anticipate crossings and pass on the right before a hard collision occurs.
  const preferred = Object.fromEntries(ids.map(id => [id, { ...velocities[id] }])) as Record<Id, ScenePoint>;
  ids.forEach(id => {
    if (actors[id].arrived || actors[id].turnRemaining > 0 || actors[id].pace < 0.1) return;
    const actor = actors[id], velocity = velocities[id];
    // Resolved standing positions already have clearance. Ease out anticipatory
    // steering during the final foot placement so neighbors can form a small group.
    const approach = clamp((personalDistance(actor, actor.target) - 0.12) / 3, 0, 1);
    ids.forEach(otherId => {
      if (otherId === id) return;
      const other = actors[otherId];
      const dx = other.x - actor.x, dy = (other.y - actor.y) * DEPTH_SCALE;
      const gap = Math.max(0.001, Math.hypot(dx, dy));
      if (gap > PERSONAL_SPACE + 9) return;
      const rvx = preferred[id].x - preferred[otherId].x, rvy = preferred[id].y - preferred[otherId].y;
      const closing = (dx * rvx + dy * rvy) / gap;
      const t = clamp((dx * rvx + dy * rvy) / Math.max(0.01, rvx * rvx + rvy * rvy), 0, 0.65);
      const predictedGap = Math.hypot(dx - rvx * t, dy - rvy * t);
      if (closing > 0.2 && predictedGap < PERSONAL_SPACE + 0.8) {
        const urgency = clamp((PERSONAL_SPACE + 9 - gap) / 9, 0, 1);
        const sidestep = PACE[id] * 0.85 * urgency * approach;
        let sideX = -dy / gap, sideY = dx / gap;
        // For a standing neighbor, take the side that advances toward the errand.
        // Consistent right-hand passing remains appropriate for two walkers.
        if (other.arrived && sideX * preferred[id].x + sideY * preferred[id].y < -0.01) {
          sideX *= -1; sideY *= -1;
        }
        const trial = { x: actor.x + sideX * 6, y: actor.y + sideY * 6 / DEPTH_SCALE };
        const clipped = point(trial);
        if (distance(trial, clipped) > 0.5) { sideX *= -1; sideY *= -1; }
        velocity.x += sideX * sidestep;
        velocity.y += sideY * sidestep;
        const brake = 1 - 0.32 * urgency * approach;
        velocity.x *= brake;
        velocity.y *= brake;
      }
      if (gap < PERSONAL_SPACE + 0.45) {
        const pressure = (PERSONAL_SPACE + 0.45 - gap) * 9 * approach;
        velocity.x -= dx / gap * pressure;
        velocity.y -= dy / gap * pressure;
      }
    });
    const length = Math.hypot(velocity.x, velocity.y);
    if (length > PACE[id]) { velocity.x *= PACE[id] / length; velocity.y *= PACE[id] / length; }
  });

  ids.forEach(id => {
    const actor = actors[id], velocity = velocities[id];
    const next = point({ x: actor.x + velocity.x * dt, y: actor.y + velocity.y * dt / DEPTH_SCALE });
    actor.x = next.x; actor.y = next.y;
  });
  // Enforce personal space after steering. A walker gives way to someone already standing.
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = actors[ids[i]], b = actors[ids[j]];
      let dx = b.x - a.x, dy = (b.y - a.y) * DEPTH_SCALE;
      let gap = Math.hypot(dx, dy);
      if (gap >= PERSONAL_SPACE) continue;
      if (gap < 0.001) { dx = 1; dy = 0; gap = 1; }
      const overlap = PERSONAL_SPACE - gap + 0.001;
      const aStanding = a.arrived || a.turnRemaining > 0, bStanding = b.arrived || b.turnRemaining > 0;
      const aWeight = aStanding ? (bStanding ? 0.5 : 0) : (bStanding ? 1 : 0.5);
      const nextA = point({ x: a.x - dx / gap * overlap * aWeight, y: a.y - dy / gap * overlap * aWeight / DEPTH_SCALE });
      const nextB = point({ x: b.x + dx / gap * overlap * (1 - aWeight), y: b.y + dy / gap * overlap * (1 - aWeight) / DEPTH_SCALE });
      a.x = nextA.x; a.y = nextA.y; b.x = nextB.x; b.y = nextB.y;
    }
  }
  ids.forEach(id => {
    const actor = actors[id], before = state.actors[id];
    const walked = distance(actor, before);
    actor.speed = walked / dt;
    actor.moving = walked > 0.0005;
    actor.distanceWalked += walked;
    actor.walkFrame = walkFrameForDistance(id, actor.distanceWalked);
    actor.depth = depthAt(actor.y);
    if (actor.moving) turnToward(actor, headingTo(before, actor), dt);
    if (personalDistance(actor, actor.target) < 0.13 && actor.turnRemaining === 0) {
      actor.arrived = true;
      actor.moving = false;
      actor.speed = 0;
      actor.pace = 0;
      facePartner(actor, id, actors, facingTargets, dt);
    }
  });
  return { actors, targets: state.targets };
}

/** Fixed-size integration keeps crossing and gait behavior stable at different render rates. */
export function stepCharacterMotion(state: CharacterMotionState, elapsedSeconds: number, facingTargets: FacingTargets = {}): CharacterMotionState {
  let remaining = clamp(elapsedSeconds, 0, 0.1), next = state;
  while (remaining > 0.00001) {
    const dt = Math.min(1 / 60, remaining);
    next = advance(next, dt, facingTargets);
    remaining -= dt;
  }
  return next;
}

export function characterMotionView(state: CharacterMotionState): CharacterMotionView {
  return Object.fromEntries(ids.map(id => {
    const { x, y, facing, moving, walkFrame, arrived, speed, depth, turnProgress, facingReady } = state.actors[id];
    return [id, { x, y, facing, moving, walkFrame, arrived, speed, depth, turnProgress, facingReady }];
  })) as CharacterMotionView;
}

/** Reduced motion retains the final positions and orientation without running animation. */
export function settleCharacterMotion(state: CharacterMotionState, targets: Record<Id, ScenePoint>, facingTargets: FacingTargets = {}): CharacterMotionState {
  const settled = createCharacterMotion(targets);
  ids.forEach(id => {
    settled.actors[id].facing = state.actors[id].facing;
    settled.actors[id].heading = state.actors[id].heading;
    facePartner(settled.actors[id], id, settled.actors, facingTargets, 1);
  });
  return settled;
}
