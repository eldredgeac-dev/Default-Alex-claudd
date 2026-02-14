import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart,
} from 'recharts';
import type { WorkoutSession, BodyMetric, UserConfig } from '../types';
import { calculateTrendWeight } from '../utils/bodyMetrics';
import { getBenchE1RMHistory, sessionVolume, getExerciseHistory, estimateOneRepMax } from '../utils/progression';
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

  // Weight trend data
  const trendData = filterByRange(calculateTrendWeight(bodyMetrics), weightRange);

  // Bench E1RM data
  const benchE1RM = filterByRange(getBenchE1RMHistory(workouts), strengthRange);

  // Session volume over time
  const volumeData = filterByRange(
    [...workouts]
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
          <h3 className="text-sm font-semibold">Weight Trend</h3>
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
              <Line type="monotone" dataKey="trend" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Trend" />
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
