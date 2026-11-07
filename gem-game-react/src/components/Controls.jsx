export default function Controls({ onNewGame, onHint, soundOn, onToggleSound }) {
  return (
    <div className="controls">
      <button type="button" onClick={onNewGame}>🔄 새 게임</button>
      <button type="button" onClick={onHint}>💡 힌트</button>
      <button type="button" onClick={onToggleSound} aria-pressed={soundOn}>
        {soundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'}
      </button>
    </div>
  );
}
