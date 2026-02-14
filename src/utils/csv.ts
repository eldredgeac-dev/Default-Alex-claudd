import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, BodyMetric } from '../types';

/** Export workouts to CSV */
export function workoutsToCSV(workouts: WorkoutSession[]): string {
  const rows: Record<string, string | number>[] = [];
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        rows.push({
          date: w.date,
          exercise: ex.exerciseId,
          set: i + 1,
          weight: ex.sets[i].weight,
          reps: ex.sets[i].reps,
          notes: w.notes,
          duration_minutes: w.durationMinutes ?? '',
        });
      }
    }
  }
  return Papa.unparse(rows);
}

/** Export body metrics to CSV */
export function bodyMetricsToCSV(metrics: BodyMetric[]): string {
  const rows = metrics.map(m => ({
    date: m.date,
    weight: m.weight ?? '',
    waist: m.waist ?? '',
    protein: m.protein ?? '',
  }));
  return Papa.unparse(rows);
}

/** Import workouts from CSV */
export function csvToWorkouts(csvString: string): WorkoutSession[] {
  const result = Papa.parse<Record<string, string>>(csvString, { header: true, skipEmptyLines: true });
  const sessions = new Map<string, WorkoutSession>();

  for (const row of result.data) {
    const date = row.date?.trim();
    if (!date) continue;

    if (!sessions.has(date)) {
      sessions.set(date, {
        id: uuidv4(),
        date,
        exercises: [],
        notes: row.notes?.trim() ?? '',
        durationMinutes: row.duration_minutes ? parseInt(row.duration_minutes) : null,
        startTime: null,
        endTime: null,
      });
    }

    const session = sessions.get(date)!;
    const exerciseId = row.exercise?.trim();
    if (!exerciseId) continue;

    let exLog = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!exLog) {
      exLog = { exerciseId, sets: [] };
      session.exercises.push(exLog);
    }

    exLog.sets.push({
      weight: parseFloat(row.weight) || 0,
      reps: parseInt(row.reps) || 0,
    });
  }

  return Array.from(sessions.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Import body metrics from CSV */
export function csvToBodyMetrics(csvString: string): BodyMetric[] {
  const result = Papa.parse<Record<string, string>>(csvString, { header: true, skipEmptyLines: true });

  return result.data
    .filter(row => row.date?.trim())
    .map(row => ({
      id: uuidv4(),
      date: row.date.trim(),
      weight: row.weight ? parseFloat(row.weight) : undefined,
      waist: row.waist ? parseFloat(row.waist) : undefined,
      protein: row.protein ? parseFloat(row.protein) : undefined,
    }));
}

/** Download a string as a file */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
