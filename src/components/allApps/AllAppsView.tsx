import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, type AppItem, type SortOption } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import {
  ArrowLeft,
  Search,
  Plus,
  Star,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';

export const AllAppsView: React.FC = () => {
  const {
    apps,
    setActiveView,
    setIsAddAppOpen,
    launchApp,
    selectedCategory,
    setSelectedCategory,
    allAppsSort,
    setAllAppsSort,
    settings,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    position: { x: number; y: number };
  } | null>(null);

  // Filter apps
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (selectedCategory !== 'All' && app.category !== selectedCategory) {
        return false;
      }
      if (localSearch.trim()) {
        const query = localSearch.trim().toLowerCase();
        const matchName = app.name.toLowerCase().includes(query);
        const matchDesc = app.description?.toLowerCase().includes(query);
        const matchCat = app.category?.toLowerCase().includes(query);
        const matchTags = app.tags?.some(tag => tag.toLowerCase().includes(query));
        return matchName || matchDesc || matchCat || matchTags;
      }
      return true;
    });
  }, [apps, selectedCategory, localSearch]);

  // Sort apps
  const sortedApps = useMemo(() => {
    const list = [...filteredApps];
    switch (allAppsSort) {
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'most-used':
        return list.sort((a, b) => (b.launchCount || 0) - (a.launchCount || 0));
      case 'recently-opened':
        return list.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
      case 'recently-added':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      default:
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [filteredApps, allAppsSort]);

  // Alphabetical Grouping
  const groupedAlphabetically = useMemo(() => {
    if (allAppsSort !== 'name-asc' && allAppsSort !== 'name-desc') {
      return null;
    }
    const groups: Record<string, AppItem[]> = {};
    for (const app of sortedApps) {
      const letter = (app.name.charAt(0) || '#').toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    }
    return groups;
  }, [sortedApps, allAppsSort]);

  const handleContextMenu = (e: React.MouseEvent, app: AppItem) => {
    e.preventDefault();
    setContextMenuState({
      app,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const openButtonContextMenu = (e: React.MouseEvent, app: AppItem) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuState({
      app,
      position: { x: rect.left, y: rect.bottom + 4 },
    });
  };

  return (
    <div className="w-full flex flex-col h-[580px]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-1.5 px-2.5 py-1 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.07] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold">Back</span>
        </button>

        <h1 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
          <span>All Applications</span>
          <span className="text-[11px] font-normal text-slate-400">({filteredApps.length})</span>
        </h1>

        <button
          onClick={() => setIsAddAppOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Recessed Search & Sort */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search all apps..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl home-search-field text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <select
          value={allAppsSort}
          onChange={e => setAllAppsSort(e.target.value as SortOption)}
          className="px-2.5 py-1.5 rounded-xl home-search-field text-xs text-slate-200 bg-slate-900 border-none focus:outline-none cursor-pointer"
        >
          <option value="name-asc">A → Z</option>
          <option value="name-desc">Z → A</option>
          <option value="most-used">Most Used</option>
          <option value="recently-opened">Recently Opened</option>
          <option value="recently-added">Recently Added</option>
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none text-[11px] select-none">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-all font-medium ${
            selectedCategory === 'All'
              ? 'bg-accent text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          All ({apps.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = apps.filter(a => a.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full whitespace-nowrap transition-all font-medium ${
                selectedCategory === cat
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {cat} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto mt-2 pr-1 space-y-4">
        {sortedApps.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No applications match your filter.
          </div>
        ) : groupedAlphabetically ? (
          Object.keys(groupedAlphabetically).map(letter => (
            <div key={letter} className="space-y-1">
              <div className="text-[11px] font-bold text-accent px-2 py-0.5">
                {letter}
              </div>
              {groupedAlphabetically[letter].map(app => (
                <AppRow
                  key={app.id}
                  app={app}
                  onLaunch={() => launchApp(app)}
                  onContextMenu={e => handleContextMenu(e, app)}
                  onOpenMenu={e => openButtonContextMenu(e, app)}
                  appSize={settings.appSize}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {sortedApps.map(app => (
              <AppRow
                key={app.id}
                app={app}
                onLaunch={() => launchApp(app)}
                onContextMenu={e => handleContextMenu(e, app)}
                onOpenMenu={e => openButtonContextMenu(e, app)}
                appSize={settings.appSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuState && (
        <ContextMenu
          app={contextMenuState.app}
          position={contextMenuState.position}
          onClose={() => setContextMenuState(null)}
        />
      )}
    </div>
  );
};

interface AppRowProps {
  app: AppItem;
  onLaunch: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
  appSize?: string;
}

const AppRow: React.FC<AppRowProps> = ({ app, onLaunch, onContextMenu, onOpenMenu }) => {
  return (
    <div
      onClick={onLaunch}
      onContextMenu={onContextMenu}
      className="group flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.07] dark:hover:bg-white/[0.06] cursor-pointer transition-colors duration-150 select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        <AppIcon app={app} size="sm" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-xs text-slate-100 group-hover:text-white truncate">
              {app.name}
            </span>
            {app.favorite && (
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
          </div>
          {app.description ? (
            <span className="text-[11px] text-slate-400 truncate">
              {app.description}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 truncate">
              {app.category}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
        <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={onOpenMenu}
          className="p-1 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
