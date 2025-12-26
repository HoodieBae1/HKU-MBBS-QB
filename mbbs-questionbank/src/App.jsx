import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, Loader2, ArrowUpDown, LogOut, CheckSquare, GitCommit } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { supabase } from './supabase';
import QuestionCard from './QuestionCard';
import CompletionModal from './CompletionModal';
import Auth from './Auth';
import VersionHistory from './VersionHistory';
import UpdateManager from './UpdateManager';
import { APP_VERSION } from './appVersion';

const App = () => {
  // --- STATE ---
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Stores Dictionary of progress
  const [userProgress, setUserProgress] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [pendingMCQSelection, setPendingMCQSelection] = useState(null);
  const [modalInitialData, setModalInitialData] = useState(null); 

  // --- NEW: HISTORY VIEW STATE ---
  const [showHistory, setShowHistory] = useState(false);

  // --- 1. INITIALIZE ---
  useEffect(() => {
    // A. Check Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if(session) fetchUserProgress(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if(session) {
        fetchUserProgress(session.user.id);
      } else {
        setUserProgress({});
      }
    });

    // B. Fetch Data
    fetch('/questions.json')
      .then(res => res.json())
      .then(data => {
        // Validate Data
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
      .select('id, question_id, notes, score, selected_option')
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

  // --- ACTIONS ---
  const handleInitiateCompletion = async (questionData, mcqSelection) => {
    if (!session) return;
    const idString = String(questionData.unique_id);

    // If already complete, remove it (Toggle OFF)
    if (userProgress[idString]) {
      const newProgress = { ...userProgress };
      delete newProgress[idString];
      setUserProgress(newProgress); // Optimistic UI update
      
      // We delete using question_id match
      await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
      return;
    }

    // If new, open modal
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

    // 1. Identify the Question ID
    const idString = String(pendingQuestion.unique_id);
    
    // 2. Prepare Score & Selection
    let finalScore = modalData.score;
    
    if (pendingQuestion.type === 'MCQ') {
        // If user just clicked an option, calculate score
        if (pendingMCQSelection !== null) {
            const isCorrect = pendingMCQSelection === pendingQuestion.correctAnswerIndex;
            finalScore = isCorrect ? 1 : 0;
        } 
        // If user is just editing notes (no new selection), preserve old score
        else if (modalInitialData) {
            finalScore = modalInitialData.score;
        }
    }

    const finalSelection = pendingQuestion.type === 'MCQ' 
        ? (pendingMCQSelection ?? modalInitialData?.selected_option) 
        : null;

    // 3. Prepare Payload
    const payload = {
      user_id: session.user.id,
      question_id: idString, // <-- We match against this
      notes: modalData.notes,
      score: finalScore,
      selected_option: finalSelection
    };

    // 4. Update UI Optimistically
    setModalOpen(false);
    setPendingQuestion(null);
    setPendingMCQSelection(null);

    // Preserve the old PK ID if we have it, just for local state consistency
    const optimisticId = userProgress[idString]?.id; 
    setUserProgress(prev => ({
        ...prev,
        [idString]: { ...payload, id: optimisticId }
    }));

    // 5. UPSERT to Database
    // "onConflict: 'user_id, question_id'" tells Supabase:
    // "Find the row where user_id AND question_id match. Update it. If none, Insert."
    const { data, error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id,question_id' })
        .select();

    // 6. Handle Response
    if (error) {
        console.error("Error saving progress:", error);
        alert(`Error saving: ${error.message}`);
        fetchUserProgress(session.user.id); // Re-sync data if save failed
    } else if (data && data.length > 0) {
        // Update state with the official DB return (this ensures we have the correct ID for next time)
        setUserProgress(prev => ({
            ...prev,
            [idString]: data[0]
        }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- FILTERING & SORTING ---
  const filteredQuestions = useMemo(() => {
    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortOrder === 'Completed' || sortOrder === 'Unfinished') {
        const isADone = !!userProgress[String(a.unique_id)];
        const isBDone = !!userProgress[String(b.unique_id)];

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

  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder, userProgress]);


  // --- RENDERING ---

  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;

  // --- NEW: SHOW HISTORY VIEW IF TOGGLED ---
  if (showHistory) {
    return <VersionHistory onClose={() => setShowHistory(false)} />;
  }

  // --- DROPDOWN DATA ---
  const topics = [...new Set(questions.map(q => q.topic))].sort();
  const subtopics = [...new Set(questions.filter(q => selectedTopic === 'All' || q.topic === selectedTopic).map(q => q.subtopic))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalQuestionsCount = filteredQuestions.length;
  const completedCount = filteredQuestions.filter(q => userProgress[String(q.unique_id)]).length;
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 relative">
      
      {/* NEW: UPDATE MANAGER (Hidden until update found) */}
      <UpdateManager />

      {/* MODAL */}
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
                {/* NEW: Version Badge */}
                <span className="px-1.5 py-0.5 bg-teal-800 rounded text-teal-100 opacity-80 font-mono">v{APP_VERSION}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            
            {/* NEW: Version History Button */}
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 hover:bg-teal-600 rounded-full transition text-teal-100 hover:text-white"
              title="View Version History"
            >
              <GitCommit className="w-5 h-5" />
            </button>

            <div className="hidden md:block text-right border-l border-teal-600 pl-4 ml-2">
              <p className="text-xs text-teal-100">Logged in as</p>
              <p className="text-xs font-bold">{session.user.email}</p>
            </div>
            
            <button onClick={handleLogout} className="p-2 hover:bg-teal-600 rounded-full transition ml-1">
               <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* FILTERS & PROGRESS BAR */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[60px] z-40">
        
        {/* Progress Bar Section */}
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
             <span>Progress (Filtered)</span>
             <span>{completedCount} / {totalQuestionsCount} ({progressPercentage}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2 grid grid-cols-1 md:grid-cols-4 gap-4">
           {/* Dropdowns */}
           <div className="relative">
              <select value={selectedTopic} onChange={(e) => {setSelectedTopic(e.target.value); setSelectedSubtopic('All')}} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none"><option value="All">All Topics</option>{topics.map(t=><option key={t}>{t}</option>)}</select>
              <Filter className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
           </div>
           <div className="relative">
              <select value={selectedSubtopic} onChange={(e) => setSelectedSubtopic(e.target.value)} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none"><option value="All">All Subtopics</option>{subtopics.map(t=><option key={t}>{t}</option>)}</select>
              <BookOpen className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
           </div>
           <div className="relative">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none"><option value="All">All Types</option><option value="MCQ">MCQ</option><option value="SAQ">SAQ</option></select>
           </div>
           
           {/* Sorting Dropdown */}
           <div className="relative">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none">
                <option value="Newest">Newest First</option>
                <option value="Completed">Completed First</option>
                <option value="Unfinished">Unfinished First</option>
                <option value="Original">Original Order</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
           </div>
        </div>
        
        {/* Stats */}
        <div className="max-w-6xl mx-auto px-4 pb-2 pt-2 border-t flex justify-between text-xs text-gray-500">
          <span>Showing <strong>{filteredQuestions.length}</strong> questions</span>
          <span className="flex items-center gap-1 text-teal-700 font-bold">
            <CheckSquare className="w-3 h-3"/> Filtered View
          </span>
        </div>
      </div>

      {/* --- VIRTUALIZED CARD LIST --- */}
      <main className="max-w-6xl mx-auto px-4 py-6 z-0">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500">No questions found.</p></div>
        ) : (
          <Virtuoso
            useWindowScroll
            data={filteredQuestions}
            totalCount={filteredQuestions.length}
            itemContent={(index, q) => {
                // Determine progress for this specific card
                const progress = userProgress[String(q.unique_id)];

                return (
                    <div className="pb-6">
                        <QuestionCard 
                          key={q.unique_id} 
                          data={q} 
                          index={index} 
                          isCompleted={!!progress} 
                          initialSelection={progress ? progress.selected_option : null}
                          onToggleComplete={(mcqSelection) => handleInitiateCompletion(q, mcqSelection)} 
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