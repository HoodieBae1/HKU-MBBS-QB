import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { APP_VERSION } from './appVersion';

const UpdateManager = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = async () => {
    try {
      // Append timestamp to bypass Vercel/Browser caching
      const res = await fetch(`/version.json?t=${new Date().getTime()}`);
      const data = await res.json();
      
      if (data.currentVersion !== APP_VERSION) {
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.error("Update check failed", err);
    }
  };

  useEffect(() => {
    // 1. Check immediately on mount
    checkForUpdate();

    // 2. Check every 60 seconds
    const interval = setInterval(checkForUpdate, 60000);

    // 3. Check when window regains focus (user comes back to tab)
    const onFocus = () => checkForUpdate();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleReload = () => {
    // Force hard reload
    window.location.reload(true);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 animate-spin-slow" /> {/* Custom spin or normal spin */}
        </div>
        
        <h2 className="text-xl font-bold text-gray-800 mb-2">New Version Available</h2>
        <p className="text-gray-500 text-sm mb-6">
          A new version of the app has been deployed. Please reload to ensure you have the latest questions and features.
        </p>
        
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-xs text-left">
           <div className="flex justify-between font-mono font-bold mb-1">
             <span className="text-red-500">Old: v{APP_VERSION}</span>
             <span className="text-green-600">New: Update Ready</span>
           </div>
           <p className="text-gray-400">Updating guarantees data consistency.</p>
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