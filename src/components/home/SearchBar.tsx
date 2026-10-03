import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem } from '../../types';
import { AppIcon } from '../common/AppIcon';
import {
  Search,
  X,
  ExternalLink,
  Settings,
  Moon,
  Sun,
  Download,
  Trash2,
  Sparkles,
  Command,
  ArrowRight,
} from 'lucide-react';

interface SettingCommand {
  id: string;
  name: string;
  description: string;
  category: 'Setting';
  icon: React.ReactNode;
  action: () => void;
}

export const SearchBar: React.FC = () => {
  const {
    apps,
    searchQuery,
    setSearchQuery,
    launchApp,
    settings,
    updateSettings,
    setIsSettingsOpen,
    clearActivity,
    setActiveView,
    setIsAddAppOpen,
  } = useApp();

  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const settingCommands: SettingCommand[] = useMemo(() => [
    {
      id: 'cmd-settings',
      name: 'Open Settings',
      description: 'Configure appearance, storage, privacy, and preferences',
      category: 'Setting',
      icon: <Settings className="w-4 h-4 text-sky-400" />,
      action: () => setIsSettingsOpen(true),
    },
    {
      id: 'cmd-theme-dark',
      name: 'Switch to Dark Mode',
      description: 'Set dark appearance theme',
      category: 'Setting',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      action: () => updateSettings({ theme: 'dark' }),
    },
    {
      id: 'cmd-theme-light',
      name: 'Switch to Light Mode',
      description: 'Set light appearance theme',
      category: 'Setting',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      action: () => updateSettings({ theme: 'light' }),
    },
    {
      id: 'cmd-add-app',
      name: 'Add New App',
      description: 'Register a new PWA or web application in HOME',
      category: 'Setting',
      icon: <Sparkles className="w-4 h-4 text-accent" />,
      action: () => setIsAddAppOpen(true),
    },
    {
      id: 'cmd-all-apps',
      name: 'Browse All Applications',
      description: 'Open full alphabetical application library',
      category: 'Setting',
      icon: <ArrowRight className="w-4 h-4 text-emerald-400" />,
      action: () => setActiveView('all-apps'),
    },
    {
      id: 'cmd-clear-history',
      name: 'Clear Recent Activity',
      description: 'Reset launch history and recent activity stats',
      category: 'Setting',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      action: () => clearActivity(),
    },
    {
      id: 'cmd-backup',
      name: 'Backup & Export HOME',
      description: 'Download configuration and app registry JSON',
      category: 'Setting',
      icon: <Download className="w-4 h-4 text-purple-400" />,
      action: () => setIsSettingsOpen(true),
    },
  ], [setIsSettingsOpen, updateSettings, setIsAddAppOpen, setActiveView, clearActivity]);

  const query = searchQuery.trim().toLowerCase();

  const matchingApps = useMemo(() => {
    if (!query) return [];
    return apps.filter(app => {
      const matchName = app.name.toLowerCase().includes(query);
      const matchDesc = settings.searchDescriptions && app.description?.toLowerCase().includes(query);
      const matchCat = settings.searchCategories && app.category?.toLowerCase().includes(query);
      const matchTags = app.tags?.some(tag => tag.toLowerCase().includes(query));
      return matchName || matchDesc || matchCat || matchTags;
    });
  }, [apps, query, settings.searchDescriptions, settings.searchCategories]);

  const matchingCommands = useMemo(() => {
    if (!query) return [];
    return settingCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(query) || cmd.description.toLowerCase().includes(query)
    );
  }, [settingCommands, query]);

  const totalResultsCount = matchingApps.length + matchingCommands.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalResultsCount > 0) {
        setSelectedIndex(prev => (prev + 1) % totalResultsCount);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalResultsCount > 0) {
        setSelectedIndex(prev => (prev - 1 + totalResultsCount) % totalResultsCount);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalResultsCount > 0) {
        if (selectedIndex < matchingApps.length) {
          launchApp(matchingApps[selectedIndex]);
          setSearchQuery('');
          inputRef.current?.blur();
        } else {
          const cmdIndex = selectedIndex - matchingApps.length;
          matchingCommands[cmdIndex]?.action();
          setSearchQuery('');
          inputRef.current?.blur();
        }
      }
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  const handleLaunch = (app: AppItem) => {
    launchApp(app);
    setSearchQuery('');
    setIsFocused(false);
  };

  const handleRunCommand = (cmd: SettingCommand) => {
    cmd.action();
    setSearchQuery('');
    setIsFocused(false);
  };

  return (
    <div className="relative w-full z-30">
      {/* Search Input Box */}
      <div className="relative flex items-center w-full px-3.5 py-2.5 rounded-2xl home-search-field">
        <Search
          className={`w-4 h-4 ml-0.5 mr-3 transition-colors flex-shrink-0 ${
            isFocused ? 'text-accent' : 'text-muted'
          }`}
        />

        <input
          id="home-search-input"
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search apps, settings, and more"
          className="w-full bg-transparent text-sm home-search-input focus:outline-none tracking-normal"
          autoComplete="off"
          spellCheck="false"
        />

        {searchQuery ? (
          <button
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-lg text-muted hover:text-main hover-tile transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted glass-subtle border-subtle px-2 py-0.5 rounded-lg select-none shadow-xs">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        )}
      </div>

      {/* Dynamic Results Dropdown */}
      {query && (isFocused || searchQuery.length > 0) && (
        <div
          ref={resultsContainerRef}
          className="absolute left-0 right-0 top-full mt-2 max-h-[380px] overflow-y-auto rounded-2xl home-panel-window border border-subtle p-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-2xl"
        >
          {totalResultsCount === 0 ? (
            <div className="py-7 px-4 text-center">
              <p className="text-xs font-semibold text-muted">
                No matching apps or settings found for "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setIsAddAppOpen(true);
                  setSearchQuery('');
                }}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
              >
                + Add "{searchQuery}" to HOME
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {matchingApps.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    Applications ({matchingApps.length})
                  </div>
                  {matchingApps.map((app, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleLaunch(app)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                          isSelected
                            ? 'bg-accent text-white shadow-sm'
                            : 'hover-tile text-main'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AppIcon app={app} size="xs" />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm truncate">
                                {app.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/5 dark:bg-white/5 text-muted'
                                }`}
                              >
                                {app.category}
                              </span>
                            </div>
                            {app.description && (
                              <span
                                className={`text-[11px] truncate ${
                                  isSelected ? 'text-white/80' : 'text-muted'
                                }`}
                              >
                                {app.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {matchingCommands.length > 0 && (
                <div className="mt-2 pt-2 border-t border-subtle">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    Settings & Actions ({matchingCommands.length})
                  </div>
                  {matchingCommands.map((cmd, idx) => {
                    const overallIndex = matchingApps.length + idx;
                    const isSelected = selectedIndex === overallIndex;
                    return (
                      <div
                        key={cmd.id}
                        onClick={() => handleRunCommand(cmd)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors duration-150 ${
                          isSelected
                            ? 'bg-accent text-white shadow-sm'
                            : 'hover-tile text-main'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/5'
                            }`}
                          >
                            {cmd.icon}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs sm:text-sm truncate">
                              {cmd.name}
                            </span>
                            <span
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-white/80' : 'text-muted'
                              }`}
                            >
                              {cmd.description}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-semibold tracking-wider ${
                            isSelected ? 'text-white/70' : 'text-muted'
                          }`}
                        >
                          Execute ↵
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
