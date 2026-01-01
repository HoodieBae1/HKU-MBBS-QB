import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { APP_VERSION } from './appVersion';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Only check once every 5 minutes max

const UpdateManager = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const lastCheckTime = useRef(Date.now());

  const checkForUpdate = async (force = false) => {
    // 1. Throttle: If we checked recently (and aren't forcing), skip to save edge requests.
    const now = Date.now();
    if (!force && (now - lastCheckTime.current < CHECK_INTERVAL_MS)) {
      return;
    }

    try {
      // 2. Optimization: Remove "?t=". Use header 'no-cache'.
      // This asks Vercel's CDN if the file changed. 
      // If unchanged, it returns 304 (Not Modified) which is tiny and fast.
      const res = await fetch('/version.json', { 
        cache: 'no-cache',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) return;

      const data = await res.json();
      
      // Update the last check time
      lastCheckTime.current = now;

      if (data.currentVersion !== APP_VERSION) {
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.error("Update check failed", err);
    }
  };

  useEffect(() => {
    // 1. Check immediately on app mount
    checkForUpdate(true);

    // 2. Check when the window gains focus (user comes back to tab)
    // This catches users who left the tab open overnight.
    const onFocus = () => checkForUpdate(false);

    // 3. Check when device comes back online (e.g. mobile unlock)
    const onOnline = () => checkForUpdate(true);

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const handleReload = () => {
    // Clear any service worker caches if you have them, then reload
    if ('caches' in window) {
      caches.keys().then((names) => {
          names.forEach((name) => {
              caches.delete(name);
          });
      });
    }
    window.location.reload(true);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 animate-spin-slow" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2">New Version Available</h2>
        <p className="text-gray-500 text-sm mb-6">
          Security and database updates are required to continue.
        </p>
        
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs text-left">
           <div className="flex justify-between font-mono font-bold mb-1">
             <span className="text-red-500 line-through">v{APP_VERSION}</span>
             <span className="text-green-600">New Version Ready</span>
           </div>
           <p className="text-gray-400">Update required to sync progress.</p>
        </div>

        <button 
          onClick={handleReload}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Update Now
        </button>
      </div>
    </div>
  );
};

export default UpdateManager;