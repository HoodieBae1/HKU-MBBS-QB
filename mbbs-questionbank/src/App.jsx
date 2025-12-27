import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, Loader2, ArrowUpDown, LogOut, Search, X, ChevronDown, ChevronUp, SlidersHorizontal, GitCommit, Trophy, BarChart3, PieChart } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { supabase } from './supabase';
import QuestionCard from './QuestionCard';
import CompletionModal from './CompletionModal';
import Auth from './Auth';
import VersionHistory from './VersionHistory';
import UpdateManager from './UpdateManager';
import AdminDashboard from './AdminDashboard';
import UserStats from './UserStats';
import { APP_VERSION } from './appVersion';

// --- HELPER HOOK: Persist state to LocalStorage ---
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

const App = () => {
  // --- STATE ---
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ADMIN STATE ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // --- USER STATS TOGGLE ---
  const [showUserStats, setShowUserStats] = useState(false);

  // --- FILTERS & UI (Now Persistent) ---
  const [filtersOpen, setFiltersOpen] = useStickyState(true, 'app_filtersOpen');
  const [searchQuery, setSearchQuery] = useStickyState('', 'app_searchQuery');
  const [selectedTopic, setSelectedTopic] = useStickyState('All', 'app_selectedTopic');
  const [selectedSubtopic, setSelectedSubtopic] = useStickyState('All', 'app_selectedSubtopic');
  const [selectedType, setSelectedType] = useStickyState('All', 'app_selectedType');
  const [sortOrder, setSortOrder] = useStickyState('Newest', 'app_sortOrder');

  // --- SCROLL POSITION STATE ---
  const initialScrollIndex = useMemo(() => {
    const saved = window.localStorage.getItem('app_scrollIndex');
    return saved ? parseInt(saved, 10) : 0;
  }, []);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [pendingMCQSelection, setPendingMCQSelection] = useState(null);
  const [modalInitialData, setModalInitialData] = useState(null); 

  const [showHistory, setShowHistory] = useState(false);

  // --- 1. INITIALIZE ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) {
        fetchUserProgress(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if(session) {
        fetchUserProgress(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setUserProgress({});
        setIsAdmin(false);
      }
    });

    fetch('/questions.json')
      .then(res => res.json())
      .then(data => {
        const cleanData = Array.isArray(data) ? data.map(q => ({
          ...q,
          unique_id: q.unique_id !== undefined ? q.unique_id : `missing-${Math.random()}`,
          id: q.id || `No ID`, 
          topic: q.topic?.trim() || 'Uncategorized', 
          subtopic: q.subtopic?.trim() || 'General', 
          type: q.type || 'SAQ',
          options: Array.isArray(q.options) ? q.options : []
        })) : [];
        
        setQuestions(cleanData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load questions.json");
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  // --- DB HELPER ---
  const fetchUserProgress = async (userId) => {
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, question_id, notes, score, selected_option, is_flagged')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
    } else {
      const progressMap = {};
      data.forEach(row => {
        progressMap[String(row.question_id)] = row;
      });
      setUserProgress(progressMap);
    }
  };

  const checkAdminStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (!error && data?.role === 'admin') setIsAdmin(true);
    } catch (e) {
      console.error("Admin check failed", e);
    }
  };

  // --- ACTIONS ---
  
  // NEW: Handle clicking a subtopic inside UserStats
  const handleQuickFilter = (topic, subtopic) => {
    setSelectedTopic(topic);
    setSelectedSubtopic(subtopic);
    setFiltersOpen(true); // Ensure filters are visible so user sees what happened
    // Optional: Close stats after selection? 
    // setShowUserStats(false); 
  };

  const handleToggleFlag = async (questionData) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const currentProgress = userProgress[idString] || {};
    const newFlagStatus = !currentProgress.is_flagged;

    const payload = {
      ...currentProgress,
      user_id: session.user.id,
      question_id: idString,
      is_flagged: newFlagStatus
    };
    if (!payload.score && payload.score !== 0) payload.score = null;
    if (!payload.selected_option && payload.selected_option !== 0) payload.selected_option = null;
    if (!payload.notes) payload.notes = null;

    setUserProgress(prev => ({ ...prev, [idString]: { ...payload } }));

    const { data, error } = await supabase
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id,question_id' })
      .select();

    if (error) fetchUserProgress(session.user.id);
    else if (data && data.length > 0) setUserProgress(prev => ({ ...prev, [idString]: data[0] }));
  };

  const handleInitiateCompletion = async (questionData, mcqSelection) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const existingEntry = userProgress[idString];
    const isCurrentlyCompleted = existingEntry && (existingEntry.score !== null || existingEntry.selected_option !== null || existingEntry.notes);

    if (isCurrentlyCompleted) {
      if (existingEntry.is_flagged) {
        const payload = { ...existingEntry, score: null, selected_option: null, notes: null };
        setUserProgress(prev => ({ ...prev, [idString]: payload }));
        await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' });
      } else {
        const newProgress = { ...userProgress };
        delete newProgress[idString];
        setUserProgress(newProgress);
        await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
      }
      return;
    }

    setPendingQuestion(questionData);
    setPendingMCQSelection(mcqSelection);
    setModalInitialData(null);
    setModalOpen(true);
  };

  const handleReviewNotes = (questionData) => {
    const idString = String(questionData.unique_id);
    const existingData = userProgress[idString];
    if (existingData) {
      setPendingQuestion(questionData);
      setModalInitialData(existingData);
      setPendingMCQSelection(null); 
      setModalOpen(true);
    }
  };

  const handleConfirmCompletion = async (modalData) => {
    if (!session || !pendingQuestion) return;
    const idString = String(pendingQuestion.unique_id);
    const currentProgress = userProgress[idString] || {};

    let finalScore = modalData.score;
    if (pendingQuestion.type === 'MCQ') {
        if (pendingMCQSelection !== null) {
            const isCorrect = pendingMCQSelection === pendingQuestion.correctAnswerIndex;
            finalScore = isCorrect ? 1 : 0;
        } else if (modalInitialData) {
            finalScore = modalInitialData.score;
        }
    }

    const finalSelection = pendingQuestion.type === 'MCQ' ? (pendingMCQSelection ?? modalInitialData?.selected_option) : null;
    const payload = {
      user_id: session.user.id,
      question_id: idString, 
      notes: modalData.notes,
      score: finalScore,
      selected_option: finalSelection,
      is_flagged: currentProgress.is_flagged || false
    };

    setModalOpen(false);
    setPendingQuestion(null);
    setPendingMCQSelection(null);

    const optimisticId = currentProgress.id; 
    setUserProgress(prev => ({ ...prev, [idString]: { ...payload, id: optimisticId } }));

    const { data, error } = await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' }).select();
    if (error) {
        alert(`Error: ${error.message}`);
        fetchUserProgress(session.user.id); 
    } else if (data && data.length > 0) {
        setUserProgress(prev => ({ ...prev, [idString]: data[0] }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- HELPERS ---
  const checkIsCompleted = (id) => {
    const p = userProgress[String(id)];
    if (!p) return false;
    return p.score !== null || p.selected_option !== null || (p.notes && p.notes.length > 0);
  };

  const checkIsFlagged = (id) => userProgress[String(id)]?.is_flagged === true;

  // --- FILTER LOGIC & COUNTS ---
  const filterCounts = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();
    const baseSet = questions.filter(q => {
       if (selectedType !== 'All' && q.type !== selectedType) return false;
       if (!qLower) return true;
       return (
          q.question?.toLowerCase().includes(qLower) ||
          q.official_answer?.toLowerCase().includes(qLower) ||
          q.id?.toLowerCase().includes(qLower) ||
          q.ai_answer?.explanation?.toLowerCase().includes(qLower) ||
          (q.options && q.options.some(opt => opt.toLowerCase().includes(qLower)))
       );
    });

    const tCounts = {};
    baseSet.forEach(q => { tCounts[q.topic] = (tCounts[q.topic] || 0) + 1; });

    const sCounts = {};
    baseSet.forEach(q => {
        if (selectedTopic === 'All' || q.topic === selectedTopic) {
            sCounts[q.subtopic] = (sCounts[q.subtopic] || 0) + 1;
        }
    });

    return { tCounts, sCounts, totalMatchingSearch: baseSet.length };
  }, [questions, searchQuery, selectedType, selectedTopic]);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();

    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;

      if (qLower) {
        const match = 
          q.question?.toLowerCase().includes(qLower) ||
          q.official_answer?.toLowerCase().includes(qLower) ||
          q.id?.toLowerCase().includes(qLower) ||
          q.ai_answer?.explanation?.toLowerCase().includes(qLower) ||
          (q.options && q.options.some(opt => opt.toLowerCase().includes(qLower)));
        if (!match) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortOrder === 'Flagged') {
        const isAFlagged = checkIsFlagged(a.unique_id);
        const isBFlagged = checkIsFlagged(b.unique_id);
        if (isAFlagged !== isBFlagged) return isAFlagged ? -1 : 1;
        return a.unique_id - b.unique_id;
      }
      if (sortOrder === 'Completed' || sortOrder === 'Unfinished') {
        const isADone = checkIsCompleted(a.unique_id);
        const isBDone = checkIsCompleted(b.unique_id);
        if (isADone !== isBDone) {
          if (sortOrder === 'Completed') return isADone ? -1 : 1;
          if (sortOrder === 'Unfinished') return isADone ? 1 : -1;
        }
        return a.unique_id - b.unique_id;
      }
      if (sortOrder === 'Newest') {
        const getYear = (idStr) => {
          if (!idStr || idStr.length < 3) return 0;
          const val = parseInt(idStr.substring(1, 3), 10);
          return isNaN(val) ? 0 : (val < 50 ? 2000 + val : 1900 + val);
        };
        const yearDiff = getYear(b.id) - getYear(a.id);
        if (yearDiff !== 0) return yearDiff;
        return a.unique_id - b.unique_id;
      }
      return a.unique_id - b.unique_id;
    });
  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder, userProgress, searchQuery]);

  // --- CONSTANTS ---
  const topicsList = Object.keys(filterCounts.tCounts).sort();
  const subtopicsList = Object.keys(filterCounts.sCounts)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalQuestionsCount = filteredQuestions.length;
  const completedCount = filteredQuestions.filter(q => checkIsCompleted(q.unique_id)).length;
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

  // --- RENDERING ---
  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;
  if (showDashboard) return <AdminDashboard onClose={() => setShowDashboard(false)} questions={questions} />;
  if (showHistory) return <VersionHistory onClose={() => setShowHistory(false)} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 relative">
      <UpdateManager />
      <CompletionModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleConfirmCompletion}
        question={pendingQuestion}
        type={pendingQuestion?.type}
        initialData={modalInitialData}
      />

      {/* HEADER */}
      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-teal-200" />
            <div>
              <h1 className="text-lg font-bold">HKU M26 MBBS Finals</h1>
              <div className="flex items-center gap-2 text-[10px] text-teal-200 uppercase tracking-wider">
                <span>Question Bank</span>
                <span className="px-1.5 py-0.5 bg-teal-800 rounded text-teal-100 opacity-80 font-mono">v{APP_VERSION}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setShowDashboard(true)} 
                className="p-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-full transition shadow-sm border border-indigo-500 mr-2"
                title="Admin Dashboard"
              >
                <Trophy className="w-5 h-5 text-yellow-300" />
              </button>
            )}
            <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white"><GitCommit className="w-5 h-5" /></button>
            <div className="hidden md:block text-right border-l border-teal-600 pl-4 ml-2">
              <p className="text-xs text-teal-100">Logged in as</p>
              <p className="text-xs font-bold">{session.user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-teal-600 rounded-full transition ml-1"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {/* STICKY CONTROL BAR */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[60px] z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            
            <div className="flex-grow flex items-center gap-3">
               <div className="flex-grow flex flex-col justify-center">
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Progress</span>
                    <span className="text-teal-600">{completedCount} / {totalQuestionsCount} ({progressPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
               </div>

               {/* Toggle Stats Button */}
               <button 
                  onClick={() => setShowUserStats(!showUserStats)}
                  className={`p-2 rounded-lg border transition-all duration-200 ${showUserStats ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-600'}`}
                  title="Toggle Statistics Card"
               >
                 <BarChart3 className="w-5 h-5" />
               </button>
            </div>

            <button 
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 text-sm font-semibold ${filtersOpen ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{filtersOpen ? 'Hide Filters' : 'Show Filters'}</span>
              {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* FILTER AREA (Collapsible) */}
          <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${filtersOpen ? 'grid-rows-[1fr] opacity-100 mt-4 pb-2' : 'grid-rows-[0fr] opacity-0 mt-0 pb-0'}`}>
            <div className="min-h-0 flex flex-col gap-3">
               {/* Search */}
               <div className="relative w-full">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  )}
               </div>

               {/* Dropdowns */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                      <select 
                        value={selectedTopic} 
                        onChange={(e) => {setSelectedTopic(e.target.value); setSelectedSubtopic('All')}} 
                        className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white truncate pr-8"
                      >
                        <option value="All">All Topics ({filterCounts.totalMatchingSearch})</option>
                        {topicsList.map(t => (
                          <option key={t} value={t}>{t} ({filterCounts.tCounts[t]})</option>
                        ))}
                      </select>
                      <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                  </div>
                  
                  <div className="relative">
                      <select 
                        value={selectedSubtopic} 
                        onChange={(e) => setSelectedSubtopic(e.target.value)} 
                        className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white truncate pr-8"
                      >
                        <option value="All">All Subtopics</option>
                        {subtopicsList.map(t => (
                           <option key={t} value={t}>{t} ({filterCounts.sCounts[t]})</option>
                        ))}
                      </select>
                      <BookOpen className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                  </div>
                  
                  <div className="relative">
                      <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white">
                        <option value="All">All Types</option>
                        <option value="MCQ">MCQ</option>
                        <option value="SAQ">SAQ</option>
                      </select>
                  </div>
                  
                  <div className="relative">
                      <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white">
                        <option value="Newest">Newest First</option>
                        <option value="Completed">Completed First</option>
                        <option value="Unfinished">Unfinished First</option>
                        <option value="Flagged">Flagged First</option>
                        <option value="Original">Original Order</option>
                      </select>
                      <ArrowUpDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- NEW: USER STATS (Collapsible with smooth transition) --- */}
      <div className={`grid transition-all duration-500 ease-in-out ${showUserStats ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
         <div className="min-h-0 overflow-hidden">
            <UserStats 
              questions={questions} 
              userProgress={userProgress} 
              onFilterSelect={handleQuickFilter} // <--- Pass the new handler
            />
         </div>
      </div>

      {/* --- VIRTUALIZED CARD LIST --- */}
      <main className="max-w-6xl mx-auto px-4 py-6 z-0">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No questions found matching your filters.</p>
          </div>
        ) : (
          <Virtuoso
            useWindowScroll
            data={filteredQuestions}
            initialTopMostItemIndex={initialScrollIndex}
            rangeChanged={({ startIndex }) => {
               window.localStorage.setItem('app_scrollIndex', startIndex);
            }}
            itemContent={(index, q) => {
                const isCompleted = checkIsCompleted(q.unique_id);
                const isFlagged = checkIsFlagged(q.unique_id);
                const progress = userProgress[String(q.unique_id)];

                return (
                    <div className="pb-6">
                        <QuestionCard 
                          key={q.unique_id} 
                          data={q} 
                          index={index} 
                          isCompleted={isCompleted} 
                          isFlagged={isFlagged}
                          initialSelection={progress ? progress.selected_option : null}
                          onToggleComplete={(mcqSelection) => handleInitiateCompletion(q, mcqSelection)} 
                          onToggleFlag={() => handleToggleFlag(q)}
                          onReviewNotes={() => handleReviewNotes(q)}
                        />
                    </div>
                );
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;