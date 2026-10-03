import React, { useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { BackupService } from '../../services/backupService';
import { Sparkles, ArrowRight, Upload, ShieldCheck, Zap, HardDrive } from 'lucide-react';

export const FirstRunModal: React.FC = () => {
  const { settings, updateSettings, showToast, refreshApps } = useApp();
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (settings.hasCompletedWelcome) return null;

  const handleGetStarted = () => {
    updateSettings({ hasCompletedWelcome: true });
    showToast('Welcome to HOME!', 'success');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const validated = BackupService.validateBackup(parsed);

        if (!validated.isValid || !validated.apps || !validated.settings) {
          showToast(`Invalid backup: ${validated.error || 'Unknown format'}`, 'error');
          return;
        }

        BackupService.restoreBackup(validated.apps, {
          ...validated.settings,
          hasCompletedWelcome: true,
        });
        refreshApps();
        showToast('Backup restored. Welcome back to HOME!', 'success');
      } catch {
        showToast('Failed to parse backup JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl home-panel-window border-subtle shadow-2xl p-6 sm:p-8 text-center space-y-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[2px] mx-auto shadow-2xl shadow-blue-500/30">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <svg
              className="w-9 h-9 text-sky-400"
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

        {/* Heading & Tagline */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent/30 text-accent text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Web OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-main tracking-tight">
            HOME
          </h1>
          <p className="text-sm text-accent font-semibold mt-1">
            "Everything starts here."
          </p>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            One central home for all your PWAs and web applications. Organized, lightning fast, and stored 100% locally on your device.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-3 gap-2 py-1 text-left text-xs">
          <div className="p-2.5 rounded-xl glass-subtle border-subtle flex flex-col items-center text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
            <span className="font-semibold text-main text-[11px]">Private</span>
            <span className="text-[10px] text-muted">Zero tracking</span>
          </div>
          <div className="p-2.5 rounded-xl glass-subtle border-subtle flex flex-col items-center text-center">
            <Zap className="w-4 h-4 text-amber-500 mb-1" />
            <span className="font-semibold text-main text-[11px]">Instant</span>
            <span className="text-[10px] text-muted">Ctrl + K search</span>
          </div>
          <div className="p-2.5 rounded-xl glass-subtle border-subtle flex flex-col items-center text-center">
            <HardDrive className="w-4 h-4 text-sky-500 mb-1" />
            <span className="font-semibold text-main text-[11px]">Offline</span>
            <span className="text-[10px] text-muted">Installable PWA</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleGetStarted}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-lg shadow-accent/25 transition-all transform active:scale-98"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <button
            onClick={() => backupInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl glass-subtle hover-tile text-main text-xs font-semibold border-subtle transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Previous Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
