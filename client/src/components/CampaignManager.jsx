import React, { useState, useContext, useEffect } from 'react';
import { AppStateContext } from '../context/AppStateContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CampaignManager = () => {
  const { 
    savedCampaigns, 
    loadCampaign, 
    deleteCampaign, 
    refreshCampaigns,
    resetCampaign,
    setHighestCompletedStep,
    sendingStatus,
    currentUser
  } = useContext(AppStateContext);
  const navigate = useNavigate();
  const [loadingCampaignId, setLoadingCampaignId] = useState(null); // Track which campaign is loading
  const [deletingCampaignId, setDeletingCampaignId] = useState(null); // Track which campaign is being deleted
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewCampaign, setPreviewCampaign] = useState(null); // Campaign to preview
  const [editingCampaignId, setEditingCampaignId] = useState(null); // Track which campaign name is being edited
  const [editingCampaignName, setEditingCampaignName] = useState(''); // Temporary name for editing

  useEffect(() => {
    refreshCampaigns();
  }, [refreshCampaigns]);

  const handleLoadCampaign = async (campaignId) => {
    setLoadingCampaignId(campaignId);
    try {
      // If campaign sending is completed, reset everything first
      if (sendingStatus === 'completed') {
        resetCampaign();
      }
      
      await loadCampaign(campaignId);
      // MainStepper will handle determining the correct step based on CSV data presence
      navigate('/');
      toast.success('Campaña cargada exitosamente');
      setPreviewCampaign(null); // Close preview
    } catch (error) {
      toast.error(`Error al cargar campaña: ${error.message}`);
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleDelete = async (campaignId, campaignName) => {
    if (deleteConfirm !== campaignId) {
      setDeleteConfirm(campaignId);
      return;
    }

    setDeletingCampaignId(campaignId);
    try {
      await deleteCampaign(campaignId);
      toast.success('Campaña eliminada exitosamente');
      setDeleteConfirm(null);
      if (previewCampaign?.id === campaignId) {
        setPreviewCampaign(null); // Close preview if deleted campaign was being previewed
      }
    } catch (error) {
      toast.error(`Error al eliminar: ${error.message}`);
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handlePreview = async (campaignId) => {
    // Fetch full campaign data for preview
    try {
      const campaign = savedCampaigns.find(c => c.id === campaignId);
      if (!campaign) {
        toast.error('Campaña no encontrada');
        return;
      }
      
      // Fetch full campaign details
      const userId = currentUser?.email || campaign.userId || '';
      const response = await fetch(`/api/campaigns/${campaignId}?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error('Failed to fetch campaign details');
      
      const data = await response.json();
      setPreviewCampaign(data.campaign);
    } catch (error) {
      toast.error(`Error al cargar preview: ${error.message}`);
    }
  };

  const handleStartEdit = (campaignId, currentName) => {
    setEditingCampaignId(campaignId);
    setEditingCampaignName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingCampaignId(null);
    setEditingCampaignName('');
  };

  const handleSaveEdit = async (campaignId) => {
    if (!editingCampaignName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    // Check for duplicate names
    const duplicate = savedCampaigns.find(c => c.name === editingCampaignName.trim() && c.id !== campaignId);
    if (duplicate) {
      toast.error(`Ya existe una campaña con el nombre "${editingCampaignName.trim()}". Por favor, elige un nombre diferente.`);
      return;
    }

    try {
      const userId = currentUser?.email || '';
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: editingCampaignName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update campaign name');
      }

      toast.success('Nombre de campaña actualizado exitosamente');
      setEditingCampaignId(null);
      setEditingCampaignName('');
      refreshCampaigns(); // Refresh the list
    } catch (error) {
      toast.error(`Error al actualizar nombre: ${error.message}`);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#01533c] rounded-2xl shadow-lg mb-4">
          <span className="text-white text-3xl">📋</span>
        </div>
        <h1 className="text-4xl font-bold text-[#01533c] mb-2">
          Mis Campañas
        </h1>
        <p className="text-gray-500">Gestiona tus campañas guardadas</p>
      </div>

      {savedCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-200">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No hay campañas guardadas</h3>
          <p className="text-gray-500 mb-6">Crea tu primera campaña para comenzar</p>
          <button
            onClick={() => {
              resetCampaign();
              navigate('/');
            }}
            className="px-8 py-3 bg-[#01533c] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Crear Nueva Campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedCampaigns.map((campaign) => {
            const isLoading = loadingCampaignId === campaign.id;
            const isDeleting = deletingCampaignId === campaign.id;
            const isProcessing = isLoading || isDeleting;
            
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-[#01533c]/50 transition-all duration-200 hover:shadow-xl p-6 cursor-pointer"
                onClick={() => handlePreview(campaign.id)}
              >
              <div className="flex items-start justify-between mb-4">
                {editingCampaignId === campaign.id ? (
                  <div className="flex-1 mr-2">
                    <input
                      type="text"
                      value={editingCampaignName}
                      onChange={(e) => setEditingCampaignName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(campaign.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="w-full px-3 py-1 border-2 border-[#01533c] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01533c] text-sm font-bold"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <h3 className="text-lg font-bold text-gray-800 flex-1 truncate">
                    {campaign.name}
                  </h3>
                )}
                <div className="flex items-center gap-2">
                  {editingCampaignId === campaign.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(campaign.id);
                        }}
                        className="px-2 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Guardar"
                      >
                        ✓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Cancelar"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(campaign.id, campaign.name);
                        }}
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Editar nombre"
                      >
                        ✏️
                      </button>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        campaign.status === 'sent' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {campaign.status === 'sent' ? 'Enviada' : 'Borrador'}
                      </span>
                    </>
                  )}
                </div>
              </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>Creada: {formatDate(campaign.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🔄</span>
                    <span>Actualizada: {formatDate(campaign.updatedAt)}</span>
                  </div>
                  {campaign.attachmentsCount > 0 && (
                    <div className="flex items-center">
                      <span className="mr-2">📎</span>
                      <span>{campaign.attachmentsCount} adjunto{campaign.attachmentsCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {(campaign.hasCC || campaign.hasBCC) && (
                    <div className="flex items-center">
                      <span className="mr-2">👥</span>
                      <span>
                        {campaign.hasCC && 'CC'} {campaign.hasCC && campaign.hasBCC && '•'} {campaign.hasBCC && 'BCC'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleLoadCampaign(campaign.id)}
                    disabled={isProcessing}
                    className={`flex-1 px-4 py-2 text-white font-semibold rounded-lg transition-all duration-200 ${
                      isLoading
                        ? 'bg-[#01533c] cursor-wait'
                        : 'bg-[#01533c] hover:bg-[#014030]'
                    } disabled:opacity-50 disabled:cursor-not-allowed relative`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando...
                      </span>
                    ) : 'Cargar'}
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.name)}
                    disabled={isProcessing}
                    className={`px-4 py-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      deleteConfirm === campaign.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : isDeleting
                        ? 'bg-red-600 text-white cursor-wait'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {isDeleting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Eliminando...
                      </span>
                    ) : deleteConfirm === campaign.id ? 'Confirmar' : 'Eliminar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewCampaign(null)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#01533c] text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{previewCampaign.name}</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {previewCampaign.status === 'sent' ? 'Campaña Enviada' : 'Borrador'}
                </p>
              </div>
              <button
                onClick={() => setPreviewCampaign(null)}
                className="text-white hover:text-gray-200 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Email Template Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📧</span>
                  Plantilla de Email
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <div className="mb-3">
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Asunto:</label>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      {previewCampaign.emailTemplate?.subject || 'Sin asunto'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Cuerpo:</label>
                    <div 
                      className="bg-white p-4 rounded-lg border border-gray-200 min-h-[200px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: previewCampaign.emailTemplate?.body?.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>') || '<p>Sin contenido</p>' 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Variables */}
              {previewCampaign.headers && previewCampaign.headers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">🔧</span>
                    Variables Disponibles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {previewCampaign.headers.map((header, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-mono text-sm border border-emerald-200"
                      >
                        {`{{${header}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {previewCampaign.attachments && previewCampaign.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">📎</span>
                    Adjuntos ({previewCampaign.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {previewCampaign.attachments.map((attachment, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{attachment.filename || `Adjunto ${index + 1}`}</span>
                        <span className="text-xs text-gray-500">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CC/BCC */}
              {(previewCampaign.cc?.length > 0 || previewCampaign.bcc?.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <span className="mr-2">👥</span>
                    Copias
                  </h3>
                  <div className="space-y-2">
                    {previewCampaign.cc && previewCampaign.cc.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-1">CC:</label>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {previewCampaign.cc.join(', ')}
                        </div>
                      </div>
                    )}
                    {previewCampaign.bcc && previewCampaign.bcc.length > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-600 block mb-1">BCC:</label>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {previewCampaign.bcc.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">ℹ️</span>
                  Información
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Creada:</span>
                    <span className="ml-2 font-semibold">{formatDate(previewCampaign.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Actualizada:</span>
                    <span className="ml-2 font-semibold">{formatDate(previewCampaign.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewCampaign(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setPreviewCampaign(null);
                  handleLoadCampaign(previewCampaign.id);
                }}
                disabled={loadingCampaignId === previewCampaign.id}
                className={`px-6 py-2 text-white font-semibold rounded-lg transition-all duration-200 ${
                  loadingCampaignId === previewCampaign.id
                    ? 'bg-[#01533c] cursor-wait'
                    : 'bg-[#01533c] hover:bg-[#014030]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingCampaignId === previewCampaign.id ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </span>
                ) : 'Cargar Campaña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
