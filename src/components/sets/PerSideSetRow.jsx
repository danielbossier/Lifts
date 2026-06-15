export default function PerSideSetRow({ setIndex, leftData, rightData, goalLeft, goalRight, onUpdate }) {
  return (
    <>
      <div className="set-row">
        <span className="col-set">{setIndex + 1}</span>
        <span className="col-side side-label">L</span>
        <input
          className="col-weight input-field"
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={leftData.weight}
          onChange={e => onUpdate('left', 'weight', e.target.value)}
        />
        <input
          className="col-reps input-field"
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={leftData.reps}
          onChange={e => onUpdate('left', 'reps', e.target.value)}
        />
        <span className="col-goal goal-val">{goalLeft}</span>
      </div>
      <div className="set-row set-row-right">
        <span className="col-set" />
        <span className="col-side side-label">R</span>
        <input
          className="col-weight input-field"
          type="number"
          inputMode="decimal"
          placeholder="—"
          value={rightData.weight}
          onChange={e => onUpdate('right', 'weight', e.target.value)}
        />
        <input
          className="col-reps input-field"
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={rightData.reps}
          onChange={e => onUpdate('right', 'reps', e.target.value)}
        />
        <span className="col-goal goal-val">{goalRight}</span>
      </div>
    </>
  )
}
