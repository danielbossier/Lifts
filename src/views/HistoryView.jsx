import { useState } from 'react'
import { getAllSessions } from '../data/storage'
import { getWorkoutById } from '../data/program'

// 'YYYY-MM-DD' → 'Jun 15, 2026'
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatRep(s) {
  if (s.weight == null && s.reps == null) return null
  const wt = s.weight != null ? s.weight : '?'
  const reps = s.reps != null ? s.reps : '?'
  return `${wt}×${reps}`
}

function formatSec(s) {
  return s.seconds != null ? `${s.seconds}s` : null
}

// Returns an array of { label, entries } where label is '' | 'L' | 'R'
// and entries is an array of formatted strings for each set.
function summariseSets(exSets, tracking) {
  const isTime = tracking === 'time' || tracking === 'timePerSide'
  const isSided = tracking === 'perArm' || tracking === 'perLeg' || tracking === 'timePerSide'
  const fmt = isTime ? formatSec : formatRep

  if (isSided) {
    return [
      { label: 'L', entries: (exSets.left ?? []).map(fmt).filter(Boolean) },
      { label: 'R', entries: (exSets.right ?? []).map(fmt).filter(Boolean) },
    ].filter(row => row.entries.length > 0)
  }

  const entries = (exSets.main ?? []).map(fmt).filter(Boolean)
  return entries.length > 0 ? [{ label: '', entries }] : []
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false)
  const workout = getWorkoutById(session.workoutId)
  if (!workout) return null

  const hasData = Object.keys(session.sets).length > 0

  return (
    <div className="session-card">
      <button
        className="session-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className="session-header-left">
          <span className="session-workout-label">{workout.label}</span>
          <span className="session-date">{formatDate(session.date)}</span>
        </div>
        <span className={`session-chevron ${expanded ? 'open' : ''}`}>›</span>
      </button>

      {expanded && (
        <div className="session-detail">
          {!hasData && (
            <p className="session-empty">No sets logged.</p>
          )}
          {workout.exercises.map(ex => {
            const exSets = session.sets[ex.id]
            if (!exSets) return null
            const rows = summariseSets(exSets, ex.tracking)
            if (rows.length === 0) return null

            return (
              <div key={ex.id} className="history-exercise">
                <span className="history-exercise-name">{ex.name}</span>
                <div className="history-sets">
                  {rows.map(row => (
                    <div key={row.label} className="history-set-row">
                      {row.label && <span className="history-side">{row.label}</span>}
                      <span className="history-entries">{row.entries.join('  ·  ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function HistoryView() {
  const sessions = getAllSessions()

  return (
    <div className="history-view">
      <header className="history-header">
        <h1>History</h1>
      </header>

      {sessions.length === 0 ? (
        <div className="history-empty">
          <p>No workouts logged yet.</p>
          <p>Complete a workout to see it here.</p>
        </div>
      ) : (
        <div className="session-list">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
