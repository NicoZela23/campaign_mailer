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
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#01533c] rounded-xl shadow-lg mb-4">
          <span className="text-white text-2xl">🔍</span>
        </div>
        <h2 className="text-3xl font-bold text-[#01533c] mb-2">
          Testear Correo
        </h2>
        <p className="text-gray-500 text-sm">Envía un correo de prueba antes de lanzar la campaña completa</p>
      </div>
      
      <div className="max-w-2xl bg-gradient-to-br from-gray-50 to-emerald-50 p-8 rounded-2xl border-2 border-gray-200 shadow-lg mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📧</span>
          Correo de Prueba
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dirección de Correo
            </label>
            <input 
              type="email"
              placeholder="ejemplo@correo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01533c] focus:border-transparent transition-all duration-200 bg-white text-lg"
            />
          </div>
          <button 
            onClick={handleTestSend} 
            className="w-full px-6 py-3 bg-[#01533c] text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            🚀 Enviar Correo de Prueba
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
          <p className="text-sm text-emerald-800 flex items-start">
            <span className="mr-2">💡</span>
            <span>
              <strong>Consejo:</strong> Envía el correo de prueba a tu propia dirección para verificar que todo se vea correctamente antes de enviar a todos los contactos.
            </span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200">
        <button 
          onClick={onBack} 
          className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:-translate-y-0.5"
        >
          ← Atrás
        </button>
        <button 
          onClick={onComplete} 
          className="px-8 py-3 bg-[#01533c] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-[#014030] transition-all duration-200 transform hover:-translate-y-0.5"
        >
          🚀 Enviar a Todos
        </button>
      </div>
    </div>
  );
};

export default TestMailer;
