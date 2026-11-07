export default function GameOverModal({ result, onRestart }) {
  return (
    <div className="overlay" role="dialog" aria-label="게임 종료">
      <h2>게임 종료!</h2>
      <p>최종 점수</p>
      <div className="final-score">{result.score.toLocaleString()}</div>
      <p>{result.isBest ? '🎉 새로운 최고 기록!' : `최고 점수: ${result.best.toLocaleString()}`}</p>
      <button type="button" className="primary" onClick={onRestart} autoFocus>
        다시 하기
      </button>
    </div>
  );
}
