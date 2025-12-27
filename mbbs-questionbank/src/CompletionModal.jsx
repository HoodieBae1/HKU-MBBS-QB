import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Award, StickyNote, PenTool } from 'lucide-react';

const CompletionModal = ({ isOpen, onClose, onSave, question, type, initialData }) => {
  if (!isOpen || !question) return null;

  const [notes, setNotes] = useState('');
  const [userResponse, setUserResponse] = useState(''); 
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');

  // Reset or Pre-fill data when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes(initialData?.notes || '');
      // This is critical: Load the response from initialData (passed from App.jsx)
      setUserResponse(initialData?.user_response || ''); 
      setScore(initialData?.score !== undefined && initialData?.score !== null ? initialData.score : '');
      setMaxScore(initialData?.max_score || ''); 
    }
  }, [isOpen, initialData, type]);

  const handleSave = () => {
    // Basic validation
    if (type === 'SAQ') {
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
      user_response: userResponse, // Pass back to App
      score: type === 'SAQ' ? parseFloat(score) : null,
      max_score: type === 'SAQ' ? parseFloat(maxScore) : 1
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 custom-scrollbar">
        
        {/* Header */}
        <div className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {initialData ? <StickyNote className="w-5 h-5 text-teal-200" /> : <MessageSquare className="w-5 h-5 text-teal-200" />}
            {initialData ? 'Review Entry' : 'Complete Question'} <span className="font-mono opacity-75">{question.id}</span>
          </h2>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* SAQ: User Response Input */}
          {type === 'SAQ' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-500" />
                Your Answer
              </label>
              <textarea
                rows={6}
                placeholder="Type your answer here..."
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-y transition-shadow bg-indigo-50/30 text-sm font-medium text-slate-800"
                autoFocus={!initialData} 
              />
            </div>
          )}

          {/* SAQ: Score Inputs */}
          {type === 'SAQ' && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <label className="block text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Self Evaluation
              </label>
              
              <div className="flex items-center gap-3">
                  <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Marks Scored</label>
                      <input
                        type="number"
                        placeholder="e.g. 3"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-center font-bold text-lg"
                      />
                  </div>
                  <div className="text-gray-400 mt-5">/</div>
                  <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Total Marks</label>
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono text-center font-bold text-lg bg-white"
                      />
                  </div>
              </div>
            </div>
          )}

          {/* MCQ Score Display (ReadOnly) */}
          {type === 'MCQ' && initialData && (
             <div className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Recorded Score:</span>
                <span className={`font-mono font-bold ${initialData.score > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {initialData.score} / 1
                </span>
             </div>
          )}

          {/* Notes Input (For both) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Notes & Reflections
            </label>
            <textarea
              rows={3}
              placeholder="Any key takeaways, mnemonics, or why you got it wrong..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-shadow text-sm"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 sticky bottom-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            {initialData ? 'Update Entry' : 'Save & Mark Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionModal;