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
    // Added 'is_flagged' to selection
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

  // --- ACTIONS ---
  
  // Toggle Flag Status
  const handleToggleFlag = async (questionData) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const currentProgress = userProgress[idString] || {};
    const newFlagStatus = !currentProgress.is_flagged;

    // 1. Prepare Payload
    const payload = {
      ...currentProgress,
      user_id: session.user.id,
      question_id: idString,
      is_flagged: newFlagStatus
    };

    // If it was a purely virtual row (empty), ensure we have keys
    if (!payload.score && payload.score !== 0) payload.score = null;
    if (!payload.selected_option && payload.selected_option !== 0) payload.selected_option = null;
    if (!payload.notes) payload.notes = null;

    // 2. Update UI Optimistically
    // If unflagging AND not completed (no score/notes/selection), we effectively remove the row from logic view
    // But to keep it simple, we just update the 'is_flagged' key.
    // If we unflag and it has no other data, we should ideally delete it, but upserting false is safer for now.
    
    // However, if we unflag and it's NOT completed, we might want to clean up.
    // Let's stick to Upsert for simplicity.
    
    setUserProgress(prev => ({
      ...prev,
      [idString]: { ...payload }
    }));

    // 3. Database Upsert
    const { data, error } = await supabase
      .from('user_progress')
      .upsert(payload, { onConflict: 'user_id,question_id' })
      .select();

    if (error) {
      console.error("Error flagging:", error);
      fetchUserProgress(session.user.id); // Revert on error
    } else if (data && data.length > 0) {
      // If we unflagged and it's basically empty, we could delete it, but for now we leave it.
      setUserProgress(prev => ({
        ...prev,
        [idString]: data[0]
      }));
    }
  };

  const handleInitiateCompletion = async (questionData, mcqSelection) => {
    if (!session) return;
    const idString = String(questionData.unique_id);
    const existingEntry = userProgress[idString];

    // Determine if it is currently "Completed"
    // We consider it completed if we have recorded data
    const isCurrentlyCompleted = existingEntry && (existingEntry.score !== null || existingEntry.selected_option !== null || existingEntry.notes);

    // If already complete, we are "Uncompleting" it (Toggle OFF)
    if (isCurrentlyCompleted) {
      
      // If it is FLAGGED, we cannot delete the row. We must just nullify completion data.
      if (existingEntry.is_flagged) {
        const payload = {
           ...existingEntry,
           score: null,
           selected_option: null,
           notes: null
        };

        setUserProgress(prev => ({ ...prev, [idString]: payload })); // Optimistic
        await supabase.from('user_progress').upsert(payload, { onConflict: 'user_id,question_id' });
      } 
      // If NOT flagged, we can delete the row entirely
      else {
        const newProgress = { ...userProgress };
        delete newProgress[idString];
        setUserProgress(newProgress); // Optimistic UI update
        
        await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
      }
      return;
    }

    // If new (or just flagged but not done), open modal
    setPendingQuestion(questionData);
    setPendingMCQSelection(mcqSelection);
    setModalInitialData(null); // Force new entry mode in modal
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
    const currentProgress = userProgress[idString] || {};

    // 2. Prepare Score & Selection
    let finalScore = modalData.score;
    
    if (pendingQuestion.type === 'MCQ') {
        if (pendingMCQSelection !== null) {
            const isCorrect = pendingMCQSelection === pendingQuestion.correctAnswerIndex;
            finalScore = isCorrect ? 1 : 0;
        } 
        else if (modalInitialData) {
            finalScore = modalInitialData.score;
        }
    }

    const finalSelection = pendingQuestion.type === 'MCQ' 
        ? (pendingMCQSelection ?? modalInitialData?.selected_option) 
        : null;

    // 3. Prepare Payload (Preserve existing flag status!)
    const payload = {
      user_id: session.user.id,
      question_id: idString, 
      notes: modalData.notes,
      score: finalScore,
      selected_option: finalSelection,
      is_flagged: currentProgress.is_flagged || false // Preserve flag
    };

    // 4. Update UI Optimistically
    setModalOpen(false);
    setPendingQuestion(null);
    setPendingMCQSelection(null);

    const optimisticId = currentProgress.id; 
    setUserProgress(prev => ({
        ...prev,
        [idString]: { ...payload, id: optimisticId }
    }));

    // 5. UPSERT to Database
    const { data, error } = await supabase
        .from('user_progress')
        .upsert(payload, { onConflict: 'user_id,question_id' })
        .select();

    // 6. Handle Response
    if (error) {
        console.error("Error saving progress:", error);
        alert(`Error saving: ${error.message}`);
        fetchUserProgress(session.user.id); 
    } else if (data && data.length > 0) {
        setUserProgress(prev => ({
            ...prev,
            [idString]: data[0]
        }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- CHECK COMPLETION STATUS HELPER ---
  // A question is "Done" if it has specific data recorded, not just if the row exists (because row might just be a flag)
  const checkIsCompleted = (id) => {
    const p = userProgress[String(id)];
    if (!p) return false;
    // It is completed if there is a score, a selection, or notes. 
    // Note: checking for non-null because score can be 0.
    return p.score !== null || p.selected_option !== null || (p.notes && p.notes.length > 0);
  };

  const checkIsFlagged = (id) => {
    return userProgress[String(id)]?.is_flagged === true;
  }

  // --- FILTERING & SORTING ---
  const filteredQuestions = useMemo(() => {
    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;
      return true;
    });

    return result.sort((a, b) => {
      // New Sort: Flagged
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

  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder, userProgress]); // Added userProgress dependency for sort


  // --- RENDERING ---

  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;

  if (showHistory) {
    return <VersionHistory onClose={() => setShowHistory(false)} />;
  }

  const topics = [...new Set(questions.map(q => q.topic))].sort();
  const subtopics = [...new Set(questions.filter(q => selectedTopic === 'All' || q.topic === selectedTopic).map(q => q.subtopic))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalQuestionsCount = filteredQuestions.length;
  // Update counter to use specific check logic
  const completedCount = filteredQuestions.filter(q => checkIsCompleted(q.unique_id)).length;
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

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
                <option value="Flagged">Flagged First</option>
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