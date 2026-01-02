import React from 'react';
import { Database, DollarSign, BrainCircuit, FileText } from 'lucide-react';

const FREE_TIER_LIMIT_BYTES_LEGACY = 524288000; // 500 MB
const HARD_LIMIT_BYTES_TRIAL = 51200;       // 50 KB
const HARD_LIMIT_BYTES_PAID = 52428800;     // 50 MB
const PRO_PLAN_COST_USD = 25;
const USD_TO_HKD_RATE = 7.8;

const QuotaDisplay = ({ userProfile, stats }) => {
  const safeStats = stats || { totalBytes: 0, userBytes: 0, details: { progress: 0, ai_cache: 0 } };
  const isStandard = userProfile?.subscription_tier === 'standard';
  const isTrial = userProfile?.subscription_status === 'trial';

  // ==========================================
  // 1. STANDARD USER VIEW (New Logic)
  // ==========================================
  if (isStandard) {
    const limit = isTrial ? HARD_LIMIT_BYTES_TRIAL : (userProfile?.db_storage_limit || HARD_LIMIT_BYTES_PAID);
    const usagePercent = Math.min(100, (safeStats.userBytes / limit) * 100);
    
    // Formatting
    const limitLabel = isTrial ? '50 KB' : '50 MB';
    const usedLabel = isTrial 
        ? `${(safeStats.userBytes / 1024).toFixed(2)} KB`
        : `${(safeStats.userBytes / (1024 * 1024)).toFixed(2)} MB`;

    let colorClass = "bg-teal-500";
    if (usagePercent >= 80) colorClass = "bg-yellow-500";
    if (usagePercent >= 95) colorClass = "bg-red-500";

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-white/10 bg-black/20 text-[10px] font-mono group relative">
          <Database className="w-3 h-3 opacity-70" />
          <div className="flex flex-col w-16">
            <div className="flex justify-between mb-0.5 px-0.5"><span>DB</span><span>{Math.round(usagePercent)}%</span></div>
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
               <div className={`h-full transition-all duration-1000 ${colorClass}`} style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
          {/* Simple Tooltip for Standard */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-slate-800 text-white p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-50 text-[10px]">
             <p className="font-bold text-teal-400 mb-1">{isTrial ? 'Trial Storage (Tiny)' : 'Pro Storage'}</p>
             <p>{usedLabel} / {limitLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. LEGACY FRIEND VIEW (Original Logic)
  // ==========================================
  
  const totalPercentage = Math.min(100, (safeStats.totalBytes / FREE_TIER_LIMIT_BYTES_LEGACY) * 100);
  const userShareRatio = safeStats.totalBytes > 0 ? (safeStats.userBytes / safeStats.totalBytes) : 0;
  const userCostHKD = PRO_PLAN_COST_USD * userShareRatio * USD_TO_HKD_RATE;
  
  // Formatting
  const displayHKD = (Math.round(userCostHKD * 10) / 10).toFixed(1);
  const totalUsedMB = (safeStats.totalBytes / (1024 * 1024)).toFixed(0);
  const userUsedMB = (safeStats.userBytes / (1024 * 1024)).toFixed(2);
  const aiMB = (safeStats.details?.ai_cache / (1024 * 1024)).toFixed(2);
  const notesMB = (safeStats.details?.progress / (1024 * 1024)).toFixed(2);

  let colorClass = "bg-teal-500"; 
  let textClass = "text-teal-100";
  if (totalPercentage >= 80) { colorClass = "bg-yellow-500"; textClass = "text-yellow-100"; }
  if (totalPercentage >= 95) { colorClass = "bg-red-500"; textClass = "text-red-100"; }

  return (
    <div className={`flex items-center gap-2 px-2 py-0.5 rounded border border-white/10 ${textClass} bg-black/20 text-[10px] font-mono cursor-help group relative`}>
      <Database className="w-3 h-3 opacity-70" />
      
      <div className="flex flex-col w-24">
        <div className="flex justify-between mb-0.5"><span>Quota</span><span>{Math.round(totalPercentage)}%</span></div>
        <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${totalPercentage}%` }} />
        </div>
      </div>

      {/* ORIGINAL COMPLEX TOOLTIP */}
      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-72 bg-slate-800 text-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-600">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-l border-slate-600"></div>

        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-600">
             <span className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">Data Footprint</span>
             <span className="font-mono text-xs">{totalUsedMB} / 500 MB Used</span>
        </div>
        
        <div className="space-y-1 text-xs mb-3">
            <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3"/>AI Usage</span>
                <span className="font-mono">{aiMB} MB</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> Notes & History</span>
                <span className="font-mono">{notesMB} MB</span>
            </div>
            <div className="flex justify-between items-center font-bold pt-1 text-white border-t border-slate-700/50 mt-1">
                <span>Total User Data</span>
                <span className="font-mono text-teal-300">{userUsedMB} MB</span>
            </div>
        </div>

        <div className="bg-slate-900/80 rounded p-2 border border-slate-700">
            <div className="flex items-center justify-center gap-1 text-xl font-bold text-green-400">
                <DollarSign className="w-5 h-5" />
                <span>{displayHKD} HKD</span>
            </div>
            <p className="text-[9px] text-gray-500 mt-1 text-center italic">
                (Based on {(userShareRatio * 100).toFixed(2)}% of total usage)
            </p>
        </div>
      </div>
    </div>
  );
};

export default QuotaDisplay;