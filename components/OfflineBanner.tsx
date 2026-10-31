'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <aside
      aria-label="Aviso de conexão offline"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between backdrop-blur-md shadow-md animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
          <span>Modo Offline: Acedendo aos dados salvos no teu telemóvel (estilo WhatsApp).</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 bg-slate-950 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shrink-0 active:scale-95 transition-transform"
        >
          <RefreshCw className="w-3 h-3" />
          Reconectar
        </button>
      </div>
    </aside>
  );
}
