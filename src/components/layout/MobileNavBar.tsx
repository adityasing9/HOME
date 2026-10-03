import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, LayoutGrid, Star, Settings } from 'lucide-react';

export const MobileNavBar: React.FC = () => {
  const { activeView, setActiveView, setIsSettingsOpen } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 dark:bg-slate-950/85 backdrop-blur-xl border-t border-white/10 px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'home'
            ? 'text-accent font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setActiveView('all-apps')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'all-apps'
            ? 'text-accent font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px]">All Apps</span>
      </button>

      <button
        onClick={() => setActiveView('favorites')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'favorites'
            ? 'text-accent font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Star className="w-5 h-5" />
        <span className="text-[10px]">Favorites</span>
      </button>

      <button
        onClick={() => setIsSettingsOpen(true)}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px]">Settings</span>
      </button>
    </nav>
  );
};
