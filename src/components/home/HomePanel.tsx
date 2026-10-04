import React from 'react';
import { SearchBar } from './SearchBar';
import { PinnedApps } from './PinnedApps';
import { RecommendedApps } from './RecommendedApps';
import { HomeBottomBar } from './HomeBottomBar';

export const HomePanel: React.FC = () => {
  return (
    <div className="w-full max-w-full md:max-w-[660px] flex-1 md:flex-initial rounded-2xl md:rounded-[28px] home-panel-window overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in zoom-in-[0.98] min-h-0">
      {/* Top Body: Search, Pinned, Recommended */}
      <div className="p-4 sm:p-6 md:p-7 flex flex-col gap-5 sm:gap-6 flex-1 overflow-y-auto min-h-0">
        {/* Top Search Bar */}
        <SearchBar />

        {/* Pinned Applications */}
        <PinnedApps />

        {/* Recommended Activity */}
        <RecommendedApps />
      </div>

      {/* Bottom Shelf (User profile + quick actions) */}
      <HomeBottomBar />
    </div>
  );
};
