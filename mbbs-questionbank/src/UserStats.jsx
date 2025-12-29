import React, { useMemo } from 'react';
import { Folder, FileText, PieChart, Filter, AlertCircle } from 'lucide-react';

const UserStats = ({ questions, userProgress, onFilterSelect }) => {
  
  const stats = useMemo(() => {
    const hierarchy = {}; 
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalAnswered = 0;

    const metaMap = new Map();
    questions.forEach(q => {
      metaMap.set(String(q.unique_id), {
        topic: q.topic || 'Uncategorized',
        subtopic: q.subtopic || 'General'
      });
    });

    Object.values(userProgress).forEach(entry => {
      const meta = metaMap.get(String(entry.question_id));
      if (!meta) return;

      // --- STRICT FILTER ---
      // Only count questions that have been explicitly graded.
      // If score is null OR max_score is null/0, it means it's either:
      // 1. Just flagged
      // 2. Just notes (no grade)
      // 3. Unmarked (Redone)
      if (entry.score === null || entry.max_score === null || entry.max_score === 0) {
          return;
      }

      const { topic, subtopic } = meta;

      // Initialize structure
      if (!hierarchy[topic]) hierarchy[topic] = { score: 0, maxScore: 0, count: 0, subtopics: {} };
      if (!hierarchy[topic].subtopics[subtopic]) hierarchy[topic].subtopics[subtopic] = { score: 0, maxScore: 0, count: 0 };

      const currentScore = entry.score;
      const currentMax = entry.max_score;

      // Aggregations
      hierarchy[topic].count += 1;
      hierarchy[topic].score += currentScore;
      hierarchy[topic].maxScore += currentMax;

      hierarchy[topic].subtopics[subtopic].count += 1;
      hierarchy[topic].subtopics[subtopic].score += currentScore;
      hierarchy[topic].subtopics[subtopic].maxScore += currentMax;

      totalAnswered++;
      totalScore += currentScore;
      totalMaxScore += currentMax;
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

    const overallAccuracy = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return { structuredStats, overallAccuracy, totalAnswered };
  }, [questions, userProgress]);

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

  return (
    <div className="bg-slate-100 border-b border-gray-200 shadow-inner">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-teal-700 border border-teal-100">
                    <PieChart className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-800">Your Statistics</h2>
                    <p className="text-xs text-gray-500">Click any subtopic to filter questions</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center min-w-[100px]">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Answered</span>
                    <span className="text-xl font-bold text-gray-800">{stats.totalAnswered}</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center min-w-[100px]">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Accuracy</span>
                    <span className={`text-xl font-bold ${stats.overallAccuracy >= 70 ? 'text-green-600' : stats.overallAccuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {stats.overallAccuracy}%
                    </span>
                </div>
            </div>
        </div>

        {/* Reminder Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 flex items-start gap-3 text-sm text-blue-800 shadow-sm">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              Questions are only included in statistics if they have been <strong>graded</strong> (Max Score &gt; 0). Notes-only entries are excluded.
            </div>
        </div>

        {/* Grid Content */}
        {stats.structuredStats.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400 italic">
             No graded questions found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.structuredStats.map((topic, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                
                {/* Topic Header */}
                <div className="bg-gray-50/80 p-3 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Folder className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-bold text-gray-700 text-sm truncate" title={topic.name}>{topic.name}</span>
                  </div>
                  <div className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getScoreColor(topic.accuracy)}`}>
                    {topic.accuracy}%
                  </div>
                </div>
                
                <div className="w-full h-1 bg-gray-100">
                    <div className={`h-full ${getBarColor(topic.accuracy)}`} style={{width: `${topic.accuracy}%`}}></div>
                </div>

                {/* Subtopics List */}
                <div className="p-3 space-y-1 overflow-y-auto max-h-[180px] custom-scrollbar">
                  {topic.subtopics.map((sub, j) => (
                    <button 
                      key={j} 
                      onClick={() => onFilterSelect(topic.name, sub.name)} 
                      className="w-full flex items-center justify-between text-xs group p-1.5 rounded hover:bg-teal-50 transition-colors cursor-pointer text-left"
                      title="Click to filter questions by this subtopic"
                    >
                      <div className="flex items-center gap-2 text-gray-600 overflow-hidden">
                        <Filter className="w-3 h-3 text-gray-300 shrink-0 group-hover:text-teal-600 transition-colors" />
                        <span className="truncate max-w-[140px] font-medium group-hover:text-teal-700">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400 text-[10px] group-hover:text-teal-600/70">{sub.total}</span>
                        <span className={`font-mono font-bold w-7 text-right ${sub.accuracy >= 70 ? 'text-green-600' : sub.accuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {sub.accuracy}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStats;