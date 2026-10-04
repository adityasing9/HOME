import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, LayoutGrid, Star, Settings, QrCode } from 'lucide-react';

export const MobileNavBar: React.FC = () => {
  const { activeView, setActiveView, setIsSettingsOpen, openQRModal } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 home-bottom-shelf backdrop-blur-xl px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveView('home')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'home'
            ? 'text-accent font-bold'
            : 'text-muted hover:text-main'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => setActiveView('all-apps')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'all-apps'
            ? 'text-accent font-bold'
            : 'text-muted hover:text-main'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px]">All Apps</span>
      </button>

      <button
        onClick={() => setActiveView('favorites')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
          activeView === 'favorites'
            ? 'text-accent font-bold'
            : 'text-muted hover:text-main'
        }`}
      >
        <Star className="w-5 h-5" />
        <span className="text-[10px]">Favorites</span>
      </button>

      <button
        onClick={() => openQRModal('scan')}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-muted hover:text-main transition-colors"
        title="Scan QR Code"
      >
        <QrCode className="w-5 h-5 text-accent" />
        <span className="text-[10px]">QR Scan</span>
      </button>

      <button
        onClick={() => setIsSettingsOpen(true)}
        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-muted hover:text-main transition-colors"
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px]">Settings</span>
      </button>
    </nav>
  );
};
