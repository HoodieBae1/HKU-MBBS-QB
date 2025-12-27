import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';
import { Trophy, Users, BrainCircuit, X, Loader2, Target, ChevronDown, ChevronUp, BarChart3, Folder, FileText } from 'lucide-react';

const AdminDashboard = ({ onClose, questions }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalAnswers: 0, totalAiCalls: 0 });
  const [expandedUserId, setExpandedUserId] = useState(null);

  // 1. Create a fast Lookup Map: unique_id -> { topic, subtopic }
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Data
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email');
      if (pErr) throw pErr;
      const { data: progress, error: prErr } = await supabase.from('user_progress').select('user_id, score, question_id');
      if (prErr) throw prErr;
      const { data: aiLogs, error: aiErr } = await supabase.from('ai_usage_logs').select('user_id');
      if (aiErr) throw aiErr;

      // Process Data per User
      const userStats = profiles.map(user => {
        const userAnswers = progress.filter(p => p.user_id === user.id);
        const userAiCalls = aiLogs.filter(l => l.user_id === user.id);

        const totalAnswered = userAnswers.length;
        
        // --- NEW: Global Average Calculation ---
        let totalScoreSum = 0;
        
        // --- NEW: Hierarchical Aggregation (Topic -> Subtopics) ---
        // Structure: { "Cardiology": { sumPct: 250, total: 3, subtopics: { "Arrhythmias": { sumPct: ..., total: ... } } } }
        const hierarchy = {}; 

        userAnswers.forEach(ans => {
          if (ans.score === null || ans.score === undefined) return;

          const meta = questionMetaMap.get(String(ans.question_id)) || { topic: 'Unknown', subtopic: 'Unknown' };
          const { topic, subtopic } = meta;

          // Normalize Score (Handle 0.8 as 80, and 1 as 100)
          let rawScore = parseFloat(ans.score);
          let normalizedPct = 0;
          if (rawScore <= 1) {
            normalizedPct = rawScore * 100;
          } else {
            normalizedPct = rawScore; // Legacy handling if any > 1 exist
          }

          // Add to Global Sum
          totalScoreSum += normalizedPct;

          // Init Topic
          if (!hierarchy[topic]) {
            hierarchy[topic] = { sumPct: 0, total: 0, subtopics: {} };
          }
          
          // Init Subtopic
          if (!hierarchy[topic].subtopics[subtopic]) {
            hierarchy[topic].subtopics[subtopic] = { sumPct: 0, total: 0 };
          }

          // Aggregate Counts & Scores
          hierarchy[topic].total += 1;
          hierarchy[topic].sumPct += normalizedPct;

          hierarchy[topic].subtopics[subtopic].total += 1;
          hierarchy[topic].subtopics[subtopic].sumPct += normalizedPct;
        });

        // Global Accuracy
        const accuracy = totalAnswered > 0 ? Math.round(totalScoreSum / totalAnswered) : 0;

        // Flatten Hierarchy for Rendering
        const structuredStats = Object.entries(hierarchy).map(([tName, tData]) => {
          // Flatten Subtopics
          const subList = Object.entries(tData.subtopics).map(([sName, sData]) => ({
            name: sName,
            total: sData.total,
            accuracy: Math.round(sData.sumPct / sData.total) // Average Pct
          })).sort((a, b) => b.accuracy - a.accuracy); 

          return {
            name: tName,
            total: tData.total,
            accuracy: Math.round(tData.sumPct / tData.total), // Average Pct
            subtopics: subList
          };
        }).sort((a, b) => b.accuracy - a.accuracy); 
        // ---------------------------------------------------------

        return {
          id: user.id,
          email: user.email,
          totalAnswered,
          accuracy,
          aiUsageCount: userAiCalls.length,
          structuredStats
        };
      });

      // Sort Users
      userStats.sort((a, b) => b.accuracy - a.accuracy || b.totalAnswered - a.totalAnswered);

      setStats(userStats);
      setSummary({ totalUsers: profiles.length, totalAnswers: progress.length, totalAiCalls: aiLogs.length });

    } catch (error) {
      console.error("Dashboard Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (userId) => setExpandedUserId(expandedUserId === userId ? null : userId);

  // Helper for color coding accuracy
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
            <p className="text-xs text-indigo-300">Topic & Subtopic Analytics (Avg. Scores)</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><Users className="w-4 h-4" /><span className="text-xs font-bold uppercase">Total Users</span></div>
             <p className="text-3xl font-bold text-gray-800">{summary.totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><Target className="w-4 h-4" /><span className="text-xs font-bold uppercase">Answers Logged</span></div>
             <p className="text-3xl font-bold text-teal-600">{summary.totalAnswers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center gap-2 text-gray-500 mb-1"><BrainCircuit className="w-4 h-4" /><span className="text-xs font-bold uppercase">AI Consultations</span></div>
             <p className="text-3xl font-bold text-violet-600">{summary.totalAiCalls}</p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">User Performance</h2>
            <span className="text-xs text-gray-400">Sorted by Average Accuracy</span>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 w-16">Rank</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3 text-center">Questions</th>
                <th className="px-6 py-3 text-center">Avg. Score</th>
                <th className="px-6 py-3 text-center text-violet-600">AI Usage</th>
                <th className="px-6 py-3 text-right">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.map((user, index) => {
                const isExpanded = expandedUserId === user.id;
                
                return (
                  <React.Fragment key={user.id}>
                    {/* User Row */}
                    <tr onClick={() => toggleRow(user.id)} className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' : index === 1 ? 'bg-gray-200 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400 bg-gray-100'}`}>{index + 1}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.email}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{user.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">{user.totalAnswered}</span>
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
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                          {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="bg-indigo-50/30 animate-in fade-in duration-200">
                        <td colSpan="6" className="px-6 py-6">
                          <div className="bg-white rounded-lg border border-indigo-100 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                              <BarChart3 className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Detailed Breakdown</h3>
                            </div>

                            {user.structuredStats.length === 0 ? (
                              <p className="text-gray-400 text-sm italic">No data available yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.structuredStats.map((topic, i) => (
                                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
                                    
                                    {/* Topic Header */}
                                    <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <Folder className="w-4 h-4 text-indigo-400" />
                                        <span className="font-bold text-gray-800 text-sm">{topic.name}</span>
                                      </div>
                                      <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getScoreColor(topic.accuracy)}`}>
                                        {topic.accuracy}%
                                      </div>
                                    </div>
                                    
                                    {/* Topic Score Bar */}
                                    <div className="w-full h-1 bg-gray-100">
                                       <div className={`h-full ${getBarColor(topic.accuracy)}`} style={{width: `${topic.accuracy}%`}}></div>
                                    </div>

                                    {/* Subtopics List */}
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