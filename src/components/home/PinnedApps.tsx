import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem, PinnedSortOption } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import { ChevronRight, Star, MoreVertical, ArrowUpDown, Check } from 'lucide-react';

const sortPinnedList = (list: AppItem[], sortMode: PinnedSortOption): AppItem[] => {
  const arr = [...list];
  switch (sortMode) {
    case 'newest':
      // Newest apps first (Last in 1st location)
      return arr.sort((a, b) => (b.createdAt - a.createdAt) || (a.pinOrder - b.pinOrder));
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case 'most-used':
      return arr.sort((a, b) => (b.launchCount || 0) - (a.launchCount || 0));
    case 'recently-opened':
      return arr.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
    case 'custom':
    default:
      return arr.sort((a, b) => a.pinOrder - b.pinOrder);
  }
};

const SORT_OPTIONS: { value: PinnedSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First (1st)' },
  { value: 'custom', label: 'Custom (Drag & Drop)' },
  { value: 'name-asc', label: 'Name (A → Z)' },
  { value: 'name-desc', label: 'Name (Z → A)' },
  { value: 'most-used', label: 'Most Launched' },
  { value: 'recently-opened', label: 'Recently Opened' },
];

export const PinnedApps: React.FC = () => {
  const {
    apps,
    settings,
    launchApp,
    setActiveView,
    reorderPinned,
    updateSettings,
  } = useApp();

  const [pinnedSort, setPinnedSort] = useState<PinnedSortOption>(
    () => (settings.pinnedSort as PinnedSortOption) || 'newest'
  );
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings.pinnedSort && settings.pinnedSort !== pinnedSort) {
      setPinnedSort(settings.pinnedSort);
    }
  }, [settings.pinnedSort]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    if (showSortMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  const pinnedApps = useMemo(() => {
    return sortPinnedList(apps.filter(a => a.pinned), pinnedSort);
  }, [apps, pinnedSort]);

  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverAppId, setDragOverAppId] = useState<string | null>(null);

  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    anchorRect?: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    position?: { x: number; y: number };
    index: number;
  } | null>(null);

  const handleSortChange = (newSort: PinnedSortOption) => {
    setPinnedSort(newSort);
    updateSettings({ pinnedSort: newSort });

    // Sync pinOrder so custom drag-and-drop continues from this sorted state
    const sorted = sortPinnedList(apps.filter(a => a.pinned), newSort);
    reorderPinned(sorted.map(a => a.id));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedAppId !== targetId) {
      setDragOverAppId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverAppId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverAppId(null);

    if (!draggedAppId || draggedAppId === targetId) return;

    const currentIds = pinnedApps.map(a => a.id);
    const fromIndex = currentIds.indexOf(draggedAppId);
    const toIndex = currentIds.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newIds = [...currentIds];
      const [moved] = newIds.splice(fromIndex, 1);
      newIds.splice(toIndex, 0, moved);
      reorderPinned(newIds);
      if (pinnedSort !== 'custom') {
        setPinnedSort('custom');
        updateSettings({ pinnedSort: 'custom' });
      }
    }
    setDraggedAppId(null);
  };

  const handleMoveItem = (currentIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= pinnedApps.length) return;

    const currentIds = pinnedApps.map(a => a.id);
    const temp = currentIds[currentIndex];
    currentIds[currentIndex] = currentIds[targetIndex];
    currentIds[targetIndex] = temp;
    reorderPinned(currentIds);
    if (pinnedSort !== 'custom') {
      setPinnedSort('custom');
      updateSettings({ pinnedSort: 'custom' });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, app: AppItem, index: number) => {
    e.preventDefault();
    setContextMenuState({
      app,
      position: { x: e.clientX, y: e.clientY },
      index,
    });
  };

  const openButtonContextMenu = (e: React.MouseEvent, app: AppItem, index: number) => {
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
      index,
    }));
  };

  return (
    <div className="w-full">
      {/* Pinned Section Header with Title, Count, Sort Control, and All Apps */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-main tracking-normal">
            Pinned
          </h2>
          <span className="text-[10px] font-medium text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {pinnedApps.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sort Selector Dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              onClick={() => setShowSortMenu(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-main transition-colors px-2 py-1 rounded-lg hover-tile"
              title="Sort pinned apps"
            >
              <ArrowUpDown className="w-3 h-3 text-muted" />
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find(o => o.value === pinnedSort)?.label.split(' ')[0] || 'Sort'}
              </span>
              <span className="sm:hidden">Sort</span>
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 py-1.5 rounded-2xl home-panel-window border-subtle shadow-2xl text-xs z-30 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-2xl">
                <div className="px-3 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-subtle mb-1">
                  Sort Pinned Apps
                </div>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleSortChange(opt.value);
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover-tile transition-colors ${
                      pinnedSort === opt.value ? 'text-accent font-semibold' : 'text-main'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {pinnedSort === opt.value && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveView('all-apps')}
            className="group flex items-center gap-1 text-xs font-medium text-muted hover:text-main transition-colors px-2.5 py-1 rounded-lg hover-tile"
          >
            <span>All apps</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Grid of Pinned Apps */}
      {pinnedApps.length === 0 ? (
        <div className="py-7 px-4 rounded-2xl glass-subtle text-center">
          <p className="text-xs font-medium text-muted">
            Pin your favorite apps here for fast one-click access
          </p>
          <button
            onClick={() => setActiveView('all-apps')}
            className="mt-3 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
          >
            Browse All Apps
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-4 gap-x-1.5 sm:gap-x-2">
          {pinnedApps.map((app, index) => {
            const isDragging = draggedAppId === app.id;
            const isDragOver = dragOverAppId === app.id;

            return (
              <div
                key={app.id}
                draggable
                onDragStart={e => handleDragStart(e, app.id)}
                onDragOver={e => handleDragOver(e, app.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, app.id)}
                onContextMenu={e => handleContextMenu(e, app, index)}
                onClick={() => launchApp(app)}
                title={app.description ? `${app.name} — ${app.description}` : app.name}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                  isDragging
                    ? 'opacity-30 scale-95'
                    : isDragOver
                    ? 'border-2 border-accent bg-accent-light scale-105'
                    : 'hover-tile'
                }`}
              >
                {/* Favorite Star indicator */}
                {app.favorite && (
                  <div className="absolute top-1 left-1.5">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  </div>
                )}

                {/* 3-dots Context Menu button */}
                <button
                  type="button"
                  onClick={e => openButtonContextMenu(e, app, index)}
                  className={`absolute top-1 right-1 p-0.5 rounded-md text-muted hover:text-main transition-all ${
                    contextMenuState?.app.id === app.id
                      ? 'opacity-100 text-main'
                      : 'opacity-60 sm:opacity-0 sm:group-hover:opacity-100'
                  }`}
                  aria-label={`Options for ${app.name}`}
                  title="More actions"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {/* Main Icon */}
                <div className="my-1">
                  <AppIcon app={app} size={settings.appSize} />
                </div>

                {/* App Label */}
                <span className="w-full text-center text-[11.5px] font-medium text-main truncate mt-1">
                  {app.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Context Menu Dropdown */}
      {contextMenuState && (
        <ContextMenu
          app={contextMenuState.app}
          anchorRect={contextMenuState.anchorRect}
          position={contextMenuState.position}
          onClose={() => setContextMenuState(null)}
          onMoveLeft={
            contextMenuState.index > 0
              ? () => handleMoveItem(contextMenuState.index, 'left')
              : undefined
          }
          onMoveRight={
            contextMenuState.index < pinnedApps.length - 1
              ? () => handleMoveItem(contextMenuState.index, 'right')
              : undefined
          }
        />
      )}
    </div>
  );
};
