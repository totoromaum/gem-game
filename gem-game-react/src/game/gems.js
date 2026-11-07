// PRD 2.2 보석 종류와 입체 보석 이미지 그리기
const poly = (n, r, rot) =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * Math.PI * 2) / n;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

export const GEMS = [
  { name: '빨강 마름모', base: '#e8283c', pts: [[0, -0.95], [0.95, 0], [0, 0.95], [-0.95, 0]] },
  { name: '초록 삼각형', base: '#2fbf4a', pts: [[0, -0.92], [0.95, 0.78], [-0.95, 0.78]] },
  { name: '파랑 브릴리언트', base: '#2f7cf0', pts: [[-0.95, -0.32], [-0.52, -0.82], [0.52, -0.82], [0.95, -0.32], [0, 0.92]] },
  { name: '분홍 팔각형', base: '#ec5fc0', pts: poly(8, 0.95, Math.PI / 8) },
  { name: '노랑 육각형', base: '#f5b316', pts: poly(6, 0.95, 0) },
  { name: '보라 원형', base: '#9b45e0', pts: poly(8, 0.95, 0), round: true },
];

/** amt > 0 이면 흰색 쪽으로, < 0 이면 검은색 쪽으로 섞음 */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function pathPoly(x, P) {
  x.beginPath();
  P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath();
}

/** 보석 하나를 size×size 오프스크린 캔버스에 미리 그림 (PRD 5 성능) */
export function makeSprite(g, size) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const x = cv.getContext('2d');
  x.translate(size / 2, size / 2);
  const R = size * 0.4;
  const P = g.pts.map(([a, b]) => [a * R, b * R]);
  const I = P.map(([a, b]) => [a * 0.52, b * 0.52 - R * 0.06]);
  const L = [-0.5, -0.85]; // 왼쪽 위에서 오는 빛

  // 그림자
  x.save();
  x.shadowColor = 'rgba(0,0,0,.55)';
  x.shadowBlur = size * 0.07;
  x.shadowOffsetY = size * 0.04;
  pathPoly(x, P);
  x.fillStyle = shade(g.base, -0.4);
  x.fill();
  x.restore();

  // 면(facet): 바깥 방향이 빛을 향할수록 밝게
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    const ex = P[j][0] - P[i][0], ey = P[j][1] - P[i][1];
    let nx = ey, ny = -ex;
    const len = Math.hypot(nx, ny);
    nx /= len; ny /= len;
    const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
    if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
    const d = nx * L[0] + ny * L[1];
    pathPoly(x, [P[i], P[j], I[j], I[i]]);
    x.fillStyle = shade(g.base, d * 0.5);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,.18)';
    x.lineWidth = Math.max(1, size * 0.008);
    x.stroke();
  }

  // 윗면(table)
  if (g.round) {
    x.beginPath();
    x.arc(0, -R * 0.04, R * 0.5, 0, Math.PI * 2);
    const rg = x.createRadialGradient(-R * 0.15, -R * 0.2, R * 0.05, 0, 0, R * 0.55);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.35, shade(g.base, 0.55));
    rg.addColorStop(1, shade(g.base, -0.05));
    x.fillStyle = rg;
    x.fill();
  } else {
    const gr = x.createLinearGradient(-R * 0.5, -R * 0.6, R * 0.5, R * 0.5);
    gr.addColorStop(0, shade(g.base, 0.55));
    gr.addColorStop(1, shade(g.base, 0.05));
    pathPoly(x, I);
    x.fillStyle = gr;
    x.fill();
  }

  // 하이라이트
  x.save();
  x.globalAlpha = 0.85;
  x.beginPath();
  x.ellipse(-R * 0.2, -R * 0.28, R * 0.16, R * 0.08, -0.6, 0, Math.PI * 2);
  x.fillStyle = '#fff';
  x.fill();
  x.restore();

  // 외곽선
  pathPoly(x, P);
  x.strokeStyle = shade(g.base, -0.6);
  x.lineWidth = size * 0.02;
  x.lineJoin = 'round';
  x.stroke();
  return cv;
}
