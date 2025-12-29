import React, { useState, useEffect, useRef } from 'react'; 
import { ChevronDown, ChevronUp, CheckCircle2, Bot, BrainCircuit, CheckSquare, Square, StickyNote, Flag, Sparkles, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from './supabase'; 
import ReactMarkdown from 'react-markdown'; 
import RichTextEditor from './RichTextEditor'; 

const QuestionCard = ({ data, index, isCompleted, isFlagged, hasNotes, existingResponse, score, maxScore, onToggleComplete, onToggleFlag, onReviewNotes, initialSelection, onRedo }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [saqInput, setSaqInput] = useState('');

  // AI State
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // --- HOLD TO REDO STATE ---
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const HOLD_DURATION = 800; // 0.8 seconds to confirm (feels snappier)

  const isMCQ = data.type === 'MCQ';

  // --- SYNC WITH DB ---
  useEffect(() => {
    if (initialSelection !== undefined && initialSelection !== null) {
      setSelectedOption(initialSelection);
      setIsRevealed(true);
    } else if (!isCompleted) {
      setSelectedOption(null);
      setIsRevealed(false);
      setAnalysisData(null); 
      setAnalysisError(null);
    }
    
    // Sync Text Box
    if (existingResponse !== undefined && existingResponse !== saqInput) {
        setSaqInput(existingResponse || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelection, isCompleted, existingResponse]); 

  const handleSaqChange = (val) => setSaqInput(val);

  const handleMCQSelect = (idx) => {
    if (isCompleted) return; // LOCKED if completed. Must Redo to change.
    if (selectedOption !== null) return; 
    setSelectedOption(idx);
    setIsRevealed(true); 
    onToggleComplete(idx, null);
  };

  // --- HOLD LOGIC ---
  const startHold = () => {
    if (!isCompleted) return; // Only allow hold on completed questions
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();

    // Animate progress bar
    progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        setHoldProgress(pct);
        
        if (pct >= 100) {
            clearInterval(progressIntervalRef.current);
        }
    }, 16);

    // Trigger action after duration
    holdTimerRef.current = setTimeout(() => {
        completeRedo();
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    if (!isCompleted) return;
    setIsHolding(false);
    setHoldProgress(0);
    clearTimeout(holdTimerRef.current);
    clearInterval(progressIntervalRef.current);
  };

  const completeRedo = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (onRedo) onRedo();
  };

  const handleMainButtonClick = () => {
    // Only handles the "Mark Done" action for SAQs.
    // Does NOTHING if already completed (Hold required).
    if (!isCompleted && !isMCQ) {
         onToggleComplete(null, saqInput);
    }
  };

  // --- HELPERS ---
  const handleRequestAI = async () => { /* ... keep existing AI code ... */ };
  
  const getOptionStyle = (idx) => {
    // If completed, dim everything except selected
    if (isCompleted) {
        if (idx === selectedOption) return 'bg-slate-100 border-slate-400 font-bold';
        return 'opacity-40 border-gray-100 cursor-not-allowed';
    }
    // If not completed
    if (selectedOption === null) return 'hover:bg-slate-50 cursor-pointer border-gray-200';
    if (idx === data.correctAnswerIndex) return 'bg-emerald-100 border-emerald-500 text-emerald-800 font-medium';
    if (idx === selectedOption) return 'bg-red-50 border-red-300 text-red-700'; 
    return 'opacity-50 border-gray-100'; 
  };
  
  const displayMaxScore = maxScore || (isMCQ ? 1 : '-');

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
          {/* Score Badge */}
          {isCompleted && (score !== undefined && score !== null) && (
              <div className={`flex items-center gap-1 px-2 py-1 border rounded text-xs font-bold font-mono mr-1 ${
                  score === displayMaxScore 
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}>
                  {score} / {displayMaxScore}
              </div>
          )}

          {/* Flag (Auto-Saves Text) */}
          <button
            onClick={() => onToggleFlag(saqInput)}
            className={`flex items-center justify-center p-1.5 rounded transition-colors ${
              isFlagged 
                ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            }`}
          >
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
          </button>

          {/* Notes (Edit Mode) */}
          <button
            onClick={() => onReviewNotes(saqInput)}
            className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${
                hasNotes 
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200' 
                : 'bg-white text-gray-500 border border-gray-200 hover:text-teal-600 hover:border-teal-300'
            }`}
          >
            <StickyNote className={`w-4 h-4 ${hasNotes ? 'fill-yellow-500 text-yellow-600' : ''}`} />
            {hasNotes ? 'View Notes/Edit Question' : 'Notes'}
          </button>

          {/* DONE / REDO BUTTON */}
          <button 
            // Click only works if NOT completed (to mark done)
            onClick={handleMainButtonClick}
            // Hold events only work if COMPLETED (to redo)
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            
            className={`relative overflow-hidden flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-all select-none ${
              isCompleted 
                ? 'bg-green-100 text-green-700 border-green-200 cursor-pointer' 
                : 'bg-white text-gray-400 border-gray-200 hover:text-teal-600 hover:border-teal-300'
            }`}
          >
            {/* Progress Bar Layer */}
            {isCompleted && (
                <div 
                    className="absolute inset-0 bg-red-100 z-0 transition-all duration-75 ease-linear"
                    style={{ width: `${holdProgress}%` }}
                />
            )}
            
            {/* Label Layer */}
            <div className="relative z-10 flex items-center gap-1.5">
                {isCompleted ? (
                    isHolding ? (
                        <>
                           <RotateCcw className="w-4 h-4 animate-spin-slow" />
                           <span className="text-red-700">Hold to Redo</span>
                        </>
                    ) : (
                        <>
                           <CheckSquare className="w-4 h-4" />
                           Done
                        </>
                    )
                ) : (
                    <>
                        <Square className="w-4 h-4" />
                        Mark Done
                    </>
                )}
            </div>
          </button>
          
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            {data.id}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg text-gray-800 font-medium leading-relaxed whitespace-pre-line mb-6">
          <span className="font-bold text-gray-400 mr-2">Q{index + 1}.</span>
          {data.question}
        </h3>

        {isMCQ && data.options && (
          <div className="flex flex-col gap-3">
            {data.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(i)}
                // DISABLE if done. Must Redo first.
                disabled={isCompleted}
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

        {/* ... Rest of SAQ input and Solutions rendering ... */}
        {!isMCQ && (
            <div className="mb-4">
                <div className={`${isCompleted ? '' : ''}`}> 
                    <RichTextEditor 
                        value={saqInput}
                        onChange={handleSaqChange} 
                        placeholder="Type your answer here..."
                        readOnly={false} 
                    />
                </div>
            </div>
        )}
        
        {isRevealed && (
          <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
             {/* ... (Keep AI and Solution display code) ... */}
             <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
               <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm uppercase tracking-wide">
                 <CheckCircle2 className="w-4 h-4" />
                 Goddisk Answer
               </div>
               <p className="text-emerald-900 whitespace-pre-line leading-relaxed">{data.official_answer}</p>
             </div>
             {/* ... */}
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