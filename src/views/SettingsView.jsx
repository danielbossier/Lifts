import { useState, useRef } from 'react'
import { WORKOUTS } from '../data/program'
import { getRepRangeOverrides, saveRepRangeOverride, clearRepRangeOverride, getAllSessions, importSessions } from '../data/storage'
import { sessionsToCsv, downloadCsv, csvToSessions } from '../utils/csv'

// Each unique exercise once, grouped under its first workout
function buildSections() {
  const seen = new Set()
  return WORKOUTS.map(workout => {
    const unique = workout.exercises.filter(ex => {
      if (ex.hidden || seen.has(ex.id)) return false
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

  const [sessionCount, setSessionCount] = useState(() => getAllSessions().length)
  const [importMessage, setImportMessage] = useState(null)
  const fileInput = useRef(null)

  function handleExport() {
    const csv = sessionsToCsv(getAllSessions().reverse())
    downloadCsv(`workouts-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      const { sessions, skippedRows } = csvToSessions(await file.text())
      const { added, duplicates } = importSessions(sessions)
      const parts = [`Imported ${added} ${added === 1 ? 'session' : 'sessions'}`]
      if (duplicates > 0) parts.push(`${duplicates} already on this device`)
      if (skippedRows > 0) parts.push(`${skippedRows} invalid ${skippedRows === 1 ? 'row' : 'rows'} skipped`)
      setImportMessage({ error: false, text: parts.join(' · ') })
      setSessionCount(getAllSessions().length)
    } catch (err) {
      setImportMessage({ error: true, text: err.message })
    }
  }

  return (
    <div className="settings-view">
      <header className="settings-header">
        <h1>Settings</h1>
        <p className="settings-hint">Rep ranges update goal targets from the next workout.</p>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2 className="settings-workout-label">Data</h2>
          <div className="settings-row">
            <span className="settings-exercise-name">
              Export history
              <span className="settings-subtext">{sessionCount} {sessionCount === 1 ? 'session' : 'sessions'} · one row per set</span>
            </span>
            <button className="export-btn" onClick={handleExport} disabled={sessionCount === 0}>
              Download CSV
            </button>
          </div>
          <div className="settings-row">
            <span className="settings-exercise-name">
              Import history
              <span className={`settings-subtext ${importMessage?.error ? 'is-error' : ''}`}>
                {importMessage?.text ?? 'Adds sessions from an exported CSV'}
              </span>
            </span>
            <button className="export-btn" onClick={() => fileInput.current.click()}>
              Upload CSV
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleImport}
            />
          </div>
        </section>

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
