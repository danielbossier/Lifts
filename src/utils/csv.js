import { WORKOUTS, getExerciseVariants } from '../data/program'

// exercise id → resolved exercise (including barbell variants), for naming logged sets
function buildExerciseLookup() {
  const lookup = {}
  for (const workout of WORKOUTS) {
    for (const ex of workout.exercises.flatMap(getExerciseVariants)) lookup[ex.id] ??= ex
  }
  return lookup
}

function escapeCell(value) {
  if (value == null) return ''
  const str = String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

const HEADER = ['date', 'workout', 'exercise', 'exercise_id', 'muscle_group', 'side', 'set', 'weight', 'reps', 'seconds']

// One row per logged set, oldest session first. Sets without reps/seconds (e.g. only a pre-filled weight) are skipped.
export function sessionsToCsv(sessions) {
  const lookup = buildExerciseLookup()
  const rows = [HEADER]
  for (const session of sessions) {
    for (const [exId, sides] of Object.entries(session.sets)) {
      const ex = lookup[exId]
      for (const [side, sets] of Object.entries(sides)) {
        sets.forEach((set, i) => {
          if (set.reps == null && set.seconds == null) return
          rows.push([
            session.date, session.workoutId, ex?.name ?? exId, exId, ex?.muscleGroup ?? '',
            side, i + 1, set.weight, set.reps, set.seconds,
          ])
        })
      }
    }
  }
  return rows.map(row => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadCsv(filename, csv) {
  // BOM so Excel opens it as UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
