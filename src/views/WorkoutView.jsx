import { useState, useEffect } from 'react'
import { WORKOUTS, WORKOUT_ROTATION } from '../data/program'
import { getNextWorkoutIndex, getLastSets, saveSession, getRepRangeOverrides, saveDraft, loadDraft, clearDraft } from '../data/storage'
import { formatElapsed } from '../utils/time'
import ExerciseCard from '../components/ExerciseCard'

function resolveExercises(exercises, overrides) {
  return exercises.map(ex =>
    overrides[ex.id] ? { ...ex, repRange: overrides[ex.id] } : ex
  )
}

// Cap every exercise at 2 sets for an intensity-focused session; leaves 1- and 2-set exercises untouched.
function applySetCap(exercises, capSets) {
  if (!capSets) return exercises
  return exercises.map(ex => ({ ...ex, sets: Math.min(ex.sets, 2) }))
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

// Pre-fill weight from last session; increment by 5 if last reps hit the top of the range.
function buildInitialSets(exercises) {
  const sets = {}
  for (const ex of exercises) {
    const timeBased = isTimeBased(ex.tracking)
    const [, hi] = ex.repRange
    sets[ex.id] = {}
    for (const side of getSides(ex.tracking)) {
      const history = getLastSets(ex.id, side)
      sets[ex.id][side] = Array.from({ length: ex.sets }, (_, i) => {
        if (timeBased) return { seconds: '' }
        const lastWeight = history?.[i]?.weight ?? ''
        const lastReps = Number(history?.[i]?.reps)
        const weight = lastWeight !== '' && lastReps >= hi ? lastWeight + 5 : lastWeight
        return { weight, reps: '' }
      })
    }
  }
  return sets
}

// Per-set goal values derived from last session performance.
// Time-based: add 5s to last hold, capped at range ceiling.
// Rep-based: hit top of range last time (weight bumps) → back to lo; hit range → push to hi; below range → lo.
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
        return reps >= hi ? lo : reps >= lo ? hi : lo
      })
    }
  }
  return goals
}

function buildExercises(workoutIndex, capSets) {
  const resolved = resolveExercises(WORKOUTS[workoutIndex].exercises, getRepRangeOverrides())
  return applySetCap(resolved, capSets)
}

export default function WorkoutView() {
  const nextIndex = getNextWorkoutIndex()
  const [workoutIndex, setWorkoutIndex] = useState(() => {
    const draft = loadDraft()
    return draft?.workoutIndex ?? getNextWorkoutIndex()
  })
  const [completed, setCompleted] = useState(false)
  const workout = WORKOUTS[workoutIndex]

  const [capSets, setCapSets] = useState(() => loadDraft()?.capSets ?? false)
  const exercises = buildExercises(workoutIndex, capSets)
  const [sets, setSets] = useState(() => {
    const draft = loadDraft()
    if (draft != null && exercises.every(ex => draft.sets[ex.id] != null)) {
      return draft.sets
    }
    return buildInitialSets(exercises)
  })
  const goals = computeGoals(exercises)

  // Time since each exercise's last logged set, keyed by exercise id
  const [lastSetAt, setLastSetAt] = useState(() => loadDraft()?.lastSetAt ?? {})
  const [now, setNow] = useState(() => Date.now())
  const [workoutStart, setWorkoutStart] = useState(() => loadDraft()?.workoutStart ?? null)
  const [workoutElapsed, setWorkoutElapsed] = useState(
    () => workoutStart ? Math.floor((Date.now() - workoutStart) / 1000) : 0
  )

  // Auto-save in-progress sets so a page refresh doesn't lose data
  useEffect(() => {
    saveDraft(workoutIndex, sets, workoutStart, lastSetAt, capSets)
  }, [workoutIndex, sets, workoutStart, lastSetAt, capSets])

  // Workout duration timer — starts on first logged set; also drives the per-exercise rest clocks
  useEffect(() => {
    if (!workoutStart) return
    const interval = setInterval(() => {
      const t = Date.now()
      setWorkoutElapsed(Math.floor((t - workoutStart) / 1000))
      setNow(t)
    }, 1000)
    return () => clearInterval(interval)
  }, [workoutStart])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  function selectWorkout(index) {
    if (index === workoutIndex) return
    setWorkoutIndex(index)
    setCapSets(false)
    setSets(buildInitialSets(buildExercises(index, false)))
    setLastSetAt({})
    setWorkoutStart(null)
    setWorkoutElapsed(0)
  }

  function toggleCapSets() {
    if (workoutStart !== null) return
    const next = !capSets
    setCapSets(next)
    setSets(buildInitialSets(buildExercises(workoutIndex, next)))
  }

  function updateSet(exerciseId, side, setIndex, field, value) {
    setSets(prev => {
      const key = side ?? 'main'
      const updated = prev[exerciseId][key].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      )
      return { ...prev, [exerciseId]: { ...prev[exerciseId], [key]: updated } }
    })

    if ((field === 'reps' || field === 'seconds') && value !== '') {
      const t = Date.now()
      setLastSetAt(prev => ({ ...prev, [exerciseId]: t }))
      setNow(t)
      if (!workoutStart) setWorkoutStart(t)
    }
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
    clearDraft()
    setCompleted(true)
  }

  function handleStartNext() {
    const next = getNextWorkoutIndex()
    setWorkoutIndex(next)
    setCapSets(false)
    setSets(buildInitialSets(buildExercises(next, false)))
    setCompleted(false)
    setLastSetAt({})
    setWorkoutStart(null)
    setWorkoutElapsed(0)
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
          <div className="workout-title-row">
            <h1 className="workout-title">{workout.label}</h1>
            <button
              className={`cap-sets-toggle ${capSets ? 'active' : ''}`}
              disabled={workoutStart !== null}
              onClick={toggleCapSets}
            >
              2-Set Day
            </button>
          </div>
          <div className="workout-meta">
            <span className="workout-date">{today}</span>
            {workoutStart !== null && (
              <span className="workout-elapsed">{formatElapsed(workoutElapsed)}</span>
            )}
          </div>
        </div>
      </header>

      <div className="exercise-list">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            sets={sets[ex.id]}
            goals={goals[ex.id]}
            restSeconds={lastSetAt[ex.id] != null ? Math.floor((now - lastSetAt[ex.id]) / 1000) : null}
            onUpdateSet={(side, setIndex, field, value) =>
              updateSet(ex.id, side, setIndex, field, value)
            }
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
