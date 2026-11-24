import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MATRIX_SCRAMBLE_STEP,
  MATRIX_SCRAMBLE_TICK_MS,
  SCRAMBLE_CHARS,
  attachGlobalStandaloneButtonScrambles,
  computeScrambleFrame,
  isStandaloneScrambleCandidate,
} from './scrambleUtils';

export {
  SCRAMBLE_CHARS,
  MATRIX_SCRAMBLE_TICK_MS,
  MATRIX_SCRAMBLE_STEP,
  computeScrambleFrame,
  isStandaloneScrambleCandidate,
};

/**
 * React hook driving explicit Matrix Character Scramble hover state on a text label.
 */
export function useMatrixScramble(text) {
  const [display, setDisplay] = useState(text);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplay(text);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  const triggerScramble = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let step = 0;
    timerRef.current = setInterval(() => {
      step += MATRIX_SCRAMBLE_STEP;
      const done = Math.floor(step);
      if (done >= text.length) {
        setDisplay(text);
        clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      setDisplay(computeScrambleFrame(text, done));
    }, MATRIX_SCRAMBLE_TICK_MS);
  }, [text]);

  const resetScramble = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplay(text);
  }, [text]);

  return { display, triggerScramble, resetScramble };
}

/**
 * React hook mounting delegated Matrix Scramble listeners for standalone UI buttons across the cockpit.
 */
export function useStandaloneButtonScrambles(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    return attachGlobalStandaloneButtonScrambles(document);
  }, [enabled]);
}
