import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppItem } from '../../types';
import { AppIcon } from '../common/AppIcon';
import { ContextMenu } from '../common/ContextMenu';
import { ArrowLeft, Star, Plus, MoreVertical, ExternalLink } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const { apps, setActiveView, launchApp, toggleFavorite, setIsAddAppOpen } = useApp();
  const [contextMenuState, setContextMenuState] = useState<{
    app: AppItem;
    position: { x: number; y: number };
  } | null>(null);

  const favoriteApps = apps.filter(a => a.favorite);

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
      <div className="flex items-center justify-between pb-3 border-b border-subtle">
        <button
          onClick={() => setActiveView('home')}
          className="flex items-center gap-1.5 px-2.5 py-1 -ml-1 rounded-xl text-muted hover:text-main hover-tile transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold">Back</span>
        </button>

        <h1 className="text-xs sm:text-sm font-bold text-main flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Favorites</span>
          <span className="text-[11px] font-normal text-muted">({favoriteApps.length})</span>
        </h1>

        <button
          onClick={() => setIsAddAppOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Grid / List of Favorites */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-1">
        {favoriteApps.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Star className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-main">No favorite applications yet</p>
            <p className="text-[11px] text-muted mt-1 max-w-xs mx-auto">
              Right-click any app or tap the three dots to mark it as a favorite.
            </p>
            <button
              onClick={() => setActiveView('all-apps')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              Browse All Apps
            </button>
          </div>
        ) : (
          favoriteApps.map(app => (
            <div
              key={app.id}
              onClick={() => launchApp(app)}
              onContextMenu={e => handleContextMenu(e, app)}
              className="group flex items-center justify-between p-2 rounded-2xl hover-tile cursor-pointer transition-colors duration-150 select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AppIcon app={app} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs text-main truncate">
                    {app.name}
                  </span>
                  <span className="text-[11px] text-muted truncate">
                    {app.description || app.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    toggleFavorite(app.id);
                  }}
                  className="p-1 rounded-lg text-amber-400 hover:text-slate-400 hover-tile transition-colors"
                  title="Remove from favorites"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </button>

                <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />

                <button
                  onClick={e => openButtonContextMenu(e, app)}
                  className="p-1 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:text-main hover-tile transition-all"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
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
