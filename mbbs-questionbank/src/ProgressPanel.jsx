import React, { useMemo } from 'react';
import { LayoutDashboard, CheckCircle2, Circle } from 'lucide-react';

const ProgressPanel = ({ questions, userProgress, onFilterSelect }) => {

  // Calculate Completion Statistics
  const progressData = useMemo(() => {
    const hierarchy = {};
    let totalQuestions = 0;
    let totalCompleted = 0;

    questions.forEach(q => {
      const tName = q.topic || 'Uncategorized';
      const sName = q.subtopic || 'General';

      if (!hierarchy[tName]) {
        hierarchy[tName] = { total: 0, completed: 0, subtopics: {} };
      }
      if (!hierarchy[tName].subtopics[sName]) {
        hierarchy[tName].subtopics[sName] = { total: 0, completed: 0 };
      }

      hierarchy[tName].total++;
      hierarchy[tName].subtopics[sName].total++;
      totalQuestions++;

      const p = userProgress[String(q.unique_id)];
      
      // --- FIX: Strict Completion Check ---
      // We must explicitly check that values are NOT undefined
      const hasScore = p?.score !== null && p?.score !== undefined;
      const hasSelection = p?.selected_option !== null && p?.selected_option !== undefined;
      
      const isDone = hasScore || hasSelection;

      if (isDone) {
        hierarchy[tName].completed++;
        hierarchy[tName].subtopics[sName].completed++;
        totalCompleted++;
      }
    });

    // Flatten and Sort Alphanumerically
    const structured = Object.entries(hierarchy).map(([tName, tData]) => {
      const subList = Object.entries(tData.subtopics).map(([sName, sData]) => ({
        name: sName,
        total: sData.total,
        completed: sData.completed,
        percent: sData.total > 0 ? Math.round((sData.completed / sData.total) * 100) : 0
      })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      return {
        name: tName,
        total: tData.total,
        completed: tData.completed,
        percent: tData.total > 0 ? Math.round((tData.completed / tData.total) * 100) : 0,
        subtopics: subList
      };
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return { structured, totalQuestions, totalCompleted };
  }, [questions, userProgress]);

  return (
    <div className="bg-slate-50 border-t border-gray-200 shadow-inner p-4 max-h-[75vh] overflow-y-auto">
      
      {/* Overall Summary Bar */}
      <div className="max-w-7xl mx-auto mb-6">
         <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
            <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overall Completion</span>
            </div>
            <span>{progressData.totalCompleted} / {progressData.totalQuestions} Questions</span>
         </div>
         <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${progressData.totalQuestions > 0 ? (progressData.totalCompleted / progressData.totalQuestions) * 100 : 0}%` }}
            />
         </div>
      </div>

      {/* Grid Layout - Compact */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {progressData.structured.map((topic, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col">
                
                {/* Topic Header */}
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-50">
                    <span className="font-bold text-gray-800 text-sm truncate pr-2" title={topic.name}>
                        {topic.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {topic.percent}%
                    </span>
                </div>

                {/* Subtopic Progress Bars */}
                <div className="space-y-2 flex-grow">
                    {topic.subtopics.map((sub, j) => (
                        <button 
                            key={j} 
                            onClick={() => onFilterSelect(topic.name, sub.name)}
                            className="w-full block hover:bg-slate-50 rounded transition-colors group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 p-1 -mx-1"
                            title={`Filter by ${sub.name}`}
                        >
                            <div className="flex justify-between items-center text-[11px] mb-0.5">
                                <div className="flex items-center gap-1.5 truncate pr-2">
                                    {sub.percent === 100 ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                    ) : (
                                        <Circle className="w-3 h-3 text-gray-300 shrink-0 group-hover:text-indigo-400 transition-colors" />
                                    )}
                                    <span className={`truncate ${sub.percent === 100 ? 'text-green-700 font-medium' : 'text-gray-600 group-hover:text-indigo-700 transition-colors'}`}>
                                        {sub.name}
                                    </span>
                                </div>
                                <span className="text-gray-400 shrink-0 tabular-nums group-hover:text-indigo-400">
                                    {sub.completed}/{sub.total}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-300 ${sub.percent === 100 ? 'bg-green-400' : 'bg-indigo-300'}`} 
                                    style={{ width: `${sub.percent}%` }}
                                />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressPanel;