import type { WorkoutSession, ExerciseLog, SetLog, ProgressionSuggestion } from '../types';
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

// --- Smart target computation ---

export interface ExerciseTarget {
  exerciseId: string;
  targetWeight: number;
  targetMinReps: number;
  targetMaxReps: number;
  lastSession: { weight: number; reps: number }[] | null; // per-set last time
  action: 'progress' | 'match' | 'deload' | 'first_time';
  actionMessage: string;
  /** How many sessions in a row at the same weight */
  sessionsAtWeight: number;
  /** Best ever set (weight x reps) for this exercise */
  bestEver: { weight: number; reps: number; e1rm: number } | null;
}

/**
 * Compute a smart target for every exercise in the program.
 * - No history: first_time, suggest starting conservative
 * - All sets hit maxReps: progress (bump weight by increment)
 * - Declining 3 sessions: deload to 85%
 * - Otherwise: match weight, push for more reps to unlock progression
 */
export function computeExerciseTargets(workouts: WorkoutSession[]): ExerciseTarget[] {
  return EXERCISES.map(exercise => {
    const history = getExerciseHistory(workouts, exercise.id);

    if (history.length === 0) {
      return {
        exerciseId: exercise.id,
        targetWeight: 0,
        targetMinReps: exercise.minReps,
        targetMaxReps: exercise.maxReps,
        lastSession: null,
        action: 'first_time' as const,
        actionMessage: 'First time — start light, nail form',
        sessionsAtWeight: 0,
        bestEver: null,
      };
    }

    const latest = history[0];
    const latestWeight = latest.log.sets[0]?.weight ?? 0;
    const lastSets = latest.log.sets.map(s => ({ weight: s.weight, reps: s.reps }));

    // Best ever set across all history
    let bestEver: { weight: number; reps: number; e1rm: number } | null = null;
    for (const h of history) {
      for (const s of h.log.sets) {
        const e1rm = estimateOneRepMax(s.weight, s.reps);
        if (!bestEver || e1rm > bestEver.e1rm) {
          bestEver = { weight: s.weight, reps: s.reps, e1rm: Math.round(e1rm) };
        }
      }
    }

    // Sessions at same weight
    let sessionsAtWeight = 0;
    for (const h of history) {
      if (h.log.sets[0]?.weight === latestWeight) sessionsAtWeight++;
      else break;
    }

    // Deload check
    if (isDecline(history)) {
      const deloadWeight = Math.round(latestWeight * 0.85 / 5) * 5;
      return {
        exerciseId: exercise.id,
        targetWeight: Math.max(0, deloadWeight),
        targetMinReps: exercise.minReps,
        targetMaxReps: exercise.maxReps,
        lastSession: lastSets,
        action: 'deload' as const,
        actionMessage: `Deload to ${deloadWeight} lbs — focus on form and tempo`,
        sessionsAtWeight,
        bestEver,
      };
    }

    // Progress: all sets hit top of rep range
    if (allSetsAtMax(latest.log, exercise.maxReps)) {
      const newWeight = latestWeight + exercise.incrementLbs;
      return {
        exerciseId: exercise.id,
        targetWeight: newWeight,
        targetMinReps: exercise.minReps,
        targetMaxReps: exercise.maxReps,
        lastSession: lastSets,
        action: 'progress' as const,
        actionMessage: `Go up! ${latestWeight} → ${newWeight} lbs (+${exercise.incrementLbs})`,
        sessionsAtWeight,
        bestEver,
      };
    }

    // Match: same weight, push reps
    const avgReps = Math.round(lastSets.reduce((s, set) => s + set.reps, 0) / lastSets.length);
    const repsToGo = exercise.maxReps - avgReps;
    return {
      exerciseId: exercise.id,
      targetWeight: latestWeight,
      targetMinReps: exercise.minReps,
      targetMaxReps: exercise.maxReps,
      lastSession: lastSets,
      action: 'match' as const,
      actionMessage: repsToGo > 0
        ? `${latestWeight} lbs — push for ${repsToGo <= 2 ? `${exercise.maxReps} reps to unlock +${exercise.incrementLbs} lbs` : 'more reps'}`
        : `${latestWeight} lbs — match or beat last time`,
      sessionsAtWeight,
      bestEver,
    };
  });
}

/**
 * Compare current in-progress set data vs last session for live feedback.
 * Returns: 'beating' | 'matching' | 'under' | 'no_data'
 */
export function compareToLast(
  currentSets: SetLog[],
  lastSets: { weight: number; reps: number }[] | null
): { status: 'beating' | 'matching' | 'under' | 'no_data'; detail: string } {
  if (!lastSets || lastSets.length === 0) return { status: 'no_data', detail: '' };

  // Only compare sets that have been filled in
  const filledSets = currentSets.filter(s => s.weight > 0 && s.reps > 0);
  if (filledSets.length === 0) return { status: 'no_data', detail: '' };

  let currentVol = 0;
  let lastVol = 0;
  for (let i = 0; i < filledSets.length; i++) {
    currentVol += filledSets[i].weight * filledSets[i].reps;
    if (lastSets[i]) {
      lastVol += lastSets[i].weight * lastSets[i].reps;
    }
  }

  if (lastVol === 0) return { status: 'no_data', detail: '' };

  const diff = currentVol - lastVol;
  const pct = Math.round((diff / lastVol) * 100);

  if (diff > 0) return { status: 'beating', detail: `+${pct}% vs last` };
  if (diff === 0) return { status: 'matching', detail: 'Matching last session' };
  return { status: 'under', detail: `${pct}% vs last` };
}

/** Calculate training streak — consecutive weeks with 2+ sessions */
export function getTrainingStreak(workouts: WorkoutSession[]): { currentWeeks: number; longestWeeks: number; thisWeekCount: number } {
  if (workouts.length === 0) return { currentWeeks: 0, longestWeeks: 0, thisWeekCount: 0 };

  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));

  // Group workouts by ISO week
  const weekMap = new Map<string, number>();
  for (const w of sorted) {
    const d = new Date(w.date);
    // Get Monday-based week key
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    const weekKey = monday.toISOString().split('T')[0];
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
  }

  const weeks = [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

  // Current week
  const now = new Date();
  const nowDay = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((nowDay + 6) % 7));
  const thisWeekKey = thisMonday.toISOString().split('T')[0];
  const thisWeekCount = weekMap.get(thisWeekKey) ?? 0;

  // Count streak backwards from most recent completed week (2+ sessions = active week)
  let current = 0;
  let longest = 0;
  let streak = 0;

  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].count >= 2) {
      streak++;
    } else {
      if (streak > longest) longest = streak;
      // If this is the most recent week and it's the current partial week, skip it
      if (i === weeks.length - 1 && weeks[i].key === thisWeekKey) {
        continue;
      }
      if (current === 0) current = streak;
      streak = 0;
    }
  }
  if (streak > longest) longest = streak;
  if (current === 0) current = streak;

  return { currentWeeks: current, longestWeeks: longest, thisWeekCount };
}

/** Detect personal records set in the most recent session */
export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'e1rm' | 'volume';
  value: number;
  previousBest: number;
}

export function detectRecentPRs(workouts: WorkoutSession[]): PersonalRecord[] {
  if (workouts.length < 2) return [];

  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const older = sorted.slice(1);
  const prs: PersonalRecord[] = [];

  for (const ex of latest.exercises) {
    const exDef = EXERCISES.find(e => e.id === ex.exerciseId);
    if (!exDef) continue;

    // Best weight in latest session
    const latestMaxWeight = Math.max(...ex.sets.filter(s => s.reps > 0).map(s => s.weight), 0);
    // Best e1rm in latest session
    const latestMaxE1RM = Math.max(...ex.sets.filter(s => s.reps > 0 && s.weight > 0).map(s => estimateOneRepMax(s.weight, s.reps)), 0);
    // Total volume in latest session
    const latestVol = ex.sets.reduce((s, set) => s + set.weight * set.reps, 0);

    // Find previous bests
    let prevMaxWeight = 0;
    let prevMaxE1RM = 0;
    let prevMaxVol = 0;

    for (const w of older) {
      const prevEx = w.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (!prevEx) continue;
      const pw = Math.max(...prevEx.sets.filter(s => s.reps > 0).map(s => s.weight), 0);
      const pe = Math.max(...prevEx.sets.filter(s => s.reps > 0 && s.weight > 0).map(s => estimateOneRepMax(s.weight, s.reps)), 0);
      const pv = prevEx.sets.reduce((s, set) => s + set.weight * set.reps, 0);
      if (pw > prevMaxWeight) prevMaxWeight = pw;
      if (pe > prevMaxE1RM) prevMaxE1RM = pe;
      if (pv > prevMaxVol) prevMaxVol = pv;
    }

    // Only count as PR if there's prior data to compare against
    if (prevMaxWeight > 0 && latestMaxWeight > prevMaxWeight) {
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: exDef.name,
        type: 'weight',
        value: latestMaxWeight,
        previousBest: prevMaxWeight,
      });
    } else if (prevMaxE1RM > 0 && latestMaxE1RM > prevMaxE1RM * 1.02) {
      // e1rm PR requires 2%+ improvement to avoid noise
      prs.push({
        exerciseId: ex.exerciseId,
        exerciseName: exDef.name,
        type: 'e1rm',
        value: Math.round(latestMaxE1RM),
        previousBest: Math.round(prevMaxE1RM),
      });
    }
  }

  return prs;
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
