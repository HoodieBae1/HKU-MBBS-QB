import React, { useMemo } from 'react';
import { Folder, PieChart, Filter, AlertCircle, CheckSquare, AlignLeft } from 'lucide-react';

const UserStats = ({ questions, userProgress, onFilterSelect }) => {
  
  const stats = useMemo(() => {
    const hierarchy = {}; 
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalAnswered = 0;

    const metaMap = new Map();
    questions.forEach(q => {
      // --- GROUPING LOGIC ---
      // Combine MCQ and EMQ into one category, keep SAQ separate
      let typeGroup = 'SAQ';
      if (q.type === 'MCQ' || q.type === 'EMQ') {
          typeGroup = 'MCQ & EMQ';
      }

      metaMap.set(String(q.unique_id), {
        topic: q.topic || 'Uncategorized',
        subtopic: q.subtopic || 'General',
        typeGroup: typeGroup 
      });
    });

    Object.values(userProgress).forEach(entry => {
      const meta = metaMap.get(String(entry.question_id));
      if (!meta) return;

      // Strict grade check
      const hasScore = entry.score !== null && entry.score !== undefined;
      const hasMaxScore = entry.max_score !== null && entry.max_score !== undefined && entry.max_score > 0;

      if (!hasScore || !hasMaxScore) {
          return;
      }

      const { topic, subtopic, typeGroup } = meta;

      if (!hierarchy[topic]) {
          hierarchy[topic] = { score: 0, maxScore: 0, count: 0, subtopics: {} };
      }
      if (!hierarchy[topic].subtopics[subtopic]) {
          hierarchy[topic].subtopics[subtopic] = { 
              score: 0, maxScore: 0, count: 0, byType: {} 
          };
      }

      const sub = hierarchy[topic].subtopics[subtopic];
      if (!sub.byType[typeGroup]) {
          sub.byType[typeGroup] = { score: 0, maxScore: 0, count: 0 };
      }

      const currentScore = entry.score;
      const currentMax = entry.max_score;

      // Aggregations
      hierarchy[topic].count += 1;
      hierarchy[topic].score += currentScore;
      hierarchy[topic].maxScore += currentMax;

      sub.count += 1;
      sub.score += currentScore;
      sub.maxScore += currentMax;

      sub.byType[typeGroup].count += 1;
      sub.byType[typeGroup].score += currentScore;
      sub.byType[typeGroup].maxScore += currentMax;

      totalAnswered++;
      totalScore += currentScore;
      totalMaxScore += currentMax;
    });

    // Transform for render
    const structuredStats = Object.entries(hierarchy).map(([tName, tData]) => {
      const subList = Object.entries(tData.subtopics).map(([sName, sData]) => {
        
        const typeBreakdown = Object.entries(sData.byType).map(([typeName, typeStat]) => ({
            type: typeName,
            count: typeStat.count,
            accuracy: typeStat.maxScore > 0 ? Math.round((typeStat.score / typeStat.maxScore) * 100) : 0
        })).filter(t => t.count > 0); 

        return {
            name: sName,
            total: sData.count,
            accuracy: sData.maxScore > 0 ? Math.round((sData.score / sData.maxScore) * 100) : 0,
            typeBreakdown: typeBreakdown.sort((a, b) => a.type.localeCompare(b.type)) 
        };
      }).sort((a, b) => b.accuracy - a.accuracy);

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

  const getIconColorClass = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-500';
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
                    <p className="text-xs text-gray-500">Breakdown by Topic & Subtopic</p>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center min-w-[100px]">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Answered</span>
                    <span className="text-xl font-bold text-gray-800">{stats.totalAnswered}</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center min-w-[100px]">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Accuracy</span>
                    <span className={`text-xl font-bold ${stats.overallAccuracy >= 70 ? 'text-green-600' : stats.overallAccuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {stats.overallAccuracy}%
                    </span>
                </div>
            </div>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-4 text-xs text-blue-800 shadow-sm">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span>Stats include <strong>graded</strong> questions only.</span>
            </div>
            <div className="w-px h-4 bg-blue-200 hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3 h-3" /> <span>= MCQ & EMQ</span>
            </div>
            <div className="flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> <span>= SAQ</span>
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
                <div className="p-3 space-y-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                  {topic.subtopics.map((sub, j) => (
                    <button 
                      key={j} 
                      onClick={() => onFilterSelect(topic.name, sub.name)} 
                      className="w-full flex items-center justify-between p-1.5 rounded hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer group"
                    >
                      {/* Left: Name */}
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Filter className="w-3 h-3 text-gray-300 shrink-0 group-hover:text-teal-500 transition-colors" />
                        <span className="truncate text-xs font-semibold text-gray-600 group-hover:text-teal-700">{sub.name}</span>
                      </div>
                      
                      {/* Right: Stats Row */}
                      <div className="flex items-center shrink-0">
                         {/* Breakdown Icons */}
                         {sub.typeBreakdown.length > 0 && (
                             <div className="flex items-center gap-2 pr-2 border-r border-gray-200 mr-2">
                                 {sub.typeBreakdown.map((t, k) => (
                                     <div key={k} className={`flex items-center gap-0.5 text-[10px] font-medium ${getIconColorClass(t.accuracy)}`} title={`${t.type}: ${t.accuracy}%`}>
                                         {t.type === 'MCQ & EMQ' ? <CheckSquare size={11} /> : <AlignLeft size={11} />}
                                         <span>{t.accuracy}%</span>
                                     </div>
                                 ))}
                             </div>
                         )}

                         {/* Count - MOVED HERE (Between Divider and Total) */}
                         <span className="text-[10px] text-gray-400 font-medium mr-1">
                            {sub.total} Qs
                         </span>

                         {/* Overall Score */}
                         <span className={`font-mono font-bold text-xs w-7 text-right ${getIconColorClass(sub.accuracy)}`}>
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