import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Award, StickyNote } from 'lucide-react';

const CompletionModal = ({ isOpen, onClose, onSave, question, type, initialData }) => {
  if (!isOpen || !question) return null;

  const [notes, setNotes] = useState('');
  const [score, setScore] = useState('');

  // Reset or Pre-fill data when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes(initialData?.notes || '');
      setScore(initialData?.score !== undefined && initialData?.score !== null ? initialData.score : '');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    onSave({
      notes,
      // Only pass score back if it's SAQ. MCQ score is handled by parent.
      score: type === 'SAQ' ? score : null
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {initialData ? <StickyNote className="w-5 h-5 text-teal-200" /> : <MessageSquare className="w-5 h-5 text-teal-200" />}
            {initialData ? 'Review Notes' : 'Complete Question'} <span className="font-mono opacity-75">{question.id}</span>
          </h2>
          <button onClick={onClose} className="text-teal-200 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* SAQ Score Input (Hidden for MCQ) */}
          {type === 'SAQ' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-500" />
                Score Obtained
              </label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                autoFocus={!initialData} // Only autofocus if new
              />
              <p className="text-xs text-gray-400 mt-1">Enter the marks you scored for this answer.</p>
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes & Reflections
            </label>
            <textarea
              rows={4}
              placeholder="Write down any key takeaways, mistakes, or mnemonics..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-shadow"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
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
            {initialData ? 'Update Notes' : 'Save & Mark Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionModal;