import { useState } from 'react';
import type { WorkoutSession, BodyMetric, UserConfig } from '../types';
import {
  generateCoachingAdvice,
  generateNextWorkoutPlan,
  generateWeeklySchedule,
  getStrengthStandards,
} from '../utils/coaching';
import type { CoachingAdvice } from '../utils/coaching';

interface CoachPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
}

const CATEGORY_LABELS: Record<CoachingAdvice['category'], { label: string; color: string }> = {
  workout_plan: { label: 'PLAN', color: 'bg-blue-900/50 text-blue-300' },
  recovery: { label: 'RECOVERY', color: 'bg-purple-900/50 text-purple-300' },
  nutrition: { label: 'NUTRITION', color: 'bg-green-900/50 text-green-300' },
  technique: { label: 'TECHNIQUE', color: 'bg-cyan-900/50 text-cyan-300' },
  mindset: { label: 'MINDSET', color: 'bg-amber-900/50 text-amber-300' },
  schedule: { label: 'SCHEDULE', color: 'bg-red-900/50 text-red-300' },
};

const PRIORITY_BORDER: Record<CoachingAdvice['priority'], string> = {
  high: 'border-l-red-400',
  medium: 'border-l-yellow-400',
  low: 'border-l-slate-600',
};

function AdviceCard({ advice }: { advice: CoachingAdvice }) {
  const cat = CATEGORY_LABELS[advice.category];
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border-l-4 ${PRIORITY_BORDER[advice.priority]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.color}`}>
          {cat.label}
        </span>
        <span className="text-sm font-semibold text-slate-200">{advice.title}</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{advice.message}</p>
    </div>
  );
}

export function CoachPage({ workouts, bodyMetrics, config }: CoachPageProps) {
  const [activeSection, setActiveSection] = useState<'advice' | 'plan' | 'schedule'>('advice');

  const advice = generateCoachingAdvice(workouts, bodyMetrics, config);
  const plan = generateNextWorkoutPlan(workouts);
  const schedule = generateWeeklySchedule(workouts);
  const standards = getStrengthStandards(workouts, config.currentWeight || 185);

  // Sort advice: high priority first
  const sortedAdvice = [...advice].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = schedule.days.find(d => d.dayName === dayOfWeek);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Your Coach</h1>
        <p className="text-xs text-slate-400">Personalized training guidance for a 33M</p>
      </div>

      {/* Today's Plan */}
      <div className={`rounded-xl p-4 ${
        todaySchedule?.type === 'training'
          ? 'bg-blue-900/30 border border-blue-700'
          : todaySchedule?.type === 'active_recovery'
          ? 'bg-purple-900/30 border border-purple-700'
          : 'bg-slate-800 border border-slate-700'
      }`}>
        <div className="text-xs text-slate-400 mb-1">Today &mdash; {dayOfWeek}</div>
        <div className="text-lg font-bold">
          {todaySchedule?.type === 'training' ? 'Training Day' :
           todaySchedule?.type === 'active_recovery' ? 'Active Recovery' : 'Rest Day'}
        </div>
        <div className="text-sm text-slate-300 mt-1">{todaySchedule?.note}</div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        {([
          { id: 'advice' as const, label: 'Coaching' },
          { id: 'plan' as const, label: 'Next Workout' },
          { id: 'schedule' as const, label: 'Schedule' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
              activeSection === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* COACHING ADVICE */}
      {activeSection === 'advice' && (
        <div className="space-y-3">
          {/* Strength Level */}
          {standards && (
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-2">Bench Press Level</div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold">{standards.current} lbs</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  standards.level === 'advanced' ? 'bg-purple-900/50 text-purple-300' :
                  standards.level === 'intermediate' ? 'bg-blue-900/50 text-blue-300' :
                  standards.level === 'novice' ? 'bg-green-900/50 text-green-300' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {standards.level.toUpperCase()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Novice ({standards.novice})</span>
                  <span>Int ({standards.intermediate})</span>
                  <span>Adv ({standards.advanced})</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (standards.current / standards.advanced) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {sortedAdvice.map((a, i) => (
            <AdviceCard key={i} advice={a} />
          ))}
        </div>
      )}

      {/* NEXT WORKOUT PLAN */}
      {activeSection === 'plan' && (
        <div className="space-y-3">
          <div className="bg-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-400">Warm-Up</h3>
              <span className="text-xs text-slate-500">~5 min</span>
            </div>
            {plan.warmupAdvice.map((w, i) => (
              <div key={i} className="text-xs text-slate-300 flex gap-2">
                <span className="text-slate-500 flex-shrink-0">{i + 1}.</span>
                <span>{w}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 rounded-xl p-4 space-y-1">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">Focus Cues</h3>
            {plan.focusCues.map((c, i) => (
              <div key={i} className="text-xs text-slate-300 py-1 border-b border-slate-700/50 last:border-0">
                {c}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {plan.exercises.map((ex, i) => (
              <div key={ex.exerciseId} className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono w-5">{i + 1}.</span>
                    <span className="text-sm font-medium">{ex.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">{ex.targetSets}x{ex.targetReps}</span>
                </div>
                <div className="flex items-center justify-between ml-7">
                  <span className={`text-sm font-bold ${
                    ex.note.startsWith('Progress') ? 'text-green-400' :
                    ex.note.startsWith('Deload') ? 'text-yellow-400' :
                    'text-slate-300'
                  }`}>
                    {ex.targetWeight > 0 ? `${ex.targetWeight} lbs` : 'Start light'}
                  </span>
                  <span className={`text-[10px] ${
                    ex.note.startsWith('Progress') ? 'text-green-400/70' :
                    ex.note.startsWith('Deload') ? 'text-yellow-400/70' :
                    'text-slate-500'
                  }`}>
                    {ex.note}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400">
            Estimated session time: ~{plan.estimatedDuration} min with supersets.
            Rest 90-120 sec between sets, 60 sec between superset pairs.
          </div>
        </div>
      )}

      {/* WEEKLY SCHEDULE */}
      {activeSection === 'schedule' && (
        <div className="space-y-3">
          <div className="bg-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">3-Day Full Body Split</h3>
            <div className="space-y-2">
              {schedule.days.map(day => {
                const isToday = day.dayName === dayOfWeek;
                return (
                  <div
                    key={day.dayName}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isToday ? 'bg-slate-700/50 ring-1 ring-blue-500/30' : ''
                    }`}
                  >
                    <span className={`text-xs font-medium w-20 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                      {day.dayName.slice(0, 3)}
                      {isToday && ' (today)'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      day.type === 'training'
                        ? 'bg-blue-900/50 text-blue-300'
                        : day.type === 'active_recovery'
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'bg-slate-700 text-slate-500'
                    }`}>
                      {day.type === 'training' ? 'TRAIN' :
                       day.type === 'active_recovery' ? 'ACTIVE' : 'REST'}
                    </span>
                    <span className="text-xs text-slate-400 flex-1">{day.note}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Training Philosophy</h3>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                <span className="text-blue-400 font-medium">3 days/week full body</span> is optimal for natural lifters at your stage.
                Every muscle gets trained 3x/week with enough recovery between sessions.
              </p>
              <p>
                <span className="text-cyan-400 font-medium">Progressive overload</span> is the driver.
                When you hit the top of the rep range for all sets, add weight.
                This simple system works for years before needing periodization.
              </p>
              <p>
                <span className="text-green-400 font-medium">The 80/20 rule:</span> 80% of your results
                come from showing up 3x/week, hitting protein targets, and sleeping 7+ hours.
                Everything else is optimization.
              </p>
              <p>
                <span className="text-purple-400 font-medium">At 33:</span> You recover slightly slower than
                at 25 but have more discipline and training IQ. Trade ego lifting for smart progression.
                Injuries set you back months — a conservative approach keeps you moving forward.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Deload Protocol</h3>
            <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
              <p>Every 4-6 weeks (or when flagged), take a deload week:</p>
              <p>• Same exercises, same schedule</p>
              <p>• Drop all weights to 60% of working weight</p>
              <p>• Keep reps the same but stop 3-4 reps from failure</p>
              <p>• Sessions should feel easy — that's the point</p>
              <p>• Use the extra energy for mobility work and foam rolling</p>
              <p className="text-cyan-400/80 pt-1">This isn't laziness — it's how you avoid plateaus and injuries.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
