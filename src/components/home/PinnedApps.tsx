import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem, PinnedSortOption } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import { ChevronRight, Star, MoreVertical, ArrowUpDown, Check, GripVertical } from 'lucide-react';

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

  // Local state of pinned apps for instant real-time drag reordering
  const [localPinnedApps, setLocalPinnedApps] = useState<AppItem[]>(pinnedApps);
  const localPinnedAppsRef = useRef<AppItem[]>(pinnedApps);

  // Touch and Arrange mode states
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [touchDraggingApp, setTouchDraggingApp] = useState<AppItem | null>(null);
  const [touchCoords, setTouchCoords] = useState<{ x: number; y: number } | null>(null);

  // Refs for tracking active touch drag gesture
  const isTouchDraggingRef = useRef<boolean>(false);
  const activeTouchAppRef = useRef<AppItem | null>(null);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep localPinnedApps in sync with pinnedApps when not actively dragging
  useEffect(() => {
    if (!isTouchDraggingRef.current) {
      setLocalPinnedApps(pinnedApps);
      localPinnedAppsRef.current = pinnedApps;
    }
  }, [pinnedApps]);

  useEffect(() => {
    localPinnedAppsRef.current = localPinnedApps;
  }, [localPinnedApps]);

  // Clean up any pending long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Desktop HTML5 drag states
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverAppId, setDragOverAppId] = useState<string | null>(null);

  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    anchorRect?: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    position?: { x: number; y: number };
    index: number;
  } | null>(null);

  // Haptic feedback helper for mobile devices
  const triggerHaptic = (pattern: number | number[] = 25) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if vibrate not supported or blocked by permissions policy
      }
    }
  };

  const commitReorder = useCallback((items: AppItem[]) => {
    const orderedIds = items.map(a => a.id);
    reorderPinned(orderedIds);
    if (pinnedSort !== 'custom') {
      setPinnedSort('custom');
      updateSettings({ pinnedSort: 'custom' });
    }
  }, [pinnedSort, reorderPinned, updateSettings]);

  const handleSortChange = (newSort: PinnedSortOption) => {
    setPinnedSort(newSort);
    updateSettings({ pinnedSort: newSort });

    // Sync pinOrder so custom drag-and-drop continues from this sorted state
    const sorted = sortPinnedList(apps.filter(a => a.pinned), newSort);
    setLocalPinnedApps(sorted);
    localPinnedAppsRef.current = sorted;
    reorderPinned(sorted.map(a => a.id));
  };

  // --- Mobile Touch Gestures (iOS / Android style finger drag) ---

  const handleTouchStart = (e: React.TouchEvent, app: AppItem) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchStartTime.current = Date.now();
    activeTouchAppRef.current = app;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isArrangeMode) {
      // In arrange mode, touch starts picking up the app immediately
      longPressTimer.current = setTimeout(() => {
        isTouchDraggingRef.current = true;
        setTouchDraggingApp(app);
        setTouchCoords({ x: touch.clientX, y: touch.clientY });
        triggerHaptic(35);
      }, 70);
    } else {
      // In normal mode: 280ms long-press activates Arrange Mode and lifts app to drag
      longPressTimer.current = setTimeout(() => {
        setIsArrangeMode(true);
        isTouchDraggingRef.current = true;
        setTouchDraggingApp(app);
        setTouchCoords({ x: touch.clientX, y: touch.clientY });
        triggerHaptic([35, 30, 35]);
      }, 280);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const distance = Math.hypot(dx, dy);

    // If drag hasn't started yet:
    if (!isTouchDraggingRef.current) {
      if (isArrangeMode && distance > 8) {
        // In arrange mode, any finger movement begins dragging immediately
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (activeTouchAppRef.current) {
          isTouchDraggingRef.current = true;
          setTouchDraggingApp(activeTouchAppRef.current);
          setTouchCoords({ x: touch.clientX, y: touch.clientY });
          triggerHaptic(30);
        }
      } else if (!isArrangeMode && distance > 10) {
        // In normal mode, if user moves > 10px before 280ms, they are scrolling the page
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }

    // Active touch dragging: prevent browser scrolling/pulling
    if (e.cancelable) {
      e.preventDefault();
    }

    setTouchCoords({ x: touch.clientX, y: touch.clientY });

    // Real-time element hit-testing across the grid
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCard = el?.closest('[data-pinned-app-id]');
    const targetId = targetCard?.getAttribute('data-pinned-app-id');
    const draggedApp = activeTouchAppRef.current;

    if (targetId && draggedApp && targetId !== draggedApp.id) {
      setLocalPinnedApps(prev => {
        const fromIdx = prev.findIndex(a => a.id === draggedApp.id);
        const toIdx = prev.findIndex(a => a.id === targetId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;

        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        triggerHaptic(15);
        return next;
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, app: AppItem) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isTouchDraggingRef.current) {
      // Completed touch drag: persist new app order!
      isTouchDraggingRef.current = false;
      setTouchDraggingApp(null);
      setTouchCoords(null);
      activeTouchAppRef.current = null;

      commitReorder(localPinnedAppsRef.current);
      triggerHaptic(25);
    } else {
      // Quick tap (< 300ms, moved < 12px)
      const duration = Date.now() - touchStartTime.current;
      const touch = e.changedTouches[0];
      const dx = touch ? touch.clientX - touchStartPos.current.x : 0;
      const dy = touch ? touch.clientY - touchStartPos.current.y : 0;
      const distance = Math.hypot(dx, dy);

      if (distance < 12 && duration < 320) {
        if (!isArrangeMode) {
          launchApp(app);
        }
      }
      activeTouchAppRef.current = null;
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false;
      setTouchDraggingApp(null);
      setTouchCoords(null);
      commitReorder(localPinnedAppsRef.current);
    }
    activeTouchAppRef.current = null;
  };

  // --- Desktop HTML5 Drag & Drop ---

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

    const currentList = localPinnedAppsRef.current;
    const fromIndex = currentList.findIndex(a => a.id === draggedAppId);
    const toIndex = currentList.findIndex(a => a.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const next = [...currentList];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setLocalPinnedApps(next);
      commitReorder(next);
    }
    setDraggedAppId(null);
  };

  const handleMoveItem = (currentIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    const currentList = localPinnedAppsRef.current;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const next = [...currentList];
    const temp = next[currentIndex];
    next[currentIndex] = next[targetIndex];
    next[targetIndex] = temp;
    setLocalPinnedApps(next);
    commitReorder(next);
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

  const handleCardClick = (e: React.MouseEvent, app: AppItem) => {
    if (isArrangeMode || isTouchDraggingRef.current) {
      e.preventDefault();
      return;
    }
    launchApp(app);
  };

  return (
    <div className="w-full">
      {/* Pinned Section Header with Title, Count, Arrange Mode, Sort Control, and All Apps */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-main tracking-normal">
            Pinned
          </h2>
          <span className="text-[10px] font-medium text-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {localPinnedApps.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile-Style Arrange Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsArrangeMode(prev => !prev);
              triggerHaptic(20);
            }}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-all ${
              isArrangeMode
                ? 'bg-accent text-white shadow-sm ring-1 ring-accent font-semibold'
                : 'text-muted hover:text-main hover-tile'
            }`}
            title={isArrangeMode ? 'Finish arranging' : 'Rearrange apps with finger or drag'}
          >
            {isArrangeMode ? (
              <>
                <Check className="w-3 h-3" />
                <span>Done</span>
              </>
            ) : (
              <>
                <GripVertical className="w-3 h-3 text-muted" />
                <span className="hidden sm:inline">Arrange</span>
                <span className="sm:hidden">Move</span>
              </>
            )}
          </button>

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

      {/* Arrange Mode Guidance Banner */}
      {isArrangeMode && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-accent-light border border-accent/25 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 text-main">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-[11.5px] sm:text-xs font-medium">
              Drag apps with your finger to rearrange
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsArrangeMode(false);
              triggerHaptic(20);
            }}
            className="px-2.5 py-1 rounded-lg bg-accent text-white text-[11px] font-bold hover:bg-accent-hover transition-colors shadow-sm flex-shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* Grid of Pinned Apps */}
      {localPinnedApps.length === 0 ? (
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
        <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-y-4 gap-x-1.5 sm:gap-x-2 ${isArrangeMode ? 'touch-drag-none' : ''}`}>
          {localPinnedApps.map((app, index) => {
            const isDesktopDragging = draggedAppId === app.id;
            const isDesktopDragOver = dragOverAppId === app.id;
            const isTouchDragging = touchDraggingApp?.id === app.id;

            // iOS-style subtle wobble animation when in arrange mode
            const wobbleClass = isArrangeMode && !isTouchDragging
              ? index % 2 === 0
                ? 'animate-app-wobble'
                : 'animate-app-wobble-alt'
              : '';

            return (
              <div
                key={app.id}
                data-pinned-app-id={app.id}
                draggable={!isArrangeMode}
                onDragStart={e => handleDragStart(e, app.id)}
                onDragOver={e => handleDragOver(e, app.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, app.id)}
                onTouchStart={e => handleTouchStart(e, app)}
                onTouchMove={handleTouchMove}
                onTouchEnd={e => handleTouchEnd(e, app)}
                onTouchCancel={handleTouchCancel}
                onContextMenu={e => handleContextMenu(e, app, index)}
                onClick={e => handleCardClick(e, app)}
                title={app.description ? `${app.name} — ${app.description}` : app.name}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                  isArrangeMode ? 'touch-drag-none' : ''
                } ${wobbleClass} ${
                  isTouchDragging
                    ? 'opacity-25 border-2 border-dashed border-accent/60 scale-95'
                    : isDesktopDragging
                    ? 'opacity-30 scale-95'
                    : isDesktopDragOver
                    ? 'border-2 border-accent bg-accent-light scale-105'
                    : isArrangeMode
                    ? 'bg-black/[0.03] dark:bg-white/[0.04] ring-1 ring-black/5 dark:ring-white/10 hover-tile'
                    : 'hover-tile'
                }`}
              >
                {/* Favorite Star indicator (hidden during arrange mode for cleaner look) */}
                {app.favorite && !isArrangeMode && (
                  <div className="absolute top-1 left-1.5 pointer-events-none">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  </div>
                )}

                {/* When in arrange mode: show subtle grip badge in corner */}
                {isArrangeMode ? (
                  <div className="absolute top-1 right-1 p-0.5 rounded-md text-accent bg-accent/10 pointer-events-none">
                    <GripVertical className="w-3 h-3" />
                  </div>
                ) : (
                  /* Normal 3-dots Context Menu button */
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
                )}

                {/* Main Icon */}
                <div className="my-1 pointer-events-none">
                  <AppIcon app={app} size={settings.appSize} />
                </div>

                {/* App Label */}
                <span className="w-full text-center text-[11.5px] font-medium text-main truncate mt-1 pointer-events-none">
                  {app.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Finger Drag Preview (iOS/Android mobile style) */}
      {touchDraggingApp && touchCoords && (
        <div
          className="fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-2.5 rounded-2xl glass-panel border border-accent/40 shadow-2xl scale-110 will-change-transform"
          style={{
            left: `${touchCoords.x}px`,
            top: `${touchCoords.y - 28}px`,
            width: '76px',
          }}
        >
          <div className="my-0.5 pointer-events-none">
            <AppIcon app={touchDraggingApp} size={settings.appSize} />
          </div>
          <span className="w-full text-center text-[11px] font-semibold text-main truncate mt-1 pointer-events-none">
            {touchDraggingApp.name}
          </span>
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
            contextMenuState.index < localPinnedApps.length - 1
              ? () => handleMoveItem(contextMenuState.index, 'right')
              : undefined
          }
        />
      )}
    </div>
  );
};
