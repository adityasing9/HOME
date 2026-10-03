import React from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Plus, ShieldCheck } from 'lucide-react';

export const HomeBottomBar: React.FC = () => {
  const { settings, setIsSettingsOpen, setIsAddAppOpen } = useApp();

  return (
    <div className="w-full home-bottom-shelf px-6 py-3.5 flex items-center justify-between">
      {/* Local User Profile area */}
      <div
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center gap-3 cursor-pointer group py-1 px-2 -ml-2 rounded-xl hover:bg-white/[0.07] dark:hover:bg-white/[0.06] transition-colors select-none"
        title="Local profile and data status"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-200 shadow-sm group-hover:border-accent transition-colors">
          {settings.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
            {settings.userName}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>Local & Private</span>
          </div>
        </div>
      </div>

      {/* Quick Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsAddAppOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.07] dark:hover:bg-white/[0.06] transition-colors"
          title="Register new application"
          aria-label="Add app"
        >
          <Plus className="w-4 h-4 text-accent" />
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.07] dark:hover:bg-white/[0.06] transition-colors"
          title="Open Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
