import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppItem, UserSettings, SortOption } from '../types';
import { AppRepository } from '../services/appRepository';
import { SettingsRepository } from '../services/settingsRepository';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AppContextType {
  apps: AppItem[];
  settings: UserSettings;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeView: 'home' | 'all-apps' | 'favorites' | 'settings';
  setActiveView: (view: 'home' | 'all-apps' | 'favorites' | 'settings') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  allAppsSort: SortOption;
  setAllAppsSort: (sort: SortOption) => void;
  allAppsViewMode: 'grid' | 'list';
  setAllAppsViewMode: (mode: 'grid' | 'list') => void;
  isAddAppOpen: boolean;
  setIsAddAppOpen: (open: boolean) => void;
  isGitHubImportOpen: boolean;
  setIsGitHubImportOpen: (open: boolean) => void;
  editingApp: AppItem | null;
  setEditingApp: (app: AppItem | null) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  launchApp: (app: AppItem) => void;
  addApp: (appData: Omit<AppItem, 'id' | 'createdAt' | 'launchCount' | 'lastOpenedAt' | 'pinOrder'> & { id?: string; pinOrder?: number }) => AppItem;
  addMultipleApps: (appsData: Array<Omit<AppItem, 'id' | 'createdAt' | 'launchCount' | 'lastOpenedAt' | 'pinOrder'> & { id?: string; pinOrder?: number }>) => AppItem[];
  updateApp: (id: string, updates: Partial<AppItem>) => void;
  deleteApp: (id: string) => void;
  deleteApps: (ids: string[]) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  reorderPinned: (orderedIds: string[]) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  clearActivity: () => void;
  resetAll: () => void;
  restoreDefaults: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  isOnline: boolean;
  canInstallPwa: boolean;
  installPwa: () => Promise<void>;
  refreshApps: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apps, setApps] = useState<AppItem[]>(() => AppRepository.getApps());
  const [settings, setSettings] = useState<UserSettings>(() => SettingsRepository.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'home' | 'all-apps' | 'favorites' | 'settings'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [allAppsSort, setAllAppsSort] = useState<SortOption>(settings.defaultSort || 'name-asc');
  const [allAppsViewMode, setAllAppsViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isGitHubImportOpen, setIsGitHubImportOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Sync theme and accent color on document root
  useEffect(() => {
    const root = document.documentElement;

    // Apply accent color
    root.setAttribute('data-accent', settings.accentColor);

    // Apply theme
    const applyTheme = (theme: 'light' | 'dark') => {
      root.setAttribute('data-theme', theme);
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        document.body.classList.remove('bg-slate-950', 'text-slate-100');
        document.body.classList.add('bg-slate-100', 'text-slate-900');
      } else {
        root.classList.add('dark');
        root.classList.remove('light');
        document.body.classList.remove('bg-slate-100', 'text-slate-900');
        document.body.classList.add('bg-slate-950', 'text-slate-100');
      }
    };

    if (settings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(isDark ? 'dark' : 'light');

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(settings.theme);
    }
  }, [settings.theme, settings.accentColor]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA beforeinstallprompt handler
  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshApps = useCallback(() => {
    setApps(AppRepository.getApps());
  }, []);

  const launchApp = useCallback((app: AppItem) => {
    // Record launch timestamp & frequency
    AppRepository.recordLaunch(app.id);
    refreshApps();

    let targetUrl = app.url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    if (settings.openInNewTab) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  }, [settings.openInNewTab, refreshApps]);

  const addApp = useCallback((appData: Omit<AppItem, 'id' | 'createdAt' | 'launchCount' | 'lastOpenedAt' | 'pinOrder'> & { id?: string; pinOrder?: number }) => {
    const newApp = AppRepository.addApp(appData);
    refreshApps();
    showToast(`Added "${newApp.name}" to HOME`, 'success');
    return newApp;
  }, [refreshApps, showToast]);

  const addMultipleApps = useCallback((appsData: Array<Omit<AppItem, 'id' | 'createdAt' | 'launchCount' | 'lastOpenedAt' | 'pinOrder'> & { id?: string; pinOrder?: number }>) => {
    const created = AppRepository.addMultipleApps(appsData);
    refreshApps();
    showToast(`Imported ${created.length} app(s) to HOME`, 'success');
    return created;
  }, [refreshApps, showToast]);

  const updateApp = useCallback((id: string, updates: Partial<AppItem>) => {
    const updated = AppRepository.updateApp(id, updates);
    refreshApps();
    if (updated) {
      showToast(`Updated "${updated.name}"`, 'success');
    }
  }, [refreshApps, showToast]);

  const deleteApp = useCallback((id: string) => {
    const target = apps.find(a => a.id === id);
    const success = AppRepository.deleteApp(id);
    refreshApps();
    if (success && target) {
      showToast(`Removed "${target.name}" from HOME`, 'info');
    }
  }, [apps, refreshApps, showToast]);

  const deleteApps = useCallback((ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const count = ids.length;
    const success = AppRepository.deleteApps(ids);
    refreshApps();
    if (success) {
      showToast(`Deleted ${count} application(s) from HOME`, 'info');
    }
  }, [refreshApps, showToast]);

  const togglePin = useCallback((id: string) => {
    const updated = AppRepository.togglePin(id);
    refreshApps();
    if (updated) {
      showToast(updated.pinned ? `Pinned "${updated.name}"` : `Unpinned "${updated.name}"`, 'info');
    }
  }, [refreshApps, showToast]);

  const toggleFavorite = useCallback((id: string) => {
    const updated = AppRepository.toggleFavorite(id);
    refreshApps();
    if (updated) {
      showToast(updated.favorite ? `Favorited "${updated.name}"` : `Removed from favorites`, 'info');
    }
  }, [refreshApps, showToast]);

  const reorderPinned = useCallback((orderedIds: string[]) => {
    AppRepository.reorderPinned(orderedIds);
    refreshApps();
  }, [refreshApps]);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    const updated = SettingsRepository.saveSettings(updates);
    setSettings(updated);
    showToast('Settings saved', 'success');
  }, [showToast]);

  const clearActivity = useCallback(() => {
    AppRepository.clearActivity();
    refreshApps();
    showToast('Cleared recent activity history', 'info');
  }, [refreshApps, showToast]);

  const restoreDefaults = useCallback(() => {
    AppRepository.resetToDefault();
    refreshApps();
    showToast('Restored default applications', 'success');
  }, [refreshApps, showToast]);

  const resetAll = useCallback(() => {
    AppRepository.clearAll();
    SettingsRepository.resetSettings();
    setApps(AppRepository.getApps());
    setSettings(SettingsRepository.getSettings());
    showToast('HOME reset to initial state', 'warning');
  }, [showToast]);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) {
      showToast('Installation is already complete or not supported by this browser.', 'info');
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast('Thank you for installing HOME!', 'success');
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, showToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K -> search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('home-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape -> close open modals or back to home
      if (e.key === 'Escape') {
        if (isGitHubImportOpen) {
          setIsGitHubImportOpen(false);
          return;
        }
        if (isAddAppOpen) {
          setIsAddAppOpen(false);
          return;
        }
        if (editingApp) {
          setEditingApp(null);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (searchQuery) {
          setSearchQuery('');
          return;
        }
        if (activeView !== 'home') {
          setActiveView('home');
        }
      }

      // Ctrl/Cmd + , -> Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddAppOpen, isGitHubImportOpen, editingApp, isSettingsOpen, searchQuery, activeView]);

  const value = useMemo<AppContextType>(() => ({
    apps,
    settings,
    searchQuery,
    setSearchQuery,
    activeView,
    setActiveView,
    selectedCategory,
    setSelectedCategory,
    allAppsSort,
    setAllAppsSort,
    allAppsViewMode,
    setAllAppsViewMode,
    isAddAppOpen,
    setIsAddAppOpen,
    isGitHubImportOpen,
    setIsGitHubImportOpen,
    editingApp,
    setEditingApp,
    isSettingsOpen,
    setIsSettingsOpen,
    launchApp,
    addApp,
    addMultipleApps,
    updateApp,
    deleteApp,
    deleteApps,
    togglePin,
    toggleFavorite,
    reorderPinned,
    updateSettings,
    clearActivity,
    resetAll,
    restoreDefaults,
    toasts,
    showToast,
    dismissToast,
    isOnline,
    canInstallPwa: !!deferredPrompt,
    installPwa,
    refreshApps,
  }), [
    apps,
    settings,
    searchQuery,
    activeView,
    selectedCategory,
    allAppsSort,
    allAppsViewMode,
    isAddAppOpen,
    isGitHubImportOpen,
    editingApp,
    isSettingsOpen,
    launchApp,
    addApp,
    addMultipleApps,
    updateApp,
    deleteApp,
    deleteApps,
    togglePin,
    toggleFavorite,
    reorderPinned,
    updateSettings,
    clearActivity,
    resetAll,
    restoreDefaults,
    toasts,
    showToast,
    dismissToast,
    isOnline,
    deferredPrompt,
    installPwa,
    refreshApps,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
