import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Award, StickyNote, PenTool, ChevronRight } from 'lucide-react';

const CompletionModal = ({ isOpen, onClose, onSave, question, type, initialData }) => {
  const [notes, setNotes] = useState('');
  const [userResponse, setUserResponse] = useState(''); 
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNotes(initialData?.notes || '');
      setUserResponse(initialData?.user_response || ''); 
      setScore(initialData?.score !== undefined && initialData?.score !== null ? initialData.score : '');
      setMaxScore(initialData?.max_score || ''); 
    }
  }, [isOpen, initialData, type]);

  const handleSave = () => {
    // SAQ Validation for Auto-Complete
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

  // We do not render a backdrop div, allowing interaction with the main page.
  
  return (
    <>
      {/* Side Panel (Drawer) */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] z-[100] bg-white shadow-[-5px_0_25px_-5px_rgba(0,0,0,0.1)] border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
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
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-500" />
                Your Answer
              </label>
              <textarea
                rows={6}
                placeholder="Type your answer here..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y transition-shadow bg-indigo-50/10 text-sm font-medium text-slate-800"
              />
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
              <p className="text-xs text-orange-600/80 mb-4">
                Fill these fields (Score + Total) to automatically mark this question as "Done".
              </p>
              
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

          {/* MCQ Score Display (ReadOnly) */}
          {type === 'MCQ' && initialData && initialData.selected_option !== null && (
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                <span className="text-sm font-semibold text-gray-600">Current Status:</span>
                <span className={`font-mono font-bold text-sm px-2 py-1 rounded ${initialData.score > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {initialData.score > 0 ? 'Correct' : 'Incorrect'}
                </span>
             </div>
          )}

          {/* Notes Input (For both) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes & Reflections
            </label>
            <textarea
              rows={12}
              placeholder="Write down key takeaways, mnemonics, or why you got it wrong. These notes are searchable later."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-shadow text-sm leading-relaxed"
            />
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