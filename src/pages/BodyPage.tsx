import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { BodyMetric, UserConfig, GoalMode } from '../types';
import { calculateTrendWeight, weeklyWeightChange, averageProtein } from '../utils/bodyMetrics';

interface BodyPageProps {
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onSave: (metric: BodyMetric) => void;
  onUpdateConfig?: (config: UserConfig) => void;
}

const GOAL_CONFIG: Record<GoalMode, {
  label: string;
  color: string;
  bgFrom: string;
  borderColor: string;
  idealWeeklyLbs: string;
  guidance: string;
  proteinNote: string;
}> = {
  cutting: {
    label: 'Cutting',
    color: 'text-red-400',
    bgFrom: 'from-red-900/20',
    borderColor: 'border-red-500/15',
    idealWeeklyLbs: '-0.5 to -1.0',
    guidance: 'Losing 0.5-1 lb/week preserves muscle while shedding fat. Faster than that risks muscle loss. Slower is fine -- patience wins.',
    proteinNote: 'Keep protein HIGH while cutting (180g+). This is what saves your muscle in a deficit.',
  },
  maintaining: {
    label: 'Maintaining',
    color: 'text-blue-400',
    bgFrom: 'from-blue-900/20',
    borderColor: 'border-blue-500/15',
    idealWeeklyLbs: '\u00B10.5',
    guidance: 'Weight should stay within \u00B10.5 lbs/week on average. Daily fluctuations of 1-3 lbs are normal -- trust the trend, not the day.',
    proteinNote: 'Protein at 160g+ supports recovery and keeps you full. No need to be as aggressive as cutting.',
  },
};

export function BodyPage({ bodyMetrics, config, onSave, onUpdateConfig }: BodyPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [protein, setProtein] = useState('');
  const [saved, setSaved] = useState(false);

  const goalMode = config.goalMode ?? 'cutting';
  const goalCfg = GOAL_CONFIG[goalMode];
  const isCutting = goalMode === 'cutting';

  // Compute trends
  const trendData = calculateTrendWeight(bodyMetrics);
  const weeklyChange = weeklyWeightChange(trendData);
  const avgProt = averageProtein(bodyMetrics);
  const currentTrend = trendData.length > 0 ? trendData[trendData.length - 1].trend : null;
  const latestActual = trendData.length > 0 ? trendData[trendData.length - 1].actual : null;

  // 7-day and 30-day rolling averages
  const last7 = trendData.slice(-7);
  const last30 = trendData.slice(-30);
  const avg7 = last7.length > 0
    ? Math.round((last7.reduce((s, d) => s + d.actual, 0) / last7.length) * 10) / 10
    : null;
  const avg30 = last30.length > 0
    ? Math.round((last30.reduce((s, d) => s + d.actual, 0) / last30.length) * 10) / 10
    : null;

  // Chart data -- last 30 entries
  const chartData = trendData.slice(-30).map(d => ({
    date: d.date.slice(5),
    actual: d.actual,
    trend: d.trend,
  }));

  // Rate assessment
  const rateStatus = (): { label: string; color: string } => {
    if (weeklyChange == null) return { label: 'Need more data', color: 'text-slate-500' };
    if (goalMode === 'cutting') {
      if (weeklyChange <= -0.5 && weeklyChange >= -1.2) return { label: 'On track', color: 'text-green-400' };
      if (weeklyChange > 0) return { label: 'Gaining -- adjust calories', color: 'text-red-400' };
      if (weeklyChange > -0.3) return { label: 'Slow -- tighten up or be patient', color: 'text-yellow-400' };
      if (weeklyChange < -1.5) return { label: 'Too fast -- eat more', color: 'text-yellow-400' };
      return { label: 'Good pace', color: 'text-green-400' };
    } else {
      if (Math.abs(weeklyChange) <= 0.5) return { label: 'Stable -- on track', color: 'text-green-400' };
      if (weeklyChange > 0.5) return { label: 'Drifting up -- watch intake', color: 'text-yellow-400' };
      return { label: 'Dropping -- eat more', color: 'text-yellow-400' };
    }
  };

  const rate = rateStatus();

  const handleSave = () => {
    if (!weight && !waist && !protein) return;
    onSave({
      id: uuidv4(),
      date,
      weight: weight ? parseFloat(weight) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      protein: protein ? parseInt(protein) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setWeight('');
    setWaist('');
    setProtein('');
  };

  const handleModeChange = (mode: GoalMode) => {
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, goalMode: mode });
    }
  };

  const recentMetrics = [...bodyMetrics]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Body Tracking</h1>
        {currentTrend && (
          <span className="text-xs text-slate-500 font-medium">Trend: {currentTrend} lbs</span>
        )}
      </div>

      {/* Goal Mode Toggle */}
      <div className="flex gap-1 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/20">
        <button
          onClick={() => handleModeChange('cutting')}
          className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all ${
            goalMode === 'cutting'
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Cutting
        </button>
        <button
          onClick={() => handleModeChange('maintaining')}
          className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all ${
            goalMode === 'maintaining'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Maintaining
        </button>
      </div>

      {/* Weight Trend Chart */}
      {chartData.length > 2 && (
        <div className={`bg-gradient-to-br ${goalCfg.bgFrom} to-slate-900/60 border ${goalCfg.borderColor} rounded-2xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">Weight Trend (30d)</h3>
            <div className={`text-xs font-bold ${rate.color}`}>{rate.label}</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b' }} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="actual" stroke="#475569" strokeWidth={1} dot={{ r: 1.5, fill: '#475569' }} name="Scale" />
              <Line type="monotone" dataKey="trend" stroke={isCutting ? '#ef4444' : '#3b82f6'} strokeWidth={2.5} dot={false} name="Trend" />
              {avg30 && (
                <ReferenceLine y={avg30} stroke="#334155" strokeDasharray="4 4" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-3 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Weekly</div>
          <div className={`text-lg font-extrabold mt-0.5 ${
            weeklyChange != null
              ? (isCutting
                ? (weeklyChange < 0 ? 'text-green-400' : 'text-red-400')
                : (Math.abs(weeklyChange) <= 0.5 ? 'text-green-400' : 'text-yellow-400'))
              : 'text-slate-500'
          }`}>
            {weeklyChange != null ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange}` : '--'}
          </div>
          <div className="text-[10px] text-slate-500">lbs/wk</div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-3 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">7-day</div>
          <div className="text-lg font-extrabold text-slate-200 mt-0.5">
            {avg7 ?? '--'}
          </div>
          <div className="text-[10px] text-slate-500">
            {avg7 && avg30 && avg7 !== avg30
              ? `30d: ${avg30}`
              : 'lbs'
            }
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-3 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Protein</div>
          <div className={`text-lg font-extrabold mt-0.5 ${
            avgProt != null && avgProt >= config.targetProtein ? 'text-green-400'
            : avgProt != null && avgProt >= config.targetProtein * 0.85 ? 'text-yellow-400'
            : avgProt != null ? 'text-red-400' : 'text-slate-500'
          }`}>
            {avgProt ?? '--'}
          </div>
          <div className="text-[10px] text-slate-500">g/day (7d)</div>
        </div>
      </div>

      {/* Mode Guidance */}
      <div className={`bg-gradient-to-br ${goalCfg.bgFrom} to-slate-900/60 border ${goalCfg.borderColor} rounded-2xl p-4 space-y-2`}>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
            isCutting ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/20' : 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20'
          }`}>
            {goalCfg.label.toUpperCase()} MODE
          </span>
          <span className="text-xs text-slate-500 font-medium">Target: {goalCfg.idealWeeklyLbs} lbs/wk</span>
        </div>
        <p className="text-xs text-slate-300/80 leading-relaxed">{goalCfg.guidance}</p>
        <p className="text-[11px] text-slate-400/70">{goalCfg.proteinNote}</p>
      </div>

      {/* Quick Entry */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-4 border border-slate-700/20">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Log Entry</h3>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1 font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder={latestActual ? String(latestActual) : '--'}
              step="0.1"
              className="w-full bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Waist (in)</label>
            <input
              type="number"
              value={waist}
              onChange={e => setWaist(e.target.value)}
              placeholder="--"
              step="0.25"
              className="w-full bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-medium">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              placeholder="--"
              className="w-full bg-slate-700/50 border border-slate-600/30 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!weight && !waist && !protein}
          className={`w-full rounded-xl py-3 font-bold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white shadow-[0_0_16px_rgba(34,197,94,0.3)]'
              : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10'
          }`}
        >
          {saved ? 'Saved!' : 'Log Entry'}
        </button>
      </div>

      {/* Weigh-in Tips */}
      <div className="bg-slate-800/30 border border-slate-700/15 rounded-2xl p-3 text-xs text-slate-400/70 space-y-1">
        <div>Weigh yourself first thing in the morning, after using the bathroom, before eating/drinking.</div>
        <div>Daily fluctuations are normal (water, sodium, stress). The <span className={goalCfg.color}>trend line</span> is what matters.</div>
        <div>Protein target: <span className="text-blue-400 font-bold">{config.targetProtein}g/day</span></div>
      </div>

      {/* Recent Entries */}
      {recentMetrics.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Entries</h3>
          <div className="space-y-0.5">
            <div className="grid grid-cols-4 text-[10px] text-slate-500 font-medium pb-1.5 border-b border-slate-700/30">
              <span>Date</span>
              <span className="text-right">Weight</span>
              <span className="text-right">Waist</span>
              <span className="text-right">Protein</span>
            </div>
            {recentMetrics.map(m => (
              <div key={m.id} className="grid grid-cols-4 text-xs py-1.5 border-b border-slate-700/15 last:border-0">
                <span className="text-slate-400 font-medium">{m.date.slice(5)}</span>
                <span className="text-right text-slate-300">{m.weight ?? '--'}</span>
                <span className="text-right text-slate-300">{m.waist ?? '--'}</span>
                <span className={`text-right font-medium ${
                  m.protein != null && m.protein >= config.targetProtein ? 'text-green-400'
                  : m.protein != null && m.protein >= config.targetProtein * 0.85 ? 'text-yellow-400'
                  : m.protein != null ? 'text-red-400'
                  : 'text-slate-500'
                }`}>
                  {m.protein ?? '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
