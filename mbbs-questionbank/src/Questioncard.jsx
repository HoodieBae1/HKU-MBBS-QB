import React, { useState, useEffect } from 'react'; 
import { ChevronDown, ChevronUp, CheckCircle2, Bot, BrainCircuit, CheckSquare, Square, StickyNote, Flag } from 'lucide-react';

const QuestionCard = ({ data, index, isCompleted, isFlagged, onToggleComplete, onToggleFlag, onReviewNotes, initialSelection }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const isMCQ = data.type === 'MCQ';

  // --- SYNC WITH DB ---
  useEffect(() => {
    if (initialSelection !== undefined && initialSelection !== null) {
      setSelectedOption(initialSelection);
      setIsRevealed(true);
    } else if (!isCompleted) {
      setSelectedOption(null);
      setIsRevealed(false);
    }
  }, [initialSelection, isCompleted]);

  // --- HANDLERS ---
  const handleMCQSelect = (idx) => {
    if (selectedOption !== null) return; 
    setSelectedOption(idx);
    setIsRevealed(true); 
  };

  const handleMarkDoneClick = () => {
    onToggleComplete(selectedOption);
  };
  
  const getOptionStyle = (idx) => {
    if (selectedOption === null) return 'hover:bg-slate-50 cursor-pointer border-gray-200';
    if (idx === data.correctAnswerIndex) return 'bg-emerald-100 border-emerald-500 text-emerald-800 font-medium';
    if (idx === selectedOption) return 'bg-red-50 border-red-300 text-red-700'; 
    return 'opacity-50 border-gray-100'; 
  };

  return (
    <div className={`rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${isCompleted ? 'bg-green-50/50 border-green-200 opacity-75' : 'bg-white border-gray-200'} ${isFlagged ? 'ring-2 ring-orange-300 ring-offset-2' : ''}`}>
       
       <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
         <div className="flex gap-2 text-xs font-semibold">
          <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded border border-teal-200">
            {data.topic}
          </span>
          <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded border border-slate-300 truncate max-w-[150px] md:max-w-none">
            {data.subtopic}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          
          {/* NEW: FLAG BUTTON */}
          <button
            onClick={onToggleFlag}
            className={`flex items-center justify-center p-1.5 rounded transition-colors ${
              isFlagged 
                ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            }`}
            title={isFlagged ? "Remove Flag" : "Flag for Review"}
          >
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
          </button>

          {/* REVIEW NOTES BUTTON */}
          {isCompleted && (
            <button
              onClick={onReviewNotes}
              className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-white text-gray-500 border border-gray-200 hover:text-teal-600 hover:border-teal-300 transition-colors"
              title="Review Notes"
            >
              <StickyNote className="w-4 h-4" />
              Notes
            </button>
          )}

          {/* COMPLETED TOGGLE BUTTON */}
          <button 
            onClick={handleMarkDoneClick}
            className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${
              isCompleted 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-white text-gray-400 border border-gray-200 hover:text-teal-600 hover:border-teal-300'
            }`}
          >
            {isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {isCompleted ? 'Done' : 'Mark Done'}
          </button>
          
          {/* ID Badge */}
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            {data.id}
          </span>
        </div>
      </div>

      {/* --- BODY --- */}
      <div className="p-5">
        <h3 className="text-lg text-gray-800 font-medium leading-relaxed whitespace-pre-line mb-6">
          <span className="font-bold text-gray-400 mr-2">Q{index + 1}.</span>
          {data.question}
        </h3>

        {/* INTERACTION: MCQ OPTIONS */}
        {isMCQ && data.options && (
          <div className="flex flex-col gap-3">
            {data.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(i)}
                disabled={selectedOption !== null}
                className={`w-full text-left px-4 py-3 border rounded-lg transition-all duration-200 ${getOptionStyle(i)}`}
              >
                <span className="mr-3 font-mono text-xs uppercase text-gray-500">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* --- REVEALED SOLUTIONS --- */}
        {isRevealed && (
          <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4" />
                Goddisk Answer
              </div>
              <p className="text-emerald-900 whitespace-pre-line leading-relaxed">
                {data.official_answer}
              </p>
            </div>

            {data.ai_answer && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 relative overflow-hidden">
                <BrainCircuit className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-100/50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm uppercase tracking-wide">
                    <Bot className="w-4 h-4" />
                    AI Analysis
                  </div>
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 border ${data.ai_answer.agreement === 'Agree' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {data.ai_answer.agreement}
                    </span>
                    <p className="text-indigo-900 leading-relaxed italic text-sm">"{data.ai_answer.explanation}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isMCQ && (
        <button 
          onClick={() => setIsRevealed(!isRevealed)}
          className="w-full py-3 bg-gray-50 border-t border-gray-100 text-sm font-semibold text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          {isRevealed ? <><span className="mr-1">Hide Solutions</span> <ChevronUp className="w-4 h-4"/></> : <><span className="mr-1">Show Solutions</span> <ChevronDown className="w-4 h-4"/></>}
        </button>
      )}
    </div>
  );
};

export default QuestionCard;