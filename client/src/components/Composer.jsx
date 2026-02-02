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
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#01533c] rounded-xl shadow-lg mb-4">
            <span className="text-white text-2xl">✍️</span>
          </div>
          <h2 className="text-3xl font-bold text-[#01533c] mb-2">
            Construye el Email
          </h2>
          <p className="text-gray-500 text-sm">Crea tu plantilla de correo personalizada</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Asunto del Correo
          </label>
          <input 
            type="text"
            placeholder="Ej: Bienvenido a nuestra campaña"
            value={emailTemplate.subject}
            onChange={handleSubjectChange}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-lg"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cuerpo del Mensaje
          </label>
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div ref={quillRef} style={{ height: '400px', backgroundColor: 'white' }} />
          </div>
        </div>
        
        <div className="w-full shrink-0 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">🔧</span>
            Variables Disponibles
          </h3>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border-2 border-gray-200 overflow-y-auto overflow-x-hidden max-h-64 shadow-inner">
            {headers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay variables disponibles. Sube datos primero.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {headers.map(header => (
                  <button 
                    key={header} 
                    onClick={() => insertVariable(header)}
                    className={`text-left p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 text-wrap font-medium ${
                      isVariableUsed(header) 
                        ? 'bg-[#01533c] text-white hover:bg-[#014030]' 
                        : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-[#01533c] border-2 border-gray-200 hover:border-[#01533c]/50'
                    }`}
                    title={isVariableUsed(header) ? 'Variable en uso' : 'Haz clic para insertar'}
                  >
                    <span className="font-mono text-sm">{`{{${header}}}`}</span>
                    {isVariableUsed(header) && (
                      <span className="ml-2 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Haz clic en una variable para insertarla en el editor
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
          <button 
            onClick={onBack} 
            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            ← Atrás
          </button>
          <button 
            onClick={validateAndProceed} 
            className="px-8 py-3 bg-[#01533c] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Composer;
