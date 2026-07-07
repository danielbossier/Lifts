# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

No test suite or linter is configured.

## Project Overview

Personal workout tracker — static site deployed to GitHub Pages. No backend. All data persists in `localStorage` under the key `wt-v1`. Single user, no auth.

The program is a fixed 3-workout Upper/Lower rotation: **A1 → B → A2 → repeat**. The workouts are fully hardcoded in `src/data/program.js` and are not user-editable, with the exception of per-exercise rep ranges (stored as overrides in localStorage).

## Architecture

### Data layer (`src/data/program.js`)

Single source of truth for all exercises. Each exercise has a `tracking` field that drives every downstream decision — which set row component renders, how state is shaped, and how localStorage stores logs:

| `tracking` value | Meaning | Set state shape |
|---|---|---|
| `normal` | both sides together, weight + reps | `{ main: [{weight, reps}] }` |
| `perArm` | left/right independently, weight + reps | `{ left: [{weight, reps}], right: [{weight, reps}] }` |
| `perLeg` | same as perArm | same |
| `time` | timed hold, no weight | `{ main: [{seconds}] }` |
| `timePerSide` | timed hold, left/right independently | `{ left: [{seconds}], right: [{seconds}] }` |

`repRange: [lo, hi]` — for time-based exercises this is seconds, not reps. `lo` is the fallback goal when there is no history.

`exercise.id` is stable across workouts — `getLastSets` searches all sessions in reverse so history is shared across days for the same exercise.

### Storage layer (`src/data/storage.js`)

All localStorage access goes through this module. The stored object shape:

```js
{
  nextWorkoutIndex: 0,          // 0–2, index into WORKOUT_ROTATION
  sessions: [
    {
      id: '1718483200000',      // Date.now() string
      workoutId: 'A1',
      date: '2026-06-15',
      sets: {
        'flat-db-press': { main: [{ weight: 135, reps: 7 }, ...] },
        'incline-db-curl': { left: [...], right: [...] },
        'straight-plank': { main: [{ seconds: 45 }, ...] },
      }
    }
  ],
  repRangeOverrides: {          // only present when user has changed a range
    'flat-db-press': [8, 12],
  }
}
```

Key functions:
- `getNextWorkoutIndex()` — which workout is up next in rotation; clamps with `% WORKOUT_ROTATION.length` to guard against stale localStorage values
- `getLastSets(exerciseId, side)` — most recent set entries for an exercise+side, searched newest-first across all sessions
- `saveSession(workoutId, sets)` — persists the session and advances `nextWorkoutIndex` based on the workout that was *actually completed* (not just `+1`), so manually selecting an out-of-order workout keeps the rotation coherent
- `getRepRangeOverrides()` / `saveRepRangeOverride(id, [lo, hi])` / `clearRepRangeOverride(id)` — rep range customization
- `getPersonalRecords()` — scans all sessions and returns the best set per exercise per side: highest weight (ties broken by reps) for weight-based, longest hold for time-based
- `saveDraft(workoutIndex, sets, workoutStart)` / `loadDraft()` / `clearDraft()` — persists in-progress workout state (including workout timer start timestamp) so a page refresh doesn't lose data

### WorkoutView (`src/views/WorkoutView.jsx`)

Core logic lives here. On each render, exercises are resolved by merging rep range overrides into the hardcoded data (`resolveExercises`), then:

- `buildInitialSets(exercises)` — constructs blank set state, pre-filling weight from the most recent session for that exercise+side; auto-increments weight by 5 if last reps hit the top of the range
- `computeGoals(exercises)` — per-set goal values derived from last session:
  - Rep-based: last reps ≥ hi (weight just bumped) → goal = lo; last reps ≥ lo → goal = hi; otherwise → lo; no history → lo
  - Time-based: last seconds + 5, capped at hi; no history → lo
- Goals are computed fresh each render (reads localStorage) — they don't need to be state

**Draft validation:** When loading a draft, the code checks that every exercise in the current workout has a corresponding entry in `draft.sets`. If any are missing (e.g. stale draft from a previous program structure), the draft is discarded and sets are rebuilt from history. This prevents crashes when the program changes.

**Workout timer:** Starts when the first set is logged. The start timestamp (`workoutStart`) is persisted in the draft so the timer survives page refreshes. Displayed in the header next to the date. Resets when switching workouts or starting the next workout.

**Workout selector:** A pill row in the header lets the user pick any of the 3 workouts. The rotation's suggested next workout is indicated with a green dot. Switching pills resets `sets` state via `selectWorkout(index)`.

**Complete Workout:** Normalizes string inputs to numbers (empty → `null`), calls `saveSession`, then shows a completion screen with a button to initialize the next workout.

### Component routing

`ExerciseCard` receives `exercise`, `sets[ex.id]`, and `goals[ex.id]`, then renders one of four set-row components based on `exercise.tracking`:
- `NormalSetRow` — weight + reps + goal
- `PerSideSetRow` — two rows (L/R) per set, weight + reps + separate L/R goals
- `TimeSetRow` — seconds + goal (no weight)
- `TimePerSideSetRow` — two rows (L/R) per set, seconds + separate L/R goals

Goals flow as `goals[ex.id] = { main: [n, n, n] }` or `{ left: [...], right: [...] }` — a per-set array per side, not a single value.

### Records view (`src/views/PRView.jsx`)

Displays personal records for every exercise, grouped by workout. For each exercise:
- Weight-based: shows best set as `weight × reps` (green) plus an estimated 1RM in blue using the Epley formula: `weight × (1 + reps / 30)`. 1RM is omitted when reps = 1.
- Time-based: shows longest hold in seconds. No 1RM estimate.
- Per-side exercises (perArm, perLeg, timePerSide): shows separate L and R records.

Data sourced from `getPersonalRecords()` in storage.js.

### Settings view (`src/views/SettingsView.jsx`)

Lists all unique exercises once (deduplicated by `exercise.id`, grouped under their first workout section). Each row shows the exercise name and two number inputs for `[lo, hi]`. Saves to localStorage on blur. Overridden ranges show in blue with a ↺ reset button. Clearing an override restores the hardcoded default.

### History view (`src/views/HistoryView.jsx`)

Lists sessions newest-first via `getAllSessions()`. Each session is a collapsible card showing the workout label and date. Expanding a card iterates `workout.exercises` in order and renders any logged sets.

Set data is formatted by `summariseSets(exSets, tracking)` which returns `[{ label, entries }]` — `label` is `''` for non-sided exercises or `'L'`/`'R'` for bilateral, and `entries` is an array of strings like `'50×7'` (reps) or `'45s'` (time). Exercises with no logged sets (all-null values) are skipped. The `·`-separated entries are rendered in a monospaced numeric font for easy scanning.

### Styling

Single CSS file at `src/index.css`. Dark theme via CSS custom properties on `:root`. Mobile-first, max-width 480px centered. Tab bar is fixed-height at bottom (`--tab-height: 56px`). Set table column grids are defined using CSS `:has()` selectors that target the column class names present in each row.

## Deployment

GitHub Pages via static build. `vite.config.js` sets `base: '/Lifts/'`. The `dist/` folder is the deployable artifact.
