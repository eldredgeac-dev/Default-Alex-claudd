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
  },
  {
    id: 'row',
    name: 'Chest-Supported Row',
    alternativeName: 'Cable Row',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    incrementLbs: 5,
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    sets: 3,
    minReps: 5,
    maxReps: 8,
    incrementLbs: 5,
    isMainLift: true,
  },
  {
    id: 'overhead-press',
    name: 'DB Overhead Press',
    alternativeName: 'Machine Press',
    sets: 2,
    minReps: 6,
    maxReps: 12,
    incrementLbs: 2.5,
  },
  {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    sets: 2,
    minReps: 12,
    maxReps: 20,
    incrementLbs: 2.5,
  },
  {
    id: 'shrugs',
    name: 'Shrugs',
    alternativeName: 'DB or Trap Bar',
    sets: 2,
    minReps: 10,
    maxReps: 15,
    incrementLbs: 5,
  },
  {
    id: 'tricep-extension',
    name: 'Cable Pressdowns',
    alternativeName: 'Overhead Cable Extension',
    sets: 2,
    minReps: 10,
    maxReps: 15,
    incrementLbs: 5,
  },
  {
    id: 'curls',
    name: 'DB Curls',
    alternativeName: 'Cable Curls',
    sets: 2,
    minReps: 8,
    maxReps: 15,
    incrementLbs: 2.5,
  },
  {
    id: 'rdl',
    name: 'DB/Barbell RDL',
    alternativeName: 'Hamstring Curl',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    incrementLbs: 5,
  },
  {
    id: 'lunges',
    name: 'DB Lunges',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    perLeg: true,
    incrementLbs: 5,
  },
];

export const SUPERSET_SUGGESTIONS = [
  { exercises: ['lat-pulldown', 'row'], message: 'Superset lat pulldown + row (saves ~5 min)' },
  { exercises: ['lateral-raises', 'curls'], message: 'Superset lateral raises + curls (saves ~4 min)' },
  { exercises: ['shrugs', 'tricep-extension'], message: 'Superset shrugs + pressdowns (saves ~3 min)' },
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
