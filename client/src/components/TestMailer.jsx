import React, { useContext, useState } from 'react';
import { AppStateContext } from '../context/AppStateContext';
import toast from 'react-hot-toast';

const TestMailer = ({ onComplete, onBack }) => {
  const { emailTemplate, csvData, currentUser } = useContext(AppStateContext);
  const [testEmail, setTestEmail] = useState('');

  const handleTestSend = async () => {
    if (!testEmail) {
      toast.error('Ingrese un correo al cual mandar el test');
      return;
    }

    const toastId = toast.loading('Enviando email de test...');

    try {
      const response = await fetch('/api/mailer/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail,
          emailTemplate,
          userConfig: currentUser,
          dataRow: csvData.length > 0 ? csvData[0] : {},
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
      } else {
        throw new Error(data.message || 'Failed to send test email.');
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Testear Correo</h2>
      <div className="max-w-md">
        <h3 className="text-lg font-semibold mb-2">Correo de prueba</h3>
        <input 
          type="email"
          placeholder="recipient@example.com"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />
        <button onClick={handleTestSend} className="px-6 py-2 bg-gray-600 text-white rounded-lg">
          Enviar Test
        </button>
      </div>
      <div className="flex items-center gap-4 mt-8">
        <button onClick={onBack} className="px-6 py-2 bg-red-600 text-white rounded-lg">
          Atras
        </button>
        <button onClick={onComplete} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
          Enviar Todo!
        </button>
      </div>
    </div>
  );
};

export default TestMailer;
