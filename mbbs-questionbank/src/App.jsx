import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, CheckCircle2, Loader2, ArrowUpDown, LogOut, CheckSquare } from 'lucide-react';
import { supabase } from './supabase';
import QuestionCard from './QuestionCard';
import Auth from './Auth';

const App = () => {
  // --- STATE ---
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Stores Set of completed "unique_id"s
  const [completedIds, setCompletedIds] = useState(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');

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
        setCompletedIds(new Set());
      }
    });

    // B. Fetch Data
    fetch('/questions.json')
      .then(res => res.json())
      .then(data => {
        // Validate Data
        const cleanData = Array.isArray(data) ? data.map(q => ({
          ...q,
          // Ensure unique_id exists (critical)
          unique_id: q.unique_id !== undefined ? q.unique_id : `missing-${Math.random()}`,
          
          // Display Fields
          id: q.id || `No ID`, 
          topic: q.topic?.trim() || 'Uncategorized', 
          subtopic: q.subtopic?.trim() || 'General', 
          type: q.type || 'SAQ'
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
    // We fetch the 'question_id' column which now stores your 'unique_id'
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
    } else {
      // Convert DB strings back to numbers (if your unique_id is number) 
      // or keep as string to match safely. Let's force String comparison.
      const ids = new Set(data.map(row => String(row.question_id)));
      setCompletedIds(ids);
    }
  };

  // --- TOGGLE COMPLETE ---
  const handleToggleComplete = async (uniqueId) => {
    if (!session) return;

    // Convert to string for DB consistency
    const idString = String(uniqueId); 

    const newSet = new Set(completedIds);
    const isCurrentlyCompleted = newSet.has(idString);

    if (isCurrentlyCompleted) {
      newSet.delete(idString);
      await supabase.from('user_progress').delete().match({ user_id: session.user.id, question_id: idString });
    } else {
      newSet.add(idString);
      await supabase.from('user_progress').insert({ user_id: session.user.id, question_id: idString });
    }
    
    setCompletedIds(newSet);
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
        // Sorting still uses the String ID (e.g. M02) for the Year logic
        const getYear = (idStr) => {
          if (!idStr || idStr.length < 3) return 0;
          const val = parseInt(idStr.substring(1, 3), 10);
          return isNaN(val) ? 0 : (val < 50 ? 2000 + val : 1900 + val);
        };
        return getYear(b.id) - getYear(a.id);
      });
    }
    
    // Default: Sort by unique_id (Original order)
    return result.sort((a, b) => a.unique_id - b.unique_id);

  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder]);


  if (!session) return <Auth />;
  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div>{error}</div>;

  // --- LISTS FOR DROPDOWNS ---
  const topics = [...new Set(questions.map(q => q.topic))].sort();
  
  // Numerical Sorting for Subtopics
  const subtopics = [...new Set(questions.filter(q => selectedTopic === 'All' || q.topic === selectedTopic).map(q => q.subtopic))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // --- PROGRESS CALCULATION (FILTERED) ---
  // 1. Total is the number of currently visible questions
  const totalQuestionsCount = filteredQuestions.length;
  // 2. Completed is how many of the VISIBLE questions are in the completed set
  const completedCount = filteredQuestions.filter(q => completedIds.has(String(q.unique_id))).length;
  
  const progressPercentage = totalQuestionsCount > 0 ? Math.round((completedCount / totalQuestionsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* HEADER - z-50 to stay on top */}
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

      {/* FILTERS & PROGRESS BAR - z-40 to stay above cards */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[60px] z-40">
        
        {/* Progress Bar Section (Filtered) */}
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
             <span>Progress</span>
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
           <div className="relative">
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full pl-3 py-2 border rounded-lg text-sm appearance-none"><option value="Newest">Newest First</option><option value="Original">Original Order</option></select>
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

      {/* CARD LIST */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 z-0">
        {filteredQuestions.map((q, index) => (
            <QuestionCard 
              key={q.unique_id} 
              data={q} 
              index={index} 
              isCompleted={completedIds.has(String(q.unique_id))} 
              onToggleComplete={() => handleToggleComplete(q.unique_id)} 
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