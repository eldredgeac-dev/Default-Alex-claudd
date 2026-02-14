import type { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'coach', label: 'Coach', icon: '▶' },
  { id: 'workout', label: 'Workout', icon: '⏱' },
  { id: 'body', label: 'Body', icon: '⚖' },
  { id: 'charts', label: 'Charts', icon: '📊' },
  { id: 'history', label: 'Data', icon: '☰' },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50 safe-area-bottom">
      <div className="flex justify-around max-w-lg mx-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center py-2 px-3 min-w-[64px] transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
