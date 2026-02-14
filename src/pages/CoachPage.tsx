import { useState } from 'react';
import type { WorkoutSession, BodyMetric, UserConfig } from '../types';
import {
  generateCoachingAdvice,
  generateNextWorkoutPlan,
  generateWeeklySchedule,
  getStrengthStandards,
} from '../utils/coaching';
import type { CoachingAdvice } from '../utils/coaching';
import { getHotelWorkout, LEG_PHASES } from '../utils/exercises';
import type { HotelExercise } from '../utils/exercises';

interface CoachPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onUpdateConfig?: (config: UserConfig) => void;
}

const CATEGORY_LABELS: Record<CoachingAdvice['category'], { label: string; color: string }> = {
  workout_plan: { label: 'PLAN', color: 'bg-blue-900/50 text-blue-300' },
  recovery: { label: 'RECOVERY', color: 'bg-purple-900/50 text-purple-300' },
  nutrition: { label: 'NUTRITION', color: 'bg-green-900/50 text-green-300' },
  technique: { label: 'TECHNIQUE', color: 'bg-cyan-900/50 text-cyan-300' },
  mindset: { label: 'MINDSET', color: 'bg-amber-900/50 text-amber-300' },
  schedule: { label: 'SCHEDULE', color: 'bg-red-900/50 text-red-300' },
  travel: { label: 'TRAVEL', color: 'bg-orange-900/50 text-orange-300' },
  legs: { label: 'LEGS', color: 'bg-teal-900/50 text-teal-300' },
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

function HotelExerciseCard({ exercise, index }: { exercise: HotelExercise; index: number }) {
  const groupColor: Record<string, string> = {
    chest: 'text-red-400',
    back: 'text-blue-400',
    shoulders: 'text-yellow-400',
    arms: 'text-purple-400',
    legs: 'text-green-400',
    core: 'text-cyan-400',
  };

  const equipBadge: Record<string, string> = {
    none: 'bg-slate-700 text-slate-400',
    band: 'bg-orange-900/50 text-orange-300',
    dumbbell: 'bg-blue-900/50 text-blue-300',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono w-5">{index + 1}.</span>
          <span className={`text-sm font-medium ${groupColor[exercise.muscleGroup] || 'text-slate-300'}`}>
            {exercise.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${equipBadge[exercise.equipment]}`}>
            {exercise.equipment === 'none' ? 'BW' : exercise.equipment.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500">{exercise.sets}x{exercise.reps}</span>
        </div>
      </div>
      <div className="ml-7 text-[10px] text-slate-500">{exercise.note}</div>
    </div>
  );
}

export function CoachPage({ workouts, bodyMetrics, config, onUpdateConfig }: CoachPageProps) {
  const [activeSection, setActiveSection] = useState<'advice' | 'plan' | 'hotel' | 'schedule'>('advice');
  const [hotelEquipment, setHotelEquipment] = useState<'none' | 'band' | 'dumbbell'>('none');

  const legPhase = config.legPhase ?? 1;
  const advice = generateCoachingAdvice(workouts, bodyMetrics, config);
  const plan = generateNextWorkoutPlan(workouts, legPhase);
  const schedule = generateWeeklySchedule(workouts);
  const standards = getStrengthStandards(workouts, config.currentWeight || 185);
  const hotelWorkout = getHotelWorkout(hotelEquipment, legPhase);

  const sortedAdvice = [...advice].sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return p[a.priority] - p[b.priority];
  });

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = schedule.days.find(d => d.dayName === dayOfWeek);

  const currentLegInfo = LEG_PHASES.find(p => p.phase === legPhase);

  const handleLegPhaseChange = (newPhase: number) => {
    if (onUpdateConfig) {
      onUpdateConfig({ ...config, legPhase: newPhase });
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Your Coach</h1>
        <p className="text-xs text-slate-400">Upper body focus, whole body health -- 33M</p>
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
          { id: 'plan' as const, label: 'Gym' },
          { id: 'hotel' as const, label: 'Hotel' },
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

          {/* Leg Phase Widget */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">Leg Volume Phase</div>
              <span className="text-xs font-bold text-teal-400">{currentLegInfo?.name}</span>
            </div>
            <div className="flex gap-1 mb-2">
              {LEG_PHASES.map(phase => (
                <button
                  key={phase.phase}
                  onClick={() => handleLegPhaseChange(phase.phase)}
                  className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                    phase.phase === legPhase
                      ? 'bg-teal-600 text-white font-medium'
                      : phase.phase < legPhase
                      ? 'bg-teal-900/30 text-teal-400'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  {phase.phase}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-500">
              {currentLegInfo?.description}. {currentLegInfo?.exercises}
            </div>
          </div>

          {sortedAdvice.map((a, i) => (
            <AdviceCard key={i} advice={a} />
          ))}
        </div>
      )}

      {/* GYM WORKOUT PLAN */}
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

          {/* Upper Body Exercises */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-medium px-1">Upper Body (Priority)</div>
            {plan.exercises.filter(ex =>
              !['rdl', 'lunges'].includes(ex.exerciseId)
            ).map((ex, i) => (
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

          {/* Leg Exercises */}
          {plan.exercises.filter(ex => ['rdl', 'lunges'].includes(ex.exerciseId)).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-teal-400 font-medium px-1">
                Lower Body (Phase {legPhase}: {currentLegInfo?.name})
              </div>
              {plan.exercises.filter(ex => ['rdl', 'lunges'].includes(ex.exerciseId)).map((ex, i) => (
                <div key={ex.exerciseId} className="bg-slate-800 rounded-xl p-3 border-l-2 border-l-teal-600/50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-teal-500 font-mono w-5">L{i + 1}.</span>
                      <span className="text-sm font-medium">{ex.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">{ex.targetSets}x{ex.targetReps}</span>
                  </div>
                  <div className="flex items-center justify-between ml-7">
                    <span className="text-sm font-bold text-slate-300">
                      {ex.targetWeight > 0 ? `${ex.targetWeight} lbs` : 'Start light'}
                    </span>
                    <span className="text-[10px] text-slate-500">{ex.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400">
            Estimated session time: ~{plan.estimatedDuration} min with supersets.
            Rest 90-120 sec between sets, 60 sec between superset pairs.
          </div>
        </div>
      )}

      {/* HOTEL WORKOUT */}
      {activeSection === 'hotel' && (
        <div className="space-y-3">
          <div className="bg-orange-900/20 border border-orange-800/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-orange-400 mb-1">Hotel / Travel Workout</h3>
            <p className="text-xs text-slate-300">
              Traveling doesn't mean skipping. Pick your equipment level and get after it.
              Upper body focus stays consistent — this is a maintenance session.
            </p>
          </div>

          {/* Equipment Selection */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 mb-2">What do you have access to?</div>
            <div className="flex gap-2">
              {([
                { id: 'none' as const, label: 'Nothing', desc: 'Just a hotel room' },
                { id: 'band' as const, label: 'Band', desc: 'Resistance band' },
                { id: 'dumbbell' as const, label: 'Dumbbells', desc: 'Hotel gym' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setHotelEquipment(opt.id)}
                  className={`flex-1 rounded-lg p-2 text-center transition-colors ${
                    hotelEquipment === opt.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Hotel Exercise List */}
          <div className="space-y-2">
            {hotelWorkout.exercises.map((ex, i) => (
              <HotelExerciseCard key={ex.id} exercise={ex} index={i} />
            ))}
          </div>

          {/* Hotel Workout Notes */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-orange-400">Session Notes</h3>
            {hotelWorkout.notes.map((n, i) => (
              <div key={i} className="text-xs text-slate-400">• {n}</div>
            ))}
          </div>

          {/* Packing List */}
          <div className="bg-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">Travel Packing List</h3>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                <span>Resistance band (medium tension) -- #1 priority</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                <span>Protein powder travel packets (2 per day)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                <span>Creatine pre-measured bags</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                <span>Door anchor for band (if your band set has one)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400">
            Goal: maintain muscle stimulus while traveling. You won't build strength here,
            but you'll keep what you have and stay in the habit. That's what matters.
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
                <span className="text-blue-400 font-medium">Upper body focus</span> for aesthetics and health.
                Back, chest, shoulders, and arms get full volume every session.
                This builds the V-taper and fills out a shirt.
              </p>
              <p>
                <span className="text-teal-400 font-medium">Legs ease in gradually.</span> Starting with
                RDLs for posterior chain health, adding lunges over time. No shame in prioritizing
                upper body — but we keep legs in the program for joint health and hormonal response.
              </p>
              <p>
                <span className="text-cyan-400 font-medium">Progressive overload</span> is the driver.
                When you hit the top of the rep range for all sets, add weight.
                This simple system works for years before needing periodization.
              </p>
              <p>
                <span className="text-orange-400 font-medium">Travel days:</span> Switch to hotel workouts.
                A 30-min bodyweight session keeps the habit alive and maintains muscle.
                Consistency over intensity — always.
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
              <p>- Same exercises, same schedule</p>
              <p>- Drop all weights to 60% of working weight</p>
              <p>- Keep reps the same but stop 3-4 reps from failure</p>
              <p>- Sessions should feel easy -- that's the point</p>
              <p>- Use the extra energy for mobility work and foam rolling</p>
              <p className="text-cyan-400/80 pt-1">This isn't laziness -- it's how you avoid plateaus and injuries.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
