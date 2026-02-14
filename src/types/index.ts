export interface ExerciseDefinition {
  id: string;
  name: string;
  alternativeName?: string;
  sets: number;
  minReps: number;
  maxReps: number;
  perLeg?: boolean;
  incrementLbs: number; // smallest weight increment for progression
  isMainLift?: boolean; // bench press gets special progression
  muscleGroup: 'back' | 'chest' | 'shoulders' | 'arms' | 'legs' | 'traps';
  priority: 'core' | 'important' | 'accessory'; // upper body focus ordering
}

export interface SetLog {
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO date string
  exercises: ExerciseLog[];
  notes: string;
  durationMinutes: number | null;
  startTime: string | null; // ISO timestamp
  endTime: string | null;
  workoutType?: 'gym' | 'hotel'; // track which type of workout
}

export interface BodyMetric {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  weight?: number; // lbs
  waist?: number; // inches
  protein?: number; // grams
}

export interface UserConfig {
  setupComplete: boolean;
  currentWeight: number;
  targetProtein: number;
  exerciseChoices: Record<string, string>; // exerciseId -> chosen variant name
  sessionTargetMinutes: number;
  legPhase: number; // 1-4: gradual leg volume ramp (1=minimal, 4=full)
}

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  type: 'increase' | 'plateau' | 'deload' | 'efficiency' | 'form';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface VerdictData {
  status: 'winning' | 'stalling' | 'losing' | 'insufficient_data';
  weightChange: number | null;
  waistChange: number | null;
  benchChange: { from: string; to: string; percentChange: number } | null;
  volumeChange: number | null;
  avgProtein: number | null;
  suggestions: string[];
}

export type TabId = 'dashboard' | 'coach' | 'workout' | 'body' | 'charts' | 'history';
