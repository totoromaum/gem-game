import { useEffect, useRef, useState } from 'react';
import { MAX_MOVES } from './game/constants.js';
import Hud from './components/Hud.jsx';
import GameBoard from './components/GameBoard.jsx';
import Controls from './components/Controls.jsx';
import GameOverModal from './components/GameOverModal.jsx';
import Help from './components/Help.jsx';
import { useBestScore } from './hooks/useBestScore.js';

export default function App() {
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(MAX_MOVES);
  const [result, setResult] = useState(null); // 게임 종료 결과 { score, isBest, best }
  const [soundOn, setSoundOn] = useState(true);
  const { best, submit } = useBestScore();
  const engineRef = useRef(null);

  // 엔진이 부를 콜백. 매 렌더마다 최신 함수로 바꿔 끼워서 오래된 값 참조를 막는다.
  const handlersRef = useRef({});
  handlersRef.current = {
    onScore: setScore,
    onMoves: setMoves,
    onNewGame: () => setResult(null),
    onGameOver: (final) => {
      const { isBest, best: newBest } = submit(final);
      setTimeout(() => setResult({ score: final, isBest, best: newBest }), 400);
    },
  };

  useEffect(() => {
    engineRef.current?.setSound(soundOn);
  }, [soundOn]);

  const newGame = () => engineRef.current?.newGame();

  return (
    <div className="app">
      <h1 className="title">💎 보석 맞추기</h1>
      <Hud score={score} moves={moves} best={best} />
      <GameBoard engineRef={engineRef} handlersRef={handlersRef} soundOn={soundOn}>
        {result && <GameOverModal result={result} onRestart={newGame} />}
      </GameBoard>
      <Controls
        onNewGame={newGame}
        onHint={() => engineRef.current?.showHint()}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((v) => !v)}
      />
      <Help />
    </div>
  );
}
