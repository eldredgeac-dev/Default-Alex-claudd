import { describe, it, expect } from 'vitest';
import {
  estimateOneRepMax,
  exerciseVolume,
  sessionVolume,
  generateProgressionSuggestions,
  getLastWorkoutForExercise,
  getBenchE1RMHistory,
} from '../utils/progression';
import type { WorkoutSession, ExerciseLog } from '../types';

describe('estimateOneRepMax', () => {
  it('returns the weight itself for 1 rep', () => {
    expect(estimateOneRepMax(225, 1)).toBe(225);
  });

  it('returns 0 for 0 reps or 0 weight', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });

  it('calculates correctly for 5 reps using Brzycki formula', () => {
    // 200 * (36 / (37 - 5)) = 200 * (36/32) = 225
    expect(estimateOneRepMax(200, 5)).toBe(225);
  });

  it('calculates correctly for 8 reps', () => {
    // 185 * (36 / (37 - 8)) = 185 * (36/29) ≈ 229.66
    const result = estimateOneRepMax(185, 8);
    expect(result).toBeCloseTo(229.66, 1);
  });

  it('calculates correctly for 10 reps', () => {
    // 135 * (36 / (37 - 10)) = 135 * (36/27) = 180
    expect(estimateOneRepMax(135, 10)).toBe(180);
  });

  it('handles edge case of very high reps', () => {
    const result = estimateOneRepMax(100, 37);
    expect(result).toBe(200); // fallback
  });
});

describe('exerciseVolume', () => {
  it('calculates total volume for an exercise', () => {
    const log: ExerciseLog = {
      exerciseId: 'bench-press',
      sets: [
        { weight: 185, reps: 8 },
        { weight: 185, reps: 7 },
        { weight: 185, reps: 6 },
      ],
    };
    // 185*8 + 185*7 + 185*6 = 1480 + 1295 + 1110 = 3885
    expect(exerciseVolume(log)).toBe(3885);
  });

  it('returns 0 for empty sets', () => {
    const log: ExerciseLog = { exerciseId: 'bench-press', sets: [] };
    expect(exerciseVolume(log)).toBe(0);
  });
});

describe('sessionVolume', () => {
  it('sums volume across all exercises', () => {
    const session: WorkoutSession = {
      id: '1',
      date: '2024-01-01',
      exercises: [
        { exerciseId: 'bench-press', sets: [{ weight: 200, reps: 5 }, { weight: 200, reps: 5 }] },
        { exerciseId: 'curls', sets: [{ weight: 30, reps: 10 }] },
      ],
      notes: '',
      durationMinutes: null,
      startTime: null,
      endTime: null,
    };
    // 200*5 + 200*5 + 30*10 = 1000 + 1000 + 300 = 2300
    expect(sessionVolume(session)).toBe(2300);
  });
});

describe('generateProgressionSuggestions', () => {
  function makeWorkout(date: string, exercises: ExerciseLog[]): WorkoutSession {
    return { id: date, date, exercises, notes: '', durationMinutes: null, startTime: null, endTime: null };
  }

  it('returns empty for no workouts', () => {
    expect(generateProgressionSuggestions([])).toEqual([]);
  });

  it('suggests increase when bench hits 8-8-8', () => {
    const workouts: WorkoutSession[] = [
      makeWorkout('2024-01-01', [{
        exerciseId: 'bench-press',
        sets: [{ weight: 195, reps: 8 }, { weight: 195, reps: 8 }, { weight: 195, reps: 8 }],
      }]),
    ];
    const suggestions = generateProgressionSuggestions(workouts);
    const benchSuggestion = suggestions.find(s => s.exerciseId === 'bench-press' && s.type === 'increase');
    expect(benchSuggestion).toBeDefined();
    expect(benchSuggestion!.message).toContain('200');
    expect(benchSuggestion!.priority).toBe('high');
  });

  it('suggests increase for accessory when both sets hit max reps', () => {
    const workouts: WorkoutSession[] = [
      makeWorkout('2024-01-01', [{
        exerciseId: 'lateral-raises',
        sets: [{ weight: 15, reps: 20 }, { weight: 15, reps: 20 }],
      }]),
    ];
    const suggestions = generateProgressionSuggestions(workouts);
    const lateralSuggestion = suggestions.find(s => s.exerciseId === 'lateral-raises' && s.type === 'increase');
    expect(lateralSuggestion).toBeDefined();
    expect(lateralSuggestion!.message).toContain('17.5');
  });

  it('detects plateau when weight stalls for 4 sessions', () => {
    const workouts: WorkoutSession[] = Array.from({ length: 5 }, (_, i) =>
      makeWorkout(`2024-01-0${i + 1}`, [{
        exerciseId: 'rdl',
        sets: [{ weight: 80, reps: 9 }, { weight: 80, reps: 8 }],
      }])
    );
    const suggestions = generateProgressionSuggestions(workouts);
    const plateauSuggestion = suggestions.find(s => s.exerciseId === 'rdl' && s.type === 'plateau');
    expect(plateauSuggestion).toBeDefined();
  });

  it('detects deload when performance declines', () => {
    const workouts: WorkoutSession[] = [
      makeWorkout('2024-01-01', [{
        exerciseId: 'bench-press',
        sets: [{ weight: 200, reps: 8 }, { weight: 200, reps: 8 }, { weight: 200, reps: 8 }],
      }]),
      makeWorkout('2024-01-03', [{
        exerciseId: 'bench-press',
        sets: [{ weight: 195, reps: 7 }, { weight: 195, reps: 6 }, { weight: 195, reps: 5 }],
      }]),
      makeWorkout('2024-01-05', [{
        exerciseId: 'bench-press',
        sets: [{ weight: 190, reps: 6 }, { weight: 190, reps: 5 }, { weight: 190, reps: 5 }],
      }]),
    ];
    const suggestions = generateProgressionSuggestions(workouts);
    const deloadSuggestion = suggestions.find(s => s.exerciseId === 'bench-press' && s.type === 'deload');
    expect(deloadSuggestion).toBeDefined();
  });
});

describe('getLastWorkoutForExercise', () => {
  it('returns the most recent exercise log', () => {
    const workouts: WorkoutSession[] = [
      {
        id: '1', date: '2024-01-01',
        exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 185, reps: 5 }] }],
        notes: '', durationMinutes: null, startTime: null, endTime: null,
      },
      {
        id: '2', date: '2024-01-03',
        exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 190, reps: 6 }] }],
        notes: '', durationMinutes: null, startTime: null, endTime: null,
      },
    ];
    const last = getLastWorkoutForExercise(workouts, 'bench-press');
    expect(last).toBeDefined();
    expect(last!.sets[0].weight).toBe(190);
  });

  it('returns null for exercise with no history', () => {
    expect(getLastWorkoutForExercise([], 'bench-press')).toBeNull();
  });
});

describe('getBenchE1RMHistory', () => {
  it('returns estimated 1RM history in chronological order', () => {
    const workouts: WorkoutSession[] = [
      {
        id: '1', date: '2024-01-01',
        exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 185, reps: 5 }] }],
        notes: '', durationMinutes: null, startTime: null, endTime: null,
      },
      {
        id: '2', date: '2024-01-03',
        exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 200, reps: 5 }] }],
        notes: '', durationMinutes: null, startTime: null, endTime: null,
      },
    ];
    const history = getBenchE1RMHistory(workouts);
    expect(history.length).toBe(2);
    expect(history[0].date).toBe('2024-01-01');
    expect(history[1].date).toBe('2024-01-03');
    expect(history[0].e1rm).toBeLessThan(history[1].e1rm);
  });
});
