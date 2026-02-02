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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#01533c] rounded-2xl shadow-lg mb-4">
          <span className="text-white text-3xl">🚀</span>
        </div>
        <h2 className="text-4xl font-bold text-[#01533c] mb-2">
          {sendingStatus !== 'completed' ? 'Enviando Correos...' : '¡Envío Completado!'}
        </h2>
        {sendingStatus === 'completed' && (
          <p className="text-gray-500">Todos los correos han sido procesados</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-8">
        <div className="relative inline-flex items-center justify-center w-72 h-72">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle 
              className="text-gray-200" 
              strokeWidth="8" 
              stroke="currentColor" 
              fill="transparent" 
              r="45" 
              cx="50" 
              cy="50" 
            />
            <circle
              className={`transition-all duration-500 ${sendingStatus === 'completed' ? 'text-[#01533c]' : 'text-[#01533c]'}`}
              strokeWidth="8"
              strokeDasharray={`${(2 * Math.PI * 45 * displayProgress) / 100}, 999`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold text-[#01533c]`}>
              {`${displayProgress}%`}
            </span>
            <span className="text-sm text-gray-500 mt-2">
              {sentCount + failedCount} / {totalEmails}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border-2 border-[#01533c]/30 shadow-md">
            <div className="text-3xl font-bold text-[#01533c] mb-1">{sentCount}</div>
            <div className="text-sm font-semibold text-[#01533c]/80">Enviados</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200 shadow-md">
            <div className="text-3xl font-bold text-red-700 mb-1">{failedCount}</div>
            <div className="text-sm font-semibold text-red-600">Fallidos</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-emerald-50 border-2 border-gray-200 rounded-xl p-6 shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center mb-3">
            <span className="mr-2">📋</span>
            Registro de Envíos
          </h3>
          {/* Progress indicator moved down */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="text-sm font-semibold text-gray-600">
              Progreso: {sentCount + failedCount} / {totalEmails}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className="flex items-center">
                <span className="w-2 h-2 bg-[#01533c] rounded-full mr-1"></span>
                Enviados: {sentCount}
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                Fallidos: {failedCount}
              </span>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-red-600 font-bold flex items-center">
              <span className="mr-2">⚠️</span>
              [ERROR] {error}
            </p>
          </div>
        )}
        
        <div className="bg-white rounded-lg p-4 h-80 overflow-y-auto shadow-inner border border-gray-200">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Esperando inicio del envío...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
                  <div 
                  key={index} 
                  className={`flex items-start p-3 rounded-lg transition-all duration-200 ${
                    log.type === 'success' 
                      ? 'bg-emerald-50 border-l-4 border-[#01533c]' 
                      : 'bg-red-50 border-l-4 border-red-500'
                  }`}
                >
                  <span className={`mr-3 font-bold text-sm ${log.type === 'success' ? 'text-[#01533c]' : 'text-red-600'}`}>
                    {log.type === 'success' ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        log.type === 'success' 
                          ? 'bg-[#01533c]/20 text-[#01533c]' 
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{log.timestamp}</span>
                    </div>
                    <span className="text-sm text-gray-700">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveExecution;