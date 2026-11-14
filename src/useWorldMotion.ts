import { useEffect, useState } from 'react';

type MotionPreference = 'auto' | 'on' | 'off';
const storageKey = 'butterfly-city-scenery-motion';

export function useWorldMotion() {
  const [preference, setPreference] = useState<MotionPreference>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'on' || saved === 'off' ? saved : 'auto';
    } catch { return 'auto'; }
  });
  const [systemReduced, setSystemReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    // An explicit Play scenery click can opt into motion even when the OS defaults to reduced motion.
    document.documentElement.dataset.worldMotion = preference;
    return () => { delete document.documentElement.dataset.worldMotion; };
  }, [preference]);
  const enabled = preference === 'on' || preference === 'auto' && !systemReduced;
  function toggle() {
    const next = enabled ? 'off' : 'on';
    setPreference(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Session-only preference when storage is unavailable. */ }
  }
  return { enabled, toggle, systemReduced: preference === 'auto' && systemReduced };
}
