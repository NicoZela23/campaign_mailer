import React, { createContext, useState, useMemo, useCallback } from 'react';

export const AppStateContext = createContext();

export const AppStateProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' });
  const [sendingStatus, setSendingStatus] = useState('idle'); // 'idle' | 'sending' | 'completed'
  const [highestCompletedStep, setHighestCompletedStep] = useState(0);
  const [isDataDirty, setIsDataDirty] = useState(false);

  const resetCampaign = useCallback(() => {
    setCsvData([]);
    setHeaders([]);
    setEmailTemplate({ subject: '', body: '' });
    setSendingStatus('idle');
    setHighestCompletedStep(0);
    setIsDataDirty(false);
  }, []);

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
  }), [currentUser, csvData, headers, emailTemplate, sendingStatus, highestCompletedStep, isDataDirty, resetCampaign]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};
