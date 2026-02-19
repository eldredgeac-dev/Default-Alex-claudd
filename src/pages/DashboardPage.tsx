import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, BodyMetric, UserConfig, VerdictData } from '../types';
import { generateVerdict } from '../utils/bodyMetrics';
import { generateProgressionSuggestions, sessionVolume, getTrainingStreak, detectRecentPRs } from '../utils/progression';
import { calculateTrendWeight, weeklyWeightChange, averageProtein, getLatestWaist } from '../utils/bodyMetrics';
import { EXERCISES } from '../utils/exercises';

interface DashboardPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onSaveMetric?: (metric: BodyMetric) => void;
}

function VerdictCard({ verdict, goalMode }: { verdict: VerdictData; goalMode: 'cutting' | 'maintaining' }) {
  const isCutting = goalMode === 'cutting';
  const statusConfig = {
    winning: { icon: '✓', label: 'WINNING', bg: 'bg-green-900/40', border: 'border-green-600', text: 'text-green-400' },
    stalling: { icon: '!', label: 'STALLING', bg: 'bg-yellow-900/40', border: 'border-yellow-600', text: 'text-yellow-400' },
    losing: { icon: '✗', label: 'LOSING GROUND', bg: 'bg-red-900/40', border: 'border-red-600', text: 'text-red-400' },
    insufficient_data: { icon: '?', label: 'NEED MORE DATA', bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-400' },
  };

  const cfg = statusConfig[verdict.status];

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <span className={`text-xl font-bold ${cfg.text}`}>{cfg.icon}</span>
        <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
      </div>

      <div className="space-y-1.5 text-sm">
        {verdict.weightChange != null && (
          <div className="flex justify-between">
            <span className="text-slate-400">Trend weight (4 wk)</span>
            <span className={
              isCutting
                ? (verdict.weightChange < 0 ? 'text-green-400' : verdict.weightChange > 0 ? 'text-yellow-400' : 'text-slate-300')
                : (Math.abs(verdict.weightChange) <= 1 ? 'text-green-400' : 'text-yellow-400')
            }>
              {verdict.weightChange > 0 ? '+' : ''}{verdict.weightChange} lbs
            </span>
          </div>
        )}
        {verdict.waistChange != null && (
          <div className="flex justify-between">
            <span className="text-slate-400">Waist</span>
            <span className={verdict.waistChange < 0 ? 'text-green-400' : 'text-yellow-400'}>
              {verdict.waistChange > 0 ? '+' : ''}{verdict.waistChange} in
            </span>
          </div>
        )}
        {verdict.benchChange != null && (
          <div className="flex justify-between">
            <span className="text-slate-400">Bench press</span>
            <span className={verdict.benchChange.percentChange > 0 ? 'text-green-400' : 'text-yellow-400'}>
              {verdict.benchChange.from} &rarr; {verdict.benchChange.to}
              {' '}({verdict.benchChange.percentChange > 0 ? '+' : ''}{verdict.benchChange.percentChange}%)
            </span>
          </div>
        )}
        {verdict.volumeChange != null && (
          <div className="flex justify-between">
            <span className="text-slate-400">Total volume</span>
            <span className={verdict.volumeChange > 0 ? 'text-green-400' : 'text-yellow-400'}>
              {verdict.volumeChange > 0 ? '+' : ''}{verdict.volumeChange}%
            </span>
          </div>
        )}
        {verdict.avgProtein != null && (
          <div className="flex justify-between">
            <span className="text-slate-400">Avg protein (7d)</span>
            <span className="text-slate-300">{verdict.avgProtein}g/day</span>
          </div>
        )}
      </div>

      {verdict.suggestions.length > 0 && (
        <div className="border-t border-slate-700 pt-2 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Suggestions:</div>
          {verdict.suggestions.map((s, i) => (
            <div key={i} className="text-xs text-slate-300">• {s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardPage({ workouts, bodyMetrics, config, onSaveMetric }: DashboardPageProps) {
  const [quickWeight, setQuickWeight] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);

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

  // Check if today already has a weight entry
  const today = new Date().toISOString().split('T')[0];
  const todayHasWeight = bodyMetrics.some(m => m.date === today && m.weight != null);

  const handleQuickWeighIn = () => {
    if (!quickWeight || !onSaveMetric) return;
    onSaveMetric({
      id: uuidv4(),
      date: today,
      weight: parseFloat(quickWeight),
    });
    setQuickSaved(true);
    setQuickWeight('');
    setTimeout(() => setQuickSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Lift & Lean</h1>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            isCutting ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'
          }`}>
            {isCutting ? 'CUT' : 'MAINTAIN'}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          {gymCount} gym{hotelCount > 0 ? ` + ${hotelCount} hotel` : ''} sessions
        </div>
      </div>

      {/* Main Verdict */}
      <VerdictCard verdict={verdict} goalMode={goalMode} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400">Trend Weight</div>
          <div className="text-lg font-bold">
            {trendData.length > 0 ? `${trendData[trendData.length - 1].trend} lbs` : '--'}
          </div>
          {weeklyChange != null && (
            <div className={`text-xs ${
              isCutting
                ? (weeklyChange < 0 ? 'text-green-400' : weeklyChange > 0 ? 'text-yellow-400' : 'text-slate-400')
                : (Math.abs(weeklyChange) <= 0.5 ? 'text-green-400' : 'text-yellow-400')
            }`}>
              {weeklyChange > 0 ? '+' : ''}{weeklyChange} lbs/wk
            </div>
          )}
        </div>
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400">Waist</div>
          <div className="text-lg font-bold">
            {waist ? `${waist.current}"` : '--'}
          </div>
          {waist?.fourWeeksAgo != null && (
            <div className={`text-xs ${waist.current < waist.fourWeeksAgo ? 'text-green-400' : 'text-slate-400'}`}>
              {waist.current - waist.fourWeeksAgo > 0 ? '+' : ''}{(waist.current - waist.fourWeeksAgo).toFixed(1)}" (4 wk)
            </div>
          )}
        </div>
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400">Avg Protein (7d)</div>
          <div className="text-lg font-bold">
            {avgProt != null ? `${avgProt}g` : '--'}
          </div>
          <div className={`text-xs ${
            avgProt != null && avgProt >= config.targetProtein ? 'text-green-400'
            : avgProt != null && avgProt >= config.targetProtein * 0.85 ? 'text-yellow-400'
            : avgProt != null ? 'text-red-400' : 'text-slate-500'
          }`}>
            {avgProt != null ? `Target: ${config.targetProtein}g` : 'No data'}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400">Last Session Vol</div>
          <div className="text-lg font-bold">
            {lastVolume != null ? `${(lastVolume / 1000).toFixed(1)}k` : '--'}
          </div>
          {lastWorkout && (
            <div className="text-xs text-slate-500">
              {lastWorkout.date}
            </div>
          )}
        </div>
      </div>

      {/* Streak & Consistency */}
      {(streak.currentWeeks > 0 || streak.thisWeekCount > 0) && (
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Training Streak</div>
              <div className="text-lg font-bold text-cyan-400">
                {streak.currentWeeks} week{streak.currentWeeks !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">This week</div>
              <div className="flex gap-1 justify-end mt-1">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className={`w-3 h-3 rounded-sm ${
                      n <= streak.thisWeekCount ? 'bg-cyan-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {streak.thisWeekCount}/3 sessions
              </div>
            </div>
          </div>
          {streak.longestWeeks > streak.currentWeeks && (
            <div className="text-[10px] text-slate-500 mt-1">
              Longest streak: {streak.longestWeeks} weeks
            </div>
          )}
        </div>
      )}

      {/* Personal Records */}
      {recentPRs.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-purple-400">New PRs Last Session!</h3>
          {recentPRs.map((pr, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-300">{pr.exerciseName}</span>
              <span className="text-purple-300">
                {pr.type === 'weight' && `${pr.previousBest} → ${pr.value} lbs`}
                {pr.type === 'e1rm' && `e1RM: ${pr.previousBest} → ${pr.value} lbs`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Weigh-In */}
      {onSaveMetric && !todayHasWeight && (
        <div className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
          <div className="text-xs text-slate-400 whitespace-nowrap">Quick weigh-in</div>
          <input
            type="number"
            value={quickWeight}
            onChange={e => setQuickWeight(e.target.value)}
            placeholder={trendData.length > 0 ? String(trendData[trendData.length - 1].actual) : 'lbs'}
            step="0.1"
            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            inputMode="decimal"
          />
          <button
            onClick={handleQuickWeighIn}
            disabled={!quickWeight}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              quickSaved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed'
            }`}
          >
            {quickSaved ? 'Done' : 'Log'}
          </button>
        </div>
      )}
      {todayHasWeight && (
        <div className="bg-slate-800/50 rounded-xl p-2 text-center text-[10px] text-slate-500">
          Weighed in today
        </div>
      )}

      {/* Progression Suggestions */}
      {suggestions.filter(s => s.priority !== 'low').length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-blue-400">Next Session Notes</h3>
          {suggestions
            .filter(s => s.priority !== 'low')
            .slice(0, 4)
            .map((s, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded-lg ${
                  s.type === 'increase' ? 'bg-green-900/30 text-green-300'
                  : s.type === 'deload' ? 'bg-red-900/30 text-red-300'
                  : s.type === 'plateau' ? 'bg-yellow-900/30 text-yellow-300'
                  : 'bg-slate-700 text-slate-300'
                }`}
              >
                {s.message}
              </div>
            ))}
        </div>
      )}

      {/* All-Time Stats */}
      {workouts.length >= 3 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">All-Time</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total volume</span>
              <span className="text-slate-300 font-medium">
                {totalVolume > 1000000
                  ? `${(totalVolume / 1000000).toFixed(1)}M lbs`
                  : `${(totalVolume / 1000).toFixed(0)}k lbs`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sessions</span>
              <span className="text-slate-300 font-medium">{workouts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Days training</span>
              <span className="text-slate-300 font-medium">{daysSinceStart}</span>
            </div>
            {favoriteEx && (
              <div className="flex justify-between">
                <span className="text-slate-500">Most logged</span>
                <span className="text-slate-300 font-medium">{favoriteEx.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      {sortedWorkouts.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Recent Workouts</h3>
          {sortedWorkouts.slice(0, 5).map(w => (
            <div key={w.id} className="flex justify-between text-xs py-1 border-b border-slate-700 last:border-0">
              <span className="text-slate-400 flex items-center gap-1.5">
                {w.date}
                {w.workoutType === 'hotel' && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-300">HOTEL</span>
                )}
              </span>
              <span className="text-slate-300">
                {w.exercises.length} exercises
                {w.workoutType !== 'hotel' && <>&middot; {(sessionVolume(w) / 1000).toFixed(1)}k vol</>}
                {w.durationMinutes ? ` · ${w.durationMinutes}min` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
