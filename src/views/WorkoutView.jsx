import { useState, useEffect } from 'react'
import { WORKOUTS, WORKOUT_ROTATION, resolveEquipment } from '../data/program'
import { getNextWorkoutIndex, getLastSets, saveSession, getRepRangeOverrides, saveDraft, loadDraft, clearDraft } from '../data/storage'
import { formatElapsed } from '../utils/time'
import ExerciseCard from '../components/ExerciseCard'

// Apply the chosen equipment, then rep range overrides (keyed by the base id, so both variants share one range)
function resolveExercises(exercises, overrides, equipment) {
  return exercises.map(base => {
    const ex = resolveEquipment(base, equipment[base.id])
    const override = overrides[ex.baseId ?? ex.id]
    return override ? { ...ex, repRange: override } : ex
  })
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

function isAtMaxWeight(ex, weight) {
  return ex.maxWeight != null && weight != null && weight !== '' && Number(weight) >= ex.maxWeight
}

// Pre-fill weight from last session; increment by 5 only if every set last time hit the top of the range.
// The increment is capped at exercise.maxWeight when one is set.
function buildInitialSets(exercises) {
  const sets = {}
  for (const ex of exercises) {
    const timeBased = isTimeBased(ex.tracking)
    const [, hi] = ex.repRange
    sets[ex.id] = {}
    for (const side of getSides(ex.tracking)) {
      const history = getLastSets(ex.id, side)
      const allHitTop = !timeBased && history?.length > 0 && history.every(s => Number(s.reps) >= hi)
      sets[ex.id][side] = Array.from({ length: ex.sets }, (_, i) => {
        if (timeBased) return { seconds: '' }
        const lastWeight = history?.[i]?.weight ?? ''
        const bumped = Math.min(lastWeight + 5, ex.maxWeight ?? Infinity)
        const weight = lastWeight !== '' && allHitTop && !isAtMaxWeight(ex, lastWeight) ? bumped : lastWeight
        return { weight, reps: '' }
      })
    }
  }
  return sets
}

// Per-set goal values derived from last session performance.
// Time-based: add 5s to last hold, capped at range ceiling.
// Rep-based: hit top of range last time (weight bumps) → back to lo; hit range → push to hi; below range → lo.
// At maxWeight the weight can't bump, so hitting the top of the range → last reps + 1 instead.
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
        if (reps >= hi) return isAtMaxWeight(ex, last.weight) ? reps + 1 : lo
        return reps >= lo ? hi : lo
      })
    }
  }
  return goals
}

// A draft entry is only usable if it has every side this exercise tracks, each with the right number of sets.
// Guards against stale drafts saved before an exercise's tracking type or set count changed.
function draftMatchesExercise(exSets, ex) {
  return exSets != null && getSides(ex.tracking).every(side => exSets[side]?.length === ex.sets)
}

function buildExercises(workoutIndex, capSets, equipment) {
  const resolved = resolveExercises(WORKOUTS[workoutIndex].exercises, getRepRangeOverrides(), equipment)
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
  // { [baseExerciseId]: 'barbell' } — absent means dumbbell
  const [equipment, setEquipment] = useState(() => loadDraft()?.equipment ?? {})
  const exercises = buildExercises(workoutIndex, capSets, equipment)
  const [sets, setSets] = useState(() => {
    const draft = loadDraft()
    if (draft != null && exercises.every(ex => draftMatchesExercise(draft.sets?.[ex.id], ex))) {
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
    saveDraft(workoutIndex, sets, workoutStart, lastSetAt, capSets, equipment)
  }, [workoutIndex, sets, workoutStart, lastSetAt, capSets, equipment])

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
    setEquipment({})
    setSets(buildInitialSets(buildExercises(index, false, {})))
    setLastSetAt({})
    setWorkoutStart(null)
    setWorkoutElapsed(0)
  }

  function toggleCapSets() {
    if (workoutStart !== null) return
    const next = !capSets
    setCapSets(next)
    setSets(buildInitialSets(buildExercises(workoutIndex, next, equipment)))
  }

  // Swap one exercise between dumbbell and barbell. Locked once a set of it is logged.
  // The old variant's entry is dropped so its pre-filled weights aren't saved as a session.
  function toggleEquipment(current) {
    if (lastSetAt[current.id] != null) return
    const nextEquipment = { ...equipment, [current.baseId]: current.equipment === 'barbell' ? 'dumbbell' : 'barbell' }
    const swapped = buildExercises(workoutIndex, capSets, nextEquipment).find(ex => ex.baseId === current.baseId)
    setEquipment(nextEquipment)
    setSets(prev => {
      const { [current.id]: _, ...rest } = prev
      return { ...rest, ...buildInitialSets([swapped]) }
    })
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
    setEquipment({})
    setSets(buildInitialSets(buildExercises(next, false, {})))
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
            equipmentLocked={lastSetAt[ex.id] != null}
            onToggleEquipment={() => toggleEquipment(ex)}
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
