import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
          info: <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />,
        };

        const bg = {
          success: 'bg-slate-900/90 border-emerald-500/30 text-slate-100',
          warning: 'bg-slate-900/90 border-amber-500/30 text-slate-100',
          error: 'bg-slate-900/90 border-rose-500/30 text-slate-100',
          info: 'bg-slate-900/90 border-sky-500/30 text-slate-100',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${bg[toast.type]}`}
            role="status"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icons[toast.type]}
              <span className="text-xs sm:text-sm font-medium truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
