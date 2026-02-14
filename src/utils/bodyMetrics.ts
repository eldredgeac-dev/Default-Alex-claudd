import type { BodyMetric, VerdictData } from '../types';
import type { WorkoutSession } from '../types';
import { sessionVolume, getExerciseHistory, estimateOneRepMax } from './progression';

/**
 * Exponential smoothing for trend weight (MacroFactor-style).
 * Alpha controls smoothing: lower = smoother (0.1 is good for daily weigh-ins).
 */
export function calculateTrendWeight(
  metrics: BodyMetric[],
  alpha: number = 0.1
): { date: string; actual: number; trend: number }[] {
  const weightEntries = metrics
    .filter(m => m.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (weightEntries.length === 0) return [];

  const result: { date: string; actual: number; trend: number }[] = [];
  let trend = weightEntries[0].weight!;

  for (const entry of weightEntries) {
    const actual = entry.weight!;
    trend = alpha * actual + (1 - alpha) * trend;
    result.push({
      date: entry.date,
      actual: Math.round(actual * 10) / 10,
      trend: Math.round(trend * 10) / 10,
    });
  }

  return result;
}

/** Calculate weekly rate of weight change based on trend */
export function weeklyWeightChange(trendData: { date: string; trend: number }[]): number | null {
  if (trendData.length < 7) return null;
  const recent = trendData[trendData.length - 1].trend;
  // Find entry from ~7 days ago
  const targetDate = new Date(trendData[trendData.length - 1].date);
  targetDate.setDate(targetDate.getDate() - 7);
  let closest = trendData[0];
  let closestDiff = Infinity;
  for (const d of trendData) {
    const diff = Math.abs(new Date(d.date).getTime() - targetDate.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = d;
    }
  }

  return Math.round((recent - closest.trend) * 10) / 10;
}

/** Average protein intake over last N days */
export function averageProtein(metrics: BodyMetric[], days: number = 7): number | null {
  const withProtein = metrics
    .filter(m => m.protein != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);

  if (withProtein.length === 0) return null;
  const sum = withProtein.reduce((s, m) => s + (m.protein ?? 0), 0);
  return Math.round(sum / withProtein.length);
}

/** Get the latest waist measurement */
export function getLatestWaist(metrics: BodyMetric[]): { current: number; fourWeeksAgo: number | null } | null {
  const withWaist = metrics
    .filter(m => m.waist != null)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (withWaist.length === 0) return null;

  const current = withWaist[0].waist!;
  const fourWeeksAgo = new Date(withWaist[0].date);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  let closest: BodyMetric | null = null;
  let closestDiff = Infinity;
  for (const m of withWaist.slice(1)) {
    const diff = Math.abs(new Date(m.date).getTime() - fourWeeksAgo.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = m;
    }
  }

  return {
    current,
    fourWeeksAgo: closest?.waist ?? null,
  };
}

/** Generate the "Am I winning?" verdict */
export function generateVerdict(
  workouts: WorkoutSession[],
  metrics: BodyMetric[],
  targetProtein: number
): VerdictData {
  const trendData = calculateTrendWeight(metrics);

  // Weight change over 4 weeks
  let weightChange: number | null = null;
  if (trendData.length >= 2) {
    const recent = trendData[trendData.length - 1].trend;
    const fourWeeksAgo = new Date(trendData[trendData.length - 1].date);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    let closest = trendData[0];
    let closestDiff = Infinity;
    for (const d of trendData) {
      const diff = Math.abs(new Date(d.date).getTime() - fourWeeksAgo.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = d;
      }
    }
    weightChange = Math.round((recent - closest.trend) * 10) / 10;
  }

  // Waist change
  const waistData = getLatestWaist(metrics);
  const waistChange = waistData && waistData.fourWeeksAgo != null
    ? Math.round((waistData.current - waistData.fourWeeksAgo) * 10) / 10
    : null;

  // Bench press strength change
  let benchChange: VerdictData['benchChange'] = null;
  const benchHistory = getExerciseHistory(workouts, 'bench-press');
  if (benchHistory.length >= 2) {
    const latest = benchHistory[0];
    const earliest = benchHistory[Math.min(benchHistory.length - 1, 7)]; // ~4 weeks back
    const latestStr = `${latest.log.sets[0]?.weight ?? 0}x${latest.log.sets.map(s => s.reps).join('-')}`;
    const earliestStr = `${earliest.log.sets[0]?.weight ?? 0}x${earliest.log.sets.map(s => s.reps).join('-')}`;
    const latestE1RM = Math.max(...latest.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)));
    const earliestE1RM = Math.max(...earliest.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)));
    const pctChange = earliestE1RM > 0 ? ((latestE1RM - earliestE1RM) / earliestE1RM) * 100 : 0;
    benchChange = {
      from: earliestStr,
      to: latestStr,
      percentChange: Math.round(pctChange * 10) / 10,
    };
  }

  // Volume change
  let volumeChange: number | null = null;
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length >= 6) {
    const recent3 = sorted.slice(0, 3).reduce((s, w) => s + sessionVolume(w), 0) / 3;
    const older3 = sorted.slice(3, 6).reduce((s, w) => s + sessionVolume(w), 0) / 3;
    if (older3 > 0) {
      volumeChange = Math.round(((recent3 - older3) / older3) * 100);
    }
  }

  const avgProt = averageProtein(metrics);

  // Determine status
  const suggestions: string[] = [];
  let status: VerdictData['status'] = 'insufficient_data';

  if (workouts.length < 3 || trendData.length < 7) {
    status = 'insufficient_data';
    suggestions.push('Keep logging for at least 2 weeks to get meaningful analysis.');
  } else {
    const losingWeight = weightChange != null && weightChange < -0.5;
    const gainingStrength = benchChange != null && benchChange.percentChange > 0;
    const volumeUp = volumeChange != null && volumeChange > 0;
    const waistDown = waistChange != null && waistChange < 0;

    if ((losingWeight || waistDown) && (gainingStrength || volumeUp)) {
      status = 'winning';
    } else if (
      (weightChange != null && Math.abs(weightChange) < 0.5) &&
      benchChange != null && benchChange.percentChange <= 0
    ) {
      status = 'stalling';
    } else if (
      weightChange != null && weightChange > 1 &&
      benchChange != null && benchChange.percentChange < 0
    ) {
      status = 'losing';
    } else if (gainingStrength || volumeUp) {
      status = 'winning';
    } else {
      status = 'stalling';
    }

    if (avgProt != null && avgProt < targetProtein * 0.85) {
      suggestions.push(`Increase protein to ${targetProtein}g+ (currently averaging ${avgProt}g/day).`);
    }
    if (status === 'stalling' || status === 'losing') {
      suggestions.push('Ensure 7-8hr sleep for optimal recovery.');
      if (weightChange != null && weightChange < -2) {
        suggestions.push('Consider slight calorie increase on training days - you may be cutting too aggressively.');
      }
    }
    if (benchChange != null && benchChange.percentChange <= 0) {
      suggestions.push('Bench press is stalling. Try micro-loading (2.5lb plates) or add a pause rep variation.');
    }
  }

  return { status, weightChange, waistChange, benchChange, volumeChange, avgProtein: avgProt, suggestions };
}
