import { useEffect, useRef } from 'react';
import { GemEngine } from '../game/engine.js';

/** 캔버스와 게임 엔진을 연결. children(게임 종료 창)은 판 위에 겹쳐 표시. */
export default function GameBoard({ engineRef, handlersRef, soundOn, children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const engine = new GemEngine(canvasRef.current, handlersRef);
    engine.setSound(soundOn);
    engineRef.current = engine;
    engine.newGame();
    return () => {
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // 엔진은 마운트될 때 한 번만 만든다. 소리 설정은 App에서 따로 반영.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="board-wrap">
      <canvas ref={canvasRef} className="board" />
      {children}
    </div>
  );
}
