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
import { GitHubImportModal } from './components/modals/GitHubImportModal';
import { QRModal } from './components/modals/QRModal';
import { PCLockScreen } from './components/auth/PCLockScreen';
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

      {/* Dynamic Ambient Luminous Light Spheres for Pure Glass Refraction */}
      {settings.background !== 'minimal' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[16%] left-[50%] -translate-x-[65%] w-[580px] h-[500px] rounded-full bg-blue-500/16 dark:bg-sky-500/16 blur-[120px] transition-all duration-1000 animate-pulse" />
          <div className="absolute top-[32%] left-[50%] translate-x-[18%] w-[540px] h-[480px] rounded-full bg-purple-500/14 dark:bg-indigo-500/16 blur-[130px] transition-all duration-1000" />
          <div className="absolute bottom-[10%] left-[50%] -translate-x-[25%] w-[480px] h-[400px] rounded-full bg-cyan-500/12 dark:bg-emerald-500/12 blur-[110px] transition-all duration-1000" />
        </div>
      )}

      {/* Persistent OS Header */}
      <Header />

      {/* Main Centered Workspace */}
      <main className="flex-1 flex flex-col items-center p-2 sm:p-4 md:p-8 pb-20 md:pb-8 z-10 w-full max-w-7xl mx-auto min-h-0">
        <div className="w-full flex-1 flex flex-col md:my-auto max-w-full md:max-w-[660px] min-h-0">
          {activeView === 'home' && <HomePanel />}

          {activeView === 'all-apps' && (
            <div className="w-full flex-1 rounded-2xl md:rounded-[28px] home-panel-window overflow-hidden flex flex-col p-4 sm:p-6 md:p-7 backdrop-blur-2xl animate-in fade-in zoom-in-[0.98] min-h-0">
              <AllAppsView />
            </div>
          )}

          {activeView === 'favorites' && (
            <div className="w-full flex-1 rounded-2xl md:rounded-[28px] home-panel-window overflow-hidden flex flex-col p-4 sm:p-6 md:p-7 backdrop-blur-2xl animate-in fade-in zoom-in-[0.98] min-h-0">
              <FavoritesView />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Dock */}
      <MobileNavBar />

      {/* Modals & Dialogs */}
      <AddAppModal />
      <EditAppModal />
      <SettingsModal />
      <FirstRunModal />
      <GitHubImportModal />
      <QRModal />
      <PCLockScreen />

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
