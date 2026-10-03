import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { HomePanel } from './components/home/HomePanel';
import { AllAppsView } from './components/allApps/AllAppsView';
import { FavoritesView } from './components/favorites/FavoritesView';
import { AddAppModal } from './components/modals/AddAppModal';
import { EditAppModal } from './components/modals/EditAppModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { FirstRunModal } from './components/modals/FirstRunModal';
import { ToastContainer } from './components/common/ToastContainer';

const MainShell: React.FC = () => {
  const { activeView, settings } = useApp();

  const getBackgroundClass = () => {
    switch (settings.background) {
      case 'midnight':
        return 'bg-preset-midnight';
      case 'aurora':
        return 'bg-preset-aurora';
      case 'sunset':
        return 'bg-preset-sunset';
      case 'minimal':
        return 'bg-preset-minimal';
      case 'custom':
        return '';
      default:
        return 'bg-preset-default';
    }
  };

  const customStyle: React.CSSProperties =
    settings.background === 'custom' && settings.customWallpaper
      ? {
          backgroundImage: `url(${settings.customWallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {};

  return (
    <div
      style={customStyle}
      className={`min-h-screen w-full flex flex-col relative transition-colors duration-300 overflow-x-hidden ${getBackgroundClass()}`}
    >
      {/* Ambient background overlay for custom wallpapers */}
      {settings.background === 'custom' && (
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] pointer-events-none" />
      )}

      {/* Persistent OS Header */}
      <Header />

      {/* Main Centered Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 pb-20 md:pb-8 z-10 w-full max-w-7xl mx-auto">
        {activeView === 'home' && <HomePanel />}

        {activeView === 'all-apps' && (
          <div className="w-full max-w-[660px] rounded-[28px] home-panel-window overflow-hidden flex flex-col p-5 sm:p-7 backdrop-blur-2xl animate-in fade-in zoom-in-[0.98]">
            <AllAppsView />
          </div>
        )}

        {activeView === 'favorites' && (
          <div className="w-full max-w-[660px] rounded-[28px] home-panel-window overflow-hidden flex flex-col p-5 sm:p-7 backdrop-blur-2xl animate-in fade-in zoom-in-[0.98]">
            <FavoritesView />
          </div>
        )}
      </main>

      {/* Mobile Bottom Dock */}
      <MobileNavBar />

      {/* Modals & Dialogs */}
      <AddAppModal />
      <EditAppModal />
      <SettingsModal />
      <FirstRunModal />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
