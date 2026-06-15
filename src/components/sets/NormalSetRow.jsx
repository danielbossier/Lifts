export default function NormalSetRow({ setIndex, data, goalReps, onUpdate }) {
  return (
    <div className="set-row">
      <span className="col-set">{setIndex + 1}</span>
      <input
        className="col-weight input-field"
        type="number"
        inputMode="decimal"
        placeholder="—"
        value={data.weight}
        onChange={e => onUpdate('weight', e.target.value)}
      />
      <input
        className="col-reps input-field"
        type="number"
        inputMode="numeric"
        placeholder="—"
        value={data.reps}
        onChange={e => onUpdate('reps', e.target.value)}
      />
      <span className="col-goal goal-val">{goalReps}</span>
    </div>
  )
}
