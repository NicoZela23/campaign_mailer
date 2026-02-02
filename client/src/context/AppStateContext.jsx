import React, { createContext, useState, useMemo, useCallback, useEffect } from 'react';

export const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' });
  const [sendingStatus, setSendingStatus] = useState('idle'); // 'idle' | 'sending' | 'completed'
  const [highestCompletedStep, setHighestCompletedStep] = useState(0);
  const [isDataDirty, setIsDataDirty] = useState(false);
  
  // New states for campaigns
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [currentCampaignId, setCurrentCampaignId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [cc, setCC] = useState([]);
  const [bcc, setBCC] = useState([]);

  // Load campaigns when user logs in
  useEffect(() => {
    if (currentUser?.campaigns) {
      setSavedCampaigns(currentUser.campaigns);
    }
  }, [currentUser]);

  const resetCampaign = useCallback(() => {
    setCsvData([]);
    setHeaders([]);
    setEmailTemplate({ subject: '', body: '' });
    setSendingStatus('idle');
    setHighestCompletedStep(0);
    setIsDataDirty(false);
    setCurrentCampaignId(null);
    setAttachments([]);
    setCC([]);
    setBCC([]);
  }, []);

  const loadCampaign = useCallback(async (campaignId) => {
    if (!currentUser?.email) return null;
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}?userId=${encodeURIComponent(currentUser.email)}`);
      if (!response.ok) throw new Error('Failed to load campaign');
      
      const data = await response.json();
      const campaign = data.campaign;
      
      // Load campaign data into state
      const loadedTemplate = campaign.emailTemplate || { subject: '', body: '' };
      console.log('Loading campaign:', {
        campaignId: campaign.id,
        emailTemplate: loadedTemplate,
        hasBody: !!loadedTemplate.body,
        bodyLength: loadedTemplate.body?.length || 0,
        bodyPreview: loadedTemplate.body?.substring(0, 100) || ''
      });
      
      setEmailTemplate(loadedTemplate);
      setHeaders(campaign.headers || []);
      setAttachments(campaign.attachments || []);
      setCC(campaign.cc || []);
      setBCC(campaign.bcc || []);
      setCurrentCampaignId(campaign.id);
      
      // Only reset CSV data if there are no existing data
      // This allows continuing with previously loaded data
      let hasExistingData = false;
      setCsvData(prevCsvData => {
        // If there's already data, keep it; otherwise reset
        hasExistingData = prevCsvData.length > 0;
        return hasExistingData ? prevCsvData : [];
      });
      setIsDataDirty(false);
      
      // Determine the step based on whether CSV data exists
      // If CSV data exists, allow going to composer step (1), otherwise start at data intake (0)
      // We need to check this after the state update, so we'll let MainStepper handle it
      // Don't force highestCompletedStep here - let it be determined by actual CSV data presence
      
      return campaign;
    } catch (error) {
      console.error('Error loading campaign:', error);
      throw error;
    }
  }, [currentUser]);

  const saveCampaign = useCallback(async (campaignName, saveAsNew = false) => {
    if (!currentUser?.email) throw new Error('User not logged in');
    
    try {
      // If saving as new, don't use current campaign ID
      const campaignIdToUse = saveAsNew ? null : (currentCampaignId && currentCampaignId !== 'temp' ? currentCampaignId : null);
      
      // Ensure emailTemplate has both subject and body
      const templateToSave = {
        subject: emailTemplate?.subject || '',
        body: emailTemplate?.body || '',
      };

      const campaignData = {
        id: campaignIdToUse,
        name: campaignName,
        emailTemplate: templateToSave,
        headers: headers || [],
        attachments: attachments || [], // Include all attachments from state
        cc: cc || [],
        bcc: bcc || [],
        status: 'draft',
      };

      // Build the URL - include ID for PUT requests
      const url = campaignIdToUse 
        ? `/api/campaigns/${campaignIdToUse}` 
        : '/api/campaigns';

      console.log('Saving campaign:', { 
        url, 
        method: campaignIdToUse ? 'PUT' : 'POST',
        emailTemplate: templateToSave,
        hasBody: !!templateToSave.body,
        bodyLength: templateToSave.body?.length || 0
      });

      const response = await fetch(url, {
        method: campaignIdToUse ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          userId: currentUser.email,
        }),
      });

      if (!response.ok) {
        // Try to parse error as JSON, but handle HTML error pages
        let errorMessage = 'Failed to save campaign';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON (e.g., HTML error page), use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const savedCampaign = data.campaign;
      
      // Update campaign ID - if saving as new, update to the new ID
      setCurrentCampaignId(savedCampaign.id);
      
      // Refresh campaigns list
      const campaignsResponse = await fetch(`/api/campaigns?userId=${encodeURIComponent(currentUser.email)}`);
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setSavedCampaigns(campaignsData.campaigns);
      }
      
      return savedCampaign;
    } catch (error) {
      console.error('Error saving campaign:', error);
      throw error;
    }
  }, [currentUser, currentCampaignId, emailTemplate, headers, attachments, cc, bcc]);

  const deleteCampaign = useCallback(async (campaignId) => {
    if (!currentUser?.email) throw new Error('User not logged in');
    
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete campaign');
      }

      // Refresh campaigns list
      const campaignsResponse = await fetch(`/api/campaigns?userId=${encodeURIComponent(currentUser.email)}`);
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setSavedCampaigns(campaignsData.campaigns);
      }
      
      // If deleted campaign was current, reset
      if (campaignId === currentCampaignId) {
        resetCampaign();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  }, [currentUser, currentCampaignId, resetCampaign]);

  const addAttachment = useCallback(async (file, campaignId) => {
    if (!currentUser?.email) throw new Error('User not logged in');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', currentUser.email);
    
    const targetCampaignId = campaignId || currentCampaignId || 'temp';
    
    try {
      // Send userId as query parameter since multer doesn't process FormData fields other than file
      const response = await fetch(`/api/attachments/${targetCampaignId}?userId=${encodeURIComponent(currentUser.email)}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload attachment');
      }

      const data = await response.json();
      const newAttachment = data.attachment;
      
      setAttachments(prev => [...prev, newAttachment]);
      
      // If we uploaded to a temp campaign, we need to update the campaign ID
      if (targetCampaignId === 'temp' && currentCampaignId) {
        // Update the campaign with the new attachment
        await saveCampaign('Temp'); // This will be updated with proper name later
      }
      
      return newAttachment;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }, [currentUser, currentCampaignId, saveCampaign]);

  const removeAttachment = useCallback(async (attachmentId, campaignId) => {
    if (!currentUser?.email) throw new Error('User not logged in');
    
    const targetCampaignId = campaignId || currentCampaignId;
    if (!targetCampaignId) {
      // Just remove from local state if no campaign ID
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      return;
    }
    
    try {
      const response = await fetch(`/api/attachments/${targetCampaignId}/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete attachment');
      }

      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }, [currentUser, currentCampaignId]);

  const refreshCampaigns = useCallback(async () => {
    if (!currentUser?.email) return;
    
    try {
      const response = await fetch(`/api/campaigns?userId=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
    }
  }, [currentUser]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    currentUser,
    setCurrentUser,
    csvData,
    setCsvData,
    headers,
    setHeaders,
    emailTemplate,
    setEmailTemplate,
    sendingStatus,
    setSendingStatus,
    highestCompletedStep,
    setHighestCompletedStep,
    isDataDirty,
    setIsDataDirty,
    resetCampaign,
    // Campaigns
    savedCampaigns,
    currentCampaignId,
    loadCampaign,
    saveCampaign,
    deleteCampaign,
    refreshCampaigns,
    // Attachments
    attachments,
    setAttachments,
    addAttachment,
    removeAttachment,
    // CC/BCC
    cc,
    setCC,
    bcc,
    setBCC,
  }), [
    currentUser, csvData, headers, emailTemplate, sendingStatus, 
    highestCompletedStep, isDataDirty, resetCampaign,
    savedCampaigns, currentCampaignId, loadCampaign, saveCampaign, 
    deleteCampaign, refreshCampaigns, attachments, addAttachment, 
    removeAttachment, cc, bcc
  ]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};
