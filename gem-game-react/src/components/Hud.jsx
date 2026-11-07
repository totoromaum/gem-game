import { LOW_MOVES } from '../game/constants.js';

function Stat({ label, value, warn }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${warn ? ' warn' : ''}`}>{value}</div>
    </div>
  );
}

export default function Hud({ score, moves, best }) {
  return (
    <div className="hud">
      <Stat label="점수" value={score.toLocaleString()} />
      <Stat label="남은 이동" value={moves} warn={moves <= LOW_MOVES} />
      <Stat label="최고 점수" value={best.toLocaleString()} />
    </div>
  );
}
