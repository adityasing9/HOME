import React, { useEffect, useRef } from 'react';
import { CATEGORIES, type AppItem } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  ExternalLink,
  Pin,
  PinOff,
  Star,
  Pencil,
  Trash2,
  FolderInput,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface ContextMenuProps {
  app: AppItem;
  position: { x: number; y: number };
  onClose: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  app,
  position,
  onClose,
  onMoveLeft,
  onMoveRight,
}) => {
  const { launchApp, togglePin, toggleFavorite, setEditingApp, deleteApp, updateApp } = useApp();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCategorySubmenu, setShowCategorySubmenu] = React.useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates so the menu never flows out of viewport
  const menuWidth = 210;
  const menuHeight = 280;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 12);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      style={{ left: `${Math.max(12, left)}px`, top: `${Math.max(12, top)}px` }}
      className="fixed z-50 w-52 py-1.5 rounded-2xl glass-panel shadow-2xl border border-slate-700/50 dark:border-white/10 text-xs font-medium text-slate-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
    >
      {/* App Header Preview */}
      <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
        <span className="font-semibold text-slate-100 truncate">{app.name}</span>
        <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-full">
          {app.category}
        </span>
      </div>

      {/* Launch */}
      <button
        onClick={() => {
          launchApp(app);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/10 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
        <span>Open app</span>
      </button>

      {/* Pin / Unpin */}
      <button
        onClick={() => {
          togglePin(app.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/10 transition-colors"
      >
        {app.pinned ? (
          <>
            <PinOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Unpin from HOME</span>
          </>
        ) : (
          <>
            <Pin className="w-3.5 h-3.5 text-sky-400" />
            <span>Pin to HOME</span>
          </>
        )}
      </button>

      {/* Favorite / Unfavorite */}
      <button
        onClick={() => {
          toggleFavorite(app.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/10 transition-colors"
      >
        <Star
          className={`w-3.5 h-3.5 ${
            app.favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
          }`}
        />
        <span>{app.favorite ? 'Remove favorite' : 'Add to favorites'}</span>
      </button>

      {/* Reordering helpers if available */}
      {app.pinned && (onMoveLeft || onMoveRight) && (
        <div className="flex items-center justify-between px-3 py-1 my-0.5 border-y border-white/5 bg-white/[0.02]">
          <span className="text-[10px] text-slate-400">Reorder pin:</span>
          <div className="flex gap-1">
            {onMoveLeft && (
              <button
                onClick={() => {
                  onMoveLeft();
                  onClose();
                }}
                className="p-1 rounded hover:bg-white/10 text-slate-300"
                title="Move pin left"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
            )}
            {onMoveRight && (
              <button
                onClick={() => {
                  onMoveRight();
                  onClose();
                }}
                className="p-1 rounded hover:bg-white/10 text-slate-300"
                title="Move pin right"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Move Category Submenu */}
      <div className="relative">
        <button
          onClick={() => setShowCategorySubmenu(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FolderInput className="w-3.5 h-3.5 text-indigo-400" />
            <span>Move to category</span>
          </div>
          <span className="text-[10px] text-slate-400">›</span>
        </button>

        {showCategorySubmenu && (
          <div className="absolute left-full top-0 ml-1 w-40 max-h-48 overflow-y-auto py-1.5 rounded-xl glass-panel shadow-2xl border border-slate-700/50 text-xs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  updateApp(app.id, { category: cat });
                  onClose();
                }}
                className={`w-full text-left px-3 py-1 hover:bg-white/10 truncate ${
                  app.category === cat ? 'text-accent font-semibold' : 'text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit App */}
      <button
        onClick={() => {
          setEditingApp(app);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/10 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-300" />
        <span>Edit details</span>
      </button>

      {/* Delete / Remove */}
      <div className="my-1 border-t border-white/5" />
      <button
        onClick={() => {
          if (window.confirm(`Are you sure you want to remove "${app.name}" from HOME?`)) {
            deleteApp(app.id);
          }
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span>Remove from HOME</span>
      </button>
    </div>
  );
};
