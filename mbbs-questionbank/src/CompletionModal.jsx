import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Award, StickyNote, Calculator } from 'lucide-react';

const CompletionModal = ({ isOpen, onClose, onSave, question, type, initialData }) => {
  if (!isOpen || !question) return null;

  const [notes, setNotes] = useState('');
  
  // SAQ Specific States
  const [achieved, setAchieved] = useState('');
  const [total, setTotal] = useState('');

  // Reset or Pre-fill data when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes(initialData?.notes || '');
      
      // If editing an existing SAQ, we try to infer, but usually we just reset 
      // because we only store the final percentage in the DB.
      // If you stored "7/10" in notes, we leave it to the user to re-enter if they are updating.
      setAchieved(''); 
      setTotal('');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    // Validation for SAQ
    if (type === 'SAQ') {
      if (!achieved || !total) {
        alert("Please enter both your score and the total possible marks.");
        return;
      }
      if (parseFloat(total) === 0) {
        alert("Total score cannot be zero.");
        return;
      }
    }

    onSave({
      notes,
      achieved: type === 'SAQ' ? parseFloat(achieved) : null,
      total: type === 'SAQ' ? parseFloat(total) : null
    });
  };

  const calculatedPercentage = (achieved && total && total > 0) 
    ? Math.round((parseFloat(achieved) / parseFloat(total)) * 100) 
    : 0;

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
          
          {/* SAQ Score Inputs */}
          {type === 'SAQ' && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <label className="block text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Self Grading
              </label>
              
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase">You Scored</span>
                  <input
                    type="number"
                    placeholder="e.g. 3"
                    value={achieved}
                    onChange={(e) => setAchieved(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-lg"
                    autoFocus={!initialData}
                  />
                </div>
                <div className="pb-3 text-gray-400 font-bold">/</div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Out Of</span>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono text-lg"
                  />
                </div>
              </div>

              {achieved && total && (
                 <div className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-700 justify-end">
                    <Calculator className="w-3 h-3" />
                    Calculated Accuracy: {calculatedPercentage}%
                 </div>
              )}
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