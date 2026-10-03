import React from 'react';
import { SearchBar } from './SearchBar';
import { PinnedApps } from './PinnedApps';
import { RecommendedApps } from './RecommendedApps';
import { HomeBottomBar } from './HomeBottomBar';

export const HomePanel: React.FC = () => {
  return (
    <div className="w-full max-w-[660px] rounded-[28px] home-panel-window overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in zoom-in-[0.98]">
      {/* Top Body: Search, Pinned, Recommended */}
      <div className="p-5 sm:p-7 flex flex-col gap-6">
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
