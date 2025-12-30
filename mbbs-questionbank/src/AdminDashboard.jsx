import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';
import { Trophy, Users, BrainCircuit, X, Loader2, Target, ChevronDown, ChevronUp, BarChart3, Folder, FileText, RefreshCw, DollarSign, Coins, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const AdminDashboard = ({ onClose, questions }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalAnswers: 0, totalAiCalls: 0, totalAiSpentHKD: 0 });
  const [quotaData, setQuotaData] = useState({ totalDbBytes: 0, userBytesMap: {} });
  const [expandedUserId, setExpandedUserId] = useState(null);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'accuracy', direction: 'desc' });

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
  }, [questionMetaMap]);

  // --- SORTING LOGIC ---
  const sortedStats = useMemo(() => {
    let sortableItems = [...stats];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle text sorting (case insensitive)
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [stats, sortConfig]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (sortConfig.key !== name) return <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600" /> 
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
  };
  // ---------------------

  const fetchAllRows = async (table, selectQuery) => {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
        .select(selectQuery)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) hasMore = false;
        else page++;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [profiles, rawProgress, aiLogs, quotaResult] = await Promise.all([
        fetchAllRows('profiles', 'id, email, display_name'),
        fetchAllRows('user_progress', 'user_id, score, max_score, question_id, selected_option, user_response'),
        fetchAllRows('ai_usage_logs', 'user_id, cost'),
        supabase.rpc('get_all_users_quota_stats') 
      ]);

      const totalDbBytes = quotaResult.data?.total_db_bytes || 1; // Avoid divide by zero
      const userBytesMap = {};
      if (quotaResult.data?.users) {
        quotaResult.data.users.forEach(u => {
            userBytesMap[u.user_id] = u.total_user_bytes;
        });
      }
      setQuotaData({ totalDbBytes, userBytesMap });

      // Valid Progress for Graded stats
      const validProgress = rawProgress.filter(p => 
        p.score !== null || 
        p.selected_option !== null || 
        (p.user_response && p.user_response.length > 0)
      );

      const userStats = profiles.map(user => {
        // 1. Attempts
        const allUserEntries = rawProgress.filter(p => p.user_id === user.id);
        const totalAttempted = allUserEntries.length;

        // 2. Accuracy
        const userGradedAnswers = validProgress.filter(p => p.user_id === user.id);
        
        let totalGradedQuestions = 0;
        let sumScore = 0;
        let sumMaxScore = 0;
        
        userGradedAnswers.forEach(a => {
            if (a.score === null || a.max_score === null || a.max_score === 0) return;
            sumScore += a.score;
            sumMaxScore += a.max_score;
            totalGradedQuestions++;
        });

        const accuracy = sumMaxScore > 0 ? Math.round((sumScore / sumMaxScore) * 100) : 0;

        // 3. AI Stats (Values in DB are already HKD)
        const userAiCalls = aiLogs.filter(l => l.user_id === user.id);
        const aiCostHKD = userAiCalls.reduce((sum, log) => sum + (log.cost || 0), 0);

        // 4. DB Stats (Convert Bytes Share to HKD from USD Plan)
        const userBytes = userBytesMap[user.id] || 0;
        const rawDbCostHKD = (userBytes / totalDbBytes) * PRO_PLAN_COST_USD * USD_TO_HKD_RATE;
        const dbCostHKD = parseFloat(rawDbCostHKD);

        // 5. Hierarchy Breakdown
        const hierarchy = {}; 
        userGradedAnswers.forEach(ans => {
          const meta = questionMetaMap.get(String(ans.question_id)) || { topic: 'Unknown', subtopic: 'Unknown' };
          const { topic, subtopic } = meta;

          if (ans.score === null || ans.max_score === null || ans.max_score === 0) return;

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
            name: sName,
            total: sData.count,
            accuracy: sData.maxScore > 0 ? Math.round((sData.score / sData.maxScore) * 100) : 0
          })).sort((a, b) => b.accuracy - a.accuracy); 

          return {
            name: tName,
            total: tData.count,
            accuracy: tData.maxScore > 0 ? Math.round((tData.score / tData.maxScore) * 100) : 0,
            subtopics: subList
          };
        }).sort((a, b) => b.accuracy - a.accuracy); 

        return {
          id: user.id,
          email: user.email,
          display_name: user.display_name || '', // Ensure string for sorting
          totalAttempted, 
          totalGraded: totalGradedQuestions,
          accuracy,
          aiUsageCount: userAiCalls.length,
          aiCostHKD, // Direct HKD from DB
          dbCostHKD, // Calculated HKD
          structuredStats
        };
      });

      setStats(userStats);
      
      // Totals (Summing direct HKD values)
      const totalAiSpentHKD = aiLogs.reduce((acc, log) => acc + (log.cost || 0), 0);

      setSummary({ 
          totalUsers: profiles.length, 
          totalAnswers: rawProgress.length, 
          totalAiCalls: aiLogs.length,
          totalAiSpentHKD
      });

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (userId) => setExpandedUserId(expandedUserId === userId ? null : userId);

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-700 bg-green-100 border-green-200';
    if (score >= 40) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  const getBarColor = (score) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  if (loading) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90"><Loader2 className="animate-spin w-8 h-8 text-indigo-600"/></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-800 rounded-lg"><Trophy className="w-6 h-6 text-yellow-400" /></div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-indigo-300">Performance & Quota Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={fetchDashboardData} 
                className="p-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 hover:text-white rounded-full transition-colors"
                title="Refresh Data"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><Users className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total Users</span></div>
             <p className="text-3xl font-bold text-gray-800">{summary.totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><Target className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total Attempts</span></div>
             <p className="text-3xl font-bold text-teal-600">{summary.totalAnswers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><BrainCircuit className="w-4 h-4" /><span className="text-xs font-bold uppercase">AI Consultations</span></div>
             <p className="text-3xl font-bold text-violet-600">{summary.totalAiCalls}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><Coins className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total AI Spendings (HKD)</span></div>
             <p className="text-3xl font-bold text-emerald-600">${summary.totalAiSpentHKD.toFixed(2)}</p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">User Performance & Costs</h2>
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort by:</span>
                <span className="text-xs font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">
                    {sortConfig.key === 'display_name' ? 'Name' : 
                     sortConfig.key === 'totalAttempted' ? 'Attempts' :
                     sortConfig.key === 'totalGraded' ? 'Graded' :
                     sortConfig.key === 'accuracy' ? 'Accuracy' :
                     sortConfig.key === 'aiUsageCount' ? 'AI Usage' :
                     sortConfig.key === 'aiCostHKD' ? 'AI Cost' :
                     sortConfig.key === 'dbCostHKD' ? 'DB Cost' : ''} 
                    {sortConfig.direction === 'asc' ? ' (Asc)' : ' (Desc)'}
                </span>
            </div>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100 cursor-pointer select-none">
                <th className="px-6 py-3 w-16 cursor-default">Rank</th>
                
                <th className="px-6 py-3 hover:bg-gray-100 transition-colors" onClick={() => requestSort('display_name')}>
                    <div className="flex items-center gap-1">User {getSortIcon('display_name')}</div>
                </th>
                
                <th className="px-6 py-3 text-center hover:bg-gray-100 transition-colors" onClick={() => requestSort('totalAttempted')}>
                    <div className="flex items-center justify-center gap-1">Attempted {getSortIcon('totalAttempted')}</div>
                </th>
                
                <th className="px-6 py-3 text-center hover:bg-gray-100 transition-colors" onClick={() => requestSort('totalGraded')}>
                    <div className="flex items-center justify-center gap-1">Graded {getSortIcon('totalGraded')}</div>
                </th>
                
                <th className="px-6 py-3 text-center hover:bg-gray-100 transition-colors" onClick={() => requestSort('accuracy')}>
                    <div className="flex items-center justify-center gap-1">Accuracy {getSortIcon('accuracy')}</div>
                </th>
                
                <th className="px-6 py-3 text-center text-violet-600 hover:bg-gray-100 transition-colors" onClick={() => requestSort('aiUsageCount')}>
                    <div className="flex items-center justify-center gap-1">AI Calls {getSortIcon('aiUsageCount')}</div>
                </th>
                
                <th className="px-6 py-3 text-right text-violet-700 hover:bg-gray-100 transition-colors" onClick={() => requestSort('aiCostHKD')}>
                    <div className="flex items-center justify-end gap-1">AI (HKD) {getSortIcon('aiCostHKD')}</div>
                </th>
                
                <th className="px-6 py-3 text-right text-emerald-600 hover:bg-gray-100 transition-colors" onClick={() => requestSort('dbCostHKD')}>
                    <div className="flex items-center justify-end gap-1">DB (HKD) {getSortIcon('dbCostHKD')}</div>
                </th>
                
                <th className="px-6 py-3 text-right cursor-default">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedStats.map((user, index) => {
                const isExpanded = expandedUserId === user.id;
                
                return (
                  <React.Fragment key={user.id}>
                    {/* User Row */}
                    <tr onClick={() => toggleRow(user.id)} className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400 bg-gray-100'}`}>{index + 1}</div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-sm">
                            {user.display_name || <span className="text-gray-400 italic">No Name Set</span>}
                        </div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold">{user.totalAttempted}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">{user.totalGraded}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${getBarColor(user.accuracy)}`} style={{width: `${user.accuracy}%`}}></div>
                           </div>
                           <span className="text-sm font-bold text-gray-700">{user.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center"><span className="font-mono font-bold text-violet-600">{user.aiUsageCount}</span></td>
                      
                      {/* AI COST (HKD) */}
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-bold text-violet-700">
                           ${user.aiCostHKD.toFixed(2)}
                        </span>
                      </td>

                      {/* DB COST (HKD) */}
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-1 font-mono font-bold text-emerald-600 bg-emerald-50 py-1 px-2 rounded inline-block ml-auto">
                            <DollarSign className="w-3 h-3" />
                            {user.dbCostHKD.toFixed(1)}
                         </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                          {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 animate-in fade-in duration-200">
                        <td colSpan="9" className="px-6 py-6">
                          <div className="bg-white rounded-lg border border-indigo-100 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                              <BarChart3 className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Detailed Breakdown (Graded Only)</h3>
                            </div>

                            {user.structuredStats.length === 0 ? (
                              <p className="text-gray-400 text-sm italic">No graded data available yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.structuredStats.map((topic, i) => (
                                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
                                    
                                    <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-indigo-400" />
                                        <span className="font-bold text-gray-800 text-sm">{topic.name}</span>
                                      </div>
                                      <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(topic.accuracy)}`}>
                                        {topic.accuracy}%
                                      </div>
                                    </div>
                                    
                                    <div className="w-full h-1 bg-gray-100">
                                       <div className={`h-full ${getBarColor(topic.accuracy)}`} style={{width: `${topic.accuracy}%`}}></div>
                                    </div>

                                    <div className="p-3 space-y-2">
                                      {topic.subtopics.map((sub, j) => (
                                        <div key={j} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2 text-gray-600 truncate">
                                            <FileText className="w-3 h-3 text-gray-300" />
                                            <span title={sub.name} className="truncate max-w-[150px]">{sub.name}</span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-gray-400">{sub.total} q's</span>
                                            <span className={`font-mono font-bold w-8 text-right ${sub.accuracy >= 70 ? 'text-green-600' : sub.accuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                                              {sub.accuracy}%
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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