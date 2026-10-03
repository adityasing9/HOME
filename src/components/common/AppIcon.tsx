import React, { useState } from 'react';
import type { AppItem, AppSize } from '../../types';

interface AppIconProps {
  app: Pick<AppItem, 'name' | 'icon' | 'iconType' | 'category'>;
  size?: AppSize | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; shadow: string }> = {
  AI: {
    bg: 'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700',
    text: 'text-white',
    shadow: 'shadow-purple-500/20',
  },
  Education: {
    bg: 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600',
    text: 'text-white',
    shadow: 'shadow-blue-500/20',
  },
  Development: {
    bg: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-700',
    text: 'text-white',
    shadow: 'shadow-emerald-500/20',
  },
  Productivity: {
    bg: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600',
    text: 'text-white',
    shadow: 'shadow-orange-500/20',
  },
  Utilities: {
    bg: 'bg-gradient-to-br from-slate-500 via-slate-600 to-zinc-800',
    text: 'text-white',
    shadow: 'shadow-slate-500/20',
  },
  Finance: {
    bg: 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-800',
    text: 'text-white',
    shadow: 'shadow-green-500/20',
  },
  Entertainment: {
    bg: 'bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600',
    text: 'text-white',
    shadow: 'shadow-pink-500/20',
  },
  Games: {
    bg: 'bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-600',
    text: 'text-white',
    shadow: 'shadow-fuchsia-500/20',
  },
  Projects: {
    bg: 'bg-gradient-to-br from-sky-500 via-cyan-600 to-teal-700',
    text: 'text-white',
    shadow: 'shadow-sky-500/20',
  },
  Other: {
    bg: 'bg-gradient-to-br from-slate-600 via-zinc-700 to-neutral-800',
    text: 'text-white',
    shadow: 'shadow-slate-500/20',
  },
};

export const AppIcon: React.FC<AppIconProps> = ({ app, size = 'standard', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses: Record<string, { box: string; text: string; img: string; emoji: string }> = {
    compact: { box: 'w-10 h-10 rounded-[14px]', text: 'text-sm font-bold', img: 'w-5 h-5', emoji: 'text-base' },
    standard: { box: 'w-12 h-12 rounded-[18px]', text: 'text-base font-bold', img: 'w-6 h-6', emoji: 'text-xl' },
    spacious: { box: 'w-14 h-14 rounded-[20px]', text: 'text-lg font-bold', img: 'w-7 h-7', emoji: 'text-2xl' },
    xs: { box: 'w-6 h-6 rounded-lg', text: 'text-[10px] font-bold', img: 'w-3.5 h-3.5', emoji: 'text-xs' },
    sm: { box: 'w-9 h-9 rounded-xl', text: 'text-xs font-bold', img: 'w-4.5 h-4.5', emoji: 'text-sm' },
    md: { box: 'w-11 h-11 rounded-[16px]', text: 'text-sm font-bold', img: 'w-5.5 h-5.5', emoji: 'text-lg' },
    lg: { box: 'w-12 h-12 rounded-[18px]', text: 'text-base font-bold', img: 'w-6 h-6', emoji: 'text-xl' },
    xl: { box: 'w-16 h-16 rounded-[24px]', text: 'text-2xl font-bold', img: 'w-9 h-9', emoji: 'text-3xl' },
  };

  const currentSize = sizeClasses[size] || sizeClasses.standard;
  const style = CATEGORY_STYLES[app.category] || CATEGORY_STYLES.Other;

  // Custom image or URL
  const isImage =
    (app.iconType === 'image' || app.iconType === 'url' || (app.icon && (app.icon.startsWith('http') || app.icon.startsWith('data:')))) &&
    !imageError;

  if (isImage && app.icon) {
    return (
      <div
        className={`${currentSize.box} relative flex items-center justify-center bg-white/10 dark:bg-slate-800/80 border border-white/10 shadow-sm ${style.shadow} overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      >
        <img
          src={app.icon}
          alt={app.name}
          className={`${currentSize.img} object-contain select-none`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  // Emoji icon
  const isEmoji = app.iconType === 'emoji' || (app.icon && app.icon.length <= 4 && !/^[a-zA-Z0-9]+$/.test(app.icon));
  if (isEmoji && app.icon) {
    return (
      <div
        className={`${currentSize.box} flex items-center justify-center ${style.bg} ${style.shadow} shadow-md border border-white/20 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      >
        <span className={`${currentSize.emoji} select-none leading-none transform translate-y-[-0.5px]`}>
          {app.icon}
        </span>
      </div>
    );
  }

  // Letter fallback
  const initial = (app.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${currentSize.box} flex items-center justify-center ${style.bg} ${style.text} ${style.shadow} shadow-md border border-white/20 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
    >
      <span className={`${currentSize.text} leading-none tracking-tight select-none`}>
        {initial}
      </span>
    </div>
  );
};
