import React, { useState, useEffect, useRef } from 'react'; 
import { ChevronDown, ChevronUp, CheckCircle2, Bot, BrainCircuit, CheckSquare, Square, StickyNote, Flag, Sparkles, Loader2, AlertCircle, RotateCcw, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 
import RichTextEditor from './RichTextEditor'; 
import DOMPurify from 'dompurify'; 

// --- 1. IMPORT KATEX & PLUGINS ---
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; 

const AI_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: '2.5 Flash Lite', baseCost: 0.005, label: 'Eco Mode', style: 'border-slate-200 hover:bg-slate-50' },
  { id: 'gemini-2.5-flash', name: '2.5 Flash', baseCost: 0.03, label: 'Standard', style: 'border-violet-200 hover:bg-violet-50' },
  { id: 'gemini-3-flash-preview', name: '3 Flash', baseCost: 0.02, label: 'Next-Gen Fast', style: 'border-cyan-200 hover:bg-cyan-50' },
  { id: 'gemini-2.5-pro', name: '2.5 Pro', baseCost: 0.10, label: 'High Reasoning', style: 'border-blue-200 hover:bg-blue-50' },
  { id: 'gemini-3-pro-preview', name: '3 Pro', baseCost: 0.12, label: 'Deepest Thought', style: 'border-fuchsia-300 bg-fuchsia-50/50 hover:bg-fuchsia-100' },
];

const QuestionCard = ({ 
    data, index, isCompleted, isFlagged, hasNotes, 
    existingResponse, score, maxScore, initialSelection,
    onToggleComplete, onToggleFlag, onReviewNotes, onRedo,
    isRevealedOverride, onToggleReveal, onTextChange,
    aiState, onRequestAI, aiEnabled,
    aiUsageCount = 0,
    isLocked = false,
    userProfile = null
}) => {
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [localInput, setLocalInput] = useState(existingResponse || '');
  const debouncedUpdateRef = useRef(null);

  const {
      loadingModel = null,
      data: analysisData = null,
      cost: analysisCost = null,
      error: analysisError = null,
      purchasedModels = [],
      selectedModel = 'gemini-2.5-flash' 
  } = aiState || {};

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const HOLD_DURATION = 800; 

  const isMCQ = data.type === 'MCQ';
  const isRevealed = isCompleted || isRevealedOverride || false;

  const isStandardUser = userProfile?.subscription_tier === 'standard';
  const isTrial = isStandardUser && userProfile?.subscription_status === 'trial';
  const costMultiplier = isStandardUser ? 20 : 1; 

  useEffect(() => {
    if (initialSelection !== undefined && initialSelection !== null) {
      setSelectedOption(initialSelection);
    } else if (!isCompleted) {
      setSelectedOption(null);
    }
  }, [initialSelection, isCompleted]); 

  useEffect(() => {
    if (existingResponse !== undefined && existingResponse !== localInput) {
        if (localInput === '' && existingResponse !== '') {
            setLocalInput(existingResponse);
        }
    }
  }, [existingResponse]); 

  const handleSaqChange = (val) => {
      setLocalInput(val);
      if (debouncedUpdateRef.current) clearTimeout(debouncedUpdateRef.current);
      debouncedUpdateRef.current = setTimeout(() => {
          onTextChange(val);
      }, 500);
  };
  
  const toggleReveal = () => {
      if (isLocked) return;
      onToggleReveal(!isRevealed);
  };

  const handleMCQSelect = (idx) => {
    if (isCompleted || isLocked) return; 
    if (selectedOption !== null) return; 
    setSelectedOption(idx);
    onToggleReveal(true);
    onToggleComplete(idx, null, 'FULL'); 
  };

  const startHold = () => {
    if (!isCompleted || isLocked) return; 
    setIsHolding(true);
    setHoldProgress(0);
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        setHoldProgress(pct);
        if (pct >= 100) clearInterval(progressIntervalRef.current);
    }, 16);
    holdTimerRef.current = setTimeout(() => completeRedo(), HOLD_DURATION);
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

  const handleNotesClick = () => {
    const viewMode = isCompleted ? 'FULL' : 'NOTES';
    onReviewNotes(localInput, viewMode); 
  };

  const handleMainButtonClick = () => {
    if (isLocked) return;
    if (!isCompleted && !isMCQ) {
         if (debouncedUpdateRef.current) clearTimeout(debouncedUpdateRef.current);
         onTextChange(localInput);
         onToggleComplete(null, localInput, 'GRADING'); 
    }
  };

  const getOptionStyle = (idx) => {
    if (!isCompleted && selectedOption === null) return 'hover:bg-slate-50 cursor-pointer border-gray-200';
    if (idx === data.correctAnswerIndex) return 'bg-emerald-100 border-emerald-500 text-emerald-800 font-medium';
    if (idx === selectedOption) return 'bg-red-50 border-red-300 text-red-700'; 
    return 'opacity-50 border-gray-100'; 
  };
  
  const displayMaxScore = maxScore || (isMCQ && isCompleted ? 1 : '-');

  const getNotesButtonLabel = () => {
      if (isCompleted) return 'View Notes/Edit Question';
      if (hasNotes) return 'View Notes';
      return 'Notes';
  };

  const isFullMarks = score === (maxScore || (isMCQ ? 1 : 0));
  
  // --- UPDATED: Added min-h-[320px] when Locked ---
  const getCardBackground = () => {
      if (isLocked) return 'bg-gray-50 border-gray-200 min-h-[320px]'; 
      if (!isCompleted) return 'bg-white border-gray-200';
      if (isFullMarks) return 'bg-green-50/50 border-green-200 opacity-75'; 
      return 'bg-red-50/50 border-red-200 opacity-75'; 
  };

  const getDoneButtonStyle = () => {
      if (isLocked) return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
      if (isCompleted) return 'bg-green-100 text-green-700 border-green-200 cursor-pointer';
      if (isMCQ) return 'bg-white text-gray-300 border-gray-200 cursor-default';
      return 'bg-white text-gray-400 border-gray-200 hover:text-teal-600 hover:border-teal-300 cursor-pointer';
  };

  const createSafeMarkup = (htmlContent) => {
    return { 
        __html: DOMPurify.sanitize(htmlContent, { 
            ADD_ATTR: ['target', 'class'], 
            USE_PROFILES: { html: true } 
        }) 
    };
  };

  return (
    <div className={`relative rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${getCardBackground()} ${isFlagged ? 'ring-2 ring-orange-300 ring-offset-2' : ''}`}>
       
       {/* --- LOCKED OVERLAY --- */}
       {isLocked && (
          <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none">
             <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mb-4 shadow-xl">
                <Lock className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Question Locked</h3>
             <p className="text-gray-600 max-w-sm mb-6">
                You have reached the limit of the Free Trial (10 MCQs / 5 SAQs). Upgrade to continue practicing.
             </p>
             <button className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-lg transition-transform active:scale-95">
                Unlock Full Access
             </button>
          </div>
       )}

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
          {isCompleted && (score !== undefined && score !== null) && (
              <div className={`flex items-center gap-1 px-2 py-1 border rounded text-xs font-bold font-mono mr-1 ${
                  score === displayMaxScore 
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                  {score} / {displayMaxScore}
              </div>
          )}

          <button onClick={() => onToggleFlag(localInput)} className={`flex items-center justify-center p-1.5 rounded transition-colors ${isFlagged ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}>
            <Flag className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
          </button>

          <button onClick={handleNotesClick} className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded transition-colors ${hasNotes ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200' : 'bg-white text-gray-500 border border-gray-200 hover:text-teal-600 hover:border-teal-300'}`}>
            <StickyNote className={`w-4 h-4 ${hasNotes ? 'fill-yellow-500 text-yellow-600' : ''}`} />
            {getNotesButtonLabel()}
          </button>

          <button onClick={handleMainButtonClick} onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold} onTouchStart={startHold} onTouchEnd={cancelHold} onContextMenu={(e) => e.preventDefault()} className={`relative overflow-hidden flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded border transition-all select-none ${getDoneButtonStyle()}`}>
            {isCompleted && (
                <div className="absolute inset-0 bg-red-100 z-0 transition-all duration-75 ease-linear" style={{ width: `${holdProgress}%` }} />
            )}
            <div className="relative z-10 flex items-center gap-1.5">
                {isCompleted ? (
                    isHolding ? <><RotateCcw className="w-4 h-4 animate-spin-slow text-red-600" /><span className="text-red-700">Hold to Redo</span></> : <><CheckSquare className="w-4 h-4" />Done</>
                ) : (
                    <><Square className="w-4 h-4" />Mark Done</>
                )}
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{data.id}</span>
            <span className="text-[10px] text-gray-400 font-mono">QUID:{data.unique_id}</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg text-gray-800 font-medium leading-relaxed mb-6">
          <span className="font-bold text-gray-400 mr-2">Q{index + 1}.</span>
          
          {isLocked ? (
             <span className="blur-sm select-none opacity-50">
               This question content is hidden because you have reached your trial limit. 
               Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
             </span>
          ) : (
             <span 
                className="whitespace-pre-line [&_img]:max-w-full [&_img]:rounded-lg [&_img]:mt-2 [&_img]:border [&_img]:border-gray-200" 
                dangerouslySetInnerHTML={createSafeMarkup(data.question)} 
             />
          )}
        </h3>

        {isMCQ && data.options && !isLocked && (
          <div className="flex flex-col gap-3">
            {data.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMCQSelect(i)}
                disabled={isCompleted}
                className={`w-full text-left px-4 py-3 border rounded-lg transition-all duration-200 ${getOptionStyle(i)}`}
              >
                <span className="mr-3 font-mono text-xs uppercase text-gray-500">{String.fromCharCode(65 + i)}</span>
                <span 
                    className="whitespace-pre-line"
                    dangerouslySetInnerHTML={createSafeMarkup(opt)}
                />
              </button>
            ))}
          </div>
        )}

        {!isMCQ && !isLocked && (
            <div className="mb-4">
                <div className={`${isCompleted ? '' : ''}`}> 
                    <RichTextEditor value={localInput} onChange={handleSaqChange} placeholder="Type your answer here..." readOnly={false} />
                </div>
            </div>
        )}
        
        {isRevealed && !isLocked && (
          <div className="mt-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
             <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
               <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-sm uppercase tracking-wide">
                 <CheckCircle2 className="w-4 h-4" />
                 Goddisk Answer
               </div>
               <div 
                 className="text-emerald-900 leading-relaxed whitespace-pre-line [&_img]:max-w-full [&_img]:rounded-lg [&_img]:mt-2"
                 dangerouslySetInnerHTML={createSafeMarkup(data.official_answer)}
               />
             </div>
            
             {data.ai_answer && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 relative overflow-hidden">
                <BrainCircuit className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-100/50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-sm uppercase tracking-wide">
                    <Bot className="w-4 h-4" />
                    AI Summary
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

            {(aiEnabled || analysisData) && (
            <div className="border border-violet-100 rounded-lg overflow-hidden bg-white shadow-sm mt-4">
                
                {analysisData && (
                  <div className="p-5 bg-gradient-to-br from-white to-violet-50/30 animate-in fade-in duration-500">
                     <div className="flex items-start justify-between mb-3 pb-3 border-b border-violet-100">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            <span className="font-bold text-sm text-violet-900 uppercase tracking-wide">
                                Professor AI's Analysis ({AI_MODELS.find(m => m.id === selectedModel)?.name})
                            </span>
                        </div>
                        {analysisCost !== null && analysisCost !== undefined && !isNaN(analysisCost) && (
                            <div className="flex flex-col items-end">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border ${analysisCost === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-violet-100 text-violet-700 border-violet-200'}`}>
                                    {analysisCost === 0 ? <><span className="font-bold">PAID</span><span>(Free)</span></> : <><span className="font-bold">COST:</span><span>${Number(analysisCost * costMultiplier).toFixed(5)}</span></>}
                                </div>
                                {isStandardUser && (
                                    <span className="text-[9px] text-gray-400 mt-0.5">Deducted from credits</span>
                                )}
                            </div>
                        )}
                     </div>
                     <div className="text-slate-700 font-serif text-sm leading-relaxed min-h-[150px]">
                       <ReactMarkdown 
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{ 
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold text-violet-900 mt-4 mb-2" {...props} />, 
                                h2: ({node, ...props}) => <h2 className="text-base font-bold text-violet-800 mt-4 mb-2 uppercase tracking-wide" {...props} />, 
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-violet-700 mt-3 mb-1" {...props} />, 
                                p: ({node, ...props}) => <p className="mb-3" {...props} />, 
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />, 
                                li: ({node, ...props}) => <li className="pl-1" {...props} />, 
                                strong: ({node, ...props}) => <strong className="font-bold text-violet-950" {...props} /> 
                            }}
                       >
                           {analysisData}
                       </ReactMarkdown>
                     </div>
                  </div>
                )}

                {aiEnabled ? (
                <div className={`bg-slate-50/50 p-4 ${analysisData ? 'border-t border-violet-100' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-violet-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                               {analysisData ? 'Switch Model / Compare' : 'Ask Professor AI'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {AI_MODELS.map((model) => {
                            const isThisLoading = loadingModel === model.id;
                            const isAnyLoading = loadingModel !== null;
                            const isCurrentView = selectedModel === model.id && analysisData;
                            const isUnlocked = purchasedModels.includes(model.id);
                            
                            const isTrialFree = isTrial && aiUsageCount < 2;
              
                            let costText = '';
                            let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200'; // Default Gray

                            if (isUnlocked) {
                                costText = 'Free (Cached)';
                                badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                            } else if (isTrialFree) {
                                costText = 'Trial (Free)';
                                badgeStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200';
                            } else {
                                // Paid / Legacy / Trial Limit Reached
                                const rawCost = model.baseCost * costMultiplier;
                                costText = `~$${rawCost.toFixed(isStandardUser ? 2 : 3)}`;
                            }
                            
                    return (
                                <button
                                    key={model.id}
                                    onClick={() => onRequestAI(model.id)}
                                    disabled={isAnyLoading}
                                    className={`
                                        relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 
                                        ${model.style} 
                                        ${isThisLoading ? 'bg-violet-100 ring-2 ring-violet-300 border-transparent' : ''}
                                        ${isCurrentView ? 'ring-2 ring-violet-500 ring-offset-1 border-transparent bg-white' : 'bg-white'}
                                        ${isAnyLoading && !isThisLoading ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm'}
                                    `}
                                >
                                    {isThisLoading ? (
                                        <Loader2 className="w-5 h-5 text-violet-600 animate-spin my-1" />
                                    ) : (
                                        <>
                                            {/* 1. Name */}
                                            <span className="text-[10px] font-bold text-slate-700 text-center leading-tight mb-1">
                                                {model.name}
                                            </span>
                                            
                                            {/* 2. Label (RESTORED) */}
                                            <span className="text-[9px] text-slate-400 font-medium mb-1">
                                                {model.label}
                                            </span>
                                            
                                            {/* 3. Cost Badge (UPDATED) */}
                                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                                                {costText}
                                            </span>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {loadingModel && (
                        <div className="mt-3 text-center">
                            <p className="text-xs text-violet-600 font-bold uppercase tracking-wider animate-pulse">
                                Consulting {AI_MODELS.find(m => m.id === loadingModel)?.name}...
                            </p>
                        </div>
                    )}
                </div>
                ) : (
                    analysisData && (
                        <div className="bg-slate-50 p-2 text-center border-t border-violet-100">
                            <p className="text-[10px] text-gray-400 italic">AI features are currently disabled.</p>
                        </div>
                    )
                )}

                {analysisError && (
                    <div className="p-3 bg-red-50 flex items-center justify-between text-xs text-red-600 border-t border-red-100 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{analysisError}</span></div>
                        <button onClick={() => {}} className="underline hover:text-red-800">Dismiss</button>
                    </div>
                )}
            </div>
            )}
          </div>
        )}
      </div>

      {!isMCQ && !isLocked && (
        <button 
          onClick={toggleReveal}
          className="w-full py-3 bg-gray-50 border-t border-gray-100 text-sm font-semibold text-gray-600 hover:text-teal-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          {isRevealed ? <><span className="mr-1">Hide Solutions</span> <ChevronUp className="w-4 h-4"/></> : <><span className="mr-1">Show Solutions</span> <ChevronDown className="w-4 h-4"/></>}
        </button>
      )}
    </div>
  );
};

export default QuestionCard;