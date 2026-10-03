import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Download, WifiOff, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    isOnline,
    canInstallPwa,
    installPwa,
    setIsSettingsOpen,
    settings,
    updateSettings,
    setActiveView,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-8 py-2.5 backdrop-blur-md z-20 select-none">
      {/* Brand & Subtitle */}
      <div
        onClick={() => setActiveView('home')}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        {/* Subtle Geometric H Icon */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[1px] shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
          <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-sky-400 group-hover:text-white transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4v16" />
              <path d="M20 4v16" />
              <path d="M4 12h16" />
              <path d="M12 4l3 3m-3-3l-3 3" />
            </svg>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold tracking-tight text-slate-100 dark:text-white group-hover:text-accent transition-colors">
            HOME
          </span>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            Everything starts here.
          </span>
        </div>
      </div>

      {/* Center OS Clock & Date */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 font-medium">
        <span>{currentTime}</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-400 text-[11px]">{currentDate}</span>
      </div>

      {/* Right System Icons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Offline Shell badge */}
        {!isOnline && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse"
            title="External websites may not load offline. HOME local launcher is fully operational."
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden xs:inline text-[11px]">Offline Shell</span>
          </div>
        )}

        {/* PWA Install Button */}
        {canInstallPwa && (
          <button
            onClick={installPwa}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover shadow-sm transition-all"
            title="Install HOME to desktop/mobile"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {/* Theme Quick Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Open Settings (Ctrl+,)"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
