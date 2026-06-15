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

Personal workout tracker — static site deployed to GitHub Pages. No backend. All data persists in `localStorage`. Single user, no auth.

The program is a fixed 4-workout Upper/Lower rotation: **A1 → B1 → A2 → B2 → repeat**. The workouts are fully hardcoded in `src/data/program.js` and are not user-editable, with the exception of per-exercise rep ranges.

## Architecture

### Data layer (`src/data/program.js`)

Single source of truth for all exercises. Each exercise has a `tracking` field that drives every downstream decision — which set row component renders, how state is shaped, and how localStorage will store logs:

| `tracking` value | Meaning | Set state shape |
|---|---|---|
| `normal` | both sides together, weight + reps | `{ main: [{weight, reps}] }` |
| `perArm` | left/right independently, weight + reps | `{ left: [{weight, reps}], right: [{weight, reps}] }` |
| `perLeg` | same as perArm | same |
| `time` | timed hold, no weight | `{ main: [{seconds}] }` |
| `timePerSide` | timed hold, left/right independently | `{ left: [{seconds}], right: [{seconds}] }` |

`repRange: [lo, hi]` — for time-based exercises this is seconds, not reps. `lo` is used as the initial goal value.

The same `exercise.id` (e.g. `'rdl'`) appears in multiple workouts (B1 and B2 both have `'rdl'`). When the localStorage layer is implemented, goal rep lookup should search across all sessions for that exercise id regardless of which workout day it appeared in.

### State shape in `WorkoutView`

`buildInitialSets(exercises)` constructs the in-progress session state, keyed by `exercise.id` then by side (`'main'`, `'left'`, or `'right'`):

```js
sets = {
  'rdl':    { main:  [{ weight: '', reps: '' }, ...] },
  'incline-db-curl': { left: [...], right: [...] },
  'straight-plank':  { main: [{ seconds: '' }, ...] },
}
```

`updateSet(exerciseId, side, setIndex, field, value)` — `side` is `null` for `normal`/`time` (stored under `'main'`), or `'left'`/`'right'` for bilateral exercises.

### Component routing

`ExerciseCard` reads `exercise.tracking` and renders one of four set-row components:
- `NormalSetRow` — weight + reps + goal
- `PerSideSetRow` — renders two rows (L/R) per set, each with weight + reps + goal
- `TimeSetRow` — seconds + goal (no weight)
- `TimePerSideSetRow` — renders two rows (L/R) per set, each with seconds + goal

CSS grid columns for the set tables are defined in `index.css` using `:has()` selectors that target the column class names present in each row.

### Styling

Single CSS file at `src/index.css`. Dark theme via CSS custom properties on `:root`. Mobile-first, max-width 480px centered. Tab bar is fixed-height at bottom (`--tab-height: 56px`), content area scrolls above it.

### What is not yet implemented

- **localStorage layer**: workout rotation tracking (which workout is next), session saving/loading
- **Progressive overload logic**: goal reps currently hardcode `repRange[0]`; real implementation should look up the most recent `SetLog` for the same `exercise.id` and compute goal from previous weight + actual reps
- **Complete Workout button**: needs to serialize `sets` state into a session and persist to localStorage
- **History view**: list past sessions
- **Settings view**: per-exercise rep range editing

## Deployment

GitHub Pages via static build. `vite.config.js` sets `base: './'` for relative asset paths. The `dist/` folder is the deployable artifact.
