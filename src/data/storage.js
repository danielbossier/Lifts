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
  return load().nextWorkoutIndex
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

export function clearRepRangeOverride(exerciseId) {
  const state = load()
  if (state.repRangeOverrides) {
    delete state.repRangeOverrides[exerciseId]
    save(state)
  }
}

const DRAFT_KEY = 'wt-v1-draft'

export function saveDraft(workoutIndex, sets) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ workoutIndex, sets }))
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
