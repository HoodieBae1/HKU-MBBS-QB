import React, { useMemo } from 'react';
import { Flame, Target, CalendarDays, CheckCircle2, TrendingUp } from 'lucide-react';

const DailyStatsDisplay = ({ userProgress }) => {
  
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString();
    
    // 1. Extract unique dates and calculate today's stats
    const uniqueDates = new Set();
    let todayCorrect = 0;
    let todayTotal = 0;

    Object.values(userProgress).forEach(p => {
      if (!p.created_at) return;
      
      const date = new Date(p.created_at);
      const dateStr = date.toLocaleDateString();
      uniqueDates.add(dateStr);

      if (dateStr === todayStr) {
        todayTotal++;
        // Check for correctness (MCQ or Graded SAQ)
        if ((p.score !== null && p.score === p.max_score) || (p.score === 1 && p.max_score === 1)) {
            todayCorrect++;
        }
      }
    });

    const todayAccuracy = todayTotal > 0 ? Math.round((todayCorrect / todayTotal) * 100) : 0;

    // 2. Calculate Streak
    let streak = 0;
    let checkDate = new Date();
    
    const yest = new Date(); 
    yest.setDate(yest.getDate() - 1);
    
    const hasToday = uniqueDates.has(todayStr);
    const hasYesterday = uniqueDates.has(yest.toLocaleDateString());

    if (!hasToday && !hasYesterday) {
        streak = 0;
    } else {
        if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);

        while (true) {
            if (uniqueDates.has(checkDate.toLocaleDateString())) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1); 
            } else {
                break;
            }
        }
    }

    return { streak, todayTotal, todayAccuracy };
  }, [userProgress]);

  return (
    <div className="relative group mr-2">
      {/* --- Main Badge (Teal Theme) --- */}
      <div className="flex items-center gap-2 px-3 py-1 bg-teal-800/60 hover:bg-teal-800 rounded-full border border-teal-600/50 hover:border-teal-400 shadow-inner cursor-help transition-all duration-200">
        
        {/* Streak Section */}
        <div className={`flex items-center gap-1.5 ${stats.streak > 0 ? 'text-orange-300' : 'text-teal-400/60'}`}>
            <Flame className={`w-3.5 h-3.5 ${stats.streak > 0 ? 'fill-orange-400 text-orange-500 animate-pulse' : ''}`} />
            <span className="text-xs font-bold font-mono pt-0.5">{stats.streak}</span>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-3 bg-teal-600/50 mx-0.5"></div>

        {/* Today's Count */}
        <div className="flex items-center gap-1.5 text-teal-100">
            <Target className="w-3.5 h-3.5 text-teal-300" />
            <span className="text-xs font-bold font-mono pt-0.5">{stats.todayTotal}</span>
        </div>
      </div>

      {/* --- Tooltip Dropdown --- */}
      <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-200 p-3 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50 origin-top-right">
         {/* Triangle Arrow */}
         <div className="absolute -top-1 right-6 w-2 h-2 bg-white rotate-45 border-t border-l border-gray-200"></div>
         
         <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Daily Activity
         </h4>

         <div className="space-y-2">
            {/* Streak Row */}
            <div className={`flex justify-between items-center p-2 rounded-lg border ${stats.streak > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`flex items-center gap-2 ${stats.streak > 0 ? 'text-orange-700' : 'text-slate-400'}`}>
                    <Flame className={`w-4 h-4 ${stats.streak > 0 ? 'fill-orange-400' : ''}`} />
                    <span className="text-xs font-bold">Current Streak</span>
                </div>
                <span className={`text-lg font-bold font-mono ${stats.streak > 0 ? 'text-orange-800' : 'text-slate-400'}`}>
                    {stats.streak} <span className={`text-[10px] font-sans font-normal ${stats.streak > 0 ? 'text-orange-600' : 'text-slate-400'}`}>days</span>
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-teal-50 p-2 rounded-lg border border-teal-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-teal-600 font-bold uppercase mb-1">Completed</span>
                    <span className="text-lg font-bold text-teal-900 font-mono leading-none">{stats.todayTotal}</span>
                </div>
                <div className="bg-teal-50 p-2 rounded-lg border border-teal-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-teal-600 font-bold uppercase mb-1">Accuracy</span>
                    <div className="flex items-center gap-1">
                        <span className={`text-lg font-bold font-mono leading-none ${stats.todayAccuracy >= 70 ? 'text-emerald-600' : stats.todayAccuracy >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {stats.todayAccuracy}%
                        </span>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DailyStatsDisplay;