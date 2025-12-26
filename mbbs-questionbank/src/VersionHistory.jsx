import React, { useEffect, useState } from 'react';
import { X, GitCommit, Calendar, ArrowLeft } from 'lucide-react';

const VersionHistory = ({ onClose }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/version.json?t=' + new Date().getTime()) // Prevent caching
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Failed to load changelog", err));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GitCommit className="w-6 h-6 text-teal-600" />
            Version History
          </h1>
        </div>
        <div className="text-xs font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Current: v{data?.currentVersion || '...'}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {!data ? (
          <div className="text-center text-gray-400 py-10">Loading updates...</div>
        ) : (
          <div className="space-y-8">
            {data.history.map((item, index) => (
              <div key={index} className="relative pl-8 border-l-2 border-slate-200 last:border-0 pb-8">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-teal-600 border-4 border-white shadow-sm"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2">
                  <h2 className="text-lg font-bold text-slate-900">v{item.version}</h2>
                  <div className="flex items-center text-xs text-gray-500 font-medium">
                    <Calendar className="w-3 h-3 mr-1" />
                    {item.date}
                  </div>
                </div>
                
                <h3 className="text-sm font-semibold text-teal-700 mb-3 bg-teal-50 inline-block px-2 py-0.5 rounded">
                  {item.title}
                </h3>

                <ul className="space-y-2">
                  {item.changes.map((change, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start leading-relaxed">
                      <span className="mr-2 mt-1.5 w-1 h-1 bg-slate-400 rounded-full shrink-0"></span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;