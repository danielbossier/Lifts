import { getPersonalRecords } from '../data/storage'
import { WORKOUTS } from '../data/program'

function formatRecord(record, tracking) {
  if (!record) return '—'
  if ('seconds' in record) return `${record.seconds}s`
  return `${record.weight} × ${record.reps}`
}

function isSided(tracking) {
  return tracking === 'perArm' || tracking === 'perLeg' || tracking === 'timePerSide'
}

export default function PRView() {
  const records = getPersonalRecords()

  return (
    <div className="pr-view">
      <header className="pr-header">
        <h1>Records</h1>
      </header>

      <div className="pr-content">
        {WORKOUTS.map(workout => (
          <div key={workout.id} className="pr-section">
            <div className="pr-workout-label">{workout.label}</div>
            {workout.exercises.map(ex => {
              const exRec = records[ex.id]
              const sided = isSided(ex.tracking)
              return (
                <div key={ex.id} className="pr-row">
                  <span className="pr-exercise-name">{ex.name}</span>
                  {sided ? (
                    <div className="pr-sided">
                      <span className="pr-side-label">L</span>
                      <span className="pr-value">{formatRecord(exRec?.left, ex.tracking)}</span>
                      <span className="pr-side-label">R</span>
                      <span className="pr-value">{formatRecord(exRec?.right, ex.tracking)}</span>
                    </div>
                  ) : (
                    <span className="pr-value">{formatRecord(exRec?.main, ex.tracking)}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
