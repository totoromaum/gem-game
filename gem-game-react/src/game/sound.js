// Web Audio API로 효과음을 즉석에서 합성 (PRD F-16)
export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  beep(freq, dur = 0.14, type = 'sine', vol = 0.12) {
    if (!this.enabled) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const t = this.ctx.currentTime;
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch {
      /* 소리를 낼 수 없는 환경이면 무시 */
    }
  }

  select() { this.beep(700, 0.05, 'triangle', 0.05); }
  swap() { this.beep(520, 0.06, 'triangle', 0.06); }
  invalid() { this.beep(150, 0.18, 'square', 0.05); }
  match(combo) {
    const k = Math.pow(1.19, combo - 1);
    this.beep(440 * k, 0.18, 'sine', 0.13);
    setTimeout(() => this.beep(660 * k, 0.2, 'sine', 0.08), 60);
  }
  gameOver() {
    this.beep(392, 0.2);
    setTimeout(() => this.beep(523, 0.2), 150);
    setTimeout(() => this.beep(659, 0.35), 300);
  }
}
