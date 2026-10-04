import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, type AppItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { AppIcon } from './AppIcon';
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
  const [showCategorySubmenu, setShowCategorySubmenu] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Mobile Bottom Action Sheet
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in duration-200">
        {/* Dimmed backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Bottom sheet content */}
        <div
          ref={menuRef}
          className="relative z-10 w-full max-w-lg mx-auto rounded-t-[28px] home-panel-window border-t border-subtle shadow-2xl p-4 pb-[max(24px,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200 backdrop-blur-2xl"
        >
          {/* Grab handle */}
          <div className="w-10 h-1 bg-white/30 dark:bg-white/20 rounded-full mx-auto mb-3" />

          {/* App Info Header */}
          <div className="flex items-center gap-3 pb-3 mb-2 border-b border-subtle">
            <AppIcon app={app} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-main truncate">{app.name}</span>
                <span className="text-[10px] text-muted bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-medium">
                  {app.category}
                </span>
              </div>
              <p className="text-[11px] text-muted truncate mt-0.5">
                {app.description || app.url}
              </p>
            </div>
          </div>

          {/* Action List */}
          <div className="flex flex-col gap-1 text-sm font-medium">
            <button
              onClick={() => {
                launchApp(app);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover-tile text-main text-left transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-sky-500" />
              <span>Open app</span>
            </button>

            <button
              onClick={() => {
                togglePin(app.id);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover-tile text-main text-left transition-colors"
            >
              {app.pinned ? (
                <>
                  <PinOff className="w-4 h-4 text-amber-500" />
                  <span>Unpin from HOME</span>
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-sky-500" />
                  <span>Pin to HOME</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                toggleFavorite(app.id);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover-tile text-main text-left transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  app.favorite ? 'text-amber-500 fill-amber-500' : 'text-muted'
                }`}
              />
              <span>{app.favorite ? 'Remove favorite' : 'Add to favorites'}</span>
            </button>

            {/* Reorder pin on mobile if applicable */}
            {app.pinned && (onMoveLeft || onMoveRight) && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03]">
                <span className="text-xs text-muted">Reorder pin:</span>
                <div className="flex gap-2">
                  {onMoveLeft && (
                    <button
                      onClick={() => {
                        onMoveLeft();
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover-tile text-main text-xs flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Left</span>
                    </button>
                  )}
                  {onMoveRight && (
                    <button
                      onClick={() => {
                        onMoveRight();
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover-tile text-main text-xs flex items-center gap-1 font-medium"
                    >
                      <span>Right</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Move Category Submenu */}
            <div>
              <button
                onClick={() => setShowCategorySubmenu(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover-tile text-main text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderInput className="w-4 h-4 text-indigo-500" />
                  <span>Move to category</span>
                </div>
                <span className="text-xs text-muted">{showCategorySubmenu ? '▲' : '▼'}</span>
              </button>

              {showCategorySubmenu && (
                <div className="grid grid-cols-2 gap-1 p-2 my-1 rounded-xl bg-black/5 dark:bg-white/5 border border-subtle max-h-36 overflow-y-auto">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        updateApp(app.id, { category: cat });
                        onClose();
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${
                        app.category === cat ? 'bg-accent text-white font-semibold' : 'text-main hover-tile'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setEditingApp(app);
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover-tile text-main text-left transition-colors"
            >
              <Pencil className="w-4 h-4 text-muted" />
              <span>Edit details</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove "${app.name}" from HOME?`)) {
                  deleteApp(app.id);
                }
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-left transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Remove from HOME</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-main font-semibold text-xs hover-tile transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop Floating Context Menu
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
