import type { WorkoutSession, BodyMetric, UserConfig } from '../types';

const KEYS = {
  workouts: 'liftlean_workouts',
  bodyMetrics: 'liftlean_body_metrics',
  config: 'liftlean_config',
} as const;

const DEFAULT_CONFIG: UserConfig = {
  setupComplete: false,
  currentWeight: 0,
  targetProtein: 180,
  exerciseChoices: {},
  sessionTargetMinutes: 45,
  legPhase: 1,
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Workouts
export function getWorkouts(): WorkoutSession[] {
  return getItem<WorkoutSession[]>(KEYS.workouts, []);
}

export function saveWorkout(workout: WorkoutSession): void {
  const workouts = getWorkouts();
  const idx = workouts.findIndex(w => w.id === workout.id);
  if (idx >= 0) {
    workouts[idx] = workout;
  } else {
    workouts.push(workout);
  }
  workouts.sort((a, b) => a.date.localeCompare(b.date));
  setItem(KEYS.workouts, workouts);
}

export function deleteWorkout(id: string): void {
  const workouts = getWorkouts().filter(w => w.id !== id);
  setItem(KEYS.workouts, workouts);
}

// Body metrics
export function getBodyMetrics(): BodyMetric[] {
  return getItem<BodyMetric[]>(KEYS.bodyMetrics, []);
}

export function saveBodyMetric(metric: BodyMetric): void {
  const metrics = getBodyMetrics();
  const idx = metrics.findIndex(m => m.id === metric.id);
  if (idx >= 0) {
    metrics[idx] = metric;
  } else {
    metrics.push(metric);
  }
  metrics.sort((a, b) => a.date.localeCompare(b.date));
  setItem(KEYS.bodyMetrics, metrics);
}

export function deleteBodyMetric(id: string): void {
  const metrics = getBodyMetrics().filter(m => m.id !== id);
  setItem(KEYS.bodyMetrics, metrics);
}

// Config
export function getConfig(): UserConfig {
  return getItem<UserConfig>(KEYS.config, DEFAULT_CONFIG);
}

export function saveConfig(config: UserConfig): void {
  setItem(KEYS.config, config);
}

// Export all data
export function exportAllData(): string {
  return JSON.stringify({
    workouts: getWorkouts(),
    bodyMetrics: getBodyMetrics(),
    config: getConfig(),
    exportDate: new Date().toISOString(),
    version: 1,
  }, null, 2);
}

// Import all data
export function importAllData(json: string): void {
  const data = JSON.parse(json);
  if (data.workouts) setItem(KEYS.workouts, data.workouts);
  if (data.bodyMetrics) setItem(KEYS.bodyMetrics, data.bodyMetrics);
  if (data.config) setItem(KEYS.config, data.config);
}

// Clear all data
export function clearAllData(): void {
  localStorage.removeItem(KEYS.workouts);
  localStorage.removeItem(KEYS.bodyMetrics);
  localStorage.removeItem(KEYS.config);
}
