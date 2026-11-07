// 캔버스 게임 엔진: 입력, 애니메이션, 그리기를 담당.
// React 쪽에는 handlersRef.current 의 콜백으로 점수·이동·종료를 알린다.
import { N, MAX_MOVES, HINT_DELAY, BOARD_MIN, BOARD_MAX } from './constants.js';
import { GEMS, makeSprite } from './gems.js';
import { emptyBoard, fillTypes, findMatches, findMove, groupScore, newGem, randomType } from './board.js';
import { Tweener, easeIn, easeOut, bounce } from './tween.js';
import { Sound } from './sound.js';

const SWAP_MS = 170;
const CLEAR_MS = 220;

export class GemEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{current: {onScore?:Function, onMoves?:Function, onNewGame?:Function, onGameOver?:Function}}} handlersRef
   */
  constructor(canvas, handlersRef) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handlersRef = handlersRef;
    this.tween = new Tweener();
    this.sound = new Sound();
    this.board = null;
    this.score = 0;
    this.moves = MAX_MOVES;
    this.busy = false;
    this.over = false;
    this.selected = null;
    this.hintMove = null;
    this.lastAct = 0;
    this.down = null;
    this.particles = [];
    this.popups = [];
    this.cell = 60;
    this.dpr = 1;
    this.sprites = [];
    this.destroyed = false;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);

    window.addEventListener('resize', this.resize);
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);

    this.resize();
    this.prev = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
  }

  emit(name, ...args) {
    const fn = this.handlersRef.current?.[name];
    if (fn && !this.destroyed) fn(...args);
  }

  // ---------- 크기 ----------
  resize() {
    const size = Math.max(BOARD_MIN, Math.min(BOARD_MAX, window.innerWidth - 32));
    this.cell = size / N;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = this.canvas.style.height = `${size}px`;
    this.canvas.width = this.canvas.height = Math.round(size * this.dpr);
    this.sprites = GEMS.map((g) => makeSprite(g, Math.round(this.cell * this.dpr)));
  }

  // ---------- 공개 동작 ----------
  setSound(on) { this.sound.enabled = on; }

  showHint() {
    if (!this.busy && !this.over && this.board) this.hintMove = findMove(this.board);
  }

  async newGame() {
    if (this.busy) return;
    this.busy = true;
    this.over = false;
    this.selected = null;
    this.hintMove = null;
    this.score = 0;
    this.moves = MAX_MOVES;
    this.emit('onNewGame');
    this.emit('onScore', 0);
    this.emit('onMoves', MAX_MOVES);

    this.board = emptyBoard();
    fillTypes(this.board);
    const drops = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const g = this.board[r][c];
        g.y = r - N - 1 - (N - r) * 0.15;
        drops.push(this.tween.to(g, { y: r }, 600 + r * 40 + c * 25, bounce));
      }
    }
    await Promise.all(drops);
    this.busy = false;
    this.lastAct = performance.now();
  }

  // ---------- 게임 흐름 ----------
  async trySwap(r1, c1, r2, c2) {
    if (this.busy || this.over) return;
    this.busy = true;
    this.selected = null;
    this.hintMove = null;
    const b = this.board;
    const g1 = b[r1][c1], g2 = b[r2][c2];
    b[r1][c1] = g2; b[r2][c2] = g1;
    this.sound.swap();
    await Promise.all([this.tween.to(g1, { x: c2, y: r2 }, SWAP_MS), this.tween.to(g2, { x: c1, y: r1 }, SWAP_MS)]);

    if (findMatches(b).set.size === 0) {
      // PRD 2.3: 맞추기가 없으면 원위치, 이동 횟수 유지
      b[r1][c1] = g1; b[r2][c2] = g2;
      this.sound.invalid();
      await Promise.all([this.tween.to(g1, { x: c1, y: r1 }, SWAP_MS), this.tween.to(g2, { x: c2, y: r2 }, SWAP_MS)]);
    } else {
      this.moves--;
      this.emit('onMoves', this.moves);
      await this.resolve();
      if (this.moves <= 0) this.endGame();
      else if (!findMove(b)) await this.shuffle();
    }
    this.busy = false;
    this.lastAct = performance.now();
  }

  async resolve() {
    const b = this.board;
    let combo = 0;
    for (;;) {
      const { set, groups } = findMatches(b);
      if (!set.size) break;
      combo++;

      let pts = 0;
      for (const grp of groups) {
        const p = groupScore(grp.length, combo);
        pts += p;
        const cx = grp.reduce((s, g) => s + g.x, 0) / grp.length;
        const cy = grp.reduce((s, g) => s + g.y, 0) / grp.length;
        this.popups.push({ x: cx + 0.5, y: cy + 0.5, text: `+${p}`, life: 1, color: GEMS[grp[0].t].base, big: grp.length >= 4 });
      }
      if (combo >= 2) this.popups.push({ x: N / 2, y: N / 2, text: `콤보 x${combo}!`, life: 1.3, color: '#ffcf40', big: true, center: true });
      this.score += pts;
      this.emit('onScore', this.score);
      this.sound.match(combo);

      for (const g of set) {
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
          this.particles.push({ x: g.x + 0.5, y: g.y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, color: GEMS[g.t].base, size: 0.05 + Math.random() * 0.07 });
        }
      }
      await Promise.all([...set].map((g) => this.tween.to(g, { s: 0, a: 0 }, CLEAR_MS, easeIn)));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (set.has(b[r][c])) b[r][c] = null;

      // 중력 + 새 보석
      const falls = [];
      for (let c = 0; c < N; c++) {
        let w = N - 1;
        for (let r = N - 1; r >= 0; r--) {
          if (b[r][c]) {
            if (r !== w) { b[w][c] = b[r][c]; b[r][c] = null; }
            w--;
          }
        }
        const missing = w + 1;
        for (let r = 0; r <= w; r++) b[r][c] = newGem(randomType(), c, r - missing);
        for (let r = 0; r < N; r++) {
          const g = b[r][c];
          if (g.y !== r) falls.push(this.tween.to(g, { y: r }, 260 + (r - g.y) * 45, bounce));
        }
      }
      await Promise.all(falls);
    }
  }

  async shuffle() {
    this.popups.push({ x: N / 2, y: N / 2, text: '섞는 중...', life: 1.5, color: '#9ad0ff', big: true, center: true });
    const all = this.board.flat();
    await Promise.all(all.map((g) => this.tween.to(g, { s: 0 }, 250, easeIn)));
    fillTypes(this.board);
    await Promise.all(all.map((g) => this.tween.to(g, { s: 1 }, 300, easeOut)));
  }

  endGame() {
    this.over = true;
    this.sound.gameOver();
    this.emit('onGameOver', this.score);
  }

  // ---------- 입력 ----------
  cellAt(e) {
    const rect = this.canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / this.cell);
    const r = Math.floor((e.clientY - rect.top) / this.cell);
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c } : null;
  }

  onDown(e) {
    if (this.busy || this.over) return;
    const p = this.cellAt(e);
    if (!p) return;
    this.down = { ...p, x: e.clientX, y: e.clientY, moved: false };
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
  }

  onMove(e) {
    const d = this.down;
    if (!d || d.moved) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cell * 0.35) return;
    let r2 = d.r, c2 = d.c;
    if (Math.abs(dx) > Math.abs(dy)) c2 += Math.sign(dx);
    else r2 += Math.sign(dy);
    d.moved = true;
    if (r2 >= 0 && r2 < N && c2 >= 0 && c2 < N) this.trySwap(d.r, d.c, r2, c2);
  }

  onUp() {
    const d = this.down;
    this.down = null;
    if (!d || d.moved || this.busy || this.over) return;
    const { r, c } = d;
    const s = this.selected;
    if (s && Math.abs(s.r - r) + Math.abs(s.c - c) === 1) this.trySwap(s.r, s.c, r, c);
    else if (s && s.r === r && s.c === c) this.selected = null;
    else { this.selected = { r, c }; this.sound.select(); }
    this.lastAct = performance.now();
    this.hintMove = null;
  }

  // ---------- 그리기 ----------
  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  loop(now) {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (now - this.prev) / 1000);
    this.prev = now;
    this.tween.update(now);
    if (!this.busy && !this.over && !this.hintMove && this.board && now - this.lastAct > HINT_DELAY) {
      this.hintMove = findMove(this.board);
    }
    this.draw(now, dt);
    this.raf = requestAnimationFrame(this.loop);
  }

  draw(now, dt) {
    const { ctx, cell, board } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const S = cell * N;
    ctx.clearRect(0, 0, S, S);

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#17132e' : '#100d22';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }

    const sel = this.selected;
    if (sel) {
      const pulse = 0.55 + 0.25 * Math.sin(now / 150);
      this.roundRect(sel.c * cell + 2, sel.r * cell + 2, cell - 4, cell - 4, cell * 0.18);
      ctx.fillStyle = `rgba(255,220,120,${pulse * 0.35})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,220,120,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const hint = this.hintMove;
    if (hint && !this.busy) {
      const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(now / 180));
      for (const [r, c] of [[hint[0], hint[1]], [hint[2], hint[3]]]) {
        this.roundRect(c * cell + 3, r * cell + 3, cell - 6, cell - 6, cell * 0.18);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    if (board) {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const g = board[r][c];
          if (!g || g.s <= 0.01) continue;
          let s = g.s;
          if (sel && sel.r === r && sel.c === c) s *= 1 + 0.07 * Math.sin(now / 110);
          const sz = cell * s;
          ctx.globalAlpha = g.a;
          ctx.drawImage(this.sprites[g.t], (g.x + 0.5) * cell - sz / 2, (g.y + 0.5) * cell - sz / 2, sz, sz);
        }
      }
    }
    ctx.globalAlpha = 1;

    // 파티클
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 1.6;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, p.size * cell * p.life + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x * cell, p.y * cell, p.size * cell * p.life * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 점수·콤보 팝업
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      if (p.life <= 0) { this.popups.splice(i, 1); continue; }
      if (!p.center) p.y -= dt * 0.8;
      const fs = cell * (p.center ? 0.75 : p.big ? 0.5 : 0.38) * (p.center ? 1 + (1 - Math.min(1, p.life)) * 0.2 : 1);
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.font = `800 ${fs}px system-ui, "Malgun Gothic", sans-serif`;
      ctx.lineWidth = fs * 0.16;
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.strokeText(p.text, p.x * cell, p.y * cell);
      ctx.fillStyle = p.center ? p.color : '#fff';
      ctx.fillText(p.text, p.x * cell, p.y * cell);
    }
    ctx.globalAlpha = 1;
  }
}
