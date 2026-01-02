import React, { useState, useEffect } from 'react';
import { Coins, Info, Loader2, X, History, Wallet, FileText, Sparkles, Calendar } from 'lucide-react';
import { supabase } from './supabase';

const AIUsageDisplay = ({ session, userProfile }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalCost: 0, count: 0, byModel: {} });
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isStandard = userProfile?.subscription_tier === 'standard';
  const creditBalance = userProfile?.ai_credit_balance || 0;
  
  // Standard users see 20x prices. Legacy see 1x (Real) prices.
  const multiplier = isStandard ? 20 : 1;

  useEffect(() => {
    if (!session) return;
    fetchData();
    
    const channel = supabase.channel('ai_cost_updates').on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'ai_usage_logs', filter: `user_id=eq.${session.user.id}` 
    }, (payload) => {
        handleNewLog(payload.new);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    setLogs(data);
    calculateStats(data);
    setLoading(false);
  };

  const handleNewLog = (newLog) => {
    setLogs(prev => {
        const updated = [newLog, ...prev];
        calculateStats(updated);
        return updated;
    });
  };

  const calculateStats = (data) => {
    const totalCost = data.reduce((acc, curr) => acc + (curr.cost || 0), 0);
    const count = data.length;
    
    const byModel = data.reduce((acc, curr) => {
      const modelName = curr.model || 'Unknown';
      acc[modelName] = (acc[modelName] || 0) + 1;
      return acc;
    }, {});

    setStats({ totalCost, count, byModel });
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return null;

  // ==========================================
  // 1. STANDARD USER VIEW (Wallet + Credits)
  // ==========================================
  if (isStandard) {
      // Calculate Total Spent in Credits (Real * 20)
      const totalSpentCredits = stats.totalCost * multiplier;

      return (
        <>
          <div className="relative z-50">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all cursor-pointer group ${creditBalance <= 0 ? 'bg-red-900/40 border-red-500/50 hover:bg-red-800' : 'bg-indigo-900/40 border-indigo-400/30 hover:bg-indigo-800/80'}`}
            >
              <Wallet className={`w-4 h-4 ${creditBalance <= 0 ? 'text-red-400' : 'text-green-300'}`} />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider opacity-80">Wallet</span>
                <span className={`text-xs font-mono font-bold ${creditBalance <= 0 ? 'text-red-200' : 'text-white'}`}>
                  ${Number(creditBalance).toFixed(2)}
                </span>
              </div>
            </button>
          </div>

          {/* Wallet History Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2"><Wallet className="w-5 h-5 text-green-600"/> Wallet History</h2>
                        <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500 hover:text-gray-800" /></button>
                    </div>
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <div><p className="text-xs font-bold text-blue-600 uppercase">Current Balance</p><p className="text-2xl font-mono font-bold text-blue-900">${Number(creditBalance).toFixed(2)}</p></div>
                        <div className="text-right"><p className="text-xs font-bold text-gray-500 uppercase">Total Spent</p><p className="text-lg font-mono text-gray-700">${totalSpentCredits.toFixed(2)}</p></div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0"><tr><th className="px-6 py-3">Time</th><th className="px-6 py-3">Action</th><th className="px-6 py-3 text-right">Amount</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log, index) => {
                                    // LOGIC: The last 2 items in the array are the First 2 items chronologically
                                    // This assumes we fetched all logs.
                                    const isOldestTwo = index >= logs.length - 2;
                                    
                                    return (
                                      <tr key={log.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-3 font-mono text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                          <td className="px-6 py-3"><div className="flex flex-col"><span className="font-bold text-gray-700">AI Consultation</span><span className="text-[10px] text-gray-400">{log.model}</span></div></td>
                                          <td className="px-6 py-3 text-right font-mono">
                                              {isOldestTwo ? (
                                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                                      Free Trial
                                                  </span>
                                              ) : (
                                                  <span className="text-red-600">
                                                      -${(log.cost * multiplier).toFixed(2)}
                                                  </span>
                                              )}
                                          </td>
                                      </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
        </>
      );
  }

  // ==========================================
  // 2. LEGACY USER VIEW (Original Logic)
  // ==========================================
  return (
    <>
      <div className="relative z-50">
        <button 
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="flex items-center gap-2 px-3 py-1 bg-indigo-900/40 hover:bg-indigo-800/80 hover:border-indigo-400 border border-indigo-400/30 rounded-full transition-all cursor-pointer group"
        >
          <Coins className="w-4 h-4 text-yellow-300 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider group-hover:text-white">AI Cost</span>
            <span className="text-xs font-mono text-white font-bold">${stats.totalCost.toFixed(5)}</span>
          </div>
        </button>

        {/* Original Tooltip */}
        <div className={`absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 transition-all duration-200 origin-top-right z-50 ${showTooltip && !isModalOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Info className="w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">AI Usage Costs</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">Click to view detailed history. You pay per click based on the model complexity. Cached answers are <strong>Free</strong>.</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-100">
            <div className="flex justify-between text-xs font-medium text-gray-600 border-b border-gray-200 pb-1"><span>Model Used</span><span>Calls</span></div>
            {Object.entries(stats.byModel).map(([model, count]) => (
              <div key={model} className="flex justify-between text-xs text-gray-500"><span className="truncate max-w-[150px]">{model}</span><span className="font-mono">{count}</span></div>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-indigo-700"><span>Total Estimated Cost</span><span>${stats.totalCost.toFixed(5)}</span></div>
          </div>
        </div>
      </div>

      {/* Original Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><History className="w-5 h-5 text-indigo-600" /></div>
                        <div><h2 className="text-lg font-bold text-gray-800">AI Usage History</h2><p className="text-xs text-gray-500">Breakdown of all your interactions with the AI Professor.</p></div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-white border-b border-gray-100">
                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100"><p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Spent</p><p className="text-2xl font-mono font-bold text-indigo-900">${stats.totalCost.toFixed(5)}</p></div>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-100"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Interactions</p><p className="text-2xl font-mono font-bold text-slate-700">{stats.count}</p></div>
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100"><p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Free (Cached) Hits</p><p className="text-2xl font-mono font-bold text-emerald-700">{logs.filter(l => l.cost === 0).length}</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold"><div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Time</div></th>
                                <th className="px-6 py-3 font-semibold"><div className="flex items-center gap-1"><FileText className="w-3 h-3"/> Question ID</div></th>
                                <th className="px-6 py-3 font-semibold"><div className="flex items-center gap-1"><Sparkles className="w-3 h-3"/> Model</div></th>
                                <th className="px-6 py-3 font-semibold text-right"><div className="flex items-center justify-end gap-1"><Coins className="w-3 h-3"/> Cost</div></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{formatDate(log.created_at)}</td>
                                    <td className="px-6 py-3 font-bold text-indigo-600">{log.question_id}</td>
                                    <td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 text-xs font-medium">{log.model}</span></td>
                                    <td className="px-6 py-3 text-right">
                                        {log.cost === 0 ? <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">Free</span> 
                                        : <span className="font-mono font-medium text-gray-900">${Number(log.cost).toFixed(5)}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-right"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Close</button></div>
            </div>
        </div>
      )}
    </>
  );
};

export default AIUsageDisplay;