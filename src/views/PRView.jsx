import { getPersonalRecords } from '../data/storage'
import { WORKOUTS } from '../data/program'

function isSided(tracking) {
  return tracking === 'perArm' || tracking === 'perLeg' || tracking === 'timePerSide'
}

function PREntry({ record }) {
  if (!record) return <span className="pr-value">—</span>
  if ('seconds' in record) return <span className="pr-value">{record.seconds}s</span>
  const oneRM = record.reps > 1 ? Math.round(record.weight * (1 + record.reps / 30)) : null
  return (
    <span className="pr-entry">
      <span className="pr-value">{record.weight} × {record.reps}</span>
      {oneRM != null && <span className="pr-1rm">~{oneRM}</span>}
    </span>
  )
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
                      <PREntry record={exRec?.left} />
                      <span className="pr-side-label">R</span>
                      <PREntry record={exRec?.right} />
                    </div>
                  ) : (
                    <PREntry record={exRec?.main} />
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
