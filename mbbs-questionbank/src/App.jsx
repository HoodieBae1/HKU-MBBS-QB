import React, { useState, useMemo, useEffect } from 'react';
import { Filter, BookOpen, Stethoscope, CheckCircle2, Loader2, ArrowUpDown } from 'lucide-react';
import QuestionCard from './QuestionCard';

const App = () => {
  // --- STATE ---
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Sort States
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest'); // Default to Newest

  // --- 1. FETCH & NORMALIZE DATA ---
  useEffect(() => {
    fetch('/questions.json')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Data is not an array");

        const cleanData = data.map((q, index) => ({
          ...q,
          _uid: `uid-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          id: q.id || `No ID`, 
          topic: q.topic ? q.topic.trim() : 'Uncategorized', 
          subtopic: q.subtopic ? q.subtopic.trim() : 'General', 
          type: q.type || 'SAQ'
        }));

        setQuestions(cleanData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setError("Could not load questions.json");
        setLoading(false);
      });
  }, []);

  // --- 2. DERIVED DROPDOWN OPTIONS ---
  
  const naturalSort = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  const topics = useMemo(() => {
    const unique = [...new Set(questions.map(q => q.topic))];
    return unique.sort(naturalSort);
  }, [questions]);

  const subtopics = useMemo(() => {
    let relevantQuestions = questions;
    if (selectedTopic !== 'All') {
      relevantQuestions = questions.filter(q => q.topic === selectedTopic);
    }
    const unique = [...new Set(relevantQuestions.map(q => q.subtopic))];
    return unique.sort(naturalSort);
  }, [questions, selectedTopic]);

  // --- 3. FILTERING & SORTING LOGIC ---
  const filteredQuestions = useMemo(() => {
    // A. Filter Step
    // .filter() creates a new array, preserving the original index order
    let result = questions.filter(q => {
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedType !== 'All' && q.type !== selectedType) return false;
      return true;
    });

    // B. Sort Step
    if (sortOrder === 'Newest') {
      // Sort by Year extracted from ID
      return result.sort((a, b) => {
        const getYear = (idString) => {
          if (!idString || typeof idString !== 'string' || idString.length < 3) return 0;
          
          // Extract 2nd and 3rd chars (e.g. "M25" -> "25")
          const digits = idString.substring(1, 3);
          const val = parseInt(digits, 10);
          
          if (isNaN(val)) return 0;

          // Pivot: 00-50 = 2000s, 51-99 = 1900s
          return val < 50 ? 2000 + val : 1900 + val;
        };

        const yearA = getYear(a.id);
        const yearB = getYear(b.id);

        // Descending order (Newest first)
        return yearB - yearA; 
      });
    }

    // If 'Original', simply return the filtered list (which is already in file order)
    return result;

  }, [questions, selectedTopic, selectedSubtopic, selectedType, sortOrder]);


  // --- HANDLERS ---
  const handleTopicChange = (e) => {
    setSelectedTopic(e.target.value);
    setSelectedSubtopic('All'); 
  };

  const handleReset = () => {
    setSelectedTopic('All');
    setSelectedSubtopic('All');
    setSelectedType('All');
    setSortOrder('Newest');
  };

  // --- RENDER ---
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-teal-200" />
          <div>
            <h1 className="text-xl font-bold">HKU MBBS Finals</h1>
            <p className="text-xs text-teal-200">Question Bank</p>
          </div>
        </div>
      </header>

      {/* FILTER PANEL */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[72px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. TOPIC */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Topic</label>
            <div className="relative">
              <select 
                value={selectedTopic} 
                onChange={handleTopicChange}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
              >
                <option value="All">All Topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 2. SUBTOPIC */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subtopic</label>
            <div className="relative">
              <select 
                value={selectedSubtopic} 
                onChange={(e) => setSelectedSubtopic(e.target.value)}
                disabled={subtopics.length === 0}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
              >
                <option value="All">All Subtopics</option>
                {subtopics.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <BookOpen className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 3. TYPE */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
            <div className="relative">
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="MCQ">MCQ Only</option>
                <option value="SAQ">SAQ Only</option>
              </select>
              <CheckCircle2 className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* 4. SORT ORDER (NEW) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sort Order</label>
            <div className="relative">
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
              >
                <option value="Newest">Year (Newest First)</option>
                <option value="Original">Original File Order</option>
              </select>
              <ArrowUpDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* STATUS */}
        <div className="max-w-6xl mx-auto px-4 pb-2 text-xs flex justify-between items-center text-gray-500 border-t border-gray-100 mt-2 pt-2">
          <span>Showing <strong>{filteredQuestions.length}</strong> results</span>
          <button 
            onClick={handleReset}
            className="text-teal-600 hover:underline font-semibold"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* QUESTIONS LIST */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q, index) => (
            <QuestionCard key={q._uid} data={q} index={index} />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 mt-4">
            <p className="text-gray-500">No questions found.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;