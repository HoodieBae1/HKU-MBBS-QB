import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from './supabase';
import { APP_VERSION } from './appVersion';

// Check every 2 minutes max to save database reads
const CHECK_INTERVAL = 2 * 60 * 1000;
let lastCheckTime = 0;

// --- HELPER: Returns TRUE if remoteVersion > localVersion ---
const isVersionNewer = (remoteVersion, localVersion) => {
  if (!remoteVersion || !localVersion) return false;
  
  const remote = remoteVersion.split('.').map(Number);
  const local = localVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(remote.length, local.length); i++) {
    const r = remote[i] || 0;
    const l = local[i] || 0;
    if (r > l) return true;  // Remote is newer -> Update Required
    if (r < l) return false; // Local is newer (Dev/Preview) -> No Update
  }
  return false; // Equal
};

const VersionSupervisor = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState(null);

  const checkVersionFromDB = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckTime < CHECK_INTERVAL) return;

    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_required_version')
        .single();

      if (data) {
        lastCheckTime = now;
        
        // FIXED LOGIC: Only show if DB version is strictly newer
        if (isVersionNewer(data.value, APP_VERSION)) {
          setNewVersion(data.value);
          setUpdateAvailable(true);
        }
      }
    } catch (err) {
      console.error("Version check failed", err);
    }
  };

  useEffect(() => {
    // 1. Check on mount
    checkVersionFromDB(true);

    // 2. Check on Focus
    const onFocus = () => checkVersionFromDB(false);
    window.addEventListener('focus', onFocus);

    // 3. Realtime Listener
    const channel = supabase
      .channel('version-check')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_config', filter: 'key=eq.min_required_version' },
        (payload) => {
          // FIXED LOGIC: Only show if new DB value is strictly newer
          if (isVersionNewer(payload.new.value, APP_VERSION)) {
            setNewVersion(payload.new.value);
            setUpdateAvailable(true);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReload = () => {
    if ('caches' in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    window.location.reload(true);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-500">
      
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-white/20">
        
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-white/5 rotate-12 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner ring-1 ring-white/30">
              <Sparkles className="w-8 h-8 text-white fill-white/20" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">Update Required</h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-500 text-center text-sm mb-6 leading-relaxed">
            A new version has been deployed. Please update to ensure data consistency.
          </p>

          <div className="flex items-center justify-between gap-2 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
             <div className="text-center flex-1">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current</span>
                <span className="font-mono text-sm text-gray-500 line-through decoration-red-400/50">v{APP_VERSION}</span>
             </div>
             
             <div className="text-gray-300">
                <ArrowRight className="w-4 h-4" />
             </div>
             
             <div className="text-center flex-1">
                <span className="block text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">New</span>
                <span className="font-mono text-sm font-bold text-teal-700">
                  {newVersion ? `v${newVersion}` : 'Latest'}
                </span>
             </div>
          </div>

          <button 
            onClick={handleReload}
            className="group w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Update Now
          </button>
        </div>

      </div>
    </div>
  );
};

export default VersionSupervisor;