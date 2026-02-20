import { useState, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, ExerciseLog, SetLog, ExerciseDefinition } from '../types';
import { SUPERSET_SUGGESTIONS, getExerciseDisplayName, getExercisesForLegPhase, getHotelWorkout } from '../utils/exercises';
import type { HotelExercise } from '../utils/exercises';
import { getLastWorkoutForExercise, generateProgressionSuggestions, computeExerciseTargets, compareToLast } from '../utils/progression';
import type { ExerciseTarget } from '../utils/progression';

interface WorkoutPageProps {
  workouts: WorkoutSession[];
  onSave: (workout: WorkoutSession) => void;
  exerciseChoices: Record<string, string>;
  legPhase?: number;
  onSwapExercise?: (exerciseId: string) => void;
}

// --- Gym exercise card with targets, last session, and live feedback ---

function GymExerciseCard({
  def,
  exLog,
  target,
  exerciseChoices,
  isLeg,
  onSetChange,
  onSwapExercise,
}: {
  def: ExerciseDefinition;
  exLog: ExerciseLog;
  target: ExerciseTarget | undefined;
  exerciseChoices: Record<string, string>;
  isLeg: boolean;
  onSetChange: (setIndex: number, field: 'weight' | 'reps', value: number) => void;
  onSwapExercise?: (exerciseId: string) => void;
}) {
  const hitTarget = exLog.sets.every(s => s.reps >= def.maxReps && s.weight > 0);
  const comparison = compareToLast(exLog.sets, target?.lastSession ?? null);

  const actionColor = !target ? 'text-slate-500' :
    target.action === 'progress' ? 'text-green-400' :
    target.action === 'deload' ? 'text-yellow-400' :
    target.action === 'first_time' ? 'text-blue-400' :
    'text-slate-400';

  const feedbackColor =
    comparison.status === 'beating' ? 'text-green-400' :
    comparison.status === 'matching' ? 'text-blue-400' :
    comparison.status === 'under' ? 'text-yellow-400' :
    'text-transparent';

  const currentName = getExerciseDisplayName(def.id, exerciseChoices);
  const hasAlt = !!def.alternativeName;

  const muscleColors: Record<string, string> = {
    back: 'from-blue-500/8',
    chest: 'from-red-500/8',
    shoulders: 'from-amber-500/8',
    arms: 'from-purple-500/8',
    legs: 'from-teal-500/8',
    traps: 'from-cyan-500/8',
  };

  return (
    <div
      className={`bg-gradient-to-br ${muscleColors[def.muscleGroup] ?? 'from-slate-800/80'} to-slate-900/60 rounded-2xl p-4 space-y-2.5 border transition-all ${
        hitTarget
          ? 'border-green-500/30 glow-green'
          : isLeg
          ? 'border-teal-500/15'
          : 'border-slate-700/20'
      }`}
    >
      {/* Exercise name + rep scheme */}
      <div className="flex items-center justify-between">
        <div>
          {hasAlt ? (
            <button
              onClick={() => onSwapExercise?.(def.id)}
              className="font-semibold text-sm text-left hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              {currentName}
              <span className="text-[10px] text-slate-500 bg-slate-700/50 rounded px-1 py-0.5">&#8644;</span>
            </button>
          ) : (
            <h3 className="font-semibold text-sm">{currentName}</h3>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium bg-slate-800/60 rounded-lg px-2 py-1">
          {def.sets}x{def.minReps}-{def.maxReps}
          {def.perLeg ? '/leg' : ''}
        </div>
      </div>

      {/* Target action banner */}
      {target && (
        <div className={`text-xs font-semibold ${actionColor} flex items-center justify-between`}>
          <span>{target.actionMessage}</span>
          {target.sessionsAtWeight >= 4 && target.action === 'match' && (
            <span className="text-yellow-500/80 text-[10px] bg-yellow-500/8 px-1.5 py-0.5 rounded-full">4+ wks same</span>
          )}
        </div>
      )}

      {/* Last session reference */}
      {target?.lastSession && (
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="font-medium">Last:</span>
          {target.lastSession.map((s, i) => (
            <span key={i} className="bg-slate-700/40 border border-slate-600/20 rounded-lg px-2 py-0.5 font-medium">
              {s.weight}x{s.reps}
            </span>
          ))}
          {target.bestEver && target.bestEver.weight > (target.lastSession[0]?.weight ?? 0) && (
            <span className="text-purple-400/80 ml-auto font-semibold">PR: {target.bestEver.weight}x{target.bestEver.reps}</span>
          )}
        </div>
      )}

      {/* Hit target celebration */}
      {hitTarget && (
        <div className="text-xs text-green-400 font-bold bg-green-500/8 rounded-lg px-2.5 py-1.5 text-center">
          All sets at max reps — add weight next time
        </div>
      )}

      {/* Set inputs */}
      <div className="space-y-2">
        {exLog.sets.map((set, setIdx) => {
          const lastSet = target?.lastSession?.[setIdx];
          const isBetter = lastSet && set.weight > 0 && set.reps > 0 &&
            (set.weight * set.reps) > (lastSet.weight * lastSet.reps);
          return (
            <div key={setIdx} className="flex items-center gap-2.5">
              <span className={`text-[10px] font-bold w-5 ${isLeg ? 'text-teal-500' : 'text-slate-500'}`}>S{setIdx + 1}</span>
              <input
                type="number"
                value={set.weight || ''}
                onChange={e => onSetChange(setIdx, 'weight', parseFloat(e.target.value) || 0)}
                placeholder={target?.targetWeight ? String(target.targetWeight) : 'lbs'}
                className="w-20 bg-slate-700/50 border border-slate-600/30 rounded-xl px-2.5 py-2 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                inputMode="decimal"
              />
              <span className="text-slate-500/60 text-xs font-bold">x</span>
              <input
                type="number"
                value={set.reps || ''}
                onChange={e => onSetChange(setIdx, 'reps', parseInt(e.target.value) || 0)}
                placeholder={target ? `${target.targetMinReps}-${target.targetMaxReps}` : 'reps'}
                className="w-16 bg-slate-700/50 border border-slate-600/30 rounded-xl px-2.5 py-2 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                inputMode="numeric"
              />
              {isBetter && <span className="text-green-400 text-xs font-bold">&#9650;</span>}
            </div>
          );
        })}
      </div>

      {/* Live comparison */}
      {comparison.status !== 'no_data' && (
        <div className={`text-[11px] font-bold ${feedbackColor} text-right`}>
          {comparison.detail}
        </div>
      )}
    </div>
  );
}

// --- Hotel set input ---

function HotelSetInput({
  exercise,
  sets,
  onUpdateSets,
}: {
  exercise: HotelExercise;
  sets: SetLog[];
  onUpdateSets: (sets: SetLog[]) => void;
}) {
  const handleChange = (setIdx: number, field: 'weight' | 'reps', value: number) => {
    const updated = sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
    onUpdateSets(updated);
  };

  return (
    <div className="space-y-2">
      {sets.map((set, idx) => (
        <div key={idx} className="flex items-center gap-2.5">
          <span className="text-[10px] text-slate-500 font-bold w-5">S{idx + 1}</span>
          {exercise.equipment !== 'none' ? (
            <>
              <input
                type="number"
                value={set.weight || ''}
                onChange={e => handleChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                placeholder="lbs"
                className="w-20 bg-slate-700/50 border border-slate-600/30 rounded-xl px-2.5 py-2 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
                inputMode="decimal"
              />
              <span className="text-slate-500/60 text-xs font-bold">x</span>
            </>
          ) : null}
          <input
            type="number"
            value={set.reps || ''}
            onChange={e => handleChange(idx, 'reps', parseInt(e.target.value) || 0)}
            placeholder="reps"
            className="w-16 bg-slate-700/50 border border-slate-600/30 rounded-xl px-2.5 py-2 text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
            inputMode="numeric"
          />
          {exercise.equipment === 'none' && (
            <span className="text-[10px] text-slate-500 font-medium">reps</span>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Main WorkoutPage ---

export function WorkoutPage({ workouts, onSave, exerciseChoices, legPhase = 1, onSwapExercise }: WorkoutPageProps) {
  const [mode, setMode] = useState<'gym' | 'hotel'>('gym');
  const [hotelEquipment, setHotelEquipment] = useState<'none' | 'band' | 'dumbbell'>('none');
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [hotelLogs, setHotelLogs] = useState<Record<string, SetLog[]>>({});
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeExercises = getExercisesForLegPhase(legPhase);
  const hotelWorkout = getHotelWorkout(hotelEquipment, legPhase);

  // Compute smart targets from history
  const targets = useMemo(() => computeExerciseTargets(workouts), [workouts]);
  const targetMap = useMemo(() => {
    const m: Record<string, ExerciseTarget> = {};
    for (const t of targets) m[t.exerciseId] = t;
    return m;
  }, [targets]);

  // Initialize gym exercises — use target weight (smart) instead of just last weight
  useEffect(() => {
    const initial: ExerciseLog[] = activeExercises.map(ex => {
      const target = targetMap[ex.id];
      const last = getLastWorkoutForExercise(workouts, ex.id);
      const sets: SetLog[] = [];
      for (let i = 0; i < ex.sets; i++) {
        sets.push({
          weight: target?.targetWeight ?? last?.sets[i]?.weight ?? 0,
          reps: 0,
        });
      }
      return { exerciseId: ex.id, sets };
    });
    setExercises(initial);
  }, [workouts, legPhase]);

  // Initialize hotel exercise logs when equipment changes
  useEffect(() => {
    const logs: Record<string, SetLog[]> = {};
    for (const ex of hotelWorkout.exercises) {
      logs[ex.id] = Array.from({ length: ex.sets }, () => ({ weight: 0, reps: 0 }));
    }
    setHotelLogs(logs);
  }, [hotelEquipment, legPhase]);

  // Session timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, startTime]);

  // Rest timer
  useEffect(() => {
    if (restActive && restTimer > 0) {
      restInterval.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setRestActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (restInterval.current) clearInterval(restInterval.current); };
  }, [restActive, restTimer]);

  const handleStartSession = () => {
    setStartTime(new Date().toISOString());
    setIsActive(true);
    setSaved(false);
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setExercises(prev => {
      const copy = [...prev];
      copy[exerciseIndex] = {
        ...copy[exerciseIndex],
        sets: copy[exerciseIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, [field]: value } : s
        ),
      };
      return copy;
    });
  };

  const handleSave = () => {
    const now = new Date();

    if (mode === 'gym') {
      const workout: WorkoutSession = {
        id: uuidv4(),
        date: now.toISOString().split('T')[0],
        exercises: exercises.filter(ex => ex.sets.some(s => s.weight > 0 && s.reps > 0)),
        notes,
        durationMinutes: startTime
          ? Math.round((now.getTime() - new Date(startTime).getTime()) / 60000)
          : null,
        startTime,
        endTime: now.toISOString(),
        workoutType: 'gym',
      };
      onSave(workout);
    } else {
      const hotelExercises: ExerciseLog[] = Object.entries(hotelLogs)
        .filter(([, sets]) => sets.some(s => s.reps > 0))
        .map(([exerciseId, sets]) => ({ exerciseId, sets }));

      const workout: WorkoutSession = {
        id: uuidv4(),
        date: now.toISOString().split('T')[0],
        exercises: hotelExercises,
        notes: notes || `Hotel workout (${hotelEquipment === 'none' ? 'bodyweight' : hotelEquipment})`,
        durationMinutes: startTime
          ? Math.round((now.getTime() - new Date(startTime).getTime()) / 60000)
          : null,
        startTime,
        endTime: now.toISOString(),
        workoutType: 'hotel',
      };
      onSave(workout);
    }

    setIsActive(false);
    setSaved(true);
  };

  const startRest = (seconds: number) => {
    setRestTimer(seconds);
    setRestActive(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Post-workout suggestions (gym only)
  const suggestions = saved && mode === 'gym' ? generateProgressionSuggestions([
    ...workouts,
    {
      id: 'current',
      date: new Date().toISOString().split('T')[0],
      exercises,
      notes: '',
      durationMinutes: null,
      startTime: null,
      endTime: null,
    },
  ]) : [];

  return (
    <div className="space-y-4 pb-4">
      {/* Mode Toggle */}
      {!isActive && !saved && (
        <div className="flex gap-1 bg-slate-800/40 rounded-2xl p-1 border border-slate-700/20">
          <button
            onClick={() => setMode('gym')}
            className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all ${
              mode === 'gym'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gym Workout
          </button>
          <button
            onClick={() => setMode('hotel')}
            className={`flex-1 text-xs py-2.5 rounded-xl font-bold transition-all ${
              mode === 'hotel'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hotel Workout
          </button>
        </div>
      )}

      {/* Session Timer */}
      <div className={`rounded-2xl p-5 flex items-center justify-between border transition-all ${
        mode === 'hotel'
          ? 'bg-gradient-to-br from-orange-900/30 to-orange-950/10 border-orange-500/15'
          : 'bg-gradient-to-br from-slate-800/80 to-slate-900/60 border-slate-700/20'
      }`}>
        <div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {mode === 'gym' ? 'Gym Session' : 'Hotel Session'}
          </div>
          <div className={`text-3xl font-mono font-extrabold mt-1 ${
            isActive ? (mode === 'hotel' ? 'text-orange-400' : 'text-blue-400') : 'text-slate-500'
          }`}>
            {isActive ? formatTime(elapsed) : '--:--'}
          </div>
        </div>
        {!isActive && !saved ? (
          <button
            onClick={handleStartSession}
            className={`rounded-xl px-6 py-3 font-bold text-sm transition-all shadow-lg ${
              mode === 'hotel'
                ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20'
                : 'bg-green-600 hover:bg-green-500 shadow-green-500/20'
            }`}
          >
            Start
          </button>
        ) : !saved ? (
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 rounded-xl px-6 py-3 font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
          >
            Save
          </button>
        ) : (
          <span className="text-green-400 font-bold text-sm bg-green-500/10 px-4 py-2 rounded-xl">Saved</span>
        )}
      </div>

      {/* Rest Timer */}
      {isActive && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 flex items-center justify-between border border-slate-700/20">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rest</span>
            {restActive ? (
              <span className={`text-2xl font-mono font-extrabold ${restTimer <= 5 ? 'text-red-400 animate-pulse-soft' : 'text-cyan-400'}`}>
                {formatTime(restTimer)}
              </span>
            ) : (
              <span className="text-slate-500 text-xs font-medium">Tap to start</span>
            )}
          </div>
          <div className="flex gap-1.5">
            {(mode === 'hotel' ? [30, 45, 60] : [60, 90, 120]).map(s => (
              <button
                key={s}
                onClick={() => startRest(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  restActive && restTimer > 0
                    ? 'bg-slate-700/50 text-slate-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========== GYM MODE ========== */}
      {mode === 'gym' && (
        <>
          {/* Superset Suggestions */}
          {isActive && (
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3">
              <div className="text-[10px] text-cyan-400/60 font-bold uppercase tracking-wider mb-1">Efficiency Tips</div>
              {SUPERSET_SUGGESTIONS.map((ss, i) => (
                <div key={i} className="text-[11px] text-cyan-400/70 font-medium">{ss.message}</div>
              ))}
            </div>
          )}

          {/* Upper Body Exercises */}
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">Upper Body</div>
          {exercises.map((exLog, exIdx) => {
            const def = activeExercises[exIdx];
            if (!def || def.muscleGroup === 'legs') return null;
            return (
              <GymExerciseCard
                key={def.id}
                def={def}
                exLog={exLog}
                target={targetMap[def.id]}
                exerciseChoices={exerciseChoices}
                isLeg={false}
                onSetChange={(si, field, val) => handleSetChange(exIdx, si, field, val)}
                onSwapExercise={onSwapExercise}
              />
            );
          })}

          {/* Lower Body Exercises */}
          {exercises.some((_, i) => activeExercises[i]?.muscleGroup === 'legs') && (
            <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider px-1">Lower Body</div>
          )}
          {exercises.map((exLog, exIdx) => {
            const def = activeExercises[exIdx];
            if (!def || def.muscleGroup !== 'legs') return null;
            return (
              <GymExerciseCard
                key={def.id}
                def={def}
                exLog={exLog}
                target={targetMap[def.id]}
                exerciseChoices={exerciseChoices}
                isLeg={true}
                onSetChange={(si, field, val) => handleSetChange(exIdx, si, field, val)}
                onSwapExercise={onSwapExercise}
              />
            );
          })}
        </>
      )}

      {/* ========== HOTEL MODE ========== */}
      {mode === 'hotel' && (
        <>
          {!isActive && !saved && (
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">Equipment Available?</div>
              <div className="flex gap-2">
                {([
                  { id: 'none' as const, label: 'Nothing', desc: 'Bodyweight only' },
                  { id: 'band' as const, label: 'Band', desc: 'Resistance band' },
                  { id: 'dumbbell' as const, label: 'Dumbbells', desc: 'Hotel gym' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setHotelEquipment(opt.id)}
                    className={`flex-1 rounded-xl p-2.5 text-center transition-all ${
                      hotelEquipment === opt.id
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-slate-600/20'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-70">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {hotelWorkout.exercises.map(ex => {
            const groupColor: Record<string, string> = {
              chest: 'text-red-400', back: 'text-blue-400', shoulders: 'text-yellow-400',
              arms: 'text-purple-400', legs: 'text-green-400', core: 'text-cyan-400',
            };
            return (
              <div key={ex.id} className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 space-y-2.5 border border-slate-700/20">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${groupColor[ex.muscleGroup] || 'text-slate-300'}`}>
                    {ex.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium bg-slate-800/60 rounded-lg px-2 py-1">{ex.sets}x{ex.reps}</div>
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed">{ex.note}</div>
                {hotelLogs[ex.id] && (
                  <HotelSetInput
                    exercise={ex}
                    sets={hotelLogs[ex.id]}
                    onUpdateSets={sets => setHotelLogs(prev => ({ ...prev, [ex.id]: sets }))}
                  />
                )}
              </div>
            );
          })}

          {isActive && (
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-3 text-xs text-slate-400 space-y-1">
              {hotelWorkout.notes.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-orange-400/50 shrink-0">&#x25B8;</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-2xl p-4 border border-slate-700/20">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={mode === 'hotel'
            ? "Notes (e.g., hotel gym was decent, only had up to 30lb DBs...)"
            : "Workout notes (e.g., felt strong, knees bothered me...)"
          }
          className="w-full bg-slate-700/40 border border-slate-600/20 rounded-xl px-3 py-2.5 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
        />
      </div>

      {/* Post-Workout Suggestions (gym only) */}
      {saved && mode === 'gym' && suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/60 rounded-2xl p-4 space-y-3 border border-blue-500/10 glow-blue">
          <h3 className="font-bold text-blue-400 text-sm">Next Session Preview</h3>
          {suggestions
            .filter(s => s.type !== 'form')
            .slice(0, 5)
            .map((s, i) => (
              <div
                key={i}
                className={`text-xs p-3 rounded-xl font-medium ${
                  s.type === 'increase'
                    ? 'bg-green-500/8 text-green-300 border border-green-500/10'
                    : s.type === 'deload'
                    ? 'bg-red-500/8 text-red-300 border border-red-500/10'
                    : 'bg-yellow-500/8 text-yellow-300 border border-yellow-500/10'
                }`}
              >
                {s.message}
              </div>
            ))}
        </div>
      )}

      {/* Post-workout Hotel summary */}
      {saved && mode === 'hotel' && (
        <div className="bg-gradient-to-br from-orange-900/20 to-orange-950/10 border border-orange-500/15 rounded-2xl p-5 space-y-2 glow-orange">
          <h3 className="font-bold text-orange-400 text-sm">Hotel Workout Complete</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            You showed up on the road — that's the win. This session maintained your muscle stimulus
            and kept the training habit alive. Get your protein in and rest up for the next one.
          </p>
        </div>
      )}
    </div>
  );
}
