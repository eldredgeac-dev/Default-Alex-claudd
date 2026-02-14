import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BodyMetric, UserConfig } from '../types';

interface BodyPageProps {
  bodyMetrics: BodyMetric[];
  config: UserConfig;
  onSave: (metric: BodyMetric) => void;
}

export function BodyPage({ bodyMetrics, config, onSave }: BodyPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [protein, setProtein] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!weight && !waist && !protein) return;

    const metric: BodyMetric = {
      id: uuidv4(),
      date,
      weight: weight ? parseFloat(weight) : undefined,
      waist: waist ? parseFloat(waist) : undefined,
      protein: protein ? parseInt(protein) : undefined,
    };

    onSave(metric);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setWeight('');
    setWaist('');
    setProtein('');
  };

  // Recent entries
  const recentMetrics = [...bodyMetrics]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold">Log Body Metrics</h2>

      {/* Quick Entry */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="--"
              step="0.1"
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Waist (in)</label>
            <input
              type="number"
              value={waist}
              onChange={e => setWaist(e.target.value)}
              placeholder="--"
              step="0.25"
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              placeholder="--"
              className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!weight && !waist && !protein}
          className={`w-full rounded-lg py-3 font-medium transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed'
          }`}
        >
          {saved ? 'Saved!' : 'Log Entry'}
        </button>
      </div>

      {/* Target reminder */}
      <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400">
        Protein target: <span className="text-blue-400 font-medium">{config.targetProtein}g/day</span>
        {' · '}Daily weigh-in recommended for trend accuracy
      </div>

      {/* Recent Entries */}
      {recentMetrics.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Recent Entries</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs text-slate-500 pb-1 border-b border-slate-700">
              <span>Date</span>
              <span className="text-right">Weight</span>
              <span className="text-right">Waist</span>
              <span className="text-right">Protein</span>
            </div>
            {recentMetrics.map(m => (
              <div key={m.id} className="grid grid-cols-4 text-xs py-1 border-b border-slate-700/50 last:border-0">
                <span className="text-slate-400">{m.date.slice(5)}</span>
                <span className="text-right text-slate-300">{m.weight ?? '--'}</span>
                <span className="text-right text-slate-300">{m.waist ?? '--'}</span>
                <span className={`text-right ${
                  m.protein != null && m.protein >= config.targetProtein ? 'text-green-400'
                  : m.protein != null && m.protein >= config.targetProtein * 0.85 ? 'text-yellow-400'
                  : m.protein != null ? 'text-red-400'
                  : 'text-slate-500'
                }`}>
                  {m.protein ?? '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
