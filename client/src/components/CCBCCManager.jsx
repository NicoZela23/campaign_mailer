import React, { useState, useContext } from 'react';
import { AppStateContext } from '../context/AppStateContext';

const CCBCCManager = () => {
  const { cc, setCC, bcc, setBCC } = useContext(AppStateContext);
  const [ccInput, setCCInput] = useState('');
  const [bccInput, setBCCInput] = useState('');

  const emailRegex = /^[\w!#$%&'*+\-\/=?^_`{|}~]+(?:\.[\w!#$%&'*+\-\/=?^_`{|}~]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

  const addEmail = (email, list, setList) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return false;
    
    if (!emailRegex.test(trimmedEmail)) {
      return false;
    }
    
    if (list.includes(trimmedEmail)) {
      return false;
    }
    
    setList([...list, trimmedEmail]);
    return true;
  };

  const removeEmail = (email, list, setList) => {
    setList(list.filter(e => e !== email));
  };

  const handleCCKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const emails = ccInput.split(/[,\s]+/).filter(e => e.trim());
      emails.forEach(email => {
        addEmail(email, cc, setCC);
      });
      setCCInput('');
    }
  };

  const handleBCCKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const emails = bccInput.split(/[,\s]+/).filter(e => e.trim());
      emails.forEach(email => {
        addEmail(email, bcc, setBCC);
      });
      setBCCInput('');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* CC Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          CC (Copia)
        </label>
        <input
          type="text"
          value={ccInput}
          onChange={(e) => setCCInput(e.target.value)}
          onKeyPress={handleCCKeyPress}
          onBlur={() => {
            if (ccInput.trim()) {
              const emails = ccInput.split(/[,\s]+/).filter(e => e.trim());
              emails.forEach(email => {
                addEmail(email, cc, setCC);
              });
              setCCInput('');
            }
          }}
          placeholder="email1@ejemplo.com, email2@ejemplo.com"
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-white text-sm"
        />
        {cc.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {cc.map((email) => (
              <span
                key={email}
                className="inline-flex items-center px-3 py-1 bg-emerald-100 text-[#01533c] rounded-full text-sm font-medium"
              >
                {email}
                <button
                  onClick={() => removeEmail(email, cc, setCC)}
                  className="ml-2 text-[#01533c] hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* BCC Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          BCC (Copia Oculta)
        </label>
        <input
          type="text"
          value={bccInput}
          onChange={(e) => setBCCInput(e.target.value)}
          onKeyPress={handleBCCKeyPress}
          onBlur={() => {
            if (bccInput.trim()) {
              const emails = bccInput.split(/[,\s]+/).filter(e => e.trim());
              emails.forEach(email => {
                addEmail(email, bcc, setBCC);
              });
              setBCCInput('');
            }
          }}
          placeholder="email1@ejemplo.com, email2@ejemplo.com"
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-white text-sm"
        />
        {bcc.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {bcc.map((email) => (
              <span
                key={email}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
              >
                {email}
                <button
                  onClick={() => removeEmail(email, bcc, setBCC)}
                  className="ml-2 text-purple-700 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CCBCCManager;
