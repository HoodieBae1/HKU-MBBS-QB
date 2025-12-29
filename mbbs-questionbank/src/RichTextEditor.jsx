import React, { useRef, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Image as ImageIcon, Link, Upload, X, AlertCircle, Database, CheckCircle2 } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder, readOnly = false }) => {
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State for the custom modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'upload'

  // 1. Intercept the standard image button
  const imageHandler = () => {
    // Save current cursor position before blur happens
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    quillRef.current.savedRange = range; // Attach to ref to persist across re-renders
    
    setShowImageModal(true);
    setImageUrl('');
  };

  // 2. Insert Image Logic
  const insertImageToQuill = (source) => {
    const quill = quillRef.current.getEditor();
    
    // Attempt to restore selection, or put at end
    const range = quillRef.current.savedRange;
    const index = range ? range.index : quill.getLength();

    quill.insertEmbed(index, 'image', source);
    quill.setSelection(index + 1);
    
    setShowImageModal(false);
  };

  // 3. Handle File Upload (Convert to Base64)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        insertImageToQuill(event.target.result); // This is the Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  // Toolbar Configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'], 
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'], // Triggers imageHandler
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  return (
    <div className="rich-text-editor-wrapper relative">
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={readOnly ? { toolbar: false } : modules}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${readOnly ? 'read-only-editor' : 'bg-white'}`}
      />

      {/* --- CUSTOM IMAGE MODAL --- */}
      {showImageModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                Insert Image
              </h3>
              <button onClick={() => setShowImageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'url' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Link className="w-4 h-4" /> By URL
                </button>
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Upload className="w-4 h-4" /> Upload File
                </button>
            </div>

            <div className="p-6">
                {/* OPTION 1: URL */}
                {activeTab === 'url' && (
                    <div className="space-y-4">
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-teal-800 uppercase mb-1">Recommended</p>
                                <p className="text-xs text-teal-700">Uses <span className="font-bold">~0 MB</span> of your database quota.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image Link</label>
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="https://i.imgur.com/example.png"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                            />
                            <p className="text-[10px] text-gray-400 mt-2">
                                Tip: Right-click an image online and select "Copy Image Address".
                            </p>
                        </div>

                        <button 
                            disabled={!imageUrl}
                            onClick={() => insertImageToQuill(imageUrl)}
                            className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Insert Image
                        </button>
                    </div>
                )}

                {/* OPTION 2: UPLOAD */}
                {activeTab === 'upload' && (
                    <div className="space-y-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3">
                            <Database className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-orange-800 uppercase mb-1">Warning: High Usage</p>
                                <p className="text-xs text-orange-700">
                                    Direct uploads consume database space rapidly. 
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-600 group-hover:text-indigo-700">Click to choose a file</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
                )}
            </div>

          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .ql-container { font-size: 1rem; font-family: inherit; }
        .ql-editor {
          min-height: ${readOnly ? 'auto' : '200px'};
          max-height: ${readOnly ? 'none' : '400px'};
          overflow-y: auto;
        }
        .read-only-editor .ql-container.ql-snow { border: none; }
        .read-only-editor .ql-editor { padding: 0; }
        .ql-toolbar.ql-snow {
          border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; border-color: #e2e8f0;
        }
        .ql-container.ql-snow {
          border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem; border-color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;