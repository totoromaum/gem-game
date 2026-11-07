# 보석 맞추기 (React)

[PRD.md](../PRD.md)를 기준으로 만든 React + Vite 버전입니다.

## 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # dist/ 에 배포용 파일 생성
```

## 구조

```
src/
├─ App.jsx                 # 점수·이동·결과 상태, 컴포넌트 조립
├─ components/
│  ├─ Hud.jsx              # 점수 / 남은 이동 / 최고 점수
│  ├─ GameBoard.jsx        # 캔버스 + 게임 엔진 연결
│  ├─ Controls.jsx         # 새 게임 / 힌트 / 소리 버튼
│  ├─ GameOverModal.jsx    # 게임 종료 창
│  └─ Help.jsx             # 게임 방법 안내
├─ hooks/useBestScore.js   # 최고 점수 localStorage 저장
└─ game/
   ├─ constants.js         # 판 크기, 이동 횟수 등 규칙 값
   ├─ board.js             # 맞추기 판정, 둘 수 있는 수 찾기, 판 생성, 점수 공식
   ├─ gems.js              # 보석 6종 정의와 입체 이미지 그리기
   ├─ tween.js             # 애니메이션
   ├─ sound.js             # 효과음
   └─ engine.js            # 입력·연쇄·그리기를 담당하는 캔버스 엔진
```

게임 판은 매 프레임 애니메이션이 많아 캔버스 엔진(`GemEngine`)이 직접 그리고,
점수·이동·종료 같은 화면 상태는 엔진이 콜백으로 React에 알려 컴포넌트가 표시합니다.
