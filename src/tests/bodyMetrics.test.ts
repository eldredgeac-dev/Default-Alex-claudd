import { describe, it, expect } from 'vitest';
import { calculateTrendWeight, averageProtein, getLatestWaist, generateVerdict } from '../utils/bodyMetrics';
import type { BodyMetric, WorkoutSession } from '../types';

describe('calculateTrendWeight', () => {
  it('returns empty for no data', () => {
    expect(calculateTrendWeight([])).toEqual([]);
  });

  it('starts trend at first weight', () => {
    const metrics: BodyMetric[] = [
      { id: '1', date: '2024-01-01', weight: 200 },
    ];
    const result = calculateTrendWeight(metrics);
    expect(result.length).toBe(1);
    expect(result[0].trend).toBe(200);
    expect(result[0].actual).toBe(200);
  });

  it('smooths weight fluctuations', () => {
    const metrics: BodyMetric[] = [
      { id: '1', date: '2024-01-01', weight: 200 },
      { id: '2', date: '2024-01-02', weight: 198 },
      { id: '3', date: '2024-01-03', weight: 202 },
      { id: '4', date: '2024-01-04', weight: 197 },
      { id: '5', date: '2024-01-05', weight: 199 },
    ];
    const result = calculateTrendWeight(metrics, 0.1);
    // Trend should be much more stable than actual weights
    const trendRange = Math.max(...result.map(r => r.trend)) - Math.min(...result.map(r => r.trend));
    const actualRange = Math.max(...result.map(r => r.actual)) - Math.min(...result.map(r => r.actual));
    expect(trendRange).toBeLessThan(actualRange);
  });

  it('ignores entries without weight', () => {
    const metrics: BodyMetric[] = [
      { id: '1', date: '2024-01-01', weight: 200 },
      { id: '2', date: '2024-01-02', protein: 180 },
      { id: '3', date: '2024-01-03', weight: 198 },
    ];
    const result = calculateTrendWeight(metrics);
    expect(result.length).toBe(2);
  });
});

describe('averageProtein', () => {
  it('returns null for no data', () => {
    expect(averageProtein([])).toBeNull();
  });

  it('calculates average of last 7 days', () => {
    const metrics: BodyMetric[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      protein: 150 + i * 10, // 150, 160, 170, ..., 240
    }));
    const result = averageProtein(metrics, 7);
    expect(result).toBeDefined();
    // Last 7 entries: 180, 190, 200, 210, 220, 230, 240
    // Average: (180+190+200+210+220+230+240) / 7 = 210
    expect(result).toBe(210);
  });
});

describe('getLatestWaist', () => {
  it('returns null for no data', () => {
    expect(getLatestWaist([])).toBeNull();
  });

  it('returns current measurement', () => {
    const metrics: BodyMetric[] = [
      { id: '1', date: '2024-01-01', waist: 36 },
      { id: '2', date: '2024-02-01', waist: 35 },
    ];
    const result = getLatestWaist(metrics);
    expect(result).toBeDefined();
    expect(result!.current).toBe(35);
  });
});

describe('generateVerdict', () => {
  it('returns insufficient data for empty inputs', () => {
    const verdict = generateVerdict([], [], 180);
    expect(verdict.status).toBe('insufficient_data');
  });

  it('returns winning when losing weight and gaining strength', () => {
    const workouts: WorkoutSession[] = Array.from({ length: 8 }, (_, i) => ({
      id: `${i}`,
      date: `2024-01-${String(i * 3 + 1).padStart(2, '0')}`,
      exercises: [{
        exerciseId: 'bench-press',
        sets: [
          { weight: 185 + i * 2, reps: 7 },
          { weight: 185 + i * 2, reps: 7 },
          { weight: 185 + i * 2, reps: 7 },
        ],
      }],
      notes: '',
      durationMinutes: 45,
      startTime: null,
      endTime: null,
    }));

    const metrics: BodyMetric[] = Array.from({ length: 28 }, (_, i) => ({
      id: `m${i}`,
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      weight: 200 - i * 0.15, // losing weight
      protein: 190,
    }));

    const verdict = generateVerdict(workouts, metrics, 180);
    expect(verdict.status).toBe('winning');
  });
});
