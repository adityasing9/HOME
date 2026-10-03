import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import { MoreVertical } from 'lucide-react';

export const RecommendedApps: React.FC = () => {
  const { apps, launchApp } = useApp();
  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    position: { x: number; y: number };
  } | null>(null);

  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Recently added';
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const recentApps = [...apps]
    .filter(a => a.lastOpenedAt !== null)
    .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));

  const frequentApps = [...apps]
    .filter(a => (a.launchCount || 0) > 0)
    .sort((a, b) => (b.launchCount || 0) - (a.launchCount || 0));

  const seenIds = new Set<string>();
  const displayedItems: { app: AppItem; meta: string }[] = [];

  for (const app of recentApps.slice(0, 4)) {
    seenIds.add(app.id);
    displayedItems.push({
      app,
      meta: `Opened ${formatRelativeTime(app.lastOpenedAt)}`,
    });
  }

  for (const app of frequentApps) {
    if (displayedItems.length >= 6) break;
    if (!seenIds.has(app.id)) {
      seenIds.add(app.id);
      displayedItems.push({
        app,
        meta: `${app.launchCount} launches`,
      });
    }
  }

  if (displayedItems.length < 6) {
    const newest = [...apps].sort((a, b) => b.createdAt - a.createdAt);
    for (const app of newest) {
      if (displayedItems.length >= 6) break;
      if (!seenIds.has(app.id)) {
        seenIds.add(app.id);
        displayedItems.push({
          app,
          meta: `Added ${formatRelativeTime(app.createdAt)}`,
        });
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent, app: AppItem) => {
    e.preventDefault();
    setContextMenuState({
      app,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const openButtonMenu = (e: React.MouseEvent, app: AppItem) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuState({
      app,
      position: { x: rect.left, y: rect.bottom + 4 },
    });
  };

  return (
    <div className="w-full">
      {/* Recommended Section Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-xs sm:text-sm font-bold text-main tracking-normal">
          Recommended
        </h2>
      </div>

      {/* 2-Column List Layout */}
      {displayedItems.length === 0 ? (
        <div className="py-5 px-4 rounded-2xl glass-subtle text-center">
          <p className="text-xs text-muted">
            Apps you launch will appear here automatically based on your local activity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          {displayedItems.map(({ app, meta }) => (
            <div
              key={app.id}
              onClick={() => launchApp(app)}
              onContextMenu={e => handleContextMenu(e, app)}
              className="group flex items-center justify-between p-2 rounded-2xl hover-tile cursor-pointer transition-all duration-150 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AppIcon app={app} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs text-main truncate">
                    {app.name}
                  </span>
                  <span className="text-[11px] text-muted truncate">
                    {meta}
                  </span>
                </div>
              </div>

              <button
                onClick={e => openButtonMenu(e, app)}
                className="p-1 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:text-main hover-tile transition-all flex-shrink-0"
                aria-label="Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu Dropdown */}
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
