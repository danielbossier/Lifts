export default function TimeSetRow({ setIndex, data, goalSeconds, onUpdate }) {
  return (
    <div className="set-row">
      <span className="col-set">{setIndex + 1}</span>
      <input
        className="col-seconds input-field"
        type="number"
        inputMode="numeric"
        placeholder="—"
        value={data.seconds}
        onChange={e => onUpdate('seconds', e.target.value)}
      />
      <span className="col-goal goal-val">{goalSeconds}s</span>
    </div>
  )
}
