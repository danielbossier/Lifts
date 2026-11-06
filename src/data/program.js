// tracking: 'normal' | 'perArm' | 'perLeg' | 'perSide' | 'time' | 'timePerSide'
// maxWeight (optional): heaviest available load — weight auto-increment stops here and goals progress reps instead
// hidden (optional): left out of the workout and Settings, but past logs still show in History/Records/CSV
// barbell (optional): { id, name } of a barbell alternative selectable per session. It has its own id so its
//   history/goals/PRs stay separate from the dumbbell version, shares the base exercise's rep range, and has no maxWeight.
const DB_MAX_WEIGHT = 100

export const WORKOUTS = [
  {
    id: 'A1',
    label: 'A1 – Upper',
    exercises: [
      {
        id: 'flat-db-press',
        name: 'Flat Dumbbell Press',
        muscleGroup: 'Chest',
        sets: 3,
        repRange: [5, 7],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
        barbell: { id: 'flat-bb-press', name: 'Flat Barbell Press' },
      },
      {
        id: 'pull-up',
        name: 'Weighted Pull Up',
        muscleGroup: 'Back',
        sets: 3,
        repRange: [5, 7],
        tracking: 'normal',
      },
      {
        id: 'seated-ohp',
        name: 'Seated Overhead Dumbbell Press',
        muscleGroup: 'Shoulders',
        sets: 3,
        repRange: [5, 7],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'incline-db-row',
        name: 'Cable Row',
        muscleGroup: 'Back',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'incline-db-curl',
        name: 'Close Grip Pull-Down',
        muscleGroup: 'Biceps',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'incline-db-fly',
        name: 'Incline Dumbbell Fly',
        muscleGroup: 'Chest',
        sets: 2,
        repRange: [8, 10],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'face-pull',
        name: 'Face Pull',
        muscleGroup: 'Rear Delts',
        sets: 2,
        repRange: [10, 12],
        tracking: 'normal',
      },
      {
        id: 'overhead-cable-ext',
        name: 'Skull Crushers',
        muscleGroup: 'Triceps',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'straight-plank',
        name: 'Straight Plank',
        muscleGroup: 'Abs',
        sets: 2,
        repRange: [20, 60],
        tracking: 'time',
      },
      {
        id: 'side-plank',
        name: 'Side Plank',
        muscleGroup: 'Abs',
        sets: 1,
        repRange: [20, 60],
        tracking: 'timePerSide',
      },
    ],
  },
  {
    id: 'B',
    label: 'B – Lower',
    exercises: [
      {
        id: 'bulgarian-split-squat',
        name: 'Bulgarian Split Squat',
        muscleGroup: 'Quads',
        sets: 3,
        repRange: [5, 7],
        tracking: 'perLeg',
      },
      {
        id: 'rdl',
        name: 'Romanian Dumbbell Deadlift',
        muscleGroup: 'Hamstrings',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'db-step-up',
        name: 'Leg Extension',
        muscleGroup: 'Quads',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'lying-db-curl',
        name: 'Lying Dumbbell Leg Curl',
        muscleGroup: 'Hamstrings',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'calf-raise-lp',
        name: 'Calf Raise',
        muscleGroup: 'Calves',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'copenhagen-plank',
        name: 'Copenhagen Side Plank',
        muscleGroup: 'Glutes',
        sets: 2,
        repRange: [20, 60],
        tracking: 'timePerSide',
      },
    ],
  },
  {
    id: 'A2',
    label: 'A2 – Upper',
    exercises: [
      {
        id: 'incline-db-press',
        name: 'Incline Dumbbell Press',
        muscleGroup: 'Chest',
        sets: 3,
        repRange: [5, 7],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
        barbell: { id: 'incline-bb-press', name: 'Incline Barbell Press' },
      },
      {
        id: 'one-arm-db-row',
        name: 'One-Arm Dumbbell Row',
        muscleGroup: 'Back',
        sets: 3,
        repRange: [5, 7],
        tracking: 'perArm',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'flat-db-fly',
        name: 'Flat Dumbbell Fly',
        muscleGroup: 'Chest',
        sets: 2,
        repRange: [8, 10],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'vbar-pulldown',
        name: 'Cable Pulldown',
        muscleGroup: 'Back',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'incline-lateral-raise',
        name: 'Seated Lateral Raise',
        muscleGroup: 'Shoulders',
        sets: 3,
        repRange: [10, 12],
        tracking: 'perArm',
      },
      {
        id: 'supinating-curl',
        name: 'EZ Bar Curl',
        muscleGroup: 'Biceps',
        sets: 3,
        repRange: [5, 7],
        tracking: 'normal',
      },
      {
        id: 'rope-pushdown',
        name: 'Rope Pushdown',
        muscleGroup: 'Triceps',
        sets: 3,
        repRange: [8, 10],
        tracking: 'normal',
      },
      {
        id: 'db-shrug',
        name: 'Dumbbell Shrug',
        muscleGroup: 'Traps',
        sets: 2,
        repRange: [8, 10],
        tracking: 'normal',
        maxWeight: DB_MAX_WEIGHT,
      },
      {
        id: 'rope-crunch',
        name: 'Kneeling Rope Crunch',
        muscleGroup: 'Abs',
        sets: 2,
        repRange: [10, 12],
        tracking: 'normal',
      },
      {
        id: 'hanging-leg-raise',
        name: 'Hanging Leg Raise',
        muscleGroup: 'Abs',
        sets: 1,
        repRange: [10, 12],
        tracking: 'normal',
        hidden: true,
      },
    ],
  },
]

export const WORKOUT_ROTATION = ['A1', 'B', 'A2']

export function getWorkoutById(id) {
  return WORKOUTS.find(w => w.id === id)
}

// Resolve an exercise to the chosen equipment ('dumbbell' | 'barbell').
// Exercises with a barbell option get baseId (the dumbbell id, used for rep range overrides) and equipment set.
export function resolveEquipment(ex, equipment = 'dumbbell') {
  if (!ex.barbell) return ex
  if (equipment !== 'barbell') return { ...ex, baseId: ex.id, equipment: 'dumbbell' }
  return { ...ex, ...ex.barbell, maxWeight: undefined, baseId: ex.id, equipment: 'barbell' }
}

// Every equipment variant of an exercise — for views that list logged data across all variants
export function getExerciseVariants(ex) {
  return ex.barbell ? [resolveEquipment(ex, 'dumbbell'), resolveEquipment(ex, 'barbell')] : [ex]
}
