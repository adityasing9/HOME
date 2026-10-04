import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type {
  ThemeMode,
  AccentColor,
  BackgroundPreset,
  AppSize,
  SortOption,
  PinnedSortOption,
} from '../../types';
import { SettingsRepository } from '../../services/settingsRepository';
import { BackupService } from '../../services/backupService';
import { AppRepository } from '../../services/appRepository';
import { PwaDetectionService } from '../../services/pwaDetectionService';
import {
  X,
  Palette,
  Layout,
  Search,
  Shield,
  HardDrive,
  Keyboard,
  Info,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Check,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';

type SettingsTab =
  | 'appearance'
  | 'apps'
  | 'search'
  | 'privacy'
  | 'storage'
  | 'shortcuts'
  | 'backup'
  | 'about';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    setIsGitHubImportOpen,
    apps,
    settings,
    updateSettings,
    clearActivity,
    resetAll,
    restoreDefaults,
    showToast,
    refreshApps,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState(() => SettingsRepository.getStorageBreakdown());

  // Batch PWA logo upgrade states
  const [isBatchScanning, setIsBatchScanning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    appName: string;
  } | null>(null);

  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const failedIcons = AppRepository.getFailedIcons();
  const missingLogoCount = apps.filter(
    a =>
      !a.icon ||
      a.iconType === 'letter' ||
      failedIcons.has(a.icon) ||
      a.icon.includes('google.com/s2/favicons')
  ).length;

  const handleBatchUpgradeMissing = async () => {
    if (isBatchScanning) return;
    setIsBatchScanning(true);
    setBatchProgress(null);
    showToast('Starting PWA logo scan for missing icons...', 'info');

    try {
      const res = await PwaDetectionService.autoUpgradeAllMissingLogos(
        apps,
        (current, total, appName) => {
          setBatchProgress({ current, total, appName });
        },
        false
      );

      refreshApps();
      if (res.updatedCount > 0) {
        showToast(`Successfully upgraded ${res.updatedCount} PWA logo(s)!`, 'success');
      } else {
        showToast('All apps already have high-res icons or no manifest found', 'info');
      }
    } catch {
      showToast('Error during batch logo scan', 'error');
    } finally {
      setIsBatchScanning(false);
      setBatchProgress(null);
    }
  };

  const handleBatchUpgradeAll = async () => {
    if (isBatchScanning) return;
    if (!window.confirm('Scan all saved applications to fetch high-res PWA logos and webmanifests?')) {
      return;
    }

    setIsBatchScanning(true);
    setBatchProgress(null);
    showToast('Starting full PWA logo scan across all apps...', 'info');

    try {
      const res = await PwaDetectionService.autoUpgradeAllMissingLogos(
        apps,
        (current, total, appName) => {
          setBatchProgress({ current, total, appName });
        },
        true
      );

      refreshApps();
      if (res.updatedCount > 0) {
        showToast(`Updated ${res.updatedCount} application logo(s)!`, 'success');
      } else {
        showToast('Scan complete. Existing logos are up to date.', 'info');
      }
    } catch {
      showToast('Error during batch logo scan', 'error');
    } finally {
      setIsBatchScanning(false);
      setBatchProgress(null);
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      setStorageInfo(SettingsRepository.getStorageBreakdown());
      setShowResetConfirm(false);
    }
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const accentOptions: { key: AccentColor; name: string; hex: string }[] = [
    { key: 'blue', name: 'Sky Blue', hex: '#3b82f6' },
    { key: 'purple', name: 'Violet', hex: '#8b5cf6' },
    { key: 'green', name: 'Emerald', hex: '#10b981' },
    { key: 'orange', name: 'Amber', hex: '#f97316' },
    { key: 'red', name: 'Crimson', hex: '#ef4444' },
    { key: 'pink', name: 'Rose Pink', hex: '#ec4899' },
  ];

  const backgroundPresets: { key: BackgroundPreset; name: string; desc: string }[] = [
    { key: 'default', name: 'Ambient Radial', desc: 'Subtle atmospheric dark blur' },
    { key: 'midnight', name: 'Midnight Blue', desc: 'Deep indigo & midnight obsidian' },
    { key: 'aurora', name: 'Nordic Aurora', desc: 'Emerald cyan reflections' },
    { key: 'sunset', name: 'Sunset Glow', desc: 'Plum & magenta dusk' },
    { key: 'minimal', name: 'Solid Minimal', desc: 'Clean, distraction-free matte surface' },
  ];

  // Custom Wallpaper upload handler
  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast('Wallpaper should be under 3MB to fit local browser storage', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSettings({
          background: 'custom',
          customWallpaper: reader.result,
        });
        showToast('Custom wallpaper applied', 'success');
        setStorageInfo(SettingsRepository.getStorageBreakdown());
      }
    };
    reader.readAsDataURL(file);
  };

  // Backup Import handler
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const validated = BackupService.validateBackup(parsed);

        if (!validated.isValid || !validated.apps || !validated.settings) {
          showToast(`Invalid backup file: ${validated.error || 'Unknown format'}`, 'error');
          return;
        }

        if (
          window.confirm(
            `Import backup with ${validated.apps.length} apps? This will update your current configuration.`
          )
        ) {
          BackupService.restoreBackup(validated.apps, validated.settings);
          refreshApps();
          showToast('Backup restored successfully!', 'success');
          setIsSettingsOpen(false);
        }
      } catch {
        showToast('Failed to parse backup JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-3xl home-panel-window border-subtle shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[720px]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
              <Palette className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-main">HOME Settings</h2>
              <p className="text-xs text-muted">Personalize your launcher and manage local data</p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-xl text-muted hover:text-main hover-tile transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Layout: Sidebar Tabs + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-subtle p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto scrollbar-none flex-shrink-0">
            <TabButton
              active={activeTab === 'appearance'}
              onClick={() => setActiveTab('appearance')}
              icon={<Palette className="w-4 h-4" />}
              label="Appearance"
            />
            <TabButton
              active={activeTab === 'apps'}
              onClick={() => setActiveTab('apps')}
              icon={<Layout className="w-4 h-4" />}
              label="Apps"
            />
            <TabButton
              active={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
              icon={<Search className="w-4 h-4" />}
              label="Search"
            />
            <TabButton
              active={activeTab === 'privacy'}
              onClick={() => setActiveTab('privacy')}
              icon={<Shield className="w-4 h-4" />}
              label="Privacy"
            />
            <TabButton
              active={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
              icon={<HardDrive className="w-4 h-4" />}
              label="Storage"
            />
            <TabButton
              active={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
              icon={<Keyboard className="w-4 h-4" />}
              label="Shortcuts"
            />
            <TabButton
              active={activeTab === 'backup'}
              onClick={() => setActiveTab('backup')}
              icon={<Download className="w-4 h-4" />}
              label="Backup & Restore"
            />
            <TabButton
              active={activeTab === 'about'}
              onClick={() => setActiveTab('about')}
              icon={<Info className="w-4 h-4" />}
              label="About HOME"
            />
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-main">
            {/* 1. APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                {/* Theme Selector */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                    Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['dark', 'light', 'system'] as ThemeMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateSettings({ theme: mode })}
                        className={`p-3 rounded-2xl border text-xs font-semibold capitalize flex flex-col items-center gap-1.5 transition-all ${
                          settings.theme === mode
                            ? 'border-accent bg-accent-light text-main shadow-sm'
                            : 'border-subtle glass-subtle text-muted hover:text-main hover-tile'
                        }`}
                      >
                        <span className="font-bold text-main">{mode}</span>
                        <span className="text-[10px] text-muted">
                          {mode === 'system' ? 'Syncs with OS' : `${mode} mode`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                    Accent Color
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {accentOptions.map(acc => (
                      <button
                        key={acc.key}
                        onClick={() => updateSettings({ accentColor: acc.key })}
                        className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                          settings.accentColor === acc.key
                            ? 'border-accent bg-accent-light shadow-sm'
                            : 'border-subtle glass-subtle hover-tile'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center shadow-inner"
                          style={{ backgroundColor: acc.hex }}
                        >
                          {settings.accentColor === acc.key && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </span>
                        <span className="text-[11px] font-medium text-main truncate w-full text-center">
                          {acc.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background / Wallpaper Presets */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                    Desktop Wallpaper & Backdrop
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                    {backgroundPresets.map(preset => (
                      <button
                        key={preset.key}
                        onClick={() => updateSettings({ background: preset.key })}
                        className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                          settings.background === preset.key
                            ? 'border-accent bg-accent-light text-main shadow-sm'
                            : 'border-subtle glass-subtle text-main hover-tile'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-main">{preset.name}</div>
                          <div className="text-[11px] text-muted mt-0.5">{preset.desc}</div>
                        </div>
                        {settings.background === preset.key && (
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Wallpaper Upload */}
                  <div className="p-3.5 rounded-2xl glass-subtle border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-4 h-4 text-accent" />
                      <div>
                        <div className="text-xs font-semibold text-main">
                          Custom Wallpaper
                        </div>
                        <div className="text-[11px] text-muted">
                          {settings.customWallpaper ? 'Custom image currently active' : 'Upload an image from your device'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={wallpaperInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleWallpaperUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => wallpaperInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl glass-subtle hover-tile border-subtle text-xs font-semibold text-main transition-colors"
                      >
                        Choose File...
                      </button>
                      {settings.customWallpaper && (
                        <button
                          onClick={() => {
                            updateSettings({ background: 'default', customWallpaper: null });
                            showToast('Custom wallpaper removed', 'info');
                          }}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove custom wallpaper"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* App Icon Size */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                    App Icon Sizing
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['compact', 'standard', 'spacious'] as AppSize[]).map(size => (
                      <button
                        key={size}
                        onClick={() => updateSettings({ appSize: size })}
                        className={`p-3 rounded-2xl border text-xs font-semibold capitalize transition-all ${
                          settings.appSize === size
                            ? 'border-accent bg-accent-light text-main shadow-sm'
                            : 'border-subtle glass-subtle text-muted hover:text-main hover-tile'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smooth Animations Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-subtle border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Motion & Transitions
                    </span>
                    <span className="text-[11px] text-muted">
                      Enable smooth micro-animations across the launcher
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.animations}
                    onChange={e => updateSettings({ animations: e.target.checked })}
                    className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 2. APPS TAB */}
            {activeTab === 'apps' && (
              <div className="space-y-6">
                {/* PWA Logo Auto-Discovery & Batch Fetch */}
                <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-main flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        PWA Logo Auto-Discovery
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Scan and fetch official high-resolution logos, webmanifest icons, and apple-touch-icons for your saved PWAs.
                      </div>
                    </div>
                    {missingLogoCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {missingLogoCount} without logo
                      </span>
                    )}
                  </div>

                  {batchProgress && (
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-accent font-medium truncate max-w-[240px]">
                          Scanning: {batchProgress.appName}
                        </span>
                        <span className="text-muted text-[11px] font-mono">
                          {batchProgress.current} / {batchProgress.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-200"
                          style={{
                            width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isBatchScanning || missingLogoCount === 0}
                      onClick={handleBatchUpgradeMissing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBatchScanning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Fetch Missing Logos ({missingLogoCount})</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBatchScanning || apps.length === 0}
                      onClick={handleBatchUpgradeAll}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-subtle hover-tile border-subtle text-xs font-medium text-main transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBatchScanning ? 'animate-spin' : ''}`} />
                      <span>Force Refetch All Logos ({apps.length})</span>
                    </button>
                  </div>
                </div>

                {/* GitHub Repositories Sync Card */}
                <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-main flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 fill-current text-accent" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        <span>GitHub Repository Links Importer</span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Fetch website links from the About section of all repositories for any GitHub username, with bulk selection and deletion controls.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsGitHubImportOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>Open GitHub Importer</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Pinned Apps Sorting
                  </label>
                  <select
                    value={settings.pinnedSort || 'newest'}
                    onChange={e => updateSettings({ pinnedSort: e.target.value as PinnedSortOption })}
                    className="w-full px-3.5 py-2.5 rounded-xl home-input text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="newest" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Newest First (Last in 1st location)</option>
                    <option value="custom" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Custom Order (Drag & Drop)</option>
                    <option value="name-asc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Alphabetical (A → Z)</option>
                    <option value="name-desc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Alphabetical (Z → A)</option>
                    <option value="most-used" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Most Launched</option>
                    <option value="recently-opened" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Recently Opened</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Default All Apps Sorting
                  </label>
                  <select
                    value={settings.defaultSort}
                    onChange={e => updateSettings({ defaultSort: e.target.value as SortOption })}
                    className="w-full px-3.5 py-2.5 rounded-xl home-input text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="name-asc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Alphabetical (A → Z)</option>
                    <option value="name-desc" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Alphabetical (Z → A)</option>
                    <option value="most-used" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Most Used</option>
                    <option value="recently-opened" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Recently Opened</option>
                    <option value="recently-added" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Recently Added</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-subtle border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Launch In New Tab
                    </span>
                    <span className="text-[11px] text-muted">
                      Open external PWAs in a new browser tab (recommended for safety)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.openInNewTab}
                    onChange={e => updateSettings({ openInNewTab: e.target.checked })}
                    className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl glass-subtle border-subtle flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-main">
                      Restore Starter Applications
                    </div>
                    <div className="text-[11px] text-muted">
                      Reset apps back to initial curated demo set (StudyAI, AutoFlow, RCPC, etc.)
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Restore default starter apps? Your custom apps will be replaced.')) {
                        restoreDefaults();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl glass-subtle hover-tile border-subtle text-xs font-semibold text-main transition-colors"
                  >
                    Restore Demo Apps
                  </button>
                </div>
              </div>
            )}

            {/* 3. SEARCH TAB */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-subtle border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Search In Descriptions
                    </span>
                    <span className="text-[11px] text-muted">
                      Include words inside app descriptions when typing in the search bar
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.searchDescriptions}
                    onChange={e => updateSettings({ searchDescriptions: e.target.checked })}
                    className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-subtle border-subtle">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Search In Categories
                    </span>
                    <span className="text-[11px] text-muted">
                      Match categories like "AI", "Finance", or "Utilities" in search results
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.searchCategories}
                    onChange={e => updateSettings({ searchCategories: e.target.checked })}
                    className="w-4 h-4 text-accent rounded border-subtle focus:ring-accent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Local-First Architecture
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-200/90 leading-relaxed">
                    Your HOME data is stored 100% locally on this device. HOME has no remote servers, no databases, no tracking cookies, and does not collect telemetry of any kind.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl glass-subtle border-subtle flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Clear Recent Activity
                    </span>
                    <span className="text-[11px] text-muted">
                      Deletes recorded timestamps and launch frequency counters
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all app launch history?')) {
                        clearActivity();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl glass-subtle hover-tile border-subtle text-xs font-semibold text-main transition-colors"
                  >
                    Clear Activity
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-rose-500 block">
                      Reset HOME Completely
                    </span>
                    <span className="text-[11px] text-rose-500/80">
                      Removes all custom apps, settings, wallpapers, and restores default state
                    </span>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                  >
                    Reset HOME
                  </button>
                </div>

                {showResetConfirm && (
                  <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/50 space-y-3">
                    <p className="text-xs text-rose-200 font-semibold">
                      Are you completely sure? This will remove your locally stored apps, preferences, pinned apps, and activity history.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          resetAll();
                          setShowResetConfirm(false);
                          setIsSettingsOpen(false);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                      >
                        Yes, Reset HOME
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. STORAGE TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl glass-subtle border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-main">Local Browser Storage</span>
                    <span className="text-xs font-mono text-accent font-semibold">
                      {storageInfo.formatted} used
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden mb-3">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${Math.max(2, storageInfo.quotaPercentage)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl glass-subtle border-subtle">
                      <div className="text-[10px] text-muted">Apps Registry</div>
                      <div className="font-mono font-semibold text-main mt-0.5">
                        {(storageInfo.appsBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="p-2 rounded-xl glass-subtle border-subtle">
                      <div className="text-[10px] text-muted">Settings</div>
                      <div className="font-mono font-semibold text-main mt-0.5">
                        {(storageInfo.settingsBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="p-2 rounded-xl glass-subtle border-subtle">
                      <div className="text-[10px] text-muted">Wallpaper</div>
                      <div className="font-mono font-semibold text-main mt-0.5">
                        {(storageInfo.wallpaperBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl glass-subtle border-subtle flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-main block">
                      Recalculate Storage
                    </span>
                    <span className="text-[11px] text-muted">
                      Query browser local storage quota and footprint
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setStorageInfo(SettingsRepository.getStorageBreakdown());
                      showToast('Storage recalculated', 'info');
                    }}
                    className="p-2 rounded-xl glass-subtle hover-tile border-subtle text-main text-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 6. SHORTCUTS TAB */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Keyboard Shortcuts
                </h3>

                <div className="divide-y divide-subtle rounded-2xl glass-subtle border-subtle overflow-hidden text-xs">
                  <ShortcutRow keys={['Ctrl / ⌘', 'K']} desc="Focus search and command bar" />
                  <ShortcutRow keys={['Esc']} desc="Clear search, close dialogs, return home" />
                  <ShortcutRow keys={['Ctrl / ⌘', ',']} desc="Open HOME settings" />
                  <ShortcutRow keys={['↓', '↑']} desc="Navigate dynamic search results" />
                  <ShortcutRow keys={['Enter ↵']} desc="Launch selected search result" />
                </div>
              </div>
            )}

            {/* 7. BACKUP & RESTORE TAB */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-2">
                  <div className="text-xs font-bold text-main">Export Backup</div>
                  <p className="text-xs text-muted">
                    Download a complete JSON snapshot containing all your registered apps, pinned state, custom ordering, and visual preferences.
                  </p>
                  <button
                    onClick={() => {
                      BackupService.exportBackup();
                      showToast('Backup exported as JSON', 'success');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download HOME-backup.json</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl glass-subtle border-subtle space-y-2">
                  <div className="text-xs font-bold text-main">Import Backup</div>
                  <p className="text-xs text-muted">
                    Restore your setup from a previously exported HOME configuration file.
                  </p>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                  <button
                    onClick={() => backupInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl glass-subtle hover-tile border-subtle text-main text-xs font-bold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Backup File...</span>
                  </button>
                </div>
              </div>
            )}

            {/* 8. ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-4 text-center py-4">
                {/* Logo */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 p-[2px] mx-auto shadow-xl shadow-blue-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-sky-400"
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

                <div>
                  <h3 className="text-lg font-bold text-main">HOME</h3>
                  <p className="text-xs text-accent font-semibold tracking-wide mt-0.5">
                    "Everything starts here."
                  </p>
                  <p className="text-[11px] text-muted mt-1">Version 1.0.0 (V1 Static Edition)</p>
                </div>

                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  A personal web app launcher and lightweight web operating system. Local-first, installable as a PWA, designed for instantaneous access to all your tools.
                </p>

                <div className="pt-2 flex justify-center gap-3 text-xs">
                  <span className="px-3 py-1 rounded-full glass-subtle border-subtle text-muted">
                    Client-Side Only
                  </span>
                  <span className="px-3 py-1 rounded-full glass-subtle border-subtle text-muted">
                    Zero Backend
                  </span>
                  <span className="px-3 py-1 rounded-full glass-subtle border-subtle text-muted">
                    Offline Ready
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'text-muted hover:text-main hover-tile'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const ShortcutRow: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-main font-medium">{desc}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 border border-subtle text-[10px] font-mono font-semibold text-main"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
};
