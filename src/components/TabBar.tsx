import type { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '◉' },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/30 z-50 safe-area-bottom">
      <div className="flex justify-around max-w-lg mx-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center py-2 px-3 min-w-[56px] transition-all duration-200 ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-400 rounded-full" />
              )}
              <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider transition-colors ${
                isActive ? 'text-blue-400' : ''
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
