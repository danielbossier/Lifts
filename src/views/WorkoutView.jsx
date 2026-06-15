import { useState } from 'react'
import { WORKOUTS, WORKOUT_ROTATION } from '../data/program'
import { getNextWorkoutIndex, getLastSets, saveSession, getRepRangeOverrides } from '../data/storage'
import MuscleGroupSection from '../components/MuscleGroupSection'

// Merge rep range overrides into a copy of the exercises array
function resolveExercises(exercises, overrides) {
  return exercises.map(ex =>
    overrides[ex.id] ? { ...ex, repRange: overrides[ex.id] } : ex
  )
}

function isBilateral(tracking) {
  return tracking === 'perArm' || tracking === 'perLeg' || tracking === 'timePerSide'
}

function isTimeBased(tracking) {
  return tracking === 'time' || tracking === 'timePerSide'
}

function getSides(tracking) {
  return isBilateral(tracking) ? ['left', 'right'] : ['main']
}

// Pre-fill weight from last session; reps/seconds always start blank
function buildInitialSets(exercises) {
  const sets = {}
  for (const ex of exercises) {
    const timeBased = isTimeBased(ex.tracking)
    sets[ex.id] = {}
    for (const side of getSides(ex.tracking)) {
      const history = getLastSets(ex.id, side)
      sets[ex.id][side] = Array.from({ length: ex.sets }, (_, i) => {
        if (timeBased) return { seconds: '' }
        return { weight: history?.[i]?.weight ?? '', reps: '' }
      })
    }
  }
  return sets
}

// Per-set goal values derived from last session performance.
// Time-based: add 5s to last hold, capped at range ceiling.
// Rep-based: if last reps >= lo, push to hi; otherwise aim for lo.
function computeGoals(exercises) {
  const goals = {}
  for (const ex of exercises) {
    const timeBased = isTimeBased(ex.tracking)
    const [lo, hi] = ex.repRange
    goals[ex.id] = {}
    for (const side of getSides(ex.tracking)) {
      const history = getLastSets(ex.id, side)
      goals[ex.id][side] = Array.from({ length: ex.sets }, (_, i) => {
        const last = history?.[i]
        if (!last) return lo
        if (timeBased) {
          const secs = Number(last.seconds)
          return secs > 0 ? Math.min(secs + 5, hi) : lo
        }
        const reps = Number(last.reps)
        return reps >= lo ? hi : lo
      })
    }
  }
  return goals
}

function groupByMuscle(exercises) {
  const groups = []
  const seen = {}
  for (const ex of exercises) {
    if (!seen[ex.muscleGroup]) {
      seen[ex.muscleGroup] = []
      groups.push({ muscleGroup: ex.muscleGroup, exercises: seen[ex.muscleGroup] })
    }
    seen[ex.muscleGroup].push(ex)
  }
  return groups
}

function buildExercises(workoutIndex) {
  return resolveExercises(WORKOUTS[workoutIndex].exercises, getRepRangeOverrides())
}

export default function WorkoutView() {
  const nextIndex = getNextWorkoutIndex()
  const [workoutIndex, setWorkoutIndex] = useState(() => getNextWorkoutIndex())
  const [completed, setCompleted] = useState(false)
  const workout = WORKOUTS[workoutIndex]

  const exercises = buildExercises(workoutIndex)
  const [sets, setSets] = useState(() => buildInitialSets(exercises))
  const goals = computeGoals(exercises)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  function selectWorkout(index) {
    if (index === workoutIndex) return
    setWorkoutIndex(index)
    setSets(buildInitialSets(buildExercises(index)))
  }

  function updateSet(exerciseId, side, setIndex, field, value) {
    setSets(prev => {
      const key = side ?? 'main'
      const updated = prev[exerciseId][key].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      )
      return { ...prev, [exerciseId]: { ...prev[exerciseId], [key]: updated } }
    })
  }

  function handleComplete() {
    const normalized = {}
    for (const [exId, sides] of Object.entries(sets)) {
      normalized[exId] = {}
      for (const [side, rows] of Object.entries(sides)) {
        normalized[exId][side] = rows.map(row =>
          'seconds' in row
            ? { seconds: row.seconds !== '' ? Number(row.seconds) : null }
            : { weight: row.weight !== '' ? Number(row.weight) : null,
                reps:   row.reps   !== '' ? Number(row.reps)   : null }
        )
      }
    }
    saveSession(workout.id, normalized)
    setCompleted(true)
  }

  function handleStartNext() {
    const next = getNextWorkoutIndex()
    setWorkoutIndex(next)
    setSets(buildInitialSets(buildExercises(next)))
    setCompleted(false)
  }

  if (completed) {
    const nextWorkout = WORKOUTS[getNextWorkoutIndex()]
    return (
      <div className="workout-complete">
        <div className="complete-message">
          <h2>Workout Complete</h2>
          <p>{workout.label} logged for {today}</p>
        </div>
        <button className="complete-btn" onClick={handleStartNext}>
          Start {nextWorkout.label}
        </button>
      </div>
    )
  }

  const groups = groupByMuscle(exercises)

  return (
    <div className="workout-view">
      <header className="workout-header">
        <div className="workout-selector">
          {WORKOUT_ROTATION.map((id, i) => (
            <button
              key={id}
              className={`selector-pill ${i === workoutIndex ? 'active' : ''} ${i === nextIndex && i !== workoutIndex ? 'is-next' : ''}`}
              onClick={() => selectWorkout(i)}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="workout-header-bottom">
          <h1 className="workout-title">{workout.label}</h1>
          <span className="workout-date">{today}</span>
        </div>
      </header>

      <div className="exercise-list">
        {groups.map(group => (
          <MuscleGroupSection
            key={group.muscleGroup}
            muscleGroup={group.muscleGroup}
            exercises={group.exercises}
            sets={sets}
            goals={goals}
            onUpdateSet={updateSet}
          />
        ))}
      </div>

      <div className="complete-btn-wrap">
        <button className="complete-btn" onClick={handleComplete}>
          Complete Workout
        </button>
      </div>
    </div>
  )
}
