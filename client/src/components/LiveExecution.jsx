import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppStateContext } from '../context/AppStateContext';

const LiveExecution = ({ onReset }) => {
  const { csvData, emailTemplate, currentUser, sendingStatus, setSendingStatus } = useContext(AppStateContext);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current === true) {
      return;
    }
    effectRan.current = true;

    if (csvData.length === 0) {
      setError("No contact data loaded. Please go back and upload a file.");
      setSendingStatus('completed');
      return;
    }

    setSendingStatus('sending');

    // Fake progress interval
    const interval = setInterval(() => {
      setProgress(oldProgress => {
        if (oldProgress >= 99) {
          clearInterval(interval);
          return 99;
        }
        // Simulate a slower progress as it gets closer to 99
        const increment = Math.random() * (100 - oldProgress) * 0.05;
        return Math.min(oldProgress + increment, 99);
      });
    }, 400);

    const startSending = async () => {
      try {
        const response = await fetch('/api/mailer/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userConfig: currentUser,
            csvData,
            emailTemplate,
          }),
        });

        clearInterval(interval); // Stop the fake progress

        const data = await response.json();

        if (response.ok && data.status === 'completed') {
          const formattedLogs = data.results.map(item => ({
            type: item.result.toLowerCase(),
            message: `Email to ${item.email} ${item.result === 'SUCCESS' ? 'sent' : 'failed'}. ${item.error ? `Reason: ${item.error}`: ''}`,
            timestamp: new Date().toLocaleTimeString(),
          }));
          setLogs(formattedLogs.reverse());
          setProgress(100);
          setSendingStatus('completed');
        } else {
          throw new Error(data.message || 'Failed to get a valid response from the server.');
        }
      } catch (err) {
        clearInterval(interval);
        setError(err.message || 'Failed to connect to the server. Please try again.');
        setProgress(0); // Reset progress on error
        setSendingStatus('completed');
      }
    };

    startSending();

    return () => {
      clearInterval(interval);
    };
  }, [csvData, emailTemplate, currentUser, setSendingStatus]);

  const totalEmails = csvData.length;
  const sentCount = logs.filter(l => l.type === 'success').length;
  const failedCount = logs.filter(l => l.type !== 'success').length;
  const displayProgress = Math.round(progress);

  return (
    <div className="p-8 max-w-4xl mx-auto text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        {sendingStatus !== 'completed' ? 'Enviando Correos...' : 'Envio completado!'}
      </h2>
      <div className="relative inline-flex items-center justify-center w-64 h-64 mb-8">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
          <circle
            className="text-blue-600"
            strokeWidth="10"
            strokeDasharray={`${(2 * Math.PI * 45 * displayProgress) / 100}, 999`}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dasharray 0.3s' }}
          />
        </svg>
        <span className="absolute text-5xl font-bold text-blue-700">{`${displayProgress}%`}</span>
      </div>

      <div className="text-left bg-gray-50 border rounded-lg p-4 h-64 overflow-y-auto shadow-inner">
        <p className="font-semibold mb-2">{`Progreso: ${sentCount + failedCount} / ${totalEmails}`}</p>
        {error && <p className="text-red-500 font-bold">{`[ERROR] ${error}`}</p>}
        {logs.map((log, index) => (
          <div key={index} className="flex items-center text-sm mb-1">
            <span className={`mr-2 font-bold ${log.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              [{log.type.toUpperCase()}]
            </span>
            <span className="text-gray-500 mr-2">{log.timestamp}</span>
            <span className="text-gray-700">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveExecution;