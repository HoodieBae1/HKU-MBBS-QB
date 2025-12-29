import React, { useState, useMemo } from 'react';
import { X, Search, BookOpen, Filter, StickyNote, ChevronDown, ChevronUp, ArrowRight, MessageSquare, PenTool } from 'lucide-react';
// We removed ReactMarkdown as we are now using raw HTML from Quill

const NotesPanel = ({ onClose, questions, userProgress }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  // 1. Aggregate Questions with their Notes
  const allNotes = useMemo(() => {
    return questions
      .filter(q => {
        const progress = userProgress[String(q.unique_id)];
        return progress && progress.notes && progress.notes.trim().length > 0;
      })
      .map(q => ({
        ...q,
        userNote: userProgress[String(q.unique_id)].notes,
        userResponse: userProgress[String(q.unique_id)].user_response,
        userScore: userProgress[String(q.unique_id)].score,
        updatedAt: userProgress[String(q.unique_id)].updated_at 
      }));
  }, [questions, userProgress]);

  // 2. Filter Options
  const availableTopics = useMemo(() => [...new Set(allNotes.map(n => n.topic))].sort(), [allNotes]);
  const availableSubtopics = useMemo(() => {
    return [...new Set(allNotes
      .filter(n => selectedTopic === 'All' || n.topic === selectedTopic)
      .map(n => n.subtopic)
    )].sort();
  }, [allNotes, selectedTopic]);

  // 3. Apply Filters
  const filteredNotes = useMemo(() => {
    return allNotes.filter(item => {
      const matchTopic = selectedTopic === 'All' || item.topic === selectedTopic;
      const matchSubtopic = selectedSubtopic === 'All' || item.subtopic === selectedSubtopic;
      
      const qLower = searchQuery.toLowerCase();
      // Note: searching inside HTML strings is imperfect but sufficient for basic text matching
      const matchSearch = !searchQuery || 
        item.userNote.toLowerCase().includes(qLower) ||
        (item.userResponse && item.userResponse.toLowerCase().includes(qLower)) ||
        item.question.toLowerCase().includes(qLower) ||
        item.topic.toLowerCase().includes(qLower);

      return matchTopic && matchSubtopic && matchSearch;
    });
  }, [allNotes, selectedTopic, selectedSubtopic, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-100 overflow-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Styles to restore list bullets and basic formatting removed by Tailwind */}
      <style>{`
        .html-content ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .html-content ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
        .html-content p { margin-bottom: 0.5rem; }
        .html-content blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #64748b; }
        .html-content strong { font-weight: 700; }
        .html-content em { font-style: italic; }
        .html-content img { max-width: 100%; border-radius: 0.5rem; margin: 0.5rem 0; }
        .html-content a { color: #0d9488; text-decoration: underline; }
      `}</style>

      {/* Header */}
      <div className="bg-amber-100 border-b border-amber-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-200 rounded-lg text-amber-800">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-900">My Study Notes</h1>
            <p className="text-xs text-amber-700 font-medium">{allNotes.length} notes recorded across all questions</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-amber-200/50 rounded-full transition-colors text-amber-900"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        
        {/* Controls / Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 sticky top-[80px] z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search */}
            <div className="md:col-span-4 relative">
               <input 
                 type="text" 
                 placeholder="Search inside notes..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
               />
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
            </div>

            {/* Topic Filter */}
            <div className="md:col-span-4 relative">
                <select 
                  value={selectedTopic} 
                  onChange={(e) => {setSelectedTopic(e.target.value); setSelectedSubtopic('All')}} 
                  className="w-full pl-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm appearance-none truncate pr-8 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <option value="All">All Topics</option>
                  {availableTopics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
            </div>

            {/* Subtopic Filter */}
            <div className="md:col-span-4 relative">
                <select 
                  value={selectedSubtopic} 
                  onChange={(e) => setSelectedSubtopic(e.target.value)} 
                  className="w-full pl-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm appearance-none truncate pr-8 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <option value="All">All Subtopics</option>
                  {availableSubtopics.map(t => (
                      <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <BookOpen className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {filteredNotes.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-500 font-medium">No notes found matching your filters.</h3>
              <p className="text-sm text-gray-400">Try clearing filters or adding notes to questions in the main view.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredNotes.map((item) => {
              const isExpanded = expandedId === item.unique_id;
              
              return (
                <div 
                  key={item.unique_id} 
                  className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-md border-amber-300 ring-1 ring-amber-300' : 'shadow-sm border-gray-200 hover:border-amber-200'}`}
                >
                  {/* Card Header (The Note Preview) */}
                  <div 
                    onClick={() => toggleExpand(item.unique_id)}
                    className="p-5 cursor-pointer group"
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                       <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{item.topic}</span>
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded border border-gray-100">{item.subtopic}</span>
                       </div>
                       <div className="text-gray-400 group-hover:text-amber-600 transition-colors">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                       </div>
                    </div>

                    {/* Show Typed Response if available (Rendered as HTML) */}
                    {item.userResponse && (
                        <div className="mb-4 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                                <PenTool className="w-3 h-3" /> Your Answer
                            </div>
                            <div 
                                className="text-indigo-900/80 text-sm font-medium html-content"
                                dangerouslySetInnerHTML={{ __html: item.userResponse }}
                            />
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                       <MessageSquare className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                       {/* Render Note HTML */}
                       <div 
                          className="text-gray-800 text-sm font-medium leading-relaxed font-serif html-content w-full"
                          dangerouslySetInnerHTML={{ __html: item.userNote }}
                       />
                    </div>
                    
                    {!isExpanded && (
                       <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">{item.id}</span>
                          <span>Click to see question context</span>
                       </div>
                    )}
                  </div>

                  {/* Expanded Content (Original Question Context) */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-gray-100 animate-in fade-in duration-200">
                       <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                          
                          {/* Question Column */}
                          <div>
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ArrowRight className="w-3 h-3" /> Original Question ({item.type})
                             </h4>
                             <div className="text-gray-800 font-medium mb-4 text-sm leading-relaxed whitespace-pre-line">
                                {item.question}
                             </div>
                             {item.options && item.options.length > 0 && (
                                <ul className="space-y-1 mb-4">
                                  {item.options.map((opt, i) => (
                                    <li key={i} className="text-xs text-gray-500 flex gap-2">
                                      <span className="font-mono font-bold bg-white border border-gray-200 px-1.5 rounded">{String.fromCharCode(65 + i)}</span>
                                      {opt}
                                    </li>
                                  ))}
                                </ul>
                             )}
                          </div>

                          {/* Answer Column */}
                          <div className="bg-white border border-gray-200 rounded-lg p-5">
                             <h4 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">Official Answer</h4>
                             <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                {item.official_answer}
                             </div>
                             
                             {/* AI Explanation Snippet (if available) */}
                             {item.ai_answer && (
                               <div className="mt-4 pt-4 border-t border-gray-100">
                                  <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1">AI Summary</div>
                                  <div className="text-xs text-indigo-900/70 italic">
                                    "{item.ai_answer.explanation}"
                                  </div>
                               </div>
                             )}
                          </div>

                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPanel;