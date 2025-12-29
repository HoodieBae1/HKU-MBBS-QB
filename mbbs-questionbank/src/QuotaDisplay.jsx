import React, { useEffect, useState } from 'react';
import { Database, Loader2, DollarSign, BrainCircuit, FileText } from 'lucide-react';
import { supabase } from './supabase';

const FREE_TIER_LIMIT_BYTES = 524288000; // 500 MB
const PRO_PLAN_COST_USD = 25;
const USD_TO_HKD_RATE = 7.8;

const QuotaDisplay = ({ session }) => {
  const [stats, setStats] = useState({ 
    totalBytes: 0, 
    userBytes: 0, 
    details: { progress: 0, ai_cache: 0 } 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_quota_stats', {
          target_user_id: session.user.id
        });
        
        if (error) throw error;
        
        setStats({
            totalBytes: data.total_bytes || 0,
            userBytes: data.user_bytes || 0,
            details: data.details || { progress: 0, ai_cache: 0 }
        });
      } catch (err) {
        console.error("Quota fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  if (loading) return <Loader2 className="w-3 h-3 animate-spin text-teal-200" />;

  // 1. Calculate Percentage of DB Used
  const totalPercentage = Math.min(100, (stats.totalBytes / FREE_TIER_LIMIT_BYTES) * 100);
  
  // 2. Calculate User's Share of the Database
  // Formula: (User Bytes / Total Bytes in DB)
  // Note: Using Total Bytes in DB (stats.totalBytes) for the split denominator
  // ensures the bill is split based on actual consumption vs neighbors.
  const userShareRatio = stats.totalBytes > 0 ? (stats.userBytes / stats.totalBytes) : 0;

  // 3. Calculate Cost
  // We calculate what portion of the $25 bill corresponds to this user's data footprint
  const userCostUSD = PRO_PLAN_COST_USD * userShareRatio;
  const userCostHKD = userCostUSD * USD_TO_HKD_RATE;

  // 4. Formatting
  // Round to nearest 0.1 HKD
  const displayHKD = (Math.round(userCostHKD * 10) / 10).toFixed(1);
  
  const totalUsedMB = (stats.totalBytes / (1024 * 1024)).toFixed(0);
  const userUsedMB = (stats.userBytes / (1024 * 1024)).toFixed(2);
  const aiMB = (stats.details.ai_cache / (1024 * 1024)).toFixed(2);

  // Color logic
  let colorClass = "bg-teal-500"; 
  let textClass = "text-teal-100";
  
  if (totalPercentage >= 80) {
    colorClass = "bg-yellow-500";
    textClass = "text-yellow-100";
  }
  if (totalPercentage >= 95) {
    colorClass = "bg-red-500";
    textClass = "text-red-100";
  }

  return (
    <div 
      className={`flex items-center gap-2 px-2 py-0.5 rounded border border-white/10 ${textClass} bg-black/20 text-[10px] font-mono cursor-help group relative`}
    >
      <Database className="w-3 h-3 opacity-70" />
      
      <div className="flex flex-col w-24">
        <div className="flex justify-between mb-0.5">
           <span>Quota</span>
           <span>{Math.round(totalPercentage)}%</span>
        </div>
        <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} 
                style={{ width: `${totalPercentage}%` }}
            />
        </div>
      </div>

      {/* Tooltip on Hover */}
      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-72 bg-slate-800 text-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-600">
        
        {/* Triangle Pointer */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-l border-slate-600"></div>

        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-600">
             <span className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">Data Footprint</span>
             <span className="font-mono text-xs">{totalUsedMB} / 500 MB Used</span>
        </div>
        
        <div className="space-y-1 text-xs mb-3">
            <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1"><BrainCircuit className="w-3 h-3"/> AI Usage</span>
                <span className="font-mono">{aiMB} MB</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> Notes & History</span>
                <span className="font-mono">{((stats.userBytes - stats.details.ai_cache) / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between items-center font-bold pt-1 text-white border-t border-slate-700/50 mt-1">
                <span>Total User Data</span>
                <span className="font-mono text-teal-300">{userUsedMB} MB</span>
            </div>
        </div>

        <div className="bg-slate-900/80 rounded p-2 border border-slate-700">
            <p className="text-[10px] text-gray-500 mb-1 text-center">Need to pay if we reach 100% usage</p>
            <p className="text-[10px] text-gray-500 mb-1 text-center">Your share of $25 USD Pro Plan</p>
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