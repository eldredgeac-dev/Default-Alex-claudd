import { useState, useCallback, useEffect } from 'react';
import type { WorkoutSession, BodyMetric, UserConfig, TabId } from '../types';
import * as storage from '../utils/storage';

export function useAppState() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [config, setConfig] = useState<UserConfig>(storage.getConfig());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Load data on mount
  useEffect(() => {
    setWorkouts(storage.getWorkouts());
    setBodyMetrics(storage.getBodyMetrics());
    setConfig(storage.getConfig());
  }, []);

  const addWorkout = useCallback((workout: WorkoutSession) => {
    storage.saveWorkout(workout);
    setWorkouts(storage.getWorkouts());
  }, []);

  const removeWorkout = useCallback((id: string) => {
    storage.deleteWorkout(id);
    setWorkouts(storage.getWorkouts());
  }, []);

  const addBodyMetric = useCallback((metric: BodyMetric) => {
    storage.saveBodyMetric(metric);
    setBodyMetrics(storage.getBodyMetrics());
  }, []);

  const removeBodyMetric = useCallback((id: string) => {
    storage.deleteBodyMetric(id);
    setBodyMetrics(storage.getBodyMetrics());
  }, []);

  const updateConfig = useCallback((newConfig: UserConfig) => {
    storage.saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const reloadData = useCallback(() => {
    setWorkouts(storage.getWorkouts());
    setBodyMetrics(storage.getBodyMetrics());
    setConfig(storage.getConfig());
  }, []);

  return {
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
  };
}
