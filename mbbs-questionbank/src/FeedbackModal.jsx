import React, { useState } from 'react';
import { X, Send, Bug, Lightbulb, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from './supabase';

const FeedbackModal = ({ isOpen, onClose, user }) => {
  const [type, setType] = useState('Bug'); // 'Bug' | 'Suggestion' | 'Other'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id,
          email: user?.email,
          type: type,
          message: message
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset form after closing
        setTimeout(() => {
          setSuccess(false);
          setMessage('');
          setType('Bug');
        }, 300);
      }, 2000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            Feedback & Support
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-500 text-sm">Your feedback has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Selection */}
              <div className="grid grid-cols-3 gap-2">
                {['Bug', 'Suggestion', 'Other'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      type === t 
                        ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500' 
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'Bug' && <Bug className={`w-5 h-5 mb-1 ${type === t ? 'text-teal-600' : ''}`} />}
                    {t === 'Suggestion' && <Lightbulb className={`w-5 h-5 mb-1 ${type === t ? 'text-teal-600' : ''}`} />}
                    {t === 'Other' && <MessageSquare className={`w-5 h-5 mb-1 ${type === t ? 'text-teal-600' : ''}`} />}
                    <span className="text-xs font-bold">{t}</span>
                  </button>
                ))}
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {type === 'Bug' ? 'Describe the issue:' : type === 'Suggestion' ? 'What should we add?' : 'Your Message:'}
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={type === 'Bug' ? "e.g., The search bar isn't working on mobile..." : "e.g., It would be great to have a dark mode..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none text-sm"
                />
              </div>

              {/* Submit Button */}
              <button
                disabled={loading}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Feedback</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;