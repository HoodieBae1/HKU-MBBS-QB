import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, Loader2, ArrowUpDown, LogOut, CheckSquare } from 'lucide-react';
import { supabase } from './supabase';
import QuestionCard from './QuestionCard';
import CompletionModal from './CompletionModal';
import Auth from './Auth';

const App = () => {
  // --- STATE ---
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Stores Dictionary of progress: { 'unique_id': { notes, score, selected_option, ... } }
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
  const [modalInitialData, setModalInitialData] = useState(null); // For reviewing/editing

  // --- 1. INITIALIZE ---
  useEffect(() => {
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
    // Fetch all columns needed
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id, notes, score, selected_option')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
    } else {
      // Create a dictionary for easy lookup
      const progressMap = {};
      data.forEach(row => {
        progressMap[String(row.question_id)] = row;
      });
      setUserProgress(progressMap);
    }
  };

  // --- ACTIONS ---

  // 1. Mark Done (New) OR Toggle Off
  const handleInitiateCompletion = async (questionData, mcqSelection) => {
    if (!session) return;
    const idString = String(questionData.unique_id);

    // If already complete, remove it
    if (userProgress[idString]) {
      const newProgress = { ...userProgress };
      delete newProgress[idString];
      setUserProgress(newProgress);
      await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
      return;
    }

    // If new, open modal
    setPendingQuestion(questionData);
    setPendingMCQSelection(mcqSelection);
    setModalInitialData(null); // No initial data for new entry
    setModalOpen(true);
  };

  // 2. Review Notes (Existing)
  const handleReviewNotes = (questionData) => {
    const idString = String(questionData.unique_id);
    const existingData = userProgress[idString];
    
    if (existingData) {
      setPendingQuestion(questionData);
      setModalInitialData(existingData); // Pass existing notes/score
      setModalOpen(true);
    }
  };

  // 3. Save (Confirm Modal)
  const handleConfirmCompletion = async (modalData) => {
    if (!session || !pendingQuestion) return;

    const idString = String(pendingQuestion.unique_id);
    
    // AUTOMATIC SCORING LOGIC FOR MCQ
    let finalScore = modalData.score; // Use input from modal (SAQ) by default
    
    if (pendingQuestion.type === 'MCQ') {
        // If reviewing existing, keep old selection if not changed (implied complex logic), 
        // but simple version: we are either saving new or updating notes.
        // For new MCQ save:
        if (pendingMCQSelection !== null) {
            const isCorrect = pendingMCQSelection === pendingQuestion.correctAnswerIndex;
            finalScore = isCorrect ? 1 : 0;
        } else if (modalInitialData) {
            // Preserving old score if just editing notes
            finalScore = modalInitialData.score;
        }
    }

    const payload = {
      user_id: session.user.id,
      question_id: idString,
      notes: modalData.notes,
      score: finalScore,
      selected_option: pendingQuestion.type === 'MCQ' ? (pendingMCQSelection ?? modalInitialData?.selected_option) : null
    };

    // Optimistic Update
    setUserProgress(prev => ({
        ...prev,
        [idString]: payload
    }));

    setModalOpen(false);
    setPendingQuestion(null);

    // Upsert handles both Insert (New) and Update (Edit Notes)
    const { error } = await supabase.from('user_progress').upsert(payload);
    
    if (error) {
      console.error("Error saving progress:", error);
      alert("Failed to save progress.");
      fetchUserProgress(session.user.id); // Revert on error
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- FILTERING ---
  const filteredQuestions = useMemo(() => {
    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;
      return true;
    });

    if (sortOrder === 'Newest') {
      return result.sort((a, b) => {
        const getYear = (idStr) => {
          if (!idStr || idStr.length < 3) return 0;
          const val = parseInt(idStr.substring(1, 3), 10);
          return isNaN(val) ? 0 : (val < 50 ? 2000 + val : 1900 + val);
        };
        return getYear(b.id) - getYear(a.id);
      });
    }
    return result.sort((a, b) => a.unique_id - b.unique_id);
  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder]);

  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;

  const topics = [...new Set(questions.map(q => q.topic))].sort();
  const subtopics = [...new Set(questions.filter(q => selectedTopic === 'All' || q.topic === selectedTopic).map(q => q.subtopic))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalQuestionsCount = filteredQuestions.length;
  // Count using Object keys check
  const completedCount = filteredQuestions.filter(q => userProgress[String(q.unique_id)]).length;
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 relative">
      
      <CompletionModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleConfirmCompletion}
        question={pendingQuestion}
        type={pendingQuestion?.type}
        initialData={modalInitialData} // Pass existing data here
      />

      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-7 h-7 text-teal-200" />
            <div>
              <h1 className="text-lg font-bold">MBBS Finals</h1>
              <p className="text-[10px] text-teal-200 uppercase tracking-wider">Question Bank</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-xs text-teal-100">Logged in as</p>
              <p className="text-xs font-bold">{session.user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-teal-600 rounded-full transition"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[60px] z-40">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
             <span>Progress</span>
             <span>{completedCount} / {totalQuestionsCount} ({progressPercentage}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2 grid grid-cols-1 md:grid-cols-4 gap-4">
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
           <div className="relative">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none"><option value="Newest">Newest First</option><option value="Original">Original Order</option></select>
              <ArrowUpDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"/>
           </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 pb-2 pt-2 border-t flex justify-between text-xs text-gray-500">
          <span>Showing <strong>{filteredQuestions.length}</strong> questions</span>
          <span className="flex items-center gap-1 text-teal-700 font-bold">
            <CheckSquare className="w-3 h-3"/> Filtered View
          </span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 z-0">
        {filteredQuestions.map((q, index) => (
            <QuestionCard 
              key={q.unique_id} 
              data={q} 
              index={index} 
              // Pass boolean based on object existence
              isCompleted={!!userProgress[String(q.unique_id)]} 
              onToggleComplete={(mcqSelection) => handleInitiateCompletion(q, mcqSelection)} 
              // Pass handler for reviewing
              onReviewNotes={() => handleReviewNotes(q)}
            />
        ))}
        {filteredQuestions.length === 0 && (
          <div className="text-center py-12"><p className="text-gray-500">No questions found.</p></div>
        )}
      </main>
    </div>
  );
};

export default App;