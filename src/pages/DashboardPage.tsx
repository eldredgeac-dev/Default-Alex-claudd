import type { WorkoutSession, BodyMetric, UserConfig, VerdictData } from '../types';
import { generateVerdict } from '../utils/bodyMetrics';
import { generateProgressionSuggestions, sessionVolume } from '../utils/progression';
import { calculateTrendWeight, weeklyWeightChange, averageProtein, getLatestWaist } from '../utils/bodyMetrics';

interface DashboardPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
}

function VerdictCard({ verdict }: { verdict: VerdictData }) {
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
            <span className={verdict.weightChange < 0 ? 'text-green-400' : verdict.weightChange > 0 ? 'text-yellow-400' : 'text-slate-300'}>
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

export function DashboardPage({ workouts, bodyMetrics, config }: DashboardPageProps) {
  const verdict = generateVerdict(workouts, bodyMetrics, config.targetProtein, config.goalMode);
  const suggestions = generateProgressionSuggestions(workouts);
  const trendData = calculateTrendWeight(bodyMetrics);
  const weeklyChange = weeklyWeightChange(trendData);
  const avgProt = averageProtein(bodyMetrics);
  const waist = getLatestWaist(bodyMetrics);
  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const lastWorkout = sortedWorkouts[0];
  const lastVolume = lastWorkout ? sessionVolume(lastWorkout) : null;

  const gymCount = workouts.filter(w => w.workoutType !== 'hotel').length;
  const hotelCount = workouts.filter(w => w.workoutType === 'hotel').length;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lift & Lean</h1>
        <div className="text-xs text-slate-500">
          {gymCount} gym{hotelCount > 0 ? ` + ${hotelCount} hotel` : ''} sessions
        </div>
      </div>

      {/* Main Verdict */}
      <VerdictCard verdict={verdict} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-400">Trend Weight</div>
          <div className="text-lg font-bold">
            {trendData.length > 0 ? `${trendData[trendData.length - 1].trend} lbs` : '--'}
          </div>
          {weeklyChange != null && (
            <div className={`text-xs ${weeklyChange < 0 ? 'text-green-400' : weeklyChange > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>
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
