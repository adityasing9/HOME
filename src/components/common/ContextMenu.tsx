import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCategorySubmenu, setShowCategorySubmenu] = useState(false);

  // Position calculation: anchors right beside the 3-dots button, never clipping or floating at screen bottom
  const computePosition = (menuW = 224, menuH = 310) => {
    if (typeof window === 'undefined') {
      return { left: 16, top: 16, flipSubmenuLeft: false, flipSubmenuUp: false };
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 12;

    let targetLeft: number;
    let targetTop: number;

    if (anchorRect) {
      // Anchored to the 3-dots button:
      // Primary: place menu to the left of the button so it sits directly beside it
      const leftAside = anchorRect.left - menuW - 6;
      // Secondary: place menu to the right of the button if room allows
      const rightAside = anchorRect.right + 6;

      if (leftAside >= margin) {
        targetLeft = leftAside;
      } else if (rightAside + menuW <= viewportW - margin) {
        targetLeft = rightAside;
      } else {
        // Narrow screen fallback: align right edge with trigger button
        targetLeft = anchorRect.right - menuW;
      }

      // Vertical anchoring:
      // Start aligned with the top of the 3-dots button
      const topAligned = anchorRect.top - 4;
      if (topAligned + menuH <= viewportH - margin) {
        targetTop = topAligned;
      } else {
        // If opening downward would exceed viewport, flip upward aligned with bottom of button
        targetTop = anchorRect.bottom - menuH + 4;
      }
    } else {
      // Pointer / right-click fallback
      const px = position?.x ?? margin;
      const py = position?.y ?? margin;

      if (px + menuW > viewportW - margin) {
        targetLeft = px - menuW;
      } else {
        targetLeft = px;
      }

      if (py + menuH > viewportH - margin) {
        targetTop = py - menuH;
      } else {
        targetTop = py;
      }
    }

    // Viewport boundary clamps
    const clampedLeft = Math.max(margin, Math.min(targetLeft, viewportW - menuW - margin));
    const clampedTop = Math.max(margin, Math.min(targetTop, viewportH - menuH - margin));

    const submenuW = 160;
    const flipSubmenuLeft = clampedLeft + menuW + submenuW > viewportW - margin;
    const flipSubmenuUp = clampedTop + 200 > viewportH - margin;

    return { left: clampedLeft, top: clampedTop, flipSubmenuLeft, flipSubmenuUp };
  };

  const [coords, setCoords] = useState(() => computePosition(224, 310));

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const actualW = rect.width || 224;
      const actualH = rect.height || 310;
      setCoords(computePosition(actualW, actualH));
    }
  }, [anchorRect, position?.x, position?.y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScrollOrResize = () => {
      onClose();
    };

    // Small delay so opening click doesn't instantly dismiss
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
      className="fixed z-[9999] w-56 py-1.5 rounded-2xl home-panel-window border-subtle shadow-2xl text-xs font-medium text-main animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl max-h-[calc(100vh-24px)] overflow-y-auto"
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
            className={`absolute ${
              coords.flipSubmenuUp ? 'bottom-0' : 'top-0'
            } py-1.5 w-40 max-h-48 overflow-y-auto rounded-xl home-panel-window border-subtle shadow-2xl text-xs z-50 ${
              coords.flipSubmenuLeft ? 'right-full mr-1' : 'left-full ml-1'
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
