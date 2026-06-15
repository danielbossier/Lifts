import ExerciseCard from './ExerciseCard'

export default function MuscleGroupSection({ muscleGroup, exercises, sets, goals, onUpdateSet }) {
  return (
    <section className="muscle-section">
      <h2 className="muscle-label">{muscleGroup.toUpperCase()}</h2>
      {exercises.map(ex => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={sets[ex.id]}
          goals={goals[ex.id]}
          onUpdateSet={(side, setIndex, field, value) =>
            onUpdateSet(ex.id, side, setIndex, field, value)
          }
        />
      ))}
    </section>
  )
}
