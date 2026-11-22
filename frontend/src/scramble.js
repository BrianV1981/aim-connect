import { useCallback, useEffect, useRef, useState } from 'react';

export const SCRAMBLE_CHARS = '01ABCDEF/>_#$%&*+=?AIM';

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
      step += 0.9;
      const done = Math.floor(step);
      if (done >= text.length) {
        setDisplay(text);
        clearInterval(timerRef.current);
        timerRef.current = null;
        return;
      }
      const next = text
        .split('')
        .map((ch, idx) =>
          ch === ' '
            ? ' '
            : idx < done
            ? ch
            : SCRAMBLE_CHARS[(idx * 11 + done * 5) % SCRAMBLE_CHARS.length]
        )
        .join('');
      setDisplay(next);
    }, 20);
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
