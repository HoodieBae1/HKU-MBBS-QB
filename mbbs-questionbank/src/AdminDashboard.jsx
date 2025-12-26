import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Trophy, Users, BrainCircuit, X, Loader2, Target } from 'lucide-react';

const AdminDashboard = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalAnswers: 0, totalAiCalls: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch all profiles (to get emails)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email');
      if (profileError) throw profileError;

      // 2. Fetch all progress (to calc scores)
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, score');
      if (progressError) throw progressError;

      // 3. Fetch all AI logs
      const { data: aiLogs, error: aiError } = await supabase
        .from('ai_usage_logs')
        .select('user_id');
      if (aiError) throw aiError;

      // 4. Calculate Stats per User
      const userStats = profiles.map(user => {
        const userAnswers = progress.filter(p => p.user_id === user.id);
        const userAiCalls = aiLogs.filter(l => l.user_id === user.id);

        const totalAnswered = userAnswers.length;
        
        // Calculate Accuracy:
        // Assuming Score 1 = Correct. If you use SAQ scores (e.g., 5/10), logic needs adjustment.
        // Here we count any score > 0 as "Correct" or partially correct for SAQ, 
        // OR strictly equal to 1 for MCQ. Let's use score >= 1.
        const correctAnswers = userAnswers.filter(a => a.score && a.score >= 1).length;
        
        const accuracy = totalAnswered > 0 
          ? Math.round((correctAnswers / totalAnswered) * 100) 
          : 0;

        return {
          id: user.id,
          email: user.email,
          totalAnswered,
          correctAnswers,
          accuracy,
          aiUsageCount: userAiCalls.length
        };
      });

      // Sort: Highest Accuracy -> Most Answered
      userStats.sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.totalAnswered - a.totalAnswered;
      });

      setStats(userStats);
      setSummary({
        totalUsers: profiles.length,
        totalAnswers: progress.length,
        totalAiCalls: aiLogs.length
      });

    } catch (error) {
      console.error("Dashboard Error:", error);
      alert("Error loading data. Ensure you have 'admin' role in 'profiles' table.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80"><Loader2 className="animate-spin w-8 h-8 text-indigo-600"/></div>;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Navbar */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-800 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-indigo-300">Live User Analytics</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-indigo-800 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{summary.totalUsers}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Questions Answered</span>
            </div>
            <p className="text-3xl font-bold text-teal-600">{summary.totalAnswers}</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 mb-2">
              <BrainCircuit className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Total AI Consultations</span>
            </div>
            <p className="text-3xl font-bold text-violet-600">{summary.totalAiCalls}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Leaderboard</h2>
            <span className="text-xs text-gray-400">Sorted by Accuracy</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3 text-center">Questions Answered</th>
                  <th className="px-6 py-3 text-center">Accuracy</th>
                  <th className="px-6 py-3 text-center text-violet-600">AI Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map((user, index) => (
                  <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-gray-200 text-gray-600' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400 bg-gray-50'}`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.email}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{user.id}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                        {user.totalAnswered}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                         <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${user.accuracy > 70 ? 'bg-green-500' : user.accuracy > 40 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{width: `${user.accuracy}%`}}></div>
                         </div>
                         <span className="text-sm font-bold text-gray-700">{user.accuracy}%</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded border border-violet-100">
                        {user.aiUsageCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;