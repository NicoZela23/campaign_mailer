import React, { useContext, useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Snow theme for Quill
import { AppStateContext } from '../context/AppStateContext';
import AttachmentManager from './AttachmentManager';
import CCBCCManager from './CCBCCManager';
import toast from 'react-hot-toast';

const Composer = ({ onComplete, onBack }) => {
  const { 
    headers, 
    emailTemplate, 
    setEmailTemplate, 
    saveCampaign, 
    currentCampaignId,
    savedCampaigns,
    csvData
  } = useContext(AppStateContext);
  const quillRef = useRef(null);
  const editorRef = useRef(null);
  const isUpdatingFromEditor = useRef(false); // Flag to prevent infinite loop
  const lastLoadedBody = useRef(null); // Track last loaded body to avoid unnecessary updates
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [saveAsNew, setSaveAsNew] = useState(false);
  
  // Get current campaign name if editing
  useEffect(() => {
    if (currentCampaignId && savedCampaigns.length > 0) {
      const campaign = savedCampaigns.find(c => c.id === currentCampaignId);
      if (campaign) {
        setCampaignName(campaign.name);
        setSaveAsNew(false);
      }
    } else {
      setCampaignName('');
      setSaveAsNew(false);
    }
  }, [currentCampaignId, savedCampaigns]);

  useEffect(() => {
    if (quillRef.current && !editorRef.current) {
      editorRef.current = new Quill(quillRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'link'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }]
          ]
        },
        placeholder: 'Escribe tu mensaje aquí...'
      });
      
      if (emailTemplate.body) {
        // Convert saved <div> tags back to <p> tags for Quill
        let bodyForQuill = emailTemplate.body;
        bodyForQuill = bodyForQuill.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>');
        bodyForQuill = bodyForQuill.replace(/<br>/g, '<p><br></p>');
        
        const delta = editorRef.current.clipboard.convert(bodyForQuill);
        editorRef.current.setContents(delta, 'silent');
        // Move cursor to end after initial load
        setTimeout(() => {
          const length = editorRef.current.getLength();
          editorRef.current.setSelection(Math.max(0, length - 1));
        }, 0);
      }
      
      editorRef.current.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user' && !isUpdatingFromEditor.current) {
          let html = editorRef.current.root.innerHTML;
          
          // Handle empty content
          if (!html || html.trim() === '' || html === '<p><br></p>' || html === '<p></p>') {
            html = '';
          } else {
            // Convert empty paragraphs to <br> for better newline handling in emails
            html = html.replace(/<p><br><\/p>/g, '<br>');
            // Replace <p> tags with <div> to avoid default margins in email clients
            html = html.replace(/<p>/g, '<div>').replace(/<\/p>/g, '</div>');
          }
          
          // Update last loaded body reference when user makes changes
          lastLoadedBody.current = html;
          
          setEmailTemplate(prev => ({ 
            ...prev, 
            body: html,
            subject: prev?.subject || ''
          }));
        }
      });
    }
  }, []);

  // Update editor content when emailTemplate.body changes (e.g., when loading a campaign)
  // Only update if the change comes from outside the editor (like loading a campaign)
  useEffect(() => {
    // Only proceed if editor is initialized and we're not updating from user input
    if (!editorRef.current || isUpdatingFromEditor.current) {
      return;
    }

    const templateBody = emailTemplate.body || '';
    
    // Skip if this is the same content we already loaded
    if (lastLoadedBody.current === templateBody) {
      return;
    }

    console.log('Loading content into editor:', {
      hasBody: !!templateBody,
      bodyLength: templateBody.length,
      bodyPreview: templateBody.substring(0, 100)
    });

    // Convert saved <div> tags back to <p> tags for Quill (since we save as <div> but Quill uses <p>)
    let bodyForQuill = templateBody;
    
    if (bodyForQuill) {
      // Convert <div> back to <p> for Quill editor
      bodyForQuill = bodyForQuill.replace(/<div>/gi, '<p>').replace(/<\/div>/gi, '</p>');
      // Handle standalone <br> tags - convert to paragraph breaks
      bodyForQuill = bodyForQuill.replace(/<br\s*\/?>/gi, '<p><br></p>');
      // Clean up multiple empty paragraphs
      bodyForQuill = bodyForQuill.replace(/(<p><\/p>)+/g, '');
    }

    // Set flag to prevent text-change event from firing
    isUpdatingFromEditor.current = true;
    
    console.log('Converting body for Quill:', {
      original: templateBody,
      converted: bodyForQuill
    });
    
    try {
      if (bodyForQuill && bodyForQuill.trim()) {
        // Try using dangerouslyPasteHTML first as it's more reliable for HTML content
        try {
          editorRef.current.clipboard.dangerouslyPasteHTML(0, bodyForQuill);
          console.log('Content loaded using dangerouslyPasteHTML');
        } catch (pasteError) {
          console.log('dangerouslyPasteHTML failed, trying clipboard.convert:', pasteError);
          // Fallback to clipboard.convert
          const delta = editorRef.current.clipboard.convert(bodyForQuill);
          editorRef.current.setContents(delta, 'silent');
          console.log('Content loaded using clipboard.convert');
        }
        
        // Verify content was set
        setTimeout(() => {
          const actualContent = editorRef.current.root.innerHTML;
          const textContent = editorRef.current.getText();
          console.log('Content verification:', {
            htmlLength: actualContent.length,
            textLength: textContent.length,
            htmlPreview: actualContent.substring(0, 100),
            textPreview: textContent.substring(0, 100)
          });
        }, 50);
      } else {
        // Clear editor if body is empty
        editorRef.current.setText('');
        console.log('Editor cleared (empty body)');
      }
      
      // Update the last loaded body reference
      lastLoadedBody.current = templateBody;
      
      // Move cursor to end after loading content
      setTimeout(() => {
        const length = editorRef.current.getLength();
        editorRef.current.setSelection(Math.max(0, length - 1), 'user');
        isUpdatingFromEditor.current = false;
      }, 200);
    } catch (error) {
      console.error('Error loading content into editor:', error);
      // Fallback: try setting HTML directly
      try {
        editorRef.current.root.innerHTML = bodyForQuill || '';
        lastLoadedBody.current = templateBody;
        console.log('Content set using innerHTML fallback');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      isUpdatingFromEditor.current = false;
    }
  }, [emailTemplate.body]);
  
  const handleSubjectChange = (e) => {
    setEmailTemplate(prev => ({ ...prev, subject: e.target.value }));
  };
  
  const insertVariable = (variable) => {
    const quill = editorRef.current;
    if (quill) {
      const range = quill.getSelection(true); // true = normalize selection
      const variableText = `{{${variable}}}`;
      
      if (range) {
        // Insert at current cursor position
        quill.insertText(range.index, variableText, 'user');
        // Move cursor to end of inserted text
        setTimeout(() => {
          quill.setSelection(range.index + variableText.length, 'user');
        }, 0);
      } else {
        // If no selection, insert at the end
        const length = quill.getLength();
        quill.insertText(length - 1, variableText, 'user');
        setTimeout(() => {
          quill.setSelection(length - 1 + variableText.length, 'user');
        }, 0);
      }
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

  // Extract all variables used in the email template (both subject and body)
  const getUsedVariables = () => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    // Get text from both subject and body
    const subjectText = String(emailTemplate.subject || '');
    const bodyText = String(emailTemplate.body || '');
    
    // Combine both texts - regex works even with HTML tags
    const allText = `${subjectText} ${bodyText}`;
    
    // Find all matches using a more robust approach
    const matches = [];
    let match;
    // Reset regex lastIndex to ensure we start from the beginning
    variableRegex.lastIndex = 0;
    while ((match = variableRegex.exec(allText)) !== null) {
      const varName = match[1].trim(); // Extract variable name and trim whitespace
      if (varName) { // Only add non-empty variable names
        matches.push(varName);
      }
    }
    
    // Remove duplicates and return
    return [...new Set(matches)];
  };

  // Find variables that are used but not available in headers
  const getMissingVariables = () => {
    const usedVars = getUsedVariables();
    
    // Get actual headers from CSV data if available, otherwise use headers from context
    // This ensures we're comparing against the actual CSV columns, not just the headers state
    let availableHeaders = [];
    if (csvData && csvData.length > 0) {
      // Extract headers from actual CSV data (excluding 'email')
      availableHeaders = Object.keys(csvData[0] || {}).filter(h => h !== 'email');
    } else {
      // Fallback to headers from context if no CSV data
      availableHeaders = Array.isArray(headers) ? headers : [];
    }
    
    // Filter out variables that are not in the available headers
    const missing = usedVars.filter(varName => {
      // Check if variable is in headers (case-sensitive comparison)
      const isMissing = !availableHeaders.includes(varName);
      return isMissing;
    });
    
    // Always log for debugging when there are used variables
    if (usedVars.length > 0) {
      console.log('Variable validation:', {
        usedVars,
        availableHeaders,
        headersFromContext: Array.isArray(headers) ? headers : [],
        csvDataColumns: csvData && csvData.length > 0 ? Object.keys(csvData[0] || {}).filter(h => h !== 'email') : [],
        missingVars: missing,
        csvDataLength: csvData ? csvData.length : 0,
        emailTemplateSubject: emailTemplate.subject,
        emailTemplateBodyPreview: emailTemplate.body?.substring(0, 200)
      });
    }
    
    return missing;
  };

  // Calculate missing variables - this will re-run whenever headers or emailTemplate changes
  const missingVariables = getMissingVariables();

  const handleSaveCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Ingresa un nombre para la campaña');
      return;
    }

    // Check for duplicate names in saved campaigns (excluding current campaign if not saving as new)
    const trimmedName = campaignName.trim();
    if (!saveAsNew && currentCampaignId && currentCampaignId !== 'temp') {
      // When updating, allow keeping the same name
      const currentCampaign = savedCampaigns.find(c => c.id === currentCampaignId);
      if (currentCampaign && currentCampaign.name === trimmedName) {
        // Same name as current campaign, that's fine
      } else {
        // Different name, check for duplicates
        const duplicate = savedCampaigns.find(c => c.name === trimmedName && c.id !== currentCampaignId);
        if (duplicate) {
          toast.error(`Ya existe una campaña con el nombre "${trimmedName}". Por favor, elige un nombre diferente.`);
          return;
        }
      }
    } else {
      // When creating new or saving as new, check for duplicates
      const duplicate = savedCampaigns.find(c => c.name === trimmedName);
      if (duplicate) {
        toast.error(`Ya existe una campaña con el nombre "${trimmedName}". Por favor, elige un nombre diferente.`);
        return;
      }
    }

    try {
      const toastId = toast.loading(saveAsNew ? 'Guardando nueva campaña...' : 'Guardando campaña...');
      await saveCampaign(trimmedName, saveAsNew);
      toast.success(saveAsNew ? 'Nueva campaña guardada exitosamente' : 'Campaña actualizada exitosamente', { id: toastId });
      setShowSaveModal(false);
      setCampaignName('');
      setSaveAsNew(false);
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    }
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
          
          {/* Warning for missing variables */}
          {missingVariables.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-bold text-yellow-800 mb-1">
                    Variables no disponibles en los datos
                  </h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    Las siguientes variables están siendo usadas en el email pero no están disponibles en tu lista de datos:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingVariables.map((varName, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 font-mono text-sm font-semibold"
                      >
                        {`{{${varName}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Por favor, sube datos que incluyan estas columnas o elimina estas variables del email.
                  </p>
                </div>
              </div>
            </div>
          )}
          
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

        {/* Attachments Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <AttachmentManager />
        </div>

        {/* CC/BCC Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <CCBCCManager />
        </div>
        
        <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
          <button 
            onClick={onBack} 
            className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            ← Atrás
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSaveModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              💾 Guardar Campaña
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

      {/* Save Campaign Modal - Popup style without full screen darkening */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-[#01533c]/20 pointer-events-auto transform transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-[#01533c]">
                {currentCampaignId && currentCampaignId !== 'temp' ? 'Editar Campaña' : 'Guardar Campaña'}
              </h3>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setCampaignName('');
                  setSaveAsNew(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveCampaign()}
              placeholder="Nombre de la campaña"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent mb-4"
              autoFocus
            />
            
            {/* Show save options if editing existing campaign */}
            {currentCampaignId && currentCampaignId !== 'temp' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsNew}
                    onChange={(e) => setSaveAsNew(e.target.checked)}
                    className="w-4 h-4 text-[#01533c] border-gray-300 rounded focus:ring-[#01533c]"
                  />
                  <span className="text-sm text-gray-700">
                    Guardar como nueva campaña (no sobrescribir la actual)
                  </span>
                </label>
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setCampaignName('');
                  setSaveAsNew(false);
                }}
                className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCampaign}
                className="px-5 py-2 bg-[#01533c] text-white font-semibold rounded-lg hover:bg-[#014030] transition-colors"
              >
                {saveAsNew ? 'Guardar como Nueva' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Composer;
