import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, BodyMetric, UserConfig, VerdictData } from '../types';
import { generateVerdict } from '../utils/bodyMetrics';
import { generateProgressionSuggestions, sessionVolume, getTrainingStreak, detectRecentPRs } from '../utils/progression';
import { calculateTrendWeight, weeklyWeightChange, averageProtein, getLatestWaist } from '../utils/bodyMetrics';
import { EXERCISES } from '../utils/exercises';
import { generateProgramSuggestions } from '../utils/programSuggestions';

interface DashboardPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onSaveMetric?: (metric: BodyMetric) => void;
}

function VerdictCard({ verdict, goalMode }: { verdict: VerdictData; goalMode: 'cutting' | 'maintaining' }) {
  const isCutting = goalMode === 'cutting';
  const statusConfig = {
    winning: {
      icon: '\u2714',
      label: 'WINNING',
      bg: 'bg-gradient-to-br from-green-900/50 to-green-950/30',
      border: 'border-green-500/30',
      text: 'text-green-400',
      glow: 'glow-green',
    },
    stalling: {
      icon: '\u26A0',
      label: 'STALLING',
      bg: 'bg-gradient-to-br from-yellow-900/40 to-yellow-950/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      glow: '',
    },
    losing: {
      icon: '\u2716',
      label: 'LOSING GROUND',
      bg: 'bg-gradient-to-br from-red-900/40 to-red-950/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      glow: 'glow-red',
    },
    insufficient_data: {
      icon: '?',
      label: 'NEED MORE DATA',
      bg: 'bg-gradient-to-br from-slate-800/80 to-slate-900/60',
      border: 'border-slate-600/30',
      text: 'text-slate-400',
      glow: '',
    },
  };

  const cfg = statusConfig[verdict.status];

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 space-y-3 ${cfg.glow}`}>
      <div className="flex items-center gap-2.5">
        <span className={`text-2xl font-bold ${cfg.text}`}>{cfg.icon}</span>
        <span className={`text-lg font-extrabold tracking-wide ${cfg.text}`}>{cfg.label}</span>
      </div>

      <div className="space-y-2 text-sm">
        {verdict.weightChange != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Trend weight (4 wk)</span>
            <span className={`font-semibold ${
              isCutting
                ? (verdict.weightChange < 0 ? 'text-green-400' : verdict.weightChange > 0 ? 'text-yellow-400' : 'text-slate-300')
                : (Math.abs(verdict.weightChange) <= 1 ? 'text-green-400' : 'text-yellow-400')
            }`}>
              {verdict.weightChange > 0 ? '+' : ''}{verdict.weightChange} lbs
            </span>
          </div>
        )}
        {verdict.waistChange != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Waist</span>
            <span className={`font-semibold ${verdict.waistChange < 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {verdict.waistChange > 0 ? '+' : ''}{verdict.waistChange} in
            </span>
          </div>
        )}
        {verdict.benchChange != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Bench press</span>
            <span className={`font-semibold ${verdict.benchChange.percentChange > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {verdict.benchChange.from} &rarr; {verdict.benchChange.to}
              {' '}({verdict.benchChange.percentChange > 0 ? '+' : ''}{verdict.benchChange.percentChange}%)
            </span>
          </div>
        )}
        {verdict.volumeChange != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total volume</span>
            <span className={`font-semibold ${verdict.volumeChange > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {verdict.volumeChange > 0 ? '+' : ''}{verdict.volumeChange}%
            </span>
          </div>
        )}
        {verdict.avgProtein != null && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Avg protein (7d)</span>
            <span className="text-slate-300 font-semibold">{verdict.avgProtein}g/day</span>
          </div>
        )}
      </div>

      {verdict.suggestions.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          {verdict.suggestions.map((s, i) => (
            <div key={i} className="text-xs text-slate-300/80 flex gap-2">
              <span className="text-slate-500 shrink-0">&#x25B8;</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage({ workouts, bodyMetrics, config, onSaveMetric }: DashboardPageProps) {
  const [quickWeight, setQuickWeight] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickSaved, setQuickSaved] = useState<'weight' | 'protein' | null>(null);

  const goalMode = config.goalMode ?? 'cutting';
  const isCutting = goalMode === 'cutting';
  const verdict = generateVerdict(workouts, bodyMetrics, config.targetProtein, goalMode);
  const suggestions = generateProgressionSuggestions(workouts);
  const trendData = calculateTrendWeight(bodyMetrics);
  const weeklyChange = weeklyWeightChange(trendData);
  const avgProt = averageProtein(bodyMetrics);
  const waist = getLatestWaist(bodyMetrics);
  const streak = getTrainingStreak(workouts);
  const recentPRs = detectRecentPRs(workouts);
  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const lastWorkout = sortedWorkouts[0];
  const lastVolume = lastWorkout ? sessionVolume(lastWorkout) : null;

  const gymCount = workouts.filter(w => w.workoutType !== 'hotel').length;
  const hotelCount = workouts.filter(w => w.workoutType === 'hotel').length;

  // Program suggestions
  const programSuggestions = generateProgramSuggestions(workouts);
  const stallSuggestions = programSuggestions.filter(s => s.goal === 'stall_buster');

  // Days since last workout
  const daysSinceLast = lastWorkout
    ? Math.floor((new Date().getTime() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // All-time stats
  const totalVolume = workouts
    .filter(w => w.workoutType !== 'hotel')
    .reduce((s, w) => s + sessionVolume(w), 0);
  const firstWorkoutDate = sortedWorkouts.length > 0 ? sortedWorkouts[sortedWorkouts.length - 1].date : null;
  const daysSinceStart = firstWorkoutDate
    ? Math.ceil((new Date().getTime() - new Date(firstWorkoutDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Favorite exercise (most logged)
  const exerciseCounts: Record<string, number> = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      exerciseCounts[ex.exerciseId] = (exerciseCounts[ex.exerciseId] ?? 0) + 1;
    }
  }
  const favoriteExId = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const favoriteEx = favoriteExId ? EXERCISES.find(e => e.id === favoriteExId) : null;

  // Check if today already has entries
  const today = new Date().toISOString().split('T')[0];
  const todayHasWeight = bodyMetrics.some(m => m.date === today && m.weight != null);
  const todayHasProtein = bodyMetrics.some(m => m.date === today && m.protein != null);

  const handleQuickWeighIn = () => {
    if (!quickWeight || !onSaveMetric) return;
    onSaveMetric({
      id: uuidv4(),
      date: today,
      weight: parseFloat(quickWeight),
    });
    setQuickSaved('weight');
    setQuickWeight('');
    setTimeout(() => setQuickSaved(null), 2000);
  };

  const handleQuickProtein = () => {
    if (!quickProtein || !onSaveMetric) return;
    onSaveMetric({
      id: uuidv4(),
      date: today,
      protein: parseInt(quickProtein),
    });
    setQuickSaved('protein');
    setQuickProtein('');
    setTimeout(() => setQuickSaved(null), 2000);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Lift & Lean</h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isCutting
              ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20'
              : 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
          }`}>
            {isCutting ? 'CUT' : 'MAINTAIN'}
          </span>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {gymCount} gym{hotelCount > 0 ? ` + ${hotelCount} hotel` : ''}
        </div>
      </div>

      {/* Days Since Last Workout Nudge */}
      {daysSinceLast != null && daysSinceLast >= 3 && (
        <div className={`rounded-2xl p-4 text-center ${
          daysSinceLast >= 7
            ? 'bg-gradient-to-br from-red-900/40 to-red-950/20 border border-red-500/20 glow-red'
            : daysSinceLast >= 4
            ? 'bg-gradient-to-br from-yellow-900/30 to-yellow-950/10 border border-yellow-500/20'
            : 'bg-slate-800/60 border border-slate-700/30'
        }`}>
          <div className={`text-base font-bold ${
            daysSinceLast >= 7 ? 'text-red-400' : daysSinceLast >= 4 ? 'text-yellow-400' : 'text-slate-300'
          }`}>
            {daysSinceLast} days since last workout
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {daysSinceLast >= 7
              ? 'No guilt — just show up today. Drop weights 10% and ease back in.'
              : daysSinceLast >= 4
              ? 'Your body is recovered. Time to get after it.'
              : 'Rest day. Recovery is part of the process.'}
          </div>
        </div>
      )}

      {/* Main Verdict */}
      <VerdictCard verdict={verdict} goalMode={goalMode} />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Trend Weight</div>
          <div className="text-xl font-bold mt-1">
            {trendData.length > 0 ? `${trendData[trendData.length - 1].trend}` : '--'}
            <span className="text-xs text-slate-500 ml-1 font-normal">lbs</span>
          </div>
          {weeklyChange != null && (
            <div className={`text-xs font-medium mt-0.5 ${
              isCutting
                ? (weeklyChange < 0 ? 'text-green-400' : weeklyChange > 0 ? 'text-yellow-400' : 'text-slate-400')
                : (Math.abs(weeklyChange) <= 0.5 ? 'text-green-400' : 'text-yellow-400')
            }`}>
              {weeklyChange > 0 ? '+' : ''}{weeklyChange}/wk
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Waist</div>
          <div className="text-xl font-bold mt-1">
            {waist ? `${waist.current}"` : '--'}
          </div>
          {waist?.fourWeeksAgo != null && (
            <div className={`text-xs font-medium mt-0.5 ${waist.current < waist.fourWeeksAgo ? 'text-green-400' : 'text-slate-400'}`}>
              {waist.current - waist.fourWeeksAgo > 0 ? '+' : ''}{(waist.current - waist.fourWeeksAgo).toFixed(1)}" (4wk)
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Protein (7d)</div>
          <div className={`text-xl font-bold mt-1 ${
            avgProt != null && avgProt >= config.targetProtein ? 'text-green-400'
            : avgProt != null && avgProt >= config.targetProtein * 0.85 ? 'text-yellow-400'
            : avgProt != null ? 'text-red-400' : ''
          }`}>
            {avgProt != null ? `${avgProt}g` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {avgProt != null ? `of ${config.targetProtein}g` : 'No data'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Last Volume</div>
          <div className="text-xl font-bold mt-1">
            {lastVolume != null ? `${(lastVolume / 1000).toFixed(1)}k` : '--'}
          </div>
          {lastWorkout && (
            <div className="text-xs text-slate-500 mt-0.5">
              {lastWorkout.date.slice(5)}
            </div>
          )}
        </div>
      </div>

      {/* Streak & Consistency */}
      {(streak.currentWeeks > 0 || streak.thisWeekCount > 0) && (
        <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900/60 rounded-2xl p-4 border border-cyan-500/10 glow-cyan">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Training Streak</div>
              <div className="text-2xl font-extrabold text-cyan-400 mt-0.5">
                {streak.currentWeeks} <span className="text-sm font-medium text-cyan-400/60">week{streak.currentWeeks !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">This Week</div>
              <div className="flex gap-1.5 justify-end mt-1.5">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className={`w-3.5 h-3.5 rounded-md transition-colors ${
                      n <= streak.thisWeekCount
                        ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-700/60'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {streak.thisWeekCount}/3
              </div>
            </div>
          </div>
          {streak.longestWeeks > streak.currentWeeks && (
            <div className="text-[10px] text-slate-500 mt-1.5">
              Best: {streak.longestWeeks} weeks
            </div>
          )}
        </div>
      )}

      {/* Personal Records */}
      {recentPRs.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/10 border border-purple-500/15 rounded-2xl p-4 space-y-2.5 glow-purple">
          <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
            <span className="text-lg">&#9733;</span>
            New PRs Last Session!
          </h3>
          {recentPRs.map((pr, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">{pr.exerciseName}</span>
              <span className="text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-full">
                {pr.type === 'weight' && `${pr.previousBest} \u2192 ${pr.value} lbs`}
                {pr.type === 'e1rm' && `e1RM: ${pr.previousBest} \u2192 ${pr.value}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Log (Weight + Protein) */}
      {onSaveMetric && (!todayHasWeight || !todayHasProtein) && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-slate-700/20">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quick Log</div>
          {!todayHasWeight && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 w-14 font-medium">Weight</span>
              <input
                type="number"
                value={quickWeight}
                onChange={e => setQuickWeight(e.target.value)}
                placeholder={trendData.length > 0 ? String(trendData[trendData.length - 1].actual) : 'lbs'}
                step="0.1"
                className="flex-1 bg-slate-700/60 border border-slate-600/30 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                inputMode="decimal"
              />
              <button
                onClick={handleQuickWeighIn}
                disabled={!quickWeight}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  quickSaved === 'weight'
                    ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                    : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10'
                }`}
              >
                {quickSaved === 'weight' ? '\u2713' : 'Log'}
              </button>
            </div>
          )}
          {!todayHasProtein && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 w-14 font-medium">Protein</span>
              <input
                type="number"
                value={quickProtein}
                onChange={e => setQuickProtein(e.target.value)}
                placeholder={`${config.targetProtein}g`}
                className="flex-1 bg-slate-700/60 border border-slate-600/30 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                inputMode="numeric"
              />
              <button
                onClick={handleQuickProtein}
                disabled={!quickProtein}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  quickSaved === 'protein'
                    ? 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                    : 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10'
                }`}
              >
                {quickSaved === 'protein' ? '\u2713' : 'Log'}
              </button>
            </div>
          )}
        </div>
      )}
      {todayHasWeight && todayHasProtein && (
        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-2.5 text-center text-[11px] text-green-400/70 font-medium">
          \u2713 Weighed in + protein logged today
        </div>
      )}

      {/* Stall Alerts / Program Change Suggestions */}
      {stallSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-900/20 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-amber-500/10">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <span className="text-base">&#9881;</span>
            Program Changes
          </h3>
          {stallSuggestions.slice(0, 3).map((s, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl p-3 space-y-1">
              <div className="text-xs font-semibold text-amber-300">{s.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">{s.description}</div>
              <div className="text-[11px] text-slate-300 font-medium leading-relaxed">{s.action}</div>
            </div>
          ))}
        </div>
      )}

      {/* Progression Suggestions */}
      {suggestions.filter(s => s.priority !== 'low').length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-slate-700/20">
          <h3 className="text-sm font-bold text-blue-400">Next Session Notes</h3>
          {suggestions
            .filter(s => s.priority !== 'low')
            .slice(0, 4)
            .map((s, i) => (
              <div
                key={i}
                className={`text-xs p-3 rounded-xl font-medium ${
                  s.type === 'increase' ? 'bg-green-500/8 text-green-300 border border-green-500/10'
                  : s.type === 'deload' ? 'bg-red-500/8 text-red-300 border border-red-500/10'
                  : s.type === 'plateau' ? 'bg-yellow-500/8 text-yellow-300 border border-yellow-500/10'
                  : 'bg-slate-700/40 text-slate-300 border border-slate-600/20'
                }`}
              >
                {s.message}
              </div>
            ))}
        </div>
      )}

      {/* All-Time Stats */}
      {workouts.length >= 3 && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">All-Time Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-lg font-bold text-slate-200">
                {totalVolume > 1000000
                  ? `${(totalVolume / 1000000).toFixed(1)}M`
                  : `${(totalVolume / 1000).toFixed(0)}k`}
              </div>
              <div className="text-[10px] text-slate-500">lbs moved</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-200">{workouts.length}</div>
              <div className="text-[10px] text-slate-500">sessions</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-200">{daysSinceStart}</div>
              <div className="text-[10px] text-slate-500">days training</div>
            </div>
            {favoriteEx && (
              <div>
                <div className="text-sm font-bold text-slate-200">{favoriteEx.name}</div>
                <div className="text-[10px] text-slate-500">most logged</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      {sortedWorkouts.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-1 border border-slate-700/20">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Workouts</h3>
          {sortedWorkouts.slice(0, 5).map(w => (
            <div key={w.id} className="flex justify-between items-center text-xs py-2 border-b border-white/3 last:border-0">
              <span className="text-slate-400 flex items-center gap-2">
                <span className="font-medium">{w.date.slice(5)}</span>
                {w.workoutType === 'hotel' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20">HOTEL</span>
                )}
              </span>
              <span className="text-slate-300 font-medium">
                {w.exercises.length} ex
                {w.workoutType !== 'hotel' && <span className="text-slate-500"> &middot; {(sessionVolume(w) / 1000).toFixed(1)}k</span>}
                {w.durationMinutes ? <span className="text-slate-500"> &middot; {w.durationMinutes}m</span> : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
