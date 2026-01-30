import React, { useContext, useRef, useEffect } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Snow theme for Quill
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const Composer = ({ onComplete, onBack }) => {
  const { headers, emailTemplate, setEmailTemplate } = useContext(AppStateContext);
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (quillRef.current && !editorRef.current) {
      editorRef.current = new Quill(quillRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'link'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }]
          ]
        }
      });
      
      if (emailTemplate.body) {
        editorRef.current.clipboard.dangerouslyPasteHTML(emailTemplate.body);
      }
      
      editorRef.current.on('text-change', () => {
        let html = editorRef.current.root.innerHTML;
        // Convert empty paragraphs to <br> for better newline handling in emails
        html = html.replace(/<p><br><\/p>/g, '<br>');
        // Replace <p> tags with <div> to avoid default margins in email clients
        html = html.replace(/<p>/g, '<div>').replace(/<\/p>/g, '</div>');
        setEmailTemplate(prev => ({ ...prev, body: html }));
      });
    }
  }, []);
  
  const handleSubjectChange = (e) => {
    setEmailTemplate(prev => ({ ...prev, subject: e.target.value }));
  };
  
  const insertVariable = (variable) => {
    const quill = editorRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, `{{${variable}}}`, 'user');
    }
  };

  const validateAndProceed = () => {
    if (!emailTemplate.subject) {
      toast.error('Ingresa el asunto');
      return;
    }
    // Regex to check if at least one {{variable}} is used
    if (/{{(.*?)}}/.test(emailTemplate.body)) {
      onComplete();
    } else {
      toast.error('Ingresa al menos una de las variables disponibles');
    }
  };

  const isVariableUsed = (variable) => {
    return emailTemplate.body.includes(`{{${variable}}}`);
  };

  return (
    <div className="flex flex-col p-8 gap-8">
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Construye el email</h2>
        <input 
          type="text"
          placeholder="Asunto"
          value={emailTemplate.subject}
          onChange={handleSubjectChange}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />
        <div ref={quillRef} style={{ height: '400px' }} />
        <div className="w-full shrink-0 mt-4">
          <h3 className="text-lg font-semibold mb-2">Variables Disponibles</h3>
          <div className="bg-gray-100 p-4 rounded-lg overflow-y-auto overflow-x-hidden max-h-64">
            {headers.map(header => (
              <button 
                key={header} 
                onClick={() => insertVariable(header)}
                className={`block w-full text-left p-2 mb-2 rounded shadow hover:opacity-80 text-wrap ${isVariableUsed(header) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
              >
                {`{{${header}}}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={onBack} className="px-6 py-2 bg-red-600 text-white rounded-lg">
            Atras
          </button>
          <button onClick={validateAndProceed} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default Composer;
