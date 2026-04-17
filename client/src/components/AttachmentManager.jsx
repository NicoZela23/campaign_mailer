import React, { useRef, useContext } from 'react';
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const AttachmentManager = () => {
  const { attachments, addAttachment, removeAttachment, currentUser, currentCampaignId } = useContext(AppStateContext);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Validate file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast.error(`Algunos archivos exceden el límite de 10MB`);
      return;
    }

    // Upload files
    for (const file of files) {
      try {
        const toastId = toast.loading(`Subiendo ${file.name}...`);
        await addAttachment(file, currentCampaignId);
        toast.success(`${file.name} subido exitosamente`, { id: toastId });
      } catch (error) {
        toast.error(`Error al subir ${file.name}: ${error.message}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (attachmentId) => {
    try {
      await removeAttachment(attachmentId, currentCampaignId);
      toast.success('Adjunto eliminado');
    } catch (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <span className="mr-2">📎</span>
          Archivos Adjuntos
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-semibold rounded-lg hover:bg-[#6d28d9] transition-all duration-200 shadow-md hover:shadow-lg"
        >
          + Agregar Archivo
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {attachments.length === 0 ? (
        <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <p className="text-gray-500 text-sm">No hay archivos adjuntos</p>
          <p className="text-gray-400 text-xs mt-1">Máximo 10MB por archivo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <span className="text-2xl">
                    {attachment.mimeType?.startsWith('image/') ? '🖼️' :
                     attachment.mimeType?.includes('pdf') ? '📄' :
                     attachment.mimeType?.includes('word') ? '📝' :
                     attachment.mimeType?.includes('excel') || attachment.mimeType?.includes('spreadsheet') ? '📊' :
                     '📎'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(attachment.id)}
                className="ml-3 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors flex-shrink-0"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;
