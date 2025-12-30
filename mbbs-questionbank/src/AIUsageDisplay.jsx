import React, { useState, useEffect } from 'react';
import { Coins, Info, Loader2 } from 'lucide-react';
import { supabase } from './supabase';

const AIUsageDisplay = ({ session }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchStats();
    
    // Subscribe to new logs to update cost in real-time
    const channel = supabase
      .channel('ai_cost_updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'ai_usage_logs',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('cost, model')
      .eq('user_id', session.user.id);

    if (error) {
      console.error(error);
      return;
    }

    const totalCost = data.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const count = data.length;
    
    // Group by model for tooltip
    const byModel = data.reduce((acc, curr) => {
      acc[curr.model] = (acc[curr.model] || 0) + 1;
      return acc;
    }, {});

    setStats({ totalCost, count, byModel });
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="relative z-50">
      <button 
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-400/30 rounded-full transition-colors cursor-help"
      >
        <Coins className="w-4 h-4 text-yellow-300" />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">AI Cost</span>
          <span className="text-xs font-mono text-white font-bold">${stats.totalCost.toFixed(4)}</span>
        </div>
      </button>

      {/* Tooltip */}
      <div className={`absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 transition-all duration-200 origin-top-right ${showTooltip ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">AI Usage Costs</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Unlike your database quota which is a flat limit, AI features are <strong>charged per click</strong> based on the complexity of the model used.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
          <div className="flex justify-between text-xs font-medium text-gray-600 border-b border-gray-200 pb-1">
            <span>Model Used</span>
            <span>Calls</span>
          </div>
          {Object.entries(stats.byModel).map(([model, count]) => (
            <div key={model} className="flex justify-between text-xs text-gray-500">
              <span className="truncate max-w-[150px]">{model}</span>
              <span className="font-mono">{count}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-indigo-700">
            <span>Total Estimated Cost</span>
            <span>${stats.totalCost.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIUsageDisplay;