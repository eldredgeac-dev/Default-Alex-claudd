import type { WorkoutSession, ExerciseLog, ProgressionSuggestion } from '../types';
import { EXERCISES } from './exercises';

/**
 * Brzycki formula: 1RM = weight × (36 / (37 - reps))
 * Valid for reps <= 36
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 2; // fallback
  return weight * (36 / (37 - reps));
}

/** Calculate total volume for a single exercise log: sum(sets × reps × weight) */
export function exerciseVolume(log: ExerciseLog): number {
  return log.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/** Total session volume across all exercises */
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

/** Get the last N workouts sorted by date descending */
export function getRecentWorkouts(workouts: WorkoutSession[], n: number): WorkoutSession[] {
  return [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

/** Get exercise logs from recent workouts for a specific exercise */
export function getExerciseHistory(workouts: WorkoutSession[], exerciseId: string): { date: string; log: ExerciseLog }[] {
  return workouts
    .filter(w => w.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(w => ({
      date: w.date,
      log: w.exercises.find(e => e.exerciseId === exerciseId)!,
    }));
}

/** Check if all sets hit the top of the rep range */
function allSetsAtMax(log: ExerciseLog, maxReps: number): boolean {
  return log.sets.length > 0 && log.sets.every(s => s.reps >= maxReps);
}

/** Check for declining performance (weight or reps dropping) */
function isDecline(history: { log: ExerciseLog }[]): boolean {
  if (history.length < 3) return false;
  const recent = history.slice(0, 3);
  // Check if the average weight or reps have declined across last 3 sessions
  const avgWeights = recent.map(h => {
    const totalW = h.log.sets.reduce((s, set) => s + set.weight, 0);
    return totalW / h.log.sets.length;
  });
  const avgReps = recent.map(h => {
    const totalR = h.log.sets.reduce((s, set) => s + set.reps, 0);
    return totalR / h.log.sets.length;
  });
  return (avgWeights[0] < avgWeights[2] && avgReps[0] <= avgReps[2]);
}

/** Generate all progression suggestions based on workout history */
export function generateProgressionSuggestions(workouts: WorkoutSession[]): ProgressionSuggestion[] {
  const suggestions: ProgressionSuggestion[] = [];
  if (workouts.length === 0) return suggestions;

  for (const exercise of EXERCISES) {
    const history = getExerciseHistory(workouts, exercise.id);
    if (history.length === 0) continue;

    const latest = history[0];
    const latestWeight = latest.log.sets[0]?.weight ?? 0;

    // Bench press special progression: all 3 sets hit 8 reps → +5 lbs
    if (exercise.isMainLift) {
      if (allSetsAtMax(latest.log, exercise.maxReps)) {
        suggestions.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          type: 'increase',
          message: `You hit ${latest.log.sets.map(s => s.reps).join('-')} on ${exercise.name} at ${latestWeight} lbs. Try ${latestWeight + 5} lbs next session.`,
          priority: 'high',
        });
      }
    } else {
      // Other exercises: both sets hit top of rep range → increase weight
      if (allSetsAtMax(latest.log, exercise.maxReps)) {
        // Check if they've been at max for multiple sessions
        const sessionsAtMax = history.filter(h => allSetsAtMax(h.log, exercise.maxReps)).length;
        const newWeight = latestWeight + exercise.incrementLbs;

        if (sessionsAtMax >= 3) {
          suggestions.push({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            type: 'increase',
            message: `${exercise.name}: you've hit ${exercise.maxReps} reps for ${sessionsAtMax} sessions in a row. Increase to ${newWeight} lbs.`,
            priority: 'high',
          });
        } else {
          suggestions.push({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            type: 'increase',
            message: `${exercise.name}: all sets hit ${exercise.maxReps} reps at ${latestWeight} lbs. Try ${newWeight} lbs next session.`,
            priority: 'medium',
          });
        }
      }
    }

    // Plateau detection: same weight for 4+ sessions without hitting max reps
    if (history.length >= 4) {
      const last4Weights = history.slice(0, 4).map(h => h.log.sets[0]?.weight ?? 0);
      const allSame = last4Weights.every(w => w === last4Weights[0]);
      const neverMaxed = history.slice(0, 4).every(h => !allSetsAtMax(h.log, exercise.maxReps));

      if (allSame && neverMaxed && latestWeight > 0) {
        suggestions.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          type: 'plateau',
          message: `Your ${exercise.name} hasn't progressed in 4 weeks but reps aren't at max. Consider adding weight or switching variations.`,
          priority: 'medium',
        });
      }
    }

    // Deload detection
    if (isDecline(history)) {
      suggestions.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        type: 'deload',
        message: `${exercise.name} weight/reps declining for 2+ sessions. Consider a deload week or check recovery (sleep/nutrition).`,
        priority: 'high',
      });
    }
  }

  // Form reminders for bench
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length > 0) {
    suggestions.push({
      exerciseId: 'bench-press',
      exerciseName: 'Bench Press',
      type: 'form',
      message: 'Keep 1-2 reps in reserve on bench press to avoid failure.',
      priority: 'low',
    });
  }

  return suggestions;
}

/** Get the last workout data for an exercise to pre-populate */
export function getLastWorkoutForExercise(workouts: WorkoutSession[], exerciseId: string): ExerciseLog | null {
  const history = getExerciseHistory(workouts, exerciseId);
  return history.length > 0 ? history[0].log : null;
}

/** Calculate estimated 1RM progression for bench press */
export function getBenchE1RMHistory(workouts: WorkoutSession[]): { date: string; e1rm: number }[] {
  const history = getExerciseHistory(workouts, 'bench-press');
  return history.map(h => {
    // Use the best set (highest estimated 1RM) from the session
    const best = Math.max(...h.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)));
    return { date: h.date, e1rm: Math.round(best * 10) / 10 };
  }).reverse(); // chronological order
}
