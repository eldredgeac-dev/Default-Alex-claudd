import { useRef } from 'react';
import type { WorkoutSession, BodyMetric } from '../types';
import { sessionVolume } from '../utils/progression';
import { getExerciseDisplayName } from '../utils/exercises';
import { workoutsToCSV, bodyMetricsToCSV, csvToWorkouts, csvToBodyMetrics, downloadFile } from '../utils/csv';
import { exportAllData, importAllData } from '../utils/storage';

interface HistoryPageProps {
  workouts: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  onDeleteWorkout: (id: string) => void;
  onDeleteMetric: (id: string) => void;
  onImportWorkouts: (workouts: WorkoutSession[]) => void;
  onImportMetrics: (metrics: BodyMetric[]) => void;
  onReload: () => void;
}

export function HistoryPage({
  workouts,
  bodyMetrics,
  onDeleteWorkout,
  onDeleteMetric: _onDeleteMetric,
  onImportWorkouts,
  onImportMetrics,
  onReload,
}: HistoryPageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const importTypeRef = useRef<'workouts' | 'metrics' | 'json'>('json');

  const handleExportJSON = () => {
    downloadFile(exportAllData(), `liftlean-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleExportWorkoutsCSV = () => {
    downloadFile(workoutsToCSV(workouts), `liftlean-workouts-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportMetricsCSV = () => {
    downloadFile(bodyMetricsToCSV(bodyMetrics), `liftlean-metrics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImport = (type: 'workouts' | 'metrics' | 'json') => {
    importTypeRef.current = type;
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        if (importTypeRef.current === 'json') {
          importAllData(text);
          onReload();
        } else if (importTypeRef.current === 'workouts') {
          const imported = csvToWorkouts(text);
          imported.forEach(w => onImportWorkouts([w]));
        } else {
          const imported = csvToBodyMetrics(text);
          imported.forEach(m => onImportMetrics([m]));
        }
        alert(`Import successful!`);
      } catch {
        alert('Import failed. Please check the file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">History & Data</h2>

      {/* Import/Export */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Export</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportJSON}
            className="bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Full Backup (JSON)
          </button>
          <button
            onClick={handleExportWorkoutsCSV}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Workouts CSV
          </button>
          <button
            onClick={handleExportMetricsCSV}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Metrics CSV
          </button>
        </div>

        <h3 className="text-sm font-semibold text-slate-300 pt-2">Import</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleImport('json')}
            className="bg-green-700 hover:bg-green-600 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Restore Backup
          </button>
          <button
            onClick={() => handleImport('workouts')}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Workouts CSV
          </button>
          <button
            onClick={() => handleImport('metrics')}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Metrics CSV
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Workout History */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Workout History ({workouts.length} sessions)
        </h3>
        <div className="space-y-3">
          {sortedWorkouts.map(w => (
            <details key={w.id} className="border border-slate-700 rounded-lg">
              <summary className="px-3 py-2 cursor-pointer hover:bg-slate-700/50 flex justify-between items-center text-sm">
                <span className="flex items-center gap-1.5">
                  {w.date}
                  {w.workoutType === 'hotel' && (
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-300">HOTEL</span>
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  {w.workoutType !== 'hotel' && <>{(sessionVolume(w) / 1000).toFixed(1)}k vol &middot; </>}
                  {w.exercises.length} ex
                  {w.durationMinutes ? ` · ${w.durationMinutes}min` : ''}
                </span>
              </summary>
              <div className="px-3 pb-3 space-y-1 text-xs">
                {w.exercises.map((ex, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="text-slate-400">{getExerciseDisplayName(ex.exerciseId)}</span>
                    <span className="text-slate-300">
                      {ex.sets.map(s => `${s.weight}x${s.reps}`).join(', ')}
                    </span>
                  </div>
                ))}
                {w.notes && (
                  <div className="text-slate-500 italic pt-1">"{w.notes}"</div>
                )}
                <button
                  onClick={() => {
                    if (confirm('Delete this workout?')) onDeleteWorkout(w.id);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs mt-1"
                >
                  Delete
                </button>
              </div>
            </details>
          ))}
          {workouts.length === 0 && (
            <p className="text-sm text-slate-500">No workouts logged yet.</p>
          )}
        </div>
      </div>

      {/* Data stats */}
      <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
        <div>Workouts: {workouts.length} sessions</div>
        <div>Body metrics: {bodyMetrics.length} entries</div>
        <div>Weight entries: {bodyMetrics.filter(m => m.weight != null).length}</div>
        <div>Protein entries: {bodyMetrics.filter(m => m.protein != null).length}</div>
        <div>
          Data stored locally in your browser. Export regularly for backup.
        </div>
      </div>
    </div>
  );
}
