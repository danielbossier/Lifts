import { WORKOUTS, getExerciseVariants, getWorkoutById } from '../data/program'

const SIDES = ['main', 'left', 'right']

// exercise id → resolved exercise (including barbell variants), for naming logged sets
function buildExerciseLookup() {
  const lookup = {}
  for (const workout of WORKOUTS) {
    for (const ex of workout.exercises.flatMap(getExerciseVariants)) lookup[ex.id] ??= ex
  }
  return lookup
}

function isTimeBased(tracking) {
  return tracking === 'time' || tracking === 'timePerSide'
}

function escapeCell(value) {
  if (value == null) return ''
  const str = String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

const HEADER = ['date', 'session_id', 'workout', 'exercise', 'exercise_id', 'muscle_group', 'side', 'set', 'weight', 'reps', 'seconds']

// One row per set, oldest session first. Unfinished sets are kept (blank reps/seconds) so an import
// reproduces the session exactly — weight progression depends on whether *every* set hit the top of the range.
export function sessionsToCsv(sessions) {
  const lookup = buildExerciseLookup()
  const rows = [HEADER]
  for (const session of sessions) {
    for (const [exId, sides] of Object.entries(session.sets)) {
      const ex = lookup[exId]
      for (const [side, sets] of Object.entries(sides)) {
        sets.forEach((set, i) => {
          rows.push([
            session.date, session.id, session.workoutId, ex?.name ?? exId, exId, ex?.muscleGroup ?? '',
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

// RFC 4180-style parser: quoted fields, escaped quotes, CRLF or LF line endings
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

function toNumber(str) {
  if (str === '') return null
  const n = Number(str)
  return Number.isFinite(n) ? n : null
}

// Parse an exported CSV back into sessions ({ id | null, workoutId, date, sets }), oldest first.
// Rows are grouped by session_id, or by date + workout for files exported before that column existed.
// Throws if required columns are missing; invalid rows are counted in skippedRows.
export function csvToSessions(text) {
  const [header = [], ...rows] = parseCsv(text.replace(/^\uFEFF/, ''))
  const col = Object.fromEntries(header.map((name, i) => [name.trim(), i]))
  for (const name of ['date', 'workout', 'exercise_id', 'side', 'set']) {
    if (!(name in col)) throw new Error(`Not a workout export — missing "${name}" column`)
  }

  const lookup = buildExerciseLookup()
  const byKey = new Map()
  let skippedRows = 0
  for (const row of rows) {
    if (row.length === 1 && row[0].trim() === '') continue
    const get = name => (col[name] != null ? (row[col[name]] ?? '').trim() : '')
    const date = get('date')
    const workoutId = get('workout')
    const exId = get('exercise_id')
    const side = get('side')
    const setNum = parseInt(get('set'), 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !getWorkoutById(workoutId) || !exId || !SIDES.includes(side) || !(setNum >= 1)) {
      skippedRows++
      continue
    }

    const sessionId = get('session_id')
    const key = sessionId || `${date}|${workoutId}`
    if (!byKey.has(key)) byKey.set(key, { id: sessionId || null, workoutId, date, sets: {} })
    const session = byKey.get(key)

    const ex = lookup[exId]
    const timeBased = ex ? isTimeBased(ex.tracking) : get('seconds') !== ''
    const entry = timeBased
      ? { seconds: toNumber(get('seconds')) }
      : { weight: toNumber(get('weight')), reps: toNumber(get('reps')) }
    const sides = (session.sets[exId] ??= {})
    const sets = (sides[side] ??= [])
    sets[setNum - 1] = entry
  }

  // Fill any gaps in set numbering with blank sets so arrays stay dense
  for (const session of byKey.values()) {
    for (const sides of Object.values(session.sets)) {
      for (const [side, sets] of Object.entries(sides)) {
        const blank = sets.some(s => s && 'seconds' in s) ? { seconds: null } : { weight: null, reps: null }
        sides[side] = Array.from({ length: sets.length }, (_, i) => sets[i] ?? { ...blank })
      }
    }
  }

  const sessions = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date))
  return { sessions, skippedRows }
}
