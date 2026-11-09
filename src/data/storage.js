import { WORKOUT_ROTATION } from './program'

const KEY = 'wt-v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? defaultState()
  } catch {
    return defaultState()
  }
}

function defaultState() {
  return { nextWorkoutIndex: 0, sessions: [] }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

// Index into WORKOUT_ROTATION for the next workout to perform
export function getNextWorkoutIndex() {
  return load().nextWorkoutIndex % WORKOUT_ROTATION.length
}

// Most recent set entries for a given exercise + side ('main' | 'left' | 'right').
// Searches all sessions in reverse so cross-workout exercises (e.g. rdl in B1 and B2)
// always pull from whichever session was most recent.
export function getLastSets(exerciseId, side) {
  const { sessions } = load()
  for (let i = sessions.length - 1; i >= 0; i--) {
    const data = sessions[i].sets?.[exerciseId]?.[side]
    if (data?.length) return data
  }
  return null
}

// Persist a completed session and advance rotation based on what was actually completed,
// so manually selecting a different workout keeps the sequence coherent.
export function saveSession(workoutId, sets) {
  const state = load()
  state.sessions.push({
    id: Date.now().toString(),
    workoutId,
    date: new Date().toISOString().slice(0, 10),
    sets,
  })
  const completedIndex = WORKOUT_ROTATION.indexOf(workoutId)
  state.nextWorkoutIndex = (completedIndex + 1) % WORKOUT_ROTATION.length
  save(state)
}

// Merge sessions from a CSV import. Sessions already on this device are skipped: matched by id, or by
// date + workout when the file has no session ids. Keeps sessions in chronological order (getLastSets
// relies on it) and points the rotation at the workout after the most recent session.
export function importSessions(incoming) {
  const state = load()
  const ids = new Set(state.sessions.map(s => s.id))
  const dayKeys = new Set(state.sessions.map(s => `${s.date}|${s.workoutId}`))
  let added = 0
  let duplicates = 0
  for (const session of incoming) {
    const dayKey = `${session.date}|${session.workoutId}`
    if (session.id ? ids.has(session.id) : dayKeys.has(dayKey)) {
      duplicates++
      continue
    }
    let id = session.id
    if (!id) {
      // No id in the file — derive one from the date, nudged until unique
      let t = new Date(`${session.date}T12:00:00`).getTime()
      while (ids.has(String(t))) t++
      id = String(t)
    }
    state.sessions.push({ ...session, id })
    ids.add(id)
    dayKeys.add(dayKey)
    added++
  }
  if (added > 0) {
    state.sessions.sort((a, b) => a.date.localeCompare(b.date) || Number(a.id) - Number(b.id))
    const lastIndex = WORKOUT_ROTATION.indexOf(state.sessions.at(-1).workoutId)
    state.nextWorkoutIndex = (lastIndex + 1) % WORKOUT_ROTATION.length
    save(state)
  }
  return { added, duplicates }
}

// All sessions newest-first, for the history view
export function getAllSessions() {
  return [...load().sessions].reverse()
}

// Rep range overrides — { [exerciseId]: [lo, hi] }
export function getRepRangeOverrides() {
  return load().repRangeOverrides ?? {}
}

export function saveRepRangeOverride(exerciseId, range) {
  const state = load()
  state.repRangeOverrides = { ...(state.repRangeOverrides ?? {}), [exerciseId]: range }
  save(state)
}

// Best set per exercise per side across all sessions.
// Weight-based: highest weight (ties broken by reps). Time-based: longest hold.
export function getPersonalRecords() {
  const { sessions } = load()
  const records = {}
  for (const session of sessions) {
    for (const [exId, sides] of Object.entries(session.sets)) {
      if (!records[exId]) records[exId] = {}
      for (const [side, sets] of Object.entries(sides)) {
        for (const set of sets) {
          if ('seconds' in set) {
            if (set.seconds != null) {
              const cur = records[exId][side]
              if (!cur || set.seconds > cur.seconds) records[exId][side] = { seconds: set.seconds }
            }
          } else {
            if (set.weight != null && set.reps != null) {
              const cur = records[exId][side]
              if (!cur || set.weight > cur.weight || (set.weight === cur.weight && set.reps > cur.reps))
                records[exId][side] = { weight: set.weight, reps: set.reps }
            }
          }
        }
      }
    }
  }
  return records
}

export function clearRepRangeOverride(exerciseId) {
  const state = load()
  if (state.repRangeOverrides) {
    delete state.repRangeOverrides[exerciseId]
    save(state)
  }
}

const DRAFT_KEY = 'wt-v1-draft'

export function saveDraft(workoutIndex, sets, workoutStart = null, lastSetAt = {}, capSets = false, equipment = {}) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ workoutIndex, sets, workoutStart, lastSetAt, capSets, equipment }))
}

export function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY))
  } catch {
    return null
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}
