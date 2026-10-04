import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, Download, WifiOff, Sun, Moon, QrCode, Lock, Laptop } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    isOnline,
    canInstallPwa,
    installPwa,
    setIsSettingsOpen,
    setIsGitHubImportOpen,
    openQRModal,
    lockPC,
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
        {/* Geometric H Icon */}
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
          <span className="text-sm font-bold tracking-tight text-main group-hover:text-accent transition-colors">
            HOME
          </span>
          <span className="text-[11px] text-muted font-normal hidden sm:inline">
            Everything starts here.
          </span>
        </div>
      </div>

      {/* Center OS Clock & Date */}
      <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle border-subtle text-xs text-main font-medium shadow-sm">
        <span>{currentTime}</span>
        <span className="text-muted opacity-60">•</span>
        <span className="text-muted text-[11px]">{currentDate}</span>
      </div>

      {/* Right System Icons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Offline Shell badge */}
        {!isOnline && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-medium animate-pulse"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover shadow-sm transition-all shadow-accent/20"
            title="Install HOME to desktop/mobile"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {/* Theme Quick Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm"
          title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* HOME Web - WhatsApp Web Login & Export to PC */}
        <button
          onClick={() => openQRModal('web-login')}
          className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm group"
          title="HOME Web — WhatsApp Web Style Login & PC Sync"
          aria-label="Link PC"
        >
          <Laptop className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline text-xs font-semibold text-main">Link PC</span>
        </button>

        {/* QR Code Sync & Scanner */}
        <button
          onClick={() => openQRModal('export')}
          className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm group"
          title="QR Code Sync & Camera Import"
          aria-label="QR Code Sync"
        >
          <QrCode className="w-4 h-4 group-hover:text-accent transition-colors" />
          <span className="hidden sm:inline text-xs font-medium">QR Sync</span>
        </button>

        {/* GitHub Repositories Link Importer */}
        <button
          onClick={() => setIsGitHubImportOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm group"
          title="Import repositories with website links from GitHub"
          aria-label="Import from GitHub"
        >
          <svg className="w-4 h-4 fill-current group-hover:text-accent transition-colors" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span className="hidden sm:inline text-xs font-medium">GitHub</span>
        </button>

        {/* Lock PC button */}
        <button
          onClick={lockPC}
          className="p-1.5 sm:p-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm group"
          title="Lock PC (Ctrl+L)"
          aria-label="Lock PC"
        >
          <Lock className="w-4 h-4 group-hover:text-accent transition-colors" />
        </button>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 sm:p-2 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all shadow-sm"
          title="Open Settings (Ctrl+,)"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
