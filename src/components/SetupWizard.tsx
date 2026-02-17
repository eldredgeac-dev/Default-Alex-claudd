import { useState } from 'react';
import type { UserConfig, GoalMode } from '../types';

interface SetupWizardProps {
  onComplete: (config: UserConfig) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState('');
  const [protein, setProtein] = useState('180');
  const [sessionTarget, setSessionTarget] = useState('45');
  const [goalMode, setGoalMode] = useState<GoalMode>('cutting');

  const handleFinish = () => {
    onComplete({
      setupComplete: true,
      currentWeight: parseFloat(weight) || 180,
      targetProtein: parseInt(protein) || 180,
      exerciseChoices: {},
      sessionTargetMinutes: parseInt(sessionTarget) || 45,
      legPhase: 1,
      goalMode,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-400">Lift & Lean</h1>
          <p className="text-slate-400 mt-2">Personal Fitness Tracker</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">What's your current bodyweight?</h2>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="185"
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <span className="text-slate-400">lbs</span>
              </div>
              <button
                onClick={() => setStep(1)}
                disabled={!weight}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg py-3 font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">Daily protein target?</h2>
              <p className="text-sm text-slate-400">Recommended: 180-200g for strength + fat loss</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <span className="text-slate-400">g</span>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-3 font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">What's your current goal?</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setGoalMode('cutting')}
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    goalMode === 'cutting'
                      ? 'bg-red-900/40 border-2 border-red-500'
                      : 'bg-slate-700 border-2 border-transparent hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-sm">Cutting (Lose Fat)</div>
                  <div className="text-xs text-slate-400">Lose weight while keeping muscle. Expect 0.5-1 lb/week loss.</div>
                </button>
                <button
                  onClick={() => setGoalMode('maintaining')}
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    goalMode === 'maintaining'
                      ? 'bg-blue-900/40 border-2 border-blue-500'
                      : 'bg-slate-700 border-2 border-transparent hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-sm">Maintaining</div>
                  <div className="text-xs text-slate-400">Hold current weight, build strength. Focus on progressive overload.</div>
                </button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-3 font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">Session time target?</h2>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={sessionTarget}
                  onChange={e => setSessionTarget(e.target.value)}
                  className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <span className="text-slate-400">min</span>
              </div>
              <button
                onClick={handleFinish}
                className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-3 font-medium transition-colors"
              >
                Start Tracking
              </button>
            </>
          )}

          <div className="flex justify-center gap-2 pt-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i <= step ? 'bg-blue-400' : 'bg-slate-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
