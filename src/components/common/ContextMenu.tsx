import React, { useEffect, useState } from 'react';
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

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width?: number;
  height?: number;
}

export interface ContextMenuProps {
  app: AppItem;
  anchorRect?: AnchorRect | null;
  position?: { x: number; y: number } | null;
  onClose: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  app,
  anchorRect,
  position,
  onClose,
  onMoveLeft,
  onMoveRight,
}) => {
  const { launchApp, togglePin, toggleFavorite, setEditingApp, deleteApp, updateApp } = useApp();
  const [showCategorySubmenu, setShowCategorySubmenu] = useState(false);

  // Close cleanly on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute position synchronously: guarantees window shows directly ASIDE the clicked PWA, never at the bottom
  const computePosition = () => {
    if (typeof window === 'undefined') {
      return { left: 16, top: 16, flipSubmenuLeft: false, flipSubmenuUp: false };
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const menuW = 224;
    const menuH = 310;
    const margin = 12;

    let targetLeft = 16;
    let targetTop = 16;

    if (anchorRect) {
      // Anchored to the PWA tile / 3-dot trigger button
      const openLeft = anchorRect.left - menuW - 6;
      const openRight = anchorRect.right + 6;

      // If PWA is in the right half of the screen, open to the left (aside of PWA)
      const isOnRightHalf = anchorRect.left > viewportW / 2;

      if (isOnRightHalf) {
        if (openLeft >= margin) {
          targetLeft = openLeft;
        } else if (openRight + menuW <= viewportW - margin) {
          targetLeft = openRight;
        } else {
          targetLeft = Math.max(margin, Math.min(anchorRect.right - menuW, viewportW - menuW - margin));
        }
      } else {
        // If PWA is in the left half of the screen, open to the right (aside of PWA)
        if (openRight + menuW <= viewportW - margin) {
          targetLeft = openRight;
        } else if (openLeft >= margin) {
          targetLeft = openLeft;
        } else {
          targetLeft = Math.max(margin, Math.min(anchorRect.left, viewportW - menuW - margin));
        }
      }

      // Vertical position: align with top of the PWA tile / trigger button
      const topAligned = anchorRect.top - 2;
      if (topAligned + menuH <= viewportH - margin) {
        targetTop = topAligned;
      } else {
        // If downwards exceeds viewport, flip upwards aligned with bottom of PWA / button
        targetTop = anchorRect.bottom - menuH + 2;
      }
    } else if (position) {
      // Right-click pointer fallback
      if (position.x + menuW > viewportW - margin) {
        targetLeft = position.x - menuW;
      } else {
        targetLeft = position.x;
      }

      if (position.y + menuH > viewportH - margin) {
        targetTop = position.y - menuH;
      } else {
        targetTop = position.y;
      }
    }

    // Safety boundary clamps within viewport
    const clampedLeft = Math.max(margin, Math.min(targetLeft, viewportW - menuW - margin));
    const clampedTop = Math.max(margin, Math.min(targetTop, viewportH - menuH - margin));

    const submenuW = 160;
    const flipSubmenuLeft = clampedLeft + menuW + submenuW > viewportW - margin;
    const flipSubmenuUp = clampedTop + 200 > viewportH - margin;

    return { left: clampedLeft, top: clampedTop, flipSubmenuLeft, flipSubmenuUp };
  };

  const coords = computePosition();

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-transparent"
      onClick={e => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: `${coords.left}px`,
          top: `${coords.top}px`,
        }}
        className="z-[9999] w-56 py-1.5 rounded-2xl home-panel-window border-subtle shadow-2xl text-xs font-medium text-main animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl max-h-[calc(100vh-24px)] overflow-y-auto select-none"
      >
        {/* App Header Preview */}
        <div className="px-3 py-2 border-b border-subtle mb-1 flex items-center justify-between">
          <span className="font-semibold text-main truncate">{app.name}</span>
          <span className="text-[10px] text-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full font-medium">
            {app.category}
          </span>
        </div>

        {/* Launch */}
        <button
          type="button"
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
          type="button"
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
          type="button"
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
                  type="button"
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
                  type="button"
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
            type="button"
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
              className={`absolute ${
                coords.flipSubmenuUp ? 'bottom-0' : 'top-0'
              } py-1.5 w-40 max-h-48 overflow-y-auto rounded-xl home-panel-window border-subtle shadow-2xl text-xs z-50 ${
                coords.flipSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'
              }`}
            >
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
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
          type="button"
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
          type="button"
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
      </div>
    </div>,
    document.body
  );
};
