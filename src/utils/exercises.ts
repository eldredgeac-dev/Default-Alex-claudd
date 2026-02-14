import type { ExerciseDefinition } from '../types';

export const EXERCISES: ExerciseDefinition[] = [
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    alternativeName: 'Assisted Pull-up',
    sets: 2,
    minReps: 6,
    maxReps: 12,
    incrementLbs: 5,
    muscleGroup: 'back',
    priority: 'core',
  },
  {
    id: 'row',
    name: 'Chest-Supported Row',
    alternativeName: 'Cable Row',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    incrementLbs: 5,
    muscleGroup: 'back',
    priority: 'core',
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    sets: 3,
    minReps: 5,
    maxReps: 8,
    incrementLbs: 5,
    isMainLift: true,
    muscleGroup: 'chest',
    priority: 'core',
  },
  {
    id: 'overhead-press',
    name: 'DB Overhead Press',
    alternativeName: 'Machine Press',
    sets: 2,
    minReps: 6,
    maxReps: 12,
    incrementLbs: 2.5,
    muscleGroup: 'shoulders',
    priority: 'core',
  },
  {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    sets: 2,
    minReps: 12,
    maxReps: 20,
    incrementLbs: 2.5,
    muscleGroup: 'shoulders',
    priority: 'important',
  },
  {
    id: 'shrugs',
    name: 'Shrugs',
    alternativeName: 'DB or Trap Bar',
    sets: 2,
    minReps: 10,
    maxReps: 15,
    incrementLbs: 5,
    muscleGroup: 'traps',
    priority: 'accessory',
  },
  {
    id: 'tricep-extension',
    name: 'Cable Pressdowns',
    alternativeName: 'Overhead Cable Extension',
    sets: 2,
    minReps: 10,
    maxReps: 15,
    incrementLbs: 5,
    muscleGroup: 'arms',
    priority: 'important',
  },
  {
    id: 'curls',
    name: 'DB Curls',
    alternativeName: 'Cable Curls',
    sets: 2,
    minReps: 8,
    maxReps: 15,
    incrementLbs: 2.5,
    muscleGroup: 'arms',
    priority: 'important',
  },
  {
    id: 'rdl',
    name: 'DB/Barbell RDL',
    alternativeName: 'Hamstring Curl',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    incrementLbs: 5,
    muscleGroup: 'legs',
    priority: 'accessory',
  },
  {
    id: 'lunges',
    name: 'DB Lunges',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    perLeg: true,
    incrementLbs: 5,
    muscleGroup: 'legs',
    priority: 'accessory',
  },
];

export const SUPERSET_SUGGESTIONS = [
  { exercises: ['lat-pulldown', 'row'], message: 'Superset lat pulldown + row (saves ~5 min)' },
  { exercises: ['lateral-raises', 'curls'], message: 'Superset lateral raises + curls (saves ~4 min)' },
  { exercises: ['shrugs', 'tricep-extension'], message: 'Superset shrugs + pressdowns (saves ~3 min)' },
];

/** Exercises for hotel/travel with minimal or no equipment */
export interface HotelExercise {
  id: string;
  name: string;
  muscleGroup: 'back' | 'chest' | 'shoulders' | 'arms' | 'legs' | 'core';
  sets: number;
  reps: string; // can be "8-12" or "to failure" or "30 sec"
  equipment: 'none' | 'band' | 'dumbbell'; // what you need
  note: string;
}

export const HOTEL_EXERCISES: HotelExercise[] = [
  // --- BODYWEIGHT ONLY (no equipment) ---
  { id: 'h-pushup', name: 'Push-ups', muscleGroup: 'chest', sets: 3, reps: '15-25', equipment: 'none', note: 'Hands shoulder width. Elevate feet on bed for added difficulty.' },
  { id: 'h-pike-pushup', name: 'Pike Push-ups', muscleGroup: 'shoulders', sets: 3, reps: '8-12', equipment: 'none', note: 'Feet on bed, hips high. Replaces overhead press.' },
  { id: 'h-diamond-pushup', name: 'Diamond Push-ups', muscleGroup: 'arms', sets: 2, reps: '10-15', equipment: 'none', note: 'Hands together under chest. Tricep focus.' },
  { id: 'h-inverted-row', name: 'Inverted Rows (desk/table)', muscleGroup: 'back', sets: 3, reps: '10-15', equipment: 'none', note: 'Lie under a sturdy desk, pull chest to edge. Pause at top.' },
  { id: 'h-doorframe-row', name: 'Doorframe Rows', muscleGroup: 'back', sets: 2, reps: '12-15', equipment: 'none', note: 'Grip doorframe edges, lean back, pull yourself in.' },
  { id: 'h-bw-squat', name: 'Bodyweight Squats', muscleGroup: 'legs', sets: 2, reps: '15-20', equipment: 'none', note: 'Slow and controlled. 3 sec down, pause at bottom.' },
  { id: 'h-split-squat', name: 'Bulgarian Split Squats (bed)', muscleGroup: 'legs', sets: 2, reps: '10-12/leg', equipment: 'none', note: 'Rear foot on bed. The single best hotel leg exercise.' },
  { id: 'h-plank', name: 'Plank', muscleGroup: 'core', sets: 3, reps: '30-60 sec', equipment: 'none', note: 'Squeeze glutes, brace abs. No sagging.' },
  { id: 'h-towel-curl', name: 'Towel Curls (self-resist)', muscleGroup: 'arms', sets: 2, reps: '10-12', equipment: 'none', note: 'Loop towel around foot, curl against your own leg resistance.' },
  { id: 'h-lateral-raise-bw', name: 'Wall Lateral Raises (isometric)', muscleGroup: 'shoulders', sets: 2, reps: '20-30 sec', equipment: 'none', note: 'Stand sideways against wall, push arm out hard. Hold.' },

  // --- WITH RESISTANCE BAND (pack one!) ---
  { id: 'h-band-pulldown', name: 'Band Lat Pulldown', muscleGroup: 'back', sets: 3, reps: '12-15', equipment: 'band', note: 'Anchor band at top of door. Close grip for back width.' },
  { id: 'h-band-row', name: 'Band Rows', muscleGroup: 'back', sets: 3, reps: '12-15', equipment: 'band', note: 'Anchor at waist height or wrap around post. Squeeze shoulder blades.' },
  { id: 'h-band-press', name: 'Band Chest Press', muscleGroup: 'chest', sets: 3, reps: '12-15', equipment: 'band', note: 'Band around back, press forward. Great pump.' },
  { id: 'h-band-ohp', name: 'Band Overhead Press', muscleGroup: 'shoulders', sets: 2, reps: '12-15', equipment: 'band', note: 'Stand on band, press overhead. Control the negative.' },
  { id: 'h-band-lateral', name: 'Band Lateral Raises', muscleGroup: 'shoulders', sets: 2, reps: '15-20', equipment: 'band', note: 'Stand on band, raise to sides. Light band, high reps.' },
  { id: 'h-band-curl', name: 'Band Curls', muscleGroup: 'arms', sets: 2, reps: '15-20', equipment: 'band', note: 'Stand on band, curl up. Squeeze at the top.' },
  { id: 'h-band-pushdown', name: 'Band Pushdowns', muscleGroup: 'arms', sets: 2, reps: '15-20', equipment: 'band', note: 'Anchor high on door, push down. Tricep isolation.' },

  // --- WITH HOTEL GYM DUMBBELLS (usually light, 5-50 lbs) ---
  { id: 'h-db-press', name: 'DB Floor Press', muscleGroup: 'chest', sets: 3, reps: '10-15', equipment: 'dumbbell', note: 'Lie on floor. Shorter ROM but still effective. Go lighter, more reps.' },
  { id: 'h-db-row', name: 'Single-Arm DB Row', muscleGroup: 'back', sets: 3, reps: '10-12/arm', equipment: 'dumbbell', note: 'Brace on bed. Slow pull, squeeze at top. Best hotel back move.' },
  { id: 'h-db-ohp', name: 'DB Overhead Press', muscleGroup: 'shoulders', sets: 2, reps: '10-12', equipment: 'dumbbell', note: 'Seated on bed edge for back support.' },
  { id: 'h-db-lateral', name: 'DB Lateral Raises', muscleGroup: 'shoulders', sets: 2, reps: '12-20', equipment: 'dumbbell', note: 'Light weight, controlled. Pauses at top = more effective.' },
  { id: 'h-db-curl', name: 'DB Curls', muscleGroup: 'arms', sets: 2, reps: '12-15', equipment: 'dumbbell', note: 'Slow negatives (3 sec down). Makes light DBs feel heavier.' },
  { id: 'h-db-extension', name: 'DB Overhead Extension', muscleGroup: 'arms', sets: 2, reps: '12-15', equipment: 'dumbbell', note: 'Both hands, one DB. Full stretch at bottom.' },
  { id: 'h-db-rdl', name: 'DB Romanian Deadlift', muscleGroup: 'legs', sets: 2, reps: '10-12', equipment: 'dumbbell', note: 'Light is fine — slow tempo and full hamstring stretch.' },
  { id: 'h-db-goblet-squat', name: 'DB Goblet Squats', muscleGroup: 'legs', sets: 2, reps: '12-15', equipment: 'dumbbell', note: 'Hold DB at chest. Pause at bottom for 2 sec.' },
];

/** Get a complete hotel workout for a given equipment level and leg phase */
export function getHotelWorkout(
  equipment: 'none' | 'band' | 'dumbbell',
  legPhase: number
): { exercises: HotelExercise[]; notes: string[] } {
  const available = HOTEL_EXERCISES.filter(e => {
    if (equipment === 'dumbbell') return true; // can do everything
    if (equipment === 'band') return e.equipment !== 'dumbbell';
    return e.equipment === 'none';
  });

  const pick = (group: string, count: number): HotelExercise[] => {
    return available.filter(e => e.muscleGroup === group).slice(0, count);
  };

  // Upper body focus: always included
  const workout: HotelExercise[] = [
    ...pick('chest', 2),
    ...pick('back', 2),
    ...pick('shoulders', 2),
    ...pick('arms', 2),
    ...pick('core', 1),
  ];

  // Legs based on phase (1=minimal, 4=full)
  if (legPhase >= 1) workout.push(...pick('legs', 1));
  if (legPhase >= 3) workout.push(...pick('legs', 2).slice(1)); // add second leg exercise

  const notes: string[] = [
    'Rest 45-60 sec between sets (keeps intensity high with lighter loads)',
    'Slow tempo: 3 sec down, 1 sec pause, 1 sec up (makes bodyweight harder)',
    'Superset opposing muscles to save time: push-ups + rows, curls + pushdowns',
  ];

  if (equipment === 'none') {
    notes.push('Pro tip: Pack a resistance band next trip — weighs nothing, doubles your exercise options');
  }
  if (equipment === 'dumbbell') {
    notes.push('Hotel DBs are usually light. Compensate with slower tempo, pauses, and higher reps.');
  }

  return { exercises: workout, notes };
}

// --- Leg progression phases ---

export interface LegPhaseInfo {
  phase: number;
  name: string;
  description: string;
  exercises: string; // what you do at this phase
  weeksToProgress: number; // how many weeks before recommending next phase
}

export const LEG_PHASES: LegPhaseInfo[] = [
  {
    phase: 1,
    name: 'Foundation',
    description: 'Minimal legs — just enough to stay healthy and balanced',
    exercises: 'RDL 2x8-12 only. Building the hip hinge pattern.',
    weeksToProgress: 4,
  },
  {
    phase: 2,
    name: 'Building',
    description: 'Adding a second movement to build base leg strength',
    exercises: 'RDL 2x8-12 + Lunges 1x8-12/leg. Getting comfortable under load.',
    weeksToProgress: 4,
  },
  {
    phase: 3,
    name: 'Balanced',
    description: 'Solid leg work that complements upper body focus',
    exercises: 'RDL 2x8-12 + Lunges 2x8-12/leg. Full lower body coverage.',
    weeksToProgress: 6,
  },
  {
    phase: 4,
    name: 'Full Program',
    description: 'Complete leg volume matching a true full-body program',
    exercises: 'RDL 2x8-12 + Lunges 2x8-12/leg + optional goblet squats. You\'re all in.',
    weeksToProgress: 0, // end state
  },
];

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find(e => e.id === id);
}

export function getExerciseDisplayName(id: string, choices?: Record<string, string>): string {
  const ex = getExerciseById(id);
  if (!ex) return id;
  if (choices && choices[id]) return choices[id];
  return ex.name;
}

/** Get exercises filtered by current leg phase */
export function getExercisesForLegPhase(legPhase: number): ExerciseDefinition[] {
  return EXERCISES.filter(ex => {
    if (ex.muscleGroup !== 'legs') return true;
    if (ex.id === 'rdl') return legPhase >= 1; // always include RDL
    if (ex.id === 'lunges') return legPhase >= 2; // add lunges at phase 2+
    return true;
  });
}
