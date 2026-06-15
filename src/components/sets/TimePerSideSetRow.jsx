export default function TimePerSideSetRow({ setIndex, leftData, rightData, goalLeft, goalRight, onUpdate }) {
  return (
    <>
      <div className="set-row">
        <span className="col-set">{setIndex + 1}</span>
        <span className="col-side side-label">L</span>
        <input
          className="col-seconds input-field"
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={leftData.seconds}
          onChange={e => onUpdate('left', 'seconds', e.target.value)}
        />
        <span className="col-goal goal-val">{goalLeft}s</span>
      </div>
      <div className="set-row set-row-right">
        <span className="col-set" />
        <span className="col-side side-label">R</span>
        <input
          className="col-seconds input-field"
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={rightData.seconds}
          onChange={e => onUpdate('right', 'seconds', e.target.value)}
        />
        <span className="col-goal goal-val">{goalRight}s</span>
      </div>
    </>
  )
}
