import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Award, StickyNote, PenTool, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor'; 

const CompletionModal = ({ isOpen, onClose, onSave, question, type, initialData }) => {
  const [notes, setNotes] = useState('');
  const [userResponse, setUserResponse] = useState(''); 
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  
  // --- FIX START: Data Loading Gate ---
  // We use this to ensure we don't render the heavy editors until the data is fully synced.
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setNotes(initialData.notes || '');
      setUserResponse(initialData.user_response || ''); 
      setScore(initialData.score !== undefined && initialData.score !== null ? initialData.score : '');
      setMaxScore(initialData.max_score || ''); 
      
      // Allow a tiny tick for state to settle before rendering the editors
      // This prevents the "Empty Editor" flash/bug
      const timer = setTimeout(() => setDataLoaded(true), 10);
      return () => clearTimeout(timer);
    } else {
      setDataLoaded(false);
    }
  }, [isOpen, initialData, type, question?.unique_id]);
  // --- FIX END ---

  const handleSave = () => {
    if (type === 'SAQ' && (score !== '' || maxScore !== '')) {
        const s = parseFloat(score);
        const m = parseFloat(maxScore);
        
        if (isNaN(s) || isNaN(m)) {
            alert("Please enter valid numbers for score.");
            return;
        }
        if (s > m) {
            alert("Score cannot be higher than the total marks.");
            return;
        }
    }

    onSave({
      notes,
      user_response: userResponse, 
      score: score !== '' ? parseFloat(score) : null,
      max_score: maxScore !== '' ? parseFloat(maxScore) : 1
    });
  };
  
  return (
    <>
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] z-[100] bg-white shadow-[-5px_0_25px_-5px_rgba(0,0,0,0.1)] border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* Header */}
        <div className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {initialData && (initialData.notes || initialData.score) ? <StickyNote className="w-5 h-5 text-teal-200" /> : <MessageSquare className="w-5 h-5 text-teal-200" />}
            {initialData && (initialData.notes || initialData.score) ? 'Edit Notes & Score' : 'Add Notes & Score'}
          </h2>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition-colors p-1 hover:bg-teal-600 rounded">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
          
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-2">
             <span>Ref: {question?.id}</span>
             <span className="bg-gray-100 px-1 rounded text-gray-500">{type}</span>
          </div>

          {/* SAQ: User Response Input */}
          {type === 'SAQ' && (
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm min-h-[200px]">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-500" />
                Your Answer
              </label>
              
              {/* --- FIX: Only render Editor when dataLoaded is true --- */}
              {dataLoaded ? (
                  <RichTextEditor 
                    key={`response-${question?.unique_id}`}
                    value={userResponse}
                    onChange={setUserResponse}
                    placeholder="Type your answer here..."
                  />
              ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading editor...
                  </div>
              )}
            </div>
          )}

          {/* SAQ: Score Inputs */}
          {type === 'SAQ' && (
            <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-300"></div>
              <label className="block text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Self Evaluation
              </label>
              
              <div className="flex items-center gap-3">
                  <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Marks Scored</label>
                      <input
                        type="number"
                        placeholder="-"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-center font-bold text-lg"
                      />
                  </div>
                  <div className="text-gray-300 mt-5 text-xl font-light">/</div>
                  <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Total Marks</label>
                      <input
                        type="number"
                        placeholder="-"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-center font-bold text-lg bg-gray-50"
                      />
                  </div>
              </div>
            </div>
          )}

          {/* MCQ Score Display */}
          {type === 'MCQ' && initialData && initialData.selected_option !== null && (
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                <span className="text-sm font-semibold text-gray-600">Current Status:</span>
                <span className={`font-mono font-bold text-sm px-2 py-1 rounded ${initialData.score > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {initialData.score > 0 ? 'Correct' : 'Incorrect'}
                </span>
             </div>
          )}

          {/* Notes Input */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm min-h-[200px]">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes & Reflections
            </label>
            <div className="bg-yellow-50 text-yellow-800 p-2 mb-2 rounded text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Images pasted here count towards your database quota. Resize them before pasting!
            </div>
            
            {/* --- FIX: Only render Editor when dataLoaded is true --- */}
            {dataLoaded ? (
                <RichTextEditor 
                    key={`notes-${question?.unique_id}`}
                    value={notes}
                    onChange={setNotes}
                    placeholder="Write down key takeaways, mnemonics..."
                />
            ) : (
                <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading editor...
                </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 flex justify-between items-center gap-3 border-t border-gray-200 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-lg shadow-teal-600/20 flex items-center gap-2 transition-all transform active:scale-95"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
};

export default CompletionModal;