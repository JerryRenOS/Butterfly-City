import { useEffect, useRef, useState } from 'react';
import type { Id } from './engine.js';
import type { ScenePoint } from './sceneDynamics.js';
import {
  characterMotionView, createCharacterMotion, refreshCharacterFacing, retargetCharacterMotion, settleCharacterMotion,
  stepCharacterMotion, type CharacterMotionView, type FacingTargets,
} from './characterMotion.js';

export type CharacterMotionOptions = {
  targets: Record<Id, ScenePoint>;
  initial: Record<Id, ScenePoint>;
  facingTargets?: FacingTargets;
  enabled: boolean;
  paused: boolean;
};

/** Rendering animation only: this hook has no access to, or effects on, simulation state. */
export function useCharacterMotion(options: CharacterMotionOptions): CharacterMotionView {
  const latest = useRef(options);
  const motion = useRef(createCharacterMotion(options.initial));
  const [view, setView] = useState(() => characterMotionView(motion.current));
  const appliedKeys = useRef({ targets: JSON.stringify(options.initial), facing: '{}' });
  latest.current = options;
  // Coordinates often come from freshly-created scene plans. Depend on their values,
  // not object identity, so ordinary speech/UI renders do not restart a walk.
  const targetKey = JSON.stringify(options.targets);
  const facingKey = JSON.stringify(options.facingTargets ?? {});

  useEffect(() => {
    if (options.paused) {
      const frozen = characterMotionView(motion.current);
      Object.values(frozen).forEach(actor => { actor.moving = false; actor.speed = 0; });
      setView(frozen);
      return;
    }
    if (!options.enabled) {
      motion.current = settleCharacterMotion(motion.current, latest.current.targets, latest.current.facingTargets);
    } else {
      motion.current = retargetCharacterMotion(motion.current, latest.current.targets);
      motion.current = refreshCharacterFacing(motion.current, latest.current.facingTargets);
    }
    appliedKeys.current = { targets: targetKey, facing: facingKey };
    setView(characterMotionView(motion.current));
  }, [targetKey, facingKey, options.enabled, options.paused]);

  useEffect(() => {
    if (!options.enabled || options.paused) return;
    let frame = 0, last = 0, accumulated = 0;
    const tick = (timestamp: number) => {
      if (document.hidden) return;
      if (last) accumulated += Math.min(0.1, (timestamp - last) / 1000);
      last = timestamp;
      // Frame-independent integration, at most thirty React state updates a second.
      if (accumulated >= 1 / 30) {
        motion.current = stepCharacterMotion(motion.current, accumulated, latest.current.facingTargets);
        accumulated = 0;
        setView(characterMotionView(motion.current));
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      last = 0; accumulated = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [options.enabled, options.paused]);

  // A parent's readiness effect runs in the same commit as our retarget effect.
  // Never report the previous destination as ready during that first new render.
  const pendingTarget = appliedKeys.current.targets !== targetKey;
  const pendingFacing = appliedKeys.current.facing !== facingKey;
  if (pendingTarget || pendingFacing) {
    return Object.fromEntries(Object.entries(view).map(([id, actor]) => [id, {
      ...actor, arrived: actor.arrived && !pendingTarget, facingReady: false,
    }])) as CharacterMotionView;
  }
  return view;
}
