import { useCallback, useRef, useState } from 'react';

const KEY = 'gem-best';

function load() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

/** 최고 점수를 localStorage에 보관 (PRD F-12). 저장소를 못 써도 게임은 동작. */
export function useBestScore() {
  const [best, setBest] = useState(load);
  const bestRef = useRef(best);

  const submit = useCallback((score) => {
    const isBest = score > bestRef.current;
    if (isBest) {
      bestRef.current = score;
      setBest(score);
      try { localStorage.setItem(KEY, String(score)); } catch { /* 무시 */ }
    }
    return { isBest, best: bestRef.current };
  }, []);

  return { best, submit };
}
