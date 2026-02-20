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
import { generateProgramSuggestions } from '../utils/programSuggestions';
import type { ProgramSuggestion } from '../utils/programSuggestions';

interface CoachPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onUpdateConfig?: (config: UserConfig) => void;
}

const CATEGORY_LABELS: Record<CoachingAdvice['category'], { label: string; color: string }> = {
  workout_plan: { label: 'PLAN', color: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' },
  recovery: { label: 'RECOVERY', color: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20' },
  nutrition: { label: 'NUTRITION', color: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/20' },
  technique: { label: 'TECHNIQUE', color: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20' },
  mindset: { label: 'MINDSET', color: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20' },
  schedule: { label: 'SCHEDULE', color: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/20' },
  travel: { label: 'TRAVEL', color: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/20' },
  legs: { label: 'LEGS', color: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/20' },
};

const PRIORITY_STYLES: Record<CoachingAdvice['priority'], string> = {
  high: 'border-l-red-400/60',
  medium: 'border-l-yellow-400/40',
  low: 'border-l-slate-600/40',
};

function AdviceCard({ advice }: { advice: CoachingAdvice }) {
  const cat = CATEGORY_LABELS[advice.category];
  return (
    <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border-l-4 ${PRIORITY_STYLES[advice.priority]} border border-slate-700/20`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>
          {cat.label}
        </span>
        <span className="text-sm font-bold text-slate-200">{advice.title}</span>
      </div>
      <p className="text-xs text-slate-300/80 leading-relaxed">{advice.message}</p>
    </div>
  );
}

function ProgramSuggestionCard({ suggestion }: { suggestion: ProgramSuggestion }) {
  const goalColors: Record<string, { bg: string; text: string; badge: string }> = {
    stall_buster: {
      bg: 'from-amber-900/20 to-slate-900/60',
      text: 'text-amber-300',
      badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
    },
    aesthetics: {
      bg: 'from-purple-900/20 to-slate-900/60',
      text: 'text-purple-300',
      badge: 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20',
    },
    strength: {
      bg: 'from-blue-900/20 to-slate-900/60',
      text: 'text-blue-300',
      badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20',
    },
  };

  const goalLabels: Record<string, string> = {
    stall_buster: 'STALL FIX',
    aesthetics: 'AESTHETICS',
    strength: 'STRENGTH',
  };

  const colors = goalColors[suggestion.goal] ?? goalColors.stall_buster;

  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-4 border border-slate-700/15 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {goalLabels[suggestion.goal]}
        </span>
        <span className={`text-xs font-bold ${colors.text}`}>{suggestion.title}</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{suggestion.description}</p>
      <div className="bg-slate-800/40 rounded-xl p-2.5">
        <p className="text-[11px] text-slate-200 font-medium leading-relaxed">{suggestion.action}</p>
      </div>
    </div>
  );
}

function HotelExerciseCard({ exercise, index }: { exercise: HotelExercise; index: number }) {
  const groupColor: Record<string, string> = {
    chest: 'text-red-400', back: 'text-blue-400', shoulders: 'text-yellow-400',
    arms: 'text-purple-400', legs: 'text-green-400', core: 'text-cyan-400',
  };

  const equipBadge: Record<string, string> = {
    none: 'bg-slate-700/50 text-slate-400',
    band: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/20',
    dumbbell: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20',
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-3 border border-slate-700/20">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono font-bold w-5">{index + 1}.</span>
          <span className={`text-sm font-semibold ${groupColor[exercise.muscleGroup] || 'text-slate-300'}`}>
            {exercise.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${equipBadge[exercise.equipment]}`}>
            {exercise.equipment === 'none' ? 'BW' : exercise.equipment.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500 font-medium">{exercise.sets}x{exercise.reps}</span>
        </div>
      </div>
      <div className="ml-7 text-[10px] text-slate-500 leading-relaxed">{exercise.note}</div>
    </div>
  );
}

export function CoachPage({ workouts, bodyMetrics, config, onUpdateConfig }: CoachPageProps) {
  const [activeSection, setActiveSection] = useState<'advice' | 'changes' | 'plan' | 'hotel' | 'schedule'>('advice');
  const [hotelEquipment, setHotelEquipment] = useState<'none' | 'band' | 'dumbbell'>('none');

  const legPhase = config.legPhase ?? 1;
  const advice = generateCoachingAdvice(workouts, bodyMetrics, config);
  const plan = generateNextWorkoutPlan(workouts, legPhase);
  const schedule = generateWeeklySchedule(workouts);
  const standards = getStrengthStandards(workouts, config.currentWeight || 185);
  const hotelWorkout = getHotelWorkout(hotelEquipment, legPhase);
  const programSuggestions = generateProgramSuggestions(workouts);

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

  const sections = [
    { id: 'advice' as const, label: 'Coach' },
    { id: 'changes' as const, label: 'Changes' },
    { id: 'plan' as const, label: 'Gym' },
    { id: 'hotel' as const, label: 'Hotel' },
    { id: 'schedule' as const, label: 'Schedule' },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Your Coach</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Upper body focus, whole body health -- 33M</p>
      </div>

      {/* Today's Plan */}
      <div className={`rounded-2xl p-5 border ${
        todaySchedule?.type === 'training'
          ? 'bg-gradient-to-br from-blue-900/30 to-blue-950/10 border-blue-500/20 glow-blue'
          : todaySchedule?.type === 'active_recovery'
          ? 'bg-gradient-to-br from-purple-900/30 to-purple-950/10 border-purple-500/20'
          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/20'
      }`}>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Today &mdash; {dayOfWeek}</div>
        <div className="text-xl font-extrabold">
          {todaySchedule?.type === 'training' ? 'Training Day' :
           todaySchedule?.type === 'active_recovery' ? 'Active Recovery' : 'Rest Day'}
        </div>
        <div className="text-sm text-slate-300 mt-1">{todaySchedule?.note}</div>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-1 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/20">
        {sections.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 text-[11px] py-2 rounded-xl font-bold transition-all ${
              activeSection === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
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
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Bench Press Level</div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-extrabold">{standards.current} <span className="text-sm font-medium text-slate-500">lbs</span></span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  standards.level === 'advanced' ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20' :
                  standards.level === 'intermediate' ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' :
                  standards.level === 'novice' ? 'bg-green-500/15 text-green-300 ring-1 ring-green-500/20' :
                  'bg-slate-700/50 text-slate-300'
                }`}>
                  {standards.level.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Novice ({standards.novice})</span>
                  <span>Int ({standards.intermediate})</span>
                  <span>Adv ({standards.advanced})</span>
                </div>
                <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (standards.current / standards.advanced) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Leg Phase Widget */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Leg Volume Phase</div>
              <span className="text-xs font-bold text-teal-400">{currentLegInfo?.name}</span>
            </div>
            <div className="flex gap-1.5 mb-2.5">
              {LEG_PHASES.map(phase => (
                <button
                  key={phase.phase}
                  onClick={() => handleLegPhaseChange(phase.phase)}
                  className={`flex-1 text-xs py-2 rounded-xl font-bold transition-all ${
                    phase.phase === legPhase
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                      : phase.phase < legPhase
                      ? 'bg-teal-900/30 text-teal-400'
                      : 'bg-slate-700/40 text-slate-500'
                  }`}
                >
                  {phase.phase}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              {currentLegInfo?.description}. {currentLegInfo?.exercises}
            </div>
          </div>

          {sortedAdvice.map((a, i) => (
            <AdviceCard key={i} advice={a} />
          ))}
        </div>
      )}

      {/* PROGRAM CHANGES */}
      {activeSection === 'changes' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-amber-900/15 to-slate-900/60 rounded-2xl p-4 border border-amber-500/10">
            <h3 className="text-sm font-bold text-amber-400 mb-1">Workout Intelligence</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Based on your training history, here are suggestions to keep progressing.
              Changes target three goals: breaking through stalls, building aesthetics (look better), and getting stronger.
            </p>
          </div>

          {programSuggestions.length > 0 ? (
            <>
              {/* Stall Busters */}
              {programSuggestions.filter(s => s.goal === 'stall_buster').length > 0 && (
                <>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider px-1">Stall Busters</div>
                  {programSuggestions.filter(s => s.goal === 'stall_buster').map((s, i) => (
                    <ProgramSuggestionCard key={`stall-${i}`} suggestion={s} />
                  ))}
                </>
              )}

              {/* Aesthetics */}
              {programSuggestions.filter(s => s.goal === 'aesthetics').length > 0 && (
                <>
                  <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider px-1 mt-2">For the Look</div>
                  {programSuggestions.filter(s => s.goal === 'aesthetics').map((s, i) => (
                    <ProgramSuggestionCard key={`aes-${i}`} suggestion={s} />
                  ))}
                </>
              )}

              {/* Strength */}
              {programSuggestions.filter(s => s.goal === 'strength').length > 0 && (
                <>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider px-1 mt-2">For Strength</div>
                  {programSuggestions.filter(s => s.goal === 'strength').map((s, i) => (
                    <ProgramSuggestionCard key={`str-${i}`} suggestion={s} />
                  ))}
                </>
              )}
            </>
          ) : (
            <div className="bg-gradient-to-br from-green-900/15 to-slate-900/60 rounded-2xl p-5 border border-green-500/10 text-center">
              <div className="text-green-400 font-bold text-sm mb-1">All Systems Go</div>
              <p className="text-[11px] text-slate-400">
                No stalls or changes needed right now. Keep following the progression system — when exercises need attention, suggestions will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GYM WORKOUT PLAN */}
      {activeSection === 'plan' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-slate-700/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-400">Warm-Up</h3>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-700/40 px-2 py-0.5 rounded-full">~5 min</span>
            </div>
            {plan.warmupAdvice.map((w, i) => (
              <div key={i} className="text-xs text-slate-300/80 flex gap-2">
                <span className="text-slate-500 flex-shrink-0 font-bold">{i + 1}.</span>
                <span>{w}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-cyan-900/10 to-slate-900/60 rounded-2xl p-4 space-y-1 border border-cyan-500/10">
            <h3 className="text-sm font-bold text-cyan-400 mb-2">Focus Cues</h3>
            {plan.focusCues.map((c, i) => (
              <div key={i} className="text-xs text-slate-300/80 py-1.5 border-b border-white/3 last:border-0">
                {c}
              </div>
            ))}
          </div>

          {/* Upper Body Exercises */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">Upper Body (Priority)</div>
            {plan.exercises.filter(ex =>
              !['rdl', 'lunges'].includes(ex.exerciseId)
            ).map((ex, i) => (
              <div key={ex.exerciseId} className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-3.5 border border-slate-700/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono font-bold w-5">{i + 1}.</span>
                    <span className="text-sm font-semibold">{ex.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium bg-slate-700/40 px-2 py-0.5 rounded-lg">{ex.targetSets}x{ex.targetReps}</span>
                </div>
                <div className="flex items-center justify-between ml-7">
                  <span className={`text-sm font-extrabold ${
                    ex.note.startsWith('Progress') ? 'text-green-400' :
                    ex.note.startsWith('Deload') ? 'text-yellow-400' :
                    'text-slate-300'
                  }`}>
                    {ex.targetWeight > 0 ? `${ex.targetWeight} lbs` : 'Start light'}
                  </span>
                  <span className={`text-[10px] font-medium ${
                    ex.note.startsWith('Progress') ? 'text-green-400/60' :
                    ex.note.startsWith('Deload') ? 'text-yellow-400/60' :
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
              <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider px-1">
                Lower Body (Phase {legPhase}: {currentLegInfo?.name})
              </div>
              {plan.exercises.filter(ex => ['rdl', 'lunges'].includes(ex.exerciseId)).map((ex, i) => (
                <div key={ex.exerciseId} className="bg-gradient-to-br from-teal-900/10 to-slate-900/60 rounded-2xl p-3.5 border border-teal-500/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-teal-500 font-mono font-bold w-5">L{i + 1}.</span>
                      <span className="text-sm font-semibold">{ex.name}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium bg-slate-700/40 px-2 py-0.5 rounded-lg">{ex.targetSets}x{ex.targetReps}</span>
                  </div>
                  <div className="flex items-center justify-between ml-7">
                    <span className="text-sm font-extrabold text-slate-300">
                      {ex.targetWeight > 0 ? `${ex.targetWeight} lbs` : 'Start light'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{ex.note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 text-xs text-slate-400">
            Estimated session: ~{plan.estimatedDuration} min with supersets. Rest 90-120s between sets.
          </div>
        </div>
      )}

      {/* HOTEL WORKOUT */}
      {activeSection === 'hotel' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-orange-900/20 to-orange-950/10 border border-orange-500/15 rounded-2xl p-4 glow-orange">
            <h3 className="text-sm font-bold text-orange-400 mb-1">Hotel / Travel Workout</h3>
            <p className="text-xs text-slate-300/80 leading-relaxed">
              Traveling doesn't mean skipping. Pick your equipment and get after it.
              Upper body focus stays consistent — this is a maintenance session.
            </p>
          </div>

          {/* Equipment Selection */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">Equipment</div>
            <div className="flex gap-2">
              {([
                { id: 'none' as const, label: 'Nothing', desc: 'Just a hotel room' },
                { id: 'band' as const, label: 'Band', desc: 'Resistance band' },
                { id: 'dumbbell' as const, label: 'Dumbbells', desc: 'Hotel gym' },
              ]).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setHotelEquipment(opt.id)}
                  className={`flex-1 rounded-xl p-2.5 text-center transition-all ${
                    hotelEquipment === opt.id
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                      : 'bg-slate-700/40 text-slate-400 hover:bg-slate-600/40 border border-slate-600/20'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
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
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-2 border border-slate-700/20">
            <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Session Notes</h3>
            {hotelWorkout.notes.map((n, i) => (
              <div key={i} className="text-xs text-slate-400 flex gap-2">
                <span className="text-orange-400/40 shrink-0">&#x25B8;</span>
                <span>{n}</span>
              </div>
            ))}
          </div>

          {/* Packing List */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-2.5 border border-slate-700/20">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Travel Packing List</h3>
            <div className="text-xs text-slate-400 space-y-2">
              {[
                'Resistance band (medium tension) -- #1 priority',
                'Protein powder travel packets (2 per day)',
                'Creatine pre-measured bags',
                'Door anchor for band (if your band set has one)',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-md border border-slate-600/40 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY SCHEDULE */}
      {activeSection === 'schedule' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">3-Day Full Body Split</h3>
            <div className="space-y-1.5">
              {schedule.days.map(day => {
                const isToday = day.dayName === dayOfWeek;
                return (
                  <div
                    key={day.dayName}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      isToday ? 'bg-blue-500/8 ring-1 ring-blue-500/20' : ''
                    }`}
                  >
                    <span className={`text-xs font-bold w-20 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                      {day.dayName.slice(0, 3)}
                      {isToday && ' *'}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      day.type === 'training'
                        ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20'
                        : day.type === 'active_recovery'
                        ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/20'
                        : 'bg-slate-700/50 text-slate-500'
                    }`}>
                      {day.type === 'training' ? 'TRAIN' :
                       day.type === 'active_recovery' ? 'ACTIVE' : 'REST'}
                    </span>
                    <span className="text-xs text-slate-400/80 flex-1">{day.note}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-slate-700/20">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Training Philosophy</h3>
            <div className="text-xs text-slate-400/80 space-y-3 leading-relaxed">
              <p>
                <span className="text-blue-400 font-bold">Upper body focus</span> for aesthetics and health.
                Back, chest, shoulders, and arms get full volume every session.
                This builds the V-taper and fills out a shirt.
              </p>
              <p>
                <span className="text-teal-400 font-bold">Legs ease in gradually.</span> Starting with
                RDLs for posterior chain health, adding lunges over time. No shame in prioritizing
                upper body — but we keep legs in the program for joint health and hormonal response.
              </p>
              <p>
                <span className="text-cyan-400 font-bold">Progressive overload</span> is the driver.
                When you hit the top of the rep range for all sets, add weight.
                This simple system works for years before needing periodization.
              </p>
              <p>
                <span className="text-orange-400 font-bold">Travel days:</span> Switch to hotel workouts.
                A 30-min bodyweight session keeps the habit alive and maintains muscle.
                Consistency over intensity — always.
              </p>
              <p>
                <span className="text-purple-400 font-bold">At 33:</span> You recover slightly slower than
                at 25 but have more discipline and training IQ. Trade ego lifting for smart progression.
                Injuries set you back months — a conservative approach keeps you moving forward.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-2 border border-slate-700/20">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deload Protocol</h3>
            <div className="text-xs text-slate-400/80 space-y-1.5 leading-relaxed">
              <p>Every 4-6 weeks (or when flagged), take a deload week:</p>
              <p className="flex gap-2"><span className="text-slate-500 shrink-0">&#x25B8;</span>Same exercises, same schedule</p>
              <p className="flex gap-2"><span className="text-slate-500 shrink-0">&#x25B8;</span>Drop all weights to 60% of working weight</p>
              <p className="flex gap-2"><span className="text-slate-500 shrink-0">&#x25B8;</span>Keep reps the same but stop 3-4 reps from failure</p>
              <p className="flex gap-2"><span className="text-slate-500 shrink-0">&#x25B8;</span>Sessions should feel easy — that's the point</p>
              <p className="flex gap-2"><span className="text-slate-500 shrink-0">&#x25B8;</span>Use the extra energy for mobility work and foam rolling</p>
              <p className="text-cyan-400/60 pt-1 font-medium">This isn't laziness — it's how you avoid plateaus and injuries.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
