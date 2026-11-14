import { useCallback, useEffect, useRef, useState } from 'react';
import type { DialogueLine } from './characterDialogue';

const storageKey = 'butterfly-city-voices-muted';
export type SpokenLine = DialogueLine & { scope: string; turnId: string; status: 'approaching' | 'loading' | 'speaking' };

/** One queue for the whole app: worlds can take turns, never talk over each other. */
export function useCharacterSpeech() {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const mutedRef = useRef(muted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generation = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReady = useRef<{ turnId: string; begin: () => void } | null>(null);
  const mounted = useRef(true);
  const [current, setCurrent] = useState<SpokenLine | null>(null);
  const [error, setError] = useState('');

  const release = useCallback(() => {
    if (timeout.current !== null) clearTimeout(timeout.current);
    timeout.current = null;
    pendingReady.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null; audio.onerror = null; audio.onplaying = null;
      audio.pause(); audio.removeAttribute('src'); audio.load();
      audioRef.current = null;
    }
  }, []);
  const stop = useCallback(() => {
    generation.current++;
    release();
    if (mounted.current) setCurrent(null);
  }, [release]);
  const rememberMute = useCallback((value: boolean) => {
    mutedRef.current = value; setMuted(value);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Audio still works without storage. */ }
  }, []);
  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    rememberMute(next); stop(); setError('');
  }, [rememberMute, stop]);

  // Only the scene which has placed this exact pair may release the audio.
  // Clearing before calling begin also makes duplicate arrival notifications harmless.
  const ready = useCallback((turnId: string) => {
    const pending = pendingReady.current;
    if (!pending || pending.turnId !== turnId) return;
    pendingReady.current = null;
    pending.begin();
  }, []);

  const speak = useCallback((lines: readonly DialogueLine[], scope: string, explicit = false) => {
    // Automatic narration reads the latest preference even if a model response arrived asynchronously.
    if (!mounted.current || typeof Audio === 'undefined' || document.hidden || (!explicit && mutedRef.current)) return;
    if (explicit) rememberMute(false);
    stop(); setError('');
    const token = generation.current;
    let index = 0;
    const fail = (message: string) => {
      if (token !== generation.current || !mounted.current) return;
      stop(); setError(message);
    };
    const next = () => {
      if (token !== generation.current || mutedRef.current || !mounted.current) return;
      release();
      const line = lines[index++];
      if (!line) { setCurrent(null); return; }
      const turnId = `${token}:${index}`;
      const staged = { ...line, scope, turnId };
      pendingReady.current = { turnId, begin: () => {
        if (token !== generation.current || mutedRef.current || !mounted.current || document.hidden) return;
        if (timeout.current !== null) clearTimeout(timeout.current);
        const audio = new Audio(line.src);
        audioRef.current = audio;
        audio.preload = 'auto'; audio.volume = .85;
        setCurrent({ ...staged, status: 'loading' });
        timeout.current = setTimeout(() => fail('This voice is taking too long to load. Tap Hear neighbors to retry.'), 15000);
        audio.onplaying = () => {
          if (token !== generation.current || audioRef.current !== audio) return;
          if (timeout.current !== null) clearTimeout(timeout.current);
          timeout.current = null;
          setCurrent({ ...staged, status: 'speaking' });
        };
        audio.onended = () => { if (audioRef.current === audio) next(); };
        audio.onerror = () => fail('This voice could not be played. Tap Hear neighbors to retry.');
        void audio.play().catch(reason => {
          if (token !== generation.current || audioRef.current !== audio) return;
          fail(reason?.name === 'NotAllowedError' ? 'Your browser needs a tap to start voices. Choose Hear neighbors or replay a character’s voice.' : 'This voice could not be played. Tap Hear neighbors to retry.');
        });
      } };
      setCurrent({ ...staged, status: 'approaching' });
      timeout.current = setTimeout(() => fail('The neighbors could not meet just now. Tap Hear neighbors to try again.'), 12000);
    };
    next();
  }, [release, rememberMute, stop]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false; generation.current++; release();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [release, stop]);

  return { muted, current, error, speak, ready, stop, toggleMuted, clearError: () => setError('') };
}
