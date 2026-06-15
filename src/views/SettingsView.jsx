import { useState } from 'react'
import { WORKOUTS } from '../data/program'
import { getRepRangeOverrides, saveRepRangeOverride, clearRepRangeOverride } from '../data/storage'

// Each unique exercise once, grouped under its first workout
function buildSections() {
  const seen = new Set()
  return WORKOUTS.map(workout => {
    const unique = workout.exercises.filter(ex => {
      if (seen.has(ex.id)) return false
      seen.add(ex.id)
      return true
    })
    return { workout, exercises: unique }
  }).filter(s => s.exercises.length > 0)
}

const SECTIONS = buildSections()

function isTimeBased(tracking) {
  return tracking === 'time' || tracking === 'timePerSide'
}

function initRanges(overrides) {
  const ranges = {}
  for (const { exercises } of SECTIONS) {
    for (const ex of exercises) {
      const [lo, hi] = overrides[ex.id] ?? ex.repRange
      ranges[ex.id] = { lo: String(lo), hi: String(hi) }
    }
  }
  return ranges
}

export default function SettingsView() {
  const [overrides, setOverrides] = useState(() => getRepRangeOverrides())
  const [ranges, setRanges] = useState(() => initRanges(getRepRangeOverrides()))

  function handleChange(exerciseId, field, value) {
    setRanges(prev => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value },
    }))
  }

  function handleBlur(exercise) {
    const { lo, hi } = ranges[exercise.id]
    const loNum = parseInt(lo, 10)
    const hiNum = parseInt(hi, 10)
    if (!Number.isFinite(loNum) || !Number.isFinite(hiNum) || loNum < 1 || hiNum < loNum) return

    const [defLo, defHi] = exercise.repRange
    if (loNum === defLo && hiNum === defHi) {
      clearRepRangeOverride(exercise.id)
      setOverrides(prev => { const next = { ...prev }; delete next[exercise.id]; return next })
    } else {
      saveRepRangeOverride(exercise.id, [loNum, hiNum])
      setOverrides(prev => ({ ...prev, [exercise.id]: [loNum, hiNum] }))
    }
  }

  function handleReset(exercise) {
    const [defLo, defHi] = exercise.repRange
    clearRepRangeOverride(exercise.id)
    setOverrides(prev => { const next = { ...prev }; delete next[exercise.id]; return next })
    setRanges(prev => ({ ...prev, [exercise.id]: { lo: String(defLo), hi: String(defHi) } }))
  }

  return (
    <div className="settings-view">
      <header className="settings-header">
        <h1>Settings</h1>
        <p className="settings-hint">Rep ranges update goal targets from the next workout.</p>
      </header>

      <div className="settings-content">
        {SECTIONS.map(({ workout, exercises }) => (
          <section key={workout.id} className="settings-section">
            <h2 className="settings-workout-label">{workout.label}</h2>
            {exercises.map(ex => {
              const isOverridden = !!overrides[ex.id]
              const unit = isTimeBased(ex.tracking) ? 'sec' : 'reps'
              return (
                <div key={ex.id} className={`settings-row ${isOverridden ? 'is-overridden' : ''}`}>
                  <span className="settings-exercise-name">{ex.name}</span>
                  <div className="settings-range">
                    <input
                      className="range-input"
                      type="number"
                      inputMode="numeric"
                      value={ranges[ex.id].lo}
                      onChange={e => handleChange(ex.id, 'lo', e.target.value)}
                      onBlur={() => handleBlur(ex)}
                    />
                    <span className="range-sep">–</span>
                    <input
                      className="range-input"
                      type="number"
                      inputMode="numeric"
                      value={ranges[ex.id].hi}
                      onChange={e => handleChange(ex.id, 'hi', e.target.value)}
                      onBlur={() => handleBlur(ex)}
                    />
                    <span className="range-unit">{unit}</span>
                    {isOverridden && (
                      <button
                        className="range-reset"
                        onClick={() => handleReset(ex)}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
