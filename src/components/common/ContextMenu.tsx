import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  const menuWidth = 224;
  const menuHeight = 310;
  
  // Smart boundary checks: flip left or up if opening would clip viewport
  let left = position.x;
  if (left + menuWidth > window.innerWidth - 16) {
    left = Math.max(16, position.x - menuWidth);
  } else {
    left = Math.max(16, left);
  }

  let top = position.y;
  if (top + menuHeight > window.innerHeight - 16) {
    top = Math.max(16, position.y - menuHeight);
  } else {
    top = Math.max(16, top);
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 py-1.5 rounded-2xl home-panel-window border-subtle shadow-2xl text-xs font-medium text-main animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
    >
      {/* App Header Preview */}
      <div className="px-3 py-2 border-b border-subtle mb-1 flex items-center justify-between">
        <span className="font-semibold text-main truncate">{app.name}</span>
        <span className="text-[10px] text-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full">
          {app.category}
        </span>
      </div>

      {/* Launch */}
      <button
        onClick={() => {
          launchApp(app);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-main hover-tile transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
        <span>Open app</span>
      </button>

      {/* Pin / Unpin */}
      <button
        onClick={() => {
          togglePin(app.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-main hover-tile transition-colors"
      >
        {app.pinned ? (
          <>
            <PinOff className="w-3.5 h-3.5 text-amber-500" />
            <span>Unpin from HOME</span>
          </>
        ) : (
          <>
            <Pin className="w-3.5 h-3.5 text-sky-500" />
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
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-main hover-tile transition-colors"
      >
        <Star
          className={`w-3.5 h-3.5 ${
            app.favorite ? 'text-amber-500 fill-amber-500' : 'text-muted'
          }`}
        />
        <span>{app.favorite ? 'Remove favorite' : 'Add to favorites'}</span>
      </button>

      {/* Reordering helpers if available */}
      {app.pinned && (onMoveLeft || onMoveRight) && (
        <div className="flex items-center justify-between px-3 py-1 my-0.5 border-y border-subtle bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-[10px] text-muted">Reorder pin:</span>
          <div className="flex gap-1">
            {onMoveLeft && (
              <button
                onClick={() => {
                  onMoveLeft();
                  onClose();
                }}
                className="p-1 rounded hover-tile text-main"
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
                className="p-1 rounded hover-tile text-main"
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
          className="w-full flex items-center justify-between px-3 py-1.5 text-left text-main hover-tile transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <FolderInput className="w-3.5 h-3.5 text-indigo-500" />
            <span>Move to category</span>
          </div>
          <span className="text-[10px] text-muted">›</span>
        </button>

        {showCategorySubmenu && (
          <div
            className={`absolute top-0 py-1.5 w-40 max-h-48 overflow-y-auto rounded-xl home-panel-window border-subtle shadow-2xl text-xs z-50 ${
              left + menuWidth + 165 > window.innerWidth ? 'right-full mr-1' : 'left-full ml-1'
            }`}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  updateApp(app.id, { category: cat });
                  onClose();
                }}
                className={`w-full text-left px-3 py-1 hover-tile truncate ${
                  app.category === cat ? 'text-accent font-semibold' : 'text-main'
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
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-main hover-tile transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-muted" />
        <span>Edit details</span>
      </button>

      {/* Delete / Remove */}
      <div className="my-1 border-t border-subtle" />
      <button
        onClick={() => {
          if (window.confirm(`Are you sure you want to remove "${app.name}" from HOME?`)) {
            deleteApp(app.id);
          }
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        <span>Remove from HOME</span>
      </button>
    </div>,
    document.body
  );
};
