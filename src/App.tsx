import { useAppState } from './hooks/useAppState';
import { TabBar } from './components/TabBar';
import { SetupWizard } from './components/SetupWizard';
import { DashboardPage } from './pages/DashboardPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { BodyPage } from './pages/BodyPage';
import { ChartsPage } from './pages/ChartsPage';
import { CoachPage } from './pages/CoachPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  const {
    workouts,
    bodyMetrics,
    config,
    activeTab,
    setActiveTab,
    addWorkout,
    removeWorkout,
    addBodyMetric,
    removeBodyMetric,
    updateConfig,
    reloadData,
  } = useAppState();

  if (!config.setupComplete) {
    return <SetupWizard onComplete={updateConfig} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-20">
        {activeTab === 'dashboard' && (
          <DashboardPage workouts={workouts} bodyMetrics={bodyMetrics} config={config} />
        )}
        {activeTab === 'coach' && (
          <CoachPage workouts={workouts} bodyMetrics={bodyMetrics} config={config} />
        )}
        {activeTab === 'workout' && (
          <WorkoutPage
            workouts={workouts}
            onSave={addWorkout}
            exerciseChoices={config.exerciseChoices}
          />
        )}
        {activeTab === 'body' && (
          <BodyPage bodyMetrics={bodyMetrics} config={config} onSave={addBodyMetric} />
        )}
        {activeTab === 'charts' && (
          <ChartsPage workouts={workouts} bodyMetrics={bodyMetrics} config={config} />
        )}
        {activeTab === 'history' && (
          <HistoryPage
            workouts={workouts}
            bodyMetrics={bodyMetrics}
            onDeleteWorkout={removeWorkout}
            onDeleteMetric={removeBodyMetric}
            onImportWorkouts={(imported) => imported.forEach(addWorkout)}
            onImportMetrics={(imported) => imported.forEach(addBodyMetric)}
            onReload={reloadData}
          />
        )}
      </main>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
