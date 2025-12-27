import React, { useMemo } from 'react';
import { Folder, FileText, PieChart, Filter } from 'lucide-react';

// Added onFilterSelect prop
const UserStats = ({ questions, userProgress, onFilterSelect }) => {
  
  const stats = useMemo(() => {
    const hierarchy = {}; 
    let totalCorrect = 0;
    let totalAnswered = 0;

    const metaMap = new Map();
    questions.forEach(q => {
      metaMap.set(String(q.unique_id), {
        topic: q.topic || 'Uncategorized',
        subtopic: q.subtopic || 'General'
      });
    });

    Object.values(userProgress).forEach(entry => {
      if (entry.score === null && entry.selected_option === null) return;

      const meta = metaMap.get(String(entry.question_id));
      if (!meta) return;

      const { topic, subtopic } = meta;

      if (!hierarchy[topic]) hierarchy[topic] = { correct: 0, total: 0, subtopics: {} };
      if (!hierarchy[topic].subtopics[subtopic]) hierarchy[topic].subtopics[subtopic] = { correct: 0, total: 0 };

      const isCorrect = entry.score && entry.score >= 1;

      hierarchy[topic].total += 1;
      hierarchy[topic].subtopics[subtopic].total += 1;
      totalAnswered++;

      if (isCorrect) {
        hierarchy[topic].correct += 1;
        hierarchy[topic].subtopics[subtopic].correct += 1;
        totalCorrect++;
      }
    });

    const structuredStats = Object.entries(hierarchy).map(([tName, tData]) => {
      const subList = Object.entries(tData.subtopics).map(([sName, sData]) => ({
        name: sName,
        total: sData.total,
        accuracy: Math.round((sData.correct / sData.total) * 100)
      })).sort((a, b) => b.accuracy - a.accuracy);

      return {
        name: tName,
        total: tData.total,
        accuracy: Math.round((tData.correct / tData.total) * 100),
        subtopics: subList
      };
    }).sort((a, b) => b.accuracy - a.accuracy);

    const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

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
    // Removed the outer margin/animation classes here as they are now handled by the parent wrapper
    <div className="bg-slate-100 border-b border-gray-200 shadow-inner">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
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

        {/* Grid Content */}
        {stats.structuredStats.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400 italic">
             No data yet. Complete some questions to see your mastery breakdown!
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
                      onClick={() => onFilterSelect(topic.name, sub.name)} // <--- TRIGGER FILTER
                      className="w-full flex items-center justify-between text-xs group p-1.5 rounded hover:bg-teal-50 transition-colors cursor-pointer text-left"
                      title="Click to filter questions by this subtopic"
                    >
                      <div className="flex items-center gap-2 text-gray-600 overflow-hidden">
                        {/* Icon changes color on hover to indicate action */}
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