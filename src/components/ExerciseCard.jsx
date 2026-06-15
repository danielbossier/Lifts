import NormalSetRow from './sets/NormalSetRow'
import PerSideSetRow from './sets/PerSideSetRow'
import TimeSetRow from './sets/TimeSetRow'
import TimePerSideSetRow from './sets/TimePerSideSetRow'

function repRangeLabel(exercise) {
  const [lo, hi] = exercise.repRange
  const isTime = exercise.tracking === 'time' || exercise.tracking === 'timePerSide'
  const unit = isTime ? 'sec' : 'reps'
  const perNote = exercise.tracking === 'perArm' ? ' per arm'
    : exercise.tracking === 'perLeg' ? ' per leg'
    : exercise.tracking === 'timePerSide' ? ' per side'
    : ''
  return `${lo}–${hi} ${unit}${perNote}`
}

export default function ExerciseCard({ exercise, sets, goals, onUpdateSet }) {
  const { tracking } = exercise
  const isPerSide = tracking === 'perArm' || tracking === 'perLeg'
  const isTime = tracking === 'time'
  const isTimePerSide = tracking === 'timePerSide'

  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <div className="exercise-name-wrap">
          <span className="exercise-name">{exercise.name}</span>
          <span className="exercise-muscle-tag">{exercise.muscleGroup}</span>
        </div>
        <span className="exercise-meta">{repRangeLabel(exercise)}</span>
      </div>

      {isPerSide && (
        <div className="set-table">
          <div className="set-table-head">
            <span className="col-set" />
            <span className="col-side" />
            <span className="col-weight">Wt</span>
            <span className="col-reps">Reps</span>
            <span className="col-goal">Goal</span>
          </div>
          {Array.from({ length: exercise.sets }, (_, i) => (
            <PerSideSetRow
              key={i}
              setIndex={i}
              leftData={sets.left[i]}
              rightData={sets.right[i]}
              goalLeft={goals.left[i]}
              goalRight={goals.right[i]}
              onUpdate={(side, field, value) => onUpdateSet(side, i, field, value)}
            />
          ))}
        </div>
      )}

      {isTime && (
        <div className="set-table">
          <div className="set-table-head">
            <span className="col-set" />
            <span className="col-seconds">Seconds</span>
            <span className="col-goal">Goal</span>
          </div>
          {Array.from({ length: exercise.sets }, (_, i) => (
            <TimeSetRow
              key={i}
              setIndex={i}
              data={sets.main[i]}
              goalSeconds={goals.main[i]}
              onUpdate={(field, value) => onUpdateSet(null, i, field, value)}
            />
          ))}
        </div>
      )}

      {isTimePerSide && (
        <div className="set-table">
          <div className="set-table-head">
            <span className="col-set" />
            <span className="col-side" />
            <span className="col-seconds">Seconds</span>
            <span className="col-goal">Goal</span>
          </div>
          {Array.from({ length: exercise.sets }, (_, i) => (
            <TimePerSideSetRow
              key={i}
              setIndex={i}
              leftData={sets.left[i]}
              rightData={sets.right[i]}
              goalLeft={goals.left[i]}
              goalRight={goals.right[i]}
              onUpdate={(side, field, value) => onUpdateSet(side, i, field, value)}
            />
          ))}
        </div>
      )}

      {!isPerSide && !isTime && !isTimePerSide && (
        <div className="set-table">
          <div className="set-table-head">
            <span className="col-set" />
            <span className="col-weight">Wt</span>
            <span className="col-reps">Reps</span>
            <span className="col-goal">Goal</span>
          </div>
          {Array.from({ length: exercise.sets }, (_, i) => (
            <NormalSetRow
              key={i}
              setIndex={i}
              data={sets.main[i]}
              goalReps={goals.main[i]}
              onUpdate={(field, value) => onUpdateSet(null, i, field, value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
