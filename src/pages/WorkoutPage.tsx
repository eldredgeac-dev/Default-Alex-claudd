import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession, ExerciseLog, SetLog } from '../types';
import { EXERCISES, SUPERSET_SUGGESTIONS, getExerciseDisplayName, getExercisesForLegPhase, getHotelWorkout } from '../utils/exercises';
import type { HotelExercise } from '../utils/exercises';
import { getLastWorkoutForExercise, generateProgressionSuggestions } from '../utils/progression';

interface WorkoutPageProps {
  workouts: WorkoutSession[];
  onSave: (workout: WorkoutSession) => void;
  exerciseChoices: Record<string, string>;
  legPhase?: number;
}

function SetInput({
  set,
  setIndex,
  onChange,
}: {
  set: SetLog;
  setIndex: number;
  onChange: (index: number, field: 'weight' | 'reps', value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-6">S{setIndex + 1}</span>
      <input
        type="number"
        value={set.weight || ''}
        onChange={e => onChange(setIndex, 'weight', parseFloat(e.target.value) || 0)}
        placeholder="lbs"
        className="w-20 bg-slate-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        inputMode="decimal"
      />
      <span className="text-slate-500 text-xs">x</span>
      <input
        type="number"
        value={set.reps || ''}
        onChange={e => onChange(setIndex, 'reps', parseInt(e.target.value) || 0)}
        placeholder="reps"
        className="w-16 bg-slate-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        inputMode="numeric"
      />
    </div>
  );
}

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
    <div className="space-y-1.5">
      {sets.map((set, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-6">S{idx + 1}</span>
          {exercise.equipment !== 'none' ? (
            <>
              <input
                type="number"
                value={set.weight || ''}
                onChange={e => handleChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                placeholder="lbs"
                className="w-20 bg-slate-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                inputMode="decimal"
              />
              <span className="text-slate-500 text-xs">x</span>
            </>
          ) : null}
          <input
            type="number"
            value={set.reps || ''}
            onChange={e => handleChange(idx, 'reps', parseInt(e.target.value) || 0)}
            placeholder="reps"
            className="w-16 bg-slate-700 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
            inputMode="numeric"
          />
          {exercise.equipment === 'none' && (
            <span className="text-[10px] text-slate-500">reps</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function WorkoutPage({ workouts, onSave, exerciseChoices, legPhase = 1 }: WorkoutPageProps) {
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

  // Initialize gym exercises with last workout's weights
  useEffect(() => {
    const initial: ExerciseLog[] = activeExercises.map(ex => {
      const last = getLastWorkoutForExercise(workouts, ex.id);
      const sets: SetLog[] = [];
      for (let i = 0; i < ex.sets; i++) {
        sets.push({
          weight: last?.sets[i]?.weight ?? 0,
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
    const now = new Date().toISOString();
    setStartTime(now);
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
      // Convert hotel logs to ExerciseLog format
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

  // Check if exercise hit progression target
  const hitTarget = (exLog: ExerciseLog, exerciseId: string): boolean => {
    const def = EXERCISES.find(e => e.id === exerciseId);
    if (!def) return false;
    return exLog.sets.every(s => s.reps >= def.maxReps && s.weight > 0);
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

  // Split gym exercises into upper/lower body
  const upperExercises = exercises.filter((_, i) =>
    activeExercises[i] && activeExercises[i].muscleGroup !== 'legs'
  );
  const lowerExercises = exercises.filter((_, i) =>
    activeExercises[i] && activeExercises[i].muscleGroup === 'legs'
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Mode Toggle */}
      {!isActive && !saved && (
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setMode('gym')}
            className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
              mode === 'gym' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gym Workout
          </button>
          <button
            onClick={() => setMode('hotel')}
            className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
              mode === 'hotel' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hotel Workout
          </button>
        </div>
      )}

      {/* Session Timer */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${
        mode === 'hotel' ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-slate-800'
      }`}>
        <div>
          <div className="text-sm text-slate-400">
            {mode === 'gym' ? 'Gym Session' : 'Hotel Session'}
          </div>
          <div className="text-2xl font-mono font-bold">
            {isActive ? formatTime(elapsed) : '--:--'}
          </div>
        </div>
        {!isActive && !saved ? (
          <button
            onClick={handleStartSession}
            className={`rounded-lg px-6 py-2 font-medium transition-colors ${
              mode === 'hotel'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Start {mode === 'hotel' ? 'Hotel' : ''} Workout
          </button>
        ) : !saved ? (
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg px-6 py-2 font-medium transition-colors"
          >
            Save Workout
          </button>
        ) : (
          <span className="text-green-400 font-medium">Saved</span>
        )}
      </div>

      {/* Rest Timer */}
      {isActive && (
        <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Rest:</span>
            {restActive ? (
              <span className={`text-xl font-mono font-bold ${restTimer <= 5 ? 'text-red-400' : 'text-cyan-400'}`}>
                {formatTime(restTimer)}
              </span>
            ) : (
              <span className="text-slate-500 text-sm">Tap to start</span>
            )}
          </div>
          <div className="flex gap-2">
            {(mode === 'hotel' ? [30, 45, 60] : [60, 90, 120]).map(s => (
              <button
                key={s}
                onClick={() => startRest(s)}
                className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1 text-xs transition-colors"
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
            <div className="bg-slate-800/50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1">Efficiency tips:</div>
              {SUPERSET_SUGGESTIONS.map((ss, i) => (
                <div key={i} className="text-xs text-cyan-400/70">{ss.message}</div>
              ))}
            </div>
          )}

          {/* Upper Body Exercises */}
          {upperExercises.length > 0 && (
            <div className="text-xs text-slate-400 font-medium px-1">Upper Body</div>
          )}
          {upperExercises.map((exLog) => {
            // Find the original index in the full exercise array
            const exIdx = exercises.indexOf(exLog);
            const def = activeExercises[exIdx];
            if (!def) return null;
            const isHit = hitTarget(exLog, def.id);
            return (
              <div
                key={def.id}
                className={`bg-slate-800 rounded-xl p-4 space-y-2 ${
                  isHit ? 'ring-1 ring-green-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">
                      {getExerciseDisplayName(def.id, exerciseChoices)}
                    </h3>
                    {def.alternativeName && !exerciseChoices[def.id] && (
                      <span className="text-xs text-slate-500">or {def.alternativeName}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {def.sets}x{def.minReps}-{def.maxReps}
                    {def.perLeg ? '/leg' : ''}
                  </div>
                </div>
                {isHit && (
                  <div className="text-xs text-green-400 font-medium">
                    Hit target! Ready to progress.
                  </div>
                )}
                <div className="space-y-1.5">
                  {exLog.sets.map((set, setIdx) => (
                    <SetInput
                      key={setIdx}
                      set={set}
                      setIndex={setIdx}
                      onChange={(si, field, val) => handleSetChange(exIdx, si, field, val)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Lower Body Exercises */}
          {lowerExercises.length > 0 && (
            <div className="text-xs text-teal-400 font-medium px-1">Lower Body</div>
          )}
          {lowerExercises.map((exLog) => {
            const exIdx = exercises.indexOf(exLog);
            const def = activeExercises[exIdx];
            if (!def) return null;
            const isHit = hitTarget(exLog, def.id);
            return (
              <div
                key={def.id}
                className={`bg-slate-800 rounded-xl p-4 space-y-2 border-l-2 border-l-teal-600/50 ${
                  isHit ? 'ring-1 ring-green-500/50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">
                      {getExerciseDisplayName(def.id, exerciseChoices)}
                    </h3>
                    {def.alternativeName && !exerciseChoices[def.id] && (
                      <span className="text-xs text-slate-500">or {def.alternativeName}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {def.sets}x{def.minReps}-{def.maxReps}
                    {def.perLeg ? '/leg' : ''}
                  </div>
                </div>
                {isHit && (
                  <div className="text-xs text-green-400 font-medium">
                    Hit target! Ready to progress.
                  </div>
                )}
                <div className="space-y-1.5">
                  {exLog.sets.map((set, setIdx) => (
                    <SetInput
                      key={setIdx}
                      set={set}
                      setIndex={setIdx}
                      onChange={(si, field, val) => handleSetChange(exIdx, si, field, val)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ========== HOTEL MODE ========== */}
      {mode === 'hotel' && (
        <>
          {/* Equipment Selection */}
          {!isActive && !saved && (
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-2">Equipment available?</div>
              <div className="flex gap-2">
                {([
                  { id: 'none' as const, label: 'Nothing', desc: 'Bodyweight only' },
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
          )}

          {/* Hotel Exercises */}
          {hotelWorkout.exercises.map(ex => {
            const groupColor: Record<string, string> = {
              chest: 'text-red-400',
              back: 'text-blue-400',
              shoulders: 'text-yellow-400',
              arms: 'text-purple-400',
              legs: 'text-green-400',
              core: 'text-cyan-400',
            };
            return (
              <div key={ex.id} className="bg-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium text-sm ${groupColor[ex.muscleGroup] || 'text-slate-300'}`}>
                    {ex.name}
                  </h3>
                  <div className="text-xs text-slate-500">{ex.sets}x{ex.reps}</div>
                </div>
                <div className="text-[10px] text-slate-500">{ex.note}</div>
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

          {/* Hotel Tips */}
          {isActive && (
            <div className="bg-orange-900/10 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              {hotelWorkout.notes.map((n, i) => (
                <div key={i}>- {n}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Notes */}
      <div className="bg-slate-800 rounded-xl p-4">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={mode === 'hotel'
            ? "Notes (e.g., hotel gym was decent, only had up to 30lb DBs...)"
            : "Workout notes (e.g., felt strong, knees bothered me...)"
          }
          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Post-Workout Suggestions (gym only) */}
      {saved && mode === 'gym' && suggestions.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-blue-400">Progression Suggestions</h3>
          {suggestions
            .filter(s => s.type !== 'form')
            .slice(0, 5)
            .map((s, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg ${
                  s.type === 'increase'
                    ? 'bg-green-900/30 text-green-300'
                    : s.type === 'deload'
                    ? 'bg-red-900/30 text-red-300'
                    : 'bg-yellow-900/30 text-yellow-300'
                }`}
              >
                {s.message}
              </div>
            ))}
        </div>
      )}

      {/* Post-workout Hotel summary */}
      {saved && mode === 'hotel' && (
        <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-orange-400">Hotel Workout Complete</h3>
          <p className="text-xs text-slate-300">
            You showed up on the road — that's the win. This session maintained your muscle stimulus
            and kept the training habit alive. Get your protein in and rest up for the next one.
          </p>
        </div>
      )}
    </div>
  );
}
