import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart,
} from 'recharts';
import type { WorkoutSession, BodyMetric, UserConfig } from '../types';
import { calculateTrendWeight } from '../utils/bodyMetrics';
import { getBenchE1RMHistory, sessionVolume, exerciseVolume, getExerciseHistory, estimateOneRepMax } from '../utils/progression';
import { EXERCISES } from '../utils/exercises';

interface ChartsPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
}

type TimeRange = '1m' | '3m' | '6m' | 'all';

function filterByRange<T extends { date: string }>(data: T[], range: TimeRange): T[] {
  if (range === 'all') return data;
  const now = new Date();
  const months = range === '1m' ? 1 : range === '3m' ? 3 : 6;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return data.filter(d => new Date(d.date) >= cutoff);
}

function RangeSelector({ range, onChange }: { range: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <div className="flex gap-1">
      {(['1m', '3m', '6m', 'all'] as const).map(r => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2 py-0.5 text-xs rounded ${
            range === r ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function ChartsPage({ workouts, bodyMetrics, config }: ChartsPageProps) {
  const [weightRange, setWeightRange] = useState<TimeRange>('3m');
  const [strengthRange, setStrengthRange] = useState<TimeRange>('3m');
  const [selectedExercise, setSelectedExercise] = useState('bench-press');
  const goalMode = config.goalMode ?? 'cutting';
  const isCutting = goalMode === 'cutting';
  const trendColor = isCutting ? '#ef4444' : '#3b82f6';

  // Weight trend data
  const trendData = filterByRange(calculateTrendWeight(bodyMetrics), weightRange);

  // Bench E1RM data
  const benchE1RM = filterByRange(getBenchE1RMHistory(workouts), strengthRange);

  // Session volume over time (gym only — hotel workouts have minimal weight data)
  const volumeData = filterByRange(
    [...workouts]
      .filter(w => w.workoutType !== 'hotel')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(w => ({ date: w.date, volume: Math.round(sessionVolume(w) / 1000) })),
    strengthRange
  );

  // Protein tracking (last 14 days)
  const proteinData = [...bodyMetrics]
    .filter(m => m.protein != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(m => ({
      date: m.date.slice(5),
      protein: m.protein!,
      target: config.targetProtein,
    }));

  // Waist measurements
  const waistData = bodyMetrics
    .filter(m => m.waist != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ date: m.date.slice(5), waist: m.waist! }));

  // Muscle group volume breakdown (gym workouts, last 4 weeks)
  const recentGymWorkouts = workouts
    .filter(w => w.workoutType !== 'hotel')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12); // ~4 weeks of 3x/week

  const groupColors: Record<string, string> = {
    back: '#3b82f6',
    chest: '#ef4444',
    shoulders: '#f59e0b',
    arms: '#a855f7',
    legs: '#22c55e',
    traps: '#06b6d4',
  };

  const muscleGroupVolume: { group: string; volume: number; fill: string }[] = [];
  const groupTotals: Record<string, number> = {};
  for (const w of recentGymWorkouts) {
    for (const ex of w.exercises) {
      const def = EXERCISES.find(e => e.id === ex.exerciseId);
      if (!def) continue;
      const vol = exerciseVolume(ex);
      groupTotals[def.muscleGroup] = (groupTotals[def.muscleGroup] ?? 0) + vol;
    }
  }
  for (const [group, vol] of Object.entries(groupTotals).sort((a, b) => b[1] - a[1])) {
    muscleGroupVolume.push({
      group: group.charAt(0).toUpperCase() + group.slice(1),
      volume: Math.round(vol / 1000),
      fill: groupColors[group] ?? '#64748b',
    });
  }

  // Workout frequency — sessions per week
  const frequencyData: { week: string; sessions: number; target: number }[] = [];
  if (workouts.length > 0) {
    const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
    const weekMap = new Map<string, number>();
    for (const w of sorted) {
      const d = new Date(w.date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const weekKey = monday.toISOString().split('T')[0];
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
    }
    for (const [week, count] of [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)) {
      frequencyData.push({
        week: week.slice(5), // MM-DD
        sessions: count,
        target: 3,
      });
    }
  }

  // Body recomp overlay: weight trend + bench e1rm on same timeline
  const recompData: { date: string; trend?: number; e1rm?: number }[] = [];
  if (trendData.length > 0 && benchE1RM.length > 0) {
    // Merge both datasets by date
    const dateMap = new Map<string, { trend?: number; e1rm?: number }>();
    for (const d of trendData) {
      dateMap.set(d.date, { ...dateMap.get(d.date), trend: d.trend });
    }
    for (const d of benchE1RM) {
      dateMap.set(d.date, { ...dateMap.get(d.date), e1rm: d.e1rm });
    }
    for (const [date, vals] of [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      recompData.push({ date: date.slice(5), ...vals });
    }
  }

  // Selected exercise progression
  const exerciseHistory = getExerciseHistory(workouts, selectedExercise)
    .reverse()
    .map(h => ({
      date: h.date.slice(5),
      weight: h.log.sets[0]?.weight ?? 0,
      e1rm: Math.round(Math.max(...h.log.sets.map(s => estimateOneRepMax(s.weight, s.reps)))),
    }));

  return (
    <div className="space-y-6 pb-4">
      <h2 className="text-lg font-bold">Progress Charts</h2>

      {/* Weight Trend Chart */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">
            Weight Trend
            <span className={`ml-2 text-[9px] font-bold px-1 py-0.5 rounded ${
              isCutting ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'
            }`}>
              {isCutting ? 'CUTTING' : 'MAINTAINING'}
            </span>
          </h3>
          <RangeSelector range={weightRange} onChange={setWeightRange} />
        </div>
        {trendData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="actual" stroke="#64748b" strokeWidth={1} dot={{ r: 2, fill: '#64748b' }} name="Actual" />
              <Line type="monotone" dataKey="trend" stroke={trendColor} strokeWidth={2.5} dot={false} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
            Log weight entries to see your trend
          </div>
        )}
      </div>

      {/* Exercise Progression */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Strength Progression</h3>
          <RangeSelector range={strengthRange} onChange={setStrengthRange} />
        </div>
        <select
          value={selectedExercise}
          onChange={e => setSelectedExercise(e.target.value)}
          className="w-full bg-slate-700 rounded-lg px-3 py-1.5 text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {EXERCISES.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
        {exerciseHistory.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={exerciseHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Weight (lbs)" />
              <Line type="monotone" dataKey="e1rm" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Est. 1RM" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
            Need at least 2 sessions for this exercise
          </div>
        )}
      </div>

      {/* Session Volume */}
      {volumeData.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Session Volume (thousands lbs)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="volume" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Volume (k lbs)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Muscle Group Balance */}
      {muscleGroupVolume.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Muscle Group Volume (recent, k lbs)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={muscleGroupVolume} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="group" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={65} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="volume" radius={[0, 3, 3, 0]} name="Volume (k lbs)">
                {muscleGroupVolume.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Workout Frequency */}
      {frequencyData.length > 2 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Sessions Per Week (last 12 weeks)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={frequencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={20} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <ReferenceLine y={3} stroke="#22c55e" strokeDasharray="4 4" />
              <Bar dataKey="sessions" name="Sessions" radius={[3, 3, 0, 0]}>
                {frequencyData.map((entry, i) => (
                  <rect key={i} fill={entry.sessions >= 3 ? '#22c55e' : entry.sessions >= 2 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-slate-500 mt-1 text-center">Green = 3+ sessions (on target)</div>
        </div>
      )}

      {/* Protein Chart */}
      {proteinData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Protein Intake (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={proteinData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <ReferenceLine y={config.targetProtein} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }} />
              <Bar dataKey="protein" name="Protein (g)" radius={[3, 3, 0, 0]}>
                {proteinData.map((entry, i) => {
                  const fill = entry.protein >= config.targetProtein ? '#22c55e'
                    : entry.protein >= config.targetProtein * 0.85 ? '#f59e0b'
                    : '#ef4444';
                  return <rect key={i} fill={fill} />;
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Waist Chart */}
      {waistData.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Waist Measurement</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={waistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="waist" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Waist (in)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body Recomposition (Weight vs Strength) */}
      {recompData.length > 3 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-1">Body Recomposition</h3>
          <div className="text-[10px] text-slate-500 mb-3">
            {isCutting
              ? 'Goal: weight trend going down while strength holds or goes up'
              : 'Goal: stable weight with strength trending up'}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={recompData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis
                yAxisId="weight"
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                width={40}
                label={{ value: 'lbs', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 9 }}
              />
              <YAxis
                yAxisId="strength"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#06b6d4' }}
                width={40}
                label={{ value: 'e1RM', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line yAxisId="weight" type="monotone" dataKey="trend" stroke={trendColor} strokeWidth={2} dot={false} name="Weight Trend" connectNulls />
              <Line yAxisId="strength" type="monotone" dataKey="e1rm" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2, fill: '#06b6d4' }} name="Bench e1RM" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bench E1RM */}
      {benchE1RM.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Bench Press Est. 1RM</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={benchE1RM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="e1rm" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="Est. 1RM (lbs)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
