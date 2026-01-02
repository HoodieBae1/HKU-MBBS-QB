import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';
import { Trophy, Users, BrainCircuit, X, Loader2, Target, ChevronDown, ChevronUp, BarChart3, Folder, FileText, RefreshCw, DollarSign, Coins, ArrowUpDown, ArrowUp, ArrowDown, Database, AlertCircle, Clock, Wallet, CreditCard, CheckCircle2 } from 'lucide-react';

const AdminDashboard = ({ onClose, questions }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalAnswers: 0, totalAiCalls: 0, totalAiSpentHKD: 0 });
  const [quotaData, setQuotaData] = useState({ totalDbBytes: 0, userBytesMap: {} });
  
  // UI State
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false); 
  const [sortConfig, setSortConfig] = useState({ key: 'lastActive', direction: 'desc' });
  
  // Modal State
  const [aiModalUser, setAiModalUser] = useState(null);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [aiHistoryLogs, setAiHistoryLogs] = useState([]);
  const [dbModalUser, setDbModalUser] = useState(null);

  // --- NEW: MANAGE USER STATE ---
  const [managingUser, setManagingUser] = useState(null); // The user being edited
  const [managingDetails, setManagingDetails] = useState(null); // The fresh profile data
  const [topUpAmount, setTopUpAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const PRO_PLAN_COST_USD = 25;
  const USD_TO_HKD_RATE = 7.8;

  const questionMetaMap = useMemo(() => {
    const map = new Map();
    questions.forEach(q => {
      map.set(String(q.unique_id), {
        topic: q.topic || 'Uncategorized',
        subtopic: q.subtopic || 'General'
      });
    });
    return map;
  }, [questions]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: userStatsRaw, error: statsError } = await supabase.rpc('get_admin_dashboard_stats');
      if (statsError) throw new Error("Could not load dashboard stats.");

      const { data: quotaResult, error: quotaError } = await supabase.rpc('get_all_users_quota_stats');
      const totalDbBytes = quotaResult?.total_db_bytes || 1;
      const userBytesMap = {};
      if (quotaResult?.users) { quotaResult.users.forEach(u => { userBytesMap[u.user_id] = u.total_user_bytes; }); }
      setQuotaData({ totalDbBytes, userBytesMap });

      const processedStats = (userStatsRaw || []).map(u => {
        const accuracy = u.total_max_score > 0 ? Math.round((u.total_score / u.total_max_score) * 100) : 0;
        const userBytes = userBytesMap[u.user_id] || 0;
        const rawDbCostHKD = (userBytes / totalDbBytes) * PRO_PLAN_COST_USD * USD_TO_HKD_RATE;

        return {
            id: u.user_id,
            email: u.email,
            display_name: u.display_name,
            totalAttempted: u.total_attempted,
            totalGraded: u.total_graded,
            accuracy,
            aiUsageCount: u.ai_usage_count,
            aiCostHKD: u.ai_cost_hkd,
            lastActive: u.last_active_at, 
            dbCostHKD: parseFloat(rawDbCostHKD),
            userBytes,
            structuredStats: null 
        };
      });

      setStats(processedStats);
      setSummary({ 
          totalUsers: processedStats.length, 
          totalAnswers: processedStats.reduce((acc, curr) => acc + (curr.totalAttempted || 0), 0), 
          totalAiCalls: processedStats.reduce((acc, curr) => acc + (curr.aiUsageCount || 0), 0), 
          totalAiSpentHKD: processedStats.reduce((acc, curr) => acc + (curr.aiCostHKD || 0), 0) 
      });

    } catch (error) {
      console.error("Dashboard Error:", error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MANAGE USER LOGIC ---
  const handleOpenManageModal = async (user) => {
      setManagingUser(user);
      setManagingDetails(null); // Reset while fetching
      
      // Fetch fresh profile data (tier, wallet, status)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error) setManagingDetails(data);
  };

  const handleUpdateProfile = async (updates) => {
    if (!managingDetails) return;
    setActionLoading(true);
    try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', managingDetails.id);
        if (error) throw error;
        setManagingDetails(prev => ({ ...prev, ...updates }));
        alert("User updated successfully");
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleActivatePlan = async (amount) => {
    const currentBal = managingDetails.ai_credit_balance || 0;
    await handleUpdateProfile({ subscription_status: 'active', ai_credit_balance: currentBal + amount });
  };

  const handleManualTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");
    const currentBal = managingDetails.ai_credit_balance || 0;
    await handleUpdateProfile({ ai_credit_balance: currentBal + amount });
    setTopUpAmount('');
  };

  // ... (Row Toggle & AI History Logic preserved from before) ...
  const handleToggleRow = async (user) => {
    if (expandedUserId === user.id) { setExpandedUserId(null); return; }
    setExpandedUserId(user.id);
    if (user.structuredStats) return; 
    setLoadingDetails(true);
    // ... (fetch logic same as before) ...
    // Shortened for brevity, use existing logic here
    try {
        const { data: userProgress, error } = await supabase
            .from('user_progress')
            .select('score, max_score, question_id')
            .eq('user_id', user.id)
            .not('score', 'is', null);
        if (error) throw error;
        const hierarchy = {}; 
        userProgress.forEach(ans => {
            const meta = questionMetaMap.get(String(ans.question_id)) || { topic: 'Unknown', subtopic: 'Unknown' };
            const { topic, subtopic } = meta;
            if (!hierarchy[topic]) hierarchy[topic] = { score: 0, maxScore: 0, count: 0, subtopics: {} };
            if (!hierarchy[topic].subtopics[subtopic]) hierarchy[topic].subtopics[subtopic] = { score: 0, maxScore: 0, count: 0 };
            hierarchy[topic].count += 1;
            hierarchy[topic].score += ans.score;
            hierarchy[topic].maxScore += ans.max_score;
            hierarchy[topic].subtopics[subtopic].count += 1;
            hierarchy[topic].subtopics[subtopic].score += ans.score;
            hierarchy[topic].subtopics[subtopic].maxScore += ans.max_score;
        });
        const structuredStats = Object.entries(hierarchy).map(([tName, tData]) => {
            const subList = Object.entries(tData.subtopics).map(([sName, sData]) => ({
                name: sName, total: sData.count, accuracy: sData.maxScore > 0 ? Math.round((sData.score / sData.maxScore) * 100) : 0
            })).sort((a, b) => b.accuracy - a.accuracy); 
            return { name: tName, total: tData.count, accuracy: tData.maxScore > 0 ? Math.round((tData.score / tData.maxScore) * 100) : 0, subtopics: subList };
        }).sort((a, b) => b.accuracy - a.accuracy);
        setStats(prev => prev.map(u => u.id === user.id ? { ...u, structuredStats } : u));
    } catch (err) { console.error("Error loading details", err); } finally { setLoadingDetails(false); }
  };

  const handleOpenAiHistory = async (user) => {
      setAiModalUser(user);
      setAiHistoryLoading(true);
      setAiHistoryLogs([]);
      const { data, error } = await supabase.from('ai_usage_logs').select('id, cost, model, created_at, question_id').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error) setAiHistoryLogs(data);
      setAiHistoryLoading(false);
  };

  const sortedStats = useMemo(() => {
    let items = [...stats];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'lastActive') {
            if (!aVal) return 1; if (!bVal) return -1;
            return sortConfig.direction === 'asc' ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
        }
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [stats, sortConfig]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };
  const getScoreColor = (score) => score >= 70 ? 'text-green-700 bg-green-100' : score >= 40 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100';
  const getBarColor = (score) => score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400';

  // --- SUB-COMPONENTS (Modals) ---
  const UserAIHistoryModal = ({ user, logs, isLoading, onClose }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-violet-50 flex justify-between items-center">
                    <div><h3 className="text-lg font-bold text-violet-900">AI Usage History</h3><p className="text-xs text-violet-600">{user.email}</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-violet-200 rounded-full text-violet-700"><X className="w-5 h-5"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-0 relative">
                    {isLoading ? <div className="absolute inset-0 flex items-center justify-center bg-white/80"><Loader2 className="animate-spin text-violet-600"/></div> : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-200"><tr><th className="px-6 py-3">Time</th><th className="px-6 py-3">Question</th><th className="px-6 py-3">Model</th><th className="px-6 py-3 text-right">Cost (Real USD)</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50"><td className="px-6 py-3 text-gray-500 font-mono text-xs">{formatDate(log.created_at)}</td><td className="px-6 py-3 font-bold text-gray-700">{log.question_id}</td><td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 border rounded text-xs">{log.model || 'Unknown'}</span></td><td className="px-6 py-3 text-right font-mono text-gray-900">${(log.cost || 0).toFixed(4)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-right"><span className="text-xs font-bold text-violet-600 mr-2">TOTAL REAL COST:</span><span className="text-lg font-mono font-bold text-violet-900">${user.aiCostHKD.toFixed(4)} HKD</span></div>
            </div>
        </div>
    );
  };

  const UserDBStatsModal = ({ user, onClose }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-start mb-4"><div><h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2"><Database className="w-5 h-5"/> Database Usage</h3><p className="text-xs text-gray-500">{user.email}</p></div><button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400"/></button></div>
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="flex justify-between text-sm text-emerald-800 mb-1"><span>User Storage</span><span className="font-mono font-bold">{(user.userBytes / 1024).toFixed(2)} KB</span></div>
                        <div className="flex justify-between text-sm text-emerald-600 mb-2"><span>Total DB</span><span className="font-mono">{(quotaData.totalDbBytes / 1024 / 1024).toFixed(2)} MB</span></div>
                        <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden"><div className="bg-emerald-600 h-full" style={{width: `${Math.max((user.userBytes / quotaData.totalDbBytes) * 100, 1)}%`}}></div></div>
                    </div>
                    <div className="flex justify-between items-center py-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 -mb-6 rounded-b-xl"><span className="text-sm font-bold text-gray-700">Estimated Cost</span><div className="text-right"><span className="block text-2xl font-mono font-bold text-emerald-600">${user.dbCostHKD.toFixed(2)}</span><span className="text-[10px] text-gray-400 uppercase">HKD / Month</span></div></div>
                </div>
            </div>
        </div>
    );
  };

  // --- NEW: MANAGE MODAL COMPONENT ---
  const ManageUserModal = () => {
      if (!managingUser) return null;
      return (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="bg-slate-50 border-b border-gray-200 p-6 flex justify-between items-start">
                    <div><h2 className="text-xl font-bold text-slate-800">{managingUser.display_name}</h2><p className="text-sm text-gray-500 font-mono">{managingUser.email}</p></div>
                    <button onClick={() => setManagingUser(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                <div className="p-6 space-y-6">
                    {!managingDetails ? <div className="flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500"/></div> : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Tier</p><p className="font-bold text-slate-700 capitalize">{managingDetails.subscription_tier.replace('_', ' ')}</p></div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p><p className={`font-bold capitalize ${managingDetails.subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'}`}>{managingDetails.subscription_status}</p></div>
                            </div>
                            {managingDetails.subscription_tier === 'standard' && (
                                <>
                                    <hr className="border-gray-100" />
                                    <div><h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Activate / Upgrade</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button disabled={actionLoading} onClick={() => handleActivatePlan(100)} className="p-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition-colors group"><span className="block text-xs font-bold text-emerald-600 uppercase">Early Bird</span><span className="block text-lg font-bold text-emerald-900">$599 HKD</span></button>
                                            <button disabled={actionLoading} onClick={() => handleActivatePlan(100)} className="p-3 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors group"><span className="block text-xs font-bold text-blue-600 uppercase">Standard</span><span className="block text-lg font-bold text-blue-900">$899 HKD</span></button>
                                        </div>
                                    </div>
                                    <hr className="border-gray-100" />
                                    <div><h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4"/> Manual Top Up</h3>
                                        <div className="flex gap-2"><input type="number" placeholder="Amount" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                                        <button disabled={!topUpAmount || actionLoading} onClick={handleManualTopUp} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-50">Add</button></div>
                                        <p className="text-[10px] text-gray-400 mt-2">Current Balance: ${managingDetails.ai_credit_balance?.toFixed(2)}</p>
                                    </div>
                                </>
                            )}
                            {managingDetails.subscription_tier === 'legacy_friend' && <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-800 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 shrink-0" /><div><strong>Legacy Account</strong><p className="text-xs mt-1 opacity-80">Unlimited access. No wallet required.</p></div></div>}
                        </>
                    )}
                </div>
            </div>
        </div>
      );
  };

  if (loading) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90"><Loader2 className="animate-spin w-8 h-8 text-indigo-600"/></div>;
  if (errorMsg) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90"><div className="bg-red-50 p-6 rounded-lg text-red-800 text-center max-w-md border border-red-200 shadow-xl"><AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500"/><h2 className="text-lg font-bold mb-2">Dashboard Error</h2><p className="text-sm mb-4">{errorMsg}</p><button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Close</button></div></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      <UserAIHistoryModal user={aiModalUser} logs={aiHistoryLogs} isLoading={aiHistoryLoading} onClose={() => setAiModalUser(null)} />
      <UserDBStatsModal user={dbModalUser} onClose={() => setDbModalUser(null)} />
      <ManageUserModal />

      <div className="bg-indigo-900 text-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3"><div className="p-2 bg-indigo-800 rounded-lg"><Trophy className="w-6 h-6 text-yellow-400" /></div><div><h1 className="text-xl font-bold">Admin Dashboard</h1><p className="text-xs text-indigo-300">Performance, Quota & Billing</p></div></div>
        <div className="flex items-center gap-2"><button onClick={fetchDashboardData} className="p-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 hover:text-white rounded-full transition-colors"><RefreshCw className="w-5 h-5" /></button><button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors"><X className="w-6 h-6" /></button></div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center"><div className="flex items-center gap-2 text-gray-500 mb-1"><Users className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total Users</span></div><p className="text-3xl font-bold text-gray-800">{summary.totalUsers}</p></div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center"><div className="flex items-center gap-2 text-gray-500 mb-1"><Target className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total Attempts</span></div><p className="text-3xl font-bold text-teal-600">{summary.totalAnswers}</p></div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center"><div className="flex items-center gap-2 text-gray-500 mb-1"><BrainCircuit className="w-4 h-4" /><span className="text-xs font-bold uppercase">AI Consultations</span></div><p className="text-3xl font-bold text-violet-600">{summary.totalAiCalls}</p></div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center"><div className="flex items-center gap-2 text-gray-500 mb-1"><Coins className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total AI Spent (HKD)</span></div><p className="text-3xl font-bold text-emerald-600">${summary.totalAiSpentHKD.toFixed(2)}</p></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">User Performance & Costs</h2>
            <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Sort by:</span><span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">{sortConfig.key} {sortConfig.direction}</span></div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100 cursor-pointer select-none">
                <th className="px-6 py-3 w-16 cursor-default">Rank</th>
                <th className="px-6 py-3 hover:bg-gray-100" onClick={() => requestSort('display_name')}><div className="flex items-center gap-1">User {getSortIcon('display_name')}</div></th>
                <th className="px-6 py-3 text-center hover:bg-gray-100" onClick={() => requestSort('lastActive')}><div className="flex items-center justify-center gap-1">Last Active {getSortIcon('lastActive')}</div></th>
                <th className="px-6 py-3 text-center hover:bg-gray-100" onClick={() => requestSort('totalAttempted')}><div className="flex items-center justify-center gap-1">Attempted {getSortIcon('totalAttempted')}</div></th>
                <th className="px-6 py-3 text-center hover:bg-gray-100" onClick={() => requestSort('accuracy')}><div className="flex items-center justify-center gap-1">Accuracy {getSortIcon('accuracy')}</div></th>
                <th className="px-6 py-3 text-center hover:bg-gray-100 text-violet-600" onClick={() => requestSort('aiUsageCount')}><div className="flex items-center justify-center gap-1">AI Calls {getSortIcon('aiUsageCount')}</div></th>
                <th className="px-6 py-3 text-right hover:bg-gray-100 text-violet-700" onClick={() => requestSort('aiCostHKD')}><div className="flex items-center justify-end gap-1">AI (HKD) {getSortIcon('aiCostHKD')}</div></th>
                <th className="px-6 py-3 text-right hover:bg-gray-100 text-emerald-600" onClick={() => requestSort('dbCostHKD')}><div className="flex items-center justify-end gap-1">DB (HKD) {getSortIcon('dbCostHKD')}</div></th>
                <th className="px-6 py-3 text-right cursor-default">Action</th>
                <th className="px-6 py-3 text-right cursor-default">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-5">
              {sortedStats.map((user, index) => {
                const isExpanded = expandedUserId === user.id;
                return (
                  <React.Fragment key={user.id}>
                    <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{index + 1}</div></td>
                      <td className="px-6 py-4"><div className="font-bold text-gray-900 text-sm">{user.display_name || <span className="text-gray-400 italic">No Name</span>}</div><div className="text-xs text-gray-500">{user.email}</div></td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatTimeAgo(user.lastActive)}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center"><span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">{user.totalAttempted}</span></td>
                      
                      <td className="px-6 py-4 text-center cursor-pointer hover:bg-indigo-100/50 rounded-lg" onClick={() => handleToggleRow(user)}>
                        <div className="flex items-center justify-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${getBarColor(user.accuracy)}`} style={{width: `${user.accuracy}%`}}></div></div><span className="text-sm font-bold text-gray-700">{user.accuracy}%</span></div>
                      </td>

                      <td className="px-6 py-4 text-center cursor-pointer hover:bg-violet-100/50 rounded-lg" onClick={() => handleOpenAiHistory(user)}>
                        <span className="font-mono font-bold text-violet-600 border-b border-dashed border-violet-300">{user.aiUsageCount}</span>
                      </td>
                      
                      <td className="px-6 py-4 text-right cursor-pointer hover:bg-violet-100/50 rounded-lg" onClick={() => handleOpenAiHistory(user)}>
                        <span className="font-mono font-bold text-violet-700 border-b border-dashed border-violet-300">${user.aiCostHKD.toFixed(2)}</span>
                      </td>

                      <td className="px-6 py-4 text-right cursor-pointer hover:bg-emerald-100/50 rounded-lg" onClick={() => setDbModalUser(user)}>
                         <div className="flex items-center justify-end gap-1 font-mono font-bold text-emerald-600 bg-emerald-50 py-1 px-2 rounded inline-block ml-auto border border-transparent hover:border-emerald-200"><DollarSign className="w-3 h-3" />{user.dbCostHKD.toFixed(1)}</div>
                      </td>

                      {/* --- NEW ACTION BUTTON --- */}
                      <td className="px-6 py-4 text-right">
                          <button onClick={() => handleOpenManageModal(user)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100">Manage</button>
                      </td>

                      <td className="px-6 py-4 text-right"><button onClick={() => handleToggleRow(user)} className="text-gray-400 hover:text-indigo-600 transition-colors">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</button></td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-indigo-50/30 animate-in fade-in duration-200">
                        <td colSpan="10" className="px-6 py-6">
                          <div className="bg-white rounded-lg border border-indigo-100 p-6 shadow-sm min-h-[100px]">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100"><BarChart3 className="w-4 h-4 text-indigo-500" /><h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Detailed Breakdown (Graded Only)</h3></div>
                            {loadingDetails ? <div className="flex items-center justify-center h-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div> : !user.structuredStats || user.structuredStats.length === 0 ? <p className="text-gray-400 text-sm italic">No graded data.</p> : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.structuredStats.map((topic, i) => (
                                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
                                    <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center"><div className="flex items-center gap-2"><Folder className="w-4 h-4 text-indigo-400" /><span className="font-bold text-gray-800 text-sm">{topic.name}</span></div><div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(topic.accuracy)}`}>{topic.accuracy}%</div></div>
                                    <div className="w-full h-1 bg-gray-100"><div className={`h-full ${getBarColor(topic.accuracy)}`} style={{width: `${topic.accuracy}%`}}></div></div>
                                    <div className="p-3 space-y-2">{topic.subtopics.map((sub, j) => (<div key={j} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2 text-gray-600 truncate"><FileText className="w-3 h-3 text-gray-300" /><span title={sub.name} className="truncate max-w-[150px]">{sub.name}</span></div><div className="flex items-center gap-3"><span className="text-gray-400">{sub.total} q's</span><span className={`font-mono font-bold w-8 text-right ${sub.accuracy >= 70 ? 'text-green-600' : sub.accuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>{sub.accuracy}%</span></div></div>))}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;