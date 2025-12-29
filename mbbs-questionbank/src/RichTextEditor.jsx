import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Updated CSS import path

const RichTextEditor = ({ value, onChange, placeholder, readOnly = false }) => {
  
  // Custom Toolbar options
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'], 
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      ['blockquote', 'code-block'],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'script',
    'blockquote', 'code-block',
    'align',
    'link', 'image'
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill 
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={readOnly ? { toolbar: false } : modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`${readOnly ? 'read-only-editor' : 'bg-white'}`}
      />
      
      {/* Custom Styles for Tailwind integration */}
      <style>{`
        .ql-container {
          font-size: 1rem;
          font-family: inherit;
        }
        .ql-editor {
          min-height: ${readOnly ? 'auto' : '200px'};
          max-height: ${readOnly ? 'none' : '400px'};
          overflow-y: auto;
        }
        
        /* Read Only Mode specific tweaks */
        .read-only-editor .ql-container.ql-snow {
          border: none;
        }
        .read-only-editor .ql-editor {
          padding: 0;
        }
        
        /* Fix toolbar rounding to match Tailwind rounded-lg */
        .ql-toolbar.ql-snow {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border-color: #e2e8f0;
        }
        .ql-container.ql-snow {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;