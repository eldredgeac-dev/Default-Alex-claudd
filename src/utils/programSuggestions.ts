import type { WorkoutSession } from '../types';
import { EXERCISES } from './exercises';
import { getExerciseHistory, estimateOneRepMax } from './progression';

// --- Types ---

export type SuggestionGoal = 'aesthetics' | 'strength' | 'stall_buster';

export interface ProgramSuggestion {
  exerciseId: string;
  exerciseName: string;
  goal: SuggestionGoal;
  title: string;
  description: string;
  action: string; // specific thing to change
  priority: 'high' | 'medium' | 'low';
  icon: string; // visual indicator
}

export interface StallInfo {
  exerciseId: string;
  exerciseName: string;
  weeksAtWeight: number;
  currentWeight: number;
  avgReps: number;
  maxReps: number;
  trend: 'flat' | 'declining' | 'almost_there';
}

// --- Stall Detection ---

export function detectStalls(workouts: WorkoutSession[]): StallInfo[] {
  const stalls: StallInfo[] = [];

  for (const exercise of EXERCISES) {
    const history = getExerciseHistory(workouts, exercise.id);
    if (history.length < 4) continue;

    const recent = history.slice(0, 6);
    const latestWeight = recent[0].log.sets[0]?.weight ?? 0;
    if (latestWeight === 0) continue;

    // Count consecutive sessions at same weight
    let weeksAtWeight = 0;
    for (const h of recent) {
      if (h.log.sets[0]?.weight === latestWeight) weeksAtWeight++;
      else break;
    }

    if (weeksAtWeight < 4) continue;

    // Calculate average reps across recent sessions at this weight
    const repsArrays = recent
      .filter(h => h.log.sets[0]?.weight === latestWeight)
      .map(h => h.log.sets.reduce((s, set) => s + set.reps, 0) / h.log.sets.length);

    const avgReps = Math.round(repsArrays.reduce((s, r) => s + r, 0) / repsArrays.length);

    // Check if reps are trending (almost there vs flat vs declining)
    let trend: StallInfo['trend'] = 'flat';
    if (repsArrays.length >= 3) {
      const recentAvg = (repsArrays[0] + repsArrays[1]) / 2;
      const olderAvg = (repsArrays[repsArrays.length - 2] + repsArrays[repsArrays.length - 1]) / 2;
      if (recentAvg > olderAvg + 0.5) {
        trend = 'almost_there';
      } else if (recentAvg < olderAvg - 0.5) {
        trend = 'declining';
      }
    }

    // Check if hitting max reps already (not a stall, just needs progression)
    const hittingMax = recent[0].log.sets.every(s => s.reps >= exercise.maxReps);
    if (hittingMax) continue;

    stalls.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      weeksAtWeight,
      currentWeight: latestWeight,
      avgReps,
      maxReps: exercise.maxReps,
      trend,
    });
  }

  return stalls;
}

// --- Program Change Suggestions ---

export function generateProgramSuggestions(workouts: WorkoutSession[]): ProgramSuggestion[] {
  const suggestions: ProgramSuggestion[] = [];
  const stalls = detectStalls(workouts);

  // --- STALL-BUSTING SUGGESTIONS ---
  for (const stall of stalls) {
    const exercise = EXERCISES.find(e => e.id === stall.exerciseId);
    if (!exercise) continue;

    if (stall.trend === 'declining') {
      suggestions.push({
        exerciseId: stall.exerciseId,
        exerciseName: stall.exerciseName,
        goal: 'stall_buster',
        title: `${stall.exerciseName}: Deload & Reset`,
        description: `You've been at ${stall.currentWeight} lbs for ${stall.weeksAtWeight} sessions and reps are dropping. Your body needs a reset.`,
        action: `Drop to ${Math.round(stall.currentWeight * 0.85 / 5) * 5} lbs for 2 sessions, then build back. You'll blow past ${stall.currentWeight} the second time.`,
        priority: 'high',
        icon: 'deload',
      });
    } else if (stall.trend === 'almost_there') {
      suggestions.push({
        exerciseId: stall.exerciseId,
        exerciseName: stall.exerciseName,
        goal: 'stall_buster',
        title: `${stall.exerciseName}: Almost There`,
        description: `At ${stall.currentWeight} lbs for ${stall.weeksAtWeight} sessions but reps are creeping up (avg ${stall.avgReps}/${stall.maxReps}).`,
        action: `Stay the course — you're making micro-progress. Add a pause rep on the last set to push through. Target ${stall.maxReps} reps next session.`,
        priority: 'medium',
        icon: 'push',
      });
    } else {
      // Flat — suggest a change
      if (exercise.alternativeName) {
        suggestions.push({
          exerciseId: stall.exerciseId,
          exerciseName: stall.exerciseName,
          goal: 'stall_buster',
          title: `${stall.exerciseName}: Switch Variation`,
          description: `Stuck at ${stall.currentWeight} lbs x ${stall.avgReps} for ${stall.weeksAtWeight} sessions. A new stimulus can break through.`,
          action: `Try switching to ${exercise.alternativeName} for 3-4 weeks, then come back. Different angles recruit different motor units.`,
          priority: 'high',
          icon: 'swap',
        });
      } else {
        suggestions.push({
          exerciseId: stall.exerciseId,
          exerciseName: stall.exerciseName,
          goal: 'stall_buster',
          title: `${stall.exerciseName}: Change Rep Scheme`,
          description: `Flat at ${stall.currentWeight} lbs x ${stall.avgReps} for ${stall.weeksAtWeight} sessions. Time to shake it up.`,
          action: exercise.sets === 2
            ? `Try 3 sets of ${exercise.minReps} instead of 2 sets of ${exercise.minReps}-${exercise.maxReps}. More volume at the same weight often breaks plateaus.`
            : `Try a heavier single set of ${exercise.minReps - 1}-${exercise.minReps + 1}, then 2 sets of ${exercise.maxReps}. The heavy set primes your nervous system.`,
          priority: 'high',
          icon: 'scheme',
        });
      }
    }
  }

  // --- AESTHETICS SUGGESTIONS ---
  // Analyze which muscle groups might benefit from aesthetic-focused changes
  const exercisesWithHistory = EXERCISES.filter(ex => {
    const h = getExerciseHistory(workouts, ex.id);
    return h.length >= 3;
  });

  // Shoulder width (lateral raises are key for V-taper)
  const latRaiseHistory = getExerciseHistory(workouts, 'lateral-raises');
  if (latRaiseHistory.length >= 4) {
    const recent = latRaiseHistory.slice(0, 4);
    const avgReps = recent.reduce((s, h) =>
      s + h.log.sets.reduce((ss, set) => ss + set.reps, 0) / h.log.sets.length, 0
    ) / recent.length;

    if (avgReps < 15) {
      suggestions.push({
        exerciseId: 'lateral-raises',
        exerciseName: 'Lateral Raises',
        goal: 'aesthetics',
        title: 'Wider Shoulders: Raise the Reps',
        description: 'Lateral raises build the side delts that create shoulder width — the #1 aesthetic muscle for the V-taper.',
        action: 'Drop weight 20% and target 15-20 reps with a 2-second hold at the top. Lateral delts respond better to high reps and time under tension than heavy weight.',
        priority: 'medium',
        icon: 'aesthetic',
      });
    }
  }

  // Arms (higher frequency / volume for visual impact)
  const curlHistory = getExerciseHistory(workouts, 'curls');
  const tricepHistory = getExerciseHistory(workouts, 'tricep-extension');
  if (curlHistory.length >= 6 && tricepHistory.length >= 6) {
    const curlE1RM = estimateOneRepMax(
      curlHistory[0].log.sets[0]?.weight ?? 0,
      curlHistory[0].log.sets[0]?.reps ?? 0
    );
    const benchE1RM = EXERCISES.find(e => e.id === 'bench-press')
      ? estimateOneRepMax(
          getExerciseHistory(workouts, 'bench-press')[0]?.log.sets[0]?.weight ?? 0,
          getExerciseHistory(workouts, 'bench-press')[0]?.log.sets[0]?.reps ?? 0
        )
      : 0;

    if (benchE1RM > 0 && curlE1RM / benchE1RM < 0.25) {
      suggestions.push({
        exerciseId: 'curls',
        exerciseName: 'Curls',
        goal: 'aesthetics',
        title: 'Bigger Arms: Add Volume',
        description: 'Your curl strength is lagging compared to pressing. Arms respond well to extra volume — they recover fast.',
        action: 'Add a 3rd set of curls (drop set: do your normal weight, then immediately halve it and do 10 more reps). Also superset curls with tricep work to save time.',
        priority: 'medium',
        icon: 'aesthetic',
      });
    }
  }

  // Chest (bench focus for upper body aesthetics)
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length >= 6) {
    const recentE1RMs = benchHistory.slice(0, 3).map(h =>
      Math.max(...h.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)))
    );
    const olderE1RMs = benchHistory.slice(3, 6).map(h =>
      Math.max(...h.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)))
    );
    const recentAvg = recentE1RMs.reduce((a, b) => a + b, 0) / recentE1RMs.length;
    const olderAvg = olderE1RMs.reduce((a, b) => a + b, 0) / olderE1RMs.length;
    const growth = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (growth < 2 && !stalls.some(s => s.exerciseId === 'bench-press')) {
      suggestions.push({
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        goal: 'strength',
        title: 'Bench Press: Add a Heavy Single',
        description: `Your bench e1RM has grown only ${growth.toFixed(1)}% over the last 6 sessions. Strength-focused work can accelerate it.`,
        action: 'Start with 1 heavy set of 3-5 reps at RPE 8, then do your normal 3x5-8. The heavy opener builds neural drive without adding fatigue.',
        priority: 'medium',
        icon: 'strength',
      });
    }
  }

  // --- STRENGTH SUGGESTIONS ---
  // For main compound (bench), suggest periodization if intermediate+
  if (benchHistory.length >= 12) {
    const bestE1RM = Math.max(
      ...benchHistory.slice(0, 3).flatMap(h =>
        h.log.sets.map(s => estimateOneRepMax(s.weight, s.reps))
      )
    );
    const bodyweight = 185; // assumed

    if (bestE1RM >= bodyweight * 1.0) {
      suggestions.push({
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        goal: 'strength',
        title: 'Bench: Consider Periodization',
        description: 'You\'re past beginner level. Linear progression slows down here — planned variation keeps gains coming.',
        action: 'Try 3-week blocks: Week 1 = 3x8 (volume), Week 2 = 3x5 (strength), Week 3 = 3x3 (intensity). Then deload and repeat with +5 lbs.',
        priority: 'low',
        icon: 'strength',
      });
    }
  }

  // --- GENERAL PROGRAM SUGGESTIONS ---
  // Check overall volume trends
  if (workouts.length >= 12) {
    const gymWorkouts = workouts
      .filter(w => w.workoutType !== 'hotel')
      .sort((a, b) => b.date.localeCompare(a.date));

    if (gymWorkouts.length >= 8) {
      const recent4 = gymWorkouts.slice(0, 4);
      const older4 = gymWorkouts.slice(4, 8);
      const recentDur = recent4.filter(w => w.durationMinutes).map(w => w.durationMinutes!);
      const olderDur = older4.filter(w => w.durationMinutes).map(w => w.durationMinutes!);

      if (recentDur.length >= 2 && olderDur.length >= 2) {
        const avgRecent = recentDur.reduce((a, b) => a + b, 0) / recentDur.length;
        const avgOlder = olderDur.reduce((a, b) => a + b, 0) / olderDur.length;

        if (avgRecent > avgOlder + 10 && avgRecent > 55) {
          suggestions.push({
            exerciseId: '',
            exerciseName: 'Overall',
            goal: 'stall_buster',
            title: 'Sessions Getting Longer',
            description: `Your sessions have grown from ~${Math.round(avgOlder)} to ~${Math.round(avgRecent)} min. Longer doesn't mean better.`,
            action: 'Superset antagonist exercises: lat pulldown + bench, curls + tricep pushdowns, lateral raises + shrugs. This cuts 10-15 min while maintaining volume.',
            priority: 'medium',
            icon: 'efficiency',
          });
        }
      }
    }
  }

  // Suggest rep scheme variation for exercises that have been at the same scheme forever
  for (const ex of exercisesWithHistory) {
    const history = getExerciseHistory(workouts, ex.id);
    if (history.length < 8) continue;
    if (stalls.some(s => s.exerciseId === ex.id)) continue; // already covered

    // Check if weight has been slowly climbing (good) vs completely flat
    const weights = history.slice(0, 8).map(h => h.log.sets[0]?.weight ?? 0).filter(w => w > 0);
    if (weights.length < 6) continue;

    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);

    if (maxW === minW && maxW > 0) {
      // Totally flat but under the stall threshold (hitting max reps)
      suggestions.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        goal: 'stall_buster',
        title: `${ex.name}: Time to Progress`,
        description: `You've used ${maxW} lbs for 8+ sessions. Even though you're hitting your reps, your body has adapted to this load.`,
        action: `Force progression: add ${ex.incrementLbs} lbs even if reps drop by 1-2. A small jump with slightly fewer reps is still more stimulus than the same weight forever.`,
        priority: 'low',
        icon: 'push',
      });
    }
  }

  return suggestions;
}
