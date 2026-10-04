import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import { ChevronRight, Star, MoreVertical } from 'lucide-react';

export const PinnedApps: React.FC = () => {
  const {
    apps,
    settings,
    launchApp,
    setActiveView,
    reorderPinned,
  } = useApp();

  const pinnedApps = [...apps]
    .filter(a => a.pinned)
    .sort((a, b) => a.pinOrder - b.pinOrder);

  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverAppId, setDragOverAppId] = useState<string | null>(null);

  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    anchorRect?: { top: number; bottom: number; left: number; right: number; width: number; height: number };
    position?: { x: number; y: number };
    index: number;
  } | null>(null);

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
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLElement) || (e.target as HTMLElement)?.closest('button');
    const rect = btn ? btn.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();
    setContextMenuState({
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
    });
  };

  return (
    <div className="w-full">
      {/* Pinned Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs sm:text-sm font-bold text-main tracking-normal">
          Pinned
        </h2>

        <button
          onClick={() => setActiveView('all-apps')}
          className="group flex items-center gap-1 text-xs font-medium text-muted hover:text-main transition-colors px-2.5 py-1 rounded-lg hover-tile"
        >
          <span>All apps</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
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
                  onClick={e => openButtonContextMenu(e, app, index)}
                  className="absolute top-1 right-1 p-0.5 rounded-md text-muted opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-main transition-all"
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
