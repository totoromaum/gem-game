// 판 데이터와 맞추기 판정 (화면과 무관한 순수 로직)
import { N, GEM_TYPES } from './constants.js';

export const randomType = () => Math.floor(Math.random() * GEM_TYPES);

/** 보석 객체: t=종류, x/y=그려질 위치(칸 단위), s=크기, a=투명도 */
export const newGem = (t, c, y) => ({ t, x: c, y, s: 1, a: 1 });

export const emptyBoard = () => Array.from({ length: N }, () => Array(N).fill(null));

/** PRD 2.6 점수 공식 */
export const groupScore = (len, combo) => (len * 10 + (len - 3) * 30) * combo;

/**
 * PRD 2.4 맞추기 판정: 가로·세로 3개 이상 줄, 같은 보석 2×2 사각형.
 * @returns {{set: Set<object>, groups: object[][]}} 사라질 보석 전체와 묶음 목록
 */
export function findMatches(board) {
  const set = new Set();
  const groups = [];
  const scan = (get) => {
    for (let i = 0; i < N; i++) {
      let run = 1;
      for (let j = 1; j <= N; j++) {
        const a = j < N ? get(i, j) : null;
        const b = get(i, j - 1);
        if (a && b && a.t === b.t) run++;
        else {
          if (run >= 3) {
            const grp = [];
            for (let k = j - run; k < j; k++) { set.add(get(i, k)); grp.push(get(i, k)); }
            groups.push(grp);
          }
          run = 1;
        }
      }
    }
  };
  scan((r, c) => board[r][c]);
  scan((c, r) => board[r][c]);

  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const q = [board[r][c], board[r][c + 1], board[r + 1][c], board[r + 1][c + 1]];
      if (q.every((g) => g && g.t === q[0].t)) { q.forEach((g) => set.add(g)); groups.push(q); }
    }
  }
  return { set, groups };
}

const swapCells = (board, r1, c1, r2, c2) => {
  [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
};

/** 둘 수 있는 수 하나를 찾음. 없으면 null. @returns {[r1,c1,r2,c2]|null} */
export function findMove(board) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= N || c2 >= N) continue;
        swapCells(board, r, c, r2, c2);
        const ok = findMatches(board).set.size > 0;
        swapCells(board, r, c, r2, c2);
        if (ok) return [r, c, r2, c2];
      }
    }
  }
  return null;
}

/**
 * 맞추기가 없고 둘 수 있는 수가 있는 판으로 보석 종류를 채움.
 * 이미 있는 보석 객체는 재사용(섞기 애니메이션용)하고 종류만 바꿈.
 */
export function fillTypes(board) {
  do {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        let t;
        do { t = randomType(); } while (
          (c >= 2 && board[r][c - 1].t === t && board[r][c - 2].t === t) ||
          (r >= 2 && board[r - 1][c].t === t && board[r - 2][c].t === t) ||
          (r >= 1 && c >= 1 && board[r][c - 1].t === t && board[r - 1][c].t === t && board[r - 1][c - 1].t === t)
        );
        board[r][c] = board[r][c] || newGem(t, c, r);
        board[r][c].t = t;
      }
    }
  } while (!findMove(board));
}
