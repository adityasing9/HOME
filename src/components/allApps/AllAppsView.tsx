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
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';

export const AllAppsView: React.FC = () => {
  const {
    apps,
    setActiveView,
    setIsAddAppOpen,
    setIsGitHubImportOpen,
    launchApp,
    deleteApps,
    selectedCategory,
    setSelectedCategory,
    allAppsSort,
    setAllAppsSort,
    settings,
  } = useApp();

  const [localSearch, setLocalSearch] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    anchorRect?: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    position?: { x: number; y: number };
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
    e.preventDefault();
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement) || (e.target as HTMLElement)?.closest('button');
    const rect = btn ? btn.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();
    setContextMenuState(prev => (prev?.app.id === app.id ? null : {
      app,
      anchorRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = sortedApps.map(a => a.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (window.confirm(`Are you sure you want to delete ${count} application(s) from HOME?`)) {
      deleteApps(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      {/* Top Header */}
      {isSelectMode ? (
        <div className="flex items-center justify-between pb-3 border-b border-subtle bg-accent/5 px-2 py-1.5 rounded-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-subtle text-xs text-muted hover:text-main transition-colors"
            >
              {sortedApps.length > 0 && sortedApps.every(a => selectedIds.has(a.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>Select All</span>
            </button>
            <span className="text-xs font-semibold text-main">
              {selectedIds.size} Selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={selectedIds.size === 0}
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete ({selectedIds.size})</span>
            </button>
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-medium text-muted hover:text-main transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-1.5 px-2.5 py-1 -ml-1 rounded-xl text-muted hover:text-main hover-tile transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold">Back</span>
          </button>

          <h1 className="text-xs sm:text-sm font-bold text-main flex items-center gap-1.5">
            <span>All Applications</span>
            <span className="text-[11px] font-normal text-muted">({filteredApps.length})</span>
          </h1>

          <div className="flex items-center gap-1.5">
            {/* GitHub Import trigger */}
            <button
              onClick={() => setIsGitHubImportOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all text-xs font-medium"
              title="Import links from GitHub repository About sections"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </button>

            {/* Select / Manage Bulk Delete mode */}
            {apps.length > 0 && (
              <button
                onClick={() => setIsSelectMode(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl glass-subtle border-subtle text-muted hover:text-main hover-tile transition-all text-xs font-medium"
                title="Select multiple apps to delete or manage"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Select</span>
              </button>
            )}

            {/* Add App */}
            <button
              onClick={() => setIsAddAppOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Recessed Search & Sort */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search all apps..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl home-search-field home-search-input text-xs focus:outline-none"
          />
        </div>

        <select
          value={allAppsSort}
          onChange={e => setAllAppsSort(e.target.value as SortOption)}
          className="px-2.5 py-1.5 rounded-xl home-search-field home-search-input text-xs border-none focus:outline-none cursor-pointer"
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
              : 'text-muted hover:text-main hover-tile'
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
                  : 'text-muted hover:text-main hover-tile'
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
          <div className="py-12 text-center text-xs text-muted">
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
                  isSelectMode={isSelectMode}
                  isSelected={selectedIds.has(app.id)}
                  onToggleSelect={() => toggleSelect(app.id)}
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
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(app.id)}
                onToggleSelect={() => toggleSelect(app.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuState && !isSelectMode && (
        <ContextMenu
          app={contextMenuState.app}
          anchorRect={contextMenuState.anchorRect}
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
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const AppRow: React.FC<AppRowProps> = ({
  app,
  onLaunch,
  onContextMenu,
  onOpenMenu,
  isSelectMode,
  isSelected,
  onToggleSelect,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode && onToggleSelect) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect();
    } else {
      onLaunch();
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={isSelectMode ? e => e.preventDefault() : onContextMenu}
      className={`group flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? 'bg-accent/15 border border-accent/40 shadow-sm'
          : 'hover-tile border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Selection Checkbox */}
        {isSelectMode && (
          <div className="flex-shrink-0">
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-accent" />
            ) : (
              <Square className="w-4 h-4 text-muted/60" />
            )}
          </div>
        )}

        <AppIcon app={app} size="sm" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-xs text-main truncate">
              {app.name}
            </span>
            {app.favorite && (
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
          </div>
          {app.description ? (
            <span className="text-[11px] text-muted truncate">
              {app.description}
            </span>
          ) : (
            <span className="text-[11px] text-muted truncate">
              {app.category}
            </span>
          )}
        </div>
      </div>

      {!isSelectMode && (
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-1 rounded-lg text-muted opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-main hover-tile transition-all"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
