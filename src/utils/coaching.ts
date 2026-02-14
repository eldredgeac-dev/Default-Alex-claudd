import type { WorkoutSession, BodyMetric, UserConfig } from '../types';
import { LEG_PHASES, getExercisesForLegPhase } from './exercises';
import {
  getExerciseHistory,
  estimateOneRepMax,
  generateProgressionSuggestions,
} from './progression';
import { calculateTrendWeight, averageProtein } from './bodyMetrics';

// --- Types ---

export interface CoachingAdvice {
  category: 'workout_plan' | 'recovery' | 'nutrition' | 'technique' | 'mindset' | 'schedule' | 'travel' | 'legs';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export interface NextWorkoutPlan {
  exercises: {
    exerciseId: string;
    name: string;
    targetSets: number;
    targetWeight: number;
    targetReps: string; // e.g. "6-12"
    note: string;
  }[];
  warmupAdvice: string[];
  focusCues: string[];
  estimatedDuration: number; // minutes
}

export interface WeeklySchedule {
  days: {
    dayName: string;
    type: 'training' | 'rest' | 'active_recovery';
    note: string;
  }[];
}

export interface StrengthStandards {
  exercise: string;
  current: number;
  novice: number;
  intermediate: number;
  advanced: number;
  level: 'beginner' | 'novice' | 'intermediate' | 'advanced';
}

// --- Strength standards for a ~185lb 33-year-old male (bench press 1RM) ---

function getBenchLevel(e1rm: number, bodyweight: number): StrengthStandards {
  // Approximate standards relative to bodyweight for bench press
  const bw = bodyweight || 185;
  return {
    exercise: 'Bench Press',
    current: Math.round(e1rm),
    novice: Math.round(bw * 0.75),  // ~0.75x BW
    intermediate: Math.round(bw * 1.25), // ~1.25x BW
    advanced: Math.round(bw * 1.75), // ~1.75x BW
    level: e1rm >= bw * 1.75 ? 'advanced'
      : e1rm >= bw * 1.25 ? 'intermediate'
      : e1rm >= bw * 0.75 ? 'novice'
      : 'beginner',
  };
}

// --- Weekly schedule generator ---

export function generateWeeklySchedule(workouts: WorkoutSession[]): WeeklySchedule {
  // Determine preferred training days from history
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  for (const w of workouts.slice(-12)) {
    const day = new Date(w.date).getDay();
    dayCounts[day]++;
  }

  // Default 3-day schedule: Mon/Wed/Fri, or adapt to user's actual pattern
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let trainingDays: number[];

  const sorted = dayCounts.map((c, i) => ({ day: i, count: c })).sort((a, b) => b.count - a.count);
  if (workouts.length >= 6 && sorted[0].count >= 2) {
    // Use top 3 most-used days
    trainingDays = sorted.slice(0, 3).map(d => d.day).sort((a, b) => a - b);
  } else {
    trainingDays = [1, 3, 5]; // Mon, Wed, Fri default
  }

  return {
    days: dayNames.map((name, i) => {
      if (trainingDays.includes(i)) {
        return { dayName: name, type: 'training' as const, note: 'Full body session' };
      }
      // Day after training = active recovery
      const prevDay = (i + 6) % 7;
      if (trainingDays.includes(prevDay)) {
        return { dayName: name, type: 'active_recovery' as const, note: '20-30 min walk, stretching, foam roll' };
      }
      return { dayName: name, type: 'rest' as const, note: 'Full rest — prioritize sleep' };
    }),
  };
}

// --- Next workout plan generator ---

export function generateNextWorkoutPlan(workouts: WorkoutSession[], legPhase: number = 1): NextWorkoutPlan {
  const suggestions = generateProgressionSuggestions(workouts);
  const activeExercises = getExercisesForLegPhase(legPhase);

  const exercises = activeExercises.map(ex => {
    const history = getExerciseHistory(workouts, ex.id);
    const lastLog = history[0]?.log;
    const lastWeight = lastLog?.sets[0]?.weight ?? 0;
    const suggestion = suggestions.find(s => s.exerciseId === ex.id && s.type === 'increase');
    const deload = suggestions.find(s => s.exerciseId === ex.id && s.type === 'deload');

    let targetWeight = lastWeight;
    let note = '';

    if (deload) {
      targetWeight = Math.round(lastWeight * 0.85 / 5) * 5; // Deload: ~85% rounded to 5
      note = 'Deload — focus on form and controlled tempo';
    } else if (suggestion) {
      targetWeight = lastWeight + ex.incrementLbs;
      note = `Progress: +${ex.incrementLbs} lbs from last session`;
    } else if (lastWeight > 0) {
      note = `Match last session — aim for more reps`;
    } else {
      note = 'First time — start conservative, focus on form';
    }

    return {
      exerciseId: ex.id,
      name: ex.alternativeName ? `${ex.name} / ${ex.alternativeName}` : ex.name,
      targetSets: ex.sets,
      targetWeight: Math.max(0, targetWeight),
      targetReps: `${ex.minReps}-${ex.maxReps}${ex.perLeg ? ' per leg' : ''}`,
      note,
    };
  });

  const warmupAdvice = [
    '5 min easy cardio (bike or incline walk) to raise core temperature',
    'Band pull-aparts x15 — open up the shoulders',
    'Cat-cow x10 — mobilize the thoracic spine',
    'Bodyweight squats x10 — wake up the legs',
    '1 warm-up set per exercise at 50% working weight before working sets',
  ];

  const focusCues = generateSessionFocusCues(workouts);

  return {
    exercises,
    warmupAdvice,
    focusCues,
    estimatedDuration: 45,
  };
}

// --- Contextual focus cues based on history ---

function generateSessionFocusCues(workouts: WorkoutSession[]): string[] {
  const cues: string[] = [];

  // Bench cues
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length > 0) {
    const lastReps = benchHistory[0].log.sets.map(s => s.reps);
    if (lastReps.some(r => r <= 5)) {
      cues.push('Bench: Focus on leg drive and full arch. Keep 1 RIR — no grinding reps.');
    } else {
      cues.push('Bench: Control the eccentric (2-3 sec down), pause briefly at chest.');
    }
  } else {
    cues.push('Bench: Set up tight — retract scapulae, feet planted, slight arch.');
  }

  // Row/pulldown cues
  cues.push('Rows/Pulldowns: Initiate with the elbows, not the hands. Squeeze at peak contraction.');

  // RDL cues
  const rdlHistory = getExerciseHistory(workouts, 'rdl');
  if (rdlHistory.length > 0 && rdlHistory[0].log.sets[0]?.weight >= 80) {
    cues.push('RDL: Hinge at hips, keep the bar close. Stretch the hamstrings — don\'t just bend over.');
  } else {
    cues.push('RDL: Start light and nail the hip hinge pattern. Feel the stretch in hamstrings.');
  }

  // General
  cues.push('Breathe: Brace your core before each rep. Exhale on exertion.');

  return cues;
}

// --- Generate coaching advice ---

export function generateCoachingAdvice(
  workouts: WorkoutSession[],
  bodyMetrics: BodyMetric[],
  config: UserConfig
): CoachingAdvice[] {
  const advice: CoachingAdvice[] = [];
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date();

  // --- SCHEDULE ---
  // Frequency check
  const lastWeekWorkouts = sorted.filter(w => {
    const diff = (today.getTime() - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  if (lastWeekWorkouts.length === 0 && sorted.length > 0) {
    const daysSinceLast = Math.floor((today.getTime() - new Date(sorted[0].date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLast <= 10) {
      advice.push({
        category: 'schedule',
        title: 'Time to Train',
        message: `It's been ${daysSinceLast} days since your last workout. Your body is recovered — get after it today. Even a slightly shorter session beats skipping entirely.`,
        priority: 'high',
        icon: '//',
      });
    } else {
      advice.push({
        category: 'schedule',
        title: 'Welcome Back',
        message: `${daysSinceLast} days since your last session. No guilt — just start. Drop weights by 10-15% this session to ease back in. You'll bounce back fast, the muscle memory is real.`,
        priority: 'high',
        icon: '//',
      });
    }
  } else if (lastWeekWorkouts.length >= 3) {
    advice.push({
      category: 'schedule',
      title: 'Great Consistency',
      message: 'You hit all 3 sessions this week. That\'s the single biggest factor in progress. Keep it rolling.',
      priority: 'low',
      icon: '//',
    });
  } else if (lastWeekWorkouts.length > 0 && lastWeekWorkouts.length < 3) {
    advice.push({
      category: 'schedule',
      title: `${3 - lastWeekWorkouts.length} More This Week`,
      message: `You've done ${lastWeekWorkouts.length}/3 sessions this week. At 33, consistency matters more than intensity. Try to get ${3 - lastWeekWorkouts.length} more in before the week ends.`,
      priority: 'medium',
      icon: '//',
    });
  }

  // --- RECOVERY (age-specific) ---
  // Check session frequency spacing
  if (sorted.length >= 2) {
    const gap = Math.abs(
      (new Date(sorted[0].date).getTime() - new Date(sorted[1].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (gap < 1.5) {
      advice.push({
        category: 'recovery',
        title: 'Back-to-Back Sessions',
        message: 'You trained 2 days in a row. At 33, recovery between sessions matters more than it did at 23. Aim for at least 1 rest day between full-body sessions to maximize adaptation.',
        priority: 'high',
        icon: '//',
      });
    }
  }

  advice.push({
    category: 'recovery',
    title: 'Recovery Priorities',
    message: 'Your recovery checklist in order of impact: (1) 7-8 hours of sleep, (2) protein within an hour post-workout, (3) 8000+ steps on rest days, (4) stress management. At 33 these matter more than any supplement.',
    priority: 'medium',
    icon: '//',
  });

  // --- NUTRITION ---
  const avgProt = averageProtein(bodyMetrics);
  if (avgProt != null) {
    if (avgProt < config.targetProtein * 0.8) {
      advice.push({
        category: 'nutrition',
        title: 'Protein Is Low',
        message: `Averaging ${avgProt}g/day — you need ${config.targetProtein}g+ for your goals. At ${config.currentWeight || 185} lbs while trying to build/maintain muscle in a cut, protein is non-negotiable. Add a shake post-workout and Greek yogurt before bed.`,
        priority: 'high',
        icon: '//',
      });
    } else if (avgProt >= config.targetProtein) {
      advice.push({
        category: 'nutrition',
        title: 'Protein on Point',
        message: `${avgProt}g/day average — hitting your ${config.targetProtein}g target. This is protecting your muscle mass while cutting. Keep it up.`,
        priority: 'low',
        icon: '//',
      });
    } else {
      advice.push({
        category: 'nutrition',
        title: 'Protein Almost There',
        message: `Averaging ${avgProt}g/day, target is ${config.targetProtein}g. You're close. One extra protein source per day closes the gap — a protein shake (25g), can of tuna (25g), or chicken breast (35g).`,
        priority: 'medium',
        icon: '//',
      });
    }
  }

  // Hydration reminder
  advice.push({
    category: 'nutrition',
    title: 'Hydration Check',
    message: 'Aim for 100-120 oz of water daily. Creatine (5g/day) is the single most evidence-backed supplement for strength — if you\'re not already taking it, start.',
    priority: 'low',
    icon: '//',
  });

  // --- TECHNIQUE & TRAINING ---
  // Volume analysis
  if (sorted.length >= 3) {
    const recentDurations = sorted.slice(0, 3).filter(w => w.durationMinutes).map(w => w.durationMinutes!);
    if (recentDurations.length > 0) {
      const avgDuration = Math.round(recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length);
      if (avgDuration > 60) {
        advice.push({
          category: 'technique',
          title: 'Sessions Running Long',
          message: `Your sessions average ${avgDuration} min. For a 3-day full body, 45 min is the sweet spot. Use supersets (lat pulldown + rows, curls + lateral raises) and keep rest to 90-120 sec. More isn't always better.`,
          priority: 'medium',
          icon: '//',
        });
      } else if (avgDuration <= 45) {
        advice.push({
          category: 'technique',
          title: 'Efficient Training',
          message: `Averaging ${avgDuration} min sessions — that's dialed in. You're proving that a focused 45-min session 3x/week beats a 90-min session you skip.`,
          priority: 'low',
          icon: '//',
        });
      }
    }
  }

  // Bench-specific coaching
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length >= 2) {
    const bestE1RM = Math.max(
      ...benchHistory[0].log.sets.map(s => estimateOneRepMax(s.weight, s.reps))
    );
    const bodyweight = config.currentWeight || 185;
    const standards = getBenchLevel(bestE1RM, bodyweight);

    if (standards.level === 'beginner') {
      advice.push({
        category: 'technique',
        title: 'Bench: Building the Foundation',
        message: `Est. 1RM: ${standards.current} lbs (${(standards.current / bodyweight * 100).toFixed(0)}% BW). Novice target: ${standards.novice} lbs. You have a ton of newbie gains ahead — focus on nailing form and adding 5 lbs per session. Linear progression is your best friend right now.`,
        priority: 'medium',
        icon: '//',
      });
    } else if (standards.level === 'novice') {
      advice.push({
        category: 'technique',
        title: 'Bench: Novice Gains',
        message: `Est. 1RM: ${standards.current} lbs (${(standards.current / bodyweight * 100).toFixed(0)}% BW). Next milestone: ${standards.intermediate} lbs (intermediate). Keep adding 5 lbs when you hit 8-8-8. Consider adding a pause rep set once per week to build off-chest power.`,
        priority: 'medium',
        icon: '//',
      });
    } else if (standards.level === 'intermediate') {
      advice.push({
        category: 'technique',
        title: 'Bench: Intermediate Territory',
        message: `Est. 1RM: ${standards.current} lbs (${(standards.current / bodyweight * 100).toFixed(0)}% BW). You're past the easy gains. Progress will be slower — expect 5 lbs per month, not per session. Consider micro-loading (2.5 lb plates), varying tempo, or adding an accessory day.`,
        priority: 'medium',
        icon: '//',
      });
    } else {
      advice.push({
        category: 'technique',
        title: 'Bench: Strong Numbers',
        message: `Est. 1RM: ${standards.current} lbs (${(standards.current / bodyweight * 100).toFixed(0)}% BW). You're well above intermediate. At this level, periodization matters — consider cycling between heavier (3-5 rep) and volume (6-8 rep) blocks.`,
        priority: 'medium',
        icon: '//',
      });
    }
  }

  // Weight trend coaching
  const trendData = calculateTrendWeight(bodyMetrics);
  if (trendData.length >= 14) {
    const currentTrend = trendData[trendData.length - 1].trend;
    const twoWeeksAgo = trendData[Math.max(0, trendData.length - 14)].trend;
    const weeklyRate = (currentTrend - twoWeeksAgo) / 2;

    if (weeklyRate < -1.5) {
      advice.push({
        category: 'nutrition',
        title: 'Cutting Too Fast',
        message: `Losing ~${Math.abs(weeklyRate).toFixed(1)} lbs/week. At 33, losing faster than 1% BW/week (${((config.currentWeight || 185) * 0.01).toFixed(1)} lbs/wk) risks muscle loss. Slow down — add 200 cals on training days, keep protein high.`,
        priority: 'high',
        icon: '//',
      });
    } else if (weeklyRate >= -1 && weeklyRate <= -0.3) {
      advice.push({
        category: 'nutrition',
        title: 'Ideal Cut Rate',
        message: `Losing ~${Math.abs(weeklyRate).toFixed(1)} lbs/week — this is the sweet spot. Fast enough for visible progress, slow enough to keep your strength up. Stay the course.`,
        priority: 'low',
        icon: '//',
      });
    } else if (weeklyRate > 0.3) {
      advice.push({
        category: 'nutrition',
        title: 'Weight Trending Up',
        message: `Gaining ~${weeklyRate.toFixed(1)} lbs/week. If bulking, this is fine. If trying to recomp or cut, check your calorie tracking — small portions add up. A kitchen scale is your best friend.`,
        priority: 'medium',
        icon: '//',
      });
    }
  }

  // --- MINDSET ---
  if (sorted.length >= 12) {
    const totalWeeks = Math.ceil(
      (today.getTime() - new Date(sorted[sorted.length - 1].date).getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    advice.push({
      category: 'mindset',
      title: 'The Long Game',
      message: `${sorted.length} workouts over ~${totalWeeks} weeks. You're building a system, not chasing a quick fix. At 33, the lifters who win are the ones who stay injury-free and consistent for years. You're doing exactly that.`,
      priority: 'low',
      icon: '//',
    });
  } else if (sorted.length > 0) {
    advice.push({
      category: 'mindset',
      title: 'Building Momentum',
      message: `${sorted.length} workouts in. The first 12 sessions are about building the habit. Don't worry about optimizing yet — just show up 3x/week. Everything else is a detail.`,
      priority: 'medium',
      icon: '//',
    });
  } else {
    advice.push({
      category: 'mindset',
      title: 'Day One',
      message: 'Every strong person started with an empty bar. Your only job today is to show up and move through the exercises. The weights will go up fast in the first few months — enjoy the ride.',
      priority: 'high',
      icon: '//',
    });
  }

  // 33-specific aging advice
  advice.push({
    category: 'recovery',
    title: 'Training at 33',
    message: 'Good news: you\'re in prime training years. Testosterone is still strong, and you have the maturity to train smart. Key adjustments vs. your 20s: longer warm-ups, more emphasis on mobility (especially shoulders and hips), and never skip the deload week when flagged.',
    priority: 'low',
    icon: '//',
  });

  // --- TRAVEL ---
  advice.push({
    category: 'travel',
    title: 'Travel Doesn\'t Mean Off',
    message: 'When you travel, switch to the Hotel Workout tab. A bodyweight session in your room beats skipping entirely. Upper body focus translates perfectly — push-ups, rows, and pike press keep the stimulus going. Pack a resistance band ($12, weighs nothing) to double your options.',
    priority: 'low',
    icon: '//',
  });

  // --- LEG PROGRESSION ---
  const currentLegPhase = LEG_PHASES.find(p => p.phase === (config.legPhase ?? 1));
  const nextLegPhase = LEG_PHASES.find(p => p.phase === (config.legPhase ?? 1) + 1);

  if (currentLegPhase) {
    advice.push({
      category: 'legs',
      title: `Legs: ${currentLegPhase.name} Phase`,
      message: `Current: ${currentLegPhase.exercises} ${nextLegPhase ? `After ${currentLegPhase.weeksToProgress} weeks at this level, consider moving to Phase ${nextLegPhase.phase} (${nextLegPhase.name}): ${nextLegPhase.exercises}` : 'You\'re at the full program. Nice work building up to this.'}`,
      priority: 'low',
      icon: '//',
    });
  }

  // Check if user has been consistent enough to suggest leg phase increase
  if (nextLegPhase && sorted.length >= (currentLegPhase?.weeksToProgress ?? 4) * 3) {
    // They've been training long enough — gentle nudge
    const legExHistory = getExerciseHistory(workouts, 'rdl');
    const legConsistent = legExHistory.length >= (currentLegPhase?.weeksToProgress ?? 4) * 2;
    if (legConsistent) {
      advice.push({
        category: 'legs',
        title: 'Ready for More Legs?',
        message: `You've been consistent with your current leg work. When you're ready, bump to Phase ${nextLegPhase.phase} (${nextLegPhase.name}): ${nextLegPhase.description}. No rush — but your body can handle it now.`,
        priority: 'medium',
        icon: '//',
      });
    }
  }

  return advice;
}

// --- Strength standards for display ---

export function getStrengthStandards(
  workouts: WorkoutSession[],
  bodyweight: number
): StrengthStandards | null {
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length === 0) return null;

  const bestE1RM = Math.max(
    ...benchHistory[0].log.sets.map(s => estimateOneRepMax(s.weight, s.reps))
  );
  return getBenchLevel(bestE1RM, bodyweight);
}
