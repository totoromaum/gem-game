// 위치·크기·투명도 애니메이션을 Promise로 처리 (PRD 4.2)
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t;
export const bounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

export class Tweener {
  constructor() { this.list = []; }

  /** obj의 숫자 속성을 to 값까지 dur(ms) 동안 바꿈. 끝나면 resolve. */
  to(obj, to, dur, ease = easeOut) {
    return new Promise((res) => {
      const from = {};
      for (const k in to) from[k] = obj[k];
      this.list.push({ obj, from, to, dur, t0: performance.now(), ease, res });
    });
  }

  update(now) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      const t = Math.min(1, (now - tw.t0) / tw.dur);
      const e = tw.ease(t);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (t >= 1) { this.list.splice(i, 1); tw.res(); }
    }
  }
}
